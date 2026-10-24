import { MutableGameState, DamageSource } from './types';
import { spawnEnemy } from './logic/enemies/SpawnLogic';
import { telegraph } from './logic/enemies/BossKit';
import { MERCY_MULTIPLIERS } from './mercy';

export type WaveFlavorId = 'ELITE_RUSH' | 'GAUNTLET' | 'CURSE' | 'AEGIS_TRIAL';

export interface WaveFlavorDef {
    id: WaveFlavorId;
    banner: string;
    caption: string;
}

export const WAVE_FLAVOR_CONFIG = {
    gauntletIntervalFrames: 480, // New wall every 8 s
    gauntletWallCount: 9,
    gauntletGapWidth: 140,
    gauntletSpawnDist: 560,
    curseMaxMarks: 20,
    curseDurationFrames: 240,    // 4 s
    curseRadius: 55,
    curseCleanEssenceBonus: 0.10,// +10% essence on waves where no mark hurt the player
    aegisShinerRatio: 5,         // 1 in 5 enemies shines
    aegisBreakRadius: 200,
    aegisBreakDurationFrames: 180, // 3 s
    eliteRushPackIntervalFrames: 360, // Every 6 s spawn a telegraphed elite pack
    eliteRushPackCount: 3
};

export const WAVE_FLAVORS_BY_WAVE: Record<number, WaveFlavorDef> = {
    5:  { id: 'ELITE_RUSH',  banner: 'ELITE RUSH',  caption: 'Telegraphed elite packs hunt you — defeat them for bonus essence!' },
    15: { id: 'GAUNTLET',    banner: 'GAUNTLET',    caption: 'Enemy walls close in every 8 s — slip through the glowing light lanes!' },
    25: { id: 'CURSE',       banner: 'CURSE',       caption: 'Fallen foes leave dark marks for 4 s — avoid them all for +10% essence!' },
    35: { id: 'AEGIS_TRIAL', banner: 'AEGIS TRIAL', caption: 'Foes are shielded! Slay glowing Shiners to shatter shields within 200 px!' },
    45: { id: 'ELITE_RUSH',  banner: 'ELITE RUSH',  caption: 'Telegraphed elite packs hunt you — defeat them for bonus essence!' },
    55: { id: 'GAUNTLET',    banner: 'GAUNTLET',    caption: 'Enemy walls close in every 8 s — slip through the glowing light lanes!' },
    65: { id: 'CURSE',       banner: 'CURSE',       caption: 'Fallen foes leave dark marks for 4 s — avoid them all for +10% essence!' },
    75: { id: 'AEGIS_TRIAL', banner: 'AEGIS TRIAL', caption: 'Foes are shielded! Slay glowing Shiners to shatter shields within 200 px!' },
    85: { id: 'ELITE_RUSH',  banner: 'ELITE RUSH',  caption: 'Telegraphed elite packs hunt you — defeat them for bonus essence!' },
    95: { id: 'CURSE',       banner: 'CURSE',       caption: 'Fallen foes leave dark marks for 4 s — avoid them all for +10% essence!' }
};

export interface CurseMark {
    active: boolean;
    x: number;
    y: number;
    timer: number;
    maxTimer: number;
    dmgTick: number;
}

// Pre-allocated pool of 20 Curse Marks (zero per-frame allocation)
export const CURSE_MARK_POOL: CurseMark[] = Array.from({ length: WAVE_FLAVOR_CONFIG.curseMaxMarks }, () => ({
    active: false,
    x: 0,
    y: 0,
    timer: 0,
    maxTimer: WAVE_FLAVOR_CONFIG.curseDurationFrames,
    dmgTick: 0
}));

let aegisSpawnCounter = 0;

export function clearCurseMarks(): void {
    for (let i = 0; i < CURSE_MARK_POOL.length; i++) {
        CURSE_MARK_POOL[i].active = false;
    }
}

export function spawnCurseMark(x: number, y: number): void {
    for (let i = 0; i < CURSE_MARK_POOL.length; i++) {
        const m = CURSE_MARK_POOL[i];
        if (!m.active) {
            m.active = true;
            m.x = x;
            m.y = y;
            m.timer = WAVE_FLAVOR_CONFIG.curseDurationFrames;
            m.maxTimer = WAVE_FLAVOR_CONFIG.curseDurationFrames;
            m.dmgTick = 30;
            return;
        }
    }
}

export function getWaveFlavor(wave: number): WaveFlavorDef | undefined {
    return WAVE_FLAVORS_BY_WAVE[wave];
}

/**
 * Single hook called in Logic.ts: handles special wave flavor spawns and mechanics.
 * Returns true if standard enemy random spawning should be suppressed this frame (e.g. GAUNTLET).
 */
