// (M3) SCENE `boss_intro_darkness` — DARKNESS, the Eye from `title_seam`, now filling the frame. Wave 60 boss spawn,
// gameplay hidden + paused, before the BossBar. 11 s — the last and longest intro. DARKNESS tone at full.
// Unlike the other five there is no landscape and no body: there is nothing, then the nothing is a lid.
//
// STORYBOARD (written first, keyframes derived from it — MOVIE.md §1.4)
// shot | start–end s | framing                  | camera move                         | what changes on screen                                                                                                                     | text                                                      | audio id
// -----|-------------|--------------------------|-------------------------------------|--------------------------------------------------------------------------------------------------------------------------------------------|-----------------------------------------------------------|------------------
//  1   |  0.0– 2.2   | wide, arena floor        | static                              | the pool under the spark gutters; ink closes; motes sink; black — and this time the black STAYS 0.8 s longer than the others                | —                                                         | boss_telegraph
//  2   |  2.2– 5.8   | ?                        | imperceptible push-in               | true black with heartbeat grain; a horizontal seam of violet appears across the whole width — it is a lid, closed; small eyes wake in the black around it, hundreds, all looking at the seam; tendrils grow down from the top edge | "we remember you."                                         | ambush_ring, story_line
//  3   |  5.8– 8.6   | extreme close             | HARD CUT in + rack of the roll      | the lid OPENS — the Eye is wider than the frame (r 1200), the iris sprite fills everything, the slit pupil drifts … then locks dead centre on the lens; every small eye turns to the camera at the same instant; two inverted frames | "THERE IS NOTHING LEFT TO BURN."                           | boss_phase
//  4   |  8.6–11.0   | full                      | slam back, push that never stops    | the pupil dilates until the frame is black again — the Eye is so close its pupil is the sky; tendrils close from every edge; flash; DARKNESS lands (white, no colour); white rule; cut to black | IT HAS NOTICED YOU / DARKNESS / "stay." | boss_arrive, boss_enrage
// Structure: setup (1: longer black) → escalation (2: the nothing is a lid) → turn (3: it opens and locks on) → payoff (4: the pupil IS the dark).

import { K, step, easeIn, easeOut, easeInOut, span, lerp, hash, wobble, clamp01, pulses } from '../Engine';
import type { SceneDef, Gfx, LayerState } from '../Engine';
import { VIOLET, INK, eye, eyeField, tendrils, gradientBg } from '../Draw';
import { glowDisc, rgba } from '../Sprites';
import { arenaDark, bossLines, bossName, bossPost, bossShakes, bossCues } from './bossKit';
import type { BossTiming } from './bossKit';

const NAME = 'DARKNESS', COLOR = '#ffffff';
/** the Darkness stretches the spine: a longer black after the arena, a longer turn, 11 s total */
export const DK: BossTiming = { rise: 3.0, turn: 5.8, name: 8.6, end: 11.0 };
const { rise: T_RISE, turn: T_TURN, name: T_NAME, end: T_END } = DK;
const T_LOCK = T_TURN + 1.3;    // the pupil locks on the lens
const T_SWALLOW = T_NAME + 0.45;

