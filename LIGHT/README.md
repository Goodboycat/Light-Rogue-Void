# LIGHT — Light Rogue Void

A cosmic action **roguelite**: a lone spark fights to escape the entropy of the void.
Permanent progress lives only in the **Skill Tree** (no in-run power picking).
Pillars: **storytelling · action · discovery · stressful bosses**.

- Studio: Beato Forge · Dev: Goodboycat · Art inspired by Idle Tower Defense
- Stack: React 19 + Vite + Canvas 2D (procedural art) · single-file itch.io build · Capacitor APK later
- Docs: `docs/PLAN.md` (roadmap), `docs/GDD.md` (design), `docs/CONVENTIONS.md` (rules for every chat), `docs/HANDOFF.md` (what the last chat did), `docs/ENEMIES.md` / `docs/BOSSES.md` / `docs/TREE.md` (generated tables), `docs/WORLD.md` (every discoverable point / event), `docs/STORY.md` (full script), `docs/ITCH.md` (how to publish), `prompts/<ID>.md` (one instruction file per chat)

## Quick start
```bash
# repo root contains LIGHT/ ; the app lives in LIGHT/game/, docs in LIGHT/docs/, prompts in LIGHT/prompts/
bash LIGHT/game/tools/github.sh <TOKEN>   # once per sandbox, then: git push origin main
cd LIGHT/game && npm install && npm run build   # dist/ (multi-file)
cd LIGHT/game && npm run dev                    # http://localhost:3000
bash LIGHT/game/tools/itch.sh   # -> LIGHT/out/light-rogue-void-itch.zip (single index.html)
bash LIGHT/game/tools/next.sh   # prints the next chat ID + its prompt file
```

## Progress

