const canvas = document.getElementById('game');
const mirrorCanvas = document.getElementById('mirror');
const nextCanvas = document.getElementById('next');
const nextCanvas2 = document.getElementById('next2');

if (!canvas || !nextCanvas || !nextCanvas2) {
  throw new Error('Missing required game canvas elements.');
}

const context = canvas.getContext('2d');
const mirrorContext = mirrorCanvas ? mirrorCanvas.getContext('2d') : null;
const nextContext = nextCanvas.getContext('2d');
const nextContext2 = nextCanvas2.getContext('2d');

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

let playerA;
let playerB;
let lastTime = 0;

function createMatrix(width, height) {
  return Array.from({ length: height }, () => Array(width).fill(EMPTY));
}

function cloneMatrix(matrix) {
  return matrix.map((row) => [...row]);
}

function randomPiece() {
  const types = Object.keys(SHAPES);
  const type = types[Math.floor(Math.random() * types.length)];
  return {
    type,
    matrix: cloneMatrix(SHAPES[type]),
    x: Math.floor((COLS - SHAPES[type][0].length) / 2),
    y: -1
  };
}

function createPlayerState() {
  return {
    board: createMatrix(COLS, ROWS),
    currentPiece: null,
    nextPiece: randomPiece(),
    score: 0,
    lines: 0,
    level: 1,
    dropInterval: 700,
    dropCounter: 0,
    running: false
  };
}

function resetGame() {
  playerA = createPlayerState();
  playerB = createPlayerState();

  playerA.running = true;
  playerB.running = true;
  spawnPiece(playerA);
  spawnPiece(playerB);
  updateHud();
  drawNextPiece();
}

