# Conventions — read this first in every chat

## Setup (every sandbox)
```bash
git clone https://github.com/Goodboycat/Light-Rogue-Void /home/user/webapp   # or extract the tar
cd /home/user/webapp && bash tools/github.sh <TOKEN>   # once
npm install && npm run build
bash tools/next.sh        # tells you which prompt to run
```
Read `docs/CONVENTIONS.md`, `docs/HANDOFF.md`, then `prompts/<ID>.md`.

## Rules
1. **Roguelite, not roguelike.** No in-run power choice, no boon drafts, no "pick 1 of 3". All permanent power comes from the Skill Tree (`data.ts`). Run-only findings (relics, shrines) are *discovered* on the map, never offered as a menu.
2. **Small tasks, small commits.** Each prompt lists steps; commit + `git push origin main` after every step. Message format: `<ID>: <what>` e.g. `2A: enemies persist across waves`.
3. **Keep the build green.** `npm run build` must pass before every commit. `bash tools/itch.sh` must produce `out/light-rogue-void-itch.zip` at the end of every chat.
4. **No generated images or audio in the repo.** Art is procedural Canvas 2D. Audio comes from Ludo.ai later (6A/6B). Repo should stay < 5 MB without node_modules.
5. **Credits are scarce.** Don't re-read big files you already know; don't run Playwright unless the prompt asks; don't rewrite files when an edit will do. Prefer `grep -n` + `sed -n a,bp`.
6. **Constants in `components/game/Constants.ts`.** No magic numbers for waves, chapters, caps.
7. **Save compatibility.** Never break `useGameSave`; add fields with defaults; bump `SAVE_VERSION` when shape changes (8A owns migrations, others only add optional fields).
8. **Mobile first.** Everything must work with touch; test the layout at 390×844 and 844×390 mentally; never rely on hover.
9. **Performance budget.** 60 fps desktop, 30+ fps mid phone, ≤ 300 enemies, ≤ 600 particles, ≤ 400 projectiles. Use pools (4A) for anything spawned per frame.
10. **Finish the chat properly:** update README "Done"/"Next" tables, write `docs/HANDOFF.md` (what's done, what's half-done, exact file/line pointers, known bugs), build the itch zip, upload it as `light-rogue-void-itch`, push.

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
`tools/itch.sh` → `vite build --mode itch` with `vite-plugin-singlefile` → `out/light-rogue-void-itch/index.html` → zip. Tailwind + Google fonts stay on CDN (itch allows network), everything else inline.
