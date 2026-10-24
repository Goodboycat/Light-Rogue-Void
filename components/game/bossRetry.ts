// Master configuration and helper logic for Boss Retries & Mercy Wounded system

export const BOSS_RETRY_CONFIG = {
    BOSS_MERCY: true,
    hpReductionPerAttempt: 0.12, // 12% initial HP reduction per failed attempt
    maxStacks: 3,                // Max 3 stacks (36% HP reduction)
    fastTitleCardDurationMs: 1500, // 1.5 s title card on retry
    quickFadeDurationMs: 400,    // 0.4 s screen fade on retry
    hintsAfterAttempts: 3,       // Show tactical hint after 3 failed attempts
};

export const BOSS_NAMES: Record<string, { en: string; es: string }> = {
    hive_mind: { en: 'Hive Mind', es: 'Mente Colmena' },
    darkness: { en: 'Darkness', es: 'Oscuridad' },
    sb_hunter: { en: 'Hunter Pylon', es: 'Pilón Cazador' },
    sb_swarm: { en: 'Swarm Pylon', es: 'Pilón Enjambre' },
    sb_laser: { en: 'Laser Pylon', es: 'Pilón Láser' },
};

export const BOSS_HINTS: Record<string, { en: string; es: string }> = {
    MISSILE: {
        en: "Homing missiles can be destroyed by your attacks or cleared with Phase Dash!",
        es: "¡Los proyectiles teledirigidos se destruyen con tus ataques o con el Deslizamiento!"
    },
    ACID: {
        en: "Watch ground telegraph markers and dash clear before acid clouds explode!",
        es: "¡Observa las marcas rojas del suelo y deslízate antes de que exploten las nubes!"
    },
    DASH_CONTACT: {
        en: "The Hive Mind exposes its weak core every 14s — save your Light Energy beam for that window!",
        es: "¡La Mente Colmena expone su núcleo débil cada 14s — guarda tu rayo para esa ventana!"
    },
    POISON_RING: {
        en: "Save a Dash to escape radial poison pulses when the ring telegraph fills up!",
        es: "¡Guarda un Deslizamiento para escapar del pulso de veneno radial cuando el anillo se llene!"
    },
    GENERIC: {
        en: "Timing your Phase Dash grants total invulnerability through lethal boss attacks.",
        es: "Usar tu Deslizamiento en el momento exacto otorga invulnerabilidad total."
    }
};

export function getBossHintKey(deathCauseLabel?: string): string {
    if (!deathCauseLabel) return 'GENERIC';
    const label = deathCauseLabel.toLowerCase();
    if (label.includes('missile') || label.includes('dart') || label.includes('homing')) return 'MISSILE';
    if (label.includes('acid') || label.includes('spit') || label.includes('cloud')) return 'ACID';
    if (label.includes('dash') || label.includes('charge') || label.includes('contact') || label.includes('hive')) return 'DASH_CONTACT';
    if (label.includes('poison') || label.includes('ring') || label.includes('burst')) return 'POISON_RING';
    return 'GENERIC';
}

export function calculateBossWoundedHp(baseHp: number, failedAttempts: number): { startingHp: number; stacks: number } {
    if (!BOSS_RETRY_CONFIG.BOSS_MERCY) {
        return { startingHp: baseHp, stacks: 0 };
    }
    const stacks = Math.min(BOSS_RETRY_CONFIG.maxStacks, Math.max(0, Math.floor(failedAttempts)));
    if (stacks <= 0) {
        return { startingHp: baseHp, stacks: 0 };
    }
    const hpFraction = 1 - (stacks * BOSS_RETRY_CONFIG.hpReductionPerAttempt);
    const startingHp = Math.max(1, Math.round(baseHp * hpFraction));
    return { startingHp, stacks };
}
