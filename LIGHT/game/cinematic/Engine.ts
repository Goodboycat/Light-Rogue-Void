// (M0) CINEMATIC ENGINE — a film pipeline, not gameplay. docs/MOVIE.md §1–§2 are the law.
// Everything here is `state = f(t)`: deterministic, scrubbable, allocation-free in render.
// Design space: 1920×1080 with the ORIGIN AT THE CENTRE (x −960…960, y −540…540), "cover"-fitted to the canvas.
// A scene is a list of layers; every layer has keyframe tracks (x, y, scale, rot, alpha, tint, blur) and a
// draw callback. A camera (x, y, zoom, rot, focus, shake) drives every layer through its `parallax` factor.
// Post stack runs once per frame: scene → chromatic aberration → grain → vignette → letterbox → flash → fade.

import type { SfxId, MusicId } from '../audio/sfxIds';

// ---------------------------------------------------------------- easing
export type Ease = (t: number) => number;
export const linear: Ease = t => t;
export const easeIn: Ease = t => t * t * t;
export const easeOut: Ease = t => 1 - Math.pow(1 - t, 3);
export const easeInOut: Ease = t => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
export const easeOutExpo: Ease = t => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t));
export const easeInExpo: Ease = t => (t <= 0 ? 0 : Math.pow(2, 10 * t - 10));
export const easeOutQuint: Ease = t => 1 - Math.pow(1 - t, 5);
export const easeInQuint: Ease = t => t * t * t * t * t;
/** Overshoot (back-out). */
export const overshoot: Ease = t => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); };
/** Harder overshoot for title hits. */
export const slam: Ease = t => { const c1 = 3.2, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); };
/** Elastic settle. */
export const elastic: Ease = t => (t <= 0 ? 0 : t >= 1 ? 1 : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * (2 * Math.PI) / 3) + 1);
/** Instant step at the keyframe (hard cuts). */
export const step: Ease = t => (t >= 1 ? 1 : 0);

// ---------------------------------------------------------------- deterministic noise
/** Integer hash → [0,1). Same input, same output, forever. */
export const hash = (i: number, salt = 0): number => {
  let h = (i * 374761393 + salt * 668265263) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h = (h ^ (h >>> 16)) >>> 0;
  return h / 4294967296;
};
/** Smooth 1-D value noise in [−1,1], period-free, cheap (3 sines, no tables). */
export const wobble = (t: number, seed = 0): number =>
  (Math.sin(t * 1.0 + seed * 7.1) * 0.5 + Math.sin(t * 2.3 + seed * 3.3) * 0.3 + Math.sin(t * 4.7 + seed * 1.7) * 0.2);
export const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
/** Map t from [a,b] to [0,1] clamped. */
export const span = (t: number, a: number, b: number) => clamp01((t - a) / (b - a));

// ---------------------------------------------------------------- tracks
export interface Key { t: number; v: number; e?: Ease }
export class Track {
  keys: Key[];
  constructor(keys: Key[] | number) { this.keys = typeof keys === 'number' ? [{ t: 0, v: keys }] : keys; }
  at(t: number): number {
    const k = this.keys; const n = k.length;
    if (n === 0) return 0;
    if (t <= k[0].t) return k[0].v;
    if (t >= k[n - 1].t) return k[n - 1].v;
    let i = 1; while (i < n && k[i].t < t) i++;
    const a = k[i - 1], b = k[i];
    const u = (t - a.t) / (b.t - a.t);
    return a.v + (b.v - a.v) * (b.e ?? easeInOut)(u);
  }
}
/** Shorthand: `K(0,0, 1,1,easeOut, 2,0)` → Track. Every triple (t, v, ease?) — ease optional per key. */
export const K = (...args: (number | Ease)[]): Track => {
  const keys: Key[] = [];
  for (let i = 0; i < args.length;) {
    const t = args[i++] as number; const v = args[i++] as number;
    let e: Ease | undefined; if (typeof args[i] === 'function') e = args[i++] as Ease;
    keys.push({ t, v, e });
  }
  return new Track(keys);
};

