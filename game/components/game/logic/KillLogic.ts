import { MutableGameState, Enemy, ParticleType } from '../types';
import { spawnExplosion } from '../Particles';
import { spawnEnemy } from './enemies/SpawnLogic';
import { CARRIED_REWARD_MULT } from '../Constants';

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

    const reward = Math.round(enemy.def.essenceReward * (enemy.carried ? CARRIED_REWARD_MULT : 1));
    state.drops.push({ x: enemy.x, y: enemy.y, value: reward });
    spawnExplosion(state, enemy.x, enemy.y, enemy.def.glowColor, enemy.def.particleEffect);

    if (enemy.def.behavior === 'SPLIT' && cause !== 'script') {
        for (let k = 0; k < 2; k++) {
            spawnEnemy(state, 1, onEnemySeen, enemy.x + Math.random() * 20, enemy.y + Math.random() * 20);
        }
    }

    if (enemy.isBoss) {
        spawnExplosion(state, enemy.x, enemy.y, '#fff', ParticleType.BOSS_AURA);
        spawnExplosion(state, enemy.x, enemy.y, '#fff', ParticleType.BOSS_AURA);
        state.activeBoss = undefined;
        state.bossKilledWave = state.bossSpawnedWave;
    } else {
        state.waveKills++;
    }
    state.totalKills++;

    state.enemies.splice(idx, 1);
};
