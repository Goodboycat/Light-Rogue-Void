// (M5) SCENE `interrupt_1` — THE EYE. One of the six Darkness Interrupts (pool). Sim frozen + hidden; 5.0 s; DARKNESS tone.
// Hard cut back to gameplay where logic/DarknessInterrupt.ts spawns THE GAZE: a line telegraph that tracks the spark for
// 1.2 s then locks and fires — survivable by stepping OUT of the line, never by dashing along it.
//
// STORYBOARD (written first — MOVIE.md §1.4)
// shot | start–end s | framing                       | camera move                   | what changes on screen                                                                                 | text                                   | audio id
// -----|-------------|-------------------------------|-------------------------------|--------------------------------------------------------------------------------------------------------|----------------------------------------|------------------
//  1   |  0.0– 1.2   | wide, the arena floor         | snap zoom 1.04, hold           | the motes freeze mid-air, ink eats the floor in 0.5 s, letterbox snaps shut; the line types             | "You think running is living?"         | boss_telegraph, thud, story_line
//  2   |  1.2– 3.2   | wide → medium                 | push that never stops         | a lid opens low in the frame: the Eye, r 420, its pupil wandering, veins crawling; violet ash hangs      | —                                      | drone, ambush_ring
//  3   |  3.2– 4.2   | HARD CUT: close on the iris   | hard cut closer, inverted frame| the pupil snaps onto the camera and narrows to a slit; the sclera fills the frame                        | —                                      | boss_phase, noise
//  4   |  4.2– 5.0   | the name                      | lunge 1.5 → slam back         | a beam of absence tears from the pupil toward the camera; THE GAZE slams in; flash; HARD CUT to black  | THE GAZE / STEP OUT OF ITS LINE         | sweep_up, boss_arrive, boss_enrage
// Setup (frozen floor, one line) → escalation (the Eye opens) → turn (it finds you) → payoff (the beam + name → gameplay).

import { K, easeOut, easeIn, span, lerp, step } from '../Engine';
import type { SceneDef, Gfx, LayerState, Cue } from '../Engine';
import { eye, tendrils } from '../Draw';
import { glowDisc, rgba } from '../Sprites';
import { IT, freezeBed, interruptLine, threatName, inkRise, ash, interruptPost, interruptZoom, interruptShakes, interruptCues, VIOLET, INK, wobble } from './interruptKit';

const { rise: T_RISE, turn: T_TURN, strike: T_STRIKE, end: T_END } = IT;

const drawBed = (g: Gfx, L: LayerState) => freezeBed(g, L);
const drawInk = (g: Gfx, L: LayerState) => inkRise(g, L, easeOut(span(g.t, T_RISE - 0.2, T_TURN)), 5201);
const drawAsh = (g: Gfx, L: LayerState) => ash(g, L, 0.5 * span(g.t, T_RISE, T_RISE + 0.6));
/** shot 2: the Eye low in the frame, lid opening, pupil wandering; shot 3: close, pupil locked on the camera, slit */
const drawEye = (g: Gfx, L: LayerState) => {
  const t = g.t; const close = t >= T_TURN;
  const open = close ? 1 : easeOut(span(t, T_RISE, T_RISE + 1.1)) * (0.75 + 0.25 * easeOut(span(t, T_RISE + 1.1, T_TURN)));
  const wander = close ? 0 : 1 - span(t, T_TURN - 0.4, T_TURN);
  const look = close ? { x: 0, y: 0.05 } : { x: wobble(t * 0.9, 21) * 0.8 * wander, y: wobble(t * 0.7, 22) * 0.5 * wander };
  const r = close ? 1500 : 420; const y = close ? 40 : 170;
  const pupil = close ? lerp(0.16, 0.05, easeIn(span(t, T_TURN, T_STRIKE))) : 0.16;
  eye(g, 0, y, { r, open, look, pupil, glow: close ? 0.3 : 1, veins: close ? 22 : 14 });
  if (!close) tendrils(g, 0, y + 80, 9, 900, Math.PI / 2, 2.4, 61, easeOut(span(t, T_RISE + 0.3, T_TURN)) * 0.8);
  g.ctx.globalAlpha = L.alpha;
};
/** shot 4: the beam — a widening wedge of ink with a violet hairline, from the pupil to the camera (bottom of frame) */
const drawBeam = (g: Gfx, L: LayerState) => {
  const ctx = g.ctx; const t = g.t; const u = easeIn(span(t, T_STRIKE, T_STRIKE + 0.35)); if (u <= 0) return;
  const w = 60 + 900 * u; const y0 = 40;
  ctx.globalAlpha = L.alpha; ctx.fillStyle = INK; ctx.beginPath(); ctx.moveTo(-w * 0.08, y0); ctx.lineTo(w * 0.08, y0); ctx.lineTo(w, 1200); ctx.lineTo(-w, 1200); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = rgba(VIOLET, 0.8); ctx.lineWidth = 3; ctx.stroke();
  ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = L.alpha * 0.6 * u; ctx.drawImage(glowDisc(VIOLET, 256), -600, -500, 1200, 1100); ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = L.alpha;
};
const drawLine = (g: Gfx, L: LayerState) => interruptLine(g, L, 'You think running is living?');
const drawName = (g: Gfx, L: LayerState) => threatName(g, L, 'THE GAZE', 'STEP OUT OF ITS LINE');

export const interrupt_1: SceneDef = {
  id: 'interrupt_1',
  duration: T_END,
  skipAfter: 0.6,
  camera: { zoom: interruptZoom(IT, 1.5), y: K(0, 0, T_RISE, 0, T_TURN - 0.01, 60, T_TURN, 0, step, T_END, 0), shakes: interruptShakes(IT) },
  layers: [
    { id: 'bed', parallax: 0.2, draw: drawBed },
    { id: 'ink', from: T_RISE - 0.2, parallax: 1.1, draw: drawInk },
    { id: 'eye', from: T_RISE, parallax: 1, draw: drawEye },
    { id: 'ash', from: T_RISE, parallax: 1.3, blend: 'lighter', draw: drawAsh },
    { id: 'beam', from: T_STRIKE, parallax: 1, draw: drawBeam },
    { id: 'line', parallax: 0, draw: drawLine },
    { id: 'name', from: T_STRIKE, parallax: 0, draw: drawName },
  ],
  post: interruptPost(IT),
  cues: ([...interruptCues(IT), { t: T_RISE + 0.5, sfx: 'cin_whisper', vol: 0.3 }] as Cue[]),
  shots: [
    { n: 1, from: 0, to: T_RISE, what: 'Wide on the frozen arena floor: the motes hang mid-air, ink eats the amber pool in half a second, the letterbox snaps to 0.2 with an aberration spike. "You think running is living?" types cold. Setup.' },
    { n: 2, from: T_RISE, to: T_TURN, what: 'A lid opens low in the frame: the Eye (r 420) with a wandering slit pupil and crawling veins; nine tendrils of absence reach down; ink drips up from the bottom edge; violet ash hangs. Push-in that never stops. Escalation.' },
    { n: 3, from: T_TURN, to: T_STRIKE, what: 'HARD CUT close on the iris (r 1500, the sclera fills the frame), inverted frame, the pupil locks on the camera and narrows to a slit. It found you. The turn.' },
    { n: 4, from: T_STRIKE, to: T_END, what: 'A wedge of ink with a violet hairline tears from the pupil to the camera; THE GAZE slams in letter by letter with the flash, STEP OUT OF ITS LINE in amber under the rule; HARD CUT to black → gameplay with the tracking line already drawn. Payoff.' },
  ],
};
export default interrupt_1;
