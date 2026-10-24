import { MutableGameState } from '../../types';
import { WORLD_SIZE, CONFIG } from '../../Constants';
import { getSpawnableEnemy } from '../../../../enemies';
import { MERCY_MULTIPLIERS } from '../../mercy';
import { spawnFloatingDamageNumber, HIT_FEEDBACK_CONFIG } from '../../HitFeedback';
import { getQuality } from '../../Quality';

export let globalDamageMultiplier = 1.0;

export function setGlobalDamageMultiplier(mult: number) {
    globalDamageMultiplier = mult;
}

// Prototype-level hp accessor installed once (replaces per-enemy Object.defineProperty)
const ENEMY_PROTO = Object.create(Object.prototype);
Object.defineProperty(ENEMY_PROTO, 'hp', {
    get(this: any) {
        return this._hp;
    },
    set(this: any, value: number) {
        if (this._hp === undefined) {
            this._hp = value;
            return;
        }
        const diff = this._hp - value;
        if (diff > 0) {
            let multiplier = (this.paralyzedTimer && this.paralyzedTimer > 0) ? 1.5 : 1.0;
            if (this.state?.custom?.exposedTimer && this.state.custom.exposedTimer > 0) {
                multiplier *= 2.0;
            }
            multiplier *= globalDamageMultiplier;
            const finalDmg = diff * multiplier;
            this._hp -= finalDmg;
            this.hitFlashTimer = HIT_FEEDBACK_CONFIG.enemyHitFlashFrames;
            spawnFloatingDamageNumber(this._stateRef, this.x, this.y, finalDmg, this.maxHp || this._hp + finalDmg);
        } else {
            this._hp = value;
        }
    },
    configurable: true,
    enumerable: true,
});

export const initializeEnemy = (enemy: any, stateRef?: MutableGameState) => {
    const initialHp = enemy.hp;
    enemy.paralyzedTimer = 0;
    enemy.hitFlashTimer = 0;
    enemy._hp = initialHp;
    enemy._stateRef = stateRef;
    delete enemy.hp;
    Object.setPrototypeOf(enemy, ENEMY_PROTO);
    return enemy;
};

export function getEffectiveWave(wave: number): number {
    if (wave === 101) return 5;
    if (wave === 102) return 25;
    if (wave === 103) return 35;
    if (wave === 104) return 45;
    if (wave === 201) return 15;
    if (wave === 202) return 45; // Hidden Garden
    if (wave === 203) return 15;
    if (wave === 204) return 35;
    if (wave >= 100) return Math.min(60, Math.floor((wave % 100) / 2) + 15);
    return wave;
}

export const spawnEnemy = (state: MutableGameState, wave: number, onSpawn?: (id: string) => void, x?: number, y?: number) => {
    const Q = getQuality(state.performanceMode);

    // Enemy cap by quality (LOW 45 / MED 70 / HIGH 110).
    // Above the cap pause normal spawns and substitute elites 1:1 so rewards stay.
    if (state.enemies.length >= Q.enemyCap) {
        for (let i = 0; i < state.enemies.length; i++) {
            const candidate = state.enemies[i];
            if (!candidate.isBoss && !candidate.isSemiBoss && !candidate.isMachine && !candidate.state?.custom?.isEliteSubstituted) {
                const effWave = getEffectiveWave(wave);
                const def = getSpawnableEnemy(effWave);
                const rawHp = def.baseHp + (effWave * def.hpScaling) + (effWave * effWave * 0.5);
                const bonusHp = Math.max(1, Math.round(rawHp * MERCY_MULTIPLIERS.enemyHpMult));

                candidate._hp = (candidate._hp ?? candidate.hp) + bonusHp;
                candidate.maxHp += bonusHp;
                candidate.def = {
                    ...candidate.def,
                    essenceReward: (candidate.def.essenceReward || 10) + (def.essenceReward || 10),
                    size: Math.min(36, Math.round((candidate.def.size || 15) * 1.25)),
                };
                candidate.size = candidate.def.size;
                if (!candidate.state.custom) candidate.state.custom = {};
                candidate.state.custom.isEliteSubstituted = true;
                return;
            }
        }
        // All live enemies are already elites or bosses; skip spawn to stay <= cap
        return;
    }

    const angle = Math.random() * Math.PI * 2;
    const dist = 700 + Math.random() * 200; 
    
    let ex = x ?? state.player.x + Math.cos(angle) * dist;
    let ey = y ?? state.player.y + Math.sin(angle) * dist;

    ex = Math.max(-WORLD_SIZE / 2 + 50, Math.min(WORLD_SIZE / 2 - 50, ex));
    ey = Math.max(-WORLD_SIZE / 2 + 50, Math.min(WORLD_SIZE / 2 - 50, ey));
    
    const effWave = CONFIG.STRESS_TEST ? Math.max(wave, 35) : getEffectiveWave(wave);
    const def = getSpawnableEnemy(effWave);
    
    // Quadratic HP Scaling using effective wave tier, modified by mercy multipliers
    const rawHp = def.baseHp + (effWave * def.hpScaling) + (effWave * effWave * 0.5);
    const hp = Math.max(1, Math.round(rawHp * MERCY_MULTIPLIERS.enemyHpMult));
    
    // Speed also scales slightly, modified by Daily Void if active
    const dailySpeedMult = state.activeDailyMod?.enemySpeedMult || 1.0;
    const speed = (def.baseSpeed + (effWave * 0.05)) * dailySpeedMult;

    const newEnemy: any = Object.create(ENEMY_PROTO);
    newEnemy.x = ex;
    newEnemy.y = ey;
    newEnemy.vx = 0;
    newEnemy.vy = 0;
    newEnemy._hp = hp;
    newEnemy._stateRef = state;
    newEnemy.maxHp = hp;
    newEnemy.def = def;
    newEnemy.speed = speed;
    newEnemy.spawnSpeed = speed;
    newEnemy.size = def.size;
    newEnemy.color = def.color;
    newEnemy.projectileImmunity = 0;
    newEnemy.paralyzedTimer = 0;
    newEnemy.hitFlashTimer = 0;
    newEnemy.state = { timer: Math.floor(Math.random() * 100) };

    state.enemies.push(newEnemy);

    if (onSpawn) {
        onSpawn(def.id);
    }
};
