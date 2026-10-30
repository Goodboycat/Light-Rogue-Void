# LIGHT — Light Rogue Void

**The void is winning. You are one spark of light. Stay lit.**

A cosmic action **roguelite** for browser and phone. Three hit points, a dash, and powers that fire on their own — your job is to move, survive, and learn. Six places on a fogged star chart, sixty waves, six bosses that telegraph every attack and remember every time you beat them. Permanent progress lives only in the **Skill Tree**: no in-run power picking.

Pillars: **storytelling · action · discovery · stressful bosses**.

- Studio **Beato Forge** · Dev **Goodboycat** · Audio prompts for **Ludo.ai** · Art inspired by Idle Tower Defense
- Stack: React 19 + Vite + Canvas 2D (procedural art) · single-file itch.io build (APK dropped — ignore)

## Features
- **6 chapters, 60 waves, 6 bosses** — Hive Mind, Void Warden, Crimson Eclipse, Collapsing Neutron, Entropy Titan, Darkness. Phases at 100/66/33 %, telegraphs that are promises, 150 s enrage, arena burn, death hints.
- **59 enemies + 5 affixes** (Hasted / Armored / Splitting / Vampiric / Shielded), pack spawns with telegraph, special waves every 10, no entity caps anywhere.
- **Seeded Skill Tree** — Offense / Defense / Utility spines, 6 boss constellations, path preview + total cost, search, zoom, RESPEC (20 % tax).
- **Discovery** — landmarks, shrines, relics with elite guards, found events (Golden Mite, Essence Tide, Treasure Pylon, Ambush Ring, Meteor Shower), fog minimap, World Map with hidden treasure caches and place-reveal cinematics.
- **Story** — LIGHT / DARKNESS / WATCHER captions per chapter, bestiary field notes, chapter cards, boss intro/outro cinematics, an ending with a **STAY / LEAVE** choice.
- **Light Burst** — tree-unlocked manual ability charged by kills.
- **Endless** (STAY → wave 61+, bosses return with mutators) and **Daily Void** (same seed for everyone each UTC day, streaks, share code + verify).
- **Save v2** — debounced write, daily backup, export/import code `LIGHT1.…` or `.light` file, lifetime records, 30 achievements.
- **Mobile** — floating touch sticks + dash/burst/pause buttons, safe-area HUD, LOW/MEDIUM/HIGH/AUTO quality, haptics.
- **Audio** — 42 SFX + 9 music ids, synth placeholders until real files are dropped in (see below).
- **Demo mode** — `?demo=1`: chapters 1–2 (waves 1–20), tree capped at 5000 M per node and the first two constellations, map locked, "Get the full game" card in menu / tree / demo-complete.

## Controls
| Action | Keyboard / mouse | Touch |
|---|---|---|
| Move | WASD / arrow keys | left joystick |
| Dash | Space / left click | DASH |
| Light Burst (when charged) | E (or Space) | BURST |
| Pause / skill tree | Esc | pause button |
| Skip cinematic | Space / Enter / click | tap |

## URLs
- **GitHub**: https://github.com/Goodboycat/Light-Rogue-Void
- **itch.io**: https://goodboycat.itch.io/light-rogue-void (set `FULL_GAME_URL` in `game/components/game/Constants.ts` if the slug differs)
- Local dev: http://localhost:3000 (`cd LIGHT/game && npm run dev`)

Useful URL flags: `?demo=1` · `?wave=N` · `?seed=X` · `?debug=1` (exposes `window.__LIGHT`) · `?gallery=1[&scale=N]` (sprite sheet) · `?sprites=1` (sprite mode) · `?cinematic=<id>[&t=s][&loop=1]` (play any film scene with a scrub bar) · `?nointro=1` (skip the launch film).

