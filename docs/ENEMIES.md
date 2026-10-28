# ENEMIES — roster, affixes, special waves

Generated table: `npm run enemies` (`tools/dump-enemies.mjs` reads `enemies.ts`). Rules sections are hand-written. 59 defs.

## Roster by chapter (first wave the enemy may appear)

HP = baseHp + hpScaling × wave. Weight = relative spawn weight inside its wave table. Enemies never leave the table once unlocked (waves accumulate variety).

### Chapter 1 — Origin Fields (waves 1–10)

| id | Name | Behaviour | Visual | HP / +wave | Speed | Size | Weight | Essence | Notes |
|---|---|---|---|---|---|---|---|---|---|
| e1 | Prism Larva (w1) | CHASE | SIMPLE | 15 / +5 | 2 | 12 | 100 | 2 | Weak scavenger attracted to light. |
| e2 | Star Mite (w2) | SWARM | SWARMER | 8 / +2 | 3.5 | 7 | 80 | 2 | Moves in erratic swarms. |
| e3 | Void Crab (w3) | CHASE | CRAB | 45 / +10 | 1.5 | 20 | 60 | 6 | Hard shell, persistent pursuer. |
| e4 | Neon Serpent (w4) | SINE | SERPENT | 30 / +8 | 4 | 10 | 50 | 8 | Slithers through the void. |
| e5 | Phase Shade (w5) | DASH | GHOST | 25 / +6 | 2.5 | 15 | 40 | 10 | Dasher that phases through reality. |
| e6 | Geo Construct (w6) | TANK | CONSTRUCT | 120 / +25 | 0.8 | 28 | 30 | 24 | Slow, heavy tank unit. |
| e7 | Reality Weaver (w7) | WEAVER | CRAB | 60 / +15 | 2.2 | 20 | 25 | 30 | Weaves complex movement patterns. |
| e8 | Solar Ray (w8) | SNIPER | STAR | 45 / +8 | 1.2 | 15 | 30 | 36 | Snipes from a distance. |
| e9 | Stardust Whale (w9) | TANK | SERPENT | 300 / +50 | 0.5 | 50 | 15 | 100 | Massive, gentle giant. Dangerous to touch. |
| e10 | Entropy Core (w10) | CHASE | CONSTRUCT | 200 / +50 | 1.8 | 45 | 10 | 200 | A fragment of pure chaos. |

### Chapter 2 — Whispering Grove (waves 11–20)

| id | Name | Behaviour | Visual | HP / +wave | Speed | Size | Weight | Essence | Notes |
|---|---|---|---|---|---|---|---|---|---|
| e11 | Echo blinker (w11) | TELEPORT | EYE | 40 / +10 | 1 | 18 | 25 | 40 | Teleports closer to its target. |
| e12 | Mender Drone (w12) | HEALER | CRYSTAL | 60 / +12 | 2 | 14 | 20 | 50 | Heals nearby allies. |
| e13 | Hive Mother (w13) | SPAWNER | CRAB | 150 / +30 | 0.5 | 40 | 15 | 80 | Spawns Prism Larvae. |
| e14 | Comet Trail (w14) | TRAIL | STAR | 50 / +10 | 4 | 12 | 30 | 30 | Leaves a damaging wake. |
| e15 | War Drum (w15) | BUFF_SPEED | CONSTRUCT | 100 / +20 | 1 | 35 | 15 | 70 | Increases speed of nearby enemies. |
| e16 | Spiral Dancer (w16) | SHOOT_SPIRAL | STAR | 70 / +15 | 1.5 | 22 | 20 | 60 | Shoots projectiles in a spiral. |
| e17 | Ring Turret (w17) | SHOOT_RING | CONSTRUCT | 200 / +40 | 0 | 30 | 10 | 80 | Stationary unit firing wave rings. |
| e18 | Kamikaze Star (w18) | EXPLODE | STAR | 50 / +5 | 5 | 10 | 40 | 20 | Explodes on contact. |
| e19 | Orbital Guard (w19) | ORBIT | SIMPLE | 60 / +12 | 3 | 16 | 30 | 40 | Circles the player at a distance. |

### Chapter 3 — Crystal Depths (waves 21–30)

