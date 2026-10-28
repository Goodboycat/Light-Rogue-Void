// (3A step 4) Draws world points procedurally (no assets), the discovery card, and the off-screen arrow.
// World-space parts are called inside the camera transform; screen-space parts after ctx.restore().
import { MutableGameState } from '../types';
import { WORLD_GLOW_RANGE, WORLD_TOUCH_RADIUS, WORLD_ARROW_CHAPTERS, WORLD_EVENT_RING, WORLD_SPARK_RADIUS, chapterIndexOf } from '../Constants';
import { landmarkById, shrineById, relicById, worldEventById } from '../../../data/world';
import { WorldPoint, nearestOpenPoint } from '../logic/WorldLogic';

const colorOf = (p: WorldPoint): string => {
    switch (p.kind) {
        case 'landmark': return landmarkById(p.id)?.color ?? '#fff';
        case 'shrine': return shrineById(p.id as any)?.color ?? '#fff';
        case 'relic': return relicById(p.id as any)?.color ?? '#fff';
        case 'event': return worldEventById(p.id as any)?.color ?? '#fff';
    }
};

const poly = (ctx: CanvasRenderingContext2D, pts: [number, number][]) => {
    ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
    ctx.closePath();
};

// ---- silhouettes (origin at the point, ~120 px across) ----
const drawLandmark = (ctx: CanvasRenderingContext2D, p: WorldPoint, c: string, t: number) => {
    ctx.strokeStyle = c; ctx.fillStyle = c; ctx.lineWidth = 2;
    switch (p.id) {
        case 'fallen_beacon': { // toppled tower + sweeping lens beam
            ctx.save(); ctx.rotate(-0.9 + p.seed * 0.4);
            ctx.globalAlpha = 0.35; ctx.fillRect(-10, -90, 20, 120);
            ctx.globalAlpha = 0.9; ctx.strokeRect(-10, -90, 20, 120);
            ctx.beginPath(); ctx.arc(0, -96, 14, 0, Math.PI * 2); ctx.fill();
            ctx.restore();
            const sweep = t * 0.6;
            ctx.save(); ctx.globalAlpha = 0.18; ctx.translate(Math.cos(-0.9 + p.seed * 0.4 + Math.PI / 2) * 96 * -1, -Math.sin(-0.9 + p.seed * 0.4 + Math.PI / 2) * 96 * -1);
            ctx.rotate(sweep); poly(ctx, [[0, 0], [260, -26], [260, 26]]); ctx.fill(); ctx.restore();
            break;
        }
        case 'whisper_stones': { // ring of 7 standing stones
            for (let i = 0; i < 7; i++) {
                const a = (i / 7) * Math.PI * 2 + p.seed, r = 54;
                ctx.save(); ctx.translate(Math.cos(a) * r, Math.sin(a) * r); ctx.rotate(a + Math.PI / 2 + (p.seed - 0.5) * 0.4);
                ctx.globalAlpha = 0.4; ctx.fillRect(-7, -20 - (i % 3) * 5, 14, 40 + (i % 3) * 10);
                ctx.globalAlpha = 0.9; ctx.strokeRect(-7, -20 - (i % 3) * 5, 14, 40 + (i % 3) * 10);
                ctx.restore();
            }
            ctx.globalAlpha = 0.25 + 0.1 * Math.sin(t * 2); ctx.beginPath(); ctx.arc(0, 0, 54, 0, Math.PI * 2); ctx.stroke();
            break;
        }
        case 'crystal_spire': { // tall shard cluster
            const shards: [number, number, number][] = [[0, 0, 110], [-26, 10, 70], [28, 14, 60], [-10, 18, 40], [14, 20, 36]];
            for (const [x, y, h] of shards) {
                ctx.save(); ctx.translate(x, y);
                ctx.globalAlpha = 0.35; poly(ctx, [[-10, 0], [0, -h], [10, 0]]); ctx.fill();
                ctx.globalAlpha = 0.9; ctx.stroke();
                ctx.restore();
            }
            ctx.globalAlpha = 0.6 + 0.4 * Math.sin(t * 3 + p.phase); ctx.beginPath(); ctx.arc(0, -110, 4, 0, Math.PI * 2); ctx.fill();
            break;
        }
        case 'dead_engine': { // ring + hub + spokes, slowly ticking
            ctx.globalAlpha = 0.9; ctx.lineWidth = 4;
            ctx.beginPath(); ctx.arc(0, 0, 56, 0, Math.PI * 2); ctx.stroke();
            ctx.save(); ctx.rotate(Math.floor(t * 0.8) * (Math.PI / 6)); ctx.lineWidth = 2;
            for (let i = 0; i < 6; i++) { ctx.rotate(Math.PI / 3); ctx.beginPath(); ctx.moveTo(0, -14); ctx.lineTo(0, -56); ctx.stroke(); }
            ctx.restore();
            ctx.globalAlpha = 0.5 + 0.3 * Math.sin(t * 1.5); ctx.beginPath(); ctx.arc(0, 0, 14, 0, Math.PI * 2); ctx.fill();
            break;
        }
        case 'bone_field': { // arcs of ribs
            ctx.lineWidth = 3; ctx.globalAlpha = 0.8;
            for (let i = 0; i < 6; i++) {
                const x = -75 + i * 30, h = 60 + Math.sin(i * 1.7 + p.seed * 9) * 20;
                ctx.beginPath(); ctx.arc(x, 20, h, Math.PI * 1.05, Math.PI * 1.55); ctx.stroke();
            }
            ctx.beginPath(); ctx.moveTo(-90, 20); ctx.lineTo(90, 20); ctx.stroke();
            break;
        }
        default: { // the_seam: a vertical tear with violet stitches
            ctx.lineWidth = 3; ctx.globalAlpha = 0.9;
            ctx.beginPath(); ctx.moveTo(0, -90); for (let y = -90; y <= 90; y += 15) ctx.lineTo(Math.sin(y * 0.11 + t) * 6, y); ctx.stroke();
            ctx.strokeStyle = '#a78bfa'; ctx.lineWidth = 2; ctx.globalAlpha = 0.7;
            for (let y = -75; y <= 75; y += 25) { ctx.beginPath(); ctx.moveTo(-16, y - 8); ctx.lineTo(16, y + 8); ctx.stroke(); }
        }
    }
};

