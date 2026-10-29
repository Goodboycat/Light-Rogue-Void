# SAVE — schema, migrations, transfer codes (8A)

Everything lives under `LIGHT/game/save/`. Pure modules (no React, no DOM) so `npm run test:save` (`tools/test-save.mjs`, plain node, 67 checks) exercises the whole chain with the fixtures in `tools/fixtures/save_v0|v1|v2.json`.

| File | Role |
|---|---|
| `schema.ts` | `SAVE_VERSION = 2`, `SaveV2`, `LifetimeStats`, `DEFAULT_SETTINGS`, `defaultSave()`, `defaultStats()` |
| `migrate.ts` | `detectVersion(raw)`, `migrateSave(raw, nodeExists)` → `{ save, report }` — chain v0 → v1 → v2, then `normalizeV2` |
| `storage.ts` | debounced writer (500 ms), flush on `pagehide` / `visibilitychange` / `beforeunload`, quota handling, `light_save_backup` rotation |
| `codec.ts` | `LIGHT1.` transfer code ↔ `SaveV2` (base64url + crc32), `.light` file name, decode errors |
| `stats.ts` | lifetime reducers: `recordRunStart / recordBossKill / recordMatter / recordRunEnd`, `mergeBestWaves`, `ensureStats` |
| `../hooks/useGameSave.ts` | React glue: `loadSave` (migrate + backup fallback), `saveToState` / `stateToSave`, `exportCode`, `previewImport`, `applyImport`, `resetSave` |

## localStorage keys
| Key | Content |
|---|---|
| `light_save` | current `SaveV2` JSON |
| `light_save_backup` | the previous save, rotated when the day of `savedAt` changes (so it is "yesterday or older"). Dropped first on quota errors; read when `light_save` is corrupt |

## Schema v2 (`SaveV2`)
| Field | Type | Since | Default | Notes |
|---|---|---|---|---|
| `version` | `2` | 8A | 2 | absent in v0/v1 |
| `savedAt` | number | 8A | `Date.now()` | write time, drives the backup rotation |
| `matter` | number | 0 | 0 | currency; achievement rewards add to it |
| `unlockedAbilityIds` | string[] | 0 | `['spark']` | seeded tree ids (1B). Unknown ids are dropped and refunded (`LEGACY_REFUND_PER_NODE = 20`, `TreeMigrationReport`) |
| `seenEnemyIds` | string[] | 0 | [] | archive unlocks |
| `unlockedAchievementIds` | string[] | 0 | [] | v1 ids kept in v2 (`data/achievements.ts`) |
| `defeatedBosses` | string[] | 0 | [] | boss ids |
| `maxWaveReached` | number | 0 | 1 | gates chapter cards / world map |
| `maxMaturityAchieved` | number | 0 | 0 | |
| `hasSeenIntro` | boolean | 0 | false | |
| `endingSeen` | boolean | 2D | false | |
| `landmarksSeen` | string[] | 3A | [] | |
| `killCounts` | Record<id, n> | 3B | {} | bestiary field notes at 10 kills |
| `mapTreasuresOpened` | string[] | 7C | [] | |
| `mapRevealsSeen` | string[] | 7D | [] | |
| `stats` | `LifetimeStats` | 8A | `defaultStats()` | see below |
| `settings` | `Required<Settings>` | 0 | `DEFAULT_SETTINGS` | every key filled; v0 `inputMode` → `showTouchControls` |

### `LifetimeStats` (8A step 4)
| Field | Written by |
|---|---|
| `runs` | `recordRunStart` — `App.handleStartGame` / `handleRestart` |
| `deaths`, `wins` | `recordRunEnd` outcome (`SurvivalGame.sendRunEnd`: death / win / abandon, exactly once per run) |
| `kills` | run summary kills at run end |
| `bossKills[bossId]` | `recordBossKill` in `App.handleBossDefeated` (immediately, survives a tab close) |
| `deathsByBoss[bossId]` | run end with outcome death while `state.lastBossHit === activeBoss.id` |
| `bestWaveByChapter[6]` | `mergeBestWaves(start, furthest)` — only chapters the run actually passed through |
| `totalMatter` | `recordMatter` on pickup (`onCollectMatter`), map treasure, achievement reward. Spending never reduces it |
| `totalEssence`, `discoveries{relics,shrines,landmarks,events}`, `bestStreak`, `burstsFired`, `playTimeMs` | run end report |
| `feats[<bossId>:<feat>]` | `logic/BossFeats.ts`: `flawless` (0 hits), `fast` (≤ 60 s), `enraged` (killed after `BOSS_ENRAGE_SEC`), `crimson_eclipse:no_laser`, `entropy_titan:no_rock`. Flags reset in `openArena`, read in `KillLogic` boss death, drained via `state.featQueue` → `onFeats` → `pendingFeatsRef` → `recordBossKill` |