## Build & publish
```bash
# repo root contains LIGHT/ ; app in LIGHT/game/, docs in LIGHT/docs/, prompts in LIGHT/prompts/
bash LIGHT/game/tools/github.sh <TOKEN>   # once per sandbox, then: git push origin main
cd LIGHT/game && npm ci && npm run build   # dist/ (multi-file)
cd LIGHT/game && npm run dev               # http://localhost:3000
npm run typecheck                          # 0 errors is the gate
bash LIGHT/game/tools/itch.sh              # -> LIGHT/out/light-rogue-void-itch.zip (single index.html + sprites/ + audio/)
bash LIGHT/game/tools/next.sh              # prints the next chat ID + its prompt file
```
itch.io: upload the zip as an **HTML** project, check *This file will be played in the browser*, embed **1280 × 720**, enable *Mobile friendly* and fullscreen. Page copy, tags and theme CSS: `docs/ITCH_PAGE.md`. Screenshots: `npx playwright install chromium && node tools/shots.mjs` → `out/shots/`. Trailer: `docs/TRAILER.md`. Pre-release: `docs/CHECKLIST.md`.

Other tools: `npm run sim` (headless balance bot), `npm run test:save` (67 save checks), `npm run art` (sprite extraction), `npm run enemies` / `npm run story` (regenerate docs tables), `tools/bench.mjs` (mobile fps).

## Adding real audio
Every id in `game/audio/sfxIds.ts` has a Ludo.ai prompt in `docs/AUDIO_LUDO.md`. Drop files into `game/public/audio/<id>.ogg`, list them in `game/public/audio/manifest.json`, rebuild. Any id missing from the manifest keeps its synth placeholder. Generated audio is never committed.

## Docs
`docs/PLAN.md` (roadmap + chat history) · `docs/GDD.md` (design) · `docs/CONVENTIONS.md` (rules for every chat) · `docs/HANDOFF.md` (newest chat; older in `docs/handoff/`) · `docs/ENEMIES.md` / `docs/BOSSES.md` / `docs/TREE.md` (generated) · `docs/WORLD.md` · `docs/STORY.md` · `docs/BALANCE.md` · `docs/SAVE.md` · `docs/MOBILE.md` · `docs/ART.md` · `docs/AUDIO_LUDO.md` · `docs/ITCH.md` · `docs/ITCH_PAGE.md` · `docs/TRAILER.md` · `docs/CHECKLIST.md` · `prompts/<ID>.md` (one instruction file per chat).

Trimmed package note: `prompts/` ships only 8B / 9A / 9B (+ NEXT_CHAT, _TEMPLATE) and `docs/ref/` is left out; the finished prompts 0C–8A and the map reference image are in `LIGHT_extras.zip`.

## Progress
Finished chats 0 → 9B are listed in `docs/PLAN.md` → "History". The `Next:` line below is read by `tools/next.sh`.

### Next (in order)
Next: M3 M4 M5 M6 M7 M8 M9 M10

| Chat | Summary |
|------|---------|
| M0 | **DONE** — cinematic engine (`game/cinematic/`), `title_seam` (34 s launch film, once per session), `menu_loop` (24 s loop) and the main menu rebuilt as a film with a thin UI layer. `?cinematic=<id>` debug route. |
| M1 | **DONE** — chapter openers 1–3 (`opener_1..3`, 13 s each, 5 shots: card → place → Darkness → black turn → spark) replace the in-sim StoryCinematic for openers; `SurvivalGame` pause/hide/resume hook (`film` state); `tools/cinebench.mjs` per-shot ms/frame. |
| M2 | **DONE** — chapter openers 4–6 (`opener_4` Abandoned Machinery, `opener_5` Void Wastes, `opener_6` Seam of the Void 17 s) via the same hook; `openerKit` `OpenerTiming`; cinebench table for all six openers in `docs/HANDOFF.md` (blur = the M10 perf target). |
| M3–M10 | **THE MOVIE** — cinematic scene system, one part per chat. Brief: `docs/MOVIE.md`. The Capacitor APK (old chat 10) is **dropped — ignore it**. |

Branches: `main` = LIGHT, `original-complete` = the boring-but-complete original, `fixed-fork` = the rejected AI roguelike (read with `bash LIGHT/game/tools/fork.sh <path>`). Next chat: read `prompts/NEXT_CHAT.md`.

Unscheduled (prompt exists, not in the Next line): **0C** Foundation QA, **4C** Accessibility. Add them to the `Next:` line to run them.

## Credits & license
Design, code and procedural art: Goodboycat / Beato Forge. Audio prompts for Ludo.ai. `simplex-noise` vendored (MIT). Fonts/icons via lucide-react and framer-motion. License: see `LICENSE.md`.
