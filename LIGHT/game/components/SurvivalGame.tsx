
import React, { useEffect, useRef, useState } from 'react';
import { PlayerStats, Settings } from '../types';
import { MutableGameState, ParticleType } from './game/types';
import { InputHandler } from './game/Input';
import { updateGame } from './game/Logic';
import { resetDirector } from './game/logic/Director';
import { startWaveFlavor } from './game/waveFlavors';
import { WORLD_SIZE, IS_DEMO, DEMO_MAX_WAVE, MAX_WAVE, waveKillQuota, waveTimerSec, DEBUG, chapterIndexOf, CHAPTERS, ChapterDef } from './game/Constants';
import ChapterCard from './ChapterCard';
import { renderGame } from './game/Renderer';
import { onPlayerHurt, setFeelSettings } from './game/Feel';
import { applyRunModifiers, incomingDamageMult } from './game/logic/RunStats'; // (3A)
import { spawnExplosion, createParticle, updateParticles } from './game/Particles';
import GameOver from './GameOver';
import { bossHint } from '../data/bossHints';
import WinGame from './WinGame';
import CinematicOverlay from './CinematicOverlay';
import MobileControls from './MobileControls';
import GameOverlay from './GameOverlay';
import BossBar, { BossBarInfo } from './BossBar';
import { isPhaseShifting, enrageCountdown } from './game/logic/enemies/BossKit';
import { INTRO_SCRIPT, CinematicLine } from '../data/cinematics';
import { BOSS_SCRIPTS } from '../data/bossCinematics';
import { storyLinesForWave, StoryLine } from '../data/story';
import StoryCaption from './StoryCaption';
import { MATURITY_LEVELS } from '../data/maturity';
import { LIGHT_PHRASES } from '../data/lightPhrases';
import { VOID_PHRASES } from '../data/phrases';
import { VFX } from './game/Emitters';

interface SurvivalGameProps {
  playerStats: PlayerStats;
  onCollectMatter: (amount: number) => void;
  paused: boolean;
  onRestart: (startWave?: number) => void;
  onEnemySeen: (id: string) => void;
  initialWave: number;
  maxWaveReached: number;
  onUpdateMaxWave: (wave: number) => void;
  onReturnToMenu: () => void;
  /** (2D) Stay/Leave chosen on the ending screen. */
  onEndingSeen?: (choice: 'stay' | 'leave') => void;
  onLandmarkSeen?: (id: string) => void; // (3A) → gameState.landmarksSeen
  onKills?: (counts: Record<string, number>) => void; // (3B) → gameState.killCounts
  onChapterChange?: (chapter: ChapterDef) => void;   // (3B step 5) → StarBackground tint
  onTogglePause: () => void;
  hasSeenIntro: boolean;
  onIntroComplete: () => void;
  settings: Settings;
  onUpdateMaxMaturity: (level: number) => void;
  onBossDefeated: (bossId: string) => void;
  onBlockPauseMenu: (blocked: boolean) => void;
  onTransition: (callback: () => void) => void;
}

const GET_MATURITY = (matter: number) => {
    // Calculate maturity based on matter
    const levelIndex = Math.min(MATURITY_LEVELS.length - 1, Math.floor(Math.sqrt(matter / 120))); 
    return { 
        level: levelIndex, 
        ...MATURITY_LEVELS[levelIndex]
    };
};

