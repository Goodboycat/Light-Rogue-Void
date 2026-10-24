
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Sparkles, Maximize, Minimize, Play, Smartphone } from 'lucide-react';
import { PlayerStats, Settings, SideMission } from '../types';
import { MutableGameState, ParticleType, DamageSource, DamageHit, RunStats } from './game/types';
import { InputHandler } from './game/Input';
import { updateGame } from './game/Logic';
import { WORLD_SIZE, IS_DEMO, DEMO_MAX_WAVE } from './game/Constants';
import { renderGame } from './game/Renderer';
import { spawnExplosion, createParticle, updateParticles } from './game/Particles';
import GameOver from './GameOver';
import WinGame from './WinGame';
import CinematicOverlay from './CinematicOverlay';
import MobileControls from './MobileControls';
import GameOverlay from './GameOverlay';
import { INTRO_SCRIPT, CinematicLine, ESSENCE_TUTORIAL_SCRIPT, FIRST_KEY_TUTORIAL_SCRIPT, FIRST_SEMI_BOSS_TUTORIAL_SCRIPT, FIRST_EVENT_TUTORIAL_SCRIPT, MAP6_TWO_KEYS_SCRIPT, getSpecialAbilityCinematic } from '../data/cinematics';
import { BOSS_SCRIPTS } from '../data/bossCinematics';
import { MATURITY_LEVELS } from '../data/maturity';
import { LIGHT_PHRASES } from '../data/lightPhrases';
import { VOID_PHRASES } from '../data/phrases';
import { VFX } from './game/Emitters';
import { audio } from './game/audio';
import { t, translate } from '../translate';
import { isPCEnvironment } from '../hooks/useIsPC';
import { track } from '../utils/telemetry';

import { REGION_POOL } from '../data/mapNodes';
import { getRegionBackground, loadAndDecodeRegionBackground } from '../data/regionBackgrounds';
import { generateSideMissionForNode } from '../data/sideMissions';
import { WAVE_CLEAR_CONFIG } from './game/logic/DropLogic';
import { MERCY_MULTIPLIERS, MercySaveData, updateMercyMultipliers, recordPlayerDeath, recordWaveClear } from './game/mercy';

type MercySaveState = MercySaveData;
import FirstPowerChoiceModal from './FirstPowerChoiceModal';
import BossRewardModal from './BossRewardModal';
import BoonDraft from './BoonDraft';
import { BossVictoryCeremonyData, BossTrophy, BOSS_VICTORY_CONFIG } from './game/bossVictory';
import { useRunBoons } from '../hooks/useRunBoons';
import { onDamageTaken, onWaveClear, resetBoonRunState } from './game/logic/BoonLogic';
import { ABILITY_TREE_DATA } from '../data';
import { DailySaveState, getDailyModifierForDate, getUtcDateString, DAILY_QUEST_POOL } from '../data/dailyVoid';
import { VOID_RUSH_CONFIG, calculateVoidRushScore, calculateVoidRushMatterReward } from './game/voidRush';
import { HudToastItem } from './GameOverlay';
import { ACHIEVEMENTS } from '../data/achievements';
import { COSMETICS_DATA } from '../data/cosmetics';
import { setGlobalDamageMultiplier, initializeEnemy } from './game/logic/enemies/SpawnLogic';
import { triggerHaptic } from '../utils/haptics';
import { HIT_FEEDBACK_CONFIG } from './game/HitFeedback';
import { getQuality, stepQualityDown, stepQualityUp } from './game/Quality';
import { acquireDrop, swapRemoveProjectile, swapRemoveEnemy } from './game/ObjectPools';

const hasAnyPowerOwned = (unlockedIds: string[] = []): boolean => {
    return ABILITY_TREE_DATA.some(n => n.isMajor && unlockedIds.includes(n.id));
};

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
  onTogglePause: () => void;
  onOpenEvolutionMatrix?: (focusNodeId?: string) => void;
  hasSeenIntro: boolean;
  onIntroComplete: () => void;
  hasSeenEssenceTutorial?: boolean;
  onEssenceTutorialComplete?: () => void;
  settings: Settings;
  onUpdateMaxMaturity: (level: number) => void;
  onBossDefeated: (bossId: string) => void;
  onBlockPauseMenu: (blocked: boolean) => void;
  onTransition: (callback: () => void) => void;
  canPurchaseNode?: boolean;
  discoveredSecretIds?: string[];
  onOpenStarChart: () => void;
  onMapCompleted: (wave: number) => void;
  onDiscoverSecret: (id: string) => void;
  onRevealMystery?: (id: string, type: string) => void;
  currentRunPath?: any[];
  currentMapId?: string;
  specialMissionKeys?: number;
  hasObtainedFirstKey?: boolean;
  onSetHasObtainedFirstKey?: () => void;
  sideMission?: SideMission;
  onUpdateSideMission?: (sm?: SideMission) => void;
  onUpdateSpecialMissionKeys?: (keys: number) => void;
  map1SideMissionCompleted?: boolean;
  map1EventCompleted?: boolean;
  onUpdateMap1SideMissionCompleted?: (val: boolean) => void;
  onUpdateMap1EventCompleted?: (val: boolean) => void;
  completedMapIds?: string[];
  completedSpecialMissions?: string[];
  hasPickedFirstPower?: boolean;
  unlockedAbilityIds?: string[];
  onChooseFirstPower?: (targetNodeId: string) => void;
  seenBossIntros?: string[];
  bestBossProgress?: Record<string, number>;
  bossFailedAttemptsSession?: Record<string, number>;
  bossTrophies?: Record<string, BossTrophy>;
  seenBeamHint?: boolean;
  currentMatter?: number;
  equippedSkin?: string;
  equippedTrail?: string;
  isVoidRush?: boolean;
  dailyState?: DailySaveState;
  onUpdateDailyState?: (next: DailySaveState) => void;
  onRecordVoidRushScore?: (score: number) => void;
  mercyState?: MercySaveState;
  onUpdateMercyState?: (next: MercySaveState) => void;
  onMarkBeamHintSeen?: () => void;
  onRecordBossTrophy?: (trophy: BossTrophy) => void;
  onMarkBossIntroSeen?: (bossId: string) => void;
  onUpdateBossRetryData?: (bossId: string, bestHpPct: number, failedAttempts: number) => void;
}

const GAME_LOOP_CONFIG = {
    STEP_MS: 1000 / 60, // 16.666666666666668 ms per step (60 Hz simulation rate)
    MAX_STEPS_PER_FRAME: 3, // Cap steps per rAF to avoid spiral of death
    MAX_FRAME_DT_MS: 100, // Clamp maximum frame dt to 100ms
    TIME_SCALE: 1, // Simulation time scale multiplier
};

