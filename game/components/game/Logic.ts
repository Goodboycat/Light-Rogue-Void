
import { MutableGameState, Enemy, ParticleType } from './types';
import { isBossWave as isBossWaveFn, maxAlive, waveKillQuota, WAVE_GRACE_SEC, WAVE_RAMP_SEC, STARVE_SPAWN_FRAMES } from './Constants';
import { PlayerStats } from '../../types';
import { getBossForWave } from '../../bosses';
import { updateTelegraphs, openArena, arenaOutsideFactor, updateBossAdds } from './logic/enemies/BossKit';
import { updateBigFx } from './BigFx';
import { VOID_BURN_DPS, VOID_BURN_TICK_FRAMES } from './Constants';
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
import { consumeHitStop, updateFeel, updateShake } from './Feel';

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

    // (4A) hit-stop: freeze the world for ≤ 4 frames; shake still decays so it reads as impact
    if (consumeHitStop(state)) { updateShake(state); return; }

    state.frame++;
    // (2B) every damage path during a boss fight tags the boss (GameOver death hint); telegraphs call state.damagePlayer
    const bossTaggedDamage = (amt: number) => {
        if (state.activeBoss) state.lastBossHit = state.activeBoss.def.id;
        onDamage(amt);
    };
    onDamage = bossTaggedDamage;
    state.damagePlayer = onDamage;
    
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
        openArena(state, boss); // (2B) arena ring at the player, enrage clock, add timer
    }
    // Cinematic check
    const isCinematic = state.activeBoss?.state?.custom?.cinematicMode;

    // --- SPAWN DIRECTOR (2A) ---
    // Enemies persist across waves, so spawning is budgeted instead of wiped:
    //  * crowd cap `maxAlive(wave)` (non-boss),
    //  * 3 s grace after a wave starts, then the rate ramps up over 10 s,
    //  * bosses keep a small roaming crowd (BOSS_ADD_CAP) — 2B refines it,
    //  * anti-starvation: nothing alive + quota unmet → force a spawn.
    if (!isCinematic) {
        const aliveNonBoss = state.enemies.length - (state.activeBoss ? 1 : 0);
        const sinceWave = (state.frame - state.waveStartedFrame) / 60; // seconds
        const baseRate = Math.max(8, 60 - wave * 3);
        let shouldSpawn = false;

        if (state.activeBoss) {
            // (2B) roaming packs land at the arena edge after a telegraph — see BossKit.updateBossAdds
            updateBossAdds(state, state.activeBoss, wave, onEnemySeen);
        } else if (sinceWave >= WAVE_GRACE_SEC && aliveNonBoss < maxAlive(wave)) {
            const ramp = Math.min(1, (sinceWave - WAVE_GRACE_SEC) / WAVE_RAMP_SEC); // 0 → 1
            const rate = Math.round(baseRate / Math.max(0.15, ramp));
            if (state.frame % rate === 0) shouldSpawn = true;
        }

        if (!state.activeBoss && aliveNonBoss === 0 && state.waveKills < waveKillQuota(wave)
            && state.frame % STARVE_SPAWN_FRAMES === 0) {
            shouldSpawn = true;
        }

        if (shouldSpawn) spawnEnemy(state, wave, onEnemySeen);
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
        updateTelegraphs(state); // (2B) boss warn shapes fire here
        updateBigFx(state);      // (2B+) cinematic explosions age / flash decays
    }

    // (2B) ARENA: leaving the ring burns VOID_BURN_DPS of max HP per second, in ticks
    if (state.arena && !isCinematic) {
        if (state.arena.pulse > 0) state.arena.pulse = Math.max(0, state.arena.pulse - 0.03);
        if (arenaOutsideFactor(state) > 0 && state.frame % VOID_BURN_TICK_FRAMES === 0) {
            const dmg = Math.max(1, Math.round(playerStats.maxHealth * VOID_BURN_DPS * VOID_BURN_TICK_FRAMES / 60));
            state.playerIFrames = 0; // the void ignores i-frames; it is a position check, not a hit
            onDamage(dmg);
            VFX.spark(state, state.player.x, state.player.y, '#a855f7', 6);
        }
    }

    updateDrops(state, playerStats, maturityScale, onCollect);
    updateParticlesSystem(state);
    updateCamera(state, canvasWidth, canvasHeight);
    updateFeel(state);

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
