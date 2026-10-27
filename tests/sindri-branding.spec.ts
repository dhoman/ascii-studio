import { test, expect } from '@playwright/test';

test('SindriSelect branding and exact tagline fit desktop and mobile heroes', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/sindri.html');
  await expect(page).toHaveTitle('SindriSelect — Twenty Forge Studies / ASCII Studio');
  await expect(page.locator('.hero-kicker')).toHaveText('SindriSelect / MASTER OF THE FORGE');
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 1050 });
    const heading = page.locator('#hero h2');
    expect((await heading.innerText()).replace(/\s+/g, ' ')).toBe('The right pro for the job.');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    const headingBox = await heading.boundingBox();
    const heroBox = await page.locator('#hero').boundingBox();
    expect(headingBox!.x + headingBox!.width).toBeLessThanOrEqual(heroBox!.x + heroBox!.width);
    await page.locator('#hero').screenshot({ path: `captures/sindri/branding-${width}.png` });
  }
});
