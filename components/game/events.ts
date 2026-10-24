import { MutableGameState, ParticleType } from './types';
import { spawnEnemy } from './logic/enemies/SpawnLogic';
import { telegraph } from './logic/enemies/BossKit';
import { createParticle } from './Particles';
import { audio } from './audio';

export type InRunEventType = 'GOLDEN_MITE' | 'ESSENCE_TIDE' | 'TREASURE_PYLON' | 'AMBUSH_RING' | 'METEOR_SHOWER';

export const EVENTS_DIRECTOR_CONFIG = {
    minCooldownFrames: 1500,       // At least 25 s between events
    calmRampPerSecond: 0.004,      // Probability ramps with calm time
    essenceTideMinInterval: 4200,  // ~70 s
    essenceTideMaxInterval: 6000,  // ~100 s
    essenceTideDurationFrames: 360,// 6 s where all essence is doubled
    goldenMiteSpawnChance: 0.04,   // 4% chance per spawn from wave 3 (max 1 alive)
    goldenMiteMinWave: 3,
    goldenMiteHpMult: 2.5,
    goldenMiteFleeDist: 320,
    goldenMiteFleeSpeed: 2.6,
    goldenMiteTeleportFrames: 360, // 6 s
    goldenMiteEssenceMult: 25,
    treasurePylonBaseHp: 120,
    treasurePylonWaveHp: 10,
    treasurePylonDist: 500,
    treasurePylonDurationFrames: 720, // 12 s
    ambushRingCount: 10,
    ambushRingTelegraphFrames: 60, // 1 s
    ambushRingRadius: 340,
    ambushRingGapRad: Math.PI / 3, // 60 degree gap
    meteorShowerDurationFrames: 360, // 6 s
    meteorWarningFrames: 60,       // 1 s warning
    meteorRadius: 75,
    meteorDodgeRewardEvery: 5,
    meteorDodgeEssenceReward: 5
};

export interface ActiveWaveEvent {
    type: InRunEventType;
    timer: number;
    maxTimer: number;
    custom?: any;
}

let lastEventEndFrame = 0;
let nextEssenceTideFrame = 4500;

export function resetEventsDirector(): void {
    lastEventEndFrame = 0;
    nextEssenceTideFrame = 4200 + Math.floor(Math.random() * 1800);
}

/**
 * Called from SpawnLogic.ts when spawning an enemy:
 * 4% chance from wave >= 3 to turn the spawned enemy into a GOLDEN MITE (if none alive).
 */
export function tryMakeGoldenMite(state: MutableGameState, wave: number): boolean {
    if (wave < EVENTS_DIRECTOR_CONFIG.goldenMiteMinWave || state.activeBoss) return false;
    for (let i = 0; i < state.enemies.length; i++) {
        if (state.enemies[i].isGoldenMite) return false; // max 1 alive
    }
    return Math.random() < EVENTS_DIRECTOR_CONFIG.goldenMiteSpawnChance;
}

/**
 * Updates the in-run Events Director once per frame in Logic.ts
 */
