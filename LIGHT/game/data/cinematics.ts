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

// ============================================================================
// (7D) Storyline cinematics with movement — shot lists.
// A storyline cinematic = dialogue (lines referenced from data/story.ts by
// chapter + beat, never duplicated here) + a list of camera/actor/fx shots that
// the Cinematic player (components/game/logic/Cinematic.ts) runs in parallel
// with the lines. The sim is frozen while one plays (same gate as the breather);
// rendering continues so the camera can move over the live arena.
// ============================================================================

/** Where the camera looks during a shot. `'player'` / `'boss'` follow the live actor
 *  (boss falls back to the player when there is none — e.g. outros where the boss is gone
 *  use the recorded `bossDeathPos`). Explicit `{x,y}` is a world-space offset from the
 *  player's position at cinematic start, so shots stay valid wherever the fight happens. */
export type ShotCamera = 'player' | 'boss' | { x: number; y: number; zoom?: number };
export type ShotActor = 'spark' | 'boss' | 'lights';
export type ShotFx = 'flash' | 'shake' | 'fogburn' | 'bloom';

export interface Shot {
    camera: ShotCamera;
    /** Zoom at the END of the shot (1 = normal). Interpolated from the previous shot's zoom over `ms`. */
    zoom?: number;
    /** Camera travel time (ms) — eased; `holdMs` counts after it. */
    ms?: number;
    /** Actors that get a presence effect this shot (spark = aura pulse, boss = silhouette flare, lights = drifting motes). */
    actors?: ShotActor[];
    /** One-shot effect at the start of the shot. `reduceFlash` drops flash/shake only. */
    fx?: ShotFx;
    /** Hold after the camera arrives. The shot ends at `ms + holdMs`. */
    holdMs: number;
}

export type StoryBeatRef = { chapter: number; beat: 'opener' | 'preBoss' | 'bossIntro' | 'bossOutro' } | 'ending';

export interface StoryCinematic {
    /** `bossIntro_<bossId>`, `bossOutro_<bossId>`, `opener_<chapter>`, `ending` */
    id: string;
    /** Which lines to speak — resolved from data/story.ts (or OUTRO_SCRIPT for `'ending'`). */
    lines: StoryBeatRef;
    shots: Shot[];
    /** If true the sim keeps running (pre-boss push-ins). Default false = frozen. */
    noFreeze?: boolean;
}

const BOSS_IDS = ['hive_mind', 'void_warden', 'crimson_eclipse', 'neutron_star', 'entropy_titan', 'darkness'] as const;

// --- boss intros: the boss is on the field; look at it, then back at the spark --------------
const INTRO_SHOTS: Shot[][] = [
    // 1 hive_mind — the scratching comes from everywhere, then the hive
    [
        { camera: 'player', zoom: 1.15, ms: 600, actors: ['spark'], fx: 'shake', holdMs: 900 },
        { camera: 'boss', zoom: 1.5, ms: 1400, actors: ['boss'], fx: 'fogburn', holdMs: 1600 },
        { camera: 'boss', zoom: 1.3, ms: 500, fx: 'flash', holdMs: 600 },
        { camera: 'player', zoom: 1.0, ms: 900, actors: ['spark'], holdMs: 500 },
    ],
    // 2 void_warden — order descends from above; slow, square
    [
        { camera: 'boss', zoom: 1.1, ms: 1600, actors: ['boss'], holdMs: 1200 },
        { camera: 'boss', zoom: 1.6, ms: 900, actors: ['boss'], fx: 'bloom', holdMs: 1200 },
        { camera: 'player', zoom: 1.0, ms: 1000, actors: ['spark'], fx: 'shake', holdMs: 500 },
    ],
    // 3 crimson_eclipse — the light goes red; whip to the boss
    [
        { camera: 'player', zoom: 1.2, ms: 700, actors: ['spark'], fx: 'fogburn', holdMs: 800 },
        { camera: 'boss', zoom: 1.7, ms: 500, actors: ['boss'], fx: 'flash', holdMs: 1700 },
        { camera: 'player', zoom: 1.0, ms: 1200, actors: ['spark', 'lights'], holdMs: 600 },
    ],
    // 4 neutron_star — mass; the camera is pulled in
    [
        { camera: 'boss', zoom: 0.9, ms: 1200, actors: ['boss'], holdMs: 800 },
        { camera: 'boss', zoom: 1.8, ms: 1800, actors: ['boss'], fx: 'shake', holdMs: 1000 },
        { camera: 'player', zoom: 1.0, ms: 800, actors: ['spark'], fx: 'flash', holdMs: 500 },
    ],
    // 5 entropy_titan — everything comes apart; wide and slow
    [
        { camera: { x: 0, y: -220 }, zoom: 0.8, ms: 1400, actors: ['lights'], fx: 'fogburn', holdMs: 900 },
        { camera: 'boss', zoom: 1.4, ms: 1500, actors: ['boss'], fx: 'shake', holdMs: 1400 },
        { camera: 'player', zoom: 1.0, ms: 900, actors: ['spark'], holdMs: 500 },
    ],
    // 6 darkness — the void itself; nothing to see until it looks back
    [
        { camera: 'player', zoom: 1.3, ms: 1200, actors: ['spark'], holdMs: 1200 },
        { camera: 'boss', zoom: 0.85, ms: 2000, actors: ['boss', 'lights'], fx: 'fogburn', holdMs: 1200 },
        { camera: 'boss', zoom: 1.5, ms: 700, fx: 'flash', holdMs: 1000 },
        { camera: 'player', zoom: 1.0, ms: 1000, actors: ['spark'], fx: 'shake', holdMs: 500 },
    ],
];

