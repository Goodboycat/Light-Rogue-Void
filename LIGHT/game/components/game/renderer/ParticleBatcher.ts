// (4A) Port of fork renderer/ParticleBatcher.ts — batched particle draw + culling.
// Stripped: LIGHTNING_BOLT pass (no such type in LIGHT), performanceMode branches (7B adds quality).
// Particles are bucketed by (mode|color|quantized alpha) into Path2D so hundreds of circles
// cost a handful of fill() calls; GLOW particles use cached sprites instead of per-frame gradients.
import { Particle, ParticleType } from '../types';
import { getGlowSprite } from './GlowSprites';

const ALPHA_STEPS = 12;
const quantizeAlpha = (a: number) => Math.max(1, Math.round(a * ALPHA_STEPS)) / ALPHA_STEPS;

interface Bucket {
    path: Path2D;
    color: string;
    alpha: number;
    mode: 'fill' | 'stroke';
}

export interface CullBounds {
    centerX: number;
    centerY: number;
    halfW: number;
    halfH: number;
    margin: number;
}

const buckets = new Map<string, Bucket>();
const glowBuckets = new Map<string, Particle[]>();

export function drawParticlesBatched(
    ctx: CanvasRenderingContext2D,
    particles: Particle[],
    cull?: CullBounds,
    glowEnabled: boolean = true
) {
    if (particles.length === 0) return;
    buckets.clear();
    glowBuckets.clear();

    const cullMaxW = cull ? cull.halfW + cull.margin : Infinity;
    const cullMaxH = cull ? cull.halfH + cull.margin : Infinity;
    const cx = cull ? cull.centerX : 0;
    const cy = cull ? cull.centerY : 0;

    // Pass 1 — flat-color circles / rings
    for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        if (!Number.isFinite(p.x) || !Number.isFinite(p.y)) continue;
        if (cull && (Math.abs(p.x - cx) > cullMaxW || Math.abs(p.y - cy) > cullMaxH)) continue;
        if (!Number.isFinite(p.size) || p.size <= 0) continue;

        if (p.type === ParticleType.GLOW && glowEnabled) {
            const alpha = quantizeAlpha(p.alpha ?? (p.life / p.maxLife));
            const key = `${p.color}|${alpha}`;
            let bucket = glowBuckets.get(key);
            if (!bucket) { bucket = []; glowBuckets.set(key, bucket); }
            bucket.push(p);
            continue;
        }

        const baseAlpha = p.type === ParticleType.SMOKE ? 0.2 : 1.0;
        const alpha = quantizeAlpha((p.alpha ?? (p.life / p.maxLife)) * baseAlpha);
        const mode: 'fill' | 'stroke' = p.type === ParticleType.RING ? 'stroke' : 'fill';
        const key = `${mode}|${p.color}|${alpha}`;

        let bucket = buckets.get(key);
        if (!bucket) {
            bucket = { path: new Path2D(), color: p.color, alpha, mode };
            buckets.set(key, bucket);
        }
        bucket.path.moveTo(p.x + p.size, p.y);
        bucket.path.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    }

    buckets.forEach(b => {
        ctx.globalAlpha = b.alpha;
        if (b.mode === 'fill') {
            ctx.fillStyle = b.color;
            ctx.fill(b.path);
        } else {
            ctx.strokeStyle = b.color;
            ctx.lineWidth = 2;
            ctx.stroke(b.path);
        }
    });

    // Pass 2 — GLOW particles via cached sprites
    if (glowEnabled) {
        glowBuckets.forEach((bucketParticles, key) => {
            const sepIdx = key.indexOf('|');
            const color = key.slice(0, sepIdx);
            const alpha = parseFloat(key.slice(sepIdx + 1));
            ctx.globalAlpha = alpha;
            const sprite = getGlowSprite(color, 128);
            for (let i = 0; i < bucketParticles.length; i++) {
                const p = bucketParticles[i];
                // sprite fades to transparent at its edge, so draw at 2× radius to match the old gradient look
                const d = p.size * 2;
                ctx.drawImage(sprite, p.x - d / 2, p.y - d / 2, d, d);
            }
        });
    }

    ctx.globalAlpha = 1;
}
