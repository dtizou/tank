var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var maze = require('./maze');

app.get('/', function(req, res){
  res.sendFile(__dirname + '/index.html');
});

var users = {};

function drawTanks() {
  io.emit('drawTanks', users);
}

function drawMaze() {
  io.emit('drawMaze', maze.generateMaze(4, 5));
}

io.on('connection', function(socket){
  //Things to do when connection to socket starts
  users[socket.id] = {x: 0, y: 0, width: 50, height: 50, color: '#ff0000'};
  drawMaze();
  drawTanks();
  //console.log(socket.id);
  
  //Receiving events
  socket.on('moveLeft', function(){
    users[socket.id].x -= 10;
    if (users[socket.id].x <= 0) {
      users[socket.id].x = 0;
    }
    drawTanks();
  });
  socket.on('moveRight', function(){
    users[socket.id].x += 10;
    if (users[socket.id].x >= 1150) {
      users[socket.id].x = 1150;
    }
    drawTanks();
  });
  socket.on('moveUp', function(){
    users[socket.id].y -= 10;
    if (users[socket.id].y <= 0) {
      users[socket.id].y = 0;
    }
    drawTanks();
  });
  socket.on('moveDown', function(){
    users[socket.id].y += 10;
    if (users[socket.id].y >= 650) {
      users[socket.id].y = 650;
    }
    drawTanks();
  });
  
  //Remove tank on disconnect
  socket.on('disconnect', function(){
    delete users[socket.id];
    drawTanks();
  })
  
  /*socket.on('addUser', function(user){
    console.log(user);
  });*/
});

http.listen(3000, function(){
  console.log('listening on *:3000');
});
