// (M5) SCENE `interrupt_6` — THE STARE. Darkness Interrupt (pool of 6). Sim frozen + hidden; 5.0 s; DARKNESS tone.
// Hard cut back to gameplay where logic/DarknessInterrupt.ts spawns THE SILENCE: the whole arena goes dark except a
// lit disc (r 240) that drifts slowly away from the spark for 2 s; everything outside the light hurts — follow the light.
//
// STORYBOARD (written first — MOVIE.md §1.4)
// shot | start–end s | framing                             | camera move                     | what changes on screen                                                                                   | text                         | audio id
// -----|-------------|-------------------------------------|---------------------------------|----------------------------------------------------------------------------------------------------------|------------------------------|------------------
//  1   |  0.0– 1.2   | wide, the arena floor               | snap zoom 1.04, hold             | motes freeze, ink eats the floor, letterbox snaps; the line types                                         | "Look at me."                | boss_telegraph, thud, story_line
//  2   |  1.2– 3.2   | NOTHING — true black, one pinprick  | push that never stops            | a single violet pinprick far away; it does not blink; the ash drifts toward it; nothing else exists       | —                            | drone, ambush_ring
//  3   |  3.2– 4.2   | HARD CUT: the pinprick is a pupil   | hard cut closer, inverted frame  | the pupil is enormous and 20 px from the camera; the iris is the whole frame; it has been this close all along | —                        | boss_phase, noise
//  4   |  4.2– 5.0   | the name                            | lunge 1.5 → slam back            | the pupil dilates to swallow the frame; the floor's amber pool shrinks to a disc; THE SILENCE slams in; flash; HARD CUT | THE SILENCE / FOLLOW THE LIGHT | sweep_up, boss_arrive, boss_enrage
// Setup (frozen floor) → escalation (true black, one point — restraint as horror) → turn (it was always this close) → payoff (it swallows the light → gameplay).

import { K, easeOut, easeIn, span, lerp, step } from '../Engine';
import type { SceneDef, Gfx, LayerState, Cue } from '../Engine';
import { eye, embers, pool } from '../Draw';
import { glowDisc, irisSprite } from '../Sprites';
import { IT, freezeBed, interruptLine, threatName, interruptPost, interruptZoom, interruptShakes, interruptCues, VIOLET, GOLD, WARM_WHITE, wobble } from './interruptKit';

const { rise: T_RISE, turn: T_TURN, strike: T_STRIKE, end: T_END } = IT;

const drawBed = (g: Gfx, L: LayerState) => freezeBed(g, L);
/** shot 2: nothing. A black slab over everything, one violet pinprick (r 3 → 6) far up and right; the ash drifts toward it */
const drawNothing = (g: Gfx, L: LayerState) => {
  const ctx = g.ctx; const t = g.t; if (t >= T_TURN) return;
  const u = easeOut(span(t, T_RISE, T_RISE + 0.4));
  ctx.globalAlpha = L.alpha * u; ctx.fillStyle = '#000000'; ctx.fillRect(-2800, -1600, 5600, 3200);
  const px = 180, py = -140; const r = lerp(2, 6, span(t, T_RISE + 0.4, T_TURN)) * (1 + 0.08 * wobble(t * 1.5, 60));
  ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = L.alpha * u * 0.9;
  ctx.drawImage(glowDisc(VIOLET, 64), px - r * 5, py - r * 5, r * 10, r * 10);
  ctx.globalAlpha = L.alpha * u; ctx.drawImage(glowDisc('#ffffff', 32), px - r, py - r, r * 2, r * 2);
  // ash falling INTO the point: a field whose "rise" is replaced by a slow pull (cheap: one field drawn around the point)
  embers(g, { n: 180, x: px - 900, y: py - 700, w: 1800, h: 1400, rise: 0, drift: 2, rMin: 0.8, rMax: 2.2, colors: ['#3b2a73', '#6d5bd0', '#241748'], life: 7, seed: 5906 }, L.alpha * u * 0.6 * span(t, T_RISE + 0.5, T_TURN), g.ta * 0.4);
  ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = L.alpha;
};
/** shot 3: the pinprick was the pupil — the iris is the whole frame, the pupil 20 px away; shot 4: it dilates and swallows */
const drawStare = (g: Gfx, L: LayerState) => {
  const ctx = g.ctx; const t = g.t; if (t < T_TURN) return;
  const dil = easeIn(span(t, T_STRIKE, T_STRIKE + 0.35));
  const R = 1700; const pupil = lerp(0.05, 0.9, dil) * (1 + 0.02 * wobble(t * 9, 61));
  ctx.globalAlpha = L.alpha;
  // the iris fills the frame: one big sprite blit, slowly rotating fibres (rotation is a cheap transform)
  ctx.save(); ctx.translate(0, 20); ctx.rotate((t - T_TURN) * 0.08); ctx.drawImage(irisSprite(512, VIOLET, '#1a0d33'), -R, -R, R * 2, R * 2); ctx.restore();
  // the eye helper draws lid + pupil over it with a hard black rim; look straight at the camera
  eye(g, 0, 20, { r: R, open: 1, look: { x: 0, y: 0 }, pupil, glow: 0.2, veins: 26 });
  // the pupil's hard core (an absence)
  ctx.fillStyle = '#000000'; ctx.beginPath(); ctx.arc(0, 20, R * pupil * 0.98, 0, Math.PI * 2); ctx.fill();
  ctx.globalAlpha = L.alpha;
};
/** shot 4: the floor's warm pool — what gameplay will leave you — shrinking to a disc inside the pupil (the telegraph, learned here) */
const drawLight = (g: Gfx, L: LayerState) => {
  const t = g.t; const dil = easeIn(span(t, T_STRIKE, T_STRIKE + 0.35)); if (dil <= 0) return;
  const r = lerp(900, 170, dil); const x = lerp(0, 140, dil), y = lerp(80, 60, dil);
  pool(g, x, y, r, GOLD, 0.5 * L.alpha); pool(g, x, y, r * 0.35, WARM_WHITE, 0.6 * L.alpha);
  g.ctx.globalAlpha = L.alpha;
};
const drawLine = (g: Gfx, L: LayerState) => interruptLine(g, L, 'Look at me.');
const drawName = (g: Gfx, L: LayerState) => threatName(g, L, 'THE SILENCE', 'FOLLOW THE LIGHT');

