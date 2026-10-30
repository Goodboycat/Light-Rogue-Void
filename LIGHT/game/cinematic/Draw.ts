// (M0) Cinematic drawing vocabulary — hero silhouettes and effects, all `f(t)`, all batched.
// Nothing here knows about gameplay. Design space is 1920×1080 centred at the origin.
// Rules (MOVIE.md §2): particles are bucketed by colour and drawn with ONE Path2D + ONE fill per bucket;
// glows are pre-rendered sprites (Sprites.ts) blitted with drawImage; shadowBlur / filter only on text.

import { hash, wobble, clamp01, lerp, span, easeOut } from './Engine';
import type { Gfx } from './Engine';
import { glowDisc, bokehDisc, rayStrip, irisSprite, rgba, toRgb } from './Sprites';

export const AMBER = '#fde68a', GOLD = '#fbbf24', EMBER = '#f97316', WARM_WHITE = '#fff7e6';
export const VIOLET = '#a78bfa', VOID = '#2a1458', INK = '#07030f', COLD = '#6d5bd0';

// ---------------------------------------------------------------- batched particles
/** Reusable Path2D buckets — allocation-free after warm-up. */
const bucketPaths: Path2D[] = [];
let bucketUsed = 0;
function path(): Path2D { if (bucketUsed >= bucketPaths.length) bucketPaths.push(new Path2D()); return bucketPaths[bucketUsed++]; }
/** Call at the start of a draw that uses buckets. Path2D has no clear(), so we reallocate only the ones we use. */
function resetBuckets(n: number) { bucketUsed = 0; for (let i = 0; i < n; i++) bucketPaths[i] = new Path2D(); }

export interface EmberField {
  /** count of embers */
  n: number;
  /** spawn box (design px) */
  x: number; y: number; w: number; h: number;
  /** rise speed px/s (negative = fall), drift amplitude px */
  rise: number; drift: number;
  /** size range px */
  rMin: number; rMax: number;
  /** colours: 3 buckets, picked per ember deterministically */
  colors: [string, string, string];
  /** lifetime s (wraps) */
  life: number;
  /** salt for determinism */
  seed: number;
  /** glow sprite under the dots (0 = none, else sprite scale multiplier) */
  glow?: number;
}
/** Embers / motes / spores: position computed from (i, t) — nothing stored. 3 colour buckets, 3 fills. */
export function embers(g: Gfx, f: EmberField, alpha = 1, t = g.t) {
  const ctx = g.ctx; resetBuckets(3);
  const p0 = path(), p1 = path(), p2 = path();
  const paths = [p0, p1, p2];
  const gl = f.glow ?? 0;
  const glowSpr = gl > 0 ? glowDisc(f.colors[0], 64) : null;
  for (let i = 0; i < f.n; i++) {
    const h0 = hash(i, f.seed), h1 = hash(i, f.seed + 1), h2 = hash(i, f.seed + 2), h3 = hash(i, f.seed + 3);
    const life = f.life * (0.6 + h3 * 0.8);
    const age = ((t + h2 * life) % life) / life;             // 0..1
    const fade = Math.sin(age * Math.PI);                     // in/out
    const x = f.x + h0 * f.w + Math.sin(t * (0.6 + h1) + i) * f.drift;
    const y = f.y + h1 * f.h - age * life * f.rise;
    const r = lerp(f.rMin, f.rMax, h3) * (0.5 + fade * 0.5);
    const p = paths[i % 3];
    p.moveTo(x + r, y); p.arc(x, y, r, 0, Math.PI * 2);
    if (glowSpr && (i & 3) === 0) { ctx.globalAlpha = alpha * fade * 0.5; ctx.drawImage(glowSpr, x - r * gl, y - r * gl, r * gl * 2, r * gl * 2); }
  }
  ctx.globalAlpha = alpha;
  for (let b = 0; b < 3; b++) { ctx.fillStyle = f.colors[b]; ctx.fill(paths[b]); }
}

/** Dust / bokeh field: big soft discs via sprite, very few draw calls, parallax by size. */
export function bokeh(g: Gfx, n: number, color: string, seed: number, box: number, alpha: number, t = g.t) {
  const ctx = g.ctx; const spr = bokehDisc(color, 128);
  for (let i = 0; i < n; i++) {
    const h0 = hash(i, seed), h1 = hash(i, seed + 1), h2 = hash(i, seed + 2);
    const x = (h0 - 0.5) * box * 2 + Math.sin(t * 0.21 + i) * 40;
    const y = (h1 - 0.5) * box * 1.2 + Math.cos(t * 0.17 + i * 1.3) * 30;
    const r = 18 + h2 * 90;
    ctx.globalAlpha = alpha * (0.25 + 0.75 * (0.5 + 0.5 * Math.sin(t * 0.7 + i * 2.1)));
    ctx.drawImage(spr, x - r, y - r, r * 2, r * 2);
  }
  ctx.globalAlpha = 1;
}

