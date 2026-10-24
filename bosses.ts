
import { EnemyDef } from './components/game/types';
import { ParticleType } from './components/game/types';

export const BOSSES: EnemyDef[] = [
    {
        id: 'hive_mind',
        name: 'THE HIVE MIND',
        description: 'A pulsating organic mass that spawns swarms and spits acid.',
        baseHp: 2000,
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
        particleEffect: ParticleType.SMOKE
    },
    {
        id: 'void_warden',
        name: 'THE VOID WARDEN',
        description: 'A chaotic construct that ricochets around the arena, leaving toxic nebulas in its wake.',
        baseHp: 10000,
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
        particleEffect: ParticleType.BOSS_AURA
    },
    {
        id: 'crimson_eclipse',
        name: 'CRIMSON ECLIPSE',
        description: 'A corrupted star that burns everything with solar lasers.',
        baseHp: 15000,
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
        particleEffect: ParticleType.FIRE
    },
    {
        id: 'neutron_star',
        name: 'COLLAPSING NEUTRON',
        description: 'A dying star with intense gravitational pull that distorts space.',
        baseHp: 20000,
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
        particleEffect: ParticleType.ICE
    },
    {
        id: 'entropy_titan',
        name: 'ENTROPY TITAN',
        description: 'A colossal mechanical giant that smashes reality.',
        baseHp: 25000,
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
        particleEffect: ParticleType.THUNDER
    },
    {
        id: 'darkness',
        name: 'DARKNESS',
        description: 'The end of all things. A consuming void that devours light.',
        baseHp: 35000,
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
        particleEffect: ParticleType.VOID
    },
    {
        id: 'sb_hunter',
        name: 'HUNTER PYLON',
        description: 'A manifestation of the void that aggressively hunts intruders.',
        baseHp: 50000,
        hpScaling: 0,
        baseSpeed: 1.5,
        size: 40,
        color: '#b91c1c',
        glowColor: '#ef4444',
        behavior: 'SEMI_BOSS' as any,
        visualType: 'CONSTRUCT',
        spawnWeight: 0,
        minWave: 999,
        essenceReward: 1000,
        particleEffect: ParticleType.VOID
    },
    {
        id: 'sb_swarm',
        name: 'SWARM PYLON',
        description: 'A manifestation of the void that constantly generates lesser entities.',
        baseHp: 50000,
        hpScaling: 0,
        baseSpeed: 1.0,
        size: 40,
        color: '#16a34a',
        glowColor: '#4ade80',
        behavior: 'SEMI_BOSS' as any,
        visualType: 'CONSTRUCT',
        spawnWeight: 0,
        minWave: 999,
        essenceReward: 1000,
        particleEffect: ParticleType.VOID
    },
    {
        id: 'sb_laser',
        name: 'LASER PYLON',
        description: 'A stationary manifestation of the void that emits devastating energy rings.',
        baseHp: 50000,
        hpScaling: 0,
        baseSpeed: 0.8,
        size: 40,
        color: '#ca8a04',
        glowColor: '#facc15',
        behavior: 'SEMI_BOSS' as any,
        visualType: 'CONSTRUCT',
        spawnWeight: 0,
        minWave: 999,
        essenceReward: 1000,
        particleEffect: ParticleType.VOID
    }
];

export const getBossForWave = (wave: number): EnemyDef => {
    if (wave >= 60) return BOSSES.find(b => b.id === 'darkness')!;
    if (wave >= 50) return BOSSES.find(b => b.id === 'entropy_titan')!;
    if (wave >= 40) return BOSSES.find(b => b.id === 'neutron_star')!;
    if (wave >= 30) return BOSSES.find(b => b.id === 'crimson_eclipse')!;
    if (wave >= 20) return BOSSES.find(b => b.id === 'void_warden')!;
    return BOSSES.find(b => b.id === 'hive_mind')!;
};
