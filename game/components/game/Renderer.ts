import { MutableGameState, ParticleType } from './types';
import { PlayerStats } from '../../types';
import { WORLD_SIZE } from './Constants';
import { drawEnemy } from './renderer/EnemyRenderer';
import { drawOrbitals } from './renderer/OrbitalRenderer';
import { renderProjectiles } from './renderer/ProjectileRenderer';
import { drawPlayer } from './renderer/PlayerRenderer';
import { drawFloaters, drawStreakBanner, drawHurtOverlay } from './renderer/FloaterRenderer';
import { drawParticlesBatched } from './renderer/ParticleBatcher';

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
    // (4A) camera shake offset (rounded so sprites stay crisp)
    ctx.translate(-Math.round(state.camera.x + (state.shakeX ?? 0)), -Math.round(state.camera.y + (state.shakeY ?? 0)));

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
    // (4A) batched by colour/alpha into Path2D; GLOW uses cached sprites; culled to the viewport
    drawParticlesBatched(ctx, state.particles, {
        centerX: state.camera.x + canvasWidth / 2, centerY: state.camera.y + canvasHeight / 2,
        halfW: canvasWidth / 2, halfH: canvasHeight / 2, margin: 64,
    });
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';

    // --- DAMAGE NUMBERS (4A, world space) ---
    drawFloaters(ctx, state);

    ctx.restore();

    // --- HURT VIGNETTE / LOW HP (4A, screen space) ---
    drawHurtOverlay(ctx, state, canvasWidth, canvasHeight);
    drawStreakBanner(ctx, state, canvasWidth, canvasHeight);

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