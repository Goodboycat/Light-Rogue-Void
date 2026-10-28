// (5A) Drops: essence orbs in 3 sizes by value (small < 10, medium < 50, large) and the relic drop (3A) as a
// hexagonal gem. One shape language: dark outline, body, bright core, additive glow. Shared with the gallery.
import type { MutableGameState, Drop } from '../types';
import { glow } from './Palette';

export const ESSENCE_SIZE_TIERS = [10, 50];   // value thresholds: < 10 small, < 50 medium, else large
export const essenceTier = (value: number): 0 | 1 | 2 => value < ESSENCE_SIZE_TIERS[0] ? 0 : value < ESSENCE_SIZE_TIERS[1] ? 1 : 2;
const TIER_R = [4, 6.5, 9.5];
const TIER_COL = ['#c084fc', '#a78bfa', '#f0abfc'];

export const drawEssenceOrb = (ctx: CanvasRenderingContext2D, x: number, y: number, value: number, frame: number) => {
    const tier = essenceTier(value);
    const r = TIER_R[tier] * (1 + Math.sin(frame * 0.1 + x * 0.01) * 0.12);
    ctx.save();
    ctx.translate(x, y);
    glow(ctx, TIER_COL[tier], r * 2.6, tier === 2 ? 0.75 : 0.5);
    ctx.fillStyle = TIER_COL[tier];
    ctx.strokeStyle = '#05060a'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath(); ctx.arc(-r * 0.3, -r * 0.3, r * 0.35, 0, Math.PI * 2); ctx.fill();
    if (tier === 2) {   // large: 4 sparkle ticks
        ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1; ctx.globalAlpha = 0.8;
        for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2 + frame * 0.03; ctx.beginPath(); ctx.moveTo(Math.cos(a) * r * 1.2, Math.sin(a) * r * 1.2); ctx.lineTo(Math.cos(a) * r * 1.8, Math.sin(a) * r * 1.8); ctx.stroke(); }
    }
    ctx.restore();
};

export const drawRelicDrop = (ctx: CanvasRenderingContext2D, x: number, y: number, frame: number) => {
    const r = 11 + Math.sin(frame * 0.08) * 1.5;
    ctx.save();
    ctx.translate(x, y);
    glow(ctx, '#fde68a', r * 3, 0.7);
    ctx.rotate(frame * 0.02);
    ctx.fillStyle = '#f59e0b'; ctx.strokeStyle = '#05060a'; ctx.lineWidth = 2;
    ctx.beginPath(); for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3; ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r); } ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#fde68a';
    ctx.beginPath(); for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3; ctx.lineTo(Math.cos(a) * r * 0.55, Math.sin(a) * r * 0.55); } ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath(); ctx.arc(-r * 0.2, -r * 0.2, r * 0.2, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
};

export const drawDrops = (ctx: CanvasRenderingContext2D, state: MutableGameState, view?: { cx: number; cy: number; halfW: number; halfH: number }) => {
    const cullW = view ? view.halfW + 64 : Infinity, cullH = view ? view.halfH + 64 : Infinity;
    const drops: Drop[] = state.drops;
    for (let i = 0; i < drops.length; i++) {
        const d = drops[i];
        if (view && (Math.abs(d.x - view.cx) > cullW || Math.abs(d.y - view.cy) > cullH)) continue;
        if (d.relicId) drawRelicDrop(ctx, d.x, d.y, state.frame);
        else drawEssenceOrb(ctx, d.x, d.y, d.value, state.frame);
    }
};
