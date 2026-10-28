
import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

import StarBackground from './components/StarBackground';
import SurvivalGame from './components/SurvivalGame';
import { MAX_WAVE } from './components/game/Constants';
import Archives from './components/Archives';
import MainMenu from './components/MainMenu';
import AchievementList from './components/AchievementList';
import EvolutionMatrix from './components/EvolutionMatrix';
import GameHUD from './components/GameHUD';
import SettingsMenu from './components/SettingsMenu';
import TransitionOverlay from './components/TransitionOverlay';

import { ABILITY_TREE_DATA } from './data';
import { checkAchievements } from './data/achievements';
import { useGameSave, lastTreeMigration } from './hooks/useGameSave';
import { usePlayerStats } from './hooks/usePlayerStats';
import { Settings } from './types';

const App: React.FC = () => {
  const { gameState, setGameState, resetSave } = useGameSave();
  const playerStats = usePlayerStats(gameState.unlockedAbilityIds);
  const [migrationToast, setMigrationToast] = useState(lastTreeMigration);
  useEffect(() => {
    if (!migrationToast) return;
    const t = setTimeout(() => setMigrationToast(null), 7000);
    return () => clearTimeout(t);
  }, [migrationToast]);

  const [gameKey, setGameKey] = useState(0);
  // (2A) `?wave=N` is a dev/debug start wave for balance checks (1..MAX_WAVE).
  const [startWave, setStartWave] = useState(() => {
    if (typeof location === 'undefined') return 1;
    const w = parseInt(new URLSearchParams(location.search).get('wave') || '1', 10);
    return Number.isFinite(w) && w >= 1 ? Math.min(w, MAX_WAVE) : 1;
  });
  const [showArchives, setShowArchives] = useState(false);
  const [showAchievements, setShowAchievements] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [isPauseBlocked, setIsPauseBlocked] = useState(false);
  const [chapterTint, setChapterTint] = useState<string | null>(null); // (3B step 5) StarBackground tint, null in menus
  
  // Transition State
  const [isTransitioning, setIsTransitioning] = useState(false);
  
  // Logic to determine if we are in Main Menu (start screen) or in game
  const isInMainMenu = !gameState.isGameRunning;

  // --- GLOBAL KEY LISTENERS ---
  useEffect(() => {
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
      // (2A) `?wave=N` debug override wins over the menu slider.
      const debugWave = typeof location !== 'undefined' ? parseInt(new URLSearchParams(location.search).get('wave') || '', 10) : NaN;
      if (Number.isFinite(debugWave) && debugWave >= 1) wave = Math.min(debugWave, MAX_WAVE);
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
      });
  };

  /** (2D) Ending choice made (Stay → endless in 9A; Leave → credits). Persist the flag. */
  const handleEndingSeen = (_choice: 'stay' | 'leave') => {
      setGameState(p => ({ ...p, endingSeen: true }));
  };

  const handleAddMatter = (amount: number) => {
      setGameState(p => ({ ...p, matter: p.matter + amount }));
  };

  const handleUpdateSettings = (newSettings: Settings) => {
      setGameState(p => ({ ...p, settings: newSettings }));
  };

  const handleUnlock = (id: string) => {
    const node = ABILITY_TREE_DATA.find(n => n.id === id);
    if (node && gameState.matter >= node.cost) {
        setGameState(p => ({
            ...p,
            matter: p.matter - node.cost,
            unlockedAbilityIds: [...p.unlockedAbilityIds, id]
        }));
    }
  };

  const handleBatchUnlock = (ids: string[]) => {
      setGameState(p => {
          let currentMatter = p.matter;
          let newUnlocked = [...p.unlockedAbilityIds];
          let changed = false;
          const nodes = ABILITY_TREE_DATA.filter(n => ids.includes(n.id));
          nodes.sort((a,b) => a.cost - b.cost);
          
          for (const node of nodes) {
              if (newUnlocked.includes(node.id)) continue;
              if (currentMatter >= node.cost) {
                  currentMatter -= node.cost;
                  newUnlocked.push(node.id);
                  changed = true;
              }
          }
          if (!changed) {
              return p;
          }
          return { ...p, matter: currentMatter, unlockedAbilityIds: newUnlocked };
      });
  };

  const handleUnlockAll = () => {
      setGameState(p => ({
          ...p,
          unlockedAbilityIds: ABILITY_TREE_DATA.map(n => n.id)
      }));
  };
  
  /** (3A) Landmark lore card shown → remember it across runs. */
  const handleLandmarkSeen = useCallback((id: string) => {
      setGameState(p => {
          const seen = p.landmarksSeen ?? [];
          if (seen.includes(id)) return p;
          return { ...p, landmarksSeen: [...seen, id] };
      });
  }, []);

  // (3B) merge per-run kill counts into the persistent bestiary counter
  const handleKills = useCallback((counts: Record<string, number>) => {
      setGameState(p => {
          const next = { ...(p.killCounts ?? {}) };
          for (const id in counts) next[id] = (next[id] ?? 0) + counts[id];
          return { ...p, killCounts: next };
      });
  }, [setGameState]);

  const handleEnemySeen = useCallback((id: string) => {
      setGameState(p => {
          if (p.seenEnemyIds.includes(id)) return p;
          return { ...p, seenEnemyIds: [...p.seenEnemyIds, id] };
      });
  }, [setGameState]);

  const handleBossDefeated = useCallback((bossId: string) => {
      setGameState(p => {
          const newDefeated = p.defeatedBosses.includes(bossId) ? p.defeatedBosses : [...p.defeatedBosses, bossId];
          const tempState = { ...p, defeatedBosses: newDefeated };
          const newUnlocks = checkAchievements(tempState, playerStats, startWave, startWave);
          
          let nextAchievementIds = p.unlockedAchievementIds;
          if (newUnlocks.length > 0) {
              nextAchievementIds = [...p.unlockedAchievementIds, ...newUnlocks];
          }
          return { ...p, defeatedBosses: newDefeated, unlockedAchievementIds: nextAchievementIds };
      });
  }, [playerStats, startWave, setGameState]);

  const handleUpdateMaxWave = useCallback((wave: number) => {
      setGameState(p => {
          const newMax = Math.max(p.maxWaveReached || 1, wave);
          const tempState = { ...p, maxWaveReached: newMax };
          const newUnlocks = checkAchievements(tempState, playerStats, wave, startWave);
          
          let nextAchievementIds = p.unlockedAchievementIds;
          if (newUnlocks.length > 0) {
              nextAchievementIds = [...p.unlockedAchievementIds, ...newUnlocks];
          }

          return {
              ...p,
              maxWaveReached: newMax,
              unlockedAchievementIds: nextAchievementIds
          };
      });
  }, [playerStats, startWave, setGameState]);

  const handleUpdateMaxMaturity = useCallback((level: number) => {
      setGameState(p => {
          if (level > (p.maxMaturityAchieved || 0)) {
              const tempState = { ...p, maxMaturityAchieved: level };
              const newUnlocks = checkAchievements(tempState, playerStats, startWave, startWave);
              let nextAchievementIds = p.unlockedAchievementIds;
              if (newUnlocks.length > 0) {
                  nextAchievementIds = [...p.unlockedAchievementIds, ...newUnlocks];
              }
              return { ...p, maxMaturityAchieved: level, unlockedAchievementIds: nextAchievementIds };
          }
          return p;
      });
  }, [playerStats, startWave, setGameState]);

  // Check achievements on upgrade/matter collection occasionally
  useEffect(() => {
     if(!isInMainMenu) {
        const newUnlocks = checkAchievements(gameState, playerStats, startWave, startWave);
        if (newUnlocks.length > 0) {
             setGameState(p => ({
                 ...p,
                 unlockedAchievementIds: [...p.unlockedAchievementIds, ...newUnlocks]
             }));
        }
     }
  }, [gameState.matter, gameState.unlockedAbilityIds, isInMainMenu, playerStats, startWave, setGameState]);

  return (
    <div 
      className="relative w-screen h-screen overflow-hidden bg-slate-950 text-slate-100 select-none"
      onContextMenu={(e) => e.preventDefault()}
    >
      <TransitionOverlay isVisible={isTransitioning} duration={1.0} />

      {/* (1B) one-time toast after the skill-tree migration */}
      <AnimatePresence>
        {migrationToast && (
          <motion.div
            id="tree-migration-toast"
            className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] bg-slate-900/95 border border-amber-400/40 text-amber-100 text-xs font-tech tracking-wider px-4 py-2 rounded-lg shadow-xl pointer-events-none"
            {...({ initial: { y: -20, opacity: 0 }, animate: { y: 0, opacity: 1 }, exit: { y: -20, opacity: 0 } } as any)}
          >
            THE CONSTELLATION HAS BEEN REDRAWN · {migrationToast.dropped} OLD NODES REFUNDED (+{migrationToast.refunded} MATTER)
          </motion.div>
        )}
      </AnimatePresence>

      <StarBackground 
        unlockedCount={gameState.unlockedAbilityIds.length} 
        totalCount={ABILITY_TREE_DATA.length} 
        performanceMode={gameState.settings.performanceMode}
        tint={isInMainMenu ? null : chapterTint}
      />
      
      {/* --- MAIN MENU --- */}
      {isInMainMenu && (
          <MainMenu 
             onStart={handleStartGame} 
             onOpenSettings={() => { setShowSettings(true); }}
             maxWaveReached={gameState.maxWaveReached}
             onAddMatter={handleAddMatter}
             currentMatter={gameState.matter}
             onUnlockAll={handleUnlockAll}
             hasSeenIntro={gameState.hasSeenIntro}
          />
      )}

      {/* --- GAME LOOP --- */}
      {!isInMainMenu && (
          <>
            <SurvivalGame 
                key={gameKey} 
                playerStats={playerStats} 
                onCollectMatter={v => setGameState(p => ({...p, matter: p.matter + v}))} 
                paused={gameState.isMenuOpen || showArchives || showAchievements || showSettings} 
                onRestart={handleRestart}
                onReturnToMenu={handleReturnToMenu}
                onEndingSeen={handleEndingSeen}
                onTogglePause={() => { setGameState(p => ({ ...p, isMenuOpen: !p.isMenuOpen })); }}
                onEnemySeen={handleEnemySeen}
                onLandmarkSeen={handleLandmarkSeen}
                onKills={handleKills}
                onChapterChange={(ch) => setChapterTint(ch.color)}
                initialWave={startWave}
                maxWaveReached={gameState.maxWaveReached || 1}
                onUpdateMaxWave={handleUpdateMaxWave}
                hasSeenIntro={gameState.hasSeenIntro}
                onIntroComplete={() => setGameState(p => ({ ...p, hasSeenIntro: true }))}
                settings={gameState.settings}
                onUpdateMaxMaturity={handleUpdateMaxMaturity}
                onBossDefeated={handleBossDefeated}
                onBlockPauseMenu={setIsPauseBlocked}
                onTransition={performTransition}
            />
            
            {/* HUD */}
            {!gameState.isMenuOpen && !showArchives && !showAchievements && !showSettings && !isPauseBlocked && !isTransitioning && (
                <GameHUD matter={gameState.matter} />
            )}

            {/* EVOLUTION MATRIX */}
            <AnimatePresence>
                {gameState.isMenuOpen && !showArchives && !showAchievements && !showSettings && (
                    <EvolutionMatrix 
                        gameState={gameState}
                        onUnlock={handleUnlock}
                        onBatchUnlock={handleBatchUnlock}
                        onOpenBestiary={() => { setShowArchives(true); }}
                        onOpenAchievements={() => { setShowAchievements(true); }}
                        onOpenSettings={() => { setShowSettings(true); }}
                        onResume={() => { setGameState(p => ({ ...p, isMenuOpen: false })); }}
                        onReturnToMenu={handleReturnToMenu}
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
                  <Archives onClose={() => { setShowArchives(false); }} maxWave={gameState.maxWaveReached || 1} killCounts={gameState.killCounts ?? {}} />
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
                  <AchievementList 
                    unlockedIds={gameState.unlockedAchievementIds} 
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
              />
          )}
      </AnimatePresence>
    </div>
  );
};

export default App;
