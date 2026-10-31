// (M5) SCENE `interrupt_5` — THE MIRROR. Darkness Interrupt (pool of 6). Sim frozen + hidden; 5.0 s; DARKNESS tone.
// Hard cut back to gameplay where logic/DarknessInterrupt.ts spawns THE ECHO: a black copy of the spark that REPLAYS the
// player's last 1.5 s of movement, detonating (r 260) at the end of the path; survivable by leaving where you just were.
//
// STORYBOARD (written first — MOVIE.md §1.4)
// shot | start–end s | framing                          | camera move                     | what changes on screen                                                                                  | text                           | audio id
// -----|-------------|----------------------------------|---------------------------------|---------------------------------------------------------------------------------------------------------|--------------------------------|------------------
//  1   |  0.0– 1.2   | wide, the arena floor            | snap zoom 1.04, hold             | motes freeze, ink eats the floor, letterbox snaps; the line types                                        | "You keep leaving yourself behind." | boss_telegraph, thud, story_line
//  2   |  1.2– 3.2   | medium, a pane of black glass    | push that never stops            | a vertical mirror rises; a warm spark burns on the left, its reflection on the right is BLACK with violet edge | —                        | drone, ambush_ring
//  3   |  3.2– 4.2   | HARD CUT: close on the reflection| hard cut closer, inverted frame  | the black spark moves FIRST; the warm one copies it a beat late; cracks spider across the glass           | —                              | boss_phase, noise
//  4   |  4.2– 5.0   | the name                         | lunge 1.5 → slam back            | the reflection steps THROUGH the glass; shards; THE ECHO slams in; flash; HARD CUT to black              | THE ECHO / LEAVE WHERE YOU WERE | sweep_up, boss_arrive, boss_enrage
// Setup (frozen floor) → escalation (the mirror, the wrong reflection) → turn (it moves first) → payoff (it steps out → gameplay).

import { K, easeOut, easeIn, easeInOut, span, lerp, step } from '../Engine';
import type { SceneDef, Gfx, LayerState, Cue } from '../Engine';
import { spark } from '../Draw';
import { glowDisc, rgba } from '../Sprites';
import { IT, freezeBed, interruptLine, threatName, ash, interruptPost, interruptZoom, interruptShakes, interruptCues, VIOLET, INK, GOLD, WARM_WHITE, wobble, hash } from './interruptKit';

const { rise: T_RISE, turn: T_TURN, strike: T_STRIKE, end: T_END } = IT;

const drawBed = (g: Gfx, L: LayerState) => freezeBed(g, L);
const drawAsh = (g: Gfx, L: LayerState) => ash(g, L, 0.4 * span(g.t, T_RISE, T_RISE + 0.6), 5305);

