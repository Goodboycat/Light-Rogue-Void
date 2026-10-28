# ART — style rules + gallery cell order (5A)

Art is **procedural Canvas 2D** and stays the default. The only PNGs in the repo are `public/sprites/*.png` + `atlas.json`,
**derived** from the gallery by `npm run art` (CONVENTIONS rule 4 exception) — never hand-edit them, re-run the script.
The gallery (`?gallery=1`, `&scale=N`, `&sheet=1` = transparent/no labels) is the single source of truth.

## Style rules
- **One palette per chapter** — `components/game/renderer/Palette.ts` → `chapterPalette(1..6)` returns
  `{ base, glow, outline, accent, text }` derived from `CHAPTERS[i].color` (`Constants.ts:30`).
  `base` = dark muted body fill, `glow` = additive rim/glow, `outline` = near-black tinted toward the hue, `accent` = the raw chapter colour.
- **Enemies are tinted 25 % toward their chapter** (`enemyTint(def)` in `EnemyRenderer.ts:11`, chapter = `enemyChapter(def)` from `minWave`).
  Enemy `def.color` / `def.glowColor` remain the identity; the palette only unifies the mood per chapter.
- **Outline + glow language**: every silhouette is `fill → dark outline (2 px, strokeOutline) → bright rim (1.2 px, strokeRim) → optional glow`.
  Glow is a pre-rendered sprite (`GlowSprites.ts`) or a radial gradient, never `shadowBlur` in hot loops (rule 9).
- **Readable at 32 px**: the 9 standard visual types each have a distinct outline — SIMPLE sphere+highlight, CRAB shell+legs+claws,
  SERPENT tapering segments, GHOST hooded sheet+hollow eyes, STAR 5 spikes, CONSTRUCT hex hull+plates, EYE almond+iris, CRYSTAL lit/dark facets,
  SWARMER dart+wings. Elite affixes add a coloured ring (one arc per affix) + glyph above; SHIELDED/AEGIS a hex shell.
- **Bosses** (96–150 px, unique visual types HIVE/WARDEN/ECLIPSE/NEUTRON/TITAN/DARKNESS): body stroke follows the phase
  (`phaseColor`: P1 chapter glow → P2 amber `#fbbf24` → P3 white), P2 seam ring, P3 crack web, enrage = red heartbeat ring.
- **Player**: 6 maturity stages (one per chapter, `playerStageOf(wave)`) — corona 1.0→2.3×, rays 0/4/6/8/10/12, satellites 0–4;
  dash trail = 4 fading ghosts; Light Burst = charge arc, gold pulse when ready.
- **Drops**: essence orbs in 3 sizes by value (< 10 / < 50 / else, `ESSENCE_SIZE_TIERS`), relic drop = hex gem.
- **World points** (~120 px silhouettes, `WorldRenderer.ts`): landmark / shrine / relic alcove / event, each coloured by its def in `data/world.ts`.
- **Telegraphs**: boss glow colour fill (alpha 0.15→0.45), white edge thickening toward fire, inner fuse on circles/cones.

## Gallery (`components/Gallery.tsx`)
- Route: `?gallery=1` replaces the app (`App.tsx` `IS_GALLERY`). `&scale=N` (1–4) multiplies canvas DPR; CSS size stays 160 px/cell.
- Grid: cell **160×160**, **8 per row**, 18 px label strip under each cell (`<index> <label>`, 10 px monospace), 1 px `#202020` border, bg `#0b0d14`.
- Deterministic: `frame = 0`, no RAF, no RNG. Each cell is clipped to its square; the draw origin is the cell centre.
  Oversized art is scaled to fit (`fit(ctx, natural)`), never upscaled past ×2.
- `window.__GALLERY = { cells: string[], rows, count, scale }` for scripted extraction (5B).
- **Appending rule**: add new cells only at the END of a section so earlier indices never move; update the table here.

