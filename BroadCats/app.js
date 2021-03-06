var express = require('express');
var app = express();
var server = require('http').Server(app);
var io = require('socket.io')(server);
var favicon = require('serve-favicon');

//Set our static file directory to public
app.use(favicon(__dirname + '/public/favicon.ico'));
app.use(express.static(__dirname + '/public'));

app.get('/', function(req, res) {
  //send the index.html in our public directory
  res.sendfile('index.html');
});
// Chatroom

// usernames which are currently connected to the chat
var usernames = [];
var numUsers = 0;
var waitingForSongs = false;
var songs = [];
var lastSong = {songUrl : "",
                timeStarted : new Date().getTime()}

io.on('connection', function (socket) {
  var addedUser = false;
  // when the client emits 'new message', this listens and executes
  socket.on('new message', function (data) {
    // we tell the client to execute 'new message'
    socket.broadcast.emit('new message', {
      username: socket.username,
      message: data
    });
  });

  socket.on('new song', function (id)
  {
    //add song to list
    console.log('Song added : ' + id);
    songs.unshift(id);
  });

  socket.on('need song', function(){
    if(waitingForSongs)
    {
      console.log("Need song is denied because we already sent a song");
      return;
    }
    console.log("need song");
    waitingForSongs = true;
    var song = songs.pop();
    io.emit('play', {url: song, startTime : 0});
    lastSong = {songUrl : song,
                    timeStarted : new Date().getTime()};
    setTimeout(function(){
    waitingForSongs = false;},3000);
  });

  // when the client emits 'add user', this listens and executes
  socket.on('add user', function (username) {
    // we store the username in the socket session for this client
    socket.username = username;
    // add the client's username to the global list
    usernames[username] = username;
    ++numUsers;
    addedUser = true;
    socket.emit('login', {
      numUsers: numUsers
    });
    // echo globally (all clients) that a person has connected
    socket.broadcast.emit('user joined', {
      username: socket.username,
      numUsers: numUsers
    });

    //send him the song
    console.log("New User!");
    if(lastSong.songUrl != "")
    {
      var now = new Date().getTime();
      var diff = now - lastSong.timeStarted;
      socket.emit("play",{url: lastSong.songUrl, startTime : diff});
    }

  });

  // when the client emits 'typing', we broadcast it to others
  socket.on('typing', function () {
    socket.broadcast.emit('typing', {
      username: socket.username
    });
  });

  // when the client emits 'stop typing', we broadcast it to others
  socket.on('stop typing', function () {
    socket.broadcast.emit('stop typing', {
      username: socket.username
    });
  });

  // when the user disconnects.. perform this
  socket.on('disconnect', function () {
    // remove the username from global usernames list
    if (addedUser) {
      delete usernames[socket.username];
      --numUsers;

      // echo globally that this client has left
      socket.broadcast.emit('user left', {
        username: socket.username,
        numUsers: numUsers
      });
    }
  });
});

server.listen(8000);
console.log('server up');
