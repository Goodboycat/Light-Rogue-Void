# HANDOFF — newest chat only

Read just this file. It holds **only the newest chat's entry** (below the line). Older entries are one file each in `docs/handoff/` (list: `docs/handoff/INDEX.md`) — open one only if you need it.

**At finish:** (1) copy the entry below to `docs/handoff/<its ID>.md` and add a line for it at the top of `docs/handoff/INDEX.md`; (2) replace everything below the line with your own entry (what is done, what is half-done, exact file/line pointers, known bugs, measured numbers). Keep this header.

---

## B1 — BUGS.md fix pass (chat 10 list): PARTIAL — 9 of 13 fixed; #11 #12 open, #1 #2 were already fixed
Gate: `npm run typecheck` 0 errors, `npm run build` green (JS 1.87 MB / 486 kB gz), `npm run itch` → `LIGHT/out/light-rogue-void-itch.zip` 2.43 MB (single-file index.html 2.69 MB). GitHub is the source of truth — `git fetch origin` first, always. All work in `LIGHT/`, nothing else needed in `LIGHT_extras/`.

**Fixed this pass (one commit each, message starts `BUGS #n:`; `git log --oneline | grep BUGS`)**
- #3 `a4d1f68a` run-start spawn shield — `Constants.ts` `SPAWN_SHIELD_FRAMES` (5 s still) / `SPAWN_SHIELD_AFTER_MOVE_FRAMES` (1 s after first move/dash); `onPlayerHurt` returns false while active; dashed ring + "SHIELDED · MOVE TO BEGIN" in `renderer/PlayerRenderer.ts`.
- #4 `a87d511` `DeathSummary.tsx` clamps `maxWaveReached` to finite int ≥ 1 (falls back to `summary.wave`) so the button never reads "RE-IGNITE AT WAVE ?".
- #7 `19530f3` menu title in `menu_loop.ts` `drawTitle`: bold 700 44 px, gold/violet glow, dark plate; no longer fades to pale violet while the Eye watches.
- #8 `034d171` hurt vignette edge-only (gradient from 60 % radius), alpha 0.3–0.5 scaled by missing HP (was flat 0.75).
- #5 `6820ac8` Crimson Eclipse lasers source-over 0.38/0.22 (were additive → white), core orange 0.45, flare core amber 0.55, phase-3 flash 0.35.
- #6 `5907247` Darkness body in `EnemyRenderer.ts` visualType DARKNESS: jagged black disc + violet rim, 8 tendrils, iris rings, slit eye; phase-core overlay dim violet not white.
- #10 `fcda2a6` desktop-only HUD text (`md:` classes; mobile untouched per user): `GameOverlay.tsx` wave label `md:text-sm`, kills `md:text-xs`, light phrase `md:text-xl`, darkness phrase `md:text-base`, maturity rank `md:text-xs`; `StoryCaption.tsx` body `md:text-lg`, label `md:text-xs`, box `md:max-w-2xl`; `GameHUD.tsx` ESC hint `md:text-sm`, demo badge `md:text-xs`; `BossBar.tsx` phase text `md:text-sm`, HP % `md:text-xs`.
- #9 `6443083` `EvolutionMatrix.tsx` `#tree-fresh-hint` card at 60 % height while `respecInfo.count === 0 && !previewId` — two texts: matter > 0 → "tap a green node … drag to pan"; matter = 0 → "survive waves to earn dark matter … RESUME". `MenuSideButton` icon pad `md:p-4`, label `md:text-base`; RESUME `md:text-sm`.
- #13 `54d6ada` `docs/CHECKLIST.md` §7 sub-bullet: `sudo npx playwright install-deps chromium && npx playwright install chromium` once per sandbox or `tools/shots.mjs` exits 127.

**Not done**
1. #11 bundle is one 1.87 MB chunk (grew 1.65 → 1.87 since chat 10 because of M8–M10 cinematics). Candidate: `vite.config.ts` `build.rollupOptions.output.manualChunks` → split `cinematic/` scenes + `framer-motion` + `@fontsource` CSS; **but** `tools/itch.sh` uses `vite-plugin-singlefile`, which inlines everything anyway, so chunking only helps the non-itch (Pages) build. Low value; skip unless the user asks.
2. #12 shared SFX files (`enemy_die_big` / `meteor_hit` → heavy_slam) — waits on the Ludo batch (`docs/AUDIO_REMAINING.md`). Nothing to do until the files arrive.
3. No screenshot verification was run this chat (credits) — #9 / #10 are unverified visually. If the next chat has budget: `sudo npx playwright install-deps chromium && npx playwright install chromium && node tools/shots.mjs` and look at `out/shots/02-tree.png` (hint card should sit under the spark, not over the bottom nav arrows) and `04-wave5.png` (wave label 14 px).
4. M10b leftovers (device zip check on iOS/Android, optional cinebench `all --low`, TRAILER frames) are still open — `docs/handoff/M10b.md`.

**Known soft spots**
- `#tree-fresh-hint` is `pointer-events-none` at `top-[60%]`; on short phone landscapes (≤ 400 px tall) it may overlap the `bottom-32` buyable-node arrows — if so move it to `top-[52%]` or hide below `md:`.
- Hint condition uses `respecInfo.count` (unlocked ids minus `spark`) — a save with matter spent then fully refunded shows the hint again (intended).
- #10 only touched `md:` classes; the `touch` (joystick) branch sizes are unchanged, and the itch embed at 960×540 **is** ≥ `md` (768 px) so it gets the larger sizes — that was the bug's actual repro.
