# LIGHT — Light Rogue Void

A cosmic action **roguelite**: a lone spark fights to escape the entropy of the void.
Permanent progress lives only in the **Skill Tree** (no in-run power picking).
Pillars: **storytelling · action · discovery · stressful bosses**.

- Studio: Beato Forge · Dev: Goodboycat · Art inspired by Idle Tower Defense
- Stack: React 19 + Vite + Canvas 2D (procedural art) · single-file itch.io build · Capacitor APK later
- Docs: `docs/PLAN.md` (roadmap), `docs/GDD.md` (design), `docs/CONVENTIONS.md` (rules for every chat), `docs/HANDOFF.md` (what the last chat did), `prompts/<ID>.md` (one instruction file per chat)

## Quick start
```bash
# repo root is LIGHT/ ; the app lives in LIGHT/game/
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
| 0 | Original complete game: 60 waves, 6 bosses, 48 enemies, skill tree, 14 powers, archives, achievements, touch, cinematics. |
| 0B | Reset to the original, analysed the "fixed" fork, wrote PLAN/GDD/CONVENTIONS, 24 prompt files, `tools/github.sh`, `tools/next.sh`, `tools/itch.sh`. |
| 1A | Build pipeline: single-file itch build, `?demo=1`, removed Gemini env, 60 → chapters constants. |
| 1B | Seeded deterministic skill tree (mulberry32), stable ids, 6 boss constellations, lock UI, save migration + refund, `docs/TREE.md`. |
| 2A | Wave persistence: no wave wipe, kill-quota or timer, spawn director (crowd cap, grace, starve guard), carried ring, `?wave=`, `?debug=1`, `npm run sim`. |
| 4A | Action feel: `Feel.ts` (hit-stop, shake, flash, settings `screenShake`/`reduceFlash`), damage floaters (pool 120, crit gold), kill streaks (10/25/50 banners, +1 % essence/10, cap 20 %), `Pools.ts` + `ParticleBatcher`/`GlowSprites` (swap-remove, caps 600/400/400), player hurt (i-frames + blink, red vignette, heartbeat < 25 % HP). |
| 2B | Boss kit: `BossKit.ts` telegraphs (circle/line/cone/ring, damage only on fire), arena r 900 + void burn, phases 100/66/33 + invulnerable shift, enrage 150 s, roaming add packs, `BossBar.tsx`, death hints, arrival reveal, `BigFx.ts` cinematic explosions (simplex-noise, vendored MIT) for White Hole + boss death, Hive Mind reference, `docs/BOSSES.md`. |
| 2C | Bosses 1–3 reworked on the kit: Hive Mind (Brood Nodes, acid rings with gap, P3 pull + cone), Void Warden (ricochet dash shown 0.8 s ahead, nebulas, Phase Shades, shrinking arena, Warden's Wall), Crimson Eclipse (live rotating lasers `state.lasers`, ECLIPSE blackout, flare rain, comets). Phase-coloured cores + P3 crack web. HP 6000/12000/20000, `docs/BOSSES.md` tuning table. |
| 2D | Bosses 4–6 reworked on the kit: Collapsing Neutron (gravity pull, orbit ring bands inside/outside, push→pull pulses, collapse + supernova), Entropy Titan (leap slams leave solid `rock` hazards, shockwave rings shatter rocks, arena shrinks per slam, Iron Clads), Darkness (mirrors ≤ 4 of your unlocked powers, Doppelganger, lights out, enrage swallows the edge). Ending: new OUTRO (Darkness/Watcher/Light) over a Seam-of-the-Void wash, **STAY / LEAVE** choice, procedural credits, `gameState.endingSeen`. HP 20000/24000/30000. |
| 0F | Pushed `original-complete` + `fixed-fork` branches, `docs/FORK_AUDIT.md`, plan v2 (feel → bosses → variety → discovery → story), fork pointers in prompts, `tools/fork.sh`, `prompts/NEXT_CHAT.md`. |

### Next (in order)
Next: 4B 3A 3B 5A 5B 6A 6B 7A 7B 8A 8B 9A 9B 10

| Chat | Summary |
|------|---------|
| 4B | Enemy variety: elite affixes, special waves at x5 (port fork waveFlavors), pack director, extra fork enemies. |
| 3A | Discovery: landmarks, relics, shrines, fog minimap, found events (port fork events director) on the 3500 map (no picks). |
| 3B | Story: 6 chapters, Light/Darkness/Watcher lines, bestiary lore, boss intros/outros, chapter time-skip, Light Burst (tree unlock). |
| 5A | Procedural art pass + `?gallery=1` sheet that draws every entity side by side. |
| 5B | Art extraction: screenshot the gallery → PNG sprites + atlas; optional sprite renderer. |
| 6A | Audio manager + Ludo.ai prompt list (`docs/AUDIO_LUDO.md`), synth placeholders. |
| 6B | Audio integration: SFX hooks, music per chapter, ducking, settings. |
| 7A | UI polish: HUD, skill-tree UX (pan/zoom/search/path preview), run summary. |
| 7B | Mobile QA: touch, safe areas, performance mode, 60 fps on mid phones. |
| 8A | Save v2: migrations, export/import, run stats, achievements v2. |
| 8B | Balance: headless sim (`npm run sim`), curves for 60 waves + endless. |
| 9A | Endless mode + daily seed. |
| 9B | Jam package: itch page copy, screenshots, trailer shot list, final README. |
| 10 | Capacitor APK. No prompt file — not a sandbox chat. |

Branches: `main` = LIGHT, `original-complete` = the boring-but-complete original, `fixed-fork` = the rejected AI roguelike (read with `bash LIGHT/game/tools/fork.sh <path>`). Next chat: read `prompts/NEXT_CHAT.md`.

Unscheduled (prompt exists, not in the Next line): **0C** Foundation QA, **4C** Accessibility. Add them to the `Next:` line to run them.

## License
See `LICENSE.md`.
