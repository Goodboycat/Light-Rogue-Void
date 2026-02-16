
import { MutableGameState } from '../types';
import { renderBossProjectile } from './projectiles/BossRenderer';
import { renderEnvironmentProjectile } from './projectiles/EnvironmentRenderer';
import { renderWeaponProjectile } from './projectiles/WeaponRenderer';

export const renderProjectiles = (ctx: CanvasRenderingContext2D, state: MutableGameState) => {
    state.projectiles.forEach(p => {
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

        // 4. DEFAULT RENDERER
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI*2);
        ctx.fillStyle = p.color;
        ctx.fill();
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 10;
        ctx.shadowBlur = 0; 
    });
};