Shown in **Archives → RECORDS** (`components/Archives.tsx` `RecordsPanel`). Achievements v2 (`data/achievements.ts`) read `stats` through `ensureStats(state.stats)`.

## Migration chain (`migrate.ts`)
- **detect**: `version === 2` → v2; `settings.inputMode` present or ability ids not matching the seeded tree → v0; otherwise v1.
- **v0 → v1**: `inputMode: 'touch'|'mouse'` → `showTouchControls`; drop fields that no longer exist; log lines in `report.log`.
- **v1 → v2**: add `version`, `savedAt`, `stats: defaultStats()`, fill every optional 2A–7D field with its default, fill `settings` from `DEFAULT_SETTINGS`, drop unknown tree ids (`nodeExists`) and refund matter (`report.droppedNodes`, `report.refunded`).
- **normalizeV2**: runs on every load (even v2) — coerces types, clamps numbers, removes duplicates, `ensureStats`, never throws.
- A **future version** (`version > 2`) is refused (`future_version`) by both the loader and the importer; the loader then tries `light_save_backup`, then starts fresh with the bad blob left in place for a later build.

### Adding a field (recipe for later chats)
1. Add it to `SaveV2` + `defaultSave()` in `schema.ts`. If it is optional and additive, **do not bump `SAVE_VERSION`** — `normalizeV2` fills defaults.
2. Bump to v3 only when a field changes meaning/shape; add `migrateV2toV3` in the chain, a `tools/fixtures/save_v3.json`, and checks in `tools/test-save.mjs`.
3. Map it in `saveToState` / `stateToSave` (`hooks/useGameSave.ts`).
4. `npm run test:save && npm run typecheck`.

## Transfer code (`codec.ts`, step 3)
```
"LIGHT1." + base64url( utf8(JSON(save)) ‖ crc32_be )
```
- The `LIGHT1` digit is the **codec** version, independent of `SAVE_VERSION`; the JSON carries `version`, so an old code imports through `migrateSave` like an old blob.
- Decoder accepts: with or without the prefix, whitespace/newlines inside, or a raw JSON paste. Errors: `empty | not_a_code | bad_base64 | too_short | crc_mismatch | bad_json | bad_shape | future_version` (`describeDecodeError` for the UI).
- `.light` file = the same text; `saveFileName(save)` → `light-save-<YYYY-MM-DD>-w<maxWave>.light`.
- UI: Settings → **SAVE TRANSFER** (`components/SaveTransfer.tsx`): SHOW / COPY CODE, download file, paste or drop a file → `previewImport` (summary + migration report) → CONFIRM OVERWRITE → `applyImport` (writes immediately, the replaced save goes to `light_save_backup`).

## Write safety (`storage.ts`, step 2)
- `createSaveWriter(key)` — `schedule(save)` debounces 500 ms; `flush()` writes now; wired to `pagehide`, `visibilitychange: hidden`, `beforeunload`.
- Quota (`QuotaExceededError` / code 22 / 1014): drop `light_save_backup` and retry once; on a second failure `lastSaveError` is set (`{kind:'quota'|'unavailable'|'unknown', at, message}`) and the game keeps running on the in-memory state.
- `resetSave()` cancels pending writes and clears both keys.

## Acceptance (8A)
- Fixtures v0/v1/v2 load with no loss (`npm run test:save`: 67 passed).
- export → wipe → import restores the same `SaveV2` (codec round-trip checks in the same suite).
- `npm run typecheck` 0 errors, `npm run build` green, itch zip builds (`bash tools/itch.sh`).