/** Star field: tiny points, two buckets (white / tinted), twinkle via alpha batches. */
export function stars(g: Gfx, n: number, seed: number, box: number, color = '#ffffff', alpha = 1, t = g.t) {
  const ctx = g.ctx; resetBuckets(2); const pa = path(), pb = path();
  for (let i = 0; i < n; i++) {
    const h0 = hash(i, seed), h1 = hash(i, seed + 1), h2 = hash(i, seed + 2);
    const x = (h0 - 0.5) * box * 2, y = (h1 - 0.5) * box * 1.2;
    const tw = 0.5 + 0.5 * Math.sin(t * (0.8 + h2 * 2) + i);
    const r = 0.6 + h2 * 1.6;
    const p = tw > 0.5 ? pa : pb; p.moveTo(x + r, y); p.arc(x, y, r, 0, Math.PI * 2);
  }
  ctx.globalAlpha = alpha; ctx.fillStyle = color; ctx.fill(pa);
  ctx.globalAlpha = alpha * 0.45; ctx.fill(pb); ctx.globalAlpha = 1;
}

// ---------------------------------------------------------------- the Spark (LIGHT hero)
export interface SparkOpts { r: number; heat?: number; flicker?: number; color?: string; core?: string; rays?: number; t?: number }
/** The Spark: layered glow sprites + a hot core + optional soft rays. Breathes with t. */
export function spark(g: Gfx, x: number, y: number, o: SparkOpts) {
  const ctx = g.ctx; const t = o.t ?? g.t;
  const heat = o.heat ?? 1, fl = o.flicker ?? 0.08;
  const breath = 1 + Math.sin(t * 2.1) * 0.04 + wobble(t * 9, 3) * fl;
  const r = o.r * breath;
  const col = o.color ?? GOLD, core = o.core ?? WARM_WHITE;
  const big = glowDisc(col, 256), mid = glowDisc(AMBER, 256), hot = glowDisc(core, 256, 0.4);
  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha = 0.55 * heat; ctx.drawImage(big, x - r * 4, y - r * 4, r * 8, r * 8);
  ctx.globalAlpha = 0.85 * heat; ctx.drawImage(mid, x - r * 2.2, y - r * 2.2, r * 4.4, r * 4.4);
  ctx.globalAlpha = 1; ctx.drawImage(hot, x - r * 0.9, y - r * 0.9, r * 1.8, r * 1.8);
  if (o.rays) {
    const strip = rayStrip(AMBER, 512, 48);
    const n = Math.round(o.rays);
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + t * 0.08 + Math.sin(i) * 0.3;
      const len = r * (3 + 2 * hash(i, 77)) * (0.8 + 0.2 * Math.sin(t * 1.3 + i * 1.7));
      ctx.save(); ctx.translate(x, y); ctx.rotate(a); ctx.globalAlpha = 0.18 * heat;
      ctx.drawImage(strip, 0, -len * 0.05, len, len * 0.1); ctx.restore();
    }
  }
  ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
}

/** Volumetric god-rays fanning from (x,y). `spread` radians total, `n` strips, deterministic flicker. */
export function godRays(g: Gfx, x: number, y: number, dir: number, spread: number, n: number, len: number, color: string, alpha: number, t = g.t) {
  const ctx = g.ctx; const strip = rayStrip(color, 1024, 128);
  ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < n; i++) {
    const u = n === 1 ? 0.5 : i / (n - 1);
    const a = dir + (u - 0.5) * spread + Math.sin(t * 0.3 + i * 2.3) * 0.01;
    const l = len * (0.7 + 0.3 * hash(i, 501)) * (0.85 + 0.15 * Math.sin(t * 0.9 + i * 1.1));
    const w = l * (0.05 + 0.08 * hash(i, 502));
    ctx.save(); ctx.translate(x, y); ctx.rotate(a); ctx.globalAlpha = alpha * (0.5 + 0.5 * hash(i, 503));
    ctx.drawImage(strip, 0, -w / 2, l, w); ctx.restore();
  }
  ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
}

