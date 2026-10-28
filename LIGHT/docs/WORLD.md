# WORLD — everything you can *find* on the 3500² map (3A)

Roguelite rule: none of this is ever offered in a menu. You walk there or you don't.
Source of truth: `game/data/world.ts` (defs), `game/components/game/logic/WorldLogic.ts` (placement + fog),
`logic/WorldInteract.ts` (touch / events), `logic/FoundEvents.ts` (roaming events), `renderer/WorldRenderer.ts`,
`renderer/MinimapRenderer.ts`, constants `Constants.ts` (`WORLD_*`).

## Placement (per run)
| Rule | Value |
|------|-------|
| Seed | `state.runSeed` = `?seed=` or `Date.now()`; mulberry32 (`utils/rng.ts`) |
| Points | **3 landmarks + 2 shrines + 1 relic alcove + 1–2 events = 7–8** |
| Landmark pick | the run's starting chapter + neighbours (never the same twice) |
| Margins | ≥ 220 px from the world edge · ≥ 600 px from spawn (0,0) · ≥ 500 px apart |
| Touch radius | 70 px + player size |
| Glow pulse | undiscovered points pulse while the player is ≤ 900 px away |
| Off-screen arrow | nearest undiscovered point, chapters 1–2 only, with distance label |
| Fog | 20×20 grid, cell visited when the player stands in it (marked every 6 frames) |
| Minimap | 120×120 (88 on phones), fog + discovered points + arena ring + explored %, `settings.showMinimap` |
| Director | **paused** (not capped) while a placed event / relic alcove runs (`state.worldEventActive`) |

## Landmarks (lore card 4 s, non-pausing, once per run → `gameState.landmarksSeen`)
| Id | Name | Chapter | Colour | Lore | LIGHT line |
|----|------|---------|--------|------|------------|
| `fallen_beacon` | Fallen Beacon | 1 | `#fde68a` | A lighthouse for a sea that boiled away. Its lens still turns, lighting nothing. | Someone kept this burning for a long time. |
| `whisper_stones` | Whisper Stones | 2 | `#2dd4bf` | Seven stones, one voice. They repeat the last words of everything that died near them. | They are saying my name. I never told them. |
| `crystal_spire` | Crystal Spire | 3 | `#a78bfa` | Grown, not built. Every facet shows a different sky; none of them is this one. | In one of those skies I am not alone. |
| `dead_engine` | Dead Engine | 4 | `#fb923c` | The machine that was meant to restart the stars. It ran once. Nobody agreed on what it did. | It is warm. Nothing here should be warm. |
| `bone_field` | Bone Field | 5 | `#818cf8` | Ribs of something that swam between galaxies. The Titan ate the rest. | Even giants end. That is almost comforting. |
| `the_seam` | The Seam | 6 | `#f8fafc` | Where the void was stitched shut. The thread is coming loose. | Through there. That is where I have to go. |

## Shrines (one-time touch, run-only buff via `state.runModifiers`)
| Id | Name | Colour | Effect | Instant |
|----|------|--------|--------|---------|
| `haste` | Shrine of Haste | `#38bdf8` | +12 % move speed | — |
| `mend` | Shrine of Mend | `#4ade80` | +10 % max HP | heal to full |
| `ward` | Shrine of Ward | `#fbbf24` | −15 % damage taken | +3 shield |
| `greed` | Shrine of Greed | `#c084fc` | +25 % essence | — |

## Relics (alcove guarded by **8 telegraphed elites**; relic drops at 0 guards; HUD glyph chip `#relic-hud`)
| Id | Name | Glyph | Colour | Effect |
|----|------|-------|--------|--------|
| `ember_core` | Ember Core | ✦ | `#f97316` | +15 % damage from all powers |
| `mirror_shard` | Mirror Shard | ◇ | `#e0f2fe` | +1 dash charge (`state.dashChargesLeft`) |
| `hollow_crown` | Hollow Crown | ♛ | `#a78bfa` | +60 px pickup range · +10 % essence |
| `tidal_lens` | Tidal Lens | ◉ | `#2dd4bf` | +12 % attack speed |
| `iron_seed` | Iron Seed | ● | `#94a3b8` | +20 % max HP · +1 HP/s regen |
| `watchers_eye` | Watcher's Eye | ◎ | `#f8fafc` | enemies take +10 % damage · reveals the whole map (fog) |

`RunModifiers` fields: `speedMult maxHpMult damageTakenMult essenceMult damageMult attackSpeedMult pickupRangeAdd regenAdd dashCharges enemyDamageTakenMult revealMap`.
Applied by `logic/RunStats.ts` (tree stats × runModifiers → effective `PlayerStats`, cached).

