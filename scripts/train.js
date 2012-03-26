try{
  var options = require('../options.js');
} catch(e) { }

var models = require('../models/models')
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


// for each language, train it
async.forEachSeries(languages, trainLanguage, function(e, results){
  console.log('All Languages Trained');
  process.exit();
});

function trainLanguage(language, cb){
  try{
    twit.search('place:' + language.loc, {rpp:100}, function(err, data) {
      console.log('Training for ' + language.name + ': ' + data.results.length + ' tweets');
      async.forEachSeries(data.results, processTweet, function(e, results){
        cb();
      });

    });
  } catch(e) {
    cb();
  }
}


function processTweet(data, cb){
  try{
    //classify tweet based on language
    var tweet = new Tweet(data);

    tweet.trained_language = language.code; 
    tweet.trained = true;
    tweet.autotrained = true;
    tweet.save(function(e, result){
      cb();
    });
  } catch(e) {
    cb();
  }
}

