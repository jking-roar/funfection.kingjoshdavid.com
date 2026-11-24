# funfection.kingjoshdavid.com
Site for the funfection app

## Code map

Each interactive page keeps its markup in `index.html`, presentation in
`style.css`, and browser behavior in `app.js`, next to one another in its
route directory. The small infection redirect only needs HTML and JavaScript.
No build step or framework is required; serve this directory as a static site.

| Directory | Purpose | Where to start |
| --- | --- | --- |
| `art/` | Deterministic artwork, recipes, exports, and session history | `app.js` for UI; see the renderer map below |
| `tiles/` | Pixel tile editor, mirroring, and repeat previews | `app.js` |
| `svg/editor/` | SVG markup editor and live preview | `app.js` |
| `canarysplode/` | Interactive canary experiment | `app.js` |
| `virus-hunt/` | Browser virus hunt | `app.js` |
| `infect/` | Redirect shared infection links to Android | `app.js` |
| `tests/` | Node behavior tests for Art Lab and tiles | `art.test.cjs`, `tiles.test.cjs` |
| `.well-known/` | Android App Links verification | `assetlinks.json` |

### Art Lab renderer map

| File | Responsibility |
| --- | --- |
| `catalog.js` | Browser category lists, preserving enum order |
| `prefix.json`, `family.json`, `suffix.json` | Category snapshots checked against the catalog |
| `traits.js` | Named visual interpretations; tuple fields are documented above each map |
| `config.js` | Default and per-category icon scales |
| `art.js` | Seeded randomness, SVG primitives, family/prefix/suffix layers, crop, final composition |
| `plate.js` | Seeded microscope-slide overlay |
| `app.js` | Form and URL state, history, rendering, downloads, clipboard, initialization |

Art Lab loads its classic scripts in dependency order: catalog, traits, config,
renderer, plate, then UI. Keep that order when adding scripts. The renderer,
traits, configuration, and plate also support Node's `require` for tests.

### Local checks and formatting

From this directory, run all behavior tests:

```bash
node --test tests/*.test.cjs
```

Formatting uses the checked-in `.prettierrc.json`. With Node and npm available:

```bash
npx --yes prettier@3.10.1 --check "**/*.{html,css,js,cjs,json}"
npx --yes prettier@3.10.1 --write "**/*.{html,css,js,cjs,json}"
```

Format changes separately from behavior changes when possible. Keep each page's
assets local to its route, and preserve seeded random-call order within a rendering version; document intentional
composition changes with a renderer version bump.

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

The tests execute `tiles/app.js` in an isolated VM
with a small DOM/canvas harness. They cover mirroring, torus and Möbius seam
parity, topology labels and canvas transforms, palette/custom colors and
`aria-pressed`, erasing and Clear all, resize preservation, preview counts,
pointer events and coordinate mapping, and animation-frame render batching.
Canvas calls and event handlers are tested; browser rasterization, native
pointer capture, and visual layout still require a browser check.


## Art Lab

`/art/` makes deterministic abstract SVG artwork from the Funfection prefix, family, and suffix categories. Select any category, generate a random recipe or a new seed variation, copy a repeatable recipe URL, or export SVG / 1600 × 1600 PNG. Everything runs locally in the browser with no API keys or external dependencies.

The catalog is a snapshot of the display names from `jking-roar/infection` at commit `6826faa230564528f8c2e7c20699c4f72b5aec88`, under `app/src/main/java/com/kingjoshdavid/funfection/model/viral/enums/{Prefix,Family,Suffix}.java`. Catalog snapshots preserve enum order; dropdowns display the names alphabetically. Prefix controls palette/texture; family controls topology, density, and geometry; suffix augments recorded family parts with local gesture details. These are new art interpretations, not visuals copied from the Android app. Recipe rendering now uses semantic version 5; see below.

To update categories, update the three JSON snapshots and `art/catalog.js` together, preserving existing order. Keep private repository access out of the browser.

Run art checks with `node --test tests/art.test.cjs`.

Art Lab displays circular specimens at half the original width and height (one quarter of the area). SVG clipping is embedded in the artwork so both SVG and PNG downloads have transparent pixels outside the circle; the background inside the circle remains part of the recipe. Export resolutions remain 1200 × 1200 SVG / 1600 × 1600 PNG. Session history beside the current specimen keeps the latest 60 distinct recipes, including live seed edits, and clicking a thumbnail restores its controls and download content. Seed changes apply on every input event, not blur. History resets on page reload; copied recipe links remain repeatable.

