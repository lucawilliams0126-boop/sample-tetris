const canvas = document.getElementById('game');
const context = canvas.getContext('2d');
const nextCanvas = document.getElementById('next');
const nextContext = nextCanvas.getContext('2d');

const scoreEl = document.getElementById('score');
const linesEl = document.getElementById('lines');
const levelEl = document.getElementById('level');
const restartBtn = document.getElementById('restartBtn');

const COLS = 10;
const ROWS = 20;
const BLOCK_SIZE = 30;
const EMPTY = 0;

const COLORS = {
  I: '#22d3ee',
  J: '#60a5fa',
  L: '#f59e0b',
  O: '#facc15',
  S: '#4ade80',
  T: '#c084fc',
  Z: '#f87171'
};

const SHAPES = { 
  I: [[1, 1, 1, 1]],
  J: [[1, 0, 0], [1, 1, 1]],
  L: [[0, 0, 1], [1, 1, 1]],
  O: [[1, 1], [1, 1]],
  S: [[0, 1, 1], [1, 1, 0]],
  T: [[0, 1, 0], [1, 1, 1]],
  Z: [[1, 1, 0], [0, 1, 1]]
};

let board;
let currentPiece;
let nextPiece;
let score;
let lines;
let level;
let dropInterval;
let lastTime;
let dropCounter;
let running = false;

function createMatrix(width, height) {
  return Array.from({ length: height }, () => Array(width).fill(EMPTY));
}

function cloneMatrix(matrix) {
  return matrix.map((row) => [...row]);
}

function randomPiece() {
  const types = Object.keys(SHAPES);
  const type = types[Math.floor(Math.random() * types.length)];
  const matrix = cloneMatrix(SHAPES[type]);
  return {
    type,
    matrix,
    x: Math.floor((COLS - matrix[0].length) / 2),
    y: -1
  };
}

function resetGame() {
  board = createMatrix(COLS, ROWS);
  nextPiece = randomPiece();
  score = 0;
  lines = 0;
  level = 1;
  dropInterval = 700;
  lastTime = 0;
  dropCounter = 0;
  currentPiece = null;
  setPiece();
  updateHud();
  running = true;
}

function setPiece() {
  currentPiece = nextPiece;
  currentPiece.x = Math.floor((COLS - currentPiece.matrix[0].length) / 2);
  currentPiece.y = -1;
  nextPiece = randomPiece();
  if (collides(board, currentPiece, currentPiece.x, currentPiece.y)) {
    endGame();
  }
  drawNextPiece();
}

function collides(boardState, piece, offsetX, offsetY) {
  for (let y = 0; y < piece.matrix.length; y += 1) {
    for (let x = 0; x < piece.matrix[y].length; x += 1) {
      if (!piece.matrix[y][x]) continue;

      const boardX = x + offsetX;
      const boardY = y + offsetY;

      if (boardX < 0 || boardX >= COLS || boardY >= ROWS) {
        return true;
      }

      if (boardY >= 0 && boardState[boardY][boardX] !== EMPTY) {
        return true;
      }
    }
  }

  return false;
}

function mergeBoard() {
  currentPiece.matrix.forEach((row, y) => {
    row.forEach((value, x) => {
      if (value) {
        const boardY = y + currentPiece.y;
        const boardX = x + currentPiece.x;
        if (boardY >= 0) {
          board[boardY][boardX] = currentPiece.type;
        }
      }
    });
  });
}

function clearLines() {
  let cleared = 0;

  for (let y = ROWS - 1; y >= 0; y -= 1) {
    if (board[y].every((cell) => cell !== EMPTY)) {
      board.splice(y, 1);
      board.unshift(Array(COLS).fill(EMPTY));
      cleared += 1;
      y += 1;
    }
  }

  if (cleared > 0) {
    lines += cleared;
    score += [0, 100, 300, 500, 800][cleared] * level;
    level = Math.floor(lines / 10) + 1;
    dropInterval = Math.max(120, 700 - (level - 1) * 60);
    updateHud();
  }
}

function rotateMatrix(matrix) {
  return matrix[0].map((_, columnIndex) =>
    matrix.map((row) => row[columnIndex]).reverse()
  );
}

