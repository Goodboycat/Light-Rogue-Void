# MOBILE — checklist + device quirks (7B)

Half the players are on phones. Everything here is about *detail* profiles, layout and input — never counts
(CONVENTIONS rule 9). Code: `game/components/game/Quality.ts`, `components/MobileControls.tsx`,
`components/game/Input.ts`, `utils/haptics.ts`, `components/game/renderer/EnemyBatcher.ts`, `tools/bench.mjs`.

## Quality profiles (`Quality.ts`)
| Mode | glow sprites | shadowBlur | damage floaters | particle detail | outlines | DPR cap |
|------|--------------|------------|-----------------|-----------------|----------|---------|
| LOW | off | off (ctx accessor forces 0) | off | 0.6 | off → **all plain enemies batched** | 1 |
| MEDIUM | on | off | on | 0.85 | on (batched ≥ 120 visible) | 1.5 |
| HIGH | on | on | on | 1 | on (batched ≥ 120 visible) | 2 |

AUTO (default on first run): 3 s windows, step down < 28 fps, up > 55 fps, 10 s hysteresis. Settings → Performance.
Counts (enemies, particles, projectiles) are **never** touched by a profile.

## Measured (step 5, this sandbox)
`node tools/bench.mjs --mode LOW --throttle 4 --secs 30 --wave 40` — headless Chrome 156, SwiftShader GL,
390×844 @ DPR 2, CPU throttle 4×, wave 40 standing still for 30 s (player fights with auto-fire only):

| Mode | avg ms | p95 ms | worst ms | fps | frames ≤ 33 ms |
|------|--------|--------|----------|-----|----------------|
| LOW | 30.9 | 37.3 | 347 (first frame after throttle) | **32.4** | 83 % |
| MEDIUM | 53.9 | 64.1 | 286 | 18.6 | 4.5 % |

Caveats: SwiftShader software GL is slower than a real phone GPU at raster but faster at JS; the bench never moves,
so crowd on screen stayed small (4–6 enemies, ≤ 58 particles alive at wave 40 start — the director's grace period).
Treat these as *relative* numbers (LOW ≈ 1.75× MEDIUM). Re-run after any renderer change; a real-device pass is
owed (see checklist). `CHROME_BIN=…/chrome` if `chromium_headless_shell` is missing; `npx playwright install chromium`
+ `apt-get install libatk1.0-0 libatk-bridge2.0-0 libcups2 libxkbcommon0 libgbm1 libnss3 libasound2 libpango-1.0-0`
were needed in the sandbox.

## Checklist (run on a device or DevTools device mode; tick in HANDOFF)
### 390×844 portrait (iPhone 12/13/14, Pixel-class)
- [ ] Menu: INITIALIZE, world map, guidebook/settings buttons reachable one-handed; map pinch/zoom does not scroll the page.
- [ ] Touch sticks appear where the thumb lands (left half = move, right half = aim); origin drags past the ring; 8 px dead zone.
- [ ] Dash / Burst / Pause buttons under the right thumb, none under the HUD plates; `env(safe-area-inset-bottom)` keeps them above the home bar.
- [ ] Boss bar sits below the top row; wave plate shrinks under it; burst meter under matter.
- [ ] Story captions do not cover the sticks; cinematic letterbox + SKIP hint visible.
- [ ] MapBreather / MapReveal letterboxed (3:2 map) and CONTINUE reachable.
- [ ] Skill tree: one-thumb pan + pinch zoom 0.5–2.5, search box usable with the virtual keyboard open.
- [ ] No text selection / long-press callout / tap highlight anywhere on the canvas layer.
### 844×390 landscape
- [ ] `<500 px high` media query active: vitals/wave/matter/burst in corners, dash/burst/pause lifted clear of thumbs.
- [ ] Letterboxed cinematics still show captions above the bottom bar.
### 768×1024 tablet
- [ ] Sticks sized for a larger thumb reach (no change needed — they float); HUD plates not comically small.
- [ ] Both orientations keep the map and tree inside the viewport.
### Any
- [ ] AUTO quality reaches ≥ 30 fps by wave 10 on a mid phone; the mode chip in Settings shows the chosen profile.
- [ ] Haptics: LIGHT buzzes on hurt/dash/burst/phase; OFF is silent; FULL adds boss death.
- [ ] Audio unlocks on first tap (iOS Safari); hidden tab mutes; return restores.
- [ ] Batched enemies (LOW, or ≥ 120 visible) still read: tint colour per def, darker core; elites/flash/shielded/warn
      keep full procedural drawing.

## Known device quirks
- **iOS Safari `100vh`** includes the URL bar → root uses `100dvh` (index.html) and `viewport-fit=cover`.
- **iOS Safari** fires synthetic mouse events after touch → `Input.ts` ignores `pointerType !== 'touch'` events
  that arrive within the touch window; sticks use pointer ids so a second finger never steals the first.
- **Android Chrome** may throttle rAF to 30 Hz when the device is hot → AUTO will drop to LOW; this is expected,
  not a bug. `Quality.ts` hysteresis stops ping-pong.
- **`shadowBlur`** is catastrophically slow on Android GPU rasterisation → gated off on LOW/MEDIUM by the ctx
  accessor (`installQualityCtx`); never add an ungated `shadowBlur` in a hot loop anyway (use `GlowSprites`).
- **DPR 3 phones** (Pixel 7/8, S-series) render 9× the pixels at native DPR → capped at 1 / 1.5 / 2 by profile
  (`fitCanvas`); CSS px coordinates are unchanged, so touch maths needs no DPR.
- **`navigator.vibrate`** is absent on iOS → `haptics.ts` is a no-op there (no error).
- **Samsung Internet** blocks `AudioContext` until a *touchend* → `AudioManager.init` listens on
  pointerdown + keydown + touchstart; if a device still stays silent add `touchend`.
- **itch.io iframe**: `touch-action: none` on the canvas layer prevents the page from scrolling behind the game;
  the game must still be opened in fullscreen (itch "Fullscreen button" on) for safe-area insets to apply.

## Not done / owed to a later chat
- No real-device pass (sandbox has no phone): the checklist above is unticked.
- Bench runs with a still player; a scripted move pattern (circle at 0.7 stick) would stress the crowd better.
- `ENEMY_BATCH_MIN_VISIBLE` (120) is a guess — tune on a device: lower if MEDIUM stutters at wave 30+.
