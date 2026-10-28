// (3A step 3) Touching a world point. Shrines buff, relic alcoves spawn 8 elite guards then drop
// the relic, landmarks show a 4 s non-pausing lore card, events run a short scripted encounter.
// All feedback is particles + a screen-space card (state.worldCard) + one LIGHT line. No menus.
import { MutableGameState, ParticleType, Enemy } from '../types';
import {
    WORLD_TOUCH_RADIUS, WORLD_CARD_FRAMES, WORLD_RELIC_GUARDS, WORLD_GUARD_WARN_FRAMES,
    WORLD_EVENT_RING, WORLD_SPARK_RADIUS, WORLD_SPARK_KINDLE_SEC, WORLD_STAR_SHARD_EVERY,
    WORLD_STAR_SHARD_R, WORLD_STAR_SHARD_DMG,
} from '../Constants';
import { shrineById, relicById, landmarkById, worldEventById, addRunModifiers } from '../../../data/world';
import { WorldPoint, revealAllFog } from './WorldLogic';
import { telegraph, telegraphContains } from './enemies/BossKit';
import { spawnEnemy } from './enemies/SpawnLogic';
import { spawnExplosion, createParticle } from '../Particles';
import { VFX } from '../Emitters';
import { shake } from '../Feel';
import { acquireDrop } from '../Pools';
import { sfx } from '../../../audio/hooks'; // (6B)

export const showCard = (state: MutableGameState, title: string, body: string, color: string, light?: string, frames = WORLD_CARD_FRAMES) => {
    state.worldCard = { title, body, light, color, frames, max: frames };
};

const burst = (state: MutableGameState, x: number, y: number, color: string) => {
    spawnExplosion(state, x, y, color, ParticleType.GLOW);
    VFX.castShockwave(state, x, y, color);
    for (let i = 0; i < 24; i++) {
        const a = Math.random() * Math.PI * 2;
        createParticle(state, x + Math.cos(a) * 30, y + Math.sin(a) * 30, ParticleType.SPARK, color, { speed: 2 + Math.random() * 3, life: 40 + Math.random() * 30, size: 2 });
    }
};

// ---------- shrine ----------
const touchShrine = (state: MutableGameState, p: WorldPoint) => {
    const def = shrineById(p.id as any); if (!def || !state.runModifiers || !state.world) return;
    p.discovered = true; p.consumed = true;
    state.world.shrinesUsed.push(def.id);
    addRunModifiers(state.runModifiers, def.effect);
    if (def.healPct) state.healRequest = (state.healRequest ?? 0) + def.healPct;
    if (def.shield) state.shieldRequest = (state.shieldRequest ?? 0) + def.shield;
    burst(state, p.x, p.y, def.color);
    shake(state, 4);
    sfx('shrine_touch', 1, 0); // (6B)
    showCard(state, def.name, def.toast, def.color, def.light);
};

// ---------- relic alcove ----------
const guardDef = (wave: number) => undefined; // wave-appropriate pool; elite flag does the rest

const openRelicAlcove = (state: MutableGameState, p: WorldPoint, onEnemySeen: (id: string) => void) => {
    const def = relicById(p.id as any); if (!def) return;
    p.discovered = true; p.active = true; p.counter = WORLD_RELIC_GUARDS;
    const wave = state.currentWave ?? 1;
    showCard(state, 'Relic Alcove', `Guarded. Clear the ${WORLD_RELIC_GUARDS} wardens.`, def.color, 'Nothing here is free.', 180);
    shake(state, 5);
    state.worldEventActive = true;
    for (let i = 0; i < WORLD_RELIC_GUARDS; i++) {
        const a = (i / WORLD_RELIC_GUARDS) * Math.PI * 2 + p.seed * 6;
        const gx = p.x + Math.cos(a) * 260, gy = p.y + Math.sin(a) * 260;
        telegraph(state, 'circle', gx, gy, { radius: 36, color: def.color }, WORLD_GUARD_WARN_FRAMES + i * 4, (st) => {
            spawnExplosion(st, gx, gy, def.color, ParticleType.SMOKE);
            const e = spawnEnemy(st, wave, onEnemySeen, gx, gy, guardDef(wave), { elite: true });
            e.worldGuardOf = p.id;
        });
    }
};

/** Called from KillLogic for every death: relic guards count down; the relic drops at 0. */
export const onWorldGuardKilled = (state: MutableGameState, enemy: Enemy) => {
    const id = enemy.worldGuardOf; if (!id || !state.world) return;
    const p = state.world.points.find(q => q.kind === 'relic' && q.id === id && q.active);
    if (!p) return;
    p.counter = Math.max(0, (p.counter ?? 1) - 1);
    if (p.counter === 0) {
        p.active = false;
        state.worldEventActive = false;
        const def = relicById(p.id as any)!;
        burst(state, p.x, p.y, def.color);
        // the relic is a drop you walk into (DropLogic picks it up like essence)
        const d = acquireDrop(p.x, p.y, 0);
        d.relicId = def.id;
        state.drops.push(d);
    }
};

