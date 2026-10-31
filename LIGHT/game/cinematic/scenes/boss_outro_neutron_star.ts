// (M4) SCENE `boss_outro_neutron_star` — the point lets go of the frame. Plays the frame COLLAPSING NEUTRON's HP hits 0,
// gameplay hidden + paused; `onDone` → completeBossWave → MapBreather (the place reveal is shot 3 of this film). 9.2 s.
//
// STORYBOARD (written first, keyframes derived from it — MOVIE.md §1.4)
// shot | start–end s | framing                    | camera move                              | what changes on screen                                                                                                                 | text                                                   | audio id
// -----|-------------|----------------------------|------------------------------------------|----------------------------------------------------------------------------------------------------------------------------------------|--------------------------------------------------------|------------------
//  1   |  0.0– 2.0   | the point, tight           | the intro's roll, decelerating to 0      | the horizon disc frozen with its photon ring; the roll that never stopped is STOPPING; amber cracks run through the black disc           | "Mass is the only truth. You weigh nothing."           | boss_die, story_line
//  2   |  2.0– 4.6   | tight → wide               | drift up; the frame un-bends              | the horizon shatters outward: the star field that fell in is given BACK — every star flies out along its own spiral, gold now; lensing rings unwind and go straight; the point is a spark | —                                            | enemy_die_big, pickup_essence
//  3   |  4.6– 7.4   | HARD CUT: the star chart   | wide → pan + zoom to the Wastes          | the chart: Fields, Grove, Depths, Machinery burn; the path crawls south-west; the ink over the next place burns away; VOID WASTES in indigo | CHAPTER V / VOID WASTES                                | chapter_card, landmark_reveal, music_sting_reveal
//  4   |  7.4– 9.2   | centre, one spark          | hold                                     | the chart fades under one small spark; LIGHT's answer; fade → MapBreather                                                              | "Nothing weighs nothing. That is why it rises."        | story_line
// Structure: setup (1: the roll stops — the frame is finally still) → escalation (2: everything the point ate comes back out, gold) → turn (3: cut to the chart) → payoff (4: the spark, LIGHT's answer).

import { K, step, easeOut, easeInOut, span, lerp, hash, wobble, clamp01 } from '../Engine';
import type { SceneDef, Gfx, LayerState, CameraDef } from '../Engine';
import { GOLD, AMBER, WARM_WHITE, gradientBg } from '../Draw';
import { glowDisc, rgba } from '../Sprites';
import { OT, PLACES, arenaAfter, cracks, comesApart, starChart, placeName, holdSpark, outroLines, outroPost, outroCamera, outroCues } from './outroKit';

const PLACE = 4, COLOR = '#818cf8', CYAN = '#38bdf8', PALE = '#e0f2fe', DEEP = '#0c4a6e';
const { burst: T_BURST, chart: T_CHART, hold: T_HOLD, end: T_END } = OT;
const HORIZON = 230;

/** release 0→1 over shot 2: the horizon shatters, the stars fly back out, the rings unwind */
const release = (t: number) => easeOut(span(t, T_BURST, T_CHART - 0.4));

const drawArena = (g: Gfx, L: LayerState) => arenaAfter(g, L, OT, COLOR);
const drawSpace = (g: Gfx, L: LayerState) => {
  const ctx = g.ctx; const t = g.t; const r = release(t); const a = L.alpha;
  ctx.globalAlpha = a; gradientBg(g, '#010409', r > 0.5 ? '#0a0b1c' : '#04101c', '#000000', 0.5);
  ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = a * 0.08 * (1 - r * 0.6); ctx.drawImage(glowDisc(DEEP, 256), -1600, -1100, 3200, 2200); ctx.globalCompositeOperation = 'source-over';
  ctx.globalAlpha = L.alpha;
};
/** the star field, in reverse: in shot 1 every star sits pinned just outside the horizon (where the intro left them);
 *  in shot 2 each flies back out along its spiral to where it belongs, turning from cyan to gold on the way. */
