import { MutableGameState, Enemy, ParticleType } from '../../../types';
import { spawnExplosion } from '../../../Particles';
import { VFX } from '../../../Emitters';
import { 
    checkBossPhaseShift, 
    updateBossKitState, 
    telegraph, 
    spawnBossProjectile,
    BossPhaseDef
} from '../BossKit';

export const ENTROPY_TITAN_CONFIG = {
    maxLiveBossProjectiles: 16,
    slamShadowTelegraphFrames: 60, // 1.0 s shadow telegraph
    p2SweepTelegraphFrames: 60,    // 1.0 s line telegraph
    p3ChainSlamTelegraphFrames: 36,// 0.6 s rapid shadow telegraph
    p3ExposedRecoveryFrames: 60    // 1.0 s exposed recovery
};

const PHASES: BossPhaseDef[] = [
    { hpPct: 0.60 }, // Phase 2 at 60% HP
    { hpPct: 0.30 }  // Phase 3 at 30% HP
];

export const updateEntropyTitan = (
    state: MutableGameState, 
    enemy: Enemy, 
    dx: number, 
    dy: number, 
    onEnemySeen: (id: string) => void
) => {
    let moveX = dx;
    let moveY = dy;
    let moveSpeed = enemy.speed * 0.7; // Heavy titan movement

    if (!enemy.state.custom) enemy.state.custom = {};
    const custom = enemy.state.custom;

    // Check Phase Shift & update BossKit state
    checkBossPhaseShift(state, enemy, PHASES);
    updateBossKitState(state, enemy);

    const phase = enemy.state.phase || 1;
    const isPhaseShifting = (custom.phaseShiftTimer || 0) > 0;

    if (isPhaseShifting) {
        return { moveX: 0, moveY: 0, moveSpeed: 0 };
    }

    // Initialize custom variables
    if (custom.slamTimer === undefined) custom.slamTimer = 0;
    if (custom.sweepTimer === undefined) custom.sweepTimer = 0;
    if (custom.chainSlamCount === undefined) custom.chainSlamCount = 0;

    const isExposed = (custom.exposedTimer || 0) > 0;
    if (isExposed) {
        return { moveX: 0, moveY: 0, moveSpeed: 0 };
    }

    // Helper to spawn a slam shockwave with a DASH-ABLE GAP
    const executeSlamShockwave = (slamX: number, slamY: number) => {
        spawnExplosion(state, slamX, slamY, '#84cc16', ParticleType.BOSS_AURA);
        VFX.castShockwave(state, slamX, slamY, '#84cc16');

        // Shockwave ring with a 60-degree DASH-ABLE GAP
        const totalCount = 20;
        const gapStartIndex = Math.floor(Math.random() * totalCount);
        const gapSize = 3; // 3 projectiles skipped = ~60 degree gap

        for (let k = 0; k < totalCount; k++) {
            if (k >= gapStartIndex && k < gapStartIndex + gapSize) {
                continue; // DASH-ABLE GAP
            }
            const angle = (k / totalCount) * Math.PI * 2;
            spawnBossProjectile(
                state,
                {
                    x: slamX,
                    y: slamY,
                    vx: Math.cos(angle) * 7,
                    vy: Math.sin(angle) * 7,
                    life: 140,
                    size: 18,
                    color: '#65a30d',
                    damage: 2,
                    visualType: 'DEFAULT'
                },
                'entropy_titan',
                ENTROPY_TITAN_CONFIG.maxLiveBossProjectiles
            );
        }
    };

    // --- PHASE 1 & 2: TITAN SLAM WITH 1.0 S SHADOW TELEGRAPH ---
    if (phase < 3) {
        custom.slamTimer++;
        if (custom.slamTimer >= 220) {
            custom.slamTimer = 0;

            const slamX = state.player.x;
            const slamY = state.player.y;

            // 1.0 s Shadow Telegraph (60 frames)
            telegraph(
                state,
                'circle',
                slamX,
                slamY,
                {
                    radius: 120,
                    color: '#84cc16'
                },
                ENTROPY_TITAN_CONFIG.slamShadowTelegraphFrames,
                () => executeSlamShockwave(slamX, slamY)
            );
        }
    }

    // --- PHASE 2 & 3: ARM SWEEP ACROSS TELEGRAPHED LINE ---
    if (phase >= 2) {
        custom.sweepTimer++;
        if (custom.sweepTimer >= 260) {
            custom.sweepTimer = 0;

            const sweepAngle = Math.atan2(dy, dx);

            // 1.0 s Line Telegraph (60 frames)
            telegraph(
                state,
                'line',
                enemy.x,
                enemy.y,
                {
                    width: 90,
                    length: 1000,
                    angle: sweepAngle,
                    color: '#bef264'
                },
                ENTROPY_TITAN_CONFIG.p2SweepTelegraphFrames,
                () => {
                    // Arm sweep wave
                    const perpAngle = sweepAngle + Math.PI / 2;
                    for (let s = -4; s <= 4; s++) {
                        const sx = enemy.x + Math.cos(perpAngle) * (s * 80);
                        const sy = enemy.y + Math.sin(perpAngle) * (s * 80);

                        spawnBossProjectile(
                            state,
                            {
                                x: sx,
                                y: sy,
                                vx: Math.cos(sweepAngle) * 11,
                                vy: Math.sin(sweepAngle) * 11,
                                life: 120,
                                size: 22,
                                color: '#bef264',
                                damage: 2,
                                visualType: 'DEFAULT'
                            },
                            'entropy_titan',
                            ENTROPY_TITAN_CONFIG.maxLiveBossProjectiles
                        );
                    }
                    VFX.castShockwave(state, enemy.x, enemy.y, '#bef264');
                }
            );
        }
    }

    // --- PHASE 3: ENRAGE SLAM CHAINS OF 3 + 1.0 S EXPOSED RECOVERY ---
    if (phase >= 3) {
        custom.slamTimer++;
        if (custom.slamTimer >= 180) {
            custom.slamTimer = 0;

            // Chain of 3 rapid slams
            const triggerChainSlam = (count: number) => {
                const slamX = state.player.x;
                const slamY = state.player.y;

                telegraph(
                    state,
                    'circle',
                    slamX,
                    slamY,
                    {
                        radius: 110,
                        color: '#ecfccb'
                    },
                    ENTROPY_TITAN_CONFIG.p3ChainSlamTelegraphFrames, // 0.6 s rapid
                    () => {
                        executeSlamShockwave(slamX, slamY);
                        if (count < 3) {
                            triggerChainSlam(count + 1);
                        } else {
                            // 3 slams complete -> Enter 1.0 s Exposed Recovery Window
                            custom.exposedTimer = ENTROPY_TITAN_CONFIG.p3ExposedRecoveryFrames; // 60 frames = 1.0 s
                            VFX.castShockwave(state, enemy.x, enemy.y, '#84cc16');
                        }
                    }
                );
            };

            triggerChainSlam(1);
        }
    }

    // --- BULLET HELL NOVA SPIRAL (BACKGROUND PRESSURE) ---
    if (state.frame % 45 === 0) {
        const spiralAngle = state.frame * 0.08;
        for (let i = 0; i < 4; i++) {
            const a = spiralAngle + (i * Math.PI) / 2;
            spawnBossProjectile(
                state,
                {
                    x: enemy.x,
                    y: enemy.y,
                    vx: Math.cos(a) * 5,
                    vy: Math.sin(a) * 5,
                    life: 200,
                    size: 7,
                    color: '#84cc16',
                    damage: 1,
                    visualType: 'DEFAULT'
                },
                'entropy_titan',
                ENTROPY_TITAN_CONFIG.maxLiveBossProjectiles
            );
        }
    }

    return { moveX, moveY, moveSpeed };
};
