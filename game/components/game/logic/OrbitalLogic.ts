import { MutableGameState } from '../types';
import { onEnemyHit } from '../Feel';
import { PlayerStats } from '../../../types';
import { VFX } from '../Emitters';

export const updateOrbitals = (state: MutableGameState, stats: PlayerStats, maturityScale: number) => {
    if (stats.projectileCount <= 0) return;

    const orbitRadius = 100 * maturityScale;
    const orbitSpeed = 0.05;
    const tilt = 0.4;
    const count = Math.floor(stats.projectileCount);
    
    // We need to calculate positions to check for collisions with enemies
    for(let i=0; i<count; i++) {
        const angle = (state.frame * orbitSpeed) + (i * (Math.PI * 2 / count));
        const normalizedSin = Math.sin(angle);
        
        const noiseX = Math.sin(state.frame * 0.1 + i * 10) * (5 * maturityScale);
        const noiseY = Math.cos(state.frame * 0.15 + i * 10) * (5 * maturityScale);

        const px = state.player.x + Math.cos(angle) * orbitRadius + noiseX;
        const py = state.player.y + normalizedSin * orbitRadius * tilt + noiseY;

        // Collision with enemies
        state.enemies.forEach(e => {
            if (Math.hypot(e.x - px, e.y - py) < e.size + 10) { 
                if (state.frame % 10 === 0) { 
                    e.hp -= 2; 
                    onEnemyHit(state, e, 2);
                    VFX.spark(state, e.x, e.y, '#fbbf24', 2);
                }
            }
        });
    }
};