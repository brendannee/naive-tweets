var models = require('../models/models')
  , train = require('../lib/train')
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

  io.sockets.on('connection', function (socket) {


    function getTweetToClassify(){
      Tweet.findOne({trained: false}, function(e, tweet){

        var expr = /[^\u0000-\ud83d]/g;

        if(expr.test(JSON.stringify(tweet))){
          // due to issue with socket.io and some unicode characters
          // https://github.com/LearnBoost/socket.io/issues/451
          // This profile is problematic: https://twitter.com/#!/glendalyy_
          tweet.remove(getTweetToClassify);
        } else {
          socket.emit('toClassify', tweet);
        }
      });
    }

    socket.on('requestTweet', function (data) {
      if(data){
        Tweet.findOne({ id_str: data.tweet_id }, function(e, tweet){
          tweet.trained_language = data.language
          tweet.trained = true;
          tweet.save(function(e){
            //send another tweet to classify
            getTweetToClassify();
          });
        });
      } else {
        getTweetToClassify();
      }
    });

  });


    /* Connect to Twitter streaming API and start sending tweets to the client */

  twit.stream('statuses/sample', function(stream) {
    var processing = false;
    stream
      .on('data', function(data){
        if(!processing){
          processing = true;
          try{
            classifyAndSendTweet(data);
          } catch(e) {
            processing = false;
          }
        }
      });

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

          processing = false;

        });
    }
  });



  /* Routes */

  app.get('/api/getTweets', function(req, res){
    Tweet.find()
      .limit(100)
      .run(function(e, results){
        res.json(results);
      });
  });

  app.get('/api/getLanguage/:language', function(req, res){
    Tweet.find({})
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
    res.json(languages);
  });


  app.get('/api/process', function(req, res){
    console.log('Scoring words');
    async.series([
        clearProbabilities
      , countWords
      , calculateWordProbabilities
      , classifyTweets
    ], function(e, results){
      console.log('All Tweets Classified');
      res.json({status: 'Completed'});
    });
  });

  function clearProbabilities(cb){
     Probability.collection.drop(cb);
  }

  function countWords(cb){
    //Find all trained tweets, break them into words and count them

    Tweet.find({trained: true}, function(e, tweets){
      async.forEach(tweets, parseTweet, cb);
    });

    function parseTweet(tweet, cb){
      async.forEach(tweet.getWords(), function(word, cb){
        if(word){
          var updateField = "count." + tweet.trained_language
            , update = {$inc: {}};
          update.$inc[updateField] = 1;
          Probability.update({word: word}, update, {upsert: true}, cb);
        }
      }, cb);
    }
  }

  function calculateWordProbabilities(cb){
    //Get a list of all words and put into probabilities table

    Probability.find({}, function(e, words){
      async.forEach(words, calculateWord, cb);
    });
    
    function calculateWord(word, cb){
      var wordCount = {}
        , tweetCount = {}
        , totalWordCount
        , totalTweetCount
        , probability = {};

      //Get counts for each tweet and word
      async.forEach(languages, function(language, cb){
        wordCount[language.code] = word.count[language.code] || 0;
        Tweet.count({ trained_language: language.code }, function(e, count){
          tweetCount[language.code] = count;
          cb();
        });
      }, function(e, results){
        //calculate probabilities
        totalWordCount = _.reduce(wordCount, function(memo, num){ return memo + num; }, 0);
        totalTweetCount = _.reduce(tweetCount, function(memo, num){ return memo + num; }, 0);

        if(totalWordCount >= 4){
          //if word occurs at least 4 times, then use it to calculate probability
          //Minimum probability of 0.01

          languages.forEach(function(language){
            word.probability[language.code] = Math.max(0.01, ( wordCount[language.code] / tweetCount[language.code] ) / ( ( wordCount[language.code] / tweetCount[language.code] ) + ( ( totalWordCount - wordCount[language.code] ) / ( totalTweetCount - tweetCount[language.code] ) ) ) ) || 0.01;
          });

          //save probabilities
          word.save(cb);
        } else {
          //word not common enough to use
          cb();
        }
      });
    }
  }

  function classifyTweets(cb){
    //classify each tweet
    Tweet.find({}, function(e, tweets){
      async.forEach(tweets, function(tweet, cb){
        tweet.classify(cb);
      }, cb);
    });
  }

  app.get('/api/train', function(req, res){
    train(app, function(){
      res.json({status: 'completed'});
    });
  });


  //Nothing specified
  app.all('*', function notFound(req, res) {
    res.send('node');
  });

}

