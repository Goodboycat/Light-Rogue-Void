// (2D) THE ENTROPY TITAN — wave 50. A colossal brawler. Everything is about SPACE: every slam fills the floor,
// the shockwaves make you jump, the arena gets smaller, and the rocks it leaves are SOLID.
//
// Phase 1 (100–66 %): SLAM — leaps to the player (line telegraph), lands as a big circle (r 230) and leaves 2–3 ROCKS
//                     (solid `rock` hazards, 12 s) around the crater. Between slams: a 3-step stomp walk (circles under
//                     the boss) and a rocket volley you can break with Fire Blast.
// Phase 2 (66–33 %):  SHOCKWAVE RINGS after every slam — two expanding ring telegraphs (thin band) you must dash through,
//                     they shatter rocks they cross. Iron Clad adds march in on each shift (kit `addTable` = e22).
// Phase 3 (<33 %):    every slam SHRINKS the arena by 60 (floor 520); a double slam (two line telegraphs, second one
//                     leads your movement); rocks last 20 s; QUAKE every 10 s: 4 random crater circles + a ring.
// Hazard (bosses.ts): rubble mud (90 % slow, dash ignores) on the kit clock.
// Learnable: the slam is where the line ENDS; sidestep early, then dash the ring. Never fight with a rock behind you.

import { MutableGameState, Enemy, ParticleType } from '../../../types';
import { createParticle, spawnExplosion } from '../../../Particles';
import { VFX } from '../../../Emitters';
import { shake, hitStop } from '../../../Feel';
import { heavyShake, screenFlash, spawnBigExplosion } from '../../../BigFx';
import { updateBossKit, telegraph, telegraphHitPlayer, fireBossProjectile, Telegraph } from '../BossKit';
import { HazardDef } from '../BossHazards';

const LIME = '#84cc16';
const PALE = '#d9f99d';
const ROCK = '#a3a3a3';
const SLAM_DMG = 5;
const RING_DMG = 3;
const STOMP_DMG = 2;
const SLAM_R = 230;
const SLAM_WARN = 66;
const LEAP_FRAMES = 22;
const ROCK_R = 70;
const ROCK_TTL = 12 * 60;
const ROCK_TTL_P3 = 20 * 60;
const ROCK_CAP = 10;
const P3_SHRINK = 60;
const P3_ARENA_MIN = 520;
const ROCK_DEF: HazardDef = { kind: 'rock', everySec: 0, max: 99, radius: ROCK_R, damage: 0, color: ROCK };

/** Drop solid boulders around a crater (direct push, no telegraph — the slam WAS the telegraph). */
const dropRocks = (state: MutableGameState, x: number, y: number, n: number, ttl: number) => {
    if (!state.hazards) state.hazards = [];
    const rocks = state.hazards.filter(h => h.kind === 'rock').length;
    const base = Math.random() * Math.PI * 2;
    for (let k = 0; k < n && rocks + k < ROCK_CAP; k++) {
        const a = base + (k / n) * Math.PI * 2 + (Math.random() - 0.5) * 0.6, r = SLAM_R * 0.8 + Math.random() * 60;
        const rx = x + Math.cos(a) * r, ry = y + Math.sin(a) * r;
        // never bury the player under a rock
        if (Math.hypot(rx - state.player.x, ry - state.player.y) < ROCK_R + state.player.size + 20) continue;
        state.hazards.push({ kind: 'rock', x: rx, y: ry, radius: ROCK_R, damage: 0, color: ROCK, born: state.frame, pulse: 1, ttl });
        spawnExplosion(state, rx, ry, ROCK, ParticleType.SMOKE);
    }
};

/** Expanding thin ring: hits the player caught on the band, shatters rocks it crosses. */
const startShockwave = (state: MutableGameState, c: any, x: number, y: number, delay: number) => {
    c.waves = c.waves ?? [];
    c.waves.push({ x, y, r: 40, delay, hit: false });
};

