import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const base = new URL('./', import.meta.url);
const catalog = JSON.parse(await readFile(new URL('catalog.json', base), 'utf8'));
const browser = await chromium.launch({
  executablePath: process.env.AGENT_BROWSER_EXECUTABLE_PATH,
  headless: true,
  args: ['--no-sandbox'],
});
try {
  const page = await browser.newPage({ viewport: { width: 1512, height: 1100 } });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  const url = 'http://localhost:5173/research/uncommon-web/index.html';
  const response = await page.request.get(url);
  assert.equal(response.status(), 200);
  await page.goto(new URL('index.html', base).href);
  assert.equal(await page.locator('#rows tr').count(), 393);
  await page.locator('#search').fill('textmode.js');
  assert.equal(await page.locator('#rows tr').count(), 1);
  await page.locator('summary').click();
  assert.match(await page.locator('#rows').innerText(), /TypeScript development source.*private/);
  await page.locator('#reset').click();
  await page.selectOption('#status', 'archived');
  assert.equal(await page.locator('#rows tr').count(), catalog.libraries.filter(r => r.archived).length);
  await page.locator('#reset').click();
  await page.selectOption('#status', 'missing');
  assert.equal(await page.locator('#rows tr').count(), catalog.libraries.filter(r => r.stars === null).length);
  await page.locator('#reset').click();
  await page.selectOption('#sort', 'stars');
  const highest = [...catalog.libraries].sort((a,b) => (b.stars ?? -1) - (a.stars ?? -1))[0];
  assert.equal(await page.locator('#rows .name').first().innerText(), highest.name);
  await page.locator('#reset').click();
  await page.selectOption('#status', 'shortlist');
  assert.equal(await page.locator('#rows tr').count(), 18);
  await page.screenshot({ path: fileURLToPath(new URL('preview.png', base)) });
  for (const file of ['catalog.csv', 'catalog.json', 'catalog.md']) {
    const asset = await page.request.get(new URL(file, url).href);
    assert.equal(asset.status(), 200, file);
  }
  await page.setViewportSize({ width: 390, height: 844 });
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
  // Also verify the live server after testing portable file:// interaction.
  await page.goto(url);
  assert.equal(await page.locator('#rows tr').count(), 393);
  assert.deepEqual(errors, []);
  console.log('Browser checks passed: HTTP, 393 rows, search, evidence expansion, archive/missing/shortlist filters, star sorting, all exports, mobile containment, offline file mode, zero JS errors.');
} finally {
  await browser.close();
}
