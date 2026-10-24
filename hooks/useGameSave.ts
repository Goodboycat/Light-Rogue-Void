import { useState, useEffect, useRef } from 'react';
import { GameState } from '../types';
import { generateRunPath, RunNode } from '../data/mapNodes';
import { updateMercyMultipliers } from '../components/game/mercy';
import { syncDailyState } from '../data/dailyVoid';

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
    hasSeenEssenceTutorial: false,
    seenBeamHint: false,
    seenSemiBossTutorial: false,
    settings: {
        showTouchControls: true,
        mouseMovementEnabled: true,
        masterVolume: 0.8,
        musicVolume: 0.6,
        sfxVolume: 1.0,
        performanceMode: 'MEDIUM',
        language: 'en',
        difficulty: 'normal',
        dialogueTextSize: 'NORMAL',
        uiTextSize: 'NORMAL',
        shareTelemetry: true,
        haptics: 'FULL',
        reduceShake: 0,
        reduceFlashes: false,
        colorblindMode: false,
        highContrastBullets: false,
        showHitboxDot: undefined,
        backgroundDim: 0.2,
        autoAimTouch: undefined,
        floatingJoystick: false,
        doubleTapDash: true,
        leftHandedControls: false,
        controlScale: 100,
        controlOpacity: 85,
        cameraZoom: 0
    },
    currentRunPath: [],
    visitedNodeIds: [],
    currentMapId: '',
    completedSpecialMissions: [],
    discoveredSecretIds: [],
    /* PATCH: STEP-6 progressive-guidebook */
    discoveredGuideEntries: [],
    treasureNodesCompleted: 0,
    treasuresAllClearedDialogueTriggered: false,
    doubleEssenceMultiplierUnlocked: false,
    playedCinematicNodeIds: [],
    specialMissionKeys: 0,
    hasObtainedFirstKey: false,
    map1SideMissionCompleted: false,
    map1EventCompleted: false,
    sideMission: undefined,
    hasPickedFirstPower: false,
    hasSeenHighlightNextNode: false,
    seenBossIntros: [],
    bestBossProgress: {},
    bossFailedAttemptsSession: {},
    bossTrophies: {},
    hasCompletedFirstBoonDraft: false,
    equippedSkin: 'skin_default',
    equippedTrail: 'trail_default',
    unlockedCosmetics: ['skin_default', 'trail_default'],
    newCosmeticIds: [],
    newAchievementIds: [],
    newArchiveEnemyIds: [],
    dailyState: syncDailyState(),
    voidRushBestScore: 0,
    voidRushBestTimeSec: 0,
    totalPlayTimeSec: 0,
    lastSavedWave: 1
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
                        settings.mouseMovementEnabled = false;
                    } else {
                        settings.showTouchControls = false;
                        settings.mouseMovementEnabled = true;
                    }
                    delete settings.inputMode;
                }

                // Sync language with index.html script
                try {
                    const lrvLang = localStorage.getItem('lrv_lang');
                    if (lrvLang === 'en' || lrvLang === 'es') {
                        settings.language = lrvLang;
                    }
                } catch(e) {}

                if (settings.showTouchControls === undefined) settings.showTouchControls = true;
                if (settings.mouseMovementEnabled === undefined) settings.mouseMovementEnabled = true;
                if (!settings.dialogueTextSize) settings.dialogueTextSize = 'NORMAL';
                if (!settings.uiTextSize) settings.uiTextSize = 'NORMAL';
                if (settings.shareTelemetry === undefined) settings.shareTelemetry = true;

                let currentRunPath = parsed.currentRunPath;
                if (!currentRunPath || currentRunPath.length === 0) {
                    currentRunPath = generateRunPath();
                } else {
                    // Sync coordinates, regions, and connections of saved nodes with fresh generateRunPath() definitions
                    const freshNodes = generateRunPath();
                    let syncedPath = freshNodes.map(freshNode => {
                        const savedNode = currentRunPath.find((n: any) => n.id === freshNode.id);
                        if (savedNode) {
                            return {
                                ...freshNode,
                                state: savedNode.state
                            };
                        }
                        return freshNode;
                    });

                    // Auto-reveal any fogged node if it is connected from a VISITED node
                    const discoveredSecretIds = parsed.discoveredSecretIds || [];
                    syncedPath = syncedPath.map(node => {
                        if (node.type === 'SECRET' || node.type === 'EVENT') {
                            const isDiscovered = discoveredSecretIds.includes(node.id);
                            return {
                                ...node,
                                state: isDiscovered ? ('VISIBLE' as const) : ('FOGGED' as const)
                            };
                        }
                        if (node.state === 'FOGGED') {
                            const isConnectedFromCompleted = syncedPath.some(otherNode => 
                                otherNode.state === 'VISITED' &&
                                otherNode.type !== 'SECRET' && otherNode.type !== 'EVENT' &&
                                otherNode.connectsTo.includes(node.id)
                            );
                            if (isConnectedFromCompleted) {
                                return { ...node, state: 'VISIBLE' as const };
                            }
                        }
                        return node;
                    });
                    currentRunPath = syncedPath;
                }

                let currentMapId = parsed.currentMapId;
                if (!currentMapId && currentRunPath.length > 0) {
                     const currentNodes = currentRunPath.filter((n: RunNode) => n.state === 'CURRENT');
                     if (currentNodes.length > 0) {
                         currentMapId = currentNodes[0].id;
                     } else {
                         currentMapId = currentRunPath[0].id;
                     }
                }

                return {
                    ...INITIAL_STATE,
                    ...parsed,
                    maxWaveReached: parsed.maxWaveReached || 1,
                    maxMaturityAchieved: parsed.maxMaturityAchieved || 0,
                    unlockedAchievementIds: parsed.unlockedAchievementIds || [],
                    defeatedBosses: parsed.defeatedBosses || [],
                    hasSeenIntro: parsed.hasSeenIntro || false,
                    hasSeenEssenceTutorial: parsed.hasSeenEssenceTutorial || false,
                    isGameRunning: false,
                    isMenuOpen: false,
                    currentRunPath: currentRunPath,
                    visitedNodeIds: parsed.visitedNodeIds || [],
                    currentMapId: currentMapId,
                    completedSpecialMissions: parsed.completedSpecialMissions || [],
                    discoveredSecretIds: parsed.discoveredSecretIds || [],
                    /* PATCH: STEP-6 progressive-guidebook — hydrate discovered entries */
                    discoveredGuideEntries: parsed.discoveredGuideEntries || [],
                    treasureNodesCompleted: parsed.treasureNodesCompleted || 0,
                    treasuresAllClearedDialogueTriggered: parsed.treasuresAllClearedDialogueTriggered || false,
                    doubleEssenceMultiplierUnlocked: parsed.doubleEssenceMultiplierUnlocked || false,
                    playedCinematicNodeIds: parsed.playedCinematicNodeIds || [],
                    specialMissionKeys: parsed.specialMissionKeys || 0,
                    hasObtainedFirstKey: parsed.hasObtainedFirstKey || false,
                    map1SideMissionCompleted: parsed.map1SideMissionCompleted || false,
                    map1EventCompleted: parsed.map1EventCompleted || false,
                    sideMission: parsed.sideMission,
                    deathsByWave: parsed.deathsByWave || {},
                    bossAttempts: parsed.bossAttempts || {},
                    mercyLevel: parsed.mercyLevel || 0,
                    cleanWaveStreak: parsed.cleanWaveStreak || 0,
                    seenBossIntros: parsed.seenBossIntros || [],
                    bestBossProgress: parsed.bestBossProgress || {},
                    bossFailedAttemptsSession: parsed.bossFailedAttemptsSession || {},
                    bossTrophies: parsed.bossTrophies || {},
                    hasCompletedFirstBoonDraft: parsed.hasCompletedFirstBoonDraft || false,
                    equippedSkin: parsed.equippedSkin || 'skin_default',
                    equippedTrail: parsed.equippedTrail || 'trail_default',
                    unlockedCosmetics: parsed.unlockedCosmetics || ['skin_default', 'trail_default'],
                    newCosmeticIds: parsed.newCosmeticIds || [],
                    newAchievementIds: parsed.newAchievementIds || [],
                    newArchiveEnemyIds: parsed.newArchiveEnemyIds || [],
                    dailyState: syncDailyState(parsed.dailyState),
                    voidRushBestScore: parsed.voidRushBestScore || 0,
                    voidRushBestTimeSec: parsed.voidRushBestTimeSec || 0,
                    totalPlayTimeSec: parsed.totalPlayTimeSec || 0,
                    lastSavedWave: parsed.lastSavedWave || parsed.maxWaveReached || 1,
                    settings: { ...INITIAL_STATE.settings, ...settings }
                };
            }
        } catch (e) {
            console.error("Failed to load save", e);
        }

        let finalInit = { ...INITIAL_STATE };
        finalInit.currentRunPath = generateRunPath();
        const currentNodes = finalInit.currentRunPath.filter(n => n.state === 'CURRENT');
        if (currentNodes.length > 0) {
             finalInit.currentMapId = currentNodes[0].id;
        } else {
             finalInit.currentMapId = finalInit.currentRunPath[0].id;
        }

        try {
            const lrvLang = localStorage.getItem('lrv_lang');
            if (lrvLang === 'en' || lrvLang === 'es') {
                finalInit.settings.language = lrvLang;
            }
        } catch(e) {}

        return finalInit;
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
                hasSeenEssenceTutorial: gameState.hasSeenEssenceTutorial || false,
                seenBeamHint: gameState.seenBeamHint || false,
                settings: gameState.settings,
                currentRunPath: gameState.currentRunPath || [],
                visitedNodeIds: gameState.visitedNodeIds || [],
                currentMapId: gameState.currentMapId,
                completedSpecialMissions: gameState.completedSpecialMissions || [],
                discoveredSecretIds: gameState.discoveredSecretIds || [],
                /* PATCH: STEP-6 progressive-guidebook — persist discovered entries */
                discoveredGuideEntries: gameState.discoveredGuideEntries || [],
                treasureNodesCompleted: gameState.treasureNodesCompleted || 0,
                treasuresAllClearedDialogueTriggered: gameState.treasuresAllClearedDialogueTriggered || false,
                doubleEssenceMultiplierUnlocked: gameState.doubleEssenceMultiplierUnlocked || false,
                playedCinematicNodeIds: gameState.playedCinematicNodeIds || [],
                specialMissionKeys: gameState.specialMissionKeys || 0,
                hasObtainedFirstKey: gameState.hasObtainedFirstKey || false,
                map1SideMissionCompleted: gameState.map1SideMissionCompleted || false,
                map1EventCompleted: gameState.map1EventCompleted || false,
                completedMapIds: gameState.completedMapIds || [],
                unlockedMapIds: gameState.unlockedMapIds || [],
                sideMission: gameState.sideMission,
                deathsByWave: gameState.deathsByWave || {},
                bossAttempts: gameState.bossAttempts || {},
                mercyLevel: gameState.mercyLevel || 0,
                cleanWaveStreak: gameState.cleanWaveStreak || 0,
                seenBossIntros: gameState.seenBossIntros || [],
                bestBossProgress: gameState.bestBossProgress || {},
                bossFailedAttemptsSession: gameState.bossFailedAttemptsSession || {},
                bossTrophies: gameState.bossTrophies || {},
                hasCompletedFirstBoonDraft: gameState.hasCompletedFirstBoonDraft || false,
                equippedSkin: gameState.equippedSkin || 'skin_default',
                equippedTrail: gameState.equippedTrail || 'trail_default',
                unlockedCosmetics: gameState.unlockedCosmetics || ['skin_default', 'trail_default'],
                newCosmeticIds: gameState.newCosmeticIds || [],
                newAchievementIds: gameState.newAchievementIds || [],
                newArchiveEnemyIds: gameState.newArchiveEnemyIds || [],
                dailyState: gameState.dailyState || syncDailyState(),
                voidRushBestScore: gameState.voidRushBestScore || 0,
                voidRushBestTimeSec: gameState.voidRushBestTimeSec || 0,
                totalPlayTimeSec: gameState.totalPlayTimeSec || 0,
                lastSavedWave: gameState.lastSavedWave || gameState.maxWaveReached || 1
            };
            updateMercyMultipliers(gameState.mercyLevel || 0, gameState.settings?.difficulty || 'normal');
            localStorage.setItem(SAVE_KEY, JSON.stringify(saveState));
        } catch (e) {
            console.warn("Save failed - likely restricted environment (itch.io/private window):", e);
        }
    }, [gameState]);

    // Save on pagehide / visibilitychange hidden (debounced, non-blocking)
    const latestStateRef = useRef<GameState>(gameState);
    useEffect(() => {
        latestStateRef.current = gameState;
    }, [gameState]);

    useEffect(() => {
        let lastPagehideSaveMs = 0;
        const flushSaveNonBlocking = () => {
            const now = Date.now();
            if (now - lastPagehideSaveMs < 350) return;
            lastPagehideSaveMs = now;
            try {
                const st = latestStateRef.current;
                const payload = {
                    matter: st.matter,
                    unlockedAbilityIds: st.unlockedAbilityIds,
                    seenEnemyIds: st.seenEnemyIds,
                    unlockedAchievementIds: st.unlockedAchievementIds,
                    defeatedBosses: st.defeatedBosses,
                    maxWaveReached: st.maxWaveReached,
                    maxMaturityAchieved: st.maxMaturityAchieved,
                    hasSeenIntro: st.hasSeenIntro,
                    hasSeenEssenceTutorial: st.hasSeenEssenceTutorial || false,
                    seenBeamHint: st.seenBeamHint || false,
                    settings: st.settings,
                    currentRunPath: st.currentRunPath || [],
                    visitedNodeIds: st.visitedNodeIds || [],
                    currentMapId: st.currentMapId,
                    completedSpecialMissions: st.completedSpecialMissions || [],
                    discoveredSecretIds: st.discoveredSecretIds || [],
                    discoveredGuideEntries: st.discoveredGuideEntries || [],
                    treasureNodesCompleted: st.treasureNodesCompleted || 0,
                    treasuresAllClearedDialogueTriggered: st.treasuresAllClearedDialogueTriggered || false,
                    doubleEssenceMultiplierUnlocked: st.doubleEssenceMultiplierUnlocked || false,
                    playedCinematicNodeIds: st.playedCinematicNodeIds || [],
                    specialMissionKeys: st.specialMissionKeys || 0,
                    hasObtainedFirstKey: st.hasObtainedFirstKey || false,
                    map1SideMissionCompleted: st.map1SideMissionCompleted || false,
                    map1EventCompleted: st.map1EventCompleted || false,
                    completedMapIds: st.completedMapIds || [],
                    unlockedMapIds: st.unlockedMapIds || [],
                    sideMission: st.sideMission,
                    deathsByWave: st.deathsByWave || {},
                    bossAttempts: st.bossAttempts || {},
                    mercyLevel: st.mercyLevel || 0,
                    cleanWaveStreak: st.cleanWaveStreak || 0,
                    seenBossIntros: st.seenBossIntros || [],
                    bestBossProgress: st.bestBossProgress || {},
                    bossFailedAttemptsSession: st.bossFailedAttemptsSession || {},
                    bossTrophies: st.bossTrophies || {},
                    hasCompletedFirstBoonDraft: st.hasCompletedFirstBoonDraft || false,
                    equippedSkin: st.equippedSkin || 'skin_default',
                    equippedTrail: st.equippedTrail || 'trail_default',
                    unlockedCosmetics: st.unlockedCosmetics || ['skin_default', 'trail_default'],
                    newCosmeticIds: st.newCosmeticIds || [],
                    newAchievementIds: st.newAchievementIds || [],
                    newArchiveEnemyIds: st.newArchiveEnemyIds || [],
                    dailyState: st.dailyState || syncDailyState(),
                    voidRushBestScore: st.voidRushBestScore || 0,
                    voidRushBestTimeSec: st.voidRushBestTimeSec || 0,
                    totalPlayTimeSec: st.totalPlayTimeSec || 0,
                    lastSavedWave: st.lastSavedWave || st.maxWaveReached || 1
                };
                localStorage.setItem(SAVE_KEY, JSON.stringify(payload));
            } catch (e) {}
        };

        const handleVisibilityFlush = () => {
            if (typeof document !== 'undefined' && document.hidden) {
                flushSaveNonBlocking();
            }
        };

        window.addEventListener('pagehide', flushSaveNonBlocking);
        document.addEventListener('visibilitychange', handleVisibilityFlush);
        return () => {
            window.removeEventListener('pagehide', flushSaveNonBlocking);
            document.removeEventListener('visibilitychange', handleVisibilityFlush);
        };
    }, []);

    const resetSave = () => {
        try {
            localStorage.removeItem(SAVE_KEY);
            localStorage.removeItem('void_tutorial_completed');
            localStorage.removeItem('void_essence_tutorial_completed');
            localStorage.removeItem('void_key_tutorial_completed');
            localStorage.removeItem('void_event_tutorial_completed');
        } catch (e) {
            console.error("Failed to clear save", e);
        }
        const freshInit = { ...INITIAL_STATE };
        freshInit.currentRunPath = generateRunPath();
        const currentNodes = freshInit.currentRunPath.filter(n => n.state === 'CURRENT');
        if (currentNodes.length > 0) {
             freshInit.currentMapId = currentNodes[0].id;
        } else {
             freshInit.currentMapId = freshInit.currentRunPath[0].id;
        }
        setGameState(freshInit);
        window.location.reload();
    };

    return { gameState, setGameState, resetSave };
};