function rotatePiece() {
  if (!running) return;

  const rotated = rotateMatrix(currentPiece.matrix);
  const nextX = currentPiece.x;
  const nextY = currentPiece.y;

  if (!collides(board, { ...currentPiece, matrix: rotated }, nextX, nextY)) {
    currentPiece.matrix = rotated;
  } else {
    const kicks = [1, -1, 2, -2];
    for (const offset of kicks) {
      if (!collides(board, { ...currentPiece, matrix: rotated }, nextX + offset, nextY)) {
        currentPiece.x += offset;
        currentPiece.matrix = rotated;
        return;
      }
    }
  }
}

function movePiece(dx, dy) {
  if (!running) return false;

  if (!collides(board, currentPiece, currentPiece.x + dx, currentPiece.y + dy)) {
    currentPiece.x += dx;
    currentPiece.y += dy;
    return true;
  }

  if (dy > 0) {
    lockPiece();
  }

  return false;
}

function lockPiece() {
  mergeBoard();
  clearLines();
  setPiece();
}

function hardDrop() {
  if (!running) return;

  while (movePiece(0, 1)) {
    score += 2;
  }
  updateHud();
}

function updateHud() {
  scoreEl.textContent = String(score);
  linesEl.textContent = String(lines);
  levelEl.textContent = String(level);
}

function drawCell(x, y, color, contextRef = context) {
  contextRef.fillStyle = color;
  contextRef.fillRect(x * BLOCK_SIZE, y * BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);
  contextRef.strokeStyle = 'rgba(15, 23, 42, 0.8)';
  contextRef.lineWidth = 1;
  contextRef.strokeRect(x * BLOCK_SIZE, y * BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);
}

function drawBoard() {
  context.clearRect(0, 0, canvas.width, canvas.height);

  for (let y = 0; y < ROWS; y += 1) {
    for (let x = 0; x < COLS; x += 1) {
      const value = board[y][x];
      if (value !== EMPTY) {
        drawCell(x, y, COLORS[value]);
      } else {
        context.strokeStyle = 'rgba(148, 163, 184, 0.12)';
        context.strokeRect(x * BLOCK_SIZE, y * BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);
      }
    }
  }

  if (currentPiece) {
    currentPiece.matrix.forEach((row, y) => {
      row.forEach((value, x) => {
        if (value) {
          const drawY = currentPiece.y + y;
          const drawX = currentPiece.x + x;
          if (drawY >= 0) {
            drawCell(drawX, drawY, COLORS[currentPiece.type]);
          }
        }
      });
    });
  }
}

function drawNextPiece() {
  nextContext.clearRect(0, 0, nextCanvas.width, nextCanvas.height);

  const matrix = nextPiece.matrix;
  const offsetX = Math.floor((nextCanvas.width / BLOCK_SIZE - matrix[0].length) / 2);
  const offsetY = Math.floor((nextCanvas.height / BLOCK_SIZE - matrix.length) / 2);

  matrix.forEach((row, y) => {
    row.forEach((value, x) => {
      if (value) {
        drawCell(
          offsetX + x,
          offsetY + y,
          COLORS[nextPiece.type],
          nextContext
        );
      }
    });
  });
}

function endGame() {
  running = false;
  context.fillStyle = 'rgba(11, 16, 32, 0.7)';
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = '#e2e8f0';
  context.font = 'bold 28px Arial';
  context.textAlign = 'center';
  context.fillText('Game Over', canvas.width / 2, canvas.height / 2);
}

function tick(time = 0) {
  const delta = time - lastTime;
  lastTime = time;

  if (running) {
    dropCounter += delta;
    if (dropCounter > dropInterval) {
      movePiece(0, 1);
      dropCounter = 0;
    }
  }

  drawBoard();
  requestAnimationFrame(tick);
}

function handleKeydown(event) {
  if (!running) {
    if (event.code === 'Space' || event.code === 'ArrowUp') {
      resetGame();
    }
    return;
  }

  switch (event.code) {
    case 'ArrowLeft':
      movePiece(-1, 0);
      break;
    case 'ArrowRight':
      movePiece(1, 0);
      break;
    case 'ArrowDown':
      if (movePiece(0, 1)) {
        score += 1;
        updateHud();
      }
      break;
    case 'ArrowUp':
      rotatePiece();
      break;
    case 'Space':
      hardDrop();
      break;
    default:
      break;
  }
}

document.addEventListener('keydown', handleKeydown);
restartBtn.addEventListener('click', resetGame);

resetGame();
requestAnimationFrame(tick);
