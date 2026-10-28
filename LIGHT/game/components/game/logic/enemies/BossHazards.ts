// (2C) Persistent terrain hazards — the "the longer I wait, the worse it gets" pressure.
//
// Every boss owns ONE hazard kind (bosses.ts `hazard`). While the boss is alive, a new hazard
// lands at a random spot in the arena every `everySec` seconds (telegraphed first, like everything
// else in the kit) and then STAYS for the whole fight. They accumulate until `max`, so the arena
// slowly fills and the player is pushed to end the fight. Enrage doubles the spawn rate.
// All hazards die with the boss (closeArena → clearHazards).
//
// Kinds (all static, all drawn by renderer/HazardRenderer.ts):
//   acid     — pool: damage ticks while standing in it                     (Hive Mind)
//   nebula   — toxic cloud: damage ticks + slow; drifts slowly in P3       (Void Warden)
//   flare    — solar flare: surges then burns; big damage ticks            (Crimson Eclipse)
//   beam     — static laser line across the arena (horizontal/vertical)   (Collapsing Neutron)
//   rubble   — mud: 90 % slow (dash ignores it), no damage                 (Entropy Titan)
//   void     — black mine field: slow pull + damage ticks                  (Darkness)
//
// Damage goes through state.damagePlayer (tagged for the death hint, respects i-frames via onPlayerHurt).

import { MutableGameState, Enemy, ParticleType } from '../../types';
import { createParticle, spawnExplosion } from '../../Particles';
import { telegraph, bossDamage } from './BossKit';
import { HAZARD_WARN_FRAMES, HAZARD_TICK_FRAMES, HAZARD_CAP } from '../../Constants';

export type HazardKind = 'acid' | 'nebula' | 'flare' | 'beam' | 'rubble' | 'void' | 'rock';
// (2D) rock — SOLID obstacle left by Entropy Titan slams: blocks movement (pushes the player out), expires after `ttl`
//            frames, shatters when the Titan's shockwave rings cross it. No damage. Dash does NOT pass through.

export interface HazardDef {
    kind: HazardKind;
    everySec: number;   // seconds between new hazards
    max: number;        // alive cap for this boss (≤ HAZARD_CAP)
    radius: number;     // circle radius / beam half-width
    damage: number;     // per tick (HAZARD_TICK_FRAMES)
    color: string;
}

export interface Hazard {
    kind: HazardKind;
    x: number; y: number;
    radius: number;
    damage: number;
    color: string;
    born: number;        // state.frame when it became active
    angle?: number;      // beam: 0 horizontal, PI/2 vertical
    vx?: number; vy?: number; // nebula drift
    pulse: number;       // 0..1 flash when it lands
    ttl?: number;        // (2D) frames left (rock); undefined = permanent
}

const TICK_COLORS: Record<HazardKind, string> = {
    acid: '#a3e635', nebula: '#10b981', flare: '#fbbf24', beam: '#f472b6', rubble: '#1e1b4b', void: '#000000', rock: '#a3a3a3',
};

export const hazardContains = (h: Hazard, px: number, py: number, pad: number): boolean => {
    if (h.kind === 'beam') {
        const horizontal = (h.angle ?? 0) === 0;
        return horizontal ? Math.abs(py - h.y) < h.radius + pad : Math.abs(px - h.x) < h.radius + pad;
    }
    return Math.hypot(px - h.x, py - h.y) < h.radius + pad;
};

/** Random point inside the arena (not on top of the player: min 220 px away). */
const randomArenaPoint = (state: MutableGameState, boss: Enemy): { x: number; y: number } => {
    const a = state.arena;
    const cx = a?.x ?? boss.x, cy = a?.y ?? boss.y, r = (a?.r ?? 900) * 0.85;
    for (let tries = 0; tries < 8; tries++) {
        const ang = Math.random() * Math.PI * 2, d = Math.sqrt(Math.random()) * r;
        const x = cx + Math.cos(ang) * d, y = cy + Math.sin(ang) * d;
        if (Math.hypot(x - state.player.x, y - state.player.y) > 220) return { x, y };
    }
    return { x: cx, y: cy };
};

/** Spawn one hazard now (telegraphed). Boss scripts may call this directly for scripted placement. */
export const placeHazard = (state: MutableGameState, boss: Enemy, def: HazardDef, x: number, y: number, extra?: Partial<Hazard>) => {
    if (!state.hazards) state.hazards = [];
    if (state.hazards.length >= Math.min(def.max, HAZARD_CAP)) return;
    const angle = extra?.angle ?? (Math.random() < 0.5 ? 0 : Math.PI / 2);
    if (def.kind === 'beam') {
        const len = (state.arena?.r ?? 900) * 2.2;
        telegraph(state, 'line', angle === 0 ? x - len / 2 : x, angle === 0 ? y : y - len / 2,
            { angle, length: len, width: def.radius * 2, color: def.color }, HAZARD_WARN_FRAMES, (st) => {
                st.hazards!.push({ kind: def.kind, x, y, radius: def.radius, damage: def.damage, color: def.color, born: st.frame, angle, pulse: 1, ...extra });
                spawnExplosion(st, x, y, def.color, ParticleType.SPARK);
            });
        return;
    }
    telegraph(state, 'circle', x, y, { radius: def.radius, color: def.color }, HAZARD_WARN_FRAMES, (st) => {
        st.hazards!.push({ kind: def.kind, x, y, radius: def.radius, damage: def.damage, color: def.color, born: st.frame, pulse: 1, ...extra });
        spawnExplosion(st, x, y, def.color, def.kind === 'flare' ? ParticleType.FIRE : ParticleType.SMOKE);
    });
};

