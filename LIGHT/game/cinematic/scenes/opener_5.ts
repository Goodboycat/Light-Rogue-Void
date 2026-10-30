// (M2) SCENE `opener_5` — Void Wastes. Plays at wave 1 of chapter 5, gameplay hidden + paused. 13 s.
// The fifth place is the absence of a place: an indigo plane under no sky. Nothing to hide behind, nothing to
// hold. The Darkness is not *in* this place — the place is the Darkness with its clothes off, and it has eyes.
//
// STORYBOARD (written first, keyframes derived from it — MOVIE.md §1.4)
// shot | start–end s | framing             | camera move                          | what changes on screen                                                                                   | text                                                                          | audio id
// -----|-------------|---------------------|--------------------------------------|----------------------------------------------------------------------------------------------------------|-------------------------------------------------------------------------------|------------------
//  1   |  0.0– 2.6   | card                | static                               | black; CHAPTER V tracks out; VOID WASTES assembles; indigo rule grows                                     | CHAPTER V / VOID WASTES                                                       | chapter_card
//  2   |  2.6– 5.6   | wide, horizon dead  | slow pan RIGHT that finds nothing    | an indigo plane, a horizon that is barely a line, a perspective grid of hairline cracks, 1400 ash flakes falling slower than gravity; eleven stars, too few | —                                                          | landmark_reveal (soft)
//  3   |  5.6– 9.0   | wide → horizon      | push-in that never stops, rack focus | the stars go out one by one; along the horizon eyes open — 3, then 30, then the horizon itself is a lid and opens; the cracks bleed violet toward us; the ash stops falling and hangs | "Nothing grows here. Nothing is built here. This is what I am, undressed." | boss_telegraph, story_line
//  4   |  9.0–10.2   | black               | HARD CUT, hold                       | nothing; at 9.6 s one amber point on the plane                                                            | —                                                                             | pickup_essence
//  5   | 10.2–13.0   | wide, low           | gentle overshoot zoom-out            | the spark on the plane; its pool shows the ground is fine dust in ripples; the cracks near it fill amber; ash rises warm; the horizon is closed and far; letterbox opens; fade | "It is quieter than I thought. Lonelier."             | shrine_touch, story_line
// Structure: setup (1–2: there is nothing here) → escalation (3: nothing is looking) → turn (4) → payoff (5: a small light makes a small place).

import { K, step, easeIn, easeOut, easeInOut, span, lerp, hash, wobble, clamp01 } from '../Engine';
import type { SceneDef, Gfx, LayerState } from '../Engine';
import { AMBER, GOLD, EMBER, VIOLET, embers, eye, stars, gradientBg, pool, godRays, ridge } from '../Draw';
import { glowDisc, hazeBand, rgba } from '../Sprites';
import { STD, T_PLACE, T_DARK, T_TURN, T_LIGHT, T_END, chapterCard, darkLine, lightLine, turnSpark, openerPost, openerZoom, mix } from './openerKit';

const NAME = 'Void Wastes', COLOR = '#818cf8';
const INDIGO = '#818cf8', INDIGO2 = '#312e81', ASH = '#9ca3af', INK = '#030208', PLANE = '#0a0818', PLANE2 = '#130f2a';
const HORIZON = -40; // design y of the horizon line (camera is low)

// cold = how far the waste has woken (0 nothing, 1 everything is looking)
const cold = (t: number) => (t < T_TURN ? easeIn(span(t, T_DARK, T_TURN - 0.4)) : 0);
// hang = the ash stops falling (0 falling, 1 hanging still) — the air itself holds its breath
const hang = (t: number) => easeInOut(span(t, T_DARK + 1.2, T_DARK + 2.4));

