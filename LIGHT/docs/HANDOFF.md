# HANDOFF — newest chat only

Read just this file. It holds **only the newest chat's entry** (below the line). Older entries are one file each in `docs/handoff/` (list: `docs/handoff/INDEX.md`) — open one only if you need it.

**At finish:** (1) copy the entry below to `docs/handoff/<its ID>.md` and add a line for it at the top of `docs/handoff/INDEX.md`; (2) replace everything below the line with your own entry (what is done, what is half-done, exact file/line pointers, known bugs, measured numbers). Keep this header.

---

## M5 — The Darkness Interrupt ×6 as film scenes + scheduler + six readable threats + cinebench: DONE
Gate: `npm run typecheck` 0 errors, `npm run build` green (JS 1.83 MB / 472 kB gzip). Steps 1–3 were pushed by the previous chat (`29e052a` kit + six scenes, `2661496` audio ids, `427b072` hook); this chat did step 4 (measure) and step 5 (finish). The GitHub repo is the source of truth (the attached tar was a chat behind again — `git fetch origin` first, always).

**Files**
- `game/cinematic/scenes/interruptKit.ts` — shared spine. `IT = { rise 1.2, turn 3.2, strike 4.2, end 5.0 }`; `freezeBed` (shot 1: the warm floor with motes frozen mid-air, ink eats it in ~0.5 s, a violet bruise low in frame), the typed DARKNESS line, `threatName` (caps-lock name + READ hint), ink rise, ash, post/camera/cue spines. Every interrupt: the freeze → the apparition (push that never stops) → the turn (HARD CUT closer, inverted frame, it moves first) → the strike (name slams in, flash, HARD CUT to black → gameplay).
- `interrupt_1` THE EYE → THE GAZE (line that tracks 1.2 s, locks, fires — step out of the line). `interrupt_2` THE HAND → THE PALM (circle r 320 leading your facing — stand still at its edge). `interrupt_3` THE MAW → THE JAW (ring closes inward — stay in the middle). `interrupt_4` THE WALL OF EYES → THE WATCH (wall sweeps with one gap w 180 — walk to the gap). `interrupt_5` THE MIRROR → THE ECHO (black copy replays your last 1.5 s, detonates — leave where you were). `interrupt_6` THE STARE → THE SILENCE (arena dark, one lit disc drifts 2.5 s — follow the light). Each file starts with its storyboard table. All six registered in `scenes/index.ts` (`?cinematic=interrupt_<n>`).
- `game/components/game/logic/DarknessInterrupt.ts` — **scheduler + threats** (one file, both halves). `updateDarknessInterrupt(state, wave, maxHp)` every sim frame (`Logic.ts` l.184, non-cinematic block): first at `FIRST_AT_FRAMES` 3600 (~60 s), then re-armed for `wave + EVERY_WAVES (3)`, firing `INTO_WAVE_FRAMES` 15 s into that wave; blocked (retry 10 s) on boss/endless waves or while a boss is alive. Random 1..6, never the same twice in a row → `state.interruptRequest = n`. `spawnInterruptThreat(state, n)` builds the threat on the existing telegraph pool (`BossKit telegraph/telegraphContains`, drawn by `TelegraphRenderer.ts` — no new renderer code), world card `NAME / READ` (150 f), `boss_arrive`, shake 22, violet flash. `steer` drives the live threat; hits = `INTERRUPT_DMG` 0.4 × maxHP (min 20) through `state.damagePlayer` (i-frames respected). `clearInterrupt` drops the live threat + THE SILENCE blackout (`state.eclipse`).
- `game/components/SurvivalGame.tsx` — **the hook**: `playInterrupt(n)` l.~229–241: clears the request, `getScene('interrupt_n')`, `filmOnDoneRef.current = () => spawnInterruptThreat(gameStateRef.current, n)`, `setFilm(scene)` (the M1 pause/hide/resume contract — sim does not tick during the film; skipping still spawns the threat). Polled after `updateGame` l.~630 gated `!filmRef.current && !state.activeBoss`. Death path l.~507 calls `clearInterrupt`. Debug: `?interrupt=<n>` forces scene n 1.5 s after the run starts.
- `game/components/game/types.ts` l.258–261 — `interrupt?: InterruptState`, `interruptRequest?: number`.
- `game/audio` — new sfx ids `cin_whisper / cin_cut / cin_silence_drop / cin_tendril` (synth families) + AUDIO_LUDO prompts; scene cues use manifest ids only (CONVENTIONS rule 6).
- `docs/CINEMATIC.md` §3 — the pause/hide/resume contract and the interrupt scheduler/threat table (M5 owns this doc).

