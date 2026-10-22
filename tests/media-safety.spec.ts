import { test, expect } from '@playwright/test';

test('late camera permission is discarded when the input changes', async ({ page }) => {
  await page.addInitScript(() => {
    Object.assign(window, { lateCamera: { stopped: 0, resolve: undefined } });
    Object.defineProperty(navigator.mediaDevices, 'getUserMedia', { value: () => new Promise<MediaStream>(resolve => {
      (window as any).lateCamera.resolve = () => {
        const canvas = document.createElement('canvas'); canvas.width = 64; canvas.height = 64;
        canvas.getContext('2d')!.fillRect(0, 0, 64, 64);
        const stream = canvas.captureStream(15);
        stream.getTracks().forEach(track => { const stop = track.stop.bind(track); track.stop = () => { (window as any).lateCamera.stopped++; stop(); }; });
        resolve(stream);
      };
    }) });
  });
  await page.goto('/'); await expect(page.locator('#status')).toHaveText('Ready');
  await page.locator('#mode').selectOption('webcam');
  await page.getByRole('button', { name: 'Start camera', exact: true }).click();
  await expect(page.locator('#status')).toContainText('Requesting');
  await page.locator('#mode').selectOption('image');
  await expect(page.locator('#status')).toHaveText('Ready');
  await page.evaluate(() => (window as any).lateCamera.resolve());
  await expect.poll(() => page.evaluate(() => (window as any).lateCamera.stopped)).toBe(1);
  await expect(page.locator('#status')).toHaveText('Ready');
});

test('stop camera cancels a pending permission request and stops its late stream', async ({ page }) => {
  await page.addInitScript(() => {
    Object.assign(window, { pendingCamera: { stopped: 0, resolve: undefined } });
    Object.defineProperty(navigator.mediaDevices, 'getUserMedia', { value: () => new Promise<MediaStream>(resolve => {
      (window as any).pendingCamera.resolve = () => {
        const canvas = document.createElement('canvas'); canvas.width = canvas.height = 64;
        const stream = canvas.captureStream(15);
        stream.getTracks().forEach(track => { const stop = track.stop.bind(track); track.stop = () => { (window as any).pendingCamera.stopped++; stop(); }; });
        resolve(stream);
      };
    }) });
  });
  await page.goto('/'); await expect(page.locator('#status')).toHaveText('Ready');
  await page.locator('#mode').selectOption('webcam');
  await page.getByRole('button', { name: 'Start camera', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Stop camera', exact: true })).toBeEnabled();
  await page.getByRole('button', { name: 'Stop camera', exact: true }).click();
  await page.evaluate(() => (window as any).pendingCamera.resolve());
  await expect.poll(() => page.evaluate(() => (window as any).pendingCamera.stopped)).toBe(1);
  await expect(page.locator('#status')).toHaveText('Camera stopped');
});

test('opening a local file stays local and invalid study JSON leaves the style unchanged', async ({ page }) => {
  const remote: string[] = [];
  page.on('request', req => { if (!req.url().startsWith('http://127.0.0.1:5173') && !req.url().startsWith('blob:') && !req.url().startsWith('data:')) remote.push(req.url()); });
  await page.goto('/'); await expect(page.locator('#status')).toHaveText('Ready');
  await page.getByLabel('Open local media', { exact: true }).setInputFiles('references/previews/00-leaves-and-bark-photo-pan.webm');
  await expect(page.locator('#mode')).toHaveValue('video');
  await expect(page.locator('#status')).toHaveText('Ready');
  expect(await page.locator('#source').inputValue()).toMatch(/^blob:/);
  await page.getByText('Save a look / export a study', { exact: true }).click();
  await page.getByLabel('Import study JSON', { exact: true }).setInputFiles({ name: 'invalid.json', mimeType: 'application/json', buffer: Buffer.from('{"version":99}') });
  await expect(page.locator('#study-message')).toContainText('Error');
  await expect(page.locator('#density')).toHaveValue('96');
  expect(remote).toEqual([]);
});
