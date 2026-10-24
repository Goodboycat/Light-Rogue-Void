// (2B) Boss kit — telegraphs, boss projectiles, phases, enrage, arena.
// Ported from the fork's BossKit.ts (telegraph pool), stripped of audio/mercy/boons,
// then extended with arena + enrage + roaming adds. Usage: docs/BOSSES.md.
//
// Design rule: a telegraph is a PROMISE. Nothing deals damage during the warn;
// `onFire` runs exactly once when the warn ends and is the only place damage happens.

import { MutableGameState, Enemy, Projectile, ParticleType } from '../../types';
import { VFX } from '../../Emitters';
import { spawnExplosion } from '../../Particles';
import { acquireProjectile, swapRemoveProjectile } from '../../Pools';
import { hitStop, shake } from '../../Feel';
import {
    TELEGRAPH_POOL_SIZE, TELEGRAPH_FLASH_FRAMES,
    BOSS_PHASE_THRESHOLDS, BOSS_PHASE_SHIFT_FRAMES,
    BOSS_ENRAGE_SEC, BOSS_ENRAGE_DMG_MULT, BOSS_ENRAGE_WARN_MULT,
    BOSS_PROJ_CAP, BOSS_PROJ_LIFE, ARENA_RADIUS,
} from '../../Constants';

// ---------------------------------------------------------------- telegraphs
export type TelegraphKind = 'circle' | 'line' | 'cone' | 'ring';

export interface TelegraphParams {
    radius?: number;       // circle / ring (outer) / cone
    innerRadius?: number;  // ring
    width?: number;        // line thickness
    length?: number;       // line length (from x,y along angle)
    angle?: number;        // line / cone direction (rad)
    fov?: number;          // cone spread (rad, total)
    color?: string;        // boss glow colour; renderer adds the white edge
}

export interface Telegraph {
    kind: TelegraphKind;
    x: number; y: number;
    params: TelegraphParams;
    timer: number;         // frames left
    maxTimer: number;
    active: boolean;
    onFire?: (state: MutableGameState, t: Telegraph) => void;
}

/** Short white flash drawn where a telegraph just fired. */
export interface TelegraphFlash { kind: TelegraphKind; x: number; y: number; params: TelegraphParams; frames: number }

const makeTelegraph = (): Telegraph => ({ kind: 'circle', x: 0, y: 0, params: {}, timer: 0, maxTimer: 1, active: false });

const ensurePools = (state: MutableGameState) => {
    if (!state.telegraphs) state.telegraphs = Array.from({ length: TELEGRAPH_POOL_SIZE }, makeTelegraph);
    if (!state.telegraphFlashes) state.telegraphFlashes = [];
};

/**
 * Schedule a warn shape. `onFire` runs once after `warnFrames` (× BOSS_ENRAGE_WARN_MULT when enraged).
 * Pool of TELEGRAPH_POOL_SIZE; when full the one closest to firing is fired early and reused.
 */
export const telegraph = (
    state: MutableGameState,
    kind: TelegraphKind,
    x: number, y: number,
    params: TelegraphParams,
    warnFrames: number,
    onFire?: (state: MutableGameState, t: Telegraph) => void,
): Telegraph => {
    ensurePools(state);
    const pool = state.telegraphs!;
    let t = pool.find(e => !e.active);
    if (!t) {
        t = pool.reduce((a, b) => (b.timer < a.timer ? b : a), pool[0]);
        t.active = false;
        t.onFire?.(state, t); // keep the promise before reuse
    }
    const frames = Math.max(1, Math.round(state.bossEnraged ? warnFrames * BOSS_ENRAGE_WARN_MULT : warnFrames));
    t.kind = kind; t.x = x; t.y = y;
    t.params = { color: state.activeBoss?.def.glowColor ?? '#ef4444', ...params };
    t.timer = frames; t.maxTimer = frames; t.active = true; t.onFire = onFire;
    return t;
};

/** Per frame. Fires due telegraphs (one white flash each) and ages flashes. */
export const updateTelegraphs = (state: MutableGameState) => {
    const pool = state.telegraphs;
    if (!pool) return;
    for (let i = 0; i < pool.length; i++) {
        const t = pool[i];
        if (!t.active) continue;
        if (--t.timer <= 0) {
            t.active = false;
            state.telegraphFlashes!.push({ kind: t.kind, x: t.x, y: t.y, params: t.params, frames: TELEGRAPH_FLASH_FRAMES });
            const fn = t.onFire; t.onFire = undefined;
            fn?.(state, t);
        }
    }
    const fl = state.telegraphFlashes;
    if (fl) for (let i = fl.length - 1; i >= 0; i--) if (--fl[i].frames <= 0) { fl[i] = fl[fl.length - 1]; fl.pop(); }
};

