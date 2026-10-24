import { MutableGameState } from '../types';
import { Settings } from '../../../types';
import { drawGlow } from './GlowSprites';
import { getQuality } from '../Quality';

export const THREAT_CONFIG = {
    maxDist: 1200,
    maxDistSq: 1440000,
    minDist: 320,
    maxThreatsNormal: 12,
    maxThreatsLow: 6,
    edgeMargin: 36,
    pulseFrames: 24, // 0.4 s
};

export interface ThreatCandidate {
    x: number;
    y: number;
    distSq: number;
    color: string;
    priority: number;
    pulseTimer: number;
}

// Fixed zero-allocation candidate pool (12 slots)
const POOL_SIZE = 12;
const THREAT_POOL: ThreatCandidate[] = Array.from({ length: POOL_SIZE }, () => ({
    x: 0,
    y: 0,
    distSq: 0,
    color: '#ef4444',
    priority: 0,
    pulseTimer: 0
}));

let activeCount = 0;

function tryAddThreat(
    x: number,
    y: number,
    distSq: number,
    color: string,
    priority: number,
    pulseTimer: number,
    maxAllowed: number
) {
    if (activeCount < maxAllowed) {
        const slot = THREAT_POOL[activeCount];
        slot.x = x;
        slot.y = y;
        slot.distSq = distSq;
        slot.color = color;
        slot.priority = priority;
        slot.pulseTimer = pulseTimer;
        activeCount++;
        return;
    }

    let worstIdx = -1;
    let worstPriority = priority;
    let worstDist = distSq;

    for (let i = 0; i < activeCount; i++) {
        const cand = THREAT_POOL[i];
        if (cand.priority < worstPriority || (cand.priority === worstPriority && cand.distSq > worstDist)) {
            worstPriority = cand.priority;
            worstDist = cand.distSq;
            worstIdx = i;
        }
    }

    if (worstIdx !== -1) {
        const slot = THREAT_POOL[worstIdx];
        slot.x = x;
        slot.y = y;
        slot.distSq = distSq;
        slot.color = color;
        slot.priority = priority;
        slot.pulseTimer = pulseTimer;
    }
}

