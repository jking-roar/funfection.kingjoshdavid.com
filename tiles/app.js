const editorCanvas = document.getElementById('editorCanvas');
const tileSizeInput = document.getElementById('tileSize');
const repeatCountInput = document.getElementById('repeatCount');
const mirrorModeInput = document.getElementById('mirrorMode');
const topologyModeInput = document.getElementById('topologyMode');
const paletteElement = document.getElementById('palette');
const customColorInput = document.getElementById('customColor');
const addColorButton = document.getElementById('addColor');
const clearAllButton = document.getElementById('clearAll');
const previewGrid = document.getElementById('previewGrid');
const sizeLabel = document.getElementById('sizeLabel');
const repeatLabel = document.getElementById('repeatLabel');

const transparent = '';
const defaultPalette = [
  '#111827',
  '#ffffff',
  '#ef4444',
  '#f97316',
  '#facc15',
  '#22c55e',
  '#14b8a6',
  '#38bdf8',
  '#2563eb',
  '#7c3aed',
  '#ec4899',
  '#8b5e34',
];

let tileSize = Number(tileSizeInput.value);
let repeatCount = Number(repeatCountInput.value);
let selectedColor = defaultPalette[0];
let palette = [...defaultPalette];
let grid = createGrid(tileSize);
let isDrawing = false;
let renderScheduled = false;

function scheduleRender() {
  if (!renderScheduled) {
    renderScheduled = true;
    requestAnimationFrame(() => {
      renderScheduled = false;
      render();
    });
  }
}

function createGrid(size) {
  return Array.from({ length: size }, () => Array.from({ length: size }, () => transparent));
}

function clampNumber(value, min, max, fallback) {
  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed)) return fallback;
  return Math.max(min, Math.min(max, parsed));
}

function resizeGrid(nextSize) {
  const nextGrid = createGrid(nextSize);
  const copiedSize = Math.min(tileSize, nextSize);
  for (let y = 0; y < copiedSize; y += 1) {
    for (let x = 0; x < copiedSize; x += 1) {
      nextGrid[y][x] = grid[y][x];
    }
  }
  tileSize = nextSize;
  grid = nextGrid;
  tileSizeInput.value = String(tileSize);
  render();
}

function getMirroredCells(x, y) {
  const max = tileSize - 1;
  const cells = [[x, y]];
  const mirrorMode = mirrorModeInput.value;

  if (mirrorMode === 'horizontal' || mirrorMode === 'both') {
    cells.push([max - x, y]);
  }
  if (mirrorMode === 'vertical' || mirrorMode === 'both') {
    cells.push([x, max - y]);
  }
  if (mirrorMode === 'both') {
    cells.push([max - x, max - y]);
  }

  return [
    ...new Map(cells.map(([cellX, cellY]) => [`${cellX},${cellY}`, [cellX, cellY]])).values(),
  ];
}

function paintCell(x, y) {
  getMirroredCells(x, y).forEach(([cellX, cellY]) => {
    grid[cellY][cellX] = selectedColor;
  });
  scheduleRender();
}

function getPointerCell(event) {
  const rect = editorCanvas.getBoundingClientRect();
  const x = Math.floor(((event.clientX - rect.left) / rect.width) * tileSize);
  const y = Math.floor(((event.clientY - rect.top) / rect.height) * tileSize);
  return {
    x: Math.max(0, Math.min(tileSize - 1, x)),
    y: Math.max(0, Math.min(tileSize - 1, y)),
  };
}

function drawTileToCanvas(canvas, options = {}) {
  const context = canvas.getContext('2d');
  const { flipX = false, flipY = false, showGrid = false } = options;
  const cellSize = canvas.width / tileSize;

  context.clearRect(0, 0, canvas.width, canvas.height);
  context.save();
  if (flipX || flipY) {
    context.translate(flipX ? canvas.width : 0, flipY ? canvas.height : 0);
    context.scale(flipX ? -1 : 1, flipY ? -1 : 1);
  }

  for (let y = 0; y < tileSize; y += 1) {
    for (let x = 0; x < tileSize; x += 1) {
      if (!grid[y][x]) continue;
      context.fillStyle = grid[y][x];
      context.fillRect(
        Math.round(x * cellSize),
        Math.round(y * cellSize),
        Math.ceil(cellSize),
        Math.ceil(cellSize),
      );
    }
  }
  context.restore();

  if (showGrid && tileSize <= 32) {
    context.strokeStyle = 'rgba(23, 32, 51, 0.16)';
    context.lineWidth = 1;
    for (let i = 0; i <= tileSize; i += 1) {
      const position = Math.round(i * cellSize) + 0.5;
      context.beginPath();
      context.moveTo(position, 0);
      context.lineTo(position, canvas.height);
      context.stroke();
      context.beginPath();
      context.moveTo(0, position);
      context.lineTo(canvas.width, position);
      context.stroke();
    }
  }
}

