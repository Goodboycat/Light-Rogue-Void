
import { MutableGameState, Enemy, ParticleType } from '../../../types';
import { spawnEnemy } from '../SpawnLogic';
import { spawnExplosion, createParticle } from '../../../Particles';
import { VFX } from '../../../Emitters';

export const updateHiveMind = (
    state: MutableGameState, 
    enemy: Enemy, 
    dx: number, 
    dy: number, 
    onEnemySeen: (id: string) => void
) => {
    let moveX = dx;
    let moveY = dy;
    let moveSpeed = enemy.speed * 0.5;

    // 0. PASSIVE: GRAVITY PULL (Universal)
    const dist = Math.hypot(dx, dy);
    if (dist < 600 && dist > 1) {
        const strength = 0.2; 
        state.player.vx -= (dx / dist) * strength;
        state.player.vy -= (dy / dist) * strength;
    }

    // 1. Permanent Power: INFINITE SWARM (Missiles from edges)
    if (enemy.state.timer % 30 === 0) { 
        const angle = Math.random() * Math.PI * 2;
        const radius = 900; 
        const sx = state.player.x + Math.cos(angle) * radius;
        const sy = state.player.y + Math.sin(angle) * radius;
        
        const aimAngle = Math.atan2(state.player.y - sy, state.player.x - sx);
        
        state.projectiles.push({
            x: sx,
            y: sy,
            vx: Math.cos(aimAngle) * 3, 
            vy: Math.sin(aimAngle) * 3,
            life: 100000000, 
            size: 15,
            color: '#a3e635',
            damage: 2, isEnemy: true, 
            visualType: 'HOMING_MISSILE'
        });
    }

    // 2. Spawn Larva
    if (enemy.state.timer % 200 === 0) {
        spawnExplosion(state, enemy.x, enemy.y, '#ca8a04', ParticleType.SMOKE);
        for(let k=0; k<3; k++) spawnEnemy(state, 1, onEnemySeen, enemy.x + (Math.random()-0.5)*50, enemy.y + (Math.random()-0.5)*50);
    }

    // 3. Acid Spit (3-way)
    if (enemy.state.timer % 120 === 0) {
        const angle = Math.atan2(dy, dx);
        for(let k=-1; k<=1; k++) {
            state.projectiles.push({
                x: enemy.x, y: enemy.y,
                vx: Math.cos(angle + k*0.3) * 6, vy: Math.sin(angle + k*0.3) * 6,
                life: 120, size: 10, color: '#a3e635', damage: 1, isEnemy: true, visualType: 'TOXIC_CLOUD'
            });
        }
    }

    // 4. Dash
    if (enemy.state.timer % 300 === 250) {
         const angle = Math.atan2(dy, dx);
         enemy.vx = Math.cos(angle) * 15;
         enemy.vy = Math.sin(angle) * 15;
         VFX.castShockwave(state, enemy.x, enemy.y, '#ca8a04');
    }

    // 5. Regenerate Minions
    if (state.frame % 60 === 0) {
        state.enemies.forEach(e => {
            if(e !== enemy && !e.isBoss && Math.hypot(e.x-enemy.x, e.y-enemy.y) < 300) {
                e.hp = Math.min(e.maxHp, e.hp + 5);
                createParticle(state, e.x, e.y, ParticleType.HEAL, '#a3e635', {life: 10, size: 2});
            }
        });
    }

    // 6. Radial Poison Burst
    if (enemy.state.timer % 600 === 0) {
         for(let k=0; k<12; k++) {
             const a = (k/12)*Math.PI*2;
             state.projectiles.push({
                 x: enemy.x, y: enemy.y, vx: Math.cos(a)*4, vy: Math.sin(a)*4, life: 100, size: 150, color: '#65a30d', damage: 1, isEnemy: true, visualType: 'TOXIC_CLOUD'
             });
         }
    }

    return { moveX, moveY, moveSpeed };
};