// ---------------------------------------------------------------- the Eye (DARKNESS hero)
export interface EyeOpts { r: number; open: number; look?: { x: number; y: number }; pupil?: number; glow?: number; t?: number; veins?: number }
/** The Eye of the Darkness: lid aperture (0 closed … 1 open), iris sprite, slit pupil that tracks `look`, violet rim glow. */
export function eye(g: Gfx, x: number, y: number, o: EyeOpts) {
  const ctx = g.ctx; const t = o.t ?? g.t; const r = o.r; const open = clamp01(o.open);
  if (open <= 0.002) return;
  const lidH = r * (0.08 + open * 0.92);          // half-height of the aperture
  const lx = o.look?.x ?? 0, ly = o.look?.y ?? 0;
  // rim glow behind (sprite)
  if ((o.glow ?? 1) > 0) {
    ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.5 * (o.glow ?? 1) * open;
    const gd = glowDisc(VIOLET, 256); ctx.drawImage(gd, x - r * 2.6, y - lidH * 2.6, r * 5.2, lidH * 5.2);
    ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
  }
  // aperture clip: lens shape (two arcs)
  ctx.save();
  ctx.beginPath();
  const k = lidH / r;
  ctx.moveTo(x - r, y);
  ctx.bezierCurveTo(x - r * 0.5, y - lidH * 1.35, x + r * 0.5, y - lidH * 1.35, x + r, y);
  ctx.bezierCurveTo(x + r * 0.5, y + lidH * 1.35, x - r * 0.5, y + lidH * 1.35, x - r, y);
  ctx.closePath(); ctx.clip();
  // sclera: near-black with violet bruise
  ctx.fillStyle = '#0b0618'; ctx.fillRect(x - r, y - r, r * 2, r * 2);
  // iris
  const ir = r * 0.62; const ix = x + lx * r * 0.25, iy = y + ly * lidH * 0.3;
  const iris = irisSprite(512);
  ctx.drawImage(iris, ix - ir, iy - ir, ir * 2, ir * 2);
  // slit pupil
  const pw = ir * (o.pupil ?? 0.16) * (1 + Math.sin(t * 1.7) * 0.08), ph = ir * 0.92;
  ctx.fillStyle = '#000';
  ctx.beginPath(); ctx.moveTo(ix, iy - ph); ctx.quadraticCurveTo(ix + pw, iy, ix, iy + ph); ctx.quadraticCurveTo(ix - pw, iy, ix, iy - ph); ctx.fill();
  // veins: violet cracks from the rim inward
  const nv = o.veins ?? 12;
  ctx.strokeStyle = rgba(VIOLET, 0.35); ctx.lineWidth = r * 0.006;
  ctx.beginPath();
  for (let i = 0; i < nv; i++) {
    const a = (i / nv) * Math.PI * 2 + hash(i, 9) * 0.4;
    let vx = x + Math.cos(a) * r, vy = y + Math.sin(a) * lidH * 1.2;
    ctx.moveTo(vx, vy);
    for (let s = 0; s < 4; s++) {
      vx += (ix - vx) * 0.22 + wobble(t * 0.5 + s + i * 3, i) * r * 0.03; vy += (iy - vy) * 0.22 + wobble(t * 0.5 + s * 2 + i, i + 50) * r * 0.03;
      ctx.lineTo(vx, vy);
    }
  }
  ctx.stroke();
  // lid shadow (inner)
  const sh = ctx.createLinearGradient(0, y - lidH * 1.35, 0, y + lidH * 1.35);
  sh.addColorStop(0, 'rgba(0,0,0,0.9)'); sh.addColorStop(0.25, 'rgba(0,0,0,0)'); sh.addColorStop(0.75, 'rgba(0,0,0,0)'); sh.addColorStop(1, 'rgba(0,0,0,0.9)');
  ctx.fillStyle = sh; ctx.fillRect(x - r, y - lidH * 1.4, r * 2, lidH * 2.8);
  ctx.restore();
  // lid edge: hairline violet
  ctx.strokeStyle = rgba(VIOLET, 0.55 * open); ctx.lineWidth = r * 0.01 * (1 + k);
  ctx.beginPath(); ctx.moveTo(x - r, y);
  ctx.bezierCurveTo(x - r * 0.5, y - lidH * 1.35, x + r * 0.5, y - lidH * 1.35, x + r, y);
  ctx.bezierCurveTo(x + r * 0.5, y + lidH * 1.35, x - r * 0.5, y + lidH * 1.35, x - r, y); ctx.stroke();
}

