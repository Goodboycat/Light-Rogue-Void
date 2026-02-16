
import { useMemo } from 'react';
import { PlayerStats } from '../types';
import { ABILITY_TREE_DATA } from '../data';

export const usePlayerStats = (unlockedAbilityIds: string[]) => {
    return useMemo<PlayerStats>(() => {
        const stats: PlayerStats = { 
            maxHealth: 3, 
            healthRegen: 0,
            moveSpeed: 1, 
            dashCooldown: 1, 
            dashDuration: 0.01, 
            pickupRange: 0, 
            damageAura: 0, 
            repulsionForce: 0, 
            projectileCount: 0, 
            attackSpeed: 1, 
            essenceMultiplier: 1,
            
            fireBlastLevel: 0,
            iceNovaLevel: 0,
            thunderChainLevel: 0,
            
            homingMissileLevel: 0,
            fireflyLevel: 0,
            nebulaTrailLevel: 0,
            singularityLevel: 0,
            superDashLevel: 0,
            solarFlareLevel: 0,
            titanShieldLevel: 0,
            whiteHoleLevel: 0,

            luxBladesLevel: 0,
            repulsionFieldLevel: 0,
            plasmaWhipLevel: 0
        };

        unlockedAbilityIds.forEach(id => {
            const node = ABILITY_TREE_DATA.find(n => n.id === id);
            if (node?.statEffect) {
                Object.entries(node.statEffect).forEach(([k, v]) => {
                    if (typeof v === 'number') {
                        (stats as any)[k] += v;
                    }
                });
            }
        });
        
        stats.projectileCount = Math.floor(stats.projectileCount);
        stats.maxHealth = Math.floor(stats.maxHealth);

        return stats;
    }, [unlockedAbilityIds]);
};
