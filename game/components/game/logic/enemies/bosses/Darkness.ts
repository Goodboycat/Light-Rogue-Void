// (2D) DARKNESS — wave 60. The end of all things fights you with YOUR OWN LIGHT, turned black.
//
// Mirror:             reads `state.playerStatsRef` (set by Logic.ts every frame) and mirrors up to MIRROR_CAP (4) of the
//                     player's unlocked powers, highest level first: Fire Blast → dark blast fan (breakable),
//                     Ice Nova → freezing ring (ring telegraph, stand outside), Thunder → chain of circles jumping
//                     toward you, Homing → 3 dark seekers, Solar Flare → flare circle on you, Lux Blades → spinning
//                     line sweep, Singularity / White Hole → pull well (circle), Plasma Whip → long line lash.
//                     Anything else → a void mine (circle on you). A spark with no powers meets a boss with only mines.
// Phase 1 (100–66 %): mirrored powers on a 2.5 s rotation + passive pull + void-mine hazard (kit clock).
// Phase 2 (66–33 %):  DOPPELGANGER — a shadow of the player (BOSS_MINIONS.doppelganger, MIMIC behaviour) spawns on the
//                     shift and every 20 s while P2 lasts; the rotation speeds up (2 s) and fires two powers at once.
// Phase 3 (<33 %):    LIGHTS OUT — `state.eclipse` stays on for the rest of the fight (only hazards / telegraphs /
//                     boss bullets / your aura are drawn). Rotation 1.6 s. Every 12 s a CONSUMING NOVA: 2.5 s warn ring
//                     from the boss that covers everything but a 120 px safe disc (ring telegraph with the gap) —
//                     stand in the gap or dash through the band.
// Enrage:             the void swallows the arena edge inward (arena.r shrinks 2 px/frame to a floor of 420).
// Learnable: Darkness only has what YOU have. Your own cooldown rhythm tells you what's coming.

import { MutableGameState, Enemy, ParticleType } from '../../../types';
import { PlayerStats } from '../../../../../types';
import { spawnEnemy } from '../SpawnLogic';
import { createParticle, spawnExplosion } from '../../../Particles';
import { VFX } from '../../../Emitters';
import { shake, hitStop } from '../../../Feel';
import { heavyShake, screenFlash, spawnBigExplosion } from '../../../BigFx';
import { updateBossKit, telegraph, telegraphHitPlayer, fireBossProjectile } from '../BossKit';
import { BOSS_MINIONS } from '../../../../../bosses';

const VOID = '#7e22ce';
const INK = '#1e1b4b';
const WHITE = '#f5f3ff';
const MIRROR_CAP = 4;
const MIRROR_DMG = 3;
const NOVA_DMG = 8;
const NOVA_SAFE = 120;
const NOVA_WARN = 150;             // 2.5 s
const NOVA_EVERY = 720;            // 12 s
const DOPPEL_EVERY = 1200;         // 20 s
const ENRAGE_SHRINK = 2;
const ENRAGE_FLOOR = 420;

type Mirror = 'fire' | 'ice' | 'thunder' | 'homing' | 'flare' | 'blades' | 'well' | 'whip' | 'mine';

/** Which of the player's powers Darkness copies, highest level first, capped. */
const pickMirrors = (stats: PlayerStats | undefined): Mirror[] => {
    if (!stats) return ['mine'];
    const pool: [Mirror, number][] = [
        ['fire', stats.fireBlastLevel], ['ice', stats.iceNovaLevel], ['thunder', stats.thunderChainLevel], ['homing', stats.homingMissileLevel],
        ['flare', stats.solarFlareLevel], ['blades', stats.luxBladesLevel], ['well', Math.max(stats.singularityLevel, stats.whiteHoleLevel)], ['whip', stats.plasmaWhipLevel],
    ];
    const have = pool.filter(([, l]) => l > 0).sort((a, b) => b[1] - a[1]).slice(0, MIRROR_CAP).map(([m]) => m);
    return have.length ? have : ['mine'];
};