const drawShrine = (ctx: CanvasRenderingContext2D, p: WorldPoint, c: string, t: number) => {
    // low plinth + floating sigil; dims once used
    ctx.strokeStyle = c; ctx.fillStyle = c; ctx.lineWidth = 2;
    ctx.globalAlpha = p.consumed ? 0.25 : 0.9;
    poly(ctx, [[-30, 18], [30, 18], [22, 6], [-22, 6]]); ctx.stroke();
    ctx.globalAlpha = p.consumed ? 0.1 : 0.3; ctx.fill();
    if (!p.consumed) {
        const bob = Math.sin(t * 2 + p.phase) * 4;
        ctx.save(); ctx.translate(0, -24 + bob); ctx.rotate(t * 0.8);
        ctx.globalAlpha = 0.9;
        switch (p.id) {
            case 'haste': poly(ctx, [[-12, 8], [0, -14], [12, 8], [0, 2]]); break;
            case 'mend': ctx.beginPath(); ctx.rect(-4, -14, 8, 28); ctx.rect(-14, -4, 28, 8); break;
            case 'ward': poly(ctx, [[0, -14], [12, -6], [10, 10], [0, 16], [-10, 10], [-12, -6]]); break;
            default: ctx.beginPath(); ctx.arc(0, 0, 11, 0, Math.PI * 2); ctx.moveTo(-6, 0); ctx.lineTo(6, 0);
        }
        ctx.stroke(); ctx.restore();
    }
};

const drawRelicAlcove = (ctx: CanvasRenderingContext2D, p: WorldPoint, c: string, t: number) => {
    // a broken arch; glyph floats inside until opened
    ctx.strokeStyle = c; ctx.fillStyle = c; ctx.lineWidth = 3; ctx.globalAlpha = 0.85;
    ctx.beginPath(); ctx.arc(0, 0, 40, Math.PI, Math.PI * 1.8); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-40, 0); ctx.lineTo(-40, 30); ctx.moveTo(40, 0); ctx.lineTo(40, 30); ctx.stroke();
    if (!p.discovered) {
        ctx.globalAlpha = 0.5 + 0.4 * Math.sin(t * 3 + p.phase);
        ctx.font = 'bold 22px monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(relicById(p.id as any)?.glyph ?? '?', 0, 0);
    } else if (p.active) {
        ctx.globalAlpha = 0.6; ctx.font = 'bold 14px monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(`${p.counter ?? 0}`, 0, -2);
    }
};

