

var stack;

var Cell = function(i, j) {
	this.i = i;
	this.j = j;
	this.left = true;
	this.right = true;
	this.top = true;
	this.bottom = true;
};

module.exports = {

	generateMaze: function(rows, cols) {
		var maze = [], i, j;
		for (i = 0; i < rows; i++) {
			maze[i] = [];
			for (j = 0; j < cols; j++) {
				maze[i][j] = new Cell(i, j);
			}
		}

		return {maze: maze, rows: rows, cols: cols};
	}
};