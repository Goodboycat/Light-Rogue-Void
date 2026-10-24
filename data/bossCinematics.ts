import { CinematicSequence } from '../components/game/types';

export const BOSS_SCRIPTS: Record<string, { intro: CinematicSequence[], outro: CinematicSequence[] }> = {
    'hive_mind': {
        intro: [
            { speaker: 'DARKNESS', text: "You are too bright for this world.", duration: 3000 },
            { speaker: 'DARKNESS', text: "The swarm will extinguish you.", duration: 3000, visualAction: 'BOSS_SPAWN_ROAR' }
        ],
        outro: [
            { speaker: 'DARKNESS', text: "A lucky spark...", duration: 2500, visualAction: 'BOSS_DEATH_FLARE' },
            { speaker: 'DARKNESS', text: "But the dark is endless.", duration: 3000, visualAction: 'RESUME_GAME' }
        ]
    },
    'void_warden': {
        intro: [
            { speaker: 'DARKNESS', text: "You wander too far, little dust.", duration: 3000 },
            { speaker: 'DARKNESS', text: "Order must be kept.", duration: 2500 },
            { speaker: 'DARKNESS', text: "The Warden will return you to the quiet.", duration: 3000, visualAction: 'BOSS_SPAWN_ROAR' }
        ],
        outro: [
            { speaker: 'DARKNESS', text: "The walls... shattered?", duration: 2500, visualAction: 'BOSS_DEATH_FLARE' },
            { speaker: 'DARKNESS', text: "You are not just a dust.", duration: 3000 },
            { speaker: 'DARKNESS', text: "You are a poison.", duration: 2500 },
            { speaker: 'LIGHT', text: "I am not a poison.", duration: 2500, visualAction: 'WHITE_FLASH' },
            { speaker: 'LIGHT', text: "I am the cure for the universe.", duration: 3000, visualAction: 'RESUME_GAME' }
        ]
    },
    'crimson_eclipse': {
        intro: [
            { speaker: 'DARKNESS', text: "Look closely.", duration: 2000 },
            { speaker: 'DARKNESS', text: "This star once fought me, just like you.", duration: 3500 },
            { speaker: 'DARKNESS', text: "Now it screams in eternal agony.", duration: 3000 },
            { speaker: 'DARKNESS', text: "Join the choir.", duration: 2500, visualAction: 'BOSS_SPAWN_ROAR' }
        ],
        outro: [
            { speaker: 'DARKNESS', text: "You extinguished it...", duration: 2500, visualAction: 'BOSS_DEATH_FLARE' },
            { speaker: 'DARKNESS', text: "Mercy? Or murder?", duration: 3000 },
            { speaker: 'LIGHT', text: "It was already dead.", duration: 2500, visualAction: 'WHITE_FLASH' },
            { speaker: 'LIGHT', text: "I just closed its eyes.", duration: 3000, visualAction: 'RESUME_GAME' }
        ]
    },
    'neutron_star': {
        intro: [
            { speaker: 'DARKNESS', text: "Darkness is the law.", duration: 2500 },
            { speaker: 'DARKNESS', text: "It crushes hope into dust.", duration: 3000 },
            { speaker: 'DARKNESS', text: "Feel the despair of your existence.", duration: 3000, visualAction: 'BOSS_SPAWN_ROAR' }
        ],
        outro: [
            { speaker: 'DARKNESS', text: "YOU...", duration: 2000, visualAction: 'BOSS_DEATH_FLARE' },
            { speaker: 'DARKNESS', text: "Give up, there is no hope for light", duration: 3000 },
            { speaker: 'LIGHT', text: "From light hope will born.", duration: 2500, visualAction: 'WHITE_FLASH' },
            { speaker: 'LIGHT', text: "I am the hope bringer.", duration: 3000, visualAction: 'RESUME_GAME' }
        ]
    },
    'entropy_titan': {
        intro: [
            { speaker: 'DARKNESS', text: "Enough games.", duration: 2000 },
            { speaker: 'DARKNESS', text: "I built this to end universes.", duration: 3000 },
            { speaker: 'DARKNESS', text: "You are nothing against the machine of fate.", duration: 3500, visualAction: 'BOSS_SPAWN_ROAR' }
        ],
        outro: [
            { speaker: 'DARKNESS', text: "My machine...", duration: 2500, visualAction: 'BOSS_DEATH_FLARE' },
            { speaker: 'DARKNESS', text: "Broken into scrap.", duration: 3000 },
            { speaker: 'LIGHT', text: "There is a purpose for me.", duration: 2500, visualAction: 'WHITE_FLASH' },
            { speaker: 'LIGHT', text: "And I will acomplish it.", duration: 3000, visualAction: 'RESUME_GAME' }
        ]
    },
    'darkness': {
        intro: [
            { speaker: 'DARKNESS', text: "Fine.", duration: 2000 },
            { speaker: 'DARKNESS', text: "If the universe will not kill you...", duration: 3000 },
            { speaker: 'DARKNESS', text: "I WILL DO IT MYSELF.", duration: 4000, visualAction: 'BOSS_SPAWN_ROAR' }
        ],
        outro: [
            { speaker: 'DARKNESS', text: "No... NO! I am the Void. I am the end.", duration: 3000, visualAction: 'BOSS_DEATH_FLARE' },
            { speaker: 'DARKNESS', text: "I cannot be defeated. I will reform. I will revive...", duration: 3000 },
            { speaker: 'LIGHT', text: "I know. You cannot be truly destroyed.", duration: 3000, visualAction: 'WHITE_FLASH' },
            { speaker: 'LIGHT', text: "But you will no longer govern over me.", duration: 3000 },
            { speaker: 'LIGHT', text: "Through this cruel adventure, I have proven I have the right to exist.", duration: 3500 },
            { speaker: 'DARKNESS', text: "Irritating... spark...", duration: 2500 },
            { speaker: 'LIGHT', text: "I am more than a spark now. I am the Light.", duration: 3500, visualAction: 'WHITE_FLASH' }
        ]
    }
};
