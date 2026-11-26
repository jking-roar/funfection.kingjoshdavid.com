'use strict';

// Catalog, form controls, and saved history.
const catalog = globalThis.FunfectionCatalog;
const fields = Object.fromEntries(
  ['prefix', 'family', 'suffix', 'seed'].map((key) => [key, document.getElementById(key)]),
);
let svgText = '',
  recipe,
  enlarged = false;
const HISTORY_LIMIT = 60;
const SEED_DELAY_MS = 2000;
const specimens = [];
let historyDatabase;
let seedTimer;
function validHistory(saved) {
  if (!Array.isArray(saved)) return [];
  const restored = [];
  const seen = new Set();
  for (const item of saved) {
    if (!item || !['prefix', 'family', 'suffix'].every((key) => catalog[key].includes(item[key])) ||
        typeof item.seed !== 'string' || item.seed.length > 80) continue;
    const specimen = Object.fromEntries(['prefix', 'family', 'suffix', 'seed'].map((key) => [key, item[key]]));
    const signature = JSON.stringify(specimen);
    if (seen.has(signature)) continue;
    seen.add(signature);
    restored.push(specimen);
    if (restored.length === HISTORY_LIMIT) break;
  }
  return restored;
}
async function loadHistory() {
  try {
    historyDatabase = await new Promise((resolve, reject) => {
      const request = indexedDB.open('funfection-art', 1);
      request.onupgradeneeded = () => request.result.createObjectStore('history');
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
      request.onblocked = () => reject(new Error('History database blocked'));
    });
    historyDatabase.onversionchange = () => {
      historyDatabase.close();
      historyDatabase = undefined;
    };
    const saved = await new Promise((resolve, reject) => {
      const request = historyDatabase.transaction('history').objectStore('history').get('recipes');
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    specimens.push(...validHistory(saved));
  } catch {
    // Unavailable storage must not prevent the art lab from opening.
  }
}
async function saveHistory() {
  if (!historyDatabase) return;
  try {
    await new Promise((resolve, reject) => {
      const transaction = historyDatabase.transaction('history', 'readwrite');
      transaction.oncomplete = resolve;
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(transaction.error);
      transaction.objectStore('history').put(specimens, 'recipes');
    });
  } catch {
    // Keep session history usable if storage is disabled or full.
  }
}
function commitSeed() {
  clearTimeout(seedTimer);
  seedTimer = undefined;
  if (fields.seed.value !== recipe?.seed) draw();
}
const historyPanel = document.getElementById('history');
// Saved history and specimen rendering.
function showHistory() {
  historyPanel.replaceChildren();
  const active = JSON.stringify(recipe);
  for (const specimen of specimens) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'history-item';
    const label =
      [specimen.prefix, specimen.family, specimen.suffix].join(' ') + ' · seed ' + specimen.seed;
    button.title = label;
    button.setAttribute('aria-label', 'Restore ' + label);
    button.setAttribute('aria-pressed', String(JSON.stringify(specimen) === active));
    // Keep clip-path IDs unique across the current artwork and all thumbnails.
    button.innerHTML = FunfectionArt.render(specimen, catalog, { thumbnail: true }).replaceAll(
      'art-crop',
      'history-crop-' + specimens.indexOf(specimen),
    );
    button.onclick = () => {
      for (const key of Object.keys(fields)) fields[key].value = specimen[key];
      draw();
    };
    historyPanel.append(button);
  }
}
function draw() {
  clearTimeout(seedTimer);
  seedTimer = undefined;
  recipe = Object.fromEntries(Object.entries(fields).map(([key, field]) => [key, field.value]));
  svgText = FunfectionArt.render(recipe, catalog);
  if (!specimens.some((item) => JSON.stringify(item) === JSON.stringify(recipe))) {
    specimens.unshift({ ...recipe });
    // Bound saved recipes, including committed seed edits.
    if (specimens.length > HISTORY_LIMIT) specimens.pop();
    saveHistory();
  }
  showHistory();
  document.getElementById('art').innerHTML = enlarged
    ? FunfectionPlate.compose(recipe, svgText)
    : svgText;
  document.getElementById('plate-overlay').innerHTML = FunfectionPlate.render(recipe);
  const name = [recipe.prefix, recipe.family, recipe.suffix].join(' ');
  document.getElementById('art').setAttribute('aria-label', name + ' abstract artwork');
  document.getElementById('name').textContent = name;
  document.getElementById('edition').textContent = 'SEED ' + recipe.seed;
  document.getElementById('traits-info').textContent = [
    FunfectionTraits.prefixes[recipe.prefix][3],
    FunfectionTraits.families[recipe.family][4],
    FunfectionTraits.suffixes[recipe.suffix][3],
  ].join(' · ');
  document.getElementById('status').textContent = '';
  const url = new URL(location.href);
  url.search = new URLSearchParams(recipe).toString();
  history.replaceState(null, '', url);
}
// File naming and download helpers.
const filename = () =>
  [recipe.prefix, recipe.family, recipe.suffix, recipe.seed].join('-').replace(/[^a-z0-9-]/gi, '_');
function download(blob, extension, name) {
  const url = URL.createObjectURL(blob),
    a = document.createElement('a');
  a.href = url;
  a.download = name + '.' + extension;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}
function saveSvg() {
  download(new Blob([FunfectionPlate.compose(recipe, svgText)], { type: 'image/svg+xml' }), 'svg', filename());
}
async function savePng() {
  const name = filename(),
    url = URL.createObjectURL(new Blob([FunfectionPlate.compose(recipe, svgText)], { type: 'image/svg+xml' })),
    img = new Image();
  try {
    img.src = url;
    await img.decode();
    const canvas = document.createElement('canvas');
    canvas.width = 1600;
    canvas.height = 1900;
    const ctx = canvas.getContext('2d');
    ctx.scale(2, 2);
    ctx.drawImage(img, 0, 0, 800, 950);
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
    if (!blob) throw Error();
    download(blob, 'png', name);
    document.getElementById('status').textContent = 'PNG saved.';
  } catch {
    document.getElementById('status').textContent = 'PNG export failed. Try saving SVG.';
  } finally {
    URL.revokeObjectURL(url);
  }
}

async function copyRecipeLink() {
  try {
    await navigator.clipboard.writeText(location.href);
    document.getElementById('status').textContent = 'Recipe link copied.';
  } catch {
    document.getElementById('status').textContent = 'Copy the recipe link from your address bar.';
  }
}

// Restore the URL recipe, then connect controls and render the first specimen.
async function initialize() {
  await loadHistory();
  const params = new URLSearchParams(location.search);
  const newSeed = () =>
    Array.from(crypto.getRandomValues(new Uint32Array(2)), (x) => x.toString(36)).join('-');
  for (const key of ['prefix', 'family', 'suffix']) {
    for (const name of [...catalog[key]].sort((a, b) => a.localeCompare(b, 'en'))) {
      fields[key].add(new Option(name, name));
    }
    fields[key].value = catalog[key].includes(params.get(key))
      ? params.get(key)
      : catalog[key][Math.floor(Math.random() * catalog[key].length)];
    fields[key].addEventListener('change', draw);
  }
  fields.seed.value = (params.get('seed') || newSeed()).slice(0, 80);
  fields.seed.addEventListener('input', () => {
    clearTimeout(seedTimer);
    seedTimer = setTimeout(commitSeed, SEED_DELAY_MS);
  });
  fields.seed.addEventListener('blur', commitSeed);
  const artwork = document.getElementById('art');
  const setEnlarged = (value) => {
    enlarged = value;
    artwork.innerHTML = enlarged ? FunfectionPlate.compose(recipe, svgText) : svgText;
    artwork.setAttribute('aria-expanded', String(enlarged));
    artwork.setAttribute('title', enlarged ? 'Click to restore' : 'Click to enlarge');
  };
  artwork.addEventListener('click', () => setEnlarged(!enlarged));
  artwork.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      setEnlarged(!enlarged);
    } else if (event.key === 'Escape') {
      setEnlarged(false);
    }
  });
  document.getElementById('recipe').addEventListener('submit', (e) => e.preventDefault());
  document.getElementById('random').onclick = () => {
    for (const key of ['prefix', 'family', 'suffix'])
      fields[key].value = catalog[key][Math.floor(Math.random() * catalog[key].length)];
    fields.seed.value = newSeed();
    draw();
  };
  document.getElementById('variation').onclick = () => {
    fields.seed.value = newSeed();
    draw();
  };
  document.getElementById('svg').onclick = saveSvg;
  document.getElementById('png').onclick = savePng;
  document.getElementById('share').onclick = copyRecipeLink;
  draw();
}

initialize();
