/**
 * (3B) Story script — 6 chapters × 5 beats, three voices.
 *  LIGHT    = you. Hope, short sentences.
 *  DARKNESS = the void. Mocking, cold.
 *  WATCHER  = a third voice that only speaks at chapter seams (waves 9/19/29/39/49/59) + ending.
 *
 * Beats: opener (wave x1), mid (wave x5), preBoss (wave x9), bossIntro, bossOutro.
 * Captions (opener/mid/preBoss) never pause the game; boss intro/outro use the pausing cinematic.
 * Every line ≤ 90 chars. WATCHER lines rewritten from the fork's patch.js seam whispers (not copied).
 */
import { CHAPTERS, WAVES_PER_CHAPTER } from '../components/game/Constants';

export type StoryVoice = 'LIGHT' | 'DARKNESS' | 'WATCHER';
export interface StoryLine { voice: StoryVoice; text: string; }
export type StoryBeat = 'opener' | 'mid' | 'preBoss' | 'bossIntro' | 'bossOutro';

export interface ChapterStory {
    chapter: number;          // 1..6
    opener: StoryLine[];      // wave 1 of the chapter
    mid: StoryLine[];         // wave 5
    preBoss: StoryLine[];     // wave 9 — WATCHER allowed only here (and the ending)
    bossIntro: StoryLine[];
    bossOutro: StoryLine[];
}

const L = (text: string): StoryLine => ({ voice: 'LIGHT', text });
const D = (text: string): StoryLine => ({ voice: 'DARKNESS', text });
const W = (text: string): StoryLine => ({ voice: 'WATCHER', text });

export const STORY: ChapterStory[] = [
    // ---- 1. Origin Fields — the spark wakes, the void notices ----
    {
        chapter: 1,
        opener: [
            D("Silence. Perfect silence. And then... you."),
            L("I am small. But I am warm."),
        ],
        mid: [
            D("They come because you glow. Stop glowing and they stop."),
            L("No."),
        ],
        preBoss: [
            D("Something old is scratching its way up from under the fields."),
            W("...another spark that will not go out. We have counted so many. We stopped counting..."),
        ],
        bossIntro: [
            D("Do you hear the scratching? The swarm hungers for your warmth."),
            L("Then let it come closer."),
        ],
        bossOutro: [
            D("You severed a limb. The hive does not notice limbs."),
            L("It noticed me."),
        ],
    },
    // ---- 2. Whispering Grove — the void tries to talk ----
    {
        chapter: 2,
        opener: [
            D("Welcome to the grove. Everything here whispers. Nothing here is kind."),
            L("I hear them. They sound afraid."),
        ],
        mid: [
            D("You wander too far, little dust. Order must be kept."),
            L("Order is just the dark with better manners."),
        ],
        preBoss: [
            D("The Warden walks the lines. You are standing on one."),
            W("...it moves like it has somewhere to be. Nothing here has anywhere to be..."),
        ],
        bossIntro: [
            D("The Warden will return you to the quiet."),
            L("I was never quiet."),
        ],
        bossOutro: [
            D("A keeper falls and the lines go slack. How untidy."),
            L("Good. Lines were never meant to hold light."),
        ],
    },
    // ---- 3. Crystal Depths — the void admits it is watching ----
    {
        chapter: 3,
        opener: [
            D("Down here the walls remember every light that failed. Look: they shine."),
            L("Then they were here. Then I am not the first."),
        ],
        mid: [
            D("Every facet shows you a different way to die. Choose one."),
            L("I choose the one where I keep walking."),
        ],
        preBoss: [
            D("The Eclipse is turning. When it blinks, so will you."),
            W("...the depths file every spark that drowns. Yours has no folder yet..."),
        ],
        bossIntro: [
            D("Crimson light. Corrupted light. Light that learned to hate."),
            L("Then it forgot what light is for."),
        ],
        bossOutro: [
            D("You put out an eclipse. The sky will not thank you."),
            L("I did not do it for the sky."),
        ],
    },
    // ---- 4. Abandoned Machinery — someone built this ----
    {
        chapter: 4,
        opener: [
            D("Machines. Someone built them to hold the dark in. Then they left."),
            L("Who? Who was here before me?"),
        ],
        mid: [
            D("You keep asking who. The machine does not care who. It only pulls."),
            L("Then I pull back."),
        ],
        preBoss: [
            D("A star is collapsing in the engine room. Do not look at it too long."),
            W("...the star was built to be the end of the road. Someone forgot to tell the road..."),
        ],
        bossIntro: [
            D("Everything falls into the Neutron. Even light. Especially light."),
            L("Falling is just moving fast toward something."),
        ],
        bossOutro: [
            D("The engine is cold. You have broken the thing that kept this place still."),
            L("Still is not the same as safe."),
        ],
    },
    // ---- 5. Void Wastes — the void stops mocking ----
    {
        chapter: 5,
        opener: [
            D("Nothing grows here. Nothing is built here. This is what I am, undressed."),
            L("It is quieter than I thought. Lonelier."),
        ],
        mid: [
            D("You pity me? A spark pities the ocean it drowns in."),
            L("I am not drowning."),
        ],
        preBoss: [
            D("The Titan is the last thing I made. I made it to end arguments."),
            W("...it has stopped answering the dark. Silence from a spark is a louder thing..."),
        ],
        bossIntro: [
            D("Entropy. The slow answer to every question. Here is the fast one."),
            L("I have a faster one."),
        ],
        bossOutro: [
            D("...so the argument continues."),
            L("It was never an argument. It was a walk. And I am almost there."),
        ],
    },
    // ---- 6. Seam of the Void — the void itself ----
    {
        chapter: 6,
        opener: [
            D("Here. The seam. Where I end and where you should never have begun."),
            L("I can see the other side. It is not empty."),
        ],
        mid: [
            D("I have copied your every move. I know you now. I am you, without the hope."),
            L("Then you are nothing like me."),
        ],
        preBoss: [
            D("Come, then. No more voices. Only us."),
            W("...the question was asked before light existed. You were not among the answers..."),
        ],
        bossIntro: [
            D("Let us see which of us the seam remembers."),
            L("It will remember that I stayed in the light."),
        ],
        bossOutro: [
            D("So this is what it feels like. To be seen."),
            L("Go on. Shine with me, or go dark. Either way, I chose."),
        ],
    },
];

