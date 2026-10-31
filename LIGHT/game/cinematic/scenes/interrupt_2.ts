// (M5) SCENE `interrupt_2` — THE HAND. Darkness Interrupt (pool of 6). Sim frozen + hidden; 5.0 s; DARKNESS tone.
// Hard cut back to gameplay where logic/DarknessInterrupt.ts spawns THE PALM: a huge circle shadow (r 320) that leads the
// spark's dash direction for 1 s, then slams. A blind dash runs INTO it; standing still beside the shadow's edge survives.
//
// STORYBOARD (written first — MOVIE.md §1.4)
// shot | start–end s | framing                        | camera move                    | what changes on screen                                                                              | text                              | audio id
// -----|-------------|--------------------------------|--------------------------------|-----------------------------------------------------------------------------------------------------|-----------------------------------|------------------
//  1   |  0.0– 1.2   | wide, the arena floor          | snap zoom 1.04, hold            | motes freeze, ink eats the floor, letterbox snaps; the line types                                   | "Hold still. It is quicker."      | boss_telegraph, thud, story_line
//  2   |  1.2– 3.2   | wide → medium, from above      | push that never stops           | five fingers of ink come down from the top edge, joints cracking into place; a shadow pools below   | —                                 | drone, ambush_ring
//  3   |  3.2– 4.2   | HARD CUT: the palm, close      | hard cut closer, inverted frame | the palm fills the frame, lines of the hand are violet veins, it splays — the fingers reach for you | —                                 | boss_phase, noise
//  4   |  4.2– 5.0   | the name                       | lunge 1.5 → slam back           | the hand drops 900 px in 0.35 s; the shadow snaps black; THE PALM slams in; flash; HARD CUT to black | THE PALM / STAND STILL AT ITS EDGE | sweep_up, boss_arrive, boss_enrage
// Setup (frozen floor) → escalation (the fingers descend) → turn (the palm opens on you) → payoff (the slam → gameplay).

import { K, easeOut, easeIn, easeInOut, span, lerp, step } from '../Engine';
import type { SceneDef, Gfx, LayerState, Cue } from '../Engine';
import { glowDisc, rgba } from '../Sprites';
import { IT, freezeBed, interruptLine, threatName, inkRise, ash, interruptPost, interruptZoom, interruptShakes, interruptCues, VIOLET, INK, wobble, hash } from './interruptKit';

const { rise: T_RISE, turn: T_TURN, strike: T_STRIKE, end: T_END } = IT;

const drawBed = (g: Gfx, L: LayerState) => freezeBed(g, L);
const drawInk = (g: Gfx, L: LayerState) => inkRise(g, L, 0.5 * easeOut(span(g.t, T_RISE, T_TURN)), 5202);
const drawAsh = (g: Gfx, L: LayerState) => ash(g, L, 0.45 * span(g.t, T_RISE, T_RISE + 0.6), 5302);

