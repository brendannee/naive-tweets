require('../models/Tweet');
require('../models/Spam');
require('../models/NotEnglish');
require('../models/Interesting');
require('../models/NotInteresting');
require('../models/Probability');


var async = require('async')
  , _ = require('underscore');

module.exports = function routes(app){
  
  var io = require('socket.io').listen(app)
    , Tweet = app.set('db').model('Tweet')
    , Spam = app.set('db').model('Spam')
    , NotEnglish = app.set('db').model('NotEnglish')
    , Interesting = app.set('db').model('Interesting')
    , NotInteresting = app.set('db').model('NotInteresting')
    , Probability = app.set('db').model('Probability');

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

  app.get('/api/getTweets', function(req, res){
    Tweet.find()
      .limit(100)
      .run(function(e, results){
        res.json(results);
      });
  });

  app.get('/api/getInteresting', function(req, res){
    Tweet.find()
      .limit(100)
      .sort('interesting_prob', -1)
       .run(function(e, results){
        res.json(results);
       });
  });

  app.get('/api/getSpam', function(req, res){
    Tweet.find()
      .limit(100)
      .sort('spam_prob', -1)
       .run(function(e, results){
        res.json(results);
       });
  });

  app.get('/api/getNotEnglish', function(req, res){
    Tweet.find()
      .limit(100)
      .sort('not_english_prob', -1)
       .run(function(e, results){
        res.json(results);
       });
  });



  app.get('/process', function(req, res){
    async.series([
        scoreWords
      , calculateProbabilities
      , classifyTweets
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
      , function(cb){ Probability.collection.drop(cb); }
    ], function(e, results){
        Tweet.find({classified: true}, function(e, tweets){
          async.forEach(tweets, parseTweet, function(e){
            cb();
          });
        });
    });
  }


  function parseTweet(tweet, cb){
    var words = splitWords(tweet.text);

    if(tweet.spam){
      updateWords(words, Spam, cb);
    } else if(tweet.not_english){
      updateWords(words, NotEnglish, cb);
    } else if(tweet.interesting){
      updateWords(words, Interesting, cb);
    } else {
      updateWords(words, NotInteresting, cb);
    }

    function updateWords(words, Schema, cb){
      words.forEach(function(word){
        if(word){
          word = word.toLowerCase();
          Schema.update({word: word}, {$inc: {count: 1}}, {upsert: true}, cb);
        }
      });
    }
  }

  function splitWords(tweet){
    //remove all username
    tweet = tweet.replace(/@([A-Za-z0-9_]+)/g,"")

    //remove all URLs
    tweet = tweet.replace(/[A-Za-z]+:\/\/[A-Za-z0-9-_]+\.[A-Za-z0-9-_:%&~\?\/.=]+/g,"");

    //remove all punctuation
    tweet = tweet.replace(/[\.,-\/#!$%\^&\*;:{}=\-_`~()?'"\[\]\\+-=<>]/g,"");

    //split spaces
    var words = tweet.split(/\W+/);

    //filter to unique words
    words = _.uniq(words);

    //remove blanks
    words = _.without(words, '');

    return words;
  }



  function calculateProbabilities(cb){
    //get a list of all words and put into probabilities table

    async.parallel([
        function(cb){
          Spam.find({},['word'], function(e, words){
            async.forEach(words, addWord, cb);
          });
        }
      , function(cb){
          Interesting.find({},['word'], function(e, words){
            async.forEach(words, addWord, cb);
          });
        }
      , function(cb){
          NotInteresting.find({},['word'], function(e, words){
            async.forEach(words, addWord, cb);
          });
        }
      , function(cb){
          NotEnglish.find({},['word'], function(e, words){
            async.forEach(words, addWord, cb);
          });
        }
    ], cb);

    function addWord(item, cb){
      var word = item.word
        , spamWordCount
        , spamTweetCount
        , interestingWordCount
        , interestingTweetCount
        , notInterestingWordCount
        , notInterestingTweetCount
        , notEnglishWordCount
        , notEnglishTweetCount;

      //Now get counts for each word
      async.parallel([
          function(cb){
            Spam.findOne({word: word}, function(e, results){
              spamWordCount = (results) ? results.count : 0;
              cb();
            });
          }
        , function(cb){
            Interesting.findOne({word: word}, function(e, results){
              interestingWordCount = (results) ? results.count : 0;
              cb();
            });
          }
        , function(cb){
            NotInteresting.findOne({word: word}, function(e, results){
              notInterestingWordCount = (results) ? results.count : 0;
              cb();
            });
          }
        , function(cb){
            NotEnglish.findOne({word: word}, function(e, results){
              notEnglishWordCount = (results) ? results.count : 0;
              cb();
            });
          }
        , function(cb){
            Tweet.count({spam:true}, function(e, count){
              spamTweetCount = count;
              cb();
            });
          }
        , function(cb){
            Tweet.count({interesting:true}, function(e, count){
              interestingTweetCount = count;
              cb();
            });
          }
        , function(cb){
            Tweet.count({not_english:true}, function(e, count){
              notEnglishTweetCount = count;
              cb();
            });
          }
        , function(cb){
            Tweet.count({not_english:false, interesting:false, spam:false}, function(e, count){
              notInterestingTweetCount = count;
              cb();
            });
          }

      ], function(e, results){
        //calculate probabilities
        var totalCount = spamWordCount + interestingWordCount + notEnglishWordCount + notInterestingWordCount;

        if(totalCount >= 5){
          //if word occurs at least 5 times, then use it to calculate probability
          //Minimum probability of 0.01
          var spamProb = Math.max(0.01, ( spamWordCount / spamTweetCount ) / ( ( spamWordCount / spamTweetCount ) + ( ( interestingWordCount + notEnglishWordCount + notInterestingWordCount ) / ( interestingTweetCount + notEnglishTweetCount + notInterestingTweetCount ) ) ) );

          var interestingProb = Math.max(0.01, ( interestingWordCount / interestingTweetCount ) / ( ( interestingWordCount / interestingTweetCount ) + ( ( spamWordCount + notEnglishWordCount + notInterestingWordCount ) / ( spamTweetCount + notEnglishTweetCount + notInterestingTweetCount ) ) ) );

          var notEnglishProb = Math.max(0.01, ( notEnglishWordCount / notEnglishTweetCount ) / ( ( notEnglishWordCount / notEnglishTweetCount ) + ( ( interestingWordCount + spamWordCount + notInterestingWordCount ) / ( interestingTweetCount + spamTweetCount + notInterestingTweetCount ) ) ) );

          //save probabilities
          Probability.update({word: word}, {$set:{word: word, spam: spamProb, interesting: interestingProb, not_english: notEnglishProb}}, {upsert:true}, cb);
        } else {
          //word not common enough to use
          cb();
        }
      });
    }
  }

  
  function classifyTweets(cb){
    console.log('Classifying Tweets');

    //classify each tweet
    Tweet.find({}, function(e, results){
      async.forEach(results, classifyTweet, function(e){
        console.log('All Tweets Classified');
        cb();
      });

      function classifyTweet(tweet, cb){
        var words = splitWords(tweet.text)
          , probabilities = [];

        async.forEach(words, getProbabilities, function(e){
          var notEnglishProb = calculateProb(probabilities, 'not_english')
            , spamProb = calculateProb(probabilities, 'spam')
            , interestingProb = calculateProb(probabilities, 'interesting');

          function calculateProb(probabilities, key){
            var product = _.reduce(probabilities, function(memo, word){ return memo * word[key]; }, 1);
            var subtract = _.reduce(probabilities, function(memo, word){ return memo * (1 - word[key]) }, 1);
            return product / ( product + subtract );
          }

          Tweet.update({_id: tweet._id}, { not_english_prob: notEnglishProb, spam_prob: spamProb, interesting_prob: interestingProb}, function(e){
            cb();
          });
        });

        function getProbabilities(word, cb){
          //lookup probabilities for each word
          Probability.findOne({word: word}, function(e, result){
            if(result){
              probabilities.push({
                  word: word
                , not_english: result.not_english
                , spam: result.spam
                , interesting: result.interesting
              });
            }

            cb();
          });
        }
      }
    });
  }



  //Nothing specified
  app.all('*', function notFound(req, res) {
    res.send('node');
  });

}