/** Tendrils of absence: thick black ropes with a violet hairline, reaching from (x,y) toward `dir`. One stroke per tendril. */
export function tendrils(g: Gfx, x: number, y: number, n: number, len: number, dir: number, spread: number, seed: number, reach: number, t = g.t) {
  const ctx = g.ctx; const rc = clamp01(reach); if (rc <= 0) return;
  for (let i = 0; i < n; i++) {
    const a0 = dir + (hash(i, seed) - 0.5) * spread;
    const L = len * (0.6 + hash(i, seed + 1) * 0.6) * rc;
    const segs = 14;
    ctx.beginPath(); ctx.moveTo(x, y);
    let px = x, py = y, a = a0;
    for (let s = 1; s <= segs; s++) {
      const u = s / segs;
      a += wobble(t * 0.7 + u * 6 + i * 5, seed + i) * 0.22 + (hash(i, seed + 3) - 0.5) * 0.05;
      px += Math.cos(a) * (L / segs); py += Math.sin(a) * (L / segs);
      ctx.lineTo(px, py);
    }
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.strokeStyle = INK; ctx.lineWidth = 26 * (0.5 + hash(i, seed + 2)) * rc; ctx.stroke();
    ctx.strokeStyle = rgba(VIOLET, 0.35); ctx.lineWidth = 1.5; ctx.stroke();
  }
}

/** A wall of many small eyes blinking at different phases (horror texture). */
export function eyeField(g: Gfx, n: number, seed: number, box: number, open: number, t = g.t) {
  for (let i = 0; i < n; i++) {
    const h0 = hash(i, seed), h1 = hash(i, seed + 1), h2 = hash(i, seed + 2);
    const blink = clamp01(Math.sin(t * (0.3 + h2 * 0.5) + i * 2.7) * 3);
    const op = open * blink * (0.4 + h2 * 0.6);
    if (op < 0.02) continue;
    eye(g, (h0 - 0.5) * box * 2, (h1 - 0.5) * box * 1.1, { r: 24 + h2 * 60, open: op, glow: 0.4, veins: 0, pupil: 0.12, look: { x: Math.sin(t + i) * 0.6, y: 0 } });
  }
}

// ---------------------------------------------------------------- landscape silhouettes
/** Jagged silhouette horizon: one filled polygon; `y` baseline, `amp` jaggedness. */
export function ridge(g: Gfx, y: number, amp: number, seed: number, color: string, width = 2600, segs = 48, drift = 0) {
  const ctx = g.ctx; ctx.fillStyle = color; ctx.beginPath(); ctx.moveTo(-width / 2, 1200);
  for (let i = 0; i <= segs; i++) {
    const u = i / segs; const x = -width / 2 + u * width;
    const h = (hash(i, seed) * 0.6 + hash(i >> 1, seed + 3) * 0.4) * amp + Math.sin(u * 9 + drift) * amp * 0.1;
    ctx.lineTo(x, y - h);
  }
  ctx.lineTo(width / 2, 1200); ctx.closePath(); ctx.fill();
}

// ---------------------------------------------------------------- typography
export interface TextOpts {
  size: number; font?: 'tech' | 'body' | 'mono'; weight?: number | string; color?: string;
  tracking?: number;                // extra letter spacing in px
  glow?: string; glowBlur?: number; // the ONLY allowed shadowBlur user
  align?: CanvasTextAlign; alpha?: number;
}
const FONT: Record<string, string> = { tech: "'Orbitron', sans-serif", body: "'Rajdhani', sans-serif", mono: "ui-monospace, 'SFMono-Regular', Menlo, monospace" };
function setFont(ctx: CanvasRenderingContext2D, o: TextOpts) { ctx.font = `${o.weight ?? 700} ${o.size}px ${FONT[o.font ?? 'tech']}`; }

