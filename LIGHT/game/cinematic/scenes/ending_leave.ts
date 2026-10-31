// (M7) SCENE `ending_leave` — the spark leaves (MOVIE.md §3 M7). Plays after the LEAVE choice; gameplay hidden + paused (M1 contract);
// `onDone` → menu. 42 s. The spark rises out of the seam, the void closes behind it like a lid, and the CREDITS are typography inside the
// scene — not a DOM scroll. The final image (the screenshot frame) is a single warm point very far up in a closed black sky with the
// title line "LEAVE" under it. `makeEndingLeave(data)` builds the live scene (run stats in the credits); the exported `ending_leave`
// is the demo default for `?cinematic=ending_leave`. Nothing from gameplay is drawn; the credit list comes from CHAPTERS/BOSSES data.
//
// STORYBOARD (written first, keyframes derived from it — MOVIE.md §1.4)
// shot | start–end s | framing                              | camera move                    | what changes on screen                                                                                                      | text                                                   | audio id
// -----|-------------|--------------------------------------|--------------------------------|-----------------------------------------------------------------------------------------------------------------------------|--------------------------------------------------------|------------------
//  1   |  0.0– 7.0   | wide, the seam a little above the    | slow drift, then the camera    | after the Darkness: black; the seam opens — already half gold, torn; the spark low and small; it LIFTS off the floor for the  | WATCHER: "go, then. the seam will not hold."           | cin_silence_drop, cin_whisper,
//      |             | spark, the spark low                 | begins to tilt UP with it      | first time in the whole game; a trail of embers falls back from it                                                          |                                                        | story_line, cin_heartbeat ×2
//  2   |  7.0–14.0   | medium, following the rise           | tilt up, slow push             | the void CLOSES behind it: ink rises from the bottom like a lid; below the seam the Eye tries to open and follow — the lid    | DARKNESS: "Where will you go?"                         | cin_eye_open, cin_tendril, story_line
//      |             |                                      |                                | covers it mid-open; tendrils reach up after the spark, fall short, are swallowed                                             | LIGHT: "Up."                                           | cin_heartbeat ×2
//  3   | 14.0–16.5   | close — the pass                     | hard shake, then lock          | the TURN: the spark passes THROUGH the seam; white flash; the seam seals behind it to a hairline and goes out; silence; the    | LIGHT ROGUE VOID (assembles)                           | burst_fire, cin_cut, cin_title_hit,
//      |             |                                      |                                | lower half of the frame is now solid black — the void is shut                                                               |                                                        | music_ending
//  4   | 16.5–36.0   | wide, an open warm-black sky          | very slow pull back, drifting  | the CREDITS as typography: blocks (THE PATH with the six places and their bosses, VOICES, THIS CYCLE, MADE WITH, Goodboycat) | credits blocks, one at a time                          | ui_click per block, story_line
//      |             |                                      | up with the spark              | each assembling then fading; the spark drifts up and shrinks all the while; a few embers follow it; the stars warm            |                                                        |
//  5   | 36.0–42.0   | the final image                      | lock                           | the last lines land; LEAVE under the one warm point very far up in a closed black sky; 4 s hold on the screenshot frame; fade | "It will be dark again. / But it will remember." LEAVE | cin_title_hit, ending_leave
// Structure: setup (1: the seam, the spark lifts) → escalation (2: the lid, the Eye tries to follow) → turn (3: the pass, the seal, the
// first title) → payoff (4–5: the credits in the open sky, the point far up, LEAVE, the hold).

import { K, step, easeIn, easeOut, easeInOut, easeOutExpo, span, lerp, clamp01, hash } from '../Engine';
import type { SceneDef, Gfx, LayerState } from '../Engine';
import { AMBER, GOLD, EMBER, WARM_WHITE, VIOLET, INK, COLD, embers, eye, tendrils, spark, pool, gradientBg, typed, text, assemble, stars, rule, godRays } from '../Draw';
import { glowDisc, rgba } from '../Sprites';
import { CHAPTERS } from '../../components/game/Constants';
import { BOSSES } from '../../bosses';

export const LT = { lid: 7.0, pass: 14.0, cred: 16.5, last: 36.0, title: 37.6, hold: 39.0, end: 42.0 };
const { lid: T_LID, pass: T_PASS, cred: T_CRED, last: T_LAST, title: T_TITLE, hold: T_HOLD, end: T_END } = LT;

