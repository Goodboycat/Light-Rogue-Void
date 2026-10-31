// (M5) Shared kit for the Darkness Interrupts (`interrupt_<n>` ×6, SUGGESTIONS §2 / MOVIE.md §3 M5). Around 60 s into a
// run and every ~3 waves the sim freezes, one of these plays (4–6 s, DARKNESS acting: AAA horror), and the frame HARD CUTS
// back to gameplay with the enormous threat already spawning (logic/DarknessInterrupt.ts — the same chat owns both halves).
// Every interrupt has the same 4-shot spine so the player learns "this grammar = read the arena NOW"; the scene file writes
// its own storyboard and its own apparition. This file owns the freeze bed, the typed line, the threat name, post, camera, cues.
//
//   shot 1  0.0– 1.2  the freeze     (setup — the warm floor is eaten by ink in half a second; one typed DARKNESS line)
//   shot 2  1.2– 3.2  the apparition (escalation — the Eye / the Hand / the Maw / the Wall / the Mirror / the Stare rises; push-in)
//   shot 3  3.2– 4.2  the turn       (it NOTICES you: hard cut closer, inverted frame, it moves first)
//   shot 4  4.2– 5.0  the strike     (payoff — caps-lock threat name, flash, the shape lunges, HARD CUT to black → gameplay)
import { K, step, easeIn, easeOut, easeInOut, span, lerp, clamp01, pulses, wobble, hash } from '../Engine';
import type { Gfx, LayerState, Track, Cue, PostDef, CameraDef } from '../Engine';
import { AMBER, GOLD, EMBER, VIOLET, INK, WARM_WHITE, text, typed, textWidth, embers, pool, gradientBg, rule } from '../Draw';
import type { TextOpts } from '../Draw';
import { glowDisc, rgba } from '../Sprites';

export interface InterruptTiming { rise: number; turn: number; strike: number; end: number }
export const IT: InterruptTiming = { rise: 1.2, turn: 3.2, strike: 4.2, end: 5.0 };

/** Shot 1 — the freeze. The arena floor under the spark (an amber pool, never the sprite) with black motes hanging
 *  mid-air (time stopped: `rise` 0), eaten by ink from every edge in ~0.5 s. From `rise` on the bed is near-black with a
 *  violet bruise so the apparition has something to rise out of. */
export function freezeBed(g: Gfx, L: LayerState, tm: InterruptTiming = IT) {
  const ctx = g.ctx; const t = g.t; const u = easeIn(span(t, 0.05, 0.75));
  ctx.globalAlpha = L.alpha;
  gradientBg(g, '#110c07', lerp(0, 1, u) > 0.5 ? '#0a0614' : '#241709', '#07040a', 0.6);
  ctx.strokeStyle = rgba(AMBER, 0.09 * (1 - u)); ctx.lineWidth = 1.5; ctx.beginPath();
  for (let i = -8; i <= 8; i++) { ctx.moveTo(i * 60, 40); ctx.lineTo(i * 520, 1100); }
  for (let j = 0; j < 7; j++) { const y = 60 + j * j * 26; ctx.moveTo(-2600, y); ctx.lineTo(2600, y); }
  ctx.stroke();
  const gutter = 0.8 + 0.2 * wobble(t * 13, 7);
  pool(g, 0, 80, lerp(900, 60, u), GOLD, lerp(0.55, 0.15, u) * gutter * L.alpha);
  pool(g, 0, 80, lerp(240, 24, u), WARM_WHITE, lerp(0.5, 0.25, u) * gutter * L.alpha);
  const R = lerp(2300, 30, u);
  const gr = ctx.createRadialGradient(0, 80, R * 0.4, 0, 80, R);
  gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(0.65, 'rgba(3,1,8,0.85)'); gr.addColorStop(1, '#020106');
  ctx.fillStyle = gr; ctx.fillRect(-2800, -1600, 5600, 3200);
  // motes frozen in the air (rise 0 → the field does not move: time has stopped), then they sink once the ink has won
  embers(g, { n: 320, x: -1000, y: -700, w: 2000, h: 1300, rise: -70 * u, drift: 4, rMin: 1.5, rMax: 4, colors: ['#0a0612', '#140a22', '#07030f'], life: 6, seed: 5101 }, L.alpha * (0.35 + u * 0.65), g.ta);
  // the bruise: a violet haze low in the frame once it is dark (the apparition's light source)
  ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = L.alpha * 0.16 * u * (0.8 + 0.2 * wobble(t * 2, 3));
  ctx.drawImage(glowDisc(VIOLET, 256), -1300, -300, 2600, 1500);
  ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = L.alpha;
}

