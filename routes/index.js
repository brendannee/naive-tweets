require('../models/Tweet');

module.exports = function routes(app){
  
  var io = require('socket.io').listen(app)
    , Tweet = app.set('db').model('Tweet');

  io.sockets.on('connection', function (socket) {
    getTweetToClassify();

    socket.on('requestTweet', function (data) {
      //save response
      Tweet.findOne({id_str: data.tweet_id}, function(e, tweet){
        tweet.spam = (data.choice == 'spam') ? true : false;
        tweet.interesting = (data.choice == 'interesting') ? true : false;
        tweet.non_english = (data.choice == 'non_english') ? true : false;
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

        if(expr.test(JSON.stringify(tweet)) || tweet.in_reply_to_screen_name === null){
          // due to issue with socket.io and some unicode characters
          // https://github.com/LearnBoost/socket.io/issues/451
          // This profile is problematic: https://twitter.com/#!/glendalyy_
          //
          // Also, filter out @replies


          tweet.remove(getTweetToClassify);
        } else {
          socket.emit('toClassify', tweet);
        }
      });
    }

  });  

  //Nothing specified
  app.all('*', function notFound(req, res) {
    res.send('node');
  });

}

