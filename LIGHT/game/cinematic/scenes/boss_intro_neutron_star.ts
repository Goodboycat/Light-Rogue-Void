// (M3) SCENE `boss_intro_neutron_star` — COLLAPSING NEUTRON, a point that bends the frame. Wave 40 boss spawn,
// gameplay hidden + paused, before the BossBar. 10 s. DARKNESS tone. The hero is not a shape — it is what the
// camera does: rotation that never settles, aberration that climbs with mass, a star field that falls inward.
//
// STORYBOARD (written first, keyframes derived from it — MOVIE.md §1.4)
// shot | start–end s | framing                  | camera move                                   | what changes on screen                                                                                                              | text                                                     | audio id
// -----|-------------|--------------------------|-----------------------------------------------|-------------------------------------------------------------------------------------------------------------------------------------|----------------------------------------------------------|------------------
//  1   |  0.0– 2.2   | wide, arena floor        | static                                        | the pool under the spark gutters; ink closes; motes sink; black                                                                     | —                                                        | boss_telegraph
//  2   |  2.2– 5.4   | wide, deep space         | slow push + slow roll that keeps accelerating | a cyan star field; dead centre a point of white smaller than a pixel; the stars nearest it start to slide inward along curved lines (lensing rings); a dust ring forms and spins; the frame has begun to rotate and does not stop | "Mass is the only truth."                                | ambush_ring, story_line
//  3   |  5.4– 7.8   | HARD CUT, the point      | cut tight, roll reverses hard, push continues | the point is still a point — but the space around it is a lens: the star field is pulled into a ring, a dark disc opens around the point (the horizon), the ring of light splits into 3 colours (aberration peak); the point blinks — once — a slit pupil of black inside the white; one inverted frame | "You will be made small."                                | boss_phase
//  4   |  7.8–10.0   | full                      | slam, the roll snaps back, drift in            | collapse: the dust ring falls into the point in 0.3 s, the star field is sucked after it, the horizon disc swallows the frame; flash; COLLAPSING NEUTRON lands; cyan rule; cut to black | IT HAS NOTICED YOU / COLLAPSING NEUTRON / "Fall." | boss_arrive, boss_enrage
// Structure: setup (1) → escalation (2: the frame itself is moving and cannot stop) → turn (3: the point blinks) → payoff (4: everything falls in).

import { K, step, easeIn, easeOut, easeInOut, easeInExpo, span, lerp, hash, wobble, clamp01 } from '../Engine';
import type { SceneDef, Gfx, LayerState } from '../Engine';
import { embers, gradientBg } from '../Draw';
import { glowDisc, rgba } from '../Sprites';
import { BT, arenaDark, bossLines, bossName, bossPost, bossShakes, bossCues } from './bossKit';

const NAME = 'COLLAPSING NEUTRON', COLOR = '#38bdf8', CYAN = '#38bdf8', PALE = '#e0f2fe', DEEP = '#0c4a6e';
const { rise: T_RISE, turn: T_TURN, name: T_NAME, end: T_END } = BT;
const T_FALL = T_NAME + 0.45;   // collapse

/** mass 0…1: how much the point bends space (drives lensing, dust ring radius, horizon disc) */
const mass = (t: number) => t < T_TURN ? easeIn(span(t, T_RISE + 0.3, T_TURN)) * 0.5 : t < T_FALL ? lerp(0.5, 0.85, easeInOut(span(t, T_TURN, T_FALL))) : lerp(0.85, 1, easeInExpo(span(t, T_FALL, T_FALL + 0.3)));
const HORIZON = (m: number) => lerp(0, 230, Math.max(0, m - 0.45) / 0.55);

