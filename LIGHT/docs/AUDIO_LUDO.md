# AUDIO — Ludo.ai prompt list (6A)

Every sound id in `game/audio/sfxIds.ts` has a prompt here. Generate each one in Ludo.ai by hand, export, drop the file into `game/public/audio/<id>.ogg`, add the line to `game/public/audio/manifest.json`, rebuild. No generated audio is ever committed (CONVENTIONS rule 4) — the repo ships synth placeholders (`game/audio/synth.ts`) that play when a file is missing or fails to load.

## Export settings (all files)
| Setting | SFX | Music |
|---|---|---|
| Format | OGG Vorbis, 44.1 kHz, mono | OGG Vorbis, 44.1 kHz, stereo |
| Quality | q6 (~160 kbps) | q5 (~140 kbps) |
| Loudness | **−10 LUFS** integrated, peak ≤ −1 dBTP | **−14 LUFS** integrated, peak ≤ −1 dBTP |
| Length | as listed (trim silence head/tail, ≤ 5 ms fade) | 60–120 s, **seamless loop** (export loop points / crossfade the tail into the head) |
| Naming | exactly the id: `player_shot.ogg` | `music_ch3.ogg` |
| Budget | all SFX together ≤ 1.5 MB | each track ≤ 1.2 MB → the itch zip stays < 15 MB |

## Drop files here
1. Put files in `LIGHT/game/public/audio/`.
2. Edit `LIGHT/game/public/audio/manifest.json`: `"ui_click": "ui_click.ogg", ...` (any id missing from the manifest keeps its synth placeholder).
3. `npm run build` → `bash tools/itch.sh`. `vite` copies `public/audio/` next to `index.html`; `AudioManager.loadManifest()` fetches `new URL('audio/manifest.json', document.baseURI)` so it works at any itch sub-path.
4. Test: `?debug=1`, open the console, `__LIGHT.audio.play('boss_arrive')` / `__LIGHT.audio.music('music_ch2')` (6B wires `__LIGHT.audio`; until then import `Audio` from `audio/AudioManager`).

## Global style words
Cosmic, glassy, dark-ambient, "light vs entropy". Synth-based, no acoustic instruments, no voice. SFX are **short, clean, single-layer** — the game stacks up to 24 voices, so no reverb tails > 300 ms on frequent sounds. Palette: UI = crystalline sine/FM; player = bright white-light tones; enemies = granular/noisy dark textures; bosses = sub-bass + metallic; story = soft bells.

## SFX prompts
Columns: **Len** = seconds, **Loop** = yes/no. Game family = the synth placeholder currently used (`SFX_FAMILY`).

### UI
| id | Len | Loop | Prompt |
|---|---|---|---|
| ui_click | 0.08 | no | Tiny crystalline UI tick, glass sine blip at 1.2 kHz, instant decay, clean, no reverb. Game menu confirm. |
| ui_back | 0.15 | no | Soft downward glass sweep, two-note descending FM blip, muted, "cancel / go back" feel. |
| ui_unlock | 0.9 | no | Skill-node unlock: rising three-note major chord of glassy pads with a bright shimmer tail, hopeful, light-coloured, −6 dB tail at 0.9 s. |
| ui_error | 0.25 | no | Dull low "denied" thud with a short detuned buzz, muted, non-annoying, not enough essence. |

### Player
| id | Len | Loop | Prompt |
|---|---|---|---|
| player_shot | 0.12 | no | Light-bolt shot: short bright "pew" of white-noise-less FM sine with a tiny click transient, airy, 600 → 300 Hz pitch drop. Fired up to 10× per second — must be soft and clean. |
| player_dash | 0.35 | no | Fast whoosh of light: filtered noise sweep upward with a sparkle layer, quick, aerodynamic. |
| player_hurt | 0.3 | no | Spark struck: glassy crack + low body thump, 80 Hz sub hit, slight pitch bend down, painful but short. |
| player_low_hp | 1.0 | no | Single slow heartbeat thump (two beats, lub-dub) with a muffled low-pass, ominous, repeats every ~1 s by the game — no tail. |
| player_death | 2.2 | no | A light going out: descending glass tone that fractures into granular shards, then a deep sub drop, silence at the end. |
| burst_charge | 0.6 | no | Light Burst ready: rising shimmering sweep with harmonics stacking, ends on a bright held sparkle, "energy at 100 %". |
| burst_fire | 1.2 | no | Light Burst release: huge bright flash of white light — sharp transient, wide stereo shimmer, sub thump, 1 s airy tail. Powerful, clean, not distorted. |

