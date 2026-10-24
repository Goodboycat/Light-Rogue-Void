import { audio } from '../../../audio';

import { MutableGameState, Projectile, ParticleType } from '../../../types';
import { spawnExplosion } from '../../../Particles';
import { VFX } from '../../../Emitters';
import { cancelAllTelegraphs } from '../../enemies/BossKit';
import { recordPowerDamage } from '../../AbilityLogic';
import { applyHitKnockback } from '../../../HitFeedback';
import { acquireDrop, swapRemoveProjectile } from '../../../ObjectPools';

const getPowerLabelForProjectile = (vType?: string): string => {
    switch (vType) {
        case 'FIRE_BLAST': return 'Fire Blast';
        case 'FIREFLY': return 'Fireflies';
        case 'HOMING_MISSILE': return 'Seeking Spirit';
        case 'SINGULARITY': return 'Singularity';
        case 'STARDUST_TRAIL': return 'Stardust Trail';
        case 'SOLAR_FLARE': return 'Solar Flare';
        case 'LUX_BLADE': return 'Lux Blades';
        case 'EXPLOSION_AREA': return 'Super Dash';
        case 'LIGHT_ENERGY': return 'Purging Beam';
        default: return 'Spark Pulse';
    }
};

export const checkPlayerCollisions = (
    state: MutableGameState, 
    p: Projectile
): boolean => {
    
    // Visual only hit marker
    if (p.visualType === 'PLASMA_WHIP_HIT') {
        return true;
    }

    const enemies = state.enemies;
    const enemyLen = enemies.length;

    // --- LIGHT ENERGY PROJECTILE (Anti-Boss/Paralyzer) ---
    if (p.visualType === 'LIGHT_ENERGY') {
        let hasHit = false;
        for (let i = 0; i < enemyLen; i++) {
            const enemy = enemies[i];
            if (Math.hypot(p.x - enemy.x, p.y - enemy.y) < enemy.size + p.size) {
                let hitDamage = p.damage;
                if (enemy.def?.id === 'darkness' && enemy.hp <= enemy.maxHp * 0.10) {
                    hitDamage *= 3.0; // "Light breaks through": beam deals x3 damage in final 10%
                }
                enemy.hp -= hitDamage; recordPowerDamage(state, 'Purging Beam', hitDamage); audio.playHit();
                hasHit = true;
                
                if (enemy.isBoss) {
                    enemy.paralyzedTimer = 300; // 5 seconds of paralysis!
                    cancelAllTelegraphs(); // Wind-ups in progress cancel immediately!
                    audio.playLevelUp(); // Distinct success sound
                    VFX.spark(state, enemy.x, enemy.y, '#38bdf8', 30);
                    spawnExplosion(state, enemy.x, enemy.y, '#38bdf8', ParticleType.BOSS_AURA);
                } else {
                    const angle = Math.atan2(enemy.y - p.y, enemy.x - p.x);
                    enemy.vx = Math.cos(angle) * 20;
                    enemy.vy = Math.sin(angle) * 20;
                }
            }
        }
        if (hasHit) {
            spawnExplosion(state, p.x, p.y, '#38bdf8', ParticleType.BOSS_AURA);
            return true;
        }
    }

    // --- LUX BLADE (Boomerang) ---
    if (p.visualType === 'LUX_BLADE') {
        if (state.frame % 5 === 0) {
            for (let i = 0; i < enemyLen; i++) {
                const e = enemies[i];
                if (Math.hypot(e.x - p.x, e.y - p.y) < p.size + e.size) {
                    e.hp -= p.damage; recordPowerDamage(state, 'Lux Blades', p.damage); audio.playHit();
                    VFX.spark(state, e.x, e.y, '#fef08a', 3);
                }
            }
        }
        return false; 
    }

    // --- SOLAR FLARE (Player) ---
    if (p.visualType === 'SOLAR_FLARE') {
        if (state.frame % 10 === 0) {
            for (let i = 0; i < enemyLen; i++) {
                const e = enemies[i];
                if (Math.hypot(e.x - p.x, e.y - p.y) < p.size + e.size + 30) {
                    e.hp -= p.damage; recordPowerDamage(state, 'Solar Flare', p.damage); audio.playHit();
                    VFX.spark(state, e.x, e.y, '#fbbf24', 2);
                }
            }
        }
    }
    
    // --- SUPER DASH ---
    if (p.visualType === 'EXPLOSION_AREA') {
        for (let i = 0; i < enemyLen; i++) {
            const e = enemies[i];
            if (Math.hypot(e.x - p.x, e.y - p.y) < p.size + e.size) {
                e.hp -= p.damage; recordPowerDamage(state, 'Super Dash', p.damage); audio.playHit(); 
                applyHitKnockback(e, p.x, p.y, p.damage);
                VFX.spark(state, e.x, e.y, '#fff', 2);
            }
        }
    }

    // --- SINGULARITY ---
    if (p.pullRadius) {
        for (let i = 0; i < enemyLen; i++) {
            const e = enemies[i];
            if (e.isBoss || e.isSemiBoss) continue;
            const dx = p.x - e.x;
            const dy = p.y - e.y;
            const dist = Math.hypot(dx, dy);
            if (dist < p.pullRadius && dist > 0.1) {
                const strength = 3 * (1 - dist / p.pullRadius);
                e.vx += (dx / dist) * strength;
                e.vy += (dy / dist) * strength;
            }
        }
            
        if (p.life <= 1 && p.visualType === 'SINGULARITY') {
            VFX.castShockwave(state, p.x, p.y, '#000000');
            spawnExplosion(state, p.x, p.y, '#ffffff', ParticleType.VOID);
            for (let i = 0; i < enemyLen; i++) {
                const e = enemies[i];
                if (Math.hypot(e.x - p.x, e.y - p.y) < 150) {
                    e.hp -= p.damage; recordPowerDamage(state, 'Singularity', p.damage); audio.playHit();
                }
            }
            return true;
        }
        
        if (p.visualType === 'SINGULARITY') {
            for (let i = 0; i < enemyLen; i++) {
                const e = enemies[i];
                if (Math.hypot(e.x - p.x, e.y - p.y) < 20) {
                    e.hp -= 1; recordPowerDamage(state, 'Singularity', 1); audio.playHit(); 
                }
            }
            return false; 
        }
    }

    // --- GENERIC IMPACT ---
    let hitCount = 0;
    const pLabel = getPowerLabelForProjectile(p.visualType);
    if (p.isStatic) {
        if (state.frame % 10 === 0) {
            for (let i = 0; i < enemyLen; i++) {
                const e = enemies[i];
                if (Math.hypot(e.x - p.x, e.y - p.y) < p.size + e.size) {
                    e.hp -= p.damage; recordPowerDamage(state, pLabel, p.damage); audio.playHit();
                    VFX.spark(state, e.x, e.y, p.color, 2);
                }
            }
        }
    } else {
        // Check destructible enemy projectiles
        for (let j = state.projectiles.length - 1; j >= 0; j--) {
            const ep = state.projectiles[j];
            if (ep === p) continue;
            if (ep.isEnemy && ep.customData?.isDestructible) {
                if (Math.hypot(p.x - ep.x, p.y - ep.y) < p.size + ep.size) {
                    spawnExplosion(state, ep.x, ep.y, ep.color || '#a3e635', ParticleType.FIRE);
                    if (ep.customData?.dropRewardsInP3) {
                        state.drops.push(acquireDrop({ x: ep.x, y: ep.y, value: 2 }));
                        if (state.player.lightEnergy !== undefined) {
                            state.player.lightEnergy = Math.min(100, (state.player.lightEnergy || 0) + 3);
                        }
                    }
                    if (ep.visualType === 'FIREFLY' && state.fireflyCount && state.fireflyCount > 0) {
                        state.fireflyCount--;
                    }
                    swapRemoveProjectile(state.projectiles, j);
                    hitCount++;
                }
            }
        }

        for (let i = 0; i < enemyLen; i++) {
            const enemy = enemies[i];
            if (Math.hypot(p.x - enemy.x, p.y - enemy.y) < enemy.size + p.size) {
                enemy.hp -= p.damage; recordPowerDamage(state, pLabel, p.damage); audio.playHit();
                applyHitKnockback(enemy, p.x - p.vx, p.y - p.vy, p.damage);
                hitCount++;
                VFX.spark(state, p.x, p.y, p.color, 5);
                
                if (p.visualType === 'HOMING_MISSILE') {
                    spawnExplosion(state, p.x, p.y, '#f472b6', ParticleType.FIRE);
                    VFX.castShockwave(state, p.x, p.y, '#f472b6');
                    for (let k = 0; k < enemyLen; k++) {
                        const near = enemies[k];
                        if (Math.hypot(near.x - p.x, near.y - p.y) < 100) {
                            near.hp -= p.damage * 0.5; recordPowerDamage(state, 'Seeking Spirit', p.damage * 0.5); audio.playHit();
                            applyHitKnockback(near, p.x, p.y, p.damage * 0.5);
                        }
                    }
                }
            }
        }
        if (hitCount > 0) return true;
    }

    return false;
};
