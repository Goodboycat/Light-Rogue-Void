// (M2) SCENE `opener_4` — Abandoned Machinery. Plays at wave 1 of chapter 4, gameplay hidden + paused. 13 s.
// The fourth place: a hall of dead machines under one sodium lamp. Someone built this to hold the dark in.
// The Darkness tells us they left — and the machines start turning again, for it.
//
// STORYBOARD (written first, keyframes derived from it — MOVIE.md §1.4)
// shot | start–end s | framing             | camera move                        | what changes on screen                                                                                   | text                                                                  | audio id
// -----|-------------|---------------------|------------------------------------|----------------------------------------------------------------------------------------------------------|-----------------------------------------------------------------------|------------------
//  1   |  0.0– 2.6   | card                | static                             | black; CHAPTER IV tracks out; ABANDONED MACHINERY assembles; orange rule grows                            | CHAPTER IV / ABANDONED MACHINERY                                      | chapter_card
//  2   |  2.6– 5.6   | wide, low, hall     | slow dolly RIGHT, breathing zoom   | three rows of gear silhouettes in parallax, dead; one sodium lamp swings on its cable, orange cone, 1100 dust motes sink through it; the great wheel barely turns | —                                             | landmark_reveal (soft)
//  3   |  5.6– 9.0   | wide → the hub      | push-in that never stops + tilt    | the lamp gutters and DIES; the gears wake and turn in unison, faster and faster, violet arcs in the joints; the hub of the great wheel is an iris; it finds us | "Machines. Someone built them to hold the dark in. Then they left." | boss_telegraph, story_line
//  4   |  9.0–10.2   | black               | HARD CUT, hold                     | nothing; at 9.6 s one amber point low, on a fallen gear                                                  | —                                                                     | pickup_essence
//  5   | 10.2–13.0   | wide, low           | gentle overshoot zoom-out          | the spark on the fallen gear; every tooth of every gear catches amber; the wheel turns the OTHER way, slowly; motes rise; letterbox opens; fade | "Who? Who was here before me?"                 | shrine_touch, story_line
// Structure: setup (1–2: a place somebody made) → escalation (3: the machines were never dead, they were waiting for an operator) → turn (4) → payoff (5: our light on their work).

import { K, step, easeIn, easeOut, easeInOut, span, lerp, hash, wobble } from '../Engine';
import type { SceneDef, Gfx, LayerState } from '../Engine';
import { AMBER, GOLD, EMBER, VIOLET, embers, eye, gradientBg, pool, godRays } from '../Draw';
import { glowDisc, hazeBand, rayStrip, rgba } from '../Sprites';
import { T_PLACE, T_DARK, T_TURN, T_LIGHT, T_END, chapterCard, darkLine, lightLine, turnSpark, openerPost, openerZoom, mix } from './openerKit';

const NAME = 'Abandoned Machinery', COLOR = '#fb923c';
const SODIUM = '#fb923c', SODIUM2 = '#f59e0b', IRON = '#0c0a09', IRON2 = '#1c1917', IRON3 = '#292524', RUST = '#7c2d12';

// cold = how far the lamp has died and the machines have woken (0 dead and orange, 1 turning and violet)
const cold = (t: number) => (t < T_TURN ? easeIn(span(t, T_DARK, T_TURN - 0.5)) : 0);
// lamp = brightness of the sodium lamp: steady, then gutters (three stutters), then out
const lamp = (t: number) => {
  if (t >= T_TURN) return 0;
  const c = span(t, T_DARK, T_DARK + 1.4);
  if (c <= 0) return 0.9 + 0.1 * Math.max(0, wobble(t * 7, 41));
  const stutter = Math.max(0, wobble(t * 11, 43)) > 0.55 ? 0.15 : 1;
  return (1 - easeIn(c)) * stutter * 0.95;
};
// spin = accumulated gear angle: almost still in shot 2, accelerating through shot 3, slow reverse in shot 5
const spin = (t: number) => {
  if (t >= T_LIGHT) return -(t - T_LIGHT) * 0.06;
  const u = Math.max(0, t - T_DARK);
  return t * 0.02 + u * u * u * 0.09;
};
const lampAng = (t: number) => Math.sin(t * 0.85) * 0.09 + Math.sin(t * 2.3) * 0.015;

