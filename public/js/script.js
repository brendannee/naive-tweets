// usage: log('inside coolFunc', this, arguments);
// paulirish.com/2009/log-a-lightweight-wrapper-for-consolelog/
window.log = function f(){ log.history = log.history || []; log.history.push(arguments); if(this.console) { var args = arguments, newarr; args.callee = args.callee.caller; newarr = [].slice.call(args); if (typeof console.log === 'object') log.apply.call(console.log, console, newarr); else console.log.apply(console, newarr);}};

// make it safe to use console.log always
(function(a){function b(){}for(var c="assert,count,debug,dir,dirxml,error,exception,group,groupCollapsed,groupEnd,info,log,markTimeline,profile,profileEnd,time,timeEnd,trace,warn".split(","),d;!!(d=c.pop());){a[d]=a[d]||b;}})
(function(){try{console.log();return window.console;}catch(a){return (window.console={});}}());



$(document).ready(function(){
  var tweet_id
    , languages = {en: "English", es: "Spanish", pt: "Portugese", fr: "French", other: "Other"}
    , socket = io.connect()
    , pause = false
    , tweetQueue = [];

  socket.emit('requestTweet');
  socket.on('toClassify', renderSingleTweet);
  socket.on('newTweet', scrollTweets);


  $('#classification button').click(function(){
    $(this)
      .addClass('btn-success')
      .siblings().addClass('disabled');
    socket.emit('requestTweet', { tweet_id: tweet_id, language: this.id });
  });

  $('#top-menu li a').click(function(){
    var menuItem = $(this).parent().attr('data-menu');

    $(this).parent().addClass('active')
      .siblings().removeClass('active');

    if(menuItem == 'stream') {
      $('#tweets .content').empty();
      $('#tweets').show().attr('data-stream', 'true');
      $('#classify').hide();
      $('#tweets h1').html('Live Tweets');
    } else if(menuItem == 'classify') {
      $('#tweets').hide().removeClass('stream');
      $('#classify').show();
    } else if(menuItem == 'all'){
      $('#tweets .content').empty()
      $('#tweets').show().attr('data-stream', 'false');
      $('#classify').hide();
      $('#tweets h1').html('All Tweets');

      $.getJSON('/api/getTweets', renderTweets);
    } else {
      $('#tweets .content').empty()
      $('#tweets').show().attr('data-stream', 'false');
      $('#classify').hide();
      $('#tweets h1').html(languages[menuItem] + ' Tweets');

      $.getJSON('/api/getLanguage/' + menuItem, renderTweets);
    }
    return false;
  });

  $('#pause').click(function(){
    pause = (pause) ? false : true;
    $('span', this).html( (pause) ? 'Play' : 'Pause');
    $('i', this).removeClass().addClass( (pause) ? 'icon-play' : 'icon-pause' );
  });

  function scrollTweets(tweet){
    var tweetDivs = $('#tweets .tweet');

    if($('#tweets').attr('data-stream') == 'true' && !pause){
      console.log(tweet);
      tweetQueue.push(tweet);
      if(tweetQueue.length >= 10 || tweetDivs.length <= 50){
        renderTweets(tweetQueue);

        //remove elements from the dom every 10 tweets
        if(tweetDivs.length > 60){
          var tweetsToRemove = $('#tweets .tweet:lt(' + (tweetDivs.length - 50) +')');

          tweetsToRemove.slideUp(function(){
            tweetsToRemove.remove();
          });
        }
      }
    }
  }

  function renderTweets(tweets){
    //reset tweetQueue
    tweetQueue = [];

    tweets.forEach(function(tweet){
      tweet.text = parseTweetURL(tweet.text);
      tweet.predicted_language = {
          name: languages[tweet.predicted_language]
        , code: tweet.predicted_language
      }
      for(var lang in tweet.probability){
        tweet.probability[lang] = Math.round(tweet.probability[lang]*100)/100;
      }
      var div = ich.showTweet(tweet);
      $('#tweets .content').append(div);
      $('.timeago').timeago();
    });
  }

  function renderSingleTweet(tweet){
    $('#classification button').removeClass('btn-success disabled');
    tweet_id = tweet.id_str;
    tweet.text = parseTweetURL(tweet.text);
    var div = ich.classifyTweet(tweet);
    $('#tweet').html(div);
    $('.timeago').timeago();
  }


});


function parseTweetURL(text){
  // from http://www.simonwhatley.co.uk/parsing-twitter-usernames-hashtags-and-urls-with-javascript

  text = text.replace(/[A-Za-z]+:\/\/[A-Za-z0-9-_]+\.[A-Za-z0-9-_:%&~\?\/.=]+/g, function(url) {
		return url.link(url);
	});

  text = text.replace(/[@]+[A-Za-z0-9-_]+/g, function(u) {
		var username = u.replace("@","")
		return u.link("http://twitter.com/"+username);
	});

  text = text.replace(/[#]+[A-Za-z0-9-_]+/g, function(t) {
		var tag = t.replace("#","%23")
		return t.link("http://search.twitter.com/search?q="+tag);
	});

  return text;
}

