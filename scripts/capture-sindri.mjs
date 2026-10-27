import { chromium } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';

const root = 'captures/sindri';
await mkdir(`${root}/directions`, { recursive: true });
const browser = await chromium.launch({
  executablePath: process.env.AGENT_BROWSER_EXECUTABLE_PATH,
  args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1050 }, reducedMotion: 'reduce' });
  await page.goto('http://127.0.0.1:5173/sindri.html');
  await page.locator('.look-card').last().waitFor();
  const directions = await page.locator('.look-card').evaluateAll(cards => cards.map(card => ({
    id: card.dataset.id, name: card.querySelector('h3').textContent,
  })));
  assert.equal(directions.length, 20);
  const results = [];
  for (const [i, direction] of directions.entries()) {
    await page.locator(`[data-id="${direction.id}"] .card-select`).click();
    // Do not capture a halfway CSS palette transition or smooth scroll.
    await page.waitForTimeout(100);
    const file = `${root}/directions/${String(i + 1).padStart(2, '0')}-${direction.id}.png`;
    await page.locator('#hero').screenshot({ path: file });
    results.push({ ...direction, file, time: await page.locator('#forge').getAttribute('data-frame') });
    await writeFile(`${root}/manifest.json`, JSON.stringify(results, null, 2));
  }
  assert.equal(new Set(results.map(r => r.id)).size, 20);
  await page.goto('http://127.0.0.1:5173/sindri.html');
  await page.locator('.look-card').last().waitFor();
  await page.screenshot({ path: `${root}/desktop.png`, fullPage: true });
  await page.close();

  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 },
    reducedMotion: 'no-preference',
  });
  const motion = await context.newPage();
  await motion.clock.install();
  await motion.goto('http://127.0.0.1:5173/sindri.html');
  await motion.locator('#forge').waitFor();
  await motion.clock.pauseAt(await motion.evaluate(() => Date.now() + 1000));
  const cdp = await context.newCDPSession(motion);
  await motion.evaluate(() => {
    document.documentElement.style.scrollBehavior = 'auto';
    scrollTo(0, document.querySelector('.preview-shell').getBoundingClientRect().top + scrollY - 10);
  });
  // Feed actual browser-rendered frames to the system ffmpeg. This avoids a
  // separate Playwright ffmpeg download and gives deterministic simulation time.
  const encoder = spawn('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y',
    '-f', 'image2pipe', '-framerate', '12', '-i', 'pipe:0', '-an',
    '-c:v', 'libx264', '-preset', 'fast', '-crf', '20', '-pix_fmt', 'yuv420p',
    '-movflags', '+faststart', `${root}/motion-preview.mp4`], { stdio: ['pipe', 'ignore', 'inherit'] });
  const encoded = once(encoder, 'close');
  for (const id of ['coal-and-gold', 'terminal-smith', 'moon-forge', 'ghost-smith']) {
    await motion.evaluate(id => { location.hash = id; }, id);
    await motion.clock.runFor(20);
    await motion.locator('#strike').evaluate(button => button.click());
    for (let frame = 0; frame < Math.ceil(3.8 * 12); frame++) {
      await motion.clock.runFor(1000 / 12);
      const image = await cdp.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
      const png = Buffer.from(image.data, 'base64');
      if (!encoder.stdin.write(png)) await once(encoder.stdin, 'drain');
    }
    await motion.locator('#forge').screenshot({ path: `${root}/motion-${id}.png` });
  }
  // A raised-hammer still documents the silhouette away from contact.
  await motion.locator('#strike').evaluate(button => button.click());
  await motion.locator('#pause').evaluate(button => button.click());
  await motion.locator('#forge').screenshot({ path: `${root}/raised-hammer.png` });
  encoder.stdin.end();
  const [exitCode] = await encoded;
  assert.equal(exitCode, 0, 'ffmpeg must finish successfully');
  await context.close();
  console.log(JSON.stringify({ verifiedDirections: results.length, screenshots: `${root}/directions`, video: `${root}/motion-preview.mp4` }, null, 2));
} finally {
  await browser.close();
}
