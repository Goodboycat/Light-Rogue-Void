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
| Hive Mind | 10 | acid pools | acid circle on player, 3-way spit, 3 **spawner nodes** around the arena (kill = fewer larvae) | expanding acid **rings** with a dash gap, 5-way spit, line dash | boss **pulls** itself to the player, acid **cone** spit, closing ring | rings: stand on the gap or dash through the band | ✅ 2C |
| Void Warden | 20 | toxic nebulas | **ricochet dash** shown 0.8 s ahead (two line legs, wall bounce), body is the hitbox, nebula at each bounce (≤ 6), 8-way volley | double dash (second leg leads the player) + 2 Phase Shades on shift, spiral volley | arena shrinks to r 650, nebulas drift, triple dash with 40 f warns, **Warden's Wall** sweeping cone laser | the line IS the dash — sidestep perpendicular; rotate with the Wall | ✅ 2C |
| Crimson Eclipse | 30 | solar flares | 2 live rotating **beams** (`state.lasers`, `LaserRenderer`) with a wedge-ahead cone telegraph (0.7 s), 16-way ember ring, comet shot | 4 beams slower; **ECLIPSE** every 9 s = 3 s blackout (`state.eclipse`) where only hazards / telegraphs / beams / your aura / boss bullets are drawn | flare rain (1 on you + 2 around, 55 f warn) every 1.5 s, corona ring every 6 s, beams reverse spin every 4 s | move WITH the rotation, never across; in the dark trust the orange wedges | ✅ 2C |
| Collapsing Neutron | 40 | static beams | constant **gravity pull** toward the core (dash ignores it), orbit **ring bands** (cyan = stand inside, white = stand outside) | push shockwave then **pull burst** with a lethal core circle | collapse: arena r 500, pull ×2, **supernova** (r 420, 2 s signal, be outside) + ember ring | fight the pull with the dash, read the ring colour | ✅ 2D |
| Entropy Titan | 50 | rubble | **leap slams** (line + landing circle) leave **solid rocks** (hazard kind `rock`, blocks movement, ttl), stomp walk, breakable rocket fan | expanding **shockwave rings** that shatter rocks (dash through), Iron Clad adds | arena shrinks 60/slam (floor 520), double slam leads your heading, quake craters | rocks are cover from the fan AND walls against the rings | ✅ 2D |
| Darkness | 60 | void mines | **mirrors up to 4 of your unlocked powers** (`state.playerStatsRef`: fire fan / ice ring / thunder chain / seekers / flare / blade lines / gravity well / whip; mine fallback) on a rotation | **Doppelganger** (`BOSS_MINIONS.doppelganger`, MIMIC) on shift + every 20 s, double casts | **lights out** (eclipse held, only your aura) + Consuming Nova ring with a 120 px safe disc; enrage = arena edge swallowed inward to r 420 | it only has what you have — your own dodges work on it | ✅ 2D |

## Tuning (time-to-kill, chapter tree)
Bosses spawn with `baseHp` only (`Logic.ts:87` ignores `hpScaling` for bosses — it is used by `hive_node` minions via
`SpawnLogic`). "Chapter tree" DPS estimates: aura 100 px (`damageAura`/frame = 60×aura DPS), orbitals 2 HP / 10 f each,
Fire Blast 50+15/lvl per 45 f, Thunder 15+5/lvl per 70 f ×(3+lvl), Homing 60+15/lvl per 120 f. Headless numbers below are
`node tools/sim.mjs <wave> 150 <dmgMult>` where the sim deals `2×dmgMult` HP/frame (= 120×dmgMult DPS) to the nearest
enemy within 600 px — the sim player never moves, so it hits the boss only while adds aren't closer. Real TTK will be
measured in gameplays (per the owner's request) and adjusted then.
| boss | baseHp | assumed DPS | headless TTK | notes |
|---|---|---|---|---|
| Hive Mind | 6000 (was 2000) | 120 (dmgMult 1) | 66 s | adds + Brood Nodes steal the sim's single target ≈ 40 % of the time |
| Void Warden | 12000 (was 10000) | 240 (dmgMult 2) | ≈ 120 s (2546 HP left at 150 s with 14000) | dashes take the boss out of the 600 px window; expect 70–100 s with real homing/orbitals |
| Crimson Eclipse | 20000 (was 15000) | 360 (dmgMult 3) | ≈ 110 s (10154 left at 150 s with 24000) | boss holds 320–480 px; flares/adds eat sim damage |
| Collapsing Neutron | 20000 (unchanged) | 480 (dmgMult 4) | 84 s | pull keeps the sim in range; best-behaved fight for the model |
| Entropy Titan | 24000 (was 25000) | 600 (dmgMult 5) | stalls at 17720 left (sim can't move: boss holds 260–520 px, Iron Clads steal the target) | expect 60–90 s with a moving player |
| Darkness | 30000 (was 35000) | 720 (dmgMult 6) | stalls at ~31000 (boss kites at 450 px, Doppelganger inside 600 px eats the damage) | expect 70–100 s; all under the 150 s enrage |

The sim can't move or aim, so Titan/Darkness numbers are a floor, not a measurement. **Owner's call (per request): final
HP/timing tuning happens in gameplays once the game is complete.**

## Ending (2D)
Darkness death → `SurvivalGame` sets `gameWon` → `WinGame.tsx`: `OUTRO_SCRIPT` (`data/cinematics.ts`; DARKNESS quiets,
WATCHER speaks, LIGHT decides; visual actions `SEAM_TEAR` / `SEAM_BLOOM`) over a Seam-of-the-Void wash (violet, seam line,
chromatic flicker, whisper lines — the fork's `patch.js` idea rebuilt in React), then **STAY** (→ menu, 9A adds endless) or
**LEAVE** (procedural credits built from `CHAPTERS` + `BOSSES` + run stats). Both call `onEndingSeen` → `gameState.endingSeen`
(persisted in `useGameSave`). Darkness constellation unlocks via `defeatedBosses` as before.
