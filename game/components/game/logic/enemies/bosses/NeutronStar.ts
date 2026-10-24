
import { MutableGameState, Enemy } from '../../../types';
import { WORLD_SIZE } from '../../../Constants';
import { VFX } from '../../../Emitters';

export const updateNeutronStar = (
    state: MutableGameState, 
    enemy: Enemy, 
    dx: number, 
    dy: number, 
    onEnemySeen: (id: string) => void
) => {
    let moveX = dx;
    let moveY = dy;
    let moveSpeed = enemy.speed;

    // 0. PASSIVE: GRAVITY PULL
    const dist = Math.hypot(dx, dy);
    if (dist < 800 && dist > 1) {
        const strength = 0.3; 
        state.player.vx -= (dx / dist) * strength;
        state.player.vy -= (dy / dist) * strength;
    }

    // 1. Permanent Power: STATIC LASERS (Uses WORLD_SIZE)
    if (enemy.state.timer % 120 === 0) {
         const safeRange = (WORLD_SIZE / 2) - 200;
         const rx = (Math.random() - 0.5) * 2 * safeRange;
         const ry = (Math.random() - 0.5) * 2 * safeRange;
         const isHorizontal = Math.random() > 0.5;

         state.projectiles.push({
             x: rx, y: ry, 
             vx: isHorizontal ? 1 : 0, 
             vy: isHorizontal ? 0 : 1,
             life: 100000000, 
             size: 30, 
             color: '#fff', damage: 2, isEnemy: true, 
             visualType: 'RAILGUN_BEAM',
             isStatic: true,
             customData: { spawnFrame: state.frame }
         });
    }

    // 2. Spiral Shot
    if (enemy.state.timer % 10 === 0) {
        const angle = enemy.state.timer * 0.1; 
        state.projectiles.push({
            x: enemy.x, y: enemy.y, vx: Math.cos(angle) * 7, vy: Math.sin(angle) * 7, life: 200, size: 6, color: '#38bdf8', damage: 1, isEnemy: true, visualType: 'DEFAULT'
        });
    }
    
    // 3. Pulsar Waves
    if (enemy.state.timer % 400 === 0) {
        for(let k=0; k<4; k++) {
             state.projectiles.push({
                 x: enemy.x, y: enemy.y, vx: Math.cos(k*Math.PI/2)*2, vy: Math.sin(k*Math.PI/2)*2, 
                 life: 400, size: 300, 
                 color: '#0ea5e9', damage: 4, isEnemy: true, visualType: 'TOXIC_CLOUD',
                 customData: { warmup: 60 } 
             });
        }
    }

    // 4. Hyper Spiral Charge (Body Slam)
    const chargeCycle = enemy.state.timer % 600;
    if (chargeCycle >= 300 && chargeCycle < 450) {
        moveSpeed *= 6.0; // Extreme speed for ramming
        
        // Target a point spiraling inwards to the player to create a sweeping charge
        const t = chargeCycle - 300;
        const duration = 150;
        const progress = t / duration;
        
        // Spiral parameters: Radius decreases, Angle spins fast
        const radius = 300 * (1 - progress); 
        const angle = state.frame * 0.2; 
        
        const tx = state.player.x + Math.cos(angle) * radius;
        const ty = state.player.y + Math.sin(angle) * radius;
        
        // Override movement vector to chase this spiraling point
        moveX = tx - enemy.x;
        moveY = ty - enemy.y;
        
        // Visuals indicating high velocity
        if (state.frame % 4 === 0) {
             VFX.castShockwave(state, enemy.x, enemy.y, '#38bdf8');
        }
    }

    // 5. ZigZag Movement (Passive Motion when not charging)
    const angleToPlayer = Math.atan2(dy, dx);
    const perpAngle = angleToPlayer + Math.PI / 2;
    moveX += Math.cos(perpAngle) * Math.sin(state.frame * 0.05) * 200;
    moveY += Math.sin(perpAngle) * Math.sin(state.frame * 0.05) * 200;

    return { moveX, moveY, moveSpeed };
};
