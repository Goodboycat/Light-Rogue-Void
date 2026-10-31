// (M4) SCENE `boss_outro_darkness` — the Eye closes for good. Would play the frame DARKNESS' HP hits 0. 9.2 s.
// NOTE (hook): the darkness death branch in SurvivalGame.tsx routes to the 7D `ending` cinematic → WinGame; M7 owns the
// two ending films and may chain this scene in front of `ending_stay` / `ending_leave` (its shot 3 is "THE CHART IS
// COMPLETE" — the whole chart burns, no new place). Until then it plays via `?cinematic=boss_outro_darkness` only.
//
// STORYBOARD (written first, keyframes derived from it — MOVIE.md §1.4)
// shot | start–end s | framing                    | camera move                        | what changes on screen                                                                                                                       | text                                        | audio id
// -----|-------------|----------------------------|------------------------------------|----------------------------------------------------------------------------------------------------------------------------------------------|---------------------------------------------|------------------
//  1   |  0.0– 2.0   | the Eye, filling the frame | slow pull back                     | the iris r 1200 frozen; the pupil is a dot; the hundreds of small eyes close one by one; amber cracks run through the iris like veins of light | "we were here first. we will be here last."  | boss_die, story_line
//  2   |  2.0– 4.6   | full → wide                | pull back continues                | the lid comes DOWN — but it is not closing, it is dissolving: the iris lifts off as white→gold embers from the rim inward; the tendrils let go of the edges and withdraw; behind the Eye there was a sky all along — a warm one | —                            | enemy_die_big, pickup_essence
//  3   |  4.6– 7.4   | HARD CUT: the star chart   | wide, slow zoom out                | the chart WHOLE: all six places burn one after another, the path runs end to end; no ink is left; THE CHART IS COMPLETE tracks out              | THE CHART IS COMPLETE                       | chapter_card, landmark_reveal, music_sting_reveal
//  4   |  7.4– 9.2   | centre, one spark          | hold                               | the chart fades under one small spark; LIGHT's answer; fade → (M7: the choice)                                                                | "Then look. I'm still here."                | story_line
// Structure: setup (1: the eyes close, light runs through the iris) → escalation (2: the Eye becomes light; the sky behind it) → turn (3: the complete chart) → payoff (4: the spark, LIGHT's answer).

import { K, easeOut, easeIn, easeInOut, span, lerp, hash } from '../Engine';
import type { SceneDef, Gfx, LayerState } from '../Engine';
import { GOLD, AMBER, WARM_WHITE, VIOLET, gradientBg, eye, eyeField, tendrils, embers } from '../Draw';
import { glowDisc, rgba } from '../Sprites';
import { OT, arenaAfter, cracks, starChart, placeName, holdSpark, outroLines, outroPost, outroCamera, outroCues } from './outroKit';

const PLACE = 6, COLOR = '#ffffff';
const { burst: T_BURST, chart: T_CHART, hold: T_HOLD, end: T_END } = OT;

/** gone 0→1 over shot 2: the iris dissolves from the rim inward */
const gone = (t: number) => easeInOut(span(t, T_BURST, T_CHART - 0.4));

