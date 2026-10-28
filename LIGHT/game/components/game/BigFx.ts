// (2B+) BigFx — cinematic explosions drawn as a few procedural layers instead of 300 particles.
// Used by the White Hole detonation (player ultimate) and boss finisher / phase moments.
//
// Layers per explosion (all Canvas 2D, additive):
//   1. core flash      — radial gradient white → colour, 6 frames, screen-space flash too
//   2. fireball shell  — noise-distorted blob (simplex-noise, MIT) that expands and darkens
//   3. shockwave ring  — thin ring with a chromatic double edge, expands fast, fades
//   4. embers          — a few bright particles via the normal pool (so caps still apply)
//   5. smoke           — slow dark puffs that linger
// Plus a HEAVY camera shake (own budget, bigger than Feel.SHAKE_MAX_AMP) and a short hit-stop.
//
// simplex-noise is the only external dependency (MIT, Jonas Wagner) — pure math, ~3 kB gzipped.

import { createNoise3D } from 'simplex-noise';
import { MutableGameState, ParticleType } from './types';
import { createParticle } from './Particles';
import { hitStop, feel } from './Feel';
import { BIGFX_MAX, BIGFX_SHAKE_MAX } from './Constants';

const noise3 = createNoise3D(() => 0.4242); // deterministic seed so replays look the same

export interface BigExplosion {
    x: number; y: number;
    frame: number;           // age in frames
    life: number;            // total frames
    radius: number;          // final fireball radius (world px)
    color: string;           // primary (hot) colour
    color2: string;          // secondary (cool edge) colour
    seed: number;            // noise offset so two blasts don't look identical
    ringSpeed: number;       // shockwave px / frame
    rings: number;           // number of shockwave rings (1-3)
    dark?: boolean;          // void-style: black core, coloured rim
}

const ensure = (state: MutableGameState) => { if (!state.bigFx) state.bigFx = []; return state.bigFx; };

/** Camera shake with its own budget (bigger than normal hits). Decays via Feel.updateShake like any shake. */
export const heavyShake = (state: MutableGameState, amp: number, frames: number) => {
    if (!feel.screenShake) return;
    state.shakeAmp = Math.min(BIGFX_SHAKE_MAX, Math.max(state.shakeAmp ?? 0, amp));
    state.shakeHold = Math.max(state.shakeHold ?? 0, frames);
};

/** Screen-space white flash (0..1), decays in the renderer. */
export const screenFlash = (state: MutableGameState, strength: number, color = '#ffffff') => {
    if (feel.reduceFlash) strength *= 0.3;
    state.screenFlash = Math.max(state.screenFlash ?? 0, Math.min(1, strength));
    state.screenFlashColor = color;
};

export const spawnBigExplosion = (state: MutableGameState, x: number, y: number, opts: Partial<BigExplosion> & { radius: number }) => {
    const list = ensure(state);
    if (list.length >= BIGFX_MAX) list.shift();
    const e: BigExplosion = {
        x, y, frame: 0, life: opts.life ?? 70, radius: opts.radius,
        color: opts.color ?? '#ffffff', color2: opts.color2 ?? '#67e8f9',
        seed: opts.seed ?? Math.random() * 1000, ringSpeed: opts.ringSpeed ?? 28, rings: opts.rings ?? 2,
        dark: opts.dark,
    };
    list.push(e);

    // embers + smoke through the normal pool (caps apply)
    const embers = Math.min(90, Math.round(opts.radius / 6));
    for (let i = 0; i < embers; i++) {
        const a = Math.random() * Math.PI * 2;
        const sp = 6 + Math.random() * 22;
        createParticle(state, x, y, ParticleType.SPARK, Math.random() < 0.6 ? e.color : e.color2, {
            vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 30 + Math.random() * 40, size: 2 + Math.random() * 3,
            friction: 0.94, gravity: 0.08, shrink: 0.08,
        });
    }
    const smoke = Math.min(40, Math.round(opts.radius / 14));
    for (let i = 0; i < smoke; i++) {
        const a = Math.random() * Math.PI * 2;
        const d = Math.random() * opts.radius * 0.5;
        createParticle(state, x + Math.cos(a) * d, y + Math.sin(a) * d, ParticleType.SMOKE, e.dark ? '#1e1b4b' : '#3f3f46', {
            speed: 0.5 + Math.random() * 1.5, life: 90 + Math.random() * 60, size: 18 + Math.random() * 26, friction: 0.98, shrink: -0.15,
        });
    }
    return e;
};

/** The White Hole detonation: huge, white/cyan, multi-ring, heavy shake, flash, hit-stop. */
export const castWhiteHoleBlast = (state: MutableGameState, x: number, y: number, radius: number) => {
    spawnBigExplosion(state, x, y, { radius, life: 80, color: '#ffffff', color2: '#a5f3fc', ringSpeed: 34, rings: 3 });
    heavyShake(state, BIGFX_SHAKE_MAX, 16);
    screenFlash(state, 1);
    hitStop(state, 4);
};

/** Boss finisher / death: boss colour, darker, slower rings. */
export const castBossDeathBlast = (state: MutableGameState, x: number, y: number, color: string, radius = 420) => {
    spawnBigExplosion(state, x, y, { radius, life: 90, color: '#ffffff', color2: color, ringSpeed: 24, rings: 3 });
    spawnBigExplosion(state, x, y, { radius: radius * 0.6, life: 60, color, color2: '#000000', ringSpeed: 0, rings: 0, dark: true });
    heavyShake(state, BIGFX_SHAKE_MAX * 0.8, 20);
    screenFlash(state, 0.8, color);
    hitStop(state, 4);
};

