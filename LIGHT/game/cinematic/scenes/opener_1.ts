// (M1) SCENE `opener_1` — Origin Fields. Plays at wave 1 (after the intro), gameplay hidden + paused. 13 s.
// The first place: warm plains of dust under a low sun-less sky. The Darkness notices us for the first time.
//
// STORYBOARD (written first, keyframes derived from it — MOVIE.md §1.4)
// shot | start–end s | framing          | camera move                      | what changes on screen                                                    | text                                        | audio id
// -----|-------------|------------------|----------------------------------|---------------------------------------------------------------------------|---------------------------------------------|------------------
//  1   |  0.0– 2.6   | card             | static                           | black; CHAPTER I tracks out; ORIGIN FIELDS assembles; amber rule grows     | CHAPTER I / ORIGIN FIELDS                   | chapter_card
//  2   |  2.6– 5.6   | wide             | slow pan right, breathing zoom   | umber plains, three dust ridges, 1400 dust motes drift, haze on the horizon | —                                           | landmark_reveal (soft)
//  3   |  5.6– 9.0   | wide → close     | push-in that never stops + tilt  | sky goes cold; a violet lid-line opens in the haze; motes stop rising and fall | "Silence. Perfect silence. And then... you." | boss_telegraph, story_line
//  4   |  9.0–10.2   | black            | HARD CUT, hold                   | nothing; at 9.6 s one amber point low in frame                            | —                                           | pickup_essence
//  5   | 10.2–13.0   | wide             | gentle overshoot zoom-out        | the spark on the dust; warm pool; motes rise again; letterbox opens; fade  | "I am small. But I am warm."                | shrine_touch, story_line
// Structure: setup (1–2) → escalation (3) → turn (4) → payoff (5).

import { K, step, easeIn, easeOut, easeInOut, span, lerp, wobble } from '../Engine';
import type { SceneDef, Gfx, LayerState } from '../Engine';
import { AMBER, GOLD, EMBER, VIOLET, embers, bokeh, eye, ridge, gradientBg, pool, godRays } from '../Draw';
import { glowDisc, hazeBand, rgba } from '../Sprites';
import { T_PLACE, T_DARK, T_TURN, T_LIGHT, T_END, chapterCard, darkLine, lightLine, turnSpark, openerPost, openerZoom } from './openerKit';

const NAME = 'Origin Fields', COLOR = '#fde68a';
const DUST = '#c9a06a', DUST2 = '#8a6238';

// cold = how far the Darkness has drained the place (0 warm, 1 cold) — drives sky, motes, haze
const cold = (t: number) => (t < T_TURN ? easeIn(span(t, T_DARK, T_TURN - 0.4)) : 0);

const drawSky = (g: Gfx, L: LayerState) => {
  const t = g.t; const c = cold(t); const ctx = g.ctx;
  ctx.globalAlpha = L.alpha;
  // warm: plum-brown → dusty amber haze → dark ground. cold: ink → violet-grey → black
  gradientBg(g, c < 0.5 ? '#160c0a' : '#07040c', mix('#4a2a12', '#1a1230', c), mix('#1a1008', '#06030a', c), 0.58);
  // sun-less glow on the horizon (the memory of a sun) — dies as it goes cold
  pool(g, 420, 120, 1100, EMBER, 0.22 * (1 - c) * L.alpha);
  pool(g, -300, 150, 700, GOLD, 0.1 * (1 - c) * L.alpha);
  ctx.globalAlpha = L.alpha;
};
const drawHaze = (g: Gfx, L: LayerState) => {
  // a band of dust haze lying on the horizon; pre-rendered gradient strip, stretched
  const ctx = g.ctx; const c = cold(g.t);
  ctx.globalAlpha = L.alpha * 0.55; ctx.globalCompositeOperation = 'lighter';
  ctx.drawImage(hazeBand(mix(DUST, VIOLET, c), 64, 512), -2000, -60, 4000, 320);
  ctx.globalAlpha = L.alpha; ctx.globalCompositeOperation = 'source-over';
};
const drawFarRidges = (g: Gfx, _L: LayerState) => {
  const c = cold(g.t);
  ridge(g, 190, 60, 101, mix('#2b1a0e', '#0d0817', c), 4200, 56);
  ridge(g, 240, 48, 113, mix('#1c1109', '#090512', c), 4200, 44);
};
const drawNearRidge = (g: Gfx, _L: LayerState) => {
  const c = cold(g.t);
  ridge(g, 330, 70, 127, mix('#120b05', '#040208', c), 4400, 60);
};
const drawMotes = (g: Gfx, L: LayerState) => {
  // 1400 dust motes drifting right across the plains; when the Darkness speaks they stop rising and fall
  const t = g.t; const c = cold(t);
  const rise = lerp(26, -60, c);
  embers(g, { n: 1100, x: -2000, y: -200, w: 4000, h: 620, rise, drift: 90, rMin: 1, rMax: 2.6, colors: [DUST, '#e7c58f', DUST2], life: 9, seed: 31, glow: 0 }, L.alpha * lerp(0.9, 0.45, c), g.ta);
  embers(g, { n: 300, x: -1200, y: 200, w: 2400, h: 200, rise: lerp(40, -30, c), drift: 60, rMin: 2, rMax: 4.5, colors: [AMBER, GOLD, DUST], life: 6, seed: 37, glow: 2.5 }, L.alpha * (1 - c * 0.8), g.ta);
};
const drawBokeh = (g: Gfx, L: LayerState) => { bokeh(g, 22, AMBER, 13, 1300, 0.1 * L.alpha * (1 - cold(g.t))); };

