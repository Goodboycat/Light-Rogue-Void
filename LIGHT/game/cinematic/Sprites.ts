// (M0) Pre-rendered sprites for the cinematic engine (MOVIE.md §2 "Pre-rendered sprites").
// Everything expensive (radial gradients, soft edges, ray strips, iris) is rasterised ONCE into an
// offscreen canvas keyed by (kind, colour, size) and then blitted with drawImage. No shadowBlur, no
// ctx.filter anywhere in here. Caches are module-level and live for the session.

const cache = new Map<string, HTMLCanvasElement>();

function make(key: string, w: number, h: number, paint: (x: CanvasRenderingContext2D, w: number, h: number) => void): HTMLCanvasElement {
  let c = cache.get(key);
  if (c) return c;
  c = document.createElement('canvas'); c.width = Math.max(1, Math.round(w)); c.height = Math.max(1, Math.round(h));
  paint(c.getContext('2d')!, c.width, c.height);
  cache.set(key, c);
  return c;
}

/** Soft glow disc: colour at centre fading to transparent. `size` = diameter px. Soft falloff (pow curve). */
export function glowDisc(color: string, size = 256, hard = 0): HTMLCanvasElement {
  return make(`glow|${color}|${size}|${hard}`, size, size, (x, w) => {
    const r = w / 2; const g = x.createRadialGradient(r, r, 0, r, r, r);
    const rgb = toRgb(color);
    g.addColorStop(0, `rgba(${rgb},1)`);
    g.addColorStop(0.12 + hard * 0.5, `rgba(${rgb},${0.85 - hard * 0.1})`);
    g.addColorStop(0.35 + hard * 0.4, `rgba(${rgb},0.32)`);
    g.addColorStop(0.7, `rgba(${rgb},0.07)`);
    g.addColorStop(1, `rgba(${rgb},0)`);
    x.fillStyle = g; x.fillRect(0, 0, w, w);
  });
}

/** Bokeh disc: flat-ish disc with a soft rim and brighter edge (lens-like). */
export function bokehDisc(color: string, size = 128): HTMLCanvasElement {
  return make(`bokeh|${color}|${size}`, size, size, (x, w) => {
    const r = w / 2; const g = x.createRadialGradient(r, r, 0, r, r, r); const rgb = toRgb(color);
    g.addColorStop(0, `rgba(${rgb},0.55)`); g.addColorStop(0.72, `rgba(${rgb},0.6)`);
    g.addColorStop(0.88, `rgba(${rgb},0.95)`); g.addColorStop(1, `rgba(${rgb},0)`);
    x.fillStyle = g; x.fillRect(0, 0, w, w);
  });
}

/** Volumetric ray strip: a long horizontal wedge, bright at the left (origin) fading to the right.
 *  Draw rotated around (0, h/2). `len`×`width` px. */
export function rayStrip(color: string, len = 1024, width = 96): HTMLCanvasElement {
  return make(`ray|${color}|${len}|${width}`, len, width, (x, w, h) => {
    const rgb = toRgb(color);
    const g = x.createLinearGradient(0, 0, w, 0);
    g.addColorStop(0, `rgba(${rgb},0.9)`); g.addColorStop(0.25, `rgba(${rgb},0.45)`);
    g.addColorStop(0.6, `rgba(${rgb},0.12)`); g.addColorStop(1, `rgba(${rgb},0)`);
    x.fillStyle = g;
    x.beginPath(); x.moveTo(0, h * 0.5 - 1.5); x.lineTo(w, 0); x.lineTo(w, h); x.lineTo(0, h * 0.5 + 1.5); x.closePath(); x.fill();
    // soft the long edges with a vertical mask
    const m = x.createLinearGradient(0, 0, 0, h);
    m.addColorStop(0, 'rgba(0,0,0,1)'); m.addColorStop(0.2, 'rgba(0,0,0,0)'); m.addColorStop(0.8, 'rgba(0,0,0,0)'); m.addColorStop(1, 'rgba(0,0,0,1)');
    x.globalCompositeOperation = 'destination-out'; x.fillStyle = m; x.fillRect(0, 0, w, h);
  });
}

/** Iris of the Eye: violet ring structure with radial fibres, dark limbal ring, transparent centre for the pupil. */
export function irisSprite(size = 512, hue = '#a78bfa', inner = '#2a1458'): HTMLCanvasElement {
  return make(`iris|${size}|${hue}|${inner}`, size, size, (x, w) => {
    const r = w / 2; const g = x.createRadialGradient(r, r, r * 0.18, r, r, r);
    const h = toRgb(hue), i = toRgb(inner);
    g.addColorStop(0, `rgba(${i},1)`); g.addColorStop(0.35, `rgba(${h},0.85)`); g.addColorStop(0.7, `rgba(${i},0.95)`);
    g.addColorStop(0.93, `rgba(${h},0.9)`); g.addColorStop(0.97, 'rgba(10,4,24,1)'); g.addColorStop(1, 'rgba(10,4,24,0)');
    x.fillStyle = g; x.beginPath(); x.arc(r, r, r, 0, Math.PI * 2); x.fill();
    // fibres: 160 thin radial lines, deterministic
    x.globalCompositeOperation = 'lighter'; x.lineWidth = Math.max(1, w / 400);
    for (let k = 0; k < 160; k++) {
      const a = (k / 160) * Math.PI * 2 + Math.sin(k * 12.9898) * 0.02;
      const l0 = r * (0.2 + ((k * 7919) % 100) / 100 * 0.15), l1 = r * (0.6 + ((k * 104729) % 100) / 100 * 0.35);
      x.strokeStyle = `rgba(${h},${0.08 + ((k * 31) % 10) / 60})`;
      x.beginPath(); x.moveTo(r + Math.cos(a) * l0, r + Math.sin(a) * l0); x.lineTo(r + Math.cos(a) * l1, r + Math.sin(a) * l1); x.stroke();
    }
    x.globalCompositeOperation = 'source-over';
  });
}

/** Horizontal soft gradient band (for horizon haze / god-light), colour → transparent upwards. */
export function hazeBand(color: string, w = 64, h = 512): HTMLCanvasElement {
  return make(`haze|${color}|${w}|${h}`, w, h, (x, W, H) => {
    const rgb = toRgb(color); const g = x.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, `rgba(${rgb},0)`); g.addColorStop(0.6, `rgba(${rgb},0.35)`); g.addColorStop(1, `rgba(${rgb},0.9)`);
    x.fillStyle = g; x.fillRect(0, 0, W, H);
  });
}

/** Parse #rgb/#rrggbb/rgb() → "r,g,b". */
export function toRgb(color: string): string {
  if (color.startsWith('#')) {
    let h = color.slice(1); if (h.length === 3) h = h.split('').map(c => c + c).join('');
    const n = parseInt(h, 16); return `${(n >> 16) & 255},${(n >> 8) & 255},${n & 255}`;
  }
  const m = color.match(/\d+/g); return m ? m.slice(0, 3).join(',') : '255,255,255';
}
/** `rgba()` string from colour + alpha (hot path friendly enough: template only). */
export const rgba = (color: string, a: number) => `rgba(${toRgb(color)},${a < 0 ? 0 : a > 1 ? 1 : a})`;

export const spriteCacheSize = () => cache.size;
