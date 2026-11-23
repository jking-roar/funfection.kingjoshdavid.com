'use strict';

// Catalog, form controls, and session state.
const catalog = globalThis.FunfectionCatalog;
const fields = Object.fromEntries(
  ['prefix', 'family', 'suffix', 'seed'].map((key) => [key, document.getElementById(key)]),
);
let svgText = '',
  recipe;
const specimens = [];
const historyPanel = document.getElementById('history');
// Session history and specimen rendering.
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
    button.innerHTML = FunfectionArt.render(specimen, catalog).replaceAll(
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
  recipe = Object.fromEntries(Object.entries(fields).map(([key, field]) => [key, field.value]));
  svgText = FunfectionArt.render(recipe, catalog);
  if (!specimens.some((item) => JSON.stringify(item) === JSON.stringify(recipe))) {
    specimens.unshift({ ...recipe });
    // Bound memory for long sessions, including live seed edits.
    if (specimens.length > 60) specimens.pop();
  }
  showHistory();
  document.getElementById('art').innerHTML = svgText;
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
  download(new Blob([svgText], { type: 'image/svg+xml' }), 'svg', filename());
}
async function savePng() {
  const name = filename(),
    crop = FunfectionArt.cropPath(recipe.seed),
    url = URL.createObjectURL(new Blob([svgText], { type: 'image/svg+xml' })),
    img = new Image();
  try {
    img.src = url;
    await img.decode();
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 1600;
    const ctx = canvas.getContext('2d');
    ctx.scale(2, 2);
    ctx.clip(new Path2D(crop));
    ctx.drawImage(img, 0, 0, 800, 800);
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
function initialize() {
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
  fields.seed.addEventListener('input', draw);
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
