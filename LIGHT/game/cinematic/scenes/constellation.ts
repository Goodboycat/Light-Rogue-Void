// (M8) SCENE `constellation` — the sky is drawn (MOVIE.md §3 M8). Plays the FIRST time the Skill Tree opens (gameplay hidden +
// paused, M1 contract; `onDone` → the EvolutionMatrix DOM appears under the final frame). 8.0 s. The scene draws the REAL tree:
// every node of ABILITY_TREE_DATA at its real position (scaled to design space), lit in depth order along its spine, so the
// last frame IS the tree the player is about to touch. `makeConstellation(bossId)` is the 6 s boss variant: the seven nodes of
// that boss's constellation are drawn one by one on the dark rim of the sky and named.
//
// STORYBOARD (written first, keyframes derived from it — MOVIE.md §1.4)
// shot | start–end s | framing                          | camera move                  | what changes on screen                                                                              | text                              | audio id
// -----|-------------|----------------------------------|------------------------------|-----------------------------------------------------------------------------------------------------|-----------------------------------|------------------
//  1   |  0.0– 1.6   | black, then a field of stars     | none → slow drift            | the sky is drawn: cold stars prick in one by one; the root spark wakes in the exact centre           | —                                 | cin_silence_drop, cin_whisper
//  2   |  1.6– 4.6   | wide, the whole tree             | slow pull-back               | the three spines IGNITE from the root outward — offense amber, defense gold, utility violet-white;   | THE SKY REMEMBERS (typed)         | cin_ember_rise, ui_unlock ×3
//      |             |                                  |                              | links draw before nodes; minor nodes bloom as motes, majors as discs                                  |                                   |
//  3   |  4.6– 6.4   | wide → medium on the first node  | push toward the root         | the turn: the whole sky flashes once, embers rise off every lit node, the three spines settle         | —                                 | burst_fire, cin_cut
//  4   |  6.4– 8.0   | medium, the root node held       | lock                         | the camera lands on the first node; its ring breathes; hint text; fade — the DOM tree appears beneath | TOUCH A STAR TO LIGHT IT          | cin_title_hit
// Structure: setup (1: dark sky, one spark) → escalation (2: the spines ignite) → turn (3: the flash, embers) → payoff (4: the first node, the sky is yours).
//
// BOSS VARIANT `constellation_<bossId>` (6.0 s): 1 0.0–1.2 black sky + the boss's rim sector · 2 1.2–4.0 seven nodes light in
// order along the heptagon, links first, the boss name typed · 3 4.0–4.8 flash, embers · 4 4.8–6.0 the constellation held, hint.

import { K, step, easeIn, easeOut, easeInOut, easeOutExpo, span, lerp, clamp01, hash, wobble, engineFlags } from '../Engine';
import type { SceneDef, Gfx, LayerState } from '../Engine';
import { AMBER, GOLD, EMBER, WARM_WHITE, VIOLET, COLD, embers, spark, pool, gradientBg, typed, text, stars } from '../Draw';
import { glowDisc, rgba } from '../Sprites';
import { ABILITY_TREE_DATA, TREE_BOUNDS } from '../../data';
import { AbilityType } from '../../types';
import { BOSSES } from '../../bosses';

export const CT = { sky: 1.6, ignite: 4.6, flash: 6.4, end: 8.0 };
export const CBT = { sky: 1.2, ignite: 4.0, flash: 4.8, end: 6.0 };

// ---------------------------------------------------------------- the tree, projected into design space
/** scale so the full tree fits inside 1700×950 (leaves a margin for the letterbox + text) */
const TW = TREE_BOUNDS.maxX - TREE_BOUNDS.minX || 1, TH = TREE_BOUNDS.maxY - TREE_BOUNDS.minY || 1;
const SCALE = Math.min(1700 / TW, 950 / TH);
const CX = (TREE_BOUNDS.minX + TREE_BOUNDS.maxX) / 2, CY = (TREE_BOUNDS.minY + TREE_BOUNDS.maxY) / 2;
const px = (x: number) => (x - CX) * SCALE, py = (y: number) => (y - CY) * SCALE;

