# vendor/ — external code used by BigFx (committed so every chat can see it)

| Package | Version | License | Used by | Why |
|---|---|---|---|---|
| `simplex-noise` (Jonas Wagner) | 4.0.3 | MIT (`vendor/simplex-noise/LICENSE`) — free for commercial use, attribution only | `components/game/BigFx.ts` | 3-D simplex noise that distorts the fireball shell of the White Hole / boss-death explosions so they look like a real fantasy blast instead of a circle. Pure math, ~3 kB gzipped, no DOM, no network. |

`BigFx.ts` imports `simplex-noise` from npm (`package.json` dependencies). The copy in `vendor/simplex-noise/simplex-noise.ts` is the exact source of the installed version — if npm is ever unavailable, change the import in `BigFx.ts` to `'../../vendor/simplex-noise/simplex-noise'` and it builds identically.

No other external VFX library is used. Everything else in BigFx (core flash, chromatic shockwave rings, embers, smoke, heavy camera shake, hit-stop, screen flash) is hand-written Canvas 2D in the repo.

Evaluated and rejected for the explosion job (so the next chat doesn't redo the search):
- `pixi-particles` / `@pixi/particle-emitter` — needs PixiJS (WebGL renderer), ~400 kB, wrong stack for a Canvas 2D game.
- `proton-engine` — MIT but DOM/WebGL oriented and 150 kB+; overkill for one effect.
- `three.js` shader explosions — WebGL only.
- `simplex-noise` is enough: the "VFX program" is the noise, the rest is a few gradients.
