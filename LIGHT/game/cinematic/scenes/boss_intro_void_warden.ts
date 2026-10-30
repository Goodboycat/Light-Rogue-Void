// (M3) SCENE `boss_intro_void_warden` — THE VOID WARDEN, a helm and a blade of absence. Wave 20 boss spawn,
// gameplay hidden + paused, before the BossBar. 10 s. DARKNESS tone.
//
// STORYBOARD (written first, keyframes derived from it — MOVIE.md §1.4)
// shot | start–end s | framing                 | camera move                          | what changes on screen                                                                                                      | text                                          | audio id
// -----|-------------|-------------------------|--------------------------------------|-----------------------------------------------------------------------------------------------------------------------------|-----------------------------------------------|------------------
//  1   |  0.0– 2.2   | wide, arena floor       | static                               | the pool under the spark gutters; ink closes; motes sink; black                                                             | —                                             | boss_telegraph
//  2   |  2.2– 5.4   | wide, low angle         | slow push-in + slow tilt up          | a cathedral of thin violet verticals (pillars of order) fades up in three depths; between them a towering shape: a helm with no face, a visor slit of absolute black; the blade — a long vertical NOTHING that cuts the pillars behind it out of existence | "You wander too far, little dust."            | ambush_ring, story_line
//  3   |  5.4– 7.8   | HARD CUT, the visor     | cut tight on the helm, push, roll    | the visor slit fills the frame; inside it: nothing — then a cold point of light wakes dead centre and tracks to the lens; the pillars behind snap into perfect alignment (ORDER); one inverted frame | "Order must be kept."                         | boss_phase
//  4   |  7.8–10.0   | medium → full           | slam back, drift in                  | the blade is raised and brought DOWN through the frame — a cut of absence splits the image, the halves slide apart; flash; THE VOID WARDEN lands; violet rule; cut to black | IT HAS NOTICED YOU / THE VOID WARDEN / "The Warden will return you to the quiet." | boss_arrive, boss_enrage
// Structure: setup (1) → escalation (2: scale — something enormous and still) → turn (3: the empty visor wakes and looks) → payoff (4: the blade cuts the frame).

import { K, step, easeIn, easeOut, easeInOut, easeInExpo, span, lerp, hash, wobble, clamp01 } from '../Engine';
import type { SceneDef, Gfx, LayerState } from '../Engine';
import { INK, VIOLET, COLD, embers, gradientBg, stars } from '../Draw';
import { glowDisc, rayStrip, rgba } from '../Sprites';
import { BT, arenaDark, bossLines, bossName, bossPost, bossZoom, bossShakes, bossCues } from './bossKit';

const NAME = 'THE VOID WARDEN', COLOR = '#a78bfa', STEEL = '#3b3660', HELM = '#0a0716';
const { rise: T_RISE, turn: T_TURN, name: T_NAME, end: T_END } = BT;
const T_CUT = T_NAME + 0.45;   // the blade comes down

