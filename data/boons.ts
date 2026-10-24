import { PlayerStats } from '../types';
import { translate } from '../translate';

export type BoonRarity = 'common' | 'uncommon' | 'rare' | 'epic';
export type BoonTag = 'FIRE' | 'ICE' | 'STORM' | 'DASH' | 'DEFENSE' | 'ECONOMY';

export interface RunMods {
    stats: Partial<PlayerStats>;
    damageMult: number;
    aoeRadiusMult: number;
    healImmediate: number;
    shieldPipImmediate: number;
    highestPowerBonus: number;
    // Event proc flags & counters
    chainReactionCount: number;
    vampiricLightCount: number;
    staticChargeCount: number;
    frostTrailCount: number;
    overdriveCount: number;
    phoenixSparkCount: number;
    gravityWellCount: number;
    echoCastCount: number;
    lightningDashCount: number;
    supernovaCount: number;
    secondSunCount: number;
    supernovaCoreCount: number;
    timeRiftCount: number;
    crownOfSparksCount: number;
    voidHarvesterCount: number;
}

export interface Boon {
    id: string;
    name: string;
    rarity: BoonRarity;
    tags: BoonTag[];
    icon: string;
    desc: (lang?: 'en' | 'es') => string;
    stackable?: boolean;
    curatedCategory?: 'offense' | 'defense' | 'utility';
    apply: (mods: RunMods) => void;
}

export const BOON_CONFIG = {
    BOON_PERSIST: 'NODE' as 'NODE' | 'RUN' | 'WAVE',
    weights: {
        common: 100,
        uncommon: 55,
        rare: 25,
        epic: 8
    },
    maxDuplicates: 2,
    rerollCostEssence: 25,
    freeRerollsPerWave: 1,
    banishesPerRun: 2,
    fastWaveAutoPickFrames: 480 // 8s
};

export const RARITY_STYLES: Record<BoonRarity, { border: string; bg: string; text: string; glow: string; badge: string }> = {
    common: {
        border: 'border-slate-500/50',
        bg: 'from-slate-900/95 via-slate-900/90 to-slate-950/95',
        text: 'text-slate-200',
        glow: 'shadow-[0_0_25px_rgba(148,163,184,0.2)]',
        badge: 'bg-slate-800 text-slate-300 border-slate-600'
    },
    uncommon: {
        border: 'border-emerald-500/60',
        bg: 'from-emerald-950/95 via-slate-900/90 to-slate-950/95',
        text: 'text-emerald-300',
        glow: 'shadow-[0_0_30px_rgba(16,185,129,0.3)]',
        badge: 'bg-emerald-950 text-emerald-300 border-emerald-500/50'
    },
    rare: {
        border: 'border-cyan-400/70',
        bg: 'from-cyan-950/95 via-slate-900/90 to-slate-950/95',
        text: 'text-cyan-300',
        glow: 'shadow-[0_0_35px_rgba(34,211,238,0.4)]',
        badge: 'bg-cyan-950 text-cyan-300 border-cyan-400/60'
    },
    epic: {
        border: 'border-amber-400/80',
        bg: 'from-amber-950/95 via-fuchsia-950/40 to-slate-950/95',
        text: 'text-amber-300',
        glow: 'shadow-[0_0_45px_rgba(251,191,36,0.55)]',
        badge: 'bg-amber-950 text-amber-300 border-amber-400/80'
    }
};

