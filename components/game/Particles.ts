import { MutableGameState, ParticleType } from './types';
import { getQuality } from './Quality';
import { acquireParticle, swapRemoveParticle } from './ObjectPools';

export const createParticle = (
    state: MutableGameState, 
    x: number, 
    y: number, 
    type: ParticleType, 
    color: string,
    options: { speed?: number, life?: number, size?: number, spread?: number, friction?: number, gravity?: number, shrink?: number, vx?: number, vy?: number, alpha?: number, customData?: any } = {}
) => {
    const Q = getQuality(state.performanceMode);
    const currentCount = state.particles.length;
    const isCritical = type === ParticleType.TEXT || type === ParticleType.HEAL || type === ParticleType.LIGHTNING_BOLT;

    // Respect both the quality maxParticles (150 / 300 / 500) and additive-blend cap (120 in LOW / 250 otherwise)
    const additiveCap = state.performanceMode === 'LOW' ? 120 : 250;
    const effectiveCap = Math.min(Q.maxParticles, additiveCap);
    if (!isCritical && currentCount >= effectiveCap) {
        return;
    }

    let vx = options.vx;
    let vy = options.vy;

    if (vx === undefined || vy === undefined) {
        const speed = options.speed ?? (Math.random() * 2 + 1);
        const spread = options.spread ?? Math.PI * 2;
        const angle = (Math.random() - 0.5) * spread + (Math.random() * Math.PI * 2);
        vx = Math.cos(angle) * speed;
        vy = Math.sin(angle) * speed;
    }

    const life = options.life ?? (30 + Math.random() * 20);
    const size = options.size ?? (Math.random() * 4 + 2);

    const p = acquireParticle();
    p.x = x;
    p.y = y;
    p.vx = vx;
    p.vy = vy;
    p.life = life;
    p.maxLife = life;
    p.size = size;
    p.color = color;
    p.type = type;
    p.friction = options.friction ?? 0.95;
    p.gravity = options.gravity ?? 0;
    p.shrink = options.shrink ?? 0.1;
    p.alpha = options.alpha ?? 1;
    p.customData = options.customData;

    state.particles.push(p);
};

export const spawnExplosion = (state: MutableGameState, x: number, y: number, color: string, type: ParticleType) => {
    const Q = getQuality(state.performanceMode);
    const baseCount = type === ParticleType.BOSS_AURA ? 28 : 12;
    const count = Math.max(2, Math.round(baseCount * Q.particleScale));
    const baseSize = type === ParticleType.BOSS_AURA ? 6 : 3;
    
    for (let i = 0; i < count; i++) {
        createParticle(state, x, y, type, color, { 
            speed: 5 + Math.random() * 5, 
            life: 32 + Math.random() * 16,
            size: baseSize + Math.random() * 4,
            friction: 0.92
        });
    }
};

/**
 * Kill pop: at most 6 particles per kill, scaled by quality particleScale (LOW: 2, MEDIUM: 4, HIGH: 6).
 */
export const spawnKillPop = (state: MutableGameState, x: number, y: number, color: string, type: ParticleType) => {
    const Q = getQuality(state.performanceMode);
    const count = Math.max(2, Math.min(6, Math.round(6 * Q.particleScale)));
    for (let i = 0; i < count; i++) {
        const angle = (i / count) * Math.PI * 2 + (Math.random() - 0.5) * 0.4;
        const speed = 3.5 + Math.random() * 3.5;
        createParticle(state, x, y, type, color, {
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            life: 22 + Math.random() * 10,
            size: 3 + Math.random() * 2.5,
            friction: 0.9,
        });
    }
};

export const updateParticles = (state: MutableGameState) => {
    for (let i = state.particles.length - 1; i >= 0; i--) {
        const p = state.particles[i];
        
        // Physics
        p.vx *= (p.friction ?? 1);
        p.vy *= (p.friction ?? 1);
        p.vy += (p.gravity ?? 0);

        p.x += p.vx;
        p.y += p.vy;
        
        p.life--;
        p.size -= (p.shrink ?? 0);
        
        if (p.type === ParticleType.FIRE) {
            p.vy -= 0.05;
        } else if (p.type === ParticleType.THUNDER) {
            if (Math.random() > 0.5) {
                p.x += (Math.random() - 0.5) * 4;
                p.y += (Math.random() - 0.5) * 4;
            }
        }

        if (p.type === ParticleType.LIGHTNING_BOLT) {
            if (p.life <= 0) {
                swapRemoveParticle(state.particles, i);
            }
            continue;
        }
        if (p.life <= 0 || p.size <= 0.1) {
            swapRemoveParticle(state.particles, i);
        }
    }
};
