import { MutableGameState, ParticleType } from './types';
import { PlayerStats } from '../../types';
import { WORLD_SIZE, RENDER_CULL_PAD } from './Constants';
import { drawEnemy } from './renderer/EnemyRenderer';
import { drawOrbitals } from './renderer/OrbitalRenderer';
import { renderProjectiles } from './renderer/ProjectileRenderer';
import { drawPlayer } from './renderer/PlayerRenderer';
import { drawDrops } from './renderer/DropRenderer';
import { drawFloaters, drawStreakBanner, drawHurtOverlay, drawFlavorBanner } from './renderer/FloaterRenderer';
import { drawParticlesBatched } from './renderer/ParticleBatcher';
import { drawTelegraphs, drawArena, drawArenaVignette, drawBossArrival } from './renderer/TelegraphRenderer';
import { drawHazards, drawCurseMarks } from './renderer/HazardRenderer';
import { drawLasers, drawEclipse, eclipseStrength } from './renderer/LaserRenderer';
import { arenaOutsideFactor } from './logic/enemies/BossKit';
import { drawBigFx, drawScreenFlash } from './BigFx';
import { drawWorldPoints, drawWorldArrow, drawWorldCard } from './renderer/WorldRenderer'; // (3A)
import { drawMinimap } from './renderer/MinimapRenderer'; // (3A)
import { quality } from './Quality'; // (7B)
import { isPlainEnemy, shouldBatchEnemies, drawEnemiesBatched } from './renderer/EnemyBatcher'; // (7B 5b)
import type { Enemy } from './types';

// (7B 5b) reusable scratch lists for the enemy pass (no per-frame allocation)
const visibleScratch: Enemy[] = [];
const plainScratch: Enemy[] = [];

