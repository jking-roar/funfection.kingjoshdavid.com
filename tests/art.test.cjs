const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
require('../art/catalog.js');
const catalog = globalThis.FunfectionCatalog;
const { render } = require('../art/art.js');
const base = { prefix: 'Neon', family: 'Spark', suffix: 'Sneezle', seed: 'test' };
test('catalog snapshots match and contain unique names', () => {
  for (const key of ['prefix', 'family', 'suffix']) {
    assert.deepEqual(
      catalog[key],
      JSON.parse(fs.readFileSync(require.resolve('../art/' + key + '.json'))),
    );
    assert.equal(new Set(catalog[key]).size, catalog[key].length);
  }
  assert.deepEqual(
    Object.values(catalog).map((a) => a.length),
    [58, 58, 50],
  );
});
test('recipes are deterministic, and all categories affect artwork', () => {
  assert.equal(render(base, catalog), render({ ...base }, catalog));
  for (const key of Object.keys(catalog)) {
    const outputs = catalog[key].map((value) =>
      render({ ...base, [key]: value }, catalog).replace(/<title>.*?<\/title>/, ''),
    );
    assert.equal(new Set(outputs).size, catalog[key].length);
  }
  assert.notEqual(render(base, catalog), render({ ...base, seed: 'other' }, catalog));
});
test('all category values render finite SVG', () => {
  for (const key of Object.keys(catalog))
    for (const value of catalog[key]) {
      const svg = render({ ...base, [key]: value }, catalog);
      assert.match(svg, /^<svg/);
      assert.match(svg, /<\/svg>$/);
      assert.doesNotMatch(svg, /NaN|Infinity|undefined/);
    }
});
test('untrusted seed text is escaped and unknown categories rejected', () => {
  assert.doesNotMatch(
    render({ ...base, seed: '</desc><script>alert(1)</script>' }, catalog),
    /<script>/,
  );
  assert.throws(() => render({ ...base, family: 'fake' }, catalog));
});
test('page restores recipe, edits, randomizes, shares, and exports', async () => {
  const vm = require('node:vm'),
    { webcrypto } = require('node:crypto');
  const nodes = {};
  for (const id of [
    'prefix',
    'family',
    'suffix',
    'seed',
    'recipe',
    'art',
    'name',
    'edition',
    'status',
    'random',
    'variation',
    'svg',
    'png',
    'share',
    'history',
    'traits-info',
    'plate-overlay',
  ])
    nodes[id] = {
      children: [],
      replaceChildren() {
        this.children = [];
      },
      append(node) {
        this.children.push(node);
      },
      value: '',
      add() {},
      addEventListener(k, fn) {
        this[k] = fn;
      },
      setAttribute() {},
    };
  const downloads = [],
    blobs = [];
  let copied = '';
  let current = new URL(
    'https://example.com/art/?prefix=Neon&family=Bloom&suffix=Wiggle&seed=example',
  );
  class FakeImage {
    async decode() {}
  }
  const context = {
    FunfectionPlate: require('../art/plate.js'),
    FunfectionCatalog: catalog,
    FunfectionArt: globalThis.FunfectionArt,
    FunfectionTraits: globalThis.FunfectionTraits,
    URL: class extends URL {
      static createObjectURL(blob) {
        blobs.push(blob);
        return 'blob:example';
      }
      static revokeObjectURL() {}
    },
    URLSearchParams,
    crypto: webcrypto,
    Uint32Array,
    Option: class {},
    Blob,
    Image: FakeImage,
    Path2D: class {
      constructor(d) {
        this.d = d;
      }
    },
    Math,
    setTimeout() {},
    location: { search: current.search, href: current.href },
    history: {
      replaceState(a, b, url) {
        current = url;
      },
    },
    navigator: {
      clipboard: {
        async writeText(text) {
          copied = text;
        },
      },
    },
    document: {
      getElementById: (id) => nodes[id],
      createElement(tag) {
        return tag === 'button'
          ? {
              setAttribute(k, v) {
                this[k] = v;
              },
            }
          : tag === 'a'
            ? {
                click() {
                  downloads.push(this.download);
                },
              }
            : {
                getContext() {
                  return {
                    scale(x, y) {
                      assert.deepEqual([x, y], [2, 2]);
                    },
                    clip(path) {
                      assert.equal(path.d, globalThis.FunfectionArt.cropPath(nodes.seed.value));
                    },
                    drawImage(img, x, y, w, h) {
                      assert.deepEqual([x, y, w, h], [0, 0, 800, 800]);
                    },
                  };
                },
                toBlob(fn) {
                  fn(new Blob(['png'], { type: 'image/png' }));
                },
              };
      },
    },
  };
  vm.runInNewContext(fs.readFileSync(require.resolve('../art/app.js'), 'utf8'), context);
  assert.equal(nodes.name.textContent, 'Neon Bloom Wiggle');
  assert.equal(nodes.seed.value, 'example');
  assert.match(nodes.art.innerHTML, /<svg/);
  const first = nodes.art.innerHTML;
  assert.equal(nodes.history.children.length, 1);
  nodes.seed.value = 'typed seed';
  nodes.seed.input();
  assert.notEqual(nodes.art.innerHTML, first);
  assert.equal(current.searchParams.get('seed'), 'typed seed');
  assert.equal(nodes.history.children.length, 2);
  nodes.history.children[1].onclick();
  assert.equal(nodes.art.innerHTML, first);
  assert.equal(nodes.seed.value, 'example');
  assert.equal(nodes.history.children.length, 2);
  nodes.variation.onclick();
  assert.notEqual(nodes.seed.value, 'example');
  assert.notEqual(nodes.art.innerHTML, first);
  assert.equal(nodes.family.value, 'Bloom');
  nodes.family.value = 'Glitch';
  nodes.family.change();
  assert.match(nodes.name.textContent, /Glitch/);
  assert.equal(current.searchParams.get('family'), 'Glitch');
  nodes.svg.onclick();
  assert.match(downloads[0], /\.svg$/);
  assert.equal(blobs[0].type, 'image/svg+xml');
  await nodes.png.onclick();
  assert.match(downloads[1], /\.png$/);
  await nodes.share.onclick();
  assert.equal(copied, context.location.href);
  nodes.random.onclick();
  for (const key of Object.keys(catalog)) assert.ok(catalog[key].includes(nodes[key].value));
});

