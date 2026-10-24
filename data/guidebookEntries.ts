/* PATCH: STEP-6 progressive-guidebook — Entry catalogue + derivation logic.
 *
 * The Cosmic Manual is now progressive: entries stay locked until the player
 * has actually experienced the mechanic in-game. Each entry declares an
 * `isDiscovered(ctx)` predicate that reads from existing GameState / PlayerStats
 * fields, so we DON'T need to sprinkle setState triggers across the render loop
 * (which would tank perf). New flag-based entries can still be pushed to
 * `gameState.discoveredGuideEntries` from any logic file that already touches
 * React state (App.tsx callbacks, secret unlocks, mission completions, etc.).
 */
import { GameState, PlayerStats } from '../types';

export type GuideCategory = 'directives' | 'evolution' | 'lore' | 'places';

export interface GuideEntryContext {
    gameState: GameState;
    stats: PlayerStats | null;
    maxWaveReached: number;
    /** Discovered flag ids pushed manually from App.tsx callbacks. */
    discoveredIds: string[];
    /** Convenience: derived from currentRunPath / visitedNodeIds. */
    hasVisitedStarChart: boolean;
    hasClearedTreasure: boolean;
    hasReachedEvolutionMatrix: boolean;
}

export interface GuideEntry {
    id: string;
    category: GuideCategory;
    icon: string;                 // lucide icon key, resolved in modal
    title: string;
    /** One or two-line summary shown once unlocked. */
    body: string;
    /** Hint shown while still locked (spoiler-safe teaser). */
    lockedHint: string;
    isDiscovered: (ctx: GuideEntryContext) => boolean;
}

/* Small helpers to keep predicates readable. */
const hasNode  = (ctx: GuideEntryContext, id: string) => ctx.gameState.unlockedAbilityIds?.includes(id) ?? false;
const hasFlag  = (ctx: GuideEntryContext, id: string) => ctx.discoveredIds.includes(id);
const hasSpecial = (ctx: GuideEntryContext, key: keyof PlayerStats) => !!(ctx.stats && (ctx.stats as any)[key]);
const hasSecret = (ctx: GuideEntryContext, id: string) => ctx.gameState.discoveredSecretIds?.includes(id) ?? false;
const hasMission = (ctx: GuideEntryContext, id: string) => ctx.gameState.completedSpecialMissions?.includes(id) ?? false;
const abilityLevel = (ctx: GuideEntryContext, key: keyof PlayerStats): number => {
    if (!ctx.stats) return 0;
    const v = (ctx.stats as any)[key];
    return typeof v === 'number' ? v : 0;
};

