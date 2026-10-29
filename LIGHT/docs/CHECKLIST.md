# Pre-release checklist (9B step 6)

Tick every box before uploading a new itch build or handing the APK to chat 10. Credits are scarce: a human with a browser does the "play" lines; the sandbox does the "run" lines.

## 1. Code gate (sandbox)
- [ ] `cd LIGHT/game && npm ci && npm run typecheck` → 0 errors.
- [ ] `npm run test:save` → 67/67 checks pass (v0 → v1 → v2 migration fixtures).
- [ ] `npm run sim -- --from=1 --to=20` finishes with no exception (smoke, not balance).
- [ ] `bash LIGHT/game/tools/itch.sh` → `LIGHT/out/light-rogue-void-itch.zip`, **< 5 MB without audio** (9A measured 1.48 MB; sprites ≈ 1.4 MB of that), `index.html` at zip root, `sprites/atlas.json` present.
- [ ] Zip served over HTTPS opens with **0 JS errors** (Playwright or a real browser; the only tolerated console lines are the Tailwind CDN warning and favicon 404).
- [ ] `git status` clean, pushed to `origin/main`; `docs/HANDOFF.md` updated.

## 2. Version bump
- [ ] `LIGHT/game/package.json` `version` (currently `0.0.0`) → semantic version, e.g. `1.0.0` for the jam build, `1.0.x` for hot-fixes.
- [ ] Same number in `docs/ITCH_PAGE.md` devlog line and the itch page "Version" field.
- [ ] `SAVE_VERSION` in `game/save/schema.ts` **only** changes if the save shape changed; if it did, add a migration + fixture (`docs/SAVE.md`) and re-run `npm run test:save`.

## 3. Save wipe test (browser)
- [ ] DevTools → Application → Local Storage → delete `light_save_v2`, `light_save_backup`, `light_daily_v1` → reload: menu shows a fresh spark, no map, no Daily card, no errors.
- [ ] Play to wave 2, reload: progress persists (debounced write + flush on pagehide).
- [ ] Settings → Save transfer: copy code → wipe → paste → confirm: progress returns.
- [ ] Import a v1 code (fixture in `game/tools/fixtures/`) → migrates, no errors.
- [ ] Load with `?demo=1` on a full save: menu shows DEMO badge + "Get the full game" card, map locked past place 2, tree nodes above 5000 M show the full-version lock label, demo completes at wave 20.

## 4. Play test (one human, ~30 min)
- [ ] Wave 1 → boss 1 (Hive Mind) without `?wave=`: openers, chapter card, story captions, boss intro cinematic, boss bar, death hint on a loss.
- [ ] `?wave=19` Void Warden, `?wave=29` Crimson Eclipse: telegraphs visible, lasers kill, ECLIPSE blackout readable with `reduceFlash` on.
- [ ] `?wave=59` Darkness → ending → STAY → wave 61 endless with mutator banner; LEAVE → credits → menu.
- [ ] Map breather after a boss, map reveal cinematic, treasure cache opens once.
- [ ] Daily Void: PLAY DAILY, share code appears after the run, verify box accepts it.
- [ ] Pause → Guidebook, Archives (bestiary, records, achievements), RESPEC confirm.
- [ ] Achievement toast appears at least once.

## 5. Mobile test (real phone, Chrome Android + Safari iOS)
- [ ] itch page in portrait and landscape: joystick + DASH/BURST/pause buttons reachable with thumbs, nothing under the notch (`100dvh`, safe-area insets).
- [ ] Quality AUTO picks LOW/MEDIUM on a mid phone; wave 20 stays ≥ 30 fps on LOW (bench: 32.4 fps at 4× CPU throttle, `docs/MOBILE.md`).
- [ ] Haptics LIGHT fires on dash/hurt (Android only; iOS silently no-ops).
- [ ] No 300 ms tap delay, no page scroll/zoom while playing (`touch-action: none`).
- [ ] Audio unlocks on the first tap; hidden tab mutes.

## 6. Audio present
- [ ] Every id in `game/audio/sfxIds.ts` (42 SFX + 9 music) either has a file in `game/public/audio/` **listed in `manifest.json`** or is intentionally left on its synth placeholder.
- [ ] Loudness: music −16 LUFS, SFX peaks ≤ −3 dBFS (`docs/AUDIO_LUDO.md` export specs).
- [ ] Files are `.ogg` (+ `.m4a` fallback for Safari if any id fails to decode).
- [ ] Generated audio is **not committed** (CONVENTIONS rule 4); it is only dropped into the zip/APK.
- [ ] Zip size re-checked after audio: aim < 25 MB for itch browser play.

## 7. itch.io page
- [ ] HTML project, zip uploaded as **light-rogue-void-itch**, "This file will be played in the browser" checked.
- [ ] Embed 1280 × 720, Mobile friendly ✔, fullscreen button ✔, SharedArrayBuffer **off**.
- [ ] Copy, tags, theme CSS from `docs/ITCH_PAGE.md`; 8 screenshots from `out/shots/` (`node tools/shots.mjs`); cover 630 × 500.
- [ ] Demo link, if used, is the same zip opened with `?demo=1` embedded via an itch `?demo=1` query on the embed URL (or a second HTML upload) — and `FULL_GAME_URL` in `game/components/game/Constants.ts` points at the real page.
- [ ] Trailer uploaded (shot list `docs/TRAILER.md`).

## 8. APK notes for chat 10 (Capacitor)
- [ ] `game/capacitor.config.json` exists (`appId`, `webDir: dist`); `npm run build` first — Capacitor copies `dist/`, not the itch single-file build.
- [ ] Android: `npx cap add android`, `npx cap sync`, open in Android Studio, set `versionCode`/`versionName` = package.json version, signing key stored outside the repo.
- [ ] Orientation: landscape preferred, portrait allowed (the HUD supports both).
- [ ] Back button → pause (Capacitor `App.addListener('backButton')`), not exit.
- [ ] Haptics via `@capacitor/haptics` replaces `navigator.vibrate` on iOS (`utils/haptics.ts` has the switch point).
- [ ] Save lives in WebView localStorage — advise users to export a `.light` code before uninstalling; Save transfer already works for this.
- [ ] Audio files ship inside the APK (`public/audio/` → assets), no network needed; test the first-gesture unlock on Android WebView.
- [ ] Test LOW quality on a 2019-class phone before store upload; target size < 40 MB.
