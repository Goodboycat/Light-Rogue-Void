import { MutableGameState, Enemy, ParticleType } from '../../../types';
import { VFX } from '../../../Emitters';
import { WORLD_SIZE } from '../../../Constants';
import { 
    checkBossPhaseShift, 
    updateBossKitState, 
    telegraph, 
    spawnBossProjectile,
    BossPhaseDef
} from '../BossKit';

export const NEUTRON_STAR_CONFIG = {
    maxLiveBossProjectiles: 16,
    gravityWellBuildFrames: 72, // 1.2 s build-up
    gravityWellMaxPull: 0.18,   // Never exceeds walk speed
    p2OrbitRadius: 200,
    p2OrbitDebrisCount: 6,
    p3QuadrantCollapseFrames: 180, // 3 s warning before collapse wave
    exposedWindowFrames: 120    // 2.0 s exposed window after collapse / gravity surge
};

const QUADRANT_SIGNS = [
    { sx: -1, sy: -1 },
    { sx: 1, sy: -1 },
    { sx: -1, sy: 1 },
    { sx: 1, sy: 1 }
];

const PHASES: BossPhaseDef[] = [
    { hpPct: 0.60 }, // Phase 2 at 60% HP
    { hpPct: 0.30 }  // Phase 3 at 30% HP
];

