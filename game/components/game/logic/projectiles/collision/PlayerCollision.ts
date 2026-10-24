
import { MutableGameState, Projectile, ParticleType } from '../../../types';
import { onEnemyHit } from '../../../Feel';
import { spawnExplosion, createParticle } from '../../../Particles';
import { VFX } from '../../../Emitters';

export const checkPlayerCollisions = (
    state: MutableGameState, 
    p: Projectile
): boolean => {
    
    // Visual only hit marker
    if (p.visualType === 'PLASMA_WHIP_HIT') {
        return true;
    }

    // --- LUX BLADE (Boomerang) ---
    // Formerly Void Blade
    if (p.visualType === 'LUX_BLADE') {
        let hasHit = false;
        state.enemies.forEach(e => {
            if (Math.hypot(e.x - p.x, e.y - p.y) < p.size + e.size) {
                 // Boomerangs cleave, they don't die on hit immediately usually, 
                 // but let's damage every frame it touches or debounce.
                 // We rely on high velocity to pass through quickly.
                 if (state.frame % 5 === 0) { // Simple debounce
                    e.hp -= p.damage;
                    onEnemyHit(state, e, p.damage);
                    VFX.spark(state, e.x, e.y, '#fef08a', 3);
                    hasHit = true;
                 }
            }
        });
        // Lux blades don't die on enemy hit, they return.
        return false; 
    }

    // --- SOLAR FLARE (Player) ---
    if (p.visualType === 'SOLAR_FLARE') {
        state.enemies.forEach(e => {
                if (Math.hypot(e.x - p.x, e.y - p.y) < p.size + e.size + 30) {
                    if (state.frame % 10 === 0) {
                        e.hp -= p.damage;
                        onEnemyHit(state, e, p.damage);
                        VFX.spark(state, e.x, e.y, '#fbbf24', 2);
                    }
                }
        });
    }
    
    // --- SUPER DASH ---
    if (p.visualType === 'EXPLOSION_AREA') {
        state.enemies.forEach(e => {
                if (Math.hypot(e.x - p.x, e.y - p.y) < p.size + e.size) {
                    e.hp -= p.damage; 
                    onEnemyHit(state, e, p.damage);
                    VFX.spark(state, e.x, e.y, '#fff', 2);
                }
        });
    }

    // --- SINGULARITY ---
    if (p.pullRadius) {
            state.enemies.forEach(e => {
                if (e.isBoss) return;
                const dx = p.x - e.x;
                const dy = p.y - e.y;
                const dist = Math.hypot(dx, dy);
                if (dist < p.pullRadius! && dist > 0.1) {
                    const strength = 3 * (1 - dist/p.pullRadius!);
                    e.vx += (dx/dist) * strength;
                    e.vy += (dy/dist) * strength;
                }
            });
            
            if (p.life <= 1 && p.visualType === 'SINGULARITY') {
                VFX.castShockwave(state, p.x, p.y, '#000000');
                spawnExplosion(state, p.x, p.y, '#ffffff', ParticleType.VOID);
                state.enemies.forEach(e => {
                    if (Math.hypot(e.x - p.x, e.y - p.y) < 150) {
                        e.hp -= p.damage;
                        onEnemyHit(state, e, p.damage);
                    }
                });
                return true;
            }
            
            if (p.visualType === 'SINGULARITY') {
                state.enemies.forEach(e => {
                    if (Math.hypot(e.x - p.x, e.y - p.y) < 20) {
                        e.hp -= 1; 
                        onEnemyHit(state, e, 1);
                    }
                });
                return false; 
            }
    }

    // --- GENERIC IMPACT ---
    let hitCount = 0;
    if (p.isStatic) {
        state.enemies.forEach(e => {
                if (Math.hypot(e.x - p.x, e.y - p.y) < p.size + e.size) {
                    if (state.frame % 10 === 0) { 
                    e.hp -= p.damage;
                    onEnemyHit(state, e, p.damage);
                    VFX.spark(state, e.x, e.y, p.color, 2);
                    }
                }
        });
    } else {
        for(const enemy of state.enemies) {
            if (Math.hypot(p.x - enemy.x, p.y - enemy.y) < enemy.size + p.size) {
                enemy.hp -= p.damage;
                onEnemyHit(state, enemy, p.damage);
                hitCount++;
                VFX.spark(state, p.x, p.y, p.color, 5);
                
                if (p.visualType === 'HOMING_MISSILE') {
                    spawnExplosion(state, p.x, p.y, '#f472b6', ParticleType.FIRE);
                    VFX.castShockwave(state, p.x, p.y, '#f472b6');
                        state.enemies.forEach(near => {
                            if (Math.hypot(near.x - p.x, near.y - p.y) < 100) {
                                near.hp -= p.damage * 0.5;
                                onEnemyHit(state, near, p.damage * 0.5);
                            }
                        });
                }
            }
        }
        if (hitCount > 0) return true;
    }

    return false;
};
