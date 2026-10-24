// 12 Cosmetic Spark Skins & Trails (6 skins, 6 trails) — Zero gameplay effect.
// Unlocked by achievements, maturity titles, and boss kills.

export interface CosmeticItem {
    id: string;
    kind: 'skin' | 'trail';
    name: string;
    description: string;
    unlockHint: string;
    coreColor: string;
    glowColor: string;
    ringColor: string;
    trailStyle?: 'STANDARD' | 'STARDUST' | 'WARDEN' | 'NEUTRON' | 'CRIMSON' | 'TRANSCENDENT';
    checkUnlocked: (ctx: {
        unlockedAchievementIds: string[];
        defeatedBosses: string[];
        maxMaturityAchieved: number;
        maxWaveReached: number;
    }) => boolean;
}

export const COSMETICS_DATA: CosmeticItem[] = [
    // --- 6 SPARK SKINS ---
    {
        id: 'skin_default',
        kind: 'skin',
        name: 'Pure Spark',
        description: 'The original white-hot ember born in the Origin Fields.',
        unlockHint: 'Default',
        coreColor: '#ffffff',
        glowColor: '#fde68a',
        ringColor: '#f59e0b',
        checkUnlocked: () => true,
    },
    {
        id: 'skin_solar_ember',
        kind: 'skin',
        name: 'Solar Prominence',
        description: 'A blazing golden core forged by early maturity.',
        unlockHint: 'Reach Maturity Lv. 12 (Pilot Light)',
        coreColor: '#fef08a',
        glowColor: '#f97316',
        ringColor: '#fbbf24',
        checkUnlocked: ({ maxMaturityAchieved }) => maxMaturityAchieved >= 11,
    },
    {
        id: 'skin_hive_breaker',
        kind: 'skin',
        name: 'Bio-Luminescence',
        description: 'Emerald resonance harvested from the Hive Mind.',
        unlockHint: 'Defeat The Hive Mind (Wave 10)',
        coreColor: '#ecfccb',
        glowColor: '#22c55e',
        ringColor: '#4ade80',
        checkUnlocked: ({ defeatedBosses, maxWaveReached }) =>
            defeatedBosses.includes('hive_mind') || maxWaveReached > 10,
    },
    {
        id: 'skin_warden_aegis',
        kind: 'skin',
        name: 'Warden Aegis',
        description: 'Crystalline cyan refraction claimed from the Void Warden.',
        unlockHint: 'Unlock "Warden Breaker" Achievement',
        coreColor: '#e0f2fe',
        glowColor: '#06b6d4',
        ringColor: '#38bdf8',
        checkUnlocked: ({ unlockedAchievementIds, defeatedBosses }) =>
            unlockedAchievementIds.includes('kill_boss_1') || defeatedBosses.includes('void_warden'),
    },
    {
        id: 'skin_crimson_eclipse',
        kind: 'skin',
        name: 'Crimson Eclipse',
        description: 'A ruby-ringed singularity core that defies the dark.',
        unlockHint: 'Reach Maturity Lv. 36 (Zenith Heat) or Wave 30',
        coreColor: '#ffe4e6',
        glowColor: '#e11d48',
        ringColor: '#fb7185',
        checkUnlocked: ({ maxMaturityAchieved, maxWaveReached }) =>
            maxMaturityAchieved >= 35 || maxWaveReached >= 30,
    },
    {
        id: 'skin_transcendence',
        kind: 'skin',
        name: 'Transcendence Halo',
        description: 'Prismatic astral light of an awakened Omega Sun.',
        unlockHint: 'Unlock "Transcendence" or "The Omega Sun"',
        coreColor: '#ffffff',
        glowColor: '#c084fc',
        ringColor: '#e879f9',
        checkUnlocked: ({ unlockedAchievementIds, maxMaturityAchieved }) =>
            unlockedAchievementIds.includes('kill_boss_3') ||
            unlockedAchievementIds.includes('final_maturity') ||
            maxMaturityAchieved >= 60,
    },

    // --- 6 SPARK TRAILS ---
    {
        id: 'trail_default',
        kind: 'trail',
        name: 'Luminous Wake',
        description: 'Clean white photon wake behind your spark.',
        unlockHint: 'Default',
        coreColor: '#ffffff',
        glowColor: '#cbd5e1',
        ringColor: '#94a3b8',
        trailStyle: 'STANDARD',
        checkUnlocked: () => true,
    },
    {
        id: 'trail_stardust',
        kind: 'trail',
        name: 'Amber Cinders',
        description: 'Warm drifting embers that mark your path.',
        unlockHint: 'Unlock "Sparking" (25% Ability Tree) or Wave 8',
        coreColor: '#fde68a',
        glowColor: '#f59e0b',
        ringColor: '#d97706',
        trailStyle: 'STARDUST',
        checkUnlocked: ({ unlockedAchievementIds, maxWaveReached }) =>
            unlockedAchievementIds.includes('tree_25') || maxWaveReached >= 8,
    },
    {
        id: 'trail_warden_breaker',
        kind: 'trail',
        name: 'Warden Breaker Wake',
        description: 'Electric cyan ion ribbons left in your wake.',
        unlockHint: 'Defeat Void Warden or Archive 25% Entities',
        coreColor: '#67e8f9',
        glowColor: '#0ea5e9',
        ringColor: '#38bdf8',
        trailStyle: 'WARDEN',
        checkUnlocked: ({ unlockedAchievementIds, defeatedBosses }) =>
            unlockedAchievementIds.includes('kill_boss_1') ||
            unlockedAchievementIds.includes('archive_25') ||
            defeatedBosses.includes('void_warden'),
    },
    {
        id: 'trail_neutron',
        kind: 'trail',
        name: 'Star Extinguisher Ribbon',
        description: 'High-gravity violet particles bent by your velocity.',
        unlockHint: 'Unlock "Star Extinguisher" or Reach Wave 20',
        coreColor: '#ddd6fe',
        glowColor: '#8b5cf6',
        ringColor: '#a78bfa',
        trailStyle: 'NEUTRON',
        checkUnlocked: ({ unlockedAchievementIds, maxWaveReached }) =>
            unlockedAchievementIds.includes('kill_boss_2') || maxWaveReached >= 20,
    },
    {
        id: 'trail_crimson_flare',
        kind: 'trail',
        name: 'Supernova Flare',
        description: 'Fierce rose-gold plasma arcs when dashing and weaving.',
        unlockHint: 'Unlock "Burning" (50% Ability Tree) or Maturity Lv. 25',
        coreColor: '#fecdd3',
        glowColor: '#f43f5e',
        ringColor: '#fb7185',
        trailStyle: 'CRIMSON',
        checkUnlocked: ({ unlockedAchievementIds, maxMaturityAchieved }) =>
            unlockedAchievementIds.includes('tree_50') || maxMaturityAchieved >= 24,
    },
    {
        id: 'trail_transcendence',
        kind: 'trail',
        name: 'Celestial Weaver',
        description: 'Prismatic diamond motes of pure cosmic harmony.',
        unlockHint: 'Unlock "Transcendence" or "Arsenal Complete"',
        coreColor: '#f5d0fe',
        glowColor: '#d946ef',
        ringColor: '#f0abfc',
        trailStyle: 'TRANSCENDENT',
        checkUnlocked: ({ unlockedAchievementIds }) =>
            unlockedAchievementIds.includes('kill_boss_3') ||
            unlockedAchievementIds.includes('unlock_all_abilities'),
    },
];

export function getCosmeticById(id: string | undefined, fallbackKind: 'skin' | 'trail'): CosmeticItem {
    const found = COSMETICS_DATA.find(c => c.id === id && c.kind === fallbackKind);
    if (found) return found;
    return COSMETICS_DATA.find(c => c.kind === fallbackKind)!;
}
