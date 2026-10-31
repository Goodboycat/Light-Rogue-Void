// (M5) THE DARKNESS INTERRUPT — scheduler + the six gameplay threats that follow the `interrupt_<n>` films.
//
// Contract (MOVIE.md §3 M5, SUGGESTIONS §2, docs/CINEMATIC.md):
//   1. `updateDarknessInterrupt` runs every sim frame (Logic.ts, non-cinematic block). About 60 s into a run and then
//      every ~3 waves (never on a boss wave, never while a boss is alive) it sets `state.interruptRequest = n` (1..6).
//   2. SurvivalGame sees the request after `updateGame`, clears it, and plays the film `interrupt_<n>` through the
//      M1 pause/hide/resume contract (`setFilm`). While the film plays the sim does not tick.
//   3. `handleFilmDone` runs `spawnInterruptThreat(state, n)` as the one-shot continuation (filmOnDoneRef) — the HARD
//      CUT back to gameplay lands with the threat already telegraphed, named (world card), shaking, `boss_arrive`.
//   4. Every threat is survivable only by READING it. None is survivable by a blind dash — several punish it.
//
// Threats (all drawn by the existing telegraph pool — renderer/TelegraphRenderer.ts — no new renderer code):
//   1 THE GAZE     line telegraph through the spark that TRACKS it for 1.2 s, LOCKS 0.5 s, fires. Step out of the line.
//   2 THE PALM     circle shadow r 320 that leads the spark's facing by 360 px for 1 s, slams. A blind dash forward
//                  runs INTO it; standing still (or stepping back) leaves you just outside the edge.
//   3 THE JAW      ring r 520 centred where you stood; its inner edge closes 400 → 140 over 1.4 s. Stay in the middle;
//                  dashing outward puts you in the teeth.
//   4 THE WATCH    a wall (two line telegraphs with ONE gap w 180) stands 0.8 s then sweeps 1.6 s across the arena at
//                  19 px/f — faster than any run. Walk to the gap; outrunning fails.
//   5 THE ECHO     a black copy replays your last 1.5 s of movement toward where you stood; r 260 detonates there.
//                  Leave where you were.
//   6 THE SILENCE  the arena goes dark (state.eclipse); one lit disc r 240 drifts away for 2.5 s; outside the light
//                  you take ticks. Follow the light.
//
// Damage goes through state.damagePlayer (i-frames via onPlayerHurt). Hits are `INTERRUPT_DMG` of max HP, min 20.

import { MutableGameState, ParticleType } from '../types';
import { telegraph, telegraphContains, Telegraph } from './enemies/BossKit';
import { isBossWave, isEndlessWave } from '../Constants';
import { spawnExplosion } from '../Particles';
import { shake } from '../Feel';
import { showCard } from './WorldInteract';
import { sfx, sfxAt } from '../../../audio/hooks';

export const INTERRUPT_COUNT = 6;
const FIRST_AT_FRAMES = 60 * 60;      // ~60 s into the run
const EVERY_WAVES = 3;                // then every ~3 waves
const INTO_WAVE_FRAMES = 15 * 60;     // ...15 s into that wave
const RETRY_FRAMES = 10 * 60;         // blocked (boss wave / boss alive) → look again in 10 s
const INTERRUPT_DMG = 0.4;            // fraction of max HP per hit
const ECHO_FRAMES = 90;               // 1.5 s of movement remembered
const VIOLET = '#a78bfa', PALE = '#c4b5fd', AMBER = '#fde68a', INK = '#1a0b2e';

export const THREATS: Record<number, { name: string; read: string }> = {
    1: { name: 'THE GAZE', read: 'STEP OUT OF ITS LINE' },
    2: { name: 'THE PALM', read: 'STAND STILL AT ITS EDGE' },
    3: { name: 'THE JAW', read: 'STAY IN THE MIDDLE' },
    4: { name: 'THE WATCH', read: 'WALK TO THE GAP' },
    5: { name: 'THE ECHO', read: 'LEAVE WHERE YOU WERE' },
    6: { name: 'THE SILENCE', read: 'FOLLOW THE LIGHT' },
};

