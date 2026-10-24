import { Enemy, Projectile, Particle, Drop, ParticleType } from './types';

// --- 1. PROJECTILE POOL ---
const PROJECTILE_POOL: Projectile[] = [];
const MAX_PROJECTILE_POOL_SIZE = 600;

export function acquireProjectile(init: Partial<Projectile> & { x: number; y: number; vx: number; vy: number; life: number; size: number; color: string; damage: number }): Projectile {
    const p = PROJECTILE_POOL.length > 0 ? PROJECTILE_POOL.pop()! : ({} as Projectile);
    p.x = init.x;
    p.y = init.y;
    p.vx = init.vx;
    p.vy = init.vy;
    p.life = init.life;
    p.maxLife = init.maxLife;
    p.size = init.size;
    p.color = init.color;
    p.damage = init.damage;
    p.isEnemy = init.isEnemy;
    p.isStatic = init.isStatic;
    p.isPiercing = init.isPiercing;
    p.visualType = init.visualType;
    p.customData = init.customData;
    return p;
}

export function releaseProjectile(p: Projectile): void {
    if (PROJECTILE_POOL.length < MAX_PROJECTILE_POOL_SIZE) {
        p.customData = undefined;
        PROJECTILE_POOL.push(p);
    }
}

export function swapRemoveProjectile(arr: Projectile[], index: number, onRemove?: (p: Projectile) => void): void {
    const removed = arr[index];
    if (onRemove) onRemove(removed);
    const lastIdx = arr.length - 1;
    if (index !== lastIdx) {
        arr[index] = arr[lastIdx];
    }
    arr.pop();
    releaseProjectile(removed);
}

// --- 2. PARTICLE POOL ---
const PARTICLE_POOL: Particle[] = [];
const MAX_PARTICLE_POOL_SIZE = 600;

export function acquireParticle(): Particle {
    if (PARTICLE_POOL.length > 0) {
        return PARTICLE_POOL.pop()!;
    }
    return {
        x: 0,
        y: 0,
        vx: 0,
        vy: 0,
        life: 0,
        maxLife: 0,
        size: 0,
        color: '#ffffff',
        type: ParticleType.NORMAL,
        friction: 0.95,
        gravity: 0,
        shrink: 0.1,
        alpha: 1,
        customData: undefined,
    };
}

export function releaseParticle(p: Particle): void {
    if (PARTICLE_POOL.length < MAX_PARTICLE_POOL_SIZE) {
        p.customData = undefined;
        PARTICLE_POOL.push(p);
    }
}

export function swapRemoveParticle(arr: Particle[], index: number): void {
    const removed = arr[index];
    const lastIdx = arr.length - 1;
    if (index !== lastIdx) {
        arr[index] = arr[lastIdx];
    }
    arr.pop();
    releaseParticle(removed);
}

// --- 3. DROP POOL ---
const DROP_POOL: Drop[] = [];
const MAX_DROP_POOL_SIZE = 400;

export function acquireDrop(init: Drop): Drop {
    const d = DROP_POOL.length > 0 ? DROP_POOL.pop()! : ({} as Drop);
    d.x = init.x;
    d.y = init.y;
    d.value = init.value;
    d.isKey = init.isKey;
    d.isSecretKey = init.isSecretKey;
    d.isHeart = init.isHeart;
    return d;
}

export function releaseDrop(d: Drop): void {
    if (DROP_POOL.length < MAX_DROP_POOL_SIZE) {
        d.isKey = undefined;
        d.isSecretKey = undefined;
        d.isHeart = undefined;
        DROP_POOL.push(d);
    }
}

export function swapRemoveDrop(arr: Drop[], index: number): void {
    const removed = arr[index];
    const lastIdx = arr.length - 1;
    if (index !== lastIdx) {
        arr[index] = arr[lastIdx];
    }
    arr.pop();
    releaseDrop(removed);
}

// --- 4. ENEMY SWAP-REMOVE ---
export function swapRemoveEnemy(arr: Enemy[], index: number): void {
    const lastIdx = arr.length - 1;
    if (index !== lastIdx) {
        arr[index] = arr[lastIdx];
    }
    arr.pop();
}
