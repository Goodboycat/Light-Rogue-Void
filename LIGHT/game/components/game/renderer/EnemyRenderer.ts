
import { Enemy } from '../types';
import { AFFIX_BY_ID } from '../../../data/affixes';
import { ENEMY_SHOT_WARN_FRAMES } from '../Constants';
import { enemyPalette, mix, phaseColor, type ChapterPalette } from './Palette';
import type { EnemyDef } from '../types';
import { isSpriteMode, drawSprite, spriteId } from './SpriteRenderer';

// (5B) sprite id for an enemy: enemies/minions = def.id, bosses = `<id> P<phase>` (gallery cell labels).
const enemySpriteId = (enemy: Enemy) => enemy.isBoss ? spriteId(`${enemy.def.id} P${enemy.state.phase ?? 1}`) : spriteId(enemy.def.id);

/** (5B) Sprite-mode body: blit the gallery PNG (white-tinted on hit flash). Returns false → caller draws procedurally. */
const drawEnemySprite = (ctx: CanvasRenderingContext2D, enemy: Enemy, frame: number): boolean => {
    const id = enemySpriteId(enemy);
    const flashing = (enemy.flashTimer ?? 0) > 0;
    const prevA = ctx.globalAlpha;
    if (enemy.projectileImmunity > 0) ctx.globalAlpha = prevA * 0.6;
    const ok = drawSprite(ctx, id, enemy.x, enemy.y, 0, 1, flashing ? '#ffffff' : undefined);
    ctx.globalAlpha = prevA;
    if (!ok) return false;
    if (flashing) enemy.flashTimer!--;
    // dynamic overlays stay procedural (cheap strokes): carried ring, affixes, shields, shot warn, boss phase cracks
    ctx.save();
    ctx.translate(enemy.x, enemy.y);
    const size = enemy.def.size;
    if (enemy.affixes && enemy.affixes.length && !enemy.isBoss) drawAffixRing(ctx, enemy, frame, size);
    if (((enemy.shieldHits ?? 0) > 0 || enemy.aegisShielded || (enemy.shieldPopFrames ?? 0) > 0) && !enemy.isBoss) drawShieldShell(ctx, enemy, frame, size);
    if (enemy.isShiner && !enemy.isBoss) drawShinerHalo(ctx, frame, size);
    if ((enemy.shotWarn ?? 0) > 0) {
        const t = 1 - enemy.shotWarn! / ENEMY_SHOT_WARN_FRAMES;
        ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.25 + 0.55 * t; ctx.fillStyle = '#ffffff';
        ctx.beginPath(); ctx.arc(0, 0, size * (0.35 + 0.45 * t), 0, Math.PI * 2); ctx.fill();
        ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
    }
    if (enemy.isBoss && !enemy.state.custom?.cinematicMode) drawBossPhaseOverlay(ctx, enemy, frame);
    ctx.restore();
    return true;
};

// (5A) Per-def tint cache: every enemy keeps its own hue but is pulled 25 % toward its chapter accent so a wave
// reads as one palette; the outline is the chapter's dark outline. Bosses keep their own colours (phase overlay rules).
const tintCache = new Map<string, { fill: string; glow: string; pal: ChapterPalette }>();
export const enemyTint = (def: EnemyDef) => {
    let t = tintCache.get(def.id);
    if (!t) {
        const pal = enemyPalette(def);
        t = { fill: mix(def.color, pal.base, 0.25), glow: mix(def.glowColor, pal.accent, 0.25), pal };
        tintCache.set(def.id, t);
    }
    return t;
};

const drawHexagon = (ctx: CanvasRenderingContext2D, x: number, y: number, r: number) => {
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
        const angle = (Math.PI / 3) * i;
        ctx.lineTo(x + r * Math.cos(angle), y + r * Math.sin(angle));
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
};

