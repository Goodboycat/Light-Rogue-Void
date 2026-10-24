import { MutableGameState, Enemy, ParticleType } from '../../../types';
import { spawnEnemy } from '../SpawnLogic';
import { spawnExplosion, createParticle } from '../../../Particles';
import { VFX } from '../../../Emitters';
import { audio } from '../../../audio';
import { 
    telegraph, 
    checkBossPhaseShift, 
    updateBossKitState, 
    spawnBossProjectile, 
    countLiveBossProjectiles 
} from '../BossKit';

export const HIVE_MIND_CONFIG = {
    baseHp: 2000,
    gravityPullStrength: 0.08,
    gravityRadius: 600,
    minionCap: 4,
    minionHealPerSec: 2,
    inhaleIntervalFrames: 840, // 14 s
    exposedDurationFrames: 240, // 4 s
};

export const updateHiveMind = (
    state: MutableGameState, 
    enemy: Enemy, 
    dx: number, 
    dy: number, 
    onEnemySeen: (id: string) => void
) => {
    let moveX = dx;
    let moveY = dy;
    let moveSpeed = enemy.speed * 0.4;

    const timer = enemy.state.timer;
    const isExposed = (enemy.state.custom?.exposedTimer || 0) > 0;
    const isPhaseShift = (enemy.state.custom?.phaseShiftTimer || 0) > 0;

    // 0. UPDATE BOSS KIT STATE & PHASE MANAGERS
    updateBossKitState(state, enemy);

    const phases = [
        { hpPct: 0.65 },
        { hpPct: 0.30 }
    ];
    checkBossPhaseShift(state, enemy, phases);

    const phase = enemy.state.phase || 1;

    // If in phase shift or exposed: skip movement and attacks
    if (isPhaseShift) {
        return { moveX: 0, moveY: 0, moveSpeed: 0 };
    }

    if (isExposed) {
        // Pulsing weak point visual
        if (state.frame % 5 === 0) {
            VFX.spark(state, enemy.x, enemy.y, '#f59e0b', 4);
            spawnExplosion(state, enemy.x, enemy.y, '#fbbf24', ParticleType.RING);
        }
        return { moveX: 0, moveY: 0, moveSpeed: 0 };
    }

    // 1. GRAVITY PULL (only outside exposed/phase shift, <= 0.08)
    const dist = Math.hypot(dx, dy);
    if (dist < HIVE_MIND_CONFIG.gravityRadius && dist > 1) {
        state.player.vx -= (dx / dist) * HIVE_MIND_CONFIG.gravityPullStrength;
        state.player.vy -= (dy / dist) * HIVE_MIND_CONFIG.gravityPullStrength;
    }

    // 2. HOMING MISSILES (phase-capped)
    const maxMissiles = phase === 1 ? 2 : phase === 2 ? 3 : 4;
    const missileInterval = phase === 3 ? 60 : 75;
    const missileSpeedCap = phase === 3 ? 3.8 : 3.4;

    if (timer % missileInterval === 0) {
        const currentBossMissiles = countLiveBossProjectiles(state, 'hive_mind');
        if (currentBossMissiles < maxMissiles) {
            const angle = Math.random() * Math.PI * 2;
            const radius = 750;
            const sx = state.player.x + Math.cos(angle) * radius;
            const sy = state.player.y + Math.sin(angle) * radius;
            const aimAngle = Math.atan2(state.player.y - sy, state.player.x - sx);

            spawnBossProjectile(state, {
                x: sx,
                y: sy,
                vx: Math.cos(aimAngle) * 3,
                vy: Math.sin(aimAngle) * 3,
                life: 300,
                size: 14,
                color: '#a3e635',
                damage: 1,
                isEnemy: true,
                visualType: 'HOMING_MISSILE',
                customData: {
                    speedCap: missileSpeedCap,
                    isDestructible: true,
                    isBossProj: true,
                    bossId: 'hive_mind',
                    dropRewardsInP3: phase === 3
                }
            }, 'hive_mind', maxMissiles);
        }
    }

    // 3. ACID SPIT (3-way) with 0.6 s (36 frames) telegraph
    if (timer % 150 === 0) {
        const angle = Math.atan2(dy, dx);
        telegraph(state, 'cone', enemy.x, enemy.y, {
            radius: 350,
            angle,
            fov: Math.PI / 4,
            color: '#ca8a04'
        }, 36, () => {
            if (enemy.hp <= 0) return;
            for (let k = -1; k <= 1; k++) {
                spawnBossProjectile(state, {
                    x: enemy.x,
                    y: enemy.y,
                    vx: Math.cos(angle + k * 0.25) * 6,
                    vy: Math.sin(angle + k * 0.25) * 6,
                    life: 120,
                    size: 10,
                    color: '#a3e635',
                    damage: 1,
                    isEnemy: true,
                    visualType: 'TOXIC_CLOUD'
                }, 'hive_mind', 16);
            }
        });
    }

    // 4. LARVAE MINIONS (P1 & P2 only, max 4 alive minions total)
    if ((phase === 1 || phase === 2) && timer % 320 === 0) {
        let liveMinions = 0;
        for (let i = 0; i < state.enemies.length; i++) {
            const e = state.enemies[i];
            if (!e.isBoss && Math.hypot(e.x - enemy.x, e.y - enemy.y) < 1200) {
                liveMinions++;
            }
        }
        if (liveMinions < HIVE_MIND_CONFIG.minionCap) {
            spawnExplosion(state, enemy.x, enemy.y, '#ca8a04', ParticleType.SMOKE);
            const spawnCount = Math.min(2, HIVE_MIND_CONFIG.minionCap - liveMinions);
            for (let k = 0; k < spawnCount; k++) {
                spawnEnemy(state, 1, onEnemySeen, enemy.x + (Math.random() - 0.5) * 60, enemy.y + (Math.random() - 0.5) * 60);
            }
        }
    }

    // 5. PHASE 2+: INHALE / EXPOSED WINDOW (every 14 s) & POISON BURST
    if (phase >= 2) {
        if (timer % HIVE_MIND_CONFIG.inhaleIntervalFrames === 0) {
            enemy.state.custom = enemy.state.custom || {};
            enemy.state.custom.exposedTimer = HIVE_MIND_CONFIG.exposedDurationFrames; // 4.0 s
            VFX.castShockwave(state, enemy.x, enemy.y, '#f59e0b');
            try {
                if (audio && typeof audio.playLevelUp === 'function') audio.playLevelUp();
            } catch (e) {}
        }

        if (timer % 600 === 0) {
            telegraph(state, 'ring', enemy.x, enemy.y, {
                innerRadius: 40,
                radius: 250,
                color: '#65a30d'
            }, 60, () => {
                if (enemy.hp <= 0) return;
                for (let k = 0; k < 12; k++) {
                    const a = (k / 12) * Math.PI * 2;
                    spawnBossProjectile(state, {
                        x: enemy.x,
                        y: enemy.y,
                        vx: Math.cos(a) * 4,
                        vy: Math.sin(a) * 4,
                        life: 100,
                        size: 120,
                        color: '#65a30d',
                        damage: 1,
                        isEnemy: true,
                        visualType: 'TOXIC_CLOUD'
                    }, 'hive_mind', 16);
                }
            });
        }
    }

    // 6. PHASE 3: DASH CHARGES with 0.7 s (42 frames) line telegraph
    if (phase === 3 && timer % 300 === 250) {
        const angle = Math.atan2(dy, dx);
        telegraph(state, 'line', enemy.x, enemy.y, {
            length: 450,
            width: 80,
            angle,
            color: '#ca8a04'
        }, 42, () => {
            if (enemy.hp <= 0) return;
            enemy.vx = Math.cos(angle) * 16;
            enemy.vy = Math.sin(angle) * 16;
            VFX.castShockwave(state, enemy.x, enemy.y, '#ca8a04');
        });
    }

    // 7. MINION REGEN (2 HP/s = 2 HP per 60 frames, max 4 minions)
    if (state.frame % 60 === 0) {
        for (let i = 0; i < state.enemies.length; i++) {
            const e = state.enemies[i];
            if (e !== enemy && !e.isBoss && Math.hypot(e.x - enemy.x, e.y - enemy.y) < 300) {
                e.hp = Math.min(e.maxHp, e.hp + HIVE_MIND_CONFIG.minionHealPerSec);
                createParticle(state, e.x, e.y, ParticleType.HEAL, '#a3e635', { life: 10, size: 2 });
            }
        }
    }

    return { moveX, moveY, moveSpeed };
};
