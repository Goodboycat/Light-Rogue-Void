// (M4) SCENE `boss_outro_void_warden` — the keeper of the quiet falls. Plays the frame THE VOID WARDEN's HP hits 0,
// gameplay hidden + paused; `onDone` → completeBossWave → MapBreather (the place reveal is shot 3 of this film). 9.2 s.
//
// STORYBOARD (written first, keyframes derived from it — MOVIE.md §1.4)
// shot | start–end s | framing                    | camera move                    | what changes on screen                                                                                                              | text                                                         | audio id
// -----|-------------|----------------------------|--------------------------------|-------------------------------------------------------------------------------------------------------------------------------------|--------------------------------------------------------------|------------------
//  1   |  0.0– 2.0   | medium on the helm         | slow push                      | the helm frozen, visor dark; the blade of absence hangs beside it and THINS to a hairline; amber cracks run down the helm's edge       | "A keeper falls and the lines go slack. How untidy."         | boss_die, story_line
//  2   |  2.0– 4.6   | medium → wide              | drift up with the embers       | the helm comes apart as violet→gold embers; the pillars behind it lean and fall out of the frame one by one; the letterbox opens     | —                                                            | enemy_die_big, pickup_essence
//  3   |  4.6– 7.4   | HARD CUT: the star chart   | wide → pan + zoom to the Depths| the chart: Fields + Grove burn; the path crawls east; the ink over the next place burns away; CRYSTAL DEPTHS assembles in violet      | CHAPTER III / CRYSTAL DEPTHS                                 | chapter_card, landmark_reveal, music_sting_reveal
//  4   |  7.4– 9.2   | centre, one spark          | hold                           | the chart fades under one small spark; LIGHT's answer; fade → MapBreather                                                            | "Good. Lines were never meant to hold light."                | story_line
// Structure: setup (1: the kill, the blade thins to nothing) → escalation (2: the helm becomes light, the order falls) → turn (3: cut to the chart) → payoff (4: the spark, LIGHT's answer).

import { K, easeOut, easeIn, span, lerp, hash, wobble } from '../Engine';
import type { SceneDef, Gfx, LayerState } from '../Engine';
import { GOLD, VIOLET, COLD } from '../Draw';
import { glowDisc, rayStrip, rgba } from '../Sprites';
import { OT, arenaAfter, cracks, comesApart, starChart, placeName, holdSpark, outroLines, outroPost, outroCamera, outroCues } from './outroKit';

const PLACE = 2, COLOR = '#a78bfa', HELM = '#0a0716', STEEL = '#3b3660';
const { burst: T_BURST, chart: T_CHART, hold: T_HOLD, end: T_END } = OT;

