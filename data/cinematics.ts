export interface CinematicLine {
    speaker: 'DARKNESS' | 'LIGHT';
    text: string;
    duration: number;
    visualAction?: string;
}

export const INTRO_SCRIPT: CinematicLine[] = [
    { speaker: 'DARKNESS', text: "...", duration: 2000 },
    { speaker: 'DARKNESS', text: "Silence. Perfect silence.", duration: 3000 },
    { speaker: 'DARKNESS', text: "The void is eternal.", duration: 3000 },
    { speaker: 'DARKNESS', text: "Wait...", duration: 1500, visualAction: 'SPARK_FORM' },
    { speaker: 'DARKNESS', text: "What is this disturbance?", duration: 3000 },
    { speaker: 'DARKNESS', text: "A spark?", duration: 2500, visualAction: 'EXPLOSION' },
    { speaker: 'DARKNESS', text: "How... irritating.", duration: 3000 },
    { speaker: 'DARKNESS', text: "Consume it.", duration: 2000 }
];

export const OUTRO_SCRIPT: CinematicLine[] = [
    { speaker: 'LIGHT', text: "...", duration: 2000, visualAction: 'WHITE_FLASH' },
    { speaker: 'LIGHT', text: "I triumph against darkness.", duration: 3000 },
    { speaker: 'LIGHT', text: "Now, I will spread the light.", duration: 3500 },
    { speaker: 'LIGHT', text: "The cycle is broken.", duration: 3000 },
    { speaker: 'LIGHT', text: "I won.", duration: 3000 }
];

export const ESSENCE_TUTORIAL_SCRIPT: CinematicLine[] = [
    { speaker: 'LIGHT', text: "Wait... what is this shimmering substance?", duration: 3000, visualAction: 'ESSENCE_GLOW' },
    { speaker: 'LIGHT', text: "It flows from the defeated anomalies... pure, concentrated Essence.", duration: 3800 },
    { speaker: 'LIGHT', text: "I can feel its energy resonating within my core...", duration: 3200 },
    { speaker: 'LIGHT', text: "Yes! If I absorb enough of this energy, I can realign my internal geometry.", duration: 4000 },
    { speaker: 'LIGHT', text: "By pressing ESC, I can open the Constellation of Virtues and manifest powerful abilities.", duration: 4600, visualAction: 'CONSTELLATION_HINT' },
    { speaker: 'LIGHT', text: "Let us gather more. The void will not claim me.", duration: 3000 }
];


export const FIRST_SEMI_BOSS_TUTORIAL_SCRIPT: CinematicLine[] = [
    { speaker: 'LIGHT', text: "The destruction of that pylon has awakened a massive void entity...", duration: 5000, visualAction: 'EXPLOSION' },
    { speaker: 'DARKNESS', text: "You dare disturb the void architecture? Suffer the wrath of our elite guardian!", duration: 5500 },
    { speaker: 'LIGHT', text: "A powerful semi-boss has arrived! I must defeat it or survive until the end of this run to banish it.", duration: 6000 }
];

export const TREASURE_ALL_CLEARED_SCRIPT: CinematicLine[] = [
    { speaker: 'LIGHT', text: "All essence caches have been restored and fully harvested.", duration: 4000, visualAction: 'GOLD_GLOW' },
    { speaker: 'LIGHT', text: "A massive stellar resonance hums across the constellation...", duration: 4000 },
    { speaker: 'DARKNESS', text: "Impossible... the dense web of the void is breaking! What have you done, spark?", duration: 4500 },
    { speaker: 'LIGHT', text: "The geometric alignment is complete. The pure fire of the original stars burns within me.", duration: 5000 },
    { speaker: 'LIGHT', text: "My affinity has transcended. ALL ESSENCE I COLLECT NOW COUNTS TWICE!", duration: 6000, visualAction: 'DOUBLE_ESSENCE_BURST' }
];

export const FIRST_KEY_TUTORIAL_SCRIPT: CinematicLine[] = [
    { speaker: 'LIGHT', text: "A mysterious key has materialized from the completed mission...", duration: 5000, visualAction: 'GOLD_GLOW' },
    { speaker: 'LIGHT', text: "I can sense its harmonic resonance pointing toward hidden pathways in the cosmos.", duration: 6000 },
    { speaker: 'LIGHT', text: "This Vault Key will allow me to unlock secret nodes and reach ancient chambers on the star chart.", duration: 6500, visualAction: 'ESSENCE_GLOW' },
    { speaker: 'LIGHT', text: "Sometimes, completing a special event or chaos anomaly is also required to earn more Vault Keys.", duration: 7000 },
    { speaker: 'LIGHT', text: "I will claim it and forge deeper into the star chart.", duration: 5000 }
];