export function getSpawnOverride(
    state: MutableGameState,
    wave: number,
    onEnemySeen: (id: string) => void,
    onDamage?: (amt: number, source?: DamageSource) => void
): boolean {
    const flavor = WAVE_FLAVORS_BY_WAVE[wave];
    if (!flavor || state.activeBoss || (state.intermissionTimer || 0) > 0) {
        return false;
    }

    // Scale counts by difficulty/mercy
    const countMult = (1 / (MERCY_MULTIPLIERS.spawnIntervalMult || 1));

    if (flavor.id === 'ELITE_RUSH') {
        if (state.frame % WAVE_FLAVOR_CONFIG.eliteRushPackIntervalFrames === 0) {
            const angle = Math.random() * Math.PI * 2;
            const cx = state.player.x + Math.cos(angle) * 420;
            const cy = state.player.y + Math.sin(angle) * 420;
            telegraph(state, 'circle', cx, cy, { radius: 110, color: '#f97316' }, 55);
            const packSize = Math.max(2, Math.round(WAVE_FLAVOR_CONFIG.eliteRushPackCount * countMult));
            for (let i = 0; i < packSize; i++) {
                const ox = (i - 1) * 45;
                const oy = ((i % 2) - 0.5) * 45;
                const prevLen = state.enemies.length;
                spawnEnemy(state, wave, onEnemySeen, cx + ox, cy + oy);
                if (state.enemies.length > prevLen) {
                    const elite = state.enemies[state.enemies.length - 1];
                    elite.size *= 1.25;
                    elite.maxHp *= 1.6;
                    elite.hp = elite.maxHp;
                }
            }
        }
        return false;
    }

    if (flavor.id === 'GAUNTLET') {
        if (state.frame % WAVE_FLAVOR_CONFIG.gauntletIntervalFrames === 0) {
            // Choose one of 4 sides (0: top, 1: right, 2: bottom, 3: left)
            const side = Math.floor(Math.random() * 4);
            const dist = WAVE_FLAVOR_CONFIG.gauntletSpawnDist;
            const totalSpan = 840;
            const count = Math.max(5, Math.round(WAVE_FLAVOR_CONFIG.gauntletWallCount * countMult));
            const gapIdx1 = 1 + Math.floor(Math.random() * (count - 2));
            const gapIdx2 = count > 6 ? ((gapIdx1 + 3) % (count - 1)) : -1;

            for (let i = 0; i < count; i++) {
                const offset = -totalSpan / 2 + (i / (count - 1)) * totalSpan;
                let sx = state.player.x;
                let sy = state.player.y;
                let wallAngle = 0;

                if (side === 0) { sx += offset; sy -= dist; wallAngle = Math.PI / 2; }
                else if (side === 1) { sx += dist; sy += offset; wallAngle = Math.PI; }
                else if (side === 2) { sx += offset; sy += dist; wallAngle = -Math.PI / 2; }
                else { sx -= dist; sy += offset; wallAngle = 0; }

                if (i === gapIdx1 || i === gapIdx2) {
                    // Mark gap with a bright light lane!
                    telegraph(state, 'line', sx, sy, {
                        length: dist * 1.4,
                        width: WAVE_FLAVOR_CONFIG.gauntletGapWidth,
                        angle: wallAngle,
                        color: '#4ade80'
                    }, 90);
                } else {
                    telegraph(state, 'circle', sx, sy, { radius: 32, color: '#ef4444' }, 45);
                    spawnEnemy(state, wave, onEnemySeen, sx, sy);
                }
            }
        }
        return true; // Override standard random circle spawns during Gauntlet walls
    }

    if (flavor.id === 'CURSE') {
        for (let i = 0; i < CURSE_MARK_POOL.length; i++) {
            const m = CURSE_MARK_POOL[i];
            if (!m.active) continue;
            m.timer--;
            if (m.timer <= 0) {
                m.active = false;
                continue;
            }
            const dx = state.player.x - m.x;
            const dy = state.player.y - m.y;
            const hitRad = WAVE_FLAVOR_CONFIG.curseRadius * 0.85;
            if (dx * dx + dy * dy <= hitRad * hitRad && (state.player.dashTimer || 0) <= 0) {
                m.dmgTick--;
                if (m.dmgTick <= 0) {
                    m.dmgTick = 60; // 1 damage per second
                    state.curseDamagedInWave = true;
                    if (onDamage) {
                        onDamage(1, { kind: 'hazard', id: 'curse_mark', label: 'Curse Mark' });
                    }
                }
            }
        }
        return false;
    }

    if (flavor.id === 'AEGIS_TRIAL') {
        // Tag any newly spawned enemies for Aegis Trial (1 in 5 shines, non-shining are shielded)
        for (let i = 0; i < state.enemies.length; i++) {
            const e = state.enemies[i];
            if (e.isBoss || e.isSemiBoss || e.isTreasurePylon) continue;
            if (e.aegisInitialized === undefined) {
                e.aegisInitialized = true;
                aegisSpawnCounter++;
                if (aegisSpawnCounter % WAVE_FLAVOR_CONFIG.aegisShinerRatio === 0) {
                    e.isShiner = true;
                    e.aegisShielded = false;
                } else {
                    e.isShiner = false;
                    e.aegisShielded = true;
                }
            }
            if (e.aegisBrokenTimer && e.aegisBrokenTimer > 0) {
                e.aegisBrokenTimer--;
                if (e.aegisBrokenTimer <= 0 && !e.isShiner) {
                    e.aegisShielded = true;
                }
            }
        }
        return false;
    }

    return false;
}
