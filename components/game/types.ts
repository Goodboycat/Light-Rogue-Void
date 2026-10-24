
import { PlayerStats, SideMission } from '../../types';

export interface CinematicLine {
    speaker: 'DARKNESS' | 'LIGHT';
    text: string;
    duration: number;
    visualAction?: string;
}

// Boss cinematics are currently represented as arrays of lines.
export type CinematicSequence = CinematicLine;

export interface DamageSource {
    kind: 'enemy' | 'projectile' | 'hazard' | 'event';
    id: string;
    label: string;
}

export interface DamageHit {
    source: DamageSource;
    wave: number;
    frame: number;
    hpBefore: number;
    hpAfter: number;
}

export interface RunStats {
    wave: number;
    runFrames: number;
    kills: number;
    bestCombo: number;
    essenceEarned: number;
    deathCause?: DamageSource;
    bossId?: string;
    bossHpPct?: number;
    damageByPower?: Record<string, number>;
    isVoidRush?: boolean;
    voidRushScore?: number;
    voidRushMatterReward?: number;
}

export enum ParticleType {
    NORMAL = 'NORMAL',
    FIRE = 'FIRE',
    ICE = 'ICE',
    THUNDER = 'THUNDER',
    LASER = 'LASER',
    VOID = 'VOID',
    BOSS_AURA = 'BOSS_AURA',
    HEAL = 'HEAL',
    GLOW = 'GLOW',
    SMOKE = 'SMOKE',
    SPARK = 'SPARK',
    RING = 'RING',
    TEXT = 'TEXT',
    LIGHTNING_BOLT = 'LIGHTNING_BOLT' 
}

export type EnemyBehavior = 
    'CHASE' | 'SWARM' | 'TANK' | 'DASH' | 'ORBIT' | 'EXPLODE' | 
    'SNIPER' | 'WEAVER' | 'SPLIT' | 'SINE' | 'SHY' | 
    'TELEPORT' | 'HEALER' | 'SPAWNER' | 'TRAIL' | 'BUFF_SPEED' | 'SHOOT_SPIRAL' | 'SHOOT_RING' |
    'BOSS_WARDEN' | 'BOSS_GRAVITY' | 'BOSS_SERPENT' | 'DECOY_ATTRACT' |
    'GRAVITY_PULL' | 'MIMIC' | 'FREEZE_AURA' | 'CLEANSER' |
    'TELEPORT_STRIKE' | 'LEAVE_MINES' | 'LASER_SPIN' | 'PHASE_DASH' | 'BLACK_HOLE_CAST' | 'SEMI_BOSS';

export type VisualType = 'SIMPLE' | 'CRAB' | 'SERPENT' | 'GHOST' | 'STAR' | 'CONSTRUCT' | 'EYE' | 'CRYSTAL' | 'SWARMER' | 'HIVE' | 'WARDEN' | 'ECLIPSE' | 'NEUTRON' | 'TITAN' | 'DARKNESS' | 'SEMI_BOSS';

export interface EnemyDef {
    id: string;
    name: string;
    description: string;
    baseHp: number;
    hpScaling: number;
    baseSpeed: number;
    size: number;
    color: string;
    glowColor: string;
    behavior: EnemyBehavior;
    visualType: VisualType;
    spawnWeight: number;
    minWave: number;
    essenceReward: number;
    particleEffect: ParticleType;
}

export interface Entity {
    x: number;
    y: number;
    vx: number;
    vy: number;
    size: number;
    color: string;
}

export interface Player extends Entity {
    dashTimer: number;
    dashCooldownTimer: number;
    stationaryTimer: number; // New: For White Hole Ultimate
    
    // Ability Cooldown Timers
    fireBlastTimer: number;
    iceNovaTimer: number;
    thunderChainTimer: number;
    homingMissileTimer: number; 
    fireflyTimer: number; 
    nebulaTrailTimer: number;
    singularityTimer: number;
    // superDash is passive, no timer needed usually, uses dash cooldown
    solarFlareTimer: number;
    titanShieldTimer: number;
    titanShieldDuration: number;
    
    luxBladeTimer?: number; // New for Boomerang behavior
    repulsionFieldTimer?: number; // Replaces Time Warp

    // Active Effects
    isTitanShieldActive: boolean;
    invulnTimer?: number;
    lastSparkAvailable?: boolean;
    sparkPulseTimer?: number;

    // Overhaul mechanics
    lightEnergy?: number;
    comboCount?: number;
    comboTimer?: number;
    essenceHealProgress?: number;
    totalKills?: number;
    bestCombo?: number;
}

