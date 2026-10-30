// (M1) SCENE `opener_3` — Crystal Depths. Plays at wave 1 of chapter 3, gameplay hidden + paused. 13 s.
// The third place: a cavern of violet shards. Every facet holds the ghost of a light that failed here.
// The Darkness admits it is watching — and shows us the proof.
//
// STORYBOARD (written first, keyframes derived from it — MOVIE.md §1.4)
// shot | start–end s | framing            | camera move                          | what changes on screen                                                                        | text                                                                               | audio id
// -----|-------------|--------------------|--------------------------------------|-----------------------------------------------------------------------------------------------|------------------------------------------------------------------------------------|------------------
//  1   |  0.0– 2.6   | card               | static                               | black; CHAPTER III tracks out; CRYSTAL DEPTHS assembles; violet rule grows                      | CHAPTER III / CRYSTAL DEPTHS                                                       | chapter_card
//  2   |  2.6– 5.6   | wide, descending   | slow crane DOWN, breathing zoom      | shard clusters hang from above and rise from below in parallax; 1200 glints drift; a cold glow deep in the frame | —                                                                 | landmark_reveal (soft)
//  3   |  5.6– 9.0   | wide → inside a shard | push-in that never stops + roll   | the shards begin to SHINE from within: a faint failed spark in each facet; flicker; the pale ghosts move in unison, then all turn toward us; an iris in the largest shard | "Down here the walls remember every light that failed. Look: they shine." | boss_telegraph, story_line
//  4   |  9.0–10.2   | black              | HARD CUT, hold                       | nothing; at 9.6 s one amber point low, on a shard floor                                       | —                                                                                  | pickup_essence
//  5   | 10.2–13.0   | wide, low          | gentle overshoot zoom-out            | the spark on the crystal floor; the facets refract it: amber light-bars fan out across the shards; glints turn gold; letterbox opens; fade | "Then they were here. Then I am not the first." | shrine_touch, story_line
// Structure: setup (1–2) → escalation (3: the walls are a graveyard, and it watches through them) → turn (4) → payoff (5: the same walls carry our light).

import { K, step, easeIn, easeOut, easeInOut, span, lerp, hash, wobble } from '../Engine';
import type { SceneDef, Gfx, LayerState } from '../Engine';
import { AMBER, GOLD, EMBER, VIOLET, embers, bokeh, eye, gradientBg, pool, godRays, stars } from '../Draw';
import { glowDisc, rayStrip, rgba } from '../Sprites';
import { T_PLACE, T_DARK, T_TURN, T_LIGHT, T_END, chapterCard, darkLine, lightLine, turnSpark, openerPost, openerZoom, mix } from './openerKit';

const NAME = 'Crystal Depths', COLOR = '#c4b5fd';
const SHARD = '#2e1065', SHARD2 = '#1e0b45', SHARD3 = '#120726', EDGE = '#8b5cf6', PALE = '#e9d5ff';

// cold = how far the walls have woken (0 asleep, 1 all facets shining and turned on us)
const cold = (t: number) => (t < T_TURN ? easeIn(span(t, T_DARK, T_TURN - 0.4)) : 0);

interface ShardSpec { x: number; y: number; w: number; h: number; tilt: number; up: boolean; k: number }
const shardSpec = (i: number, seed: number, baseY: number, up: boolean, hMin: number, hMax: number, wMax: number): ShardSpec => {
  const h0 = hash(i, seed), h1 = hash(i, seed + 1), h2 = hash(i, seed + 2);
  return { x: -2300 + h0 * 4600, y: baseY, w: wMax * (0.35 + h1 * 0.65), h: lerp(hMin, hMax, h2), tilt: (h1 - 0.5) * 0.5, up, k: h2 };
};
/** One cluster of shards: filled polygons (one path per fill colour), a violet edge hairline, and when `shine` > 0 a
 *  pale ghost-spark in each facet (the failed lights). Shards grow up from the floor or hang down from the ceiling. */
