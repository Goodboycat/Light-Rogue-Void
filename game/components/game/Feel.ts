// (4A) Action feel — port of fork `HitFeedback.ts` (translate/audio/mercy/LOW branches stripped).
// hit-stop, screen shake, enemy hit flash, damage floaters, kill streaks, player hurt pulse.
// All state lives on `MutableGameState` (optional fields, see types.ts) so the headless sim
// and `?debug=1` can read it. Settings toggles: `screenShake`, `reduceFlash`.
import { MutableGameState, Enemy } from './types';
import {
    HIT_STOP_MAX_FRAMES, HIT_STOP_MIN_INTERVAL, SHAKE_MAX_AMP, SHAKE_DECAY,
    ENEMY_FLASH_FRAMES, FLOATER_POOL_SIZE, FLOATER_LIFE, FLOATER_GROUP_FRAMES,
    FLOATER_MIN_PCT, FLOATER_CRIT_PCT, STREAK_WINDOW_FRAMES, STREAK_TIERS,
    STREAK_ESSENCE_PER_10, STREAK_ESSENCE_CAP, STREAK_BANNER_FRAMES,
    PLAYER_IFRAMES, HURT_VIGNETTE_FRAMES,
} from './Constants';
import { ARMORED_DMG_TAKEN } from '../../data/affixes';

export interface FeelSettings { screenShake: boolean; reduceFlash: boolean }
export const DEFAULT_FEEL: FeelSettings = { screenShake: true, reduceFlash: false };

/** Per-process toggles mirrored from Settings each frame (cheap, avoids threading settings everywhere). */
export const feel: FeelSettings = { ...DEFAULT_FEEL };
export const setFeelSettings = (s: Partial<FeelSettings>) => {
    if (s.screenShake !== undefined) feel.screenShake = s.screenShake;
    if (s.reduceFlash !== undefined) feel.reduceFlash = s.reduceFlash;
};

// ---------------------------------------------------------------- hit-stop
/** Freeze the update for `frames` (≤ HIT_STOP_MAX_FRAMES), at most once per HIT_STOP_MIN_INTERVAL frames. */
export const hitStop = (state: MutableGameState, frames: number) => {
    const last = state.lastHitStopFrame ?? -1000;
    if (state.frame - last < HIT_STOP_MIN_INTERVAL) return;
    state.lastHitStopFrame = state.frame;
    state.hitStopFrames = Math.max(state.hitStopFrames ?? 0, Math.min(HIT_STOP_MAX_FRAMES, frames));
};

/** Call at the top of updateGame; returns true if this frame should be skipped. */
export const consumeHitStop = (state: MutableGameState): boolean => {
    if ((state.hitStopFrames ?? 0) > 0) { state.hitStopFrames!--; return true; }
    return false;
};

// ---------------------------------------------------------------- shake
/** Add camera shake (amplitude px, budgeted to SHAKE_MAX_AMP). `frames` scales the decay hold. */
export const shake = (state: MutableGameState, amp: number, frames = 6) => {
    if (!feel.screenShake) return;
    state.shakeAmp = Math.min(SHAKE_MAX_AMP, (state.shakeAmp ?? 0) + amp);
    state.shakeHold = Math.max(state.shakeHold ?? 0, frames);
};

/** Advance shake; writes `state.shakeX/Y` (renderer adds them to the camera). */
export const updateShake = (state: MutableGameState) => {
    const amp = state.shakeAmp ?? 0;
    if (amp < 0.2) { state.shakeAmp = 0; state.shakeX = 0; state.shakeY = 0; return; }
    const a = Math.random() * Math.PI * 2;
    state.shakeX = Math.cos(a) * amp;
    state.shakeY = Math.sin(a) * amp;
    if ((state.shakeHold ?? 0) > 0) state.shakeHold!--;
    else state.shakeAmp = amp * SHAKE_DECAY;
};

// ---------------------------------------------------------------- flash
/** White tint on an enemy for ENEMY_FLASH_FRAMES. */
export const flash = (enemy: Enemy, frames = ENEMY_FLASH_FRAMES) => {
    if (feel.reduceFlash) frames = Math.min(frames, 1);
    enemy.flashTimer = Math.max(enemy.flashTimer ?? 0, frames);
};

