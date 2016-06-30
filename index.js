var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var mazeGen = require('./maze');

app.get('/', function(req, res){
  res.sendFile(__dirname + '/index.html');
});

var users = {};
var canvasSize = [700, 1200]; //height and width
var mazeDimensions = [7, 12]; //rows and cols
var maze = mazeGen.generateMaze(mazeDimensions[0], mazeDimensions[1]);
var speed = 10;

function drawTanks() {
  io.emit('drawTanks', users);
}

function drawMaze() {
  io.emit('drawMaze', maze);
}

function setCanvasSize() {
  io.emit('setCanvasSize', canvasSize);
}

function fixCollision(socketid) {
  var cell = [Math.floor((users[socketid].y + users[socketid].height / 2) * mazeDimensions[0] / canvasSize[0]), Math.floor((users[socketid].x + users[socketid].width / 2) * mazeDimensions[1] / canvasSize[1])];
  if (users[socketid].x < cell[1] * canvasSize[1] / mazeDimensions[1] && maze.maze[cell[0]][cell[1]].left) {
    users[socketid].x = cell[1] * canvasSize[1] / mazeDimensions[1];
  }
  if (users[socketid].x > (cell[1] + 1) * canvasSize[1] / mazeDimensions[1] - users[socketid].width && maze.maze[cell[0]][cell[1]].right) {
    users[socketid].x = (cell[1] + 1) * canvasSize[1] / mazeDimensions[1] - users[socketid].width;
  }
  if (users[socketid].y < cell[0] * canvasSize[0] / mazeDimensions[0] && maze.maze[cell[0]][cell[1]].top) {
    users[socketid].y = cell[0] * canvasSize[0] / mazeDimensions[0];
  }
  if (users[socketid].y > (cell[0] + 1) * canvasSize[0] / mazeDimensions[0] - users[socketid].height && maze.maze[cell[0]][cell[1]].bottom) {
    users[socketid].y = (cell[0] + 1) * canvasSize[0] / mazeDimensions[0] - users[socketid].height;
  }
}

io.on('connection', function(socket){
  //Things to do when connection to socket starts
  users[socket.id] = {x: 0, y: 0, width: 50, height: 50, color: '#ff0000'};
  setCanvasSize();
  drawMaze();
  drawTanks();
  //console.log(socket.id);
  
  //Receiving events
  socket.on('moveLeft', function(){
    users[socket.id].x -= speed;
    fixCollision(socket.id);
    drawTanks();
  });
  socket.on('moveRight', function(){
    users[socket.id].x += speed;
    fixCollision(socket.id);
    drawTanks();
  });
  socket.on('moveUp', function(){
    users[socket.id].y -= speed;
    fixCollision(socket.id);
    drawTanks();
  });
  socket.on('moveDown', function(){
    users[socket.id].y += speed;
    fixCollision(socket.id);
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