interface Star { id: string; x: number; y: number; major: boolean; depth: number; color: string; parents: number[]; boss?: string }
const byId = new Map(ABILITY_TREE_DATA.map((n, i) => [n.id, i]));
/** depth = BFS distance from root along parentIds (ids are not reliable for depth) */
const depthOf = (() => {
  const memo = new Map<string, number>();
  const f = (id: string, guard = 0): number => {
    if (memo.has(id)) return memo.get(id)!;
    const n = ABILITY_TREE_DATA[byId.get(id) ?? -1];
    const d = !n || n.parentIds.length === 0 || guard > 80 ? 0 : 1 + Math.min(...n.parentIds.map(p => f(p, guard + 1)));
    memo.set(id, d); return d;
  };
  return f;
})();
const colorOf = (t: AbilityType, boss?: string) => boss ? VIOLET : t === AbilityType.OFFENSE ? EMBER : t === AbilityType.DEFENSE ? GOLD : t === AbilityType.UTILITY ? COLD : AMBER;
const STARS: Star[] = ABILITY_TREE_DATA.map(n => ({
  id: n.id, x: px(n.position.x), y: py(n.position.y), major: n.isMajor, depth: depthOf(n.id),
  color: colorOf(n.type, n.requiresBoss), parents: n.parentIds.map(p => byId.get(p)!).filter(i => i !== undefined), boss: n.requiresBoss,
}));
const MAX_DEPTH = STARS.reduce((m, s) => (s.boss ? m : Math.max(m, s.depth)), 1);
const ROOT = STARS.find(s => s.id === 'root') ?? STARS[0];

/** 0…1 "lit" amount for a star given the ignition progress along the spine */
const litAt = (s: Star, p: number, maxDepth: number) => clamp01((p * (maxDepth + 2) - s.depth) / 1.6);

/** the breathing ring of a lit major — the only part of a settled tree that moves, so it is always drawn live */
const drawRing = (ctx: CanvasRenderingContext2D, s: Star, a: number, r: number, alpha: number, t: number) => {
  ctx.strokeStyle = rgba(s.color, 0.55 * alpha * (a - 0.5) * 2); ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.arc(s.x, s.y, r + 7 + Math.sin(t * 3 + s.x) * 1.5, 0, Math.PI * 2); ctx.stroke();
};

/** LIVE path: links (first) then nodes for a star set into `ctx`; `lit(s)` returns 0…1; `heat` is the extra flash glow.
 *  (M10) `engineFlags.low` skips the 128-px halo for minor nodes (the 64-px core stays — the mote is still there, only its
 *  bloom goes); `rings=false` leaves the major rings to the caller (the cached path draws them live). */
const drawTreeLive = (ctx: CanvasRenderingContext2D, set: Star[], lit: (s: Star) => number, alpha: number, heat: number, t: number, rings: boolean) => {
  const low = engineFlags.low;
  // links — alpha by the dimmer end
  ctx.lineCap = 'round'; ctx.lineWidth = 1.5;
  for (const s of set) {
    const a = lit(s); if (a <= 0) continue;
    for (const pi of s.parents) {
      const p = STARS[pi]; if (!p) continue;
      const u = Math.min(a, 1);
      ctx.strokeStyle = rgba(s.color, (0.12 + 0.3 * u + heat * 0.3) * alpha); ctx.beginPath();
      ctx.moveTo(p.x, p.y); ctx.lineTo(lerp(p.x, s.x, u), lerp(p.y, s.y, u)); ctx.stroke();
    }
  }
  // nodes — minors as motes, majors as discs with a ring
  ctx.globalCompositeOperation = 'lighter';
  for (const s of set) {
    const a = lit(s); if (a <= 0.02) continue;
    const bloom = Math.sin(clamp01(a) * Math.PI) * 0.6;   // a brief over-bright as it lights
    const r = (s.major ? 11 : 5) * (1 + bloom + heat * 0.4);
    if (s.major || !low) {
      const gr = (s.major ? 60 : 26) * (1 + bloom * 0.8 + heat);
      ctx.globalAlpha = alpha * (0.25 + 0.35 * heat) * a;
      ctx.drawImage(glowDisc(s.color, 128), s.x - gr, s.y - gr, gr * 2, gr * 2);
    }
    ctx.globalAlpha = alpha * a;
    ctx.drawImage(glowDisc(s.major ? WARM_WHITE : s.color, 64, 0.5), s.x - r, s.y - r, r * 2, r * 2);
    if (rings && s.major && a > 0.5) {
      ctx.globalCompositeOperation = 'source-over';
      drawRing(ctx, s, a, r, alpha, t);
      ctx.globalCompositeOperation = 'lighter';
    }
  }
  ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
};