// ---------------------------------------------------------------- floaters
export interface Floater {
    active: boolean;
    x: number; y: number; vy: number;
    value: number;
    life: number;
    crit: boolean;
    /** enemy this floater is accumulating for (grouping window) */
    owner?: Enemy;
    bornFrame: number;
}

export const makeFloaterPool = (): Floater[] => Array.from({ length: FLOATER_POOL_SIZE }, () => ({
    active: false, x: 0, y: 0, vy: 0, value: 0, life: 0, crit: false, owner: undefined, bornFrame: 0,
}));

let floaterRing = 0;

/**
 * Damage number. Grouped: hits on the same enemy within FLOATER_GROUP_FRAMES add to the
 * existing number instead of spawning a new one. Skips chip damage (< FLOATER_MIN_PCT of maxHp).
 */
export const spawnFloater = (state: MutableGameState, enemy: Enemy, damage: number) => {
    if (!(damage > 0)) return;
    if (!state.floaters) state.floaters = makeFloaterPool();
    const pool = state.floaters;
    const maxHp = Math.max(1, enemy.maxHp);

    // group onto a recent floater of the same enemy
    for (let i = 0; i < pool.length; i++) {
        const f = pool[i];
        if (f.active && f.owner === enemy && state.frame - f.bornFrame < FLOATER_GROUP_FRAMES) {
            f.value += damage;
            f.crit = f.crit || f.value >= maxHp * FLOATER_CRIT_PCT;
            return;
        }
    }

    if (damage < maxHp * FLOATER_MIN_PCT && damage < 5) return;

    let slot: Floater | undefined;
    for (let i = 0; i < pool.length; i++) if (!pool[i].active) { slot = pool[i]; break; }
    if (!slot) { slot = pool[floaterRing]; floaterRing = (floaterRing + 1) % pool.length; }

    slot.active = true;
    slot.owner = enemy;
    slot.bornFrame = state.frame;
    slot.x = enemy.x + (Math.random() - 0.5) * enemy.size;
    slot.y = enemy.y - enemy.size - 6;
    slot.vy = -1.4;
    slot.value = damage;
    slot.life = FLOATER_LIFE;
    slot.crit = damage >= maxHp * FLOATER_CRIT_PCT;
};

export const updateFloaters = (state: MutableGameState) => {
    const pool = state.floaters;
    if (!pool) return;
    for (let i = 0; i < pool.length; i++) {
        const f = pool[i];
        if (!f.active) continue;
        // follow the owner while grouping, then drift up
        if (f.owner && state.frame - f.bornFrame < FLOATER_GROUP_FRAMES) {
            f.x = f.owner.x; f.y = f.owner.y - f.owner.size - 6;
        } else {
            f.owner = undefined;
            f.y += f.vy; f.vy *= 0.93;
        }
        if (--f.life <= 0) { f.active = false; f.owner = undefined; }
    }
};

// ---------------------------------------------------------------- damage entry point
/**
 * Single call for "enemy took damage": flash + floater (+ tiny shake on big hits).
 * Does NOT subtract HP — callers keep `e.hp -= dmg` so existing logic is untouched.
 */
