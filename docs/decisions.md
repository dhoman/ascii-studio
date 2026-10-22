# Rendering decisions

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
