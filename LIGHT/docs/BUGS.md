# BUGS — found in chat 10 (play via tools/shots.mjs at 1920×1080, itch build, Chromium headless)
Not fixed unless marked FIXED. Severity: H = blocks/looks broken, M = noticeable, L = polish.

| # | Sev | Bug | Where / repro |
|---|-----|-----|---------------|
| 1 | H | FIXED (chat 10): enemies drew as "dots" first, then full bodies. Auto quality measured the load hitch → dropped to LOW → LOW always batched enemies as silhouettes; 10 s hysteresis before stepping back up. | `components/game/Quality.ts` (4 s warm-up added), `renderer/EnemyBatcher.ts` `shouldBatchEnemies` (only ≥ 600 visible now), `Constants.ts` `ENEMY_BATCH_MIN_VISIBLE` |
| 2 | H | FIXED (chat 10): needed internet — Tailwind came from cdn.tailwindcss.com, fonts from Google Fonts. Offline the whole UI was unstyled. | `index.html`, now `index.css` + `tailwind.config.cjs` + `@fontsource/*` |
| 3 | H | Starting at `?wave=10/20/30/60` with no movement: the spark dies in < 15 s, before the boss even shows. A new player who stands still to read the HUD gets "EXTINGUISHED" with no warning. | first run of `tools/shots.mjs` (before i-frames were added to the script) |
| 4 | M | Game-over button reads **"RE-IGNITE AT WAVE ?"** — the `?` looks like a missing value. | `components/GameOver.tsx` (grep "RE-IGNITE") |
| 5 | M | Crimson Eclipse (wave 30) fills the whole screen with near-white red; the player, bullets and HUD are unreadable for seconds. Reduce Flash off. | `?seed=7&wave=30`, screenshot 6 |
| 6 | M | Darkness (wave 60) body renders as a big flat white blob — no silhouette, no face, reads as a rendering glitch rather than the final boss. | `?wave=60`, `out/shots/08-ending.png` |
| 7 | M | Title screen: "VOID" is a dark outline on a dark background, close to invisible at small sizes (itch thumbnail, phones). | `MainMenu.tsx` |
| 8 | M | Wave 5: the red vignette takes over ~70 % of the screen at full HP (it looks like the low-HP warning). | `?seed=7&wave=5`, screenshot 4 |
| 9 | L | Skill tree on a fresh save: one node in the middle of a 1920×1080 empty screen; the side buttons are tiny. No hint about what to do. | screenshot 2 / `02-tree.png` |
| 10 | L | HUD text (wave label, phrases, captions) is ~9–10 px at 1080p — unreadable on itch's embedded 960×540 frame. | `GameHUD.tsx`, `StoryCaption.tsx` |
| 11 | L | JS bundle 1.65 MB (412 kB gzip) in one chunk; itch zip is now 2.36 MB with 28 SFX. Fine for itch, slow first load on mobile. | `vite build` output |
| 12 | L | Several mapped SFX share files (`enemy_die_big` and `meteor_hit` both use heavy_slam). That's fine for now, but replace them when the Ludo files arrive. | `public/audio/manifest.json` |
| 13 | L | The headless run logs `exitCode=127` until `npx playwright install-deps chromium` has run. Document this in CHECKLIST (one-time sudo). | `tools/shots.mjs` |
