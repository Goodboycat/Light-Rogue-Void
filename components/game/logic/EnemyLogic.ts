import { audio } from '../audio';
import { MutableGameState, ParticleType, DamageSource } from '../types';
import { PlayerStats } from '../../../types';
import { createParticle, spawnExplosion, spawnKillPop } from '../Particles';
import { VFX } from '../Emitters';
import { spawnEnemy as spawnEnemyLogic } from './enemies/SpawnLogic';
import { updateBossBehavior } from './enemies/BossLogic';
import { updateStandardBehavior } from './enemies/StandardBehavior';
import { updateEnemyPhysics } from './enemies/PhysicsLogic';
import { MERCY_MULTIPLIERS } from '../mercy';
import { BOSS_VICTORY_CONFIG } from '../bossVictory';
import { cancelAllTelegraphs } from './enemies/BossKit';
import { onKill } from './BoonLogic';
import { triggerHitStop, HIT_FEEDBACK_CONFIG } from '../HitFeedback';
import { acquireDrop, swapRemoveEnemy, swapRemoveProjectile } from '../ObjectPools';

export const spawnEnemy = spawnEnemyLogic;

export const updateEnemies = (state: MutableGameState, stats: PlayerStats, maturityScale: number, onDamage: (amt: number, source?: DamageSource) => void, onEnemySeen: (id: string) => void) => {
    // --- CINEMATIC CHECK ---
    if (state.activeBoss?.state.custom?.cinematicMode) {
        if (state.activeBoss) {
            updateBossBehavior(state, state.activeBoss, 0, 0, onEnemySeen);
        }
        return;
    }

    for (let i = state.enemies.length - 1; i >= 0; i--) {
        const enemy = state.enemies[i];
        
        if (enemy.projectileImmunity > 0) enemy.projectileImmunity--;
        if (enemy.hitFlashTimer && enemy.hitFlashTimer > 0) enemy.hitFlashTimer--;

        const dx = state.player.x - enemy.x;
        const dy = state.player.y - enemy.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        if (!enemy.isBoss || MERCY_MULTIPLIERS.bossCadenceMult >= 1.0 || state.frame % 7 !== 0) {
            enemy.state.timer++;
        }

        let behaviorResult;

        // --- 1. BEHAVIOR LOGIC ---
        if (enemy.isBoss) {
            behaviorResult = updateBossBehavior(state, enemy, dx, dy, onEnemySeen);
        } else {
            behaviorResult = updateStandardBehavior(state, enemy, i, dx, dy, dist, onEnemySeen);
        }

        // --- 2. PHYSICS & MOVEMENT ---
        if (state.chaosEvent && state.chaosEvent.active && state.chaosEvent.type === 'BERSERKER') {
            behaviorResult.moveSpeed *= 1.5;
        }
        updateEnemyPhysics(state, enemy, i, behaviorResult.moveX, behaviorResult.moveY, behaviorResult.moveSpeed, stats, dist, dx, dy);

        if (enemy.contactHitCooldown && enemy.contactHitCooldown > 0) {
            enemy.contactHitCooldown--;
        }

        // --- 3. DAMAGE AURA ---
        if (dist < 100 * maturityScale && stats.damageAura > 0) {
            enemy.hp -= stats.damageAura; audio.playHit();
            if (state.frame % 20 === 0) 
                createParticle(state, enemy.x, enemy.y, ParticleType.FIRE, '#ef4444', { speed: 1, size: 2 });
        }

        // --- 4. PLAYER COLLISION ---
        const hitRad = (enemy.isBoss ? enemy.def.size * 0.8 : enemy.def.size) + state.player.size;
        if (dist < hitRad) {
            const contactDamage = 10 * maturityScale;
            enemy.hp -= contactDamage; audio.playHit();
            
            if (state.frame % 5 === 0) {
                VFX.spark(state, (state.player.x + enemy.x) / 2, (state.player.y + enemy.y) / 2, '#ffffff', 2);
            }

            if (state.player.dashTimer <= 0) {
                if (state.player.isTitanShieldActive) {
                    enemy.hp -= 10; audio.playHit(); 
                    VFX.spark(state, enemy.x, enemy.y, '#fbbf24', 5);
                    
                    if (!enemy.isBoss) {
                        const angle = Math.atan2(dy, dx);
                        enemy.vx -= Math.cos(angle) * 15;
                        enemy.vy -= Math.sin(angle) * 15;
                    }
                } else {
                    if (!enemy.contactHitCooldown || enemy.contactHitCooldown <= 0) {
                        enemy.contactHitCooldown = 30;
                        onDamage(1, { kind: 'enemy', id: enemy.def.id, label: enemy.def.name }); 
                        const angle = Math.atan2(dy, dx);
                        
                        state.player.vx += Math.cos(angle) * 15;
                        state.player.vy += Math.sin(angle) * 15;
                        
                        if (enemy.def.behavior === 'EXPLODE') {
                            enemy.hp = 0; 
                            spawnExplosion(state, enemy.x, enemy.y, '#f87171', ParticleType.FIRE);
                            onDamage(2, { kind: 'enemy', id: enemy.def.id, label: `${enemy.def.name} explosion` }); 
                        }
                    }
                }
            } else {
                enemy.hp -= 50; audio.playHit(); 
                spawnExplosion(state, enemy.x, enemy.y, '#fff', ParticleType.NORMAL);
            }
        }

        // --- 5. DEATH LOGIC ---
        if (enemy.hp <= 0) {
            if (enemy.isMachine && state.mission && state.mission.type === 'DESTROY_MACHINES') {
                state.mission.current = (state.mission.current || 0) + 1;
            }
            
            let isKey = false;
            if (state.mission && state.mission.type === 'COLLECT_KEYS' && (state.keysDropped || 0) < state.mission.target) {
                if (Math.random() < 0.2 || enemy.isBoss) {
                    isKey = true;
                    state.keysDropped = (state.keysDropped || 0) + 1;
                }
            }
            state.drops.push(acquireDrop({ x: enemy.x, y: enemy.y, value: enemy.def.essenceReward, isKey }));
  
            spawnKillPop(state, enemy.x, enemy.y, enemy.def.glowColor, enemy.def.particleEffect);
            
            if (stats.special_dashOnKill) {
                state.player.dashCooldownTimer = 0;
            }
            const nextCombo = (state.player.comboCount || 0) + 1;
            state.player.comboCount = nextCombo;
            state.player.comboTimer = 180;
            state.player.totalKills = (state.player.totalKills || 0) + 1;
            state.player.bestCombo = Math.max(state.player.bestCombo || 0, nextCombo);
            audio.playKill(nextCombo);

            const isElite = !enemy.isBoss && (enemy.isSemiBoss || enemy.def.behavior === 'SEMI_BOSS' || enemy.def.behavior === 'TANK' || enemy.def.size >= 22 || enemy.def.essenceReward >= 25 || enemy.state?.custom?.isEliteSubstituted);
            if (isElite) {
                triggerHitStop(state, HIT_FEEDBACK_CONFIG.eliteKillHitStopFrames);
            }

            onKill(state, enemy, state.runMods, (healAmt) => {
                state.heartsCollected = (state.heartsCollected || 0) + healAmt;
            });

            const kills = state.player.totalKills || 0;
            if (
                (MERCY_MULTIPLIERS.healEveryNKills > 0 && kills % MERCY_MULTIPLIERS.healEveryNKills === 0) ||
                (MERCY_MULTIPLIERS.heartDropChanceBonus > 0 && Math.random() < MERCY_MULTIPLIERS.heartDropChanceBonus)
            ) {
                state.drops.push(acquireDrop({ x: enemy.x, y: enemy.y, value: 0, isHeart: true }));
            }
            
            if (enemy.isBoss) {
                cancelAllTelegraphs();

                state.slowMoTimer = BOSS_VICTORY_CONFIG.slowMoFrames;
                state.hitPauseTimer = BOSS_VICTORY_CONFIG.hitPauseFrames;
                state.edgeFlash = { color: '#ffffff', timer: 24 };
                state.camera.zoomTimer = BOSS_VICTORY_CONFIG.cameraZoomFrames;
                state.camera.maxZoomTimer = BOSS_VICTORY_CONFIG.cameraZoomFrames;

                VFX.castShockwave(state, enemy.x, enemy.y, '#ffffff');
                VFX.castShockwave(state, enemy.x, enemy.y, enemy.def.glowColor || '#fbbf24');
                VFX.castShockwave(state, enemy.x, enemy.y, '#38bdf8');
                spawnExplosion(state, enemy.x, enemy.y, '#fff', ParticleType.RING);
                spawnExplosion(state, enemy.x, enemy.y, enemy.def.glowColor || '#fbbf24', ParticleType.RING);
                spawnExplosion(state, enemy.x, enemy.y, '#38bdf8', ParticleType.RING);
                spawnExplosion(state, enemy.x, enemy.y, '#fff', ParticleType.BOSS_AURA);

                for (let pIdx = state.projectiles.length - 1; pIdx >= 0; pIdx--) {
                    const proj = state.projectiles[pIdx];
                    if (proj.isEnemy) {
                        if (state.drops.length < BOSS_VICTORY_CONFIG.maxEssenceDrops) {
                            state.drops.push(acquireDrop({ x: proj.x, y: proj.y, value: 5 }));
                        }
                        spawnExplosion(state, proj.x, proj.y, '#c084fc', ParticleType.GLOW);
                        swapRemoveProjectile(state.projectiles, pIdx);
                    }
                }

                const rainToSpawn = Math.min(
                    BOSS_VICTORY_CONFIG.essenceRainCount,
                    Math.max(0, BOSS_VICTORY_CONFIG.maxEssenceDrops - state.drops.length)
                );
                const rewardPerOrb = Math.max(5, Math.round(enemy.def.essenceReward / Math.max(1, rainToSpawn)));
                for (let r = 0; r < rainToSpawn; r++) {
                    const rAngle = (r / Math.max(1, rainToSpawn)) * Math.PI * 2 + (Math.random() - 0.5) * 0.3;
                    const rDist = 30 + Math.random() * 180;
                    state.drops.push(acquireDrop({
                        x: enemy.x + Math.cos(rAngle) * rDist,
                        y: enemy.y + Math.sin(rAngle) * rDist,
                        value: rewardPerOrb
                    }));
                }
                if (BOSS_VICTORY_CONFIG.guaranteeHeart) {
                    state.drops.push(acquireDrop({ x: enemy.x, y: enemy.y, value: 0, isHeart: true }));
                }
                state.vortexTimer = 90;

                state.activeBoss = undefined;
                for (let eIdx = 0; eIdx < state.enemies.length; eIdx++) {
                    if (state.enemies[eIdx].isSemiBoss) state.enemies[eIdx].hp = 0;
                }
            }

            if (enemy.isSemiBoss || enemy.def.behavior === 'SEMI_BOSS') {
                spawnExplosion(state, enemy.x, enemy.y, '#fff', ParticleType.BOSS_AURA);
                const sbId = enemy.def.id || 'sb_hunter';
                if (typeof window !== 'undefined' && typeof CustomEvent !== 'undefined') {
                    window.dispatchEvent(new CustomEvent('boss_defeated_event', { detail: { bossId: sbId } }));
                }
            }
            swapRemoveEnemy(state.enemies, i);
            if (enemy.def.behavior === 'SPLIT') {
                for (let k = 0; k < 2; k++) spawnEnemy(state, 1, onEnemySeen, enemy.x + Math.random() * 20, enemy.y + Math.random() * 20);
            }
        }
    }
};
