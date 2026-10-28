
import { PlayerStats } from '../../types';

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
    TEXT = 'TEXT' 
}

export type EnemyBehavior = 
    'CHASE' | 'SWARM' | 'TANK' | 'DASH' | 'ORBIT' | 'EXPLODE' | 
    'SNIPER' | 'WEAVER' | 'SPLIT' | 'SINE' | 'SHY' | 
    'TELEPORT' | 'HEALER' | 'SPAWNER' | 'TRAIL' | 'BUFF_SPEED' | 'SHOOT_SPIRAL' | 'SHOOT_RING' |
    'BOSS_WARDEN' | 'BOSS_GRAVITY' | 'BOSS_SERPENT' | 'DECOY_ATTRACT' |
    'GRAVITY_PULL' | 'MIMIC' | 'FREEZE_AURA' | 'CLEANSER' |
    'TELEPORT_STRIKE' | 'LEAVE_MINES' | 'LASER_SPIN' | 'PHASE_DASH' | 'BLACK_HOLE_CAST';

export type VisualType = 'SIMPLE' | 'CRAB' | 'SERPENT' | 'GHOST' | 'STAR' | 'CONSTRUCT' | 'EYE' | 'CRYSTAL' | 'SWARMER' | 'HIVE' | 'WARDEN' | 'ECLIPSE' | 'NEUTRON' | 'TITAN' | 'DARKNESS';

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
    /** (2B) boss only: enemy ids a roaming add pack is drawn from; undefined → wave-appropriate pool */
    addTable?: string[];
    /** (2C) boss only: persistent terrain hazard that accumulates during the fight — see logic/enemies/BossHazards.ts */
    hazard?: import('./logic/enemies/BossHazards').HazardDef;
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
    frozenTimer?: number; 
    blackHoleTimer?: number; // Boss ability cooldown
    voidMineCooldown?: number; // New: Cooldown for spawning void mines
    opacity?: number; // Visual override
    isSlowImmune?: boolean; // Immunity to Ice Nova/Slows
    carried?: boolean; // (2A) survived a wave change → bonus essence + faint ring
    flashTimer?: number; // (4A) white hit flash frames left
    // (4B) elite affixes — data/affixes.ts
    affixes?: import('../../data/affixes').AffixId[];
    shieldHits?: number;      // SHIELDED: hits left before the shield breaks
    shieldPopFrames?: number; // SHIELDED: frames of break flash
    shotWarn?: number;        // (4B) frames until this shooter fires (0.4 s glow telegraph)
    // (4B) special waves — components/game/waveFlavors.ts
    aegisShielded?: boolean;  // AEGIS TRIAL: immune until a Shiner dies nearby
    isShiner?: boolean;       // AEGIS TRIAL: kill to break shields in 200 px
    aegisBrokenTimer?: number;
}

export interface Projectile extends Entity {
    damage: number;
    isEnemy: boolean; 
    life: number;
    visualType?: 'DEFAULT' | 'FIRE_BLAST' | 'ARCANE_MISSILE' | 'PULSAR' | 'SINGULARITY' | 'STARDUST_TRAIL' | 'VOID_RIFT' | 'SOLAR_FLARE' | 'BOSS_SINGULARITY' | 'HOMING_MISSILE' | 'FIREFLY' | 'EXPLOSION_AREA' | 'TOXIC_CLOUD' | 'RAILGUN_BEAM' | 'VOID_MINE' | 'VOID_TRAIL' | 'VOID_NOVA' | 'VOID_NOVA_AFTERMATH' | 'LUX_BLADE' | 'PLASMA_WHIP' | 'PLASMA_WHIP_HIT' | 'DEATH_RAY' | 'SOLAR_BARRIER' | 'CRIMSON_COMET';
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
}

export interface Drop {
    x: number;
    y: number;
    value: number;
}

