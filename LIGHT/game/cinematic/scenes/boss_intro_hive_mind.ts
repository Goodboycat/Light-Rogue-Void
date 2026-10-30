// (M3) SCENE `boss_intro_hive_mind` — THE HIVE MIND, a wall of mandibles. Plays at the boss spawn of wave 10,
// gameplay hidden + paused, before the BossBar mounts. 10 s. DARKNESS tone throughout (MOVIE.md §0).
//
// STORYBOARD (written first, keyframes derived from it — MOVIE.md §1.4)
// shot | start–end s | framing                | camera move                         | what changes on screen                                                                                         | text                                   | audio id
// -----|-------------|------------------------|-------------------------------------|----------------------------------------------------------------------------------------------------------------|----------------------------------------|------------------
//  1   |  0.0– 2.2   | wide, the arena floor  | static, tiny breathing               | the warm pool of light under the spark gutters; ink closes from every edge; black motes sink; the floor is gone | —                                      | boss_telegraph
//  2   |  2.2– 5.4   | wide → medium          | push-in that never stops             | out of the black: rows of chitin mandibles, four tiers deep, each tier a different depth, opening/closing out of phase; yellow chitin rims catch a light that isn't there; a wet hum | "Do you hear the scratching?" | ambush_ring, story_line
//  3   |  5.4– 7.8   | HARD CUT, tight         | cut closer, slow push, shake decays | every mandible STOPS mid-bite in the same frame; in the gaps between them 600 tiny yellow eyes open at once and all of them point at the lens; one inverted frame | "The swarm hungers for your warmth." | boss_phase, meteor_warn
//  4   |  7.8–10.0   | tight → full           | slam back, then drift in            | the mandibles lunge — the whole wall snaps shut on the camera; flash; THE HIVE MIND lands glyph by glyph in bone-white with a yellow rule; cut to black | IT HAS NOTICED YOU / THE HIVE MIND / "Feed them." | boss_arrive, boss_enrage
// Structure: setup (1: the light is eaten) → escalation (2: the wall is alive and infinite) → turn (3: the wall stops and looks) → payoff (4: it bites, the name).

import { K, step, easeIn, easeOut, easeInOut, span, lerp, hash, wobble, clamp01 } from '../Engine';
import type { SceneDef, Gfx, LayerState } from '../Engine';
import { INK, embers, eyeField, gradientBg } from '../Draw';
import { glowDisc, rgba } from '../Sprites';
import { BT, arenaDark, bossLines, bossName, bossPost, bossZoom, bossShakes, bossCues } from './bossKit';

const NAME = 'THE HIVE MIND', COLOR = '#fde047', CHITIN = '#ca8a04', WET = '#a3e635';
const { rise: T_RISE, turn: T_TURN, name: T_NAME, end: T_END } = BT;
const T_BITE = T_NAME + 0.45;

/** bite phase 0 (open) … 1 (shut) for mandible i of tier k at time t: out-of-phase chewing in shot 2, frozen at
 *  the turn, then the lunge at the bite. */
const bite = (i: number, k: number, t: number) => {
  if (t >= T_BITE) return 1;
  const chew = 0.5 + 0.5 * Math.sin(t * (1.6 + hash(i, 101 + k) * 1.4) + hash(i, 102 + k) * 6.28);
  const stopAt = T_TURN; const frozen = 0.5 + 0.5 * Math.sin(stopAt * (1.6 + hash(i, 101 + k) * 1.4) + hash(i, 102 + k) * 6.28);
  const f = t < stopAt ? chew : frozen;
  const lunge = easeIn(span(t, T_BITE - 0.35, T_BITE));
  return lerp(f, 1, lunge);
};

/** One tier of mandibles across the frame: `n` pairs, hinge y, length, tint. Upper and lower jaws are jagged
 *  crescents filled INK with a hairline chitin rim; one path per jaw row, one path for the rims. */
