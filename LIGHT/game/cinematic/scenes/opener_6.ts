// (M2) SCENE `opener_6` — Seam of the Void. Plays at wave 1 of chapter 6, gameplay hidden + paused. 17 s.
// The last place is not a place. It is a white-hot crack in black — the edge of the Darkness itself — and
// through the crack there is *somewhere else*. This opener is the longest and the most terrifying of the six
// (MOVIE.md §3 M2): the Darkness shot runs 5.5 s and never lets go, the black after the cut lasts 2 s with a
// heartbeat, and the LIGHT line arrives late. The timing spine is stretched (`SEAM` below), the grammar is the same.
//
// STORYBOARD (written first, keyframes derived from it — MOVIE.md §1.4)
// shot | start–end s | framing               | camera move                                  | what changes on screen                                                                                               | text                                                                         | audio id
// -----|-------------|-----------------------|----------------------------------------------|----------------------------------------------------------------------------------------------------------------------|------------------------------------------------------------------------------|------------------
//  1   |  0.0– 2.6   | card                  | static                                       | black; CHAPTER VI tracks out; SEAM OF THE VOID assembles in bone-white; white rule grows                              | CHAPTER VI / SEAM OF THE VOID                                                | chapter_card
//  2   |  2.6– 6.0   | wide, pure black      | very slow tilt, breathing zoom               | nothing — then a white-hot hairline across the frame, diagonal; it breathes; heat shimmer rays off it; 600 white sparks drift from it; no ground, no sky | —                                                           | landmark_reveal (soft)
//  3   |  6.0–11.5   | wide → INTO the seam  | push-in that never stops + ROLL 14°          | the seam widens into a lens; the other side is a field of eyes, all opening; black tendrils pour over the white edges; the white goes violet; three inverted frames; at 10.4 s the seam SLAMS shut — the frame is a lid | "Here. The seam. Where I end and where you should never have begun." | boss_telegraph, story_line, boss_enrage
//  4   | 11.5–13.5   | black                 | HARD CUT, hold 2 s                           | nothing; a heartbeat in the vignette (two beats); at 12.9 s one amber point, low                                      | —                                                                            | pickup_essence
//  5   | 13.5–17.0   | wide, low             | gentle overshoot zoom-out                    | the spark on black ground; the seam is far now, a thin white line on the horizon, calm; through it, faint warm points — other lights; sparks rise; letterbox opens; fade | "I can see the other side. It is not empty."               | shrine_touch, story_line
// Structure: setup (1–2: a crack in nothing) → escalation (3: what is on the other side looks back, and the crack is a mouth) → turn (4: the longest black) → payoff (5: the other side has lights in it).

import { K, step, easeIn, easeOut, easeInOut, easeInExpo, span, lerp, hash, wobble, clamp01 } from '../Engine';
import type { SceneDef, Gfx, LayerState } from '../Engine';
import { AMBER, GOLD, EMBER, VIOLET, INK, embers, eyeField, tendrils, gradientBg, pool, godRays, stars } from '../Draw';
import { glowDisc, rayStrip, rgba } from '../Sprites';
import type { OpenerTiming } from './openerKit';
import { chapterCard, darkLine, lightLine, turnSpark, openerPost, openerZoom, mix } from './openerKit';

const NAME = 'Seam of the Void', COLOR = '#f8fafc';
const WHITE = '#ffffff', HOT = '#fef9c3', COOL = '#e0e7ff', VIOLET2 = '#7c3aed';
/** stretched spine (MOVIE.md §3 M2: longest, most terrifying, LIGHT arrives late) */
export const SEAM: OpenerTiming = { place: 2.6, dark: 6.0, turn: 11.5, light: 13.5, end: 17.0 };
const { place: T_PLACE, dark: T_DARK, turn: T_TURN, light: T_LIGHT, end: T_END } = SEAM;
const T_SLAM = T_DARK + 4.4;   // the seam shuts (10.4 s)

