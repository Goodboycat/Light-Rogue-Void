// (M6) SCENE `death` — the spark goes out (MOVIE.md §3 M6). Plays the frame the player's HP hits 0; gameplay hidden +
// paused (M1 contract); `onDone` → `run_summary` (scenes/run_summary.ts, a looping scene under components/DeathSummary.tsx).
// 6.0 s. Horror beat first (the Eye closes in), then the gutter, then 1.2 s of TRUE black so the summary's warmth lands.
//
// STORYBOARD (written first, keyframes derived from it — MOVIE.md §1.4)
// shot | start–end s | framing                       | camera move                    | what changes on screen                                                                                                   | text                      | audio id
// -----|-------------|-------------------------------|--------------------------------|--------------------------------------------------------------------------------------------------------------------------|---------------------------|------------------
//  1   |  0.0– 1.4   | wide, the spark small, low    | slow push                      | the warm floor is already cold; the spark flickers hard, its pool shrinks; ink climbs the frame from every edge           | —                         | player_death, cin_silence_drop
//  2   |  1.4– 3.2   | medium → close on the spark   | push (never stops), tilt       | the Eye opens behind it, enormous, iris filling the top of frame; tendrils reach from the ink; the spark's rays are torn   | DARKNESS: "There. Small."  | cin_whisper, cin_tendril
//  3   |  3.2– 4.4   | close, the spark alone        | lock, one hard shake at 4.1    | the turn: the spark flares once — bright, defiant — then gutters to a mote; the Eye blinks shut; white flash → nothing      | —                         | burst_fire, cin_cut
//  4   |  4.4– 6.0   | true black                    | none                           | 1.2 s of nothing (no grain, no vignette), then one ember crosses the frame low — it is not over; fade handled by run_summary | —                         | (silence)
// Structure: setup (1: cold, the spark failing) → escalation (2: the Eye closes in) → turn (3: the flare, then out) → payoff (4: true black; the ember says "not over").

import { K, step, easeIn, easeOut, easeInOut, easeOutExpo, span, lerp, clamp01, hash, wobble } from '../Engine';
import type { SceneDef, Gfx, LayerState } from '../Engine';
import { AMBER, GOLD, EMBER, WARM_WHITE, VIOLET, INK, embers, eye, tendrils, spark, pool, gradientBg, typed, text } from '../Draw';
import { glowDisc, rgba } from '../Sprites';

export const DT = { eye: 1.4, flare: 3.2, out: 4.1, black: 4.4, end: 6.0 };
const { eye: T_EYE, flare: T_FLARE, out: T_OUT, black: T_BLACK, end: T_END } = DT;

/** spark position: low in frame, drifting a hair (it is dying, not standing) */
const SX = 0, SY = 180;

/** shot 1–3 bed: the floor already cold (violet where it was amber), ink climbing every edge, a shrinking pool under the spark */
const drawBed = (g: Gfx, L: LayerState) => {
  const ctx = g.ctx; const t = g.t; if (t >= T_BLACK) return;
  const cold = easeOut(span(t, 0, T_EYE));                   // amber → violet
  const ink = easeIn(span(t, 0.2, T_FLARE + 0.4));            // edges close
  ctx.globalAlpha = L.alpha;
  gradientBg(g, '#05030a', lerp(0, 1, cold) > 0.5 ? '#0d0718' : '#140c08', '#07030f', 0.6);
  // floor perspective hairlines, violet-tinted, dying with the ink
  ctx.strokeStyle = rgba(cold > 0.5 ? VIOLET : AMBER, 0.06 * (1 - ink)); ctx.lineWidth = 1.5; ctx.beginPath();
  for (let i = -8; i <= 8; i++) { ctx.moveTo(i * 60, 40); ctx.lineTo(i * 520, 1100); }
  for (let j = 0; j < 7; j++) { const y = 60 + j * j * 26; ctx.moveTo(-2600, y); ctx.lineTo(2600, y); }
  ctx.stroke();
  // the pool under the spark shrinks as it fails; flares once at T_FLARE
  const flare = Math.sin(clamp01(span(t, T_FLARE, T_OUT)) * Math.PI);
  const gone = span(t, T_OUT, T_BLACK);
  pool(g, SX, SY, lerp(620, 180, easeInOut(span(t, 0, T_FLARE))) + 900 * flare, GOLD, (0.22 * (1 - cold * 0.5) + 0.6 * flare) * (1 - gone) * L.alpha);
  // ink: four soft black bands closing from the edges (glow sprite of INK, hard edge)
  const reach = ink * 760;
  ctx.globalAlpha = L.alpha * clamp01(ink * 1.4);
  const inkSpr = glowDisc(INK, 256, 0.55);
  ctx.drawImage(inkSpr, -1400, -1100 - 600 + reach * 0.9, 2800, 1300); // top
  ctx.drawImage(inkSpr, -1400, 540 + 300 - reach * 0.8, 2800, 1300);   // bottom
  ctx.drawImage(inkSpr, -1900 - 700 + reach, -900, 1500, 1800);        // left
  ctx.drawImage(inkSpr, 1100 + 700 - reach, -900, 1500, 1800);         // right
  ctx.globalAlpha = L.alpha;
};

