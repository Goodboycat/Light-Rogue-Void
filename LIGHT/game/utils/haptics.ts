// (7B) Haptics — navigator.vibrate patterns, gated by Settings.haptics (OFF / LIGHT / FULL).
// Ported from the fork's utils/haptics.ts; patterns tuned for LIGHT (hurt / dash / burst / boss phase / low hp).
// Call `setHapticsMode(settings.haptics)` once per settings change (SurvivalGame loop does it);
// `haptic('hurt')` from the logic — no React, no allocations, safe on desktop (no-op without vibrate).
import { Settings } from '../types';

export type HapticsLevel = 'OFF' | 'LIGHT' | 'FULL';

export const HAPTICS_PATTERNS = {
    hurt: 28,
    dash: 10,
    burst: [40, 30, 70] as number[],
    bossPhase: [60, 40, 60, 40, 120] as number[],
    bossDeath: [30, 30, 30, 30, 160] as number[],
    lowHpPulse: [25, 50, 25] as number[],
    burstReady: 18,
} as const;

export type HapticKind = keyof typeof HAPTICS_PATTERNS;

const MIN_GAP_MS = 60; // never spam the motor (contact damage ticks every frame)

let mode: HapticsLevel = 'FULL';
let lastAt = 0;

export const setHapticsMode = (m?: HapticsLevel) => { mode = m || 'FULL'; };
export const hapticsMode = () => mode;

export const haptic = (kind: HapticKind, settingsOverride?: Settings) => {
    const m = settingsOverride?.haptics || mode;
    if (m === 'OFF') return;
    if (typeof navigator === 'undefined' || typeof navigator.vibrate !== 'function') return;
    const now = Date.now();
    if (now - lastAt < MIN_GAP_MS) return;
    lastAt = now;
    try {
        const raw = HAPTICS_PATTERNS[kind];
        if (m === 'LIGHT') {
            // LIGHT = half length, single pulse
            const base = Array.isArray(raw) ? raw[0] : raw;
            navigator.vibrate(Math.max(6, Math.round(base * 0.5)));
        } else {
            navigator.vibrate(raw as number | number[]);
        }
    } catch { /* some browsers throw without a user gesture — ignore */ }
};
