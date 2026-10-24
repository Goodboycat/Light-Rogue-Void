
import { Achievement, GameState, PlayerStats } from '../types';
import { ABILITY_TREE_DATA } from '../data';
import { ENEMIES } from '../enemies';
import { BOSSES } from '../bosses';
import { MATURITY_LEVELS } from './maturity';
import { GUIDE_ENTRIES, computeDiscovered, GuideEntryContext } from './guidebookEntries';

export const ACHIEVEMENTS: Achievement[] = [];

// Helper to add achievements
const add = (id: string, title: string, desc: string, icon: string, check: (s: GameState, p: PlayerStats, w: number, start: number) => boolean) => {
    ACHIEVEMENTS.push({ id, title, description: desc, icon, condition: check });
};

// 1. BOSS & SEMI-BOSS KILLERS (Major Milestones)
add('kill_semi_boss', 'Pylon Destroyer', 'Defeat a Semi-Boss (Void Pylon)', 'Shield', (s) => (s.defeatedBosses || []).some(id => id.startsWith('sb_') || id === 'sb_hunter' || id === 'sb_swarm' || id === 'sb_laser'));
add('kill_boss_1', 'Warden Breaker', 'Defeat the Void Warden', 'Shield', (s) => s.defeatedBosses.includes('void_warden'));
add('kill_boss_2', 'Star Extinguisher', 'Defeat the Collapsing Neutron', 'Zap', (s) => s.defeatedBosses.includes('neutron_star'));
add('kill_boss_3', 'Transcendence', 'Defeat Darkness', 'Crown', (s) => s.defeatedBosses.includes('darkness'));

// HARDCORE ACHIEVEMENTS
add('hardcore_survivor', 'The Immortal', 'Complete the game (Wave 60) without dying (Start Wave 1)', 'Shield', (s, p, w, start) => s.defeatedBosses.includes('darkness') && start === 1);
add('omega_god', 'Absolute Being', 'Defeat Darkness having The Omega Sun title', 'Sun', (s) => s.defeatedBosses.includes('darkness') && s.maxMaturityAchieved >= 79);

// 2. ARCHIVES DISCOVERY
const allEntityIds = new Set([...ENEMIES.map(e => e.id), ...BOSSES.map(e => e.id)]);
const totalEntities = allEntityIds.size;

add('archive_25', 'Observer', `Archive 25% of all Entities`, 'Eye', (s) => (s.seenEnemyIds || []).length >= totalEntities * 0.25);
add('archive_50', 'Analyst', `Archive 50% of all Entities`, 'BookOpen', (s) => (s.seenEnemyIds || []).length >= totalEntities * 0.5);
add('archive_75', 'Researcher', `Archive 75% of all Entities`, 'Search', (s) => (s.seenEnemyIds || []).length >= totalEntities * 0.75);
add('archive_100', 'Void Killer', `Archive 100% of all Entities`, 'Globe', (s) => (s.seenEnemyIds || []).length >= totalEntities);

// 3. SKILL TREE MASTERY
const totalNodes = ABILITY_TREE_DATA.length;
add('tree_25', 'Sparking', `Unlock 25% of the Ability Tree`, 'Zap', (s) => s.unlockedAbilityIds.length >= totalNodes * 0.25);
add('tree_50', 'Burning', `Unlock 50% of the Ability Tree`, 'Flame', (s) => s.unlockedAbilityIds.length >= totalNodes * 0.5);
add('tree_75', 'Blazing', `Unlock 75% of the Ability Tree`, 'Sun', (s) => s.unlockedAbilityIds.length >= totalNodes * 0.75);
add('tree_100', 'Perfect Form', `Unlock 100% of the Ability Tree`, 'Star', (s) => s.unlockedAbilityIds.length >= totalNodes);

// 4. ABILITY & SPECIAL POWER UNLOCKS
const abilities = [
    { k: 'fireBlastLevel', n: 'Fire Blast' },
    { k: 'iceNovaLevel', n: 'Ice Nova' },
    { k: 'thunderChainLevel', n: 'Thunder Chain' },
    { k: 'homingMissileLevel', n: 'Homing Missile' }, 
    { k: 'fireflyLevel', n: 'Fireflies' },           
    { k: 'nebulaTrailLevel', n: 'Nebula Trail' },
    { k: 'singularityLevel', n: 'Singularity' },
    { k: 'superDashLevel', n: 'Super Dash' },         
    { k: 'solarFlareLevel', n: 'Solar Flare' },
    { k: 'titanShieldLevel', n: 'Titan Shield' },
    { k: 'whiteHoleLevel', n: 'White Hole' }
];

add('unlock_all_abilities', 'Arsenal Complete', 'Unlock at least Level 1 of every ability', 'Layers', (s, p) => {
    return abilities.every(ab => (p as any)[ab.k] >= 1);
});

const specialPowerKeys: (keyof PlayerStats)[] = [
    'special_dashDamage',
    'special_fireBlastCount',
    'special_thunderBounce',
    'special_iceNovaSize',
    'special_orbitalSpeed',
    'special_singularityPull',
    'special_lightPurge',
    'special_dashOnKill'
];

add('all_special_powers', 'Cosmic Mastery', 'Gather all 8 special powers from the cosmos', 'Zap', (s, p) => {
    const fromStats = specialPowerKeys.every(k => !!(p as any)[k]);
    const fromMissions = specialPowerKeys.every(k => (s.completedSpecialMissions || []).includes(k as string));
    return fromStats || fromMissions;
});

// 5. MATTER ACCUMULATION
add('matter_100k', 'Matter Weaver', 'Possess 100,000 Dark Matter', 'Atom', (s) => s.matter >= 100000);
add('matter_1m', 'Void Tycoon', 'Possess 1,000,000 Dark Matter', 'Atom', (s) => s.matter >= 1000000);
add('matter_10m', 'Singularity', 'Possess 10,000,000 Dark Matter', 'Orbit', (s) => s.matter >= 10000000);

// 6. MATURITY / LIGHT PHRASES & COSMICBOOK
add('final_phrase', 'Enlightenment', 'Reach the final Light Phrase', 'MessageSquare', (s) => s.maxWaveReached >= 60);

const finalMaturityIndex = MATURITY_LEVELS.length - 1;
add('final_maturity', 'The Omega Sun', 'Reach the final Maturity Rank', 'Sun', (s) => (s.maxMaturityAchieved || 0) >= finalMaturityIndex);

add('complete_cosmicbook', 'Omniscient Chronicler', 'Discover every entry in the Cosmicbook', 'BookOpen', (s, p) => {
    const ctx: GuideEntryContext = {
        gameState: s,
        stats: p,
        maxWaveReached: s.maxWaveReached || 1,
        discoveredIds: s.discoveredGuideEntries || [],
        hasVisitedStarChart: (s.visitedNodeIds?.length ?? 0) > 0,
        hasClearedTreasure: (s.treasureNodesCompleted ?? 0) > 0,
        hasReachedEvolutionMatrix: (s.unlockedAbilityIds?.length ?? 0) > 0
    };
    return computeDiscovered(ctx).size >= GUIDE_ENTRIES.length;
});

export const checkAchievements = (state: GameState, stats: PlayerStats, currentWave: number, sessionStartWave: number): string[] => {
    const newUnlocks: string[] = [];
    ACHIEVEMENTS.forEach(ach => {
        if (!state.unlockedAchievementIds.includes(ach.id)) {
            if (ach.condition(state, stats, currentWave, sessionStartWave)) {
                newUnlocks.push(ach.id);
            }
        }
    });
    return newUnlocks;
};
