// Scoring tests: simulated photos of hand copies must pass, other pictures
// and scribbles must not. Run: npm test   (add --verbose to print scores)
import { createRequire } from 'node:module';
import { startServer } from './serve.mjs';

const { chromium } = createRequire(import.meta.url)('playwright');
const verbose = process.argv.includes('--verbose');
const server = await startServer(0);
const browser = await chromium.launch();
const page = await browser.newPage();
await page.goto(`http://localhost:${server.address().port}/tests/blank.html`);
const results = await page.evaluate(async () => {
  const S = await import('/js/scoring.js');
  const { LEVELS } = await import('/js/levels.js');
  const { fakePhoto, scribble } = await import('/tests/synth.js');
  const playable = LEVELS.filter((l) => l.playable);
  const paths = (l) => l.steps.flatMap((s) => s.paths);
  const res = {};
  for (const lvl of playable) {
    const target = paths(lvl);
    const sc = (img) => S.scoreDrawing(img, target).score;
    const row = { neat: [], kid: [], sloppy: [], wrong: [], scribble: [] };
    for (let seed = 1; seed <= 4; seed++) {
      row.neat.push(sc(fakePhoto(target, { seed, wobble: 4, table: seed % 2 === 0, dark: seed % 3 === 0 })));
      row.kid.push(sc(fakePhoto(target, { seed, wobble: 8, jitter: 12 })));
      row.sloppy.push(sc(fakePhoto(target, { seed, wobble: 12, jitter: 22 })));
      for (const other of playable) if (other !== lvl) row.wrong.push(sc(fakePhoto(paths(other), { seed, wobble: 6 })));
      row.scribble.push(sc(fakePhoto(scribble(seed), { seed })));
    }
    res[lvl.title] = row;
  }
  // Blank paper must be rejected, not scored.
  const blank = document.createElement('canvas');
  blank.width = 300; blank.height = 300;
  const ctx = blank.getContext('2d');
  ctx.fillStyle = '#eeeae0'; ctx.fillRect(0, 0, 300, 300);
  res.blankRejected = S.scoreDrawing(ctx.getImageData(0, 0, 300, 300), paths(playable[0])).ok === false;
  return res;
});
await browser.close();
server.close();

let failed = 0;
const check = (name, ok, detail) => {
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${name}${detail ? '  ' + detail : ''}`);
  if (!ok) failed++;
};
const avg = (a) => a.reduce((x, y) => x + y, 0) / a.length;
for (const [title, row] of Object.entries(results)) {
  if (title === 'blankRejected') continue;
  if (verbose) for (const [k, v] of Object.entries(row)) console.log(`     ${title} ${k}: ${v.join(' ')}`);
  check(`${title}: neat copies pass`, Math.min(...row.neat) >= 80, row.neat.join(' '));
  check(`${title}: typical kid copies pass`, Math.min(...row.kid) >= 80, row.kid.join(' '));
  check(`${title}: sloppy copies score above other pictures`, avg(row.sloppy) > Math.max(...row.wrong), `${avg(row.sloppy).toFixed(0)} vs ${Math.max(...row.wrong)}`);
  check(`${title}: other pictures fail`, Math.max(...row.wrong) < 70, row.wrong.join(' '));
  check(`${title}: scribbles fail`, Math.max(...row.scribble) < 80, row.scribble.join(' '));
}
check('blank paper is rejected', results.blankRejected);
process.exit(failed ? 1 : 0);
