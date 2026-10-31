// (M4) SCENE `boss_outro_entropy_titan` — the mountain sits back down. Plays the frame ENTROPY TITAN's HP hits 0,
// gameplay hidden + paused; `onDone` → completeBossWave → MapBreather (the place reveal is shot 3 of this film). 9.2 s.
//
// STORYBOARD (written first, keyframes derived from it — MOVIE.md §1.4)
// shot | start–end s | framing                    | camera move                        | what changes on screen                                                                                                                   | text                                                       | audio id
// -----|-------------|----------------------------|------------------------------------|------------------------------------------------------------------------------------------------------------------------------------------|------------------------------------------------------------|------------------
//  1   |  0.0– 2.0   | wide, the standing Titan   | slow push, tilt up to the face     | the Titan frozen on its feet; the acid lattice across the summit goes DARK crack by crack; the two fissure-eyes close; amber light opens in the chest | "Sit. Everything sits, in the end."                       | boss_die, story_line
//  2   |  2.0– 4.6   | wide → low wide            | drift up; the ground drops         | the Titan kneels — the body sinks back into the plain along its own lift curve; the summit sheds as gold embers; the last boulders finally fall; dust ring at the knees; the sky's acid glow goes amber | —                                                 | enemy_die_big, pickup_essence
//  3   |  4.6– 7.4   | HARD CUT: the star chart   | wide → zoom out, the chart whole   | the chart: five places burn; the path crawls east to the far corner; the ink over the LAST place burns away; SEAM OF THE VOID in white      | CHAPTER VI / SEAM OF THE VOID                              | chapter_card, landmark_reveal, music_sting_reveal
//  4   |  7.4– 9.2   | centre, one spark          | hold                               | the chart fades under one small spark; LIGHT's answer; fade → MapBreather                                                                | "I'll sit when I've finished."                             | story_line
// Structure: setup (1: the lattice goes dark, the eyes close) → escalation (2: the mountain kneels and becomes a mountain again) → turn (3: cut to the chart) → payoff (4: the spark, LIGHT's answer).

import { K, easeOut, easeIn, easeInOut, span, lerp, hash, wobble, clamp01 } from '../Engine';
import type { SceneDef, Gfx, LayerState } from '../Engine';
import { GOLD, AMBER, gradientBg, ridge, embers } from '../Draw';
import { glowDisc, rgba } from '../Sprites';
import { OT, arenaAfter, cracks, comesApart, starChart, placeName, holdSpark, outroLines, outroPost, outroCamera, outroCues } from './outroKit';

const PLACE = 5, COLOR = '#84cc16', ACID = '#84cc16', PALE = '#d9f99d', ROCK = '#05070a', ROCK2 = '#0b1016';
const { burst: T_BURST, chart: T_CHART, hold: T_HOLD, end: T_END } = OT;

/** rise 1→0 over shot 2: the intro's lift reversed — the Titan sinks back into the plain */
const rise = (t: number) => 1 - easeInOut(span(t, T_BURST, T_CHART - 0.3));
/** dark 0→1 over shot 1: the acid goes out */
const dark = (t: number) => easeOut(span(t, 0.3, T_BURST - 0.2));

