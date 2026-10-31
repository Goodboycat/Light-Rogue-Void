// (M4) SCENE `boss_outro_hive_mind` — the wall of mandibles dies. Plays the frame THE HIVE MIND's HP hits 0, gameplay
// hidden + paused; `onDone` → completeBossWave → MapBreather (the place reveal is shot 3 of this film). 9.2 s. LIGHT tone.
//
// STORYBOARD (written first, keyframes derived from it — MOVIE.md §1.4)
// shot | start–end s | framing                   | camera move                     | what changes on screen                                                                                                        | text                                                       | audio id
// -----|-------------|---------------------------|---------------------------------|-------------------------------------------------------------------------------------------------------------------------------|------------------------------------------------------------|------------------
//  1   |  0.0– 2.0   | medium, the wall frozen   | slow push                       | the mandible wall from the intro, locked mid-snap; its 600 eyes dim one row at a time; amber cracks run between the plates    | "You severed a limb. The hive does not notice limbs."      | boss_die, story_line
//  2   |  2.0– 4.6   | medium → wide             | drift up with the embers        | the plates lift away as embers (yellow → gold), the eyes go out, the letterbox opens, the floor warms                           | —                                                          | enemy_die_big, pickup_essence
//  3   |  4.6– 7.4   | HARD CUT: the star chart  | wide → pan + zoom to the Grove  | the chart: Origin Fields burns; a dotted path crawls east; the ink over the next place burns away; WHISPERING GROVE assembles  | CHAPTER II / WHISPERING GROVE                              | chapter_card, landmark_reveal, music_sting_reveal
//  4   |  7.4– 9.2   | centre, one spark         | hold                            | the chart fades under one small spark; LIGHT's answer; fade → MapBreather                                                       | "It noticed me."                                           | story_line
// Structure: setup (1: the kill, DARKNESS dismisses it) → escalation (2: the body becomes light) → turn (3: cut to the chart, the world is bigger) → payoff (4: the spark, LIGHT's answer).

import { K, easeOut, span, lerp, hash, wobble, clamp01 } from '../Engine';
import type { SceneDef, Gfx, LayerState } from '../Engine';
import { GOLD, embers } from '../Draw';
import { glowDisc, rgba } from '../Sprites';
import { OT, PLACES, arenaAfter, cracks, comesApart, starChart, placeName, holdSpark, outroLines, outroPost, outroCamera, outroCues } from './outroKit';

const PLACE = 1, COLOR = '#ca8a04', CHITIN = '#120d05', EYE = '#facc15';
const { burst: T_BURST, chart: T_CHART, hold: T_HOLD, end: T_END } = OT;

/** the wall from the intro, frozen mid-snap: 4 tiers of ink crescents with a chitin rim; `gone` 0→1 removes plates bottom-up */
function wall(g: Gfx, a: number, gone: number) {
  const ctx = g.ctx; const t = g.t; if (a <= 0) return;
  for (let tier = 0; tier < 4; tier++) {
    const y = -420 + tier * 240; const n = 7 + tier * 2; const w = 3000 / n;
    const keep = 1 - clamp01(gone * 1.6 - (3 - tier) * 0.25);
    if (keep <= 0) continue;
    ctx.fillStyle = CHITIN; ctx.globalAlpha = a * keep; ctx.beginPath();
    for (let i = 0; i < n; i++) {
      const x = -1500 + (i + 0.5) * w + (hash(i, 11 + tier) - 0.5) * 60; const h = 160 + hash(i, 21 + tier) * 90;
      const lift = (1 - keep) * (200 + hash(i, 31) * 300);
      ctx.moveTo(x - w * 0.55, y + 60 - lift); ctx.quadraticCurveTo(x, y - h - lift, x + w * 0.55, y + 60 - lift); ctx.quadraticCurveTo(x, y + 20 - lift, x - w * 0.55, y + 60 - lift);
    }
    ctx.fill();
    ctx.strokeStyle = rgba(COLOR, 0.5 * a * keep); ctx.lineWidth = 2; ctx.beginPath();
    for (let i = 0; i < n; i++) { const x = -1500 + (i + 0.5) * w + (hash(i, 11 + tier) - 0.5) * 60; const h = 160 + hash(i, 21 + tier) * 90; const lift = (1 - keep) * (200 + hash(i, 31) * 300); ctx.moveTo(x - w * 0.55, y + 60 - lift); ctx.quadraticCurveTo(x, y - h - lift, x + w * 0.55, y + 60 - lift); }
    ctx.stroke();
    // the eyes in the gaps: dim row by row from the top (shot 1), then go with the plates
    const dim = 1 - span(t, 0.3 + tier * 0.35, 1.0 + tier * 0.35);
    if (dim > 0.01) {
      ctx.fillStyle = rgba(EYE, 0.9 * a * keep * dim); ctx.beginPath();
      for (let k = 0; k < n * 5; k++) { const ex = -1500 + hash(k, 41 + tier) * 3000, ey = y + 70 + hash(k, 51 + tier) * 120; const r = 2.5 + hash(k, 61) * 3 * (0.6 + 0.4 * Math.sin(t * 7 + k)); ctx.moveTo(ex + r, ey); ctx.arc(ex, ey, r, 0, Math.PI * 2); }
      ctx.fill();
    }
  }
  ctx.globalAlpha = a;
}

