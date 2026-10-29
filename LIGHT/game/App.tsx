
import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

import StarBackground from './components/StarBackground';
import SurvivalGame from './components/SurvivalGame';
import { Audio } from './audio/AudioManager';
import { MAX_WAVE, RESPEC_TAX } from './components/game/Constants';
import Archives from './components/Archives';
import Guidebook from './components/Guidebook'; // (7A step 5)
import MainMenu from './components/MainMenu';
import AchievementList from './components/AchievementList';
import EvolutionMatrix from './components/EvolutionMatrix';
import GameHUD from './components/GameHUD';
import SettingsMenu from './components/SettingsMenu';
import TransitionOverlay from './components/TransitionOverlay';
import Gallery from './components/Gallery';

import { ABILITY_TREE_DATA } from './data';
import { checkAchievements } from './data/achievements';
import { useGameSave, lastTreeMigration } from './hooks/useGameSave';
import { usePlayerStats } from './hooks/usePlayerStats';
import { Settings } from './types';

// (5A step 6) `?gallery=1` renders the static art sheet instead of the game (docs/ART.md).
const IS_GALLERY = typeof location !== 'undefined' && new URLSearchParams(location.search).get('gallery') === '1';

const App: React.FC = () => {
  if (IS_GALLERY) return <Gallery />;
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
  const [showGuide, setShowGuide] = useState(false); // (7A step 5)
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
             if (showGuide) { setShowGuide(false); }
             else if (showArchives) { setShowArchives(false); }
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
  }, [showGuide, showArchives, showAchievements, showSettings, isInMainMenu, isPauseBlocked, gameState.isMenuOpen, setGameState, isTransitioning]);

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

  /** (7C) World-map treasure cache opened: grant matter once, remember the id. */
  const handleMapTreasure = useCallback((id: string, matter: number) => {
      setGameState(p => {
          const opened = p.mapTreasuresOpened ?? [];
          if (opened.includes(id)) return p;
          return { ...p, matter: p.matter + matter, mapTreasuresOpened: [...opened, id] };
      });
  }, [setGameState]);

  /** (7D) Place-reveal cinematic shown once per place. */
  const handleRevealSeen = useCallback((id: string) => {
      setGameState(p => {
          const seen = p.mapRevealsSeen ?? [];
          return seen.includes(id) ? p : { ...p, mapRevealsSeen: [...seen, id] };
      });
  }, [setGameState]);

  const handleAddMatter = (amount: number) => {
      setGameState(p => ({ ...p, matter: p.matter + amount }));
  };

  const handleUpdateSettings = (newSettings: Settings) => {
      setGameState(p => ({ ...p, settings: newSettings }));
  };

  // (6A) audio: unlock on first gesture, mirror volume settings into the engine
  useEffect(() => { Audio.init(); }, []);
  // (6B) title music whenever the main menu is shown; the run picks its own chapter track in advanceWave / start
  useEffect(() => { if (isInMainMenu) Audio.music('music_title', 1500); }, [isInMainMenu]);
  // (6B step 4) one delegated click sound for every <button> in menus/tree/settings; `data-sfx="back"|"none"` overrides.
  useEffect(() => {
      const onDown = (e: PointerEvent) => {
          const el = (e.target as HTMLElement | null)?.closest?.('button,[role="button"],a') as HTMLElement | null;
          if (!el || el.closest('#game-canvas,canvas')) return;
          const kind = el.dataset.sfx ?? (/back|close|return|cancel|resume/i.test(el.textContent ?? '') ? 'back' : 'click');
          if (kind === 'none') return;
          Audio.play(kind === 'back' ? 'ui_back' : 'ui_click', { vol: 0.7 });
      };
      window.addEventListener('pointerdown', onDown, { capture: true });
      return () => window.removeEventListener('pointerdown', onDown, { capture: true } as any);
  }, []);
  const { masterVolume, musicVolume, sfxVolume, muted } = gameState.settings;
  useEffect(() => {
      Audio.setSettings({ masterVolume, musicVolume, sfxVolume, muted: !!muted });
  }, [masterVolume, musicVolume, sfxVolume, muted]);

  const handleUnlock = (id: string) => {
    const node = ABILITY_TREE_DATA.find(n => n.id === id);
    if (node && gameState.matter < node.cost) Audio.play('ui_error', { vol: 0.8 }); // (6B)
    if (node && gameState.matter >= node.cost) {
        Audio.play('ui_unlock'); // (6B)
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
              Audio.play('ui_error', { vol: 0.8 }); // (6B)
              return p;
          }
          Audio.play('ui_unlock'); // (6B)
          return { ...p, matter: currentMatter, unlockedAbilityIds: newUnlocked };
      });
  };

  /** (7A) Respec: refund every unlocked node except `spark`, minus RESPEC_TAX. */
  const handleRespec = () => {
      setGameState(p => {
          const ids = p.unlockedAbilityIds.filter(id => id !== 'spark');
          if (ids.length === 0) { Audio.play('ui_error', { vol: 0.8 }); return p; }
          const spent = ids.reduce((sum, id) => sum + (ABILITY_TREE_DATA.find(n => n.id === id)?.cost ?? 0), 0);
          const refund = Math.floor(spent * (1 - RESPEC_TAX));
          Audio.play('ui_unlock');
          return { ...p, matter: p.matter + refund, unlockedAbilityIds: ['spark'] };
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
             onOpenGuide={() => { setShowGuide(true); }}
             maxWaveReached={gameState.maxWaveReached}
             onAddMatter={handleAddMatter}
             currentMatter={gameState.matter}
             onUnlockAll={handleUnlockAll}
             hasSeenIntro={gameState.hasSeenIntro}
             defeatedBosses={gameState.defeatedBosses}
             treasuresOpened={gameState.mapTreasuresOpened ?? []}
             onTreasure={handleMapTreasure}
             reduceFlash={!!gameState.settings.reduceFlash}
             revealsSeen={gameState.mapRevealsSeen ?? []}
             onRevealSeen={handleRevealSeen}
          />
      )}

      {/* --- GAME LOOP --- */}
      {!isInMainMenu && (
          <>
            <SurvivalGame 
                key={gameKey} 
                playerStats={playerStats} 
                onCollectMatter={v => setGameState(p => ({...p, matter: p.matter + v}))} 
                paused={gameState.isMenuOpen || showArchives || showAchievements || showSettings || showGuide} 
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
                onOpenTree={() => setGameState(p => ({ ...p, isMenuOpen: true }))}
                seenEnemyIdsAtStart={gameState.seenEnemyIds}
                onBlockPauseMenu={setIsPauseBlocked}
                onTransition={performTransition}
                defeatedBosses={gameState.defeatedBosses}
                treasuresOpened={gameState.mapTreasuresOpened ?? []}
                onTreasure={handleMapTreasure}
                onRevealSeen={handleRevealSeen}
            />
            
            {/* HUD */}
            {!gameState.isMenuOpen && !showArchives && !showAchievements && !showSettings && !showGuide && !isPauseBlocked && !isTransitioning && (
                <GameHUD matter={gameState.matter} touch={!!gameState.settings.showTouchControls} />
            )}

            {/* EVOLUTION MATRIX */}
            <AnimatePresence>
                {gameState.isMenuOpen && !showArchives && !showAchievements && !showSettings && !showGuide && (
                    <EvolutionMatrix 
                        gameState={gameState}
                        onUnlock={handleUnlock}
                        onBatchUnlock={handleBatchUnlock}
                        onRespec={handleRespec}
                        onOpenBestiary={() => { setShowArchives(true); }}
                        onOpenAchievements={() => { setShowAchievements(true); }}
                        onOpenSettings={() => { setShowSettings(true); }}
                        onOpenGuide={() => { setShowGuide(true); }}
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

      {showGuide && <Guidebook gameState={gameState} onClose={() => { setShowGuide(false); }} />}

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