/** the two sparks' positions: warm one wanders in shot 2; in shot 3 the BLACK one leads and the warm one follows 0.25 s late */
function sparkPath(t: number): { wx: number; wy: number; bx: number; by: number } {
  const lead = (tt: number) => ({ x: wobble(tt * 0.9, 50) * 90, y: 60 + wobble(tt * 0.7, 51) * 50 });
  if (t < T_TURN) { const p = lead(t); return { wx: -330 + p.x, wy: p.y, bx: 330 - p.x, by: p.y }; }
  const b = lead(t * 2.2), w = lead((t - 0.25) * 2.2);
  return { wx: -330 + w.x * 1.6, wy: w.y, bx: 330 - b.x * 1.6, by: b.y };
}
/** shot 2+3: the pane of black glass with a violet edge; cracks spider from the turn; shot 4: shards fly as it steps through */
const drawGlass = (g: Gfx, L: LayerState) => {
  const ctx = g.ctx; const t = g.t; const close = t >= T_TURN;
  const rise = easeOut(span(t, T_RISE, T_RISE + 0.9)); const sc = close ? 1.8 : 1;
  const out = easeIn(span(t, T_STRIKE, T_STRIKE + 0.35));
  ctx.save(); ctx.scale(sc, sc); ctx.translate(close ? -260 : 0, 0);
  ctx.globalAlpha = L.alpha;
  const h = lerp(0, 760, rise); const w = 16;
  // the pane: a near-black slab, one fill, with a violet rim light down its edge
  ctx.fillStyle = '#05020b'; ctx.fillRect(-w / 2, 60 - h / 2, w, h);
  const gr = ctx.createLinearGradient(-w / 2, 0, w / 2, 0);
  gr.addColorStop(0, rgba(VIOLET, 0)); gr.addColorStop(0.5, rgba(VIOLET, 0.8)); gr.addColorStop(1, rgba(VIOLET, 0));
  ctx.fillStyle = gr; ctx.fillRect(-w / 2, 60 - h / 2, w, h);
  // the mirror's surface, a faint violet sheen that reaches right (the reflection side) — the floor there is darker
  ctx.fillStyle = rgba('#120a24', 0.55 * rise); ctx.fillRect(0, -800, 1800, 1600);
  // cracks from the turn: 9 jagged lines from the centre, growing
  if (close) {
    const ck = easeOut(span(t, T_TURN, T_TURN + 0.8)) * (1 - out * 0.5);
    ctx.strokeStyle = rgba('#e9ddff', 0.85); ctx.lineWidth = 1.6; ctx.beginPath();
    for (let i = 0; i < 9; i++) {
      const a = (i / 9) * Math.PI * 2 + hash(i, 5705) * 0.5; let x = 0, y = 60; ctx.moveTo(x, y);
      for (let s = 1; s <= 6; s++) { const l = 60 * ck * (0.7 + hash(s, 5706 + i) * 0.6); x += Math.cos(a + (hash(s, 5707 + i) - 0.5) * 0.9) * l; y += Math.sin(a + (hash(s, 5708 + i) - 0.5) * 0.9) * l; ctx.lineTo(x, y); }
    }
    ctx.stroke();
  }
  // shards at the strike: 40 triangles flying out from the pane (one fill)
  if (out > 0) {
    ctx.fillStyle = '#1a1030'; ctx.beginPath();
    for (let i = 0; i < 40; i++) {
      const h0 = hash(i, 5709), h1 = hash(i, 5710), h2 = hash(i, 5711);
      const a = (h0 - 0.5) * Math.PI * 1.4; const d = (80 + h1 * 700) * out; const x = Math.cos(a) * d, y = 60 + Math.sin(a) * d - 200 * out * out;
      const s = 10 + h2 * 34; const r = h2 * 6 + out * 8;
      ctx.moveTo(x + Math.cos(r) * s, y + Math.sin(r) * s); ctx.lineTo(x + Math.cos(r + 2.1) * s, y + Math.sin(r + 2.1) * s); ctx.lineTo(x + Math.cos(r + 4.2) * s * 0.6, y + Math.sin(r + 4.2) * s * 0.6); ctx.closePath();
    }
    ctx.fill();
  }
  ctx.restore(); ctx.globalAlpha = L.alpha;
};
/** the two sparks: warm (ours) on the left, black with a violet edge (the reflection) on the right; at the strike the black one steps through */
const drawSparks = (g: Gfx, L: LayerState) => {
  const ctx = g.ctx; const t = g.t; const close = t >= T_TURN; const rise = easeOut(span(t, T_RISE, T_RISE + 0.9));
  const sc = close ? 1.8 : 1; const out = easeIn(span(t, T_STRIKE, T_STRIKE + 0.35));
  const p = sparkPath(t);
  ctx.save(); ctx.scale(sc, sc); ctx.translate(close ? -260 : 0, 0);
  ctx.globalAlpha = L.alpha * rise * (1 - out * 0.7);
  spark(g, p.wx, p.wy, { r: 34, heat: 0.9, flicker: 0.6, color: GOLD, core: WARM_WHITE, rays: 0.3 });
  // the reflection: an absence — ink disc with a violet rim, no core; at the strike it crosses the pane to the warm side
  const bx = lerp(p.bx, p.wx, out), by = lerp(p.by, p.wy, out); const br = 34 + out * 60;
  ctx.globalAlpha = L.alpha * rise;
  ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = L.alpha * rise * (0.5 + out * 0.5);
  ctx.drawImage(glowDisc(VIOLET, 128), bx - br * 2.4, by - br * 2.4, br * 4.8, br * 4.8);
  ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = L.alpha * rise;
  ctx.fillStyle = INK; ctx.beginPath(); ctx.arc(bx, by, br * (1 + 0.05 * wobble(t * 7, 52)), 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = rgba(VIOLET, 0.9); ctx.lineWidth = 2.5; ctx.stroke();
  ctx.restore(); ctx.globalAlpha = L.alpha;
};
const drawLine = (g: Gfx, L: LayerState) => interruptLine(g, L, 'You keep leaving yourself behind.');
const drawName = (g: Gfx, L: LayerState) => threatName(g, L, 'THE ECHO', 'LEAVE WHERE YOU WERE');

export const interrupt_5: SceneDef = {
  id: 'interrupt_5',
  duration: T_END,
  skipAfter: 0.6,
  camera: { zoom: interruptZoom(IT, 1.5), x: K(0, 0, T_RISE, 0, T_TURN - 0.01, 40, easeInOut, T_TURN, 0, step, T_END, 0), shakes: interruptShakes(IT) },
  layers: [
    { id: 'bed', parallax: 0.2, draw: drawBed },
    { id: 'glass', from: T_RISE, parallax: 1, draw: drawGlass },
    { id: 'sparks', from: T_RISE, parallax: 1, draw: drawSparks },
    { id: 'ash', from: T_RISE, parallax: 1.3, blend: 'lighter', draw: drawAsh },
    { id: 'line', parallax: 0, draw: drawLine },
    { id: 'name', from: T_STRIKE, parallax: 0, draw: drawName },
  ],
  post: interruptPost(IT),
  cues: ([...interruptCues(IT), { t: T_RISE + 0.9, sfx: 'story_line', vol: 0.25 }, { t: T_TURN + 0.1, sfx: 'noise', vol: 0.5 }, { t: T_STRIKE + 0.3, sfx: 'thud', vol: 0.6 }] as Cue[]),
  shots: [
    { n: 1, from: 0, to: T_RISE, what: 'Wide on the frozen floor: motes hang, ink eats the amber pool, letterbox snaps. "You keep leaving yourself behind." types cold. Setup.' },
    { n: 2, from: T_RISE, to: T_TURN, what: 'A pane of black glass rises with a violet rim light; a warm spark drifts on the left and its reflection on the right is BLACK — an absence with a violet edge, mirroring every move. Push-in. Escalation.' },
    { n: 3, from: T_TURN, to: T_STRIKE, what: 'HARD CUT close (1.8×): the black spark moves FIRST and the warm one copies it a quarter-second late; nine cracks spider across the glass. Inverted frame. The turn.' },
    { n: 4, from: T_STRIKE, to: T_END, what: 'The reflection steps THROUGH the pane onto our side and swells; 40 shards fly; THE ECHO slams in with the flash, LEAVE WHERE YOU WERE in amber; HARD CUT to black → gameplay with the black copy already replaying your path. Payoff.' },
  ],
};
export default interrupt_5;
