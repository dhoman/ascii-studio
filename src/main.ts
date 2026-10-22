import { loadStill, sources } from './input';
import { createRenderer } from './renderer';
import { ramps, rampError } from './style';
import './lab.css';

const app = document.querySelector<HTMLElement>('#app')!;
app.innerHTML = `
  <header><div><p class="eyebrow">ASCII STUDIO / LAB 01</p><h1>Seeing in characters.</h1><p class="intro">One image. A different vocabulary.</p></div><span class="badge">STILL IMAGE</span></header>
  <section class="toolbar" aria-label="Image controls">
    <label>Source image<select id="source"></select></label>
    <label>Grid density <span id="density-value">96 columns</span><input id="density" aria-label="Grid density" type="range" min="40" max="240" step="1" value="96"></label>
    <label>Contrast <span id="contrast-value">1.00×</span><input id="contrast" aria-label="Contrast" type="range" min="0.25" max="3" step="0.05" value="1"></label>
    <div class="status"><span class="dot"></span><span id="status" role="status">Loading…</span></div>
  </section>
  <section class="ramp-bar" aria-label="Glyph controls">
    <label class="ramp-field">Glyph ramp<input id="ramp" aria-label="Glyph ramp" aria-describedby="ramp-help ramp-error" type="text" value=" .:-=+*#%@" maxlength="96" spellcheck="false" autocomplete="off"><small id="ramp-help">Dark → bright. Spaces count. Printable ASCII only.</small></label>
    <div class="presets">${Object.keys(ramps).map(name => `<button type="button" data-ramp="${name}">${name}</button>`).join('')}</div>
    <button id="reset" type="button">Reset style</button>
    <p id="ramp-error" role="alert"></p>
  </section>
  <section class="comparison" aria-label="Image comparison">
    <figure><figcaption><span>01 / ORIGINAL</span><span id="source-size"></span></figcaption><div class="stage"><img id="original" alt="Selected local reference image"></div></figure>
    <figure><figcaption><span>02 / CHARACTER STUDY</span><span id="grid-size"></span></figcaption><div class="stage"><canvas id="ascii" role="img" aria-label="ASCII rendering of the selected image"></canvas></div></figure>
  </section>
  <footer><span>LOCAL INPUT / NO UPLOADS</span><span>textmode.js · UrsaFont · monochrome</span></footer>`;
const source = document.querySelector<HTMLSelectElement>('#source')!;
const original = document.querySelector<HTMLImageElement>('#original')!;
const status = document.querySelector<HTMLElement>('#status')!;
for (const item of sources) source.add(new Option(item.name, item.url));
source.value = sources.find(item => item.name === '1000009352.jpg')!.url;

async function start() {
  const renderer = await createRenderer(document.querySelector<HTMLCanvasElement>('#ascii')!);
  const density = document.querySelector<HTMLInputElement>('#density')!;
  const contrast = document.querySelector<HTMLInputElement>('#contrast')!;
  const ramp = document.querySelector<HTMLInputElement>('#ramp')!;
  let validRamp = ramps.Classic;
  let currentImage: HTMLImageElement;
  function render() {
    if (!currentImage) return;
    const error = rampError(ramp.value);
    document.querySelector('#ramp-error')!.textContent = error;
    ramp.setAttribute('aria-invalid', String(Boolean(error)));
    if (!error) validRamp = ramp.value;
    const grid = renderer.render(currentImage, Number(density.value), Number(contrast.value), validRamp);
    document.querySelector('#contrast-value')!.textContent = `${Number(contrast.value).toFixed(2)}×`;
    document.querySelector('#grid-size')!.textContent = `${grid.cols} × ${grid.rows}`;
    document.querySelector('#density-value')!.textContent = `${grid.cols} columns`;
  }
  density.addEventListener('input', render);
  contrast.addEventListener('input', render);
  ramp.addEventListener('input', render);
  document.querySelectorAll<HTMLButtonElement>('[data-ramp]').forEach(button => {
    button.addEventListener('click', () => { ramp.value = ramps[button.dataset.ramp as keyof typeof ramps]; render(); });
  });
  document.querySelector('#reset')!.addEventListener('click', () => {
    density.value = '96'; contrast.value = '1'; ramp.value = ramps.Classic; render();
  });
  let selection = 0;
  async function selectImage() {
    const token = ++selection;
    status.textContent = 'Loading…';
    try {
      const image = await loadStill(source.value);
      if (token !== selection) return;
      original.src = image.src;
      currentImage = image;
      render();
      document.querySelector('#source-size')!.textContent = `${image.naturalWidth} × ${image.naturalHeight}`;

      status.textContent = 'Ready';
    } catch (error) {
      if (token === selection) status.textContent = `Could not load image: ${String(error)}`;
    }
  }
  source.addEventListener('change', selectImage);
  await selectImage();
}
start().catch(error => { status.textContent = `Renderer unavailable. WebGL2 is required. ${String(error)}`; });
