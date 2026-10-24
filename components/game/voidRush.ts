// Void Rush: 6-minute fast arcade mode configuration & helpers

export interface ModeConfig {
    mode: 'CAMPAIGN' | 'VOID_RUSH';
    waveDurationSec: number;
    boonDraftIntervalSec: number;
    totalDurationSec: number;
    midBossTimeSec: number;
    finalBossTimeSec: number;
    bossHpMultiplier: number;
    matterRewardRatio: number;
}

export const VOID_RUSH_CONFIG: ModeConfig = {
    mode: 'VOID_RUSH',
    waveDurationSec: 20,
    boonDraftIntervalSec: 30,
    totalDurationSec: 360, // 6 minutes
    midBossTimeSec: 180,   // 3:00
    finalBossTimeSec: 360, // 6:00
    bossHpMultiplier: 1.5,
    matterRewardRatio: 0.25, // 25% of score converted to permanent Matter
};

export const CAMPAIGN_MODE_CONFIG: ModeConfig = {
    mode: 'CAMPAIGN',
    waveDurationSec: 30,
    boonDraftIntervalSec: 0, // per wave clear
    totalDurationSec: 0,
    midBossTimeSec: 0,
    finalBossTimeSec: 0,
    bossHpMultiplier: 1.0,
    matterRewardRatio: 1.0,
};

export function calculateVoidRushScore(kills: number, bestCombo: number, survivalSec: number): number {
    const comboMult = 1 + Math.min(4.0, Math.floor(bestCombo / 10) * 0.25);
    return Math.round(kills * 10 * comboMult + survivalSec * 5);
}

export function calculateVoidRushMatterReward(score: number): number {
    return Math.max(10, Math.round(score * VOID_RUSH_CONFIG.matterRewardRatio));
}