function tier(g: Gfx, k: number, y: number, n: number, len: number, rim: number, reach: number) {
  const ctx = g.ctx; const t = g.t; if (reach <= 0) return;
  const w = 2800 / n;
  ctx.fillStyle = INK; ctx.beginPath();
  const rims = new Path2D();
  for (let i = 0; i < n; i++) {
    const cx = -1400 + (i + 0.5) * w + wobble(t * 0.4 + i, 110 + k) * 8;
    const b = bite(i, k, t); const L = len * (0.7 + hash(i, 103 + k) * 0.6) * reach;
    const gap = (1 - b) * L * 0.55;
    for (const s of [-1, 1] as const) {
      // crescent: hinge at (cx, y ∓ gap) → tip curling inward; 5 teeth on the inner edge
      const hy = y - s * gap; const tip = hy + s * L * 0.1; const tx = cx + w * 0.55;
      ctx.moveTo(cx - w * 0.55, hy - s * L * 0.3);
      ctx.quadraticCurveTo(cx, hy - s * L * 0.45, tx, hy - s * L * 0.1);
      ctx.quadraticCurveTo(cx + w * 0.3, tip, cx + w * 0.1, hy + s * L * 0.02);
      for (let j = 4; j >= 0; j--) { const u = j / 4; ctx.lineTo(cx - w * 0.5 + u * w * 0.55, hy + s * L * (0.02 + (j & 1 ? 0.14 : 0.03))); }
      ctx.closePath();
      rims.moveTo(cx - w * 0.55, hy - s * L * 0.3); rims.quadraticCurveTo(cx, hy - s * L * 0.45, tx, hy - s * L * 0.1);
    }
  }
  ctx.fill();
  ctx.strokeStyle = rgba(CHITIN, rim); ctx.lineWidth = 2.5; ctx.stroke(rims);
}

const drawArena = (g: Gfx, L: LayerState) => arenaDark(g, L, BT);
const drawDeep = (g: Gfx, L: LayerState) => {
  // the hive's depth: dim yellow-brown breath far behind the wall, and 200 drifting spores
  const ctx = g.ctx; const t = g.t; const a = L.alpha * easeOut(span(t, T_RISE, T_RISE + 1.2));
  ctx.globalAlpha = a; gradientBg(g, '#000000', '#0c0903', '#000000', 0.5);
  ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = a * (0.12 + 0.04 * Math.sin(t * 2.3));
  ctx.drawImage(glowDisc(CHITIN, 256), -1100, -500, 2200, 1000); ctx.globalCompositeOperation = 'source-over';
  embers(g, { n: 220, x: -1300, y: -700, w: 2600, h: 1400, rise: 12, drift: 30, rMin: 1, rMax: 3, colors: [CHITIN, WET, '#78350f'], life: 7, seed: 921, glow: 2 }, a * 0.5, g.ta);
  ctx.globalAlpha = L.alpha;
};
const drawFar = (g: Gfx, L: LayerState) => { tier(g, 3, -260, 22, 160, 0.18 * L.alpha, easeOut(span(g.t, T_RISE + 0.9, T_RISE + 2.2))); tier(g, 2, 240, 22, 160, 0.18 * L.alpha, easeOut(span(g.t, T_RISE + 1.0, T_RISE + 2.3))); };
const drawMid = (g: Gfx, L: LayerState) => { tier(g, 1, -40, 12, 300, 0.45 * L.alpha, easeOut(span(g.t, T_RISE + 0.4, T_RISE + 1.8))); };
const drawNear = (g: Gfx, L: LayerState) => { tier(g, 0, 40, 6, 620, 0.7 * L.alpha, easeOut(span(g.t, T_RISE, T_RISE + 1.5))); };
const drawEyes = (g: Gfx, L: LayerState) => {
  // the turn: 600 eyes open in the gaps in one frame and hold the stare until the bite
  const t = g.t; const open = t < T_TURN ? 0 : (1 - easeIn(span(t, T_BITE - 0.3, T_BITE)));
  if (open <= 0) return;
  g.ctx.globalAlpha = L.alpha;
  // batched: tiny yellow dots + a glow per 8th — the Draw.eye() is for hero eyes; these are a swarm
  const ctx = g.ctx; const spr = glowDisc(COLOR, 64); ctx.fillStyle = COLOR; ctx.beginPath();
  for (let i = 0; i < 600; i++) {
    const h0 = hash(i, 931), h1 = hash(i, 932), h2 = hash(i, 933);
    const x = (h0 - 0.5) * 2700, y = (h1 - 0.5) * 1500; const r = (1.2 + h2 * 2.6) * open;
    const blink = Math.sin(t * (2 + h2 * 3) + i) > -0.92 ? 1 : 0; if (!blink) continue;
    ctx.moveTo(x + r, y); ctx.arc(x, y, r, 0, Math.PI * 2);
    if ((i & 7) === 0) { ctx.globalAlpha = L.alpha * 0.5 * open; ctx.drawImage(spr, x - r * 5, y - r * 5, r * 10, r * 10); ctx.globalAlpha = L.alpha; }
  }
  ctx.fill();
  eyeField(g, 24, 941, 1200, open * 0.8, t);
};
const drawDrool = (g: Gfx, L: LayerState) => {
  // wet strands between the jaws of the near tier (shot 2–3): 6 catenaries, one stroke
  const ctx = g.ctx; const t = g.t; const a = L.alpha * easeOut(span(t, T_RISE + 1.2, T_RISE + 2)) * (1 - span(t, T_BITE - 0.2, T_BITE));
  if (a <= 0) return;
  ctx.strokeStyle = rgba(WET, 0.45 * a); ctx.lineWidth = 2; ctx.beginPath();
  for (let i = 0; i < 6; i++) { const x = -1100 + (i + 0.5) * 2200 / 6 + wobble(t + i, 951) * 12; const b = bite(i, 0, t); const g2 = (1 - b) * 340; ctx.moveTo(x - 20, -g2 * 0.5 + 40); ctx.quadraticCurveTo(x + 10, g2 * 0.25 + 60 + Math.sin(t * 3 + i) * 10, x + 25, g2 * 0.5 + 40); }
  ctx.stroke();
};
const drawText = (g: Gfx, L: LayerState) => bossLines(g, L, ['Do you hear the scratching?', 'The swarm hungers for your warmth.', 'Feed them.']);
const drawName = (g: Gfx, L: LayerState) => bossName(g, L, NAME, COLOR);

