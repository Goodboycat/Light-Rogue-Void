// (M10) Deterministic PNG frame exporter for a cinematic scene (MOVIE.md §3 M10, docs/TRAILER.md source frames).
// Usage: node tools/cineframes.mjs <sceneId> [--fps 30] [--w 1920 --h 1080] [--from 0 --to <dur>] [--out frames/<id>] [--low] [--noblur] [--every 1]
//   node tools/cineframes.mjs constellation                       → frames/constellation/000000.png … at 30 fps, 1920×1080
//   node tools/cineframes.mjs opener_1 --fps 24 --from 2.6 --to 9  → just shots 2–3
//   ffmpeg -framerate 30 -i frames/constellation/%06d.png -c:v libx264 -pix_fmt yuv420p constellation.mp4
// Needs `npm run build` first. Opens `?cinematic=<id>&export=<fps>&mute=1&t=<from>` on a local server; the player then has NO rAF
// loop — this script calls window.__cineStep() (advance exactly 1/fps + render) and screenshots the canvas each step, so the
// output does not depend on wall-clock speed (swiftshader is slow, the frames are still exact). `--every N` keeps 1 in N
// (contact sheets). Wall time ≈ frames × (render + PNG encode) — budget ~0.1–0.3 s per 1080p frame headless.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
const ID = process.argv[2];
if (!ID || ID.startsWith('--')) { console.error('usage: node tools/cineframes.mjs <sceneId> [--fps 30] [--w 1920 --h 1080] [--from s --to s] [--out dir] [--every N] [--low] [--noblur]'); process.exit(1); }
const FPS = +arg('fps', 30), W = +arg('w', 1920), H = +arg('h', 1080), FROM = +arg('from', 0), TO = arg('to', null), EVERY = Math.max(1, +arg('every', 1));
const OUT = path.resolve(arg('out', `frames/${ID}`));
const NOBLUR = process.argv.includes('--noblur'), LOW = process.argv.includes('--low');
const DIST = path.resolve(new URL('.', import.meta.url).pathname, '../dist');
if (!fs.existsSync(path.join(DIST, 'index.html'))) { console.error('dist/ missing — run `npm run build` first'); process.exit(1); }
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
const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
page.on('pageerror', e => console.log('PAGEERROR', e.message));
await page.goto(base + `?cinematic=${ID}&export=${FPS}&mute=1&t=${FROM}${NOBLUR ? '&noblur=1' : ''}${LOW ? '&low=1' : ''}`);
await page.waitForFunction(() => typeof window.__cineStep === 'function', null, { timeout: 30000 });
await page.evaluate(() => document.fonts.ready); // Orbitron / Rajdhani in before frame 0
fs.mkdirSync(OUT, { recursive: true });
const canvas = page.locator('canvas').first();
const toS = TO === null ? Infinity : +TO;
let i = 0, written = 0, state = { t: FROM, frame: 0, done: false };
const t0 = Date.now();
console.log(`cineframes ${ID} ${W}x${H} @${FPS} fps from ${FROM}s${TO !== null ? ` to ${TO}s` : ''} → ${OUT}${LOW ? ' low' : ''}${NOBLUR ? ' noblur' : ''}`);
while (!state.done && state.t <= toS + 1e-6) {
  if (i % EVERY === 0) { await canvas.screenshot({ path: path.join(OUT, String(i).padStart(6, '0') + '.png'), omitBackground: false }); written++; }
  state = await page.evaluate(() => window.__cineStep());
  i++;
  if (i % 60 === 0) process.stdout.write(`  ${i} frames (t=${state.t.toFixed(2)}s, ${((Date.now() - t0) / 1000).toFixed(0)}s wall)\n`);
}
console.log(`done: ${written} png (${i} steps, last t=${state.t.toFixed(2)}s) in ${((Date.now() - t0) / 1000).toFixed(1)}s`);
console.log(`  ffmpeg -framerate ${FPS / EVERY} -i ${path.relative(process.cwd(), OUT)}/%06d.png -c:v libx264 -pix_fmt yuv420p ${ID}.mp4`);
await browser.close(); server.close();
