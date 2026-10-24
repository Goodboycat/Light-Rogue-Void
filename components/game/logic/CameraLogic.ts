import { MutableGameState } from '../types';
import { Settings } from '../../../types';
import { HIT_FEEDBACK_CONFIG } from '../HitFeedback';

/**
 * Computes base camera zoom for short/narrow viewports so at least ~900x520 world units
 * are visible on screen, with optional user slider override in Settings.
 */
export const computeBaseCameraZoom = (
    canvasWidth: number,
    canvasHeight: number,
    settings?: Settings
): number => {
    const manualZoom = settings?.cameraZoom;
    if (manualZoom && manualZoom >= 0.65 && manualZoom <= 1.15) {
        return manualZoom;
    }

    // Adaptive zoom: ensure at least 920x540 world units are visible on compact viewports
    const minWorldWidth = 920;
    const minWorldHeight = 540;
    const scaleX = canvasWidth / minWorldWidth;
    const scaleY = canvasHeight / minWorldHeight;
    const autoScale = Math.min(1.0, Math.min(scaleX, scaleY));

    // Clamp between 0.68x (e.g. 360px portrait/landscape phone) and 1.0x
    return Math.max(0.68, Math.min(1.0, autoScale));
};

export const updateCamera = (
    state: MutableGameState,
    canvasWidth: number,
    canvasHeight: number,
    settings?: Settings
) => {
    const targetX = state.player.x - canvasWidth / 2;
    const targetY = state.player.y - canvasHeight / 2;
    
    // Smooth camera
    state.camera.x += (targetX - state.camera.x) * 0.1;
    state.camera.y += (targetY - state.camera.y) * 0.1;

    const baseZoom = computeBaseCameraZoom(canvasWidth, canvasHeight, settings ?? state.settings);

    // Camera zoom easing (e.g. 6% zoom-in on boss death then ease back)
    if (state.camera.zoomTimer && state.camera.zoomTimer > 0) {
        state.camera.zoomTimer--;
        const maxTimer = state.camera.maxZoomTimer || 60;
        const progress = state.camera.zoomTimer / maxTimer;
        state.camera.zoom = baseZoom * (1.0 + Math.sin(progress * Math.PI) * 0.06);
    } else {
        state.camera.zoom = baseZoom;
    }

    // Screen shake budget: max amplitude 12 px, decay 0.85/frame, setting "Reduce shake" 0-100%
    if (state.camera.shake && state.camera.shake > 0) {
        const clampedShake = Math.min(HIT_FEEDBACK_CONFIG.maxShakeAmplitude, state.camera.shake);
        const reducePct = Math.max(0, Math.min(100, settings?.reduceShake ?? state.settings?.reduceShake ?? 0));
        const shakeFactor = 1 - reducePct / 100;
        const effectiveAmp = clampedShake * shakeFactor;

        if (effectiveAmp > 0.05) {
            state.camera.x += (Math.random() * 2 - 1) * effectiveAmp;
            state.camera.y += (Math.random() * 2 - 1) * effectiveAmp;
        }

        state.camera.shake = clampedShake * HIT_FEEDBACK_CONFIG.shakeDecayPerFrame;
        if (state.camera.shake < 0.15) state.camera.shake = 0;
    }
};