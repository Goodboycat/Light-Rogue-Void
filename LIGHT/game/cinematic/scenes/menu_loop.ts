// (M0) SCENE `menu_loop` — lives behind the main menu forever. 24 s seamless loop. Not skippable (the menu UI sits on top).
// Tone: LIGHT holds the frame (warm, breathing, hopeful) but the Darkness is *present* at the edges: every loop the
// Eye half-opens in the sky once, looks at the spark, and closes. The player should feel watched while feeling safe.
//
// STORYBOARD (loop; `ta` absolute time drives embers so the seam is invisible)
// shot | start–end s | framing | camera move                     | what changes on screen                                               | text | audio id
// -----|-------------|---------|---------------------------------|----------------------------------------------------------------------|------|---------
//  1   |  0–8        | wide    | slow breathing zoom 1.00→1.03   | warm umber sky, spark on the ridge, embers, rays slowly rotate       | —    | —
//  2   |  8–14       | wide    | pan up 0→−40, rack focus to sky | the sky darkens in a band; a violet lid-line appears above the spark | —    | —
//  3   | 14–18       | wide    | hold, tiny shake at 14.5        | the Eye half-opens, pupil finds the spark; stars dim; embers slow    | —    | boss_telegraph (soft)
//  4   | 18–24       | wide    | pan back down, zoom returns      | the Eye closes, warmth floods back stronger than before (rays bloom) | —    | shrine_touch (soft)
// Loop composition changes every shot; the Eye is the "turn" of each loop, the returning warmth the payoff.

import { K, easeInOut, easeOut, span, lerp, wobble, clamp01 } from '../Engine';
import type { SceneDef, Gfx, LayerState } from '../Engine';
import { AMBER, GOLD, EMBER, WARM_WHITE, VIOLET, embers, stars, bokeh, spark, godRays, eye, ridge, gradientBg, pool } from '../Draw';
import { glowDisc, rgba } from '../Sprites';

const D = 24;
/** 0..1 how much the Darkness is present at loop time t (bell over shot 2–4). */
const dark = (t: number) => Math.sin(Math.PI * span(t, 8, 20)) ** 1.5;

const drawBg = (g: Gfx) => {
  const d = dark(g.t);
  gradientBg(g, lerp0(d, '#0b0709', '#06030b'), '#3a1d0a', '#120a04', 0.6);
  pool(g, 0, 150, 950, EMBER, 0.32 * (1 - d * 0.5));
  // darkness band from the top when the Eye is present
  if (d > 0.01) {
    const ctx = g.ctx; const gr = ctx.createLinearGradient(0, -g.hh, 0, -g.hh + 700);
    gr.addColorStop(0, rgba('#05020c', 0.95 * d)); gr.addColorStop(1, rgba('#05020c', 0));
    ctx.fillStyle = gr; ctx.fillRect(-g.hw - 4, -g.hh - 4, g.hw * 2 + 8, 710);
  }
};
// cheap 2-colour pick (no string lerp needed: both are near-black)
const lerp0 = (d: number, a: string, b: string) => (d > 0.5 ? b : a);

