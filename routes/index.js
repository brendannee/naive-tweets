var models = require('../models/models')
  , async = require('async')
  , _ = require('underscore')
  , languages = require('../lib/languages');

module.exports = function routes(app){

  var io = require('socket.io').listen(app)
    , Tweet = app.set('db').model('Tweet')
    , Probability = app.set('db').model('Probability')
    , twit = app.set('twit');

  /* Socket IO */

  io.configure(function () { 
    io.set("transports", ["xhr-polling"]); 
    io.set("polling duration", 10);
    io.set('log level', 1);
  });

  /* Connect to Twitter streaming API and start sending tweets to the client */

  twit.stream('statuses/sample', function(stream) {
    function classifyAndSendTweet(data){
      //classify a tweet based on word probabilities
      var tweet = new Tweet(data)
        , probability = {}
        , query = []
        , predicted_language
        , max_prob = 0;

      //build 'or' query
      tweet.getWords().forEach(function(word){
        query.push({ word: word });
      });

      Probability
        .find()
        .or(query)
        .run(function(e, results){
          var update = {};
          languages.forEach(function(language){
            var product = _.reduce(results, function(memo, word){ return memo * word.probability[language.code] || memo; }, 1);
            var subtract = _.reduce(results, function(memo, word){ return memo * (1 - word.probability[language.code]) || memo; }, 1);

            //minimum probability of 0.01
            var result = product / ( product + subtract ) || 0.01;

            probability[language.code] = Math.round(result*100000)/100000;

            if(result > max_prob) { 
              max_prob = result;
              predicted_language = language.code;
            }
          });

          tweet.predicted_language = (max_prob > 0.5) ? predicted_language : 'other';

          tweet.probability = probability;

          io.sockets.emit('newTweet', tweet);

        });
    }
  });


  /* Routes */

  app.get('/api/getLanguage', function(req, res){
    Tweet.find()
      .limit(100)
      .run(function(e, results){
        res.json(results);
      });
  });

  app.get('/api/getLanguage/:language', function(req, res){
    //find highest probablity tweets over 0.5
    Tweet
      .where('probability.' + req.params.language).$gt(0.5)
      .where('predicted_language', req.params.language)
      .limit(100)
      .sort('probability.' + req.params.language, -1)
      .run(function(e, results){
        res.json(results);
      });
  });


  app.get('/api/streamTweets', function(req, res){

    twit.stream('statuses/sample', function(stream) {
      console.log('Getting Tweet stream for 60 seconds');
      var tweetCount = 0;
      stream
        .on('data', function(data){
          if(data.text.charAt(0) != '@'){
            var tweet = new Tweet(data);
            tweet.save();
            tweetCount++;
            if(tweetCount % 50 === 0){
              console.log(tweetCount + ' tweets collected');
            }
          }
        })
        .on('destroy', function(data){
          try{
            res.json({status: tweetCount + ' tweets collected'});
          } catch(e) {}
        });

      //disconnect after 1 minute of tweets
      setTimeout(stream.destroy, 60000);
    });
  });


  app.get('/api/languages', function(req, res){
    var results = {};
    languages.forEach(function(language){
      results[language.code] = { name: language.name };
    });
    res.json(results);
  });
 

  //Nothing specified
  app.all('*', function notFound(req, res) {
    res.send('node');
  });

}

