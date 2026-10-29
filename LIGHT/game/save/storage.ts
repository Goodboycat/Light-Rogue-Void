// (8A step 2) Write-safety for the save blob. Pure logic over an injected Storage-like object so
// `npm run test:save` can run it in node with a stub. Rules:
//  - writes are debounced 500 ms (many setGameState calls per second during a run → one write)
//  - a flush is forced on pagehide / visibilitychange(hidden) / beforeunload so the last 500 ms are never lost
//  - QuotaExceededError (and every other throw) is caught; on quota we drop the backup copy and retry once,
//    then surface `lastSaveError` for a toast instead of crashing React
//  - before the main key is overwritten, if the stored blob was written on a *different calendar day* than the
//    new one, it is copied to SAVE_BACKUP_KEY first → `light_save_backup` is always "yesterday's save" (or older)
import { SAVE_KEY, SAVE_BACKUP_KEY } from './schema';

export const SAVE_DEBOUNCE_MS = 500;

export interface StorageLike {
    getItem(key: string): string | null;
    setItem(key: string, value: string): void;
    removeItem(key: string): void;
}

export type SaveErrorKind = 'quota' | 'unavailable' | 'unknown';
/** Last write failure (null when the last write succeeded). App.tsx reads it to show a toast once. */
export let lastSaveError: { kind: SaveErrorKind; at: number; message: string } | null = null;
export const clearSaveError = () => { lastSaveError = null; };

/** Browsers disagree on the quota error: name, legacy code 22 (WebKit) / 1014 (Firefox). */
export const isQuotaError = (e: unknown): boolean => {
    if (!e || typeof e !== 'object') return false;
    const err = e as { name?: string; code?: number };
    return err.name === 'QuotaExceededError' || err.name === 'NS_ERROR_DOM_QUOTA_REACHED' || err.code === 22 || err.code === 1014;
};

/** Local-calendar-day comparison (so a 23:59 → 00:01 play session rotates the backup). */
export const isDifferentDay = (aMs: number, bMs: number): boolean => {
    if (!Number.isFinite(aMs) || !Number.isFinite(bMs) || aMs <= 0 || bMs <= 0) return false;
    const a = new Date(aMs), b = new Date(bMs);
    return a.getFullYear() !== b.getFullYear() || a.getMonth() !== b.getMonth() || a.getDate() !== b.getDate();
};

/** Cheap `savedAt` read without a full JSON.parse of a possibly large blob. */
export const peekSavedAt = (raw: string | null): number => {
    if (!raw) return 0;
    const m = /"savedAt"\s*:\s*(\d+)/.exec(raw);
    return m ? Number(m[1]) : 0;
};

export interface WriteResult { ok: boolean; rotatedBackup: boolean; retried: boolean; error?: SaveErrorKind }

/**
 * Synchronous write with backup rotation + quota recovery. `nowMs` is the `savedAt` of the blob being written.
 * Never throws.
 */
export const writeSaveNow = (storage: StorageLike | null, json: string, nowMs: number): WriteResult => {
    const res: WriteResult = { ok: false, rotatedBackup: false, retried: false };
    if (!storage) { res.error = 'unavailable'; lastSaveError = { kind: 'unavailable', at: nowMs, message: 'localStorage unavailable' }; return res; }
    // 1. previous-day backup
    try {
        const prev = storage.getItem(SAVE_KEY);
        const prevAt = peekSavedAt(prev);
        if (prev && isDifferentDay(prevAt, nowMs)) {
            storage.setItem(SAVE_BACKUP_KEY, prev);
            res.rotatedBackup = true;
        }
    } catch (e) {
        // backup rotation failing must never block the main write
        if (!isQuotaError(e)) console.warn('[LIGHT] backup rotation failed', e);
    }
    // 2. main write, retry once after freeing the backup on quota
    try {
        storage.setItem(SAVE_KEY, json);
        res.ok = true;
        lastSaveError = null;
        return res;
    } catch (e) {
        if (isQuotaError(e)) {
            res.retried = true;
            try {
                storage.removeItem(SAVE_BACKUP_KEY);
                storage.setItem(SAVE_KEY, json);
                res.ok = true;
                lastSaveError = null;
                console.warn('[LIGHT] save quota hit — dropped light_save_backup and retried OK');
                return res;
            } catch (e2) {
                res.error = 'quota';
                lastSaveError = { kind: 'quota', at: nowMs, message: String((e2 as Error)?.message ?? e2) };
                console.error('[LIGHT] save failed: storage quota exceeded', e2);
                return res;
            }
        }
        res.error = 'unknown';
        lastSaveError = { kind: 'unknown', at: nowMs, message: String((e as Error)?.message ?? e) };
        console.warn('[LIGHT] save failed (restricted environment? itch iframe / private window):', e);
        return res;
    }
};

/**
 * Debounced writer. `schedule(json, savedAt)` coalesces calls inside SAVE_DEBOUNCE_MS; `flush()` writes the
 * pending blob immediately (used on pagehide). `timers` is injectable for tests.
 */
export const createSaveWriter = (
    storage: StorageLike | null,
    timers: { set: (fn: () => void, ms: number) => any; clear: (h: any) => void } = { set: (fn, ms) => globalThis.setTimeout(fn, ms), clear: (h) => globalThis.clearTimeout(h) }, // (8B) arrow-wrapped: bare setTimeout as a method → "Illegal invocation" in browsers (itch crash),
    debounceMs = SAVE_DEBOUNCE_MS,
) => {
    let pending: { json: string; at: number } | null = null;
    let handle: any = null;
    let writes = 0;
    const flush = (): WriteResult | null => {
        if (handle !== null) { timers.clear(handle); handle = null; }
        if (!pending) return null;
        const p = pending; pending = null;
        writes++;
        return writeSaveNow(storage, p.json, p.at);
    };
    const schedule = (json: string, at: number) => {
        pending = { json, at };
        if (handle !== null) timers.clear(handle);
        handle = timers.set(() => { handle = null; flush(); }, debounceMs);
    };
    /** Drop the pending blob without writing (resetSave). */
    const cancel = () => { if (handle !== null) { timers.clear(handle); handle = null; } pending = null; };
    return { schedule, flush, cancel, get pending() { return pending !== null; }, get writes() { return writes; } };
};

export type SaveWriter = ReturnType<typeof createSaveWriter>;

/** Browser helper: the real localStorage or null when access throws (sandboxed iframe, privacy mode). */
export const getLocalStorage = (): StorageLike | null => {
    try {
        const ls = globalThis.localStorage;
        if (!ls) return null;
        ls.getItem('__light_probe');
        return ls;
    } catch { return null; }
};
