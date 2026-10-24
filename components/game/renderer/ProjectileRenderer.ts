import { MutableGameState } from '../types';
import { Settings } from '../../../types';
import { renderBossProjectile } from './projectiles/BossRenderer';
import { renderEnvironmentProjectile } from './projectiles/EnvironmentRenderer';
import { renderWeaponProjectile } from './projectiles/WeaponRenderer';
import { getQuality } from '../Quality';
import { CullBounds } from './ParticleBatcher';

const isLargeHazard = (visualType?: string) =>
    visualType === 'RAILGUN_BEAM' ||
    visualType === 'DEATH_RAY' ||
    visualType === 'SOLAR_BARRIER' ||
    visualType === 'VOID_NOVA' ||
    visualType === 'VOID_NOVA_AFTERMATH' ||
    visualType === 'PLASMA_WHIP';

const isCulled = (x: number, y: number, size: number, cull?: CullBounds): boolean => {
    if (!cull) return false;
    const margin = cull.margin + size * 2;
    return (
        Math.abs(x - cull.centerX) > cull.halfW + margin ||
        Math.abs(y - cull.centerY) > cull.halfH + margin
    );
};

export const renderEnvironmentProjectiles = (
    ctx: CanvasRenderingContext2D,
    state: MutableGameState,
    cull?: CullBounds,
    glowEnabled: boolean = getQuality(state.performanceMode).glow
) => {
    for (let i = 0; i < state.projectiles.length; i++) {
        const p = state.projectiles[i];
        if (
            p.visualType === 'VOID_TRAIL' ||
            p.visualType === 'TOXIC_CLOUD' ||
            p.visualType === 'NEBULA_TRAIL' ||
            p.visualType === 'VOID_MINE' ||
            p.visualType === 'SOLAR_FLARE'
        ) {
            if (isCulled(p.x, p.y, p.size, cull)) continue;
            renderEnvironmentProjectile(ctx, state, p, glowEnabled);
        }
    }
};

const defaultBuckets = new Map<string, Path2D>();

/**
 * Player projectiles: thinner, 70% opacity, rendered in the player FX pass BEFORE enemies.
 * Batched by color without per-entity save/restore.
 */
export const renderPlayerProjectiles = (
    ctx: CanvasRenderingContext2D,
    state: MutableGameState,
    cull?: CullBounds,
    glowEnabled: boolean = getQuality(state.performanceMode).glow
) => {
    defaultBuckets.clear();

    const prevAlpha = ctx.globalAlpha;
    ctx.globalAlpha = 0.7;

    for (let i = 0; i < state.projectiles.length; i++) {
        const p = state.projectiles[i];
        if (p.isEnemy) continue;

        if (
            p.visualType === 'VOID_TRAIL' ||
            p.visualType === 'TOXIC_CLOUD' ||
            p.visualType === 'NEBULA_TRAIL' ||
            p.visualType === 'VOID_MINE' ||
            p.visualType === 'SOLAR_FLARE' ||
            p.visualType === 'FIRE_BLAST' ||
            p.visualType === 'STARDUST_TRAIL' ||
            p.visualType === 'VOID_RIFT'
        ) {
            continue;
        }

        if (!isLargeHazard(p.visualType) && isCulled(p.x, p.y, p.size, cull)) {
            continue;
        }

        if (
            p.visualType === 'RAILGUN_BEAM' ||
            p.visualType === 'HOMING_MISSILE' ||
            p.visualType === 'FIREFLY' ||
            p.visualType === 'SINGULARITY' ||
            p.visualType === 'PLASMA_WHIP'
        ) {
            renderWeaponProjectile(ctx, state, p, glowEnabled);
            continue;
        }

        let path = defaultBuckets.get(p.color);
        if (!path) {
            path = new Path2D();
            defaultBuckets.set(p.color, path);
        }
        const thinRadius = Math.max(2, p.size * 0.8);
        path.moveTo(p.x + thinRadius, p.y);
        path.arc(p.x, p.y, thinRadius, 0, Math.PI * 2);
    }

    defaultBuckets.forEach((path, color) => {
        ctx.fillStyle = color;
        ctx.fill(path);
    });

    ctx.globalAlpha = prevAlpha;
};

const enemyOuterBuckets = new Map<string, Path2D>();

/**
 * Enemy projectiles: bright core + dark outline + a distinct shape per threat type
 * (Diamond for sniper/fast shots, Spiked Star for boss/heavy, Hexagon for standard),
 * batched by color with zero save/restore inside the per-entity loop.
 */
