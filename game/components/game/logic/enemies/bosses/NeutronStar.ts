// (2D) THE COLLAPSING NEUTRON — wave 40. A gravity boss. Everything is about DISTANCE: the pull never stops,
// and every attack tells you where to stand (inside / outside a ring, far from the core).
//
// Passive:            constant gravity pull toward the boss (strength scales with phase; dash ignores it).
// Phase 1 (100–66 %): ORBIT RINGS — ring telegraphs (band) you must stand INSIDE or OUTSIDE of; the band is wide and
//                     the safe side is called by colour (cyan = stand inside, white = stand outside). Spiral bullets.
// Phase 2 (66–33 %):  PULSES — a push (ring sweeps outwards, hits you if you're caught at its radius) followed 1.2 s
//                     later by a PULL (strong gravity burst + core circle). Rings now come in pairs (inside / outside).
// Phase 3 (<33 %):    COLLAPSE — arena shrinks to r 500, pull ×2, then every 8 s a SUPERNOVA: 2 s warn circle
//                     (radius 420) around the boss; be outside it or die. After it the star blinks white for a second.
// Hazard (bosses.ts): static beams cut the arena into lanes (kit hazard clock).
// Learnable: the pull is constant, so you must keep walking away; dash through the band, never along it.

import { MutableGameState, Enemy, ParticleType } from '../../../types';
import { createParticle, spawnExplosion } from '../../../Particles';
import { VFX } from '../../../Emitters';
import { shake, hitStop } from '../../../Feel';
import { heavyShake, screenFlash, spawnBigExplosion } from '../../../BigFx';
import { updateBossKit, telegraph, telegraphHitPlayer, fireBossProjectile } from '../BossKit';

const CYAN = '#38bdf8';
const WHITE = '#e0f2fe';
const PULL_BASE = 0.22;             // px/frame² at the edge of PULL_RANGE
const PULL_RANGE = 900;
const RING_DMG = 4;
const PULSE_DMG = 3;
const NOVA_DMG = 9;                 // the supernova is the finisher-grade mistake
const P3_ARENA_R = 500;
const NOVA_R = 420;
const NOVA_WARN = 120;              // 2 s
const NOVA_EVERY = 480;             // 8 s

/** Gravity: dash ignores it (that's the escape), everyone else gets pulled. */
const applyPull = (state: MutableGameState, enemy: Enemy, dx: number, dy: number, mult: number) => {
    const dist = Math.hypot(dx, dy);
    if (dist < 1 || dist > PULL_RANGE || state.player.dashTimer > 0) return;
    // stronger the closer you are (inverse-ish), capped so you can always out-walk it
    const s = PULL_BASE * mult * (0.6 + 0.8 * (1 - dist / PULL_RANGE));
    state.player.vx -= (dx / dist) * s;
    state.player.vy -= (dy / dist) * s;
    if (state.frame % 4 === 0) {
        const a = Math.random() * Math.PI * 2, r = 140 + Math.random() * 500;
        createParticle(state, enemy.x + Math.cos(a) * r, enemy.y + Math.sin(a) * r, ParticleType.ICE, CYAN, { life: 20, size: 3, speed: 0, vx: -Math.cos(a) * 6, vy: -Math.sin(a) * 6 });
    }
};

/** Ring band around the boss: cyan = safe INSIDE, white = safe OUTSIDE. */
const orbitRing = (state: MutableGameState, enemy: Enemy, inner: number, outer: number, safeInside: boolean, warn: number) => {
    telegraph(state, 'ring', enemy.x, enemy.y, { radius: outer, innerRadius: inner, color: safeInside ? CYAN : WHITE }, warn, (st, tg) => {
        tg.x = enemy.x; tg.y = enemy.y; // ring follows the star
        if (telegraphHitPlayer(st, tg, RING_DMG)) VFX.spark(st, st.player.x, st.player.y, CYAN, 10);
        // the band flashes as a shell of ice
        for (let k = 0; k < 24; k++) {
            const a = (k / 24) * Math.PI * 2, r = (inner + outer) / 2;
            createParticle(st, enemy.x + Math.cos(a) * r, enemy.y + Math.sin(a) * r, ParticleType.ICE, WHITE, { life: 14, size: 6, speed: 0 });
        }
        shake(st, 5, 5);
    });
};

