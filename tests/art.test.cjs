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
    setTimeout(fn, delay) {
      if (delay !== 2000) return;
      context.pendingTimer = fn;
      return 1;
    },
    clearTimeout() { context.pendingTimer = null; },
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
                      assert.deepEqual([x, y, w, h], [0, 0, 800, 950]);
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
  await vm.runInNewContext(fs.readFileSync(require.resolve('../art/app.js'), 'utf8'), context);
  assert.equal(nodes.name.textContent, 'Neon Bloom Wiggle');
  assert.equal(nodes.seed.value, 'example');
  assert.match(nodes.art.innerHTML, /<svg/);
  const first = nodes.art.innerHTML;
  nodes.art.click();
  assert.match(nodes.art.innerHTML, /plate-glass/);
  assert.match(nodes.art.innerHTML, />FUNFECTION<\/text>/);
  assert.match(nodes.art.innerHTML, /viewBox="0 0 800 950"/);
  nodes.art.click();
  assert.equal(nodes.art.innerHTML, first);
  nodes.art.keydown({ key: 'Enter', preventDefault() {} });
  assert.match(nodes.art.innerHTML, /plate-glass/);
  nodes.art.keydown({ key: 'Escape' });
  assert.equal(nodes.art.innerHTML, first);
  assert.equal(nodes.history.children.length, 1);
  nodes.seed.value = 'typed seed';
  nodes.seed.input();
  assert.equal(nodes.art.innerHTML, first);
  assert.equal(nodes.history.children.length, 1);
  nodes.seed.value = 'typed seed final';
  nodes.seed.input();
  assert.equal(nodes.art.innerHTML, first);
  context.pendingTimer();
  assert.notEqual(nodes.art.innerHTML, first);
  assert.equal(current.searchParams.get('seed'), 'typed seed final');
  assert.equal(nodes.history.children.length, 2);
  nodes.history.children[1].onclick();
  assert.equal(nodes.art.innerHTML, first);
  assert.equal(nodes.seed.value, 'example');
  assert.equal(nodes.history.children.length, 2);
  nodes.seed.value = 'blurred seed';
  nodes.seed.input();
  nodes.seed.blur();
  assert.equal(current.searchParams.get('seed'), 'blurred seed');
  assert.equal(context.pendingTimer, null);
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
  const exportedSvg = await blobs[0].text();
  assert.match(exportedSvg, /plate-glass/);
  assert.match(exportedSvg, />FUNFECTION<\/text>/);
  assert.match(exportedSvg, /viewBox="0 0 800 950"/);
  assert.match(exportedSvg, /data-instance=/);
  assert.doesNotMatch(exportedSvg, />SEED /);
  await nodes.png.onclick();
  assert.equal(await blobs[1].text(), exportedSvg, 'PNG uses the same complete slide as SVG');
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
  assert.doesNotMatch(render(base, catalog), /plate-glass/, 'raw specimen stays separate from slide composition');
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
      const start = svg.indexOf('<g data-layer="suffix"');
      const next = svg.indexOf('<g data-layer=', start + 1);
      const details = svg.slice(start, next < 0 ? svg.length : next);
      const frames = [...details.matchAll(/data-family-part="(\d+)" transform="([^"]+)"/g)];
      assert.equal(
        frames.length,
        globalThis.FunfectionArt.adornmentPlacements(application, suffix, base.seed).length,
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
    assert.equal(
      (svg.match(/data-family-body=/g) || []).length,
      globalThis.FunfectionArt.instanceLayout(recipe.seed).length,
    );
    const count = globalThis.FunfectionArt.instanceLayout(recipe.seed).length;
    const details = (svg.match(/data-adornment-radius=/g) || []).length;
    assert.ok(details >= count && details <= count * 2);
    assert.match(svg, /Semantic recipe version 7/);
    assert.doesNotMatch(svg, /NaN|undefined|Infinity/);
  }
});

