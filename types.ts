
import { BossTrophy } from './components/game/bossVictory';
import { DailySaveState } from './data/dailyVoid';

export interface Position {
  x: number;
  y: number;
}

export enum AbilityType {
  CORE = 'CORE',
  OFFENSE = 'OFFENSE',
  DEFENSE = 'DEFENSE',
  UTILITY = 'UTILITY'
}

export interface PlayerStats {
  maxHealth: number;
  maxHealthRaw?: number;
  healthRegen: number;
  moveSpeed: number;
  dashCooldown: number;
  dashDuration: number;
  pickupRange: number;
  damageAura: number;
  repulsionForce: number;
  projectileCount: number;
  projectileCountRaw?: number;
  attackSpeed: number;
  essenceMultiplier: number;
  
  // --- ABILITIES (Levels 0 = Locked) ---
  fireBlastLevel: number;
  iceNovaLevel: number;
  thunderChainLevel: number;
  
  homingMissileLevel: number; 
  fireflyLevel: number;       
  nebulaTrailLevel: number;
  singularityLevel: number;
  superDashLevel: number;     
  
  solarFlareLevel: number;
  titanShieldLevel: number;
  whiteHoleLevel: number;

  // NEW ABILITIES
  luxBladesLevel: number;
  repulsionFieldLevel: number; // Replaced Time Warp
  plasmaWhipLevel: number;
  
  // SPECIAL MISSION UPGRADES
  special_dashDamage: boolean;
  special_fireBlastCount: boolean;
  special_thunderBounce: boolean;
  special_iceNovaSize: boolean;
  special_orbitalSpeed: boolean;
  special_singularityPull: boolean;
  special_lightPurge: boolean;
  special_dashOnKill: boolean;
}

export interface AbilityNodeData {
  id: string;
  title: string;
  description: string;
  cost: number;
  position: Position;
  parentIds: string[];
  type: AbilityType;
  icon: string;
  statBoostDisplay: string;
  statEffect: Partial<PlayerStats>;
  isMajor: boolean;
}

export interface Achievement {
    id: string;
    title: string;
    description: string;
    icon: string;
    condition: (state: GameState, stats: PlayerStats, currentWave: number, sessionStartWave: number) => boolean;
}

export type DifficultyLevel = 'chill' | 'normal' | 'brutal';

export interface MobileControlCustomItem {
    xPct: number; // 0 to 100
    yPct: number; // 0 to 100
}

export interface MobileControlLayout {
    move?: MobileControlCustomItem;
    aim?: MobileControlCustomItem;
    dash?: MobileControlCustomItem;
    beam?: MobileControlCustomItem;
    tree?: MobileControlCustomItem;
}

export interface Settings {
    showTouchControls: boolean;
    mouseMovementEnabled: boolean;
    masterVolume: number;
    musicVolume: number;
    sfxVolume: number;
    performanceMode: 'LOW' | 'MEDIUM' | 'HIGH';
    language?: 'en' | 'es';
    dialogueTextSize?: 'NORMAL' | 'LARGE' | 'HUGE';
    uiTextSize?: 'NORMAL' | 'LARGE' | 'HUGE';
    shareTelemetry?: boolean;
    autoAimStarterPulse?: boolean;
    autoAimTouch?: boolean;
    floatingJoystick?: boolean;
    doubleTapDash?: boolean;
    leftHandedControls?: boolean;
    controlScale?: number; // 70 to 140 (%)
    controlOpacity?: number; // 20 to 100 (%)
    mobileControlLayout?: MobileControlLayout;
    cameraZoom?: number; // 0 = Auto, or 0.65 to 1.15
    fastWaves?: boolean;
    threatArrows?: boolean;
    difficulty?: DifficultyLevel;
    reduceShake?: number; // 0 to 100 (%)
    reduceFlashes?: boolean;
    haptics?: 'OFF' | 'LIGHT' | 'FULL';
    colorblindMode?: boolean;
    highContrastBullets?: boolean;
    showHitboxDot?: boolean;
    backgroundDim?: number; // 0 to 60 (%)
}

export interface GameState {
  matter: number;
  unlockedAbilityIds: string[];
  seenEnemyIds: string[];
  unlockedAchievementIds: string[];
  defeatedBosses: string[]; // Track unique boss kills
  maxWaveReached: number;
  maxMaturityAchieved: number;
  isGameRunning: boolean;
  isMenuOpen: boolean;
  hasSeenIntro: boolean;
  hasSeenEssenceTutorial?: boolean;
  seenBeamHint?: boolean;
  settings: Settings;
  currentRunPath?: any[];
  visitedNodeIds?: string[];
  
  
  currentMapId?: string;
  completedSpecialMissions: string[];
  discoveredSecretIds: string[];
  /* PATCH: STEP-6 progressive-guidebook — extra manually-flagged entries */
  discoveredGuideEntries?: string[];
  /* PATCH: STEP-6 progressive-guidebook — count of treasure/minigame nodes cleared */
  treasureNodesCompleted?: number;
  treasuresAllClearedDialogueTriggered?: boolean;
    seenSemiBossTutorial?: boolean;
  doubleEssenceMultiplierUnlocked?: boolean;
  hasPickedFirstPower?: boolean;
  hasSeenHighlightNextNode?: boolean;
  playedCinematicNodeIds?: string[];
  specialMissionKeys?: number;
  hasObtainedFirstKey?: boolean;
  map1SideMissionCompleted?: boolean;
  map1EventCompleted?: boolean;
  sideMission?: SideMission;
  deathsByWave?: Record<string, number[] | number>;
  bossAttempts?: Record<string, number[] | number>;
  mercyLevel?: number;
  cleanWaveStreak?: number;
  seenBossIntros?: string[];
  bestBossProgress?: Record<string, number>;
  bossFailedAttemptsSession?: Record<string, number>;
  bossTrophies?: Record<string, BossTrophy>;
  hasCompletedFirstBoonDraft?: boolean;
  equippedSkin?: string;
  equippedTrail?: string;
  unlockedCosmetics?: string[];
  newCosmeticIds?: string[];
  newAchievementIds?: string[];
  newArchiveEnemyIds?: string[];
  dailyState?: DailySaveState;
  voidRushBestScore?: number;
  voidRushBestTimeSec?: number;
  totalPlayTimeSec?: number;
  lastSavedWave?: number;
  completedMapIds?: string[];
  unlockedMapIds?: string[];
}

export interface SideMission {
    type: 'COLLECT' | 'CAPTURE' | 'DESTROY';
    variant?: 'SINGLE' | 'MULTI_MOVING' | 'TIMED' | 'ESSENCE' | 'TIMED_ESSENCE' | 'MOVING_ESSENCE' | 'PYLONS' | 'MOVING_CRYSTALS' | 'TIMED_BEACONS';
    title?: string;
    description?: string;
    target: number;
    current: number;
    started: boolean;
    completed: boolean;
    failed?: boolean;
    timeLimit?: number;
    timeRemaining?: number;
    captureZone?: { x: number; y: number; radius: number; captureTimeTotal: number; captureTimeCurrent: number };
    captureZones?: Array<{ id: string; x: number; y: number; vx: number; vy: number; radius: number; progress: number; captured: boolean }>;
    destroyTargets?: Array<{ id: string; name?: string; x: number; y: number; vx?: number; vy?: number; hp: number; maxHp: number; size: number }>;
    collectTargets?: Array<{ id: string; x: number; y: number; vx?: number; vy?: number; collected: boolean; color?: string }>;
}
