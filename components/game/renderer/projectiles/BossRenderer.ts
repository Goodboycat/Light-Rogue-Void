import { MutableGameState, Projectile } from '../../types';
import { WORLD_SIZE } from '../../Constants';
import { getGlowSprite } from '../GlowSprites';
import { getQuality } from '../../Quality';

export const renderBossProjectile = (
    ctx: CanvasRenderingContext2D,
    state: MutableGameState,
    p: Projectile,
    glowEnabled: boolean = getQuality(state.performanceMode).glow
) => {
    if (p.visualType === 'BOSS_SINGULARITY') {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = '#000';
        ctx.fill();
        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 3;
        ctx.stroke();
        
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * 1.5, state.frame * 0.1, state.frame * 0.1 + Math.PI);
        ctx.strokeStyle = '#b91c1c';
        ctx.stroke();
    } else if (p.visualType === 'DEATH_RAY') {
        ctx.save();
        ctx.translate(p.x, p.y);
        const angle = p.customData?.angle || 0;
        ctx.rotate(angle);
        const length = WORLD_SIZE * 2;
        const width = p.size;
        
        if (glowEnabled) {
            const drGlowSprite = getGlowSprite('#ef4444', 128);
            ctx.drawImage(drGlowSprite, 0, -width * 3 / 2, length, width * 3);
        }

        ctx.fillStyle = '#b91c1c';
        ctx.fillRect(0, -width / 2, length, width);
        ctx.fillStyle = '#fca5a5';
        ctx.fillRect(0, -width / 4, length, width / 2);
        ctx.restore();

    } else if (p.visualType === 'SOLAR_BARRIER') {
        ctx.save();
        ctx.translate(p.x, p.y);
        const angle = p.customData?.angle || 0;
        ctx.rotate(angle);
        
        const length = p.customData?.currentLength || 100;
        const thickness = p.size;
        
        if (glowEnabled) {
            const sbGlowSprite = getGlowSprite('#fbbf24', 128);
            ctx.drawImage(sbGlowSprite, thickness / 2 - thickness * 2, -length / 2, thickness * 4, length);
        }
        
        ctx.fillStyle = 'rgba(220, 38, 38, 0.85)';
        ctx.fillRect(0, -length / 2, thickness, length); 
        
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(thickness - 8, -length / 2, 8, length);
        
        ctx.fillStyle = '#7f1d1d';
        ctx.fillRect(0, -length / 2, 4, length);
        
        ctx.restore();

    } else if (p.visualType === 'CRIMSON_COMET') {
        const angle = Math.atan2(p.vy, p.vx);
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);
        
        if (glowEnabled) {
            const ccGlowSize = p.size * 2.5;
            const ccGlowSprite = getGlowSprite('#dc2626', 128);
            ctx.drawImage(ccGlowSprite, p.x - ccGlowSize / 2, p.y - ccGlowSize / 2, ccGlowSize, ccGlowSize);
        }
        
        ctx.fillStyle = '#b91c1c';
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();

        if (glowEnabled) {
            const ccInnerGlowSize = p.size * 2.4;
            const ccInnerGlowSprite = getGlowSprite('#ffffff', 64);
            ctx.drawImage(ccInnerGlowSprite, p.x - ccInnerGlowSize / 2, p.y - ccInnerGlowSize / 2, ccInnerGlowSize, ccInnerGlowSize);
        }

        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * 0.6, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.fillStyle = '#b91c1c';
        ctx.beginPath();
        ctx.arc(p.x - cos * p.size * 0.3, p.y - sin * p.size * 0.3, p.size * 0.5, 0, Math.PI * 2);
        ctx.fill();

    } else if (p.visualType === 'VOID_NOVA') {
        const prevAlpha = ctx.globalAlpha;
        ctx.globalAlpha = Math.max(0, p.life / 60); 
        
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = '#000000';
        ctx.fill();
        
        const progress = 1 - (p.life / 60);
        const waveRadius = progress * 5000;
        
        ctx.beginPath();
        ctx.arc(p.x, p.y, waveRadius, 0, Math.PI * 2);
        ctx.strokeStyle = '#ffffff';
        ctx.globalAlpha = Math.max(0, (1 - progress) * (p.life / 60));
        ctx.lineWidth = Math.max(1, 100 * (1 - progress));
        ctx.stroke();

        ctx.globalAlpha = prevAlpha;

    } else if (p.visualType === 'VOID_NOVA_AFTERMATH') {
        if (glowEnabled) {
            const vnaGlowSize = p.size * 2.5;
            const vnaGlowSprite = getGlowSprite('#9333ea', 256);
            ctx.drawImage(vnaGlowSprite, p.x - vnaGlowSize / 2, p.y - vnaGlowSize / 2, vnaGlowSize, vnaGlowSize);
        }
        
        ctx.fillStyle = '#000000';
        ctx.beginPath();
        const spikeCount = 50; 
        const frame = state.frame;
        
        for (let i = 0; i <= spikeCount; i++) {
            const angle = (i / spikeCount) * Math.PI * 2 + (frame * 0.005);
            const noise = Math.sin(frame * 0.05 + i * 1.2) + Math.cos(frame * 0.1 + i * 2);
            const r = p.size * (1.0 + Math.abs(noise) * 0.1); 
            const px = p.x + Math.cos(angle) * r;
            const py = p.y + Math.sin(angle) * r;
            if (i === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.fill();

        ctx.strokeStyle = '#a855f7';
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * 0.9, 0, Math.PI * 2);
        ctx.fillStyle = '#000000';
        ctx.fill();
    }
};
