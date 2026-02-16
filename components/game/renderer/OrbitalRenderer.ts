
import { MutableGameState } from '../types';
import { PlayerStats } from '../../../types';

export const drawOrbitals = (
    ctx: CanvasRenderingContext2D, 
    state: MutableGameState, 
    stats: PlayerStats, 
    maturityScale: number,
    drawBack: boolean // True = draw only behind player, False = draw only in front
) => {
    const orbitRadius = 100 * maturityScale;
    const orbitSpeed = 0.05;
    const tilt = 0.4; // Must match Logic.ts
    const count = Math.floor(stats.projectileCount);

    for(let i=0; i<count; i++) {
        const angle = (state.frame * orbitSpeed) + (i * (Math.PI * 2 / count));
        const normalizedSin = Math.sin(angle);
        
        // Z-Sorting Check
        // If sin(angle) < 0, it's "behind" (up on screen due to tilt).
        // If sin(angle) > 0, it's "front".
        const isBack = normalizedSin < 0;

        if (isBack !== drawBack) continue;

        // Visual Math (Must match Logic.ts)
        const noiseX = Math.sin(state.frame * 0.1 + i * 10) * (5 * maturityScale);
        const noiseY = Math.cos(state.frame * 0.15 + i * 10) * (5 * maturityScale);

        const px = state.player.x + Math.cos(angle) * orbitRadius + noiseX;
        const py = state.player.y + normalizedSin * orbitRadius * tilt + noiseY;
        
        // Render Sun
        // Back suns slightly smaller/dimmer for depth
        const scale = isBack ? 0.8 : 1.1;
        
        ctx.save();
        ctx.translate(px, py);
        
        // Main Body
        ctx.shadowBlur = 10;
        ctx.shadowColor = '#fbbf24';
        ctx.fillStyle = '#fff';
        ctx.beginPath(); ctx.arc(0, 0, 6 * scale, 0, Math.PI*2); ctx.fill();
        
        // Fiery Corona
        ctx.strokeStyle = '#fbbf24';
        ctx.lineWidth = 2;
        const coronaSize = (8 + Math.sin(state.frame*0.2 + i)*2) * scale;
        ctx.beginPath(); ctx.arc(0, 0, coronaSize, 0, Math.PI*2); ctx.stroke();
        
        // No connecting lines as requested
        
        ctx.restore();
    }
};
