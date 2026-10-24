import { updateChaosHazards } from './logic/HazardLogic';
import { MERCY_MULTIPLIERS } from './mercy';
import { calculateBossWoundedHp } from './bossRetry';
import { initializeEnemy } from './logic/enemies/SpawnLogic';
import { updateTelegraphs } from './logic/enemies/BossKit';
import { getQuality } from './Quality';
import { swapRemoveEnemy } from './ObjectPools';

import { MutableGameState, Enemy, ParticleType, DamageSource } from './types';
import { PlayerStats, Settings } from '../../types';
import { getBossForWave } from '../../bosses';
import { updateParticles as updateParticlesSystem } from './Particles';
import { VFX } from './Emitters';
import { updatePlayer } from './logic/PlayerLogic';
import { updateEnemies, spawnEnemy } from './logic/EnemyLogic';
import { InputHandler } from './Input';
import { updatePlayerAbilities } from './logic/AbilityLogic';
import { updateProjectiles } from './logic/ProjectileLogic';
import { updateOrbitals } from './logic/OrbitalLogic';
import { updateDrops } from './logic/DropLogic';
import { updateCamera } from './logic/CameraLogic';
import { CONFIG } from './Constants';
import { updateFloatingDamageNumbers } from './HitFeedback';

export const updateGame = (
    state: MutableGameState, 
    playerStats: PlayerStats, 
    input: InputHandler,
    wave: number,
    timeRemaining: number,
    onCollect: (amount: number) => void,
    onDamage: (amount: number, source?: DamageSource) => void,
    onEnemySeen: (id: string) => void,
    canvasWidth: number,
    canvasHeight: number,
    maturityScale: number,
    currentStageColor: string,
    mouseMovementEnabled: boolean,
    settings?: Settings
) => {
    // Safety
    if (!state.mouse) state.mouse = { x: canvasWidth / 2, y: canvasHeight / 2 };
    if (!state.projectiles) state.projectiles = [];
    
    // Initialize timers if undefined
    const p = state.player;
    if (p.fireBlastTimer === undefined) p.fireBlastTimer = 0;
    if (p.iceNovaTimer === undefined) p.iceNovaTimer = 0;
    if (p.thunderChainTimer === undefined) p.thunderChainTimer = 0;
    if (p.homingMissileTimer === undefined) p.homingMissileTimer = 0;
    if (p.fireflyTimer === undefined) p.fireflyTimer = 0;
    if (p.nebulaTrailTimer === undefined) p.nebulaTrailTimer = 0;
    if (p.singularityTimer === undefined) p.singularityTimer = 0;
    if (p.solarFlareTimer === undefined) p.solarFlareTimer = 0;
    if (p.titanShieldTimer === undefined) p.titanShieldTimer = 0;
    if (p.titanShieldDuration === undefined) p.titanShieldDuration = 0;
    if (p.stationaryTimer === undefined) p.stationaryTimer = 0;

    state.frame++;
    (state as any).canvasWidth = canvasWidth;
    (state as any).canvasHeight = canvasHeight;
    
    // Virtual Aim Override for Mouse Position
    if (input.virtualAimActive) {
        state.mouse.x = (canvasWidth / 2) + input.virtualAim.x * 200;
        state.mouse.y = (canvasHeight / 2) + input.virtualAim.y * 200;
        input.mouseX = state.mouse.x;
        input.mouseY = state.mouse.y;
    } else {
        state.mouse.x = input.mouseX;
        state.mouse.y = input.mouseY;
    }

    // --- WAVE CLEAR TIMERS ---
    if (state.hitPauseTimer && state.hitPauseTimer > 0) {
        state.hitPauseTimer--;
        updateParticlesSystem(state);
        updateFloatingDamageNumbers();
        updateDrops(state, playerStats, maturityScale, onCollect);
        updateCamera(state, canvasWidth, canvasHeight, settings);
        return;
    }

    if (state.vortexTimer && state.vortexTimer > 0) {
        state.vortexTimer--;
    }

    if (state.intermissionTimer && state.intermissionTimer > 0) {
        state.intermissionTimer--;
    }

    if (state.waveBannerTimer && state.waveBannerTimer > 0) {
        state.waveBannerTimer--;
    }

    // --- SPAWNING ---
    const isVoidRush = !!state.isVoidRush;
    const isBossWave = isVoidRush
        ? (wave === 9 || wave === 18)
        : (!state.isSpecialMission && wave > 0 && wave % 10 === 0 && wave < 100);
    const bossAlreadySpawned = state.bossSpawnedWave === wave;

    let hasBoss = false;
    for (let i = 0; i < state.enemies.length; i++) {
        if (state.enemies[i].isBoss) {
            hasBoss = true;
            break;
        }
    }

    if (isBossWave && !hasBoss && !state.activeBoss && !bossAlreadySpawned) {
        const bossLookupWave = isVoidRush ? (wave === 9 ? 10 : 20) : wave;
        const bossDef = getBossForWave(bossLookupWave);
        const dailyBossMult = state.activeDailyMod?.bossHpMult || 1.0;
        const rushBossMult = isVoidRush ? 1.5 : 1.0;
        const scaledBossHp = Math.max(1, Math.round(bossDef.baseHp * MERCY_MULTIPLIERS.bossHpMult * dailyBossMult * rushBossMult));
        const failedAttempts = state.bossFailedAttemptsSession?.[bossDef.id] || 0;
        const { startingHp, stacks } = calculateBossWoundedHp(scaledBossHp, failedAttempts);

        const boss: Enemy = {
            x: 0, y: -600, vx: 0, vy: 0,
            hp: startingHp, maxHp: scaledBossHp,
            isWounded: stacks > 0,
            woundedStacks: stacks,
            def: bossDef, speed: bossDef.baseSpeed, size: bossDef.size, color: bossDef.color,
            state: { timer: 0, phase: 1, custom: { cinematicMode: !isVoidRush, cinematicTimer: isVoidRush ? 0 : 60, cinematicHpSaved: startingHp } }, projectileImmunity: 0, isBoss: true,
            blackHoleTimer: 0
        };
        initializeEnemy(boss, state);
        const qCap = getQuality(state.performanceMode).enemyCap;
        while (state.enemies.length >= qCap) {
            let removed = false;
            for (let i = state.enemies.length - 1; i >= 0; i--) {
                if (!state.enemies[i].isBoss) {
                    swapRemoveEnemy(state.enemies, i);
                    removed = true;
                    break;
                }
            }
            if (!removed) break;
        }
        state.enemies.push(boss);
        state.activeBoss = boss;
        state.bossSpawnedWave = wave;
        state.player.lightEnergy = Math.max(state.player.lightEnergy || 0, 60);
        VFX.castBossSpawn(state, 0, -600, bossDef.glowColor);
        onEnemySeen(bossDef.id);
    }

    const baseSpawnInterval = CONFIG.STRESS_TEST ? 4 : Math.max(8, 60 - wave * 3);
    const dailySpawnMult = state.activeDailyMod?.spawnRateMult || 1.0;
    const spawnRate = CONFIG.STRESS_TEST ? 2 : Math.max(5, Math.round((baseSpawnInterval * MERCY_MULTIPLIERS.spawnIntervalMult) / dailySpawnMult));
    
    const isCinematic = state.activeBoss?.state?.custom?.cinematicMode;
    const isIntermission = (state.intermissionTimer || 0) > 0;

    if (!state.activeBoss && !isIntermission && state.frame % spawnRate === 0 && timeRemaining > 1) {
        const burstCount = CONFIG.STRESS_TEST ? 4 : 1;
        for (let b = 0; b < burstCount; b++) {
            spawnEnemy(state, wave, onEnemySeen);
        }
    }

    // UPDATE ENTITIES
    updatePlayer(state, playerStats, input, canvasWidth, canvasHeight, maturityScale, mouseMovementEnabled);

    if (!isCinematic) {
        updatePlayerAbilities(state, playerStats, canvasWidth, canvasHeight, maturityScale, input, wave, settings);
        updateOrbitals(state, playerStats, maturityScale);
    }

    if (!p.isTitanShieldActive) {
        VFX.castPlayerAura(state, state.player.x, state.player.y, currentStageColor);
    } else {
        VFX.castTitanShield(state, state.player.x, state.player.y);
    }

    updateEnemies(state, playerStats, maturityScale, onDamage, onEnemySeen);
    updateChaosHazards(state, playerStats, onDamage);
    updateTelegraphs(state);
    
    if (!isCinematic) {
        updateProjectiles(state, onDamage, playerStats);
    }

    updateDrops(state, playerStats, maturityScale, onCollect);
    updateParticlesSystem(state);
    updateFloatingDamageNumbers();
    updateCamera(state, canvasWidth, canvasHeight, settings);

    if (state.damageOverlayTimer && state.damageOverlayTimer > 0) {
        state.damageOverlayTimer--;
    }

    // Machine Spawning
    if (state.frame === 1 && state.mission && state.mission.type === 'DESTROY_MACHINES') {
        for (let i = 0; i < state.mission.target; i++) {
            const angle = (Math.PI * 2 / state.mission.target) * i;
            const dist = 500;
            const mx = Math.cos(angle) * dist;
            const my = Math.sin(angle) * dist;
            const machine: any = {
                id: 'machine_' + i,
                x: mx, y: my, vx: 0, vy: 0,
                hp: 120, maxHp: 120,
                def: { id: 'healer_machine', name: 'Healing Pylon', baseSpeed: 0, baseHp: 120, color: '#10b981', size: 30, glowColor: '#059669', particleEffect: ParticleType.HEAL, xpReward: 0, essenceReward: 50 },
                speed: 0, size: 30, color: '#10b981',
                state: { timer: 0 }, projectileImmunity: 0, blackHoleTimer: 0,
                isMachine: true
            };
            initializeEnemy(machine, state);
            state.enemies.push(machine);
        }
    }
    // Machine logic: Heal others
    if (state.frame % 60 === 0 && state.mission && state.mission.type === 'DESTROY_MACHINES') {
        for (let i = 0; i < state.enemies.length; i++) {
            const machine = state.enemies[i];
            if (machine.isMachine) {
                for (let j = 0; j < state.enemies.length; j++) {
                    const e = state.enemies[j];
                    if (!e.isMachine && e.hp < e.maxHp) {
                        e.hp = Math.min(e.maxHp, e.hp + 20);
                    }
                }
                VFX.castBossSpawn(state, machine.x, machine.y, '#10b981');
            }
        }
    }

    if (state.player.dashTimer > 0 && state.frame % 2 === 0) {
        VFX.castDashTrail(state, state.player.x, state.player.y, '#ffffff');
    }
};