const drawStars = (g: Gfx, L: LayerState) => {
  const ctx = g.ctx; const t = g.t; const a = L.alpha; const r = release(t);
  const n = 520; const still = 1 - easeOut(span(t, 0, T_BURST));   // the intro's frame-dragging dies out through shot 1
  for (const bucket of [0, 1]) {
    ctx.fillStyle = bucket ? rgba(GOLD, a * 0.9) : rgba(PALE, a * 0.85); ctx.beginPath();
    for (let i = 0; i < n; i++) {
      const h0 = hash(i, 4001), h1 = hash(i, 4002), h2 = hash(i, 4003);
      const home = 120 + h0 * h0 * 1500; const an0 = h1 * Math.PI * 2;
      const out = easeOut(clamp01(r * 1.5 - h0 * 0.5));             // the near stars leave first (they were taken first)
      if ((out > 0.5) !== (bucket === 1)) continue;
      const rr = lerp(HORIZON + 6 + h2 * 30, home, out);
      const an = an0 + (1 - out) * 2.4 + t * 0.02 * still;
      const x = Math.cos(an) * rr, y = Math.sin(an) * rr * 0.92; const sz = 0.8 + h2 * 2.2;
      ctx.moveTo(x + sz, y); ctx.arc(x, y, sz, 0, Math.PI * 2);
      if (out > 0 && out < 1) { // a streak behind the flying star
        const rb = lerp(HORIZON + 6, home, Math.max(0, out - 0.12)); const anb = an0 + (1 - Math.max(0, out - 0.12)) * 2.4;
        ctx.moveTo(x, y); ctx.lineTo(Math.cos(anb) * rb, Math.sin(anb) * rb * 0.92); }
    }
    ctx.fill();
  }
  // lensing rings unwinding: ellipses that lose their eccentricity and their spin, then dissolve
  const rings = 9; const unwind = r;
  if (unwind < 1) { ctx.strokeStyle = rgba(CYAN, a * 0.25 * (1 - unwind)); ctx.lineWidth = 1.2; ctx.beginPath();
    for (let k = 1; k <= rings; k++) { const rr = HORIZON + 40 + k * k * 22 + unwind * k * 90; ctx.moveTo(rr, 0); ctx.ellipse(0, 0, rr, rr * lerp(0.92, 1, unwind), (1 - unwind) * 0.6 * k, 0, Math.PI * 2); }
    ctx.stroke(); }
  ctx.globalAlpha = L.alpha;
};
/** the horizon: black disc + photon ring; the cracks run across it in shot 1; at the burst it shatters into 14 wedges that fly out and fade */
const drawHorizon = (g: Gfx, L: LayerState) => {
  const ctx = g.ctx; const t = g.t; const a = L.alpha; const r = release(t);
  if (r <= 0) {
    ctx.globalAlpha = a; ctx.fillStyle = '#000'; ctx.beginPath(); ctx.arc(0, 0, HORIZON, 0, Math.PI * 2); ctx.fill();
    const dim = span(t, 0.3, T_BURST);
    ctx.strokeStyle = rgba(PALE, a * (0.9 - 0.5 * dim)); ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(0, 0, HORIZON + 2, 0, Math.PI * 2); ctx.stroke();
    ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = a * 0.5 * (1 - dim * 0.6); ctx.drawImage(glowDisc(CYAN, 256), -HORIZON * 1.6, -HORIZON * 1.6, HORIZON * 3.2, HORIZON * 3.2);
    // the warm light inside: amber leaks through the cracks, brighter toward the burst
    ctx.globalAlpha = a * dim * 0.5; ctx.drawImage(glowDisc(GOLD, 256), -HORIZON * 1.2, -HORIZON * 1.2, HORIZON * 2.4, HORIZON * 2.4); ctx.globalCompositeOperation = 'source-over';
    cracks(g, 0, 0, 11, HORIZON * 1.05, easeOut(dim), 91, GOLD, a);
    ctx.globalAlpha = L.alpha; return;
  }
  // shattered: wedges of the black disc fly outward, each keeping its photon-ring arc, fading
  const fly = easeOut(span(t, T_BURST, T_BURST + 1.6)); const fa = a * (1 - span(t, T_BURST + 0.8, T_BURST + 1.8)); if (fa <= 0) return;
  const W = 14; ctx.globalAlpha = fa;
  for (let i = 0; i < W; i++) {
    const a0 = (i / W) * Math.PI * 2, a1 = ((i + 1) / W) * Math.PI * 2 - 0.04; const mid = (a0 + a1) / 2;
    const d = fly * (380 + hash(i, 4101) * 700); const dx = Math.cos(mid) * d, dy = Math.sin(mid) * d;
    ctx.save(); ctx.translate(dx, dy); ctx.rotate(fly * (hash(i, 4102) - 0.5) * 2.5);
    ctx.fillStyle = '#000'; ctx.beginPath(); ctx.moveTo(0, 0); ctx.arc(0, 0, HORIZON, a0, a1); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = rgba(lerp(0, 1, fly) > 0.5 ? GOLD : PALE, 0.9); ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(0, 0, HORIZON + 2, a0, a1); ctx.stroke();
    ctx.restore();
  }
  ctx.globalAlpha = L.alpha;
};
/** the point: in shot 1 a white speck with the slit — the slit closes; at the burst it becomes a spark that rises */
const drawPoint = (g: Gfx, L: LayerState) => {
  const ctx = g.ctx; const t = g.t; const a = L.alpha * (1 - span(t, T_CHART - 0.6, T_CHART - 0.2)); if (a <= 0) return;
  const r = release(t); const close = easeOut(span(t, 0.2, T_BURST - 0.3));
  const pr = 9 - 3 * close + wobble(t * 23, 7) * 0.6; const y = -r * 160;
  ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = a * (0.8 + r * 0.6); ctx.drawImage(glowDisc(r > 0.3 ? GOLD : PALE, 128), -pr * 14, y - pr * 14, pr * 28, pr * 28); ctx.globalCompositeOperation = 'source-over';
  ctx.globalAlpha = a; ctx.fillStyle = r > 0.3 ? WARM_WHITE : '#ffffff'; ctx.beginPath(); ctx.arc(0, y, pr * (1 + r * 0.8), 0, Math.PI * 2); ctx.fill();
  if (close < 1) { ctx.fillStyle = '#000'; ctx.beginPath(); ctx.ellipse(0, y, pr * 0.35 * (1 - close), pr * 1.6 * (1 - close), 0, 0, Math.PI * 2); ctx.fill(); }
  ctx.globalAlpha = L.alpha;
};
const drawEmbers = (g: Gfx, L: LayerState) => comesApart(g, L, { x: -300, y: -300, w: 600, h: 600 }, COLOR, OT, 4301);
const drawChart = (g: Gfx, L: LayerState) => starChart(g, L, PLACE);
const drawPlace = (g: Gfx, L: LayerState) => placeName(g, L, PLACE);
const drawHold = (g: Gfx, L: LayerState) => holdSpark(g, L);
const drawLines = (g: Gfx, L: LayerState) => outroLines(g, L, 'Mass is the only truth. You weigh nothing.', 'Nothing weighs nothing. That is why it rises.');

