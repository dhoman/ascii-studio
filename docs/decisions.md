# Rendering decisions

## Sindri hero look-development page

- Swing choreography uses explicit ready/lift/load/contact/rebound/recovery key poses, with the head above the fist in the ready grip and no inverted wrist revolution. The hero opens in ready at time 0; thumbnails remain at 2.42 for comparison. A smaller hammer keeps the head readable away from the elbow; the gripping hand is composited in front of the anvil rim. Impact still occurs at phase 2.16. Test both the held ready silhouette and the full cycle, not only joint connectivity.

- Hammer-arm anatomy uses a fixed outer-tunic shoulder and a two-bone elbow solve in `armPoseAt`. Both segment lengths stay constant, the elbow stays on a continuous outward branch, and the wrist carries the hammer independently. The contact face still meets the billet at the spark origin. Never move the shoulder toward the neck just to make a rigid hammer arc land on target; solve the wrist and elbow instead. Regression coverage checks actual scene anchoring, constant lengths, continuity, and contact alignment.

- A separate Vite entry at `/sindri.html` leaves textmode.js and the media lab unchanged. Both pages are production build inputs; the new page adds no runtime dependency.
- `sindri-scene.ts` is an original neutral 640×540 authored illustration. `sindri-presets.ts` owns 20 treatments and deterministic 3.8-second hammer timing. `sindri-renderer.ts` independently samples that image into ASCII, dither, pixels, edges, hatching, dots, or ember fragments, then composites procedural particles. `sindri.ts` owns DOM/input and the only requestAnimationFrame loop, with a 24 fps draw cap.
- This is intentionally a 2D silhouette/website-hero experiment, not Milestone B's real 3D renderer. Future geometry, light/shadow/depth buffers, and GPU postprocessing can replace the source and sampling implementation without coupling to the gallery controls or simulation timing. CPU sampling here is a prototype, not a performance claim.
- All thumbnails share time 2.42 and the active preview preserves time across look switches. Particle placement is seeded by stable integer hashes. Pausing freezes both the scene and particles; reduced-motion starts paused. Background tabs do not advance simulation time.
- Shortlists contain only validated look IDs. PNG export pauses and saves the artwork only, without HTML hero copy. Study JSON records the source/renderer revision, seed, time, speed, canvas size, palette/treatment, and font stack; it is a snapshot, not an implemented import format. Monospace glyph appearance remains host-dependent.
- Keep sufficient vertical framing for the raised hammer; a good contact-frame crop can cut off the swing. Validate time-separated frames, not only the default strike thumbnail. The capture script uses a paused Playwright clock plus explicit frame stepping and CDP screenshots, feeding the system ffmpeg directly; Playwright's own video capture needs a separate ffmpeg bundle.

## Still-image lab

- Vite + TypeScript, plain HTML/CSS controls, textmode.js 0.18.0. Dependencies are pinned in package-lock.json. No UI framework or Three.js is needed for this slice.
- textmode.js owns the character canvas, WebGL2 context, and rendering scheduler. Use `noLoop()` and redraw on image/style changes; an unchanged still image does not need a continuous GPU render loop.
- Keep local image loading (`src/input.ts`), source-independent contrast math (`src/style.ts`), and glyph rendering (`src/renderer.ts`) separate. The original image is never contrast-adjusted.
- A small 2D sampling canvas feeds a dynamic texture. The media-lab extension moves contrast, gamma, glyph choice, and independent ink selection into a custom WebGL2 textmode.js conversion shader (`src/lab-shader.ts`). There is no full-resolution CPU pixel loop. Sampled ink uses source RGB; the limited mode finds the nearest of 12 fixed inks, without quantizing glyph luminance.
- Density means character columns, not random noise. Rows account for source aspect ratio and the atlas cell proportions. Both views contain the whole image without cropping.
- Use the bitmap glyph atlas embedded in the pinned textmode.js package: no font CDN or system-dependent glyph shapes. Warm monochrome foreground on near-black emphasizes form.
- Future scene rendering remains separate: Three.js will own the 3D scene and its lighting/depth/normal buffers, with an explicit handoff into a character pass. The lab does not assume a shared WebGL context.
- Still-image settings are deterministic (seed 0, frame/time 0). Named styles save locally; versioned study JSON records source name/type/time, style, pinned font/version, and seed. PNG export occurs only on request; video/webcam is paused before exporting. JSON stores no image bytes or camera recording.

## Serving

The dev server binds 0.0.0.0:5173 with a strict port. The Mac URL is http://localhost:5173/ when Docker publishes port 5173. A request via host.docker.internal:5173 with Host: localhost:5173 returned HTTP 200 during media-lab verification. References are bundled by Vite for production; browsers decode only the selected media. The reference collection is large, particularly the widescreen MP4, so production asset size is not the JavaScript bundle size.

## Video and webcam scheduling

- textmode.js owns WebGL2 and its on-demand scheduler. Video frame callbacks request a textmode redraw per decoded frame (requestAnimationFrame fallback); paused/still media redraws only for changes. Do not recreate render targets or sampling canvases unless grid dimensions change. Original and ASCII use the same video element/frame source; live compositing can lag by a display tick, while pause/seek is stable.
- Dynamic textures upload before the drawing callback. Fill the sampling canvas before requesting redraw, and set a base ramp before the source's first atlas activation; otherwise a first frame or paused edit can use stale pixels/default glyphs. Apply frame-local ramp overrides to refresh conversion uniforms.
- Use a plugin postDraw hook after presentation to resolve frame completion and copy PNGs before the non-preserved WebGL drawing buffer is cleared. Do not export a canvas later and assume its pixels survive composition.
- Frame stepping uses an explicit selected fps rather than inventing unavailable browser metadata. Variable-frame-rate files require approximate time stepping; frame inspection records the actual currentTime.
- Source changes use a generation token plus AbortController. Cancel old video listeners and frame callbacks. Late camera grants must stop their tracks, never install a stale stream.
- Camera access is explicit and video-only. Stop tracks on stop/source switch/tab hide/page exit; pause only freezes playback. No webcam recording, hidden capture, media uploads, or automatic camera start on JSON import.
- Displayed draw submission time is CPU-side, not a GPU timer; processed fps includes decode/scheduling work. Container SwiftShader measurements are not Mac-browser performance evidence. The current target-browser benchmark remains user-side.
