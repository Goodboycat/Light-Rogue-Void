// (M5) SCENE `interrupt_4` — THE WALL OF EYES. Darkness Interrupt (pool of 6). Sim frozen + hidden; 5.0 s; DARKNESS tone.
// Hard cut back to gameplay where logic/DarknessInterrupt.ts spawns THE WATCH: a wall telegraph that sweeps the arena
// from one edge over 1.6 s with ONE gap (w 180) in it; survivable only by walking to the gap, never by outrunning the wall.
//
// STORYBOARD (written first — MOVIE.md §1.4)
// shot | start–end s | framing                           | camera move                     | what changes on screen                                                                                 | text                              | audio id
// -----|-------------|-----------------------------------|---------------------------------|--------------------------------------------------------------------------------------------------------|-----------------------------------|------------------
//  1   |  0.0– 1.2   | wide, the arena floor             | snap zoom 1.04, hold             | motes freeze, ink eats the floor, letterbox snaps; the line types                                       | "I have never once looked away." | boss_telegraph, thud, story_line
//  2   |  1.2– 3.2   | wide, a wall rises at the horizon | push that never stops            | an ink wall climbs from the floor; eyes open in it one by one (60 → 140), each blinking at its own rate | —                                 | drone, ambush_ring
//  3   |  3.2– 4.2   | HARD CUT: the wall fills the frame| hard cut closer, inverted frame  | every eye snaps to the camera at once; one dark seam in the wall where no eye is — the gap               | —                                 | boss_phase, noise
//  4   |  4.2– 5.0   | the name                          | lunge 1.5 → slam back            | the wall rushes the camera; the gap stays dark; THE WATCH slams in; flash; HARD CUT to black           | THE WATCH / WALK TO THE GAP       | sweep_up, boss_arrive, boss_enrage
// Setup (frozen floor) → escalation (the wall of eyes rises) → turn (they all look at once) → payoff (the wall rushes → gameplay).

import { K, easeOut, easeIn, easeInOut, span, lerp, step } from '../Engine';
import type { SceneDef, Gfx, LayerState, Cue } from '../Engine';
import { eye } from '../Draw';
import { glowDisc, rgba } from '../Sprites';
import { IT, freezeBed, interruptLine, threatName, ash, interruptPost, interruptZoom, interruptShakes, interruptCues, VIOLET, INK, wobble, hash, clamp01 } from './interruptKit';

const { rise: T_RISE, turn: T_TURN, strike: T_STRIKE, end: T_END } = IT;
const GAP_X = 260; // where the seam is (design px) — the thing the player learns to find

const drawBed = (g: Gfx, L: LayerState) => freezeBed(g, L);
const drawAsh = (g: Gfx, L: LayerState) => ash(g, L, 0.4 * span(g.t, T_RISE, T_RISE + 0.6), 5304);