test('organic clip encloses all painted artwork including background', () => {
  const svg = render(base, catalog);
  assert.ok(
    svg.includes(
      '<clipPath id="art-crop"><path d="' +
        globalThis.FunfectionArt.cropPath(base.seed) +
        '"/></clipPath>',
    ),
  );
  assert.match(svg, /<g clip-path="url\(#art-crop\)"><rect/);
});
test('every category has an explicit semantic profile', () => {
  const { prefixes, families, suffixes } = globalThis.FunfectionArt.traits;
  for (const [key, profiles] of [
    ['prefix', prefixes],
    ['family', families],
    ['suffix', suffixes],
  ]) {
    assert.deepEqual(Object.keys(profiles).sort(), [...catalog[key]].sort());
    for (const profile of Object.values(profiles)) assert.ok(profile.at(-1).length > 10);
  }
  assert.equal(prefixes.Amber[2], 'resin');
  assert.equal(prefixes.Frosty[2], 'frost');
  assert.equal(families.Gyoza[0], 'dumpling');
  assert.equal(families.Xebec[0], 'ship');
  assert.equal(suffixes.Unzip[0], 'zipper');
  assert.equal(suffixes.Crackle[0], 'crack');
});
test('category changes preserve unrelated random layers; enum order does not matter', () => {
  const layers = (recipe) =>
    Object.fromEntries(
      ['prefix', 'family', 'suffix'].map((key) => {
        const svg = render(recipe, catalog),
          start = svg.indexOf('<g data-layer="' + key + '"'),
          next = svg.indexOf('<g data-layer="', start + 1);
        return [key, svg.slice(start, next < 0 ? svg.lastIndexOf('</g></svg>') : next)];
      }),
    );
  const a = layers(base),
    b = layers({ ...base, suffix: 'Crackle' });
  assert.equal(a.family, b.family);
  assert.equal(a.prefix, b.prefix);
  assert.notEqual(a.suffix, b.suffix);
  const c = layers({ ...base, family: 'Gyoza' });
  assert.equal(a.prefix, c.prefix);
  assert.notEqual(a.suffix, c.suffix);
  assert.equal(
    render(base, catalog),
    render(
      base,
      Object.fromEntries(Object.entries(catalog).map(([k, v]) => [k, [...v].reverse()])),
    ),
  );
});

test('crop varies with seed and stays independent of category choices', () => {
  const { cropPath, cropParameters } = globalThis.FunfectionArt;
  assert.equal(cropPath('same'), cropPath('same'));
  assert.notEqual(cropPath('same'), cropPath('other'));
  const paths = new Set();
  for (let i = 0; i < 100; i++) {
    const d = cropPath('seed-' + i);
    paths.add(d);
    assert.match(d, /^M.*Z$/);
    assert.equal((d.match(/C/g) || []).length, 64);
    assert.doesNotMatch(d, /NaN|Infinity/);
    for (const v of d.match(/-?\d+(?:\.\d+)?/g).map(Number)) assert.ok(v > 0 && v < 800);
    const p = cropParameters('seed-' + i);
    assert.ok(p.lobes >= 3 && p.lobes <= 6);
  }
  assert.equal(paths.size, 100);
  for (const key of Object.keys(catalog))
    assert.ok(
      render({ ...base, [key]: catalog[key].at(-1) }, catalog).includes(
        'd="' + cropPath(base.seed) + '"',
      ),
    );
});

