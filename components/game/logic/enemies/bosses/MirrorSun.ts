import { MutableGameState, Enemy, ParticleType } from '../../../types';
import { spawnExplosion } from '../../../Particles';
import { VFX } from '../../../Emitters';
import { acquireProjectile } from '../../../ObjectPools';

export const updateMirrorSun = (
    state: MutableGameState, 
    enemy: Enemy, 
    dx: number, 
    dy: number, 
    onEnemySeen: (id: string) => void
) => {
    // Mirrors player movement (if player moves right, enemy tries to match/intercept or move symmetrically)
    let moveX = -state.player.vx * 3 + dx;
    let moveY = -state.player.vy * 3 + dy;
    let moveSpeed = enemy.speed * 0.9;

    const timer = enemy.state.timer;

    // Red stardust trail left behind as it moves
    if (state.frame % 8 === 0) {
        state.projectiles.push(acquireProjectile({
            x: enemy.x, y: enemy.y, vx: 0, vy: 0,
            life: 80, size: 25, color: '#f43f5e', damage: 1, isEnemy: true, isStatic: true, visualType: 'STARDUST_TRAIL'
        }));
        spawnExplosion(state, enemy.x, enemy.y, '#f43f5e', ParticleType.FIRE);
    }

    // Ability 1: Reflective Flare Barrage
    if (timer % 100 === 0) {
        const angle = Math.atan2(dy, dx);
        for (let k = -2; k <= 2; k++) {
            const spread = k * 0.25;
            state.projectiles.push(acquireProjectile({
                x: enemy.x, y: enemy.y,
                vx: Math.cos(angle + spread) * 7, vy: Math.sin(angle + spread) * 7,
                life: 110, size: 12, color: '#fda4af', damage: 2, isEnemy: true, visualType: 'SOLAR_FLARE'
            }));
        }
        VFX.castShockwave(state, enemy.x, enemy.y, '#f43f5e');
    }

    // Ability 2: Crimson Comet (Fires a giant bouncing comet towards player)
    if (timer % 160 === 80) {
        const aimAngle = Math.atan2(dy, dx);
        state.projectiles.push(acquireProjectile({
            x: enemy.x, y: enemy.y,
            vx: Math.cos(aimAngle) * 9, vy: Math.sin(aimAngle) * 9,
            life: 140, size: 22, color: '#e11d48', damage: 3, isEnemy: true, visualType: 'CRIMSON_COMET'
        }));
    }

    return { moveX, moveY, moveSpeed };
};
