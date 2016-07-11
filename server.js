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
var wallWidth = 10;
var cellWidth = (canvasSize[1] - (mazeDimensions[1] + 1) * wallWidth) / mazeDimensions[1];
var cellHeight = (canvasSize[0] - (mazeDimensions[0] + 1) * wallWidth) / mazeDimensions[0];
var maxBullets = 5;
var bulletRadius = 3;
var bulletSpeed = 5;
var explosions = [];

// for rounding issues
const c0 = 0.000001;

setInterval(update, 25);

function init(socket, username, color) {
	users[socket.id] = {
		x: wallWidth + cellWidth / 2 + Math.floor(Math.random() * mazeDimensions[1]) * (wallWidth + cellWidth),
		y: wallWidth + cellHeight / 2 + Math.floor(Math.random() * mazeDimensions[0]) * (wallWidth + cellHeight),
		width: 30,
		height: 40,
		angle: 0,
		left: false,
		right: false,
		up: false,
		down: false,
		color: color,
		randColor: getRandomColor(),
		username: username,
		bullets: []
	};
	setCanvasSize();
	drawMaze();
	drawTanks();
	drawBullets();
	drawExplosions();
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

function pointDist(p1, p2) {
	return Math.sqrt((p1[0] - p2[0]) * (p1[0] - p2[0]) + (p1[1] - p2[1]) * (p1[1] - p2[1]));
}

function updateBulletAngle(bullet) {
	// min/max x/y values for bullet
	var minX = bullet.x - bullet.radius;
	var maxX = bullet.x + bullet.radius;
	var minY = bullet.y - bullet.radius;
	var maxY = bullet.y + bullet.radius;

	// get all walls that could overlap bullet
	var lWall = Math.ceil((minX - wallWidth) / (cellWidth + wallWidth)) - 0.5;
	var rWall = Math.floor(maxX / (cellWidth + wallWidth)) - 0.5;
	var dWall = Math.ceil((minY - wallWidth) / (cellHeight + wallWidth)) - 0.5;
	var uWall = Math.floor(maxY / (cellHeight + wallWidth)) - 0.5;
	var walls = [];
	for (var i = lWall; i <= rWall; i++) {
		for (var j = dWall - 0.5; j <= uWall + 0.5; j++) {
			if (isWall(j, i)) {
				walls.push([j, i]);
			}
		}
	}
	for (var i = dWall; i <= uWall; i++) {
		for (var j = lWall - 0.5; j <= rWall + 0.5; j++) {
			if (isWall(i, j)) {
				walls.push([i, j]);
			}
		}
	}

	var wpoints, wlines, angle, center, intersection, before = [bullet.y - Math.sin(bullet.angle) * bullet.speed, bullet.x - Math.cos(bullet.angle) * bullet.speed], after = [bullet.y, bullet.x];
	var xReflect = false, yReflect = false, minDist = 1000000;
	for (var i = 0; i < walls.length; i++) {
		wpoints = wallPoints(walls[i][0], walls[i][1]);
		center = [(wpoints[0][0] + wpoints[2][0]) / 2, (wpoints[0][1] + wpoints[2][1]) / 2];
		wlines = convertToSeg(wpoints);
		for (var j = 0; j < wlines.length; j++) {
			intersection = lineIntersection(before, after, wlines[j][0], wlines[j][1]);
			if (intersection != null && between(intersection, wlines[j][0], wlines[j][1]) && pointDist(intersection, before) < minDist) {
				minDist = pointDist(intersection, before);
				if (j == 0 && Math.cos(bullet.angle) >= 0) {
					// left
					xReflect = true;
					yReflect = false;
				}
				if (j == 1 && Math.sin(bullet.angle) <= 0) {
					// bottom
					xReflect = false;
					yReflect = true;
				}
				if (j == 2 && Math.cos(bullet.angle) <= 0) {
					// right
					xReflect = true;
					yReflect = false;
				}
				if (j == 3 && Math.sin(bullet.angle) >= 0) {
					// top
					xReflect = false;
					yReflect = true;
				}
			}
		}
	}
	if (xReflect) {
		bullet.angle = Math.PI - bullet.angle;
	}
	else if (yReflect) {
		bullet.angle = -bullet.angle;
	}
}

function updateBullets() {
	for (var user in users) {
		for (var i = 0; i < users[user].bullets.length; i++) {
			updateBulletAngle(users[user].bullets[i]);
			users[user].bullets[i].y += Math.sin(users[user].bullets[i].angle) * users[user].bullets[i].speed;
			users[user].bullets[i].x += Math.cos(users[user].bullets[i].angle) * users[user].bullets[i].speed;
			if (users[user].bullets[i].y >= canvasSize[0] + users[user].bullets[i].radius || users[user].bullets[i].y <= -users[user].bullets[i].radius || users[user].bullets[i].x >= canvasSize[1] + users[user].bullets[i].radius || users[user].bullets[i].x <= -users[user].bullets[i].radius) {
				users[user].bullets.splice(i, 1);
				i--;
			}
		}
	}
	drawBullets();
}

function updateExplosions() {
	for (var i = 0; i < explosions.length; i++) {
		for (var j = 0; j < explosions[i].length; j++) {
			explosions[i][j].radius = (explosions[i][j].radius < 1) ? 0 : (explosions[i][j].radius - 1);
			// all circles in explosion shrink by 1 px in radius
		}
	}
	drawExplosions();
}

function update() {
	updateTanks();
	updateBullets();
	updateExplosions();
}

function drawTanks() {
	io.emit('drawTanks', users);
}

function drawBullets() {
	io.emit('drawBullets', users);
}

function drawExplosions() {
	io.emit('drawExplosions', explosions);
}

function drawMaze() {
	io.emit('drawMaze', maze, mazeDimensions[0], mazeDimensions[1], wallWidth);
}

function setCanvasSize() {
	io.emit('setCanvasSize', canvasSize);
}

function dotProduct(v1, v2) {
	return v1[0] * v2[0] + v1[1] * v2[1];
}

// intersection of line defined by points p1,p2 and p3,p4
function lineIntersection(p1, p2, p3, p4) {
	var denom = (p1[1] - p2[1]) * (p3[0] - p4[0]) - (p1[0] - p2[0]) * (p3[1] - p4[1]);
	if (denom == 0) {
		return null;
	}
	return [((p1[1] * p2[0] - p1[0] * p2[1]) * (p3[0] - p4[0]) - (p1[0] - p2[0]) * (p3[1] * p4[0] - p3[0] * p4[1])) / denom, ((p1[1] * p2[0] - p1[0] * p2[1]) * (p3[1] - p4[1]) - (p1[1] - p2[1]) * (p3[1] * p4[0] - p3[0] * p4[1])) / denom];
}

// point a between b and c
// c0 is for rounding issues
function between(a, b, c) {
	return ((a[0] >= b[0] - c0 && a[0] <= c[0] + c0) || (a[0] <= b[0] + c0 && a[0] >= c[0] - c0)) && ((a[1] >= b[1] - c0 && a[1] <= c[1] + c0) || (a[1] <= b[1] + c0 && a[1] >= c[1] - c0));
}

// ratio of v1 to v2
// c0 is for rounding issues
function vecRatio(v1, v2) {
	if (Math.abs(v2[0]) < c0) {
		return v1[1] / v2[1];
	}
	return v1[0] / v2[0];
}

// translation is too much
function validMove(t) {
	return (Math.abs(t[0]) <= speed * (1 + c0)) && (Math.abs(t[1]) <= speed * (1 + c0));
}

// checks if coords are located at wall
function isWall(y, x) {
	if (x <= -1 || y <= -1 || x >= mazeDimensions[1] || y >= mazeDimensions[0]) {
		return false;
	}
	if (y % 1 != 0) {
		if (y > 0) {
			return maze[y-0.5][x].bottom;
		}
		return maze[y+0.5][x].top;
	}
	else {
		if (x > 0) {
			return maze[y][x-0.5].right;
		}
		return maze[y][x+0.5].left;
	}
}

// returns point for vertices of wall in order
function wallPoints(y, x) {
	if (y % 1 != 0) {
		return [[(y+0.5) * (cellHeight + wallWidth), x * (cellWidth + wallWidth)],
			[(y+0.5) * (cellHeight + wallWidth) + wallWidth, x * (cellWidth + wallWidth)],
			[(y+0.5) * (cellHeight + wallWidth) + wallWidth, x * (cellWidth + wallWidth) + cellWidth + 2 * wallWidth],
			[(y+0.5) * (cellHeight + wallWidth), x * (cellWidth + wallWidth) + cellWidth + 2 * wallWidth]];
	}
	else {
		return [[y * (cellHeight + wallWidth), (x+0.5) * (cellWidth + wallWidth)],
			[y * (cellHeight + wallWidth) + cellHeight + 2 * wallWidth, (x+0.5) * (cellWidth + wallWidth)],
			[y * (cellHeight + wallWidth) + cellHeight + 2 * wallWidth, (x+0.5) * (cellWidth + wallWidth) + wallWidth],
			[y * (cellHeight + wallWidth), (x+0.5) * (cellWidth + wallWidth) + wallWidth]];
	}
}

// returns segments formed by points
function convertToSeg(points) {
	var segments = [];
	for (var i = 0; i < points.length - 1; i++) {
		segments.push([points[i], points[i+1]]);
	}
	segments.push([points[points.length-1], points[0]]);
	return segments;
}

// returns cell containing point with boundaries defined by the middle of the wall
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

// return transformation that needs to be applied to tank
function shiftPoints(segments, points, dy, dx) {
	// get final transformation by finding maximum transformation necessary
	var transform = [0, 0], point, dist, tempDist;

	// given a wall, take every point on tank and line on wall and find minimum translation of point on tank such that the point is outside of the wall given direction [dy, dx]
	for (var j = 0; j < points.length; j++) {
		dist = [1000000*dy, 1000000*dx];
		// given a point, find the minimum translation in given direction [dy, dx] for point to be outside of wall
		for (var k = 0; k < segments.length; k++) {
			point = lineIntersection(points[j], [points[j][0] + dy, points[j][1] + dx], segments[k][0], segments[k][1]);
			if (point == null) {
				continue;
			}
			tempDist = [point[0] - points[j][0], point[1] - points[j][1]];
			if (point == null || !between(point, segments[k][0], segments[k][1])) {
				continue;
			}
			tempDist = [point[0] - points[j][0], point[1] - points[j][1]];
			//console.log('tempDist: ' + tempDist);
			if (vecRatio(tempDist, [dy, dx]) <= vecRatio(dist, [dy, dx]) && vecRatio(tempDist, [dy, dx]) >= 0) {
				dist = tempDist;
			}
		}
		//console.log('dist: ' + dist);
		if (dotProduct(dist, dist) > dotProduct(transform, transform) && validMove(dist)) {
			transform = dist;
		}
	}
	if (Math.abs(transform[0]) < c0) {
		transform[0] = 0;
	}
	if (Math.abs(transform[1]) < c0) {
		transform[1] = 0;
	}
	return transform;
}

function shiftTank(user, dya, dxa) { //dya and dxa are temporary values that may be removed
	// variables used to compute location of points on rectangle
	var vAngle = Math.atan(users[user].width / users[user].height);
	var vDist = Math.sqrt(users[user].width * users[user].width + users[user].height * users[user].height) / 2;
	// points on tank for checking collision (in the form (y, x))
	var points = [[Math.sin(users[user].angle + vAngle) * vDist + users[user].y, Math.cos(users[user].angle + vAngle) * vDist + users[user].x],
		[Math.sin(users[user].angle - vAngle + Math.PI) * vDist + users[user].y, Math.cos(users[user].angle - vAngle + Math.PI) * vDist + users[user].x],
		[Math.sin(users[user].angle + vAngle + Math.PI) * vDist + users[user].y, Math.cos(users[user].angle + vAngle + Math.PI) * vDist + users[user].x],
		[Math.sin(users[user].angle - vAngle) * vDist + users[user].y, Math.cos(users[user].angle - vAngle) * vDist + users[user].x]];

	// min/max x/y values to find bounding box around tank
	var minX = 1000000, maxX = -1000000, minY = 1000000, maxY = -1000000;
	for (var i = 0; i < points.length; i++) {
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
	}

	// get all walls that could overlap tank
	var lWall = Math.ceil((minX - wallWidth) / (cellWidth + wallWidth)) - 0.5;
	var rWall = Math.floor(maxX / (cellWidth + wallWidth)) - 0.5;
	var dWall = Math.ceil((minY - wallWidth) / (cellHeight + wallWidth)) - 0.5;
	var uWall = Math.floor(maxY / (cellHeight + wallWidth)) - 0.5;
	var walls = [];
	for (var i = lWall; i <= rWall; i++) {
		for (var j = dWall - 0.5; j <= uWall + 0.5; j++) {
			if (isWall(j, i)) {
				walls.push([j, i]);
			}
		}
	}
	for (var i = dWall; i <= uWall; i++) {
		for (var j = lWall - 0.5; j <= rWall + 0.5; j++) {
			if (isWall(i, j)) {
				walls.push([i, j]);
			}
		}
	}

	var finalTransform = [0, 0], transform, dy, dx, wpoints, segments, cell = getCell([users[user].y, users[user].x]), direction;

	for (var i = 0; i < walls.length; i++) {
		if (dxa == 1000000 && dya == 1000000) {
			dy = cell[0] - walls[i][0];
			dx = cell[1] - walls[i][1];
		}
		else {
			dy = dya;
			dx = dxa;
		}
		wpoints = wallPoints(walls[i][0], walls[i][1]);
		direction = [(wpoints[0][0] + wpoints[2][0]) / 2 - users[user].y, (wpoints[0][1] + wpoints[2][1]) / 2 - users[user].x];
		if (dotProduct(direction, [dy, dx]) > c0) {
			continue;
		}
		segments = convertToSeg(wpoints);
		transform = shiftPoints(segments, points, dy, dx);
		//console.log('transform normal: ' + transform);
		if (dotProduct(transform, transform) > dotProduct(finalTransform, finalTransform) && validMove(transform)) {
			finalTransform = transform;
		}
		transform = shiftPoints(convertToSeg(points), wpoints, -dy, -dx);
		transform = [-transform[0], -transform[1]];
		//console.log('transform opposite: ' + transform);
		if (dotProduct(transform, transform) > dotProduct(finalTransform, finalTransform) && validMove(transform)) {
			finalTransform = transform;
		}
	}
	//console.log('finalTransform: ' + finalTransform);
	return finalTransform;
}

function updateTankRotation(user) {
	if (users[user].left) {
		users[user].angle -= rotSpeed;
	}
	else if (users[user].right) {
		users[user].angle += rotSpeed;
	}
	else {
		return;
	}
	var t = shiftTank(user, 1000000, 1000000);
	users[user].y += t[0];
	users[user].x += t[1];
	t = shiftTank(user, 1000000, 1000000);
	users[user].y += t[0];
	users[user].x += t[1];
}

function updateTankMovement(user) {
	var dy, dx;
	if (users[user].up) {
		users[user].x += Math.cos(users[user].angle) * speed;
		users[user].y += Math.sin(users[user].angle) * speed;
		dx = -Math.cos(users[user].angle);
		dy = -Math.sin(users[user].angle);
	}
	else if (users[user].down) {
		users[user].x -= Math.cos(users[user].angle) * speed;
		users[user].y -= Math.sin(users[user].angle) * speed;
		dx = Math.cos(users[user].angle);
		dy = Math.sin(users[user].angle);
	}
	else {
		return;
	}
	var t = shiftTank(user, dy, dx);
	users[user].y += t[0];
	users[user].x += t[1];
	t = shiftTank(user, 1000000, 1000000);
	users[user].y += t[0];
	users[user].x += t[1];
}

function updateTank(user) {
	updateTankRotation(user);
	updateTankMovement(user);
}

function createBullet(user) {
	if (users[user].bullets.length >= maxBullets) {
		return;
	}
	users[user].bullets.push({'y': users[user].y + (-bulletRadius + users[user].height / 2) * Math.sin(users[user].angle),
		'x': users[user].x + (-bulletRadius + users[user].height / 2) * Math.cos(users[user].angle),
		'angle': users[user].angle,
		'speed': bulletSpeed,
		'radius': bulletRadius});
}

function createExplosion(user) {
	explosions.push([{x: users[user].x, y: users[user].y, radius: 30, color: 'red'}]);
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

	socket.on('shoot', function() {
		createBullet(socket.id);
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