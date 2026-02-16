
import { MutableGameState, Enemy } from '../../../types';
import { VFX } from '../../../Emitters';
import { WORLD_SIZE } from '../../../Constants';

export const updateVoidWarden = (
    state: MutableGameState, 
    enemy: Enemy, 
    dx: number, 
    dy: number, 
    onEnemySeen: (id: string) => void
) => {
    // Pin-Pon Logic
    if (!enemy.state.custom || !enemy.state.custom.dirX) {
        const angle = Math.random() * Math.PI * 2;
        enemy.state.custom = { dirX: Math.cos(angle), dirY: Math.sin(angle) };
    }
    
    // Uses WORLD_SIZE for boundary bouncing
    const halfSize = WORLD_SIZE / 2 - enemy.size * 2;
    
    if (enemy.x > halfSize && enemy.state.custom.dirX > 0) enemy.state.custom.dirX *= -1;
    if (enemy.x < -halfSize && enemy.state.custom.dirX < 0) enemy.state.custom.dirX *= -1;
    if (enemy.y > halfSize && enemy.state.custom.dirY > 0) enemy.state.custom.dirY *= -1;
    if (enemy.y < -halfSize && enemy.state.custom.dirY < 0) enemy.state.custom.dirY *= -1;
    
    let moveX = enemy.state.custom.dirX * 2000;
    let moveY = enemy.state.custom.dirY * 2000;
    let moveSpeed = enemy.speed;

    // 0. PASSIVE: GRAVITY PULL
    const dist = Math.hypot(dx, dy);
    if (dist < 800 && dist > 1) {
        const strength = 0.5; 
        state.player.vx -= (dx / dist) * strength;
        state.player.vy -= (dy / dist) * strength;
    }

    // 1. Permanent Power: Toxic Nebula
    if (state.frame % 120 === 0) {
         state.projectiles.push({
            x: enemy.x, y: enemy.y, vx: 0, vy: 0,
            life: 100000000, 
            size: 160, 
            color: '#10b981', damage: 1, isEnemy: true, isStatic: true,
            visualType: 'TOXIC_CLOUD'
         });
    }

    // 2. Arcane Missiles
    if (enemy.state.timer % 180 === 0) {
        for(let k=0; k<8; k++) {
            const angle = (k/8) * Math.PI * 2 + (enemy.state.timer * 0.01);
            state.projectiles.push({
                x: enemy.x, y: enemy.y, vx: Math.cos(angle)*5, vy: Math.sin(angle)*5, life: 300, size: 8, color: '#a78bfa', damage: 1, isEnemy: true, visualType: 'ARCANE_MISSILE'
            });
        }
    }

    // 4. Laser Sweep
    if (enemy.state.timer % 600 > 500) {
         moveSpeed = 0; 
         if (state.frame % 5 === 0) {
             const angle = (state.frame * 0.1);
             state.projectiles.push({
                 x: enemy.x, y: enemy.y, vx: Math.cos(angle)*10, vy: Math.sin(angle)*10, life: 100, size: 5, color: '#ffffff', damage: 1, isEnemy: true
             });
         }
    }

    // 5. Speed Surge
    if (enemy.state.timer % 900 === 0) {
         moveSpeed *= 3; 
         VFX.castShockwave(state, enemy.x, enemy.y, '#ffffff');
    }

    return { moveX, moveY, moveSpeed };
};