/** the Eye behind the spark — opens over shot 2, enormous, looking DOWN at it; blinks shut at the flare */
const drawEye = (g: Gfx, L: LayerState) => {
  const t = g.t; if (t < T_EYE - 0.2 || t >= T_BLACK) return;
  const open = easeOut(span(t, T_EYE, T_EYE + 1.1)) * (1 - easeIn(span(t, T_FLARE + 0.15, T_FLARE + 0.45)));
  if (open <= 0.003) return;
  const push = easeInOut(span(t, T_EYE, T_FLARE));
  const r = lerp(520, 760, push);
  g.ctx.globalAlpha = L.alpha;
  eye(g, 0, lerp(-520, -380, push), { r, open, look: { x: 0, y: 0.55 }, pupil: lerp(0.35, 0.12, push), glow: 0.5 + 0.5 * push, veins: 0.6 * push });
  // its cold light on the floor, growing
  pool(g, 0, 60, 900 * open, VIOLET, 0.16 * open * L.alpha);
  g.ctx.globalAlpha = L.alpha;
};

/** tendrils from the ink toward the spark (shot 2–3), torn away by the flare */
const drawTendrils = (g: Gfx, L: LayerState) => {
  const t = g.t; if (t < T_EYE + 0.3 || t >= T_OUT) return;
  const reach = easeOut(span(t, T_EYE + 0.3, T_FLARE)) * (1 - easeIn(span(t, T_FLARE, T_FLARE + 0.4)));
  if (reach <= 0) return;
  g.ctx.globalAlpha = L.alpha;
  tendrils(g, -1100, 300, 5, 1050, 0.15, 0.9, 61, reach, t);
  tendrils(g, 1100, 260, 5, 1050, Math.PI - 0.15, 0.9, 62, reach, t);
  tendrils(g, 0, -700, 4, 820, Math.PI / 2, 0.8, 63, reach * 0.9, t);
  g.ctx.globalAlpha = L.alpha;
};

/** THE SPARK — fails over shots 1–2 (hard flicker, rays torn), flares ONCE at 3.2, gutters to a mote, out at 4.1 */
const drawSpark = (g: Gfx, L: LayerState) => {
  const t = g.t; if (t >= T_BLACK) return;
  const fail = easeInOut(span(t, 0, T_FLARE));
  const flare = Math.sin(clamp01(span(t, T_FLARE, T_OUT)) * Math.PI);
  const gone = easeIn(span(t, T_OUT - 0.25, T_OUT));
  // hard flicker: stutters that get longer as it fails
  const stutter = Math.sin(t * (14 + fail * 22)) > lerp(-1, 0.55, fail) ? 1 : 0.25;
  const heat = (lerp(1, 0.35, fail) * stutter + 1.8 * flare) * (1 - gone);
  if (heat <= 0.01) return;
  const jx = wobble(t * 9, 3) * (6 + fail * 14), jy = wobble(t * 7, 8) * (4 + fail * 10);
  g.ctx.globalAlpha = L.alpha;
  spark(g, SX + jx, SY + jy, { r: lerp(24, 9, fail) + 40 * flare, heat, flicker: 0.04 + fail * 0.2, rays: Math.round(lerp(8, 0, fail) + 10 * flare), t });
  // the flare's white core
  if (flare > 0) { const ctx = g.ctx; ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = L.alpha * flare * 0.9; const R = 320 * flare; ctx.drawImage(glowDisc(WARM_WHITE, 256), SX - R, SY - R, R * 2, R * 2); ctx.globalCompositeOperation = 'source-over'; }
  g.ctx.globalAlpha = L.alpha;
};