/** run stats the credits read — the film never imports UI */
export interface LeaveData { kills: number; wave: number }
export const DEMO_LEAVE: LeaveData = { kills: 4821, wave: 60 };

/** the seam: a horizon line; the spark starts below it and passes through it at T_PASS */
const SEAM_Y = -60;
const SX = 0;
/** heartbeat cue times (shots 1–2) */
const BEATS = [1.6, 3.6, 8.2, 10.6];
const beatPulse = (t: number) => { let p = 0; for (let i = 0; i < BEATS.length; i++) { const d = t - BEATS[i]; if (d >= 0 && d < 0.5) p = Math.max(p, Math.sin((d / 0.5) * Math.PI) ** 2); } return p; };

/** the spark's path: rests at 150 (shot 1 start) → lifts → reaches the seam at T_PASS → keeps rising through the credits, far up by the hold */
const sparkY = (t: number) => {
  if (t < T_PASS) return lerp(150, SEAM_Y, easeInOut(span(t, 3.2, T_PASS)));
  return lerp(SEAM_Y, -430, easeOut(span(t, T_PASS, T_HOLD)));
};
/** the spark's size: small, a little bigger as it lifts (effort), a flare at the pass, then shrinking to a far point */
const sparkR = (t: number) => {
  const lift = easeOut(span(t, 3.2, T_PASS));
  const far = easeInOut(span(t, T_CRED, T_HOLD));
  return lerp(20, 26, lift) * (1 - far * 0.72);
};

/* ---------- credits (data-driven, typography inside the scene) ---------- */
interface CredLine { s: string; kind: 'head' | 'line' | 'small' }
interface CredBlock { lines: CredLine[]; t0: number; t1: number }
function buildCreditBlocks(d: LeaveData): CredBlock[] {
  const B: CredLine[][] = [];
  const path: CredLine[] = [{ s: 'THE PATH', kind: 'head' }];
  CHAPTERS.forEach((c, i) => {
    const boss = BOSSES.find(b => b.id === c.bossId);
    path.push({ s: `${i + 1}. ${c.name}`, kind: 'line' });
    if (boss) path.push({ s: boss.name, kind: 'small' });
  });
  // THE PATH is long: split into two blocks of three chapters each so no block overstays
  B.push([path[0], ...path.slice(1, 7)]);
  B.push([{ s: 'THE PATH', kind: 'head' }, ...path.slice(7)]);
  B.push([{ s: 'VOICES', kind: 'head' }, { s: 'LIGHT — the one who stayed lit', kind: 'line' }, { s: 'DARKNESS — the one who was seen', kind: 'line' }, { s: 'THE WATCHER — the seam', kind: 'line' }]);
  B.push([{ s: 'THIS CYCLE', kind: 'head' }, { s: `${d.kills.toLocaleString()} shadows scattered`, kind: 'line' }, { s: `wave ${d.wave} reached`, kind: 'line' }, { s: 'and then the choice', kind: 'small' }]);
  B.push([{ s: 'MADE WITH', kind: 'head' }, { s: 'Canvas 2D · React · Vite', kind: 'line' }, { s: 'simplex-noise (MIT) for the big explosions', kind: 'small' }, { s: 'no generated art, no generated audio', kind: 'small' }]);
  B.push([{ s: 'Goodboycat', kind: 'head' }, { s: 'thank you for playing', kind: 'line' }]);
  // schedule: weight by line count so every block gets the same seconds-per-line, filling T_CRED..T_LAST
  const weights = B.map(b => 1.2 + b.length * 0.55);
  const total = weights.reduce((a, w) => a + w, 0);
  const scale = (T_LAST - T_CRED) / total;
  let t = T_CRED;
  return B.map((lines, i) => { const t0 = t; t += weights[i] * scale; return { lines, t0, t1: t }; });
}