function getPreviewFlips(row, column) {
  const topology = topologyModeInput.value;
  return {
    flipX:
      topology === 'mobius-horizontal' || topology === 'mobius-both' ? column % 2 === 1 : false,
    flipY: topology === 'mobius-vertical' || topology === 'mobius-both' ? row % 2 === 1 : false,
  };
}

function renderPalette() {
  paletteElement.innerHTML = '';
  const tools = [
    { color: transparent, label: 'Eraser', eraser: true },
    ...palette.map((color) => ({ color, label: color })),
  ];

  tools.forEach((tool) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `swatch${tool.eraser ? ' eraser' : ''}${selectedColor === tool.color ? ' active' : ''}`;
    button.setAttribute('aria-label', tool.label);
    button.setAttribute('aria-pressed', selectedColor === tool.color ? 'true' : 'false');
    button.title = tool.label;
    if (!tool.eraser) button.style.background = tool.color;
    button.addEventListener('click', () => {
      selectedColor = tool.color;
      renderPalette();
    });
    paletteElement.appendChild(button);
  });
}

function renderPreview() {
  previewGrid.style.gridTemplateColumns = `repeat(${repeatCount}, 1fr)`;
  previewGrid.innerHTML = '';

  for (let row = 0; row < repeatCount; row += 1) {
    for (let column = 0; column < repeatCount; column += 1) {
      const tile = document.createElement('div');
      tile.className = 'preview-tile';
      const canvas = document.createElement('canvas');
      canvas.width = 256;
      canvas.height = 256;
      tile.appendChild(canvas);
      previewGrid.appendChild(tile);
      drawTileToCanvas(canvas, getPreviewFlips(row, column));
    }
  }
}

function render() {
  sizeLabel.textContent = `${tileSize} × ${tileSize}`;
  repeatLabel.textContent = `${repeatCount} × ${repeatCount} ${topologyModeInput.options[topologyModeInput.selectedIndex].text.split(':')[0].toLowerCase()}`;
  drawTileToCanvas(editorCanvas, { showGrid: true });
  renderPreview();
  renderPalette();
}

editorCanvas.addEventListener('pointerdown', (event) => {
  isDrawing = true;
  editorCanvas.setPointerCapture(event.pointerId);
  const { x, y } = getPointerCell(event);
  paintCell(x, y);
});

editorCanvas.addEventListener('pointermove', (event) => {
  if (!isDrawing) return;
  const { x, y } = getPointerCell(event);
  paintCell(x, y);
});

editorCanvas.addEventListener('pointerup', () => {
  isDrawing = false;
});
editorCanvas.addEventListener('pointercancel', () => {
  isDrawing = false;
});
editorCanvas.addEventListener('pointerleave', () => {
  isDrawing = false;
});

tileSizeInput.addEventListener('change', () => {
  resizeGrid(clampNumber(tileSizeInput.value, 4, 64, tileSize));
});

repeatCountInput.addEventListener('change', () => {
  repeatCount = clampNumber(repeatCountInput.value, 1, 9, repeatCount);
  repeatCountInput.value = String(repeatCount);
  render();
});

mirrorModeInput.addEventListener('change', render);
topologyModeInput.addEventListener('change', render);

addColorButton.addEventListener('click', () => {
  const color = customColorInput.value.toLowerCase();
  if (!palette.includes(color)) palette.push(color);
  selectedColor = color;
  renderPalette();
});

clearAllButton.addEventListener('click', () => {
  grid = createGrid(tileSize);
  render();
});

render();
