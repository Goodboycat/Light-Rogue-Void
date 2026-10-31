import { bossHpFor } from './Constants'; // (8B)

import { bossHit } from './logic/BossFeats';
import { MutableGameState, Enemy, ParticleType } from './types';
import { isBossWave as isBossWaveFn, waveKillQuota, WAVE_GRACE_SEC, WAVE_RAMP_SEC, STARVE_SPAWN_FRAMES, isEndlessWave, endlessDepth } from './Constants';
import { PlayerStats } from '../../types';
import { getBossForWave } from '../../bosses';
import { mutatorsForEndlessWave, hasMut, MUT_ECLIPSED_HP_MULT, MUT_ECLIPSED_SPEED_MULT, MUT_TWIN_ECHOES } from '../../data/mutators';
import { updateTelegraphs, openArena, arenaOutsideFactor, updateBossAdds } from './logic/enemies/BossKit';
import { updateHazards } from './logic/enemies/BossHazards';
import { updateDarknessInterrupt } from './logic/DarknessInterrupt'; // (M5)
import { updateBigFx } from './BigFx';
import { updateDirector } from './logic/Director';
import { updateWaveFlavor, startWaveFlavor } from './waveFlavors';
import { VOID_BURN_DPS, VOID_BURN_TICK_FRAMES } from './Constants';
import { createParticle, updateParticles as updateParticlesSystem, spawnExplosion } from './Particles';
import { VFX } from './Emitters';
import { updatePlayer } from './logic/PlayerLogic';
import { updateEnemies, spawnEnemy } from './logic/EnemyLogic';
import { InputHandler } from './Input';
import { updatePlayerAbilities } from './logic/AbilityLogic';
import { updateProjectiles } from './logic/ProjectileLogic';
import { rebuildEnemyGrid } from './SpatialHash';
import { updateOrbitals } from './logic/OrbitalLogic';
import { updateDrops } from './logic/DropLogic';
import { updateCamera } from './logic/CameraLogic';
import { WORLD_SIZE } from './Constants';
import { consumeHitStop, updateFeel, updateShake } from './Feel';
import { initWorld, markFog } from './logic/WorldLogic';
import { updateWorld } from './logic/WorldInteract';
import { updateFoundEvents } from './logic/FoundEvents';
import { updateLightBurst } from './logic/LightBurst';
import { sfx } from '../../audio/hooks'; // (6B)

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
    if (!state.world) initWorld(state, wave); // (3A) seeded discovery points, once per run
    if (state.frame % 6 === 0) markFog(state, state.player.x, state.player.y); // (3A) fog of discovery
    if (state.currentWave !== wave) { // (4B) run start / ?wave= jump: arm the x5 flavor (advanceWave also calls it; idempotent)
        if (state.flavorArmedWave !== wave) { startWaveFlavor(state, wave); state.flavorArmedWave = wave; }
    }
    state.currentWave = wave; // (4B) KillLogic / flavors read the wave without threading it through
    // (2B) every damage path during a boss fight tags the boss (GameOver death hint); telegraphs call state.damagePlayer
    const rawOnDamage = onDamage; // capture BEFORE reassigning — the wrapper must not call itself (2C fix: stack overflow)
    const bossTaggedDamage = (amt: number) => {
        if (state.activeBoss) { state.lastBossHit = state.activeBoss.def.id; bossHit(state); } // (8A) feats
        rawOnDamage(amt);
    };
    onDamage = bossTaggedDamage;
    state.damagePlayer = onDamage;
    state.playerStatsRef = playerStats; // (2D) Darkness mirrors the player's unlocked powers
    
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
            hp: bossHpFor(bossDef.baseHp, wave), maxHp: bossHpFor(bossDef.baseHp, wave), // (8B)
            def: bossDef, speed: bossDef.baseSpeed, size: bossDef.size, color: bossDef.color,
            state: { timer: 0, phase: 1 }, projectileImmunity: 0, isBoss: true,
            blackHoleTimer: 0
        };
        // (9A) endless: returning boss gets 1–2 mutators (data/mutators.ts)
        state.bossMutators = isEndlessWave(wave) ? mutatorsForEndlessWave(endlessDepth(wave)) : undefined;
        if (hasMut(state.bossMutators, 'ECLIPSED')) { boss.maxHp = boss.hp = Math.round(boss.hp * MUT_ECLIPSED_HP_MULT); boss.speed *= MUT_ECLIPSED_SPEED_MULT; }
        state.enemies.push(boss);
        state.activeBoss = boss;
        if (hasMut(state.bossMutators, 'TWIN')) for (let i = 0; i < MUT_TWIN_ECHOES; i++) spawnEnemy(state, wave, onEnemySeen, undefined, undefined, undefined, { elite: true });
        state.bossSpawnedWave = wave; // Mark as spawned for this wave
        VFX.castBossSpawn(state, 0, -600, bossDef.glowColor);
        onEnemySeen(bossDef.id);
        openArena(state, boss); // (2B) arena ring at the player, enrage clock, add timer
    }
    // Cinematic check
    const isCinematic = state.activeBoss?.state?.custom?.cinematicMode;

    // --- SPAWN DIRECTOR (2A) ---
    // Enemies persist across waves, so spawning is budgeted instead of wiped:
    //  * (4B) NO crowd cap — rule 9; pacing is rate only,
    //  * 3 s grace after a wave starts, then the rate ramps up over 10 s,
    //  * bosses keep roaming packs landing (BossKit.updateBossAdds),
    //  * anti-starvation: nothing alive + quota unmet → force a spawn.
    if (!isCinematic) {
        const aliveNonBoss = state.enemies.length - (state.activeBoss ? 1 : 0);
        const sinceWave = (state.frame - state.waveStartedFrame) / 60; // seconds
        const baseRate = Math.max(8, 60 - wave * 3);
        let shouldSpawn = false;

        if (state.activeBoss) {
            // (2B) roaming packs land at the arena edge after a telegraph — see BossKit.updateBossAdds
            updateBossAdds(state, state.activeBoss, wave, onEnemySeen);
        } else {
            // (4B) special wave rules (banner, Gauntlet walls, Curse marks, Aegis tagging); Gauntlet owns spawning
            const suppress = updateWaveFlavor(state, wave, onEnemySeen);
            // (4B) packs land after a 0.6 s telegraph; the trickle below runs at half speed around a pack
            // (3A) director is PAUSED (not capped) while a found event / relic alcove is running
            const trickleMult = (suppress || state.worldEventActive) ? 1 : updateDirector(state, wave, sinceWave, onEnemySeen, state.flavor === 'ELITE_RUSH' ? { elite: true } : undefined);
            if (!suppress && !state.worldEventActive && sinceWave >= WAVE_GRACE_SEC) {
                const ramp = Math.min(1, (sinceWave - WAVE_GRACE_SEC) / WAVE_RAMP_SEC); // 0 → 1
                const rate = Math.round(baseRate * trickleMult / Math.max(0.15, ramp));
                if (state.frame % rate === 0) shouldSpawn = true;
            }
        }

        if (!state.activeBoss && aliveNonBoss === 0 && state.waveKills < waveKillQuota(wave)
            && state.frame % STARVE_SPAWN_FRAMES === 0) {
            shouldSpawn = true;
        }

        if (shouldSpawn) spawnEnemy(state, wave, onEnemySeen);
    }

    // UPDATE ENTITIES (Pass Cinematic Flag implicitly via state or logic check)
    state.burstFiredThisFrame = updateLightBurst(state, playerStats, input, wave); // (3B step 6) before the dash check
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
    rebuildEnemyGrid(state); // (4B) spatial hash for projectile broad-phase — rule 9 (no caps → O(n) checks)
    
    // Freeze projectiles during cinematic
    if (!isCinematic) {
        updateProjectiles(state, onDamage, playerStats); // Passed playerStats for MaxHP calculation on Ultimate
        updateTelegraphs(state); // (2B) boss warn shapes fire here
        updateHazards(state, state.activeBoss, false); // (2C) persistent terrain hazards spawn + tick
        updateDarknessInterrupt(state, wave, playerStats.maxHealth); // (M5) interrupt scheduler + live threat steering
        updateBigFx(state);      // (2B+) cinematic explosions age / flash decays
    }

    // (2B) ARENA: leaving the ring burns VOID_BURN_DPS of max HP per second, in ticks
    if (state.arena && !isCinematic) {
        if (state.arena.pulse > 0) state.arena.pulse = Math.max(0, state.arena.pulse - 0.03);
        if (arenaOutsideFactor(state) > 0 && state.frame % VOID_BURN_TICK_FRAMES === 0) {
            const dmg = Math.max(1, Math.round(playerStats.maxHealth * VOID_BURN_DPS * VOID_BURN_TICK_FRAMES / 60));
            state.playerIFrames = 0; // the void ignores i-frames; it is a position check, not a hit
            onDamage(dmg);
            sfx('arena_burn', 0.7, 0); // (6B)
            VFX.spark(state, state.player.x, state.player.y, '#a855f7', 6);
        }
    }

    if (!isCinematic) updateWorld(state, onEnemySeen); // (3A) touch shrines / alcoves / landmarks / events
    if (!isCinematic) updateFoundEvents(state, wave, onEnemySeen); // (3A step 7) Golden Mite / Essence Tide / Pylon / Ambush Ring / Meteor Shower
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
