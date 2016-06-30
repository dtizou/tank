

var Cell = function(i, j) {
	this.i = i;
	this.j = j;
	this.left = true;
	this.right = true;
	this.top = true;
	this.bottom = true;
	this.visited = false;
};

module.exports = {
	generateMaze: function(rows, cols) {
		var maze = [], stack = [], curCell, nextCell, cellList, i, j;
		for (i = 0; i < rows; i++) {
			maze[i] = [];
			for (j = 0; j < cols; j++) {
				maze[i][j] = new Cell(i, j);
			}
		}
		i = Math.floor(Math.random() * rows);
		j = Math.floor(Math.random() * cols);
		stack.push([i, j]);
		maze[i][j].visited = true;
		for (i = 0; i < rows * cols - 1; i++) {
			curCell = stack[stack.length - 1];
			while ((cellList = this.validCells(maze, rows, cols, curCell[0], curCell[1])).length == 0) {
				stack.pop();
				curCell = stack[stack.length - 1];
			}
			nextCell = cellList[Math.floor(Math.random() * cellList.length)];
			if (curCell[0] + 1 == nextCell[0]) {
				maze[curCell[0]][curCell[1]].bottom = false;
				maze[nextCell[0]][nextCell[1]].top = false;
			}
			else if (curCell[0] - 1 == nextCell[0]) {
				maze[curCell[0]][curCell[1]].top = false;
				maze[nextCell[0]][nextCell[1]].bottom = false;
			}
			else if (curCell[1] + 1 == nextCell[1]) {
				maze[curCell[0]][curCell[1]].right = false;
				maze[nextCell[0]][nextCell[1]].left = false;
			}
			else if (curCell[1] - 1 == nextCell[1]) {
				maze[curCell[0]][curCell[1]].left = false;
				maze[nextCell[0]][nextCell[1]].right = false;
			}
			maze[nextCell[0]][nextCell[1]].visited = true;
			stack.push(nextCell);
		}

		return {maze: maze, rows: rows, cols: cols};
	},

	validCells: function(maze, rows, cols, x, y) {
		var cells = [];
		if (y >= 1 && !maze[x][y-1].visited) {
			cells.push([x, y-1]);
		}
		if (y < cols-1 && !maze[x][y+1].visited) {
			cells.push([x, y+1]);
		}
		if (x >= 1 && !maze[x-1][y].visited) {
			cells.push([x-1, y]);
		}
		if (x < rows-1 && !maze[x+1][y].visited) {
			cells.push([x+1, y]);
		}
		return cells;
	}
};