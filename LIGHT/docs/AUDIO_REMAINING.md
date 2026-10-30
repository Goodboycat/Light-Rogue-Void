# Audio still missing (chat 10)
Mapped from sfx.zip (27 ids) + Lumen Ledger `dlg_blip` → `story_line`. Lumen Ledger music is cozy/toy-like and does not fit LIGHT's dark-synth tone, so no music was used.
Each block below = one Ludo.ai prompt. Export as `<id>.ogg` into `LIGHT/game/public/audio/` and add `"<id>": "<id>.ogg"` to `manifest.json`.

## player_low_hp  (1.0 s)
```
Single slow heartbeat thump (two beats, lub-dub) with a muffled low-pass, ominous, repeats every ~1 s by the game — no tail.
```

## wave_start  (0.8 s)
```
New wave: rising dark-synth sweep with a soft brass-like synth stab at the top, alert but not alarming.
```

## wave_special  (1.5 s)
```
Special wave (Elite Rush / Gauntlet / Curse / Aegis): ominous dissonant chord swell with a metallic shimmer and a sub pulse — "something is different".
```

## streak_10  (0.5 s)
```
Kill streak ×10: bright two-note ascending bell, celebratory, light.
```

## streak_25  (0.7 s)
```
Kill streak ×25: three-note ascending bell arpeggio with sparkle, more intense.
```

## streak_50  (1.2 s)
```
Kill streak ×50: full glassy major chord bloom with a sub hit and a wide shimmer tail, triumphant.
```

## boss_telegraph  (0.5 s)
```
Attack warning: tense rising metallic sweep with a ticking pulse, ends sharply — the game fires the attack right after.
```

## boss_fire  (0.4 s)
```
Boss attack lands: heavy dark impact, sub thud + metallic crunch, short, punchy. Up to 12×/s during rings — tight.
```

## boss_enrage  (2.5 s)
```
Enrage: alarm-like pulsing distorted drone, rising, heartbeat sub, red-hot danger.
```

## event_start  (1.2 s)
```
Found event begins: curious bright-dark chord swell with a quick sparkle, mysterious invitation.
```

## meteor_warn  (0.7 s)
```
Meteor incoming: falling whistle sweep with an airy rumble, Doppler-like, warning.
```

## ambush_ring  (1.5 s)
```
Ambush ring closing: tense low drone with rapid dark pulses, encircling, claustrophobic.
```

## chapter_card  (2.5 s)
```
Chapter title card: slow cinematic glass chord swell with deep soft sub and a wide shimmering tail, like a star being named.
```

## ending_leave  (5.0 s)
```
Ending — LEAVE: a light passing through the seam — bright ascending choir-like synth pad resolving into a warm major chord, peaceful, release, long fade.
```

## ending_stay  (5.0 s)
```
Ending — STAY: a light choosing the dark — low warm drone with a single soft bell repeating, bittersweet, unresolved minor chord, slow fade.
```

## music_sting_reveal  (3.0 s)
```
(7D) World-map place reveal sting: hushed reverse-swell into one bright orchestral-synth chord with glass bells and a slow shimmer tail, major, cinematic awe — "a new place burns out of the fog".
```

## music_title  (90 s)
```
Dark-ambient cosmic title theme: slow evolving glass pads, distant sub pulse every 4 s, faint shimmer, hopeful single-note motif in the high register every 16 bars. Calm, mysterious, "a lone spark in the void".
```

## music_ch1  (90 s)
```
Chapter 1 Origin Fields (white): bright airy pads, soft pulsing arpeggio at 100 BPM, light percussion of glass ticks, optimistic, beginnings.
```

## music_ch2  (90 s)
```
Chapter 2 Whispering Grove (green-yellow): organic granular textures, breathy pads, 105 BPM soft pulse, whispers-like noise swells (no voice), curious.
```

## music_ch3  (90 s)
```
Chapter 3 Crystal Depths (blue): crystalline FM arpeggios, deep cavern reverb, 110 BPM, cold, echoing, pressure building.
```

## music_ch4  (90 s)
```
Chapter 4 Abandoned Machinery (orange): industrial dark-synth, metallic percussion loop at 115 BPM, broken rhythmic pulses, rusted, mechanical dread.
```

## music_ch5  (90 s)
```
Chapter 5 Void Wastes (violet): sparse hostile ambient, sub drones, dissonant distant stabs, 120 BPM half-time pulse, emptiness, danger.
```

## music_ch6  (90 s)
```
Chapter 6 The Shattered Core (red): intense dark-synth driving pulse 128 BPM, distorted sub, urgent arpeggios, climactic, the end is near.
```

## music_boss  (90 s)
```
Boss battle: heavy driving dark-synth at 130 BPM, pounding sub kick, metallic percussion, dissonant riser every 8 bars, relentless stress — must loop without a drop in energy. The game ducks it −6 dB on telegraphs.
```

## music_ending  (120 s)
```
Ending / credits: slow luminous pad piece, no percussion, glass bells, major resolution after 60 s, peaceful, "light escapes the seam". May fade out (not a hard loop).
```
