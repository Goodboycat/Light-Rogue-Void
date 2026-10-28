
import { MutableGameState } from '../types';
import { renderBossProjectile } from './projectiles/BossRenderer';
import { renderEnvironmentProjectile } from './projectiles/EnvironmentRenderer';
import { renderWeaponProjectile } from './projectiles/WeaponRenderer';

// (4B) Default bullets are batched into one Path2D per colour and culled to the viewport (+64 px),
// so thousands of enemy / player shots cost a handful of fill() calls — rule 9 (no projectile cap).
const bulletBuckets = new Map<string, Path2D>();

export const renderProjectiles = (
    ctx: CanvasRenderingContext2D, state: MutableGameState,
    view?: { cx: number; cy: number; halfW: number; halfH: number },
) => {
    bulletBuckets.clear();
    const cullW = view ? view.halfW + 64 : Infinity, cullH = view ? view.halfH + 64 : Infinity;
    const vcx = view ? view.cx : 0, vcy = view ? view.cy : 0;
    state.projectiles.forEach(p => {
        if (view && !p.isStatic && (Math.abs(p.x - vcx) > cullW || Math.abs(p.y - vcy) > cullH)) return;
        // 1. BOSS & SPECIALS
        if (p.visualType === 'BOSS_SINGULARITY' || 
            p.visualType === 'VOID_NOVA' || 
            p.visualType === 'VOID_NOVA_AFTERMATH' ||
            p.visualType === 'DEATH_RAY' ||
            p.visualType === 'SOLAR_BARRIER' ||
            p.visualType === 'CRIMSON_COMET') {
            renderBossProjectile(ctx, state, p);
            return;
        }

        // 2. ENVIRONMENT & HAZARDS
        if (p.visualType === 'VOID_TRAIL' || 
            p.visualType === 'TOXIC_CLOUD' || 
            p.visualType === 'VOID_MINE' ||
            p.visualType === 'SOLAR_FLARE') {
            renderEnvironmentProjectile(ctx, state, p);
            return;
        }

        // 3. WEAPONS & BEAMS
        if (p.visualType === 'RAILGUN_BEAM' || 
            p.visualType === 'HOMING_MISSILE' || 
            p.visualType === 'FIREFLY' ||
            p.visualType === 'SINGULARITY' ||
            p.visualType === 'PLASMA_WHIP') {
            renderWeaponProjectile(ctx, state, p);
            return;
        }

        // --- SKIPPED RENDERERS (Particles Only) ---
        if (p.visualType === 'FIRE_BLAST' || p.visualType === 'STARDUST_TRAIL' || p.visualType === 'VOID_RIFT') {
            // These projectiles rely entirely on particles spawned in VisualsLogic.ts
            return;
        }

        // 4. DEFAULT RENDERER — batched by colour
        let path = bulletBuckets.get(p.color);
        if (!path) { path = new Path2D(); bulletBuckets.set(p.color, path); }
        path.moveTo(p.x + p.size, p.y);
        path.arc(p.x, p.y, p.size, 0, Math.PI*2);
    });
    bulletBuckets.forEach((path, color) => { ctx.fillStyle = color; ctx.fill(path); });
};
