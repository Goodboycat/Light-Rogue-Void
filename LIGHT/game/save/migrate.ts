// (8A) Save migration chain v0 → v1 → v2. Pure functions, no DOM, no React — `npm run test:save` runs them in node.
// v0 = the original game (random tree ids, `settings.inputMode`), v1 = 1B shape (seeded tree ids, no version
// field but every 2A–7D optional field may be present), v2 = `save/schema.ts` (version field, stats block).
import { SAVE_VERSION, SaveV2, LifetimeStats, DEFAULT_SETTINGS, defaultSave, defaultStats } from './schema';
import { CHAPTER_COUNT } from '../components/game/Constants';

/** (1B) Flat refund per unknown node id. The old tree was random per device so we cannot know the real price. */
export const LEGACY_REFUND_PER_NODE = 20;

export interface MigrationReport {
    from: number;             // detected version of the input
    to: number;               // SAVE_VERSION
    droppedNodes: number;     // legacy tree ids removed
    refunded: number;         // matter refunded for them
    steps: string[];          // human-readable log
}

/** Injected so the pure chain does not import data.ts (which pulls the whole tree generator into the test). */
export type NodeExists = (id: string) => boolean;

const isObj = (v: unknown): v is Record<string, any> => !!v && typeof v === 'object' && !Array.isArray(v);
const strArr = (v: unknown): string[] => Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [];
const num = (v: unknown, d: number): number => typeof v === 'number' && Number.isFinite(v) ? v : d;
const numRecord = (v: unknown): Record<string, number> => {
    const out: Record<string, number> = {};
    if (isObj(v)) for (const k in v) if (typeof v[k] === 'number' && Number.isFinite(v[k])) out[k] = v[k];
    return out;
};

/** Which schema produced this blob. v0 and v1 never wrote `version`. */
export const detectVersion = (raw: any): number => {
    if (!isObj(raw)) return 0;
    if (typeof raw.version === 'number') return raw.version;
    if (isObj(raw.settings) && 'inputMode' in raw.settings) return 0;
    return 1;
};

// ---------- v0 → v1 ----------
const migrateV0toV1 = (raw: any, log: string[]): any => {
    const s = isObj(raw.settings) ? { ...raw.settings } : {};
    if (s.inputMode) {
        const mobile = s.inputMode === 'MOBILE';
        s.showTouchControls = mobile;
        s.mouseMovementEnabled = !mobile;
        delete s.inputMode;
        log.push(`v0→v1 settings.inputMode → showTouchControls=${mobile}`);
    }
    return { ...raw, settings: s };
};

// ---------- v1 → v2 ----------
const migrateV1toV2 = (raw: any, nodeExists: NodeExists, report: MigrationReport): SaveV2 => {
    const base = defaultSave();
    // tree ids (1B): drop ids the seeded tree does not know, refund flat
    const rawIds = Array.isArray(raw.unlockedAbilityIds) ? strArr(raw.unlockedAbilityIds) : ['root'];
    const kept = rawIds.filter(nodeExists);
    if (!kept.includes('root')) kept.unshift('root');
    const dropped = rawIds.length - rawIds.filter(nodeExists).length;
    let matter = num(raw.matter, 0);
    if (dropped > 0) {
        const refund = dropped * LEGACY_REFUND_PER_NODE;
        matter += refund;
        report.droppedNodes += dropped; report.refunded += refund;
        report.steps.push(`v1→v2 tree: dropped ${dropped} legacy nodes, refunded ${refund} matter`);
    }
    // settings: whitelist + per-field validation
    const s = isObj(raw.settings) ? raw.settings : {};
    const settings = { ...DEFAULT_SETTINGS };
    for (const k of Object.keys(DEFAULT_SETTINGS) as (keyof typeof DEFAULT_SETTINGS)[]) {
        const v = s[k];
        if (typeof DEFAULT_SETTINGS[k] === 'boolean' && typeof v === 'boolean') (settings as any)[k] = v;
        else if (typeof DEFAULT_SETTINGS[k] === 'number' && typeof v === 'number' && Number.isFinite(v)) (settings as any)[k] = Math.min(1, Math.max(0, v));
    }
    if (['LOW', 'MEDIUM', 'HIGH', 'AUTO'].includes(s.performanceMode)) settings.performanceMode = s.performanceMode;
    if (['OFF', 'LIGHT', 'FULL'].includes(s.haptics)) settings.haptics = s.haptics;

    // stats: v1 had none — seed what can be inferred so Archives are not empty for veterans
    const stats = defaultStats();
    const killCounts = numRecord(raw.killCounts);
    stats.kills = Object.values(killCounts).reduce((a, b) => a + b, 0);
    for (const b of strArr(raw.defeatedBosses)) stats.bossKills[b] = Math.max(1, killCounts[b] ?? 0);
    const maxWave = Math.max(1, Math.floor(num(raw.maxWaveReached, 1)));
    for (let c = 0; c < CHAPTER_COUNT; c++) {
        const first = c * 10 + 1, last = first + 9;
        if (maxWave >= first) stats.bestWaveByChapter[c] = Math.min(maxWave, last);
    }
    stats.discoveries.landmarks = strArr(raw.landmarksSeen).length;
    if (raw.endingSeen) stats.wins = 1;
    report.steps.push(`v1→v2 stats seeded: kills ${stats.kills}, bosses ${Object.keys(stats.bossKills).length}, maxWave ${maxWave}`);

    return {
        ...base,
        savedAt: num(raw.savedAt, 0),
        matter,
        unlockedAbilityIds: kept,
        seenEnemyIds: strArr(raw.seenEnemyIds),
        unlockedAchievementIds: strArr(raw.unlockedAchievementIds),
        defeatedBosses: strArr(raw.defeatedBosses),
        maxWaveReached: maxWave,
        maxMaturityAchieved: Math.max(0, Math.floor(num(raw.maxMaturityAchieved, 0))),
        hasSeenIntro: !!raw.hasSeenIntro,
        endingSeen: !!raw.endingSeen,
        landmarksSeen: strArr(raw.landmarksSeen),
        killCounts,
        mapTreasuresOpened: strArr(raw.mapTreasuresOpened),
        mapRevealsSeen: strArr(raw.mapRevealsSeen),
        stats,
        settings,
    };
};

