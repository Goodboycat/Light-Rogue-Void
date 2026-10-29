
import { useState, useEffect } from 'react';
import { GameState } from '../types';
import { getNode } from '../data';
import { SAVE_KEY, SAVE_BACKUP_KEY, SAVE_VERSION, SaveV2, defaultSave } from '../save/schema';
import { migrateSave, MigrationReport } from '../save/migrate';
import { createSaveWriter, getLocalStorage, SaveWriter } from '../save/storage';

export interface TreeMigrationReport { dropped: number; refunded: number }
/** Set once at load; App.tsx reads it to show a toast. */
export let lastTreeMigration: TreeMigrationReport | null = null;
/** (8A) full migration report of the load (for `?debug=1` / HANDOFF numbers). */
export let lastMigration: MigrationReport | null = null;

const nodeExists = (id: string) => !!getNode(id);

/** SaveV2 → GameState (runtime flags off). */
export const saveToState = (s: SaveV2): GameState => ({
    matter: s.matter,
    unlockedAbilityIds: s.unlockedAbilityIds,
    seenEnemyIds: s.seenEnemyIds,
    unlockedAchievementIds: s.unlockedAchievementIds,
    defeatedBosses: s.defeatedBosses,
    maxWaveReached: s.maxWaveReached,
    maxMaturityAchieved: s.maxMaturityAchieved,
    isGameRunning: false,
    isMenuOpen: false,
    hasSeenIntro: s.hasSeenIntro,
    endingSeen: s.endingSeen,
    landmarksSeen: s.landmarksSeen,
    killCounts: s.killCounts,
    mapTreasuresOpened: s.mapTreasuresOpened,
    mapRevealsSeen: s.mapRevealsSeen,
    stats: s.stats,
    settings: s.settings,
});

/** GameState → SaveV2 (what is written). Runs through migrateSave so the blob is always normalised. */
export const stateToSave = (g: GameState): SaveV2 => {
    const { save } = migrateSave({ version: SAVE_VERSION, ...g, savedAt: Date.now() }, nodeExists);
    return save;
};

const INITIAL_STATE: GameState = saveToState(defaultSave());

/** Load + migrate from localStorage. Falls back to the backup copy if the main blob is unreadable. */
const loadSave = (): GameState => {
    const storage = getLocalStorage();
    const tryKey = (key: string): SaveV2 | null => {
        try {
            const raw = storage?.getItem(key) ?? null;
            if (!raw) return null;
            const parsed = JSON.parse(raw);
            const { save, report } = migrateSave(parsed, nodeExists);
            lastMigration = report;
            if (report.droppedNodes > 0) {
                lastTreeMigration = { dropped: report.droppedNodes, refunded: report.refunded };
                console.info(`[LIGHT] tree migration: dropped ${report.droppedNodes} legacy nodes, refunded ${report.refunded} matter`);
            }
            if (report.from !== report.to) console.info(`[LIGHT] save migrated v${report.from} → v${report.to}:`, report.steps);
            return save;
        } catch (e) {
            console.error(`[LIGHT] failed to load save (${key})`, e);
            return null;
        }
    };
    const main = tryKey(SAVE_KEY);
    if (main) return saveToState(main);
    const backup = tryKey(SAVE_BACKUP_KEY);
    if (backup) { console.warn('[LIGHT] main save unreadable — restored from backup'); return saveToState(backup); }
    return INITIAL_STATE;
};

/** (8A step 2) One debounced writer per page; flushed on pagehide / hidden tab / beforeunload. */
let writer: SaveWriter | null = null;
const getWriter = (): SaveWriter => {
    if (writer) return writer;
    writer = createSaveWriter(getLocalStorage());
    if (typeof window !== 'undefined') {
        const flush = () => { writer?.flush(); };
        window.addEventListener('pagehide', flush);
        window.addEventListener('beforeunload', flush);
        document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') flush(); });
    }
    return writer;
};
/** Write whatever is pending right now (used by resetSave and tests). */
export const flushSave = () => getWriter().flush();

export const useGameSave = () => {
    const [gameState, setGameState] = useState<GameState>(loadSave);

    useEffect(() => {
        // Debounced 500 ms; stateToSave stamps savedAt via migrateSave normalisation.
        const blob = stateToSave(gameState);
        getWriter().schedule(JSON.stringify(blob), blob.savedAt || Date.now());
    }, [gameState]);

    const resetSave = () => {
        try {
            // drop anything pending so the debounced write cannot resurrect the save after removeItem
            getWriter().cancel();
            const ls = getLocalStorage();
            ls?.removeItem(SAVE_KEY);
            ls?.removeItem(SAVE_BACKUP_KEY);
        } catch (e) {
            console.error("Failed to clear save", e);
        }
        setGameState(INITIAL_STATE);
        // Force a reload to ensure all memory is cleared cleanly
        window.location.reload();
    };

    return { gameState, setGameState, resetSave };
};
