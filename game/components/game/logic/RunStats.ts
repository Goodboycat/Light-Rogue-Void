// (3A step 6) Run layer: PlayerStats (tree, permanent) + RunModifiers (shrines/relics, this run only)
// → effective stats. Computed once per frame in SurvivalGame and passed down as `playerStats`, so
// PlayerLogic / AbilityLogic / DropLogic / regen read buffs without knowing about the world.
// Outgoing damage and enemy-damage-taken are applied in Feel.onEnemyHit (every damage path goes
// through it); damage taken by the player is scaled in SurvivalGame.handleDamage.
import { PlayerStats } from '../../../types';
import { RunModifiers } from '../../../data/world';

let cacheIn: PlayerStats | undefined;
let cacheMods: string | undefined;
let cacheOut: PlayerStats | undefined;

const modsKey = (m: RunModifiers) =>
    `${m.speedMult}|${m.maxHpMult}|${m.attackSpeedMult}|${m.pickupRangeAdd}|${m.regenAdd}|${m.essenceMult}`;

export const applyRunModifiers = (stats: PlayerStats, mods?: RunModifiers): PlayerStats => {
    if (!mods) return stats;
    const key = modsKey(mods);
    if (cacheIn === stats && cacheMods === key && cacheOut) return cacheOut;
    const out: PlayerStats = {
        ...stats,
        moveSpeed: stats.moveSpeed * (1 + mods.speedMult),
        maxHealth: Math.max(1, Math.round(stats.maxHealth * (1 + mods.maxHpMult))),
        attackSpeed: stats.attackSpeed * (1 + mods.attackSpeedMult),
        pickupRange: stats.pickupRange + mods.pickupRangeAdd,
        healthRegen: stats.healthRegen + mods.regenAdd,
        // essenceMult is applied in DropLogic (it reads state.runModifiers directly) — don't double it here
    };
    cacheIn = stats; cacheMods = key; cacheOut = out;
    return out;
};

/** Outgoing multiplier for powers (Ember Core) × enemy vulnerability (Watcher's Eye). */
export const outgoingDamageMult = (mods?: RunModifiers): number =>
    mods ? (1 + mods.damageMult) * (1 + mods.enemyDamageTakenMult) : 1;

/** Incoming multiplier for the player (Ward shrine). Never below 0.25. */
export const incomingDamageMult = (mods?: RunModifiers): number =>
    mods ? Math.max(0.25, 1 + mods.damageTakenMult) : 1;
