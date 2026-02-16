
import { ParticleType, EnemyDef } from './components/game/types';

export const ENEMIES: EnemyDef[] = [
    // 1-5: Basics
    { id: 'e1', name: 'Prism Larva', description: 'Weak scavenger attracted to light.', baseHp: 15, hpScaling: 5, baseSpeed: 2, size: 12, color: '#334155', glowColor: '#94a3b8', behavior: 'CHASE', visualType: 'SIMPLE', spawnWeight: 100, minWave: 1, essenceReward: 2, particleEffect: ParticleType.NORMAL },
    { id: 'e2', name: 'Star Mite', description: 'Moves in erratic swarms.', baseHp: 8, hpScaling: 2, baseSpeed: 3.5, size: 7, color: '#475569', glowColor: '#cbd5e1', behavior: 'SWARM', visualType: 'SWARMER', spawnWeight: 80, minWave: 2, essenceReward: 2, particleEffect: ParticleType.NORMAL },
    { id: 'e3', name: 'Void Crab', description: 'Hard shell, persistent pursuer.', baseHp: 45, hpScaling: 10, baseSpeed: 1.5, size: 20, color: '#be185d', glowColor: '#f472b6', behavior: 'CHASE', visualType: 'CRAB', spawnWeight: 60, minWave: 3, essenceReward: 6, particleEffect: ParticleType.FIRE },
    { id: 'e4', name: 'Neon Serpent', description: 'Slithers through the void.', baseHp: 30, hpScaling: 8, baseSpeed: 4, size: 10, color: '#06b6d4', glowColor: '#67e8f9', behavior: 'SINE', visualType: 'SERPENT', spawnWeight: 50, minWave: 4, essenceReward: 8, particleEffect: ParticleType.ICE },
    { id: 'e5', name: 'Phase Shade', description: 'Dasher that phases through reality.', baseHp: 25, hpScaling: 6, baseSpeed: 2.5, size: 15, color: '#6b21a8', glowColor: '#d8b4fe', behavior: 'DASH', visualType: 'GHOST', spawnWeight: 40, minWave: 5, essenceReward: 10, particleEffect: ParticleType.VOID },

    // 6-10: Utility & Tanks
    { id: 'e6', name: 'Geo Construct', description: 'Slow, heavy tank unit.', baseHp: 120, hpScaling: 25, baseSpeed: 0.8, size: 28, color: '#14532d', glowColor: '#4ade80', behavior: 'TANK', visualType: 'CONSTRUCT', spawnWeight: 30, minWave: 6, essenceReward: 24, particleEffect: ParticleType.NORMAL },
    { id: 'e7', name: 'Reality Weaver', description: 'Weaves complex movement patterns.', baseHp: 60, hpScaling: 15, baseSpeed: 2.2, size: 20, color: '#0f172a', glowColor: '#ef4444', behavior: 'WEAVER', visualType: 'CRAB', spawnWeight: 25, minWave: 7, essenceReward: 30, particleEffect: ParticleType.VOID },
    { id: 'e8', name: 'Solar Ray', description: 'Snipes from a distance.', baseHp: 45, hpScaling: 8, baseSpeed: 1.2, size: 15, color: '#ea580c', glowColor: '#fbbf24', behavior: 'SNIPER', visualType: 'STAR', spawnWeight: 30, minWave: 8, essenceReward: 36, particleEffect: ParticleType.LASER },
    { id: 'e9', name: 'Stardust Whale', description: 'Massive, gentle giant. Dangerous to touch.', baseHp: 300, hpScaling: 50, baseSpeed: 0.5, size: 50, color: '#1e3a8a', glowColor: '#60a5fa', behavior: 'TANK', visualType: 'SERPENT', spawnWeight: 15, minWave: 9, essenceReward: 100, particleEffect: ParticleType.ICE },
    { id: 'e10', name: 'Entropy Core', description: 'A fragment of pure chaos.', baseHp: 200, hpScaling: 50, baseSpeed: 1.8, size: 45, color: '#3f6212', glowColor: '#a3e635', behavior: 'CHASE', visualType: 'CONSTRUCT', spawnWeight: 10, minWave: 10, essenceReward: 200, particleEffect: ParticleType.VOID },

    // 11-15: Special Behaviors
    { id: 'e11', name: 'Echo blinker', description: 'Teleports closer to its target.', baseHp: 40, hpScaling: 10, baseSpeed: 1, size: 18, color: '#c026d3', glowColor: '#e879f9', behavior: 'TELEPORT', visualType: 'EYE', spawnWeight: 25, minWave: 11, essenceReward: 40, particleEffect: ParticleType.VOID },
    { id: 'e12', name: 'Mender Drone', description: 'Heals nearby allies.', baseHp: 60, hpScaling: 12, baseSpeed: 2, size: 14, color: '#16a34a', glowColor: '#86efac', behavior: 'HEALER', visualType: 'CRYSTAL', spawnWeight: 20, minWave: 12, essenceReward: 50, particleEffect: ParticleType.HEAL },
    { id: 'e13', name: 'Hive Mother', description: 'Spawns Prism Larvae.', baseHp: 150, hpScaling: 30, baseSpeed: 0.5, size: 40, color: '#7c2d12', glowColor: '#fdba74', behavior: 'SPAWNER', visualType: 'CRAB', spawnWeight: 15, minWave: 13, essenceReward: 80, particleEffect: ParticleType.NORMAL },
    { id: 'e14', name: 'Comet Trail', description: 'Leaves a damaging wake.', baseHp: 50, hpScaling: 10, baseSpeed: 4, size: 12, color: '#dc2626', glowColor: '#fca5a5', behavior: 'TRAIL', visualType: 'STAR', spawnWeight: 30, minWave: 14, essenceReward: 30, particleEffect: ParticleType.FIRE },
    { id: 'e15', name: 'War Drum', description: 'Increases speed of nearby enemies.', baseHp: 100, hpScaling: 20, baseSpeed: 1, size: 35, color: '#b45309', glowColor: '#fcd34d', behavior: 'BUFF_SPEED', visualType: 'CONSTRUCT', spawnWeight: 15, minWave: 15, essenceReward: 70, particleEffect: ParticleType.THUNDER },

    // 16-25: Shooters & Aggressors
    { id: 'e16', name: 'Spiral Dancer', description: 'Shoots projectiles in a spiral.', baseHp: 70, hpScaling: 15, baseSpeed: 1.5, size: 22, color: '#db2777', glowColor: '#f9a8d4', behavior: 'SHOOT_SPIRAL', visualType: 'STAR', spawnWeight: 20, minWave: 16, essenceReward: 60, particleEffect: ParticleType.LASER },
    { id: 'e17', name: 'Ring Turret', description: 'Stationary unit firing wave rings.', baseHp: 200, hpScaling: 40, baseSpeed: 0, size: 30, color: '#4b5563', glowColor: '#9ca3af', behavior: 'SHOOT_RING', visualType: 'CONSTRUCT', spawnWeight: 10, minWave: 17, essenceReward: 80, particleEffect: ParticleType.LASER },
    { id: 'e18', name: 'Kamikaze Star', description: 'Explodes on contact.', baseHp: 50, hpScaling: 5, baseSpeed: 5, size: 10, color: '#ef4444', glowColor: '#fee2e2', behavior: 'EXPLODE', visualType: 'STAR', spawnWeight: 40, minWave: 18, essenceReward: 20, particleEffect: ParticleType.FIRE },
    { id: 'e19', name: 'Orbital Guard', description: 'Circles the player at a distance.', baseHp: 60, hpScaling: 12, baseSpeed: 3, size: 16, color: '#2563eb', glowColor: '#93c5fd', behavior: 'ORBIT', visualType: 'SIMPLE', spawnWeight: 30, minWave: 19, essenceReward: 40, particleEffect: ParticleType.ICE },
    { id: 'e20', name: 'Fracture', description: 'Splits into two upon death.', baseHp: 80, hpScaling: 15, baseSpeed: 2, size: 25, color: '#4f46e5', glowColor: '#a5b4fc', behavior: 'SPLIT', visualType: 'CRYSTAL', spawnWeight: 25, minWave: 21, essenceReward: 60, particleEffect: ParticleType.NORMAL },
    
    // 26-35: Advanced Variants
    { id: 'e21', name: 'Phantom Assassin', description: 'Stealthy, high damage dash.', baseHp: 50, hpScaling: 10, baseSpeed: 3, size: 14, color: '#171717', glowColor: '#737373', behavior: 'DASH', visualType: 'GHOST', spawnWeight: 20, minWave: 22, essenceReward: 70, particleEffect: ParticleType.VOID },
    { id: 'e22', name: 'Iron Clad', description: 'Extremely high HP, slow.', baseHp: 500, hpScaling: 80, baseSpeed: 0.5, size: 40, color: '#374151', glowColor: '#6b7280', behavior: 'TANK', visualType: 'CONSTRUCT', spawnWeight: 10, minWave: 23, essenceReward: 160, particleEffect: ParticleType.NORMAL },
    { id: 'e23', name: 'Vortex Weaver', description: 'Pulls player while weaving.', baseHp: 90, hpScaling: 20, baseSpeed: 2.5, size: 24, color: '#7e22ce', glowColor: '#d8b4fe', behavior: 'WEAVER', visualType: 'EYE', spawnWeight: 20, minWave: 24, essenceReward: 90, particleEffect: ParticleType.VOID },
    { id: 'e24', name: 'Solar Flare', description: 'Fast, burning trail.', baseHp: 60, hpScaling: 15, baseSpeed: 4.5, size: 15, color: '#f59e0b', glowColor: '#fde68a', behavior: 'TRAIL', visualType: 'STAR', spawnWeight: 25, minWave: 25, essenceReward: 60, particleEffect: ParticleType.FIRE },
    { id: 'e25', name: 'Brood Lord', description: 'Spawns Void Crabs.', baseHp: 300, hpScaling: 60, baseSpeed: 0.8, size: 50, color: '#881337', glowColor: '#fb7185', behavior: 'SPAWNER', visualType: 'CRAB', spawnWeight: 8, minWave: 26, essenceReward: 200, particleEffect: ParticleType.VOID },
    { id: 'e26', name: 'Nullifier', description: 'Drains essence on contact.', baseHp: 100, hpScaling: 20, baseSpeed: 2, size: 20, color: '#000000', glowColor: '#525252', behavior: 'CHASE', visualType: 'SIMPLE', spawnWeight: 15, minWave: 27, essenceReward: 0, particleEffect: ParticleType.VOID },
    { id: 'e27', name: 'Prism Guardian', description: 'Rotates shooting lasers.', baseHp: 150, hpScaling: 30, baseSpeed: 1, size: 30, color: '#0e7490', glowColor: '#67e8f9', behavior: 'SHOOT_SPIRAL', visualType: 'CRYSTAL', spawnWeight: 15, minWave: 28, essenceReward: 120, particleEffect: ParticleType.LASER },
    { id: 'e28', name: 'Static Cloud', description: 'Area of effect lightning.', baseHp: 80, hpScaling: 15, baseSpeed: 1.5, size: 40, color: '#0f172a', glowColor: '#facc15', behavior: 'BUFF_SPEED', visualType: 'SWARMER', spawnWeight: 20, minWave: 29, essenceReward: 80, particleEffect: ParticleType.THUNDER },
    { id: 'e29', name: 'Gravity Well', description: 'Strong pull, does not move.', baseHp: 400, hpScaling: 50, baseSpeed: 0, size: 45, color: '#172554', glowColor: '#60a5fa', behavior: 'GRAVITY_PULL', visualType: 'SIMPLE', spawnWeight: 10, minWave: 30, essenceReward: 240, particleEffect: ParticleType.ICE },
    { id: 'e30', name: 'Quantum Mite', description: 'Tiny, teleports rapidly.', baseHp: 50, hpScaling: 10, baseSpeed: 1, size: 5, color: '#a21caf', glowColor: '#f0abfc', behavior: 'TELEPORT', visualType: 'SWARMER', spawnWeight: 40, minWave: 31, essenceReward: 40, particleEffect: ParticleType.NORMAL },

    // 36-48: Chaos & Nightmares
    { id: 'e31', name: 'Void Leviathan', description: 'Huge serpent of the deep.', baseHp: 600, hpScaling: 100, baseSpeed: 1, size: 60, color: '#020617', glowColor: '#4f46e5', behavior: 'SINE', visualType: 'SERPENT', spawnWeight: 5, minWave: 32, essenceReward: 400, particleEffect: ParticleType.VOID },
    { id: 'e32', name: 'Chaos Engine', description: 'Spawns exploding stars.', baseHp: 250, hpScaling: 40, baseSpeed: 1.2, size: 35, color: '#b91c1c', glowColor: '#fca5a5', behavior: 'SPAWNER', visualType: 'CONSTRUCT', spawnWeight: 10, minWave: 33, essenceReward: 180, particleEffect: ParticleType.FIRE },
    { id: 'e33', name: 'Mirage', description: 'Hard to see, shoots lasers.', baseHp: 60, hpScaling: 15, baseSpeed: 3, size: 18, color: '#10b981', glowColor: '#6ee7b7', behavior: 'SNIPER', visualType: 'GHOST', spawnWeight: 20, minWave: 34, essenceReward: 100, particleEffect: ParticleType.LASER },
    { id: 'e34', name: 'Tesla Coil', description: 'Chain lightning construct.', baseHp: 120, hpScaling: 25, baseSpeed: 0.5, size: 22, color: '#eab308', glowColor: '#fef08a', behavior: 'SHOOT_RING', visualType: 'CONSTRUCT', spawnWeight: 15, minWave: 35, essenceReward: 120, particleEffect: ParticleType.THUNDER },
    { id: 'e35', name: 'Neutrino', description: 'Extremely fast, low hp.', baseHp: 50, hpScaling: 5, baseSpeed: 8, size: 4, color: '#cbd5e1', glowColor: '#e2e8f0', behavior: 'CHASE', visualType: 'SIMPLE', spawnWeight: 50, minWave: 36, essenceReward: 30, particleEffect: ParticleType.NORMAL },
    { id: 'e36', name: 'Gorgon Eye', description: 'Freezes player (visual only).', baseHp: 150, hpScaling: 30, baseSpeed: 1, size: 30, color: '#047857', glowColor: '#6ee7b7', behavior: 'CHASE', visualType: 'EYE', spawnWeight: 15, minWave: 37, essenceReward: 140, particleEffect: ParticleType.ICE },
    { id: 'e37', name: 'Doppelganger', description: 'Mimics player movement.', baseHp: 100, hpScaling: 20, baseSpeed: 4, size: 10, color: '#fff', glowColor: '#f43f5e', behavior: 'MIMIC', visualType: 'SIMPLE', spawnWeight: 10, minWave: 38, essenceReward: 200, particleEffect: ParticleType.NORMAL },
    { id: 'e38', name: 'Pulsar Bomb', description: 'Pulses then explodes.', baseHp: 80, hpScaling: 15, baseSpeed: 2, size: 25, color: '#d946ef', glowColor: '#f0abfc', behavior: 'EXPLODE', visualType: 'STAR', spawnWeight: 20, minWave: 39, essenceReward: 80, particleEffect: ParticleType.VOID },
    { id: 'e39', name: 'Nanite Cloud', description: 'Repairs other machines.', baseHp: 100, hpScaling: 20, baseSpeed: 2.5, size: 20, color: '#64748b', glowColor: '#94a3b8', behavior: 'HEALER', visualType: 'SWARMER', spawnWeight: 20, minWave: 41, essenceReward: 100, particleEffect: ParticleType.HEAL },
    { id: 'e40', name: 'Observer', description: 'Watches from afar.', baseHp: 200, hpScaling: 30, baseSpeed: 1.5, size: 40, color: '#0f172a', glowColor: '#38bdf8', behavior: 'ORBIT', visualType: 'EYE', spawnWeight: 10, minWave: 42, essenceReward: 160, particleEffect: ParticleType.ICE },
    { id: 'e41', name: 'Monolith', description: 'Indestructible object (high HP).', baseHp: 2000, hpScaling: 500, baseSpeed: 0.2, size: 60, color: '#000', glowColor: '#555', behavior: 'TANK', visualType: 'CONSTRUCT', spawnWeight: 5, minWave: 43, essenceReward: 600, particleEffect: ParticleType.NORMAL },
    { id: 'e42', name: 'Valkyrie', description: 'Swoops in and out.', baseHp: 90, hpScaling: 20, baseSpeed: 5, size: 18, color: '#f59e0b', glowColor: '#fff', behavior: 'DASH', visualType: 'GHOST', spawnWeight: 15, minWave: 44, essenceReward: 120, particleEffect: ParticleType.FIRE },
    { id: 'e43', name: 'Necromancer', description: 'Summons Ghosts.', baseHp: 150, hpScaling: 30, baseSpeed: 1, size: 30, color: '#4c1d95', glowColor: '#8b5cf6', behavior: 'SPAWNER', visualType: 'CRYSTAL', spawnWeight: 10, minWave: 45, essenceReward: 180, particleEffect: ParticleType.VOID },
    { id: 'e44', name: 'Hydra Head', description: 'Part of a greater evil.', baseHp: 120, hpScaling: 25, baseSpeed: 3, size: 25, color: '#166534', glowColor: '#4ade80', behavior: 'SINE', visualType: 'SERPENT', spawnWeight: 15, minWave: 46, essenceReward: 140, particleEffect: ParticleType.NORMAL },
    { id: 'e45', name: 'Firefly', description: 'Leaves burning path.', baseHp: 50, hpScaling: 10, baseSpeed: 6, size: 8, color: '#f97316', glowColor: '#fdba74', behavior: 'TRAIL', visualType: 'SWARMER', spawnWeight: 25, minWave: 47, essenceReward: 60, particleEffect: ParticleType.FIRE },
    { id: 'e46', name: 'Apex Predator', description: 'Hunts the player relentlessly.', baseHp: 300, hpScaling: 50, baseSpeed: 4.2, size: 35, color: '#be123c', glowColor: '#f43f5e', behavior: 'CHASE', visualType: 'CRAB', spawnWeight: 5, minWave: 48, essenceReward: 300, particleEffect: ParticleType.FIRE },
    { id: 'e47', name: 'Zero Point', description: 'Freezes movement nearby.', baseHp: 150, hpScaling: 30, baseSpeed: 1, size: 20, color: '#0ea5e9', glowColor: '#7dd3fc', behavior: 'FREEZE_AURA', visualType: 'STAR', spawnWeight: 10, minWave: 49, essenceReward: 160, particleEffect: ParticleType.ICE },
    { id: 'e48', name: 'Gamma Ray', description: 'Deadly sniper beam.', baseHp: 100, hpScaling: 20, baseSpeed: 2, size: 20, color: '#a855f7', glowColor: '#d8b4fe', behavior: 'SNIPER', visualType: 'CRYSTAL', spawnWeight: 10, minWave: 50, essenceReward: 200, particleEffect: ParticleType.LASER },
    
    // COSMIC TIER (49-59) - Significantly Harder
    { id: 'e49', name: 'Omen', description: 'Moves at terrifying speeds to hunt you.', baseHp: 100, hpScaling: 150, baseSpeed: 7.5, size: 50, color: '#000', glowColor: '#ef4444', behavior: 'CHASE', visualType: 'GHOST', spawnWeight: 8, minWave: 51, essenceReward: 500, particleEffect: ParticleType.VOID },
    { id: 'e50', name: 'Singularity', description: 'Massive gravitational anomaly.', baseHp: 1500, hpScaling: 300, baseSpeed: 0.5, size: 80, color: '#475569', glowColor: '#94a3b8', behavior: 'GRAVITY_PULL', visualType: 'SIMPLE', spawnWeight: 5, minWave: 52, essenceReward: 1000, particleEffect: ParticleType.VOID },
    { id: 'e51', name: 'Solar Wisp', description: 'Leaves damaging sun flares in its wake.', baseHp: 600, hpScaling: 100, baseSpeed: 3, size: 15, color: '#f59e0b', glowColor: '#fcd34d', behavior: 'LEAVE_MINES', visualType: 'SWARMER', spawnWeight: 15, minWave: 53, essenceReward: 300, particleEffect: ParticleType.FIRE },
    { id: 'e52', name: 'Magnetar', description: 'Intense magnetic pull with arcs.', baseHp: 2000, hpScaling: 400, baseSpeed: 2, size: 30, color: '#312e81', glowColor: '#818cf8', behavior: 'GRAVITY_PULL', visualType: 'STAR', spawnWeight: 8, minWave: 54, essenceReward: 600, particleEffect: ParticleType.THUNDER },
    { id: 'e53', name: 'Plasma Storm', description: 'Erratic, exploding energy discharge.', baseHp: 500, hpScaling: 80, baseSpeed: 6, size: 25, color: '#be123c', glowColor: '#fb7185', behavior: 'EXPLODE', visualType: 'CRYSTAL', spawnWeight: 12, minWave: 55, essenceReward: 400, particleEffect: ParticleType.FIRE },
    { id: 'e54', name: 'Orbital Fortress', description: 'Flying tank with spinning lasers.', baseHp: 3000, hpScaling: 600, baseSpeed: 1.5, size: 50, color: '#422006', glowColor: '#fdba74', behavior: 'LASER_SPIN', visualType: 'CONSTRUCT', spawnWeight: 5, minWave: 56, essenceReward: 1200, particleEffect: ParticleType.NORMAL },
    { id: 'e55', name: 'Void Wraith', description: 'Phases out of reality to strike.', baseHp: 400, hpScaling: 100, baseSpeed: 8, size: 20, color: '#000000', glowColor: '#94a3b8', behavior: 'PHASE_DASH', visualType: 'GHOST', spawnWeight: 10, minWave: 57, essenceReward: 600, particleEffect: ParticleType.VOID },
    { id: 'e56', name: 'Quantum Sentry', description: 'Cleanses slows and grants immunity.', baseHp: 1000, hpScaling: 200, baseSpeed: 4, size: 15, color: '#0f766e', glowColor: '#2dd4bf', behavior: 'CLEANSER', visualType: 'EYE', spawnWeight: 8, minWave: 58, essenceReward: 700, particleEffect: ParticleType.RING },
    { id: 'e57', name: 'Omega Construct', description: 'The immovable object.', baseHp: 8000, hpScaling: 1000, baseSpeed: 1, size: 70, color: '#1a2e05', glowColor: '#bef264', behavior: 'TANK', visualType: 'CONSTRUCT', spawnWeight: 3, minWave: 59, essenceReward: 2000, particleEffect: ParticleType.BOSS_AURA },
    { id: 'e58', name: 'Event Horizon', description: 'Casts miniature black holes.', baseHp: 2500, hpScaling: 500, baseSpeed: 2, size: 40, color: '#000', glowColor: '#f472b6', behavior: 'BLACK_HOLE_CAST', visualType: 'SIMPLE', spawnWeight: 5, minWave: 59, essenceReward: 1600, particleEffect: ParticleType.VOID },
    { id: 'e59', name: 'Entropy Avatar', description: 'A chaos engine of pure destruction.', baseHp: 5000, hpScaling: 800, baseSpeed: 3, size: 55, color: '#7f1d1d', glowColor: '#ef4444', behavior: 'LASER_SPIN', visualType: 'STAR', spawnWeight: 2, minWave: 60, essenceReward: 3000, particleEffect: ParticleType.FIRE },
];

export const getSpawnableEnemy = (wave: number): EnemyDef => {
    // 1. Get all unlocked enemies (minWave <= currentWave)
    const unlocked = ENEMIES.filter(e => e.minWave <= wave);
    
    // Safety check: if somehow nothing is unlocked, return the first enemy
    if (unlocked.length === 0) return ENEMIES[0];

    // 2. Filter out weak enemies (Obsolescence Logic)
    let candidates = unlocked.filter(e => e.minWave >= wave - 20);

    // 3. Endgame Fallback
    if (candidates.length === 0) {
        const maxMinWave = Math.max(...unlocked.map(e => e.minWave));
        candidates = unlocked.filter(e => e.minWave >= maxMinWave - 10);
    }
    
    if (candidates.length === 0) candidates = unlocked;

    const totalWeight = candidates.reduce((sum, e) => sum + e.spawnWeight, 0);
    let r = Math.random() * totalWeight;
    for (const enemy of candidates) {
        r -= enemy.spawnWeight;
        if (r <= 0) return enemy;
    }
    return candidates[candidates.length - 1];
};
