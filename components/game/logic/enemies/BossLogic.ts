
import { MutableGameState, Enemy, ParticleType } from '../../types';
import { VFX } from '../../Emitters';
import { spawnExplosion, createParticle } from '../../Particles';
import { audio } from '../../audio';

// Import individual boss logics
import { updateHiveMind } from './bosses/HiveMind';
import { updateVoidWarden } from './bosses/VoidWarden';
import { updateCrimsonEclipse } from './bosses/CrimsonEclipse';
import { updateNeutronStar } from './bosses/NeutronStar';
import { updateEntropyTitan } from './bosses/EntropyTitan';
import { updateDarkness } from './bosses/Darkness';

// Import new corrupted light bosses
import { updateFallenStar } from './bosses/FallenStar';
import { updateFalseDawn } from './bosses/FalseDawn';
import { updateHollowHalo } from './bosses/HollowHalo';
import { updateMirrorSun } from './bosses/MirrorSun';
import { updateBrokenDawn } from './bosses/BrokenDawn';

export const updateBossBehavior = (
    state: MutableGameState, 
    enemy: Enemy, 
    dx: number, 
    dy: number, 
    onEnemySeen: (id: string) => void
) => {
    // --- PARALYSIS DEBUFF MECHANIC ---
    if (enemy.paralyzedTimer === undefined) {
        enemy.paralyzedTimer = 0;
    }
    if (enemy.paralyzedTimer > 0) {
        enemy.paralyzedTimer--;
        
        // Lock physics and stop movement completely
        enemy.vx = 0;
        enemy.vy = 0;

        // Sparkle paralyzed visual feedback
        if (state.frame % 3 === 0) {
            VFX.spark(state, enemy.x + (Math.random() - 0.5) * enemy.size, enemy.y + (Math.random() - 0.5) * enemy.size, '#fbbf24', 3);
        }
        return { moveX: 0, moveY: 0, moveSpeed: 0 };
    }

    // --- CINEMATIC FREEZE LOGIC ---
    if (enemy.state.custom?.cinematicMode) {
        if (enemy.state.custom.cinematicHpSaved === undefined) {
            enemy.state.custom.cinematicHpSaved = enemy.hp;
        }
        enemy.hp = enemy.state.custom.cinematicHpSaved; // Lock HP

        enemy.state.custom.cinematicTimer--;
        
        // --- CUSTOM SCENIC BEATS FOR DARKNESS BOSS SECOND PHASE ---
        if (enemy.def.id === 'darkness') {
            const timer = enemy.state.custom.cinematicTimer;
            
            // Frame 239 (Beginning of Transition)
            if (timer === 239) {
                enemy.state.custom.shout = "YOUR INFANT LIGHT SICKENS ME, SPARK.";
                if (audio && typeof audio.playLevelUp === 'function') audio.playLevelUp();
                
                // Sucking in particles aggressively
                for (let i = 0; i < 40; i++) {
                    const angle = Math.random() * Math.PI * 2;
                    const dist = 300 + Math.random() * 200;
                    createParticle(state, enemy.x + Math.cos(angle) * dist, enemy.y + Math.sin(angle) * dist, ParticleType.VOID, '#7e22ce', {
                        vx: -Math.cos(angle) * 4,
                        vy: -Math.sin(angle) * 4,
                        life: 60, size: Math.random() * 8 + 4
                    });
                }
            }
            // Frame 180 (Visual Shockwave & Voice Shift)
            else if (timer === 180) {
                enemy.state.custom.shout = "I WILL REND THIS CONSTELLATION ASUNDER...";
                if (audio && typeof audio.playLevelUp === 'function') audio.playLevelUp();
                
                // Screen flash overlay particle (dark purple explosion of power)
                createParticle(state, state.player.x, state.player.y, ParticleType.GLOW, '#7e22ce', {
                    vx: 0, vy: 0, life: 30, size: 2500, alpha: 0.7
                });
                // Massive expanding shockwave ring
                for (let k = 0; k < 40; k++) {
                    const angle = (k / 40) * Math.PI * 2;
                    createParticle(state, enemy.x, enemy.y, ParticleType.RING, '#a855f7', {
                        vx: Math.cos(angle) * 14,
                        vy: Math.sin(angle) * 14,
                        life: 50, size: 10
                    });
                }
                // Intense screenshake
                state.camera.x += (Math.random() - 0.5) * 80;
                state.camera.y += (Math.random() - 0.5) * 80;
            }
            // Frame 120 (Shattering Lightning & Voice Shift)
            else if (timer === 120) {
                enemy.state.custom.shout = "AND PLUNGE YOUR VERY CONSCIOUSNESS INTO THE VOID!";
                if (audio && typeof audio.playLevelUp === 'function') audio.playLevelUp();
                
                // Release dynamic plasma arcs shooting out from boss core to surrounding points
                for (let k = 0; k < 18; k++) {
                    const angle = (k / 18) * Math.PI * 2 + Math.random() * 0.2;
                    const dist = 400 + Math.random() * 600;
                    const tx = enemy.x + Math.cos(angle) * dist;
                    const ty = enemy.y + Math.sin(angle) * dist;
                    VFX.castThunderChain(state, enemy.x, enemy.y, tx, ty);
                }
                // Purple particles spraying outwards
                for (let i = 0; i < 30; i++) {
                    const angle = Math.random() * Math.PI * 2;
                    const speed = 5 + Math.random() * 10;
                    createParticle(state, enemy.x, enemy.y, ParticleType.FIRE, '#a855f7', {
                        vx: Math.cos(angle) * speed,
                        vy: Math.sin(angle) * speed,
                        life: 40, size: Math.random() * 6 + 3
                    });
                }
                // Medium screenshake
                state.camera.x += (Math.random() - 0.5) * 60;
                state.camera.y += (Math.random() - 0.5) * 60;
            }
            // Frame 60 (Absolute Gravitational Singularity Charge)
            else if (timer === 60) {
                enemy.state.custom.shout = "WITNESS THE TRUE ENTROPIC CASCADE!!!";
                if (audio && typeof audio.playLevelUp === 'function') audio.playLevelUp();
                
                // Spawn a secondary black hole sphere around the boss
                for (let i = 0; i < 50; i++) {
                    const angle = Math.random() * Math.PI * 2;
                    const dist = 500;
                    createParticle(state, enemy.x + Math.cos(angle) * dist, enemy.y + Math.sin(angle) * dist, ParticleType.VOID, '#000000', {
                        vx: -Math.cos(angle) * 12,
                        vy: -Math.sin(angle) * 12,
                        life: 40, size: Math.random() * 10 + 6
                    });
                }
                VFX.castVoidNovaCharge(state, enemy.x, enemy.y, 1.0);
                VFX.castVoidNovaCharge(state, enemy.x, enemy.y, 0.8);
            }
            
            // Continuous heavy buildup shake for darkness
            if (timer < 90 && timer > 0) {
                 const intensity = (90 - timer) / 3; // Gets more violent as it reaches 0
                 state.camera.x += (Math.random() - 0.5) * intensity;
                 state.camera.y += (Math.random() - 0.5) * intensity;
                 if (state.frame % 3 === 0) {
                     VFX.castVoidNovaCharge(state, enemy.x, enemy.y, (90 - timer) / 90);
                 }
            }
            // Final dark burst right before completion
            if (timer === 15) {
                // Pitch black flash overlay
                createParticle(state, state.player.x, state.player.y, ParticleType.GLOW, '#000000', {
                    vx: 0, vy: 0, life: 20, size: 2500, alpha: 0.95
                });
            }
        }

        // Epic black portal visuals
        if (state.frame % 2 === 0) {
             const angle = Math.random() * Math.PI * 2;
             const dist = 150 + Math.random() * 50;
             createParticle(state, enemy.x + Math.cos(angle) * dist, enemy.y + Math.sin(angle) * dist, ParticleType.VOID, '#000000', {
                 vx: -Math.cos(angle + 0.5) * 6,
                 vy: -Math.sin(angle + 0.5) * 6,
                 life: 40, size: Math.random() * 8 + 4
             });
        }

        // Visuals during roar
        if (state.frame % 4 === 0) {
             const shakeX = (Math.random() - 0.5) * 5;
             const shakeY = (Math.random() - 0.5) * 5;
             enemy.x += shakeX; 
             enemy.y += shakeY;
             VFX.castShockwave(state, enemy.x, enemy.y, '#000000');
             
             // Camera Shake for Cinematic
             if (enemy.def.id !== 'darkness') {
                 const camShake = 10;
                 state.camera.x += (Math.random() - 0.5) * camShake;
                 state.camera.y += (Math.random() - 0.5) * camShake;
             }
        }

        if (enemy.state.custom.cinematicTimer <= 0) {
            enemy.state.custom.cinematicMode = false;
            enemy.state.custom.cinematicHpSaved = undefined;
            enemy.projectileImmunity = 0;
            
            if (enemy.def.id === 'darkness') {
                enemy.state.custom.shout = ""; // Clear dialogue bubble
                // Unleash a massive celestial blast
                VFX.castWhiteHoleExplosion(state, enemy.x, enemy.y);
                spawnExplosion(state, enemy.x, enemy.y, '#7e22ce', ParticleType.BOSS_AURA);
                spawnExplosion(state, enemy.x, enemy.y, '#000000', ParticleType.BOSS_AURA);
                // Ultra shockwave
                for (let k = 0; k < 64; k++) {
                    const angle = (k / 64) * Math.PI * 2;
                    createParticle(state, enemy.x, enemy.y, ParticleType.RING, '#ffffff', {
                        vx: Math.cos(angle) * 18,
                        vy: Math.sin(angle) * 18,
                        life: 60, size: 12
                    });
                }
                state.camera.x += (Math.random() - 0.5) * 120;
                state.camera.y += (Math.random() - 0.5) * 120;
            } else {
                spawnExplosion(state, enemy.x, enemy.y, '#000000', ParticleType.BOSS_AURA);
            }
        } else {
            return { moveX: 0, moveY: 0, moveSpeed: 0 };
        }
    }

    // --- DISPATCHER ---
    switch (enemy.def.id) {
        case 'hive_mind':
            return updateHiveMind(state, enemy, dx, dy, onEnemySeen);
        case 'fallen_star':
            return updateFallenStar(state, enemy, dx, dy, onEnemySeen);
        case 'void_warden':
            return updateVoidWarden(state, enemy, dx, dy, onEnemySeen);
        case 'false_dawn':
            return updateFalseDawn(state, enemy, dx, dy, onEnemySeen);
        case 'crimson_eclipse':
            return updateCrimsonEclipse(state, enemy, dx, dy, onEnemySeen);
        case 'hollow_halo':
            return updateHollowHalo(state, enemy, dx, dy, onEnemySeen);
        case 'neutron_star':
            return updateNeutronStar(state, enemy, dx, dy, onEnemySeen);
        case 'mirror_sun':
            return updateMirrorSun(state, enemy, dx, dy, onEnemySeen);
        case 'entropy_titan':
            return updateEntropyTitan(state, enemy, dx, dy, onEnemySeen);
        case 'broken_dawn':
            return updateBrokenDawn(state, enemy, dx, dy, onEnemySeen);
        case 'darkness':
            return updateDarkness(state, enemy, dx, dy, onEnemySeen);
        default:
            return { moveX: dx, moveY: dy, moveSpeed: enemy.speed };
    }
};