const drawArena = (g: Gfx, L: LayerState) => arenaAfter(g, L, OT, GOLD);
/** behind the Eye: the only warm sky of the Darkness — revealed as the iris goes */
const drawSky = (g: Gfx, L: LayerState) => {
  const ctx = g.ctx; const t = g.t; const a = L.alpha; const o = gone(t);
  ctx.globalAlpha = a; gradientBg(g, '#000000', o > 0.2 ? '#1a1006' : '#040208', '#000000', 0.5);
  ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = a * 0.3 * o; ctx.drawImage(glowDisc(AMBER, 256), -2000, -1400, 4000, 2800);
  ctx.globalAlpha = a * 0.25 * o; ctx.drawImage(glowDisc(WARM_WHITE, 256), -900, -700, 1800, 1400);
  ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = L.alpha;
};
/** the Eye frozen open; cracks of light vein the iris; in shot 2 a clip ring shrinks from the rim and the embers carry the rest */
const drawEye = (g: Gfx, L: LayerState) => {
  const ctx = g.ctx; const t = g.t; const o = gone(t); if (o >= 1) return;
  const r = 1200 * (1 - o);                       // the remaining iris: everything outside r has already lifted off
  ctx.save(); ctx.beginPath(); ctx.arc(0, 0, r + 40, 0, Math.PI * 2); ctx.clip();
  ctx.globalAlpha = L.alpha;
  const pupil = lerp(0.07, 0.02, easeOut(span(t, 0.2, T_BURST)));
  eye(g, 0, 0, { r: 1200, open: 1, look: { x: 0, y: 0 }, pupil, veins: 26, glow: 1.0 - o * 0.6, t });
  ctx.restore();
  // the rim that is going: a gold ring where the iris ends
  if (o > 0) { ctx.strokeStyle = rgba(GOLD, L.alpha * 0.9); ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(0, 0, r + 20, 0, Math.PI * 2); ctx.stroke();
    ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = L.alpha * 0.5; ctx.drawImage(glowDisc(GOLD, 256), -r - 120, -r - 120, (r + 120) * 2, (r + 120) * 2); ctx.globalCompositeOperation = 'source-over'; }
  ctx.globalAlpha = L.alpha;
};
/** the hundreds of small eyes close one by one through shot 1 (open 1→0 with a per-eye stagger via the field's open value) */
const drawWall = (g: Gfx, L: LayerState) => {
  const ctx = g.ctx; const t = g.t; const close = easeInOut(span(t, 0.3, T_BURST)); if (close >= 1) return;
  ctx.globalAlpha = L.alpha * (1 - close * 0.5);
  eyeField(g, 160, 61, 1700, 1 - close, t);
  ctx.globalAlpha = L.alpha;
};
/** tendrils let go: reach 1→0 in shot 2 */
const drawTendrils = (g: Gfx, L: LayerState) => {
  const t = g.t; const reach = 1 - easeIn(span(t, T_BURST - 0.3, T_CHART - 0.6)); if (reach <= 0) return;
  tendrils(g, -1300, 0, 9, 1300, 0, 1.2, 73, reach, t); tendrils(g, 1300, 0, 9, 1300, Math.PI, 1.2, 74, reach, t); tendrils(g, 0, 1100, 9, 1100, -Math.PI / 2, 1.4, 75, reach, t); tendrils(g, 0, -1100, 9, 1100, Math.PI / 2, 1.4, 76, reach, t);
};
/** veins of light through the iris + the white bloom before the burst */
const drawCracks = (g: Gfx, L: LayerState) => {
  const c = easeOut(span(g.t, 0.5, T_BURST)) * (1 - span(g.t, T_BURST, T_BURST + 0.6)); if (c <= 0) return;
  cracks(g, 0, 0, 16, 1100, c, 87, GOLD, L.alpha * 0.9); cracks(g, 0, 0, 10, 700, c * 0.9, 88, WARM_WHITE, L.alpha * 0.7);
  const ctx = g.ctx; const b = span(g.t, T_BURST - 0.4, T_BURST); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = L.alpha * b * 0.8; ctx.drawImage(glowDisc('#fff7e6', 256), -1000, -1000, 2000, 2000); ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = L.alpha;
};
/** the iris lifts off from the rim inward: embers born on a ring that shrinks with `gone` */
const drawEmbers = (g: Gfx, L: LayerState) => {
  const t = g.t; const u = span(t, T_BURST, T_CHART); if (u <= 0) return;
  const a = L.alpha * Math.sin(Math.min(1, u * 1.15) * Math.PI) ** 0.5;
  // three ring bands (outer → inner) take turns as the rim shrinks
  for (let b = 0; b < 3; b++) {
    const R = 1200 * (1 - b / 3) - 200; const born = span(u, b * 0.28, b * 0.28 + 0.5); if (born <= 0) continue;
    embers(g, { n: 500, x: -R, y: -R * 0.9, w: R * 2, h: R * 1.8, rise: 220 + 160 * u, drift: 80, rMin: 1.5, rMax: 5, colors: [WARM_WHITE, GOLD, VIOLET], life: 2.2, seed: 4501 + b, glow: 5 }, a * born, t - T_BURST - b * 0.6 + 0.2);
  }
  embers(g, { n: 400, x: -1500, y: -1000, w: 3000, h: 2000, rise: 480, drift: 60, rMin: 0.8, rMax: 2, colors: [WARM_WHITE, AMBER, GOLD], life: 1.8, seed: 4509 }, a * 0.8, t - T_BURST);
  g.ctx.globalAlpha = L.alpha;
};
const drawChart = (g: Gfx, L: LayerState) => starChart(g, L, PLACE);
const drawPlace = (g: Gfx, L: LayerState) => placeName(g, L, PLACE);
const drawHold = (g: Gfx, L: LayerState) => holdSpark(g, L);
const drawLines = (g: Gfx, L: LayerState) => outroLines(g, L, 'we were here first. we will be here last.', "Then look. I'm still here.");

