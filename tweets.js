
var twitter = require('ntwitter');

require('./models/Tweet');

module.exports = function(app){

  var options = app.set('options')
    , Tweet = app.set('db').model('Tweet');

  var twit = new twitter({
    consumer_key: options.consumer_key,
    consumer_secret: options.consumer_secret,
    access_token_key: options.access_token_key,
    access_token_secret: options.access_token_secret
  });

  twit.stream('statuses/sample', function(stream) {

    console.log('Getting Tweet stream for 60 seconds');
    var tweetCount = 0;
    stream.on('data', function (data) {
      if(data.text.charAt(0) != '@'){
        var tweet = new Tweet(data);
        tweet.save();
      
        tweetCount++;
        if(tweetCount % 50 === 0){
          console.log(tweetCount + ' tweets collected');
        }
      }
    });

    //disconnect after 1 minute of tweets
    setTimeout(stream.destroy, 60000);
  });

}
