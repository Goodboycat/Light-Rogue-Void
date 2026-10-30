// (M1) Shared kit for the chapter openers (`opener_1..6`). Every opener has the same 5-shot spine so the
// player learns the grammar: CARD → PLACE → DARKNESS speaks → the turn (black, one spark) → LIGHT answers.
// Each scene file still writes its own storyboard table and its own landscape; this file only owns the
// typography shots and the timing constants, so the six openers cut the same way.
//
//   shot 1  0.0– 2.6  chapter card       (typography IS shot 1 — MOVIE.md §3 M1)
//   shot 2  2.6– 5.6  the place, wide     (setup — the landscape opens)
//   shot 3  5.6– 9.0  DARKNESS line       (escalation — cold, push-in, something is looking)
//   shot 4  9.0–10.2  the turn            (hard cut to black; one amber point)
//   shot 5 10.2–13.0  LIGHT line          (payoff — warm, the spark on the ground, letterbox opens, fade)
import { K, easeOut, easeInOut, easeOutExpo, span, lerp, clamp01 } from '../Engine';
import type { Gfx, LayerState, Track } from '../Engine';
import { AMBER, GOLD, WARM_WHITE, VIOLET, text, typed, assemble, rule, textWidth, spark } from '../Draw';
import type { TextOpts } from '../Draw';

export const T_CARD = 0, T_PLACE = 2.6, T_DARK = 5.6, T_TURN = 9.0, T_LIGHT = 10.2, T_END = 13.0;
/** (M2) Timing spine. The standard openers use `STD`; `opener_6` stretches the dark + the black (MOVIE.md §3 M2:
 *  "Opener 6 is the longest and the most terrifying; the LIGHT line arrives late"). Kit functions take `tm`. */
export interface OpenerTiming { place: number; dark: number; turn: number; light: number; end: number }
export const STD: OpenerTiming = { place: T_PLACE, dark: T_DARK, turn: T_TURN, light: T_LIGHT, end: T_END };
export const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI'];

/** Shot 1 — the chapter card as typography: "CHAPTER n" tracks out, the name assembles with overshoot,
 *  a hairline rule in the chapter colour grows under it. Fades before the place cut. */
export function chapterCard(g: Gfx, L: LayerState, n: number, name: string, color: string, tm: OpenerTiming = STD) {
  const t = g.t; const a = L.alpha * (1 - span(t, tm.place - 0.35, tm.place));
  if (a <= 0) return;
  const hw = g.hw;
  const small = Math.min(26, hw * 0.05);
  const sa = span(t, 0.15, 0.9);
  text(g, `CHAPTER ${ROMAN[n - 1] ?? n}`, 0, -110, { size: small, font: 'tech', weight: 500, color: '#c9c3d8', tracking: lerp(small * 0.2, small * 0.9, easeOut(sa)), alpha: a * sa });
  const big = Math.min(92, hw * 0.13);
  assemble(g, name.toUpperCase(), 0, 0, span(t, 0.5, 1.7), { size: big, font: 'tech', weight: 900, color: WARM_WHITE, tracking: big * 0.1, glow: color, glowBlur: 30, alpha: a }, 70, 0.06);
  const rw = easeOutExpo(span(t, 1.2, 2.3)) * Math.min(820, hw * 1.5);
  if (rw > 1) rule(g, 0, big * 0.72, rw, color, 0.95 * a);
}

/** Shot 3 — the DARKNESS line: lowercase horror, typed glyph by glyph with jitter, cold violet. */
export function darkLine(g: Gfx, L: LayerState, s: string, y = 330, from = T_DARK + 0.4, typeDur = 2.4, tm: OpenerTiming = STD) {
  const t = g.t; const ctx = g.ctx;
  const o: TextOpts = { size: Math.min(36, g.hw * 0.064), font: 'body', weight: 500, color: '#c4b5fd', tracking: 2, glow: VIOLET, glowBlur: 14 };
  const w = textWidth(ctx, s, o);
  // wrap onto two lines when the frame is narrow (portrait phones)
  const a = L.alpha * (1 - span(t, tm.turn - 0.3, tm.turn));
  if (a <= 0) return;
  ctx.globalAlpha = a;
  if (w > g.hw * 1.8) {
    const cut = s.lastIndexOf(' ', s.length >> 1); const s1 = s.slice(0, cut), s2 = s.slice(cut + 1);
    const p = span(t, from, from + typeDur); const p1 = clamp01(p * s.length / s1.length), p2 = clamp01((p * s.length - s1.length) / s2.length);
    typed(g, s1, -textWidth(ctx, s1, o) / 2, y - o.size * 0.8, p1, o, 1.3);
    if (p2 > 0) typed(g, s2, -textWidth(ctx, s2, o) / 2, y + o.size * 0.8, p2, o, 1.3);
  } else {
    typed(g, s, -w / 2, y, span(t, from, from + typeDur), o, 1.3);
  }
  ctx.globalAlpha = 1;
}

