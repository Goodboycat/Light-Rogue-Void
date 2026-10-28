
import { MutableGameState, Enemy } from '../../types';
import { PlayerStats } from '../../../../types';
import { WORLD_SIZE } from '../../Constants';
import { forEachEnemyNear } from '../../SpatialHash';

export const updateEnemyPhysics = (
    state: MutableGameState, 
    enemy: Enemy, 
    i: number,
    moveX: number, 
    moveY: number, 
    moveSpeed: number, 
    stats: PlayerStats, 
    dist: number, 
    dx: number, 
    dy: number
) => {
    let pushX = 0;
    let pushY = 0;
    
    // (4B) Separation via the previous frame's spatial hash (grid is rebuilt after all enemies move):
    // up to 4 overlapping neighbours push; crowds stay crowds, not a single stacked dot.
    let n = 0;
    forEachEnemyNear(enemy.x, enemy.y, enemy.size, (neighbor) => {
        if (neighbor === enemy || neighbor.isBoss) return;
        const ndx = neighbor.x - enemy.x;
        const ndy = neighbor.y - enemy.y;
        const ndist = Math.sqrt(ndx*ndx + ndy*ndy);
        if (ndist < enemy.size + neighbor.size && ndist > 0.1) {
            pushX -= (ndx/ndist) * 0.5;
            pushY -= (ndy/ndist) * 0.5;
            if (++n >= 4) return true;
        }
    });

    const moveLen = Math.sqrt(moveX*moveX + moveY*moveY);
    
    // Smooth velocity application
    // Ensure moveLen is valid for division
    if (moveLen > 0.1) {
        enemy.vx += ((moveX / moveLen) * moveSpeed + pushX - enemy.vx) * 0.05;
        enemy.vy += ((moveY / moveLen) * moveSpeed + pushY - enemy.vy) * 0.05;
    } else {
        // If no movement vector, just apply push and friction
        enemy.vx += (pushX - enemy.vx) * 0.05;
        enemy.vy += (pushY - enemy.vy) * 0.05;
    }
    
    // Check for NaN on result to be absolutely sure
    if (!Number.isFinite(enemy.vx)) enemy.vx = 0;
    if (!Number.isFinite(enemy.vy)) enemy.vy = 0;
    
    // Apply velocity to position
    enemy.x += enemy.vx;
    enemy.y += enemy.vy;

    // Hard Cap Velocity to prevent physics explosions from multiple force sources
    const MAX_VELOCITY = 25;
    const vSq = enemy.vx * enemy.vx + enemy.vy * enemy.vy;
    if (vSq > MAX_VELOCITY * MAX_VELOCITY) {
        const vMag = Math.sqrt(vSq);
        enemy.vx = (enemy.vx / vMag) * MAX_VELOCITY;
        enemy.vy = (enemy.vy / vMag) * MAX_VELOCITY;
    }
    
    // World Boundaries
    const halfWorld = WORLD_SIZE / 2;
    enemy.x = Math.max(-halfWorld, Math.min(halfWorld, enemy.x));
    enemy.y = Math.max(-halfWorld, Math.min(halfWorld, enemy.y));
};
