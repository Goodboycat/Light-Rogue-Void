
import React, { useState, useEffect, useCallback, Suspense, lazy } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

import StarBackground from './components/StarBackground';
import SurvivalGame from './components/SurvivalGame';
import MainMenu from './components/MainMenu';
import AchievementList from './components/AchievementList';
import EvolutionMatrix from './components/EvolutionMatrix';
import GameHUD from './components/GameHUD';
import SettingsMenu from './components/SettingsMenu';
import TransitionOverlay from './components/TransitionOverlay';
import CinematicOverlay from './components/CinematicOverlay';
import { COSMETICS_DATA } from './data/cosmetics';
import { getDailyModifierForDate, getUtcDateString, DAILY_CONFIG } from './data/dailyVoid';

const Archives = lazy(() => import('./components/Archives'));
const StarChart = lazy(() => import('./components/StarChart'));

import { ABILITY_TREE_DATA, getNodeParentChain } from './data';
import { checkAchievements } from './data/achievements';
import { generateRunPath } from './data/mapNodes';
import { useGameSave } from './hooks/useGameSave';
import { usePlayerStats } from './hooks/usePlayerStats';
import { Settings, SideMission } from './types';
import { audio } from './components/game/audio';
import { TREASURE_ALL_CLEARED_SCRIPT, CinematicLine, FIRST_SEMI_BOSS_TUTORIAL_SCRIPT } from './data/cinematics';
import { track, measureRefreshRateHz, setTelemetryOptOut } from './utils/telemetry';
import { loadAndDecodeRegionBackground, getRegionBackground } from './data/regionBackgrounds';

const APP_LOADING_TIPS = [
    'Dash grants brief invulnerability — dash through homing missiles and lasers.',
    'Stay moving in tight arcs to cluster Essence drops for easy collection.',
    'Purge Beam charges as you deal damage — unleash it on Elite packs or Boss phases.',
    'Auto-Aim targets the nearest threat when the aim stick is idle.',
    'Elite enemies flash and drop bonus Essence — eliminate them early.',
    'Each region node unlocks new paths and permanent Star Chart upgrades.'
];

const LoadingScreenWithTips: React.FC<{ label?: string }> = ({ label = 'LOADING SECTOR...' }) => {
    const [progress, setProgress] = useState(25);
    const [tipIdx, setTipIdx] = useState(() => Math.floor(Math.random() * APP_LOADING_TIPS.length));

    useEffect(() => {
        const pTimer = window.setInterval(() => {
            setProgress((p) => (p < 92 ? p + 12 : p));
        }, 120);
        const tTimer = window.setInterval(() => {
            setTipIdx((i) => (i + 1) % APP_LOADING_TIPS.length);
        }, 2500);
        return () => {
            window.clearInterval(pTimer);
            window.clearInterval(tTimer);
        };
    }, []);

    return (
        <div className="fixed inset-0 z-[100] bg-slate-950 flex flex-col items-center justify-center p-6 text-center select-none">
            <div className="w-72 max-w-[85vw] bg-slate-900/90 border border-cyan-500/30 rounded-2xl p-5 shadow-[0_0_30px_rgba(34,211,238,0.15)]">
                <div className="flex justify-between items-center font-mono text-xs text-cyan-400 tracking-widest uppercase mb-2">
                    <span>{label}</span>
                    <span>{progress}%</span>
                </div>
                <div className="w-full h-2 bg-slate-950 rounded-full overflow-hidden border border-slate-800 mb-3">
                    <div
                        className="h-full bg-gradient-to-r from-cyan-400 to-purple-400 transition-all duration-150"
                        style={{ width: `${progress}%` }}
                    />
                </div>
                <p className="text-[11px] font-mono text-slate-400 leading-relaxed">
                    TIP: {APP_LOADING_TIPS[tipIdx]}
                </p>
            </div>
        </div>
    );
};

