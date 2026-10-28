// (7C) World Map — procedural Canvas 2D "star chart" of the run.
// Each place = one chapter = waves N..N+9, wave N+9 is the boss. Used as the
// chapter select in the main menu and as the breather overlay after a boss.
// Layout is seeded (mulberry32) so the map is identical on every device.
// No PNG, no dependency. Static layer (stars, nebulas, paths) is cached in an
// offscreen canvas; only rings / swirl / twinkles are redrawn per frame.

import React, { useEffect, useRef } from 'react';
import { CHAPTERS, WAVES_PER_CHAPTER, IS_DEMO, DEMO_MAX_WAVE } from './game/Constants';
import { mulberry32 } from '../utils/rng';
import { sfx } from '../audio/hooks';

export const MAP_W = 1024;
export const MAP_H = 683;
const MAP_SEED = 0x4c494748; // "LIGH"

/** Owner's picture positions (1024×683). Real chapters map to picture slots 1,2,3,4,5,8. */
const PLACE_POS: [number, number][] = [[215, 135], [420, 130], [625, 130], [820, 145], [225, 345], [880, 360]];
/** Reserved names from the picture (9A endless / future). Drawn as faint "?" nebulas. */
export const FUTURE_PLACES = [
  { name: 'Echoing Caverns', x: 445, y: 345 },
  { name: 'The Shattered Core', x: 670, y: 350 },
  { name: 'Broken Sanctuary', x: 330, y: 525 },
  { name: 'The Rift', x: 620, y: 525 },
];
/** Via points for the main path between consecutive chapters (Catmull-Rom through A, vias, B). */
const PATH_VIAS: [number, number][][] = [
  [[300, 150], [350, 118]],
  [[510, 102], [565, 128]],
  [[700, 152], [760, 138]],
  [[790, 250], [520, 232], [300, 258]],
  [[290, 440], [560, 438], [790, 405]],
];
/** Hidden treasure caches: a side path branching off a place, revealed once that chapter's boss is dead. */
export interface MapTreasure { id: string; from: number; x: number; y: number; matter: number; }
export const MAP_TREASURES: MapTreasure[] = [
  { id: 'cache_1', from: 0, x: 120, y: 240, matter: 60 },
  { id: 'cache_2', from: 1, x: 440, y: 232, matter: 90 },
  { id: 'cache_3', from: 2, x: 560, y: 245, matter: 120 },
  { id: 'cache_4', from: 3, x: 935, y: 250, matter: 160 },
  { id: 'cache_5', from: 4, x: 150, y: 480, matter: 220 },
  { id: 'cache_6', from: 5, x: 835, y: 540, matter: 320 },
];
export const PLACE_HIT_R = 62;
const TREASURE_HIT_R = 28;

export const chapterFirstWave = (i: number) => i * WAVES_PER_CHAPTER + 1;
export const isChapterUnlocked = (i: number, maxWaveReached: number) =>
  maxWaveReached >= chapterFirstWave(i) && (!IS_DEMO || chapterFirstWave(i) <= DEMO_MAX_WAVE);
export const isChapterCleared = (i: number, defeatedBosses: string[]) => defeatedBosses.includes(CHAPTERS[i].bossId);
export const isTreasureVisible = (t: MapTreasure, defeatedBosses: string[]) => isChapterCleared(t.from, defeatedBosses);

