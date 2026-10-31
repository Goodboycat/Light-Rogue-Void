// (M4) Shared kit for the boss outros (`boss_outro_<bossId>` ×6). The outro is the LIGHT tone (MOVIE.md §3 M4): the
// silhouette comes apart into embers, the frame opens, the star chart is drawn in the cinematic style with the new place
// igniting (this replaces MapReveal.tsx — it is shot 3 of the film), then a warm hold on the spark → MapBreather.
// Every outro has the same 4-shot spine; the scene file writes its own storyboard and its own dying silhouette.
//
//   shot 1  0.0– 2.0  the kill          (setup — the boss frozen mid-pose in the dark, amber cracks spread through it, DARKNESS' last line)
//   shot 2  2.0– 4.6  it comes apart    (escalation — the shape lifts off as embers, the letterbox opens, the arena warms)
//   shot 3  4.6– 7.4  the chart         (turn — hard cut: the star chart; the known places burn, the path crawls on, the NEW place ignites and is named)
//   shot 4  7.4– 9.2  the hold          (payoff — the chart fades under one small spark, LIGHT's line, fade → map breather)
import { K, step, easeIn, easeOut, easeInOut, easeOutExpo, span, lerp, clamp01, hash, wobble } from '../Engine';
import type { Gfx, LayerState, Track, Cue, PostDef, CameraDef } from '../Engine';
import { AMBER, GOLD, EMBER, WARM_WHITE, VIOLET, INK, text, typed, assemble, textWidth, embers, pool, spark, stars, gradientBg, rule } from '../Draw';
import type { TextOpts } from '../Draw';
import { glowDisc, rgba } from '../Sprites';

export interface OutroTiming { burst: number; chart: number; hold: number; end: number }
export const OT: OutroTiming = { burst: 2.0, chart: 4.6, hold: 7.4, end: 9.2 };

/** The six places of the star chart (WorldMap.tsx PLACE_POS, 1024×683 picture space) in design space (×1.5, centred).
 *  Duplicated on purpose: the film never imports a gameplay/UI module (MOVIE.md §1.1). */
export const PLACES: { name: string; x: number; y: number; color: string }[] = [
  { name: 'Origin Fields',       x: (215 - 512) * 1.5, y: (135 - 341) * 1.5, color: '#fde68a' },
  { name: 'Whispering Grove',    x: (420 - 512) * 1.5, y: (130 - 341) * 1.5, color: '#2dd4bf' },
  { name: 'Crystal Depths',      x: (625 - 512) * 1.5, y: (130 - 341) * 1.5, color: '#a78bfa' },
  { name: 'Abandoned Machinery', x: (820 - 512) * 1.5, y: (145 - 341) * 1.5, color: '#fb923c' },
  { name: 'Void Wastes',         x: (225 - 512) * 1.5, y: (345 - 341) * 1.5, color: '#818cf8' },
  { name: 'Seam of the Void',    x: (880 - 512) * 1.5, y: (360 - 341) * 1.5, color: '#f8fafc' },
];
const FUTURE = [[445, 345], [670, 350], [330, 525], [620, 525]].map(([x, y]) => ({ x: (x - 512) * 1.5, y: (y - 341) * 1.5 }));
const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI'];

/** Shot 1 bed — the arena after the kill: near-black, the floor lit from below by a growing amber seam (the light that was
 *  trapped in the boss leaking out), no ink closing — this is the reverse of `arenaDark`. `crack` 0→1 over the shot. */
export function arenaAfter(g: Gfx, L: LayerState, tm: OutroTiming = OT, warm = GOLD) {
  const ctx = g.ctx; const t = g.t; const c = easeOut(span(t, 0.2, tm.burst));
  const open = easeOut(span(t, tm.burst, tm.chart - 0.3));
  ctx.globalAlpha = L.alpha;
  gradientBg(g, '#05030a', lerp(0, 1, open) > 0.5 ? '#1a1208' : '#0b0712', '#120c06', 0.6);
  ctx.strokeStyle = rgba(AMBER, 0.05 + 0.08 * open); ctx.lineWidth = 1.5; ctx.beginPath();
  for (let i = -8; i <= 8; i++) { ctx.moveTo(i * 60, 40); ctx.lineTo(i * 520, 1100); }
  for (let j = 0; j < 7; j++) { const y = 60 + j * j * 26; ctx.moveTo(-2600, y); ctx.lineTo(2600, y); }
  ctx.stroke();
  pool(g, 0, 120, lerp(120, 900, c) + 600 * open, warm, (0.12 + 0.3 * c + 0.3 * open) * L.alpha);
  pool(g, 0, 120, lerp(40, 220, c) + 200 * open, WARM_WHITE, (0.1 + 0.3 * c) * L.alpha * (1 - open * 0.6));
  ctx.globalAlpha = L.alpha;
}

