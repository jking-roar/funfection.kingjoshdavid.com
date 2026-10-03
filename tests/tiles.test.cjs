const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const html = fs.readFileSync(path.join(__dirname, '../tiles/index.html'), 'utf8');
const script = html.match(/<script>([\s\S]*?)<\/script>/)[1];

// Only the browser interfaces used by this page are simulated. Execute the
// shipped script unchanged; expectations below are independent of its helpers.
function page() {
  class Element {
    constructor(tag = 'div') {
      this.tag = tag;
      this.children = [];
      this.listeners = {};
      this.attributes = {};
      this.style = {};
      this.calls = [];
      this.context = Object.fromEntries([
        'clearRect', 'save', 'restore', 'translate', 'scale', 'beginPath',
        'moveTo', 'lineTo', 'stroke',
      ].map(name => [name, (...args) => this.calls.push([name, ...args])]));
      this.context.fillRect = (...args) => this.calls.push(['fillRect', this.context.fillStyle, ...args]);
    }
    set innerHTML(value) { assert.equal(value, ''); this.children = []; }
    appendChild(child) { this.children.push(child); }
    setAttribute(name, value) { this.attributes[name] = value; }
    addEventListener(name, handler) { (this.listeners[name] ||= []).push(handler); }
    dispatch(name, event = {}) { for (const handler of this.listeners[name] || []) handler(event); }
    getContext(type) { assert.equal(type, '2d'); return this.context; }
    getBoundingClientRect() { return { left: 20, top: 30, width: 256, height: 128 }; }
    setPointerCapture(id) { this.captured = id; }
    get selectedIndex() { return this.options.findIndex(option => option.value === this.value); }
  }
  const elements = {};
  for (const match of html.matchAll(/<(canvas|input|select|div|span|button)\b([^>]*\bid="([^"]+)"[^>]*)>/g)) {
    const [, tag, attrs, id] = match;
    const element = elements[id] = new Element(tag);
    element.value = attrs.match(/\bvalue="([^"]*)"/)?.[1] || '';
    element.width = Number(attrs.match(/\bwidth="(\d+)"/)?.[1]);
    element.height = Number(attrs.match(/\bheight="(\d+)"/)?.[1]);
    if (tag === 'select') {
      const body = html.slice(match.index).match(/<select[^>]*>([\s\S]*?)<\/select>/)[1];
      element.options = [...body.matchAll(/<option value="([^"]+)">([^<]+)<\/option>/g)]
        .map(([, value, text]) => ({ value, text }));
      element.value = element.options[0].value;
    }
  }
  const frames = [];
  const context = vm.createContext({
    document: { getElementById: id => elements[id], createElement: tag => new Element(tag) },
    requestAnimationFrame: callback => frames.push(callback),
  });
  vm.runInContext(script, context);
  const read = expression => JSON.parse(JSON.stringify(vm.runInContext(expression, context)));
  const change = (id, value) => { elements[id].value = String(value); elements[id].dispatch('change'); };
  const swatch = color => elements.palette.children.find(button => button.attributes['aria-label'] === color);
  return { elements, frames, read, change, swatch,
    run: source => vm.runInContext(source, context),
    flush: () => { while (frames.length) frames.shift()(); },
  };
}

for (const [mode, cells] of Object.entries({
  none: [[1, 2]], horizontal: [[1, 2], [4, 2]],
  vertical: [[1, 2], [1, 3]], both: [[1, 2], [4, 2], [1, 3], [4, 3]],
})) {
  test(`painting with ${mode} mirroring affects exactly the expected cells`, () => {
    const p = page(); p.change('tileSize', 6); p.change('mirrorMode', mode);
    p.run('paintCell(1, 2)');
    const expected = Array.from({ length: 6 }, () => Array(6).fill(''));
    for (const [x, y] of cells) expected[y][x] = '#111827';
    assert.deepEqual(p.read('grid'), expected);
  });
}

