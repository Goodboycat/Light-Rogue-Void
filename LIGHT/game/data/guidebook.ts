// (7A) Read-only guidebook. Entries are static text; "seen" state is derived from the save
// (maxWaveReached / defeatedBosses / landmarksSeen / killCounts) — nothing is stored for it.
import { GameState } from '../types';
import { CHAPTERS } from '../components/game/Constants';
import { BOSSES } from '../bosses';
import { LANDMARKS, SHRINES, RELICS, WORLD_EVENTS } from './world';

export type GuideTab = 'controls' | 'waves' | 'bosses' | 'discoveries';

export interface GuideEntry {
    id: string;
    title: string;
    body: string;
    /** false → shown as a locked "???" row */
    seen: boolean;
}

const CONTROLS: Omit<GuideEntry, 'seen'>[] = [
    { id: 'move', title: 'Move', body: 'WASD / arrows, or the left joystick. The spark auto-fires at the nearest threat; you decide where to stand.' },
    { id: 'aim', title: 'Aim', body: 'Mouse position (or the right joystick) sets the shot direction. Keep enemies on one side; let the void fill the other.' },
    { id: 'dash', title: 'Dash', body: 'Shift / right-click / DASH button. Short invulnerability, cooldown shown on the button. Dash through telegraphs, not away from them.' },
    { id: 'burst', title: 'Light Burst', body: 'Space / E / ☀ once unlocked in the Utility spine of the tree. Fills with kills; fire to stun and shove everything in 440 px. Bosses take half.' },
    { id: 'pause', title: 'Pause / Tree', body: 'Esc or the ☰ button opens the Evolution Matrix. Spend matter mid-run — nodes apply immediately. The run never offers choices; the map hides them.' },
    { id: 'skip', title: 'Story', body: 'LIGHT, DARKNESS and the WATCHER speak in captions that never pause the run. The chapter card and boss intros do.' },
];

const WAVES: Omit<GuideEntry, 'seen'>[] = [
    { id: 'waves', title: 'Waves', body: 'A wave ends on a kill quota or a timer, whichever first. Nothing is wiped between waves — what you leave alive follows you.' },
    { id: 'chapters', title: 'Chapters', body: 'Every 10 waves is a place on the world map; wave 10 of a place is its boss. After the boss the map opens — CONTINUE or RETURN TO MENU keeping your essence.' },
    { id: 'special', title: 'Special waves', body: 'Waves 5 · 15 · 25 · 35 · 45 · 55 carry a banner: Elite Rush, Gauntlet, Curse or Aegis Trial. Read the banner; it tells you what changes.' },
    { id: 'affixes', title: 'Elite affixes', body: 'Hasted · Armored · Splitting · Vampiric · Shielded. A ring around the enemy shows the affix colour; two affixes appear from wave 30.' },
    { id: 'packs', title: 'Packs', body: 'Enemies arrive in packs of 3–8 behind a 0.6 s warning glow. Shooters flash 0.4 s before they fire.' },
    { id: 'essence', title: 'Essence → Matter', body: 'Essence drops from kills and streaks. On death or return it converts to Matter, the only currency of the Evolution Matrix.' },
];

export const buildGuidebook = (gs: GameState): Record<GuideTab, GuideEntry[]> => {
    const maxWave = gs.maxWaveReached || 1;
    const bossesSeen = new Set(gs.defeatedBosses ?? []);
    const landmarks = new Set(gs.landmarksSeen ?? []);
    const kills = gs.killCounts ?? {};
    const seenEnemy = (id: string) => (kills[id] ?? 0) > 0;

    const bosses: GuideEntry[] = CHAPTERS.map(ch => {
        const def = BOSSES.find(b => b.id === ch.bossId);
        const reached = maxWave >= ch.bossWave;
        const beaten = bossesSeen.has(ch.bossId);
        return {
            id: ch.bossId,
            title: `${ch.name} · ${def?.name ?? ch.bossId}`,
            body: beaten
                ? `${def?.description ?? ''} Defeated. Arena 900 px — the edge burns. Three phases at 100 / 66 / 33 %; the boss is invulnerable during the shift. Enrage at 150 s.`
                : reached
                    ? `${def?.description ?? ''} Not yet defeated. Watch the telegraph shapes — damage lands only when they fire.`
                    : 'Reach this place to read about its guardian.',
            seen: reached,
        };
    });

    const discoveries: GuideEntry[] = [
        { id: 'how', title: 'How discovery works', body: 'Each run seeds landmarks, shrines, a hidden relic and events on the 3500 px world. Walk toward glows; nothing is ever offered as a choice.', seen: true },
        ...LANDMARKS.map(l => ({ id: l.id, title: `Landmark · ${l.name}`, body: l.lore, seen: landmarks.has(l.id) })),
        ...SHRINES.map(s => ({ id: s.id, title: s.name, body: `Touch once per run. ${s.toast}.`, seen: maxWave >= 3 })),
        ...RELICS.map(r => ({ id: r.id, title: `Relic · ${r.name}`, body: `Found in a guarded alcove. ${r.desc}`, seen: maxWave >= 5 })),
        ...WORLD_EVENTS.map(e => ({ id: e.id, title: `Event · ${e.name}`, body: `${e.caption} It begins when you enter its ring and lasts ${e.durationSec} s.`, seen: maxWave >= 4 })),
        { id: 'found', title: 'Found events', body: 'Golden Mite, Essence Tide, Treasure Pylon, Ambush Ring, Meteor Shower — they happen to you while you play; none is chosen.', seen: maxWave >= 2 || seenEnemy('golden_mite') },
        { id: 'caches', title: 'Map treasure caches', body: 'After a boss dies, a side path appears on the world map near its place. Tap it once for matter.', seen: bossesSeen.size > 0 },
    ];

    return {
        controls: CONTROLS.map(e => ({ ...e, seen: true })),
        waves: WAVES.map(e => ({ ...e, seen: true })),
        bosses,
        discoveries,
    };
};