function shardRow(g: Gfx, n: number, seed: number, baseY: number, up: boolean, hMin: number, hMax: number, wMax: number, color: string, shine: number, look: number) {
  const ctx = g.ctx; const t = g.t; const dir = up ? -1 : 1;
  ctx.fillStyle = color; ctx.beginPath();
  for (let i = 0; i < n; i++) {
    const s = shardSpec(i, seed, baseY, up, hMin, hMax, wMax);
    const tx = s.x + s.tilt * s.h, ty = s.y + dir * s.h;
    ctx.moveTo(s.x - s.w, s.y); ctx.lineTo(tx - s.w * 0.12, ty); ctx.lineTo(tx + s.w * 0.18, ty - dir * s.h * 0.08); ctx.lineTo(s.x + s.w, s.y); ctx.closePath();
    // a second, shorter facet leaning the other way
    ctx.moveTo(s.x - s.w * 0.4, s.y); ctx.lineTo(s.x - s.tilt * s.h * 0.6 - s.w * 0.2, s.y + dir * s.h * 0.55); ctx.lineTo(s.x + s.w * 0.55, s.y); ctx.closePath();
  }
  ctx.fill();
  // edge hairline on the lit side
  ctx.strokeStyle = rgba(EDGE, 0.22 + shine * 0.35); ctx.lineWidth = 1.2; ctx.beginPath();
  for (let i = 0; i < n; i++) {
    const s = shardSpec(i, seed, baseY, up, hMin, hMax, wMax);
    const tx = s.x + s.tilt * s.h, ty = s.y + dir * s.h;
    ctx.moveTo(s.x + s.w, s.y); ctx.lineTo(tx + s.w * 0.18, ty - dir * s.h * 0.08);
  }
  ctx.stroke();
  if (shine <= 0.01) return;
  // the failed lights: one pale point inside each shard, flickering on its own phase, drifting toward `look` (the camera)
  ctx.globalCompositeOperation = 'lighter';
  const sp = glowDisc(PALE, 64);
  for (let i = 0; i < n; i++) {
    const s = shardSpec(i, seed, baseY, up, hMin, hMax, wMax);
    const fl = 0.55 + 0.45 * Math.max(0, wobble(t * 2.2 + i * 1.7, seed + 9));
    const a = shine * fl * (0.5 + s.k * 0.5);
    if (a < 0.03) continue;
    const gx = s.x + s.tilt * s.h * 0.45 + (0 - s.x) * 0.06 * look, gy = s.y + dir * s.h * 0.45 + (120 - s.y) * 0.08 * look;
    const r = (10 + s.k * 16) * (1 + look * 0.4);
    ctx.globalAlpha = a; ctx.drawImage(sp, gx - r, gy - r, r * 2, r * 2);
  }
  ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
}