/** The one typed DARKNESS line: cold, jittering, from `from` (default 0.35) until just after the apparition is up. */
export function interruptLine(g: Gfx, L: LayerState, s: string, tm: InterruptTiming = IT, from = 0.35, y = 330) {
  const t = g.t; const ctx = g.ctx; const until = tm.turn - 0.1;
  const a = L.alpha * span(t, from - 0.05, from) * (1 - span(t, until - 0.3, until));
  if (a <= 0.001 || t < from) return;
  const o: TextOpts = { size: Math.min(36, g.hw * 0.07), font: 'body', weight: 500, color: '#c4b5fd', tracking: 2, glow: VIOLET, glowBlur: 14 };
  const w = textWidth(ctx, s, o); const typeDur = 1.5;
  ctx.globalAlpha = a;
  if (w > g.hw * 1.8) {
    const cut = s.lastIndexOf(' ', s.length >> 1); const s1 = s.slice(0, cut), s2 = s.slice(cut + 1);
    const p = span(t, from, from + typeDur); const p1 = clamp01(p * s.length / s1.length), p2 = clamp01((p * s.length - s1.length) / s2.length);
    typed(g, s1, -textWidth(ctx, s1, o) / 2, y - o.size * 0.8, p1, o, 1.6);
    if (p2 > 0) typed(g, s2, -textWidth(ctx, s2, o) / 2, y + o.size * 0.8, p2, o, 1.6);
  } else typed(g, s, -w / 2, y, span(t, from, from + typeDur), o, 1.6);
  ctx.globalAlpha = L.alpha;
}

/** Shot 4 — the threat name (caps-lock horror): glyphs land one by one with a hard step, the word slams from 1.2× to 1×
 *  with the flash, a violet rule tears out under it. Also prints the READ hint small under the rule (what saves you). */
export function threatName(g: Gfx, L: LayerState, name: string, read: string, tm: InterruptTiming = IT, color = VIOLET) {
  const t = g.t; const ctx = g.ctx; if (t < tm.strike) return;
  const a = L.alpha * (1 - span(t, tm.end - 0.12, tm.end - 0.04)); if (a <= 0.001) return;
  const big = Math.min(104, g.hw * 0.19 * (name.length > 8 ? 8 / name.length : 1));
  const p = span(t, tm.strike, tm.strike + 0.35); const n = Math.floor(p * name.length + 0.999);
  const slam = span(t, tm.strike + 0.35, tm.strike + 0.5); const sc = lerp(1.2, 1, easeOut(slam));
  const o: TextOpts = { size: big, font: 'tech', weight: 900, color: '#efe9ff', tracking: big * 0.12, glow: color, glowBlur: 26, alpha: a };
  const shown = name.slice(0, n); const w = textWidth(ctx, name, o);
  ctx.save(); ctx.scale(sc, sc);
  const jx = wobble(t * 50, 11) * 3 * (1 - slam), jy = wobble(t * 47, 13) * 3 * (1 - slam);
  text(g, shown, -w / 2 + jx, -10 + jy, { ...o, align: 'left' });
  ctx.restore();
  const rw = easeOut(span(t, tm.strike + 0.3, tm.strike + 0.6)) * Math.min(900, g.hw * 1.6);
  if (rw > 1) rule(g, 0, -10 + big * 0.7, rw, color, 0.9 * a);
  const sa = span(t, tm.strike + 0.42, tm.strike + 0.55) * a;
  if (sa > 0.001) text(g, read, 0, -10 + big * 0.7 + 42, { size: Math.min(24, g.hw * 0.045), font: 'body', weight: 600, color: AMBER, tracking: 3, glow: GOLD, glowBlur: 10, alpha: sa });
  ctx.globalAlpha = L.alpha;
}

/** A column of ink dripping UP from the bottom edge — the horror texture every apparition shares (one fill). */
export function inkRise(g: Gfx, L: LayerState, reach: number, seed = 5201, alpha = 1) {
  const ctx = g.ctx; const rc = clamp01(reach); if (rc <= 0) return;
  ctx.fillStyle = INK; ctx.globalAlpha = L.alpha * alpha; ctx.beginPath();
  ctx.moveTo(-1400, 700);
  for (let i = 0; i <= 40; i++) { const x = -1400 + i * 70; const h = (120 + hash(i, seed) * 520) * rc * (0.85 + 0.15 * wobble(g.t * 1.3 + i, seed + i)); ctx.lineTo(x, 560 - h); }
  ctx.lineTo(1400, 700); ctx.closePath(); ctx.fill();
  ctx.globalAlpha = L.alpha;
}

