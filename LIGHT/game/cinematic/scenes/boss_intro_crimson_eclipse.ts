// (M3) SCENE `boss_intro_crimson_eclipse` — CRIMSON ECLIPSE, a ring eating a sun. Wave 30 boss spawn, gameplay
// hidden + paused, before the BossBar. 10 s. DARKNESS tone (the only intro with a warm thing in it — so it can die).
//
// STORYBOARD (written first, keyframes derived from it — MOVIE.md §1.4)
// shot | start–end s | framing                  | camera move                        | what changes on screen                                                                                                       | text                                             | audio id
// -----|-------------|--------------------------|------------------------------------|------------------------------------------------------------------------------------------------------------------------------|--------------------------------------------------|------------------
//  1   |  0.0– 2.2   | wide, arena floor        | static                             | the pool under the spark gutters; ink closes; motes sink; black                                                              | —                                                | boss_telegraph
//  2   |  2.2– 5.4   | wide, sky                | slow push-in                       | a SUN fades up: amber disc, corona, god-rays, warm bokeh — the first warm sky of the game; then a hairline of black bites its right limb and a ring (a thin crimson circle with a black interior) slides across it, eating it; the rays bend toward the ring | "Even your sun was ours."                        | ambush_ring, story_line
//  3   |  5.4– 7.8   | HARD CUT, the ring       | cut tight, push, roll              | the ring fills the frame; the sun is a crescent behind it; the ring's inner edge is lined with teeth of red light; the black inside the ring is not black — a pupil contracts in it; it finds the lens; one inverted frame | "Nothing shines that we do not permit."          | boss_phase
//  4   |  7.8–10.0   | medium → full            | slam back, drift in                | totality: the last sliver dies, the sky goes red, the corona becomes a crown of crimson fire; flash; CRIMSON ECLIPSE lands; red rule; cut to black | IT HAS NOTICED YOU / CRIMSON ECLIPSE / "Burn out, little ember." | boss_arrive, boss_enrage
// Structure: setup (1) → escalation (2: the first warm thing in the sky is being eaten) → turn (3: the hole has a pupil) → payoff (4: totality, red world).

import { K, step, easeIn, easeOut, easeInOut, span, lerp, hash, wobble } from '../Engine';
import type { SceneDef, Gfx, LayerState } from '../Engine';
import { AMBER, GOLD, EMBER, WARM_WHITE, embers, bokeh, godRays, gradientBg, stars } from '../Draw';
import { glowDisc, rgba } from '../Sprites';
import { BT, arenaDark, bossLines, bossName, bossPost, bossZoom, bossShakes, bossCues } from './bossKit';

const NAME = 'CRIMSON ECLIPSE', COLOR = '#ef4444', RED = '#ef4444', DEEP = '#7f1d1d';
const { rise: T_RISE, turn: T_TURN, name: T_NAME, end: T_END } = BT;
const T_TOTAL = T_NAME + 0.45;   // totality
const SUN_R = 300, SUN_Y = -60;

/** how far the ring has slid across the sun: 0 = not touching (right limb), 1 = dead centre (totality) */
const eat = (t: number) => t < T_TURN ? easeIn(span(t, T_RISE + 1.4, T_TURN)) * 0.55 : lerp(0.55, 1, easeInOut(span(t, T_TURN, T_TOTAL)));
const ringX = (t: number) => lerp(SUN_R * 2.4, 0, eat(t));