/** the cathedral pillars from the intro; after the burst they lean and fall out of frame one by one (`fall` 0→1) */
function pillars(g: Gfx, n: number, depth: number, a: number, seed: number, fall: number) {
  const ctx = g.ctx; const t = g.t; if (a <= 0) return;
  const w = 3200 / n; ctx.strokeStyle = rgba(VIOLET, 0.22 * a); ctx.lineWidth = 2 + depth * 3; ctx.beginPath();
  for (let i = 0; i < n; i++) {
    const x = -1600 + (i + 0.5) * w + wobble(t * 0.3 + i, seed) * 6;
    const f = easeIn(Math.max(0, Math.min(1, fall * 1.8 - hash(i, seed + 5) * 0.8)));   // each pillar falls at its own time
    if (f >= 1) continue;
    const lean = f * (hash(i, seed + 1) > 0.5 ? 1 : -1) * 1.3;                            // rotates about its base
    ctx.moveTo(x, 1200); ctx.lineTo(x + Math.sin(lean) * 2400, 1200 - Math.cos(lean) * 2400);
  }
  ctx.stroke();
  ctx.fillStyle = rgba(COLD, 0.5 * a); ctx.beginPath();
  for (let i = 0; i < n; i++) { const f = easeIn(Math.max(0, Math.min(1, fall * 1.8 - hash(i, seed + 5) * 0.8))); if (f >= 1) continue; const x = -1600 + (i + 0.5) * w; const lean = f * (hash(i, seed + 1) > 0.5 ? 1 : -1) * 1.3; const px = x + Math.sin(lean) * 1620, py = 1200 - Math.cos(lean) * 1620; ctx.moveTo(px + 4, py); ctx.arc(px, py, 3 + depth * 2, 0, Math.PI * 2); }
  ctx.fill();
}
/** the Warden frozen: helm + mantle; `gone` 0→1 erases it top-down (the embers layer carries the light away) */
function helm(g: Gfx, a: number, gone: number) {
  const ctx = g.ctx; if (a <= 0 || gone >= 1) return;
  ctx.save(); ctx.translate(0, -60);
  // top-down erase: clip to everything below a line that descends from the crest to the mantle
  const cutY = lerp(-700, 1500, easeIn(gone)); ctx.beginPath(); ctx.rect(-2000, cutY, 4000, 3000); ctx.clip();
  ctx.globalAlpha = a;
  ctx.fillStyle = HELM; ctx.beginPath(); ctx.moveTo(-760, 1500); ctx.lineTo(-520, 340); ctx.lineTo(-170, 230); ctx.lineTo(170, 230); ctx.lineTo(520, 340); ctx.lineTo(760, 1500); ctx.closePath(); ctx.fill();
  ctx.beginPath(); ctx.moveTo(-190, 250); ctx.bezierCurveTo(-230, -40, -140, -330, 0, -380); ctx.bezierCurveTo(140, -330, 230, -40, 190, 250); ctx.closePath(); ctx.fill();
  ctx.beginPath(); ctx.moveTo(-26, -360); ctx.lineTo(0, -620); ctx.lineTo(26, -360); ctx.closePath(); ctx.fill();
  // the rim is now GOLD: the light inside has reached the edge
  const warm = easeOut(span(g.t, 0.3, T_BURST));
  ctx.strokeStyle = rgba(warm > 0.5 ? GOLD : VIOLET, (0.55 + 0.4 * warm) * a); ctx.lineWidth = 2.5 + warm * 2; ctx.beginPath(); ctx.moveTo(-190, 250); ctx.bezierCurveTo(-230, -40, -140, -330, 0, -380); ctx.lineTo(0, -620); ctx.stroke();
  ctx.strokeStyle = rgba(STEEL, 0.6 * a); ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(-520, 340); ctx.lineTo(-170, 230); ctx.lineTo(170, 230); ctx.lineTo(520, 340); ctx.stroke();
  // the visor: dark — but the cold point is dead; a warm point wakes in its place right before the burst
  ctx.fillStyle = '#000'; ctx.beginPath(); ctx.moveTo(-150, -120); ctx.lineTo(150, -120); ctx.lineTo(132, -74); ctx.lineTo(-132, -74); ctx.closePath(); ctx.fill();
  const wake = span(g.t, T_BURST - 0.6, T_BURST); if (wake > 0) { ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = a * wake; ctx.drawImage(glowDisc(GOLD, 128), -90, -150, 180, 110); ctx.globalCompositeOperation = 'source-over'; }
  ctx.restore(); ctx.globalAlpha = a;
}

const drawArena = (g: Gfx, L: LayerState) => arenaAfter(g, L, OT, COLOR);
const drawPillarsFar = (g: Gfx, L: LayerState) => pillars(g, 26, 0, L.alpha, 1011, span(g.t, T_BURST + 0.2, T_CHART - 0.2));
const drawPillarsNear = (g: Gfx, L: LayerState) => pillars(g, 9, 1, L.alpha, 1021, span(g.t, T_BURST + 0.4, T_CHART - 0.1));
const drawHelm = (g: Gfx, L: LayerState) => helm(g, L.alpha, span(g.t, T_BURST, T_CHART - 0.5));
const drawBlade = (g: Gfx, L: LayerState) => {
  // the blade of absence: a vertical bar of black with a violet edge, right of the helm; thins to a hairline and goes out
  const ctx = g.ctx; const t = g.t; const thin = easeIn(span(t, 0.2, T_BURST - 0.2)); const a = L.alpha * (1 - span(t, T_BURST - 0.2, T_BURST)); if (a <= 0) return;
  const w = lerp(110, 1.5, thin); const x = 520;
  ctx.globalAlpha = a; ctx.fillStyle = '#000'; ctx.fillRect(x - w / 2, -1200, w, 2400);
  ctx.strokeStyle = rgba(VIOLET, 0.7 * a * (1 - thin * 0.5)); ctx.lineWidth = 2; ctx.strokeRect(x - w / 2, -1200, w, 2400);
  ctx.save(); ctx.translate(x, -1200); ctx.rotate(Math.PI / 2); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = a * 0.25 * (1 - thin); ctx.drawImage(rayStrip(VIOLET, 1024, 64), 0, -w, 2400, w * 2); ctx.restore();
  ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = L.alpha;
};
const drawCracks = (g: Gfx, L: LayerState) => {
  const c = easeOut(span(g.t, 0.5, T_BURST)) * (1 - span(g.t, T_BURST, T_BURST + 0.6)); if (c <= 0) return;
  cracks(g, -120, -300, 7, 420, c, 81, GOLD, L.alpha); cracks(g, 90, 40, 6, 380, c * 0.85, 82, GOLD, L.alpha); cracks(g, -40, 320, 5, 300, c * 0.7, 83, GOLD, L.alpha);
  const ctx = g.ctx; const b = span(g.t, T_BURST - 0.4, T_BURST); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = L.alpha * b * 0.7; ctx.drawImage(glowDisc('#fff7e6', 256), -700, -800, 1400, 1400); ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = L.alpha;
};
const drawEmbers = (g: Gfx, L: LayerState) => comesApart(g, L, { x: -520, y: -700, w: 1040, h: 1300 }, COLOR, OT, 4201);
const drawChart = (g: Gfx, L: LayerState) => starChart(g, L, PLACE);
const drawPlace = (g: Gfx, L: LayerState) => placeName(g, L, PLACE);
const drawHold = (g: Gfx, L: LayerState) => holdSpark(g, L);
const drawLines = (g: Gfx, L: LayerState) => outroLines(g, L, 'A keeper falls and the lines go slack. How untidy.', 'Good. Lines were never meant to hold light.');