export const boss_outro_darkness: SceneDef = {
  id: 'boss_outro_darkness',
  duration: T_END,
  skipAfter: 0.6,
  camera: { ...outroCamera(PLACE, OT, 0.92), zoom: K(0, 1.05, T_BURST, 0.95, easeInOut, T_CHART - 0.01, 0.82, easeOut, T_CHART, 0.8, easeOut, T_CHART + 1.3, 0.95, easeInOut, T_HOLD, 1.0, T_END, 1.0), y: K(0, 0, T_END, 0) },
  layers: [
    { id: 'arena', to: T_CHART, parallax: 0.2, alpha: K(0, 0.3, T_BURST, 0.3, T_CHART - 0.3, 0.5, T_CHART, 0), draw: drawArena },
    { id: 'sky', to: T_CHART, parallax: 0.1, alpha: K(0, 1, T_CHART - 0.3, 1, T_CHART, 0), draw: drawSky },
    { id: 'tendrils', to: T_CHART, parallax: 0.8, draw: drawTendrils },
    { id: 'eye', to: T_CHART, parallax: 1, draw: drawEye },
    { id: 'wall', to: T_BURST, parallax: 1.05, draw: drawWall },
    { id: 'cracks', to: T_BURST + 0.6, parallax: 1, draw: drawCracks },
    { id: 'embers', from: T_BURST, to: T_CHART, parallax: 1.1, draw: drawEmbers },
    { id: 'chart', from: T_CHART, parallax: 1, alpha: K(0, 1, T_HOLD, 1, T_HOLD + 0.8, 0.25), draw: drawChart },
    { id: 'place', from: T_CHART + 1.5, to: T_HOLD, parallax: 0, draw: drawPlace },
    { id: 'hold', from: T_HOLD, parallax: 0, draw: drawHold },
    { id: 'lines', parallax: 0, draw: drawLines },
  ],
  post: { ...outroPost(OT), wash: K(0, -0.9, T_BURST - 0.2, -0.7, T_BURST + 0.5, 0.6, easeOut, T_CHART - 0.01, 0.55, T_CHART, 0.05, T_HOLD, 0.35, T_END, 0.5) },
  cues: [...outroCues(OT), { t: T_BURST + 0.4, sfx: 'pickup_essence', vol: 0.4 }, { t: T_BURST + 1.1, sfx: 'pickup_essence', vol: 0.35 }, { t: T_BURST + 1.8, sfx: 'pickup_essence', vol: 0.3 },
    ...[0, 1, 2, 3, 4, 5].map(i => ({ t: T_CHART + 0.5 + i * 0.18, sfx: 'landmark_reveal' as const, vol: 0.35 }))],
  shots: [
    { n: 1, from: 0, to: T_BURST, what: 'The Eye fills the frame, frozen open; slow pull back; the pupil shrinks to a dot; the hundreds of small eyes close; veins of gold light run through the iris. "we were here first. we will be here last." Setup.' },
    { n: 2, from: T_BURST, to: T_CHART, what: 'White bloom; the iris lifts off as white→gold embers from the rim inward (a gold ring marks the shrinking edge); the tendrils let go of every edge; behind the Eye a warm sky was waiting. Escalation — the Darkness becomes light.' },
    { n: 3, from: T_CHART, to: T_HOLD, what: 'HARD CUT to the star chart, whole: all six places ignite one after another, the path runs end to end, no ink is left; THE CHART IS COMPLETE tracks out; slow zoom out. Turn.' },
    { n: 4, from: T_HOLD, to: T_END, what: 'The chart dims under one small breathing spark; "Then look. I\'m still here." assembles warm; fade → (M7: the choice). Payoff.' },
  ],
};
export default boss_outro_darkness;