/** Drop every pending telegraph without firing (boss death, phase shift). */
export const cancelTelegraphs = (state: MutableGameState) => {
    state.telegraphs?.forEach(t => { t.active = false; t.onFire = undefined; });
};

/** Point-in-shape test so `onFire` can decide if the player is inside. */
export const telegraphContains = (t: { kind: TelegraphKind; x: number; y: number; params: TelegraphParams }, px: number, py: number, pad = 0): boolean => {
    const dx = px - t.x, dy = py - t.y;
    const d = Math.hypot(dx, dy);
    const p = t.params;
    switch (t.kind) {
        case 'circle': return d <= (p.radius ?? 0) + pad;
        case 'ring': return d <= (p.radius ?? 0) + pad && d >= (p.innerRadius ?? 0) - pad;
        case 'cone': {
            if (d > (p.radius ?? 0) + pad) return false;
            const a = Math.atan2(dy, dx);
            let diff = Math.abs(a - (p.angle ?? 0));
            diff = Math.min(diff, Math.PI * 2 - diff);
            return diff <= (p.fov ?? Math.PI / 4) / 2;
        }
        case 'line': {
            const ang = p.angle ?? 0, len = p.length ?? 0, w = (p.width ?? 0) / 2 + pad;
            const along = dx * Math.cos(ang) + dy * Math.sin(ang);
            const across = Math.abs(-dx * Math.sin(ang) + dy * Math.cos(ang));
            return along >= -pad && along <= len + pad && across <= w;
        }
    }
};

/** Convenience: if the player is inside the fired shape, damage them. Returns true on hit. */
export const telegraphHitPlayer = (state: MutableGameState, t: Telegraph, damage: number, onDamage: (amt: number) => void): boolean => {
    if (!telegraphContains(t, state.player.x, state.player.y, state.player.size)) return false;
    onDamage(bossDamage(state, damage));
    if (state.activeBoss) state.lastBossHit = state.activeBoss.def.id;
    shake(state, 8, 6); hitStop(state, 3);
    return true;
};

// ---------------------------------------------------------------- projectiles
export const bossDamage = (state: MutableGameState, dmg: number): number =>
    state.bossEnraged ? Math.max(1, Math.round(dmg * BOSS_ENRAGE_DMG_MULT)) : dmg;

export const countBossProjectiles = (state: MutableGameState): number => {
    let n = 0;
    for (let i = 0; i < state.projectiles.length; i++) if (state.projectiles[i].customData?.isBossProj) n++;
    return n;
};

/** Pooled boss bullet. Skipped (returns false) when BOSS_PROJ_CAP live boss projectiles exist. Never queued. */
export const fireBossProjectile = (state: MutableGameState, init: Partial<Projectile> & { x: number; y: number; vx: number; vy: number }): boolean => {
    if (countBossProjectiles(state) >= BOSS_PROJ_CAP) return false;
    state.projectiles.push(acquireProjectile({
        size: 10, color: state.activeBoss?.def.glowColor ?? '#ef4444', life: BOSS_PROJ_LIFE, damage: 1, visualType: 'DEFAULT',
        ...init,
        damage: bossDamage(state, init.damage ?? 1),
        isEnemy: true,
        customData: { isBossProj: true, bossId: state.activeBoss?.def.id, ...(init.customData ?? {}) },
    } as Projectile));
    return true;
};

export const clearBossProjectiles = (state: MutableGameState) => {
    for (let i = state.projectiles.length - 1; i >= 0; i--) {
        if (state.projectiles[i].customData?.isBossProj) swapRemoveProjectile(state.projectiles, i);
    }
};

// ---------------------------------------------------------------- phases
/** 1 / 2 / 3 by HP: 100→66 → 1, 66→33 → 2, below → 3. */
export const phaseOf = (boss: Enemy): number => {
    const pct = boss.hp / boss.maxHp;
    let phase = 1;
    for (const th of BOSS_PHASE_THRESHOLDS) if (pct <= th) phase++;
    return phase;
};

export const isPhaseShifting = (boss: Enemy): boolean => (boss.state.custom?.phaseShiftTimer ?? 0) > 0;

