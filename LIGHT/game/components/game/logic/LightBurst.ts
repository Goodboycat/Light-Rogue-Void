/**
 * (3B step 6) LIGHT BURST — the one manual ability. Tree-unlocked (`burst_unlock`, Utility arc),
 * no in-run choice. A meter fills by kills (+essence pickups); at 100 % the player fires a radial
 * burst: damage BURST_DMG_PER_WAVE × wave (× level), BURST_RADIUS px, BURST_STUN_FRAMES stun.
 * Replaces the fork's "Light Energy / BEAM" overlay. Numbers are tuned in 8B.
 *
 * Fire: Space / KeyE on desktop (Space also dashes — the burst fires first and swallows the dash
 * for that press), or the dedicated touch button (`input.virtualBurst`).
 */
import { MutableGameState, ParticleType } from '../types';
import { PlayerStats } from '../../../types';
import { InputHandler } from '../Input';
import { haptic } from '../../../utils/haptics'; // (7B)
import { onEnemyHit, hitStop, shake } from '../Feel';
import { spawnBigExplosion, screenFlash } from '../BigFx';
import { VFX } from '../Emitters';
import { createParticle } from '../Particles';
import { sfx } from '../../../audio/hooks'; // (6B)
import {
    BURST_RADIUS, BURST_DMG_PER_WAVE, BURST_STUN_FRAMES, BURST_FILL_PER_KILL,
    BURST_FILL_PER_ESSENCE, BURST_LEVEL_DMG_MULT, BURST_LEVEL_FILL_MULT, BURST_KNOCKBACK,
} from '../Constants';

export interface BurstState {
    meter: number;          // 0..1
    level: number;          // playerStats.lightBurstLevel snapshot (0 = locked)
    fired: number;          // bursts fired this run (RunStats / 8A)
    flashFrames: number;    // HUD "ready" pulse
    lastFireFrame: number;
}

const ensure = (state: MutableGameState): BurstState => {
    if (!state.burst) state.burst = { meter: 0, level: 0, fired: 0, flashFrames: 0, lastFireFrame: -999 };
    return state.burst;
};

/** Fill cost multiplier: each tree level makes the meter fill faster. */
export const burstFillMult = (level: number) => 1 + BURST_LEVEL_FILL_MULT * Math.max(0, level - 1);
export const burstDamage = (wave: number, level: number) =>
    Math.round(BURST_DMG_PER_WAVE * Math.max(1, wave) * (1 + BURST_LEVEL_DMG_MULT * Math.max(0, level - 1)));

/** KillLogic hook — every enemy death. */
export const onBurstKill = (state: MutableGameState) => {
    const b = ensure(state);
    if (b.level <= 0) return;
    addMeter(b, BURST_FILL_PER_KILL * burstFillMult(b.level));
};

/** DropLogic hook — essence pickups (raw drop value). */
export const onBurstEssence = (state: MutableGameState, value: number) => {
    const b = ensure(state);
    if (b.level <= 0) return;
    addMeter(b, BURST_FILL_PER_ESSENCE * value * burstFillMult(b.level));
};

const addMeter = (b: BurstState, amt: number) => {
    const was = b.meter;
    b.meter = Math.min(1, b.meter + amt);
    if (was < 1 && b.meter >= 1) { b.flashFrames = 30; sfx('burst_charge', 1, 0); } // (6B)
};

let prevFirePressed = false;

/**
 * Per-frame: sync level, read input, fire when ready. Returns true when a burst fired this
 * frame (PlayerLogic uses it to swallow the Space dash for that press).
 */
export const updateLightBurst = (state: MutableGameState, stats: PlayerStats, input: InputHandler, wave: number): boolean => {
    const b = ensure(state);
    b.level = stats.lightBurstLevel ?? 0;
    if (b.flashFrames > 0) b.flashFrames--;
    if (b.level <= 0) { b.meter = 0; return false; }

    const pressed = !!(input.keys['Space'] || input.keys['KeyE'] || input.virtualBurst);
    const edge = pressed && !prevFirePressed;
    prevFirePressed = pressed;
    if (!edge || b.meter < 1) return false;
    if (state.activeBoss?.state.custom?.cinematicMode) return false;

    fireLightBurst(state, wave);
    return true;
};

export const fireLightBurst = (state: MutableGameState, wave: number) => {
    const b = ensure(state);
    const px = state.player.x, py = state.player.y;
    const dmg = burstDamage(wave, b.level);
    b.meter = 0;
    b.fired++;
    sfx('burst_fire', 1, 0); // (6B)
    b.lastFireFrame = state.frame;

    // VFX: big white/gold shockwave + flash + shake + hit-stop
    spawnBigExplosion(state, px, py, { radius: BURST_RADIUS * 0.6, color: '#fff7d6', color2: '#fbbf24', rings: 3, ringSpeed: BURST_RADIUS / 20, life: 50 });
    screenFlash(state, 0.55, '#fff7d6');
    shake(state, 10);
    hitStop(state, 4);
    haptic('burst'); // (7B)
    for (let i = 0; i < 24; i++) {
        const a = (i / 24) * Math.PI * 2;
        createParticle(state, px + Math.cos(a) * 20, py + Math.sin(a) * 20, ParticleType.GLOW, '#fde68a', { speed: 10 + Math.random() * 6, life: 26, size: 3 });
    }

    // Damage + stun + knockback in BURST_RADIUS
    for (let i = state.enemies.length - 1; i >= 0; i--) {
        const e = state.enemies[i];
        const d = Math.hypot(e.x - px, e.y - py);
        if (d > BURST_RADIUS + e.size) continue;
        const dealt = e.isBoss ? Math.round(dmg * 0.5) : dmg; // bosses: half damage, no stun (2B fairness)
        e.hp -= dealt;
        onEnemyHit(state, e, dealt);
        VFX.spark(state, e.x, e.y, '#fde68a', 4);
        if (!e.isBoss) {
            e.frozenTimer = Math.max(e.frozenTimer ?? 0, BURST_STUN_FRAMES);
            if (e.def.behavior !== 'TANK' && d > 1) {
                e.vx += ((e.x - px) / d) * BURST_KNOCKBACK;
                e.vy += ((e.y - py) / d) * BURST_KNOCKBACK;
            }
        }
    }
};

export const resetLightBurst = (state: MutableGameState) => {
    state.burst = { meter: 0, level: 0, fired: 0, flashFrames: 0, lastFireFrame: -999 };
    prevFirePressed = false;
};
