var models = require('../models/models')
  , async = require('async')
  , _ = require('underscore')
  , languages = require('./languages');

module.exports = function train(app, cb){
  var Tweet = app.set('db').model('Tweet')
    , Probability = app.set('db').model('Probability')
    , twit = app.set('twit');

  async.forEachSeries(languages, trainLanguage, cb);

  function trainLanguage(language, cb){
    try{
      console.log('Training for ' + language.name);
      twit.search('place:' + language.loc, {rpp:100}, function(err, data) {
        console.log(data.results.length);
        async.forEachSeries(data.results, processTweet, function(e, results){
          cb();
        });

      });
    } catch(e) {
      cb();
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
  }

}
