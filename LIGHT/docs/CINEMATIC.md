# CINEMATIC.md — the film ↔ gameplay contract

Owner: **M5** (MOVIE.md §3). Used by M1 openers, M3 boss intros, M4 boss outros, M5 Darkness Interrupts; M6/M7 reuse it.
Engine law lives in `docs/MOVIE.md` §1–§2; this file is only the **pause / hide / resume** handshake and the scene registry.

## 1. The contract (one state, one ref, one callback)

All in `game/components/SurvivalGame.tsx`:

| piece | what it is |
|---|---|
| `const [film, setFilm] = useState<SceneDef \| null>(null)` | **the** switch. Non-null = a film is playing. |
| `filmRef` | mirror for the rAF loop (`filmRef.current`). |
| `filmOnDoneRef: () => void \| null` | one-shot continuation; `handleFilmDone` runs it once and clears it. |
| `handleFilmDone` | `setFilm(null)`, then the continuation. Passed to `<CinematicPlayer scene={film} onDone={handleFilmDone} z={500} />`. |

**While `film` is set:**
1. **Pause** — the sim loop does not call `updateGame`; the wave timer does not tick; `state.frame` does not advance. The run is frozen in the exact state it was in.
2. **Hide** — the film canvas is opaque at z-500; HUD, `MobileControls`, captions, `BossBar` unmount (`!film` gates in JSX); the pause menu is blocked (`onBlockPauseMenu(... || !!film)`).
3. **Skip** — tap/key after `scene.skipAfter` (default 0.6 s). A skip still calls `onDone`, so continuations always run.
4. **Resume** — `onDone` → `setFilm(null)` → the loop resumes on the next frame from the frozen state. Audio: scene cues stop with the player; the run's music was never paused (a film is ≤ 6 s).

**Rules for a new hook:**
- `getScene('<id>')` → `if (scene) setFilm(scene) else <legacy fallback>`. Never call `setFilm` while `filmRef.current` is set.
- Anything that must happen *after* the film (chain a wave completion, spawn a threat): `filmOnDoneRef.current = fn` **before** `setFilm`.
- Never mutate `gameStateRef.current` from inside a scene. Scenes are `state = f(t)` and know nothing about the run.
- Decide the side effects of a hook at the *start* of the film if a skip must not lose them (M4 marks the place revealed at film start, not at shot 3).

## 2. Hooks today

| id pattern | when | continuation |
|---|---|---|
| `opener_<1..6>` | first frame of a chapter's first wave (`playOpener`) | none (chapter card is shot 1) |
| `boss_intro_<bossId>` | frame the boss appears (`playBossIntro`), before `BossBar` mounts | none |
| `boss_outro_<bossId>` | boss death, non-endless (`playBossOutro`) | `completeBossWave` → `MapBreather` with `revealed` |
| `interrupt_<1..6>` | `state.interruptRequest` set by the scheduler (`playInterrupt`) | `spawnInterruptThreat(state, n)` — the hard cut |
| `title_seam`, `menu_loop` | menus (outside SurvivalGame) | — |

## 3. The Darkness Interrupt (M5)

`game/components/game/logic/DarknessInterrupt.ts`.

**Scheduler** (`updateDarknessInterrupt`, every sim frame from `Logic.ts`): first at ~60 s of run time (`state.frame` ≥ 3600), then re-armed for `wave + 3`, firing 15 s into that wave. Blocked (retry in 10 s) on boss waves, endless waves, while a boss is alive or arriving. Picks 1..6 at random, never the same index twice in a row. Writes `state.interruptRequest = n`. `?interrupt=<n>` forces scene `n` 1.5 s after the run starts (debug).

**Hook** (`playInterrupt` in SurvivalGame): clears the request, `filmOnDoneRef = () => spawnInterruptThreat(state, n)`, `setFilm(interrupt_n)`. Skipping the film still spawns the threat.

**Threats** — all drawn by the existing telegraph pool (`TelegraphRenderer.ts`), steered per frame by `steer()`; every one is survivable only by reading it, and a blind dash is punished:

| n | film | threat | the read | why dash fails |
|---|---|---|---|---|
| 1 | THE EYE | **THE GAZE** — line through the spark, tracks 1.2 s, locks 0.5 s, fires (w 150) | step out of its line | the line follows you; dashing along it keeps you inside |
| 2 | THE HAND | **THE PALM** — circle r 320 that leads your facing by 360 px, freezes the last 0.2 s, slams | stand still at its edge | it is placed where a dash would land |
| 3 | THE MAW | **THE JAW** — ring r 520 at your position; inner edge closes 400 → 140 over 1.4 s | stay in the middle | a dash outward goes through the band |
| 4 | THE WALL OF EYES | **THE WATCH** — two vertical line telegraphs with one gap (w 180); stands 0.8 s, sweeps 1.6 s at 19 px/f | walk to the gap | faster than any run or dash |
| 5 | THE MIRROR | **THE ECHO** — a copy replays your last 1.5 s of movement to where you stand; r 260 detonates there | leave where you were | dashing back along your path meets the copy |
| 6 | THE STARE | **THE SILENCE** — `state.eclipse` blackout; a lit disc r 240 drifts 2.4 px/f for 2.5 s; outside it a tick every 20 f after a 0.4 s grace | follow the light | nothing to dash through; you must walk with it |

Damage: 40 % of max HP per hit (min 20) through `state.damagePlayer` (respects i-frames). On spawn: world card `NAME / READ` (150 f), `boss_arrive`, shake 22, violet screen flash. `clearInterrupt` on death drops the live threat and the blackout.

## 4. Adding a scene to the registry

`game/cinematic/scenes/index.ts` — import, add to the map; `?cinematic=<id>` plays it standalone. Storyboard table first (MOVIE.md §1.4). Audio ids must exist in `audio/sfxIds.ts`.
