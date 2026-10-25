export interface CinematicLine {
    speaker: 'DARKNESS' | 'LIGHT' | 'WATCHER';
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

/** (2D) Ending — plays once Darkness falls. Emotional peak: Darkness goes quiet,
 *  the Watcher speaks for the last time, Light chooses. WinGame then offers Stay / Leave. */
export const OUTRO_SCRIPT: CinematicLine[] = [
    { speaker: 'DARKNESS', text: "...", duration: 2200 },
    { speaker: 'DARKNESS', text: "So this is what it feels like.", duration: 3200 },
    { speaker: 'DARKNESS', text: "To be seen.", duration: 2600 },
    { speaker: 'DARKNESS', text: "Go on, then. Shine.", duration: 3000, visualAction: 'SEAM_TEAR' },
    { speaker: 'WATCHER', text: "...the seam remembers you.", duration: 3200 },
    { speaker: 'WATCHER', text: "Every spark that ever stood here chose.", duration: 3400 },
    { speaker: 'WATCHER', text: "Stay, and the void keeps you company forever.", duration: 3400 },
    { speaker: 'WATCHER', text: "Leave, and it will be dark again. But it will remember.", duration: 3800 },
    { speaker: 'LIGHT', text: "I was a spark.", duration: 2600, visualAction: 'SEAM_BLOOM' },
    { speaker: 'LIGHT', text: "Now I am the light.", duration: 3000 },
    { speaker: 'LIGHT', text: "And light decides where it goes.", duration: 3400 }
];