// the seam: a diagonal polyline across design space; `w(t)` is its half-width (hairline → lens → shut)
const SEAM_ANG = -0.16, SEAM_LEN = 3400;
const seamPt = (u: number, side: 1 | -1, hw: number, t: number) => {
  // u ∈ [0,1] along the seam; jagged edge from hash, slow wobble so it breathes
  const i = Math.round(u * 64);
  const along = (u - 0.5) * SEAM_LEN;
  const jag = (hash(i, 601 + (side > 0 ? 0 : 1)) - 0.5) * hw * 1.6 + wobble(t * 0.9 + u * 7, 603) * hw * 0.25;
  const off = side * (hw * (0.55 + 0.45 * Math.sin(u * Math.PI)) + jag);
  const ca = Math.cos(SEAM_ANG), sa = Math.sin(SEAM_ANG);
  return { x: along * ca - off * sa, y: along * sa + off * ca + 20 };
};
const seamWidth = (t: number) => {
  if (t >= T_TURN) return 0;
  const breathe = 1 + 0.25 * Math.sin(t * 1.7) + 0.1 * wobble(t * 5, 607);
  const hair = 2.2 * breathe * easeOut(span(t, T_PLACE + 0.6, T_PLACE + 1.6));
  const open = easeIn(span(t, T_DARK, T_SLAM - 0.4)) * 240;
  const shut = 1 - easeInExpo(span(t, T_SLAM - 0.25, T_SLAM));
  return (hair + open) * shut;
};
// cold = the white goes violet, the tendrils pour (0 white-hot, 1 fully the Darkness)
const cold = (t: number) => (t < T_TURN ? easeIn(span(t, T_DARK + 0.8, T_SLAM - 0.6)) : 0);

