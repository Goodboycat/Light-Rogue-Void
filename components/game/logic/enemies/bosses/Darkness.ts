
import { MutableGameState, Enemy, ParticleType } from '../../../types';
import { spawnEnemy } from '../SpawnLogic';
import { VFX } from '../../../Emitters';
import { spawnExplosion } from '../../../Particles';

export const updateDarkness = (
    state: MutableGameState, 
    enemy: Enemy, 
    dx: number, 
    dy: number, 
    onEnemySeen: (id: string) => void
) => {
    let moveX = dx;
    let moveY = dy;
    let moveSpeed = enemy.speed;

    if (!enemy.state.custom) enemy.state.custom = { minesSpawned: 0, novaTimer: 900 };

    // 0. PASSIVE: GRAVITY PULL
    const dist = Math.hypot(dx, dy);
    if (dist < 1000 && dist > 1) {
        const strength = 0.2; 
        state.player.vx -= (dx / dist) * strength;
        state.player.vy -= (dy / dist) * strength;
    }

    // Phase Transition
    if (enemy.state.phase === 1 && enemy.hp < enemy.maxHp * 0.5) {
        enemy.state.phase = 2;
        enemy.state.custom.cinematicMode = true;
        enemy.state.custom.cinematicTimer = 180; 
        enemy.state.custom.shout = "ROAAAAAAAR!!!";
        enemy.projectileImmunity = 180;
        
        // Phase transition effect
        spawnExplosion(state, enemy.x, enemy.y, '#9333ea', ParticleType.BOSS_AURA);
        
        return { moveX: 0, moveY: 0, moveSpeed: 0 };
    }

    // 1. Void Mines (Explosive)
    if (enemy.state.timer % 60 === 0 && enemy.state.custom.minesSpawned < 5) {
         state.projectiles.push({
             x: state.player.x, y: state.player.y, vx: 0, vy: 0, 
             life: 180, // Changed from permanent to 3s duration (Explodes)
             size: 200, // Huge
             color: '#000', damage: 2, isEnemy: true, isStatic: true, visualType: 'VOID_MINE'
         });
         enemy.state.custom.minesSpawned++;
         if (enemy.state.custom.minesSpawned >= 5) {
             setTimeout(() => { if(enemy.state.custom) enemy.state.custom.minesSpawned = 0 }, 15000);
         }
    }

    // 2. Fire Blast Swarm (NOW DARK PURPLE)
    if (enemy.state.timer % 40 === 0) {
        for(let k=0; k<12; k++) {
            const angle = Math.atan2(dy, dx) + (Math.random() - 0.5) * 2;
            state.projectiles.push({
                x: enemy.x, y: enemy.y, vx: Math.cos(angle) * 8, vy: Math.sin(angle) * 8, 
                life: 150, size: 10, 
                color: '#7e22ce', // Purple 700 (Darker)
                damage: 2, isEnemy: true, visualType: 'FIRE_BLAST'
            });
        }
    }

    // 3. Summon Minions
    if (enemy.state.timer % 300 === 0) {
        for(let k=0; k<4; k++) spawnEnemy(state, 50, onEnemySeen, enemy.x + Math.random()*200-100, enemy.y + Math.random()*200-100);
    }

    // 4. Reality Tear (Phase 2)
    if (enemy.state.phase === 2 && state.frame % 10 === 0) {
         state.projectiles.push({
            x: enemy.x, y: enemy.y, vx: 0, vy: 0, life: 100000000, size: 100, color: '#1e1b4b', damage: 0, isEnemy: true, isStatic: true, visualType: 'VOID_TRAIL',
            customData: { spawnFrame: state.frame }
         });
    }

    // 5. Void Nova (Phase 2 Ultimate)
    if (enemy.state.phase === 2) {
         enemy.state.custom.novaTimer--;
         if (enemy.state.custom.novaTimer < 300) {
             moveX = 0; moveY = 0; moveSpeed = 0;
             VFX.castVoidNovaCharge(state, enemy.x, enemy.y, 1 - (enemy.state.custom.novaTimer / 300));
             
             if (enemy.state.custom.novaTimer === 0) {
                 // The Boom
                 state.projectiles.push({
                     x: enemy.x, y: enemy.y, vx: 0, vy: 0, life: 60, size: 25000, color: '#000', damage: 9999, isEnemy: true, isStatic: true, visualType: 'VOID_NOVA', customData: { hasHit: false }
                 });
                 
                 // The Remanent (Pitch Black Zone of Death)
                 state.projectiles.push({
                     x: enemy.x, y: enemy.y, vx: 0, vy: 0, life: 100000000, size: 600, color: '#000', damage: 9999, isEnemy: true, isStatic: true, visualType: 'VOID_NOVA_AFTERMATH'
                 });

                 enemy.state.custom.novaTimer = 900;
             }
         }
    }

    return { moveX, moveY, moveSpeed };
};
