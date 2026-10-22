# Asset provenance

## Reference still images

User-provided local files, used for private visual exploration:

- references/1000009349.jpg
- references/1000009352.jpg (default)
- references/1000009415.jpg
- references/1000009493.jpg
- references/1000009592.jpg

Creator, original source, and license have not been supplied. Do not treat these as cleared for redistribution or publication. Original bytes remain unchanged. The default is a portrait-oriented photograph of tree bark, not pre-existing ASCII art.

## Glyphs

The lab uses UrsaFont by UrsaFrank, the default font bundled in textmode.js 0.18.0, pinned in package-lock.json. It needs no external font request. The installed package README credits UrsaFont under CC0: https://ursafrank.itch.io/ursafont. textmode.js itself is MIT licensed; upstream: https://github.com/humanbydefinition/textmode.js and https://code.textmode.art/.

## UI

UI typography uses the local system monospace and sans-serif stacks. No downloaded webfonts, external imagery, telemetry, or upload services are used. Camera access is opt-in and browser-local, video only; there is no recording feature.

## Reference video

The four MP4s under references/ansenjeo/ are Ansenjeo game-development posts. Original X post/media URLs and retrieval details are preserved in references/ansenjeo/manifest.json. Their license has not been supplied; private study references, not cleared for publication. They already contain ASCII-style game rendering. The lab does not modify their bytes and plays them muted.

references/previews/00-leaves-and-bark-photo-pan.webm is a generated 6-second, 30-fps VP9 motion study derived from references/1000009349.jpg. It is a gradual zoom of a still image, not captured video or webcam footage. Regenerate with scripts/generate-motion-study.mjs (ffmpeg/libvpx-vp9). Source-image rights remain unknown; derivative is also private-study-only. It exists to test natural texture in motion and browsers without H.264 support.

Files opened by the user and webcam streams stay in browser memory. A named preset stores style settings only; exported study JSON stores filename/time and rendering metadata, not media bytes. Webcam PNG export requires the explicit export button.
