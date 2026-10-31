// (M6) SCENE `run_summary` — the summary is a scene, not a card (MOVIE.md §3 M6). Plays after `death` (1.2 s of true black)
// with the run's numbers rendered as WARM typography inside the film; loops forever under a thin button layer
// (components/DeathSummary.tsx: TREE / RETRY CHAPTER / MENU + the respawn-wave picker). LIGHT tone: cozy, brave, hopeful.
// `makeRunSummary(data)` builds the live scene from the run; the exported `run_summary` is a demo for `?cinematic=run_summary`.
// The SUGGESTIONS §5 glowing arrow to the Skill Tree is part of the composition: it points DOWN to where the TREE button
// sits in DeathSummary (screen-locked layer, bottom-centre), pulsing, with "+N new nodes affordable" when N > 0.
//
// STORYBOARD (loop 10 s; `ta` absolute time drives embers so the seam is invisible)
// shot | start–end s | framing                         | camera move          | what changes on screen                                                                                                         | text                                              | audio id
// -----|-------------|---------------------------------|----------------------|--------------------------------------------------------------------------------------------------------------------------------|---------------------------------------------------|------------------
//  1   |  0.0– 1.4   | black → one spark, centre-high  | none                 | out of the death's black ONE small spark relights (the ember that crossed), a warm pool spreads under it, embers start rising | —                                                 | pickup_essence
//  2   |  1.4– 3.6   | centre, typography column       | slow drift up        | the headline assembles: WAVE n (big, gold); below it the row of numbers types in one by one: kills · elites · bosses · time   | WAVE 14 / 312 KILLS · 4 ELITES · 1 BOSS · 6:12     | chapter_card, ui_click×4
//  3   |  3.6– 6.0   | the matter line + the arrow     | hold                 | "+N MATTER" slides in violet→gold; the glowing arrow is born from the spark and points down at TREE; "+k nodes affordable"    | +148 MATTER → / 3 NEW NODES AFFORDABLE / Spend light to grow. | pickup_relic, ui_unlock
//  4   |  6.0–10.0   | the whole composition, breathing| gentle sway          | everything holds and breathes; LIGHT's line fades in low; the arrow keeps pulsing; embers thin; loop seam = shot 1's relight   | "It noticed me. Good."                            | story_line
// Loop: shot 4 fades the typography 9.3→10.0 and the spark dims so shot 1's relight is the seam. Every shot changes composition.

import { K, easeOut, easeInOut, easeOutExpo, span, lerp, clamp01, hash, wobble } from '../Engine';
import type { SceneDef, Gfx, LayerState } from '../Engine';
import { AMBER, GOLD, EMBER, WARM_WHITE, VIOLET, embers, spark, pool, gradientBg, text, assemble, typed, textWidth, rule, stars } from '../Draw';
import { glowDisc, rgba } from '../Sprites';

/** everything the scene renders — a copy of components/RunSummary.tsx RunSummaryData's numbers (the film never imports UI) */
export interface SummaryData {
  wave: number; kills: number; eliteKills: number; bossKills: number;
  matter: number; essence: number; bestStreak: number; timeMs: number;
  relics: number; shrines: number; landmarks: number;
  /** skill-tree nodes the player can now afford (SUGGESTIONS §5) — 0 hides the count, the arrow still points */
  affordable: number;
  /** enemy ids first seen this run (count only) */
  newEnemies: number;
  /** chapter name for the subtitle (e.g. "WHISPERING GROVE") */
  chapter: string;
  /** boss that killed the player, if any */
  deathBoss?: string | null;
}