const drawSky = (g: Gfx, L: LayerState) => {
  const t = g.t; const c = cold(t); const ctx = g.ctx;
  ctx.globalAlpha = L.alpha;
  // asleep: black-violet cavern, a cold glow deep in the frame. awake: the glow goes pale, the top goes ink
  gradientBg(g, mix('#07031a', '#03010a', c), mix('#1a0b3a', '#120a26', c), mix('#0b0520', '#050211', c), 0.5);
  pool(g, 80, 220, 900, mix('#4c1d95', '#d8b4fe', c), (0.3 + 0.25 * c) * L.alpha);
  pool(g, -600, -200, 600, '#312e81', 0.12 * (1 - c) * L.alpha);
  ctx.globalAlpha = L.alpha;
};
const drawGlints = (g: Gfx, L: LayerState) => {
  // 1200 glints: dust catching the cold glow, drifting slowly down the shaft; when the walls wake they freeze
  const c = cold(g.t);
  embers(g, { n: 900, x: -2200, y: -600, w: 4400, h: 1200, rise: lerp(-18, 0, c), drift: lerp(10, 1, c), rMin: 0.8, rMax: 2.4, colors: [PALE, '#c4b5fd', '#a78bfa'], life: 12, seed: 81, glow: 1 }, L.alpha * lerp(0.75, 0.9, c), g.ta);
  embers(g, { n: 300, x: -1200, y: -300, w: 2400, h: 800, rise: lerp(-30, 0, c), drift: lerp(16, 1, c), rMin: 2, rMax: 4.5, colors: ['#f5f3ff', PALE, '#c4b5fd'], life: 8, seed: 87, glow: 2.5 }, L.alpha * (0.7 - c * 0.3), g.ta);
};
const drawStars = (g: Gfx, L: LayerState) => { stars(g, 160, 91, 1500, '#c4b5fd', 0.35 * L.alpha * (1 - cold(g.t) * 0.5)); };
const drawBokeh = (g: Gfx, L: LayerState) => { bokeh(g, 20, VIOLET, 19, 1400, 0.12 * L.alpha * (1 - cold(g.t))); };