/** Amber fracture lines radiating from (x,y) through the body — the light inside the boss finding the way out. One stroke. */
export function cracks(g: Gfx, x: number, y: number, n: number, len: number, crack: number, seed: number, color = AMBER, alpha = 1) {
  const ctx = g.ctx; if (crack <= 0) return;
  ctx.strokeStyle = rgba(color, 0.9 * alpha); ctx.lineWidth = 2.5; ctx.lineCap = 'round'; ctx.beginPath();
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + hash(i, seed) * 0.6; const l = len * (0.5 + hash(i, seed + 1)) * easeOut(clamp01(crack * 1.4 - hash(i, seed + 2) * 0.4));
    let px = x, py = y; ctx.moveTo(px, py);
    for (let s = 1; s <= 4; s++) { const d = l * s / 4; const j = (hash(i * 7 + s, seed + 3) - 0.5) * l * 0.25; px = x + Math.cos(a) * d - Math.sin(a) * j; py = y + Math.sin(a) * d + Math.cos(a) * j; ctx.lineTo(px, py); }
  }
  ctx.stroke();
  ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = alpha * 0.35 * crack; ctx.drawImage(glowDisc(color, 256), x - len, y - len, len * 2, len * 2);
  ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = alpha;
}

/** Shot 2 — the body lifts off as embers: a dense field rising from `box`, warm then the boss colour, glow on every 4th.
 *  `u` 0→1 over the shot drives density + how far they have risen; the scene fades its silhouette with 1 − u. */
export function comesApart(g: Gfx, L: LayerState, box: { x: number; y: number; w: number; h: number }, color: string, tm: OutroTiming = OT, seed = 4001) {
  const t = g.t; const u = span(t, tm.burst, tm.chart); if (u <= 0) return;
  const a = L.alpha * Math.sin(Math.min(1, u * 1.15) * Math.PI) ** 0.5;
  embers(g, { n: 900, x: box.x, y: box.y, w: box.w, h: box.h, rise: 260 + 200 * u, drift: 30, rMin: 1.5, rMax: 4.5, colors: [GOLD, AMBER, color], life: 2.4, seed, glow: 5 }, a, g.t - tm.burst + 0.2);
  embers(g, { n: 300, x: box.x - 200, y: box.y - 300, w: box.w + 400, h: box.h + 300, rise: 520, drift: 60, rMin: 0.8, rMax: 2, colors: [WARM_WHITE, AMBER, EMBER], life: 1.8, seed: seed + 9 }, a * 0.8, g.t - tm.burst);
  g.ctx.globalAlpha = L.alpha;
}

/** Shot 3 — the star chart. `place` = 0-based index of the place that ignites (6 = none: the whole chart burns, Darkness).
 *  Known places are warm points with rings; the path between them is dotted; the new place sits under an ink blot that
 *  burns away as the path crawls to it; future places are grey fog. Camera: `outroCamera(place)` pans/zooms onto it. */