// --- boss outros: the boss is dead; camera on the death spot, then the spark -----------------
const OUTRO_SHOTS: Shot[][] = [
    // 1 hive_mind
    [
        { camera: 'boss', zoom: 1.4, ms: 900, fx: 'flash', holdMs: 1400 },
        { camera: 'boss', zoom: 1.1, ms: 1800, actors: ['lights'], holdMs: 800 },
        { camera: 'player', zoom: 1.25, ms: 1200, actors: ['spark'], fx: 'bloom', holdMs: 1200 },
        { camera: 'player', zoom: 1.0, ms: 700, holdMs: 300 },
    ],
    // 2 void_warden
    [
        { camera: 'boss', zoom: 1.5, ms: 700, fx: 'shake', holdMs: 1600 },
        { camera: { x: 0, y: 0 }, zoom: 0.9, ms: 1800, actors: ['lights'], holdMs: 900 },
        { camera: 'player', zoom: 1.3, ms: 1000, actors: ['spark'], fx: 'bloom', holdMs: 1200 },
        { camera: 'player', zoom: 1.0, ms: 700, holdMs: 300 },
    ],
    // 3 crimson_eclipse — the red drains out
    [
        { camera: 'boss', zoom: 1.6, ms: 600, fx: 'flash', holdMs: 1500 },
        { camera: 'boss', zoom: 1.0, ms: 2000, actors: ['lights'], fx: 'fogburn', holdMs: 800 },
        { camera: 'player', zoom: 1.3, ms: 900, actors: ['spark'], fx: 'bloom', holdMs: 1400 },
        { camera: 'player', zoom: 1.0, ms: 700, holdMs: 300 },
    ],
    // 4 neutron_star — the weight lifts
    [
        { camera: 'boss', zoom: 1.7, ms: 500, fx: 'shake', holdMs: 1200 },
        { camera: 'boss', zoom: 0.8, ms: 2200, actors: ['lights'], holdMs: 900 },
        { camera: 'player', zoom: 1.2, ms: 1000, actors: ['spark'], fx: 'bloom', holdMs: 1300 },
        { camera: 'player', zoom: 1.0, ms: 700, holdMs: 300 },
    ],
    // 5 entropy_titan — stillness after the fall
    [
        { camera: 'boss', zoom: 1.3, ms: 800, fx: 'flash', holdMs: 1800 },
        { camera: { x: 0, y: -160 }, zoom: 0.85, ms: 2000, actors: ['lights'], fx: 'fogburn', holdMs: 1000 },
        { camera: 'player', zoom: 1.35, ms: 1100, actors: ['spark'], fx: 'bloom', holdMs: 1400 },
        { camera: 'player', zoom: 1.0, ms: 700, holdMs: 300 },
    ],
    // 6 darkness — handled by the ending cinematic; kept for completeness (short)
    [
        { camera: 'boss', zoom: 1.2, ms: 1000, fx: 'flash', holdMs: 1200 },
        { camera: 'player', zoom: 1.2, ms: 1200, actors: ['spark', 'lights'], fx: 'bloom', holdMs: 1200 },
    ],
];

