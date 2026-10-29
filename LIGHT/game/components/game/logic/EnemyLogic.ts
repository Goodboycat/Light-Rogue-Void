import { enemyContactDmg } from '../Constants'; // (8B)

import { MutableGameState, ParticleType } from '../types';
import { onEnemyHit } from '../Feel';
import { PlayerStats } from '../../../types';
import { createParticle, spawnExplosion } from '../Particles';
import { VFX } from '../Emitters';
import { spawnEnemy as spawnEnemyLogic } from './enemies/SpawnLogic';
import { updateBossBehavior } from './enemies/BossLogic';
import { updateStandardBehavior } from './enemies/StandardBehavior';
import { updateEnemyPhysics } from './enemies/PhysicsLogic';
import { killEnemy } from './KillLogic';
import { VAMPIRIC_RADIUS, VAMPIRIC_HEAL_PCT } from '../../../data/affixes';

export const spawnEnemy = spawnEnemyLogic;

export const updateEnemies = (state: MutableGameState, stats: PlayerStats, maturityScale: number, onDamage: (amt: number) => void, onEnemySeen: (id: string) => void) => {
    
    // --- CINEMATIC CHECK ---
    // If the active boss is in cinematic mode, skip collision logic entirely
    if (state.activeBoss?.state.custom?.cinematicMode) {
        // Still update boss logic so the cinematic timer ticks down
        if (state.activeBoss) {
            updateBossBehavior(state, state.activeBoss, 0, 0, onEnemySeen);
        }
        return;
    }

    for (let i = state.enemies.length - 1; i >= 0; i--) {
        const enemy = state.enemies[i];
        
        if (enemy.projectileImmunity > 0) enemy.projectileImmunity--;

        const dx = state.player.x - enemy.x;
        const dy = state.player.y - enemy.y;
        const dist = Math.sqrt(dx*dx + dy*dy);
        
        enemy.state.timer++;

        let behaviorResult;

        // --- 1. BEHAVIOR LOGIC ---
        if (enemy.isBoss) {
            behaviorResult = updateBossBehavior(state, enemy, dx, dy, onEnemySeen);
        } else {
            behaviorResult = updateStandardBehavior(state, enemy, i, dx, dy, dist, onEnemySeen);
        }

        // --- 2. PHYSICS & MOVEMENT ---
        updateEnemyPhysics(state, enemy, i, behaviorResult.moveX, behaviorResult.moveY, behaviorResult.moveSpeed, stats, dist, dx, dy);

        // --- 3. DAMAGE AURA ---
        if (dist < 100 * maturityScale && stats.damageAura > 0) {
            enemy.hp -= stats.damageAura;
            onEnemyHit(state, enemy, stats.damageAura);
            if (state.frame % 20 === 0) 
                createParticle(state, enemy.x, enemy.y, ParticleType.FIRE, '#ef4444', { speed: 1, size: 2 });
        }

        // --- 4. PLAYER COLLISION ---
        const hitRad = (enemy.isBoss ? enemy.def.size * 0.8 : enemy.def.size) + state.player.size;
        if (dist < hitRad) {
            
            // NEW: Player deals contact damage based on size (Thorns/Ramming)
            // 10 Damage x Size Scale.
            const contactDamage = 10 * maturityScale;
            enemy.hp -= contactDamage;
            onEnemyHit(state, enemy, contactDamage);
            
            // Visual feedback for player hitting enemy
            if (state.frame % 5 === 0) {
                VFX.spark(state, (state.player.x + enemy.x)/2, (state.player.y + enemy.y)/2, '#ffffff', 2);
            }

            if (state.player.dashTimer <= 0) {
                // TITAN SHIELD / PLAYER COLLISION
                if (state.player.isTitanShieldActive) {
                    // Shield is up: Damage Enemy, Push Enemy (if not boss)
                    enemy.hp -= 10; 
                    onEnemyHit(state, enemy, 10);
                    VFX.spark(state, enemy.x, enemy.y, '#fbbf24', 5);
                    
                    if (!enemy.isBoss) {
                        const angle = Math.atan2(dy, dx);
                        enemy.vx -= Math.cos(angle) * 15;
                        enemy.vy -= Math.sin(angle) * 15;
                    }
                } else {
                    // Normal Collision (Player takes damage)
                    // (4A) one call per contact: i-frames would swallow a second onDamage, so EXPLODE adds its 2 here
                    onDamage(enemyContactDmg(enemy.def.behavior)); // (8B) Constants
                    const angle = Math.atan2(dy, dx);
                    // (4B) VAMPIRIC: a landed touch heals allies within VAMPIRIC_RADIUS
                    if (enemy.affixes && enemy.affixes.indexOf('VAMPIRIC') >= 0 && state.frame - (enemy.state.custom?.lastVamp ?? -999) > 30) {
                        enemy.state.custom = enemy.state.custom || {};
                        enemy.state.custom.lastVamp = state.frame;
                        for (let j = 0; j < state.enemies.length; j++) {
                            const o = state.enemies[j];
                            if (o === enemy || o.isBoss || o.hp >= o.maxHp) continue;
                            if (Math.hypot(o.x - enemy.x, o.y - enemy.y) < VAMPIRIC_RADIUS) {
                                o.hp = Math.min(o.maxHp, o.hp + o.maxHp * VAMPIRIC_HEAL_PCT);
                                createParticle(state, o.x, o.y, ParticleType.HEAL, '#f43f5e', { speed: 1, size: 3 });
                            }
                        }
                        VFX.castShockwave(state, enemy.x, enemy.y, '#f43f5e');
                    }
                    
                    // Bounce Player away
                    state.player.vx += Math.cos(angle) * 15;
                    state.player.vy += Math.sin(angle) * 15;
                    
                    if (enemy.def.behavior === 'EXPLODE') {
                        enemy.hp = 0; 
                        spawnExplosion(state, enemy.x, enemy.y, '#f87171', ParticleType.FIRE);
                    }
                }

            } else {
                // Dashing through enemy
                enemy.hp -= 50; 
                onEnemyHit(state, enemy, 50);
                spawnExplosion(state, enemy.x, enemy.y, '#fff', ParticleType.NORMAL);
            }
        }

        // --- 5. DEATH LOGIC --- (2A) centralised in KillLogic
        if (enemy.hp <= 0) {
            killEnemy(state, i, enemy.def.behavior === 'EXPLODE' ? 'explode' : 'other', onEnemySeen);
        }
    }
};
