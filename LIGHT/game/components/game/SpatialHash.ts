// (4B) Uniform-grid spatial hash for enemies — rule 9: no caps, so broad-phase must be O(n).
// Rebuilt once per frame in Logic.ts (`rebuildEnemyGrid`) after enemies moved, before projectiles.
// Query with `forEachEnemyNear(x, y, r, fn)`; `fn` returning true stops the query early.
// Cells are keyed by integer (cx, cy) packed into one int; buckets are reused arrays (no per-frame allocation
// after warm-up). Enemies larger than a cell are still found because we insert by centre and query with
// radius + ENEMY_GRID_PAD.
import { Enemy, MutableGameState } from './types';

export const ENEMY_GRID_CELL = 96;      // px; ~2× a typical enemy diameter
const ENEMY_GRID_PAD = 48;              // largest common enemy radius (bosses handled by their own radius checks)
const OFFSET = 1 << 15;                 // world coords / cell → shift to positive ints

const cells = new Map<number, Enemy[]>();
const used: Enemy[][] = [];             // buckets touched this frame (cleared next rebuild)
let gridEnemies: Enemy[] = [];

const key = (cx: number, cy: number) => ((cx + OFFSET) << 16) | ((cy + OFFSET) & 0xffff);

export const rebuildEnemyGrid = (state: MutableGameState) => {
    for (let i = 0; i < used.length; i++) used[i].length = 0;
    used.length = 0;
    gridEnemies = state.enemies;
    const inv = 1 / ENEMY_GRID_CELL;
    for (let i = 0; i < gridEnemies.length; i++) {
        const e = gridEnemies[i];
        const k = key(Math.floor(e.x * inv), Math.floor(e.y * inv));
        let b = cells.get(k);
        if (!b) { b = []; cells.set(k, b); }
        if (b.length === 0) used.push(b);
        b.push(e);
    }
};

/** Visit enemies whose centre is within (r + pad) box of (x, y). Caller does the exact circle test. */
export const forEachEnemyNear = (x: number, y: number, r: number, fn: (e: Enemy) => boolean | void): void => {
    const inv = 1 / ENEMY_GRID_CELL;
    const rr = r + ENEMY_GRID_PAD;
    const x0 = Math.floor((x - rr) * inv), x1 = Math.floor((x + rr) * inv);
    const y0 = Math.floor((y - rr) * inv), y1 = Math.floor((y + rr) * inv);
    for (let cx = x0; cx <= x1; cx++) {
        for (let cy = y0; cy <= y1; cy++) {
            const b = cells.get(key(cx, cy));
            if (!b) continue;
            for (let i = 0; i < b.length; i++) if (fn(b[i])) return;
        }
    }
};

/** Nearest enemy within maxDist (for homing / targeting) using the grid; falls back to null. */
export const nearestEnemy = (x: number, y: number, maxDist: number): Enemy | null => {
    let best: Enemy | null = null, bestD2 = maxDist * maxDist;
    forEachEnemyNear(x, y, maxDist, (e) => {
        const dx = e.x - x, dy = e.y - y, d2 = dx * dx + dy * dy;
        if (d2 < bestD2) { bestD2 = d2; best = e; }
    });
    return best;
};