### Semantic art recipes (version 4)

`art/traits.js` explicitly defines every prefix, family, and suffix by name. Prefixes choose a named palette and surface treatment; families choose meaningful motifs and composition; suffixes add gestures attached to the family geometry. The current interpretation is shown below the artwork. No visual mappings use enum indices, so reordering categories does not change their behavior.

Examples: Frosty adds blue frost crystals; Amber adds amber resin inclusions; Bramble draws thorny branches; Gyoza draws pleated dumplings; Xebec draws three-masted ships; Crackle adds fractures; Unzip adds zipper teeth. The mappings are artistic interpretations, including coined names whose meanings are open-ended.

Each category has a random stream derived from its own name and the seed. The family application records attachment IDs, exact transforms (including scale and mirroring), color, and local detail extent. Suffixes use those coordinate frames to decorate family parts rather than scattering independent symbols; Lattice uses visible mesh nodes and Nexus uses network nodes. Changing family also changes suffix placement. The suffix scale override controls local detail size relative to its family part. These records are regenerated deterministically, so recipe URLs and exports require no extra stored state. Changing a suffix preserves family geometry and prefix texture. Changing a prefix recolors the family and suffix while preserving their geometry. Editing the seed varies all three layers. Version 4 replaces independent suffix placement and overlapping body clusters: existing URLs retain their selections but render the new semantic artwork. Circular clipping, transparent exports, and session history remain in place.

### Icon scale configuration

Edit `art/config.js` to change `iconScale` (default `2`, twice the original linear size). The `categories.prefix`, `categories.family`, and `categories.suffix` maps accept an override for **any exact category name**, replacing the default:

```js
const config = {
  iconScale: 2,
  categories: {
    prefix: { Frosty: 3 },
    family: { Lattice: 1.5, Gyoza: 2.5 },
    suffix: { Crackle: 1 }
  }
};
```

All values must be positive finite numbers. `1` restores original dimensions, `2` doubles width and height (four times area). The centered family body and its adornments scale together around the body center. The Lattice and Nexus structures scale as complete compositions around the specimen center. Strokes scale with the shapes. The crop, specimen background, microscope slide, and export dimensions are unaffected. Changing the shared configuration changes rendering for existing recipe URLs. Bump the asset version when deploying config changes.

### Body and adornment composition (version 4)

Each family now draws one centered, fitted body instead of a random pile of
repeated motifs. Prefix texture is sparse and subdued to keep the body readable.
Lattice and Nexus retain their connected structures at specimen scale.

The named `adornments` profiles in `art/traits.js` define SVG-local surface
landmarks as `[x, y, outwardAngle]`, a body radius for fitting, and a
family-specific suffix radius. Fable uses its two page edges and lower spine;
Oracle uses the eye corners and upper orbital rim. Every family has an explicit
profile. Lattice and Nexus attach to three recorded nodes in the drawn structure.

The family application records the complete body frame plus each landmark's
translation and outward rotation. Suffix rendering inherits that entire frame,
including reflection and scale, and places at most three details at those points.
No random canvas positions or center jitter are used for adornments. The suffix
scale override adjusts these local details, while the family scale adjusts the
body and its attachments together. Profiles are regenerated from the seed; no
extra recipe state is needed. Version 4 intentionally changes existing recipe
artwork while preserving recipe URLs, exports, and history behavior.

### Seeded adornment poses and palette variation (version 5)

A dedicated attachment stream selects one or two distinct family landmarks.
Each attachment records a rotation range (22 degrees at top/bottom landmarks,
35 degrees at side landmarks) and a jitter fraction (0.18 of its detail radius).
Family profiles may override these through `rotationRange` and `jitter`.
Suffix details get a bounded local rotation, outward/tangential offset, and
eight-percent size variation, all inherited through the body's transform.

Lattice detail radii compensate for mesh scaling, keeping a minimum 56-unit
radius in specimen space at the default icon scale. Eligible mesh attachment
nodes remain within 205 units of the center so larger adornments have room
inside the crop. Explicit scale overrides still apply.

Each prefix palette receives one shared, seeded hue rotation within ±12 degrees.
Background and palette colors preserve HSL saturation and lightness, so neutrals
stay neutral and the palette keeps its relationships. Palette, body, attachment,
and gesture random streams are independent. Reopening a recipe reproduces its
colors and poses exactly. Version 5 intentionally updates existing recipe art.
