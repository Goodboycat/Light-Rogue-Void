# LIGHT — Game Design Document (v1, chat 0B)

## One line
You are a spark of light in a dying void. Survive 60 waves across 6 chapters, break 6 corrupted-light bosses, and grow — permanently — through a skill tree you can read like a constellation.

## Genre & pillars
Top-down auto-attack action **roguelite** (Canvas 2D, mobile + desktop, itch.io + APK).
1. **Storytelling** — Light (you), Darkness (the void), Watcher (a third voice that only appears at chapter seams). Lines show at wave starts, boss intro/outro, and on discoveries. The bestiary fills as you kill.
2. **Action** — movement + dash are the whole input. Powers fire automatically. Feel comes from hit-stop, shake, flashes, numbers, streaks (4A).
3. **Discovery** — the 3500×3500 world has landmarks, shrines, relics and events you *find*. Nothing is offered as a menu. The world map remembers what you found this run (3A).
4. **Stressful bosses** — every boss is a mechanics test, not an HP sponge: telegraphs you must read, phases, an enrage timer, roaming adds. Dying to a boss should feel like "I know what to do next time" (2B–2D).

## What changes vs the original
| Original | LIGHT |
|---|---|
| Wave = 30 s timer; all enemies deleted at wave end | Wave = kill quota **and** timer; survivors carry over; crowd budget caps total (2A) |
| Bosses: chase + big HP | Framework: arena, telegraphs, 3 phases, enrage, adds (2B) |
| Empty world | Landmarks, shrines, relics, events, fog of discovery (3A) |
| Random tree per device | Seeded constellation tree, identical everywhere (1B) |
| Start at wave N | Start at chapter N (unlocked when you reach its boss) (3B) |
| No audio | Ludo.ai music per chapter + SFX, synth placeholders (6A/6B) |

## Structure
- **60 waves, 6 chapters** of 10. Boss at waves 10/20/30/40/50/60. Special wave at x5 (4B). Endless after 60 (9A).
- Chapters (names + palette + boss):
  1. Origin Fields — pale gold — **The Hive Mind** (swarm pressure, acid pools, kill the spawners)
  2. Whispering Grove — teal — **The Void Warden** (ricochet lines, toxic nebula zones)
  3. Crystal Depths — violet — **Crimson Eclipse** (rotating lasers, safe wedges, eclipse phase)
  4. Abandoned Machinery — rust — **Collapsing Neutron** (gravity pull, orbit rings, pulses)
  5. Void Wastes — indigo — **Entropy Titan** (slams, shockwaves, arena shrinks)
  6. Seam of the Void — black/white — **Darkness** (copies your powers, final test, ending)

## Player
- Stats from tree: HP, regen, speed, dash CD/duration, pickup range, aura dmg, repulsion, projectile count, attack speed, essence mult.
- 14 powers (unlock + 5 levels each in the tree): Fire Blast, Fireflies, Super Dash, Seeking Spirit, Luminous Lash, White Hole, Ice Nova, Titan Shield, Repulsion Field, Thunder Chain, Nebula Trail, Singularity, Solar Flare, Lux Blades.
- Maturity: the spark grows visually with wave (existing `data/maturity.ts`).
- **Essence** (run currency → becomes **Matter** at run end) buys tree nodes. Matter is never lost on death.

## Skill tree (1B)
- ~200 nodes, 3 arcs (Offense / Defense / Utility) from THE SPARK, plus 6 "constellation" clusters, one per chapter, unlocked by defeating that boss once (a permanent reason to beat bosses).
- Deterministic: seeded RNG (mulberry32, seed `0x4C494748` "LIGH"), so docs/screenshots match.
- Respec: refund 80 % (7A).

## Waves (2A)
- Wave N needs `quota(N) = 8 + N*1.5` kills **or** `timer(N) = 30 + min(N,30)` seconds; whichever first. Survivors stay. Crowd budget `maxAlive(N) = 40 + N*3` (cap 300); director pauses spawning when full.
- Elite affixes (4B): Hasted, Armored, Splitting, Vampiric, Shielded. Shown by an outline ring.
- Special waves at x5: Elite Rush, Gauntlet, Curse, Aegis Trial (mechanics from the fork, re-implemented clean).

## Bosses (2B)
- Spawn: a ring arena (radius 900) centres on the player; leaving it applies "Void burn" DOT. Normal spawning switches to "adds": 1 roaming pack every 12 s, capped at 20.
- Telegraph kit: circle, line, cone, ring; 0.6–1.2 s warn then hit. Colour: boss glow with white edge.
- Phases at 100/66/33 % HP; phase shift = 1.2 s invulnerable + arena pulse.
- Enrage at 150 s: damage ×2, telegraphs 30 % faster. Never unkillable.
- Boss HUD: name, HP bar with phase ticks, enrage timer.
- Death → essence shower, outro line, boss added to Archives + unlock its constellation.

## Discovery (3A)
- World 3500². Each run places (seeded by run seed): 3 **landmarks** (lore, visual), 2 **shrines** (one-time run buff you *touch*: e.g. +10 % speed, heal), 1 **relic** (run-only passive, found in a hidden alcove behind a mini-event), 1–2 **events** (ambush, rescue a lost spark, collapsing star).
- Fog of discovery: a minimap corner reveals what you've walked near.
- Nothing pauses the game with a choice. The only choice is: *go there or not*.

## Story (3B)
- Voices: LIGHT (hope, short), DARKNESS (mocking, cold), WATCHER (rare, unsettling, only waves 9/19/29/39/49/59 and the ending).
- Per chapter: opener (wave 1), mid (wave 5), pre-boss (wave 9), boss intro, boss outro.
- Ending after Darkness: Light either stays (endless) or leaves (credits). Both are earned.

## Art (5A/5B)
- Everything procedural Canvas 2D: shapes, gradients, glow, outlines. Visual types: SIMPLE, CRAB, SERPENT, GHOST, STAR, CONSTRUCT, EYE, CRYSTAL, SWARMER + 6 boss types.
- `?gallery=1` renders every enemy, boss, player maturity stage, projectile, drop and prop in a labelled grid. 5B screenshots it, crops each cell by its label box, writes `public/sprites/*.png` + `atlas.json`. A sprite renderer can then be toggled for low-end devices.

## Audio (6A/6B) — Ludo.ai
- Music: 7 loops (6 chapters + title), 90–120 s, seamless.
- SFX: ~40 (see `docs/AUDIO_LUDO.md`, written in 6A). Synth placeholders until the real files arrive in `public/audio/`.

## Platforms
- itch.io HTML (single file + CDN tailwind/fonts), Android APK via Capacitor (10). Desktop keyboard/mouse, mobile joystick + dash button. Pointer-aim optional.

## Non-goals
- No multiplayer, no server, no accounts, no ads, no IAP, no generated art/audio in repo, no boon drafts.
