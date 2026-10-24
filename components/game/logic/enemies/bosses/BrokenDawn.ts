import { MutableGameState, Enemy, ParticleType } from '../../../types';
import { spawnExplosion } from '../../../Particles';
import { VFX } from '../../../Emitters';
import { acquireProjectile } from '../../../ObjectPools';

export const updateBrokenDawn = (
    state: MutableGameState, 
    enemy: Enemy, 
    dx: number, 
    dy: number, 
    onEnemySeen: (id: string) => void
) => {
    let moveX = dx;
    let moveY = dy;
    let moveSpeed = enemy.speed * 0.5;

    const timer = enemy.state.timer;

    // Passive: Gravity pull (same as final boss/neutron star but slightly less)
    const dist = Math.hypot(dx, dy);
    if (dist < 800 && dist > 1) {
        const strength = 0.15;
        state.player.vx -= (dx / dist) * strength;
        state.player.vy -= (dy / dist) * strength;
    }

    // Ability 1: Fractured Rift (Spawns a massive lingering damage area on player)
    if (timer % 150 === 0) {
        state.projectiles.push(acquireProjectile({
            x: state.player.x, y: state.player.y, vx: 0, vy: 0,
            life: 180, size: 160, color: '#f59e0b', damage: 2, isEnemy: true, isStatic: true, visualType: 'VOID_RIFT'
        }));
        spawnExplosion(state, state.player.x, state.player.y, '#f59e0b', ParticleType.BOSS_AURA);
        VFX.castShockwave(state, state.player.x, state.player.y, '#d97706');
    }

    // Ability 2: Spiral Amber Sparks (Casts beautiful amber spirals)
    if (timer % 50 === 0) {
        const angleOffset = (timer / 50) * 0.4;
        const count = 8;
        for (let k = 0; k < count; k++) {
            const angle = angleOffset + (k / count) * Math.PI * 2;
            state.projectiles.push(acquireProjectile({
                x: enemy.x, y: enemy.y,
                vx: Math.cos(angle) * 5, vy: Math.sin(angle) * 5,
                life: 130, size: 10, color: '#fbbf24', damage: 1, isEnemy: true, visualType: 'FIRE_BLAST'
            }));
        }
    }

    // Ability 3: Magma Surge (Giant slow fireball that splits on death)
    if (timer % 200 === 100) {
        const aimAngle = Math.atan2(dy, dx);
        state.projectiles.push(acquireProjectile({
            x: enemy.x, y: enemy.y,
            vx: Math.cos(aimAngle) * 3, vy: Math.sin(aimAngle) * 3,
            life: 180, size: 30, color: '#b45309', damage: 3, isEnemy: true, visualType: 'BOSS_SINGULARITY'
        }));
    }

    return { moveX, moveY, moveSpeed };
};
