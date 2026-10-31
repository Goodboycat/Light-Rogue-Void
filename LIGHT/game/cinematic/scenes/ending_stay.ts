// (M7) SCENE `ending_stay` — the spark chooses to keep burning (MOVIE.md §3 M7). Plays after the STAY choice; gameplay hidden +
// paused (M1 contract); `onDone` → App starts Endless at wave 61. 36 s. The longest warm scene in the film: the Eye and the spark hold
// each other's gaze, embers become a FIELD of sparks, and the final image is the one the player screenshots — a sky of small lights
// with one gold spark at the centre and the title line "STAY" under it. Nothing from gameplay is drawn.
//
// STORYBOARD (written first, keyframes derived from it — MOVIE.md §1.4)
// shot | start–end s | framing                              | camera move                   | what changes on screen                                                                                                       | text                                                  | audio id
// -----|-------------|--------------------------------------|-------------------------------|------------------------------------------------------------------------------------------------------------------------------|-------------------------------------------------------|------------------
//  1   |  0.0– 6.0   | wide, the seam: a horizon of ink,    | very slow drift right         | after the Darkness: black, then a thin violet seam opens across the horizon; the spark alone, small, centre-low; cold wind of  | WATCHER: "stay and be kept"                           | cin_silence_drop, cin_whisper, story_line
//      |             | the spark small and low              |                               | violet motes blowing left; a slow heartbeat                                                                                 |                                                       | cin_heartbeat ×3
//  2   |  6.0–14.0   | medium: the Eye rises out of the     | slow push in, slight tilt     | the Eye opens behind the seam — vast, its pupil on the spark; the two hold each other's gaze; the spark does NOT shrink; its  | DARKNESS: "You could have left."                      | cin_eye_open, cin_tendril, story_line
//      |             | seam, the spark holds                |                               | pool grows a hair every heartbeat; tendrils reach, stop short, hang                                                          | LIGHT: "I know."                                      | cin_heartbeat ×4
//  3   | 14.0–24.0   | close on the spark → the turn        | lock, then a hard shake at    | the TURN: the spark flares; its embers do not fall — they RISE and each one becomes a small spark that stays lit; hundreds,   | LIGHT: "It noticed me. Good. Let it keep looking."    | burst_fire, cin_ember_rise, cin_cut
//      |             |                                      | 14.0, slow pull back after    | then thousands, a field; the Eye's pupil narrows; the tendrils burn to ash; the seam goes gold from the centre out            |                                                       |
//  4   | 24.0–36.0   | wide → the final image               | long pull back to the widest  | the field of sparks settles into a still sky; the Eye closes — slowly, not defeated, patient; the one gold spark at the centre; | STAY (title) · "The void did not expect company."     | cin_title_hit, story_line, music_ending
//      |             |                                      | frame, then lock at 30 s      | the title lands; 6 s hold on the screenshot frame; fade to black into Endless                                                  | WAVE 61 (small, under)                                |
// Structure: setup (1: the seam, the spark alone, the heartbeat) → escalation (2: the Eye, the held gaze) → turn (3: embers rise and
// STAY lit, the field is born) → payoff (4: the still sky, the Eye closes patiently, the title, the hold).

import { K, step, easeIn, easeOut, easeInOut, easeOutExpo, easeInExpo, span, lerp, clamp01, hash, wobble } from '../Engine';
import type { SceneDef, Gfx, LayerState } from '../Engine';
import { AMBER, GOLD, EMBER, WARM_WHITE, VIOLET, VOID, INK, COLD, embers, eye, tendrils, spark, pool, gradientBg, typed, text, stars, rule, godRays } from '../Draw';
import { glowDisc, rgba } from '../Sprites';

export const ST = { eye: 6.0, turn: 14.0, field: 24.0, title: 27.0, hold: 30.0, end: 36.0 };
const { eye: T_EYE, turn: T_TURN, field: T_FIELD, title: T_TITLE, hold: T_HOLD, end: T_END } = ST;