const DAMAGE_CONFIG = {
    IFRAMES: 50,
    SHIELD_IFRAMES: 20,
    LAST_SPARK_PER_WAVE: 1,
};

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
    onEnemySeen,
    initialWave,
    maxWaveReached,
    onUpdateMaxWave,
    onReturnToMenu,
    onTogglePause,
    onOpenEvolutionMatrix,
    hasSeenIntro,
    onIntroComplete,
    hasSeenEssenceTutorial = false,
    onEssenceTutorialComplete,
    settings,
    onUpdateMaxMaturity,
    onBossDefeated,
    onBlockPauseMenu,
    onTransition,
    canPurchaseNode,
    discoveredSecretIds = [],
    onOpenStarChart,
    onMapCompleted,
    onDiscoverSecret,
    onRevealMystery,
    currentRunPath = [],
    currentMapId = '',
    specialMissionKeys = 0,
    hasObtainedFirstKey = false,
    onSetHasObtainedFirstKey,
    sideMission,
    onUpdateSideMission,
    onUpdateSpecialMissionKeys,
    map1SideMissionCompleted = false,
    map1EventCompleted = false,
    onUpdateMap1SideMissionCompleted,
    onUpdateMap1EventCompleted,
    completedMapIds = [],
    completedSpecialMissions = [],
    hasPickedFirstPower = false,
    unlockedAbilityIds = [],
    onChooseFirstPower,
    seenBossIntros = [],
    bestBossProgress = {},
    bossFailedAttemptsSession = {},
    bossTrophies = {},
    seenBeamHint = false,
    currentMatter = 0,
    equippedSkin = 'skin_default',
    equippedTrail = 'trail_default',
    isVoidRush = false,
    dailyState,
    onUpdateDailyState,
    onRecordVoidRushScore,
    mercyState,
    onUpdateMercyState,
    onMarkBeamHintSeen,
    onRecordBossTrophy,
    onMarkBossIntroSeen,
    onUpdateBossRetryData
}) => {
  const lang = settings?.language || 'en';
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [inputInstance, setInputInstance] = useState<InputHandler | null>(null);
  const [showFirstPowerChoice, setShowFirstPowerChoice] = useState(false);

  const {
      offeredBoons,
      effectiveStats: rawEffectiveStats,
      runMods,
      freeRerollsRemaining,
      banishesRemaining,
      offer: offerBoons,
      pick: pickBoon,
      reroll: rerollBoons,
      banish: banishBoon
  } = useRunBoons(playerStats, currentMapId || 'map_1', (spent) => onCollectMatter(-spent));

  // Core run state used by effects below must be initialized before those effects execute.
  const [wave, setWave] = useState(initialWave);
  const [activeCinematic, setActiveCinematic] = useState<CinematicLine[] | null>(
      initialWave === 1 && !hasSeenIntro ? INTRO_SCRIPT : null
  );
  const [sessionMatter, setSessionMatter] = useState(0);

  const activeDailyMod = React.useMemo(() => {
      if (!dailyState?.activeDailyModEnabled) return null;
      return getDailyModifierForDate(getUtcDateString());
  }, [dailyState?.activeDailyModEnabled]);

  const effectiveStats = React.useMemo<PlayerStats>(() => {
      const s = { ...rawEffectiveStats };
      if (activeDailyMod) {
          if (activeDailyMod.playerMaxHpOverride !== undefined) {
              s.maxHealth = activeDailyMod.playerMaxHpOverride;
          }
          if (activeDailyMod.playerSpeedMult !== undefined) {
              s.moveSpeed = s.moveSpeed * activeDailyMod.playerSpeedMult;
          }
          if (activeDailyMod.dashCooldownMult !== undefined) {
              s.dashCooldown = Math.max(20, Math.round(s.dashCooldown * activeDailyMod.dashCooldownMult));
          }
          if (activeDailyMod.essenceMult !== undefined) {
              s.essenceMultiplier = s.essenceMultiplier * activeDailyMod.essenceMult;
          }
      }
      return s;
  }, [rawEffectiveStats, activeDailyMod]);

  useEffect(() => {
      const boonMult = runMods?.damageMult || 1.0;
      const dailyMult = activeDailyMod?.playerDamageMult || 1.0;
      setGlobalDamageMultiplier(boonMult * dailyMult);
      return () => setGlobalDamageMultiplier(1.0);
  }, [runMods?.damageMult, activeDailyMod?.playerDamageMult]);

  useEffect(() => {
      resetBoonRunState();
  }, []);

  // Toast Queue (1 at a time, 2.2s duration, paused while BoonDraft/Cinematic is open)
  const [toastQueue, setToastQueue] = useState<HudToastItem[]>([]);
  const activeToast = toastQueue[0] || null;
  const enqueueToast = useCallback((item: HudToastItem) => {
      setToastQueue(prev => {
          if (prev.some(t => t.id === item.id)) return prev;
          return [...prev, item];
      });
  }, []);

  useEffect(() => {
      if (!activeToast || offeredBoons || activeCinematic || paused) return;
      const timer = window.setTimeout(() => {
          setToastQueue(prev => prev.slice(1));
      }, 2200);
      return () => window.clearTimeout(timer);
  }, [activeToast, offeredBoons, activeCinematic, paused]);

  // Derived Next Goal node (cheapest revealed locked node) + 4 Hz throttled matter display
  const [throttledMatter, setThrottledMatter] = useState(currentMatter);
  useEffect(() => {
      const timer = window.setTimeout(() => {
          setThrottledMatter(currentMatter);
      }, 250);
      return () => window.clearTimeout(timer);
  }, [currentMatter]);

  const nextGoalNode = React.useMemo(() => {
      const unlockedSet = new Set(unlockedAbilityIds);
      const candidates = ABILITY_TREE_DATA.filter(
          n => !unlockedSet.has(n.id) && (n.parentIds.length === 0 || n.parentIds.some(pid => unlockedSet.has(pid)))
      ).sort((a, b) => a.cost - b.cost);
      const target = candidates[0];
      if (!target) return null;
      return {
          id: target.id,
          title: target.title,
          cost: target.cost,
          currentMatter: throttledMatter
      };
  }, [unlockedAbilityIds, throttledMatter]);

  const notifiedAffordableIdsRef = useRef<Set<string>>(new Set());
  useEffect(() => {
      if (!nextGoalNode) return;
      if (currentMatter >= nextGoalNode.cost && !notifiedAffordableIdsRef.current.has(nextGoalNode.id)) {
          notifiedAffordableIdsRef.current.add(nextGoalNode.id);
          enqueueToast({
              id: `afford_${nextGoalNode.id}`,
              kind: 'AFFORD',
              title: `${t('You can afford:', lang)} ${t(nextGoalNode.title, lang)}`,
              subtitle: `${nextGoalNode.cost} ${t('Matter', lang)}`,
              color: '#34d399'
          });
          try {
              if (navigator.vibrate) navigator.vibrate(20);
          } catch {}
      }
  }, [currentMatter, nextGoalNode, enqueueToast, lang]);

  const [waveEssenceEarned, setWaveEssenceEarned] = useState(0);
  const waveStartMatterRef = useRef(0);
  const cleanNoDashWavesRef = useRef(0);
  const sessionMatterRef = useRef(0);
  useEffect(() => {
      sessionMatterRef.current = sessionMatter;
      setWaveEssenceEarned(Math.max(0, Math.round(sessionMatter - waveStartMatterRef.current)));
  }, [sessionMatter]);

  const [bossVictoryData, setBossVictoryData] = useState<BossVictoryCeremonyData | null>(null);
  const pendingBossOutroRef = useRef<{ script?: CinematicLine[]; isWin: boolean } | null>(null);
  const bossSpawnFrameRef = useRef<number>(0);
  const bossStartDamageTakenRef = useRef<number>(0);
  const totalDamageTakenRunRef = useRef<number>(0);
  const mercyStateRef = useRef<MercySaveState>(mercyState || { deathsByWave: {}, bossAttempts: {}, mercyLevel: 0, cleanWaveStreak: 0 });
  const onUpdateMercyStateRef = useRef(onUpdateMercyState);
  const onRecordBossTrophyRef = useRef(onRecordBossTrophy);
  const offerBoonsRef = useRef(offerBoons);

  useEffect(() => {
      if (mercyState) mercyStateRef.current = mercyState;
      onUpdateMercyStateRef.current = onUpdateMercyState;
      onRecordBossTrophyRef.current = onRecordBossTrophy;
      offerBoonsRef.current = offerBoons;
      updateMercyMultipliers(mercyStateRef.current.mercyLevel || 0, settings?.difficulty || 'normal');
  }, [mercyState, onUpdateMercyState, onRecordBossTrophy, offerBoons, settings?.difficulty]);

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
        size: 10, color: '#fff',
        lightEnergy: 0,
        comboCount: 0,
        comboTimer: 0,
        essenceHealProgress: 0
    },
    enemies: [], 
    projectiles: [],
    particles: [], 
    drops: [], hazards: [],
    camera: { x: 0, y: 0 }, 
    mouse: { x: 0, y: 0 },
    frame: 0, 
    worldSize: WORLD_SIZE,
    seenEnemyIds: [],
    maxWaveReached: maxWaveReached,
    wave: initialWave,
    seenBossIntros: [...seenBossIntros],
    bossSpawnedWave: 0,
    performanceMode: settings.performanceMode,
    sideMission: sideMission,
    specialMissionKeys: specialMissionKeys
  });

  const initialCompletedRef = useRef<boolean>(false);
  const keyAwardedInRunRef = useRef<boolean>(false);

  const map1SideMissionCompletedRef = useRef(map1SideMissionCompleted);
  const map1EventCompletedRef = useRef(map1EventCompleted);
  const completedMapIdsRef = useRef(completedMapIds);
  const completedSpecialMissionsRef = useRef(completedSpecialMissions);

  useEffect(() => {
      map1SideMissionCompletedRef.current = map1SideMissionCompleted;
  }, [map1SideMissionCompleted]);

  useEffect(() => {
      map1EventCompletedRef.current = map1EventCompleted;
  }, [map1EventCompleted]);

  useEffect(() => {
      completedMapIdsRef.current = completedMapIds;
      completedSpecialMissionsRef.current = completedSpecialMissions;
  }, [completedMapIds, completedSpecialMissions]);

  const checkAndDiscoverSecret = useCallback((eventCompletedNow = false, sideMissionCompletedNow = false) => {
      const node = currentRunPath.find((n: any) => n.id === currentMapId);
      if (!node) return;

      const secretToDiscover = node.connectsTo?.find((id: string) => 
          (id.startsWith('secret_') || id.startsWith('mission_')) && !discoveredSecretIds.includes(id)
      );
      if (!secretToDiscover) return;

      if (currentMapId === 'map_1') {
          const sideMissionDone = sideMissionCompletedNow || map1SideMissionCompletedRef.current || (gameStateRef.current?.sideMission && gameStateRef.current.sideMission.completed);
          const eventDone = eventCompletedNow || map1EventCompletedRef.current || (gameStateRef.current?.chaosEvent && gameStateRef.current.chaosEvent.completed);

          if (sideMissionDone && eventDone) {
              onDiscoverSecret(secretToDiscover);
          }
      } else {
          onDiscoverSecret(secretToDiscover);
      }
  }, [currentRunPath, currentMapId, discoveredSecretIds, onDiscoverSecret]);
  
  const hasTriggeredEssenceTutorialRef = useRef(hasSeenEssenceTutorial || localStorage.getItem('void_essence_tutorial_completed') === 'true');
  useEffect(() => {
      hasTriggeredEssenceTutorialRef.current = hasSeenEssenceTutorial || localStorage.getItem('void_essence_tutorial_completed') === 'true';
  }, [hasSeenEssenceTutorial]);

  const hasTriggeredEventTutorialRef = useRef(localStorage.getItem('void_event_tutorial_completed') === 'true');


  const [currentHealth, setCurrentHealth] = useState(playerStats.maxHealth);
  const [currentShield, setCurrentShield] = useState(0); 
  
  const [gameOver, setGameOver] = useState(false);
  const [gameWon, setGameWon] = useState(false);
  const [mapCompleted, setMapCompleted] = useState<number | null>(null);
  const [timeRemaining, setTimeRemaining] = useState(isVoidRush ? VOID_RUSH_CONFIG.waveDurationSec : 30);
  const [currentPhrase, setCurrentPhrase] = useState(LIGHT_PHRASES[Math.min(initialWave - 1, LIGHT_PHRASES.length - 1)]);
  const [darknessPhrase, setDarknessPhrase] = useState(VOID_PHRASES[0]);
  const [lightEnergy, setLightEnergy] = useState(0);
  const [comboCount, setComboCount] = useState(0);

  // Mission tracking
  const [missionProgress, setMissionProgress] = useState(0);
  const [missionFailed, setMissionFailed] = useState(false);
  const [missionData, setMissionData] = useState<{type: string, target: number, timeLimit?: number, current: number}>({type: 'SURVIVE', target: 10, current: 0});
  
  const [localSideMission, setLocalSideMission] = useState<SideMission | undefined>(sideMission);
  const [localSpecialKeys, setLocalSpecialKeys] = useState<number>(specialMissionKeys);
  const [retryTitleCard, setRetryTitleCard] = useState<{ showing: boolean; bossName: string; woundedStacks: number } | null>(null);
  const retryTitleCardTimerRef = useRef(0);

  const gameRefs = useRef({ 
      playerStats, 
      wave, 
      timeRemaining, 
      paused, 
      gameOver, 
      gameWon, 
      mapCompleted,
      maturityScale: GET_MATURITY(sessionMatter).scale, 
      color: GET_MATURITY(sessionMatter).color, 
      onEnemySeen, 
      onUpdateMaxWave, 
      maxWaveReached, 
      activeCinematic, 
      onBossDefeated,
      currentShield, 
      currentHealth,
      settings,
      onTransition, // Added callback ref
      hasObtainedFirstKey,
      onSetHasObtainedFirstKey,
      tutorialStep: null as number | null,
      specialMissionKeys: localSpecialKeys,
      hasPickedFirstPower,
      unlockedAbilityIds,
      onChooseFirstPower,
      seenBossIntros
  });

  const seenBossIntrosRef = useRef(seenBossIntros);
  useEffect(() => { seenBossIntrosRef.current = seenBossIntros; }, [seenBossIntros]);

  const bestBossProgressRef = useRef(bestBossProgress);
  useEffect(() => { bestBossProgressRef.current = bestBossProgress; }, [bestBossProgress]);

  const bossFailedAttemptsSessionRef = useRef(bossFailedAttemptsSession);
  useEffect(() => {
      bossFailedAttemptsSessionRef.current = bossFailedAttemptsSession;
      if (gameStateRef.current) {
          gameStateRef.current.bossFailedAttemptsSession = bossFailedAttemptsSession;
      }
  }, [bossFailedAttemptsSession]);
  
  useEffect(() => {
      setLocalSpecialKeys(specialMissionKeys || 0);
  }, [specialMissionKeys]);
  const [discoveryEvent, setDiscoveryEvent] = useState<{ loreText: string; type: string; title?: string } | null>(null);
  const chaosEventTriggeredWaveRef = useRef<number | null>(null);
  const map6KeysCollectedRef = useRef<number>(0);
  const hasTriggeredMap6TwoKeysCinematicRef = useRef<boolean>(false);
  const pendingMap6TwoKeysCinematicRef = useRef<boolean>(false);
  const specialMissionCinematicTriggeredRef = useRef<boolean>(false);
  const hpDamageTakenInWaveRef = useRef<boolean>(false);
  const waveClearTriggeredRef = useRef<boolean>(false);
  const pendingNextWaveRef = useRef<number | null>(null);

  // --- INTERACTIVE TUTORIAL STATE & REFS ---
  const [tutorialStep, setTutorialStep] = useState<number | null>(null);
  const missionRef = React.useRef({ type: 'SURVIVE', target: 10, current: 0, timeLimit: 0, timeElapsed: 0, failed: false });
  const movementTimerRef = useRef(0);
  const tutorialCompleteTimerRef = useRef(0);

  const regenAccRef = useRef(0);
  const essenceHealCooldownRef = useRef(0);
  const shieldCooldownRef = useRef(0); 
  const shieldRegenAccRef = useRef(0); 
  const phraseTimerRef = useRef(0);

  // Damage & Run Telemetry Tracking
  const lastDamageRef = useRef<DamageHit | null>(null);
  const damageRingBufferRef = useRef<DamageHit[]>([]);
  const deathCauseRef = useRef<DamageSource | undefined>(undefined);

  // Fixed timestep loop refs
  const accumulatorRef = useRef(0);
  const lastTimeRef = useRef(performance.now());
  const stepCounterRef = useRef(0);
  const lastRenderTimeRef = useRef(0);

  // 10 Hz HUD Ref -> State Bridge & Dynamic Quality Governor / Debug Overlay
  const isDebugOverlayEnabled = React.useMemo(() => {
      if (typeof window === 'undefined') return false;
      return new URLSearchParams(window.location.search).get('debug') === '1';
  }, []);
  const [debugStats, setDebugStats] = useState<{
      fps: number;
      stepMs: number;
      renderMs: number;
      enemies: number;
      projectiles: number;
      particles: number;
      drops: number;
      heapMb: number | null;
      mode: string;
  } | null>(null);
  const avgFrameMsRef = useRef(16.6);
  const avgStepMsRef = useRef(1.2);
  const avgRenderMsRef = useRef(2.5);
  const governorHighMsFramesRef = useRef(0);
  const governorLowMsFramesRef = useRef(0);
  const hudSyncFrameRef = useRef(0);
  const hudBridgeRef = useRef({
      health: playerStats.maxHealth,
      shield: 0,
      sessionMatter: 0,
      lightEnergy: 0,
      comboCount: 0,
      missionProgress: 0,
  });

  // App lifecycle, Wake Lock, Fullscreen, Orientation hint, and Lazy Asset Loading states
  const [isLifecyclePaused, setIsLifecyclePaused] = useState(false);
  const [resumeCountdown, setResumeCountdown] = useState<number | null>(null);
  const isLifecyclePausedRef = useRef(false);
  const resumeCountdownRef = useRef<number | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showOrientationHint, setShowOrientationHint] = useState(false);
  const [bgLoading, setBgLoading] = useState(false);
  const [bgLoadProgress, setBgLoadProgress] = useState(100);
  const [bgTipIdx, setBgTipIdx] = useState(0);
  const [activeBgUrl, setActiveBgUrl] = useState<string>(() => getRegionBackground(currentRunPath.find(n => n.id === currentMapId)?.regionId).imageUrl);

  const LOADING_TIPS = [
      'Dash through homing missiles or shoot them down before impact.',
      'Stay still only when charging White Hole; keep moving during boss telegraphs.',
      'Save your 100% Purging Beam to stun bosses and deal x1.5 bonus damage.',
      'Every 25 combo kills with Overdrive boosts your attack speed by +40%.',
      'Collect all fragments during the wave-clear vortex for +25% Perfect Wave bonus.',
  ];

  // Keep lifecycle refs synced
  useEffect(() => {
      isLifecyclePausedRef.current = isLifecyclePaused;
  }, [isLifecyclePaused]);
  useEffect(() => {
      resumeCountdownRef.current = resumeCountdown;
  }, [resumeCountdown]);

  // Auto-pause on visibilitychange hidden, window blur, and pagehide; Wake Lock API while playing
  useEffect(() => {
      let wakeLockSentinel: any = null;

      const requestWakeLock = async () => {
          try {
              if (
                  typeof navigator !== 'undefined' &&
                  'wakeLock' in navigator &&
                  document.visibilityState === 'visible' &&
                  !paused &&
                  !gameOver &&
                  !gameWon
              ) {
                  wakeLockSentinel = await (navigator as any).wakeLock.request('screen');
              }
          } catch {}
      };

      const releaseWakeLock = async () => {
          if (wakeLockSentinel) {
              try {
                  await wakeLockSentinel.release();
              } catch {}
              wakeLockSentinel = null;
          }
      };

      requestWakeLock();

      const triggerAutoPause = () => {
          if (gameRefs.current.gameOver || gameRefs.current.gameWon) return;
          isLifecyclePausedRef.current = true;
          setIsLifecyclePaused(true);
          setResumeCountdown(null);
          resumeCountdownRef.current = null;
          accumulatorRef.current = 0;
          audio.pauseBgm();
          releaseWakeLock();
      };

      const handleVisibilityChange = () => {
          if (document.visibilityState === 'hidden') {
              triggerAutoPause();
          } else {
              accumulatorRef.current = 0;
              lastTimeRef.current = performance.now();
              if (!isLifecyclePausedRef.current && !paused) {
                  requestWakeLock();
              }
          }
      };

      const handleWindowBlur = () => {
          triggerAutoPause();
      };

      const handlePageHide = () => {
          triggerAutoPause();
      };

      const handleFullscreenChange = () => {
          setIsFullscreen(!!document.fullscreenElement);
      };

      const checkOrientation = () => {
          const w = window.innerWidth;
          const h = window.innerHeight;
          setShowOrientationHint(w < 500 && h > w * 1.35);
      };
      checkOrientation();

      document.addEventListener('visibilitychange', handleVisibilityChange);
      window.addEventListener('blur', handleWindowBlur);
      window.addEventListener('pagehide', handlePageHide);
      document.addEventListener('fullscreenchange', handleFullscreenChange);
      window.addEventListener('resize', checkOrientation);

      return () => {
          releaseWakeLock();
          document.removeEventListener('visibilitychange', handleVisibilityChange);
          window.removeEventListener('blur', handleWindowBlur);
          window.removeEventListener('pagehide', handlePageHide);
          document.removeEventListener('fullscreenchange', handleFullscreenChange);
          window.removeEventListener('resize', checkOrientation);
      };
  }, [paused, activeCinematic, mapCompleted, gameOver, gameWon]);

  // 3-2-1 countdown timer after tapping TAP TO RESUME
  useEffect(() => {
      if (resumeCountdown === null) return;
      if (resumeCountdown <= 0) {
          setResumeCountdown(null);
          resumeCountdownRef.current = null;
          setIsLifecyclePaused(false);
          isLifecyclePausedRef.current = false;
          accumulatorRef.current = 0;
          lastTimeRef.current = performance.now();
          audio.resumeBgm();
          return;
      }
      const timer = setTimeout(() => {
          setResumeCountdown((c) => (c !== null ? c - 1 : null));
      }, 650);
      return () => clearTimeout(timer);
  }, [resumeCountdown]);

  const handleTapToResume = () => {
      try {
          if (typeof window !== 'undefined' && document.hasFocus && !document.hasFocus()) {
              window.focus();
          }
      } catch {}
      if (resumeCountdown === null) {
          setResumeCountdown(3);
      }
  };

  const handleToggleFullscreen = () => {
      try {
          if (!document.fullscreenElement && document.documentElement.requestFullscreen) {
              document.documentElement.requestFullscreen().catch(() => {});
          } else if (document.fullscreenElement && document.exitFullscreen) {
              document.exitFullscreen().catch(() => {});
          }
      } catch {}
  };
  
  const currentMapNode = currentRunPath.find(n => n.id === currentMapId);
  const maturity = React.useMemo(() => {
      const m = GET_MATURITY(sessionMatter);
      const curIdx = m.level;
      const prevThreshold = curIdx * curIdx * 120;
      const nextThreshold = (curIdx + 1) * (curIdx + 1) * 120;
      const progressPct = curIdx >= MATURITY_LEVELS.length - 1
          ? 100
          : Math.max(0, Math.min(100, ((sessionMatter - prevThreshold) / Math.max(1, nextThreshold - prevThreshold)) * 100));
      return { ...m, progressPct };
  }, [sessionMatter]);
  
  const calculatedShield = Math.floor((maturity.scale - 1.0) * 2.5);
  const maxShield = Math.min(5, Math.max(0, calculatedShield));

  const prevMaturityLevelRef = useRef<number>(maturity.level);
  const prevMaturityScaleRef = useRef<number>(maturity.scale);

  useEffect(() => {
      onUpdateMaxMaturity(maturity.level);
      if (maturity.level > prevMaturityLevelRef.current) {
          const prevScale = prevMaturityScaleRef.current;
          const prevMaxShield = Math.min(5, Math.max(0, Math.floor((prevScale - 1.0) * 2.5)));
          const gainedShield = maxShield > prevMaxShield;
          if (gameStateRef.current) {
              gameStateRef.current.maturityPrevScale = prevScale;
              gameStateRef.current.maturityTweenTimer = 18; // 0.3s ease-out-back tween
          }
          const deltaPct = Math.max(1, Math.round((maturity.scale - 1.0) * 100));
          enqueueToast({
              id: `mat_${maturity.level}`,
              kind: 'MATURITY',
              title: `${t('MATURITY:', lang)} ${t(maturity.title, lang)}`,
              subtitle: gainedShield ? `+${deltaPct}% ${t('Radius', lang)} • +1 ${t('Shield Pip', lang)}` : `+${deltaPct}% ${t('Radius', lang)}`,
              color: maturity.color
          });
      }
      prevMaturityLevelRef.current = maturity.level;
      prevMaturityScaleRef.current = maturity.scale;
  }, [maturity.level, maturity.scale, maturity.title, maturity.color, maxShield, onUpdateMaxMaturity, enqueueToast, lang]);

  useEffect(() => {
      track('run_start', {
          startWave: initialWave,
          matter: sessionMatter,
          ownedPowers: playerStats ? Object.keys(playerStats).filter(k => k.endsWith('Level') && (playerStats as any)[k] > 0).length : 0,
          maxWaveReached
      });
  }, []);

  // Block Pause Menu when in cinematic or end states
  useEffect(() => {
      onBlockPauseMenu(!!activeCinematic || gameOver || gameWon);
  }, [activeCinematic, gameOver, gameWon, onBlockPauseMenu]);

  // Handle auto-updating map completion progression
  useEffect(() => {
      if (mapCompleted !== null && onMapCompleted) {
          (onMapCompleted as any)(mapCompleted, currentMapId, keyAwardedInRunRef.current);
      }
  }, [mapCompleted, currentMapId, onMapCompleted]);

  useEffect(() => {
      keyAwardedInRunRef.current = false;
      const isMapCompleted = (completedMapIds || []).includes(currentMapNode?.id || '') || (completedMapIds || []).includes(currentMapId || '');
      const isMissionCompleted = currentMapNode?.mission?.rewardId 
          ? (completedSpecialMissions || []).includes(currentMapNode.mission.rewardId)
          : false;
      const isMap1SideDone = currentMapId === 'map_1' && (map1SideMissionCompleted || map1SideMissionCompletedRef.current);
      const isMap1EventDone = currentMapId === 'map_1' && (map1EventCompleted || map1EventCompletedRef.current);
      const isSideMissionDone = sideMission?.completed;

      initialCompletedRef.current = !!(isMapCompleted || isMissionCompleted || isMap1SideDone || isMap1EventDone || isSideMissionDone);
  }, [currentMapId, currentMapNode, completedMapIds, completedSpecialMissions, map1SideMissionCompleted, map1EventCompleted, sideMission]);

  // Initialize mission config and play corresponding place soundtrack from current map node at start of game
  useEffect(() => {
      const placeId = currentMapNode?.regionId || currentMapNode?.id || currentMapId;
      if (placeId) {
          audio.playPlaceSoundtrack(placeId);
      }

      const regId = currentMapNode?.regionId || 'region_1';
      let cancelled = false;
      setBgTipIdx(Math.floor(Math.random() * LOADING_TIPS.length));
      setBgLoading(true);
      setBgLoadProgress(15);

      loadAndDecodeRegionBackground(regId, (pct) => {
          if (!cancelled) setBgLoadProgress(pct);
      })
          .then((decodedUrl) => {
              if (!cancelled) {
                  setActiveBgUrl(decodedUrl);
                  setBgLoading(false);
              }
              const nextReg = getRegionBackground(regId).nextRegionId;
              if (nextReg) {
                  audio.preloadPlaceSoundtrackIdle(nextReg);
              }
          })
          .catch(() => {
              if (!cancelled) setBgLoading(false);
          });

      return () => {
          cancelled = true;
      };
  }, [currentMapNode?.regionId, currentMapNode?.id, currentMapId]);

  useEffect(() => {

      const state = gameStateRef.current;
      if (state) {
          state.isSpecialMission = currentMapNode?.type === 'EVENT' || currentMapNode?.type === 'SECRET' || (currentMapNode?.waveRange && currentMapNode.waveRange[0] >= 100);
          state.regionId = currentMapNode?.regionId;
      }
      if (currentMapNode && currentMapNode.mission) {
          const type = currentMapNode.mission.type;
          const target = currentMapNode.mission.targetCount;
          const limit = currentMapNode.mission.timeLimit;
          
          missionRef.current = {
              type,
              target,
              current: 0,
              timeLimit: limit || 0,
              timeElapsed: 0,
              failed: false
          };
          
          let captureZone = undefined;
          if (type === 'CAPTURE_ZONE') {
              const angle = Math.random() * Math.PI * 2;
              const dist = 300 + Math.random() * 150;
              captureZone = {
                  x: Math.cos(angle) * dist,
                  y: Math.sin(angle) * dist,
                  radius: 95,
                  captureTimeTotal: target,
                  captureTimeCurrent: 0
              };
          }

          state.mission = {
              type,
              target,
              current: 0,
              timeLimit: limit,
              timeElapsed: 0,
              failed: false,
              captureZone
          };
          
          setMissionProgress(0);
          setMissionData({
              type,
              target,
              timeLimit: limit,
              current: 0
          });
      } else {
          missionRef.current = {
              type: 'SURVIVE',
              target: 30,
              current: 0,
              timeLimit: 0,
              timeElapsed: 0,
              failed: false
          };
          state.mission = undefined;
          setMissionProgress(0);
          setMissionData({
              type: 'SURVIVE',
              target: 30,
              current: 0
          });
      }
  }, [currentMapId]);

  const lastMapIdRef = useRef<string | undefined>(currentMapId);

  // Side Mission Initialization / Progression
  useEffect(() => {
      const state = gameStateRef.current;

      const isSpecialMissionNode = currentMapNode?.type === 'EVENT' || currentMapNode?.type === 'SECRET' || (currentMapNode?.waveRange && currentMapNode.waveRange[0] >= 100);

      // Reset local side mission if user switched map nodes or is in a special mission node
      if (lastMapIdRef.current !== currentMapId || isSpecialMissionNode) {
          lastMapIdRef.current = currentMapId;
          map6KeysCollectedRef.current = 0;
          hasTriggeredMap6TwoKeysCinematicRef.current = false;
          pendingMap6TwoKeysCinematicRef.current = false;
          specialMissionCinematicTriggeredRef.current = false;
          if (state) {
              state.darknessRegenNullified = false;
              state.map6KeysCollected = 0;
          }
          if (state) state.sideMission = undefined;
          setLocalSideMission(undefined);
          if (isSpecialMissionNode) return;
      }

      if ((currentMapNode || wave > 0) && !isSpecialMissionNode) {
          // Keep existing side mission (active, completed, or failed)
          if (sideMission) {
              state.sideMission = sideMission;
              setLocalSideMission(sideMission);
          } else if (!state.sideMission) {
              const newSM = generateSideMissionForNode(currentMapId || 'map_1', wave);
              if (newSM) {
                  state.sideMission = newSM;
                  setLocalSideMission(newSM);
                  if (onUpdateSideMission) onUpdateSideMission(newSM);
              }
          }
      }
  }, [currentMapId, wave, sideMission, onUpdateSideMission, currentMapNode]);


  // Chaos Event Logic
  useEffect(() => {
      const state = gameStateRef.current;
      if (!state) return;

      const isSpecialMissionNode = currentMapNode?.type === 'EVENT' || currentMapNode?.type === 'SECRET' || (currentMapNode?.waveRange && currentMapNode.waveRange[0] >= 100);
      const isBossWave = !isSpecialMissionNode && wave > 0 && wave % 10 === 0 && wave < 100;
      const waveInNode = wave % 10;
      
      const getChaosEventType = (w: number): 'BERSERKER' | 'POISON' | 'ANOMALIES' | 'DARTS' => {
          const bw = Math.ceil(w / 10) * 10;
          if (bw === 10) return 'DARTS';
          if (bw === 20) return 'ANOMALIES';
          if (bw === 30) return 'BERSERKER';
          if (bw === 40) return 'POISON';
          if (bw === 50) return 'ANOMALIES';
          return 'BERSERKER';
      };

      if (waveInNode === 5) {
          if (chaosEventTriggeredWaveRef.current !== wave) {
              chaosEventTriggeredWaveRef.current = wave;
              // Initialize chaos event at half wave (Wave 5 of 10-wave main node segment)
              const type = getChaosEventType(wave);
              const messages: Record<string, string> = {
                  'BERSERKER': 'Chaos Event: Enemies are enraged!',
                  'POISON': 'Chaos Event: The void saps your life...',
                  'ANOMALIES': 'Chaos Event: Reality fractures...',
                  'DARTS': 'Chaos Event: Void Darts detected!'
              };
              setDiscoveryEvent({ loreText: translate(messages[type]), type: 'EVENT' });
              setTimeout(() => setDiscoveryEvent(null), 4000);
              audio.playHit();
              
              state.chaosEvent = {
                  type: getChaosEventType(wave),
                  active: true,
                  wavesSurvived: 0,
                  failed: false,
                  completed: false
              };

              // Trigger first event tutorial cinematic if not yet seen
              const hasSeenEventTutorial = localStorage.getItem('void_event_tutorial_completed') === 'true' || hasTriggeredEventTutorialRef.current;
              if (!hasSeenEventTutorial) {
                  hasTriggeredEventTutorialRef.current = true;
                  localStorage.setItem('void_event_tutorial_completed', 'true');
                  gameRefs.current.activeCinematic = FIRST_EVENT_TUTORIAL_SCRIPT;
                  setActiveCinematic(FIRST_EVENT_TUTORIAL_SCRIPT);
              }
          }
      } else if (waveInNode > 5 && waveInNode <= 9) {
          if (state.chaosEvent && state.chaosEvent.active && !state.chaosEvent.failed) {
              state.chaosEvent.wavesSurvived++;
          } else {
              state.chaosEvent = undefined;
          }
      } else if (isBossWave) {
          if (state.chaosEvent && state.chaosEvent.active && !state.chaosEvent.failed) {
              state.chaosEvent.wavesSurvived++;
              if (state.chaosEvent.wavesSurvived >= 4) {
                  state.chaosEvent.completed = true;
                  state.chaosEvent.active = false;
                  if (currentMapId === 'map_1') {
                      map1EventCompletedRef.current = true;
                      if (onUpdateMap1EventCompleted) onUpdateMap1EventCompleted(true);
                  }
                  // Directly award secret key upon chaos event completion
                  state.secretKeyCollected = true;

                  // spawn secret key drop as visual accent
                  state.drops.push({
                      x: state.player.x, y: state.player.y, value: 0, isKey: true, isSecretKey: true
                  });
                  window.dispatchEvent(new CustomEvent('chaos_event_completed'));

                  // Immediately trigger secret node discovery
                  checkAndDiscoverSecret(true, false);
              }
          }
          // Chaos event is never active during boss wave
          if (state.chaosEvent) state.chaosEvent.active = false;
      } else {
          state.chaosEvent = undefined;
      }
  }, [wave]);

  // Initialize first wave tutorial if not already completed
  useEffect(() => {
      const isTutorialCompleted = localStorage.getItem('void_tutorial_completed') === 'true';
      if (wave === 1 && !isTutorialCompleted) {
          setTutorialStep(1); // 1 = Movement, 2 = Dash, 3 = Completion
          movementTimerRef.current = 0;
          tutorialCompleteTimerRef.current = 0;
      } else {
          setTutorialStep(null);
      }

      // --- SECRET KEY LOGIC ---
      // Keep secret key drops intact so player can collect them
      const isSpecialMissionNode = currentMapNode?.type === 'EVENT' || currentMapNode?.type === 'SECRET' || (currentMapNode?.waveRange && currentMapNode.waveRange[0] >= 100);
      const isBossWave = !isSpecialMissionNode && wave > 0 && wave % 10 === 0 && wave < 100;
  }, [wave, currentMapNode, discoveredSecretIds]);

  // Use a Ref for game state access inside the loop

  useEffect(() => {
      gameRefs.current = { 
          playerStats: effectiveStats, 
          wave, 
          timeRemaining, 
          paused: paused || !!offeredBoons || !!bossVictoryData, 
          gameOver, 
          gameWon, 
          mapCompleted: mapCompleted !== null ? mapCompleted : gameRefs.current.mapCompleted,
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
          onTransition,
          hasObtainedFirstKey,
          onSetHasObtainedFirstKey,
          tutorialStep,
          specialMissionKeys: localSpecialKeys,
          hasPickedFirstPower,
          unlockedAbilityIds,
          onChooseFirstPower,
          seenBossIntros
      };
      if (gameStateRef.current) {
          gameStateRef.current.performanceMode = settings.performanceMode;
          gameStateRef.current.settings = settings;
          gameStateRef.current.runMods = runMods;
          gameStateRef.current.equippedSkin = equippedSkin;
          gameStateRef.current.equippedTrail = equippedTrail;
          gameStateRef.current.activeDailyMod = activeDailyMod;
          gameStateRef.current.isVoidRush = isVoidRush;
          gameStateRef.current.wave = wave;
          gameStateRef.current.seenBossIntros = seenBossIntros;
      }
  }, [effectiveStats, runMods, offeredBoons, bossVictoryData, wave, timeRemaining, paused, gameOver, gameWon, mapCompleted, maturity.scale, maturity.color, onEnemySeen, onUpdateMaxWave, maxWaveReached, activeCinematic, onBossDefeated, currentShield, currentHealth, settings, onTransition, hasObtainedFirstKey, onSetHasObtainedFirstKey, tutorialStep, localSpecialKeys, hasPickedFirstPower, unlockedAbilityIds, onChooseFirstPower, seenBossIntros, equippedSkin, equippedTrail, activeDailyMod, isVoidRush]);

  // Audio feel: Dialogue ducking (60% during dialogue)
  useEffect(() => {
      audio.setDialogueDucking(!!activeCinematic);
      return () => audio.setDialogueDucking(false);
  }, [activeCinematic]);

  // Audio feel & Haptics: Low-HP heartbeat at 1 HP with music lowpassed to ~900 Hz + low HP haptic pulse
  const isAtOneHp = !gameOver && !gameWon && currentHealth === 1 && effectiveStats.maxHealth > 1;
  useEffect(() => {
      audio.setLowHpState(isAtOneHp);
      if (!isAtOneHp) return;
      triggerHaptic('lowHpPulse', settings);
      const interval = window.setInterval(() => {
          triggerHaptic('lowHpPulse', settings);
      }, 2400);
      return () => {
          window.clearInterval(interval);
          audio.setLowHpState(false);
      };
  }, [isAtOneHp, settings]);

  // Handle Discovery Events
  useEffect(() => {
      if (currentMapNode && currentMapNode.displayType === 'UNKNOWN') {
          // Trigger discovery
          const lore = REGION_POOL.find(r => r.id === currentMapNode.regionId)?.loreText || 'An anomaly reveals itself.';
          setDiscoveryEvent({ loreText: lore, type: currentMapNode.type });
          audio.playLevelUp(); // Replace with a chime if possible
          if (onRevealMystery) {
              onRevealMystery(currentMapId, currentMapNode.type);
          }
          setTimeout(() => {
              setDiscoveryEvent(null);
          }, 2500);
      }
  }, [currentMapId, currentMapNode, onRevealMystery]);

  useEffect(() => {
      if (currentMapNode && currentMapNode.type === 'EVENT') {
          const hasSeenEventTutorial = localStorage.getItem('void_event_tutorial_completed') === 'true' || hasTriggeredEventTutorialRef.current;
          if (!hasSeenEventTutorial) {
              hasTriggeredEventTutorialRef.current = true;
              localStorage.setItem('void_event_tutorial_completed', 'true');
              gameRefs.current.activeCinematic = FIRST_EVENT_TUTORIAL_SCRIPT;
              setActiveCinematic(FIRST_EVENT_TUTORIAL_SCRIPT);
          }
      }
  }, [currentMapNode]);

   const checkMap6TwoKeysCinematic = useCallback(() => {
       const state = gameStateRef.current;
       if (!state) return;

       const isMap6OrFinal = currentMapId === 'map_6' || wave >= 50 || currentMapNode?.regionId === 'region_10' || currentMapNode?.id === 'map_6' || state.activeBoss?.def.id === 'darkness';

       if (isMap6OrFinal) {
           const currentKeys = gameRefs.current.specialMissionKeys !== undefined 
               ? gameRefs.current.specialMissionKeys 
               : (specialMissionKeys || 0);
           const effectiveKeys = Math.max(currentKeys, localSpecialKeys || 0, state.specialMissionKeys || 0) + map6KeysCollectedRef.current;

           if (effectiveKeys >= 2) {
               state.darknessRegenNullified = true;
               state.map6KeysCollected = Math.max(state.map6KeysCollected || 0, effectiveKeys);
           }
       }
   }, [currentMapId, wave, currentMapNode, specialMissionKeys, localSpecialKeys]);

  // Handle Cinematic Logic
  const handleCinematicComplete = () => {
      const cinematic = activeCinematic;
      gameRefs.current.activeCinematic = null;
      setActiveCinematic(null);

      if (cinematic === INTRO_SCRIPT) {
          onIntroComplete();
          return;
      } else if (cinematic === ESSENCE_TUTORIAL_SCRIPT) {
          if (onEssenceTutorialComplete) {
              onEssenceTutorialComplete();
          }
          return;
      }

      if (cinematic === BOSS_SCRIPTS['darkness']?.outro) {
          setGameWon(true); gameRefs.current.gameWon = true;
          return;
      }

      if (cinematic === FIRST_KEY_TUTORIAL_SCRIPT || cinematic === FIRST_SEMI_BOSS_TUTORIAL_SCRIPT || cinematic === MAP6_TWO_KEYS_SCRIPT || cinematic === FIRST_EVENT_TUTORIAL_SCRIPT) {
          // Dialogue finished - seamlessly resume gameplay without opening finish screen
          return;
      }

      if (cinematic === BOSS_SCRIPTS['darkness']?.intro) {
          const state = gameStateRef.current;
          const currentKeys = gameRefs.current.specialMissionKeys !== undefined 
              ? gameRefs.current.specialMissionKeys 
              : (specialMissionKeys || 0);
          const effectiveKeys = Math.max(currentKeys, localSpecialKeys || 0, state?.specialMissionKeys || 0) + map6KeysCollectedRef.current;

          if (effectiveKeys >= 2 && !hasTriggeredMap6TwoKeysCinematicRef.current) {
              hasTriggeredMap6TwoKeysCinematicRef.current = true;
              pendingMap6TwoKeysCinematicRef.current = false;
              if (state) {
                  state.darknessRegenNullified = true;
                  state.map6KeysCollected = Math.max(state.map6KeysCollected || 0, effectiveKeys);
              }
              gameRefs.current.activeCinematic = MAP6_TWO_KEYS_SCRIPT;
              setActiveCinematic(MAP6_TWO_KEYS_SCRIPT);
              return;
          }
          return;
      }
      
      const state = gameStateRef.current;
      if (state?.activeBoss?.def?.id) {
          const bossId = state.activeBoss.def.id;
          if (cinematic === BOSS_SCRIPTS[bossId]?.intro) {
              if (onMarkBossIntroSeen) {
                  onMarkBossIntroSeen(bossId);
              }
          }
      }

      if (state && !state.activeBoss && !gameOver && !gameWon) {
          // Boss/Cinematic outro is done! Open Map Completion Intermission
          onTransition(() => {
              setMapCompleted(wave); gameRefs.current.mapCompleted = wave;
          });
      }
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
      
      // ESSENCE TUTORIAL ACTIONS
      else if (action === 'ESSENCE_GLOW') {
          spawnExplosion(state, state.player.x, state.player.y, '#c084fc', ParticleType.BOSS_AURA);
          spawnExplosion(state, state.player.x, state.player.y, '#a855f7', ParticleType.GLOW);
          createParticle(state, state.player.x, state.player.y, ParticleType.RING, '#c084fc', { life: 80, size: 100, speed: 0 });
      } else if (action === 'CONSTELLATION_HINT') {
          spawnExplosion(state, state.player.x, state.player.y, '#fbbf24', ParticleType.RING);
          spawnExplosion(state, state.player.x, state.player.y, '#fff', ParticleType.GLOW);
          createParticle(state, state.player.x, state.player.y, ParticleType.HEAL, '#f59e0b', { life: 60, size: 12, speed: 4 });
      }
      
      else if (action === 'GOLD_GLOW') {
          spawnExplosion(state, state.player.x, state.player.y, '#fcd34d', ParticleType.BOSS_AURA);
          createParticle(state, state.player.x, state.player.y, ParticleType.RING, '#fbbf24', { life: 80, size: 120, speed: 0 });
      }
      else if (action === 'WHITE_FLASH') {
          VFX.castShockwave(state, state.player.x, state.player.y, '#ffffff');
          spawnExplosion(state, state.player.x, state.player.y, '#ffffff', ParticleType.GLOW);
      } else if (action === 'DOUBLE_ESSENCE_BURST') {
          VFX.castShockwave(state, state.player.x, state.player.y, '#fbbf24');
          for(let i = 0; i < 30; i++) {
              createParticle(state, state.player.x, state.player.y, ParticleType.HEAL, '#f59e0b', { life: 80, size: 8, speed: Math.random() * 8 + 4 });
          }
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

  const handleSkipIntermission = useCallback(() => {
      if (gameStateRef.current) {
          gameStateRef.current.intermissionTimer = 0;
      }
  }, []);

  const getRunStats = useCallback((): RunStats => {
      const state = gameStateRef.current;
      const activeBoss = state?.activeBoss;
      let bossHpPct: number | undefined = undefined;
      if (activeBoss && activeBoss.maxHp > 0) {
          bossHpPct = Math.max(0, Math.min(100, Math.round((activeBoss.hp / activeBoss.maxHp) * 100)));
      }
      const kills = state?.player?.totalKills || 0;
      const bestCombo = state?.player?.bestCombo || 0;
      const survivalSec = Math.round((state?.frame || 0) / 60);
      const voidRushScore = isVoidRush ? calculateVoidRushScore(kills, bestCombo, survivalSec) : undefined;
      return {
          wave: gameRefs.current.wave,
          runFrames: state?.frame || 0,
          kills,
          bestCombo,
          essenceEarned: sessionMatter,
          deathCause: deathCauseRef.current || lastDamageRef.current?.source,
          bossId: activeBoss?.def.id,
          bossHpPct,
          damageByPower: state?.damageByPower ? { ...state.damageByPower } : {},
          isVoidRush,
          voidRushScore
      };
  }, [sessionMatter, isVoidRush]);

  const handleRetryBoss = useCallback(() => {
      const state = gameStateRef.current;
      if (!state) return;

      const stats = getRunStats();
      const currentBossId = stats.bossId || state.activeBoss?.def?.id;

      if (currentBossId) {
          const hpPct = stats.bossHpPct ?? 100;
          const currentBest = bestBossProgressRef.current[currentBossId] ?? 100;
          const newBest = Math.min(currentBest, hpPct);
          const newAttempts = (bossFailedAttemptsSessionRef.current[currentBossId] || 0) + 1;

          bestBossProgressRef.current[currentBossId] = newBest;
          bossFailedAttemptsSessionRef.current[currentBossId] = newAttempts;

          if (onUpdateBossRetryData) {
              onUpdateBossRetryData(currentBossId, newBest, newAttempts);
          }
      }

      onTransition(() => {
          state.enemies = [];
          state.projectiles = [];
          console.assert(state.projectiles.length === 0, "Assert failed: state.projectiles is not empty at boss retry start!");
          state.hazards = [];
          state.drops = [];
          state.particles = [];
          state.activeBoss = undefined;
          state.bossSpawnedWave = undefined;
          state.waveTimer = 0;
          state.slowMoTimer = 0;
          state.hitPauseTimer = 0;

          if (state.player) {
              state.player.x = 0;
              state.player.y = 0;
              state.player.vx = 0;
              state.player.vy = 0;
              state.player.invulnTimer = 60;
              state.player.lastSparkAvailable = true;
          }

          const maxHp = playerStats.maxHealth;
          gameRefs.current.currentHealth = maxHp;
          setCurrentHealth(maxHp);
          const initShield = playerStats.titanShieldLevel > 0 ? 1 : 0;
          gameRefs.current.currentShield = initShield;
          setCurrentShield(initShield);

          setLightEnergy(prev => Math.max(prev, 60));

          setGameOver(false);
          gameRefs.current.gameOver = false;
          audio.playBgm('boss');
      });
  }, [playerStats, onTransition, onUpdateBossRetryData, getRunStats]);

  const handleDamage = (amount: number, source?: DamageSource) => {
      const state = gameStateRef.current;
      if (!state || !state.player) return;

      // Invulnerability check: ignore hit while invulnTimer > 0
      if (state.player.invulnTimer && state.player.invulnTimer > 0) {
          return;
      }

      // Cap damage per hit on Chill difficulty (max 1 pip)
      if (MERCY_MULTIPLIERS.maxDamageCapPerHit !== undefined) {
          amount = Math.min(amount, MERCY_MULTIPLIERS.maxDamageCapPerHit);
      }

      const effectiveSource: DamageSource = source || { kind: 'enemy', id: 'unknown', label: 'Unknown' };
      const currentHp = gameRefs.current.currentHealth;
      const currentShield = gameRefs.current.currentShield;
      const hpBefore = currentHp + currentShield;

      let remainingDamage = amount;
      
      if (currentShield > 0) {
          const absorbed = Math.min(currentShield, remainingDamage);
          gameRefs.current.currentShield = Math.max(0, currentShield - absorbed);
          setCurrentShield(prev => Math.max(0, prev - absorbed));
          remainingDamage -= absorbed;
      }

      if (remainingDamage > 0) {
          hpDamageTakenInWaveRef.current = true;
          totalDamageTakenRunRef.current += remainingDamage;
          let nextHp = Math.max(0, currentHp - remainingDamage);

          // Boon Logic: onDamageTaken (Time Rift & Phoenix Spark)
          const savedByPhoenix = onDamageTaken(state, remainingDamage, state.runMods, nextHp, (healAmt) => {
              if (healAmt === -1) {
                  nextHp = Math.max(1, Math.ceil(gameRefs.current.playerStats.maxHealth * 0.5));
              } else {
                  nextHp = Math.min(gameRefs.current.playerStats.maxHealth, healAmt);
              }
          });

          // LAST SPARK CHECK:
          const isLethal = !savedByPhoenix && nextHp <= 0 && currentHp > 0;
          const lastSparkAvailable = state.player.lastSparkAvailable !== false;

          if (isLethal && lastSparkAvailable) {
              nextHp = 1; // Leave 1 HP
              state.player.lastSparkAvailable = false; // Used once per wave

              // 0.6 s slow motion (36 frames)
              state.slowMoTimer = 36;

              // White shockwave pushes enemies back 220 px and deletes enemy projectiles within 260 px
              VFX.castShockwave(state, state.player.x, state.player.y, '#ffffff');
              spawnExplosion(state, state.player.x, state.player.y, '#ffffff', ParticleType.BOSS_AURA);

              // Push enemies
              for (let i = 0; i < state.enemies.length; i++) {
                  const e = state.enemies[i];
                  const dx = e.x - state.player.x;
                  const dy = e.y - state.player.y;
                  const dist = Math.hypot(dx, dy);
                  if (dist < 260 && dist > 0) {
                      const pushAngle = Math.atan2(dy, dx);
                      e.x = state.player.x + Math.cos(pushAngle) * 220;
                      e.y = state.player.y + Math.sin(pushAngle) * 220;
                      e.vx = Math.cos(pushAngle) * 25;
                      e.vy = Math.sin(pushAngle) * 25;
                  }
              }

              // Delete enemy projectiles within 260 px using swap-remove
              for (let i = state.projectiles.length - 1; i >= 0; i--) {
                  const p = state.projectiles[i];
                  if (p.isEnemy && Math.hypot(p.x - state.player.x, p.y - state.player.y) < 260) {
                      swapRemoveProjectile(state.projectiles, i);
                  }
              }

              // invulnTimer = 90
              state.player.invulnTimer = 90;

              // Sound & Haptic
              audio.playPhaseShiftStinger();
              triggerHaptic('lastSpark', gameRefs.current.settings);
          } else {
              state.player.invulnTimer = DAMAGE_CONFIG.IFRAMES;
              triggerHaptic('hit', gameRefs.current.settings);
          }

          gameRefs.current.currentHealth = nextHp; 
          setCurrentHealth(nextHp); 

          const hit: DamageHit = {
              source: effectiveSource,
              wave: gameRefs.current.wave,
              frame: state.frame || 0,
              hpBefore,
              hpAfter: nextHp
          };
          lastDamageRef.current = hit;
          damageRingBufferRef.current.push(hit);
          if (damageRingBufferRef.current.length > 5) {
              damageRingBufferRef.current.shift();
          }

          // Set camera shake (max amplitude 12 px) and 6-frame red vignette
          state.camera.shake = HIT_FEEDBACK_CONFIG.maxShakeAmplitude;
          state.damageOverlayTimer = HIT_FEEDBACK_CONFIG.playerHurtVignetteFrames;

          if (nextHp <= 0) {
              if (!deathCauseRef.current) {
                  deathCauseRef.current = effectiveSource;
              }
              const activeBoss = state?.activeBoss;
              if (activeBoss?.def?.id) {
                  const bossId = activeBoss.def.id;
                  const hpPct = Math.max(0, Math.min(100, Math.round((activeBoss.hp / activeBoss.maxHp) * 100)));
                  const currentBest = bestBossProgressRef.current[bossId] ?? 100;
                  const newBest = Math.min(currentBest, hpPct);
                  const newAttempts = (bossFailedAttemptsSessionRef.current[bossId] || 0) + 1;

                  bestBossProgressRef.current[bossId] = newBest;
                  bossFailedAttemptsSessionRef.current[bossId] = newAttempts;

                  if (onUpdateBossRetryData) {
                      onUpdateBossRetryData(bossId, newBest, newAttempts);
                  }
              }
              const res = recordPlayerDeath(
                  { ...mercyStateRef.current },
                  gameRefs.current.wave,
                  activeBoss?.def?.id,
                  Date.now()
              );
              const nextMercy = { ...res.updatedSave, mercyLevel: res.mercyLevel };
              updateMercyMultipliers(res.mercyLevel, gameRefs.current.settings?.difficulty || 'normal');
              mercyStateRef.current = nextMercy;
              if (onUpdateMercyStateRef.current) {
                  onUpdateMercyStateRef.current(nextMercy);
              }
              track('player_death', {
                  wave: gameRefs.current.wave,
                  cause: effectiveSource.label,
                  bossId: activeBoss?.def.id,
                  bossHpPct: activeBoss && activeBoss.maxHp > 0 ? Math.round((activeBoss.hp / activeBoss.maxHp) * 100) : undefined,
                  runSec: Math.round((state?.frame || 0) / 60),
                  kills: state?.player?.totalKills || 0
              });
              if (isVoidRush) {
                  const vrScore = calculateVoidRushScore(
                      state?.player?.totalKills || 0,
                      state?.player?.bestCombo || 0,
                      Math.round((state?.frame || 0) / 60)
                  );
                  const vrReward = calculateVoidRushMatterReward(vrScore);
                  onCollectMatter(vrReward);
                  setSessionMatter(m => m + vrReward);
                  if (onRecordVoidRushScore) onRecordVoidRushScore(vrScore);
              }
              setGameOver(true);
              gameRefs.current.gameOver = true;
              audio.pauseBgm();
          }
          regenAccRef.current = 0;
      } else {
          // Shield-only damage: give SHIELD_IFRAMES
          state.player.invulnTimer = Math.max(state.player.invulnTimer || 0, DAMAGE_CONFIG.SHIELD_IFRAMES);

          const hit: DamageHit = {
              source: effectiveSource,
              wave: gameRefs.current.wave,
              frame: state.frame || 0,
              hpBefore,
              hpAfter: currentHp
          };
          lastDamageRef.current = hit;
          damageRingBufferRef.current.push(hit);
          if (damageRingBufferRef.current.length > 5) {
              damageRingBufferRef.current.shift();
          }
      }

      const regenStat = gameRefs.current.playerStats.healthRegen;
      const delaySeconds = Math.max(1, 5 - (regenStat * 0.5));
      shieldCooldownRef.current = delaySeconds * 60;
  };

  useEffect(() => {
    const canvas = canvasRef.current!;
    const ctx = (canvas.getContext('2d', { alpha: false, desynchronized: true }) || canvas.getContext('2d'))!;
    const input = new InputHandler();
    setInputInstance(input);

    let anim: number;

    const urlParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
    const devHz = urlParams ? parseFloat(urlParams.get('hz') || '0') : 0;
    const devTargetFrameMs = devHz > 0 ? 1000 / devHz : 0;

    const tickSecond = () => {
        const refs = gameRefs.current;
        if (refs.activeCinematic || refs.paused || refs.gameOver || refs.gameWon || refs.mapCompleted !== null) {
            return;
        }

        phraseTimerRef.current += 1;
        if (phraseTimerRef.current >= 5) {
            setDarknessPhrase(VOID_PHRASES[Math.floor(Math.random() * VOID_PHRASES.length)]);
            phraseTimerRef.current = 0;
        }

        const state = gameStateRef.current;
        if (state && state.frame % 600 === 0) {
            track('fps_sample', {
                avg: 60,
                min: 30,
                enemies: state.enemies.length,
                particles: state.particles.length,
                projectiles: state.projectiles.length
            });
        }

        if (state.activeBoss) return;

        if (missionRef.current.type === 'DEFEAT_ENEMIES') {
            if (missionRef.current.timeLimit && missionRef.current.timeElapsed / 60 >= missionRef.current.timeLimit) {
                if (missionRef.current.current < missionRef.current.target) {
                    missionRef.current.failed = true;
                    setGameOver(true);
                    gameRefs.current.gameOver = true;
                    audio.pauseBgm();
                    setMissionFailed(true);
                    return;
                }
            }
            if (missionRef.current.current >= missionRef.current.target) {
                if (!refs.gameWon) {
                    setMapCompleted(refs.wave); gameRefs.current.mapCompleted = refs.wave;
                    audio.playEpicWin();
                }
            }
        } else if (missionRef.current.type === 'COLLECT_KEYS' || missionRef.current.type === 'DESTROY_MACHINES' || missionRef.current.type === 'CAPTURE_ZONE') {
            if (missionRef.current.current >= missionRef.current.target) {
                if (!refs.gameWon && gameRefs.current.mapCompleted === null) {
                    const isSpecialMission = currentMapNode?.mission?.rewardId;
                    if (isSpecialMission && isSpecialMission.startsWith('special_')) {
                        if (!specialMissionCinematicTriggeredRef.current) {
                            specialMissionCinematicTriggeredRef.current = true;
                            const cinematic = getSpecialAbilityCinematic(isSpecialMission);
                            gameRefs.current.activeCinematic = cinematic;
                            setActiveCinematic(cinematic);
                            gameRefs.current.mapCompleted = refs.wave;
                        }
                    } else {
                        setMapCompleted(refs.wave); gameRefs.current.mapCompleted = refs.wave;
                        audio.playEpicWin();
                    }
                }
            }
        } else if (missionRef.current.type === 'SURVIVE') {
            const isIntermissionActive = (state.intermissionTimer || 0) > 0;

            // Void Rush: Boon Draft every 30 seconds
            if (isVoidRush && state.frame > 0 && Math.floor(state.frame / 60) % VOID_RUSH_CONFIG.boonDraftIntervalSec === 0) {
                offerBoonsRef.current({ guaranteedRarePlus: false });
            }

            // Daily Session Quests progress check (once per second)
            if (dailyState && dailyState.quests && dailyState.quests.length > 0 && onUpdateDailyState) {
                let anyQuestChanged = false;
                let rewardSum = 0;
                const nextQuests = dailyState.quests.map(q => {
                    if (q.completed) return q;
                    const def = DAILY_QUEST_POOL.find(d => d.id === q.id);
                    if (!def) return q;
                    let cur = q.current;
                    if (def.metric === 'kills') cur = Math.max(cur, state.player?.totalKills || 0);
                    else if (def.metric === 'essence') cur = Math.max(cur, Math.round(sessionMatterRef.current));
                    else if (def.metric === 'waves_reached') cur = Math.max(cur, refs.wave);
                    else if (def.metric === 'combo') cur = Math.max(cur, state.player?.bestCombo || 0);
                    else if (def.metric === 'waves_no_dash') cur = Math.max(cur, cleanNoDashWavesRef.current);

                    if (cur === q.current) return q;
                    anyQuestChanged = true;
                    const half = Math.ceil(q.target * 0.5);
                    let notified50 = q.notified50;
                    if (cur >= half && cur < q.target && !notified50) {
                        notified50 = true;
                        enqueueToast({
                            id: `quest50_${q.id}`,
                            kind: 'QUEST',
                            title: `${t('QUEST 50%:', lang)} ${t(def.title, lang)}`,
                            subtitle: `${cur}/${q.target}`,
                            color: '#38bdf8'
                        });
                    }
                    if (cur >= q.target) {
                        rewardSum += q.rewardMatter;
                        enqueueToast({
                            id: `quest100_${q.id}`,
                            kind: 'QUEST',
                            title: `${t('QUEST COMPLETE:', lang)} ${t(def.title, lang)}`,
                            subtitle: `+${q.rewardMatter} ${t('Matter', lang)}`,
                            color: '#34d399'
                        });
                        return { ...q, current: q.target, completed: true, notified50: true };
                    }
                    return { ...q, current: cur, notified50 };
                });
                if (anyQuestChanged) {
                    if (rewardSum > 0) {
                        onCollectMatter(rewardSum);
                        setSessionMatter(m => m + rewardSum);
                    }
                    onUpdateDailyState({ ...dailyState, quests: nextQuests });
                }
            }
            
            if (isIntermissionActive) {
                // Intermission countdown in progress, do not decrement wave timer
                return;
            }

            if (pendingNextWaveRef.current !== null) {
                // Intermission ended, transition to next wave
                const nextWave = pendingNextWaveRef.current;
                pendingNextWaveRef.current = null;
                waveClearTriggeredRef.current = false;

                if (refs.wave === 1 && !refs.hasPickedFirstPower && !hasAnyPowerOwned(refs.unlockedAbilityIds)) {
                    setShowFirstPowerChoice(true);
                }

                // Void Rush ends at 6:00 (after Wave 18)
                if (isVoidRush && nextWave > 18) {
                    const vrScore = calculateVoidRushScore(
                        state?.player?.totalKills || 0,
                        state?.player?.bestCombo || 0,
                        Math.round((state?.frame || 0) / 60)
                    );
                    const vrReward = calculateVoidRushMatterReward(vrScore);
                    onCollectMatter(vrReward);
                    setSessionMatter(m => m + vrReward);
                    if (onRecordVoidRushScore) onRecordVoidRushScore(vrScore);
                    setGameOver(true);
                    gameRefs.current.gameOver = true;
                    audio.playEpicWin();
                    return;
                }
                
                if (IS_DEMO && nextWave > DEMO_MAX_WAVE) {
                    setGameWon(true); gameRefs.current.gameWon = true;
                    setTimeRemaining(0);
                    return;
                }
                
                if (nextWave > 140) {
                    setGameWon(true); gameRefs.current.gameWon = true;
                    setTimeRemaining(0);
                    return;
                }

                setWave(nextWave);
                setTimeRemaining(isVoidRush ? VOID_RUSH_CONFIG.waveDurationSec : 30);
                hpDamageTakenInWaveRef.current = false;
                waveStartMatterRef.current = sessionMatterRef.current;
                setWaveEssenceEarned(0);
                if (state) {
                    state.dashesUsedInWave = 0;
                    if (state.player) {
                        state.player.lastSparkAvailable = true;
                    }
                }
                
                if (nextWave > refs.maxWaveReached) {
                    refs.onUpdateMaxWave(nextWave);
                }

                const nextIndex = Math.min(nextWave, LIGHT_PHRASES.length - 1);
                setCurrentPhrase(LIGHT_PHRASES[nextIndex]);
                return;
            }

            if (refs.timeRemaining <= 1 && !waveClearTriggeredRef.current) {
                waveClearTriggeredRef.current = true;
                track('wave_clear', {
                    wave: refs.wave,
                    timeMs: isVoidRush ? 20000 : 30000,
                    hp: gameRefs.current.currentHealth,
                    shield: gameRefs.current.currentShield,
                    enemiesAlive: state.enemies.length,
                    avgFps: 60
                });

                if ((state.dashesUsedInWave || 0) === 0) {
                    cleanNoDashWavesRef.current += 1;
                }
                const isPerfect = !hpDamageTakenInWaveRef.current;
                onWaveClear(state, refs.wave, state.runMods);
                const res = recordWaveClear(
                    { ...mercyStateRef.current },
                    refs.wave,
                    isPerfect
                );
                const nextMercy = { ...res.updatedSave, mercyLevel: res.mercyLevel };
                updateMercyMultipliers(res.mercyLevel, refs.settings?.difficulty || 'normal');
                mercyStateRef.current = nextMercy;
                if (onUpdateMercyStateRef.current) {
                    onUpdateMercyStateRef.current(nextMercy);
                }
                if (!isVoidRush) {
                    offerBoonsRef.current({ guaranteedRarePlus: false });
                }
                const hitPause = WAVE_CLEAR_CONFIG.hitPauseFrames;
                const vortex = WAVE_CLEAR_CONFIG.vortexFrames;
                const intermission = refs.settings?.fastWaves ? WAVE_CLEAR_CONFIG.fastIntermissionFrames : WAVE_CLEAR_CONFIG.intermissionFrames;

                state.hitPauseTimer = hitPause;
                state.vortexTimer = vortex;
                state.vortexBatchCount = 0;
                state.intermissionTimer = intermission;
                state.intermissionMaxTimer = intermission;
                state.isPerfectWave = isPerfect;
                state.waveBannerText = isPerfect ? 'PERFECT WAVE! (+25% ESSENCE)' : (`WAVE ${refs.wave} CLEAR`);
                state.waveBannerTimer = 120;

                pendingNextWaveRef.current = refs.wave + 1;

                // White ring shockwave
                VFX.castShockwave(state, state.player.x, state.player.y, '#ffffff');
                spawnExplosion(state, state.player.x, state.player.y, '#ffffff', ParticleType.RING);

                // Gold ring shockwave for perfect wave
                if (isPerfect) {
                    VFX.castShockwave(state, state.player.x, state.player.y, '#fbbf24');
                    spawnExplosion(state, state.player.x, state.player.y, '#fbbf24', ParticleType.RING);
                }

                // Burst non-boss enemies into drops using swap-remove and drop pool
                const multiplier = isPerfect ? (1 + WAVE_CLEAR_CONFIG.perfectWaveBonus) : 1.0;
                for (let i = state.enemies.length - 1; i >= 0; i--) {
                    const e = state.enemies[i];
                    if (!e.isSemiBoss && !e.isBoss) {
                        const val = Math.round(e.def.essenceReward * multiplier);
                        state.drops.push(acquireDrop({ x: e.x, y: e.y, value: val }));
                        spawnExplosion(state, e.x, e.y, e.def.color, e.def.particleEffect || ParticleType.NORMAL);
                        swapRemoveEnemy(state.enemies, i);
                    }
                }
                for (let i = state.projectiles.length - 1; i >= 0; i--) {
                    swapRemoveProjectile(state.projectiles, i);
                }
                state.fireflyCount = 0;

                // Instant collection for excess drops > 40
                if (state.drops.length > WAVE_CLEAR_CONFIG.maxVortexSprites) {
                    const px = state.player.x;
                    const py = state.player.y;
                    state.drops.sort((a, b) => ((a.x - px) ** 2 + (a.y - py) ** 2) - ((b.x - px) ** 2 + (b.y - py) ** 2));

                    let instantSum = 0;
                    for (let i = WAVE_CLEAR_CONFIG.maxVortexSprites; i < state.drops.length; i++) {
                        instantSum += state.drops[i].value;
                    }
                    state.drops.length = WAVE_CLEAR_CONFIG.maxVortexSprites;
                    if (instantSum > 0) {
                        const collectAmount = Math.round(instantSum * refs.playerStats.essenceMultiplier);
                        onCollectMatter(collectAmount);
                        setSessionMatter(m => m + collectAmount);
                        audio.playCollect(1.2);
                    }
                }

                audio.playWaveClearStinger();
            } else if (refs.timeRemaining > 1) {
                setTimeRemaining(refs.timeRemaining - 1);
            }
        }
    };

    const step = () => {
        const refs = gameRefs.current;
        if (canvas.width !== window.innerWidth || canvas.height !== window.innerHeight) {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        }

        // CINEMATIC MODE RENDERER
        if (refs.activeCinematic) {
            const state = gameStateRef.current;
            state.frame++;
            
            if (refs.activeCinematic !== INTRO_SCRIPT && state.activeBoss) {
                const targetX = state.activeBoss.x - canvas.width / 2;
                const targetY = state.activeBoss.y - canvas.height / 2;
                state.camera.x += (targetX - state.camera.x) * 0.05;
                state.camera.y += (targetY - state.camera.y) * 0.05;
            }
            
            // Generate portal particles during the UI cinematic so the boss looks epic
            if (state.activeBoss && state.frame % 2 === 0) {
                 const enemy = state.activeBoss;
                 const angle = Math.random() * Math.PI * 2;
                 const dist = 150 + Math.random() * 50;
                 createParticle(state, enemy.x + Math.cos(angle) * dist, enemy.y + Math.sin(angle) * dist, ParticleType.VOID, '#000000', {
                     vx: -Math.cos(angle + 0.5) * 6, vy: -Math.sin(angle + 0.5) * 6,
                     life: 40, size: Math.random() * 8 + 4
                 });
            }

            updateParticles(state);
            
            // Render game in frozen state so boss is visible during cinematic!
            renderGame(ctx, state, refs.playerStats, canvas.width, canvas.height, refs.maturityScale, refs.color, refs.currentHealth);

            // DIM BACKGROUND FOR ALL CINEMATICS (pitch black for intro)
            if (refs.activeCinematic === INTRO_SCRIPT) {
                ctx.fillStyle = '#000000';
            } else {
                ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
            }
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
        if (!refs.paused && !refs.gameOver && !refs.gameWon && refs.mapCompleted === null) {
            stepCounterRef.current += 1;
            if (stepCounterRef.current >= 60) {
                stepCounterRef.current = 0;
                tickSecond();
            }

            const state = gameStateRef.current;
            state.wave = refs.wave;
            state.seenBossIntros = refs.seenBossIntros || state.seenBossIntros || [];
            const wasBossActive = !!state.activeBoss;
            const bossId = state.activeBoss?.def.id;
            
            updateGame(state, refs.playerStats, input, refs.wave, refs.timeRemaining, 
                (v) => { 
                    const roundedV = Math.round(v);
                    onCollectMatter(roundedV); 
                    hudBridgeRef.current.sessionMatter += roundedV;
                    
                    // Progressive tutorial cinematic when player collects essence/matter for the first time
                    if (v > 0 && !hasTriggeredEssenceTutorialRef.current) {
                        hasTriggeredEssenceTutorialRef.current = true;
                        localStorage.setItem('void_essence_tutorial_completed', 'true');
                        gameRefs.current.activeCinematic = ESSENCE_TUTORIAL_SCRIPT;
                        setActiveCinematic(ESSENCE_TUTORIAL_SCRIPT);
                    }
                    
                    // Accumulate Light Energy (+50% faster if special_lightPurge is unlocked)
                    const purgeMult = refs.playerStats.special_lightPurge ? 1.5 : 1.0;
                    state.player.lightEnergy = Math.min(100, (state.player.lightEnergy || 0) + (v * 2.5 * purgeMult));
                    
                    // Accumulate Essence for gradual circle-by-circle healing
                    state.player.essenceHealProgress = (state.player.essenceHealProgress || 0) + v;
                    if (gameRefs.current.currentHealth >= refs.playerStats.maxHealth) {
                        state.player.essenceHealProgress = 0;
                    }

                    // Essence collected callback
                },
                handleDamage,
                (id) => refs.onEnemySeen(id),
                window.innerWidth, window.innerHeight, refs.maturityScale, refs.color,
                refs.settings.mouseMovementEnabled && isPCEnvironment(),
                refs.settings
            );

            // Check for Secret Key collection
            if (state.secretKeyCollected) {
                state.secretKeyCollected = false; // Reset

                const wasAlreadyCompleted = initialCompletedRef.current || keyAwardedInRunRef.current;
                if (!wasAlreadyCompleted) {
                    keyAwardedInRunRef.current = true;
                    const currentKeys = refs.specialMissionKeys !== undefined ? refs.specialMissionKeys : (specialMissionKeys || 0);
                    const nextKeys = currentKeys + 1;
                    gameRefs.current.specialMissionKeys = nextKeys;
                    setLocalSpecialKeys(nextKeys);
                    if (onUpdateSpecialMissionKeys) onUpdateSpecialMissionKeys(nextKeys);
                }

                if (currentMapId === 'map_1') {
                    map1SideMissionCompletedRef.current = true;
                    if (onUpdateMap1SideMissionCompleted) onUpdateMap1SideMissionCompleted(true);
                }

                if (currentMapId === 'map_6' || wave >= 50) {
                    map6KeysCollectedRef.current++;
                    state.map6KeysCollected = map6KeysCollectedRef.current;
                }
                checkMap6TwoKeysCinematic();

                checkAndDiscoverSecret(false, false);

                audio.playLevelUp();
                
                // Particle burst around the player in golden colors!
                for (let i = 0; i < 40; i++) {
                    createParticle(state, state.player.x, state.player.y, ParticleType.BOSS_AURA, '#fbbf24', {
                        speed: 10 + Math.random() * 8, life: 60 + Math.random() * 40, size: 6 + Math.random() * 6
                    });
                }
                VFX.castShockwave(state, state.player.x, state.player.y, '#fbbf24');

                // Trigger tutorial cinematic if first time obtaining a key
                const hasSeenKeyTutorial = localStorage.getItem('void_key_tutorial_completed') === 'true' || refs.hasObtainedFirstKey;
                if (!hasSeenKeyTutorial) {
                    localStorage.setItem('void_key_tutorial_completed', 'true');
                    if (refs.onSetHasObtainedFirstKey) refs.onSetHasObtainedFirstKey();
                    gameRefs.current.activeCinematic = FIRST_KEY_TUTORIAL_SCRIPT;
                    setActiveCinematic(FIRST_KEY_TUTORIAL_SCRIPT);
                }
            }

            // Stage HUD state into ref bridge (flushed at 10 Hz only when changed)
            const nextLightEnergy = Math.floor(state.player.lightEnergy || 0);
            const prevLightEnergy = hudBridgeRef.current.lightEnergy;
            if (prevLightEnergy < 100 && nextLightEnergy >= 100) {
                audio.playBeamReadyStinger();
                triggerHaptic('beamReady', refs.settings);
            }
            if (prevLightEnergy >= 100 && nextLightEnergy < 10 && !seenBeamHint && onMarkBeamHintSeen) {
                onMarkBeamHintSeen();
            }
            hudBridgeRef.current.lightEnergy = nextLightEnergy;
            hudBridgeRef.current.comboCount = state.player.comboCount || 0;
            if (state.heartsCollected && state.heartsCollected > 0) {
                const hearts = state.heartsCollected;
                state.heartsCollected = 0;
                const maxHp = refs.playerStats.maxHealth;
                const nextHp = Math.min(maxHp, gameRefs.current.currentHealth + hearts);
                gameRefs.current.currentHealth = nextHp;
                hudBridgeRef.current.health = nextHp;
                createParticle(state, state.player.x, state.player.y, ParticleType.HEAL, '#4ade80', {
                    speed: 3, life: 30, size: 5
                });
            }
            if (missionRef.current.type === 'DEFEAT_ENEMIES') {
                missionRef.current.current = state.player.totalKills || 0;
            }
            // Primary Mission Capture Zone Tick
            if (state.mission && state.mission.type === 'CAPTURE_ZONE' && state.mission.captureZone) {
                const cz = state.mission.captureZone;
                const px = state.player.x;
                const py = state.player.y;
                const dx = cz.x - px;
                const dy = cz.y - py;
                const dist = Math.sqrt(dx * dx + dy * dy);

                if (dist < cz.radius) {
                    cz.captureTimeCurrent = Math.min(cz.captureTimeTotal, cz.captureTimeCurrent + 1);
                    state.mission.current = cz.captureTimeCurrent;

                    // Spawn gold/yellow particles on tick inside capture zone
                    if (state.frame % 3 === 0) {
                        const angle = Math.random() * Math.PI * 2;
                        const rx = cz.x + Math.cos(angle) * cz.radius;
                        const ry = cz.y + Math.sin(angle) * cz.radius;
                        createParticle(state, rx, ry, ParticleType.GLOW, '#eab308', {
                            vx: -Math.cos(angle) * (1 + Math.random() * 2),
                            vy: -Math.sin(angle) * (1 + Math.random() * 2),
                            life: 20,
                            size: 2 + Math.random() * 3
                        });
                    }
                }
            }

            if (missionRef.current.type === 'COLLECT_KEYS' || missionRef.current.type === 'DESTROY_MACHINES' || missionRef.current.type === 'CAPTURE_ZONE') {
                missionRef.current.current = state.mission?.current || 0;
            }
            hudBridgeRef.current.missionProgress = missionRef.current.current;
            missionRef.current.timeElapsed++;

            // Side Mission Tick/Processing
            if (state.sideMission && !state.sideMission.completed && !state.sideMission.failed && !(wave > 0 && wave % 10 === 0)) {
                const sm = state.sideMission;
                const px = state.player.x;
                const py = state.player.y;

                // Handle timer if mission is timed
                if (sm.timeRemaining !== undefined && sm.timeRemaining > 0) {
                    if (state.frame % 60 === 0) {
                        sm.timeRemaining--;
                        if (sm.timeRemaining <= 0) {
                            sm.failed = true;
                            sm.completed = true;
                            VFX.castShockwave(state, px, py, '#f43f5e');
                            setLocalSideMission({ ...sm });
                            if (onUpdateSideMission) onUpdateSideMission({ ...sm });
                        }
                    }
                }

                if (!sm.failed) {
                    // Update movement for moving entities strictly within sandbox
                    const bound = WORLD_SIZE / 2 - 150;
                    if (sm.collectTargets) {
                        for (const target of sm.collectTargets) {
                            if (!target.collected && target.vx !== undefined && target.vy !== undefined) {
                                target.x += target.vx + Math.sin(state.frame * 0.05 + target.x) * 0.5;
                                target.y += target.vy + Math.cos(state.frame * 0.05 + target.y) * 0.5;
                                if (target.x > bound) { target.x = bound; target.vx = -Math.abs(target.vx); }
                                else if (target.x < -bound) { target.x = -bound; target.vx = Math.abs(target.vx); }
                                if (target.y > bound) { target.y = bound; target.vy = -Math.abs(target.vy); }
                                else if (target.y < -bound) { target.y = -bound; target.vy = Math.abs(target.vy); }
                            }
                        }
                    }

                    if (sm.destroyTargets) {
                        for (const target of sm.destroyTargets) {
                            if (target.hp > 0 && target.vx !== undefined && target.vy !== undefined) {
                                target.x += target.vx;
                                target.y += target.vy;
                                if (target.x > bound) { target.x = bound; target.vx = -Math.abs(target.vx); }
                                else if (target.x < -bound) { target.x = -bound; target.vx = Math.abs(target.vx); }
                                if (target.y > bound) { target.y = bound; target.vy = -Math.abs(target.vy); }
                                else if (target.y < -bound) { target.y = -bound; target.vy = Math.abs(target.vy); }
                            }
                        }
                    }

                    if (sm.captureZones) {
                        for (const cz of sm.captureZones) {
                            if (!cz.captured && cz.vx !== undefined && cz.vy !== undefined) {
                                cz.x += cz.vx;
                                cz.y += cz.vy;
                                if (cz.x > bound) { cz.x = bound; cz.vx = -Math.abs(cz.vx); }
                                else if (cz.x < -bound) { cz.x = -bound; cz.vx = Math.abs(cz.vx); }
                                if (cz.y > bound) { cz.y = bound; cz.vy = -Math.abs(cz.vy); }
                                else if (cz.y < -bound) { cz.y = -bound; cz.vy = Math.abs(cz.vy); }
                            }
                        }
                    }

                    // --- COLLECT PROCESSING ---
                    if (sm.type === 'COLLECT' && sm.collectTargets) {
                        let updated = false;
                        for (const target of sm.collectTargets) {
                            if (!target.collected) {
                                const dx = target.x - px;
                                const dy = target.y - py;
                                const dist = Math.sqrt(dx * dx + dy * dy);
                                if (dist < 45) {
                                    target.collected = true;
                                    if (!sm.started) sm.started = true;
                                    sm.current++;
                                    updated = true;
                                    if (audio.playOrbSpawn) audio.playOrbSpawn();
                                    
                                    const color = target.color || '#22d3ee';
                                    for (let i = 0; i < 15; i++) {
                                        const angle = Math.random() * Math.PI * 2;
                                        const speed = 2 + Math.random() * 4;
                                        createParticle(state, target.x, target.y, ParticleType.GLOW, color, {
                                            vx: Math.cos(angle) * speed,
                                            vy: Math.sin(angle) * speed,
                                            life: 30 + Math.random() * 20,
                                            size: Math.random() * 5 + 2
                                        });
                                    }
                                }
                            }
                        }
                        if (updated) {
                            if (sm.current >= sm.target) {
                                sm.completed = true;
                                if (audio.playLevelUp) audio.playLevelUp();
                                VFX.castShockwave(state, px, py, '#d946ef');

                                if (currentMapId === 'map_1') {
                                    map1SideMissionCompletedRef.current = true;
                                    if (onUpdateMap1SideMissionCompleted) onUpdateMap1SideMissionCompleted(true);
                                }
                                checkAndDiscoverSecret(false, true);

                                state.secretKeyCollected = true;
                                state.drops.push({
                                    x: px, y: py, value: 0, isKey: true, isSecretKey: true
                                });

                                for (let i = 0; i < 25; i++) {
                                    const angle = Math.random() * Math.PI * 2;
                                    const speed = 2 + Math.random() * 5;
                                    createParticle(state, px, py, ParticleType.GLOW, '#fbbf24', {
                                        vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
                                        life: 40 + Math.random() * 30, size: Math.random() * 6 + 3
                                    });
                                }
                            }
                            setLocalSideMission({ ...sm });
                            if (onUpdateSideMission) onUpdateSideMission({ ...sm });
                        }
                    } 
                    // --- CAPTURE PROCESSING ---
                    else if (sm.type === 'CAPTURE') {
                        if (sm.captureZones) {
                            // Multi zone capture logic
                            let standingInZone = false;
                            for (const cz of sm.captureZones) {
                                if (!cz.captured) {
                                    const dx = cz.x - px;
                                    const dy = cz.y - py;
                                    const dist = Math.sqrt(dx * dx + dy * dy);
                                    if (dist < cz.radius) {
                                        standingInZone = true;
                                        if (!sm.started) sm.started = true;
                                        cz.progress = Math.min(100, cz.progress + 1);
                                        if (cz.progress >= 100) {
                                            cz.captured = true;
                                            sm.current++;
                                            if (audio.playOrbSpawn) audio.playOrbSpawn();
                                            VFX.castShockwave(state, cz.x, cz.y, '#22d3ee');
                                        }
                                    }
                                }
                            }
                            if (standingInZone && state.frame % 3 === 0) {
                                const angle = Math.random() * Math.PI * 2;
                                createParticle(state, px + Math.cos(angle) * 30, py + Math.sin(angle) * 30, ParticleType.GLOW, '#22d3ee', {
                                    vx: 0, vy: -1, life: 15, size: 3
                                });
                            }
                            if (sm.current >= sm.target) {
                                sm.completed = true;
                                if (audio.playLevelUp) audio.playLevelUp();
                                VFX.castShockwave(state, px, py, '#d946ef');

                                if (currentMapId === 'map_1') {
                                    map1SideMissionCompletedRef.current = true;
                                    if (onUpdateMap1SideMissionCompleted) onUpdateMap1SideMissionCompleted(true);
                                }
                                checkAndDiscoverSecret(false, true);

                                state.secretKeyCollected = true;
                                state.drops.push({
                                    x: px, y: py, value: 0, isKey: true, isSecretKey: true
                                });

                                for (let i = 0; i < 25; i++) {
                                    const angle = Math.random() * Math.PI * 2;
                                    const speed = 2 + Math.random() * 5;
                                    createParticle(state, px, py, ParticleType.GLOW, '#fbbf24', {
                                        vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
                                        life: 40 + Math.random() * 30, size: Math.random() * 6 + 3
                                    });
                                }
                            }
                            if (state.frame % 5 === 0 || sm.completed) {
                                setLocalSideMission({ ...sm });
                                if (onUpdateSideMission) onUpdateSideMission({ ...sm });
                            }
                        } else if (sm.captureZone) {
                            // Single zone capture logic
                            const cz = sm.captureZone;
                            const dx = cz.x - px;
                            const dy = cz.y - py;
                            const dist = Math.sqrt(dx * dx + dy * dy);
                            
                            if (dist < cz.radius) {
                                if (!sm.started) sm.started = true;
                                cz.captureTimeCurrent = Math.min(cz.captureTimeTotal, cz.captureTimeCurrent + 1);
                                sm.current = cz.captureTimeCurrent;
                                
                                if (state.frame % 3 === 0) {
                                    const angle = Math.random() * Math.PI * 2;
                                    const rx = cz.x + Math.cos(angle) * cz.radius;
                                    const ry = cz.y + Math.sin(angle) * cz.radius;
                                    createParticle(state, rx, ry, ParticleType.GLOW, '#22d3ee', {
                                        vx: -Math.cos(angle) * (1 + Math.random() * 2),
                                        vy: -Math.sin(angle) * (1 + Math.random() * 2),
                                        life: 20, size: 2 + Math.random() * 3
                                    });
                                }
                                
                                if (cz.captureTimeCurrent >= cz.captureTimeTotal) {
                                    sm.completed = true;
                                    if (audio.playLevelUp) audio.playLevelUp();
                                    VFX.castShockwave(state, px, py, '#d946ef');

                                    if (currentMapId === 'map_1') {
                                        map1SideMissionCompletedRef.current = true;
                                        if (onUpdateMap1SideMissionCompleted) onUpdateMap1SideMissionCompleted(true);
                                    }
                                    checkAndDiscoverSecret(false, true);

                                    state.secretKeyCollected = true;
                                    state.drops.push({
                                        x: px, y: py, value: 0, isKey: true, isSecretKey: true
                                    });

                                    for (let i = 0; i < 25; i++) {
                                        const angle = Math.random() * Math.PI * 2;
                                        const speed = 2 + Math.random() * 5;
                                        createParticle(state, px, py, ParticleType.GLOW, '#fbbf24', {
                                            vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
                                            life: 40 + Math.random() * 30, size: Math.random() * 6 + 3
                                        });
                                    }
                                }
                                if (state.frame % 5 === 0 || sm.completed) {
                                    setLocalSideMission({ ...sm });
                                    if (onUpdateSideMission) onUpdateSideMission({ ...sm });
                                }
                            }
                        }
                    } 
                    // --- DESTROY PROCESSING ---
                    else if (sm.type === 'DESTROY' && sm.destroyTargets) {
                        let updated = false;
                        for (const target of sm.destroyTargets) {
                            if (target.hp > 0) {
                                for (const proj of state.projectiles) {
                                    if (proj.vx !== 0 || proj.vy !== 0) {
                                        const dx = proj.x - target.x;
                                        const dy = proj.y - target.y;
                                        const dist = Math.sqrt(dx * dx + dy * dy);
                                        if (dist < target.size + 15) {
                                            target.hp -= 20;
                                            proj.vx = 0; proj.vy = 0;
                                            
                                            for (let i = 0; i < 5; i++) {
                                                const angle = Math.random() * Math.PI * 2;
                                                createParticle(state, proj.x, proj.y, ParticleType.GLOW, '#f43f5e', {
                                                    vx: Math.cos(angle) * 3, vy: Math.sin(angle) * 3,
                                                    life: 15, size: 2
                                                });
                                            }
                                            
                                            if (target.hp <= 0) {
                                                if (!sm.started) sm.started = true;
                                                sm.current++;
                                                updated = true;
                                                if (audio.playOrbSpawn) audio.playOrbSpawn();
                                                
                                                // Spawn semi-boss on first pylon destroyed
                                                if (sm.current === 1 && sm.variant === 'PYLONS') {
                                                    const sbType = Math.floor(Math.random() * 3);
                                                    
                                                    const sbId = sbType === 0 ? 'sb_hunter' : sbType === 1 ? 'sb_swarm' : 'sb_laser';
                                                    if (onEnemySeen) onEnemySeen(sbId);
                                                    
                                                    const sbDef = {
                                                        id: sbId,
                                                        name: sbType === 0 ? 'Hunter Pylon' : sbType === 1 ? 'Swarm Pylon' : 'Laser Pylon',
                                                        description: 'A manifestation of the void.',
                                                        baseHp: 50000,
                                                        hpScaling: 0,
                                                        baseSpeed: sbType === 0 ? 1.5 : sbType === 1 ? 1.0 : 0.8,
                                                        size: 90,
                                                        color: sbType === 0 ? '#b91c1c' : sbType === 1 ? '#16a34a' : '#ca8a04',
                                                        glowColor: sbType === 0 ? '#ef4444' : sbType === 1 ? '#4ade80' : '#facc15',
                                                        behavior: 'SEMI_BOSS' as any,
                                                        visualType: 'SEMI_BOSS' as any,
                                                        spawnWeight: 0,
                                                        minWave: 0,
                                                        essenceReward: 1000,
                                                        particleEffect: 1 // ParticleType.VOID
                                                    };
                                                    state.enemies.push(initializeEnemy({
                                                        x: target.x,
                                                        y: target.y,
                                                        vx: 0,
                                                        vy: 0,
                                                        hp: 50000,
                                                        maxHp: 50000,
                                                        def: sbDef,
                                                        speed: sbDef.baseSpeed,
                                                        size: 90,
                                                        state: { timer: 0, phase: 0, custom: { sbType } },
                                                        projectileImmunity: 0,
                                                        isMachine: false,
                                                        isSemiBoss: true,
                                                        isSlowImmune: true
                                                    } as any));

                                                    // trigger semi boss entrance
                                                    window.dispatchEvent(new CustomEvent('semi_boss_spawned', { detail: { type: sbType } }));
                                                }
                                                
                                                for (let i = 0; i < 20; i++) {
                                                    const angle = Math.random() * Math.PI * 2;
                                                    const speed = 3 + Math.random() * 5;
                                                    createParticle(state, target.x, target.y, ParticleType.GLOW, '#f43f5e', {
                                                        vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
                                                        life: 30 + Math.random() * 20, size: Math.random() * 6 + 3
                                                    });
                                                }
                                                VFX.castShockwave(state, target.x, target.y, '#f43f5e');
                                            }
                                        }
                                    }
                                }
                            }
                        }
                        
                        if (updated) {
                            if (sm.current >= sm.target) {
                                sm.completed = true;
                                if (audio.playLevelUp) audio.playLevelUp();
                                VFX.castShockwave(state, px, py, '#d946ef');

                                if (currentMapId === 'map_1') {
                                    map1SideMissionCompletedRef.current = true;
                                    if (onUpdateMap1SideMissionCompleted) onUpdateMap1SideMissionCompleted(true);
                                }
                                checkAndDiscoverSecret(false, true);

                                state.secretKeyCollected = true;
                                state.drops.push({
                                    x: px, y: py, value: 0, isKey: true, isSecretKey: true
                                });

                                for (let i = 0; i < 25; i++) {
                                    const angle = Math.random() * Math.PI * 2;
                                    const speed = 2 + Math.random() * 5;
                                    createParticle(state, px, py, ParticleType.GLOW, '#fbbf24', {
                                        vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
                                        life: 40 + Math.random() * 30, size: Math.random() * 6 + 3
                                    });
                                }
                            }
                            setLocalSideMission({ ...sm });
                            if (onUpdateSideMission) onUpdateSideMission({ ...sm });
                        }
                    }
                }
            }

            // --- INTERACTIVE TUTORIAL STATE MACHINE ON TICK ---
            const currentStep = refs.tutorialStep;
            if (currentStep !== null) {
                if (currentStep === 1) {
                    const moved = input.keys['KeyW'] || input.keys['KeyA'] || input.keys['KeyS'] || input.keys['KeyD'] ||
                                  input.keys['ArrowUp'] || input.keys['ArrowLeft'] || input.keys['ArrowDown'] || input.keys['ArrowRight'] ||
                                  (refs.settings.mouseMovementEnabled && isPCEnvironment() && (input.mouseX !== window.innerWidth/2 || input.mouseY !== window.innerHeight/2)) ||
                                  Math.abs(input.virtualMove.x) > 0.1 || Math.abs(input.virtualMove.y) > 0.1;
                    if (moved) {
                        movementTimerRef.current = (movementTimerRef.current || 0) + 1;
                        if (movementTimerRef.current >= 45) { // ~0.75 seconds of movement
                            setTutorialStep(2);
                            audio.playLevelUp();
                        }
                    }
                } else if (currentStep === 2) {
                    const didDash = state.player.dashCooldownTimer > 0;
                    if (didDash) {
                        setTutorialStep(3);
                        audio.playLevelUp();
                        tutorialCompleteTimerRef.current = 300; // 5 seconds display
                    }
                } else if (currentStep === 3) {
                    if (tutorialCompleteTimerRef.current > 0) {
                        tutorialCompleteTimerRef.current--;
                        if (refs.paused) {
                            tutorialCompleteTimerRef.current = 0;
                        }
                    } else {
                        setTutorialStep(null);
                        localStorage.setItem('void_tutorial_completed', 'true');
                    }
                }
            }

            // Boss Shout Update
            if (state.activeBoss?.state?.custom?.shout) {
                setDarknessPhrase(state.activeBoss.state.custom.shout);
                state.activeBoss.state.custom.shout = '';
            }

            // Check if boss just died
            if (wasBossActive && !state.activeBoss && bossId) {
                audio.setBossLayer(false);
                refs.onBossDefeated(bossId);
                offerBoonsRef.current({ guaranteedRarePlus: true });

                const fightSeconds = Math.max(1, Math.round((state.frame - bossSpawnFrameRef.current) / 60));
                const dmgTaken = Math.max(0, totalDamageTakenRunRef.current - bossStartDamageTakenRef.current);
                const attempts = (bossFailedAttemptsSessionRef.current[bossId] || 0) + 1;
                const matterAward = BOSS_VICTORY_CONFIG.bossMatterRewards[bossId] || 150;
                onCollectMatter(matterAward);
                hudBridgeRef.current.sessionMatter += matterAward;
                setSessionMatter(m => m + matterAward);

                const bossNames: Record<string, string> = {
                    hive_mind: 'THE HIVE MIND',
                    void_warden: 'VOID WARDEN',
                    crimson_eclipse: 'CRIMSON ECLIPSE',
                    neutron_star: 'COLLAPSING NEUTRON',
                    entropy_titan: 'ENTROPY TITAN',
                    darkness: 'THE DARKNESS'
                };
                const bName = bossNames[bossId] || bossId.toUpperCase();

                if (onRecordBossTrophyRef.current) {
                    onRecordBossTrophyRef.current({
                        bossId,
                        bossName: bName,
                        fightTimeSec: fightSeconds,
                        damageTaken: dmgTaken,
                        attempts,
                        date: new Date().toISOString()
                    });
                }

                const outroScript = BOSS_SCRIPTS[bossId]?.outro;
                pendingBossOutroRef.current = {
                    script: outroScript && outroScript.length > 0 ? outroScript : undefined,
                    isWin: bossId === 'darkness'
                };

                setBossVictoryData({
                    bossId,
                    bossName: bName,
                    fightTimeSeconds: fightSeconds,
                    damageTaken: dmgTaken,
                    attempts,
                    matterEarned: matterAward,
                    archiveUnlocked: true
                });
            }
            
            // Check for Boss Spawn (To Trigger Intro or 1.5s Title Card)
            if (state.bossSpawnedWave === refs.wave && state.activeBoss && !wasBossActive) {
                audio.setBossLayer(true);
                bossSpawnFrameRef.current = state.frame;
                bossStartDamageTakenRef.current = totalDamageTakenRunRef.current;
                // Boss just appeared this frame in Logic.ts
                const id = state.activeBoss.def.id;
                checkMap6TwoKeysCinematic();
                const seenIntros = refs.seenBossIntros || [];
                if (seenIntros.includes(id)) {
                    // Retry: show 1.5s title card banner instead of full dialogue
                    setRetryTitleCard({
                        showing: true,
                        bossName: state.activeBoss.def.name,
                        woundedStacks: state.activeBoss.woundedStacks || 0
                    });
                    retryTitleCardTimerRef.current = 90; // 90 frames = 1.5s
                } else if (BOSS_SCRIPTS[id]?.intro) {
                    gameRefs.current.activeCinematic = BOSS_SCRIPTS[id].intro!;
                    setActiveCinematic(BOSS_SCRIPTS[id].intro!);
                }
            }

            if (retryTitleCardTimerRef.current > 0) {
                retryTitleCardTimerRef.current--;
                if (retryTitleCardTimerRef.current <= 0) {
                    setRetryTitleCard(null);
                }
            }

            // --- REGEN LOGIC (Per Frame) ---
            const maxHp = refs.playerStats.maxHealth;
            const currentHp = gameRefs.current.currentHealth;

            if (currentHp >= maxHp) {
                regenAccRef.current = 0;
                if (state.player) state.player.essenceHealProgress = 0;
            } else {
                // 1. Essence Healing (gradual, 1 HP circle at a time with tick interval)
                if (essenceHealCooldownRef.current > 0) {
                    essenceHealCooldownRef.current--;
                } else if (state.player && (state.player.essenceHealProgress || 0) >= 10) {
                    const nextHp = currentHp + 1;
                    gameRefs.current.currentHealth = nextHp;
                    hudBridgeRef.current.health = nextHp;
                    state.player.essenceHealProgress = Math.max(0, state.player.essenceHealProgress - 10);
                    essenceHealCooldownRef.current = 15; // 15 frames delay (~0.25s) between circle heals
                    createParticle(state, state.player.x, state.player.y, ParticleType.HEAL, '#22c55e', {
                        speed: 3, life: 30, size: 4
                    });
                }

                // 2. Passive Health Regeneration (stat-based)
                if (refs.playerStats.healthRegen > 0) {
                    regenAccRef.current += refs.playerStats.healthRegen / 60;
                    if (regenAccRef.current >= 1) {
                        const nextHp = Math.min(maxHp, gameRefs.current.currentHealth + 1);
                        gameRefs.current.currentHealth = nextHp; 
                        hudBridgeRef.current.health = nextHp;
                        regenAccRef.current = 0;
                        createParticle(state, state.player.x, state.player.y, ParticleType.HEAL, '#22c55e', {
                            speed: 2, life: 25, size: 4
                        });
                    }
                }
            }

            const currentMaturityMaxShield = Math.min(5, Math.max(0, Math.floor((refs.maturityScale - 1.0) * 2.5)));
            
            if (refs.currentShield >= currentMaturityMaxShield) {
                shieldRegenAccRef.current = 0;
            } else if (shieldCooldownRef.current > 0) {
                shieldCooldownRef.current--;
            } else {
                const regenRatePerSec = 0.5 + (refs.playerStats.healthRegen * 0.2);
                shieldRegenAccRef.current += regenRatePerSec / 60;
                if (shieldRegenAccRef.current >= 1) {
                    const nextShield = Math.min(currentMaturityMaxShield, refs.currentShield + 1);
                    gameRefs.current.currentShield = nextShield;
                    hudBridgeRef.current.shield = nextShield;
                    shieldRegenAccRef.current = 0;
                    createParticle(state, state.player.x, state.player.y, ParticleType.GLOW, '#fbbf24', { life: 20, size: 5, speed: 2 });
                }
            }

            // 10 Hz HUD Ref -> State Bridge (every 6 frames at 60fps = 10 Hz, only on change)
            hudSyncFrameRef.current++;
            if (hudSyncFrameRef.current >= 6) {
                hudSyncFrameRef.current = 0;
                const bridge = hudBridgeRef.current;
                const targetHp = gameRefs.current.currentHealth;
                setCurrentHealth(prev => (prev !== targetHp ? targetHp : prev));
                const targetShield = gameRefs.current.currentShield;
                setCurrentShield(prev => (prev !== targetShield ? targetShield : prev));
                const targetMatter = bridge.sessionMatter;
                setSessionMatter(prev => (prev !== targetMatter ? targetMatter : prev));
                const targetEnergy = bridge.lightEnergy;
                setLightEnergy(prev => (prev !== targetEnergy ? targetEnergy : prev));
                const targetCombo = bridge.comboCount;
                setComboCount(prev => (prev !== targetCombo ? targetCombo : prev));
                const targetMission = bridge.missionProgress;
                setMissionProgress(prev => (prev !== targetMission ? targetMission : prev));
            }
        }
    };

    const render = () => {
        const refs = gameRefs.current;
        const state = gameStateRef.current;
        const q = getQuality(state.performanceMode);
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        const cssW = window.innerWidth;
        const cssH = window.innerHeight;
        const backingW = Math.max(1, Math.round(cssW * dpr * q.resolutionScale));
        const backingH = Math.max(1, Math.round(cssH * dpr * q.resolutionScale));

        if (canvas.width !== backingW || canvas.height !== backingH) {
            canvas.width = backingW;
            canvas.height = backingH;
            canvas.style.width = `${cssW}px`;
            canvas.style.height = `${cssH}px`;
        }
        ctx.setTransform(backingW / cssW, 0, 0, backingH / cssH, 0, 0);

        if (refs.activeCinematic) {
            renderGame(ctx, state, refs.playerStats, cssW, cssH, refs.maturityScale, refs.color, refs.currentHealth, refs.settings);

            if (refs.activeCinematic === INTRO_SCRIPT) {
                ctx.fillStyle = '#000000';
            } else {
                ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
            }
            ctx.fillRect(0, 0, cssW, cssH);

            ctx.save();
            ctx.translate(cssW / 2 - state.camera.x, cssH / 2 - state.camera.y);
            if (refs.activeCinematic === INTRO_SCRIPT) {
                 ctx.translate(state.camera.x, state.camera.y);
            }
            
            ctx.globalCompositeOperation = 'lighter'; 
            for (let i = 0; i < state.particles.length; i++) {
                const p = state.particles[i];
                ctx.globalAlpha = p.alpha ?? 1;
                ctx.fillStyle = p.color;
                ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI*2); ctx.fill();
            }
            ctx.globalAlpha = 1;
            ctx.globalCompositeOperation = 'source-over';
            ctx.restore();
        } else {
            renderGame(ctx, state, refs.playerStats, cssW, cssH, refs.maturityScale, refs.color, refs.currentHealth, refs.settings);
        }
    };

    const loop = (timestamp: number) => {
        if (!lastTimeRef.current) {
            lastTimeRef.current = timestamp;
        }

        // Pause rAF simulation steps & accumulator when auto-paused on blur/hidden/pagehide or during 3-2-1 countdown
        if (isLifecyclePausedRef.current || resumeCountdownRef.current !== null) {
            lastTimeRef.current = timestamp;
            accumulatorRef.current = 0;
            render();
            anim = requestAnimationFrame(loop);
            return;
        }

        let dt = timestamp - lastTimeRef.current;
        lastTimeRef.current = timestamp;

        if (devTargetFrameMs > 0) {
            if (lastRenderTimeRef.current > 0 && timestamp - lastRenderTimeRef.current < devTargetFrameMs - 0.5) {
                anim = requestAnimationFrame(loop);
                return;
            }
        }
        lastRenderTimeRef.current = timestamp;

        if (dt > 0 && dt < 250) {
            avgFrameMsRef.current = avgFrameMsRef.current * 0.92 + dt * 0.08;
        }

        if (dt > GAME_LOOP_CONFIG.MAX_FRAME_DT_MS) {
            dt = GAME_LOOP_CONFIG.MAX_FRAME_DT_MS;
        }

        const slowMoFactor = (gameStateRef.current?.slowMoTimer || 0) > 0 ? 0.4 : 1.0;
        accumulatorRef.current += dt * GAME_LOOP_CONFIG.TIME_SCALE * slowMoFactor;

        let stepsRun = 0;
        const stepStart = performance.now();
        while (accumulatorRef.current >= GAME_LOOP_CONFIG.STEP_MS && stepsRun < GAME_LOOP_CONFIG.MAX_STEPS_PER_FRAME) {
            step();
            accumulatorRef.current -= GAME_LOOP_CONFIG.STEP_MS;
            stepsRun++;
        }
        const stepElapsed = performance.now() - stepStart;
        if (stepsRun > 0) {
            avgStepMsRef.current = avgStepMsRef.current * 0.9 + (stepElapsed / stepsRun) * 0.1;
        }

        if (stepsRun >= GAME_LOOP_CONFIG.MAX_STEPS_PER_FRAME) {
            accumulatorRef.current = 0;
        }

        const renderStart = performance.now();
        render();
        const renderElapsed = performance.now() - renderStart;
        avgRenderMsRef.current = avgRenderMsRef.current * 0.9 + renderElapsed * 0.1;

        // Dynamic Quality Governor:
        // If avg frame time > 22ms for 3s (~180 frames), step quality down one level (small toast).
        // Step up only after 20s (~1200 frames) under 14ms.
        const state = gameStateRef.current;
        const refs = gameRefs.current;
        if (!refs.paused && !refs.gameOver && !refs.gameWon && !refs.activeCinematic) {
            if (avgFrameMsRef.current > 22) {
                governorHighMsFramesRef.current++;
                governorLowMsFramesRef.current = 0;
                if (governorHighMsFramesRef.current >= 180) {
                    governorHighMsFramesRef.current = 0;
                    const nextMode = stepQualityDown(state.performanceMode);
                    if (nextMode !== state.performanceMode) {
                        state.performanceMode = nextMode;
                        enqueueToast({
                            id: `gov_down_${Date.now()}`,
                            kind: 'GOVERNOR' as any,
                            title: `QUALITY: ${nextMode}`,
                            subtitle: 'Auto-scaled for smooth frame rate',
                            color: '#f59e0b'
                        });
                    }
                }
            } else if (avgFrameMsRef.current < 14) {
                governorLowMsFramesRef.current++;
                governorHighMsFramesRef.current = 0;
                if (governorLowMsFramesRef.current >= 1200) {
                    governorLowMsFramesRef.current = 0;
                    const maxSetting = refs.settings?.performanceMode || 'HIGH';
                    const order: Record<string, number> = { LOW: 0, MEDIUM: 1, HIGH: 2 };
                    const nextMode = stepQualityUp(state.performanceMode);
                    if (nextMode !== state.performanceMode && (order[nextMode] ?? 2) <= (order[maxSetting] ?? 2)) {
                        state.performanceMode = nextMode;
                        enqueueToast({
                            id: `gov_up_${Date.now()}`,
                            kind: 'GOVERNOR' as any,
                            title: `QUALITY: ${nextMode}`,
                            subtitle: 'Restored visual quality',
                            color: '#22d3ee'
                        });
                    }
                }
            } else {
                governorHighMsFramesRef.current = Math.max(0, governorHighMsFramesRef.current - 1);
                governorLowMsFramesRef.current = Math.max(0, governorLowMsFramesRef.current - 1);
            }
        }

        // Update ?debug=1 overlay at 10 Hz
        if (isDebugOverlayEnabled && state.frame % 6 === 0) {
            const perfMem = (performance as any).memory;
            setDebugStats({
                fps: Math.round(1000 / Math.max(1, avgFrameMsRef.current)),
                stepMs: Number(avgStepMsRef.current.toFixed(2)),
                renderMs: Number(avgRenderMsRef.current.toFixed(2)),
                enemies: state.enemies.length,
                projectiles: state.projectiles.length,
                particles: state.particles.length,
                drops: state.drops.length,
                heapMb: perfMem ? Math.round(perfMem.usedJSHeapSize / 1048576) : null,
                mode: state.performanceMode || 'HIGH',
            });
        }

        anim = requestAnimationFrame(loop);
    };

    lastTimeRef.current = performance.now();
    anim = requestAnimationFrame(loop);

    return () => { 
        cancelAnimationFrame(anim); 
        input.cleanup(); 
    };
  }, [maxShield]); 

  const regionBgConfig = getRegionBackground(currentMapNode?.regionId);
  const isBossFightActive = !!(gameStateRef.current?.activeBoss) || (!isVoidRush ? (wave > 0 && wave % 10 === 0 && wave < 100) : (wave === 9 || wave === 18));
  const bgDimPct = Math.min(0.85, Math.max(0, (settings?.backgroundDim ?? 0.2) + (isBossFightActive ? 0.15 : 0)));

  return (
    <div className={`absolute inset-0 bg-slate-950 ${!paused && !gameOver && !gameWon && !activeCinematic ? 'cursor-none' : ''}`}>
      {/* UNIQUE PLACE/NODE BACKGROUND IMAGE LAYER (pre-baked tint/vignette, no blend or filter, opacity-only fade on region change) */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none" style={{ contain: 'layout paint' }}>
        <img
          key={currentMapNode?.regionId || 'default'}
          src={activeBgUrl || regionBgConfig.imageUrl}
          alt={currentMapNode ? currentMapNode.regionId : 'Background'}
          referrerPolicy="no-referrer"
          decoding="async"
          className="w-full h-full object-cover transition-opacity duration-700"
          style={{ opacity: Math.max(0.15, 1 - bgDimPct) }}
        />
      </div>

      {/* GUARDED FULLSCREEN BUTTON & ORIENTATION HINT */}
      {!paused && !gameOver && !gameWon && !activeCinematic && (
        <div className="fixed top-20 right-8 z-40 flex items-center gap-2 pointer-events-auto">
          {showOrientationHint && (
            <div className="px-2.5 py-1 rounded-full bg-slate-950/85 border border-cyan-500/40 text-cyan-300 font-mono text-[9px] flex items-center gap-1.5 shadow-md">
              <Smartphone size={11} className="rotate-90 text-cyan-400" />
              <span>{t('Landscape recommended', lang)}</span>
            </div>
          )}
          {typeof document !== 'undefined' && document.fullscreenEnabled && (
            <button
              type="button"
              onClick={handleToggleFullscreen}
              className="p-2 rounded-full bg-slate-950/75 hover:bg-slate-900 border border-white/15 text-slate-300 hover:text-white transition-all shadow-md cursor-pointer"
              title={isFullscreen ? t('Exit Fullscreen', lang) : t('Fullscreen', lang)}
            >
              {isFullscreen ? <Minimize size={15} /> : <Maximize size={15} />}
            </button>
          )}
        </div>
      )}

      {/* REGION ASSET LOADING BAR WITH ROTATING TIPS */}
      {bgLoading && (
        <div className="fixed top-3 left-1/2 -translate-x-1/2 z-[180] w-72 max-w-[88vw] bg-slate-950/95 border border-cyan-500/40 rounded-xl px-3.5 py-2 shadow-xl pointer-events-none">
          <div className="flex justify-between items-center text-[9px] font-mono text-cyan-300 mb-1">
            <span>{t('LOADING SECTOR...', lang)}</span>
            <span>{Math.round(bgLoadProgress)}%</span>
          </div>
          <div className="w-full h-1.5 bg-slate-900 rounded-full overflow-hidden border border-slate-800 mb-1.5">
            <div
              className="h-full bg-gradient-to-r from-cyan-400 to-purple-400 transition-all duration-150"
              style={{ width: `${bgLoadProgress}%` }}
            />
          </div>
          <p className="text-[9px] font-mono text-slate-400 leading-tight truncate">
            {t(LOADING_TIPS[bgTipIdx % LOADING_TIPS.length], lang)}
          </p>
        </div>
      )}

      {/* AUTO-PAUSE LIFECYCLE RESUME OVERLAY ("TAP TO RESUME" WITH 3-2-1) */}
      {(isLifecyclePaused || resumeCountdown !== null) && !paused && !gameOver && !gameWon && !activeCinematic && (
        <div
          onClick={handleTapToResume}
          className="fixed inset-0 z-[190] bg-slate-950/85 backdrop-blur-md flex flex-col items-center justify-center p-6 cursor-pointer select-none touch-none"
        >
          {resumeCountdown !== null && resumeCountdown > 0 ? (
            <div className="flex flex-col items-center gap-3">
              <div className="text-7xl font-tech font-black text-cyan-300 drop-shadow-[0_0_25px_rgba(34,211,238,0.8)] animate-ping">
                {resumeCountdown}
              </div>
              <span className="font-mono text-xs tracking-[0.3em] text-slate-300 uppercase">
                {t('RESUMING...', lang)}
              </span>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-4 max-w-sm text-center">
              <div className="w-16 h-16 rounded-full bg-cyan-500/20 border-2 border-cyan-400 flex items-center justify-center shadow-[0_0_25px_rgba(34,211,238,0.4)] animate-pulse">
                <Play size={28} className="text-cyan-300 fill-cyan-300 ml-1" />
              </div>
              <h2 className="text-2xl sm:text-3xl font-tech font-bold text-white tracking-[0.2em] uppercase">
                {t('TAP TO RESUME', lang)}
              </h2>
              <p className="text-xs font-mono text-slate-400">
                {t('Run auto-paused while window was in the background.', lang)}
              </p>
            </div>
          )}
        </div>
      )}

      <canvas ref={canvasRef} className="block relative z-10" />

      {/* ?debug=1 TELEMETRY OVERLAY */}
      {isDebugOverlayEnabled && debugStats && (
        <div
          className="fixed bottom-2 left-2 z-[220] pointer-events-none px-2.5 py-1.5 rounded-lg bg-slate-950/90 border border-cyan-500/40 font-mono text-[10px] text-cyan-300 leading-tight shadow-md"
          style={{ contain: 'layout paint' }}
        >
          <div>FPS: {debugStats.fps} | Mode: {debugStats.mode}</div>
          <div>Step: {debugStats.stepMs}ms | Render: {debugStats.renderMs}ms</div>
          <div>Enemies: {debugStats.enemies} | Proj: {debugStats.projectiles} | Part: {debugStats.particles} | Drops: {debugStats.drops}</div>
          {debugStats.heapMb !== null && <div>JS Heap: {debugStats.heapMb} MB</div>}
        </div>
      )}
      
      {discoveryEvent && (
        <div className="absolute inset-0 z-[150] pointer-events-none flex flex-col items-center justify-center p-6 overflow-hidden" style={{ contain: 'layout paint' }}>
            {/* Static radial-gradient sprite (replaces 700x500 blur-3xl animate-pulse) */}
            <div
              className="absolute w-[700px] h-[500px] pointer-events-none"
              style={{
                background: 'radial-gradient(ellipse at center, rgba(34,211,238,0.14) 0%, rgba(168,85,247,0.10) 40%, rgba(245,158,11,0.05) 65%, transparent 75%)'
              }}
            />
            
            <motion.div
                initial={{ opacity: 0, scale: 0.85, y: 30 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 1.1, y: -20 }}
                transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                className="relative z-10 max-w-4xl text-center flex flex-col items-center gap-5 px-4"
            >
                {/* Floating Header Badge */}
                <div className="flex items-center gap-2.5 drop-shadow-[0_2px_10px_rgba(0,0,0,0.95)]">
                    <Sparkles className="w-6 h-6 text-cyan-300 animate-spin" style={{ animationDuration: '6s' }} />
                    <span className="font-tech text-sm sm:text-base font-black text-cyan-300 tracking-[0.35em] uppercase drop-shadow-[0_0_12px_rgba(34,211,238,0.9)]">
                        {t('EVENT DETECTED', lang)} // {discoveryEvent.type}
                    </span>
                </div>

                {/* GREAT BIG FLOATING TITLE */}
                <h1 className={`font-tech font-extrabold tracking-[0.22em] uppercase text-transparent bg-clip-text bg-gradient-to-r from-cyan-200 via-white to-purple-300 drop-shadow-[0_4px_25px_rgba(0,0,0,1)] drop-shadow-[0_0_40px_rgba(34,211,238,0.95)] leading-tight ${
                    settings?.uiTextSize === 'HUGE'
                        ? 'text-5xl sm:text-7xl md:text-8xl'
                        : settings?.uiTextSize === 'LARGE'
                            ? 'text-4xl sm:text-6xl md:text-7xl'
                            : 'text-3xl sm:text-5xl md:text-6xl'
                }`}>
                    {discoveryEvent.title ? t(discoveryEvent.title, lang) : (discoveryEvent.type === 'SECRET' ? t('ANOMALY REVEALED', lang) : t('CELESTIAL EVENT DETECTED', lang))}
                </h1>

                {/* FLOATING SUBTITLE DESCRIPTION */}
                <p className={`font-mono text-cyan-100 font-medium leading-relaxed max-w-2xl text-center drop-shadow-[0_3px_12px_rgba(0,0,0,1)] drop-shadow-[0_1px_4px_rgba(0,0,0,1)] ${
                    settings?.uiTextSize === 'HUGE'
                        ? 'text-xl sm:text-2xl md:text-3xl'
                        : settings?.uiTextSize === 'LARGE'
                            ? 'text-lg sm:text-xl md:text-2xl'
                            : 'text-base sm:text-lg md:text-xl'
                }`}>
                    {t(discoveryEvent.loreText, lang)}
                </p>

                {/* Decorative Floating Accent Line */}
                <div className="w-56 h-1 bg-gradient-to-r from-transparent via-cyan-400 to-transparent rounded-full shadow-[0_0_20px_rgba(34,211,238,1)] mt-2" />
            </motion.div>
        </div>
      )}
      {activeCinematic && (
          <CinematicOverlay 
              script={activeCinematic} 
              onComplete={handleCinematicComplete} 
              onVisualAction={handleCinematicVisual}
              lang={settings?.language || 'en'}
              dialogueTextSize={settings?.dialogueTextSize}
          />
      )}

      {inputInstance && settings.showTouchControls && !activeCinematic && !paused && !gameOver && !gameWon && (
          <MobileControls 
              input={inputInstance} 
              onOpenMenu={onTogglePause} 
              canPurchaseNode={canPurchaseNode} 
              hasLightPurge={true}
              lightEnergy={lightEnergy}
              settings={settings}
          />
      )}

      {!activeCinematic && !gameOver && !gameWon && (
          <GameOverlay settings={settings} 
            playerStats={effectiveStats}
            currentHealth={currentHealth}
            currentShield={currentShield}
            timeRemaining={timeRemaining}
            wave={wave}
            currentPhrase={currentPhrase}
            darknessPhrase={darknessPhrase}
            maturity={maturity}
            lightEnergy={lightEnergy}
            comboCount={comboCount}
            nodeType={currentMapNode?.type}
            nodeId={currentMapNode?.id}
            mission={missionRef.current ? {
                type: missionRef.current.type,
                target: missionRef.current.target,
                current: missionProgress
            } : null}
            specialMissionKeys={localSpecialKeys}
            sideMission={localSideMission}
            lastSparkAvailable={gameStateRef.current?.player?.lastSparkAvailable !== false}
            intermissionTimer={gameStateRef.current?.intermissionTimer || 0}
            intermissionMaxTimer={gameStateRef.current?.intermissionMaxTimer || 150}
            waveBannerText={gameStateRef.current?.waveBannerText || ''}
            waveBannerTimer={gameStateRef.current?.waveBannerTimer || 0}
            isPerfectWave={gameStateRef.current?.isPerfectWave || false}
            onSkipIntermission={handleSkipIntermission}
            showBeamHint={!seenBeamHint}
            nextGoalNode={nextGoalNode}
            activeToast={activeToast}
            waveEssenceEarned={waveEssenceEarned}
            isVoidRush={isVoidRush}
          />
      )}

      {/* BOON DRAFT OVERLAY */}
      {offeredBoons && !bossVictoryData && !activeCinematic && !gameOver && !gameWon && (
          <BoonDraft
              offeredBoons={offeredBoons}
              onPick={(boon) => {
                  pickBoon(boon, (healAmt, shieldPips) => {
                      if (healAmt > 0) {
                          const nextHp = Math.min(effectiveStats.maxHealth + healAmt, gameRefs.current.currentHealth + healAmt);
                          gameRefs.current.currentHealth = nextHp;
                          setCurrentHealth(nextHp);
                      }
                      if (shieldPips > 0) {
                          const nextShield = gameRefs.current.currentShield + shieldPips;
                          gameRefs.current.currentShield = nextShield;
                          setCurrentShield(nextShield);
                      }
                  });
              }}
              onReroll={() => rerollBoons(currentMatter)}
              onBanish={banishBoon}
              freeRerollsRemaining={freeRerollsRemaining}
              banishesRemaining={banishesRemaining}
              currentEssence={currentMatter}
              fastWaves={settings?.fastWaves}
              lang={lang}
              uiTextSize={settings?.uiTextSize}
          />
      )}

      {/* BOSS VICTORY CEREMONY REWARD MODAL */}
      {bossVictoryData && (
      <BossRewardModal
          bossId={bossVictoryData.bossId}
          bossName={bossVictoryData.bossName}
          matterEarned={bossVictoryData.matterEarned}
          fightTimeSec={bossVictoryData.fightTimeSeconds}
          damageTaken={bossVictoryData.damageTaken}
          attempts={bossVictoryData.attempts}
          lang={lang}
          onContinue={() => {
              setBossVictoryData(null);
              const pending = pendingBossOutroRef.current;
              pendingBossOutroRef.current = null;
              if (pending?.script && pending.script.length > 0) {
                  onTransition(() => {
                      gameRefs.current.activeCinematic = pending.script!;
                      setActiveCinematic(pending.script!);
                  });
              } else if (pending?.isWin) {
                  setGameWon(true);
                  gameRefs.current.gameWon = true;
              } else {
                  setTimeRemaining(1);
              }
          }}
      />
      )}

      {/* FIRST POWER CHOICE MODAL */}
      {showFirstPowerChoice && (
          <FirstPowerChoiceModal 
              lang={lang}
              onSelectPower={(nodeId) => {
                  if (onChooseFirstPower) onChooseFirstPower(nodeId);
                  setShowFirstPowerChoice(false);
              }}
          />
      )}

      {/* INTERACTIVE TUTORIAL HUD OVERLAY */}
      {tutorialStep !== null && !activeCinematic && !paused && !gameOver && !gameWon && (
          <div className="absolute top-24 left-1/2 -translate-x-1/2 z-40 w-full max-w-md px-4 pointer-events-none">
              <motion.div
                  {...({
                      initial: { opacity: 0, y: -20, scale: 0.95 },
                      animate: { opacity: 1, y: 0, scale: 1 },
                      exit: { opacity: 0, y: -20, scale: 0.95 },
                      transition: { duration: 0.4, ease: "easeOut" }
                  } as any)}
                  className="bg-slate-950/90 border border-cyan-500/30 rounded-xl p-4 flex flex-col items-center gap-3 shadow-[0_0_25px_rgba(34,211,238,0.15)] text-center backdrop-blur-md"
              >
                  {/* Step Indicators */}
                  <div className="flex gap-2 items-center justify-center">
                      {[1, 2, 3].map((step) => (
                          <div 
                              key={step} 
                              className={`h-1.5 rounded-full transition-all duration-300 ${
                                  step === tutorialStep 
                                      ? 'w-10 bg-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.8)]' 
                                      : step < tutorialStep 
                                          ? 'w-3.5 bg-emerald-500' 
                                          : 'w-3.5 bg-slate-800'
                              }`}
                          />
                      ))}
                  </div>

                  <div className="space-y-1">
                      <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-cyan-400 font-bold">
                          {tutorialStep === 1 && t("CORE DIRECTIVE: MOTILITY", lang)}
                          {tutorialStep === 2 && t("CORE DIRECTIVE: ACCELERATION", lang)}
                          {tutorialStep === 3 && t("COSMIC CALIBRATION COMPLETED", lang)}
                      </span>
                      <p className="text-sm text-white font-medium">
                          {tutorialStep === 1 && t("Move your spark to establish spatial controls.", lang)}
                          {tutorialStep === 2 && t("Perform a Dash maneuver to evade immediate threats.", lang)}
                          {tutorialStep === 3 && t("Core systems have been perfectly calibrated!", lang)}
                      </p>
                  </div>

                  {/* VISUAL CONTROLS PROMPT */}
                  <div className="flex justify-center items-center gap-2 mt-1">
                      {tutorialStep === 1 && (
                          <div className="flex flex-col items-center gap-2">
                              <div className="flex gap-1">
                                  {['W', 'A', 'S', 'D'].map((k) => (
                                      <kbd key={k} className="px-3 py-1.5 text-xs font-mono font-bold bg-slate-900 border border-slate-700 text-cyan-400 rounded shadow-md animate-pulse">{k}</kbd>
                                  ))}
                              </div>
                              <span className="text-[10px] text-slate-500 font-mono tracking-wider uppercase">{t("or use Mouse/Arrow Keys", lang)}</span>
                          </div>
                      )}
                      {tutorialStep === 2 && (
                          <div className="flex items-center gap-2">
                              <kbd className="px-4 py-1.5 text-xs font-mono font-bold bg-slate-900 border border-slate-700 text-cyan-400 rounded shadow-md animate-pulse">{t("Spacebar", lang)}</kbd>
                              <span className="text-xs text-slate-500 font-mono font-bold">{t("or", lang)}</span>
                              <kbd className="px-3 py-1.5 text-xs font-mono font-bold bg-slate-900 border border-slate-700 text-cyan-400 rounded shadow-md animate-pulse">{t("Left Click", lang)}</kbd>
                          </div>
                      )}
                      {tutorialStep === 3 && (
                          <div className="flex flex-col items-center gap-1.5">
                              <span className="text-xs text-slate-300">{t("Defeat anomalies to mature, and press", lang)} <kbd className="px-2 py-0.5 text-xs bg-slate-900 border border-slate-700 text-white rounded font-mono font-bold">ESC</kbd> {t("to spend Matter!", lang)}</span>
                              <span className="text-[9px] text-emerald-400 font-mono tracking-widest uppercase mt-2 animate-bounce">{t("Initiating Combat phase...", lang)}</span>
                          </div>
                      )}
                  </div>
              </motion.div>
          </div>
      )}

      {mapCompleted !== null && (
          <div className="absolute inset-0 bg-black/90 backdrop-blur-md flex flex-col items-center justify-center z-50">
              <motion.div 
                  {...({
                      initial: { opacity: 0, scale: 0.9, y: 20 },
                      animate: { opacity: 1, scale: 1, y: 0 },
                      transition: { duration: 0.6, ease: "easeOut" }
                  } as any)}
                  className="bg-slate-950/80 border border-slate-800 p-8 rounded-2xl max-w-md w-full text-center shadow-2xl space-y-6"
              >
                  <div className="space-y-2">
                      <span className="text-cyan-400 font-mono tracking-widest text-xs uppercase">
                          {currentMapNode && (currentMapNode.type === 'EVENT' || currentMapNode.type === 'SECRET')
                              ? t('ANOMALY SECURED', lang)
                              : `${t(REGION_POOL.find(r => r.id === currentMapNode?.regionId)?.name || "CELESTIAL REGION", lang)} — ${t("CLEARED", lang)}`}
                      </span>
                      <h2 className="text-3xl font-bold font-sans tracking-tight text-white">{t("The Light Endures", lang)}</h2>
                      <p className="text-xs text-slate-400">{t("You have survived the trial. Your core is saturated with the essence of Darkness, yet you remain pure.", lang)}</p>
                  </div>

                  <div className="border-y border-slate-800 py-4 flex justify-between items-center text-xs font-mono">
                      <span className="text-slate-500">{t("MATTER HARVESTED", lang)}</span>
                      <span className="text-emerald-400 font-bold">+{Math.round(sessionMatter)}</span>
                  </div>

                  <p className="text-[11px] text-slate-500 italic">{t("\"Use this quiet moment to strengthen your core before the next wave of darkness cascades.\"", lang)}</p>

                  <div className="flex flex-col gap-3 pt-2">
                      <button 
                          onClick={() => {
                              onTogglePause(); // Opens Evolution Matrix
                          }}
                          className="id-evolve-core-btn w-full bg-slate-900 hover:bg-slate-800 text-cyan-400 font-mono text-xs py-3 px-4 rounded-lg border border-cyan-500/30 hover:border-cyan-400/50 transition-all active:scale-[0.98]"
                      >
                          {t("EVOLVE CORE (SPEND MATTER)", lang)}
                      </button>
                      <button 
                          onClick={() => {
                              onTransition(() => {
                                  setMapCompleted(null);
                                  hudBridgeRef.current.sessionMatter = 0;
                                  setSessionMatter(0);
                                  onOpenStarChart();
                              });
                          }}
                          className="id-next-map-btn w-full bg-white hover:bg-slate-100 text-black font-sans font-bold text-xs py-3 px-4 rounded-lg transition-all active:scale-[0.98] shadow-lg shadow-white/10"
                      >
                          {t("RETURN TO UNIVERSE MAP", lang)}
                      </button>
                  </div>
              </motion.div>
          </div>
      )}

      {/* 1.5S TITLE CARD FOR BOSS RETRIES */}
      {retryTitleCard && (
          <div className="absolute top-12 left-1/2 -translate-x-1/2 z-40 flex flex-col items-center pointer-events-none">
              <motion.div
                  {...({
                      initial: { opacity: 0, y: -20, scale: 0.9 },
                      animate: { opacity: 1, y: 0, scale: 1 },
                      exit: { opacity: 0, y: -20, scale: 0.9 },
                      transition: { duration: 0.3 }
                  } as any)}
                  className="bg-slate-950/90 border border-rose-500/60 px-6 py-2.5 rounded-2xl shadow-[0_0_30px_rgba(225,29,72,0.4)] text-center backdrop-blur-md"
              >
                  <div className="font-tech text-base sm:text-lg font-bold text-amber-300 tracking-wider uppercase">
                      {retryTitleCard.bossName}
                      {retryTitleCard.woundedStacks > 0 && (
                          <span className="text-rose-400 text-xs ml-2 font-mono font-bold">
                              • WOUNDED (-{retryTitleCard.woundedStacks * 12}%)
                          </span>
                      )}
                  </div>
                  <div className="text-[10px] font-mono text-rose-300/80 tracking-[0.2em] uppercase font-semibold">
                      {t("RETRY ATTEMPT", lang)}
                  </div>
              </motion.div>
          </div>
      )}

      {gameOver && (
        <GameOver settings={settings} 
            wave={wave}
            maxWaveReached={maxWaveReached} 
            maturityTitle={maturity.title} 
            onRestart={onRestart} 
            onRetryBoss={handleRetryBoss}
            onReturnToMenu={onReturnToMenu}
            onOpenEvolutionMatrix={(nodeId) => {
                if (onOpenEvolutionMatrix) {
                    onOpenEvolutionMatrix(nodeId);
                } else {
                    onTogglePause();
                }
            }}
            currentMatter={currentMatter}
            unlockedAbilityIds={unlockedAbilityIds}
            currentMapId={currentMapId}
            currentRunPath={currentRunPath}
            deathCause={deathCauseRef.current || lastDamageRef.current?.source}
            runStats={getRunStats()}
            bestBossProgress={bestBossProgressRef.current}
            bossFailedAttempts={getRunStats()?.bossId ? (bossFailedAttemptsSessionRef.current[getRunStats()!.bossId!] || 0) : 0}
            recentDamageSources={
                (gameStateRef.current?.recentDamageSources && gameStateRef.current.recentDamageSources.length > 0)
                    ? gameStateRef.current.recentDamageSources
                    : damageRingBufferRef.current.map(h => h.source.label)
            }
            averageFps={Math.round(1000 / Math.max(1, avgFrameMsRef.current))}
        />
      )}

      {gameWon && (
          <WinGame settings={settings} 
            onRestart={() => onRestart(1)} 
            onReturnToMenu={onReturnToMenu}
          />
      )}
    </div>
  );
};

export default SurvivalGame;