| id | Name | Behaviour | Visual | HP / +wave | Speed | Size | Weight | Essence | Notes |
|---|---|---|---|---|---|---|---|---|---|
| e20 | Fracture (w21) | SPLIT | CRYSTAL | 80 / +15 | 2 | 25 | 25 | 60 | Splits into two upon death. |
| e21 | Phantom Assassin (w22) | DASH | GHOST | 50 / +10 | 3 | 14 | 20 | 70 | Stealthy, high damage dash. |
| e22 | Iron Clad (w23) | TANK | CONSTRUCT | 500 / +80 | 0.5 | 40 | 10 | 160 | Extremely high HP, slow. |
| e23 | Vortex Weaver (w24) | WEAVER | EYE | 90 / +20 | 2.5 | 24 | 20 | 90 | Pulls player while weaving. |
| e24 | Solar Flare (w25) | TRAIL | STAR | 60 / +15 | 4.5 | 15 | 25 | 60 | Fast, burning trail. |
| e25 | Brood Lord (w26) | SPAWNER | CRAB | 300 / +60 | 0.8 | 50 | 8 | 200 | Spawns Void Crabs. |
| e26 | Nullifier (w27) | CHASE | SIMPLE | 100 / +20 | 2 | 20 | 15 | 0 | Drains essence on contact. |
| e27 | Prism Guardian (w28) | SHOOT_SPIRAL | CRYSTAL | 150 / +30 | 1 | 30 | 15 | 120 | Rotates shooting lasers. |
| e28 | Static Cloud (w29) | BUFF_SPEED | SWARMER | 80 / +15 | 1.5 | 40 | 20 | 80 | Area of effect lightning. |
| e29 | Gravity Well (w30) | GRAVITY_PULL | SIMPLE | 400 / +50 | 0 | 45 | 10 | 240 | Strong pull, does not move. |

### Chapter 4 — Abandoned Machinery (waves 31–40)

| id | Name | Behaviour | Visual | HP / +wave | Speed | Size | Weight | Essence | Notes |
|---|---|---|---|---|---|---|---|---|---|
| e30 | Quantum Mite (w31) | TELEPORT | SWARMER | 50 / +10 | 1 | 5 | 40 | 40 | Tiny, teleports rapidly. |
| e31 | Void Leviathan (w32) | SINE | SERPENT | 600 / +100 | 1 | 60 | 5 | 400 | Huge serpent of the deep. |
| e32 | Chaos Engine (w33) | SPAWNER | CONSTRUCT | 250 / +40 | 1.2 | 35 | 10 | 180 | Spawns exploding stars. |
| e33 | Mirage (w34) | SNIPER | GHOST | 60 / +15 | 3 | 18 | 20 | 100 | Hard to see, shoots lasers. |
| e34 | Tesla Coil (w35) | SHOOT_RING | CONSTRUCT | 120 / +25 | 0.5 | 22 | 15 | 120 | Chain lightning construct. |
| e35 | Neutrino (w36) | CHASE | SIMPLE | 50 / +5 | 8 | 4 | 50 | 30 | Extremely fast, low hp. |
| e36 | Gorgon Eye (w37) | CHASE | EYE | 150 / +30 | 1 | 30 | 15 | 140 | Freezes player (visual only). |
| e37 | Doppelganger (w38) | MIMIC | SIMPLE | 100 / +20 | 4 | 10 | 10 | 200 | Mimics player movement. |
| e38 | Pulsar Bomb (w39) | EXPLODE | STAR | 80 / +15 | 2 | 25 | 20 | 80 | Pulses then explodes. |

### Chapter 5 — Void Wastes (waves 41–50)

| id | Name | Behaviour | Visual | HP / +wave | Speed | Size | Weight | Essence | Notes |
|---|---|---|---|---|---|---|---|---|---|
| e39 | Nanite Cloud (w41) | HEALER | SWARMER | 100 / +20 | 2.5 | 20 | 20 | 100 | Repairs other machines. |
| e40 | Observer (w42) | ORBIT | EYE | 200 / +30 | 1.5 | 40 | 10 | 160 | Watches from afar. |
| e41 | Monolith (w43) | TANK | CONSTRUCT | 2000 / +500 | 0.2 | 60 | 5 | 600 | Indestructible object (high HP). |
| e42 | Valkyrie (w44) | DASH | GHOST | 90 / +20 | 5 | 18 | 15 | 120 | Swoops in and out. |
| e43 | Necromancer (w45) | SPAWNER | CRYSTAL | 150 / +30 | 1 | 30 | 10 | 180 | Summons Ghosts. |
| e44 | Hydra Head (w46) | SINE | SERPENT | 120 / +25 | 3 | 25 | 15 | 140 | Part of a greater evil. |
| e45 | Firefly (w47) | TRAIL | SWARMER | 50 / +10 | 6 | 8 | 25 | 60 | Leaves burning path. |
| e46 | Apex Predator (w48) | CHASE | CRAB | 300 / +50 | 4.2 | 35 | 5 | 300 | Hunts the player relentlessly. |
| e47 | Zero Point (w49) | FREEZE_AURA | STAR | 150 / +30 | 1 | 20 | 10 | 160 | Freezes movement nearby. |
| e48 | Gamma Ray (w50) | SNIPER | CRYSTAL | 100 / +20 | 2 | 20 | 10 | 200 | Deadly sniper beam. |

