// (5A step 6) `?gallery=1` — static sprite sheet: every drawable thing side by side, one labelled cell each.
// Deterministic (frame 0, no animation) so 5B can screenshot it and cut sprites. `?gallery=1&scale=2` doubles DPR.
// Cell order is documented in docs/ART.md — 5B relies on it; append new cells at the END of a section only.
import React, { useEffect, useRef } from 'react';
import { ENEMIES } from '../enemies';
import { BOSSES, BOSS_MINIONS } from '../bosses';
import { drawEnemy } from './game/renderer/EnemyRenderer';
import { drawSparkBody, drawBurstRing, PLAYER_STAGES } from './game/renderer/PlayerRenderer';
import { drawEssenceOrb, drawRelicDrop, ESSENCE_SIZE_TIERS } from './game/renderer/DropRenderer';
import { renderProjectiles } from './game/renderer/ProjectileRenderer';
import { drawTelegraphs } from './game/renderer/TelegraphRenderer';
import { drawWorldPoints } from './game/renderer/WorldRenderer';
import { chapterPalette } from './game/renderer/Palette';
import { AFFIXES } from '../data/affixes';
import { LANDMARKS, SHRINES, RELICS, WORLD_EVENTS } from '../data/world';
import { CHAPTERS } from './game/Constants';
import type { Enemy, MutableGameState, Projectile } from './game/types';
import type { EnemyDef } from './game/types';
import type { WorldPoint } from './game/logic/WorldLogic';

export const GALLERY_CELL = 160;
export const GALLERY_COLS = 8;
const LABEL_H = 18;
const BORDER = '#202020';
const BG = '#0b0d14';

export interface GalleryCell { label: string; draw: (ctx: CanvasRenderingContext2D) => void }

/** Minimal state stub: renderers only read a handful of fields. Centre of the cell is (0,0) via translate. */
const stubState = (over: Partial<MutableGameState> = {}): MutableGameState => ({
    player: { x: 0, y: -40, vx: 0, vy: 0, size: 14, color: '#fff' } as any,
    enemies: [], projectiles: [], particles: [], drops: [],
    camera: { x: -GALLERY_CELL / 2, y: -GALLERY_CELL / 2 }, mouse: { x: 0, y: 0 },
    frame: 0, worldSize: 4000, seenEnemyIds: [], maxWaveReached: 1,
    ...over,
} as MutableGameState);

const fakeEnemy = (def: EnemyDef, extra: Partial<Enemy> = {}): Enemy => ({
    x: 0, y: 0, vx: 0, vy: 0, size: def.size, color: def.color,
    hp: def.baseHp, maxHp: def.baseHp, def, speed: def.baseSpeed,
    state: { timer: 0, phase: 1, custom: {} }, projectileImmunity: 0,
    ...extra,
} as Enemy);

/** Scale a drawing so `natural` px fits inside the cell (with padding); never upscale past ×2. */
// (5B) `lastFit` records the scale of the cell being drawn so the extractor knows sprite px per world px.
export let lastFit = 1;
const fit = (ctx: CanvasRenderingContext2D, natural: number, pad = 24) => {
    const s = Math.min(2, (GALLERY_CELL - pad) / Math.max(1, natural));
    lastFit = s;
    ctx.scale(s, s);
};

