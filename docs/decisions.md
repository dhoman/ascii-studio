# Rendering decisions

## Still-image lab

- Vite + TypeScript, plain HTML/CSS controls, textmode.js 0.18.0. Dependencies are pinned in package-lock.json. No UI framework or Three.js is needed for this slice.
- textmode.js owns the character canvas, WebGL2 context, and rendering scheduler. Use `noLoop()` and redraw on image/style changes; an unchanged still image does not need a continuous GPU render loop.
- Keep local image loading (`src/input.ts`), source-independent contrast math (`src/style.ts`), and glyph rendering (`src/renderer.ts`) separate. The original image is never contrast-adjusted.
- Contrast preprocessing uses a small 2D sampling canvas. textmode.js consumes it through a dynamic texture, maps brightness into the selected ramp, and resolves the glyph atlas. This is not a full-resolution per-pixel CPU conversion.
- Density means character columns, not random noise. Rows account for source aspect ratio and the atlas cell proportions. Both views contain the whole image without cropping.
- Use the bitmap glyph atlas embedded in the pinned textmode.js package: no font CDN or system-dependent glyph shapes. Warm monochrome foreground on near-black emphasizes form.
- Future scene rendering remains separate: Three.js will own the 3D scene and its lighting/depth/normal buffers, with an explicit handoff into a character pass. The lab does not assume a shared WebGL context.
- Still-image settings are deterministic (seed 0, frame/time 0). Source filename, style values, pinned glyph atlas/version, and seed identify a study. Preset save/load and screenshot export remain later Milestone A slices.

## Serving

The dev server binds 0.0.0.0:5173 with a strict port. The intended Mac URL is http://localhost:5173/ when Docker publishes port 5173. Container-local browser checks do not prove Mac port publication. Images stay local; only the selected image is decoded in the browser. The JPGs in references/ are bundled by Vite for production, without exposing the video collection.
