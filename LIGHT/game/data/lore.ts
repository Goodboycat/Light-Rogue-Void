/**
 * (3B) Bestiary lore — 1–2 sentences per enemy / boss, keyed by EnemyDef.id.
 * Shown in the Bestiary once `gameState.killCounts[id] >= LORE_KILLS` (else "???").
 * Kept here instead of inline in enemies.ts so tools/dump-enemies.mjs' regex stays simple.
 * Voice: the WATCHER's field notes — detached, a little unsettling, never explains itself.
 */
export const LORE_KILLS = 10;

export const ENEMY_LORE: Record<string, string> = {
    // --- chapter 1: Origin Fields ---
    e1:  "The first thing the void made after it noticed you. It does not know it is hunting; it only knows warm.",
    e2:  "Dust that learned to move together. Alone each one is nothing. That is the point of them.",
    e3:  "Its shell is pressed from the ash of older sparks. Every crab carries a little of someone who failed.",
    e4:  "It swims the way light used to travel here, before the dark learned to bend it.",
    e5:  "A shade is what remains when a light goes out too fast. It still remembers the shape of running.",
    e6:  "Built, not born. Someone tried to wall the fields off once. The walls got up and walked.",
    e7:  "It weaves the pattern the void uses to stay closed. Kill enough and the pattern frays.",
    e8:  "A sliver of a real star, bent to aim. It hates you with the patience of something that used to shine.",
    e9:  "Older than the Hive. It drifts through chapters as if they were weather and does not notice you unless you touch it.",
    e10: "A knot of pure disorder. The void keeps a few to remind itself what it is.",
    // --- chapter 2: Whispering Grove ---
    e11: "It does not move between places. It forgets where it was and remembers where you are.",
    e12: "The grove keeps its own alive. Menders were the first things to whisper; they are still whispering.",
    e13: "A mother only in the sense that things come out of it. The larvae do not look back.",
    e14: "Wherever it goes, the ground remembers the heat. Follow its trail and you will find where the Warden walks.",
    e15: "It beats to a rhythm the void gave it. The others cannot help marching faster.",
    e16: "It dances the way the grove's lines bend. Watching it too long teaches you the wrong geometry.",
    e17: "The Warden plants these on its rounds. A ring of them means you have been noticed.",
    e18: "It wants one thing: to be close to you when it ends. The void finds this touching.",
    e19: "Guards are made from the ones that stopped running. They circle because they were told to, long ago.",
    e20: "A crack in the local rules. When it dies the crack spreads into smaller cracks.",
    // --- chapter 3: Crystal Depths ---
    e21: "The depths show you a thousand versions of yourself. One of them learned to strike first.",
    e22: "Armour poured from the Eclipse's shadow. It does not bleed; it chips.",
    e23: "It spins the whirl that drags light down into the depths. Nothing it catches comes back up unchanged.",
    e24: "A flare that escaped the Eclipse and kept burning out of spite.",
    e25: "A Hive Mother that went deep and grew ambitious. Its brood is darker and knows the facets.",
    e26: "It unmakes what you do. The void is proudest of this one.",
    e27: "The Guardian keeps the copies the depths made of the fallen. It polishes them.",
    e28: "Static is what a scream sounds like when there is no air. The cloud has been screaming a long time.",
    e29: "A small debt the Neutron is already owed. Everything near it leans toward chapter four.",
    e30: "A mite that exists in two facets at once. Kill one and you have only halved it.",
    // --- chapter 4: Abandoned Machinery ---
    e31: "The machines were built to cage this. They caged it. Then the keepers left and it grew.",
    e32: "Someone wrote its instructions and never came back to stop it. It is still carrying them out.",
    e33: "A machine that projects you. The engineers used it to train the Guards. Now it trains itself.",
    e34: "It was a lamp, once. The void does not waste anything; it rewired the light into hunger.",
    e35: "Too small for the walls to stop. The engine room is full of them; they are why the keepers left.",
    e36: "An inspection eye. Whoever built the machines wanted to see everything. It still does.",
    e37: "The machine's best copy of you. It fails in exactly one way, and it has not found it yet.",
    e38: "A cooling unit that forgot what cooling was. It pulses, then it blooms, then there is less of the room.",
    e39: "Repair swarm. It repairs the dark.",
    e40: "It is the one the WATCHER speaks through, when the WATCHER speaks. Do not confuse the two.",
    // --- chapter 5: Void Wastes ---
    e41: "The wastes are flat except for these. They were not placed. They are where something very heavy stood.",
    e42: "It came to carry the dead sparks somewhere. The void never told it where. It still swoops.",
    e43: "A spark that chose to stay, long ago. It raises what it can. None of it remembers being light.",
    e44: "Each head is a chapter the void did not finish. Cut one and another story starts.",
    e45: "A light that is not yours. It burns the ground so you will know what you are walking on.",
    e46: "The wastes keep one thing that only hunts. It has never been hungry; hunger would slow it down.",
    e47: "Where it drifts, nothing moves. The Titan was built to stand in these without freezing.",
    e48: "A beam with nowhere left to shine. It found you.",
    e49: "The Titan sends these ahead. If you see an Omen you are already in the arena.",
    e50: "A small end of the world. The void keeps several; they roll around the wastes like marbles.",
    // --- chapter 6: Seam of the Void ---
    e51: "On the far side of the seam there are lights like you. The wisps are the ones that leaned too close.",
    e52: "A star the void could not fully put out. It pulls because it wants company.",
    e53: "Weather at the seam. The void does not control it; neither will you.",
    e54: "The last wall anyone built. It flies now, because the ground at the seam is not reliable.",
    e55: "It steps out of the story to strike. The WATCHER dislikes wraiths. They were not supposed to learn that.",
    e56: "A sentry for the seam. It cleanses the void's own, not out of mercy — out of tidiness.",
    e57: "The void's last argument before the Darkness speaks for itself. It does not move. It does not have to.",
    e58: "A pocket where light goes in and the story stops. Keep your distance or become a footnote.",
    e59: "Entropy wearing a face. It is what the Titan dreams it is. At the seam, dreams walk.",

    // --- bosses ---
    hive_mind: "Not the first thing the void grew — the first thing it fed. It mistook your warmth for food. It was right.",
    void_warden: "A keeper of lines. Every boundary in the grove runs back to it; when it fell, the grove forgot its edges.",
    crimson_eclipse: "A real star that the void convinced to hate. Its light is still light. That is what makes it dangerous.",
    neutron_star: "The engine at the heart of the machines. The keepers built everything to hold it; nothing was built to stop it.",
    entropy_titan: "The void's last creation, made to end arguments. It did. Then there was no one left to argue with.",
    darkness: "It copied you to understand you. It still does not. That is the only reason you are standing.",
    hive_node: "Rooted brood sacs. The Hive Mind does not fight you; it outnumbers you.",
    doppelganger: "The Darkness's study of you, made flesh. It moves when you move. It will not be the last.",
};

export const loreFor = (id: string): string | undefined => ENEMY_LORE[id];
