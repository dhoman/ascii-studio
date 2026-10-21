# ascii-studio: agent instructions

Read `README.md` for milestones and `docs/brief.md` for the original plan and risk checklist.

## Environment
- You run inside the Hermes Docker container. Repo path: `/workspace/ai-workspace/projects/ascii-studio`.
- The user views results in a browser on their Mac host (Apple M3 Ultra). The container serves the app and the host browser opens it. Webcam access happens in the host browser, which needs `localhost` or HTTPS. Never upload or record footage unless the user explicitly asks.
- Host: macOS. Don't assume a GPU is available inside the container. Rendering happens in the user's browser.

## Rendering direction
- **Lab (Milestone A):** textmode.js for image, video, and webcam conversion and character drawing.
- **Scene and game (B onward):** Three.js renders the 3D scene, including lights, shadows, fog, and reflections, to a render target. A custom character pass then turns that into glyphs. Use Three.js `AsciiEffect` only as a baseline to compare against. Later, the glyph pass should be able to read depth and normal buffers, for edge-aware and distance-aware glyphs.
- Decide early which code owns the render loop and the WebGL context, and write the decision in `docs/decisions.md`.

## Conventions
- Each experiment saves enough to reproduce it: source, preset, font, seed, and frame or time.
- Visual changes come with a way to see them: a URL, a screenshot, or a short capture for anything that moves.
- Track asset licenses and provenance in `docs/assets.md`.
- Record notable decisions, with a line of reasoning, in `docs/decisions.md`.
- Commit small, working increments with clear messages.
