# Original brief (from Hermes, 2026-10-21)

**Bottom line:** Build a tool you enjoy playing with first. Let the game come out of a visual treatment that holds up under motion and interaction.

> Evaluate a local-first browser ASCII lab with image, recorded-video, and webcam inputs, adjustable glyphs and palettes, reproducible presets, and a tiny explorable scene using the same visual treatment.

## Approach
- **Hybrid:** convert the scenery from images, and hand-author the characters, particles, and readable UI. It doesn't need to run in a terminal; characters are the medium, the browser is the display.
- **Tools:** textmode.js first (WebGL2, character grid, media conversion, shaders, export). Use Three.js for the spatial game, with its `AsciiEffect` as a baseline to compare against. TouchDesigner is optional as an art lab. Skip p5.asciify, which is unmaintained and points to textmode.js.

## Milestones
- **A. ASCII lab:** inputs in order: image, video, webcam. Original/processed comparison, grid density, editable ramp, mono/limited/sampled color, contrast and gamma, pause and single-frame inspection, presets, screenshot export. *Done when:* you find a look you like, save it, and reproduce it on another input.
- **B. Scene:** a character in a clearing with grass, stone, one light, fog, and water. Toggle between normal and ASCII rendering, and try both elevated and close cameras. *Done when:* movement looks good, the player is easy to find, and it feels atmospheric in motion.
- **C. Loop:** explore, activate, one obstacle, an outcome, restart. Single-player, one environment, one mechanic.

## Architecture
Input, then style, then game simulation, kept separate. Share the visual vocabulary, not necessarily the implementation. Decide early who owns the render loop, because a shared WebGL context needs a coordinated draw order and state restore.

## Risk checklist
- Glyph meaning (brightness, edge, material, or authored), temporal shimmer, readability, font and cell proportions, art-direction priorities. Crisp UI text over the ASCII world is fine.
- Benchmark the whole pipeline on the target browser and hardware. Treat live preview and video export as separate milestones.
- Webcam needs a secure context (localhost or HTTPS). The host browser owns the camera and the container only serves the app. Footage stays local by default.
- Save source, preset, font, seed, and frame with each experiment. Require short motion captures, not just screenshots.
- External assets are fine. Track their licenses and provenance.
