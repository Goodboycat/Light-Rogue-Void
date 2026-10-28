
import { updateGoldenMite } from '../FoundEvents';
import { MutableGameState, Enemy, ParticleType } from '../../types';
import { createParticle, spawnExplosion } from '../../Particles';
import { spawnEnemy } from './SpawnLogic';
import { VFX } from '../../Emitters';
import { ENEMY_SHOT_WARN_FRAMES } from '../../Constants';
import { Projectile } from '../../types';
import { acquireProjectile } from '../../Pools';

/** (4B) Enemy shot: pooled (acquireProjectile), never capped — rule 9. */
export const enemyShot = (state: MutableGameState, p: Projectile): boolean => {
    state.projectiles.push(acquireProjectile(p));
    return true;
};
/** (4B) Shooter telegraph: returns true on the frame the shot should fire; `enemy.shotWarn` glows for 0.4 s before. */
const warnThenFire = (enemy: Enemy, period: number, phase = 0): boolean => {
    const t = (enemy.state.timer + phase) % period;
    if (t === period - ENEMY_SHOT_WARN_FRAMES) enemy.shotWarn = ENEMY_SHOT_WARN_FRAMES;
    return t === 0 && enemy.state.timer > 0;
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
    // (3A step 7) found events: Treasure Pylon never moves; Golden Mite flees and blinks away
    if (enemy.isTreasurePylon) return { moveX: 0, moveY: 0, moveSpeed: 0 };
    const mite = updateGoldenMite(state, enemy, i, dx, dy, dist);
    if (mite) return mite;

    // Reset visuals if needed
    enemy.opacity = 1.0;

    // --- OMEGA CONSTRUCT SPECIAL (Force Push) ---
    // If it's the Omega Construct, it pushes other enemies away violently
    if (enemy.def.id === 'e57') {
        const repulsionRadius = 200;
        state.enemies.forEach(other => {
            if (other === enemy || other.isBoss) return;
            const odx = other.x - enemy.x;
            const ody = other.y - enemy.y;
            const odist = Math.hypot(odx, ody);
            
            if (odist < repulsionRadius && odist > 1) {
                // Violent push (Titan Shield style)
                const force = 25; // "Like bullets"
                const angle = Math.atan2(ody, odx);
                other.vx += Math.cos(angle) * force;
                other.vy += Math.sin(angle) * force;
                
                // Visual spark to indicate collision/launch
                if (state.frame % 5 === 0) {
                    createParticle(state, other.x, other.y, ParticleType.SPARK, '#fff', { speed: 5, life: 10 });
                }
            }
        });
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
        case 'ORBIT':
            const orbitDist = 200;
            const angle = Math.atan2(dy, dx);
            if (dist < orbitDist) {
                moveX = -Math.sin(angle);
                moveY = Math.cos(angle);
            }
            break;
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
                // Special check for Mirage to be invisible while aiming
                if (enemy.def.id === 'e33') enemy.opacity = 0.2;

                if (warnThenFire(enemy, 120)) {
                    const shotAngle = Math.atan2(dy, dx);
                    enemyShot(state, {
                        x: enemy.x, y: enemy.y,
                        vx: Math.cos(shotAngle) * 8, vy: Math.sin(shotAngle) * 8,
                        life: 100, size: 5, color: '#fff',
                        damage: 1, isEnemy: true
                    });
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
                const friend = state.enemies.find(e => e !== enemy && e.hp < e.maxHp && Math.abs(e.x - enemy.x) < 300 && Math.abs(e.y - enemy.y) < 300);
                if (friend) {
                    friend.hp = Math.min(friend.maxHp, friend.hp + 20);
                    const bx = (friend.x - enemy.x)/10;
                    const by = (friend.y - enemy.y)/10;
                    for(let k=0; k<10; k++) {
                        createParticle(state, enemy.x + bx*k, enemy.y + by*k, ParticleType.HEAL, '#4ade80', {life: 10, size: 2});
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
                    state.enemies.forEach(e => {
                        // Limit buffing range, exclude self, exclude bosses from getting super speed
                        if(e !== enemy && !e.isBoss && Math.hypot(e.x - enemy.x, e.y - enemy.y) < 200) {
                            // Cap max speed increase to 3x base speed to prevent infinite stacking
                            if (e.speed < e.def.baseSpeed * 3) {
                                e.speed *= 1.05; 
                                createParticle(state, e.x, e.y, ParticleType.NORMAL, '#fbbf24', { speed: 1, life: 10 });
                            }
                        }
                    });
            }
            break;
        case 'SHOOT_SPIRAL':
            moveSpeed *= 0.6;
            { // 2 s cycle: 0.4 s glow, then a 1.6 s spiral burst (readable pause between bursts)
                const cyc = enemy.state.timer % 120;
                if (cyc === 0) enemy.shotWarn = ENEMY_SHOT_WARN_FRAMES;
                if (cyc >= ENEMY_SHOT_WARN_FRAMES && enemy.state.timer % 5 === 0) {
                    const sAngle = enemy.state.timer * 0.1;
                    enemyShot(state, {
                    x: enemy.x, y: enemy.y,
                    vx: Math.cos(sAngle) * 4, vy: Math.sin(sAngle) * 4,
                    life: 60, size: 4, color: enemy.def.glowColor,
                    damage: 1, isEnemy: true
                });
                }
            }
            break;
        case 'SHOOT_RING':
            moveSpeed = 0;
            if (warnThenFire(enemy, 150)) {
                    for(let k=0; k<8; k++) {
                        const rAngle = (k / 8) * Math.PI * 2;
                        enemyShot(state, {
                        x: enemy.x, y: enemy.y,
                        vx: Math.cos(rAngle) * 5, vy: Math.sin(rAngle) * 5,
                        life: 70, size: 4, color: enemy.def.glowColor,
                        damage: 1, isEnemy: true
                    });
                    }
            }
            break;
        
        // --- FIXED / NEW BEHAVIORS ---

        case 'GRAVITY_PULL':
            moveSpeed = 0; // Stationary
            // Pull Player
            if (dist < 400 && dist > 0.1) {
                const strength = 0.5 * (1 - dist/400); // Stronger closer
                state.player.vx -= (dx/dist) * strength;
                state.player.vy -= (dy/dist) * strength;
                
                if (state.frame % 5 === 0) {
                    createParticle(state, enemy.x, enemy.y, ParticleType.VOID, '#000', { vx: (dx/dist)*2, vy: (dy/dist)*2, life: 20 });
                }
            }
            break;

        case 'MIMIC':
            // Mimics player movement vector (roughly)
            moveX = state.player.vx * 10;
            moveY = state.player.vy * 10;
            // Also tries to stay close but not too close
            if (dist > 300) { moveX += dx; moveY += dy; }
            if (dist < 100) { moveX -= dx; moveY -= dy; }
            break;

        case 'FREEZE_AURA':
            if (dist < 200) {
                // Not actually freezing state (hard to do without refactoring player), but applying massive drag
                state.player.vx *= 0.8;
                state.player.vy *= 0.8;
                if (state.frame % 10 === 0) {
                    createParticle(state, state.player.x, state.player.y, ParticleType.ICE, '#38bdf8', { speed: 1, life: 20 });
                }
            }
            break;

        case 'WEAVER':
            // Move towards player but also oscillate perpendicularly
            const angleW = Math.atan2(dy, dx);
            const perpW = angleW + Math.PI/2;
            const weave = Math.sin(state.frame * 0.1) * 100;
            moveX = dx + Math.cos(perpW) * weave;
            moveY = dy + Math.sin(perpW) * weave;
            
            // Vortex Weaver ID check for pull
            if (enemy.def.id === 'e23' && dist < 300 && dist > 0.1) {
                state.player.vx -= (dx/dist) * 0.2;
                state.player.vy -= (dy/dist) * 0.2;
            }
            break;

        case 'SINE':
            // Simple Sine wave approach
            const angleS = Math.atan2(dy, dx);
            const perpS = angleS + Math.PI/2;
            const sine = Math.sin(state.frame * 0.1 + i) * 50;
            moveX = dx + Math.cos(perpS) * sine;
            moveY = dy + Math.sin(perpS) * sine;
            break;
        
        case 'TANK':
            // Just slow chase, PhysicsLogic handles the heavy weight (repulsion resistance)
            moveSpeed *= 0.5;
            break;
            
        case 'SPLIT':
            // Chase behavior, logic for splitting is in death handler
            break;

        case 'CLEANSER':
            // Sentry Behavior: Maintain optimal distance (200-400) from player
            if (dist > 400) {
                 moveX = dx; moveY = dy; 
            } else if (dist < 200) {
                 moveX = -dx; moveY = -dy; 
            } else {
                 moveSpeed = 0; 
            }
            
            if (state.frame % 30 === 0) {
                // Visual Pulse Ring
                createParticle(state, enemy.x, enemy.y, ParticleType.RING, '#2dd4bf', { size: enemy.size * 3, life: 30, speed: 0 });
                
                // Area Effect
                const auraRadius = 300;
                state.enemies.forEach(e => {
                    const d = Math.hypot(e.x - enemy.x, e.y - enemy.y);
                    if (d < auraRadius) {
                        // Grant Immunity
                        e.isSlowImmune = true;
                        
                        // Cleanse Slows (Restore speed if below base spawn speed)
                        if (e.spawnSpeed && e.speed < e.spawnSpeed) {
                            e.speed = e.spawnSpeed;
                            createParticle(state, e.x, e.y, ParticleType.HEAL, '#2dd4bf', { size: 4, life: 20, speed: 1 });
                        }
                    }
                });
            }
            break;

        // --- NEW COSMIC BEHAVIORS ---

        case 'TELEPORT_STRIKE':
            // Omen: Chases slowly, then teleports ON TOP of player explosively
            if (enemy.state.timer % 120 === 0) {
                // Telegraph
                createParticle(state, enemy.x, enemy.y, ParticleType.RING, '#ef4444', { size: 20, life: 30 });
            }
            if (enemy.state.timer % 120 === 30) {
                spawnExplosion(state, enemy.x, enemy.y, '#000', ParticleType.VOID);
                enemy.x = state.player.x;
                enemy.y = state.player.y;
                spawnExplosion(state, enemy.x, enemy.y, '#ef4444', ParticleType.BOSS_AURA); // Damage handled by collision logic
            }
            if (enemy.state.timer % 120 < 30) {
                moveSpeed = 0; // Stop before teleport
            }
            break;

        case 'LEAVE_MINES':
            // Solar Wisp: Fast movement, drops mines
            if (state.frame % 20 === 0) {
                enemyShot(state, {
                    x: enemy.x, y: enemy.y, vx: 0, vy: 0,
                    life: 300, size: 20, color: '#fbbf24', damage: 1, isEnemy: true, isStatic: true,
                    visualType: 'SOLAR_FLARE'
                });
            }
            // Avoid player if too close, otherwise random movement
            if (dist < 200) { moveX = -dx; moveY = -dy; }
            else {
                moveX = Math.cos(state.frame * 0.1 + i) * 100;
                moveY = Math.sin(state.frame * 0.1 + i) * 100;
            }
            break;

        case 'LASER_SPIN':
            // Orbital Fortress: Stationary, spins lasers
            moveSpeed = 0;
            if (state.frame % 2 === 0) {
                const beams = 4;
                for(let b=0; b<beams; b++) {
                    const angle = (state.frame * 0.02) + (b * (Math.PI*2/beams));
                    const range = 400;
                    // Visualize beam with particles
                    for(let k=1; k<10; k++) {
                        const bx = enemy.x + Math.cos(angle) * (range * k/10);
                        const by = enemy.y + Math.sin(angle) * (range * k/10);
                        createParticle(state, bx, by, ParticleType.GLOW, enemy.def.glowColor, { life: 5, size: 3 });
                        
                        // Check hit (simple beam collision)
                        if (Math.hypot(bx - state.player.x, by - state.player.y) < 20) {
                            if (!state.player.isTitanShieldActive && state.player.dashTimer <= 0) {
                                state.player.vx += Math.cos(angle) * 5;
                                state.player.vy += Math.sin(angle) * 5;
                                // Damage handled externally usually, but we can push here
                            }
                        }
                    }
                }
            }
            break;

        case 'PHASE_DASH':
            // Void Wraith: Invisible 50% of the time, dashes when visible
            const phase = enemy.state.timer % 120;
            if (phase < 60) {
                enemy.opacity = 0.1;
                enemy.projectileImmunity = 1; // Immune while phased
                moveSpeed *= 0.5; // Slow creep
            } else if (phase === 60) {
                enemy.opacity = 1;
                // Dash towards player
                const angle = Math.atan2(dy, dx);
                enemy.vx = Math.cos(angle) * 30;
                enemy.vy = Math.sin(angle) * 30;
                spawnExplosion(state, enemy.x, enemy.y, '#fff', ParticleType.VOID);
            } else {
                enemy.opacity = 1;
                moveSpeed = 0; // Glide from dash
            }
            break;

        case 'BLACK_HOLE_CAST':
            // Event Horizon: Spawns Singularity Projectiles
            if (dist > 300) { moveX = dx; moveY = dy; }
            else { moveSpeed = 0; }
            
            if (warnThenFire(enemy, 180)) {
                enemyShot(state, {
                    x: enemy.x, y: enemy.y,
                    vx: (dx/dist) * 3, vy: (dy/dist) * 3,
                    life: 300, size: 20, color: '#000', damage: 1, isEnemy: true,
                    visualType: 'BOSS_SINGULARITY',
                    pullRadius: 200
                });
            }
            break;
    }

    return { moveX, moveY, moveSpeed };
};