// (M10 s1) CACHED path — once a set's `lit` no longer changes and `heat === 0` (shot 4 of the main scene; the dim ghost tree
// of the boss variant from frame 0), the links + glow discs are baked ONCE into an offscreen canvas in design space and blitted
// per frame with `lighter` (≈ the look of the live path over the near-black sky; links gain a hair of additive brightness).
// Keyed by scene id + bake scale; the bake scale follows the canvas (`g.S × 1.4` ≈ the landing zoom, capped at 1.5 → ≤ ~19 MB
// for the full tree on a 2× phone). Only the major rings (breathing) stay live. Caches are module-level: one per scene id,
// rebuilt only when the scale changes (resize).
interface TreeCache { cv: HTMLCanvasElement; x: number; y: number; w: number; h: number; cs: number }
const treeCaches = new Map<string, TreeCache>();
const bakeTree = (key: string, set: Star[], lit: (s: Star) => number, cs: number): TreeCache | null => {
  const hit = treeCaches.get(key); if (hit && hit.cs === cs) return hit;
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  const grow = (x: number, y: number) => { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; };
  for (const s of set) { grow(s.x, s.y); for (const pi of s.parents) { const p = STARS[pi]; if (p) grow(p.x, p.y); } }
  if (!isFinite(x0)) return null;
  const M = 80; x0 -= M; y0 -= M; x1 += M; y1 += M;
  const w = x1 - x0, h = y1 - y0;
  const cv = (hit?.cv) ?? document.createElement('canvas');
  cv.width = Math.max(1, Math.ceil(w * cs)); cv.height = Math.max(1, Math.ceil(h * cs));
  const c = cv.getContext('2d'); if (!c) return null;
  c.setTransform(cs, 0, 0, cs, -x0 * cs, -y0 * cs);
  c.clearRect(x0, y0, w, h);
  drawTreeLive(c, set, lit, 1, 0, 0, false);
  const tc: TreeCache = { cv, x: x0, y: y0, w, h, cs };
  treeCaches.set(key, tc); return tc;
};

/** draws a star set; with `cacheKey` (and heat 0) the settled tree is blitted from the offscreen bake, rings live */
const drawTree = (g: Gfx, set: Star[], lit: (s: Star) => number, alpha: number, heat: number, t: number, cacheKey?: string) => {
  const ctx = g.ctx;
  if (cacheKey && heat === 0) {
    const cs = Math.min(1.5, Math.max(0.5, g.S * 1.4));
    const tc = bakeTree(cacheKey, set, lit, cs);
    if (tc) {
      ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = alpha;
      ctx.drawImage(tc.cv, tc.x, tc.y, tc.w, tc.h);
      ctx.globalCompositeOperation = 'source-over';
      for (const s of set) { if (!s.major) continue; const a = lit(s); if (a > 0.5) drawRing(ctx, s, a, 11, alpha, t); }
      ctx.globalAlpha = 1; return;
    }
  }
  drawTreeLive(ctx, set, lit, alpha, heat, t, true);
};

// ---------------------------------------------------------------- scene factory
interface Timing { sky: number; ignite: number; flash: number; end: number }

const GHOST = STARS.filter(s => !s.boss); const ghostLit = () => 0.5;