/** Measure with tracking. */
export function textWidth(ctx: CanvasRenderingContext2D, s: string, o: TextOpts) {
  setFont(ctx, o); const tr = o.tracking ?? 0; let w = 0;
  for (let i = 0; i < s.length; i++) w += ctx.measureText(s[i]).width + (i < s.length - 1 ? tr : 0);
  return w;
}
/** Tracked text, centred by default. */
export function text(g: Gfx, s: string, x: number, y: number, o: TextOpts) {
  const ctx = g.ctx; setFont(ctx, o); ctx.textBaseline = 'middle';
  const tr = o.tracking ?? 0; const w = textWidth(ctx, s, o);
  let cx = (o.align ?? 'center') === 'center' ? x - w / 2 : o.align === 'right' ? x - w : x;
  ctx.textAlign = 'left';
  const a = ctx.globalAlpha; ctx.globalAlpha = a * (o.alpha ?? 1);
  if (o.glow) { ctx.shadowColor = o.glow; ctx.shadowBlur = (o.glowBlur ?? 24) * g.S; }
  ctx.fillStyle = o.color ?? '#fff';
  for (let i = 0; i < s.length; i++) { ctx.fillText(s[i], cx, y); cx += ctx.measureText(s[i]).width + tr; }
  ctx.shadowBlur = 0; ctx.shadowColor = 'transparent'; ctx.globalAlpha = a;
}
/** Typed glyph by glyph with jitter (horror). `p` 0..1 progress. Last glyph flickers as a cursor. */
export function typed(g: Gfx, s: string, x: number, y: number, p: number, o: TextOpts, jitter = 1.5, t = g.t) {
  const n = Math.floor(clamp01(p) * s.length);
  if (n <= 0) return;
  const shown = s.slice(0, n);
  const jx = wobble(t * 40, 2) * jitter, jy = wobble(t * 37, 5) * jitter;
  // glitch: every ~0.4 s one glyph displaced
  text(g, shown, x + jx, y + jy, { ...o, align: 'left' });
  if (n < s.length && Math.floor(t * 8) % 2 === 0) text(g, '▍', x + textWidth(g.ctx, shown, o) + jx, y + jy, { ...o, align: 'left', alpha: 0.7 });
}
/** Title assembling: each glyph flies in with overshoot from `from` offset, tracking widens to target. `p` 0..1. */
export function assemble(g: Gfx, s: string, x: number, y: number, p: number, o: TextOpts, fromY = 60, stagger = 0.08) {
  const ctx = g.ctx; setFont(ctx, o); ctx.textBaseline = 'middle'; ctx.textAlign = 'left';
  const trTarget = o.tracking ?? 0; const trNow = lerp(trTarget * 0.3, trTarget, easeOut(clamp01(p)));
  let w = 0; for (let i = 0; i < s.length; i++) w += ctx.measureText(s[i]).width + (i < s.length - 1 ? trNow : 0);
  let cx = x - w / 2;
  const a = ctx.globalAlpha;
  if (o.glow) { ctx.shadowColor = o.glow; ctx.shadowBlur = (o.glowBlur ?? 24) * g.S; }
  ctx.fillStyle = o.color ?? '#fff';
  const total = 1 + stagger * (s.length - 1);
  for (let i = 0; i < s.length; i++) {
    const u = clamp01((p * total - i * stagger));
    const e = u <= 0 ? 0 : u >= 1 ? 1 : 1 + 2.7 * Math.pow(u - 1, 3) + 1.7 * Math.pow(u - 1, 2); // overshoot
    ctx.globalAlpha = a * clamp01(u * 2) * (o.alpha ?? 1);
    ctx.fillText(s[i], cx, y + (1 - e) * fromY);
    cx += ctx.measureText(s[i]).width + trNow;
  }
  ctx.shadowBlur = 0; ctx.shadowColor = 'transparent'; ctx.globalAlpha = a;
}

/** Hairline rule with centre glow (title underline). */
export function rule(g: Gfx, x: number, y: number, w: number, color: string, alpha = 1) {
  const ctx = g.ctx; const gr = ctx.createLinearGradient(x - w / 2, 0, x + w / 2, 0); const c = toRgb(color);
  gr.addColorStop(0, `rgba(${c},0)`); gr.addColorStop(0.5, `rgba(${c},${alpha})`); gr.addColorStop(1, `rgba(${c},0)`);
  ctx.fillStyle = gr; ctx.fillRect(x - w / 2, y - 0.75, w, 1.5);
}

/** Full-frame gradient wash in design space (covers the visible area regardless of aspect). */
export function gradientBg(g: Gfx, top: string, mid: string, bottom: string, midStop = 0.55) {
  const ctx = g.ctx; const H = g.hh * 2 + 4, W = g.hw * 2 + 4;
  const gr = ctx.createLinearGradient(0, -H / 2, 0, H / 2);
  gr.addColorStop(0, top); gr.addColorStop(midStop, mid); gr.addColorStop(1, bottom);
  ctx.fillStyle = gr; ctx.fillRect(-W / 2, -H / 2, W, H);
}
/** Radial pool of light centred at (x,y). */
export function pool(g: Gfx, x: number, y: number, r: number, color: string, alpha: number) {
  const ctx = g.ctx; ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = alpha;
  ctx.drawImage(glowDisc(color, 256), x - r, y - r, r * 2, r * 2); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
}

export { span, clamp01, lerp, hash, wobble };
