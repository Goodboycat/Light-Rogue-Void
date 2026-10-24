
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
}
