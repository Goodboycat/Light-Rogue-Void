import { MutableGameState, Enemy, ParticleType } from '../../../types';
import { spawnEnemy } from '../SpawnLogic';
import { spawnExplosion } from '../../../Particles';
import { VFX } from '../../../Emitters';
import { acquireProjectile } from '../../../ObjectPools';

export const updateFalseDawn = (
    state: PointerEvent | any, // Use state typed correctly or simple any to match other boss sign
    enemy: Enemy, 
    dx: number, 
    dy: number, 
    onEnemySeen: (id: string) => void
) => {
    let moveX = dx;
    let moveY = dy;
    let moveSpeed = enemy.speed * 0.8;

    const timer = enemy.state.timer;

    // Ability 1: Blinding Dash
    if (timer % 180 === 150) {
        // Charge dash direction
        const angle = Math.atan2(dy, dx);
        enemy.vx = Math.cos(angle) * 18;
        enemy.vy = Math.sin(angle) * 18;
        VFX.castShockwave(state, enemy.x, enemy.y, '#22d3ee');
    }

    // Spawn cyan particles when traveling fast
    if (Math.hypot(enemy.vx, enemy.vy) > 5) {
        if (state.frame % 3 === 0) {
            spawnExplosion(state, enemy.x, enemy.y, '#22d3ee', ParticleType.ICE);
            // Drop cyan static trails
            state.projectiles.push(acquireProjectile({
                x: enemy.x, y: enemy.y, vx: 0, vy: 0,
                life: 60, size: 25, color: '#06b6d4', damage: 1, isEnemy: true, isStatic: true, visualType: 'TOXIC_CLOUD'
            }));
        }
    }

    // Ability 2: Summon Light Mirages (Minions)
    if (timer % 150 === 0) {
        spawnExplosion(state, enemy.x, enemy.y, '#22d3ee', ParticleType.ICE);
        for (let k = 0; k < 3; k++) {
            const rx = enemy.x + (Math.random() - 0.5) * 100;
            const ry = enemy.y + (Math.random() - 0.5) * 100;
            spawnEnemy(state, 30, onEnemySeen, rx, ry);
        }
    }

    // Ability 3: Cyan Solar Flare Burst
    if (timer % 100 === 0) {
        const angle = Math.random() * Math.PI * 2;
        for (let k = 0; k < 6; k++) {
            const a = angle + (k / 6) * Math.PI * 2;
            state.projectiles.push(acquireProjectile({
                x: enemy.x, y: enemy.y,
                vx: Math.cos(a) * 6, vy: Math.sin(a) * 6,
                life: 90, size: 10, color: '#22d3ee', damage: 1, isEnemy: true, visualType: 'SOLAR_FLARE'
            }));
        }
    }

    return { moveX, moveY, moveSpeed };
};
