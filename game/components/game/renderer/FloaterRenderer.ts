// (4A) Damage numbers, streak banner, hurt vignette / low-HP heartbeat.
import { MutableGameState } from '../types';
import { FLOATER_LIFE, LOW_HP_PCT, STREAK_BANNER_FRAMES } from '../Constants';
import { feel } from '../Feel';
import { getHurtVignetteSprite } from './GlowSprites';

/** World space — call inside the camera transform. One font set per pass, outline + fill. */
export const drawFloaters = (ctx: CanvasRenderingContext2D, state: MutableGameState) => {
    const pool = state.floaters;
    if (!pool) return;
    let any = false;
    for (let i = 0; i < pool.length; i++) if (pool[i].active) { any = true; break; }
    if (!any) return;

    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#020617';

    // normal numbers first, then crits (so gold sits on top)
    for (let pass = 0; pass < 2; pass++) {
        const crit = pass === 1;
        ctx.font = crit ? 'bold 22px Orbitron, monospace' : 'bold 15px monospace';
        ctx.fillStyle = crit ? '#fbbf24' : '#f8fafc';
        ctx.lineWidth = crit ? 4 : 3;
        for (let i = 0; i < pool.length; i++) {
            const f = pool[i];
            if (!f.active || f.crit !== crit) continue;
            const t = f.life / FLOATER_LIFE;
            ctx.globalAlpha = t < 0.3 ? t / 0.3 : 1;
            // pop-in: first frames slightly larger
            const scale = f.life > FLOATER_LIFE - 4 ? 1.25 : 1;
            const label = String(Math.round(f.value));
            if (scale !== 1) {
                ctx.save(); ctx.translate(f.x, f.y); ctx.scale(scale, scale);
                ctx.strokeText(label, 0, 0); ctx.fillText(label, 0, 0);
                ctx.restore();
            } else {
                ctx.strokeText(label, f.x, f.y);
                ctx.fillText(label, f.x, f.y);
            }
        }
    }
    ctx.restore();
};

/** Screen space. Short banner at tiers 10 / 25 / 50 + LIGHT one-liner. */
export const drawStreakBanner = (ctx: CanvasRenderingContext2D, state: MutableGameState, w: number, h: number) => {
    const b = state.streakBanner;
    if (!b) return;
    const age = STREAK_BANNER_FRAMES - b.frames;
    const fadeIn = Math.min(1, age / 8);
    const fadeOut = Math.min(1, b.frames / 20);
    const a = Math.min(fadeIn, fadeOut);
    const y = Math.min(h * 0.26, 150) - (1 - fadeIn) * 20;

    ctx.save();
    ctx.globalAlpha = a;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const big = w < 500 ? 26 : 34;
    ctx.font = `bold ${big}px Orbitron, monospace`;
    ctx.fillStyle = b.tier >= 50 ? '#fbbf24' : b.tier >= 25 ? '#f8fafc' : '#c4b5fd';
    ctx.shadowColor = ctx.fillStyle as string;
    ctx.shadowBlur = 18;
    ctx.fillText(`${b.tier} STREAK`, w / 2, y);
    ctx.shadowBlur = 0;
    ctx.font = `${w < 500 ? 13 : 16}px monospace`;
    ctx.fillStyle = '#e2e8f0';
    ctx.fillText(b.text, w / 2, y + big * 0.9);
    ctx.restore();
};

/** Screen space. Red vignette pulse on hurt; slow heartbeat tint when HP < LOW_HP_PCT. */
export const drawHurtOverlay = (ctx: CanvasRenderingContext2D, state: MutableGameState, w: number, h: number) => {
    let alpha = 0;
    if ((state.hurtVignette ?? 0) > 0) alpha = Math.max(alpha, (state.hurtVignette! / 14) * 0.75);
    const hp = state.hpRatio ?? 1;
    if (hp < LOW_HP_PCT && hp > 0) {
        const beat = (Math.sin(state.frame * 0.09) + 1) / 2; // ~1.2 Hz
        alpha = Math.max(alpha, 0.12 + beat * 0.2 * (1 - hp / LOW_HP_PCT));
    }
    if (alpha <= 0.01) return;
    if (feel.reduceFlash) alpha *= 0.5;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.drawImage(getHurtVignetteSprite(), 0, 0, w, h);
    ctx.restore();
};
