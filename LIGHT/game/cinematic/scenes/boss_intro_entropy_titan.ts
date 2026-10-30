// (M3) SCENE `boss_intro_entropy_titan` — ENTROPY TITAN, a mountain that stands up. Wave 50 boss spawn, gameplay
// hidden + paused, before the BossBar. 10 s. DARKNESS tone.
//
// STORYBOARD (written first, keyframes derived from it — MOVIE.md §1.4)
// shot | start–end s | framing                 | camera move                             | what changes on screen                                                                                                                | text                                                        | audio id
// -----|-------------|-------------------------|-----------------------------------------|---------------------------------------------------------------------------------------------------------------------------------------|-------------------------------------------------------------|------------------
//  1   |  0.0– 2.2   | wide, arena floor       | static                                  | the pool under the spark gutters; ink closes; motes sink; black                                                                       | —                                                           | boss_telegraph
//  2   |  2.2– 5.4   | very wide, landscape    | slow push-in + slow tilt up             | a dead plain under an acid-green sky-glow; three ridgelines; ash falls; the far mountain is wrong — its ridge moves; stones roll uphill; the mountain is lifting: a shoulder, then an arm the width of a valley plants a fist in the plain | "Everything you build is already dust."                     | ambush_ring, story_line
//  3   |  5.4– 7.8   | HARD CUT, the head      | cut tight on the summit, push, tilt     | the summit is a head; cracks race across it in a lattice of acid light; two cracks widen and are EYES — green fissures that find the lens; boulders calve off and hang in the air; one inverted frame | "I am what is left when the rest has gone."                 | boss_phase
//  4   |  7.8–10.0   | full                    | slam back, drift in                     | the Titan stands: the whole mountain rises on two legs, the plain shatters in rings, the sky-glow dims under its shadow; flash; ENTROPY TITAN lands; green rule; cut to black | IT HAS NOTICED YOU / ENTROPY TITAN / "Sit down with me." | boss_arrive, boss_enrage
// Structure: setup (1) → escalation (2: the landscape is a body) → turn (3: the summit opens its eyes) → payoff (4: it stands).

import { K, step, easeIn, easeOut, easeInOut, easeInExpo, span, lerp, hash, wobble, clamp01 } from '../Engine';
import type { SceneDef, Gfx, LayerState } from '../Engine';
import { embers, gradientBg, ridge } from '../Draw';
import { glowDisc, rgba } from '../Sprites';
import { BT, arenaDark, bossLines, bossName, bossPost, bossShakes, bossCues } from './bossKit';

const NAME = 'ENTROPY TITAN', COLOR = '#84cc16', ACID = '#84cc16', PALE = '#d9f99d', ROCK = '#05070a', ROCK2 = '#0b1016';
const { rise: T_RISE, turn: T_TURN, name: T_NAME, end: T_END } = BT;
const T_STAND = T_NAME + 0.45;

/** 0…1 how far the Titan has risen from the plain: shot 2 lifts the shoulder (→0.35), shot 3 holds, shot 4 stands */
const rise = (t: number) => t < T_TURN ? easeInOut(span(t, T_RISE + 0.9, T_TURN)) * 0.35 : t < T_STAND ? 0.35 + 0.05 * easeInOut(span(t, T_TURN, T_STAND)) : lerp(0.4, 1, easeOut(span(t, T_STAND, T_STAND + 1.2)));

const drawArena = (g: Gfx, L: LayerState) => arenaDark(g, L, BT);
const drawSky = (g: Gfx, L: LayerState) => {
  const ctx = g.ctx; const t = g.t; const a = L.alpha * easeOut(span(t, T_RISE, T_RISE + 1.2)); const shadow = easeOut(span(t, T_STAND, T_STAND + 1.0));
  ctx.globalAlpha = a; gradientBg(g, '#030604', '#0a1a0a', '#000000', 0.55);
  // acid horizon glow, dimmed by the Titan's shadow when it stands
  ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = a * 0.22 * (1 - shadow * 0.8); ctx.drawImage(glowDisc(ACID, 256), -2200, -200, 4400, 1300); ctx.globalCompositeOperation = 'source-over';
  // ash falling (slow, sideways)
  embers(g, { n: 520, x: -1500, y: -1000, w: 3000, h: 2000, rise: -55, drift: 35, rMin: 1, rMax: 3, colors: ['#3f3f46', '#52525b', '#27272a'], life: 7, seed: 5001 }, a * 0.8, g.ta);
  ctx.globalAlpha = L.alpha;
};
const drawFarRidges = (g: Gfx, L: LayerState) => {
  const ctx = g.ctx; const t = g.t; const a = L.alpha * easeOut(span(t, T_RISE + 0.1, T_RISE + 1.3)); if (a <= 0) return;
  ctx.globalAlpha = a; ridge(g, 330, 160, 5011, '#070b0e', 3200, 56); ridge(g, 420, 110, 5012, '#04070a', 3200, 48); ctx.globalAlpha = L.alpha;
};
/** the Titan: a mountain silhouette whose summit is a head. Body = one polygon; its upper half rises with `rise`;
 *  at the stand two leg-masses pull out of the plain. Crack lattice + eyes live in `face`. */