const drawArena = (g: Gfx, L: LayerState) => arenaDark(g, L, BT);
const drawSky = (g: Gfx, L: LayerState) => {
  // warm dusk sky going red as the sun is eaten; stars come out as it darkens
  const ctx = g.ctx; const t = g.t; const a = L.alpha * easeOut(span(t, T_RISE, T_RISE + 1.2)); const e = eat(t);
  ctx.globalAlpha = a;
  gradientBg(g, e < 0.6 ? '#1a0a05' : '#1a0306', lerp(0, 1, e) > 0.8 ? '#3b0a0a' : '#3a1a08', '#050203', 0.55);
  // the red world after totality: one radial wash
  const red = span(t, T_TOTAL - 0.1, T_TOTAL + 0.3);
  if (red > 0) { ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = a * red * 0.35; ctx.drawImage(glowDisc(DEEP, 256), -2000, -1400, 4000, 2800); ctx.globalCompositeOperation = 'source-over'; }
  stars(g, 90, 3001, 1800, '#fecaca', 0.45 * a * e, t);
  ctx.globalAlpha = L.alpha;
};
const drawSun = (g: Gfx, L: LayerState) => {
  // the sun: corona + disc + rays; the rays bend toward the ring as it eats (dir pulled right), colour cools into red
  const ctx = g.ctx; const t = g.t; const a = L.alpha * easeOut(span(t, T_RISE + 0.1, T_RISE + 1.3)); if (a <= 0) return; const e = eat(t);
  const breathe = 1 + Math.sin(t * 1.3) * 0.015;
  const warm = e < 0.9 ? GOLD : RED; const core = e < 0.9 ? WARM_WHITE : '#fecaca';
  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha = a * lerp(0.55, 0.25, e); ctx.drawImage(glowDisc(warm, 256), -SUN_R * 3.2 * breathe, SUN_Y - SUN_R * 3.2 * breathe, SUN_R * 6.4 * breathe, SUN_R * 6.4 * breathe);
  godRays(g, 0, SUN_Y, lerp(0, 0.35, e), Math.PI * 2 * lerp(1, 0.6, e), 14, 1700 * (1 - e * 0.3), e < 0.9 ? AMBER : RED, a * lerp(0.22, 0.4, e), t);
  ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = a;
  ctx.fillStyle = core; ctx.beginPath(); ctx.arc(0, SUN_Y, SUN_R * breathe, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = rgba(warm, 0.9); ctx.lineWidth = 6; ctx.stroke();
  // warm bokeh below the sun (the only cozy particles in any boss intro — they die at totality)
  bokeh(g, 60, AMBER, 3011, 1500, a * 0.25 * (1 - span(t, T_TURN, T_TOTAL)), t);
  ctx.globalAlpha = L.alpha;
};
const drawRing = (g: Gfx, L: LayerState) => {
  // the ring: a black disc with a crimson rim; its inner edge grows teeth of red light at the turn; the pupil in the
  // black finds the lens. Slides from the right limb to the centre; its radius is the sun's (so totality is exact).
  const ctx = g.ctx; const t = g.t; const a = L.alpha * easeOut(span(t, T_RISE + 1.2, T_RISE + 1.8)); if (a <= 0) return;
  const x = ringX(t), r = SUN_R * 1.04;
  // black body: it is not a shadow — it is a thing; nothing shows through
  ctx.fillStyle = '#000'; ctx.beginPath(); ctx.arc(x, SUN_Y, r, 0, Math.PI * 2); ctx.fill();
  // crimson rim
  ctx.strokeStyle = rgba(RED, a * 0.95); ctx.lineWidth = 5 + Math.sin(t * 7) * 1.2; ctx.beginPath(); ctx.arc(x, SUN_Y, r, 0, Math.PI * 2); ctx.stroke();
  ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = a * 0.5; ctx.drawImage(glowDisc(RED, 128), x - r * 1.5, SUN_Y - r * 1.5, r * 3, r * 3); ctx.globalCompositeOperation = 'source-over';
  // teeth: n triangles of red light pointing inward from the rim, waking at the turn, one path
  const teeth = easeOut(span(t, T_TURN + 0.1, T_TURN + 0.8)); if (teeth > 0) {
    const n = 48; ctx.fillStyle = rgba('#fca5a5', a * 0.9 * teeth); ctx.beginPath();
    for (let i = 0; i < n; i++) { const an = (i / n) * Math.PI * 2 + t * 0.15; const len = (28 + hash(i, 3021) * 40) * teeth; const hw = 0.028;
      ctx.moveTo(x + Math.cos(an - hw) * r, SUN_Y + Math.sin(an - hw) * r); ctx.lineTo(x + Math.cos(an) * (r - len), SUN_Y + Math.sin(an) * (r - len)); ctx.lineTo(x + Math.cos(an + hw) * r, SUN_Y + Math.sin(an + hw) * r); }
    ctx.fill();
  }
  // the pupil: wakes inside the black, contracts, tracks to the lens
  const wake = easeOut(span(t, T_TURN + 0.5, T_TURN + 1.1)); if (wake > 0) {
    const look = easeInOut(span(t, T_TURN + 1.1, T_TURN + 1.8));
    const px = x + lerp(-60, 0, look), py = SUN_Y + lerp(30, 0, look); const pr = lerp(90, 34, wake) + Math.sin(t * 11) * 2;
    ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = a * wake * 0.7; ctx.drawImage(glowDisc(RED, 128), px - pr * 3, py - pr * 3, pr * 6, pr * 6); ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = a * wake; ctx.fillStyle = DEEP; ctx.beginPath(); ctx.ellipse(px, py, pr * 0.42, pr, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#fff1f2'; ctx.beginPath(); ctx.ellipse(px, py, pr * 0.1, pr * 0.55, 0, 0, Math.PI * 2); ctx.fill();
  }
  ctx.globalAlpha = L.alpha;
};
const drawCrown = (g: Gfx, L: LayerState) => {
  // totality payoff: the corona becomes a crown of crimson fire — rays + embers thrown off the rim
  const ctx = g.ctx; const t = g.t; const u = easeOut(span(t, T_TOTAL, T_TOTAL + 0.7)); if (u <= 0) return;
  const r = SUN_R * 1.04;
  godRays(g, 0, SUN_Y, t * 0.1, Math.PI * 2, 22, 1600 * u, RED, L.alpha * 0.5 * u, t);
  ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = L.alpha * u * 0.8; ctx.drawImage(glowDisc(RED, 256), -r * 2.6, SUN_Y - r * 2.6, r * 5.2, r * 5.2); ctx.globalCompositeOperation = 'source-over';
  embers(g, { n: 700, x: -r * 1.4, y: SUN_Y - r * 1.4, w: r * 2.8, h: r * 2.8, rise: 260, drift: 120, rMin: 1.5, rMax: 4, colors: [RED, '#fca5a5', EMBER], life: 1.6, seed: 3031 }, L.alpha * u, g.ta);
  // the black is still there: redraw it over the fire so the hole stays a hole
  ctx.fillStyle = '#000'; ctx.beginPath(); ctx.arc(0, SUN_Y, r, 0, Math.PI * 2); ctx.fill();
  ctx.globalAlpha = L.alpha;
};
const drawText = (g: Gfx, L: LayerState) => bossLines(g, L, ['Even your sun was ours.', 'Nothing shines that we do not permit.', 'Burn out, little ember.']);
const drawName = (g: Gfx, L: LayerState) => bossName(g, L, NAME, COLOR);

export const boss_intro_crimson_eclipse: SceneDef = {
  id: 'boss_intro_crimson_eclipse',
  duration: T_END,
  skipAfter: 0.6,
  camera: {
    zoom: K(0, 1, T_RISE, 0.96, T_TURN - 0.01, 1.12, easeIn, T_TURN, 2.1, step, T_NAME - 0.01, 2.5, easeIn, T_NAME, 1.0, step, T_END, 1.08),
    // shot 3 is tight on the ring: follow its x in the cut (ring at ~ringX(T_TURN) = 0.45 × 720 = 324 → 0 by totality)
    x: K(0, 0, T_TURN - 0.01, 0, T_TURN, 324, step, T_NAME - 0.01, 60, easeInOut, T_NAME, 0, step),
    y: K(0, 0, T_RISE, 60, T_TURN - 0.01, -20, easeInOut, T_TURN, SUN_Y, step, T_NAME, SUN_Y * 0.4, step, T_END, SUN_Y * 0.3),
    rot: K(0, 0, T_TURN, 0, T_NAME - 0.01, -0.06, easeIn, T_NAME, 0, step, T_END, 0.01),
    shakes: [...bossShakes(BT), { t: T_TURN + 0.5, amp: 3, decay: 2, freq: 7 }],
  },
  layers: [
    { id: 'arena', from: 0, to: T_RISE + 0.2, parallax: 0.2, alpha: K(0, 1, T_RISE - 0.1, 1, T_RISE + 0.2, 0), draw: drawArena },
    { id: 'sky', from: T_RISE, parallax: 0.1, draw: drawSky },
    { id: 'sun', from: T_RISE, parallax: 0.6, draw: drawSun },
    { id: 'ring', from: T_RISE + 1.2, parallax: 0.6, draw: drawRing },
    { id: 'crown', from: T_TOTAL, parallax: 0.6, draw: drawCrown },
    { id: 'lines', from: T_RISE, parallax: 0, draw: drawText },
    { id: 'name', from: T_NAME, parallax: 0, draw: drawName },
  ],
  post: { ...bossPost(BT, 0.75), wash: K(0, 0.35, T_RISE, 0.5, T_RISE + 1.4, 0.3, T_TURN, -0.4, easeInOut, T_NAME, -0.7, T_END, -0.9) },
  cues: [...bossCues(BT), { t: T_RISE + 1.4, sfx: 'arena_burn', vol: 0.35 }, { t: T_TURN + 0.5, sfx: 'meteor_warn', vol: 0.3 }, { t: T_TOTAL, sfx: 'boss_fire', vol: 0.7 }],
  shots: [
    { n: 1, from: 0, to: T_RISE, what: 'Arena floor: the warm pool gutters, ink closes from the edges, motes sink. Black. Setup.' },
    { n: 2, from: T_RISE, to: T_TURN, what: 'Wide sky, slow push: a SUN fades up — amber disc, corona, god-rays, warm bokeh, the first warm sky of the game. A hairline of black bites its right limb; a crimson-rimmed ring slides across it, eating it; the rays bend toward the ring. "Even your sun was ours." Escalation — something warm is being eaten.' },
    { n: 3, from: T_TURN, to: T_NAME, what: 'HARD CUT tight on the ring (zoom 2.1, x follows it) + inverted frame: the sun a crescent behind; teeth of red light wake along the inner rim; the black inside is not black — a slit pupil contracts and finds the lens. "Nothing shines that we do not permit." The turn.' },
    { n: 4, from: T_NAME, to: T_END, what: 'Slam back: totality — the last sliver dies, the sky goes red, the corona becomes a crown of crimson fire throwing embers; flash; CRIMSON ECLIPSE lands with a red rule; "Burn out, little ember." Cut to black → BossBar. Payoff.' },
  ],
};
export default boss_intro_crimson_eclipse;
