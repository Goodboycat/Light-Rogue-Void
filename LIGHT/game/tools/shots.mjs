// (9B) itch screenshots: 8 shots at 1920×1080 → LIGHT/out/shots/ (build artefacts, not committed).
// Usage (from LIGHT/game):
//   npx playwright install chromium        # once per machine
//   bash tools/itch.sh                      # builds out/light-rogue-void-itch/
//   node tools/shots.mjs [--url=http://localhost:8000/index.html]
// Without --url it serves out/light-rogue-void-itch/ itself on a random port.
// Uses only URL flags the game already has: ?wave=N (start wave), ?seed=N (world), ?debug=1 (window.__LIGHT).
import { chromium } from 'playwright';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const g = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const site = path.resolve(g, '..', 'out', 'light-rogue-void-itch');
const outDir = path.resolve(g, '..', 'out', 'shots');
const args = Object.fromEntries(process.argv.slice(2).map(a => { const [k, v] = a.replace(/^--/, '').split('='); return [k, v ?? '1']; }));
fs.mkdirSync(outDir, { recursive: true });

let base = args.url, server;
if (!base) {
  const types = { '.html': 'text/html', '.js': 'text/javascript', '.png': 'image/png', '.json': 'application/json', '.ogg': 'audio/ogg', '.mp3': 'audio/mpeg' };
  server = http.createServer((req, res) => {
    const p = path.join(site, decodeURIComponent(req.url.split('?')[0]).replace(/^\/$/, '/index.html'));
    if (!p.startsWith(site) || !fs.existsSync(p)) { res.writeHead(404); return res.end(); }
    res.writeHead(200, { 'content-type': types[path.extname(p)] || 'application/octet-stream' }); fs.createReadStream(p).pipe(res);
  }).listen(0);
  base = `http://localhost:${server.address().port}/index.html`;
}

// A save that has seen the intro and reached chapter 4, so the menu shows the star chart + Daily card.
const SAVE = { hasSeenIntro: true, maxWaveReached: 31, matter: 250000, defeatedBosses: ['hive_mind', 'void_warden', 'crimson_eclipse'] };

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
const sleep = ms => page.waitForTimeout(ms);
const shot = async name => { await page.screenshot({ path: path.join(outDir, name) }); console.log('shot', name); };
const open = async (q = '') => {
  await page.goto(`${base}?debug=1&seed=7${q}`);
  await page.evaluate(s => { try { const k = 'light_escapes_void_save_v1'; /* save/schema.ts SAVE_KEY */ const cur = JSON.parse(localStorage.getItem(k) || '{}'); localStorage.setItem(k, JSON.stringify({ ...cur, ...s })); } catch {} }, SAVE);
  await page.reload(); await sleep(2500);
};
const start = async () => { await page.getByText('INITIALIZE').click(); await sleep(4000); await page.keyboard.press('Space'); };
const killBoss = () => page.evaluate(() => { const b = window.__LIGHT?.state?.activeBoss; if (b) b.hp = 1; });

try {
  await open(); await shot('01-title.png');
  await open('&wave=3'); await start(); await sleep(3000); await page.keyboard.press('Escape'); await sleep(1200); await shot('02-tree.png');
  await open('&wave=5'); await start(); await sleep(14000); await shot('03-wave5.png');
  for (const [i, w] of [[4, 10], [5, 20], [6, 30]]) { await open(`&wave=${w}`); await start(); await sleep(16000); await shot(`0${i}-boss${i - 3}.png`); }
  // landmark: walk toward the nearest undiscovered world point for a few seconds
  await open('&wave=2'); await start();
  await page.evaluate(() => { const s = window.__LIGHT?.state; const p = s?.world?.points?.[0]; if (s && p) { s.player.x = p.x - 120; s.player.y = p.y; } });
  await sleep(5000); await shot('07-landmark.png');
  await open('&wave=60'); await start(); await sleep(12000); await killBoss(); await sleep(25000); await page.keyboard.press('Space'); await sleep(4000); await shot('08-ending.png');
} finally { await browser.close(); server?.close(); }
console.log('done →', outDir);
