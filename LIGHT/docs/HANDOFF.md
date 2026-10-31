# HANDOFF — newest chat only

Read just this file. It holds **only the newest chat's entry** (below the line). Older entries are one file each in `docs/handoff/` (list: `docs/handoff/INDEX.md`) — open one only if you need it.

**At finish:** (1) copy the entry below to `docs/handoff/<its ID>.md` and add a line for it at the top of `docs/handoff/INDEX.md`; (2) replace everything below the line with your own entry (what is done, what is half-done, exact file/line pointers, known bugs, measured numbers). Keep this header.

---

## M7 — Endings `ending_stay` + `ending_leave` as film scenes + WinGame hook + cinebench: DONE
Gate: `npm run typecheck` 0 errors, `npm run build` green. Steps 0–3 were pushed by the previous chat (`b19d130` sfx ids, `ee4ae79` ending_stay, `c54e578` ending_leave, `5ca7786` hook); that chat was axed mid step 5 with its doc edits uncommitted. This chat redid step 4 (measure) + step 5 (finish) and moved on to M8. GitHub is the source of truth — `git fetch origin` first, always.

**Files**
- `game/cinematic/scenes/ending_stay.ts` — 36.0 s, `ST = { eye 6.0, turn 14.0, field 24.0, title 27.0, hold 30.0, end 36.0 }`. s1 the seam: black → a violet tear across the horizon, the spark small centre-low (SX 0, SY 150) and it NEVER moves, cold motes blow left, heartbeat on `BEATS` (`cin_silence_drop`, `cin_whisper`, `cin_heartbeat`) · s2 the Eye rises out of the seam, pupil on the spark, the gaze is held, the pool grows a hair per beat, tendrils reach and stop short (`cin_eye_open`, `cin_tendril`, DARKNESS "You could have left." / LIGHT "I know.") · s3 the TURN: flare, embers RISE and each one stays lit → `drawField` FIELD_N 1400 deterministic arcs (positions computed per frame from `hash(i)`, 3 Path2D buckets, glow sprite on 1 in 4), pupil narrows, tendrils ash, seam goes gold (`burst_fire`, `cin_ember_rise`, `cin_cut`) · s4 the field settles into a still sky, the Eye closes patiently, STAY + "The void did not expect company." + WAVE 61, 6 s screenshot hold, fade (`cin_title_hit`, `music_ending`). `?cinematic=ending_stay`.
- `game/cinematic/scenes/ending_leave.ts` — 42.0 s, `LT = { lid 7.0, pass 14.0, cred 16.5, last 36.0, title 37.6, hold 39.0, end 42.0 }`. `makeEndingLeave(data: LeaveData {kills, wave})` builds the live scene; exported `ending_leave` = demo default (`DEMO_LEAVE`). s1 the seam already torn half-gold; the spark LIFTS off the floor for the first time in the game (`sparkY` 150 → SEAM_Y −60), embers fall back · s2 the void closes like a lid: ink rises from the bottom, the Eye tries to open below the seam and is covered mid-open, tendrils reach up and are swallowed (DARKNESS "Where will you go?" / LIGHT "Up.") · s3 the pass: hard shake, white flash, the seam seals to a hairline, lower half solid black, LIGHT ROGUE VOID assembles (`burst_fire`, `cin_cut`, `cin_title_hit`, `music_ending`) · s4 the CREDITS as typography (l.~55–160): blocks from `CHAPTERS` + `BOSSES` data (THE PATH split in two blocks of three), VOICES, THIS CYCLE (kills / wave from data), MADE WITH, Goodboycat; one block at a time, `ui_click` per block; the spark drifts up and shrinks to −430 · s5 "It will be dark again. / But it will remember." LEAVE under the one far warm point, 3 s hold, fade. `?cinematic=ending_leave`.
- `game/cinematic/scenes/index.ts` l.36–38, 69–70 — both registered.
- `game/components/WinGame.tsx` — **the hook**: `film` state (l.49) renders `<CinematicPlayer scene onDone/>` over everything (l.97). STAY (l.80–82): `getScene('ending_stay')`, onDone → `onEndingSeen('stay')` → App starts Endless at wave 61 (9A); falls back to menu if no `onEndingSeen`. LEAVE (l.85–86): `onEndingSeen('leave')` then `makeEndingLeave({kills, wave})`, onDone → `onReturnToMenu`. The old DOM credits scroll + `buildCredits`/`creditClass` are deleted; the 6B stingers moved into the scene timelines.
- `game/audio/sfxIds.ts` + `docs/AUDIO_LUDO.md` — `cin_heartbeat`, `cin_eye_open`, `cin_ember_rise`, `cin_title_hit` registered (synth family, volume, Ludo prompt) so the endings can cue them.

**Measured — `tools/cinebench.mjs`** (swiftshader software GL → upper bounds; MOVIE.md targets are for real GPUs; M10 owns the device pass). `--noblur`. Desktop 1920×1080 dpr1; phone 390×844 dpr2 + CPU 4×. avg ms/frame per shot (max in brackets). Both scenes × both modes completed, 0 page errors. Note: cinebench needs `npx playwright install-deps chromium` on a fresh sandbox (libatk missing).

| scene | mode | s1 | s2 | s3 | s4 | s5 |
|---|---|---|---|---|---|---|
| ending_stay | desktop | the seam 34 (76) | **the Eye 125 (188)** | the turn / field born 117 (197) | the still sky 70 (176) | — |
| ending_stay | phone | 65 (142) | **209 (272)** | 183 (263) | 121 (288) | — |
| ending_leave | desktop | the lift 44 (83) | **the lid + Eye 121 (189)** | the pass 46 (143) | credits 15 (44) | LEAVE 13 (19) |
| ending_leave | phone | 78 (149) | **204 (289)** | 99 (288) | 29 (79) | 21 (33) |

Readings: the Eye shot is again the heavy one in both scenes (same family as death s2 and the interrupt closers: sclera gradient at r ≈ 1500 + tendrils + ink gradients) — the single biggest M10 win is caching the sclera gradient once per shot offscreen. ending_stay s3/s4 carry the 1400-spark field: 117 → 70 ms desktop as the field settles; the per-frame `hash(i)` arc recomputation is the cost — M10 candidate: freeze positions to a typed array once `settle` ≥ 1 (s4 would drop to the embers-only floor). ending_leave s4–s5 (typography + a thin ember trail over a closed sky) sit at 13–29 ms even on the phone profile — the credits are effectively free; 20 s of the 42 s scene costs nothing.

**Known soft spots**
- Not eyeballed on a real GPU (credits) — verified by typecheck/build + 4 clean cinebench runs.
- ending_stay s2–s3 on the phone profile are 180–210 ms upper-bound; if a real low-end device also stalls, halve `FIELD_N` under the engine's low-tier flag (M10).
- Skipping either ending in the first 1 s is blocked by the engine's skip gate — intended.
- `makeEndingLeave` reads `stats.kills` / `stats.wave` only; if WinGame's `stats` shape changes, update `LeaveData`.
- `onEndingSeen` is called BEFORE the LEAVE film (so the save marks the ending even if the player closes the tab mid-credits) but AFTER the STAY film (Endless must not start under the scene). Keep that asymmetry.

**Credits/tokens** (user asked each report to carry this): M7 steps 0–3 were a previous chat, usage unknown (axed before reporting). This chat's M7 steps 4–5 ≈ 45 k tokens (setup/clone, build, 4 cinebench runs incl. the libatk fix, docs). The rest of this chat's usage is reported in the M8 entry / in chat.