export const GUIDE_ENTRIES: GuideEntry[] = [
    /* ============ DIRECTIVES (core mechanics) ============ */
    {
        id: 'motility',
        category: 'directives',
        icon: 'Compass',
        title: '1. Motility',
        body: 'Glide through the void with WASD or the on-screen stick. Sustained motion is your first shield against Void projectiles.',
        lockedHint: 'Begin your first run. The spark must learn to move.',
        isDiscovered: (ctx) => ctx.maxWaveReached >= 1 || hasFlag(ctx, 'motility'),
    },
    {
        id: 'aim_shoot',
        category: 'directives',
        icon: 'Crosshair',
        title: '2. Aim & Release',
        body: 'Point with your cursor or the right stick. Holding fire drains focus but keeps pressure on the Void.',
        lockedHint: 'Fire your first shot to record this directive.',
        isDiscovered: (ctx) => hasFlag(ctx, 'aim_shoot') || ctx.maxWaveReached >= 1,
    },
    {
        id: 'dash_basic',
        category: 'directives',
        icon: 'Zap',
        title: '3. Phase Dash',
        body: 'Tap dash to phase through incoming fire. A short cooldown follows — time your escape.',
        lockedHint: 'Perform your first dash to log the technique.',
        isDiscovered: (ctx) => hasFlag(ctx, 'dash_basic') || ctx.maxWaveReached >= 1,
    },
    {
        id: 'essence_pickup',
        category: 'directives',
        icon: 'Sparkles',
        title: 'Essence Gathering',
        body: 'Fallen enemies leave essence motes. Drift close to absorb them — essence fuels your Evolution Matrix upgrades.',
        lockedHint: 'Collect your first essence mote in combat.',
        isDiscovered: (ctx) => ctx.gameState.matter > 0 || hasFlag(ctx, 'essence_pickup'),
    },
    {
        id: 'star_chart',
        category: 'directives',
        icon: 'Compass',
        title: 'The Star Chart',
        body: 'Between waves, the void unfolds a map. Choose which threads to walk — combat, missions, secrets, or treasure caches.',
        lockedHint: 'Open the Star Chart at least once to log its layout.',
        isDiscovered: (ctx) => ctx.hasVisitedStarChart || (ctx.gameState.visitedNodeIds?.length ?? 0) > 0 || hasFlag(ctx, 'star_chart'),
    },
    {
        id: 'treasure_nodes',
        category: 'directives',
        icon: 'Gem',
        title: 'Essence Caches',
        body: 'Shimmering side-nodes host quick minigames. Clearing one grants essence scaled to the surrounding wave tier — a rich detour.',
        lockedHint: 'A treasure cache marker will appear on the Star Chart. Clear one to record this entry.',
        isDiscovered: (ctx) => ctx.hasClearedTreasure || (ctx.gameState.treasureNodesCompleted ?? 0) > 0 || hasFlag(ctx, 'treasure_nodes'),
    },
    {
        id: 'event_rifts',
        category: 'directives',
        icon: 'Target',
        title: 'Special Mission Rifts',
        body: 'Anomalous distortion coordinates scattered across the Star Chart. These tactical rifts challenge you with specific objectives (Key Collection, Zone Control, Machine Disruption) and reward you with Special Power Awakenings.',
        lockedHint: 'Encounter a Special Mission Rift on the Star Chart to log this directive.',
        isDiscovered: (ctx) => (ctx.gameState.completedSpecialMissions?.length ?? 0) > 0 || (ctx.gameState.visitedNodeIds?.some(id => id.startsWith('mission_')) ?? false) || hasFlag(ctx, 'event_rifts'),
    },
    {
        id: 'vault_keys',
        category: 'directives',
        icon: 'BookOpen',
        title: 'Vault Keys & Secret Vaults',
        body: 'Vault Keys earned from Special Mission Rifts unlock ancient hidden chambers (Forgotten Vault, Hidden Garden, Radiant Bastion, Momentum Shrine) on the Star Chart.',
        lockedHint: 'Acquire your first Vault Key to record this directive.',
        isDiscovered: (ctx) => (ctx.gameState.specialMissionKeys ?? 0) > 0 || (ctx.gameState.discoveredSecretIds?.length ?? 0) > 0 || hasFlag(ctx, 'vault_keys'),
    },
    {
        id: 'chaos_events',
        category: 'directives',
        icon: 'Zap',
        title: 'Chaos Surges',
        body: 'Unstable fluctuations in the cosmic continuum. During combat, reality may temporarily fracture — enraging enemies, sapping health, or altering projectile physics until reality stabilizes.',
        lockedHint: 'Experience your first Chaos Surge event in combat.',
        isDiscovered: (ctx) => hasFlag(ctx, 'chaos_event') || ctx.maxWaveReached >= 5,
    },
    {
        id: 'pause_menu',
        category: 'directives',
        icon: 'Pause',
        title: 'The Constellation of Virtues',
        body: 'Pause mid-run to reach the Evolution Matrix — your skill constellation. Spend essence there to open new nodes.',
        lockedHint: 'Pause the game once mid-run to record this directive.',
        isDiscovered: (ctx) => ctx.hasReachedEvolutionMatrix || (ctx.gameState.unlockedAbilityIds?.length ?? 0) > 1 || hasFlag(ctx, 'pause_menu'),
    },

    /* ============ EVOLUTION (abilities) ============ */
    {
        id: 'evo_fireBlast',
        category: 'evolution',
        icon: 'Flame',
        title: 'Fire Blast',
        body: 'A radial ember burst that scorches nearby foes. Levels the node twice for wider reach and a triple projectile release.',
        lockedHint: 'Unlock the Fire Blast node in the Evolution Matrix.',
        isDiscovered: (ctx) => abilityLevel(ctx, 'fireBlastLevel') > 0,
    },
    {
        id: 'evo_iceNova',
        category: 'evolution',
        icon: 'Snowflake',
        title: 'Ice Nova',
        body: 'A freezing shockwave that slows the Void. Certain missions expand its radius further.',
        lockedHint: 'Unlock the Ice Nova node in the Evolution Matrix.',
        isDiscovered: (ctx) => abilityLevel(ctx, 'iceNovaLevel') > 0,
    },
    {
        id: 'evo_thunderChain',
        category: 'evolution',
        icon: 'Zap',
        title: 'Thunder Chain',
        body: 'Charged arcs leap between adjacent enemies. Secret upgrades let the arc bounce further.',
        lockedHint: 'Unlock the Thunder Chain node in the Evolution Matrix.',
        isDiscovered: (ctx) => abilityLevel(ctx, 'thunderChainLevel') > 0,
    },
    {
        id: 'evo_homingMissile',
        category: 'evolution',
        icon: 'Target',
        title: 'Homing Missile',
        body: 'Guided projectiles that track the nearest hostile signature.',
        lockedHint: 'Unlock the Homing Missile node in the Evolution Matrix.',
        isDiscovered: (ctx) => abilityLevel(ctx, 'homingMissileLevel') > 0,
    },
    {
        id: 'evo_firefly',
        category: 'evolution',
        icon: 'Sparkles',
        title: 'Fireflies',
        body: 'Small orbiting sparks that damage anything they touch. Higher levels spawn more of them.',
        lockedHint: 'Unlock the Firefly node in the Evolution Matrix.',
        isDiscovered: (ctx) => abilityLevel(ctx, 'fireflyLevel') > 0,
    },
    {
        id: 'evo_nebulaTrail',
        category: 'evolution',
        icon: 'Wind',
        title: 'Nebula Trail',
        body: 'Leaves a damaging cloud of light in your wake as you move.',
        lockedHint: 'Unlock the Nebula Trail node in the Evolution Matrix.',
        isDiscovered: (ctx) => abilityLevel(ctx, 'nebulaTrailLevel') > 0,
    },
    {
        id: 'evo_singularity',
        category: 'evolution',
        icon: 'CircleDot',
        title: 'Singularity',
        body: 'Drops a gravity well that pulls foes together for an easy sweep.',
        lockedHint: 'Unlock the Singularity node in the Evolution Matrix.',
        isDiscovered: (ctx) => abilityLevel(ctx, 'singularityLevel') > 0,
    },
    {
        id: 'evo_superDash',
        category: 'evolution',
        icon: 'FastForward',
        title: 'Super Dash',
        body: 'Extends dash range and damages enemies phased through.',
        lockedHint: 'Unlock the Super Dash node in the Evolution Matrix.',
        isDiscovered: (ctx) => abilityLevel(ctx, 'superDashLevel') > 0,
    },
    {
        id: 'evo_solarFlare',
        category: 'evolution',
        icon: 'Sun',
        title: 'Solar Flare',
        body: 'Screen-wide burst of radiance. High damage, long cooldown.',
        lockedHint: 'Unlock the Solar Flare node in the Evolution Matrix.',
        isDiscovered: (ctx) => abilityLevel(ctx, 'solarFlareLevel') > 0,
    },
    {
        id: 'evo_titanShield',
        category: 'evolution',
        icon: 'Shield',
        title: 'Titan Shield',
        body: 'Absorbs one lethal blow, then recharges after a delay.',
        lockedHint: 'Unlock the Titan Shield node in the Evolution Matrix.',
        isDiscovered: (ctx) => abilityLevel(ctx, 'titanShieldLevel') > 0,
    },
    {
        id: 'evo_whiteHole',
        category: 'evolution',
        icon: 'CircleDashed',
        title: 'White Hole',
        body: 'Reverses gravity — repels every hostile object in reach.',
        lockedHint: 'Unlock the White Hole node in the Evolution Matrix.',
        isDiscovered: (ctx) => abilityLevel(ctx, 'whiteHoleLevel') > 0,
    },
    {
        id: 'evo_luxBlades',
        category: 'evolution',
        icon: 'Swords',
        title: 'Lux Blades',
        body: 'Radiant orbital blades that shred anything in close orbit.',
        lockedHint: 'Unlock the Lux Blades node in the Evolution Matrix.',
        isDiscovered: (ctx) => abilityLevel(ctx, 'luxBladesLevel') > 0,
    },
    {
        id: 'evo_repulsionField',
        category: 'evolution',
        icon: 'CircleOff',
        title: 'Repulsion Field',
        body: 'A pulse that shoves back Void projectiles and small enemies.',
        lockedHint: 'Unlock the Repulsion Field node in the Evolution Matrix.',
        isDiscovered: (ctx) => abilityLevel(ctx, 'repulsionFieldLevel') > 0,
    },
    {
        id: 'evo_plasmaWhip',
        category: 'evolution',
        icon: 'Waves',
        title: 'Plasma Whip',
        body: 'A short-range plasma tether that lashes enemies for burst damage.',
        lockedHint: 'Unlock the Plasma Whip node in the Evolution Matrix.',
        isDiscovered: (ctx) => abilityLevel(ctx, 'plasmaWhipLevel') > 0,
    },

    /* ============ SPECIAL POWER AWAKENINGS ============ */
    {
        id: 'awk_dashDamage',
        category: 'evolution',
        icon: 'Flame',
        title: 'Awakening: Searing Trail',
        body: 'Through the vast silence of the void, your motion leaves a burning flame. Your dash leaves a trail of scorching cosmic radiance that disintegrates void entities.',
        lockedHint: 'Complete the Searing Trail special mission rift to awaken this power.',
        isDiscovered: (ctx) => hasSpecial(ctx, 'special_dashDamage') || hasMission(ctx, 'special_dashDamage') || hasFlag(ctx, 'special_dashDamage'),
    },
    {
        id: 'awk_fireBlastCount',
        category: 'evolution',
        icon: 'Flame',
        title: 'Awakening: Thermal Cascade',
        body: 'A solitary ember cannot illuminate the abyss, but a supernova shatters it. Plasma bursts multiply into a devastating arc of stellar fire.',
        lockedHint: 'Complete the Thermal Cascade special mission rift to awaken this power.',
        isDiscovered: (ctx) => hasSpecial(ctx, 'special_fireBlastCount') || hasMission(ctx, 'special_fireBlastCount') || hasFlag(ctx, 'special_fireBlastCount'),
    },
    {
        id: 'awk_thunderBounce',
        category: 'evolution',
        icon: 'Zap',
        title: 'Awakening: Arc Resonance',
        body: 'An invisible web of light binds all stars together across eternity. Lightning bolts leap fluidly across multiple targets in the dark.',
        lockedHint: 'Complete the Arc Resonance special mission rift to awaken this power.',
        isDiscovered: (ctx) => hasSpecial(ctx, 'special_thunderBounce') || hasMission(ctx, 'special_thunderBounce') || hasFlag(ctx, 'special_thunderBounce'),
    },
    {
        id: 'awk_iceNovaSize',
        category: 'evolution',
        icon: 'Snowflake',
        title: 'Awakening: Stellar Absolute',
        body: 'Absolute stillness can freeze even the relentless expansion of chaos. The freezing nova expands across a vast radius to immobilize the void.',
        lockedHint: 'Complete the Stellar Absolute special mission rift to awaken this power.',
        isDiscovered: (ctx) => hasSpecial(ctx, 'special_iceNovaSize') || hasMission(ctx, 'special_iceNovaSize') || hasFlag(ctx, 'special_iceNovaSize'),
    },
    {
        id: 'awk_orbitalSpeed',
        category: 'evolution',
        icon: 'Swords',
        title: 'Awakening: Celestial Gyre',
        body: 'The celestial spheres rotate in eternal, inviolable harmony. Orbital barriers spin at transcendent velocities, slicing through all who draw near.',
        lockedHint: 'Complete the Celestial Gyre special mission rift to awaken this power.',
        isDiscovered: (ctx) => hasSpecial(ctx, 'special_orbitalSpeed') || hasMission(ctx, 'special_orbitalSpeed') || hasFlag(ctx, 'special_orbitalSpeed'),
    },
    {
        id: 'awk_singularityPull',
        category: 'evolution',
        icon: 'CircleDot',
        title: 'Awakening: Primal Gravity',
        body: 'Even darkness cannot resist the gravitational pull toward the Light. Black holes drag all nearby anomalies helplessly into their crushing core.',
        lockedHint: 'Complete the Primal Gravity special mission rift to awaken this power.',
        isDiscovered: (ctx) => hasSpecial(ctx, 'special_singularityPull') || hasMission(ctx, 'special_singularityPull') || hasFlag(ctx, 'special_singularityPull'),
    },
    {
        id: 'awk_lightPurge',
        category: 'evolution',
        icon: 'Sun',
        title: 'Awakening: Ray of Judgment',
        body: 'When the eclipse reaches its apex, the primordial ray pierces the night. Spend concentrated light energy to unleash devastating solar beams that eradicate boss anomalies.',
        lockedHint: 'Complete the Ray of Judgment special mission or Radiant Bastion trial to awaken this power.',
        isDiscovered: (ctx) => hasSpecial(ctx, 'special_lightPurge') || hasMission(ctx, 'special_lightPurge') || hasMission(ctx, 'secret_3') || hasFlag(ctx, 'special_lightPurge'),
    },
    {
        id: 'awk_dashOnKill',
        category: 'evolution',
        icon: 'RotateCcw',
        title: 'Awakening: Eternal Impulse',
        body: 'With every shadow banished, the rhythm of your journey grows unbroken. Destroying a void entity instantly restores spatial dash charges.',
        lockedHint: 'Complete the Eternal Impulse special mission or Momentum Shrine trial to awaken this power.',
        isDiscovered: (ctx) => hasSpecial(ctx, 'special_dashOnKill') || hasMission(ctx, 'special_dashOnKill') || hasMission(ctx, 'secret_4') || hasFlag(ctx, 'special_dashOnKill'),
    },

    /* ============ LORE (secrets + regions + bosses) ============ */
    {
        id: 'lore_secret_1',
        category: 'lore',
        icon: 'BookOpen',
        title: 'Forgotten Vault',
        body: 'A hidden cache of explosive potential. Its orbital gears now spin faster around any spark that survived.',
        lockedHint: 'Reveal secret_1 by lighting its beacon on the Star Chart.',
        isDiscovered: (ctx) => hasSecret(ctx, 'secret_1') || hasMission(ctx, 'secret_1'),
    },
    {
        id: 'lore_secret_2',
        category: 'lore',
        icon: 'BookOpen',
        title: 'Hidden Garden',
        body: 'A loop in time, holding secrets from a past that never was. Grants a stronger pull to your Singularity.',
        lockedHint: 'Reveal secret_2 by lighting its beacon on the Star Chart.',
        isDiscovered: (ctx) => hasSecret(ctx, 'secret_2') || hasMission(ctx, 'secret_2'),
    },
    {
        id: 'lore_secret_3',
        category: 'lore',
        icon: 'BookOpen',
        title: 'Radiant Bastion',
        body: 'A crucible where light was once weaponised. Its trial re-attunes you to the Light Purge shockwave.',
        lockedHint: 'Reveal secret_3 by lighting its beacon on the Star Chart.',
        isDiscovered: (ctx) => hasSecret(ctx, 'secret_3') || hasMission(ctx, 'secret_3'),
    },
    {
        id: 'lore_secret_4',
        category: 'lore',
        icon: 'BookOpen',
        title: 'Momentum Shrine',
        body: 'A shrine to endless motion. Those who take a life mid-dash inherit its remaining momentum.',
        lockedHint: 'Reveal secret_4 by lighting its beacon on the Star Chart.',
        isDiscovered: (ctx) => hasSecret(ctx, 'secret_4') || hasMission(ctx, 'secret_4'),
    },
    {
        id: 'lore_boss_first',
        category: 'lore',
        icon: 'Skull',
        title: 'First Herald',
        body: 'The first colossal manifestation of the Void. Its shape hints at the shapes to come.',
        lockedHint: 'Defeat your first boss to record this entry.',
        isDiscovered: (ctx) => (ctx.gameState.defeatedBosses?.length ?? 0) >= 1,
    },
    {
        id: 'lore_deep_void',
        category: 'lore',
        icon: 'Skull',
        title: 'The Deep Void',
        body: 'Past wave 25 the Void changes character — quicker, denser, less merciful. You have proven you can survive it.',
        lockedHint: 'Reach wave 25 to unfold this entry.',
        isDiscovered: (ctx) => ctx.maxWaveReached >= 25,
    },
    {
        id: 'lore_the_rift',
        category: 'lore',
        icon: 'Skull',
        title: 'The Rift',
        body: 'The end of the map. Blinding light and absolute dark braided into a single wound in the cosmos.',
        lockedHint: 'Complete a full map run to log this final region.',
        isDiscovered: (ctx) => (ctx.gameState.visitedNodeIds ?? []).includes('map_6'),
    },

    /* ============ PLACES & EVENTS (regions + events + secrets + treasure) ============ */
    {
        id: 'place_origin_fields',
        category: 'places',
        icon: 'Compass',
        title: 'Origin Fields',
        body: 'The place where Light appeared. A dim ember flickers in the endless dark, yearning to grow.',
        lockedHint: 'Travel to Origin Fields on the Star Chart.',
        isDiscovered: (ctx) => ctx.hasVisitedStarChart || (ctx.gameState.visitedNodeIds?.includes('map_1') ?? false) || ctx.maxWaveReached >= 1,
    },
    {
        id: 'place_whispering_grove',
        category: 'places',
        icon: 'Compass',
        title: 'Whispering Grove',
        body: 'Echoes of forgotten existence. The Void murmurs here, trying to lull the light back to sleep.',
        lockedHint: 'Reach Whispering Grove on the Star Chart.',
        isDiscovered: (ctx) => (ctx.gameState.visitedNodeIds?.includes('map_2') ?? false) || ctx.maxWaveReached >= 10,
    },
    {
        id: 'place_crystal_depths',
        category: 'places',
        icon: 'Compass',
        title: 'Crystal Depths',
        body: 'Beautiful, but hides danger. A massive threshold woven from stellar dust and forgotten gravity.',
        lockedHint: 'Reach Crystal Depths on the Star Chart.',
        isDiscovered: (ctx) => (ctx.gameState.visitedNodeIds?.includes('map_3') ?? false) || ctx.maxWaveReached >= 20,
    },
    {
        id: 'place_abandoned_machinery',
        category: 'places',
        icon: 'Compass',
        title: 'Abandoned Machinery',
        body: 'Lost technological wonders hum with ancient, dangerous energy.',
        lockedHint: 'Reach Abandoned Machinery on the Star Chart.',
        isDiscovered: (ctx) => (ctx.gameState.visitedNodeIds?.includes('map_4') ?? false) || ctx.maxWaveReached >= 30,
    },
    {
        id: 'place_void_wastes',
        category: 'places',
        icon: 'Compass',
        title: 'Void Wastes',
        body: 'The Darkness leaks here. Falling eternally through a beautiful, deadly silence.',
        lockedHint: 'Reach Void Wastes on the Star Chart.',
        isDiscovered: (ctx) => (ctx.gameState.visitedNodeIds?.includes('map_5') ?? false) || ctx.maxWaveReached >= 40,
    },
    {
        id: 'place_seam_of_void',
        category: 'places',
        icon: 'Compass',
        title: 'Seam of the Void',
        body: 'A tear in the cosmic fabric where terrifying entities cross over.',
        lockedHint: 'Reach Seam of the Void on the Star Chart.',
        isDiscovered: (ctx) => (ctx.gameState.visitedNodeIds?.includes('map_6') ?? false) || ctx.maxWaveReached >= 50,
    },
    {
        id: 'place_shattered_core',
        category: 'places',
        icon: 'Target',
        title: 'Event: The Shattered Core',
        body: 'The heart cracked by conflict. Time and space distort. Reality itself is your enemy here.',
        lockedHint: 'Discover The Shattered Core event rift on the Star Chart.',
        isDiscovered: (ctx) => (ctx.gameState.visitedNodeIds?.includes('mission_1') ?? false) || hasMission(ctx, 'mission_1') || hasSpecial(ctx, 'special_dashDamage'),
    },
    {
        id: 'place_echoing_cavern',
        category: 'places',
        icon: 'Target',
        title: 'Event: Echoing Cavern',
        body: 'Your voice is not your own. The point of no return. The dark pulls with impossible strength.',
        lockedHint: 'Discover Echoing Cavern event rift on the Star Chart.',
        isDiscovered: (ctx) => (ctx.gameState.visitedNodeIds?.includes('mission_2') ?? false) || hasMission(ctx, 'mission_2') || hasSpecial(ctx, 'special_fireBlastCount'),
    },
    {
        id: 'place_broken_sanctuary',
        category: 'places',
        icon: 'Target',
        title: 'Event: Broken Sanctuary',
        body: 'A ruined safe haven that failed to protect the light.',
        lockedHint: 'Discover Broken Sanctuary event rift on the Star Chart.',
        isDiscovered: (ctx) => (ctx.gameState.visitedNodeIds?.includes('mission_3') ?? false) || hasMission(ctx, 'mission_3') || hasSpecial(ctx, 'special_thunderBounce'),
    },
    {
        id: 'place_the_rift',
        category: 'places',
        icon: 'Target',
        title: 'Event: The Rift',
        body: 'The final destination. Absolute darkness and blinding light crash together.',
        lockedHint: 'Discover The Rift event rift on the Star Chart.',
        isDiscovered: (ctx) => (ctx.gameState.visitedNodeIds?.includes('mission_4') ?? false) || hasMission(ctx, 'mission_4') || hasSpecial(ctx, 'special_iceNovaSize'),
    },
    {
        id: 'place_forgotten_vault',
        category: 'places',
        icon: 'BookOpen',
        title: 'Secret: Forgotten Vault',
        body: 'A hidden cache of explosive potential. Rare anomalies gestate here.',
        lockedHint: 'Unlock Forgotten Vault with a Vault Key on the Star Chart.',
        isDiscovered: (ctx) => hasSecret(ctx, 'secret_1') || hasMission(ctx, 'secret_1') || (ctx.gameState.visitedNodeIds?.includes('secret_1') ?? false),
    },
    {
        id: 'place_hidden_garden',
        category: 'places',
        icon: 'BookOpen',
        title: 'Secret: Hidden Garden',
        body: 'A loop in time, holding secrets from a past that never was.',
        lockedHint: 'Unlock Hidden Garden with a Vault Key on the Star Chart.',
        isDiscovered: (ctx) => hasSecret(ctx, 'secret_2') || hasMission(ctx, 'secret_2') || (ctx.gameState.visitedNodeIds?.includes('secret_2') ?? false),
    },
    {
        id: 'place_radiant_bastion',
        category: 'places',
        icon: 'BookOpen',
        title: 'Secret: Radiant Bastion',
        body: 'A forgotten crucible where light was once weaponized. Its purging resonance still echoes.',
        lockedHint: 'Unlock Radiant Bastion with a Vault Key on the Star Chart.',
        isDiscovered: (ctx) => hasSecret(ctx, 'secret_3') || hasMission(ctx, 'secret_3') || (ctx.gameState.visitedNodeIds?.includes('secret_3') ?? false),
    },
    {
        id: 'place_momentum_shrine',
        category: 'places',
        icon: 'BookOpen',
        title: 'Secret: Momentum Shrine',
        body: 'A shrine to endless motion. Those who take a life here inherit its remaining momentum.',
        lockedHint: 'Unlock Momentum Shrine with a Vault Key on the Star Chart.',
        isDiscovered: (ctx) => hasSecret(ctx, 'secret_4') || hasMission(ctx, 'secret_4') || (ctx.gameState.visitedNodeIds?.includes('secret_4') ?? false),
    },
    {
        id: 'place_essence_cache',
        category: 'places',
        icon: 'Gem',
        title: 'Essence Cache',
        body: 'A shimmering pocket of raw void-essence, waiting to be harvested by a nimble spark.',
        lockedHint: 'Visit an Essence Cache on the Star Chart.',
        isDiscovered: (ctx) => ctx.hasClearedTreasure || (ctx.gameState.treasureNodesCompleted ?? 0) > 0 || hasFlag(ctx, 'treasure_nodes'),
    },
];

/** Compute which entries are currently discovered given a context. */
export function computeDiscovered(ctx: GuideEntryContext): Set<string> {
    const set = new Set<string>();
    for (const e of GUIDE_ENTRIES) {
        try {
            if (e.isDiscovered(ctx)) set.add(e.id);
        } catch { /* predicate on missing state — treat as locked */ }
    }
    // Manually-flagged entries always merged in.
    for (const id of ctx.discoveredIds) set.add(id);
    return set;
}