/**
 * Per frame while a boss is alive (Logic.ts). Spawns new hazards on the boss's clock and applies
 * every live hazard to the player. Dash ignores rubble slow and void pull but NOT damage pools —
 * you dash *over* acid, you don't stand in it.
 */
export const updateHazards = (state: MutableGameState, boss: Enemy | undefined, isCinematic: boolean) => {
    const list = state.hazards;
    if (boss && !isCinematic) {
        const def = boss.def.hazard;
        if (def) {
            const c = boss.state.custom = boss.state.custom ?? {};
            if (c.hazardTimer === undefined) c.hazardTimer = Math.round(def.everySec * 60 * 0.5); // first one lands early
            if (--c.hazardTimer <= 0) {
                const every = def.everySec * 60 * (state.bossEnraged ? 0.5 : 1);
                c.hazardTimer = Math.round(every);
                const at = randomArenaPoint(state, boss);
                placeHazard(state, boss, def, at.x, at.y);
            }
        }
    }
    if (!list || !list.length) return;

    const p = state.player;
    const dashing = p.dashTimer > 0;
    let inRubble = false;
    for (let i = list.length - 1; i >= 0; i--) {
        const h = list[i];
        if (h.pulse > 0) h.pulse = Math.max(0, h.pulse - 0.04);
        if (h.ttl !== undefined && --h.ttl <= 0) { // (2D) rocks crumble
            for (let k = 0; k < 8; k++) createParticle(state, h.x, h.y, ParticleType.SMOKE, '#a3a3a3', { life: 25, size: 6, speed: 3 });
            list.splice(i, 1); continue;
        }
        if (h.kind === 'rock') { // solid: shove the player (and their velocity) out of the disc
            const dx = p.x - h.x, dy = p.y - h.y, d = Math.hypot(dx, dy) || 1, min = h.radius + p.size * 0.6;
            if (d < min) { p.x = h.x + (dx / d) * min; p.y = h.y + (dy / d) * min; const vn = p.vx * (dx / d) + p.vy * (dy / d); if (vn < 0) { p.vx -= vn * (dx / d); p.vy -= vn * (dy / d); } }
            continue;
        }
        if (h.vx || h.vy) {
            h.x += h.vx ?? 0; h.y += h.vy ?? 0;
            const a = state.arena;
            if (a && Math.hypot(h.x - a.x, h.y - a.y) > a.r * 0.9) { h.vx = -(h.vx ?? 0); h.vy = -(h.vy ?? 0); }
        }
        // ambient particles (cheap: one every few frames per hazard)
        if ((state.frame + i * 7) % 12 === 0) {
            const ang = Math.random() * Math.PI * 2, d = Math.random() * h.radius * 0.8;
            const px = h.kind === 'beam' ? (h.angle === 0 ? h.x + (Math.random() - 0.5) * 1800 : h.x) : h.x + Math.cos(ang) * d;
            const py = h.kind === 'beam' ? (h.angle === 0 ? h.y : h.y + (Math.random() - 0.5) * 1800) : h.y + Math.sin(ang) * d;
            const type = h.kind === 'flare' ? ParticleType.FIRE : h.kind === 'void' ? ParticleType.VOID : h.kind === 'beam' ? ParticleType.SPARK : ParticleType.SMOKE;
            createParticle(state, px, py, type, TICK_COLORS[h.kind], { life: 30, size: 4, speed: 0.6, vy: h.kind === 'acid' ? -0.4 : 0 });
        }
        if (!hazardContains(h, p.x, p.y, p.size * 0.5)) continue;
        if (p.isTitanShieldActive) continue;

        switch (h.kind) {
            case 'rubble':
                inRubble = true;
                break;
            case 'void':
                if (!dashing) { const dx = h.x - p.x, dy = h.y - p.y, d = Math.hypot(dx, dy) || 1; p.vx += (dx / d) * 0.35; p.vy += (dy / d) * 0.35; }
                if (state.frame % HAZARD_TICK_FRAMES === 0) hurt(state, h);
                break;
            case 'nebula':
                if (!dashing) { p.vx *= 0.9; p.vy *= 0.9; }
                if (state.frame % HAZARD_TICK_FRAMES === 0) hurt(state, h);
                break;
            default: // acid, flare, beam
                if (state.frame % HAZARD_TICK_FRAMES === 0) hurt(state, h);
        }
    }
    state.playerInRubble = inRubble && !dashing;
};

const hurt = (state: MutableGameState, h: Hazard) => {
    state.damagePlayer?.(bossDamage(state, h.damage));
    if (state.activeBoss) state.lastBossHit = state.activeBoss.def.id;
    createParticle(state, state.player.x, state.player.y, ParticleType.SPARK, TICK_COLORS[h.kind], { life: 12, size: 4, speed: 3 });
};

export const clearHazards = (state: MutableGameState) => { state.hazards = []; state.playerInRubble = false; };
