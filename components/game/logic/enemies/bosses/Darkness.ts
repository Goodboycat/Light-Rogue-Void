import { MutableGameState, Enemy, ParticleType } from '../../../types';
import { spawnEnemy } from '../SpawnLogic';
import { VFX } from '../../../Emitters';
import { spawnExplosion, createParticle } from '../../../Particles';
import { 
    checkBossPhaseShift, 
    updateBossKitState, 
    telegraph, 
    spawnBossProjectile,
    BossPhaseDef
} from '../BossKit';

export const DARKNESS_CONFIG = {
    maxLiveBossProjectiles: 18,
    p2BlackHoleRadius: 220,
    p2BlackHoleBuildFrames: 60, // 1.0 s circle telegraph
    exposedWindowFrames: 180    // 3.0 s exposed window after Void Nova / Light breaks through
};

const PHASES: BossPhaseDef[] = [
    { hpPct: 0.50 } // Phase 2 at 50% HP
];

export const updateDarkness = (
    state: MutableGameState, 
    enemy: Enemy, 
    dx: number, 
    dy: number, 
    onEnemySeen: (id: string) => void
) => {
    let moveX = dx;
    let moveY = dy;
    let moveSpeed = enemy.speed * 0.8;

    if (!enemy.state.custom) enemy.state.custom = {};
    const custom = enemy.state.custom;

    // Check Phase Shift & update BossKit state
    checkBossPhaseShift(state, enemy, PHASES);
    updateBossKitState(state, enemy);

    const phase = enemy.state.phase || 1;

    // --- PASSIVE: HP REGENERATION (Nullified by 2 Vault Keys) ---
    const isCinematic = !!(custom.cinematicMode || state.activeBoss?.state?.custom?.cinematicMode);
    const isRegenNullified = !!state.darknessRegenNullified || (state.map6KeysCollected || 0) >= 2 || (state.specialMissionKeys || 0) >= 2;
    if (!isCinematic && !isRegenNullified && enemy.hp > 0 && enemy.hp < enemy.maxHp) {
        enemy.hp = Math.min(enemy.maxHp, enemy.hp + (300 / 60)); // 300 HP/sec
        
        if (state.frame % 30 === 0) {
            createParticle(state, enemy.x + (Math.random() - 0.5) * enemy.size, enemy.y + (Math.random() - 0.5) * enemy.size, ParticleType.GLOW, '#a855f7', { life: 20, size: 4, speed: 0.5 });
        }
    }

    // --- PHASE 2 TRANSITION CINEMATIC (SKIPPED ON RETRIES) ---
    if (phase === 2 && !custom.p2TransitionDone) {
        custom.p2TransitionDone = true;

        const isRetry = (state.bossFailedAttemptsSession?.['darkness'] || 0) > 0 || (state.seenBossIntros || []).includes('darkness_p2');

        if (!isRetry) {
            // First time: run full Phase 2 cinematic
            custom.cinematicMode = true;
            custom.cinematicTimer = 240; // 4 seconds freeze
            custom.shout = "YOUR INFANT LIGHT SICKENS ME, SPARK.";
            enemy.projectileImmunity = 240;
            if (state.seenBossIntros && !state.seenBossIntros.includes('darkness_p2')) {
                state.seenBossIntros.push('darkness_p2');
            }
            spawnExplosion(state, enemy.x, enemy.y, '#9333ea', ParticleType.BOSS_AURA);
            return { moveX: 0, moveY: 0, moveSpeed: 0 };
        } else {
            // Retry: skip cinematic freeze, immediate seamless phase 2
            spawnExplosion(state, enemy.x, enemy.y, '#9333ea', ParticleType.BOSS_AURA);
            VFX.castShockwave(state, enemy.x, enemy.y, '#9333ea');
        }
    }

    if (custom.cinematicMode) {
        if (custom.cinematicTimer && custom.cinematicTimer > 0) {
            custom.cinematicTimer--;
            return { moveX: 0, moveY: 0, moveSpeed: 0 };
        } else {
            custom.cinematicMode = false;
        }
    }

    // --- FINAL 10% HP: "LIGHT BREAKS THROUGH!" ---
    const hpPct = enemy.hp / enemy.maxHp;
    if (hpPct <= 0.10 && !custom.lightBreaksThrough) {
        custom.lightBreaksThrough = true;
        custom.exposedTimer = DARKNESS_CONFIG.exposedWindowFrames;
        state.edgeFlash = { color: '#fbbf24', timer: 30 }; // Bright white/gold screen flash
        VFX.castShockwave(state, enemy.x, enemy.y, '#fbbf24');
        custom.shout = "⚡ LIGHT BREAKS THROUGH! ⚡";
    }

    // --- 1. FIRE BLAST SWARM (WITH CONE TELEGRAPH) ---
    if (state.frame % 90 === 0) {
        const aimAngle = Math.atan2(dy, dx);
        const count = phase >= 2 ? 12 : 8;
        telegraph(
            state,
            'cone',
            enemy.x,
            enemy.y,
            {
                radius: 360,
                angle: aimAngle,
                arcAngle: 1.6,
                color: '#a855f7'
            },
            36, // 0.6 s cone warning
            () => {
                for (let k = 0; k < count; k++) {
                    const angle = aimAngle + (Math.random() - 0.5) * 1.5;
                    spawnBossProjectile(
                        state,
                        {
                            x: enemy.x,
                            y: enemy.y,
                            vx: Math.cos(angle) * 8,
                            vy: Math.sin(angle) * 8,
                            life: 150,
                            size: 10,
                            color: '#7e22ce',
                            damage: 2,
                            visualType: 'FIRE_BLAST'
                        },
                        'darkness',
                        DARKNESS_CONFIG.maxLiveBossProjectiles
                    );
                }
            }
        );
    }

    // --- 2. SUMMON MINIONS ---
    if (state.frame % 320 === 0) {
        for (let k = 0; k < 3; k++) {
            spawnEnemy(
                state,
                50,
                onEnemySeen,
                enemy.x + (Math.random() - 0.5) * 200,
                enemy.y + (Math.random() - 0.5) * 200
            );
        }
    }

    // --- 3. PHASE 2: SINGLE BLACK HOLE MECHANIC (MAX 1 AT A TIME WITH VISIBLE RADIUS) ---
    if (phase >= 2) {
        // Count active black holes
        let activeBlackHoles = 0;
        for (let i = 0; i < state.projectiles.length; i++) {
            if (state.projectiles[i].customData?.isSingleBlackHole) {
                activeBlackHoles++;
            }
        }

        if (activeBlackHoles === 0 && state.frame % 180 === 0) {
            const holeX = state.player.x;
            const holeY = state.player.y;

            // 1.0 s Circle Telegraph (60 frames) with visible radius
            telegraph(
                state,
                'circle',
                holeX,
                holeY,
                {
                    radius: DARKNESS_CONFIG.p2BlackHoleRadius,
                    color: '#7e22ce'
                },
                DARKNESS_CONFIG.p2BlackHoleBuildFrames,
                () => {
                    // Spawn single black hole
                    spawnBossProjectile(
                        state,
                        {
                            x: holeX,
                            y: holeY,
                            vx: 0,
                            vy: 0,
                            life: 300, // 5 s duration
                            size: DARKNESS_CONFIG.p2BlackHoleRadius,
                            color: '#1e1b4b',
                            damage: 2,
                            isStatic: true,
                            visualType: 'BOSS_SINGULARITY',
                            customData: { isSingleBlackHole: true }
                        },
                        'darkness',
                        DARKNESS_CONFIG.maxLiveBossProjectiles
                    );
                    VFX.castShockwave(state, holeX, holeY, '#7e22ce');
                }
            );
        }
    }

    // --- 4. PHASE 2: VOID NOVA ULTIMATE ---
    if (phase >= 2) {
        if (custom.novaTimer === undefined) custom.novaTimer = 500;
        custom.novaTimer--;

        if (custom.novaTimer === 240) {
            telegraph(
                state,
                'ring',
                enemy.x,
                enemy.y,
                {
                    radius: 900,
                    innerRadius: 200,
                    color: '#9333ea'
                },
                240
            );
        }

        if (custom.novaTimer < 240) {
            moveX = 0; moveY = 0; moveSpeed = 0;
            VFX.castVoidNovaCharge(state, enemy.x, enemy.y, 1 - (custom.novaTimer / 240));

            if (custom.novaTimer === 0) {
                // The Boom with finite 60 frame lifetime
                spawnBossProjectile(
                    state,
                    {
                        x: enemy.x,
                        y: enemy.y,
                        vx: 0,
                        vy: 0,
                        life: 60,
                        size: 900,
                        color: '#000',
                        damage: 999,
                        isStatic: true,
                        visualType: 'VOID_NOVA'
                    },
                    'darkness',
                    DARKNESS_CONFIG.maxLiveBossProjectiles
                );

                custom.exposedTimer = DARKNESS_CONFIG.exposedWindowFrames; // 3.0 s exposed window after Nova
                custom.novaTimer = 800; // Reset nova timer
            }
        }
    }

    return { moveX, moveY, moveSpeed };
};