/** pillar grid: n verticals, jittered in shot 2, snapping to a perfect lattice at the turn (ORDER) */
function pillars(g: Gfx, n: number, depth: number, a: number, seed: number) {
  const ctx = g.ctx; const t = g.t; if (a <= 0) return;
  const order = easeOut(span(t, T_TURN, T_TURN + 0.35));
  const w = 3200 / n; ctx.strokeStyle = rgba(VIOLET, 0.22 * a); ctx.lineWidth = 2 + depth * 3; ctx.beginPath();
  for (let i = 0; i < n; i++) {
    const jit = (hash(i, seed) - 0.5) * w * 0.9 + wobble(t * 0.3 + i, seed) * 14;
    const x = -1600 + (i + 0.5) * w + jit * (1 - order);
    const lean = (hash(i, seed + 1) - 0.5) * 0.06 * (1 - order);
    ctx.moveTo(x - lean * 1200, 1200); ctx.lineTo(x + lean * 1200, -1200);
  }
  ctx.stroke();
  // capitals: a dot at a random height on each — snap to one height at the turn
  ctx.fillStyle = rgba(COLD, 0.5 * a); ctx.beginPath();
  for (let i = 0; i < n; i++) { const x = -1600 + (i + 0.5) * w + (hash(i, seed) - 0.5) * w * 0.9 * (1 - order); const y = lerp((hash(i, seed + 2) - 0.5) * 800, -420, order); ctx.moveTo(x + 4, y); ctx.arc(x, y, 3 + depth * 2, 0, Math.PI * 2); }
  ctx.fill();
}
/** the Warden: a helm silhouette (no face) above shoulders that leave the frame; the blade is drawn by the `blade` layer */
function helm(g: Gfx, a: number, reach: number) {
  const ctx = g.ctx; const t = g.t; if (a <= 0 || reach <= 0) return;
  const y0 = lerp(900, -60, reach);              // rises out of the floor
  ctx.save(); ctx.translate(0, y0);
  // shoulders / mantle: a wide black trapezoid that exits the frame below
  ctx.fillStyle = HELM; ctx.beginPath(); ctx.moveTo(-760, 1500); ctx.lineTo(-520, 340); ctx.lineTo(-170, 230); ctx.lineTo(170, 230); ctx.lineTo(520, 340); ctx.lineTo(760, 1500); ctx.closePath(); ctx.fill();
  // helm: tall tapered dome with a crest, visor slit at the centre
  ctx.beginPath(); ctx.moveTo(-190, 250); ctx.bezierCurveTo(-230, -40, -140, -330, 0, -380); ctx.bezierCurveTo(140, -330, 230, -40, 190, 250); ctx.closePath(); ctx.fill();
  ctx.beginPath(); ctx.moveTo(-26, -360); ctx.lineTo(0, -620 - Math.sin(t) * 4); ctx.lineTo(26, -360); ctx.closePath(); ctx.fill();
  // rims (one stroke, no blur): a violet hairline on the helm's left edge only, like a light that is not there
  ctx.strokeStyle = rgba(VIOLET, 0.55 * a); ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(-190, 250); ctx.bezierCurveTo(-230, -40, -140, -330, 0, -380); ctx.lineTo(0, -620); ctx.stroke();
  ctx.strokeStyle = rgba(STEEL, 0.6 * a); ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(-520, 340); ctx.lineTo(-170, 230); ctx.lineTo(170, 230); ctx.lineTo(520, 340); ctx.stroke();
  // the visor: a horizontal slit of absolute black with a faint cold edge; the wake-point lives in the `visor` layer
  ctx.fillStyle = '#000'; ctx.beginPath(); ctx.moveTo(-150, -120); ctx.lineTo(150, -120); ctx.lineTo(132, -74); ctx.lineTo(-132, -74); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = rgba(COLD, 0.35 * a); ctx.lineWidth = 1.5; ctx.stroke();
  ctx.restore();
}