const drawArena = (g: Gfx, L: LayerState) => arenaAfter(g, L, OT, GOLD);
const drawWall = (g: Gfx, L: LayerState) => wall(g, L.alpha, span(g.t, T_BURST, T_CHART - 0.4));
const drawCracks = (g: Gfx, L: LayerState) => {
  const c = easeOut(span(g.t, 0.5, T_BURST)) * (1 - span(g.t, T_BURST, T_BURST + 0.6)); if (c <= 0) return;
  cracks(g, -300, -200, 9, 520, c, 71, GOLD, L.alpha); cracks(g, 380, 60, 7, 460, c * 0.9, 72, GOLD, L.alpha); cracks(g, 40, 300, 6, 380, c * 0.8, 73, GOLD, L.alpha);
  // the light inside bulges out of the gaps right before the burst
  const ctx = g.ctx; const b = span(g.t, T_BURST - 0.4, T_BURST); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = L.alpha * b * 0.7; ctx.drawImage(glowDisc('#fff7e6', 256), -900, -600, 1800, 1200); ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = L.alpha;
};
const drawEmbers = (g: Gfx, L: LayerState) => comesApart(g, L, { x: -1400, y: -500, w: 2800, h: 1100 }, EYE, OT, 4101);
const drawHusks = (g: Gfx, L: LayerState) => { // a few black plate flakes falling the other way, so the light has something to leave behind
  const u = span(g.t, T_BURST, T_CHART); if (u <= 0) return;
  embers(g, { n: 90, x: -1300, y: -300, w: 2600, h: 600, rise: -160, drift: 25, rMin: 3, rMax: 8, colors: [CHITIN, '#1a1208', '#0a0703'], life: 2.6, seed: 4111 }, L.alpha * (1 - u), g.t - T_BURST);
};
const drawChart = (g: Gfx, L: LayerState) => starChart(g, L, PLACE);
const drawPlace = (g: Gfx, L: LayerState) => placeName(g, L, PLACE);
const drawHold = (g: Gfx, L: LayerState) => holdSpark(g, L);
const drawLines = (g: Gfx, L: LayerState) => outroLines(g, L, 'You severed a limb. The hive does not notice limbs.', 'It noticed me.');

export const boss_outro_hive_mind: SceneDef = {
  id: 'boss_outro_hive_mind',
  duration: T_END,
  skipAfter: 0.6,
  camera: outroCamera(PLACE),
  layers: [
    { id: 'arena', to: T_CHART, parallax: 0.2, alpha: K(0, 1, T_CHART - 0.3, 1, T_CHART, 0), draw: drawArena },
    { id: 'wall', to: T_CHART, parallax: 1, draw: drawWall },
    { id: 'cracks', from: 0.4, to: T_BURST + 0.6, parallax: 1, draw: drawCracks },
    { id: 'husks', from: T_BURST, to: T_CHART, parallax: 1.1, draw: drawHusks },
    { id: 'embers', from: T_BURST, to: T_CHART, parallax: 1, blend: 'lighter', draw: drawEmbers },
    { id: 'chart', from: T_CHART, parallax: 1, alpha: K(0, 1, T_HOLD, 1, T_HOLD + 0.8, 0.25), draw: drawChart },
    { id: 'place', from: T_CHART + 1.5, to: T_HOLD, parallax: 0, draw: drawPlace },
    { id: 'hold', from: T_HOLD, parallax: 0, draw: drawHold },
    { id: 'lines', parallax: 0, draw: drawLines },
  ],
  post: outroPost(OT),
  cues: [...outroCues(OT), { t: 0.6, sfx: 'enemy_die_small', vol: 0.3 }, { t: 1.2, sfx: 'enemy_die_small', vol: 0.3 }, { t: 1.7, sfx: 'enemy_die_small', vol: 0.3 }],
  shots: [
    { n: 1, from: 0, to: T_BURST, what: 'Medium on the mandible wall locked mid-snap; its eyes dim row by row from the top; amber cracks run between the plates and the light inside bulges. "You severed a limb. The hive does not notice limbs." Setup — DARKNESS dismisses the kill.' },
    { n: 2, from: T_BURST, to: T_CHART, what: 'White bloom; the plates lift away bottom-up as 1200 embers (yellow → gold) while black husks fall; the letterbox opens from 0.19 to 0.06 and the wash turns amber. Escalation — the body becomes light.' },
    { n: 3, from: T_CHART, to: T_HOLD, what: `HARD CUT to the star chart: Origin Fields burns, a dotted path crawls east, the camera pans + zooms (1.75) onto the ink over the next place as it burns away; a ring leaves the point; CHAPTER II / WHISPERING GROVE assembles in teal with a rule. The turn — the world is bigger than the arena.` },
    { n: 4, from: T_HOLD, to: T_END, what: 'The chart dims to a quarter under one small breathing spark with an amber pool; "It noticed me." assembles warm; fade → MapBreather. Payoff.' },
  ],
};
export default boss_outro_hive_mind;
