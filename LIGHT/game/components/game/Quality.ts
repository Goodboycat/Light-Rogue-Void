// (7B) Quality profiles — port of fork components/game/Quality.ts with the caps removed.
// CONVENTIONS rule 9: a profile lowers *detail* (glow, shadow blur, DPR, floaters, particle size/trail),
// NEVER entity/particle counts. The fork's maxParticles/enemyCap were dropped on purpose.
// Auto mode measures average frame ms over 3 s windows and steps down below 28 fps / up above 55 fps,
// with a 10 s hysteresis after every change.
import type { Settings } from '../../types';

export type QualityMode = 'LOW' | 'MEDIUM' | 'HIGH';

export interface QualityProfile {
    mode: QualityMode;
    glow: boolean;          // glow sprites for GLOW particles / enemy auras
    shadowBlur: boolean;    // ctx.shadowBlur allowed at all (LOW: never)
    floaters: boolean;      // damage numbers
    particleDetail: number; // 0.6 / 0.85 / 1 — multiplies particle size + trail length, never count
    dprCap: number;         // 1 / 1.5 / 2
    outlines: boolean;      // enemy outline strokes
}

export const QUALITY_PROFILES: Record<QualityMode, QualityProfile> = {
    LOW:    { mode: 'LOW',    glow: false, shadowBlur: false, floaters: false, particleDetail: 0.6,  dprCap: 1,   outlines: false },
    MEDIUM: { mode: 'MEDIUM', glow: true,  shadowBlur: false, floaters: true,  particleDetail: 0.85, dprCap: 1.5, outlines: true },
    HIGH:   { mode: 'HIGH',   glow: true,  shadowBlur: true,  floaters: true,  particleDetail: 1,    dprCap: 2,   outlines: true },
};

// --- Auto mode constants (goals to measure, not limits to enforce) ---
export const QUALITY_AUTO_WINDOW_MS = 3000;   // measurement window
export const QUALITY_STEP_DOWN_FPS = 28;      // avg fps below this → step down
export const QUALITY_STEP_UP_FPS = 55;        // avg fps above this → step up
export const QUALITY_HYSTERESIS_MS = 10000;   // no second change within 10 s

const ORDER: QualityMode[] = ['LOW', 'MEDIUM', 'HIGH'];
export const stepDown = (m: QualityMode): QualityMode => ORDER[Math.max(0, ORDER.indexOf(m) - 1)];
export const stepUp = (m: QualityMode): QualityMode => ORDER[Math.min(ORDER.length - 1, ORDER.indexOf(m) + 1)];

/** The profile every renderer reads this frame. Module-level singleton (same pattern as Feel.ts `feel`). */
export let quality: QualityProfile = QUALITY_PROFILES.MEDIUM;
export const setQualityMode = (m: QualityMode) => { quality = QUALITY_PROFILES[m] ?? QUALITY_PROFILES.MEDIUM; };

// --- Auto controller state ---
let autoMode: QualityMode = 'MEDIUM';
let winStart = 0, winFrames = 0, winMs = 0, lastChange = 0, lastFrame = 0;
let lastAvgMs = 0;
let firstFrame = 0;
const QUALITY_WARMUP_MS = 4000;

export const resetQualityAuto = (start: QualityMode = 'MEDIUM') => {
    autoMode = start; firstFrame = 0; winStart = 0; winFrames = 0; winMs = 0; lastChange = 0; lastFrame = 0; lastAvgMs = 0;
};

/** Last completed window's average frame ms (0 until the first window closes). For HUD/debug/HANDOFF numbers. */
export const qualityAvgFrameMs = () => lastAvgMs;
export const qualityAutoMode = () => autoMode;

/**
 * Call once per rendered frame with performance.now(). Returns the effective mode for this frame.
 * `settingMode` 'AUTO' → the controller decides; otherwise the user's fixed choice is applied verbatim.
 */
export const tickQuality = (now: number, settingMode: QualityMode | 'AUTO'): QualityMode => {
    if (settingMode !== 'AUTO') { setQualityMode(settingMode); lastFrame = now; return settingMode; }
    if (lastFrame > 0) {
        const dt = now - lastFrame;
        if (dt > 0 && dt < 250) { winFrames++; winMs += dt; } // ignore tab-switch / pause gaps
    }
    lastFrame = now;
    // (10 fix) ignore the first 4 s (asset decode / JIT warm-up) so a load hitch never drops a run to LOW
    if (firstFrame === 0) firstFrame = now;
    if (now - firstFrame < QUALITY_WARMUP_MS) { winFrames = 0; winMs = 0; setQualityMode(autoMode); return autoMode; }
    if (winStart === 0) winStart = now;
    if (now - winStart >= QUALITY_AUTO_WINDOW_MS && winFrames > 10) {
        const avg = winMs / winFrames;
        lastAvgMs = avg;
        const fps = 1000 / avg;
        if (now - lastChange >= QUALITY_HYSTERESIS_MS) {
            if (fps < QUALITY_STEP_DOWN_FPS && autoMode !== 'LOW') { autoMode = stepDown(autoMode); lastChange = now; }
            else if (fps > QUALITY_STEP_UP_FPS && autoMode !== 'HIGH') { autoMode = stepUp(autoMode); lastChange = now; }
        }
        winStart = now; winFrames = 0; winMs = 0;
    }
    setQualityMode(autoMode);
    return autoMode;
};

/** Resolve the Settings field (old saves have 'LOW'|'MEDIUM'|'HIGH'; 7B adds 'AUTO'). */
export const qualitySetting = (s: Settings | undefined): QualityMode | 'AUTO' =>
    (s?.performanceMode as QualityMode | 'AUTO' | undefined) ?? 'AUTO';

/**
 * Gate every `ctx.shadowBlur = n` in the renderer tree behind the profile (LOW → always 0) without touching
 * the ~50 call sites: an own accessor on the context instance shadows the prototype one. Call once per ctx.
 */
export const installQualityCtx = (ctx: CanvasRenderingContext2D) => {
    if ((ctx as any).__lightQuality) return;
    const proto = Object.getPrototypeOf(ctx);
    const desc = Object.getOwnPropertyDescriptor(proto, 'shadowBlur');
    if (!desc?.set || !desc.get) return;
    const get = desc.get, set = desc.set;
    Object.defineProperty(ctx, 'shadowBlur', {
        configurable: true,
        get() { return get.call(ctx); },
        set(v: number) { set.call(ctx, quality.shadowBlur ? v : 0); },
    });
    (ctx as any).__lightQuality = true;
};

/**
 * Size the canvas backing store to the viewport × min(devicePixelRatio, profile dprCap).
 * Returns the CSS-pixel size the renderer should use (the ctx is scaled by dpr so all drawing stays in CSS px).
 */
export const fitCanvas = (canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D): { w: number; h: number; dpr: number } => {
    const w = window.innerWidth, h = window.innerHeight;
    const dpr = Math.min(window.devicePixelRatio || 1, quality.dprCap);
    const bw = Math.round(w * dpr), bh = Math.round(h * dpr);
    if (canvas.width !== bw || canvas.height !== bh) {
        canvas.width = bw; canvas.height = bh;
        canvas.style.width = w + 'px'; canvas.style.height = h + 'px';
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return { w, h, dpr };
};
