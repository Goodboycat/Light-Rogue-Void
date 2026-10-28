// (4B) Spawn director — composes PACKS instead of one-at-a-time random spawns.
// A pack = 3–8 enemies of 1–2 types from the wave's table, landing together at one
// off-screen point after a 0.6 s circle telegraph (the same "promise" shape bosses use).
// The 2A trickle in Logic.ts keeps running between packs; the director alternates
// pack / trickle by halving the trickle rate while a pack is pending or just landed.
// (4B) No alive cap (rule 9) — pacing by interval only; never runs during a boss (BossKit.updateBossAdds owns that).
import { MutableGameState, Enemy, ParticleType } from '../types';
import { refDensity, PACK_MIN, PACK_MAX, PACK_WARN_FRAMES, PACK_INTERVAL_SEC, PACK_SPAWN_DIST, WORLD_SIZE } from '../Constants';
import { getSpawnableEnemy } from '../../../enemies';
import { spawnEnemy, SpawnOpts } from './enemies/SpawnLogic';
import { telegraph } from './enemies/BossKit';
import { spawnExplosion } from '../Particles';

export interface PackPlan {
    x: number; y: number;
    defs: ReturnType<typeof getSpawnableEnemy>[];   // one entry per enemy (1–2 distinct types)
    opts?: SpawnOpts;
}

/** Seconds between packs for a wave: 7 s early, floor 3.5 s by wave ~35. */
export const packIntervalFrames = (wave: number) =>
    Math.round(Math.max(3.5, PACK_INTERVAL_SEC - wave * 0.1) * 60);

/** Pick a landing point just off screen, clamped into the world. */
export const packLandingPoint = (state: MutableGameState) => {
    const a = Math.random() * Math.PI * 2;
    const x = Math.max(-WORLD_SIZE / 2 + 80, Math.min(WORLD_SIZE / 2 - 80, state.player.x + Math.cos(a) * PACK_SPAWN_DIST));
    const y = Math.max(-WORLD_SIZE / 2 + 80, Math.min(WORLD_SIZE / 2 - 80, state.player.y + Math.sin(a) * PACK_SPAWN_DIST));
    return { x, y };
};

/** Compose a pack: size 3–8 (capped by room), 1–2 types from the wave table (weighted). */
export const composePack = (state: MutableGameState, wave: number, room: number, opts?: SpawnOpts): PackPlan | null => {
    const size = Math.min(room, PACK_MIN + Math.floor(Math.random() * (PACK_MAX - PACK_MIN + 1)));
    if (size < PACK_MIN) return null;
    const a = getSpawnableEnemy(wave);
    let b = Math.random() < 0.5 ? getSpawnableEnemy(wave) : a;
    if (b.baseSpeed === 0 && a.baseSpeed === 0) b = a; // never a pack of two turret types
    const defs = [];
    for (let i = 0; i < size; i++) defs.push(i % 3 === 2 ? b : a); // ~2/3 lead type, 1/3 support
    return { ...packLandingPoint(state), defs, opts };
};

/** Telegraph a pack and land it after PACK_WARN_FRAMES. Returns the spawned enemies via `onLand`. */
export const launchPack = (
    state: MutableGameState, wave: number, plan: PackPlan,
    onEnemySeen: (id: string) => void, onLand?: (enemies: Enemy[]) => void,
) => {
    state.packPending = (state.packPending ?? 0) + 1;
    const color = plan.opts?.elite ? '#fbbf24' : (plan.defs[0]?.glowColor ?? '#94a3b8');
    telegraph(state, 'circle', plan.x, plan.y, { radius: 50 + plan.defs.length * 6, color }, PACK_WARN_FRAMES, (st) => {
        st.packPending = Math.max(0, (st.packPending ?? 1) - 1);
        spawnExplosion(st, plan.x, plan.y, color, ParticleType.SMOKE);
        const spawned: Enemy[] = [];
        for (let i = 0; i < plan.defs.length; i++) {
            const ang = (i / plan.defs.length) * Math.PI * 2;
            const r = 20 + Math.random() * 50;
            spawned.push(spawnEnemy(st, wave, onEnemySeen, plan.x + Math.cos(ang) * r, plan.y + Math.sin(ang) * r, plan.defs[i], plan.opts));
        }
        onLand?.(spawned);
    });
};

/**
 * Per frame (non-boss waves only). Returns the trickle multiplier Logic.ts should apply
 * to its 2A spawn rate: 1 = normal, 2 = half speed (a pack is pending / just landed).
 */
export const updateDirector = (
    state: MutableGameState, wave: number, sinceWaveSec: number,
    onEnemySeen: (id: string) => void, packOpts?: SpawnOpts,
    onLand?: (enemies: Enemy[]) => void,
): number => {
    if (state.packTimer === undefined) state.packTimer = Math.round(2.5 * 60); // first pack ~2.5 s into a run
    if (sinceWaveSec < 1.5) return 1; // let the wave banner breathe
    if (state.packTimer > 0) { state.packTimer--; return state.packTimer > packIntervalFrames(wave) - 90 ? 2 : 1; }
    // (4B) rule 9: no room check — a pack always lands. `room` is just an upper size hint for composePack.
    const room = Math.max(PACK_MAX, refDensity(wave));
    const plan = composePack(state, wave, room, packOpts);
    state.packTimer = packIntervalFrames(wave);
    if (!plan) return 1;
    launchPack(state, wave, plan, onEnemySeen, onLand);
    return 2;
};

/** Wave start / run start: reset pack timing so a pack lands early in every wave. */
export const resetDirector = (state: MutableGameState) => {
    state.packTimer = Math.round(2.5 * 60);
    state.packPending = 0;
};
