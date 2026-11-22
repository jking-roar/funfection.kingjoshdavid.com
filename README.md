# funfection.kingjoshdavid.com
Site for the funfection app

## Setup

This is a GitHub Pages site that serves as the Android App Links verification domain for the Funfection Android app. It handles deep-link URLs of the form:

```
https://funfection.kingjoshdavid.com/infect?code=PUT_CODE_HERE#and.various.fragment.details.here
```

### Before deploying

Replace the placeholder SHA-256 fingerprint in `.well-known/assetlinks.json` with the actual signing certificate fingerprint from your Android app. You can retrieve it by running:

```bash
keytool -list -v -keystore <your-keystore>.jks -alias <your-alias> 2>/dev/null | grep SHA256
```

Leaving the placeholder value in place will cause Android App Links verification to fail and the OS will not open the app when the link is tapped.

## SVG editor endpoint

This site now also serves an in-browser SVG editor at:

- `https://funfection.kingjoshdavid.com/svg/editor`

The page lets you open local `.svg` files, edit markup with a live preview, insert common shapes, click previewed elements to jump to source lines, and download the updated SVG.

## Tile image maker endpoint

This site also serves an in-browser tile image maker at:

- `https://funfection.kingjoshdavid.com/tiles/`

The page provides a configurable square pixel tile canvas, color palette with eraser and clear-all tools, adjustable repeated previews, edit mirroring across horizontal/vertical axes, and torus or Möbius-style repeat previews.

### Tile behavior tests

Run with Node.js 18 or newer; no packages or installation are required:

```bash
node --test tests/tiles.test.cjs
```

The tests execute the inline script from `tiles/index.html` in an isolated VM
with a small DOM/canvas harness. They cover mirroring, torus and Möbius seam
parity, topology labels and canvas transforms, palette/custom colors and
`aria-pressed`, erasing and Clear all, resize preservation, preview counts,
pointer events and coordinate mapping, and animation-frame render batching.
Canvas calls and event handlers are tested; browser rasterization, native
pointer capture, and visual layout still require a browser check.


## Art Lab

`/art/` makes deterministic abstract SVG artwork from the Funfection prefix, family, and suffix categories. Select any category, generate a random recipe or a new seed variation, copy a repeatable recipe URL, or export SVG / 1600 × 1600 PNG. Everything runs locally in the browser with no API keys or external dependencies.

The catalog is a snapshot of the display names from `jking-roar/infection` at commit `6826faa230564528f8c2e7c20699c4f72b5aec88`, under `app/src/main/java/com/kingjoshdavid/funfection/model/viral/enums/{Prefix,Family,Suffix}.java`. Enum order is significant to the renderer. Prefix controls palette/texture; family controls topology, density, and geometry; suffix controls gesture marks. These are new art interpretations, not visuals copied from the Android app. Recipe rendering is version 1; preserve it to keep existing links reproducible.

To update categories, update the three JSON snapshots and `art/catalog.js` together, preserving existing order. Keep private repository access out of the browser.

Run art checks with `node --test tests/art.test.cjs`.

Art Lab displays circular specimens at half the original width and height (one quarter of the area). SVG clipping is embedded in the artwork so both SVG and PNG downloads have transparent pixels outside the circle; the background inside the circle remains part of the recipe. Export resolutions remain 1200 × 1200 SVG / 1600 × 1600 PNG. Session history beside the current specimen keeps the latest 60 distinct recipes, including live seed edits, and clicking a thumbnail restores its controls and download content. Seed changes apply on every input event, not blur. History resets on page reload; copied recipe links remain repeatable.