// --- chapter openers: after the ChapterCard; a look around the new place, then the spark ---
const OPENER_SHOTS: Shot[][] = [
    // 1 Origin Fields — silence, then you
    [
        { camera: { x: 0, y: -260 }, zoom: 0.8, ms: 1500, actors: ['lights'], holdMs: 1200 },
        { camera: 'player', zoom: 1.3, ms: 1400, actors: ['spark'], fx: 'bloom', holdMs: 1300 },
        { camera: 'player', zoom: 1.0, ms: 600, holdMs: 200 },
    ],
    // 2 Whispering Grove — the void tries to talk: a slow drift
    [
        { camera: { x: 240, y: -120 }, zoom: 0.85, ms: 1600, actors: ['lights'], fx: 'fogburn', holdMs: 1100 },
        { camera: 'player', zoom: 1.2, ms: 1300, actors: ['spark'], holdMs: 1100 },
        { camera: 'player', zoom: 1.0, ms: 600, holdMs: 200 },
    ],
    // 3 Crystal Depths — down
    [
        { camera: { x: 0, y: 300 }, zoom: 0.75, ms: 1700, actors: ['lights'], holdMs: 1200 },
        { camera: 'player', zoom: 1.25, ms: 1300, actors: ['spark'], fx: 'bloom', holdMs: 1100 },
        { camera: 'player', zoom: 1.0, ms: 600, holdMs: 200 },
    ],
    // 4 Abandoned Machinery — something still turns
    [
        { camera: { x: -280, y: 0 }, zoom: 0.8, ms: 1500, actors: ['lights'], fx: 'shake', holdMs: 1200 },
        { camera: 'player', zoom: 1.25, ms: 1300, actors: ['spark'], holdMs: 1100 },
        { camera: 'player', zoom: 1.0, ms: 600, holdMs: 200 },
    ],
    // 5 Void Wastes — nothing, wide
    [
        { camera: { x: 0, y: 0 }, zoom: 0.65, ms: 2000, actors: ['lights'], fx: 'fogburn', holdMs: 1300 },
        { camera: 'player', zoom: 1.2, ms: 1400, actors: ['spark'], fx: 'bloom', holdMs: 1000 },
        { camera: 'player', zoom: 1.0, ms: 600, holdMs: 200 },
    ],
    // 6 Seam of the Void — the last place
    [
        { camera: 'player', zoom: 1.45, ms: 1800, actors: ['spark'], holdMs: 1400 },
        { camera: { x: 0, y: -200 }, zoom: 0.8, ms: 1800, actors: ['lights'], fx: 'fogburn', holdMs: 1200 },
        { camera: 'player', zoom: 1.0, ms: 700, holdMs: 200 },
    ],
];

/** Pre-boss (wave x9): a short push-in while the lines run as a normal caption. No freeze. */
export const PREBOSS_PUSHIN: Shot[] = [
    { camera: 'player', zoom: 1.12, ms: 1500, actors: ['spark'], holdMs: 0 },
    { camera: 'player', zoom: 1.0, ms: 900, holdMs: 0 },
];

/** Ending — over the OUTRO_SCRIPT lines: the dead void, the seam, the light that decides. */
const ENDING_SHOTS: Shot[] = [
    { camera: 'boss', zoom: 1.2, ms: 1500, holdMs: 2500 },                                   // "..." / "So this is what it feels like."
    { camera: 'boss', zoom: 1.6, ms: 2000, actors: ['boss'], fx: 'fogburn', holdMs: 1800 },  // "To be seen."
    { camera: { x: 0, y: -240 }, zoom: 0.8, ms: 2200, actors: ['lights'], fx: 'flash', holdMs: 2400 }, // "Go on, then. Shine." (SEAM_TEAR)
    { camera: { x: 0, y: -240 }, zoom: 0.7, ms: 3000, actors: ['lights'], holdMs: 3800 },    // WATCHER ×2
    { camera: 'player', zoom: 1.1, ms: 2600, actors: ['spark', 'lights'], holdMs: 4200 },     // WATCHER ×2
    { camera: 'player', zoom: 1.6, ms: 2400, actors: ['spark'], fx: 'bloom', holdMs: 3200 },  // "I was a spark." (SEAM_BLOOM) / "Now I am the light."
    { camera: 'player', zoom: 2.2, ms: 3000, actors: ['spark'], fx: 'flash', holdMs: 1400 },  // "And light decides where it goes."
];

export const STORY_CINEMATICS: StoryCinematic[] = [
    ...BOSS_IDS.map((id, i): StoryCinematic => ({ id: `bossIntro_${id}`, lines: { chapter: i + 1, beat: 'bossIntro' }, shots: INTRO_SHOTS[i] })),
    ...BOSS_IDS.map((id, i): StoryCinematic => ({ id: `bossOutro_${id}`, lines: { chapter: i + 1, beat: 'bossOutro' }, shots: OUTRO_SHOTS[i] })),
    ...OPENER_SHOTS.map((shots, i): StoryCinematic => ({ id: `opener_${i + 1}`, lines: { chapter: i + 1, beat: 'opener' }, shots })),
    ...[1, 2, 3, 4, 5, 6].map((c): StoryCinematic => ({ id: `preBoss_${c}`, lines: { chapter: c, beat: 'preBoss' }, shots: PREBOSS_PUSHIN, noFreeze: true })),
    { id: 'ending', lines: 'ending', shots: ENDING_SHOTS },
];

export const storyCinematic = (id: string): StoryCinematic | undefined => STORY_CINEMATICS.find(c => c.id === id);
/** Total length of a shot list in ms (camera travel + holds). */
export const cinematicLengthMs = (c: StoryCinematic): number => c.shots.reduce((t, s) => t + (s.ms ?? 0) + s.holdMs, 0);