// (2C) Boss phase overlay: a core whose colour tracks the phase (P1 boss glow → P2 amber → P3 red-white) and a
// deterministic crack web that opens in P3 (the body is breaking). Shift = the core flares. Drawn on top of the body.
const PHASE_CORE = ['', '#ffffff', '#fbbf24', '#ef4444'];
const drawBossPhaseOverlay = (ctx: CanvasRenderingContext2D, enemy: Enemy, frame: number) => {
    const phase = enemy.state.phase ?? 1;
    const shifting = (enemy.state.custom?.phaseShiftTimer ?? 0) > 0;
    const size = enemy.def.size;
    const pulse = 0.5 + 0.5 * Math.sin(frame * (0.06 + phase * 0.03));
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.shadowBlur = 0;
    // (5A) enrage: a fast red heartbeat ring expanding from the body edge (every 0.5 s) + red rim
    if (enemy.state.bossEnraged) {
        const t = ((frame % 30) / 30);
        ctx.globalAlpha = (1 - t) * 0.7;
        ctx.strokeStyle = '#ef4444'; ctx.lineWidth = 3 + 3 * (1 - t);
        ctx.beginPath(); ctx.arc(0, 0, size * (1.05 + t * 0.6), 0, Math.PI * 2); ctx.stroke();
        ctx.globalAlpha = 0.5 + 0.3 * Math.sin(frame * 0.4);
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(0, 0, size * 1.02, 0, Math.PI * 2); ctx.stroke();
    }
    // core
    const coreR = size * (0.22 + 0.06 * phase) * (1 + pulse * 0.15) * (shifting ? 1.6 : 1);
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, coreR * 2.2);
    const col = phase === 1 ? enemy.def.glowColor : PHASE_CORE[phase];
    g.addColorStop(0, '#ffffff');
    g.addColorStop(0.35, col);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.globalAlpha = shifting ? 0.95 : 0.55 + 0.25 * pulse;
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(0, 0, coreR * 2.2, 0, Math.PI * 2); ctx.fill();
    // P2: a thin amber seam ring; P3: cracks radiating from the core (seeded by the boss id so they don't jitter)
    if (phase >= 2) {
        ctx.globalAlpha = 0.45 + 0.3 * pulse;
        ctx.strokeStyle = col;
        ctx.lineWidth = phase === 3 ? 2.5 : 1.5;
        ctx.beginPath(); ctx.arc(0, 0, size * 0.62, 0, Math.PI * 2); ctx.stroke();
    }
    if (phase === 3) {
        let seed = 0; for (let i = 0; i < enemy.def.id.length; i++) seed = (seed * 31 + enemy.def.id.charCodeAt(i)) | 0;
        const rnd = () => { seed = (seed * 1103515245 + 12345) | 0; return ((seed >>> 8) & 0xffff) / 0x10000; };
        const hpRatio = Math.max(0, enemy.hp / Math.max(1, enemy.maxHp));
        const spread = Math.min(1, Math.max(0, 1 - hpRatio / 0.34));  // 0 at 33 % → 1 near death
        ctx.strokeStyle = '#ffffff';
        ctx.globalAlpha = 0.5 + 0.4 * pulse;
        for (let k = 0; k < 7; k++) {
            let a = rnd() * Math.PI * 2, r = size * 0.25;
            const len = size * (0.5 + 0.6 * spread) * (0.6 + rnd() * 0.6);
            ctx.lineWidth = 1 + 1.5 * spread;
            ctx.beginPath(); ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r);
            const segs = 3 + Math.floor(rnd() * 3);
            for (let s = 0; s < segs; s++) { r += len / segs; a += (rnd() - 0.5) * 0.7; ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r); }
            ctx.stroke();
            // glow behind the crack
            ctx.save(); ctx.strokeStyle = col; ctx.lineWidth = (3 + 4 * spread); ctx.globalAlpha = 0.25 * (0.5 + pulse * 0.5); ctx.stroke(); ctx.restore();
        }
    }
    ctx.restore();
};

const drawAffixRing = (ctx: CanvasRenderingContext2D, enemy: Enemy, frame: number, size: number) => {
    const affixes = enemy.affixes!;
    const r = size + 7;
    ctx.save();
    ctx.globalCompositeOperation = 'source-over';
    ctx.shadowBlur = 8;
    ctx.lineWidth = 2.5;
    const n = affixes.length;
    for (let i = 0; i < n; i++) {
        const def = AFFIX_BY_ID[affixes[i]];
        ctx.strokeStyle = def.color;
        ctx.shadowColor = def.color;
        ctx.globalAlpha = 0.75 + 0.25 * Math.sin(frame * 0.12 + i);
        const a0 = frame * 0.02 + (i / n) * Math.PI * 2;
        ctx.beginPath(); ctx.arc(0, 0, r, a0, a0 + (Math.PI * 2) / n - 0.25); ctx.stroke();
    }
    ctx.shadowBlur = 0;
    ctx.globalAlpha = 1;
    ctx.font = `bold ${Math.max(10, Math.min(16, size * 0.7))}px monospace`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    for (let i = 0; i < n; i++) {
        const def = AFFIX_BY_ID[affixes[i]];
        ctx.fillStyle = def.color;
        ctx.fillText(def.glyph, (i - (n - 1) / 2) * 14, -r - 9);
    }
    ctx.restore();
};

