
import { EnemyDef } from './components/game/types';
import { bossIndexOf, isEndlessWave, endlessBossIndex } from './components/game/Constants';
import { ParticleType } from './components/game/types';

export const BOSSES: EnemyDef[] = [
    {
        id: 'hive_mind',
        name: 'THE HIVE MIND',
        description: 'A pulsating organic mass that spawns swarms and spits acid.',
        baseHp: 6000,   // (2C) TTK target 60–120 s with a chapter-1 tree (~60–100 effective DPS); bosses use baseHp only (Logic.ts:87)
        hpScaling: 500,
        baseSpeed: 1.5,
        size: 70,
        color: '#ca8a04', // yellow-700
        glowColor: '#fde047',
        behavior: 'BOSS_WARDEN', // Uses custom logic in BossLogic based on ID
        visualType: 'HIVE',
        spawnWeight: 0,
        minWave: 10,
        essenceReward: 2000,
        particleEffect: ParticleType.SMOKE,
        addTable: ['e1', 'e2', 'e3', 'e13'], // (2B) larvae, mites, crabs, a Hive Mother
        hazard: { kind: 'acid', everySec: 9, max: 12, radius: 120, damage: 2, color: '#a3e635' } // (2C) acid pools pile up
    },
    {
        id: 'void_warden',
        name: 'THE VOID WARDEN',
        description: 'A chaotic construct that ricochets around the arena, leaving toxic nebulas in its wake.',
        baseHp: 12000,  // (2C) chapter-2 tree ≈ 150–230 DPS → 60–95 s
        hpScaling: 1000,
        baseSpeed: 12.0, 
        size: 80,
        color: '#4c1d95', 
        glowColor: '#a78bfa',
        behavior: 'BOSS_WARDEN', 
        visualType: 'WARDEN',
        spawnWeight: 0,
        minWave: 20,
        essenceReward: 10000,
        particleEffect: ParticleType.BOSS_AURA,
        addTable: ['e6', 'e9', 'e12', 'e15'],
        hazard: { kind: 'nebula', everySec: 10, max: 8, radius: 150, damage: 2, color: '#10b981' } // (2C) toxic nebulas (drift in P3)
    },
    {
        id: 'crimson_eclipse',
        name: 'CRIMSON ECLIPSE',
        description: 'A corrupted star that burns everything with solar lasers.',
        baseHp: 20000,  // (2C) chapter-3 tree ≈ 250–400 DPS → 60–95 s (beams keep you out of aura range ~40 % of the time)
        hpScaling: 1500,
        baseSpeed: 3.0, 
        size: 90,
        color: '#7f1d1d', 
        glowColor: '#ef4444', 
        behavior: 'BOSS_GRAVITY', // Custom ID logic
        visualType: 'ECLIPSE',
        spawnWeight: 0,
        minWave: 30,
        essenceReward: 16000,
        particleEffect: ParticleType.FIRE,
        addTable: ['e18', 'e20', 'e22', 'e24'],
        hazard: { kind: 'flare', everySec: 8, max: 10, radius: 140, damage: 3, color: '#fbbf24' } // (2C) solar flares burn the floor
    },
    {
        id: 'neutron_star',
        name: 'COLLAPSING NEUTRON',
        description: 'A dying star with intense gravitational pull that distorts space.',
        baseHp: 20000,  // (2D) chapter-4 tree ≈ 400–550 DPS → headless 84 s at 480 DPS (pull keeps you in aura range)
        hpScaling: 2000,
        baseSpeed: 3.0, 
        size: 100,
        color: '#0f172a', 
        glowColor: '#38bdf8', 
        behavior: 'BOSS_GRAVITY',
        visualType: 'NEUTRON',
        spawnWeight: 0,
        minWave: 40,
        essenceReward: 30000,
        particleEffect: ParticleType.ICE,
        hazard: { kind: 'beam', everySec: 14, max: 6, radius: 18, damage: 3, color: '#f472b6' } // (2C) static lasers cut the arena into lanes
    },
    {
        id: 'entropy_titan',
        name: 'ENTROPY TITAN',
        description: 'A colossal mechanical giant that smashes reality.',
        baseHp: 24000,  // (2D) chapter-5 tree ≈ 500–650 DPS → 60–90 s; rocks + shrink cost ~25 % uptime
        hpScaling: 5000,
        baseSpeed: 4.0, 
        size: 120,
        color: '#1a2e05', 
        glowColor: '#84cc16', 
        behavior: 'BOSS_WARDEN',
        visualType: 'TITAN',
        spawnWeight: 0,
        minWave: 50,
        essenceReward: 50000,
        particleEffect: ParticleType.THUNDER,
        addTable: ['e22', 'e22', 'e20'], // (2D) Iron Clads march in (one Sentinel for variety)
        hazard: { kind: 'rubble', everySec: 9, max: 12, radius: 110, damage: 0, color: '#818cf8' } // (2C) rubble mud: 90 % slow, dash through
    },
    {
        id: 'darkness',
        name: 'DARKNESS',
        description: 'The end of all things. A consuming void that devours light.',
        baseHp: 30000,  // (2D) chapter-6 tree ≈ 600–750 DPS → 70–100 s; Darkness kites at 450 px, Doppelganger steals aim
        hpScaling: 10000,
        baseSpeed: 3, 
        size: 150,
        color: '#000000', 
        glowColor: '#ffffff', 
        behavior: 'BOSS_GRAVITY', 
        visualType: 'DARKNESS', 
        spawnWeight: 0,
        minWave: 60,
        essenceReward: 200000,
        particleEffect: ParticleType.VOID,
        hazard: { kind: 'void', everySec: 10, max: 10, radius: 120, damage: 3, color: '#000000' } // (2C) void mines: pull + burn
    }
];

export const getBossForWave = (wave: number): EnemyDef => isEndlessWave(wave) ? BOSSES[endlessBossIndex(wave)] : BOSSES[bossIndexOf(wave)]; // (9A) endless cycles bosses 1–5

// (2C) Boss-only minions: spawnWeight 0 so the director never rolls them; boss scripts spawn them via spawnEnemy(..., def).
export const BOSS_MINIONS: Record<string, EnemyDef> = {
    // Hive Mind P1: stationary larva spawner. Kill it and the Hive loses a spawn source (respawns on enrage).
    hive_node: {
        id: 'hive_node', name: 'Brood Node', description: 'A pulsing egg sac rooted to the arena floor. Spawns larvae until destroyed.',
        baseHp: 120, hpScaling: 25, baseSpeed: 0, size: 26, color: '#4d7c0f', glowColor: '#a3e635',
        behavior: 'SPAWNER', visualType: 'CRAB', spawnWeight: 0, minWave: 10, essenceReward: 40, particleEffect: ParticleType.SMOKE,
    },
    // (2D) Darkness P2: your shadow. MIMIC behaviour copies your movement vector; tougher than the wave-38 Doppelganger.
    doppelganger: {
        id: 'doppelganger', name: 'Shadow of the Spark', description: 'Your own silhouette, poured from the dark. It moves when you move.',
        baseHp: 900, hpScaling: 0, baseSpeed: 4.5, size: 16, color: '#09090b', glowColor: '#a855f7',
        behavior: 'MIMIC', visualType: 'SIMPLE', spawnWeight: 0, minWave: 60, essenceReward: 500, particleEffect: ParticleType.VOID,
    },
};
