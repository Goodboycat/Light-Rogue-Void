// (3A step 5) Fog-of-discovery minimap: 120×120, top-right under the wave box.
// Visited fog cells (WORLD_FOG_GRID²) are cached in an offscreen canvas and only
// redrawn when state.world.fogVersion changes. Discovered points are drawn live.
import { MutableGameState } from '../types';
import { WORLD_SIZE, WORLD_FOG_GRID } from '../Constants';
import { landmarkById, shrineById, relicById, worldEventById } from '../../../data/world';
import { WorldPoint } from '../logic/WorldLogic';

export const MINIMAP_SIZE = 120;
const PAD = 8;

let fogCanvas: HTMLCanvasElement | null = null;
let fogCtx: CanvasRenderingContext2D | null = null;
let cachedVersion = -1;
let cachedFog: Uint8Array | null = null;

const pointColor = (p: WorldPoint): string => {
    switch (p.kind) {
        case 'landmark': return landmarkById(p.id)?.color ?? '#fff';
        case 'shrine': return shrineById(p.id as any)?.color ?? '#fff';
        case 'relic': return relicById(p.id as any)?.color ?? '#fff';
        default: return worldEventById(p.id as any)?.color ?? '#fff';
    }
};

const rebuildFog = (fog: Uint8Array) => {
    if (!fogCanvas) {
        fogCanvas = document.createElement('canvas');
        fogCanvas.width = MINIMAP_SIZE; fogCanvas.height = MINIMAP_SIZE;
        fogCtx = fogCanvas.getContext('2d');
    }
    const c = fogCtx; if (!c) return;
    c.clearRect(0, 0, MINIMAP_SIZE, MINIMAP_SIZE);
    const cell = MINIMAP_SIZE / WORLD_FOG_GRID;
    c.fillStyle = 'rgba(148,163,184,0.28)';
    for (let gy = 0; gy < WORLD_FOG_GRID; gy++) for (let gx = 0; gx < WORLD_FOG_GRID; gx++) {
        if (fog[gy * WORLD_FOG_GRID + gx]) c.fillRect(gx * cell, gy * cell, cell + 0.5, cell + 0.5);
    }
};

/** Screen space, after ctx.restore(). Skipped when the setting is off or a boss is active (BossBar owns the top). */
export const drawMinimap = (ctx: CanvasRenderingContext2D, state: MutableGameState, w: number, h: number) => {
    const world = state.world;
    if (!world || state.showMinimap === false || state.activeBoss) return;
    if (typeof document === 'undefined') return;
    // new run → new fog array → force a rebuild even if fogVersion happens to match
    if (cachedVersion !== world.fogVersion || cachedFog !== world.fog) { rebuildFog(world.fog); cachedVersion = world.fogVersion; cachedFog = world.fog; }

    const x0 = w - MINIMAP_SIZE - 16, y0 = 104; // under GameHUD's wave box (top-8 right-8, ~64 px tall)
    const scale = MINIMAP_SIZE / WORLD_SIZE;
    const toMap = (wx: number, wy: number): [number, number] => [x0 + (wx + WORLD_SIZE / 2) * scale, y0 + (wy + WORLD_SIZE / 2) * scale];

    ctx.save();
    ctx.globalAlpha = 0.9;
    ctx.fillStyle = 'rgba(2,6,23,0.6)';
    ctx.fillRect(x0 - PAD / 2, y0 - PAD / 2, MINIMAP_SIZE + PAD, MINIMAP_SIZE + PAD);
    if (fogCanvas) ctx.drawImage(fogCanvas, x0, y0);
    ctx.strokeStyle = 'rgba(255,255,255,0.18)'; ctx.lineWidth = 1;
    ctx.strokeRect(x0 - PAD / 2 + 0.5, y0 - PAD / 2 + 0.5, MINIMAP_SIZE + PAD - 1, MINIMAP_SIZE + PAD - 1);

    // discovered points (consumed ones dim); undiscovered stay hidden — this is a fog map, not a quest map
    for (const p of world.points) {
        if (!p.discovered) continue;
        const [mx, my] = toMap(p.x, p.y);
        ctx.globalAlpha = p.consumed ? 0.35 : 0.95;
        ctx.fillStyle = pointColor(p);
        ctx.beginPath();
        if (p.kind === 'landmark') { ctx.moveTo(mx, my - 3.5); ctx.lineTo(mx + 3.5, my); ctx.lineTo(mx, my + 3.5); ctx.lineTo(mx - 3.5, my); ctx.closePath(); }
        else if (p.kind === 'shrine') ctx.rect(mx - 2.5, my - 2.5, 5, 5);
        else ctx.arc(mx, my, 2.5, 0, Math.PI * 2);
        ctx.fill();
    }

    // camera viewport + player
    ctx.globalAlpha = 0.5; ctx.strokeStyle = 'rgba(255,255,255,0.5)';
    const [vx, vy] = toMap(state.camera.x, state.camera.y);
    ctx.strokeRect(vx, vy, Math.max(4, w * scale), Math.max(4, h * scale));
    const [px, py] = toMap(state.player.x, state.player.y);
    ctx.globalAlpha = 1; ctx.fillStyle = '#ffffff'; ctx.shadowColor = '#fff'; ctx.shadowBlur = 6;
    ctx.beginPath(); ctx.arc(px, py, 2.5, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
};