const drawArena = (g: Gfx, L: LayerState) => arenaDark(g, L, { ...DK, rise: 2.2 });   // the arena dies at the usual pace; the black just lasts longer
const drawVoid = (g: Gfx, L: LayerState) => {
  // not a sky: a black that breathes with the heartbeat (the grain in post carries the rest)
  const ctx = g.ctx; const t = g.t; const beat = Math.pow(Math.max(0, Math.sin(t * 2.4)), 12);
  ctx.globalAlpha = L.alpha; gradientBg(g, '#000000', '#040208', '#000000', 0.5);
  ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = L.alpha * 0.05 * beat; ctx.drawImage(glowDisc(VIOLET, 256), -1600, -1000, 3200, 2000); ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = L.alpha;
};
/** the lid: a violet seam across the whole width while closed; the Eye helper takes over as it opens */
const drawEye = (g: Gfx, L: LayerState) => {
  const ctx = g.ctx; const t = g.t;
  const seam = easeOut(span(t, T_RISE, T_RISE + 1.2));
  const open = t < T_TURN ? 0.02 * seam : easeOut(span(t, T_TURN, T_TURN + 0.9));
  // closed: the seam — a hairline that widens and glows, with a faint lid curve above and below
  if (open < 0.05) {
    const w = 2 + seam * 4; ctx.globalAlpha = L.alpha * seam;
    ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = L.alpha * seam * 0.3; ctx.drawImage(glowDisc(VIOLET, 256), -2200, -300, 4400, 600); ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = L.alpha * seam;
    ctx.fillStyle = rgba('#c4b5fd', 0.9); ctx.fillRect(-2400, -w / 2, 4800, w);
    ctx.strokeStyle = rgba(VIOLET, 0.3); ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-1900, 0); ctx.quadraticCurveTo(0, -260 * seam, 1900, 0); ctx.moveTo(-1900, 0); ctx.quadraticCurveTo(0, 260 * seam, 1900, 0); ctx.stroke();
    ctx.globalAlpha = L.alpha; return;
  }
  // open: the Eye wider than the frame; the pupil drifts, then locks dead centre at T_LOCK; dilates to swallow the frame
  const drift = 1 - easeInOut(span(t, T_LOCK - 0.5, T_LOCK));
  const look = { x: wobble(t * 0.6, 3) * 0.5 * drift, y: wobble(t * 0.45, 9) * 0.25 * drift };
  const swallow = easeIn(span(t, T_SWALLOW, T_END - 0.4));
  const pupil = t < T_LOCK ? 0.22 : lerp(0.22, 0.07, span(t, T_LOCK, T_LOCK + 0.5)) * (1 - swallow) + swallow * 1.6;
  ctx.globalAlpha = L.alpha;
  eye(g, 0, 0, { r: 1200, open, look, pupil, veins: 26, glow: 1.0, t });
};
/** hundreds of small eyes around the seam, all looking at it — then at the camera at T_LOCK */
const drawWall = (g: Gfx, L: LayerState) => {
  const ctx = g.ctx; const t = g.t; const wake = easeOut(span(t, T_RISE + 0.6, T_TURN)); if (wake <= 0) return;
  const gone = span(t, T_SWALLOW, T_SWALLOW + 0.5);
  ctx.globalAlpha = L.alpha * (1 - gone);
  eyeField(g, t < T_TURN ? 90 : 160, 61, 1700, wake * (1 - gone), t);
  ctx.globalAlpha = L.alpha;
};
/** tendrils: grow down from the top edge in shot 2; at the swallow they come from every edge */
const drawTendrils = (g: Gfx, L: LayerState) => {
  const t = g.t; const reach = easeOut(span(t, T_RISE + 1.0, T_TURN + 0.5));
  if (reach > 0) { tendrils(g, -700, -1100, 7, 900, Math.PI / 2, 0.9, 71, reach, t); tendrils(g, 700, -1100, 7, 900, Math.PI / 2, 0.9, 72, reach, t); }
  const close = easeOut(span(t, T_SWALLOW, T_END - 0.3));
  if (close > 0) { tendrils(g, -1300, 0, 9, 1300, 0, 1.2, 73, close, t); tendrils(g, 1300, 0, 9, 1300, Math.PI, 1.2, 74, close, t); tendrils(g, 0, 1100, 9, 1100, -Math.PI / 2, 1.4, 75, close, t); tendrils(g, 0, -1100, 9, 1100, Math.PI / 2, 1.4, 76, close, t); }
};
const drawText = (g: Gfx, L: LayerState) => bossLines(g, L, ['we remember you.', 'THERE IS NOTHING LEFT TO BURN.', 'stay.'], DK);
const drawName = (g: Gfx, L: LayerState) => bossName(g, L, NAME, COLOR, DK, 'IT HAS ALWAYS BEEN LOOKING');

