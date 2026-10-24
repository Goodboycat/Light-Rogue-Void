
import { MutableGameState, Projectile, DamageSource } from '../../types';
import { PlayerStats } from '../../../../types';
import { checkBossCollisions } from './collision/BossCollision';
import { checkHazardCollisions } from './collision/HazardCollision';
import { checkPlayerCollisions } from './collision/PlayerCollision';

export const checkProjectileCollisions = (
    state: MutableGameState, 
    p: Projectile, 
    i: number, 
    onDamage: (amt: number, source?: DamageSource) => void, 
    playerStats?: PlayerStats
): boolean => { 
    // Returns true if projectile should be destroyed

    // --- CINEMATIC INVULNERABILITY CHECK ---
    if (state.activeBoss?.state.custom?.cinematicMode) {
        return false;
    }

    if (p.isEnemy) {
        // Boss Attacks
        if (p.visualType === 'VOID_NOVA' || 
            p.visualType === 'VOID_NOVA_AFTERMATH' || 
            p.visualType === 'BOSS_SINGULARITY' ||
            p.visualType === 'SOLAR_BARRIER' ||
            p.visualType === 'CRIMSON_COMET') { 
            return checkBossCollisions(state, p, onDamage, playerStats);
        }
        
        // Hazard / Enemy Attacks
        return checkHazardCollisions(state, p, onDamage);
    } else {
        // Player Attacks
        return checkPlayerCollisions(state, p);
    }
};
