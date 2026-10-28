// (3A) World definitions — everything you can *find* on the 3500² map.
// Roguelite rule: none of this is ever offered in a menu. You walk there or you don't.
// Placement lives in components/game/logic/WorldLogic.ts, drawing in renderer/WorldRenderer.ts.

export type WorldPointKind = 'landmark' | 'shrine' | 'relic' | 'event';

export interface LandmarkDef {
    id: string;
    name: string;
    chapter: number;      // 1..6 — picked for the chapter the run starts in (plus neighbours)
    color: string;
    /** lore card shown once per run (4 s, non-pausing) */
    lore: string;
    /** one LIGHT line on discovery */
    light: string;
}

export const LANDMARKS: LandmarkDef[] = [
    { id: 'fallen_beacon', name: 'Fallen Beacon', chapter: 1, color: '#fde68a',
      lore: 'A lighthouse for a sea that boiled away. Its lens still turns, lighting nothing.',
      light: 'Someone kept this burning for a long time.' },
    { id: 'whisper_stones', name: 'Whisper Stones', chapter: 2, color: '#2dd4bf',
      lore: 'Seven stones, one voice. They repeat the last words of everything that died near them.',
      light: 'They are saying my name. I never told them.' },
    { id: 'crystal_spire', name: 'Crystal Spire', chapter: 3, color: '#a78bfa',
      lore: 'Grown, not built. Every facet shows a different sky; none of them is this one.',
      light: 'In one of those skies I am not alone.' },
    { id: 'dead_engine', name: 'Dead Engine', chapter: 4, color: '#fb923c',
      lore: 'The machine that was meant to restart the stars. It ran once. Nobody agreed on what it did.',
      light: 'It is warm. Nothing here should be warm.' },
    { id: 'bone_field', name: 'Bone Field', chapter: 5, color: '#818cf8',
      lore: 'Ribs of something that swam between galaxies. The Titan ate the rest.',
      light: 'Even giants end. That is almost comforting.' },
    { id: 'the_seam', name: 'The Seam', chapter: 6, color: '#f8fafc',
      lore: 'Where the void was stitched shut. The thread is coming loose.',
      light: 'Through there. That is where I have to go.' },
];

export type ShrineId = 'haste' | 'mend' | 'ward' | 'greed';

export interface ShrineDef {
    id: ShrineId;
    name: string;
    color: string;
    /** short toast text */
    toast: string;
    light: string;
    /** run modifier deltas applied on touch (see RunModifiers) */
    effect: Partial<RunModifiers>;
    /** instant heal as a fraction of max HP (Mend) */
    healPct?: number;
    /** instant shield points (Ward) */
    shield?: number;
}

export const SHRINES: ShrineDef[] = [
    { id: 'haste', name: 'Shrine of Haste', color: '#38bdf8', toast: '+12 % move speed for this run',
      light: 'Lighter. The void pulls less here.', effect: { speedMult: 0.12 } },
    { id: 'mend', name: 'Shrine of Mend', color: '#4ade80', toast: 'Healed to full · +10 % max HP this run',
      light: 'Whoever left this: thank you.', effect: { maxHpMult: 0.10 }, healPct: 1 },
    { id: 'ward', name: 'Shrine of Ward', color: '#fbbf24', toast: '+3 shield · -15 % damage taken this run',
      light: 'A skin of old light. It will hold for a while.', effect: { damageTakenMult: -0.15 }, shield: 3 },
    { id: 'greed', name: 'Shrine of Greed', color: '#c084fc', toast: '+25 % essence this run',
      light: 'More. The void whispers more. I will take it anyway.', effect: { essenceMult: 0.25 } },
];

export type RelicId = 'ember_core' | 'mirror_shard' | 'hollow_crown' | 'tidal_lens' | 'iron_seed' | 'watchers_eye';

export interface RelicDef {
    id: RelicId;
    name: string;
    color: string;
    glyph: string;      // 1–2 chars drawn on the HUD icon
    desc: string;
    light: string;
    effect: Partial<RunModifiers>;
}