/** polygon of the seam's interior (lens) — one path reused for the fill and the clip */
function seamPath(ctx: CanvasRenderingContext2D, hw: number, t: number, grow = 1) {
  ctx.beginPath();
  for (let i = 0; i <= 64; i++) { const p = seamPt(i / 64, 1, hw * grow, t); if (i === 0) ctx.moveTo(p.x, p.y); else ctx.lineTo(p.x, p.y); }
  for (let i = 64; i >= 0; i--) { const p = seamPt(i / 64, -1, hw * grow, t); ctx.lineTo(p.x, p.y); }
  ctx.closePath();
}
const drawVoid = (g: Gfx, L: LayerState) => {
  // there is no sky and no ground: black with the faintest violet breath from below once the cold comes
  const c = cold(g.t); g.ctx.globalAlpha = L.alpha;
  gradientBg(g, '#000000', mix('#020105', '#07031a', c), mix('#030208', '#120a2e', c), 0.5);
};
const drawOtherSide = (g: Gfx, L: LayerState) => {
  // through the lens: the other side — a cold indigo depth with a field of eyes that open as the seam widens
  const ctx = g.ctx; const t = g.t; const hw = seamWidth(t); if (hw < 6) return;
  const c = cold(t);
  ctx.save(); seamPath(ctx, hw, t); ctx.clip();
  const gr = ctx.createRadialGradient(0, 20, 0, 0, 20, 1500);
  gr.addColorStop(0, mix('#312e81', '#1e1b4b', c)); gr.addColorStop(0.5, mix('#0f0c2a', '#0a0620', c)); gr.addColorStop(1, '#000000');
  ctx.globalAlpha = L.alpha; ctx.fillStyle = gr; ctx.fillRect(-2600, -1500, 5200, 3000);
  const open = easeOut(span(t, T_DARK + 1.0, T_DARK + 3.2));
  if (open > 0) eyeField(g, 110, 611, 1500, open * 0.9, t);
  ctx.restore();
};
const drawSeam = (g: Gfx, L: LayerState) => {
  // the crack itself: lens fill (white → violet), three edge strokes (no shadowBlur), heat rays off the edges
  const ctx = g.ctx; const t = g.t; const hw = seamWidth(t); if (hw <= 0.05) return;
  const c = cold(t); const a = L.alpha;
  const edge = mix(WHITE, VIOLET, c), halo = mix(HOT, VIOLET2, c);
  ctx.globalCompositeOperation = 'lighter';
  // outer halo strokes along the seam (3 widths)
  seamPath(ctx, hw, t, 1);
  ctx.lineJoin = 'round';
  ctx.strokeStyle = rgba(halo, 0.10 * a); ctx.lineWidth = 60 + hw * 0.4; ctx.stroke();
  ctx.strokeStyle = rgba(halo, 0.22 * a); ctx.lineWidth = 18 + hw * 0.15; ctx.stroke();
  ctx.strokeStyle = rgba(edge, 0.95 * a); ctx.lineWidth = 2.5 + Math.min(hw, 6) * 0.3; ctx.stroke();
  if (hw < 6) { ctx.fillStyle = rgba(WHITE, 0.9 * a); ctx.fill(); }  // hairline: the slit itself is white
  // heat shimmer rays off the seam, perpendicular, flickering
  const strip = rayStrip(mix(HOT, '#c4b5fd', c), 1024, 96);
  const n = 18;
  for (let i = 0; i < n; i++) {
    const u = (i + 0.5) / n; const h = hash(i, 621);
    const fl = 0.5 + 0.5 * Math.sin(t * (2 + h * 3) + i * 1.9);
    const al = a * 0.14 * fl * (0.4 + 0.6 * easeOut(span(t, T_PLACE + 1, T_PLACE + 2.5))); if (al < 0.01) continue;
    const side = (i & 1) ? 1 : -1; const p = seamPt(u, side as 1 | -1, hw, t);
    const len = 220 + h * 520 + hw * 1.5;
    ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(SEAM_ANG + side * Math.PI / 2); ctx.globalAlpha = al; ctx.drawImage(strip, 0, -16, len, 32); ctx.restore();
  }
  ctx.globalAlpha = a; ctx.globalCompositeOperation = 'source-over';
};
const drawTendrils = (g: Gfx, L: LayerState) => {
  // black tendrils pour over the white edges from inside the seam — the other side is leaking
  const t = g.t; const c = cold(t); if (c <= 0) return;
  const hw = seamWidth(t);
  g.ctx.globalAlpha = L.alpha;
  for (let k = 0; k < 6; k++) {
    const u = 0.12 + k * 0.15; const side = (k & 1 ? 1 : -1) as 1 | -1;
    const p = seamPt(u, side, hw, t);
    tendrils(g, p.x, p.y, 5, 520 + hash(k, 631) * 400, SEAM_ANG + side * Math.PI / 2, 1.2, 640 + k, c * (0.5 + 0.5 * hash(k, 633)), t);
  }
};
const drawSparks = (g: Gfx, L: LayerState) => {
  // 600 white sparks drift off the seam (both sides); they turn violet and get sucked BACK in as the cold comes
  const t = g.t; const c = cold(t);
  const a = L.alpha * easeOut(span(t, T_PLACE + 0.8, T_PLACE + 2.2));
  embers(g, { n: 600, x: -1700, y: -520, w: 3400, h: 1040, rise: lerp(18, -30, c), drift: lerp(26, 70, c), rMin: 0.7, rMax: 2.4, colors: [WHITE, mix(COOL, VIOLET, c), mix(HOT, '#c4b5fd', c)], life: 7, seed: 651, glow: 1.5 }, a * lerp(0.7, 0.9, c), g.ta);
};
const drawLid = (g: Gfx, L: LayerState) => {
  // after the slam the whole frame is a lid: two black eyelids close from top and bottom (the seam was an eye all along)
  const ctx = g.ctx; const t = g.t; const u = easeInExpo(span(t, T_SLAM - 0.3, T_TURN - 0.05)); if (u <= 0) return;
  const H = g.hh * 2 + 4, W = g.hw * 2 + 4;
  ctx.globalAlpha = L.alpha; ctx.fillStyle = INK;
  ctx.fillRect(-W / 2, -H / 2, W, H / 2 * u); ctx.fillRect(-W / 2, H / 2 - H / 2 * u, W, H / 2 * u);
  ctx.strokeStyle = rgba(VIOLET, 0.6 * u); ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-W / 2, -H / 2 + H / 2 * u); ctx.lineTo(W / 2, -H / 2 + H / 2 * u); ctx.moveTo(-W / 2, H / 2 - H / 2 * u); ctx.lineTo(W / 2, H / 2 - H / 2 * u); ctx.stroke();
};
const drawHeartbeat = (g: Gfx, L: LayerState) => {
  // shot 4: two heartbeats in the black — a violet breath at the frame edges, nothing else
  const ctx = g.ctx; const t = g.t;
  const beat = (at: number) => Math.max(0, 1 - Math.abs(t - at) / 0.22) ** 2;
  const b = beat(T_TURN + 0.5) + 0.7 * beat(T_TURN + 0.8) + beat(T_TURN + 1.3) + 0.7 * beat(T_TURN + 1.6);
  if (b <= 0.01) return;
  const H = g.hh * 2 + 4, W = g.hw * 2 + 4;
  const gr = ctx.createRadialGradient(0, 0, Math.min(W, H) * 0.3, 0, 0, Math.max(W, H) * 0.75);
  gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, rgba(VIOLET2, 0.22 * b * L.alpha));
  ctx.fillStyle = gr; ctx.fillRect(-W / 2, -H / 2, W, H);
};
const drawCard = (g: Gfx, L: LayerState) => chapterCard(g, L, 6, NAME, COLOR, SEAM);
const drawDark = (g: Gfx, L: LayerState) => darkLine(g, L, 'Here. The seam. Where I end and where you should never have begun.', 360, T_DARK + 0.6, 3.2, SEAM);
const drawLight = (g: Gfx, L: LayerState) => lightLine(g, L, 'I can see the other side. It is not empty.', 360, T_LIGHT + 0.9, 1.6, SEAM);