export const BOONS_DATA: Boon[] = [
    // ================= COMMON =================
    {
        id: 'overcharge',
        name: 'Overcharge',
        rarity: 'common',
        tags: ['FIRE', 'STORM'],
        icon: 'Zap',
        curatedCategory: 'offense',
        desc: (lang = 'en') => translate('+1 level to your highest power', lang),
        apply: (mods) => {
            mods.highestPowerBonus += 1;
        }
    },
    {
        id: 'hardened_core',
        name: 'Hardened Core',
        rarity: 'common',
        tags: ['DEFENSE'],
        icon: 'Heart',
        curatedCategory: 'defense',
        stackable: true,
        desc: (lang = 'en') => translate('+1 max HP and heal 1', lang),
        apply: (mods) => {
            mods.stats.maxHealth = (mods.stats.maxHealth || 0) + 1;
            mods.healImmediate += 1;
        }
    },
    {
        id: 'swift_spark',
        name: 'Swift Spark',
        rarity: 'common',
        tags: ['DASH'],
        icon: 'Wind',
        curatedCategory: 'utility',
        stackable: true,
        desc: (lang = 'en') => translate('+8% move speed', lang),
        apply: (mods) => {
            mods.stats.moveSpeed = (mods.stats.moveSpeed || 0) + 0.36;
        }
    },
    {
        id: 'quick_dash',
        name: 'Quick Dash',
        rarity: 'common',
        tags: ['DASH'],
        icon: 'FastForward',
        desc: (lang = 'en') => translate('-12% dash cooldown', lang),
        apply: (mods) => {
            mods.stats.dashCooldown = (mods.stats.dashCooldown || 0) - 9;
        }
    },
    {
        id: 'magnet_bloom',
        name: 'Magnet Bloom',
        rarity: 'common',
        tags: ['ECONOMY'],
        icon: 'Compass',
        stackable: true,
        desc: (lang = 'en') => translate('+40 pickup range', lang),
        apply: (mods) => {
            mods.stats.pickupRange = (mods.stats.pickupRange || 0) + 40;
        }
    },
    {
        id: 'fertile_void',
        name: 'Fertile Void',
        rarity: 'common',
        tags: ['ECONOMY'],
        icon: 'Gem',
        stackable: true,
        desc: (lang = 'en') => translate('+20% essence harvested', lang),
        apply: (mods) => {
            mods.stats.essenceMultiplier = (mods.stats.essenceMultiplier || 0) + 0.2;
        }
    },
    {
        id: 'ember_skin',
        name: 'Ember Skin',
        rarity: 'common',
        tags: ['FIRE', 'DEFENSE'],
        icon: 'Flame',
        stackable: true,
        desc: (lang = 'en') => translate('+1.5 damage aura', lang),
        apply: (mods) => {
            mods.stats.damageAura = (mods.stats.damageAura || 0) + 1.5;
        }
    },
    {
        id: 'twin_orbit',
        name: 'Twin Orbit',
        rarity: 'common',
        tags: ['STORM'],
        icon: 'Orbit',
        desc: (lang = 'en') => translate('+1 orbital projectile', lang),
        apply: (mods) => {
            mods.stats.projectileCount = (mods.stats.projectileCount || 0) + 1;
        }
    },
    {
        id: 'second_wind',
        name: 'Second Wind',
        rarity: 'common',
        tags: ['DEFENSE'],
        icon: 'Activity',
        desc: (lang = 'en') => translate('+0.15 HP regen/s', lang),
        apply: (mods) => {
            mods.stats.healthRegen = (mods.stats.healthRegen || 0) + 0.15;
        }
    },
    {
        id: 'plating',
        name: 'Plating',
        rarity: 'common',
        tags: ['DEFENSE'],
        icon: 'Shield',
        desc: (lang = 'en') => translate('+1 shield pip & Titan Shield level', lang),
        apply: (mods) => {
            mods.shieldPipImmediate += 1;
            mods.stats.titanShieldLevel = (mods.stats.titanShieldLevel || 0) + 1;
        }
    },

    // ================= UNCOMMON =================
    {
        id: 'chain_reaction',
        name: 'Chain Reaction',
        rarity: 'uncommon',
        tags: ['FIRE'],
        icon: 'Flame',
        desc: (lang = 'en') => translate('12% on kill: 60 dmg blast (r90)', lang),
        apply: (mods) => {
            mods.chainReactionCount += 1;
        }
    },
    {
        id: 'vampiric_light',
        name: 'Vampiric Light',
        rarity: 'uncommon',
        tags: ['DEFENSE'],
        icon: 'Heart',
        desc: (lang = 'en') => translate('Heal 1 HP per 25 kills', lang),
        apply: (mods) => {
            mods.vampiricLightCount += 1;
        }
    },
    {
        id: 'blast_dash',
        name: 'Blast Dash',
        rarity: 'uncommon',
        tags: ['DASH', 'FIRE'],
        icon: 'Zap',
        desc: (lang = 'en') => translate('Grants Super Dash +1 level', lang),
        apply: (mods) => {
            mods.stats.superDashLevel = (mods.stats.superDashLevel || 0) + 1;
        }
    },
    {
        id: 'static_charge',
        name: 'Static Charge',
        rarity: 'uncommon',
        tags: ['STORM'],
        icon: 'Zap',
        desc: (lang = 'en') => translate('5 kills in 3 s triggers Thunder Chain', lang),
        apply: (mods) => {
            mods.staticChargeCount += 1;
        }
    },
    {
        id: 'frost_trail',
        name: 'Frost Trail',
        rarity: 'uncommon',
        tags: ['ICE', 'DASH'],
        icon: 'Snowflake',
        desc: (lang = 'en') => translate('Dash leaves a slow field for 1.5 s', lang),
        apply: (mods) => {
            mods.frostTrailCount += 1;
        }
    },
    {
        id: 'wide_nova',
        name: 'Wide Nova',
        rarity: 'uncommon',
        tags: ['ICE', 'FIRE'],
        icon: 'Sparkles',
        desc: (lang = 'en') => translate('+25% radius on AoE powers', lang),
        apply: (mods) => {
            mods.aoeRadiusMult += 0.25;
            mods.stats.special_iceNovaSize = true;
        }
    },

    // ================= RARE =================
    {
        id: 'glass_heart',
        name: 'Glass Heart',
        rarity: 'rare',
        tags: ['FIRE', 'STORM'],
        icon: 'Flame',
        desc: (lang = 'en') => translate('+35% damage, -1 max HP (min 1)', lang),
        apply: (mods) => {
            mods.damageMult += 0.35;
            mods.stats.maxHealth = (mods.stats.maxHealth || 0) - 1;
        }
    },
    {
        id: 'overdrive',
        name: 'Overdrive',
        rarity: 'rare',
        tags: ['STORM', 'FIRE'],
        icon: 'Zap',
        desc: (lang = 'en') => translate('At combo 25+, +40% attack speed until combo breaks', lang),
        apply: (mods) => {
            mods.overdriveCount += 1;
        }
    },
    {
        id: 'phoenix_spark',
        name: 'Phoenix Spark',
        rarity: 'rare',
        tags: ['FIRE', 'DEFENSE'],
        icon: 'Sun',
        desc: (lang = 'en') => translate('Once per run: fatal hit revives at 50% HP + shockwave', lang),
        apply: (mods) => {
            mods.phoenixSparkCount += 1;
        }
    },
    {
        id: 'gravity_well',
        name: 'Gravity Well',
        rarity: 'rare',
        tags: ['ICE', 'STORM'],
        icon: 'Compass',
        desc: (lang = 'en') => translate('Drops a free Singularity every 15 s', lang),
        apply: (mods) => {
            mods.gravityWellCount += 1;
        }
    },
    {
        id: 'echo_cast',
        name: 'Echo Cast',
        rarity: 'rare',
        tags: ['STORM', 'FIRE'],
        icon: 'Sparkles',
        desc: (lang = 'en') => translate('Every 4th power cast fires twice (+25% attack speed)', lang),
        apply: (mods) => {
            mods.echoCastCount += 1;
            mods.stats.attackSpeed = (mods.stats.attackSpeed || 0) + 0.25;
        }
    },
    {
        id: 'lightning_dash',
        name: 'Lightning Dash',
        rarity: 'rare',
        tags: ['DASH', 'STORM'],
        icon: 'Zap',
        desc: (lang = 'en') => translate('Dashing zaps 3 nearest enemies', lang),
        apply: (mods) => {
            mods.lightningDashCount += 1;
        }
    },

    // ================= EPIC =================
    {
        id: 'supernova',
        name: 'Supernova',
        rarity: 'epic',
        tags: ['FIRE', 'STORM'],
        icon: 'Sun',
        desc: (lang = 'en') => translate('Every 45 s: screen pulse 300 + 30*wave dmg (x0.25 vs bosses)', lang),
        apply: (mods) => {
            mods.supernovaCount += 1;
        }
    },
    {
        id: 'second_sun',
        name: 'Second Sun',
        rarity: 'epic',
        tags: ['FIRE'],
        icon: 'Sun',
        desc: (lang = 'en') => translate('Permanent orbiting solar flare around you', lang),
        apply: (mods) => {
            mods.secondSunCount += 1;
        }
    },
    {
        id: 'supernova_core',
        name: 'Supernova Core',
        rarity: 'epic',
        tags: ['FIRE'],
        icon: 'Sun',
        desc: (lang = 'en') => translate('Every 12 s emit a screen-wide burn wave', lang),
        apply: (mods) => {
            mods.supernovaCoreCount += 1;
            mods.stats.solarFlareLevel = (mods.stats.solarFlareLevel || 0) + 1;
        }
    },
    {
        id: 'time_rift',
        name: 'Time Rift',
        rarity: 'epic',
        tags: ['ICE', 'DEFENSE'],
        icon: 'Clock',
        desc: (lang = 'en') => translate('Taking damage slows all enemies 60% for 2.5 s', lang),
        apply: (mods) => {
            mods.timeRiftCount += 1;
        }
    },
    {
        id: 'crown_of_sparks',
        name: 'Crown of Sparks',
        rarity: 'epic',
        tags: ['STORM'],
        icon: 'Crown',
        desc: (lang = 'en') => translate('+2 orbitals, orbitals fire mini-bolts', lang),
        apply: (mods) => {
            mods.crownOfSparksCount += 1;
            mods.stats.projectileCount = (mods.stats.projectileCount || 0) + 2;
        }
    },
    {
        id: 'void_harvester',
        name: 'Void Harvester',
        rarity: 'epic',
        tags: ['ECONOMY', 'DEFENSE'],
        icon: 'Gem',
        desc: (lang = 'en') => translate('Essence drops also heal 2% towards next heart', lang),
        apply: (mods) => {
            mods.voidHarvesterCount += 1;
            mods.stats.essenceMultiplier = (mods.stats.essenceMultiplier || 0) + 0.35;
        }
    }
];
