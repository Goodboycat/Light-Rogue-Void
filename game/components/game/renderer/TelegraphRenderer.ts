// (2B) Draws boss telegraphs (warn shapes) and the white flash when they fire.
// World space; called from Renderer.ts under enemies, above the background.
import { MutableGameState } from '../types';
import { Telegraph, TelegraphFlash, TelegraphKind, TelegraphParams } from '../logic/enemies/BossKit';
import { TELEGRAPH_ALPHA_MIN, TELEGRAPH_ALPHA_MAX, TELEGRAPH_FLASH_FRAMES } from '../Constants';

const tracePath = (ctx: CanvasRenderingContext2D, kind: TelegraphKind, x: number, y: number, p: TelegraphParams) => {
    ctx.beginPath();
    switch (kind) {
        case 'circle':
            ctx.arc(x, y, p.radius ?? 0, 0, Math.PI * 2);
            break;
        case 'ring':
            ctx.arc(x, y, p.radius ?? 0, 0, Math.PI * 2);
            ctx.arc(x, y, p.innerRadius ?? 0, 0, Math.PI * 2, true);
            break;
        case 'cone': {
            const a = p.angle ?? 0, half = (p.fov ?? Math.PI / 4) / 2, r = p.radius ?? 0;
            ctx.moveTo(x, y);
            ctx.arc(x, y, r, a - half, a + half);
            ctx.closePath();
            break;
        }
        case 'line': {
            const a = p.angle ?? 0, len = p.length ?? 0, w = (p.width ?? 0) / 2;
            const nx = -Math.sin(a) * w, ny = Math.cos(a) * w;
            const ex = x + Math.cos(a) * len, ey = y + Math.sin(a) * len;
            ctx.moveTo(x + nx, y + ny); ctx.lineTo(ex + nx, ey + ny);
            ctx.lineTo(ex - nx, ey - ny); ctx.lineTo(x - nx, y - ny);
            ctx.closePath();
            break;
        }
    }
};

export const drawTelegraphs = (ctx: CanvasRenderingContext2D, state: MutableGameState) => {
    const pool = state.telegraphs;
    const flashes = state.telegraphFlashes;
    if (!pool && !flashes) return;
    ctx.save();
    ctx.shadowBlur = 0;
    ctx.lineJoin = 'round';

    if (pool) {
        for (let i = 0; i < pool.length; i++) {
            const t: Telegraph = pool[i];
            if (!t.active) continue;
            const prog = 1 - t.timer / t.maxTimer; // 0 → 1
            const color = t.params.color ?? '#ef4444';
            tracePath(ctx, t.kind, t.x, t.y, t.params);
            // fill ramps 0.15 → 0.45
            ctx.globalAlpha = TELEGRAPH_ALPHA_MIN + (TELEGRAPH_ALPHA_MAX - TELEGRAPH_ALPHA_MIN) * prog;
            ctx.fillStyle = color;
            ctx.fill('evenodd');
            // white edge, thickens as it nears firing
            ctx.globalAlpha = 0.5 + 0.5 * prog;
            ctx.lineWidth = 1.5 + prog * 2.5;
            ctx.strokeStyle = '#ffffff';
            ctx.stroke();
            // inner "fuse" — for circles/rings a shrinking second outline shows time left
            if (t.kind === 'circle' || t.kind === 'cone') {
                const r = (t.params.radius ?? 0) * prog;
                if (r > 2) {
                    ctx.beginPath();
                    if (t.kind === 'circle') ctx.arc(t.x, t.y, r, 0, Math.PI * 2);
                    else { const a = t.params.angle ?? 0, half = (t.params.fov ?? Math.PI / 4) / 2; ctx.moveTo(t.x, t.y); ctx.arc(t.x, t.y, r, a - half, a + half); ctx.closePath(); }
                    ctx.globalAlpha = 0.35;
                    ctx.lineWidth = 1;
                    ctx.strokeStyle = color;
                    ctx.stroke();
                }
            }
        }
    }

    if (flashes) {
        ctx.globalCompositeOperation = 'lighter';
        for (let i = 0; i < flashes.length; i++) {
            const f: TelegraphFlash = flashes[i];
            const a = f.frames / TELEGRAPH_FLASH_FRAMES; // 1 → 0
            tracePath(ctx, f.kind, f.x, f.y, f.params);
            ctx.globalAlpha = 0.7 * a;
            ctx.fillStyle = '#ffffff';
            ctx.fill('evenodd');
            ctx.globalAlpha = a;
            ctx.lineWidth = 3;
            ctx.strokeStyle = f.params.color ?? '#ffffff';
            ctx.stroke();
        }
    }
    ctx.restore();
};

// ---------------------------------------------------------------- arena (2B)
/** World-space ring. Pulse (0..1) widens + brightens it on phase shift / enrage. */
export const drawArena = (ctx: CanvasRenderingContext2D, state: MutableGameState) => {
    const a = state.arena;
    if (!a) return;
    ctx.save();
    ctx.shadowBlur = 0;
    const pulse = a.pulse;
    // outside = dark void tint (a huge ring beyond the arena)
    ctx.beginPath();
    ctx.arc(a.x, a.y, a.r + 4000, 0, Math.PI * 2);
    ctx.arc(a.x, a.y, a.r, 0, Math.PI * 2, true);
    ctx.fillStyle = 'rgba(10, 0, 25, 0.45)';
    ctx.fill('evenodd');
    // ring
    const breathe = 1 + Math.sin(state.frame * 0.05) * 0.08;
    ctx.globalAlpha = 0.55 + pulse * 0.45;
    ctx.lineWidth = 4 * breathe + pulse * 10;
    ctx.strokeStyle = a.color;
    ctx.beginPath(); ctx.arc(a.x, a.y, a.r, 0, Math.PI * 2); ctx.stroke();
    ctx.globalAlpha = 0.25 + pulse * 0.4;
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = '#ffffff';
    ctx.beginPath(); ctx.arc(a.x, a.y, a.r - 10 - pulse * 30, 0, Math.PI * 2); ctx.stroke();
    // rotating ticks
    ctx.globalAlpha = 0.5;
    ctx.lineWidth = 2;
    ctx.strokeStyle = a.color;
    const rot = state.frame * 0.004;
    ctx.beginPath();
    for (let i = 0; i < 24; i++) {
        const ang = rot + (i / 24) * Math.PI * 2;
        ctx.moveTo(a.x + Math.cos(ang) * (a.r + 6), a.y + Math.sin(ang) * (a.r + 6));
        ctx.lineTo(a.x + Math.cos(ang) * (a.r + 18), a.y + Math.sin(ang) * (a.r + 18));
    }
    ctx.stroke();
    ctx.restore();
};

/** Screen-space purple edge vignette while the player is outside the arena. */
export const drawArenaVignette = (ctx: CanvasRenderingContext2D, outside: number, w: number, h: number) => {
    if (outside <= 0) return;
    ctx.save();
    const g = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.25, w / 2, h / 2, Math.max(w, h) * 0.75);
    g.addColorStop(0, 'rgba(90, 0, 160, 0)');
    g.addColorStop(1, `rgba(90, 0, 160, ${0.75 * outside})`);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    ctx.restore();
};
