import { Enemy } from '../types';
import { getGlowSprite } from './GlowSprites';

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

export const drawEnemy = (
    ctx: CanvasRenderingContext2D,
    enemy: Enemy,
    frame: number,
    glowEnabled: boolean = true
) => {
    const isParalyzed = (enemy.paralyzedTimer || 0) > 0;
    const isHitFlash = (enemy.hitFlashTimer || 0) > 0 || enemy.projectileImmunity > 0;

    // Hit Flash (2-frame white color swap, no extra draw) or Paralyzed Pale Blue Tint
    const fillPrimary = isHitFlash ? '#ffffff' : isParalyzed ? '#bae6fd' : enemy.def.color;
    const strokePrimary = isHitFlash ? '#ffffff' : isParalyzed ? '#38bdf8' : enemy.def.glowColor;
    ctx.fillStyle = fillPrimary;
    ctx.strokeStyle = strokePrimary;
    ctx.lineWidth = 2;

    const ex = enemy.x;
    const ey = enemy.y;
    const size = enemy.def.size;
    const visualType = (enemy.isSemiBoss || enemy.def?.behavior === 'SEMI_BOSS') ? 'SEMI_BOSS' : enemy.def.visualType;

    // Fast path for non-boss wave enemies: draw in world coordinates without ctx.save/restore
    if (
        visualType === 'SIMPLE' ||
        visualType === 'CRAB' ||
        visualType === 'SERPENT' ||
        visualType === 'EYE' ||
        visualType === 'CRYSTAL' ||
        visualType === 'SWARMER' ||
        visualType === 'STAR' ||
        visualType === 'CONSTRUCT' ||
        visualType === 'GHOST'
    ) {
        if (visualType === 'SIMPLE') {
            ctx.beginPath();
            ctx.arc(ex, ey, size, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
        } else if (visualType === 'CRAB') {
            for (let i = 0; i < 6; i++) {
                const angle = (i / 6) * Math.PI * 2 + (frame * 0.05);
                const legLen = size * 1.5;
                const lx = ex + Math.cos(angle) * legLen;
                const ly = ey + Math.sin(angle) * legLen * (0.8 + Math.sin(frame * 0.2 + i) * 0.2);
                ctx.beginPath();
                ctx.moveTo(ex, ey);
                ctx.lineTo(lx, ly);
                ctx.stroke();
            }
            ctx.beginPath();
            ctx.arc(ex, ey, size, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
        } else if (visualType === 'SERPENT') {
            ctx.beginPath();
            ctx.arc(ex, ey, size, 0, Math.PI * 2);
            ctx.fill();
            if (enemy.def.id === 'e31') {
                ctx.strokeStyle = isHitFlash ? '#ffffff' : '#4f46e5';
                ctx.lineWidth = 3;
                ctx.stroke();
                ctx.lineWidth = 2;
            }
            const angleS = Math.atan2(enemy.vy, enemy.vx) + Math.PI;
            const cosS = Math.cos(angleS);
            const sinS = Math.sin(angleS);
            const perpCos = Math.cos(angleS + Math.PI / 2);
            const perpSin = Math.sin(angleS + Math.PI / 2);
            ctx.beginPath();
            ctx.moveTo(ex, ey);
            for (let i = 1; i < 8; i++) {
                const dist = i * (size * 0.8);
                const wave = Math.sin(frame * 0.3 + i) * (size * 0.5);
                const tx = ex + cosS * dist + perpCos * wave;
                const ty = ey + sinS * dist + perpSin * wave;
                ctx.lineTo(tx, ty);
            }
            ctx.strokeStyle = strokePrimary;
            ctx.stroke();
        } else if (visualType === 'EYE') {
            ctx.beginPath();
            ctx.ellipse(ex, ey, size, size * 0.6, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
            const px = ex + Math.sin(frame * 0.05) * (size * 0.3);
            ctx.fillStyle = '#000';
            ctx.beginPath();
            ctx.arc(px, ey, size * 0.3, 0, Math.PI * 2);
            ctx.fill();
        } else if (visualType === 'CRYSTAL') {
            ctx.beginPath();
            ctx.moveTo(ex, ey - size);
            ctx.lineTo(ex + size * 0.7, ey - size * 0.3);
            ctx.lineTo(ex, ey + size);
            ctx.lineTo(ex - size * 0.7, ey - size * 0.3);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
        } else if (visualType === 'SWARMER') {
            const ang = Math.atan2(enemy.vy, enemy.vx) + Math.PI / 2;
            const cos = Math.cos(ang);
            const sin = Math.sin(ang);
            ctx.beginPath();
            ctx.moveTo(ex + sin * size, ey - cos * size);
            ctx.lineTo(ex + cos * (size * 0.6) - sin * size, ey + sin * (size * 0.6) + cos * size);
            ctx.lineTo(ex - sin * (size * 0.7), ey + cos * (size * 0.7));
            ctx.lineTo(ex - cos * (size * 0.6) - sin * size, ey - sin * (size * 0.6) + cos * size);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
        } else if (visualType === 'STAR') {
            const baseRot = frame * 0.1;
            ctx.beginPath();
            for (let i = 0; i < 5; i++) {
                const a1 = baseRot + (i * 0.8 + frame * 0.01) * Math.PI;
                const a2 = baseRot + (i * 0.8 + 0.4 + frame * 0.01) * Math.PI;
                if (i === 0) ctx.moveTo(ex + Math.cos(a1) * size, ey + Math.sin(a1) * size);
                else ctx.lineTo(ex + Math.cos(a1) * size, ey + Math.sin(a1) * size);
                ctx.lineTo(ex + Math.cos(a2) * size * 0.5, ey + Math.sin(a2) * size * 0.5);
            }
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
        } else if (visualType === 'CONSTRUCT') {
            const a1 = frame * 0.02;
            const r1 = size * 0.7;
            const c1 = Math.cos(a1), s1 = Math.sin(a1);
            ctx.beginPath();
            ctx.moveTo(ex + (-r1 * c1 - -r1 * s1), ey + (-r1 * s1 + -r1 * c1));
            ctx.lineTo(ex + (r1 * c1 - -r1 * s1), ey + (r1 * s1 + -r1 * c1));
            ctx.lineTo(ex + (r1 * c1 - r1 * s1), ey + (r1 * s1 + r1 * c1));
            ctx.lineTo(ex + (-r1 * c1 - r1 * s1), ey + (-r1 * s1 + r1 * c1));
            ctx.closePath();
            ctx.fill();
            ctx.stroke();

            const a2 = -frame * 0.02;
            const r2 = size * 0.4;
            const c2 = Math.cos(a2), s2 = Math.sin(a2);
            ctx.strokeStyle = '#fff';
            ctx.beginPath();
            ctx.moveTo(ex + (-r2 * c2 - -r2 * s2), ey + (-r2 * s2 + -r2 * c2));
            ctx.lineTo(ex + (r2 * c2 - -r2 * s2), ey + (r2 * s2 + -r2 * c2));
            ctx.lineTo(ex + (r2 * c2 - r2 * s2), ey + (r2 * s2 + r2 * c2));
            ctx.lineTo(ex + (-r2 * c2 - r2 * s2), ey + (-r2 * s2 + r2 * c2));
            ctx.closePath();
            ctx.stroke();
        } else if (visualType === 'GHOST') {
            const prevAlpha = ctx.globalAlpha;
            ctx.globalAlpha = 0.7;
            const p = (1 + Math.sin(frame * 0.1) * 0.1) * size;
            ctx.beginPath();
            ctx.moveTo(ex - p, ey);
            ctx.lineTo(ex - p, ey - p);
            ctx.quadraticCurveTo(ex, ey - p * 1.5, ex + p, ey - p);
            ctx.lineTo(ex + p, ey);
            for (let i = 0; i < 3; i++) {
                ctx.lineTo(ex + p - (i * p * 0.8), ey + p + Math.sin(frame * 0.2 + i) * 5);
            }
            ctx.lineTo(ex - p, ey);
            ctx.fill();
            ctx.stroke();
            ctx.fillStyle = '#fff';
            ctx.beginPath(); ctx.arc(ex - p * 0.4, ey - p * 0.4, 2, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.arc(ex + p * 0.4, ey - p * 0.4, 2, 0, Math.PI * 2); ctx.fill();
            ctx.globalAlpha = prevAlpha;
        }

        if (isParalyzed) {
            const pTimer = enemy.paralyzedTimer || 0;
            const pct = Math.max(0, Math.min(1, pTimer / 300));
            const ringRadius = size * 1.35;
            ctx.strokeStyle = '#38bdf8';
            ctx.lineWidth = 4;
            ctx.beginPath();
            ctx.arc(ex, ey, ringRadius, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * pct);
            ctx.stroke();
        }
        return;
    }

    // Complex Boss & Semi-Boss Rendering (max 1-2 entities on screen at once)
    ctx.save();
    ctx.translate(ex, ey);

    switch (visualType) {
        case 'SEMI_BOSS': {
            const sbType = enemy.state?.custom?.sbType ?? 0;
            const primaryColor = isHitFlash ? '#ffffff' : (enemy.def.glowColor || (sbType === 0 ? '#ef4444' : sbType === 1 ? '#4ade80' : '#facc15'));
            const darkColor = isHitFlash ? '#ffffff' : (enemy.def.color || (sbType === 0 ? '#b91c1c' : sbType === 1 ? '#16a34a' : '#ca8a04'));
            const pulse = (Math.sin(frame * 0.08) + 1) / 2;

            if (glowEnabled) {
                const bgGlowSize = size * 3.5;
                const bgGlowSprite = getGlowSprite(primaryColor, 256);
                ctx.globalAlpha = 0.8 + pulse * 0.2;
                ctx.drawImage(bgGlowSprite, -bgGlowSize / 2, -bgGlowSize / 2, bgGlowSize, bgGlowSize);
                ctx.globalAlpha = 1.0;
            }

            ctx.save();
            ctx.rotate(frame * 0.01);
            const rayCount = 12;
            ctx.fillStyle = primaryColor;
            for (let i = 0; i < rayCount; i++) {
                const angle = (i / rayCount) * Math.PI * 2;
                const rayLen = size * (1.6 + Math.sin(frame * 0.1 + i) * 0.3);
                ctx.globalAlpha = 0.15 + Math.sin(frame * 0.15 + i * 2) * 0.1;
                ctx.beginPath();
                ctx.moveTo(0, 0);
                ctx.lineTo(Math.cos(angle - 0.08) * rayLen * 0.2, Math.sin(angle - 0.08) * rayLen * 0.2);
                ctx.lineTo(Math.cos(angle) * rayLen, Math.sin(angle) * rayLen);
                ctx.lineTo(Math.cos(angle + 0.08) * rayLen * 0.2, Math.sin(angle + 0.08) * rayLen * 0.2);
                ctx.closePath();
                ctx.fill();
            }
            ctx.restore();
            ctx.globalAlpha = 1.0;

            ctx.save();
            ctx.rotate(frame * 0.02);
            ctx.strokeStyle = primaryColor;
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(0, 0, size * 1.25, 0, Math.PI * 2);
            ctx.stroke();

            const nodeCount = 8;
            for (let i = 0; i < nodeCount; i++) {
                const nodeAngle = (i / nodeCount) * Math.PI * 2;
                const nx = Math.cos(nodeAngle) * size * 1.25;
                const ny = Math.sin(nodeAngle) * size * 1.25;

                if ((frame + i * 7) % 15 < 6) {
                    ctx.strokeStyle = '#ffffff';
                    ctx.lineWidth = 1.5;
                    ctx.beginPath();
                    ctx.moveTo(0, 0);
                    const midX = nx * 0.5 + (Math.random() - 0.5) * 15;
                    const midY = ny * 0.5 + (Math.random() - 0.5) * 15;
                    ctx.lineTo(midX, midY);
                    ctx.lineTo(nx, ny);
                    ctx.stroke();
                }

                const ca = Math.cos(nodeAngle + frame * 0.05);
                const sa = Math.sin(nodeAngle + frame * 0.05);
                ctx.fillStyle = primaryColor;
                ctx.strokeStyle = '#ffffff';
                ctx.lineWidth = 1.5;
                ctx.beginPath();
                ctx.moveTo(nx + sa * 8, ny - ca * 8);
                ctx.lineTo(nx + ca * 6, ny + sa * 6);
                ctx.lineTo(nx - sa * 8, ny + ca * 8);
                ctx.lineTo(nx - ca * 6, ny - sa * 6);
                ctx.closePath();
                ctx.fill();
                ctx.stroke();
            }
            ctx.restore();

            ctx.save();
            ctx.rotate(-frame * 0.03);
            ctx.strokeStyle = darkColor;
            ctx.lineWidth = 4;
            ctx.beginPath();
            ctx.arc(0, 0, size * 1.0, 0, Math.PI * 2);
            ctx.stroke();

            const teethCount = 16;
            ctx.fillStyle = primaryColor;
            for (let i = 0; i < teethCount; i++) {
                const tAngle = (i / teethCount) * Math.PI * 2;
                const tx = Math.cos(tAngle) * size * 1.0;
                const ty = Math.sin(tAngle) * size * 1.0;
                ctx.beginPath();
                ctx.arc(tx, ty, 3, 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.restore();

            if (sbType === 0) {
                ctx.save();
                ctx.rotate(frame * 0.015);
                ctx.fillStyle = '#7f1d1d';
                ctx.strokeStyle = '#ef4444';
                ctx.lineWidth = 2;
                ctx.beginPath();
                const spikeNum = 8;
                for (let i = 0; i < spikeNum; i++) {
                    const ang = (i / spikeNum) * Math.PI * 2;
                    const rOut = size * (1.1 + Math.sin(frame * 0.1 + i) * 0.15);
                    const rIn = size * 0.6;
                    ctx.lineTo(Math.cos(ang) * rOut, Math.sin(ang) * rOut);
                    ctx.lineTo(Math.cos(ang + Math.PI / spikeNum) * rIn, Math.sin(ang + Math.PI / spikeNum) * rIn);
                }
                ctx.closePath();
                ctx.fill();
                ctx.stroke();
                ctx.restore();
            } else if (sbType === 1) {
                ctx.save();
                ctx.strokeStyle = '#4ade80';
                ctx.lineWidth = 3;
                for (let t = 0; t < 6; t++) {
                    const tAng = (t / 6) * Math.PI * 2 + frame * 0.02;
                    ctx.beginPath();
                    ctx.moveTo(0, 0);
                    for (let step = 1; step <= 5; step++) {
                        const dist = step * (size * 0.22);
                        const wave = Math.sin(frame * 0.1 + t + step) * 12;
                        const px = Math.cos(tAng) * dist + Math.cos(tAng + Math.PI / 2) * wave;
                        const py = Math.sin(tAng) * dist + Math.sin(tAng + Math.PI / 2) * wave;
                        ctx.lineTo(px, py);
                    }
                    ctx.stroke();
                }
                ctx.restore();
            } else {
                ctx.save();
                ctx.rotate(frame * 0.04);
                ctx.strokeStyle = '#fef08a';
                ctx.lineWidth = 3;
                ctx.fillStyle = 'rgba(250, 204, 21, 0.2)';
                for (let layer = 0; layer < 2; layer++) {
                    ctx.rotate((layer * Math.PI) / 4);
                    ctx.beginPath();
                    for (let s = 0; s < 4; s++) {
                        const sAng = (s / 4) * Math.PI * 2;
                        const sx = Math.cos(sAng) * size * 0.85;
                        const sy = Math.sin(sAng) * size * 0.85;
                        if (s === 0) ctx.moveTo(sx, sy);
                        else ctx.lineTo(sx, sy);
                    }
                    ctx.closePath();
                    ctx.fill();
                    ctx.stroke();
                }
                ctx.restore();
            }

            ctx.fillStyle = '#020617';
            ctx.beginPath();
            ctx.arc(0, 0, size * 0.65, 0, Math.PI * 2);
            ctx.fill();

            ctx.strokeStyle = primaryColor;
            ctx.lineWidth = 4 + pulse * 2;
            ctx.beginPath();
            ctx.arc(0, 0, size * 0.65, 0, Math.PI * 2);
            ctx.stroke();

            if (glowEnabled) {
                const eyeGlowSize = size * 1.2;
                const eyeGlowSprite = getGlowSprite('#ffffff', 128);
                ctx.drawImage(eyeGlowSprite, -eyeGlowSize / 2, -eyeGlowSize / 2, eyeGlowSize, eyeGlowSize);
            }

            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(0, 0, size * 0.25 + pulse * 4, 0, Math.PI * 2);
            ctx.fill();

            ctx.save();
            ctx.rotate(-frame * 0.06);
            ctx.fillStyle = primaryColor;
            ctx.beginPath();
            ctx.rect(-size * 0.12, -size * 0.12, size * 0.24, size * 0.24);
            ctx.fill();
            ctx.restore();

            break;
        }
        case 'HIVE': {
            const breath = (Math.sin(frame * 0.05) + 1) / 2;
            if (glowEnabled) {
                const hiveGlowSprite = getGlowSprite(enemy.def.glowColor, 128);
                const hiveGlowSize = size * 0.4 * 2.4 * 2;
                ctx.globalAlpha = 1;
                ctx.drawImage(hiveGlowSprite, -hiveGlowSize / 2, -hiveGlowSize / 2, hiveGlowSize, hiveGlowSize);
            }
            
            ctx.beginPath();
            ctx.arc(0, 0, size * 0.4, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();

            const hexSize = size * 0.22;
            ctx.lineWidth = 1.5;
            for (let i = 0; i < 6; i++) {
                const angle = (i / 6) * Math.PI * 2 + (frame * 0.01);
                const dist = (size * 0.65) + (breath * 5); 
                const hx = Math.cos(angle) * dist;
                const hy = Math.sin(angle) * dist;
                
                ctx.globalAlpha = 0.3;
                ctx.beginPath();
                ctx.moveTo(0, 0);
                ctx.lineTo(hx, hy);
                ctx.stroke();
                ctx.globalAlpha = 1.0;
                drawHexagon(ctx, hx, hy, hexSize);
            }
            
            ctx.fillStyle = enemy.def.glowColor; 
            for (let i = 0; i < 12; i++) {
                const angle = (i / 12) * Math.PI * 2 - (frame * 0.005);
                const isBroken = i % 2 === 0;
                const offset = Math.sin(frame * 0.05 + i) * 8;
                const dist = (size * 1.0) + offset + (breath * 12);
                const hx = Math.cos(angle) * dist;
                const hy = Math.sin(angle) * dist;
                
                ctx.globalAlpha = 0.6 + 0.4 * Math.sin(frame * 0.1 + i);
                if (isBroken) {
                    ctx.beginPath(); ctx.arc(hx, hy, hexSize * 0.3, 0, Math.PI * 2); ctx.fill();
                } else {
                    drawHexagon(ctx, hx, hy, hexSize * 0.8);
                }
                ctx.globalAlpha = 1.0;
            }
            break;
        }
        case 'WARDEN': {
            if (glowEnabled) {
                const wardenGlowSize = size * 1.6 * 2;
                const wardenGlowSprite = getGlowSprite(enemy.def.glowColor, 256);
                ctx.drawImage(wardenGlowSprite, -wardenGlowSize / 2, -wardenGlowSize / 2, wardenGlowSize, wardenGlowSize);
            }
            
            ctx.rotate(frame * 0.02);
            ctx.beginPath();
            ctx.rect(-size * 0.4, -size * 0.4, size * 0.8, size * 0.8);
            ctx.fill();
            ctx.stroke();
            
            ctx.rotate(-frame * 0.04);
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 3;
            ctx.strokeRect(-size * 0.6, -size * 0.6, size * 1.2, size * 1.2);
            
            ctx.rotate(frame * 0.01);
            ctx.strokeStyle = enemy.def.glowColor;
            ctx.lineWidth = 2;
            const glitchOffset = Math.sin(frame * 0.5) * 5;
            ctx.strokeRect(-size * 0.8 - glitchOffset, -size * 0.8 + glitchOffset, size * 1.6, size * 1.6);
            
            for (let i = 0; i < 4; i++) {
                ctx.rotate(Math.PI / 2);
                ctx.fillStyle = '#fff';
                ctx.beginPath();
                ctx.arc(size, size, 4, 0, Math.PI * 2);
                ctx.fill();
            }
            break;
        }
        case 'ECLIPSE': {
            if (glowEnabled) {
                const eclipseGlowSize = size * 1.4 * 2.4 * 1.5;
                const eclipseGlowSprite = getGlowSprite('#ef4444', 256);
                ctx.drawImage(eclipseGlowSprite, -eclipseGlowSize / 2, -eclipseGlowSize / 2, eclipseGlowSize, eclipseGlowSize);
            }

            ctx.fillStyle = '#b91c1c';
            ctx.beginPath();
            for (let i = 0; i < 16; i++) {
                const angle = (i / 16) * Math.PI * 2 + (frame * 0.02);
                const rOuter = size * 1.4 + Math.sin(frame * 0.2 + i * 10) * 10;
                const rInner = size * 0.8;
                ctx.lineTo(Math.cos(angle) * rOuter, Math.sin(angle) * rOuter);
                ctx.lineTo(Math.cos(angle + 0.2) * rInner, Math.sin(angle + 0.2) * rInner);
            }
            ctx.closePath();
            ctx.fill();
            
            ctx.fillStyle = '#000';
            ctx.beginPath();
            ctx.arc(0, 0, size * 0.9, 0, Math.PI * 2);
            ctx.fill();
            
            ctx.strokeStyle = '#ef4444';
            ctx.lineWidth = 4;
            ctx.beginPath();
            ctx.arc(0, 0, size * 0.9, 0, Math.PI * 2);
            ctx.stroke();
            break;
        }
        case 'NEUTRON': {
            if (glowEnabled) {
                const diskGlowSize = size * 1.5 * 2;
                const diskGlowSprite = getGlowSprite('#38bdf8', 256);
                ctx.drawImage(diskGlowSprite, -diskGlowSize / 2, -diskGlowSize / 2, diskGlowSize, diskGlowSize);
            }

            ctx.lineWidth = 2;
            ctx.strokeStyle = '#0ea5e9';
            
            for (let arm = 0; arm < 3; arm++) {
                ctx.beginPath();
                for (let i = 0; i < 20; i++) {
                    const angle = (frame * -0.2) + (arm * (Math.PI * 2 / 3)) + (i * 0.2);
                    const radius = size * 0.2 + (i * size * 0.06);
                    const px = Math.cos(angle) * radius;
                    const py = Math.sin(angle) * radius;
                    if (i === 0) ctx.moveTo(px, py);
                    else ctx.lineTo(px, py);
                }
                ctx.stroke();
            }
            
            ctx.fillStyle = '#000';
            ctx.beginPath();
            ctx.arc(0, 0, size * 0.3, 0, Math.PI * 2);
            ctx.fill();

            if (glowEnabled) {
                const coreGlowSize2 = size * 0.15 * 2 * 2.5;
                const coreGlowSprite2 = getGlowSprite('#ffffff', 64);
                ctx.drawImage(coreGlowSprite2, -coreGlowSize2 / 2, -coreGlowSize2 / 2, coreGlowSize2, coreGlowSize2);
            }

            ctx.fillStyle = '#fff';
            ctx.beginPath();
            ctx.arc(0, 0, size * 0.15, 0, Math.PI * 2);
            ctx.fill();
            break;
        }
        case 'TITAN': {
            if (glowEnabled) {
                const titanGlowSize = size * 1.5 * 2;
                const titanGlowSprite = getGlowSprite('#84cc16', 256);
                ctx.drawImage(titanGlowSprite, -titanGlowSize / 2, -titanGlowSize / 2, titanGlowSize, titanGlowSize);
            }
            
            ctx.fillStyle = '#1a2e05';
            ctx.strokeStyle = '#bef264';
            ctx.lineWidth = 3;
            drawHexagon(ctx, 0, 0, size * 0.6);
            
            const pulse = 0.5 + Math.sin(frame * 0.1) * 0.2;
            ctx.fillStyle = `rgba(132, 204, 22, ${pulse})`;
            ctx.beginPath();
            ctx.arc(0, 0, size * 0.2, 0, Math.PI * 2);
            ctx.fill();

            const plateCount = 4;
            for (let i = 0; i < plateCount; i++) {
                const angle = (frame * 0.02) + (i * (Math.PI * 2 / plateCount));
                const dist = size * 1.1;
                const px = Math.cos(angle) * dist;
                const py = Math.sin(angle) * dist;
                
                ctx.strokeStyle = 'rgba(132, 204, 22, 0.3)';
                ctx.lineWidth = 4;
                ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(px, py); ctx.stroke();
                
                const rot = angle + Math.PI / 2;
                const cr = Math.cos(rot), sr = Math.sin(rot);
                ctx.fillStyle = '#3f6212';
                ctx.strokeStyle = '#84cc16';
                ctx.lineWidth = 2;
                
                ctx.beginPath();
                ctx.moveTo(px + (-15 * cr - -10 * sr), py + (-15 * sr + -10 * cr));
                ctx.lineTo(px + (15 * cr - -10 * sr), py + (15 * sr + -10 * cr));
                ctx.lineTo(px + (25 * cr - 10 * sr), py + (25 * sr + 10 * cr));
                ctx.lineTo(px + (-25 * cr - 10 * sr), py + (-25 * sr + 10 * cr));
                ctx.closePath();
                ctx.fill();
                ctx.stroke();
            }
            break;
        }
        case 'DARKNESS': {
            if (glowEnabled) {
                const darkGlowSize = size * 2.5;
                const darkGlowSprite = getGlowSprite('#9333ea', 256);
                ctx.drawImage(darkGlowSprite, -darkGlowSize / 2, -darkGlowSize / 2, darkGlowSize, darkGlowSize);
            }

            ctx.fillStyle = '#000000';
            ctx.beginPath();
            const spikeCount = 40;
            for (let i = 0; i <= spikeCount; i++) {
                const angle = (i / spikeCount) * Math.PI * 2 + (frame * 0.01);
                const noise = Math.sin(frame * 0.1 + i * 1.5) + Math.cos(frame * 0.2 + i * 3);
                const r = size * (1.0 + Math.abs(noise) * 0.15);
                const px = Math.cos(angle) * r;
                const py = Math.sin(angle) * r;
                if (i === 0) ctx.moveTo(px, py);
                else ctx.lineTo(px, py);
            }
            ctx.closePath();
            ctx.fill();
            
            ctx.strokeStyle = '#a855f7';
            ctx.lineWidth = 2;
            ctx.stroke();
            
            ctx.fillStyle = '#000000';
            ctx.beginPath();
            ctx.arc(0, 0, size * 0.9, 0, Math.PI * 2);
            ctx.fill();
            
            ctx.strokeStyle = 'rgba(168, 85, 247, 0.4)';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.ellipse(0, 0, size * 0.7, size * 0.2, frame * 0.02, 0, Math.PI * 2);
            ctx.stroke();
            
            ctx.strokeStyle = 'rgba(192, 132, 252, 0.6)';
            ctx.beginPath();
            ctx.ellipse(0, 0, size * 0.5, size * 0.15, -frame * 0.03 + Math.PI / 3, 0, Math.PI * 2);
            ctx.stroke();

            const coreSize = 3;
            if (glowEnabled) {
                const eyeGlowSize = coreSize * 20;
                const eyeGlowSprite = getGlowSprite('#a855f7', 64);
                ctx.drawImage(eyeGlowSprite, -eyeGlowSize / 2, -eyeGlowSize / 2, eyeGlowSize, eyeGlowSize);
            }

            ctx.fillStyle = '#d8b4fe';
            ctx.beginPath();
            ctx.arc(0, 0, coreSize, 0, Math.PI * 2);
            ctx.fill();
            break;
        }
    }

    if (isParalyzed) {
        const pTimer = enemy.paralyzedTimer || 0;
        const pct = Math.max(0, Math.min(1, pTimer / 300));
        const ringRadius = size * 1.35;

        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(0, 0, ringRadius, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * pct);
        ctx.stroke();

        ctx.font = 'bold 13px Orbitron';
        ctx.fillStyle = '#bae6fd';
        ctx.textAlign = 'center';
        const secs = (pTimer / 60).toFixed(1);
        ctx.fillText(`STUNNED ${secs}s`, 0, -ringRadius - 10);

        const floatY = -ringRadius - 28 - ((frame % 24) * 0.6);
        ctx.font = 'bold 15px Orbitron';
        ctx.fillStyle = '#38bdf8';
        ctx.fillText('x1.5 DMG', 0, floatY);
    }
    
    ctx.restore();
};
