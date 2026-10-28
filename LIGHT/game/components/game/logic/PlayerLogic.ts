
import { MutableGameState, ParticleType } from '../types';
import { onEnemyHit } from '../Feel';
import { PlayerStats } from '../../../types';
import { createParticle, spawnExplosion } from '../Particles';
import { WORLD_SIZE } from '../Constants';
import { InputHandler } from '../Input';
import { VFX } from '../Emitters';
import { sfx } from '../../../audio/hooks'; // (6B)

export const updatePlayer = (
    state: MutableGameState, 
    stats: PlayerStats, 
    input: InputHandler,
    canvasWidth: number,
    canvasHeight: number,
    maturityScale: number,
    mouseMovementEnabled: boolean = true
) => {
    // --- CHECK CINEMATIC FREEZE ---
    if (state.activeBoss?.state.custom?.cinematicMode) {
        state.player.vx = 0;
        state.player.vy = 0;
        return; // Halt player update completely
    }

    // Base Speed
    let speed = stats.moveSpeed * 3;
    let dx = 0;
    let dy = 0;

    // --- DARK MATTER TRAIL ("MUD") LOGIC ---
    // Check if player is standing on a VOID_TRAIL projectile
    let isInMud = false;
    for (const p of state.projectiles) {
        if (p.visualType === 'VOID_TRAIL') {
             const dist = Math.hypot(p.x - state.player.x, p.y - state.player.y);
             if (dist < p.size) {
                 isInMud = true;
                 break;
             }
        }
    }

    if (state.playerInRubble) isInMud = true; // (2C) Entropy Titan rubble
    if (isInMud && state.player.dashTimer <= 0) {
        // "Stuck in mud" - massive slow unless dashing (90% reduction)
        speed *= 0.1; 
        if (state.frame % 5 === 0) {
            // Visually show struggle
            createParticle(state, state.player.x, state.player.y, ParticleType.VOID, '#000', { speed: 1, life: 10, size: 4 });
        }
    }

    // --- BOSS MECHANICS (HARDCORE) ---
    if (state.activeBoss) {
        const boss = state.activeBoss;
        
        // "Darkness" Black Hole Boss Mechanics
        if (boss.def.id === 'darkness') {
            speed *= 0.8;

            const bdx = boss.x - state.player.x;
            const bdy = boss.y - state.player.y;
            const dist = Math.sqrt(bdx*bdx + bdy*bdy);
            
            const pullStrength = 0.1; 
            if (dist > 20) {
                state.player.vx += (bdx / dist) * pullStrength;
                state.player.vy += (bdy / dist) * pullStrength;
            }

            if (state.frame % 5 === 0) {
                 createParticle(state, state.player.x, state.player.y, ParticleType.VOID, '#000', { speed: 2, life: 15, size: 3 });
            }
        }
        else if (boss.def.id === 'void_warden') {
             const bdx = boss.x - state.player.x;
             const bdy = boss.y - state.player.y;
             const dist = Math.sqrt(bdx*bdx + bdy*bdy);
             const pullStrength = 0.4; 
             if (dist > 50) {
                 state.player.vx += (bdx / dist) * pullStrength;
                 state.player.vy += (bdy / dist) * pullStrength;
             }
             if (state.frame % 4 === 0) {
                 const angle = Math.atan2(bdy, bdx);
                 createParticle(state, state.player.x, state.player.y, ParticleType.VOID, '#a78bfa', { 
                     vx: Math.cos(angle)*5, vy: Math.sin(angle)*5, life: dist/5, size: 2 
                 });
             }
        }
    }

    // --- INPUT HANDLING ---
    // 1. Virtual Joystick (Priority)
    if (Math.abs(input.virtualMove.x) > 0.05 || Math.abs(input.virtualMove.y) > 0.05) {
        dx = input.virtualMove.x;
        dy = input.virtualMove.y;
    } 
    // 2. Keyboard / Mouse
    else {
        // Keyboard Accumulation
        if (input.keys['KeyW'] || input.keys['ArrowUp']) dy -= 1;
        if (input.keys['KeyS'] || input.keys['ArrowDown']) dy += 1;
        if (input.keys['KeyA'] || input.keys['ArrowLeft']) dx -= 1;
        if (input.keys['KeyD'] || input.keys['ArrowRight']) dx += 1;

        if (dx !== 0 || dy !== 0) {
            // Keyboard Movement detected
            const len = Math.sqrt(dx*dx + dy*dy);
            dx /= len;
            dy /= len;
        } else if (mouseMovementEnabled) {
            // Mouse Pointer Movement (Fallback if keyboard idle AND enabled)
            const centerX = canvasWidth / 2;
            const centerY = canvasHeight / 2;
            const mdx = input.mouseX - centerX;
            const mdy = input.mouseY - centerY;
            const mDist = Math.sqrt(mdx*mdx + mdy*mdy);
            if (mDist > 20) {
                dx = mdx / mDist;
                dy = mdy / mDist;
            }
        }
    }

    // --- DASH LOGIC ---
    if (state.player.dashCooldownTimer > 0) state.player.dashCooldownTimer--;
    
    if (state.player.dashTimer > 0) {
        state.player.dashTimer--;
        createParticle(state, state.player.x, state.player.y, ParticleType.NORMAL, '#fff', { speed: 0, life: 30 });
    } else {
        // Smooth Movement Physics
        state.player.vx += (dx * speed - state.player.vx) * 0.1;
        state.player.vy += (dy * speed - state.player.vy) * 0.1;

        if ((input.keys['Space'] || input.isMouseDown || input.virtualDash) && state.player.dashCooldownTimer <= 0 && !state.burstFiredThisFrame) {
            
            if (stats.superDashLevel > 0) {
                const damage = 100 + (stats.superDashLevel * 25);
                VFX.castSuperDashExplosion(state, state.player.x, state.player.y);
                const radius = 150;
                state.enemies.forEach(e => {
                    const dist = Math.hypot(e.x - state.player.x, e.y - state.player.y);
                    if (dist < radius + e.size) {
                        e.hp -= damage;
                        onEnemyHit(state, e, damage);
                        VFX.spark(state, e.x, e.y, '#ffffff', 5);
                        if (!e.isBoss && e.def.behavior !== 'TANK') {
                            const angle = Math.atan2(e.y - state.player.y, e.x - state.player.x);
                            e.vx += Math.cos(angle) * 20;
                            e.vy += Math.sin(angle) * 20;
                        }
                    }
                });
            } else {
                spawnExplosion(state, state.player.x, state.player.y, '#fff', ParticleType.NORMAL);
            }

            state.player.dashTimer = 10 + stats.dashDuration;
            sfx('player_dash'); // (6B)
            // (3A) Mirror Shard: extra charges skip the cooldown; they refill when a normal cooldown completes
            if ((state.dashChargesLeft ?? 0) > 0) {
                state.dashChargesLeft!--;
                state.player.dashCooldownTimer = 12; // tiny gap so one press ≠ two dashes
            } else {
                state.player.dashCooldownTimer = 60 + stats.dashCooldown;
                if (state.runModifiers?.dashCharges) state.dashChargesLeft = state.runModifiers.dashCharges;
            }
            state.player.vx = dx * 15;
            state.player.vy = dy * 15;
        }
    }

    state.player.x += state.player.vx;
    state.player.y += state.player.vy;

    if (!Number.isFinite(state.player.x) || !Number.isFinite(state.player.y)) {
         state.player.x = 0;
         state.player.y = 0;
         state.player.vx = 0;
         state.player.vy = 0;
    }

    state.player.size = 10 * maturityScale;

    const halfWorld = WORLD_SIZE / 2;
    if (state.player.x < -halfWorld) { state.player.x = -halfWorld; state.player.vx = 0; }
    if (state.player.x > halfWorld) { state.player.x = halfWorld; state.player.vx = 0; }
    if (state.player.y < -halfWorld) { state.player.y = -halfWorld; state.player.vy = 0; }
    if (state.player.y > halfWorld) { state.player.y = halfWorld; state.player.vy = 0; }
};
