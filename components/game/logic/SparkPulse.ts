import { MutableGameState, ParticleType } from '../types';
import { PlayerStats, Settings } from '../../../types';
import { audio } from '../audio';
import { createParticle } from '../Particles';
import { acquireProjectile } from '../ObjectPools';

export const SPARK_PULSE_CONFIG = {
    baseDamage: 16,
    damagePerWave: 2,
    maxWaveScale: 30,
    cooldownFrames: 30,
    range: 440,
    projectileSpeed: 11,
    life: 45,
    size: 5,
    color: '#fde68a'
};

export const updateSparkPulse = (
    state: MutableGameState,
    stats: PlayerStats,
    wave: number,
    maturityScale: number,
    settings?: Settings
) => {
    const p = state.player;
    if (p.sparkPulseTimer === undefined) p.sparkPulseTimer = 0;

    if (p.sparkPulseTimer > 0) {
        p.sparkPulseTimer--;
        return;
    }

    const autoAim = settings?.autoAimStarterPulse !== false;
    let targetX = 0;
    let targetY = 0;
    let foundTarget = false;

    if (autoAim) {
        const rangeSq = SPARK_PULSE_CONFIG.range * SPARK_PULSE_CONFIG.range;
        let minSqDist = rangeSq;
        const scanCount = Math.min(state.enemies.length, 80);

        for (let i = 0; i < scanCount; i++) {
            const e = state.enemies[i];
            const dx = e.x - p.x;
            const dy = e.y - p.y;
            const sqDist = dx * dx + dy * dy;

            if (sqDist < minSqDist) {
                minSqDist = sqDist;
                targetX = e.x;
                targetY = e.y;
                foundTarget = true;
            }
        }
    } else {
        const zoom = state.camera.zoom || 1.0;
        const halfW = (state as any).canvasWidth ? (state as any).canvasWidth / 2 : 400;
        const halfH = (state as any).canvasHeight ? (state as any).canvasHeight / 2 : 300;
        targetX = (state.mouse.x - halfW) / zoom + halfW + state.camera.x;
        targetY = (state.mouse.y - halfH) / zoom + halfH + state.camera.y;
        foundTarget = true;
    }

    if (!foundTarget) {
        return;
    }

    const dx = targetX - p.x;
    const dy = targetY - p.y;
    const baseAngle = Math.atan2(dy, dx);

    const effectiveWave = Math.min(wave || 1, SPARK_PULSE_CONFIG.maxWaveScale);
    const damage = SPARK_PULSE_CONFIG.baseDamage + (effectiveWave - 1) * SPARK_PULSE_CONFIG.damagePerWave;

    const attackSpeed = Math.max(0.5, stats.attackSpeed || 1);
    const cooldown = Math.max(10, Math.round(SPARK_PULSE_CONFIG.cooldownFrames / attackSpeed));
    p.sparkPulseTimer = cooldown;

    const extraShots = Math.floor((stats.projectileCount || 0) / 3);
    const totalShots = 1 + extraShots;
    const spreadAngle = 0.18;

    const isLowPerf = settings?.performanceMode === 'LOW';

    for (let i = 0; i < totalShots; i++) {
        const offset = (i - (totalShots - 1) / 2) * spreadAngle;
        const shotAngle = baseAngle + offset;

        const vx = Math.cos(shotAngle) * SPARK_PULSE_CONFIG.projectileSpeed;
        const vy = Math.sin(shotAngle) * SPARK_PULSE_CONFIG.projectileSpeed;

        state.projectiles.push(acquireProjectile({
            x: p.x,
            y: p.y,
            vx,
            vy,
            size: SPARK_PULSE_CONFIG.size * maturityScale,
            color: SPARK_PULSE_CONFIG.color,
            life: SPARK_PULSE_CONFIG.life,
            damage,
            isEnemy: false,
            visualType: 'DEFAULT'
        }));

        if (!isLowPerf) {
            createParticle(state, p.x, p.y, ParticleType.GLOW, '#fde68a', {
                vx: vx * 0.2,
                vy: vy * 0.2,
                life: 15,
                size: 3
            });
        }
    }

    audio.playShoot();
};
