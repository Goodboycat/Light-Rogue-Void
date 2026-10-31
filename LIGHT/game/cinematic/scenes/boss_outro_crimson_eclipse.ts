// (M4) SCENE `boss_outro_crimson_eclipse` — the eclipse is put out. Plays the frame CRIMSON ECLIPSE's HP hits 0,
// gameplay hidden + paused; `onDone` → completeBossWave → MapBreather (the place reveal is shot 3 of this film). 9.2 s.
// The intro ate a sun; the outro gives it back — the ring cracks, slides off, and the sun behind it has gone AMBER again.
//
// STORYBOARD (written first, keyframes derived from it — MOVIE.md §1.4)
// shot | start–end s | framing                    | camera move                      | what changes on screen                                                                                                            | text                                                          | audio id
// -----|-------------|----------------------------|----------------------------------|-----------------------------------------------------------------------------------------------------------------------------------|---------------------------------------------------------------|------------------
//  1   |  0.0– 2.0   | wide, the red sky          | slow push on the ring            | totality frozen: the black ring over the sun, red world; the pupil inside the ring shrinks to a dot and dies; gold cracks spider  | "You put out an eclipse. The sky will not thank you."         | boss_die, story_line
//  2   |  2.0– 4.6   | wide                       | drift up                         | the ring shatters into crimson→gold embers and SLIDES OFF the sun; the sun behind is amber again; the red wash drains to dusk     | —                                                             | enemy_die_big, pickup_essence
//  3   |  4.6– 7.4   | HARD CUT: the star chart   | wide → pan + zoom to Machinery   | the chart: 3 places burn; the path crawls east; the ink over the next place burns away; ABANDONED MACHINERY assembles in orange  | CHAPTER IV / ABANDONED MACHINERY                              | chapter_card, landmark_reveal, music_sting_reveal
//  4   |  7.4– 9.2   | centre, one spark          | hold                             | the chart fades under one small spark; LIGHT's answer; fade → MapBreather                                                          | "I did not do it for the sky."                                | story_line
// Structure: setup (1: the kill, the pupil dies) → escalation (2: the ring breaks, the sun is given back) → turn (3: cut to the chart) → payoff (4: the spark, LIGHT's answer).

import { K, easeOut, easeIn, easeInOut, span, lerp, hash } from '../Engine';
import type { SceneDef, Gfx, LayerState } from '../Engine';
import { AMBER, GOLD, WARM_WHITE, gradientBg, stars, godRays, bokeh } from '../Draw';
import { glowDisc, rgba } from '../Sprites';
import { OT, arenaAfter, cracks, comesApart, starChart, placeName, holdSpark, outroLines, outroPost, outroCamera, outroCues } from './outroKit';

const PLACE = 3, COLOR = '#ef4444', RED = '#ef4444', DEEP = '#7f1d1d';
const { burst: T_BURST, chart: T_CHART, hold: T_HOLD, end: T_END } = OT;
const SUN_R = 300, SUN_Y = -60;
/** the red drains out of the world through shot 2 */
const drain = (t: number) => easeInOut(span(t, T_BURST, T_CHART - 0.4));
/** the ring slides off the sun to the left after the burst */
const ringX = (t: number) => -lerp(0, SUN_R * 2.6, easeIn(span(t, T_BURST, T_CHART - 0.5)));

