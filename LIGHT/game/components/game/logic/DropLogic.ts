import { MutableGameState } from '../types';
import { onBurstEssence } from './LightBurst';
import { PlayerStats } from '../../../types';
import { swapRemoveDrop } from '../Pools';
import { collectRelic } from './WorldInteract';

export const updateDrops = (state: MutableGameState, stats: PlayerStats, maturityScale: number, onCollect: (amount: number) => void) => {
    // Removed large base constant (was 100).
    // Now creates a tight magnetic field around the player that requires upgrades to expand.
    const pickupRange = (state.player.size + 40) + stats.pickupRange + (state.runModifiers?.pickupRangeAdd ?? 0); // (3A) Hollow Crown
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
            if (drop.relicId) { collectRelic(state, drop.relicId); swapRemoveDrop(state.drops, i); continue; } // (3A)
            const amount = drop.value * stats.essenceMultiplier * (1 + (state.runModifiers?.essenceMult ?? 0)); // (3A) Greed / Crown
            onCollect(amount);
            onBurstEssence(state, drop.value); // (3B step 6)
            swapRemoveDrop(state.drops, i); // (4A) O(1), recycled
        }
    }
};