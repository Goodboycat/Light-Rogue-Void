
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
  healthRegen: number;
  moveSpeed: number;
  dashCooldown: number;
  dashDuration: number;
  pickupRange: number;
  damageAura: number;
  repulsionForce: number;
  projectileCount: number;
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
  /** (3B step 6) Light Burst level, 0 = locked. */
  lightBurstLevel: number;
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
  /** (1B) Constellation node: hidden until this boss id is in `defeatedBosses`. */
  requiresBoss?: string;
  /** (1B) Constellation display name, for the lock tooltip and faint lines. */
  constellation?: string;
}

export interface Achievement {
    id: string;
    title: string;
    description: string;
    icon: string;
    condition: (state: GameState, stats: PlayerStats, currentWave: number, sessionStartWave: number) => boolean;
}

export interface Settings {
    showTouchControls: boolean;
    mouseMovementEnabled: boolean;
    masterVolume: number;
    musicVolume: number;
    sfxVolume: number;
    performanceMode: 'LOW' | 'MEDIUM' | 'HIGH' | 'AUTO'; // (7B) AUTO = Quality.ts controller steps by measured fps
    screenShake?: boolean;  // (4A) default on
    reduceFlash?: boolean;  // (4A) default off
    spriteMode?: boolean;   // (5B) default off — blit extracted PNGs instead of procedural drawing
    showMinimap?: boolean;  // (3A) default on
    muted?: boolean;        // (6A) default off — audio/AudioManager.ts reads master/music/sfx + muted
    haptics?: 'OFF' | 'LIGHT' | 'FULL'; // (7B) default LIGHT — utils/haptics.ts (navigator.vibrate)
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
  /** (2D) Darkness beaten and the ending (Stay/Leave) was shown. 9A uses it to offer Endless. */
  endingSeen?: boolean;
  /** (3A) landmark ids discovered across all runs (Archives / lore). */
  landmarksSeen?: string[];
  /** (3B) lifetime kills per EnemyDef.id — Bestiary shows lore at LORE_KILLS */
  killCounts?: Record<string, number>;
  /** (7C) ids of world-map treasure caches already opened. */
  mapTreasuresOpened?: string[];
  /** (7D) bossIds of places whose map-reveal cinematic was already shown (in-run breather or menu). */
  mapRevealsSeen?: string[];
  settings: Settings;
}
