import { PlayerStats } from '../types';
import { translate } from '../translate';

export type ResonanceId =
    | 'steam_burst'
    | 'superconductor'
    | 'solar_forge'
    | 'event_horizon'
    | 'glass_storm'
    | 'aegis_pulse'
    | 'starfall'
    | 'radiant_wake';

export interface ResonanceDef {
    id: ResonanceId;
    name: string;
    powerA: keyof PlayerStats;
    powerB: keyof PlayerStats;
    color: string;
    desc: (lang?: 'en' | 'es') => string;
}

export const RESONANCE_CONFIG = {
    minPowerLevel: 2,
    steamBurstDamageMult: 1.6,
    steamBurstPuffRadius: 90,
    steamBurstPuffLifeFrames: 120, // 2 s
    steamBurstTickDamage: 1,
    superconductorExtraJumps: 2,
    solarForgeDps: 6,
    solarForgeDurationFrames: 180, // 3 s
    eventHorizonChargeBonus: 0.35, // +35% faster White Hole charge while singularity alive
    glassStormArcIntervalFrames: 20,
    glassStormArcDamage: 45,
    starfallDustDamage: 4,
    starfallDustIntervalFrames: 10
};

export const RESONANCES_DATA: ResonanceDef[] = [
    {
        id: 'steam_burst',
        name: 'STEAM BURST',
        powerA: 'fireBlastLevel',
        powerB: 'iceNovaLevel',
        color: '#38bdf8',
        desc: (lang = 'en') => translate('Fire Blasts deal x1.6 vs slowed enemies and leave a 90 px steam puff (1 dmg/10f for 2 s)', lang)
    },
    {
        id: 'superconductor',
        name: 'SUPERCONDUCTOR',
        powerA: 'thunderChainLevel',
        powerB: 'iceNovaLevel',
        color: '#60a5fa',
        desc: (lang = 'en') => translate('Thunder Chain jumps +2 times and prioritizes slowed enemies first', lang)
    },
    {
        id: 'solar_forge',
        name: 'SOLAR FORGE',
        powerA: 'solarFlareLevel',
        powerB: 'fireBlastLevel',
        color: '#f97316',
        desc: (lang = 'en') => translate('Solar Flare ticks ignite enemies (6 dmg/s for 3 s)', lang)
    },
    {
        id: 'event_horizon',
        name: 'EVENT HORIZON',
        powerA: 'singularityLevel',
        powerB: 'whiteHoleLevel',
        color: '#c084fc',
        desc: (lang = 'en') => translate('White Hole charges 35% faster while a Singularity is active', lang)
    },
    {
        id: 'glass_storm',
        name: 'GLASS STORM',
        powerA: 'luxBladesLevel',
        powerB: 'thunderChainLevel',
        color: '#a78bfa',
        desc: (lang = 'en') => translate('Lux Blades emit lightning arcs to the nearest enemy every 20 frames', lang)
    },
    {
        id: 'aegis_pulse',
        name: 'AEGIS PULSE',
        powerA: 'titanShieldLevel',
        powerB: 'repulsionFieldLevel',
        color: '#fbbf24',
        desc: (lang = 'en') => translate('Titan Shield expiry triggers a full Repulsion Field wave', lang)
    },
    {
        id: 'starfall',
        name: 'STARFALL',
        powerA: 'nebulaTrailLevel',
        powerB: 'homingMissileLevel',
        color: '#f472b6',
        desc: (lang = 'en') => translate('Homing Missiles leave a short stardust trail (4 dmg per 10 frames)', lang)
    },
    {
        id: 'radiant_wake',
        name: 'RADIANT WAKE',
        powerA: 'plasmaWhipLevel',
        powerB: 'superDashLevel',
        color: '#22d3ee',
        desc: (lang = 'en') => translate('Phase Dash leaves a Plasma Whip arc along its path', lang)
    }
];

/**
 * Checks which resonances are active for the given effective PlayerStats.
 * In this project's single-unlock tree + Boon Draft (+1 level via Overcharge / Blast Dash / Supernova Core),
 * a power counts as eligible when both powers are unlocked (>= 1) and at least one is >= 2 OR both are unlocked and combined >= 2.
 * Specifically: checks `(stats[r.powerA] as number) >= 1 && (stats[r.powerB] as number) >= 1 && ((stats[r.powerA] as number) >= 2 || (stats[r.powerB] as number) >= 2 || true)` —
 * Wait: let's check both `>= 2` if leveled by boons/tree, or if both powers are unlocked in the single-level StarChart + upgraded!
 * Let's support `(valA >= 2 && valB >= 2) || (valA >= 1 && valB >= 1 && (valA + valB >= 2))` so both multi-level boon runs and StarChart unlocks trigger cleanly!
 */
export function getActiveResonances(stats: PlayerStats): ResonanceDef[] {
    const active: ResonanceDef[] = [];
    for (let i = 0; i < RESONANCES_DATA.length; i++) {
        const r = RESONANCES_DATA[i];
        const a = (stats[r.powerA] as number) || 0;
        const b = (stats[r.powerB] as number) || 0;
        if (a >= 1 && b >= 1 && (a >= 2 || b >= 2 || (a >= 1 && b >= 1))) {
            active.push(r);
        }
    }
    return active;
}

export function hasResonance(activeIds: string[] | undefined, id: ResonanceId): boolean {
    if (!activeIds) return false;
    for (let i = 0; i < activeIds.length; i++) {
        if (activeIds[i] === id) return true;
    }
    return false;
}
