// (3A) Discovery — placement of landmarks / shrines / relic alcoves / events on the 3500² map.
// Roguelite rule: nothing here is a menu. You find it by walking, or you don't.
// Definitions: data/world.ts. Drawing: renderer/WorldRenderer.ts. Docs: docs/WORLD.md.
import { MutableGameState } from '../types';
import {
    WORLD_SIZE, WORLD_POINT_MARGIN, WORLD_MIN_SPAWN_DIST, WORLD_MIN_POINT_DIST, WORLD_FOG_GRID,
    chapterIndexOf,
} from '../Constants';
import { mulberry32, Rng, pick } from '../../../utils/rng';
import { getSeedOverride } from '../../../save/daily';
import {
    LANDMARKS, SHRINES, RELICS, WORLD_EVENTS, WorldPointKind, emptyRunModifiers,
} from '../../../data/world';

export interface WorldPoint {
    kind: WorldPointKind;
    /** def id in data/world.ts (landmark id / ShrineId / RelicId / WorldEventId) */
    id: string;
    x: number; y: number;
    /** rotation / silhouette variation seed, 0..1 */
    seed: number;
    discovered: boolean;
    /** relic alcove: guards landed; event: running */
    active?: boolean;
    /** relic alcove: guards still alive (relic drops at 0); event: frames left */
    counter?: number;
    /** relic: picked up; shrine: used; event: resolved */
    consumed?: boolean;
    /** ambient pulse phase so points don't all throb in sync */
    phase: number;
    /** Lost Spark: frames spent inside the radius */
    sparkProgress?: number;
    coreDropped?: boolean;
}

export interface WorldState {
    points: WorldPoint[];
    /** fog of discovery: WORLD_FOG_GRID² cells, 1 = visited */
    fog: Uint8Array;
    fogVersion: number;         // bumped when fog changes (minimap redraws lazily)
    /** relic ids held this run, HUD order */
    relics: string[];
    /** landmark ids whose lore card was shown this run */
    landmarksSeen: string[];
    shrinesUsed: string[];
    /** frames until the next found event may trigger (step 7) */
    foundEventCooldown: number;
    /** currently running found event (step 7, logic/FoundEvents.ts) */
    foundEvent?: any;
}

/** Read `?seed=` once; otherwise Date.now(). Exposed for the debug HUD / sim. */
export const resolveRunSeed = (): number => {
    const daily = getSeedOverride(); if (daily !== null) return daily; // (9A) Daily Void
    try {
        if (typeof window !== 'undefined') {
            const s = new URLSearchParams(window.location.search).get('seed');
            if (s) { const n = Number(s); if (Number.isFinite(n)) return n >>> 0; }
        }
    } catch { /* non-browser */ }
    return Date.now() >>> 0;
};

const half = WORLD_SIZE / 2 - WORLD_POINT_MARGIN;

const farEnough = (x: number, y: number, pts: WorldPoint[]): boolean => {
    if (Math.hypot(x, y) < WORLD_MIN_SPAWN_DIST) return false;
    for (const p of pts) if (Math.hypot(p.x - x, p.y - y) < WORLD_MIN_POINT_DIST) return false;
    return true;
};

/** Rejection-sample a position; falls back to the best of 60 tries (never fails to place). */
const placeOne = (rng: Rng, pts: WorldPoint[]): { x: number; y: number } => {
    let best = { x: 0, y: 0 }, bestScore = -1;
    for (let i = 0; i < 60; i++) {
        const x = (rng() * 2 - 1) * half, y = (rng() * 2 - 1) * half;
        if (farEnough(x, y, pts)) return { x, y };
        let score = Math.min(Math.hypot(x, y), ...pts.map(p => Math.hypot(p.x - x, p.y - y)));
        if (score > bestScore) { bestScore = score; best = { x, y }; }
    }
    return best;
};