/** Fire one mirrored power at the player. Every one is a telegraph or a breakable bullet. */
const castMirror = (state: MutableGameState, boss: Enemy, m: Mirror, warn: number) => {
    const p = state.player;
    const dx = p.x - boss.x, dy = p.y - boss.y, ang = Math.atan2(dy, dx), dist = Math.hypot(dx, dy) || 1;
    switch (m) {
        case 'fire': // fan of dark blasts (Fire Blast breaks them)
            for (let k = -3; k <= 3; k++) { const a = ang + k * 0.14; fireBossProjectile(state, { x: boss.x, y: boss.y, vx: Math.cos(a) * 7, vy: Math.sin(a) * 7, life: 150, size: 11, color: VOID, damage: 2, visualType: 'FIRE_BLAST' }); }
            break;
        case 'ice': // freezing ring around the boss — be outside it
            telegraph(state, 'ring', boss.x, boss.y, { radius: 340, innerRadius: 0, color: '#a5b4fc' }, warn, (st, tg) => { tg.x = boss.x; tg.y = boss.y; if (telegraphHitPlayer(st, tg, MIRROR_DMG)) { st.player.vx *= 0.2; st.player.vy *= 0.2; } for (let k = 0; k < 20; k++) createParticle(st, boss.x, boss.y, ParticleType.ICE, '#c7d2fe', { life: 24, size: 6, speed: 9 }); });
            break;
        case 'thunder': { // chain of circles hopping toward you
            const hops = 4;
            for (let k = 1; k <= hops; k++) {
                const f = k / hops, cx = boss.x + dx * f + (Math.random() - 0.5) * 80, cy = boss.y + dy * f + (Math.random() - 0.5) * 80;
                telegraph(state, 'circle', cx, cy, { radius: 90, color: '#c084fc' }, warn + k * 8, (st, tg) => { telegraphHitPlayer(st, tg, MIRROR_DMG); for (let j = 0; j < 6; j++) createParticle(st, tg.x, tg.y, ParticleType.THUNDER, '#e9d5ff', { life: 10, size: 5, speed: 4 }); shake(st, 4, 3); });
            }
            break;
        }
        case 'homing': // three slow dark seekers (breakable)
            for (let k = -1; k <= 1; k++) { const a = ang + k * 0.8; fireBossProjectile(state, { x: boss.x, y: boss.y, vx: Math.cos(a) * 4, vy: Math.sin(a) * 4, life: 200, size: 9, color: '#a855f7', damage: 2, visualType: 'HOMING_MISSILE', customData: { isBossProj: true, homing: true } }); }
            break;
        case 'flare': // a flare on your position
            telegraph(state, 'circle', p.x, p.y, { radius: 150, color: '#f0abfc' }, warn, (st, tg) => { telegraphHitPlayer(st, tg, MIRROR_DMG + 1); spawnBigExplosion(st, tg.x, tg.y, { radius: 130, color: '#f0abfc', color2: VOID, rings: 1, life: 40, dark: true }); });
            break;
        case 'blades': // spinning line sweep: 3 lines through the boss, 0.6 s apart in angle
            for (let k = 0; k < 3; k++) {
                const a = ang + k * (Math.PI / 3), len = 520;
                telegraph(state, 'line', boss.x - Math.cos(a) * len / 2, boss.y - Math.sin(a) * len / 2, { angle: a, length: len, width: 50, color: '#d8b4fe' }, warn + k * 12, (st, tg) => { telegraphHitPlayer(st, tg, MIRROR_DMG); for (let r = 0; r < len; r += 40) createParticle(st, tg.x + Math.cos(a) * r, tg.y + Math.sin(a) * r, ParticleType.LASER, '#d8b4fe', { life: 8, size: 6, speed: 0 }); });
            }
            break;
        case 'well': // gravity well on you: circle, then a pull burst
            telegraph(state, 'circle', p.x, p.y, { radius: 200, color: INK }, warn, (st, tg) => { telegraphHitPlayer(st, tg, MIRROR_DMG); const q = st.player, wx = tg.x - q.x, wy = tg.y - q.y, d = Math.hypot(wx, wy) || 1; if (d < 420 && q.dashTimer <= 0) { q.vx += (wx / d) * 14; q.vy += (wy / d) * 14; } spawnBigExplosion(st, tg.x, tg.y, { radius: 160, color: '#000000', color2: VOID, rings: 2, life: 45, dark: true }); });
            break;
        case 'whip': // a long lash toward you
            telegraph(state, 'line', boss.x, boss.y, { angle: ang, length: Math.min(900, dist + 200), width: 70, color: '#f472b6' }, warn, (st, tg) => { telegraphHitPlayer(st, tg, MIRROR_DMG + 1); shake(st, 8, 6); });
            break;
        case 'mine': default:
            telegraph(state, 'circle', p.x, p.y, { radius: 130, color: '#000000' }, warn + 20, (st, tg) => { telegraphHitPlayer(st, tg, MIRROR_DMG); spawnExplosion(st, tg.x, tg.y, VOID, ParticleType.VOID); });
    }
    // every cast: a ripple of ink from the boss so you can tell the cast moment even in the dark
    for (let k = 0; k < 8; k++) createParticle(state, boss.x, boss.y, ParticleType.VOID, VOID, { life: 16, size: 8, speed: 5 });
};