export const FIRST_EVENT_TUTORIAL_SCRIPT: CinematicLine[] = [
    { speaker: 'LIGHT', text: "The cosmic fabric is warping... a celestial anomaly has erupted!", duration: 3600, visualAction: 'WHITE_FLASH' },
    { speaker: 'DARKNESS', text: "Chaos surges through the sector! Can your fragile light withstand the storm?", duration: 4000, visualAction: 'EXPLOSION' },
    { speaker: 'LIGHT', text: "Events introduce temporary hazards and trials. If I survive through the remaining waves, the surge will stabilize and yield celestial rewards.", duration: 4800, visualAction: 'ESSENCE_GLOW' }
];

export const MAP6_TWO_KEYS_SCRIPT: CinematicLine[] = [
    { speaker: 'LIGHT', text: "The resonance of both Vault Keys surges across the void...", duration: 3500, visualAction: 'WHITE_FLASH' },
    { speaker: 'DARKNESS', text: "WHAT?! My immortal regeneration... severed by those relics?!", duration: 4000, visualAction: 'BOSS_SPAWN_ROAR' },
    { speaker: 'LIGHT', text: "Your dark essence can no longer heal. The end is now!", duration: 3500, visualAction: 'RESUME_GAME' }
];

export const getSpecialAbilityCinematic = (rewardId: string): CinematicLine[] => {
    switch (rewardId) {
        case 'special_dashDamage':
            return [
                { speaker: 'LIGHT', text: "Through the vast silence of the void, my motion shall leave a burning flame.", duration: 5000, visualAction: 'WHITE_FLASH' },
                { speaker: 'DARKNESS', text: "Foolish spark... your desperate velocity will only consume your fragile spirit!", duration: 5000, visualAction: 'EXPLOSION' },
                { speaker: 'LIGHT', text: "Then let the shadows burn in my wake!", duration: 4000, visualAction: 'SPARK_FORM' },
                { speaker: 'LIGHT', text: "Searing Trail awakened—my dash leaves a trail of scorching cosmic radiance that disintegrates void entities.", duration: 6000, visualAction: 'DOUBLE_ESSENCE_BURST' }
            ];
        case 'special_fireBlastCount':
            return [
                { speaker: 'LIGHT', text: "A solitary ember cannot illuminate the abyss. But a supernova will shatter it.", duration: 5500, visualAction: 'WHITE_FLASH' },
                { speaker: 'DARKNESS', text: "The infinite cold swallows all warmth! Your flames will die in the dark!", duration: 5000, visualAction: 'EXPLOSION' },
                { speaker: 'LIGHT', text: "Behold the fury of a thousand newborn stars!", duration: 4500, visualAction: 'SPARK_FORM' },
                { speaker: 'LIGHT', text: "Thermal Cascade awakened—my plasma bursts multiply into a devastating arc of stellar fire.", duration: 6000, visualAction: 'DOUBLE_ESSENCE_BURST' }
            ];
        case 'special_thunderBounce':
            return [
                { speaker: 'LIGHT', text: "An invisible web of light binds all stars together across eternity.", duration: 5000, visualAction: 'WHITE_FLASH' },
                { speaker: 'DARKNESS', text: "Isolation is the law of the cosmos! Nothing connects in the abyss!", duration: 5000, visualAction: 'EXPLOSION' },
                { speaker: 'LIGHT', text: "My radiance leaps across the dark, striking one shadow after another!", duration: 4500, visualAction: 'SPARK_FORM' },
                { speaker: 'LIGHT', text: "Arc Resonance awakened—lightning bolts now leap fluidly across multiple targets.", duration: 6000, visualAction: 'DOUBLE_ESSENCE_BURST' }
            ];
        case 'special_iceNovaSize':
            return [
                { speaker: 'LIGHT', text: "Absolute stillness can freeze even the relentless expansion of chaos.", duration: 5000, visualAction: 'WHITE_FLASH' },
                { speaker: 'DARKNESS', text: "You dare turn the cold against us? We ARE the absolute zero!", duration: 5000, visualAction: 'EXPLOSION' },
                { speaker: 'LIGHT', text: "I do not bring coldness—I bring order to your dark vortex!", duration: 4500, visualAction: 'SPARK_FORM' },
                { speaker: 'LIGHT', text: "Stellar Absolute awakened—the freezing nova expands across a vast radius to immobilize the void.", duration: 6000, visualAction: 'DOUBLE_ESSENCE_BURST' }
            ];
        case 'special_orbitalSpeed':
            return [
                { speaker: 'LIGHT', text: "The celestial spheres rotate in eternal, inviolable harmony.", duration: 5000, visualAction: 'WHITE_FLASH' },
                { speaker: 'DARKNESS', text: "Spin as you wish, fragile spark! The abyssal tide will crush your revolving shields!", duration: 5000, visualAction: 'EXPLOSION' },
                { speaker: 'LIGHT', text: "My orbit becomes a vortex of pure blades!", duration: 4000, visualAction: 'SPARK_FORM' },
                { speaker: 'LIGHT', text: "Celestial Gyre awakened—orbital barriers now spin at transcendent velocities, slicing through all who draw near.", duration: 6000, visualAction: 'DOUBLE_ESSENCE_BURST' }
            ];
        case 'special_singularityPull':
            return [
                { speaker: 'LIGHT', text: "Even darkness cannot resist the gravitational pull toward the Light.", duration: 5000, visualAction: 'WHITE_FLASH' },
                { speaker: 'DARKNESS', text: "You play with black holes? The singularity will swallow you whole!", duration: 5000, visualAction: 'EXPLOSION' },
                { speaker: 'LIGHT', text: "I do not fear the vortex—I command its horizon!", duration: 4500, visualAction: 'SPARK_FORM' },
                { speaker: 'LIGHT', text: "Primal Gravity awakened—black holes pull all nearby anomalies helplessly into their crushing core.", duration: 6000, visualAction: 'DOUBLE_ESSENCE_BURST' }
            ];
        case 'special_lightPurge':
            return [
                { speaker: 'LIGHT', text: "When the eclipse reaches its apex, the primordial ray shall pierce the night.", duration: 5000, visualAction: 'WHITE_FLASH' },
                { speaker: 'DARKNESS', text: "Curse your blinding glare! It burns... it unravels our shadow fabric!", duration: 5000, visualAction: 'EXPLOSION' },
                { speaker: 'LIGHT', text: "Unravel, then—and dissolve into nothingness.", duration: 4000, visualAction: 'SPARK_FORM' },
                { speaker: 'LIGHT', text: "Ray of Judgment awakened—concentrated solar beams can be unleashed to eradicate boss anomalies.", duration: 6000, visualAction: 'DOUBLE_ESSENCE_BURST' }
            ];
        case 'special_dashOnKill':
            return [
                { speaker: 'LIGHT', text: "With every shadow I banish, the rhythm of my journey grows unbroken.", duration: 5000, visualAction: 'WHITE_FLASH' },
                { speaker: 'DARKNESS', text: "Your energy flickers... you cannot run forever!", duration: 5000, visualAction: 'EXPLOSION' },
                { speaker: 'LIGHT', text: "As long as darkness remains, my movement shall never falter!", duration: 4500, visualAction: 'SPARK_FORM' },
                { speaker: 'LIGHT', text: "Eternal Impulse awakened—destroying a void entity instantly restores spatial dash charges.", duration: 6000, visualAction: 'DOUBLE_ESSENCE_BURST' }
            ];
        default:
            return [
                { speaker: 'LIGHT', text: "A lost frequency of the primordial cosmos resonates within my core.", duration: 4500, visualAction: 'WHITE_FLASH' },
                { speaker: 'DARKNESS', text: "That power belongs to the ancient night! You cannot control it!", duration: 4500, visualAction: 'EXPLOSION' },
                { speaker: 'LIGHT', text: "The light assimilates all truth.", duration: 3500, visualAction: 'SPARK_FORM' },
                { speaker: 'LIGHT', text: "A mysterious power has manifested and unified with your spark.", duration: 5000, visualAction: 'DOUBLE_ESSENCE_BURST' }
            ];
    }
};

