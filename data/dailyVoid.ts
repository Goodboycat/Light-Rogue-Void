// Seeded Daily Void modifiers & 3 Daily Session Quests (100% offline, UTC date seeded)

export interface DailyModifier {
    id: string;
    name: string;
    description: string;
    icon: string;
    color: string;
    // Gameplay multipliers
    playerMaxHpOverride?: number;
    playerSpeedMult?: number;
    playerDamageMult?: number;
    enemySpeedMult?: number;
    bossHpMult?: number;
    spawnRateMult?: number; // >1 means faster spawns (interval divided by spawnRateMult)
    essenceMult?: number;
    killsExplode?: boolean;
    dashCooldownMult?: number;
    aoeRadiusMult?: number;
}

export interface DailyQuestDef {
    id: string;
    title: string;
    target: number;
    rewardMatter: number;
    metric: 'kills' | 'essence' | 'waves_no_dash' | 'waves_reached' | 'combo' | 'boss_damage';
}

export interface DailyQuestProgress {
    id: string;
    current: number;
    target: number;
    rewardMatter: number;
    completed: boolean;
    notified50?: boolean;
}

export interface DailySaveState {
    lastPlayedDate: string; // YYYY-MM-DD UTC
    streakDays: number;
    activeDailyModEnabled: boolean;
    completedDailyDates: string[];
    bestWaveByDate: Record<string, number>;
    questDate: string;
    quests: DailyQuestProgress[];
}

export const DAILY_CONFIG = {
    QUEST_REWARD_MATTER_BASE: 45,
    DAILY_COMPLETION_WAVE: 10,
};

export const DAILY_MODIFIERS: DailyModifier[] = [
    {
        id: 'glass_cannon',
        name: 'Glass Cannon',
        description: 'Max HP locked to 1, but all Essence harvested is tripled (x3).',
        icon: 'Zap',
        color: '#f43f5e',
        playerMaxHpOverride: 1,
        playerDamageMult: 1.5,
        essenceMult: 3.0,
    },
    {
        id: 'swarm_night',
        name: 'Swarm Night',
        description: '+50% anomaly spawn rate and +50% Essence harvested.',
        icon: 'Flame',
        color: '#f59e0b',
        spawnRateMult: 1.5,
        essenceMult: 1.5,
    },
    {
        id: 'slow_dark',
        name: 'Slow Dark',
        description: 'Enemies move 20% slower, but Bosses have +25% HP.',
        icon: 'Snowflake',
        color: '#38bdf8',
        enemySpeedMult: 0.8,
        bossHpMult: 1.25,
        essenceMult: 1.25,
    },
    {
        id: 'echo_detonation',
        name: 'Echo Detonation',
        description: 'Every defeated anomaly explodes in a volatile shockwave.',
        icon: 'Sparkles',
        color: '#a855f7',
        killsExplode: true,
        essenceMult: 1.25,
    },
    {
        id: 'heavy_light',
        name: 'Heavy Light',
        description: 'Move 15% slower, but deal +40% damage with all powers.',
        icon: 'Shield',
        color: '#eab308',
        playerSpeedMult: 0.85,
        playerDamageMult: 1.4,
    },
    {
        id: 'hyper_flux',
        name: 'Hyper Flux',
        description: 'Dash cooldown -40% and movement speed +20%.',
        icon: 'Wind',
        color: '#22d3ee',
        playerSpeedMult: 1.2,
        dashCooldownMult: 0.6,
    },
    {
        id: 'solar_tide',
        name: 'Solar Tide',
        description: 'All AoE powers have +35% radius; +25% Essence harvested.',
        icon: 'Sun',
        color: '#fb923c',
        aoeRadiusMult: 1.35,
        essenceMult: 1.25,
    },
    {
        id: 'blood_moon',
        name: 'Crimson Surge',
        description: 'Enemies move +15% faster, +60% Essence harvested.',
        icon: 'Activity',
        color: '#ef4444',
        enemySpeedMult: 1.15,
        essenceMult: 1.6,
    },
    {
        id: 'astral_bounty',
        name: 'Astral Bounty',
        description: '+35% Essence harvested and +15% player damage.',
        icon: 'Gem',
        color: '#10b981',
        playerDamageMult: 1.15,
        essenceMult: 1.35,
    },
    {
        id: 'volatile_core',
        name: 'Volatile Core',
        description: '+50% damage dealt, enemies explodes on death, -15% speed.',
        icon: 'Target',
        color: '#ec4899',
        playerDamageMult: 1.5,
        killsExplode: true,
        playerSpeedMult: 0.85,
    },
    {
        id: 'OVERCLOCK',
        name: 'Overclocked Pulse',
        description: '+25% player damage and -25% dash cooldown.',
        icon: 'FastForward',
        color: '#60a5fa',
        playerDamageMult: 1.25,
        dashCooldownMult: 0.75,
    },
    {
        id: 'void_harvest',
        name: 'Deep Harvest',
        description: '+25% enemy spawns, +40% Essence harvested.',
        icon: 'Compass',
        color: '#c084fc',
        spawnRateMult: 1.25,
        essenceMult: 1.4,
    },
];

