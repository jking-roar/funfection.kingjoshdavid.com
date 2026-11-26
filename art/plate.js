/* Presentation-only slide, deterministic for the complete virus recipe. */
(function (root) {
  'use strict';
  function render(recipe) {
    let state = 2166136261;
    for (const ch of JSON.stringify([
      recipe.prefix,
      recipe.family,
      recipe.suffix,
      String(recipe.seed),
    ]))
      state = Math.imul(state ^ ch.charCodeAt(0), 16777619);
    const random = () => {
      state += 0x6d2b79f5;
      let t = state;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    const n = (a, b) => +(a + random() * (b - a)).toFixed(2);
    const tilt = n(-7, 7),
      hue = n(193, 218),
      side = random() > 0.5;
    const bits = [
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 950" preserveAspectRatio="none"><defs><linearGradient id="plate-glass" x2="${n(0.2, 1)}" y2="${n(0.2, 1)}"><stop stop-color="#ffffff" stop-opacity=".88"/><stop offset="${n(0.3, 0.7)}" stop-color="hsl(${hue} 25% 86%)" stop-opacity=".42"/><stop offset="1" stop-color="#ffffff" stop-opacity=".8"/></linearGradient></defs><rect x="5" y="5" width="790" height="940" rx="${n(5, 20)}" fill="url(#plate-glass)" stroke="#b8c9d3" stroke-width="2"/>`,
    ];
    // An offset, imperfect coverslip rather than the same centered ellipse.
    const cx = n(360, 440),
      cy = n(415, 515),
      rx = n(270, 360),
      ry = n(290, 390);
    bits.push(
      `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" transform="rotate(${tilt} ${cx} ${cy})" fill="none" stroke="#8da9b6" stroke-opacity="${n(0.12, 0.3)}" stroke-width="${n(1, 3)}"/>`,
    );
    const sheen = n(80, 550),
      width = n(30, 150);
    bits.push(
      `<path d="M${sheen} 8h${width}L${sheen + width + 170} 942h-${width}Z" fill="#ffffff" opacity="${n(0.12, 0.4)}"/>`,
    );
    for (let i = 0, count = 3 + Math.floor(random() * 6); i < count; i++) {
      const x = n(30, 770),
        y = n(95, 865),
        r = n(6, 32);
      bits.push(
        `<circle cx="${x}" cy="${y}" r="${r}" fill="none" stroke="#92abb7" stroke-width="${n(0.7, 1.8)}" opacity="${n(0.08, 0.25)}"/>`,
      );
    }
    for (let i = 0, count = 4 + Math.floor(random() * 9); i < count; i++) {
      const x = n(25, 760),
        y = n(90, 880);
      bits.push(
        `<path d="M${x} ${y}l${n(-30, 30)} ${n(5, 65)}" stroke="#91a7b4" stroke-width="${n(0.5, 1.4)}" opacity="${n(0.08, 0.21)}"/>`,
      );
    }
    const labelX = side ? 38 : 470,
      labelY = n(30, 53);
    bits.push(
      `<g transform="translate(${labelX} ${labelY}) rotate(${n(-3, 3)})"><rect width="285" height="39" rx="2" fill="#ffffff" opacity=".65"/><text x="10" y="25" font-family="monospace" font-size="15" fill="#607b8a">FUNFECTION</text></g>`,
    );
    bits.push('</svg>');
    return bits.join('');
  }
  // Bake display-space stroke floors into SVG units at a 320px specimen width.
  // Compensate for nested motif scales so small instances remain readable.
  // The resulting strokes then scale proportionally in every view and export.
  function scalableStrokes(specimen) {
    const scales = [1];
    return specimen.replace(/<\/?[a-zA-Z][^>]*>/g, (tag) => {
      if (tag.startsWith('</')) {
        scales.pop();
        return tag;
      }
      let scale = scales[scales.length - 1];
      const transform = tag.match(/\btransform="([^"]*)"/)?.[1] || '';
      for (const match of transform.matchAll(/scale\(\s*([-\d.]+)(?:[ ,]+([-\d.]+))?\s*\)/g))
        scale *= Math.abs(Number(match[1]));
      if (tag.includes('vector-effect="non-scaling-stroke"')) {
        tag = tag.replace(/ stroke-width="([^"]+)"/,
          (_, width) => ` stroke-width="${Number((Number(width) * 2.5 / scale).toFixed(5))}"`)
          .replace(' vector-effect="non-scaling-stroke"', '');
      }
      if (!tag.endsWith('/>')) scales.push(scale);
      return tag;
    });
  }
  // Compose the same glass and specimen into one standalone export.
  function compose(recipe, specimen) {
    const glass = render(recipe).replace(/^<svg[^>]*>/, '').replace(/<\/svg>$/, '');
    const artwork = scalableStrokes(specimen).replace(/^<svg[^>]*>/,
      '<svg x="32" y="64" width="736" height="736" viewBox="0 0 800 800">');
    return `<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="1900" viewBox="0 0 800 950">${glass}${artwork}</svg>`;
  }
  root.FunfectionPlate = { render, compose };
  if (typeof module !== 'undefined') module.exports = root.FunfectionPlate;
})(globalThis);