export const updateNeutronStar = (
    state: MutableGameState,
    enemy: Enemy,
    dx: number,
    dy: number,
    _onEnemySeen: (id: string) => void
) => {
    const shifting = updateBossKit(state, enemy);
    const phase = enemy.state.phase ?? 1;
    if (!enemy.state.custom) enemy.state.custom = {};
    const c = enemy.state.custom;
    const t = enemy.state.timer;
    const dist = Math.hypot(dx, dy);

    if (shifting) {
        if (!c.shiftDone) {
            c.shiftDone = true;
            c.pulse = undefined; c.nova = undefined;
            if (phase === 3 && state.arena) { c.shrinkTo = P3_ARENA_R; heavyShake(state, 14, 20); screenFlash(state, 0.5, CYAN); }
            spawnExplosion(state, enemy.x, enemy.y, CYAN, ParticleType.RING);
        }
        return { moveX: 0, moveY: 0, moveSpeed: 0 };
    }
    c.shiftDone = false;

    // ---- passive gravity (phase scaled; P3 ×2) ----
    const pullMult = phase === 1 ? 1 : phase === 2 ? 1.35 : 2;
    applyPull(state, enemy, dx, dy, pullMult * (c.pulse?.pulling ? 3 : 1));

    // ---- P3 collapse: the arena closes to r 500 ----
    if (c.shrinkTo && state.arena && state.arena.r > c.shrinkTo) {
        state.arena.r = Math.max(c.shrinkTo, state.arena.r - 4);
        if (state.frame % 6 === 0) state.arena.pulse = Math.max(state.arena.pulse, 0.4);
    }

    // ---- ORBIT RINGS: P1 one band (alternating safe side), P2 a pair, P3 a tighter faster band ----
    const ringEvery = phase === 1 ? 210 : phase === 2 ? 240 : 170;
    const warn = phase === 3 ? 60 : 80;
    if (t % ringEvery === 30) {
        c.ringFlip = !c.ringFlip;
        const safeInside = !!c.ringFlip;
        if (phase === 1) orbitRing(state, enemy, 220, 420, safeInside, warn);
        else if (phase === 2) { orbitRing(state, enemy, 180, 330, true, warn); orbitRing(state, enemy, 450, 620, false, warn + 30); }
        else orbitRing(state, enemy, safeInside ? 140 : 90, safeInside ? 330 : 260, safeInside, warn);
    }

    // ---- spiral bullets (P1+; Fire Blast breaks them) ----
    if (t % (phase === 3 ? 6 : 9) === 0 && !c.nova) {
        const arms = phase === 1 ? 2 : 3;
        for (let k = 0; k < arms; k++) {
            const a = t * 0.11 + (k / arms) * Math.PI * 2;
            fireBossProjectile(state, { x: enemy.x, y: enemy.y, vx: Math.cos(a) * 5.5, vy: Math.sin(a) * 5.5, life: 170, size: 7, color: CYAN, damage: 1, visualType: 'DEFAULT' });
        }
    }

    // ---- P2+ PULSES: PUSH ring (expands) → 1.2 s later PULL burst with a core circle ----
    if (phase >= 2 && t % 300 === 150 && !c.pulse) {
        c.pulse = { r: 60, pushing: true, pulling: false, left: 70 };
        telegraph(state, 'circle', enemy.x, enemy.y, { radius: 160, color: WHITE }, 60); // "something is charging"
        shake(state, 6, 10);
    }
    if (c.pulse) {
        const p = c.pulse;
        if (p.pushing) {
            p.r += 14;
            for (let k = 0; k < 10; k++) { const a = Math.random() * Math.PI * 2; createParticle(state, enemy.x + Math.cos(a) * p.r, enemy.y + Math.sin(a) * p.r, ParticleType.ICE, WHITE, { life: 8, size: 5, speed: 0 }); }
            // the shockwave shoves the player outward and hurts if they're on it
            if (Math.abs(dist - p.r) < 40 && !p.hit) {
                p.hit = true;
                if (state.player.dashTimer <= 0 && !state.player.isTitanShieldActive) { state.damagePlayer?.(PULSE_DMG * (state.bossEnraged ? 2 : 1)); shake(state, 10, 8); hitStop(state, 3); }
                else VFX.spark(state, state.player.x, state.player.y, '#ffffff', 8);
                if (dist > 1) { state.player.vx += (dx / dist) * 18; state.player.vy += (dy / dist) * 18; }
            }
            if (p.r > 760) {
                p.pushing = false;
                // the pull is the real threat: a core circle you must not be dragged into
                telegraph(state, 'circle', enemy.x, enemy.y, { radius: 200, color: CYAN }, 72, (st, tg) => {
                    tg.x = enemy.x; tg.y = enemy.y;
                    telegraphHitPlayer(st, tg, RING_DMG + 1);
                    spawnBigExplosion(st, enemy.x, enemy.y, { radius: 220, color: CYAN, color2: WHITE, rings: 2 });
                    c.pulse = undefined;
                });
                p.pulling = true;
            }
        } else if (p.pulling && state.frame % 2 === 0) {
            createParticle(state, state.player.x + (Math.random() - 0.5) * 60, state.player.y + (Math.random() - 0.5) * 60, ParticleType.ICE, CYAN, { life: 10, size: 3, speed: 0 });
        }
    }

    // ---- P3 SUPERNOVA: 2 s warn circle r 420 — be OUTSIDE it. Then the star blinks and the pull pauses 1 s. ----
    if (phase === 3 && t % NOVA_EVERY === 300 && !c.nova) {
        c.nova = { left: NOVA_WARN };
        telegraph(state, 'circle', enemy.x, enemy.y, { radius: NOVA_R, color: '#ffffff' }, NOVA_WARN, (st, tg) => {
            tg.x = enemy.x; tg.y = enemy.y;
            spawnBigExplosion(st, enemy.x, enemy.y, { radius: NOVA_R, color: '#ffffff', color2: CYAN, rings: 3 });
            screenFlash(st, 0.9, '#ffffff'); heavyShake(st, 22, 24); hitStop(st, 6);
            if (telegraphHitPlayer(st, tg, NOVA_DMG)) VFX.spark(st, st.player.x, st.player.y, '#ffffff', 20);
            // ember ring you can dash through
            for (let k = 0; k < 20; k++) { const a = (k / 20) * Math.PI * 2; fireBossProjectile(st, { x: enemy.x + Math.cos(a) * 60, y: enemy.y + Math.sin(a) * 60, vx: Math.cos(a) * 6, vy: Math.sin(a) * 6, life: 120, size: 10, color: WHITE, damage: 2, visualType: 'FIRE_BLAST' }); }
            c.nova = undefined; c.blink = 60;
        });
    }
    if (c.nova) {
        c.nova.left--;
        // the core visibly compresses: inward ice streaks + rising shake
        for (let k = 0; k < 3; k++) { const a = Math.random() * Math.PI * 2, r = 200 + Math.random() * 300; createParticle(state, enemy.x + Math.cos(a) * r, enemy.y + Math.sin(a) * r, ParticleType.ICE, '#ffffff', { life: 12, size: 4, speed: 0, vx: -Math.cos(a) * 14, vy: -Math.sin(a) * 14 }); }
        if (c.nova.left % 10 === 0) shake(state, 4 + (NOVA_WARN - c.nova.left) / 12, 6);
        return { moveX: 0, moveY: 0, moveSpeed: 0 }; // it holds still — read the circle
    }
    if (c.blink && c.blink > 0) { c.blink--; if (state.frame % 3 === 0) createParticle(state, enemy.x, enemy.y, ParticleType.RING, '#ffffff', { life: 10, size: 40, speed: 0 }); }

    // ---- movement: slow drift toward the player (gravity does the chasing); zig-zag so the rings' centre moves ----
    const perp = Math.atan2(dy, dx) + Math.PI / 2;
    const moveX = dx + Math.cos(perp) * Math.sin(state.frame * 0.03) * 220;
    const moveY = dy + Math.sin(perp) * Math.sin(state.frame * 0.03) * 220;
    const moveSpeed = c.pulse ? 0 : enemy.speed * (dist > 500 ? 0.5 : 0.25);
    return { moveX, moveY, moveSpeed };
};
