
import { MutableGameState, Projectile, ParticleType } from '../../types';
import { createParticle } from '../../Particles';
import { WORLD_SIZE } from '../../Constants';

export const updateProjectileVisuals = (state: MutableGameState, p: Projectile) => {
    if (p.visualType === 'FIRE_BLAST') {
        createParticle(state, p.x, p.y, ParticleType.FIRE, p.color, { speed: 1, life: 10, size: 8 });
    } else if (p.visualType === 'PULSAR') {
            createParticle(state, p.x, p.y, ParticleType.GLOW, '#f0abfc', { speed: 0.2, life: 5, size: 2 });
    } else if (p.visualType === 'STARDUST_TRAIL' || p.visualType === 'VOID_RIFT') {
        // Stardust Trail
        if (state.frame % 5 === 0) {
            createParticle(state, p.x, p.y, ParticleType.SMOKE, p.color, { speed: 0.5, life: 30, size: 8, alpha: 0.3 });
            createParticle(state, p.x, p.y, ParticleType.GLOW, p.color, { speed: 0.2, life: 20, size: 4 });
        }
    } else if (p.visualType === 'SINGULARITY') {
            if (state.frame % 5 === 0) {
            const angle = Math.random() * Math.PI * 2;
            const dist = 30 + Math.random() * 20;
            createParticle(state, p.x + Math.cos(angle)*dist, p.y + Math.sin(angle)*dist, ParticleType.VOID, '#000', { 
                vx: -Math.cos(angle), vy: -Math.sin(angle), life: 20, size: 2 
            });
            }
    } else if (p.visualType === 'BOSS_SINGULARITY') {
            if (p.life < 100) p.size *= 0.99;
            if (state.frame % 3 === 0) {
                const angle = Math.random() * Math.PI * 2;
                const dist = p.size * 1.5 + Math.random() * 40;
                createParticle(state, p.x + Math.cos(angle)*dist, p.y + Math.sin(angle)*dist, ParticleType.VOID, '#ef4444', {
                    vx: -Math.cos(angle)*2, vy: -Math.sin(angle)*2, life: 30, size: 3
                });
            }
    } else if (p.visualType === 'SOLAR_FLARE') {
        const spawnFrame = p.customData?.spawnFrame || 0;
        const age = state.frame - spawnFrame;
        
        // Permanent Boss Mines warning logic
        if (p.isEnemy && p.life > 9000) {
            const SURGE_TIME = 120;
            if (age < SURGE_TIME) {
                if (state.frame % 3 === 0) {
                     const progress = age / SURGE_TIME;
                     const currentSize = p.size * progress;
                     const angle = Math.random() * Math.PI * 2;
                     const px = p.x + Math.cos(angle) * currentSize;
                     const py = p.y + Math.sin(angle) * currentSize;
                     createParticle(state, px, py, ParticleType.SMOKE, '#7f1d1d', { size: 4, life: 20 });
                }
            } else {
                if (state.frame % 5 === 0) {
                    createParticle(state, p.x, p.y, ParticleType.FIRE, '#fbbf24', { speed: 2, life: 20, size: 6 });
                }
            }
        } else {
            if (state.frame % 5 === 0) {
                createParticle(state, p.x, p.y, ParticleType.FIRE, '#fbbf24', { speed: 2, life: 20, size: 6 });
            }
        }
    } else if (p.visualType === 'EXPLOSION_AREA') {
        if (state.frame % 2 === 0) {
                createParticle(state, p.x + (Math.random()-0.5)*p.size, p.y + (Math.random()-0.5)*p.size, ParticleType.GLOW, '#fff', { speed: 2, life: 10, size: 5 });
        }
    } else if (p.visualType === 'TOXIC_CLOUD') {
            if (state.frame % 10 === 0) {
                const angle = Math.random() * Math.PI * 2;
                const dist = Math.random() * p.size * 0.8;
                createParticle(state, p.x + Math.cos(angle)*dist, p.y + Math.sin(angle)*dist, ParticleType.SMOKE, '#10b981', {
                    life: 60, size: 10, speed: 0.5, shrink: 0.1
                });
            }
    } else if (p.visualType === 'RAILGUN_BEAM') {
        if (p.life <= 80) {
                if (state.frame % 4 === 0) {
                const dist = (Math.random() - 0.5) * WORLD_SIZE * 1.5; 
                const isHorizontal = p.vx > 0.5;
                const px = isHorizontal ? p.x + dist : p.x;
                const py = isHorizontal ? p.y : p.y + dist;
                createParticle(state, px, py, ParticleType.SPARK, '#fbcfe8', { speed: 4, life: 10, size: 4 });
                }
        }
    } else if (p.visualType === 'LUX_BLADE') {
        if (state.frame % 3 === 0) {
            createParticle(state, p.x, p.y, ParticleType.GLOW, '#fef08a', {life: 10, size: 4});
            createParticle(state, p.x, p.y, ParticleType.SPARK, '#fff', {life: 5, size: 2});
        }
    } else if (p.visualType === 'PLASMA_WHIP') {
        // Impact sparks at the target location (p.x is player, customData is target)
        if (state.frame % 3 === 0 && p.customData) {
            createParticle(state, p.customData.targetX, p.customData.targetY, ParticleType.SPARK, '#fbbf24', { speed: 5, life: 15, size: 3 });
        }
    }
};
