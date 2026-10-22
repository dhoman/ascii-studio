import { test, expect } from '@playwright/test';

test('every reference loads and styles change the rendered pixels, not the original', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto('/');
  await expect(page.locator('#status')).toHaveText('Ready');
  const choices = await page.locator('#source option').evaluateAll(options => options.map(option => (option as HTMLOptionElement).value));
  expect(choices.length).toBe(5);
  for (const value of choices) {
    await page.locator('#source').selectOption(value);
    await expect(page.locator('#status')).toHaveText('Ready');
    await expect.poll(() => page.locator('#original').evaluate((el: HTMLImageElement) => el.complete && el.naturalWidth > 0)).toBe(true);
    await expect(page.locator('#original')).toHaveAttribute('src', new URL(value, page.url()).href);
  }
  // Decoded source pixels avoid screenshot differences from focus-induced scrolling.
  const originalPixels = () => page.locator('#original').evaluate((image: HTMLImageElement) => {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 64;
    canvas.getContext('2d')!.drawImage(image, 0, 0, 64, 64);
    return canvas.toDataURL();
  });
  const original = await originalPixels();
  const neutral = await page.locator('#ascii').screenshot();
  await page.locator('#contrast').fill('2');
  await expect.poll(async () => (await page.locator('#ascii').screenshot()).equals(neutral)).toBe(false);
  expect(await originalPixels()).toBe(original);
  const contrast = await page.locator('#ascii').screenshot();
  await page.locator('#ramp').fill(' @');
  await expect.poll(async () => (await page.locator('#ascii').screenshot()).equals(contrast)).toBe(false);
  expect(await originalPixels()).toBe(original);
  expect(errors).toEqual([]);
});

test('missing image gives recoverable feedback', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('#status')).toHaveText('Ready');
  await page.route('**/references/*.jpg*', route => route.abort());
  const values = await page.locator('#source option').evaluateAll(options => options.map(option => (option as HTMLOptionElement).value));
  await page.locator('#source').selectOption(values[0]);
  await expect(page.locator('#status')).toContainText(/Could not load|failed/i);
  await page.unroute('**/references/*.jpg*');
  await page.locator('#source').selectOption(values[1]);
  await expect(page.locator('#status')).toHaveText('Ready');
});

test('images remain contained after resizing', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('#status')).toHaveText('Ready');
  for (const width of [1440, 800, 390]) {
    await page.setViewportSize({ width, height: 900 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    for (const selector of ['#original', '#ascii']) {
      const bounds = await page.locator(selector).boundingBox();
      expect(bounds!.width).toBeLessThanOrEqual(width);
      expect(bounds!.height).toBeGreaterThan(100);
    }
  }
});
