// (4B) Special waves at every x5 non-boss wave. Ported from the fork's waveFlavors.ts
// (pools kept) — mercy multipliers, translations and audio dropped; ELITE RUSH now rides the
// Director (Logic.ts passes `{ elite: true }` so every pack is elite) instead of its own spawner.
// Rules (docs/ENEMIES.md):
//  ELITE RUSH  — every pack is elite (affixes forced), elites already pay ×1.6 essence.
//  GAUNTLET    — a wall of enemies on one side every 8 s, two glowing gaps telegraphed 1.5 s ahead.
//  CURSE       — kills leave a 4 s dark mark (1 dmg/s inside). Take none all wave → ×1.1 essence from then on.
//  AEGIS TRIAL — 4 of 5 enemies shielded (immune); killing a glowing Shiner breaks shields within 200 px for 3 s.
import { MutableGameState, Enemy } from './types';
import { spawnEnemy } from './logic/enemies/SpawnLogic';
import { telegraph } from './logic/enemies/BossKit';
import { spawnExplosion } from './Particles';
import { ParticleType } from './types';

export type WaveFlavorId = 'ELITE_RUSH' | 'GAUNTLET' | 'CURSE' | 'AEGIS_TRIAL';

export interface WaveFlavorDef { id: WaveFlavorId; banner: string; caption: string; color: string }

export const WAVE_FLAVOR_CONFIG = {
    bannerFrames: 240,             // 4 s banner + caption
    gauntletIntervalFrames: 480,   // new wall every 8 s
    gauntletWallCount: 9,
    gauntletGapWidth: 140,
    gauntletSpawnDist: 560,
    gauntletWarnFrames: 90,        // 1.5 s lane telegraph, enemies land at 45
    curseMaxMarks: 20,
    curseDurationFrames: 240,      // 4 s
    curseRadius: 55,
    curseCleanEssenceBonus: 0.10,  // +10 % essence once the wave is survived clean
    aegisShinerRatio: 5,           // 1 in 5 enemies shines
    aegisBreakRadius: 200,
    aegisBreakDurationFrames: 180, // 3 s
};

const FLAVORS: Record<WaveFlavorId, WaveFlavorDef> = {
    ELITE_RUSH:  { id: 'ELITE_RUSH',  banner: 'ELITE RUSH',  caption: 'Every pack is elite. They pay ×1.6 essence — if you live.', color: '#fbbf24' },
    GAUNTLET:    { id: 'GAUNTLET',    banner: 'GAUNTLET',    caption: 'Walls close in every 8 s. Slip through the green lanes.', color: '#4ade80' },
    CURSE:       { id: 'CURSE',       banner: 'CURSE',       caption: 'The fallen leave dark marks for 4 s. Touch none for +10 % essence.', color: '#a855f7' },
    AEGIS_TRIAL: { id: 'AEGIS_TRIAL', banner: 'AEGIS TRIAL', caption: 'Foes are shielded. Kill the glowing Shiners to shatter shields nearby.', color: '#c084fc' },
};

/** x5 waves that are not boss waves (x10). Repeats the 4 flavors across the 60-wave campaign. */
export const WAVE_FLAVORS_BY_WAVE: Record<number, WaveFlavorDef> = {
    5: FLAVORS.ELITE_RUSH, 15: FLAVORS.GAUNTLET, 25: FLAVORS.CURSE, 35: FLAVORS.AEGIS_TRIAL,
    45: FLAVORS.ELITE_RUSH, 55: FLAVORS.GAUNTLET,
};

/** Endless (9A) and `?wave=` beyond 60: every x5 non-x10 wave cycles the four flavors. */
export const waveFlavor = (wave: number): WaveFlavorDef | undefined => {
    if (WAVE_FLAVORS_BY_WAVE[wave]) return WAVE_FLAVORS_BY_WAVE[wave];
    if (wave > 60 && wave % 5 === 0 && wave % 10 !== 0) {
        const order: WaveFlavorId[] = ['ELITE_RUSH', 'GAUNTLET', 'CURSE', 'AEGIS_TRIAL'];
        return FLAVORS[order[Math.floor(wave / 10) % 4]];
    }
    return undefined;
};

export interface CurseMark { active: boolean; x: number; y: number; timer: number; maxTimer: number; dmgTick: number }

const ensureMarks = (state: MutableGameState) => {
    if (!state.curseMarks) state.curseMarks = Array.from({ length: WAVE_FLAVOR_CONFIG.curseMaxMarks }, () =>
        ({ active: false, x: 0, y: 0, timer: 0, maxTimer: WAVE_FLAVOR_CONFIG.curseDurationFrames, dmgTick: 0 }));
    return state.curseMarks;
};

const spawnCurseMark = (state: MutableGameState, x: number, y: number) => {
    const pool = ensureMarks(state);
    let m = pool.find(p => !p.active) ?? pool.reduce((a, b) => (b.timer < a.timer ? b : a), pool[0]);
    m.active = true; m.x = x; m.y = y;
    m.timer = m.maxTimer = WAVE_FLAVOR_CONFIG.curseDurationFrames; m.dmgTick = 30;
};

