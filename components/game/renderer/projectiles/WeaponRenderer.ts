
import { MutableGameState, Projectile } from '../../types';
import { WORLD_SIZE } from '../../Constants';

export const renderWeaponProjectile = (ctx: CanvasRenderingContext2D, state: MutableGameState, p: Projectile) => {
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

        ctx.save();
        if (phase === 'WARN') {
            const pulse = Math.abs(Math.sin(state.frame * 0.5));
            ctx.globalAlpha = 0.3 * pulse;
            ctx.fillStyle = '#ef4444';
            
            if (isHorizontal) {
                ctx.fillRect(p.x - length/2, p.y - width/2, length, width);
                ctx.globalAlpha = 0.8 * pulse;
                ctx.fillRect(p.x - length/2, p.y - 1, length, 2);
            } else {
                ctx.fillRect(p.x - width/2, p.y - length/2, width, length);
                ctx.globalAlpha = 0.8 * pulse;
                ctx.fillRect(p.x - 1, p.y - length/2, 2, length);
            }
        } else if (phase === 'ACTIVE') {
            ctx.globalAlpha = 0.9;
            ctx.shadowColor = '#dc2626'; 
            ctx.shadowBlur = 30;
            ctx.fillStyle = '#ef4444'; 
            
            if (isHorizontal) {
                ctx.fillRect(p.x - length/2, p.y - width/2, length, width);
            } else {
                ctx.fillRect(p.x - width/2, p.y - length/2, width, length);
            }

            ctx.shadowBlur = 10;
            ctx.shadowColor = '#fbcfe8'; 
            ctx.fillStyle = '#fbcfe8';   
            
            const coreWidth = width * 0.6;
            
            if (isHorizontal) {
                ctx.fillRect(p.x - length/2, p.y - coreWidth/2, length, coreWidth);
                    ctx.fillStyle = '#fff';
                    ctx.fillRect(p.x - length/2, p.y - 2, length, 4);
            } else {
                ctx.fillRect(p.x - coreWidth/2, p.y - length/2, coreWidth, length);
                    ctx.fillStyle = '#fff';
                    ctx.fillRect(p.x - 2, p.y - length/2, 4, length);
            }

        } else {
            ctx.globalAlpha = p.life / 20;
            ctx.fillStyle = '#ef4444';
            if (isHorizontal) {
                ctx.fillRect(p.x - length/2, p.y - width/2, length, width);
            } else {
                ctx.fillRect(p.x - width/2, p.y - length/2, width, length);
            }
        }
        ctx.restore();

    } else if (p.visualType === 'HOMING_MISSILE') {
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(Math.atan2(p.vy, p.vx));
        ctx.fillStyle = p.color;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 10;
        
        ctx.beginPath();
        ctx.moveTo(15, 0); 
        ctx.lineTo(-8, 8); 
        ctx.lineTo(-4, 0); 
        ctx.lineTo(-8, -8); 
        ctx.closePath();
        ctx.fill();
        
        if (state.frame % 4 < 2) {
            ctx.fillStyle = '#fff';
            ctx.beginPath();
            ctx.moveTo(-6, 0);
            ctx.lineTo(-12, 3);
            ctx.lineTo(-12, -3);
            ctx.fill();
        }

        ctx.restore();

    } else if (p.visualType === 'FIREFLY') {
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.shadowColor = '#fef08a';
        ctx.shadowBlur = 15;
        ctx.fillStyle = '#fef08a';
        ctx.beginPath();
        ctx.arc(0, 0, p.size, 0, Math.PI*2);
        ctx.fill();
        ctx.restore();
        ctx.shadowBlur = 0;

    } else if (p.visualType === 'SINGULARITY') {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI*2);
        ctx.fillStyle = '#000';
        ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,0.2)';
        ctx.lineWidth = 1;
        ctx.stroke();

    } else if (p.visualType === 'PLASMA_WHIP') {
        // Gold Energy Lash
        if (p.customData) {
            const startX = state.player.x;
            const startY = state.player.y;
            const endX = p.customData.targetX;
            const endY = p.customData.targetY;
            
            const lifeRatio = p.life / 15; // 1.0 to 0.0
            
            ctx.save();
            ctx.lineCap = 'round';
            ctx.shadowBlur = 20 * lifeRatio;
            ctx.shadowColor = '#fbbf24'; // Amber
            
            // Core Beam
            ctx.beginPath();
            ctx.moveTo(startX, startY);
            
            // Bezier curve for "whip" effect
            // Control point varies with time to make it snap
            const midX = (startX + endX) / 2;
            const midY = (startY + endY) / 2;
            const offset = 50 * Math.sin(lifeRatio * Math.PI * 2);
            
            ctx.quadraticCurveTo(midX + offset, midY + offset, endX, endY);
            
            ctx.lineWidth = 8 * lifeRatio;
            ctx.strokeStyle = '#f59e0b'; // Darker amber edge
            ctx.stroke();
            
            // Inner Core
            ctx.lineWidth = 4 * lifeRatio;
            ctx.strokeStyle = '#ffffff'; // White hot center
            ctx.stroke();
            
            ctx.restore();
        }
    }
};