const SurvivalGame: React.FC<SurvivalGameProps> = ({ 
    playerStats, 
    onCollectMatter, 
    paused, 
    onRestart, 
    onEndingSeen,
    onLandmarkSeen,
    onKills,
    onChapterChange,
    onEnemySeen,
    initialWave,
    maxWaveReached,
    onUpdateMaxWave,
    onReturnToMenu,
    onTogglePause,
    hasSeenIntro,
    onIntroComplete,
    settings,
    onUpdateMaxMaturity,
    onBossDefeated,
    onBlockPauseMenu,
    onTransition
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [inputInstance, setInputInstance] = useState<InputHandler | null>(null);
  
  // Initialize state with props
  const [wave, setWave] = useState(initialWave);
  // (3B) non-pausing story caption: lines for the wave that just started
  const [storyLines, setStoryLines] = useState<StoryLine[] | null>(
      initialWave === 1 && !hasSeenIntro ? null : storyLinesForWave(initialWave) // intro case: set when the intro ends
  );
  // (3B step 5) chapter title card: shows on run start (after the intro) and on every chapter change
  const [chapterCard, setChapterCard] = useState<{ chapter: ChapterDef; seq: number } | null>(
      initialWave === 1 && !hasSeenIntro ? null : { chapter: CHAPTERS[chapterIndexOf(initialWave) - 1], seq: chapterIndexOf(initialWave) }
  );
  useEffect(() => { onChapterChange?.(CHAPTERS[chapterIndexOf(initialWave) - 1]); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const showChapterCard = (w: number) => {
      const ci = chapterIndexOf(w);
      const ch = CHAPTERS[ci - 1];
      setChapterCard({ chapter: ch, seq: ci });
      onChapterChange?.(ch);
  };
  
  // --- CINEMATIC STATE MANAGEMENT ---
  // We use a generic 'activeCinematic' state to hold the script currently playing.
  // If null, no cinematic is playing.
  const [activeCinematic, setActiveCinematic] = useState<CinematicLine[] | null>(
      initialWave === 1 && !hasSeenIntro ? INTRO_SCRIPT : null
  );

  const gameStateRef = useRef<MutableGameState>({
    player: { 
        x: 0, y: 0, vx: 0, vy: 0, 
        dashTimer: 0, dashCooldownTimer: 0, 
        fireBlastTimer: 0, thunderChainTimer: 0, iceNovaTimer: 0,
        homingMissileTimer: 0, fireflyTimer: 0, nebulaTrailTimer: 0,
        singularityTimer: 0, solarFlareTimer: 0, titanShieldTimer: 0,
        titanShieldDuration: 0,
        stationaryTimer: 0,
        isTitanShieldActive: false,
        size: 10, color: '#fff' 
    },
    enemies: [], 
    projectiles: [],
    particles: [], 
    drops: [],
    camera: { x: 0, y: 0 }, 
    mouse: { x: 0, y: 0 },
    frame: 0, 
    worldSize: WORLD_SIZE,
    seenEnemyIds: [],
    maxWaveReached: maxWaveReached,
    bossSpawnedWave: 0,
    waveKills: 0,
    waveStartedFrame: 0,
    totalKills: 0
  });

  const [currentHealth, setCurrentHealth] = useState(playerStats.maxHealth);
  const [currentShield, setCurrentShield] = useState(0); 
  const [relics, setRelics] = useState<string[]>([]); // (3A) relic ids held this run (HUD)
  const relicsRef = useRef(0);
  
  const [gameOver, setGameOver] = useState(false);
  const [deathBoss, setDeathBoss] = useState<{ name: string; hint?: string } | null>(null); // (2B)
  const [gameWon, setGameWon] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(waveTimerSec(initialWave));
  const [waveKills, setWaveKills] = useState(0); // (2A) mirrored from state for the HUD
  const [bossInfo, setBossInfo] = useState<BossBarInfo | null>(null); // (2B) boss HUD mirror
  const [sessionMatter, setSessionMatter] = useState(0);
  const [currentPhrase, setCurrentPhrase] = useState(LIGHT_PHRASES[Math.min(initialWave - 1, LIGHT_PHRASES.length - 1)]);
  const [darknessPhrase, setDarknessPhrase] = useState(VOID_PHRASES[0]);

  const regenAccRef = useRef(0);
  const shieldCooldownRef = useRef(0); 
  const shieldRegenAccRef = useRef(0); 
  const phraseTimerRef = useRef(0);
  
  const maturity = GET_MATURITY(sessionMatter);
  
  const calculatedShield = Math.floor((maturity.scale - 1.0) * 2.5);
  const maxShield = Math.min(5, Math.max(0, calculatedShield));

  useEffect(() => {
      onUpdateMaxMaturity(maturity.level);
  }, [maturity.level, maxShield, onUpdateMaxMaturity]);

  // Block Pause Menu when in cinematic or end states
  useEffect(() => {
      onBlockPauseMenu(!!activeCinematic || gameOver || gameWon);
  }, [activeCinematic, gameOver, gameWon, onBlockPauseMenu]);

  // Use a Ref for game state access inside the loop
  const gameRefs = useRef({ 
      playerStats, 
      wave, 
      timeRemaining, 
      paused, 
      gameOver, 
      gameWon, 
      maturityScale: maturity.scale, 
      color: maturity.color, 
      onEnemySeen, 
      onUpdateMaxWave, 
      maxWaveReached, 
      activeCinematic, 
      onBossDefeated,
      currentShield, 
      currentHealth,
      settings,
      onTransition // Added callback ref
  });

  useEffect(() => {
      gameRefs.current = { 
          playerStats, 
          wave, 
          timeRemaining, 
          paused, 
          gameOver, 
          gameWon, 
          maturityScale: maturity.scale, 
          color: maturity.color, 
          onEnemySeen, 
          onUpdateMaxWave, 
          maxWaveReached, 
          activeCinematic, 
          onBossDefeated,
          currentShield,
          currentHealth,
          settings,
          onTransition
      };
  }, [playerStats, wave, timeRemaining, paused, gameOver, gameWon, maturity.scale, maturity.color, onEnemySeen, onUpdateMaxWave, maxWaveReached, activeCinematic, onBossDefeated, currentShield, currentHealth, settings, onTransition]);

  // (2A) Single place where a wave ends. Enemies are NEVER wiped here:
  // survivors get `carried = true` (+10 % essence, faint ring) and stay.
  // Returns false when the run is won instead.
  const advanceWave = (): boolean => {
      const refs = gameRefs.current;
      const state = gameStateRef.current;
      const nextWave = refs.wave + 1;

      if ((IS_DEMO && nextWave > DEMO_MAX_WAVE) || nextWave > MAX_WAVE) {
          setGameWon(true);
          setTimeRemaining(0);
          return false;
      }

      setWave(nextWave);
      refs.wave = nextWave; // keep the loop in sync before React re-renders
      if (nextWave > refs.maxWaveReached) refs.onUpdateMaxWave(nextWave);
      setCurrentPhrase(LIGHT_PHRASES[Math.min(nextWave, LIGHT_PHRASES.length - 1)]);
      setStoryLines(storyLinesForWave(nextWave)); // (3B) null on waves without a beat
      if (chapterIndexOf(nextWave) !== chapterIndexOf(nextWave - 1)) showChapterCard(nextWave); // (3B step 5) new chapter

      state.enemies.forEach(e => { if (!e.isBoss) e.carried = true; });
      state.waveKills = 0;
      state.waveStartedFrame = state.frame;
      resetDirector(state);          // (4B) a pack lands early in every wave
      startWaveFlavor(state, nextWave); state.flavorArmedWave = nextWave; // (4B) special wave at x5 (banner + rules), clears the old one
      setWaveKills(0);
      setTimeRemaining(waveTimerSec(nextWave));
      return true;
  };
  const advanceWaveRef = useRef(advanceWave);
  advanceWaveRef.current = advanceWave;

  // Handle Cinematic Logic
  const handleCinematicComplete = () => {
      onTransition(() => {
          const cinematic = activeCinematic;
          setActiveCinematic(null);

          if (cinematic === INTRO_SCRIPT) {
              onIntroComplete();
              setStoryLines(storyLinesForWave(gameRefs.current.wave)); // (3B) chapter 1 opener after the intro
              showChapterCard(gameRefs.current.wave); // (3B step 5) chapter 1 card after the intro
          }
          
          const state = gameStateRef.current;
          if (!state.activeBoss && !gameOver && !gameWon && cinematic !== INTRO_SCRIPT && state.bossKilledWave !== undefined) {
              // Boss outro finished → the boss wave is complete now.
              state.bossKilledWave = undefined;
              advanceWaveRef.current();
          }
      });
  };

  const handleCinematicVisual = (action: string) => {
      const state = gameStateRef.current;
      
      // INTRO ACTIONS
      if (action === 'SPARK_FORM') {
          createParticle(state, 0, 0, ParticleType.GLOW, '#fff', { life: 300, size: 4 });
      } else if (action === 'EXPLOSION') {
          spawnExplosion(state, 0, 0, '#fff', ParticleType.BOSS_AURA);
          spawnExplosion(state, 0, 0, '#fbbf24', ParticleType.FIRE);
          spawnExplosion(state, 0, 0, '#fff', ParticleType.BOSS_AURA);
      } 
      
      // BOSS GENERIC ACTIONS
      else if (action === 'BOSS_SPAWN_ROAR') {
          // Shake and Flash
          VFX.castShockwave(state, 0, -600, '#fff'); // Approx spawn loc
          state.camera.x += (Math.random() - 0.5) * 50;
          state.camera.y += (Math.random() - 0.5) * 50;
      }
      else if (action === 'BOSS_DEATH_FLARE') {
          // Massive White Explosion
          VFX.castSuperDashExplosion(state, state.player.x, state.player.y);
          spawnExplosion(state, state.player.x, state.player.y, '#fde047', ParticleType.BOSS_AURA);
          spawnExplosion(state, state.player.x, state.player.y, '#fde047', ParticleType.BOSS_AURA);
          createParticle(state, state.player.x, state.player.y, ParticleType.RING, '#fff', { life: 60, size: 50, speed: 0 });
      } else if (action === 'SCREEN_SHAKE_LOW') {
          // Subtle shake
          state.camera.x += (Math.random() - 0.5) * 20;
          state.camera.y += (Math.random() - 0.5) * 20;
      } else if (action === 'RED_GLOW') {
          // Red tint particles
          for(let i=0; i<20; i++) {
              createParticle(state, 
                  state.player.x + (Math.random()-0.5)*window.innerWidth, 
                  state.player.y + (Math.random()-0.5)*window.innerHeight, 
                  ParticleType.GLOW, '#7f1d1d', { life: 100, size: 200, alpha: 0.2, speed: 0 }
              );
          }
      } else if (action === 'WHITE_FLASH') {
          // Big flash
          spawnExplosion(state, state.player.x, state.player.y, '#fff', ParticleType.BOSS_AURA);
          state.particles.push({
              x: state.player.x, y: state.player.y, vx: 0, vy: 0, 
              life: 20, maxLife: 20, size: 2000, color: '#fff', type: ParticleType.GLOW, alpha: 0.8
          });
      }
  };

  const handleDamage = (amount: number) => {
      // (4A) 0.3 s i-frames after any hit; also pulses the vignette + shake
      if (!onPlayerHurt(gameStateRef.current)) return;
      // (3A) Ward shrine: -15 % damage taken (rounded, never below 1)
      let remainingDamage = Math.max(1, Math.round(amount * incomingDamageMult(gameStateRef.current.runModifiers)));
      const shield = gameRefs.current.currentShield;
      
      if (shield > 0) {
          const absorbed = Math.min(shield, remainingDamage);
          gameRefs.current.currentShield = Math.max(0, shield - absorbed);
          setCurrentShield(prev => Math.max(0, prev - absorbed));
          remainingDamage -= absorbed;
      }

      if (remainingDamage > 0) {
          const currentHp = gameRefs.current.currentHealth;
          const nextHp = Math.max(0, currentHp - remainingDamage);
          gameRefs.current.currentHealth = nextHp; 
          setCurrentHealth(nextHp); 

          if (nextHp <= 0) {
              // (2B) death hint: only if a boss is alive and was the last thing that hurt us
              const st = gameStateRef.current;
              const b = st.activeBoss;
              setDeathBoss(b && st.lastBossHit === b.def.id ? { name: b.def.name, hint: bossHint(b.def.id) } : null);
              setGameOver(true);
          }
      }

      const regenStat = gameRefs.current.playerStats.healthRegen;
      const delaySeconds = Math.max(1, 5 - (regenStat * 0.5));
      shieldCooldownRef.current = delaySeconds * 60;
  };

  useEffect(() => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext('2d')!;
    const input = new InputHandler();
    setInputInstance(input);

    let anim: number;
    let timerInterval: any;

    const loop = () => {
        const refs = gameRefs.current;
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;

        // CINEMATIC MODE RENDERER
        if (refs.activeCinematic) {
            const state = gameStateRef.current;
            state.frame++;
            updateParticles(state);
            
            // PITCH BLACK BACKGROUND FOR ALL CINEMATICS
            ctx.fillStyle = '#000000';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            // Render particles on top of cinematic bg
            ctx.save();
            ctx.translate(canvas.width / 2 - state.camera.x, canvas.height / 2 - state.camera.y);
            // If intro, center particles. If game cinematic, use world coords relative to cam.
            if (refs.activeCinematic === INTRO_SCRIPT) {
                 ctx.translate(state.camera.x, state.camera.y); // Cancel out cam for intro centered
            }
            
            ctx.globalCompositeOperation = 'lighter'; 
            state.particles.forEach(p => {
                ctx.globalAlpha = p.alpha ?? 1;
                ctx.fillStyle = p.color;
                ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI*2); ctx.fill();
            });
            ctx.globalAlpha = 1;
            ctx.globalCompositeOperation = 'source-over';
            ctx.restore();
            
            anim = requestAnimationFrame(loop);
            return;
        }

        // NORMAL GAME LOOP
        if (!refs.paused && !refs.gameOver && !refs.gameWon) {
            const state = gameStateRef.current;
            const wasBossActive = !!state.activeBoss;
            // (4A) feel toggles + HP mirror for the low-HP tint
            setFeelSettings({ screenShake: refs.settings.screenShake !== false, reduceFlash: !!refs.settings.reduceFlash });
            state.showMinimap = refs.settings.showMinimap !== false; // (3A)
            // (3A) run layer: tree stats × shrine/relic modifiers → what every system reads this frame
            const runStats = applyRunModifiers(refs.playerStats, state.runModifiers);
            // (3A) heal / shield requests from shrines & events (fractions of *effective* max HP)
            if (state.healRequest) {
                const add = Math.max(1, Math.round(runStats.maxHealth * state.healRequest));
                const nextHp = Math.min(runStats.maxHealth, refs.currentHealth + add);
                gameRefs.current.currentHealth = nextHp; setCurrentHealth(nextHp);
                state.healRequest = undefined;
            }
            if (state.shieldRequest) {
                const nextSh = Math.min(5, refs.currentShield + Math.round(state.shieldRequest));
                gameRefs.current.currentShield = nextSh; setCurrentShield(nextSh);
                state.shieldRequest = undefined;
            }
            if (state.landmarkSeenQueue?.length) {
                for (const id of state.landmarkSeenQueue) onLandmarkSeen?.(id);
                state.landmarkSeenQueue = undefined;
            }
            if (state.killCountQueue && state.frame % 60 === 0) { // (3B) flush once a second, not per kill
                onKills?.(state.killCountQueue);
                state.killCountQueue = undefined;
            }
            if (state.world?.relics && relicsRef.current !== state.world.relics.length) {
                relicsRef.current = state.world.relics.length;
                setRelics([...state.world.relics]);
            }
            state.hpRatio = refs.playerStats.maxHealth > 0 ? refs.currentHealth / refs.playerStats.maxHealth : 1;
            const bossId = state.activeBoss?.def.id;
            
            updateGame(state, runStats, input, refs.wave, refs.timeRemaining, 
                (v) => { onCollectMatter(v); setSessionMatter(m => m + v); },
                handleDamage,
                (id) => refs.onEnemySeen(id),
                canvas.width, canvas.height, refs.maturityScale, refs.color,
                refs.settings.mouseMovementEnabled
            );

            // (2A) mirror the kill counter for the HUD; expose state for `?debug=1` smoke tests
            if (state.frame % 10 === 0) {
                setWaveKills(state.waveKills);
                // (2B) boss bar mirror (every 10 f is plenty for a 150 ms-eased bar)
                const b = state.activeBoss;
                if (b && !b.state.custom?.cinematicMode) {
                    setBossInfo({ name: b.def.name, color: b.def.glowColor, hpPct: b.hp / b.maxHp, phase: b.state.phase ?? 1,
                        shifting: isPhaseShifting(b), enraged: !!state.bossEnraged, enrageIn: enrageCountdown(state) });
                } else setBossInfo(prev => (prev ? null : prev));
                if (DEBUG) (window as any).__LIGHT = { state, wave: refs.wave, time: refs.timeRemaining };
            }

            // Boss Shout Update
            if (state.activeBoss?.state?.custom?.shout) {
                setDarknessPhrase(state.activeBoss.state.custom.shout);
                state.activeBoss.state.custom.shout = '';
            }

            // Check if boss just died
            if (wasBossActive && !state.activeBoss && bossId) {
                refs.onBossDefeated(bossId);
                
                // TRIGGER OUTRO CINEMATIC
                // Check specifically if an outro script exists AND is not empty
                const outroScript = BOSS_SCRIPTS[bossId]?.outro;
                if (outroScript && outroScript.length > 0) {
                    refs.onTransition(() => setActiveCinematic(outroScript));
                } else if (bossId === 'darkness') {
                    // Darkness has no outro text, but triggers WIN immediately
                    setGameWon(true);
                } else {
                    // No outro script: boss death completes the wave immediately (2A)
                    state.bossKilledWave = undefined;
                    advanceWaveRef.current();
                }
            }
            
            // Check for Boss Spawn (To Trigger Intro)
            if (state.bossSpawnedWave === refs.wave && state.activeBoss && !wasBossActive) {
                // Boss just appeared this frame in Logic.ts
                const id = state.activeBoss.def.id;
                if (BOSS_SCRIPTS[id]?.intro) {
                    refs.onTransition(() => setActiveCinematic(BOSS_SCRIPTS[id].intro!));
                }
            }

            // --- REGEN LOGIC (Per Frame) ---
            const maxHp = runStats.maxHealth;
            if (runStats.healthRegen > 0 && refs.currentHealth < maxHp) {
                regenAccRef.current += runStats.healthRegen / 60;
                if (regenAccRef.current >= 1) {
                    const nextHp = Math.min(maxHp, refs.currentHealth + 1);
                    gameRefs.current.currentHealth = nextHp; 
                    setCurrentHealth(nextHp); 
                    regenAccRef.current -= 1;
                }
            }

            const currentMaturityMaxShield = Math.min(5, Math.max(0, Math.floor((refs.maturityScale - 1.0) * 2.5)));
            
            if (shieldCooldownRef.current > 0) {
                shieldCooldownRef.current--;
            } else if (refs.currentShield < currentMaturityMaxShield) {
                const regenRatePerSec = 0.5 + (runStats.healthRegen * 0.2);
                shieldRegenAccRef.current += regenRatePerSec / 60;
                if (shieldRegenAccRef.current >= 1) {
                    gameRefs.current.currentShield = Math.min(currentMaturityMaxShield, refs.currentShield + 1);
                    setCurrentShield(s => Math.min(currentMaturityMaxShield, s + 1));
                    shieldRegenAccRef.current -= 1;
                    createParticle(state, state.player.x, state.player.y, ParticleType.GLOW, '#fbbf24', { life: 20, size: 5, speed: 2 });
                }
            }
        }
        renderGame(ctx, gameStateRef.current, applyRunModifiers(refs.playerStats, gameStateRef.current.runModifiers), canvas.width, canvas.height, refs.maturityScale, refs.color);
        anim = requestAnimationFrame(loop);
    };

    timerInterval = setInterval(() => {
        const refs = gameRefs.current;
        // Don't tick timer if cinematic is active
        if (!refs.activeCinematic && !refs.paused && !refs.gameOver && !refs.gameWon) {
            
            phraseTimerRef.current += 1;
            if (phraseTimerRef.current >= 5) {
                setDarknessPhrase(VOID_PHRASES[Math.floor(Math.random() * VOID_PHRASES.length)]);
                phraseTimerRef.current = 0;
            }

            const state = gameStateRef.current;
            if (state.activeBoss) return;               // boss waves end on boss death
            if (state.bossKilledWave !== undefined) return; // waiting for the outro

            // (2A) advance on kill quota OR timer; never wipe enemies.
            if (state.waveKills >= waveKillQuota(refs.wave)) {
                advanceWaveRef.current();
                return;
            }
            setTimeRemaining(p => {
                if (p <= 1) {
                    advanceWaveRef.current();
                    return p; // advanceWave already set the new timer
                }
                return p - 1;
            });
        }
    }, 1000);

    loop();
    return () => { 
        cancelAnimationFrame(anim); 
        clearInterval(timerInterval);
        input.cleanup(); 
    };
  }, [maxShield]); 

  return (
    <div className={`absolute inset-0 ${!paused && !gameOver && !gameWon && !activeCinematic ? 'cursor-none' : ''}`}>
      <canvas ref={canvasRef} className="block" />
      
      {activeCinematic && (
          <CinematicOverlay 
              script={activeCinematic} 
              onComplete={handleCinematicComplete} 
              onVisualAction={handleCinematicVisual}
          />
      )}

      {inputInstance && settings.showTouchControls && !activeCinematic && !paused && !gameOver && !gameWon && (
          <MobileControls input={inputInstance} onOpenMenu={onTogglePause} />
      )}

      {!activeCinematic && !gameOver && !gameWon && bossInfo && <BossBar info={bossInfo} />}

      {!activeCinematic && !gameOver && !gameWon && (
          <StoryCaption lines={storyLines} seq={wave} raised={!!settings.showTouchControls} />
      )}

      {!activeCinematic && !gameOver && !gameWon && (
          <ChapterCard chapter={chapterCard?.chapter ?? null} seq={chapterCard?.seq ?? 0} />
      )}

      {!activeCinematic && !gameOver && !gameWon && (
          <GameOverlay 
            playerStats={playerStats}
            currentHealth={currentHealth}
            currentShield={currentShield}
            relics={relics}
            timeRemaining={timeRemaining}
            wave={wave}
            waveKills={waveKills}
            waveQuota={waveKillQuota(wave)}
            currentPhrase={currentPhrase}
            darknessPhrase={darknessPhrase}
            maturity={maturity}
          />
      )}

      {gameOver && (
        <GameOver 
            wave={wave}
            maxWaveReached={maxWaveReached} 
            maturityTitle={maturity.title} 
            deathBoss={deathBoss}
            onRestart={onRestart} 
            onReturnToMenu={onReturnToMenu}
        />
      )}

      {gameWon && (
          <WinGame 
            onRestart={() => onRestart(1)} 
            onReturnToMenu={onReturnToMenu}
            onEndingSeen={onEndingSeen}
            stats={{ kills: gameStateRef.current.totalKills || 0, wave }}
          />
      )}
    </div>
  );
};

export default SurvivalGame;