export const RELICS: RelicDef[] = [
    { id: 'ember_core',   name: 'Ember Core',    color: '#f97316', glyph: '✦', desc: '+15 % damage from all powers',
      light: 'It beats. Slowly. Like it is waiting for me to catch up.', effect: { damageMult: 0.15 } },
    { id: 'mirror_shard', name: 'Mirror Shard',  color: '#e0f2fe', glyph: '◇', desc: '+1 dash charge',
      light: 'My reflection moved first.', effect: { dashCharges: 1 } },
    { id: 'hollow_crown', name: 'Hollow Crown',  color: '#a78bfa', glyph: '♛', desc: '+20 % pickup range · +10 % essence',
      light: 'Whoever wore this ruled nothing. It still fits.', effect: { pickupRangeAdd: 60, essenceMult: 0.10 } },
    { id: 'tidal_lens',   name: 'Tidal Lens',    color: '#2dd4bf', glyph: '◉', desc: '+12 % attack speed',
      light: 'Everything slows down when I look through it. Or I speed up.', effect: { attackSpeedMult: 0.12 } },
    { id: 'iron_seed',    name: 'Iron Seed',     color: '#94a3b8', glyph: '●', desc: '+20 % max HP · +1 HP/s regen',
      light: 'Heavy. Good. I was starting to drift.', effect: { maxHpMult: 0.20, regenAdd: 1 } },
    { id: 'watchers_eye', name: "Watcher's Eye", color: '#f8fafc', glyph: '◎', desc: 'Enemies take +10 % damage · reveals the whole map',
      light: 'It blinked. I am sure it blinked.', effect: { enemyDamageTakenMult: 0.10, revealMap: true } },
];

export type WorldEventId = 'ambush' | 'lost_spark' | 'collapsing_star';

export interface WorldEventDef {
    id: WorldEventId;
    name: string;
    color: string;
    caption: string;
    light: string;
    /** seconds the event runs once triggered */
    durationSec: number;
}

export const WORLD_EVENTS: WorldEventDef[] = [
    { id: 'ambush', name: 'Ambush', color: '#ef4444', caption: 'They were waiting. Survive the ring.', durationSec: 18,
      light: 'A trap. Of course it is a trap.' },
    { id: 'lost_spark', name: 'Lost Spark', color: '#fde68a', caption: 'A spark is fading. Stay close until it kindles.', durationSec: 15,
      light: 'Another one. I thought I was the last.' },
    { id: 'collapsing_star', name: 'Collapsing Star', color: '#f97316', caption: 'The star is falling. Dodge the shards; the core is yours.', durationSec: 14,
      light: 'Fall, then. I will be here when you land.' },
];

/** Run-only modifiers (3A). All default to 0/false; applied on top of PlayerStats by the run layer. */
export interface RunModifiers {
    speedMult: number;             // +0.12 → ×1.12
    maxHpMult: number;
    damageTakenMult: number;       // -0.15 → take 85 %
    essenceMult: number;
    damageMult: number;            // powers' outgoing damage
    attackSpeedMult: number;
    pickupRangeAdd: number;
    regenAdd: number;
    dashCharges: number;           // extra dashes before the cooldown applies
    enemyDamageTakenMult: number;  // enemies take more
    revealMap: boolean;
}

export const emptyRunModifiers = (): RunModifiers => ({
    speedMult: 0, maxHpMult: 0, damageTakenMult: 0, essenceMult: 0, damageMult: 0, attackSpeedMult: 0,
    pickupRangeAdd: 0, regenAdd: 0, dashCharges: 0, enemyDamageTakenMult: 0, revealMap: false,
});

export const addRunModifiers = (into: RunModifiers, delta: Partial<RunModifiers>) => {
    for (const k of Object.keys(delta) as (keyof RunModifiers)[]) {
        const v = delta[k];
        if (typeof v === 'boolean') (into as any)[k] = into[k] || v;
        else if (typeof v === 'number') (into as any)[k] = (into[k] as number) + v;
    }
};

export const landmarkById = (id: string) => LANDMARKS.find(l => l.id === id);
export const shrineById = (id: string) => SHRINES.find(s => s.id === id);
export const relicById = (id: string) => RELICS.find(r => r.id === id);
export const worldEventById = (id: string) => WORLD_EVENTS.find(e => e.id === id);