### Pickups / discovery
| id | Len | Loop | Prompt |
|---|---|---|---|
| pickup_essence | 0.12 | no | Essence orb: tiny soft bell ping, FM glass, 1.8 kHz, very short; the game varies pitch ±8 %. Dozens per second — gentle. |
| pickup_relic | 1.4 | no | Relic found: ancient resonant chord of glass bells, slow bloom, wonder, slight reverse-swell before the hit. |
| shrine_touch | 1.0 | no | Shrine activation: warm deep bell with a rising choir-like pad of synth (no real voices), sacred, calm. |
| landmark_reveal | 1.6 | no | Landmark discovered: wide cinematic shimmer rising from darkness, soft sub swell, ending in a quiet sparkling chord. Discovery, awe. |

### Enemies
| id | Len | Loop | Prompt |
|---|---|---|---|
| enemy_hit | 0.1 | no | Dark matter impact: short granular noise crack with a 200 Hz body, dry, tight. Plays constantly — minimal. |
| enemy_die_small | 0.3 | no | Small void creature popping: granular burst of dark particles, mid-high fizz, brief. |
| enemy_die_big | 0.7 | no | Large void entity collapsing: low thud + sucking reverse-noise implosion, 60 Hz sub, dark. |
| elite_die | 1.0 | no | Elite shatter: metallic crystalline break into many shards with a descending metallic ring, heavier than normal deaths. |
| affix_shield_break | 0.45 | no | Hex-shield shattering: glass pane crack with a quick electric fizz and a high ringing shard tail. |

### Waves / streaks
| id | Len | Loop | Prompt |
|---|---|---|---|
| wave_start | 0.8 | no | New wave: rising dark-synth sweep with a soft brass-like synth stab at the top, alert but not alarming. |
| wave_special | 1.5 | no | Special wave (Elite Rush / Gauntlet / Curse / Aegis): ominous dissonant chord swell with a metallic shimmer and a sub pulse — "something is different". |
| streak_10 | 0.5 | no | Kill streak ×10: bright two-note ascending bell, celebratory, light. |
| streak_25 | 0.7 | no | Kill streak ×25: three-note ascending bell arpeggio with sparkle, more intense. |
| streak_50 | 1.2 | no | Kill streak ×50: full glassy major chord bloom with a sub hit and a wide shimmer tail, triumphant. |

### Bosses
| id | Len | Loop | Prompt |
|---|---|---|---|
| boss_arrive | 3.0 | no | Boss arrival: massive low drone rising from silence, metallic groan, sub-bass impact at 2 s, then dark resonant tail. Dread. |
| boss_telegraph | 0.5 | no | Attack warning: tense rising metallic sweep with a ticking pulse, ends sharply — the game fires the attack right after. |
| boss_fire | 0.4 | no | Boss attack lands: heavy dark impact, sub thud + metallic crunch, short, punchy. Up to 12×/s during rings — tight. |
| boss_phase | 1.8 | no | Phase shift: dissonant chord slamming into a wide pulsing drone, glass fracturing layer, shift of power. |
| boss_enrage | 2.5 | no | Enrage: alarm-like pulsing distorted drone, rising, heartbeat sub, red-hot danger. |
| boss_die | 4.0 | no | Boss death: giant slow-motion collapse — reverse swell, enormous sub detonation, metallic debris shards raining, long dark-to-light tail that ends in a soft clean chord. |
| arena_burn | 0.6 | no | Void edge burn: crackling corrosive hiss with a low rumble, electric static, dry. Plays while outside the arena every 0.25 s. |

