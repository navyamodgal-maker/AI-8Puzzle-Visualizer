function getNeighbours(state) {
  const blank = state.indexOf("0");
  const row = Math.floor(blank / 3);
  const col = blank % 3;
  const moves = [
    [-1, 0],
    [1, 0],
    [0, -1],
    [0, 1],
  ];
  const neighbours = [];

  for (const [dRow, dCol] of moves) {
    const newRow = row + dRow;
    const newCol = col + dCol;
    if (newRow < 0 || newRow > 2 || newCol < 0 || newCol > 2) {
      continue;
    }

    const tilePos = newRow * 3 + newCol;
    const tiles = state.split("");
    tiles[blank] = tiles[tilePos];
    tiles[tilePos] = "0";
    neighbours.push(tiles.join(""));
  }
  return neighbours;
}

function misplacedTiles(state, goal) {
  let count = 0;
  for (let i = 0; i < 9; i++) {
    if (state[i] !== "0" && state[i] !== goal[i]) {
      count++;
    }
  }
  return count;
}

function manhattanDistance(state, goal) {
  let total = 0;
  for (let i = 0; i < 9; i++) {
    if (state[i] === "0") {
      continue;
    }
    const goalPos = goal.indexOf(state[i]);
    const rowDiff = Math.abs(Math.floor(i / 3) - Math.floor(goalPos / 3));
    const colDiff = Math.abs((i % 3) - (goalPos % 3));
    total += rowDiff + colDiff;
  }
  return total;
}

const HEURISTICS = { manhattan: manhattanDistance, misplaced: misplacedTiles };

function inversionParity(state) {
  const tiles = state.split("").filter((t) => t !== "0");
  let inversions = 0;
  for (let i = 0; i < tiles.length; i++) {
    for (let j = i + 1; j < tiles.length; j++) {
      if (tiles[i] > tiles[j]) {
        inversions++;
      }
    }
  }
  return inversions % 2;
}

function isSolvable(start, goal) {
  return inversionParity(start) === inversionParity(goal);
}
