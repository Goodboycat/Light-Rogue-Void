# LIGHT — THE MOVIE (CEO cut)

> **Attitude for every chat that reads this:** what exists today is cheap and trash. Tailwind cards, framer-motion fades, a camera that zooms on the gameplay sprite and calls it a "cinematic". We are not building on top of that. We are showing what modern browser tech is capable of: a Canvas 2D film pipeline, authored like After Effects, that runs at 60 fps on a phone because it is *engineered*, not because it is small.
>
> One chat = one part of the film. Do your part **solo**, as if it were the only thing shipping. Do not touch other parts. Do not "fix on the side".
>
> **Ignore the APK build.** Chat 10's Capacitor APK is dropped. Nobody builds it, nobody documents it, nobody keeps `capacitor.config.json` alive. The product is the itch.io HTML build (`bash LIGHT/game/tools/itch.sh`) and the GitHub repo. Full stop.

---

## 0. The film in one page

LIGHT is a 60-wave roguelite, but the player should *remember it as a movie*: a small warm thing that refuses to go out inside a darkness that is actively, personally hostile. Every non-gameplay moment is a **scene** rendered by the cinematic engine on its own full-screen layer, with the game hidden and paused underneath.

Two tones, never mixed inside one shot:

| | DARKNESS acting | LIGHT acting |
|---|---|---|
| Genre | AAA horror | cozy / brave / hopeful |
| Palette | violet `#a78bfa` on near-black, desaturated, cold | amber `#fde68a` / `#fbbf24` on warm umber, soft bloom |
| Camera | slow push-ins that never stop, hard cuts, shake with long decay, rack focus to a thing you didn't see | gentle overshoot, breathing scale, pans that *open* the frame |
| Post | heavy grain, chromatic aberration spikes, flash frames (inverted), letterbox tight | low grain, bloom, light rays, letterbox opening up |
| Sound ids (existing) | `boss_arrive`, `boss_telegraph`, `boss_phase`, `boss_enrage`, `ambush_ring`, `arena_burn`, `meteor_warn` | `pickup_essence`, `shrine_touch`, `burst_charge`, `burst_fire`, `landmark_reveal`, `chapter_card`, `music_sting_reveal`, `ending_stay` |
| Typography | typed glyph by glyph, jitter, lowercase whispers in caps-lock horror | assembles with overshoot, tracking widens, warm glow |

The **contrast** is the heart. A Darkness shot must make a horror fan lean in. A Light shot must make the same player exhale.

### Scene list (ids are stable — use them in code, docs and audio cues)

| id | Where it plays | Length | Part |
|---|---|---|---|
| `title_seam` | app launch → main menu (once per session, skippable) | ~34 s | **M0** |
| `menu_loop` | behind the main menu, loops forever | 24 s loop | **M0** |
| `opener_1..3` | first wave of chapters 1–3 (replaces the in-sim StoryCinematic) | 10–14 s each | **M1** |
| `opener_4..6` | first wave of chapters 4–6 | 10–14 s each | **M2** |
| `boss_intro_<bossId>` ×6 | boss spawn, before the bar appears | 8–12 s each | **M3** |
| `boss_outro_<bossId>` ×6 + `place_reveal_<n>` | boss death → map breather | 6–10 s each | **M4** |
| `interrupt_<n>` (pool of 6) | the 60-second Darkness interrupt (SUGGESTIONS §2) | 4–6 s each | **M5** |
| `death` + `run_summary` | the spark goes out; the summary is a scene, not a card | 6 s + loop | **M6** |
| `ending_stay`, `ending_leave` | Darkness dies → choice → two films | 30–45 s each | **M7** |
| `constellation` | first skill-tree open + each boss constellation unlock | 8 s | **M8** |
| (audio) | new ids + Ludo prompts + ducking for every scene above | — | **M9** |
| (perf) | phone pass, offscreen caching, frame-exporter for the trailer | — | **M10** |

---

## 1. Hard rules (every part)

