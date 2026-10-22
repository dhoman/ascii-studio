// Capture only bundled media; never starts or records a webcam.
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';
import { performance } from 'node:perf_hooks';
import { spawnSync } from 'node:child_process';
mkdirSync('captures/milestone-a/frames', { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.AGENT_BROWSER_EXECUTABLE_PATH,
  args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1250 } });
  await page.goto('http://127.0.0.1:5173/');
  await page.locator('#status').filter({ hasText: 'Ready' }).waitFor();
  const choice = await page.locator('#source option').evaluateAll(options => options.find(o => o.textContent === '1000009349.jpg').value);
  await page.locator('#source').selectOption(choice);
  await page.locator('#status').filter({ hasText: 'Ready' }).waitFor();
  await page.getByRole('button', { name: 'Fine', exact: true }).click();
  await page.locator('#gamma').fill('1.4');
  await page.locator('#density').fill('120');
  for (const color of ['mono', 'sampled', 'limited']) {
    await page.locator('#color').selectOption(color);
    await page.locator('#ascii').screenshot();
    await page.screenshot({ path: `captures/milestone-a/${color}.png`, fullPage: true });
  }
  await page.locator('#mode').selectOption('video');
  await page.locator('#status').filter({ hasText: 'Ready' }).waitFor();
  await page.locator('#color').selectOption('sampled');
  await page.getByRole('button', { name: 'Play', exact: true }).click();
  const started = performance.now();
  let frames = 0;
  while (performance.now() - started < 3500) {
    await page.locator('.comparison').screenshot({ path: `captures/milestone-a/frames/${String(frames++).padStart(4, '0')}.png` });
  }
  const elapsed = (performance.now() - started) / 1000;
  const stats = await page.evaluate(() => ({ performance: document.querySelector('#performance').textContent,
    frames: document.querySelector('#ascii').dataset.frame, mediaTime: document.querySelector('#original-video').currentTime }));
  await page.getByRole('button', { name: 'Pause', exact: true }).click();
  await page.screenshot({ path: 'captures/milestone-a/video.png', fullPage: true });
  writeFileSync('captures/milestone-a/verification.json', JSON.stringify({ ...stats, screenshots: frames, elapsed, renderer: 'container Chromium / SwiftShader (not Mac performance)' }, null, 2));
  const encode = spawnSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-framerate', String(frames / elapsed),
    '-i', 'captures/milestone-a/frames/%04d.png', '-vf', 'scale=1000:-2', '-c:v', 'libx264', '-pix_fmt', 'yuv420p',
    'captures/milestone-a/motion-check.mp4'], { stdio: 'inherit' });
  if (encode.status !== 0) throw new Error('Motion preview encoding failed');
  console.log(JSON.stringify({ ...stats, screenshots: frames, elapsed, preview: 'captures/milestone-a/motion-check.mp4' }));
} finally { await browser.close(); }
