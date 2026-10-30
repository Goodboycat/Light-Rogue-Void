// (M0) SCENE `title_seam` — plays once per session at launch, before the main menu. 34 s. Skippable after 0.6 s.
// A film, not gameplay. The Darkness opens its Eye on us (horror); something small refuses to go out (warmth).
//
// STORYBOARD (written first, keyframes derived from it — MOVIE.md §1.4)
// shot | start–end s | framing        | camera move                         | what changes on screen                                              | text                          | audio id
// -----|-------------|----------------|-------------------------------------|---------------------------------------------------------------------|-------------------------------|------------------
//  1   |  0.0– 4.0   | extreme close  | slow accelerating push-in           | black; heavy grain; a violet hairline (closed lid) breathes at centre | —                             | ambush_ring (low)
//  2   |  4.0– 9.0   | extreme close  | push-in continues + rack focus      | the lid opens on an Eye wider than the frame; small eyes wake around | "it was always here."         | boss_telegraph, story_line
//  3   |  9.0–14.0   | wide           | HARD CUT + shake(decay) + pan left  | Eye small on a black horizon; tendrils pour from it over the ridge   | "THE DARKNESS DOES NOT HUNT." | boss_arrive, story_line
//  4   | 14.0–19.0   | close          | push-in into tendrils, 2 inverted flash frames | tendrils fill frame, eye-wall at full, grain/aberration peak | "IT WAITS."                   | boss_phase, boss_enrage
//  5   | 19.0–21.5   | extreme close  | HARD CUT to true black, hold        | nothing for 0.8 s; then one amber point at centre                   | —                             | pickup_essence
//  6   | 21.5–26.0   | close → wide   | overshoot zoom-out, letterbox opens | the Spark ignites: bloom, rays, embers rise, black → warm umber      | "but something small refused."| burst_charge, shrine_touch, landmark_reveal
//  7   | 26.0–31.0   | wide           | breathing scale, slow pan up        | LIGHT slams in lit from below by the spark; rule; ROGUE VOID widens  | LIGHT / ROGUE VOID            | chapter_card, music_sting_reveal, music_title
//  8   | 31.0–34.0   | wide           | hold, fade to black                 | title holds, embers continue, hint pulses                            | "tap to begin"                | —
// Structure: setup (1–2) → escalation (3–4) → turn (5) → payoff (6–8).

import { K, pulses, step, easeIn, easeOut, easeInOut, easeOutExpo, overshoot, span, clamp01, lerp, wobble } from '../Engine';
import type { SceneDef, Gfx, LayerState } from '../Engine';
import {
  AMBER, GOLD, EMBER, WARM_WHITE, VIOLET, INK,
  embers, stars, bokeh, spark, godRays, eye, eyeField, tendrils, ridge, text, typed, assemble, rule, gradientBg, pool,
} from '../Draw';
import { glowDisc, rgba } from '../Sprites';

const T_CUT1 = 9, T_CUT2 = 19, T_SPARK = 19.8, T_WARM = 21.5, T_TITLE = 26, T_END = 34;

// ---------------------------------------------------------------- draw helpers (scene-local)
const drawLid = (g: Gfx, L: LayerState) => {
  // shot 1: a closed lid — a violet hairline that breathes, slightly brighter at the centre
  const ctx = g.ctx; const t = g.t; const a = clamp01(span(t, 0.6, 3.5)) * L.alpha;
  const w = 1500, y = 0 + wobble(t * 0.7, 1) * 3;
  const gr = ctx.createLinearGradient(-w / 2, 0, w / 2, 0);
  gr.addColorStop(0, rgba(VIOLET, 0)); gr.addColorStop(0.5, rgba(VIOLET, 0.75 * a)); gr.addColorStop(1, rgba(VIOLET, 0));
  ctx.fillStyle = gr; ctx.fillRect(-w / 2, y - 1, w, 2);
  ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.12 * a;
  ctx.drawImage(glowDisc(VIOLET, 256), -w * 0.35, y - 90, w * 0.7, 180);
  ctx.globalAlpha = L.alpha; ctx.globalCompositeOperation = 'source-over';
};