export function starChart(g: Gfx, L: LayerState, place: number, tm: OutroTiming = OT) {
  const ctx = g.ctx; const t = g.t; if (t < tm.chart) return;
  const a = L.alpha; const u = span(t, tm.chart, tm.chart + 0.5);
  ctx.globalAlpha = a;
  gradientBg(g, '#04020c', '#0b0618', '#030109', 0.5);
  stars(g, 420, 7001, 1700, '#e9e4ff', 0.5 * a, t);
  // faint nebula under every slot
  ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 6; i++) { const p = PLACES[i]; ctx.globalAlpha = a * 0.1; ctx.drawImage(glowDisc(p.color, 256), p.x - 190, p.y - 150, 380, 300); }
  for (const f of FUTURE) { ctx.globalAlpha = a * 0.07; ctx.drawImage(glowDisc('#7c6aa8', 256), f.x - 150, f.y - 120, 300, 240); }
  ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = a;
  const lit = (i: number) => (place >= 6 ? 1 : i < place ? 1 : 0);
  // dotted path between consecutive known places; the segment into the new place crawls on with `crawl`
  const crawl = easeInOut(span(t, tm.chart + 0.4, tm.chart + 1.3));
  const segs = place >= 6 ? 5 : place;
  for (let s = 0; s < segs; s++) {
    const A = PLACES[s], B = PLACES[s + 1]; const prog = s === segs - 1 && place < 6 ? crawl : 1; if (prog <= 0) continue;
    const dx = B.x - A.x, dy = B.y - A.y; const len = Math.hypot(dx, dy); const n = Math.floor(len / 22);
    ctx.fillStyle = rgba('#e2e8f0', 0.85 * a); ctx.beginPath();
    for (let k = 0; k <= n * prog; k++) { const f = k / n; const bulge = Math.sin(f * Math.PI) * len * 0.12 * (s % 2 ? -1 : 1); const x = A.x + dx * f - dy / len * bulge, y = A.y + dy * f + dx / len * bulge; ctx.moveTo(x + 1.6, y); ctx.arc(x, y, 1.6, 0, Math.PI * 2); }
    ctx.fill();
  }
  // places
  for (let i = 0; i < 6; i++) {
    const p = PLACES[i]; const isNew = i === place;
    const ign = isNew ? easeOutExpo(span(t, tm.chart + 1.25, tm.chart + 1.9)) : lit(i);
    if (ign <= 0 && !isNew) { // under fog: a grey breath, no name
      ctx.globalAlpha = a * 0.5; ctx.drawImage(glowDisc('#94a3b8', 128), p.x - 70, p.y - 60, 140, 120); ctx.globalAlpha = a; continue;
    }
    const burn = place >= 6 ? easeOut(span(t, tm.chart + 0.4 + i * 0.18, tm.chart + 1.0 + i * 0.18)) : 1;
    const r = (10 + 8 * ign) * burn * (1 + 0.05 * Math.sin(t * 2.3 + i));
    ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = a * (0.45 + 0.35 * ign) * burn;
    ctx.drawImage(glowDisc(p.color, 256), p.x - r * 5, p.y - r * 5, r * 10, r * 10);
    ctx.globalAlpha = a * burn; ctx.drawImage(glowDisc(WARM_WHITE, 128, 0.4), p.x - r, p.y - r, r * 2, r * 2);
    ctx.globalCompositeOperation = 'source-over';
    ctx.strokeStyle = rgba(p.color, 0.55 * a * burn); ctx.lineWidth = 1.5; ctx.beginPath(); ctx.ellipse(p.x, p.y, r * 2.6, r * 2.1, 0.3 + i, 0, Math.PI * 2); ctx.stroke();
    if (isNew) { // ignition: a ring leaves the point, the ink blot over it burns from the centre out
      const ring = span(t, tm.chart + 1.3, tm.chart + 2.4); if (ring > 0 && ring < 1) { ctx.strokeStyle = rgba(p.color, (1 - ring) * 0.8 * a); ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(p.x, p.y, 10 + ring * 420, 0, Math.PI * 2); ctx.stroke(); }
      const fog = 1 - ign; if (fog > 0.01) { ctx.globalAlpha = a * fog; ctx.drawImage(glowDisc(INK, 256, 0.5), p.x - 170 * (0.6 + fog * 0.4), p.y - 140 * (0.6 + fog * 0.4), 340 * (0.6 + fog * 0.4), 280 * (0.6 + fog * 0.4)); ctx.globalAlpha = a; }
    }
  }
  ctx.globalAlpha = L.alpha * u;
}

/** Shot 3 typography (screen-locked): "CHAPTER n" tracks out, the place name assembles in its colour, a rule. For
 *  `place` 6 (Darkness) the label reads THE CHART IS COMPLETE. Fades before the hold. */