export const DAILY_QUEST_POOL: DailyQuestDef[] = [
    { id: 'q_kills_60', title: 'Defeat 60 anomalies in a run', target: 60, rewardMatter: 45, metric: 'kills' },
    { id: 'q_kills_120', title: 'Defeat 120 anomalies in a run', target: 120, rewardMatter: 65, metric: 'kills' },
    { id: 'q_essence_250', title: 'Harvest 250 Essence in a run', target: 250, rewardMatter: 50, metric: 'essence' },
    { id: 'q_essence_500', title: 'Harvest 500 Essence in a run', target: 500, rewardMatter: 75, metric: 'essence' },
    { id: 'q_wave_5', title: 'Reach Wave 5 in any sector', target: 5, rewardMatter: 40, metric: 'waves_reached' },
    { id: 'q_wave_8', title: 'Reach Wave 8 in any sector', target: 8, rewardMatter: 60, metric: 'waves_reached' },
    { id: 'q_combo_25', title: 'Reach a 25x Kill Combo', target: 25, rewardMatter: 50, metric: 'combo' },
    { id: 'q_combo_40', title: 'Reach a 40x Kill Combo', target: 40, rewardMatter: 70, metric: 'combo' },
    { id: 'q_nodash_3', title: 'Clear 3 waves without dashing', target: 3, rewardMatter: 55, metric: 'waves_no_dash' },
];

export function getUtcDateString(now: Date = new Date()): string {
    const y = now.getUTCFullYear();
    const m = String(now.getUTCMonth() + 1).padStart(2, '0');
    const d = String(now.getUTCDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

function hashDateString(dateStr: string): number {
    let h = 2166136261;
    for (let i = 0; i < dateStr.length; i++) {
        h ^= dateStr.charCodeAt(i);
        h = Math.imul(h, 16777619);
    }
    return h >>> 0;
}

function createSeededRng(seed: number) {
    return () => {
        let t = (seed += 0x6d2b79f5);
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

export function getDailyModifierForDate(dateStr: string = getUtcDateString()): DailyModifier {
    const seed = hashDateString(dateStr);
    const rng = createSeededRng(seed);
    const idx = Math.floor(rng() * DAILY_MODIFIERS.length);
    return DAILY_MODIFIERS[idx];
}

export function getDailyQuestsForDate(dateStr: string = getUtcDateString()): DailyQuestDef[] {
    const seed = hashDateString(dateStr + '_quests');
    const rng = createSeededRng(seed);
    const pool = [...DAILY_QUEST_POOL];
    const picked: DailyQuestDef[] = [];
    while (picked.length < 3 && pool.length > 0) {
        const idx = Math.floor(rng() * pool.length);
        picked.push(pool.splice(idx, 1)[0]);
    }
    return picked;
}

export function syncDailyState(existing?: Partial<DailySaveState>): DailySaveState {
    const today = getUtcDateString();
    const base: DailySaveState = {
        lastPlayedDate: existing?.lastPlayedDate || '',
        streakDays: existing?.streakDays || 1,
        activeDailyModEnabled: existing?.activeDailyModEnabled || false,
        completedDailyDates: existing?.completedDailyDates || [],
        bestWaveByDate: existing?.bestWaveByDate || {},
        questDate: existing?.questDate || '',
        quests: existing?.quests || [],
    };

    if (base.lastPlayedDate !== today) {
        if (base.lastPlayedDate !== '') {
            // Non-punishing streak: increments on any new day played, never resets on a missed day
            base.streakDays = (base.streakDays || 1) + 1;
        } else {
            base.streakDays = 1;
        }
        base.lastPlayedDate = today;
    }

    if (base.questDate !== today || !base.quests || base.quests.length === 0) {
        const defs = getDailyQuestsForDate(today);
        base.questDate = today;
        base.quests = defs.map(d => ({
            id: d.id,
            current: 0,
            target: d.target,
            rewardMatter: d.rewardMatter,
            completed: false,
            notified50: false,
        }));
    }

    return base;
}
