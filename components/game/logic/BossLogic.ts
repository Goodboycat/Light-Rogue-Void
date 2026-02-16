
import { MutableGameState, Enemy, ParticleType } from '../types';
import { VFX } from '../Emitters';
import { spawnExplosion } from '../Particles';

// Import individual boss logics
import { updateHiveMind } from './enemies/bosses/HiveMind';
import { updateVoidWarden } from './enemies/bosses/VoidWarden';
import { updateCrimsonEclipse } from './enemies/bosses/CrimsonEclipse';
import { updateNeutronStar } from './enemies/bosses/NeutronStar';
import { updateEntropyTitan } from './enemies/bosses/EntropyTitan';
import { updateDarkness } from './enemies/bosses/Darkness';

export const updateBossBehavior = (
    state: MutableGameState, 
    enemy: Enemy, 
    dx: number, 
    dy: number, 
    onEnemySeen: (id: string) => void
) => {
    // --- CINEMATIC FREEZE LOGIC ---
    if (enemy.state.custom?.cinematicMode) {
        enemy.state.custom.cinematicTimer--;
        
        // Visuals during roar
        if (state.frame % 4 === 0) {
             const shakeX = (Math.random() - 0.5) * 10;
             const shakeY = (Math.random() - 0.5) * 10;
             enemy.x += shakeX; 
             enemy.y += shakeY;
             VFX.castShockwave(state, enemy.x, enemy.y, '#ef4444');
             
             // Camera Shake for Cinematic
             const camShake = 15;
             state.camera.x += (Math.random() - 0.5) * camShake;
             state.camera.y += (Math.random() - 0.5) * camShake;
        }

        if (enemy.state.custom.cinematicTimer <= 0) {
            enemy.state.custom.cinematicMode = false;
            enemy.projectileImmunity = 0;
            spawnExplosion(state, enemy.x, enemy.y, '#ffffff', ParticleType.BOSS_AURA);
        } else {
            return { moveX: 0, moveY: 0, moveSpeed: 0 };
        }
    }

    // --- DISPATCHER ---
    switch (enemy.def.id) {
        case 'hive_mind':
            return updateHiveMind(state, enemy, dx, dy, onEnemySeen);
        case 'void_warden':
            return updateVoidWarden(state, enemy, dx, dy, onEnemySeen);
        case 'crimson_eclipse':
            return updateCrimsonEclipse(state, enemy, dx, dy, onEnemySeen);
        case 'neutron_star':
            return updateNeutronStar(state, enemy, dx, dy, onEnemySeen);
        case 'entropy_titan':
            return updateEntropyTitan(state, enemy, dx, dy, onEnemySeen);
        case 'darkness':
            return updateDarkness(state, enemy, dx, dy, onEnemySeen);
        default:
            return { moveX: dx, moveY: dy, moveSpeed: enemy.speed };
    }
};
