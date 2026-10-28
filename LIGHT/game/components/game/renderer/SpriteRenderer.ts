// (5B) Sprite mode — blits the PNGs extracted from the procedural gallery (`npm run art` → public/sprites/).
// Off by default; `?sprites=1` or settings "Sprite mode (faster)". Every caller falls back to procedural
// drawing when the atlas / image is not ready or the id is missing, so the game never depends on the PNGs.
// atlas.json: { scale, sprites: { id: { w, h, anchorX, anchorY, unit } } } — `unit` = sprite px per world px
// of the gallery cell, so drawing at world scale 1 means drawImage size = w / unit.

interface SpriteDef { w: number; h: number; anchorX: number; anchorY: number; unit: number }
interface Atlas { scale: number; sprites: Record<string, SpriteDef> }

let enabled = false;
let atlas: Atlas | null = null;
let loading = false;
const images = new Map<string, HTMLImageElement>();
const tinted = new Map<string, HTMLCanvasElement>();
const TINT_CACHE_MAX = 64;

/** Same normalisation as tools/extract-art.mjs `spriteId`. */
export const spriteId = (label: string) => label.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');

export const isSpriteMode = () => enabled && !!atlas;

export const setSpriteMode = (on: boolean) => {
    enabled = on;
    if (on) preloadSprites();
};

export const preloadSprites = () => {
    if (atlas || loading || typeof document === 'undefined') return;
    loading = true;
    const base = new URL('sprites/', document.baseURI).href;
    fetch(base + 'atlas.json').then(r => r.ok ? r.json() : Promise.reject(r.status)).then((a: Atlas) => {
        atlas = a;
        for (const id of Object.keys(a.sprites)) {
            const img = new Image();
            img.src = `${base}${id}.png`;
            images.set(id, img);
        }
    }).catch(e => { console.warn('sprites: atlas not available, staying procedural', e); loading = false; });
};

const ready = (id: string): HTMLImageElement | null => {
    const img = images.get(id);
    return img && img.complete && img.naturalWidth > 0 ? img : null;
};

export const hasSprite = (id: string) => !!atlas?.sprites[id] && !!ready(id);

const tintedSprite = (id: string, img: HTMLImageElement, color: string) => {
    const key = `${id}|${color}`;
    let c = tinted.get(key);
    if (c) return c;
    if (tinted.size >= TINT_CACHE_MAX) tinted.clear();
    c = document.createElement('canvas');
    c.width = img.naturalWidth; c.height = img.naturalHeight;
    const t = c.getContext('2d')!;
    t.drawImage(img, 0, 0);
    t.globalCompositeOperation = 'source-in';
    t.fillStyle = color;
    t.fillRect(0, 0, c.width, c.height);
    tinted.set(key, c);
    return c;
};

/**
 * Draw sprite `id` with its anchor at world (x, y). `scale` = world px per gallery world px (1 = same size
 * as the procedural drawing). `tint` replaces every opaque pixel's colour (hit flash). Returns false when
 * the sprite is unavailable so the caller can draw procedurally.
 */
export const drawSprite = (
    ctx: CanvasRenderingContext2D, id: string, x: number, y: number, rot = 0, scale = 1, tint?: string,
): boolean => {
    if (!atlas) return false;
    const def = atlas.sprites[id];
    if (!def) return false;
    const img = ready(id);
    if (!img) return false;
    const s = scale / def.unit;
    const src: CanvasImageSource = tint ? tintedSprite(id, img, tint) : img;
    ctx.save();
    ctx.translate(x, y);
    if (rot) ctx.rotate(rot);
    ctx.drawImage(src, -def.anchorX * s, -def.anchorY * s, def.w * s, def.h * s);
    ctx.restore();
    return true;
};