/** the spark: centre-low, it does not move — the whole scene is about it NOT moving */
const SX = 0, SY = 150;
/** the seam: a horizon line a little above the spark */
const SEAM_Y = 20;
/** heartbeat cue times (shots 1–2) — the pool breathes on these, the camera too */
const BEATS = [1.2, 2.9, 4.6, 6.6, 8.4, 10.1, 11.8, 13.4];
const beatPulse = (t: number) => { let p = 0; for (let i = 0; i < BEATS.length; i++) { const d = t - BEATS[i]; if (d >= 0 && d < 0.5) p = Math.max(p, Math.sin((d / 0.5) * Math.PI) ** 2); } return p; };

/** FIELD OF SPARKS — the payoff. Each ember (i) is born at the spark at birth(i), rises along a deterministic arc, then STOPS and stays
 *  lit at its sky position. Positions computed, never stored. Two colour buckets + glow sprite on 1 in 4. */
const FIELD_N = 1400;
let fieldPaths: Path2D[] = [];
function drawField(g: Gfx, alpha: number, t: number) {
  const ctx = g.ctx; const u = t - T_TURN; if (u <= 0) return;
  fieldPaths = [new Path2D(), new Path2D(), new Path2D()];
  const gl = glowDisc(GOLD, 64);
  const settle = easeOut(span(t, T_FIELD - 2, T_HOLD)); // the sky stops drifting
  for (let i = 0; i < FIELD_N; i++) {
    const h0 = hash(i, 7101), h1 = hash(i, 7102), h2 = hash(i, 7103), h3 = hash(i, 7104);
    const birth = h0 * h0 * 8.5;                       // front-loaded: hundreds early, thousands later
    const age = u - birth; if (age <= 0) continue;
    const rise = easeOut(clamp01(age / (2.4 + h1 * 2.2)));
    // destination: a sky dome above the horizon, denser near the centre, a few below the seam (reflections)
    const ang = (h1 - 0.5) * Math.PI * 1.9, rad = 160 + h2 * h2 * 1500;
    const dx = Math.sin(ang) * rad * 1.25, dy = -Math.abs(Math.cos(ang)) * rad * 0.62 - 60 + (h3 < 0.08 ? 420 + h2 * 200 : 0);
    const wob = (1 - rise) * 40 + (1 - settle) * 6;
    const x = SX + dx * rise + Math.sin(t * (0.5 + h2) + i) * wob;
    const y = SY + dy * rise - (1 - rise) * 30 * Math.sin(age * 3);
    const tw = 0.55 + 0.45 * Math.sin(t * (0.7 + h3 * 1.6) + i * 2.3);
    const r = (0.9 + h3 * 1.9) * (0.4 + 0.6 * rise) * (0.75 + 0.25 * tw);
    const p = fieldPaths[rise < 0.6 ? 0 : (i % 2) + 1];
    p.moveTo(x + r, y); p.arc(x, y, r, 0, Math.PI * 2);
    if ((i & 3) === 0 && rise > 0.3) { ctx.globalAlpha = alpha * 0.35 * tw * rise; ctx.drawImage(gl, x - r * 5, y - r * 5, r * 10, r * 10); }
  }
  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha = alpha; ctx.fillStyle = EMBER; ctx.fill(fieldPaths[0]);
  ctx.fillStyle = AMBER; ctx.fill(fieldPaths[1]);
  ctx.fillStyle = WARM_WHITE; ctx.globalAlpha = alpha * 0.9; ctx.fill(fieldPaths[2]);
  ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = alpha;
}

