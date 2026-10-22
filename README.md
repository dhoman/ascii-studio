# ascii-studio

Exploring character-based visuals: a browser ASCII lab (image, video, webcam) first, then a small game built on whatever look survives motion and interaction.

## Milestones

- **A. ASCII lab:** image, then video, then webcam input; glyph ramp, palette, and contrast controls; presets you can save and reload; screenshot export.
- **B. Tiny explorable scene:** a clearing with grass, a stone structure, one light, fog, and water, with a toggle between normal and ASCII rendering.
- **C. One interaction loop:** explore, activate something, face one obstacle, reach an outcome, restart.

## Architecture

Input (camera / video / scene), then style (glyphs, palette, effects), then render (display / export). Game simulation stays separate from all of these.

Start with textmode.js. Bring in Three.js once Milestone B needs it.

See `docs/brief.md` for the original planning notes.

## Run the still-image lab

Requires a modern Node.js installation and a browser with WebGL2 (Safari or Chrome on the Mac).

```sh
npm ci
npm run dev
```

Open http://localhost:5173/ on the Mac. The container listens on 0.0.0.0:5173; Docker must publish container port 5173 to host port 5173. Binding inside the container alone does not establish the host mapping.

The lab loads JPGs from `references/` with the original beside a monochrome character rendering. Grid density changes character columns; contrast changes the input luminance; the editable glyph ramp runs dark to light (leading spaces matter). Reset restores the style, not the source. No uploads or camera access occur.

```sh
npm test             # source-independent style math
npm run build        # strict TypeScript check + production bundle
npx playwright install chromium
npm run test:browser # run while the dev server is listening
```

For a preinstalled Chromium, set `AGENT_BROWSER_EXECUTABLE_PATH` to its executable before running browser tests. Screenshots and test artifacts go in ignored `captures/`.

Rendering ownership is in `docs/decisions.md`; asset provenance is in `docs/assets.md`. This first slice does not include video, webcam, palette controls, preset save/load, or export.