test('Lattice seed controls angle, size, spacing, and omitted mesh edges', () => {
  const meshes = [];
  for (const seed of ['lattice-a', 'lattice-b', 'lattice-c']) {
    const recipe = { ...base, family: 'Lattice', seed },
      svg = render(recipe, catalog);
    assert.equal(svg, render(recipe, catalog));
    const mesh = svg.slice(
      svg.indexOf('<g data-lattice="mesh"'),
      svg.indexOf('<g data-layer="suffix"'),
    );
    const spacing = Number(mesh.match(/data-spacing="([^"]+)"/)[1]);
    const cells = Math.floor(540 / spacing);
    const edges = (mesh.match(/<path /g) || []).length;
    assert.ok(edges > 0 && edges < 2 * cells * (cells + 1), 'some edges must be omitted');
    assert.match(mesh, /rotate\([\d.]+\) scale\([\d.]+\)/);
    meshes.push(mesh);
  }
  assert.equal(new Set(meshes).size, 3);
  const transforms = meshes.map((m) => m.match(/transform="([^"]+)"/)[1]);
  assert.equal(new Set(transforms).size, 3);
});

test('glass presentation varies by virus and seed, and restores exactly', () => {
  const { render: plate } = require('../art/plate.js');
  assert.equal(plate(base), plate({ ...base }));
  for (const key of ['prefix', 'family', 'suffix', 'seed'])
    assert.notEqual(plate(base), plate({ ...base, [key]: base[key] + 'other' }));
  const outputs = new Set();
  for (let i = 0; i < 25; i++) {
    const svg = plate({ ...base, seed: String(i) });
    assert.doesNotMatch(svg, /NaN|undefined|Infinity/);
    outputs.add(svg);
  }
  assert.equal(outputs.size, 25);
  assert.doesNotMatch(render(base, catalog), /plate-glass/, 'presentation must not enter exports');
});
test('default icon scale doubles each motif without changing its anchor or crop', () => {
  const { config, cropPath } = globalThis.FunfectionArt,
    original = config.iconScale;
  const categoryLayer = (svg, key) => {
    const start = svg.indexOf('<g data-layer="' + key + '"');
    const next = svg.indexOf('<g data-layer="', start + 1);
    return svg.slice(start, next < 0 ? svg.lastIndexOf('</g></svg>') : next);
  };
  try {
    config.iconScale = 1;
    const a = render(base, catalog);
    config.iconScale = 2;
    const b = render(base, catalog);
    for (const key of ['prefix', 'family', 'suffix']) {
      const first = categoryLayer(a, key).match(
        /transform="translate\(([^)]+)\) rotate\(([^)]+)\) scale\(([^)]+)\) scale\((?:1|-1) (?:1|-1)\)"/,
      );
      const second = categoryLayer(b, key).match(
        /transform="translate\(([^)]+)\) rotate\(([^)]+)\) scale\(([^)]+)\) scale\((?:1|-1) (?:1|-1)\)"/,
      );
      assert.equal(first[1], second[1]);
      assert.equal(first[2], second[2]);
      assert.ok(Math.abs(Number(second[3]) - 2 * Number(first[3])) <= 0.011);
    }
    assert.ok(a.includes(cropPath(base.seed)) && b.includes(cropPath(base.seed)));
    for (const family of ['Lattice', 'Nexus'])
      assert.match(render({ ...base, family }, catalog), /data-icon-scale="2"/);
  } finally {
    config.iconScale = original;
  }
});
test('every named category accepts a scale override that replaces the shared default', () => {
  const { config, iconScale } = globalThis.FunfectionArt;
  for (const key of Object.keys(catalog))
    for (const name of catalog[key]) {
      try {
        config.categories[key][name] = 1.25;
        assert.equal(iconScale(key, name), 1.25);
        const svg = render({ ...base, [key]: name }, catalog);
        assert.doesNotMatch(svg, /NaN|Infinity|undefined/);
      } finally {
        delete config.categories[key][name];
      }
      assert.equal(iconScale(key, name), 2);
    }
});
test('invalid scale overrides are rejected', () => {
  const { config, iconScale } = globalThis.FunfectionArt;
  try {
    for (const v of [0, -1, Infinity, NaN, '2']) {
      config.categories.family.Spark = v;
      assert.throws(() => iconScale('family', 'Spark'), /positive finite/);
    }
  } finally {
    delete config.categories.family.Spark;
  }
});

