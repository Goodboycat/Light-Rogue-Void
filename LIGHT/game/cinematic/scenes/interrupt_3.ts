// (M5) SCENE `interrupt_3` — THE MAW. Darkness Interrupt (pool of 6). Sim frozen + hidden; 5.0 s; DARKNESS tone.
// Hard cut back to gameplay where logic/DarknessInterrupt.ts spawns THE JAW: a ring telegraph (r 520) centred on the spark
// that closes inward over 1.4 s; the only safe place is the middle — dashing outward runs through the teeth.
//
// STORYBOARD (written first — MOVIE.md §1.4)
// shot | start–end s | framing                          | camera move                     | what changes on screen                                                                                 | text                          | audio id
// -----|-------------|----------------------------------|---------------------------------|--------------------------------------------------------------------------------------------------------|-------------------------------|------------------
//  1   |  0.0– 1.2   | wide, the arena floor            | snap zoom 1.04, hold             | motes freeze, ink eats the floor, letterbox snaps; the line types                                       | "Everything comes home to me." | boss_telegraph, thud, story_line
//  2   |  1.2– 3.2   | wide → medium, the floor splits  | push that never stops            | a seam cracks across the floor and parts: two jaws of ink with rows of pale teeth, the gullet violet   | —                             | drone, ambush_ring
//  3   |  3.2– 4.2   | HARD CUT: inside the mouth       | hard cut closer, inverted frame  | we are in the throat; teeth ring the frame from all sides; the gullet breathes toward us              | —                             | boss_phase, noise
//  4   |  4.2– 5.0   | the name                         | lunge 1.5 → slam back            | the ring of teeth snaps shut on the camera; THE JAW slams in; flash; HARD CUT to black                 | THE JAW / STAY IN THE MIDDLE  | sweep_up, boss_arrive, boss_enrage
// Setup (frozen floor) → escalation (the floor becomes a mouth) → turn (we are inside it) → payoff (it bites → gameplay).

import { K, easeOut, easeIn, easeInOut, span, lerp, step } from '../Engine';
import type { SceneDef, Gfx, LayerState, Cue } from '../Engine';
import { glowDisc, rgba } from '../Sprites';
import { IT, freezeBed, interruptLine, threatName, ash, interruptPost, interruptZoom, interruptShakes, interruptCues, VIOLET, INK, wobble, hash } from './interruptKit';

const { rise: T_RISE, turn: T_TURN, strike: T_STRIKE, end: T_END } = IT;
const TOOTH = '#d9d2e8';

const drawBed = (g: Gfx, L: LayerState) => freezeBed(g, L);
const drawAsh = (g: Gfx, L: LayerState) => ash(g, L, 0.4 * span(g.t, T_RISE, T_RISE + 0.6), 5303);