test('seeded attachment selection and poses vary within local slot limits', () => {
  const { familyApplication, adornmentPlacements } = globalThis.FunfectionArt;
  const family = familyApplication('Fable', 'fixed-body', ['#123456']);
  const slots = new Set(),
    rotations = new Set();
  for (let i = 0; i < 40; i++) {
    const seed = 'pose-' + i;
    const poses = adornmentPlacements(family, 'Grizzle', seed);
    assert.deepEqual(poses, adornmentPlacements(family, 'Grizzle', seed));
    assert.ok(poses.length >= 1 && poses.length <= 2);
    assert.equal(new Set(poses.map((p) => p.attachment.id)).size, poses.length);
    for (const pose of poses) {
      const a = pose.attachment;
      slots.add(a.id);
      rotations.add(pose.rotation);
      assert.ok(Math.abs(pose.rotation) <= a.rotationRange);
      assert.ok(Math.abs(pose.tangent) <= a.extent * a.jitter);
      assert.ok(pose.outward >= a.extent * (0.65 - a.jitter));
      assert.ok(pose.scale >= 0.92 && pose.scale <= 1.08);
    }
  }
  assert.equal(slots.size, 3);
  assert.ok(rotations.size > 20);
});
test('Lattice detail radius remains legible independently of mesh spacing and size', () => {
  const { familyApplication } = globalThis.FunfectionArt;
  for (let i = 0; i < 80; i++) {
    const family = familyApplication('Lattice', 'mesh-size-' + i, ['#123456']);
    for (const a of family.attachments) {
      const scale = Number(a.bodyTransform.match(/scale\(([\d.]+)\)$/)[1]);
      assert.ok(a.extent * scale >= 55.9);
      assert.ok(Math.hypot(a.point[0], a.point[1]) * scale <= 205.1);
    }
  }
});
test('palette hue varies slightly by seed and preserves color relationships', () => {
  const { paletteFor, rotateHue, traits } = globalThis.FunfectionArt;
  assert.equal(rotateHue('#808080', 12), '#808080');
  assert.equal(rotateHue('#ffffff', -12), '#ffffff');
  assert.equal(rotateHue('#ff0000', 120), '#00ff00');
  for (const prefix of catalog.prefix) {
    const a = paletteFor(prefix, 'palette-a'),
      b = paletteFor(prefix, 'palette-b');
    assert.deepEqual(a, paletteFor(prefix, 'palette-a'));
    assert.notEqual(a.hue, b.hue);
    assert.ok(Math.abs(a.hue) <= 12 && Math.abs(b.hue) <= 12);
    const originals = traits.prefixes[prefix][1].split(' ');
    a.colors.forEach((color, i) => {
      assert.match(color, /^#[0-9a-f]{6}$/i);
      const channels = (hex) =>
        hex
          .slice(1)
          .match(/../g)
          .map((c) => parseInt(c, 16));
      const old = channels(originals[i]),
        next = channels(color);
      assert.equal(Math.min(...old), Math.min(...next));
      assert.equal(Math.max(...old), Math.max(...next));
    });
  }
});

test('plate layouts span one to nine smaller, spread-out instances and permit overlap', () => {
  const { instanceLayout } = globalThis.FunfectionArt;
  const counts = new Set();
  let overlaps = 0;
  for (let i = 0; i < 200; i++) {
    const seed = 'plate-' + i,
      layout = instanceLayout(seed);
    assert.deepEqual(layout, instanceLayout(seed));
    counts.add(layout.length);
    for (let j = 0; j < layout.length; j++) {
      const p = layout[j];
      assert.ok(p.scale >= 0.6 && p.scale <= 0.99);
      assert.ok(Math.hypot(p.x - 400, p.y - 400) <= 232.01);
      for (const q of layout.slice(0, j)) {
        const distance = Math.hypot(p.x - q.x, p.y - q.y);
        assert.ok(distance > 35, 'centers must not collapse into a pile');
        if (distance < 170 * (p.scale + q.scale)) overlaps++;
      }
    }
    const svg = render({ ...base, seed }, catalog);
    assert.equal((svg.match(/data-instance=/g) || []).length, layout.length);
    assert.equal((svg.match(/data-layer="family"/g) || []).length, layout.length);
    assert.equal((svg.match(/data-layer="suffix"/g) || []).length, layout.length);
  }
  assert.deepEqual(
    [...counts].sort((a, b) => a - b),
    [1, 2, 3, 4, 5, 6, 7, 8, 9],
  );
  assert.ok(overlaps > 0);
});

test('count scaling strictly decreases and sparse plates have larger bodies', () => {
  const { countScale } = globalThis.FunfectionArt;
  assert.equal(countScale(1), 0.95);
  assert.equal(countScale(2), 0.86);
  for (let count = 2; count <= 9; count++) assert.ok(countScale(count) < countScale(count - 1));
});
test('every suffix has a finite native glyph radius', () => {
  for (const name of catalog.suffix)
    assert.ok(globalThis.FunfectionArt.suffixGlyphRadius(name) > 0);
});
test('adornment sizing compensates for complete instance scaling', () => {
  for (const family of catalog.family) {
    const svg = render({ ...base, family, seed: 'nine-small' }, catalog);
    const instances = svg.split(/<g data-instance="\d+" transform="/).slice(1);
    for (const instance of instances) {
      const sceneScale = Number(instance.match(/scale\(([\d.]+)\)/)[1]);
      const re = /data-family-part="\d+" transform="([^"]+)"><g data-adornment-radius="([^"]+)"/g;
      for (const [, transform, radius] of instance.matchAll(re)) {
        const frameScale = [...transform.matchAll(/scale\(([^)]+)\)/g)].reduce(
          (p, m) => p * Math.abs(Number(m[1].split(' ')[0])),
          1,
        );
        assert.ok(sceneScale * frameScale * Number(radius) * 0.92 >= 17.99, family);
      }
    }
  }
});

test('Jumble varies native pieces and arrangement deterministically within body bounds', () => {
  const { jumbleGeometry, familyApplication } = globalThis.FunfectionArt;
  const kinds = new Set(),
    counts = new Set(),
    outputs = new Set();
  for (let i = 0; i < 50; i++) {
    const seed = 'jumble-' + i,
      shapes = jumbleGeometry(seed);
    assert.deepEqual(shapes, jumbleGeometry(seed));
    counts.add(shapes.length);
    outputs.add(JSON.stringify(shapes));
    const family = familyApplication('Jumble', seed, ['#123456', '#abcdef']);
    assert.equal(family.attachments.length, shapes.length);
    shapes.forEach((shape, index) => {
      kinds.add(shape.kind);
      assert.ok(
        Math.hypot(shape.x, shape.y) +
          shape.radius *
            (shape.kind === 'rectangle' ? Math.hypot(1, shape.aspect) : Math.max(1, shape.aspect)) <
          62,
      );
      assert.equal(family.attachments[index].point[0], shape.radius);
      assert.ok(
        family.attachments[index].bodyTransform.includes(
          'translate(' + shape.x + ' ' + shape.y + ') rotate(' + shape.rotation + ')',
        ),
      );
    });
  }
  assert.equal(kinds.size, 6);
  assert.deepEqual([...counts].sort(), [3, 4, 5]);
  assert.equal(outputs.size, 50);
});

test('all visible artwork strokes have display-space floors, including raw SVG motifs', () => {
  for (const family of catalog.family) {
    const svg = render({ ...base, family }, catalog);
    for (const element of svg.matchAll(/<(?:path|circle|ellipse|rect|line|polygon)\b[^>]*>/g)) {
      if (!/stroke="(?!none")[^"]+"/.test(element[0])) continue;
      assert.match(element[0], /vector-effect="non-scaling-stroke"/);
      assert.ok(Number(element[0].match(/stroke-width="([^"]+)"/)[1]) >= 0.85);
    }
  }
  const svg = render(base, catalog);
  assert.match(svg, /stroke-width="1.5" vector-effect="non-scaling-stroke"/);
  assert.match(svg, /stroke-width="2" vector-effect="non-scaling-stroke"/);
});
test('history simplifies fine detail and keeps one-pixel non-scaling strokes', () => {
  const full = render(base, catalog),
    thumb = render(base, catalog, { thumbnail: true });
  assert.doesNotMatch(thumb, /data-layer="prefix"/);
  assert.ok(thumb.length < full.length);
  for (const element of thumb.matchAll(/<(?:path|circle|ellipse|rect|line|polygon)\b[^>]*>/g)) {
    if (/stroke="(?!none")[^"]+"/.test(element[0])) assert.match(element[0], /stroke-width="1"/);
  }
  assert.match(thumb, /data-layer="family"/);
  assert.match(thumb, /data-layer="suffix"/);
});

test('size-aware packing limits body intrusion, including the reported Fable plate', () => {
  const { instanceLayout } = globalThis.FunfectionArt;
  for (const seed of [
    'yt6xf2-bspqu4',
    ...Array.from({ length: 300 }, (_, i) => 'separation-' + i),
  ]) {
    const layout = instanceLayout(seed);
    for (let i = 0; i < layout.length; i++) {
      for (const other of layout.slice(0, i)) {
        const distance = Math.hypot(layout[i].x - other.x, layout[i].y - other.y);
        const summedRadii = 170 * (layout[i].scale + other.scale);
        assert.ok(distance >= summedRadii * 0.8, seed + ': body overlap exceeds allowance');
      }
    }
  }
});

test('async history persists recipes, validates restored data, and tolerates storage failures', async () => {
  const vm = require('node:vm');
  const source = fs.readFileSync(require.resolve('../art/app.js'), 'utf8').split('const historyPanel')[0];
  let stored;
  let writes = 0;
  const database = {
    transaction(store, mode) {
      const transaction = {
        objectStore() {
          return {
            get() {
              const request = {};
              queueMicrotask(() => { request.result = stored; request.onsuccess(); });
              return request;
            },
            put(value) {
              writes++;
              stored = structuredClone(value);
              queueMicrotask(() => transaction.oncomplete());
            },
          };
        },
      };
      return transaction;
    },
  };
  const indexedDB = {
    open() {
      const request = {};
      queueMicrotask(() => { request.result = database; request.onsuccess(); });
      return request;
    },
  };
  async function load(storage = indexedDB) {
    const context = vm.createContext({ FunfectionCatalog: catalog, document: { getElementById() {} }, indexedDB: storage });
    vm.runInContext(source, context);
    await vm.runInContext('loadHistory()', context);
    return { context, recipes: () => JSON.parse(vm.runInContext('JSON.stringify(specimens)', context)) };
  }
  const first = await load();
  await vm.runInContext('specimens.push(' + JSON.stringify(base) + '); saveHistory()', first.context);
  assert.equal(writes, 1);
  assert.deepEqual((await load()).recipes(), [base]);
  stored = [null, { ...base, family: 'unknown' }, { ...base, seed: 42 },
    { ...base, seed: 'x'.repeat(81) }, base, base,
    ...Array.from({ length: 70 }, (_, i) => ({ ...base, seed: String(i) }))];
  const restored = (await load()).recipes();
  assert.equal(restored.length, 60);
  assert.deepEqual(restored[0], base);
  assert.equal(restored[59].seed, '58');
  stored = {};
  assert.deepEqual((await load()).recipes(), []);
  const unavailable = await load({ open() { throw Error(); } });
  assert.deepEqual(unavailable.recipes(), []);
  await assert.doesNotReject(() => vm.runInContext('saveHistory()', unavailable.context));
  database.transaction = () => { throw Error('quota'); };
  await assert.doesNotReject(() => vm.runInContext('saveHistory()', first.context));
});