const build = (id: string, T: Timing, set: Star[], focus: { x: number; y: number }, title: string, hint: string, maxDepth: number, minDepth: number, isBoss: boolean): SceneDef => {
  const { sky: T_SKY, ignite: T_IGN, flash: T_FLASH, end: T_END } = T;
  const litFn = (t: number) => {
    const p = easeInOut(span(t, T_SKY, T_IGN));
    return (s: Star) => litAt({ ...s, depth: s.depth - minDepth }, p, maxDepth - minDepth);
  };

  /** shot 1–4 bed: the sky — a cold gradient, stars pricking in one by one over shot 1 */
  const drawSky = (g: Gfx, L: LayerState) => {
    const ctx = g.ctx; const t = g.t;
    ctx.globalAlpha = L.alpha;
    gradientBg(g, '#030208', '#0a0616', '#05030c', 0.5);
    const born = easeOut(span(t, 0.1, T_SKY));
    stars(g, Math.floor(260 * born), 8101, 2200, '#cbd5ff', 0.55 * L.alpha, t);
    stars(g, Math.floor(90 * born), 8102, 2200, VIOLET, 0.3 * L.alpha, t);
    // the faint ghost of the full tree (when the boss variant runs, the known tree is already there, dim)
    if (isBoss) drawTree(g, GHOST, ghostLit, 0.35 * L.alpha, 0, t, 'ghost'); // (M10) baked once, blitted per frame
    ctx.globalAlpha = L.alpha;
  };

  /** the tree itself — links then nodes in depth order; the flash adds heat; the hold breathes */
  const drawStars = (g: Gfx, L: LayerState) => {
    const t = g.t; if (t < T_SKY - 0.3) return;
    const heat = Math.sin(clamp01(span(t, T_IGN, T_FLASH)) * Math.PI) * 0.8;
    const lit = litFn(t);
    g.ctx.globalAlpha = L.alpha;
    // (M10) from the flash on, every node is fully lit and heat is 0 → the settled tree comes from the offscreen bake
    drawTree(g, set, lit, L.alpha, t >= T_FLASH ? 0 : heat, t, t >= T_FLASH ? id : undefined);
    // the focus node: a ring that breathes once the camera lands
    const land = easeOut(span(t, T_FLASH, T_FLASH + 0.6));
    if (land > 0) {
      const ctx = g.ctx; const r = 28 + Math.sin(t * 2.4) * 4;
      ctx.strokeStyle = rgba(WARM_WHITE, 0.7 * land * L.alpha); ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(focus.x, focus.y, r, 0, Math.PI * 2); ctx.stroke();
      ctx.strokeStyle = rgba(AMBER, 0.3 * land * L.alpha); ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(focus.x, focus.y, r + 14 + Math.sin(t * 2.4 + 1) * 6, 0, Math.PI * 2); ctx.stroke();
    }
    g.ctx.globalAlpha = L.alpha;
  };

  /** the root spark — wakes in shot 1 (the first light in the sky), its pool is the floor of the whole scene */
  const drawRoot = (g: Gfx, L: LayerState) => {
    const t = g.t; const wake = easeOutExpo(span(t, 0.5, T_SKY));
    if (wake <= 0) return;
    const heat = 0.6 + 0.4 * wake + Math.sin(clamp01(span(t, T_IGN, T_FLASH)) * Math.PI) * 0.8;
    g.ctx.globalAlpha = L.alpha;
    pool(g, focus.x, focus.y, lerp(60, 520, wake), isBoss ? VIOLET : GOLD, 0.16 * wake * L.alpha);
    spark(g, focus.x + wobble(t * 3, 1) * 1.5, focus.y + wobble(t * 2.5, 2) * 1.5, { r: lerp(6, 16, wake), heat, flicker: 0.05, rays: Math.round(6 * wake), t });
    g.ctx.globalAlpha = L.alpha;
  };

  /** embers — a thin rise off the root during ignition; the flash throws a burst from every lit major */
  const drawEmbers = (g: Gfx, L: LayerState) => {
    const t = g.t; if (t < T_SKY) return;
    const rise = span(t, T_SKY, T_SKY + 0.6) * (1 - span(t, T_FLASH + 0.6, T_END));
    if (rise > 0) embers(g, { n: 90, x: focus.x - 120, y: focus.y - 40, w: 240, h: 100, rise: 70, drift: 18, rMin: 0.8, rMax: 2.2, colors: [AMBER, GOLD, WARM_WHITE], life: 3, seed: 8111, glow: 4 }, L.alpha * 0.6 * rise, t);
    const burst = span(t, T_IGN, T_FLASH + 0.4);
    if (burst > 0 && burst < 1) {
      embers(g, { n: (isBoss ? 260 : 520) >> (engineFlags.low ? 1 : 0), x: -800, y: -450, w: 1600, h: 900, rise: 420, drift: 60, rMin: 1, rMax: 3, colors: [WARM_WHITE, AMBER, VIOLET], life: 1.4, seed: 8112, glow: 5 }, L.alpha * (1 - burst) * 0.8, t - T_IGN);
    }
    g.ctx.globalAlpha = L.alpha;
  };

  /** title (shot 2, typed) and the hint (shot 4) — screen-locked */
  const drawText = (g: Gfx, L: LayerState) => {
    const t = g.t;
    const a1 = L.alpha * span(t, T_SKY + 0.3, T_SKY + 0.5) * (1 - span(t, T_IGN - 0.1, T_IGN + 0.1));
    if (a1 > 0) {
      g.ctx.globalAlpha = a1;
      text(g, isBoss ? 'A NEW CONSTELLATION' : 'THE SKILL TREE', 0, -g.hh + 120, { size: 14, font: 'mono', weight: 500, color: rgba(VIOLET, 0.7), tracking: 7 });
      typed(g, title, 0, -g.hh + 170, span(t, T_SKY + 0.4, T_SKY + 1.6), { size: 44, font: 'tech', weight: 700, color: WARM_WHITE, tracking: 6, glow: AMBER, glowBlur: 18 }, 1.2, t);
    }
    const a2 = L.alpha * easeOut(span(t, T_FLASH + 0.4, T_FLASH + 0.9)) * (1 - span(t, T_END - 0.5, T_END - 0.1));
    if (a2 > 0) {
      g.ctx.globalAlpha = a2 * (0.75 + 0.25 * Math.sin(t * 3));
      text(g, hint, 0, g.hh - 110, { size: 16, font: 'mono', weight: 500, color: rgba(AMBER, 0.85), tracking: 6 });
    }
    g.ctx.globalAlpha = L.alpha;
  };

  // camera: shot 1 still → shot 2 slow pull-back to see the whole sky → shot 3 push toward the focus → shot 4 lock
  const zoomWide = isBoss ? 1.0 : 0.92, zoomLand = isBoss ? 1.25 : 1.35;
  return {
    id,
    duration: T_END,
    skipAfter: 0.8,
    bg: g => { const ctx = g.ctx; ctx.fillStyle = '#000'; ctx.fillRect(-g.hw - 2, -g.hh - 2, g.hw * 2 + 4, g.hh * 2 + 4); },
    camera: {
      zoom: K(0, 1.15, T_SKY, 1.1, easeInOut, T_IGN, zoomWide, easeInOut, T_FLASH, zoomLand, easeInOut, T_END, zoomLand + 0.02, easeInOut),
      x: K(0, focus.x, T_IGN, isBoss ? focus.x : 0, easeInOut, T_FLASH, focus.x, easeInOut),
      y: K(0, focus.y, T_IGN, isBoss ? focus.y : 0, easeInOut, T_FLASH, focus.y, easeInOut),
      rot: K(0, 0, T_IGN, -0.012, easeInOut, T_FLASH, 0, easeInOut),
      shakes: [{ t: T_IGN, amp: 9, freq: 22, decay: 8, dur: 0.4 }],
    },
    layers: [
      { id: 'sky',    draw: drawSky,    parallax: 0.6 },
      { id: 'root',   draw: drawRoot,   from: 0.5, blend: 'lighter' },
      { id: 'stars',  draw: drawStars,  from: T_SKY - 0.3 },
      { id: 'embers', draw: drawEmbers, from: T_SKY, blend: 'lighter', parallax: 1.1 },
      { id: 'text',   draw: drawText,   from: T_SKY + 0.3, parallax: 0 },
    ],
    post: {
      letterbox: K(0, 0.08, T_IGN, 0.08, T_FLASH, 0.04, easeInOut, T_END, 0, easeInOut),
      vignette:  K(0, 0.7, T_IGN, 0.5, easeInOut, T_FLASH, 0.4),
      grain:     K(0, 0.25, T_END, 0.2),
      aberration: K(0, 0, T_IGN, 0, T_IGN + 0.05, 6, step, T_IGN + 0.5, 0, easeOut),
      wash:      K(0, -0.4, T_SKY, -0.3, easeInOut, T_IGN, 0.3, easeInOut, T_FLASH, 0.1, easeInOut),
      flash:     K(0, 0, T_IGN, 0.6, step, T_IGN + 0.18, 0, easeOut),
      fade:      K(0, 1, 0.5, 0, easeOut, T_END - 0.5, 0, T_END, 1, easeIn),
    },
    cues: [
      { t: 0.05, duckHold: 0.35, duckMs: 500 },
      { t: 0.2, sfx: 'cin_silence_drop', vol: 0.5 },
      { t: 0.6, sfx: 'cin_whisper', vol: 0.4 },
      { t: T_SKY, sfx: 'cin_ember_rise', vol: 0.6 },
      { t: T_SKY + 0.2, sfx: 'ui_unlock', vol: 0.5 }, { t: lerp(T_SKY, T_IGN, 0.45), sfx: 'ui_unlock', vol: 0.5 }, { t: lerp(T_SKY, T_IGN, 0.8), sfx: 'ui_unlock', vol: 0.5 },
      { t: T_IGN, sfx: 'burst_fire', vol: 0.6 }, { t: T_IGN + 0.05, sfx: 'cin_cut', vol: 0.5 },
      { t: T_FLASH + 0.4, stinger: 'cin_title_hit', vol: 0.5 },
    ],
    shots: isBoss ? [
      { n: 1, from: 0, to: T_SKY, what: 'the known sky, dim; the boss\'s rim sector is dark; a violet spark wakes at the constellation\'s first node' },
      { n: 2, from: T_SKY, to: T_IGN, what: 'seven nodes light in order along the heptagon, links first; the constellation is named' },
      { n: 3, from: T_IGN, to: T_FLASH, what: 'the turn: flash, embers rise off every lit node' },
      { n: 4, from: T_FLASH, to: T_END, what: 'the constellation held, its first node ringed; hint; fade → the DOM tree' },
    ] : [
      { n: 1, from: 0, to: T_SKY, what: 'black → the sky is drawn: cold stars prick in one by one; the root spark wakes in the centre' },
      { n: 2, from: T_SKY, to: T_IGN, what: 'slow pull-back: the three spines IGNITE outward from the root (amber / gold / violet-white), links before nodes; THE SKY REMEMBERS' },
      { n: 3, from: T_IGN, to: T_FLASH, what: 'the turn: one flash, embers rise off every lit node, the spines settle; push toward the root' },
      { n: 4, from: T_FLASH, to: T_END, what: 'the camera lands on the first node; its ring breathes; TOUCH A STAR TO LIGHT IT; fade → the DOM tree' },
    ],
  };
};