test('odd-size mirroring deduplicates cells on the central axes', () => {
  const p = page(); p.change('tileSize', 5); p.change('mirrorMode', 'both');
  assert.deepEqual(p.read('getMirroredCells(2, 2)'), [[2, 2]]);
  assert.deepEqual(p.read('getMirroredCells(2, 1)'), [[2, 1], [2, 3]]);
});

for (const [mode, horizontal, vertical] of [
  ['torus', false, false], ['mobius-horizontal', true, false],
  ['mobius-vertical', false, true], ['mobius-both', true, true],
]) {
  test(`${mode}: seam parity, labels, and preview canvas transforms agree`, () => {
    const p = page(); p.change('tileSize', 4);
    p.run("grid[0][1] = '#ef4444'; grid[3][2] = '#2563eb'");
    p.change('repeatCount', 3); p.change('topologyMode', mode);
    const label = p.elements.topologyMode.options.find(option => option.value === mode).text;
    assert.equal(label.includes('left/right') || label.includes('both seams'), horizontal);
    assert.equal(label.includes('top/bottom') || label.includes('both seams'), vertical);
    assert.equal(p.elements.repeatLabel.textContent, `3 × 3 ${mode === 'torus' ? 'torus' : 'möbius'}`);
    assert.equal(p.elements.previewGrid.children.length, 9);
    for (let row = 0; row < 3; row++) for (let col = 0; col < 3; col++) {
      const flipX = horizontal && col % 2 === 1;
      const flipY = vertical && row % 2 === 1;
      assert.deepEqual(p.read(`getPreviewFlips(${row}, ${col})`), { flipX, flipY });
      const canvas = p.elements.previewGrid.children[row * 3 + col].children[0];
      assert.deepEqual(canvas.calls.filter(call => ['translate', 'scale'].includes(call[0])),
        flipX || flipY ? [['translate', flipX ? 256 : 0, flipY ? 256 : 0], ['scale', flipX ? -1 : 1, flipY ? -1 : 1]] : []);
      assert.deepEqual(canvas.calls.filter(call => call[0] === 'fillRect'),
        [['fillRect', '#ef4444', 64, 0, 64, 64], ['fillRect', '#2563eb', 128, 192, 64, 64]]);
    }
  });
}

test('palette selection and custom colors expose exactly one pressed swatch', () => {
  const p = page();
  const pressed = () => p.elements.palette.children.filter(b => b.attributes['aria-pressed'] === 'true').map(b => b.title);
  assert.equal(p.elements.palette.children.length, 13);
  assert.deepEqual(pressed(), ['#111827']);
  p.swatch('#ef4444').dispatch('click'); p.run('paintCell(0, 0)');
  assert.equal(p.read('grid[0][0]'), '#ef4444');
  assert.deepEqual(pressed(), ['#ef4444']);
  p.elements.customColor.value = '#ABCDEF'; p.elements.addColor.dispatch('click');
  assert.deepEqual(pressed(), ['#abcdef']);
  assert.equal(p.elements.palette.children.length, 14);
  p.elements.addColor.dispatch('click');
  assert.equal(p.elements.palette.children.length, 14);
  p.run('paintCell(1, 0)'); assert.equal(p.read('grid[0][1]'), '#abcdef');
  p.elements.customColor.value = '#EF4444'; p.elements.addColor.dispatch('click');
  assert.equal(p.elements.palette.children.length, 14);
  assert.deepEqual(pressed(), ['#ef4444']);
});

