// Headless balance simulator (2A → 8B). Runs the real updateGame without a DOM/canvas with a
// bot at the controls, and writes one CSV row per wave to LIGHT/out/sim/<preset>.csv.
//
// Usage (from LIGHT/game):
//   npm run sim -- --tree=<preset> [--from=1] [--to=60] [--runs=3] [--seed=1] [--quiet]
//   presets: fresh | offense | defense | utility | offdef | full | budget:<matter>   (budget = cheapest-first buy)
//   --boss=<1..6>   boss TTK mode: start at that boss wave with full HP, report kill time only
//
// Bot: aims at the nearest enemy, moves away from the centroid of enemies within 420 px, stays in
// the boss arena / world, dashes on cooldown (toward the nearest enemy if it is within ramming range
// and the bot is healthy — that is how a fresh spark kills anything). HP / shield / regen / i-frames
// mirror SurvivalGame.handleDamage. The last damage source is tagged for the death-cause table.
import { build } from 'esbuild';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';

const here = path.dirname(fileURLToPath(import.meta.url));
const game = path.resolve(here, '..');
const outDir = path.resolve(game, '..', 'out', 'sim');
const args = Object.fromEntries(process.argv.slice(2).map(a => { const [k, v] = a.replace(/^--/, '').split('='); return [k, v ?? '1']; }));
// legacy positional form: node tools/sim.mjs <startWave> <seconds>
const PRESET = args.tree || 'fresh';
const FROM = Number(args.from || process.argv[2] && !process.argv[2].startsWith('--') && process.argv[2] || 1);
const TO = Number(args.to || 60);
const RUNS = Number(args.runs || 3);
const SEED = Number(args.seed || 1);
const QUIET = !!args.quiet;
const BOSS = args.boss ? Number(args.boss) : 0;
const GOD = !!args.god; // --god: damage is tallied but never kills (pure TTK / DPS measurement)
const DMG_BY = {};      // damage taken by source across all runs (death-cause table)

// Minimal browser shims so the game modules import cleanly.
globalThis.window = globalThis; globalThis.location = { search: '' };
globalThis.addEventListener = () => {}; globalThis.removeEventListener = () => {};
globalThis.performance ??= { now: () => Date.now() };

const entry = `
export { updateGame } from '${game}/components/game/Logic.ts';
export * as C from '${game}/components/game/Constants.ts';
export { ABILITY_TREE_DATA } from '${game}/data.ts';
export { onPlayerHurt } from '${game}/components/game/Feel.ts';
export { MATURITY_LEVELS } from '${game}/data/maturity.ts';
export { applyRunModifiers, incomingDamageMult } from '${game}/components/game/logic/RunStats.ts';
`;
const out = await build({ stdin: { contents: entry, resolveDir: game, loader: 'ts' }, bundle: true, write: false, format: 'esm', platform: 'node',
  external: ['react', 'react-dom', 'framer-motion', 'lucide-react'], logLevel: 'error' });
const M = await import('data:text/javascript;base64,' + Buffer.from(out.outputFiles[0].text).toString('base64'));
const C = M.C;

// ------------------------------------------------------------------ presets → unlocked ids
const TREE = M.ABILITY_TREE_DATA;
const byId = new Map(TREE.map(n => [n.id, n]));
const closure = (pred) => TREE.filter(n => n.id === 'root' || pred(n)).map(n => n.id);
const buyCheapest = (budget) => {
  const owned = new Set(['root']); let left = budget;
  for (;;) {
    const cand = TREE.filter(n => !owned.has(n.id) && !n.requiresBoss && n.parentIds.every(p => owned.has(p)) && n.cost <= left)
      .sort((a, b) => a.cost - b.cost)[0];
    if (!cand) break; owned.add(cand.id); left -= cand.cost;
  }
  return [...owned];
};
export const presetIds = (p) => {
  if (p === 'fresh') return ['root'];
  if (p === 'offense') return closure(n => n.type === 'OFFENSE');
  if (p === 'defense') return closure(n => n.type === 'DEFENSE');
  if (p === 'utility') return closure(n => n.type === 'UTILITY');
  if (p === 'offdef') return closure(n => n.type === 'OFFENSE' || n.type === 'DEFENSE');
  if (p === 'full') return TREE.map(n => n.id);
  if (p.startsWith('budget:')) return buyCheapest(Number(p.slice(7)));
  throw new Error('unknown preset ' + p);
};
const baseStats = () => ({ maxHealth: 3, healthRegen: 0, moveSpeed: 1, dashCooldown: 1, dashDuration: 0.01, pickupRange: 0, damageAura: 0,
  repulsionForce: 0, projectileCount: 0, attackSpeed: 1, essenceMultiplier: 1, fireBlastLevel: 0, iceNovaLevel: 0, thunderChainLevel: 0,
  homingMissileLevel: 0, fireflyLevel: 0, nebulaTrailLevel: 0, singularityLevel: 0, superDashLevel: 0, solarFlareLevel: 0, titanShieldLevel: 0,
  whiteHoleLevel: 0, luxBladesLevel: 0, repulsionFieldLevel: 0, plasmaWhipLevel: 0, lightBurstLevel: 0 });
