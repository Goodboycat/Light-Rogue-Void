// Headless wave-flow simulator (2A). Runs updateGame without a DOM/canvas and
// prints per-second wave / kills / alive counts so balance can be checked
// without a browser. Usage (from LIGHT/game):
//   node tools/sim.mjs [startWave=1] [seconds=60] [damageMult=1]
// 8B will grow this into the full balance sim (`npm run sim`).
import { build } from 'esbuild';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const here = path.dirname(fileURLToPath(import.meta.url));
const game = path.resolve(here, '..');
const startWave = Number(process.argv[2] || 1);
const seconds = Number(process.argv[3] || 60);
const dmgMult = Number(process.argv[4] || 1);

// Minimal browser shims so the game modules import cleanly.
globalThis.window = globalThis; globalThis.location = { search: '' };
globalThis.addEventListener = () => {}; globalThis.removeEventListener = () => {};
globalThis.performance ??= { now: () => Date.now() };

const entry = `
export { updateGame } from '${game}/components/game/Logic.ts';
export { waveKillQuota, waveTimerSec, maxAlive, MAX_WAVE } from '${game}/components/game/Constants.ts';
`;
const out = await build({ stdin: { contents: entry, resolveDir: game, loader: 'ts' }, bundle: true, write: false, format: 'esm', platform: 'node',
  external: ['react', 'react-dom', 'framer-motion', 'lucide-react'] });
const M = await import('data:text/javascript;base64,' + Buffer.from(out.outputFiles[0].text).toString('base64'));

const stats = { maxHealth: 3, healthRegen: 0, moveSpeed: 1, dashCooldown: 1, dashDuration: 0.01, pickupRange: 0, damageAura: 0,
  repulsionForce: 0, projectileCount: 0, attackSpeed: 1, essenceMultiplier: 1, fireBlastLevel: 0, iceNovaLevel: 0, thunderChainLevel: 0,
  homingMissileLevel: 0, fireflyLevel: 0, nebulaTrailLevel: 0, singularityLevel: 0, superDashLevel: 0, solarFlareLevel: 0, titanShieldLevel: 0,
  whiteHoleLevel: 0, luxBladesLevel: 0, repulsionFieldLevel: 0, plasmaWhipLevel: 0 };
const input = { keys: {}, mouseX: 640, mouseY: 360, isMouseDown: true, virtualAim: { x: 0, y: 0 }, virtualAimActive: false, virtualMove: { x: 0, y: 0 }, virtualMoveActive: false };
const state = { player: { x: 0, y: 0, vx: 0, vy: 0, size: 10, dashTimer: 0, dashCooldownTimer: 0, stationaryTimer: 0, fireBlastTimer: 0, iceNovaTimer: 0,
  thunderChainTimer: 0, homingMissileTimer: 0, fireflyTimer: 0, nebulaTrailTimer: 0, singularityTimer: 0, solarFlareTimer: 0, titanShieldTimer: 0,
  titanShieldDuration: 0, isTitanShieldActive: false }, enemies: [], projectiles: [], particles: [], drops: [], camera: { x: 0, y: 0 },
  mouse: { x: 640, y: 360 }, frame: 0, worldSize: 3500, seenEnemyIds: [], maxWaveReached: startWave, bossSpawnedWave: 0, waveKills: 0, waveStartedFrame: 0, totalKills: 0 };

let wave = startWave, time = M.waveTimerSec(wave), collected = 0, dmgTaken = 0, maxAliveSeen = 0, maxFrameMs = 0, sumFrameMs = 0, frames = 0;
const advance = () => { wave++; state.enemies.forEach(e => { if (!e.isBoss) e.carried = true; }); state.waveKills = 0; state.waveStartedFrame = state.frame; time = M.waveTimerSec(wave); console.log(`--- WAVE ${wave} quota=${M.waveKillQuota(wave)} timer=${time}s cap=${M.maxAlive(wave)}`); };
console.log(`--- WAVE ${wave} quota=${M.waveKillQuota(wave)} timer=${time}s cap=${M.maxAlive(wave)}`);

for (let sec = 0; sec < seconds; sec++) {
  for (let f = 0; f < 60; f++) {
    const t0 = performance.now();
    M.updateGame(state, stats, input, wave, time, v => { collected += v; }, d => { dmgTaken += d; }, () => {}, 1280, 720, 1, '#fff', false);
    // Stand-in for player shooting: `dmgMult` HP/frame to the nearest enemy (the real auto-shot needs canvas input).
    if (state.enemies.length && dmgMult > 0) { let n = null, bd = 1e9; for (const e of state.enemies) { const d = Math.hypot(e.x - state.player.x, e.y - state.player.y); if (d < bd) { bd = d; n = e; } } if (n && bd < 600) n.hp -= 2 * dmgMult; }
    const dt = performance.now() - t0; maxFrameMs = Math.max(maxFrameMs, dt); sumFrameMs += dt; frames++;
    // player heal-cheat so the sim doesn't "die": we only measure flow here
  }
  maxAliveSeen = Math.max(maxAliveSeen, state.enemies.length);
  if (!state.activeBoss && state.bossKilledWave === undefined) {
    if (state.waveKills >= M.waveKillQuota(wave)) advance(); else if (--time <= 0) advance();
  }
  if (state.bossKilledWave !== undefined) { state.bossKilledWave = undefined; advance(); }
  if (sec % 5 === 0 || state.activeBoss) console.log(`t+${String(sec).padStart(3)}s wave=${wave} left=${time}s kills=${state.waveKills} alive=${state.enemies.length} carried=${state.enemies.filter(e => e.carried).length} boss=${state.activeBoss ? state.activeBoss.def.id + ' ' + Math.round(state.activeBoss.hp) : '-'} proj=${state.projectiles.length} part=${state.particles.length}`);
}
console.log(`\nSUMMARY start=${startWave} end=${wave} totalKills=${state.totalKills} essence=${Math.round(collected)} dmgTaken=${dmgTaken} maxAlive=${maxAliveSeen} worstFrame=${maxFrameMs.toFixed(2)}ms avgFrame=${(sumFrameMs/frames).toFixed(3)}ms`);