// the shard rows (far → near): ceiling clusters hang, floor clusters rise
const look = (t: number) => (t < T_TURN ? easeInOut(span(t, T_DARK + 2.0, T_DARK + 2.9)) : 0);
const drawFarShards = (g: Gfx, _L: LayerState) => {
  const c = cold(g.t), lk = look(g.t);
  shardRow(g, 34, 301, -620, false, 260, 620, 70, mix(SHARD3, '#0a0416', c), c * 0.7, lk);
  shardRow(g, 34, 311, 560, true, 220, 560, 70, mix(SHARD3, '#0a0416', c), c * 0.7, lk);
};
const drawMidShards = (g: Gfx, _L: LayerState) => {
  const c = cold(g.t), lk = look(g.t);
  shardRow(g, 22, 321, -640, false, 320, 820, 110, mix(SHARD2, '#0c0520', c), c * 0.9, lk);
  shardRow(g, 22, 331, 600, true, 300, 760, 110, mix(SHARD2, '#0c0520', c), c * 0.9, lk);
};
const drawNearShards = (g: Gfx, _L: LayerState) => {
  const c = cold(g.t), lk = look(g.t);
  shardRow(g, 11, 341, -700, false, 500, 1100, 190, mix(SHARD, '#0e0624', c), c, lk);
  shardRow(g, 11, 351, 680, true, 460, 1000, 190, mix(SHARD, '#0e0624', c), c, lk);
};
const drawFacetFlicker = (g: Gfx, L: LayerState) => {
  // the moment the walls wake: pale light-bars sweep through the facets (rayStrip, lighter), unison then broken
  const t = g.t; const c = cold(t); if (c <= 0) return;
  const ctx = g.ctx; ctx.globalCompositeOperation = 'lighter';
  const strip = rayStrip(PALE, 1024, 96);
  for (let i = 0; i < 9; i++) {
    const h0 = hash(i, 97), h1 = hash(i, 98);
    const ph = Math.max(0, wobble(t * 1.4 + i * 0.9, 97));
    const a = c * 0.16 * ph * L.alpha; if (a < 0.01) continue;
    const x = -1500 + h0 * 3000, y = -500 + h1 * 1000, ang = -0.9 + h0 * 1.8 + Math.sin(t * 0.3 + i) * 0.05;
    ctx.save(); ctx.translate(x, y); ctx.rotate(ang); ctx.globalAlpha = a; ctx.drawImage(strip, -640, -60, 1280, 120); ctx.restore();
  }
  ctx.globalAlpha = L.alpha; ctx.globalCompositeOperation = 'source-over';
};
const drawWatcher = (g: Gfx, L: LayerState) => {
  // the admission: an iris surfaces inside the largest near shard, cold and pale, and locks on
  const t = g.t; const a = L.alpha * span(t, T_DARK + 1.6, T_DARK + 2.6);
  if (a <= 0) return;
  const lock = easeInOut(span(t, T_DARK + 2.3, T_DARK + 2.9));
  g.ctx.globalAlpha = a;
  eye(g, -420, -40, { r: 380, open: lerp(0.08, 0.4, easeOut(span(t, T_DARK + 1.8, T_DARK + 2.9))) + 0.02 * wobble(t * 3, 7), look: { x: lerp(0.5, 0.15, lock), y: lerp(-0.3, 0, lock) }, pupil: lerp(0.18, 0.08, lock), veins: 8, glow: 0.9 });
  g.ctx.globalAlpha = 1;
};
const drawColdWash = (g: Gfx, L: LayerState) => {
  // the cavern bleaches: the colour goes out of the violet and a pale veil rises from below (the ghosts' light)
  const ctx = g.ctx; const c = cold(g.t); if (c <= 0) return;
  const H = g.hh * 2 + 4, W = g.hw * 2 + 4;
  const gr = ctx.createLinearGradient(0, -H / 2, 0, H / 2);
  gr.addColorStop(0, rgba('#000000', 0.55 * c)); gr.addColorStop(0.55, rgba('#0b0618', 0.2 * c)); gr.addColorStop(1, rgba('#2e1065', 0.35 * c));
  ctx.globalAlpha = L.alpha; ctx.fillStyle = gr; ctx.fillRect(-W / 2, -H / 2, W, H);
};
const drawCard = (g: Gfx, L: LayerState) => chapterCard(g, L, 3, NAME, COLOR);
const drawDark = (g: Gfx, L: LayerState) => darkLine(g, L, 'Down here the walls remember every light that failed. Look: they shine.', 340, T_DARK + 0.4, 2.6);
const drawLight = (g: Gfx, L: LayerState) => lightLine(g, L, 'Then they were here. Then I am not the first.');
const SX = 20, SY = 440;
const drawSpark = (g: Gfx, L: LayerState) => turnSpark(g, L, SX, SY, 44);
const drawWarmPool = (g: Gfx, L: LayerState) => {
  const a = L.alpha * span(g.t, T_LIGHT, T_LIGHT + 1.4);
  pool(g, SX, SY, 600, EMBER, 0.4 * a);
  godRays(g, SX, SY, -Math.PI / 2, Math.PI * 1.3, 12, 1100, AMBER, 0.11 * a);
  g.ctx.globalCompositeOperation = 'lighter'; g.ctx.globalAlpha = 0.18 * a;
  g.ctx.drawImage(glowDisc(GOLD, 256), -800, 300, 1600, 340);
  g.ctx.globalAlpha = L.alpha; g.ctx.globalCompositeOperation = 'source-over';
};
const drawRefractions = (g: Gfx, L: LayerState) => {
  // the payoff: the facets refract OUR light — amber bars fan out from the spark across the shards, one by one
  const t = g.t; const ctx = g.ctx;
  const strip = rayStrip(AMBER, 1024, 96);
  ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 14; i++) {
    const h0 = hash(i, 111), h1 = hash(i, 112);
    const on = span(t, T_LIGHT + 0.5 + i * 0.11, T_LIGHT + 1.1 + i * 0.11);
    if (on <= 0) continue;
    const ang = -Math.PI / 2 + (h0 - 0.5) * 2.4, len = (700 + h1 * 700) * easeOut(on);
    const fl = 0.75 + 0.25 * wobble(t * 1.8 + i, 113);
    ctx.save(); ctx.translate(SX, SY); ctx.rotate(ang); ctx.globalAlpha = 0.22 * on * fl * L.alpha;
    ctx.drawImage(strip, 0, -40, len, 80); ctx.restore();
  }
  ctx.globalAlpha = L.alpha; ctx.globalCompositeOperation = 'source-over';
};
const drawGoldGlints = (g: Gfx, L: LayerState) => {
  const a = L.alpha * span(g.t, T_LIGHT + 0.2, T_LIGHT + 1.6);
  embers(g, { n: 240, x: SX - 600, y: SY - 560, w: 1200, h: 600, rise: 36, drift: 12, rMin: 1.5, rMax: 4, colors: [AMBER, GOLD, '#fde9c4'], life: 6, seed: 121, glow: 2.5 }, a, g.ta);
};

