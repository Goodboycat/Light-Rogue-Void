import { MutableGameState } from './types';

export interface FloatingDamageNumber {
    active: boolean;
    x: number;
    y: number;
    vy: number;
    value: number;
    life: number;
    maxLife: number;
    isCritOrBig: boolean;
}

export const DAMAGE_NUMBER_POOL_SIZE = 40;

export const DAMAGE_NUMBER_POOL: FloatingDamageNumber[] = Array.from(
    { length: DAMAGE_NUMBER_POOL_SIZE },
    () => ({
        active: false,
        x: 0,
        y: 0,
        vy: -1.2,
        value: 0,
        life: 0,
        maxLife: 28,
        isCritOrBig: false,
    })
);

let nextPoolIndex = 0;

/**
 * Spawns a floating damage number from the fixed 40-slot pool.
 * Only spawns for hits > 5% of enemy max HP, and is completely disabled in LOW performance mode.
 */
export function spawnFloatingDamageNumber(
    state: MutableGameState | undefined,
    x: number,
    y: number,
    damage: number,
    enemyMaxHp: number
) {
    if (state && state.performanceMode === 'LOW') return;
    if (enemyMaxHp <= 0 || damage <= enemyMaxHp * 0.05) return;

    const rounded = Math.max(1, Math.round(damage));

    // Reuse an inactive slot, or overwrite the oldest via ring index
    let slot: FloatingDamageNumber | null = null;
    for (let i = 0; i < DAMAGE_NUMBER_POOL_SIZE; i++) {
        const candidate = DAMAGE_NUMBER_POOL[i];
        if (!candidate.active) {
            slot = candidate;
            break;
        }
    }
    if (!slot) {
        slot = DAMAGE_NUMBER_POOL[nextPoolIndex];
        nextPoolIndex = (nextPoolIndex + 1) % DAMAGE_NUMBER_POOL_SIZE;
    }

    slot.active = true;
    slot.x = x + (Math.random() - 0.5) * 14;
    slot.y = y - 10;
    slot.vy = -1.3;
    slot.value = rounded;
    slot.life = 28;
    slot.maxLife = 28;
    slot.isCritOrBig = damage >= enemyMaxHp * 0.25;
}

export function updateFloatingDamageNumbers() {
    for (let i = 0; i < DAMAGE_NUMBER_POOL_SIZE; i++) {
        const d = DAMAGE_NUMBER_POOL[i];
        if (!d.active) continue;
        d.y += d.vy;
        d.vy *= 0.94;
        d.life--;
        if (d.life <= 0) {
            d.active = false;
        }
    }
}

/**
 * Draws all active floating damage numbers in a single batched text pass.
 */
export function drawFloatingDamageNumbersBatched(
    ctx: CanvasRenderingContext2D,
    performanceMode?: 'LOW' | 'MEDIUM' | 'HIGH'
) {
    if (performanceMode === 'LOW') return;

    let anyActive = false;
    for (let i = 0; i < DAMAGE_NUMBER_POOL_SIZE; i++) {
        if (DAMAGE_NUMBER_POOL[i].active) {
            anyActive = true;
            break;
        }
    }
    if (!anyActive) return;

    ctx.save();
    ctx.font = 'bold 13px monospace';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#fef08a';
    ctx.strokeStyle = '#020617';
    ctx.lineWidth = 2.5;

    for (let i = 0; i < DAMAGE_NUMBER_POOL_SIZE; i++) {
        const d = DAMAGE_NUMBER_POOL[i];
        if (!d.active) continue;
        const alpha = d.life < 10 ? d.life / 10 : 1.0;
        ctx.globalAlpha = alpha;
        const label = String(d.value);
        ctx.strokeText(label, d.x, d.y);
        ctx.fillText(label, d.x, d.y);
    }

    ctx.restore();
}

export const HIT_FEEDBACK_CONFIG = {
    maxShakeAmplitude: 12,
    shakeDecayPerFrame: 0.85,
    hitStopMinIntervalMs: 150,
    eliteKillHitStopFrames: 2,
    bossPhaseHitStopFrames: 4,
    playerHurtVignetteFrames: 6,
    enemyHitFlashFrames: 2,
};

/**
 * Adds screen shake within the 12 px maximum amplitude budget.
 */
export function addScreenShake(state: MutableGameState, amount: number) {
    const current = state.camera.shake || 0;
    state.camera.shake = Math.min(
        HIT_FEEDBACK_CONFIG.maxShakeAmplitude,
        current + amount
    );
}

/**
 * Triggers a hit-stop (2 frames on elite kills, 4 on boss phase end), guarded so at most one occurs per 150 ms.
 */
export function triggerHitStop(state: MutableGameState, frames: number) {
    const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
    const last = state.lastHitStopMs || 0;
    if (now - last < HIT_FEEDBACK_CONFIG.hitStopMinIntervalMs) {
        return;
    }
    state.lastHitStopMs = now;
    state.hitPauseTimer = Math.max(state.hitPauseTimer || 0, frames);
}

/**
 * Applies knockback to a non-boss enemy scaled by hit damage relative to enemy maxHp and size.
 */
export function applyHitKnockback(
    enemy: any,
    sourceX: number,
    sourceY: number,
    damage: number
) {
    if (!enemy || enemy.isBoss) return;
    const dx = enemy.x - sourceX;
    const dy = enemy.y - sourceY;
    const dist = Math.hypot(dx, dy);
    if (dist <= 0.001) return;

    const maxHp = Math.max(1, enemy.maxHp || 20);
    const hitRatio = Math.min(1.5, Math.max(0.15, damage / maxHp));
    const sizeResistance = Math.max(0.35, Math.min(1.2, 16 / Math.max(8, enemy.size || 16)));
    const impulse = (2.5 + hitRatio * 7.5) * sizeResistance;

    enemy.vx = (enemy.vx || 0) + (dx / dist) * impulse;
    enemy.vy = (enemy.vy || 0) + (dy / dist) * impulse;
}