/** bed: black → the torn gold seam (shot 1) → the lid rises (shot 2) → the seal (shot 3) → an open warm night above solid black (4–5) */
const drawBed = (g: Gfx, L: LayerState) => {
  const ctx = g.ctx; const t = g.t;
  const open = easeOut(span(t, 0.5, 3.0));
  const sealed = easeIn(span(t, T_PASS + 0.1, T_CRED));
  const warm = easeInOut(span(t, T_PASS, T_CRED + 3));
  ctx.globalAlpha = L.alpha;
  gradientBg(g, warm > 0.5 ? '#050308' : '#020108', warm > 0.5 ? '#120a12' : '#0a0616', warm > 0.5 ? '#0a0608' : '#06030d', 0.5);
  // far stars: cold violet before the pass, warming after; slow drift up with the camera
  stars(g, 260, 7501, 1500, warm > 0.5 ? '#f3e2c0' : '#cfc3ff', (0.25 + 0.3 * warm) * open, t * 0.5);
  // THE SEAM: torn, half gold already (the Darkness is dead); it seals to a hairline after the pass and goes out
  const w = lerp(0, 2400, open) * (1 - sealed * 0.996), beat = beatPulse(t);
  if (w > 2) {
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = L.alpha * 0.4 * open * (1 - sealed); ctx.drawImage(glowDisc(VIOLET, 256), -w / 2, SEAM_Y - 120, w, 240);
    ctx.globalAlpha = L.alpha * (0.55 + beat * 0.1) * open; ctx.drawImage(glowDisc(GOLD, 256), -w / 2, SEAM_Y - 90 * (1 - sealed * 0.6), w, 180 * (1 - sealed * 0.6));
    ctx.globalAlpha = L.alpha * 0.9 * open; ctx.drawImage(glowDisc(AMBER, 256, 0.3), -w / 2, SEAM_Y - 12, w, 24);
    ctx.globalCompositeOperation = 'source-over';
  }
  // the floor below the seam (shot 1): ink with the spark's pool on it — the pool is left behind as the spark lifts
  ctx.fillStyle = rgba(INK, 0.9); ctx.fillRect(-g.hw - 2, SEAM_Y + 6, g.hw * 2 + 4, g.hh + 700);
  const left = 1 - easeInOut(span(t, 3.2, T_PASS));
  pool(g, SX, 150, (300 + beat * 24) * (0.4 + 0.6 * left), GOLD, 0.18 * left * L.alpha);
  ctx.globalAlpha = L.alpha;
};

/** the Eye — below the seam, tries to open and follow the spark in shot 2; the lid covers it mid-open (drawn BEFORE the lid) */
const drawEye = (g: Gfx, L: LayerState) => {
  const t = g.t; if (t < T_LID - 0.3 || t > T_PASS + 0.3) return;
  const open = easeOut(span(t, T_LID, T_LID + 3.2)) * 0.8;
  if (open <= 0.003) return;
  g.ctx.globalAlpha = L.alpha;
  pool(g, 0, SEAM_Y + 300, 900 * open, VIOLET, 0.16 * open * L.alpha);
  eye(g, 0, SEAM_Y + 420, { r: 560, open, look: { x: 0, y: -0.7 }, pupil: 0.3, glow: 0.5 + 0.3 * open, veins: 0.6 * open, t });
  g.ctx.globalAlpha = L.alpha;
};

/** tendrils: reach UP after the spark from below the seam in shot 2, fall short, are swallowed by the lid */
const drawTendrils = (g: Gfx, L: LayerState) => {
  const t = g.t; if (t < T_LID + 0.8 || t >= T_PASS + 0.4) return;
  const reach = easeOut(span(t, T_LID + 0.8, T_LID + 4.5)) * 0.8 * (1 - easeIn(span(t, T_PASS - 1.2, T_PASS + 0.3)));
  if (reach <= 0) return;
  g.ctx.globalAlpha = L.alpha;
  tendrils(g, -520, SEAM_Y + 520, 4, 760, -Math.PI / 2 + 0.3, 0.5, 75, reach, t);
  tendrils(g, 520, SEAM_Y + 520, 4, 760, -Math.PI / 2 - 0.3, 0.5, 76, reach, t);
  tendrils(g, 0, SEAM_Y + 600, 3, 640, -Math.PI / 2, 0.35, 77, reach * 0.9, t);
  g.ctx.globalAlpha = L.alpha;
};

/** THE LID — the void closes behind the spark: ink rises from the bottom of frame in shot 2 and stops at the seam; after the pass the
 *  lower half is solid black for the rest of the film (the screenshot frame is "a closed black sky") */