/** the intro's roll, decelerating to 0 through shot 1 (the only outro whose camera rotates); a counter-nudge at the burst */
const camera: CameraDef = (() => {
  const base = outroCamera(PLACE, OT, 1.1); const p = PLACES[PLACE];
  return { ...base,
    rot: K(0, 0.22, T_BURST - 0.2, 0.0, easeOut, T_BURST, -0.03, T_BURST + 0.9, 0, easeOut, T_END, 0),
    zoom: K(0, 1.3, T_BURST, 1.18, easeInOut, T_CHART - 0.01, 0.98, easeOut, T_CHART, 0.92, step, T_CHART + 1.3, 1.75, easeInOut, T_HOLD, 1.85, T_END, 1.9),
    x: K(0, 0, T_CHART - 0.01, 0, T_CHART + 1.3, p.x, easeInOut, T_END, p.x),
  };
})();

export const boss_outro_neutron_star: SceneDef = {
  id: 'boss_outro_neutron_star',
  duration: T_END,
  skipAfter: 0.6,
  camera,
  layers: [
    { id: 'arena', to: T_CHART, parallax: 0.2, alpha: K(0, 0.35, T_BURST, 0.35, T_CHART - 0.3, 0.6, T_CHART, 0), draw: drawArena },
    { id: 'space', to: T_CHART, parallax: 0.1, alpha: K(0, 1, T_CHART - 0.3, 1, T_CHART, 0), draw: drawSpace },
    { id: 'stars', to: T_CHART, parallax: 0.5, alpha: K(0, 1, T_CHART - 0.4, 1, T_CHART, 0), draw: drawStars },
    { id: 'horizon', to: T_CHART, parallax: 1, draw: drawHorizon },
    { id: 'point', to: T_CHART, parallax: 1, draw: drawPoint },
    { id: 'embers', from: T_BURST, to: T_CHART, parallax: 1.1, draw: drawEmbers },
    { id: 'chart', from: T_CHART, parallax: 1, alpha: K(0, 1, T_HOLD, 1, T_HOLD + 0.8, 0.25), draw: drawChart },
    { id: 'place', from: T_CHART + 1.5, to: T_HOLD, parallax: 0, draw: drawPlace },
    { id: 'hold', from: T_HOLD, parallax: 0, draw: drawHold },
    { id: 'lines', parallax: 0, draw: drawLines },
  ],
  post: { ...outroPost(OT), aberration: K(0, 7, T_BURST - 0.2, 2, easeOut, T_BURST, 10, step, T_BURST + 0.6, 0, easeOut, T_CHART - 0.01, 0, T_CHART, 4, T_CHART + 0.3, 0, easeOut) },
  cues: [...outroCues(OT), { t: T_BURST + 0.05, sfx: 'boss_phase', vol: 0.5 }, { t: T_BURST + 0.5, sfx: 'pickup_essence', vol: 0.35 }, { t: T_BURST + 1.0, sfx: 'pickup_essence', vol: 0.3 }],
  shots: [
    { n: 1, from: 0, to: T_BURST, what: 'Tight on the frozen horizon disc; the roll the intro never ended decelerates to zero; the photon ring dims as amber cracks run through the black; the slit in the point closes. "Mass is the only truth. You weigh nothing." Setup — the frame is finally still.' },
    { n: 2, from: T_BURST, to: T_CHART, what: 'White bloom; the horizon shatters into 14 wedges that fly out; every star the point ate flies back along its spiral and turns gold; the lensing rings unwind to circles and dissolve; the point is a rising spark. Escalation — the stolen sky returned.' },
    { n: 3, from: T_CHART, to: T_HOLD, what: 'HARD CUT to the star chart: four places burn, the path crawls south-west, the camera pans + zooms onto the ink over the next place as it burns away; CHAPTER V / VOID WASTES assembles in indigo with a rule. Turn.' },
    { n: 4, from: T_HOLD, to: T_END, what: 'The chart dims under one small breathing spark; "Nothing weighs nothing. That is why it rises." assembles warm; fade → MapBreather. Payoff.' },
  ],
};
export default boss_outro_neutron_star;