function spawnPiece(player) {
  player.currentPiece = player.nextPiece;
  player.currentPiece.x = Math.floor((COLS - player.currentPiece.matrix[0].length) / 2);
  player.currentPiece.y = -1;
  player.nextPiece = randomPiece();
  if (collides(player.board, player.currentPiece, player.currentPiece.x, player.currentPiece.y)) {
    player.running = false;
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

function mergeBoard(player) {
  player.currentPiece.matrix.forEach((row, y) => {
    row.forEach((value, x) => {
      if (value) {
        const boardY = y + player.currentPiece.y;
        const boardX = x + player.currentPiece.x;
        if (boardY >= 0) {
          player.board[boardY][boardX] = player.currentPiece.type;
        }
      }
    });
  });
}

function clearLines(player) {
  let cleared = 0;

  for (let y = ROWS - 1; y >= 0; y -= 1) {
    if (player.board[y].every((cell) => cell !== EMPTY)) {
      player.board.splice(y, 1);
      player.board.unshift(Array(COLS).fill(EMPTY));
      cleared += 1;
      y += 1;
    }
  }

  if (cleared > 0) {
    player.lines += cleared;
    player.score += [0, 100, 300, 500, 800][cleared] * player.level;
    player.level = Math.floor(player.lines / 10) + 1;
    player.dropInterval = Math.max(120, 700 - (player.level - 1) * 60);
    updateHud();
  }
}

function rotateMatrix(matrix) {
  return matrix[0].map((_, columnIndex) =>
    matrix.map((row) => row[columnIndex]).reverse()
  );
}

function rotatePiece(player) {
  if (!player.running) return;

  const rotated = rotateMatrix(player.currentPiece.matrix);
  const nextX = player.currentPiece.x;
  const nextY = player.currentPiece.y;

  if (!collides(player.board, { ...player.currentPiece, matrix: rotated }, nextX, nextY)) {
    player.currentPiece.matrix = rotated;
    return;
  }

  const kicks = [1, -1, 2, -2];
  for (const offset of kicks) {
    if (!collides(player.board, { ...player.currentPiece, matrix: rotated }, nextX + offset, nextY)) {
      player.currentPiece.x += offset;
      player.currentPiece.matrix = rotated;
      return;
    }
  }
}

function movePiece(player, dx, dy) {
  if (!player.running) return false;

  if (!collides(player.board, player.currentPiece, player.currentPiece.x + dx, player.currentPiece.y + dy)) {
    player.currentPiece.x += dx;
    player.currentPiece.y += dy;
    return true;
  }

  if (dy > 0) {
    lockPiece(player);
  }

  return false;
}

function lockPiece(player) {
  mergeBoard(player);
  clearLines(player);
  spawnPiece(player);
  if (!player.running && player === playerA) {
    updateHud();
  }
}

function hardDrop(player) {
  if (!player.running) return;
  while (movePiece(player, 0, 1)) {
    player.score += 2;
  }
  updateHud();
}

function updateHud() {
  scoreEl.textContent = String(playerA.score);
  linesEl.textContent = String(playerA.lines);
  levelEl.textContent = String(playerA.level);
}

function drawCell(x, y, color, targetContext) {
  targetContext.fillStyle = color;
  targetContext.fillRect(x * BLOCK_SIZE, y * BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);
  targetContext.strokeStyle = 'rgba(15, 23, 42, 0.8)';
  targetContext.lineWidth = 1;
  targetContext.strokeRect(x * BLOCK_SIZE, y * BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);
}

function drawBoard(player, targetContext, mirrored = false) {
  targetContext.clearRect(0, 0, targetContext.canvas.width, targetContext.canvas.height);

  for (let y = 0; y < ROWS; y += 1) {
    for (let x = 0; x < COLS; x += 1) {
      const value = player.board[y][x];
      const drawX = mirrored ? COLS - 1 - x : x;

      if (value !== EMPTY) {
        drawCell(drawX, y, COLORS[value], targetContext);
      } else {
        targetContext.strokeStyle = 'rgba(148, 163, 184, 0.12)';
        targetContext.strokeRect(drawX * BLOCK_SIZE, y * BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);
      }
    }
  }

  if (player.currentPiece) {
    player.currentPiece.matrix.forEach((row, y) => {
      row.forEach((value, x) => {
        if (!value) return;

        const drawY = player.currentPiece.y + y;
        const drawX = mirrored ? COLS - 1 - (player.currentPiece.x + x) : player.currentPiece.x + x;
        if (drawY >= 0) {
          drawCell(drawX, drawY, COLORS[player.currentPiece.type], targetContext);
        }
      });
    });
  }
}

function drawSinglePreview(canvasRef, contextRef, piece) {
  contextRef.clearRect(0, 0, canvasRef.width, canvasRef.height);
  if (!piece) return;

  const matrix = piece.matrix;
  const offsetX = Math.floor((canvasRef.width / BLOCK_SIZE - matrix[0].length) / 2);
  const offsetY = Math.floor((canvasRef.height / BLOCK_SIZE - matrix.length) / 2);

  matrix.forEach((row, y) => {
    row.forEach((value, x) => {
      if (value) {
        drawCell(offsetX + x, offsetY + y, COLORS[piece.type], contextRef);
      }
    });
  });
}

function drawNextPiece() {
  if (playerA && playerA.nextPiece) {
    drawSinglePreview(nextCanvas, nextContext, playerA.nextPiece);
  }

  if (playerB && playerB.nextPiece) {
    drawSinglePreview(nextCanvas2, nextContext2, playerB.nextPiece);
  }
}

function updateWorld(delta) {
  if (playerA && playerA.running) {
    playerA.dropCounter += delta;
    if (playerA.dropCounter > playerA.dropInterval) {
      movePiece(playerA, 0, 1);
      playerA.dropCounter = 0;
    }
  }

  if (playerB && playerB.running) {
    playerB.dropCounter += delta;
    if (playerB.dropCounter > playerB.dropInterval) {
      movePiece(playerB, 0, 1);
      playerB.dropCounter = 0;
    }
  }
}

function tick(time = 0) {
  const delta = time - lastTime;
  lastTime = time;

  updateWorld(delta);
  drawBoard(playerA, context, false);
  if (mirrorContext && playerB) {
    drawBoard(playerB, mirrorContext, true);
  }
  requestAnimationFrame(tick);
}

function handleKeydown(event) {
  const code = event.code;

  if (code === 'KeyA' || code === 'KeyD' || code === 'KeyW' || code === 'KeyS' || code === 'ControlLeft' || code === 'ControlRight') {
    if (!playerA || !playerA.running) {
      if (code === 'KeyW' || code === 'KeyS' || code === 'ControlLeft' || code === 'ControlRight') {
        resetGame();
      }
      return;
    }

    switch (code) {
      case 'KeyA':
        movePiece(playerA, -1, 0);
        break;
      case 'KeyD':
        movePiece(playerA, 1, 0);
        break;
      case 'KeyW':
        rotatePiece(playerA);
        break;
      case 'KeyS':
        if (movePiece(playerA, 0, 1)) {
          playerA.score += 1;
        }
        updateHud();
        break;
      case 'ControlLeft':
      case 'ControlRight':
        hardDrop(playerA);
        break;
      default:
        break;
    }
    return;
  }

  if (code === 'ArrowLeft' || code === 'ArrowRight' || code === 'ArrowUp' || code === 'ArrowDown' || code === 'Space') {
    if (!playerB || !playerB.running) {
      if (code === 'ArrowUp' || code === 'Space') {
        resetGame();
      }
      return;
    }

    switch (code) {
      case 'ArrowLeft':
        movePiece(playerB, 1, 0);
        break;
      case 'ArrowRight':
        movePiece(playerB, -1, 0);
        break;
      case 'ArrowDown':
        if (movePiece(playerB, 0, 1)) {
          playerB.score += 1;
        }
        updateHud();
        break;
      case 'ArrowUp':
        rotatePiece(playerB);
        break;
      case 'Space':
        hardDrop(playerB);
        break;
      default:
        break;
    }
  }
}

document.addEventListener('keydown', handleKeydown);
restartBtn.addEventListener('click', resetGame);

resetGame();
requestAnimationFrame(tick);