const drawLid = (g: Gfx, L: LayerState) => {
  const t = g.t; const ctx = g.ctx;
  const rise = easeInOut(span(t, T_LID, T_PASS));
  if (rise <= 0) return;
  const lidY = lerp(g.hh + 400, SEAM_Y + 4, rise);
  ctx.globalAlpha = L.alpha;
  // a cold rim on the lid's edge while it moves, gone once it seals
  const rim = rise * (1 - easeIn(span(t, T_PASS, T_CRED)));
  if (rim > 0) { ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = L.alpha * 0.35 * rim; ctx.drawImage(glowDisc(COLD, 256, 0.35), -g.hw - 200, lidY - 40, g.hw * 2 + 400, 80); ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = L.alpha; }
  ctx.fillStyle = '#000'; ctx.fillRect(-g.hw - 2, lidY, g.hw * 2 + 4, g.hh * 2 + 900);
};

/** THE SPARK — lifts for the first time in the game; effort on the heartbeat; flares at the pass; then a far, steady warm point */
const drawSpark = (g: Gfx, L: LayerState) => {
  const t = g.t; const ctx = g.ctx;
  const y = sparkY(t), r = sparkR(t);
  const flare = Math.sin(clamp01(span(t, T_PASS - 0.3, T_PASS + 1.4)) * Math.PI);
  const beat = beatPulse(t);
  const far = easeInOut(span(t, T_CRED, T_HOLD));
  ctx.globalAlpha = L.alpha;
  spark(g, SX, y, { r: r + 60 * flare, heat: 1 + beat * 0.2 + flare * 1.8, flicker: 0.06 - far * 0.045, rays: Math.round(6 + 12 * flare + 2 * far), t });
  if (flare > 0) { ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = L.alpha * flare * 0.9; const R = 420 * flare; ctx.drawImage(glowDisc(WARM_WHITE, 256), SX - R, y - R, R * 2, R * 2); ctx.globalCompositeOperation = 'source-over'; }
  // rays DOWN as it leaves — the last light the void gets
  const leaving = easeInOut(span(t, 4, T_PASS)) * (1 - span(t, T_PASS, T_PASS + 1));
  if (leaving > 0) godRays(g, SX, y, Math.PI / 2, 1.2, 7, 500 * leaving, AMBER, 0.1 * leaving * L.alpha, t);
  // soft halo once far: the one warm point in a closed sky
  if (far > 0) { ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = L.alpha * 0.4 * far; const R = 160; ctx.drawImage(glowDisc(AMBER, 128), SX - R, y - R, R * 2, R * 2); ctx.globalCompositeOperation = 'source-over'; }
  ctx.globalAlpha = L.alpha;
};

/** embers: fall back from the spark as it lifts (shots 1–2), a burst at the pass, then a thin trail following it up in the credits */
const drawEmbers = (g: Gfx, L: LayerState) => {
  const t = g.t; const y = sparkY(t);
  const lifting = easeOut(span(t, 3.2, 5)) * (1 - span(t, T_PASS - 0.5, T_PASS));
  if (lifting > 0) embers(g, { n: 140, x: SX - 60, y: y + 10, w: 120, h: 40, rise: -90, drift: 30, rMin: 0.7, rMax: 2.0, colors: [AMBER, GOLD, EMBER], life: 2.6, seed: 7601, glow: 3 }, L.alpha * 0.7 * lifting, t);
  const burst = span(t, T_PASS, T_PASS + 1.6);
  if (burst > 0 && burst < 1) embers(g, { n: 320, x: -500, y: SEAM_Y - 30, w: 1000, h: 60, rise: 260, drift: 120, rMin: 0.6, rMax: 2.2, colors: [WARM_WHITE, AMBER, GOLD], life: 1.6, seed: 7602, glow: 0 }, L.alpha * (1 - burst), t - T_PASS);
  const trail = span(t, T_CRED, T_CRED + 2) * (1 - span(t, T_HOLD - 2, T_HOLD));
  if (trail > 0) embers(g, { n: 90, x: SX - 40, y: y + 20, w: 80, h: 160, rise: -20, drift: 18, rMin: 0.5, rMax: 1.4, colors: [AMBER, GOLD, EMBER], life: 4, seed: 7603, glow: 0 }, L.alpha * 0.45 * trail, t);
  g.ctx.globalAlpha = L.alpha;
};