const drawArena = (g: Gfx, L: LayerState) => arenaDark(g, L, BT);
const drawHall = (g: Gfx, L: LayerState) => {
  const ctx = g.ctx; const t = g.t; const a = L.alpha * easeOut(span(t, T_RISE, T_RISE + 1.4));
  ctx.globalAlpha = a; gradientBg(g, '#020108', '#0a0618', '#000000', 0.5);
  stars(g, 120, 1001, 1900, '#c4b5fd', 0.35 * a, t);
  // cold floor glow far below the mantle
  ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = a * 0.14; ctx.drawImage(glowDisc(COLD, 256), -1400, 400, 2800, 900); ctx.globalCompositeOperation = 'source-over';
  ctx.globalAlpha = L.alpha;
};
const drawPillarsFar = (g: Gfx, L: LayerState) => pillars(g, 26, 0, L.alpha * easeOut(span(g.t, T_RISE + 0.2, T_RISE + 1.6)), 1011);
const drawPillarsNear = (g: Gfx, L: LayerState) => pillars(g, 9, 1, L.alpha * easeOut(span(g.t, T_RISE + 0.5, T_RISE + 1.9)), 1021);
const drawWarden = (g: Gfx, L: LayerState) => helm(g, L.alpha, easeOut(span(g.t, T_RISE + 0.3, T_TURN - 0.2)));
const drawBlade = (g: Gfx, L: LayerState) => {
  // the blade of absence: a long vertical band that is BLACK over everything behind it, with a cold hairline edge.
  // held at the Warden's right in shot 2–3, raised and swung down through the frame at T_CUT (rot track on the layer).
  const ctx = g.ctx; const t = g.t; const a = L.alpha; const reach = easeOut(span(t, T_RISE + 0.6, T_TURN - 0.3)); if (reach <= 0) return;
  const len = 1900 * reach; const w = 34;
  ctx.fillStyle = '#000'; ctx.beginPath(); ctx.moveTo(-w, 500); ctx.lineTo(-w * 0.4, 500 - len); ctx.lineTo(0, 500 - len - 90); ctx.lineTo(w * 0.4, 500 - len); ctx.lineTo(w, 500); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = rgba(COLD, 0.7 * a); ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(-w, 500); ctx.lineTo(-w * 0.4, 500 - len); ctx.lineTo(0, 500 - len - 90); ctx.stroke();
  // the edge eats light: a thin violet smear along the right edge
  ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = a * 0.25; ctx.drawImage(rayStrip(VIOLET, 1024, 64), 0, 0); ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = a;
};
const drawVisor = (g: Gfx, L: LayerState) => {
  // the turn: inside the slit one cold point wakes and tracks to the lens; a thin ring expands from it
  const ctx = g.ctx; const t = g.t; const wake = easeOut(span(t, T_TURN + 0.25, T_TURN + 0.9)); if (wake <= 0) return;
  const look = easeInOut(span(t, T_TURN + 0.9, T_TURN + 1.6));
  const x = lerp(-70, 0, look), y = -97 - 60;   // helm y0 = −60 at full reach; slit at −120…−74
  const r = 6 + 4 * wake + Math.sin(t * 9) * 1.2;
  ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = L.alpha * wake;
  ctx.drawImage(glowDisc('#e0e7ff', 128), x - r * 7, y - r * 7, r * 14, r * 14);
  ctx.globalAlpha = L.alpha; ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(x, y, r * 0.55, 0, Math.PI * 2); ctx.fill();
  const ring = span(t, T_TURN + 0.9, T_TURN + 2.2); if (ring > 0 && ring < 1) { ctx.strokeStyle = rgba(COLD, (1 - ring) * 0.6 * L.alpha); ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x, y, 20 + ring * 1400, 0, Math.PI * 2); ctx.stroke(); }
  ctx.globalCompositeOperation = 'source-over';
};
const drawSplit = (g: Gfx, L: LayerState) => {
  // the payoff: after the blade comes down, a vertical cut of absence — a black band widening from the centre; the
  // image halves are implied by two cold hairlines sliding apart (the camera x track jolts the whole frame).
  const ctx = g.ctx; const t = g.t; const u = easeOut(span(t, T_CUT, T_CUT + 0.6)); if (u <= 0) return;
  const w = lerp(2, 150, u);
  ctx.fillStyle = '#000'; ctx.fillRect(-w / 2, -1500, w, 3000);
  ctx.strokeStyle = rgba('#e0e7ff', 0.8 * (1 - u * 0.6) * L.alpha); ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-w / 2, -1500); ctx.lineTo(-w / 2, 1500); ctx.moveTo(w / 2, -1500); ctx.lineTo(w / 2, 1500); ctx.stroke();
  embers(g, { n: 160, x: -w / 2 - 60, y: -900, w: w + 120, h: 1800, rise: 0, drift: 40 * u, rMin: 1, rMax: 2.5, colors: ['#c4b5fd', '#e0e7ff', '#6d5bd0'], life: 2, seed: 1031 }, L.alpha * (1 - u) * 0.8, g.ta);
};
const drawText = (g: Gfx, L: LayerState) => bossLines(g, L, ['You wander too far, little dust.', 'Order must be kept.', 'The Warden will return you to the quiet.']);
const drawName = (g: Gfx, L: LayerState) => bossName(g, L, NAME, COLOR);