/** bed: black → the violet seam opens (shot 1) → cold void sky (shot 2) → gold from the centre out (shot 3) → deep warm night (shot 4) */
const drawBed = (g: Gfx, L: LayerState) => {
  const ctx = g.ctx; const t = g.t;
  const open = easeOut(span(t, 0.6, 4.0));
  const warm = easeInOut(span(t, T_TURN + 0.4, T_FIELD));
  ctx.globalAlpha = L.alpha;
  gradientBg(g, warm > 0.5 ? '#06040c' : '#020108', warm > 0.5 ? '#160c16' : '#0b0618', warm > 0.5 ? '#1a0e0a' : '#07030f', 0.58);
  // faint far stars, violet in the cold, warmer later
  stars(g, 220, 7001, 1400, warm > 0.5 ? '#f3e2c0' : '#cfc3ff', 0.35 * open * (1 - warm * 0.4), t * 0.6);
  // THE SEAM: a horizontal tear of light across the horizon; violet, then gold from the centre out
  const w = lerp(0, 2600, open), coreA = 0.75 * open;
  ctx.globalCompositeOperation = 'lighter';
  const seamSpr = glowDisc(VIOLET, 256);
  ctx.globalAlpha = L.alpha * 0.55 * open; ctx.drawImage(seamSpr, -w / 2, SEAM_Y - 110, w, 220);
  ctx.globalAlpha = L.alpha * coreA; ctx.drawImage(glowDisc(COLD, 256, 0.3), -w / 2, SEAM_Y - 14, w, 28);
  if (warm > 0) { const gw = w * warm; ctx.globalAlpha = L.alpha * 0.8 * warm; ctx.drawImage(glowDisc(GOLD, 256), -gw / 2, SEAM_Y - 150, gw, 300); ctx.globalAlpha = L.alpha * warm; ctx.drawImage(glowDisc(AMBER, 256, 0.3), -gw / 2, SEAM_Y - 12, gw, 24); }
  ctx.globalCompositeOperation = 'source-over';
  // the floor below the seam: ink with a faint reflection of the spark's pool
  ctx.fillStyle = rgba(INK, 0.85); ctx.fillRect(-g.hw - 2, SEAM_Y + 6, g.hw * 2 + 4, g.hh + 600);
  const beat = beatPulse(t); const grow = easeOut(span(t, T_EYE, T_TURN));
  pool(g, SX, SY, (300 + grow * 160) * (1 + beat * 0.08) + 700 * easeOut(span(t, T_TURN, T_TURN + 1.2)), GOLD, (0.16 + grow * 0.08 + beat * 0.05) * L.alpha);
  ctx.globalAlpha = L.alpha;
};

/** cold wind: violet motes blowing left in shots 1–2; they die as the seam goes gold */
const drawWind = (g: Gfx, L: LayerState) => {
  const t = g.t; const a = L.alpha * easeOut(span(t, 0.8, 3)) * (1 - span(t, T_TURN, T_TURN + 1.5)); if (a <= 0) return;
  // "rise" negative on x is not supported by EmberField; emulate wind with a tall thin box and drift — motes sink slowly, drift wide
  embers(g, { n: 260, x: -1500, y: -700, w: 3000, h: 700, rise: -22, drift: 160, rMin: 0.6, rMax: 1.8, colors: [VIOLET, COLD, '#e9e2ff'], life: 7, seed: 7201, glow: 0 }, a * 0.55, t);
  g.ctx.globalAlpha = L.alpha;
};

/** the Eye — rises out of the seam over shot 2, pupil on the spark; narrows at the turn; closes slowly and patiently in shot 4 */
const drawEye = (g: Gfx, L: LayerState) => {
  const t = g.t; if (t < T_EYE - 0.3) return;
  const rise = easeOut(span(t, T_EYE, T_EYE + 3.0));
  const closing = easeInOut(span(t, T_FIELD + 1.0, T_HOLD - 0.5));
  const open = rise * (1 - closing);
  if (open <= 0.003) return;
  const narrow = easeOut(span(t, T_TURN, T_TURN + 1.2));
  const y = lerp(SEAM_Y + 420, -330, rise);
  g.ctx.globalAlpha = L.alpha;
  // its cold light on the seam, dying as the field warms
  pool(g, 0, SEAM_Y, 1100 * open, VIOLET, 0.14 * open * (1 - narrow * 0.7) * L.alpha);
  eye(g, 0, y, { r: 640, open, look: { x: 0, y: 0.62 }, pupil: lerp(0.36, 0.1, narrow), glow: 0.55 + 0.35 * rise - 0.4 * narrow, veins: 0.5 * rise * (1 - narrow * 0.6), t });
  g.ctx.globalAlpha = L.alpha;
};

