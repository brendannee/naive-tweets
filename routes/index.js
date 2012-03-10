require('../models/Tweet');
require('../models/Spam');
require('../models/NotEnglish');
require('../models/Interesting');
require('../models/NotInteresting');

var async = require('async');

module.exports = function routes(app){
  
  var io = require('socket.io').listen(app)
    , Tweet = app.set('db').model('Tweet')
    , Spam = app.set('db').model('Spam')
    , NotEnglish = app.set('db').model('NotEnglish')
    , Interesting = app.set('db').model('Interesting')
    , NotInteresting = app.set('db').model('NotInteresting');

  io.sockets.on('connection', function (socket) {
    getTweetToClassify();

    socket.on('requestTweet', function (data) {
      //save response
      Tweet.findOne({id_str: data.tweet_id}, function(e, tweet){
        tweet.spam = (data.choice == 'spam') ? true : false;
        tweet.interesting = (data.choice == 'interesting') ? true : false;
        tweet.not_english = (data.choice == 'not_english') ? true : false;
        tweet.classified = true;
        tweet.save(function(e){
          //send another tweet to classify
          getTweetToClassify();
        });
      });
    });

    function getTweetToClassify(){
      Tweet.findOne({classified: false}, function(e, tweet){

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

  });

  app.get('/scores', function(req, res){
    async.series([
        function(cb) { scoreWords(cb); }
      , function(cb) { calculateProbabilities(cb); }
    ], function(e, results){
      res.send('Completed');
    });
  });


  function scoreWords(cb){
    console.log('scoring words');
    async.parallel([
        //remove existing counts
        function(cb){ Spam.collection.drop(cb); }
      , function(cb){ NotEnglish.collection.drop(cb); }
      , function(cb){ Interesting.collection.drop(cb); }
      , function(cb){ NotInteresting.collection.drop(cb); }
    ], function(e, results){
        Tweet.find({classified: true}, function(e, tweets){
          async.forEach(tweets, parseTweet, function(e){
            cb();
          });
        });
    });
  }


  function parseTweet(tweet, cb){
    tweetText = tweet.text;

    //remove all username
    tweetText = tweetText.replace(/@([A-Za-z0-9_]+)/g,"")

    //remove all URLs
    tweetText = tweetText.replace(/[A-Za-z]+:\/\/[A-Za-z0-9-_]+\.[A-Za-z0-9-_:%&~\?\/.=]+/g,"");

    //remove all punctuation
    tweetText = tweetText.replace(/[\.,-\/#!$%\^&\*;:{}=\-_`~()?'"\[\]\\+-=<>]/g,"");

    //split spaces
    var words = tweetText.split(/\W+/);

    if(tweet.spam){
      updateWords(words, Spam, cb);
    } else if(tweet.not_english){
      updateWords(words, NotEnglish, cb);
    } else if(tweet.interesting){
      updateWords(words, Interesting, cb);
    } else {
      updateWords(words, NotInteresting, cb);
    }
  }

  function updateWords(words, Schema, cb){
    words.forEach(function(word){
      if(word){
        word = word.toLowerCase();
        Schema.update({word: word}, {$inc: {count: 1}}, {upsert: true}, cb);
      }
    });
  }

  function calculateProbabilities(cb){
    console.log('calc');
    cb();
  }

  //Nothing specified
  app.all('*', function notFound(req, res) {
    res.send('node');
  });

}

