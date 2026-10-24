import { audio } from '../audio';
import { MutableGameState } from '../types';
import { PlayerStats } from '../../../types';
import { VFX } from '../Emitters';
import { recordPowerDamage } from './AbilityLogic';

export const updateOrbitals = (state: MutableGameState, stats: PlayerStats, maturityScale: number) => {
    if (stats.projectileCount <= 0) return;

    const orbitRadius = 100 * maturityScale;
    const orbitSpeed = 0.05;
    const tilt = 0.4;
    const count = Math.floor(stats.projectileCount);
    
    for (let i = 0; i < count; i++) {
        const angle = (state.frame * orbitSpeed) + (i * (Math.PI * 2 / count));
        const normalizedSin = Math.sin(angle);
        
        const noiseX = Math.sin(state.frame * 0.1 + i * 10) * (5 * maturityScale);
        const noiseY = Math.cos(state.frame * 0.15 + i * 10) * (5 * maturityScale);

        const px = state.player.x + Math.cos(angle) * orbitRadius + noiseX;
        const py = state.player.y + normalizedSin * orbitRadius * tilt + noiseY;

        for (let j = 0; j < state.enemies.length; j++) {
            const e = state.enemies[j];
            if (Math.hypot(e.x - px, e.y - py) < e.size + 10) { 
                if (state.frame % 10 === 0) { 
                    e.hp -= 2; recordPowerDamage(state, 'Orbitals', 2); audio.playHit(); 
                    VFX.spark(state, e.x, e.y, '#fbbf24', 2);
                }
            }
        }
    }
};
