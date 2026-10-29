// (2C) CRIMSON ECLIPSE — wave 30. A corrupted star. Everything is about ROTATION and DARKNESS.
//
// Phase 1 (100–66 %): two SOLAR LASERS rotate around the boss (opposite each other). Each is a live beam
//                     (state.lasers, drawn by LaserRenderer) with a wedge telegraph ahead of it showing where it
//                     will be in ~0.7 s. Safe = the wedges between the beams. Move WITH the rotation, never across.
// Phase 2 (66–33 %):  four lasers, slower. Every ~9 s an ECLIPSE: 3 s blackout (state.eclipse) where the world goes
//                     dark and only telegraphs / lasers / hazards stay visible. Flares keep falling in the dark.
// Phase 3 (<33 %):    solar FLARES (circle telegraphs) rain on and around the player while the lasers rotate and
//                     reverse direction every few seconds; the corona pulses a ring (dash through or stand inside).
// Enrage: via the kit (×2 dmg, warn ×0.7).
// Learnable: the laser hits exactly the drawn beam; the wedge ahead is where it goes next. Walk the same way it turns.

import { laserHit } from '../../BossFeats';
import { MutableGameState, Enemy, ParticleType } from '../../../types';
import { VFX } from '../../../Emitters';
import { createParticle, spawnExplosion } from '../../../Particles';
import { shake } from '../../../Feel';
import { screenFlash } from '../../../BigFx';
import { updateBossKit, telegraph, telegraphHitPlayer, telegraphContains, fireBossProjectile } from '../BossKit';

const RED = '#ef4444';
const CRIMSON = '#dc2626';
const GOLD = '#fbbf24';
const LASER_DMG = 3;           // per tick (every LASER_TICK frames) while standing in a beam
const LASER_TICK = 8;
const LASER_LEN = 820;
const LASER_HALF = 0.09;       // half-angle of the live beam (rad) — ~10° total
const LASER_LEAD = 42;         // frames ahead the wedge telegraph shows (≈0.7 s)
const LASER_SPIN_P1 = 0.016;   // rad / frame (full turn ≈ 6.5 s)
const LASER_SPIN_P2 = 0.011;
const LASER_SPIN_P3 = 0.014;
const ECLIPSE_EVERY = 540;     // frames between eclipses (9 s), P2+
const ECLIPSE_LEN = 180;       // 3 s blackout
const FLARE_DMG = 4;
const FLARE_R = 120;
const COMET_EVERY = 110;

export interface Laser { x: number; y: number; angle: number; length: number; half: number; color: string; warm: number }

/** Spin the beams; the wedge-ahead is a plain cone telegraph re-issued each frame-block (damage is done by the beam). */
const updateLasers = (state: MutableGameState, boss: Enemy, count: number, spin: number) => {
    const c = boss.state.custom!;
    if (!state.lasers || state.lasers.length !== count) {
        state.lasers = Array.from({ length: count }, (_, i): Laser => ({
            x: boss.x, y: boss.y, angle: (c.laserBase ?? 0) + (i / count) * Math.PI * 2, length: LASER_LEN, half: LASER_HALF, color: RED, warm: 0,
        }));
    }
    const t = boss.state.timer;
    for (let i = 0; i < state.lasers.length; i++) {
        const L = state.lasers[i];
        L.x = boss.x; L.y = boss.y;
        L.angle += spin * (c.spinDir ?? 1);
        L.warm = Math.min(1, L.warm + 0.03);
        // beam sparks along its length
        if (t % 3 === i % 3) {
            const r = 120 + Math.random() * (L.length - 120);
            createParticle(state, L.x + Math.cos(L.angle) * r, L.y + Math.sin(L.angle) * r, ParticleType.LASER, GOLD, { life: 6, size: 5, speed: 0.5 });
        }
        // the beam itself hurts (dash / shield dodge, like every telegraph hit)
        if (L.warm >= 1 && t % LASER_TICK === i) {
            const hit = { kind: 'cone' as const, x: L.x, y: L.y, params: { angle: L.angle, fov: L.half * 2, radius: L.length }, timer: 0, maxTimer: 1, active: false };
            if (telegraphHitPlayer(state, hit as any, LASER_DMG)) { laserHit(state); VFX.spark(state, state.player.x, state.player.y, GOLD, 10); } // (8A) feat
        }
    }
    // wedge-ahead telegraphs: one short cone per beam, re-issued every LASER_LEAD/2 frames so it always reads as "next"
    if (t % Math.floor(LASER_LEAD / 2) === 0) {
        for (const L of state.lasers) {
            const ahead = L.angle + spin * (c.spinDir ?? 1) * LASER_LEAD;
            telegraph(state, 'cone', L.x, L.y, { angle: ahead, fov: L.half * 2, radius: L.length, color: '#f97316' }, Math.floor(LASER_LEAD / 2));
        }
    }
};