### Done
| Chat | Summary |
|------|---------|
| 0 | Original complete game: 60 waves, 6 bosses, 59 enemies, skill tree, 14 powers, archives, achievements, touch, cinematics. |
| 0B | Reset to the original, analysed the "fixed" fork, wrote PLAN/GDD/CONVENTIONS, 24 prompt files, `tools/github.sh`, `tools/next.sh`, `tools/itch.sh`. |
| 1A | Build pipeline: single-file itch build, `?demo=1`, removed Gemini env, 60 → chapters constants. |
| 1B | Seeded deterministic skill tree (mulberry32), stable ids, 6 boss constellations, lock UI, save migration + refund, `docs/TREE.md`. |
| 2A | Wave persistence: no wave wipe, kill-quota or timer, spawn director (grace, starve guard; crowd cap removed in 4B — no caps, CONVENTIONS rule 9), carried ring, `?wave=`, `?debug=1`, `npm run sim`. |
| 4A | Action feel: `Feel.ts` (hit-stop, shake, flash, settings `screenShake`/`reduceFlash`), damage floaters (pool 120, crit gold), kill streaks (10/25/50 banners, +1 % essence/10, cap 20 %), `Pools.ts` + `ParticleBatcher`/`GlowSprites` (swap-remove; count caps removed in 4B — pools only size their free lists), player hurt (i-frames + blink, red vignette, heartbeat < 25 % HP). |
| 2B | Boss kit: `BossKit.ts` telegraphs (circle/line/cone/ring, damage only on fire), arena r 900 + void burn, phases 100/66/33 + invulnerable shift, enrage 150 s, roaming add packs, `BossBar.tsx`, death hints, arrival reveal, `BigFx.ts` cinematic explosions (simplex-noise, vendored MIT) for White Hole + boss death, Hive Mind reference, `docs/BOSSES.md`. |
| 2C | Bosses 1–3 reworked on the kit: Hive Mind (Brood Nodes, acid rings with gap, P3 pull + cone), Void Warden (ricochet dash shown 0.8 s ahead, nebulas, Phase Shades, shrinking arena, Warden's Wall), Crimson Eclipse (live rotating lasers `state.lasers`, ECLIPSE blackout, flare rain, comets). Phase-coloured cores + P3 crack web. HP 6000/12000/20000, `docs/BOSSES.md` tuning table. |
| 2D | Bosses 4–6 reworked on the kit: Collapsing Neutron (gravity pull, orbit ring bands inside/outside, push→pull pulses, collapse + supernova), Entropy Titan (leap slams leave solid `rock` hazards, shockwave rings shatter rocks, arena shrinks per slam, Iron Clads), Darkness (mirrors ≤ 4 of your unlocked powers, Doppelganger, lights out, enrage swallows the edge). Ending: new OUTRO (Darkness/Watcher/Light) over a Seam-of-the-Void wash, **STAY / LEAVE** choice, procedural credits, `gameState.endingSeen`. HP 20000/24000/30000. |
| 4B | Enemy variety: `data/affixes.ts` (Hasted/Armored/Splitting/Vampiric/Shielded, 5 %+0.4 %/wave cap 30 %, 2nd affix ≥ w30), `logic/Director.ts` packs 3–8 with 0.6 s telegraph, special waves 5/15/25/35/45/55 (Elite Rush / Gauntlet / Curse / Aegis Trial, ported `waveFlavors.ts`), 0.4 s shot-warn on every shooter, **no caps anywhere** (rule 9) + `SpatialHash.ts` + batched bullets, fork enemies audited (identical 59 ids), `docs/ENEMIES.md` (`npm run enemies`). |
| 3A | Discovery: `data/world.ts` (6 landmarks, 4 shrines, 6 relics, 3 placed events, `RunModifiers`), seeded placement (3+2+1+1–2 points, `?seed=`), `WorldInteract.ts` (shrine touch, relic alcove with 8 elite guards, 4 s lore cards, Ambush / Lost Spark / Collapsing Star), `WorldRenderer.ts` (silhouettes, glow pulse, off-screen arrow ch. 1–2), fog minimap (`settings.showMinimap`), `RunStats.ts` run layer + relic HUD chips, `FoundEvents.ts` (Golden Mite, Essence Tide, Treasure Pylon, Ambush Ring, Meteor Shower — found, never chosen, ≥ 25 s cooldown), `docs/WORLD.md`. |
| 3B | Story: `data/story.ts` (6 chapters × opener/mid/preBoss/bossIntro/bossOutro, LIGHT/DARKNESS/WATCHER, WATCHER only at x9 + ending), `StoryCaption.tsx` non-pausing typewriter captions, chapter cards in the main menu replace the wave slider (unlock at `maxWaveReached >= firstWave`), `data/lore.ts` bestiary FIELD NOTES after 10 kills (`gameState.killCounts`), `ChapterCard.tsx` title card + `StarBackground` tint, **Light Burst** (`logic/LightBurst.ts`, tree nodes `burst_unlock/2/3` on the Utility spine, meter by kills, Space/E/touch ☀), WATCHER whispers single-sourced, `docs/STORY.md` (`npm run story`). |
| 5A | Art pass: `renderer/Palette.ts` (per-chapter base/glow/outline/accent, enemies tinted 25 % toward chapter), readable 32 px silhouettes for the 9 visual types, boss phase stroke + enrage heartbeat, spark 6 maturity stages + dash trail + burst ring, essence orbs 3 sizes + relic gem, `?gallery=1[&scale=N]` static sheet (`components/Gallery.tsx`, 151 cells), `docs/ART.md` (style rules + cell order for 5B). |
| 5B | Art extraction: `tools/extract-art.mjs` (Playwright devDep, `npm run art`) screenshots `?gallery=1&sheet=1` → `public/sprites/<id>.png` (148, ~1.0 MB) + `atlas.json`; `renderer/SpriteRenderer.ts` (atlas preload, `drawSprite`, 64-entry tint cache); `?sprites=1` / Settings "Sprite mode (faster)" (`settings.spriteMode`) swaps enemy + projectile drawing for blits with procedural fallback; itch zip ships `sprites/` next to `index.html`; `docs/ART.md` sprite section, CONVENTIONS rule 4 exception. |
| 6A | Audio foundation: `audio/AudioManager.ts` (unlock on first gesture, 24 voices, per-id throttle ≥ 40 ms, music cross-fade, `duck`, hidden-tab mute, `manifest.json` loader overriding synths), `audio/sfxIds.ts` (42 SFX + 9 music ids, family/throttle/volume tables), `audio/synth.ts` (8 placeholder families + 2 loop styles), Settings → Audio (master/music/sfx sliders + mute, persisted, migrated), `docs/AUDIO_LUDO.md` (a Ludo.ai prompt per id, export specs, drop-in steps). Nothing is hooked into gameplay yet — 6B. |
| 0F | Pushed `original-complete` + `fixed-fork` branches, `docs/FORK_AUDIT.md`, plan v2 (feel → bosses → variety → discovery → story), fork pointers in prompts, `tools/fork.sh`, `prompts/NEXT_CHAT.md`. |

### Next (in order)
Next: 6B 7A 7B 7C 8A 8B 9A 9B 10

| Chat | Summary |
|------|---------|
| 6B | Audio integration: SFX hooks, music per chapter, ducking, settings. |
| 7A | UI polish: HUD, skill-tree UX (pan/zoom/search/path preview), run summary. |
| 7B | Mobile QA: touch, safe areas, performance mode, 60 fps on mid phones. |
| 7C | World Map: procedural chapter map (6 places, 1–10 waves each, boss at 10) as menu chapter select + breather after every boss (`prompts/7C.md`, owner request). |
| 8A | Save v2: migrations, export/import, run stats, achievements v2. |
| 8B | Balance: headless sim (`npm run sim`), curves for 60 waves + endless. |
| 9A | Endless mode + daily seed. |
| 9B | Jam package: itch page copy, screenshots, trailer shot list, final README. |
| 10 | Capacitor APK. No prompt file — not a sandbox chat. |

Branches: `main` = LIGHT, `original-complete` = the boring-but-complete original, `fixed-fork` = the rejected AI roguelike (read with `bash LIGHT/game/tools/fork.sh <path>`). Next chat: read `prompts/NEXT_CHAT.md`.

Unscheduled (prompt exists, not in the Next line): **0C** Foundation QA, **4C** Accessibility. Add them to the `Next:` line to run them.

## License
See `LICENSE.md`.
