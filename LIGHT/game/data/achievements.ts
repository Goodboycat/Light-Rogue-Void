// (8A step 5) Achievements v2 — 30 data-driven entries `{ id, title, description, icon, reward, check(ctx) }`.
// The 19 v1 ids are kept verbatim so old saves keep their unlocks; 11 new ones read the lifetime stats
// (save/stats.ts) and the boss-mechanic feats recorded by logic/BossFeats.ts.
// Unlock flow: App.tsx `applyAchievementUnlocks` → matter reward + toast (components/AchievementToast.tsx).
import { Achievement, GameState, PlayerStats } from '../types';
import { MAX_WAVE } from '../components/game/Constants';
import { ABILITY_TREE_DATA } from '../data';
import { ENEMIES } from '../enemies';
import { BOSSES } from '../bosses';
import { MATURITY_LEVELS } from './maturity';
import { LifetimeStats } from '../save/schema';
import { ensureStats, totalDiscoveries } from '../save/stats';

export interface AchievementCtx {
    state: GameState;
    stats: LifetimeStats;
    player: PlayerStats;
    wave: number;
    startWave: number;
}

export const ACHIEVEMENTS: Achievement[] = [];

const add = (id: string, title: string, description: string, icon: string, reward: number, check: (c: AchievementCtx) => boolean) => {
    ACHIEVEMENTS.push({
        id, title, description, icon, reward,
        condition: (state, player, wave, startWave) => check({ state, stats: ensureStats(state.stats), player, wave, startWave }),
    });
};

const MAIN_BOSS_IDS = ['hive_mind', 'void_warden', 'crimson_eclipse', 'neutron_star', 'entropy_titan', 'darkness'];
const hasFeat = (s: LifetimeStats, suffix: string) => Object.keys(s.feats).some(f => f.endsWith(':' + suffix));

// 1. BOSS KILLERS (v1 ids)
add('kill_boss_1', 'Warden Breaker', 'Defeat the Void Warden', 'Shield', 500, c => c.state.defeatedBosses.includes('void_warden'));
add('kill_boss_2', 'Star Extinguisher', 'Defeat the Collapsing Neutron', 'Zap', 1500, c => c.state.defeatedBosses.includes('neutron_star'));
add('kill_boss_3', 'Transcendence', 'Defeat Darkness', 'Crown', 5000, c => c.state.defeatedBosses.includes('darkness'));
add('hardcore_survivor', 'The Immortal', 'Reach Darkness and kill it in one run from wave 1', 'Shield', 10000, c => c.state.defeatedBosses.includes('darkness') && c.startWave === 1);
add('omega_god', 'Absolute Being', 'Defeat Darkness holding the Omega Sun rank', 'Sun', 10000, c => c.state.defeatedBosses.includes('darkness') && c.state.maxMaturityAchieved >= 79);

// 2. ARCHIVES (v1 ids)
const totalEntities = new Set([...ENEMIES.map(e => e.id), ...BOSSES.map(e => e.id)]).size;
add('archive_25', 'Observer', 'Archive 25% of all entities', 'Eye', 250, c => c.state.seenEnemyIds.length >= totalEntities * 0.25);
add('archive_50', 'Analyst', 'Archive 50% of all entities', 'BookOpen', 500, c => c.state.seenEnemyIds.length >= totalEntities * 0.5);
add('archive_75', 'Researcher', 'Archive 75% of all entities', 'Search', 1000, c => c.state.seenEnemyIds.length >= totalEntities * 0.75);
add('archive_100', 'Void Killer', 'Archive 100% of all entities', 'Globe', 2500, c => c.state.seenEnemyIds.length >= totalEntities);

// 3. SKILL TREE (v1 ids)
const totalNodes = ABILITY_TREE_DATA.length;
add('tree_25', 'Sparking', 'Unlock 25% of the skill tree', 'Zap', 250, c => c.state.unlockedAbilityIds.length >= totalNodes * 0.25);
add('tree_50', 'Burning', 'Unlock 50% of the skill tree', 'Flame', 500, c => c.state.unlockedAbilityIds.length >= totalNodes * 0.5);
add('tree_75', 'Blazing', 'Unlock 75% of the skill tree', 'Sun', 1000, c => c.state.unlockedAbilityIds.length >= totalNodes * 0.75);
add('tree_100', 'Perfect Form', 'Unlock 100% of the skill tree', 'Star', 2500, c => c.state.unlockedAbilityIds.length >= totalNodes);

