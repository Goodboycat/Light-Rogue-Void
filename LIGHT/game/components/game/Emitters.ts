
import { MutableGameState, ParticleType } from './types';
import { createParticle, spawnExplosion } from './Particles';

const rnd = (min: number, max: number) => Math.random() * (max - min) + min;

export const VFX = {
    // 0. PLAYER AURA
    castPlayerAura: (state: MutableGameState, x: number, y: number, color: string) => {
        if (state.frame % 2 === 0) {
             const angle = Math.random() * Math.PI * 2;
             createParticle(state, x, y, ParticleType.GLOW, color, {
                 vx: Math.cos(angle) * 0.5, vy: Math.sin(angle) * 0.5,
                 life: 30, size: rnd(4, 8), friction: 0.9, shrink: 0.2
             });
        }
    },

    // TITAN SHIELD
    castTitanShield: (state: MutableGameState, x: number, y: number) => {
         const count = 3;
         for(let i=0; i<count; i++) {
             const angle = Math.random() * Math.PI * 2;
             const dist = 40;
             createParticle(state, x + Math.cos(angle)*dist, y + Math.sin(angle)*dist, ParticleType.GLOW, '#fbbf24', {
                 vx: 0, vy: 0, life: 10, size: 5, friction: 0, shrink: 0.5
             });
         }
    },
    
    // WHITE HOLE CHARGE (Ultimate) - Implosion
    castWhiteHoleCharge: (state: MutableGameState, x: number, y: number, progress: number) => {
        // Particles sucking IN
        const count = 5 + Math.floor(progress * 15);
        for(let i=0; i<count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const dist = rnd(200, 800); // Start far
            const speed = 10 + (progress * 20); // Get faster as charge builds
            
            createParticle(state, x + Math.cos(angle)*dist, y + Math.sin(angle)*dist, ParticleType.GLOW, '#ffffff', {
                vx: -Math.cos(angle) * speed, 
                vy: -Math.sin(angle) * speed, 
                life: dist / speed, // Live just long enough to hit center
                size: rnd(2, 6) + (progress * 5),
                friction: 1 // No friction, constant speed suction
            });
        }
    },

    // BOSS VOID NOVA CHARGE
    castVoidNovaCharge: (state: MutableGameState, x: number, y: number, progress: number) => {
        // "Extremely big" absorption
        const count = 5 + Math.floor(progress * 20);
        for(let i=0; i<count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const dist = rnd(500, 1500); // Massive range
            const speed = 15 + (progress * 20);
            
            createParticle(state, x + Math.cos(angle)*dist, y + Math.sin(angle)*dist, ParticleType.VOID, '#000000', {
                vx: -Math.cos(angle) * speed, 
                vy: -Math.sin(angle) * speed, 
                life: dist / speed, 
                size: rnd(5, 15) + (progress * 10), // Bigger particles
                friction: 1
            });
            
            // Add red highlights
            if (Math.random() > 0.7) {
                createParticle(state, x + Math.cos(angle)*dist, y + Math.sin(angle)*dist, ParticleType.GLOW, '#7f1d1d', {
                    vx: -Math.cos(angle) * speed, 
                    vy: -Math.sin(angle) * speed, 
                    life: dist / speed, 
                    size: rnd(2, 6),
                    friction: 1
                });
            }
        }
    },

    // WHITE HOLE EXPLOSION - Violent Expansion
    castWhiteHoleExplosion: (state: MutableGameState, x: number, y: number) => {
        // Massive burst of white/cyan energy
        // (2B+) body of the blast is BigFx.castWhiteHoleBlast; this is just the streak spray (was 300)
        for(let i=0; i<80; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = rnd(20, 50);
            createParticle(state, x, y, ParticleType.GLOW, Math.random() > 0.5 ? '#ffffff' : '#a5f3fc', {
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                life: rnd(60, 120),
                size: rnd(5, 20),
                friction: 0.96, // Slight slow down for impact feel
                shrink: 0.2
            });
        }
        
        // Secondary shockwaves
        for(let i=0; i<36; i++) {
            const angle = (i/36) * Math.PI * 2;
            createParticle(state, x, y, ParticleType.RING, '#ffffff', {
                vx: Math.cos(angle) * 30,
                vy: Math.sin(angle) * 30,
                life: 50,
                size: 10,
                friction: 0.98
            });
        }
    },

    // SUPER DASH EXPLOSION - Cinematic Style White Burst
    castSuperDashExplosion: (state: MutableGameState, x: number, y: number) => {
        // Core shockwave (BOSS_AURA style for big ring)
        spawnExplosion(state, x, y, '#ffffff', ParticleType.BOSS_AURA);
        
        // Debris cloud (FIRE style for physics, but white)
        spawnExplosion(state, x, y, '#ffffff', ParticleType.FIRE);
        
        // Extra sparks for punchiness
        VFX.spark(state, x, y, '#ffffff', 15);
    },

    // 1. FIRE BLAST
    castFireBlast: (state: MutableGameState, x: number, y: number, angle: number) => {
        for(let i=0; i<8; i++) {
            const a = angle + (Math.random() - 0.5) * 0.4;
            createParticle(state, x, y, ParticleType.FIRE, '#f97316', {
                speed: rnd(6, 12), vx: Math.cos(a)*10, vy: Math.sin(a)*10,
                life: rnd(20, 40), size: rnd(6, 12)
            });
        }
    },

    // 2. THUNDER CHAIN
    castThunderChain: (state: MutableGameState, x1: number, y1: number, x2: number, y2: number) => {
        const dist = Math.hypot(x2-x1, y2-y1);
        const steps = Math.ceil(dist / 15);
        const dx = (x2 - x1) / steps;
        const dy = (y2 - y1) / steps;
        let cx = x1, cy = y1;
        for(let i=0; i<steps; i++) {
            const jitter = Math.sin((i/steps)*Math.PI) * 20;
            const px = cx + (Math.random()-0.5)*jitter;
            const py = cy + (Math.random()-0.5)*jitter;
            createParticle(state, px, py, ParticleType.THUNDER, '#fff', { life: 10, size: 4 });
            cx += dx; cy += dy;
        }
        VFX.spark(state, x2, y2, '#fbbf24', 8);
    },

    // 3. ICE NOVA
    castIceNova: (state: MutableGameState, x: number, y: number) => {
        for(let i=0; i<24; i++) {
            const angle = (i/24)*Math.PI*2;
            createParticle(state, x, y, ParticleType.RING, '#bae6fd', {
                vx: Math.cos(angle)*8, vy: Math.sin(angle)*8, life: 30, size: 6
            });
        }
    },

    // 4. VOID IMPLOSION
    castVoidImplosion: (state: MutableGameState, x: number, y: number) => {
        for(let i=0; i<10; i++) {
            const angle = Math.random()*Math.PI*2;
            const dist = 100;
            createParticle(state, x + Math.cos(angle)*dist, y + Math.sin(angle)*dist, ParticleType.VOID, '#000', {
                vx: -Math.cos(angle)*8, vy: -Math.sin(angle)*8, life: 15, size: 5
            });
        }
    },

    // 5. DASH TRAIL
    castDashTrail: (state: MutableGameState, x: number, y: number, color: string) => {
        createParticle(state, x, y, ParticleType.NORMAL, color, { life: 15, size: 12, shrink: 0.8 });
    },

    // 7. STARDUST CLOUD (Renamed from Poison)
    castStardustCloud: (state: MutableGameState, x: number, y: number) => {
        createParticle(state, x, y, ParticleType.SMOKE, '#ffffff', {
            vx: (Math.random()-0.5), vy: (Math.random()-0.5), life: 60, size: 20, shrink: 0.1, alpha: 0.3
        });
    },

    // 8. SHOCKWAVE
    castShockwave: (state: MutableGameState, x: number, y: number, color: string = '#ffffff') => {
        for(let i=0; i<16; i++) {
            const angle = (i/16)*Math.PI*2;
            createParticle(state, x, y, ParticleType.NORMAL, color, {
                vx: Math.cos(angle)*10, vy: Math.sin(angle)*10, life: 15, size: 4
            });
        }
    },

    // 10. METEOR RAIN
    castMeteor: (state: MutableGameState, x: number, y: number) => {
        // Visual indicator where it spawns
        createParticle(state, x, y, ParticleType.FIRE, '#ea580c', {
            vx: 0, vy: 0, life: 20, size: 25
        });
    },

    // 11. ARCANE MISSILE
    castArcaneTrail: (state: MutableGameState, x: number, y: number) => {
        createParticle(state, x, y, ParticleType.GLOW, '#a855f7', { life: 30, size: 6 });
    },

    // 14. BOSS SPAWN
    castBossSpawn: (state: MutableGameState, x: number, y: number, color: string) => {
         VFX.castVoidImplosion(state, x, y);
         VFX.castShockwave(state, x, y, color);
    },

    // 15. SPARK HIT
    spark: (state: MutableGameState, x: number, y: number, color: string, count: number = 5) => {
        for(let i=0; i<count; i++) {
            createParticle(state, x, y, ParticleType.SPARK, color, {
                speed: rnd(3, 8), life: rnd(10, 20), size: rnd(2, 4)
            });
        }
    }
};
