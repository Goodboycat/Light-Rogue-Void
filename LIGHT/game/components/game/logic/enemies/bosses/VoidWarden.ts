// (2C) THE VOID WARDEN — wave 20. A ricochet dasher. Everything is about reading the LINE.
//
// Phase 1 (100–66 %): RICOCHET DASH — the full path (incl. the bounce off the arena wall) is drawn 0.8 s ahead as
//                     two line telegraphs; the Warden then flies along it. Each bounce point leaves a toxic nebula
//                     (hazard, max 6 from the dash + the hazard clock). Between dashes: 8-way arcane volley.
// Phase 2 (66–33 %):  DOUBLE DASH (second leg aimed at where the player will be), spawns 2 Phase Shades on shift,
//                     volley becomes a slow spiral.
// Phase 3 (<33 %):    arena SHRINKS to r 650 (less room to dodge the lines), nebulas DRIFT, triple dash with
//                     shorter warns, and a "warden's wall": a sweeping cone laser you must rotate with.
// Enrage: via the kit (×2 dmg, warn ×0.7).
// Learnable: the dash hits exactly the drawn line. Sidestep PERPENDICULAR; never run along it.

import { MutableGameState, Enemy, ParticleType } from '../../../types';
import { spawnEnemy } from '../SpawnLogic';
import { spawnExplosion, createParticle } from '../../../Particles';
import { VFX } from '../../../Emitters';
import { shake, hitStop } from '../../../Feel';
import { ENEMIES } from '../../../../../enemies';
import { updateBossKit, telegraph, telegraphHitPlayer, fireBossProjectile } from '../BossKit';
import { placeHazard } from '../BossHazards';

const VIOLET = '#a78bfa';
const NEBULA = '#10b981';
const DASH_DMG = 4;
const CONE_DMG = 3;
const DASH_SPEED = 26;              // px / frame while flying
const DASH_WARN = 48;               // 0.8 s
const P3_ARENA_R = 650;
const MAX_DASH_NEBULAS = 6;

interface Leg { x0: number; y0: number; x1: number; y1: number }

/** Build a dash path from (x,y) toward angle `a`: first leg to the arena wall, bounce, second leg of `bounceLen`. */
const buildPath = (state: MutableGameState, x: number, y: number, a: number, bounceLen: number): Leg[] => {
    const ar = state.arena ?? { x, y, r: 900 };
    // ray-circle intersection for the first leg
    const dx = Math.cos(a), dy = Math.sin(a);
    const fx = x - ar.x, fy = y - ar.y;
    const b = 2 * (fx * dx + fy * dy), c = fx * fx + fy * fy - (ar.r * 0.92) ** 2;
    const disc = Math.max(0, b * b - 4 * c);
    const tHit = Math.max(60, (-b + Math.sqrt(disc)) / 2);
    const hx = x + dx * tHit, hy = y + dy * tHit;
    // reflect about the wall normal
    const nx = (hx - ar.x), ny = (hy - ar.y), nl = Math.hypot(nx, ny) || 1;
    const dot = dx * (nx / nl) + dy * (ny / nl);
    const rx = dx - 2 * dot * (nx / nl), ry = dy - 2 * dot * (ny / nl);
    return [
        { x0: x, y0: y, x1: hx, y1: hy },
        { x0: hx, y0: hy, x1: hx + rx * bounceLen, y1: hy + ry * bounceLen },
    ];
};

const legLen = (l: Leg) => Math.hypot(l.x1 - l.x0, l.y1 - l.y0);
const legAngle = (l: Leg) => Math.atan2(l.y1 - l.y0, l.x1 - l.x0);

/** Telegraph every leg, then start flying. */
const scheduleDash = (state: MutableGameState, boss: Enemy, legs: Leg[], warn: number) => {
    const c = boss.state.custom!;
    for (let i = 0; i < legs.length; i++) {
        const l = legs[i];
        telegraph(state, 'line', l.x0, l.y0, { angle: legAngle(l), length: legLen(l), width: boss.size * 1.5, color: i === 0 ? VIOLET : '#c4b5fd' }, warn,
            i === 0 ? (st) => {
                c.flight = { legs, leg: 0, t: 0 };
                VFX.castShockwave(st, boss.x, boss.y, VIOLET);
                shake(st, 6, 6);
            } : undefined);
    }
};

