import { test, expect } from '@playwright/test';
import { forgeLooks } from '../src/sindri-presets';

test('all twenty directions render nonblank, distinct frames and preserve paused time',async({page})=>{
  await page.emulateMedia({reducedMotion:'reduce'});
  const errors:string[]=[];page.on('pageerror',e=>errors.push(String(e)));
  await page.goto('/sindri.html');
  await expect(page.locator('.look-card')).toHaveCount(20);
  await expect(page.locator('#pause')).toHaveText('Play motion');
  const signatures:string[]=[];
  const frame=await page.locator('#forge').getAttribute('data-frame');
  for(const look of forgeLooks){
    await page.locator(`[data-id="${look.id}"] .card-select`).click();
    await expect(page.locator('#look-name')).toHaveText(look.name);
    await expect(page.locator('#forge')).toHaveAttribute('data-frame',frame!);
    const result=await page.locator('#forge').evaluate((canvas:HTMLCanvasElement)=>{
      const c=canvas.getContext('2d')!, w=canvas.width,h=canvas.height;
      const data=c.getImageData(0,0,w,h).data;
      let changed=0;for(let n=0;n<data.length;n+=4)if(data[n]!==data[0]||data[n+1]!==data[1]||data[n+2]!==data[2])changed++;
      return {changed,signature:canvas.toDataURL()};
    });
    expect(result.changed).toBeGreaterThan(1000);signatures.push(result.signature);
  }
  expect(new Set(signatures).size).toBe(20);expect(errors).toEqual([]);
});
test('motion advances, pause freezes, strike restarts, navigation wraps and copy toggles',async({page})=>{
  await page.goto('/sindri.html');
  await page.locator('#pause').click();
  const frozen=await page.locator('#forge').getAttribute('data-frame');
  const a=await page.locator('#forge').screenshot();await page.waitForTimeout(250);
  expect(await page.locator('#forge').getAttribute('data-frame')).toBe(frozen);
  expect(a.equals(await page.locator('#forge').screenshot())).toBe(true);
  await page.locator('#strike').click();await expect(page.locator('#pause')).toHaveText('Pause motion');
  await page.waitForTimeout(350);expect(await page.locator('#forge').getAttribute('data-frame')).not.toBe(frozen);
  await page.locator('#pause').click();
  await page.locator('#prev').click();await expect(page.locator('#look-name')).toHaveText('Bifröst');
  await page.locator('#next').click();await expect(page.locator('#look-name')).toHaveText('Coal & gold');
  await page.locator('#copy').uncheck();await expect(page.locator('#hero')).toHaveClass(/no-copy/);
  await page.locator('#copy').check();await expect(page.locator('#hero')).not.toHaveClass(/no-copy/);
});
test('filters, persistent shortlist, direct links and real exports work',async({page})=>{
  await page.goto('/sindri.html#moon-forge');await expect(page.locator('#look-name')).toHaveText('Moon forge');
  await page.locator('[data-filter="ascii"]').click();await expect(page.locator('.look-card:visible')).toHaveCount(5);
  await page.locator('[data-filter="all"]').click();
  await page.getByRole('button',{name:'Shortlist Moon forge',exact:true}).click();
  await page.locator('[data-filter="saved"]').click();await expect(page.locator('.look-card:visible')).toHaveCount(1);
  await page.reload();await expect(page.locator('#saved-count')).toHaveText('1');
  const png=page.waitForEvent('download');await page.locator('#save').click();expect((await png).suggestedFilename()).toMatch(/moon-forge.*\.png$/);
  const json=page.waitForEvent('download');await page.locator('#study').click();expect((await json).suggestedFilename()).toBe('sindri-moon-forge.json');
  await expect(page.locator('#pause')).toHaveText('Play motion');
});
test('narrow viewport has no horizontal overflow and all directions remain reachable',async({page})=>{
  await page.setViewportSize({width:390,height:844});await page.emulateMedia({reducedMotion:'reduce'});
  await page.goto('/sindri.html');
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.getByRole('button',{name:'Preview Bifröst',exact:true}).click();await expect(page.locator('#look-name')).toHaveText('Bifröst');
  await page.screenshot({path:'captures/sindri/mobile.png',fullPage:true});
});