/** voice lines — WATCHER (shot 1, lowercase crawl), DARKNESS (shot 2, cold, from below), LIGHT (shot 2 reply, one word) */
const line = (g: Gfx, who: string, s: string, x: number, y: number, t0: number, t1: number, dur: number, color: string, glow: string, whoColor: string, L: LayerState, size = 40) => {
  const t = g.t; const a = L.alpha * span(t, t0, t0 + 0.15) * (1 - span(t, t1 - 0.4, t1)); if (a <= 0) return;
  g.ctx.globalAlpha = a;
  if (who) text(g, who, x, y - 42, { size: 15, font: 'mono', weight: 500, color: whoColor, tracking: 6, align: 'left' });
  typed(g, s, x, y, span(t, t0, t0 + dur), { size, font: 'body', weight: 500, color, tracking: 2, glow, glowBlur: 18 }, who === 'DARKNESS' ? 1.5 : 0.4, t);
  g.ctx.globalAlpha = L.alpha;
};
const drawLines = (g: Gfx, L: LayerState) => {
  line(g, '', 'go, then. the seam will not hold.', -700, -380, 1.8, 6.4, 1.8, rgba('#cfc6f2', 0.75), VIOLET, '', L, 30);
  line(g, 'DARKNESS', 'Where will you go?', -700, 360, T_LID + 2.6, T_LID + 5.8, 1.2, '#cfc6f2', VIOLET, rgba(VIOLET, 0.6), L);
  line(g, 'LIGHT', 'Up.', 460, -300, T_LID + 5.2, T_PASS, 0.3, '#fff1d6', AMBER, rgba(AMBER, 0.7), L);
};

/** shot 3: the first title assembles on the flash — LIGHT ROGUE VOID — and holds into the first credits block */
const drawMainTitle = (g: Gfx, L: LayerState) => {
  const t = g.t; const u = span(t, T_PASS + 0.3, T_PASS + 1.6); if (u <= 0) return;
  const out = 1 - span(t, T_CRED - 0.2, T_CRED + 0.6); if (out <= 0) return;
  const ctx = g.ctx; ctx.globalAlpha = L.alpha * out;
  assemble(g, 'LIGHT ROGUE VOID', 0, 60, u, { size: 84, font: 'tech', weight: 700, color: WARM_WHITE, tracking: 30, glow: GOLD, glowBlur: 32 }, 70, 0.06);
  const u2 = span(t, T_PASS + 1.2, T_PASS + 1.8);
  ctx.globalAlpha = L.alpha * out * u2;
  rule(g, 0, 118, 700 * easeOutExpo(u2), AMBER, 0.7);
  text(g, 'a spark, a seam, a choice', 0, 156, { size: 22, font: 'body', weight: 500, color: rgba('#fff1d6', 0.8), tracking: 5 });
  ctx.globalAlpha = L.alpha;
};

/** shot 4: the credits — one block at a time, centred below the rising spark; head assembles, lines fade in staggered, the block drifts up a hair and fades */
const makeDrawCredits = (blocks: CredBlock[]) => (g: Gfx, L: LayerState) => {
  const t = g.t; const ctx = g.ctx;
  for (let b = 0; b < blocks.length; b++) {
    const B = blocks[b]; if (t < B.t0 || t > B.t1 + 0.4) continue;
    const len = B.t1 - B.t0; const u = (t - B.t0) / len;
    const inA = span(t, B.t0, B.t0 + 0.5), outA = 1 - span(t, B.t1 - 0.6, B.t1 + 0.1);
    const a = L.alpha * inA * outA; if (a <= 0) continue;
    const drift = -22 * u; // the block floats up with the spark
    let y = 150 + drift;
    for (let i = 0; i < B.lines.length; i++) {
      const ln = B.lines[i]; const la = span(t, B.t0 + 0.1 + i * 0.22, B.t0 + 0.5 + i * 0.22);
      ctx.globalAlpha = a * la;
      if (ln.kind === 'head') { assemble(g, ln.s, 0, y, span(t, B.t0, B.t0 + 1.0), { size: 18, font: 'tech', weight: 700, color: GOLD, tracking: 14, glow: GOLD, glowBlur: 14 }, 24, 0.05); y += 54; }
      else if (ln.kind === 'line') { text(g, ln.s, 0, y + (1 - la) * 10, { size: 34, font: 'body', weight: 500, color: '#fff1d6', tracking: 2, glow: AMBER, glowBlur: 10 }); y += 46; }
      else { text(g, ln.s, 0, y + (1 - la) * 8, { size: 18, font: 'body', weight: 500, color: rgba('#fde68a', 0.6), tracking: 5 }); y += 36; }
    }
  }
  ctx.globalAlpha = L.alpha;
};

