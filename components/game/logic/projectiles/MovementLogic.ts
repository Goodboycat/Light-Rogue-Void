
import { MutableGameState, Projectile } from '../../types';
import { ParticleType } from '../../types';
import { createParticle } from '../../Particles';

export const updateProjectileMovement = (state: MutableGameState, p: Projectile, i: number) => {
    // --- SPECIAL MOVEMENT LOGIC ---
    if (p.visualType === 'HOMING_MISSILE') {
        let targetX = 0;
        let targetY = 0;
        let hasTarget = false;

        if (p.isEnemy) {
            // Enemy missile tracks player
            targetX = state.player.x;
            targetY = state.player.y;
            hasTarget = true;
        } else {
            // Player missile tracks enemies
            let closest = null;
            let minD = 800;
            for(const e of state.enemies) {
                const d = Math.hypot(e.x - p.x, e.y - p.y);
                if (d < minD) {
                    minD = d;
                    closest = e;
                }
            }
            if (closest) {
                targetX = closest.x;
                targetY = closest.y;
                hasTarget = true;
            }
        }

        if (hasTarget) {
            const angle = Math.atan2(targetY - p.y, targetX - p.x);
            // Turn rate
            p.vx += (Math.cos(angle) * 0.5);
            p.vy += (Math.sin(angle) * 0.5);
            
            const speed = Math.hypot(p.vx, p.vy);
            const MAX_SPEED = p.isEnemy ? 6 : 8; // Enemy missiles slightly slower
            if (speed > MAX_SPEED) {
                p.vx = (p.vx / speed) * MAX_SPEED;
                p.vy = (p.vy / speed) * MAX_SPEED;
            }
        } else if (p.isEnemy && p.vx === 0 && p.vy === 0) {
             // If enemy missile has no velocity (just spawned) and for some reason no target (unlikely), nudge it towards center
             const angle = Math.atan2(state.player.y - p.y, state.player.x - p.x);
             p.vx = Math.cos(angle) * 2;
             p.vy = Math.sin(angle) * 2;
        }

        if (state.frame % 3 === 0) {
                createParticle(state, p.x, p.y, ParticleType.SMOKE, p.color, { life: 10, size: 4 });
        }
    }
    else if (p.visualType === 'FIREFLY') {
        const idx = i; 
        const time = state.frame * 0.05;
        const radius = 60 + Math.sin(time + idx) * 20;
        const targetX = state.player.x + Math.cos(time + idx) * radius;
        const targetY = state.player.y + Math.sin(time * 0.8 + idx) * radius;
        p.vx = (targetX - p.x) * 0.1;
        p.vy = (targetY - p.y) * 0.1;
        p.life = 9999; 
    }
    else if (p.visualType === 'LUX_BLADE') {
        // Boomerang Logic
        // Acceleration towards player
        const dx = state.player.x - p.x;
        const dy = state.player.y - p.y;
        
        const returnForce = 0.5; // Acceleration back
        p.vx += (dx * 0.005) + (dx > 0 ? returnForce : -returnForce) * 0.05; 
        p.vy += (dy * 0.005) + (dy > 0 ? returnForce : -returnForce) * 0.05;
        
        // Cap speed
        const speed = Math.hypot(p.vx, p.vy);
        const MAX_SPEED = 20;
        if (speed > MAX_SPEED) {
            p.vx = (p.vx / speed) * MAX_SPEED;
            p.vy = (p.vy / speed) * MAX_SPEED;
        }

        // If very close to player and moving fast enough (returning), catch it
        // Or simpler: Just time based life kills it, but visually it looks like it returns.
        // We'll let life kill it, but if it hits player, we can despawn it for a "catch" effect
        if (p.life < 280) { // Give it a moment to leave player
             const dist = Math.hypot(dx, dy);
             if (dist < 20) {
                 p.life = 0; // Caught
             }
        }
    }
    else if (p.visualType === 'SOLAR_BARRIER') {
        // Expands in thickness slightly
        p.size += 0.2;
        // Expands in length rapidly
        if (p.customData) {
            p.customData.currentLength = (p.customData.currentLength || 60) + (p.customData.growthRate || 30);
        }
    }

    if (!p.isStatic) {
        p.x += p.vx;
        p.y += p.vy;
    }
};
