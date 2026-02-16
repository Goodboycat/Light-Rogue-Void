
import { useState, useEffect } from 'react';
import { GameState } from '../types';

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
        performanceMode: 'MEDIUM'
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
    }, [gameState]);

    const resetSave = () => {
        localStorage.removeItem(SAVE_KEY);
        setGameState(INITIAL_STATE);
        // Force a reload to ensure all memory is cleared cleanly
        window.location.reload();
    };

    return { gameState, setGameState, resetSave };
};