1. **A cinematic is not gameplay.** Gameplay canvas, HUD, enemies, player, touch sticks are **hidden and paused** while a scene plays. Never reuse in-game entities, sprites, the sprite atlas or the game camera. If one frame could be mistaken for gameplay, the scene fails.
2. **Own layer.** `components/CinematicPlayer.tsx` is a fixed full-screen opaque canvas at `z-[500]`. Nothing bleeds through. It owns its DPR, its resize, its input (tap / any key = skip).
3. **Deterministic.** `state = f(t)`. No `Math.random()` inside a scene — use `hash(i, t)` helpers from the engine. Scrubbing to any `t` must render the identical frame. This is what makes `?cinematic=<id>` and the frame exporter possible.
4. **Storyboard first, then code.** Each scene file starts with its storyboard table in a comment: `shot | start–end s | framing | camera move | what changes | text | audio id`. Every shot changes composition. Setup → escalation → turn → payoff. Then write the keyframes from the table — never the other way round.
5. **Skippable.** Any tap/key after 0.6 s skips (short fade to black, audio cues after `t` are dropped, `onDone()` fires once).
6. **Audio from the manifest.** Only ids in `audio/sfxIds.ts`. New ids are added there + `docs/AUDIO_LUDO.md` with a prompt (M9 owns the batch; others may add ids with a synth family).
7. **Debug route.** `?cinematic=<id>` plays a scene instantly on a black page with a scrub bar; `&t=<s>` starts at a time; `&loop=1` loops. Keep it working.
8. **Report per shot.** The handoff lists one line per shot: what it does and why it is there.

## 2. Performance mandates (not suggestions)

The engine is "no limits" on *quality* — no particle caps, no frame-time fallbacks, no "LOW mode draws less". It earns that by technique:

- **Batching.** Particles and embers are bucketed by `(colour, blend)` and drawn with one `Path2D` + one `fill` per bucket. Never `beginPath/arc/fill` per particle. Never `save/restore` per particle.
- **Pre-rendered sprites.** Glow discs, bokeh discs, grain tiles, vignette, light-ray strips are rendered **once** to offscreen canvases (`cinematic/Sprites.ts` cache keyed by colour+size) and blitted with `drawImage`. `shadowBlur` and `ctx.filter` are allowed **only** on text and on ≤ 3 elements per frame, never on particles.
- **Post stack once per frame.** Scene → offscreen → (aberration: 3 channel-masked blits, only while amount > 0) → grain tile (`overlay`) → vignette → letterbox → flash. Nothing else touches the full screen.
- **DPR policy.** `min(devicePixelRatio, 2)` on desktop, `min(devicePixelRatio, 1.5)` when `innerWidth < 900`. Design space is 1920×1080, "cover"-fitted; UI-locked layers (`parallax: 0`) use safe areas.
- **Zero allocations in `render(t)`.** Keyframe evaluation uses preallocated scratch objects; particle positions are computed, not stored.
- **Measure.** Each part reports: scene id, desktop ms/frame at 1080p, phone-class ms/frame (Chrome device emulation CPU 4× slowdown counts). Target: ≤ 6 ms desktop, ≤ 14 ms phone-class.

## 3. Parts

Each part below is one chat. `bash LIGHT/game/tools/next.sh` prints the next one. The prompt file `prompts/<ID>.md` is a pointer to this section — the section *is* the brief.

### M0 — Engine + `title_seam` + main menu rebuilt (this chat)
- `game/cinematic/Engine.ts` (timeline, easing, camera, layers, post), `Sprites.ts` (caches), `Draw.ts` (hero silhouettes: the Spark, the Eye, tendrils, rays, embers, typography), `scenes/title_seam.ts`, `scenes/menu_loop.ts`, `components/CinematicPlayer.tsx`, `?cinematic=` route.
- `components/MainMenu.tsx` destroyed and rebuilt: the menu *is* a scene (`menu_loop`) with a thin UI layer (start, star chart, daily, settings, guide, demo card — same props, new look).
- `title_seam` plays once per browser session on launch.

### M1 — Chapter openers 1–3
Replace the in-sim `StoryCinematicOverlay` for `opener` triggers (`data/cinematics.ts`) with film scenes. Each opener introduces the *place* as a silhouette landscape (Origin Fields = warm plains of dust; Whispering Grove = teal spores + tall black stalks; Crystal Depths = violet shards and refractions), with the chapter's DARKNESS line as horror and the LIGHT line as warmth. Chapter card typography becomes shot 1 of the opener. Hook: `SurvivalGame.tsx` pauses the sim (`paused` path, hide HUD + `MobileControls`), plays the scene, resumes. Keep `mid` / `preBoss` captions as they are.