// ---------------------------------------------------------------- camera
export interface Shake { t: number; amp: number; freq?: number; decay?: number; dur?: number }
export interface CameraDef {
  x?: Track; y?: Track; zoom?: Track; rot?: Track;
  /** depth in focus (layers with `depth` blur by |depth − focus| × blurK). */
  focus?: Track;
  shakes?: Shake[];
}
export interface CameraState { x: number; y: number; zoom: number; rot: number; focus: number; sx: number; sy: number; srot: number }

// ---------------------------------------------------------------- layers
export interface LayerState { x: number; y: number; scale: number; rot: number; alpha: number; tint: number; blur: number; t: number; lt: number }
export interface Gfx {
  ctx: CanvasRenderingContext2D;
  /** design→canvas scale (cover fit), canvas size in px, DPR already in the transform */
  S: number; W: number; H: number; dpr: number;
  cam: CameraState; t: number; frame: number;
  /** design-space visible half extents (after cover fit, before camera) */
  hw: number; hh: number;
}
export interface LayerDef {
  id: string;
  /** 0 = screen-locked UI, 1 = full camera, >1 = foreground parallax */
  parallax?: number;
  /** depth for rack focus (camera.focus); undefined = never blurred */
  depth?: number;
  blend?: GlobalCompositeOperation;
  /** visible window [from, to) in seconds — outside, the layer is skipped entirely */
  from?: number; to?: number;
  x?: Track; y?: Track; scale?: Track; rot?: Track; alpha?: Track; tint?: Track; blur?: Track;
  draw: (g: Gfx, L: LayerState) => void;
}

// ---------------------------------------------------------------- post + cues
export interface PostDef {
  letterbox?: Track;   // 0…0.5 fraction of height per bar
  vignette?: Track;    // 0…1
  grain?: Track;       // 0…1
  aberration?: Track;  // px in design space
  flash?: Track;       // 0…1 white
  invert?: Track;      // 0…1 inverted flash frame
  fade?: Track;        // 0…1 black
  /** warm←→cold colour wash: −1 violet, 0 none, +1 amber */
  wash?: Track;
}
export interface Cue { t: number; sfx?: SfxId; vol?: number; music?: MusicId | null; duck?: number; duckMs?: number }
export interface Shot { n: number; from: number; to: number; what: string }

export interface SceneDef {
  id: string;
  duration: number;
  loop?: boolean;
  /** when the player may skip (s); default 0.6 */
  skipAfter?: number;
  /** background painter in design space (before layers). Default: black. */
  bg?: (g: Gfx) => void;
  camera?: CameraDef;
  layers: LayerDef[];
  post?: PostDef;
  cues?: Cue[];
  /** storyboard summary, one line per shot (also printed by ?cinematic=) */
  shots: Shot[];
}

// ---------------------------------------------------------------- audio sink (injected, keeps engine pure)
export interface AudioSink { sfx(id: SfxId, vol?: number): void; music(id: MusicId | null): void; duck(amount: number, ms: number): void }

// ---------------------------------------------------------------- post sprites (lazy, cached per size)
let grainTiles: HTMLCanvasElement[] | null = null;
let grainPatterns: CanvasPattern[] | null = null;
const GRAIN = 192;
function ensureGrain(ctx: CanvasRenderingContext2D) {
  if (grainTiles) return;
  grainTiles = []; grainPatterns = [];
  for (let n = 0; n < 6; n++) {
    const c = document.createElement('canvas'); c.width = GRAIN; c.height = GRAIN;
    const x = c.getContext('2d')!; const img = x.createImageData(GRAIN, GRAIN); const d = img.data;
    for (let i = 0; i < d.length; i += 4) { const v = 96 + hash(i >> 2, n + 11) * 128; d[i] = d[i + 1] = d[i + 2] = v; d[i + 3] = 255; }
    x.putImageData(img, 0, 0); grainTiles.push(c); grainPatterns.push(ctx.createPattern(c, 'repeat')!);
  }
}
let vignetteCv: HTMLCanvasElement | null = null;
function ensureVignette() {
  if (vignetteCv) return vignetteCv;
  const c = document.createElement('canvas'); c.width = 512; c.height = 288; const x = c.getContext('2d')!;
  const g = x.createRadialGradient(256, 144, 60, 256, 144, 330);
  g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(0.55, 'rgba(0,0,0,0.18)'); g.addColorStop(1, 'rgba(0,0,0,0.96)');
  x.fillStyle = g; x.fillRect(0, 0, 512, 288); vignetteCv = c; return c;
}