export const updateCrimsonEclipse = (
    state: MutableGameState,
    enemy: Enemy,
    dx: number,
    dy: number,
    _onEnemySeen: (id: string) => void
) => {
    const shifting = updateBossKit(state, enemy);
    const phase = enemy.state.phase ?? 1;
    const c = enemy.state.custom!;
    const t = enemy.state.timer;
    const dist = Math.hypot(dx, dy);
    const toPlayer = Math.atan2(dy, dx);

    // eclipse clock (always decays, even while shifting)
    if (state.eclipse && state.eclipse > 0) state.eclipse = Math.max(0, state.eclipse - 1 / ECLIPSE_LEN);

    if (shifting) {
        state.lasers = undefined;             // beams go out during the shift, rebuilt on the new count
        state.eclipse = 0;
        if (!c.shiftDone) {
            c.shiftDone = true;
            c.laserBase = toPlayer + Math.PI / 2; // new beams start perpendicular to the player — never on top of them
            spawnExplosion(state, enemy.x, enemy.y, GOLD, ParticleType.RING);
            if (phase === 3) screenFlash(state, 0.6, '#fde68a');
        }
        return { moveX: 0, moveY: 0, moveSpeed: 0 };
    }
    c.shiftDone = false;

    // ---- LASERS: 2 in P1, 4 in P2/P3 (slower); P3 reverses the spin every ~4 s ----
    const count = phase === 1 ? 2 : 4;
    const spin = phase === 1 ? LASER_SPIN_P1 : phase === 2 ? LASER_SPIN_P2 : LASER_SPIN_P3;
    if (phase === 3 && t % 240 === 120) {
        c.spinDir = -(c.spinDir ?? 1);
        VFX.castShockwave(state, enemy.x, enemy.y, '#f97316'); shake(state, 6, 6);
    }
    updateLasers(state, enemy, count, spin);

    // ---- ECLIPSE (P2+): 3 s blackout; only telegraphs / beams / hazards stay visible ----
    if (phase >= 2 && t % ECLIPSE_EVERY === 300) {
        // warn: the corona dims for 1 s via a ring telegraph around the boss, then lights out
        telegraph(state, 'ring', enemy.x, enemy.y, { radius: 260, innerRadius: 200, color: '#1e1b4b' }, 60, (st) => {
            st.eclipse = 1; st.eclipseColor = '#05030a';
            screenFlash(st, 0.5, '#000000'); shake(st, 10, 10);
        });
    }

    // ---- COMET: a direct shot you dash through / Fire Blast breaks ----
    if (t % COMET_EVERY === 40) {
        fireBossProjectile(state, { x: enemy.x, y: enemy.y, vx: Math.cos(toPlayer) * 16, vy: Math.sin(toPlayer) * 16, life: 160, size: 34, color: CRIMSON, damage: 4, visualType: 'CRIMSON_COMET' });
        VFX.castShockwave(state, enemy.x, enemy.y, CRIMSON);
    }

    // ---- P1: slow ember ring between beams (24-way, Fire Blast fodder) ----
    if (phase === 1 && t % 180 === 90) {
        for (let k = 0; k < 16; k++) {
            const a = (k / 16) * Math.PI * 2 + t * 0.003;
            fireBossProjectile(state, { x: enemy.x, y: enemy.y, vx: Math.cos(a) * 4, vy: Math.sin(a) * 4, life: 170, size: 9, color: '#b91c1c', damage: 1, visualType: 'FIRE_BLAST' });
        }
    }

    // ---- P3: FLARE RAIN — circles on the player + 2 random around them, every 1.5 s; plus a corona ring every 6 s ----
    if (phase === 3) {
        if (t % 90 === 0) {
            const spots = [{ x: state.player.x + state.player.vx * 20, y: state.player.y + state.player.vy * 20 }];
            for (let k = 0; k < 2; k++) { const a = Math.random() * Math.PI * 2, r = 160 + Math.random() * 220; spots.push({ x: state.player.x + Math.cos(a) * r, y: state.player.y + Math.sin(a) * r }); }
            for (const s of spots) telegraph(state, 'circle', s.x, s.y, { radius: FLARE_R, color: GOLD }, 55, (st, tg) => {
                telegraphHitPlayer(st, tg, FLARE_DMG);
                spawnExplosion(st, tg.x, tg.y, GOLD, ParticleType.FIRE);
                for (let q = 0; q < 6; q++) createParticle(st, tg.x, tg.y, ParticleType.GLOW, '#fde68a', { life: 25, size: 10, speed: 3 });
            });
        }
        if (t % 360 === 180) {
            telegraph(state, 'ring', enemy.x, enemy.y, { radius: 420, innerRadius: 300, color: '#f97316' }, 70, (st, tg) => {
                telegraphHitPlayer(st, tg, FLARE_DMG);
                VFX.castShockwave(st, tg.x, tg.y, '#f97316'); shake(st, 10, 8);
            });
        }
    }

    // ---- passive: light pull toward the star (the old boss had a strong one; keep it readable) ----
    if (dist < 800 && dist > 1) { state.player.vx -= (dx / dist) * 0.08; state.player.vy -= (dy / dist) * 0.08; }

    // Movement: hold mid range (320–480) so the beams sweep across the player's space instead of sitting on them;
    // never leave the arena interior (beams would then only cover half the field).
    let mx = dx, my = dy, moveSpeed = dist > 480 ? enemy.speed * 0.3 : dist < 320 ? -enemy.speed * 0.35 : 0;
    const ar = state.arena;
    if (ar) {
        const cx = ar.x - enemy.x, cy = ar.y - enemy.y, cd = Math.hypot(cx, cy);
        if (cd > ar.r * 0.55) { mx = cx; my = cy; moveSpeed = enemy.speed * 0.35; }
    }
    return { moveX: mx, moveY: my, moveSpeed };
};

/** Used by the renderer: is the world point inside any live beam? */
export const inAnyLaser = (state: MutableGameState, x: number, y: number): boolean => {
    if (!state.lasers) return false;
    for (const L of state.lasers) if (telegraphContains({ kind: 'cone', x: L.x, y: L.y, params: { angle: L.angle, fov: L.half * 2, radius: L.length } }, x, y)) return true;
    return false;
};
