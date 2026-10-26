import { MutableGameState, Enemy, ParticleType } from '../types';
import { spawnExplosion } from '../Particles';
import { spawnEnemy } from './enemies/SpawnLogic';
import { CARRIED_REWARD_MULT } from '../Constants';
import { onKillForStreak, streakEssenceMult, hitStop, shake } from '../Feel';
import { acquireDrop, swapRemoveEnemy } from '../Pools';
import { closeArena } from './enemies/BossKit';
import { castBossDeathBlast } from '../BigFx';
import { ELITE_ESSENCE_MULT, SPLIT_MINI_HP, SPLIT_MINI_SIZE } from '../../../data/affixes';
import { onFlavorKill } from '../waveFlavors';

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
    const eliteMult = enemy.affixes && enemy.affixes.length ? ELITE_ESSENCE_MULT : 1; // (4B)
    const reward = Math.round(enemy.def.essenceReward * (enemy.carried ? CARRIED_REWARD_MULT : 1) * streakEssenceMult(state) * eliteMult * (state.flavorEssenceMult ?? 1));
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

    if (enemy.isBoss) {
        spawnExplosion(state, enemy.x, enemy.y, '#fff', ParticleType.BOSS_AURA);
        castBossDeathBlast(state, enemy.x, enemy.y, enemy.def.glowColor, enemy.size * 5); // (2B+) cinematic finisher
        state.activeBoss = undefined;
        state.bossKilledWave = state.bossSpawnedWave;
        closeArena(state); // (2B) ring, telegraphs, boss bullets, enrage all go with the boss
    } else {
        state.waveKills++;
        // (4A) big enemies feel heavy when they pop
        if (enemy.def.size >= 24) { hitStop(state, 2); shake(state, 3, 3); }
    }
    state.totalKills++;

    swapRemoveEnemy(state.enemies, idx); // (4A) O(1); callers iterate backwards so the swapped-in enemy is already processed
};