/** Fill holes in a v2 blob (fields added later as optional) and clamp types. Idempotent. */
const normalizeV2 = (raw: any, nodeExists: NodeExists): SaveV2 => {
    const base = defaultSave();
    const st: Partial<LifetimeStats> = isObj(raw.stats) ? raw.stats : {};
    const ds = defaultStats();
    const stats: LifetimeStats = {
        runs: num(st.runs, 0), deaths: num(st.deaths, 0), wins: num(st.wins, 0), kills: num(st.kills, 0),
        bossKills: numRecord(st.bossKills), deathsByBoss: numRecord(st.deathsByBoss),
        bestWaveByChapter: ds.bestWaveByChapter.map((_, i) => Array.isArray(st.bestWaveByChapter) ? num(st.bestWaveByChapter[i], 0) : 0),
        totalMatter: num(st.totalMatter, 0), totalEssence: num(st.totalEssence, 0),
        discoveries: {
            relics: num(st.discoveries?.relics, 0), shrines: num(st.discoveries?.shrines, 0),
            landmarks: num(st.discoveries?.landmarks, 0), events: num(st.discoveries?.events, 0),
        },
        bestStreak: num(st.bestStreak, 0), burstsFired: num(st.burstsFired, 0), playTimeMs: num(st.playTimeMs, 0),
        feats: isObj(st.feats) ? Object.fromEntries(Object.keys(st.feats).map(k => [k, true as const])) : {},
    };
    const ids = strArr(raw.unlockedAbilityIds).filter(nodeExists);
    if (!ids.includes('root')) ids.unshift('root');
    const s = isObj(raw.settings) ? raw.settings : {};
    const settings = { ...DEFAULT_SETTINGS };
    for (const k of Object.keys(DEFAULT_SETTINGS) as (keyof typeof DEFAULT_SETTINGS)[]) {
        const v = s[k];
        if (typeof DEFAULT_SETTINGS[k] === typeof v && v !== undefined) (settings as any)[k] = v;
    }
    if (!['LOW', 'MEDIUM', 'HIGH', 'AUTO'].includes(settings.performanceMode)) settings.performanceMode = 'AUTO';
    if (!['OFF', 'LIGHT', 'FULL'].includes(settings.haptics)) settings.haptics = 'LIGHT';
    return {
        ...base,
        savedAt: num(raw.savedAt, 0),
        matter: Math.max(0, num(raw.matter, 0)),
        unlockedAbilityIds: ids,
        seenEnemyIds: strArr(raw.seenEnemyIds),
        unlockedAchievementIds: strArr(raw.unlockedAchievementIds),
        defeatedBosses: strArr(raw.defeatedBosses),
        maxWaveReached: Math.max(1, Math.floor(num(raw.maxWaveReached, 1))),
        maxMaturityAchieved: Math.max(0, Math.floor(num(raw.maxMaturityAchieved, 0))),
        hasSeenIntro: !!raw.hasSeenIntro,
        endingSeen: !!raw.endingSeen,
        landmarksSeen: strArr(raw.landmarksSeen),
        killCounts: numRecord(raw.killCounts),
        mapTreasuresOpened: strArr(raw.mapTreasuresOpened),
        mapRevealsSeen: strArr(raw.mapRevealsSeen),
        stats,
        settings,
    };
};

/**
 * Migrate any parsed save blob to the current SaveV2. Never throws on bad input — unknown garbage becomes a
 * default save (the caller decides whether to keep a backup). `nodeExists` validates tree ids.
 */
export const migrateSave = (raw: unknown, nodeExists: NodeExists): { save: SaveV2; report: MigrationReport } => {
    const report: MigrationReport = { from: detectVersion(raw), to: SAVE_VERSION, droppedNodes: 0, refunded: 0, steps: [] };
    if (!isObj(raw)) {
        report.steps.push('input was not an object → default save');
        return { save: defaultSave(), report };
    }
    let cur: any = raw;
    let v = report.from;
    if (v > SAVE_VERSION) { report.steps.push(`save from the future (v${v}) — normalising as v${SAVE_VERSION}`); v = SAVE_VERSION; }
    if (v === 0) { cur = migrateV0toV1(cur, report.steps); v = 1; }
    let out: SaveV2;
    if (v === 1) { out = migrateV1toV2(cur, nodeExists, report); v = 2; }
    else out = normalizeV2(cur, nodeExists);
    return { save: out, report };
};