export const renderThreatIndicators = (
    ctx: CanvasRenderingContext2D,
    state: MutableGameState,
    canvasWidth: number,
    canvasHeight: number,
    settings?: Settings
) => {
    if (settings?.threatArrows === false) return;

    const isLowPerf = settings?.performanceMode === 'LOW';
    const maxThreats = isLowPerf ? THREAT_CONFIG.maxThreatsLow : THREAT_CONFIG.maxThreatsNormal;

    activeCount = 0;
    const px = state.player.x;
    const py = state.player.y;
    const zoom = state.camera.zoom || 1.0;
    const invZoom = 1 / Math.max(0.5, zoom);
    const maxDist = THREAT_CONFIG.maxDist * invZoom;
    const maxDistSq = maxDist * maxDist;

    const halfW = canvasWidth / 2 - THREAT_CONFIG.edgeMargin;
    const halfH = canvasHeight / 2 - THREAT_CONFIG.edgeMargin;

    // 1. Scan Projectiles
    const projectiles = state.projectiles;
    for (let i = 0; i < projectiles.length; i++) {
        const proj = projectiles[i];
        if (!proj.isEnemy) continue;

        const isHoming = proj.visualType === 'HOMING_MISSILE' ||
            proj.visualType === 'CRIMSON_COMET' ||
            proj.visualType === 'VOID_RIFT' ||
            proj.visualType === 'RAILGUN_BEAM' ||
            proj.visualType === 'DEATH_RAY' ||
            proj.customData?.isHoming ||
            proj.customData?.isDart ||
            proj.customData?.warmup !== undefined;

        if (!isHoming) continue;

        if ((proj as any).pulseTimer === undefined) {
            (proj as any).pulseTimer = THREAT_CONFIG.pulseFrames;
        } else if ((proj as any).pulseTimer > 0) {
            (proj as any).pulseTimer--;
        }

        const pulseTimer = (proj as any).pulseTimer || 0;

        const dx = proj.x - px;
        const dy = proj.y - py;
        const distSq = dx * dx + dy * dy;

        if (distSq > maxDistSq) continue;

        const screenX = (proj.x - state.camera.x - canvasWidth / 2) * zoom + canvasWidth / 2;
        const screenY = (proj.y - state.camera.y - canvasHeight / 2) * zoom + canvasHeight / 2;

        const isOffscreen = screenX < THREAT_CONFIG.edgeMargin ||
            screenX > canvasWidth - THREAT_CONFIG.edgeMargin ||
            screenY < THREAT_CONFIG.edgeMargin ||
            screenY > canvasHeight - THREAT_CONFIG.edgeMargin;

        if (isOffscreen) {
            tryAddThreat(proj.x, proj.y, distSq, '#ef4444', 3, pulseTimer, maxThreats);
        }
    }

    // 2. Scan Enemies
    const enemies = state.enemies;
    for (let i = 0; i < enemies.length; i++) {
        const e = enemies[i];

        const isBoss = e.isBoss || e === state.activeBoss;
        const isElite = (e as any).isElite || e.state?.custom?.isElite || e.state?.custom?.isGoldElite;
        const isLoot = e.def.id.includes('treasure') || e.def.behavior === 'MIMIC' || e.state?.custom?.isLootEnemy || e.def.essenceReward >= 500;
        const isSniper = e.def.behavior === 'SNIPER' || e.def.behavior === 'LASER_SPIN' || e.isSemiBoss;

        if (!isBoss && !isElite && !isLoot && !isSniper) continue;

        const dx = e.x - px;
        const dy = e.y - py;
        const distSq = dx * dx + dy * dy;

        if (distSq > maxDistSq) continue;

        const screenX = (e.x - state.camera.x - canvasWidth / 2) * zoom + canvasWidth / 2;
        const screenY = (e.y - state.camera.y - canvasHeight / 2) * zoom + canvasHeight / 2;

        const isOffscreen = screenX < THREAT_CONFIG.edgeMargin ||
            screenX > canvasWidth - THREAT_CONFIG.edgeMargin ||
            screenY < THREAT_CONFIG.edgeMargin ||
            screenY > canvasHeight - THREAT_CONFIG.edgeMargin;

        if (isOffscreen) {
            let color = '#ef4444';
            let priority = 2;

            if (isBoss) {
                color = '#a855f7'; // Purple boss
                priority = 5;
            } else if (isLoot) {
                color = '#fbbf24'; // Gold loot
                priority = 4;
            } else if (isElite) {
                color = '#f97316'; // Orange elite
                priority = 3;
            } else if (isSniper) {
                color = '#ef4444'; // Red sniper
                priority = 2;
            }

            tryAddThreat(e.x, e.y, distSq, color, priority, 0, maxThreats);
        }
    }

    // Sort active candidates in pool by distance ascending (closest first)
    for (let i = 0; i < activeCount - 1; i++) {
        for (let j = i + 1; j < activeCount; j++) {
            if (THREAT_POOL[j].distSq < THREAT_POOL[i].distSq) {
                const temp = THREAT_POOL[i];
                THREAT_POOL[i] = THREAT_POOL[j];
                THREAT_POOL[j] = temp;
            }
        }
    }

    // 3. Render Chevrons (no shadowBlur, no save/restore inside per-entity loop)
    const Q = getQuality(settings?.performanceMode || state.performanceMode);
    for (let i = 0; i < activeCount; i++) {
        const t = THREAT_POOL[i];
        const screenX = (t.x - state.camera.x - canvasWidth / 2) * zoom + canvasWidth / 2;
        const screenY = (t.y - state.camera.y - canvasHeight / 2) * zoom + canvasHeight / 2;

        const dx = screenX - canvasWidth / 2;
        const dy = screenY - canvasHeight / 2;
        const angle = Math.atan2(dy, dx);

        const cos = Math.cos(angle);
        const sin = Math.sin(angle);

        let indicatorX = canvasWidth / 2;
        let indicatorY = canvasHeight / 2;

        if (Math.abs(cos * halfH) > Math.abs(sin * halfW)) {
            indicatorX = canvasWidth / 2 + (cos > 0 ? halfW : -halfW);
            indicatorY = canvasHeight / 2 + (sin * (halfW / Math.abs(cos)));
        } else {
            indicatorX = canvasWidth / 2 + (cos * (halfH / Math.abs(sin)));
            indicatorY = canvasHeight / 2 + (sin > 0 ? halfH : -halfH);
        }

        const dist = Math.sqrt(t.distSq);
        const distRatio = Math.max(0, Math.min(1, (THREAT_CONFIG.maxDist - dist) / (THREAT_CONFIG.maxDist - THREAT_CONFIG.minDist)));
        const opacity = Math.min(1, 0.4 + distRatio * 0.6);
        let baseSize = 10 + distRatio * 10;

        if (t.pulseTimer > 0) {
            const pulseFactor = 1 + (t.pulseTimer / THREAT_CONFIG.pulseFrames) * 0.6;
            baseSize *= pulseFactor;
            drawGlow(ctx, indicatorX, indicatorY, baseSize * 1.6, t.color, opacity * 0.6, Q.glow);
        }

        ctx.globalAlpha = opacity;
        ctx.fillStyle = t.color;

        const tipX = indicatorX + cos * baseSize;
        const tipY = indicatorY + sin * baseSize;
        const wx = -baseSize * 0.5;
        const wy = baseSize * 0.7;
        const topX = indicatorX + cos * wx + sin * wy;
        const topY = indicatorY + sin * wx - cos * wy;
        const notchX = indicatorX - cos * (baseSize * 0.1);
        const notchY = indicatorY - sin * (baseSize * 0.1);
        const botX = indicatorX + cos * wx - sin * wy;
        const botY = indicatorY + sin * wx + cos * wy;

        ctx.beginPath();
        ctx.moveTo(tipX, tipY);
        ctx.lineTo(topX, topY);
        ctx.lineTo(notchX, notchY);
        ctx.lineTo(botX, botY);
        ctx.closePath();
        ctx.fill();
    }
    ctx.globalAlpha = 1.0;
};