// ---------------------------------------------------------------- player
export class CinematicPlayer {
  readonly scene: SceneDef;
  t = 0; frame = 0; playing = true; done = false; skipping = false;
  private skipT = -1;
  private fired = 0;
  private cues: Cue[];
  private L: LayerState = { x: 0, y: 0, scale: 1, rot: 0, alpha: 1, tint: 0, blur: 0, t: 0, lt: 0 };
  private cam: CameraState = { x: 0, y: 0, zoom: 1, rot: 0, focus: 0, sx: 0, sy: 0, srot: 0 };
  private sceneCv: HTMLCanvasElement | null = null;
  private chanCv: HTMLCanvasElement[] = [];
  onDone: (() => void) | null = null;
  constructor(scene: SceneDef, public audio: AudioSink | null, startT = 0) {
    this.scene = scene; this.t = startT;
    this.cues = (scene.cues ?? []).slice().sort((a, b) => a.t - b.t);
    while (this.fired < this.cues.length && this.cues[this.fired].t < startT) this.fired++;
  }
  get duration() { return this.scene.duration; }
  /** Advance by dt seconds (call from rAF). Fires audio cues crossed. */
  advance(dt: number) {
    if (!this.playing || this.done) return;
    if (this.skipping) { this.skipT += dt; if (this.skipT >= 0.35) this.finish(); return; }
    this.t += dt;
    if (this.t >= this.scene.duration) {
      if (this.scene.loop) { this.t -= this.scene.duration; this.fired = 0; }
      else { this.t = this.scene.duration; this.finish(); return; }
    }
    this.fireCues();
  }
  /** Jump to time (scrub). Cues at/after the new time re-arm; none fire for the jump itself. */
  seek(t: number) {
    this.t = Math.max(0, Math.min(this.scene.duration, t));
    this.fired = 0; while (this.fired < this.cues.length && this.cues[this.fired].t <= this.t) this.fired++;
  }
  private fireCues() {
    const a = this.audio;
    while (this.fired < this.cues.length && this.cues[this.fired].t <= this.t) {
      const c = this.cues[this.fired++]; if (!a) continue;
      if (c.sfx) a.sfx(c.sfx, c.vol);
      if (c.music !== undefined) a.music(c.music);
      if (c.duck !== undefined) a.duck(c.duck, c.duckMs ?? 600);
    }
  }
  /** Tap / any key. Starts a 0.35 s fade; remaining cues are dropped. */
  skip() {
    if (this.done || this.skipping) return;
    if (this.t < (this.scene.skipAfter ?? 0.6)) return;
    this.skipping = true; this.skipT = 0; this.fired = this.cues.length;
  }
  private finish() { if (this.done) return; this.done = true; this.playing = false; this.onDone?.(); }