const drawArena = (g: Gfx, L: LayerState) => arenaDark(g, L, BT);
const drawSpace = (g: Gfx, L: LayerState) => {
  const ctx = g.ctx; const t = g.t; const a = L.alpha * easeOut(span(t, T_RISE, T_RISE + 1.0));
  ctx.globalAlpha = a; gradientBg(g, '#010409', '#04101c', '#000000', 0.5);
  ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = a * 0.08 * (1 - mass(t) * 0.5); ctx.drawImage(glowDisc(DEEP, 256), -1600, -1100, 3200, 2200); ctx.globalCompositeOperation = 'source-over';
  ctx.globalAlpha = L.alpha;
};
/** star field that falls inward: each star's radius from the centre shrinks with mass along a spiral; the nearest go first.
 *  Drawn as one Path2D in two colour buckets (far = pale, near = cyan). Streaks appear when the fall is fast. */
const drawStars = (g: Gfx, L: LayerState) => {
  const ctx = g.ctx; const t = g.t; const a = L.alpha * easeOut(span(t, T_RISE, T_RISE + 1.2)); if (a <= 0) return;
  const m = mass(t); const fall = span(t, T_FALL, T_FALL + 0.5);
  const n = 520; const horizon = HORIZON(m);
  ctx.fillStyle = rgba(PALE, a * 0.85); ctx.beginPath();
  for (let i = 0; i < n; i++) {
    const h0 = hash(i, 4001), h1 = hash(i, 4002), h2 = hash(i, 4003);
    const r0 = 120 + h0 * h0 * 1500; const an0 = h1 * Math.PI * 2;
    // pull: nearer stars are pulled more; everything falls at T_FALL
    const pull = clamp01(m * m * (600 / r0)) * 0.7 + fall;
    const r = lerp(r0, horizon * 0.9, clamp01(pull));
    if (r < horizon) continue;                       // behind the horizon: gone
    const an = an0 + pull * 2.4 + t * 0.02 * (1 + m);   // frame-dragging: they spiral as they fall
    const x = Math.cos(an) * r, y = Math.sin(an) * r * 0.92;
    const sz = 0.8 + h2 * 2.2;
    ctx.moveTo(x + sz, y); ctx.arc(x, y, sz, 0, Math.PI * 2);
  }
  ctx.fill();
  // lensing rings: thin ellipses around the point, more of them as mass grows
  const rings = Math.floor(m * 9); if (rings > 0) {
    ctx.strokeStyle = rgba(CYAN, a * 0.25 * m); ctx.lineWidth = 1.2; ctx.beginPath();
    for (let k = 1; k <= rings; k++) { const rr = horizon + 40 + k * k * 22 + Math.sin(t * 2 + k) * 4; ctx.moveTo(rr, 0); ctx.ellipse(0, 0, rr, rr * 0.92, t * 0.1 * k, 0, Math.PI * 2); }
    ctx.stroke();
  }
};
/** the dust ring: an accretion disc that spins faster as mass grows; a band of embers with orbital drift */
const drawDust = (g: Gfx, L: LayerState) => {
  const ctx = g.ctx; const t = g.t; const m = mass(t); const a = L.alpha * easeOut(span(t, T_RISE + 0.8, T_TURN)); if (a <= 0) return;
  const fall = easeIn(span(t, T_FALL, T_FALL + 0.3));
  const R = lerp(520, 260, m) * (1 - fall); if (R < 10) return;
  const n = 900; const spin = t * (0.5 + m * 3);
  ctx.fillStyle = rgba(CYAN, a * 0.8); ctx.beginPath();
  for (let i = 0; i < n; i++) {
    const h0 = hash(i, 4011), h1 = hash(i, 4012);
    const rr = R * (0.75 + h0 * 0.5); const an = h1 * Math.PI * 2 + spin * (1.4 - h0 * 0.6);
    const x = Math.cos(an) * rr, y = Math.sin(an) * rr * 0.28;   // tilted disc
    const sz = 1 + hash(i, 4013) * 2;
    ctx.moveTo(x + sz, y); ctx.arc(x, y, sz, 0, Math.PI * 2);
  }
  ctx.fill();
  ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = a * 0.35; ctx.drawImage(glowDisc(CYAN, 256), -R * 1.3, -R * 0.5, R * 2.6, R * 1.0); ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = L.alpha;
};
/** the point + the horizon + the blink */
const drawPoint = (g: Gfx, L: LayerState) => {
  const ctx = g.ctx; const t = g.t; const a = L.alpha * easeOut(span(t, T_RISE + 0.2, T_RISE + 0.6)); if (a <= 0) return;
  const m = mass(t); const horizon = HORIZON(m);
  // the horizon disc: absolute black with a thin bright photon ring
  if (horizon > 1) {
    ctx.fillStyle = '#000'; ctx.beginPath(); ctx.arc(0, 0, horizon, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = rgba(PALE, a * 0.9); ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(0, 0, horizon + 2, 0, Math.PI * 2); ctx.stroke();
    ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = a * 0.5; ctx.drawImage(glowDisc(CYAN, 256), -horizon * 1.6, -horizon * 1.6, horizon * 3.2, horizon * 3.2); ctx.globalCompositeOperation = 'source-over';
  }
  // the point: a white speck; glows harder with mass; blinks at the turn — a slit of black opens in it
  const pr = 3 + m * 6 + wobble(t * 23, 7) * 0.8;
  const blinkT = T_TURN + 0.7; const blink = Math.sin(clamp01((t - blinkT) / 0.5) * Math.PI);
  const stare = easeOut(span(t, blinkT + 0.5, blinkT + 1.0));
  ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = a * (0.6 + m * 0.4); ctx.drawImage(glowDisc(PALE, 128), -pr * 12, -pr * 12, pr * 24, pr * 24); ctx.globalCompositeOperation = 'source-over';
  ctx.globalAlpha = a; ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(0, 0, pr * (1 + stare * 1.4), 0, Math.PI * 2); ctx.fill();
  if (blink > 0 || stare > 0) { const h = pr * 1.6 * Math.max(blink, stare), w = pr * 0.35 * Math.max(blink, stare); ctx.fillStyle = '#000'; ctx.beginPath(); ctx.ellipse(0, 0, w, h, 0, 0, Math.PI * 2); ctx.fill(); }
  ctx.globalAlpha = L.alpha;
};
/** the collapse payoff: the frame is sucked in — embers streaking inward, then the horizon swallows everything */
const drawCollapse = (g: Gfx, L: LayerState) => {
  const ctx = g.ctx; const t = g.t; const u = span(t, T_FALL, T_FALL + 0.9); if (u <= 0) return;
  embers(g, { n: 500, x: -1200, y: -800, w: 2400, h: 1600, rise: 0, drift: 0, rMin: 1, rMax: 3, colors: [CYAN, PALE, '#7dd3fc'], life: 0.8, seed: 4031 }, L.alpha * (1 - u) * 0.7, g.ta);
  // inward streaks: radial lines from the edge toward the centre, one path
  const n = 90; ctx.strokeStyle = rgba(PALE, L.alpha * (1 - u) * 0.6); ctx.lineWidth = 1.5; ctx.beginPath();
  for (let i = 0; i < n; i++) { const an = hash(i, 4041) * Math.PI * 2; const r1 = 400 + hash(i, 4042) * 1400; const r0 = r1 * (1 - easeIn(u) * 0.9); ctx.moveTo(Math.cos(an) * r1, Math.sin(an) * r1); ctx.lineTo(Math.cos(an) * r0, Math.sin(an) * r0); }
  ctx.stroke();
  // the horizon grows to eat the frame
  const R = lerp(230, 2600, easeInExpo(span(t, T_FALL + 0.3, T_END - 0.2)));
  ctx.fillStyle = '#000'; ctx.beginPath(); ctx.arc(0, 0, R, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = rgba(PALE, L.alpha * 0.8); ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(0, 0, R + 2, 0, Math.PI * 2); ctx.stroke();
};
const drawText = (g: Gfx, L: LayerState) => bossLines(g, L, ['Mass is the only truth.', 'You will be made small.', 'Fall.']);
const drawName = (g: Gfx, L: LayerState) => bossName(g, L, NAME, COLOR);

export const boss_intro_neutron_star: SceneDef = {
  id: 'boss_intro_neutron_star',
  duration: T_END,
  skipAfter: 0.6,
  camera: {
    zoom: K(0, 1, T_RISE, 0.95, T_TURN - 0.01, 1.25, easeIn, T_TURN, 2.4, step, T_NAME - 0.01, 3.0, easeIn, T_NAME, 1.0, step, T_FALL, 1.0, T_END, 1.3, easeIn),
    x: K(0, 0), y: K(0, 0, T_RISE, 40, T_TURN - 0.01, 0, easeInOut, T_TURN, 0, step),
    // the roll is the hero: shot 2 accelerates into a 0.5 rad roll, the cut reverses it hard to −0.35, shot 3 keeps
    // rolling the other way to −0.9, the name slams it back to 0, and it never fully settles (drifts to 0.06)
    rot: K(0, 0, T_RISE, 0, T_TURN - 0.01, 0.5, easeIn, T_TURN, -0.35, step, T_NAME - 0.01, -0.9, easeIn, T_NAME, 0, step, T_END, 0.06),
    shakes: [...bossShakes(BT), { t: T_TURN + 0.7, amp: 5, decay: 3, freq: 14 }, { t: T_FALL, amp: 14, decay: 3, freq: 30 }],
  },
  layers: [
    { id: 'arena', from: 0, to: T_RISE + 0.2, parallax: 0.2, alpha: K(0, 1, T_RISE - 0.1, 1, T_RISE + 0.2, 0), draw: drawArena },
    { id: 'space', from: T_RISE, parallax: 0.1, draw: drawSpace },
    { id: 'stars', from: T_RISE, parallax: 0.5, draw: drawStars },
    { id: 'dust', from: T_RISE + 0.8, to: T_FALL + 0.3, parallax: 0.8, draw: drawDust },
    { id: 'point', from: T_RISE + 0.2, parallax: 1, draw: drawPoint },
    { id: 'collapse', from: T_FALL, parallax: 1, draw: drawCollapse },
    { id: 'lines', from: T_RISE, parallax: 0, draw: drawText },
    { id: 'name', from: T_NAME, parallax: 0, draw: drawName },
  ],
  // aberration climbs WITH mass (it is the lens), not just at the spikes
  post: { ...bossPost(BT, 0.8), aberration: K(0, 0, T_RISE, 0, T_TURN - 0.01, 9, easeIn, T_TURN, 26, step, T_TURN + 0.5, 12, easeOut, T_NAME - 0.01, 20, easeIn, T_NAME, 30, step, T_NAME + 0.4, 6, easeOut, T_FALL, 24, easeIn, T_END - 0.3, 8, T_END, 0) },
  cues: [...bossCues(BT), { t: T_RISE + 1.0, sfx: 'meteor_warn', vol: 0.3 }, { t: T_TURN + 0.7, sfx: 'ui_unlock', vol: 0.35 }, { t: T_FALL, sfx: 'meteor_hit', vol: 0.8 }],
  shots: [
    { n: 1, from: 0, to: T_RISE, what: 'Arena floor: the warm pool gutters, ink closes from the edges, motes sink. Black. Setup.' },
    { n: 2, from: T_RISE, to: T_TURN, what: 'Deep space, slow push + a roll that keeps accelerating (0 → 0.5 rad): a pale star field around a point smaller than a pixel; the nearest stars slide inward along spirals, lensing rings appear, a tilted dust disc forms and spins faster. "Mass is the only truth." Escalation — the frame itself cannot stop moving.' },
    { n: 3, from: T_TURN, to: T_NAME, what: 'HARD CUT tight on the point (zoom 2.4), the roll reverses hard (−0.35 → −0.9) + inverted frame: a black horizon disc opens around the point with a photon ring, aberration peaks (the ring splits into three colours); the point blinks — a slit of black inside the white — and stares. "You will be made small." The turn.' },
    { n: 4, from: T_NAME, to: T_END, what: 'Slam, roll snaps to 0: collapse — the dust disc falls in over 0.3 s, the stars streak inward, the horizon grows to swallow the frame; flash; COLLAPSING NEUTRON lands with a cyan rule; "Fall." Cut to black → BossBar. Payoff.' },
  ],
};
export default boss_intro_neutron_star;