test('seeded mirroring has a repeatable frequency and supports every flip axis', () => {
  const { mirroringParameters, mirrorFor } = globalThis.FunfectionArt;
  assert.deepEqual(mirroringParameters('same'), mirroringParameters('same'));
  assert.notEqual(
    mirroringParameters('same').frequency,
    mirroringParameters('different').frequency,
  );
  const axes = new Set();
  for (let j = 0; j < 12; j++) {
    const seed = 'mirror-' + j,
      p = mirroringParameters(seed).frequency;
    assert.ok(p >= 0.1 && p < 0.8);
    let flipped = 0;
    for (let i = 0; i < 500; i++) {
      const m = mirrorFor(seed, 'family', 'Xebec', i);
      assert.deepEqual(m, mirrorFor(seed, 'family', 'Xebec', i));
      assert.ok([1, -1].includes(m.x) && [1, -1].includes(m.y));
      axes.add([m.x, m.y].join(','));
      if (m.x < 0 || m.y < 0) flipped++;
    }
    assert.ok(Math.abs(flipped / 500 - p) < 0.1);
  }
  assert.deepEqual([...axes].sort(), ['-1,-1', '-1,1', '1,-1', '1,1'].sort());
});
test('all motif layers contain mirroring transforms and remain reproducible', () => {
  const svg = render({ ...base, family: 'Xebec' }, catalog);
  assert.equal(svg, render({ ...base, family: 'Xebec' }, catalog));
  assert.match(svg, /scale\(-1 (?:1|-1)\)|scale\(1 -1\)/);
  for (const category of ['prefix', 'family', 'suffix']) {
    const start = svg.indexOf('<g data-layer="' + category + '"'),
      next = svg.indexOf('<g data-layer="', start + 1);
    const layer = svg.slice(start, next < 0 ? svg.lastIndexOf('</g></svg>') : next);
    assert.match(layer, /scale\((?:1|-1) (?:1|-1)\)/);
  }
});

test('suffix details reuse recorded family frames for every family and suffix', () => {
  const { familyApplication, traits } = globalThis.FunfectionArt;
  const palette = traits.prefixes.Neon[1].split(' ');
  for (const family of catalog.family) {
    const application = familyApplication(family, base.seed, palette);
    assert.deepEqual(application, familyApplication(family, base.seed, palette));
    assert.ok(application.attachments.length > 0);
    for (const suffix of catalog.suffix) {
      const svg = render({ ...base, family, suffix }, catalog);
      const details = svg.slice(svg.indexOf('<g data-layer="suffix"'));
      const frames = [...details.matchAll(/data-family-part="(\d+)" transform="([^"]+)"/g)];
      assert.equal(
        frames.length,
        Math.min(3, traits.suffixes[suffix][1], application.attachments.length),
      );
      for (const [, id, transform] of frames) {
        assert.equal(transform, application.attachments[Number(id)].transform);
      }
      assert.doesNotMatch(svg, /NaN|Infinity|undefined/);
    }
  }
});

test('every family defines SVG landmarks and its own adornment size', () => {
  const { traits, familyApplication } = globalThis.FunfectionArt;
  assert.deepEqual(Object.keys(traits.adornments).sort(), [...catalog.family].sort());
  for (const family of catalog.family) {
    const profile = traits.adornments[family];
    assert.ok(profile.bodyRadius > 0 && profile.suffixRadius > 0);
    assert.ok(profile.points.length >= 2 && profile.points.length <= 3);
    for (const point of profile.points) {
      assert.equal(point.length, 3);
      assert.ok(point.every(Number.isFinite));
    }
    const app = familyApplication(family, 'landmarks', ['#123456']);
    for (const anchor of app.attachments) {
      assert.ok(anchor.transform.startsWith(anchor.bodyTransform));
      assert.ok(
        anchor.transform.endsWith(
          'translate(' +
            anchor.point[0] +
            ' ' +
            anchor.point[1] +
            ') rotate(' +
            anchor.point[2] +
            ')',
        ),
      );
    }
  }
});
test('reported examples have one centered body and sparse edge adornments', () => {
  for (const recipe of [
    { prefix: 'Zesty', family: 'Fable', suffix: 'Grizzle', seed: '15fzxqy-13fc5iv' },
    { prefix: 'Twinkly', family: 'Oracle', suffix: 'Puffin', seed: 'g0p801-1toycst' },
  ]) {
    const svg = render(recipe, catalog);
    assert.equal((svg.match(/data-family-body=/g) || []).length, 1);
    assert.equal((svg.match(/data-adornment-radius=/g) || []).length, 3);
    assert.match(svg, /Semantic recipe version 4/);
    assert.doesNotMatch(svg, /NaN|undefined|Infinity/);
  }
});
