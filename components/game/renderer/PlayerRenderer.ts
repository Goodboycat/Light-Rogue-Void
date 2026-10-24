import { MutableGameState, ParticleType } from '../types';
import { PlayerStats } from '../../../types';
import { getGlowSprite } from './GlowSprites';
import { getCosmeticById } from '../../../data/cosmetics';
import { createParticle } from '../Particles';
import { getQuality } from '../Quality';

export const drawPlayer = (
    ctx: CanvasRenderingContext2D,
    state: MutableGameState,
    stats: PlayerStats,
    maturityScale: number,
    currentStageColor: string
) => {
    const Q = getQuality(state.performanceMode);

    let effectiveScale = maturityScale;
    if (state.maturityTweenTimer && state.maturityTweenTimer > 0) {
        state.maturityTweenTimer--;
        const t = 1 - state.maturityTweenTimer / 18;
        const c1 = 1.70158;
        const c3 = c1 + 1;
        const easeOutBack = 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
        const startS = state.maturityPrevScale || Math.max(1, maturityScale - 0.05);
        effectiveScale = startS + (maturityScale - startS) * easeOutBack;
    }

    const skin = getCosmeticById(state.equippedSkin, 'skin');
    const trail = getCosmeticById(state.equippedTrail, 'trail');
    const isCustomSkin = skin.id !== 'skin_default';
    const stageOrSkinGlow = isCustomSkin ? skin.glowColor : currentStageColor;
    const coreColor = isCustomSkin ? skin.coreColor : '#ffffff';
    const ringColor = isCustomSkin ? skin.ringColor : currentStageColor;

    // Emit cosmetic trail motes when moving (uses existing pooled particle system; simplified on LOW)
    const speedSq = state.player.vx * state.player.vx + state.player.vy * state.player.vy;
    const isLowPerf = Q.mode === 'LOW';
    if (trail.id !== 'trail_default' && speedSq > 0.5) {
        const interval = isLowPerf ? 6 : 2;
        if (state.frame % interval === 0) {
            createParticle(state, state.player.x, state.player.y, ParticleType.GLOW, trail.glowColor, {
                vx: -state.player.vx * 0.15 + (Math.random() - 0.5) * 0.6,
                vy: -state.player.vy * 0.15 + (Math.random() - 0.5) * 0.6,
                life: isLowPerf ? 12 : 22,
                size: (isLowPerf ? 4 : 6) * effectiveScale,
            });
        }
    }

    const lightRadius = state.player.size;

    const prevAlpha = ctx.globalAlpha;
    let baseAlpha = 1;
    if (state.player.invulnTimer && state.player.invulnTimer > 0) {
        baseAlpha = Math.floor(state.player.invulnTimer / 4) % 2 === 0 ? 0.35 : 1;
    }

    // 1. Inner Glow (Background) - Pre-rendered GlowSprite
    if (Q.glow) {
        const innerGlowSize = lightRadius * 1.2 * 2.4 * effectiveScale;
        const innerSprite = getGlowSprite(stageOrSkinGlow, 128);
        ctx.globalAlpha = baseAlpha;
        ctx.drawImage(
            innerSprite,
            state.player.x - innerGlowSize / 2,
            state.player.y - innerGlowSize / 2,
            innerGlowSize,
            innerGlowSize
        );
    }

    ctx.globalAlpha = baseAlpha;
    ctx.fillStyle = stageOrSkinGlow;
    ctx.beginPath();
    ctx.arc(state.player.x, state.player.y, lightRadius * 1.2, 0, Math.PI * 2);
    ctx.fill();

    // 2. Core (Foreground) - Pre-rendered GlowSprite
    if (Q.glow) {
        const coreGlowSize = lightRadius * 0.8 * 2.4 * effectiveScale;
        const coreSprite = getGlowSprite(coreColor, 128);
        ctx.globalAlpha = baseAlpha;
        ctx.drawImage(
            coreSprite,
            state.player.x - coreGlowSize / 2,
            state.player.y - coreGlowSize / 2,
            coreGlowSize,
            coreGlowSize
        );
    }

    ctx.fillStyle = coreColor;
    ctx.beginPath();
    ctx.arc(state.player.x, state.player.y, lightRadius * 0.8, 0, Math.PI * 2);
    ctx.fill();

    // Outer Aura Ring for visibility on mobile
    ctx.strokeStyle = ringColor;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(state.player.x, state.player.y, lightRadius * 3.5, 0, Math.PI * 2);
    ctx.globalAlpha = 0.5 * baseAlpha;
    ctx.stroke();
    ctx.globalAlpha = baseAlpha;

    // Aura Damage Visual
    if (stats.damageAura > 0) {
        const auraRadius = 100 * effectiveScale;
        const pulse = (state.frame % 60) / 60;
        ctx.globalAlpha = (1 - pulse) * 0.5 * baseAlpha;
        ctx.strokeStyle = '#f87171';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(state.player.x, state.player.y, auraRadius * pulse, 0, Math.PI * 2);
        ctx.stroke();

        const pulse2 = ((state.frame + 30) % 60) / 60;
        ctx.globalAlpha = (1 - pulse2) * 0.3 * baseAlpha;
        ctx.beginPath();
        ctx.arc(state.player.x, state.player.y, auraRadius * pulse2, 0, Math.PI * 2);
        ctx.stroke();
        ctx.globalAlpha = baseAlpha;
    }

    // Tiny hitbox dot on the player (setting, default ON on touch)
    const showHitboxDot = state.settings?.showHitboxDot !== undefined
        ? state.settings.showHitboxDot
        : (state.settings?.showTouchControls !== false);
    if (showHitboxDot) {
        ctx.fillStyle = '#020617';
        ctx.beginPath();
        ctx.arc(state.player.x, state.player.y, 3.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#22d3ee';
        ctx.beginPath();
        ctx.arc(state.player.x, state.player.y, 1.8, 0, Math.PI * 2);
        ctx.fill();
    }

    ctx.globalAlpha = prevAlpha;
};