export const interrupt_6: SceneDef = {
  id: 'interrupt_6',
  duration: T_END,
  skipAfter: 0.6,
  camera: { zoom: interruptZoom(IT, 1.5), shakes: [...interruptShakes(IT), { t: T_TURN + 0.02, amp: 6, decay: 2, freq: 30 }] },
  layers: [
    { id: 'bed', parallax: 0.2, draw: drawBed },
    { id: 'nothing', from: T_RISE, to: T_TURN, parallax: 0.6, draw: drawNothing },
    { id: 'stare', from: T_TURN, parallax: 1, draw: drawStare },
    { id: 'light', from: T_STRIKE, parallax: 1, blend: 'lighter', draw: drawLight },
    { id: 'line', parallax: 0, draw: drawLine },
    { id: 'name', from: T_STRIKE, parallax: 0, draw: drawName },
  ],
  // the one interrupt whose escalation is RESTRAINT: no grain spike before the turn, the drone alone
  post: { ...interruptPost(IT, 0.95), grain: K(0, 0.2, 0.7, 0.3, T_RISE, 0.1, T_TURN - 0.01, 0.1, T_TURN, 0.95, step, T_STRIKE, 0.6, T_END, 0.75) },
  cues: ([...interruptCues(IT).filter((c) => !('sfx' in c && c.sfx === 'ambush_ring')), { t: T_RISE + 0.2, duck: 0.05, duckMs: 600 }, { t: T_TURN, sfx: 'boss_fire', vol: 0.9 }] as Cue[]),
  shots: [
    { n: 1, from: 0, to: T_RISE, what: 'Wide on the frozen floor: motes hang, ink eats the amber pool, letterbox snaps. "Look at me." types cold — three words. Setup.' },
    { n: 2, from: T_RISE, to: T_TURN, what: 'NOTHING. True black, the music ducked to near silence, one violet pinprick far up and right that does not blink; violet ash drifts into it. Two seconds of restraint. Escalation by absence.' },
    { n: 3, from: T_TURN, to: T_STRIKE, what: 'HARD CUT: the pinprick was a pupil 20 px from the camera; the iris (r 1700) is the whole frame, slowly turning, 26 veins. It has been this close the entire time. Inverted frame. The turn.' },
    { n: 4, from: T_STRIKE, to: T_END, what: 'The pupil dilates to swallow the frame; inside it the floor\'s warm pool shrinks to a small disc and drifts; THE SILENCE slams in with the flash, FOLLOW THE LIGHT in amber; HARD CUT to black → gameplay with the arena already dark except the drifting disc. Payoff.' },
  ],
};
export default interrupt_6;