test('eraser mirrors like paint; Clear all clears editor and preview while preserving settings', () => {
  const p = page(); p.change('tileSize', 4); p.change('mirrorMode', 'both');
  p.run('paintCell(0, 0); paintCell(1, 1)'); p.flush();
  p.swatch('Eraser').dispatch('click'); p.run('paintCell(0, 0)'); p.flush();
  assert.equal(p.read('grid.flat().filter(Boolean).length'), 4);
  for (const [x, y] of [[0, 0], [3, 0], [0, 3], [3, 3]]) assert.equal(p.read(`grid[${y}][${x}]`), '');
  p.elements.editorCanvas.calls = [];
  p.elements.clearAll.dispatch('click');
  assert.equal(p.read('grid.flat().filter(Boolean).length'), 0);
  assert.equal(p.read('selectedColor'), '');
  assert.equal(p.elements.mirrorMode.value, 'both');
  for (const canvas of [p.elements.editorCanvas, ...p.elements.previewGrid.children.map(tile => tile.children[0])]) {
    assert.ok(canvas.calls.some(call => call[0] === 'clearRect'));
    assert.equal(canvas.calls.filter(call => call[0] === 'fillRect').length, 0);
  }
});

test('resize preserves the upper-left overlap, initializes new cells, and discards cropped cells', () => {
  const p = page(); p.change('tileSize', 6);
  p.run("grid[1][2] = '#ef4444'; grid[5][5] = '#2563eb'");
  p.change('tileSize', 8);
  assert.equal(p.read('grid[1][2]'), '#ef4444'); assert.equal(p.read('grid[5][5]'), '#2563eb');
  assert.equal(p.read('grid[7][7]'), ''); assert.equal(p.read('grid.length'), 8);
  assert.equal(p.elements.sizeLabel.textContent, '8 × 8');
  p.change('tileSize', 4); p.change('tileSize', 6);
  assert.equal(p.read('grid[1][2]'), '#ef4444'); assert.equal(p.read('grid[5][5]'), '');
  p.change('tileSize', 'invalid'); assert.equal(p.elements.tileSize.value, '6');
  p.change('tileSize', 1); assert.equal(p.read('tileSize'), 4);
  p.change('tileSize', 100); assert.equal(p.read('tileSize'), 64);
});

test('repeat count updates preview dimensions and clamps invalid input', () => {
  const p = page(); p.change('repeatCount', 2);
  assert.equal(p.elements.previewGrid.children.length, 4);
  assert.equal(p.elements.previewGrid.style.gridTemplateColumns, 'repeat(2, 1fr)');
  p.change('repeatCount', 'invalid'); assert.equal(p.elements.repeatCount.value, '2');
  p.change('repeatCount', 0); assert.equal(p.elements.previewGrid.children.length, 1);
  p.change('repeatCount', 10); assert.equal(p.elements.previewGrid.children.length, 81);
});

test('pointer drawing uses CSS bounds, captures the pointer, clamps edges, and batches renders', () => {
  const p = page(); p.change('tileSize', 4);
  const canvas = p.elements.editorCanvas;
  canvas.dispatch('pointermove', { clientX: 21, clientY: 31 });
  assert.equal(p.read('grid.flat().filter(Boolean).length'), 0);
  canvas.dispatch('pointerdown', { pointerId: 7, clientX: 116, clientY: 110 });
  assert.equal(canvas.captured, 7); assert.equal(p.read('grid[2][1]'), '#111827');
  canvas.dispatch('pointermove', { pointerId: 7, clientX: 500, clientY: -20 });
  assert.equal(p.read('grid[0][3]'), '#111827');
  assert.equal(p.frames.length, 1);
  p.flush(); assert.equal(p.frames.length, 0);
  canvas.dispatch('pointermove', { pointerId: 7, clientX: 21, clientY: 31 });
  assert.equal(p.frames.length, 1);
});

for (const stop of ['pointerup', 'pointercancel', 'pointerleave']) {
  test(`${stop} stops subsequent pointer drawing`, () => {
    const p = page(); const canvas = p.elements.editorCanvas;
    canvas.dispatch('pointerdown', { pointerId: 1, clientX: 21, clientY: 31 });
    canvas.dispatch(stop, { pointerId: 1 });
    canvas.dispatch('pointermove', { pointerId: 1, clientX: 200, clientY: 100 });
    assert.equal(p.read('grid.flat().filter(Boolean).length'), 1);
  });
}
