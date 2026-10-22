import { loadStill, sources, videoSources } from './input';
import { createRenderer, dimensions, type FrameSource } from './renderer';
import { ramps, rampError } from './style';
import { defaultStyle, type LabStyle } from './presets';
import { openCamera, stopStream, loadVideo, seekVideo, cameraError } from './media';
import { element } from './ui';
import { connectStudyControls } from './study-controls';

type Mode = 'image' | 'video' | 'webcam';

export async function startLab() {
  const canvas = element<HTMLCanvasElement>('ascii');
  const renderer = await createRenderer(canvas);
  const mode = element<HTMLSelectElement>('mode');
  const source = element<HTMLSelectElement>('source');
  const video = element<HTMLVideoElement>('original-video');
  const original = element<HTMLImageElement>('original');
  const density = element<HTMLInputElement>('density');
  const contrast = element<HTMLInputElement>('contrast');
  const gamma = element<HTMLInputElement>('gamma');
  const color = element<HTMLSelectElement>('color');
  const ramp = element<HTMLInputElement>('ramp');
  const play = element<HTMLButtonElement>('play');
  const seek = element<HTMLInputElement>('seek');
  const startCamera = element<HTMLButtonElement>('camera-start');
  const stopCamera = element<HTMLButtonElement>('camera-stop');
  let active: FrameSource | undefined;
  let stream: MediaStream | null = null;
  let controller = new AbortController();
  let generation = 0;
  let frameCallback: number | undefined;
  let animationCallback: number | undefined;
  let objectURL: string | undefined;
  let validRamp = defaultStyle.ramp;
  let sourceName = '';
  let frames = 0;
  let measuredAt = performance.now();

  function status(text: string) { element('status').textContent = text; }
  function perform(action: () => void | Promise<unknown>) {
    Promise.resolve().then(action).catch(error => {
      if (!(error instanceof DOMException && error.name === 'AbortError')) status(String(error));
    });
  }
  function getStyle(): LabStyle {
    const error = rampError(ramp.value);
    element('ramp-error').textContent = error;
    ramp.setAttribute('aria-invalid', String(Boolean(error)));
    if (!error) validRamp = ramp.value;
    return { columns: Number(density.value), contrast: Number(contrast.value), gamma: Number(gamma.value), color: color.value as LabStyle['color'], ramp: validRamp };
  }
  function setStyle(style: LabStyle) {
    density.value = String(style.columns); contrast.value = String(style.contrast);
    gamma.value = String(style.gamma); color.value = style.color; ramp.value = style.ramp;
    perform(draw);
  }
  function updateTime() {
    const time = active === video ? video.currentTime : 0;
    element('time').textContent = `${time.toFixed(3)} s`;
    if (!video.seeking) seek.value = String(time);
  }
  async function draw() {
    const style = getStyle();
    element('density-value').textContent = `${style.columns} columns`;
    element('contrast-value').textContent = `${style.contrast.toFixed(2)}×`;
    element('gamma-value').textContent = `${style.gamma.toFixed(2)}×`;
    if (!active || (active === video && video.readyState < 2)) return;
    const token = generation;
    await renderer.render(active, style);
    if (token !== generation) return;
    element('grid-size').textContent = `${renderer.grid.cols} × ${renderer.grid.rows}`;
    const size = dimensions(active);
    element('source-size').textContent = `${size.width} × ${size.height}`;
    updateTime();
    frames++;
    const now = performance.now();
    if (now - measuredAt > 1000 || mode.value === 'image' || video.paused) {
      const rate = frames * 1000 / (now - measuredAt);
      element('performance').textContent = `UrsaFont · ${canvas.dataset.renderMs} ms draw submit${mode.value !== 'image' && !video.paused ? ` · ${rate.toFixed(0)} processed fps` : ''}`;
      measuredAt = now; frames = 0;
    }
  }
  function cancelFrames() {
    if (frameCallback !== undefined) video.cancelVideoFrameCallback(frameCallback);
    if (animationCallback !== undefined) cancelAnimationFrame(animationCallback);
    frameCallback = animationCallback = undefined;
  }
  function scheduleFrame() {
    cancelFrames();
    if (active !== video || video.paused) return;
    const token = generation;
    const next = () => {
      frameCallback = animationCallback = undefined;
      if (token !== generation || video.paused || active !== video) return;
      perform(async () => { await draw(); if (token === generation) scheduleFrame(); });
    };
    if (typeof video.requestVideoFrameCallback === 'function') frameCallback = video.requestVideoFrameCallback(next);
    else animationCallback = requestAnimationFrame(next);
  }
  function releaseMedia() {
    controller.abort(); controller = new AbortController();
    cancelFrames(); active = undefined;
    video.pause(); stopStream(stream); stream = null;
    video.srcObject = null; video.removeAttribute('src'); video.load();
    startCamera.disabled = false; stopCamera.disabled = true;
    play.textContent = 'Play';
  }
  function updateModeUI() {
    const camera = mode.value === 'webcam';
    element('source-label').hidden = camera;
    element('camera-controls').hidden = !camera;
    element('privacy').hidden = !camera;
    element('transport').hidden = mode.value === 'image' || (camera && !stream);
    element('seek-label').hidden = camera; element('step').hidden = camera;
    element('fps-label').hidden = camera; element('playback-note').hidden = camera;
    original.hidden = mode.value !== 'image';
    video.hidden = mode.value === 'image' || (camera && !stream);
    element('camera-placeholder').hidden = !camera || Boolean(stream);
    canvas.hidden = !active;
  }
  function populateSources() {
    source.replaceChildren();
    const choices = mode.value === 'video' ? videoSources : sources;
    for (const item of choices) source.add(new Option(item.name, item.url));
    if (mode.value === 'image') source.value = sources.find(item => item.name === '1000009352.jpg')!.url;
    source.setAttribute('aria-label', mode.value === 'video' ? 'Source video' : 'Source image');
  }
  async function selectInput() {
    const token = ++generation;
    releaseMedia(); updateModeUI();
    if (mode.value === 'webcam') { status('Camera off — click Start camera'); return; }
    status('Loading…');
    sourceName = source.selectedOptions[0]?.textContent ?? '';
    try {
      if (mode.value === 'image') {
        const image = await loadStill(source.value);
        if (token !== generation) return;
        original.src = image.src;
        await original.decode();
        if (token !== generation) return;
        active = image;
      } else {
        await loadVideo(video, source.value, controller.signal);
        if (token !== generation) return;
        active = video; seek.max = String(video.duration); seek.value = '0';
      }
      updateModeUI();
      await draw();
      if (token === generation) status('Ready');
    } catch (error) {
      if (token === generation) status(`Could not load ${mode.value}: ${String(error)}`);
    }
  }
  async function cameraOn() {
    const token = ++generation;
    releaseMedia(); startCamera.disabled = true;
    stopCamera.disabled = false;
    status('Requesting camera permission…');
    try {
      const acquired = await openCamera(controller.signal);
      if (token !== generation) { stopStream(acquired); return; }
      stream = acquired;
      stopCamera.disabled = false;
      await loadVideo(video, acquired, controller.signal);
      if (token !== generation) return;
      active = video; sourceName = 'Live webcam (not recorded)';
      stream.getVideoTracks().forEach(track => track.addEventListener('ended', () => cameraOff('Camera disconnected — click Start camera to retry'), { once: true }));
      updateModeUI(); await draw();
      if (token !== generation) return;
      play.textContent = 'Pause'; status('Camera live'); scheduleFrame();
    } catch (error) {
      if (token !== generation) return;
      releaseMedia(); updateModeUI(); status(cameraError(error));
    }
  }
  function cameraOff(message = 'Camera stopped') {
    generation++; releaseMedia(); updateModeUI(); status(message);
  }
  mode.addEventListener('change', () => {
    if (objectURL) { URL.revokeObjectURL(objectURL); objectURL = undefined; }
    populateSources(); perform(selectInput);
  });
  source.addEventListener('change', () => perform(selectInput));
  [density, contrast, gamma, color, ramp].forEach(control => control.addEventListener('input', () => perform(draw)));
  document.querySelectorAll<HTMLButtonElement>('[data-ramp]').forEach(button => {
    button.addEventListener('click', () => { ramp.value = ramps[button.dataset.ramp as keyof typeof ramps]; perform(draw); });
  });
  element('reset').addEventListener('click', () => setStyle(defaultStyle));
  startCamera.addEventListener('click', () => perform(cameraOn));
  stopCamera.addEventListener('click', () => cameraOff());
  play.addEventListener('click', () => perform(async () => {
    if (active !== video) return;
    if (video.paused) await video.play(); else video.pause();
  }));
  video.addEventListener('play', () => { play.textContent = 'Pause'; scheduleFrame(); });
  video.addEventListener('pause', () => {
    play.textContent = 'Play'; cancelFrames();
    if (active === video) perform(draw);
  });
  video.addEventListener('ended', () => { play.textContent = 'Play'; cancelFrames(); perform(draw); });
  video.addEventListener('error', () => { if (active === video) { cancelFrames(); status('Video playback failed. Choose another clip.'); } });
  seek.addEventListener('input', () => perform(async () => {
    video.pause(); await seekVideo(video, Number(seek.value)); await draw();
  }));
  element('step').addEventListener('click', () => perform(async () => {
    video.pause(); await seekVideo(video, video.currentTime + 1 / Number(element<HTMLSelectElement>('fps').value)); await draw();
  }));
  element<HTMLInputElement>('media-file').addEventListener('change', event => perform(async () => {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0]; if (!file) return;
    if (!file.type.startsWith('image/') && !file.type.startsWith('video/')) { status('Choose an image or video file.'); input.value = ''; return; }
    if (objectURL) URL.revokeObjectURL(objectURL);
    objectURL = URL.createObjectURL(file);
    mode.value = file.type.startsWith('video/') ? 'video' : 'image';
    populateSources(); source.add(new Option(file.name, objectURL)); source.value = objectURL;
    input.value = ''; await selectInput();
  }));
  connectStudyControls({
    getStyle, setStyle, renderer,
    getSource: () => ({ kind: mode.value as Mode, name: sourceName || 'No source', time: active === video ? video.currentTime : 0 }),
    hasSource: () => Boolean(active),
    pause: async () => { if (active === video) video.pause(); await draw(); },
    restore: async study => {
      // Never auto-start a webcam or resolve arbitrary remote URLs from an imported file.
      if (study.source.kind === 'webcam') return 'Style loaded. Start the camera manually; webcam footage is not stored.';
      const choices = study.source.kind === 'image' ? sources : videoSources;
      const item = choices.find(item => item.name === study.source.name);
      if (!item) return `Style loaded. Open the original local file “${study.source.name}” to reproduce this study at ${study.source.time.toFixed(3)} s.`;
      mode.value = study.source.kind; populateSources(); source.value = item.url;
      await selectInput();
      if (active === video) { await seekVideo(video, study.source.time); await draw(); }
      return 'Study restored with its source and time.';
    },
  });
  const cleanup = () => { generation++; releaseMedia(); if (objectURL) URL.revokeObjectURL(objectURL); };
  window.addEventListener('pagehide', cleanup);
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) return;
    if (mode.value === 'webcam') cameraOff('Camera stopped while tab was hidden');
    else video.pause();
  });
  if (import.meta.hot) import.meta.hot.dispose(() => { cleanup(); renderer.dispose(); });
  setStyle(defaultStyle); populateSources(); await selectInput();
}
