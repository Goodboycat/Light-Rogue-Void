// Generates LIGHT/docs/ENEMIES.md from enemies.ts (table by chapter). Run: npm run enemies
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
const here = dirname(fileURLToPath(import.meta.url));
const src = readFileSync(join(here, '..', 'enemies.ts'), 'utf8');
const rows = [];
const re = /\{\s*id:\s*'([^']+)',\s*name:\s*'([^']+)',\s*description:\s*'([^']*)',\s*baseHp:\s*([\d.]+),\s*hpScaling:\s*([\d.]+),\s*baseSpeed:\s*([\d.]+),\s*size:\s*(\d+),[^}]*?behavior:\s*'([A-Z_]+)',\s*visualType:\s*'([A-Z_]+)',\s*spawnWeight:\s*(\d+),\s*minWave:\s*(\d+),\s*essenceReward:\s*(\d+)/g;
let m; while ((m = re.exec(src))) rows.push({ id: m[1], name: m[2], desc: m[3], hp: +m[4], hps: +m[5], spd: +m[6], size: +m[7], beh: m[8], vis: m[9], w: +m[10], min: +m[11], ess: +m[12] });
const chapters = ['Origin Fields', 'Whispering Grove', 'Crystal Depths', 'Abandoned Machinery', 'Void Wastes', 'Seam of the Void'];
let out = `# ENEMIES — roster, affixes, special waves\n\nGenerated table: \`npm run enemies\` (\`tools/dump-enemies.mjs\` reads \`enemies.ts\`). Rules sections are hand-written. ${rows.length} defs.\n\n`;
out += `## Roster by chapter (first wave the enemy may appear)\n\nHP = baseHp + hpScaling × wave. Weight = relative spawn weight inside its wave table. Enemies never leave the table once unlocked (waves accumulate variety).\n\n`;
for (let c = 0; c < 6; c++) {
  const lo = c * 10 + 1, hi = c * 10 + 10;
  const list = rows.filter(r => r.min >= lo && r.min <= hi).sort((a, b) => a.min - b.min);
  if (!list.length) continue;
  out += `### Chapter ${c + 1} — ${chapters[c] ?? ''} (waves ${lo}–${hi})\n\n| id | Name | Behaviour | Visual | HP / +wave | Speed | Size | Weight | Essence | Notes |\n|---|---|---|---|---|---|---|---|---|---|\n`;
  for (const r of list) out += `| ${r.id} | ${r.name} (w${r.min}) | ${r.beh} | ${r.vis} | ${r.hp} / +${r.hps} | ${r.spd} | ${r.size} | ${r.w} | ${r.ess} | ${r.desc} |\n`;
  out += '\n';
}
const late = rows.filter(r => r.min > 60);
if (late.length) { out += `### Beyond wave 60 (endless)\n\n| id | Name | Behaviour | minWave |\n|---|---|---|---|\n`; for (const r of late) out += `| ${r.id} | ${r.name} | ${r.beh} | ${r.min} |\n`; out += '\n'; }
const beh = {}; for (const r of rows) beh[r.beh] = (beh[r.beh] || 0) + 1;
out += `## Behaviour mix\n\n| Behaviour | Count | Where |\n|---|---|---|\n`;
for (const [k, v] of Object.entries(beh).sort((a, b) => b[1] - a[1])) out += `| ${k} | ${v} | \`logic/enemies/StandardBehavior.ts\` |\n`;
out += readFileSync(join(here, 'enemies-rules.md'), 'utf8');
writeFileSync(join(here, '..', '..', 'docs', 'ENEMIES.md'), out);
console.log('docs/ENEMIES.md written:', rows.length, 'enemies');
