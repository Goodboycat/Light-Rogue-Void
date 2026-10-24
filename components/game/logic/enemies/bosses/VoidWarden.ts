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

export const VOID_WARDEN_CONFIG = {
    maxLiveBossProjectiles: 14,
    nebulaMaxLive: 12,
    nebulaLife: 240, // 4 s
    nebulaSize: 110,
    p1TelegraphFrames: 48, // 0.8 s line telegraph
    p1ExposedFrames: 180, // 3 s exposed recovery
    p2PortalTelegraphFrames: 42, // 0.7 s ring/circle telegraph
    p3SpeedMult: 1.15, // 15% faster
    p3SafeGap: 90, // 90 px safe gap between trail clouds
    baseSpeed: 12
};

const PHASES: BossPhaseDef[] = [
    { hpPct: 0.60 }, // Phase 2 at 60% HP
    { hpPct: 0.30 }  // Phase 3 at 30% HP
];

export const updateVoidWarden = (
    state: MutableGameState, 
    enemy: Enemy, 
    dx: number, 
    dy: number, 
    onEnemySeen: (id: string) => void
) => {
    if (!enemy.state.custom) enemy.state.custom = {};
    const custom = enemy.state.custom;

    // Check Phase Shift & update BossKit state
    checkBossPhaseShift(state, enemy, PHASES);
    updateBossKitState(state, enemy);

    const phase = enemy.state.phase || 1;
    const isPhaseShifting = (custom.phaseShiftTimer || 0) > 0;

    // If phase shifting, stay still and clear wind-ups
    if (isPhaseShifting) {
        return { moveX: 0, moveY: 0, moveSpeed: 0 };
    }

    // Initialize direction & state variables
    if (custom.dirX === undefined) {
        const angle = Math.atan2(dy, dx) || Math.random() * Math.PI * 2;
        custom.dirX = Math.cos(angle);
        custom.dirY = Math.sin(angle);
    }
    if (custom.passCount === undefined) custom.passCount = 0;
    if (custom.subState === undefined) custom.subState = 'TELEGRAPHING';
    if (custom.subStateTimer === undefined) custom.subStateTimer = 0;
    if (custom.portalTimer === undefined) custom.portalTimer = 0;

    // Current speed calculation (15% faster in P3)
    const passSpeed = VOID_WARDEN_CONFIG.baseSpeed * (phase >= 3 ? VOID_WARDEN_CONFIG.p3SpeedMult : 1.0);
    const halfSize = WORLD_SIZE / 2 - enemy.size * 2;

    // Cleanup expired nebula clouds (keep max 12 live)
    let nebulaCount = 0;
    for (let i = 0; i < state.projectiles.length; i++) {
        if (state.projectiles[i].visualType === 'NEBULA_TRAIL') nebulaCount++;
    }

    // --- STATE MACHINE FOR RICOCHET PASSES ---
    if (custom.subState === 'TELEGRAPHING') {
        custom.subStateTimer++;
        
        // Start telegraph if just entered
        if (custom.subStateTimer === 1) {
            // In P3, 1 pass per cycle is a FAKE PASS
            custom.isFakePass = (phase >= 3 && custom.passCount === 1);

            // Determine pass direction toward player or target
            const passAngle = Math.atan2(dy, dx);
            custom.dirX = Math.cos(passAngle);
            custom.dirY = Math.sin(passAngle);

            // Spawn 0.8 s Line Telegraph (48 frames)
            telegraph(
                state,
                'line',
                enemy.x,
                enemy.y,
                {
                    width: custom.isFakePass ? 30 : 60,
                    length: 700,
                    angle: passAngle,
                    color: custom.isFakePass ? '#c084fc' : '#a78bfa'
                },
                VOID_WARDEN_CONFIG.p1TelegraphFrames,
                () => {
                    // Wind-up complete callback
                    if (custom.isFakePass) {
                        // Fake pass! Sidestep slightly & release decoy pulse
                        VFX.castShockwave(state, enemy.x, enemy.y, '#c084fc');
                        custom.subState = 'TELEGRAPHING';
                        custom.passCount = (custom.passCount || 0) + 1;
                        custom.subStateTimer = 0;
                    } else {
                        custom.subState = 'PASSING';
                        custom.passTimer = 0;
                    }
                }
            );
        }

        return { moveX: 0, moveY: 0, moveSpeed: 0 };
    }

    if (custom.subState === 'PASSING') {
        custom.passTimer = (custom.passTimer || 0) + 1;

        // Bounce on arena boundaries
        if (enemy.x > halfSize && custom.dirX > 0) custom.dirX *= -1;
        if (enemy.x < -halfSize && custom.dirX < 0) custom.dirX *= -1;
        if (enemy.y > halfSize && custom.dirY > 0) custom.dirY *= -1;
        if (enemy.y < -halfSize && custom.dirY < 0) custom.dirY *= -1;

        // Leave Toxic Nebula Trail behind during pass
        // In P3, leave 90 px safe gap between clouds (drop every 12 frames instead of 6)
        const dropInterval = (phase >= 3) ? 12 : 6;
        if (state.frame % dropInterval === 0 && nebulaCount < VOID_WARDEN_CONFIG.nebulaMaxLive) {
            spawnBossProjectile(
                state,
                {
                    x: enemy.x,
                    y: enemy.y,
                    vx: 0,
                    vy: 0,
                    life: VOID_WARDEN_CONFIG.nebulaLife, // 4 s
                    size: VOID_WARDEN_CONFIG.nebulaSize,
                    color: '#10b981',
                    damage: 1,
                    isStatic: true,
                    visualType: 'NEBULA_TRAIL'
                },
                'void_warden',
                VOID_WARDEN_CONFIG.maxLiveBossProjectiles
            );
        }

        // Secondary attack: Arcane Missiles during pass
        if (state.frame % 30 === 0) {
            const angle = Math.atan2(dy, dx) + (Math.random() - 0.5) * 0.5;
            spawnBossProjectile(
                state,
                {
                    x: enemy.x,
                    y: enemy.y,
                    vx: Math.cos(angle) * 5,
                    vy: Math.sin(angle) * 5,
                    life: 200,
                    size: 8,
                    color: '#a78bfa',
                    damage: 1,
                    visualType: 'ARCANE_MISSILE'
                },
                'void_warden',
                VOID_WARDEN_CONFIG.maxLiveBossProjectiles
            );
        }

        // Finish pass after 45 frames
        if (custom.passTimer >= 45) {
            custom.passCount = (custom.passCount || 0) + 1;
            if (custom.passCount >= 3) {
                // 3 passes completed -> enter 3 s Exposed Recovery Window
                custom.subState = 'EXPOSED';
                custom.exposedTimer = VOID_WARDEN_CONFIG.p1ExposedFrames; // 180 frames = 3 s
                custom.passCount = 0;
            } else {
                // Next pass in the 3-pass sequence
                custom.subState = 'TELEGRAPHING';
                custom.subStateTimer = 0;
            }
        }

        return { moveX: custom.dirX * 1000, moveY: custom.dirY * 1000, moveSpeed: passSpeed };
    }

    if (custom.subState === 'EXPOSED') {
        // Exposed window active: boss glows, takes x2.0 damage, inhales player with pull <= 0.12
        if ((custom.exposedTimer || 0) <= 0) {
            // Recovery complete -> resume telegraphing passes
            custom.subState = 'TELEGRAPHING';
            custom.subStateTimer = 0;
        }
        return { moveX: 0, moveY: 0, moveSpeed: 0 };
    }

    // --- PHASE 2 & 3: PAIRED PORTALS MECHANIC ---
    if (phase >= 2 && custom.subState !== 'EXPOSED') {
        custom.portalTimer = (custom.portalTimer || 0) + 1;
        if (custom.portalTimer >= 280) {
            custom.portalTimer = 0;
            
            // Choose destination portal near player
            const destX = state.player.x + (Math.random() - 0.5) * 200;
            const destY = state.player.y + (Math.random() - 0.5) * 200;

            // Spawn 0.7 s Circle/Ring Telegraph at destination (42 frames)
            telegraph(
                state,
                'circle',
                destX,
                destY,
                {
                    radius: 80,
                    color: '#8b5cf6'
                },
                VOID_WARDEN_CONFIG.p2PortalTelegraphFrames,
                () => {
                    // Portal teleport complete: move boss to destination
                    VFX.castShockwave(state, enemy.x, enemy.y, '#8b5cf6');
                    enemy.x = destX;
                    enemy.y = destY;
                    VFX.castShockwave(state, enemy.x, enemy.y, '#c084fc');

                    // Radial burst of arcane missiles from exit portal
                    for (let k = 0; k < 6; k++) {
                        const a = (k / 6) * Math.PI * 2;
                        spawnBossProjectile(
                            state,
                            {
                                x: enemy.x,
                                y: enemy.y,
                                vx: Math.cos(a) * 6,
                                vy: Math.sin(a) * 6,
                                life: 180,
                                size: 9,
                                color: '#a78bfa',
                                damage: 1,
                                visualType: 'ARCANE_MISSILE'
                            },
                            'void_warden',
                            VOID_WARDEN_CONFIG.maxLiveBossProjectiles
                        );
                    }
                }
            );
        }
    }

    return { moveX: custom.dirX * 1000, moveY: custom.dirY * 1000, moveSpeed: passSpeed * 0.5 };
};
