// (M3) Shared kit for the boss intros (`boss_intro_<bossId>` ×6). Every intro has the same 4-shot spine so the
// player learns the grammar, and every intro is DARKNESS acting (MOVIE.md §0: horror — slow push-ins that never
// stop, hard cuts, inverted frames, typed caps-lock whispers). The scene file writes its own storyboard table and
// its own hero silhouette; this file owns the arena blackout, the typed lines, the name slam, post, camera, cues.
//
//   shot 1  0.0– 2.2  the arena goes dark   (setup — the warm floor under the spark is eaten by ink from the edges)
//   shot 2  2.2– 5.4  the silhouette        (escalation — the hero shape rises out of the black, push-in)
//   shot 3  5.4– 7.8  the turn              (the boss NOTICES the camera: hard cut closer, inverted frame, it looks at you)
//   shot 4  7.8–10.0  the name              (payoff — caps-lock name slams in, flash, the shape fills the frame, cut to black → BossBar)
import { K, step, easeIn, easeOut, easeInOut, span, lerp, clamp01, pulses, wobble } from '../Engine';
import type { Gfx, LayerState, Track, Cue, PostDef, CameraDef } from '../Engine';
import { AMBER, GOLD, EMBER, VIOLET, INK, text, typed, textWidth, embers, pool, gradientBg, rule } from '../Draw';
import type { TextOpts } from '../Draw';
import { rgba } from '../Sprites';

export interface BossTiming { rise: number; turn: number; name: number; end: number }
export const BT: BossTiming = { rise: 2.2, turn: 5.4, name: 7.8, end: 10.0 };

/** Shot 1 — the arena going dark. A warm umber floor lit by one guttering amber pool (the spark's own light, never
 *  the sprite); ink closes from every edge until the pool is a point and goes out. Black motes fall through it. */
export function arenaDark(g: Gfx, L: LayerState, tm: BossTiming = BT, warm = GOLD) {
  const ctx = g.ctx; const t = g.t; const u = easeIn(span(t, 0.1, tm.rise - 0.15));
  const gutter = 0.75 + 0.25 * wobble(t * 11, 31) * (0.3 + u);
  ctx.globalAlpha = L.alpha;
  gradientBg(g, '#140e07', '#2a1c0b', '#0b0704', 0.6);
  // floor: faint perspective lines so it reads as ground, not void
  ctx.strokeStyle = rgba(AMBER, 0.08 * (1 - u)); ctx.lineWidth = 1.5; ctx.beginPath();
  for (let i = -8; i <= 8; i++) { ctx.moveTo(i * 60, 40); ctx.lineTo(i * 520, 1100); }
  for (let j = 0; j < 7; j++) { const y = 60 + j * j * 26; ctx.moveTo(-2600, y); ctx.lineTo(2600, y); }
  ctx.stroke();
  pool(g, 0, 80, lerp(980, 90, u), warm, lerp(0.6, 0.2, u) * gutter * L.alpha);
  pool(g, 0, 80, lerp(260, 30, u), '#fff7e6', lerp(0.5, 0.3, u) * gutter * L.alpha);
  // the ink: a ring of black that closes on the centre (radial gradient, one fill)
  const R = lerp(2200, 40, u);
  const gr = ctx.createRadialGradient(0, 80, R * 0.45, 0, 80, R);
  gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(0.7, 'rgba(2,1,6,0.85)'); gr.addColorStop(1, '#020106');
  ctx.fillStyle = gr; ctx.fillRect(-2800, -1600, 5600, 3200);
  // black motes sinking through the light
  embers(g, { n: 360, x: -1000, y: -700, w: 2000, h: 1300, rise: -90, drift: 10, rMin: 1.5, rMax: 4.5, colors: ['#0a0612', '#120a1f', '#07030f'], life: 5, seed: 901 }, L.alpha * (0.3 + u * 0.7), g.ta);
  ctx.globalAlpha = L.alpha;
}

/** A DARKNESS line, typed glyph by glyph with jitter, cold violet; wraps on narrow frames. Visible from `from`,
 *  fades over 0.3 s before `until`. */