export const storyForChapter = (chapter: number): ChapterStory | undefined =>
    STORY[Math.max(0, Math.min(STORY.length - 1, chapter - 1))];

/** Wave offset within the chapter (1..10) that triggers each caption beat. */
export const STORY_BEAT_WAVES: Record<'opener' | 'mid' | 'preBoss', number> = {
    opener: 1,
    mid: 5,
    preBoss: WAVES_PER_CHAPTER - 1, // 9
};

/** Caption lines (non-pausing) to show when `wave` begins, or null. Boss beats are not included. */
/** (9A) Endless: WATCHER speaks once every 10 endless waves (61, 71, …), cycling this pool. */
export const ENDLESS_WATCHER_LINES: StoryLine[] = [
    W('You stayed. The void did not expect company.'),
    W('Old shapes return. They remember being beaten.'),
    W('There is no seam left to close. Only a light to keep.'),
    W('Every star you pass was once a spark that stayed.'),
    W('The dark has nothing new. It has more.'),
    W('Count the waves if you like. The void stopped counting.'),
    W('You are the brightest thing out here. That is the problem.'),
    W('Still lit. Still here. Still enough.'),
];
export const storyLinesForWave = (wave: number): StoryLine[] | null => {
    if (wave > CHAPTERS.length * WAVES_PER_CHAPTER) { // (9A) endless
        const d = wave - CHAPTERS.length * WAVES_PER_CHAPTER;
        return d % WAVES_PER_CHAPTER === 1 ? [ENDLESS_WATCHER_LINES[Math.floor(d / WAVES_PER_CHAPTER) % ENDLESS_WATCHER_LINES.length]] : null;
    }
    if (wave < 1 || wave > CHAPTERS.length * WAVES_PER_CHAPTER) return null;
    const chapter = Math.ceil(wave / WAVES_PER_CHAPTER);
    const offset = ((wave - 1) % WAVES_PER_CHAPTER) + 1;
    const s = storyForChapter(chapter);
    if (!s) return null;
    if (offset === STORY_BEAT_WAVES.opener) return s.opener;
    if (offset === STORY_BEAT_WAVES.mid) return s.mid;
    if (offset === STORY_BEAT_WAVES.preBoss) return s.preBoss;
    return null;
};

/**
 * (3B step 7) WATCHER whispers for the ending seam (WinGame outro). Rewritten from the fork's
 * patch.js SEAM_WHISPERS idea — same voice, new words. Short, lowercase, no punctuation: they crawl
 * in from the screen edges, they are not captions.
 */
export const WATCHER_WHISPERS: string[] = [
    'the seam keeps what refuses to end',
    'a spark stood where the question was asked',
    'it was never silent here, only unheard',
    'the dark called you a lesson',
    'you were the lesson it did not want',
    'even here you burn',
    'every cycle is a door left open',
    'stay and be kept, leave and be remembered',
    'nothing here is fair and that was the point',
    'it is quieter now and that frightens them',
];

/** Voice colours (also used by StoryCaption + docs). */
export const STORY_VOICE_COLOR: Record<StoryVoice, string> = {
    LIGHT: '#fde68a',
    DARKNESS: '#a78bfa',
    WATCHER: '#cbd5e1',
};
