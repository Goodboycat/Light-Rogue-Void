# BALANCE (8B)

Every tunable number lives in `game/components/game/Constants.ts` → section `BALANCE CURVES (8B)`. Boss-specific attack numbers live at the top of each boss file in `game/components/game/logic/enemies/bosses/`. Measure with the sim, never by feel alone.

## Tools
| Command (from `LIGHT/game`) | What it does |
|---|---|
| `npm run sim -- --tree=<preset> [--from=1 --to=60 --runs=3 --seed=1 --quiet]` | Headless run of the real `updateGame`, bot at the controls. One CSV row per wave → `LIGHT/out/sim/<preset>.csv`, one summary line → `out/sim/summary.jsonl` |
| presets | `fresh` `offense` `defense` `utility` `offdef` `full` `budget:<matter>` (cheapest-first buy up to N matter) |
| `--boss=<1..6>` | Boss time-to-kill (TTK) mode: start at that boss wave, report kill time |
| `--god` | Damage is counted but never kills (pure DPS/TTK). `dmgTop` = damage taken by source |
| `node tools/tree-cost.mjs [--order=offense] [--json]` | Tree cost table and a runs-to-fill model (reads `budget:N` rows from summary.jsonl) |

The bot flees the enemy centroid, rams and dashes on cooldown, reads telegraphs, lasers and hazards, and dashes through beams. It plays worse than a decent human: treat its numbers as a **floor** on player power.

## Curves (current values)
| Name | Value | Meaning |
|---|---|---|
| `enemyHpAt` | `(base + w·hpScaling + w²·0.5) × ENEMY_HP_CHAPTER_MULT[ch]` | mult all 1 |
| `enemySpeedAt` | `base + w·0.05` | |
| `ENEMY_CONTACT_DMG` / `ENEMY_EXPLODE_DMG` | 1 / 3 | player starts at 3 HP |
| `essenceRewardAt` | `base × (1 + w·ESSENCE_PER_WAVE)`, `ESSENCE_PER_WAVE = 0` | essence per kill is flat; wave scaling comes from enemy mix |
| `MATTER_PER_ESSENCE` | 1 | |
| `BOSS_HP_MULT` | `[0.6, 1.4, 0.8, 1.5, 1.6, 2.5]` | tuned in step 3 |
| `SPECIAL_WAVE_HP_MULT` / `_ESSENCE_MULT` | 1 / 1 | |
| Tree `nodeCost(depth)` (`data.ts:28`) | `20·1.11^d × tier` with tier 1 / 2.5 / 6 / 15 / 40 / 100 for depth bands 0/10/20/30/40/50+; skills ×3, constellation ×1.5 | |

## Boss time-to-kill (step 3, `--god`, expected tree for that chapter)
Target: 60–120 s. Enrage starts at 150 s untouched.
| Boss | Wave | TTK s |
|---|---|---|
| Hive Mind | 10 | 37–91 |
| Void Warden | 20 | 63–71 |
| Crimson Eclipse | 30 | 68–143 (god); after the step 5 patch: full tree **survives 6/6, 31–49 s** |
| Neutron Star | 40 | 75–80 |
| Titan | 50 | 53–88 |
| Darkness | 60 | 66–116 |

## Tree cost curve (step 4)
408 nodes, **77.7M matter**: Offense 18.2M, Defense 19.9M, Utility 18.0M, constellations 21.7M. Depth 50+ nodes are about 85% of each arc's cost (Offense by depth band: 0–9 910, 10–19 5.4k, 20–29 53k, 30–39 308k, 40–49 2.5M, 50+ 15.3M).

Measured essence per run against matter already spent (bot, 3 runs each):
| owned matter | 0 | 500 | 2k | 8k | 30k | 100k | 300k | 1M | 3M | 10M+ |
|---|---|---|---|---|---|---|---|---|---|---|
| ess / run | 19 | 177 | 613 | 2.5k | 18.6k | 46k | 93k | 146k | 207k | ~220–250k |
| median wave | 3 | 9 | 10 | 10 | 19 | 20 | 30 | 30 | 30 | 30 |

Model (cheapest-first spending): 25% of tree at run 114, 50% at run 203, **Offense full at run 234**, Defense 254, Utility 277. The full tree is never reached because the boss 4–6 constellations need wave 40+, which the bot could not pass before the step 5 patch. Offense-first ordering gives the same result (costs are gated by depth).
**Re-measured in 9A (after the Eclipse laser patch), 3 runs each:**
| owned matter | 1M | 3M | 10M |
|---|---|---|---|
| ess / run | 171k (was 146k) | 114k (was 207k) | 234k (was 237k) |
| median wave | 30 | 20 (2/3 died to Void Warden at w20, noisy) | 30 |
| deaths | eclipse 3 | warden 2, eclipse 1 | eclipse 2, e10 1 |

Model with the new table: 25% at run 126, 50% at run 215, **Offense full 246**, Defense 265, Utility 289 (about +12 runs vs pre-patch, mostly from the noisy 3M point). **The wave-30 wall is still there for partial trees:** 6 of 9 budget runs still died to Crimson Eclipse, so the laser patch only fixed the full-tree case. Waves 40–60 still have no measured data. Next balance pass: more runs per point (`--runs=10`) and see whether the Eclipse needs a second patch for 1M–10M trees.

**Reading:** the early game is fast (about 170 nodes in 20 runs). Past wave 30, income levels off around 220k per run, while the depth-50 tier (×100) costs millions per node. If playtests say the late tree is a grind, lower the 50+ tier from 100 toward 60, or raise `ESSENCE_PER_WAVE` above 0. Re-measure after the Eclipse patch first (the plateau was the wave-30 wall).

## Death causes (step 5)
12 budget sweeps × 3 runs = 36 deaths, before the patch:
| Cause | Deaths | | Damage source | Total dmg taken |
|---|---|---|---|---|
| boss:crimson_eclipse | **15** | | boss:crimson_eclipse | 235 |
| boss:hive_mind | 6 | | e9 Stardust Whale | 232 |
| boss:void_warden | 4 | | boss:void_warden | 194 |
| e1, e10 | 2 each | | e18 Kamikaze Star | 173 |
| e2 e4 e5 e6 e7 e9, shot:enemy | 1 each | | e6 | 148 |
| | | | shot:enemy | 117 |

**Outlier patched:** Crimson Eclipse solar lasers (`CrimsonEclipse.ts:24-25`). A full 78M tree lost 6/6 at `--boss=3`; with lasers disabled it won 6/6. Changed `LASER_DMG` from 3 to 1 and `LASER_TICK` from 8 to 14 frames. Result: full tree 6/6, TTK 31–49 s. `offense`-only still loses (3 to e18, 3 to the boss), which is intended: Defense matters at wave 30.
**Watch list (not patched):** e9 Whale contact (high total damage, low deaths), e18 Kamikaze (EXPLODE does 3 against 3 HP fresh = one-shot), Hive Mind as the first wall (6 deaths at budgets 500–30k: intended gate).

## Recipe: tuning something
1. Change the constant in `Constants.ts` (or the boss file).
2. Run `npm run sim -- --tree=budget:<N> --runs=3 --quiet` at 2–3 budgets around the change, and `--boss=<n>` for boss changes.
3. Compare the `SUMMARY` line (medianWave, causes, ttks) with the tables above, then update this file.
4. If income changed: `node tools/tree-cost.mjs` for the new runs-to-fill.
