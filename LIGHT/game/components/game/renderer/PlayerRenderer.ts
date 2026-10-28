import { MutableGameState } from '../types';
import { PlayerStats } from '../../../types';
import { feel } from '../Feel';
import { chapterIndexOf } from '../Constants';
import { chapterPalette, rgba } from './Palette';

// (5A) Player maturity: 6 visual stages, one per chapter of the current wave. Each stage adds corona rays and
// satellites around the white core; the colour is the existing MATURITY_LEVELS colour (currentStageColor) so the
// 80-step title ladder still shows, while the silhouette steps 6 times. Deterministic for the gallery (frame 0).
export const PLAYER_STAGES = 6;
export const playerStageOf = (wave: number): number => chapterIndexOf(Math.max(1, wave));
const STAGE_RAYS = [0, 4, 6, 8, 10, 12];       // corona rays per stage (index = stage - 1)
const STAGE_SATS = [0, 0, 1, 2, 3, 4];         // satellites per stage
const STAGE_CORONA = [1.0, 1.25, 1.5, 1.75, 2.0, 2.3];  // corona radius × size

/** Draws the spark body at the origin (caller translates). Shared by the run renderer and the gallery. */
export const drawSparkBody = (
    ctx: CanvasRenderingContext2D,
    size: number,
    stage: number,
    color: string,
    frame: number,
    alpha = 1,
    maturityScale = 1,
    chapterAccent?: string,
) => {
    const s = Math.max(1, Math.min(PLAYER_STAGES, stage));
    const rays = STAGE_RAYS[s - 1], sats = STAGE_SATS[s - 1];
    const coronaR = size * STAGE_CORONA[s - 1];
    const accent = chapterAccent ?? chapterPalette(s).accent;
    ctx.globalAlpha = alpha;

    // corona: soft disc + rays
    ctx.globalCompositeOperation = 'lighter';
    const g = ctx.createRadialGradient(0, 0, size * 0.5, 0, 0, coronaR * 1.4);
    g.addColorStop(0, rgba(color, 0.55));
    g.addColorStop(0.6, rgba(accent, 0.18));
    g.addColorStop(1, rgba(accent, 0));
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(0, 0, coronaR * 1.4, 0, Math.PI * 2); ctx.fill();
    if (rays > 0) {
        ctx.strokeStyle = accent; ctx.lineCap = 'round';
        for (let i = 0; i < rays; i++) {
            const a = (i / rays) * Math.PI * 2 + frame * 0.01;
            const len = coronaR * (0.9 + 0.15 * Math.sin(frame * 0.07 + i * 1.7));
            ctx.lineWidth = i % 2 === 0 ? 2.2 : 1.2;
            ctx.globalAlpha = alpha * (i % 2 === 0 ? 0.75 : 0.45);
            ctx.beginPath(); ctx.moveTo(Math.cos(a) * size * 0.9, Math.sin(a) * size * 0.9);
            ctx.lineTo(Math.cos(a) * len, Math.sin(a) * len); ctx.stroke();
        }
    }
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = alpha;

    // body: stage colour disc + white core (the original look)
    ctx.shadowBlur = 20 * maturityScale; ctx.shadowColor = color;
    ctx.fillStyle = color;
    ctx.beginPath(); ctx.arc(0, 0, size * 1.2, 0, Math.PI * 2); ctx.fill();
    ctx.shadowBlur = 30 * maturityScale; ctx.shadowColor = '#fff';
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(0, 0, size * 0.8, 0, Math.PI * 2); ctx.fill();
    ctx.shadowBlur = 0;

    // satellites: small motes orbiting at corona radius (stage 3+)
    if (sats > 0) {
        for (let i = 0; i < sats; i++) {
            const a = (i / sats) * Math.PI * 2 - frame * 0.03;
            const r = coronaR * 1.05;
            const x = Math.cos(a) * r, y = Math.sin(a) * r;
            ctx.fillStyle = accent; ctx.globalAlpha = alpha * 0.9;
            ctx.beginPath(); ctx.arc(x, y, size * 0.22, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#fff'; ctx.globalAlpha = alpha;
            ctx.beginPath(); ctx.arc(x, y, size * 0.1, 0, Math.PI * 2); ctx.fill();
        }
    }
    ctx.globalAlpha = 1;
};

/** Light Burst charge ring (3B): an arc that fills clockwise; full → bright pulse. Drawn at the origin. */
export const drawBurstRing = (ctx: CanvasRenderingContext2D, r: number, meter: number, frame: number, ready: boolean) => {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.lineCap = 'round';
    ctx.strokeStyle = 'rgba(255,255,255,0.18)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.stroke();
    if (meter > 0) {
        const pulse = ready ? 0.7 + 0.3 * Math.sin(frame * 0.25) : 0.85;
        ctx.strokeStyle = ready ? '#fde68a' : '#fff'; ctx.lineWidth = ready ? 3 : 2; ctx.globalAlpha = pulse;
        ctx.beginPath(); ctx.arc(0, 0, r, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * Math.min(1, meter)); ctx.stroke();
    }
    ctx.restore();
};

export const drawPlayer = (
    ctx: CanvasRenderingContext2D,
    state: MutableGameState,
    stats: PlayerStats,
    maturityScale: number,
    currentStageColor: string
) => {
    const lightRadius = state.player.size;
    const px = state.player.x, py = state.player.y;
    const stage = playerStageOf(state.currentWave ?? 1);

    // (4A) i-frame blink: alternate dim/bright every 3 frames while invulnerable after a hit;
    // reduceFlash softens it to a steady 0.7 so the player never disappears.
    const iframes = state.playerIFrames ?? 0;
    const blinkAlpha = iframes > 0
        ? (feel.reduceFlash ? 0.7 : (Math.floor(state.frame / 3) % 2 === 0 ? 0.35 : 1))
        : 1;

    // (5A) dash trail: 4 fading ghosts of the core behind the velocity while dashTimer > 0
    if (state.player.dashTimer > 0) {
        const vx = state.player.vx ?? 0, vy = state.player.vy ?? 0;
        const sp = Math.hypot(vx, vy) || 1;
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        for (let i = 1; i <= 4; i++) {
            const k = i * lightRadius * 1.1;
            ctx.globalAlpha = 0.35 * (1 - i / 5);
            ctx.fillStyle = currentStageColor;
            ctx.beginPath(); ctx.arc(px - (vx / sp) * k, py - (vy / sp) * k, lightRadius * (1.1 - i * 0.15), 0, Math.PI * 2); ctx.fill();
        }
        ctx.restore();
    }

    ctx.save();
    ctx.translate(px, py);
    drawSparkBody(ctx, lightRadius, stage, iframes > 0 ? '#f87171' : currentStageColor, state.frame, blinkAlpha, maturityScale);

    // (3B/5A) Light Burst charge ring around the corona
    const burst = state.burst;
    if (burst && burst.level > 0) drawBurstRing(ctx, lightRadius * 1.9, burst.meter, state.frame, burst.meter >= 1);
    ctx.restore();

    // Aura Damage Visual
    if (stats.damageAura > 0) {
        ctx.save();
        const auraRadius = 100 * maturityScale;
        const pulse = (state.frame % 60) / 60;
        ctx.globalAlpha = (1 - pulse) * 0.5;
        ctx.strokeStyle = '#f87171';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(px, py, auraRadius * pulse, 0, Math.PI * 2);
        ctx.stroke();
        const pulse2 = ((state.frame + 30) % 60) / 60;
        ctx.globalAlpha = (1 - pulse2) * 0.3;
        ctx.beginPath();
        ctx.arc(px, py, auraRadius * pulse2, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
    }
};
