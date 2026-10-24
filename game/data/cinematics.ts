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
    { speaker: 'LIGHT', text: "...", duration: 2000 },
    { speaker: 'LIGHT', text: "I triumph against darkness.", duration: 3000 },
    { speaker: 'LIGHT', text: "Now, I will spread the light.", duration: 3500 },
    { speaker: 'LIGHT', text: "The cycle is broken.", duration: 3000 },
    { speaker: 'LIGHT', text: "I won.", duration: 3000 }
];