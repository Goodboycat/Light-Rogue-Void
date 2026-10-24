import { MutableGameState, DamageSource } from '../types';
import { PlayerStats } from '../../../types';
import { VFX } from '../Emitters';
import { acquireProjectile } from '../ObjectPools';

const ANOMALY_TYPES: ('LASER' | 'GAS' | 'LAVA')[] = ['LASER', 'GAS', 'LAVA'];

export const updateChaosHazards = (
    state: MutableGameState,
    playerStats: PlayerStats,
    onDamage: (amount: number, source?: DamageSource) => void
) => {
    if (!state.chaosEvent || !state.chaosEvent.active) return;
    
    const ev = state.chaosEvent;
    
    // Poison Event
    if (ev.type === 'POISON') {
        if (state.frame % 600 === 0) { // Every 10 seconds
            onDamage(1, { kind: 'event', id: 'event_poison', label: 'Void poison' });
            VFX.castShockwave(state, state.player.x, state.player.y, '#22c55e');
        }
    }

    // Darts Event (Field Hazard: Void Dart Missiles like Hive Mind)
    if (ev.type === 'DARTS') {
        if (state.frame % 120 === 0) { // Spawn dart every 2 seconds
            const angle = Math.random() * Math.PI * 2;
            const radius = 750;
            const sx = state.player.x + Math.cos(angle) * radius;
            const sy = state.player.y + Math.sin(angle) * radius;
            const aimAngle = Math.atan2(state.player.y - sy, state.player.x - sx);

            state.projectiles.push(acquireProjectile({
                x: sx,
                y: sy,
                vx: Math.cos(aimAngle) * 3,
                vy: Math.sin(aimAngle) * 3,
                life: 600,
                size: 14,
                color: '#84cc16',
                damage: 1,
                isEnemy: true,
                visualType: 'HOMING_MISSILE'
            }));
            VFX.castShockwave(state, sx, sy, '#84cc16');
        }
    }
    
    // Anomalies Event
    if (ev.type === 'ANOMALIES') {
        // Spawn a hazard every 3 seconds (180 frames)
        if (state.frame % 180 === 0) {
            const type = ANOMALY_TYPES[Math.floor(Math.random() * ANOMALY_TYPES.length)];
            
            // Random location around player
            const angle = Math.random() * Math.PI * 2;
            const dist = Math.random() * 600;
            const x = state.player.x + Math.cos(angle) * dist;
            const y = state.player.y + Math.sin(angle) * dist;
            
            state.hazards.push({
                x, y,
                type,
                radius: type === 'LASER' ? 20 : 80,
                timer: 0,
                maxTimer: 300 // 5 seconds
            });
        }
    }
    
    // Update Hazards
    for (let i = state.hazards.length - 1; i >= 0; i--) {
        const hazard = state.hazards[i];
        hazard.timer++;
        
        // Damage player if inside
        if (hazard.timer > 60) { // Active after 1 second warning
            const dx = state.player.x - hazard.x;
            const dy = state.player.y - hazard.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            
            if (dist < hazard.radius + state.player.size) {
                if (state.frame % 30 === 0) { // Damage every half second
                    onDamage(hazard.type === 'LASER' ? 5 : 2, { kind: 'hazard', id: hazard.type, label: `${hazard.type.toLowerCase()} hazard` });
                }
            }
        }
        
        if (hazard.timer >= hazard.maxTimer) {
            const lastIdx = state.hazards.length - 1;
            if (i !== lastIdx) {
                state.hazards[i] = state.hazards[lastIdx];
            }
            state.hazards.pop();
        }
    }
};