export const opener_3: SceneDef = {
  id: 'opener_3',
  duration: T_END,
  skipAfter: 0.6,
  camera: {
    zoom: openerZoom(),
    x: K(0, 0, T_PLACE, 40, T_DARK, -60, easeInOut, T_TURN - 0.01, -260, easeIn, T_TURN, 0, step, T_END, 0),
    // shot 2 cranes DOWN the shaft (y falls as we descend = camera y increases); shot 3 pushes toward the watcher shard
    y: K(0, 0, T_PLACE, -160, T_DARK, 40, easeInOut, T_TURN - 0.01, 0, easeIn, T_TURN, 100, step, T_LIGHT, 100, T_END, 70, easeInOut),
    rot: K(0, 0, T_DARK, 0, T_TURN - 0.01, -0.05, easeIn, T_TURN, 0, step),
    shakes: [{ t: T_DARK + 0.2, amp: 3, decay: 4, freq: 30 }, { t: T_DARK + 2.6, amp: 6, decay: 3, freq: 18 }, { t: T_TURN, amp: 14, decay: 4, freq: 22 }],
  },
  layers: [
    { id: 'card', from: 0, to: T_PLACE, parallax: 0, draw: drawCard },
    // the place (shots 2–3)
    { id: 'sky', from: T_PLACE, to: T_TURN, parallax: 0.05, alpha: K(T_PLACE, 0, T_PLACE + 0.6, 1, easeOut), draw: drawSky },
    { id: 'stars', from: T_PLACE, to: T_TURN, parallax: 0.15, draw: drawStars },
    { id: 'bokeh', from: T_PLACE, to: T_TURN, parallax: 0.35, draw: drawBokeh },
    { id: 'far', from: T_PLACE, to: T_TURN, parallax: 0.4, depth: 1, draw: drawFarShards },
    { id: 'mid', from: T_PLACE, to: T_TURN, parallax: 0.7, depth: 0.5, draw: drawMidShards },
    { id: 'flicker', from: T_DARK, to: T_TURN, parallax: 0.7, draw: drawFacetFlicker },
    { id: 'cold', from: T_DARK, to: T_TURN, parallax: 0, draw: drawColdWash },
    { id: 'glints', from: T_PLACE, to: T_TURN, parallax: 0.9, alpha: K(T_PLACE, 0, T_PLACE + 1, 1), draw: drawGlints },
    { id: 'near', from: T_PLACE, to: T_TURN, parallax: 1.3, depth: 0, draw: drawNearShards },
    { id: 'watcher', from: T_DARK, to: T_TURN, parallax: 1.3, depth: 0, draw: drawWatcher },
    { id: 'dark_text', from: T_DARK, to: T_TURN, parallax: 0, draw: drawDark },
    // the turn + payoff (shots 4–5): the same cavern, our light in its facets
    { id: 'sky2', from: T_LIGHT, parallax: 0.05, alpha: K(T_LIGHT, 0, T_LIGHT + 1.2, 1, easeOut), draw: drawSky },
    { id: 'far2', from: T_LIGHT, parallax: 0.4, alpha: K(T_LIGHT, 0, T_LIGHT + 1.2, 1), draw: drawFarShards },
    { id: 'mid2', from: T_LIGHT, parallax: 0.7, alpha: K(T_LIGHT, 0, T_LIGHT + 1.2, 1), draw: drawMidShards },
    { id: 'pool', from: T_LIGHT, parallax: 1, draw: drawWarmPool },
    { id: 'refract', from: T_LIGHT, parallax: 1, draw: drawRefractions },
    { id: 'glints2', from: T_LIGHT, parallax: 0.9, alpha: K(T_LIGHT, 0, T_LIGHT + 1.5, 1), draw: drawGlints },
    { id: 'spark', from: T_TURN + 0.6, parallax: 1, draw: drawSpark },
    { id: 'gold', from: T_LIGHT, parallax: 1, draw: drawGoldGlints },
    { id: 'near2', from: T_LIGHT, parallax: 1.3, alpha: K(T_LIGHT, 0, T_LIGHT + 1.2, 1), draw: drawNearShards },
    { id: 'light_text', from: T_LIGHT, parallax: 0, draw: drawLight },
  ],
  post: {
    ...openerPost(0.5),
    aberration: K(0, 0, T_DARK, 0, T_DARK + 0.01, 7, step, T_DARK + 0.5, 1.5, T_DARK + 2.6, 2.5, T_DARK + 2.61, 11, step, T_DARK + 3.1, 2.5, T_TURN - 0.01, 16, easeIn, T_TURN, 0, step),
    // the facets catch the light in two inverted frames when the walls wake — the "look: they shine" beat
    invert: K(0, 0, T_DARK + 0.18, 0, T_DARK + 0.19, 1, step, T_DARK + 0.24, 0, step, T_DARK + 0.42, 0, T_DARK + 0.43, 1, step, T_DARK + 0.47, 0, step),
  },
  cues: [
    { t: 0.1, sfx: 'chapter_card', vol: 0.9 },
    { t: T_PLACE + 0.2, sfx: 'landmark_reveal', vol: 0.35 },
    { t: T_DARK, sfx: 'boss_telegraph', vol: 0.55 },
    { t: T_DARK + 0.18, sfx: 'affix_shield_break', vol: 0.3 },     // the facets flash
    { t: T_DARK + 0.4, sfx: 'story_line', vol: 0.3 },
    { t: T_DARK + 2.6, sfx: 'ambush_ring', vol: 0.4 },             // the watcher locks on
    { t: T_TURN, sfx: 'boss_arrive', vol: 0.5 },
    { t: T_TURN + 0.6, sfx: 'pickup_essence', vol: 0.6 },
    { t: T_LIGHT + 0.2, sfx: 'shrine_touch', vol: 0.7 },
    { t: T_LIGHT + 0.5, sfx: 'story_line', vol: 0.3 },
    { t: T_LIGHT + 0.8, sfx: 'pickup_relic', vol: 0.3 },           // the first refraction
  ],
  shots: [
    { n: 1, from: 0, to: T_PLACE, what: 'Card on black: CHAPTER III tracks out, CRYSTAL DEPTHS assembles, violet rule grows.' },
    { n: 2, from: T_PLACE, to: T_DARK, what: 'Wide, slow crane down a shaft: shard clusters hang from the ceiling and rise from the floor in three parallax rows, 1200 glints sink past, a cold violet glow deep in the frame. Setup — the place is asleep.' },
    { n: 3, from: T_DARK, to: T_TURN, what: 'Two inverted flash frames, then a push-in that never stops with a roll: a pale failed spark wakes inside every shard, light-bars sweep the facets, the ghosts all drift toward the camera, an iris surfaces in the largest near shard and locks on. "Down here the walls remember every light that failed. Look: they shine."' },
    { n: 4, from: T_TURN, to: T_LIGHT, what: 'HARD CUT to black with a thud. 0.6 s of nothing, then one amber point low on the crystal floor. The turn.' },
    { n: 5, from: T_LIGHT, to: T_END, what: 'Gentle overshoot out: the spark on the floor, and the facets refract it — fourteen amber bars fan out across the shards one by one, glints turn gold, letterbox opens. "Then they were here. Then I am not the first." Fade.' },
  ],
};
export default opener_3;