const drawStars = (g: Gfx, L: LayerState) => { stars(g, 320, 13, 1500, '#ffe9c0', 0.5 * (1 - dark(g.t) * 0.8) * L.alpha, g.ta); };
const drawBokeh = (g: Gfx, L: LayerState) => { bokeh(g, 30, AMBER, 17, 1300, 0.11 * L.alpha, g.ta); };
const drawRays = (g: Gfx, L: LayerState) => {
  const d = dark(g.t); const bloom = 1 + 0.9 * easeOut(span(g.t, 18, 21)) * (1 - span(g.t, 22, 24));
  godRays(g, 0, 60, -Math.PI / 2, Math.PI * 1.15, 16, 1500, AMBER, 0.12 * (1 - d * 0.6) * bloom * L.alpha, g.ta);
};
const drawRidge = (g: Gfx) => { ridge(g, 250, 120, 23, '#1a0e06', 3400, 72); ridge(g, 320, 60, 29, '#0b0603', 3400, 40); };
const drawSpark = (g: Gfx) => {
  const d = dark(g.t);
  // the spark flinches while watched (more flicker, slightly smaller), then flares when the Eye closes
  const flare = 1 + 0.25 * easeOut(span(g.t, 18, 19.5)) * (1 - span(g.t, 20, 23));
  spark(g, 0, 60, { r: 70 * (1 - d * 0.1) * flare, heat: (1 - d * 0.25) * flare, flicker: 0.07 + d * 0.2, rays: 14, t: g.ta });
};
const drawEmbers = (g: Gfx, L: LayerState) => {
  const d = dark(g.t);
  embers(g, { n: 800, x: -1200, y: 420, w: 2400, h: 200, rise: 100, drift: 24, rMin: 1.2, rMax: 4, colors: [GOLD, EMBER, AMBER], life: 7, seed: 5, glow: 3 }, L.alpha * (1 - d * 0.4), g.ta);
  embers(g, { n: 220, x: -280, y: 60, w: 560, h: 60, rise: 170, drift: 36, rMin: 1, rMax: 3, colors: [WARM_WHITE, AMBER, GOLD], life: 3.5, seed: 77, glow: 4 }, L.alpha, g.ta);
};
const drawLidLine = (g: Gfx, L: LayerState) => {
  const t = g.t; const a = Math.sin(Math.PI * span(t, 9, 14.5)) * L.alpha; if (a <= 0.01) return;
  const ctx = g.ctx; const w = 1200;
  const gr = ctx.createLinearGradient(-w / 2, 0, w / 2, 0);
  gr.addColorStop(0, rgba(VIOLET, 0)); gr.addColorStop(0.5, rgba(VIOLET, 0.7 * a)); gr.addColorStop(1, rgba(VIOLET, 0));
  ctx.fillStyle = gr; ctx.fillRect(-w / 2, -330 + wobble(t, 4) * 2, w, 2);
  ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.1 * a;
  ctx.drawImage(glowDisc(VIOLET, 256), -w * 0.3, -330 - 70, w * 0.6, 140);
  ctx.globalAlpha = L.alpha; ctx.globalCompositeOperation = 'source-over';
};
const drawEye = (g: Gfx) => {
  const t = g.t;
  const open = 0.42 * Math.sin(Math.PI * clamp01(span(t, 13.5, 19.5))) ** 0.8;
  if (open < 0.01) return;
  // pupil finds the spark (below the eye) and holds
  const find = easeInOut(span(t, 14.5, 15.6));
  eye(g, 0, -330, { r: 520, open, look: { x: lerp(Math.sin(t) * 0.4, 0, find), y: lerp(0, 0.9, find) }, pupil: lerp(0.2, 0.1, find), veins: 14, glow: 0.7 });
};

export const menu_loop: SceneDef = {
  id: 'menu_loop',
  duration: D,
  loop: true,
  skipAfter: 1e9,
  bg: drawBg,
  camera: {
    zoom: K(0, 1.0, 8, 1.03, easeInOut, 14, 1.06, easeInOut, 18, 1.06, 24, 1.0, easeInOut),
    y: K(0, 0, 8, 0, 14, -40, easeInOut, 18, -40, 24, 0, easeInOut),
    focus: K(0, 0, 8, 0, 13, 1, easeInOut, 18, 1, 22, 0, easeInOut),
    shakes: [{ t: 14.5, amp: 6, decay: 3, freq: 12 }],
  },
  layers: [
    { id: 'stars', parallax: 0.3, draw: drawStars },
    { id: 'eye', parallax: 0.6, depth: 1, draw: drawEye },
    { id: 'lid', parallax: 0.6, draw: drawLidLine },
    { id: 'bokeh', parallax: 0.5, draw: drawBokeh },
    { id: 'rays', parallax: 0.9, depth: 0, draw: drawRays },
    { id: 'ridge', parallax: 1.2, depth: 0, draw: drawRidge },
    { id: 'spark', parallax: 1, depth: 0, draw: drawSpark },
    { id: 'embers', parallax: 1.1, draw: drawEmbers },
  ],
  post: {
    letterbox: K(0, 0),
    vignette: K(0, 0.55, 14, 0.8, easeInOut, 18, 0.8, 23, 0.55, easeInOut),
    grain: K(0, 0.1, 14, 0.3, 18, 0.3, 23, 0.1),
    aberration: K(0, 0, 13.5, 0, 15, 2.5, 18, 2.5, 20, 0),
    wash: K(0, 0.45, 14, -0.3, easeInOut, 18, -0.3, 22, 0.55, easeInOut, 24, 0.45),
  },
  cues: [
    { t: 14.2, sfx: 'boss_telegraph', vol: 0.25 },
    { t: 18.6, sfx: 'shrine_touch', vol: 0.3 },
  ],
  shots: [
    { n: 1, from: 0, to: 8, what: 'Warm wide: spark on the ridge, 1000 embers rising, rays turning, breathing zoom.' },
    { n: 2, from: 8, to: 14, what: 'Camera pans up and racks focus to the sky; a darkness band drops in; a violet lid-line appears.' },
    { n: 3, from: 14, to: 18, what: 'The Eye half-opens above, finds the spark and stares; stars dim, embers slow, spark flinches. (turn)' },
    { n: 4, from: 18, to: 24, what: 'Eye closes; the spark flares, rays bloom, warmth returns stronger; camera settles — seamless back to shot 1.' },
  ],
};
export default menu_loop;
