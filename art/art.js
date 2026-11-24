/* Semantic renderer v2. Family geometry drives suffix attachment; enum order has no visual meaning. */
(function (root) {
  'use strict';
  const traits =
    root.FunfectionTraits || (typeof require === 'function' ? require('./traits.js') : null);
  const config =
    root.FunfectionArtConfig || (typeof require === 'function' ? require('./config.js') : null);
  // Configuration and deterministic random streams.
  function iconScale(category, name) {
    const value = config.categories?.[category]?.[name] ?? config.iconScale;
    if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0)
      throw Error('Icon scale must be a positive finite number: ' + category + '/' + name);
    return value;
  }
  function hash(text) {
    let h = 2166136261;
    for (const c of text) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
    return h >>> 0;
  }
  function random(seed) {
    let a = hash(seed);
    return () => {
      a += 0x6d2b79f5;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  // Mirroring uses a separate stream: it cannot perturb placement, scale, or crop.
  function mirroringParameters(seed) {
    const rng = random('mirror-frequency:v1:' + String(seed));
    return { frequency: 0.1 + rng() * 0.7 };
  }
  function mirrorFor(seed, category, name, index) {
    const rng = random(JSON.stringify(['mirror:v1', String(seed), category, name, index]));
    if (rng() >= mirroringParameters(seed).frequency) return { x: 1, y: 1 };
    const axis = Math.floor(rng() * 3);
    return { x: axis === 1 ? 1 : -1, y: axis === 0 ? 1 : -1 };
  }
  function mirrorTransform(seed, category, name, index) {
    const { x, y } = mirrorFor(seed, category, name, index);
    return `scale(${x} ${y})`;
  }
  const esc = (s) =>
    String(s).replace(
      /[&<>"']/g,
      (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' })[c],
    );
  const fmt = (n) => Number(n.toFixed(2));
  function layer(seed, draw) {
    const rng = random(seed),
      bits = [];
    return { bits, rng, n: (a, b) => a + rng() * (b - a), draw };
  }
  // Shared SVG drawing primitives.
  function tools(bits) {
    const path = (d, fill = 'none', stroke = 'currentColor', w = 2, opacity = 1) =>
      bits.push(
        `<path d="${d}" fill="${fill}" stroke="${stroke}" stroke-width="${w}" opacity="${opacity}"/>`,
      );
    const circle = (x, y, r, fill = 'none', stroke = 'currentColor', w = 2, opacity = 1) =>
      bits.push(
        `<circle cx="${fmt(x)}" cy="${fmt(y)}" r="${fmt(r)}" fill="${fill}" stroke="${stroke}" stroke-width="${w}" opacity="${opacity}"/>`,
      );
    const line = (x, y, a, b, w = 2) =>
      path(`M${fmt(x)} ${fmt(y)}L${fmt(a)} ${fmt(b)}`, 'none', 'currentColor', w);
    const rect = (x, y, w, h, fill = 'currentColor', opacity = 1) =>
      bits.push(
        `<rect x="${fmt(x)}" y="${fmt(y)}" width="${fmt(w)}" height="${fmt(h)}" fill="${fill}" opacity="${opacity}"/>`,
      );
    const star = (r = 30, points = 5, inner = 0.4) => {
      let d = '';
      for (let i = 0; i < points * 2; i++) {
        const a = (i * Math.PI) / points - Math.PI / 2,
          rr = i % 2 ? r * inner : r;
        d += (i ? 'L' : 'M') + fmt(Math.cos(a) * rr) + ' ' + fmt(Math.sin(a) * rr);
      }
      path(d + 'Z', 'currentColor', 'none');
    };
    const spiral = (r = 45, turns = 2, w = 2) => {
      let d = '';
      for (let i = 0; i <= 90; i++) {
        const t = i / 90,
          a = t * Math.PI * 2 * turns;
        d += (i ? 'L' : 'M') + fmt(Math.cos(a) * r * t) + ' ' + fmt(Math.sin(a) * r * t);
      }
      path(d, 'none', 'currentColor', w);
    };
    const leaf = (x, y, r) =>
      path(
        `M${x} ${y}q${r} ${-r * 1.8} ${r * 1.5} 0q${-r} ${r * 0.5} ${-r * 1.5} 0Z`,
        'currentColor',
        'none',
      );
    return { path, circle, line, rect, star, spiral, leaf };
  }
  // Family geometry: whole compositions and repeated silhouettes.
  function familyLayer(name, seed, palette) {
    const attachments = [];
    const record = (transform, color, extent = 45) => {
      const attachment = { id: attachments.length, transform, color, extent };
      attachments.push(attachment);
      return attachment;
    };
    const [kind, count, scale, param] = traits.families[name],
      iconSize = iconScale('family', name);
    const { bits, n } = layer('family:' + name + ':' + seed);
    const { path, circle, line, rect, star, spiral, leaf } = tools(bits);
    bits.push(
      `<g data-layer="family" data-trait="${esc(name)}" stroke-linecap="round" stroke-linejoin="round">`,
    );
    // Global structures have their own composition instead of repeating a small symbol.
    const globalStructure = kind === 'lattice' || kind === 'network';
    const structureTransform = globalStructure
      ? `translate(400 400) scale(${iconSize}) ${mirrorTransform(seed, 'family', name, 0)} translate(-400 -400)`
      : '';
    if (globalStructure)
      bits.push(
        `<g data-icon-scale="${iconSize}" transform="translate(400 400) scale(${iconSize}) ${mirrorTransform(seed, 'family', name, 0)} translate(-400 -400)">`,
      );
    if (kind === 'lattice') {
      const rotation = n(0, 180),
        size = n(0.65, 1.2),
        spacing = n(32, 72),
        missing = n(0.08, 0.32);
      const cells = Math.floor(540 / spacing),
        half = (cells * spacing) / 2;
      bits.push(
        `<g data-lattice="mesh" transform="translate(400 400) rotate(${fmt(rotation)}) scale(${fmt(size)})" data-spacing="${fmt(spacing)}">`,
      );
      // Each edge is drawn once: omitted edges stay genuinely empty.
      for (let row = 0; row <= cells; row++)
        for (let col = 0; col <= cells; col++) {
          const x = -half + col * spacing,
            y = -half + row * spacing;
          bits.push(`<g color="${palette[(row + col) % palette.length]}">`);
          if (col < cells && n(0, 1) > missing) line(x, y, x + spacing, y);
          if (row < cells && n(0, 1) > missing) line(x, y, x, y + spacing);
          if (n(0, 1) > 0.25) {
            circle(x, y, 2, 'currentColor', 'none');
            record(
              `${structureTransform} translate(400 400) rotate(${fmt(rotation)}) scale(${fmt(size)}) translate(${fmt(x)} ${fmt(y)})`,
              palette[(row + col) % palette.length],
              spacing * 0.35,
            );
          }
          bits.push('</g>');
        }
      bits.push('</g>');
    } else if (kind === 'network') {
      const nodes = Array.from({ length: count }, () => [n(140, 660), n(140, 660)]);
      bits.push(`<g color="${palette[0]}">`);
      nodes.forEach(([x, y], i) => {
        nodes
          .map(([a, b], j) => ({ j, d: Math.hypot(x - a, y - b) }))
          .filter((v) => v.j !== i)
          .sort((a, b) => a.d - b.d)
          .slice(0, 3)
          .forEach(({ j }) => line(x, y, ...nodes[j], 1));
        const radius = i % 5 === 0 ? 15 : 6;
        circle(x, y, radius, 'currentColor');
        record(`${structureTransform} translate(${fmt(x)} ${fmt(y)})`, palette[0], radius);
      });
      bits.push('</g>');
    } else {
      for (let i = 0; i < count; i++) {
        const angle = n(0, Math.PI * 2),
          radius = Math.sqrt(n(0, 1)) * 255,
          x = 400 + Math.cos(angle) * radius,
          y = 400 + Math.sin(angle) * radius,
          s = scale * n(0.65, 1.25),
          color = palette[i % palette.length];
        const rotation = [
          'rain',
          'icicle',
          'tower',
          'book',
          'harp',
          'ship',
          'hyrax',
          'ibex',
          'face',
          'uvula',
          'dumpling',
          'yolk',
          'notes',
          'horizon',
          'valley',
          'fjord',
        ].includes(kind)
          ? n(-12, 12)
          : n(-180, 180);
        const transform = `translate(${fmt(x)} ${fmt(y)}) rotate(${fmt(rotation)}) scale(${fmt((s / 50) * iconSize)}) ${mirrorTransform(seed, 'family', name, i)}`;
        const attachment = record(transform, color);
        bits.push(
          `<g data-family-part="${attachment.id}" transform="${transform}" color="${color}">`,
        );
        switch (kind) {
          case 'spark':
            star(45, param, 0.17);
            for (let k = 0; k < 3; k++) line(0, -30, k * 13 - 12, -54);
            break;
          case 'echo':
            for (let k = 0; k < 5; k++)
              circle(k * 5, 0, 10 + k * 10, 'none', 'currentColor', 2, 1 - k * 0.15);
            break;
          case 'face':
            circle(0, 0, 40, 'currentColor', 'none', 1, 0.18);
            path('M-25 -10q10 -13 20 0M8 -10q10 -13 20 0M-22 8Q0 49 25 8Z', 'currentColor');
            break;
          case 'glitch':
            for (let k = 0; k < 6; k++)
              rect(n(-45, 20), k * 12 - 35, n(15, 70), n(3, 9), 'currentColor', n(0.3, 0.9));
            line(-45, -40, 25, -40);
            break;
          case 'flower':
            for (let k = 0; k < param; k++) {
              bits.push(`<g transform="rotate(${(k * 360) / param})">`);
              path('M0 0C-45 -26 -27 -76 0 -49C27 -76 45 -26 0 0', 'currentColor', 'none', 1, 0.5);
              bits.push('</g>');
            }
            circle(0, 0, 10, 'currentColor');
            break;
          case 'pulse':
            for (let k = 0; k < 3; k++)
              circle(0, 0, 20 + k * 15, 'none', 'currentColor', 2, 0.7 - k * 0.2);
            path('M-60 0h22l9 -14 10 34 11 -56 12 50 9 -14h47', 'none', 'currentColor', 4);
            break;
          case 'ribbon':
            path(
              'M-65 20C-20 -90 20 90 65 -20C20 55 -20 -55 -65 20Z',
              'currentColor',
              'none',
              1,
              0.25,
            );
            path('M-60 20C-20 -60 20 60 60 -20', 'none', 'currentColor', 1);
            break;
          case 'branch':
            path('M-50 48Q-5 5 40 -50M-5 5l-40 -12M10 -12l35 7', 'none', 'currentColor', 4);
            for (let k = 0; k < 7; k++) {
              const t = k * 12 - 40;
              path(`M${t} ${-t}l-12 -15 20 6Z`, 'currentColor');
            }
            break;
          case 'ember':
            path(
              'M-23 -30L8 -43 32 -8 16 33 -17 39 -36 5Z',
              'currentColor',
              'none',
              1,
              param ? 0.65 : 0.25,
            );
            circle(0, 0, 13, 'currentColor', 'none', 1, param ? 0.3 : 0.9);
            for (let k = 0; k < 4; k++) circle(n(-35, 35), n(-65, -40), 2, 'currentColor');
            break;
          case 'rain':
            path('M0 -40l-10 65', 'none', 'currentColor', 2);
            circle(-13, 34, 3, 'currentColor');
            break;
          case 'book':
            path(
              'M0 -22Q-25 -42 -48 -30v66Q-22 24 0 42Q25 24 48 36v-66Q24 -42 0 -22Z',
              'none',
              'currentColor',
              3,
            );
            line(0, -22, 0, 42);
            path('M-38 -12l25 4M-38 0l25 4M13 -8l25 -4M13 4l25 -4');
            bits.push('<g transform="translate(23 -45) scale(.25)">');
            star();
            bits.push('</g>');
            break;
          case 'glint':
            star(45, param, 0.09);
            circle(0, 0, 8, 'currentColor', 'none', 1, 0.3);
            break;
          case 'hollow':
            path(
              'M-42 -8Q-47 -48 -4 -43Q50 -56 45 1Q56 40 9 47Q-45 45 -42 -8Z',
              'none',
              'currentColor',
              6,
            );
            path('M-24 0Q-25 -28 2 -28', 'none', 'currentColor', 1);
            break;
          case 'icicle':
            path('M-24 -45L-13 20 0 65 12 5 22 -45Z', 'currentColor', 'currentColor', 2, 0.25);
            path('M0 -42V62M-20 -35L0 5 17 -28');
            break;
          case 'jumble':
            rect(-35, -25, 38, 40, 'currentColor', 0.6);
            circle(14, 11, 26, 'none', 'currentColor', 3);
            path('M-10 39L35 -27 48 36Z', 'none', 'currentColor', 3);
            break;
          case 'flame':
            path(
              'M0 50C-62 17 -26 -12 -10 -21C-4 -3 4 -20 1 -57C64 -8 49 27 0 50Z',
              'currentColor',
              'none',
              1,
              0.8,
            );
            path('M0 42Q-18 13 7 -9Q33 21 0 42Z', palette[(i + 1) % palette.length], 'none');
            break;
          case 'murmur':
            for (let k = 0; k < 4; k++)
              path(
                `M-45 ${k * 10 - 20}Q0 ${k * 10 - 45} 45 ${k * 10 - 20}`,
                'none',
                'currentColor',
                1,
                0.7 - k * 0.12,
              );
            break;
          case 'cloud':
            path(
              'M-42 25C-80 12 -56 -22 -34 -12C-32 -52 16 -55 25 -24C61 -41 80 7 48 26Z',
              'currentColor',
              'none',
              1,
              0.35,
            );
            path('M-40 34H40', 'none', 'currentColor', 2, 0.6);
            break;
          case 'eye':
            path('M-55 0Q0 -53 55 0Q0 53 -55 0Z');
            circle(0, 0, 18);
            circle(0, 0, 7, 'currentColor');
            circle(0, 0, 60, 'none', 'currentColor', 1, 0.35);
            for (let k = 0; k < 4; k++) line(-30 + k * 20, -35, -35 + k * 23, -48);
            break;
          case 'pollen':
            circle(0, 0, 28, 'currentColor', 'none', 1, 0.25);
            for (let k = 0; k < 12; k++) {
              let a = (k * Math.PI) / 6;
              line(Math.cos(a) * 25, Math.sin(a) * 25, Math.cos(a) * 40, Math.sin(a) * 40);
              circle(Math.cos(a) * 40, Math.sin(a) * 40, 3, 'currentColor');
            }
            circle(-7, -4, 4, 'currentColor');
            circle(10, 9, 3, 'currentColor');
            break;
          case 'quiver':
            path('M-35 35L0 -35 35 35M-25 37L10 -33 45 37', 'none', 'currentColor', 3);
            path('M-50 -18l-5 20M50 -18l5 20', 'none', 'currentColor', 1);
            break;
          case 'ripple':
            for (let k = 1; k <= 5; k++)
              bits.push(
                `<ellipse cx="0" cy="0" rx="${k * 13}" ry="${k * 7}" fill="none" stroke="currentColor" opacity="${1 - k * 0.13}"/>`,
              );
            break;
          case 'gear': {
            let d = '';
            for (let k = 0; k < param * 4; k++) {
              const a = (k * Math.PI * 2) / (param * 4),
                r = k % 4 < 2 ? 48 : 38;
              d += (k ? 'L' : 'M') + fmt(Math.cos(a) * r) + ' ' + fmt(Math.sin(a) * r);
            }
            path(d + 'Z', 'currentColor', 'none', 1, 0.65);
            circle(0, 0, 21, palette[(i + 1) % palette.length]);
            circle(0, 0, 8);
            break;
          }
          case 'tangle':
            path(
              'M-55 0C-60 -85 85 -40 10 30C-65 100 -20 -100 30 -20C90 70 -75 55 -55 0',
              'none',
              'currentColor',
              3,
            );
            break;
          case 'strata':
            for (let k = 0; k < 6; k++)
              path(
                `M-55 ${k * 13 - 35}q25 ${n(-20, 20)} 55 0t55 0`,
                'none',
                'currentColor',
                3 + (k % 2),
              );
            break;
          case 'tuft':
            for (let k = 0; k < 15; k++)
              path(
                `M0 45Q${k * 6 - 42} -5 ${k * 7 - 49} ${-45 + Math.abs(k - 7) * 3}`,
                'none',
                'currentColor',
                1.5,
                0.65,
              );
            break;
          case 'blob': {
            let d = '';
            for (let k = 0; k <= 80; k++) {
              const a = (k * Math.PI) / 40,
                r = 36 + 10 * Math.sin(a * param) + 4 * Math.cos(a * 3);
              d += (k ? 'L' : 'M') + fmt(Math.cos(a) * r) + ' ' + fmt(Math.sin(a) * r);
            }
            path(d + 'Z', 'currentColor', 'none', 1, 0.55);
            break;
          }
          case 'wood':
            for (let k = 1; k <= 6; k++)
              path(
                `M${-k * 8} 0C${-k * 12} ${-k * 12} ${k * 12} ${-k * 9} ${k * 9} 0C${k * 12} ${k * 10} ${-k * 11} ${k * 12} ${-k * 8} 0Z`,
              );
            break;
          case 'horizon':
            for (let k = 0; k < 4; k++)
              path(
                `M-70 ${k * 18 - 25}q35 ${-35 + k * 6} 70 0t70 0`,
                'none',
                'currentColor',
                3,
                1 - k * 0.2,
              );
            circle(20, -45, 10, 'currentColor', 'none', 1, 0.5);
            break;
          case 'wind':
            path(
              'M-65 0H25C65 0 65 -45 35 -35C15 -28 35 -10 40 -20M-45 15H5C45 15 45 55 20 40',
              'none',
              'currentColor',
              2,
            );
            break;
          case 'neuron':
            circle(0, 0, 15, 'currentColor', 'none', 1, 0.5);
            for (let k = 0; k < 7; k++) {
              bits.push(`<g transform="rotate(${(k * 360) / 7})">`);
              path('M0 0L8 -30 -5 -55M8 -30L28 -42M-5 -55L-18 -63M-5 -55L3 -70');
              bits.push('</g>');
            }
            break;
          case 'road':
            path('M-55 55Q-28 15 -5 10T30 -50M-5 10Q30 17 55 -15', 'none', 'currentColor', 7, 0.35);
            path('M-55 55Q-28 15 -5 10T30 -50', 'none', 'currentColor', 1);
            break;
          case 'valley':
            path('M-65 -42L-35 -15 -20 -30 0 35 23 -22 40 -7 65 -42M-45 -10Q0 65 48 -10');
            path('M-10 35Q0 23 12 35');
            break;
          case 'spirit':
            path(
              'M-35 -20C-45 -67 46 -65 35 -15C27 15 14 28 35 55C-4 38 -45 17 -35 -20Z',
              'currentColor',
              'none',
              1,
              0.25,
            );
            circle(-10, -24, 4, 'currentColor');
            circle(12, -24, 4, 'currentColor');
            path('M0 10q-27 30 12 45');
            break;
          case 'eddy':
            spiral(50, 2.7, 3);
            path('M35 -30l20 5 -10 -18');
            break;
          case 'fjord':
            path(
              'M-55 -55L-20 -30 -35 -5 -5 20 -20 55M55 -55L15 -25 30 0 6 30 20 55',
              'none',
              'currentColor',
              7,
            );
            path('M0 -55q-17 30 0 55t0 55', 'none', 'currentColor', 1);
            break;
          case 'dumpling':
            path('M-53 5Q0 -65 53 5Q0 60 -53 5Z', 'currentColor', 'currentColor', 2, 0.3);
            for (let k = 0; k < param; k++)
              path(`M${-38 + k * 13} ${-10 - Math.sin((k / 6) * Math.PI) * 20}l4 22`);
            break;
          case 'hyrax':
            path('M-40 25Q-55 -30 -12 -32Q40 -48 45 12L28 35Z', 'currentColor', 'none', 1, 0.35);
            circle(-19, -31, 10, 'currentColor');
            circle(17, -34, 10, 'currentColor');
            circle(29, -5, 4, 'currentColor');
            line(-25, 29, -25, 43, 5);
            line(21, 29, 21, 43, 5);
            break;
          case 'ibex':
            path('M-19 -10L0 35 20 -10 8 -23 -10 -23Z', 'currentColor', 'none', 1, 0.45);
            path(
              'M-10 -20C-67 -48 -30 -90 -15 -67M10 -20C67 -48 30 -90 15 -67',
              'none',
              'currentColor',
              6,
            );
            line(-17, -5, -35, -15);
            line(17, -5, 35, -15);
            break;
          case 'jowl':
            path(
              'M0 -35C-65 -45 -58 52 -18 48Q0 40 0 -35ZM0 -35C65 -45 58 52 18 48Q0 40 0 -35Z',
              'currentColor',
              'none',
              1,
              0.4,
            );
            path('M-12 -7Q0 8 12 -7');
            break;
          case 'snake': {
            let d = '';
            for (let k = 0; k <= 50; k++) {
              const t = k / 50;
              d += (k ? 'L' : 'M') + fmt(t * 120 - 60) + ' ' + fmt(Math.sin(t * Math.PI * 3) * 25);
            }
            path(d, 'none', 'currentColor', 12);
            for (let k = 0; k < param; k++)
              circle(
                (k * 120) / param - 60,
                Math.sin((k / param) * Math.PI * 3) * 25,
                5,
                palette[(i + 1) % palette.length],
                'none',
              );
            circle(62, 0, 10, 'currentColor');
            break;
          }
          case 'notes':
            circle(-25, 25, 11, 'currentColor');
            line(-15, 25, -15, -35, 3);
            line(-15, -35, 28, -45, 5);
            line(28, -45, 28, 15, 3);
            circle(18, 15, 11, 'currentColor');
            break;
          case 'resin':
            path('M0 -50L-33 -8 -25 30 2 45 35 15 25 -19Z', 'currentColor', 'none', 1, 0.45);
            path('M0 -50L5 5 -25 30M5 5L35 15M5 5L25 -19');
            break;
          case 'oxbow':
            path('M-40 48C-85 -65 83 -67 40 48', 'none', 'currentColor', 14, 0.35);
            path('M-40 48C-85 -65 83 -67 40 48', 'none', 'currentColor', 2);
            break;
          case 'tower':
            path(
              'M-36 55L0 -55 36 55ZM-25 20H25M-15 -10H15M-25 20L15 -10M25 20L-15 -10M-25 20L36 55M25 20L-36 55',
              'none',
              'currentColor',
              3,
            );
            line(-40, -17, 40, -17);
            break;
          case 'atom':
            for (let k = 0; k < param; k++)
              bits.push(
                `<ellipse rx="52" ry="18" fill="none" stroke="currentColor" transform="rotate(${k * 60})"/>`,
              );
            circle(0, 0, 8, 'currentColor');
            circle(40, 10, 5, 'currentColor');
            break;
          case 'pairs':
            circle(-22, 0, 22, 'currentColor', 'none', 1, 0.45);
            circle(28, 0, 22, 'none', 'currentColor', 3);
            path('M-22 32Q3 52 28 32');
            break;
          case 'harp':
            path('M-40 -45Q-10 -68 40 -25L-20 50ZM-40 -45L-20 50', 'none', 'currentColor', 5);
            for (let k = 0; k < param; k++)
              line(-30 + k * 9, -39 + k * 2, -20 + k * 3, 36 - k * 9, 1);
            break;
          case 'burst':
            star(50, param, 0.6);
            circle(0, 0, 17, palette[(i + 1) % palette.length], 'none');
            break;
          case 'uvula':
            path('M-45 30Q-45 -60 0 -50Q45 -60 45 30', 'none', 'currentColor', 5);
            path('M-8 -45L-10 3Q0 25 10 3L8 -45Z', 'currentColor', 'none', 1, 0.6);
            break;
          case 'cube':
            path('M0 -40L35 -20 35 20 0 40 -35 20 -35 -20Z', 'currentColor', 'none', 1, 0.35);
            path('M-35 -20L0 0 35 -20M0 0V40M0 -40V0');
            break;
          case 'wreck':
            path('M-45 -40L-8 -7 -19 3 22 44M-40 40L-5 16 8 25 42 -32', 'none', 'currentColor', 6);
            path('M-40 5L-13 2 -26 26ZM10 -40L37 -15 20 -5Z', 'currentColor', 'none', 1, 0.4);
            break;
          case 'ship':
            path('M-62 24H62L40 48H-35Z', 'currentColor', 'none', 1, 0.6);
            for (let k = 0; k < param; k++) {
              const x = k * 35 - 35;
              line(x, 24, x, -55 + k * 8);
              path(`M${x} ${-50 + k * 8}l30 63h-30Z`, 'currentColor', 'currentColor', 1, 0.25);
            }
            path('M-65 57q15 -8 30 0t30 0t30 0t30 0');
            break;
          case 'yolk':
            path(
              'M-50 -5Q-40 -58 -2 -40Q46 -55 53 -4Q55 48 1 42Q-59 53 -50 -5Z',
              '#ffffff',
              'currentColor',
              2,
            );
            circle(4, 0, 24, '#f4be20', 'none');
            circle(-3, -8, 6, '#ffe98a', 'none');
            break;
          case 'ferment':
            circle(0, 0, 27, 'currentColor', 'none', 1, 0.25);
            circle(24, -18, 15, 'currentColor', 'none', 1, 0.45);
            circle(-8, 6, 5, 'currentColor');
            for (let k = 0; k < 4; k++) circle(n(-30, 30), n(-70, -35), n(2, 7));
            break;
          default:
            throw Error('Unimplemented family ' + kind);
        }
        bits.push('</g>');
      }
    }
    if (globalStructure) bits.push('</g>');
    bits.push('</g>');
    return { svg: bits.join(''), name, kind, attachments };
  }
  // Prefix palettes and surface textures.
  function textureLayer(name, seed, palette) {
    const kind = traits.prefixes[name][2],
      iconSize = iconScale('prefix', name),
      { bits, n } = layer('prefix:' + name + ':' + seed),
      { path, circle, line, rect, star, spiral, leaf } = tools(bits);
    const soft = ['nap', 'haze', 'mist', 'murk', 'quiet'].includes(kind);
    const count = kind === 'quiet' ? 15 : kind === 'noise' ? 320 : soft ? 23 : 65;
    bits.push(
      `<g data-layer="prefix" data-trait="${esc(name)}" stroke-linecap="round" stroke-linejoin="round" opacity="${soft ? 0.22 : 0.45}">`,
    );
    for (let i = 0; i < count; i++) {
      const x = n(30, 770),
        y = n(30, 770),
        r = n(5, 18),
        c = palette[i % palette.length];
      bits.push(
        `<g transform="translate(${fmt(x)} ${fmt(y)}) rotate(${fmt(n(-30, 30))}) scale(${iconSize}) ${mirrorTransform(seed, 'prefix', name, i)}" color="${c}">`,
      );
      switch (kind) {
        case 'glow':
          circle(0, 0, r, 'none', 'currentColor', 6, 0.13);
          circle(0, 0, r, 'none', 'currentColor', 1);
          break;
        case 'nap':
        case 'fur':
          for (let k = 0; k < 9; k++)
            path(
              `M${k - 4} 8q${n(-5, 5)} -10 ${n(-8, 8)} -19`,
              'none',
              'currentColor',
              kind === 'nap' ? 0.6 : 1.4,
            );
          break;
        case 'splatter':
          circle(0, 0, r, 'currentColor', 'none', 1, 0.6);
          for (let k = 0; k < 5; k++)
            circle(n(-25, 25), n(-25, 25), n(1, 4), 'currentColor', 'none');
          break;
        case 'clover':
          for (const [a, b] of [
            [-5, -5],
            [5, -5],
            [-5, 5],
            [5, 5],
          ])
            circle(a, b, 6, 'currentColor', 'none');
          line(0, 5, 3, 18);
          break;
        case 'noise':
          rect(0, 0, n(1, 12), n(1, 4));
          break;
        case 'rays':
          for (let k = 0; k < 8; k++) {
            const a = (k * Math.PI) / 4;
            line(Math.cos(a) * 5, Math.sin(a) * 5, Math.cos(a) * r, Math.sin(a) * r);
          }
          break;
        case 'resin':
          path(`M0 -${r}Q${r} 5 0 ${r}Q-${r} 5 0 -${r}Z`, 'currentColor', 'none', 1, 0.35);
          circle(-3, 2, 2, 'currentColor');
          break;
        case 'speed':
        case 'ticks':
        case 'skip':
        case 'pith':
          line(
            0,
            0,
            kind === 'pith' ? 8 : r * 2,
            kind === 'ticks' ? -r : 0,
            kind === 'speed' ? 2 : 1,
          );
          if (kind === 'skip') circle(-7, 3, 2, 'currentColor');
          break;
        case 'curls':
        case 'spiral':
        case 'vortex':
          spiral(r, kind === 'vortex' ? 2.6 : 1.5, kind === 'curls' ? 1 : 2);
          break;
        case 'lightning':
          path('M0 -20L-12 2 4 -2 -5 20 20 -8 5 -5Z', 'currentColor', 'none');
          break;
        case 'frost':
          for (let k = 0; k < 6; k++) {
            bits.push(`<g transform="rotate(${k * 60})">`);
            path(
              'M0 0V-18M0 -8l-6 -5M0 -8l6 -5M0 -13l-4 -4M0 -13l4 -4',
              'none',
              'currentColor',
              0.8,
            );
            bits.push('</g>');
          }
          break;
        case 'foil':
        case 'pepper':
        case 'pigment':
          path(
            `M-${r} 0L0 -${r} ${r} 5 2 ${r / 2}Z`,
            'currentColor',
            'none',
            1,
            kind === 'foil' ? 0.8 : 0.5,
          );
          break;
        case 'haze':
        case 'murk':
          circle(0, 0, r * 4, 'currentColor', 'none', 1, 0.3);
          circle(r, -r, r * 3, 'currentColor', 'none', 1, 0.2);
          break;
        case 'facets':
          path(`M0 -${r * 2}L${r} 0 0 ${r * 2} -${r} 0Z`, 'currentColor', 'currentColor', 0.8, 0.2);
          line(0, -r * 2, 0, r * 2, 0.7);
          break;
        case 'rhythm':
          rect(0, 0, 3, r * 2);
          circle(8, 0, 3, 'currentColor');
          break;
        case 'edge':
          path('M-12 12L12 -12 4 2Z', 'currentColor', 'none');
          break;
        case 'craters':
          circle(0, 0, r, 'none', 'currentColor', 1, 0.5);
          circle(-2, 2, r * 0.7, 'none', 'currentColor', 1, 0.3);
          break;
        case 'mist':
          path('M-65 0Q0 -10 65 0', 'none', 'currentColor', 12, 0.5);
          break;
        case 'odd':
        case 'quirks':
        case 'whimsy':
          if (i % 3 === 0) spiral(r, 1);
          else if (i % 3 === 1) {
            circle(0, 0, r);
            circle(r / 3, 0, 2, 'currentColor');
          } else {
            line(-r, 0, r, 0);
            circle(0, -r, r / 3, 'currentColor');
          }
          break;
        case 'needles':
        case 'thorns':
          path(
            kind === 'needles' ? 'M-10 10L0 -20 3 8' : 'M-12 10Q5 -5 0 -20L12 4Z',
            kind === 'thorns' ? 'currentColor' : 'none',
          );
          break;
        case 'stitch':
        case 'cross':
          line(-r, -r, r, r, kind === 'cross' ? 3 : 1);
          line(r, -r, -r, r, kind === 'cross' ? 3 : 1);
          break;
        case 'rust':
          for (let k = 0; k < 8; k++) circle(n(-r, r), n(-r, r), n(0.5, 3), 'currentColor', 'none');
          break;
        case 'stars':
          star(r, 4, 0.12);
          break;
        case 'halo':
          circle(0, 0, r * 2, 'none', 'currentColor', 4, 0.2);
          circle(0, 0, r, 'none', 'currentColor', 1, 0.8);
          break;
        case 'confetti':
          rect(0, 0, r * 0.5, r);
          break;
        case 'cells':
          circle(0, 0, r);
          circle(4, 0, r * 0.4, 'currentColor', 'none', 1, 0.5);
          circle(-r, 0, 3);
          break;
        case 'sprouts':
          path('M0 16V-3');
          leaf(0, -4, 8);
          bits.push('<g transform="scale(-1 1)">');
          leaf(0, -8, 7);
          bits.push('</g>');
          break;
        case 'zest':
          path('M-8 10Q-20 -12 0 -14Q20 -12 8 3', 'none', 'currentColor', 3);
          break;
        case 'elbows':
          path('M-15 -15H5V10H19');
          break;
        case 'wind':
          path('M-40 0H10q24 0 16 -14q-10 -12 -15 0');
          break;
        case 'spots':
          circle(0, 0, r, 'currentColor', 'none', 1, 0.35);
          circle(r, 0, r * 0.6, 'currentColor', 'none', 1, 0.35);
          break;
        case 'grain':
        case 'wood':
          for (let k = 0; k < 4; k++)
            path(`M-25 ${k * 5}q25 ${-r} 50 0`, 'none', 'currentColor', kind === 'grain' ? 0.6 : 1);
          break;
        case 'stilts':
          path('M-15 25L-5 -20 5 -8 15 27');
          break;
        case 'quiet':
          circle(0, 0, 1.5, 'currentColor', 'none');
          break;
        case 'ink':
          circle(0, 0, r, 'currentColor', 'none', 1, 0.75);
          circle(r + 6, 5, 2, 'currentColor', 'none');
          break;
        case 'knots':
        case 'nubs':
          circle(0, 0, kind === 'nubs' ? 4 : r, 'currentColor', 'none', 1, 0.4);
          circle(4, -3, 2, 'currentColor', 'none');
          break;
        case 'lean':
          circle(-6, 0, r);
          circle(r, 5, r * 0.35, 'currentColor', 'none');
          break;
        case 'rips':
          path('M-15 10L-9 -12 -3 -4 5 -17 7 1 17 4Z', 'currentColor', 'none', 1, 0.6);
          break;
        case 'leaves':
          leaf(-8, 0, r);
          break;
        case 'steps':
          path('M-18 12h8V-3H2v-12h17');
          break;
        case 'bent':
          path('M-15 -7L7 -18 4 0 20 12 -13 20Z');
          break;
        case 'yap':
          path('M-15 0l10 -5M-10 10l10 -10M0 15V5');
          break;
        case 'zones':
          circle(0, 0, r * 2, 'currentColor', 'none', 1, 0.15);
          circle(0, 0, r, 'none', 'currentColor', 2);
          break;
        default:
          throw Error('Unimplemented texture ' + kind);
      }
      bits.push('</g>');
    }
    bits.push('</g>');
    return bits.join('');
  }
  // Suffix details use the recorded family coordinate frames, never canvas positions.
  function suffixLayer(name, seed, palette, family) {
    const [kind, count, scale] = traits.suffixes[name],
      iconSize = iconScale('suffix', name),
      { bits, n } = layer('suffix:' + name + ':' + seed),
      { path, circle, line, rect, star, spiral } = tools(bits);
    bits.push(
      `<g data-layer="suffix" data-trait="${esc(name)}" data-family="${esc(family.name)}" stroke-linecap="round" stroke-linejoin="round" opacity="0.78">`,
    );
    const bubble = (x = 0, y = 0, r = 17) => {
      circle(x, y, r, 'none', 'currentColor', 1.5);
      path(`M${x - r / 2} ${y + r * 0.8}l-5 10 13 -7`);
    };
    const sound = (r = 20) => {
      for (let k = 0; k < 3; k++)
        path(`M${k * 9} -${r + k * 5}Q${r + k * 18} 0 ${k * 9} ${r + k * 5}`);
    };
    // Spread the suffix's detail budget across existing family parts.
    const detailCount = Math.min(count, family.attachments.length);
    for (let i = 0; i < detailCount; i++) {
      const attachment =
        family.attachments[Math.floor((i * family.attachments.length) / detailCount)];
      const x = n(-0.25, 0.25) * attachment.extent,
        y = n(-0.25, 0.25) * attachment.extent,
        size = ((scale / 35) * n(0.7, 1.2) * attachment.extent) / 100;
      bits.push(
        `<g data-family-part="${attachment.id}" transform="${attachment.transform}"><g transform="translate(${fmt(x)} ${fmt(y)}) rotate(${fmt(n(-20, 20))}) scale(${fmt(size * iconSize)}) ${mirrorTransform(seed, 'suffix', name, i)}" color="${attachment.color}">`,
      );
      switch (kind) {
        case 'sneeze':
          for (let k = 0; k < 11; k++) {
            const a = n(-0.65, 0.65),
              r = n(8, 50);
            circle(Math.cos(a) * r, Math.sin(a) * r, n(1, 3), 'currentColor', 'none');
          }
          path('M-8 -6L0 0 -8 6');
          break;
        case 'wave':
          path('M-45 0q12 -25 24 0t24 0t24 0');
          break;
        case 'giggle':
          path('M-24 -6q8 10 16 0M7 -6q8 10 16 0M-15 8q15 25 30 0', 'none', 'currentColor', 3);
          break;
        case 'whisper':
          path('M-45 0Q0 -12 45 0', 'none', 'currentColor', 0.7, 0.4);
          path('M-30 8Q0 0 25 8', 'none', 'currentColor', 0.7, 0.2);
          break;
        case 'bounce':
          path('M-45 20q18 -65 36 0q12 -40 24 0');
          circle(22, 15, 7, 'currentColor', 'none');
          line(-40, 24, 36, 24, 1);
          break;
        case 'fizzle':
          for (let k = 0; k < 7; k++) {
            const r = 6 - k * 0.7;
            circle(k * 10 - 35, Math.sin(k * 2) * 10, r, 'currentColor', 'none', 1, 1 - k * 0.12);
          }
          break;
        case 'bumble':
          path('M-40 20C-60 -40 35 -35 8 5C-20 45 -10 -35 40 -12');
          circle(42, -12, 4, 'currentColor');
          break;
        case 'crack':
          path('M-40 -25L-12 -10 -23 3 5 9 13 32M-12 -10L2 -28 25 -22M5 9L35 2');
          break;
        case 'doodle':
          path('M-40 0C-35 -45 30 -35 15 0S-35 30 -15 -5S45 -10 40 20');
          break;
        case 'flutter':
          path('M0 15C-52 -10 -30 -45 0 -10C30 -45 52 -10 0 15M0 -10V25');
          break;
        case 'glimpse':
          path('M-30 0Q0 -15 30 0');
          circle(0, -2, 4, 'currentColor', 'none');
          break;
        case 'hiccup':
          path('M-35 15h12m8 -10l8 -25 8 25m10 10h12');
          break;
        case 'bell':
          path(
            'M-20 15Q-12 0 -13 -15Q0 -35 13 -15Q12 0 20 15ZM-8 22Q0 33 8 22M-25 -15l-8 -6M25 -15l8 -6',
          );
          break;
        case 'explosion':
          star(43, 13, 0.42);
          circle(0, 0, 14, palette[i % palette.length], 'none');
          for (let k = 0; k < 5; k++) {
            const a = (k * Math.PI * 2) / 5;
            line(Math.cos(a) * 49, Math.sin(a) * 49, Math.cos(a) * 62, Math.sin(a) * 62);
          }
          break;
        case 'lob':
          path('M-45 25Q0 -70 45 25');
          circle(45, 25, 6, 'currentColor', 'none');
          break;
        case 'mizzle':
          for (let k = 0; k < 5; k++) line(k * 8 - 20, -10, k * 8 - 23, 5, 0.7);
          break;
        case 'nuzzle':
          path('M-30 -20Q10 0 -10 25M30 -20Q-10 0 10 25', 'none', 'currentColor', 4);
          circle(0, 2, 2, 'currentColor');
          break;
        case 'puffin':
          path('M-13 29C-32 -2 -12 -36 8 -22C30 -10 22 15 14 30Z', 'currentColor', 'none', 1, 0.35);
          path('M12 -14L34 -5 14 1Z', 'currentColor');
          circle(7, -12, 3, 'currentColor');
          path('M-8 25l-10 12M8 25l10 12');
          break;
        case 'quibble':
          bubble(-20, 0, 16);
          bubble(20, 0, 16);
          path('M-13 0h-12M14 0h12');
          break;
        case 'razzle':
          star(25, 5, 0.3);
          path('M30 -35q25 12 0 25t0 25');
          break;
        case 'snicker':
          path('M-25 5Q0 32 28 -1M-20 -9l11 -3M12 -13l8 1', 'none', 'currentColor', 3);
          break;
        case 'tizzy':
        case 'rumpus':
          for (let k = 0; k < 4; k++)
            path(
              `M${n(-30, 30)} ${n(-30, 30)}q${n(-60, 60)} ${n(-60, 60)} ${n(-30, 30)} ${n(-30, 30)}`,
            );
          if (kind === 'rumpus') star(18, 7, 0.5);
          break;
        case 'uproar':
          sound(23);
          path('M-15 -10L0 -20V20L-15 10Z', 'currentColor');
          break;
        case 'vizzle':
          path('M-35 -20L-15 20 5 -20M-12 -20L8 20 28 -20M12 -20L32 20 52 -20');
          break;
        case 'wobble':
          path(
            'M-40 0C-30 -45 0 -10 15 -35C60 -20 25 12 40 28C0 50 -10 10 -30 25C-48 20 -45 8 -40 0Z',
          );
          break;
        case 'xizzle':
          for (let k = 0; k < 3; k++) {
            const x = k * 18 - 18;
            line(x - 7, -10, x + 7, 10);
            line(x + 7, -10, x - 7, 10);
          }
          circle(30, -18, 2, 'currentColor');
          break;
        case 'yapper':
          for (let k = 0; k < 3; k++)
            path(`M${k * 20 - 30} -15l12 15 -12 15`, 'none', 'currentColor', 3);
          break;
        case 'zinger':
          path('M-50 10L40 -10 10 13 45 22Z', 'currentColor', 'none');
          break;
        case 'babble':
          bubble(-20, -7, 16);
          bubble(13, 2, 19);
          bubble(-6, 22, 12);
          break;
        case 'chirp':
          path('M-20 12Q-14 -10 0 -8M-3 17Q8 -4 22 1');
          break;
        case 'doink':
          circle(0, 0, 14);
          path('M0 -17l-12 -9 21 -7 -13 -9M-28 17H28');
          break;
        case 'flump':
          path(
            'M-45 15Q-45 -4 -22 5Q0 -13 22 5Q45 -4 45 15Q0 32 -45 15Z',
            'currentColor',
            'none',
            1,
            0.35,
          );
          line(-30, 30, 30, 30);
          break;
        case 'grizzle':
          for (let k = 0; k < 10; k++)
            path(`M${k * 6 - 30} 15l${n(-10, 10)} -30`, 'none', 'currentColor', 1);
          break;
        case 'honk':
          path('M-30 -8H-12L13 -23V23L-12 8H-30Z');
          bits.push('<g transform="translate(20 0)">');
          sound(14);
          bits.push('</g>');
          break;
        case 'jounce':
          path('M-40 20q10 -40 20 0t20 0t20 0t20 0');
          line(-42, 26, 42, 26, 1);
          break;
        case 'klaxon':
          path('M-20 12V-12L5 -30 25 -12V12ZM-28 18H33', 'none', 'currentColor', 3);
          path('M-30 -17l-12 -10M4 -37V-50M33 -17l12 -10');
          break;
        case 'lurk':
          path('M-40 20Q-50 -20 0 -30Q50 -20 40 20Z', 'currentColor', 'none', 1, 0.13);
          path('M-25 0l15 -5M10 -5l15 5', 'none', 'currentColor', 2, 0.5);
          break;
        case 'mump':
          for (const [a, b, r] of [
            [-18, 5, 16],
            [6, -8, 21],
            [22, 13, 15],
          ])
            circle(a, b, r, 'currentColor', 'none', 1, 0.3);
          break;
        case 'nerp':
          path('M-12 -12Q-12 -38 10 -28Q32 -15 5 -1V10');
          circle(5, 23, 3, 'currentColor', 'none');
          break;
        case 'plonk':
          circle(0, 8, 16, 'currentColor', 'none');
          line(-35, 27, 35, 27, 4);
          path('M-26 10l-8 -8M26 10l8 -8');
          break;
        case 'quonk':
          bits.push(
            '<ellipse rx="30" ry="17" fill="none" stroke="currentColor" stroke-width="3"/>',
          );
          path('M25 8l15 10 -7 8');
          break;
        case 'skitter':
          path('M-28 -15l-10 10 10 10M-8 -8l-10 10 10 10M12 -15L2 -5 12 5M32 -8L22 2 32 12');
          break;
        case 'thunk':
          rect(-18, -12, 36, 32, 'currentColor', 0.5);
          path('M-35 28H35M-27 10l-12 -8M27 10l12 -8', 'none', 'currentColor', 3);
          break;
        case 'zipper':
          path('M-35 -35L-8 0V40M35 -35L8 0V40');
          for (let k = 0; k < 6; k++) {
            rect(-14, k * 7 - 2, 11, 3);
            rect(3, k * 7 + 1, 11, 3);
          }
          break;
        case 'vroom':
          for (let k = 0; k < 4; k++)
            path(
              `M${-50 + k * 7} ${k * 10 - 15}h${80 - k * 12}`,
              'none',
              'currentColor',
              3 - k * 0.5,
            );
          path('M25 -25l20 25 -20 25');
          break;
        case 'whomp':
          path(
            'M-40 15Q-66 -12 -35 -17Q-32 -53 -5 -32Q22 -55 32 -24Q65 -21 42 12Q20 46 0 25Q-22 43 -40 15Z',
            'currentColor',
            'none',
            1,
            0.35,
          );
          path('M-60 22l-10 5M55 22l12 5M0 -48V-60');
          break;
        case 'xyzzle':
          path('M-30 -25L-8 -5 -20 7 28 25M28 -25L8 -5 20 7 -30 25', 'none', 'currentColor', 3);
          break;
        case 'yowl':
          for (let k = 0; k < 3; k++)
            path(`M-45 ${k * 13}Q-10 ${-35 + k * 13} 10 ${k * 13}T50 ${k * 13}`);
          break;
        case 'zonk':
          path('M-30 -25H-5L-30 0H-5M5 3H35L5 30H35', 'none', 'currentColor', 3);
          break;
        default:
          throw Error('Unimplemented suffix ' + kind);
      }
      bits.push('</g></g>');
    }
    bits.push('</g>');
    return bits.join('');
  }
  // Smooth closed specimen boundary. The seed alone controls its proportions and lobes.
  function cropParameters(seed) {
    const rng = random('crop:v1:' + String(seed));
    return {
      radius: 338 + rng() * 12,
      stretch: 0.91 + rng() * 0.18,
      rotation: rng() * Math.PI * 2,
      lobes: 3 + Math.floor(rng() * 4),
      amplitude: 10 + rng() * 17,
      secondary: 4 + rng() * 8,
      phase: rng() * Math.PI * 2,
      phase2: rng() * Math.PI * 2,
    };
  }
  function cropPath(seed) {
    const p = cropParameters(seed),
      points = [];
    for (let i = 0; i < 64; i++) {
      const a = (i * Math.PI) / 32,
        r =
          p.radius +
          p.amplitude * Math.sin(a * p.lobes + p.phase) +
          p.secondary * Math.sin(a * (p.lobes + 1) + p.phase2);
      const x = Math.cos(a) * r * p.stretch,
        y = (Math.sin(a) * r) / p.stretch;
      points.push([
        400 + x * Math.cos(p.rotation) - y * Math.sin(p.rotation),
        400 + x * Math.sin(p.rotation) + y * Math.cos(p.rotation),
      ]);
    }
    const at = (i) => points[(i + 64) % 64],
      pair = (v) => v.map(fmt).join(' ');
    let d = 'M' + pair(points[0]);
    for (let i = 0; i < 64; i++) {
      const a = at(i - 1),
        b = at(i),
        c = at(i + 1),
        e = at(i + 2);
      d +=
        'C' +
        pair([b[0] + (c[0] - a[0]) / 6, b[1] + (c[1] - a[1]) / 6]) +
        ' ' +
        pair([c[0] - (e[0] - b[0]) / 6, c[1] - (e[1] - b[1]) / 6]) +
        ' ' +
        pair(c);
    }
    return d + 'Z';
  }
  // Recipe validation and final SVG composition.
  function render(recipe, catalog) {
    const { prefix, family, suffix } = recipe,
      seed = String(recipe.seed);
    for (const k of ['prefix', 'family', 'suffix'])
      if (!catalog[k].includes(recipe[k])) throw Error('Unknown ' + k);
    const [bg, colors] = traits.prefixes[prefix],
      palette = colors.split(' ');
    const title = [prefix, family, suffix].join(' ');
    const application = familyLayer(family, seed, palette);
    return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="1200" viewBox="0 0 800 800"><title>${esc(title)}</title><desc>Funfection Art Lab. Semantic recipe version 3. Seed: ${esc(seed)}. ${esc(traits.prefixes[prefix][3])}; ${esc(traits.families[family][4])}; ${esc(traits.suffixes[suffix][3])}.</desc><defs><clipPath id="art-crop"><path d="${cropPath(seed)}"/></clipPath></defs><g clip-path="url(#art-crop)"><rect width="800" height="800" fill="${bg}"/>${textureLayer(prefix, seed, palette)}${application.svg}${suffixLayer(suffix, seed, palette, application)}</g></svg>`;
  }
  root.FunfectionArt = {
    render,
    hash,
    traits,
    familyApplication: familyLayer,
    cropPath,
    cropParameters,
    iconScale,
    config,
    mirroringParameters,
    mirrorFor,
  };
  if (typeof module !== 'undefined') module.exports = root.FunfectionArt;
})(globalThis);
