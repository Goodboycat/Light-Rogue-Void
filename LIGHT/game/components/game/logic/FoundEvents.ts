// (3A step 7) Found events — ported from the fork's components/game/events.ts.
// Golden Mite, Essence Tide, Treasure Pylon, Ambush Ring, Meteor Shower.
// They are *discovered*, never chosen: no menu, no pick. ≥ 25 s between events, 2 s caption,
// mercy / translate / audio stripped. Damage only lands through BossKit telegraphs (CONVENTIONS).
// Pauses while a placed world event / relic alcove runs (state.worldEventActive), during bosses,
// the first 20 s of a run, and never on wave 1.
import { MutableGameState, ParticleType, Enemy, EnemyDef } from '../types';
import { telegraph, telegraphContains } from './enemies/BossKit';
import { spawnEnemy } from './enemies/SpawnLogic';
import { spawnExplosion, createParticle } from '../Particles';
import { VFX } from '../Emitters';
import { shake } from '../Feel';
import { acquireDrop } from '../Pools';
import { showCard } from './WorldInteract';
import { sfx, sfxAt } from '../../../audio/hooks'; // (6B)

export type FoundEventId = 'GOLDEN_MITE' | 'ESSENCE_TIDE' | 'TREASURE_PYLON' | 'AMBUSH_RING' | 'METEOR_SHOWER';

export const FOUND_EVENTS = {
    minCooldownFrames: 1500,        // ≥ 25 s between events (prompt rule)
    firstEventFrame: 1200,          // nothing before 20 s into a run
    calmRampPerSecond: 0.004,       // chance ramps with calm time (checked once per second)
    captionFrames: 120,             // 2 s caption
    tideMinInterval: 4200,          // Essence Tide every 70–100 s
    tideJitter: 1800,
    tideDuration: 360,              // 6 s of ×2 essence
    miteChance: 0.04,               // 4 % per spawn from wave 3, max 1 alive
    miteMinWave: 3,
    miteHpMult: 2.5,
    miteFleeDist: 320,
    miteFleeSpeed: 2.6,
    miteTeleportFrames: 360,        // blinks away after 6 s
    miteEssenceMult: 25,
    pylonBaseHp: 120,
    pylonWaveHp: 10,
    pylonDist: 500,
    pylonDuration: 720,             // 12 s
    pylonEssence: 40,
    ringCount: 10,
    ringWarnFrames: 60,             // 1 s
    ringRadius: 340,
    ringGapRad: Math.PI / 3,        // 60° safe wedge
    ringDuration: 90,
    meteorDuration: 360,            // 6 s
    meteorWarnFrames: 60,
    meteorRadius: 75,
    meteorEvery: 30,
    meteorDmg: 0.1,                 // fraction of max HP
    meteorDodgeEvery: 5,
    meteorDodgeEssence: 5,
};

export interface FoundEvent {
    type: FoundEventId;
    timer: number;
    max: number;
    gapAngle?: number;
    dodged?: number;
    spawnedRing?: boolean;
}

export interface FoundEventState {
    active?: FoundEvent;
    lastEndFrame: number;
    nextTideFrame: number;
    /** names of events found this run — docs/WORLD.md + run summary later */
    found: FoundEventId[];
}

const FOUND_LABEL: Record<FoundEventId, { title: string; body: string; light: string; color: string }> = {
    GOLDEN_MITE:    { title: 'Golden Mite',     body: 'It flees. ×25 essence if you catch it.',        light: 'Quick. It never waits.',          color: '#fbbf24' },
    ESSENCE_TIDE:   { title: 'Essence Tide',    body: 'All essence doubled for 6 s.',                 light: 'Drink while it flows.',           color: '#38bdf8' },
    TREASURE_PYLON: { title: 'Treasure Pylon',  body: 'Break it within 12 s. Essence and a shield.',  light: 'Hoarded light. Take it back.',    color: '#fde047' },
    AMBUSH_RING:    { title: 'Ambush Ring',     body: 'Escape through the green gap.',                light: 'They learned to circle.',          color: '#f43f5e' },
    METEOR_SHOWER:  { title: 'Meteor Shower',   body: 'Dodge. Every 5 clean dodges pay essence.',     light: 'The sky remembers how to fall.',  color: '#f97316' },
};