### World events
| id | Len | Loop | Prompt |
|---|---|---|---|
| event_start | 1.2 | no | Found event begins: curious bright-dark chord swell with a quick sparkle, mysterious invitation. |
| event_end | 0.8 | no | Event finished: soft descending resolved sweep, calm release. |
| meteor_warn | 0.7 | no | Meteor incoming: falling whistle sweep with an airy rumble, Doppler-like, warning. |
| meteor_hit | 0.6 | no | Meteor impact: rock-crunch explosion with a 50 Hz sub punch and gravelly debris, dry. |
| ambush_ring | 1.5 | no | Ambush ring closing: tense low drone with rapid dark pulses, encircling, claustrophobic. |
| golden_mite | 0.6 | no | Golden Mite appears: tiny playful golden bell trill, fast and sparkly, tempting. |

### Story
| id | Len | Loop | Prompt |
|---|---|---|---|
| chapter_card | 2.5 | no | Chapter title card: slow cinematic glass chord swell with deep soft sub and a wide shimmering tail, like a star being named. |
| story_line | 0.05 | no | Typewriter caption tick: micro soft glass tick, very quiet, 20–30 Hz repeat rate by the game. Must be nearly inaudible alone. |
| ending_leave | 5.0 | no | Ending — LEAVE: a light passing through the seam — bright ascending choir-like synth pad resolving into a warm major chord, peaceful, release, long fade. |
| ending_stay | 5.0 | no | Ending — STAY: a light choosing the dark — low warm drone with a single soft bell repeating, bittersweet, unresolved minor chord, slow fade. |
| music_sting_reveal | 3.0 | no | (7D) World-map place reveal sting: hushed reverse-swell into one bright orchestral-synth chord with glass bells and a slow shimmer tail, major, cinematic awe — "a new place burns out of the fog". |

## Music prompts
All loops, 60–120 s, seamless. BPM free unless stated. Avoid melodies that fight the captions — ambient/pulse driven.

| id | Len | Prompt |
|---|---|---|
| music_title | 90 s | Dark-ambient cosmic title theme: slow evolving glass pads, distant sub pulse every 4 s, faint shimmer, hopeful single-note motif in the high register every 16 bars. Calm, mysterious, "a lone spark in the void". |
| music_ch1 | 90 s | Chapter 1 Origin Fields (white): bright airy pads, soft pulsing arpeggio at 100 BPM, light percussion of glass ticks, optimistic, beginnings. |
| music_ch2 | 90 s | Chapter 2 Whispering Grove (green-yellow): organic granular textures, breathy pads, 105 BPM soft pulse, whispers-like noise swells (no voice), curious. |
| music_ch3 | 90 s | Chapter 3 Crystal Depths (blue): crystalline FM arpeggios, deep cavern reverb, 110 BPM, cold, echoing, pressure building. |
| music_ch4 | 90 s | Chapter 4 Abandoned Machinery (orange): industrial dark-synth, metallic percussion loop at 115 BPM, broken rhythmic pulses, rusted, mechanical dread. |
| music_ch5 | 90 s | Chapter 5 Void Wastes (violet): sparse hostile ambient, sub drones, dissonant distant stabs, 120 BPM half-time pulse, emptiness, danger. |
| music_ch6 | 90 s | Chapter 6 The Shattered Core (red): intense dark-synth driving pulse 128 BPM, distorted sub, urgent arpeggios, climactic, the end is near. |
| music_boss | 90 s | Boss battle: heavy driving dark-synth at 130 BPM, pounding sub kick, metallic percussion, dissonant riser every 8 bars, relentless stress — must loop without a drop in energy. The game ducks it −6 dB on telegraphs. |
| music_ending | 120 s | Ending / credits: slow luminous pad piece, no percussion, glass bells, major resolution after 60 s, peaceful, "light escapes the seam". May fade out (not a hard loop). |

## Mix in the game (what 6B wires)
- Gains: `master × music`, `master × sfx` from Settings (sliders in Settings → Audio; defaults 0.8 / 0.6 / 1.0).
- Music cross-fade 1.2 s between tracks (`Audio.music(id, fadeMs)`), `Audio.duck(0.4, 600)` on boss telegraphs / chapter cards / story lines.
- Voice limit 24, per-id throttle ≥ 40 ms (`SFX_THROTTLE_MS`), per-id default volume (`SFX_VOLUME`), pitch variance ±8 % on repeated SFX.
- Tab hidden → everything muted; first pointer/key → `AudioContext.resume()`.