/** shot 5: the closing two lines, then LEAVE lands under the far point; MENU hint small */
const drawEndTitle = (g: Gfx, L: LayerState) => {
  const t = g.t; const ctx = g.ctx;
  const u0 = span(t, T_LAST + 0.2, T_LAST + 0.8);
  if (u0 > 0) {
    ctx.globalAlpha = L.alpha * u0;
    text(g, 'It will be dark again.', 0, 120, { size: 30, font: 'body', weight: 500, color: rgba('#fff1d6', 0.85), tracking: 3 });
    const u1 = span(t, T_LAST + 0.9, T_LAST + 1.5); ctx.globalAlpha = L.alpha * u1;
    text(g, 'But it will remember.', 0, 164, { size: 30, font: 'body', weight: 500, color: rgba('#fff1d6', 0.85), tracking: 3 });
  }
  const u = span(t, T_TITLE, T_TITLE + 1.4); if (u <= 0) return;
  const e = easeOutExpo(u);
  ctx.globalAlpha = L.alpha * clamp01(u * 2);
  text(g, 'LEAVE', 0, 300, { size: 96, font: 'tech', weight: 700, color: WARM_WHITE, tracking: lerp(70, 44, e), glow: GOLD, glowBlur: 34 });
  rule(g, 0, 362, 560 * e, AMBER, 0.7);
  const u3 = span(t, T_HOLD, T_HOLD + 0.6);
  ctx.globalAlpha = L.alpha * u3 * 0.6;
  text(g, 'THE VOID IS CLOSED', 0, 412, { size: 15, font: 'mono', weight: 500, color: AMBER, tracking: 8 });
  ctx.globalAlpha = L.alpha;
};