/** shot 2: the wall climbs; shot 3: it fills the frame; shot 4: it rushes. Eyes open in it one by one, all lock at the turn. */
const drawWall = (g: Gfx, L: LayerState) => {
  const ctx = g.ctx; const t = g.t; const close = t >= T_TURN;
  const climb = easeOut(span(t, T_RISE, T_RISE + 1.0));
  const rush = easeIn(span(t, T_STRIKE, T_STRIKE + 0.35));
  const sc = close ? lerp(1.9, 3.4, rush) : lerp(0.75, 0.95, span(t, T_RISE, T_TURN));
  const top = close ? -1200 : lerp(700, -300, climb);
  ctx.save(); ctx.translate(0, close ? 40 : 0); ctx.scale(sc, sc);
  ctx.globalAlpha = L.alpha;
  // the wall: ink with a ragged crest
  ctx.fillStyle = INK; ctx.beginPath(); ctx.moveTo(-1600, 1400);
  for (let i = 0; i <= 48; i++) { const x = -1600 + i * (3200 / 48); ctx.lineTo(x, top + (hash(i, 5604) - 0.5) * 90 * (close ? 0 : 1)); }
  ctx.lineTo(1600, 1400); ctx.closePath(); ctx.fill();
  // the seam: a darker, slightly violet vertical crack where no eye grows — the gap (learned here, used in gameplay)
  const seamA = close ? 0.9 : 0.35 * climb;
  ctx.strokeStyle = rgba(VIOLET, seamA); ctx.lineWidth = close ? 3 : 2; ctx.beginPath(); ctx.moveTo(GAP_X, top - 40);
  for (let j = 1; j <= 14; j++) ctx.lineTo(GAP_X + (hash(j, 5605) - 0.5) * 30, top + j * 120); ctx.stroke();
  // the eyes: n grows with time (60 → 140), each opens at its own moment; at the turn all lock on the camera
  const n = close ? 140 : Math.floor(lerp(0, 140, easeInOut(span(t, T_RISE + 0.2, T_TURN - 0.1))));
  const lock = close ? 1 : 0;
  for (let i = 0; i < n; i++) {
    const h0 = hash(i, 5606), h1 = hash(i, 5607), h2 = hash(i, 5608);
    const x = (h0 - 0.5) * 3000; const y = top + 60 + h1 * (close ? 2400 : 1300 - (top - (-300)) * 0.3);
    if (Math.abs(x - GAP_X) < 110) continue; // nothing grows in the seam
    const born = T_RISE + 0.2 + h2 * 1.7; const op0 = easeOut(span(t, born, born + 0.25));
    const blink = lock ? 1 : clamp01(Math.sin(t * (0.6 + h2 * 0.8) + i * 2.7) * 4 + 0.6);
    const open = op0 * blink; if (open < 0.03) continue;
    const look = lock ? { x: -x / 1500 * 0.5, y: -(y - 200) / 1200 * 0.3 } : { x: wobble(t * 0.8 + i, 30) * 0.7, y: wobble(t * 0.6 + i, 31) * 0.3 };
    eye(g, x, y, { r: 26 + h2 * 50 + (lock ? 8 : 0), open, glow: lock ? 0.9 : 0.4, veins: 0, pupil: lock ? 0.07 : 0.14, look });
  }
  ctx.restore();
  // violet bruise behind the wall's crest
  ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = L.alpha * 0.22 * climb;
  ctx.drawImage(glowDisc(VIOLET, 256), -1300, (top * sc) - 350, 2600, 800);
  ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = L.alpha;
};
const drawLine = (g: Gfx, L: LayerState) => interruptLine(g, L, 'I have never once looked away.');
const drawName = (g: Gfx, L: LayerState) => threatName(g, L, 'THE WATCH', 'WALK TO THE GAP');

export const interrupt_4: SceneDef = {
  id: 'interrupt_4',
  duration: T_END,
  skipAfter: 0.6,
  camera: { zoom: interruptZoom(IT, 1.45), y: K(0, 0, T_RISE, 0, T_TURN - 0.01, -80, easeInOut, T_TURN, 0, step, T_END, 0), shakes: interruptShakes(IT) },
  layers: [
    { id: 'bed', parallax: 0.2, draw: drawBed },
    { id: 'wall', from: T_RISE, parallax: 1, draw: drawWall },
    { id: 'ash', from: T_RISE, parallax: 1.3, blend: 'lighter', draw: drawAsh },
    { id: 'line', parallax: 0, draw: drawLine },
    { id: 'name', from: T_STRIKE, parallax: 0, draw: drawName },
  ],
  post: interruptPost(IT),
  cues: ([...interruptCues(IT), { t: T_RISE + 0.4, sfx: 'ambush_ring', vol: 0.25 }, { t: T_RISE + 1.2, sfx: 'ambush_ring', vol: 0.3 }, { t: T_TURN + 0.05, sfx: 'boss_fire', vol: 0.6 }] as Cue[]),
  shots: [
    { n: 1, from: 0, to: T_RISE, what: 'Wide on the frozen floor: motes hang, ink eats the amber pool, letterbox snaps. "I have never once looked away." types cold. Setup.' },
    { n: 2, from: T_RISE, to: T_TURN, what: 'An ink wall climbs from the floor to the horizon; eyes open in it one by one until 140 are blinking at their own rates; one vertical violet seam where nothing grows. Push-in. Escalation.' },
    { n: 3, from: T_TURN, to: T_STRIKE, what: 'HARD CUT: the wall fills the frame and every eye snaps onto the camera at once (slit pupils, hot glow); the seam is the only dark thing left. Inverted frame. The turn.' },
    { n: 4, from: T_STRIKE, to: T_END, what: 'The wall rushes the camera (1.9× → 3.4×); the gap stays dark; THE WATCH slams in with the flash, WALK TO THE GAP in amber; HARD CUT to black → gameplay with the sweeping wall already drawn. Payoff.' },
  ],
};
export default interrupt_4;