/** tendrils: reach from the seam toward the spark in shot 2, stop SHORT and hang; burn to ash at the turn */
const drawTendrils = (g: Gfx, L: LayerState) => {
  const t = g.t; if (t < T_EYE + 1.5 || t >= T_TURN + 0.9) return;
  const reach = easeOut(span(t, T_EYE + 1.5, T_EYE + 5)) * 0.72 * (1 - easeIn(span(t, T_TURN, T_TURN + 0.8)));
  if (reach <= 0) return;
  g.ctx.globalAlpha = L.alpha;
  tendrils(g, -900, SEAM_Y, 4, 900, 0.28, 0.7, 71, reach, t);
  tendrils(g, 900, SEAM_Y, 4, 900, Math.PI - 0.28, 0.7, 72, reach, t);
  tendrils(g, 0, SEAM_Y - 60, 3, 540, Math.PI / 2 + 0.1, 0.5, 73, reach * 0.85, t);
  // ash as they burn: a brief ember puff at the turn
  const ash = span(t, T_TURN, T_TURN + 0.9);
  if (ash > 0) embers(g, { n: 160, x: -700, y: SEAM_Y - 40, w: 1400, h: 120, rise: 120, drift: 40, rMin: 0.6, rMax: 1.6, colors: [EMBER, AMBER, '#5a4a3a'], life: 0.9, seed: 7301, glow: 0 }, L.alpha * (1 - ash), t - T_TURN);
  g.ctx.globalAlpha = L.alpha;
};

/** THE SPARK — holds. Breathes on the heartbeat, grows a hair per beat, flares at the turn, then burns steady gold as the centre of the sky */
const drawSpark = (g: Gfx, L: LayerState) => {
  const t = g.t;
  const grow = easeOut(span(t, T_EYE, T_TURN));
  const flare = Math.sin(clamp01(span(t, T_TURN, T_TURN + 1.6)) * Math.PI);
  const beat = beatPulse(t) * (1 - span(t, T_TURN, T_TURN + 0.2));
  const steady = easeOut(span(t, T_FIELD, T_HOLD));
  g.ctx.globalAlpha = L.alpha;
  spark(g, SX, SY, { r: lerp(22, 30, grow) + 50 * flare + 6 * steady, heat: 1 + beat * 0.25 + flare * 1.6, flicker: 0.05 - steady * 0.03, rays: Math.round(6 + grow * 4 + 10 * flare + steady * 2), t });
  if (flare > 0) { const ctx = g.ctx; ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = L.alpha * flare * 0.85; const R = 380 * flare; ctx.drawImage(glowDisc(WARM_WHITE, 256), SX - R, SY - R, R * 2, R * 2); ctx.globalCompositeOperation = 'source-over'; }
  // god-rays upward once the field is settling — the spark is the sun of this sky
  if (steady > 0) godRays(g, SX, SY, -Math.PI / 2, 1.6, 9, 700 * steady, AMBER, 0.12 * steady * L.alpha, t);
  g.ctx.globalAlpha = L.alpha;
};

/** motes leaking upward from the spark in shots 1–2 (small, warm), then the FIELD (shot 3→4) */
const drawEmbers = (g: Gfx, L: LayerState) => {
  const t = g.t;
  const leak = 1 - span(t, T_TURN - 0.4, T_TURN);
  if (leak > 0) embers(g, { n: 120, x: SX - 120, y: SY - 30, w: 240, h: 90, rise: 70, drift: 20, rMin: 0.8, rMax: 2.2, colors: [AMBER, GOLD, EMBER], life: 3, seed: 7401, glow: 4 }, L.alpha * 0.7 * leak, t);
  drawField(g, L.alpha, t);
  g.ctx.globalAlpha = L.alpha;
};

