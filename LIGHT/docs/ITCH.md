# Publishing on itch.io

The itch build is `out/light-rogue-void-itch/index.html` (all JS/CSS inlined by `vite-plugin-singlefile`; Tailwind + Google Fonts stay on CDN, which itch allows) **plus** `sprites/` (149 PNG + `atlas.json`, ~1.4 MB, since 5B — too big to inline; loaded relative to `document.baseURI`, so itch's hashed CDN subfolder works). Zip root = `index.html` — that is what itch requires. The game is fully playable even if `sprites/` fails to load (procedural fallback).

```bash
bash LIGHT/game/tools/itch.sh      # -> LIGHT/out/light-rogue-void-itch.zip
```

## itch project settings (do these exactly — last upload failed on settings, not on the zip)
1. **Kind of project:** `HTML`.
2. Upload `light-rogue-void-itch.zip`, tick **"This file will be played in the browser"**.
3. **Embed options:** *Click to launch in fullscreen* or *Embed in page* with **Viewport 960 × 600** (any size; the game is responsive) and **Mobile friendly** ✓, **Fullscreen button** ✓.
4. **Frame options:** leave *SharedArrayBuffer support* off (not needed), *Orientation* = Landscape.
5. Save → **View page** — it must show the menu within ~3 s on a 4G phone (zip is 1.45 MB / 151 files, 2.6 MB inflated; sprites load lazily and only matter with "Sprite mode" on).
6. itch limits: 1000 files / 500 MB per HTML zip — we are at 151 files. `itch.sh` aborts if `index.html` is not at the zip root or `sprites/atlas.json` is missing.

## 8B fix (2026-10-29): blank page from the 8A build
`save/storage.ts:102` passed bare `setTimeout` as a method → `TypeError: Illegal invocation` on first render in every browser (node tests did not catch it). Fixed with arrow wrappers. The rebuilt zip was smoke-tested over HTTPS with Playwright: menu renders, 0 JS errors. **Before every upload:** `npm run typecheck` → `bash game/tools/itch.sh` → serve `out/light-rogue-void-itch/` and open it in a browser.

## Why the last upload showed a blank page (fixed 2026-10-29, 7A finish)
`components/MainMenu.tsx` used `IS_DEMO` / `DEMO_MAX_WAVE` without importing them → `ReferenceError: IS_DEMO is not defined` on first render, so every build since 7C crashed before the menu. The same pass fixed three more latent crashes caught by `npm run typecheck` (`SurvivalGame` never destructured `defeatedBosses/treasuresOpened/onTreasure` → breather crash after boss 1; `Gallery.tsx` wrong types path; `EnemyRenderer` enrage ring read a non-existent field). **`npm run typecheck` is now clean (0 errors) and is part of the gate — run it before every itch build.** Smoke-tested over HTTPS with Playwright: title renders, menu shows, zero JS errors (only the Tailwind CDN warning + favicon 404).

## Checks done in the 4B chat (2026-10-28)
- `unzip -l` → exactly one entry `index.html` (1 479 882 bytes). No `assets/` folder, no absolute `/` paths (`base: './'`).
- Served from a static server and opened with Playwright over HTTPS: page title *Light Rogue Void* renders, **zero JS errors**, only the expected `cdn.tailwindcss.com should not be used in production` warning.
- `localStorage` access is wrapped in `try/catch` (`hooks/useGameSave.ts:42,101,121`) so itch's sandboxed iframe (third-party storage blocked in some browsers) cannot crash the menu.

## Known soft spots
- If itch shows a blank page: open devtools; the only plausible causes are CDN blocked (Tailwind) → page loads unstyled but works, or a `?debug=1` left in the URL.
- Fonts come from Google Fonts; offline/blocked → falls back to sans-serif.
- 7B (mobile QA) should re-upload and test on a real phone inside the itch iframe (touch joystick + `touch-action: none`).