const pickLandmarks = (rng: Rng, startWave: number): string[] => {
    // the chapter you start in + its neighbours, so a chapter-1 run sees Beacon / Stones / Spire
    const ch = chapterIndexOf(startWave);
    const pool = LANDMARKS.filter(l => Math.abs(l.chapter - ch) <= 1).map(l => l.id);
    while (pool.length < 3) { const extra = pick(rng, LANDMARKS).id; if (!pool.includes(extra)) pool.push(extra); }
    // shuffle (Fisher–Yates with the run rng) then take 3
    for (let i = pool.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [pool[i], pool[j]] = [pool[j], pool[i]]; }
    return pool.slice(0, 3);
};

/**
 * Called once at run start (SurvivalGame init / first updateGame frame).
 * 3 landmarks, 2 shrines, 1 relic alcove, 1–2 events → 7–8 points, ≥600 px from spawn, ≥500 px apart.
 */
export const initWorld = (state: MutableGameState, startWave: number, seed?: number): WorldState => {
    const runSeed = seed ?? state.runSeed ?? resolveRunSeed();
    state.runSeed = runSeed;
    const rng = mulberry32(runSeed ^ 0x33a0);
    const pts: WorldPoint[] = [];
    const add = (kind: WorldPointKind, id: string) => {
        const { x, y } = placeOne(rng, pts);
        pts.push({ kind, id, x, y, seed: rng(), discovered: false, phase: rng() * Math.PI * 2 });
    };

    for (const id of pickLandmarks(rng, startWave)) add('landmark', id);
    const shrineIds = SHRINES.map(s => s.id).slice();
    for (let i = 0; i < 2; i++) { const s = pick(rng, shrineIds); shrineIds.splice(shrineIds.indexOf(s), 1); add('shrine', s); }
    add('relic', pick(rng, RELICS).id);
    const eventIds = WORLD_EVENTS.map(e => e.id).slice();
    const eventCount = rng() < 0.5 ? 1 : 2;
    for (let i = 0; i < eventCount; i++) { const e = pick(rng, eventIds); eventIds.splice(eventIds.indexOf(e), 1); add('event', e); }

    const world: WorldState = {
        points: pts,
        fog: new Uint8Array(WORLD_FOG_GRID * WORLD_FOG_GRID),
        fogVersion: 0,
        relics: [],
        landmarksSeen: [],
        shrinesUsed: [],
        foundEventCooldown: 25 * 60,
    };
    state.world = world;
    state.runModifiers = emptyRunModifiers();
    state.dashChargesLeft = 0;
    markFog(state, 0, 0);
    return world;
};

/** Fog cell of a world position. */
export const fogCell = (x: number, y: number): number => {
    const g = WORLD_FOG_GRID;
    const cx = Math.max(0, Math.min(g - 1, Math.floor((x + WORLD_SIZE / 2) / WORLD_SIZE * g)));
    const cy = Math.max(0, Math.min(g - 1, Math.floor((y + WORLD_SIZE / 2) / WORLD_SIZE * g)));
    return cy * g + cx;
};

export const markFog = (state: MutableGameState, x: number, y: number) => {
    const w = state.world; if (!w) return;
    const c = fogCell(x, y);
    if (!w.fog[c]) { w.fog[c] = 1; w.fogVersion++; }
};

export const revealAllFog = (state: MutableGameState) => {
    const w = state.world; if (!w) return;
    w.fog.fill(1); w.fogVersion++;
    for (const p of w.points) p.discovered = true;
};

/** Nearest point that still has something to give (undiscovered or an unfinished relic/event). */
export const nearestOpenPoint = (state: MutableGameState): WorldPoint | undefined => {
    const w = state.world; if (!w) return undefined;
    let best: WorldPoint | undefined, bd = Infinity;
    for (const p of w.points) {
        if (p.consumed) continue;
        if (p.discovered && p.kind !== 'relic' && p.kind !== 'event') continue;
        const d = Math.hypot(p.x - state.player.x, p.y - state.player.y);
        if (d < bd) { bd = d; best = p; }
    }
    return best;
};

/** Points that must be reachable: all of them are inside the walkable square (no walls on this map). */
export const worldPointCount = (state: MutableGameState) => state.world?.points.length ?? 0;