const drawEventPoint = (ctx: CanvasRenderingContext2D, p: WorldPoint, c: string, t: number) => {
    ctx.strokeStyle = c; ctx.fillStyle = c; ctx.lineWidth = 2;
    if (p.active) {
        if (p.id === 'ambush') { ctx.globalAlpha = 0.35 + 0.15 * Math.sin(t * 6); ctx.setLineDash([12, 10]); ctx.beginPath(); ctx.arc(0, 0, WORLD_EVENT_RING, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]); }
        else if (p.id === 'lost_spark') {
            const prog = Math.min(1, (p.sparkProgress ?? 0) / (8 * 60));
            ctx.globalAlpha = 0.3; ctx.beginPath(); ctx.arc(0, 0, WORLD_SPARK_RADIUS, 0, Math.PI * 2); ctx.stroke();
            ctx.globalAlpha = 0.9; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(0, 0, WORLD_SPARK_RADIUS, -Math.PI / 2, -Math.PI / 2 + prog * Math.PI * 2); ctx.stroke();
            ctx.globalAlpha = 0.7 + 0.3 * Math.sin(t * 8); ctx.beginPath(); ctx.arc(0, 0, 6 + prog * 14, 0, Math.PI * 2); ctx.fill();
        } else { // collapsing star: a dark core + falling shards are telegraphs
            ctx.globalAlpha = 0.9; ctx.beginPath(); ctx.arc(0, 0, 18 + 4 * Math.sin(t * 5), 0, Math.PI * 2); ctx.fill();
            ctx.globalAlpha = 0.3; ctx.beginPath(); ctx.arc(0, 0, 420, 0, Math.PI * 2); ctx.stroke();
        }
        return;
    }
    if (p.consumed) return;
    // undiscovered: a faint anomaly — rotating triangle (ambush) / small flame (spark) / falling dot (star)
    ctx.globalAlpha = 0.6;
    ctx.save(); ctx.rotate(t * 0.5);
    if (p.id === 'ambush') poly(ctx, [[0, -16], [14, 10], [-14, 10]]);
    else if (p.id === 'lost_spark') poly(ctx, [[0, -18], [8, -2], [0, 8], [-8, -2]]);
    else { ctx.beginPath(); ctx.arc(0, 0, 10, 0, Math.PI * 2); }
    ctx.stroke(); ctx.restore();
};

/** World space (inside camera transform), drawn under enemies. */
export const drawWorldPoints = (ctx: CanvasRenderingContext2D, state: MutableGameState, viewW: number, viewH: number) => {
    const w = state.world; if (!w) return;
    const t = state.frame / 60;
    const cx = state.camera.x + viewW / 2, cy = state.camera.y + viewH / 2;
    for (const p of w.points) {
        if (Math.abs(p.x - cx) > viewW / 2 + 500 || Math.abs(p.y - cy) > viewH / 2 + 500) continue; // cull (beacon beam is long)
        const c = colorOf(p);
        const dist = Math.hypot(p.x - state.player.x, p.y - state.player.y);
        ctx.save(); ctx.translate(p.x, p.y);
        // glow pulse while undiscovered + within range
        if (!p.discovered && dist < WORLD_GLOW_RANGE) {
            const pulse = 0.5 + 0.5 * Math.sin(t * 2.5 + p.phase);
            const g = ctx.createRadialGradient(0, 0, 10, 0, 0, 120 + pulse * 40);
            g.addColorStop(0, c); g.addColorStop(1, 'rgba(0,0,0,0)');
            ctx.globalAlpha = 0.12 + pulse * 0.12; ctx.fillStyle = g;
            ctx.beginPath(); ctx.arc(0, 0, 160, 0, Math.PI * 2); ctx.fill();
            ctx.globalAlpha = 0.25 + pulse * 0.25; ctx.strokeStyle = c; ctx.lineWidth = 1.5;
            ctx.beginPath(); ctx.arc(0, 0, WORLD_TOUCH_RADIUS, 0, Math.PI * 2); ctx.stroke();
        }
        ctx.globalAlpha = 1;
        switch (p.kind) {
            case 'landmark': drawLandmark(ctx, p, c, t); break;
            case 'shrine': drawShrine(ctx, p, c, t); break;
            case 'relic': drawRelicAlcove(ctx, p, c, t); break;
            case 'event': drawEventPoint(ctx, p, c, t); break;
        }
        ctx.restore();
    }
    ctx.globalAlpha = 1;
};