/** one finger: a tapered ink polygon with two joints (hinge angles from `bend`), drawn in the hand's local space */
function finger(ctx: CanvasRenderingContext2D, x: number, len: number, w: number, bend: number, spread: number) {
  const seg = len / 3; let px = x, py = 0, a = Math.PI / 2 + spread;
  ctx.beginPath(); ctx.moveTo(x - w, 0); ctx.lineTo(x + w, 0);
  const pts: [number, number][] = [];
  for (let s = 0; s < 3; s++) { a += bend * (s === 0 ? 0.3 : 0.6); px += Math.cos(a) * seg; py += Math.sin(a) * seg; pts.push([px, py]); }
  const ww = [w * 0.9, w * 0.75, w * 0.45];
  for (let s = 0; s < 3; s++) ctx.lineTo(pts[s][0] + ww[s], pts[s][1]);
  ctx.lineTo(pts[2][0], pts[2][1] + w * 0.6);
  for (let s = 2; s >= 0; s--) ctx.lineTo(pts[s][0] - ww[s], pts[s][1]);
  ctx.closePath(); ctx.fill();
}
/** the shadow pooling on the floor under the hand (the gameplay telegraph, learned here) */
const drawShadow = (g: Gfx, L: LayerState) => {
  const ctx = g.ctx; const t = g.t; const u = easeOut(span(t, T_RISE + 0.2, T_TURN)); if (u <= 0) return;
  const slam = easeIn(span(t, T_STRIKE, T_STRIKE + 0.35));
  const r = lerp(60, 340, u) * (1 + slam * 0.6); const y = t >= T_TURN ? 300 : 260;
  ctx.globalAlpha = L.alpha * (0.55 + 0.45 * slam);
  ctx.fillStyle = INK; ctx.beginPath(); ctx.ellipse(0, y, r, r * 0.42, 0, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = rgba(VIOLET, 0.7 * (1 - slam)); ctx.lineWidth = 2 + 4 * wobble(t * 9, 3); ctx.stroke();
  ctx.globalAlpha = L.alpha;
};
/** shot 2: the hand comes down from above, fingers hinging into place; shot 3: close on the open palm; shot 4: the drop */
const drawHand = (g: Gfx, L: LayerState) => {
  const ctx = g.ctx; const t = g.t; const close = t >= T_TURN;
  const down = easeOut(span(t, T_RISE, T_RISE + 1.4));
  const drop = easeIn(span(t, T_STRIKE, T_STRIKE + 0.35));
  const sc = close ? 2.6 : lerp(0.9, 1.15, span(t, T_RISE, T_TURN));
  const y = close ? -420 + drop * 900 : lerp(-900, -380, down);
  ctx.save(); ctx.translate(0, y); ctx.scale(sc, sc);
  ctx.fillStyle = INK; ctx.globalAlpha = L.alpha;
  // palm: a slab with a rounded heel
  ctx.beginPath(); ctx.moveTo(-230, -400); ctx.lineTo(230, -400); ctx.lineTo(250, 40); ctx.quadraticCurveTo(0, 150, -250, 40); ctx.closePath(); ctx.fill();
  // five fingers hinge from the palm's lower edge; in shot 3 they splay (reach), at the strike they clench
  const splay = close ? easeInOut(span(t, T_TURN, T_TURN + 0.5)) : 0; const clench = drop;
  for (let i = 0; i < 5; i++) {
    const h = hash(i, 5402); const x = -200 + i * 100 + (h - 0.5) * 16; const len = (i === 0 || i === 4 ? 300 : 380) + h * 50;
    const wig = wobble(t * 2.1 + i * 1.3, 40 + i) * 0.08 * (close ? 0.3 : 1);
    const bend = lerp(0.55, 0.08, easeOut(span(t, T_RISE + 0.3 + i * 0.12, T_RISE + 1.2 + i * 0.12))) * (1 - splay) + wig + clench * 0.9;
    finger(ctx, x, len, 36, bend, (i - 2) * 0.1 * splay);
  }
  // lines of the hand: violet veins, stronger in the close shot
  ctx.strokeStyle = rgba(VIOLET, (close ? 0.75 : 0.35) * (1 - clench)); ctx.lineWidth = close ? 2.2 : 3; ctx.beginPath();
  ctx.moveTo(-180, -300); ctx.quadraticCurveTo(-40, -120, 120, 20); ctx.moveTo(-200, -100); ctx.quadraticCurveTo(0, -60, 200, -260);
  ctx.moveTo(-60, -380); ctx.quadraticCurveTo(-30, -160, 30, 60); ctx.stroke();
  ctx.restore();
  // the bruise under the palm
  ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = L.alpha * 0.25 * down;
  ctx.drawImage(glowDisc(VIOLET, 256), -700, y - 300, 1400, 900);
  ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = L.alpha;
};
const drawLine = (g: Gfx, L: LayerState) => interruptLine(g, L, 'Hold still. It is quicker.');
const drawName = (g: Gfx, L: LayerState) => threatName(g, L, 'THE PALM', 'STAND STILL AT ITS EDGE');

export const interrupt_2: SceneDef = {
  id: 'interrupt_2',
  duration: T_END,
  skipAfter: 0.6,
  camera: { zoom: interruptZoom(IT, 1.5), y: K(0, 0, T_RISE, 0, T_TURN - 0.01, -120, easeInOut, T_TURN, 0, step, T_END, 0), shakes: interruptShakes(IT) },
  layers: [
    { id: 'bed', parallax: 0.2, draw: drawBed },
    { id: 'shadow', from: T_RISE + 0.2, parallax: 1, draw: drawShadow },
    { id: 'hand', from: T_RISE, parallax: 1, draw: drawHand },
    { id: 'ink', from: T_RISE, parallax: 1.1, draw: drawInk },
    { id: 'ash', from: T_RISE, parallax: 1.3, blend: 'lighter', draw: drawAsh },
    { id: 'line', parallax: 0, draw: drawLine },
    { id: 'name', from: T_STRIKE, parallax: 0, draw: drawName },
  ],
  post: interruptPost(IT),
  cues: ([...interruptCues(IT), { t: T_RISE + 0.6, sfx: 'boss_fire', vol: 0.35 }, { t: T_RISE + 1.0, sfx: 'boss_fire', vol: 0.4 }] as Cue[]),
  shots: [
    { n: 1, from: 0, to: T_RISE, what: 'Wide on the frozen floor: motes hang, ink eats the amber pool in half a second, letterbox snaps. "Hold still. It is quicker." types cold. Setup.' },
    { n: 2, from: T_RISE, to: T_TURN, what: 'Five fingers of ink come down from the top edge, each joint hinging into place a beat after the last; a violet-rimmed shadow pools on the floor beneath (the gameplay telegraph, learned here). Push-in. Escalation.' },
    { n: 3, from: T_TURN, to: T_STRIKE, what: 'HARD CUT close on the open palm (2.6×), inverted frame, the lines of the hand are violet veins; the fingers splay toward the camera. It reaches for you. The turn.' },
    { n: 4, from: T_STRIKE, to: T_END, what: 'The hand drops 900 px in 0.35 s and clenches; the shadow snaps black and widens; THE PALM slams in with the flash, STAND STILL AT ITS EDGE in amber; HARD CUT to black → gameplay with the shadow already on the floor. Payoff.' },
  ],
};
export default interrupt_2;