/** Perspective grid of hairline cracks on the plane: converging lines + depth rows (one stroke per colour). `bleed` lights them violet. */
const drawPlane = (g: Gfx, L: LayerState) => {
  const ctx = g.ctx; const t = g.t; const c = cold(t);
  ctx.globalAlpha = L.alpha;
  gradientBg(g, mix(INK, '#02010a', c), mix('#07051a', '#06031a', c), mix(PLANE2, '#0b0620', c), 0.42);
  // plane below the horizon
  ctx.fillStyle = mix(PLANE, '#050312', c); ctx.fillRect(-2600, HORIZON, 5200, 1400);
  // converging cracks — jittered so they read as cracks not a grid
  const vx = 180, vy = HORIZON;
  ctx.strokeStyle = rgba(mix('#1e1b4b', VIOLET, c * 0.8), lerp(0.35, 0.8, c)); ctx.lineWidth = 1.2; ctx.beginPath();
  for (let i = 0; i < 26; i++) {
    const h0 = hash(i, 501), h1 = hash(i, 502);
    const x1 = -3400 + h0 * 6800, y1 = 1100;
    const mx = lerp(vx, x1, 0.45) + (h1 - 0.5) * 120, my = lerp(vy, y1, 0.45);
    ctx.moveTo(vx + (h1 - 0.5) * 30, vy + 2); ctx.lineTo(mx, my); ctx.lineTo(x1, y1);
  }
  // depth rows: closer rows further apart (perspective), each slightly broken
  for (let r = 0; r < 14; r++) {
    const u = (r + 1) / 14; const y = HORIZON + 6 + u * u * 1000;
    const segs = 9;
    for (let s = 0; s < segs; s++) {
      const x0 = -2600 + (s / segs) * 5200, x1 = x0 + 5200 / segs;
      const gap = hash(r * 9 + s, 507) > 0.72 ? 0.3 : 0.08;
      ctx.moveTo(x0 + (x1 - x0) * gap, y + (hash(r * 9 + s, 509) - 0.5) * 14 * u); ctx.lineTo(x1 - (x1 - x0) * gap, y + (hash(r * 9 + s + 1, 509) - 0.5) * 14 * u);
    }
  }
  ctx.stroke();
  if (c > 0.01) {
    // the cracks bleed: a violet glow creeps from the horizon toward the camera
    ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = L.alpha * c * 0.35;
    ctx.drawImage(hazeBand(VIOLET, 64, 512), -2600, HORIZON - 40, 5200, lerp(120, 900, c));
    ctx.globalAlpha = L.alpha; ctx.globalCompositeOperation = 'source-over';
  }
};
const drawHorizon = (g: Gfx, L: LayerState) => {
  // the horizon is a line that is barely there; in shot 3 it is a lid — it thickens, then opens as a vast eye
  const ctx = g.ctx; const t = g.t; const c = cold(t);
  const lidOpen = easeOut(span(t, T_DARK + 2.0, T_DARK + 3.1));
  ctx.globalAlpha = L.alpha;
  ctx.strokeStyle = rgba(mix(INDIGO2, VIOLET, c), lerp(0.5, 0.9, c)); ctx.lineWidth = lerp(1.5, 5, c); ctx.beginPath(); ctx.moveTo(-2600, HORIZON); ctx.lineTo(2600, HORIZON); ctx.stroke();
  if (lidOpen > 0) {
    const lock = easeInOut(span(t, T_DARK + 2.8, T_DARK + 3.3));
    eye(g, 180, HORIZON, { r: 1500, open: lidOpen * 0.22 + 0.01 * wobble(t * 2.5, 11), look: { x: lerp(0.5, 0, lock), y: lerp(0.2, 0.05, lock) }, pupil: lerp(0.16, 0.05, lock), veins: 14, glow: 1.1 });
  }
};
const drawStars = (g: Gfx, L: LayerState) => {
  // eleven stars, too few. In shot 3 they go out one by one (each has its own death time).
  const ctx = g.ctx; const t = g.t; ctx.globalAlpha = L.alpha;
  ctx.fillStyle = '#e5e7eb'; ctx.beginPath();
  for (let i = 0; i < 11; i++) {
    const h0 = hash(i, 521), h1 = hash(i, 522), h2 = hash(i, 523);
    const die = T_DARK + 0.2 + h2 * 2.6;
    const alive = t < die ? 1 : 0; if (!alive) continue;
    const tw = 0.6 + 0.4 * Math.sin(t * (1 + h2) + i);
    const x = (h0 - 0.5) * 3600, y = HORIZON - 120 - h1 * 760, r = (1 + h2 * 1.4) * tw;
    ctx.moveTo(x + r, y); ctx.arc(x, y, r, 0, Math.PI * 2);
  }
  ctx.fill();
};
const drawAsh = (g: Gfx, L: LayerState) => {
  // 1400 ash flakes fall slower than gravity; when the waste wakes they stop and hang (rise → 0, drift → 0)
  const h = hang(g.t); const c = cold(g.t);
  // freeze time for the hanging flakes: blend between live time and the frozen moment
  const tf = lerp(g.ta, T_DARK + 2.4 + (g.ta - g.t), h);
  embers(g, { n: 1000, x: -2600, y: -900, w: 5200, h: 1900, rise: -9, drift: 6, rMin: 0.7, rMax: 2.2, colors: [ASH, '#6b7280', '#a5b4fc'], life: 16, seed: 531, glow: 0 }, L.alpha * lerp(0.5, 0.75, c), tf);
  embers(g, { n: 400, x: -1400, y: -500, w: 2800, h: 1500, rise: -16, drift: 10, rMin: 1.6, rMax: 3.4, colors: ['#d1d5db', ASH, '#c7d2fe'], life: 12, seed: 537, glow: 1.2 }, L.alpha * lerp(0.35, 0.6, c), tf);
};
const drawFarEyes = (g: Gfx, L: LayerState) => {
  // eyes along the horizon: 3 open first (far, small), then thirty, each with its own open time; they all look at us
  const t = g.t; const c = cold(t); if (c <= 0) return;
  const ctx = g.ctx; ctx.globalAlpha = L.alpha;
  for (let i = 0; i < 34; i++) {
    const h0 = hash(i, 541), h1 = hash(i, 542), h2 = hash(i, 543);
    const at = i < 3 ? T_DARK + 0.5 + i * 0.35 : T_DARK + 1.3 + h2 * 1.6;
    const op = easeOut(span(t, at, at + 0.5)); if (op <= 0) continue;
    const x = (h0 - 0.5) * 4200, y = HORIZON - 6 - h1 * 40;
    const r = 12 + h1 * 34;
    eye(g, x, y, { r, open: op * (0.5 + 0.5 * clamp01(Math.sin(t * (0.6 + h2) + i * 2.1) * 4 + 0.5)), look: { x: clamp01(-x / 2100) * 0.8 - 0.4 * Math.sign(x) * 0.5, y: 0.15 }, pupil: 0.1, veins: 0, glow: 0.7 });
  }
};
const drawColdWash = (g: Gfx, L: LayerState) => {
  const ctx = g.ctx; const c = cold(g.t); if (c <= 0) return;
  const H = g.hh * 2 + 4, W = g.hw * 2 + 4;
  const gr = ctx.createLinearGradient(0, -H / 2, 0, H / 2);
  gr.addColorStop(0, rgba('#000000', 0.55 * c)); gr.addColorStop(0.5, rgba('#0b0618', 0.2 * c)); gr.addColorStop(1, rgba(INDIGO2, 0.25 * c));
  ctx.globalAlpha = L.alpha; ctx.fillStyle = gr; ctx.fillRect(-W / 2, -H / 2, W, H);
};
const drawCard = (g: Gfx, L: LayerState) => chapterCard(g, L, 5, NAME, COLOR);
const drawDark = (g: Gfx, L: LayerState) => darkLine(g, L, 'Nothing grows here. Nothing is built here. This is what I am, undressed.', 340, T_DARK + 0.4, 2.7);
const drawLight = (g: Gfx, L: LayerState) => lightLine(g, L, 'It is quieter than I thought. Lonelier.');