const updateShockwaves = (state: MutableGameState, c: any) => {
    if (!c.waves?.length) return;
    for (let i = c.waves.length - 1; i >= 0; i--) {
        const w = c.waves[i];
        if (w.delay > 0) { w.delay--; continue; }
        w.r += 11;
        const band = 34;
        for (let k = 0; k < 12; k++) { const a = Math.random() * Math.PI * 2; createParticle(state, w.x + Math.cos(a) * w.r, w.y + Math.sin(a) * w.r, ParticleType.THUNDER, PALE, { life: 7, size: 5, speed: 0 }); }
        // the band is a live ring telegraph: contact = hit, dash = dodge
        const d = Math.hypot(state.player.x - w.x, state.player.y - w.y);
        if (!w.hit && Math.abs(d - w.r) < band) {
            w.hit = true;
            const tg = { kind: 'ring' as const, x: w.x, y: w.y, params: { radius: w.r + band, innerRadius: w.r - band }, timer: 0, maxTimer: 1, active: false } as Telegraph;
            telegraphHitPlayer(state, tg, RING_DMG);
        }
        // shatter rocks
        if (state.hazards) for (let j = state.hazards.length - 1; j >= 0; j--) {
            const h = state.hazards[j];
            if (h.kind === 'rock' && Math.abs(Math.hypot(h.x - w.x, h.y - w.y) - w.r) < band + h.radius * 0.5) {
                for (let k = 0; k < 10; k++) createParticle(state, h.x, h.y, ParticleType.SPARK, ROCK, { life: 20, size: 5, speed: 5 });
                state.hazards.splice(j, 1); shake(state, 4, 4);
            }
        }
        if (w.r > (state.arena?.r ?? 900) * 1.05) c.waves.splice(i, 1);
    }
};