export function placeName(g: Gfx, L: LayerState, place: number, tm: OutroTiming = OT) {
  const t = g.t; const a = L.alpha * span(t, tm.chart + 1.5, tm.chart + 1.6) * (1 - span(t, tm.hold - 0.3, tm.hold)); if (a <= 0.001) return;
  const hw = g.hw; const y0 = Math.min(300, g.hh * 0.55);
  const small = Math.min(22, hw * 0.045); const sa = span(t, tm.chart + 1.5, tm.chart + 2.1);
  const label = place >= 6 ? 'THE CHART IS COMPLETE' : `CHAPTER ${ROMAN[place]}`;
  text(g, label, 0, y0 - 42, { size: small, font: 'tech', weight: 500, color: '#c9c2e8', tracking: lerp(small * 0.2, small * 0.9, easeOut(sa)), alpha: a * sa });
  if (place < 6) {
    const p = PLACES[place]; const big = Math.min(64, hw * 0.1 * (p.name.length > 14 ? 14 / p.name.length : 1));
    const o: TextOpts = { size: big, font: 'tech', weight: 700, color: WARM_WHITE, tracking: big * 0.08, glow: p.color, glowBlur: 22, alpha: a };
    assemble(g, p.name.toUpperCase(), 0, y0 + 18, span(t, tm.chart + 1.6, tm.chart + 2.5), o, 40, 0.05);
    const rw = easeOut(span(t, tm.chart + 2.2, tm.chart + 2.9)) * Math.min(760, hw * 1.5); if (rw > 1) rule(g, 0, y0 + 18 + big * 0.75, rw, p.color, 0.9 * a);
  }
}

/** Shot 4 — one small spark at the centre over the fading chart; breathes; a soft amber pool under it. */
export function holdSpark(g: Gfx, L: LayerState, tm: OutroTiming = OT) {
  const t = g.t; const u = easeOut(span(t, tm.hold, tm.hold + 0.7)); if (u <= 0) return;
  pool(g, 0, 0, 700 * u, GOLD, 0.25 * u * L.alpha);
  spark(g, 0, 0, { r: 16 + 6 * u, heat: 0.6 + 0.4 * u, flicker: 0.05, rays: 0 });
  g.ctx.globalAlpha = L.alpha;
}

/** DARKNESS' last line (shot 1, typed, cold) and LIGHT's answer (shot 4, warm, assembled). */
export function outroLines(g: Gfx, L: LayerState, dark: string, light: string, tm: OutroTiming = OT) {
  const ctx = g.ctx; const t = g.t;
  const a1 = L.alpha * span(t, 0.35, 0.4) * (1 - span(t, tm.burst + 0.4, tm.burst + 0.8));
  if (a1 > 0.001 && t > 0.35) {
    const o: TextOpts = { size: Math.min(34, g.hw * 0.065), font: 'body', weight: 500, color: '#c4b5fd', tracking: 2, glow: VIOLET, glowBlur: 12 };
    const w = textWidth(ctx, dark, o); ctx.globalAlpha = a1;
    if (w > g.hw * 1.8) { const cut = dark.lastIndexOf(' ', dark.length >> 1); const s1 = dark.slice(0, cut), s2 = dark.slice(cut + 1); const p = span(t, 0.4, 1.7);
      typed(g, s1, -textWidth(ctx, s1, o) / 2, 330 - o.size * 0.8, clamp01(p * dark.length / s1.length), o, 1.2); const p2 = clamp01((p * dark.length - s1.length) / s2.length); if (p2 > 0) typed(g, s2, -textWidth(ctx, s2, o) / 2, 330 + o.size * 0.8, p2, o, 1.2); }
    else typed(g, dark, -w / 2, 330, span(t, 0.4, 1.7), o, 1.2);
  }
  const a2 = L.alpha * span(t, tm.hold + 0.4, tm.hold + 0.5) * (1 - span(t, tm.end - 0.4, tm.end - 0.1));
  if (a2 > 0.001 && t > tm.hold + 0.4) {
    const o: TextOpts = { size: Math.min(34, g.hw * 0.065), font: 'body', weight: 500, color: AMBER, tracking: 1, glow: GOLD, glowBlur: 16, alpha: a2 };
    const w = textWidth(ctx, light, o); const y = Math.min(260, g.hh * 0.5);
    if (w > g.hw * 1.8) { const cut = light.lastIndexOf(' ', light.length >> 1); assemble(g, light.slice(0, cut), 0, y - o.size * 0.8, span(t, tm.hold + 0.4, tm.hold + 1.3), o, 30, 0.02); assemble(g, light.slice(cut + 1), 0, y + o.size * 0.8, span(t, tm.hold + 0.8, tm.hold + 1.6), o, 30, 0.02); }
    else assemble(g, light, 0, y, span(t, tm.hold + 0.4, tm.hold + 1.4), o, 30, 0.02);
  }
  ctx.globalAlpha = L.alpha;
}