## Placed events (a point on the map; walk in to start; director paused while running)
| Id | Name | Colour | Duration | What happens | Reward |
|----|------|--------|----------|--------------|--------|
| `ambush` | Ambush | `#ef4444` | 18 s | 10 + wave/4 (≤ 20) enemies land on a 320 px ring after 0.8 s telegraphs; every 4th is elite | 14 essence drops (6 + wave each) |
| `lost_spark` | Lost Spark | `#fde68a` | 15 s | stay within 180 px for 8 s total (progress decays at half speed outside) | heal 30 % · +1 shield; fail → "It passed." |
| `collapsing_star` | Collapsing Star | `#f97316` | 14 s | shard every 30 f (70 px circle, 45 f warn, 12 % max HP), aimed near you inside 420 px | 6 drops of 15 + 2·wave |

## Found events (3A step 7 — roaming director, `logic/FoundEvents.ts`, ported from the fork `events.ts`)
Never chosen. ≥ **25 s** between events, nothing in the first 20 s, never on wave 1, never during a boss or a placed event.
Random roll once per second: `p = min(0.25, 0.02 + 0.004·calmSeconds)`; Essence Tide is on its own 70–100 s clock. 2 s caption via `state.worldCard`.
| Id | Name | Colour | Trigger | What happens | Reward |
|----|------|--------|---------|--------------|--------|
| `GOLDEN_MITE` | Golden Mite | `#fbbf24` | 4 % of director/trickle spawns from wave 3, max 1 alive | ×2.5 HP, gold, flees at 2.6 within 320 px, blinks away after 6 s; affixes stripped | **×25 essence** on kill |
| `ESSENCE_TIDE` | Essence Tide | `#38bdf8` | every 70–100 s | 6 s | all kill essence **×2** (`foundEssenceMult`) |
| `TREASURE_PYLON` | Treasure Pylon | `#fde047` | roll 34 % | static CRYSTAL enemy 500 px away, HP 120 + 10·wave (+wave² scaling), lives 12 s then sinks | 10 drops (6 + wave) + **+1 shield** |
| `AMBUSH_RING` | Ambush Ring | `#f43f5e` | roll 33 % | 1 s ring telegraph (340 px) + green 60° gap cone; 10 enemies land on the ring minus the gap | survival |
| `METEOR_SHOWER` | Meteor Shower | `#f97316` | roll 33 % | 6 s, a 75 px circle every 30 f within 260 px (1 s warn, 10 % max HP, dash is immune) | every 5 dodges → essence drop (5 × (1 + wave/5)) |

Found events seen this run: `state.foundEvents.found[]` (not persisted yet — 8A run stats).

## World Map (7C — between chapters, not inside the arena)
`components/WorldMap.tsx` draws the star chart (seed `0x4c494748`, 1024×683 virtual canvas scaled to fit; static layer cached offscreen). Places: 6 chapters at the picture's slots 1,2,3,4,5,8; 4 faint `?` future places. Path = Catmull-Rom through `PATH_VIAS`, dotted; `@` glyph nodes are decorative. State derives only from `maxWaveReached`, `defeatedBosses`, `mapTreasuresOpened`.
**Treasure caches** (`MAP_TREASURES`, revealed when `from` chapter's boss is dead, opened once): cache_1 60 · cache_2 90 · cache_3 120 · cache_4 160 · cache_5 220 · cache_6 320 matter. Hit radii `PLACE_HIT_R 62`, `TREASURE_HIT_R 28`. `MapBreather.tsx` = in-run overlay after bosses 1–5 (`SurvivalGame.tsx completeBossWave`).

## Constants (`Constants.ts`)
`WORLD_SIZE 3500 · WORLD_POINT_MARGIN 220 · WORLD_MIN_SPAWN_DIST 600 · WORLD_MIN_POINT_DIST 500 · WORLD_TOUCH_RADIUS 70 · WORLD_GLOW_RANGE 900 · WORLD_ARROW_CHAPTERS 2 · WORLD_CARD_FRAMES 240 · WORLD_FOG_GRID 20 · WORLD_RELIC_GUARDS 8 · WORLD_GUARD_WARN_FRAMES 48 · WORLD_EVENT_RING 320 · WORLD_SPARK_RADIUS 180 · WORLD_SPARK_KINDLE_SEC 8 · WORLD_STAR_SHARD_EVERY 30 · WORLD_STAR_SHARD_R 70 · WORLD_STAR_SHARD_DMG 0.12` · found-event tuning in `FOUND_EVENTS` (`logic/FoundEvents.ts`).

## Debug
`?seed=123` fixed layout · `?debug=1` exposes `__LIGHT.state.world.points` · `?wave=N` to test chapter picks.