// payoff: the spark on the plane
const SX = -60, SY = 430;
const drawPlaneWarm = (g: Gfx, L: LayerState) => {
  // the same plane, but the pool of light shows it is dust in ripples; the nearby cracks fill with amber
  const ctx = g.ctx; const t = g.t; const a = L.alpha * span(t, T_LIGHT, T_LIGHT + 1.3);
  ctx.globalAlpha = L.alpha;
  gradientBg(g, INK, '#07051a', PLANE2, 0.42);
  ctx.fillStyle = PLANE; ctx.fillRect(-2600, HORIZON, 5200, 1400);
  ctx.strokeStyle = rgba(INDIGO2, 0.55); ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(-2600, HORIZON); ctx.lineTo(2600, HORIZON); ctx.stroke();
  // dust ripples: concentric arcs around the spark, lit on the spark side
  ctx.strokeStyle = rgba(AMBER, 0.28 * a); ctx.lineWidth = 2; ctx.beginPath();
  for (let r = 0; r < 9; r++) {
    const rr = 90 + r * 95 + wobble(r, 561) * 12;
    ctx.save(); ctx.translate(SX, SY + 40); ctx.scale(1, 0.32); ctx.moveTo(rr, 0); ctx.arc(0, 0, rr, -0.2 - r * 0.1, Math.PI + 0.2 + r * 0.1, false); ctx.restore();
  }
  ctx.stroke();
  // amber in the near cracks
  ctx.strokeStyle = rgba(GOLD, 0.5 * a); ctx.lineWidth = 2; ctx.beginPath();
  for (let i = 0; i < 9; i++) {
    const h0 = hash(i, 571), h1 = hash(i, 572);
    const ang = h0 * Math.PI * 2, len = 160 + h1 * 420;
    const x0 = SX + Math.cos(ang) * 60, y0 = SY + 40 + Math.sin(ang) * 20;
    const x1 = x0 + Math.cos(ang) * len, y1 = y0 + Math.sin(ang) * len * 0.34;
    ctx.moveTo(x0, y0); ctx.lineTo(lerp(x0, x1, 0.5) + (h1 - 0.5) * 50, lerp(y0, y1, 0.5)); ctx.lineTo(x1, y1);
  }
  ctx.stroke();
  // the ridge of dust the spark sits on (a low dune)
  ridge(g, SY + 60, 50, 577, '#0d0a1f', 2600, 40);
};
const drawSpark = (g: Gfx, L: LayerState) => turnSpark(g, L, SX, SY, 46);
const drawWarmPool = (g: Gfx, L: LayerState) => {
  const a = L.alpha * span(g.t, T_LIGHT, T_LIGHT + 1.4);
  pool(g, SX, SY + 20, 620, EMBER, 0.38 * a);
  godRays(g, SX, SY, -Math.PI / 2, Math.PI * 1.5, 12, 1100, AMBER, 0.08 * a);
  g.ctx.globalCompositeOperation = 'lighter'; g.ctx.globalAlpha = 0.14 * a;
  g.ctx.drawImage(glowDisc(GOLD, 256), -900, 280, 1800, 380);
  g.ctx.globalAlpha = L.alpha; g.ctx.globalCompositeOperation = 'source-over';
};
const drawWarmAsh = (g: Gfx, L: LayerState) => {
  // the ash near the spark rises, warm — the rest keeps falling, cold and far
  const a = L.alpha * span(g.t, T_LIGHT, T_LIGHT + 1.4);
  embers(g, { n: 700, x: -2600, y: -900, w: 5200, h: 1900, rise: -9, drift: 6, rMin: 0.7, rMax: 2, colors: [ASH, '#6b7280', '#a5b4fc'], life: 16, seed: 531, glow: 0 }, L.alpha * 0.35, g.ta);
  embers(g, { n: 240, x: SX - 600, y: SY - 560, w: 1200, h: 620, rise: 30, drift: 12, rMin: 1.4, rMax: 3.6, colors: [AMBER, GOLD, '#fde9c4'], life: 6, seed: 581, glow: 2.4 }, a, g.ta);
};
const drawFarStarsWarm = (g: Gfx, L: LayerState) => { g.ctx.globalAlpha = L.alpha * 0.6 * span(g.t, T_LIGHT + 0.6, T_LIGHT + 2); stars(g, 40, 591, 1900, '#e5e7eb', 0.7); g.ctx.globalAlpha = L.alpha; };

