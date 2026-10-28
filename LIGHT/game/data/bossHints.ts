// (2B) One-line death hints, shown on GameOver as "You fell to <NAME> — <hint>".
// Rewritten from the fork's bossRetry.ts idea. No mercy mechanics: boss HP never carries over.
// Each boss gets a few lines; one is picked at random so repeated deaths don't read the same.

export const BOSS_HINTS: Record<string, string[]> = {
    hive_mind: [
        'acid pools only hurt when they fire — step out during the warn, not after.',
        'the dash follows a drawn line; stand beside it, not at its end.',
        'the closing ring is safe near the Hive — dash inward, not away.',
    ],
    void_warden: [
        'it bounces off the arena wall — read the angle, you have two seconds.',
        'nebulas linger; fight in the clean half of the arena.',
        'a fireball destroys its slow projectiles. Shoot the bullet, not the boss.',
    ],
    crimson_eclipse: [
        'lasers are drawn before they burn — move perpendicular, not away.',
        'comets are telegraphed on the ground: the circle is the landing zone.',
        'save the dash for the sweep; everything else can be outrun.',
    ],
    neutron_star: [
        'the pull is strongest in the last second of a telegraph — dash against it.',
        'ring shockwaves have one gap each; dash through the dark slice.',
        'pulses alternate inner/outer — stay at mid range and sidestep.',
    ],
    entropy_titan: [
        'the slam line shows where it lands — nothing on that line survives untouched.',
        'orbit the Titan — its heavy attacks all point forward.',
        'White Hole detonation breaks its shield phase. Hold it for the shield.',
    ],
    darkness: [
        'it copies your moves a beat late — never stand where you were.',
        'void tendrils are drawn as lines; the base is safe, the tip is not.',
        'the finisher is yours: White Hole at the final 10 % ends it.',
    ],
};

export const bossHint = (bossId?: string): string | undefined => {
    if (!bossId) return undefined;
    const list = BOSS_HINTS[bossId];
    if (!list || !list.length) return undefined;
    return list[Math.floor(Math.random() * list.length)];
};
