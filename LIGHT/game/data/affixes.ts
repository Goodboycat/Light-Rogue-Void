// (4B) Elite affixes. An affixed enemy is an *elite*: readable ring outline + glyph, more HP, more essence.
// Rules in docs/ENEMIES.md. Roll happens in logic/enemies/SpawnLogic.ts; effects:
//  - HASTED    : +40 % speed                                   (SpawnLogic)
//  - ARMORED   : −30 % damage taken, −20 % speed                (Feel.onEnemyHit refunds 30 % of every hit)
//  - SPLITTING : 2 minis (60 % size, 30 % HP) on death          (KillLogic)
//  - VAMPIRIC  : touching the player heals allies in 200 px     (EnemyLogic collision)
//  - SHIELDED  : the first 3 hits are blocked                   (Feel.onEnemyHit, enemy.shieldHits)
import { AFFIX_BASE_CHANCE, AFFIX_PER_WAVE, AFFIX_CHANCE_CAP, AFFIX_DOUBLE_WAVE } from '../components/game/Constants';

export type AffixId = 'HASTED' | 'ARMORED' | 'SPLITTING' | 'VAMPIRIC' | 'SHIELDED';

export interface AffixDef {
    id: AffixId;
    name: string;
    color: string;   // ring outline
    glyph: string;   // one character drawn above the enemy
    weight: number;
}

export const AFFIXES: AffixDef[] = [
    { id: 'HASTED',    name: 'Hasted',    color: '#fde047', glyph: '»', weight: 30 },
    { id: 'ARMORED',   name: 'Armored',   color: '#94a3b8', glyph: '▲', weight: 25 },
    { id: 'SPLITTING', name: 'Splitting', color: '#a78bfa', glyph: '✦', weight: 20 },
    { id: 'VAMPIRIC',  name: 'Vampiric',  color: '#f43f5e', glyph: '♥', weight: 15 },
    { id: 'SHIELDED',  name: 'Shielded',  color: '#38bdf8', glyph: '⬡', weight: 20 },
];

export const AFFIX_BY_ID: Record<AffixId, AffixDef> = AFFIXES.reduce((m, a) => { m[a.id] = a; return m; }, {} as Record<AffixId, AffixDef>);

export const HASTED_SPEED_MULT = 1.4;
export const ARMORED_SPEED_MULT = 0.8;
export const ARMORED_DMG_TAKEN = 0.7;
export const SHIELDED_HITS = 3;
export const SPLIT_MINI_SIZE = 0.6;
export const SPLIT_MINI_HP = 0.3;
export const VAMPIRIC_RADIUS = 200;
export const VAMPIRIC_HEAL_PCT = 0.08;   // of each ally's max HP
export const ELITE_HP_MULT = 1.4;
export const ELITE_ESSENCE_MULT = 1.6;

/** Chance that a spawn at `wave` is an elite: 5 % + 0.4 %/wave, capped at 30 %. */
export const affixChance = (wave: number): number =>
    Math.min(AFFIX_CHANCE_CAP, AFFIX_BASE_CHANCE + wave * AFFIX_PER_WAVE);

const pickOne = (exclude?: AffixId): AffixDef => {
    const pool = AFFIXES.filter(a => a.id !== exclude);
    const total = pool.reduce((s, a) => s + a.weight, 0);
    let r = Math.random() * total;
    for (const a of pool) { r -= a.weight; if (r <= 0) return a; }
    return pool[pool.length - 1];
};

/** Roll affixes for a spawn. `force` skips the chance roll (Elite Rush, director elite packs). */
export const rollAffixes = (wave: number, force = false): AffixId[] => {
    if (!force && Math.random() >= affixChance(wave)) return [];
    const first = pickOne();
    const out: AffixId[] = [first.id];
    if (wave >= AFFIX_DOUBLE_WAVE && Math.random() < 0.25) out.push(pickOne(first.id).id);
    return out;
};
