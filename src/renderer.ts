import { textmode } from 'textmode.js';
import { labFragment } from './lab-shader';
import type { LabStyle } from './presets';

export type FrameSource = HTMLImageElement | HTMLVideoElement | HTMLCanvasElement;
export function dimensions(source: FrameSource) {
  if (source instanceof HTMLImageElement) return { width: source.naturalWidth, height: source.naturalHeight };
  if (source instanceof HTMLVideoElement) return { width: source.videoWidth, height: source.videoHeight };
  return { width: source.width, height: source.height };
}

export async function createRenderer(canvas: HTMLCanvasElement) {
  let presented = () => {};
  const t = textmode.create({ canvas, width: 768, height: 512, fontSize: 16, seed: 0,
    loadingScreen: { transition: 'none' },
    plugins: [{ name: 'lab-presentation', install(_t, context) { context.on('postDraw', () => presented()); } }],
  });
  const sample = document.createElement('canvas');
  const context = sample.getContext('2d')!;
  let texture: ReturnType<typeof t.createTexture>;
  let current: FrameSource | undefined;
  let style: LabStyle;
  let started = 0;
  let pending: Array<() => void> = [];
  let capture: ((blob: Blob | null) => void) | undefined;
  presented = () => {
    if (!current) return;
    canvas.dataset.frame = String(Number(canvas.dataset.frame ?? 0) + 1);
    canvas.dataset.renderMs = (performance.now() - started).toFixed(1);
    canvas.dataset.mediaTime = current instanceof HTMLVideoElement ? String(current.currentTime) : '0';
    if (capture) {
      const copy = document.createElement('canvas');
      copy.width = canvas.width; copy.height = canvas.height;
      copy.getContext('2d')!.drawImage(canvas, 0, 0);
      copy.toBlob(capture, 'image/png');
      capture = undefined;
    }
    const callbacks = pending; pending = [];
    callbacks.forEach(resolve => resolve());
  };
  await t.setup(async () => {
    const shader = await t.createMaterialShader(labFragment);
    t.conversions.register({
      id: 'lab', createShader: () => shader,
      createUniforms: context => ({ ...context.createBaseUniforms(), u_contrast: style.contrast,
        u_gamma: style.gamma, u_colorMode: { mono: 0, sampled: 1, limited: 2 }[style.color] }),
    });
    texture = t.createTexture(sample);
    texture.conversionMode('lab');
    t.noLoop();
  });
  t.draw(() => {
    if (!current) return;
    started = performance.now();
    // Frame-local ramp override refreshes conversion uniforms without recompiling shaders.
    texture.characters(style.ramp);
    t.background('#111310');
    t.image(texture, t.grid!.cols, t.grid!.rows);
  });
  return {
    render(source: FrameSource, next: LabStyle): Promise<void> {
      current = source; style = next;
      const size = dimensions(source);
      const grid = t.grid!;
      const rows = Math.max(1, Math.round(next.columns * size.height / size.width * grid.cellWidth / grid.cellHeight));
      if (grid.cols !== next.columns || grid.rows !== rows || sample.width !== next.columns || sample.height !== rows) {
        grid.cols = next.columns; grid.rows = rows;
        t.resizeCanvas(grid.cols * grid.cellWidth, grid.rows * grid.cellHeight);
        sample.width = grid.cols; sample.height = grid.rows;
      }
      // Dynamic source textures upload before draw(); prepare pixels before requesting the frame.
      context.drawImage(source, 0, 0, sample.width, sample.height);
      // Store the base ramp before the first atlas activation as well as per-frame overrides.
      texture.characters(style.ramp);
      const ready = new Promise<void>(resolve => pending.push(resolve));
      t.redraw();
      return ready;
    },
    get grid() { return { cols: t.grid!.cols, rows: t.grid!.rows }; },
    snapshot(): Promise<Blob> {
      return new Promise((resolve, reject) => {
        capture = blob => blob ? resolve(blob) : reject(new Error('PNG export failed.'));
        t.redraw();
      });
    },
    dispose() { t.destroy(); },
  };
}
