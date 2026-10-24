import { MutableGameState, Projectile } from '../../types';
import { WORLD_SIZE } from '../../Constants';
import { getGlowSprite } from '../GlowSprites';
import { getQuality } from '../../Quality';

export const renderWeaponProjectile = (
    ctx: CanvasRenderingContext2D,
    state: MutableGameState,
    p: Projectile,
    glowEnabled: boolean = getQuality(state.performanceMode).glow
) => {
    if (p.visualType === 'RAILGUN_BEAM') {
        const isHorizontal = p.vx > 0.5;
        const width = p.size;
        const length = WORLD_SIZE * 2;
        
        const age = p.customData?.spawnFrame ? state.frame - p.customData.spawnFrame : 0;
        const isPermanent = p.life > 9000;
        
        let phase = 'FADE';
        if (isPermanent) {
            phase = age < 60 ? 'WARN' : 'ACTIVE';
        } else {
            if (p.life > 80) phase = 'WARN';
            else if (p.life > 20) phase = 'ACTIVE';
        }

        const prevAlpha = ctx.globalAlpha;
        if (phase === 'WARN') {
            const pulse = Math.abs(Math.sin(state.frame * 0.5));
            ctx.globalAlpha = 0.3 * pulse;
            ctx.fillStyle = '#ef4444';
            
            if (isHorizontal) {
                ctx.fillRect(p.x - length / 2, p.y - width / 2, length, width);
                ctx.globalAlpha = 0.8 * pulse;
                ctx.fillRect(p.x - length / 2, p.y - 1, length, 2);
            } else {
                ctx.fillRect(p.x - width / 2, p.y - length / 2, width, length);
                ctx.globalAlpha = 0.8 * pulse;
                ctx.fillRect(p.x - 1, p.y - length / 2, 2, length);
            }
        } else if (phase === 'ACTIVE') {
            ctx.globalAlpha = 0.9;
            ctx.fillStyle = '#ef4444'; 
            
            if (glowEnabled) {
                const redGlow = getGlowSprite('#dc2626', 128);
                if (isHorizontal) {
                    ctx.drawImage(redGlow, p.x - length / 2, p.y - width * 3 / 2, length, width * 3);
                } else {
                    ctx.drawImage(redGlow, p.x - width * 3 / 2, p.y - length / 2, width * 3, length);
                }
            }

            if (isHorizontal) {
                ctx.fillRect(p.x - length / 2, p.y - width / 2, length, width);
            } else {
                ctx.fillRect(p.x - width / 2, p.y - length / 2, width, length);
            }

            const coreWidth = width * 0.6;
            if (glowEnabled) {
                const pinkGlow = getGlowSprite('#fbcfe8', 128);
                if (isHorizontal) {
                    ctx.drawImage(pinkGlow, p.x - length / 2, p.y - coreWidth * 3 / 2, length, coreWidth * 3);
                } else {
                    ctx.drawImage(pinkGlow, p.x - coreWidth * 3 / 2, p.y - length / 2, coreWidth * 3, length);
                }
            }

            ctx.fillStyle = '#fbcfe8';
            if (isHorizontal) {
                ctx.fillRect(p.x - length / 2, p.y - coreWidth / 2, length, coreWidth);
                ctx.fillStyle = '#fff';
                ctx.fillRect(p.x - length / 2, p.y - 2, length, 4);
            } else {
                ctx.fillRect(p.x - coreWidth / 2, p.y - length / 2, coreWidth, length);
                ctx.fillStyle = '#fff';
                ctx.fillRect(p.x - 2, p.y - length / 2, 4, length);
            }
        } else {
            ctx.globalAlpha = Math.max(0, p.life / 20);
            ctx.fillStyle = '#ef4444';
            if (isHorizontal) {
                ctx.fillRect(p.x - length / 2, p.y - width / 2, length, width);
            } else {
                ctx.fillRect(p.x - width / 2, p.y - length / 2, width, length);
            }
        }
        ctx.globalAlpha = prevAlpha;

    } else if (p.visualType === 'HOMING_MISSILE') {
        const angle = Math.atan2(p.vy, p.vx);
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);
        
        ctx.fillStyle = '#0f172a';
        ctx.beginPath();
        ctx.moveTo(p.x + cos * 18, p.y + sin * 18);
        ctx.lineTo(p.x + cos * -10 - sin * 10, p.y + sin * -10 + cos * 10);
        ctx.lineTo(p.x + cos * -5, p.y + sin * -5);
        ctx.lineTo(p.x + cos * -10 + sin * 10, p.y + sin * -10 - cos * 10);
        ctx.closePath();
        ctx.fill();
        
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.stroke();
        
        if (state.frame % 4 < 2) {
            ctx.fillStyle = p.color;
            ctx.beginPath();
            ctx.moveTo(p.x + cos * -6, p.y + sin * -6);
            ctx.lineTo(p.x + cos * -14 - sin * 4, p.y + sin * -14 + cos * 4);
            ctx.lineTo(p.x + cos * -14 + sin * 4, p.y + sin * -14 - cos * 4);
            ctx.closePath();
            ctx.fill();
        }

    } else if (p.visualType === 'FIREFLY') {
        if (glowEnabled) {
            const ffGlowSize = p.size * 4;
            const ffGlow = getGlowSprite('#fef08a', 64);
            ctx.drawImage(ffGlow, p.x - ffGlowSize / 2, p.y - ffGlowSize / 2, ffGlowSize, ffGlowSize);
        }

        ctx.fillStyle = '#fef08a';
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();

    } else if (p.visualType === 'SINGULARITY') {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = '#000';
        ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,0.2)';
        ctx.lineWidth = 1;
        ctx.stroke();

    } else if (p.visualType === 'PLASMA_WHIP') {
        if (p.customData) {
            const startX = state.player.x;
            const startY = state.player.y;
            const endX = p.customData.targetX;
            const endY = p.customData.targetY;
            const lifeRatio = Math.max(0.05, p.life / 15);
            
            const prevCap = ctx.lineCap;
            ctx.lineCap = 'round';
            
            ctx.beginPath();
            ctx.moveTo(startX, startY);
            const midX = (startX + endX) / 2;
            const midY = (startY + endY) / 2;
            const offset = 50 * Math.sin(lifeRatio * Math.PI * 2);
            ctx.quadraticCurveTo(midX + offset, midY + offset, endX, endY);
            
            if (glowEnabled) {
                ctx.lineWidth = 16 * lifeRatio;
                ctx.strokeStyle = 'rgba(251, 191, 36, 0.5)';
                ctx.stroke();
            }

            ctx.lineWidth = 8 * lifeRatio;
            ctx.strokeStyle = '#f59e0b';
            ctx.stroke();
            
            ctx.lineWidth = 4 * lifeRatio;
            ctx.strokeStyle = '#ffffff';
            ctx.stroke();
            
            ctx.lineCap = prevCap;
        }
    }
};
