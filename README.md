#Naive Bayes Tweet Classifier in Node.js

This app classifies tweets by language using Node.js and a [naive Bayes classifier](http://en.wikipedia.org/wiki/Naive_Bayes_classifier).

Tweets are pulled from the [twitter streaming api](https://dev.twitter.com/docs/streaming-api/methods) and classified on the fly.

##Training

Provided is a script to pull tweets from list of specified locations and auto-classify by assumed languaged.  For instance, tweets from Surakarta, Indonesia are all autoclassified as Indonesian.  This provides a large amount of training data which allows the classifier to predict the language of a stream of incoming tweets.

To run the training script

    npm run-script train

This process takes a while, as tweets from specific regions are collected, and limited to one tweet per user (to avoid basing the classification around a small number of users.

##Front-End

A front-end to view a stream of live tweets and their predicted languages is provided.

    node index.js

It provides views of 

## Configuration
In order to access the Twitter streaming API you'll need to have an API key. 
You need to get these keys from the [Twitter Developers Page](https://dev.twitter.com/).

Make a file called options.js that looks like the following:

    module.exports = {
        consumer_key: <KEY>
      , consumer_secret: <SECRET>
      , access_token_key: <SECRET>
      , access_token_secret: <SECRET>
      , mongo_node_database: 'tweets'
      , mongo_node_host: 'localhost'
    }

## License

(The MIT License)

Copyright (c) 2012 Brendan Nee <me@bn.ee>

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the 'Software'), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED 'AS IS', WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
