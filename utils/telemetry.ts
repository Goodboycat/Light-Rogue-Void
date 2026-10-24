// Telemetry module for Light Rogue Void
// Sends anonymous funnel & performance events to backend Endpoint / Google Apps Script

export const TELEMETRY_CONFIG = {
    TELEMETRY_URL: '', // Set endpoint URL here or via environment. Empty string = complete no-op
    BATCH_MS: 15000,
    MAX_QUEUE: 120,
    GAME_VERSION: '1.0.0',
};

let isOptedOutInSettings = false;

export const setTelemetryOptOut = (optOut: boolean) => {
    isOptedOutInSettings = optOut;
};

const getAnonId = (): string => {
    try {
        let id = localStorage.getItem('lrv_anon_id');
        if (!id) {
            id = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `anon_${Math.random().toString(36).substring(2)}${Date.now()}`;
            localStorage.setItem('lrv_anon_id', id);
        }
        return id;
    } catch {
        return 'anon_fallback';
    }
};

const getSessionId = (): string => {
    if (typeof window !== 'undefined' && !(window as any)._lrv_session_id) {
        (window as any)._lrv_session_id = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `sess_${Math.random().toString(36).substring(2)}${Date.now()}`;
    }
    return typeof window !== 'undefined' ? ((window as any)._lrv_session_id || 'sess_fallback') : 'sess_fallback';
};

interface TelemetryEvent {
    ev: string;
    props: Record<string, any>;
    ts: number;
}

let eventQueue: TelemetryEvent[] = [];
let batchTimer: any = null;

export const isTelemetryActive = (): boolean => {
    if (!TELEMETRY_CONFIG.TELEMETRY_URL || TELEMETRY_CONFIG.TELEMETRY_URL.trim() === '') return false;
    if (typeof navigator !== 'undefined' && navigator.doNotTrack === '1') return false;
    if (isOptedOutInSettings) return false;
    return true;
};

export const track = (ev: string, props: Record<string, any> = {}) => {
    try {
        if (!isTelemetryActive()) return;

        const eventItem: TelemetryEvent = {
            ev,
            props,
            ts: Date.now()
        };

        eventQueue.push(eventItem);
        if (eventQueue.length > TELEMETRY_CONFIG.MAX_QUEUE) {
            eventQueue.shift();
        }

        if (!batchTimer) {
            batchTimer = setTimeout(() => {
                flushTelemetry();
            }, TELEMETRY_CONFIG.BATCH_MS);
        }
    } catch (e) {
        // Never throw
    }
};

export const flushTelemetry = () => {
    try {
        if (batchTimer) {
            clearTimeout(batchTimer);
            batchTimer = null;
        }

        if (eventQueue.length === 0 || !isTelemetryActive()) return;

        const eventsToSend = [...eventQueue];
        eventQueue = [];

        const payload = JSON.stringify({
            aid: getAnonId(),
            sid: getSessionId(),
            version: TELEMETRY_CONFIG.GAME_VERSION,
            events: eventsToSend
        });

        let sent = false;
        if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
            const blob = new Blob([payload], { type: 'text/plain;charset=UTF-8' });
            sent = navigator.sendBeacon(TELEMETRY_CONFIG.TELEMETRY_URL, blob);
        }

        if (!sent && typeof fetch !== 'undefined') {
            fetch(TELEMETRY_CONFIG.TELEMETRY_URL, {
                method: 'POST',
                mode: 'no-cors',
                keepalive: true,
                headers: { 'Content-Type': 'text/plain;charset=UTF-8' },
                body: payload
            }).catch(() => {
                // Silent catch
            });
        }
    } catch (e) {
        // Never throw
    }
};

if (typeof window !== 'undefined') {
    window.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden') {
            flushTelemetry();
        }
    });
    window.addEventListener('pagehide', () => {
        flushTelemetry();
    });
}

// Measure median refresh rate over 60 rAF deltas
export const measureRefreshRateHz = (): Promise<number> => {
    return new Promise((resolve) => {
        if (typeof requestAnimationFrame === 'undefined') {
            resolve(60);
            return;
        }
        const deltas: number[] = [];
        let lastTime = performance.now();
        let frames = 0;

        const tick = (now: number) => {
            const dt = now - lastTime;
            lastTime = now;
            if (dt > 0 && dt < 200) {
                deltas.push(dt);
            }
            frames++;
            if (frames < 60) {
                requestAnimationFrame(tick);
            } else {
                if (deltas.length === 0) {
                    resolve(60);
                    return;
                }
                deltas.sort((a, b) => a - b);
                const medianDt = deltas[Math.floor(deltas.length / 2)];
                const hz = Math.round(1000 / medianDt);
                resolve(hz);
            }
        };
        requestAnimationFrame(tick);
    });
};