const drawArena = (g: Gfx, L: LayerState) => arenaAfter(g, L, OT, COLOR);
const drawSky = (g: Gfx, L: LayerState) => {
  const ctx = g.ctx; const t = g.t; const a = L.alpha; const d = dark(t); const warm = easeOut(span(t, T_BURST, T_CHART - 0.5));
  ctx.globalAlpha = a; gradientBg(g, '#020403', warm > 0.5 ? '#14100a' : '#06140a', '#000000', 0.55);
  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha = a * 0.22 * (1 - d * 0.8) * (1 - warm); ctx.drawImage(glowDisc(ACID, 256), -2200, -200, 4400, 1300);
  ctx.globalAlpha = a * 0.25 * warm; ctx.drawImage(glowDisc(GOLD, 256), -2200, 0, 4400, 1500);
  ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = L.alpha;
};
const drawFarRidges = (g: Gfx, L: LayerState) => {
  const ctx = g.ctx; ctx.globalAlpha = L.alpha;
  ridge(g, 520, 90, 5101, '#03050a', 3000, 40, g.t * 0.1); ridge(g, 640, 60, 5102, '#040608', 3000, 44, g.t * 0.2);
  ctx.globalAlpha = L.alpha;
};
/** the Titan standing — the intro's body at rise 1 — then sinking; the summit's rim turns from acid to gold */
function titanBody(g: Gfx, a: number) {
  const ctx = g.ctx; const t = g.t; const r = rise(t); if (a <= 0) return;
  const lift = r * 700; const settle = Math.sin(t * 0.6) * 6 * r;
  ctx.save(); ctx.translate(0, -lift + settle); ctx.globalAlpha = a;
  ctx.fillStyle = ROCK; const sh = -r * 160;
  ctx.beginPath(); ctx.moveTo(-1900, 1500 + lift);
  ctx.lineTo(-1500, 620); ctx.lineTo(-1100, 420 + sh); ctx.lineTo(-760, 180 + sh); ctx.lineTo(-520, 60 + sh * 0.6);
  ctx.lineTo(-300, -60); ctx.bezierCurveTo(-280, -300, -120, -420, 0, -430); ctx.bezierCurveTo(120, -420, 280, -300, 300, -60);
  ctx.lineTo(540, 90); ctx.lineTo(820, 240); ctx.lineTo(1150, 460); ctx.lineTo(1500, 640); ctx.lineTo(1900, 1500 + lift); ctx.closePath(); ctx.fill();
  // the arm, planted; it slides back into the slope as it sinks
  const arm = r; if (arm > 0.05) { ctx.beginPath(); ctx.moveTo(-760, 180 + sh); ctx.lineTo(lerp(-760, -1500, arm), lerp(180 + sh, 500, arm)); ctx.lineTo(lerp(-760, -1620, arm), lerp(300 + sh, 740, arm)); ctx.lineTo(lerp(-760, -1250, arm), lerp(380 + sh, 820, arm)); ctx.lineTo(-620, 420 + sh * 0.5); ctx.closePath(); ctx.fill();
    ctx.fillRect(lerp(-1500, -1700, arm), lerp(520, 640, arm), 260 * arm, 220 * arm); }
  // legs: fold as it kneels (they shorten with r)
  if (r > 0.05) { ctx.beginPath(); ctx.moveTo(-900, 900 + lift * 0.2); ctx.lineTo(-700, 1500 + lift); ctx.lineTo(-250, 1500 + lift); ctx.lineTo(-380, 800); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(380, 800); ctx.lineTo(250, 1500 + lift); ctx.lineTo(700, 1500 + lift); ctx.lineTo(900, 900 + lift * 0.2); ctx.closePath(); ctx.fill(); }
  // rim: acid → gold as the light inside reaches the edge
  const d = dark(t);
  ctx.strokeStyle = rgba(d > 0.5 ? GOLD : ACID, (0.35 + 0.4 * d) * a); ctx.lineWidth = 2 + d * 2; ctx.beginPath(); ctx.moveTo(-760, 180 + sh); ctx.lineTo(-520, 60 + sh * 0.6); ctx.lineTo(-300, -60); ctx.bezierCurveTo(-280, -300, -120, -420, 0, -430); ctx.stroke();
  ctx.restore(); ctx.globalAlpha = a;
}
const drawTitan = (g: Gfx, L: LayerState) => titanBody(g, L.alpha);
/** the face: the lattice goes dark segment by segment (reverse of the intro), the eyes close; after the burst nothing */
const drawFace = (g: Gfx, L: LayerState) => {
  const ctx = g.ctx; const t = g.t; const r = rise(t); const lift = r * 700 - Math.sin(t * 0.6) * 6 * r; const d = dark(t);
  const gone = span(t, T_BURST, T_BURST + 0.5); if (gone >= 1) return;
  ctx.save(); ctx.translate(0, -lift); ctx.globalAlpha = L.alpha * (1 - gone);
  const n = 34; const pulse = 0.7 + 0.3 * Math.sin(t * 5) * (1 - d);
  ctx.strokeStyle = rgba(ACID, 0.85 * pulse); ctx.lineWidth = 2.2; ctx.beginPath();
  for (let i = 0; i < n; i++) {
    if (hash(i, 5029) < d) continue;                       // this crack has gone out
    let x = (hash(i, 5021) - 0.5) * 520, y = -400 + hash(i, 5022) * 330; ctx.moveTo(x, y);
    for (let s = 0; s < 5; s++) { const an = hash(i * 7 + s, 5023) * Math.PI * 2; x += Math.cos(an) * 50; y += Math.sin(an) * 40; ctx.lineTo(x, y); }
  }
  ctx.stroke();
  ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = L.alpha * 0.25 * (1 - d) * (1 - gone); ctx.drawImage(glowDisc(ACID, 256), -420, -560, 840, 560); ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = L.alpha * (1 - gone);
  // eyes closing: the fissures narrow to lines; the pupils roll up
  const open = 1 - easeInOut(span(t, 0.6, T_BURST - 0.4));
  if (open > 0.02) for (const sx of [-1, 1]) {
    const ex = sx * 115, ey = -230; const w = 85, h = 26 * open;
    ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = L.alpha * open * 0.9 * (1 - gone); ctx.drawImage(glowDisc(ACID, 128), ex - w * 2, ey - w * 2, w * 4, w * 4); ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = L.alpha * (1 - gone); ctx.fillStyle = PALE; ctx.beginPath(); ctx.moveTo(ex - w, ey); ctx.quadraticCurveTo(ex, ey - h * 1.6, ex + w, ey); ctx.quadraticCurveTo(ex, ey + h * 1.6, ex - w, ey); ctx.fill();
    ctx.fillStyle = '#000'; ctx.beginPath(); ctx.arc(ex, ey - (1 - open) * 14, Math.min(h * 0.6, 15), 0, Math.PI * 2); ctx.fill();
  }
  // the hanging boulders: they hang through shot 1; at the burst gravity remembers them (they drop)
  const drop = easeIn(span(t, T_BURST - 0.2, T_BURST + 1.2));
  ctx.fillStyle = ROCK2; ctx.beginPath(); for (let i = 0; i < 26; i++) { const h0 = hash(i, 5031), h1 = hash(i, 5032); const bx = (h0 - 0.5) * 900, by = -480 + h1 * 500 + drop * 1900 * (0.6 + h1) + wobble(t * 0.5 + i, 5033) * 8 * (1 - drop); const s = 8 + hash(i, 5034) * 26; ctx.moveTo(bx + s, by); ctx.lineTo(bx + s * 0.3, by - s); ctx.lineTo(bx - s, by - s * 0.4); ctx.lineTo(bx - s * 0.6, by + s * 0.7); ctx.closePath(); } ctx.fill();
  ctx.restore(); ctx.globalAlpha = L.alpha;
};
/** amber cracks in the chest + the white bloom before the burst */
const drawCracks = (g: Gfx, L: LayerState) => {
  const c = easeOut(span(g.t, 0.5, T_BURST)) * (1 - span(g.t, T_BURST, T_BURST + 0.6)); if (c <= 0) return;
  const lift = rise(g.t) * 700;
  cracks(g, 0, 300 - lift, 9, 520, c, 84, GOLD, L.alpha); cracks(g, -200, -100 - lift, 6, 380, c * 0.8, 85, AMBER, L.alpha); cracks(g, 220, 60 - lift, 6, 360, c * 0.7, 86, GOLD, L.alpha);
  const ctx = g.ctx; const b = span(g.t, T_BURST - 0.4, T_BURST); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = L.alpha * b * 0.7; ctx.drawImage(glowDisc('#fff7e6', 256), -800, -900 - lift * 0.5, 1600, 1600); ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = L.alpha;
};
/** the kneel: dust rings roll out from the knees as the body sinks; shards and dust rise and fall */
const drawDust = (g: Gfx, L: LayerState) => {
  const ctx = g.ctx; const t = g.t; const u = span(t, T_BURST + 0.3, T_CHART); if (u <= 0) return;
  const rings = 4; ctx.strokeStyle = rgba(PALE, L.alpha * 0.5 * (1 - u)); ctx.lineWidth = 3; ctx.beginPath();
  for (let k = 0; k < rings; k++) { const rr = easeOut(clamp01(u * 1.5 - k * 0.2)) * 1900; if (rr <= 0) continue; ctx.moveTo(rr, 760); ctx.ellipse(0, 760, rr, rr * 0.22, 0, 0, Math.PI * 2); }
  ctx.stroke();
  embers(g, { n: 700, x: -1600, y: 500, w: 3200, h: 500, rise: 320, drift: 160, rMin: 1.5, rMax: 5, colors: ['#3f3f46', GOLD, '#71717a'], life: 1.8, seed: 5141 }, L.alpha * (1 - u) * 0.9, g.t - T_BURST - 0.3);
};
const drawEmbers = (g: Gfx, L: LayerState) => comesApart(g, L, { x: -600, y: -500, w: 1200, h: 1100 }, COLOR, OT, 4401);
const drawChart = (g: Gfx, L: LayerState) => starChart(g, L, PLACE);
const drawPlace = (g: Gfx, L: LayerState) => placeName(g, L, PLACE);
const drawHold = (g: Gfx, L: LayerState) => holdSpark(g, L);
const drawLines = (g: Gfx, L: LayerState) => outroLines(g, L, 'Sit. Everything sits, in the end.', "I'll sit when I've finished.");