const PROJECTILE_TYPES: NonNullable<Projectile['visualType']>[] = [
    'DEFAULT', 'FIRE_BLAST', 'ARCANE_MISSILE', 'PULSAR', 'SINGULARITY', 'STARDUST_TRAIL', 'VOID_RIFT', 'SOLAR_FLARE',
    'BOSS_SINGULARITY', 'HOMING_MISSILE', 'FIREFLY', 'EXPLOSION_AREA', 'TOXIC_CLOUD', 'RAILGUN_BEAM', 'VOID_MINE', 'VOID_TRAIL',
    'VOID_NOVA', 'VOID_NOVA_AFTERMATH', 'LUX_BLADE', 'PLASMA_WHIP', 'PLASMA_WHIP_HIT', 'DEATH_RAY', 'SOLAR_BARRIER', 'CRIMSON_COMET',
];
const PROJECTILE_COLOR: Partial<Record<string, string>> = {
    DEFAULT: '#f8fafc', FIRE_BLAST: '#f97316', ARCANE_MISSILE: '#a78bfa', PULSAR: '#38bdf8', SINGULARITY: '#7c3aed',
    STARDUST_TRAIL: '#fde68a', VOID_RIFT: '#6d28d9', SOLAR_FLARE: '#fbbf24', BOSS_SINGULARITY: '#1e1b4b', HOMING_MISSILE: '#f43f5e',
    FIREFLY: '#bef264', EXPLOSION_AREA: '#fb923c', TOXIC_CLOUD: '#84cc16', RAILGUN_BEAM: '#e0f2fe', VOID_MINE: '#581c87', VOID_TRAIL: '#4c1d95',
    VOID_NOVA: '#8b5cf6', VOID_NOVA_AFTERMATH: '#5b21b6', LUX_BLADE: '#fef3c7', PLASMA_WHIP: '#22d3ee', PLASMA_WHIP_HIT: '#67e8f9',
    DEATH_RAY: '#dc2626', SOLAR_BARRIER: '#f59e0b', CRIMSON_COMET: '#b91c1c',
};

const fakeProjectile = (vt: NonNullable<Projectile['visualType']>): Projectile => {
    const beam = vt === 'RAILGUN_BEAM' || vt === 'DEATH_RAY' || vt === 'PLASMA_WHIP';
    const big = vt === 'TOXIC_CLOUD' || vt === 'VOID_NOVA' || vt === 'VOID_NOVA_AFTERMATH' || vt === 'EXPLOSION_AREA' || vt === 'SOLAR_BARRIER' || vt === 'BOSS_SINGULARITY' || vt === 'VOID_TRAIL';
    return {
        x: beam ? -50 : 0, y: 0, vx: beam ? 1 : 0.7, vy: beam ? 0 : -0.7,
        size: beam ? 8 : big ? 50 : 8, color: PROJECTILE_COLOR[vt] ?? '#fff',
        damage: 1, isEnemy: vt === 'DEATH_RAY' || vt === 'CRIMSON_COMET' || vt === 'BOSS_SINGULARITY' || vt === 'VOID_MINE' || vt === 'VOID_TRAIL',
        life: 60, visualType: vt, isStatic: big,
        customData: { angle: 0, currentLength: 100, spawnFrame: -30, targetX: 50, targetY: 0, warmup: 0 },
    } as Projectile;
};

