# LIGHT — Master Plan

Here's the order, taken from the README's "Done" and "Next" tables. Each line gives the chat ID and its instruction in a few words. Every chat reads `docs/CONVENTIONS.md`, then its own `prompts/<ID>.md`, works in small commits, and ends by updating the README tables and `docs/HANDOFF.md`.

## Why this plan

- The **original** (GitHub `main`, ~9.5k lines) is complete but players called it boring: enemies are deleted every 30 s, bosses are HP sponges, the map is empty, the tree is random on every device.
- The **"fixed" fork** (~32k lines, 23 MB assets) is a roguelike: boon drafts, first-power choice, map nodes, daily void, mercy difficulty. It is *not* the base. We cherry-pick only engine-level ideas from it (object pools, hit feedback, boss telegraph kit, special-wave flavors, headless sim) and never its power picking or its 23 MB of generated images/audio.
- Target: a **roguelite**. All permanent power comes from the **Skill Tree**. Runs differ through what you *discover* and *survive*, not through what you *pick*.
- Pillars: **storytelling · action · discovery · stressful (fair) bosses**.

**Done**
- **0:** The original complete game (60 waves, 6 bosses, 48 enemies, 14 powers, random skill tree, archives, achievements, touch controls, cinematics).
- **0B:** Reset to the original, analyse the fixed fork, write PLAN / GDD / CONVENTIONS / HANDOFF, one prompt file per chat, `tools/github.sh`, `tools/next.sh`, `tools/itch.sh`.
- **1A:** Build pipeline: single-file itch build, `?demo=1`, remove the Gemini env, move the 60-wave cap and chapter boundaries into `Constants.ts`.

**Next, in order**
1. **1B:** Seeded deterministic skill tree with a constellation layout, so the tree is identical on every device and can be documented.
2. **2A:** Wave persistence: enemies are *not* killed when the wave changes; waves advance by kill quota + timer; leftover enemies carry over, capped by a crowd budget.
3. **2B:** Boss framework: arena ring, telegraphs (circle/line/cone/ring), 3 phases, enrage timer, roaming adds during bosses, boss HUD.
4. **2C:** Rework bosses 1–3 (Hive Mind, Void Warden, Crimson Eclipse) on the framework: distinct mechanics, not HP.
5. **2D:** Rework bosses 4–6 (Collapsing Neutron, Entropy Titan, Darkness) + the true ending sequence.
6. **3A:** Discovery: landmarks, relics (run-only, found not chosen), shrines, hidden events and a fog-of-discovery on the 3500 world.
7. **3B:** Story: 6 chapters tied to boss decades, Light / Darkness / Watcher voices, bestiary lore unlocked by kills, boss intros and outros.
8. **4A:** Action feel: hit-stop, screen shake, hit flash, damage numbers, object pools, kill streaks.
9. **4B:** Enemy variety: elite affixes, special waves (Elite Rush, Gauntlet, Curse, Aegis Trial), spawn director.
10. **5A:** Procedural art pass on every entity + `?gallery=1` sheet drawing everything side by side with labels.
11. **5B:** Art extraction: Playwright screenshot of the gallery → cropped PNG sprites + `atlas.json`; optional sprite renderer behind a flag.
12. **6A:** Audio manager (Web Audio, synth placeholders) + the Ludo.ai prompt list in `docs/AUDIO_LUDO.md`.
13. **6B:** Audio integration: SFX hooks everywhere, music per chapter with cross-fade and ducking, volume settings.
14. **7A:** UI polish: HUD, skill tree UX (pan/zoom/search/path preview/respec), run summary screen.
15. **7B:** Mobile QA: touch controls, safe areas, performance mode, 60 fps on mid phones, portrait + landscape.
16. **8A:** Save v2: versioned migrations, export/import code, run stats, achievements v2.
17. **8B:** Balance: headless simulator (`npm run sim`), curves for 60 waves, boss time-to-kill targets, tree cost curve.
18. **9A:** Endless mode after the ending + daily seed.
19. **9B:** Jam package: itch page copy, screenshots, trailer shot list, final README and checklist.
20. **10:** Capacitor APK. No prompt file, so it isn't a sandbox chat.

Two prompts exist but are in neither table. **0C** (Foundation QA — play the whole original once, log bugs) and **4C** (Accessibility — colour-blind palettes, reduce flash, remap keys) have prompt files, so `next.sh` never picks them. If you want them run, add them to the README's "Next" line.

## Ideas parked for a chat to analyse (not decisions)
- Waves should not kill all entities; they stay alive and bosses can have entities roaming. → **2A / 2B** analyse and implement.
- Procedural art first, then side-by-side gallery, then screenshot → PNG. → **5A / 5B**.
- SFX and music through Ludo.ai; the sandbox only writes the prompt list and wires the loader. → **6A / 6B**.
- Chapter-based time skip instead of "Start at wave N" (unlocked by reaching the chapter boss). → **3B**.
- Respec with a matter tax so the tree can be explored. → **7A**.
