import { track } from '../../utils/telemetry';
import { DifficultyLevel } from '../../types';

export const MERCY_CONFIG = {
    windowMs: 10 * 60 * 1000, // 10 minutes
    deathsThreshold: 2,       // 2+ deaths in same wave or boss
    cleanWavesToLower: 2,     // 2 clean waves in a row lower level by 1
    maxLevel: 3,
};

export interface DifficultyConfig {
    enemyHpMult: number;
    enemyProjSpeedMult: number;
    spawnIntervalMult: number;
    maxDamageCapPerHit?: number;
    essenceRewardMult: number;
    bossHpMult: number;
}

export const DIFFICULTY_CONFIGS: Record<DifficultyLevel, DifficultyConfig> = {
    chill: {
        enemyHpMult: 0.7,
        enemyProjSpeedMult: 0.9,
        spawnIntervalMult: 1.2,
        maxDamageCapPerHit: 1,
        essenceRewardMult: 0.8,
        bossHpMult: 0.8,
    },
    normal: {
        enemyHpMult: 1.0,
        enemyProjSpeedMult: 1.0,
        spawnIntervalMult: 1.0,
        maxDamageCapPerHit: undefined,
        essenceRewardMult: 1.0,
        bossHpMult: 1.0,
    },
    brutal: {
        enemyHpMult: 1.3,
        enemyProjSpeedMult: 1.1,
        spawnIntervalMult: 0.85,
        maxDamageCapPerHit: undefined,
        essenceRewardMult: 1.5,
        bossHpMult: 1.3,
    }
};

export interface MercyMultipliers {
    mercyLevel: number;
    difficulty: DifficultyLevel;
    spawnIntervalMult: number;     // e.g. Chill 1.2 * Mercy 1.15
    enemyProjSpeedMult: number;    // e.g. Chill 0.9 * Mercy 0.95
    heartDropChanceBonus: number;  // L1+: +0.06
    enemyHpMult: number;           // e.g. Chill 0.7 * Mercy 0.90
    bossCadenceMult: number;       // L2+: 0.85 (15% slower attack cadence)
    healEveryNKills: number;       // L2+: 25
    bossDamageMult: number;        // L3: 0.80
    tempShieldPipsPerWave: number; // L3: 1
    maxDamageCapPerHit?: number;   // Chill: max 1 pip per hit
    essenceRewardMult: number;     // Chill: 0.8, Normal: 1.0, Brutal: 1.5
    bossHpMult: number;            // Chill: 0.8, Normal: 1.0, Brutal: 1.3
}

export interface MercySaveData {
    deathsByWave?: Record<string, number[] | number>;
    bossAttempts?: Record<string, number[] | number>;
    mercyLevel?: number;
    cleanWaveStreak?: number;
}

export type MercySaveState = MercySaveData;

// Single mutable multiplier object read throughout game logic (zero allocations)
export const MERCY_MULTIPLIERS: MercyMultipliers = {
    mercyLevel: 0,
    difficulty: 'normal',
    spawnIntervalMult: 1.0,
    enemyProjSpeedMult: 1.0,
    heartDropChanceBonus: 0,
    enemyHpMult: 1.0,
    bossCadenceMult: 1.0,
    healEveryNKills: 0,
    bossDamageMult: 1.0,
    tempShieldPipsPerWave: 0,
    maxDamageCapPerHit: undefined,
    essenceRewardMult: 1.0,
    bossHpMult: 1.0,
};

let currentDifficulty: DifficultyLevel = 'normal';

export function updateMercyMultipliers(level: number, difficulty?: DifficultyLevel) {
    const clampedLevel = Math.max(0, Math.min(MERCY_CONFIG.maxLevel, Math.floor(level || 0)));
    if (difficulty) {
        currentDifficulty = difficulty;
    }
    const diffConfig = DIFFICULTY_CONFIGS[currentDifficulty] || DIFFICULTY_CONFIGS.normal;

    MERCY_MULTIPLIERS.mercyLevel = clampedLevel;
    MERCY_MULTIPLIERS.difficulty = currentDifficulty;

    let mercySpawnFactor = 1.0;
    let mercyProjFactor = 1.0;
    let mercyHpFactor = 1.0;
    let heartBonus = 0;
    let bossCadence = 1.0;
    let healKills = 0;
    let bossDmg = 1.0;
    let tempShield = 0;

    switch (clampedLevel) {
        case 1:
            mercySpawnFactor = 1.15;
            mercyProjFactor = 0.95;
            heartBonus = 0.06;
            break;
        case 2:
            mercySpawnFactor = 1.30;
            mercyProjFactor = 0.95;
            mercyHpFactor = 0.90;
            heartBonus = 0.06;
            bossCadence = 0.85;
            healKills = 25;
            break;
        case 3:
            mercySpawnFactor = 1.45;
            mercyProjFactor = 0.95;
            mercyHpFactor = 0.80;
            heartBonus = 0.06;
            bossCadence = 0.85;
            healKills = 25;
            bossDmg = 0.80;
            tempShield = 1;
            break;
    }

    MERCY_MULTIPLIERS.spawnIntervalMult = diffConfig.spawnIntervalMult * mercySpawnFactor;
    MERCY_MULTIPLIERS.enemyProjSpeedMult = diffConfig.enemyProjSpeedMult * mercyProjFactor;
    MERCY_MULTIPLIERS.enemyHpMult = diffConfig.enemyHpMult * mercyHpFactor;
    MERCY_MULTIPLIERS.bossHpMult = diffConfig.bossHpMult;
    MERCY_MULTIPLIERS.heartDropChanceBonus = heartBonus;
    MERCY_MULTIPLIERS.bossCadenceMult = bossCadence;
    MERCY_MULTIPLIERS.healEveryNKills = healKills;
    MERCY_MULTIPLIERS.bossDamageMult = bossDmg;
    MERCY_MULTIPLIERS.tempShieldPipsPerWave = tempShield;
    MERCY_MULTIPLIERS.maxDamageCapPerHit = diffConfig.maxDamageCapPerHit;
    MERCY_MULTIPLIERS.essenceRewardMult = diffConfig.essenceRewardMult;
}

