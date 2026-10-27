# ascii-studio

## Sindri hero gallery

Open **http://localhost:5173/sindri.html** for 20 animated hero studies, separate from the existing media lab. The contact sheet compares ASCII, ordered dithering, pixels, halftone, edge contours, hatching, and ember particles. Select a card for a live hero mockup; star directions to keep a browser-local shortlist. Pause, replay the strike, change pace, hide copy, and export the artwork PNG or reproducibility JSON. Direct links use the look ID in the URL hash.

Sindri is an original code-drawn dwarf illustration, not a supplied or licensed character model. Scene, animation timing, presets, and treatment are separate modules. This is a 2D look-development prototype, not the future Three.js scene renderer. Reduced-motion preferences start the preview paused; hidden tabs do not advance the scene. No media-lab inputs or cameras are started by this page.

`node scripts/capture-sindri.mjs` captures all 20 directions and a four-look MP4 under ignored `captures/sindri/` (requires Chromium and system ffmpeg with libx264). Set `AGENT_BROWSER_EXECUTABLE_PATH` for the installed Chromium. The capture is deterministic browser rendering, not a target-device benchmark.

Exploring character-based visuals: a browser ASCII lab (image, video, webcam) first, then a small game built on whatever look survives motion and interaction.

## Milestones

- **A. ASCII lab:** image, then video, then webcam input; glyph ramp, palette, and contrast controls; presets you can save and reload; screenshot export.
- **B. Tiny explorable scene:** a clearing with grass, a stone structure, one light, fog, and water, with a toggle between normal and ASCII rendering.
- **C. One interaction loop:** explore, activate something, face one obstacle, reach an outcome, restart.

## Architecture

Input (camera / video / scene), then style (glyphs, palette, effects), then render (display / export). Game simulation stays separate from all of these.

Start with textmode.js. Bring in Three.js once Milestone B needs it.

See `docs/brief.md` for the original planning notes.

## Run the media lab (Milestone A)

Requires a modern Node.js installation and a browser with WebGL2 (Safari or Chrome on the Mac).

```sh
npm ci
npm run dev
```

Open http://localhost:5173/ on the Mac. The container listens on 0.0.0.0:5173; Docker must publish container port 5173 to host port 5173. Binding inside the container alone does not establish the host mapping.

The original stays beside the character rendering. Use Input mode for still images, video, or webcam, or open an image/video from your computer. Files use browser-local object URLs; nothing is uploaded.

- Style: density, contrast, gamma, seven editable ramp starting points, and monochrome / sampled color / limited 12-ink color. Color is independent of glyph brightness. Higher gamma reveals shadow detail. Reset changes style, not source.
- Video: choose a reference or your own clip, then Play/Pause, scrub, and Next frame. Frame stepping seeks by 1 / the selected frame rate; choose the actual clip rate (variable-frame-rate files are approximate). Audio stays muted. The default 6-second WebM is a labeled photo-pan study, not live footage. The other reference videos are already-ASCII game footage, useful as visual references rather than natural-image conversion tests.
- Webcam: choose Webcam and click Start camera. It requests video only, on this Mac browser. Pause freezes the preview but keeps the camera active. Stop camera, switching sources, hiding the tab, or leaving the page releases the camera. No recording occurs. Export PNG captures one frame only when explicitly clicked.
- Save a look / export a study: save named styles in this browser and apply them to any input. Export PNG downloads the rendered character frame. Export study JSON includes style, source filename, time, font/version, and seed. Moving media is paused for exports. Import restores known bundled sources and time; missing local files must be reopened manually. Webcam footage cannot be reconstructed from JSON, and imports never start the camera.

The rendering is still brightness-based: more ramps and color improve tonal separation, but do not infer bark ridges or surface directions. Edge-aware conversion remains a separate visual experiment.

```sh
npm test             # source-independent style math
npm run build        # strict TypeScript check + production bundle
npx playwright install chromium
npm run test:browser # run while the dev server is listening
```

For a preinstalled Chromium, set `AGENT_BROWSER_EXECUTABLE_PATH` to its executable before running browser tests. Screenshots and test artifacts go in ignored `captures/`.

Rendering ownership is in `docs/decisions.md`; asset provenance is in `docs/assets.md`. Video encoding/export is not part of this lab; only still PNG and reproducibility JSON are exported.

The included test browser may lack H.264 even though Safari/Chrome on the Mac support it. The bundled VP9 WebM exercises real decoding without depending on H.264. Automated webcam tests use synthetic canvas streams and permission-denial/cancellation cases—not a physical camera. Actual Mac camera permissions and GPU performance need a host-browser check.

Optional development tools (require ffmpeg): `node scripts/generate-motion-study.mjs` regenerates the photo-pan fixture; `node scripts/capture-lab.mjs` saves comparison screenshots and a short motion preview under ignored `captures/milestone-a/`. That script uses bundled media and never activates a webcam.