export const ensureFoundEvents = (state: MutableGameState): FoundEventState => {
    if (!state.foundEvents) {
        state.foundEvents = { lastEndFrame: 0, nextTideFrame: FOUND_EVENTS.tideMinInterval + Math.floor(Math.random() * FOUND_EVENTS.tideJitter), found: [] };
    }
    return state.foundEvents;
};

const caption = (state: MutableGameState, id: FoundEventId) => {
    const l = FOUND_LABEL[id];
    showCard(state, l.title, l.body, l.color, l.light, FOUND_EVENTS.captionFrames);
    const fe = ensureFoundEvents(state);
    if (!fe.found.includes(id)) fe.found.push(id);
};

const begin = (state: MutableGameState, ev: FoundEvent) => {
    ensureFoundEvents(state).active = ev;
    sfx(ev.type === 'AMBUSH_RING' ? 'ambush_ring' : 'event_start', 1, 0); // (6B)
    caption(state, ev.type);
};

const end = (state: MutableGameState) => {
    const fe = ensureFoundEvents(state);
    if (fe.active) sfx('event_end', 0.7, 0); // (6B)
    fe.active = undefined;
    fe.lastEndFrame = state.frame;
    state.foundEventsCount = (state.foundEventsCount ?? 0) + 1; // (8A) lifetime discoveries.events
};

// ---------- Golden Mite (a spawn mutation, not a timed event) ----------
/** SpawnLogic: 4 % from wave 3, max 1 alive, never during a boss. */
export const tryMakeGoldenMite = (state: MutableGameState, wave: number): boolean => {
    if (wave < FOUND_EVENTS.miteMinWave || state.activeBoss || state.worldEventActive) return false;
    for (let i = 0; i < state.enemies.length; i++) if (state.enemies[i].isGoldenMite) return false;
    return Math.random() < FOUND_EVENTS.miteChance;
};

export const applyGoldenMite = (state: MutableGameState, e: Enemy) => {
    e.isGoldenMite = true;
    e.hp = e.maxHp = Math.round(e.maxHp * FOUND_EVENTS.miteHpMult);
    e.color = '#fbbf24';
    e.affixes = undefined; e.shieldHits = undefined;
    e.state.custom = { ...(e.state.custom ?? {}), miteBorn: state.frame };
    caption(state, 'GOLDEN_MITE');
};

/** StandardBehavior: flee from the player; blink away after 6 s. Returns true when it handled movement. */
export const updateGoldenMite = (state: MutableGameState, e: Enemy, idx: number, dx: number, dy: number, dist: number): { moveX: number; moveY: number; moveSpeed: number } | null => {
    if (!e.isGoldenMite) return null;
    const born = e.state.custom?.miteBorn ?? state.frame;
    if (state.frame - born > FOUND_EVENTS.miteTeleportFrames) {
        spawnExplosion(state, e.x, e.y, '#fbbf24', ParticleType.GLOW);
        state.enemies.splice(idx, 1);
        return { moveX: 0, moveY: 0, moveSpeed: 0 };
    }
    if (state.frame % 3 === 0) createParticle(state, e.x, e.y, ParticleType.SPARK, '#fde047', { speed: 0.6, life: 20, size: 2 });
    const t = e.state.timer * 0.08;
    if (dist < FOUND_EVENTS.miteFleeDist) {
        return { moveX: -dx + Math.cos(t) * 60, moveY: -dy + Math.sin(t) * 60, moveSpeed: FOUND_EVENTS.miteFleeSpeed };
    }
    return { moveX: Math.cos(t), moveY: Math.sin(t), moveSpeed: 0.8 };
};

// ---------- Treasure Pylon ----------
const PYLON_DEF: EnemyDef = {
    id: 'treasure_pylon', name: 'Treasure Pylon', description: 'A sealed hoard of light. Break it before it sinks back into the void.',
    baseHp: FOUND_EVENTS.pylonBaseHp, hpScaling: FOUND_EVENTS.pylonWaveHp, baseSpeed: 0, size: 26,
    color: '#fbbf24', glowColor: '#fde047', behavior: 'CHASE', visualType: 'CRYSTAL',
    spawnWeight: 0, minWave: 1, essenceReward: FOUND_EVENTS.pylonEssence, particleEffect: ParticleType.SPARK,
};