export const updateDarkness = (
    state: MutableGameState,
    enemy: Enemy,
    dx: number,
    dy: number,
    onEnemySeen: (id: string) => void
) => {
    const shifting = updateBossKit(state, enemy);
    const phase = enemy.state.phase ?? 1;
    if (!enemy.state.custom) enemy.state.custom = {};
    const c = enemy.state.custom;
    const t = enemy.state.timer;
    const dist = Math.hypot(dx, dy);

    if (shifting) {
        c.nova = undefined;
        if (!c.shiftDone) {
            c.shiftDone = true;
            spawnExplosion(state, enemy.x, enemy.y, VOID, ParticleType.BOSS_AURA);
            heavyShake(state, 12, 16);
            if (phase === 2) { // your shadow steps out of you
                spawnEnemy(state, state.bossSpawnedWave ?? 60, onEnemySeen, state.player.x + 120, state.player.y, BOSS_MINIONS.doppelganger);
                c.nextDoppel = t + DOPPEL_EVERY;
                screenFlash(state, 0.4, VOID);
            }
            if (phase === 3) { // lights out
                state.eclipseColor = '#020006';
                screenFlash(state, 0.8, '#000000');
            }
        }
        return { moveX: 0, moveY: 0, moveSpeed: 0 };
    }
    c.shiftDone = false;

    // ---- P3 lights out: hold the eclipse at full (Renderer handles the dark). ----
    if (phase === 3) state.eclipse = 0.5; // constant mid value = full black in LaserRenderer's curve
    // ---- enrage: the void eats the edge ----
    if (state.bossEnraged && state.arena && state.arena.r > ENRAGE_FLOOR) {
        state.arena.r -= ENRAGE_SHRINK;
        if (state.frame % 8 === 0) { state.arena.pulse = Math.max(state.arena.pulse, 0.3); const a = Math.random() * Math.PI * 2; createParticle(state, state.arena.x + Math.cos(a) * state.arena.r, state.arena.y + Math.sin(a) * state.arena.r, ParticleType.VOID, '#000000', { life: 30, size: 14, speed: 0 }); }
    }

    // ---- passive pull (weak; the dash ignores it) ----
    if (dist > 1 && dist < 1000 && state.player.dashTimer <= 0) { const s = 0.12 + 0.04 * phase; state.player.vx -= (dx / dist) * s; state.player.vy -= (dy / dist) * s; }

    // ---- MIRROR ROTATION ----
    const every = phase === 1 ? 150 : phase === 2 ? 120 : 96;
    const warn = phase === 3 ? 54 : 66;
    if (t % every === 0 && !c.nova) {
        const mirrors = pickMirrors(state.playerStatsRef);
        c.mirrorIdx = ((c.mirrorIdx ?? -1) + 1) % mirrors.length;
        castMirror(state, enemy, mirrors[c.mirrorIdx], warn);
        if (phase >= 2 && mirrors.length > 1) castMirror(state, enemy, mirrors[(c.mirrorIdx + 1) % mirrors.length], warn + 20);
    }

    // ---- P2 doppelganger every 20 s ----
    if (phase === 2 && c.nextDoppel !== undefined && t >= c.nextDoppel) {
        c.nextDoppel = t + DOPPEL_EVERY;
        const a = Math.random() * Math.PI * 2;
        spawnEnemy(state, state.bossSpawnedWave ?? 60, onEnemySeen, state.player.x + Math.cos(a) * 200, state.player.y + Math.sin(a) * 200, BOSS_MINIONS.doppelganger);
        VFX.castShockwave(state, state.player.x, state.player.y, VOID);
    }

    // ---- P3 CONSUMING NOVA: a ring from the boss that covers everything but a 120 px safe disc ----
    if (phase === 3 && t % NOVA_EVERY === 300 && !c.nova) {
        c.nova = { left: NOVA_WARN };
        const a = state.arena;
        const outer = a ? a.r * 1.1 : 1000;
        telegraph(state, 'ring', enemy.x, enemy.y, { radius: outer, innerRadius: NOVA_SAFE, color: WHITE }, NOVA_WARN, (st, tg) => {
            tg.x = enemy.x; tg.y = enemy.y;
            spawnBigExplosion(st, enemy.x, enemy.y, { radius: 500, color: '#000000', color2: WHITE, rings: 3, life: 80, dark: true });
            screenFlash(st, 1, '#000000'); heavyShake(st, 26, 28); hitStop(st, 8);
            if (telegraphHitPlayer(st, tg, NOVA_DMG)) VFX.spark(st, st.player.x, st.player.y, WHITE, 24);
            c.nova = undefined;
        });
    }
    if (c.nova) {
        c.nova.left--;
        // the safe disc is lit so you can find it in the dark
        if (state.frame % 2 === 0) { const a = Math.random() * Math.PI * 2; createParticle(state, enemy.x + Math.cos(a) * NOVA_SAFE, enemy.y + Math.sin(a) * NOVA_SAFE, ParticleType.GLOW, WHITE, { life: 10, size: 6, speed: 0 }); }
        if (c.nova.left % 12 === 0) shake(state, 3 + (NOVA_WARN - c.nova.left) / 15, 6);
        return { moveX: 0, moveY: 0, moveSpeed: 0 };
    }

    // ---- movement: slow approach; it wants you close to the safe disc rhythm ----
    const moveSpeed = dist > 450 ? enemy.speed * 0.5 : dist < 220 ? -enemy.speed * 0.2 : 0;
    return { moveX: dx, moveY: dy, moveSpeed };
};