/** Wave start (SurvivalGame.advanceWave + run start). Clears the previous flavor's state, arms the new one. */
export const startWaveFlavor = (state: MutableGameState, wave: number) => {
    // settle the previous wave
    if (state.flavor === 'CURSE' && !state.curseDamagedInWave) state.flavorEssenceMult = 1 + WAVE_FLAVOR_CONFIG.curseCleanEssenceBonus;
    if (state.flavor === 'AEGIS_TRIAL') for (const e of state.enemies) { e.aegisShielded = false; e.isShiner = false; e.aegisBrokenTimer = undefined; }
    state.curseMarks?.forEach(m => { m.active = false; });
    state.curseDamagedInWave = false;
    state.gauntletTimer = undefined;
    state.aegisCounter = 0;

    const def = waveFlavor(wave);
    state.flavor = def?.id;
    if (!def) { state.flavorBanner = undefined; return; }
    state.flavorBanner = { banner: def.banner, caption: def.caption, color: def.color, frames: WAVE_FLAVOR_CONFIG.bannerFrames, max: WAVE_FLAVOR_CONFIG.bannerFrames };
    if (def.id === 'GAUNTLET') state.gauntletTimer = 150; // first wall 2.5 s in
};

const gauntletWall = (state: MutableGameState, wave: number, onEnemySeen: (id: string) => void) => {
    const C = WAVE_FLAVOR_CONFIG;
    const side = Math.floor(Math.random() * 4);
    const dist = C.gauntletSpawnDist, span = 840, count = C.gauntletWallCount;
    const gap1 = 1 + Math.floor(Math.random() * (count - 2));
    const gap2 = (gap1 + 3) % (count - 1);
    const px = state.player.x, py = state.player.y;
    for (let i = 0; i < count; i++) {
        const off = -span / 2 + (i / (count - 1)) * span;
        let sx = px, sy = py, ang = 0;
        if (side === 0) { sx += off; sy -= dist; ang = Math.PI / 2; }
        else if (side === 1) { sx += dist; sy += off; ang = Math.PI; }
        else if (side === 2) { sx += off; sy += dist; ang = -Math.PI / 2; }
        else { sx -= dist; sy += off; ang = 0; }
        if (i === gap1 || i === gap2) {
            telegraph(state, 'line', sx, sy, { length: dist * 1.4, width: C.gauntletGapWidth, angle: ang, color: '#4ade80' }, C.gauntletWarnFrames);
        } else {
            const x = sx, y = sy;
            telegraph(state, 'circle', x, y, { radius: 32, color: '#ef4444' }, 45, (st) => {
                spawnEnemy(st, wave, onEnemySeen, x, y);
            });
        }
    }
};

/**
 * Per frame from Logic.ts (non-boss waves). Ticks the banner, Gauntlet walls, Curse marks, Aegis tagging.
 * Returns true when the normal trickle should be suppressed this frame (Gauntlet: walls are the spawner).
 */
export const updateWaveFlavor = (state: MutableGameState, wave: number, onEnemySeen: (id: string) => void): boolean => {
    if (state.flavorBanner && --state.flavorBanner.frames <= 0) state.flavorBanner = undefined;
    const f = state.flavor;
    if (!f || state.activeBoss) return false;
    const C = WAVE_FLAVOR_CONFIG;

    if (f === 'GAUNTLET') {
        if (state.gauntletTimer === undefined) state.gauntletTimer = C.gauntletIntervalFrames;
        if (--state.gauntletTimer <= 0) { state.gauntletTimer = C.gauntletIntervalFrames; gauntletWall(state, wave, onEnemySeen); }
        return true;
    }

    if (f === 'CURSE') {
        const marks = state.curseMarks;
        if (!marks) return false;
        const hitR = C.curseRadius * 0.85;
        for (let i = 0; i < marks.length; i++) {
            const m = marks[i];
            if (!m.active) continue;
            if (--m.timer <= 0) { m.active = false; continue; }
            const dx = state.player.x - m.x, dy = state.player.y - m.y;
            if (dx * dx + dy * dy <= hitR * hitR && (state.player.dashTimer || 0) <= 0) {
                if (--m.dmgTick <= 0) {
                    m.dmgTick = 60;
                    state.curseDamagedInWave = true;
                    state.damagePlayer?.(1);
                }
            }
        }
        return false;
    }

    if (f === 'AEGIS_TRIAL') {
        for (let i = 0; i < state.enemies.length; i++) {
            const e = state.enemies[i];
            if (e.isBoss) continue;
            if (e.aegisShielded === undefined && e.isShiner === undefined) {
                state.aegisCounter = (state.aegisCounter ?? 0) + 1;
                if (state.aegisCounter % C.aegisShinerRatio === 0) { e.isShiner = true; e.aegisShielded = false; }
                else { e.isShiner = false; e.aegisShielded = true; }
            }
            if (e.aegisBrokenTimer && --e.aegisBrokenTimer <= 0 && !e.isShiner) { e.aegisBrokenTimer = undefined; e.aegisShielded = true; }
        }
        return false;
    }
    return false;
};

/** From KillLogic on every non-boss death. */
export const onFlavorKill = (state: MutableGameState, enemy: Enemy) => {
    const f = state.flavor;
    if (f === 'CURSE') { spawnCurseMark(state, enemy.x, enemy.y); return; }
    if (f === 'AEGIS_TRIAL' && enemy.isShiner) {
        const R = WAVE_FLAVOR_CONFIG.aegisBreakRadius;
        spawnExplosion(state, enemy.x, enemy.y, '#c084fc', ParticleType.VOID);
        for (const e of state.enemies) {
            if (e === enemy || e.isBoss || !e.aegisShielded) continue;
            const dx = e.x - enemy.x, dy = e.y - enemy.y;
            if (dx * dx + dy * dy <= R * R) { e.aegisShielded = false; e.shieldPopFrames = 14; e.aegisBrokenTimer = WAVE_FLAVOR_CONFIG.aegisBreakDurationFrames; }
        }
    }
};
