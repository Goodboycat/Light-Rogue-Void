# itch.io page copy (9B)

Paste these fields into the itch project editor. Upload and embed settings are in `docs/ITCH.md`; follow them exactly.

## Title
**Light Rogue Void**

## Tagline (short description, ≤ 100 chars)
You are the last spark in a dying void. Grow, discover, and outlast the dark.

## Description

**The void is winning.** You are a single spark of light: three hit points, a dash, and the stubborn will to stay lit. Across six places on a fogged star chart, the Darkness sends swarms, elites and six bosses that remember every time you beat them.

**Every run makes you brighter.** Matter you carry home feeds the **Evolution Matrix**, a seeded skill tree of 400+ nodes and 14 light powers: Fire Blast, Fireflies, Thunder Chain, Singularity, Solar Flare and more. No cards and no "pick 1 of 3". Permanent power comes from the tree alone. Run-only treasures (relics, shrines, landmarks, treasure pylons) are *found* on the map, never offered.

**Stressful but fair.** Every boss attack is telegraphed, and every telegraph is a promise. Learn the patterns, dash through the lasers, and close the seam. After the ending you can choose to **STAY**: Endless mode brings old bosses back with mutators, and the **Daily Void** gives everyone the same seed each UTC day, with a share code to prove your wave.

## Features
- Action roguelite: movement + dash are the whole input, and powers fire automatically
- 60-wave story campaign across 6 chapters, with 6 hand-built bosses and cinematic intros and outros
- Seeded Evolution Matrix skill tree (400+ nodes, 14 powers, respec with a matter tax)
- Discovery: fog-of-war star chart, landmarks, shrines, relics, hidden treasure caches, found events
- Endless mode with boss mutators (Twin, Hasted Telegraphs, Mirror Arena, Eclipsed, Swarmed)
- Daily Void: shared daily seed, streaks, 30-day history, verifiable share codes
- Hit-stop, screen shake, damage numbers, kill streaks
- Plays on desktop and mobile (touch joystick + dash/burst buttons), saves locally

## Controls
| Action | Keyboard / mouse | Touch |
|---|---|---|
| Move | WASD / arrow keys | left joystick |
| Dash | Space / left click | DASH button |
| Light Burst (when charged) | E (or Space) | BURST button |
| Pause / skill tree | Esc | pause button |
| Skip cinematic | Space / Enter / click | tap |

## Credits
- **Beato Forge** · **Goodboycat**: design, code, story
- Audio: generated with **Ludo.ai** (prompt list in `docs/AUDIO_LUDO.md`); synth placeholders ship until the files are dropped in
- Built with React, Vite, Canvas 2D, Tailwind

## Tags
`roguelite`, `bullet-hell`, `action`, `space`, `boss-battle`, `skill-tree`, `survival`, `procedural-generation`, `singleplayer`, `mobile-friendly`

Genre: **Action**. Platforms: **HTML5** (later Android, chat 10).

## Theme CSS (itch → Edit theme → Custom CSS, needs the CSS option on your account)
Colours follow the chapter palette in `game/components/game/Constants.ts` (`CHAPTERS`).
```css
#wrapper { background: radial-gradient(ellipse at top, #0b1026 0%, #03040a 70%); }
.inner_column { background: rgba(3,4,10,.86) !important; border: 1px solid #312e81; box-shadow: 0 0 40px rgba(129,140,248,.15); }
.header h1, .game_title { color: #fde68a !important; text-shadow: 0 0 18px rgba(253,230,138,.55); letter-spacing: .08em; }
a, .button { color: #2dd4bf; }
.button { background: #312e81 !important; border-color: #818cf8 !important; color: #f8fafc !important; }
.button:hover { background: #4338ca !important; }
.formatted_description h2 { color: #a78bfa; }
.formatted_description strong { color: #fb923c; }
.formatted_description table td, .formatted_description table th { border-color: #1e1b4b; }
```

## Embed
- Viewport **1280 × 720** (or 960 × 600 on small pages). The game is responsive, so any size works.
- ✓ **Mobile friendly** (orientation Landscape), ✓ **Fullscreen button**, ✗ SharedArrayBuffer.
- Phone players should press fullscreen. The touch joystick needs `touch-action: none`, which the game sets itself.

## Screenshots
Produced by `node game/tools/shots.mjs` → `out/shots/` (build artefacts, not committed). Upload in this order:
1. `01-title.png`: main menu + star chart
2. `02-tree.png`: Evolution Matrix
3. `03-wave5.png`: wave 5 chaos
4. `04-boss1.png`: Hive Mind
5. `05-boss2.png`: Void Warden
6. `06-boss3.png`: Crimson Eclipse
7. `07-landmark.png`: a discovered landmark
8. `08-ending.png`: the ending screen
