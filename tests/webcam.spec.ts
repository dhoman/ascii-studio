import { test, expect } from '@playwright/test';

test('webcam is opt-in, uses video only, and stops tracks on stop and source switch', async ({ page }) => {
  await page.addInitScript(() => {
    const state = { calls: 0, stopped: 0, audio: true };
    Object.assign(window, { cameraTest: state });
    Object.defineProperty(navigator.mediaDevices, 'getUserMedia', { value: async (constraints: MediaStreamConstraints) => {
      state.calls++; state.audio = Boolean(constraints.audio);
      const canvas = document.createElement('canvas');
      canvas.width = 320; canvas.height = 240;
      const ctx = canvas.getContext('2d')!;
      ctx.fillStyle = '#da8544'; ctx.fillRect(0, 0, 320, 240);
      ctx.fillStyle = '#64bca5'; ctx.fillRect(80, 40, 100, 120);
      const stream = canvas.captureStream(15);
      for (const track of stream.getTracks()) {
        const stop = track.stop.bind(track);
        track.stop = () => { state.stopped++; stop(); };
      }
      return stream;
    } });
  });
  await page.goto('/');
  await expect(page.locator('#status')).toHaveText('Ready');
  await page.getByLabel('Input mode', { exact: true }).selectOption('webcam');
  expect(await page.evaluate(() => (window as any).cameraTest.calls)).toBe(0);
  await page.getByRole('button', { name: 'Start camera', exact: true }).click();
  await expect(page.locator('#status')).toHaveText('Camera live');
  expect(await page.evaluate(() => (window as any).cameraTest.audio)).toBe(false);
  await page.getByRole('button', { name: 'Stop camera', exact: true }).click();
  expect(await page.evaluate(() => (window as any).cameraTest.stopped)).toBe(1);
  await page.getByRole('button', { name: 'Start camera', exact: true }).click();
  await expect(page.locator('#status')).toHaveText('Camera live');
  await page.getByLabel('Input mode', { exact: true }).selectOption('image');
  await expect(page.locator('#status')).toHaveText('Ready');
  expect(await page.evaluate(() => (window as any).cameraTest.stopped)).toBe(2);
});

test('camera denial is recoverable without breaking still images', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator.mediaDevices, 'getUserMedia', { value: async () => { throw new DOMException('Permission denied', 'NotAllowedError'); } });
  });
  await page.goto('/');
  await expect(page.locator('#status')).toHaveText('Ready');
  await page.getByLabel('Input mode', { exact: true }).selectOption('webcam');
  await page.getByRole('button', { name: 'Start camera', exact: true }).click();
  await expect(page.locator('#status')).toContainText('Camera permission denied');
  await page.getByLabel('Input mode', { exact: true }).selectOption('image');
  await expect(page.locator('#status')).toHaveText('Ready');
});
