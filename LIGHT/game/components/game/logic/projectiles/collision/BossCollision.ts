
import { MutableGameState, Projectile, ParticleType } from '../../../types';
import { spawnExplosion, createParticle } from '../../../Particles';
import { VFX } from '../../../Emitters';
import { PlayerStats } from '../../../../../types';

export const checkBossCollisions = (
    state: MutableGameState, 
    p: Projectile, 
    onDamage: (amt: number) => void, 
    playerStats?: PlayerStats
): boolean => {
    
    // --- CRIMSON COMET ---
    if (p.visualType === 'CRIMSON_COMET') {
        const dx = p.x - state.player.x;
        const dy = p.y - state.player.y;
        const dist = Math.hypot(dx, dy);
        
        // Generous Hitbox (80% of visual)
        const hitRad = (p.size * 0.8) + state.player.size;

        // 1. Titan Shield Block
        if (state.player.isTitanShieldActive) {
            if (dist < hitRad + 30) { 
                 VFX.spark(state, p.x, p.y, '#fbbf24', 10);
                 spawnExplosion(state, p.x, p.y, '#dc2626', ParticleType.FIRE);
                 return true; 
            }
            return false;
        }

        // 2. Dashing (Invincible)
        if (state.player.dashTimer > 0) return false;

        // 3. Direct Hit
        if (dist < hitRad) {
            onDamage(p.damage);
            
            // Heavy Visual Impact
            VFX.spark(state, state.player.x, state.player.y, '#ef4444', 20);
            spawnExplosion(state, state.player.x, state.player.y, '#dc2626', ParticleType.BOSS_AURA);
            
            // Screen Shake
            state.camera.x += (Math.random() - 0.5) * 40;
            state.camera.y += (Math.random() - 0.5) * 40;

            // Massive Knockback
            const angle = Math.atan2(dy, dx);
            state.player.vx += Math.cos(angle) * 40;
            state.player.vy += Math.sin(angle) * 40;
            
            return true; // Destroy on impact
        }
        return false;
    }

    // --- SOLAR BARRIER (Replaced Death Ray) ---
    if (p.visualType === 'SOLAR_BARRIER') {
        // If dashing, phase through
        if (state.player.dashTimer > 0) return false;
        if (state.player.isTitanShieldActive) return false;

        // Dynamic Line Collision
        // We act as if the projectile is a rectangle rotated by `p.customData.angle`
        // Center is p.x, p.y.
        // Thickness is p.size.
        // Length is p.customData.currentLength
        
        // Transform player position to local space relative to projectile center & rotation
        const angle = p.customData?.angle || 0;
        const currentLength = p.customData?.currentLength || 100;
        
        const dx = state.player.x - p.x;
        const dy = state.player.y - p.y;
        
        // Rotate -angle to align barrier with Y axis
        const cos = Math.cos(-angle);
        const sin = Math.sin(-angle);
        
        const localX = dx * cos - dy * sin; // Distance along movement vector (Thickness axis)
        const localY = dx * sin + dy * cos; // Distance along barrier length
        
        // Barrier is defined as:
        // X: [0, p.size] (It extends forward from its center point in X)
        // Y: [-length/2, +length/2]
        
        // 1. Check Length Bounds
        if (Math.abs(localY) > currentLength / 2) return false;

        // 2. Check Thickness Bounds (Collision)
        const playerRadius = state.player.size;
        
        // Check if player circle overlaps the rectangle [0, p.size] x [-len/2, len/2]
        // Simplified: Treat as AABB in local space
        if (localX > -playerRadius && localX < p.size + playerRadius) {
            
            // COLLISION DETECTED
            
            // Calculate overlap penetration
            // We push the player "forward" relative to the wall's movement direction (positive X)
            // So they get scooped up by the wall
            const pushTargetLocalX = p.size + playerRadius + 1; 
            
            const correctionLocalX = pushTargetLocalX - localX;
            
            // Transform correction back to world space
            const correctionX = Math.cos(angle) * correctionLocalX;
            const correctionY = Math.sin(angle) * correctionLocalX;
            
            // Apply Position Correction (Hard Collision)
            state.player.x += correctionX;
            state.player.y += correctionY;
            
            // Match velocity to wall to prevent jitter
            // Wall velocity
            const wallSpeed = 7; // From logic
            const wallVx = Math.cos(angle) * wallSpeed;
            const wallVy = Math.sin(angle) * wallSpeed;
            
            // Set player velocity to at least match wall speed in that direction
            state.player.vx = wallVx;
            state.player.vy = wallVy;

            // Visual Spark
            if (state.frame % 5 === 0) {
                VFX.spark(state, state.player.x, state.player.y, '#fbbf24', 5);
            }
        }
        
        return false;
    }

    // --- VOID NOVA (BOSS ULTIMATE) ---
    if (p.visualType === 'VOID_NOVA') {
        if (p.customData?.hasHit) return false; 

        if (!state.player.isTitanShieldActive) {
            const dx = p.x - state.player.x;
            const dy = p.y - state.player.y;
            const dist = Math.hypot(dx, dy);
            
            if (dist < p.size) {
                if (state.player.dashTimer > 0) {
                    VFX.spark(state, state.player.x, state.player.y, '#ffffff', 20);
                    createParticle(state, state.player.x, state.player.y, ParticleType.TEXT, '#fff', { life: 40, size: 12 });
                } else {
                    const damage = playerStats ? Math.floor(playerStats.maxHealth * 0.9) : 999;
                    onDamage(damage);
                    VFX.castShockwave(state, state.player.x, state.player.y, '#ff0000');
                    spawnExplosion(state, state.player.x, state.player.y, '#ff0000', ParticleType.VOID);
                    
                    const angle = Math.atan2(dy, dx);
                    state.player.vx -= Math.cos(angle) * 50;
                    state.player.vy -= Math.sin(angle) * 50;
                }
            }
        }
        if (!p.customData) p.customData = {};
        p.customData.hasHit = true;
        return false;
    }

    // --- VOID NOVA AFTERMATH ---
    if (p.visualType === 'VOID_NOVA_AFTERMATH') {
        const dist = Math.hypot(p.x - state.player.x, p.y - state.player.y);
        // Strong Gravity
        if (dist < p.size + 600) {
            const pullStr = 1.0;
            state.player.vx += (p.x - state.player.x) / dist * pullStr;
            state.player.vy += (p.y - state.player.y) / dist * pullStr;
        }
        // DEADLY DAMAGE ZONE
        if (dist < p.size) {
            if (!state.player.isTitanShieldActive && state.player.dashTimer <= 0) {
                onDamage(9999); // INSTANT KILL
                VFX.spark(state, state.player.x, state.player.y, '#000', 20);
                spawnExplosion(state, state.player.x, state.player.y, '#000', ParticleType.VOID);
            }
        }
        return false; 
    }

    // --- BOSS SINGULARITY ---
    if (p.visualType === 'BOSS_SINGULARITY' && p.pullRadius) {
            const dx = p.x - state.player.x;
            const dy = p.y - state.player.y;
            const dist = Math.hypot(dx, dy);
            if (dist < p.pullRadius && dist > 0.1) {
                const str = 1.5; 
                state.player.vx += (dx/dist) * str;
                state.player.vy += (dy/dist) * str;
            }
    }

    return false;
};