export const renderGame = (
    ctx: CanvasRenderingContext2D,
    state: MutableGameState,
    stats: PlayerStats,
    canvasWidth: number,
    canvasHeight: number,
    maturityScale: number,
    currentStageColor: string
) => {
    ctx.clearRect(0, 0, canvasWidth, canvasHeight);
    const baseTransform = ctx.getTransform(); // (7B) DPR scale set by Quality.fitCanvas — screen-space passes restore to this
    
    ctx.save();
    // (7D) cinematic zoom about the screen centre; world rect visible grows/shrinks by 1/zoom
    const zoom = state.cinematicZoom ?? 1;
    if (zoom !== 1) { ctx.translate(canvasWidth / 2, canvasHeight / 2); ctx.scale(zoom, zoom); ctx.translate(-canvasWidth / 2, -canvasHeight / 2); }
    const viewHalfW = canvasWidth / 2 / zoom, viewHalfH = canvasHeight / 2 / zoom;
    // (4A) camera shake offset (rounded so sprites stay crisp)
    ctx.translate(-Math.round(state.camera.x + (state.shakeX ?? 0)), -Math.round(state.camera.y + (state.shakeY ?? 0)));

    // --- WORLD BOUNDARIES ---
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 4;
    ctx.strokeRect(-WORLD_SIZE/2, -WORLD_SIZE/2, WORLD_SIZE, WORLD_SIZE);

    // --- DROPS --- (5A) 3 essence sizes + relic gem, culled to the viewport
    drawDrops(ctx, state);

    // --- WORLD POINTS (3A, under everything but the border) ---
    drawWorldPoints(ctx, state, canvasWidth, canvasHeight);

    // --- BOSS ARENA + TELEGRAPHS (2B, under enemies) ---
    drawArena(ctx, state);
    drawHazards(ctx, state);   // (2C) persistent terrain hazards
    drawCurseMarks(ctx, state); // (4B) CURSE wave marks
    drawTelegraphs(ctx, state);

    // --- ENEMIES ---
    // (7B) viewport cull (+RENDER_CULL_PAD, bosses + lasers never culled — their beams reach across the screen).
    // Rule 9: this skips *drawing* only; every enemy still updates.
    {
        const cx = state.camera.x + canvasWidth / 2, cy = state.camera.y + canvasHeight / 2;
        const cullW = viewHalfW + RENDER_CULL_PAD, cullH = viewHalfH + RENDER_CULL_PAD;
        const es = state.enemies;
        // (7B 5b) two passes: count + collect visible, then plain ones go through the batcher when the crowd is large
        let visible = 0, plainN = 0;
        const plain = plainScratch;
        for (let i = 0; i < es.length; i++) {
            const e = es[i];
            if (!e.isBoss) {
                const r = e.def.size * 2 + 8; // affix ring / shiner halo / shield shell margin
                if (e.x + r < cx - cullW || e.x - r > cx + cullW || e.y + r < cy - cullH || e.y - r > cy + cullH) continue;
            }
            visibleScratch[visible++] = e;
        }
        const batch = shouldBatchEnemies(visible);
        for (let i = 0; i < visible; i++) {
            const e = visibleScratch[i];
            if (batch && isPlainEnemy(e)) { plain[plainN++] = e; continue; }
            drawEnemy(ctx, e, state.frame);
        }
        if (plainN) drawEnemiesBatched(ctx, plain, plainN, state.frame);
        for (let i = 0; i < visible; i++) visibleScratch[i] = undefined as any; // drop refs
        for (let i = 0; i < plainN; i++) plain[i] = undefined as any;
    }

    // --- CRIMSON ECLIPSE BEAMS (2C, above the boss body) ---
    drawLasers(ctx, state);

    // --- PROJECTILES ---
    renderProjectiles(ctx, state, { cx: state.camera.x + canvasWidth / 2, cy: state.camera.y + canvasHeight / 2, halfW: viewHalfW, halfH: viewHalfH });

    // --- BACK ORBITALS (Behind Player) ---
    if (stats.projectileCount > 0) {
        drawOrbitals(ctx, state, stats, maturityScale, true);
    }

    // --- PLAYER ---
    drawPlayer(ctx, state, stats, maturityScale, currentStageColor);

    // --- FRONT ORBITALS (In front of Player) ---
    if (stats.projectileCount > 0) {
        drawOrbitals(ctx, state, stats, maturityScale, false);
    }

    // --- PARTICLES (Additive Blending) ---
    ctx.shadowBlur = 0;
    ctx.globalCompositeOperation = 'lighter'; 
    // (4A) batched by colour/alpha into Path2D; GLOW uses cached sprites; culled to the viewport
    drawParticlesBatched(ctx, state.particles, {
        centerX: state.camera.x + canvasWidth / 2, centerY: state.camera.y + canvasHeight / 2,
        halfW: viewHalfW, halfH: viewHalfH, margin: 64,
    }, quality.glow);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';

    // --- BIG EXPLOSIONS (2B+, world space, additive) ---
    drawBigFx(ctx, state);

    // --- DAMAGE NUMBERS (4A, world space) ---
    if (quality.floaters) drawFloaters(ctx, state); // (7B) LOW drops damage numbers

    // --- ECLIPSE (2C): black out the world, then redraw only what must stay readable in the dark ---
    const ecl = eclipseStrength(state);
    if (ecl > 0) {
        ctx.save();
        ctx.setTransform(baseTransform);
        drawEclipse(ctx, state, canvasWidth, canvasHeight);
        ctx.restore();
        drawHazards(ctx, state);
        drawTelegraphs(ctx, state);
        drawLasers(ctx, state);
        // the spark itself: a faint aura so you never lose yourself
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = 0.55 * ecl;
        ctx.fillStyle = currentStageColor;
        ctx.beginPath(); ctx.arc(state.player.x, state.player.y, state.player.size * 1.6, 0, Math.PI * 2); ctx.fill();
        ctx.globalAlpha = 0.9 * ecl;
        ctx.fillStyle = '#ffffff';
        ctx.beginPath(); ctx.arc(state.player.x, state.player.y, state.player.size * 0.6, 0, Math.PI * 2); ctx.fill();
        // the boss projectiles that are flying at you stay visible too (they're telegraphed danger)
        ctx.globalAlpha = 0.8 * ecl;
        for (let i = 0; i < state.projectiles.length; i++) {
            const p = state.projectiles[i];
            if (!p.customData?.isBossProj) continue;
            ctx.fillStyle = p.color;
            ctx.beginPath(); ctx.arc(p.x, p.y, p.size * 0.7, 0, Math.PI * 2); ctx.fill();
        }
        ctx.restore();
    }

    ctx.restore();

    // --- SCREEN FLASH (2B+) / HURT VIGNETTE / LOW HP (4A, screen space) ---
    drawScreenFlash(ctx, state, canvasWidth, canvasHeight);
    drawHurtOverlay(ctx, state, canvasWidth, canvasHeight);
    drawArenaVignette(ctx, arenaOutsideFactor(state), canvasWidth, canvasHeight);
    if (!state.activeBoss?.state?.custom?.cinematicMode) drawBossArrival(ctx, state, canvasWidth, canvasHeight);
    drawStreakBanner(ctx, state, canvasWidth, canvasHeight);
    drawFlavorBanner(ctx, state, canvasWidth, canvasHeight); // (4B) special wave banner
    drawWorldArrow(ctx, state, canvasWidth, canvasHeight);   // (3A) off-screen hint, chapters 1–2
    drawWorldCard(ctx, state, canvasWidth, canvasHeight);    // (3A) lore card / shrine toast
    drawMinimap(ctx, state, canvasWidth, canvasHeight);      // (3A) fog-of-discovery minimap

    // --- CURSOR ---
    ctx.fillStyle = '#fff';
    ctx.shadowColor = '#fff';
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.arc(state.mouse.x, state.mouse.y, 3, 0, Math.PI*2);
    ctx.fill();
    ctx.shadowBlur = 0;

    // Boss bar: components/BossBar.tsx (2B, React)
};