# LIGHT — Master Plan (v2, written after the fixed-fork audit)

Here's the order, taken from the README's "Done" and "Next" tables. Each line gives the chat ID and its instruction in a few words. Every chat reads `docs/CONVENTIONS.md`, `docs/HANDOFF.md`, then its own `prompts/<ID>.md`, works in small commits (`<ID>: <step>` + push), and ends by updating the README tables, `docs/HANDOFF.md`, building the itch zip and uploading it as **light-rogue-void-itch**.

## Why this plan

- **Original** (branch `original-complete`, ~9.5k lines): complete, but players called it boring — enemies deleted every 30 s, HP-sponge bosses, empty map, random tree per device.
- **Fixed fork** (branch `fixed-fork`, ~32k lines + 37 MB generated assets): a *roguelike* (boon drafts, first-power choice, node map, mercy difficulty). Rejected as a base. `docs/FORK_AUDIT.md` lists, file by file, what we **port** (telegraph kit, pools, hit feedback, glow cache, quality profiles, wave flavors, events director, audio engine) and what we **never** take (any power picking, map nodes, mercy, telemetry, blobs).
- **LIGHT** (`main`) = original engine + chats. A **roguelite**: all permanent power is the **Skill Tree**; runs differ by what you *discover* and *survive*, never by what you *pick*.
- Pillars: **storytelling · action · discovery · stressful (fair) bosses**.
- Order principle: **feel first** (4A pools/feedback are the foundation every later spawner uses), then **bosses** (the frustration pillar), then **variety + discovery**, then **story**, then **art → audio → UI → mobile → save → balance → endless → package**.

**Done**
- **0:** The original complete game (60 waves, 6 bosses, 48 enemies, 14 powers, random tree, archives, achievements, touch, cinematics).
- **0B:** Reset to original, first fork analysis, PLAN/GDD/CONVENTIONS, prompt files, `github.sh` / `next.sh` / `itch.sh`.
- **0D / 0E:** Moved the game into `LIGHT/game`, docs + prompts at `LIGHT/` root, HANDOFF, path fixes.
- **1A:** Build pipeline: single-file itch build, `?demo=1`, `MAX_WAVE` + chapter constants, Gemini env removed.
- **1B:** Seeded deterministic skill tree (mulberry32), 6 boss constellations, lock UI, save migration, `docs/TREE.md`.
- **2A:** Wave persistence: no wave wipe, kill-quota **or** timer, spawn director (crowd cap later removed — no caps, see CONVENTIONS rule 9), carried-enemy ring, `?wave=`, `?debug=1`, headless `npm run sim`.
- **0F:** (this chat) Pushed `original-complete` and `fixed-fork` branches, `docs/FORK_AUDIT.md`, plan v2, prompt files 5A–9B, `tools/fork.sh`.

