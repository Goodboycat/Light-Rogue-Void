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
- **2A:** Wave persistence: no wave wipe, kill-quota **or** timer, spawn director with crowd cap, carried-enemy ring, `?wave=`, `?debug=1`, headless `npm run sim`.
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
13. **7B:** Mobile QA: touch, safe areas, quality profiles (port Quality.ts + haptics + mobile css), 30+ fps on mid phones, portrait + landscape.
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
