// (8A) Save schema v2 — the single source of truth for what is persisted.
// Rules: every field has a default here; new fields are added as optional + default (CONVENTIONS rule 7);
// a *shape* change bumps SAVE_VERSION and adds a step in save/migrate.ts. See docs/SAVE.md.
import type { Settings } from '../types';
import { CHAPTER_COUNT } from '../components/game/Constants';

export const SAVE_VERSION = 2;
export const SAVE_KEY = 'light_escapes_void_save_v1';      // unchanged on purpose: old saves must be found
export const SAVE_BACKUP_KEY = 'light_save_backup';       // previous-day copy (step 2)

/** Lifetime counters (8A step 4). All additive; never reset except by resetSave. */
export interface LifetimeStats {
    runs: number;                         // runs started
    deaths: number;                       // runs ended by death
    wins: number;                         // Darkness beaten
    kills: number;                        // every enemy ever killed (incl. bosses)
    bossKills: Record<string, number>;    // bossId → times killed
    deathsByBoss: Record<string, number>; // bossId → times it killed you
    bestWaveByChapter: number[];          // CHAPTER_COUNT entries, best wave reached inside each chapter (0 = never)
    totalMatter: number;                  // matter ever banked (spending does not reduce it)
    totalEssence: number;                 // raw essence ever picked up
    discoveries: { relics: number; shrines: number; landmarks: number; events: number };
    bestStreak: number;
    burstsFired: number;
    playTimeMs: number;
    /** boss-mechanic flags for achievements v2, e.g. 'crimson_eclipse:no_laser' → true */
    feats: Record<string, true>;
}

export interface SaveV2 {
    version: 2;
    savedAt: number;                      // Date.now() at write
    matter: number;
    unlockedAbilityIds: string[];
    seenEnemyIds: string[];
    unlockedAchievementIds: string[];
    defeatedBosses: string[];
    maxWaveReached: number;
    maxMaturityAchieved: number;
    hasSeenIntro: boolean;
    endingSeen: boolean;                  // (2D)
    landmarksSeen: string[];              // (3A)
    killCounts: Record<string, number>;   // (3B)
    mapTreasuresOpened: string[];         // (7C)
    mapRevealsSeen: string[];             // (7D)
    stats: LifetimeStats;                 // (8A)
    settings: Required<Settings>;
}

export const DEFAULT_SETTINGS: Required<Settings> = {
    showTouchControls: true,
    mouseMovementEnabled: true,
    masterVolume: 0.8,
    musicVolume: 0.6,
    sfxVolume: 1.0,
    performanceMode: 'AUTO', // (7B)
    screenShake: true,       // (4A)
    reduceFlash: false,      // (4A)
    spriteMode: false,       // (5B)
    showMinimap: true,       // (3A)
    haptics: 'LIGHT',        // (7B)
    muted: false,            // (6A)
};

export const defaultStats = (): LifetimeStats => ({
    runs: 0, deaths: 0, wins: 0, kills: 0,
    bossKills: {}, deathsByBoss: {},
    bestWaveByChapter: Array.from({ length: CHAPTER_COUNT }, () => 0),
    totalMatter: 0, totalEssence: 0,
    discoveries: { relics: 0, shrines: 0, landmarks: 0, events: 0 },
    bestStreak: 0, burstsFired: 0, playTimeMs: 0,
    feats: {},
});

export const defaultSave = (): SaveV2 => ({
    version: 2,
    savedAt: 0,
    matter: 0,
    unlockedAbilityIds: ['root'],
    seenEnemyIds: [],
    unlockedAchievementIds: [],
    defeatedBosses: [],
    maxWaveReached: 1,
    maxMaturityAchieved: 0,
    hasSeenIntro: false,
    endingSeen: false,
    landmarksSeen: [],
    killCounts: {},
    mapTreasuresOpened: [],
    mapRevealsSeen: [],
    stats: defaultStats(),
    settings: { ...DEFAULT_SETTINGS },
});

/** Field table used by docs/SAVE.md and the test (name → kind). Keep in sync with SaveV2. */
export const SAVE_FIELDS: Record<keyof SaveV2, 'number' | 'boolean' | 'string[]' | 'record' | 'object'> = {
    version: 'number', savedAt: 'number', matter: 'number',
    unlockedAbilityIds: 'string[]', seenEnemyIds: 'string[]', unlockedAchievementIds: 'string[]', defeatedBosses: 'string[]',
    maxWaveReached: 'number', maxMaturityAchieved: 'number', hasSeenIntro: 'boolean', endingSeen: 'boolean',
    landmarksSeen: 'string[]', killCounts: 'record', mapTreasuresOpened: 'string[]', mapRevealsSeen: 'string[]',
    stats: 'object', settings: 'object',
};
