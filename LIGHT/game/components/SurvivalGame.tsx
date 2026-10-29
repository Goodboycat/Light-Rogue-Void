
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { PlayerStats, Settings } from '../types';
import { MutableGameState, ParticleType } from './game/types';
import { InputHandler } from './game/Input';
import { updateGame } from './game/Logic';
import { resetDirector } from './game/logic/Director';
import { resetLightBurst } from './game/logic/LightBurst';
import { startWaveFlavor } from './game/waveFlavors';
import { WORLD_SIZE, IS_DEMO, DEMO_MAX_WAVE, MAX_WAVE, waveKillQuota, waveTimerSec, DEBUG, chapterIndexOf, CHAPTERS, ChapterDef, isBossWave, CHAPTER_CARD_MS, WAVES_PER_CHAPTER, isEndlessWave, endlessDepth, paletteChapterOf } from './game/Constants';
import ChapterCard from './ChapterCard';
import MapBreather from './MapBreather'; // (7C)
import { renderGame } from './game/Renderer';
import { onPlayerHurt, setFeelSettings } from './game/Feel';
import { haptic, setHapticsMode } from '../utils/haptics'; // (7B)
import { setSpriteMode } from './game/renderer/SpriteRenderer';
import { fitCanvas, tickQuality, qualitySetting, installQualityCtx } from './game/Quality'; // (7B)
// (5B) `?sprites=1` forces sprite mode regardless of the setting
const SPRITES_FLAG = typeof location !== 'undefined' && new URLSearchParams(location.search).get('sprites') === '1';
import { applyRunModifiers, incomingDamageMult } from './game/logic/RunStats'; // (3A)
import { spawnExplosion, createParticle, updateParticles } from './game/Particles';
import GameOver from './GameOver';
import { bossHint } from '../data/bossHints';
import WinGame from './WinGame';
import type { RunSummaryData } from './RunSummary'; // (7A step 4)
import type { RunEndReport } from '../save/stats'; // (8A step 4)
import CinematicOverlay from './CinematicOverlay';
import MobileControls from './MobileControls';
import GameOverlay from './GameOverlay';
import BossBar, { BossBarInfo } from './BossBar';
import { isPhaseShifting, enrageCountdown } from './game/logic/enemies/BossKit';
import { INTRO_SCRIPT, CinematicLine } from '../data/cinematics';
import { storyLinesForWave, StoryLine, STORY_BEAT_WAVES } from '../data/story';
import StoryCinematicOverlay from './StoryCinematicOverlay'; // (7D)
import { storyCinematic } from '../data/cinematics'; // (7D)
import { startCinematic, updateCinematic, skipCinematic, cinematicFreezes, resolveCinematicLines, CinematicState } from './game/logic/Cinematic'; // (7D)
import { updateShake } from './game/Feel'; // (7D) decay while the sim is frozen
import { updateBigFx } from './game/BigFx'; // (7D)
import StoryCaption from './StoryCaption';
import { MATURITY_LEVELS } from '../data/maturity';
import { LIGHT_PHRASES } from '../data/lightPhrases';
import { VOID_PHRASES } from '../data/phrases';
import { VFX } from './game/Emitters';
import { Audio } from '../audio/AudioManager'; // (6B)
import { sfx } from '../audio/hooks';

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
  /** (7A) run summary → open the Evolution Matrix (pause tree) from the end screen */
  onOpenTree?: () => void;
  /** (7A) enemy ids already in the archives when this run started (for the "new in bestiary" list) */
  seenEnemyIdsAtStart?: string[];
  onTransition: (callback: () => void) => void;
  // (7C) world-map breather after bosses 1–5
  defeatedBosses?: string[];
  treasuresOpened?: string[];
  onTreasure?: (id: string, matter: number) => void;
  onRevealSeen?: (bossId: string) => void; // (7D)
  /** (8A) lifetime stats: fired once per run end (death / win / abandon) */
  onRunEnd?: (report: RunEndReport) => void;
  /** (8A) boss feats earned (`<bossId>:<feat>`), drained from state.featQueue right after the kill */
  onFeats?: (feats: string[]) => void;
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
    defeatedBosses,
    treasuresOpened,
    onTreasure,
    onRevealSeen,
    onRunEnd,
    onFeats,
    onBossDefeated,
    onBlockPauseMenu,
    onOpenTree,
    seenEnemyIdsAtStart,
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
  useEffect(() => { onChapterChange?.(CHAPTERS[chapterIndexOf(initialWave) - 1]); Audio.music(`music_ch${Math.min(6, Math.max(1, chapterIndexOf(initialWave)))}` as any, 1500); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  // (7C) breather: wave whose boss just died (10, 20 … 50); the loop is frozen while set
  const [breather, setBreather] = useState<number | null>(null);
  const breatherRef = useRef<number | null>(null);
  breatherRef.current = breather;
  // (7D) storyline cinematic mirror for the overlay (the player itself lives on state.cinematic)
  const [storyCine, setStoryCine] = useState<{ id: string; lines: StoryLine[]; noFreeze: boolean } | null>(null);
  const storyCineRef = useRef<CinematicState | null>(null);
  /** Start a storyline cinematic by id (data/cinematics.ts). Returns false when the id is unknown or one already plays. */
  const playStoryCinematic = (id: string, opts: { onEnd?: () => void; bossPos?: { x: number; y: number } } = {}): boolean => {
      const state = gameStateRef.current;
      const cine = storyCinematic(id);
      if (!cine || state.cinematic) { opts.onEnd?.(); return false; }
      const lines = resolveCinematicLines(cine.lines);
      startCinematic(state, cine, {
          bossPos: opts.bossPos,
          onEnd: () => { storyCineRef.current = null; setStoryCine(null); opts.onEnd?.(); },
      });
      storyCineRef.current = state.cinematic ?? null;
      if (!cine.noFreeze) setStoryCine({ id, lines, noFreeze: false });
      return true;
  };
  const playStoryCinematicRef = useRef(playStoryCinematic);
  playStoryCinematicRef.current = playStoryCinematic;
  const handleStorySkip = useCallback(() => { skipCinematic(gameStateRef.current); }, []);

  /** Boss of `w` died: show the map before the next chapter (never after the last boss). */
  const completeBossWave = (w: number) => {
      if (w < MAX_WAVE && isBossWave(w)) { setBreather(w); Audio.music('music_title', 1500); }
      else advanceWaveRef.current();
  };
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
    totalKills: 0,
    runStartMs: Date.now() // (7A)
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
  const [burstHud, setBurstHud] = useState<{ meter: number; level: number; ready: boolean } | null>(null); // (3B step 6)
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
      onBlockPauseMenu(!!activeCinematic || gameOver || gameWon || breather !== null || !!storyCine);
  }, [activeCinematic, gameOver, gameWon, breather, storyCine, onBlockPauseMenu]);

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

      if ((IS_DEMO && nextWave > DEMO_MAX_WAVE) || (nextWave > MAX_WAVE && initialWave <= MAX_WAVE)) { // (9A) endless runs (started at 61+) never win
          setGameWon(true); Audio.music("music_ending", 2000); // (6B)
          setTimeRemaining(0);
          return false;
      }

      setWave(nextWave);
      sfx('wave_start', 0.8, 0); // (6B)
      Audio.music(`music_ch${Math.min(6, Math.max(1, chapterIndexOf(nextWave)))}` as any, 1500); // (6B) chapter track (also restores after a boss)
      refs.wave = nextWave; // keep the loop in sync before React re-renders
      if (nextWave > refs.maxWaveReached) refs.onUpdateMaxWave(nextWave);
      setCurrentPhrase(LIGHT_PHRASES[Math.min(nextWave, LIGHT_PHRASES.length - 1)]);
      const ci = chapterIndexOf(nextWave);
      if (isEndlessWave(nextWave)) {
          // (9A) endless: palette cycles every 10 waves, WATCHER pool line on 61/71/…
          if (endlessDepth(nextWave) % WAVES_PER_CHAPTER === 1) onChapterChange?.(paletteChapterOf(nextWave));
          setStoryLines(storyLinesForWave(nextWave));
      } else if (ci !== chapterIndexOf(nextWave - 1)) {
          showChapterCard(nextWave); // (3B step 5) new chapter
          // (7D) opener = cinematic (lines spoken inside it), not the free caption
          setStoryLines(null);
          window.setTimeout(() => playStoryCinematicRef.current(`opener_${ci}`), CHAPTER_CARD_MS);
      } else {
          setStoryLines(storyLinesForWave(nextWave)); // (3B) null on waves without a beat
          // (7D) pre-boss lines (wave x9) get a 1.5 s push-in, no freeze
          if ((nextWave - 1) % WAVES_PER_CHAPTER + 1 === STORY_BEAT_WAVES.preBoss) playStoryCinematicRef.current(`preBoss_${ci}`);
      }

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
  const completeBossWaveRef = useRef(completeBossWave);
  completeBossWaveRef.current = completeBossWave;

  // Handle Cinematic Logic
  const handleCinematicComplete = () => {
      onTransition(() => {
          const cinematic = activeCinematic;
          setActiveCinematic(null);

          if (cinematic === INTRO_SCRIPT) {
              onIntroComplete();
              showChapterCard(gameRefs.current.wave); // (3B step 5) chapter 1 card after the intro
              window.setTimeout(() => playStoryCinematicRef.current('opener_1'), CHAPTER_CARD_MS); // (7D) opener cinematic
          }
          
          const state = gameStateRef.current;
          if (!state.activeBoss && !gameOver && !gameWon && cinematic !== INTRO_SCRIPT && state.bossKilledWave !== undefined) {
              // Boss outro finished → the boss wave is complete now.
              const killedWave = state.bossKilledWave;
              state.bossKilledWave = undefined;
              completeBossWave(killedWave); // (7C) map breather for chapters 1–5
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
      haptic('hurt'); // (7B)
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
              sfx('player_death', 1, 0); Audio.music(null, 1500); // (6B)
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
    installQualityCtx(ctx); // (7B) shadowBlur gated by the quality profile
    const input = new InputHandler();
    setInputInstance(input);
    resetLightBurst(gameStateRef.current); // (3B step 6) meter starts empty every run

    let anim: number;
    let timerInterval: any;

    const loop = () => {
        const refs = gameRefs.current;
        // (7B) quality profile (AUTO steps by measured fps) → DPR-capped backing store; all drawing stays in CSS px
        tickQuality(performance.now(), qualitySetting(refs.settings));
        const { w: viewW, h: viewH } = fitCanvas(canvas, ctx);

        // CINEMATIC MODE RENDERER
        if (refs.activeCinematic) {
            const state = gameStateRef.current;
            state.frame++;
            updateParticles(state);
            
            // PITCH BLACK BACKGROUND FOR ALL CINEMATICS
            ctx.fillStyle = '#000000';
            ctx.fillRect(0, 0, viewW, viewH);

            // Render particles on top of cinematic bg
            ctx.save();
            ctx.translate(viewW / 2 - state.camera.x, viewH / 2 - state.camera.y);
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

        // (7D) STORYLINE CINEMATIC — frozen sim, live render, camera driven by Cinematic.ts
        {
            const state = gameStateRef.current;
            if (state.cinematic && cinematicFreezes(state) && !refs.paused && !refs.gameOver && !refs.gameWon) {
                state.frame++;
                updateParticles(state); updateShake(state); updateBigFx(state);
                updateCinematic(state, performance.now(), viewW, viewH);
                renderGame(ctx, state, applyRunModifiers(refs.playerStats, state.runModifiers), viewW, viewH, refs.maturityScale, refs.color);
                anim = requestAnimationFrame(loop);
                return;
            }
        }

        // NORMAL GAME LOOP
        if (!refs.paused && !refs.gameOver && !refs.gameWon && breatherRef.current === null) {
            const state = gameStateRef.current;
            const wasBossActive = !!state.activeBoss;
            updateCinematic(state, performance.now(), viewW, viewH); // (7D) noFreeze push-ins / zoom ease-back
            // (4A) feel toggles + HP mirror for the low-HP tint
            setFeelSettings({ screenShake: refs.settings.screenShake !== false, reduceFlash: !!refs.settings.reduceFlash });
            setSpriteMode(SPRITES_FLAG || !!refs.settings.spriteMode); // (5B)
            setHapticsMode(refs.settings.haptics); // (7B)
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
            if (state.hpRatio < 0.25 && state.hpRatio > 0 && state.frame % 54 === 0) sfx('player_low_hp', 1, 0); // (6B) heartbeat ~0.9 s
            const bossId = state.activeBoss?.def.id;
            
            updateGame(state, runStats, input, refs.wave, refs.timeRemaining, 
                (v) => { onCollectMatter(v); setSessionMatter(m => m + v); },
                handleDamage,
                (id) => refs.onEnemySeen(id),
                viewW, viewH, refs.maturityScale, refs.color,
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
                // (3B step 6) Light Burst meter mirror
                const bu = state.burst;
                if (bu && bu.level > 0) setBurstHud(prev => (prev && prev.meter === bu.meter && prev.level === bu.level) ? prev : { meter: bu.meter, level: bu.level, ready: bu.meter >= 1 });
                else setBurstHud(prev => (prev ? null : prev));
                if (DEBUG) (window as any).__LIGHT = { state, wave: refs.wave, time: refs.timeRemaining };
            }

            // Boss Shout Update
            if (state.activeBoss?.state?.custom?.shout) {
                setDarknessPhrase(state.activeBoss.state.custom.shout);
                state.activeBoss.state.custom.shout = '';
            }

            // Check if boss just died
            if (wasBossActive && !state.activeBoss && bossId) {
                if (state.featQueue?.length) { onFeatsRef.current?.(state.featQueue); state.featQueue = undefined; } // (8A) before onBossDefeated so recordBossKill sees them
                refs.onBossDefeated(bossId);
                
                // TRIGGER OUTRO CINEMATIC
                // Check specifically if an outro script exists AND is not empty
                const deathPos = { x: state.player.x, y: state.player.y };
                if (bossId === 'darkness') {
                    // (7D) ending cinematic over the live arena, then WinGame (its own outro is skipped)
                    Audio.music("music_ending", 2000); // (6B)
                    playStoryCinematicRef.current('ending', { bossPos: deathPos, onEnd: () => setGameWon(true) });
                } else if (!isEndlessWave(refs.wave) && playStoryCinematicRef.current(`bossOutro_${bossId}`, { // (9A) no story outro for returning bosses
                    bossPos: deathPos,
                    onEnd: () => {
                        const killedWave = state.bossKilledWave ?? refs.wave;
                        state.bossKilledWave = undefined;
                        completeBossWaveRef.current(killedWave); // (7C) map breather / reveal after the outro
                    },
                })) {
                    // outro playing — completion happens in onEnd
                } else {
                    // No outro script: boss death completes the wave immediately (2A)
                    const killedWave = state.bossKilledWave ?? refs.wave;
                    state.bossKilledWave = undefined;
                    completeBossWaveRef.current(killedWave); // (7C)
                }
            }
            
            // Check for Boss Spawn (To Trigger Intro)
            if (state.bossSpawnedWave === refs.wave && state.activeBoss && !wasBossActive) {
                // Boss just appeared this frame in Logic.ts
                const id = state.activeBoss.def.id;
                Audio.music('music_boss', 1500); Audio.duck(0.5, 2500); // (6B)
                playStoryCinematicRef.current(`bossIntro_${id}`); // (7D) camera on the boss, lines, back to the spark
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
        renderGame(ctx, gameStateRef.current, applyRunModifiers(refs.playerStats, gameStateRef.current.runModifiers), viewW, viewH, refs.maturityScale, refs.color);
        anim = requestAnimationFrame(loop);
    };

    timerInterval = setInterval(() => {
        const refs = gameRefs.current;
        // Don't tick timer if cinematic is active
        if (!refs.activeCinematic && !refs.paused && !refs.gameOver && !refs.gameWon && breatherRef.current === null && !cinematicFreezes(gameStateRef.current)) {
            
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

  // (7A step 4) everything the end screens show — built once when the run ends
  const seenAtStartRef = useRef<Set<string>>(new Set(seenEnemyIdsAtStart ?? []));
  const buildRunSummary = (): RunSummaryData => {
      const st = gameStateRef.current;
      const newIds: string[] = [];
      const seen = new Set<string>();
      const add = (id?: string) => { if (id && !seen.has(id)) { seen.add(id); if (!seenAtStartRef.current.has(id)) newIds.push(id); } };
      for (const e of st.enemies) add(e.def?.id);
      Object.keys(st.runKillIds ?? {}).forEach(add);
      return {
          wave,
          kills: st.totalKills || 0,
          eliteKills: st.eliteKills ?? 0,
          bossKills: st.bossKills ?? 0,
          essence: st.essenceCollected ?? 0,
          matter: sessionMatter,
          relics: st.world?.relics.length ?? 0,
          shrines: st.world?.shrinesUsed.length ?? 0,
          landmarks: st.world?.landmarksSeen.length ?? 0,
          bestStreak: st.bestStreak ?? 0,
          burstsFired: st.burst?.fired ?? 0,
          timeMs: Date.now() - (st.runStartMs ?? Date.now()),
          newEnemyIds: newIds,
      };
  };
  const summaryRef = useRef<RunSummaryData | null>(null);
  if ((gameOver || gameWon) && !summaryRef.current) summaryRef.current = buildRunSummary();
  // (8A step 4) lifetime stats — exactly one report per run (death / win / abandon)
  const runEndSentRef = useRef(false);
  const onRunEndRef = useRef(onRunEnd); onRunEndRef.current = onRunEnd;
  const onFeatsRef = useRef(onFeats); onFeatsRef.current = onFeats;
  const sendRunEnd = (outcome: RunEndReport['outcome']) => {
      if (runEndSentRef.current) return;
      runEndSentRef.current = true;
      const st = gameStateRef.current;
      const sum = summaryRef.current ?? buildRunSummary();
      const b = st.activeBoss;
      onRunEndRef.current?.({
          outcome,
          startWave: initialWave,
          wave: gameRefs.current.wave,
          kills: sum.kills, eliteKills: sum.eliteKills, bossKills: sum.bossKills,
          essence: sum.essence, matter: sum.matter,
          relics: sum.relics, shrines: sum.shrines, landmarks: sum.landmarks,
          events: st.foundEventsCount ?? 0,
          bestStreak: sum.bestStreak, burstsFired: sum.burstsFired, timeMs: sum.timeMs,
          deathBossId: outcome === 'death' && b && st.lastBossHit === b.def.id ? b.def.id : undefined,
          feats: st.featQueue ?? [],
      });
      st.featQueue = undefined;
  };
  useEffect(() => { if (gameOver) sendRunEnd('death'); }, [gameOver]);
  useEffect(() => { if (gameWon) sendRunEnd('win'); }, [gameWon]);
  /** abandon / menu from the breather or pause: still a finished run for the lifetime counters */
  const leaveToMenu = () => { if (!gameOver && !gameWon) sendRunEnd('abandon'); onReturnToMenu(); };
  const retryChapter = (firstWave: number) => onRestart(firstWave);

  return (
    <div className={`absolute inset-0 ${!paused && !gameOver && !gameWon && !activeCinematic ? 'cursor-none' : ''}`}>
      <canvas ref={canvasRef} className="block touch-none select-none" style={{ touchAction: 'none' }} />
      
      {activeCinematic && (
          <CinematicOverlay 
              script={activeCinematic} 
              onComplete={handleCinematicComplete} 
              onVisualAction={handleCinematicVisual}
          />
      )}

      {inputInstance && settings.showTouchControls && !activeCinematic && !paused && !gameOver && !gameWon && breather === null && !storyCine && (
          <MobileControls input={inputInstance} onOpenMenu={onTogglePause} burstUnlocked={!!burstHud} burstReady={!!burstHud?.ready} />
      )}

      {!activeCinematic && !gameOver && !gameWon && bossInfo && <BossBar info={bossInfo} />}

      {/* (3B step 6) Light Burst meter — only drawn when the tree node is owned */}
      {!activeCinematic && !gameOver && !gameWon && burstHud && (
          <div id="burst-meter" className="fixed top-[72px] right-3 md:top-28 md:right-8 z-40 w-28 md:w-40 select-none pointer-events-none"
               style={{ marginTop: 'env(safe-area-inset-top, 0px)', marginRight: 'env(safe-area-inset-right, 0px)' }}>
              <div className={`flex justify-between text-[10px] font-tech tracking-[0.25em] mb-1 ${burstHud.ready ? 'text-amber-200 animate-pulse' : 'text-white/40'}`}>
                  <span>LIGHT BURST{burstHud.level > 1 ? ` ·${burstHud.level}` : ''}</span>
                  <span>{burstHud.ready ? (settings.showTouchControls ? 'TAP ☀' : 'SPACE / E') : `${Math.floor(burstHud.meter * 100)}%`}</span>
              </div>
              <div className="h-2 rounded-full bg-black/60 border border-white/10 overflow-hidden">
                  <div className="h-full rounded-full transition-[width] duration-150"
                      style={{ width: `${Math.min(100, burstHud.meter * 100)}%`,
                               background: burstHud.ready ? 'linear-gradient(90deg,#fde68a,#fff7d6)' : 'linear-gradient(90deg,#b45309,#fbbf24)',
                               boxShadow: burstHud.ready ? '0 0 12px #fde68a' : 'none' }} />
              </div>
          </div>
      )}

      {!activeCinematic && !gameOver && !gameWon && !storyCine && (
          <StoryCaption lines={storyLines} seq={wave} raised={!!settings.showTouchControls} />
      )}

      {/* (7D) storyline cinematic: letterbox + lines + skip; camera runs in the loop */}
      {storyCine && !gameOver && !gameWon && !paused && (
          <StoryCinematicOverlay id={storyCine.id} lines={storyCine.lines} noFreeze={storyCine.noFreeze} raised={!!settings.showTouchControls} onSkip={handleStorySkip} />
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
            touch={!!settings.showTouchControls}
            bossActive={!!bossInfo}
            maturity={maturity}
          />
      )}

      {breather !== null && !gameOver && !gameWon && !activeCinematic && (
          <MapBreather
            nextWave={breather + 1}
            maxWaveReached={maxWaveReached}
            defeatedBosses={defeatedBosses}
            treasuresOpened={treasuresOpened}
            onTreasure={onTreasure}
            onRevealSeen={onRevealSeen}
            reduceFlash={!!settings.reduceFlash}
            onContinue={() => { setBreather(null); breatherRef.current = null; advanceWaveRef.current(); }}
            onMenu={() => { setBreather(null); breatherRef.current = null; leaveToMenu(); }}
          />
      )}

      {/* (7A) end screens hide while the pause menu / tree is open (Matrix is z-50, these are z-100) */}
      {gameOver && !paused && (
        <GameOver 
            wave={wave}
            maxWaveReached={maxWaveReached} 
            maturityTitle={maturity.title} 
            deathBoss={deathBoss}
            onRestart={onRestart} 
            onReturnToMenu={onReturnToMenu}
            summary={summaryRef.current}
            onOpenTree={onOpenTree}
            onRetryChapter={retryChapter}
        />
      )}

      {gameWon && !paused && (
          <WinGame 
            onRestart={() => onRestart(1)} 
            onReturnToMenu={onReturnToMenu}
            onEndingSeen={onEndingSeen}
            stats={{ kills: gameStateRef.current.totalKills || 0, wave }}
            skipOutro
            summary={summaryRef.current}
            onOpenTree={onOpenTree}
          />
      )}
    </div>
  );
};

export default SurvivalGame;
