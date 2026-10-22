import { test, expect } from '@playwright/test';

test('sampled and limited glyph colors, gamma, and extra ramps work on a still', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('#status')).toHaveText('Ready');
  const canvas = page.locator('#ascii');
  const mono = await canvas.screenshot();
  await page.getByLabel('Glyph color', { exact: true }).selectOption('sampled');
  expect((await canvas.screenshot()).equals(mono)).toBe(false);
  const sampled = await canvas.screenshot();
  await page.getByLabel('Glyph color', { exact: true }).selectOption('limited');
  expect((await canvas.screenshot()).equals(sampled)).toBe(false);
  await page.getByRole('button', { name: 'Fine', exact: true }).click();
  await expect(page.locator('#ramp')).not.toHaveValue(' .:-=+*#%@');
  const fine = await canvas.screenshot();
  await page.getByRole('slider', { name: 'Gamma', exact: true }).fill('1.8');
  expect((await canvas.screenshot()).equals(fine)).toBe(false);
});

test('video plays, pauses, seeks and steps with a stable paused character frame', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto('/');
  await expect(page.locator('#status')).toHaveText('Ready');
  await page.getByLabel('Input mode', { exact: true }).selectOption('video');
  await expect(page.locator('#status')).toHaveText('Ready');
  await expect(page.locator('#original-video')).toBeVisible();
  await page.getByRole('button', { name: 'Play', exact: true }).click();
  await expect.poll(() => page.locator('#original-video').evaluate((v: HTMLVideoElement) => v.currentTime)).toBeGreaterThan(0.3);
  await page.getByRole('button', { name: 'Pause', exact: true }).click();
  const still = await page.locator('#ascii').screenshot();
  await page.waitForTimeout(250);
  expect((await page.locator('#ascii').screenshot()).equals(still)).toBe(true);
  await page.getByRole('slider', { name: 'Video position', exact: true }).fill('2');
  await expect.poll(() => page.locator('#original-video').evaluate((v: HTMLVideoElement) => v.currentTime)).toBeCloseTo(2, 1);
  await page.getByRole('button', { name: /Next frame/ }).click();
  await expect.poll(() => page.locator('#original-video').evaluate((v: HTMLVideoElement) => v.currentTime)).toBeGreaterThan(2.02);
  expect(errors).toEqual([]);
});