// ---------- geometry ----------
const catmull = (pts: [number, number][], segs = 18): [number, number][] => {
  const out: [number, number][] = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(pts.length - 1, i + 2)];
    for (let s = 0; s < segs; s++) {
      const t = s / segs, t2 = t * t, t3 = t2 * t;
      out.push([
        0.5 * (2 * p1[0] + (-p0[0] + p2[0]) * t + (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * t2 + (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * t3),
        0.5 * (2 * p1[1] + (-p0[1] + p2[1]) * t + (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * t2 + (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * t3),
      ]);
    }
  }
  out.push(pts[pts.length - 1]);
  return out;
};
/** Resample a polyline to points spaced `step` apart. */
const resample = (poly: [number, number][], step: number): [number, number][] => {
  const out: [number, number][] = [poly[0]];
  let carry = 0;
  for (let i = 1; i < poly.length; i++) {
    let [ax, ay] = poly[i - 1]; const [bx, by] = poly[i];
    let d = Math.hypot(bx - ax, by - ay);
    while (carry + d >= step) {
      const need = step - carry, k = need / d;
      ax += (bx - ax) * k; ay += (by - ay) * k; d -= need; carry = 0;
      out.push([ax, ay]);
    }
    carry += d;
  }
  return out;
};
const segmentPolys: [number, number][][] = PATH_VIAS.map((vias, i) =>
  catmull([PLACE_POS[i], ...vias, PLACE_POS[i + 1]]));
const treasurePolys: [number, number][][] = MAP_TREASURES.map(t => {
  const [px, py] = PLACE_POS[t.from];
  const mx = (px + t.x) / 2 + (t.y - py) * 0.25, my = (py + t.y) / 2 - (t.x - px) * 0.25;
  return catmull([[px, py], [mx, my], [t.x, t.y]], 12);
});

const hexA = (hex: string, a: number) => {
  const h = hex.replace('#', '');
  const r = parseInt(h.slice(0, 2), 16), g = parseInt(h.slice(2, 4), 16), b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${a})`;
};
const LOCK_GREY = '#6b7280';
const wrapLabel = (s: string): string[] => {
  if (s.length <= 17) return [s];
  const i = s.lastIndexOf(' ');
  return i > 0 ? [s.slice(0, i), s.slice(i + 1)] : [s];
};

// ---------- static layer ----------
interface Deco { stars: { x: number; y: number; r: number; a: number }[]; dots: { x: number; y: number; r: number; a: number }[][]; rings: { rx: number; ry: number; rot: number }[][]; }
let decoCache: Deco | null = null;
const buildDeco = (): Deco => {
  if (decoCache) return decoCache;
  const rng = mulberry32(MAP_SEED);
  const stars = Array.from({ length: 420 }, () => ({ x: rng() * MAP_W, y: rng() * MAP_H, r: 0.4 + rng() * 1.1, a: 0.15 + rng() * 0.6 }));
  const all = [...PLACE_POS, ...FUTURE_PLACES.map(f => [f.x, f.y] as [number, number])];
  const dots = all.map(() => {
    const n = 70 + Math.floor(rng() * 50);
    return Array.from({ length: n }, () => {
      const ang = rng() * Math.PI * 2, rad = Math.pow(rng(), 0.6) * 95;
      return { x: Math.cos(ang) * rad, y: Math.sin(ang) * rad * 0.85, r: 0.6 + rng() * 1.6, a: 0.25 + rng() * 0.7 };
    });
  });
  const rings = all.map(() => Array.from({ length: 2 + Math.floor(rng() * 2) }, (_, k) => ({ rx: 32 + k * 18 + rng() * 8, ry: 26 + k * 15 + rng() * 6, rot: rng() * Math.PI })));
  decoCache = { stars, dots, rings };
  return decoCache;
};

const drawLock = (ctx: CanvasRenderingContext2D, x: number, y: number, s: number, color: string) => {
  ctx.strokeStyle = color; ctx.fillStyle = color; ctx.lineWidth = 1.4;
  ctx.beginPath(); ctx.arc(x, y - s * 0.25, s * 0.42, Math.PI, 0); ctx.stroke();
  ctx.fillRect(x - s * 0.6, y - s * 0.25, s * 1.2, s * 0.95);
};
const drawGlyphNode = (ctx: CanvasRenderingContext2D, x: number, y: number, color: string, a: number) => {
  ctx.globalAlpha = a;
  ctx.fillStyle = '#05060c'; ctx.beginPath(); ctx.arc(x, y, 8, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = color; ctx.lineWidth = 1.3; ctx.beginPath(); ctx.arc(x, y, 8, 0, Math.PI * 2); ctx.stroke();
  ctx.beginPath(); ctx.arc(x, y, 3.5, 0, Math.PI * 1.6); ctx.stroke();
  ctx.beginPath(); ctx.arc(x + 1, y, 1.2, 0, Math.PI * 2); ctx.fill();
  ctx.globalAlpha = 1;
};
const drawDots = (ctx: CanvasRenderingContext2D, poly: [number, number][], step: number, color: string, r: number, a: number, skip = 0) => {
  const pts = resample(poly, step);
  ctx.fillStyle = color; ctx.globalAlpha = a; ctx.beginPath();
  for (let i = 0; i < pts.length; i++) {
    if (skip && i % skip === 0) continue;
    ctx.moveTo(pts[i][0] + r, pts[i][1]); ctx.arc(pts[i][0], pts[i][1], r, 0, Math.PI * 2);
  }
  ctx.fill(); ctx.globalAlpha = 1;
};

interface MapState { maxWaveReached: number; defeatedBosses: string[]; treasuresOpened: string[]; }

const drawNebula = (ctx: CanvasRenderingContext2D, deco: Deco, i: number, x: number, y: number, color: string, alpha: number, blackHole: boolean) => {
  ctx.globalAlpha = alpha;
  const g = ctx.createRadialGradient(x, y, 0, x, y, 110);
  g.addColorStop(0, hexA(color, 0.55)); g.addColorStop(0.35, hexA(color, 0.18)); g.addColorStop(1, hexA(color, 0));
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, 110, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = hexA(color, 0.22); ctx.lineWidth = 0.8;
  for (const r of deco.rings[i]) { ctx.beginPath(); ctx.ellipse(x, y, r.rx, r.ry, r.rot, 0, Math.PI * 2); ctx.stroke(); }
  ctx.fillStyle = color; ctx.beginPath();
  for (const d of deco.dots[i]) { ctx.moveTo(x + d.x + d.r, y + d.y); ctx.arc(x + d.x, y + d.y, d.r, 0, Math.PI * 2); }
  ctx.globalAlpha = alpha * 0.8; ctx.fill(); ctx.globalAlpha = alpha;
  if (blackHole) {
    const ag = ctx.createRadialGradient(x, y, 10, x, y, 40);
    ag.addColorStop(0, 'rgba(0,0,0,1)'); ag.addColorStop(0.45, 'rgba(0,0,0,1)'); ag.addColorStop(0.6, hexA('#c084fc', 0.9)); ag.addColorStop(1, hexA('#7c3aed', 0));
    ctx.fillStyle = ag; ctx.beginPath(); ctx.arc(x, y, 40, 0, Math.PI * 2); ctx.fill();
  } else {
    const cg = ctx.createRadialGradient(x, y, 0, x, y, 22);
    cg.addColorStop(0, '#ffffff'); cg.addColorStop(0.3, hexA(color, 0.95)); cg.addColorStop(1, hexA(color, 0));
    ctx.fillStyle = cg; ctx.beginPath(); ctx.arc(x, y, 22, 0, Math.PI * 2); ctx.fill();
  }
  ctx.globalAlpha = 1;
};

const paintStatic = (ctx: CanvasRenderingContext2D, st: MapState) => {
  const deco = buildDeco();
  ctx.fillStyle = '#04050b'; ctx.fillRect(0, 0, MAP_W, MAP_H);
  // stars
  ctx.fillStyle = '#ffffff';
  for (const s of deco.stars) { ctx.globalAlpha = s.a; ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2); ctx.fill(); }
  ctx.globalAlpha = 1;
  // future places (faint, locked, "?")
  FUTURE_PLACES.forEach((f, k) => {
    drawNebula(ctx, deco, PLACE_POS.length + k, f.x, f.y, '#7c6aa8', 0.32, false);
    ctx.fillStyle = 'rgba(148,163,184,0.55)'; ctx.font = 'bold 15px Orbitron, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('?', f.x, f.y + 1);
    ctx.font = 'bold 11px Orbitron, sans-serif'; ctx.fillStyle = 'rgba(148,163,184,0.38)';
    wrapLabel(f.name.toUpperCase()).forEach((ln, j) => ctx.fillText(ln, f.x, f.y - 92 + j * 14));
  });
  // main path
  segmentPolys.forEach((poly, i) => {
    const lit = isChapterUnlocked(i + 1, st.maxWaveReached);
    const col = lit ? '#e2e8f0' : '#64748b';
    drawDots(ctx, poly, lit ? 7 : 9, col, lit ? 1.3 : 1.0, lit ? 0.85 : 0.35, lit ? 0 : 3);
    const pts = resample(poly, 4);
    const mid = pts[Math.floor(pts.length * 0.5)];
    drawGlyphNode(ctx, mid[0], mid[1], lit ? CHAPTERS[i + 1].color : LOCK_GREY, lit ? 0.9 : 0.45);
    const q = pts[Math.floor(pts.length * 0.22)];
    ctx.fillStyle = col; ctx.globalAlpha = lit ? 0.9 : 0.4; ctx.beginPath(); ctx.arc(q[0], q[1], 3, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = 1;
    if (!lit) { const l = pts[Math.floor(pts.length * 0.75)]; drawLock(ctx, l[0], l[1], 9, '#94a3b8'); }
  });
  // hidden treasure paths (only once the chapter's boss is dead)
  MAP_TREASURES.forEach((t, k) => {
    if (!isTreasureVisible(t, st.defeatedBosses)) return;
    const opened = st.treasuresOpened.includes(t.id);
    const col = opened ? '#64748b' : '#fde68a';
    drawDots(ctx, treasurePolys[k], 9, col, 0.9, opened ? 0.3 : 0.55, 3);
  });
  // real places
  CHAPTERS.forEach((ch, i) => {
    const [x, y] = PLACE_POS[i];
    const unlocked = isChapterUnlocked(i, st.maxWaveReached);
    const cleared = isChapterCleared(i, st.defeatedBosses);
    const color = unlocked ? ch.color : LOCK_GREY;
    drawNebula(ctx, deco, i, x, y, color, unlocked ? 1 : 0.55, i === CHAPTERS.length - 1);
    if (!unlocked) drawLock(ctx, x, y + 2, 12, '#cbd5e1');
    if (cleared) { ctx.strokeStyle = hexA(ch.color, 0.9); ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(x, y, 46, 0, Math.PI * 2); ctx.stroke();
      ctx.fillStyle = ch.color; ctx.font = 'bold 12px Orbitron, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('✓', x + 38, y - 34); }
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = 'bold 13px Orbitron, sans-serif'; ctx.fillStyle = unlocked ? ch.color : '#94a3b8';
    const lines = wrapLabel(ch.name.toUpperCase());
    lines.forEach((ln, j) => ctx.fillText(`${j === 0 ? `${ch.id}. ` : ''}${ln}`, x, y - 96 + j * 15));
    ctx.font = '10px Rajdhani, sans-serif'; ctx.fillStyle = unlocked ? 'rgba(226,232,240,0.7)' : 'rgba(148,163,184,0.5)';
    ctx.fillText(`WAVES ${chapterFirstWave(i)}–${ch.bossWave}`, x, y - 96 + lines.length * 15);
  });
};

// ---------- component ----------
export interface WorldMapProps {
  maxWaveReached: number;
  defeatedBosses: string[];
  /** 0-based chapter index highlighted with the pulsing ring (selected in menu / next place in-run). */
  current: number;
  onSelect?: (chapterIdx: number) => void;
  treasuresOpened?: string[];
  onTreasure?: (id: string, matter: number) => void;
  reduceFlash?: boolean;
  className?: string;
}

const WorldMap: React.FC<WorldMapProps> = ({ maxWaveReached, defeatedBosses, current, onSelect, treasuresOpened = [], onTreasure, reduceFlash = false, className = '' }) => {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const staticRef = useRef<HTMLCanvasElement | null>(null);
  const propsRef = useRef({ maxWaveReached, defeatedBosses, treasuresOpened, current, onSelect, onTreasure, reduceFlash });
  propsRef.current = { maxWaveReached, defeatedBosses, treasuresOpened, current, onSelect, onTreasure, reduceFlash };
  const sizeRef = useRef({ w: 0, h: 0, dpr: 1 });
  const staticDirty = useRef(true);
  const burstRef = useRef<{ x: number; y: number; t: number; label: string } | null>(null);

  useEffect(() => { staticDirty.current = true; }, [maxWaveReached, defeatedBosses, treasuresOpened]);

  useEffect(() => {
    const wrap = wrapRef.current, canvas = canvasRef.current;
    if (!wrap || !canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      const cw = wrap.clientWidth, chh = wrap.clientHeight || cw * MAP_H / MAP_W;
      const w = Math.max(1, Math.min(cw, chh * MAP_W / MAP_H)), h = w * MAP_H / MAP_W;
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      canvas.style.width = `${w}px`; canvas.style.height = `${h}px`;
      canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
      sizeRef.current = { w, h, dpr };
      staticDirty.current = true;
    };
    resize();
    const ro = new ResizeObserver(resize); ro.observe(wrap);

    let raf = 0, last = 0;
    const frame = (now: number) => {
      const p = propsRef.current, { w, h, dpr } = sizeRef.current;
      const scale = (w / MAP_W) * dpr;
      if (staticDirty.current) {
        const sc = staticRef.current ?? (staticRef.current = document.createElement('canvas'));
        sc.width = canvas.width; sc.height = canvas.height;
        const sctx = sc.getContext('2d')!;
        sctx.setTransform(scale, 0, 0, scale, 0, 0);
        paintStatic(sctx, { maxWaveReached: p.maxWaveReached, defeatedBosses: p.defeatedBosses, treasuresOpened: p.treasuresOpened });
        staticDirty.current = false;
      }
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.drawImage(staticRef.current!, 0, 0);
      ctx.setTransform(scale, 0, 0, scale, 0, 0);
      const t = p.reduceFlash ? 0 : now / 1000;
      // black-hole swirl (last place)
      const [bx, by] = PLACE_POS[PLACE_POS.length - 1];
      const bhUnlocked = isChapterUnlocked(PLACE_POS.length - 1, p.maxWaveReached);
      ctx.strokeStyle = bhUnlocked ? 'rgba(216,180,254,0.75)' : 'rgba(148,163,184,0.4)'; ctx.lineWidth = 1.6;
      for (let a = 0; a < 3; a++) {
        ctx.beginPath();
        for (let s = 0; s <= 24; s++) { const u = s / 24, ang = t * 0.9 + a * (Math.PI * 2 / 3) + u * 2.4, r = 24 + u * 44; const px = bx + Math.cos(ang) * r, py = by + Math.sin(ang) * r * 0.75; s ? ctx.lineTo(px, py) : ctx.moveTo(px, py); }
        ctx.stroke();
      }
      // current / selected ring
      if (p.current >= 0 && p.current < PLACE_POS.length) {
        const [cx, cy] = PLACE_POS[p.current]; const col = CHAPTERS[p.current].color;
        const pulse = p.reduceFlash ? 0 : Math.sin(t * 3) * 0.5 + 0.5;
        ctx.strokeStyle = hexA(col, 0.55 + pulse * 0.4); ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(cx, cy, 54 + pulse * 7, 0, Math.PI * 2); ctx.stroke();
        ctx.strokeStyle = hexA(col, 0.25); ctx.lineWidth = 1;
        ctx.beginPath(); ctx.arc(cx, cy, 70 + pulse * 10, 0, Math.PI * 2); ctx.stroke();
      }
      // treasure caches
      MAP_TREASURES.forEach(tr => {
        if (!isTreasureVisible(tr, p.defeatedBosses)) return;
        const opened = p.treasuresOpened.includes(tr.id);
        const tw = opened ? 0.35 : 0.7 + (p.reduceFlash ? 0 : Math.sin(t * 4 + tr.x) * 0.3);
        ctx.save(); ctx.translate(tr.x, tr.y); ctx.rotate(Math.PI / 4);
        ctx.fillStyle = opened ? 'rgba(100,116,139,0.6)' : hexA('#fde68a', tw);
        ctx.fillRect(-6, -6, 12, 12);
        ctx.strokeStyle = opened ? '#64748b' : '#fff7d6'; ctx.lineWidth = 1.2; ctx.strokeRect(-6, -6, 12, 12);
        ctx.restore();
        if (!opened) { ctx.strokeStyle = hexA('#fde68a', 0.25 + tw * 0.3); ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(tr.x, tr.y, 14, 0, Math.PI * 2); ctx.stroke(); }
      });
      // open burst label
      const b = burstRef.current;
      if (b) {
        const age = (performance.now() - b.t) / 1000;
        if (age > 1.6) burstRef.current = null; else {
          ctx.globalAlpha = 1 - age / 1.6; ctx.fillStyle = '#fde68a'; ctx.font = 'bold 14px Orbitron, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          ctx.fillText(b.label, b.x, b.y - 24 - age * 20);
          ctx.strokeStyle = hexA('#fde68a', 0.8 * (1 - age / 1.6)); ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(b.x, b.y, 14 + age * 50, 0, Math.PI * 2); ctx.stroke();
          ctx.globalAlpha = 1;
        }
      }
      last = now;
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    void last;

    const toMap = (e: PointerEvent) => {
      const r = canvas.getBoundingClientRect();
      return [(e.clientX - r.left) * MAP_W / r.width, (e.clientY - r.top) * MAP_H / r.height] as [number, number];
    };
    const hit = (mx: number, my: number) => {
      const p = propsRef.current;
      for (const tr of MAP_TREASURES) {
        if (isTreasureVisible(tr, p.defeatedBosses) && !p.treasuresOpened.includes(tr.id) && Math.hypot(mx - tr.x, my - tr.y) < TREASURE_HIT_R) return { treasure: tr };
      }
      for (let i = 0; i < PLACE_POS.length; i++) {
        if (Math.hypot(mx - PLACE_POS[i][0], my - PLACE_POS[i][1]) < PLACE_HIT_R) return { place: i };
      }
      return null;
    };
    const onDown = (e: PointerEvent) => {
      const [mx, my] = toMap(e); const h = hit(mx, my); const p = propsRef.current;
      if (!h) return;
      if ('treasure' in h && h.treasure) {
        burstRef.current = { x: h.treasure.x, y: h.treasure.y, t: performance.now(), label: `+${h.treasure.matter} MATTER` };
        sfx('pickup_relic', 0.9);
        p.onTreasure?.(h.treasure.id, h.treasure.matter);
      } else if ('place' in h && h.place !== undefined && isChapterUnlocked(h.place, p.maxWaveReached)) {
        p.onSelect?.(h.place);
      }
    };
    const onMove = (e: PointerEvent) => {
      const [mx, my] = toMap(e); const h = hit(mx, my); const p = propsRef.current;
      const ok = h && (('treasure' in h && h.treasure) || ('place' in h && h.place !== undefined && isChapterUnlocked(h.place, p.maxWaveReached)));
      canvas.style.cursor = ok ? 'pointer' : 'default';
    };
    canvas.addEventListener('pointerdown', onDown);
    canvas.addEventListener('pointermove', onMove);
    return () => { cancelAnimationFrame(raf); ro.disconnect(); canvas.removeEventListener('pointerdown', onDown); canvas.removeEventListener('pointermove', onMove); };
  }, []);

  return (
    <div ref={wrapRef} id="world-map" className={`w-full h-full flex items-center justify-center ${className}`}>
      <canvas ref={canvasRef} className="rounded-xl border border-slate-800/80 shadow-[0_0_40px_rgba(0,0,0,0.6)] touch-none" aria-label="World map" />
    </div>
  );
};

export default WorldMap;