/** 72 f invulnerable, clears boss bullets + telegraphs, arena pulse. Call when `phaseOf` passes `boss.state.phase`. */
export const startPhaseShift = (state: MutableGameState, boss: Enemy) => {
    boss.state.custom = boss.state.custom ?? {};
    boss.state.custom.phaseShiftTimer = BOSS_PHASE_SHIFT_FRAMES;
    boss.projectileImmunity = BOSS_PHASE_SHIFT_FRAMES;
    boss.vx = 0; boss.vy = 0;
    clearBossProjectiles(state);
    cancelTelegraphs(state);
    if (state.arena) state.arena.pulse = 1;
    hitStop(state, 4); shake(state, 10, 8);
    VFX.castShockwave(state, boss.x, boss.y, boss.def.glowColor);
    spawnExplosion(state, boss.x, boss.y, '#ffffff', ParticleType.RING);
};

/**
 * Housekeeping every boss file should call first. Returns true while the boss is phase-shifting
 * (caller should stand still and skip attacks). Handles phase detection + enrage.
 */
export const updateBossKit = (state: MutableGameState, boss: Enemy): boolean => {
    boss.state.custom = boss.state.custom ?? {};
    const c = boss.state.custom;
    if (boss.state.phase === undefined) boss.state.phase = 1;

    const wanted = phaseOf(boss);
    if (wanted > boss.state.phase && !c.phaseShiftTimer) {
        boss.state.phase = wanted;
        startPhaseShift(state, boss);
    }

    if (state.bossStartFrame !== undefined && !state.bossEnraged
        && (state.frame - state.bossStartFrame) / 60 >= BOSS_ENRAGE_SEC) enrage(state, boss);

    if (c.phaseShiftTimer > 0) {
        c.phaseShiftTimer--;
        if (state.frame % 4 === 0) VFX.spark(state, boss.x + (Math.random() - 0.5) * boss.size, boss.y + (Math.random() - 0.5) * boss.size, '#ffffff', 4);
        return true;
    }
    return false;
};

export const enrage = (state: MutableGameState, boss: Enemy) => {
    state.bossEnraged = true;
    boss.state.custom = boss.state.custom ?? {};
    boss.state.custom.enraged = true;
    shake(state, 12, 10);
    VFX.castShockwave(state, boss.x, boss.y, '#ef4444');
    spawnExplosion(state, boss.x, boss.y, '#ef4444', ParticleType.BOSS_AURA);
    if (state.arena) { state.arena.pulse = 1; state.arena.color = '#ef4444'; }
};

/** Seconds until enrage (0 when enraged). For the HUD. */
export const enrageCountdown = (state: MutableGameState): number => {
    if (state.bossEnraged || state.bossStartFrame === undefined) return 0;
    return Math.max(0, BOSS_ENRAGE_SEC - (state.frame - state.bossStartFrame) / 60);
};

// ---------------------------------------------------------------- arena
export const openArena = (state: MutableGameState, boss: Enemy) => {
    state.arena = { x: state.player.x, y: state.player.y, r: ARENA_RADIUS, pulse: 1, color: boss.def.glowColor };
    state.bossStartFrame = state.frame;
    state.bossEnraged = false;
    state.bossAddTimer = 0;
};

export const closeArena = (state: MutableGameState) => {
    state.arena = undefined;
    state.bossStartFrame = undefined;
    state.bossEnraged = false;
    state.bossAddTimer = undefined;
    cancelTelegraphs(state);
    clearBossProjectiles(state);
};

/** 0 inside, 1 well outside (used by the renderer vignette). */
export const arenaOutsideFactor = (state: MutableGameState): number => {
    const a = state.arena; if (!a) return 0;
    const d = Math.hypot(state.player.x - a.x, state.player.y - a.y);
    return Math.max(0, Math.min(1, (d - a.r) / 200));
};

/** Random point on the arena edge (or around the player when there is no arena). */
export const arenaEdgePoint = (state: MutableGameState, radiusScale = 0.95): { x: number; y: number } => {
    const a = state.arena;
    const cx = a?.x ?? state.player.x, cy = a?.y ?? state.player.y, r = (a?.r ?? ARENA_RADIUS) * radiusScale;
    const ang = Math.random() * Math.PI * 2;
    return { x: cx + Math.cos(ang) * r, y: cy + Math.sin(ang) * r };
};
