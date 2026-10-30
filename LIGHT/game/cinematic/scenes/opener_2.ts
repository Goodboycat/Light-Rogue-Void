// (M1) SCENE `opener_2` — Whispering Grove. Plays at wave 1 of chapter 2, gameplay hidden + paused. 13 s.
// The second place: tall black stalks in a teal spore-fog. Everything here whispers; the Darkness has learned to talk.
//
// STORYBOARD (written first, keyframes derived from it — MOVIE.md §1.4)
// shot | start–end s | framing          | camera move                         | what changes on screen                                                                 | text                                                                      | audio id
// -----|-------------|------------------|-------------------------------------|----------------------------------------------------------------------------------------|---------------------------------------------------------------------------|------------------
//  1   |  0.0– 2.6   | card             | static                              | black; CHAPTER II tracks out; WHISPERING GROVE assembles; teal rule grows               | CHAPTER II / WHISPERING GROVE                                             | chapter_card
//  2   |  2.6– 5.6   | low wide, looking up | slow dolly left, slight tilt up | three rows of black stalks in parallax sway; 1300 teal spores drift up; fog pools low    | —                                                                         | landmark_reveal (soft)
//  3   |  5.6– 9.0   | wide → the stalks lean in | push-in that never stops + roll | the spores stop and HANG; a field of small eyes opens along the stalks; stalks lean toward the camera | "Welcome to the grove. Everything here whispers. Nothing here is kind." | boss_telegraph, story_line, drone
//  4   |  9.0–10.2   | black            | HARD CUT, hold                      | nothing; at 9.6 s one amber point low between two stalk roots                           | —                                                                         | pickup_essence
//  5   | 10.2–13.0   | low wide         | gentle overshoot zoom-out           | the spark lights the roots from below; spores turn gold near it and rise; eyes gone; letterbox opens; fade | "I hear them. They sound afraid."                        | shrine_touch, story_line
// Structure: setup (1–2) → escalation (3: the whispering becomes watching) → turn (4) → payoff (5).

import { K, step, easeIn, easeOut, easeInOut, span, lerp, hash, wobble } from '../Engine';
import type { SceneDef, Gfx, LayerState } from '../Engine';
import { AMBER, GOLD, EMBER, VIOLET, embers, bokeh, eye, gradientBg, pool, godRays } from '../Draw';
import { glowDisc, hazeBand, rgba } from '../Sprites';
import { T_PLACE, T_DARK, T_TURN, T_LIGHT, T_END, chapterCard, darkLine, lightLine, turnSpark, openerPost, openerZoom, mix } from './openerKit';

const NAME = 'Whispering Grove', COLOR = '#5eead4';
const TEAL = '#5eead4', TEAL2 = '#2dd4bf', TEAL3 = '#115e59', DEEP = '#031a1a';

// cold = how far the whispering has turned into watching (0 alive, 1 hostile)
const cold = (t: number) => (t < T_TURN ? easeIn(span(t, T_DARK, T_TURN - 0.4)) : 0);
// lean = stalks lean toward the camera during the DARK shot (0 upright, 1 leaning)
const lean = (t: number) => (t < T_TURN ? easeInOut(span(t, T_DARK + 0.8, T_TURN - 0.2)) : 0);

/** One row of tall black stalks: a single filled path (trunks + a few branch nubs) per row, swaying with wobble.
 *  `seed` picks the row, `baseY` the ground line, `h` the height, `n` the count across a 4400 px strip. */