export const opener_5: SceneDef = {
  id: 'opener_5',
  duration: T_END,
  skipAfter: 0.6,
  camera: {
    zoom: openerZoom(STD, 1.26, 0.95),
    // shot 2 pans RIGHT looking for something and finds nothing; shot 3 pushes toward the horizon eye at x=180
    x: K(0, 0, T_PLACE, -380, T_DARK, 140, easeInOut, T_TURN - 0.01, 180, easeIn, T_TURN, 0, step, T_LIGHT, -40, T_END, -70, easeInOut),
    y: K(0, 0, T_PLACE, 40, T_DARK, 20, easeInOut, T_TURN - 0.01, -60, easeIn, T_TURN, 0, step, T_LIGHT, 140, T_END, 110, easeInOut),
    rot: K(0, 0, T_DARK, 0, T_TURN - 0.01, -0.03, easeIn, T_TURN, 0, step),
    focus: K(0, 0.3, T_DARK, 0.3, T_DARK + 1.8, 1, easeInOut, T_TURN, 1, T_TURN + 0.01, 0, step),
    shakes: [{ t: T_DARK + 2.0, amp: 5, decay: 2.5, freq: 9 }, { t: T_DARK + 3.0, amp: 3, decay: 4, freq: 30 }, { t: T_TURN, amp: 12, decay: 4, freq: 20 }],
  },
  layers: [
    { id: 'card', from: 0, to: T_PLACE, parallax: 0, draw: drawCard },
    // the place (shots 2–3)
    { id: 'plane', from: T_PLACE, to: T_TURN, parallax: 0.2, alpha: K(T_PLACE, 0, T_PLACE + 0.8, 1, easeOut), draw: drawPlane },
    { id: 'stars', from: T_PLACE, to: T_TURN, parallax: 0.1, depth: 1, draw: drawStars },
    { id: 'horizon', from: T_PLACE, to: T_TURN, parallax: 0.3, depth: 1, draw: drawHorizon },
    { id: 'eyes', from: T_DARK, to: T_TURN, parallax: 0.3, depth: 1, draw: drawFarEyes },
    { id: 'ash', from: T_PLACE, to: T_TURN, parallax: 0.9, depth: 0.2, alpha: K(T_PLACE, 0, T_PLACE + 1, 1), draw: drawAsh },
    { id: 'cold', from: T_DARK, to: T_TURN, parallax: 0, draw: drawColdWash },
    { id: 'dark_text', from: T_DARK, to: T_TURN, parallax: 0, draw: drawDark },
    // the turn + payoff (shots 4–5)
    { id: 'plane2', from: T_LIGHT, parallax: 0.2, alpha: K(T_LIGHT, 0, T_LIGHT + 1.2, 1, easeOut), draw: drawPlaneWarm },
    { id: 'stars2', from: T_LIGHT, parallax: 0.1, draw: drawFarStarsWarm },
    { id: 'pool', from: T_LIGHT, parallax: 1, draw: drawWarmPool },
    { id: 'spark', from: T_TURN + 0.6, parallax: 1, draw: drawSpark },
    { id: 'ash2', from: T_LIGHT, parallax: 0.9, draw: drawWarmAsh },
    { id: 'light_text', from: T_LIGHT, parallax: 0, draw: drawLight },
  ],
  post: {
    ...openerPost(0.7),
    // the aberration does not spike here — it *creeps*, like everything in the waste; one spike when the horizon opens
    aberration: K(0, 0, T_DARK, 0, T_DARK + 2.0, 3, easeIn, T_DARK + 2.01, 12, step, T_DARK + 2.5, 4, T_TURN - 0.01, 14, easeIn, T_TURN, 0, step),
    invert: K(0, 0, T_DARK + 2.0, 0, T_DARK + 2.01, 1, step, T_DARK + 2.05, 0, step),
  },
  cues: [
    { t: 0.1, sfx: 'chapter_card', vol: 0.9 },
    { t: T_PLACE + 0.3, sfx: 'landmark_reveal', vol: 0.25 },
    { t: T_DARK, sfx: 'boss_telegraph', vol: 0.45 },
    { t: T_DARK + 0.4, sfx: 'story_line', vol: 0.3 },
    { t: T_DARK + 1.3, sfx: 'meteor_warn', vol: 0.3 },             // the thirty open
    { t: T_DARK + 2.0, sfx: 'boss_phase', vol: 0.5 },               // the horizon is a lid
    { t: T_DARK + 2.8, sfx: 'ambush_ring', vol: 0.4 },              // it finds us
    { t: T_TURN, sfx: 'boss_arrive', vol: 0.45 },
    { t: T_TURN + 0.6, sfx: 'pickup_essence', vol: 0.6 },
    { t: T_LIGHT + 0.2, sfx: 'shrine_touch', vol: 0.65 },
    { t: T_LIGHT + 0.5, sfx: 'story_line', vol: 0.3 },
  ],
  shots: [
    { n: 1, from: 0, to: T_PLACE, what: 'Card on black: CHAPTER V tracks out, VOID WASTES assembles, indigo rule grows.' },
    { n: 2, from: T_PLACE, to: T_DARK, what: 'Wide, low, a slow pan right that finds nothing: an indigo plane, a horizon that is barely a line, a perspective grid of hairline cracks, 1400 ash flakes falling slower than gravity, eleven stars. Setup — there is nothing here.' },
    { n: 3, from: T_DARK, to: T_TURN, what: 'Push-in that never stops with rack focus to the horizon: the stars go out one by one, three eyes open on the horizon, then thirty, then the horizon itself is a lid and opens into one vast eye that finds the camera; the cracks bleed violet toward us; the ash stops falling and hangs. "Nothing grows here. Nothing is built here. This is what I am, undressed."' },
    { n: 4, from: T_TURN, to: T_LIGHT, what: 'HARD CUT to black. 0.6 s of nothing, then one amber point on the plane. The turn.' },
    { n: 5, from: T_LIGHT, to: T_END, what: 'Gentle overshoot out: the spark on the plane; its pool shows the ground is dust in ripples, the near cracks fill amber, ash rises warm around it while the rest keeps falling far and cold; forty stars come back faint; letterbox opens. "It is quieter than I thought. Lonelier." Fade.' },
  ],
};
export default opener_5;
