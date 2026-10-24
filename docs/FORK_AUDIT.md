# Fixed-fork audit (branch `fixed-fork`)

The AI "fixed" version is on GitHub as branch **`fixed-fork`** (generated audio/images stripped, listed in its `docs/REMOVED_ASSETS.md`). The original complete game is branch **`original-complete`**. `main` is LIGHT (the original engine + our chats).

To read a fork file from `main` without switching branches:
```bash
git show origin/fixed-fork:components/game/logic/enemies/BossKit.ts | sed -n 1,120p
```

## Verdict in one line
The fork is a **roguelike** (boon drafts, first-power choice, map nodes, daily void, mercy). We never merge it. We **port engine-level modules** from it, file by file, into the chat that owns that topic. Every port must drop `translate()`, `audio` imports (until 6A), `MERCY_MULTIPLIERS`, and boon/resonance hooks.

## Keep (port into LIGHT) — owner chat
| Fork file | What it is | Owner | Notes |
|---|---|---|---|
| `components/game/logic/enemies/BossKit.ts` | `telegraph()` pool (circle/line/cone/ring, 24 slots), `updateTelegraphs`, `cancelTelegraphs`, phase-shift constants | **2B** | Exactly the kit 2B describes. Port, add arena + enrage + adds (fork lacks them). |
| `components/game/renderer/ThreatIndicatorRenderer.ts` | off-screen threat arrows, 12-slot pool | **2B** (boss adds) / 3A (landmark hint) | |
| `components/game/HitFeedback.ts` | damage-number pool (40), screen shake budget (12 px), hit-stop guard (150 ms) | **4A** | |
| `components/game/ObjectPools.ts` | projectile / particle / drop pools, swap-remove | **4A** | |
| `components/game/renderer/GlowSprites.ts` | cached glow sprites, hurt vignette, cached gradients | **4A** / 11 perf | big win for mobile |
| `components/game/renderer/ParticleBatcher.ts` | batched particle draw + culling | **4A** | |
| `components/game/Quality.ts` | LOW/MEDIUM/HIGH quality profiles + auto step | **7B** | |
| `components/game/waveFlavors.ts` | Elite Rush / Gauntlet / Curse / Aegis Trial mechanics | **4B** | fork maps them to 110 waves; LIGHT uses x5 of 60. |
| `components/game/events.ts` | in-run events director: Golden Mite, Essence Tide, Treasure Pylon, Ambush Ring, Meteor Shower | **3A** | These are *discoveries*, not choices → allowed. |
| `components/game/logic/HazardLogic.ts` | chaos hazards (meteors etc.) | **3A** | |
| `components/game/logic/enemies/bosses/*.ts` (11 files) | per-boss attack scripts on the kit | **2C / 2D** | Read for ideas only; LIGHT keeps 6 bosses. The 5 extra (Broken Dawn, Fallen Star, False Dawn, Hollow Halo, Mirror Sun) are a **9A endless** idea pool. |
| `components/game/audio.ts` | Web Audio engine: tracks per place, ducking, voices | **6A/6B** | Strip track URLs; keep the engine. |
| `utils/haptics.ts` | vibrate patterns | **7B** | |
| `scripts/sim.ts`, `scripts/economy-sim.ts` | headless balance sims | **8B** | 2A already made a smaller `tools/sim.mjs`; merge ideas. |
| `css/mobile-fixes.css` | landscape-phone overrides | **7B** | |
| `components/GuidebookModal.tsx`, `data/guidebookEntries.ts` | in-game guide | **7A** | fine as read-only lore/help. |
| `enemies.ts` (59 defs vs 48) | 11 extra enemy defs | **4B** | pick the ones with new behaviours. |
| `components/game/bossVictory.ts` | boss victory sequence | **2B** | |

## Adapt (idea only, re-implement smaller)
| Fork thing | Why not as-is | Where |
|---|---|---|
| Light Energy meter + BEAM (patch.js) | lives in a DOM overlay patch on a bundle | **3B/4A**: a "Light Burst" that charges by kills and is fired manually — *not* a pick, it is a tree unlock. |
| WATCHER voice + interstitial captions (patch.js) | overlay hack | **3B** (already in GDD). |
| "SEAM OF THE VOID" tint/flicker scenario | tied to waves 101–110 | **2D** ending / **9A** endless atmosphere. |
| Boss "NOW ARRIVING" reveal + colour vignette | overlay | **2B** boss intro. |
| Boss retry hints (`bossRetry.ts` BOSS_HINTS) | tied to mercy "wounded boss" | **2B**: show the hint on death, **no HP carry-over**. |
| Side missions (`data/sideMissions.ts`) | menu-driven objectives | **3A**: at most silent, discovered objectives (e.g. "3 Whisper Stones"). |
| Cosmetics (`data/cosmetics.ts`) | shop | **7A** maybe: unlock-by-achievement trails, no shop. |
| i18n (`translate.ts`, 120 kB) | huge | **9B** optional ES pass with a tiny dictionary. |

## Reject (never in LIGHT)
`BoonDraft.tsx`, `FirstPowerChoiceModal.tsx`, `BossRewardModal.tsx`, `hooks/useRunBoons.ts`, `data/boons.ts`, `data/resonances.ts`, `logic/BoonLogic.ts`, `StarChart.tsx` + `data/mapNodes.ts` + `regionBackgrounds.ts` (node map), `data/dailyVoid.ts` (9A does its own daily seed), `mercy.ts` + difficulty configs, `voidRush.ts`, `utils/telemetry.ts`, `FeedbackModal/Sheet.tsx`, `js/vendor.js` + `js/patch.js` (bundled blobs), all generated audio/images.

## What the fork got right that players felt
- Hits have weight (numbers, shake, hit-stop). → 4A early is correct.
- Telegraphs make bosses readable. → 2B.
- Something happens *between* waves (events, special waves). → 3A, 4B.
- Mobile quality profiles. → 7B.