export function bossLine(g: Gfx, L: LayerState, s: string, from: number, until: number, y = 330, typeDur = 1.6, size = 36) {
  const t = g.t; const ctx = g.ctx;
  const a = L.alpha * span(t, from - 0.05, from) * (1 - span(t, until - 0.3, until));
  if (a <= 0.001 || t < from) return;
  const o: TextOpts = { size: Math.min(size, g.hw * 0.07), font: 'body', weight: 500, color: '#c4b5fd', tracking: 2, glow: VIOLET, glowBlur: 14 };
  const w = textWidth(ctx, s, o);
  ctx.globalAlpha = a;
  if (w > g.hw * 1.8) {
    const cut = s.lastIndexOf(' ', s.length >> 1); const s1 = s.slice(0, cut), s2 = s.slice(cut + 1);
    const p = span(t, from, from + typeDur); const p1 = clamp01(p * s.length / s1.length), p2 = clamp01((p * s.length - s1.length) / s2.length);
    typed(g, s1, -textWidth(ctx, s1, o) / 2, y - o.size * 0.8, p1, o, 1.4);
    if (p2 > 0) typed(g, s2, -textWidth(ctx, s2, o) / 2, y + o.size * 0.8, p2, o, 1.4);
  } else typed(g, s, -w / 2, y, span(t, from, from + typeDur), o, 1.4);
  ctx.globalAlpha = L.alpha;
}

/** Shot 4 — the name. Caps-lock horror: glyphs land one by one with a hard step (no ease), each jittering, then
 *  the whole word slams from 1.18× to 1× with the flash; a rule in the boss colour tears out under it. */
export function bossName(g: Gfx, L: LayerState, name: string, color: string, tm: BossTiming = BT, label = 'IT HAS NOTICED YOU') {
  const ctx = g.ctx; const t = g.t; if (t < tm.name) return;
  const a = L.alpha * (1 - span(t, tm.end - 0.45, tm.end - 0.05));
  if (a <= 0.001) return;
  const big = Math.min(96, g.hw * 0.135 * (name.length > 12 ? 11 / name.length : 1));
  const o: TextOpts = { size: big, font: 'tech', weight: 900, color: '#f1eefc', tracking: big * 0.12, glow: color, glowBlur: 34 };
  const landDur = 0.45; const p = span(t, tm.name, tm.name + landDur);
  const n = Math.ceil(p * name.length);
  const slam = 1 + 0.18 * (1 - easeOut(span(t, tm.name + landDur, tm.name + landDur + 0.25)));
  const jx = wobble(t * 43, 12) * 2.2 * (1 - span(t, tm.name + 1.0, tm.name + 1.8)), jy = wobble(t * 39, 17) * 2.2;
  ctx.save(); ctx.translate(jx, jy); ctx.scale(slam, slam);
  // small label tracks out above
  const small = Math.min(22, g.hw * 0.042); const sa = span(t, tm.name + 0.5, tm.name + 1.1);
  text(g, label, 0, -big * 1.05, { size: small, font: 'tech', weight: 500, color: '#9f94c7', tracking: lerp(small * 0.2, small * 0.8, easeOut(sa)), alpha: a * sa });
  // the name: full-width layout, only the first n glyphs drawn (each pops in with a 2-frame scale burst)
  ctx.font = `900 ${big}px 'Orbitron', sans-serif`; ctx.textBaseline = 'middle'; ctx.textAlign = 'left';
  let w = 0; for (let i = 0; i < name.length; i++) w += ctx.measureText(name[i]).width + (i < name.length - 1 ? o.tracking! : 0);
  let cx = -w / 2;
  ctx.shadowColor = color; ctx.shadowBlur = 34 * g.S; ctx.fillStyle = o.color!;
  for (let i = 0; i < name.length; i++) {
    const gw = ctx.measureText(name[i]).width;
    if (i < n) {
      const landed = tm.name + (i / name.length) * landDur; const pop = 1 + 0.35 * (1 - span(t, landed, landed + 0.09));
      ctx.globalAlpha = a; ctx.save(); ctx.translate(cx + gw / 2, 0); ctx.scale(pop, pop); ctx.fillText(name[i], -gw / 2, 0); ctx.restore();
    }
    cx += gw + o.tracking!;
  }
  ctx.shadowBlur = 0; ctx.shadowColor = 'transparent';
  const rw = easeOut(span(t, tm.name + landDur, tm.name + landDur + 0.5)) * Math.min(900, g.hw * 1.6);
  if (rw > 1) rule(g, 0, big * 0.78, rw, color, 0.95 * a);
  ctx.restore(); ctx.globalAlpha = L.alpha;
}

