import { MutableGameState } from '../types';
import { PlayerStats } from '../../../types';
import { getGlowSprite } from './GlowSprites';
import { getQuality } from '../Quality';

export const drawOrbitals = (
    ctx: CanvasRenderingContext2D, 
    state: MutableGameState, 
    stats: PlayerStats, 
    maturityScale: number,
    drawBack: boolean
) => {
    const Q = getQuality(state.performanceMode);
    const orbitRadius = 100 * maturityScale;
    const orbitSpeed = 0.05;
    const tilt = 0.4;
    const count = Math.floor(stats.projectileCount);

    const glowSprite = Q.glow ? getGlowSprite('#fbbf24', 64) : null;
    ctx.fillStyle = '#fff';
    ctx.strokeStyle = '#fbbf24';
    ctx.lineWidth = 2;

    for (let i = 0; i < count; i++) {
        const angle = (state.frame * orbitSpeed) + (i * (Math.PI * 2 / count));
        const normalizedSin = Math.sin(angle);
        const isBack = normalizedSin < 0;

        if (isBack !== drawBack) continue;

        const noiseX = Math.sin(state.frame * 0.1 + i * 10) * (5 * maturityScale);
        const noiseY = Math.cos(state.frame * 0.15 + i * 10) * (5 * maturityScale);

        const px = state.player.x + Math.cos(angle) * orbitRadius + noiseX;
        const py = state.player.y + normalizedSin * orbitRadius * tilt + noiseY;
        const scale = isBack ? 0.8 : 1.1;

        if (glowSprite) {
            const glowSize = 6 * scale * 2.4 * 2;
            ctx.drawImage(glowSprite, px - glowSize / 2, py - glowSize / 2, glowSize, glowSize);
        }

        ctx.beginPath();
        ctx.arc(px, py, 6 * scale, 0, Math.PI * 2);
        ctx.fill();

        const coronaSize = (8 + Math.sin(state.frame * 0.2 + i) * 2) * scale;
        ctx.beginPath();
        ctx.arc(px, py, coronaSize, 0, Math.PI * 2);
        ctx.stroke();
    }
};
