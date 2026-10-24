import { MutableGameState, Enemy, ParticleType } from '../../types';
import { createParticle, spawnExplosion } from '../../Particles';
import { spawnEnemy, initializeEnemy } from './SpawnLogic';
import { acquireProjectile } from '../../ObjectPools';
import { getQuality } from '../../Quality';

const SB_CHILD_DEF = {
    id: 'sb_child',
    name: 'Swarm Crab',
    description: '',
    baseHp: 30,
    hpScaling: 5,
    baseSpeed: 2,
    size: 10,
    color: '#16a34a',
    glowColor: '#4ade80',
    behavior: 'CHASE' as const,
    visualType: 'CRAB' as const,
    spawnWeight: 0,
    minWave: 0,
    essenceReward: 10,
    particleEffect: ParticleType.NORMAL
};

export const updateStandardBehavior = (
    state: MutableGameState, 
    enemy: Enemy, 
    i: number,
    dx: number, 
    dy: number, 
    dist: number, 
    onEnemySeen: (id: string) => void
) => {
    let moveX = dx;
    let moveY = dy;
    let moveSpeed = enemy.speed;

    enemy.opacity = 1.0;

    // --- OMEGA CONSTRUCT SPECIAL (Force Push) ---
    if (enemy.def.id === 'e57') {
        const repulsionRadius = 200;
        for (let idx = 0; idx < state.enemies.length; idx++) {
            const other = state.enemies[idx];
            if (other === enemy || other.isBoss) continue;
            const odx = other.x - enemy.x;
            const ody = other.y - enemy.y;
            const odist = Math.hypot(odx, ody);
            
            if (odist < repulsionRadius && odist > 1) {
                const force = 25;
                const angle = Math.atan2(ody, odx);
                other.vx += Math.cos(angle) * force;
                other.vy += Math.sin(angle) * force;
                
                if (state.frame % 5 === 0) {
                    createParticle(state, other.x, other.y, ParticleType.SPARK, '#fff', { speed: 5, life: 10 });
                }
            }
        }
    }

    switch (enemy.def.behavior) {
        case 'DASH':
            if (enemy.state.timer % 120 < 80) {
                moveSpeed *= 0.3; 
                if (state.frame % 5 === 0) createParticle(state, enemy.x, enemy.y, ParticleType.THUNDER, enemy.def.glowColor, { speed: 2 });
            } else {
                moveSpeed *= 4; 
            }
            break;
        case 'ORBIT': {
            const orbitDist = 200;
            const angle = Math.atan2(dy, dx);
            if (dist < orbitDist) {
                moveX = -Math.sin(angle);
                moveY = Math.cos(angle);
            }
            break;
        }
        case 'SWARM':
            moveX += Math.sin(state.frame * 0.2 + i) * 50;
            moveY += Math.cos(state.frame * 0.2 + i) * 50;
            break;
        case 'EXPLODE':
            if (dist < 100) moveSpeed *= 2.5; 
            if (state.frame % 5 === 0) createParticle(state, enemy.x, enemy.y, ParticleType.FIRE, enemy.def.glowColor, { speed: 1 });
            break;
        case 'SNIPER':
            if (dist < 300) { moveX = -dx; moveY = -dy; }
            else if (dist < 600) {
                moveSpeed = 0;
                if (enemy.def.id === 'e33') enemy.opacity = 0.2;

                if (enemy.state.timer % 120 === 0) {
                    const shotAngle = Math.atan2(dy, dx);
                    state.projectiles.push(acquireProjectile({
                        x: enemy.x, y: enemy.y,
                        vx: Math.cos(shotAngle) * 8, vy: Math.sin(shotAngle) * 8,
                        life: 100, size: 5, color: '#fff',
                        damage: 1, isEnemy: true
                    }));
                }
            }
            break;
        case 'TELEPORT':
            if (enemy.state.timer % 180 === 0 && dist > 200) {
                spawnExplosion(state, enemy.x, enemy.y, enemy.def.color, ParticleType.NORMAL);
                const tAngle = Math.atan2(dy, dx) + (Math.random() - 0.5);
                enemy.x = state.player.x - Math.cos(tAngle) * 150;
                enemy.y = state.player.y - Math.sin(tAngle) * 150;
                spawnExplosion(state, enemy.x, enemy.y, enemy.def.color, ParticleType.NORMAL);
            }
            break;
        case 'HEALER':
            moveSpeed *= 0.8;
            if (enemy.state.timer % 60 === 0) {
                let friend: Enemy | null = null;
                for (let idx = 0; idx < state.enemies.length; idx++) {
                    const e = state.enemies[idx];
                    if (e !== enemy && e.hp < e.maxHp && Math.abs(e.x - enemy.x) < 300 && Math.abs(e.y - enemy.y) < 300) {
                        friend = e;
                        break;
                    }
                }
                if (friend) {
                    friend.hp = Math.min(friend.maxHp, friend.hp + 20);
                    const bx = (friend.x - enemy.x) / 10;
                    const by = (friend.y - enemy.y) / 10;
                    for (let k = 0; k < 10; k++) {
                        createParticle(state, enemy.x + bx * k, enemy.y + by * k, ParticleType.HEAL, '#4ade80', { life: 10, size: 2 });
                    }
                }
            }
            if (dist < 200) { moveX = -dx; moveY = -dy; }
            break;
        case 'SPAWNER':
            moveSpeed *= 0.5;
            if (enemy.state.timer % 300 === 0) {
                spawnEnemy(state, 1, onEnemySeen, enemy.x + 20, enemy.y);
            }
            if (dist < 300) { moveX = -dx; moveY = -dy; }
            break;
        case 'TRAIL':
            if (state.frame % 10 === 0) {
                createParticle(state, enemy.x, enemy.y, ParticleType.FIRE, enemy.def.color, { speed: 0, life: 100, size: 5 });
            }
            break;
        case 'BUFF_SPEED':
            if (state.frame % 30 === 0) {
                for (let idx = 0; idx < state.enemies.length; idx++) {
                    const e = state.enemies[idx];
                    if (e !== enemy && !e.isBoss && Math.hypot(e.x - enemy.x, e.y - enemy.y) < 200) {
                        if (e.speed < e.def.baseSpeed * 3) {
                            e.speed *= 1.05; 
                            createParticle(state, e.x, e.y, ParticleType.NORMAL, '#fbbf24', { speed: 1, life: 10 });
                        }
                    }
                }
            }
            break;
        case 'SHOOT_SPIRAL':
            moveSpeed *= 0.6;
            if (enemy.state.timer % 5 === 0) {
                const sAngle = enemy.state.timer * 0.1;
                state.projectiles.push(acquireProjectile({
                    x: enemy.x, y: enemy.y,
                    vx: Math.cos(sAngle) * 4, vy: Math.sin(sAngle) * 4,
                    life: 60, size: 4, color: enemy.def.glowColor,
                    damage: 1, isEnemy: true
                }));
            }
            break;
        case 'SHOOT_RING':
            moveSpeed = 0;
            if (enemy.state.timer % 150 === 0) {
                for (let k = 0; k < 8; k++) {
                    const rAngle = (k / 8) * Math.PI * 2;
                    state.projectiles.push(acquireProjectile({
                        x: enemy.x, y: enemy.y,
                        vx: Math.cos(rAngle) * 5, vy: Math.sin(rAngle) * 5,
                        life: 70, size: 4, color: enemy.def.glowColor,
                        damage: 1, isEnemy: true
                    }));
                }
            }
            break;

        case 'GRAVITY_PULL':
            moveSpeed = 0;
            if (dist < 400 && dist > 0.1) {
                const strength = 0.5 * (1 - dist / 400);
                state.player.vx -= (dx / dist) * strength;
                state.player.vy -= (dy / dist) * strength;
                
                if (state.frame % 5 === 0) {
                    createParticle(state, enemy.x, enemy.y, ParticleType.VOID, '#000', { vx: (dx / dist) * 2, vy: (dy / dist) * 2, life: 20 });
                }
            }
            break;

        case 'MIMIC':
            moveX = state.player.vx * 10;
            moveY = state.player.vy * 10;
            if (dist > 300) { moveX += dx; moveY += dy; }
            if (dist < 100) { moveX -= dx; moveY -= dy; }
            break;

        case 'FREEZE_AURA':
            if (dist < 200) {
                state.player.vx *= 0.8;
                state.player.vy *= 0.8;
                if (state.frame % 10 === 0) {
                    createParticle(state, state.player.x, state.player.y, ParticleType.ICE, '#38bdf8', { speed: 1, life: 20 });
                }
            }
            break;

        case 'WEAVER': {
            const angleW = Math.atan2(dy, dx);
            const perpW = angleW + Math.PI / 2;
            const weave = Math.sin(state.frame * 0.1) * 100;
            moveX = dx + Math.cos(perpW) * weave;
            moveY = dy + Math.sin(perpW) * weave;
            
            if (enemy.def.id === 'e23' && dist < 300 && dist > 0.1) {
                state.player.vx -= (dx / dist) * 0.2;
                state.player.vy -= (dy / dist) * 0.2;
            }
            break;
        }

        case 'SINE': {
            const angleS = Math.atan2(dy, dx);
            const perpS = angleS + Math.PI / 2;
            const sine = Math.sin(state.frame * 0.1 + i) * 50;
            moveX = dx + Math.cos(perpS) * sine;
            moveY = dy + Math.sin(perpS) * sine;
            break;
        }
        
        case 'TANK':
            moveSpeed *= 0.5;
            break;
            
        case 'SPLIT':
            break;

        case 'CLEANSER':
            if (dist > 400) {
                moveX = dx; moveY = dy; 
            } else if (dist < 200) {
                moveX = -dx; moveY = -dy; 
            } else {
                moveSpeed = 0; 
            }
            
            if (state.frame % 30 === 0) {
                createParticle(state, enemy.x, enemy.y, ParticleType.RING, '#2dd4bf', { size: enemy.size * 3, life: 30, speed: 0 });
                
                const auraRadius = 300;
                for (let idx = 0; idx < state.enemies.length; idx++) {
                    const e = state.enemies[idx];
                    const d = Math.hypot(e.x - enemy.x, e.y - enemy.y);
                    if (d < auraRadius) {
                        e.isSlowImmune = true;
                        if (e.spawnSpeed && e.speed < e.spawnSpeed) {
                            e.speed = e.spawnSpeed;
                            createParticle(state, e.x, e.y, ParticleType.HEAL, '#2dd4bf', { size: 4, life: 20, speed: 1 });
                        }
                    }
                }
            }
            break;

        case 'TELEPORT_STRIKE':
            if (enemy.state.timer % 120 === 0) {
                createParticle(state, enemy.x, enemy.y, ParticleType.RING, '#ef4444', { size: 20, life: 30 });
            }
            if (enemy.state.timer % 120 === 30) {
                spawnExplosion(state, enemy.x, enemy.y, '#000', ParticleType.VOID);
                enemy.x = state.player.x;
                enemy.y = state.player.y;
                spawnExplosion(state, enemy.x, enemy.y, '#ef4444', ParticleType.BOSS_AURA);
            }
            if (enemy.state.timer % 120 < 30) {
                moveSpeed = 0;
            }
            break;

        case 'LEAVE_MINES':
            if (state.frame % 20 === 0) {
                state.projectiles.push(acquireProjectile({
                    x: enemy.x, y: enemy.y, vx: 0, vy: 0,
                    life: 300, size: 20, color: '#fbbf24', damage: 1, isEnemy: true, isStatic: true,
                    visualType: 'SOLAR_FLARE'
                }));
            }
            if (dist < 200) { moveX = -dx; moveY = -dy; }
            else {
                moveX = Math.cos(state.frame * 0.1 + i) * 100;
                moveY = Math.sin(state.frame * 0.1 + i) * 100;
            }
            break;

        case 'LASER_SPIN':
            moveSpeed = 0;
            if (state.frame % 2 === 0) {
                const beams = 4;
                for (let b = 0; b < beams; b++) {
                    const angle = (state.frame * 0.02) + (b * (Math.PI * 2 / beams));
                    const range = 400;
                    for (let k = 1; k < 10; k++) {
                        const bx = enemy.x + Math.cos(angle) * (range * k / 10);
                        const by = enemy.y + Math.sin(angle) * (range * k / 10);
                        createParticle(state, bx, by, ParticleType.GLOW, enemy.def.glowColor, { life: 5, size: 3 });
                        
                        if (Math.hypot(bx - state.player.x, by - state.player.y) < 20) {
                            if (!state.player.isTitanShieldActive && state.player.dashTimer <= 0) {
                                state.player.vx += Math.cos(angle) * 5;
                                state.player.vy += Math.sin(angle) * 5;
                            }
                        }
                    }
                }
            }
            break;

        case 'PHASE_DASH': {
            const phase = enemy.state.timer % 120;
            if (phase < 60) {
                enemy.opacity = 0.1;
                enemy.projectileImmunity = 1;
                moveSpeed *= 0.5;
            } else if (phase === 60) {
                enemy.opacity = 1;
                const angle = Math.atan2(dy, dx);
                enemy.vx = Math.cos(angle) * 30;
                enemy.vy = Math.sin(angle) * 30;
                spawnExplosion(state, enemy.x, enemy.y, '#fff', ParticleType.VOID);
            } else {
                enemy.opacity = 1;
                moveSpeed = 0;
            }
            break;
        }

        case 'BLACK_HOLE_CAST':
            if (dist > 300) { moveX = dx; moveY = dy; }
            else { moveSpeed = 0; }
            
            if (enemy.state.timer % 180 === 0 && dist > 0.01) {
                const bhProj = acquireProjectile({
                    x: enemy.x, y: enemy.y,
                    vx: (dx / dist) * 3, vy: (dy / dist) * 3,
                    life: 300, size: 20, color: '#000', damage: 1, isEnemy: true,
                    visualType: 'BOSS_SINGULARITY',
                });
                bhProj.pullRadius = 200;
                state.projectiles.push(bhProj);
            }
            break;

        case 'SEMI_BOSS': {
            enemy.isSlowImmune = true;
            enemy.size = 90;
            if (enemy.def) enemy.def.size = 90;

            const cycleDuration = 280;
            const activeBurstDuration = 100;
            const cycleTimer = enemy.state.timer % cycleDuration;
            const patternIndex = Math.floor(enemy.state.timer / cycleDuration) % 4;

            const baseAng = Math.atan2(dy, dx);
            const LIGHT_DASH_SPEED = 20.0;

            if (cycleTimer < activeBurstDuration) {
                if (patternIndex === 0) {
                    const orbitAngle = baseAng + Math.sin(cycleTimer * 0.08) * 1.8;
                    moveX = Math.cos(orbitAngle);
                    moveY = Math.sin(orbitAngle);
                    moveSpeed = LIGHT_DASH_SPEED;
                } else if (patternIndex === 1) {
                    const zigzagDir = (Math.floor(cycleTimer / 15) % 2 === 0 ? 1 : -1) * 1.1;
                    moveX = Math.cos(baseAng + zigzagDir);
                    moveY = Math.sin(baseAng + zigzagDir);
                    moveSpeed = LIGHT_DASH_SPEED * 1.1;
                } else if (patternIndex === 2) {
                    const oscillation = Math.cos(cycleTimer * 0.1) * 1.4;
                    moveX = Math.cos(baseAng + Math.PI * 0.5 * oscillation);
                    moveY = Math.sin(baseAng + Math.PI * 0.5 * oscillation);
                    moveSpeed = LIGHT_DASH_SPEED;
                } else {
                    moveX = Math.cos(baseAng);
                    moveY = Math.sin(baseAng);
                    moveSpeed = LIGHT_DASH_SPEED * 1.2;
                }

                if (state.frame % 3 === 0) {
                    createParticle(state, enemy.x, enemy.y, ParticleType.GLOW, enemy.def.glowColor || '#ef4444', { life: 15, size: 12, speed: 1 });
                    createParticle(state, enemy.x, enemy.y, ParticleType.SPARK, '#ffffff', { life: 10, size: 6, speed: 3 });
                }
            } else {
                moveX = 0;
                moveY = 0;
                moveSpeed = 0;

                if ((cycleTimer - activeBurstDuration) % 30 === 0) {
                    createParticle(state, enemy.x, enemy.y, ParticleType.RING, enemy.def.glowColor || '#ef4444', { size: enemy.size * 2, life: 25, speed: 0 });
                }
            }

            if (enemy.state.custom?.sbType === 0) {
                const phase = Math.floor(enemy.state.timer / 240) % 3;
                
                if (phase === 0 && enemy.state.timer % 40 === 0) {
                    for (let p = -1; p <= 1; p++) {
                        const ang = Math.atan2(dy, dx) + p * 0.3;
                        state.projectiles.push(acquireProjectile({
                            x: enemy.x, y: enemy.y, vx: Math.cos(ang) * 5, vy: Math.sin(ang) * 5,
                            life: 180, size: 8, color: '#ef4444', damage: 1, isEnemy: true
                        }));
                    }
                } else if (phase === 1 && enemy.state.timer % 15 === 0) {
                    const ang = enemy.state.timer * 0.1;
                    state.projectiles.push(acquireProjectile({
                        x: enemy.x, y: enemy.y, vx: Math.cos(ang) * 6, vy: Math.sin(ang) * 6,
                        life: 120, size: 6, color: '#f87171', damage: 1, isEnemy: true
                    }));
                } else if (phase === 2 && enemy.state.timer % 60 === 0) {
                    const ang = Math.atan2(dy, dx);
                    state.projectiles.push(acquireProjectile({
                        x: enemy.x, y: enemy.y, vx: Math.cos(ang) * 10, vy: Math.sin(ang) * 10,
                        life: 120, size: 12, color: '#b91c1c', damage: 2, isEnemy: true
                    }));
                }
            } else if (enemy.state.custom?.sbType === 1) {
                const Q = getQuality(state.performanceMode);
                if (enemy.state.timer % 120 === 0 && state.enemies.length < Q.enemyCap) {
                    for (let k = 0; k < 3; k++) {
                        if (state.enemies.length >= Q.enemyCap) break;
                        const child: any = {
                            x: enemy.x + Math.random() * 40 - 20, y: enemy.y + Math.random() * 40 - 20, vx: 0, vy: 0,
                            hp: 30, maxHp: 30, def: SB_CHILD_DEF, speed: 2, size: 10, color: '#16a34a', state: { timer: 0 }, projectileImmunity: 0,
                        };
                        initializeEnemy(child, state);
                        state.enemies.push(child);
                    }
                }
            } else if (enemy.state.custom?.sbType === 2) {
                if (enemy.state.timer % 120 < 60) {
                    createParticle(state, enemy.x, enemy.y, ParticleType.NORMAL, '#facc15', { life: 5, size: 10 });
                } else if (enemy.state.timer % 120 === 60) {
                    for (let b = 0; b < 12; b++) {
                        const ang = (Math.PI * 2 / 12) * b;
                        state.projectiles.push(acquireProjectile({
                            x: enemy.x, y: enemy.y, vx: Math.cos(ang) * 4, vy: Math.sin(ang) * 4,
                            life: 200, size: 10, color: '#fef08a', damage: 1, isEnemy: true
                        }));
                    }
                }
            }
            break;
        }
    }
    
    return { moveX, moveY, moveSpeed };
};