export interface InterruptState {
    nextAt?: number;        // state.frame at which the next request fires (undefined = not armed)
    armWave?: number;       // wave at which to arm the next one
    fired: number;          // how many have fired this run
    lastIdx: number;        // last scene index (never repeat back-to-back)
    forced?: number;        // ?interrupt=<n> (DEBUG) — fire this one ASAP, once
    echo: Float32Array;     // ring buffer of (x,y) pairs, ECHO_FRAMES long
    echoHead: number;
    faceX: number; faceY: number; // last non-zero movement direction
    active?: ActiveThreat;
}

interface ActiveThreat {
    idx: number;
    frame: number;           // frames since spawn
    tele: Telegraph[];       // pool entries we steer (may have fired already → inactive)
    ox: number; oy: number;  // origin (spark position at spawn)
    dx: number; dy: number;  // a direction (wall sweep, light drift)
    gapY?: number;
    echoPath?: Float32Array; // THE ECHO: frozen copy of the ring buffer, oldest first
    done: boolean;
}

const ensure = (state: MutableGameState): InterruptState => {
    let it = state.interrupt;
    if (!it) {
        it = state.interrupt = { fired: 0, lastIdx: 0, echo: new Float32Array(ECHO_FRAMES * 2), echoHead: 0, faceX: 1, faceY: 0, nextAt: FIRST_AT_FRAMES };
        for (let i = 0; i < ECHO_FRAMES; i++) { it.echo[i * 2] = state.player.x; it.echo[i * 2 + 1] = state.player.y; }
        if (typeof window !== 'undefined') {
            const q = new URLSearchParams(window.location.search).get('interrupt');
            const n = q ? parseInt(q, 10) : 0;
            if (n >= 1 && n <= INTERRUPT_COUNT) { it.forced = n; it.nextAt = state.frame + 90; }
        }
    }
    return it;
};

const hit = (state: MutableGameState, maxHp: number, x: number, y: number) => {
    state.damagePlayer?.(Math.max(20, Math.round(maxHp * INTERRUPT_DMG)));
    spawnExplosion(state, x, y, VIOLET, ParticleType.SMOKE);
    shake(state, 14, 10);
};

/** Per frame (Logic.ts). Records the echo path, runs the scheduler and steers the live threat. */
export const updateDarknessInterrupt = (state: MutableGameState, wave: number, maxHp: number) => {
    const it = ensure(state);
    lastMaxHp = maxHp;
    const p = state.player;
    // echo ring buffer + facing (cheap: two writes a frame)
    it.echo[it.echoHead * 2] = p.x; it.echo[it.echoHead * 2 + 1] = p.y; it.echoHead = (it.echoHead + 1) % ECHO_FRAMES;
    const sp = Math.hypot(p.vx, p.vy);
    if (sp > 0.5) { it.faceX = p.vx / sp; it.faceY = p.vy / sp; }

    if (it.active) { steer(state, it, it.active, maxHp); if (it.active.done) it.active = undefined; return; }
    if (state.interruptRequest) return; // waiting for SurvivalGame to pick it up

    // arm: EVERY_WAVES after the last one, INTO_WAVE_FRAMES into that wave
    if (it.nextAt === undefined && it.armWave !== undefined && wave >= it.armWave) { it.nextAt = state.frame + INTO_WAVE_FRAMES; it.armWave = undefined; }
    if (it.nextAt === undefined || state.frame < it.nextAt) return;
    if (state.activeBoss || isBossWave(wave) || isEndlessWave(wave) || state.bossArrival) { it.nextAt = state.frame + RETRY_FRAMES; return; }
    // pick a scene: forced, else random but never the same twice in a row
    let n = it.forced ?? 1 + Math.floor(Math.random() * INTERRUPT_COUNT);
    if (!it.forced && n === it.lastIdx) n = 1 + (n % INTERRUPT_COUNT);
    it.forced = undefined; it.lastIdx = n; it.fired++;
    it.nextAt = undefined; it.armWave = wave + EVERY_WAVES;
    state.interruptRequest = n;
};