export const updateEntropyTitan = (
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
        c.leap = undefined; c.waves = [];
        if (!c.shiftDone) {
            c.shiftDone = true;
            heavyShake(state, 12, 16);
            spawnExplosion(state, enemy.x, enemy.y, LIME, ParticleType.BOSS_AURA);
            // the ground gives way: every rock shatters on a shift
            if (state.hazards) state.hazards = state.hazards.filter(h => h.kind !== 'rock');
        }
        return { moveX: 0, moveY: 0, moveSpeed: 0 };
    }
    c.shiftDone = false;

    updateShockwaves(state, c);

    // ---- IN LEAP: fly to the landing point, then crater ----
    if (c.leap) {
        const L = c.leap;
        L.t++;
        const k = Math.min(1, L.t / LEAP_FRAMES), arc = Math.sin(k * Math.PI) * 160;
        enemy.x = L.x0 + (L.x1 - L.x0) * k;
        enemy.y = L.y0 + (L.y1 - L.y0) * k - arc;
        enemy.vx = 0; enemy.vy = 0;
        if (L.t % 2 === 0) createParticle(state, enemy.x, enemy.y + 40, ParticleType.SMOKE, '#365314', { life: 14, size: 12, speed: 0.5 });
        if (k >= 1) {
            // LANDING — the slam itself
            const tg = { kind: 'circle' as const, x: L.x1, y: L.y1, params: { radius: SLAM_R }, timer: 0, maxTimer: 1, active: false } as Telegraph;
            telegraphHitPlayer(state, tg, SLAM_DMG);
            spawnBigExplosion(state, L.x1, L.y1, { radius: SLAM_R * 0.9, color: PALE, color2: LIME, rings: 2, life: 50 });
            heavyShake(state, 18, 14); hitStop(state, 5); screenFlash(state, 0.25, PALE);
            dropRocks(state, L.x1, L.y1, phase === 1 ? 2 : 3, phase === 3 ? ROCK_TTL_P3 : ROCK_TTL);
            if (phase >= 2) { startShockwave(state, c, L.x1, L.y1, 10); startShockwave(state, c, L.x1, L.y1, 50); }
            if (phase === 3 && state.arena) {
                state.arena.r = Math.max(P3_ARENA_MIN, state.arena.r - P3_SHRINK);
                state.arena.pulse = 1;
                spawnExplosion(state, state.arena.x, state.arena.y, LIME, ParticleType.RING);
            }
            c.leap = undefined;
            if (L.next) { // P3 double slam: second leap already telegraphed, go again after a beat
                c.pendingLeap = L.next; c.pendingAt = t + 18;
            } else c.restUntil = t + 50;
        }
        return { moveX: 0, moveY: 0, moveSpeed: 0 };
    }
    if (c.pendingLeap && t >= (c.pendingAt ?? 0)) { c.leap = { x0: enemy.x, y0: enemy.y, ...c.pendingLeap, t: 0 }; c.pendingLeap = undefined; return { moveX: 0, moveY: 0, moveSpeed: 0 }; }

    // ---- SLAM SCHEDULER: line telegraph to the landing point + landing circle, then the leap ----
    const slamEvery = phase === 1 ? 270 : phase === 2 ? 240 : 210;
    if (t % slamEvery === 60 && (c.restUntil ?? 0) <= t && !c.pendingLeap) {
        const lead = phase >= 2 ? 20 : 8;
        let tx = state.player.x + state.player.vx * lead, ty = state.player.y + state.player.vy * lead;
        const a = state.arena; if (a) { const d = Math.hypot(tx - a.x, ty - a.y); if (d > a.r * 0.85) { tx = a.x + (tx - a.x) / d * a.r * 0.85; ty = a.y + (ty - a.y) / d * a.r * 0.85; } }
        const ang = Math.atan2(ty - enemy.y, tx - enemy.x), len = Math.hypot(tx - enemy.x, ty - enemy.y);
        const warn = state.bossEnraged ? Math.round(SLAM_WARN * 0.7) : SLAM_WARN;
        telegraph(state, 'line', enemy.x, enemy.y, { angle: ang, length: len, width: enemy.size, color: '#65a30d' }, warn);
        // P3: the second slam is shown at once — where you'll run to (300 px along your current heading)
        let next: { x1: number; y1: number } | undefined;
        if (phase === 3) {
            const vx = state.player.vx, vy = state.player.vy, sp = Math.hypot(vx, vy);
            const hx = sp > 0.5 ? vx / sp : Math.cos(ang), hy = sp > 0.5 ? vy / sp : Math.sin(ang);
            next = { x1: tx + hx * 300, y1: ty + hy * 300 };
            telegraph(state, 'circle', next.x1, next.y1, { radius: SLAM_R, color: '#bef264' }, warn + LEAP_FRAMES + 18);
        }
        telegraph(state, 'circle', tx, ty, { radius: SLAM_R, color: LIME }, warn, () => {
            c.leap = { x0: enemy.x, y0: enemy.y, x1: tx, y1: ty, t: 0, next };
            VFX.castShockwave(state, enemy.x, enemy.y, LIME); shake(state, 6, 6);
        });
    }

    // ---- STOMP WALK: three circles under the boss as it advances (P1+), hurts if you hug it ----
    if (t % slamEvery === 170 && dist < 420) {
        for (let k = 0; k < 3; k++) {
            const ang = Math.atan2(dy, dx), sx = enemy.x + Math.cos(ang) * (k + 1) * 110, sy = enemy.y + Math.sin(ang) * (k + 1) * 110;
            telegraph(state, 'circle', sx, sy, { radius: 95, color: '#65a30d' }, 40 + k * 14, (st, tg) => { telegraphHitPlayer(st, tg, STOMP_DMG); shake(st, 5, 4); for (let j = 0; j < 6; j++) createParticle(st, tg.x, tg.y, ParticleType.SMOKE, '#365314', { life: 20, size: 10, speed: 2 }); });
        }
    }

    // ---- ROCKET VOLLEY (breakable): 5 slow shots fanned at the player ----
    if (t % slamEvery === 120 || (phase >= 2 && t % slamEvery === 200)) {
        const ang = Math.atan2(dy, dx);
        for (let k = -2; k <= 2; k++) {
            const a = ang + k * 0.18;
            fireBossProjectile(state, { x: enemy.x + Math.cos(a) * (enemy.size + 30), y: enemy.y + Math.sin(a) * (enemy.size + 30), vx: Math.cos(a) * 5, vy: Math.sin(a) * 5, life: 160, size: 9, color: PALE, damage: 1, visualType: 'HOMING_MISSILE' });
        }
    }

    // ---- P3 QUAKE every 10 s: 4 random craters + a ring from the boss ----
    if (phase === 3 && t % 600 === 400) {
        const a = state.arena;
        for (let k = 0; k < 4; k++) {
            const ang = Math.random() * Math.PI * 2, r = Math.random() * (a ? a.r * 0.8 : 600);
            const qx = (a?.x ?? enemy.x) + Math.cos(ang) * r, qy = (a?.y ?? enemy.y) + Math.sin(ang) * r;
            telegraph(state, 'circle', qx, qy, { radius: 150, color: LIME }, 70 + k * 10, (st, tg) => { telegraphHitPlayer(st, tg, STOMP_DMG + 1); spawnBigExplosion(st, tg.x, tg.y, { radius: 120, color: PALE, color2: LIME, rings: 1, life: 40 }); shake(st, 8, 6); dropRocks(st, tg.x, tg.y, 1, ROCK_TTL_P3); });
        }
        startShockwave(state, c, enemy.x, enemy.y, 90);
        heavyShake(state, 10, 30);
    }

    // ---- movement: heavy, deliberate; stays mid range so the leap line is long and readable ----
    const moveSpeed = dist > 520 ? enemy.speed * 0.45 : dist < 260 ? enemy.speed * 0.3 : enemy.speed * 0.15;
    if (state.frame % 20 === 0 && moveSpeed > 0) { shake(state, 2, 3); createParticle(state, enemy.x, enemy.y + enemy.size * 0.6, ParticleType.SMOKE, '#365314', { life: 18, size: 14, speed: 0.6 }); }
    return { moveX: dx, moveY: dy, moveSpeed };
};
