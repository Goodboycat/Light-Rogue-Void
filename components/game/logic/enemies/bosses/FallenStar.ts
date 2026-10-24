import { MutableGameState, Enemy, ParticleType } from '../../../types';
import { spawnExplosion } from '../../../Particles';
import { VFX } from '../../../Emitters';
import { acquireProjectile } from '../../../ObjectPools';

export const updateFallenStar = (
    state: MutableGameState, 
    enemy: Enemy, 
    dx: number, 
    dy: number, 
    onEnemySeen: (id: string) => void
) => {
    let moveX = dx;
    let moveY = dy;
    let moveSpeed = enemy.speed * 0.7;

    const timer = enemy.state.timer;

    // Orbiting mechanic
    if (!enemy.state.custom) enemy.state.custom = {};
    if (enemy.state.custom.orbitAngle === undefined) enemy.state.custom.orbitAngle = 0;
    
    enemy.state.custom.orbitAngle += 0.02;

    const dist = Math.hypot(dx, dy);

    // If too far, close in, else orbit
    if (dist > 300) {
        moveX = dx;
        moveY = dy;
        moveSpeed = enemy.speed * 1.2;
    } else {
        const targetX = state.player.x + Math.cos(enemy.state.custom.orbitAngle) * 200;
        const targetY = state.player.y + Math.sin(enemy.state.custom.orbitAngle) * 200;
        moveX = targetX - enemy.x;
        moveY = targetY - enemy.y;
        moveSpeed = enemy.speed * 0.8;
    }

    // Passive: Celestial Burn (spawns orange smoke)
    if (state.frame % 10 === 0) {
        spawnExplosion(state, enemy.x + (Math.random() - 0.5) * 40, enemy.y + (Math.random() - 0.5) * 40, '#f97316', ParticleType.SMOKE);
    }

    // Ability 1: Star Burst (Ring of Fire)
    if (timer % 90 === 0) {
        const count = 10;
        for (let k = 0; k < count; k++) {
            const angle = (k / count) * Math.PI * 2;
            state.projectiles.push(acquireProjectile({
                x: enemy.x, y: enemy.y,
                vx: Math.cos(angle) * 5, vy: Math.sin(angle) * 5,
                life: 120, size: 12, color: '#f97316', damage: 1, isEnemy: true, visualType: 'FIRE_BLAST'
            }));
        }
        VFX.castShockwave(state, enemy.x, enemy.y, '#f97316');
    }

    // Ability 2: Solar Orbs (Homing but slower)
    if (timer % 150 === 0) {
        const aimAngle = Math.atan2(dy, dx);
        for (let k = -1; k <= 1; k++) {
            state.projectiles.push(acquireProjectile({
                x: enemy.x, y: enemy.y,
                vx: Math.cos(aimAngle + k * 0.4) * 4, vy: Math.sin(aimAngle + k * 0.4) * 4,
                life: 200, size: 15, color: '#ea580c', damage: 2, isEnemy: true, visualType: 'HOMING_MISSILE'
            }));
        }
    }

    return { moveX, moveY, moveSpeed };
};