const spawnPylon = (state: MutableGameState, wave: number) => {
    const a = Math.random() * Math.PI * 2;
    const px = state.player.x + Math.cos(a) * FOUND_EVENTS.pylonDist, py = state.player.y + Math.sin(a) * FOUND_EVENTS.pylonDist;
    telegraph(state, 'circle', px, py, { radius: 44, color: '#fde047' }, 40, (st) => {
        const e = spawnEnemy(st, wave, undefined, px, py, PYLON_DEF, { noAffix: true });
        e.isTreasurePylon = true; e.speed = 0; e.spawnSpeed = 0; e.isSlowImmune = true;
        VFX.castShockwave(st, px, py, '#fde047');
    });
    begin(state, { type: 'TREASURE_PYLON', timer: FOUND_EVENTS.pylonDuration, max: FOUND_EVENTS.pylonDuration });
};

/** KillLogic: pylon broken in time → essence burst + 1 shield. */
export const onPylonKilled = (state: MutableGameState, e: Enemy) => {
    const fe = ensureFoundEvents(state);
    for (let i = 0; i < 10; i++) { const a = Math.random() * Math.PI * 2, r = 20 + Math.random() * 80; state.drops.push(acquireDrop(e.x + Math.cos(a) * r, e.y + Math.sin(a) * r, 6 + (state.currentWave ?? 1))); }
    state.shieldRequest = (state.shieldRequest ?? 0) + 1;
    shake(state, 5);
    showCard(state, 'Pylon broken', 'Essence spills. +1 shield.', '#fde047', 'Hoarded light, returned.', 120);
    if (fe.active?.type === 'TREASURE_PYLON') end(state);
};

// ---------- Ambush Ring ----------
const startRing = (state: MutableGameState) => {
    const gapAngle = Math.random() * Math.PI * 2;
    const r = FOUND_EVENTS.ringRadius;
    telegraph(state, 'ring', state.player.x, state.player.y, { innerRadius: r - 20, radius: r + 20, gapAngle, gapWidth: FOUND_EVENTS.ringGapRad, color: '#f43f5e' }, FOUND_EVENTS.ringWarnFrames);
    telegraph(state, 'cone', state.player.x, state.player.y, { radius: r + 30, angle: gapAngle, fov: FOUND_EVENTS.ringGapRad, color: '#4ade80' }, FOUND_EVENTS.ringWarnFrames);
    begin(state, { type: 'AMBUSH_RING', timer: FOUND_EVENTS.ringDuration, max: FOUND_EVENTS.ringDuration, gapAngle });
};

const fireRing = (state: MutableGameState, ev: FoundEvent, wave: number, onEnemySeen: (id: string) => void) => {
    const half = FOUND_EVENTS.ringGapRad / 2, n = FOUND_EVENTS.ringCount, gap = ev.gapAngle ?? 0;
    for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2;
        const diff = Math.abs(Math.atan2(Math.sin(a - gap), Math.cos(a - gap)));
        if (diff < half) continue;
        const sx = state.player.x + Math.cos(a) * FOUND_EVENTS.ringRadius, sy = state.player.y + Math.sin(a) * FOUND_EVENTS.ringRadius;
        spawnExplosion(state, sx, sy, '#f43f5e', ParticleType.SMOKE);
        spawnEnemy(state, wave, onEnemySeen, sx, sy);
    }
    shake(state, 4);
};

// ---------- Meteor Shower ----------
const meteorTick = (state: MutableGameState, ev: FoundEvent) => {
    if (ev.timer <= FOUND_EVENTS.meteorWarnFrames || ev.timer % FOUND_EVENTS.meteorEvery !== 0) return;
    const a = Math.random() * Math.PI * 2, d = Math.random() * 260;
    const mx = state.player.x + Math.cos(a) * d, my = state.player.y + Math.sin(a) * d;
    sfxAt(state, 'meteor_warn', mx, my, 0.6); // (6B)
    telegraph(state, 'circle', mx, my, { radius: FOUND_EVENTS.meteorRadius, color: '#f97316' }, FOUND_EVENTS.meteorWarnFrames, (st, t) => {
        VFX.castMeteor(st, mx, my);
        sfxAt(st, 'meteor_hit', mx, my); // (6B)
        spawnExplosion(st, mx, my, '#f97316', ParticleType.FIRE);
        shake(st, 3);
        const hit = telegraphContains(t, st.player.x, st.player.y, st.player.size) && (st.player.dashTimer || 0) <= 0;
        if (hit) {
            const maxHp = st.playerStatsRef?.maxHealth ?? 100;
            st.damagePlayer?.(Math.max(1, Math.round(maxHp * FOUND_EVENTS.meteorDmg)));
        } else {
            ev.dodged = (ev.dodged ?? 0) + 1;
            if (ev.dodged % FOUND_EVENTS.meteorDodgeEvery === 0) {
                st.drops.push(acquireDrop(st.player.x, st.player.y - 30, FOUND_EVENTS.meteorDodgeEssence * Math.max(1, Math.floor((st.currentWave ?? 1) / 5) + 1)));
                createParticle(st, st.player.x, st.player.y - 24, ParticleType.GLOW, '#fbbf24', { vx: 0, vy: -1, life: 35, size: 6 });
            }
        }
    });
};

