import { MutableGameState } from '../types';
import { PlayerStats } from '../../../types';
import { swapRemoveDrop } from '../Pools';

export const updateDrops = (state: MutableGameState, stats: PlayerStats, maturityScale: number, onCollect: (amount: number) => void) => {
    // Removed large base constant (was 100).
    // Now creates a tight magnetic field around the player that requires upgrades to expand.
    const pickupRange = (state.player.size + 40) + stats.pickupRange;
    const magnetSpeed = 10;

    for (let i = state.drops.length - 1; i >= 0; i--) {
        const drop = state.drops[i];
        const dx = state.player.x - drop.x;
        const dy = state.player.y - drop.y;
        const dist = Math.sqrt(dx*dx + dy*dy);

        if (dist < pickupRange) {
            drop.x += (dx / dist) * magnetSpeed;
            drop.y += (dy / dist) * magnetSpeed;
        }

        if (dist < state.player.size + 20) {
            // Collected
            const amount = drop.value * stats.essenceMultiplier;
            onCollect(amount);
            swapRemoveDrop(state.drops, i); // (4A) O(1), recycled
        }
    }
};