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
const W = await load('save/storage.ts');
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
// ---- write-safety (step 2) ----
{
  const mkStorage = (failAfterBytes = Infinity) => {
    const m = new Map(); let used = 0;
    return {
      map: m,
      getItem: (k) => (m.has(k) ? m.get(k) : null),
      setItem: (k, v) => {
        const next = used - (m.get(k)?.length ?? 0) + v.length;
        if (next > failAfterBytes) { const e = new Error('quota'); e.name = 'QuotaExceededError'; throw e; }
        used = next; m.set(k, v);
      },
      removeItem: (k) => { used -= m.get(k)?.length ?? 0; m.delete(k); },
    };
  };
  // fake timers
  let now = 0; const q = [];
  const timers = { set: (fn, ms) => { const h = { fn, at: now + ms }; q.push(h); return h; }, clear: (h) => { const i = q.indexOf(h); if (i >= 0) q.splice(i, 1); } };
  const tick = (ms) => { now += ms; for (const h of q.splice(0).filter(h => h.at <= now)) h.fn(); q.push(...q.splice(0)); };
  const advance = (ms) => { const end = now + ms; while (q.length && Math.min(...q.map(h => h.at)) <= end) { const h = q.reduce((a, b) => a.at <= b.at ? a : b); q.splice(q.indexOf(h), 1); now = h.at; h.fn(); } now = end; };

  const st = mkStorage();
  const w = W.createSaveWriter(st, timers);
  const D1 = Date.UTC(2026, 9, 28, 12), D2 = Date.UTC(2026, 9, 29, 12);
  for (let i = 0; i < 20; i++) { w.schedule(JSON.stringify({ savedAt: D1, i }), D1); advance(100); }
  eq('debounce: 20 schedules in 2 s → 0 writes while active', w.writes, 0);
  advance(500);
  eq('debounce: one write after 500 ms idle', w.writes, 1);
  eq('debounce: last blob wins', JSON.parse(st.getItem(S.SAVE_KEY)).i, 19);
  eq('no backup on first write', st.getItem(S.SAVE_BACKUP_KEY), null);
  // same day → no rotation
  w.schedule(JSON.stringify({ savedAt: D1 + 3600e3, i: 20 }), D1 + 3600e3); advance(600);
  eq('same day: backup not rotated', st.getItem(S.SAVE_BACKUP_KEY), null);
  // next day → previous blob copied to backup
  w.schedule(JSON.stringify({ savedAt: D2, i: 21 }), D2); advance(600);
  eq('next day: backup = previous-day blob', JSON.parse(st.getItem(S.SAVE_BACKUP_KEY)).i, 20);
  eq('next day: main = new blob', JSON.parse(st.getItem(S.SAVE_KEY)).i, 21);
  // flush writes pending immediately
  w.schedule(JSON.stringify({ savedAt: D2, i: 22 }), D2);
  ok('pending before flush', w.pending);
  const fr = w.flush();
  eq('flush writes now', [fr.ok, JSON.parse(st.getItem(S.SAVE_KEY)).i, w.pending], [true, 22, false]);
  eq('flush with nothing pending → null', w.flush(), null);
  // cancel drops pending
  w.schedule('{"i":99}', D2); w.cancel(); advance(600);
  eq('cancel: nothing written', JSON.parse(st.getItem(S.SAVE_KEY)).i, 22);
  // quota: retry after dropping backup
  const small = mkStorage(160);
  small.setItem(S.SAVE_KEY, JSON.stringify({ savedAt: D1, pad: 'x'.repeat(40) }));
  const r1 = W.writeSaveNow(small, JSON.stringify({ savedAt: D2, pad: 'y'.repeat(40) }), D2);
  ok('quota: rotated backup first', r1.rotatedBackup);
  const r2 = W.writeSaveNow(small, JSON.stringify({ savedAt: D2, pad: 'z'.repeat(60) }), D2);
  eq('quota: retried after dropping backup and succeeded', [r2.ok, r2.retried, small.getItem(S.SAVE_BACKUP_KEY)], [true, true, null]);
  const r3 = W.writeSaveNow(small, 'q'.repeat(500), D2);
  eq('quota: hard fail reported, no throw', [r3.ok, r3.error, W.lastSaveError?.kind], [false, 'quota', 'quota']);
  const r4 = W.writeSaveNow(null, '{}', D2);
  eq('no storage: unavailable, no throw', [r4.ok, r4.error], [false, 'unavailable']);
  ok('isQuotaError code 22', W.isQuotaError({ code: 22 }));
  ok('isDifferentDay false for 0', !W.isDifferentDay(0, D2));
  eq('peekSavedAt', W.peekSavedAt('{"matter":1,"savedAt": 1234,"x":2}'), 1234);
}
// ---- codec (step 3) ----
if (C) {
  const { save } = M.migrateSave(fixture('save_v2.json'), nodeExists);
  const code = C.encodeSave(save);
  ok('code is LIGHT1. + base64url', /^LIGHT1\.[A-Za-z0-9_-]+$/.test(code));
  eq('code without prefix still decodes', C.decodeSave(code.slice(7), nodeExists).ok && C.decodeSave(code.slice(7), nodeExists).save, save);
  eq('code with whitespace/newlines decodes', C.decodeSave(code.replace(/(.{40})/g, '$1\n  '), nodeExists).ok, true);
  eq('raw JSON paste decodes', C.decodeSave(JSON.stringify(fixture('save_v1.json')), nodeExists).ok, true);
  eq('future version refused', C.decodeSave(C.encodeSave({ ...save, version: 9 }), nodeExists).ok, false);
  eq('v0 fixture encoded → decodes through migration', C.decodeSave(C.encodeSave(fixture('save_v0.json')), nodeExists).save?.matter, 1540);
  ok('file name', /^light-save-\d{4}-\d{2}-\d{2}-w\d+\.light$/.test(C.saveFileName(save)));
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