export const updateBigFx = (state: MutableGameState) => {
    const list = state.bigFx; if (!list) return;
    for (let i = list.length - 1; i >= 0; i--) if (++list[i].frame >= list[i].life) { list[i] = list[list.length - 1]; list.pop(); }
    if (state.screenFlash) state.screenFlash = state.screenFlash > 0.02 ? state.screenFlash * 0.82 : 0;
};

const ease = (t: number) => 1 - Math.pow(1 - t, 3);

/** World-space. Call after particles, before floaters. */
export const drawBigFx = (ctx: CanvasRenderingContext2D, state: MutableGameState) => {
    const list = state.bigFx; if (!list || !list.length) return;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (let k = 0; k < list.length; k++) {
        const e = list[k];
        const t = e.frame / e.life;          // 0..1
        const grow = ease(Math.min(1, t * 1.6));
        const r = e.radius * grow;

        // 1. core flash (first 10 frames)
        if (e.frame < 10 && !e.dark) {
            const a = 1 - e.frame / 10;
            const g = ctx.createRadialGradient(e.x, e.y, 0, e.x, e.y, r * 0.9 + 40);
            g.addColorStop(0, `rgba(255,255,255,${a})`);
            g.addColorStop(0.5, e.color2);
            g.addColorStop(1, 'rgba(0,0,0,0)');
            ctx.globalAlpha = a;
            ctx.fillStyle = g;
            ctx.beginPath(); ctx.arc(e.x, e.y, r * 0.9 + 40, 0, Math.PI * 2); ctx.fill();
        }

        // 2. fireball shell — noise-distorted blob, fades out over the second half
        const shellAlpha = t < 0.5 ? 1 : 1 - (t - 0.5) / 0.5;
        if (shellAlpha > 0.02) {
            const segs = 40;
            const z = e.seed + e.frame * 0.04;
            ctx.globalAlpha = shellAlpha * (e.dark ? 0.9 : 0.75);
            const g = ctx.createRadialGradient(e.x, e.y, r * 0.15, e.x, e.y, r);
            if (e.dark) {
                g.addColorStop(0, 'rgba(0,0,0,1)');
                g.addColorStop(0.7, 'rgba(0,0,0,0.9)');
                g.addColorStop(1, e.color);
            } else {
                g.addColorStop(0, '#ffffff');
                g.addColorStop(0.35, e.color);
                g.addColorStop(0.75, e.color2);
                g.addColorStop(1, 'rgba(0,0,0,0)');
            }
            ctx.fillStyle = g;
            ctx.beginPath();
            for (let s = 0; s <= segs; s++) {
                const a = (s / segs) * Math.PI * 2;
                const n = noise3(Math.cos(a) * 1.4 + e.seed, Math.sin(a) * 1.4, z);       // -1..1
                const rr = r * (0.78 + 0.22 * n) * (1 + 0.08 * Math.sin(a * 7 + z * 3));
                const px = e.x + Math.cos(a) * rr, py = e.y + Math.sin(a) * rr;
                if (s === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
            }
            ctx.closePath();
            if (e.dark) { ctx.globalCompositeOperation = 'source-over'; ctx.fill(); ctx.globalCompositeOperation = 'lighter'; }
            else ctx.fill();

            // inner hot tongues (second noise octave, smaller, brighter)
            if (!e.dark) {
                ctx.globalAlpha = shellAlpha * 0.5;
                ctx.fillStyle = '#ffffff';
                ctx.beginPath();
                for (let s = 0; s <= segs; s++) {
                    const a = (s / segs) * Math.PI * 2;
                    const n = noise3(Math.cos(a) * 3 + e.seed + 7, Math.sin(a) * 3, z * 1.7);
                    const rr = r * (0.3 + 0.25 * n);
                    const px = e.x + Math.cos(a) * rr, py = e.y + Math.sin(a) * rr;
                    if (s === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
                }
                ctx.closePath(); ctx.fill();
            }
        }

        // 3. shockwave rings — chromatic double edge, each ring offset in time
        for (let q = 0; q < e.rings; q++) {
            const rf = e.frame - q * 6; if (rf < 0) continue;
            const rr = rf * e.ringSpeed;
            const ra = Math.max(0, 1 - rf / (e.life * 0.7));
            if (ra <= 0) continue;
            const w = Math.max(2, 14 * ra);
            ctx.globalAlpha = ra * 0.9;
            ctx.lineWidth = w;
            ctx.strokeStyle = e.color2; ctx.beginPath(); ctx.arc(e.x, e.y, rr + w * 0.6, 0, Math.PI * 2); ctx.stroke();
            ctx.strokeStyle = '#ffffff'; ctx.beginPath(); ctx.arc(e.x, e.y, rr, 0, Math.PI * 2); ctx.stroke();
            ctx.strokeStyle = e.color; ctx.globalAlpha = ra * 0.5; ctx.beginPath(); ctx.arc(e.x, e.y, rr - w * 0.6, 0, Math.PI * 2); ctx.stroke();
        }
    }
    ctx.restore();
};

/** Screen-space flash overlay. Call after the world restore. */
export const drawScreenFlash = (ctx: CanvasRenderingContext2D, state: MutableGameState, w: number, h: number) => {
    const f = state.screenFlash ?? 0; if (f <= 0.01) return;
    ctx.save();
    ctx.globalAlpha = Math.min(0.85, f);
    ctx.fillStyle = state.screenFlashColor ?? '#ffffff';
    ctx.fillRect(0, 0, w, h);
    ctx.restore();
};
