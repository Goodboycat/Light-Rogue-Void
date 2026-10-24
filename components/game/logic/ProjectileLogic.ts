import { MutableGameState, DamageSource } from '../types';
import { PlayerStats } from '../../../types';
import { updateProjectileMovement } from './projectiles/MovementLogic';
import { updateProjectileVisuals } from './projectiles/VisualsLogic';
import { checkProjectileCollisions } from './projectiles/CollisionLogic';
import { swapRemoveProjectile } from '../ObjectPools';

export const updateProjectiles = (state: MutableGameState, onDamage: (amt: number, source?: DamageSource) => void, playerStats?: PlayerStats) => {
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
        }

        // 1. Movement
        updateProjectileMovement(state, p, i);

        // 2. Visuals
        updateProjectileVisuals(state, p);

        // 3. Collision
        const shouldDestroy = checkProjectileCollisions(state, p, i, onDamage, playerStats);

        // 4. Lifecycle (swap-remove + return to pool + decrement firefly counter)
        if (shouldDestroy || p.life <= 0) {
            swapRemoveProjectile(state.projectiles, i, (removed) => {
                if (removed.visualType === 'FIREFLY') {
                    state.fireflyCount = Math.max(0, (state.fireflyCount || 1) - 1);
                }
            });
        }
    }

    // 5. Enforce hard projectile budget (< 360) by evicting shortest-lived non-firefly projectiles
    const MAX_PROJECTILES = 360;
    while (state.projectiles.length > MAX_PROJECTILES) {
        let evictIdx = 0;
        let minLife = Infinity;
        for (let i = 0; i < state.projectiles.length; i++) {
            const p = state.projectiles[i];
            if (p.visualType !== 'FIREFLY' && p.life < minLife) {
                minLife = p.life;
                evictIdx = i;
            }
        }
        swapRemoveProjectile(state.projectiles, evictIdx, (removed) => {
            if (removed.visualType === 'FIREFLY') {
                state.fireflyCount = Math.max(0, (state.fireflyCount || 1) - 1);
            }
        });
    }
};
