#Naive Bayes Tweet Classifier in Node.js

Classify tweets using Node.js and a [naive Bayes classifier](http://en.wikipedia.org/wiki/Naive_Bayes_classifier).

Tweets are pulled from the [twitter streaming api](https://dev.twitter.com/docs/streaming-api/methods) and queued to be classified.  After classifying a bunch of tweets into Spam, Interesting, Not English, or Not-interesting it will attempt to predict which of these categories a tweet fits into.

## License

(The MIT License)

Copyright (c) 2012 Brendan Nee <me@bn.ee>

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the 'Software'), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED 'AS IS', WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