export interface MutableGameState {
    player: Player;
    enemies: Enemy[];
    projectiles: Projectile[]; 
    particles: Particle[];
    drops: Drop[];
    camera: { x: number; y: number };
    mouse: { x: number; y: number }; 
    frame: number;
    worldSize: number;
    activeBoss?: Enemy; 
    seenEnemyIds: string[];
    maxWaveReached: number;
    bossSpawnedWave?: number;
    // (2A) wave flow
    waveKills: number;          // kills since the current wave started
    waveStartedFrame: number;   // state.frame when the current wave started
    totalKills: number;         // kills this run
    bossKilledWave?: number;    // set by killEnemy when a boss dies; SurvivalGame advances the wave
    // (4A) action feel — all optional, see Feel.ts
    hitStopFrames?: number;
    lastHitStopFrame?: number;
    shakeAmp?: number;
    shakeHold?: number;
    shakeX?: number;
    shakeY?: number;
    floaters?: import('./Feel').Floater[];
    streak?: number;
    streakLastFrame?: number;
    bestStreak?: number;
    streakBanner?: import('./Feel').StreakBanner;
    playerIFrames?: number;
    hurtVignette?: number;
    /** 0..1 mirror of player HP ratio, written by SurvivalGame for the low-HP tint */
    hpRatio?: number;
    // (2B) boss kit — see logic/enemies/BossKit.ts
    telegraphs?: import('./logic/enemies/BossKit').Telegraph[];
    telegraphFlashes?: import('./logic/enemies/BossKit').TelegraphFlash[];
    arena?: { x: number; y: number; r: number; pulse: number; color: string };
    bossStartFrame?: number;      // state.frame when the boss became active (enrage timer)
    bossEnraged?: boolean;
    bossAddTimer?: number;        // frames until the next roaming pack
    bossArrival?: { name: string; color: string; frames: number; max: number };
    lastBossHit?: string;         // boss id of the last thing that hurt the player (death hint)
    /** set by Logic.ts every frame: boss scripts call this from telegraph onFire to hurt the player */
    damagePlayer?: (amt: number) => void;
    // (2C) persistent boss hazards — see logic/enemies/BossHazards.ts
    hazards?: import('./logic/enemies/BossHazards').Hazard[];
    playerInRubble?: boolean;      // 90 % slow this frame (PlayerLogic reads it)
    // (2C) Crimson Eclipse — live rotating beams + blackout (renderer/LaserRenderer.ts, Renderer.ts eclipse overlay)
    lasers?: import('./logic/enemies/bosses/CrimsonEclipse').Laser[];
    eclipse?: number;              // 1 → 0 blackout strength; only telegraphs / beams / hazards / player visible
    eclipseColor?: string;
    /** (2D) Logic.ts mirrors the current PlayerStats here so boss scripts (Darkness) can read unlocked powers */
    playerStatsRef?: PlayerStats;
    // (4B) enemy variety — logic/Director.ts + waveFlavors.ts
    currentWave?: number;          // mirrored by Logic.ts each frame (KillLogic needs it for SPLITTING minis)
    packTimer?: number;            // frames until the director's next pack
    packPending?: number;          // packs currently telegraphed but not yet landed
    flavor?: import('./waveFlavors').WaveFlavorId;   // active special wave (set on wave start)
    flavorArmedWave?: number;      // last wave startWaveFlavor ran for (Logic.ts arms it lazily on ?wave= starts)
    flavorBanner?: { banner: string; caption: string; color: string; frames: number; max: number };
    flavorEssenceMult?: number;    // CURSE clean bonus → 1.1 for the wave
    curseMarks?: import('./waveFlavors').CurseMark[];
    curseDamagedInWave?: boolean;
    gauntletTimer?: number;
    aegisCounter?: number;
    // (3A) discovery — logic/WorldLogic.ts, renderer/WorldRenderer.ts, data/world.ts
    runSeed?: number;
    world?: import('./logic/WorldLogic').WorldState;
    runModifiers?: import('../../data/world').RunModifiers;
    /** extra dashes still available this run (Mirror Shard); PlayerLogic consumes */
    dashChargesLeft?: number;
    /** 4 s lore card (landmark) / toast (shrine, relic) drawn by WorldRenderer in screen space */
    worldCard?: { title: string; body: string; light?: string; color: string; frames: number; max: number };
    /** set by WorldLogic when a found event asks for a heal / shield; SurvivalGame consumes */
    healRequest?: number;      // fraction of max HP
    shieldRequest?: number;    // shield points
    /** found-event in progress → Director pauses (Logic.ts gate) */
    worldEventActive?: boolean;
    // (2B+) BigFx — see components/game/BigFx.ts
    bigFx?: import('./BigFx').BigExplosion[];
    screenFlash?: number;          // 0..1 screen-space flash, decays in updateBigFx
    screenFlashColor?: string;
}