const statsFor = (ids) => { // mirrors hooks/usePlayerStats.ts
  const s = baseStats();
  for (const id of ids) { const n = byId.get(id); if (n?.statEffect) for (const [k, v] of Object.entries(n.statEffect)) if (typeof v === 'number') s[k] = (s[k] ?? 0) + v; }
  s.projectileCount = Math.floor(s.projectileCount); s.maxHealth = Math.floor(s.maxHealth); return s;
};

// ------------------------------------------------------------------ deterministic Math.random
const mulberry = (a) => () => { a |= 0; a = a + 0x6d2b79f5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };

const maturityScale = (matter) => M.MATURITY_LEVELS[Math.min(M.MATURITY_LEVELS.length - 1, Math.floor(Math.sqrt(matter / 120)))].scale;

// ------------------------------------------------------------------ one run
function runOnce(preset, run, from, to) {
  Math.random = mulberry(SEED * 7919 + run * 104729 + from);
  const stats = statsFor(presetIds(preset));
  const input = { keys: {}, mouseX: 640, mouseY: 360, isMouseDown: false, virtualAim: { x: 0, y: 0 }, virtualAimActive: false, virtualMove: { x: 0, y: 0 }, virtualMoveActive: true };
  const state = { player: { x: 0, y: 0, vx: 0, vy: 0, size: 10, dashTimer: 0, dashCooldownTimer: 0, stationaryTimer: 0, fireBlastTimer: 0, iceNovaTimer: 0,
    thunderChainTimer: 0, homingMissileTimer: 0, fireflyTimer: 0, nebulaTrailTimer: 0, singularityTimer: 0, solarFlareTimer: 0, titanShieldTimer: 0,
    titanShieldDuration: 0, isTitanShieldActive: false }, enemies: [], projectiles: [], particles: [], drops: [], camera: { x: 0, y: 0 },
    mouse: { x: 640, y: 360 }, frame: 0, worldSize: C.WORLD_SIZE, seenEnemyIds: [], maxWaveReached: from, bossSpawnedWave: 0, waveKills: 0, waveStartedFrame: 0, totalKills: 0 };

  let wave = from, time = C.waveTimerSec(wave), essence = 0, hp = stats.maxHealth, shield = 0, regenAcc = 0, shieldAcc = 0, shieldCd = 0;
  let lastCause = '?', dead = null, won = false;
  const rows = []; let w = { start: 0, kills0: 0, dmg: 0, hpMin: hp, ess0: 0, bossStart: -1, bossTtk: '' };
  const tagCause = () => {
    const p = state.player;
    if (state.activeBoss && state.lastBossHit === state.activeBoss.def.id) {
      // touching an add during a boss fight still counts as the add
      let near = null, bd = 1e9; for (const e of state.enemies) { if (e.isBoss) continue; const d = Math.hypot(e.x - p.x, e.y - p.y) - e.size; if (d < bd) { bd = d; near = e; } }
      return near && bd < p.size + 6 ? near.def.id : 'boss:' + state.activeBoss.def.id;
    }
    let near = null, bd = 1e9; for (const e of state.enemies) { const d = Math.hypot(e.x - p.x, e.y - p.y) - e.size; if (d < bd) { bd = d; near = e; } }
    if (near && bd < p.size + 8) return near.def.id;
    if (state.arena) return 'void_burn';
    let pr = null, pd = 1e9; for (const q of state.projectiles) { if (!q.isEnemy) continue; const d = Math.hypot(q.x - p.x, q.y - p.y); if (d < pd) { pd = d; pr = q; } }
    if (pr && pd < 80) return 'shot:' + (pr.sourceId || pr.visualType || 'enemy');
    return near ? near.def.id + '(far)' : 'hazard';
  };
  const onDamage = (amount) => {
    if (dead || won) return;
    if (!M.onPlayerHurt(state)) return;
    let rem = Math.max(1, Math.round(amount * M.incomingDamageMult(state.runModifiers)));
    const abs = Math.min(shield, rem); shield -= abs; rem -= abs;
    if (rem > 0) { lastCause = tagCause(); DMG_BY[lastCause] = (DMG_BY[lastCause] || 0) + rem; w.dmg += rem; hp = Math.max(GOD ? 1 : 0, hp - rem); if (hp <= 0) dead = { wave, cause: lastCause }; }
    shieldCd = Math.max(1, 5 - stats.healthRegen * 0.5) * 60;
    w.hpMin = Math.min(w.hpMin, hp);
  };
  const endWave = () => {
    const sec = (state.frame - w.start) / 60;
    rows.push({ preset, run, wave, time_s: sec.toFixed(1), kills: state.totalKills - w.kills0, dmg_taken: w.dmg, hp_min: w.hpMin, hp_max: runStats().maxHealth,
      essence: Math.round(essence - w.ess0), essence_total: Math.round(essence), alive: state.enemies.length, boss_ttk: w.bossTtk, died: dead && dead.wave === wave ? dead.cause : '' });
  };
  const runStats = () => M.applyRunModifiers(stats, state.runModifiers);
  const advance = () => {
    endWave();
    if (wave >= to) { won = true; return; }
    wave++; state.enemies.forEach(e => { if (!e.isBoss) e.carried = true; }); state.waveKills = 0; state.waveStartedFrame = state.frame; time = C.waveTimerSec(wave);
    w = { start: state.frame, kills0: state.totalKills, dmg: 0, hpMin: hp, ess0: essence, bossStart: -1, bossTtk: '' };
  };

  const MAX_FRAMES = 60 * 60 * 90; // 90 min hard stop per run
  let secFrames = 0;
  while (!dead && !won && state.frame < MAX_FRAMES) {
    // ---------------- bot
    const p = state.player; let cx = 0, cy = 0, cn = 0, near = null, nd = 1e9;
    for (const e of state.enemies) {
      const d = Math.hypot(e.x - p.x, e.y - p.y);
      if (d < nd) { nd = d; near = e; }
      if (d < 420) { const wgt = (e.isBoss ? 4 : 1) / Math.max(40, d); cx += (e.x - p.x) * wgt; cy += (e.y - p.y) * wgt; cn += wgt; }
    }
    for (const q of state.projectiles) if (q.isEnemy) { const d = Math.hypot(q.x - p.x, q.y - p.y); if (d < 220) { const wgt = 2 / Math.max(30, d); cx += (q.x - p.x) * wgt; cy += (q.y - p.y) * wgt; cn += wgt; } }
    let mx = 0, my = 0;
    if (cn > 0) { mx = -cx; my = -cy; }
    // hunt: healthy + target is isolated (≤ 2 others within 140 px of it) → close in to ram it
    if (near && !near.isBoss && hp / runStats().maxHealth > 0.5) {
      let crowd = 0; for (const e of state.enemies) if (e !== near && Math.hypot(e.x - near.x, e.y - near.y) < 140) crowd++;
      if (crowd <= 2) { mx = (near.x - p.x) / nd; my = (near.y - p.y) / nd; }
    }
    // threat avoidance (a player reads telegraphs): push out of warn circles / lines / cones, hazards, lasers
    let threat = false;
    const away = (ux, uy, k) => { const l = Math.hypot(ux, uy) || 1; mx += ux / l * k; my += uy / l * k; threat = true; };
    const segPush = (x0, y0, ang, len, half) => { // distance to a ray; push perpendicular
      const ux = Math.cos(ang), uy = Math.sin(ang), rx = p.x - x0, ry = p.y - y0, t = rx * ux + ry * uy;
      if (t < -half || t > len + half) return; const px = rx - ux * t, py = ry - uy * t, d = Math.hypot(px, py);
      if (d < half + 40) away(d > 0.1 ? px : -uy, d > 0.1 ? py : ux, 6);
    };
    for (const t of state.telegraphs || []) {
      if (!t.active) continue; const pr = t.params, dx = p.x - t.x, dy = p.y - t.y, d = Math.hypot(dx, dy);
      if (t.kind === 'circle' && d < (pr.radius || 0) + 30) away(dx, dy, 6);
      else if (t.kind === 'ring' && d < (pr.radius || 0) + 20 && d > (pr.innerRadius || 0) - 20) away(-dx, -dy, 6);
      else if (t.kind === 'line') segPush(t.x, t.y, pr.angle || 0, pr.length || 2000, (pr.width || 30) / 2);
      else if (t.kind === 'cone' && d < (pr.radius || 0) + 30) { let da = Math.atan2(dy, dx) - (pr.angle || 0); da = Math.atan2(Math.sin(da), Math.cos(da)); if (Math.abs(da) < (pr.fov || 0.5) / 2 + 0.15) away(-Math.sin(pr.angle || 0) * Math.sign(da || 1), Math.cos(pr.angle || 0) * Math.sign(da || 1), 6); }
    }
    for (const h of state.hazards || []) {
      if (h.kind === 'beam') segPush(h.x - Math.cos(h.angle || 0) * 3000, h.y - Math.sin(h.angle || 0) * 3000, h.angle || 0, 6000, h.radius);
      else { const dx = p.x - h.x, dy = p.y - h.y, d = Math.hypot(dx, dy); if (d < h.radius + 30) away(dx, dy, 4); }
    }
    for (const L of state.lasers || []) segPush(L.x, L.y, L.angle, L.length, (L.half || 0.09) * Math.hypot(p.x - L.x, p.y - L.y) + 20);
    // orbit a little so the bot doesn't pin itself to a wall
    mx += -my * 0.35; my += mx * 0.35;
    const home = state.arena ? { x: state.arena.x, y: state.arena.y, r: state.arena.r * 0.7 } : { x: 0, y: 0, r: C.WORLD_SIZE * 0.35 };
    const hd = Math.hypot(p.x - home.x, p.y - home.y);
    if (hd > home.r) { const k = (hd - home.r) / 60; mx += (home.x - p.x) / hd * k; my += (home.y - p.y) / hd * k; }
    const ml = Math.hypot(mx, my);
    input.virtualMove.x = ml > 0.001 ? mx / ml : 0; input.virtualMove.y = ml > 0.001 ? my / ml : 0;
    if (near) { input.mouseX = 640 + (near.x - p.x); input.mouseY = 360 + (near.y - p.y); }
    // dash on cooldown: ram the nearest enemy when close + healthy, otherwise dash away
    input.isMouseDown = false;
    if (p.dashCooldownTimer <= 0 && near) {
      const ram = nd < 220 && (hp / runStats().maxHealth > 0.34 || stats.superDashLevel > 0) && !(near.isBoss && nd > 160);
      if (ram) { input.virtualMove.x = (near.x - p.x) / nd; input.virtualMove.y = (near.y - p.y) / nd; }
      input.isMouseDown = ram || nd < 120;
    }
    // ---------------- step
    const rs = runStats();
    M.updateGame(state, rs, input, wave, time, v => { essence += v; }, onDamage, () => {}, 1280, 720, maturityScale(essence), '#fff', false);
    if (state.healRequest) { hp = Math.min(rs.maxHealth, hp + Math.max(1, Math.round(rs.maxHealth * state.healRequest))); state.healRequest = undefined; }
    if (state.shieldRequest) { shield = Math.min(5, shield + Math.round(state.shieldRequest)); state.shieldRequest = undefined; }
    if (rs.healthRegen > 0 && hp < rs.maxHealth) { regenAcc += rs.healthRegen / 60; if (regenAcc >= 1) { hp = Math.min(rs.maxHealth, hp + 1); regenAcc -= 1; } }
    const maxSh = Math.min(5, Math.max(0, Math.floor((maturityScale(essence) - 1) * 2.5)));
    if (shieldCd > 0) shieldCd--; else if (shield < maxSh) { shieldAcc += (0.5 + rs.healthRegen * 0.2) / 60; if (shieldAcc >= 1) { shield++; shieldAcc -= 1; } }
    if (state.activeBoss && w.bossStart < 0) w.bossStart = state.frame;
    // ---------------- wave clock (1 Hz like SurvivalGame)
    if (++secFrames >= 60) {
      secFrames = 0;
      if (!state.activeBoss && state.bossKilledWave === undefined && !C.isBossWave(wave)) {
        if (state.waveKills >= C.waveKillQuota(wave)) advance(); else if (--time <= 0) advance();
      }
      if (state.activeBoss && (state.frame - w.bossStart) / 60 > C.BOSS_ENRAGE_SEC * 2) { dead = { wave, cause: 'boss_timeout:' + state.activeBoss.def.id }; }
    }
    if (state.bossKilledWave !== undefined) { w.bossTtk = ((state.frame - w.bossStart) / 60).toFixed(1); state.bossKilledWave = undefined; state.activeBoss = undefined; advance(); }
  }
  if (dead || (!won && state.frame >= MAX_FRAMES)) { if (!dead) dead = { wave, cause: 'sim_timeout' }; endWave(); }
  return { rows, dead, won, wave, essence: Math.round(essence), frames: state.frame };
}

