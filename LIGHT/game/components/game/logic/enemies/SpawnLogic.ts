
import { tryMakeGoldenMite, applyGoldenMite } from '../FoundEvents';
import { EnemyDef, Enemy, MutableGameState } from '../../types';
import { WORLD_SIZE } from '../../Constants';
import { getSpawnableEnemy } from '../../../../enemies';
import { AffixId, rollAffixes, HASTED_SPEED_MULT, ARMORED_SPEED_MULT, SHIELDED_HITS, ELITE_HP_MULT } from '../../../../data/affixes';

export interface SpawnOpts {
    /** (4B) force elite (Elite Rush / director elite packs) */
    elite?: boolean;
    /** (4B) exact affixes instead of a roll */
    affixes?: AffixId[];
    /** (4B) skip the affix roll entirely (SPLIT minis, Brood Nodes, Shades…) */
    noAffix?: boolean;
    /** (4B) hp / size multipliers (SPLITTING minis) */
    hpMult?: number;
    sizeMult?: number;
}

/** (4B) Apply affix stat effects to a freshly built enemy. Exported so flavors can tag existing enemies. */
export const applyAffixes = (enemy: Enemy, affixes: AffixId[]) => {
    if (!affixes.length) return;
    enemy.affixes = affixes;
    enemy.maxHp = Math.round(enemy.maxHp * ELITE_HP_MULT);
    enemy.hp = enemy.maxHp;
    for (const a of affixes) {
        if (a === 'HASTED') { enemy.speed *= HASTED_SPEED_MULT; enemy.spawnSpeed = enemy.speed; }
        if (a === 'ARMORED') { enemy.speed *= ARMORED_SPEED_MULT; enemy.spawnSpeed = enemy.speed; }
        if (a === 'SHIELDED') enemy.shieldHits = SHIELDED_HITS;
    }
};

export const spawnEnemy = (state: MutableGameState, wave: number, onSpawn?: (id: string) => void, x?: number, y?: number, defOverride?: EnemyDef, opts?: SpawnOpts): Enemy => {
    const angle = Math.random() * Math.PI * 2;
    const dist = 700 + Math.random() * 200; 
    
    let ex = x ?? state.player.x + Math.cos(angle) * dist;
    let ey = y ?? state.player.y + Math.sin(angle) * dist;

    ex = Math.max(-WORLD_SIZE/2 + 50, Math.min(WORLD_SIZE/2 - 50, ex));
    ey = Math.max(-WORLD_SIZE/2 + 50, Math.min(WORLD_SIZE/2 - 50, ey));
    
    const def = defOverride ?? getSpawnableEnemy(wave); // (2B) boss addTable can force a def
    
    // Quadratic HP Scaling: Base + (Wave * Scaling) + (Wave^2 * 0.5)
    // This ensures enemies get much tougher past wave 40-50
    const hp = Math.max(1, Math.round((def.baseHp + (wave * def.hpScaling) + (wave * wave * 0.5)) * (opts?.hpMult ?? 1)));
    
    // Speed also scales slightly
    const speed = def.baseSpeed + (wave * 0.05);

    const enemy: Enemy = {
        x: ex, y: ey,
        vx: 0, vy: 0,
        hp, maxHp: hp,
        def,
        speed,
        spawnSpeed: speed, // Store initial speed for cleansing logic
        size: def.size * (opts?.sizeMult ?? 1),
        color: def.color,
        projectileImmunity: 0,
        state: { timer: Math.floor(Math.random() * 100) } 
    };

    // (4B) elite roll — bosses' scripted minions and SPLIT minis opt out
    if (!opts?.noAffix) {
        const affixes = opts?.affixes ?? rollAffixes(wave, !!opts?.elite);
        applyAffixes(enemy, affixes);
    }

    state.enemies.push(enemy);
    // (3A step 7) Golden Mite: 4 % from wave 3, max 1 alive — only on director/trickle spawns (no override, no opts)
    if (!defOverride && !opts && tryMakeGoldenMite(state, wave)) applyGoldenMite(state, enemy);

    if (onSpawn) {
        onSpawn(def.id);
    }
    return enemy;
};