const drawShieldShell = (ctx: CanvasRenderingContext2D, enemy: Enemy, frame: number, size: number) => {
    const pop = enemy.shieldPopFrames ?? 0;
    if (pop > 0) enemy.shieldPopFrames = pop - 1;
    const alive = (enemy.shieldHits ?? 0) > 0 || !!enemy.aegisShielded;
    const r = size + 4 + (alive ? 0 : pop * 1.2);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = enemy.aegisShielded ? '#c084fc' : '#38bdf8';
    ctx.fillStyle = ctx.strokeStyle;
    ctx.lineWidth = alive ? 1.5 + pop * 0.3 : 2;
    ctx.globalAlpha = alive ? 0.35 + 0.25 * Math.sin(frame * 0.15) + pop * 0.05 : pop / 14;
    ctx.beginPath();
    for (let i = 0; i < 6; i++) { const a = (Math.PI / 3) * i + frame * 0.01; ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r); }
    ctx.closePath(); ctx.stroke();
    if (alive) { ctx.globalAlpha *= 0.25; ctx.fill(); }
    ctx.restore();
};

const drawShinerHalo = (ctx: CanvasRenderingContext2D, frame: number, size: number) => {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const pulse = 0.5 + 0.5 * Math.sin(frame * 0.2);
    const r = size + 10 + pulse * 4;
    const g = ctx.createRadialGradient(0, 0, size * 0.3, 0, 0, r);
    g.addColorStop(0, 'rgba(253,224,71,0.55)');
    g.addColorStop(1, 'rgba(253,224,71,0)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#fde047'; ctx.lineWidth = 1.5; ctx.globalAlpha = 0.6 + 0.4 * pulse;
    for (let i = 0; i < 4; i++) { const a = frame * 0.05 + i * Math.PI / 2; ctx.beginPath(); ctx.moveTo(Math.cos(a) * (r - 3), Math.sin(a) * (r - 3)); ctx.lineTo(Math.cos(a) * (r + 6), Math.sin(a) * (r + 6)); ctx.stroke(); }
    ctx.restore();
};

export const drawEnemy = (ctx: CanvasRenderingContext2D, enemy: Enemy, frame: number) => {
    // (5B) sprite mode first; procedural fallback when the PNG is missing / not loaded
    if (isSpriteMode() && drawEnemySprite(ctx, enemy, frame)) return;
    ctx.save();
    ctx.translate(enemy.x, enemy.y);
    
    // Hit Flash
    if ((enemy.flashTimer ?? 0) > 0) {
        // (4A) hit flash: solid white silhouette for a few frames
        enemy.flashTimer!--;
        ctx.fillStyle = '#ffffff';
        ctx.shadowColor = '#ffffff';
        ctx.shadowBlur = 12;
    } else if (enemy.projectileImmunity > 0) {
        ctx.globalCompositeOperation = 'overlay';
        ctx.fillStyle = '#fff';
    } else {
        ctx.fillStyle = enemy.isBoss ? enemy.def.color : enemyTint(enemy.def).fill;
    }
    
    // (5A) boss body stroke follows the phase: P1 chapter glow, P2 hotter amber, P3 white
    ctx.strokeStyle = enemy.isBoss ? phaseColor(enemy.def.glowColor, enemy.state.phase ?? 1) : enemyTint(enemy.def).glow;
    ctx.lineWidth = 2;

    const size = enemy.def.size;

    // (2A) Carried-over survivor: faint ring so persistence is visible.
    if (enemy.carried && !enemy.isBoss) {
        ctx.save();
        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = 0.35 + 0.15 * Math.sin(frame * 0.1);
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(0, 0, size + 6, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
    }

    // (4B) Elite affixes: coloured ring outline (one arc per affix) + glyph above; SHIELDED / AEGIS shows a hex shell.
    if (enemy.affixes && enemy.affixes.length && !enemy.isBoss) drawAffixRing(ctx, enemy, frame, size);
    if (((enemy.shieldHits ?? 0) > 0 || enemy.aegisShielded || (enemy.shieldPopFrames ?? 0) > 0) && !enemy.isBoss) drawShieldShell(ctx, enemy, frame, size);
    if (enemy.isShiner && !enemy.isBoss) drawShinerHalo(ctx, frame, size);
    // (4B) shooter telegraph: a growing glow the 0.4 s before a shot
    if ((enemy.shotWarn ?? 0) > 0) {
        const t = 1 - enemy.shotWarn! / ENEMY_SHOT_WARN_FRAMES;
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = 0.25 + 0.55 * t;
        ctx.fillStyle = '#ffffff';
        ctx.beginPath(); ctx.arc(0, 0, size * (0.35 + 0.45 * t), 0, Math.PI * 2); ctx.fill();
        ctx.restore();
    }

    switch (enemy.def.visualType) {
        case 'HIVE':
            // Base Core (Pulsating)
            const breath = (Math.sin(frame * 0.05) + 1) / 2; // 0 to 1
            ctx.shadowBlur = 15;
            ctx.shadowColor = enemy.def.glowColor;
            
            // Core
            ctx.beginPath();
            ctx.arc(0, 0, size * 0.4, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
            ctx.shadowBlur = 0;

            // Construction Ring 1
            const hexSize = size * 0.22;
            ctx.lineWidth = 1.5;
            for(let i=0; i<6; i++) {
                const angle = (i / 6) * Math.PI * 2 + (frame * 0.01);
                const dist = (size * 0.65) + (breath * 5); 
                const hx = Math.cos(angle) * dist;
                const hy = Math.sin(angle) * dist;
                
                ctx.globalAlpha = 0.3;
                ctx.beginPath();
                ctx.moveTo(0,0);
                ctx.lineTo(hx, hy);
                ctx.stroke();
                ctx.globalAlpha = 1.0;
                drawHexagon(ctx, hx, hy, hexSize);
            }
            
            // Construction Ring 2
            ctx.fillStyle = enemy.def.glowColor; 
            for(let i=0; i<12; i++) {
                const angle = (i / 12) * Math.PI * 2 - (frame * 0.005);
                const isBroken = i % 2 === 0;
                const offset = Math.sin(frame * 0.05 + i) * 8;
                const dist = (size * 1.0) + offset + (breath * 12);
                const hx = Math.cos(angle) * dist;
                const hy = Math.sin(angle) * dist;
                
                ctx.globalAlpha = 0.6 + 0.4 * Math.sin(frame * 0.1 + i);
                if (isBroken) {
                    ctx.beginPath(); ctx.arc(hx, hy, hexSize * 0.3, 0, Math.PI*2); ctx.fill();
                } else {
                    drawHexagon(ctx, hx, hy, hexSize * 0.8);
                }
                ctx.globalAlpha = 1.0;
            }
            break;

        case 'WARDEN':
            // THE VOID WARDEN: Rotating Cubes/Diamonds
            ctx.shadowBlur = 20;
            ctx.shadowColor = enemy.def.glowColor;
            
            // Central Diamond
            ctx.rotate(frame * 0.02);
            ctx.beginPath();
            ctx.rect(-size*0.4, -size*0.4, size*0.8, size*0.8);
            ctx.fill();
            ctx.stroke();
            
            // Inner Spinning Frame
            ctx.rotate(-frame * 0.04);
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 3;
            ctx.strokeRect(-size*0.6, -size*0.6, size*1.2, size*1.2);
            
            // Outer Glitchy Frame
            ctx.rotate(frame * 0.01);
            ctx.strokeStyle = enemy.def.glowColor;
            ctx.lineWidth = 2;
            const glitchOffset = Math.sin(frame * 0.5) * 5;
            ctx.strokeRect(-size*0.8 - glitchOffset, -size*0.8 + glitchOffset, size*1.6, size*1.6);
            
            // Corner Runes
            for(let i=0; i<4; i++) {
                ctx.rotate(Math.PI/2);
                ctx.fillStyle = '#fff';
                ctx.beginPath();
                ctx.arc(size, size, 4, 0, Math.PI*2);
                ctx.fill();
            }
            break;

        case 'ECLIPSE':
            // CRIMSON ECLIPSE: Black Star with Red Corona
            // Jagged Corona (Behind)
            ctx.fillStyle = '#b91c1c'; // Dark Red
            ctx.shadowBlur = 30;
            ctx.shadowColor = '#ef4444';
            ctx.beginPath();
            for(let i=0; i<16; i++) {
                const angle = (i/16) * Math.PI*2 + (frame * 0.02);
                const rOuter = size * 1.4 + Math.sin(frame * 0.2 + i * 10) * 10;
                const rInner = size * 0.8;
                ctx.lineTo(Math.cos(angle)*rOuter, Math.sin(angle)*rOuter);
                ctx.lineTo(Math.cos(angle + 0.2)*rInner, Math.sin(angle + 0.2)*rInner);
            }
            ctx.closePath();
            ctx.fill();
            
            // Main Body (Black Void)
            ctx.shadowBlur = 0;
            ctx.fillStyle = '#000';
            ctx.beginPath();
            ctx.arc(0, 0, size * 0.9, 0, Math.PI*2);
            ctx.fill();
            
            // Burning Rim (Red)
            ctx.strokeStyle = '#ef4444';
            ctx.lineWidth = 4;
            ctx.beginPath();
            ctx.arc(0, 0, size * 0.9, 0, Math.PI*2);
            ctx.stroke();
            break;

        case 'NEUTRON':
            // COLLAPSING NEUTRON: Tiny bright core, massive accretion disk
            // Accretion Disk (Swirling Lines)
            ctx.shadowBlur = 10;
            ctx.shadowColor = '#38bdf8';
            ctx.lineWidth = 2;
            ctx.strokeStyle = '#0ea5e9';
            
            // Draw 3 spiral arms
            for(let arm=0; arm<3; arm++) {
                ctx.beginPath();
                for(let i=0; i<20; i++) {
                    const angle = (frame * -0.2) + (arm * (Math.PI*2/3)) + (i * 0.2);
                    const radius = size * 0.2 + (i * size * 0.06);
                    const px = Math.cos(angle) * radius;
                    const py = Math.sin(angle) * radius;
                    if (i===0) ctx.moveTo(px, py);
                    else ctx.lineTo(px, py);
                }
                ctx.stroke();
            }
            
            // Event Horizon
            ctx.fillStyle = '#000';
            ctx.beginPath();
            ctx.arc(0, 0, size * 0.3, 0, Math.PI*2);
            ctx.fill();

            // Core (Blinding White)
            ctx.shadowBlur = 40;
            ctx.shadowColor = '#fff';
            ctx.fillStyle = '#fff';
            ctx.beginPath();
            ctx.arc(0, 0, size * 0.15, 0, Math.PI*2);
            ctx.fill();
            break;

        case 'TITAN':
            // ENTROPY TITAN: Mechanical Fortress
            ctx.shadowBlur = 15;
            ctx.shadowColor = '#84cc16';
            
            // Center Core (Hexagon)
            ctx.fillStyle = '#1a2e05'; // Dark Green
            ctx.strokeStyle = '#bef264'; // Lime
            ctx.lineWidth = 3;
            drawHexagon(ctx, 0, 0, size * 0.6);
            
            // Inner Core Pulse
            const pulse = 0.5 + Math.sin(frame * 0.1) * 0.2;
            ctx.fillStyle = `rgba(132, 204, 22, ${pulse})`;
            ctx.beginPath();
            ctx.arc(0, 0, size * 0.2, 0, Math.PI*2);
            ctx.fill();

            // Orbiting Heavy Plating (Shields)
            const plateCount = 4;
            for(let i=0; i<plateCount; i++) {
                const angle = (frame * 0.02) + (i * (Math.PI*2/plateCount));
                const dist = size * 1.1;
                
                const px = Math.cos(angle) * dist;
                const py = Math.sin(angle) * dist;
                
                // Connector
                ctx.strokeStyle = 'rgba(132, 204, 22, 0.3)';
                ctx.lineWidth = 4;
                ctx.beginPath(); ctx.moveTo(0,0); ctx.lineTo(px, py); ctx.stroke();
                
                // Plate
                ctx.save();
                ctx.translate(px, py);
                ctx.rotate(angle + Math.PI/2); // Face inward
                ctx.fillStyle = '#3f6212';
                ctx.strokeStyle = '#84cc16';
                ctx.lineWidth = 2;
                
                // Draw trapezoid shape
                ctx.beginPath();
                ctx.moveTo(-15, -10);
                ctx.lineTo(15, -10);
                ctx.lineTo(25, 10);
                ctx.lineTo(-25, 10);
                ctx.closePath();
                ctx.fill();
                ctx.stroke();
                
                ctx.restore();
            }
            break;

        case 'DARKNESS':
            // THE END: PURE CONTRAST (Now Dark Purple)
            // 1. The Aura (Jagged, static-like interference) - DARK PURPLE
            ctx.shadowBlur = 60;
            ctx.shadowColor = '#5b21b6'; // Violet 800
            ctx.fillStyle = '#2e1065';   // Violet 950 (Darkest Purple)
            
            ctx.beginPath();
            const spikeCount = 40;
            for(let i=0; i<=spikeCount; i++) {
                const angle = (i/spikeCount) * Math.PI * 2 + (frame * 0.01);
                // Noise driven radius
                const noise = Math.sin(frame * 0.1 + i * 1.5) + Math.cos(frame * 0.2 + i * 3);
                const r = size * (1.0 + Math.abs(noise) * 0.15);
                const px = Math.cos(angle) * r;
                const py = Math.sin(angle) * r;
                if (i===0) ctx.moveTo(px, py);
                else ctx.lineTo(px, py);
            }
            ctx.closePath();
            ctx.fill();
            
            // 2. The Void (Absolute Black Circle)
            ctx.shadowBlur = 0;
            ctx.fillStyle = '#000000';
            ctx.beginPath();
            ctx.arc(0, 0, size * 0.9, 0, Math.PI * 2);
            ctx.fill();
            
            // 3. Inner Accretion (Rings) - DARK PURPLE TINT
            ctx.strokeStyle = 'rgba(139, 92, 246, 0.4)'; // Violet 500 alpha
            ctx.lineWidth = 2;
            
            // Ring 1 (Slow)
            ctx.beginPath();
            ctx.ellipse(0, 0, size * 0.7, size * 0.2, frame * 0.02, 0, Math.PI * 2);
            ctx.stroke();
            
            // Ring 2 (Fast, inverse)
            ctx.strokeStyle = 'rgba(167, 139, 250, 0.6)'; // Violet 400 alpha
            ctx.beginPath();
            ctx.ellipse(0, 0, size * 0.5, size * 0.15, -frame * 0.03 + Math.PI/3, 0, Math.PI * 2);
            ctx.stroke();

            // 4. The Eye of Non-Existence (Center)
            // A tiny white dot that flickers, opposite of the player
            const flicker = Math.random() > 0.9 ? 0 : 3;
            ctx.fillStyle = '#ffffff';
            ctx.shadowColor = '#ffffff';
            ctx.shadowBlur = 10;
            ctx.beginPath();
            ctx.arc(0, 0, flicker, 0, Math.PI*2);
            ctx.fill();
            break;

        case 'CRAB': {
            // (5A) shell + 6 jointed legs + 2 claws: a wide, low silhouette
            const legStroke = ctx.strokeStyle;
            ctx.lineWidth = Math.max(1.5, size * 0.12); ctx.lineCap = 'round';
            for (let i = 0; i < 6; i++) {
                const side = i < 3 ? -1 : 1;
                const a = side * (Math.PI * 0.25 + (i % 3) * 0.42) + Math.PI / 2 * (side === 1 ? -1 : 1) * 0;
                const ang = (i % 3 - 1) * 0.55 + (side < 0 ? Math.PI : 0);
                const kneeX = Math.cos(ang) * size * 1.15, kneeY = Math.sin(ang) * size * 1.15 - size * 0.3;
                const footY = kneeY + size * 0.9 + Math.sin(frame * 0.2 + i) * size * 0.15;
                ctx.beginPath(); ctx.moveTo(Math.cos(ang) * size * 0.6, Math.sin(ang) * size * 0.4);
                ctx.lineTo(kneeX, kneeY); ctx.lineTo(kneeX * 1.15, footY); ctx.stroke();
                void a;
            }
            // claws
            for (const side of [-1, 1]) {
                const cx = side * size * 1.1, cy = -size * 0.9;
                ctx.beginPath(); ctx.moveTo(side * size * 0.5, -size * 0.4); ctx.lineTo(cx, cy); ctx.stroke();
                ctx.beginPath(); ctx.arc(cx, cy, size * 0.32, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
            }
            ctx.strokeStyle = legStroke; ctx.lineWidth = 2;
            ctx.beginPath(); ctx.ellipse(0, 0, size, size * 0.72, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
            // eyes
            ctx.fillStyle = '#ffffff';
            ctx.beginPath(); ctx.arc(-size * 0.3, -size * 0.25, size * 0.12, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.arc(size * 0.3, -size * 0.25, size * 0.12, 0, Math.PI * 2); ctx.fill();
            break;
        }

        case 'SERPENT': {
            // (5A) head + 7 tapering segments (filled discs, not a line) so the body reads at 32 px
            const angleS = Math.atan2(enemy.vy, enemy.vx) + Math.PI;
            const bodyFill = ctx.fillStyle;
            for (let i = 7; i >= 1; i--) {
                const dist = i * (size * 0.75);
                const wave = Math.sin(frame * 0.3 + i) * (size * 0.45);
                const tx = Math.cos(angleS) * dist + Math.cos(angleS + Math.PI / 2) * wave;
                const ty = Math.sin(angleS) * dist + Math.sin(angleS + Math.PI / 2) * wave;
                const r = size * (0.85 - i * 0.09);
                ctx.globalAlpha = 1 - i * 0.07;
                ctx.beginPath(); ctx.arc(tx, ty, r, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
            }
            ctx.globalAlpha = 1; ctx.fillStyle = bodyFill;
            ctx.beginPath(); ctx.arc(0, 0, size, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
            // dorsal fin + eye
            const fa = angleS + Math.PI;
            ctx.beginPath(); ctx.moveTo(Math.cos(fa) * size, Math.sin(fa) * size);
            ctx.lineTo(Math.cos(fa + 0.5) * size * 0.6, Math.sin(fa + 0.5) * size * 0.6);
            ctx.lineTo(Math.cos(fa - 0.5) * size * 0.6, Math.sin(fa - 0.5) * size * 0.6); ctx.closePath(); ctx.fill();
            ctx.fillStyle = '#ffffff';
            ctx.beginPath(); ctx.arc(Math.cos(fa + 0.9) * size * 0.5, Math.sin(fa + 0.9) * size * 0.5, size * 0.14, 0, Math.PI * 2); ctx.fill();
            break;
        }

        case 'GHOST': {
            // (5A) hooded sheet with a 3-point trailing hem and two hollow eyes
            ctx.globalAlpha = 0.8;
            const p = 1 + Math.sin(frame * 0.1) * 0.08;
            ctx.scale(p, p);
            ctx.beginPath();
            ctx.moveTo(-size, size * 0.3);
            ctx.lineTo(-size, -size * 0.2);
            ctx.quadraticCurveTo(-size, -size * 1.3, 0, -size * 1.3);
            ctx.quadraticCurveTo(size, -size * 1.3, size, -size * 0.2);
            ctx.lineTo(size, size * 0.3);
            for (let i = 0; i < 4; i++) {
                const x = size - (i + 0.5) * size * 0.5;
                const y = size * 0.3 + (i % 2 === 0 ? size * 0.6 : size * 0.15) + Math.sin(frame * 0.2 + i) * size * 0.1;
                ctx.lineTo(x, y);
            }
            ctx.lineTo(-size, size * 0.3);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
            ctx.globalAlpha = 1;
            ctx.fillStyle = '#05060a';
            ctx.beginPath(); ctx.ellipse(-size * 0.38, -size * 0.45, size * 0.18, size * 0.26, 0, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.ellipse(size * 0.38, -size * 0.45, size * 0.18, size * 0.26, 0, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#ffffff';
            ctx.beginPath(); ctx.arc(-size * 0.38, -size * 0.45, size * 0.07, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.arc(size * 0.38, -size * 0.45, size * 0.07, 0, Math.PI * 2); ctx.fill();
            break;
        }

        case 'STAR': {
            // (5A) 5 long spikes + a bright core disc
            ctx.rotate(frame * 0.05);
            ctx.beginPath();
            for (let i = 0; i < 5; i++) {
                const a0 = (i / 5) * Math.PI * 2, a1 = a0 + Math.PI / 5;
                ctx.lineTo(Math.cos(a0) * size * 1.15, Math.sin(a0) * size * 1.15);
                ctx.lineTo(Math.cos(a1) * size * 0.45, Math.sin(a1) * size * 0.45);
            }
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
            ctx.fillStyle = ctx.strokeStyle;
            ctx.beginPath(); ctx.arc(0, 0, size * 0.3, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#ffffff';
            ctx.beginPath(); ctx.arc(0, 0, size * 0.14, 0, Math.PI * 2); ctx.fill();
            break;
        }

        case 'CONSTRUCT': {
            // (5A) hex hull + 4 corner plates + a rotating inner frame
            ctx.rotate(frame * 0.02);
            drawHexagon(ctx, 0, 0, size);
            const plateFill = ctx.fillStyle;
            for (let i = 0; i < 4; i++) {
                const a = i * Math.PI / 2 + Math.PI / 4;
                const px = Math.cos(a) * size * 0.95, py = Math.sin(a) * size * 0.95;
                ctx.beginPath(); ctx.rect(px - size * 0.22, py - size * 0.22, size * 0.44, size * 0.44); ctx.fill(); ctx.stroke();
            }
            ctx.fillStyle = plateFill;
            ctx.rotate(-frame * 0.05);
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 1.5;
            ctx.strokeRect(-size * 0.4, -size * 0.4, size * 0.8, size * 0.8);
            ctx.fillStyle = ctx.strokeStyle; ctx.globalAlpha = 0.9;
            ctx.beginPath(); ctx.arc(0, 0, size * 0.14, 0, Math.PI * 2); ctx.fill();
            break;
        }

        case 'EYE': {
            // (5A) almond eye: lids, coloured iris, dark pupil, highlight
            ctx.beginPath();
            ctx.moveTo(-size * 1.15, 0);
            ctx.quadraticCurveTo(0, -size * 1.0, size * 1.15, 0);
            ctx.quadraticCurveTo(0, size * 1.0, -size * 1.15, 0);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
            const px = Math.sin(frame * 0.05) * (size * 0.3);
            ctx.fillStyle = ctx.strokeStyle;
            ctx.beginPath(); ctx.arc(px, 0, size * 0.5, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#05060a';
            ctx.beginPath(); ctx.arc(px, 0, size * 0.28, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#ffffff';
            ctx.beginPath(); ctx.arc(px + size * 0.12, -size * 0.14, size * 0.09, 0, Math.PI * 2); ctx.fill();
            break;
        }

        case 'CRYSTAL': {
            // (5A) hexagonal prism: outer shard + a lit facet + a dark facet
            ctx.beginPath();
            ctx.moveTo(0, -size * 1.2);
            ctx.lineTo(size * 0.65, -size * 0.45);
            ctx.lineTo(size * 0.5, size * 0.6);
            ctx.lineTo(0, size * 1.1);
            ctx.lineTo(-size * 0.5, size * 0.6);
            ctx.lineTo(-size * 0.65, -size * 0.45);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
            const prevA = ctx.globalAlpha;
            ctx.fillStyle = '#ffffff'; ctx.globalAlpha = prevA * 0.35;
            ctx.beginPath(); ctx.moveTo(0, -size * 1.2); ctx.lineTo(-size * 0.65, -size * 0.45); ctx.lineTo(0, -size * 0.1); ctx.closePath(); ctx.fill();
            ctx.fillStyle = '#05060a'; ctx.globalAlpha = prevA * 0.35;
            ctx.beginPath(); ctx.moveTo(0, -size * 0.1); ctx.lineTo(size * 0.5, size * 0.6); ctx.lineTo(0, size * 1.1); ctx.closePath(); ctx.fill();
            ctx.globalAlpha = prevA;
            ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1; ctx.globalAlpha = prevA * 0.5;
            ctx.beginPath(); ctx.moveTo(0, -size * 1.2); ctx.lineTo(0, size * 1.1); ctx.stroke();
            ctx.globalAlpha = prevA;
            break;
        }

        case 'SWARMER': {
            // (5A) dart body + two swept wings + 3 engine dots
            ctx.rotate(Math.atan2(enemy.vy, enemy.vx) + Math.PI / 2);
            ctx.beginPath();
            ctx.moveTo(0, -size * 1.2);
            ctx.lineTo(size * 0.9, size * 0.9);
            ctx.lineTo(size * 0.3, size * 0.5);
            ctx.lineTo(0, size * 0.8);
            ctx.lineTo(-size * 0.3, size * 0.5);
            ctx.lineTo(-size * 0.9, size * 0.9);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
            ctx.fillStyle = ctx.strokeStyle;
            for (let i = -1; i <= 1; i++) { ctx.beginPath(); ctx.arc(i * size * 0.3, size * 0.55 + Math.abs(i) * size * 0.1, size * 0.11, 0, Math.PI * 2); ctx.fill(); }
            break;
        }

        default: { // SIMPLE
            // (5A) orb: body disc + inner bright core + a crescent highlight (reads as a sphere, not a dot)
            ctx.beginPath();
            ctx.arc(0, 0, size, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
            ctx.fillStyle = ctx.strokeStyle;
            const prevA = ctx.globalAlpha;
            ctx.globalAlpha = prevA * 0.8;
            ctx.beginPath(); ctx.arc(0, 0, size * 0.45, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#ffffff'; ctx.globalAlpha = prevA * 0.55;
            ctx.beginPath(); ctx.arc(-size * 0.32, -size * 0.32, size * 0.2, 0, Math.PI * 2); ctx.fill();
            ctx.globalAlpha = prevA;
            break;
        }
    }

    // (2C) phase-coloured core + P3 cracks on every boss
    if (enemy.isBoss && !enemy.state.custom?.cinematicMode) drawBossPhaseOverlay(ctx, enemy, frame);
    
    ctx.restore();
};
