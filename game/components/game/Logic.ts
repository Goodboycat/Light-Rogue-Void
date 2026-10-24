
import { MutableGameState, Enemy, ParticleType } from './types';
import { isBossWave as isBossWaveFn } from './Constants';
import { PlayerStats } from '../../types';
import { getBossForWave } from '../../bosses';
import { createParticle, updateParticles as updateParticlesSystem, spawnExplosion } from './Particles';
import { VFX } from './Emitters';
import { updatePlayer } from './logic/PlayerLogic';
import { updateEnemies, spawnEnemy } from './logic/EnemyLogic';
import { InputHandler } from './Input';
import { updatePlayerAbilities } from './logic/AbilityLogic';
import { updateProjectiles } from './logic/ProjectileLogic';
import { updateOrbitals } from './logic/OrbitalLogic';
import { updateDrops } from './logic/DropLogic';
import { updateCamera } from './logic/CameraLogic';
import { WORLD_SIZE } from './Constants';

export const updateGame = (
    state: MutableGameState, 
    playerStats: PlayerStats, 
    input: InputHandler,
    wave: number,
    timeRemaining: number,
    onCollect: (amount: number) => void,
    onDamage: (amount: number) => void,
    onEnemySeen: (id: string) => void,
    canvasWidth: number,
    canvasHeight: number,
    maturityScale: number,
    currentStageColor: string,
    mouseMovementEnabled: boolean
) => {
    // Safety
    if (!state.mouse) state.mouse = { x: canvasWidth/2, y: canvasHeight/2 };
    if (!state.projectiles) state.projectiles = [];
    
    // Initialize timers if undefined
    const p = state.player;
    if(p.fireBlastTimer === undefined) p.fireBlastTimer = 0;
    if(p.iceNovaTimer === undefined) p.iceNovaTimer = 0;
    if(p.thunderChainTimer === undefined) p.thunderChainTimer = 0;
    if(p.homingMissileTimer === undefined) p.homingMissileTimer = 0;
    if(p.fireflyTimer === undefined) p.fireflyTimer = 0;
    if(p.nebulaTrailTimer === undefined) p.nebulaTrailTimer = 0;
    if(p.singularityTimer === undefined) p.singularityTimer = 0;
    if(p.solarFlareTimer === undefined) p.solarFlareTimer = 0;
    if(p.titanShieldTimer === undefined) p.titanShieldTimer = 0;
    if(p.titanShieldDuration === undefined) p.titanShieldDuration = 0;
    if(p.stationaryTimer === undefined) p.stationaryTimer = 0;

    state.frame++;
    
    // Virtual Aim Override for Mouse Position
    if (input.virtualAimActive) {
        state.mouse.x = (canvasWidth/2) + input.virtualAim.x * 200;
        state.mouse.y = (canvasHeight/2) + input.virtualAim.y * 200;
    } else {
        state.mouse.x = input.mouseX;
        state.mouse.y = input.mouseY;
    }

    // --- SPAWNING ---
    // Boss spawning logic
    const isBossWave = isBossWaveFn(wave);
    const bossAlreadySpawned = state.bossSpawnedWave === wave;

    if (isBossWave && state.enemies.filter(e => e.isBoss).length === 0 && !state.activeBoss && !bossAlreadySpawned) {
        const bossDef = getBossForWave(wave);
        const boss: Enemy = {
            x: 0, y: -600, vx: 0, vy: 0,
            hp: bossDef.baseHp, maxHp: bossDef.baseHp,
            def: bossDef, speed: bossDef.baseSpeed, size: bossDef.size, color: bossDef.color,
            state: { timer: 0, phase: 1 }, projectileImmunity: 0, isBoss: true,
            blackHoleTimer: 0
        };
        state.enemies.push(boss);
        state.activeBoss = boss;
        state.bossSpawnedWave = wave; // Mark as spawned for this wave
        VFX.castBossSpawn(state, 0, -600, bossDef.glowColor);
        onEnemySeen(bossDef.id);
    }
    const spawnRate = Math.max(8, 60 - wave * 3);
    
    // Cinematic check
    const isCinematic = state.activeBoss?.state?.custom?.cinematicMode;

    if (!state.activeBoss && state.frame % spawnRate === 0 && timeRemaining > 1) {
        spawnEnemy(state, wave, onEnemySeen);
    }

    // UPDATE ENTITIES (Pass Cinematic Flag implicitly via state or logic check)
    updatePlayer(state, playerStats, input, canvasWidth, canvasHeight, maturityScale, mouseMovementEnabled);

    if (!isCinematic) {
        updatePlayerAbilities(state, playerStats, canvasWidth, canvasHeight, maturityScale);
        updateOrbitals(state, playerStats, maturityScale);
    }

    if (!p.isTitanShieldActive) {
         VFX.castPlayerAura(state, state.player.x, state.player.y, currentStageColor);
    } else {
        VFX.castTitanShield(state, state.player.x, state.player.y);
    }

    updateEnemiesLogic(state, playerStats, maturityScale, onDamage, onEnemySeen);
    
    // Freeze projectiles during cinematic
    if (!isCinematic) {
        updateProjectiles(state, onDamage, playerStats); // Passed playerStats for MaxHP calculation on Ultimate
    }

    updateDrops(state, playerStats, maturityScale, onCollect);
    updateParticlesSystem(state);
    updateCamera(state, canvasWidth, canvasHeight);

    if (state.player.dashTimer > 0 && state.frame % 2 === 0) {
        VFX.castDashTrail(state, state.player.x, state.player.y, '#ffffff');
    }
};

const updateEnemiesLogic = (state: MutableGameState, stats: PlayerStats, maturityScale: number, onDamage: (amt: number) => void, onEnemySeen: (id: string) => void) => {
    updateEnemies(state, stats, maturityScale, onDamage, onEnemySeen);
    
    // --- BOSS BLACK HOLE ABILITY ---
    state.enemies.forEach(enemy => {
        if (enemy.isBoss && !enemy.state.custom?.cinematicMode) {
            // Logic handled in BossLogic
        }
    });
};