export const boss_outro_entropy_titan: SceneDef = {
  id: 'boss_outro_entropy_titan',
  duration: T_END,
  skipAfter: 0.6,
  camera: { ...outroCamera(PLACE, OT, 1.08), y: K(0, 80, T_BURST, -120, easeInOut, T_CHART - 0.01, 40, easeInOut, T_CHART, 0, easeOut, T_END, 0) },
  layers: [
    { id: 'arena', to: T_CHART, parallax: 0.2, alpha: K(0, 0.5, T_CHART - 0.3, 0.7, T_CHART, 0), draw: drawArena },
    { id: 'sky', to: T_CHART, parallax: 0.1, alpha: K(0, 1, T_CHART - 0.3, 1, T_CHART, 0), draw: drawSky },
    { id: 'ridges', to: T_CHART, parallax: 0.4, alpha: K(0, 1, T_CHART - 0.3, 1, T_CHART, 0), draw: drawFarRidges },
    { id: 'titan', to: T_CHART, parallax: 0.9, alpha: K(0, 1, T_CHART - 0.3, 1, T_CHART, 0), draw: drawTitan },
    { id: 'face', to: T_CHART, parallax: 0.9, draw: drawFace },
    { id: 'cracks', to: T_BURST + 0.6, parallax: 0.9, draw: drawCracks },
    { id: 'dust', from: T_BURST + 0.3, to: T_CHART, parallax: 1, draw: drawDust },
    { id: 'embers', from: T_BURST, to: T_CHART, parallax: 1.1, draw: drawEmbers },
    { id: 'chart', from: T_CHART, parallax: 1, alpha: K(0, 1, T_HOLD, 1, T_HOLD + 0.8, 0.25), draw: drawChart },
    { id: 'place', from: T_CHART + 1.5, to: T_HOLD, parallax: 0, draw: drawPlace },
    { id: 'hold', from: T_HOLD, parallax: 0, draw: drawHold },
    { id: 'lines', parallax: 0, draw: drawLines },
  ],
  post: outroPost(OT),
  cues: [...outroCues(OT), { t: T_BURST + 0.3, sfx: 'boss_telegraph', vol: 0.5 }, { t: T_BURST + 1.6, sfx: 'enemy_die_big', vol: 0.4 }, { t: T_CHART - 0.4, sfx: 'enemy_die_big', vol: 0.3 }],
  shots: [
    { n: 1, from: 0, to: T_BURST, what: 'Wide on the standing Titan, tilt up to the face; the acid lattice goes dark crack by crack, the fissure-eyes close, the rim turns gold, amber cracks open in the chest. "Sit. Everything sits, in the end." Setup.' },
    { n: 2, from: T_BURST, to: T_CHART, what: 'White bloom; the mountain kneels — the body sinks back into the plain along the intro\'s lift curve, the arm slides home, the boulders finally fall; the summit sheds as gold embers; dust rings roll from the knees; the acid sky goes amber. Escalation — a mountain again.' },
    { n: 3, from: T_CHART, to: T_HOLD, what: 'HARD CUT to the star chart: five places burn, the path crawls east to the far corner, the camera pans + zooms onto the ink over the last place as it burns away; CHAPTER VI / SEAM OF THE VOID assembles in white with a rule. Turn.' },
    { n: 4, from: T_HOLD, to: T_END, what: 'The chart dims under one small breathing spark; "I\'ll sit when I\'ve finished." assembles warm; fade → MapBreather. Payoff.' },
  ],
};
export default boss_outro_entropy_titan;
