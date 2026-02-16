
import { MutableGameState, Projectile } from '../../types';

export const renderEnvironmentProjectile = (ctx: CanvasRenderingContext2D, state: MutableGameState, p: Projectile) => {
    if (p.visualType === 'VOID_TRAIL') {
        // VOID MUD / TAR APPEARANCE
        ctx.save();
        ctx.translate(p.x, p.y);
        
        const seed = (p.x * 0.01 + p.y * 0.01);
        
        // --- ANIMATION LOGIC ---
        const spawnFrame = p.customData?.spawnFrame || 0;
        const age = state.frame - spawnFrame;
        const WARMUP = 60; // 1 expansion
        
        let scale = 1.0;
        let opacity = 1.0;
        
        if (age < WARMUP) {
            // Growth Animation (Ease Out Back for a "burst" effect)
            const t = age / WARMUP;
            // Ease out cubic
            scale = 1 - Math.pow(1 - t, 3);
            opacity = t;
        } else if (p.life < 60) {
            // Shrink death
            scale = p.life / 60;
            opacity = p.life / 60;
        }
        
        ctx.scale(scale, scale);
        ctx.globalAlpha = opacity;

        // --- 1. Main Sludge Body ---
        ctx.beginPath();
        const segments = 16;
        for (let i = 0; i <= segments; i++) {
            const theta = (i / segments) * Math.PI * 2;
            
            // Noise function for wobbly edge
            // Combine multiple sine waves for organic fluid motion
            const noise1 = Math.sin(theta * 3 + state.frame * 0.03 + seed);
            const noise2 = Math.cos(theta * 5 - state.frame * 0.02 + seed * 2);
            const noise3 = Math.sin(theta * 7 + state.frame * 0.05 + seed * 3);
            
            // Radius fluctuates
            // Increased fluctuation during spawn for "boiling" look
            const turbulence = age < WARMUP ? 0.2 : 0.05;
            const r = p.size * (0.9 + (noise1 * turbulence + noise2 * (turbulence*0.6) + noise3 * (turbulence*0.4)));
            
            const px = Math.cos(theta) * r;
            const py = Math.sin(theta) * r;
            
            if (i === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
        }
        ctx.closePath();
        
        // Gradient fill for depth (Center darker, edges lighter)
        const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, p.size);
        grad.addColorStop(0, '#020617'); // Almost black center (slate-950)
        grad.addColorStop(0.7, '#172554'); // Dark Blue/Indigo body
        grad.addColorStop(1, '#312e81'); // Indigo edge
        
        ctx.fillStyle = grad;
        ctx.fill();
        
        // Irregular Border/Rim for surface tension definition
        ctx.strokeStyle = '#4338ca'; // Indigo 700
        ctx.lineWidth = 3;
        ctx.stroke();

        // --- 2. Surface Bubbles (Popping Tar Effect) ---
        // Deterministic bubbles based on frame and position hash so they don't jitter
        for(let i=0; i<4; i++) {
            const offset = i * 23.45; // Arbitrary offsets
            const speed = 0.03 + (i * 0.01);
            const t = (state.frame * speed + seed + offset);
            
            // Cycle: 0 -> PI (Grow), PI -> 2PI (Wait/Hidden)
            const cycle = t % (Math.PI * 3); // Longer wait time
            
            if (cycle < Math.PI) {
                // Bubble is active
                const growth = Math.sin(cycle); // 0 -> 1 -> 0
                const bubbleSize = growth * (p.size * 0.25);
                
                if (bubbleSize > 2) {
                    // Position orbits slowly
                    const orbitAngle = offset + state.frame * 0.005;
                    const dist = (p.size * 0.5) + Math.cos(t) * (p.size * 0.2); // Move in/out slightly
                    
                    const bx = Math.cos(orbitAngle) * dist;
                    const by = Math.sin(orbitAngle) * dist;
                    
                    // Bubble Body
                    ctx.fillStyle = '#4f46e5'; // Indigo 600
                    ctx.beginPath();
                    ctx.arc(bx, by, bubbleSize, 0, Math.PI * 2);
                    ctx.fill();
                    
                    // Specular Highlight (Makes it look wet)
                    ctx.fillStyle = '#ffffff';
                    ctx.globalAlpha = 0.6 * opacity; // Respect parent opacity
                    ctx.beginPath();
                    ctx.arc(bx - bubbleSize*0.3, by - bubbleSize*0.3, bubbleSize*0.25, 0, Math.PI*2);
                    ctx.fill();
                    ctx.globalAlpha = opacity;
                }
            }
        }

        ctx.restore();

    } else if (p.visualType === 'TOXIC_CLOUD') {
        // WARMUP INDICATOR
        if (p.customData?.warmup > 0) {
            ctx.save();
            ctx.globalAlpha = 0.5;
            ctx.strokeStyle = '#10b981';
            ctx.lineWidth = 2;
            
            // Spinning incomplete ring
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, state.frame * 0.2, state.frame * 0.2 + 4);
            ctx.stroke();
            
            // Fading inner circle
            ctx.globalAlpha = 0.2;
            ctx.fillStyle = '#10b981';
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size * (1 - p.customData.warmup / 60), 0, Math.PI*2);
            ctx.fill();
            
            ctx.restore();
            return;
        }

        // Toxic Nebula (Active)
        ctx.save();
        ctx.globalAlpha = 0.4 + Math.sin(state.frame * 0.05) * 0.1;
        const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size);
        grad.addColorStop(0, '#10b981'); // Green center
        grad.addColorStop(0.7, 'rgba(16, 185, 129, 0.3)');
        grad.addColorStop(1, 'transparent');
        
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI*2);
        ctx.fill();
        
        ctx.globalAlpha = 0.2;
        ctx.strokeStyle = '#34d399';
        ctx.lineWidth = 2;
        ctx.beginPath();
        // Wobbly edge
        for(let i=0; i<=20; i++) {
            const angle = (i/20) * Math.PI*2;
            const r = p.size * (0.9 + Math.sin(state.frame*0.1 + i)*0.1);
            if(i===0) ctx.moveTo(p.x + Math.cos(angle)*r, p.y + Math.sin(angle)*r);
            else ctx.lineTo(p.x + Math.cos(angle)*r, p.y + Math.sin(angle)*r);
        }
        ctx.closePath();
        ctx.stroke();
        ctx.restore();

    } else if (p.visualType === 'VOID_MINE') {
        ctx.save();
        const pulse = 1 + Math.sin(state.frame * 0.5) * 0.05;
        const radius = p.size * 0.4 * pulse;
        
        if (radius > 1) {
            ctx.fillStyle = '#000000';
            ctx.beginPath(); 
            ctx.arc(p.x, p.y, radius, 0, Math.PI*2); 
            ctx.fill();
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 1;
            ctx.globalAlpha = 0.5;
            ctx.stroke();
        }
        ctx.restore();

    } else if (p.visualType === 'SOLAR_FLARE') {
        const spawnFrame = p.customData?.spawnFrame || 0;
        const age = state.frame - spawnFrame;
        const SURGE_TIME = 120; // 2 seconds
        
        ctx.save();
        
        // If it's a permanent boss mine, use the surge animation
        if (p.isEnemy && p.life > 9000) {
            if (age < SURGE_TIME) {
                // GROWTH PHASE (Small to Big)
                const progress = age / SURGE_TIME;
                // Linear growth for "filling up" effect
                const scale = progress; 

                // 1. Target Area Warning (Dashed Ring at max size)
                ctx.strokeStyle = 'rgba(239, 68, 68, 0.4)'; // Red-500 faded
                ctx.lineWidth = 2;
                ctx.setLineDash([5, 5]);
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.size, 0, Math.PI*2);
                ctx.stroke();
                ctx.setLineDash([]);

                // 2. Growing Core (Lava expanding)
                const currentSize = p.size * scale;
                ctx.globalAlpha = 0.9;
                ctx.fillStyle = '#7f1d1d'; // Dark magma
                ctx.beginPath(); 
                ctx.arc(p.x, p.y, currentSize, 0, Math.PI*2); 
                ctx.fill();

                // 3. Highlight Edge on growing circle
                ctx.strokeStyle = '#f59e0b'; // Amber
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.arc(p.x, p.y, currentSize, 0, Math.PI*2);
                ctx.stroke();

            } else {
                // ACTIVE PHASE
                // Base Lava
                ctx.shadowBlur = 20;
                ctx.shadowColor = '#fbbf24';
                ctx.fillStyle = '#b91c1c'; // Deep lava red
                ctx.beginPath(); ctx.arc(p.x, p.y, p.size * 0.9, 0, Math.PI*2); ctx.fill();
                
                // Inner Hot Core
                ctx.fillStyle = '#fff7ed'; // White-orange hot center
                const pulse = 0.8 + Math.sin(state.frame * 0.1) * 0.05;
                ctx.beginPath(); ctx.arc(p.x, p.y, p.size * pulse, 0, Math.PI*2); ctx.fill();
                
                // Outer Glow Ring
                ctx.strokeStyle = '#fbbf24';
                ctx.lineWidth = 3;
                ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI*2); ctx.stroke();
            }
        } else {
            // Standard Player/Temp Flares (Legacy)
            ctx.shadowBlur = 20;
            ctx.shadowColor = '#fbbf24';
            ctx.fillStyle = '#fff';
            ctx.beginPath(); ctx.arc(p.x, p.y, p.size * 0.8, 0, Math.PI*2); ctx.fill();
            
            ctx.strokeStyle = '#fbbf24';
            ctx.lineWidth = 3;
            ctx.beginPath(); ctx.arc(p.x, p.y, p.size * 1.2, 0, Math.PI*2); ctx.stroke();
        }
        
        ctx.restore();
    }
};
