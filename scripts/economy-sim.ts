import { ENEMIES } from '../enemies';
import { ABILITY_TREE_DATA } from '../data';
import { POWERS } from '../abilityConfig';

export const ECONOMY_SIM_CONFIG = {
    runs: 200,
    maxWave: 30,
    waveDurationSec: 25,
    baseSpawnFrames: 60,
    spawnDecrementPerWave: 3,
    minSpawnFrames: 8,
    firstPowerFreeWave: 1,
    // Proposed tuned CONFIG values for comparison
    recommendedTierMultipliers: {
        depth10_19: 1.6, // down from 2.5
        depth20_29: 3.5, // down from 6.0
        depth30_39: 8.0, // down from 15.0
        depth40_49: 20.0, // down from 40.0
        depth50Plus: 50.0, // down from 100.0
    },
    recommendedSkillNodeMultiplier: 2.2, // down from 3.0
    recommendedEssenceWaveBonusPerWave: 0.04, // +4% essence per wave
};

// Seeded PRNG (mulberry32)
function createRNG(seed: number) {
    return () => {
        let t = (seed += 0x6d2b79f5);
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

function getSpawnableEnemySeeded(wave: number, rng: () => number) {
    const unlocked = ENEMIES.filter(e => e.minWave <= wave);
    if (unlocked.length === 0) return ENEMIES[0];
    let candidates = unlocked.filter(e => e.minWave >= wave - 20);
    if (candidates.length === 0) {
        const maxMinWave = Math.max(...unlocked.map(e => e.minWave));
        candidates = unlocked.filter(e => e.minWave >= maxMinWave - 10);
    }
    if (candidates.length === 0) candidates = unlocked;
    const totalWeight = candidates.reduce((s, e) => s + e.spawnWeight, 0);
    let r = rng() * totalWeight;
    for (const e of candidates) {
        r -= e.spawnWeight;
        if (r <= 0) return e;
    }
    return candidates[candidates.length - 1];
}

function estimatePlayerDps(unlockedIds: Set<string>, wave: number, ownedPowerCount: number): number {
    // Starter Spark Pulse: base 16 + 2*(wave-1) every 0.5s => ~32 + 4*(wave-1) DPS
    const effWave = Math.min(30, wave);
    let dps = (16 + (effWave - 1) * 2) * 2.0;

    // Each owned major power adds ~45-85 effective AoE/single-target DPS
    dps += ownedPowerCount * (48 + wave * 3.5);

    // Minor nodes (attackSpeed, damageAura, projectileCount)
    const minorCount = Math.max(0, unlockedIds.size - 1 - ownedPowerCount);
    dps *= 1 + minorCount * 0.04;

    return dps;
}

interface WaveSimStats {
    matterEarned: number[];
    nodesAffordable: number[];
    ownedPowersAtWave: number[];
}

export function runEconomySimulation() {
    const waveStats: Record<number, WaveSimStats> = {};
    for (let w = 1; w <= ECONOMY_SIM_CONFIG.maxWave; w++) {
        waveStats[w] = { matterEarned: [], nodesAffordable: [], ownedPowersAtWave: [] };
    }

    const wavesBetweenSpikesAll: number[] = [];

    for (let run = 0; run < ECONOMY_SIM_CONFIG.runs; run++) {
        const rng = createRNG(1000 + run * 37);
        const unlocked = new Set<string>(['root']);
        let matterBank = 0;
        let ownedPowers = 1; // Free starter power choice in Wave 1
        let lastUpgradeWave = 1;

        for (let wave = 1; wave <= ECONOMY_SIM_CONFIG.maxWave; wave++) {
            const isBossWave = wave % 10 === 0;
            const spawnIntervalFrames = Math.max(
                ECONOMY_SIM_CONFIG.minSpawnFrames,
                ECONOMY_SIM_CONFIG.baseSpawnFrames - ECONOMY_SIM_CONFIG.spawnDecrementPerWave * wave
            );
            const totalFrames = ECONOMY_SIM_CONFIG.waveDurationSec * 60;
            const totalSpawns = isBossWave ? 12 : Math.floor(totalFrames / spawnIntervalFrames);

            // Essence multiplier from unlocked utility nodes
            let essenceMult = 1.0;
            unlocked.forEach(id => {
                const n = ABILITY_TREE_DATA.find(x => x.id === id);
                if (n?.statEffect?.essenceMultiplier) {
                    essenceMult += n.statEffect.essenceMultiplier;
                }
            });

            const playerDps = estimatePlayerDps(unlocked, wave, ownedPowers);
            let waveMatter = 0;

            for (let s = 0; s < totalSpawns; s++) {
                const def = getSpawnableEnemySeeded(wave, rng);
                const enemyHp = def.baseHp + wave * def.hpScaling + wave * wave * 0.5;
                // Wave end converts remaining enemies into drops, or player kills them during wave
                const killFraction = Math.min(1.0, (playerDps * ECONOMY_SIM_CONFIG.waveDurationSec) / Math.max(1, totalSpawns * enemyHp));
                const effectiveCollectProb = Math.min(1.0, 0.65 + killFraction * 0.35);
                if (rng() <= effectiveCollectProb) {
                    waveMatter += Math.max(1, Math.round(def.essenceReward * essenceMult));
                }
            }

            if (isBossWave) {
                waveMatter += wave * 25; // Boss bounty
            }

            matterBank += waveMatter;
            waveStats[wave].matterEarned.push(waveMatter);

            // Check affordable revealed nodes
            const getBuyable = () =>
                ABILITY_TREE_DATA.filter(
                    n =>
                        !unlocked.has(n.id) &&
                        n.parentIds.some(pid => unlocked.has(pid)) &&
                        n.cost <= matterBank
                ).sort((a, b) => a.cost - b.cost);

            const initialBuyable = getBuyable();
            waveStats[wave].nodesAffordable.push(initialBuyable.length);

            // Simulate player purchasing nodes after wave
            let boughtAny = false;
            while (true) {
                const buyable = getBuyable();
                if (buyable.length === 0) break;
                // Prefer major skill nodes if affordable, else cheapest minor node
                const major = buyable.find(n => n.isMajor);
                const pick = major || buyable[0];
                matterBank -= pick.cost;
                unlocked.add(pick.id);
                boughtAny = true;
                if (pick.isMajor) {
                    ownedPowers++;
                }
            }

            if (boughtAny) {
                wavesBetweenSpikesAll.push(wave - lastUpgradeWave);
                lastUpgradeWave = wave;
            }

            waveStats[wave].ownedPowersAtWave.push(ownedPowers);
        }
    }

    const percentile = (arr: number[], p: number) => {
        const sorted = [...arr].sort((a, b) => a - b);
        const idx = Math.min(sorted.length - 1, Math.floor(sorted.length * p));
        return sorted[idx] || 0;
    };

    console.log('=== LIGHT ROGUE VOID: MATTER ECONOMY SIMULATION (200 RUNS x WAVES 1-30) ===');
    console.log('Wave | Matter p10 / p50 / p90 | Affordable Nodes (p50) | Owned Powers (p50)');
    console.log('---------------------------------------------------------------------------');
    for (let w = 1; w <= ECONOMY_SIM_CONFIG.maxWave; w++) {
        const m = waveStats[w].matterEarned;
        const a = waveStats[w].nodesAffordable;
        const p = waveStats[w].ownedPowersAtWave;
        const p10 = percentile(m, 0.1);
        const p50 = percentile(m, 0.5);
        const p90 = percentile(m, 0.9);
        const aff50 = percentile(a, 0.5);
        const pow50 = percentile(p, 0.5);
        console.log(
            `W${String(w).padStart(2, '0')}  | ${String(p10).padStart(4)} / ${String(p50).padStart(4)} / ${String(p90).padStart(4)}     | ${String(aff50).padStart(22)} | ${String(pow50).padStart(18)}`
        );
    }

    const avgWavesBetweenUpgrades =
        wavesBetweenSpikesAll.reduce((a, b) => a + b, 0) / Math.max(1, wavesBetweenSpikesAll.length);
    console.log('\nAvg Waves Between Upgrades:', avgWavesBetweenUpgrades.toFixed(2));
    console.log('Median Owned Powers at Wave 10 (Boss 1):', percentile(waveStats[10].ownedPowersAtWave, 0.5));
    console.log('\n=== RECOMMENDED CONFIG DIFFS ===');
    console.log(`- data.ts TIER_MULTIPLIERS:
  depth 10..19: 2.5 -> ${ECONOMY_SIM_CONFIG.recommendedTierMultipliers.depth10_19}
  depth 20..29: 6.0 -> ${ECONOMY_SIM_CONFIG.recommendedTierMultipliers.depth20_29}
  depth 30..39: 15.0 -> ${ECONOMY_SIM_CONFIG.recommendedTierMultipliers.depth30_39}
  depth 40..49: 40.0 -> ${ECONOMY_SIM_CONFIG.recommendedTierMultipliers.depth40_49}
  depth 50+:    100.0 -> ${ECONOMY_SIM_CONFIG.recommendedTierMultipliers.depth50Plus}
  skillNodeMult: 3.0 -> ${ECONOMY_SIM_CONFIG.recommendedSkillNodeMultiplier}`);
}

// Execute when run directly via tsx / node
try {
    const isMain = typeof process !== 'undefined' && process.argv && process.argv[1]?.includes('economy-sim');
    if (isMain) {
        runEconomySimulation();
    }
} catch {}