/** voice lines — WATCHER (shot 1, lowercase crawl), DARKNESS (shot 2, cold), LIGHT (shot 2 reply + shot 3), closing line (shot 4) */
const line = (g: Gfx, who: string, s: string, x: number, y: number, t0: number, t1: number, dur: number, color: string, glow: string, whoColor: string, L: LayerState, size = 40) => {
  const t = g.t; const a = L.alpha * span(t, t0, t0 + 0.15) * (1 - span(t, t1 - 0.4, t1)); if (a <= 0) return;
  g.ctx.globalAlpha = a;
  if (who) text(g, who, x, y - 42, { size: 15, font: 'mono', weight: 500, color: whoColor, tracking: 6, align: 'left' });
  typed(g, s, x, y, span(t, t0, t0 + dur), { size, font: 'body', weight: 500, color, tracking: 2, glow, glowBlur: 18 }, who === 'DARKNESS' ? 1.5 : 0.4, t);
  g.ctx.globalAlpha = L.alpha;
};
const drawLines = (g: Gfx, L: LayerState) => {
  line(g, '', 'stay and be kept', -700, -380, 2.2, 5.8, 1.6, rgba('#cfc6f2', 0.75), VIOLET, '', L, 30);
  line(g, 'DARKNESS', 'You could have left.', -700, 320, T_EYE + 3.2, T_EYE + 6.6, 1.3, '#cfc6f2', VIOLET, rgba(VIOLET, 0.6), L);
  line(g, 'LIGHT', 'I know.', 420, 380, T_EYE + 5.6, T_TURN, 0.6, '#fff1d6', AMBER, rgba(AMBER, 0.7), L);
  line(g, 'LIGHT', 'It noticed me. Good. Let it keep looking.', -700, 380, T_TURN + 2.0, T_FIELD, 2.4, '#fff1d6', AMBER, rgba(AMBER, 0.7), L);
};

/** shot 4: the title STAY lands under the spark; the closing line; WAVE 61 small */
const drawTitle = (g: Gfx, L: LayerState) => {
  const t = g.t; const u = span(t, T_TITLE, T_TITLE + 1.4); if (u <= 0) return;
  const ctx = g.ctx; const e = easeOutExpo(u);
  ctx.globalAlpha = L.alpha * clamp01(u * 2);
  text(g, 'STAY', 0, 330, { size: 96, font: 'tech', weight: 700, color: WARM_WHITE, tracking: lerp(70, 44, e), glow: GOLD, glowBlur: 34 });
  rule(g, 0, 392, 560 * e, AMBER, 0.7);
  const u2 = span(t, T_TITLE + 0.9, T_TITLE + 1.6);
  ctx.globalAlpha = L.alpha * u2;
  text(g, 'The void did not expect company.', 0, 432, { size: 26, font: 'body', weight: 500, color: rgba('#fff1d6', 0.85), tracking: 3 });
  const u3 = span(t, T_HOLD, T_HOLD + 0.6);
  ctx.globalAlpha = L.alpha * u3 * 0.6;
  text(g, 'ENDLESS · WAVE 61', 0, 478, { size: 15, font: 'mono', weight: 500, color: AMBER, tracking: 8 });
  ctx.globalAlpha = L.alpha;
};

