var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);

app.get('/', function(req, res){
  res.sendFile(__dirname + '/index.html');
});

var users = {};

io.on('connection', function(socket){
  users[socket.id] = {x: 0, y: 0, width: 50, height: 50, color: '#ff0000'};
  io.emit('draw', users);
  console.log('connected ' + socket.id);
  socket.on('moveLeft', function(){
    users[socket.id].x -= 10;
    if (users[socket.id].x <= 0) {
      users[socket.id].x = 0;
    }
    io.emit('draw', users);
    console.log('moveLeft ' + socket.id);
  });
  socket.on('moveRight', function(){
    users[socket.id].x += 10;
    if (users[socket.id].x >= 1150) {
      users[socket.id].x = 1150;
    }
    io.emit('draw', users);
    console.log('moveRight ' + socket.id);
  });
  socket.on('moveUp', function(){
    users[socket.id].y -= 10;
    if (users[socket.id].y <= 0) {
      users[socket.id].y = 0;
    }
    io.emit('draw', users);
    console.log('moveUp ' + socket.id);
  });
  socket.on('moveDown', function(){
    users[socket.id].y += 10;
    if (users[socket.id].y >= 650) {
      users[socket.id].y = 650;
    }
    io.emit('draw', users);
    console.log('moveDown ' + socket.id);
  });
  socket.on('disconnect', function(){
    delete users[socket.id];
  })
});

http.listen(3000, function(){
  console.log('listening on *:3000');
});
