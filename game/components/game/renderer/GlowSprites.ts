// (4A) Port of fork renderer/GlowSprites.ts — cached glow / vignette sprites, no per-frame gradients.
const glowSpriteCache = new Map<string, HTMLCanvasElement>();

export function getGlowSprite(color: string, size = 64): HTMLCanvasElement {
    const key = `${color}_${size}`;
    let sprite = glowSpriteCache.get(key);
    if (sprite) return sprite;

    sprite = document.createElement('canvas');
    sprite.width = sprite.height = size;
    const sctx = sprite.getContext('2d')!;
    const g = sctx.createRadialGradient(size/2, size/2, 0, size/2, size/2, size/2);
    g.addColorStop(0, color);
    g.addColorStop(0.5, color);
    g.addColorStop(1, 'transparent');
    sctx.fillStyle = g;
    sctx.beginPath();
    sctx.arc(size/2, size/2, size/2, 0, Math.PI * 2);
    sctx.fill();

    glowSpriteCache.set(key, sprite);
    return sprite;
}

let hurtVignetteSprite: HTMLCanvasElement | null = null;

/**
 * Returns a pre-rendered offscreen radial red vignette sprite (256x256)
 * so player hurt / low-HP vignette never allocates a CanvasGradient per frame.
 */
export function getHurtVignetteSprite(): HTMLCanvasElement {
    if (hurtVignetteSprite) return hurtVignetteSprite;

    const size = 256;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const sctx = canvas.getContext('2d')!;
    const cx = size / 2;
    const cy = size / 2;
    const radius = cx * 1.15;

    const g = sctx.createRadialGradient(cx, cy, cx * 0.25, cx, cy, radius);
    g.addColorStop(0, 'rgba(239, 68, 68, 0)');
    g.addColorStop(0.45, 'rgba(239, 68, 68, 0.18)');
    g.addColorStop(0.75, 'rgba(239, 68, 68, 0.55)');
    g.addColorStop(1, 'rgba(220, 38, 38, 0.95)');

    sctx.fillStyle = g;
    sctx.fillRect(0, 0, size, size);

    hurtVignetteSprite = canvas;
    return canvas;
}

const radialGradientCache = new Map<string, CanvasGradient>();

/**
 * Caches a radial gradient centered at (0, 0) for a given radius and color stops.
 * Requires the caller to translate to (x, y) before filling, so the gradient is created once per color/size and reused.
 */
export function getCachedRadialGradient(
    ctx: CanvasRenderingContext2D,
    radius: number,
    stops: Array<[number, string]>
): CanvasGradient {
    const r = Math.max(1, Math.round(radius));
    let key = `${r}`;
    for (let i = 0; i < stops.length; i++) {
        key += `_${stops[i][0]}:${stops[i][1]}`;
    }
    let grad = radialGradientCache.get(key);
    if (grad) return grad;

    grad = ctx.createRadialGradient(0, 0, 0, 0, 0, r);
    for (let i = 0; i < stops.length; i++) {
        grad.addColorStop(stops[i][0], stops[i][1]);
    }
    radialGradientCache.set(key, grad);
    return grad;
}

/**
 * Draws a pre-rendered glow sprite centered at (x, y) with the given radius if glow is enabled.
 */
export function drawGlow(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    radius: number,
    color: string,
    alpha: number = 0.65,
    glowEnabled: boolean = true // 7B wires quality here
): void {
    if (!glowEnabled || radius <= 0) return;
    const spriteSize = radius > 48 ? 128 : 64;
    const sprite = getGlowSprite(color, spriteSize);
    const prevAlpha = ctx.globalAlpha;
    ctx.globalAlpha = prevAlpha * alpha;
    ctx.drawImage(sprite, x - radius, y - radius, radius * 2, radius * 2);
    ctx.globalAlpha = prevAlpha;
}


