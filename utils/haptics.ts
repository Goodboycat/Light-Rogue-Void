import { Settings } from '../types';

export type HapticsLevel = 'OFF' | 'LIGHT' | 'FULL';

export const HAPTICS_PATTERNS = {
    hit: 25,
    dash: 12,
    lowHpPulse: [30, 60, 30] as number[],
    bossPhase: 80,
    beamReady: 20,
    lastSpark: 60,
} as const;

let currentHapticsMode: HapticsLevel = 'FULL';

export function setHapticsMode(mode?: HapticsLevel) {
    currentHapticsMode = mode || 'FULL';
}

export function triggerHaptic(
    kind: keyof typeof HAPTICS_PATTERNS,
    settingsOverride?: Settings
) {
    const mode = settingsOverride?.haptics || currentHapticsMode;
    if (mode === 'OFF') return;
    if (typeof navigator === 'undefined' || typeof navigator.vibrate !== 'function') return;

    try {
        const rawPattern = HAPTICS_PATTERNS[kind];
        if (mode === 'LIGHT') {
            if (Array.isArray(rawPattern)) {
                navigator.vibrate(Math.max(8, Math.round(rawPattern[0] * 0.5)));
            } else {
                navigator.vibrate(Math.max(6, Math.round(rawPattern * 0.5)));
            }
        } else {
            navigator.vibrate(rawPattern);
        }
    } catch (e) {
        // Guarded against platforms or browsers where vibrate throws or is unsupported
    }
}