// 4. POWERS (v1 id)
const abilityKeys = ['fireBlastLevel', 'iceNovaLevel', 'thunderChainLevel', 'homingMissileLevel', 'fireflyLevel', 'nebulaTrailLevel',
    'singularityLevel', 'superDashLevel', 'solarFlareLevel', 'titanShieldLevel', 'whiteHoleLevel'];
add('unlock_all_abilities', 'Arsenal Complete', 'Unlock at least level 1 of every power', 'Layers', 1000, c => abilityKeys.every(k => ((c.player as any)[k] ?? 0) >= 1));

// 5. MATTER (v1 ids)
add('matter_100k', 'Matter Weaver', 'Hold 100,000 matter at once', 'Atom', 1000, c => c.state.matter >= 100000);
add('matter_1m', 'Void Tycoon', 'Hold 1,000,000 matter at once', 'Atom', 5000, c => c.state.matter >= 1000000);
add('matter_10m', 'Singularity', 'Hold 10,000,000 matter at once', 'Orbit', 25000, c => c.state.matter >= 10000000);

// 6. MATURITY (v1 ids)
add('final_phrase', 'Enlightenment', `Reach wave ${MAX_WAVE}`, 'MessageSquare', 2500, c => c.state.maxWaveReached >= MAX_WAVE);
add('final_maturity', 'The Omega Sun', 'Reach the final maturity rank', 'Sun', 5000, c => (c.state.maxMaturityAchieved || 0) >= MATURITY_LEVELS.length - 1);

// 7. LIFETIME (v2, stats)
add('first_hundred', 'First Light', 'Kill 100 entities', 'Sparkles', 100, c => c.stats.kills >= 100);
add('kills_10k', 'Entropy Reversed', 'Kill 10,000 entities', 'Skull', 2500, c => c.stats.kills >= 10000);
add('streak_50', 'Unbroken', 'Reach a 50 kill streak', 'Activity', 750, c => c.stats.bestStreak >= 50);
add('discoverer', 'Cartographer', 'Make 20 discoveries (relics, shrines, landmarks, events)', 'Compass', 1000, c => totalDiscoveries(c.stats) >= 20);
add('hive_slayer', 'Broodbreaker', 'Defeat the Hive Mind', 'Bug', 250, c => c.state.defeatedBosses.includes('hive_mind'));
add('all_bosses', 'Six Seals', 'Defeat every boss at least once', 'Hexagon', 5000, c => MAIN_BOSS_IDS.every(id => (c.stats.bossKills[id] ?? 0) >= 1));

// 8. BOSS MECHANICS (v2, feats from logic/BossFeats.ts)
add('eclipse_untouched', 'Eye of the Storm', 'Beat Crimson Eclipse without touching a laser', 'Sunrise', 2000, c => !!c.stats.feats['crimson_eclipse:no_laser']);
add('titan_untouched', 'Light Feet', 'Beat Entropy Titan without touching a rock', 'Mountain', 2000, c => !!c.stats.feats['entropy_titan:no_rock']);
add('flawless', 'Untouchable', 'Beat any boss without taking a hit', 'Gem', 2500, c => hasFeat(c.stats, 'flawless'));
add('speedrunner', 'Flash Point', 'Beat any boss in under 60 seconds', 'Timer', 1500, c => hasFeat(c.stats, 'fast'));
add('outlasted', 'Patience of Light', 'Beat a boss after it enraged', 'Hourglass', 1500, c => hasFeat(c.stats, 'enraged'));

export const ACHIEVEMENT_BY_ID: Record<string, Achievement> = Object.fromEntries(ACHIEVEMENTS.map(a => [a.id, a]));

/** Ids not yet unlocked whose condition is now true. */
export const checkAchievements = (state: GameState, stats: PlayerStats, currentWave: number, sessionStartWave: number): string[] => {
    const out: string[] = [];
    for (const ach of ACHIEVEMENTS) {
        if (state.unlockedAchievementIds.includes(ach.id)) continue;
        try { if (ach.condition(state, stats, currentWave, sessionStartWave)) out.push(ach.id); } catch { /* a broken check never blocks the game */ }
    }
    return out;
};

/** Total matter reward for a set of ids. */
export const achievementReward = (ids: string[]): number => ids.reduce((n, id) => n + (ACHIEVEMENT_BY_ID[id]?.reward ?? 0), 0);