/** DropLogic calls this when a relic drop is collected. */
export const collectRelic = (state: MutableGameState, relicId: string) => {
    const def = relicById(relicId as any); if (!def || !state.world || !state.runModifiers) return;
    const p = state.world.points.find(q => q.kind === 'relic' && q.id === relicId);
    if (p) p.consumed = true;
    state.world.relics.push(def.id);
    addRunModifiers(state.runModifiers, def.effect);
    if (def.effect.dashCharges) state.dashChargesLeft = (state.dashChargesLeft ?? 0) + def.effect.dashCharges;
    if (def.effect.revealMap) revealAllFog(state);
    burst(state, state.player.x, state.player.y, def.color);
    shake(state, 6);
    sfx('pickup_relic', 1, 0); // (6B)
    showCard(state, def.name, def.desc, def.color, def.light);
};

// ---------- landmark ----------
const touchLandmark = (state: MutableGameState, p: WorldPoint) => {
    const def = landmarkById(p.id); if (!def || !state.world) return;
    p.discovered = true; p.consumed = true;
    if (!state.world.landmarksSeen.includes(def.id)) state.world.landmarksSeen.push(def.id);
    state.landmarkSeenQueue = [...(state.landmarkSeenQueue ?? []), def.id]; // SurvivalGame → gameState.landmarksSeen
    for (let i = 0; i < 40; i++) {
        const a = Math.random() * Math.PI * 2, r = 40 + Math.random() * 120;
        createParticle(state, p.x + Math.cos(a) * r, p.y + Math.sin(a) * r, ParticleType.GLOW, def.color, { speed: 0.3, life: 90, size: 3 + Math.random() * 3 });
    }
    sfx('landmark_reveal', 0.8, 0); // (6B)
    showCard(state, def.name, def.lore, def.color, def.light);
};

// ---------- events ----------
const startEvent = (state: MutableGameState, p: WorldPoint, onEnemySeen: (id: string) => void) => {
    const def = worldEventById(p.id as any); if (!def) return;
    p.discovered = true; p.active = true; p.counter = def.durationSec * 60;
    state.worldEventActive = true;
    showCard(state, def.name, def.caption, def.color, def.light, 180);
    sfx(def.id === 'ambush' ? 'ambush_ring' : 'event_start', 1, 0); // (6B)
    shake(state, 5);
    const wave = state.currentWave ?? 1;
    if (def.id === 'ambush') {
        const n = 10 + Math.min(10, Math.floor(wave / 4));
        for (let i = 0; i < n; i++) {
            const a = (i / n) * Math.PI * 2;
            const gx = p.x + Math.cos(a) * WORLD_EVENT_RING, gy = p.y + Math.sin(a) * WORLD_EVENT_RING;
            telegraph(state, 'circle', gx, gy, { radius: 30, color: def.color }, WORLD_GUARD_WARN_FRAMES, (st) => {
                spawnEnemy(st, wave, onEnemySeen, gx, gy, undefined, i % 4 === 0 ? { elite: true } : undefined);
            });
        }
    } else if (def.id === 'lost_spark') {
        p.sparkProgress = 0;
    } else if (def.id === 'collapsing_star') {
        p.coreDropped = false;
    }
};

const finishEvent = (state: MutableGameState, p: WorldPoint, success: boolean) => {
    const def = worldEventById(p.id as any)!;
    p.active = false; p.consumed = true;
    state.worldEventActive = false;
    if (!success) { showCard(state, def.name, 'It passed.', '#94a3b8', undefined, 120); return; }
    const wave = state.currentWave ?? 1;
    burst(state, p.x, p.y, def.color);
    if (def.id === 'ambush') {
        showCard(state, 'Ambush survived', 'The ring breaks. Essence spills.', def.color, 'Still here.', 150);
        for (let i = 0; i < 14; i++) { const a = Math.random() * Math.PI * 2, r = 30 + Math.random() * 90; state.drops.push(acquireDrop(p.x + Math.cos(a) * r, p.y + Math.sin(a) * r, 6 + wave)); }
    } else if (def.id === 'lost_spark') {
        showCard(state, 'Spark kindled', 'Healed 30 % · +1 shield', def.color, 'Go. Find your own way out.', 150);
        state.healRequest = (state.healRequest ?? 0) + 0.3;
        state.shieldRequest = (state.shieldRequest ?? 0) + 1;
    } else if (def.id === 'collapsing_star') {
        showCard(state, 'Star core', 'A dense core of essence.', def.color, 'Heavier than it looks.', 150);
        for (let i = 0; i < 6; i++) { const a = Math.random() * Math.PI * 2, r = 10 + Math.random() * 40; state.drops.push(acquireDrop(p.x + Math.cos(a) * r, p.y + Math.sin(a) * r, 15 + wave * 2)); }
    }
};