export const buildGalleryCells = (): GalleryCell[] => {
    const cells: GalleryCell[] = [];

    // A. enemies (idle pose, frame 0) — enemies.ts order
    for (const def of ENEMIES) cells.push({
        label: def.id,
        draw: ctx => { fit(ctx, def.size * 2.6); drawEnemy(ctx, fakeEnemy(def), 0); },
    });
    // B. boss minions
    for (const key of Object.keys(BOSS_MINIONS)) {
        const def = BOSS_MINIONS[key];
        cells.push({ label: def.id, draw: ctx => { fit(ctx, def.size * 2.6); drawEnemy(ctx, fakeEnemy(def), 0); } });
    }
    // C. bosses × 3 phases
    for (const def of BOSSES) for (let phase = 1; phase <= 3; phase++) cells.push({
        label: `${def.id} P${phase}`,
        draw: ctx => { fit(ctx, def.size * 2.4); drawEnemy(ctx, fakeEnemy(def, { isBoss: true, state: { timer: 0, phase, custom: {} } }), 0); },
    });
    // D. player maturity stages + burst ring
    for (let s = 1; s <= PLAYER_STAGES; s++) cells.push({
        label: `spark stage ${s}`,
        draw: ctx => { fit(ctx, 14 * 2.3 * 2.8 * 1.4); drawSparkBody(ctx, 14, s, CHAPTERS[s - 1].color, 0, 1, 1); ctx.globalCompositeOperation = 'source-over'; },
    });
    cells.push({ label: 'burst ring 50%', draw: ctx => { drawBurstRing(ctx, 40, 0.5, 0, false); } });
    cells.push({ label: 'burst ring ready', draw: ctx => { drawBurstRing(ctx, 40, 1, 0, true); } });
    // E. projectiles
    for (const vt of PROJECTILE_TYPES) cells.push({
        label: vt.toLowerCase(),
        draw: ctx => {
            const st = stubState({ projectiles: [fakeProjectile(vt)] });
            fit(ctx, 130);
            renderProjectiles(ctx, st);
        },
    });
    // F. drops
    cells.push({ label: 'essence small', draw: ctx => { fit(ctx, 24); drawEssenceOrb(ctx, 0, 0, ESSENCE_SIZE_TIERS[0] - 1, 0); } });
    cells.push({ label: 'essence medium', draw: ctx => { fit(ctx, 32); drawEssenceOrb(ctx, 0, 0, ESSENCE_SIZE_TIERS[1] - 1, 0); } });
    cells.push({ label: 'essence large', draw: ctx => { fit(ctx, 40); drawEssenceOrb(ctx, 0, 0, ESSENCE_SIZE_TIERS[1] + 50, 0); } });
    cells.push({ label: 'relic drop', draw: ctx => { fit(ctx, 40); drawRelicDrop(ctx, 0, 0, 0); } });
    // G. world points — landmarks, shrines, relic alcoves, placed events (data/world.ts order)
    const worldCell = (kind: WorldPoint['kind'], id: string) => cells.push({
        label: `${kind} ${id}`,
        draw: ctx => {
            const pt: WorldPoint = { kind, id, x: 0, y: 0, seed: 0.37, discovered: true, phase: 0 } as WorldPoint;
            const st = stubState({ world: { points: [pt], fog: new Uint8Array(0), fogVersion: 0, relics: [], landmarksSeen: [] } as any, player: { x: 2000, y: 2000 } as any });
            st.camera = { x: -GALLERY_CELL / 2, y: -GALLERY_CELL / 2 };
            fit(ctx, kind === 'landmark' ? 150 : 110);
            drawWorldPoints(ctx, st, GALLERY_CELL, GALLERY_CELL);
        },
    });
    for (const l of LANDMARKS) worldCell('landmark', l.id);
    for (const s of SHRINES) worldCell('shrine', s.id);
    for (const r of RELICS) worldCell('relic', r.id);
    for (const e of WORLD_EVENTS) worldCell('event', e.id);
    // H. telegraph shapes
    const tele = (label: string, kind: 'circle' | 'ring' | 'cone' | 'line', params: any) => cells.push({
        label,
        draw: ctx => {
            const st = stubState({ telegraphs: [{ kind, x: kind === 'line' ? -50 : 0, y: 0, params: { color: '#ef4444', ...params }, timer: 30, maxTimer: 60, active: true }], telegraphFlashes: [] });
            fit(ctx, 130);
            drawTelegraphs(ctx, st);
        },
    });
    tele('telegraph circle', 'circle', { radius: 55 });
    tele('telegraph ring', 'ring', { radius: 60, innerRadius: 38 });
    tele('telegraph ring gap', 'ring', { radius: 60, innerRadius: 38, gapAngle: -Math.PI / 2, gapWidth: 0.9 });
    tele('telegraph cone', 'cone', { radius: 62, angle: -Math.PI / 2, fov: Math.PI / 3 });
    tele('telegraph line', 'line', { length: 100, width: 22, angle: 0 });
    // I. affix rings on a SIMPLE enemy (data/affixes.ts order) + double affix
    const base = ENEMIES[0];
    for (const a of AFFIXES) cells.push({
        label: `affix ${a.id.toLowerCase()}`,
        draw: ctx => { fit(ctx, base.size * 3.2); drawEnemy(ctx, fakeEnemy(base, { affixes: [a.id], shieldHits: 3 }), 0); },
    });
    cells.push({ label: 'affix double', draw: ctx => { fit(ctx, base.size * 3.2); drawEnemy(ctx, fakeEnemy(base, { affixes: [AFFIXES[0].id, AFFIXES[1].id] }), 0); } });
    // J. chapter palettes (swatches: base / glow / outline / accent)
    CHAPTERS.forEach((ch, i) => cells.push({
        label: `palette ch${ch.id}`,
        draw: ctx => {
            const p = chapterPalette(i + 1);
            const sw = [p.base, p.glow, p.outline, p.accent];
            sw.forEach((c, k) => { ctx.fillStyle = c; ctx.fillRect(-56 + k * 28, -24, 26, 48); });
        },
    }));
    return cells;
};