**Next, in order**
1. **4A:** Action feel + object pools: port HitFeedback / ObjectPools / GlowSprites / ParticleBatcher from the fork; hit-stop, shake, flash, damage numbers, kill streaks.
2. **2B:** Boss framework: port BossKit telegraphs + threat arrows; add arena ring, 3 phases, enrage, roaming adds, BossBar HUD, death hint (no HP carry-over); Hive Mind as reference.
3. **2C:** Rework bosses 1–3 (Hive Mind, Void Warden, Crimson Eclipse) as mechanics tests.
4. **2D:** Rework bosses 4–6 (Collapsing Neutron, Entropy Titan, Darkness) + the true ending sequence.
5. **4B:** Enemy variety: elite affixes, special waves at x5 (port waveFlavors: Elite Rush, Gauntlet, Curse, Aegis Trial), pack-based spawn director, extra enemy defs from the fork.
6. **3A:** Discovery on the 3500 world: landmarks, shrines, relics (found, never offered), fog-of-discovery minimap; port the events director (Golden Mite, Essence Tide, Treasure Pylon, Ambush Ring, Meteor Shower) as *found* events.
7. **3B:** Story: 6 chapters tied to boss decades, LIGHT / DARKNESS / WATCHER voices, bestiary lore by kills, boss intros/outros, chapter time-skip replaces "start at wave N", Light Burst (tree-unlocked manual ability).
8. **5A:** Procedural art pass on every entity + `?gallery=1` sheet drawing everything side by side with labels.
9. **5B:** Art extraction: Playwright screenshot of the gallery → cropped PNGs + `atlas.json`; optional sprite renderer behind a flag.
10. **6A:** Audio manager (port the fork's Web Audio engine, synth placeholders) + the Ludo.ai prompt list in `docs/AUDIO_LUDO.md`.
11. **6B:** Audio integration: SFX hooks everywhere, music per chapter with cross-fade + ducking, volume settings, `public/audio/` drop-in loader.
12. **7A:** UI polish: HUD, skill-tree UX (pan/zoom/search/path preview, respec with matter tax), run summary, guidebook.
13a. **7D:** Owner request: fog-of-war mystery on the world map + epic place-reveal cinematic; storyline cinematics (chapter openers, boss intro/outro, ending) = dialogue that continues into camera/actor movement (`docs/GDD.md` → Cinematics, `prompts/7D.md`).
13. **7B:** Mobile QA: touch, safe areas, quality profiles (port Quality.ts + haptics + mobile css), 30+ fps on mid phones, portrait + landscape.
13b. **7C (owner request, done before 7A):** World Map: procedural star chart as menu chapter select + breather after every boss (1–10 waves per place, boss at 10), hidden treasure caches.
14. **8A:** Save v2: versioned migrations, export/import code, run stats, achievements v2.
15. **8B:** Balance: grow `npm run sim`, curves for 60 waves, boss time-to-kill targets, tree cost curve.
16. **9A:** Endless mode after the ending (fork's 5 extra bosses as an idea pool) + daily seed.
17. **9B:** Jam package: itch page copy, screenshots, trailer shot list, final README and checklist.
18. **10:** Capacitor APK. No prompt file, so it isn't a sandbox chat.

Two prompts exist but are in neither table. **0C** (Foundation QA — play the whole game once, log bugs) and **4C** (Accessibility — colour-blind palettes, reduce-flash, remap keys) have prompt files, so `next.sh` never picks them. If you want them run, add them to the README's "Next" line.

## Ideas parked for a chat to analyse (not decisions)
- ~~Waves should not kill all entities; bosses can have entities roaming.~~ → **2A done**; roaming adds during bosses → **2B**.
- Procedural art first, then side-by-side gallery, then screenshot → PNG. → **5A / 5B**.
- SFX and music through Ludo.ai; the sandbox only writes the prompt list and wires the loader. → **6A / 6B**.
- Chapter-based time skip instead of "Start at wave N". → **3B**.
- Respec with a matter tax so the tree can be explored. → **7A**.
- Fork's "Light Energy + BEAM" → a tree-unlocked **Light Burst** (charge by kills, fire manually). → **3B**, numbers in **8B**.
- Fork's 5 extra bosses (Broken Dawn, Fallen Star, False Dawn, Hollow Halo, Mirror Sun) → **9A** endless only.
- Boss death hint ("you died to X — try Y") without any HP mercy. → **2B**.

## Chat budget rule
One chat ≈ one ID. If a chat runs out of credits mid-ID it must still: commit what is green, write HANDOFF with exact file/line pointers, leave the ID at the front of the `Next:` line with a `(cont.)` note in its row.

## History — finished chats (moved here from README in 9B)

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
| 6B | Audio integration: `audio/hooks.ts` (`sfx`/`sfxAt`), SFX on shots/hits/deaths/pickups/dash/hurt/low-HP/burst/streaks (step 1, prev. chat), BossKit arrive/telegraph/fire/phase/enrage, arena burn, special-wave banner, shrines/relics/landmarks/events, FoundEvents + meteors, chapter card, story typewriter tick + duck; music title → `music_chN` per wave → `music_boss` (1.5 s fade + duck) → `music_ending`; delegated UI click/back + unlock/error; stereo pan −0.6…0.6. Leak check (step 6) not measured. |
| 7C | World Map (owner request): `components/WorldMap.tsx` procedural seeded star chart (6 places + 4 faint `?` future places, dotted Catmull-Rom path, locks, ✓ rings, pulsing current, black-hole swirl, `@` glyph nodes) replaces `#chapter-select` in the menu (START shows place + waves N–N+9); `MapBreather.tsx` freezes the run on the map after bosses 1–5 (CONTINUE → chapter card, RETURN TO MENU, Esc/Enter/Space); 6 hidden treasure caches revealed per cleared boss grant matter once (`gameState.mapTreasuresOpened`, optional field, no SAVE_VERSION bump); `docs/GDD.md` World Map, `docs/WORLD.md`, PLAN 13b. |
| 7A | UI polish: tree UX (zoom 0.5–2.5, search, Dijkstra path preview + total cost, arc legend = fit buttons), RESPEC (`RESPEC_TAX` 20 %, confirm, keeps `spark`), HUD layout (safe-area insets, low-contrast plates, boss bar below top row, burst meter under matter, nothing over the joystick), run summary on GameOver/WinGame (waves/kills/elites/bosses/essence→matter/found/streak/time + new-in-bestiary, TREE / RETRY chapter / MENU), Guidebook (`data/guidebook.ts` + `components/Guidebook.tsx`, menu + pause), pause ABANDON RUN confirm. |
| 7D | Map mystery + cinematics (owner request): world-map fog of war (seeded simplex puffs over unreached places, faint glow only, path fades one segment past the furthest reached place), `MapReveal.tsx` place-reveal cinematic (pan+zoom, fog dissolve, name letter-spaced in, `music_sting_reveal`; in `MapBreather` after a boss and once in the menu via `gameState.mapRevealsSeen`), `data/cinematics.ts` shot lists (6 bossIntro + 6 bossOutro + 6 openers + 6 preBoss push-ins + ending), `logic/Cinematic.ts` player (frozen sim, live render, camera pan/zoom via `state.camera` + `cinematicZoom`, fx, actor presence, skip after 1 s) + `StoryCinematicOverlay.tsx` (letterbox + lines); hooked at boss spawn / boss death (→ then map reveal) / chapter opener / pre-boss (noFreeze) / ending (WinGame `skipOutro`); `docs/STORY.md` now lists shots. Not eyeballed in a browser (credits). |
| 7B | Mobile QA: `game/Quality.ts` LOW/MEDIUM/HIGH + AUTO (detail only — glow, shadowBlur gate, floaters, particle size, DPR cap 1/1.5/2; rule 9, no count caps), floating touch sticks + dash/burst/pause buttons (pointer ids, 8 px dead zone, no 300 ms delay, `touch-action: none`), safe-area HUD + landscape corner layout (`100dvh`), `utils/haptics.ts` OFF/LIGHT/FULL, enemy draw culling (+64 px) + `renderer/EnemyBatcher.ts` (plain enemies one Path2D fill per tint; LOW always, else ≥ 120 visible), `tools/bench.mjs` wave-40 4× CPU throttle: **LOW 32.4 fps** (30.9 ms avg / 37.3 p95), MEDIUM 18.6 fps, `docs/MOBILE.md`. No real-device pass (sandbox). |
| 8A | Save v2: `save/schema.ts` (`SAVE_VERSION` 2, typed `SaveV2` + `LifetimeStats` + defaults), `save/migrate.ts` chain v0→v1→v2 (3 fixtures, `npm run test:save` 67 checks), `save/storage.ts` write-safety (500 ms debounce, flush on pagehide/hidden/beforeunload, quota retry, `light_save_backup` rotated once per day), `save/codec.ts` `LIGHT1.<base64url(JSON+crc32)>` export/import (`components/SaveTransfer.tsx` in Settings: copy code / `.light` file / paste or drop → validate → confirm overwrite), `save/stats.ts` lifetime records (kills, bosses per id + feats, best wave per chapter, matter, discoveries, deaths per boss) in Archives RECORDS tab, `logic/BossFeats.ts` per-fight flags, achievements v2 (30 data-driven, matter rewards, `AchievementToast.tsx`), `docs/SAVE.md`. Not eyeballed in a browser (credits). |
| 8B | Balance: `npm run sim` bot + presets/`--boss`/`--god`, named curves in `Constants.ts`, `BOSS_HP_MULT` tuned (TTK 37–143 s), `tools/tree-cost.mjs` (77.7M tree, Offense full ≈ run 234), death-cause table + Crimson Eclipse laser patch (full tree 0/6 → 6/6), `docs/BALANCE.md`. **Fixed itch crash** (`save/storage.ts` unbound setTimeout → Illegal invocation); itch build smoke-tested in a browser, 0 errors. |
| 9A | Endless (STAY → wave 61+, `ENDLESS_SCALE`, bosses 1–5 return with mutators from `data/mutators.ts`, WATCHER endless pool) + Daily Void (UTC date seed, streak, 30-day history, share code + verify, `save/daily.ts`). Pre-step: budget sweep re-run after the Eclipse patch (`docs/BALANCE.md`). itch build browser-smoke-tested, 0 errors. |
| M0 | Cinematic engine + `title_seam` + `menu_loop` + MainMenu rebuilt as a film (`docs/handoff/M0.md`). |
| M1 | Chapter openers 1–3 as film scenes (`opener_1..3`), SurvivalGame film hook, `tools/cinebench.mjs` (`docs/handoff/M1.md`). |
| M2 | Chapter openers 4–6 (`opener_4..6`, opener_6 stretched to 17 s via `OpenerTiming`), registry-driven hook; cinebench ms/frame for all six openers — `ctx.filter` blur identified as the dominant cost (`docs/HANDOFF.md`). |
| M3 | Boss intros ×6 as film scenes (`boss_intro_<bossId>`, `bossKit.ts` shared spine), hooked at boss spawn before `BossBar`; cinebench per shot (`docs/HANDOFF.md`). |
| 9B | Jam package: `docs/ITCH_PAGE.md`, `tools/shots.mjs`, `docs/TRAILER.md`, demo tree cap + `DemoCard` buy-full (`demoTreeLocked`, `FULL_GAME_URL`), product README, `docs/CHECKLIST.md`. itch zip 1.48 MB, 0 JS errors in `?demo=1`. |
| 0F | Pushed `original-complete` + `fixed-fork` branches, `docs/FORK_AUDIT.md`, plan v2 (feel → bosses → variety → discovery → story), fork pointers in prompts, `tools/fork.sh`, `prompts/NEXT_CHAT.md`. |

### Still open when this table was moved
| Chat | Summary |
|------|---------|
| 8B | Balance: headless sim (`npm run sim`), curves for 60 waves + endless. |
| 9B | Jam package: itch page copy, screenshots, trailer shot list, final README. |
| 10 | Capacitor APK. No prompt file — not a sandbox chat. |