const post = bossPost(DK, 0.95);
export const boss_intro_darkness: SceneDef = {
  id: 'boss_intro_darkness',
  duration: T_END,
  skipAfter: 0.6,
  camera: {
    // the push never stops; the cut is INTO the eye (the eye is drawn at r 1200, so zoom 1 already overflows the frame)
    zoom: K(0, 1, T_RISE, 1.0, T_TURN - 0.01, 1.08, easeIn, T_TURN, 1.35, step, T_NAME - 0.01, 1.7, easeIn, T_NAME, 0.9, step, T_END, 1.3, easeIn),
    x: K(0, 0), y: K(0, 0, T_RISE, 60, T_TURN - 0.01, 0, easeInOut, T_TURN, 0, step),
    rot: K(0, 0, T_TURN - 0.01, 0.02, T_TURN, -0.09, step, T_LOCK, 0, easeOut, T_NAME, 0, step, T_END, -0.03),
    shakes: [...bossShakes(DK), { t: T_LOCK, amp: 8, decay: 5, freq: 30 }, { t: T_SWALLOW, amp: 10, decay: 1.2, freq: 4 }],
  },
  layers: [
    { id: 'arena', from: 0, to: 2.4, parallax: 0.2, alpha: K(0, 1, 2.1, 1, 2.4, 0), draw: drawArena },
    { id: 'void', from: 2.2, parallax: 0.05, draw: drawVoid },
    { id: 'wall', from: T_RISE + 0.6, to: T_SWALLOW + 0.5, parallax: 0.5, draw: drawWall },
    { id: 'eye', from: T_RISE, parallax: 0.9, draw: drawEye },
    { id: 'tendrils', from: T_RISE + 1.0, parallax: 1.1, draw: drawTendrils },
    { id: 'lines', from: T_RISE, parallax: 0, draw: drawText },
    { id: 'name', from: T_NAME, parallax: 0, draw: drawName },
  ],
  post: {
    ...post,
    // the longer black: letterbox starts tighter and ends at the tightest of all six; two inverted frames at the lock
    letterbox: K(0, 0.1, T_RISE, 0.15, T_TURN, 0.2, step, T_NAME, 0.24, T_END, 0.24),
    invert: pulses([T_TURN, T_LOCK, T_LOCK + 0.12, T_NAME + 0.45], 0.06),
    wash: K(0, 0.35, 2.2, -0.5, easeInOut, T_TURN, -1, T_END, -1),
    aberration: K(0, 0, T_TURN - 0.01, 2, T_TURN, 20, step, T_TURN + 0.5, 4, easeOut, T_LOCK - 0.01, 6, T_LOCK, 28, step, T_LOCK + 0.4, 5, easeOut, T_NAME - 0.01, 10, easeIn, T_NAME, 26, step, T_NAME + 0.4, 3, easeOut, T_SWALLOW, 3, T_END - 0.3, 14, easeIn, T_END, 0),
  },
  cues: [...bossCues(DK), { t: 2.3, sfx: 'event_start', vol: 0.35 }, { t: T_RISE + 0.6, sfx: 'ambush_ring', vol: 0.2 }, { t: T_LOCK, sfx: 'boss_telegraph', vol: 0.7 }, { t: T_SWALLOW, sfx: 'player_low_hp', vol: 0.6 }],
  shots: [
    { n: 1, from: 0, to: T_RISE, what: 'Arena floor: the warm pool gutters, ink closes, motes sink. Black — and the black stays 0.8 s longer than any other intro; a heartbeat in the grain. Setup.' },
    { n: 2, from: T_RISE, to: T_TURN, what: 'Imperceptible push: a violet seam appears across the whole width — a lid, closed; ninety small eyes wake in the black around it, all looking at the seam; tendrils grow down from the top edge. "we remember you." Escalation — the nothing is a lid.' },
    { n: 3, from: T_TURN, to: T_NAME, what: 'HARD CUT in (zoom 1.35, roll −0.09) + inverted frame: the lid OPENS on the Eye from title_seam, wider than the frame (r 1200); the slit pupil drifts … then locks dead centre on the lens (two inverted frames, 160 small eyes turn with it). "THERE IS NOTHING LEFT TO BURN." The turn.' },
    { n: 4, from: T_NAME, to: T_END, what: 'Slam back, then a push that never stops: the pupil dilates until it is the sky, tendrils close from every edge; flash; DARKNESS lands in white under IT HAS ALWAYS BEEN LOOKING; "stay." Cut to black → BossBar. Payoff — the pupil IS the dark.' },
  ],
};
export default boss_intro_darkness;
