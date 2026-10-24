# HANDOFF — what the last chat did

Updated by every chat at the end. Newest first.

## 4A (this chat) — action feel + pools: DONE
Started from `0308143` (steps 1–3 committed by the previous chat) with step 4 (pools) sitting **uncommitted** in the tar and step 5 half-wired. Finished, measured, committed, pushed.

**Where things live (all under `LIGHT/game/components/game/`):**
- `Feel.ts` — the whole feel module. `hitStop` (≤ 4 f, once per 10 f), `shake`/`updateShake` (`state.shakeX/Y`, decays), `flash(enemy)` (`enemy.flashFrames`), floaters (`makeFloaterPool`, `spawnFloater`, `onEnemyHit` — call this on every damage tick), streaks (`onKillForStreak`, `streakEssenceMult`, `state.streak`, `state.streakBanner`), player hurt (`onPlayerHurt` returns false while invulnerable → damage is swallowed; `state.playerIFrames`, `state.hurtVignette`). `updateFeel(state)` once per frame.
- Wiring: `Logic.ts:53` (`consumeHitStop` early-return keeps shake decaying), `Logic.ts:142` (`updateFeel`); `SurvivalGame.tsx:283` (`handleDamage` → `onPlayerHurt`), `:361` (`setFeelSettings` from save settings, `state.hpRatio` for the heartbeat); `Renderer.ts:24` (shake translate), `:81` (`drawHurtOverlay`); `renderer/FloaterRenderer.ts` (floaters, streak banner, hurt/heartbeat vignette); `renderer/PlayerRenderer.ts` (i-frame blink, red shadow; `reduceFlash` → steady 0.7 alpha instead).
- Settings `screenShake` (default on) / `reduceFlash` (default off): `hooks/useGameSave.ts:34,61`, toggles in `components/SettingsMenu.tsx:70-78`.
- `Pools.ts` — free lists for particles / projectiles / drops + `swapRemove*` helpers (`swapRemoveEnemy` is removal-only). Used in `Particles.ts` (`createParticle` acquires; at `PARTICLE_CAP` the oldest slot is recycled), `logic/ProjectileLogic.ts`, `logic/DropLogic.ts`, `logic/KillLogic.ts`. `acquireProjectile(init)` exists but **no spawner uses it yet** — projectile spawners still `push({...})` literals (public API kept as the prompt asked); release side is pooled. 2B/4B spawners should call `acquireProjectile` to get the full benefit.
- `renderer/ParticleBatcher.ts` (Path2D buckets by mode|color|alpha, viewport cull with 64 px margin, GLOW via sprites) + `renderer/GlowSprites.ts` (`getGlowSprite`, `getHurtVignetteSprite`). `Renderer.ts:64-71` calls `drawParticlesBatched`.
- Constants (`Constants.ts` bottom): `HIT_STOP_*`, `FLOATER_*`, `STREAK_*`, `PLAYER_IFRAMES=18`, `HURT_VIGNETTE_FRAMES=14`, `LOW_HP_PCT=0.25`, `PARTICLE_CAP=600`, `PROJECTILE_CAP=400`, `DROP_POOL_CAP=400`.
- Swap-remove safety: every hot loop iterates backwards (`EnemyLogic.ts:27`, `ProjectileLogic.ts`, `DropLogic.ts`, `Particles.ts`), so the swapped-in element was already processed this frame. **If a future chat adds a forward loop that removes, it must use `i--` after removal.** Order of `state.enemies` is no longer stable (don't rely on index == spawn order).

**Measured (step 6)** — headless `node tools/sim.mjs <wave> 10 3` (update step only, no canvas; Node 20, sandbox CPU). Before = `2cc4f28`, after = `f1fa2d4`:
| | wave 40 (boss) avg / worst | wave 41 avg / worst |
|---|---|---|
| before | 0.116 ms / 10.81 ms | 0.087 ms / 5.82 ms |
| after | 0.216 ms / 5.94 ms | 0.118 ms / 3.63 ms |
Avg rose ~0.1 ms (floaters + streak bookkeeping per hit, pool bookkeeping), worst-frame halved (no splice shifting, no array growth). Both are far under the 16 ms budget; the sim only reaches ~22 alive at the 2A director cap so this is **not** a 300-enemy stress test. Render-side batching (the part that mattered on phones in the fork) was not measured — needs a browser; 7B owns the real device profile.

**Not done / caveats:**
- No browser/Playwright verification this chat (credits). Visual check of floater readability on 390×844 is still owed — 7A/7B.
- `enemy.flashTimer` is consumed in `renderer/EnemyRenderer.ts:20`; bosses live in `state.enemies` so they get flash + floaters through the same `PlayerCollision.ts` `onEnemyHit` calls.
- `npm run typecheck` has one pre-existing error (`components/ErrorBoundary.tsx:47` `props` on class) that predates 4A — build is green (Vite doesn't typecheck). Not fixed, not mine; 7A or 8A can take it.
- Build: 1.42 MB / 329 kB gzip. Itch zip builds.

**Next chat runs 2B** (`bash LIGHT/game/tools/next.sh`). Hooks 2B needs: `hitStop/shake` for telegraph impacts, `onEnemyHit` on any new boss damage path (bosses already get floaters via `PlayerCollision.ts`; `BossCollision.ts` is boss→player, not the reverse), `acquireProjectile` for boss bullet patterns.

## 0F (this chat) — repo re-check, fork audit landed, plan v2, no gameplay code
State of the repo when I started: local `main` had 2A fully committed (`181cd01`) and pushed, but README still listed 2A as "Next" and six files (FORK_AUDIT, PLAN v2, prompts 2B/3A/3B/4A/4B/5A/5B, fork.sh) were sitting **uncommitted** in the tar. GitHub already had the three branches.
- Committed + pushed the orphaned work (`f8b88a9`), added fork pointers to prompts 2C/2D/6B/8A, README Done/Next tables now match reality, `prompts/NEXT_CHAT.md` is the prompt to paste into the next chat.
- Branches on GitHub: `main` (LIGHT, this), `original-complete` (2f2fa15, the boring complete original), `fixed-fork` (c8feb6d, the AI roguelike with blobs stripped). Nothing is merged from the fork yet.
- Build: `npm run build` green, 1.41 MB / 326 kB gzip. `npm run typecheck` green.
- **Next chat runs 4A** (`bash LIGHT/game/tools/next.sh`). Order after it: 2B 2C 2D 4B 3A 3B 5A 5B 6A 6B 7A 7B 8A 8B 9A 9B 10. Reason for 4A first: pools + hit feedback are the base every spawner (bosses, packs, events) builds on.
- Known gaps for 4A to be aware of: 2A's `KillLogic.ts` is the single death path — hook floaters/streaks there. `?debug=1` exposes state on `window` (see `App.tsx`). `tools/sim.mjs` is a small headless sim (8B grows it).
- Nothing half-done. No known bugs introduced (no game code touched).


## Chat 1B → 2A housekeeping (this chat, part 1)
- 1B was fully committed (`a4b5c5d`) but the previous chat never updated README / PLAN / HANDOFF. Done now.
- Fixed all path hints to the real layout: repo root `LIGHT/`, app in `LIGHT/game/`, tools `LIGHT/game/tools/*.sh`, itch output `LIGHT/out/`.
- `npm install && npm run build` green in `LIGHT/game` (bundle 1.4 MB, 325 kB gzip).

## 1B (previous chat) — seeded skill tree
- `game/utils/rng.ts` mulberry32 + hashString; `game/data.ts` fully deterministic with `TREE_SEED = 0x4c494748`, stable ids.
- 6 constellations `const_<bossId>_<n>` with `requiresBoss`; `EvolutionMatrix.tsx` + `SkillNode.tsx` show locks.
- `hooks/useGameSave.ts` drops unknown node ids and refunds matter.
- `docs/TREE.md` generated by `npm run tree` (`tools/dump-tree.mjs`).
