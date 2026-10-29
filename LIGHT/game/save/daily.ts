// (9A) Daily Void + Endless records + share codes. Kept OUT of the v2 save blob on purpose
// (own localStorage key, tolerant parse) so the 8A save tests/migrations stay untouched.
import { hashString, mulberry32 } from '../utils/rng';

const KEY = 'light_daily_v1';
export interface DailyEntry { date: string; wave: number; }
export interface DailyStore { best: Record<string, number>; history: DailyEntry[]; streak: number; lastDate: string; endlessBest: number; }
const empty = (): DailyStore => ({ best: {}, history: [], streak: 0, lastDate: '', endlessBest: 0 });

/** UTC date `YYYY-MM-DD` (same day for every player on Earth). */
export const todayKey = (d: Date = new Date()): string => d.toISOString().slice(0, 10);
/** Daily seed = FNV-1a of the date. Identical across browsers/devices. */
export const dailySeed = (date: string = todayKey()): number => hashString('LIGHT-daily-' + date);

export const loadDaily = (): DailyStore => {
  try { const r = JSON.parse(localStorage.getItem(KEY) || 'null'); if (!r || typeof r !== 'object') return empty();
    const e = empty();
    return { best: r.best && typeof r.best === 'object' ? r.best : e.best, history: Array.isArray(r.history) ? r.history.slice(0, 30) : e.history,
      streak: Number(r.streak) || 0, lastDate: typeof r.lastDate === 'string' ? r.lastDate : '', endlessBest: Number(r.endlessBest) || 0 };
  } catch { return empty(); }
};
const saveDaily = (s: DailyStore) => { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch { /* private mode */ } };

const prevDay = (date: string) => todayKey(new Date(Date.parse(date + 'T00:00:00Z') - 86400000));

/** Record a finished Daily Void run. Streak = consecutive UTC days with ≥ 1 daily run. History keeps the last 30 days (best per day). */
export const recordDaily = (wave: number, date: string = todayKey()): DailyStore => {
  const s = loadDaily();
  s.best[date] = Math.max(s.best[date] || 0, wave);
  if (s.lastDate !== date) { s.streak = s.lastDate === prevDay(date) ? s.streak + 1 : 1; s.lastDate = date; }
  s.history = [{ date, wave: s.best[date] }, ...s.history.filter(h => h.date !== date)].slice(0, 30);
  const keep = new Set(s.history.map(h => h.date)); for (const k of Object.keys(s.best)) if (!keep.has(k)) delete s.best[k];
  saveDaily(s); return s;
};
export const recordEndless = (wave: number): DailyStore => { const s = loadDaily(); if (wave > s.endlessBest) { s.endlessBest = wave; saveDaily(s); } return s; };

// ---- active run seed override (read by WorldLogic.resolveRunSeed) + seeded Math.random for daily runs
let activeDaily: string | null = null;
const nativeRandom = Math.random;
export const getActiveDaily = () => activeDaily;
export const getSeedOverride = (): number | null => (activeDaily ? dailySeed(activeDaily) : null);
/** Start (date) or end (null) a Daily Void. While active, Math.random is a mulberry32 stream of the daily seed,
 *  so special waves, affix rolls and spawns start identical for everyone (player input still diverges them). */
export const setActiveDaily = (date: string | null) => {
  activeDaily = date;
  Math.random = date ? mulberry32(dailySeed(date) ^ 0x9e3779b9) : nativeRandom;
};

// ---- share codes: LIGHT-<YYYYMMDD>-<wave>-<crc4>   (no server; crc stops casual typos/edits)
const crc = (s: string) => (hashString('LIGHT-share|' + s) % 0xffff).toString(16).toUpperCase().padStart(4, '0');
export const makeShareCode = (date: string, wave: number): string => { const d = date.replace(/-/g, ''); return `LIGHT-${d}-${wave}-${crc(d + '|' + wave)}`; };
export interface ShareInfo { ok: boolean; date?: string; wave?: number; reason?: string; }
export const verifyShareCode = (code: string): ShareInfo => {
  const m = /^LIGHT-(\d{8})-(\d{1,4})-([0-9A-F]{4})$/i.exec(code.trim());
  if (!m) return { ok: false, reason: 'Not a LIGHT share code.' };
  const [, d, w, c] = m; if (crc(d + '|' + w) !== c.toUpperCase()) return { ok: false, reason: 'Checksum mismatch (typo or edited).' };
  return { ok: true, date: `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}`, wave: +w };
};