### M2 — Chapter openers 4–6
Same contract. Abandoned Machinery = orange sodium light and rotating silhouettes of dead machines; Void Wastes = indigo nothing with distant eyes; Seam of the Void = white-hot crack in black. Opener 6 is the longest and the most terrifying; the LIGHT line arrives late.

### M3 — Boss intros ×6
Each boss gets a hero silhouette drawn procedurally **in the cinematic style** (not the gameplay renderer): Hive Mind (a wall of mandibles), Void Warden (a helm and a blade of absence), Crimson Eclipse (a ring eating a sun), Collapsing Neutron (a point that bends the frame — use camera rotation + aberration), Entropy Titan (a mountain that stands up), Darkness (the Eye from `title_seam`, now filling the frame). Shot 1 is the arena going dark; the turn is the boss *noticing* the camera. Hook at boss spawn before `BossBar` mounts.

### M4 — Boss outros ×6 + place reveals
Outros are the LIGHT tone: the silhouette comes apart into embers, the frame opens, a warm hold on the spark. The `place_reveal` (currently `MapReveal.tsx`) becomes shot 3 of the outro: the star chart drawn in the cinematic style with the new place igniting. Then `MapBreather`.

### M5 — The Darkness Interrupt
SUGGESTIONS §2. Around 60 s into a run and every ~3 waves: sim pauses, 4–6 s scene from the `interrupt_<n>` pool (one typed Darkness line, the Eye, the Hand, the Maw, the Wall of Eyes, the Mirror, the Stare), hard cut back to gameplay with the enormous threat already spawning (that spawn is gameplay, done by the same chat, telegraphed, readable, never spam-dash-survivable). This part owns the **pause/hide/resume contract** used by M1–M4 and documents it in `docs/CINEMATIC.md`.

### M6 — Death + run summary
`GameOver.tsx` + `RunSummary.tsx` are replaced by a scene: the spark gutters (horror beat: the Eye closes in), goes out, 1 s of true black, then the summary rendered as warm typography inside the scene (kills, wave, matter, new affordable nodes) with the SUGGESTIONS §5 glowing-arrow to the Skill Tree as part of the composition. Buttons are a thin UI layer.

### M7 — Endings
`ending_stay` (the spark chooses to keep burning: the Eye and the spark hold each other's gaze, embers become a field of sparks, endless mode begins) and `ending_leave` (the spark rises, the void closes behind it, credits as typography). These are the longest scenes; both end on a final image the player will screenshot.

### M8 — Constellation
First open of the Skill Tree: a scene where the sky is drawn, the three spines ignite, and the camera lands on the first node. Each boss constellation unlock gets a 6 s variant. `EvolutionMatrix.tsx` keeps its logic; its *look* is re-skinned to the cinematic palette (same fonts, same glow sprites).

### M9 — Audio for the film
New ids with Ludo prompts: `cin_whisper`, `cin_heartbeat`, `cin_eye_open`, `cin_tendril`, `cin_ember_rise`, `cin_title_hit`, `cin_cut`, `cin_silence_drop` (+ synth families so they work before files exist). Timeline-driven **ducking** of music during scenes, a `musicStinger(id)` that respects the current music, and a review pass placing every cue to the frame.

### M10 — Performance + trailer
Phone pass on every scene (the targets in §2), offscreen caching audit, `?cinematic=<id>&export=1` that renders frames deterministically to PNG sequence (for `docs/TRAILER.md`), itch zip verification on iOS Safari + Android Chrome. This part closes the film.

---

## 4. Checklist for a part (paste into the handoff)

- [ ] Storyboard table in the scene file header
- [ ] Every shot changes composition; setup → escalation → turn → payoff present
- [ ] Gameplay hidden + paused (or N/A for menu), no gameplay asset used
- [ ] Skippable, `?cinematic=<id>` works, scrub renders deterministically
- [ ] Audio cues on the timeline, only manifest ids
- [ ] Measured ms/frame (desktop, phone-class) in the handoff
- [ ] One line per shot in the handoff
- [ ] `npm run typecheck` 0 errors, `npm run build` green, itch zip built, pushed
