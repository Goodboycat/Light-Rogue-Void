// (7B) Headless perf bench: wave 40 for N seconds under Chrome CPU throttling.
// Usage: node tools/bench.mjs [--mode LOW|MEDIUM|HIGH] [--throttle 4] [--secs 30] [--wave 40] [--w 390 --h 844]
// Needs `npm run build` first (serves ./dist on a random port) and playwright's chromium.
// Prints avg / p95 / worst frame ms, fps, enemies + particles alive at the end. Rule 9: this only measures, it never caps.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';
// chromium_headless_shell may be missing in the sandbox → CHROME_BIN=/home/user/.cache/ms-playwright/chromium-*/chrome-linux64/chrome

const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
const MODE = arg('mode', 'LOW'), THROTTLE = +arg('throttle', 4), SECS = +arg('secs', 30), WAVE = +arg('wave', 40);
const W = +arg('w', 390), H = +arg('h', 844);
const DIST = path.resolve(new URL('.', import.meta.url).pathname, '../dist');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.json': 'application/json', '.svg': 'image/svg+xml' };

const server = http.createServer((req, res) => {
    let p = decodeURIComponent(req.url.split('?')[0]);
    if (p === '/') p = '/index.html';
    const f = path.join(DIST, p);
    if (!f.startsWith(DIST) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end(); }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream' });
    fs.createReadStream(f).pipe(res);
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
const url = `http://127.0.0.1:${server.address().port}/?wave=${WAVE}&debug=1`;

const browser = await chromium.launch({ executablePath: process.env.CHROME_BIN || undefined, headless: true, channel: undefined, args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: W, height: H }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 });
page.on('pageerror', e => console.log('PAGEERROR', e.message));
// pre-seed save: intro seen, all waves reached, fixed quality mode
await page.addInitScript(({ mode }) => {
    const KEY = 'light_escapes_void_save_v1';
    const base = JSON.parse(localStorage.getItem(KEY) || '{}');
    localStorage.setItem(KEY, JSON.stringify({
        ...base, hasSeenIntro: true, maxWaveReached: 60,
        settings: { ...(base.settings || {}), showTouchControls: true, performanceMode: mode, haptics: 'OFF', masterVolume: 0 },
    }));
}, { mode: MODE });
await page.goto(url, { waitUntil: 'networkidle' });
const start = page.locator('button', { hasText: /begin|start|enter|play/i }).first();
await start.waitFor({ timeout: 15000 });
await start.click();
await page.waitForFunction(() => (window).__LIGHT && (window).__LIGHT.state && (window).__LIGHT.state.frame > 10, null, { timeout: 20000 });
// dismiss any chapter card / cinematic with a key press, then hold the stick still (player stands and fights)
await page.keyboard.press('Space');

const cdp = await page.context().newCDPSession(page);
await cdp.send('Emulation.setCPUThrottlingRate', { rate: THROTTLE });

const res = await page.evaluate(async (secs) => {
    const L = window.__LIGHT;
    const frames = [];
    let last = performance.now();
    const t0 = last;
    let enemiesMax = 0, particlesMax = 0;
    await new Promise(resolve => {
        const tick = () => {
            const now = performance.now();
            frames.push(now - last); last = now;
            const s = window.__LIGHT?.state;
            if (s) { enemiesMax = Math.max(enemiesMax, s.enemies.length); particlesMax = Math.max(particlesMax, s.particles.length); }
            if (now - t0 < secs * 1000) requestAnimationFrame(tick); else resolve();
        };
        requestAnimationFrame(tick);
    });
    frames.shift();
    const sorted = [...frames].sort((a, b) => a - b);
    const avg = frames.reduce((a, b) => a + b, 0) / frames.length;
    const s = window.__LIGHT?.state;
    return {
        frames: frames.length, avgMs: +avg.toFixed(2), fps: +(1000 / avg).toFixed(1),
        p95Ms: +sorted[Math.floor(sorted.length * 0.95)].toFixed(2), worstMs: +sorted[sorted.length - 1].toFixed(2),
        under33ms: +((frames.filter(f => f <= 33.4).length / frames.length) * 100).toFixed(1),
        wave: window.__LIGHT?.wave, enemies: s?.enemies.length, enemiesMax, particles: s?.particles.length, particlesMax,
        projectiles: s?.projectiles.length, playerHp: s?.player?.hp,
    };
}, SECS);

console.log(JSON.stringify({ mode: MODE, throttle: THROTTLE, secs: SECS, viewport: `${W}x${H}`, ...res }));
await browser.close();
server.close();