/** the first-open scene: the whole tree (no boss constellations) */
export const constellation: SceneDef = build('constellation', CT, STARS.filter(s => !s.boss), { x: ROOT.x, y: ROOT.y }, 'THE SKY REMEMBERS', 'TOUCH A STAR TO LIGHT IT', MAX_DEPTH, 0, false);

/** 6 s boss variant — the seven nodes of `const_<bossId>_*` on the rim; `constellation_<bossId>` ids */
export const makeConstellation = (bossId: string): SceneDef => {
  const set = STARS.filter(s => s.boss === bossId);
  if (set.length === 0) return constellation;
  const first = set.reduce((a, b) => (a.depth < b.depth ? a : b));
  const minD = first.depth, maxD = set.reduce((m, s) => Math.max(m, s.depth), minD);
  const node = ABILITY_TREE_DATA[byId.get(first.id)!];
  const bossName = BOSSES.find(b => b.id === bossId)?.name ?? bossId.toUpperCase();
  return build(`constellation_${bossId}`, CBT, set, { x: first.x, y: first.y }, (node?.constellation ?? bossName).toUpperCase(), `${bossName} · ITS LIGHT IS YOURS`, maxD, minD, true);
};

/** demo default for `?cinematic=constellation_boss` (the first boss's constellation) */
export const constellation_boss = makeConstellation('hive_mind');
export default constellation;