/** The HARD CUT: called by SurvivalGame the frame the `interrupt_<n>` film ends. Spawns threat `n` around the spark. */
export const spawnInterruptThreat = (state: MutableGameState, n: number) => {
    const it = ensure(state);
    const p = state.player;
    const th = THREATS[n] ?? THREATS[1];
    const a: ActiveThreat = { idx: n, frame: 0, tele: [], ox: p.x, oy: p.y, dx: 1, dy: 0, done: false };
    it.active = a;
    showCard(state, th.name, th.read, VIOLET, undefined, 150);
    sfx('boss_arrive', 1, 0.02); shake(state, 22, 18);
    state.screenFlash = 0.9; state.screenFlashColor = VIOLET;
    switch (n) {
        case 1: { // THE GAZE — tracks 72 f, locks 30 f, fires
            const ang = Math.atan2(it.faceY, it.faceX);
            a.tele.push(telegraph(state, 'line', p.x - Math.cos(ang) * 1400, p.y - Math.sin(ang) * 1400, { angle: ang, length: 2800, width: 150, color: VIOLET }, 102,
                (st, t) => { if (telegraphContains(t, st.player.x, st.player.y, 6)) hit(st, lastMaxHp, st.player.x, st.player.y); sfxAt(st, 'cin_cut', t.x, t.y); }));
            break;
        }
        case 2: { // THE PALM — leads facing by 360 for 60 f
            a.tele.push(telegraph(state, 'circle', p.x + it.faceX * 360, p.y + it.faceY * 360, { radius: 320, color: INK }, 60,
                (st, t) => { if (telegraphContains(t, st.player.x, st.player.y, 4)) hit(st, lastMaxHp, t.x, t.y); shake(st, 18, 12); sfxAt(st, 'cin_cut', t.x, t.y); }));
            break;
        }
        case 3: { // THE JAW — ring closes inward 400 → 140 over 84 f
            a.tele.push(telegraph(state, 'ring', p.x, p.y, { radius: 520, innerRadius: 400, color: VIOLET }, 84,
                (st, t) => { if (telegraphContains(t, st.player.x, st.player.y, 4)) hit(st, lastMaxHp, st.player.x, st.player.y); sfxAt(st, 'cin_cut', t.x, t.y); }));
            break;
        }
        case 4: { // THE WATCH — two vertical line segments with a gap; stand 48 f, sweep 96 f
            a.dx = it.faceX >= 0 ? 1 : -1;                   // sweep in the direction you were going
            const wx = p.x - a.dx * 760;
            a.gapY = p.y + (Math.random() < 0.5 ? -1 : 1) * (260 + Math.random() * 120);
            const half = 90, L = 1500;
            a.tele.push(telegraph(state, 'line', wx, a.gapY - half - L, { angle: Math.PI / 2, length: L, width: 160, color: VIOLET }, 144));
            a.tele.push(telegraph(state, 'line', wx, a.gapY + half, { angle: Math.PI / 2, length: L, width: 160, color: VIOLET }, 144));
            break;
        }
        case 5: { // THE ECHO — copy of the ring buffer, oldest first; detonation where you stand now
            const path = new Float32Array(ECHO_FRAMES * 2);
            for (let i = 0; i < ECHO_FRAMES; i++) { const j = (it.echoHead + i) % ECHO_FRAMES; path[i * 2] = it.echo[j * 2]; path[i * 2 + 1] = it.echo[j * 2 + 1]; }
            a.echoPath = path;
            a.tele.push(telegraph(state, 'circle', p.x, p.y, { radius: 260, color: VIOLET }, ECHO_FRAMES,
                (st, t) => { if (telegraphContains(t, st.player.x, st.player.y, 4)) hit(st, lastMaxHp, t.x, t.y); sfxAt(st, 'cin_cut', t.x, t.y); }));
            a.tele.push(telegraph(state, 'circle', path[0], path[1], { radius: 34, color: PALE }, ECHO_FRAMES)); // the copy
            break;
        }
        case 6: { // THE SILENCE — eclipse on; the light drifts away
            const ang = Math.random() * Math.PI * 2; a.dx = Math.cos(ang) * 2.4; a.dy = Math.sin(ang) * 2.4;
            state.eclipse = 1; state.eclipseColor = '#05030a';
            a.tele.push(telegraph(state, 'circle', p.x, p.y, { radius: 240, color: AMBER }, 150));
            sfx('cin_silence_drop', 1, 0);
            break;
        }
    }
};

