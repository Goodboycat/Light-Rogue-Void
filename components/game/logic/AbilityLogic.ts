import { audio } from '../audio';
import { MutableGameState, ParticleType, Enemy } from '../types';
import { PlayerStats, Settings } from '../../../types';
import { VFX } from '../Emitters';
import { spawnExplosion, createParticle } from '../Particles';
import { InputHandler } from '../Input';
import { updateSparkPulse } from './SparkPulse';
import { applyHitKnockback } from '../HitFeedback';
import { isPCEnvironment } from '../../../hooks/useIsPC';
import { acquireProjectile } from '../ObjectPools';

export const recordPowerDamage = (state: MutableGameState, powerKey: string, amount: number) => {
    if (amount <= 0) return;
    if (!state.damageByPower) state.damageByPower = {};
    state.damageByPower[powerKey] = (state.damageByPower[powerKey] || 0) + amount;
};

// Preallocated scratch buffers for Thunder Chain nearest-K selection (zero per-frame allocations)
const thunderScratchEnemies: Enemy[] = [];
const thunderScratchDists: number[] = [];

export const updatePlayerAbilities = (
    state: MutableGameState, 
    stats: PlayerStats, 
    w: number, 
    h: number, 
    maturityScale: number,
    input?: InputHandler,
    wave: number = 1,
    settings?: Settings
) => {
    const p = state.player;

    const attackSpeed = Math.max(0.5, stats.attackSpeed || 1);
    const cd = (baseFrames: number) => Math.max(1, Math.round(baseFrames / attackSpeed));

    // Tick Cooldowns
    if (p.fireBlastTimer > 0) p.fireBlastTimer--;
    if (p.thunderChainTimer > 0) p.thunderChainTimer--;
    if (p.iceNovaTimer > 0) p.iceNovaTimer--;
    
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
    
    if (p.titanShieldDuration === undefined) p.titanShieldDuration = 0;
    
    if (p.titanShieldDuration > 0) {
        p.titanShieldDuration--;
        p.isTitanShieldActive = true;
    } else {
        p.isTitanShieldActive = false;
    }

    // AUTO-AIM: when the aim stick is idle, aim at the nearest enemy (squared distance).
    let dx = state.mouse.x - w / 2;
    let dy = state.mouse.y - h / 2;
    const isAimStickActive = !!(input && input.virtualAimActive);
    const autoAimTouchEnabled = settings?.autoAimTouch ?? state.settings?.autoAimTouch ?? !isPCEnvironment();

    if (!isAimStickActive && autoAimTouchEnabled && state.enemies.length > 0) {
        let minDistSq = Infinity;
        let nearestX = 0;
        let nearestY = 0;
        let foundNearest = false;
        for (let i = 0; i < state.enemies.length; i++) {
            const e = state.enemies[i];
            if (e.hp <= 0) continue;
            const edx = e.x - p.x;
            const edy = e.y - p.y;
            const dSq = edx * edx + edy * edy;
            if (dSq < minDistSq) {
                minDistSq = dSq;
                nearestX = edx;
                nearestY = edy;
                foundNearest = true;
            }
        }
        if (foundNearest) {
            dx = nearestX;
            dy = nearestY;
        }
    }
    const angle = Math.atan2(dy, dx);

    // 0. STARTER WEAPON: SPARK PULSE
    updateSparkPulse(state, stats, wave, maturityScale, settings);

    // 1. FIRE BLAST
    if (stats.fireBlastLevel > 0 && p.fireBlastTimer <= 0) {
        const damage = 40 + (stats.fireBlastLevel * 10);
        const cooldown = Math.max(20, 45 - (stats.fireBlastLevel * 3));
        const count = (stats.fireBlastLevel >= 3 ? 3 : 1) + (stats.special_fireBlastCount ? 2 : 0);
        for (let i = 0; i < count; i++) {
            const spread = (i - (count - 1) / 2) * 0.2;
            audio.playShoot();
            state.projectiles.push(acquireProjectile({
                x: p.x, y: p.y, vx: Math.cos(angle + spread) * 12, vy: Math.sin(angle + spread) * 12,
                size: 15 * maturityScale, color: '#f97316', life: 60, damage, isEnemy: false, visualType: 'FIRE_BLAST'
            }));
        }
        VFX.castFireBlast(state, p.x, p.y, angle);
        p.fireBlastTimer = cd(cooldown); 
    }

    // 2. FIREFLIES (Uses state.fireflyCount counter updated at spawn/despawn instead of per-frame filter)
    if (stats.fireflyLevel > 0) {
        const activeFireflies = state.fireflyCount || 0;
        const maxFireflies = stats.fireflyLevel * 2;
        const damage = 20 + (stats.fireflyLevel * 5);
        
        if (activeFireflies < maxFireflies && p.fireflyTimer <= 0) {
            audio.playShoot();
            state.projectiles.push(acquireProjectile({
                x: p.x, y: p.y, vx: 0, vy: 0,
                size: 6 * maturityScale, color: '#fef08a', 
                life: 1200, // Finite life < 2000; auto-respawns when expired
                damage, isEnemy: false, visualType: 'FIREFLY',
                customData: { fastOrbit: stats.special_orbitalSpeed }
            }));
            state.fireflyCount = activeFireflies + 1;
            p.fireflyTimer = cd(30); 
        }
    }

    // 3. ICE NOVA
    if (stats.iceNovaLevel > 0 && p.iceNovaTimer <= 0) {
        const radius = (200 + (stats.iceNovaLevel * 30)) * maturityScale * (stats.special_iceNovaSize ? 1.5 : 1);
        const damage = stats.iceNovaLevel * 8;
        const cooldown = Math.max(60, 120 - (stats.iceNovaLevel * 5));
        VFX.castIceNova(state, p.x, p.y);
        for (let i = 0; i < state.enemies.length; i++) {
            const e = state.enemies[i];
            if (Math.hypot(e.x - p.x, e.y - p.y) < radius) {
                if (!e.isBoss && !e.isSemiBoss && !e.isSlowImmune) {
                    e.speed *= 0.2; 
                }
                e.hp -= damage; recordPowerDamage(state, 'Ice Nova', damage); audio.playHit();
                applyHitKnockback(e, p.x, p.y, damage);
                VFX.spark(state, e.x, e.y, '#38bdf8', 5);
            }
        }
        p.iceNovaTimer = cd(cooldown);
    }

    // 4. THUNDER CHAIN (No per-frame .map/.sort/.slice allocations)
    if (stats.thunderChainLevel > 0 && p.thunderChainTimer <= 0 && state.enemies.length > 0) {
        const damage = 15 + (stats.thunderChainLevel * 5);
        const cooldown = Math.max(30, 70 - (stats.thunderChainLevel * 5));
        const maxTargets = 3 + stats.thunderChainLevel + (stats.special_thunderBounce ? 3 : 0);

        thunderScratchEnemies.length = 0;
        thunderScratchDists.length = 0;

        for (let i = 0; i < state.enemies.length; i++) {
            const e = state.enemies[i];
            const distSq = (e.x - p.x) * (e.x - p.x) + (e.y - p.y) * (e.y - p.y);
            // Insert into sorted scratch arrays up to maxTargets
            let insertAt = thunderScratchEnemies.length;
            while (insertAt > 0 && distSq < thunderScratchDists[insertAt - 1]) {
                insertAt--;
            }
            if (insertAt < maxTargets) {
                if (thunderScratchEnemies.length < maxTargets) {
                    thunderScratchEnemies.push(e);
                    thunderScratchDists.push(distSq);
                }
                for (let j = thunderScratchEnemies.length - 1; j > insertAt; j--) {
                    thunderScratchEnemies[j] = thunderScratchEnemies[j - 1];
                    thunderScratchDists[j] = thunderScratchDists[j - 1];
                }
                thunderScratchEnemies[insertAt] = e;
                thunderScratchDists[insertAt] = distSq;
            }
        }

        if (thunderScratchEnemies.length > 0) {
            let lastX = p.x;
            let lastY = p.y;
            for (let index = 0; index < thunderScratchEnemies.length; index++) {
                const e = thunderScratchEnemies[index];
                e.hp -= damage; recordPowerDamage(state, 'Thunder Chain', damage); audio.playHit();
                applyHitKnockback(e, lastX, lastY, damage);
                if (stats.special_thunderBounce && index > 0) {
                    VFX.castThunderChain(state, lastX, lastY, e.x, e.y);
                } else {
                    VFX.castThunderChain(state, p.x, p.y, e.x, e.y);
                }
                lastX = e.x;
                lastY = e.y;
            }
            p.thunderChainTimer = cd(cooldown);
        }
    }

    // 5. HOMING MISSILE
    if (stats.homingMissileLevel > 0 && p.homingMissileTimer <= 0) {
        const damage = 60 + (stats.homingMissileLevel * 15);
        audio.playShoot();
        state.projectiles.push(acquireProjectile({
            x: p.x, y: p.y, 
            vx: Math.cos(angle) * 2, vy: Math.sin(angle) * 2, 
            size: 8 * maturityScale, color: '#f472b6', 
            life: 300, 
            damage, 
            isEnemy: false, 
            isStatic: false,
            visualType: 'HOMING_MISSILE'
        }));
        p.homingMissileTimer = cd(Math.max(60, 120 - stats.homingMissileLevel * 10));
    }

    // 6. SINGULARITY
    if (stats.singularityLevel > 0 && p.singularityTimer <= 0) {
        const dist = 100 * maturityScale;
        const sx = p.x - Math.cos(angle) * dist;
        const sy = p.y - Math.sin(angle) * dist;

        audio.playShoot();
        const singProj = acquireProjectile({
            x: sx, y: sy, vx: 0, vy: 0,
            size: 20 * maturityScale, color: '#000', 
            life: 180, 
            damage: 100 + (stats.singularityLevel * 20), 
            isEnemy: false,
            visualType: 'SINGULARITY',
            isStatic: true,
        });
        singProj.pullRadius = 250 * maturityScale * (stats.special_singularityPull ? 2 : 1);
        state.projectiles.push(singProj);
        p.singularityTimer = cd(Math.max(150, 240 - stats.singularityLevel * 10));
    }

    // 7. NEBULA TRAIL (Now Stardust Trail)
    if (stats.nebulaTrailLevel > 0 && p.nebulaTrailTimer <= 0) {
        audio.playShoot();
        state.projectiles.push(acquireProjectile({
            x: p.x, y: p.y, vx: 0, vy: 0,
            size: 30 * maturityScale, color: '#ef4444', life: 60, damage: 5 + stats.nebulaTrailLevel, isEnemy: false, isStatic: true,
            visualType: 'STARDUST_TRAIL' 
        }));
        VFX.castStardustCloud(state, p.x, p.y);
        p.nebulaTrailTimer = cd(15);
    }

    // 9. SOLAR FLARE
    if (stats.solarFlareLevel > 0 && p.solarFlareTimer <= 0) {
        audio.playShoot();
        state.projectiles.push(acquireProjectile({
            x: p.x, y: p.y, vx: 0, vy: 0, 
            size: 25 * maturityScale, color: '#fbbf24', 
            life: 900,
            damage: 5 + stats.solarFlareLevel,
            isEnemy: false, 
            isStatic: true,
            visualType: 'SOLAR_FLARE'
        }));
        p.solarFlareTimer = cd(200);
    }

    // 10. TITAN SHIELD
    if (stats.titanShieldLevel > 0 && p.titanShieldTimer <= 0) {
        p.isTitanShieldActive = true;
        p.titanShieldDuration = 60;
        p.titanShieldTimer = cd(300);
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
                
                VFX.castWhiteHoleExplosion(state, p.x, p.y);
                
                for (let i = 0; i < state.enemies.length; i++) {
                    const e = state.enemies[i];
                    const edx = e.x - p.x;
                    const edy = e.y - p.y;
                    const dist = Math.hypot(edx, edy);
                    if (dist < radius) {
                        e.hp -= damage; recordPowerDamage(state, 'White Hole', damage); audio.playHit();
                        if (!e.isBoss && dist > 0.001) {
                            e.vx += (edx / dist) * 50;
                            e.vy += (edy / dist) * 50;
                        }
                    }
                }

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
        
        for (let i = 0; i < count; i++) {
            const spread = (Math.PI * 2) / count;
            const bladeAngle = angle + (i * spread) + (state.frame * 0.1);
            
            audio.playShoot();
            state.projectiles.push(acquireProjectile({
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
            }));
        }
        p.luxBladeTimer = cd(cooldown);
    }

    // 13. REPULSION FIELD
    if (stats.repulsionFieldLevel > 0 && (p.repulsionFieldTimer || 0) <= 0) {
        const cooldown = Math.max(300, 660 - stats.repulsionFieldLevel * 20); 
        const damage = 10 + stats.repulsionFieldLevel * 5;
        const radius = 300 * maturityScale;
        
        spawnExplosion(state, p.x, p.y, '#fbbf24', ParticleType.RING);
        VFX.castShockwave(state, p.x, p.y, '#fbbf24');
        
        for (let i = 0; i < state.enemies.length; i++) {
            const e = state.enemies[i];
            const edx = e.x - p.x;
            const edy = e.y - p.y;
            const dist = Math.hypot(edx, edy);
            
            if (dist < radius) {
                e.hp -= damage; recordPowerDamage(state, 'Repulsion Field', damage); audio.playHit();
                const force = 30 + stats.repulsionFieldLevel * 5;
                if (!e.isBoss && e.def.behavior !== 'TANK') {
                    const pushAngle = Math.atan2(edy, edx);
                    e.vx += Math.cos(pushAngle) * force;
                    e.vy += Math.sin(pushAngle) * force;
                }
            }
        }
        
        p.repulsionFieldTimer = cd(cooldown);
    }

    // 14. PLASMA WHIP (LUMINOUS LASH)
    if (stats.plasmaWhipLevel > 0) {
        if (state.frame % cd(Math.max(20, 50 - stats.plasmaWhipLevel * 2)) === 0) {
            let nearest: Enemy | null = null;
            let minDist = 250 * maturityScale;
            for (let i = 0; i < state.enemies.length; i++) {
                const e = state.enemies[i];
                const d = Math.hypot(e.x - p.x, e.y - p.y);
                if (d < minDist) {
                    minDist = d;
                    nearest = e;
                }
            }

            if (nearest) {
                const damage = 40 + stats.plasmaWhipLevel * 10;
                nearest.hp -= damage; recordPowerDamage(state, 'Luminous Lash', damage); audio.playHit();
                applyHitKnockback(nearest, p.x, p.y, damage);
                
                audio.playShoot();
                state.projectiles.push(acquireProjectile({
                    x: p.x, y: p.y, vx: 0, vy: 0,
                    life: 15,
                    size: 5 * maturityScale, 
                    color: '#fbbf24', 
                    damage: 0, 
                    isEnemy: false, 
                    visualType: 'PLASMA_WHIP',
                    customData: { targetX: nearest.x, targetY: nearest.y }
                }));
            }
        }
    }

    // 15. LIGHT ENERGY BEAM
    if (input && p.lightEnergy && p.lightEnergy >= 100) {
        const wantsToShoot = input.isRightMouseDown || 
                             input.virtualShoot || 
                             input.keys['KeyF'] || 
                             input.keys['KeyE'] || 
                             input.keys['ShiftLeft'] || 
                             input.keys['ShiftRight'];
        
        if (wantsToShoot) {
            p.lightEnergy = 0;
            
            audio.playShoot();
            const hasUpgrade = !!stats.special_lightPurge;
            const damage = hasUpgrade ? 1000 : 500;
            const beamSize = (hasUpgrade ? 35 : 25) * maturityScale;

            state.projectiles.push(acquireProjectile({
                x: p.x, y: p.y,
                vx: Math.cos(angle) * 16,
                vy: Math.sin(angle) * 16,
                size: beamSize,
                color: '#38bdf8',
                life: 100,
                damage,
                isEnemy: false,
                visualType: 'LIGHT_ENERGY'
            }));

            VFX.castShockwave(state, p.x, p.y, '#38bdf8');
            for (let i = 0; i < 15; i++) {
                createParticle(state, p.x, p.y, ParticleType.GLOW, '#38bdf8', {
                    vx: Math.cos(angle + (Math.random() - 0.5) * 0.5) * (10 + Math.random() * 5),
                    vy: Math.sin(angle + (Math.random() - 0.5) * 0.5) * (10 + Math.random() * 5),
                    life: 30, size: 8
                });
            }
        }
    }
};
