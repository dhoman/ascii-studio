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