export const boss_outro_void_warden: SceneDef = {
  id: 'boss_outro_void_warden',
  duration: T_END,
  skipAfter: 0.6,
  camera: outroCamera(PLACE, OT, 1.15),
  layers: [
    { id: 'arena', to: T_CHART, parallax: 0.2, alpha: K(0, 1, T_CHART - 0.3, 1, T_CHART, 0), draw: drawArena },
    { id: 'pillars_far', to: T_CHART, parallax: 0.55, depth: 1, draw: drawPillarsFar },
    { id: 'pillars_near', to: T_CHART, parallax: 0.8, depth: 0.5, draw: drawPillarsNear },
    { id: 'helm', to: T_CHART, parallax: 1, draw: drawHelm },
    { id: 'blade', to: T_BURST, parallax: 1, draw: drawBlade },
    { id: 'cracks', from: 0.4, to: T_BURST + 0.6, parallax: 1, draw: drawCracks },
    { id: 'embers', from: T_BURST, to: T_CHART, parallax: 1, blend: 'lighter', draw: drawEmbers },
    { id: 'chart', from: T_CHART, parallax: 1, alpha: K(0, 1, T_HOLD, 1, T_HOLD + 0.8, 0.25), draw: drawChart },
    { id: 'place', from: T_CHART + 1.5, to: T_HOLD, parallax: 0, draw: drawPlace },
    { id: 'hold', from: T_HOLD, parallax: 0, draw: drawHold },
    { id: 'lines', parallax: 0, draw: drawLines },
  ],
  post: outroPost(OT),
  cues: [...outroCues(OT), { t: T_BURST + 0.6, sfx: 'enemy_die_big', vol: 0.3 }, { t: T_BURST + 1.3, sfx: 'enemy_die_big', vol: 0.3 }, { t: T_BURST + 1.9, sfx: 'enemy_die_big', vol: 0.25 }],
  shots: [
    { n: 1, from: 0, to: T_BURST, what: 'Medium on the frozen helm; the blade of absence beside it thins to a hairline and goes out; the rim turns gold, cracks run down the helm; a warm point wakes in the dead visor. "A keeper falls and the lines go slack. How untidy." Setup.' },
    { n: 2, from: T_BURST, to: T_CHART, what: 'White bloom; the helm is erased top-down as 1200 violet→gold embers; the cathedral pillars lean and fall out of the frame one by one; letterbox opens, wash goes amber. Escalation — the order comes down.' },
    { n: 3, from: T_CHART, to: T_HOLD, what: 'HARD CUT to the star chart: Origin Fields + Whispering Grove burn, the path crawls east, the camera pans + zooms onto the ink over the next place as it burns away; CHAPTER III / CRYSTAL DEPTHS assembles in violet with a rule. Turn.' },
    { n: 4, from: T_HOLD, to: T_END, what: 'The chart dims under one small breathing spark; "Good. Lines were never meant to hold light." assembles warm; fade → MapBreather. Payoff.' },
  ],
};
export default boss_outro_void_warden;