/** Shot 5 — the LIGHT line: assembles with overshoot, warm, tracking widens. */
export function lightLine(g: Gfx, L: LayerState, s: string, y = 360, from = T_LIGHT + 0.5, dur = 1.6, tm: OpenerTiming = STD) {
  const o: TextOpts = { size: Math.min(36, g.hw * 0.064), font: 'body', weight: 500, color: '#fde9c4', tracking: 3, glow: AMBER, glowBlur: 16 };
  const ctx = g.ctx; const w = textWidth(ctx, s, o);
  const a = L.alpha * (1 - span(g.t, tm.end - 0.6, tm.end - 0.1));
  if (w > g.hw * 1.8) {
    const cut = s.lastIndexOf(' ', s.length >> 1);
    assemble(g, s.slice(0, cut), 0, y - o.size * 0.8, span(g.t, from, from + dur), { ...o, alpha: a }, 40, 0.05);
    assemble(g, s.slice(cut + 1), 0, y + o.size * 0.8, span(g.t, from + 0.5, from + dur + 0.5), { ...o, alpha: a }, 40, 0.05);
  } else assemble(g, s, 0, y, span(g.t, from, from + dur), { ...o, alpha: a }, 40, 0.05);
}

/** Shot 4→5 — the spark: a point in the black at the turn, then it breathes up to a small warm fire on the
 *  ground of the place. `x,y` is where it sits in the landscape. */
export function turnSpark(g: Gfx, L: LayerState, x: number, y: number, r = 46, tm: OpenerTiming = STD) {
  const t = g.t;
  const grow = easeOut(span(t, tm.light - 0.2, tm.light + 1.3));
  const rr = lerp(2, r, grow) * L.scale;
  spark(g, x, y, { r: rr, heat: lerp(0.3, 1, grow), flicker: lerp(0.35, 0.1, grow), rays: grow > 0.4 ? 12 : 0 });
}

/** Default post stack for an opener — scenes spread their own aberration/invert on top. */
export const openerPost = (coldGrain = 0.6, tm: OpenerTiming = STD) => ({
  letterbox: K(0, 0.1, tm.place, 0.1, tm.dark, 0.14, easeInOut, tm.turn, 0.16, tm.light, 0.16, tm.end - 1, 0.07, easeInOut),
  vignette: K(0, 0.7, tm.place, 0.6, tm.dark, 0.92, tm.turn, 0.95, tm.light, 0.9, tm.end, 0.55, easeInOut),
  grain: K(0, 0.18, tm.place, 0.14, tm.dark, coldGrain, easeIn2, tm.turn, 0.85, tm.turn + 0.01, 0.25, tm.end, 0.12),
  wash: K(0, 0, tm.place, 0.15, tm.dark, -0.75, easeInOut, tm.turn, -0.9, tm.turn + 0.01, 0, tm.light, 0.1, tm.end, 0.6),
  fade: K(0, 1, 0.5, 0, easeOut, tm.end - 0.7, 0, tm.end, 1, easeInOut),
});
const easeIn2 = (u: number) => u * u;

/** Camera zoom spine shared by the openers: card static → place wide breathes → DARK push-in that never
 *  stops → cut to 1 → LIGHT gentle overshoot out. Scenes add x/y pans + shakes. */
export const openerZoom = (tm: OpenerTiming = STD, darkPush = 1.32, lightOut = 0.94): Track =>
  K(0, 1, tm.place, 1, tm.place + 0.01, 1.08, tm.dark, 1.0, easeInOut, tm.turn - 0.01, darkPush, easeInExpoLite, tm.turn, 1, tm.light, 1, tm.light + 1.6, lightOut, overshootLite, tm.end, lightOut + 0.02);
const easeInExpoLite = (u: number) => u * u * u;
const overshootLite = (u: number) => { const c1 = 1.2, c3 = c1 + 1; return 1 + c3 * Math.pow(u - 1, 3) + c1 * Math.pow(u - 1, 2); };

export { GOLD };

/** cheap hex mix (both '#rrggbb') — only for a handful of fill colours per frame, never per particle */
export function mix(a: string, b: string, u: number): string {
  if (u <= 0) return a; if (u >= 1) return b;
  const pa = parseInt(a.slice(1), 16), pb = parseInt(b.slice(1), 16);
  const r = Math.round(((pa >> 16) & 255) + (((pb >> 16) & 255) - ((pa >> 16) & 255)) * u);
  const gg = Math.round(((pa >> 8) & 255) + (((pb >> 8) & 255) - ((pa >> 8) & 255)) * u);
  const bb = Math.round((pa & 255) + ((pb & 255) - (pa & 255)) * u);
  return `rgb(${r},${gg},${bb})`;
}
