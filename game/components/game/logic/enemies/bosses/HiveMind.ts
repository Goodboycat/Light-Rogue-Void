// (2C) THE HIVE MIND — wave 10. Reference implementation on the boss kit (docs/BOSSES.md).
// Every attack is a telegraph first. Damage only happens in onFire.
//
// Phase 1 (100–66 %): 3 BROOD NODES rooted around the arena (each spawns larvae; kill one = one fewer source),
//                     acid pool on the player, 3-way acid spit.
// Phase 2 (66–33 %):  EXPANDING ACID RINGS from the boss with ONE safe gap (stand in the gap or dash through the band),
//                     5-way spit, telegraphed line dash.
// Phase 3 (<33 %):    the Hive PULLS ITSELF onto the player (telegraphed landing circle) and spits an acid CONE,
//                     closing ring, faster cadence.
// Enrage: nodes respawn (all 3), everything faster via the kit.
// Hazard (bosses.ts): acid pools accumulate on the floor for the whole fight.
// Learnable: the ring gap always opens on the side the boss is facing (its colour-flash points at it).

import { MutableGameState, Enemy, ParticleType } from '../../../types';
import { spawnEnemy } from '../SpawnLogic';
import { spawnExplosion, createParticle } from '../../../Particles';
import { VFX } from '../../../Emitters';
import { shake, hitStop } from '../../../Feel';
import { BOSS_MINIONS } from '../../../../../bosses';
import { updateBossKit, telegraph, telegraphHitPlayer, fireBossProjectile } from '../BossKit';

const ACID = '#a3e635';
const ACID_DARK = '#65a30d';
const POOL_RADIUS = 110;
const POOL_DMG = 3;
const RING_DMG = 4;
const DASH_DMG = 4;
const CONE_DMG = 4;
const LEAP_DMG = 5;
const NODE_COUNT = 3;
const NODE_RING = 520;          // distance from arena centre where nodes root
const RING_COUNT = 3;           // expanding rings per volley
const RING_BAND = 90;           // band thickness
const RING_GAP = Math.PI / 3;   // 60° safe gap

const acidPool = (state: MutableGameState, x: number, y: number, warn: number) =>
    telegraph(state, 'circle', x, y, { radius: POOL_RADIUS, color: ACID }, warn, (st, t) => {
        telegraphHitPlayer(st, t, POOL_DMG);
        spawnExplosion(st, t.x, t.y, ACID, ParticleType.SMOKE);
        fireBossProjectile(st, { x: t.x, y: t.y, vx: 0, vy: 0, life: 45, size: POOL_RADIUS * 0.6, color: ACID_DARK, damage: 1, visualType: 'TOXIC_CLOUD', isStatic: true });
    });

/** Root NODE_COUNT brood nodes around the arena centre (or the boss). Stationary spawners. */
const plantNodes = (state: MutableGameState, boss: Enemy, onEnemySeen: (id: string) => void) => {
    const cx = state.arena?.x ?? boss.x, cy = state.arena?.y ?? boss.y;
    const base = Math.random() * Math.PI * 2;
    for (let k = 0; k < NODE_COUNT; k++) {
        const a = base + (k / NODE_COUNT) * Math.PI * 2;
        const x = cx + Math.cos(a) * NODE_RING, y = cy + Math.sin(a) * NODE_RING;
        telegraph(state, 'circle', x, y, { radius: 60, color: ACID_DARK }, 50, (st) => {
            spawnEnemy(st, st.bossSpawnedWave ?? 10, onEnemySeen, x, y, BOSS_MINIONS.hive_node);
            spawnExplosion(st, x, y, ACID, ParticleType.SMOKE);
        });
    }
};

const nodesAlive = (state: MutableGameState): number => {
    let n = 0;
    for (let i = 0; i < state.enemies.length; i++) if (state.enemies[i].def.id === 'hive_node') n++;
    return n;
};