function titanBody(g: Gfx, a: number) {
  const ctx = g.ctx; const t = g.t; const r = rise(t); if (a <= 0) return;
  const lift = r * 700;                                  // the whole body rises
  const breathe = Math.sin(t * 0.6) * 6 * r;
  ctx.save(); ctx.translate(0, -lift + breathe);
  ctx.fillStyle = ROCK;
  // mountain: wide base below the frame, slopes, a shoulder on the left that lifts first, the head/summit at centre
  const sh = -r * 160;                                    // the left shoulder rises more
  ctx.beginPath(); ctx.moveTo(-1900, 1500 + lift);
  ctx.lineTo(-1500, 620); ctx.lineTo(-1100, 420 + sh); ctx.lineTo(-760, 180 + sh); ctx.lineTo(-520, 60 + sh * 0.6);
  // head: a rounded summit block
  ctx.lineTo(-300, -60); ctx.bezierCurveTo(-280, -300, -120, -420, 0, -430); ctx.bezierCurveTo(120, -420, 280, -300, 300, -60);
  ctx.lineTo(540, 90); ctx.lineTo(820, 240); ctx.lineTo(1150, 460); ctx.lineTo(1500, 640); ctx.lineTo(1900, 1500 + lift); ctx.closePath(); ctx.fill();
  // the arm: a valley-wide limb that reaches out of the slope and plants a fist in the plain (shot 2)
  const arm = easeOut(span(t, T_RISE + 1.6, T_TURN - 0.2));
  if (arm > 0) { ctx.beginPath(); ctx.moveTo(-760, 180 + sh); ctx.lineTo(lerp(-760, -1500, arm), lerp(180 + sh, 500, arm)); ctx.lineTo(lerp(-760, -1620, arm), lerp(300 + sh, 740, arm)); ctx.lineTo(lerp(-760, -1250, arm), lerp(380 + sh, 820, arm)); ctx.lineTo(-620, 420 + sh * 0.5); ctx.closePath(); ctx.fill();
    // the fist: a block
    ctx.fillRect(lerp(-1500, -1700, arm), lerp(520, 640, arm), 260 * arm, 220 * arm); }
  // legs at the stand: two dark masses pull out of the plain under the body
  const legs = easeOut(span(t, T_STAND, T_STAND + 1.0));
  if (legs > 0) { ctx.beginPath(); ctx.moveTo(-900, 900 + lift * 0.2); ctx.lineTo(-700, 1500 + lift); ctx.lineTo(-250, 1500 + lift); ctx.lineTo(-380, 800); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(380, 800); ctx.lineTo(250, 1500 + lift); ctx.lineTo(700, 1500 + lift); ctx.lineTo(900, 900 + lift * 0.2); ctx.closePath(); ctx.fill(); }
  // rim: one acid hairline along the lit (left) edge of the head and shoulder
  ctx.strokeStyle = rgba(ACID, 0.35 * a); ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-760, 180 + sh); ctx.lineTo(-520, 60 + sh * 0.6); ctx.lineTo(-300, -60); ctx.bezierCurveTo(-280, -300, -120, -420, 0, -430); ctx.stroke();
  ctx.restore();
}
const drawTitan = (g: Gfx, L: LayerState) => titanBody(g, L.alpha * easeOut(span(g.t, T_RISE + 0.2, T_RISE + 1.4)));
/** the face: the crack lattice across the summit and the two fissure-eyes; drawn in the body's lifted frame */
const drawFace = (g: Gfx, L: LayerState) => {
  const ctx = g.ctx; const t = g.t; const r = rise(t); const lift = r * 700 - Math.sin(t * 0.6) * 6 * r;
  const cracks = easeOut(span(t, T_TURN + 0.1, T_TURN + 1.0)); if (cracks <= 0) return;
  ctx.save(); ctx.translate(0, -lift);
  // lattice: branching segments across the head, one path; brightness pulses
  const n = 34; const pulse = 0.7 + 0.3 * Math.sin(t * 5);
  ctx.strokeStyle = rgba(ACID, L.alpha * 0.85 * cracks * pulse); ctx.lineWidth = 2.2; ctx.beginPath();
  for (let i = 0; i < n; i++) {
    let x = (hash(i, 5021) - 0.5) * 520, y = -400 + hash(i, 5022) * 330; ctx.moveTo(x, y);
    const segs = 5; for (let s = 0; s < segs; s++) { const u = (s + 1) / segs; if (u > cracks) break; const an = hash(i * 7 + s, 5023) * Math.PI * 2; x += Math.cos(an) * 50; y += Math.sin(an) * 40; ctx.lineTo(x, y); }
  }
  ctx.stroke();
  ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = L.alpha * 0.25 * cracks; ctx.drawImage(glowDisc(ACID, 256), -420, -560, 840, 560); ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = L.alpha;
  // eyes: two fissures that widen, then the frame of each tracks to the lens
  const open = easeOut(span(t, T_TURN + 0.6, T_TURN + 1.3)); const look = easeInOut(span(t, T_TURN + 1.3, T_TURN + 1.9));
  if (open > 0) for (const sx of [-1, 1]) {
    const ex = sx * 115 + lerp(-14, 0, look), ey = -230 + lerp(10, 0, look); const w = 85 * open, h = 26 * open;
    ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = L.alpha * open * 0.9; ctx.drawImage(glowDisc(ACID, 128), ex - w * 2, ey - w * 2, w * 4, w * 4); ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = L.alpha; ctx.fillStyle = PALE; ctx.beginPath(); ctx.moveTo(ex - w, ey); ctx.quadraticCurveTo(ex, ey - h * 1.6, ex + w, ey); ctx.quadraticCurveTo(ex, ey + h * 1.6, ex - w, ey); ctx.fill();
    ctx.fillStyle = '#000'; ctx.beginPath(); ctx.arc(ex + sx * 10 * (1 - look), ey, h * 0.6, 0, Math.PI * 2); ctx.fill();
  }
  // calving boulders: hang in the air (gravity is a suggestion here), one path
  if (cracks > 0.3) { ctx.fillStyle = ROCK2; ctx.beginPath(); for (let i = 0; i < 26; i++) { const h0 = hash(i, 5031), h1 = hash(i, 5032); const bx = (h0 - 0.5) * 900, by = -480 + h1 * 500 - (cracks - 0.3) * 120 * h1 + wobble(t * 0.5 + i, 5033) * 8; const s = 8 + hash(i, 5034) * 26; ctx.moveTo(bx + s, by); ctx.lineTo(bx + s * 0.3, by - s); ctx.lineTo(bx - s, by - s * 0.4); ctx.lineTo(bx - s * 0.6, by + s * 0.7); ctx.closePath(); } ctx.fill(); }
  ctx.restore();
};
/** the stand payoff: the plain shatters in rings, dust rises, shards fly */
const drawShatter = (g: Gfx, L: LayerState) => {
  const ctx = g.ctx; const t = g.t; const u = span(t, T_STAND, T_STAND + 1.4); if (u <= 0) return;
  const rings = 5; ctx.strokeStyle = rgba(PALE, L.alpha * 0.7 * (1 - u)); ctx.lineWidth = 3; ctx.beginPath();
  for (let k = 0; k < rings; k++) { const rr = easeOut(clamp01(u * 1.6 - k * 0.15)) * 1900; if (rr <= 0) continue; ctx.moveTo(rr, 760); ctx.ellipse(0, 760, rr, rr * 0.22, 0, 0, Math.PI * 2); }
  ctx.stroke();
  embers(g, { n: 900, x: -1600, y: 500, w: 3200, h: 500, rise: 420, drift: 160, rMin: 1.5, rMax: 5, colors: ['#3f3f46', ACID, '#71717a'], life: 1.6, seed: 5041 }, L.alpha * (1 - u) * 0.9, g.ta);
};
const drawText = (g: Gfx, L: LayerState) => bossLines(g, L, ['Everything you build is already dust.', 'I am what is left when the rest has gone.', 'Sit down with me.']);
const drawName = (g: Gfx, L: LayerState) => bossName(g, L, NAME, COLOR);

