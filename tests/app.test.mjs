// End-to-end check of the game flow in a real browser:
// map -> level 1 demo -> upload a photo -> pass -> level 2 unlocked;
// then a weak drawing -> "Good job" -> move on anyway.
import { createRequire } from 'node:module';
import { startServer } from './serve.mjs';

const { chromium } = createRequire(import.meta.url)('playwright');
const shots = process.argv.includes('--shots') ? process.argv[process.argv.indexOf('--shots') + 1] : null;
const server = await startServer(0);
const base = `http://localhost:${server.address().port}`;
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1100, height: 900 } });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));

let failed = 0;
const check = (name, ok) => { console.log(`${ok ? 'ok  ' : 'FAIL'} ${name}`); if (!ok) failed++; };
const shot = async (name) => shots && page.screenshot({ path: `${shots}/${name}.png`, fullPage: true });

// Make a fake photo (PNG bytes) of a level's drawing, using the test helper.
async function photoOf(levelId, opts) {
  const dataUrl = await page.evaluate(async ({ levelId, opts }) => {
    const { getLevel, allPaths } = await import('/js/levels.js');
    const { fakePhoto } = await import('/tests/synth.js');
    const img = fakePhoto(allPaths(getLevel(levelId)), opts);
    const c = document.createElement('canvas');
    c.width = img.width; c.height = img.height;
    c.getContext('2d').putImageData(img, 0, 0);
    return c.toDataURL('image/png');
  }, { levelId, opts });
  return { name: 'drawing.png', mimeType: 'image/png', buffer: Buffer.from(dataUrl.split(',')[1], 'base64') };
}

await page.goto(base);
await page.evaluate(() => localStorage.clear());
await page.reload();
check('map shows 12 levels', (await page.locator('.level-card').count()) === 12);
check('only level 1 is open at start', (await page.locator('.level-card.open').count()) === 1);
await shot('1-map');

await page.click('a[href="#/level/1"]');
await page.waitForSelector('#demo path', { state: 'attached' });
await page.click('#play');
await page.waitForTimeout(1500);
check('demo shows step captions', (await page.textContent('#caption')).includes('Step 1'));
await shot('2-level-demo');

await page.setInputFiles('#file', await photoOf(1, { seed: 3, wobble: 7, jitter: 10 }));
await page.waitForSelector('#editor:not([hidden])');
await page.click('#check');
await page.waitForSelector('.result-card', { timeout: 20000 });
check('good copy passes', (await page.textContent('.result-card h3')).includes('passed'));
await shot('3-pass');

await page.click('a[href="#/"]');
check('level 2 unlocked after passing', (await page.locator('a[href="#/level/2"]').count()) === 1);
check('level 1 shows best score on map', (await page.textContent('a[href="#/level/1"]')).includes('Best'));

// Weak attempt on level 2: draw level 1's picture instead.
await page.click('a[href="#/level/2"]');
await page.setInputFiles('#file', await photoOf(1, { seed: 5 }));
await page.waitForSelector('#editor:not([hidden])');
await page.click('#check');
await page.waitForSelector('.result-card', { timeout: 20000 });
check('wrong picture gets "Good job" and does not pass', (await page.textContent('.result-card h3')).includes('Good job'));
check('offers move on anyway', (await page.locator('#next-level').textContent()).includes('anyway'));
check('offers draw again', (await page.locator('#again').count()) === 1);
await shot('4-try-again');
await page.click('#next-level');
await page.waitForSelector('.level-head h1:has-text("Pirate")', { timeout: 5000 }).catch(() => {});
const h1 = await page.textContent('.level-head h1'); check('moved on to level 3', h1.includes('Pirate Kid')); if (!h1.includes('Pirate')) console.log(page.url(), h1);

// Replay level 1 and keep the best score.
await page.goto(`${base}/#/level/1`);
await page.waitForSelector('.level-head');
const bestBefore = await page.textContent('.level-head .best');
await page.setInputFiles('#file', await photoOf(2, { seed: 2 }));
await page.click('#check');
await page.waitForSelector('.result-card', { timeout: 20000 });
check('replaying a level keeps the best score', (await page.textContent('.level-head .best')) === bestBefore);

await page.setViewportSize({ width: 390, height: 844 });
await page.goto(`${base}/#/level/3`);
await page.waitForSelector('#demo path', { state: 'attached' });
const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
check('no sideways scrolling on a phone', !overflow);
await shot('5-phone');

check('no page errors', errors.length === 0);
if (errors.length) console.log(errors);
await browser.close();
server.close();
process.exit(failed ? 1 : 0);
