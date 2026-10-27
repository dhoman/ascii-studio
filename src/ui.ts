import { ramps } from './style';

export function mountLab() {
  document.querySelector<HTMLElement>('#app')!.innerHTML = `
    <header><div><p class="eyebrow">ASCII STUDIO / LAB 01</p><h1>Seeing in characters.</h1><p class="intro">Still images, moving pictures, and you.</p><a href="/sindri.html">Sindri forge — 20 animated hero studies ↗</a></div><span class="badge">LOCAL MEDIA LAB</span></header>
    <section class="toolbar input-bar" aria-label="Input controls">
      <label>Input mode<select id="mode" aria-label="Input mode"><option value="image">Still image</option><option value="video">Video</option><option value="webcam">Webcam</option></select></label>
      <label id="source-label">Source image<select id="source" aria-label="Source image"></select></label>
      <label class="file-label">Open your own image / video<input id="media-file" aria-label="Open local media" type="file" accept="image/*,video/*"></label>
      <div id="camera-controls" hidden><button id="camera-start" type="button">Start camera</button><button id="camera-stop" type="button" disabled>Stop camera</button></div>
      <div class="status"><span class="dot"></span><span id="status" role="status">Loading…</span></div>
    </section>
    <section class="toolbar style-bar" aria-label="Style controls">
      <label>Grid density <span id="density-value">96 columns</span><input id="density" aria-label="Grid density" type="range" min="40" max="240" step="1" value="96"></label>
      <label>Contrast <span id="contrast-value">1.00×</span><input id="contrast" aria-label="Contrast" type="range" min="0.25" max="3" step="0.05" value="1"></label>
      <label>Gamma <span id="gamma-value">1.00×</span><input id="gamma" aria-label="Gamma" type="range" min="0.25" max="3" step="0.05" value="1"></label>
      <label>Glyph color<select id="color" aria-label="Glyph color"><option value="mono">Monochrome</option><option value="sampled">Sampled color</option><option value="limited">Limited · 12 inks</option></select></label>
    </section>
    <section class="ramp-bar" aria-label="Glyph controls">
      <label class="ramp-field">Glyph ramp<input id="ramp" aria-label="Glyph ramp" aria-describedby="ramp-help ramp-error" type="text" maxlength="96" spellcheck="false" autocomplete="off"><small id="ramp-help">Dark → bright. Spaces count. Fine / Organic are good texture starting points.</small></label>
      <div class="presets">${Object.keys(ramps).map(name => `<button type="button" data-ramp="${name}">${name}</button>`).join('')}</div>
      <button id="reset" type="button">Reset style</button><p id="ramp-error" role="alert"></p>
    </section>
    <section id="transport" class="transport" aria-label="Playback controls" hidden>
      <button id="play" type="button">Play</button><button id="step" type="button">Next frame</button>
      <label id="fps-label">Step rate<select id="fps" aria-label="Frame step rate"><option value="24">24 fps</option><option value="25">25 fps</option><option value="30" selected>30 fps</option><option value="60">60 fps</option></select></label>
      <label id="seek-label" class="seek-label">Video position<input id="seek" aria-label="Video position" type="range" min="0" max="1" step="0.001" value="0"></label>
      <span id="time">0.000 s</span><small id="playback-note">Stepping seeks 1 / selected fps. Use the clip’s frame rate.</small>
    </section>
    <p id="privacy" class="privacy" hidden>Camera starts only when you ask. Video only; no audio, uploads, or recording. Pause freezes the preview but keeps the camera active. Stop camera releases it.</p>
    <section class="comparison" aria-label="Media comparison">
      <figure><figcaption><span>01 / ORIGINAL</span><span id="source-size"></span></figcaption><div class="stage"><img id="original" alt="Selected local reference image"><video id="original-video" aria-label="Original video" muted playsinline hidden></video><span id="camera-placeholder" hidden>Camera is off.</span></div></figure>
      <figure><figcaption><span>02 / CHARACTER STUDY</span><span id="grid-size"></span></figcaption><div class="stage"><canvas id="ascii" role="img" aria-label="ASCII rendering of the selected media"></canvas></div></figure>
    </section>
    <details class="study-panel"><summary>Save a look / export a study</summary>
      <div class="study-controls">
        <label>Preset name<input id="preset-name" aria-label="Preset name" type="text" maxlength="80" placeholder="Moss / soft contrast"></label>
        <button id="save-style" type="button">Save style</button>
        <label>Saved styles<select id="saved-styles" aria-label="Saved styles"><option value="">Choose a saved style</option></select></label>
        <button id="load-style" type="button">Load style</button>
        <button id="export-png" type="button">Export PNG</button>
        <button id="export-study" type="button">Export study JSON</button>
        <label class="file-label">Import study JSON<input id="import-study" aria-label="Import study JSON" type="file" accept=".json,application/json"></label>
      </div><p id="study-message" role="status"></p>
      <small>Styles are saved in this browser. JSON includes source name, time, style, font, and seed—not media bytes. Webcam images are exported only when you click Export PNG.</small>
    </details>
    <footer><span>LOCAL INPUT / NO UPLOADS</span><span id="performance">textmode.js · UrsaFont</span></footer>`;
}

export function element<T extends HTMLElement = HTMLElement>(id: string): T {
  return document.getElementById(id) as T;
}