function stalkRow(g: Gfx, seed: number, baseY: number, h: number, n: number, w: number, color: string, sway: number, leanAmt: number) {
  const ctx = g.ctx; const t = g.ta;
  ctx.fillStyle = color; ctx.beginPath();
  for (let i = 0; i < n; i++) {
    const h0 = hash(i, seed), h1 = hash(i, seed + 1), h2 = hash(i, seed + 2);
    const x = -2200 + (i + h0 * 0.8) * (4400 / n);
    const H = h * (0.65 + h1 * 0.7);
    const W = w * (0.6 + h2 * 0.8);
    // lean: stalks on the left lean right, on the right lean left → they all lean toward centre (the camera)
    const towards = -Math.sign(x) * leanAmt * H * 0.28;
    const top = x + wobble(t * 0.35 + i, seed) * sway * H * 0.08 + towards;
    // trunk as a tapered quad, slightly curved via a mid point
    ctx.moveTo(x - W, baseY);
    ctx.quadraticCurveTo(x - W * 0.5 + towards * 0.4, baseY - H * 0.55, top - W * 0.22, baseY - H);
    ctx.lineTo(top + W * 0.22, baseY - H);
    ctx.quadraticCurveTo(x + W * 0.5 + towards * 0.4, baseY - H * 0.55, x + W, baseY);
    ctx.closePath();
    // a seed-pod head on some stalks
    if (h2 > 0.55) { const r = W * 1.6; ctx.moveTo(top + r, baseY - H); ctx.arc(top, baseY - H, r, 0, Math.PI * 2); }
  }
  ctx.fill();
}

const drawSky = (g: Gfx, L: LayerState) => {
  const t = g.t; const c = cold(t); const ctx = g.ctx;
  ctx.globalAlpha = L.alpha;
  // alive: deep teal-black above → teal fog at the ground. hostile: ink → violet-grey → black
  gradientBg(g, mix('#020a0c', '#06030c', c), mix('#0a2a2b', '#140e26', c), mix('#0c3b38', '#040208', c), 0.62);
  // bioluminescent ground glow (the fog is lit from below by the spores)
  pool(g, 200, 420, 1300, TEAL3, 0.5 * (1 - c) * L.alpha);
  pool(g, -500, 380, 800, TEAL2, 0.12 * (1 - c) * L.alpha);
  ctx.globalAlpha = L.alpha;
};
const drawFog = (g: Gfx, L: LayerState) => {
  // two fog bands lying between the stalk rows; the near one breathes
  const ctx = g.ctx; const c = cold(g.t); const b = 1 + 0.06 * wobble(g.ta * 0.4, 9);
  ctx.globalAlpha = L.alpha * 0.5 * (1 - c * 0.6); ctx.globalCompositeOperation = 'lighter';
  ctx.drawImage(hazeBand(mix(TEAL2, VIOLET, c), 64, 512), -2200, 120, 4400, 300 * b);
  ctx.drawImage(hazeBand(mix(TEAL, VIOLET, c), 64, 512), -2200, 260, 4400, 420);
  ctx.globalAlpha = L.alpha; ctx.globalCompositeOperation = 'source-over';
};
const drawFarStalks = (g: Gfx, _L: LayerState) => {
  const c = cold(g.t);
  stalkRow(g, 201, 380, 720, 26, 16, mix('#062321', '#0b0716', c), 1, lean(g.t) * 0.5);
};
const drawMidStalks = (g: Gfx, _L: LayerState) => {
  const c = cold(g.t);
  stalkRow(g, 211, 440, 960, 16, 26, mix('#03110f', '#06040e', c), 1.2, lean(g.t) * 0.8);
};
const drawNearStalks = (g: Gfx, _L: LayerState) => {
  const c = cold(g.t);
  stalkRow(g, 223, 620, 1500, 9, 48, mix('#010807', '#020105', c), 1.5, lean(g.t));
};
const drawSpores = (g: Gfx, L: LayerState) => {
  // 1300 teal spores rising through the fog; when the Darkness speaks they stop and hang
  const t = g.t; const c = cold(t);
  const rise = lerp(34, 0, c);
  embers(g, { n: 1000, x: -2200, y: -520, w: 4400, h: 1100, rise, drift: lerp(22, 2, c), rMin: 1, rMax: 3, colors: [TEAL, '#99f6e4', TEAL2], life: 11, seed: 51, glow: 1.5 }, L.alpha * lerp(0.85, 0.5, c), g.ta);
  embers(g, { n: 300, x: -1400, y: 100, w: 2800, h: 400, rise: lerp(48, 0, c), drift: lerp(30, 3, c), rMin: 2.5, rMax: 5.5, colors: ['#ccfbf1', TEAL, TEAL2], life: 7, seed: 57, glow: 3 }, L.alpha * (1 - c * 0.6), g.ta);
};
const drawBokeh = (g: Gfx, L: LayerState) => { bokeh(g, 26, TEAL, 17, 1400, 0.12 * L.alpha * (1 - cold(g.t))); };

