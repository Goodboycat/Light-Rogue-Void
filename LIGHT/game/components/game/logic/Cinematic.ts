/**
 * (7D) Storyline cinematic player — camera / actors / fx over the live arena.
 *
 * `startCinematic(state, cine, opts)` puts a `CinematicState` on `state.cinematic`.
 * SurvivalGame's loop then calls `updateCinematic(state, now, w, h)` every frame
 * INSTEAD of `updateGame` while `state.cinematic && !noFreeze` (same freeze pattern as
 * the 7C breather: the sim never advances, particles / shake / flash still decay so
 * the picture keeps breathing). The renderer reads `state.camera` (top-left, as always)
 * and `state.cinematicZoom` (scale about the screen centre, see Renderer.ts).
 *
 * Lines are NOT driven here — `components/StoryCinematicOverlay.tsx` shows them with
 * StoryCaption (shorter hold). The cinematic ends when BOTH the shot list and the
 * estimated line time are over, or on skip (`skipCinematic`, allowed after SKIP_AFTER_MS).
 * `reduceFlash` (Feel settings) drops flash/shake only — `screenFlash` / `shake` already
 * honour it, so nothing special is needed here.
 */
import { MutableGameState, ParticleType } from '../types';
import { Shot, StoryCinematic, StoryBeatRef, OUTRO_SCRIPT } from '../../../data/cinematics';
import { STORY, StoryLine } from '../../../data/story';
import { STORY_CAPTION_CPS } from '../Constants';
import { shake } from '../Feel';
import { screenFlash } from '../BigFx';
import { createParticle } from '../Particles';

export const CINEMATIC_SKIP_AFTER_MS = 1000;
/** Caption hold used during cinematics (shorter than the free-running 4 s). */
export const CINEMATIC_LINE_HOLD_MS = 2200;

interface Cam { x: number; y: number; zoom: number }

export interface CinematicState {
    id: string;
    shots: Shot[];
    noFreeze: boolean;
    startMs: number;
    shotIdx: number;
    shotStartMs: number;
    from: Cam;          // camera centre at the start of the current shot
    to: Cam;            // camera centre target of the current shot
    cam: Cam;           // current camera centre
    originX: number;    // player position at start — explicit shot offsets are relative to it
    originY: number;
    bossX: number;      // live boss, or recorded death spot, or the player
    bossY: number;
    linesMs: number;    // estimated caption time
    totalMs: number;    // max(shots, lines)
    skipRequested: boolean;
    onEnd?: () => void;
}

const easeInOut = (t: number) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

/** Lines for a cinematic: story beat → data/story.ts; 'ending' → OUTRO_SCRIPT as StoryLines. */
export const resolveCinematicLines = (ref: StoryBeatRef): StoryLine[] => {
    if (ref === 'ending') return OUTRO_SCRIPT.map(l => ({ voice: l.speaker, text: l.text }));
    const s = STORY.find(c => c.chapter === ref.chapter);
    return s ? s[ref.beat] : [];
};

export const linesDurationMs = (lines: StoryLine[], holdMs = CINEMATIC_LINE_HOLD_MS): number =>
    lines.reduce((t, l) => t + (l.text.length / STORY_CAPTION_CPS) * 1000 + holdMs, 0);

const shotLengthMs = (shots: Shot[]) => shots.reduce((t, s) => t + (s.ms ?? 0) + s.holdMs, 0);

const bossPos = (state: MutableGameState, c: Pick<CinematicState, 'bossX' | 'bossY'>): [number, number] => {
    const b = state.activeBoss;
    return b ? [b.x, b.y] : [c.bossX, c.bossY];
};

const resolveTarget = (state: MutableGameState, c: CinematicState, shot: Shot): Cam => {
    const zoom = shot.zoom ?? (typeof shot.camera === 'object' ? shot.camera.zoom ?? 1 : 1);
    if (shot.camera === 'player') return { x: state.player.x, y: state.player.y, zoom };
    if (shot.camera === 'boss') { const [bx, by] = bossPos(state, c); return { x: bx, y: by, zoom }; }
    return { x: c.originX + shot.camera.x, y: c.originY + shot.camera.y, zoom };
};

const fireFx = (state: MutableGameState, shot: Shot, at: Cam) => {
    switch (shot.fx) {
        case 'flash': screenFlash(state, 0.85); break;
        case 'shake': shake(state, 14, 12); break;
        case 'fogburn':
            for (let i = 0; i < 3; i++) createParticle(state, at.x, at.y, ParticleType.RING, '#cbd5e1', { life: 50 + i * 14, size: 40 + i * 30, speed: 0, alpha: 0.5 - i * 0.12 });
            for (let i = 0; i < 24; i++) createParticle(state, at.x, at.y, ParticleType.SMOKE, '#64748b', { life: 60, size: 30 + Math.random() * 40, speed: 2 + Math.random() * 3, alpha: 0.35, shrink: 0.98 });
            break;
        case 'bloom':
            createParticle(state, at.x, at.y, ParticleType.GLOW, '#ffffff', { life: 70, size: 220, speed: 0, alpha: 0.35 });
            createParticle(state, at.x, at.y, ParticleType.GLOW, '#fde68a', { life: 90, size: 120, speed: 0, alpha: 0.5 });
            break;
    }
};

