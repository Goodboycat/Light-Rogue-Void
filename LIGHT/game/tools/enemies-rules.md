
## Elite affixes (`data/affixes.ts`, 4B)

Rolled in `logic/enemies/SpawnLogic.ts` for every normal spawn. Boss minions (Brood Nodes, Phase Shades, Doppelganger) pass `noAffix`.

| Rule | Value | Constant |
|---|---|---|
| Elite chance | 5 % + 0.4 %/wave, cap 30 % (reached at wave 63) | `AFFIX_BASE_CHANCE`, `AFFIX_PER_WAVE`, `AFFIX_CHANCE_CAP` |
| Second affix | from wave 30, 25 % of elites | `AFFIX_DOUBLE_WAVE` |
| Elite HP | ×1.4 | `ELITE_HP_MULT` |
| Elite essence | ×1.6 | `ELITE_ESSENCE_MULT` |

| Affix | Glyph | Ring colour | Effect | Implemented in |
|---|---|---|---|---|
| Hasted | » | yellow `#fde047` | +40 % speed | `StandardBehavior.ts` speed mult |
| Armored | ▣ | slate | −30 % damage taken, −20 % speed | `Feel.onEnemyHit` refunds 30 % of each hit |
| Splitting | ✂ | indigo | 2 minis on death (60 % size, 30 % HP, no affix) | `logic/KillLogic.ts` |
| Vampiric | ♥ | red | on touching the player heals allies in 200 px by 8 % max HP | `logic/EnemyLogic.ts` |
| Shielded | ⬡ | violet | hex shell absorbs the first 3 hits | `Feel.onEnemyHit`, `EnemyRenderer.ts` shell |

Readability: each affix draws an arc of the outline ring in its colour plus a glyph above the enemy (`renderer/EnemyRenderer.ts` `drawAffixRing`). Two affixes = two arcs.

## Spawn director (`logic/Director.ts`, 4B)

- **Packs**: 3–8 enemies (`PACK_MIN..PACK_MAX`) of 1–2 types from the wave table, land at one point 760 px from the player (`PACK_SPAWN_DIST`) after a 0.6 s circle telegraph (`PACK_WARN_FRAMES`). Interval `max(3.5, 7 − wave·0.1)` s.
- **Trickle**: the 2A spawner keeps running between packs at half rate.
- **No alive cap** (CONVENTIONS rule 9). `refDensity(wave)` is only a *reference* for pack room, never a ceiling. Measured: wave 45 ≈ 263 alive, 0.22 ms update avg (`npm run sim`).
- Director is paused on boss waves; `BossKit.updateBossAdds` owns adds there.
- Elite packs: `composePack(..., { elite: true })` forces `rollAffixes(wave, true)`; Elite Rush uses this for every pack.

## Special waves (`components/game/waveFlavors.ts`, ported from the fork)

Every x5 wave that is not a boss wave. Banner + caption for 4 s on wave start (`renderer/FlavorRenderer`), lazily armed when a run starts with `?wave=`.

| Wave | Flavor | Rule |
|---|---|---|
| 5, 45 | **ELITE RUSH** | every director pack is elite (all affixed), ×1.6 essence each |
| 15, 55 | **GAUNTLET** | every 8 s a wall of enemies crosses the arena with two green lane telegraphs marking the gaps |
| 25 | **CURSE** | each kill leaves a 4 s dark mark (`CurseMark`, damages on touch); finish the wave touching none → ×1.1 essence |
| 35 | **AEGIS TRIAL** | all spawns Shielded; glowing *Shiners* spawn among them — killing one shatters shields within 200 px |

Beyond wave 60 (endless / `?wave=`): every x5 non-x10 wave cycles ELITE_RUSH → GAUNTLET → CURSE → AEGIS_TRIAL by `floor(wave/10) % 4`.

## Enemy projectiles (4B step 4)

SNIPER / SHOOT_RING / SHOOT_SPIRAL / LEAVE_MINES / BLACK_HOLE_CAST all set `enemy.shotWarn` for 24 frames (`ENEMY_SHOT_WARN_FRAMES`, 0.4 s) before firing; the renderer draws a bright glow pulse during the warn. Shots are pooled via `acquireProjectile`, batched into one `Path2D` per colour, viewport-culled (+64 px). No projectile cap.

## Fork port audit (4B step 5)

`bash tools/fork.sh enemies.ts` vs our `enemies.ts`: **identical 59 ids and identical behaviour mix** (the README's "48" was stale — the original already shipped 59). Nothing to port. The fork's extra variety lived in `waveFlavors.ts` (ported in step 3) and in its affix/elite layer (rebuilt in step 1), not in new defs.

## Ideas for later chats (not scheduled)

- 8B balance: `spawnWeight` of e26 Nullifier (essence 0) and e29 Gravity Well (speed 0) relative to pack composition — packs of 8 Gravity Wells are possible at wave 30+.
- 3B story: bestiary lore per enemy uses `description`; longer `lore` field would need `types.ts` `EnemyDef.lore?`.
