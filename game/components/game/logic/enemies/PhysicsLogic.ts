
import { MutableGameState, Enemy } from '../../types';
import { PlayerStats } from '../../../types';
import { WORLD_SIZE } from '../../Constants';

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
    
    // Separation (Avoid overlapping other enemies)
    if (i > 0) {
        const neighbor = state.enemies[i-1];
        const ndx = neighbor.x - enemy.x;
        const ndy = neighbor.y - enemy.y;
        const ndist = Math.sqrt(ndx*ndx + ndy*ndy);
        // Added ndist > 0.1 check
        if (ndist < enemy.size + neighbor.size && ndist > 0.1) {
                pushX -= (ndx/ndist) * 0.5;
                pushY -= (ndy/ndist) * 0.5;
        }
    }

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