export const updateNeutronStar = (
    state: MutableGameState, 
    enemy: Enemy, 
    dx: number, 
    dy: number, 
    onEnemySeen: (id: string) => void
) => {
    let moveX = dx;
    let moveY = dy;
    let moveSpeed = enemy.speed;

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

    // Initialize custom state
    if (custom.wellTimer === undefined) custom.wellTimer = 0;
    if (custom.wellCount === undefined) custom.wellCount = 0;
    if (custom.orbitAngle === undefined) custom.orbitAngle = 0;
    if (custom.quadrantTimer === undefined) custom.quadrantTimer = 0;
    if (custom.safeQuadrant === undefined) custom.safeQuadrant = 0;

    if ((custom.exposedTimer || 0) > 0) {
        moveSpeed *= 0.3;
    }

    // --- 1. GRAVITY WELLS (1.2 s build-up ring telegraph) ---
    custom.wellTimer++;
    if (custom.wellTimer >= 240) {
        custom.wellTimer = 0;
        custom.wellCount++;

        const wellX = state.player.x + (Math.random() - 0.5) * 200;
        const wellY = state.player.y + (Math.random() - 0.5) * 200;

        // 1.2 s Ring Telegraph (72 frames)
        telegraph(
            state,
            'ring',
            wellX,
            wellY,
            {
                radius: 140,
                innerRadius: 80,
                color: '#38bdf8'
            },
            NEUTRON_STAR_CONFIG.gravityWellBuildFrames,
            () => {
                // Spawn Gravity Well
                spawnBossProjectile(
                    state,
                    {
                        x: wellX,
                        y: wellY,
                        vx: 0,
                        vy: 0,
                        life: 240, // 4 s active
                        size: 140,
                        color: '#0ea5e9',
                        damage: 1,
                        isStatic: true,
                        visualType: 'TOXIC_CLOUD',
                        customData: { isGravityWell: true }
                    },
                    'neutron_star',
                    NEUTRON_STAR_CONFIG.maxLiveBossProjectiles
                );
                VFX.castShockwave(state, wellX, wellY, '#38bdf8');
                if (custom.wellCount % 2 === 0) {
                    custom.exposedTimer = NEUTRON_STAR_CONFIG.exposedWindowFrames;
                }
            }
        );
    }

    // Process active gravity wells (pull player, never exceeding walk speed)
    for (let i = 0; i < state.projectiles.length; i++) {
        const p = state.projectiles[i];
        if (p.customData?.isGravityWell) {
            const pdx = p.x - state.player.x;
            const pdy = p.y - state.player.y;
            const dist = Math.hypot(pdx, pdy);
            if (dist < p.size && dist > 1) {
                // Pull strength scales with distance, capped <= 0.18 (well below walk speed)
                const pull = Math.min(NEUTRON_STAR_CONFIG.gravityWellMaxPull, 0.05 + (1 - dist / p.size) * 0.13);
                state.player.vx += (pdx / dist) * pull;
                state.player.vy += (pdy / dist) * pull;
            }
        }
    }

    // --- 2. PHASE 2: ORBITING DEBRIS ON TELEGRAPHED ORBITS ---
    if (phase >= 2) {
        custom.orbitAngle += 0.03;

        // Render orbit ring telegraph periodically
        if (state.frame % 120 === 0) {
            telegraph(
                state,
                'ring',
                enemy.x,
                enemy.y,
                {
                    radius: NEUTRON_STAR_CONFIG.p2OrbitRadius + 15,
                    innerRadius: NEUTRON_STAR_CONFIG.p2OrbitRadius - 15,
                    color: '#0ea5e9'
                },
                48
            );
        }

        // Spawn orbiting debris along telegraphed orbit
        if (state.frame % 8 === 0) {
            const count = NEUTRON_STAR_CONFIG.p2OrbitDebrisCount;
            for (let k = 0; k < count; k++) {
                const angle = custom.orbitAngle + (k / count) * Math.PI * 2;
                const ox = enemy.x + Math.cos(angle) * NEUTRON_STAR_CONFIG.p2OrbitRadius;
                const oy = enemy.y + Math.sin(angle) * NEUTRON_STAR_CONFIG.p2OrbitRadius;

                spawnBossProjectile(
                    state,
                    {
                        x: ox,
                        y: oy,
                        vx: 0,
                        vy: 0,
                        life: 10,
                        size: 16,
                        color: '#38bdf8',
                        damage: 1,
                        isStatic: true,
                        visualType: 'DEFAULT'
                    },
                    'neutron_star',
                    NEUTRON_STAR_CONFIG.maxLiveBossProjectiles
                );
            }
        }
    }

    // --- 3. PHASE 3: ARENA EDGE COLLAPSE IN 4 TELEGRAPHED QUADRANTS ---
    if (phase >= 3) {
        custom.quadrantTimer++;
        if (custom.quadrantTimer >= NEUTRON_STAR_CONFIG.p3QuadrantCollapseFrames) {
            custom.quadrantTimer = 0;
            // Select random safe quadrant (0: TL, 1: TR, 2: BL, 3: BR)
            custom.safeQuadrant = Math.floor(Math.random() * 4);

            const half = WORLD_SIZE / 4;
            for (let idx = 0; idx < 4; idx++) {
                const qx = QUADRANT_SIGNS[idx].sx * half;
                const qy = QUADRANT_SIGNS[idx].sy * half;
                const isSafe = idx === custom.safeQuadrant;
                telegraph(
                    state,
                    'circle',
                    qx,
                    qy,
                    {
                        radius: half * 1.2,
                        color: isSafe ? '#22c55e' : '#ef4444' // Safe quadrant glows green, unsafe red
                    },
                    90, // 1.5 s warning
                    () => {
                        if (!isSafe) {
                            // Collapse damage wave in unsafe quadrants
                            spawnBossProjectile(
                                state,
                                {
                                    x: qx,
                                    y: qy,
                                    vx: 0,
                                    vy: 0,
                                    life: 40,
                                    size: half * 1.1,
                                    color: '#f43f5e',
                                    damage: 3,
                                    isStatic: true,
                                    visualType: 'TOXIC_CLOUD'
                                },
                                'neutron_star',
                                NEUTRON_STAR_CONFIG.maxLiveBossProjectiles
                            );
                            VFX.castShockwave(state, qx, qy, '#ef4444');
                        } else {
                            VFX.castShockwave(state, qx, qy, '#22c55e');
                            custom.exposedTimer = NEUTRON_STAR_CONFIG.exposedWindowFrames;
                        }
                    }
                );
            }
        }
    }

    // --- 4. PULSAR SPIRAL SHOTS ---
    if (state.frame % 15 === 0) {
        const spiralAngle = state.frame * 0.15;
        spawnBossProjectile(
            state,
            {
                x: enemy.x,
                y: enemy.y,
                vx: Math.cos(spiralAngle) * 6,
                vy: Math.sin(spiralAngle) * 6,
                life: 220,
                size: 7,
                color: '#38bdf8',
                damage: 1,
                visualType: 'DEFAULT'
            },
            'neutron_star',
            NEUTRON_STAR_CONFIG.maxLiveBossProjectiles
        );
    }

    return { moveX, moveY, moveSpeed };
};
