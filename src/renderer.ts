import { textmode } from 'textmode.js';
import { contrastByte } from './style';

export async function createRenderer(canvas: HTMLCanvasElement) {
  const t = textmode.create({ canvas, width: 768, height: 512, fontSize: 16, seed: 0, loadingScreen: { transition: 'none' } });
  const sample = document.createElement('canvas');
  const context = sample.getContext('2d', { willReadFrequently: true })!;
  let texture: ReturnType<typeof t.createTexture>;
  await t.setup(() => {
    texture = t.createTexture(sample);
    texture.characters(' .:-=+*#%@').charColorMode('fixed').charColor('#e7e5dc')
      .cellColorMode('fixed').cellColor('#111310');
    t.noLoop();
  });
  t.draw(() => {
    t.background('#111310');
    t.image(texture, t.grid!.cols, t.grid!.rows);
    canvas.dataset.frame = String(Number(canvas.dataset.frame ?? 0) + 1);
  });
  return {
    render(image: HTMLImageElement, columns = 96, contrast = 1, ramp = ' .:-=+*#%@') {
      const grid = t.grid!;
      grid.cols = columns;
      grid.rows = Math.max(1, Math.round(columns * image.naturalHeight / image.naturalWidth * grid.cellWidth / grid.cellHeight));
      t.resizeCanvas(grid.cols * grid.cellWidth, grid.rows * grid.cellHeight);
      sample.width = grid.cols;
      sample.height = grid.rows;
      context.drawImage(image, 0, 0, sample.width, sample.height);
      const frame = context.getImageData(0, 0, sample.width, sample.height);
      for (let i = 0; i < frame.data.length; i += 4) {
        const luminance = contrastByte(0.2126 * frame.data[i] + 0.7152 * frame.data[i + 1] + 0.0722 * frame.data[i + 2], contrast);
        frame.data[i] = frame.data[i + 1] = frame.data[i + 2] = luminance;
      }
      context.putImageData(frame, 0, 0);
      texture.characters(ramp);
      t.redraw();
      return { cols: grid.cols, rows: grid.rows };
    },
  };
}