export const updateHiveMind = (
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
    const facing = Math.atan2(dy, dx);

    // --- one-shots -------------------------------------------------------
    if (!c.nodesPlanted) { c.nodesPlanted = true; plantNodes(state, enemy, onEnemySeen); }
    if (c.enraged && !c.enrageNodes) { c.enrageNodes = true; plantNodes(state, enemy, onEnemySeen); }

    // Phase shift: stand still, burp 3 larvae once
    if (shifting) {
        if (!c.shiftLarvae) {
            c.shiftLarvae = true;
            spawnExplosion(state, enemy.x, enemy.y, '#ca8a04', ParticleType.SMOKE);
            for (let k = 0; k < 3; k++) spawnEnemy(state, 1, onEnemySeen, enemy.x + (Math.random() - 0.5) * 60, enemy.y + (Math.random() - 0.5) * 60);
        }
        return { moveX: 0, moveY: 0, moveSpeed: 0 };
    }
    c.shiftLarvae = false;

    // Leap in flight (P3): the boss is airborne, nothing else fires
    if (c.leapTimer > 0) {
        c.leapTimer--;
        const k = 1 - c.leapTimer / c.leapTotal;
        enemy.x = c.leapFromX + (c.leapToX - c.leapFromX) * k;
        enemy.y = c.leapFromY + (c.leapToY - c.leapFromY) * k;
        enemy.opacity = 0.35 + 0.65 * Math.abs(Math.cos(k * Math.PI)); // "jumps" up and comes down
        if (state.frame % 3 === 0) createParticle(state, enemy.x, enemy.y, ParticleType.SMOKE, ACID_DARK, { life: 20, size: 8 });
        return { moveX: 0, moveY: 0, moveSpeed: 0 };
    }
    enemy.opacity = 1;

    // --- passives --------------------------------------------------------
    if (dist < 600 && dist > 1 && phase < 3) { // P3 replaces the pull with the leap
        const strength = 0.12 + phase * 0.03;
        state.player.vx -= (dx / dist) * strength;
        state.player.vy -= (dy / dist) * strength;
    }
    if (state.frame % 60 === 0) { // regen aura for adds
        for (let i = 0; i < state.enemies.length; i++) {
            const e = state.enemies[i];
            if (e !== enemy && !e.isBoss && Math.hypot(e.x - enemy.x, e.y - enemy.y) < 300) {
                e.hp = Math.min(e.maxHp, e.hp + 5);
                createParticle(state, e.x, e.y, ParticleType.HEAL, ACID, { life: 10, size: 2 });
            }
        }
    }

    // --- ACID POOLS (all phases; fewer when nodes are up so P1 reads as "kill the nodes") ---
    const poolEvery = phase === 1 ? 150 : phase === 2 ? 130 : 90;
    const warn = phase === 3 ? 50 : 60;
    if (t % poolEvery === 0) {
        const px = state.player.x, py = state.player.y;
        acidPool(state, px, py, warn);
        if (phase === 3) {
            const base = Math.random() * Math.PI * 2;
            for (let k = 1; k < 4; k++) {
                const a = base + (k / 4) * Math.PI * 2, r = 150 + Math.random() * 50;
                acidPool(state, px + Math.cos(a) * r, py + Math.sin(a) * r, warn + k * 6);
            }
        }
    }

    // --- ACID SPIT (projectiles; the spread is the tell; Fire Blast breaks them) ---
    const spitEvery = phase === 1 ? 120 : 90;
    if (t % spitEvery === 60) {
        const ways = phase === 1 ? 3 : 5;
        for (let k = 0; k < ways; k++) {
            const off = (k - (ways - 1) / 2) * 0.28;
            fireBossProjectile(state, {
                x: enemy.x, y: enemy.y,
                vx: Math.cos(facing + off) * 6, vy: Math.sin(facing + off) * 6,
                life: 120, size: 10, color: ACID, damage: 1, visualType: 'TOXIC_CLOUD',
            });
        }
    }

    // --- P2: EXPANDING ACID RINGS with one safe gap (gap = the side the boss faces) ---
    if (phase === 2 && t % 330 === 120) {
        const gap = facing;
        VFX.castShockwave(state, enemy.x, enemy.y, ACID);
        for (let k = 0; k < RING_COUNT; k++) {
            const inner = 160 + k * 190;
            telegraph(state, 'ring', enemy.x, enemy.y,
                { radius: inner + RING_BAND, innerRadius: inner, gapAngle: gap, gapWidth: RING_GAP - k * 0.15, color: ACID_DARK },
                70 + k * 28, (st, tg) => {
                    if (telegraphHitPlayer(st, tg, RING_DMG)) VFX.spark(st, st.player.x, st.player.y, ACID, 10);
                    shake(st, 5, 5);
                    for (let m = 0; m < 24; m++) {
                        const a = (m / 24) * Math.PI * 2, r = tg.params.innerRadius! + RING_BAND / 2;
                        createParticle(st, tg.x + Math.cos(a) * r, tg.y + Math.sin(a) * r, ParticleType.SMOKE, ACID, { life: 25, size: 10, speed: 1 });
                    }
                });
        }
    }

    // --- P2+: LINE DASH (telegraphed line, then lunge along it) ---
    if (phase >= 2 && t % 300 === 240) {
        const len = Math.min(700, dist + 120);
        telegraph(state, 'line', enemy.x, enemy.y, { angle: facing, length: len, width: enemy.size * 1.6, color: '#ca8a04' }, 45, (st, tg) => {
            enemy.vx = Math.cos(tg.params.angle!) * 16;
            enemy.vy = Math.sin(tg.params.angle!) * 16;
            VFX.castShockwave(st, enemy.x, enemy.y, '#ca8a04');
            telegraphHitPlayer(st, tg, DASH_DMG);
        });
    }

    // --- P3: LEAP onto the player (landing circle), then CONE spit on landing ---
    if (phase === 3 && t % 270 === 30 && dist > 120) {
        const lx = state.player.x + state.player.vx * 20, ly = state.player.y + state.player.vy * 20; // lead the player
        c.leapTarget = { x: lx, y: ly };
        VFX.castShockwave(state, enemy.x, enemy.y, ACID_DARK);
        telegraph(state, 'circle', lx, ly, { radius: enemy.size * 2.2, color: '#ca8a04' }, 55, (st, tg) => {
            // take off: the landing itself happens LEAP frames later (hits anyone under the shadow then)
            c.leapTotal = 26; c.leapTimer = 26;
            c.leapFromX = enemy.x; c.leapFromY = enemy.y; c.leapToX = tg.x; c.leapToY = tg.y;
            telegraph(st, 'circle', tg.x, tg.y, { radius: enemy.size * 2.2, color: ACID }, 26, (s2, t2) => {
                telegraphHitPlayer(s2, t2, LEAP_DMG);
                shake(s2, 14, 10); hitStop(s2, 3);
                spawnExplosion(s2, t2.x, t2.y, ACID, ParticleType.SMOKE);
                VFX.castShockwave(s2, t2.x, t2.y, ACID);
                // cone spit in the direction of the player right after landing
                const a = Math.atan2(s2.player.y - t2.y, s2.player.x - t2.x);
                telegraph(s2, 'cone', t2.x, t2.y, { angle: a, fov: Math.PI / 3, radius: 420, color: ACID_DARK }, 40, (s3, t3) => {
                    telegraphHitPlayer(s3, t3, CONE_DMG);
                    for (let m = 0; m < 9; m++) {
                        const o = (m - 4) * (Math.PI / 3) / 9;
                        fireBossProjectile(s3, { x: t3.x, y: t3.y, vx: Math.cos(a + o) * 7, vy: Math.sin(a + o) * 7, life: 60, size: 12, color: ACID, damage: 1, visualType: 'TOXIC_CLOUD' });
                    }
                });
            });
        });
    }

    // --- P3: CLOSING RING (safe inside the inner radius) ---
    if (phase === 3 && t % 360 === 300) {
        telegraph(state, 'ring', enemy.x, enemy.y, { radius: 420, innerRadius: 180, color: ACID_DARK }, 80, (st, tg) => {
            telegraphHitPlayer(st, tg, RING_DMG);
            for (let k = 0; k < 16; k++) {
                const a = (k / 16) * Math.PI * 2;
                fireBossProjectile(st, { x: tg.x + Math.cos(a) * 180, y: tg.y + Math.sin(a) * 180, vx: Math.cos(a) * 4, vy: Math.sin(a) * 4, life: 70, size: 24, color: ACID_DARK, damage: 1, visualType: 'TOXIC_CLOUD' });
            }
        });
    }

    // Movement: P1 hugs its nodes (slow), P2 holds range so rings matter, P3 only leaps.
    let moveSpeed = 0;
    if (phase === 1) moveSpeed = dist > 260 ? enemy.speed * 0.6 : 0;
    else if (phase === 2) moveSpeed = dist > 380 ? enemy.speed * 0.7 : dist < 220 ? -enemy.speed * 0.5 : 0;
    // store for the HUD/renderer: nodes alive count (P1 reads "kill the nodes")
    c.nodesAlive = nodesAlive(state);
    return { moveX: dx, moveY: dy, moveSpeed };
};