// ------------------------------------------------------------------ main
fs.mkdirSync(outDir, { recursive: true });
const tag = PRESET.replace(/[:]/g, '_') + (BOSS ? `_boss${BOSS}` : '') + (GOD ? '_god' : '');
const from = BOSS ? BOSS * C.WAVES_PER_CHAPTER : FROM, to = BOSS ? BOSS * C.WAVES_PER_CHAPTER : TO;
const all = [], summary = [];
const t0 = Date.now();
for (let r = 1; r <= RUNS; r++) {
  const res = runOnce(PRESET, r, from, to);
  all.push(...res.rows);
  summary.push(res);
  if (!QUIET) console.log(`run ${r}: ${res.won ? 'WON' : 'died'} wave=${res.wave} cause=${res.dead?.cause ?? '-'} essence=${res.essence} simTime=${(res.frames / 60).toFixed(0)}s` + (BOSS ? ` ttk=${res.rows[0]?.boss_ttk || '-'}` : ''));
}
const cols = ['preset', 'run', 'wave', 'time_s', 'kills', 'dmg_taken', 'hp_min', 'hp_max', 'essence', 'essence_total', 'alive', 'boss_ttk', 'died'];
fs.writeFileSync(path.join(outDir, tag + '.csv'), [cols.join(','), ...all.map(r => cols.map(c => r[c]).join(','))].join('\n') + '\n');
const waves = summary.map(s => s.wave).sort((a, b) => a - b);
const median = waves[Math.floor(waves.length / 2)];
const causes = {}; summary.forEach(s => { if (s.dead) causes[s.dead.cause] = (causes[s.dead.cause] || 0) + 1; });
const avgEss = Math.round(summary.reduce((a, s) => a + s.essence, 0) / summary.length);
const ttks = BOSS ? summary.map(s => s.rows[0]?.boss_ttk).filter(Boolean) : [];
const dmgTop = Object.entries(DMG_BY).sort((a, b) => b[1] - a[1]).slice(0, 6);
const line = { preset: PRESET, god: GOD || undefined, dmgTop, boss: BOSS || undefined, runs: RUNS, from, to, medianWave: median, waves, wins: summary.filter(s => s.won).length, avgEssence: avgEss, causes, ttks, wallSec: ((Date.now() - t0) / 1000).toFixed(0) };
fs.appendFileSync(path.join(outDir, 'summary.jsonl'), JSON.stringify(line) + '\n');
console.log('SUMMARY ' + JSON.stringify(line));