const drawWhispers = (g: Gfx, L: LayerState) => {
  // the whispering becomes watching: small eyes open along the stalks, each blinking on its own phase,
  // all of them looking slightly toward the camera. Drawn with the eye primitive (one stroke/fill group each, ≤ 48).
  const t = g.t; const a = L.alpha * span(t, T_DARK + 0.6, T_DARK + 2.4);
  if (a <= 0) return;
  const ctx = g.ctx; ctx.globalAlpha = a;
  const open = lerp(0.1, 0.5, easeOut(span(t, T_DARK + 0.8, T_DARK + 2.8)));
  for (let i = 0; i < 44; i++) {
    const h0 = hash(i, 71), h1 = hash(i, 72), h2 = hash(i, 73);
    const x = (h0 - 0.5) * 2600, y = -420 + h1 * 760;
    const blink = Math.min(1, Math.max(0, Math.sin(t * (0.6 + h2) + i * 1.9) * 2.4 + 0.6));
    const op = open * blink;
    if (op < 0.03) continue;
    eye(g, x, y, { r: 22 + h2 * 42, open: op, glow: 0.55, veins: 0, pupil: 0.14, look: { x: -x / 1600, y: -y / 900 } });
  }
  // and one large one, late, low in the fog — the voice
  const big = span(t, T_DARK + 2.2, T_DARK + 3.0);
  if (big > 0) {
    ctx.globalAlpha = a * big;
    eye(g, 260, 180, { r: 300, open: 0.34 * big + 0.02 * wobble(t * 3, 5), look: { x: -0.1, y: -0.2 }, pupil: 0.1, veins: 6, glow: 0.8 });
  }
  ctx.globalAlpha = 1;
};
const drawColdWash = (g: Gfx, L: LayerState) => {
  // the grove drains: violet-black comes in from both sides (the stalks are closing in), not from the top
  const ctx = g.ctx; const c = cold(g.t); if (c <= 0) return;
  const H = g.hh * 2 + 4, W = g.hw * 2 + 4;
  const gr = ctx.createLinearGradient(-W / 2, 0, W / 2, 0);
  gr.addColorStop(0, rgba('#0e0822', 0.8 * c)); gr.addColorStop(0.5, rgba('#0b0618', 0.25 * c)); gr.addColorStop(1, rgba('#0e0822', 0.8 * c));
  ctx.globalAlpha = L.alpha; ctx.fillStyle = gr; ctx.fillRect(-W / 2, -H / 2, W, H);
};
const drawCard = (g: Gfx, L: LayerState) => chapterCard(g, L, 2, NAME, COLOR);
const drawDark = (g: Gfx, L: LayerState) => darkLine(g, L, 'Welcome to the grove. Everything here whispers. Nothing here is kind.', 340, T_DARK + 0.4, 2.6);
const drawLight = (g: Gfx, L: LayerState) => lightLine(g, L, 'I hear them. They sound afraid.');
const SX = -40, SY = 470;
const drawSpark = (g: Gfx, L: LayerState) => turnSpark(g, L, SX, SY, 42);
const drawWarmPool = (g: Gfx, L: LayerState) => {
  const a = L.alpha * span(g.t, T_LIGHT, T_LIGHT + 1.4);
  pool(g, SX, SY, 560, EMBER, 0.42 * a);
  godRays(g, SX, SY, -Math.PI / 2, Math.PI * 1.1, 10, 1000, AMBER, 0.1 * a);
  // the spark lights the stalk roots from below: a warm rim across the near ground
  g.ctx.globalCompositeOperation = 'lighter'; g.ctx.globalAlpha = 0.2 * a;
  g.ctx.drawImage(glowDisc(GOLD, 256), -800, 330, 1500, 320);
  g.ctx.globalAlpha = L.alpha; g.ctx.globalCompositeOperation = 'source-over';
};
const drawGoldSpores = (g: Gfx, L: LayerState) => {
  // spores near the spark catch its colour and rise again — the grove answers
  const a = L.alpha * span(g.t, T_LIGHT + 0.2, T_LIGHT + 1.6);
  embers(g, { n: 220, x: SX - 500, y: SY - 500, w: 1000, h: 520, rise: 50, drift: 14, rMin: 1.5, rMax: 4, colors: [AMBER, GOLD, '#fde9c4'], life: 5, seed: 61, glow: 2.5 }, a, g.ta);
};

