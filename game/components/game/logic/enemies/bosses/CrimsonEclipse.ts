
import { MutableGameState, Enemy } from '../../../types';
import { VFX } from '../../../Emitters';
import { WORLD_SIZE } from '../../../Constants';

export const updateCrimsonEclipse = (
    state: MutableGameState, 
    enemy: Enemy, 
    dx: number, 
    dy: number, 
    onEnemySeen: (id: string) => void
) => {
    let moveX = dx;
    let moveY = dy;
    let moveSpeed = enemy.speed;

    if (!enemy.state.custom) enemy.state.custom = { barrierToggle: 0 };

    // 0. PASSIVE: GRAVITY PULL
    const dist = Math.hypot(dx, dy);
    if (dist < 800 && dist > 1) {
        const strength = 0.1; 
        state.player.vx -= (dx / dist) * strength;
        state.player.vy -= (dy / dist) * strength;
    }

    // 1. SOLAR BARRIERS
    if (enemy.state.timer % 90 === 0) {
        const isDiagonal = enemy.state.custom.barrierToggle % 2 !== 0;
        enemy.state.custom.barrierToggle++;
        
        const directions = isDiagonal 
            ? [Math.PI/4, 3*Math.PI/4, 5*Math.PI/4, 7*Math.PI/4] 
            : [0, Math.PI/2, Math.PI, 3*Math.PI/2]; 

        const speed = 7; 
        
        directions.forEach(angle => {
            state.projectiles.push({
                x: enemy.x, 
                y: enemy.y, 
                vx: Math.cos(angle) * speed, 
                vy: Math.sin(angle) * speed, 
                life: 120, 
                size: 20, 
                color: '#ef4444', 
                damage: 5, isEnemy: true, isStatic: false, 
                visualType: 'SOLAR_BARRIER',
                customData: { 
                    angle: angle,
                    currentLength: 60, 
                    growthRate: 40 
                } 
            });
        });
        
        VFX.castShockwave(state, enemy.x, enemy.y, '#ef4444');
    }

    // 2. Ring of Fire
    if (enemy.state.timer % 90 === 0) {
        for(let k=0; k<24; k++) {
            const a = (k/24)*Math.PI*2;
            state.projectiles.push({
                x: enemy.x, y: enemy.y, vx: Math.cos(a)*5, vy: Math.sin(a)*5, life: 150, size: 10, color: '#b91c1c', damage: 1, isEnemy: true, visualType: 'FIRE_BLAST'
            });
        }
    }

    // 3. Solar Flares (Uses WORLD_SIZE)
    if (enemy.state.timer % 120 === 0) {
        for(let k=0; k<2; k++) {
            const margin = 200;
            const span = WORLD_SIZE - (margin * 2);
            
            const rx = (Math.random() - 0.5) * span;
            const ry = (Math.random() - 0.5) * span;
            
            state.projectiles.push({
                x: rx, 
                y: ry, 
                vx: 0, vy: 0, 
                life: 100000000,
                size: 200,
                color: '#fbbf24', 
                damage: 2, isEnemy: true, isStatic: true, 
                visualType: 'SOLAR_FLARE',
                customData: { spawnFrame: state.frame }
            });
        }
    }

    // 4. Crimson Comet (Direct Shot)
    if (enemy.state.timer % 50 === 0) {
        const angle = Math.atan2(dy, dx);
        state.projectiles.push({
            x: enemy.x, 
            y: enemy.y, 
            vx: Math.cos(angle) * 20, 
            vy: Math.sin(angle) * 20, 
            life: 200, 
            size: 40, 
            color: '#dc2626', 
            damage: 6, // DAMAGE INCREASED TO 6
            isEnemy: true, 
            visualType: 'CRIMSON_COMET'
        });
        VFX.castShockwave(state, enemy.x, enemy.y, '#dc2626');
    }

    return { moveX, moveY, moveSpeed };
};
