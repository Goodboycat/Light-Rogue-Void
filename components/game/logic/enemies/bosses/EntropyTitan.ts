
import { MutableGameState, Enemy, ParticleType } from '../../../types';
import { spawnExplosion } from '../../../Particles';
import { VFX } from '../../../Emitters';

export const updateEntropyTitan = (
    state: MutableGameState, 
    enemy: Enemy, 
    dx: number, 
    dy: number, 
    onEnemySeen: (id: string) => void
) => {
    let moveX = dx;
    let moveY = dy;
    let moveSpeed = enemy.speed;

    if (!enemy.state.custom) enemy.state.custom = { pattern: 0, patternTimer: 0 };

    // 0. PASSIVE: GRAVITY PULL
    const dist = Math.hypot(dx, dy);
    if (dist < 800 && dist > 1) {
        const strength = 0.4; 
        state.player.vx -= (dx / dist) * strength;
        state.player.vy -= (dy / dist) * strength;
    }

    // Bullet Hell Pattern Switching
    enemy.state.custom.patternTimer++;
    if (enemy.state.custom.patternTimer > 600) {
        enemy.state.custom.pattern = (enemy.state.custom.pattern + 1) % 3;
        enemy.state.custom.patternTimer = 0;
    }

    // Pattern A: Spiral Galaxy
    if (enemy.state.custom.pattern === 0) {
        if (state.frame % 3 === 0) {
            const arms = 5;
            for(let i=0; i<arms; i++) {
                const angle = (state.frame * 0.05) + (i * (Math.PI*2/arms));
                state.projectiles.push({
                    x: enemy.x, y: enemy.y,
                    vx: Math.cos(angle)*5, vy: Math.sin(angle)*5,
                    life: 300, size: 6, color: '#bef264', damage: 1, isEnemy: true, visualType: 'DEFAULT'
                });
            }
        }
    }
    // Pattern B: Nova Ring
    else if (enemy.state.custom.pattern === 1) {
        if (state.frame % 60 === 0) {
            const count = 36;
            for(let i=0; i<count; i++) {
                const angle = (i/count) * Math.PI * 2;
                state.projectiles.push({
                    x: enemy.x, y: enemy.y,
                    vx: Math.cos(angle)*4, vy: Math.sin(angle)*4,
                    life: 400, size: 8, color: '#84cc16', damage: 1, isEnemy: true, visualType: 'DEFAULT'
                });
            }
        }
    }
    // Pattern C: Chaos Rain
    else if (enemy.state.custom.pattern === 2) {
        if (state.frame % 2 === 0) {
            const angle = Math.random() * Math.PI * 2;
            state.projectiles.push({
                x: enemy.x, y: enemy.y,
                vx: Math.cos(angle)*8, vy: Math.sin(angle)*8,
                life: 300, size: 5, color: '#ecfccb', damage: 1, isEnemy: true, visualType: 'DEFAULT'
            });
        }
    }

    // 1. Smash
    if (enemy.state.timer % 300 === 0) {
        spawnExplosion(state, enemy.x, enemy.y, '#84cc16', ParticleType.BOSS_AURA);
        VFX.castShockwave(state, enemy.x, enemy.y, '#84cc16'); 
        for(let k=0; k<20; k++) {
            const a = (k/20)*Math.PI*2;
            state.projectiles.push({
                x: enemy.x, y: enemy.y, vx: Math.cos(a)*8, vy: Math.sin(a)*8, life: 100, size: 20, color: '#65a30d', damage: 2, isEnemy: true, visualType: 'DEFAULT'
            });
        }
    }

    // 2. Charge
    if (enemy.state.timer % 400 === 200) {
        const angle = Math.atan2(dy, dx);
        enemy.vx = Math.cos(angle) * 20;
        enemy.vy = Math.sin(angle) * 20;
    }

    // 3. Rocket Barrage
    if (enemy.state.timer % 120 === 0) {
         const spawnRadius = enemy.size + 60; 
         for(let k=0; k<5; k++) {
             const angle = Math.atan2(dy, dx) + (Math.random()-0.5);
             const sx = enemy.x + Math.cos(angle) * spawnRadius;
             const sy = enemy.y + Math.sin(angle) * spawnRadius;
             
             state.projectiles.push({
                 x: sx, y: sy, vx: Math.cos(angle)*6, vy: Math.sin(angle)*6, life: 150, size: 8, color: '#bef264', damage: 1, isEnemy: true, visualType: 'HOMING_MISSILE'
             });
         }
    }

    // 4. Permanent Power: Void Mud (90% Slow)
    if (enemy.state.timer % 120 === 0) {
        // Spawn randomly around the player or arena to create hazardous zones
        const range = 1000;
        const rx = state.player.x + (Math.random() - 0.5) * 2 * range;
        const ry = state.player.y + (Math.random() - 0.5) * 2 * range;
        
        state.projectiles.push({
            x: rx, y: ry, vx: 0, vy: 0, 
            life: 100000000, 
            size: 200, 
            color: '#1e1b4b', 
            damage: 0, isEnemy: true, isStatic: true, 
            visualType: 'VOID_TRAIL',
            customData: { spawnFrame: state.frame }
        });
    }

    return { moveX, moveY, moveSpeed };
};
