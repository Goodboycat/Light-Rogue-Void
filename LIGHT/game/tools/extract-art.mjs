#!/usr/bin/env node
// (5B) Gallery → PNG sprites + atlas.  `npm run art`  (needs `npm run build` first — serves dist/ with vite preview)
// Opens /?gallery=1&sheet=1&scale=S (transparent sheet, no labels/borders), reads window.__GALLERY,
// slices every cell in-page (trim to alpha bounds), writes public/sprites/<id>.png + public/sprites/atlas.json.
// Deterministic: frame 0, no RAF, same cell order as docs/ART.md. Playwright is a devDependency only.
import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync, readdirSync, unlinkSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const GAME = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(GAME, 'public', 'sprites');
const SCALE = parseInt(process.env.ART_SCALE || process.argv[2] || '1', 10);
const PORT = 4179;
const BUDGET = 1.5 * 1024 * 1024;

export const spriteId = (label) => label.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');

const alive = () => fetch(`http://localhost:${PORT}/`).then(r => r.ok).catch(() => false);
// Reuses a preview already listening on PORT; otherwise spawns `vite preview` and polls until it answers.
const serve = async () => {
    if (await alive()) return { kill() {} };
    const p = spawn(path.join(GAME, 'node_modules', '.bin', 'vite'), ['preview', '--port', String(PORT), '--strictPort'], { cwd: GAME, stdio: 'ignore' });
    for (let i = 0; i < 60; i++) { await new Promise(r => setTimeout(r, 500)); if (await alive()) return p; }
    p.kill(); throw new Error('vite preview did not start');
};

const main = async () => {
    const server = await serve();
    try {
        const browser = await chromium.launch();
        const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
        page.on('console', m => { if (m.type() === 'error') console.error('[page]', m.text()); });
        await page.goto(`http://localhost:${PORT}/?gallery=1&sheet=1&scale=${SCALE}`);
        await page.waitForFunction(() => window.__GALLERY && window.__GALLERY.units);
        const sprites = await page.evaluate(() => {
            const g = window.__GALLERY;
            const src = document.getElementById('gallery-canvas');
            const sctx = src.getContext('2d');
            const S = g.scale, cw = g.cell * S, ch = (g.cell + g.labelH) * S;
            const out = [];
            g.cells.forEach((label, i) => {
                const x0 = (i % g.cols) * cw, y0 = Math.floor(i / g.cols) * ch;
                const img = sctx.getImageData(x0, y0, cw, cw);
                const d = img.data;
                let minX = cw, minY = cw, maxX = -1, maxY = -1;
                for (let y = 0; y < cw; y++) for (let x = 0; x < cw; x++) {
                    if (d[(y * cw + x) * 4 + 3] > 8) { if (x < minX) minX = x; if (x > maxX) maxX = x; if (y < minY) minY = y; if (y > maxY) maxY = y; }
                }
                if (maxX < 0) { out.push({ label, empty: true }); return; }
                const w = maxX - minX + 1, h = maxY - minY + 1;
                // posterize to 5 bits/channel (6 for alpha) — glow gradients lose nothing visible, PNG deflate shrinks ~3×
                for (let k = 0; k < d.length; k += 4) { d[k] &= 0xf8; d[k + 1] &= 0xf8; d[k + 2] &= 0xf8; d[k + 3] = d[k + 3] < 8 ? 0 : (d[k + 3] & 0xfc); }
                const c = document.createElement('canvas'); c.width = w; c.height = h;
                c.getContext('2d').putImageData(img, -minX, -minY);
                // anchor = where the cell centre (world 0,0) falls inside the trimmed sprite, in sprite px
                out.push({ label, w, h, anchorX: cw / 2 - minX, anchorY: cw / 2 - minY, unit: g.units[i] * S, png: c.toDataURL('image/png') });
            });
            return out;
        });
        await browser.close();

        mkdirSync(OUT, { recursive: true });
        for (const f of readdirSync(OUT)) unlinkSync(path.join(OUT, f));
        const atlas = { scale: SCALE, cell: 160, sprites: {} };
        let total = 0, empty = [];
        sprites.forEach((s, i) => {
            const id = spriteId(s.label);
            if (s.empty) { empty.push(`${i} ${s.label}`); return; }
            const buf = Buffer.from(s.png.split(',')[1], 'base64');
            writeFileSync(path.join(OUT, `${id}.png`), buf);
            total += buf.length;
            atlas.sprites[id] = { index: i, label: s.label, w: s.w, h: s.h, anchorX: +s.anchorX.toFixed(1), anchorY: +s.anchorY.toFixed(1), unit: +s.unit.toFixed(3), bytes: buf.length };
        });
        writeFileSync(path.join(OUT, 'atlas.json'), JSON.stringify(atlas, null, 1));
        const n = Object.keys(atlas.sprites).length;
        console.log(`sprites: ${n} written, ${empty.length} empty (${empty.join(', ')}), scale ${SCALE}, total ${(total / 1024).toFixed(0)} kB`);
        const big = Object.entries(atlas.sprites).sort((a, b) => b[1].bytes - a[1].bytes).slice(0, 5).map(([k, v]) => `${k} ${(v.bytes / 1024).toFixed(0)}kB`);
        console.log('largest:', big.join(', '));
        if (total > BUDGET) { console.error(`OVER BUDGET (${(BUDGET / 1024).toFixed(0)} kB) — rerun with ART_SCALE=1`); process.exitCode = 2; }
    } finally {
        server.kill();
    }
};
main().catch(e => { console.error(e); process.exit(1); });