// payoff: the spark on black ground; the seam far on the horizon, calm, with lights beyond it
const SX = -80, SY = 420, HY = -60;
const drawGroundWarm = (g: Gfx, L: LayerState) => {
  const ctx = g.ctx; const t = g.t; const a = L.alpha * span(t, T_LIGHT, T_LIGHT + 1.4);
  ctx.globalAlpha = L.alpha;
  gradientBg(g, '#000000', '#030208', '#0a0616', 0.5);
  ctx.fillStyle = '#05030c'; ctx.fillRect(-2600, HY, 5200, 1400);
  // the seam on the horizon: a thin white line, steady now
  ctx.globalCompositeOperation = 'lighter';
  ctx.strokeStyle = rgba(HOT, 0.25 * a); ctx.lineWidth = 14; ctx.beginPath(); ctx.moveTo(-1500, HY + 2); ctx.lineTo(1500, HY - 10); ctx.stroke();
  ctx.strokeStyle = rgba(WHITE, 0.9 * a); ctx.lineWidth = 2; ctx.stroke();
  // beyond it: faint warm points — other lights — that come up one by one
  ctx.fillStyle = AMBER;
  for (let i = 0; i < 14; i++) {
    const h0 = hash(i, 671), h1 = hash(i, 672), h2 = hash(i, 673);
    const at = T_LIGHT + 1.2 + h2 * 1.6; const al = easeOut(span(t, at, at + 0.6)) * (0.5 + 0.5 * Math.sin(t * (1 + h2) + i)) * a; if (al <= 0.01) continue;
    const x = (h0 - 0.5) * 2200, y = HY - 14 - h1 * 70, r = 2 + h2 * 3;
    ctx.globalAlpha = al; ctx.drawImage(glowDisc(AMBER, 64), x - r * 3, y - r * 3, r * 6, r * 6);
    ctx.globalAlpha = al; ctx.beginPath(); ctx.arc(x, y, r * 0.6, 0, Math.PI * 2); ctx.fill();
  }
  ctx.globalAlpha = L.alpha; ctx.globalCompositeOperation = 'source-over';
};
const drawSpark = (g: Gfx, L: LayerState) => turnSpark(g, L, SX, SY, 46, SEAM);
const drawWarmPool = (g: Gfx, L: LayerState) => {
  const a = L.alpha * span(g.t, T_LIGHT, T_LIGHT + 1.5);
  pool(g, SX, SY + 20, 640, EMBER, 0.4 * a);
  godRays(g, SX, SY, -Math.PI / 2, Math.PI * 1.5, 12, 1100, AMBER, 0.09 * a);
  g.ctx.globalCompositeOperation = 'lighter'; g.ctx.globalAlpha = 0.15 * a;
  g.ctx.drawImage(glowDisc(GOLD, 256), -900, 270, 1800, 380);
  g.ctx.globalAlpha = L.alpha; g.ctx.globalCompositeOperation = 'source-over';
};
const drawWarmSparks = (g: Gfx, L: LayerState) => {
  const a = L.alpha * span(g.t, T_LIGHT + 0.2, T_LIGHT + 1.6);
  embers(g, { n: 260, x: SX - 620, y: SY - 560, w: 1240, h: 620, rise: 32, drift: 12, rMin: 1.4, rMax: 3.6, colors: [AMBER, GOLD, '#fde9c4'], life: 6, seed: 681, glow: 2.4 }, a, g.ta);
};
const drawFarStarsWarm = (g: Gfx, L: LayerState) => { g.ctx.globalAlpha = L.alpha * 0.5 * span(g.t, T_LIGHT + 1.2, T_LIGHT + 2.6); stars(g, 30, 691, 1900, '#e5e7eb', 0.6); g.ctx.globalAlpha = L.alpha; };

