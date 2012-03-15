try{
  var options = require('./options.js');
} catch(e) {
  console.log('Can\'t load options.js with twitter auth keys');
}

var express = require('express')
  , mongoose = require('mongoose')
  , mongoURI = process.env['MONGO_URI'] || options.mongo_uri
  , db = mongoose.connect(mongoURI);


module.exports = function(app){
  app.configure(function(){
    this.use(express.cookieParser())
        .use(express.bodyParser())
        .set('public', __dirname + '/public')
        .enable('jsonp callback')
        .enable('error templates')
        .use(express.static(__dirname + '/public'))
        .set('db', db)
        .set('options', options)
        .set('twit', new twitter({
          consumer_key: process.env['TWITTER_CONSUMER_KEY'] || options.consumer_key,
          consumer_secret: process.env['TWITTER_CONSUMER_SECRET'] || options.consumer_secret,
          access_token_key: process.env['TWITTER_ACCESS_TOKEN_KEY'] || options.access_token_key,
          access_token_secret: process.env['TWITTER_ACCESS_TOKEN_SECRET'] || options.access_token_secret
        }));
  });

  // Dev
  app.configure('development', function(){
    this.use(express.profiler())
      .use(express.logger('\x1b[90m:remote-addr -\x1b[0m \x1b[33m:method\x1b[0m' +
         '\x1b[32m:url\x1b[0m :status \x1b[90m:response-time ms\x1b[0m'))
      .use(express.errorHandler({dumpExceptions: true, showStack: true}))
      .enable('dev')
      .set('domain', 'app.local');
  });
  
  // Prod
  app.configure('production', function(){
    this
      .use(express.logger({buffer: 10000}))
      .use(express.errorHandler())
      .enable('prod')
      .set('domain', 'productiondomain.com');
  });
}
