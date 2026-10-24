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
const lightningParticles: Particle[] = [];
const glowBuckets = new Map<string, Particle[]>();
const glowPaths = new Map<number, Path2D>();
const corePaths = new Map<number, Path2D>();

export function drawParticlesBatched(
    ctx: CanvasRenderingContext2D,
    particles: Particle[],
    cull?: CullBounds,
    glowEnabled: boolean = true
) {
    buckets.clear();
    lightningParticles.length = 0;
    glowBuckets.clear();

    const cullMaxW = cull ? cull.halfW + cull.margin : Infinity;
    const cullMaxH = cull ? cull.halfH + cull.margin : Infinity;
    const cx = cull ? cull.centerX : 0;
    const cy = cull ? cull.centerY : 0;

    // Pass 1 — flat-color circles (everything except GLOW unless glowEnabled is false, where GLOW falls back to flat circle)
    for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        if (!Number.isFinite(p.x) || !Number.isFinite(p.y)) continue;

        if (p.type !== ParticleType.LIGHTNING_BOLT && cull) {
            if (Math.abs(p.x - cx) > cullMaxW || Math.abs(p.y - cy) > cullMaxH) {
                continue;
            }
        }

        if (p.type === ParticleType.TEXT) {
            ctx.globalAlpha = p.alpha ?? (p.life / p.maxLife);
            ctx.fillStyle = p.color;
            ctx.font = 'bold 16px Courier New, monospace';
            ctx.textAlign = 'center';
            ctx.fillText(p.customData?.text || '', p.x, p.y);
            continue;
        }
        if (!Number.isFinite(p.size) || p.size <= 0) continue;
        if (p.type === ParticleType.LIGHTNING_BOLT) {
            lightningParticles.push(p);
            continue;
        }
        if (p.type === ParticleType.GLOW && glowEnabled) {
            const alpha = quantizeAlpha(p.alpha ?? (p.life / p.maxLife));
            const key = `${p.color}|${alpha}`;
            let bucket = glowBuckets.get(key);
            if (!bucket) {
                bucket = [];
                glowBuckets.set(key, bucket);
            }
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

    // Pass 1.5 - Lightning Bolts
    if (lightningParticles.length > 0) {
        glowPaths.clear();
        corePaths.clear();
        
        for (let i = 0; i < lightningParticles.length; i++) {
            const p = lightningParticles[i];
            const data = p.customData;
            if (!data || !data.points || data.points.length < 4) continue;
            
            const lifeRatio = p.life / p.maxLife;
            const alpha = quantizeAlpha(Math.max(0, Math.min(1, (p.alpha ?? 1) * lifeRatio)));
            
            let gp = glowPaths.get(alpha);
            if (!gp) { gp = new Path2D(); glowPaths.set(alpha, gp); }
            
            let cp = corePaths.get(alpha);
            if (!cp) { cp = new Path2D(); corePaths.set(alpha, cp); }
            
            const pts = data.points;
            gp.moveTo(pts[0], pts[1]);
            cp.moveTo(pts[0], pts[1]);
            for (let j = 2; j < pts.length; j += 2) {
                gp.lineTo(pts[j], pts[j + 1]);
                cp.lineTo(pts[j], pts[j + 1]);
            }
            
            const branches = data.branches;
            if (branches) {
                for (let j = 0; j < branches.length; j++) {
                    const br = branches[j];
                    if (br.length < 4) continue;
                    gp.moveTo(br[0], br[1]);
                    cp.moveTo(br[0], br[1]);
                    for (let k = 2; k < br.length; k += 2) {
                        gp.lineTo(br[k], br[k + 1]);
                        cp.lineTo(br[k], br[k + 1]);
                    }
                }
            }
        }
        
        const prevCap = ctx.lineCap;
        const prevJoin = ctx.lineJoin;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        
        if (glowEnabled) {
            ctx.strokeStyle = '#7dd3fc';
            ctx.lineWidth = 6;
            glowPaths.forEach((path, alpha) => {
                ctx.globalAlpha = alpha * 0.55;
                ctx.stroke(path);
            });
        }
        
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.6;
        corePaths.forEach((path, alpha) => {
            ctx.globalAlpha = alpha;
            ctx.stroke(path);
        });
        
        ctx.lineCap = prevCap;
        ctx.lineJoin = prevJoin;
    }

    // Pass 2 — GLOW particles (only when glowEnabled is true)
    if (glowEnabled) {
        glowBuckets.forEach((bucketParticles, key) => {
            const sepIdx = key.indexOf('|');
            const color = key.slice(0, sepIdx);
            const alpha = parseFloat(key.slice(sepIdx + 1));
            
            ctx.globalAlpha = alpha;
            const sprite = getGlowSprite(color, 128);

            for (let i = 0; i < bucketParticles.length; i++) {
                const p = bucketParticles[i];
                const d = p.size * 4;
                ctx.drawImage(sprite, p.x - d / 2, p.y - d / 2, d, d);
            }
        });
    }

    ctx.globalAlpha = 1;
}
