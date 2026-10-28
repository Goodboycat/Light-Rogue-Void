
import { MutableGameState, ParticleType } from '../types';
import { onEnemyHit } from '../Feel';
import { PlayerStats } from '../../../types';
import { VFX } from '../Emitters';
import { spawnExplosion, createParticle } from '../Particles';
import { castWhiteHoleBlast } from '../BigFx';
import { swapRemoveProjectile } from '../Pools';
import { sfx } from '../../../audio/hooks'; // (6B)

export const updatePlayerAbilities = (state: MutableGameState, stats: PlayerStats, w: number, h: number, maturityScale: number) => {
    const p = state.player;

    // Tick Cooldowns
    if (p.fireBlastTimer > 0) p.fireBlastTimer--;
    if (p.thunderChainTimer > 0) p.thunderChainTimer--;
    if (p.iceNovaTimer > 0) p.iceNovaTimer--;
    
    // New Timers
    if (p.homingMissileTimer === undefined) p.homingMissileTimer = 0;
    if (p.homingMissileTimer > 0) p.homingMissileTimer--;
    
    if (p.fireflyTimer === undefined) p.fireflyTimer = 0;
    if (p.fireflyTimer > 0) p.fireflyTimer--;

    if (p.nebulaTrailTimer > 0) p.nebulaTrailTimer--;
    if (p.singularityTimer > 0) p.singularityTimer--;
    if (p.solarFlareTimer > 0) p.solarFlareTimer--;
    
    if (p.titanShieldTimer > 0) p.titanShieldTimer--;

    if (p.luxBladeTimer === undefined) p.luxBladeTimer = 0;
    if (p.luxBladeTimer > 0) p.luxBladeTimer--;
    
    if (p.repulsionFieldTimer === undefined) p.repulsionFieldTimer = 0;
    if (p.repulsionFieldTimer > 0) p.repulsionFieldTimer--;
    
    // Ensure duration timer exists
    if (p.titanShieldDuration === undefined) p.titanShieldDuration = 0;
    
    if (p.titanShieldDuration > 0) {
        p.titanShieldDuration--;
        p.isTitanShieldActive = true;
    } else {
        p.isTitanShieldActive = false;
    }

    // Helper for direction
    const dx = state.mouse.x - w/2; 
    const dy = state.mouse.y - h/2;
    const angle = Math.atan2(dy, dx);

    // 1. FIRE BLAST
    if (stats.fireBlastLevel > 0 && p.fireBlastTimer <= 0) {
        const damage = 40 + (stats.fireBlastLevel * 10);
        const cooldown = Math.max(20, 45 - (stats.fireBlastLevel * 3));
        const count = stats.fireBlastLevel >= 3 ? 3 : 1;
        for(let i=0; i<count; i++) {
            const spread = (i - (count-1)/2) * 0.2;
            sfx('player_shot', undefined, 0.1); // (6B)
            state.projectiles.push({
                x: p.x, y: p.y, vx: Math.cos(angle + spread) * 12, vy: Math.sin(angle + spread) * 12,
                size: 15 * maturityScale, color: '#f97316', life: 60, damage, isEnemy: false, visualType: 'FIRE_BLAST' 
            });
        }
        VFX.castFireBlast(state, p.x, p.y, angle);
        p.fireBlastTimer = cooldown; 
    }

    // 2. FIREFLIES
    if (stats.fireflyLevel > 0) {
        const activeFireflies = state.projectiles.filter(proj => proj.visualType === 'FIREFLY').length;
        const maxFireflies = stats.fireflyLevel * 2;
        const damage = 20 + (stats.fireflyLevel * 5);
        
        if (activeFireflies < maxFireflies && p.fireflyTimer <= 0) {
            sfx('player_shot', undefined, 0.1); // (6B)
            state.projectiles.push({
                x: p.x, y: p.y, vx: 0, vy: 0,
                size: 6 * maturityScale, color: '#fef08a', 
                life: 99999, 
                damage, isEnemy: false, visualType: 'FIREFLY'
            });
            p.fireflyTimer = 30; 
        }
    }

    // 3. ICE NOVA
    if (stats.iceNovaLevel > 0 && p.iceNovaTimer <= 0) {
        const radius = (200 + (stats.iceNovaLevel * 30)) * maturityScale;
        const damage = stats.iceNovaLevel * 8;
        const cooldown = Math.max(60, 120 - (stats.iceNovaLevel * 5));
        VFX.castIceNova(state, p.x, p.y);
        state.enemies.forEach(e => {
            if (Math.hypot(e.x - p.x, e.y - p.y) < radius) {
                if (!e.isBoss && !e.isSlowImmune) {
                    e.speed *= 0.2; 
                }
                e.hp -= damage;
                onEnemyHit(state, e, damage);
                VFX.spark(state, e.x, e.y, '#38bdf8', 5);
            }
        });
        p.iceNovaTimer = cooldown;
    }

    // 4. THUNDER CHAIN
    if (stats.thunderChainLevel > 0 && p.thunderChainTimer <= 0) {
        const damage = 15 + (stats.thunderChainLevel * 5);
        const cooldown = Math.max(30, 70 - (stats.thunderChainLevel * 5));
        const targets = state.enemies
            .map(e => ({ e, dist: Math.pow(e.x - p.x, 2) + Math.pow(e.y - p.y, 2) }))
            .sort((a, b) => a.dist - b.dist)
            .slice(0, 3 + stats.thunderChainLevel);
            
        targets.forEach(({ e }) => {
            e.hp -= damage;
            onEnemyHit(state, e, damage);
            VFX.castThunderChain(state, p.x, p.y, e.x, e.y);
        });
        if (targets.length > 0) p.thunderChainTimer = cooldown;
    }

    // 5. HOMING MISSILE
    if (stats.homingMissileLevel > 0 && p.homingMissileTimer <= 0) {
        const damage = 60 + (stats.homingMissileLevel * 15);
        sfx('player_shot', undefined, 0.1); // (6B)
        state.projectiles.push({
            x: p.x, y: p.y, 
            vx: Math.cos(angle) * 2, vy: Math.sin(angle) * 2, 
            size: 8 * maturityScale, color: '#f472b6', 
            life: 300, 
            damage: damage, 
            isEnemy: false, 
            isStatic: false,
            visualType: 'HOMING_MISSILE'
        });
        p.homingMissileTimer = Math.max(60, 120 - stats.homingMissileLevel * 10);
    }

    // 6. SINGULARITY
    if (stats.singularityLevel > 0 && p.singularityTimer <= 0) {
        const dist = 100 * maturityScale;
        const sx = p.x - Math.cos(angle) * dist;
        const sy = p.y - Math.sin(angle) * dist;

        sfx('player_shot', undefined, 0.1); // (6B)

        state.projectiles.push({
            x: sx, y: sy, vx: 0, vy: 0,
            size: 20 * maturityScale, color: '#000', 
            life: 180, 
            damage: 100 + (stats.singularityLevel * 20), 
            isEnemy: false,
            visualType: 'SINGULARITY',
            isStatic: true,
            pullRadius: 250 * maturityScale
        });
        p.singularityTimer = Math.max(150, 240 - stats.singularityLevel * 10);
    }

    // 7. NEBULA TRAIL (Now Stardust Trail)
    if (stats.nebulaTrailLevel > 0 && p.nebulaTrailTimer <= 0) {
        sfx('player_shot', undefined, 0.1); // (6B)
        state.projectiles.push({
            x: p.x, y: p.y, vx: 0, vy: 0,
            size: 30 * maturityScale, color: '#ffffff', life: 60, damage: 5 + stats.nebulaTrailLevel, isEnemy: false, isStatic: true,
            visualType: 'STARDUST_TRAIL' 
        });
        VFX.castStardustCloud(state, p.x, p.y);
        p.nebulaTrailTimer = 15;
    }

    // 9. SOLAR FLARE
    if (stats.solarFlareLevel > 0 && p.solarFlareTimer <= 0) {
        sfx('player_shot', undefined, 0.1); // (6B)
        state.projectiles.push({
            x: p.x, y: p.y, vx: 0, vy: 0, 
            size: 25 * maturityScale, color: '#fbbf24', 
            life: 900,
            damage: 5 + stats.solarFlareLevel,
            isEnemy: false, 
            isStatic: true,
            visualType: 'SOLAR_FLARE'
        });
        p.solarFlareTimer = 200;
    }

    // 10. TITAN SHIELD
    if (stats.titanShieldLevel > 0 && p.titanShieldTimer <= 0) {
        p.isTitanShieldActive = true;
        p.titanShieldDuration = 60;
        p.titanShieldTimer = 300;
    }

    // 11. WHITE HOLE
    if (stats.whiteHoleLevel > 0) {
        const isMoving = Math.abs(p.vx) > 0.1 || Math.abs(p.vy) > 0.1;
        
        if (!isMoving) {
            p.stationaryTimer++;
            const CHARGE_TIME = 180;
            
            if (state.frame % 5 === 0) {
                VFX.castWhiteHoleCharge(state, p.x, p.y, p.stationaryTimer / CHARGE_TIME);
            }

            if (p.stationaryTimer >= CHARGE_TIME) {
                const damage = 1000 + (stats.whiteHoleLevel * 100);
                const radius = 6000 * maturityScale;
                
                // (2B+) cinematic detonation: noise fireball + 3 shockwaves + heavy shake + flash
                castWhiteHoleBlast(state, p.x, p.y, 520 * maturityScale);
                VFX.castWhiteHoleExplosion(state, p.x, p.y);
                // (2B+) the blast also wipes every boss projectile in range — White Hole is the finisher / panic button
                for (let i = state.projectiles.length - 1; i >= 0; i--) {
                    const pr = state.projectiles[i];
                    if (pr.isEnemy && Math.hypot(pr.x - p.x, pr.y - p.y) < radius) swapRemoveProjectile(state.projectiles, i);
                }
                
                state.enemies.forEach(e => {
                    const dx = e.x - p.x;
                    const dy = e.y - p.y;
                    if (Math.hypot(dx, dy) < radius) {
                        e.hp -= damage;
                        onEnemyHit(state, e, damage);
                        const dist = Math.hypot(dx, dy);
                        if (!e.isBoss) {
                            e.vx += (dx/dist) * 50;
                            e.vy += (dy/dist) * 50;
                        }
                    }
                });

                p.stationaryTimer = 0;
            }
        } else {
            p.stationaryTimer = 0;
        }
    }

    // 12. LUX BLADES (Boomerangs)
    if (stats.luxBladesLevel > 0 && (p.luxBladeTimer || 0) <= 0) {
        const count = 1 + Math.floor(stats.luxBladesLevel / 2);
        const damage = 25 + (stats.luxBladesLevel * 10);
        const cooldown = Math.max(40, 90 - (stats.luxBladesLevel * 5));
        
        for(let i=0; i<count; i++) {
             const spread = (Math.PI * 2) / count;
             const bladeAngle = angle + (i * spread) + (state.frame * 0.1);
             
             sfx('player_shot', undefined, 0.1); // (6B)
             
             state.projectiles.push({
                 x: p.x, y: p.y, 
                 vx: Math.cos(bladeAngle) * 15, 
                 vy: Math.sin(bladeAngle) * 15,
                 size: 10 * maturityScale, 
                 color: '#fef08a', 
                 life: 300, 
                 damage, 
                 isEnemy: false, 
                 visualType: 'LUX_BLADE',
                 customData: { phase: 'OUT' }
             });
        }
        p.luxBladeTimer = cooldown;
    }

    // 13. REPULSION FIELD (Replaced Time Warp)
    if (stats.repulsionFieldLevel > 0 && (p.repulsionFieldTimer || 0) <= 0) {
        // Active Wave every 11 seconds (660 frames) base, reducing slightly per level
        const cooldown = Math.max(300, 660 - stats.repulsionFieldLevel * 20); 
        const damage = 10 + stats.repulsionFieldLevel * 5;
        const radius = 300 * maturityScale;
        
        // Visual
        spawnExplosion(state, p.x, p.y, '#fbbf24', ParticleType.RING);
        VFX.castShockwave(state, p.x, p.y, '#fbbf24');
        
        // Logic
        state.enemies.forEach(e => {
            const dx = e.x - p.x;
            const dy = e.y - p.y;
            const dist = Math.hypot(dx, dy);
            
            if (dist < radius) {
                e.hp -= damage;
                onEnemyHit(state, e, damage);
                // Force Push
                const force = 30 + stats.repulsionFieldLevel * 5;
                if (!e.isBoss && e.def.behavior !== 'TANK') {
                    const angle = Math.atan2(dy, dx);
                    e.vx += Math.cos(angle) * force;
                    e.vy += Math.sin(angle) * force;
                }
            }
        });
        
        p.repulsionFieldTimer = cooldown;
    }

    // 14. PLASMA WHIP (LUMINOUS LASH) - Updated Gold Visuals
    if (stats.plasmaWhipLevel > 0) {
        if (state.frame % Math.max(20, 50 - stats.plasmaWhipLevel * 2) === 0) {
             let nearest = null;
             let minDist = 250 * maturityScale; // Increased Range for Whip
             for(const e of state.enemies) {
                 const d = Math.hypot(e.x - p.x, e.y - p.y);
                 if (d < minDist) {
                     minDist = d;
                     nearest = e;
                 }
             }

             if (nearest) {
                 const damage = 40 + stats.plasmaWhipLevel * 10;
                 nearest.hp -= damage;
                 onEnemyHit(state, nearest, damage);
                 
                 // Spawn Whip Projectile for Rendering
                 sfx('player_shot', undefined, 0.1); // (6B)
                 state.projectiles.push({
                     x: p.x, y: p.y, vx: 0, vy: 0,
                     life: 15, // Visible duration
                     size: 5 * maturityScale, 
                     color: '#fbbf24', 
                     damage: 0, 
                     isEnemy: false, 
                     visualType: 'PLASMA_WHIP',
                     customData: { targetX: nearest.x, targetY: nearest.y }
                 });
             }
        }
    }
};
