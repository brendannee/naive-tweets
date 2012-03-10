// usage: log('inside coolFunc', this, arguments);
// paulirish.com/2009/log-a-lightweight-wrapper-for-consolelog/
window.log = function f(){ log.history = log.history || []; log.history.push(arguments); if(this.console) { var args = arguments, newarr; args.callee = args.callee.caller; newarr = [].slice.call(args); if (typeof console.log === 'object') log.apply.call(console.log, console, newarr); else console.log.apply(console, newarr);}};

// make it safe to use console.log always
(function(a){function b(){}for(var c="assert,count,debug,dir,dirxml,error,exception,group,groupCollapsed,groupEnd,info,log,markTimeline,profile,profileEnd,time,timeEnd,trace,warn".split(","),d;!!(d=c.pop());){a[d]=a[d]||b;}})
(function(){try{console.log();return window.console;}catch(a){return (window.console={});}}());


var tweet_id;


$(document).ready(function(){
  var socket = io.connect('http://localhost');
  socket.on('toClassify', renderTweet);

  $('#classification button').click(function(){
    $(this)
      .addClass('btn-success')
      .siblings().addClass('disabled');

      socket.emit('requestTweet', { tweet_id: tweet_id, choice: this.id });
  });

  $('#top-menu li a').click(function(){
    $(this).parent().addClass('active')
      .siblings().removeClass('active');
    return false;
  });

  $('#top-menu .show a').click(function(){
    $('#tweets .content').empty()
    $('#tweets').show();
    $('#classify').hide();

    $('#pageTitle');

    $.getJSON('/api/getTweets', function(data){
      data.forEach(function(tweet){
        tweet.spam_prob = Math.round(tweet.spam_prob*1000)/1000;
        tweet.not_english_prob = Math.round(tweet.not_english_prob*1000)/1000;
        tweet.interesting_prob = Math.round(tweet.interesting_prob*1000)/1000;

        var div = ich.showTweet(tweet);
        $('#tweets .content').append(div);
      });
    });
  });

  $('#top-menu .classify a').click(function(){
    $('#tweets').hide();
    $('#classify').show();

  });

});

function renderTweet(tweet){
  $('#classification button').removeClass('btn-success disabled');
  tweet_id = tweet.id_str;
  tweet.text = parseTweetURL(tweet.text);
  var div = ich.classifyTweet(tweet);
  $('#tweet').html(div);
  $('.timeago').timeago();
}

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