export const RT = { relight: 0, head: 1.4, matter: 3.6, hold: 6.0, end: 10.0 };
const { head: T_HEAD, matter: T_MATTER, hold: T_HOLD, end: T_END } = RT;
const FADE = 9.3;
const fmtTime = (ms: number) => { const s = Math.max(0, Math.floor(ms / 1000)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };

/** the spark that relit — centre-high, breathing; dims toward the loop seam */
const SX = 0, SY = -300;

export function makeRunSummary(d: SummaryData): SceneDef {
  const seamFade = (t: number) => 1 - span(t, FADE, T_END);
  const headline = `WAVE ${d.wave}`;
  const stats = [
    `${d.kills.toLocaleString()} KILLS`, `${d.eliteKills} ELITES`, `${d.bossKills} ${d.bossKills === 1 ? 'BOSS' : 'BOSSES'}`, `${fmtTime(d.timeMs)} SURVIVED`,
  ];
  const found = d.relics + d.shrines + d.landmarks;
  const sub = [d.chapter.toUpperCase(), found ? `${found} FOUND` : null, d.bestStreak ? `STREAK ${d.bestStreak}` : null, d.newEnemies ? `${d.newEnemies} NEW IN THE ARCHIVES` : null].filter(Boolean).join('   ·   ');
  const matterLine = `+${Math.floor(d.matter).toLocaleString()} MATTER`;
  const nodesLine = d.affordable > 0 ? `${d.affordable} NEW ${d.affordable === 1 ? 'NODE' : 'NODES'} AFFORDABLE` : 'THE TREE IS WAITING';
  const lightLine = d.deathBoss ? `${d.deathBoss} noticed me. Good.` : 'It noticed me. Good.';

  /** bed: deep warm-black with a faint star field, the pool under the spark */
  const drawBed = (g: Gfx, L: LayerState) => {
    const ctx = g.ctx; const t = g.t; const re = easeOut(span(t, 0, 1.2)) * seamFade(t);
    ctx.globalAlpha = L.alpha;
    gradientBg(g, '#07040c', '#120b10', '#05030a', 0.5);
    stars(g, 260, 6201, 1700, '#f5e9d6', 0.28 * re * L.alpha, g.ta * 0.4);
    pool(g, SX, SY, 760 * re, GOLD, 0.2 * re * L.alpha);
    pool(g, SX, SY + 500, 1200 * re, EMBER, 0.07 * re * L.alpha);
    ctx.globalAlpha = L.alpha;
  };
  /** embers: rising from the floor forever (ta), density breathes with the loop */
  const drawEmbers = (g: Gfx, L: LayerState) => {
    const t = g.t; const re = easeOut(span(t, 0.3, 1.6));
    const thin = 1 - 0.45 * span(t, T_HOLD, T_END);
    embers(g, { n: 220, x: -1100, y: 200, w: 2200, h: 500, rise: 70, drift: 30, rMin: 0.8, rMax: 2.6, colors: [AMBER, GOLD, EMBER], life: 7, seed: 6301, glow: 4 }, L.alpha * 0.7 * re * thin, g.ta);
    embers(g, { n: 60, x: SX - 120, y: SY - 40, w: 240, h: 100, rise: 110, drift: 18, rMin: 0.8, rMax: 2, colors: [WARM_WHITE, AMBER, GOLD], life: 3, seed: 6302 }, L.alpha * 0.8 * re * seamFade(t), g.ta);
    g.ctx.globalAlpha = L.alpha;
  };
  /** the spark that relit */
  const drawSpark = (g: Gfx, L: LayerState) => {
    const t = g.t; const re = easeOutExpo(span(t, 0.1, 1.1));
    if (re <= 0) return;
    const heat = (0.35 + 0.65 * re) * (0.55 + 0.45 * seamFade(t));
    g.ctx.globalAlpha = L.alpha;
    spark(g, SX, SY, { r: 14 + 10 * re, heat, flicker: 0.05, rays: 6, t: g.ta });
    g.ctx.globalAlpha = L.alpha;
  };
  /** shot 2: headline + stats row (screen-locked) */
  const drawHead = (g: Gfx, L: LayerState) => {
    const t = g.t; if (t < T_HEAD) return;
    const ctx = g.ctx; const a = L.alpha * seamFade(t);
    const p = span(t, T_HEAD, T_HEAD + 1.1);
    ctx.globalAlpha = a;
    assemble(g, headline, 0, -140, p, { size: 118, font: 'tech', weight: 900, color: GOLD, tracking: 14, glow: EMBER, glowBlur: 32 }, 50, 0.1);
    rule(g, 0, -62, lerp(0, 860, easeOut(span(t, T_HEAD + 0.6, T_HEAD + 1.4))), AMBER, 0.8 * a);
    // stats type in one by one, warm white, mono spacing
    const o = { size: 30, font: 'body' as const, weight: 600, color: WARM_WHITE, tracking: 3 };
    const sep = '    ·    ';
    const widths = stats.map(s => textWidth(ctx, s, o)); const sw = textWidth(ctx, sep, o);
    let total = widths.reduce((s, w) => s + w, 0) + sw * (stats.length - 1); let x = -total / 2;
    for (let i = 0; i < stats.length; i++) {
      const u = span(t, T_HEAD + 0.9 + i * 0.3, T_HEAD + 1.5 + i * 0.3);
      if (u > 0) { ctx.globalAlpha = a * u; text(g, stats[i], x + widths[i] / 2, -10, { ...o, color: i === 0 ? AMBER : WARM_WHITE }); }
      x += widths[i];
      if (i < stats.length - 1) { ctx.globalAlpha = a * span(t, T_HEAD + 1.1 + i * 0.3, T_HEAD + 1.4 + i * 0.3) * 0.5; text(g, '·', x + sw / 2, -10, o); x += sw; }
    }
    // subtitle: chapter · found · streak · archives
    ctx.globalAlpha = a * span(t, T_HEAD + 2.0, T_HEAD + 2.5) * 0.7;
    text(g, sub, 0, 40, { size: 17, font: 'mono', weight: 500, color: '#d8cdb8', tracking: 5 });
    ctx.globalAlpha = L.alpha;
  };
  /** shot 3: the matter line slides in violet → gold; the nodes line; LIGHT's single instruction */
  const drawMatter = (g: Gfx, L: LayerState) => {
    const t = g.t; if (t < T_MATTER) return;
    const ctx = g.ctx; const a = L.alpha * seamFade(t);
    const u = easeOutExpo(span(t, T_MATTER, T_MATTER + 0.8));
    const col = u < 0.6 ? VIOLET : GOLD;
    ctx.globalAlpha = a * clamp01(u * 2);
    text(g, matterLine, lerp(-120, 0, u), 130, { size: 54, font: 'tech', weight: 800, color: col, tracking: 8, glow: u < 0.6 ? VIOLET : AMBER, glowBlur: 26 });
    const v = span(t, T_MATTER + 0.7, T_MATTER + 1.3);
    if (v > 0) {
      const pulse = d.affordable > 0 ? 0.75 + 0.25 * Math.sin(g.ta * 5) : 0.6;
      ctx.globalAlpha = a * v * pulse;
      text(g, nodesLine, 0, 190, { size: 22, font: 'mono', weight: 600, color: d.affordable > 0 ? AMBER : '#b8ad9a', tracking: 6 });
    }
    const w = span(t, T_MATTER + 1.4, T_MATTER + 2.2);
    if (w > 0) { ctx.globalAlpha = a * w * 0.85; text(g, 'Spend light to grow.', 0, 232, { size: 24, font: 'body', weight: 500, color: '#efe3c8', tracking: 2 }); }
    ctx.globalAlpha = L.alpha;
  };
  /** the glowing arrow (SUGGESTIONS §5): born from the spark at T_MATTER+0.4, drops to sit above the TREE button, pulses forever */
  const drawArrow = (g: Gfx, L: LayerState) => {
    const t = g.t; const born = easeOutExpo(span(t, T_MATTER + 0.4, T_MATTER + 1.3)); if (born <= 0) return;
    const ctx = g.ctx; const a = L.alpha * seamFade(t) * born;
    // the arrow lives at design (0, 300) → DeathSummary places TREE directly under it (bottom-centre, ~y 340–400 design)
    const y0 = lerp(SY, 292, born); const bob = Math.sin(g.ta * 4.2) * 9 * born;
    const pulse = 0.6 + 0.4 * (0.5 + 0.5 * Math.sin(g.ta * 5));
    // trail from the spark while it is being born
    if (born < 1) { ctx.strokeStyle = rgba(AMBER, 0.5 * (1 - born) * L.alpha); ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(SX, SY); ctx.lineTo(0, y0); ctx.stroke(); }
    ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = a * 0.5 * pulse;
    ctx.drawImage(glowDisc(AMBER, 256), -110, y0 + bob - 90, 220, 220);
    ctx.globalCompositeOperation = 'source-over';
    // the chevron: a downward arrow, bold, gold with a white core
    const y = y0 + bob; const W = 34, H = 26;
    ctx.globalAlpha = a * pulse; ctx.strokeStyle = GOLD; ctx.lineWidth = 7; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.beginPath(); ctx.moveTo(-W, y - H); ctx.lineTo(0, y + 4); ctx.lineTo(W, y - H); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, y - 54); ctx.lineTo(0, y - 2); ctx.stroke();
    ctx.strokeStyle = WARM_WHITE; ctx.lineWidth = 2.5; ctx.globalAlpha = a * pulse * 0.9;
    ctx.beginPath(); ctx.moveTo(-W, y - H); ctx.lineTo(0, y + 4); ctx.lineTo(W, y - H); ctx.stroke();
    ctx.globalAlpha = L.alpha;
  };
  /** shot 4: LIGHT's line, low, left of centre — small, warm */
  const drawLine = (g: Gfx, L: LayerState) => {
    const t = g.t; if (t < T_HOLD) return;
    const a = L.alpha * seamFade(t) * span(t, T_HOLD, T_HOLD + 0.1);
    g.ctx.globalAlpha = a;
    text(g, 'LIGHT', -560, -430, { size: 15, font: 'mono', weight: 500, color: rgba(AMBER, 0.6), tracking: 6, align: 'left' });
    typed(g, lightLine, -560, -392, span(t, T_HOLD + 0.2, T_HOLD + 1.6), { size: 36, font: 'body', weight: 500, color: '#fff2d8', tracking: 2, glow: AMBER, glowBlur: 16 }, 0.4, g.ta);
    g.ctx.globalAlpha = L.alpha;
  };

  return {
    id: 'run_summary',
    duration: T_END,
    loop: true,
    skipAfter: 1e9, // never skippable — the UI layer owns the exits
    bg: g => { const ctx = g.ctx; ctx.fillStyle = '#000'; ctx.fillRect(-g.hw - 2, -g.hh - 2, g.hw * 2 + 4, g.hh * 2 + 4); },
    camera: {
      y: K(0, 30, T_HEAD, 30, T_MATTER, 0, easeInOut, T_END, 0),
      zoom: K(0, 1.04, T_HEAD, 1.04, T_HOLD, 1.0, easeInOut, T_END, 1.0),
      rot: K(0, 0, T_HOLD, 0, T_HOLD + 2, 0.004, easeInOut, T_END, 0, easeInOut),
    },
    layers: [
      { id: 'bed',    draw: drawBed },
      { id: 'embers', draw: drawEmbers, blend: 'lighter', parallax: 1.05 },
      { id: 'spark',  draw: drawSpark,  parallax: 0.95 },
      { id: 'head',   draw: drawHead,   from: T_HEAD, parallax: 0 },
      { id: 'matter', draw: drawMatter, from: T_MATTER, parallax: 0 },
      { id: 'arrow',  draw: drawArrow,  from: T_MATTER + 0.4, parallax: 0 },
      { id: 'line',   draw: drawLine,   from: T_HOLD, parallax: 0 },
    ],
    post: {
      letterbox: K(0, 0, T_END, 0),
      vignette: K(0, 0.0, 1.2, 0.5, easeOut, T_END, 0.5),
      grain: K(0, 0, 1.2, 0.18, T_END, 0.18),
      wash: K(0, 0, 1.4, 0.35, easeOut, T_END, 0.35),
      fade: K(0, 1, 0.9, 0, easeOut, FADE, 0, T_END, 0.6, easeInOut), // loop seam under black-ish, shot 1 relights out of it
    },
    cues: [
      { t: 0.3, sfx: 'pickup_essence', vol: 0.5 },
      { t: T_HEAD, sfx: 'chapter_card', vol: 0.5 },
      { t: T_HEAD + 0.9, sfx: 'ui_click', vol: 0.25 }, { t: T_HEAD + 1.2, sfx: 'ui_click', vol: 0.25 }, { t: T_HEAD + 1.5, sfx: 'ui_click', vol: 0.25 }, { t: T_HEAD + 1.8, sfx: 'ui_click', vol: 0.25 },
      { t: T_MATTER, sfx: 'pickup_relic', vol: 0.6 },
      ...(d.affordable > 0 ? [{ t: T_MATTER + 0.8, sfx: 'ui_unlock' as const, vol: 0.5 }] : []),
      { t: T_HOLD + 0.2, sfx: 'story_line', vol: 0.25 },
    ],
    shots: [
      { n: 1, from: 0, to: T_HEAD, what: 'out of the death\'s black one small spark relights; a warm pool spreads; embers begin to rise' },
      { n: 2, from: T_HEAD, to: T_MATTER, what: `WAVE n assembles in gold; the stats row types in one by one; chapter subtitle` },
      { n: 3, from: T_MATTER, to: T_HOLD, what: '+N MATTER slides in violet→gold; the glowing arrow is born from the spark and drops to point at TREE; "Spend light to grow."' },
      { n: 4, from: T_HOLD, to: T_END, what: 'the whole composition breathes; LIGHT\'s line low-left; embers thin; typography fades 9.3→10 for the loop seam' },
    ],
  };
}

/** registry entry — demo data so `?cinematic=run_summary` plays */
export const DEMO_SUMMARY: SummaryData = {
  wave: 14, kills: 312, eliteKills: 4, bossKills: 1, matter: 148, essence: 1920, bestStreak: 37, timeMs: 372_000,
  relics: 2, shrines: 1, landmarks: 3, affordable: 3, newEnemies: 2, chapter: 'Whispering Grove', deathBoss: null,
};
export const run_summary: SceneDef = makeRunSummary(DEMO_SUMMARY);
export default run_summary;
