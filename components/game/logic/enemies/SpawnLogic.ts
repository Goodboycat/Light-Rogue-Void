
import { MutableGameState } from '../../types';
import { WORLD_SIZE } from '../../Constants';
import { getSpawnableEnemy } from '../../../../enemies';

export const spawnEnemy = (state: MutableGameState, wave: number, onSpawn?: (id: string) => void, x?: number, y?: number) => {
    const angle = Math.random() * Math.PI * 2;
    const dist = 700 + Math.random() * 200; 
    
    let ex = x ?? state.player.x + Math.cos(angle) * dist;
    let ey = y ?? state.player.y + Math.sin(angle) * dist;

    ex = Math.max(-WORLD_SIZE/2 + 50, Math.min(WORLD_SIZE/2 - 50, ex));
    ey = Math.max(-WORLD_SIZE/2 + 50, Math.min(WORLD_SIZE/2 - 50, ey));
    
    const def = getSpawnableEnemy(wave);
    
    // Quadratic HP Scaling: Base + (Wave * Scaling) + (Wave^2 * 0.5)
    // This ensures enemies get much tougher past wave 40-50
    const hp = def.baseHp + (wave * def.hpScaling) + (wave * wave * 0.5);
    
    // Speed also scales slightly
    const speed = def.baseSpeed + (wave * 0.05);

    state.enemies.push({
        x: ex, y: ey,
        vx: 0, vy: 0,
        hp, maxHp: hp,
        def,
        speed,
        spawnSpeed: speed, // Store initial speed for cleansing logic
        size: def.size,
        color: def.color,
        projectileImmunity: 0,
        state: { timer: Math.floor(Math.random() * 100) } 
    });

    if (onSpawn) {
        onSpawn(def.id);
    }
};
