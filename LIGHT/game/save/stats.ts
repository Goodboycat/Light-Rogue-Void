// (8A step 4) Lifetime run stats — pure merge helpers over save/schema LifetimeStats.
// Nothing here touches React or the sim: SurvivalGame builds a RunEndReport, App.tsx calls these reducers.
import { LifetimeStats, defaultStats } from './schema';
import { CHAPTER_COUNT, WAVES_PER_CHAPTER, chapterIndexOf } from '../components/game/Constants';

export type RunOutcome = 'death' | 'win' | 'abandon';

/** Everything one finished run contributes. Built once by SurvivalGame.buildRunEnd(). */
export interface RunEndReport {
    outcome: RunOutcome;
    startWave: number;
    wave: number;            // furthest wave reached in this run
    kills: number;
    eliteKills: number;
    bossKills: number;
    essence: number;
    matter: number;          // banked this run
    relics: number;
    shrines: number;
    landmarks: number;
    events: number;          // found events (Golden Mite, Essence Tide, ...)
    bestStreak: number;
    burstsFired: number;
    timeMs: number;
    /** boss id that landed the killing blow (death hint) — undefined when no boss was alive */
    deathBossId?: string;
    /** boss-mechanic feats earned this run (`<bossId>:<feat>`), see FEATS in logic/BossFeats.ts */
    feats: string[];
}

/** Normalise a possibly-partial stats object (old saves, imports) to a full LifetimeStats. */
export const ensureStats = (s?: Partial<LifetimeStats> | null): LifetimeStats => {
    const d = defaultStats();
    if (!s) return d;
    const best = Array.isArray(s.bestWaveByChapter) ? s.bestWaveByChapter.slice(0, CHAPTER_COUNT) : [];
    while (best.length < CHAPTER_COUNT) best.push(0);
    return {
        ...d, ...s,
        bossKills: { ...(s.bossKills ?? {}) },
        deathsByBoss: { ...(s.deathsByBoss ?? {}) },
        discoveries: { ...d.discoveries, ...(s.discoveries ?? {}) },
        feats: { ...(s.feats ?? {}) },
        bestWaveByChapter: best.map(n => (Number.isFinite(n) ? Math.max(0, Math.floor(n)) : 0)),
    };
};

/** A run started (menu START / RETRY). */
export const recordRunStart = (s: LifetimeStats | undefined): LifetimeStats => {
    const st = ensureStats(s);
    return { ...st, runs: st.runs + 1 };
};

/** A boss died — counted immediately so a tab close after the kill still keeps it. */
export const recordBossKill = (s: LifetimeStats | undefined, bossId: string, feats: string[] = []): LifetimeStats => {
    const st = ensureStats(s);
    const bossKills = { ...st.bossKills, [bossId]: (st.bossKills[bossId] ?? 0) + 1 };
    const f = { ...st.feats };
    for (const id of feats) f[id] = true;
    return { ...st, bossKills, feats: f };
};

/** Matter banked (essence → matter at pickup). Spending never reduces totalMatter. */
export const recordMatter = (s: LifetimeStats | undefined, matter: number): LifetimeStats => {
    const st = ensureStats(s);
    return { ...st, totalMatter: st.totalMatter + Math.max(0, matter) };
};

/**
 * Best wave per chapter: every chapter the run passed through from its start chapter to the furthest wave.
 * A run that started at chapter 3 never credits chapters 1–2.
 */
export const mergeBestWaves = (best: number[], startWave: number, wave: number): number[] => {
    const out = best.slice();
    const c0 = Math.max(1, chapterIndexOf(Math.max(1, startWave)));
    const c1 = Math.max(c0, chapterIndexOf(Math.max(1, wave)));
    for (let c = c0; c <= c1 && c <= CHAPTER_COUNT; c++) {
        const chapterLast = c * WAVES_PER_CHAPTER;
        const reached = c < c1 ? chapterLast : Math.min(wave, chapterLast);
        out[c - 1] = Math.max(out[c - 1] ?? 0, reached);
    }
    return out;
};

/** The run ended (death / win / abandon) — merge the report. Boss kills + matter are NOT re-added here. */
export const recordRunEnd = (s: LifetimeStats | undefined, r: RunEndReport): LifetimeStats => {
    const st = ensureStats(s);
    const deathsByBoss = { ...st.deathsByBoss };
    if (r.outcome === 'death' && r.deathBossId) deathsByBoss[r.deathBossId] = (deathsByBoss[r.deathBossId] ?? 0) + 1;
    const feats = { ...st.feats };
    for (const id of r.feats ?? []) feats[id] = true;
    return {
        ...st,
        deaths: st.deaths + (r.outcome === 'death' ? 1 : 0),
        wins: st.wins + (r.outcome === 'win' ? 1 : 0),
        kills: st.kills + Math.max(0, r.kills),
        deathsByBoss,
        bestWaveByChapter: mergeBestWaves(st.bestWaveByChapter, r.startWave, r.wave),
        totalEssence: st.totalEssence + Math.max(0, r.essence),
        discoveries: {
            relics: st.discoveries.relics + r.relics,
            shrines: st.discoveries.shrines + r.shrines,
            landmarks: st.discoveries.landmarks + r.landmarks,
            events: st.discoveries.events + r.events,
        },
        bestStreak: Math.max(st.bestStreak, r.bestStreak),
        burstsFired: st.burstsFired + r.burstsFired,
        playTimeMs: st.playTimeMs + Math.max(0, r.timeMs),
        feats,
    };
};

/** Total discoveries (for the Archives header + achievements). */
export const totalDiscoveries = (s: LifetimeStats): number =>
    s.discoveries.relics + s.discoveries.shrines + s.discoveries.landmarks + s.discoveries.events;

export const fmtPlayTime = (ms: number): string => {
    const s = Math.max(0, Math.floor(ms / 1000));
    const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60);
    return h > 0 ? `${h}h ${m.toString().padStart(2, '0')}m` : `${m}m ${(s % 60).toString().padStart(2, '0')}s`;
};
