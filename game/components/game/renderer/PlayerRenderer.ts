import { MutableGameState } from '../types';
import { PlayerStats } from '../../../types';

export const drawPlayer = (
    ctx: CanvasRenderingContext2D,
    state: MutableGameState,
    stats: PlayerStats,
    maturityScale: number,
    currentStageColor: string
) => {
    // --- PLAYER ---
    const lightRadius = state.player.size;
    
    // 1. Inner Glow (Background) - Drawn first so it doesn't obscure the core
    ctx.shadowBlur = 20 * maturityScale;
    ctx.shadowColor = currentStageColor;
    ctx.fillStyle = currentStageColor;
    ctx.globalAlpha = 1; // Solid color for better visibility against void
    ctx.beginPath();
    ctx.arc(state.player.x, state.player.y, lightRadius * 1.2, 0, Math.PI*2);
    ctx.fill();
    
    // 2. Core (Foreground) - Drawn last to stay solid white
    ctx.shadowBlur = 30 * maturityScale;
    ctx.shadowColor = '#fff';
    ctx.fillStyle = '#fff';
    ctx.globalAlpha = 1; 
    ctx.beginPath();
    ctx.arc(state.player.x, state.player.y, lightRadius * 0.8, 0, Math.PI*2);
    ctx.fill();
    
    // REMOVED: Outer Aura Ring (The circle that used to be here)

    ctx.shadowBlur = 0;
    
    // Aura Damage Visual
    if (stats.damageAura > 0) {
        ctx.save();
        const auraRadius = 100 * maturityScale;
        const pulse = (state.frame % 60) / 60;
        ctx.globalAlpha = (1 - pulse) * 0.5;
        ctx.strokeStyle = '#f87171';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(state.player.x, state.player.y, auraRadius * pulse, 0, Math.PI*2);
        ctx.stroke();
        
        // Second ring
        const pulse2 = ((state.frame + 30) % 60) / 60;
        ctx.globalAlpha = (1 - pulse2) * 0.3;
        ctx.beginPath();
        ctx.arc(state.player.x, state.player.y, auraRadius * pulse2, 0, Math.PI*2);
        ctx.stroke();
        
        ctx.restore();
    }
};