export interface Enemy extends Entity {
    hp: number;
    maxHp: number;
    def: EnemyDef;
    speed: number;
    spawnSpeed?: number; // Base speed after wave scaling, used for cleanses
    state: { timer: number; phase?: number; custom?: any };
    projectileImmunity: number; 
    isBoss?: boolean;
    isWounded?: boolean;
    woundedStacks?: number;
    frozenTimer?: number; 
    blackHoleTimer?: number; // Boss ability cooldown
    voidMineCooldown?: number; // New: Cooldown for spawning void mines
    opacity?: number; // Visual override
    isSlowImmune?: boolean; // Immunity to Ice Nova/Slows
    paralyzedTimer?: number;
    isMachine?: boolean;
    isSemiBoss?: boolean;
    contactHitCooldown?: number;
    hitFlashTimer?: number;
    _hp?: number;
    isGoldenMite?: boolean;
    isTreasurePylon?: boolean;
    isShiner?: boolean;
    aegisInitialized?: boolean;
    aegisShielded?: boolean;
    aegisBrokenTimer?: number;
}

export interface Projectile extends Entity {
    damage: number;
    isEnemy: boolean; 
    life: number;
    maxLife?: number;
    isPiercing?: boolean;
    visualType?: 'DEFAULT' | 'FIRE_BLAST' | 'ARCANE_MISSILE' | 'PULSAR' | 'SINGULARITY' | 'STARDUST_TRAIL' | 'VOID_RIFT' | 'SOLAR_FLARE' | 'BOSS_SINGULARITY' | 'HOMING_MISSILE' | 'FIREFLY' | 'EXPLOSION_AREA' | 'TOXIC_CLOUD' | 'RAILGUN_BEAM' | 'VOID_MINE' | 'VOID_TRAIL' | 'VOID_NOVA' | 'VOID_NOVA_AFTERMATH' | 'LUX_BLADE' | 'PLASMA_WHIP' | 'PLASMA_WHIP_HIT' | 'DEATH_RAY' | 'SOLAR_BARRIER' | 'CRIMSON_COMET' | 'LIGHT_ENERGY' | 'NEBULA_TRAIL';
    // Extras for special projectiles
    pullRadius?: number; 
    isStatic?: boolean; // For rifts
    targetId?: string; // For homing
    customData?: any; 
}

export interface Particle extends Entity {
    life: number;
    maxLife: number;
    type: ParticleType;
    friction?: number; 
    gravity?: number; 
    shrink?: number; 
    alpha?: number; 
    customData?: any;
}

export interface Drop {
    x: number;
    y: number;
    value: number;
    isKey?: boolean;
    isSecretKey?: boolean;
    isHeart?: boolean;
}

export interface ChaosEventState {
    type: 'BERSERKER' | 'POISON' | 'ANOMALIES' | 'DARTS';
    active: boolean;
    wavesSurvived: number;
    failed: boolean;
    completed: boolean;
}

export interface Hazard {
    x: number;
    y: number;
    type: 'LASER' | 'GAS' | 'LAVA';
    radius: number;
    timer: number;
    maxTimer: number;
}

export interface MutableGameState {
    player: Player;
    enemies: Enemy[];
    projectiles: Projectile[]; 
    particles: Particle[];
    drops: Drop[];
    camera: { x: number; y: number; shake?: number; zoom?: number; zoomTimer?: number; maxZoomTimer?: number };
    mouse: { x: number; y: number }; 
    frame: number;
    worldSize: number;
    activeBoss?: Enemy;
    activeWaveEvent?: any;
    seenBossIntros?: string[];
    wave?: number;
    waveTimer?: number;
    curseDamagedInWave?: boolean;
    bossFailedAttemptsSession?: Record<string, number>;
  mission?: { 
      type: string, 
      target: number, 
      current: number, 
      timeLimit?: number, 
      timeElapsed: number, 
      failed: boolean,
      captureZone?: {
          x: number;
          y: number;
          radius: number;
          captureTimeTotal: number;
          captureTimeCurrent: number;
      }
  }; 
    seenEnemyIds: string[];
    maxWaveReached: number;
    bossSpawnedWave?: number;
  keysDropped?: number;
    damageOverlayTimer?: number;
    secretKeyCollected?: boolean;
    isSpecialMission?: boolean;
    regionId?: string;
    performanceMode?: 'LOW' | 'MEDIUM' | 'HIGH';
    sideMission?: SideMission;
    chaosEvent?: ChaosEventState;
    hazards: Hazard[];
    specialMissionKeys?: number;
    darknessRegenNullified?: boolean;
    map6KeysCollected?: number;
    slowMoTimer?: number;
    hitPauseTimer?: number;
    vortexTimer?: number;
    vortexBatchCount?: number;
    intermissionTimer?: number;
    intermissionMaxTimer?: number;
    isPerfectWave?: boolean;
    waveBannerText?: string;
    waveBannerTimer?: number;
    edgeFlash?: { color: string; timer: number };
    heartsCollected?: number;
    runMods?: any;
    damageByPower?: Record<string, number>;
    equippedSkin?: string;
    equippedTrail?: string;
    activeDailyMod?: any;
    isVoidRush?: boolean;
    dashesUsedInWave?: number;
    waveEssenceEarned?: number;
    maturityTweenTimer?: number;
    maturityPrevScale?: number;
    lastHitStopMs?: number;
    settings?: any;
    fireflyCount?: number;
    governorHighMsTimer?: number;
    governorLowMsTimer?: number;
    recentDamageSources?: string[];
    debugMetrics?: {
        fps: number;
        stepMs: number;
        renderMs: number;
    };
}
