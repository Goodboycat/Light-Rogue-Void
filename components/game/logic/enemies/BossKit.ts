import { MutableGameState, Enemy, ParticleType } from '../../types';
import { VFX } from '../../Emitters';
import { spawnExplosion } from '../../Particles';
import { audio } from '../../audio';
import { MERCY_MULTIPLIERS } from '../../mercy';
import { triggerHitStop, HIT_FEEDBACK_CONFIG } from '../../HitFeedback';
import { triggerHaptic } from '../../../../utils/haptics';
import { acquireProjectile, acquireDrop, swapRemoveProjectile } from '../../ObjectPools';

export const TELEGRAPH_Dedicated_COLOR = '#fff1f2'; // Dedicated white-red color used by no VFX

export const BOSS_KIT_CONFIG = {
    maxTelegraphs: 24,
    defaultBossProjLife: 360,
    defaultMaxLiveBossProjectiles: 12,
    phaseShiftDurationFrames: 72, // 1.2 s
    exposedDamageMultiplier: 2.0,
};

export type TelegraphKind = 'circle' | 'line' | 'cone' | 'ring';

export interface TelegraphParams {
    radius?: number;       // For circle, ring, cone
    innerRadius?: number;  // For ring
    width?: number;        // For line
    length?: number;       // For line
    angle?: number;        // Angle for line, cone
    fov?: number;          // Spread angle for cone in radians
    arcAngle?: number;     // Optional cone arc width override
    color?: string;        // Default '#ef4444' (red)
}

export interface BossTelegraph {
    id: number;
    kind: TelegraphKind;
    x: number;
    y: number;
    params: TelegraphParams;
    timer: number;
    maxTimer: number;
    active: boolean;
    onComplete?: () => void;
}

// Pooled Telegraph array (max 24)
export const TELEGRAPH_POOL: BossTelegraph[] = Array.from({ length: BOSS_KIT_CONFIG.maxTelegraphs }, (_, i) => ({
    id: i,
    kind: 'circle',
    x: 0,
    y: 0,
    params: {},
    timer: 0,
    maxTimer: 1,
    active: false
}));

/**
 * Creates a telegraphed ground marker from pooled array (max 24).
 * Plays warning audio cue and triggers screen-edge flash in boss color.
 */
export function telegraph(
    state: MutableGameState,
    kind: TelegraphKind,
    x: number,
    y: number,
    params: TelegraphParams,
    frames: number,
    onComplete?: () => void
): BossTelegraph {
    // Find free pool item or reclaim oldest
    let item = TELEGRAPH_POOL.find(t => !t.active);
    if (!item) {
        item = TELEGRAPH_POOL.reduce((oldest, current) => current.timer < oldest.timer ? current : oldest, TELEGRAPH_POOL[0]);
    }

    item.kind = kind;
    item.x = x;
    item.y = y;
    item.params = { ...params, color: TELEGRAPH_Dedicated_COLOR };
    item.timer = frames;
    item.maxTimer = Math.max(1, frames);
    item.active = true;
    item.onComplete = onComplete;

    // Telegraph audio warning cue
    try {
        if (audio && typeof audio.playCollect === 'function') {
            audio.playCollect(0.6); // Low warning pitch
        }
    } catch (e) { /* ignore */ }

    // 0.15 s (9 frames) screen edge flash in dedicated telegraph color
    state.edgeFlash = { color: TELEGRAPH_Dedicated_COLOR, timer: 9 };

    return item;
}

/**
 * Updates all active telegraphs per frame.
 * Calls onComplete when wind-up reaches 0.
 */
export function updateTelegraphs(state: MutableGameState) {
    if (state.edgeFlash && state.edgeFlash.timer > 0) {
        state.edgeFlash.timer--;
    }

    for (let i = 0; i < TELEGRAPH_POOL.length; i++) {
        const t = TELEGRAPH_POOL[i];
        if (!t.active) continue;

        t.timer--;
        if (t.timer <= 0) {
            t.active = false;
            if (t.onComplete) {
                t.onComplete();
            }
        }
    }
}

/**
 * Cancels all active telegraphs/wind-ups in progress (e.g. on boss paralysis or death).
 */
export function cancelAllTelegraphs() {
    for (let i = 0; i < TELEGRAPH_POOL.length; i++) {
        TELEGRAPH_POOL[i].active = false;
        TELEGRAPH_POOL[i].onComplete = undefined;
    }
}

/**
 * Attack budget: counts live boss projectiles in state.projectiles.
 */
export function countLiveBossProjectiles(state: MutableGameState, bossId?: string): number {
    let count = 0;
    for (let i = 0; i < state.projectiles.length; i++) {
        const p = state.projectiles[i];
        if (p.isEnemy && p.customData?.isBossProj) {
            if (!bossId || p.customData?.bossId === bossId) {
                count++;
            }
        }
    }
    return count;
}