const App: React.FC = () => {
  const { gameState, setGameState, resetSave } = useGameSave();
  const playerStats = usePlayerStats(
      gameState.unlockedAbilityIds, 
      gameState.completedSpecialMissions || [],
      gameState.doubleEssenceMultiplierUnlocked || false
  );

  useEffect(() => {
      audio.setVolumes(
          gameState.settings.masterVolume ?? 0.8, 
          gameState.settings.musicVolume ?? 0.6, 
          gameState.settings.sfxVolume ?? 1.0
      );
  }, [
      gameState.settings.masterVolume, 
      gameState.settings.musicVolume, 
      gameState.settings.sfxVolume
  ]);

  useEffect(() => {
      const size = gameState.settings.uiTextSize || 'NORMAL';
      const root = document.documentElement;
      root.classList.remove('ui-size-large', 'ui-size-huge');
      if (size === 'HUGE') {
          root.classList.add('ui-size-huge');
          root.style.fontSize = '125%';
      } else if (size === 'LARGE') {
          root.classList.add('ui-size-large');
          root.style.fontSize = '112.5%';
      } else {
          root.style.fontSize = '100%';
      }
  }, [gameState.settings.uiTextSize]);

  useEffect(() => {
      setTelemetryOptOut(gameState.settings.shareTelemetry === false);
  }, [gameState.settings.shareTelemetry]);

  useEffect(() => {
      measureRefreshRateHz().then(refreshHz => {
          track('session_start', {
              w: window.innerWidth,
              h: window.innerHeight,
              dpr: window.devicePixelRatio || 1,
              touch: 'ontouchstart' in window || (navigator.maxTouchPoints || 0) > 0,
              perfMode: gameState.settings.performanceMode,
              lang: gameState.settings.language || 'en',
              refreshHz
          });
      });

      const handlePageHide = () => {
          track('quit_guess', {
              wave: gameState.maxWaveReached || 1,
              screen: gameState.isGameRunning ? 'game' : gameState.isMenuOpen ? 'menu' : 'starchart'
          });
      };
      window.addEventListener('pagehide', handlePageHide);
      return () => window.removeEventListener('pagehide', handlePageHide);
  }, []);

  const [gameKey, setGameKey] = useState(0);
  const [startWave, setStartWave] = useState(1);
  const [isVoidRushMode, setIsVoidRushMode] = useState(false);
  const [focusEvolutionNodeId, setFocusEvolutionNodeId] = useState<string | null>(null);
  const [showArchives, setShowArchives] = useState(false);
  const [showAchievements, setShowAchievements] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showStarChart, setShowStarChart] = useState(false);
  const [isPauseBlocked, setIsPauseBlocked] = useState(false);
  
  // Transition State
  const [isTransitioning, setIsTransitioning] = useState(false);

  // Track total play time in seconds while in game (used for 15-minute free respec window)
  useEffect(() => {
      if (!gameState.isGameRunning || gameState.isMenuOpen || showStarChart) return;
      const timer = window.setInterval(() => {
          setGameState(p => ({ ...p, totalPlayTimeSec: (p.totalPlayTimeSec || 0) + 5 }));
      }, 5000);
      return () => window.clearInterval(timer);
  }, [gameState.isGameRunning, gameState.isMenuOpen, showStarChart, setGameState]);

  const handleRespec = useCallback((feeMatter: number) => {
      setGameState(p => {
          if (p.matter < feeMatter) return p;
          let refunded = 0;
          for (const id of p.unlockedAbilityIds) {
              if (id === 'root') continue;
              const node = ABILITY_TREE_DATA.find(n => n.id === id);
              if (node) refunded += node.cost;
          }
          if (refunded <= 0 && p.unlockedAbilityIds.length <= 1) return p;
          audio.playLevelUp();
          return {
              ...p,
              matter: Math.max(0, p.matter - feeMatter + refunded),
              unlockedAbilityIds: ['root'],
          };
      });
  }, [setGameState]);

  const handleStartVoidRush = useCallback(() => {
      performTransition(() => {
          setIsVoidRushMode(true);
          setStartWave(1);
          setShowStarChart(false);
          setGameState(p => ({ ...p, isGameRunning: true, isMenuOpen: false }));
          setGameKey(k => k + 1);
          setIsPauseBlocked(false);
      });
  }, []);

  const handleToggleDailyMod = useCallback((enabled: boolean) => {
      setGameState(p => ({
          ...p,
          dailyState: p.dailyState ? { ...p.dailyState, activeDailyModEnabled: enabled } : undefined
      }));
  }, [setGameState]);

  const handleEquipCosmetic = useCallback((kind: 'skin' | 'trail', id: string) => {
      setGameState(p => ({
          ...p,
          equippedSkin: kind === 'skin' ? id : p.equippedSkin,
          equippedTrail: kind === 'trail' ? id : p.equippedTrail,
      }));
  }, [setGameState]);

  const handleClearNewCosmetics = useCallback(() => {
      setGameState(p => (p.newCosmeticIds && p.newCosmeticIds.length > 0 ? { ...p, newCosmeticIds: [] } : p));
  }, [setGameState]);

  const handleClearNewAchievements = useCallback(() => {
      setGameState(p => (p.newAchievementIds && p.newAchievementIds.length > 0 ? { ...p, newAchievementIds: [] } : p));
  }, [setGameState]);

  const handleClearNewArchives = useCallback(() => {
      setGameState(p => (p.newArchiveEnemyIds && p.newArchiveEnemyIds.length > 0 ? { ...p, newArchiveEnemyIds: [] } : p));
  }, [setGameState]);

  const canPurchaseNode = React.useMemo(() => {
      return ABILITY_TREE_DATA.some(node => {
          const currentLevel = gameState.unlockedAbilityIds.filter(x => x === node.id).length;
          const maxLevel = 1; // Single-level skill tree: nodes unlock once, no upgrades.
          if (currentLevel >= maxLevel) return false;
          
          const cost = node.cost;
          if (gameState.matter < cost) return false;
          
          return node.parentIds.length === 0 || node.parentIds.some(pid => gameState.unlockedAbilityIds.includes(pid));
      });
  }, [gameState.matter, gameState.unlockedAbilityIds]);
  
  // Logic to determine if we are in Main Menu (start screen) or in game
  const isInMainMenu = !gameState.isGameRunning;

  // Cinematic State for clearing all map treasures
  const [activeAppCinematic, setActiveAppCinematic] = useState<CinematicLine[] | null>(null);
  const [semiBossVignetteColor, setSemiBossVignetteColor] = useState<string | null>(null);

  // Trigger cinematic when all treasure nodes on the map are cleared
  const treasuresAllClearedDialogueTriggeredRef = React.useRef(gameState.treasuresAllClearedDialogueTriggered || false);
  useEffect(() => {
      treasuresAllClearedDialogueTriggeredRef.current = gameState.treasuresAllClearedDialogueTriggered || false;
  }, [gameState.treasuresAllClearedDialogueTriggered]);

  useEffect(() => {
      if (!gameState.currentRunPath || gameState.currentRunPath.length === 0) return;
      
      const allTreasures = gameState.currentRunPath.filter(node => node.type === 'TREASURE');
      if (allTreasures.length === 0) return;
      
      const allCollected = allTreasures.every(node => (gameState.visitedNodeIds || []).includes(node.id));
      if (allCollected && !treasuresAllClearedDialogueTriggeredRef.current) {
          treasuresAllClearedDialogueTriggeredRef.current = true;
          setActiveAppCinematic(TREASURE_ALL_CLEARED_SCRIPT);
          
          setGameState(p => ({
              ...p,
              treasuresAllClearedDialogueTriggered: true,
              doubleEssenceMultiplierUnlocked: true
          }));
      }
  }, [gameState.visitedNodeIds, gameState.currentRunPath, setGameState]);


  // --- SEMI BOSS EVENT LISTENER ---
  const seenSemiBossTutorialRef = React.useRef(gameState.seenSemiBossTutorial || false);
  useEffect(() => {
      seenSemiBossTutorialRef.current = gameState.seenSemiBossTutorial || false;
  }, [gameState.seenSemiBossTutorial]);

  useEffect(() => {
      const handleSemiBossSpawned = (e: CustomEvent) => {
          const type = e.detail?.type;
          const colors = ['#ef4444', '#4ade80', '#facc15'];
          setSemiBossVignetteColor(colors[type] || '#ef4444');
          
          if (!seenSemiBossTutorialRef.current) {
              seenSemiBossTutorialRef.current = true;
              setGameState(p => ({ ...p, seenSemiBossTutorial: true }));
              setActiveAppCinematic(FIRST_SEMI_BOSS_TUTORIAL_SCRIPT);
          }

          // clear vignette after 1 second
          setTimeout(() => {
              setSemiBossVignetteColor(null);
          }, 1000);
      };

      window.addEventListener('semi_boss_spawned', handleSemiBossSpawned as EventListener);
      return () => {
          window.removeEventListener('semi_boss_spawned', handleSemiBossSpawned as EventListener);
      };
  }, [setGameState]);

  // --- GLOBAL KEY LISTENERS ---
  useEffect(() => {
    const handleInteraction = () => {
        audio.playBgm();
        window.removeEventListener('click', handleInteraction);
        window.removeEventListener('keydown', handleInteraction);
    };
    window.addEventListener('click', handleInteraction);
    window.addEventListener('keydown', handleInteraction);

    const handleKeyDown = (e: KeyboardEvent) => { 
        if (e.code === 'Escape') {
             if (showArchives) { setShowArchives(false); }
             else if (showAchievements) { setShowAchievements(false); }
             else if (showSettings) { setShowSettings(false); }
             // Only open/close menu if not in main menu AND pause is not blocked (cinematics/gameover)
             else if (!isInMainMenu && !isPauseBlocked && !isTransitioning) { 
                 if (gameState.isMenuOpen) {
                     setGameState(p => ({ ...p, isMenuOpen: false })); 
                 } else {
                     setGameState(p => ({ ...p, isMenuOpen: true })); 
                 }
             }
        }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => {
        window.removeEventListener('keydown', handleKeyDown);
    };
  }, [showArchives, showAchievements, showSettings, isInMainMenu, isPauseBlocked, gameState.isMenuOpen, setGameState, isTransitioning]);

  // --- TRANSITION HELPER ---
  const performTransition = useCallback((action: () => void) => {
      setIsTransitioning(true);
      setTimeout(() => {
          action();
          // Short delay to ensure the action (react render) has processed before fading out
          setTimeout(() => {
              setIsTransitioning(false);
          }, 100); 
      }, 1000); // 1s Fade In
  }, []);

  // --- GAMEPLAY HANDLERS ---
  const handleStartGame = (wave: number) => {
      performTransition(() => {
          setStartWave(wave);
          setGameState(p => ({ ...p, isGameRunning: true, isMenuOpen: false }));
          setGameKey(k => k + 1);
          setIsPauseBlocked(false); 
      });
  };

  const handleRestart = (wave: number = 1) => { 
      performTransition(() => {
        setStartWave(wave);
        setGameKey(k => k + 1); 
        setIsPauseBlocked(false); 
      });
  };
  
  const handleReturnToMenu = () => {
      performTransition(() => {
          setGameState(p => ({ ...p, isGameRunning: false, isMenuOpen: false }));
          setShowStarChart(true);
      });
  };

  const handleAddMatter = (amount: number) => {
      setGameState(p => ({ ...p, matter: p.matter + amount }));
  };

  const handleUpdateSettings = (newSettings: Settings) => {
      setGameState(p => ({ ...p, settings: newSettings }));
  };

  const handleUnlock = (id: string) => {
    const node = ABILITY_TREE_DATA.find(n => n.id === id);
    if (node) {
        const currentLevel = gameState.unlockedAbilityIds.filter(x => x === id).length;
        const maxLevel = 1; // Single-level skill tree: no upgrades.
        if (currentLevel < maxLevel) {
            const cost = node.cost;
            if (gameState.matter >= cost) {
                audio.playLevelUp();
                setGameState(p => ({
                    ...p,
                    matter: p.matter - cost,
                    unlockedAbilityIds: [...p.unlockedAbilityIds, id]
                }));
            }
        }
    }
  };

  const handleChooseFirstPower = useCallback((targetNodeId: string) => {
      const chain = getNodeParentChain(targetNodeId);
      audio.playLevelUp();
      setGameState(p => {
          const newUnlocked = Array.from(new Set([...p.unlockedAbilityIds, ...chain]));
          return {
              ...p,
              unlockedAbilityIds: newUnlocked,
              hasPickedFirstPower: true
          };
      });
  }, [setGameState]);

  const handleBatchUnlock = (ids: string[]) => {
      let changedAny = false;
      setGameState(p => {
          let currentMatter = p.matter;
          let newUnlocked = [...p.unlockedAbilityIds];
          let changed = false;
          const nodes = ABILITY_TREE_DATA.filter(n => ids.includes(n.id));
          
          while (true) {
              let bestNode = null;
              let bestCost = Infinity;
              
              for (const node of nodes) {
                  const currentLevel = newUnlocked.filter(x => x === node.id).length;
                  const maxLevel = 1; // Single-level skill tree: no upgrades.
                  if (currentLevel < maxLevel) {
                      const cost = node.cost;
                      if (cost <= currentMatter && cost < bestCost) {
                          bestCost = cost;
                          bestNode = node;
                      }
                  }
              }
              
              if (bestNode) {
                  currentMatter -= bestCost;
                  newUnlocked.push(bestNode.id);
                  changed = true;
                  changedAny = true;
              } else {
                  break;
              }
          }
          
          if (!changed) {
              return p;
          }
          return { ...p, matter: currentMatter, unlockedAbilityIds: newUnlocked };
      });
      if (changedAny) {
          audio.playLevelUp();
      }
  };

  const handleUnlockAll = () => {
      setGameState(p => ({
          ...p,
          unlockedAbilityIds: ABILITY_TREE_DATA.map(n => n.id)
      }));
  };

  const handleUnlockAllPlaces = () => {
      const allNodes = generateRunPath();
      const allNodeIds = allNodes.map(n => n.id);
      const allSecretIds = allNodes.filter(n => n.type === 'SECRET' || n.type === 'EVENT').map(n => n.id);
      const allSpecialRewards = allNodes.map(n => n.mission?.rewardId).filter((r): r is string => !!r);
      
      const fullyCompletedRunPath = allNodes.map(node => ({
          ...node,
          state: 'VISITED' as const
      }));

      try {
          localStorage.setItem('void_tutorial_completed', 'true');
          localStorage.setItem('void_essence_tutorial_completed', 'true');
          localStorage.setItem('void_key_tutorial_completed', 'true');
          localStorage.setItem('void_event_tutorial_completed', 'true');
      } catch (e) {
          // ignore
      }

      audio.playLevelUp();

      setGameState(p => ({
          ...p,
          completedMapIds: allNodeIds,
          unlockedMapIds: allNodeIds,
          visitedNodeIds: allNodeIds,
          discoveredSecretIds: allSecretIds,
          completedSpecialMissions: allSpecialRewards,
          currentRunPath: fullyCompletedRunPath,
          currentMapId: 'map_6',
          specialMissionKeys: Math.max(p.specialMissionKeys || 0, 10),
          maxWaveReached: Math.max(p.maxWaveReached || 1, 60),
          map1SideMissionCompleted: true,
          map1EventCompleted: true,
          treasureNodesCompleted: 5,
          treasuresAllClearedDialogueTriggered: true,
          doubleEssenceMultiplierUnlocked: true,
          hasObtainedFirstKey: true,
          seenSemiBossTutorial: true,
          hasSeenIntro: true,
          hasSeenEssenceTutorial: true,
      }));
  };
  
  const handleEnemySeen = useCallback((id: string) => {
      setGameState(p => {
          if (p.seenEnemyIds.includes(id)) return p;
          return {
              ...p,
              seenEnemyIds: [...p.seenEnemyIds, id],
              newArchiveEnemyIds: Array.from(new Set([...(p.newArchiveEnemyIds || []), id]))
          };
      });
  }, [setGameState]);

  const handleBossDefeated = useCallback((bossId: string) => {
      setGameState(p => {
          const newDefeated = p.defeatedBosses.includes(bossId) ? p.defeatedBosses : [...p.defeatedBosses, bossId];
          const tempState = { ...p, defeatedBosses: newDefeated };
          const newUnlocks = checkAchievements(tempState, playerStats, startWave, startWave);
          
          let nextAchievementIds = p.unlockedAchievementIds;
          let nextNewAch = p.newAchievementIds || [];
          if (newUnlocks.length > 0) {
              audio.playAchievementStinger();
              nextAchievementIds = [...p.unlockedAchievementIds, ...newUnlocks];
              nextNewAch = Array.from(new Set([...nextNewAch, ...newUnlocks]));
          }
          return {
              ...p,
              defeatedBosses: newDefeated,
              unlockedAchievementIds: nextAchievementIds,
              newAchievementIds: nextNewAch
          };
      });
  }, [playerStats, startWave, setGameState]);

  const handleUpdateMaxWave = useCallback((wave: number) => {
      setGameState(p => {
          const newMax = Math.max(p.maxWaveReached || 1, wave);
          const tempState = { ...p, maxWaveReached: newMax, lastSavedWave: wave };
          const newUnlocks = checkAchievements(tempState, playerStats, wave, startWave);
          
          let nextAchievementIds = p.unlockedAchievementIds;
          let nextNewAch = p.newAchievementIds || [];
          if (newUnlocks.length > 0) {
              audio.playAchievementStinger();
              nextAchievementIds = [...p.unlockedAchievementIds, ...newUnlocks];
              nextNewAch = Array.from(new Set([...nextNewAch, ...newUnlocks]));
          }

          // Update daily best wave & completion if Daily Void is active
          let nextDaily = p.dailyState;
          if (nextDaily && nextDaily.activeDailyModEnabled) {
              const today = getUtcDateString();
              const prevBest = nextDaily.bestWaveByDate?.[today] || 0;
              const completed = nextDaily.completedDailyDates || [];
              const nextCompleted =
                  wave >= DAILY_CONFIG.DAILY_COMPLETION_WAVE && !completed.includes(today)
                      ? [...completed, today]
                      : completed;
              nextDaily = {
                  ...nextDaily,
                  bestWaveByDate: { ...(nextDaily.bestWaveByDate || {}), [today]: Math.max(prevBest, wave) },
                  completedDailyDates: nextCompleted
              };
          }

          return {
              ...p,
              maxWaveReached: newMax,
              lastSavedWave: wave,
              unlockedAchievementIds: nextAchievementIds,
              newAchievementIds: nextNewAch,
              dailyState: nextDaily
          };
      });
  }, [playerStats, startWave, setGameState]);

  const handleUpdateMaxMaturity = useCallback((level: number) => {
      setGameState(p => {
          if (level > (p.maxMaturityAchieved || 0)) {
              const tempState = { ...p, maxMaturityAchieved: level };
              const newUnlocks = checkAchievements(tempState, playerStats, startWave, startWave);
              let nextAchievementIds = p.unlockedAchievementIds;
              let nextNewAch = p.newAchievementIds || [];
              if (newUnlocks.length > 0) {
                  nextAchievementIds = [...p.unlockedAchievementIds, ...newUnlocks];
                  nextNewAch = Array.from(new Set([...nextNewAch, ...newUnlocks]));
              }
              return {
                  ...p,
                  maxMaturityAchieved: level,
                  unlockedAchievementIds: nextAchievementIds,
                  newAchievementIds: nextNewAch
              };
          }
          return p;
      });
  }, [playerStats, startWave, setGameState]);

  const handleMapCompleted = useCallback((waveNumber: number, mapId?: string, wasKeyAwardedInRun?: boolean) => {
      setGameState(p => {
          let currentMapNode = null;
          if (mapId) {
              currentMapNode = (p.currentRunPath || []).find(n => n.id === mapId);
          }
          if (!currentMapNode) {
              currentMapNode = (p.currentRunPath || []).find(n => n.waveRange[1] === waveNumber);
          }
          if (!currentMapNode) return p;

          const completedMapIds = p.completedMapIds || [];
          const nextCompleted = completedMapIds.includes(currentMapNode.id)
              ? completedMapIds
              : [...completedMapIds, currentMapNode.id];
              
          const completedSpecialMissions = p.completedSpecialMissions || [];
          const nextSpecial = currentMapNode.mission?.rewardId && !completedSpecialMissions.includes(currentMapNode.mission.rewardId)
              ? [...completedSpecialMissions, currentMapNode.mission.rewardId]
              : completedSpecialMissions;

          const unlockedMapIds = p.unlockedMapIds || ['map_1'];
          let nextUnlocked = [...unlockedMapIds];
          if (currentMapNode.type !== 'SECRET' && currentMapNode.type !== 'EVENT') {
              currentMapNode.connectsTo.forEach(connId => {
                  const connNode = (p.currentRunPath || []).find(n => n.id === connId);
                  if (connNode && connNode.type !== 'SECRET' && connNode.type !== 'EVENT') {
                      if (!nextUnlocked.includes(connId)) {
                          nextUnlocked.push(connId);
                      }
                  }
              });
          }

          const nextRunPath = (p.currentRunPath || []).map(node => {
              if (node.id === currentMapNode.id) {
                  return { ...node, state: 'VISITED' as const };
              }
              if (currentMapNode.type !== 'SECRET' && currentMapNode.type !== 'EVENT') {
                  if (currentMapNode.connectsTo.includes(node.id)) {
                      if (node.state === 'FOGGED') {
                          if (node.type === 'SECRET' || node.type === 'EVENT') {
                              const isDiscovered = (p.discoveredSecretIds || []).includes(node.id);
                              if (!isDiscovered) return node;
                          }
                          return { ...node, state: 'VISIBLE' as const };
                      }
                  }
              }
              return node;
          });

          const nextVisitedNodeIds = p.visitedNodeIds.includes(currentMapNode.id)
              ? p.visitedNodeIds
              : [...p.visitedNodeIds, currentMapNode.id];

          // Award +1 Vault Key for newly completed special missions or bosses ONLY if key was not already awarded during in-game play
          const isSpecialOrBoss = currentMapNode.type === 'EVENT' || currentMapNode.type === 'SECRET' || currentMapNode.type === 'BOSS' || !!currentMapNode.mission?.rewardId;
          const newlyCompleted = !completedMapIds.includes(currentMapNode.id) && (!currentMapNode.mission?.rewardId || !completedSpecialMissions.includes(currentMapNode.mission.rewardId));
          const nextKeys = (isSpecialOrBoss && newlyCompleted && !wasKeyAwardedInRun) ? (p.specialMissionKeys || 0) + 1 : (p.specialMissionKeys || 0);

          return {
              ...p,
              specialMissionKeys: nextKeys,
              completedSpecialMissions: nextSpecial,
              completedMapIds: nextCompleted,
              unlockedMapIds: nextUnlocked,
              currentRunPath: nextRunPath,
              visitedNodeIds: nextVisitedNodeIds,
              currentMapId: currentMapNode.id,
              sideMission: undefined
          };
      });
  }, [setGameState]);

  const handleDiscoverSecret = useCallback((secretId: string) => {
      setGameState(p => {
          const discoveredSecretIds = p.discoveredSecretIds || [];
          if (discoveredSecretIds.includes(secretId)) return p;

          const unlockedMapIds = p.unlockedMapIds || ['map_1'];
          let nextUnlocked = [...unlockedMapIds];
          if (!nextUnlocked.includes(secretId)) {
              nextUnlocked.push(secretId);
          }

          const nextRunPath = (p.currentRunPath || []).map(node => {
              if (node.id === secretId) {
                  return { ...node, state: 'VISIBLE' as const };
              }
              return node;
          });

          return {
              ...p,
              discoveredSecretIds: [...discoveredSecretIds, secretId],
              unlockedMapIds: nextUnlocked,
              currentRunPath: nextRunPath
          };
      });
  }, [setGameState]);

  const handleUpdateSpecialMissionKeys = useCallback((keys: number) => {
      setGameState(p => ({
          ...p,
          specialMissionKeys: keys
      }));
  }, [setGameState]);

  const handleUpdateSideMission = useCallback((sm?: SideMission) => {
      setGameState(p => ({
          ...p,
          sideMission: sm
      }));
  }, [setGameState]);

  const handleSetHasObtainedFirstKey = useCallback(() => {
      setGameState(p => ({
          ...p,
          hasObtainedFirstKey: true
      }));
  }, [setGameState]);

  useEffect(() => {
      const handleBossDefeatedEvent = (e: any) => {
          if (e.detail?.bossId) {
              handleBossDefeated(e.detail.bossId);
          }
      };
      window.addEventListener('boss_defeated_event', handleBossDefeatedEvent as EventListener);
      return () => {
          window.removeEventListener('boss_defeated_event', handleBossDefeatedEvent as EventListener);
      };
  }, [handleBossDefeated]);

  // Check achievements on upgrade/matter collection or state changes
  useEffect(() => {
      const newUnlocks = checkAchievements(gameState, playerStats, startWave, startWave);
      if (newUnlocks.length > 0) {
           setGameState(p => ({
               ...p,
               unlockedAchievementIds: Array.from(new Set([...p.unlockedAchievementIds, ...newUnlocks])),
               newAchievementIds: Array.from(new Set([...(p.newAchievementIds || []), ...newUnlocks]))
           }));
      }
  }, [gameState, playerStats, startWave, setGameState]);

  return (
    <div 
      className="relative w-full h-full overflow-hidden bg-slate-950 text-slate-100 select-none"
      onContextMenu={(e) => e.preventDefault()}
      onPointerDown={() => {
          try {
              if (typeof window !== 'undefined' && document.hasFocus && !document.hasFocus()) {
                  window.focus();
              }
          } catch {}
      }}
    >
      <TransitionOverlay isVisible={isTransitioning} duration={1.0} />

      <StarBackground 
        unlockedCount={gameState.unlockedAbilityIds.length} 
        totalCount={ABILITY_TREE_DATA.length} 
        performanceMode={gameState.settings.performanceMode}
      />
      
      {/* --- MAIN MENU --- */}
      {isInMainMenu && !showStarChart && (
          <MainMenu 
             onStart={() => {
                 performTransition(() => {
                     setIsVoidRushMode(false);
                     // Fresh save: skip StarChart and start Wave 1 directly so TAP TO BEGIN launches straight into intro
                     const isFreshSave = !gameState.hasSeenIntro && (gameState.maxWaveReached || 1) <= 1 && (gameState.unlockedAbilityIds?.length || 0) <= 1 && (gameState.matter || 0) <= 0;
                     if (isFreshSave) {
                         setStartWave(1);
                         setGameState(p => ({ ...p, isGameRunning: true, isMenuOpen: false }));
                         setGameKey(k => k + 1);
                         setIsPauseBlocked(false);
                     } else {
                         setShowStarChart(true);
                     }
                 });
             }} 
             onStartVoidRush={handleStartVoidRush}
             onResetSave={resetSave}
             onOpenSettings={() => { setShowSettings(true); }}
             maxWaveReached={gameState.maxWaveReached}
             onAddMatter={handleAddMatter}
             currentMatter={gameState.matter}
             onUnlockAll={handleUnlockAll}
             hasSeenIntro={gameState.hasSeenIntro}
             /* PATCH: STEP-6/7 progressive-guidebook — pass context to modal */
             gameState={gameState}
             playerStats={playerStats}
             onUpdateSettings={handleUpdateSettings}
             onToggleDailyMod={handleToggleDailyMod}
             onEquipCosmetic={handleEquipCosmetic}
             onClearNewCosmetics={handleClearNewCosmetics}
          />
      )}

      {/* --- GAME LOOP --- */}
      {!isInMainMenu && (
          <>
            <SurvivalGame 
                key={gameKey} 
                playerStats={playerStats} 
                onCollectMatter={v => setGameState(p => ({...p, matter: p.matter + v}))} 
                paused={gameState.isMenuOpen || showArchives || showAchievements || showSettings || showStarChart || !!activeAppCinematic} 
                onRestart={handleRestart}
                onReturnToMenu={handleReturnToMenu}
                onTogglePause={() => { setGameState(p => ({ ...p, isMenuOpen: !p.isMenuOpen })); }}
                onOpenEvolutionMatrix={(nodeId) => {
                    if (nodeId) setFocusEvolutionNodeId(nodeId);
                    setGameState(p => ({ ...p, isMenuOpen: true }));
                }}
                onEnemySeen={handleEnemySeen}
                initialWave={startWave}
                maxWaveReached={gameState.maxWaveReached || 1}
                onUpdateMaxWave={handleUpdateMaxWave}
                hasSeenIntro={gameState.hasSeenIntro}
                onIntroComplete={() => setGameState(p => ({ ...p, hasSeenIntro: true }))}
                hasSeenEssenceTutorial={gameState.hasSeenEssenceTutorial || false}
                onEssenceTutorialComplete={() => setGameState(p => ({ ...p, hasSeenEssenceTutorial: true }))}
                settings={gameState.settings}
                onUpdateMaxMaturity={handleUpdateMaxMaturity}
                onBossDefeated={handleBossDefeated}
                onBlockPauseMenu={setIsPauseBlocked}
                onTransition={performTransition}
                canPurchaseNode={canPurchaseNode}
                currentRunPath={gameState.currentRunPath || []}
                currentMapId={gameState.currentMapId || ''}
                discoveredSecretIds={gameState.discoveredSecretIds || []}
                specialMissionKeys={gameState.specialMissionKeys || 0}
                sideMission={gameState.sideMission}
                hasObtainedFirstKey={gameState.hasObtainedFirstKey || false}
                map1SideMissionCompleted={gameState.map1SideMissionCompleted || false}
                map1EventCompleted={gameState.map1EventCompleted || false}
                completedMapIds={gameState.completedMapIds || []}
                completedSpecialMissions={gameState.completedSpecialMissions || []}
                hasPickedFirstPower={gameState.hasPickedFirstPower || false}
                unlockedAbilityIds={gameState.unlockedAbilityIds}
                onChooseFirstPower={handleChooseFirstPower}
                onUpdateMap1SideMissionCompleted={val => setGameState(p => ({ ...p, map1SideMissionCompleted: val }))}
                onUpdateMap1EventCompleted={val => setGameState(p => ({ ...p, map1EventCompleted: val }))}
                onSetHasObtainedFirstKey={handleSetHasObtainedFirstKey}
                onUpdateSpecialMissionKeys={handleUpdateSpecialMissionKeys}
                onUpdateSideMission={handleUpdateSideMission}
                
                seenBossIntros={gameState.seenBossIntros || []}
                bestBossProgress={gameState.bestBossProgress || {}}
                bossFailedAttemptsSession={gameState.bossFailedAttemptsSession || {}}
                bossTrophies={gameState.bossTrophies || {}}
                seenBeamHint={gameState.seenBeamHint || false}
                currentMatter={gameState.matter}
                equippedSkin={gameState.equippedSkin || 'skin_default'}
                equippedTrail={gameState.equippedTrail || 'trail_default'}
                isVoidRush={isVoidRushMode}
                dailyState={gameState.dailyState}
                onUpdateDailyState={(nextDaily) => setGameState(p => ({ ...p, dailyState: nextDaily }))}
                onRecordVoidRushScore={(score) => {
                    setGameState(p => ({
                        ...p,
                        voidRushBestScore: Math.max(p.voidRushBestScore || 0, score)
                    }));
                }}
                mercyState={{
                    deathsByWave: gameState.deathsByWave || {},
                    bossAttempts: gameState.bossAttempts || {},
                    mercyLevel: gameState.mercyLevel || 0,
                    cleanWaveStreak: gameState.cleanWaveStreak || 0
                }}
                onUpdateMercyState={(nextMercy) => {
                    setGameState(p => ({
                        ...p,
                        deathsByWave: nextMercy.deathsByWave,
                        bossAttempts: nextMercy.bossAttempts,
                        mercyLevel: nextMercy.mercyLevel,
                        cleanWaveStreak: nextMercy.cleanWaveStreak
                    }));
                }}
                onMarkBeamHintSeen={() => {
                    setGameState(p => p.seenBeamHint ? p : ({ ...p, seenBeamHint: true }));
                }}
                onRecordBossTrophy={(trophy) => {
                    setGameState(p => ({
                        ...p,
                        bossTrophies: { ...(p.bossTrophies || {}), [trophy.bossId]: trophy }
                    }));
                }}
                onMarkBossIntroSeen={(bossId) => {
                    setGameState(p => {
                        const current = p.seenBossIntros || [];
                        if (current.includes(bossId)) return p;
                        return { ...p, seenBossIntros: [...current, bossId] };
                    });
                }}
                onUpdateBossRetryData={(bossId, bestHpPct, failedAttempts) => {
                    setGameState(p => ({
                        ...p,
                        bestBossProgress: { ...(p.bestBossProgress || {}), [bossId]: bestHpPct },
                        bossFailedAttemptsSession: { ...(p.bossFailedAttemptsSession || {}), [bossId]: failedAttempts }
                    }));
                }}
                onOpenStarChart={() => setShowStarChart(true)}
                onMapCompleted={handleMapCompleted}
                onDiscoverSecret={handleDiscoverSecret}
                onRevealMystery={(nodeId, type) => {
                    setGameState(p => {
                        if (!p.currentRunPath) return p;
                        const newRunPath = [...p.currentRunPath];
                        const idx = newRunPath.findIndex(n => n.id === nodeId);
                        if (idx !== -1) {
                            newRunPath[idx] = { ...newRunPath[idx], displayType: type };
                        }
                        return { ...p, currentRunPath: newRunPath };
                    });
                }}
            />
            
            {/* HUD */}
            {!gameState.isMenuOpen && !showArchives && !showAchievements && !showSettings && !isPauseBlocked && !isTransitioning && (
                <GameHUD
                    matter={gameState.matter}
                    canPurchaseNode={canPurchaseNode}
                    lang={gameState.settings.language}
                    onOpenConstellation={() => setGameState(p => ({ ...p, isMenuOpen: true }))}
                />
            )}

            {/* EVOLUTION MATRIX */}
            <AnimatePresence>
                {gameState.isMenuOpen && !showArchives && !showAchievements && !showSettings && (
                    <EvolutionMatrix 
                        gameState={gameState}
                        onUnlock={handleUnlock}
                        onBatchUnlock={handleBatchUnlock}
                        onRespec={handleRespec}
                        focusNodeId={focusEvolutionNodeId}
                        onOpenBestiary={() => { setShowArchives(true); }}
                        onOpenAchievements={() => { setShowAchievements(true); }}
                        onOpenSettings={() => { setShowSettings(true); }}
                        onResume={() => {
                            setFocusEvolutionNodeId(null);
                            setGameState(p => ({ ...p, isMenuOpen: false }));
                        }}
                        onReturnToMenu={handleReturnToMenu}
                        onClearHighlightNextNode={() => setGameState(p => ({ ...p, hasSeenHighlightNextNode: true }))}
                        /* PATCH: STEP-7 progressive-guidebook — pass live stats for entry derivation */
                        playerStats={playerStats}
                    />
                )}
            </AnimatePresence>
          </>
      )}

      {/* OVERLAYS */}
      <AnimatePresence>
          {showArchives && (
              <motion.div
                  {...({
                      initial: { opacity: 0, scale: 0.95 },
                      animate: { opacity: 1, scale: 1 },
                      exit: { opacity: 0, scale: 0.95 }
                  } as any)}
                  className="fixed inset-0 z-[60]"
              >
                  <Suspense fallback={<LoadingScreenWithTips label="LOADING ARCHIVES..." />}>
                      <Archives 
                          settings={gameState.settings} 
                          seenEnemyIds={gameState.seenEnemyIds}
                          newArchiveEnemyIds={gameState.newArchiveEnemyIds || []}
                          onClearNewArchives={handleClearNewArchives}
                          bossTrophies={gameState.bossTrophies || {}}
                          onClose={() => { setShowArchives(false); }} 
                          maxWave={gameState.maxWaveReached || 1} 
                      />
                  </Suspense>
              </motion.div>
          )}
      </AnimatePresence>

      <AnimatePresence>
          {showAchievements && (
              <motion.div
                  {...({
                      initial: { opacity: 0, scale: 0.95 },
                      animate: { opacity: 1, scale: 1 },
                      exit: { opacity: 0, scale: 0.95 }
                  } as any)}
                  className="fixed inset-0 z-[60]"
              >
                  <AchievementList settings={gameState.settings} 
                    unlockedIds={gameState.unlockedAchievementIds}
                    newAchievementIds={gameState.newAchievementIds || []}
                    onClearNewAchievements={handleClearNewAchievements}
                    onClose={() => { setShowAchievements(false); }} 
                  />
              </motion.div>
          )}
      </AnimatePresence>

      <AnimatePresence>
          {showSettings && (
              <SettingsMenu 
                settings={gameState.settings} 
                onUpdateSettings={handleUpdateSettings} 
                onClose={() => { setShowSettings(false); }}
                onDeleteSave={resetSave}
                /* PATCH: STEP-6/7 progressive-guidebook — forward context */
                gameState={gameState}
                playerStats={playerStats}
                onUnlockAllPlaces={handleUnlockAllPlaces}
              />
          )}
      </AnimatePresence>

      <AnimatePresence>
          {showStarChart && (
              <motion.div
                  {...({
                      initial: { opacity: 0, scale: 0.95 },
                      animate: { opacity: 1, scale: 1 },
                      exit: { opacity: 0, scale: 0.95 }
                  } as any)}
                  className="fixed inset-0 z-[60]"
              >
                  <Suspense fallback={<LoadingScreenWithTips label="LOADING STAR CHART..." />}>
                  <StarChart settings={gameState.settings}
                      onUpdateSettings={handleUpdateSettings}
                      runPath={gameState.currentRunPath || []}
                      visitedNodeIds={gameState.visitedNodeIds || []}
                      completedSpecialMissions={gameState.completedSpecialMissions || []}
                      playedCinematicNodeIds={gameState.playedCinematicNodeIds || []}
                      maxWaveReached={gameState.maxWaveReached || 1}
                      currentMapId={gameState.currentMapId || ''}
                      specialMissionKeys={gameState.specialMissionKeys || 0}
                      discoveredSecretIds={gameState.discoveredSecretIds || []}
                      map1SideMissionCompleted={gameState.map1SideMissionCompleted || false}
                      map1EventCompleted={gameState.map1EventCompleted || false}
                      onDiscoverSecret={handleDiscoverSecret}
                      onUpdateSpecialMissionKeys={handleUpdateSpecialMissionKeys}
                      onCinematicPlayed={(nodeId) => {
                          setGameState(p => {
                              const alreadyPlayed = (p.playedCinematicNodeIds || []).includes(nodeId);
                              if (alreadyPlayed) return p;
                              return {
                                  ...p,
                                  playedCinematicNodeIds: [...(p.playedCinematicNodeIds || []), nodeId]
                              };
                          });
                      }}
                      onTravelToNode={(nodeId) => {
                          const targetNode = (gameState.currentRunPath || []).find(n => n.id === nodeId);
                          if (targetNode?.regionId) {
                              loadAndDecodeRegionBackground(targetNode.regionId).catch(() => {});
                              const nextReg = getRegionBackground(targetNode.regionId).nextRegionId;
                              if (nextReg) audio.preloadPlaceSoundtrackIdle(nextReg);
                          }
                          setGameState(p => {
                              const nextRunPath = (p.currentRunPath || []).map(node => {
                                  if (node.id === nodeId) {
                                      return { ...node, state: node.state === 'VISITED' ? ('VISITED' as const) : ('CURRENT' as const) };
                                  }
                                  return node;
                              });
                              return {
                                  ...p,
                                  currentMapId: nodeId,
                                  currentRunPath: nextRunPath,
                                  sideMission: undefined
                              };
                          });
                      }}

                      onCollectTreasure={(nodeId, essence) => {
                          // Award essence (matter) and mark the treasure node as visited.
                          // Treasure nodes are one-shot — they cannot be re-farmed.
                          setGameState(p => {
                              const alreadyVisited = (p.visitedNodeIds || []).includes(nodeId);
                              const nextVisited = alreadyVisited
                                  ? (p.visitedNodeIds || [])
                                  : [...(p.visitedNodeIds || []), nodeId];
                              const nextRunPath = (p.currentRunPath || []).map(node =>
                                  node.id === nodeId ? { ...node, state: 'VISITED' as const } : node
                              );
                              /* PATCH: STEP-6 progressive-guidebook — count first-time treasure clears
                                 so the "Essence Caches" entry unlocks in the Cosmic Manual. */
                              const nextTreasureCount = alreadyVisited
                                  ? (p.treasureNodesCompleted || 0)
                                  : (p.treasureNodesCompleted || 0) + 1;
                              return {
                                  ...p,
                                  matter: p.matter + essence,
                                  visitedNodeIds: nextVisited,
                                  currentRunPath: nextRunPath,
                                  treasureNodesCompleted: nextTreasureCount
                              };
                          });
                      }}
                      
                      onClose={() => {
                          performTransition(() => {
                              setShowStarChart(false);
                              if (gameState.isGameRunning) {
                                  setGameState(p => ({ ...p, isGameRunning: false, isMenuOpen: false }));
                              }
                          });
                      }}
                      onSelectMap={(nodeId, selectedWave) => {
                          const node = (gameState.currentRunPath || []).find(n => n.id === nodeId);
                          if (node) {
                              if (node.regionId) {
                                  loadAndDecodeRegionBackground(node.regionId).catch(() => {});
                                  const nextReg = getRegionBackground(node.regionId).nextRegionId;
                                  if (nextReg) audio.preloadPlaceSoundtrackIdle(nextReg);
                              }
                              performTransition(() => {
                                  setIsVoidRushMode(false);
                                  setShowStarChart(false);
                                  // Use chosen wave, or fall back to default
                                  let waveToStart = selectedWave;
                                  if (waveToStart === undefined || waveToStart === 0) {
                                      waveToStart = node.waveRange[0];
                                  }
                                  setStartWave(waveToStart);
                                  setGameState(p => ({ 
                                      ...p, 
                                      specialMissionKeys: node.type === 'SECRET' ? Math.max(0, (p.specialMissionKeys || 0) - 1) : (p.specialMissionKeys || 0),
                                      currentMapId: nodeId, 
                                      sideMission: undefined,
                                      isGameRunning: true, 
                                      isMenuOpen: false 
                                  }));
                                  setGameKey(k => k + 1);
                                  setIsPauseBlocked(false);
                              });
                          }
                      }}
                  />
                  </Suspense>
              </motion.div>
          )}
      </AnimatePresence>


      {/* Semi Boss Epic Entrance Vignette */}
      <AnimatePresence>
          {semiBossVignetteColor && (
              <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 0.8 }}
                  exit={{ opacity: 0, transition: { duration: 1.5 } }}
                  style={{
                      position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 40,
                      background: `radial-gradient(circle, transparent 40%, ${semiBossVignetteColor}40 80%, ${semiBossVignetteColor}80 100%)`
                  }}
              />
          )}
      </AnimatePresence>

      {/* Cinematic dialogue when all treasures are cleared */}
      <AnimatePresence>
          {activeAppCinematic && (
              <CinematicOverlay lang={gameState.settings.language || "en"} 
                  script={activeAppCinematic}
                  onComplete={() => setActiveAppCinematic(null)}
                  onVisualAction={(action) => {
                      if (action === 'DOUBLE_ESSENCE_BURST') {
                          audio.playEpicWin?.();
                      }
                  }}
              />
          )}
      </AnimatePresence>
    </div>
  );
};

export default App;