// ---------- director ----------
/** Per frame from Logic.ts (not during cinematics). */
export const updateFoundEvents = (state: MutableGameState, wave: number, onEnemySeen: (id: string) => void) => {
    const fe = ensureFoundEvents(state);
    const ev = fe.active;

    if (ev) {
        ev.timer--;
        if (ev.type === 'AMBUSH_RING' && !ev.spawnedRing && ev.timer <= ev.max - FOUND_EVENTS.ringWarnFrames) { ev.spawnedRing = true; fireRing(state, ev, wave, onEnemySeen); }
        else if (ev.type === 'METEOR_SHOWER') meteorTick(state, ev);
        else if (ev.type === 'TREASURE_PYLON' && ev.timer <= 1) {
            for (let i = state.enemies.length - 1; i >= 0; i--) {
                if (state.enemies[i].isTreasurePylon) { spawnExplosion(state, state.enemies[i].x, state.enemies[i].y, '#64748b', ParticleType.SMOKE); state.enemies.splice(i, 1); }
            }
            showCard(state, 'Pylon sank', 'It kept its light.', '#94a3b8', undefined, 90);
        } else if (ev.type === 'ESSENCE_TIDE' && state.frame % 4 === 0) {
            const a = Math.random() * Math.PI * 2, r = 40 + Math.random() * 200;
            createParticle(state, state.player.x + Math.cos(a) * r, state.player.y + Math.sin(a) * r, ParticleType.GLOW, '#38bdf8', { speed: 0.3, life: 30, size: 2 });
        }
        if (ev.timer <= 0) end(state);
        return;
    }

    // never during bosses, placed world events, wave 1, or the first 20 s
    if (state.activeBoss || state.worldEventActive || wave < 2 || state.frame < FOUND_EVENTS.firstEventFrame) return;
    const calm = state.frame - fe.lastEndFrame;
    if (calm < FOUND_EVENTS.minCooldownFrames) return;

    if (state.frame >= fe.nextTideFrame) {
        fe.nextTideFrame = state.frame + FOUND_EVENTS.tideMinInterval + Math.floor(Math.random() * FOUND_EVENTS.tideJitter);
        begin(state, { type: 'ESSENCE_TIDE', timer: FOUND_EVENTS.tideDuration, max: FOUND_EVENTS.tideDuration });
        VFX.castShockwave(state, state.player.x, state.player.y, '#38bdf8');
        return;
    }

    if (state.frame % 60 !== 0) return;
    const calmSec = Math.max(0, (calm - FOUND_EVENTS.minCooldownFrames) / 60);
    const prob = Math.min(0.25, 0.02 + calmSec * FOUND_EVENTS.calmRampPerSecond);
    if (Math.random() >= prob) return;
    const roll = Math.random();
    if (roll < 0.34) spawnPylon(state, wave);
    else if (roll < 0.67) startRing(state);
    else begin(state, { type: 'METEOR_SHOWER', timer: FOUND_EVENTS.meteorDuration, max: FOUND_EVENTS.meteorDuration, dodged: 0 });
};

/** KillLogic / DropLogic: ×2 while an Essence Tide runs. */
export const foundEssenceMult = (state: MutableGameState): number => state.foundEvents?.active?.type === 'ESSENCE_TIDE' ? 2 : 1;

export const resetFoundEvents = (state: MutableGameState) => { state.foundEvents = undefined; };