export const boss_intro_entropy_titan: SceneDef = {
  id: 'boss_intro_entropy_titan',
  duration: T_END,
  skipAfter: 0.6,
  camera: {
    zoom: K(0, 1, T_RISE, 0.82, T_TURN - 0.01, 1.0, easeIn, T_TURN, 2.3, step, T_NAME - 0.01, 2.7, easeIn, T_NAME, 0.78, step, T_END, 0.86),
    x: K(0, 0, T_TURN - 0.01, 0, T_TURN, 0, step, T_END, 0),
    // shot 2 tilts up from the plain to the slope; shot 3 is tight on the head (head centre ≈ −250 − lift 245 = −495 at rise 0.35); shot 4 wide, the body rises so the camera settles high
    y: K(0, 0, T_RISE, 260, T_TURN - 0.01, -60, easeInOut, T_TURN, -500, step, T_NAME - 0.01, -520, T_NAME, -120, step, T_END, -300, easeOut),
    rot: K(0, 0, T_TURN, 0, T_NAME - 0.01, -0.04, easeIn, T_NAME, 0, step, T_STAND, 0, T_STAND + 0.1, 0.02, T_END, 0),
    shakes: [...bossShakes(BT), { t: T_RISE + 1.8, amp: 6, decay: 1.5, freq: 5 }, { t: T_TURN + 0.6, amp: 4, decay: 2, freq: 8 }, { t: T_STAND, amp: 26, decay: 2.2, freq: 7 }],
  },
  layers: [
    { id: 'arena', from: 0, to: T_RISE + 0.2, parallax: 0.2, alpha: K(0, 1, T_RISE - 0.1, 1, T_RISE + 0.2, 0), draw: drawArena },
    { id: 'sky', from: T_RISE, parallax: 0.1, draw: drawSky },
    { id: 'ridges', from: T_RISE + 0.1, parallax: 0.35, draw: drawFarRidges },
    { id: 'titan', from: T_RISE + 0.2, parallax: 0.75, draw: drawTitan },
    { id: 'face', from: T_TURN, parallax: 0.75, draw: drawFace },
    { id: 'shatter', from: T_STAND, parallax: 0.9, draw: drawShatter },
    { id: 'lines', from: T_RISE, parallax: 0, draw: drawText },
    { id: 'name', from: T_NAME, parallax: 0, draw: drawName },
  ],
  post: bossPost(BT, 0.85),
  cues: [...bossCues(BT), { t: T_RISE + 1.8, sfx: 'meteor_hit', vol: 0.5 }, { t: T_TURN + 0.6, sfx: 'affix_shield_break', vol: 0.35 }, { t: T_STAND, sfx: 'meteor_hit', vol: 0.9 }, { t: T_STAND + 0.4, sfx: 'arena_burn', vol: 0.5 }],
  shots: [
    { n: 1, from: 0, to: T_RISE, what: 'Arena floor: the warm pool gutters, ink closes from the edges, motes sink. Black. Setup.' },
    { n: 2, from: T_RISE, to: T_TURN, what: 'Very wide, slow push + tilt up: a dead plain under an acid-green horizon glow, two far ridgelines, ash falling sideways. The near mountain is wrong — its left shoulder lifts, an arm the width of a valley reaches out and plants a fist in the plain (thud). "Everything you build is already dust." Escalation — the landscape is a body.' },
    { n: 3, from: T_TURN, to: T_NAME, what: 'HARD CUT tight on the summit (zoom 2.3) + inverted frame: a lattice of acid cracks races across the head; two cracks widen into fissure-eyes that find the lens; boulders calve off and hang in the air. "I am what is left when the rest has gone." The turn.' },
    { n: 4, from: T_NAME, to: T_END, what: 'Slam back to very wide (zoom 0.78): the Titan STANDS — the whole mountain rises on two legs, the plain shatters in rings, dust and shards go up, the horizon glow dims in its shadow; flash; ENTROPY TITAN lands with a green rule; "Sit down with me." Cut to black → BossBar. Payoff.' },
  ],
};
export default boss_intro_entropy_titan;