/** Screen space. Off-screen arrow toward the nearest undiscovered point, chapters 1–2 only. */
export const drawWorldArrow = (ctx: CanvasRenderingContext2D, state: MutableGameState, w: number, h: number) => {
    if (!state.world || state.activeBoss) return;
    if (chapterIndexOf(state.currentWave ?? 1) > WORLD_ARROW_CHAPTERS) return;
    const p = nearestOpenPoint(state); if (!p) return;
    const sx = p.x - state.camera.x, sy = p.y - state.camera.y;
    const margin = 36;
    if (sx > margin && sx < w - margin && sy > margin && sy < h - margin) return; // on screen → no arrow
    const cx = w / 2, cy = h / 2;
    const dx = sx - cx, dy = sy - cy;
    const ang = Math.atan2(dy, dx);
    // clamp to the screen rectangle
    const k = Math.min((w / 2 - margin) / Math.abs(dx || 1e-6), (h / 2 - margin) / Math.abs(dy || 1e-6));
    const ax = cx + dx * k, ay = cy + dy * k;
    const c = colorOf(p);
    const dist = Math.hypot(p.x - state.player.x, p.y - state.player.y);
    ctx.save();
    ctx.translate(ax, ay); ctx.rotate(ang);
    ctx.globalAlpha = 0.55 + 0.25 * Math.sin(state.frame / 10);
    ctx.fillStyle = c; ctx.shadowColor = c; ctx.shadowBlur = 10;
    poly(ctx, [[12, 0], [-8, -9], [-4, 0], [-8, 9]]); ctx.fill();
    ctx.restore();
    ctx.save();
    ctx.globalAlpha = 0.7; ctx.fillStyle = '#cbd5e1'; ctx.font = '10px monospace'; ctx.textAlign = 'center';
    const lx = Math.max(24, Math.min(w - 24, ax - Math.cos(ang) * 22)), ly = Math.max(14, Math.min(h - 6, ay - Math.sin(ang) * 22 + 4));
    ctx.fillText(`${Math.round(dist / 10) * 10}`, lx, ly);
    ctx.restore();
};

/** Screen space. 4 s lore card / toast — bottom-centre, non-pausing. */
export const drawWorldCard = (ctx: CanvasRenderingContext2D, state: MutableGameState, w: number, h: number) => {
    const c = state.worldCard; if (!c) return;
    const age = c.max - c.frames;
    const a = Math.min(1, age / 10, c.frames / 24);
    const narrow = w < 500;
    const boxW = Math.min(w - 24, narrow ? 340 : 520);
    const y = h - (narrow ? 150 : 130);
    ctx.save();
    ctx.globalAlpha = a;
    ctx.fillStyle = 'rgba(2,6,23,0.72)';
    ctx.fillRect(w / 2 - boxW / 2, y - 22, boxW, c.light ? 84 : 62);
    ctx.fillStyle = c.color; ctx.fillRect(w / 2 - boxW / 2, y - 22, 3, c.light ? 84 : 62);
    ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    ctx.font = `bold ${narrow ? 13 : 15}px Orbitron, monospace`; ctx.fillStyle = c.color;
    ctx.fillText(c.title.toUpperCase(), w / 2 - boxW / 2 + 14, y - 6);
    ctx.font = `${narrow ? 11 : 12}px monospace`; ctx.fillStyle = '#e2e8f0';
    // wrap body to the box
    const words = c.body.split(' '); let line = '', ly = y + 14; const maxW = boxW - 28;
    for (const wd of words) {
        const test = line ? line + ' ' + wd : wd;
        if (ctx.measureText(test).width > maxW && line) { ctx.fillText(line, w / 2 - boxW / 2 + 14, ly); line = wd; ly += 14; }
        else line = test;
    }
    ctx.fillText(line, w / 2 - boxW / 2 + 14, ly);
    if (c.light) { ctx.font = `italic ${narrow ? 11 : 12}px monospace`; ctx.fillStyle = '#fde68a'; ctx.fillText(`“${c.light}”`, w / 2 - boxW / 2 + 14, ly + 22); }
    ctx.restore();
};
