import { quality } from './Quality'; // (7B)
import { MutableGameState, ParticleType } from './types';
import { acquireParticle, swapRemoveParticle, } from './Pools';

export const createParticle = (
    state: MutableGameState, 
    x: number, 
    y: number, 
    type: ParticleType, 
    color: string,
    options: { speed?: number, life?: number, size?: number, spread?: number, friction?: number, gravity?: number, shrink?: number, vx?: number, vy?: number, alpha?: number } = {}
) => {
    // If vx/vy are provided, use them directly, otherwise calc from speed/spread
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
    // (7B) quality lowers particle *size* (detail), never the count — rule 9
    const size = (options.size ?? (Math.random() * 4 + 2)) * quality.particleDetail;

    // (4A) pooled: reuse a recycled particle. (4B) no cap — rule 9
    const p = acquireParticle();
    p.x = x; p.y = y; p.vx = vx; p.vy = vy;
    p.life = life; p.maxLife = life; p.size = size; p.color = color; p.type = type;
    p.friction = options.friction ?? 0.95;
    p.gravity = options.gravity ?? 0;
    p.shrink = options.shrink ?? 0.1;
    p.alpha = options.alpha ?? 1;
    state.particles.push(p);
};

export const spawnExplosion = (state: MutableGameState, x: number, y: number, color: string, type: ParticleType) => {
    const count = type === ParticleType.BOSS_AURA ? 40 : 15;
    const baseSize = type === ParticleType.BOSS_AURA ? 6 : 3;
    
    for(let i=0; i<count; i++) {
        createParticle(state, x, y, type, color, { 
            speed: 5 + Math.random() * 5, 
            life: 40 + Math.random() * 20,
            size: baseSize + Math.random() * 4,
            friction: 0.92
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
        
        // Specific Type overrides (Legacy support + extra flavor)
        if (p.type === ParticleType.FIRE) {
             p.vy -= 0.05; // Heat rises
        } else if (p.type === ParticleType.THUNDER) {
            if (Math.random() > 0.5) {
                p.x += (Math.random() - 0.5) * 4;
                p.y += (Math.random() - 0.5) * 4;
            }
        }

        if (p.life <= 0 || p.size <= 0.1) {
            swapRemoveParticle(state.particles, i); // (4A) O(1), recycled
        }
    }
};