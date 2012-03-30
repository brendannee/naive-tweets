try{
  var options = require('../options.js');
} catch(e) { }

var models = require('../models/models')
  , ProgressBar = require('progress')
  , _ = require('underscore')
  , async = require('async')
  , languages = require('../lib/languages')
  , mongoose = require('mongoose')
  , mongoURI = process.env['MONGO_URI'] || options.mongo_uri
  , db = mongoose.connect(mongoURI)
  , Probability = db.model('Probability')
  , Tweet = db.model('Tweet')
  , twitter = require('ntwitter')
  , twit = new twitter({
      consumer_key: process.env['TWITTER_CONSUMER_KEY'] || options.consumer_key,
      consumer_secret: process.env['TWITTER_CONSUMER_SECRET'] || options.consumer_secret,
      access_token_key: process.env['TWITTER_ACCESS_TOKEN_KEY'] || options.access_token_key,
      access_token_secret: process.env['TWITTER_ACCESS_TOKEN_SECRET'] || options.access_token_secret
    });


console.log('Staring Training - This takes a while.');
async.series([
    getTrainingData
  , clearProbabilities
  , countWords
  , calculateWordProbabilities
  , classifyTweets
], function(e, results){
  console.log('\nAll Tweets Classified');
  process.exit();
});


function getTrainingData(cb){
  // for each language, train it
  async.forEachSeries(languages, trainLanguage, cb);

  function trainLanguage(language, cb){
    if(language.loc){
      var tweetCount
        , requestCount = 0
        , id_str = null
        , noMoreTweets = false;
      async.until(
        function(){ return (tweetCount > 300 || noMoreTweets || requestCount >= 10) },
        getTweets,
        function(e) {
          console.log('Downloaded ' + language.name + ': ' + tweetCount + ' tweets');
          cb();
        }
      );

      function getTweets(cb){
        twit.search('place:' + language.loc, {rpp: 100, max_id: id_str}, function(e, data) {
          requestCount++;
          if(data.results && data.results.length > 1){
            id_str = data.results[data.results.length - 1].id_str;
            async.forEachSeries(data.results, processTweet, function(e){
              //find out how many tweets we have in that language
              Tweet
                .where('trained', true)
                .where('trained_language', language.code)
                .count(function(e, count){
                  tweetCount = count;
                  cb();
                });
            });
          } else {
            noMoreTweets = true;
            cb();
          }
        });
      }

      function processTweet(data, cb){
        //classify tweet based on language
        var tweet = new Tweet(data);

        tweet.trained_language = language.code; 
        tweet.trained = true;
        tweet.autotrained = true;
        tweet.save(function(e, result){
          cb();
        });
      }
    } else {
      cb();
    }
  }
}


function clearProbabilities(cb){
  Probability.collection.drop(cb);
}

function countWords(cb){
  //Find all trained tweets, break them into words and count them
  var bar
    , count;
  Tweet.where('trained', true).count(function(e, result){
    count = result;
    var i = 0;
    //slice tweets into groups of 1000 to process
    async.whilst(
      function() { return i < count; }, 
      function(cb){
        Tweet
          .where('trained', true)
          .slice([i, 100])
          .run(function(e, tweets){
            i = i + 100;
            console.log(Math.min(i, count) + ' of ' + count + ' tweets processed');
            async.forEachSeries(tweets, parseTweet, cb);
          });

        function parseTweet(tweet, cb){
          async.forEach(tweet.getWords(), function(word, cb){
            var updateField = "count." + tweet.trained_language
              , update = {$inc: {}};
            update.$inc[updateField] = 1;
            Probability.update({word: word}, update, {upsert: true}, cb);
          }, cb);
        }
      }, 
      cb
    );
  });


 }

function calculateWordProbabilities(cb){
  //Get a list of all words and put into probabilities table

  var bar = new ProgressBar('Calculating probabilities [:bar] :percent :etas', {
      complete: '='
    , incomplete: ' '
    , width: 20
    , total: 100
  });

  Probability.find({}, function(e, words){
    bar.total = words.length;
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
      bar.tick();
      //calculate probabilities
      totalWordCount = _.reduce(wordCount, function(memo, num){ return memo + num; }, 0);
      totalTweetCount = _.reduce(tweetCount, function(memo, num){ return memo + num; }, 0);

      if(totalWordCount >= 3){
        //if word occurs at least 3 times, then use it to calculate probability
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


