var mongoose = require('mongoose')
  , _ = require('underscore')
  , languages = require('../lib/languages');



var TweetSchema = new mongoose.Schema({
      id_str            :  { type: String, unique: true }
    , text              :  { type: String }
    , created_at        :  { type: String }
    , probability       :  {
        en                :  { type: Number, index: true }
      , es                :  { type: Number, index: true }
      , pt                :  { type: Number, index: true }
      , fr                :  { type: Number, index: true }
      , other             :  { type: Number, index: true }
    }
    , predicted_language:  { type: String }
    , trained_language  :  { type: String }
    , trained           :  { type: Boolean, index: true, default: false }
    , autotrained       :  { type: Boolean, default: false }
  });

TweetSchema.methods.getWords = function getWords(cb){
  //Split tweet into words
  text = this.text;

  //remove all username
  text = text.replace(/@([A-Za-z0-9_]+)/g,"");

  //remove all hashtags
  text = text.replace(/#([A-Za-z0-9_]+)/g,"");

  //remove all URLs
  text = text.replace(/[A-Za-z]+:\/\/[A-Za-z0-9-_]+\.[A-Za-z0-9-_:%&~\?\/.=]+/g,"");

  //remove all punctuation
  text = text.replace(/[\.,-\/#!$%\^&\*;:{}=\-_`~()?'"\[\]\\+-=<>]/g,"");

  //make all lowercase
  text = text.toLowerCase();

  //split spaces
  var words = text.split(/\s+/);

  //filter to unique words
  words = _.uniq(words);

  //remove blanks
  words = _.without(words, '');

  return words;
}

TweetSchema.methods.classify = function classify(cb){
  //classify a tweet based on word probabilities
  var tweet = this
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

      tweet.predicted_language = predicted_language;

      tweet.probability = probability;

      tweet.save(cb);
    });
}

var Tweet = mongoose.model('Tweet', TweetSchema);






var Probability = mongoose.model('Probability', new mongoose.Schema({
      word               :  { type: String, unique: true }
    , probability        :  {
        en                  : { type: Number, index: true }
      , es                  : { type: Number, index: true }
      , pt                  : { type: Number, index: true }
      , fr                  : { type: Number, index: true }
      , other               : { type: Number, index: true }
    }
    , count              :  {
        en                  : { type: Number, index: true }
      , es                  : { type: Number, index: true }
      , pt                  : { type: Number, index: true }
      , fr                  : { type: Number, index: true }
      , other               : { type: Number, index: true }
    }
  }, {strict:true}));
