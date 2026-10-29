// (4A) Port of fork ObjectPools.ts — fixed-capacity free lists for particles, projectiles and
// drops, plus swap-remove helpers so hot loops never splice(). Public spawn APIs
// (`createParticle`, `state.projectiles.push(...)`, `state.drops.push(...)`) are unchanged;
// pooling happens on the *release* side (and `acquire*` is available for new spawners).
//
// (4B) Rule 9: NO live-count caps. The *_FREE_LIST constants only bound how many dead objects are kept.
import { Projectile, Particle, Drop, Enemy, ParticleType, MutableGameState } from './types';
import { PARTICLE_FREE_LIST, PROJECTILE_FREE_LIST, DROP_FREE_LIST } from './Constants';

// --- PARTICLES ---------------------------------------------------------------
const PARTICLE_FREE: Particle[] = [];

export const acquireParticle = (): Particle =>
    PARTICLE_FREE.pop() ?? {
        x: 0, y: 0, vx: 0, vy: 0, size: 0, color: '#ffffff',
        life: 0, maxLife: 0, type: ParticleType.NORMAL,
        friction: 0.95, gravity: 0, shrink: 0.1, alpha: 1,
    };

export const releaseParticle = (p: Particle): void => {
    if (PARTICLE_FREE.length < PARTICLE_FREE_LIST) PARTICLE_FREE.push(p);
};

/** Remove index i from arr in O(1) (order not preserved) and recycle it. */
export const swapRemoveParticle = (arr: Particle[], i: number): void => {
    const removed = arr[i];
    const last = arr.length - 1;
    if (i !== last) arr[i] = arr[last];
    arr.pop();
    releaseParticle(removed);
};


// --- PROJECTILES -------------------------------------------------------------
const PROJECTILE_FREE: Projectile[] = [];

export const acquireProjectile = (init: Projectile): Projectile => {
    const p = PROJECTILE_FREE.pop() ?? ({} as Projectile);
    p.x = init.x; p.y = init.y; p.vx = init.vx; p.vy = init.vy;
    p.size = init.size; p.color = init.color;
    p.damage = init.damage; p.isEnemy = init.isEnemy; p.life = init.life;
    p.visualType = init.visualType; p.pullRadius = init.pullRadius;
    p.isStatic = init.isStatic; p.targetId = init.targetId; p.customData = init.customData;
    return p;
};

export const releaseProjectile = (p: Projectile): void => {
    if (PROJECTILE_FREE.length < PROJECTILE_FREE_LIST) {
        p.customData = undefined; p.targetId = undefined; p.pullRadius = undefined;
        PROJECTILE_FREE.push(p);
    }
};

export const swapRemoveProjectile = (arr: Projectile[], i: number): void => {
    if (i < 0 || i >= arr.length) return; // (8B) stale index guard
    const removed = arr[i];
    const last = arr.length - 1;
    if (i !== last) arr[i] = arr[last];
    arr.pop();
    releaseProjectile(removed);
};

// --- DROPS -------------------------------------------------------------------
const DROP_FREE: Drop[] = [];

export const acquireDrop = (x: number, y: number, value: number): Drop => {
    const d = DROP_FREE.pop() ?? ({} as Drop);
    d.x = x; d.y = y; d.value = value; d.relicId = undefined; // (3A) recycled slot must not keep a relic
    return d;
};

export const releaseDrop = (d: Drop): void => {
    if (DROP_FREE.length < DROP_FREE_LIST) DROP_FREE.push(d);
};

export const swapRemoveDrop = (arr: Drop[], i: number): void => {
    const removed = arr[i];
    const last = arr.length - 1;
    if (i !== last) arr[i] = arr[last];
    arr.pop();
    releaseDrop(removed);
};

// --- ENEMIES -----------------------------------------------------------------
/** Enemies are not pooled (defs/state are rich), but removal is O(1). */
export const swapRemoveEnemy = (arr: Enemy[], i: number): void => {
    const last = arr.length - 1;
    if (i !== last) arr[i] = arr[last];
    arr.pop();
};

/** Debug/HANDOFF helper: free-list sizes. */
export const poolStats = () => ({
    particlesFree: PARTICLE_FREE.length,
    projectilesFree: PROJECTILE_FREE.length,
    dropsFree: DROP_FREE.length,
});