/** One gear as a path: `teeth` trapezoid teeth on a disc with a hub hole (evenodd). Points computed in world space —
 *  no save/translate/restore per gear; one fill per row (same colour). */
function gearPath(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, teeth: number, rot: number) {
  const ri = r * 0.82, rt = r, hub = r * 0.22;
  const n = teeth * 4;
  for (let i = 0; i <= n; i++) {
    const k = i % 4; const a = rot + (i / n) * Math.PI * 2;
    const rr = k === 0 || k === 3 ? ri : rt;
    const px = x + Math.cos(a) * rr, py = y + Math.sin(a) * rr;
    if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.moveTo(x + hub, y); ctx.arc(x, y, hub, 0, Math.PI * 2, true);
}
interface GearSpec { x: number; y: number; r: number; teeth: number; dir: number; ph: number }
const gearSpec = (i: number, seed: number, baseY: number, rMin: number, rMax: number): GearSpec => {
  const h0 = hash(i, seed), h1 = hash(i, seed + 1), h2 = hash(i, seed + 2);
  const r = lerp(rMin, rMax, h2);
  return { x: -2200 + h0 * 4400, y: baseY - h1 * 420 - r * 0.3, r, teeth: 8 + Math.round(h1 * 10), dir: h0 > 0.5 ? 1 : -1, ph: h2 * 6 };
};
/** A row of gears + the rods and spokes between them. `glow` > 0 draws violet arcs at the hubs (the joints waking);
 *  `rim` > 0 lights the teeth on the lamp side (orange while the lamp lives, amber in the payoff). */
function gearRow(g: Gfx, n: number, seed: number, baseY: number, rMin: number, rMax: number, color: string, rimColor: string, rim: number, glow: number) {
  const ctx = g.ctx; const t = g.t; const sp = spin(t);
  ctx.fillStyle = color; ctx.beginPath();
  for (let i = 0; i < n; i++) { const s = gearSpec(i, seed, baseY, rMin, rMax); gearPath(ctx, s.x, s.y, s.r, s.teeth, s.ph + sp * s.dir * (60 / s.r)); }
  // rods: a floor rail under the row and a strut from each gear to the floor
  ctx.rect(-2400, baseY + 60, 4800, 40);
  for (let i = 0; i < n; i++) { const s = gearSpec(i, seed, baseY, rMin, rMax); ctx.rect(s.x - s.r * 0.08, s.y, s.r * 0.16, baseY + 60 - s.y); }
  ctx.fill('evenodd');
  if (rim > 0.01) {
    // teeth catching light: a thin arc on the lit side of each gear
    ctx.strokeStyle = rgba(rimColor, 0.5 * rim); ctx.lineWidth = 3; ctx.beginPath();
    for (let i = 0; i < n; i++) { const s = gearSpec(i, seed, baseY, rMin, rMax); ctx.moveTo(s.x + s.r * 0.9, s.y); ctx.arc(s.x, s.y, s.r * 0.9, -0.9, 0.6); }
    ctx.stroke();
  }
  if (glow > 0.01) {
    // the joints wake: violet arcs crackle at each hub, flickering on their own phase
    ctx.globalCompositeOperation = 'lighter';
    const spr = glowDisc(VIOLET, 64);
    for (let i = 0; i < n; i++) {
      const s = gearSpec(i, seed, baseY, rMin, rMax);
      const fl = Math.max(0, wobble(t * 6 + i * 2.1, seed + 7));
      const a = glow * fl * 0.9; if (a < 0.03) continue;
      const r = s.r * 0.3; ctx.globalAlpha = a; ctx.drawImage(spr, s.x - r, s.y - r, r * 2, r * 2);
    }
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
  }
}

// the great wheel: one huge gear, half out of frame right, its hub is where the iris surfaces
const WX = 760, WY = 120, WR = 720;
const drawWheel = (g: Gfx, L: LayerState) => {
  const ctx = g.ctx; const t = g.t; const c = cold(t);
  ctx.fillStyle = mix(IRON2, '#06040a', c); ctx.beginPath();
  gearPath(ctx, WX, WY, WR, 28, spin(t) * 0.35);
  // spokes
  for (let k = 0; k < 6; k++) { const a = spin(t) * 0.35 + (k / 6) * Math.PI * 2; ctx.moveTo(WX, WY); ctx.lineTo(WX + Math.cos(a - 0.03) * WR * 0.8, WY + Math.sin(a - 0.03) * WR * 0.8); ctx.lineTo(WX + Math.cos(a + 0.03) * WR * 0.8, WY + Math.sin(a + 0.03) * WR * 0.8); ctx.closePath(); }
  ctx.fill('evenodd');
  // its rim catches the lamp
  const lp = lamp(t) * L.alpha;
  if (lp > 0.01) { ctx.strokeStyle = rgba(SODIUM2, 0.35 * lp); ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(WX, WY, WR * 0.9, Math.PI * 0.75, Math.PI * 1.35); ctx.stroke(); }
};
const drawWheelWarm = (g: Gfx, L: LayerState) => {
  // payoff: the same wheel, every tooth lit amber from below, turning the other way
  const ctx = g.ctx; const t = g.t; const a = L.alpha * span(t, T_LIGHT, T_LIGHT + 1.2);
  ctx.fillStyle = IRON2; ctx.beginPath(); gearPath(ctx, WX, WY, WR, 28, spin(t) * 0.35);
  for (let k = 0; k < 6; k++) { const an = spin(t) * 0.35 + (k / 6) * Math.PI * 2; ctx.moveTo(WX, WY); ctx.lineTo(WX + Math.cos(an - 0.03) * WR * 0.8, WY + Math.sin(an - 0.03) * WR * 0.8); ctx.lineTo(WX + Math.cos(an + 0.03) * WR * 0.8, WY + Math.sin(an + 0.03) * WR * 0.8); ctx.closePath(); }
  ctx.fill('evenodd');
  ctx.strokeStyle = rgba(AMBER, 0.45 * a); ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(WX, WY, WR * 0.92, Math.PI * 0.55, Math.PI * 1.25); ctx.stroke();
};

const drawSky = (g: Gfx, L: LayerState) => {
  const t = g.t; const c = cold(t); const lp = lamp(t); const ctx = g.ctx;
  ctx.globalAlpha = L.alpha;
  // a hall: near-black iron above, a brown-orange sodium haze low while the lamp lives; ink when it dies
  gradientBg(g, mix('#050302', '#020105', c), mix('#120a05', '#07040c', c), mix('#2a1206', '#0b0612', c), 0.6);
  pool(g, 300, 200, 1000, SODIUM, 0.22 * lp * L.alpha);
  pool(g, -700, -300, 500, RUST, 0.1 * (1 - c) * L.alpha);
  ctx.globalAlpha = L.alpha;
};
const drawLamp = (g: Gfx, L: LayerState) => {
  // the sodium lamp: cable from above, a hooded head, a hard orange cone of rays and a glow disc; it swings
  const t = g.t; const lp = lamp(t) * L.alpha; const ctx = g.ctx;
  const ang = lampAng(t), cx = 300, cy = -760, len = 420;
  const hx = cx + Math.sin(ang) * len, hy = cy + Math.cos(ang) * len;
  ctx.strokeStyle = IRON3; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(hx, hy); ctx.stroke();
  ctx.fillStyle = IRON; ctx.beginPath(); ctx.moveTo(hx - 70, hy + 30); ctx.lineTo(hx + 70, hy + 30); ctx.lineTo(hx + 30, hy - 20); ctx.lineTo(hx - 30, hy - 20); ctx.closePath(); ctx.fill();
  if (lp <= 0.01) return;
  godRays(g, hx, hy + 30, Math.PI / 2 + ang, 1.1, 9, 1300, SODIUM, 0.16 * lp);
  ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.9 * lp;
  ctx.drawImage(glowDisc(SODIUM2, 256), hx - 90, hy - 50, 180, 180);
  ctx.globalAlpha = lp; ctx.drawImage(glowDisc('#fff7e6', 128, 0.5), hx - 22, hy + 12, 44, 44);
  ctx.globalAlpha = L.alpha; ctx.globalCompositeOperation = 'source-over';
};
const drawMotes = (g: Gfx, L: LayerState) => {
  // 1100 dust motes sink through the lamp cone; when the machines wake they are flung outward (drift up, rise down)
  const c = cold(g.t); const lp = lamp(g.t);
  embers(g, { n: 800, x: -2200, y: -700, w: 4400, h: 1400, rise: lerp(-14, -40, c), drift: lerp(8, 90, c), rMin: 0.8, rMax: 2.2, colors: [SODIUM, '#fdba74', '#a78bfa'], life: 11, seed: 141, glow: 1 }, L.alpha * lerp(0.35 + 0.4 * lp, 0.7, c), g.ta);
  embers(g, { n: 300, x: -300, y: -500, w: 1300, h: 1100, rise: -22, drift: 14, rMin: 1.8, rMax: 4, colors: ['#fff1d6', SODIUM, '#fdba74'], life: 8, seed: 147, glow: 2.5 }, L.alpha * lp * 0.8, g.ta);
};
const drawHaze = (g: Gfx, L: LayerState) => {
  const ctx = g.ctx; const c = cold(g.t);
  ctx.globalAlpha = L.alpha * lerp(0.45, 0.3, c);
  ctx.drawImage(hazeBand(mix(RUST, '#1e1b4b', c), 64, 512), -2200, 160, 4400, 420);
  ctx.globalAlpha = L.alpha;
};
const drawFarGears = (g: Gfx, _L: LayerState) => { const c = cold(g.t), lp = lamp(g.t); gearRow(g, 26, 401, 520, 90, 220, mix(IRON3, '#08060c', c), SODIUM2, lp * 0.5, c * 0.5); };
const drawMidGears = (g: Gfx, _L: LayerState) => { const c = cold(g.t), lp = lamp(g.t); gearRow(g, 16, 411, 560, 150, 340, mix(IRON2, '#06040a', c), SODIUM2, lp * 0.7, c * 0.8); };
const drawNearGears = (g: Gfx, _L: LayerState) => { const c = cold(g.t), lp = lamp(g.t); gearRow(g, 8, 421, 640, 260, 520, mix(IRON, '#030207', c), SODIUM, lp, c); };
const drawArcs = (g: Gfx, L: LayerState) => {
  // the machines draw power from nowhere: violet arcs leap between rows (rayStrip, lighter), broken rhythm
  const t = g.t; const c = cold(t); if (c <= 0) return;
  const ctx = g.ctx; ctx.globalCompositeOperation = 'lighter';
  const strip = rayStrip('#c4b5fd', 1024, 96);
  for (let i = 0; i < 7; i++) {
    const h0 = hash(i, 161), h1 = hash(i, 162);
    const ph = Math.max(0, wobble(t * 5 + i * 1.3, 163)) > 0.5 ? 1 : 0;
    const a = c * 0.2 * ph * L.alpha; if (a < 0.01) continue;
    const x = -1400 + h0 * 2800, y = -200 + h1 * 700, ang = -1.2 + h1 * 2.4;
    ctx.save(); ctx.translate(x, y); ctx.rotate(ang); ctx.globalAlpha = a; ctx.drawImage(strip, -300, -20, 600, 40); ctx.restore();
  }
  ctx.globalAlpha = L.alpha; ctx.globalCompositeOperation = 'source-over';
};
const drawWatcher = (g: Gfx, L: LayerState) => {
  // the operator: the hub of the great wheel is an iris; it opens as the lamp dies and locks on the camera
  const t = g.t; const a = L.alpha * span(t, T_DARK + 1.2, T_DARK + 2.2);
  if (a <= 0) return;
  const lock = easeInOut(span(t, T_DARK + 2.2, T_DARK + 2.9));
  g.ctx.globalAlpha = a;
  eye(g, WX, WY, { r: WR * 0.3, open: lerp(0.05, 0.55, easeOut(span(t, T_DARK + 1.4, T_DARK + 2.8))) + 0.02 * wobble(t * 3, 5), look: { x: lerp(-0.6, -0.1, lock), y: lerp(0.4, 0.05, lock) }, pupil: lerp(0.2, 0.07, lock), veins: 10, glow: 1 });
  g.ctx.globalAlpha = 1;
};
const drawColdWash = (g: Gfx, L: LayerState) => {
  // the orange drains out of the hall from the top down as the lamp dies
  const ctx = g.ctx; const c = cold(g.t); if (c <= 0) return;
  const H = g.hh * 2 + 4, W = g.hw * 2 + 4;
  const gr = ctx.createLinearGradient(0, -H / 2, 0, H / 2);
  gr.addColorStop(0, rgba('#000000', 0.6 * c)); gr.addColorStop(0.6, rgba('#0b0618', 0.25 * c)); gr.addColorStop(1, rgba('#1e1b4b', 0.3 * c));
  ctx.globalAlpha = L.alpha; ctx.fillStyle = gr; ctx.fillRect(-W / 2, -H / 2, W, H);
};
const drawCard = (g: Gfx, L: LayerState) => chapterCard(g, L, 4, NAME, COLOR);
const drawDark = (g: Gfx, L: LayerState) => darkLine(g, L, 'Machines. Someone built them to hold the dark in. Then they left.', 340, T_DARK + 0.4, 2.6);
const drawLight = (g: Gfx, L: LayerState) => lightLine(g, L, 'Who? Who was here before me?');
// the fallen gear the spark sits on (payoff)
const SX = -140, SY = 470;
const drawFallenGear = (g: Gfx, L: LayerState) => {
  const ctx = g.ctx; ctx.globalAlpha = L.alpha; ctx.fillStyle = IRON; ctx.beginPath();
  // lying flat: an ellipse-ish gear seen edge-on
  ctx.save(); ctx.translate(SX, SY + 70); ctx.scale(1, 0.28); gearPath(ctx, 0, 0, 300, 14, 0.4); ctx.restore();
  ctx.fill('evenodd');
  const a = L.alpha * span(g.t, T_LIGHT, T_LIGHT + 1.2);
  ctx.strokeStyle = rgba(AMBER, 0.5 * a); ctx.lineWidth = 3; ctx.beginPath(); ctx.save(); ctx.translate(SX, SY + 70); ctx.scale(1, 0.28); ctx.arc(0, 0, 268, Math.PI * 1.05, Math.PI * 1.95); ctx.restore(); ctx.stroke();
};
const drawSpark = (g: Gfx, L: LayerState) => turnSpark(g, L, SX, SY, 44);
const drawWarmPool = (g: Gfx, L: LayerState) => {
  const a = L.alpha * span(g.t, T_LIGHT, T_LIGHT + 1.4);
  pool(g, SX, SY, 650, EMBER, 0.4 * a);
  godRays(g, SX, SY, -Math.PI / 2, Math.PI * 1.4, 12, 1200, AMBER, 0.1 * a);
  g.ctx.globalCompositeOperation = 'lighter'; g.ctx.globalAlpha = 0.16 * a;
  g.ctx.drawImage(glowDisc(GOLD, 256), -900, 320, 1800, 360);
  g.ctx.globalAlpha = L.alpha; g.ctx.globalCompositeOperation = 'source-over';
};
const warmRim = (g: Gfx) => span(g.t, T_LIGHT + 0.3, T_LIGHT + 1.6);
const drawFarGearsWarm = (g: Gfx, _L: LayerState) => gearRow(g, 26, 401, 520, 90, 220, IRON3, AMBER, warmRim(g) * 0.5, 0);
const drawMidGearsWarm = (g: Gfx, _L: LayerState) => gearRow(g, 16, 411, 560, 150, 340, IRON2, AMBER, warmRim(g) * 0.75, 0);
const drawNearGearsWarm = (g: Gfx, _L: LayerState) => gearRow(g, 8, 421, 640, 260, 520, IRON, AMBER, warmRim(g), 0);
const drawGoldMotes = (g: Gfx, L: LayerState) => {
  const a = L.alpha * span(g.t, T_LIGHT + 0.2, T_LIGHT + 1.6);
  embers(g, { n: 260, x: SX - 650, y: SY - 600, w: 1300, h: 650, rise: 34, drift: 10, rMin: 1.5, rMax: 4, colors: [AMBER, GOLD, '#fde9c4'], life: 6, seed: 171, glow: 2.5 }, a, g.ta);
};

export const opener_4: SceneDef = {
  id: 'opener_4',
  duration: T_END,
  skipAfter: 0.6,
  camera: {
    zoom: openerZoom(),
    // shot 2 dollies RIGHT along the hall (camera x grows); shot 3 pushes toward the hub of the great wheel
    x: K(0, 0, T_PLACE, -220, T_DARK, 60, easeInOut, T_TURN - 0.01, 480, easeIn, T_TURN, 0, step, T_LIGHT, 0, T_END, -60, easeInOut),
    y: K(0, 0, T_PLACE, 60, T_DARK, 20, easeInOut, T_TURN - 0.01, 90, easeIn, T_TURN, 0, step, T_LIGHT, 120, T_END, 90, easeInOut),
    rot: K(0, 0, T_DARK, 0, T_TURN - 0.01, 0.045, easeIn, T_TURN, 0, step),
    shakes: [{ t: T_DARK + 0.3, amp: 4, decay: 5, freq: 40 }, { t: T_DARK + 1.4, amp: 7, decay: 3, freq: 14 }, { t: T_TURN, amp: 14, decay: 4, freq: 22 }],
  },
  layers: [
    { id: 'card', from: 0, to: T_PLACE, parallax: 0, draw: drawCard },
    // the place (shots 2–3)
    { id: 'sky', from: T_PLACE, to: T_TURN, parallax: 0.05, alpha: K(T_PLACE, 0, T_PLACE + 0.6, 1, easeOut), draw: drawSky },
    { id: 'wheel', from: T_PLACE, to: T_TURN, parallax: 0.3, depth: 1, draw: drawWheel },
    { id: 'far', from: T_PLACE, to: T_TURN, parallax: 0.45, depth: 0.8, draw: drawFarGears },
    { id: 'haze', from: T_PLACE, to: T_TURN, parallax: 0.5, draw: drawHaze },
    { id: 'mid', from: T_PLACE, to: T_TURN, parallax: 0.75, depth: 0.4, draw: drawMidGears },
    { id: 'arcs', from: T_DARK, to: T_TURN, parallax: 0.75, draw: drawArcs },
    { id: 'lamp', from: T_PLACE, to: T_TURN, parallax: 0.9, draw: drawLamp },
    { id: 'motes', from: T_PLACE, to: T_TURN, parallax: 0.9, alpha: K(T_PLACE, 0, T_PLACE + 1, 1), draw: drawMotes },
    { id: 'cold', from: T_DARK, to: T_TURN, parallax: 0, draw: drawColdWash },
    { id: 'watcher', from: T_DARK, to: T_TURN, parallax: 0.3, draw: drawWatcher },
    { id: 'near', from: T_PLACE, to: T_TURN, parallax: 1.3, depth: 0, draw: drawNearGears },
    { id: 'dark_text', from: T_DARK, to: T_TURN, parallax: 0, draw: drawDark },
    // the turn + payoff (shots 4–5): the same hall, our light on their work
    { id: 'sky2', from: T_LIGHT, parallax: 0.05, alpha: K(T_LIGHT, 0, T_LIGHT + 1.2, 1, easeOut), draw: drawSky },
    { id: 'wheel2', from: T_LIGHT, parallax: 0.3, alpha: K(T_LIGHT, 0, T_LIGHT + 1.2, 1), draw: drawWheelWarm },
    { id: 'far2', from: T_LIGHT, parallax: 0.45, alpha: K(T_LIGHT, 0, T_LIGHT + 1.2, 1), draw: drawFarGearsWarm },
    { id: 'mid2', from: T_LIGHT, parallax: 0.75, alpha: K(T_LIGHT, 0, T_LIGHT + 1.2, 1), draw: drawMidGearsWarm },
    { id: 'pool', from: T_LIGHT, parallax: 1, draw: drawWarmPool },
    { id: 'fallen', from: T_TURN + 0.6, parallax: 1, alpha: K(T_TURN + 0.6, 0, T_LIGHT + 0.8, 1), draw: drawFallenGear },
    { id: 'spark', from: T_TURN + 0.6, parallax: 1, draw: drawSpark },
    { id: 'gold', from: T_LIGHT, parallax: 1, draw: drawGoldMotes },
    { id: 'near2', from: T_LIGHT, parallax: 1.3, alpha: K(T_LIGHT, 0, T_LIGHT + 1.2, 1), draw: drawNearGearsWarm },
    { id: 'light_text', from: T_LIGHT, parallax: 0, draw: drawLight },
  ],
  post: {
    ...openerPost(0.55),
    aberration: K(0, 0, T_DARK, 0, T_DARK + 0.01, 5, step, T_DARK + 0.5, 1, T_DARK + 1.4, 1.5, T_DARK + 1.41, 10, step, T_DARK + 1.9, 2.5, T_TURN - 0.01, 16, easeIn, T_TURN, 0, step),
    // the lamp's last two flashes are inverted frames — the hall goes negative when it dies
    invert: K(0, 0, T_DARK + 1.1, 0, T_DARK + 1.11, 1, step, T_DARK + 1.15, 0, step, T_DARK + 1.36, 0, T_DARK + 1.37, 1, step, T_DARK + 1.41, 0, step),
  },
  cues: [
    { t: 0.1, sfx: 'chapter_card', vol: 0.9 },
    { t: T_PLACE + 0.2, sfx: 'landmark_reveal', vol: 0.35 },
    { t: T_DARK, sfx: 'boss_telegraph', vol: 0.5 },
    { t: T_DARK + 0.4, sfx: 'story_line', vol: 0.3 },
    { t: T_DARK + 1.1, sfx: 'affix_shield_break', vol: 0.35 },    // the lamp gutters
    { t: T_DARK + 1.4, sfx: 'event_start', vol: 0.45 },           // the machines wake
    { t: T_DARK + 2.6, sfx: 'ambush_ring', vol: 0.4 },            // the hub locks on
    { t: T_TURN, sfx: 'boss_arrive', vol: 0.5 },
    { t: T_TURN + 0.6, sfx: 'pickup_essence', vol: 0.6 },
    { t: T_LIGHT + 0.2, sfx: 'shrine_touch', vol: 0.7 },
    { t: T_LIGHT + 0.5, sfx: 'story_line', vol: 0.3 },
  ],
  shots: [
    { n: 1, from: 0, to: T_PLACE, what: 'Card on black: CHAPTER IV tracks out, ABANDONED MACHINERY assembles, orange rule grows.' },
    { n: 2, from: T_PLACE, to: T_DARK, what: 'Wide, low, slow dolly right along a hall: three parallax rows of dead gears on rails, a great wheel half out of frame, one sodium lamp swinging on its cable throws a hard orange cone through 1100 sinking motes. Setup — somebody made this.' },
    { n: 3, from: T_DARK, to: T_TURN, what: 'Push-in that never stops with a tilt: the lamp gutters (two inverted frames) and dies; the gears wake and turn in unison, accelerating, violet arcs crackle at every hub; the hub of the great wheel is an iris that opens and locks on. "Machines. Someone built them to hold the dark in. Then they left."' },
    { n: 4, from: T_TURN, to: T_LIGHT, what: 'HARD CUT to black with a thud. 0.6 s of nothing, then one amber point low on a fallen gear. The turn.' },
    { n: 5, from: T_LIGHT, to: T_END, what: 'Gentle overshoot out: the spark on the fallen gear, every tooth in the hall catches amber, the great wheel turns the other way, slowly; motes rise; letterbox opens. "Who? Who was here before me?" Fade.' },
  ],
};
export default opener_4;