const actorPresence = (state: MutableGameState, c: CinematicState, shot: Shot) => {
    if (!shot.actors) return;
    const f = state.frame;
    for (const a of shot.actors) {
        if (a === 'spark' && f % 4 === 0) {
            createParticle(state, state.player.x, state.player.y, ParticleType.GLOW, '#fde68a', { life: 30, size: 16 + Math.random() * 10, speed: 0.4, alpha: 0.45 });
        } else if (a === 'boss' && f % 3 === 0) {
            const [bx, by] = bossPos(state, c);
            const col = state.activeBoss?.def.glowColor ?? '#a78bfa';
            createParticle(state, bx + (Math.random() - 0.5) * 80, by + (Math.random() - 0.5) * 80, ParticleType.GLOW, col, { life: 40, size: 20 + Math.random() * 20, speed: 0.6, alpha: 0.4 });
        } else if (a === 'lights' && f % 2 === 0) {
            createParticle(state, c.cam.x + (Math.random() - 0.5) * 900, c.cam.y + (Math.random() - 0.5) * 600, ParticleType.SPARK, '#e2e8f0', { life: 80, size: 1.5 + Math.random() * 2, speed: 0.3 + Math.random() * 0.5, alpha: 0.7, gravity: -0.01 });
        }
    }
};

export interface StartOpts {
    onEnd?: () => void;
    /** Where the boss was (outros: the boss is already gone). Defaults to the live boss or the player. */
    bossPos?: { x: number; y: number };
    /** Override the estimated caption time (0 = shots only). */
    linesMs?: number;
}

export const startCinematic = (state: MutableGameState, cine: StoryCinematic, opts: StartOpts = {}, nowMs = performance.now()) => {
    const b = state.activeBoss;
    const bx = opts.bossPos?.x ?? b?.x ?? state.player.x;
    const by = opts.bossPos?.y ?? b?.y ?? state.player.y;
    const cam: Cam = { x: state.player.x, y: state.player.y, zoom: state.cinematicZoom ?? 1 };
    const linesMs = opts.linesMs ?? (cine.noFreeze ? 0 : linesDurationMs(resolveCinematicLines(cine.lines)));
    const c: CinematicState = {
        id: cine.id, shots: cine.shots, noFreeze: !!cine.noFreeze, startMs: nowMs, shotIdx: -1, shotStartMs: nowMs,
        from: cam, to: cam, cam: { ...cam }, originX: state.player.x, originY: state.player.y, bossX: bx, bossY: by,
        linesMs, totalMs: Math.max(shotLengthMs(cine.shots), linesMs), skipRequested: false, onEnd: opts.onEnd,
    };
    state.cinematic = c;
    beginShot(state, c, 0, nowMs);
};

const beginShot = (state: MutableGameState, c: CinematicState, idx: number, nowMs: number) => {
    c.shotIdx = idx; c.shotStartMs = nowMs;
    c.from = { ...c.cam };
    const shot = c.shots[idx];
    if (!shot) return;
    c.to = resolveTarget(state, c, shot);
    fireFx(state, shot, c.to);
};

/** One press skips once SKIP_AFTER_MS have passed. Returns true when the skip was accepted. */
export const skipCinematic = (state: MutableGameState, nowMs = performance.now()): boolean => {
    const c = state.cinematic; if (!c) return false;
    if (nowMs - c.startMs < CINEMATIC_SKIP_AFTER_MS) return false;
    c.skipRequested = true; return true;
};

export const isCinematicSkippable = (state: MutableGameState, nowMs = performance.now()) =>
    !!state.cinematic && nowMs - state.cinematic.startMs >= CINEMATIC_SKIP_AFTER_MS;

/** Frozen sim? (false for noFreeze push-ins and when nothing plays) */
export const cinematicFreezes = (state: MutableGameState) => !!state.cinematic && !state.cinematic.noFreeze;

/**
 * Advance the cinematic. Returns true while one is playing. Writes `state.camera`
 * (top-left) unless `noFreeze` (the live camera follows the player; only zoom is driven)
 * and `state.cinematicZoom`. When nothing plays the zoom eases back to 1.
 */
export const updateCinematic = (state: MutableGameState, nowMs: number, canvasW: number, canvasH: number): boolean => {
    const c = state.cinematic;
    if (!c) {
        const z = state.cinematicZoom ?? 1;
        if (Math.abs(z - 1) > 0.002) state.cinematicZoom = z + (1 - z) * 0.12; else if (state.cinematicZoom !== undefined) state.cinematicZoom = 1;
        return false;
    }
    const shot = c.shots[c.shotIdx];
    const elapsed = nowMs - c.startMs;
    if (c.skipRequested || (!shot && elapsed >= c.totalMs)) {
        const onEnd = c.onEnd;
        state.cinematic = undefined;
        onEnd?.();
        return false;
    }
    if (shot) {
        const travel = shot.ms ?? 0;
        const t = travel > 0 ? clamp01((nowMs - c.shotStartMs) / travel) : 1;
        const e = easeInOut(t);
        // live targets keep tracking (boss may drift during an intro)
        if (shot.camera !== 'player' || !c.noFreeze) c.to = { ...resolveTarget(state, c, shot), zoom: c.to.zoom };
        c.cam = { x: c.from.x + (c.to.x - c.from.x) * e, y: c.from.y + (c.to.y - c.from.y) * e, zoom: c.from.zoom + (c.to.zoom - c.from.zoom) * e };
        actorPresence(state, c, shot);
        if (nowMs - c.shotStartMs >= travel + shot.holdMs) beginShot(state, c, c.shotIdx + 1, nowMs);
    } else {
        // shots done, lines still running: hold on the spark, ease zoom toward 1.15
        c.cam = { x: c.cam.x + (state.player.x - c.cam.x) * 0.05, y: c.cam.y + (state.player.y - c.cam.y) * 0.05, zoom: c.cam.zoom + (1.15 - c.cam.zoom) * 0.03 };
    }
    state.cinematicZoom = c.cam.zoom;
    if (!c.noFreeze) {
        state.camera.x = c.cam.x - canvasW / 2;
        state.camera.y = c.cam.y - canvasH / 2;
    }
    return true;
};
