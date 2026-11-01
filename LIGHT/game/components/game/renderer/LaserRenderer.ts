// (2C) Crimson Eclipse live beams (state.lasers) + the eclipse blackout overlay.
// Beams: world space, drawn above enemies so they read on top of the boss body.
// Eclipse: screen space, drawn after the world but BEFORE telegraphs/hazards/beams are re-drawn on top of it
// (see Renderer.ts) so those stay visible in the dark — the whole point of the mechanic.
import { MutableGameState } from '../types';
import { Laser } from '../logic/enemies/bosses/CrimsonEclipse';

const hexA = (hex: string, a: number) => {
    const n = parseInt(hex.slice(1), 16);
    return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
};

export const drawLasers = (ctx: CanvasRenderingContext2D, state: MutableGameState) => {
    const list = state.lasers;
    if (!list || !list.length) return;
    const f = state.frame;
    // (BUGS #5) the outer wedge is drawn source-over (it used to be additive: four overlapping 820 px wedges
    // plus the flares summed to near-white and hid the spark, bullets and HUD). Only the thin core is additive.
    ctx.save();
    ctx.shadowBlur = 0;
    for (let i = 0; i < list.length; i++) {
        const L: Laser = list[i];
        const warm = L.warm;                       // 0 → 1 while igniting
        const flicker = 0.85 + 0.15 * Math.sin((f + i * 17) * 0.5);
        const half = L.half * (0.6 + 0.4 * warm);
        ctx.save();
        ctx.translate(L.x, L.y);
        ctx.rotate(L.angle);
        // outer glow wedge
        const w = Math.tan(half) * L.length;
        const g = ctx.createLinearGradient(0, 0, L.length, 0);
        g.addColorStop(0, hexA(L.color, 0.38 * warm));
        g.addColorStop(0.7, hexA(L.color, 0.22 * warm * flicker));
        g.addColorStop(1, hexA(L.color, 0));
        ctx.globalCompositeOperation = 'source-over';
        ctx.beginPath();
        ctx.moveTo(60, 0);
        ctx.lineTo(L.length, -w * 1.25);
        ctx.lineTo(L.length, w * 1.25);
        ctx.closePath();
        ctx.fillStyle = g;
        ctx.fill();
        // hot core (additive, narrow, red-orange rather than cream so it never reads as white)
        ctx.globalCompositeOperation = 'lighter';
        ctx.beginPath();
        ctx.moveTo(60, 0);
        ctx.lineTo(L.length, -w * 0.45);
        ctx.lineTo(L.length, w * 0.45);
        ctx.closePath();
        ctx.fillStyle = `rgba(251, 146, 60, ${0.45 * warm * flicker})`;
        ctx.fill();
        // thin pale centre line
        ctx.globalAlpha = 0.85 * warm;
        ctx.strokeStyle = '#fde68a';
        ctx.lineWidth = 2 * flicker;
        ctx.beginPath(); ctx.moveTo(60, 0); ctx.lineTo(L.length, 0); ctx.stroke();
        ctx.restore();
    }
    ctx.restore();
};

/** Screen-space blackout. Called twice from Renderer.ts: once to darken, then the "visible in the dark" layers are redrawn. */
export const drawEclipse = (ctx: CanvasRenderingContext2D, state: MutableGameState, w: number, h: number) => {
    const e = state.eclipse ?? 0;
    if (e <= 0.01) return;
    // ease in fast, hold, ease out: alpha peaks at 0.94 so the player silhouette is still faintly there
    const a = Math.min(0.94, e < 0.15 ? e / 0.15 : e > 0.9 ? (1 - e) / 0.1 : 1) * 0.94;
    ctx.save();
    ctx.globalAlpha = a;
    ctx.fillStyle = state.eclipseColor ?? '#05030a';
    ctx.fillRect(0, 0, w, h);
    ctx.restore();
};

export const eclipseStrength = (state: MutableGameState): number => {
    const e = state.eclipse ?? 0;
    if (e <= 0.01) return 0;
    return Math.min(1, e < 0.15 ? e / 0.15 : e > 0.9 ? (1 - e) / 0.1 : 1);
};