const drawEye = (g: Gfx, _L: LayerState) => {
  const t = g.t;
  // aperture: cracks at 4 s, opens unevenly (hesitation = horror), wide in shot 3-4
  const open = t < T_CUT1
    ? lerp(0, 0.34, easeOut(span(t, 4.0, 6.5))) + 0.04 * Math.max(0, wobble(t * 3, 2)) * span(t, 4.5, 9)
    : lerp(0.34, 0.9, easeInOut(span(t, T_CUT1, 11)));
  // the Eye looks for us: drifts, then locks dead centre at 7 s (the moment it notices the camera)
  const lock = easeInOut(span(t, 6.6, 7.4));
  const look = { x: lerp(Math.sin(t * 0.9) * 0.5, 0, lock), y: lerp(Math.cos(t * 0.7) * 0.3, 0, lock) };
  eye(g, 0, 0, { r: 1000, open, look, pupil: t < 7 ? 0.22 : lerp(0.22, 0.08, span(t, 7, 7.6)), veins: 20, glow: 0.9 });
};

const drawEyeWall = (g: Gfx, L: LayerState) => {
  const t = g.t;
  const open = t < T_CUT1 ? span(t, 6, 9) * 0.55 : lerp(0.55, 1, span(t, 14, 17));
  eyeField(g, t < T_CUT1 ? 36 : 70, 41, 1500, open * L.alpha);
};

const drawRidgeDark = (g: Gfx, _L: LayerState) => {
  ridge(g, 260, 170, 7, '#040208', 3200, 64);
  ridge(g, 330, 90, 19, INK, 3200, 48);
};

const drawTendrils = (g: Gfx, _L: LayerState) => {
  const t = g.t; const reach = easeOut(span(t, T_CUT1, 13.5));
  // pour from the distant Eye (0, -140) down and out toward the camera; more of them wake in shot 4
  tendrils(g, 0, -140, 22, 1500, Math.PI / 2, 2.6, 3, reach);
  tendrils(g, 0, -140, 16, 1900, Math.PI / 2, 3.4, 9, easeOut(span(t, 14, 18)));
};

const drawDarkText = (g: Gfx, _L: LayerState) => {
  const t = g.t; const ctx = g.ctx;
  const W = g.hw; // responsive: keep text inside the visible width
  if (t >= 5 && t < T_CUT1) {
    const o = { size: Math.min(36, W * 0.07), font: 'body' as const, weight: 500, color: '#c4b5fd', tracking: 2, glow: VIOLET, glowBlur: 14 };
    const s = 'it was always here.';
    const p = span(t, 5, 7.6);
    ctx.globalAlpha = 1 - span(t, 8.6, T_CUT1);
    typed(g, s, -textW(g, s, o) / 2, 330, p, o, 1.2);
  }
  if (t >= 10 && t < 14.2) {
    const o = { size: Math.min(46, W * 0.07), font: 'tech' as const, weight: 700, color: '#ddd6fe', tracking: 6, glow: VIOLET, glowBlur: 18 };
    const s = 'THE DARKNESS DOES NOT HUNT.';
    ctx.globalAlpha = 1 - span(t, 13.6, 14.2);
    typed(g, s, -textW(g, s, o) / 2, 360, span(t, 10, 13), o, 1.6);
  }
  if (t >= 15.5 && t < T_CUT2) {
    const o = { size: Math.min(96, W * 0.17), font: 'tech' as const, weight: 900, color: '#ede9fe', tracking: 14, glow: VIOLET, glowBlur: 30 };
    const s = 'IT WAITS.';
    const jit = 2 + 6 * span(t, 17.2, T_CUT2);
    ctx.globalAlpha = 1;
    typed(g, s, -textW(g, s, o) / 2, 0, span(t, 15.6, 16.7), o, jit);
  }
  ctx.globalAlpha = 1;
};
const textW = (g: Gfx, s: string, o: Parameters<typeof text>[4]) => { // measure via Draw's font setter
  const ctx = g.ctx; ctx.font = `${o.weight ?? 700} ${o.size}px ${o.font === 'body' ? "'Rajdhani', sans-serif" : "'Orbitron', sans-serif"}`;
  let w = 0; for (let i = 0; i < s.length; i++) w += ctx.measureText(s[i]).width + (i < s.length - 1 ? (o.tracking ?? 0) : 0); return w;
};

