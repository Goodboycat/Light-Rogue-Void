import { MutableGameState, ParticleType } from './types';
import { PlayerStats } from '../../types';
import { WORLD_SIZE } from './Constants';
import { drawEnemy } from './renderer/EnemyRenderer';
import { drawOrbitals } from './renderer/OrbitalRenderer';
import { renderProjectiles } from './renderer/ProjectileRenderer';
import { drawPlayer } from './renderer/PlayerRenderer';

export const renderGame = (
    ctx: CanvasRenderingContext2D,
    state: MutableGameState,
    stats: PlayerStats,
    canvasWidth: number,
    canvasHeight: number,
    maturityScale: number,
    currentStageColor: string
) => {
    ctx.clearRect(0, 0, canvasWidth, canvasHeight);
    
    ctx.save();
    ctx.translate(-state.camera.x, -state.camera.y);

    // --- WORLD BOUNDARIES ---
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 4;
    ctx.strokeRect(-WORLD_SIZE/2, -WORLD_SIZE/2, WORLD_SIZE, WORLD_SIZE);

    // --- DROPS ---
    ctx.shadowBlur = 10;
    state.drops.forEach(d => {
        const pulse = 1 + Math.sin(state.frame * 0.1) * 0.2;
        ctx.beginPath();
        ctx.arc(d.x, d.y, 5 * pulse, 0, Math.PI*2);
        ctx.fillStyle = '#c084fc';
        ctx.fill();
        ctx.shadowColor = '#d8b4fe';
    });
    ctx.shadowBlur = 0;

    // --- ENEMIES ---
    state.enemies.forEach(e => {
        drawEnemy(ctx, e, state.frame);
    });

    // --- PROJECTILES ---
    renderProjectiles(ctx, state);

    // --- BACK ORBITALS (Behind Player) ---
    if (stats.projectileCount > 0) {
        drawOrbitals(ctx, state, stats, maturityScale, true);
    }

    // --- PLAYER ---
    drawPlayer(ctx, state, stats, maturityScale, currentStageColor);

    // --- FRONT ORBITALS (In front of Player) ---
    if (stats.projectileCount > 0) {
        drawOrbitals(ctx, state, stats, maturityScale, false);
    }

    // --- PARTICLES (Additive Blending) ---
    ctx.shadowBlur = 0;
    ctx.globalCompositeOperation = 'lighter'; 
    state.particles.forEach(p => {
        // SAFETY CHECK: Prevent crashes from corrupt particles
        if (!Number.isFinite(p.x) || !Number.isFinite(p.y) || !Number.isFinite(p.size) || p.size <= 0) return;

        // SMOKE/TRAIL TRANSPARENCY FIX
        const baseAlpha = p.type === ParticleType.SMOKE ? 0.2 : 1.0;
        ctx.globalAlpha = (p.alpha ?? (p.life / p.maxLife)) * baseAlpha;
        
        ctx.fillStyle = p.color;
        
        if (p.type === ParticleType.THUNDER || p.type === ParticleType.SPARK) {
             ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI*2); ctx.fill();
        } else if (p.type === ParticleType.RING) {
             ctx.strokeStyle = p.color;
             ctx.lineWidth = 2;
             ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI*2); ctx.stroke();
        } else if (p.type === ParticleType.GLOW) {
             const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size);
             grad.addColorStop(0, p.color);
             grad.addColorStop(1, 'transparent');
             ctx.fillStyle = grad;
             ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI*2); ctx.fill();
        } else {
             ctx.beginPath();
             ctx.arc(p.x, p.y, p.size, 0, Math.PI*2);
             ctx.fill();
        }
    });
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';

    ctx.restore();

    // --- CURSOR ---
    ctx.fillStyle = '#fff';
    ctx.shadowColor = '#fff';
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.arc(state.mouse.x, state.mouse.y, 3, 0, Math.PI*2);
    ctx.fill();
    ctx.shadowBlur = 0;

    // Boss Bar
    if (state.activeBoss) {
        const boss = state.activeBoss;
        const pct = boss.hp / boss.maxHp;
        const x = canvasWidth / 2 - 300;
        
        ctx.fillStyle = '#020617';
        ctx.fillRect(x - 2, 38, 604, 24);

        ctx.fillStyle = boss.def.glowColor;
        ctx.fillRect(x, 40, 600 * pct, 20);

        ctx.font = '20px Orbitron';
        ctx.fillStyle = '#fff';
        ctx.textAlign = 'center';
        ctx.shadowColor = '#000';
        ctx.shadowBlur = 4;
        ctx.fillText(boss.def.name, canvasWidth / 2, 85);
        ctx.shadowBlur = 0;
    }
};