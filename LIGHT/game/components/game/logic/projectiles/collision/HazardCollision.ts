
import { MutableGameState, Projectile, ParticleType } from '../../../types';
import { spawnExplosion, createParticle } from '../../../Particles';
import { VFX } from '../../../Emitters';

export const checkHazardCollisions = (
    state: MutableGameState, 
    p: Projectile, 
    onDamage: (amt: number) => void
): boolean => {

    // --- VOID TRAIL ---
    if (p.visualType === 'VOID_TRAIL') {
        const spawnFrame = p.customData?.spawnFrame || 0;
        const age = state.frame - spawnFrame;
        const WARMUP = 60; // 1 second safe time

        if (age < WARMUP) return false;

        // Emit gas bubbles/smoke occasionally
        if (state.frame % 15 === 0) {
             const angle = Math.random() * Math.PI * 2;
             const r = Math.random() * p.size * 0.7; // Keep inside
             // Rising smoke particle
             createParticle(state, p.x + Math.cos(angle)*r, p.y + Math.sin(angle)*r, ParticleType.SMOKE, '#4338ca', { 
                 life: 50, 
                 size: 4 + Math.random() * 4, 
                 speed: 0.2, 
                 alpha: 0.4,
                 vx: 0,
                 vy: -0.5 // Rise up
             });
        }
        return p.life <= 0;
    }

    // --- VOID MINE ---
    if (p.visualType === 'VOID_MINE') {
        p.size *= 0.99; 
        
        // Particle effects
        const particleCount = 2;
        const spawnRadius = p.size + 40;
        const spiralSpeed = 5;
        for (let k = 0; k < particleCount; k++) {
            const angle = (state.frame * 0.2) + (k * Math.PI);
            const spawnX = p.x + Math.cos(angle) * spawnRadius;
            const spawnY = p.y + Math.sin(angle) * spawnRadius;
            const dirX = p.x - spawnX;
            const dirY = p.y - spawnY;
            const dist = Math.sqrt(dirX*dirX + dirY*dirY);
            if (dist > 0) createParticle(state, spawnX, spawnY, ParticleType.VOID, '#202020', { vx: (dirX/dist)*spiralSpeed, vy: (dirY/dist)*spiralSpeed, life: 20, size: 3 });
        }

        if (p.life <= 0) {
            spawnExplosion(state, p.x, p.y, '#ffffff', ParticleType.VOID);
            VFX.castShockwave(state, p.x, p.y, '#000000');
            
            // Explosion Damage check
            if (!state.player.isTitanShieldActive) {
                const dx = state.player.x - p.x;
                const dy = state.player.y - p.y;
                const dist = Math.hypot(dx, dy);
                if (dist < 200) { // Explosion radius
                    onDamage(p.damage);
                    VFX.spark(state, state.player.x, state.player.y, '#ffffff', 10);
                    const angle = Math.atan2(dy, dx);
                    state.player.vx += Math.cos(angle) * 30;
                    state.player.vy += Math.sin(angle) * 30;
                }
            }
            return true;
        }
        return false;
    }

    // --- RAILGUN ---
    if (p.visualType === 'RAILGUN_BEAM') {
        const age = p.customData?.spawnFrame ? state.frame - p.customData.spawnFrame : 0;
        const isPermanent = p.life > 9000;
        const isActive = isPermanent ? age > 60 : p.life <= 80;

        if (isActive) {
            if (!state.player.isTitanShieldActive && state.player.dashTimer <= 0) {
                    const isHorizontal = p.vx > 0.5;
                    const width = p.size; 
                    const halfWidth = width / 2;
                    const pSize = state.player.size;
                    const hitThreshold = halfWidth + pSize + 15;
                    
                    let hit = false;
                    let pushX = 0;
                    let pushY = 0;

                    if (isHorizontal) {
                        const distY = state.player.y - p.y;
                        if (Math.abs(distY) < hitThreshold) {
                            hit = true;
                            pushY = Math.sign(distY) * 20;
                            if (pushY === 0) pushY = 20;
                        }
                    } else {
                        const distX = state.player.x - p.x;
                        if (Math.abs(distX) < hitThreshold) {
                            hit = true;
                            pushX = Math.sign(distX) * 20;
                            if (pushX === 0) pushX = 20;
                        }
                    }
                    
                    if (hit) {
                        onDamage(p.damage);
                        VFX.spark(state, state.player.x, state.player.y, '#f472b6', 15);
                        state.player.vx += pushX;
                        state.player.vy += pushY;
                    }
            }
        }
        return false; 
    }

    // --- TOXIC CLOUD ---
    if (p.visualType === 'TOXIC_CLOUD') {
        if (p.customData?.warmup > 0) return false;

        if (!state.player.isTitanShieldActive) {
            const dx = p.x - state.player.x;
            const dy = p.y - state.player.y;
            if (Math.hypot(dx, dy) < p.size) {
                if (state.frame % 30 === 0) {
                    onDamage(p.damage); 
                    VFX.spark(state, state.player.x, state.player.y, '#10b981', 3);
                }
            }
        }
        return false;
    }

    // --- SOLAR FLARE (BOSS/ENEMY) ---
    if (p.visualType === 'SOLAR_FLARE') {
        const spawnFrame = p.customData?.spawnFrame || 0;
        const age = state.frame - spawnFrame;
        const SURGE_TIME = 120;
        const isWarning = age < SURGE_TIME;

        if (!isWarning && !state.player.isTitanShieldActive) {
            const dx = p.x - state.player.x;
            const dy = p.y - state.player.y;
            // Strict circle collision
            if (Math.hypot(dx, dy) < p.size) {
                if (state.frame % 5 === 0) {
                    onDamage(p.damage); 
                    VFX.spark(state, state.player.x, state.player.y, '#fbbf24', 5);
                }
            }
        }
        return false;
    }
    
    // --- GENERIC IMPACT ---
    if (!state.player.isTitanShieldActive) {
        const dx = p.x - state.player.x;
        const dy = p.y - state.player.y;
        if (Math.hypot(dx, dy) < state.player.size + p.size) {
            if (state.player.dashTimer <= 0) {
                onDamage(p.damage);
                VFX.spark(state, p.x, p.y, p.color, 10);
                if (!p.isStatic) return true;
            }
        }
    }

    return false;
};