let lastMaxHp = 100; // refreshed every frame by updateDarknessInterrupt(); onFire closures read it (they have no playerStats)

const steer = (state: MutableGameState, it: InterruptState, a: ActiveThreat, maxHp: number) => {
    a.frame++;
    const p = state.player;
    const t0 = a.tele[0];
    switch (a.idx) {
        case 1: // track the spark until the lock (last 30 f)
            if (t0.active && t0.timer > 30) {
                const ang = Math.atan2(p.y - a.oy, p.x - a.ox);
                const have = Math.hypot(p.y - a.oy, p.x - a.ox) > 2 ? ang : (t0.params.angle ?? 0);
                t0.params.angle = have; t0.x = a.ox - Math.cos(have) * 1400; t0.y = a.oy - Math.sin(have) * 1400;
                // the line always passes through the ORIGIN and the spark — move the origin slowly so it keeps hunting
                a.ox += (p.x - a.ox) * 0.04; a.oy += (p.y - a.oy) * 0.04;
            }
            if (!t0.active) a.done = true;
            break;
        case 2: // shadow leads the facing; freezes the last 12 f so the read is honest
            if (t0.active && t0.timer > 12) { t0.x += (p.x + it.faceX * 360 - t0.x) * 0.25; t0.y += (p.y + it.faceY * 360 - t0.y) * 0.25; }
            if (!t0.active) a.done = true;
            break;
        case 3: // inner edge closes
            if (t0.active) t0.params.innerRadius = 400 - 260 * (1 - t0.timer / t0.maxTimer);
            else a.done = true;
            break;
        case 4: { // stand 48 f, then sweep 96 f; contact damage through the wall, not through the gap
            if (a.frame > 48) {
                const x = a.ox - a.dx * 760 + a.dx * 19 * (a.frame - 48);
                for (const t of a.tele) t.x = x;
                if (Math.abs(p.x - x) < 80 + 6 && a.gapY !== undefined && Math.abs(p.y - a.gapY) > 90 - 6) {
                    if ((state.playerIFrames ?? 0) <= 0) hit(state, maxHp, p.x, p.y);
                }
            }
            if (!a.tele[0].active) a.done = true;
            break;
        }
        case 5: { // the copy walks the recorded path
            const path = a.echoPath!; const body = a.tele[1];
            const i = Math.min(ECHO_FRAMES - 1, a.frame);
            if (body.active) { body.x = path[i * 2]; body.y = path[i * 2 + 1]; }
            if (!t0.active) { body.active = false; a.done = true; }
            break;
        }
        case 6: { // the light drifts; outside it hurts every 20 f; eclipse decays with the disc
            if (t0.active) {
                t0.x += a.dx; t0.y += a.dy;
                state.eclipse = Math.max(0, t0.timer / t0.maxTimer);
                if (a.frame > 24 && a.frame % 20 === 0 && !telegraphContains(t0, p.x, p.y, 8)) hit(state, maxHp, p.x, p.y);
            } else { state.eclipse = 0; a.done = true; }
            break;
        }
    }
};

/** Run end / restart safety: drop the live threat and the blackout. */
export const clearInterrupt = (state: MutableGameState) => {
    const a = state.interrupt?.active;
    if (a) { for (const t of a.tele) { t.active = false; t.onFire = undefined; } if (a.idx === 6) state.eclipse = 0; }
    if (state.interrupt) state.interrupt.active = undefined;
    state.interruptRequest = undefined;
};