**Measured — `tools/cinebench.mjs`** (swiftshader software GL → every number is an UPPER bound; MOVIE.md targets ≤ 6 / ≤ 14 ms are for real GPUs; M10 owns the device pass). `--noblur`. Desktop = 1920×1080 dpr1; phone = 390×844 dpr2 + CPU 4×. avg ms/frame per shot (max). All 12 runs completed, 0 page errors.

| scene | mode | s1 the freeze | s2 the apparition | s3 the turn | s4 the strike |
|---|---|---|---|---|---|
| interrupt_1 THE EYE | desktop | 70 (166) | 94 (116) | 130 (160) | 139 (151) |
| interrupt_1 THE EYE | phone | 80 (200) | 144 (195) | 185 (197) | 230 (275) |
| interrupt_2 THE HAND | desktop | 63 (103) | 83 (155) | 89 (95) | 97 (153) |
| interrupt_2 THE HAND | phone | 79 (194) | 114 (184) | 129 (155) | 115 (168) |
| interrupt_3 THE MAW | desktop | 71 (123) | 78 (100) | 94 (156) | 107 (174) |
| interrupt_3 THE MAW | phone | 85 (197) | 116 (170) | 126 (133) | 126 (214) |
| interrupt_4 THE WALL OF EYES | desktop | 67 (165) | 89 (156) | 125 (166) | 120 (175) |
| interrupt_4 THE WALL OF EYES | phone | 85 (190) | 124 (168) | 170 (193) | 176 (231) |
| interrupt_5 THE MIRROR | desktop | 63 (130) | 70 (94) | 80 (84) | 99 (150) |
| interrupt_5 THE MIRROR | phone | 100 (201) | 99 (192) | 111 (137) | 128 (160) |
| interrupt_6 THE STARE | desktop | 60 (144) | 66 (93) | **159 (217)** | **156 (197)** |
| interrupt_6 THE STARE | phone | 90 (205) | 97 (165) | **227 (295)** | **235 (287)** |

Readings: unlike openers/intros/outros the interrupts get **more** expensive toward the end — shots 3–4 are the HARD CUT closer with the inverted frame (`interruptPost` invert + the apparition at 1.8–3.4× zoom filling the whole viewport). THE STARE s3/s4 (iris as the entire frame, r 1500 radial gradients + veins every frame) and THE EYE s3 (sclera r 1500) are the heaviest; THE MIRROR is the cheapest interrupt throughout. Shot 1's max spikes (165–205) are the first frame (`freezeBed` 320-mote `embers` allocation + the ink gradient). Phone s1 is oddly ≈ desktop s1 — the phone viewport is 1/5 the pixels, so the shot is fill-bound on desktop and CPU-bound on phone. M10 fix candidates: draw the r 1500 iris/sclera gradient once per shot to an offscreen canvas and only redraw the pupil/veins; the inverted-frame post can be a single `difference` composite over a cached frame instead of per-layer; pre-allocate the 320 motes in the `K` setup. At 5 s and 50 frames total per scene these are the shortest films, so the absolute cost per interrupt is small even on software GL.

**Known soft spots**
- Scenes not eyeballed on a real GPU (credits) — verified by typecheck/build + 12 clean cinebench runs.
- Threat gameplay not play-tested by a human — tuned by reading `BossKit` telegraph numbers (`?interrupt=<n>` is the fast loop: start a run, wait 1.5 s). The 40 % maxHP hit (min 20) may be harsh with early maxHP; `INTERRUPT_DMG` is the one knob. THE WATCH's wall speed (19 px/f) must stay above the dash speed or "outrun it" becomes a valid read — re-check if 8B balance values move.
- The scheduler checks `!state.activeBoss` in SurvivalGame **and** blocks boss waves inside the scheduler; endless waves (9A) never interrupt — intended (the Darkness has already lost there).
- `?interrupt=<n>` is a debug param kept in; harmless but M10 may strip it with the other debug params.
- First interrupt lands ~60 s in regardless of wave — on a fast first run this can overlap the chapter-1 opener's afterglow; if it reads as too early, raise `FIRST_AT_FRAMES`.
- `tools/cinebench.mjs` in a fresh sandbox still needs `npx playwright install chromium-headless-shell` + the apt libs listed in `docs/handoff/M4.md` (done this chat, took ~30 s).

**M6 hook recipe** (MOVIE.md §3 M6): same `setFilm(scene)` contract; one-shot continuation via `filmOnDoneRef.current = fn` before `setFilm`. If M6 needs the sim to keep ticking under a film (it should not — MOVIE.md §1.1), that is a new contract — document it in `docs/CINEMATIC.md` first.

**Credits/tokens** (user asked each report to carry this): this chat ≈ 45 k tokens total (≈ 30 k input incl. tool output, ≈ 15 k output) — estimated from the transcript, no token-counting tool was available in the sandbox. Previous M5 chat (steps 1–3) was axed before reporting; its usage is unknown.
