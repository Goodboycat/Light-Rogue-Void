// (7B step 5b) Batched silhouettes for *simple* enemies — CONVENTIONS rule 9 "cheap LOD when counts are large:
// quantity stays, detail drops". One Path2D + one fill per tint colour instead of save/translate/stroke/shadow per
// enemy. Only plain enemies qualify (no flash, affixes, shield, shiner halo, shot warn, immunity, carried ring, boss);
// anything that needs to *read* (telegraphs, elites, hit flash) still goes through drawEnemy. Never affects simulation.
import type { Enemy, VisualType } from '../types';
import { enemyTint } from './EnemyRenderer';
import { quality } from '../Quality';
import { ENEMY_BATCH_MIN_VISIBLE } from '../Constants';

/** True when this enemy can be drawn as a plain silhouette without losing gameplay information. */
export const isPlainEnemy = (e: Enemy): boolean =>
    !e.isBoss && !(e.flashTimer && e.flashTimer > 0) && !(e.affixes && e.affixes.length) &&
    !((e.shieldHits ?? 0) > 0 || e.aegisShielded || (e.shieldPopFrames ?? 0) > 0) &&
    !e.isShiner && !((e.shotWarn ?? 0) > 0) && !(e.projectileImmunity > 0) && !e.carried;

/** Batching is on for LOW always, and for MEDIUM/HIGH once the visible crowd is large (count-driven LOD, not a cap). */
// (10 fix) Batched silhouettes read as "dots" — players saw dot-enemies until auto quality stepped back up.
// Full bodies always; batching stays available only for an extreme crowd (ENEMY_BATCH_MIN_VISIBLE, raised to 600).
export const shouldBatchEnemies = (visibleCount: number): boolean =>
    visibleCount >= ENEMY_BATCH_MIN_VISIBLE && !!quality;

// silhouette per visual type (rotation ignored — at crowd density the outline, not the heading, reads)
const addShape = (path: Path2D, t: VisualType, x: number, y: number, s: number, frame: number) => {
    switch (t) {
        case 'CONSTRUCT':
        case 'CRYSTAL': { // hexagon
            const r = s * 0.9;
            for (let i = 0; i < 6; i++) {
                const a = (Math.PI / 3) * i + (t === 'CRYSTAL' ? Math.PI / 6 : 0);
                const px = x + r * Math.cos(a), py = y + r * Math.sin(a);
                if (i === 0) path.moveTo(px, py); else path.lineTo(px, py);
            }
            path.closePath();
            return;
        }
        case 'STAR': { // 4-point diamond, slow spin so a field of them shimmers
            const r = s * 0.95, a0 = frame * 0.02;
            for (let i = 0; i < 8; i++) {
                const rr = i % 2 === 0 ? r : r * 0.45, a = a0 + (Math.PI / 4) * i;
                const px = x + rr * Math.cos(a), py = y + rr * Math.sin(a);
                if (i === 0) path.moveTo(px, py); else path.lineTo(px, py);
            }
            path.closePath();
            return;
        }
        case 'SERPENT': { // short capsule: two discs
            path.moveTo(x + s * 0.55, y); path.arc(x, y, s * 0.55, 0, Math.PI * 2);
            path.moveTo(x - s * 0.5 + s * 0.4, y); path.arc(x - s * 0.5, y, s * 0.4, 0, Math.PI * 2);
            return;
        }
        case 'CRAB': { // squat ellipse
            path.moveTo(x + s * 0.95, y);
            path.ellipse(x, y, s * 0.95, s * 0.65, 0, 0, Math.PI * 2);
            return;
        }
        case 'SWARMER': { const r = s * 0.6; path.moveTo(x + r, y); path.arc(x, y, r, 0, Math.PI * 2); return; }
        default: { const r = s * 0.8; path.moveTo(x + r, y); path.arc(x, y, r, 0, Math.PI * 2); return; } // GHOST, EYE, …
    }
};

// Buckets are module-level and reused every frame (no per-frame Map allocation beyond the first use of a colour).
const buckets = new Map<string, { path: Path2D; n: number }>();
const cores = new Map<string, { path: Path2D; n: number }>();

/**
 * Draw every plain enemy in `list` (already culled by the caller) as batched fills.
 * Two passes: body fill per tint colour, then a small darker "core" disc per glow colour so a crowd is not flat.
 */
export const drawEnemiesBatched = (ctx: CanvasRenderingContext2D, list: Enemy[], count: number, frame: number) => {
    for (const b of buckets.values()) { b.path = new Path2D(); b.n = 0; }
    for (const b of cores.values()) { b.path = new Path2D(); b.n = 0; }
    for (let i = 0; i < count; i++) {
        const e = list[i];
        const tint = enemyTint(e.def);
        let b = buckets.get(tint.fill);
        if (!b) { b = { path: new Path2D(), n: 0 }; buckets.set(tint.fill, b); }
        addShape(b.path, e.def.visualType, e.x, e.y, e.def.size, frame);
        b.n++;
        let c = cores.get(tint.glow);
        if (!c) { c = { path: new Path2D(), n: 0 }; cores.set(tint.glow, c); }
        const cr = e.def.size * 0.28;
        c.path.moveTo(e.x + cr, e.y); c.path.arc(e.x, e.y, cr, 0, Math.PI * 2);
        c.n++;
    }
    const prevAlpha = ctx.globalAlpha;
    ctx.shadowBlur = 0;
    ctx.globalAlpha = 1;
    for (const [color, b] of buckets) { if (b.n) { ctx.fillStyle = color; ctx.fill(b.path); } }
    ctx.globalAlpha = 0.85;
    for (const [color, c] of cores) { if (c.n) { ctx.fillStyle = color; ctx.fill(c.path); } }
    ctx.globalAlpha = prevAlpha;
};