/** motes leaving the spark upward (its light leaking out) in shots 1–2; the flare throws a burst; after the out, nothing */
const drawEmbers = (g: Gfx, L: LayerState) => {
  const t = g.t; if (t >= T_OUT + 0.3) return;
  const leak = 1 - span(t, T_FLARE - 0.3, T_FLARE);
  if (leak > 0) embers(g, { n: 140, x: SX - 160, y: SY - 40, w: 320, h: 120, rise: 90, drift: 24, rMin: 0.8, rMax: 2.4, colors: [AMBER, GOLD, EMBER], life: 2.6, seed: 6101, glow: 4 }, L.alpha * 0.8 * leak, t);
  const burst = span(t, T_FLARE, T_OUT + 0.3);
  if (burst > 0) embers(g, { n: 420, x: SX - 80, y: SY - 80, w: 160, h: 160, rise: 700, drift: 120, rMin: 1, rMax: 3.5, colors: [WARM_WHITE, AMBER, GOLD], life: 1.1, seed: 6102, glow: 5 }, L.alpha * (1 - burst) * 0.9, t - T_FLARE);
  g.ctx.globalAlpha = L.alpha;
};

/** DARKNESS' line (shot 2, typed, cold, small — it does not need to be loud) */
const drawLine = (g: Gfx, L: LayerState) => {
  const t = g.t; const a = L.alpha * span(t, T_EYE + 0.5, T_EYE + 0.6) * (1 - span(t, T_FLARE - 0.1, T_FLARE + 0.1));
  if (a <= 0) return;
  g.ctx.globalAlpha = a;
  const p = span(t, T_EYE + 0.5, T_EYE + 1.5);
  text(g, 'DARKNESS', -420, -300, { size: 15, font: 'mono', weight: 500, color: rgba(VIOLET, 0.6), tracking: 6, align: 'left' });
  typed(g, 'There. Small.', -420, -258, p, { size: 40, font: 'body', weight: 500, color: '#cfc6f2', tracking: 2, glow: VIOLET, glowBlur: 18 }, 1.5, t);
  g.ctx.globalAlpha = L.alpha;
};

/** shot 4: true black, then ONE ember crosses the frame low, right to left — "not over" */
const drawLastEmber = (g: Gfx, L: LayerState) => {
  const t = g.t; const u = span(t, T_BLACK + 0.9, T_END); if (u <= 0) return;
  const ctx = g.ctx; const x = lerp(520, -560, easeInOut(u)), y = 360 + Math.sin(u * 5.2) * 26 - u * 120;
  const a = L.alpha * Math.sin(u * Math.PI) ** 0.6;
  ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = a * 0.55; ctx.drawImage(glowDisc(AMBER, 128), x - 30, y - 30, 60, 60);
  ctx.globalAlpha = a; ctx.drawImage(glowDisc(WARM_WHITE, 64, 0.5), x - 3, y - 3, 6, 6);
  ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = L.alpha;
};

