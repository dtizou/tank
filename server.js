var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var mazeGen = require('./maze');

app.get('/', function (req, res) {
	res.sendFile(__dirname + '/index.html');
});

var users = {};
var canvasSize = [700, 1200]; //height and width
var mazeDimensions = [7, 12]; //rows and cols
var maze = mazeGen.generateMaze(mazeDimensions[0], mazeDimensions[1]);
var speed = 3;

setInterval(updateTanks, 25);

function init(socket, username, color) {
	users[socket.id] = {
		x: 0,
		y: 0,
		width: 50,
		height: 50,
		left: false,
		right: false,
		up: false,
		down: false,
		color: color,
		username: username
	};
	users[socket.id].randColor = getRandomColor();
	setCanvasSize();
	drawMaze();
	updateTanks();
}

function getRandomColor() {
	var color = '#';
	var chars = '0123456789abcdef';
	for (var i = 0; i < 6; i++) {
		color += chars[Math.floor(Math.random() * 16)];
	}
	return color;
}

function updateTanks() {
	for (var user in users) {
		if (users[user].left) {
			users[user].x -= speed;
		}
		if (users[user].right) {
			users[user].x += speed;
		}
		if (users[user].up) {
			users[user].y -= speed;
		}
		if (users[user].down) {
			users[user].y += speed;
		}
		fixCollision(user);
	}
	drawTanks();
}

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

io.on('connection', function (socket) {
	//Starts game on username submit
	socket.on('addUser', function (username, color) {
		init(socket, username, color);
	});

	//Receiving events
	socket.on('pressLeft', function () {
		users[socket.id].left = true;
		users[socket.id].right = false;
	});
	socket.on('pressRight', function () {
		users[socket.id].right = true;
		users[socket.id].left = false;
	});
	socket.on('pressUp', function () {
		users[socket.id].up = true;
		users[socket.id].down = false;
	});
	socket.on('pressDown', function () {
		users[socket.id].down = true;
		users[socket.id].up = false;
	});
	socket.on('releaseLeft', function () {
		users[socket.id].left = false;
	});
	socket.on('releaseRight', function () {
		users[socket.id].right = false;
	});
	socket.on('releaseUp', function () {
		users[socket.id].up = false;
	});
	socket.on('releaseDown', function () {
		users[socket.id].down = false;
	});

	//Remove tank on disconnect
	socket.on('disconnect', function () {
		delete users[socket.id];
		drawTanks();
	});
});

var server_port = process.env.OPENSHIFT_NODEJS_PORT || 3000;
var server_ip_address = process.env.OPENSHIFT_NODEJS_IP || '127.0.0.1';

http.listen(server_port, server_ip_address, function () {
	console.log("Listening on " + server_ip_address + ", server_port " + server_port);
});