export const renderEnemyProjectiles = (
    ctx: CanvasRenderingContext2D,
    state: MutableGameState,
    settings?: Settings,
    cull?: CullBounds,
    glowEnabled: boolean = getQuality(state.performanceMode).glow
) => {
    const highContrast = !!(settings?.highContrastBullets ?? state.settings?.highContrastBullets);
    const colorblind = !!(settings?.colorblindMode ?? state.settings?.colorblindMode);

    enemyOuterBuckets.clear();
    const allEnemyOutlinePath = new Path2D();
    const allEnemyCorePath = new Path2D();
    let hasStandardBullets = false;

    for (let i = 0; i < state.projectiles.length; i++) {
        const p = state.projectiles[i];
        if (!p.isEnemy) continue;

        if (
            p.visualType === 'VOID_TRAIL' ||
            p.visualType === 'TOXIC_CLOUD' ||
            p.visualType === 'NEBULA_TRAIL' ||
            p.visualType === 'VOID_MINE' ||
            p.visualType === 'SOLAR_FLARE'
        ) {
            continue;
        }

        if (!isLargeHazard(p.visualType) && isCulled(p.x, p.y, p.size, cull)) {
            continue;
        }

        if (
            p.visualType === 'BOSS_SINGULARITY' ||
            p.visualType === 'VOID_NOVA' ||
            p.visualType === 'VOID_NOVA_AFTERMATH' ||
            p.visualType === 'DEATH_RAY' ||
            p.visualType === 'SOLAR_BARRIER' ||
            p.visualType === 'CRIMSON_COMET'
        ) {
            renderBossProjectile(ctx, state, p, glowEnabled);
            continue;
        }

        if (p.visualType === 'RAILGUN_BEAM' || p.visualType === 'HOMING_MISSILE') {
            renderWeaponProjectile(ctx, state, p, glowEnabled);
            continue;
        }

        hasStandardBullets = true;
        const speedSq = p.vx * p.vx + p.vy * p.vy;
        const angle = Math.atan2(p.vy, p.vx);
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);
        const r = Math.max(4, p.size * (highContrast ? 1.25 : 1.05));
        const isBossProj = !!p.customData?.isBossProj;
        const isFastSniper = speedSq >= 49;

        const outerColor = highContrast
            ? '#ff2a85'
            : colorblind
            ? isBossProj
                ? '#f97316'
                : isFastSniper
                ? '#facc15'
                : '#f43f5e'
            : p.color || '#f43f5e';

        let colorPath = enemyOuterBuckets.get(outerColor);
        if (!colorPath) {
            colorPath = new Path2D();
            enemyOuterBuckets.set(outerColor, colorPath);
        }

        if (isFastSniper) {
            // Rotated Diamond in world space (no save/restore!)
            const p0x = p.x + cos * (r * 1.6);
            const p0y = p.y + sin * (r * 1.6);
            const p1x = p.x - sin * (r * 0.9);
            const p1y = p.y + cos * (r * 0.9);
            const p2x = p.x - cos * (r * 1.3);
            const p2y = p.y - sin * (r * 1.3);
            const p3x = p.x + sin * (r * 0.9);
            const p3y = p.y - cos * (r * 0.9);

            colorPath.moveTo(p0x, p0y);
            colorPath.lineTo(p1x, p1y);
            colorPath.lineTo(p2x, p2y);
            colorPath.lineTo(p3x, p3y);
            colorPath.closePath();

            allEnemyOutlinePath.moveTo(p0x, p0y);
            allEnemyOutlinePath.lineTo(p1x, p1y);
            allEnemyOutlinePath.lineTo(p2x, p2y);
            allEnemyOutlinePath.lineTo(p3x, p3y);
            allEnemyOutlinePath.closePath();
        } else if (isBossProj) {
            // 4-point Star in world space
            const spikes = 4;
            for (let s = 0; s < spikes * 2; s++) {
                const rad = s % 2 === 0 ? r * 1.35 : r * 0.65;
                const a = angle + (s * Math.PI) / spikes;
                const vx = p.x + Math.cos(a) * rad;
                const vy = p.y + Math.sin(a) * rad;
                if (s === 0) {
                    colorPath.moveTo(vx, vy);
                    allEnemyOutlinePath.moveTo(vx, vy);
                } else {
                    colorPath.lineTo(vx, vy);
                    allEnemyOutlinePath.lineTo(vx, vy);
                }
            }
            colorPath.closePath();
            allEnemyOutlinePath.closePath();
        } else {
            // Hexagon in world space
            for (let s = 0; s < 6; s++) {
                const a = angle + (s * Math.PI) / 3;
                const vx = p.x + Math.cos(a) * r;
                const vy = p.y + Math.sin(a) * r;
                if (s === 0) {
                    colorPath.moveTo(vx, vy);
                    allEnemyOutlinePath.moveTo(vx, vy);
                } else {
                    colorPath.lineTo(vx, vy);
                    allEnemyOutlinePath.lineTo(vx, vy);
                }
            }
            colorPath.closePath();
            allEnemyOutlinePath.closePath();
        }

        const coreR = Math.max(1.8, r * 0.45);
        allEnemyCorePath.moveTo(p.x + coreR, p.y);
        allEnemyCorePath.arc(p.x, p.y, coreR, 0, Math.PI * 2);
    }

    if (hasStandardBullets) {
        // 1. Dark high-contrast outline pass
        ctx.strokeStyle = '#020617';
        ctx.lineWidth = highContrast ? 3 : 2.2;
        ctx.stroke(allEnemyOutlinePath);

        // 2. Batched outer fill per threat color
        enemyOuterBuckets.forEach((path, color) => {
            ctx.fillStyle = color;
            ctx.fill(path);
        });

        // 3. Optional colorblind/high-contrast secondary rim pass
        if (colorblind || highContrast) {
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 1;
            ctx.stroke(allEnemyOutlinePath);
        }

        // 4. Batched bright white core pass
        ctx.fillStyle = '#ffffff';
        ctx.fill(allEnemyCorePath);
    }
};

export const renderProjectiles = (ctx: CanvasRenderingContext2D, state: MutableGameState) => {
    renderPlayerProjectiles(ctx, state);
    renderEnemyProjectiles(ctx, state, state.settings);
};