export const opener_6: SceneDef = {
  id: 'opener_6',
  duration: T_END,
  skipAfter: 0.6,
  camera: {
    zoom: openerZoom(SEAM, 1.5, 0.94),
    // shot 3 pushes INTO the seam while the frame rolls 14° — the horizon stops being trustworthy
    x: K(0, 0, T_PLACE, 60, T_DARK, 0, easeInOut, T_TURN - 0.01, 40, easeIn, T_TURN, 0, step, T_LIGHT, -40, T_END, -60, easeInOut),
    y: K(0, 0, T_PLACE, -40, T_DARK, 20, easeInOut, T_TURN - 0.01, 30, easeIn, T_TURN, 0, step, T_LIGHT, 130, T_END, 100, easeInOut),
    rot: K(0, 0, T_PLACE, -0.01, T_DARK, 0.01, easeInOut, T_SLAM, 0.245, easeIn, T_TURN - 0.01, 0.26, T_TURN, 0, step),
    shakes: [{ t: T_DARK + 1.0, amp: 3, decay: 2, freq: 7 }, { t: T_DARK + 2.6, amp: 6, decay: 2.5, freq: 12 }, { t: T_SLAM, amp: 22, decay: 5, freq: 26 }, { t: T_TURN, amp: 8, decay: 4, freq: 20 }],
  },
  layers: [
    { id: 'card', from: 0, to: T_PLACE, parallax: 0, draw: drawCard },
    // the place (shots 2–3)
    { id: 'void', from: T_PLACE, to: T_TURN, parallax: 0.05, draw: drawVoid },
    { id: 'other', from: T_DARK, to: T_TURN, parallax: 0.5, draw: drawOtherSide },
    { id: 'seam', from: T_PLACE, to: T_TURN, parallax: 0.6, draw: drawSeam },
    { id: 'tendrils', from: T_DARK, to: T_TURN, parallax: 0.6, draw: drawTendrils },
    { id: 'sparks', from: T_PLACE, to: T_TURN, parallax: 0.9, draw: drawSparks },
    { id: 'lid', from: T_SLAM - 0.3, to: T_TURN, parallax: 0, draw: drawLid },
    { id: 'dark_text', from: T_DARK, to: T_TURN, parallax: 0, draw: drawDark },
    // the turn (shot 4): 2 s of black with a heartbeat
    { id: 'beat', from: T_TURN, to: T_LIGHT, parallax: 0, draw: drawHeartbeat },
    // payoff (shot 5)
    { id: 'ground', from: T_LIGHT, parallax: 0.2, alpha: K(T_LIGHT, 0, T_LIGHT + 1.3, 1, easeOut), draw: drawGroundWarm },
    { id: 'stars2', from: T_LIGHT, parallax: 0.1, draw: drawFarStarsWarm },
    { id: 'pool', from: T_LIGHT, parallax: 1, draw: drawWarmPool },
    { id: 'spark', from: T_TURN + 1.4, parallax: 1, draw: drawSpark },
    { id: 'gold', from: T_LIGHT, parallax: 1, draw: drawWarmSparks },
    { id: 'light_text', from: T_LIGHT, parallax: 0, draw: drawLight },
  ],
  post: {
    ...openerPost(0.75, SEAM),
    // the aberration climbs for 5 s and peaks at the slam; three inverted frames as the eyes open, one at the slam
    aberration: K(0, 0, T_DARK, 0, T_DARK + 1.0, 2, T_DARK + 2.6, 6, T_SLAM - 0.01, 22, easeIn, T_SLAM, 4, step, T_TURN - 0.01, 10, T_TURN, 0, step),
    invert: K(0, 0, T_DARK + 1.9, 0, T_DARK + 1.91, 1, step, T_DARK + 1.95, 0, step, T_DARK + 2.6, 0, T_DARK + 2.61, 1, step, T_DARK + 2.66, 0, step, T_DARK + 3.4, 0, T_DARK + 3.41, 1, step, T_DARK + 3.45, 0, step, T_SLAM, 0, T_SLAM + 0.01, 1, step, T_SLAM + 0.07, 0, step),
    flash: K(0, 0, T_SLAM - 0.08, 0, T_SLAM - 0.07, 0.8, step, T_SLAM, 0, easeOut),
  },
  cues: [
    { t: 0.1, sfx: 'chapter_card', vol: 0.9 },
    { t: T_PLACE + 0.7, sfx: 'landmark_reveal', vol: 0.25 },
    { t: T_DARK, sfx: 'boss_telegraph', vol: 0.5 },
    { t: T_DARK + 0.6, sfx: 'story_line', vol: 0.3 },
    { t: T_DARK + 1.9, sfx: 'meteor_warn', vol: 0.35 },           // the eyes open
    { t: T_DARK + 2.6, sfx: 'boss_phase', vol: 0.5 },              // the tendrils pour
    { t: T_DARK + 3.4, sfx: 'boss_enrage', vol: 0.5 },             // the white is gone
    { t: T_SLAM, sfx: 'boss_arrive', vol: 0.7 },                   // the seam shuts
    { t: T_TURN + 0.5, sfx: 'ambush_ring', vol: 0.25 },            // heartbeat 1
    { t: T_TURN + 1.3, sfx: 'ambush_ring', vol: 0.3 },             // heartbeat 2
    { t: T_TURN + 1.4, sfx: 'pickup_essence', vol: 0.6 },
    { t: T_LIGHT + 0.3, sfx: 'shrine_touch', vol: 0.7 },
    { t: T_LIGHT + 0.9, sfx: 'story_line', vol: 0.3 },
  ],
  shots: [
    { n: 1, from: 0, to: T_PLACE, what: 'Card on black: CHAPTER VI tracks out, SEAM OF THE VOID assembles in bone-white, a white rule grows.' },
    { n: 2, from: T_PLACE, to: T_DARK, what: 'Pure black with a slow tilt — then a white-hot hairline opens diagonally across the frame; it breathes; heat-shimmer rays flicker off it; 600 white sparks drift from it. No ground, no sky. Setup — a crack in nothing.' },
    { n: 3, from: T_DARK, to: T_TURN, what: 'Push-in that never stops while the frame rolls 14°: the seam widens into a lens; the other side is a field of 110 eyes that open (three inverted frames); black tendrils pour over the white edges; the white goes violet; aberration climbs for five seconds; at 10.4 s the seam SLAMS shut with a flash and the whole frame closes like a lid — it was an eye. "Here. The seam. Where I end and where you should never have begun."' },
    { n: 4, from: T_TURN, to: T_LIGHT, what: 'HARD CUT to black, held 2 s — the longest black of the six. Two heartbeats breathe violet at the frame edges. At 12.9 s one amber point, low. The turn.' },
    { n: 5, from: T_LIGHT, to: T_END, what: 'Gentle overshoot out: the spark on black ground; the seam is far on the horizon now, a thin steady white line; beyond it fourteen faint warm points come up one by one — other lights; sparks rise; letterbox opens. "I can see the other side. It is not empty." Fade.' },
  ],
};
export default opener_6;
