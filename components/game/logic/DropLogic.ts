import { MutableGameState } from '../types';
import { PlayerStats } from '../../../types';
import { audio } from '../audio';
import { MERCY_MULTIPLIERS } from '../mercy';
import { swapRemoveDrop, releaseDrop } from '../ObjectPools';

export const WAVE_CLEAR_CONFIG = {
    hitPauseFrames: 21,       // 0.35 s
    vortexFrames: 84,         // 1.4 s
    maxVortexSprites: 40,     // Animate at most 40 sprites
    intermissionFrames: 150,  // 2.5 s
    fastIntermissionFrames: 48, // 0.8 s
    perfectWaveBonus: 0.25,   // +25% essence
};

export const updateDrops = (state: MutableGameState, stats: PlayerStats, maturityScale: number, onCollect: (amount: number) => void) => {
    const isVortexActive = (state.vortexTimer || 0) > 0;
    
    // Vortex Instant Cap: if more than 40 drops exist during vortex, instantly collect the excess!
    if (isVortexActive && state.drops.length > WAVE_CLEAR_CONFIG.maxVortexSprites) {
        const px = state.player.x;
        const py = state.player.y;
        state.drops.sort((a, b) => {
            const da = (a.x - px) * (a.x - px) + (a.y - py) * (a.y - py);
            const db = (b.x - px) * (b.x - px) + (b.y - py) * (b.y - py);
            return da - db;
        });

        let instantVal = 0;
        for (let i = WAVE_CLEAR_CONFIG.maxVortexSprites; i < state.drops.length; i++) {
            const drop = state.drops[i];
            instantVal += drop.value * stats.essenceMultiplier * MERCY_MULTIPLIERS.essenceRewardMult;
            if (drop.isKey && !drop.isSecretKey && state.mission && state.mission.type === 'COLLECT_KEYS') {
                state.mission.current++;
            }
            if (drop.isSecretKey) {
                state.secretKeyCollected = true;
            }
            if (drop.isHeart) {
                state.heartsCollected = (state.heartsCollected || 0) + 1;
            }
            releaseDrop(drop);
        }
        state.drops.length = WAVE_CLEAR_CONFIG.maxVortexSprites;
        if (instantVal > 0) {
            onCollect(instantVal);
            audio.playCollect(1.2);
        }
    }

    const basePickupRange = (state.player.size + 40) + stats.pickupRange;
    const vortexProgress = isVortexActive ? 1 - ((state.vortexTimer || 0) / WAVE_CLEAR_CONFIG.vortexFrames) : 0;
    const vortexSpeed = 10 + Math.pow(vortexProgress, 2) * 28;

    let totalCollected = 0;
    let didCollect = false;

    for (let i = state.drops.length - 1; i >= 0; i--) {
        const drop = state.drops[i];
        const dx = state.player.x - drop.x;
        const dy = state.player.y - drop.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (isVortexActive) {
            if (dist > 1) {
                const moveDist = Math.min(dist, vortexSpeed);
                drop.x += (dx / dist) * moveDist;
                drop.y += (dy / dist) * moveDist;
            }
        } else if (dist < basePickupRange && dist > 0.001) {
            drop.x += (dx / dist) * 10;
            drop.y += (dy / dist) * 10;
        }

        if (dist < state.player.size + 20) {
            totalCollected += drop.value * stats.essenceMultiplier * MERCY_MULTIPLIERS.essenceRewardMult;
            if (drop.value > 0 && state.runMods?.voidHarvesterCount > 0) {
                state.player.essenceHealProgress = (state.player.essenceHealProgress || 0) + 0.02 * state.runMods.voidHarvesterCount;
                if (state.player.essenceHealProgress >= 1.0) {
                    state.player.essenceHealProgress -= 1.0;
                    state.heartsCollected = (state.heartsCollected || 0) + 1;
                }
            }
            if (drop.isKey && !drop.isSecretKey && state.mission && state.mission.type === 'COLLECT_KEYS') {
                state.mission.current++;
            }
            if (drop.isSecretKey) {
                state.secretKeyCollected = true;
            }
            if (drop.isHeart) {
                state.heartsCollected = (state.heartsCollected || 0) + 1;
            }
            didCollect = true;
            swapRemoveDrop(state.drops, i);
        }
    }

    if (didCollect) {
        onCollect(totalCollected);
        if (isVortexActive) {
            state.vortexBatchCount = (state.vortexBatchCount || 0) + 1;
            const pitch = 1.0 + Math.min(1.2, state.vortexBatchCount * 0.04);
            audio.playCollect(pitch);
        } else {
            audio.playCollect(1.0);
        }
    }
};
