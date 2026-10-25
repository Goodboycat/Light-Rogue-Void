# BOSSES — kit usage + roster

Bosses are stressful because they test **reading and movement**, not HP. Every attack is a telegraph first; damage only
happens in `onFire`. The player's answers are: **dash** (i-frames + dodges any telegraph hit), **Fire Blast** (destroys
boss projectiles it touches), **White Hole** (wipes boss projectiles in range, finisher-grade blast via BigFx).
HP is the only thing that differs between chapters for *difficulty scaling*; the movesets must each be unique.

## Kit (`game/components/game/logic/enemies/BossKit.ts`)
| call | what |
|---|---|
| `updateBossKit(state, boss)` → `shifting` | call first every frame. Detects phase (100/66/33 → `boss.state.phase`), starts the 72 f invulnerable phase shift (clears bullets + telegraphs, arena pulse), triggers enrage at `BOSS_ENRAGE_SEC` (150 s). Return `true` = stand still, skip attacks. |
| `telegraph(state, kind, x, y, params, warnFrames, onFire)` | kind `circle` `{radius}`, `ring` `{radius, innerRadius}`, `line` `{angle, length, width}` (from x,y along angle), `cone` `{angle, fov, radius}`. `params.color` = boss colour. Pool of `TELEGRAPH_POOL_SIZE`; enrage multiplies warn by `BOSS_ENRAGE_WARN_MULT` (0.7). |
| `telegraphHitPlayer(state, t, dmg)` | in `onFire`: hurts the player if inside the shape. **Dashing / Titan shield = dodge** (white spark, no damage). Applies `bossDamage` (×2 enraged), tags `lastBossHit`, shake + hit-stop. |
| `fireBossProjectile(state, {x,y,vx,vy,…})` | pooled bullet tagged `customData.isBossProj`; capped at `BOSS_PROJ_CAP`; cleared on phase shift / death; breakable by FIRE_BLAST; wiped by White Hole. |
| `phaseOf(boss)`, `isPhaseShifting(boss)`, `startPhaseShift`, `enrage`, `enrageCountdown` | phase helpers. |
| `openArena` / `closeArena` / `arenaEdgePoint(state, scale)` / `arenaOutsideFactor` | `state.arena {x,y,r}` opened at the player (r `ARENA_RADIUS` 900) on boss spawn; outside = `VOID_BURN_DPS` 4 %/s + vignette. Bosses may shrink `state.arena.r`. |
| `updateBossAdds` | roaming pack of 3–5 every `BOSS_ADD_INTERVAL_SEC` (12 s) at the arena edge, cap 20, from `def.addTable`. Called by Logic.ts. |

### Hazards (`logic/enemies/BossHazards.ts`, drawn by `renderer/HazardRenderer.ts`)
Each boss owns ONE persistent terrain hazard (`bosses.ts` → `hazard: {kind, everySec, max, radius, damage, color}`).
One lands (telegraphed, `HAZARD_WARN_FRAMES` 70) at a random arena point every `everySec`, **stays for the whole fight**,
accumulates to `max` (≤ `HAZARD_CAP` 18), spawns twice as fast when enraged. "The longer I wait, the worse it gets."
`placeHazard(state, boss, def, x, y, extra)` lets a script place one deliberately (e.g. Warden dash trail).
Kinds: `acid` (dmg ticks) · `nebula` (dmg + slow, drifts if `vx/vy`) · `flare` (big dmg) · `beam` (static laser lane,
`angle` 0 / π/2) · `rubble` (90 % slow, dash ignores) · `void` (pull + dmg). Cleared in `closeArena`.

### Feel hooks
`shake`, `hitStop` (Feel.ts), `heavyShake`, `screenFlash`, `spawnBigExplosion`, `castBossDeathBlast` (BigFx.ts, used by
KillLogic on boss death). Boss HUD = `components/BossBar.tsx`; death hint = `data/bossHints.ts`; arrival = `state.bossArrival`.

### Boss file skeleton
```ts
export const updateX = (state, enemy, dx, dy, onEnemySeen) => {
    const shifting = updateBossKit(state, enemy);
    const phase = enemy.state.phase ?? 1, c = enemy.state.custom!, t = enemy.state.timer;
    if (shifting) { /* one-shot on shift via c.flag */ return { moveX: 0, moveY: 0, moveSpeed: 0 }; }
    if (t % 150 === 0) telegraph(state, 'circle', px, py, { radius: 110, color }, 60, (st, tg) => telegraphHitPlayer(st, tg, 3));
    return { moveX: dx, moveY: dy, moveSpeed };
};
```
Rules: no damage outside `onFire` / `fireBossProjectile` / contact; no mercy; no in-run rewards; constants at the top of the file.

## Roster
| boss | wave | hazard | P1 | P2 | P3 | signature / learnable | status |
|---|---|---|---|---|---|---|---|
| Hive Mind | 10 | acid pools | acid circle on player, 3-way spit, 3 **spawner nodes** around the arena (kill = fewer larvae) | expanding acid **rings** with a dash gap, 5-way spit, line dash | boss **pulls** itself to the player, acid **cone** spit, closing ring | rings: stand on the gap or dash through the band | 2C |
| Void Warden | 20 | toxic nebulas | **ricochet dash** shown 0.8 s ahead (line), leaves nebula at each bounce | double dash + 2 Phase Shades | arena shrinks to r 650, nebulas drift | the line IS the dash — sidestep perpendicular | 2C |
| Crimson Eclipse | 30 | solar flares | 2 rotating **lasers** (cone telegraphs) | 4 lasers slower; **eclipse** 3 s blackout, only telegraphs visible | flares rain + lasers rotate | move WITH the rotation, never across | 2C |
| Collapsing Neutron | 40 | static beams | gravity pull, orbit rings (stand inside/outside) | push-then-pull pulses | collapse: r 500, pull ×2, supernova ring | 2D |
| Entropy Titan | 50 | rubble mud | slams (circles) leave rubble | shockwave rings | arena shrinks each slam; Iron Clad adds | 2D |
| Darkness | 60 | void mines | mirrors ≤4 unlocked powers | Doppelganger | lights out except aura; enrage swallows the edge | 2D |

## Tuning (time-to-kill, chapter tree) — fill in 2C/2D
| boss | baseHp | hpScaling | measured TTK | notes |
|---|---|---|---|---|
| Hive Mind | see bosses.ts | | | |