/** Post spine: letterbox 0.19 (where the intro left it) opens through shot 2 to 0.06; grain falls; wash goes from violet to
 *  amber at the burst; one white bloom at the burst; a tiny aberration at the cut to the chart; fade at the end. */
export const outroPost = (tm: OutroTiming = OT): PostDef => ({
  letterbox: K(0, 0.19, tm.burst, 0.19, tm.chart - 0.2, 0.06, easeInOut, tm.chart, 0.08, tm.end, 0.08),
  vignette: K(0, 0.9, tm.burst, 0.8, tm.chart, 0.55, tm.hold, 0.6, tm.end, 0.8),
  grain: K(0, 0.55, tm.burst, 0.45, tm.chart, 0.2, tm.end, 0.15),
  wash: K(0, -0.7, tm.burst - 0.2, -0.5, tm.burst + 0.3, 0.45, easeOut, tm.chart - 0.01, 0.4, tm.chart, 0.05, step, tm.hold, 0.3, tm.end, 0.45),
  aberration: K(0, 3, tm.burst - 0.01, 2, tm.burst, 9, step, tm.burst + 0.5, 0, easeOut, tm.chart - 0.01, 0, tm.chart, 4, step, tm.chart + 0.3, 0, easeOut),
  flash: K(0, 0, tm.burst - 0.01, 0, tm.burst, 0.55, step, tm.burst + 0.7, 0, easeOut),
  fade: K(0, 0, tm.end - 0.6, 0, tm.end - 0.05, 1, easeIn),
});

/** Camera spine: slow push on the frozen body; drifts up with the embers; HARD CUT to the chart wide, then a pan + zoom
 *  onto the new place (design coords of PLACES[place]); hold on it. For place 6 the chart only zooms out. */
export const outroCamera = (place: number, tm: OutroTiming = OT, bodyZoom = 1.12): CameraDef => {
  const p = place < 6 ? PLACES[place] : { x: 0, y: 0 };
  return {
    zoom: K(0, 1.0, tm.burst, bodyZoom, tm.chart - 0.01, bodyZoom + 0.08, easeIn, tm.chart, place < 6 ? 0.92 : 0.8, step, tm.chart + 1.3, place < 6 ? 1.75 : 0.95, easeInOut, tm.hold, place < 6 ? 1.85 : 1.0, tm.end, place < 6 ? 1.9 : 1.0),
    x: K(0, 0, tm.chart - 0.01, 0, tm.chart, 0, step, tm.chart + 1.3, p.x, easeInOut, tm.end, p.x),
    y: K(0, 0, tm.burst, 0, tm.chart - 0.01, -90, easeInOut, tm.chart, 0, step, tm.chart + 1.3, p.y, easeInOut, tm.end, p.y),
    shakes: [{ t: 0.0, amp: 6, decay: 3, freq: 14 }, { t: tm.burst, amp: 9, decay: 3.5, freq: 10 }],
  };
};
/** Common cue bed; scenes append their own. */
export const outroCues = (tm: OutroTiming = OT): Cue[] => [
  { t: 0.02, sfx: 'boss_die', vol: 0.8 }, { t: 0.02, duck: 0.3, duckMs: 600 },
  { t: 0.4, sfx: 'story_line', vol: 0.3 },
  { t: tm.burst, sfx: 'enemy_die_big', vol: 0.6 }, { t: tm.burst + 0.1, sfx: 'pickup_essence', vol: 0.5 },
  { t: tm.chart, sfx: 'chapter_card', vol: 0.5 }, { t: tm.chart + 1.3, sfx: 'landmark_reveal', vol: 1 }, { t: tm.chart + 1.9, sfx: 'music_sting_reveal', vol: 0.9 },
  { t: tm.hold + 0.4, sfx: 'story_line', vol: 0.3 },
];

export { AMBER, GOLD, EMBER, WARM_WHITE, VIOLET, INK, span, lerp, clamp01, easeIn, easeOut, easeInOut, step, K, hash, wobble };