const updateEvent = (state: MutableGameState, p: WorldPoint) => {
    const def = worldEventById(p.id as any)!;
    p.counter = (p.counter ?? 0) - 1;
    const px = state.player.x, py = state.player.y;
    const dist = Math.hypot(px - p.x, py - p.y);
    if (def.id === 'ambush') {
        // ring of light that closes slowly; survive until the clock runs out (or kill everything spawned)
        if (state.frame % 6 === 0) {
            const a = Math.random() * Math.PI * 2;
            createParticle(state, p.x + Math.cos(a) * WORLD_EVENT_RING, p.y + Math.sin(a) * WORLD_EVENT_RING, ParticleType.SPARK, def.color, { speed: 0.5, life: 30, size: 2 });
        }
        if (p.counter <= 0) finishEvent(state, p, true);
    } else if (def.id === 'lost_spark') {
        const inside = dist < WORLD_SPARK_RADIUS;
        p.sparkProgress = Math.max(0, (p.sparkProgress ?? 0) + (inside ? 1 : -0.5));
        if (state.frame % 4 === 0) {
            const a = Math.random() * Math.PI * 2;
            createParticle(state, p.x + Math.cos(a) * WORLD_SPARK_RADIUS, p.y + Math.sin(a) * WORLD_SPARK_RADIUS, ParticleType.GLOW, inside ? def.color : '#64748b', { speed: 0.2, life: 25, size: 2 });
        }
        if (inside && state.frame % 3 === 0) createParticle(state, p.x, p.y, ParticleType.GLOW, def.color, { speed: 1.5, life: 30, size: 2 + (p.sparkProgress / (WORLD_SPARK_KINDLE_SEC * 60)) * 6 });
        if (p.sparkProgress >= WORLD_SPARK_KINDLE_SEC * 60) finishEvent(state, p, true);
        else if (p.counter <= 0) finishEvent(state, p, false);
    } else if (def.id === 'collapsing_star') {
        if (state.frame % WORLD_STAR_SHARD_EVERY === 0) {
            // shards aim near the player when they're in the field, else around the point
            const near = dist < 420;
            const cx = near ? px : p.x, cy = near ? py : p.y;
            const a = Math.random() * Math.PI * 2, r = Math.random() * (near ? 120 : 300);
            const sx = cx + Math.cos(a) * r, sy = cy + Math.sin(a) * r;
            telegraph(state, 'circle', sx, sy, { radius: WORLD_STAR_SHARD_R, color: def.color }, 45, (st, t) => {
                VFX.castMeteor(st, sx, sy); spawnExplosion(st, sx, sy, def.color, ParticleType.FIRE);
                shake(st, 3);
                if (telegraphContains(t, st.player.x, st.player.y, st.player.size)) {
                    const maxHp = st.playerStatsRef?.maxHealth ?? 100;
                    st.damagePlayer?.(Math.max(1, Math.round(maxHp * WORLD_STAR_SHARD_DMG)));
                }
            });
        }
        if (p.counter <= 0) finishEvent(state, p, true);
    }
};

/** Per frame from Logic.ts. Touch detection + running events + card timer. */
export const updateWorld = (state: MutableGameState, onEnemySeen: (id: string) => void) => {
    const w = state.world; if (!w) return;
    if (state.worldCard && --state.worldCard.frames <= 0) state.worldCard = undefined;
    const px = state.player.x, py = state.player.y;
    for (const p of w.points) {
        if (p.consumed) continue;
        if (p.active) { if (p.kind === 'event') updateEvent(state, p); continue; }
        if (p.discovered && p.kind !== 'relic') continue;
        if (p.kind === 'relic' && p.discovered) continue; // alcove opened, guards dead, relic is a drop now
        if (Math.hypot(px - p.x, py - p.y) > WORLD_TOUCH_RADIUS + state.player.size) continue;
        switch (p.kind) {
            case 'shrine': touchShrine(state, p); break;
            case 'relic': openRelicAlcove(state, p, onEnemySeen); break;
            case 'landmark': touchLandmark(state, p); break;
            case 'event': startEvent(state, p, onEnemySeen); break;
        }
    }
};