  // ------------------------------------------------------------ render
  /** Draw the frame for the current `t` into `ctx` (canvas W×H px, dpr folded into W/H). */
  render(ctx: CanvasRenderingContext2D, W: number, H: number, dpr: number) {
    const sc = this.scene; const t = this.t; this.frame++;
    // cover fit 1920×1080 → W×H
    const S = Math.max(W / 1920, H / 1080);
    const hw = W / S / 2, hh = H / S / 2;
    // camera
    const cd = sc.camera; const cam = this.cam;
    cam.x = cd?.x ? cd.x.at(t) : 0; cam.y = cd?.y ? cd.y.at(t) : 0;
    cam.zoom = cd?.zoom ? cd.zoom.at(t) : 1; cam.rot = cd?.rot ? cd.rot.at(t) : 0; cam.focus = cd?.focus ? cd.focus.at(t) : 0;
    cam.sx = cam.sy = cam.srot = 0;
    if (cd?.shakes) for (let i = 0; i < cd.shakes.length; i++) {
      const s = cd.shakes[i]; const dt = t - s.t; if (dt < 0 || (s.dur !== undefined && dt > s.dur)) continue;
      const env = s.amp * Math.exp(-(s.decay ?? 3) * dt); const f = s.freq ?? 28;
      cam.sx += env * wobble(dt * f, 1 + i); cam.sy += env * wobble(dt * f, 7 + i); cam.srot += env * 0.0008 * wobble(dt * f * 0.7, 13 + i);
    }
    // scene canvas (post reads it)
    if (!this.sceneCv) this.sceneCv = document.createElement('canvas');
    const scv = this.sceneCv; if (scv.width !== W || scv.height !== H) { scv.width = W; scv.height = H; }
    const sx = scv.getContext('2d')!;
    const g: Gfx = { ctx: sx, S, W, H, dpr, cam, t, frame: this.frame, hw, hh };
    sx.setTransform(1, 0, 0, 1, 0, 0); sx.globalCompositeOperation = 'source-over'; sx.globalAlpha = 1; sx.filter = 'none';
    sx.fillStyle = '#000'; sx.fillRect(0, 0, W, H);
    // background (design space, camera-less)
    sx.setTransform(S, 0, 0, S, W / 2, H / 2);
    if (sc.bg) sc.bg(g);
    // layers
    const L = this.L;
    for (let i = 0; i < sc.layers.length; i++) {
      const ld = sc.layers[i];
      if (ld.from !== undefined && t < ld.from) continue;
      if (ld.to !== undefined && t >= ld.to) continue;
      L.alpha = ld.alpha ? ld.alpha.at(t) : 1; if (L.alpha <= 0.001) continue;
      L.x = ld.x ? ld.x.at(t) : 0; L.y = ld.y ? ld.y.at(t) : 0; L.scale = ld.scale ? ld.scale.at(t) : 1;
      L.rot = ld.rot ? ld.rot.at(t) : 0; L.tint = ld.tint ? ld.tint.at(t) : 0; L.t = t; L.lt = t - (ld.from ?? 0);
      let blur = ld.blur ? ld.blur.at(t) : 0;
      if (ld.depth !== undefined) blur += Math.abs(ld.depth - cam.focus) * 6;
      L.blur = blur;
      const p = ld.parallax ?? 1;
      const z = 1 + (cam.zoom - 1) * p;
      const cx = -(cam.x + cam.sx) * p, cy = -(cam.y + cam.sy) * p, cr = (cam.rot + cam.srot) * p;
      sx.setTransform(S, 0, 0, S, W / 2, H / 2);
      sx.rotate(cr); sx.scale(z, z); sx.translate(cx, cy);
      sx.translate(L.x, L.y); sx.rotate(L.rot); sx.scale(L.scale, L.scale);
      sx.globalAlpha = Math.min(1, L.alpha); sx.globalCompositeOperation = ld.blend ?? 'source-over';
      sx.filter = blur > 0.4 ? `blur(${(blur * S).toFixed(1)}px)` : 'none';
      ld.draw(g, L);
    }
    sx.filter = 'none'; sx.globalAlpha = 1; sx.globalCompositeOperation = 'source-over';
    // ---------------- post
    const P = sc.post;
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; ctx.filter = 'none';
    const ab = P?.aberration ? P.aberration.at(t) * S : 0;
    if (ab > 0.6) {
      // 3 channel-masked copies, offset along x (R left, B right) + slight y on G, added together
      for (let c = 0; c < 3; c++) {
        if (!this.chanCv[c]) this.chanCv[c] = document.createElement('canvas');
        const cv = this.chanCv[c]; if (cv.width !== W || cv.height !== H) { cv.width = W; cv.height = H; }
        const x = cv.getContext('2d')!; x.setTransform(1, 0, 0, 1, 0, 0); x.globalCompositeOperation = 'source-over';
        const dx = c === 0 ? -ab : c === 2 ? ab : 0, dy = c === 1 ? ab * 0.35 : 0;
        x.fillStyle = '#000'; x.fillRect(0, 0, W, H); x.drawImage(scv, dx, dy);
        x.globalCompositeOperation = 'multiply'; x.fillStyle = c === 0 ? '#f00' : c === 1 ? '#0f0' : '#00f'; x.fillRect(0, 0, W, H);
      }
      ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H); ctx.globalCompositeOperation = 'lighter';
      for (let c = 0; c < 3; c++) ctx.drawImage(this.chanCv[c], 0, 0);
      ctx.globalCompositeOperation = 'source-over';
    } else ctx.drawImage(scv, 0, 0);
    // colour wash
    const wash = P?.wash ? P.wash.at(t) : 0;
    if (Math.abs(wash) > 0.01) {
      ctx.globalCompositeOperation = wash > 0 ? 'soft-light' : 'multiply';
      ctx.fillStyle = wash > 0 ? `rgba(253,230,138,${(wash * 0.55).toFixed(3)})` : `rgba(140,120,220,${(-wash * 0.5).toFixed(3)})`;
      ctx.fillRect(0, 0, W, H); ctx.globalCompositeOperation = 'source-over';
    }
    // grain (tile cycles per frame, deterministic by t)
    const grain = P?.grain ? P.grain.at(t) : 0;
    if (grain > 0.005) {
      ensureGrain(ctx); const n = Math.floor(t * 24) % 6; const ox = Math.floor(hash(n, 5) * GRAIN), oy = Math.floor(hash(n, 9) * GRAIN);
      ctx.globalCompositeOperation = 'overlay'; ctx.globalAlpha = Math.min(1, grain);
      ctx.translate(ox, oy); ctx.fillStyle = grainPatterns![n]; ctx.fillRect(-ox, -oy, W + GRAIN, H + GRAIN);
      ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    }
    // vignette
    const vig = P?.vignette ? P.vignette.at(t) : 0;
    if (vig > 0.005) { ctx.globalAlpha = Math.min(1, vig); ctx.drawImage(ensureVignette(), 0, 0, W, H); ctx.globalAlpha = 1; }
    // letterbox
    const lb = P?.letterbox ? P.letterbox.at(t) : 0;
    if (lb > 0.001) { const b = Math.round(H * lb); ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, b); ctx.fillRect(0, H - b, W, b); }
    // flash / invert / fade
    const inv = P?.invert ? P.invert.at(t) : 0;
    if (inv > 0.01) { ctx.globalCompositeOperation = 'difference'; ctx.fillStyle = `rgba(255,255,255,${inv.toFixed(3)})`; ctx.fillRect(0, 0, W, H); ctx.globalCompositeOperation = 'source-over'; }
    const fl = P?.flash ? P.flash.at(t) : 0;
    if (fl > 0.005) { ctx.fillStyle = `rgba(255,250,240,${Math.min(1, fl).toFixed(3)})`; ctx.fillRect(0, 0, W, H); }
    let fade = P?.fade ? P.fade.at(t) : 0;
    if (this.skipping) fade = Math.max(fade, clamp01(this.skipT / 0.3));
    if (fade > 0.005) { ctx.fillStyle = `rgba(0,0,0,${Math.min(1, fade).toFixed(3)})`; ctx.fillRect(0, 0, W, H); }
  }
}

/** DPR policy (MOVIE.md §2). */
export const cinematicDpr = () => {
  const d = typeof devicePixelRatio === 'number' ? devicePixelRatio : 1;
  return Math.min(d, typeof innerWidth === 'number' && innerWidth < 900 ? 1.5 : 2);
};
