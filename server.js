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
var cellWidth = (canvasSize[1] - (mazeDimensions[1] + 1) * wallWidth) / mazeDimensions[1];
var cellHeight = (canvasSize[0] - (mazeDimensions[0] + 1) * wallWidth) / mazeDimensions[0];

setInterval(updateTanks, 25);

function init(socket, username, color) {
	users[socket.id] = {
		x: 38,
		y: 33,
		width: 12,
		height: 16,
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

//returns cell containing point with boundaries defined by the middle of the wall
function getCell(point) {
	var cell = [Math.floor((point[0] - wallWidth / 2) / (cellHeight + wallWidth)), Math.floor((point[1] - wallWidth / 2) / (cellWidth + wallWidth))];
	if (cell[0] < 0) {
		cell[0] = 0;
	}
	if (cell[0] >= mazeDimensions[0]) {
		cell[0] = mazeDimensions[0] - 1;
	}
	if (cell[1] < 0) {
		cell[1] = 0;
	}
	if (cell[1] >= mazeDimensions[1]) {
		cell[1] = mazeDimensions[1] - 1;
	}
	return cell;
}

//returns wall coordinates similar to cell coordinates
function getWall(point) {
	var cell = getCell(point);
	if (point[0] <= (cellHeight + wallWidth) * cell[0] + wallWidth && maze[cell[0]][cell[1]].top) {
		return [cell[0] - 0.5, cell[1]];
	}
	if (point[0] >= (cellHeight + wallWidth) * (cell[0] + 1) && maze[cell[0]][cell[1]].bottom) {
		return [cell[0] + 0.5, cell[1]];
	}
	if (point[1] <= (cellWidth + wallWidth) * cell[1] + wallWidth && maze[cell[0]][cell[1]].left) {
		return [cell[0], cell[1] - 0.5];
	}
	if (point[1] >= (cellWidth + wallWidth) * (cell[1] + 1) && maze[cell[0]][cell[1]].right) {
		return [cell[0], cell[1] + 0.5];
	}
	return null;
}
/*
function shiftTank(user, dy, dx) {
	var vAngle = Math.atan(users[user].width / users[user].height);
	var vDist = Math.sqrt(users[user].width * users[user].width + users[user].height * users[user].height) / 2;
	//Add additional points if necessary (in the form (y, x) and in order)
	var points = [[Math.sin(users[user].angle + vAngle) * vDist + users[user].y, Math.cos(users[user].angle + vAngle) * vDist + users[user].x],
		[Math.sin(users[user].angle - vAngle + Math.PI) * vDist + users[user].y, Math.cos(users[user].angle - vAngle + Math.PI) * vDist + users[user].x],
		[Math.sin(users[user].angle + vAngle + Math.PI) * vDist + users[user].y, Math.cos(users[user].angle + vAngle + Math.PI) * vDist + users[user].x],
		[Math.sin(users[user].angle - vAngle) * vDist + users[user].y, Math.cos(users[user].angle - vAngle) * vDist + users[user].x],
		[Math.sin(users[user].angle + vAngle) * vDist + users[user].y, Math.cos(users[user].angle + vAngle) * vDist + users[user].x]];
	var cell = getCell([users[user].y, users[user].x]);
	var maxRatio = 3; //in case of large ratio causing issues
	var minX = 1000000, maxX = -1000000, minY = 1000000, maxY = -1000000;
	var finalTransform = [0, 0];

	//tank corner in wall case
	for (var i = 0; i < points.length - 1; i++) {
		//for next collision section
		if (points[i][0] > maxY) {
			maxY = points[i][0];
		}
		if (points[i][0] < minY) {
			minY = points[i][0];
		}
		if (points[i][1] > maxX) {
			maxX = points[i][1];
		}
		if (points[i][1] < minX) {
			minX = points[i][1];
		}

		var wall = getWall(points[i]);
		if (wall == null) {
			continue;
		}
		//finds transformation for each vertex on wall in direction of tank
		var transform = [0, 0];
		console.log(wall);
		if (wall[0] == cell[0]) {
			if (wall[1] == cell[1] - 0.5) {
				transform[1] = ((cellWidth + wallWidth) * cell[1] + wallWidth) - points[i][1];
				//if (dx != 0) {
				//	transform[0] = transform[1] * (dy / dx > maxRatio ? maxRatio : dy / dx);
				//}
			}
			else {
				transform[1] = (cellWidth + wallWidth) * (cell[1] + 1) - points[i][1];
				//if (dx != 0) {
				//	transform[0] = transform[1] * (dy / dx > maxRatio ? maxRatio : dy / dx);
				//}
			}
		}
		else {
			if (wall[0] == cell[0] - 0.5) {
				transform[0] = ((cellHeight + wallWidth) * cell[0] + wallWidth) - points[i][0];
				//if (dy != 0) {
				//	transform[1] = transform[0] * (dx / dy > maxRatio ? maxRatio : dx / dy);
				//}
			}
			else {
				transform[0] = (cellHeight + wallWidth) * (cell[0] + 1) - points[i][0];
				//if (dy != 0) {
				//	transform[1] = transform[0] * (dx / dy > maxRatio ? maxRatio : dx / dy);
				//}
			}
		}
		console.log(transform);
		//for moving in direction of tank
		//if ((transform[0] * transform[0] + transform[1] * transform[1]) >= (finalTransform[0] * finalTransform[0] + finalTransform[1] * finalTransform[1]) && (transform[0] * transform[0] + transform[1] * transform[1]) <= 2 * speed * speed) {
		//	finalTransform = transform;
		//}
		//for sliding against wall
		if (Math.abs(transform[0]) > Math.abs(finalTransform[0]) && Math.abs(transform[0]) <= speed) {
			finalTransform[0] = transform[0];
		}
		if (Math.abs(transform[1]) > Math.abs(finalTransform[1]) && Math.abs(transform[1]) <= speed) {
			finalTransform[1] = transform[1];
		}
	}

	//wall corner in tank case
	minY = Math.floor(minY / (cellHeight + wallWidth)) - 0.25 + (minY % (cellHeight + wallWidth) > wallWidth ? 0.5 : 0);
	maxY = Math.floor(maxY / (cellHeight + wallWidth)) - 0.75 + (maxY % (cellHeight + wallWidth) >= wallWidth ? 0.5 : 0);
	minX = Math.floor(minX / (cellWidth + wallWidth)) - 0.25 + (minX % (cellWidth + wallWidth) > wallWidth ? 0.5 : 0);
	maxX = Math.floor(maxX / (cellWidth + wallWidth)) - 0.75 + (maxX % (cellWidth + wallWidth) >= wallWidth ? 0.5 : 0);
	var vx, vy, px, py, dp, count = 0;
	var transform = [1000000, 1000000];
	for (var i = minY; i <= maxY; i += 0.5) {
		for (var j = minX; j <= maxX; j += 0.5) {
			vy = Math.floor(i+1) * (cellHeight + wallWidth) + ((i - Math.floor(i) == 0.75) ? wallWidth : 0);
			vx = Math.floor(j+1) * (cellWidth + wallWidth) + ((j - Math.floor(j) == 0.75) ? wallWidth : 0);
			for (var k = 0; k < points.length - 1; k++) {
				// origin: points[k][1], points[k][0]
				// u = vx - points[k][1], vy - points[k][0]
				// v = points[k+1][1] - points[k][1], points[k+1][0] - points[k][0] is the vertex of wall
				// p is projection
				// dp is for dot product stuff for projection
				dp = ((points[k+1][1] - points[k][1]) * (vx - points[k][1]) + (points[k+1][0] - points[k][0]) * (vy - points[k][0])) / ((points[k+1][1] - points[k][1]) * (points[k+1][1] - points[k][1]) + (points[k+1][0] - points[k][0]) * (points[k+1][0] - points[k][0]));
				px = points[k][1] + dp * (points[k+1][1] - points[k][1]);
				py = points[k][0] + dp * (points[k+1][0] - points[k][0]);
				if ((px >= points[k][1] && px <= points[k+1][1] || px <= points[k][1] && px >= points[k+1][1]) && (py >= points[k][0] && py <= points[k+1][0] || py <= points[k][0] && py >= points[k+1][0])) {
					count++;
					if ((users[user].x - px) * (vx - px) + (users[user].y - py) * (vy - py) >= 0) {
						if ((vy - py) * (vy - py) + (vx - px) * (vx - px) < transform[0] * transform[0] + transform[1] * transform[1] && (dx == 0 || Math.abs(dy / dx - (vy - py) / (vx - px)) <= 0.000001) && ((vy - py) * (vy - py) + (vx - px) * (vx - px) <= 2 * speed * speed)) {
							transform = [vy - py - 2 * dy, vx - px - 2 * dx];
						}
					}
				}
			}
		}
	}
	if (count > 1 && transform[0] * transform[0] + transform[1] * transform[1] <= 2 * speed * speed) {
		finalTransform = transform;
	}

	users[user].y += finalTransform[0];
	users[user].x += finalTransform[1];
}

function updateTank(user) {
	var sin, cos;
	if (users[user].left) {
		users[user].angle -= rotSpeed;
		sin = Math.cos(users[user].angle);
		cos = -Math.sin(users[user].angle);
		shiftTank(user, sin, cos);
		console.log('rotate:' + users[user].x + ',' + users[user].y);
	}
	else if (users[user].right) {
		users[user].angle += rotSpeed;
		sin = -Math.cos(users[user].angle);
		cos = Math.sin(users[user].angle);
		shiftTank(user, sin, cos);
		console.log('rotate:' + users[user].x + ',' + users[user].y);
	}
	sin = -Math.sin(users[user].angle);
	cos = -Math.cos(users[user].angle);
	if (users[user].up) {
		users[user].x += Math.cos(users[user].angle) * speed;
		users[user].y += Math.sin(users[user].angle) * speed;
	}
	else if (users[user].down) {
		users[user].x -= Math.cos(users[user].angle) * speed;
		users[user].y -= Math.sin(users[user].angle) * speed;
	}
	else {
		return;
	}
	shiftTank(user, sin, cos);
	console.log('move:' + users[user].x + ',' + users[user].y);
}*/

function isColliding(user) {
	var vAngle = Math.atan(users[user].width / users[user].height);
	var vDist = Math.sqrt(users[user].width * users[user].width + users[user].height * users[user].height) / 2;
	//Add additional points if necessary (in the form (y, x) and in order)
	var points = [[Math.sin(users[user].angle + vAngle) * vDist + users[user].y, Math.cos(users[user].angle + vAngle) * vDist + users[user].x],
		[Math.sin(users[user].angle - vAngle + Math.PI) * vDist + users[user].y, Math.cos(users[user].angle - vAngle + Math.PI) * vDist + users[user].x],
		[Math.sin(users[user].angle + vAngle + Math.PI) * vDist + users[user].y, Math.cos(users[user].angle + vAngle + Math.PI) * vDist + users[user].x],
		[Math.sin(users[user].angle - vAngle) * vDist + users[user].y, Math.cos(users[user].angle - vAngle) * vDist + users[user].x],
		[Math.sin(users[user].angle + vAngle) * vDist + users[user].y, Math.cos(users[user].angle + vAngle) * vDist + users[user].x]];
	var minX = 1000000, maxX = -1000000, minY = 1000000, maxY = -1000000;

	//tank corner in wall case
	for (var i = 0; i < points.length - 1; i++) {
		//for next collision section
		if (points[i][0] > maxY) {
			maxY = points[i][0];
		}
		if (points[i][0] < minY) {
			minY = points[i][0];
		}
		if (points[i][1] > maxX) {
			maxX = points[i][1];
		}
		if (points[i][1] < minX) {
			minX = points[i][1];
		}

		var wall = getWall(points[i]);
		if (wall != null) {
			return true;
		}
	}

	//wall corner in tank case
	minY = Math.floor(minY / (cellHeight + wallWidth)) - 0.25 + (minY % (cellHeight + wallWidth) > wallWidth ? 0.5 : 0);
	maxY = Math.floor(maxY / (cellHeight + wallWidth)) - 0.75 + (maxY % (cellHeight + wallWidth) >= wallWidth ? 0.5 : 0);
	minX = Math.floor(minX / (cellWidth + wallWidth)) - 0.25 + (minX % (cellWidth + wallWidth) > wallWidth ? 0.5 : 0);
	maxX = Math.floor(maxX / (cellWidth + wallWidth)) - 0.75 + (maxX % (cellWidth + wallWidth) >= wallWidth ? 0.5 : 0);
	var vx, vy, px, py, dp, count = 0;
	for (var i = minY; i <= maxY; i += 0.5) {
		for (var j = minX; j <= maxX; j += 0.5) {
			vy = Math.floor(i+1) * (cellHeight + wallWidth) + ((i - Math.floor(i) == 0.75) ? wallWidth : 0);
			vx = Math.floor(j+1) * (cellWidth + wallWidth) + ((j - Math.floor(j) == 0.75) ? wallWidth : 0);
			for (var k = 0; k < points.length - 1; k++) {
				// origin: points[k][1], points[k][0]
				// u = vx - points[k][1], vy - points[k][0]
				// v = points[k+1][1] - points[k][1], points[k+1][0] - points[k][0] is the vertex of wall
				// p is projection
				// dp is for dot product stuff for projection
				dp = ((points[k+1][1] - points[k][1]) * (vx - points[k][1]) + (points[k+1][0] - points[k][0]) * (vy - points[k][0])) / ((points[k+1][1] - points[k][1]) * (points[k+1][1] - points[k][1]) + (points[k+1][0] - points[k][0]) * (points[k+1][0] - points[k][0]));
				px = points[k][1] + dp * (points[k+1][1] - points[k][1]);
				py = points[k][0] + dp * (points[k+1][0] - points[k][0]);
				if ((px >= points[k][1] && px <= points[k+1][1] || px <= points[k][1] && px >= points[k+1][1]) && (py >= points[k][0] && py <= points[k+1][0] || py <= points[k][0] && py >= points[k+1][0])) {
					count++;
					if (count > 1) {
						return true;
					}
				}
			}
		}
	}
	return false;
}

function updateTank(user) {
	//I'm lazy
	if (users[user].left) {
		for (var i = 0; i <= rotSpeed; i += Math.PI / 180) {
			users[user].angle -= Math.PI / 180;
			if (isColliding(user)) {
				break;
			}
		}
		users[user].angle += Math.PI / 180;
	}
	else if (users[user].right) {
		for (var i = 0; i <= rotSpeed; i += Math.PI / 180) {
			users[user].angle += Math.PI / 180;
			if (isColliding(user)) {
				break;
			}
		}
		users[user].angle -= Math.PI / 180;
	}
	if (users[user].up) {
		for (var i = 0; i <= speed; i ++) {
			users[user].x += Math.cos(users[user].angle);
			users[user].y += Math.sin(users[user].angle);
			if (isColliding(user)) {
				break;
			}
		}
		users[user].x -= Math.cos(users[user].angle);
		users[user].y -= Math.sin(users[user].angle);
	}
	else if (users[user].down) {
		for (var i = 0; i <= speed; i ++) {
			users[user].x -= Math.cos(users[user].angle);
			users[user].y -= Math.sin(users[user].angle);
			if (isColliding(user)) {
				break;
			}
		}
		users[user].x += Math.cos(users[user].angle);
		users[user].y += Math.sin(users[user].angle);
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