# HANDOFF — newest chat only

Read just this file. It holds **only the newest chat's entry** (below the line). Older entries are one file each in `docs/handoff/` (list: `docs/handoff/INDEX.md`) — open one only if you need it.

**At finish:** (1) copy the entry below to `docs/handoff/<its ID>.md` and add a line for it at the top of `docs/handoff/INDEX.md`; (2) replace everything below the line with your own entry (what is done, what is half-done, exact file/line pointers, known bugs, measured numbers). Keep this header.

---

## M0 — Cinematic engine + `title_seam` + `menu_loop` + main menu rebuilt: DONE
Gate: `npm run typecheck` 0 errors, `npm run build` green (JS 1.68 MB / 426 kB gzip), dist served + Playwright smoke `?nointro=1`: 0 JS errors (favicon 404 only). Spread over two chats (engine/scenes recovered from the tar in the first, menu rebuild + finish in this one).

**Files (all new unless noted)**
- `game/cinematic/Engine.ts` — `Track`/`K()`/`pulses()` keyframes with easing (`easeInOut`, `easeOutExpo`, `overshoot`, `slam`, `elastic`, `step`), deterministic `hash`/`wobble`, camera (x, y, zoom, rot, focus + decaying shakes) applied per layer through `parallax` (0 = screen-locked), rack focus via `depth` vs `camera.focus`, post stack once per frame (aberration 3 channel blits → wash → grain tile overlay → vignette sprite → letterbox → invert → flash → fade), `CinematicPlayer` class (`advance/seek/skip/render`, cues fire by t, skip = 0.35 s fade + drop remaining cues), `cinematicDpr()` (§2 policy). Design space 1920×1080 centred origin, cover-fit.
- `game/cinematic/Sprites.ts` — cached offscreen sprites keyed by colour+size: `glowDisc`, `bokehDisc`, `rayStrip`, `irisSprite`, `hazeBand`, `rgba()`.
- `game/cinematic/Draw.ts` — batched `embers` (one Path2D fill per colour bucket, positions computed from `hash(i)` + t, never stored), `stars`, `bokeh`, `spark` (3 glow sprites + ray strips), `godRays`, `eye` (lid/iris/pupil/veins, `open`, `look`), `eyeField`, `tendrils`, `ridge`, typography `text` / `typed` (glyph-by-glyph jitter + cursor) / `assemble` (per-glyph overshoot) / `rule`, `gradientBg`, `pool`. `shadowBlur` only inside `text`.
- `game/cinematic/scenes/title_seam.ts` (34 s, 8 shots, storyboard in header), `scenes/menu_loop.ts` (24 s loop, 4 shots + **title layer** `drawTitle`, parallax 0, scales with `g.hw` for portrait), `scenes/index.ts` registry.
- `game/components/CinematicPlayer.tsx` — fixed full-screen opaque canvas, own DPR/resize/input, `passive` (menu bg, no skip, pointer-events none), `z`, `debug` scrub bar + shot buttons + ms/frame readout.
- `game/components/CinematicDebug.tsx` — `?cinematic=<id>[&t=<s>][&loop=1][&mute=1]`; unknown id lists all scenes.
- `game/App.tsx` — `title_seam` once per session (`sessionStorage light.title_seam.seen`; skipped with `?nointro=1`, `?cinematic=`, `?gallery=1`), `StarBackground` **not mounted in the menu** any more (film replaces it), `MainMenu filmHidden={seam}` so only one full-screen canvas runs during the seam.
- `game/components/MainMenu.tsx` — **rewritten** (framer-motion gone): mounts `<CinematicPlayer scene={menu_loop} passive z={0}/>` as the background, thin UI on top: dev note / guide / settings icon buttons, collapsible **CHART** toggle (star chart + MapReveal appear in a glass strip above START), DailyCard, DemoCard, START button (`BEGIN` first run, `STAY LIT` after), chapter line + record, footer. Same props as before + `filmHidden`.

**Shots — `title_seam`**
1. 0–4 s extreme close, accelerating push-in: black, heavy grain, a violet hairline (closed lid) breathes — the Darkness exists before anything else.
2. 4–9 s push-in + rack focus: the lid opens unevenly into an Eye wider than the frame, a field of small eyes wakes; typed "it was always here." — hesitation = horror.
3. 9–14 s HARD CUT wide + decaying shake + pan left: the Eye is now small on a black horizon, tendrils pour over the ridge; "THE DARKNESS DOES NOT HUNT." — scale reversal is the escalation.
4. 14–19 s push into the tendrils, two inverted flash frames, grain/aberration peak; "IT WAITS." — the hostile peak.
5. 19–21.5 s HARD CUT to true black, 0.8 s of nothing, then one amber point at centre — the turn, silence as a cut.
6. 21.5–26 s overshoot zoom-out, letterbox opens: the Spark ignites (bloom, rays, embers, black → umber); "but something small refused." — warmth as relief.
7. 26–31 s LIGHT slams in with per-glyph overshoot, lit from below; rule; ROGUE VOID widens; `chapter_card` + `music_sting_reveal`, `music_title` starts — payoff.
8. 31–34 s hold, "tap to begin" pulses, fade — hands over to the menu.

**Shots — `menu_loop`** (loop; the Eye is the turn of every loop)
1. 0–8 s warm wide: spark on the ridge, 1000 embers, rays turning, breathing zoom; title warm-white with amber glow.
2. 8–14 s pan up + rack focus to sky: a darkness band drops in, a violet lid-line appears above the spark.
3. 14–18 s the Eye half-opens, pupil finds the spark; stars dim, embers slow, spark flinches; title cools to violet and dims; `boss_telegraph` soft.
4. 18–24 s the Eye closes; spark flares, rays bloom, title flares warm; camera settles back to shot 1; `shrine_touch` soft.

**Measured** (debug route ms/frame readout, sandbox Chromium headless — treat as upper bound): not measured on real hardware this chat; M10 owns the phone pass. The engine's per-frame cost is dominated by the embers Path2D (1020 particles) and the 3-blit aberration when active.

**Known soft spots / for later parts**
- `menu_loop` cues fire even when the menu is behind a modal (settings/guide) — harmless, AudioManager gates on settings.
- The `title_seam` text uses `shadowBlur` on 2–3 text draws per frame (allowed by §2); nothing else does.
- `MapReveal` (7D) still uses the old look inside the chart strip — M4 replaces it with `place_reveal_<n>` scenes.
- `StarBackground` remains for runs; the pause/skill-tree screens still show it (fine, they are gameplay-adjacent).
- Phone portrait: the title layer scales by `g.hw`; the START stack sits at the bottom with safe-area padding; not verified on a device.
