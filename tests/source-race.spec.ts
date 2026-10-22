import { test, expect } from '@playwright/test';

test('a slow earlier image cannot replace the most recently selected image', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('#status')).toHaveText('Ready');
  const values = await page.locator('#source option').evaluateAll(options => options.map(option => (option as HTMLOptionElement).value));
  let release!: () => void;
  const held = new Promise<void>(resolve => { release = resolve; });
  let arrived!: () => void;
  const requested = new Promise<void>(resolve => { arrived = resolve; });
  await page.route(`**${values[0]}`, async route => {
    arrived();
    await held;
    await route.continue();
  });
  await page.locator('#source').selectOption(values[0]);
  await requested;
  await page.locator('#source').selectOption(values[3]);
  await expect(page.locator('#original')).toHaveAttribute('src', new URL(values[3], page.url()).href);
  release();
  await page.waitForResponse(response => response.url().endsWith(values[0]));
  await page.waitForTimeout(250);
  await expect(page.locator('#original')).toHaveAttribute('src', new URL(values[3], page.url()).href);
});