function getTimestamps(entry: number[] | number | undefined, now: number): number[] {
    if (Array.isArray(entry)) return entry;
    if (typeof entry === 'number' && entry > 0) {
        return Array.from({ length: entry }, () => now);
    }
    return [];
}

export function recordPlayerDeath(
    save: MercySaveData,
    wave: number,
    bossId?: string,
    now: number = Date.now()
): { updatedSave: MercySaveData; mercyLevel: number } {
    const deathsByWave: Record<string, number[]> = {};
    const bossAttempts: Record<string, number[]> = {};

    if (save.deathsByWave) {
        Object.keys(save.deathsByWave).forEach(k => {
            const list = getTimestamps(save.deathsByWave![k], now);
            deathsByWave[k] = list.filter(ts => now - ts <= MERCY_CONFIG.windowMs);
        });
    }

    if (save.bossAttempts) {
        Object.keys(save.bossAttempts).forEach(k => {
            const list = getTimestamps(save.bossAttempts![k], now);
            bossAttempts[k] = list.filter(ts => now - ts <= MERCY_CONFIG.windowMs);
        });
    }

    const waveKey = String(wave);
    const waveList = deathsByWave[waveKey] || [];
    waveList.push(now);
    deathsByWave[waveKey] = waveList;

    let bossList: number[] = [];
    if (bossId) {
        bossList = bossAttempts[bossId] || [];
        bossList.push(now);
        bossAttempts[bossId] = bossList;
    }

    let currentLevel = save.mercyLevel || 0;
    const waveDeaths = waveList.length;
    const bossDeaths = bossList.length;

    if (waveDeaths >= MERCY_CONFIG.deathsThreshold || (bossId && bossDeaths >= MERCY_CONFIG.deathsThreshold)) {
        if (currentLevel < MERCY_CONFIG.maxLevel) {
            const oldLevel = currentLevel;
            currentLevel = Math.min(MERCY_CONFIG.maxLevel, currentLevel + 1);

            track('mercy_level_changed', {
                from: oldLevel,
                to: currentLevel,
                reason: bossId ? 'boss_deaths' : 'wave_deaths',
                wave,
                bossId,
                waveDeaths,
                bossDeaths
            });
        }
    }

    updateMercyMultipliers(currentLevel);

    return {
        updatedSave: {
            ...save,
            deathsByWave,
            bossAttempts,
            mercyLevel: currentLevel,
            cleanWaveStreak: 0
        },
        mercyLevel: currentLevel
    };
}

export function recordWaveClear(
    save: MercySaveData,
    wave: number,
    noDamageTaken: boolean
): { updatedSave: MercySaveData; mercyLevel: number } {
    let currentLevel = save.mercyLevel || 0;
    let cleanStreak = save.cleanWaveStreak || 0;

    if (noDamageTaken) {
        cleanStreak++;
        if (cleanStreak >= MERCY_CONFIG.cleanWavesToLower) {
            cleanStreak = 0;
            if (currentLevel > 0) {
                const oldLevel = currentLevel;
                currentLevel = Math.max(0, currentLevel - 1);

                track('mercy_level_changed', {
                    from: oldLevel,
                    to: currentLevel,
                    reason: 'clean_streak',
                    wave
                });
            }
        }
    } else {
        cleanStreak = 0;
    }

    updateMercyMultipliers(currentLevel);

    return {
        updatedSave: {
            ...save,
            mercyLevel: currentLevel,
            cleanWaveStreak: cleanStreak
        },
        mercyLevel: currentLevel
    };
}
