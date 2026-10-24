import { MutableGameState, Projectile } from '../../types';
import { getGlowSprite, getCachedRadialGradient } from '../GlowSprites';

const VOID_TRAIL_STOPS: Array<[number, string]> = [
    [0, '#020617'],
    [0.7, '#172554'],
    [1, '#312e81']
];

const TOXIC_CLOUD_STOPS: Array<[number, string]> = [
    [0, '#10b981'],
    [0.7, 'rgba(16, 185, 129, 0.3)'],
    [1, 'transparent']
];

export const renderEnvironmentProjectile = (
    ctx: CanvasRenderingContext2D,
    state: MutableGameState,
    p: Projectile,
    glowEnabled: boolean = true
) => {
    if (p.visualType === 'VOID_TRAIL') {
        ctx.save();
        ctx.translate(p.x, p.y);
        
        const seed = (p.x * 0.01 + p.y * 0.01);
        const spawnFrame = p.customData?.spawnFrame || 0;
        const age = state.frame - spawnFrame;
        const WARMUP = 60;
        
        let scale = 1.0;
        let opacity = 1.0;
        
        if (age < WARMUP) {
            const t = age / WARMUP;
            scale = 1 - Math.pow(1 - t, 3);
            opacity = t;
        } else if (p.life < 60) {
            scale = p.life / 60;
            opacity = p.life / 60;
        }
        
        ctx.scale(scale, scale);
        ctx.globalAlpha = opacity;

        ctx.beginPath();
        const segments = 16;
        for (let i = 0; i <= segments; i++) {
            const theta = (i / segments) * Math.PI * 2;
            const noise1 = Math.sin(theta * 3 + state.frame * 0.03 + seed);
            const noise2 = Math.cos(theta * 5 - state.frame * 0.02 + seed * 2);
            const noise3 = Math.sin(theta * 7 + state.frame * 0.05 + seed * 3);
            const turbulence = age < WARMUP ? 0.2 : 0.05;
            const r = p.size * (0.9 + (noise1 * turbulence + noise2 * (turbulence * 0.6) + noise3 * (turbulence * 0.4)));
            const px = Math.cos(theta) * r;
            const py = Math.sin(theta) * r;
            if (i === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
        }
        ctx.closePath();
        
        ctx.fillStyle = getCachedRadialGradient(ctx, p.size, VOID_TRAIL_STOPS);
        ctx.fill();
        
        ctx.strokeStyle = '#4338ca';
        ctx.lineWidth = 3;
        ctx.stroke();

        for (let i = 0; i < 4; i++) {
            const offset = i * 23.45;
            const speed = 0.03 + (i * 0.01);
            const t = (state.frame * speed + seed + offset);
            const cycle = t % (Math.PI * 3);
            
            if (cycle < Math.PI) {
                const growth = Math.sin(cycle);
                const bubbleSize = growth * (p.size * 0.25);
                
                if (bubbleSize > 2) {
                    const orbitAngle = offset + state.frame * 0.005;
                    const dist = (p.size * 0.5) + Math.cos(t) * (p.size * 0.2);
                    const bx = Math.cos(orbitAngle) * dist;
                    const by = Math.sin(orbitAngle) * dist;
                    
                    ctx.fillStyle = '#4f46e5';
                    ctx.beginPath();
                    ctx.arc(bx, by, bubbleSize, 0, Math.PI * 2);
                    ctx.fill();
                    
                    ctx.fillStyle = '#ffffff';
                    ctx.globalAlpha = 0.6 * opacity;
                    ctx.beginPath();
                    ctx.arc(bx - bubbleSize * 0.3, by - bubbleSize * 0.3, bubbleSize * 0.25, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.globalAlpha = opacity;
                }
            }
        }

        ctx.restore();

    } else if (p.visualType === 'TOXIC_CLOUD' || p.visualType === 'NEBULA_TRAIL') {
        if (p.customData?.warmup > 0) {
            ctx.save();
            ctx.globalAlpha = 0.5;
            ctx.strokeStyle = '#10b981';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, state.frame * 0.2, state.frame * 0.2 + 4);
            ctx.stroke();
            ctx.globalAlpha = 0.2;
            ctx.fillStyle = '#10b981';
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size * (1 - p.customData.warmup / 60), 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
            return;
        }

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.globalAlpha = 0.4 + Math.sin(state.frame * 0.05) * 0.1;
        
        ctx.fillStyle = getCachedRadialGradient(ctx, p.size, TOXIC_CLOUD_STOPS);
        ctx.beginPath();
        ctx.arc(0, 0, p.size, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.globalAlpha = 0.2;
        ctx.strokeStyle = '#34d399';
        ctx.lineWidth = 2;
        ctx.beginPath();
        for (let i = 0; i <= 20; i++) {
            const angle = (i / 20) * Math.PI * 2;
            const r = p.size * (0.9 + Math.sin(state.frame * 0.1 + i) * 0.1);
            if (i === 0) ctx.moveTo(Math.cos(angle) * r, Math.sin(angle) * r);
            else ctx.lineTo(Math.cos(angle) * r, Math.sin(angle) * r);
        }
        ctx.closePath();
        ctx.stroke();
        ctx.restore();

    } else if (p.visualType === 'VOID_MINE') {
        const pulse = 1 + Math.sin(state.frame * 0.5) * 0.05;
        const radius = p.size * 0.4 * pulse;
        
        if (radius > 1) {
            ctx.fillStyle = '#000000';
            ctx.beginPath(); 
            ctx.arc(p.x, p.y, radius, 0, Math.PI * 2); 
            ctx.fill();
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 1;
            const prevAlpha = ctx.globalAlpha;
            ctx.globalAlpha = prevAlpha * 0.5;
            ctx.stroke();
            ctx.globalAlpha = prevAlpha;
        }

    } else if (p.visualType === 'SOLAR_FLARE') {
        const spawnFrame = p.customData?.spawnFrame || 0;
        const age = state.frame - spawnFrame;
        const SURGE_TIME = 120;
        
        if (p.isEnemy && p.life > 9000) {
            if (age < SURGE_TIME) {
                const progress = age / SURGE_TIME;
                const scale = progress;

                ctx.strokeStyle = 'rgba(239, 68, 68, 0.4)';
                ctx.lineWidth = 2;
                ctx.setLineDash([5, 5]);
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                ctx.stroke();
                ctx.setLineDash([]);

                const currentSize = p.size * scale;
                const prevAlpha = ctx.globalAlpha;
                ctx.globalAlpha = prevAlpha * 0.9;
                ctx.fillStyle = '#7f1d1d';
                ctx.beginPath(); 
                ctx.arc(p.x, p.y, currentSize, 0, Math.PI * 2); 
                ctx.fill();
                ctx.globalAlpha = prevAlpha;

                ctx.strokeStyle = '#f59e0b';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.arc(p.x, p.y, currentSize, 0, Math.PI * 2);
                ctx.stroke();
            } else {
                if (glowEnabled) {
                    const sfGlowSize1 = p.size * 0.9 * 2 * 2;
                    const sfGlowSprite1 = getGlowSprite('#fbbf24', 256);
                    ctx.drawImage(sfGlowSprite1, p.x - sfGlowSize1 / 2, p.y - sfGlowSize1 / 2, sfGlowSize1, sfGlowSize1);
                }

                ctx.fillStyle = '#b91c1c';
                ctx.beginPath(); ctx.arc(p.x, p.y, p.size * 0.9, 0, Math.PI * 2); ctx.fill();
                
                ctx.fillStyle = '#fff7ed';
                const pulse = 0.8 + Math.sin(state.frame * 0.1) * 0.05;
                ctx.beginPath(); ctx.arc(p.x, p.y, p.size * pulse, 0, Math.PI * 2); ctx.fill();
                
                ctx.strokeStyle = '#fbbf24';
                ctx.lineWidth = 3;
                ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx.stroke();
            }
        } else {
            if (glowEnabled) {
                const sfGlowSize2 = p.size * 0.8 * 2 * 2;
                const sfGlowSprite2 = getGlowSprite('#fbbf24', 256);
                ctx.drawImage(sfGlowSprite2, p.x - sfGlowSize2 / 2, p.y - sfGlowSize2 / 2, sfGlowSize2, sfGlowSize2);
            }

            ctx.fillStyle = '#fff';
            ctx.beginPath(); ctx.arc(p.x, p.y, p.size * 0.8, 0, Math.PI * 2); ctx.fill();
            
            ctx.strokeStyle = '#fbbf24';
            ctx.lineWidth = 3;
            ctx.beginPath(); ctx.arc(p.x, p.y, p.size * 1.2, 0, Math.PI * 2); ctx.stroke();
        }
    }
};