// (5B) `sheet` = transparent background, no borders / labels — what tools/extract-art.mjs screenshots.
export const drawGallery = (canvas: HTMLCanvasElement, cells: GalleryCell[], scale: number, sheet = false) => {
    const rows = Math.ceil(cells.length / GALLERY_COLS);
    const units: number[] = [];
    const cw = GALLERY_CELL, chh = GALLERY_CELL + LABEL_H;
    canvas.width = GALLERY_COLS * cw * scale;
    canvas.height = rows * chh * scale;
    canvas.style.width = `${GALLERY_COLS * cw}px`;
    canvas.style.height = `${rows * chh}px`;
    const ctx = canvas.getContext('2d')!;
    ctx.setTransform(scale, 0, 0, scale, 0, 0);
    if (!sheet) { ctx.fillStyle = BG; ctx.fillRect(0, 0, GALLERY_COLS * cw, rows * chh); }
    cells.forEach((cell, i) => {
        lastFit = 1;
        const cx = (i % GALLERY_COLS) * cw, cy = Math.floor(i / GALLERY_COLS) * chh;
        ctx.save();
        ctx.beginPath(); ctx.rect(cx, cy, cw, cw); ctx.clip();
        ctx.translate(cx + cw / 2, cy + cw / 2);
        try { cell.draw(ctx); } catch (e) { console.error('gallery cell failed', cell.label, e); }
        ctx.restore();
        units.push(lastFit);
        if (sheet) return;
        ctx.strokeStyle = BORDER; ctx.lineWidth = 1; ctx.strokeRect(cx + 0.5, cy + 0.5, cw - 1, cw - 1);
        ctx.fillStyle = '#9ca3af'; ctx.font = '10px monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(`${i} ${cell.label}`, cx + cw / 2, cy + cw + LABEL_H / 2, cw - 6);
    });
    return { rows, count: cells.length, units, cell: GALLERY_CELL, labelH: LABEL_H, cols: GALLERY_COLS };
};

const Gallery: React.FC = () => {
    const ref = useRef<HTMLCanvasElement>(null);
    useEffect(() => {
        if (!ref.current) return;
        const scale = Math.max(1, Math.min(4, parseFloat(new URLSearchParams(location.search).get('scale') || '1') || 1));
        const cells = buildGalleryCells();
        const sheet = new URLSearchParams(location.search).get('sheet') === '1';
        const info = drawGallery(ref.current, cells, scale, sheet);
        (window as any).__GALLERY = { cells: cells.map(c => c.label), ...info, scale };
        document.title = `LIGHT gallery — ${info.count} cells`;
    }, []);
    return (
        <main id="gallery" className="min-h-screen overflow-auto p-4" style={{ background: BG }}>
            <canvas ref={ref} id="gallery-canvas" style={{ imageRendering: 'auto', display: 'block' }} />
        </main>
    );
};

export default Gallery;
