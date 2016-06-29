var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);

app.get('/', function(req, res){
  res.sendFile(__dirname + '/index.html');
});

var x = 0;
var y = 0;

io.on('connection', function(socket){
  io.emit('draw', [x, y]);
  console.log('connected');
  socket.on('moveLeft', function(){
    x -= 10;
    io.emit('draw', [x, y]);
    console.log('moveLeft');
  });
  socket.on('moveRight', function(){
    x += 10;
    io.emit('draw', [x, y]);
    console.log('moveRight');
  });
  socket.on('moveUp', function(){
    y -= 10;
    io.emit('draw', [x, y]);
    console.log('moveUp');
  });
  socket.on('moveDown', function(){
    y += 10;
    io.emit('draw', [x, y]);
    console.log('moveDown');
  });
});

http.listen(3000, function(){
  console.log('listening on *:3000');
});
