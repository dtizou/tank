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
var speed = 4;
var rotSpeed = 5 * Math.PI / 180;
var wallWidth = 8;

setInterval(updateTanks, 25);

function init(socket, username, color) {
	users[socket.id] = {
		x: 28,
		y: 23,
		width: 30,
		height: 40,
		angle: 0,
		left: false,
		right: false,
		up: false,
		down: false,
		color: color,
		randColor: getRandomColor(),
		username: username
	};
	setCanvasSize();
	drawMaze();
	drawTanks();
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
		updateTank(user);
	}
	drawTanks();
}

function drawTanks() {
	io.emit('drawTanks', users);
}

function drawMaze() {
	io.emit('drawMaze', maze, mazeDimensions[0], mazeDimensions[1], wallWidth);
}

function setCanvasSize() {
	io.emit('setCanvasSize', canvasSize);
}

function updateTank(user) {
	if (users[user].left) {
		users[user].angle -= rotSpeed;
	}
	if (users[user].right) {
		users[user].angle += rotSpeed;
	}
	if (users[user].up) {
		users[user].x += Math.cos(users[user].angle) * speed;
		users[user].y += Math.sin(users[user].angle) * speed;
	}
	if (users[user].down) {
		users[user].x -= Math.cos(users[user].angle) * speed;
		users[user].y -= Math.sin(users[user].angle) * speed;
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