export const opener_2: SceneDef = {
  id: 'opener_2',
  duration: T_END,
  skipAfter: 0.6,
  camera: {
    zoom: openerZoom(),
    x: K(0, 0, T_PLACE, 140, T_DARK, -40, easeInOut, T_TURN - 0.01, -20, easeIn, T_TURN, 0, step, T_END, 0),
    // shot 2 looks up (camera low, tilting up = y rises); shot 3 pushes down into the fog where the big eye is
    y: K(0, 0, T_PLACE, 60, T_DARK, -40, easeInOut, T_TURN - 0.01, 120, easeIn, T_TURN, 120, step, T_LIGHT, 120, T_END, 80, easeInOut),
    rot: K(0, 0, T_DARK, 0, T_TURN - 0.01, 0.045, easeIn, T_TURN, 0, step),
    shakes: [{ t: T_DARK + 2.4, amp: 5, decay: 3, freq: 16 }, { t: T_TURN, amp: 14, decay: 4, freq: 22 }],
  },
  layers: [
    { id: 'card', from: 0, to: T_PLACE, parallax: 0, draw: drawCard },
    // the place (shots 2–3)
    { id: 'sky', from: T_PLACE, to: T_TURN, parallax: 0.05, alpha: K(T_PLACE, 0, T_PLACE + 0.6, 1, easeOut), draw: drawSky },
    { id: 'bokeh', from: T_PLACE, to: T_TURN, parallax: 0.35, draw: drawBokeh },
    { id: 'far', from: T_PLACE, to: T_TURN, parallax: 0.4, depth: 1, draw: drawFarStalks },
    { id: 'fog', from: T_PLACE, to: T_TURN, parallax: 0.5, draw: drawFog },
    { id: 'mid', from: T_PLACE, to: T_TURN, parallax: 0.7, depth: 0.5, draw: drawMidStalks },
    { id: 'eyes', from: T_DARK, to: T_TURN, parallax: 0.7, depth: 0.5, draw: drawWhispers },
    { id: 'cold', from: T_DARK, to: T_TURN, parallax: 0, draw: drawColdWash },
    { id: 'spores', from: T_PLACE, to: T_TURN, parallax: 0.9, alpha: K(T_PLACE, 0, T_PLACE + 1, 1), draw: drawSpores },
    { id: 'near', from: T_PLACE, to: T_TURN, parallax: 1.3, depth: 0, draw: drawNearStalks },
    { id: 'dark_text', from: T_DARK, to: T_TURN, parallax: 0, draw: drawDark },
    // the turn + payoff (shots 4–5): the same grove, seen from the roots, lit by the spark
    { id: 'sky2', from: T_LIGHT, parallax: 0.05, alpha: K(T_LIGHT, 0, T_LIGHT + 1.2, 1, easeOut), draw: drawSky },
    { id: 'far2', from: T_LIGHT, parallax: 0.4, alpha: K(T_LIGHT, 0, T_LIGHT + 1.2, 1), draw: drawFarStalks },
    { id: 'fog2', from: T_LIGHT, parallax: 0.5, alpha: K(T_LIGHT, 0, T_LIGHT + 1.2, 1), draw: drawFog },
    { id: 'mid2', from: T_LIGHT, parallax: 0.7, alpha: K(T_LIGHT, 0, T_LIGHT + 1.2, 1), draw: drawMidStalks },
    { id: 'pool', from: T_LIGHT, parallax: 1, draw: drawWarmPool },
    { id: 'spores2', from: T_LIGHT, parallax: 0.9, alpha: K(T_LIGHT, 0, T_LIGHT + 1.5, 1), draw: drawSpores },
    { id: 'spark', from: T_TURN + 0.6, parallax: 1, draw: drawSpark },
    { id: 'gold', from: T_LIGHT, parallax: 1, draw: drawGoldSpores },
    { id: 'near2', from: T_LIGHT, parallax: 1.3, alpha: K(T_LIGHT, 0, T_LIGHT + 1.2, 1), draw: drawNearStalks },
    { id: 'light_text', from: T_LIGHT, parallax: 0, draw: drawLight },
  ],
  post: {
    ...openerPost(0.6),
    aberration: K(0, 0, T_DARK, 0, T_DARK + 0.01, 5, step, T_DARK + 0.5, 1, T_DARK + 2.4, 2, T_DARK + 2.41, 9, step, T_DARK + 2.9, 2, T_TURN - 0.01, 14, easeIn, T_TURN, 0, step),
  },
  cues: [
    { t: 0.1, sfx: 'chapter_card', vol: 0.9 },
    { t: T_PLACE + 0.2, sfx: 'landmark_reveal', vol: 0.35 },
    { t: T_DARK, sfx: 'boss_telegraph', vol: 0.5 },
    { t: T_DARK + 0.4, sfx: 'story_line', vol: 0.3 },
    { t: T_DARK + 2.4, sfx: 'ambush_ring', vol: 0.4 },             // the big eye opens
    { t: T_TURN, sfx: 'boss_arrive', vol: 0.5 },
    { t: T_TURN + 0.6, sfx: 'pickup_essence', vol: 0.6 },
    { t: T_LIGHT + 0.2, sfx: 'shrine_touch', vol: 0.7 },
    { t: T_LIGHT + 0.5, sfx: 'story_line', vol: 0.3 },
  ],
  shots: [
    { n: 1, from: 0, to: T_PLACE, what: 'Card on black: CHAPTER II tracks out, WHISPERING GROVE assembles, teal rule grows.' },
    { n: 2, from: T_PLACE, to: T_DARK, what: 'Low wide looking up, slow dolly left: three rows of black stalks sway in parallax, 1300 teal spores rise through fog lit from below. Setup — the grove is alive.' },
    { n: 3, from: T_DARK, to: T_TURN, what: 'Push-in that never stops + roll: the spores stop and hang, 44 small eyes open along the stalks and all look at the camera, the stalks lean in, violet closes from both sides, one large eye opens low in the fog. "Welcome to the grove. Everything here whispers. Nothing here is kind."' },
    { n: 4, from: T_TURN, to: T_LIGHT, what: 'HARD CUT to black with a thud. 0.6 s of nothing, then one amber point low between two roots. The turn.' },
    { n: 5, from: T_LIGHT, to: T_END, what: 'Gentle overshoot out from the roots: the spark lights the stalks from below, spores near it turn gold and rise again, the eyes are gone, letterbox opens. "I hear them. They sound afraid." Fade.' },
  ],
};
export default opener_2;