const drawArena = (g: Gfx, L: LayerState) => arenaAfter(g, L, OT, AMBER);
const drawSky = (g: Gfx, L: LayerState) => {
  // the red world of totality; drains to a warm dusk as the ring comes off
  const ctx = g.ctx; const t = g.t; const d = drain(t); ctx.globalAlpha = L.alpha;
  gradientBg(g, d < 0.5 ? '#1a0306' : '#1a0a05', d < 0.5 ? '#3b0a0a' : '#3a1a08', '#050203', 0.55);
  ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = L.alpha * 0.35 * (1 - d); ctx.drawImage(glowDisc(DEEP, 256), -2000, -1400, 4000, 2800); ctx.globalCompositeOperation = 'source-over';
  stars(g, 90, 3001, 1800, d < 0.5 ? '#fecaca' : '#fde68a', 0.45 * L.alpha, t);
  ctx.globalAlpha = L.alpha;
};
const drawSun = (g: Gfx, L: LayerState) => {
  // the sun behind the ring: crimson corona at totality → amber as the ring slides off; rays come back
  const ctx = g.ctx; const t = g.t; const a = L.alpha; const d = drain(t); const breathe = 1 + Math.sin(t * 1.3) * 0.015;
  const warm = d > 0.4 ? GOLD : RED; const core = d > 0.4 ? WARM_WHITE : '#fecaca';
  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha = a * lerp(0.3, 0.55, d); ctx.drawImage(glowDisc(warm, 256), -SUN_R * 3.2 * breathe, SUN_Y - SUN_R * 3.2 * breathe, SUN_R * 6.4 * breathe, SUN_R * 6.4 * breathe);
  godRays(g, 0, SUN_Y, t * 0.05, Math.PI * 2, 12, 1500 * lerp(0.7, 1, d), warm, a * lerp(0.2, 0.3, d), t);
  ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = a;
  ctx.fillStyle = core; ctx.beginPath(); ctx.arc(0, SUN_Y, SUN_R * breathe, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = rgba(warm, 0.9); ctx.lineWidth = 6; ctx.stroke();
  // the warm bokeh of the intro comes back with the sun
  bokeh(g, 40, AMBER, 3011, 1500, a * 0.25 * d, t);
  ctx.globalAlpha = L.alpha;
};
const drawRing = (g: Gfx, L: LayerState) => {
  // the ring at totality: black disc, crimson rim; the pupil in it dies in shot 1; gold cracks spider across it; after the
  // burst the disc breaks into wedges that slide off left and fade (the embers layer carries the light)
  const ctx = g.ctx; const t = g.t; const a = L.alpha * (1 - span(t, T_CHART - 0.8, T_CHART - 0.4)); if (a <= 0) return;
  const x = ringX(t), r = SUN_R * 1.04; const broken = span(t, T_BURST, T_CHART - 0.5);
  ctx.globalAlpha = a;
  if (broken <= 0) {
    ctx.fillStyle = '#000'; ctx.beginPath(); ctx.arc(x, SUN_Y, r, 0, Math.PI * 2); ctx.fill();
  } else { // 9 wedges, each sliding out along its own angle + the common slide left
    const n = 9; ctx.fillStyle = '#000';
    for (let i = 0; i < n; i++) {
      const a0 = (i / n) * Math.PI * 2, a1 = ((i + 1) / n) * Math.PI * 2; const am = (a0 + a1) / 2; const off = easeIn(broken) * (120 + hash(i, 3301) * 420);
      ctx.globalAlpha = a * (1 - broken * 0.8); ctx.beginPath(); ctx.moveTo(x + Math.cos(am) * off, SUN_Y + Math.sin(am) * off); ctx.arc(x + Math.cos(am) * off, SUN_Y + Math.sin(am) * off, r, a0, a1); ctx.closePath(); ctx.fill();
    }
    ctx.globalAlpha = a;
  }
  // crimson rim — thins as the thing dies
  ctx.strokeStyle = rgba(RED, 0.9 * a * (1 - broken)); ctx.lineWidth = lerp(5, 1.5, span(t, 0.2, T_BURST)); ctx.beginPath(); ctx.arc(x, SUN_Y, r, 0, Math.PI * 2); ctx.stroke();
  ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = a * 0.3 * (1 - broken); ctx.drawImage(glowDisc(RED, 256), x - r * 1.9, SUN_Y - r * 1.9, r * 3.8, r * 3.8); ctx.globalCompositeOperation = 'source-over';
  // the pupil: a red slit in the black, shrinks to a dot in shot 1 and dies at 1.4 s
  const pup = 1 - easeIn(span(t, 0.3, 1.4)); if (pup > 0.01 && broken <= 0) { ctx.fillStyle = rgba(RED, 0.9 * a); ctx.beginPath(); ctx.ellipse(x, SUN_Y, 14 * pup + 2, 120 * pup + 2, 0, 0, Math.PI * 2); ctx.fill(); }
  ctx.globalAlpha = L.alpha;
};
const drawCracks = (g: Gfx, L: LayerState) => {
  const c = easeOut(span(g.t, 0.6, T_BURST)) * (1 - span(g.t, T_BURST, T_BURST + 0.6)); if (c <= 0) return;
  cracks(g, 0, SUN_Y, 11, SUN_R * 1.05, c, 91, GOLD, L.alpha);
  const ctx = g.ctx; const b = span(g.t, T_BURST - 0.4, T_BURST); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = L.alpha * b * 0.8; ctx.drawImage(glowDisc('#fff7e6', 256), -800, SUN_Y - 800, 1600, 1600); ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = L.alpha;
};
const drawEmbers = (g: Gfx, L: LayerState) => comesApart(g, L, { x: -SUN_R * 1.1, y: SUN_Y - SUN_R * 1.1, w: SUN_R * 2.2, h: SUN_R * 2.2 }, RED, OT, 4301);
const drawChart = (g: Gfx, L: LayerState) => starChart(g, L, PLACE);
const drawPlace = (g: Gfx, L: LayerState) => placeName(g, L, PLACE);
const drawHold = (g: Gfx, L: LayerState) => holdSpark(g, L);
const drawLines = (g: Gfx, L: LayerState) => outroLines(g, L, 'You put out an eclipse. The sky will not thank you.', 'I did not do it for the sky.');

export const boss_outro_crimson_eclipse: SceneDef = {
  id: 'boss_outro_crimson_eclipse',
  duration: T_END,
  skipAfter: 0.6,
  camera: outroCamera(PLACE, OT, 1.1),
  layers: [
    { id: 'arena', to: T_CHART, parallax: 0.2, alpha: K(0, 1, T_CHART - 0.3, 1, T_CHART, 0), draw: drawArena },
    { id: 'sky', to: T_CHART, parallax: 0.3, alpha: K(0, 1, T_CHART - 0.3, 1, T_CHART, 0), draw: drawSky },
    { id: 'sun', to: T_CHART, parallax: 0.6, draw: drawSun },
    { id: 'ring', to: T_CHART, parallax: 0.8, draw: drawRing },
    { id: 'cracks', from: 0.5, to: T_BURST + 0.6, parallax: 0.8, draw: drawCracks },
    { id: 'embers', from: T_BURST, to: T_CHART, parallax: 0.9, blend: 'lighter', draw: drawEmbers },
    { id: 'chart', from: T_CHART, parallax: 1, alpha: K(0, 1, T_HOLD, 1, T_HOLD + 0.8, 0.25), draw: drawChart },
    { id: 'place', from: T_CHART + 1.5, to: T_HOLD, parallax: 0, draw: drawPlace },
    { id: 'hold', from: T_HOLD, parallax: 0, draw: drawHold },
    { id: 'lines', parallax: 0, draw: drawLines },
  ],
  post: { ...outroPost(OT), wash: K(0, -0.4, T_BURST - 0.2, -0.3, T_BURST + 0.3, 0.55, easeOut, T_CHART - 0.01, 0.5, T_CHART, 0.05, (v: number) => (v >= 1 ? 1 : 0), T_HOLD, 0.3, T_END, 0.45) },
  cues: [...outroCues(OT), { t: 1.4, sfx: 'enemy_die_small', vol: 0.4 }, { t: T_BURST + 0.3, sfx: 'boss_phase', vol: 0.4 }],
  shots: [
    { n: 1, from: 0, to: T_BURST, what: 'Wide on totality frozen: the black ring over the sun in a red world; the red pupil inside shrinks to a dot and dies at 1.4 s; gold cracks spider across the disc; the rim thins. "You put out an eclipse. The sky will not thank you." Setup.' },
    { n: 2, from: T_BURST, to: T_CHART, what: 'White bloom; the ring breaks into 9 wedges that slide off the sun as 1200 crimson→gold embers; the sun behind is amber again, its rays come back, the red drains to dusk and the warm bokeh returns. Escalation — the sun is given back.' },
    { n: 3, from: T_CHART, to: T_HOLD, what: 'HARD CUT to the star chart: three places burn, the path crawls east, the camera pans + zooms onto the ink over the next place as it burns away; CHAPTER IV / ABANDONED MACHINERY assembles in orange with a rule. Turn.' },
    { n: 4, from: T_HOLD, to: T_END, what: 'The chart dims under one small breathing spark; "I did not do it for the sky." assembles warm; fade → MapBreather. Payoff.' },
  ],
};
export default boss_outro_crimson_eclipse;
