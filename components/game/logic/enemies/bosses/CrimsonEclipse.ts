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
import { acquireDrop } from '../../../ObjectPools';

export const CRIMSON_ECLIPSE_CONFIG = {
    maxLiveBossProjectiles: 16,
    laserWarmupFrames: 60, // 1.0 s warm-up
    solarFlareTelegraphFrames: 60, // 1.0 s circle telegraph
    overheatExposedFrames: 240, // 4 s exposed window
    overheatIntervalFrames: 960, // Every 16 s
    p1LaserRotationSpeed: 0.012,
    p3LaserSpeedMult: 1.20, // +20% faster
    safeArcDegreesP1: 70, // 70 deg safe arc
    safeArcDegreesP2: 60, // 60 deg gap
};

const PHASES: BossPhaseDef[] = [
    { hpPct: 0.60 }, // Phase 2 at 60% HP
    { hpPct: 0.30 }  // Phase 3 at 30% HP
];

export const updateCrimsonEclipse = (
    state: MutableGameState, 
    enemy: Enemy, 
    dx: number, 
    dy: number, 
    onEnemySeen: (id: string) => void
) => {
    let moveX = dx;
    let moveY = dy;
    let moveSpeed = enemy.speed * 0.6; // Controlled, stately positioning

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
    if (custom.laserAngle1 === undefined) custom.laserAngle1 = 0;
    if (custom.laserAngle2 === undefined) custom.laserAngle2 = Math.PI;
    if (custom.overheatTimer === undefined) custom.overheatTimer = 0;
    if (custom.laserWarmupTimer === undefined) custom.laserWarmupTimer = 0;

    const isExposed = (custom.exposedTimer || 0) > 0;

    // --- PHASE 3 OVERHEAT MECHANIC (Every 16 s = 960 frames) ---
    if (phase >= 3) {
        if (!isExposed) {
            custom.overheatTimer = (custom.overheatTimer || 0) + 1;
            if (custom.overheatTimer >= CRIMSON_ECLIPSE_CONFIG.overheatIntervalFrames) {
                custom.overheatTimer = 0;
                // Trigger 4 s Exposed Window
                custom.exposedTimer = CRIMSON_ECLIPSE_CONFIG.overheatExposedFrames; // 240 frames = 4 s
                VFX.castShockwave(state, enemy.x, enemy.y, '#f97316');
            }
        }
    }

    // While Exposed / Overheating: takes x2.0 damage, no laser attacks
    if (isExposed) {
        return { moveX: 0, moveY: 0, moveSpeed: 0 };
    }

    // Laser rotation speed calculation (+20% faster in P3)
    const speedMult = (phase >= 3) ? CRIMSON_ECLIPSE_CONFIG.p3LaserSpeedMult : 1.0;
    const rotSpeed = CRIMSON_ECLIPSE_CONFIG.p1LaserRotationSpeed * speedMult;

    // --- LASER WARM-UP TELEGRAPH (1.0 s) ---
    if (custom.laserWarmupTimer < CRIMSON_ECLIPSE_CONFIG.laserWarmupFrames) {
        custom.laserWarmupTimer++;
        if (custom.laserWarmupTimer === 1) {
            // Spawn 1.0 s Cone Telegraph indicating initial beam sweep with safe arc gap
            const safeArcRad = (CRIMSON_ECLIPSE_CONFIG.safeArcDegreesP1 * Math.PI) / 180;
            const beamFov = Math.PI * 2 - safeArcRad;
            telegraph(
                state,
                'cone',
                enemy.x,
                enemy.y,
                {
                    radius: 700,
                    angle: custom.laserAngle1,
                    fov: beamFov,
                    color: '#ef4444'
                },
                CRIMSON_ECLIPSE_CONFIG.laserWarmupFrames
            );
        }
        return { moveX: 0, moveY: 0, moveSpeed: 0 };
    }

    // --- ROTATING SOLAR LASERS ---
    // Update Laser Angles
    custom.laserAngle1 += rotSpeed;
    if (phase >= 2) {
        custom.laserAngle2 -= rotSpeed; // Rotates in opposite direction
    }

    // Spawn Laser Segment Projectiles along beam angle
    if (state.frame % 4 === 0) {
        const rayCount = 4;
        for (let r = 1; r <= rayCount; r++) {
            const dist = r * 150;
            
            // Laser 1
            const lx1 = enemy.x + Math.cos(custom.laserAngle1) * dist;
            const ly1 = enemy.y + Math.sin(custom.laserAngle1) * dist;
            spawnBossProjectile(
                state,
                {
                    x: lx1,
                    y: ly1,
                    vx: 0,
                    vy: 0,
                    life: 8,
                    size: 24,
                    color: '#dc2626',
                    damage: 2,
                    isStatic: true,
                    visualType: 'SOLAR_BARRIER'
                },
                'crimson_eclipse',
                CRIMSON_ECLIPSE_CONFIG.maxLiveBossProjectiles
            );

            // Laser 2 (Phase 2 & 3)
            if (phase >= 2) {
                const lx2 = enemy.x + Math.cos(custom.laserAngle2) * dist;
                const ly2 = enemy.y + Math.sin(custom.laserAngle2) * dist;
                spawnBossProjectile(
                    state,
                    {
                        x: lx2,
                        y: ly2,
                        vx: 0,
                        vy: 0,
                        life: 8,
                        size: 24,
                        color: '#f97316',
                        damage: 2,
                        isStatic: true,
                        visualType: 'SOLAR_BARRIER'
                    },
                    'crimson_eclipse',
                    CRIMSON_ECLIPSE_CONFIG.maxLiveBossProjectiles
                );
            }
        }
    }

    // --- PHASE 3: SAFE SIDE ESSENCE ORB DROPS ---
    if (phase >= 3 && state.frame % 40 === 0) {
        // Safe side angle is opposite the laser or in the safe gap
        const safeAngle = custom.laserAngle1 + Math.PI;
        const orbX = enemy.x + Math.cos(safeAngle) * (180 + Math.random() * 60);
        const orbY = enemy.y + Math.sin(safeAngle) * (180 + Math.random() * 60);
        state.drops.push(acquireDrop({
            x: orbX,
            y: orbY,
            value: 10
        }));
    }

    // --- PHASE 2 & 3: SOLAR FLARES (1.0 s Circle Telegraphs) ---
    if (phase >= 2 && state.frame % 130 === 0) {
        const flareX = state.player.x + (Math.random() - 0.5) * 350;
        const flareY = state.player.y + (Math.random() - 0.5) * 350;

        telegraph(
            state,
            'circle',
            flareX,
            flareY,
            {
                radius: 80,
                color: '#fbbf24'
            },
            CRIMSON_ECLIPSE_CONFIG.solarFlareTelegraphFrames,
            () => {
                // Solar flare impact
                spawnBossProjectile(
                    state,
                    {
                        x: flareX,
                        y: flareY,
                        vx: 0,
                        vy: 0,
                        life: 120,
                        size: 90,
                        color: '#fbbf24',
                        damage: 2,
                        isStatic: true,
                        visualType: 'SOLAR_FLARE',
                        customData: { spawnFrame: state.frame }
                    },
                    'crimson_eclipse',
                    CRIMSON_ECLIPSE_CONFIG.maxLiveBossProjectiles
                );
                VFX.castShockwave(state, flareX, flareY, '#fbbf24');
            }
        );
    }

    // --- CRIMSON COMET DIRECT SHOT WITH LINE TELEGRAPH ---
    if (state.frame % 180 === 0) {
        const angle = Math.atan2(dy, dx);
        telegraph(
            state,
            'line',
            enemy.x,
            enemy.y,
            {
                width: 35,
                length: 600,
                angle,
                color: '#ef4444'
            },
            36, // 0.6 s
            () => {
                spawnBossProjectile(
                    state,
                    {
                        x: enemy.x,
                        y: enemy.y,
                        vx: Math.cos(angle) * 14,
                        vy: Math.sin(angle) * 14,
                        life: 180,
                        size: 32,
                        color: '#dc2626',
                        damage: 4,
                        visualType: 'CRIMSON_COMET'
                    },
                    'crimson_eclipse',
                    CRIMSON_ECLIPSE_CONFIG.maxLiveBossProjectiles
                );
                VFX.castShockwave(state, enemy.x, enemy.y, '#dc2626');
            }
        );
    }

    return { moveX, moveY, moveSpeed };
};