export const updateVoidWarden = (
    state: MutableGameState,
    enemy: Enemy,
    dx: number,
    dy: number,
    onEnemySeen: (id: string) => void
) => {
    const shifting = updateBossKit(state, enemy);
    const phase = enemy.state.phase ?? 1;
    const c = enemy.state.custom!;
    const t = enemy.state.timer;
    const dist = Math.hypot(dx, dy);
    const toPlayer = Math.atan2(dy, dx);

    if (shifting) {
        c.flight = undefined;
        if (!c.shiftDone) {
            c.shiftDone = true;
            if (phase === 2) { // two Phase Shades flank the player
                const shade = ENEMIES.find(e => e.id === 'e5');
                for (let k = 0; k < 2; k++) {
                    const a = toPlayer + (k ? Math.PI / 2 : -Math.PI / 2);
                    spawnEnemy(state, state.bossSpawnedWave ?? 20, onEnemySeen, state.player.x + Math.cos(a) * 260, state.player.y + Math.sin(a) * 260, shade, { noAffix: true });
                }
            }
            if (phase === 3 && state.arena) { // the arena closes in
                c.shrinkTo = P3_ARENA_R;
                shake(state, 12, 12);
                spawnExplosion(state, state.arena.x, state.arena.y, VIOLET, ParticleType.RING);
            }
        }
        return { moveX: 0, moveY: 0, moveSpeed: 0 };
    }
    c.shiftDone = false;

    // P3 arena shrink (smooth) + nebulas drift
    if (c.shrinkTo && state.arena && state.arena.r > c.shrinkTo) {
        state.arena.r = Math.max(c.shrinkTo, state.arena.r - 3);
        if (state.frame % 6 === 0) state.arena.pulse = Math.max(state.arena.pulse, 0.4);
    }
    if (phase === 3 && state.hazards && state.frame % 30 === 0) {
        for (const h of state.hazards) if (h.kind === 'nebula' && !h.vx && !h.vy) { const a = Math.random() * Math.PI * 2; h.vx = Math.cos(a) * 0.6; h.vy = Math.sin(a) * 0.6; }
    }

    // ---- IN FLIGHT: hard-move along the legs; contact is the hit, bounces leave nebulas ----
    if (c.flight) {
        const f = c.flight;
        const l: Leg = f.legs[f.leg];
        const L = legLen(l), a = legAngle(l);
        f.t += DASH_SPEED;
        enemy.x = l.x0 + Math.cos(a) * Math.min(f.t, L);
        enemy.y = l.y0 + Math.sin(a) * Math.min(f.t, L);
        enemy.vx = 0; enemy.vy = 0;
        for (let k = 0; k < 2; k++) createParticle(state, enemy.x, enemy.y, ParticleType.VOID, VIOLET, { life: 18, size: 14, speed: 1 });
        // the body IS the hitbox during the dash
        if (!f.hitDone && Math.hypot(state.player.x - enemy.x, state.player.y - enemy.y) < enemy.size * 0.8 + state.player.size) {
            if (state.player.dashTimer <= 0 && !state.player.isTitanShieldActive) {
                state.damagePlayer?.(DASH_DMG * (state.bossEnraged ? 2 : 1));
                shake(state, 12, 8); hitStop(state, 4);
            } else VFX.spark(state, state.player.x, state.player.y, '#ffffff', 8);
            f.hitDone = true;
        }
        if (f.t >= L) {
            // bounce: nebula at the wall, next leg or done
            if (enemy.def.hazard && f.leg < f.legs.length - 1 && (state.hazards?.filter(h => h.kind === 'nebula').length ?? 0) < MAX_DASH_NEBULAS)
                placeHazard(state, enemy, enemy.def.hazard, l.x1, l.y1);
            VFX.castShockwave(state, l.x1, l.y1, NEBULA);
            shake(state, 7, 5);
            f.leg++; f.t = 0; f.hitDone = false;
            if (f.leg >= f.legs.length) { c.flight = undefined; c.restUntil = t + 40; }
        }
        return { moveX: 0, moveY: 0, moveSpeed: 0 };
    }

    // ---- DASH SCHEDULER ----
    const dashEvery = phase === 1 ? 240 : phase === 2 ? 210 : 180;
    const warn = phase === 3 ? 40 : DASH_WARN;
    if (t % dashEvery === 100 && (c.restUntil ?? 0) <= t) {
        // aim at the player (lead a little in P2+)
        const lead = phase >= 2 ? 25 : 0;
        const ax = state.player.x + state.player.vx * lead - enemy.x, ay = state.player.y + state.player.vy * lead - enemy.y;
        let legs = buildPath(state, enemy.x, enemy.y, Math.atan2(ay, ax), 520);
        if (phase >= 2) { // double / triple: chain another bounce from the end of the last leg
            const last = legs[legs.length - 1];
            const more = buildPath(state, last.x1, last.y1, Math.atan2(state.player.y - last.y1, state.player.x - last.x1), phase === 3 ? 620 : 420);
            legs = legs.concat(more);
        }
        scheduleDash(state, enemy, legs, warn);
    }

    // ---- VOLLEY between dashes: P1 8-way burst, P2+ slow spiral (Fire Blast breaks them) ----
    if (t % dashEvery === 0) {
        const ways = 8;
        for (let k = 0; k < ways; k++) {
            const a = (k / ways) * Math.PI * 2 + t * 0.01;
            fireBossProjectile(state, { x: enemy.x, y: enemy.y, vx: Math.cos(a) * 5, vy: Math.sin(a) * 5, life: 200, size: 9, color: VIOLET, damage: 1, visualType: 'ARCANE_MISSILE' });
        }
    }
    if (phase >= 2 && t % 9 === 0 && t % dashEvery > 160) {
        const a = t * 0.35;
        fireBossProjectile(state, { x: enemy.x, y: enemy.y, vx: Math.cos(a) * 4.5, vy: Math.sin(a) * 4.5, life: 180, size: 8, color: '#c4b5fd', damage: 1, visualType: 'ARCANE_MISSILE' });
    }

    // ---- P3 WARDEN'S WALL: sweeping cone laser — telegraphed wedge that then sweeps 90° over 1 s ----
    if (phase === 3 && t % 360 === 200) {
        const start = toPlayer - Math.PI / 4;
        telegraph(state, 'cone', enemy.x, enemy.y, { angle: toPlayer, fov: Math.PI / 2, radius: 700, color: '#f0abfc' }, 70, (st) => {
            c.sweep = { a: start, left: 60 };
        });
    }
    if (c.sweep) {
        const s = c.sweep;
        s.a += (Math.PI / 2) / 60; s.left--;
        for (let r = 60; r < 700; r += 40) createParticle(state, enemy.x + Math.cos(s.a) * r, enemy.y + Math.sin(s.a) * r, ParticleType.LASER, '#f0abfc', { life: 4, size: 6, speed: 0 });
        if (s.left % 6 === 0) {
            const hit = { kind: 'cone' as const, x: enemy.x, y: enemy.y, params: { angle: s.a, fov: 0.22, radius: 700 }, timer: 0, maxTimer: 1, active: false };
            telegraphHitPlayer(state, hit as any, CONE_DMG);
        }
        if (s.left <= 0) c.sweep = undefined;
        return { moveX: 0, moveY: 0, moveSpeed: 0 };
    }

    // ---- passive: light pull (the old boss had a strong one; keep it readable) ----
    if (dist < 700 && dist > 1) { state.player.vx -= (dx / dist) * 0.15; state.player.vy -= (dy / dist) * 0.15; }

    // Movement between dashes: keep mid range so the lines are long and readable
    const moveSpeed = dist < 300 ? -enemy.speed * 0.25 : dist > 520 ? enemy.speed * 0.3 : 0;
    return { moveX: dx, moveY: dy, moveSpeed };
};
