// (9A) Endless boss mutators. Every 10th endless wave a previous boss (1–5) returns with 1–2 of these.
// Picked deterministically from the wave number (same for every player / the sim / the daily seed).
export type MutatorId = 'TWIN' | 'HASTED' | 'MIRROR' | 'ECLIPSED' | 'SWARMED';

export interface MutatorDef { id: MutatorId; name: string; color: string; desc: string; }

export const MUTATORS: Record<MutatorId, MutatorDef> = {
  TWIN:     { id: 'TWIN',     name: 'Twin',              color: '#f472b6', desc: 'Two elite echoes arrive with the boss.' },
  HASTED:   { id: 'HASTED',   name: 'Hasted Telegraphs', color: '#facc15', desc: 'Warnings last 30 % less. Still a promise, just a faster one.' },
  MIRROR:   { id: 'MIRROR',   name: 'Mirror Arena',      color: '#67e8f9', desc: 'The arena ring is 25 % smaller.' },
  ECLIPSED: { id: 'ECLIPSED', name: 'Eclipsed',          color: '#7c3aed', desc: 'Boss has +30 % HP and moves 15 % faster.' },
  SWARMED:  { id: 'SWARMED',  name: 'Swarmed',           color: '#a3e635', desc: 'Add packs land twice as often.' },
};
const ORDER: MutatorId[] = ['HASTED', 'SWARMED', 'MIRROR', 'TWIN', 'ECLIPSED'];

/** Tunables read by BossKit / Logic. */
export const MUT_HASTED_WARN_MULT = 0.7;
export const MUT_MIRROR_RADIUS_MULT = 0.75;
export const MUT_ECLIPSED_HP_MULT = 1.3;
export const MUT_ECLIPSED_SPEED_MULT = 1.15;
export const MUT_SWARMED_ADD_MULT = 0.5;
export const MUT_TWIN_ECHOES = 2;

/** Mutators for an endless boss wave (`depth` = wave − 60). 1 mutator on the first cycle (70–110), 2 after. */
export const mutatorsForEndlessWave = (depth: number): MutatorId[] => {
  const n = Math.max(1, Math.ceil(depth / 10));            // 1, 2, 3 …
  const a = ORDER[(n - 1) % ORDER.length];
  if (n <= 5) return [a];
  const b = ORDER[(n * 3 + 1) % ORDER.length];
  return b === a ? [a, ORDER[(n * 3 + 2) % ORDER.length]] : [a, b];
};
export const hasMut = (list: readonly string[] | undefined, id: MutatorId) => !!list && list.includes(id);