/** builds the live scene — run stats go into the THIS CYCLE block */
export function makeEndingLeave(d: LeaveData): SceneDef {
  const blocks = buildCreditBlocks(d);
  return {
    id: 'ending_leave',
    duration: T_END,
    skipAfter: 1.0,
    bg: g => { const ctx = g.ctx; ctx.fillStyle = '#000'; ctx.fillRect(-g.hw - 2, -g.hh - 2, g.hw * 2 + 4, g.hh * 2 + 4); },
    camera: {
      // 1 slow drift, tilt begins with the lift → 2 tilt up + push following the spark → 3 shake at the pass, lock → 4 very slow pull back drifting up → 5 lock
      x:    K(0, 30, T_LID, -20, easeInOut, T_PASS, 0, easeInOut),
      y:    K(0, 60, 3.2, 60, T_LID, -20, easeInOut, T_PASS, -80, easeInOut, T_CRED, -60, easeOut, T_HOLD, -140, easeInOut),
      zoom: K(0, 1.06, T_LID, 1.12, easeInOut, T_PASS, 1.3, easeInOut, T_PASS + 1.2, 1.22, easeOut, T_CRED, 1.1, easeInOut, T_HOLD, 0.96, easeInOut),
      rot:  K(0, 0, T_LID, -0.012, easeInOut, T_PASS, 0.018, easeInOut, T_CRED, 0, easeInOut),
      shakes: [{ t: T_PASS, amp: 14, freq: 22, decay: 6, dur: 0.6 }],
    },
    layers: [
      { id: 'bed',      draw: drawBed },
      { id: 'eye',      draw: drawEye,      from: T_LID - 0.3, to: T_PASS + 0.3, parallax: 0.9 },
      { id: 'tendrils', draw: drawTendrils, from: T_LID + 0.8, to: T_PASS + 0.4, parallax: 1.05 },
      { id: 'lid',      draw: drawLid,      from: T_LID },
      { id: 'embers',   draw: drawEmbers },
      { id: 'spark',    draw: drawSpark },
      { id: 'lines',    draw: drawLines,    to: T_PASS, parallax: 0 },
      { id: 'maintitle', draw: drawMainTitle, from: T_PASS + 0.3, to: T_CRED + 0.6, parallax: 0 },
      { id: 'credits',  draw: makeDrawCredits(blocks), from: T_CRED, to: T_LAST + 0.5, parallax: 0 },
      { id: 'endtitle', draw: drawEndTitle, from: T_LAST + 0.2, parallax: 0 },
    ],
    post: {
      letterbox: K(0, 0.10, T_LID, 0.12, easeInOut, T_PASS, 0.08, easeInOut, T_CRED, 0.04, easeInOut, T_HOLD, 0.0, easeInOut),
      vignette:  K(0, 0.7, T_LID, 0.82, T_PASS, 0.6, easeInOut, T_CRED, 0.45, T_HOLD, 0.4),
      grain:     K(0, 0.3, T_LID, 0.38, T_PASS, 0.2, T_CRED, 0.14, T_HOLD, 0.1),
      aberration: K(0, 0, T_LID, 1.5, easeInOut, T_PASS - 0.05, 2.5, T_PASS, 10, step, T_PASS + 0.5, 0, easeOut),
      wash:      K(0, -0.3, T_LID, -0.6, easeInOut, T_PASS, -0.6, T_PASS + 0.05, 1.0, step, T_PASS + 1.6, 0.3, easeOut, T_HOLD, 0.2),
      flash:     K(0, 0, T_PASS, 0.85, step, T_PASS + 0.2, 0, easeOut),
      fade:      K(0, 1, 1.2, 0, easeOut, T_END - 1.6, 0, T_END, 1, easeIn),
    },
    cues: [
      { t: 0.02, music: null }, { t: 0.05, duck: 0.0, duckMs: 600 },
      { t: 0.4, sfx: 'cin_silence_drop', vol: 0.5 },
      { t: 1.0, sfx: 'cin_whisper', vol: 0.45 }, { t: 1.8, sfx: 'story_line', vol: 0.2 },
      ...BEATS.map(t => ({ t, sfx: 'cin_heartbeat' as const, vol: 0.55 })),
      { t: 3.4, sfx: 'cin_ember_rise', vol: 0.5 },
      { t: T_LID, sfx: 'cin_eye_open', vol: 0.6 }, { t: T_LID + 0.9, sfx: 'cin_tendril', vol: 0.45 },
      { t: T_LID + 2.6, sfx: 'story_line', vol: 0.25 }, { t: T_LID + 5.2, sfx: 'story_line', vol: 0.25 },
      { t: T_PASS, sfx: 'burst_fire', vol: 0.8 }, { t: T_PASS, sfx: 'cin_cut', vol: 0.6 },
      { t: T_PASS + 0.3, sfx: 'cin_title_hit', vol: 0.8 },
      { t: T_PASS + 1.0, music: 'music_ending' }, { t: T_PASS + 1.0, duck: 0.6, duckMs: 2500 },
      ...blocks.map(b => ({ t: b.t0 + 0.05, sfx: 'ui_click' as const, vol: 0.25 })),
      { t: T_LAST + 0.2, sfx: 'story_line', vol: 0.2 },
      { t: T_TITLE, sfx: 'cin_title_hit', vol: 0.9 },
      { t: T_HOLD, sfx: 'ending_leave', vol: 0.6 },
    ],
    shots: [
      { n: 1, from: 0, to: T_LID, what: 'the seam, torn and half gold; the spark low; it LIFTS off the floor for the first time, embers fall back; WATCHER "go, then. the seam will not hold."' },
      { n: 2, from: T_LID, to: T_PASS, what: 'the void closes behind it: ink rises like a lid; below the seam the Eye tries to open and follow — covered mid-open; tendrils reach up, fall short; DARKNESS "Where will you go?" / LIGHT "Up."' },
      { n: 3, from: T_PASS, to: T_CRED, what: 'the pass: white flash, the seam seals to a hairline and goes out, the lower half is solid black; LIGHT ROGUE VOID assembles; music_ending' },
      { n: 4, from: T_CRED, to: T_LAST, what: 'the credits as typography in an open warm-black sky: THE PATH (six places + bosses, two blocks), VOICES, THIS CYCLE (kills, wave), MADE WITH, Goodboycat; the spark drifts up and shrinks' },
      { n: 5, from: T_LAST, to: T_END, what: '"It will be dark again. / But it will remember." then LEAVE under the one warm point very far up in a closed black sky; 3 s screenshot hold → black → menu' },
    ],
  };
}

/** demo default for `?cinematic=ending_leave` */
export const ending_leave: SceneDef = makeEndingLeave(DEMO_LEAVE);
export default ending_leave;
