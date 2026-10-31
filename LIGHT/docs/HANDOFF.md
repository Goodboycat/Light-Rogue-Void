# HANDOFF — newest chat only

Read just this file. It holds **only the newest chat's entry** (below the line). Older entries are one file each in `docs/handoff/` (list: `docs/handoff/INDEX.md`) — open one only if you need it.

**At finish:** (1) copy the entry below to `docs/handoff/<its ID>.md` and add a line for it at the top of `docs/handoff/INDEX.md`; (2) replace everything below the line with your own entry (what is done, what is half-done, exact file/line pointers, known bugs, measured numbers). Keep this header.

---

## M6 — Death + run summary as film scenes + DeathSummary thin layer + cinebench: DONE
Gate: `npm run typecheck` 0 errors, `npm run build` green. Steps 1–4 were pushed by the previous chat (`7077708` death scene, `05acc9c` run_summary factory, `8758423` hook, `f629a6c` measure); this chat did step 5 (finish) and moved on to M7. The GitHub repo is the source of truth — `git fetch origin` first, always.

**Files**
- `game/cinematic/scenes/death.ts` — 6.0 s, `DT = { eye 1.4, flare 3.2, out 4.1, black 4.4, end 6.0 }`. s1 the floor goes cold (amber → violet), ink climbs every edge, the spark's pool shrinks (`player_death`, `cin_silence_drop`) · s2 the Eye opens behind the spark filling the top of frame, tendrils from the ink, DARKNESS "There. Small." (`cin_whisper`, `cin_tendril`) · s3 the turn: one defiant flare, then the gutter to a mote, the Eye blinks shut, white flash → nothing (`burst_fire`, `cin_cut`) · s4 1.2 s of TRUE black (no grain, no vignette), one ember crosses low. `?cinematic=death`.
- `game/cinematic/scenes/run_summary.ts` — `makeRunSummary(data: SummaryData)` builds the live looping (10 s) scene; the exported `run_summary` is the demo default for `?cinematic=run_summary`. s1 the ember relights ONE spark centre-high, warm pool spreads (`pickup_essence`) · s2 WAVE n headline (gold) + the stats row typed one by one kills · elites · bosses · time (`chapter_card`, `ui_click`) · s3 "+N MATTER" slides violet → gold, the SUGGESTIONS §5 glowing arrow is born from the spark and points DOWN at the TREE button, "+k NEW NODES AFFORDABLE" when k > 0 (`pickup_relic`, `ui_unlock`) · s4 the whole composition breathes, LIGHT's line "It noticed me. Good." (`story_line`); 9.3 → 10.0 typography fades and the spark dims = the loop seam.
- `game/components/DeathSummary.tsx` — the thin button layer over the film: passive `CinematicPlayer` running `makeRunSummary`, TREE under the arrow (design y 330, screen-locked), RE-IGNITE AT WAVE n / RETRY CHAPTER / MENU, respawn-wave picker when `maxWaveReached > 1`, boss death hint line. `GameOver.tsx` + `RunSummary.tsx` kept on disk, unimported.
- `game/components/SurvivalGame.tsx` l.~505–514 — **the hook**: the frame HP hits 0 → `clearInterrupt`, `filmOnDoneRef.current = () => setGameOver(true)`, `setFilm(getScene('death'))` (M1 pause/hide/resume contract; skipping still lands on the summary). l.~916–925 renders `DeathSummary` when `gameOver`. Prop `affordableNodes` (l.73).
- `game/App.tsx` l.332 — `affordableNodes` memo: EvolutionMatrix's buyable rule (unlocked neighbour + cost ≤ matter) counted over the tree → passed to `SurvivalGame`.
- `game/components/CinematicDebug.tsx` — `&loop=0` forces one pass so `cinebench` finishes on looping scenes.

**Measured — `tools/cinebench.mjs`** (swiftshader software GL → upper bounds; MOVIE.md targets are for real GPUs; M10 owns the device pass). `--noblur`. Desktop 1920×1080 dpr1; phone 390×844 dpr2 + CPU 4×. avg ms/frame per shot. Both scenes × both modes completed, 0 page errors.

| scene | mode | s1 | s2 | s3 | s4 |
|---|---|---|---|---|---|
| death | desktop | cold floor ~70 | **the Eye 122** | the flare ~90 | true black **3** |
| death | phone | ~85 | **176** | ~130 | 3 |
| run_summary | desktop | 45–58 flat across all four shots | | | |
| run_summary | phone | 68–80 flat across all four shots | | | |

Readings: death s2 (the Eye at r ≈ 1500 + tendrils + ink gradients) is the heavy shot, same family as the interrupt closers — M10 candidate: cache the sclera gradient once per shot offscreen. s4 proves true black costs nothing (3 ms = the engine floor). run_summary is typography + ~200 embers and is flat; it loops forever under the buttons so its cost IS the death-screen idle cost — fine.

**Known soft spots**
- Not eyeballed on a real GPU (credits) — verified by typecheck/build + 4 clean cinebench runs.
- The arrow points at design y 330; if `DeathSummary` button layout moves, move `ARROW_TARGET_Y` in `run_summary.ts` with it.
- `affordableNodes` is computed once from the matter in the bank at death; the +matter from this run is already added (sendRunEnd runs before gameOver renders), but if 8B changes the order the count would be one run stale.
- Skipping `death` in the first 1 s is blocked by the engine's skip gate — intended (the beat must land once).
- `GameOver.tsx` / `RunSummary.tsx` are dead files; M10 may delete them.

**Credits/tokens** (user asked each report to carry this): M6 steps 1–4 were a previous chat, usage unknown (axed before reporting). This chat's M6 step 5 ≈ 25 k tokens (mostly reading the repo); the rest of this chat's usage is reported in the M7 entry below / in chat.
