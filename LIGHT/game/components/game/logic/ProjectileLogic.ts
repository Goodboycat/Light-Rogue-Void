
import { MutableGameState } from '../types';
import { PlayerStats } from '../../../types';
import { updateProjectileMovement } from './projectiles/MovementLogic';
import { updateProjectileVisuals } from './projectiles/VisualsLogic';
import { checkProjectileCollisions } from './projectiles/CollisionLogic';
import { swapRemoveProjectile } from '../Pools';

export const updateProjectiles = (state: MutableGameState, onDamage: (amt: number) => void, playerStats?: PlayerStats) => {
    for (let i = state.projectiles.length - 1; i >= 0; i--) {
        const p = state.projectiles[i];
        p.life--;

        // Update Warmup
        if (p.customData?.warmup > 0) {
            p.customData.warmup--;
        }

        // Update Death Ray Rotation
        if (p.visualType === 'DEATH_RAY') {
            if (p.customData) {
                p.customData.angle = (p.customData.angle || 0) + (p.customData.angularVelocity || 0);
            }
            // Keep position attached to boss if needed, but current implementation spawns it at boss X,Y and doesn't move it. 
            // If boss moves, beam might detach visually. For simplicity, we assume boss stays relatively close or beam is independent.
            // To attach to boss, we'd need a reference ID.
        }

        // 1. Movement
        updateProjectileMovement(state, p, i);

        // 2. Visuals
        updateProjectileVisuals(state, p);

        // 3. Collision
        const shouldDestroy = checkProjectileCollisions(state, p, i, onDamage, playerStats);

        // 4. Lifecycle
        if (shouldDestroy || p.life <= 0) {
            swapRemoveProjectile(state.projectiles, i); // (4A) O(1), recycled
        }
    }
};
