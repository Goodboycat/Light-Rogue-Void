
import { MutableGameState, Projectile } from '../../types';
import { WORLD_SIZE } from '../../Constants';

export const renderBossProjectile = (ctx: CanvasRenderingContext2D, state: MutableGameState, p: Projectile) => {
    if (p.visualType === 'BOSS_SINGULARITY') {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI*2);
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
        // Rotating Laser (Deprecated but kept for safety)
        ctx.save();
        ctx.translate(p.x, p.y);
        const angle = p.customData?.angle || 0;
        ctx.rotate(angle);
        const length = WORLD_SIZE * 2;
        const width = p.size;
        ctx.shadowBlur = 20;
        ctx.shadowColor = '#ef4444';
        ctx.fillStyle = '#b91c1c';
        ctx.fillRect(0, -width/2, length, width);
        ctx.fillStyle = '#fca5a5';
        ctx.fillRect(0, -width/4, length, width/2);
        ctx.restore();

    } else if (p.visualType === 'SOLAR_BARRIER') {
        // Massive Expanding Wall
        ctx.save();
        ctx.translate(p.x, p.y);
        // Rotate perpendicular to movement vector
        const angle = p.customData?.angle || 0;
        ctx.rotate(angle);
        
        // Use finite length from growth logic
        const length = p.customData?.currentLength || 100;
        const thickness = p.size;
        
        // Draw the Wall (Perpendicular to movement)
        // Since we rotated by 'angle' (movement dir), X is forward.
        // We want a wall perpendicular to X, so it lies along Y.
        // It should have thickness along X.
        
        ctx.shadowBlur = 15;
        ctx.shadowColor = '#fbbf24';
        
        // Main Body (Red-Orange)
        ctx.fillStyle = 'rgba(220, 38, 38, 0.85)'; // red-600 with transparency
        ctx.fillRect(0, -length/2, thickness, length); 
        
        // Leading Edge (Bright Yellow) - Assuming X+ is forward
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(thickness - 8, -length/2, 8, length);
        
        // Trailing Edge (Darker)
        ctx.fillStyle = '#7f1d1d';
        ctx.fillRect(0, -length/2, 4, length);
        
        ctx.restore();

    } else if (p.visualType === 'CRIMSON_COMET') {
        // Glowing Red Body with White Luna (Crescent) shape
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(Math.atan2(p.vy, p.vx));
        
        // Comet Glow
        ctx.shadowBlur = 30;
        ctx.shadowColor = '#dc2626';
        
        // Main Body (Red)
        ctx.fillStyle = '#b91c1c';
        ctx.beginPath();
        ctx.arc(0, 0, p.size, 0, Math.PI*2);
        ctx.fill();

        // Inner Luna (White Crescent)
        // 1. Draw White Circle
        ctx.shadowBlur = 10;
        ctx.shadowColor = '#ffffff';
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(0, 0, p.size * 0.6, 0, Math.PI*2);
        ctx.fill();
        
        // 2. Draw Red Circle overlapping the back half to create crescent facing forward
        ctx.shadowBlur = 0;
        ctx.fillStyle = '#b91c1c'; // Same as body
        ctx.beginPath();
        ctx.arc(-p.size * 0.3, 0, p.size * 0.5, 0, Math.PI*2);
        ctx.fill();

        ctx.restore();

    } else if (p.visualType === 'VOID_NOVA') {
        // MASSIVE EXPLOSION RING
        ctx.save();
        
        // Fade opacity over 60 frames (1 second)
        ctx.globalAlpha = Math.max(0, p.life / 60); 
        
        // GIANT BLACK CIRCLE (Covers screen)
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI*2);
        ctx.fillStyle = '#000000';
        ctx.fill();
        
        // EXPANDING SHOCKWAVE (White)
        const progress = 1 - (p.life / 60); // 0 to 1
        const waveRadius = progress * 5000; // Expands outward rapidly
        
        ctx.beginPath();
        ctx.arc(p.x, p.y, waveRadius, 0, Math.PI*2);
        ctx.strokeStyle = `rgba(255, 255, 255, ${1 - progress})`; // Fade ring as it expands
        ctx.lineWidth = 100 * (1 - progress);
        ctx.stroke();

        ctx.restore();

    } else if (p.visualType === 'VOID_NOVA_AFTERMATH') {
        // PERMANENT PITCH BLACK HOLE WITH DARKNESS AURA
        ctx.save();
        ctx.translate(p.x, p.y);

        // 1. Dark Purple Aura (Jagged) - Matches Darkness Boss
        ctx.shadowBlur = 60;
        ctx.shadowColor = '#5b21b6'; // Violet 800
        ctx.fillStyle = '#2e1065';   // Violet 950
        
        ctx.beginPath();
        const spikeCount = 50; 
        const frame = state.frame;
        
        for(let i=0; i<=spikeCount; i++) {
            const angle = (i/spikeCount) * Math.PI * 2 + (frame * 0.005);
            // Noise driven radius
            const noise = Math.sin(frame * 0.05 + i * 1.2) + Math.cos(frame * 0.1 + i * 2);
            const r = p.size * (1.0 + Math.abs(noise) * 0.1); 
            const px = Math.cos(angle) * r;
            const py = Math.sin(angle) * r;
            if (i===0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.fill();

        // 2. Pitch Black Core
        ctx.shadowBlur = 0;
        ctx.beginPath();
        ctx.arc(0, 0, p.size * 0.9, 0, Math.PI*2);
        ctx.fillStyle = '#000000';
        ctx.fill();

        ctx.restore();
    }
};