export const onEnemyHit = (state: MutableGameState, enemy: Enemy, damage: number) => {
    if (!(damage > 0)) return;
    // (4B) mitigation lives here because every damage path does `hp -= dmg; onEnemyHit(...)` before the death check:
    // we refund part of the hit. AEGIS TRIAL shield + SHIELDED affix block the whole hit; ARMORED refunds 30 %.
    if (enemy.aegisShielded && !enemy.isBoss) {
        enemy.hp += damage; enemy.shieldPopFrames = 6; return;
    }
    if ((enemy.shieldHits ?? 0) > 0) {
        enemy.hp += damage; enemy.shieldHits!--; enemy.shieldPopFrames = enemy.shieldHits === 0 ? 14 : 6;
        return;
    }
    if (enemy.affixes && enemy.affixes.indexOf('ARMORED') >= 0) {
        const refund = damage * (1 - ARMORED_DMG_TAKEN);
        enemy.hp += refund; damage -= refund;
    }
    // (3A) run modifiers: Ember Core (+dmg) / Watcher's Eye (enemies take more) — the extra is applied here
    const rm = state.runModifiers;
    if (rm && (rm.damageMult || rm.enemyDamageTakenMult)) {
        const mult = (1 + rm.damageMult) * (1 + rm.enemyDamageTakenMult);
        const extra = damage * (mult - 1);
        enemy.hp -= extra; damage += extra;
    }
    flash(enemy);
    spawnFloater(state, enemy, damage);
    if (enemy.isBoss && damage >= enemy.maxHp * 0.02) shake(state, 2, 3);
};

// ---------------------------------------------------------------- streaks
export interface StreakBanner { tier: number; text: string; frames: number }

const STREAK_LINES: Record<number, string[]> = {
    10: ['I am not prey.', 'Keep coming.', 'I burn brighter.'],
    25: ['The dark thins.', 'Is this all of you?', 'I will not dim.'],
    50: ['I AM THE LIGHT.', 'Nothing stops me.', 'The void flinches.'],
};

/** Call from killEnemy. Keeps `state.streak` alive within STREAK_WINDOW_FRAMES; fires banners at tiers. */
export const onKillForStreak = (state: MutableGameState, enemy: Enemy) => {
    const last = state.streakLastFrame ?? -100000;
    if (state.frame - last > STREAK_WINDOW_FRAMES) state.streak = 0;
    state.streak = (state.streak ?? 0) + 1;
    state.streakLastFrame = state.frame;
    state.bestStreak = Math.max(state.bestStreak ?? 0, state.streak);

    for (const tier of STREAK_TIERS) {
        if (state.streak === tier) {
            const lines = STREAK_LINES[tier] || STREAK_LINES[10];
            state.streakBanner = { tier, text: lines[Math.floor(Math.random() * lines.length)], frames: STREAK_BANNER_FRAMES };
            shake(state, 3 + tier / 10, 4);
            hitStop(state, tier >= 50 ? 4 : 2);
        }
    }
    if (enemy.isBoss) { hitStop(state, 4); shake(state, 10, 8); }
};

/** Essence multiplier from the current streak: +STREAK_ESSENCE_PER_10 per 10 kills, capped. */
export const streakEssenceMult = (state: MutableGameState): number => {
    const s = state.streak ?? 0;
    if (state.frame - (state.streakLastFrame ?? -100000) > STREAK_WINDOW_FRAMES) return 1;
    return 1 + Math.min(STREAK_ESSENCE_CAP, Math.floor(s / 10) * STREAK_ESSENCE_PER_10);
};

export const updateStreak = (state: MutableGameState) => {
    if (state.streakBanner && --state.streakBanner.frames <= 0) state.streakBanner = undefined;
    if ((state.streak ?? 0) > 0 && state.frame - (state.streakLastFrame ?? 0) > STREAK_WINDOW_FRAMES) state.streak = 0;
};

// ---------------------------------------------------------------- player hurt
/** Player took damage: i-frames + vignette pulse + shake. Returns false if still invulnerable. */
export const onPlayerHurt = (state: MutableGameState): boolean => {
    if ((state.playerIFrames ?? 0) > 0) return false;
    state.playerIFrames = PLAYER_IFRAMES;
    state.hurtVignette = HURT_VIGNETTE_FRAMES;
    shake(state, 6, 5);
    hitStop(state, 2);
    return true;
};

export const updatePlayerFeel = (state: MutableGameState) => {
    if ((state.playerIFrames ?? 0) > 0) state.playerIFrames!--;
    if ((state.hurtVignette ?? 0) > 0) state.hurtVignette!--;
};

/** One call per frame after the entity updates. */
export const updateFeel = (state: MutableGameState) => {
    updateShake(state);
    updateFloaters(state);
    updateStreak(state);
    updatePlayerFeel(state);
};
