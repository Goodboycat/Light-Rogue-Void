// (8A) Save migration tests — plain node, no framework. Usage: npm run test:save
// Bundles save/migrate.ts + save/codec.ts with esbuild (same trick as dump-tree.mjs) and runs the 3 fixtures.
import { build } from 'esbuild';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const here = path.dirname(fileURLToPath(import.meta.url));
const game = path.resolve(here, '..');

const load = async (entry) => {
  const out = await build({
    entryPoints: [path.join(game, entry)],
    bundle: true, write: false, format: 'esm', platform: 'node',
    external: ['react', 'react-dom', 'framer-motion', 'lucide-react'],
  });
  return import('data:text/javascript;base64,' + Buffer.from(out.outputFiles[0].text).toString('base64'));
};
const M = await load('save/migrate.ts');
const S = await load('save/schema.ts');
let C = null;
try { C = await load('save/codec.ts'); } catch { /* step 3 not there yet */ }

const fixture = (n) => JSON.parse(readFileSync(path.join(here, 'fixtures', n), 'utf8'));
const nodeExists = (id) => id === 'root' || /^n_\d+$/.test(id); // stand-in for data.ts getNode (seeded ids)

let fails = 0, passes = 0;
const eq = (name, got, want) => {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  if (ok) passes++; else { fails++; console.error(`  FAIL ${name}\n    got  ${JSON.stringify(got)}\n    want ${JSON.stringify(want)}`); }
};
const ok = (name, cond) => eq(name, !!cond, true);

// ---- v0 ----
{
  const { save, report } = M.migrateSave(fixture('save_v0.json'), nodeExists);
  console.log('v0 →', report.steps.join(' | '));
  eq('v0 detect', report.from, 0);
  eq('v0 version', save.version, S.SAVE_VERSION);
  eq('v0 inputMode MOBILE → touch', [save.settings.showTouchControls, save.settings.mouseMovementEnabled], [true, false]);
  eq('v0 tree dropped 2 legacy ids', report.droppedNodes, 2);
  eq('v0 refund 40', save.matter, 1500 + 40);
  eq('v0 tree ids', save.unlockedAbilityIds, ['root']);
  eq('v0 bosses kept', save.defeatedBosses, ['hive_mind', 'void_warden']);
  eq('v0 achievements kept', save.unlockedAchievementIds, ['kill_boss_1']);
  eq('v0 maxWave', save.maxWaveReached, 23);
  eq('v0 stats seeded bestWaveByChapter', save.stats.bestWaveByChapter, [10, 20, 23, 0, 0, 0]);
  eq('v0 stats bossKills', save.stats.bossKills, { hive_mind: 1, void_warden: 1 });
  eq('v0 settings defaults filled', [save.settings.performanceMode, save.settings.haptics, save.settings.masterVolume], ['AUTO', 'LIGHT', 0.5]);
  eq('v0 all fields present', Object.keys(save).sort(), Object.keys(S.SAVE_FIELDS).sort());
}
// ---- v1 ----
{
  const fx = fixture('save_v1.json');
  const { save, report } = M.migrateSave(fx, nodeExists);
  console.log('v1 →', report.steps.join(' | '));
  eq('v1 detect', report.from, 1);
  eq('v1 nothing dropped', report.droppedNodes, 0);
  eq('v1 matter untouched', save.matter, 48210);
  for (const k of ['seenEnemyIds', 'unlockedAchievementIds', 'defeatedBosses', 'landmarksSeen', 'killCounts', 'mapTreasuresOpened', 'mapRevealsSeen', 'settings'])
    eq(`v1 ${k} preserved`, save[k], fx[k]);
  eq('v1 kills seeded from killCounts', save.stats.kills, 812 + 240 + 2 + 1 + 1);
  eq('v1 bossKills from killCounts', save.stats.bossKills, { hive_mind: 2, void_warden: 1, crimson_eclipse: 1 });
  eq('v1 landmarks discoveries', save.stats.discoveries.landmarks, 2);
  eq('v1 bestWaveByChapter', save.stats.bestWaveByChapter, [10, 20, 30, 34, 0, 0]);
}
// ---- v2 ----
{
  const fx = fixture('save_v2.json');
  const { save, report } = M.migrateSave(fx, nodeExists);
  eq('v2 detect', report.from, 2);
  eq('v2 stats preserved (+holes filled)', save.stats, { ...fx.stats, bestWaveByChapter: [10, 12, 0, 0, 0, 0] });
  eq('v2 settings preserved', save.settings, fx.settings);
  eq('v2 savedAt preserved', save.savedAt, fx.savedAt);
  // idempotent
  const again = M.migrateSave(save, nodeExists).save;
  eq('v2 migrate is idempotent', again, save);
}
// ---- garbage ----
{
  eq('garbage string → default', M.migrateSave('nope', nodeExists).save, S.defaultSave());
  eq('null → default', M.migrateSave(null, nodeExists).save, S.defaultSave());
  const weird = M.migrateSave({ version: 2, matter: 'lots', unlockedAbilityIds: 5, settings: { masterVolume: 'loud' } }, nodeExists).save;
  eq('bad types → defaults', [weird.matter, weird.unlockedAbilityIds, weird.settings.masterVolume], [0, ['root'], 0.8]);
  const future = M.migrateSave({ version: 9, matter: 7 }, nodeExists);
  eq('future version keeps matter', future.save.matter, 7);
}
// ---- codec (step 3) ----
if (C) {
  const { save } = M.migrateSave(fixture('save_v2.json'), nodeExists);
  const code = C.encodeSave(save);
  ok('code is base64url', /^[A-Za-z0-9_-]+$/.test(code));
  const dec = C.decodeSave(code, nodeExists);
  ok('decode ok', dec.ok);
  eq('export→import round trip exact', dec.ok && dec.save, save);
  const bad = C.decodeSave(code.slice(0, -4) + 'AAAA', nodeExists);
  ok('tampered code rejected', !bad.ok);
  ok('garbage rejected', !C.decodeSave('hello world', nodeExists).ok);
  eq('crc32 known vector', C.crc32('123456789') >>> 0, 0xCBF43926);
}

console.log(`\nsave tests: ${passes} passed, ${fails} failed`);
process.exit(fails ? 1 : 0);