const drawWarmBg = (g: Gfx, L: LayerState) => {
  // warm umber replaces the black: deep plum-brown sky → amber haze near the horizon → dark ground
  const ctx = g.ctx; ctx.globalAlpha = L.alpha;
  gradientBg(g, '#0a0608', '#3a1d0a', '#120a04', 0.62);
  pool(g, 0, 160, 900, EMBER, 0.35 * L.alpha);
  ctx.globalAlpha = L.alpha;
};

const drawWarmRidge = (g: Gfx, _L: LayerState) => {
  ridge(g, 250, 120, 23, '#1a0e06', 3400, 72);
  ridge(g, 320, 60, 29, '#0b0603', 3400, 40);
};

const drawSpark = (g: Gfx, L: LayerState) => {
  const t = g.t;
  const heat = lerp(0.35, 1, easeOut(span(t, T_WARM, 24)));
  spark(g, 0, 60, { r: 70 * L.scale, heat, flicker: t < T_WARM ? 0.3 : 0.08, rays: t >= T_WARM ? 14 : 0 });
};
const drawRays = (g: Gfx, L: LayerState) => {
  godRays(g, 0, 60, -Math.PI / 2, Math.PI * 1.1, 14, 1500, AMBER, 0.14 * L.alpha);
};
const drawEmbers = (g: Gfx, L: LayerState) => {
  embers(g, { n: 900, x: -1200, y: 420, w: 2400, h: 200, rise: 110, drift: 26, rMin: 1.2, rMax: 4.2, colors: [GOLD, EMBER, AMBER], life: 7, seed: 5, glow: 3 }, L.alpha);
  embers(g, { n: 260, x: -300, y: 60, w: 600, h: 60, rise: 180, drift: 40, rMin: 1, rMax: 3, colors: [WARM_WHITE, AMBER, GOLD], life: 3.5, seed: 77, glow: 4 }, L.alpha * span(g.t, T_WARM, 23));
};
const drawWarmLine = (g: Gfx, L: LayerState) => {
  const o = { size: Math.min(34, g.hw * 0.065), font: 'body' as const, weight: 500, color: '#fde9c4', tracking: 3, glow: AMBER, glowBlur: 16 };
  assemble(g, 'but something small refused.', 0, 390, span(g.t, 22.3, 24.4), { ...o, alpha: L.alpha * (1 - span(g.t, 30.5, 31.5)) }, 40, 0.05);
};
const drawTitle = (g: Gfx, _L: LayerState) => {
  const t = g.t; const ctx = g.ctx;
  const size = Math.min(200, g.hw * 0.36);
  const p = span(t, T_TITLE, 27.1);
  // breathing scale after the hit
  const br = 1 + Math.sin(t * 1.6) * 0.012 * span(t, 27.1, 28.5);
  ctx.save(); ctx.translate(0, -150); ctx.scale(br, br);
  assemble(g, 'LIGHT', 0, 0, p, { size, font: 'tech', weight: 900, color: WARM_WHITE, tracking: size * 0.06, glow: AMBER, glowBlur: 46 }, 90, 0.07);
  ctx.restore();
  const rw = easeOutExpo(span(t, 26.9, 28.2)) * Math.min(900, g.hw * 1.6);
  if (rw > 1) rule(g, 0, -150 + size * 0.62, rw, AMBER, 0.9);
  const sa = span(t, 27.4, 28.6);
  if (sa > 0) {
    const sub = Math.min(44, g.hw * 0.075);
    text(g, 'ROGUE VOID', 0, -150 + size * 0.62 + sub * 1.3, { size: sub, font: 'tech', weight: 600, color: '#d9b36a', tracking: lerp(sub * 0.2, sub * 0.75, easeOut(sa)), alpha: sa, glow: GOLD, glowBlur: 12 });
  }
};
const drawHint = (g: Gfx, L: LayerState) => {
  const a = L.alpha * (0.55 + 0.45 * Math.sin(g.t * 2.4));
  text(g, 'tap to begin', 0, 470, { size: 22, font: 'body', weight: 500, color: '#fde9c4', tracking: 6, alpha: a });
};
const drawVoidStars = (g: Gfx, L: LayerState) => { stars(g, 260, 3, 1400, '#9f8fd8', 0.35 * L.alpha); };
const drawWarmBokeh = (g: Gfx, L: LayerState) => { bokeh(g, 26, AMBER, 11, 1200, 0.12 * L.alpha); };

