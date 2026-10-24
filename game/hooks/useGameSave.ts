
import { useState, useEffect } from 'react';
import { GameState } from '../types';
import { getNode } from '../data';

/** (1B) Flat refund per unknown node id. The old tree was random per device so
 *  we cannot know the real price; 20 matter is the depth-0 price. */
const LEGACY_REFUND_PER_NODE = 20;

export interface TreeMigrationReport { dropped: number; refunded: number }
/** Set once at load; App.tsx reads it to show a toast. */
export let lastTreeMigration: TreeMigrationReport | null = null;

const SAVE_KEY = 'light_escapes_void_save_v1';

const INITIAL_STATE: GameState = {
    matter: 0,
    unlockedAbilityIds: ['root'],
    seenEnemyIds: [],
    unlockedAchievementIds: [],
    defeatedBosses: [],
    maxWaveReached: 1,
    maxMaturityAchieved: 0,
    isGameRunning: false,
    isMenuOpen: false,
    hasSeenIntro: false,
    settings: {
        showTouchControls: true,
        mouseMovementEnabled: true,
        masterVolume: 0.8,
        musicVolume: 0.6,
        sfxVolume: 1.0,
        performanceMode: 'MEDIUM',
        screenShake: true,
        reduceFlash: false
    }
};

export const useGameSave = () => {
    const [gameState, setGameState] = useState<GameState>(() => {
        try {
            const saved = localStorage.getItem(SAVE_KEY);
            if (saved) {
                const parsed = JSON.parse(saved);
                
                // Migration for old settings
                let settings = parsed.settings || {};
                if (settings.inputMode) {
                    if (settings.inputMode === 'MOBILE') {
                        settings.showTouchControls = true;
                        settings.mouseMovementEnabled = false; // Old mobile didn't have mouse move usually
                    } else {
                        settings.showTouchControls = false;
                        settings.mouseMovementEnabled = true;
                    }
                    delete settings.inputMode;
                }
                // Ensure defaults for new fields if migration didn't cover it or fresh save
                if (settings.showTouchControls === undefined) settings.showTouchControls = true;
                if (settings.mouseMovementEnabled === undefined) settings.mouseMovementEnabled = true;
                if (settings.screenShake === undefined) settings.screenShake = true; // (4A)
                if (settings.reduceFlash === undefined) settings.reduceFlash = false; // (4A)

                // (1B) Tree migration: the seeded tree has stable ids; any id from the
                // old random tree is dropped and refunded so the save never dangles.
                const rawIds: string[] = Array.isArray(parsed.unlockedAbilityIds) ? parsed.unlockedAbilityIds : ['root'];
                const keptIds = rawIds.filter(id => !!getNode(id));
                if (!keptIds.includes('root')) keptIds.unshift('root');
                const droppedCount = rawIds.length - rawIds.filter(id => !!getNode(id)).length;
                if (droppedCount > 0) {
                    const refund = droppedCount * LEGACY_REFUND_PER_NODE;
                    parsed.matter = (parsed.matter || 0) + refund;
                    lastTreeMigration = { dropped: droppedCount, refunded: refund };
                    console.info(`[LIGHT] tree migration: dropped ${droppedCount} legacy nodes, refunded ${refund} matter`);
                }
                parsed.unlockedAbilityIds = keptIds;

                return {
                    ...INITIAL_STATE,
                    ...parsed,
                    // Ensure defaults for potentially missing fields in old saves
                    maxWaveReached: parsed.maxWaveReached || 1,
                    maxMaturityAchieved: parsed.maxMaturityAchieved || 0,
                    unlockedAchievementIds: parsed.unlockedAchievementIds || [],
                    defeatedBosses: parsed.defeatedBosses || [],
                    hasSeenIntro: parsed.hasSeenIntro || false,
                    isGameRunning: false, // Always start at menu
                    isMenuOpen: false,
                    settings: { ...INITIAL_STATE.settings, ...settings }
                };
            }
        } catch (e) {
            console.error("Failed to load save", e);
        }
        return INITIAL_STATE;
    });

    useEffect(() => {
        try {
            const saveState = {
                matter: gameState.matter,
                unlockedAbilityIds: gameState.unlockedAbilityIds,
                seenEnemyIds: gameState.seenEnemyIds,
                unlockedAchievementIds: gameState.unlockedAchievementIds,
                defeatedBosses: gameState.defeatedBosses,
                maxWaveReached: gameState.maxWaveReached,
                maxMaturityAchieved: gameState.maxMaturityAchieved,
                hasSeenIntro: gameState.hasSeenIntro,
                settings: gameState.settings
            };
            localStorage.setItem(SAVE_KEY, JSON.stringify(saveState));
        } catch (e) {
            console.warn("Save failed - likely restricted environment (itch.io/private window):", e);
        }
    }, [gameState]);

    const resetSave = () => {
        try {
            localStorage.removeItem(SAVE_KEY);
        } catch (e) {
            console.error("Failed to clear save", e);
        }
        setGameState(INITIAL_STATE);
        // Force a reload to ensure all memory is cleared cleanly
        window.location.reload();
    };

    return { gameState, setGameState, resetSave };
};
