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
    ctx.save();
    ctx.shadowBlur = 0;
    ctx.globalCompositeOperation = 'lighter';
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
        g.addColorStop(0, hexA(L.color, 0.55 * warm));
        g.addColorStop(0.7, hexA(L.color, 0.35 * warm * flicker));
        g.addColorStop(1, hexA(L.color, 0));
        ctx.beginPath();
        ctx.moveTo(60, 0);
        ctx.lineTo(L.length, -w * 1.6);
        ctx.lineTo(L.length, w * 1.6);
        ctx.closePath();
        ctx.fillStyle = g;
        ctx.fill();
        // hot core
        ctx.beginPath();
        ctx.moveTo(60, 0);
        ctx.lineTo(L.length, -w * 0.5);
        ctx.lineTo(L.length, w * 0.5);
        ctx.closePath();
        ctx.fillStyle = `rgba(255, 237, 213, ${0.75 * warm * flicker})`;
        ctx.fill();
        // thin white centre line
        ctx.globalAlpha = warm;
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2.5 * flicker;
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