// ---------------------------------------------------------------- the scene
export const title_seam: SceneDef = {
  id: 'title_seam',
  duration: T_END,
  skipAfter: 0.6,
  bg: () => { /* black (engine default) */ },
  camera: {
    zoom: K(0, 1.0, 8.99, 1.24, easeIn, T_CUT1, 1.0, step, 18.99, 1.6, easeIn, T_CUT2, 1.0, step, T_WARM, 1.0, 25, 0.9, overshoot, 31, 0.95, easeInOut, T_END, 0.98),
    x: K(0, 0, T_CUT1, 0, 14, -150, easeInOut, 18.99, -150, T_CUT2, 0, step, T_END, 0),
    y: K(0, 0, T_CUT1, 0, 18.99, 60, easeIn, T_CUT2, 0, step, T_TITLE, 0, 31, -50, easeInOut, T_END, -50),
    focus: K(0, 0, 4, 0, 6.5, 1, easeInOut, T_CUT1, 1, 9.01, 1, step),
    shakes: [
      { t: T_CUT1, amp: 36, decay: 2.2, freq: 26 },
      { t: 15.5, amp: 16, decay: 4 },
      { t: 17.2, amp: 28, decay: 3 },
      { t: 18.4, amp: 40, decay: 1.6, dur: 0.6 },
      { t: T_TITLE, amp: 9, decay: 5, freq: 14 },
    ],
  },
  layers: [
    // ---- DARKNESS (shots 1–4) — everything ends at the hard cut T_CUT2
    { id: 'void_stars', from: T_CUT1, to: T_CUT2, parallax: 0.35, alpha: K(T_CUT1, 0, 10, 1), draw: drawVoidStars },
    { id: 'eye_wall', from: 6, to: T_CUT2, parallax: 0.7, depth: 0, alpha: K(6, 0, 9, 0.7, T_CUT1, 0.35, step, 14, 0.5, 17, 1), draw: drawEyeWall },
    { id: 'lid', from: 0, to: 4.2, parallax: 1, alpha: K(0, 1, 4, 1, 4.2, 0), draw: drawLid },
    // shots 1–2 the eye is 1000 px of radius (wider than the frame); shot 3 the same eye cut to a distant 220 px
    { id: 'eye', from: 3.9, to: T_CUT2, parallax: 1, depth: 1, scale: K(0, 1, 8.99, 1, T_CUT1, 0.22, step, T_CUT2, 0.22), y: K(0, 0, 8.99, 0, T_CUT1, -140, step), draw: drawEye },
    { id: 'tendrils', from: T_CUT1, to: T_CUT2, parallax: 1.1, draw: drawTendrils },
    { id: 'ridge_dark', from: T_CUT1, to: T_CUT2, parallax: 1.25, draw: drawRidgeDark },
    { id: 'dark_text', from: 5, to: T_CUT2, parallax: 0, draw: drawDarkText },
    // ---- LIGHT (shots 5–8)
    { id: 'warm_bg', from: T_WARM, parallax: 0.1, alpha: K(T_WARM, 0, 25, 1, easeInOut), draw: drawWarmBg },
    { id: 'warm_bokeh', from: 22, parallax: 0.5, alpha: K(22, 0, 25, 1), draw: drawWarmBokeh },
    { id: 'rays', from: T_WARM, parallax: 0.9, alpha: K(T_WARM, 0, 24.5, 1, easeOut), draw: drawRays },
    { id: 'warm_ridge', from: T_WARM, parallax: 1.2, alpha: K(T_WARM, 0, 24, 1), draw: drawWarmRidge },
    { id: 'spark', from: T_SPARK, parallax: 1, scale: K(T_SPARK, 0.02, 20.6, 0.12, easeOut, T_WARM, 0.14, 23.6, 1.0, overshoot, T_END, 1.0), draw: drawSpark },
    { id: 'embers', from: T_WARM, parallax: 1.1, alpha: K(T_WARM, 0, 24, 1), draw: drawEmbers },
    { id: 'warm_line', from: 22.3, to: 31.6, parallax: 0, draw: drawWarmLine },
    { id: 'title', from: T_TITLE, parallax: 0, draw: drawTitle },
    { id: 'hint', from: 31, parallax: 0, alpha: K(31, 0, 32, 1), draw: drawHint },
  ],
  post: {
    letterbox: K(0, 0.12, T_CUT2, 0.12, T_WARM, 0.12, T_TITLE, 0.07, easeInOut, T_END, 0.07),
    vignette: K(0, 0.95, T_CUT2, 0.95, T_WARM, 0.9, T_TITLE, 0.5, easeInOut),
    grain: K(0, 0.55, 14, 0.62, T_CUT2, 0.9, 19.01, 0.3, step, T_WARM, 0.3, T_TITLE, 0.12),
    aberration: K(0, 0, 3.9, 0, 4, 8, step, 6, 1.5, 8.99, 1.5, T_CUT1, 12, step, 11, 2, 15.4, 2, 15.5, 16, step, 16.3, 3, 17.1, 3, 17.2, 20, step, 18.2, 5, T_CUT2, 32, easeIn, 19.01, 0, step),
    invert: pulses([15.5, 17.2], 0.08),
    flash: K(0, 0, 21.4, 0, T_WARM, 0.5, step, 22.3, 0, easeOut),
    fade: K(0, 1, 1.2, 0, easeOut, 33, 0, T_END, 1, easeInOut),
    wash: K(0, -0.6, T_CUT2, -0.85, 19.01, 0, step, T_WARM, 0, 25, 0.6, T_END, 0.5),
  },
  cues: [
    { t: 0.2, sfx: 'ambush_ring', vol: 0.5 },
    { t: 4.0, sfx: 'boss_telegraph', vol: 0.7 },
    { t: 5.0, sfx: 'story_line', vol: 0.3 },
    { t: 7.0, sfx: 'boss_telegraph', vol: 0.45 },           // the Eye locks on
    { t: T_CUT1, sfx: 'boss_arrive', vol: 1 },
    { t: 10.0, sfx: 'story_line', vol: 0.3 },
    { t: 15.5, sfx: 'boss_phase', vol: 0.9 },
    { t: 17.2, sfx: 'boss_enrage', vol: 1 },
    { t: 18.4, sfx: 'arena_burn', vol: 0.7 },
    { t: 20.0, sfx: 'pickup_essence', vol: 0.6 },
    { t: T_WARM, sfx: 'burst_charge', vol: 0.8 },
    { t: 23.0, sfx: 'shrine_touch', vol: 0.7 },
    { t: 24.0, sfx: 'landmark_reveal', vol: 0.6 },
    { t: T_TITLE, sfx: 'chapter_card', vol: 1 },
    { t: 26.3, sfx: 'music_sting_reveal', vol: 0.9 },
    { t: 27.0, music: 'music_title' },
  ],
  shots: [
    { n: 1, from: 0, to: 4, what: 'Black + heavy grain; a violet hairline breathes at centre — a closed lid. Push-in accelerates.' },
    { n: 2, from: 4, to: 9, what: 'Lid cracks; the Eye (wider than the frame) opens unevenly, rack-focuses sharp, locks on the camera at 7 s; small eyes wake. "it was always here."' },
    { n: 3, from: 9, to: 14, what: 'HARD CUT to wide + shake: the Eye small on a black horizon, tendrils pour down over the ridge, camera pans left. "THE DARKNESS DOES NOT HUNT."' },
    { n: 4, from: 14, to: 19, what: 'Push-in into the tendrils; eye-wall at full; two inverted flash frames; grain/aberration peak. "IT WAITS."' },
    { n: 5, from: 19, to: 21.5, what: 'HARD CUT to true black. 0.8 s of nothing. One amber point appears. (the turn)' },
    { n: 6, from: 21.5, to: 26, what: 'The Spark ignites with an overshoot: bloom, god-rays, 1100 embers, warm umber sky replaces black, letterbox opens. "but something small refused."' },
    { n: 7, from: 26, to: 31, what: 'LIGHT slams in glyph by glyph, lit from below by the spark; hairline rule; ROGUE VOID tracks out. Music starts.' },
    { n: 8, from: 31, to: 34, what: 'Hold on the final image; "tap to begin" pulses; fade to black into the menu loop.' },
  ],
};
export default title_seam;