export const boss_intro_hive_mind: SceneDef = {
  id: 'boss_intro_hive_mind',
  duration: T_END,
  skipAfter: 0.6,
  camera: {
    zoom: bossZoom(BT, 1.5),
    x: K(0, 0, T_RISE, 0, T_TURN - 0.01, -60, easeIn, T_TURN, 30, step, T_END, 0),
    y: K(0, 0, T_RISE, 20, T_TURN - 0.01, -20, easeInOut, T_TURN, 0, step, T_BITE, 0, T_BITE + 0.01, 10, T_END, -10),
    rot: K(0, 0, T_TURN - 0.01, 0.015, easeIn, T_TURN, -0.02, step, T_NAME, -0.02, T_END, 0.01),
    shakes: [...bossShakes(BT), { t: T_RISE + 1.5, amp: 2, decay: 1, freq: 18, dur: 3.5 }],
  },
  layers: [
    { id: 'arena', from: 0, to: T_RISE + 0.2, parallax: 0.2, alpha: K(0, 1, T_RISE - 0.1, 1, T_RISE + 0.2, 0), draw: drawArena },
    { id: 'deep', from: T_RISE, parallax: 0.1, draw: drawDeep },
    { id: 'far', from: T_RISE + 0.8, parallax: 0.45, draw: drawFar },
    { id: 'mid', from: T_RISE + 0.3, parallax: 0.8, draw: drawMid },
    { id: 'eyes', from: T_TURN, to: T_BITE, parallax: 0.9, draw: drawEyes },
    { id: 'drool', from: T_RISE + 1, to: T_BITE, parallax: 1.2, draw: drawDrool },
    { id: 'near', from: T_RISE, parallax: 1.25, draw: drawNear },
    { id: 'lines', from: T_RISE, parallax: 0, draw: drawText },
    { id: 'name', from: T_NAME, parallax: 0, draw: drawName },
  ],
  post: bossPost(BT, 0.8),
  cues: [...bossCues(BT), { t: T_RISE + 0.9, sfx: 'enemy_die_small', vol: 0.2 }, { t: T_TURN + 0.05, sfx: 'meteor_warn', vol: 0.4 }, { t: T_BITE - 0.3, sfx: 'boss_fire', vol: 0.5 }],
  shots: [
    { n: 1, from: 0, to: T_RISE, what: 'The arena floor: a warm pool under where the spark stood gutters; ink closes from every edge; black motes sink. The light is eaten. Setup.' },
    { n: 2, from: T_RISE, to: T_TURN, what: 'Push-in that never stops: four tiers of chitin mandibles rise out of the black at four depths, chewing out of phase; wet strands between the near jaws; 220 spores drift. "Do you hear the scratching?" Escalation — the wall is alive and has no end.' },
    { n: 3, from: T_TURN, to: T_NAME, what: 'HARD CUT closer + inverted frame: every mandible stops mid-bite in the same frame and 600 yellow eyes open in the gaps, all pointed at the lens. "The swarm hungers for your warmth." The turn — it noticed the camera.' },
    { n: 4, from: T_NAME, to: T_END, what: 'The whole wall lunges and snaps shut on the camera; flash; THE HIVE MIND lands glyph by glyph with a yellow rule; "Feed them." Cut to black — the BossBar mounts on the other side. Payoff.' },
  ],
};
export default boss_intro_hive_mind;
