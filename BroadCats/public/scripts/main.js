if (!String.prototype.supplant) {
    String.prototype.supplant = function (o) {
        return this.replace(/{([^{}]*)}/g,
            function (a, b) {
                var r = o[b];
                return typeof r === 'string' || typeof r === 'number' ? r : a;
            }
        );
    };
}

$(function() {
  var FADE_TIME = 150; // ms
  var TYPING_TIMER_LENGTH = 400; // ms
  var COLORS = [
    '#e21400', '#91580f', '#f8a700', '#f78b00',
    '#58dc00', '#287b00', '#a8f07a', '#4ae8c4',
    '#3b88eb', '#3824aa', '#a700ff', '#d300e7'
  ];

  // Initialize varibles
  var $window = $(window);
  var $usernameInput = $('.usernameInput'); // Input for username
  var $messages = $('.messages'); // Messages area
  var $inputMessage = $('.inputMessage'); // Input message input box

  var $loginPage = $('.login.page'); // The login page
  var $chatPage = $('.chat.page'); // The chatroom page
  var $btnPush = $('#btnPush'); //The button to queue songs
  var $urlPush = $('#urlPush'); //The song to push
  var $btnPull = $('#btnPull'); //The button to request a new song
  var $player = $('#icivaleplayer') //Ze Playerz
  $('#yt-player').hide();
  $('#sc-player').hide();

  // Prompt for setting a username
  var username;
  var connected = false;
  var typing = false;
  var lastTypingTime;
  var $currentInput = $usernameInput.focus();

  var clientId = "78f553342bdc384279de1c81361be93d";
  var templateIframe = '<iframe id="sc-playerIFrame" width="100%" height="166" scrolling="no" ' +
                 'frameborder="no" src="http://w.soundcloud.com/play' +
                 'er/?url={url}{options}" class="sc-widget"></iframe>';
  var templateIFrameYoutube = '<iframe id="yt-player" type="text/html" width="640" height="390"'+
                              'frameborder="0"></iframe>';

  var socket = io();
    SC.initialize({
    client_id: "78f553342bdc384279de1c81361be93d",
    redirect_uri: "http://example.com/callback",
  });

  function addParticipantsMessage (data) {
    var message = '';
    if (data.numUsers === 1) {
      message += "there's 1 participant";
    } else {
      message += "there are " + data.numUsers + " participants";
    }
    log(message);
  }

  // Sets the client's username
  function setUsername () {
    username = cleanInput($usernameInput.val().trim());

    // If the username is valid
    if (username) {
      $loginPage.fadeOut();
      $chatPage.show();
      $loginPage.off('click');
      $currentInput = $inputMessage.focus();

      // Tell the server your username
      socket.emit('add user', username);
    }
  }

  // Sends a chat message
  function sendMessage () {
    var message = $inputMessage.val();
    // Prevent markup from being injected into the message
    message = cleanInput(message);
    // if there is a non-empty message and a socket connection
    if (message && connected) {
      $inputMessage.val('');
      addChatMessage({
        username: username,
        message: message
      });
      // tell server to execute 'new message' and send along one parameter
      socket.emit('new message', message);
    }
  }

  // Log a message
  function log (message, options) {
    var $el = $('<li>').addClass('log').text(message);
    addMessageElement($el, options);
  }

  // Adds the visual chat message to the message list
  function addChatMessage (data, options) {
    // Don't fade the message in if there is an 'X was typing'
    var $typingMessages = getTypingMessages(data);
    options = options || {};
    if ($typingMessages.length !== 0) {
      options.fade = false;
      $typingMessages.remove();
    }

    var $usernameDiv = $('<span class="username"/>')
      .text(data.username)
      .css('color', getUsernameColor(data.username));
    var $messageBodyDiv = $('<span class="messageBody">')
      .text(data.message);

    var typingClass = data.typing ? 'typing' : '';
    var $messageDiv = $('<li class="message"/>')
      .data('username', data.username)
      .addClass(typingClass)
      .append($usernameDiv, $messageBodyDiv);

    addMessageElement($messageDiv, options);
  }

  // Adds the visual chat typing message
  function addChatTyping (data) {
    data.typing = true;
    data.message = 'is typing';
    addChatMessage(data);
  }

  // Removes the visual chat typing message
  function removeChatTyping (data) {
    getTypingMessages(data).fadeOut(function () {
      $(this).remove();
    });
  }

  // Adds a message element to the messages and scrolls to the bottom
  // el - The element to add as a message
  // options.fade - If the element should fade-in (default = true)
  // options.prepend - If the element should prepend
  //   all other messages (default = false)
  function addMessageElement (el, options) {
    var $el = $(el);

    // Setup default options
    if (!options) {
      options = {};
    }
    if (typeof options.fade === 'undefined') {
      options.fade = true;
    }
    if (typeof options.prepend === 'undefined') {
      options.prepend = false;
    }

    // Apply options
    if (options.fade) {
      $el.hide().fadeIn(FADE_TIME);
    }
    if (options.prepend) {
      $messages.prepend($el);
    } else {
      $messages.append($el);
    }
    $messages[0].scrollTop = $messages[0].scrollHeight;
  }

  // Prevents input from having injected markup
  function cleanInput (input) {
    return $('<div/>').text(input).text();
  }

  // Updates the typing event
  function updateTyping () {
    if (connected) {
      if (!typing) {
        typing = true;
        socket.emit('typing');
      }
      lastTypingTime = (new Date()).getTime();

      setTimeout(function () {
        var typingTimer = (new Date()).getTime();
        var timeDiff = typingTimer - lastTypingTime;
        if (timeDiff >= TYPING_TIMER_LENGTH && typing) {
          socket.emit('stop typing');
          typing = false;
        }
      }, TYPING_TIMER_LENGTH);
    }
  }

  // Gets the 'X is typing' messages of a user
  function getTypingMessages (data) {
    return $('.typing.message').filter(function (i) {
      return $(this).data('username') === data.username;
    });
  }

function isSongValid(id, callback) {
  if(id.indexOf("youtube") > -1)
  {
    callback(true);
    return;
  }
  SC.get("/resolve", {url: id}, (track) => {
    callback(!!(track && track.id));
  });
}

  // Gets the color of a username through our hash function
  function getUsernameColor (username) {
    // Compute hash code
    var hash = 7;
    for (var i = 0; i < username.length; i++) {
       hash = username.charCodeAt(i) + (hash << 5) - hash;
    }
    // Calculate color
    var index = Math.abs(hash % COLORS.length);
    return COLORS[index];
  }

  /*function playSong (song) {
    var sound  = SC.oEmbed(song.url, { auto_play: true }, document.getElementById("player"));
    sound.setPosition(song.startTime)
  }*/

  function playSong(song)
  {
    if(song.url.indexOf("youtube") > -1)
    {
      playSongYoutube(song);
      $('#sc-player').hide();
      $('#yt-player').show();
    }
    else {
      playSongSC(song);
      $('#yt-player').hide();
      $('#sc-player').show();
    }
  }

  var player;//Youtube player
  function playSongYoutube(song)
  {
    console.log("playSongYoutube");

    if(typeof(YT) == 'undefined' || typeof(YT.Player) == 'undefined')
    {
      console.log("YT undefined! need to load it")
      var tag = document.createElement('script');

      tag.src = "https://www.youtube.com/iframe_api";
      var firstScriptTag = document.getElementsByTagName('script')[0];
      firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
    }
    else {
        if(typeof(player) == 'undefined')
        {
          onYouTubeIframeAPIReady(); //Went to soundcloud
        }
        else {
          player.loadVideoById(getYoutubeId(song.url), song.startTime / 1000, "large");
        }

    }


    function onPlayerReady(event) {
      console.log("player ready!");
       event.target.setVolume(100);
        event.target.playVideo();
      }

    function onPlayerStateChange (event)
    {
      if (event.data == YT.PlayerState.ENDED) {
          console.log("ended!")
          socket.emit('need song');
        }
    }



    window.onYouTubeIframeAPIReady = function onYouTubeIframeAPIReady() {
     console.log("YT ready!")
     player = new YT.Player('yt-player', {
        height: '390',
        width: '640',
        videoId: getYoutubeId(song.url),
        //playerVars: {'controls': 0 }, //Cant pause, etc
        events: {
          'onReady': onPlayerReady,
          'onStateChange': onPlayerStateChange
        }
        });}


  }

  function getYoutubeId(url)
  {
    var video_id = url.split('v=')[1];
    var ampersandPosition = video_id.indexOf('&');
    if(ampersandPosition != -1) {
      video_id = video_id.substring(0, ampersandPosition);
    }
    return video_id;
  }




  function playSongSC(song)
  {
    console.log(song);
    $.getJSON(
    'http://api.soundcloud.com/resolve.json?url=' + song.url +
    '&client_id=' + clientId
  ).done(function ( soundData ) {
    $('#sc-player').html(templateIframe.supplant({
      url: soundData.uri,
      options: '&autoplay=true'
    }));
    var widget = SC.Widget("sc-playerIFrame");
    widget.bind('ready', function () {
      console.log('widget ready');
      widget.play();
      widget.bind(SC.Widget.Events.PLAY, function ()
          {
            widget.seekTo(song.startTime);
          });
      widget.bind(SC.Widget.Events.FINISH, function () {socket.emit('need song');})
    });
  });
  }


  // Keyboard events

  $window.keydown(function (event) {
    // When the client hits ENTER on their keyboard
    if (event.which === 13) {
      if (username) {
        sendMessage();
        socket.emit('stop typing');
        typing = false;
      } else {
        setUsername();
      }
    }
  });

  $inputMessage.on('input', function() {
    updateTyping();
  });

  // Click events

  // Focus input when clicking anywhere on login page
  $loginPage.click(function () {
    $currentInput.focus();
  });

  // Focus input when clicking on the message input's border
  $inputMessage.click(function () {
    $inputMessage.focus();
  });

$btnPush.click(function() {
  isSongValid($urlPush.val(), function(exists) {
    if (!exists) {
      const message = `Invalid song : ${$urlPush.val()}`;
      log(message);
    } else {
      socket.emit('new song', $urlPush.val());
    }

    $urlPush.val("");
  });
})

  $btnPull.click(function() {
    socket.emit('need song');
  })

  // Socket events

  // Whenever the server emits 'login', log the login message
  socket.on('login', function (data) {
    connected = true;
    // Display the welcome message
    var message = "Welcome to Socket.IO Chat – ";
    log(message, {
      prepend: true
    });
    addParticipantsMessage(data);
  });

  // Whenever the server emits 'new message', update the chat body
  socket.on('new message', function (data) {
    addChatMessage(data);
  });

  // Whenever the server emits 'user joined', log it in the chat body
  socket.on('user joined', function (data) {
    log(data.username + ' joined');
    addParticipantsMessage(data);
  });

  // Whenever the server emits 'user left', log it in the chat body
  socket.on('user left', function (data) {
    log(data.username + ' left');
    addParticipantsMessage(data);
    removeChatTyping(data);
  });

  // Whenever the server emits 'typing', show the typing message
  socket.on('typing', function (data) {
    addChatTyping(data);
  });

  // Whenever the server emits 'stop typing', kill the typing message
  socket.on('stop typing', function (data) {
    removeChatTyping(data);
  });

  // Whenever the server emits 'play', play the provided song
  socket.on('play', function (data) {
    playSong(data);
  })
});
