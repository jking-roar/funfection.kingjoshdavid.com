const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const scoreEl = document.getElementById('score');
const statusEl = document.getElementById('status');
const restartButton = document.getElementById('restart');
const moveButtons = document.querySelectorAll('[data-move]');

const tile = 40;
const cols = Math.floor(canvas.width / tile);
const rows = Math.floor(canvas.height / tile);
const start = { x: 1, y: 1 };
let grid, player, viruses, firewalls, score, tick;

function randomFreeCell() {
  let cell;
  do {
    cell = {
      x: Math.floor(Math.random() * (cols - 2)) + 1,
      y: Math.floor(Math.random() * (rows - 2)) + 1,
    };
  } while (grid[cell.y][cell.x] || (cell.x === start.x && cell.y === start.y));
  return cell;
}

function generateWorld() {
  grid = Array.from({ length: rows }, (_, y) =>
    Array.from({ length: cols }, (_, x) => x === 0 || y === 0 || x === cols - 1 || y === rows - 1),
  );
  for (let y = 1; y < rows - 1; y++) {
    for (let x = 1; x < cols - 1; x++) {
      if ((x === start.x && y === start.y) || (x === 2 && y === 1) || (x === 1 && y === 2))
        continue;
      grid[y][x] = Math.random() < 0.18;
    }
  }
  player = { ...start };
  viruses = Array.from({ length: 10 }, randomFreeCell);
  firewalls = Array.from({ length: 5 }, () => ({
    ...randomFreeCell(),
    dir: Math.random() < 0.5 ? 1 : -1,
    axis: Math.random() < 0.5 ? 'x' : 'y',
  }));
  score = 0;
  tick = 0;
  updateHud('Fresh grid generated.');
  draw();
}

function updateHud(message) {
  scoreEl.textContent = score;
  statusEl.textContent = message;
}

function movePlayer(dx, dy) {
  const next = { x: player.x + dx, y: player.y + dy };
  if (grid[next.y]?.[next.x]) {
    updateHud('Wall blocked your route.');
    return;
  }
  player = next;
  const virusIndex = viruses.findIndex((v) => v.x === player.x && v.y === player.y);
  if (virusIndex >= 0) {
    viruses.splice(virusIndex, 1);
    score += 10;
    updateHud(
      viruses.length
        ? `${viruses.length} viruses remain.`
        : 'Network cleaned! Generate another world.',
    );
  }
  checkFirewallCollision();
  draw();
}

function moveFirewalls() {
  tick++;
  if (tick % 12 !== 0) return;
  for (const firewall of firewalls) {
    const nx = firewall.x + (firewall.axis === 'x' ? firewall.dir : 0);
    const ny = firewall.y + (firewall.axis === 'y' ? firewall.dir : 0);
    if (grid[ny]?.[nx]) {
      firewall.dir *= -1;
    } else {
      firewall.x = nx;
      firewall.y = ny;
    }
  }
  checkFirewallCollision();
  draw();
}

function checkFirewallCollision() {
  if (firewalls.some((f) => f.x === player.x && f.y === player.y)) {
    player = { ...start };
    score = Math.max(0, score - 1);
    updateHud('Firewall hit! Back to start.');
  }
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      ctx.fillStyle = (x + y) % 2 ? '#0b1b30' : '#0d2038';
      ctx.fillRect(x * tile, y * tile, tile, tile);
      if (grid[y][x]) {
        ctx.fillStyle = '#23324b';
        ctx.fillRect(x * tile + 4, y * tile + 4, tile - 8, tile - 8);
        ctx.strokeStyle = '#53657f';
        ctx.strokeRect(x * tile + 8, y * tile + 8, tile - 16, tile - 16);
      }
    }
  }
  for (const virus of viruses) {
    ctx.fillStyle = '#5dff9d';
    ctx.beginPath();
    ctx.arc(virus.x * tile + 20, virus.y * tile + 20, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#15351f';
    ctx.fillRect(virus.x * tile + 16, virus.y * tile + 13, 4, 4);
    ctx.fillRect(virus.x * tile + 23, virus.y * tile + 21, 4, 4);
  }
  for (const firewall of firewalls) {
    ctx.fillStyle = '#ff5868';
    ctx.fillRect(firewall.x * tile + 7, firewall.y * tile + 7, tile - 14, tile - 14);
    ctx.fillStyle = '#ffb454';
    ctx.fillRect(firewall.x * tile + 13, firewall.y * tile + 13, tile - 26, tile - 26);
  }
  ctx.fillStyle = '#63e6ff';
  ctx.beginPath();
  ctx.arc(player.x * tile + 20, player.y * tile + 20, 14, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#07111f';
  ctx.fillRect(player.x * tile + 15, player.y * tile + 15, 5, 5);
  ctx.fillRect(player.x * tile + 23, player.y * tile + 15, 5, 5);
}

const keyMoves = { ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0] };
let touchStart = null;

window.addEventListener('keydown', (event) => {
  if (!keyMoves[event.key]) return;
  event.preventDefault();
  movePlayer(...keyMoves[event.key]);
});

moveButtons.forEach((button) => {
  button.addEventListener('click', () => {
    const move = button.dataset.move.split(',').map(Number);
    movePlayer(...move);
  });
});

canvas.addEventListener('pointerdown', (event) => {
  touchStart = { x: event.clientX, y: event.clientY };
  canvas.setPointerCapture(event.pointerId);
});

canvas.addEventListener('pointerup', (event) => {
  if (!touchStart) return;
  const dx = event.clientX - touchStart.x;
  const dy = event.clientY - touchStart.y;
  touchStart = null;
  if (Math.max(Math.abs(dx), Math.abs(dy)) < 24) return;
  if (Math.abs(dx) > Math.abs(dy)) {
    movePlayer(dx > 0 ? 1 : -1, 0);
  } else {
    movePlayer(0, dy > 0 ? 1 : -1);
  }
});

canvas.addEventListener('pointercancel', () => {
  touchStart = null;
});

restartButton.addEventListener('click', generateWorld);
generateWorld();
setInterval(moveFirewalls, 90);