export function updateEventsDirector(
    state: MutableGameState,
    wave: number,
    isFirstWaveOfSave: boolean,
    onCollectMatter: (amt: number) => void,
    onEnemySeen: (id: string) => void
): void {
    // Never run during boss fights or first wave of a save
    if (state.activeBoss || (wave === 1 && isFirstWaveOfSave) || (state.intermissionTimer || 0) > 0) {
        return;
    }

    const active = state.activeWaveEvent;
    if (active) {
        active.timer--;

        if (active.type === 'AMBUSH_RING') {
            if (active.timer === active.maxTimer - EVENTS_DIRECTOR_CONFIG.ambushRingTelegraphFrames) {
                // Spawn ring of 10 enemies with a 60 degree gap
                const gapCenter = active.custom?.gapAngle || 0;
                const halfGap = EVENTS_DIRECTOR_CONFIG.ambushRingGapRad / 2;
                const count = EVENTS_DIRECTOR_CONFIG.ambushRingCount;
                for (let i = 0; i < count; i++) {
                    const a = (i / count) * Math.PI * 2;
                    let diff = Math.abs(Math.atan2(Math.sin(a - gapCenter), Math.cos(a - gapCenter)));
                    if (diff < halfGap) continue; // Leave 60 degree safe gap
                    const sx = state.player.x + Math.cos(a) * EVENTS_DIRECTOR_CONFIG.ambushRingRadius;
                    const sy = state.player.y + Math.sin(a) * EVENTS_DIRECTOR_CONFIG.ambushRingRadius;
                    spawnEnemy(state, wave, onEnemySeen, sx, sy);
                }
                audio.playPhaseShiftStinger();
            }
        } else if (active.type === 'METEOR_SHOWER') {
            // Spawn a meteor circle every 30 frames
            if (active.timer > 60 && active.timer % 30 === 0) {
                const angle = Math.random() * Math.PI * 2;
                const dist = Math.random() * 260;
                const mx = state.player.x + Math.cos(angle) * dist;
                const my = state.player.y + Math.sin(angle) * dist;
                telegraph(state, 'circle', mx, my, {
                    radius: EVENTS_DIRECTOR_CONFIG.meteorRadius,
                    color: '#f97316'
                }, EVENTS_DIRECTOR_CONFIG.meteorWarningFrames);
                if (!active.custom.meteors) active.custom.meteors = [];
                active.custom.meteors.push({
                    x: mx,
                    y: my,
                    detonateFrame: state.frame + EVENTS_DIRECTOR_CONFIG.meteorWarningFrames
                });
            }
            // Check meteor detonations
            const meteors = active.custom?.meteors;
            if (meteors) {
                for (let i = meteors.length - 1; i >= 0; i--) {
                    const m = meteors[i];
                    if (state.frame >= m.detonateFrame) {
                        const dx = state.player.x - m.x;
                        const dy = state.player.y - m.y;
                        const hitRadius = EVENTS_DIRECTOR_CONFIG.meteorRadius * 0.85;
                        for (let k = 0; k < 8; k++) {
                            createParticle(state, m.x, m.y, ParticleType.FIRE, '#f97316', { speed: 5, life: 25, size: 4 });
                        }
                        if (dx * dx + dy * dy <= hitRadius * hitRadius && (state.player.dashTimer || 0) <= 0) {
                            // Hit by meteor: deal 1 damage projectile at player
                            state.projectiles.push({
                                x: m.x,
                                y: m.y,
                                vx: 0,
                                vy: 0,
                                size: hitRadius,
                                color: '#f97316',
                                damage: 1,
                                isEnemy: true,
                                life: 2
                            });
                        } else {
                            // Dodged! +5 essence for every 5 dodged
                            active.custom.dodged = (active.custom.dodged || 0) + 1;
                            if (active.custom.dodged % EVENTS_DIRECTOR_CONFIG.meteorDodgeRewardEvery === 0) {
                                onCollectMatter(EVENTS_DIRECTOR_CONFIG.meteorDodgeEssenceReward);
                                createParticle(state, state.player.x, state.player.y - 20, ParticleType.TEXT, '#fbbf24', {
                                    vx: 0, vy: -1, life: 35, size: 12
                                });
                            }
                        }
                        meteors.splice(i, 1);
                    }
                }
            }
        } else if (active.type === 'TREASURE_PYLON') {
            // Check if pylon timed out
            if (active.timer <= 1) {
                for (let i = state.enemies.length - 1; i >= 0; i--) {
                    if (state.enemies[i].isTreasurePylon) {
                        state.enemies.splice(i, 1);
                    }
                }
            }
        }

        if (active.timer <= 0) {
            state.activeWaveEvent = undefined;
            lastEventEndFrame = state.frame;
        }
        return;
    }

    // Cooldown check: at least 25 s (1500 frames) between events
    const calmFrames = state.frame - lastEventEndFrame;
    if (calmFrames < EVENTS_DIRECTOR_CONFIG.minCooldownFrames) return;

    // Check Essence Tide schedule (~70-100 s)
    if (state.frame >= nextEssenceTideFrame) {
        nextEssenceTideFrame = state.frame + EVENTS_DIRECTOR_CONFIG.essenceTideMinInterval + Math.floor(Math.random() * 1800);
        state.activeWaveEvent = {
            type: 'ESSENCE_TIDE',
            timer: EVENTS_DIRECTOR_CONFIG.essenceTideDurationFrames,
            maxTimer: EVENTS_DIRECTOR_CONFIG.essenceTideDurationFrames
        };
        state.waveBannerText = 'ESSENCE TIDE! (2X ESSENCE)';
        state.waveBannerTimer = 120;
        audio.playLevelUp();
        return;
    }

    // Check random event once per second (60 frames), probability ramps with calm time
    if (state.frame % 60 === 0 && wave >= 2) {
        const calmSeconds = Math.max(0, (calmFrames - EVENTS_DIRECTOR_CONFIG.minCooldownFrames) / 60);
        const prob = Math.min(0.25, 0.02 + calmSeconds * EVENTS_DIRECTOR_CONFIG.calmRampPerSecond);
        if (Math.random() < prob) {
            const roll = Math.random();
            if (roll < 0.34) {
                // TREASURE PYLON: stationary pylon (hp 120 + wave*10) 500 px away
                const angle = Math.random() * Math.PI * 2;
                const px = state.player.x + Math.cos(angle) * EVENTS_DIRECTOR_CONFIG.treasurePylonDist;
                const py = state.player.y + Math.sin(angle) * EVENTS_DIRECTOR_CONFIG.treasurePylonDist;
                const pylonHp = EVENTS_DIRECTOR_CONFIG.treasurePylonBaseHp + wave * EVENTS_DIRECTOR_CONFIG.treasurePylonWaveHp;
                state.enemies.push({
                    x: px,
                    y: py,
                    vx: 0,
                    vy: 0,
                    size: 26,
                    color: '#fbbf24',
                    hp: pylonHp,
                    maxHp: pylonHp,
                    speed: 0,
                    spawnSpeed: 0,
                    projectileImmunity: 0,
                    isTreasurePylon: true,
                    state: { timer: 0 },
                    def: {
                        id: 'treasure_pylon',
                        name: 'Treasure Pylon',
                        description: 'Destroy within 12s for a Heart or Boon!',
                        baseHp: pylonHp,
                        hpScaling: 0,
                        baseSpeed: 0,
                        size: 26,
                        color: '#fbbf24',
                        glowColor: '#fde047',
                        behavior: 'CHASE',
                        visualType: 'CRYSTAL',
                        spawnWeight: 0,
                        minWave: 1,
                        essenceReward: 25,
                        particleEffect: ParticleType.SPARK
                    }
                });
                state.activeWaveEvent = {
                    type: 'TREASURE_PYLON',
                    timer: EVENTS_DIRECTOR_CONFIG.treasurePylonDurationFrames,
                    maxTimer: EVENTS_DIRECTOR_CONFIG.treasurePylonDurationFrames
                };
                state.waveBannerText = 'TREASURE PYLON DETECTED! (12S)';
                state.waveBannerTimer = 110;
                audio.playCollect(1.4);
            } else if (roll < 0.67) {
                // AMBUSH RING: telegraphed (1 s) ring of 10 enemies closing in with a 60 deg gap
                const gapAngle = Math.random() * Math.PI * 2;
                telegraph(state, 'ring', state.player.x, state.player.y, {
                    innerRadius: EVENTS_DIRECTOR_CONFIG.ambushRingRadius - 20,
                    radius: EVENTS_DIRECTOR_CONFIG.ambushRingRadius + 20,
                    color: '#f43f5e'
                }, EVENTS_DIRECTOR_CONFIG.ambushRingTelegraphFrames);
                // Bright safe arc wedge
                telegraph(state, 'cone', state.player.x, state.player.y, {
                    radius: EVENTS_DIRECTOR_CONFIG.ambushRingRadius + 30,
                    angle: gapAngle,
                    fov: EVENTS_DIRECTOR_CONFIG.ambushRingGapRad,
                    color: '#4ade80'
                }, EVENTS_DIRECTOR_CONFIG.ambushRingTelegraphFrames);
                state.activeWaveEvent = {
                    type: 'AMBUSH_RING',
                    timer: 90,
                    maxTimer: 90,
                    custom: { gapAngle }
                };
                state.waveBannerText = 'AMBUSH RING! ESCAPE THROUGH GREEN GAP';
                state.waveBannerTimer = 90;
            } else {
                // METEOR SHOWER: 6 s of ground circles with 1 s warning
                state.activeWaveEvent = {
                    type: 'METEOR_SHOWER',
                    timer: EVENTS_DIRECTOR_CONFIG.meteorShowerDurationFrames,
                    maxTimer: EVENTS_DIRECTOR_CONFIG.meteorShowerDurationFrames,
                    custom: { meteors: [], dodged: 0 }
                };
                state.waveBannerText = 'METEOR SHOWER! DODGE FOR BONUS ESSENCE';
                state.waveBannerTimer = 110;
            }
        }
    }
}