export const death: SceneDef = {
  id: 'death',
  duration: T_END,
  skipAfter: 0.8,
  bg: g => { const ctx = g.ctx; ctx.fillStyle = '#000'; ctx.fillRect(-g.hw - 2, -g.hh - 2, g.hw * 2 + 4, g.hh * 2 + 4); },
  camera: {
    // shot 1 slow push → shot 2 push that never stops + a tilt → shot 3 lock → shot 4 none
    zoom: K(0, 1.0, T_EYE, 1.08, easeInOut, T_FLARE, 1.42, easeInOut, T_OUT, 1.42, T_BLACK, 1.0, step),
    y: K(0, 0, T_EYE, 40, easeInOut, T_FLARE, 120, easeInOut, T_BLACK, 0, step),
    rot: K(0, 0, T_EYE, 0, T_FLARE, -0.035, easeInOut, T_OUT, -0.035, T_BLACK, 0, step),
    shakes: [{ t: T_FLARE, amp: 14, freq: 26, decay: 7, dur: 0.5 }, { t: T_OUT, amp: 10, freq: 30, decay: 10, dur: 0.3 }],
  },
  layers: [
    { id: 'bed',      draw: drawBed,       to: T_BLACK },
    { id: 'eye',      draw: drawEye,       from: T_EYE - 0.2, to: T_BLACK, parallax: 0.85 },
    { id: 'tendrils', draw: drawTendrils,  from: T_EYE + 0.3, to: T_OUT,   parallax: 1.1 },
    { id: 'embers',   draw: drawEmbers,    to: T_OUT + 0.3,   blend: 'lighter' },
    { id: 'spark',    draw: drawSpark,     to: T_BLACK },
    { id: 'line',     draw: drawLine,      from: T_EYE + 0.5, to: T_FLARE + 0.1, parallax: 0 },
    { id: 'ember',    draw: drawLastEmber, from: T_BLACK + 0.9, parallax: 0 },
  ],
  post: {
    letterbox: K(0, 0.06, T_EYE, 0.09, easeInOut, T_FLARE, 0.12, easeInOut, T_BLACK, 0, step),
    vignette:  K(0, 0.6, T_FLARE, 0.85, easeInOut, T_OUT, 0.85, T_BLACK, 0, step),   // true black: nothing
    grain:     K(0, 0.3, T_FLARE, 0.45, T_BLACK, 0, step),
    aberration: K(0, 0, T_EYE, 1.5, T_FLARE, 5, easeIn, T_FLARE + 0.1, 12, T_OUT, 0, easeOut),
    wash:      K(0, 0.2, T_EYE, -0.45, easeInOut, T_FLARE, -0.7, T_FLARE + 0.05, 0.9, step, T_OUT, 0, easeOut),
    flash:     K(0, 0, T_FLARE, 0.55, step, T_FLARE + 0.12, 0, easeOut, T_OUT, 0.9, step, T_OUT + 0.08, 0, easeOut),
    fade:      K(0, 0, T_OUT + 0.05, 0, T_BLACK, 1, easeIn),  // and it stays black into run_summary
  },
  cues: [
    { t: 0.02, sfx: 'player_death', vol: 0.9 }, { t: 0.02, music: null }, { t: 0.05, duck: 0.0, duckMs: 400 },
    { t: 0.3, sfx: 'cin_silence_drop', vol: 0.6 },
    { t: T_EYE, sfx: 'cin_whisper', vol: 0.6 }, { t: T_EYE + 0.5, sfx: 'story_line', vol: 0.25 },
    { t: T_EYE + 0.4, sfx: 'cin_tendril', vol: 0.5 },
    { t: T_FLARE, sfx: 'burst_fire', vol: 0.7 },
    { t: T_OUT, sfx: 'cin_cut', vol: 0.8 },
  ],
  shots: [
    { n: 1, from: 0, to: T_EYE, what: 'wide: the floor already cold, the spark flickers hard, its pool shrinks, ink climbs every edge' },
    { n: 2, from: T_EYE, to: T_FLARE, what: 'the Eye opens behind it, enormous, looking down; tendrils reach from the ink; DARKNESS: "There. Small."' },
    { n: 3, from: T_FLARE, to: T_BLACK, what: 'the turn: one defiant flare, the Eye blinks shut, the spark gutters to a mote — flash — out' },
    { n: 4, from: T_BLACK, to: T_END, what: 'true black (no grain, no vignette) 1.2 s; one ember crosses low — not over → run_summary' },
  ],
};
export default death;
