import { test, expect } from '@playwright/test';

test('loads a local original beside a rendered ASCII frame', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto('/');
  await expect(page.locator('#status')).toHaveText('Ready');
  await expect(page.locator('#original')).toBeVisible();
  await expect(page.locator('#ascii')).toBeVisible();
  expect(await page.locator('#original').evaluate((el: HTMLImageElement) => el.naturalWidth)).toBeGreaterThan(0);
  await expect(page.locator('#grid-size')).toContainText('96 ×');
  expect(errors).toEqual([]);
});

test('ready shows the final still frame without a loading fade', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('#status')).toHaveText('Ready');
  expect(await page.locator('#ascii').getAttribute('data-frame')).not.toBeNull();
  const first = await page.locator('#ascii').screenshot();
  await page.waitForTimeout(750);
  expect((await page.locator('#ascii').screenshot()).equals(first)).toBe(true);
});

test('density changes the actual rendered grid', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('#status')).toHaveText('Ready');
  const before = await page.locator('#ascii').screenshot();
  await page.getByLabel('Grid density').fill('160');
  await expect(page.locator('#grid-size')).toContainText('160 ×');
  expect((await page.locator('#ascii').screenshot()).equals(before)).toBe(false);
});

test('contrast changes only the character rendering', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('#status')).toHaveText('Ready');
  const original = await page.locator('#original').screenshot();
  const before = await page.locator('#ascii').screenshot();
  await page.getByRole('slider', { name: 'Contrast', exact: true }).fill('2.5');
  await expect(page.locator('#contrast-value')).toHaveText('2.50×');
  expect((await page.locator('#ascii').screenshot()).equals(before)).toBe(false);
  expect((await page.locator('#original').screenshot()).equals(original)).toBe(true);
});

test('editable ramp preserves spaces, rejects empty input, and recovers with presets', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('#status')).toHaveText('Ready');
  const before = await page.locator('#ascii').screenshot();
  const ramp = page.getByRole('textbox', { name: 'Glyph ramp', exact: true });
  await ramp.fill(' @');
  await expect(ramp).toHaveValue(' @');
  const changed = await page.locator('#ascii').screenshot();
  expect(changed.equals(before)).toBe(false);
  await ramp.fill('');
  await expect(page.locator('#ramp-error')).toContainText('at least one visible');
  expect((await page.locator('#ascii').screenshot()).equals(changed)).toBe(true);
  await page.getByRole('button', { name: 'Classic', exact: true }).click();
  await expect(ramp).toHaveValue(' .:-=+*#%@');
  await expect(page.locator('#ramp-error')).toBeEmpty();
  expect((await page.locator('#ascii').screenshot()).equals(before)).toBe(true);
});

test('reset restores the style without changing the selected source', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('#status')).toHaveText('Ready');
  const source = await page.locator('#source').inputValue();
  await page.locator('#density').fill('160');
  await page.locator('#contrast').fill('2');
  await page.locator('#ramp').fill(' @');
  await page.getByRole('button', { name: 'Reset style', exact: true }).click();
  await expect(page.locator('#density')).toHaveValue('96');
  await expect(page.locator('#contrast')).toHaveValue('1');
  await expect(page.locator('#ramp')).toHaveValue(' .:-=+*#%@');
  await expect(page.locator('#source')).toHaveValue(source);
});