### Cell order (151 cells, index = position in `buildGalleryCells()`)
| Index | Section | Cells | Label pattern | Source order |
|------:|---------|------:|---------------|--------------|
| 0–58 | A. enemies (idle, frame 0) | 59 | `e1` … `e59` | `enemies.ts` `ENEMIES` |
| 59–60 | B. boss minions | 2 | `hive_node`, `doppelganger` | `bosses.ts` `BOSS_MINIONS` key order |
| 61–78 | C. bosses × phase | 18 | `<bossId> P1/P2/P3` | `BOSSES`: hive_mind, void_warden, crimson_eclipse, neutron_star, entropy_titan, darkness |
| 79–84 | D. spark maturity | 6 | `spark stage 1..6` | chapter 1..6 colour |
| 85–86 | D. burst ring | 2 | `burst ring 50%`, `burst ring ready` | `drawBurstRing` |
| 87–110 | E. projectiles | 24 | lowercase `visualType` | `default fire_blast arcane_missile pulsar singularity stardust_trail void_rift solar_flare boss_singularity homing_missile firefly explosion_area toxic_cloud railgun_beam void_mine void_trail void_nova void_nova_aftermath lux_blade plasma_whip plasma_whip_hit death_ray solar_barrier crimson_comet` |
| 111–114 | F. drops | 4 | `essence small/medium/large`, `relic drop` | `DropRenderer.ts` |
| 115–120 | G. landmarks | 6 | `landmark <id>` | `fallen_beacon whisper_stones crystal_spire dead_engine bone_field the_seam` |
| 121–124 | G. shrines | 4 | `shrine <id>` | `haste mend ward greed` |
| 125–130 | G. relic alcoves | 6 | `relic <id>` | `ember_core mirror_shard hollow_crown tidal_lens iron_seed watchers_eye` |
| 131–133 | G. placed events | 3 | `event <id>` | `ambush lost_spark collapsing_star` |
| 134–138 | H. telegraphs | 5 | `telegraph circle / ring / ring gap / cone / line` | `TelegraphRenderer.ts`, 50 % progress |
| 139–143 | I. affix rings (on `e1`) | 5 | `affix hasted/armored/splitting/vampiric/shielded` | `data/affixes.ts` `AFFIXES` |
| 144 | I. double affix | 1 | `affix double` | HASTED + ARMORED |
| 145–150 | J. chapter palettes | 6 | `palette ch1..6` | 4 swatches: base, glow, outline, accent |

Notes for 5B:
- Cells E `fire_blast`, `stardust_trail`, `void_rift` are intentionally **empty** (those projectiles are particle-only, see `ProjectileRenderer.ts` "SKIPPED RENDERERS").
- Spark stages use `globalCompositeOperation = 'lighter'` inside the cell; the sheet background is dark so the screenshot keeps the corona.
- `drawEnemy` consumes `flashTimer` — gallery enemies have none, so there is no white flash frame.
- World cells draw with `discovered: true` and the player far away, so no glow pulse / touch ring is included — pure silhouette.
- Boss P2/P3 cells include the seam ring / crack web overlay (`drawBossPhaseOverlay`); enrage ring is **not** on the sheet (needs `state.bossEnraged`, animated).

## Sprite mode (5B)
- `npm run art [scale]` = `npm run build` + `node tools/extract-art.mjs`: serves `dist/` with `vite preview` on :4179, opens
  `/?gallery=1&sheet=1&scale=S` in headless Chromium (Playwright, devDependency), reads `window.__GALLERY`, trims every cell to its
  alpha bounds in-page, writes `public/sprites/<id>.png` (id = label lower-cased, `[^a-z0-9]` → `_`) and `atlas.json`
  `{ scale, cell, sprites: { id: { index, label, w, h, anchorX, anchorY, unit, bytes } } }`. `unit` = sprite px per world px
  (gallery cells draw at 2×). Deterministic (frame 0, no RAF). Budget 1.5 MB total; scale 1 = 148 PNG, ~1.02 MB (3 empty cells skipped).
- `components/game/renderer/SpriteRenderer.ts`: `preloadSprites()` fetches `sprites/atlas.json` relative to `document.baseURI`
  (works in itch's CDN subfolder), `drawSprite(ctx, id, x, y, rot, scale, tint?)`; tinted variants cached in offscreen canvases
  (max 64, LRU-ish eviction). `hasSprite(id)` lets renderers fall back to procedural when an id is missing or not loaded yet.
- Flag: `?sprites=1` or Settings → "Sprite mode (faster)" (`settings.spriteMode`, saved). Checked first in `EnemyRenderer.ts`
  (`drawEnemy`) and `ProjectileRenderer.ts`; bosses, player, drops, world stay procedural (their art is animated/phase-dependent).
- Builds: `vite build` copies `public/sprites/` to `dist/sprites/`; the itch zip ships it next to `index.html` (`tools/itch.sh`).
- **Any art change** → re-run `npm run art` and commit the regenerated PNGs, otherwise sprite mode shows stale art.

## Where to add art
| Thing | File |
|-------|------|
| Enemy silhouettes, affix ring, boss overlays | `components/game/renderer/EnemyRenderer.ts` |
| Spark body, dash trail, burst ring | `components/game/renderer/PlayerRenderer.ts` |
| Projectiles | `renderer/ProjectileRenderer.ts` + `renderer/projectiles/{Weapon,Boss,Environment}Renderer.ts` |
| Drops | `renderer/DropRenderer.ts` |
| World points | `renderer/WorldRenderer.ts` |
| Telegraphs / arena | `renderer/TelegraphRenderer.ts` |
| Palette helpers | `renderer/Palette.ts` |
| Gallery sheet | `components/Gallery.tsx` (+ this table) |
| Sprite extraction / blits | `tools/extract-art.mjs`, `components/game/renderer/SpriteRenderer.ts` |
