
import { Enemy } from '../types';

const drawHexagon = (ctx: CanvasRenderingContext2D, x: number, y: number, r: number) => {
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
        const angle = (Math.PI / 3) * i;
        ctx.lineTo(x + r * Math.cos(angle), y + r * Math.sin(angle));
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
};

export const drawEnemy = (ctx: CanvasRenderingContext2D, enemy: Enemy, frame: number) => {
    ctx.save();
    ctx.translate(enemy.x, enemy.y);
    
    // Hit Flash
    if (enemy.projectileImmunity > 0) {
        ctx.globalCompositeOperation = 'overlay';
        ctx.fillStyle = '#fff';
    } else {
        ctx.fillStyle = enemy.def.color;
    }
    
    ctx.strokeStyle = enemy.def.glowColor;
    ctx.lineWidth = 2;

    const size = enemy.def.size;

    switch (enemy.def.visualType) {
        case 'HIVE':
            // Base Core (Pulsating)
            const breath = (Math.sin(frame * 0.05) + 1) / 2; // 0 to 1
            ctx.shadowBlur = 15;
            ctx.shadowColor = enemy.def.glowColor;
            
            // Core
            ctx.beginPath();
            ctx.arc(0, 0, size * 0.4, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
            ctx.shadowBlur = 0;

            // Construction Ring 1
            const hexSize = size * 0.22;
            ctx.lineWidth = 1.5;
            for(let i=0; i<6; i++) {
                const angle = (i / 6) * Math.PI * 2 + (frame * 0.01);
                const dist = (size * 0.65) + (breath * 5); 
                const hx = Math.cos(angle) * dist;
                const hy = Math.sin(angle) * dist;
                
                ctx.globalAlpha = 0.3;
                ctx.beginPath();
                ctx.moveTo(0,0);
                ctx.lineTo(hx, hy);
                ctx.stroke();
                ctx.globalAlpha = 1.0;
                drawHexagon(ctx, hx, hy, hexSize);
            }
            
            // Construction Ring 2
            ctx.fillStyle = enemy.def.glowColor; 
            for(let i=0; i<12; i++) {
                const angle = (i / 12) * Math.PI * 2 - (frame * 0.005);
                const isBroken = i % 2 === 0;
                const offset = Math.sin(frame * 0.05 + i) * 8;
                const dist = (size * 1.0) + offset + (breath * 12);
                const hx = Math.cos(angle) * dist;
                const hy = Math.sin(angle) * dist;
                
                ctx.globalAlpha = 0.6 + 0.4 * Math.sin(frame * 0.1 + i);
                if (isBroken) {
                    ctx.beginPath(); ctx.arc(hx, hy, hexSize * 0.3, 0, Math.PI*2); ctx.fill();
                } else {
                    drawHexagon(ctx, hx, hy, hexSize * 0.8);
                }
                ctx.globalAlpha = 1.0;
            }
            break;

        case 'WARDEN':
            // THE VOID WARDEN: Rotating Cubes/Diamonds
            ctx.shadowBlur = 20;
            ctx.shadowColor = enemy.def.glowColor;
            
            // Central Diamond
            ctx.rotate(frame * 0.02);
            ctx.beginPath();
            ctx.rect(-size*0.4, -size*0.4, size*0.8, size*0.8);
            ctx.fill();
            ctx.stroke();
            
            // Inner Spinning Frame
            ctx.rotate(-frame * 0.04);
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 3;
            ctx.strokeRect(-size*0.6, -size*0.6, size*1.2, size*1.2);
            
            // Outer Glitchy Frame
            ctx.rotate(frame * 0.01);
            ctx.strokeStyle = enemy.def.glowColor;
            ctx.lineWidth = 2;
            const glitchOffset = Math.sin(frame * 0.5) * 5;
            ctx.strokeRect(-size*0.8 - glitchOffset, -size*0.8 + glitchOffset, size*1.6, size*1.6);
            
            // Corner Runes
            for(let i=0; i<4; i++) {
                ctx.rotate(Math.PI/2);
                ctx.fillStyle = '#fff';
                ctx.beginPath();
                ctx.arc(size, size, 4, 0, Math.PI*2);
                ctx.fill();
            }
            break;

        case 'ECLIPSE':
            // CRIMSON ECLIPSE: Black Star with Red Corona
            // Jagged Corona (Behind)
            ctx.fillStyle = '#b91c1c'; // Dark Red
            ctx.shadowBlur = 30;
            ctx.shadowColor = '#ef4444';
            ctx.beginPath();
            for(let i=0; i<16; i++) {
                const angle = (i/16) * Math.PI*2 + (frame * 0.02);
                const rOuter = size * 1.4 + Math.sin(frame * 0.2 + i * 10) * 10;
                const rInner = size * 0.8;
                ctx.lineTo(Math.cos(angle)*rOuter, Math.sin(angle)*rOuter);
                ctx.lineTo(Math.cos(angle + 0.2)*rInner, Math.sin(angle + 0.2)*rInner);
            }
            ctx.closePath();
            ctx.fill();
            
            // Main Body (Black Void)
            ctx.shadowBlur = 0;
            ctx.fillStyle = '#000';
            ctx.beginPath();
            ctx.arc(0, 0, size * 0.9, 0, Math.PI*2);
            ctx.fill();
            
            // Burning Rim (Red)
            ctx.strokeStyle = '#ef4444';
            ctx.lineWidth = 4;
            ctx.beginPath();
            ctx.arc(0, 0, size * 0.9, 0, Math.PI*2);
            ctx.stroke();
            break;

        case 'NEUTRON':
            // COLLAPSING NEUTRON: Tiny bright core, massive accretion disk
            // Accretion Disk (Swirling Lines)
            ctx.shadowBlur = 10;
            ctx.shadowColor = '#38bdf8';
            ctx.lineWidth = 2;
            ctx.strokeStyle = '#0ea5e9';
            
            // Draw 3 spiral arms
            for(let arm=0; arm<3; arm++) {
                ctx.beginPath();
                for(let i=0; i<20; i++) {
                    const angle = (frame * -0.2) + (arm * (Math.PI*2/3)) + (i * 0.2);
                    const radius = size * 0.2 + (i * size * 0.06);
                    const px = Math.cos(angle) * radius;
                    const py = Math.sin(angle) * radius;
                    if (i===0) ctx.moveTo(px, py);
                    else ctx.lineTo(px, py);
                }
                ctx.stroke();
            }
            
            // Event Horizon
            ctx.fillStyle = '#000';
            ctx.beginPath();
            ctx.arc(0, 0, size * 0.3, 0, Math.PI*2);
            ctx.fill();

            // Core (Blinding White)
            ctx.shadowBlur = 40;
            ctx.shadowColor = '#fff';
            ctx.fillStyle = '#fff';
            ctx.beginPath();
            ctx.arc(0, 0, size * 0.15, 0, Math.PI*2);
            ctx.fill();
            break;

        case 'TITAN':
            // ENTROPY TITAN: Mechanical Fortress
            ctx.shadowBlur = 15;
            ctx.shadowColor = '#84cc16';
            
            // Center Core (Hexagon)
            ctx.fillStyle = '#1a2e05'; // Dark Green
            ctx.strokeStyle = '#bef264'; // Lime
            ctx.lineWidth = 3;
            drawHexagon(ctx, 0, 0, size * 0.6);
            
            // Inner Core Pulse
            const pulse = 0.5 + Math.sin(frame * 0.1) * 0.2;
            ctx.fillStyle = `rgba(132, 204, 22, ${pulse})`;
            ctx.beginPath();
            ctx.arc(0, 0, size * 0.2, 0, Math.PI*2);
            ctx.fill();

            // Orbiting Heavy Plating (Shields)
            const plateCount = 4;
            for(let i=0; i<plateCount; i++) {
                const angle = (frame * 0.02) + (i * (Math.PI*2/plateCount));
                const dist = size * 1.1;
                
                const px = Math.cos(angle) * dist;
                const py = Math.sin(angle) * dist;
                
                // Connector
                ctx.strokeStyle = 'rgba(132, 204, 22, 0.3)';
                ctx.lineWidth = 4;
                ctx.beginPath(); ctx.moveTo(0,0); ctx.lineTo(px, py); ctx.stroke();
                
                // Plate
                ctx.save();
                ctx.translate(px, py);
                ctx.rotate(angle + Math.PI/2); // Face inward
                ctx.fillStyle = '#3f6212';
                ctx.strokeStyle = '#84cc16';
                ctx.lineWidth = 2;
                
                // Draw trapezoid shape
                ctx.beginPath();
                ctx.moveTo(-15, -10);
                ctx.lineTo(15, -10);
                ctx.lineTo(25, 10);
                ctx.lineTo(-25, 10);
                ctx.closePath();
                ctx.fill();
                ctx.stroke();
                
                ctx.restore();
            }
            break;

        case 'DARKNESS':
            // THE END: PURE CONTRAST (Now Dark Purple)
            // 1. The Aura (Jagged, static-like interference) - DARK PURPLE
            ctx.shadowBlur = 60;
            ctx.shadowColor = '#5b21b6'; // Violet 800
            ctx.fillStyle = '#2e1065';   // Violet 950 (Darkest Purple)
            
            ctx.beginPath();
            const spikeCount = 40;
            for(let i=0; i<=spikeCount; i++) {
                const angle = (i/spikeCount) * Math.PI * 2 + (frame * 0.01);
                // Noise driven radius
                const noise = Math.sin(frame * 0.1 + i * 1.5) + Math.cos(frame * 0.2 + i * 3);
                const r = size * (1.0 + Math.abs(noise) * 0.15);
                const px = Math.cos(angle) * r;
                const py = Math.sin(angle) * r;
                if (i===0) ctx.moveTo(px, py);
                else ctx.lineTo(px, py);
            }
            ctx.closePath();
            ctx.fill();
            
            // 2. The Void (Absolute Black Circle)
            ctx.shadowBlur = 0;
            ctx.fillStyle = '#000000';
            ctx.beginPath();
            ctx.arc(0, 0, size * 0.9, 0, Math.PI * 2);
            ctx.fill();
            
            // 3. Inner Accretion (Rings) - DARK PURPLE TINT
            ctx.strokeStyle = 'rgba(139, 92, 246, 0.4)'; // Violet 500 alpha
            ctx.lineWidth = 2;
            
            // Ring 1 (Slow)
            ctx.beginPath();
            ctx.ellipse(0, 0, size * 0.7, size * 0.2, frame * 0.02, 0, Math.PI * 2);
            ctx.stroke();
            
            // Ring 2 (Fast, inverse)
            ctx.strokeStyle = 'rgba(167, 139, 250, 0.6)'; // Violet 400 alpha
            ctx.beginPath();
            ctx.ellipse(0, 0, size * 0.5, size * 0.15, -frame * 0.03 + Math.PI/3, 0, Math.PI * 2);
            ctx.stroke();

            // 4. The Eye of Non-Existence (Center)
            // A tiny white dot that flickers, opposite of the player
            const flicker = Math.random() > 0.9 ? 0 : 3;
            ctx.fillStyle = '#ffffff';
            ctx.shadowColor = '#ffffff';
            ctx.shadowBlur = 10;
            ctx.beginPath();
            ctx.arc(0, 0, flicker, 0, Math.PI*2);
            ctx.fill();
            break;

        case 'CRAB':
            ctx.strokeStyle = enemy.def.color;
            for(let i=0; i<6; i++) {
                const angle = (i / 6) * Math.PI * 2 + (frame * 0.05);
                const legLen = size * 1.5;
                const lx = Math.cos(angle) * legLen;
                const ly = Math.sin(angle) * legLen * (0.8 + Math.sin(frame * 0.2 + i)*0.2);
                ctx.beginPath();
                ctx.moveTo(0,0);
                ctx.lineTo(lx, ly);
                ctx.stroke();
            }
            ctx.beginPath();
            ctx.arc(0, 0, size, 0, Math.PI*2);
            ctx.fill();
            ctx.stroke();
            break;

        case 'SERPENT':
            ctx.beginPath();
            ctx.arc(0, 0, size, 0, Math.PI*2);
            ctx.fill();
            const angleS = Math.atan2(enemy.vy, enemy.vx) + Math.PI;
            ctx.beginPath();
            ctx.moveTo(0,0);
            for(let i=1; i<8; i++) {
                const dist = i * (size * 0.8);
                const wave = Math.sin(frame * 0.3 + i) * (size * 0.5);
                const tx = Math.cos(angleS) * dist + Math.cos(angleS + Math.PI/2) * wave;
                const ty = Math.sin(angleS) * dist + Math.sin(angleS + Math.PI/2) * wave;
                ctx.lineTo(tx, ty);
            }
            ctx.strokeStyle = enemy.def.glowColor;
            ctx.stroke();
            break;

        case 'GHOST':
            ctx.globalAlpha = 0.7;
            const p = 1 + Math.sin(frame * 0.1) * 0.1;
            ctx.scale(p, p);
            ctx.beginPath();
            ctx.moveTo(-size, 0);
            ctx.lineTo(-size, -size);
            ctx.quadraticCurveTo(0, -size*1.5, size, -size);
            ctx.lineTo(size, 0);
            for(let i=0; i<3; i++) {
                ctx.lineTo(size - (i * size * 0.8), size + Math.sin(frame * 0.2 + i) * 5);
            }
            ctx.lineTo(-size, 0);
            ctx.fill();
            ctx.stroke();
            ctx.fillStyle = '#fff';
            ctx.beginPath(); ctx.arc(-size*0.4, -size*0.4, 2, 0, Math.PI*2); ctx.fill();
            ctx.beginPath(); ctx.arc(size*0.4, -size*0.4, 2, 0, Math.PI*2); ctx.fill();
            break;

        case 'STAR':
            ctx.rotate(frame * 0.1);
            ctx.beginPath();
            for(let i=0; i<5; i++) {
                ctx.lineTo(Math.cos((i*0.8 + frame*0.01) * Math.PI)*size, Math.sin((i*0.8 + frame*0.01) * Math.PI)*size);
                ctx.lineTo(Math.cos((i*0.8 + 0.4 + frame*0.01) * Math.PI)*size*0.5, Math.sin((i*0.8 + 0.4 + frame*0.01) * Math.PI)*size*0.5);
            }
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
            break;

        case 'CONSTRUCT':
            ctx.rotate(frame * 0.02);
            ctx.beginPath();
            ctx.rect(-size*0.7, -size*0.7, size*1.4, size*1.4);
            ctx.fill();
            ctx.stroke();
            ctx.rotate(-frame * 0.04);
            ctx.strokeStyle = '#fff';
            ctx.strokeRect(-size*0.4, -size*0.4, size*0.8, size*0.8);
            ctx.stroke();
            break;
        
        case 'EYE':
            ctx.beginPath();
            ctx.ellipse(0, 0, size, size*0.6, 0, 0, Math.PI*2);
            ctx.fill();
            ctx.stroke();
            const px = Math.sin(frame * 0.05) * (size*0.3);
            ctx.fillStyle = '#000';
            ctx.beginPath();
            ctx.arc(px, 0, size*0.3, 0, Math.PI*2);
            ctx.fill();
            break;
        
        case 'CRYSTAL':
            ctx.beginPath();
            ctx.moveTo(0, -size);
            ctx.lineTo(size*0.7, -size*0.3);
            ctx.lineTo(0, size);
            ctx.lineTo(-size*0.7, -size*0.3);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
            break;
            
        case 'SWARMER':
            ctx.rotate(Math.atan2(enemy.vy, enemy.vx) + Math.PI/2);
            ctx.beginPath();
            ctx.moveTo(0, -size);
            ctx.lineTo(size*0.6, size);
            ctx.lineTo(0, size*0.7);
            ctx.lineTo(-size*0.6, size);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
            break;

        default: // SIMPLE
            ctx.beginPath();
            ctx.arc(0, 0, size, 0, Math.PI*2);
            ctx.fill();
            ctx.stroke();
            break;
    }
    
    ctx.restore();
};
