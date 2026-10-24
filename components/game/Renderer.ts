import { MutableGameState } from './types';
import { PlayerStats, Settings } from '../../types';
import { WORLD_SIZE } from './Constants';
import { drawEnemy } from './renderer/EnemyRenderer';
import { drawOrbitals } from './renderer/OrbitalRenderer';
import { renderPlayerProjectiles, renderEnemyProjectiles, renderEnvironmentProjectiles } from './renderer/ProjectileRenderer';
import { drawPlayer } from './renderer/PlayerRenderer';
import { drawParticlesBatched, CullBounds } from './renderer/ParticleBatcher';
import { getGlowSprite, getHurtVignetteSprite, drawGlow } from './renderer/GlowSprites';
import { renderThreatIndicators } from './renderer/ThreatIndicatorRenderer';
import { TELEGRAPH_POOL, TELEGRAPH_Dedicated_COLOR } from './logic/enemies/BossKit';
import { drawFloatingDamageNumbersBatched } from './HitFeedback';
import { getQuality } from './Quality';

const BOSS_PHASE_TICKS = [0.65, 0.30];

export const renderGame = (
    ctx: CanvasRenderingContext2D,
    state: MutableGameState,
    stats: PlayerStats,
    canvasWidth: number,
    canvasHeight: number,
    maturityScale: number,
    currentStageColor: string,
    currentHealth: number,
    settings?: Settings
) => {
    const perfMode = settings?.performanceMode || state.performanceMode || 'HIGH';
    const Q = getQuality(perfMode);

    ctx.clearRect(0, 0, canvasWidth, canvasHeight);
    
    ctx.save();
    const currentZoom = state.camera.zoom || 1.0;
    if (currentZoom !== 1.0) {
        ctx.translate(canvasWidth / 2, canvasHeight / 2);
        ctx.scale(currentZoom, currentZoom);
        ctx.translate(-canvasWidth / 2, -canvasHeight / 2);
    }
    ctx.translate(-state.camera.x, -state.camera.y);

    // View + margin culling bounds for entities, drops, projectiles, and particles
    const invZoom = 1 / Math.max(0.5, currentZoom);
    const halfViewW = (canvasWidth / 2) * invZoom;
    const halfViewH = (canvasHeight / 2) * invZoom;
    const cullCenterX = state.camera.x + canvasWidth / 2;
    const cullCenterY = state.camera.y + canvasHeight / 2;
    const cullMargin = 180 * invZoom;

    const cullBounds: CullBounds = {
        centerX: cullCenterX,
        centerY: cullCenterY,
        halfW: halfViewW,
        halfH: halfViewH,
        margin: cullMargin,
    };

    // --- WORLD BOUNDARIES ---
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 4;
    ctx.strokeRect(-WORLD_SIZE / 2, -WORLD_SIZE / 2, WORLD_SIZE, WORLD_SIZE);

    // --- PRIMARY MISSION RENDERING ---
    if (state.mission && state.mission.type === 'CAPTURE_ZONE' && state.mission.captureZone) {
        const cz = state.mission.captureZone;
        const pulse = Math.sin(state.frame * 0.05) * 5;
        
        ctx.fillStyle = 'rgba(234, 179, 8, 0.04)';
        ctx.beginPath();
        ctx.arc(cz.x, cz.y, cz.radius, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.strokeStyle = 'rgba(234, 179, 8, 0.4)';
        ctx.lineWidth = 2;
        ctx.setLineDash([8, 6]);
        ctx.beginPath();
        ctx.arc(cz.x, cz.y, cz.radius + pulse, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
        
        const progress = cz.captureTimeCurrent / cz.captureTimeTotal;
        ctx.strokeStyle = '#eab308';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(cz.x, cz.y, cz.radius, -Math.PI / 2, -Math.PI / 2 + (Math.PI * 2 * progress));
        ctx.stroke();
        
        ctx.fillStyle = 'rgba(234, 179, 8, 0.8)';
        ctx.font = 'bold 10px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(`BEACON ZONE (${Math.floor(progress * 100)}%)`, cz.x, cz.y + 4);
    }

    // --- SIDE MISSION RENDERING ---
    if (state.sideMission && !state.sideMission.completed && !state.sideMission.failed && !(state.wave > 0 && state.wave % 10 === 0)) {
        const sm = state.sideMission;
        
        if (sm.type === 'CAPTURE') {
            if (sm.captureZones) {
                for (let idx = 0; idx < sm.captureZones.length; idx++) {
                    const cz = sm.captureZones[idx];
                    if (!cz.captured) {
                        const pulse = Math.sin(state.frame * 0.05 + idx) * 4;
                        
                        ctx.fillStyle = 'rgba(56, 189, 248, 0.05)';
                        ctx.beginPath();
                        ctx.arc(cz.x, cz.y, cz.radius, 0, Math.PI * 2);
                        ctx.fill();
                        
                        ctx.strokeStyle = 'rgba(56, 189, 248, 0.5)';
                        ctx.lineWidth = 2;
                        ctx.setLineDash([6, 5]);
                        ctx.beginPath();
                        ctx.arc(cz.x, cz.y, cz.radius + pulse, 0, Math.PI * 2);
                        ctx.stroke();
                        ctx.setLineDash([]);
                        
                        const progress = cz.progress / 100;
                        ctx.strokeStyle = '#38bdf8';
                        ctx.lineWidth = 3.5;
                        ctx.beginPath();
                        ctx.arc(cz.x, cz.y, cz.radius, -Math.PI / 2, -Math.PI / 2 + (Math.PI * 2 * progress));
                        ctx.stroke();
                        
                        ctx.fillStyle = 'rgba(56, 189, 248, 0.9)';
                        ctx.font = 'bold 9px monospace';
                        ctx.textAlign = 'center';
                        ctx.fillText(`BEACON #${idx + 1} (${Math.floor(cz.progress)}%)`, cz.x, cz.y + 3);
                    }
                }
            } else if (sm.captureZone) {
                const cz = sm.captureZone;
                const pulse = Math.sin(state.frame * 0.05) * 5;
                const isTimed = sm.variant === 'TIMED';
                const strokeColor = isTimed ? '#e879f9' : '#22d3ee';
                const fillColor = isTimed ? 'rgba(232, 121, 249, 0.05)' : 'rgba(34, 211, 238, 0.04)';
                
                ctx.fillStyle = fillColor;
                ctx.beginPath();
                ctx.arc(cz.x, cz.y, cz.radius, 0, Math.PI * 2);
                ctx.fill();
                
                ctx.strokeStyle = isTimed ? 'rgba(232, 121, 249, 0.5)' : 'rgba(34, 211, 238, 0.4)';
                ctx.lineWidth = 2;
                ctx.setLineDash([8, 6]);
                ctx.beginPath();
                ctx.arc(cz.x, cz.y, cz.radius + pulse, 0, Math.PI * 2);
                ctx.stroke();
                ctx.setLineDash([]);
                
                const progress = cz.captureTimeCurrent / cz.captureTimeTotal;
                ctx.strokeStyle = strokeColor;
                ctx.lineWidth = 4;
                ctx.beginPath();
                ctx.arc(cz.x, cz.y, cz.radius, -Math.PI / 2, -Math.PI / 2 + (Math.PI * 2 * progress));
                ctx.stroke();
                
                ctx.fillStyle = strokeColor;
                ctx.font = 'bold 10px monospace';
                ctx.textAlign = 'center';
                const timerText = sm.timeRemaining !== undefined ? ` [${sm.timeRemaining}s]` : '';
                ctx.fillText(`CAPTURE ZONE (${Math.floor(progress * 100)}%)${timerText}`, cz.x, cz.y + 4);
            }
        } else if (sm.type === 'COLLECT' && sm.collectTargets) {
            for (let idx = 0; idx < sm.collectTargets.length; idx++) {
                const target = sm.collectTargets[idx];
                if (!target.collected) {
                    const pulse = Math.sin(state.frame * 0.1 + target.x) * 4;
                    const rotate = state.frame * 0.04 + target.y;
                    const color = target.color || '#22d3ee';
                    
                    drawGlow(ctx, target.x, target.y, 38, color, 0.55, Q.glow);
                    
                    ctx.fillStyle = `${color}40`;
                    ctx.beginPath();
                    ctx.arc(target.x, target.y, 22 + pulse, 0, Math.PI * 2);
                    ctx.fill();
                    
                    ctx.strokeStyle = color;
                    ctx.lineWidth = 2.5;
                    ctx.beginPath();
                    for (let j = 0; j < 4; j++) {
                        const angle = rotate + (Math.PI / 2) * j;
                        const x = target.x + Math.cos(angle) * (15 + pulse);
                        const y = target.y + Math.sin(angle) * (15 + pulse);
                        if (j === 0) ctx.moveTo(x, y);
                        else ctx.lineTo(x, y);
                    }
                    ctx.closePath();
                    ctx.stroke();
                    
                    ctx.fillStyle = '#ffffff';
                    ctx.beginPath();
                    ctx.arc(target.x, target.y, 6, 0, Math.PI * 2);
                    ctx.fill();
                }
            }
        } else if (sm.type === 'DESTROY' && sm.destroyTargets) {
            for (let idx = 0; idx < sm.destroyTargets.length; idx++) {
                const target = sm.destroyTargets[idx];
                if (target.hp > 0) {
                    const pulse = Math.sin(state.frame * 0.08 + target.x) * 1.5;
                    const isTimed = sm.variant === 'TIMED_BEACONS';
                    const mainColor = isTimed ? '#fbbf24' : '#f43f5e';
                    
                    ctx.fillStyle = isTimed ? 'rgba(251, 191, 36, 0.15)' : 'rgba(244, 63, 94, 0.15)';
                    ctx.beginPath();
                    ctx.arc(target.x, target.y, target.size + 10 + pulse, 0, Math.PI * 2);
                    ctx.fill();
                    
                    ctx.strokeStyle = mainColor;
                    ctx.lineWidth = 2.5;
                    ctx.beginPath();
                    const sides = sm.variant === 'MOVING_CRYSTALS' ? 4 : 6;
                    for (let j = 0; j < sides; j++) {
                        const angle = (Math.PI * 2 / sides) * j + state.frame * 0.02;
                        const x = target.x + Math.cos(angle) * (target.size + pulse);
                        const y = target.y + Math.sin(angle) * (target.size + pulse);
                        if (j === 0) ctx.moveTo(x, y);
                        else ctx.lineTo(x, y);
                    }
                    ctx.closePath();
                    ctx.stroke();
                    
                    if (target.name) {
                        ctx.fillStyle = mainColor;
                        ctx.font = '9px monospace';
                        ctx.textAlign = 'center';
                        ctx.fillText(target.name, target.x, target.y + target.size + 14);
                    }
                    
                    const barW = 34;
                    const barH = 4;
                    const barY = target.y - target.size - 12;
                    ctx.fillStyle = 'rgba(15, 23, 42, 0.7)';
                    ctx.fillRect(target.x - barW / 2, barY, barW, barH);
                    
                    const hpRatio = Math.max(0, target.hp / target.maxHp);
                    ctx.fillStyle = mainColor;
                    ctx.fillRect(target.x - barW / 2, barY, barW * hpRatio, barH);
                }
            }
        }
    }

    // --- DROPS (Culled & Batched, no per-drop save/restore) ---
    if (state.drops.length > 0) {
        const dropPath = new Path2D();
        const dropGlowPath = new Path2D();
        const maxDropW = halfViewW + cullMargin;
        const maxDropH = halfViewH + cullMargin;

        for (let i = 0; i < state.drops.length; i++) {
            const d = state.drops[i];
            if (!d.isSecretKey && (Math.abs(d.x - cullCenterX) > maxDropW || Math.abs(d.y - cullCenterY) > maxDropH)) {
                continue;
            }
            if (d.isSecretKey) {
                const pulse = 1.2 + Math.sin(state.frame * 0.15) * 0.3;
                drawGlow(ctx, d.x, d.y, 28 * pulse, '#f59e0b', 0.75, Q.glow);

                const rot = state.frame * 0.08;
                const cr = Math.cos(rot), sr = Math.sin(rot);
                ctx.strokeStyle = 'rgba(251, 191, 36, 0.7)';
                ctx.lineWidth = 3;
                ctx.beginPath();
                ctx.arc(d.x, d.y, 15 * pulse, 0, Math.PI * 2);
                ctx.stroke();

                const bowX = d.x + sr * (10 * pulse);
                const bowY = d.y - cr * (10 * pulse);
                ctx.fillStyle = '#fbbf24';
                ctx.beginPath();
                ctx.arc(bowX, bowY, 8 * pulse, 0, Math.PI * 2);
                ctx.fill();

                ctx.fillStyle = '#03030c';
                ctx.beginPath();
                ctx.arc(bowX, bowY, 4 * pulse, 0, Math.PI * 2);
                ctx.fill();

                ctx.strokeStyle = '#fbbf24';
                ctx.lineWidth = 4 * pulse;
                ctx.beginPath();
                ctx.moveTo(d.x + sr * (3 * pulse), d.y - cr * (3 * pulse));
                ctx.lineTo(d.x - sr * (21 * pulse), d.y + cr * (21 * pulse));
                ctx.stroke();
                continue;
            }
            if (d.isKey) {
                const pulse = 1 + Math.sin(state.frame * 0.1) * 0.5;
                drawGlow(ctx, d.x, d.y, 22 * pulse, '#f59e0b', 0.65, Q.glow);
                const rot = state.frame * 0.05;
                const cr = Math.cos(rot), sr = Math.sin(rot);
                ctx.fillStyle = '#fbbf24';
                ctx.beginPath();
                ctx.moveTo(d.x + sr * 10 * pulse, d.y - cr * 10 * pulse);
                ctx.lineTo(d.x + cr * 8 * pulse, d.y + sr * 8 * pulse);
                ctx.lineTo(d.x - sr * 10 * pulse, d.y + cr * 10 * pulse);
                ctx.lineTo(d.x - cr * 8 * pulse, d.y - sr * 8 * pulse);
                ctx.closePath();
                ctx.fill();
                continue;
            }
            if (d.isHeart) {
                const pulse = 1 + Math.sin(state.frame * 0.12) * 0.2;
                ctx.fillStyle = '#f43f5e';
                ctx.strokeStyle = '#fda4af';
                ctx.lineWidth = 1.5;
                ctx.beginPath();
                ctx.moveTo(d.x, d.y + 4 * pulse);
                ctx.bezierCurveTo(d.x - 10 * pulse, d.y - 4 * pulse, d.x - 10 * pulse, d.y - 12 * pulse, d.x, d.y - 6 * pulse);
                ctx.bezierCurveTo(d.x + 10 * pulse, d.y - 12 * pulse, d.x + 10 * pulse, d.y - 4 * pulse, d.x, d.y + 4 * pulse);
                ctx.fill();
                ctx.stroke();
                continue;
            }
            const pulse = 1 + Math.sin(state.frame * 0.1) * 0.2;
            dropPath.moveTo(d.x + 5 * pulse, d.y);
            dropPath.arc(d.x, d.y, 5 * pulse, 0, Math.PI * 2);
            
            if (Q.glow) {
                dropGlowPath.moveTo(d.x + 12 * pulse, d.y);
                dropGlowPath.arc(d.x, d.y, 12 * pulse, 0, Math.PI * 2);
            }
        }
        
        if (Q.glow) {
            ctx.globalCompositeOperation = 'lighter';
            ctx.fillStyle = 'rgba(192, 132, 252, 0.3)';
            ctx.fill(dropGlowPath);
            ctx.globalCompositeOperation = 'source-over';
        }

        ctx.fillStyle = '#c084fc';
        ctx.fill(dropPath);
    }

    // --- ENVIRONMENT / GROUND HAZARDS ---
    renderEnvironmentProjectiles(ctx, state, cullBounds, Q.glow);

    // === DRAW ORDER: 1. PLAYER FX (Orbitals, Player Projectiles, Additive Particles, Player) ===
    if (stats.projectileCount > 0) {
        drawOrbitals(ctx, state, stats, maturityScale, true);
    }

    renderPlayerProjectiles(ctx, state, cullBounds, Q.glow);

    ctx.globalCompositeOperation = 'lighter';
    drawParticlesBatched(ctx, state.particles, cullBounds, Q.glow);
    ctx.globalCompositeOperation = 'source-over';

    drawPlayer(ctx, state, stats, maturityScale, currentStageColor);

    if (stats.projectileCount > 0) {
        drawOrbitals(ctx, state, stats, maturityScale, false);
    }

    // === DRAW ORDER: 2. ENEMIES (with zoom-adjusted offscreen culling margin) ===
    for (let i = 0; i < state.enemies.length; i++) {
        const e = state.enemies[i];
        if (!e.isBoss && !e.isSemiBoss) {
            const margin = cullMargin + (e.def.size || 30) * 2;
            if (
                Math.abs(e.x - cullCenterX) > halfViewW + margin ||
                Math.abs(e.y - cullCenterY) > halfViewH + margin
            ) {
                continue;
            }
        }
        drawEnemy(ctx, e, state.frame, Q.glow);
    }

    // === DRAW ORDER: 3. ENEMY PROJECTILES ===
    renderEnemyProjectiles(ctx, state, settings, cullBounds, Q.glow);

    // === DRAW ORDER: 4. TELEGRAPHS (Dedicated white-red color #fff1f2 that no VFX uses) ===
    const strokeCol = TELEGRAPH_Dedicated_COLOR;
    const fillCol = '#ff1e42';
    for (let i = 0; i < TELEGRAPH_POOL.length; i++) {
        const t = TELEGRAPH_POOL[i];
        if (!t.active) continue;

        const progress = Math.min(1, Math.max(0, 1 - t.timer / t.maxTimer));

        if (t.kind === 'circle') {
            const radius = t.params.radius || 100;
            ctx.strokeStyle = strokeCol;
            ctx.lineWidth = 2.5;
            ctx.beginPath();
            ctx.arc(t.x, t.y, radius, 0, Math.PI * 2);
            ctx.stroke();

            ctx.fillStyle = fillCol;
            ctx.globalAlpha = 0.14 + progress * 0.32;
            ctx.beginPath();
            ctx.arc(t.x, t.y, radius * progress, 0, Math.PI * 2);
            ctx.fill();
            ctx.globalAlpha = 1;
        } else if (t.kind === 'line') {
            const length = t.params.length || 400;
            const width = t.params.width || 60;
            const angle = t.params.angle || 0;

            ctx.save();
            ctx.translate(t.x, t.y);
            ctx.rotate(angle);
            ctx.strokeStyle = strokeCol;
            ctx.lineWidth = 2.5;
            ctx.strokeRect(0, -width / 2, length, width);

            ctx.fillStyle = fillCol;
            ctx.globalAlpha = 0.14 + progress * 0.32;
            ctx.fillRect(0, -width / 2, length * progress, width);
            ctx.restore();
        } else if (t.kind === 'cone') {
            const radius = t.params.radius || 250;
            const angle = t.params.angle || 0;
            const fov = t.params.fov || (Math.PI / 3);
            const startAngle = angle - fov / 2;
            const endAngle = angle + fov / 2;

            ctx.strokeStyle = strokeCol;
            ctx.lineWidth = 2.5;
            ctx.beginPath();
            ctx.moveTo(t.x, t.y);
            ctx.arc(t.x, t.y, radius, startAngle, endAngle);
            ctx.closePath();
            ctx.stroke();

            ctx.fillStyle = fillCol;
            ctx.globalAlpha = 0.14 + progress * 0.32;
            ctx.beginPath();
            ctx.moveTo(t.x, t.y);
            ctx.arc(t.x, t.y, radius * progress, startAngle, endAngle);
            ctx.closePath();
            ctx.fill();
            ctx.globalAlpha = 1;
        } else if (t.kind === 'ring') {
            const innerRadius = t.params.innerRadius || 40;
            const radius = t.params.radius || 200;

            ctx.strokeStyle = strokeCol;
            ctx.lineWidth = 2.5;
            ctx.beginPath();
            ctx.arc(t.x, t.y, radius, 0, Math.PI * 2);
            ctx.stroke();
            ctx.beginPath();
            ctx.arc(t.x, t.y, innerRadius, 0, Math.PI * 2);
            ctx.stroke();

            const currentOuter = innerRadius + (radius - innerRadius) * progress;
            ctx.fillStyle = fillCol;
            ctx.globalAlpha = 0.14 + progress * 0.32;
            ctx.beginPath();
            ctx.arc(t.x, t.y, currentOuter, 0, Math.PI * 2);
            ctx.arc(t.x, t.y, innerRadius, 0, Math.PI * 2, true);
            ctx.fill();
            ctx.globalAlpha = 1;
        }
    }

    // === FLOATING DAMAGE NUMBERS (Single batched text pass, off in LOW mode) ===
    drawFloatingDamageNumbersBatched(ctx, perfMode);

    ctx.restore();

    const reduceFlashes = !!(settings?.reduceFlashes ?? state.settings?.reduceFlashes);
    const maxFlashAlpha = reduceFlashes ? 0.2 : 1.0;

    // --- PLAYER HURT: 6-frame red vignette from pre-rendered radial sprite (never a gradient per frame) ---
    const hpRatio = Math.max(0, currentHealth / Math.max(1, stats.maxHealth));
    const healthVignette = Math.pow(1 - hpRatio, 3) * 0.65;
    let flashVignette = 0;
    if (state.damageOverlayTimer && state.damageOverlayTimer > 0) {
        flashVignette = (Math.min(6, state.damageOverlayTimer) / 6) * 0.55;
    }

    const vignetteAlpha = Math.min(maxFlashAlpha, healthVignette + flashVignette);
    if (vignetteAlpha > 0.01) {
        const hurtSprite = getHurtVignetteSprite();
        const prevAlpha = ctx.globalAlpha;
        ctx.globalAlpha = vignetteAlpha;
        ctx.drawImage(hurtSprite, 0, 0, canvasWidth, canvasHeight);
        ctx.globalAlpha = prevAlpha;
    }

    // --- OFF-SCREEN SECRET KEY INDICATOR (GlowSprite instead of shadowBlur) ---
    for (let i = 0; i < state.drops.length; i++) {
        const d = state.drops[i];
        if (d.isSecretKey) {
            const zoom = state.camera.zoom || 1.0;
            const screenX = (d.x - state.camera.x - canvasWidth / 2) * zoom + canvasWidth / 2;
            const screenY = (d.y - state.camera.y - canvasHeight / 2) * zoom + canvasHeight / 2;
            const margin = 60;
            if (screenX < margin || screenX > canvasWidth - margin || screenY < margin || screenY > canvasHeight - margin) {
                const dx = screenX - canvasWidth / 2;
                const dy = screenY - canvasHeight / 2;
                const angle = Math.atan2(dy, dx);
                
                const halfW = canvasWidth / 2 - margin;
                const halfH = canvasHeight / 2 - margin;
                
                let indicatorX = canvasWidth / 2;
                let indicatorY = canvasHeight / 2;
                
                const cos = Math.cos(angle);
                const sin = Math.sin(angle);
                
                if (Math.abs(cos * halfH) > Math.abs(sin * halfW)) {
                    indicatorX = canvasWidth / 2 + (cos > 0 ? halfW : -halfW);
                    indicatorY = canvasHeight / 2 + (sin * (halfW / Math.abs(cos)));
                } else {
                    indicatorX = canvasWidth / 2 + (cos * (halfH / Math.abs(sin)));
                    indicatorY = canvasHeight / 2 + (sin > 0 ? halfH : -halfH);
                }
                
                drawGlow(ctx, indicatorX, indicatorY, 26, '#f59e0b', 0.65, Q.glow);

                ctx.save();
                ctx.translate(indicatorX, indicatorY);
                ctx.rotate(angle);
                ctx.fillStyle = '#fbbf24';
                ctx.beginPath();
                ctx.moveTo(15, 0);
                ctx.lineTo(-5, -10);
                ctx.lineTo(-5, -4);
                ctx.lineTo(-20, -4);
                ctx.lineTo(-20, 4);
                ctx.lineTo(-5, 4);
                ctx.lineTo(-5, 10);
                ctx.closePath();
                ctx.fill();
                ctx.restore();
                
                const tx = indicatorX + Math.cos(angle) * 35;
                const ty = indicatorY + Math.sin(angle) * 35;
                ctx.font = 'bold 11px Orbitron';
                ctx.fillStyle = '#fbbf24';
                ctx.textAlign = 'center';
                ctx.fillText('SECRET KEY', tx, ty - 12);
                const distWorld = Math.round(Math.sqrt((d.x - state.player.x) ** 2 + (d.y - state.player.y) ** 2));
                ctx.font = '9px Orbitron';
                ctx.fillText(`${distWorld}m`, tx, ty + 2);
            }
        }
    }

    // --- SCREEN EDGE FLASH ---
    if (state.edgeFlash && state.edgeFlash.timer > 0) {
        const rawAlpha = (state.edgeFlash.timer / 9) * 0.35;
        const alpha = Math.min(maxFlashAlpha, rawAlpha);
        const prevAlpha = ctx.globalAlpha;
        ctx.strokeStyle = state.edgeFlash.color;
        ctx.lineWidth = 12;
        ctx.globalAlpha = alpha;
        ctx.strokeRect(0, 0, canvasWidth, canvasHeight);
        ctx.globalAlpha = prevAlpha;
    }

    // --- FINAL 10% DARKNESS: "LIGHT BREAKS THROUGH" SCREEN BRIGHTENING ---
    if (state.activeBoss?.def?.id === 'darkness' && state.activeBoss.state?.custom?.lightBreaksThrough) {
        const prevAlpha = ctx.globalAlpha;
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = Math.min(maxFlashAlpha, 0.14);
        ctx.fillStyle = '#fef08a';
        ctx.fillRect(0, 0, canvasWidth, canvasHeight);
        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = prevAlpha;
    }

    // --- OFF-SCREEN THREAT INDICATORS ---
    renderThreatIndicators(ctx, state, canvasWidth, canvasHeight, settings);

    // --- CURSOR ---
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    if (Q.glow) {
        const cursorGlow = getGlowSprite('#ffffff', 32);
        ctx.drawImage(cursorGlow, state.mouse.x - 8, state.mouse.y - 8, 16, 16);
    }
    
    const s = 4;
    ctx.beginPath();
    ctx.moveTo(state.mouse.x - s, state.mouse.y - s);
    ctx.lineTo(state.mouse.x + s, state.mouse.y + s);
    ctx.moveTo(state.mouse.x + s, state.mouse.y - s);
    ctx.lineTo(state.mouse.x - s, state.mouse.y + s);
    ctx.stroke();

    // --- SAFE-AREA AWARE BOSS HP BAR (zero shadowBlur) ---
    if (state.activeBoss) {
        const boss = state.activeBoss;
        const pct = Math.max(0, Math.min(1, boss.hp / boss.maxHp));
        const barWidth = Math.min(600, canvasWidth - 40);
        const barHeight = 20;
        const x = canvasWidth / 2 - barWidth / 2;
        const y = 36;

        ctx.fillStyle = 'rgba(2, 6, 23, 0.9)';
        ctx.strokeStyle = '#334155';
        ctx.lineWidth = 2;
        ctx.fillRect(x - 2, y - 2, barWidth + 4, barHeight + 4);
        ctx.strokeRect(x - 2, y - 2, barWidth + 4, barHeight + 4);

        ctx.fillStyle = boss.projectileImmunity > 0 ? '#ffffff' : (boss.paralyzedTimer && boss.paralyzedTimer > 0 ? '#38bdf8' : (boss.def.glowColor || '#ca8a04'));
        ctx.fillRect(x, y, barWidth * pct, barHeight);

        ctx.strokeStyle = 'rgba(2, 6, 23, 0.55)';
        ctx.lineWidth = 1.5;
        for (let seg = 1; seg < 10; seg++) {
            const sx = x + (barWidth * seg) / 10;
            ctx.beginPath();
            ctx.moveTo(sx, y);
            ctx.lineTo(sx, y + barHeight);
            ctx.stroke();
        }

        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        for (let ti = 0; ti < BOSS_PHASE_TICKS.length; ti++) {
            const tx = x + barWidth * BOSS_PHASE_TICKS[ti];
            ctx.beginPath();
            ctx.moveTo(tx, y - 3);
            ctx.lineTo(tx, y + barHeight + 3);
            ctx.stroke();
        }

        const woundedTag = boss.woundedStacks ? ` • WOUNDED (-${boss.woundedStacks * 12}%)` : (boss.isWounded ? ' • WOUNDED' : '');
        const titleText = `${boss.def.name}${woundedTag} • PHASE ${boss.state?.phase || 1}`;
        ctx.font = 'bold 15px Orbitron';
        ctx.textAlign = 'center';
        ctx.fillStyle = '#020617';
        ctx.fillText(titleText, canvasWidth / 2 + 1, y - 7);
        ctx.fillStyle = '#ffffff';
        ctx.fillText(titleText, canvasWidth / 2, y - 8);

        if (boss.state?.custom?.exposedTimer && boss.state.custom.exposedTimer > 0) {
            ctx.font = 'bold 13px Orbitron';
            ctx.fillStyle = '#020617';
            ctx.fillText('⚡ EXPOSED (x2 DAMAGE) ⚡', canvasWidth / 2 + 1, y + barHeight + 19);
            ctx.fillStyle = '#fbbf24';
            ctx.fillText('⚡ EXPOSED (x2 DAMAGE) ⚡', canvasWidth / 2, y + barHeight + 18);
        }
    }
};
