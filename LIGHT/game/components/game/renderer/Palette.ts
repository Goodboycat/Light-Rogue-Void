// (5A) Palette — one palette per chapter derived from CHAPTERS[i].color, plus the two strokes every drawable
// thing shares: a dark outline (readability against the star field) and an additive glow (the "light" language).
// Art stays procedural Canvas 2D; this file is the single place colours are derived so 5B can cut consistent sprites.
import { CHAPTERS, chapterIndexOf, CHAPTER_COUNT } from '../Constants';
import type { EnemyDef } from '../types';

export interface ChapterPalette {
    /** chapter index 1..6 */
    id: number;
    /** muted body colour (dark, for fills) */
    base: string;
    /** additive glow / rim light */
    glow: string;
    /** dark outline stroke — always near-black tinted toward the chapter hue */
    outline: string;
    /** the CHAPTERS[i].color accent (bright) */
    accent: string;
    /** readable text / label colour */
    text: string;
}

const clamp = (v: number) => Math.max(0, Math.min(255, Math.round(v)));
export const hexToRgb = (hex: string): [number, number, number] => {
    const h = hex.replace('#', '');
    const n = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h, 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};
export const rgbToHex = (r: number, g: number, b: number) =>
    '#' + [r, g, b].map((v) => clamp(v).toString(16).padStart(2, '0')).join('');
/** mix(a, b, t) — t = 0 → a, t = 1 → b */
export const mix = (a: string, b: string, t: number) => {
    const [ar, ag, ab] = hexToRgb(a), [br, bg, bb] = hexToRgb(b);
    return rgbToHex(ar + (br - ar) * t, ag + (bg - ag) * t, ab + (bb - ab) * t);
};
export const lighten = (hex: string, t: number) => mix(hex, '#ffffff', t);
export const darken = (hex: string, t: number) => mix(hex, '#000000', t);
export const rgba = (hex: string, a: number) => {
    const [r, g, b] = hexToRgb(hex);
    return `rgba(${r},${g},${b},${a})`;
};

const PALETTES: ChapterPalette[] = CHAPTERS.map((ch) => ({
    id: ch.id,
    accent: ch.color,
    base: darken(ch.color, 0.72),
    glow: lighten(ch.color, 0.15),
    outline: darken(ch.color, 0.88),
    text: lighten(ch.color, 0.35),
}));

/** Palette for a chapter index (1-based); clamps into range (endless keeps chapter 6). */
export const chapterPalette = (chapter: number): ChapterPalette =>
    PALETTES[Math.min(CHAPTER_COUNT, Math.max(1, chapter)) - 1];

/** Palette for the wave an entity appears on. */
export const paletteForWave = (wave: number): ChapterPalette => chapterPalette(chapterIndexOf(wave));

/** The chapter an enemy "belongs to" = the chapter of its first wave. Bosses map through CHAPTERS.bossId. */
export const enemyChapter = (def: EnemyDef): number => {
    const bossIdx = CHAPTERS.findIndex((c) => c.bossId === def.id);
    if (bossIdx >= 0) return bossIdx + 1;
    return chapterIndexOf(Math.max(1, def.minWave ?? 1));
};
export const enemyPalette = (def: EnemyDef): ChapterPalette => chapterPalette(enemyChapter(def));

/** Dark outline around a path (always under the fill's glow). Pass a Path2D or stroke the current path. */
export const strokeOutline = (ctx: CanvasRenderingContext2D, path: Path2D | null, w = 2, color = '#05060a') => {
    const prevStroke = ctx.strokeStyle, prevW = ctx.lineWidth, prevJoin = ctx.lineJoin;
    ctx.strokeStyle = color;
    ctx.lineWidth = w;
    ctx.lineJoin = 'round';
    if (path) ctx.stroke(path); else ctx.stroke();
    ctx.strokeStyle = prevStroke; ctx.lineWidth = prevW; ctx.lineJoin = prevJoin;
};

/** Additive radial glow of radius r at the origin (caller translated). Cheap: one gradient fill, no shadowBlur. */
export const glow = (ctx: CanvasRenderingContext2D, color: string, r: number, alpha = 0.6) => {
    const prevOp = ctx.globalCompositeOperation, prevA = ctx.globalAlpha;
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = alpha;
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, r);
    g.addColorStop(0, rgba(color, 0.9));
    g.addColorStop(0.5, rgba(color, 0.35));
    g.addColorStop(1, rgba(color, 0));
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill();
    ctx.globalCompositeOperation = prevOp; ctx.globalAlpha = prevA;
};

/** Rim light: a thin bright stroke on the current path (used after the dark outline). */
export const strokeRim = (ctx: CanvasRenderingContext2D, color: string, w = 1.2, alpha = 0.9) => {
    const prevStroke = ctx.strokeStyle, prevW = ctx.lineWidth, prevA = ctx.globalAlpha;
    ctx.strokeStyle = color; ctx.lineWidth = w; ctx.globalAlpha = prevA * alpha;
    ctx.stroke();
    ctx.strokeStyle = prevStroke; ctx.lineWidth = prevW; ctx.globalAlpha = prevA;
};

/** Boss phase tint: P1 = chapter glow, P2 = hotter (amber shift), P3 = white core. */
export const PHASE_HOT = '#fbbf24';
export const phaseColor = (baseGlow: string, phase: number): string =>
    phase <= 1 ? baseGlow : phase === 2 ? mix(baseGlow, PHASE_HOT, 0.6) : '#ffffff';

export const PALETTE_OUTLINE_W = 2;   // px, dark outline width at 1× for 32 px silhouettes
export const PALETTE_RIM_W = 1.2;     // px, bright rim width
