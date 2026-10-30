// (M1) Headless per-shot ms/frame for a cinematic scene (MOVIE.md §2 perf mandate, prompt step 4).
// Usage: node tools/cinebench.mjs <sceneId|all> [--throttle 1|4] [--w 1920 --h 1080] [--dpr 1] [--noblur] [--timeout 120]
//   desktop:     node tools/cinebench.mjs opener_1
//   phone-class: node tools/cinebench.mjs opener_1 --throttle 4 --w 390 --h 844 --dpr 2
// Needs `npm run build` first. Plays `?cinematic=<id>&mute=1` on a local server and reads window.__cinePerf
// (written by CinematicPlayer in debug mode) when the scene ends. Prints avg / max ms per shot. Software GL
// (swiftshader) + headless → treat numbers as an UPPER bound (M0 handoff note).
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
const NOBLUR = process.argv.includes('--noblur'), TIMEOUT = +arg('timeout', 120);
const ID = process.argv[2] || 'all', THROTTLE = +arg('throttle', 1), W = +arg('w', 1920), H = +arg('h', 1080), DPR = +arg('dpr', 1);
const DIST = path.resolve(new URL('.', import.meta.url).pathname, '../dist');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.json': 'application/json', '.svg': 'image/svg+xml', '.woff2': 'font/woff2' };
const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]); if (p === '/') p = '/index.html';
  const f = path.join(DIST, p);
  if (!f.startsWith(DIST) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(res);
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
const base = `http://127.0.0.1:${server.address().port}/`;
const browser = await chromium.launch({ executablePath: process.env.CHROME_BIN || undefined, headless: true, args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: DPR });
page.on('pageerror', e => console.log('PAGEERROR', e.message));
const cdp = await page.context().newCDPSession(page);
if (THROTTLE > 1) await cdp.send('Emulation.setCPUThrottlingRate', { rate: THROTTLE });

let ids = [ID];
if (ID === 'all') { await page.goto(base + '?cinematic=_list'); ids = await page.$$eval('ul li a', as => as.map(a => a.textContent.trim())); }
console.log(`cinebench ${W}x${H} dpr${DPR} throttle${THROTTLE}x${NOBLUR ? ' noblur' : ''}`);
for (const id of ids) {
  await page.goto(base + `?cinematic=${id}&mute=1${NOBLUR ? '&noblur=1' : ''}`);
  await page.waitForFunction(() => document.body.innerText.includes('— done.'), null, { timeout: TIMEOUT * 1000 });
  const perf = await page.evaluate(() => window.__cinePerf);
  const shots = await page.evaluate(() => Array.from(document.querySelectorAll('ol li')).map(li => li.textContent.slice(0, 60)));
  console.log(`\n${id}`);
  for (const n of Object.keys(perf.shots).map(Number).sort((a, b) => a - b)) { const r = perf.shots[n]; console.log(`  shot ${n}: avg ${(r.acc / r.n).toFixed(2)} ms  max ${r.max.toFixed(1)} ms  (${r.n} frames)  ${shots[n - 1] ?? ''}`); }
}
await browser.close(); server.close();