export const boss_intro_void_warden: SceneDef = {
  id: 'boss_intro_void_warden',
  duration: T_END,
  skipAfter: 0.6,
  camera: {
    zoom: K(0, 1, T_RISE, 1.0, T_TURN - 0.01, 1.18, easeIn, T_TURN, 2.6, step, T_NAME - 0.01, 3.1, easeIn, T_NAME, 1.1, step, T_END, 1.2),
    // shot 2 tilts up the body; shot 3 is tight on the visor (y −157 in design space); shot 4 back to medium
    x: K(0, 0, T_TURN - 0.01, 0, T_TURN, -20, step, T_NAME - 0.01, 0, T_NAME, 0, step, T_CUT, 0, T_CUT + 0.01, 0, T_CUT + 0.3, 24, T_END, 18),
    y: K(0, 0, T_RISE, 120, T_TURN - 0.01, -120, easeInOut, T_TURN, -157, step, T_NAME, -40, step, T_END, -20),
    rot: K(0, 0, T_TURN, 0, T_NAME - 0.01, 0.05, easeIn, T_NAME, 0, step),
    shakes: [...bossShakes(BT), { t: T_TURN + 0.9, amp: 3, decay: 2, freq: 6 }],
  },
  layers: [
    { id: 'arena', from: 0, to: T_RISE + 0.2, parallax: 0.2, alpha: K(0, 1, T_RISE - 0.1, 1, T_RISE + 0.2, 0), draw: drawArena },
    { id: 'hall', from: T_RISE, parallax: 0.1, draw: drawHall },
    { id: 'pillars_far', from: T_RISE + 0.2, parallax: 0.35, draw: drawPillarsFar },
    { id: 'pillars_near', from: T_RISE + 0.5, parallax: 0.7, draw: drawPillarsNear },
    { id: 'warden', from: T_RISE + 0.3, parallax: 1, draw: drawWarden },
    { id: 'visor', from: T_TURN, to: T_CUT, parallax: 1, draw: drawVisor },
    // the blade: held upright at the Warden's right, then raised (rot −0.5) and brought down through the frame (rot +1.9)
    { id: 'blade', from: T_RISE + 0.6, parallax: 1.05, x: K(0, 420), y: K(0, 180), rot: K(0, 0.08, T_TURN, 0.08, T_NAME - 0.01, 0.08, T_NAME, -0.55, easeOut, T_CUT - 0.05, -0.75, T_CUT, 1.9, easeInExpo, T_END, 2.0), draw: drawBlade },
    { id: 'split', from: T_CUT, parallax: 0, draw: drawSplit },
    { id: 'lines', from: T_RISE, parallax: 0, draw: drawText },
    { id: 'name', from: T_NAME, parallax: 0, draw: drawName },
  ],
  post: bossPost(BT, 0.7),
  cues: [...bossCues(BT), { t: T_TURN + 0.3, sfx: 'affix_shield_break', vol: 0.3 }, { t: T_NAME, sfx: 'player_dash', vol: 0.4 }, { t: T_CUT, sfx: 'boss_fire', vol: 0.7 }],
  shots: [
    { n: 1, from: 0, to: T_RISE, what: 'Arena floor: the warm pool gutters, ink closes from the edges, motes sink. Black. Setup.' },
    { n: 2, from: T_RISE, to: T_TURN, what: 'Low angle, slow push + tilt up: a cathedral of violet verticals fades in at two depths; between them a helm with no face rises out of the floor, shoulders leaving the frame; a blade of absence — black over everything — stands at its right. "You wander too far, little dust." Escalation — scale and stillness.' },
    { n: 3, from: T_TURN, to: T_NAME, what: 'HARD CUT tight on the visor slit (zoom 2.6) + inverted frame: nothing inside — then a cold point wakes and tracks to the lens; a ring leaves it; the pillars behind snap into perfect alignment. "Order must be kept." The turn — the empty thing looked.' },
    { n: 4, from: T_NAME, to: T_END, what: 'Slam back to medium: the blade is raised and brought down through the frame; a cut of absence splits the image; flash; THE VOID WARDEN lands with a violet rule; "The Warden will return you to the quiet." Cut to black → BossBar. Payoff.' },
  ],
};
export default boss_intro_void_warden;
