# Conventions — read this first in every chat

## Setup (every sandbox)
```bash
# The repo root is /home/user/webapp/LIGHT (extract LIGHT.tar.gz into /home/user/webapp, or clone there)
git clone https://github.com/Goodboycat/Light-Rogue-Void /home/user/webapp/LIGHT   # or extract the tar
cd /home/user/webapp && bash LIGHT/game/tools/github.sh <TOKEN>   # once
cd /home/user/webapp/LIGHT/game && npm install && npm run build
bash /home/user/webapp/LIGHT/game/tools/next.sh   # tells you which prompt to run
```
Layout: `LIGHT/README.md`, `LIGHT/docs/`, `LIGHT/prompts/` at the root; the Vite app (package.json, App.tsx, components/…) is in `LIGHT/game/`; tools in `LIGHT/game/tools/`; itch output in `LIGHT/out/`. Paths below like `components/...` are relative to `LIGHT/game/`.
Read `docs/CONVENTIONS.md`, `docs/HANDOFF.md`, then `prompts/<ID>.md`.

## Rules
1. **Roguelite, not roguelike.** No in-run power choice, no boon drafts, no "pick 1 of 3". All permanent power comes from the Skill Tree (`data.ts`). Run-only findings (relics, shrines) are *discovered* on the map, never offered as a menu.
2. **Small tasks, small commits.** Each prompt lists steps; commit + `git push origin main` after every step. Message format: `<ID>: <what>` e.g. `2A: enemies persist across waves`.
3. **Keep the build green.** `npm run build` must pass before every commit. `bash LIGHT/game/tools/itch.sh` must produce `LIGHT/out/light-rogue-void-itch.zip` at the end of every chat.
4. **No generated images or audio in the repo.** Art is procedural Canvas 2D. Audio comes from Ludo.ai later (6A/6B). Repo should stay < 5 MB without node_modules. **Exception (5B):** `game/public/sprites/*.png` + `atlas.json` are *derived* from the procedural gallery by `npm run art` and are committed (~1.0 MB); never hand-paint them — change the renderer, re-run the script, commit the regenerated set.
5. **Credits are scarce.** Don't re-read big files you already know; don't run Playwright unless the prompt asks; don't rewrite files when an edit will do. Prefer `grep -n` + `sed -n a,bp`.
6. **Constants in `components/game/Constants.ts`.** No magic numbers for waves, chapters, caps.
7. **Save compatibility.** Never break `useGameSave`; add fields with defaults; bump `SAVE_VERSION` when shape changes (8A owns migrations, others only add optional fields).
8. **Mobile first.** Everything must work with touch; test the layout at 390×844 and 844×390 mentally; never rely on hover.
9. **No caps — overwhelm, then optimise.** LIGHT must feel overwhelming: there is **no particle cap, no projectile cap, no enemy/entity spawn cap, no crowd budget**. Never add a hard cap, a "skip spawn when full" guard or a "recycle oldest" rule to make a frame cheaper. Pacing comes from *spawn rate* (director intervals, wave curves), never from counts. Performance comes from technique instead:
   - **Batching**: one `Path2D`/`fill` per (shape, colour, alpha) bucket for particles, projectiles and simple enemies (`renderer/ParticleBatcher.ts`); pre-rendered glow sprites instead of `shadowBlur`; no per-entity `save/restore` in hot loops.
   - **Pools + swap-remove**: free lists for everything spawned per frame (`Pools.ts`), backwards loops, no `splice`, no per-frame allocations in update.
   - **Culling**: skip drawing anything outside the viewport + 64 px; cheap LOD when counts are large (smaller glow, no outlines) — quantity stays, detail drops.
   - **Spatial hashing** for enemy↔projectile / enemy↔enemy checks once counts pass a few hundred (uniform grid, rebuilt per frame).
   - **Budget targets** (goals to *measure*, not limits to *enforce*): 60 fps desktop with 500+ enemies and 2000+ particles on screen; 30+ fps mid phone via quality profiles (7B) that lower *detail* (glow, DPR, floaters), never *counts*.
10. **Finish the chat properly:** update README "Done"/"Next" tables, write `docs/HANDOFF.md` (it holds **only the newest entry**: first copy the old one to `docs/handoff/<its ID>.md` + add it to `docs/handoff/INDEX.md`, then replace the entry in HANDOFF.md, keeping its header — what's done, what's half-done, exact file/line pointers, known bugs), build the itch zip, upload it as `light-rogue-void-itch`, push, report in chat.
11. **Chain IDs.** After a handoff is finished and pushed, the same chat runs `bash LIGHT/game/tools/next.sh` and continues with the next ID (full finish routine again for that ID). One ID = one handoff; several handoffs per chat are expected. Report after each one — the chat can be cut at any moment.

## Code map (original engine)
- `App.tsx` — screens: menu / game / skill tree (EvolutionMatrix) / archives / achievements / settings.
- `components/SurvivalGame.tsx` — React shell of the run: wave timer, HUD, cinematics, game over. Game loop calls `updateGame` then `render`.
- `components/game/Logic.ts` — per-frame update: spawning, player, abilities, enemies, projectiles, drops, camera.
- `components/game/logic/*` — PlayerLogic, AbilityLogic (14 powers), EnemyLogic → `enemies/StandardBehavior.ts`, `enemies/BossLogic.ts`, `enemies/bosses/*.ts`, ProjectileLogic → `projectiles/*`.
- `components/game/Renderer.ts` + `renderer/*` — all procedural drawing (EnemyRenderer has the visual types).
- `components/game/Emitters.ts` (VFX), `Particles.ts`.
- `enemies.ts` (48 defs), `bosses.ts` (6 defs), `abilityConfig.ts` (14 powers), `data.ts` (skill tree generator), `types.ts`.
- `data/*` — cinematics, phrases, maturity stages, achievements, backgrounds.
- `hooks/useGameSave.ts`, `hooks/usePlayerStats.ts`.

## Itch build
`LIGHT/game/tools/itch.sh` → `vite build --mode itch` with `vite-plugin-singlefile` → `out/light-rogue-void-itch/index.html` → zip. Tailwind + Google fonts stay on CDN (itch allows network), everything else inline.
