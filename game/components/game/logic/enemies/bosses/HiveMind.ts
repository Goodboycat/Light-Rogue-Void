// (2B) THE HIVE MIND — reference implementation on the boss kit (docs/BOSSES.md).
// Every attack is a telegraph first. Damage only happens in onFire.
//
// Phase 1 (100–66 %): slow drift, acid pool on the player every 2.5 s, 3-way acid spit.
// Phase 2 (66–33 %):  3 acid pools in a spread, spit becomes 5-way, telegraphed line dash.
// Phase 3 (<33 %):    5 pools + a closing ring around the boss, faster cadence.
// Passive: gentle gravity pull (kept from the original), regen aura for nearby adds.
// Adds: roaming packs are the kit's job (addTable in bosses.ts); the Hive itself only spits larvae on phase shift.

import { MutableGameState, Enemy, ParticleType } from '../../../types';
import { spawnEnemy } from '../SpawnLogic';
import { spawnExplosion, createParticle } from '../../../Particles';
import { VFX } from '../../../Emitters';
import { updateBossKit, telegraph, telegraphHitPlayer, fireBossProjectile } from '../BossKit';

const ACID = '#a3e635';
const POOL_RADIUS = 110;
const POOL_DMG = 3;
const RING_DMG = 4;
const DASH_DMG = 4;

const acidPool = (state: MutableGameState, x: number, y: number, warn: number) =>
    telegraph(state, 'circle', x, y, { radius: POOL_RADIUS, color: ACID }, warn, (st, t) => {
        telegraphHitPlayer(st, t, POOL_DMG);
        spawnExplosion(st, t.x, t.y, ACID, ParticleType.SMOKE);
        // lingering cloud so the pool reads as "was dangerous" (visual only, 1 dmg projectile, static)
        fireBossProjectile(st, { x: t.x, y: t.y, vx: 0, vy: 0, life: 45, size: POOL_RADIUS * 0.6, color: '#65a30d', damage: 1, visualType: 'TOXIC_CLOUD', isStatic: true });
    });

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

    // Passive: gravity pull (weaker than the original so the arena can be read)
    if (dist < 600 && dist > 1) {
        const strength = 0.12 + phase * 0.03;
        state.player.vx -= (dx / dist) * strength;
        state.player.vy -= (dy / dist) * strength;
    }

    // Passive: regen aura for adds
    if (state.frame % 60 === 0) {
        for (let i = 0; i < state.enemies.length; i++) {
            const e = state.enemies[i];
            if (e !== enemy && !e.isBoss && Math.hypot(e.x - enemy.x, e.y - enemy.y) < 300) {
                e.hp = Math.min(e.maxHp, e.hp + 5);
                createParticle(state, e.x, e.y, ParticleType.HEAL, ACID, { life: 10, size: 2 });
            }
        }
    }

    // --- ACID POOLS (telegraphed circles on / around the player) ---
    const poolEvery = phase === 1 ? 150 : phase === 2 ? 120 : 90;
    const warn = phase === 3 ? 50 : 60;
    if (t % poolEvery === 0) {
        const px = state.player.x, py = state.player.y;
        if (phase === 1) {
            acidPool(state, px, py, warn);
        } else {
            const n = phase === 2 ? 3 : 5;
            const base = Math.random() * Math.PI * 2;
            acidPool(state, px, py, warn);
            for (let k = 1; k < n; k++) {
                const a = base + (k / n) * Math.PI * 2;
                const r = 140 + Math.random() * 60;
                acidPool(state, px + Math.cos(a) * r, py + Math.sin(a) * r, warn + k * 6);
            }
        }
    }

    // --- ACID SPIT (projectiles, aimed; the spread itself is the tell) ---
    const spitEvery = phase === 1 ? 120 : 90;
    if (t % spitEvery === 60) {
        const angle = Math.atan2(dy, dx);
        const ways = phase === 1 ? 3 : 5;
        for (let k = 0; k < ways; k++) {
            const off = (k - (ways - 1) / 2) * 0.28;
            fireBossProjectile(state, {
                x: enemy.x, y: enemy.y,
                vx: Math.cos(angle + off) * 6, vy: Math.sin(angle + off) * 6,
                life: 120, size: 10, color: ACID, damage: 1, visualType: 'TOXIC_CLOUD',
            });
        }
    }

    // --- DASH (phase 2+): telegraphed line, then lunge along it ---
    if (phase >= 2 && t % 300 === 200) {
        const angle = Math.atan2(dy, dx);
        const len = Math.min(700, dist + 120);
        c.dashAngle = angle;
        telegraph(state, 'line', enemy.x, enemy.y, { angle, length: len, width: enemy.size * 1.6, color: '#ca8a04' }, 45, (st, tg) => {
            enemy.vx = Math.cos(tg.params.angle!) * 16;
            enemy.vy = Math.sin(tg.params.angle!) * 16;
            VFX.castShockwave(st, enemy.x, enemy.y, '#ca8a04');
            // the line hurts anyone standing on it when the lunge begins
            telegraphHitPlayer(st, tg, DASH_DMG);
        });
    }

    // --- CLOSING RING (phase 3): safe inside the inner radius, danger in the band ---
    if (phase === 3 && t % 360 === 300) {
        telegraph(state, 'ring', enemy.x, enemy.y, { radius: 420, innerRadius: 180, color: '#65a30d' }, 80, (st, tg) => {
            telegraphHitPlayer(st, tg, RING_DMG);
            for (let k = 0; k < 16; k++) {
                const a = (k / 16) * Math.PI * 2;
                fireBossProjectile(st, { x: tg.x + Math.cos(a) * 180, y: tg.y + Math.sin(a) * 180, vx: Math.cos(a) * 4, vy: Math.sin(a) * 4, life: 70, size: 24, color: '#65a30d', damage: 1, visualType: 'TOXIC_CLOUD' });
            }
        });
    }

    // Movement: slow drift toward the player; stops when close so pools do the work
    const moveSpeed = dist > 260 ? enemy.speed * (0.5 + phase * 0.1) : 0;
    return { moveX: dx, moveY: dy, moveSpeed };
};