### Chapter 6 — Seam of the Void (waves 51–60)

| id | Name | Behaviour | Visual | HP / +wave | Speed | Size | Weight | Essence | Notes |
|---|---|---|---|---|---|---|---|---|---|
| e49 | Omen (w51) | CHASE | GHOST | 100 / +150 | 7.5 | 50 | 8 | 500 | Moves at terrifying speeds to hunt you. |
| e50 | Singularity (w52) | GRAVITY_PULL | SIMPLE | 1500 / +300 | 0.5 | 80 | 5 | 1000 | Massive gravitational anomaly. |
| e51 | Solar Wisp (w53) | LEAVE_MINES | SWARMER | 600 / +100 | 3 | 15 | 15 | 300 | Leaves damaging sun flares in its wake. |
| e52 | Magnetar (w54) | GRAVITY_PULL | STAR | 2000 / +400 | 2 | 30 | 8 | 600 | Intense magnetic pull with arcs. |
| e53 | Plasma Storm (w55) | EXPLODE | CRYSTAL | 500 / +80 | 6 | 25 | 12 | 400 | Erratic, exploding energy discharge. |
| e54 | Orbital Fortress (w56) | LASER_SPIN | CONSTRUCT | 3000 / +600 | 1.5 | 50 | 5 | 1200 | Flying tank with spinning lasers. |
| e55 | Void Wraith (w57) | PHASE_DASH | GHOST | 400 / +100 | 8 | 20 | 10 | 600 | Phases out of reality to strike. |
| e56 | Quantum Sentry (w58) | CLEANSER | EYE | 1000 / +200 | 4 | 15 | 8 | 700 | Cleanses slows and grants immunity. |
| e57 | Omega Construct (w59) | TANK | CONSTRUCT | 8000 / +1000 | 1 | 70 | 3 | 2000 | The immovable object. |
| e58 | Event Horizon (w59) | BLACK_HOLE_CAST | SIMPLE | 2500 / +500 | 2 | 40 | 5 | 1600 | Casts miniature black holes. |
| e59 | Entropy Avatar (w60) | LASER_SPIN | STAR | 5000 / +800 | 3 | 55 | 2 | 3000 | A chaos engine of pure destruction. |

## Behaviour mix

| Behaviour | Count | Where |
|---|---|---|
| CHASE | 8 | `logic/enemies/StandardBehavior.ts` |
| TANK | 5 | `logic/enemies/StandardBehavior.ts` |
| SPAWNER | 4 | `logic/enemies/StandardBehavior.ts` |
| SINE | 3 | `logic/enemies/StandardBehavior.ts` |
| DASH | 3 | `logic/enemies/StandardBehavior.ts` |
| SNIPER | 3 | `logic/enemies/StandardBehavior.ts` |
| TRAIL | 3 | `logic/enemies/StandardBehavior.ts` |
| EXPLODE | 3 | `logic/enemies/StandardBehavior.ts` |
| GRAVITY_PULL | 3 | `logic/enemies/StandardBehavior.ts` |
| WEAVER | 2 | `logic/enemies/StandardBehavior.ts` |
| TELEPORT | 2 | `logic/enemies/StandardBehavior.ts` |
| HEALER | 2 | `logic/enemies/StandardBehavior.ts` |
| BUFF_SPEED | 2 | `logic/enemies/StandardBehavior.ts` |
| SHOOT_SPIRAL | 2 | `logic/enemies/StandardBehavior.ts` |
| SHOOT_RING | 2 | `logic/enemies/StandardBehavior.ts` |
| ORBIT | 2 | `logic/enemies/StandardBehavior.ts` |
| LASER_SPIN | 2 | `logic/enemies/StandardBehavior.ts` |
| SWARM | 1 | `logic/enemies/StandardBehavior.ts` |
| SPLIT | 1 | `logic/enemies/StandardBehavior.ts` |
| MIMIC | 1 | `logic/enemies/StandardBehavior.ts` |
| FREEZE_AURA | 1 | `logic/enemies/StandardBehavior.ts` |
| LEAVE_MINES | 1 | `logic/enemies/StandardBehavior.ts` |
| PHASE_DASH | 1 | `logic/enemies/StandardBehavior.ts` |
| CLEANSER | 1 | `logic/enemies/StandardBehavior.ts` |
| BLACK_HOLE_CAST | 1 | `logic/enemies/StandardBehavior.ts` |

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