export function canSpawnBossProjectile(
    state: MutableGameState, 
    bossId?: string, 
    count: number = 1, 
    maxCap = BOSS_KIT_CONFIG.defaultMaxLiveBossProjectiles
): boolean {
    const live = countLiveBossProjectiles(state, bossId);
    return live + count <= maxCap;
}

/**
 * Helper to push a boss projectile into state.projectiles if within attack budget.
 * Spawns beyond cap are skipped, never queued.
 */
export function spawnBossProjectile(
    state: MutableGameState,
    proj: any,
    bossId?: string,
    maxCap = BOSS_KIT_CONFIG.defaultMaxLiveBossProjectiles
): boolean {
    if (!canSpawnBossProjectile(state, bossId, 1, maxCap)) {
        return false; // Skipped, never queued
    }

    const rawDamage = typeof proj.damage === 'number' ? proj.damage : 1;
    const scaledDamage = rawDamage > 0 ? Math.max(1, Math.round(rawDamage * MERCY_MULTIPLIERS.bossDamageMult)) : 0;

    state.projectiles.push(acquireProjectile({
        life: BOSS_KIT_CONFIG.defaultBossProjLife,
        ...proj,
        damage: scaledDamage,
        isEnemy: true,
        customData: {
            isBossProj: true,
            bossId,
            ...(proj.customData || {})
        }
    }));
    return true;
}

export interface BossPhaseDef {
    hpPct: number; // e.g. 0.65 for 65%
    onEnter?: (state: MutableGameState, boss: Enemy) => void;
}

/**
 * Phase manager: handles 1.2 s invulnerable phase shifts, clears projectiles, drops 6 essence + 1 heart.
 */
export function checkBossPhaseShift(
    state: MutableGameState,
    boss: Enemy,
    phases: BossPhaseDef[]
) {
    if (!boss.state.phase) boss.state.phase = 1;
    const currentPhase = boss.state.phase;
    if (currentPhase - 1 >= phases.length) return;

    const nextPhaseDef = phases[currentPhase - 1];
    const currentHpPct = boss.hp / boss.maxHp;

    if (currentHpPct <= nextPhaseDef.hpPct) {
        // Trigger Phase Shift
        boss.state.phase = currentPhase + 1;
        boss.state.custom = boss.state.custom || {};
        boss.state.custom.phaseShiftTimer = BOSS_KIT_CONFIG.phaseShiftDurationFrames;
        boss.projectileImmunity = BOSS_KIT_CONFIG.phaseShiftDurationFrames;

        // Clear boss projectiles via swapRemoveProjectile
        for (let i = state.projectiles.length - 1; i >= 0; i--) {
            if (state.projectiles[i].customData?.isBossProj) {
                swapRemoveProjectile(state.projectiles, i);
            }
        }

        // Drop 6 essence orbs and 1 heart
        for (let i = 0; i < 6; i++) {
            const angle = (i / 6) * Math.PI * 2;
            const dist = 40 + Math.random() * 30;
            state.drops.push(acquireDrop({
                x: boss.x + Math.cos(angle) * dist,
                y: boss.y + Math.sin(angle) * dist,
                value: 15
            }));
        }
        // Drop 1 heart
        state.drops.push(acquireDrop({
            x: boss.x,
            y: boss.y + 20,
            value: 0,
            isHeart: true
        }));

        // Visual effects, 4-frame hit-stop, phase shift stinger, and 80ms haptic
        triggerHitStop(state, HIT_FEEDBACK_CONFIG.bossPhaseHitStopFrames);
        triggerHaptic('bossPhase', state.settings);
        VFX.castShockwave(state, boss.x, boss.y, boss.def.glowColor || '#fbbf24');
        spawnExplosion(state, boss.x, boss.y, '#ffffff', ParticleType.RING);
        try {
            if (audio && typeof audio.playPhaseShiftStinger === 'function') {
                audio.playPhaseShiftStinger();
            } else if (audio && typeof audio.playLevelUp === 'function') {
                audio.playLevelUp();
            }
        } catch (e) {}

        if (nextPhaseDef.onEnter) {
            nextPhaseDef.onEnter(state, boss);
        }
    }
}

/**
 * Updates exposed timer tick and phase shift timer.
 */
export function updateBossKitState(state: MutableGameState, boss: Enemy) {
    boss.state.custom = boss.state.custom || {};

    // Phase shift timer
    if (boss.state.custom.phaseShiftTimer && boss.state.custom.phaseShiftTimer > 0) {
        boss.state.custom.phaseShiftTimer--;
        if (state.frame % 4 === 0) {
            VFX.spark(state, boss.x + (Math.random() - 0.5) * boss.size, boss.y + (Math.random() - 0.5) * boss.size, '#ffffff', 4);
        }
    }

    // Exposed timer (vulnerability window)
    if (boss.state.custom.exposedTimer && boss.state.custom.exposedTimer > 0) {
        boss.state.custom.exposedTimer--;
        if (state.frame % 3 === 0) {
            VFX.spark(state, boss.x + (Math.random() - 0.5) * boss.size, boss.y + (Math.random() - 0.5) * boss.size, '#fbbf24', 2);
        }
    }
}
