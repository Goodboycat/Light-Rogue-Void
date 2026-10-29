import { bossFeats } from './BossFeats';
import { FOUND_EVENTS, foundEssenceMult, onPylonKilled } from './FoundEvents';
import { haptic } from '../../../utils/haptics'; // (7B)
import { showCard } from './WorldInteract';
import { MutableGameState, Enemy, ParticleType } from '../types';
import { spawnExplosion } from '../Particles';
import { spawnEnemy } from './enemies/SpawnLogic';
import { CARRIED_REWARD_MULT } from '../Constants';
import { onKillForStreak, streakEssenceMult, hitStop, shake } from '../Feel';
import { onWorldGuardKilled } from './WorldInteract';
import { acquireDrop, swapRemoveEnemy } from '../Pools';
import { closeArena } from './enemies/BossKit';
import { castBossDeathBlast } from '../BigFx';
import { ELITE_ESSENCE_MULT, SPLIT_MINI_HP, SPLIT_MINI_SIZE } from '../../../data/affixes';
import { onFlavorKill } from '../waveFlavors';
import { onBurstKill } from './LightBurst';
import { sfxAt } from '../../../audio/hooks'; // (6B)

export type KillCause = 'projectile' | 'contact' | 'aura' | 'dash' | 'explode' | 'script' | 'other';

/**
 * (2A) Every enemy death goes through here. Counts kills for the wave quota,
 * drops essence, plays the death burst, handles SPLIT and boss bookkeeping,
 * and removes the enemy from `state.enemies`.
 */
export const killEnemy = (
    state: MutableGameState,
    idx: number,
    cause: KillCause = 'other',
    onEnemySeen?: (id: string) => void
) => {
    const enemy: Enemy | undefined = state.enemies[idx];
    if (!enemy) return;

    // (4A) streak first so this kill's essence already benefits from the multiplier
    onKillForStreak(state, enemy);
    onBurstKill(state); // (3B step 6) +1 % Light Burst meter
    if (enemy.worldGuardOf) onWorldGuardKilled(state, enemy); // (3A) relic alcove guards
    const eliteMult = enemy.affixes && enemy.affixes.length ? ELITE_ESSENCE_MULT : 1; // (4B)
    // (3A step 7) found events: Golden Mite ×25, Essence Tide ×2, pylon pays its own burst
    const miteMult = enemy.isGoldenMite ? FOUND_EVENTS.miteEssenceMult : 1;
    const reward = Math.round(enemy.def.essenceReward * (enemy.carried ? CARRIED_REWARD_MULT : 1) * streakEssenceMult(state) * eliteMult * (state.flavorEssenceMult ?? 1) * miteMult * foundEssenceMult(state));
    if (enemy.isTreasurePylon) onPylonKilled(state, enemy);
    if (enemy.isGoldenMite) showCard(state, 'Golden Mite caught', '×25 essence.', '#fbbf24', 'Fast enough.', 120);
    state.drops.push(acquireDrop(enemy.x, enemy.y, reward));
    spawnExplosion(state, enemy.x, enemy.y, enemy.def.glowColor, enemy.def.particleEffect);

    if (enemy.def.behavior === 'SPLIT' && cause !== 'script') {
        for (let k = 0; k < 2; k++) {
            spawnEnemy(state, 1, onEnemySeen, enemy.x + Math.random() * 20, enemy.y + Math.random() * 20, undefined, { noAffix: true });
        }
    }
    // (4B) SPLITTING affix: two minis of the same def (60 % size, 30 % HP, no affixes)
    if (enemy.affixes && enemy.affixes.indexOf('SPLITTING') >= 0 && cause !== 'script' && !enemy.isBoss) {
        for (let k = 0; k < 2; k++) {
            const a = Math.random() * Math.PI * 2;
            const mini = spawnEnemy(state, state.currentWave ?? 1, onEnemySeen, enemy.x + Math.cos(a) * 18, enemy.y + Math.sin(a) * 18, enemy.def,
                { noAffix: true, hpMult: SPLIT_MINI_HP, sizeMult: SPLIT_MINI_SIZE });
            mini.vx = Math.cos(a) * 6; mini.vy = Math.sin(a) * 6;
        }
    }
    if (!enemy.isBoss) onFlavorKill(state, enemy); // (4B) special waves: curse marks, aegis shield breaks

    // (7A) run summary counters
    (state.runKillIds ??= {})[enemy.def.id] = true;
    if (enemy.isBoss) state.bossKills = (state.bossKills ?? 0) + 1;
    else if (enemy.affixes && enemy.affixes.length) state.eliteKills = (state.eliteKills ?? 0) + 1;

    // (6B) death SFX: boss / elite / big / small
    if (enemy.isBoss) sfxAt(state, 'boss_die', enemy.x, enemy.y, 1, 0);
    else if (enemy.affixes && enemy.affixes.length) sfxAt(state, 'elite_die', enemy.x, enemy.y);
    else if (enemy.def.size >= 24) sfxAt(state, 'enemy_die_big', enemy.x, enemy.y);
    else sfxAt(state, 'enemy_die_small', enemy.x, enemy.y, undefined, 0.15);
    if (enemy.isGoldenMite) sfxAt(state, 'golden_mite', enemy.x, enemy.y, 1);

    if (enemy.isBoss) {
        spawnExplosion(state, enemy.x, enemy.y, '#fff', ParticleType.BOSS_AURA);
        castBossDeathBlast(state, enemy.x, enemy.y, enemy.def.glowColor, enemy.size * 5); // (2B+) cinematic finisher
        haptic('bossDeath'); // (7B)
        (state.featQueue ??= []).push(...bossFeats(state, enemy.def.id)); // (8A) before closeArena resets nothing — flags live until next openArena
        state.activeBoss = undefined;
        state.bossKilledWave = state.bossSpawnedWave;
        closeArena(state); // (2B) ring, telegraphs, boss bullets, enrage all go with the boss
    } else {
        state.waveKills++;
        // (4A) big enemies feel heavy when they pop
        if (enemy.def.size >= 24) { hitStop(state, 2); shake(state, 3, 3); }
    }
    state.totalKills++;
    // (3B) bestiary lore counter, drained by SurvivalGame into gameState.killCounts
    const kq = state.killCountQueue ?? (state.killCountQueue = {});
    kq[enemy.def.id] = (kq[enemy.def.id] ?? 0) + 1;

    swapRemoveEnemy(state.enemies, idx); // (4A) O(1); callers iterate backwards so the swapped-in enemy is already processed
};
