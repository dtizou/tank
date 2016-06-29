var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);

app.get('/', function(req, res){
  res.sendFile(__dirname + '/index.html');
});

var x = 0;
var y = 0;

//var users = {};

io.on('connection', function(socket){
  io.emit('draw', [x, y]);
  console.log('connected ' + socket.id);
  socket.on('moveLeft', function(){
    x -= 10;
    if (x <= 0) {
      x = 0;
    }
    io.emit('draw', [x, y]);
    console.log('moveLeft ' + socket.id);
  });
  socket.on('moveRight', function(){
    x += 10;
    if (x >= 1150) {
      x = 1150;
    }
    io.emit('draw', [x, y]);
    console.log('moveRight ' + socket.id);
  });
  socket.on('moveUp', function(){
    y -= 10;
    if (y <= 0) {
      y = 0;
    }
    io.emit('draw', [x, y]);
    console.log('moveUp ' + socket.id);
  });
  socket.on('moveDown', function(){
    y += 10;
    if (y >= 650) {
      y = 650;
    }
    io.emit('draw', [x, y]);
    console.log('moveDown ' + socket.id);
  });
});

http.listen(3000, function(){
  console.log('listening on *:3000');
});