// Tree cost curve (8B step 4). Answers: how many runs to fill the Offense arc / each arc / the whole tree?
// Usage (from LIGHT/game): node tools/tree-cost.mjs [--order=cheapest|offense] [--json]
// Inputs: ABILITY_TREE_DATA (costs) + measured essence-per-run vs owned budget, read from
// LIGHT/out/sim/summary.jsonl (rows from `npm run sim -- --tree=budget:N`, latest per N); falls back to the
// table below (8B measurements, 3 runs each, bot) when the file is missing.
// Model: start with 0 matter; each run earns essence(owned) (log-linear interpolation on owned matter);
// spend greedily on the cheapest buyable node (or Offense-first); constellation nodes are counted as
// bought once their boss is beaten (assumed beaten when median wave passes 10*(boss#)).
import { build } from 'esbuild';
import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url)), g = path.resolve(here, '..');
const args = Object.fromEntries(process.argv.slice(2).map(a => { const [k, v] = a.replace(/^--/, '').split('='); return [k, v ?? '1']; }));
const o = await build({ stdin: { contents: `export {ABILITY_TREE_DATA} from '${g}/data.ts'`, resolveDir: g, loader: 'ts' }, bundle: true, write: false, format: 'esm', platform: 'node', logLevel: 'error' });
const { ABILITY_TREE_DATA: T } = await import('data:text/javascript;base64,' + Buffer.from(o.outputFiles[0].text).toString('base64'));

// ---- measured curve: owned matter → [avg essence per run, median wave]
// 1M/3M/10M re-measured in 9A after the 8B Crimson Eclipse laser patch (3 runs each; 3M = 2/3 died to void_warden at w20, noisy)
let CURVE = [[0, 19, 3], [500, 177, 9], [2000, 613, 10], [8000, 2537, 10], [30000, 18641, 19], [100000, 45843, 20], [300000, 93432, 30],
  [1000000, 171253, 30], [3000000, 113598, 20], [10000000, 234033, 30], [30000000, 214184, 30], [78000000, 249419, 30]];
const sumFile = path.resolve(g, '..', 'out', 'sim', 'summary.jsonl');
if (fs.existsSync(sumFile)) {
  const m = new Map();
  for (const l of fs.readFileSync(sumFile, 'utf8').split('\n')) { if (!l.trim()) continue; const r = JSON.parse(l);
    const b = /^budget:(\d+)$/.exec(r.preset); if (b && !r.boss && !r.god && r.from === 1) m.set(+b[1], [+b[1], r.avgEssence, r.medianWave]); }
  if (m.size >= 4) CURVE = [...m.values()].sort((a, b) => a[0] - b[0]);
}
const interp = (x, col) => { if (x <= CURVE[0][0]) return CURVE[0][col];
  for (let i = 1; i < CURVE.length; i++) if (x <= CURVE[i][0]) { const [a, b] = [CURVE[i - 1], CURVE[i]];
    const t = (Math.log1p(x) - Math.log1p(a[0])) / (Math.log1p(b[0]) - Math.log1p(a[0])); return a[col] + t * (b[col] - a[col]); }
  return CURVE.at(-1)[col]; };

// ---- static cost table per arc and depth band
const arcOf = n => n.requiresBoss ? 'CONST' : n.type;
const depthOf = n => { const m = /_(\d+)(?:_\d+)?$/.exec(n.id); return m ? +m[1] : 0; };
const bands = {}; for (const n of T) { const a = arcOf(n), d = Math.floor(depthOf(n) / 10) * 10; (bands[a] ??= {})[d] = ((bands[a] ??= {})[d] || 0) + n.cost; }
const arcTotal = {}; for (const n of T) arcTotal[arcOf(n)] = (arcTotal[arcOf(n)] || 0) + n.cost;

// ---- progression model
const order = args.order || 'cheapest';
const owned = new Set(T.filter(n => n.cost === 0).map(n => n.id)); let bank = 0, spent = 0, runs = 0;
const milestones = {}; const mark = (k) => { if (!(k in milestones)) milestones[k] = runs; };
const spentArc = {}; const log = [];
while (owned.size < T.length && runs < 5000) {
  runs++; const wave = interp(spent, 2); bank += interp(spent, 1);
  const bossesBeaten = Math.floor((wave - 1) / 10);
  for (;;) {
    const cand = T.filter(n => !owned.has(n.id) && n.parentIds.every(p => owned.has(p)) && n.cost <= bank)
      .filter(n => !n.requiresBoss || bossIndex(n) < bossesBeaten);
    if (!cand.length) break;
    cand.sort((a, b) => (order === 'offense' ? (arcOf(a) !== 'OFFENSE') - (arcOf(b) !== 'OFFENSE') : 0) || a.cost - b.cost);
    const n = cand[0]; owned.add(n.id); bank -= n.cost; spent += n.cost; spentArc[arcOf(n)] = (spentArc[arcOf(n)] || 0) + n.cost;
  }
  for (const a of Object.keys(arcTotal)) if ((spentArc[a] || 0) >= arcTotal[a]) mark(a + '_full');
  for (const f of [0.25, 0.5, 0.75]) if (spent >= f * 77711631) mark('tree_' + f * 100 + '%');
  if ([1, 5, 10, 20, 50, 100, 200, 300].includes(runs)) log.push({ runs, spent, wave: Math.round(wave), essPerRun: Math.round(interp(spent, 1)), nodes: owned.size });
}
function bossIndex(n) { const ids = [...new Set(T.filter(x => x.requiresBoss).map(x => x.requiresBoss))]; return ids.indexOf(n.requiresBoss); }
if (owned.size >= T.length) mark('tree_full');
const res = { order, nodes: T.length, total: T.reduce((a, n) => a + n.cost, 0), arcTotal, bands, curve: CURVE, milestones, log, stuckAt: owned.size < T.length ? owned.size : undefined };
if (args.json) console.log(JSON.stringify(res)); else {
  console.log(`tree: ${res.nodes} nodes, ${res.total.toLocaleString()} matter`); console.log('arc totals', arcTotal);
  console.log('cost by depth band (matter):'); for (const [a, b] of Object.entries(bands)) console.log(' ', a, JSON.stringify(b));
  console.log(`progression (${order}-first):`); for (const r of log) console.log(`  run ${r.runs}: spent ${r.spent.toLocaleString()} nodes ${r.nodes} wave ~${r.wave} ess/run ${r.essPerRun.toLocaleString()}`);
  console.log('runs to milestone', milestones); if (res.stuckAt) console.log('NOT FULL after 5000 runs, nodes', res.stuckAt);
}