export const ending_stay: SceneDef = {
  id: 'ending_stay',
  duration: T_END,
  skipAfter: 1.0,
  bg: g => { const ctx = g.ctx; ctx.fillStyle = '#000'; ctx.fillRect(-g.hw - 2, -g.hh - 2, g.hw * 2 + 4, g.hh * 2 + 4); },
  camera: {
    // 1 slow drift right → 2 push in + tilt → 3 lock, shake at the turn, slow pull → 4 long pull back to the widest frame, lock at 30
    x:    K(0, -60, T_EYE, 40, easeInOut, T_TURN, 0, easeInOut, T_FIELD, 0),
    y:    K(0, 40, T_EYE, 30, T_TURN, 80, easeInOut, T_FIELD, 20, easeInOut, T_HOLD, -40, easeInOut),
    zoom: K(0, 1.04, T_EYE, 1.08, easeInOut, T_TURN, 1.34, easeInOut, T_TURN + 1.5, 1.3, easeOut, T_FIELD, 1.1, easeInOut, T_HOLD, 0.94, easeInOut),
    rot:  K(0, 0, T_EYE, 0, T_TURN, 0.025, easeInOut, T_FIELD, 0, easeInOut),
    shakes: [{ t: T_TURN, amp: 16, freq: 24, decay: 6, dur: 0.6 }],
  },
  layers: [
    { id: 'bed',      draw: drawBed },
    { id: 'wind',     draw: drawWind,     to: T_TURN + 1.5, parallax: 1.15 },
    { id: 'eye',      draw: drawEye,      from: T_EYE - 0.3, to: T_HOLD, parallax: 0.85 },
    { id: 'tendrils', draw: drawTendrils, from: T_EYE + 1.5, to: T_TURN + 0.9, parallax: 1.05 },
    { id: 'embers',   draw: drawEmbers },
    { id: 'spark',    draw: drawSpark },
    { id: 'lines',    draw: drawLines,    to: T_FIELD, parallax: 0 },
    { id: 'title',    draw: drawTitle,    from: T_TITLE, parallax: 0 },
  ],
  post: {
    letterbox: K(0, 0.10, T_EYE, 0.11, T_TURN, 0.08, easeInOut, T_FIELD, 0.05, easeInOut, T_HOLD, 0.0, easeInOut),
    vignette:  K(0, 0.7, T_EYE, 0.8, T_TURN, 0.7, T_FIELD, 0.5, easeInOut, T_HOLD, 0.35),
    grain:     K(0, 0.3, T_EYE, 0.35, T_TURN, 0.3, T_FIELD, 0.18, T_HOLD, 0.12),
    aberration: K(0, 0, T_EYE, 1.2, T_TURN - 0.05, 2, T_TURN, 10, step, T_TURN + 0.5, 0, easeOut),
    wash:      K(0, -0.35, T_EYE, -0.6, easeInOut, T_TURN, -0.6, T_TURN + 0.05, 0.9, step, T_TURN + 1.6, 0.35, easeOut, T_HOLD, 0.25),
    flash:     K(0, 0, T_TURN, 0.7, step, T_TURN + 0.18, 0, easeOut),
    fade:      K(0, 1, 1.2, 0, easeOut, T_END - 1.6, 0, T_END, 1, easeIn),
  },
  cues: [
    { t: 0.02, music: null }, { t: 0.05, duck: 0.0, duckMs: 600 },
    { t: 0.4, sfx: 'cin_silence_drop', vol: 0.5 },
    { t: 1.0, sfx: 'cin_whisper', vol: 0.45 }, { t: 2.2, sfx: 'story_line', vol: 0.2 },
    ...BEATS.map(t => ({ t, sfx: 'cin_heartbeat' as const, vol: 0.6 })),
    { t: T_EYE, sfx: 'cin_eye_open', vol: 0.7 }, { t: T_EYE + 1.6, sfx: 'cin_tendril', vol: 0.45 },
    { t: T_EYE + 3.2, sfx: 'story_line', vol: 0.25 }, { t: T_EYE + 5.6, sfx: 'story_line', vol: 0.25 },
    { t: T_TURN, sfx: 'burst_fire', vol: 0.8 }, { t: T_TURN, sfx: 'cin_cut', vol: 0.6 },
    { t: T_TURN + 0.4, sfx: 'cin_ember_rise', vol: 0.6 }, { t: T_TURN + 2.0, sfx: 'story_line', vol: 0.25 },
    { t: T_FIELD, music: 'music_ending' }, { t: T_FIELD, duck: 0.6, duckMs: 2000 },
    { t: T_TITLE, sfx: 'cin_title_hit', vol: 0.9 }, { t: T_TITLE + 0.9, sfx: 'story_line', vol: 0.2 },
    { t: T_HOLD, sfx: 'ending_stay', vol: 0.6 },
  ],
  shots: [
    { n: 1, from: 0, to: T_EYE, what: 'the seam: black, then a violet tear opens across the horizon; the spark alone, small, low; cold wind; a heartbeat; WATCHER "stay and be kept"' },
    { n: 2, from: T_EYE, to: T_TURN, what: 'the Eye rises out of the seam, vast, pupil on the spark; the held gaze — the spark grows a hair per heartbeat; tendrils stop short; DARKNESS "You could have left." / LIGHT "I know."' },
    { n: 3, from: T_TURN, to: T_FIELD, what: 'the turn: the spark flares, its embers RISE and each stays lit — hundreds then thousands, a field; the pupil narrows; tendrils burn to ash; the seam goes gold; LIGHT "Let it keep looking."' },
    { n: 4, from: T_FIELD, to: T_END, what: 'long pull back: the field settles into a still sky, the Eye closes patiently, STAY lands under the one gold spark, "The void did not expect company.", 6 s screenshot hold → black → Endless' },
  ],
};
export default ending_stay;