/** Violet ash hanging in the dark (the apparition's dust), cheap, 3 fills. */
export function ash(g: Gfx, L: LayerState, alpha: number, seed = 5301) {
  embers(g, { n: 260, x: -1100, y: -650, w: 2200, h: 1300, rise: 30, drift: 14, rMin: 1, rMax: 3, colors: [VIOLET, '#6d5bd0', '#3b2a73'], life: 5, seed }, L.alpha * alpha, g.ta);
}

/** Post spine: letterbox SNAPS to 0.2 at the freeze (no ease: the frame is taken from the player), vignette tight, grain
 *  heavy, wash violet; aberration spikes and an inverted frame at the turn; flash at the strike; HARD CUT to black at the end. */
export const interruptPost = (tm: InterruptTiming = IT, grainMax = 0.85): PostDef => ({
  letterbox: K(0, 0.06, 0.2, 0.2, step, tm.turn - 0.01, 0.2, tm.turn, 0.24, step, tm.end, 0.24),
  vignette: K(0, 0.6, 0.7, 0.9, tm.turn, 0.98, tm.end, 1),
  grain: K(0, 0.2, 0.7, 0.5, tm.turn - 0.01, 0.6, tm.turn, grainMax, step, tm.strike, 0.6, tm.end, 0.75),
  wash: K(0, 0.3, 0.7, -0.6, easeInOut, tm.rise, -0.8, tm.turn, -0.95, tm.end, -1),
  aberration: K(0, 0, 0.19, 0, 0.2, 10, step, 0.6, 0, easeOut, tm.turn - 0.01, 2, tm.turn, 20, step, tm.turn + 0.45, 3, easeOut, tm.strike - 0.01, 6, easeIn, tm.strike, 24, step, tm.strike + 0.35, 2, easeOut, tm.end - 0.2, 4, tm.end, 0),
  invert: pulses([tm.turn, tm.strike + 0.35], 0.06),
  flash: K(0, 0, tm.strike + 0.34, 0, tm.strike + 0.35, 0.9, step, tm.strike + 0.8, 0, easeOut),
  fade: K(0, 0, tm.end - 0.1, 0, tm.end - 0.04, 1, easeIn),
});

/** Camera spine: the push-in that never stops; HARD CUT closer at the turn; lunge to `push` by the strike; slam back. */
export const interruptZoom = (tm: InterruptTiming = IT, push = 1.5): Track =>
  K(0, 1, 0.2, 1.04, step, tm.rise, 1.08, tm.turn - 0.01, 1.22, easeIn, tm.turn, 1.0, step, tm.strike - 0.01, push, easeIn, tm.strike + 0.35, 1.08, step, tm.end, 1.16);
export const interruptShakes = (tm: InterruptTiming = IT): NonNullable<CameraDef['shakes']> => [
  { t: 0.2, amp: 7, decay: 3, freq: 18 }, { t: tm.turn, amp: 12, decay: 4, freq: 22 }, { t: tm.strike + 0.35, amp: 22, decay: 5, freq: 26 },
];
/** Common cue bed; scenes append their own. `boss_arrive` at the strike is the sound the gameplay threat also uses. */
export const interruptCues = (tm: InterruptTiming = IT): Cue[] => [
  { t: 0.02, sfx: 'boss_telegraph', vol: 0.6 }, { t: 0.02, duck: 0.25, duckMs: 400 },
  { t: 0.2, sfx: 'boss_fire', vol: 0.7 }, { t: 0.4, sfx: 'story_line', vol: 0.3 },
  { t: tm.rise, sfx: 'cin_whisper', vol: 0.45 }, { t: tm.rise + 0.1, sfx: 'ambush_ring', vol: 0.3 },
  { t: tm.turn, sfx: 'boss_phase', vol: 0.7 }, { t: tm.turn + 0.02, sfx: 'cin_cut', vol: 0.4 },
  { t: tm.strike, sfx: 'cin_silence_drop', vol: 0.5 }, { t: tm.strike + 0.35, sfx: 'boss_arrive', vol: 0.95 }, { t: tm.strike + 0.4, sfx: 'boss_enrage', vol: 0.5 },
];

export { AMBER, GOLD, EMBER, VIOLET, INK, WARM_WHITE, span, lerp, clamp01, easeIn, easeOut, easeInOut, step, K, hash, wobble };
