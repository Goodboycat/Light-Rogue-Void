// (8A step 4/5) Per-fight boss-mechanic flags → lifetime feats (`<bossId>:<feat>`), consumed by achievements v2.
// Flags are reset in openArena and read once in KillLogic when the boss dies; SurvivalGame drains `state.featQueue`.
import { MutableGameState } from '../types';
import { BOSS_ENRAGE_SEC } from '../Constants';

export interface BossFightFlags {
    hits: number;        // every damage call while a boss was alive (shield-absorbed hits count too)
    laserHits: number;   // Crimson Eclipse rotating beams (CrimsonEclipse.ts)
    rockHits: number;    // Entropy Titan rock / rubble ticks (BossHazards 'rock')
    startFrame: number;
}

export const FEAT_FAST_SEC = 60;  // boss down inside a minute

export const resetBossFlags = (state: MutableGameState) => {
    state.bossFlags = { hits: 0, laserHits: 0, rockHits: 0, startFrame: state.frame };
};

export const bossHit = (state: MutableGameState) => { if (state.bossFlags) state.bossFlags.hits++; };
export const laserHit = (state: MutableGameState) => { if (state.bossFlags) state.bossFlags.laserHits++; };
export const rockHit = (state: MutableGameState) => { if (state.bossFlags) state.bossFlags.rockHits++; };

/** Feats earned by the fight that just ended. */
export const bossFeats = (state: MutableGameState, bossId: string): string[] => {
    const f = state.bossFlags;
    if (!f) return [];
    const out: string[] = [];
    const secs = (state.frame - f.startFrame) / 60;
    if (f.hits === 0) out.push(`${bossId}:flawless`);
    if (secs <= FEAT_FAST_SEC) out.push(`${bossId}:fast`);
    if (secs >= BOSS_ENRAGE_SEC) out.push(`${bossId}:enraged`);   // beat it after it enraged
    if (bossId === 'crimson_eclipse' && f.laserHits === 0) out.push('crimson_eclipse:no_laser');
    if (bossId === 'entropy_titan' && f.rockHits === 0) out.push('entropy_titan:no_rock');
    return out;
};
