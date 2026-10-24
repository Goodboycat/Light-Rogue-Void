import { MutableGameState, Enemy, ParticleType } from '../../../types';
import { spawnExplosion } from '../../../Particles';
import { VFX } from '../../../Emitters';
import { acquireProjectile } from '../../../ObjectPools';

export const updateHollowHalo = (
    state: MutableGameState, 
    enemy: Enemy, 
    dx: number, 
    dy: number, 
    onEnemySeen: (id: string) => void
) => {
    let moveX = dx;
    let moveY = dy;
    let moveSpeed = enemy.speed * 0.6;

    const timer = enemy.state.timer;

    // Ability 1: Dark Teleport
    if (timer % 180 === 0) {
        // Teleport to a random location near player (between 150 and 300 radius)
        const angle = Math.random() * Math.PI * 2;
        const radius = 150 + Math.random() * 150;
        
        spawnExplosion(state, enemy.x, enemy.y, '#a855f7', ParticleType.THUNDER);
        
        enemy.x = state.player.x + Math.cos(angle) * radius;
        enemy.y = state.player.y + Math.sin(angle) * radius;
        
        spawnExplosion(state, enemy.x, enemy.y, '#c084fc', ParticleType.THUNDER);
        VFX.castShockwave(state, enemy.x, enemy.y, '#a855f7');
    }

    // Ability 2: Railgun Lightning Bolt (high-speed beam)
    if (timer % 80 === 40) {
        const aimAngle = Math.atan2(state.player.y - enemy.y, state.player.x - enemy.x);
        state.projectiles.push(acquireProjectile({
            x: enemy.x, y: enemy.y,
            vx: Math.cos(aimAngle) * 15, vy: Math.sin(aimAngle) * 15,
            life: 60, size: 8, color: '#a855f7', damage: 2, isEnemy: true, visualType: 'RAILGUN_BEAM'
        }));
        VFX.castThunderChain(state, enemy.x, enemy.y, state.player.x, state.player.y);
    }

    // Ability 3: Halo Discharge (Radial ring of slow purple orbs)
    if (timer % 120 === 0) {
        const count = 12;
        for (let k = 0; k < count; k++) {
            const angle = (k / count) * Math.PI * 2;
            state.projectiles.push(acquireProjectile({
                x: enemy.x, y: enemy.y,
                vx: Math.cos(angle) * 3, vy: Math.sin(angle) * 3,
                life: 180, size: 14, color: '#c084fc', damage: 1, isEnemy: true, visualType: 'ARCANE_MISSILE'
            }));
        }
    }

    return { moveX, moveY, moveSpeed };
};
