# LIGHT — Light Rogue Void

A cosmic action **roguelite**: a lone spark fights to escape the entropy of the void.
Permanent progress lives only in the **Skill Tree** (no in-run power picking).
Pillars: **storytelling · action · discovery · stressful bosses**.

- Studio: Beato Forge · Dev: Goodboycat · Art inspired by Idle Tower Defense
- Stack: React 19 + Vite + Canvas 2D (procedural art) · single-file itch.io build · Capacitor APK later
- Docs: `docs/PLAN.md` (roadmap), `docs/GDD.md` (design), `docs/CONVENTIONS.md` (rules for every chat), `docs/HANDOFF.md` (what the last chat did), `prompts/<ID>.md` (one instruction file per chat)

## Quick start
```bash
npm install
npm run dev            # http://localhost:3000
npm run build          # dist/ (multi-file)
bash tools/itch.sh     # -> out/light-rogue-void-itch.zip (single index.html)
bash tools/github.sh <TOKEN>   # once per sandbox, then: git push origin main
bash tools/next.sh     # prints the next chat ID + its prompt file
```

## Progress

### Done
| Chat | Summary |
|------|---------|
| 0 | Original complete game: 60 waves, 6 bosses, 48 enemies, skill tree, 14 powers, archives, achievements, touch, cinematics. |
| 0B | Reset to the original, analysed the "fixed" fork, wrote PLAN/GDD/CONVENTIONS, 24 prompt files, `tools/github.sh`, `tools/next.sh`, `tools/itch.sh`. |
| 1A | Build pipeline: single-file itch build, `?demo=1`, removed Gemini env, 60 → chapters constants. |

### Next (in order)
Next: 1B 2A 2B 2C 2D 3A 3B 4A 4B 5A 5B 6A 6B 7A 7B 8A 8B 9A 9B 10

| Chat | Summary |
|------|---------|
| 1B | Seeded, deterministic skill tree + constellation layout (tree identical on every device). |
| 2A | Wave persistence: enemies survive wave changes; kill-quota + timer hybrid. |
| 2B | Boss framework: arena, telegraphs, phases, enrage, roaming adds during bosses. |
| 2C | Bosses 1–3 reworked (Hive Mind, Void Warden, Crimson Eclipse). |
| 2D | Bosses 4–6 reworked (Neutron, Entropy Titan, Darkness) + ending. |
| 3A | Discovery: landmarks, relics, shrines, hidden events on the 3500 map (no power picks). |
| 3B | Story: 6 chapters, Light/Darkness/Watcher lines, bestiary lore, boss intros/outros. |
| 4A | Action feel: hit-stop, shake, flash, damage numbers, object pools. |
| 4B | Enemy variety: elite affixes, special waves (Elite Rush, Gauntlet, Curse, Aegis). |
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

Unscheduled (prompt exists, not in the Next line): **0C** Foundation QA, **4C** Accessibility. Add them to the `Next:` line to run them.

## License
See `LICENSE.md`.