const drawLid = (g: Gfx, L: LayerState) => {
  // the Darkness notices: a violet lid-line opens in the haze above the horizon, then an iris finds us
  const t = g.t; const a = L.alpha * span(t, T_DARK + 0.3, T_DARK + 1.4);
  if (a <= 0) return;
  const open = lerp(0, 0.42, easeOut(span(t, T_DARK + 1.2, T_DARK + 2.6))) + 0.03 * Math.max(0, wobble(t * 3, 4));
  const lock = easeInOut(span(t, T_DARK + 2.2, T_DARK + 2.8));
  g.ctx.globalAlpha = a;
  eye(g, 120, -120, { r: 520, open, look: { x: lerp(-0.4, 0, lock), y: lerp(0.3, 0.1, lock) }, pupil: lerp(0.2, 0.09, lock), veins: 10, glow: 0.7 });
  g.ctx.globalAlpha = 1;
};
const drawColdWash = (g: Gfx, L: LayerState) => {
  // the plains drain of colour: a violet-black veil comes down from the top of the frame
  const ctx = g.ctx; const c = cold(g.t); if (c <= 0) return;
  const H = g.hh * 2 + 4, W = g.hw * 2 + 4;
  const gr = ctx.createLinearGradient(0, -H / 2, 0, H / 2);
  gr.addColorStop(0, rgba('#120a28', 0.85 * c)); gr.addColorStop(0.5, rgba('#0b0618', 0.55 * c)); gr.addColorStop(1, rgba('#000000', 0.3 * c));
  ctx.globalAlpha = L.alpha; ctx.fillStyle = gr; ctx.fillRect(-W / 2, -H / 2, W, H);
};
const drawCard = (g: Gfx, L: LayerState) => chapterCard(g, L, 1, NAME, COLOR);
const drawDark = (g: Gfx, L: LayerState) => darkLine(g, L, 'Silence. Perfect silence. And then... you.');
const drawLight = (g: Gfx, L: LayerState) => lightLine(g, L, 'I am small. But I am warm.');
const drawSpark = (g: Gfx, L: LayerState) => turnSpark(g, L, -60, 250, 44);
const drawWarmPool = (g: Gfx, L: LayerState) => {
  const a = L.alpha * span(g.t, T_LIGHT, T_LIGHT + 1.4);
  pool(g, -60, 250, 520, EMBER, 0.4 * a);
  godRays(g, -60, 250, -Math.PI / 2, Math.PI * 1.2, 10, 900, AMBER, 0.1 * a);
  // the spark lights the dust ridge from below: a warm rim on the near ridge
  g.ctx.globalCompositeOperation = 'lighter'; g.ctx.globalAlpha = 0.18 * a;
  g.ctx.drawImage(glowDisc(GOLD, 256), -700, 150, 1300, 260);
  g.ctx.globalAlpha = L.alpha; g.ctx.globalCompositeOperation = 'source-over';
};

/** cheap hex mix (both '#rrggbb') — only used per frame for a handful of fill colours */
function mix(a: string, b: string, u: number): string {
  if (u <= 0) return a; if (u >= 1) return b;
  const pa = parseInt(a.slice(1), 16), pb = parseInt(b.slice(1), 16);
  const r = Math.round(((pa >> 16) & 255) + (((pb >> 16) & 255) - ((pa >> 16) & 255)) * u);
  const gg = Math.round(((pa >> 8) & 255) + (((pb >> 8) & 255) - ((pa >> 8) & 255)) * u);
  const bb = Math.round((pa & 255) + ((pb & 255) - (pa & 255)) * u);
  return `rgb(${r},${gg},${bb})`;
}