/** Default post stack: letterbox tightens shot by shot, grain climbs, violet wash, aberration spikes at the turn
 *  and the name, one inverted frame at each, a flash at the name, cut to black at the end (BossBar mounts after). */
export const bossPost = (tm: BossTiming = BT, grainMax = 0.8): PostDef => ({
  letterbox: K(0, 0.08, tm.rise, 0.13, easeInOut, tm.turn - 0.01, 0.16, tm.turn, 0.19, step, tm.name, 0.21, tm.end, 0.21),
  vignette: K(0, 0.55, tm.rise, 0.85, tm.turn, 0.95, tm.name, 0.9, tm.end, 1),
  grain: K(0, 0.15, tm.rise, 0.4, tm.turn - 0.01, 0.6, tm.turn, grainMax, step, tm.name, 0.55, tm.end, 0.7),
  wash: K(0, 0.35, tm.rise, -0.3, easeInOut, tm.turn, -0.8, tm.name, -0.95, tm.end, -0.95),
  aberration: K(0, 0, tm.turn - 0.3, 0, tm.turn - 0.01, 3, tm.turn, 18, step, tm.turn + 0.5, 3, easeOut, tm.name - 0.01, 8, easeIn, tm.name, 22, step, tm.name + 0.4, 2, easeOut, tm.end - 0.3, 4, tm.end, 0),
  invert: pulses([tm.turn, tm.name + 0.45], 0.06),
  flash: K(0, 0, tm.name + 0.44, 0, tm.name + 0.45, 0.85, step, tm.name + 0.95, 0, easeOut),
  fade: K(0, 0, tm.end - 0.35, 0, tm.end - 0.05, 1, easeIn),
});

/** Camera spine: push-in that never stops through the silhouette; HARD CUT closer at the turn; push to `push` by the
 *  name; slam back at the name; drift in to the end. Scenes add x/y/rot and their own shakes on top of these. */
export const bossZoom = (tm: BossTiming = BT, push = 1.45): Track =>
  K(0, 1, tm.rise, 1.03, tm.turn - 0.01, 1.2, easeIn, tm.turn, 1.0, step, tm.name - 0.01, push, easeIn, tm.name, 1.06, step, tm.end, 1.14);
export const bossShakes = (tm: BossTiming = BT): NonNullable<CameraDef['shakes']> => [
  { t: tm.rise, amp: 4, decay: 2.5, freq: 9 }, { t: tm.turn, amp: 12, decay: 4, freq: 22 }, { t: tm.name + 0.45, amp: 20, decay: 5, freq: 26 },
];
/** Common cue bed; scenes append their own. */
export const bossCues = (tm: BossTiming = BT): Cue[] => [
  { t: 0.05, sfx: 'boss_telegraph', vol: 0.55 }, { t: 0.05, duck: 0.35, duckMs: 800 },
  { t: tm.rise, sfx: 'ambush_ring', vol: 0.35 },
  { t: tm.turn, sfx: 'boss_phase', vol: 0.65 }, { t: tm.turn + 0.15, sfx: 'story_line', vol: 0.3 },
  { t: tm.name + 0.45, sfx: 'boss_arrive', vol: 0.9 }, { t: tm.name + 0.5, sfx: 'boss_enrage', vol: 0.5 },
];

/** Three horror lines spread over shots 2–4: l0 while the shape rises, l1 at the turn, l2 under the name. */
export function bossLines(g: Gfx, L: LayerState, lines: [string, string, string], tm: BossTiming = BT) {
  bossLine(g, L, lines[0], tm.rise + 0.6, tm.turn, 330, 1.5);
  bossLine(g, L, lines[1], tm.turn + 0.3, tm.name, 330, 1.4);
  bossLine(g, L, lines[2], tm.name + 1.2, tm.end - 0.1, 300, 0.9, 30);
}

export { AMBER, GOLD, EMBER, VIOLET, INK, span, lerp, clamp01, easeIn, easeOut, easeInOut, step, K };