/** a row of teeth along a horizontal jaw edge (y), pointing `dir` (+1 down / -1 up), one fill */
function teethRow(ctx: CanvasRenderingContext2D, y: number, dir: number, n: number, seed: number, open: number) {
  ctx.fillStyle = TOOTH; ctx.beginPath();
  for (let i = 0; i < n; i++) {
    const x = -1300 + (i + 0.5) * (2600 / n); const h = (60 + hash(i, seed) * 90) * open; const w = 40 + hash(i, seed + 1) * 30;
    ctx.moveTo(x - w, y); ctx.lineTo(x + w, y); ctx.lineTo(x + (hash(i, seed + 2) - 0.5) * 20, y + h * dir); ctx.closePath();
  }
  ctx.fill();
}
/** shot 2: the seam cracks and parts into two jaws; the gullet glows violet between */
const drawJaws = (g: Gfx, L: LayerState) => {
  const ctx = g.ctx; const t = g.t; if (t >= T_TURN) return;
  const crack = easeOut(span(t, T_RISE, T_RISE + 0.5)); const open = easeInOut(span(t, T_RISE + 0.4, T_TURN - 0.1));
  const gap = lerp(6, 420, open); const y0 = 120;
  ctx.globalAlpha = L.alpha;
  // the gullet: violet-black between the jaws
  if (open > 0) {
    const gr = ctx.createLinearGradient(0, y0 - gap, 0, y0 + gap);
    gr.addColorStop(0, INK); gr.addColorStop(0.5, '#2a1458'); gr.addColorStop(1, INK);
    ctx.fillStyle = gr; ctx.fillRect(-1400, y0 - gap, 2800, gap * 2);
    ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = L.alpha * 0.5 * open * (0.8 + 0.2 * wobble(t * 3, 5));
    ctx.drawImage(glowDisc(VIOLET, 256), -800, y0 - 400, 1600, 800); ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = L.alpha;
  }
  // upper + lower jaw: jagged ink edges along the seam (the crack grows in from the left)
  ctx.fillStyle = INK;
  for (const dir of [-1, 1]) {
    ctx.beginPath(); ctx.moveTo(-1400, y0 - gap * dir); 
    for (let i = 0; i <= 40; i++) { const x = -1400 + i * 70; const j = (hash(i, 5503 + dir) - 0.5) * 50 * crack; ctx.lineTo(x, y0 - gap * dir + j * dir); }
    ctx.lineTo(1400, y0 - gap * dir); ctx.lineTo(1400, dir > 0 ? 1300 : -1300); ctx.lineTo(-1400, dir > 0 ? 1300 : -1300); ctx.closePath(); ctx.fill();
  }
  // the crack line itself before it opens
  ctx.strokeStyle = rgba(VIOLET, 0.9 * (1 - open)); ctx.lineWidth = 3; ctx.beginPath();
  const reach = -1400 + 2800 * crack; ctx.moveTo(-1400, y0);
  for (let i = 1; i <= 40; i++) { const x = -1400 + i * 70; if (x > reach) break; ctx.lineTo(x, y0 + (hash(i, 5504) - 0.5) * 24); }
  ctx.stroke();
  if (open > 0.05) { teethRow(ctx, y0 - gap, 1, 22, 5505, open); teethRow(ctx, y0 + gap, -1, 20, 5506, open); }
  ctx.globalAlpha = L.alpha;
};
/** shot 3+4: inside the throat — a ring of teeth around the frame that closes on the camera at the strike */
const drawThroat = (g: Gfx, L: LayerState) => {
  const ctx = g.ctx; const t = g.t; if (t < T_TURN) return;
  const breathe = 1 + 0.04 * Math.sin((t - T_TURN) * 6); const bite = easeIn(span(t, T_STRIKE, T_STRIKE + 0.35));
  const R = lerp(1150, 80, bite) * breathe;
  ctx.globalAlpha = L.alpha;
  // the gullet: concentric violet rings receding (depth), 5 strokes
  for (let k = 0; k < 5; k++) {
    const rr = R * (0.15 + k * 0.17) * (1 + 0.03 * wobble(t * 2 + k, 9 + k));
    ctx.strokeStyle = rgba(VIOLET, 0.35 - k * 0.05); ctx.lineWidth = 6 - k; ctx.beginPath(); ctx.ellipse(0, 20, rr, rr * 0.7, 0, 0, Math.PI * 2); ctx.stroke();
  }
  ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = L.alpha * 0.45 * (1 - bite);
  ctx.drawImage(glowDisc(VIOLET, 256), -R * 0.5, 20 - R * 0.35, R, R * 0.7); ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = L.alpha;
  // the ring of teeth: ink annulus outside R with pale teeth pointing inward (one fill each)
  ctx.fillStyle = INK; ctx.beginPath(); ctx.rect(-1500, -900, 3000, 1800); ctx.ellipse(0, 20, R, R * 0.7, 0, 0, Math.PI * 2, true); ctx.fill();
  ctx.fillStyle = TOOTH; ctx.beginPath();
  for (let i = 0; i < 36; i++) {
    const a = (i / 36) * Math.PI * 2; const h = (90 + hash(i, 5507) * 120) * (0.6 + 0.4 * bite); const w = 0.07;
    const cx = Math.cos(a) * R, cy = 20 + Math.sin(a) * R * 0.7;
    ctx.moveTo(Math.cos(a - w) * R * 1.03, 20 + Math.sin(a - w) * R * 0.72); ctx.lineTo(Math.cos(a + w) * R * 1.03, 20 + Math.sin(a + w) * R * 0.72);
    ctx.lineTo(cx - Math.cos(a) * h, cy - Math.sin(a) * h * 0.7); ctx.closePath();
  }
  ctx.fill();
  ctx.globalAlpha = L.alpha;
};
const drawLine = (g: Gfx, L: LayerState) => interruptLine(g, L, 'Everything comes home to me.');
const drawName = (g: Gfx, L: LayerState) => threatName(g, L, 'THE JAW', 'STAY IN THE MIDDLE');

export const interrupt_3: SceneDef = {
  id: 'interrupt_3',
  duration: T_END,
  skipAfter: 0.6,
  camera: { zoom: interruptZoom(IT, 1.5), y: K(0, 0, T_RISE, 0, T_TURN - 0.01, 90, easeInOut, T_TURN, 0, step, T_END, 0), shakes: interruptShakes(IT) },
  layers: [
    { id: 'bed', parallax: 0.2, draw: drawBed },
    { id: 'jaws', from: T_RISE, to: T_TURN, parallax: 1, draw: drawJaws },
    { id: 'throat', from: T_TURN, parallax: 1, draw: drawThroat },
    { id: 'ash', from: T_RISE, parallax: 1.3, blend: 'lighter', draw: drawAsh },
    { id: 'line', parallax: 0, draw: drawLine },
    { id: 'name', from: T_STRIKE, parallax: 0, draw: drawName },
  ],
  post: interruptPost(IT, 0.9),
  cues: ([...interruptCues(IT), { t: T_RISE + 0.1, sfx: 'cin_cut', vol: 0.35 }, { t: T_RISE + 0.6, sfx: 'boss_fire', vol: 0.5 }] as Cue[]),
  shots: [
    { n: 1, from: 0, to: T_RISE, what: 'Wide on the frozen floor: motes hang, ink eats the amber pool, letterbox snaps. "Everything comes home to me." types cold. Setup.' },
    { n: 2, from: T_RISE, to: T_TURN, what: 'A violet crack runs across the floor left to right, then the floor PARTS: two jaws of ink with rows of pale teeth, a violet gullet breathing between them. Push-in. Escalation.' },
    { n: 3, from: T_TURN, to: T_STRIKE, what: 'HARD CUT inside the mouth: 36 teeth ring the frame from every side, concentric violet rings recede into the throat, the whole thing breathes toward the camera. Inverted frame. The turn.' },
    { n: 4, from: T_STRIKE, to: T_END, what: 'The ring of teeth snaps shut on the camera in 0.35 s; THE JAW slams in with the flash, STAY IN THE MIDDLE in amber; HARD CUT to black → gameplay with the closing ring already drawn around the spark. Payoff.' },
  ],
};
export default interrupt_3;
