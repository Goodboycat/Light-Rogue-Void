# Trailer shot list (9B): 45 s

Record at 1920×1080 / 60 fps from the itch build (`bash game/tools/itch.sh`, serve `out/light-rogue-void-itch/`). Hide the cursor, set Settings → Quality = High, and keep Reduce Flash off. URL flags that already exist: `?wave=N` (start wave), `?seed=N` (world layout), `?debug=1` (`window.__LIGHT`, e.g. `__LIGHT.state.activeBoss.hp = 1` to skip to an outro), `?demo=1` (demo badge, chapters 1–2). Use the same `?seed=7` for every shot so landmarks sit in the same places across retakes.

Music: one edit of **`music_boss`** (130 BPM, `docs/AUDIO_LUDO.md`), with **`music_title`** for the first 6 s and **`music_ending`** for the last 6 s. Cut on the beat: one bar is about 1.85 s.

| # | Time | Shot | How to reproduce | Audio cue |
|---|---|---|---|---|
| 1 | 0.0–3.0 | Black → a single spark fades in, then the WATCHER line | fresh save (clear site data), `?seed=7`, press INITIALIZE, record the intro | `music_title` |
| 2 | 3.0–6.0 | Title: "You are the last spark." | text card over shot 1 (editor) | `music_title`, then a riser |
| 3 | 6.0–9.0 | Star chart with fog burning off a new place | save with `maxWaveReached` 11 → menu reveal cinematic (7D) | `music_sting_reveal` |
| 4 | 9.0–13.0 | Wave 5 chaos: aura, fireflies, streak banner | `?seed=7&wave=5`, play 15 s, keep the 25-streak moment | `music_boss` drop |
| 5 | 13.0–16.0 | Evolution Matrix pan + a node unlock | Esc in a run → tree, drag-pan, buy a node | UI clicks on the beat |
| 6 | 16.0–19.0 | Landmark / shrine discovery | `?seed=7&wave=2`, walk to the first world point | `landmark_reveal` |
| 7 | 19.0–23.0 | Hive Mind arrival + telegraph circles + dash through | `?seed=7&wave=10` | `boss_arrive` |
| 8 | 23.0–27.0 | Void Warden phase shift (arena pulse) | `?seed=7&wave=20`, damage to 66 % | `boss_phase` |
| 9 | 27.0–31.0 | Crimson Eclipse solar lasers, dash through the gap | `?seed=7&wave=30` | `boss_telegraph` → `boss_fire` |
| 10 | 31.0–34.0 | Light Burst firing into a swarm (hit-stop + shake) | any wave ≥ 15 with Burst unlocked, press E | `burst_fire` |
| 11 | 34.0–37.0 | Quick cuts of bosses 4–6 (1 s each) | `?wave=40`, `?wave=50`, `?wave=60` | riser |
| 12 | 37.0–39.0 | Darkness death → ending light | `?wave=60&debug=1`, then `__LIGHT.state.activeBoss.hp = 1` | `music_ending` |
| 13 | 39.0–42.0 | STAY / LEAVE choice, then "ENDLESS · DAILY VOID" text | ending screen; text card in the editor | `ending_stay` |
| 14 | 42.0–45.0 | Logo + "Play free on itch.io" | editor card | final chord |

## Notes
- Shots 7–9 are easiest with a strong tree. Give yourself a full tree with the dev unlock on the menu (`onUnlockAll`), or record with the save from `tools/shots.mjs`.
- Do not show `?debug=1` overlays. The debug flag only exposes `__LIGHT` and draws no HUD.
- For a 15 s vertical cut (shorts), use shots 4, 7, 9, 10, 12 and 14 at 9:16. The game is responsive, so set the browser to 1080×1920.