export const opener_1: SceneDef = {
  id: 'opener_1',
  duration: T_END,
  skipAfter: 0.6,
  camera: {
    zoom: openerZoom(),
    x: K(0, 0, T_PLACE, -120, T_DARK, 60, easeInOut, T_TURN - 0.01, 110, easeIn, T_TURN, 0, step, T_END, 0),
    y: K(0, 0, T_PLACE, 20, T_DARK, 0, easeInOut, T_TURN - 0.01, -90, easeIn, T_TURN, 40, step, T_LIGHT, 40, T_END, 10, easeInOut),
    rot: K(0, 0, T_DARK, 0, T_TURN - 0.01, -0.03, easeIn, T_TURN, 0, step),
    shakes: [{ t: T_DARK + 2.6, amp: 6, decay: 3, freq: 18 }, { t: T_TURN, amp: 14, decay: 4, freq: 22 }],
  },
  layers: [
    { id: 'card', from: 0, to: T_PLACE, parallax: 0, draw: drawCard },
    // the place (shots 2–3)
    { id: 'sky', from: T_PLACE, to: T_TURN, parallax: 0.05, alpha: K(T_PLACE, 0, T_PLACE + 0.6, 1, easeOut), draw: drawSky },
    { id: 'bokeh', from: T_PLACE, to: T_TURN, parallax: 0.4, draw: drawBokeh },
    { id: 'far', from: T_PLACE, to: T_TURN, parallax: 0.45, depth: 1, draw: drawFarRidges },
    { id: 'haze', from: T_PLACE, to: T_TURN, parallax: 0.55, draw: drawHaze },
    { id: 'lid', from: T_DARK, to: T_TURN, parallax: 0.5, depth: 1, draw: drawLid },
    { id: 'cold', from: T_DARK, to: T_TURN, parallax: 0, draw: drawColdWash },
    { id: 'near', from: T_PLACE, to: T_TURN, parallax: 1.15, depth: 0, draw: drawNearRidge },
    { id: 'motes', from: T_PLACE, to: T_TURN, parallax: 1, alpha: K(T_PLACE, 0, T_PLACE + 1, 1), draw: drawMotes },
    { id: 'dark_text', from: T_DARK, to: T_TURN, parallax: 0, draw: drawDark },
    // the turn + payoff (shots 4–5): the same place, warm again, seen from the ground
    { id: 'sky2', from: T_LIGHT, parallax: 0.05, alpha: K(T_LIGHT, 0, T_LIGHT + 1.2, 1, easeOut), draw: drawSky },
    { id: 'far2', from: T_LIGHT, parallax: 0.45, alpha: K(T_LIGHT, 0, T_LIGHT + 1.2, 1), draw: drawFarRidges },
    { id: 'haze2', from: T_LIGHT, parallax: 0.55, alpha: K(T_LIGHT, 0, T_LIGHT + 1.2, 1), draw: drawHaze },
    { id: 'pool', from: T_LIGHT, parallax: 1, draw: drawWarmPool },
    { id: 'near2', from: T_LIGHT, parallax: 1.15, alpha: K(T_LIGHT, 0, T_LIGHT + 1.2, 1), draw: drawNearRidge },
    { id: 'spark', from: T_TURN + 0.6, parallax: 1, draw: drawSpark },
    { id: 'motes2', from: T_LIGHT, parallax: 1, alpha: K(T_LIGHT, 0, T_LIGHT + 1.5, 1), draw: drawMotes },
    { id: 'light_text', from: T_LIGHT, parallax: 0, draw: drawLight },
  ],
  post: {
    ...openerPost(0.55),
    aberration: K(0, 0, T_DARK, 0, T_DARK + 0.01, 6, step, T_DARK + 0.5, 1, T_DARK + 2.6, 2, T_DARK + 2.61, 10, step, T_DARK + 3.1, 2, T_TURN - 0.01, 14, easeIn, T_TURN, 0, step),
  },
  cues: [
    { t: 0.1, sfx: 'chapter_card', vol: 0.9 },
    { t: T_PLACE + 0.2, sfx: 'landmark_reveal', vol: 0.35 },
    { t: T_DARK, sfx: 'boss_telegraph', vol: 0.55 },
    { t: T_DARK + 0.4, sfx: 'story_line', vol: 0.3 },
    { t: T_DARK + 2.6, sfx: 'ambush_ring', vol: 0.4 },      // the Eye locks on
    { t: T_TURN, sfx: 'boss_arrive', vol: 0.5 },
    { t: T_TURN + 0.6, sfx: 'pickup_essence', vol: 0.6 },
    { t: T_LIGHT + 0.2, sfx: 'shrine_touch', vol: 0.7 },
    { t: T_LIGHT + 0.5, sfx: 'story_line', vol: 0.3 },
  ],
  shots: [
    { n: 1, from: 0, to: T_PLACE, what: 'Card on black: CHAPTER I tracks out, ORIGIN FIELDS assembles glyph by glyph, amber rule grows. The typography is the first shot.' },
    { n: 2, from: T_PLACE, to: T_DARK, what: 'Wide, slow pan right: umber plains, three dust ridges in parallax, 1400 motes drift, haze on a sun-less horizon. Setup — the place is warm.' },
    { n: 3, from: T_DARK, to: T_TURN, what: 'Push-in that never stops + slight tilt: the sky drains to violet, a lid opens in the haze and an iris finds the camera; motes stop rising and fall. "Silence. Perfect silence. And then... you."' },
    { n: 4, from: T_TURN, to: T_LIGHT, what: 'HARD CUT to black with a thud. 0.6 s of nothing, then one amber point low in the frame. The turn.' },
    { n: 5, from: T_LIGHT, to: T_END, what: 'Gentle overshoot out: the spark sits on the dust, a warm pool lights the near ridge from below, motes rise again, letterbox opens. "I am small. But I am warm." Fade.' },
  ],
};
export default opener_1;
