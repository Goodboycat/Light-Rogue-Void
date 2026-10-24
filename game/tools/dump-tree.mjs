// Prints docs/TREE.md from data.ts. Usage: node game/tools/dump-tree.mjs  (from LIGHT/)  or  npm run tree
import { build } from 'esbuild';
import { writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const here = path.dirname(fileURLToPath(import.meta.url));
const game = path.resolve(here, '..');
const root = path.resolve(game, '..');

const out = await build({
  entryPoints: [path.join(game, 'data.ts')],
  bundle: true, write: false, format: 'esm', platform: 'node',
  external: ['react', 'react-dom', 'framer-motion', 'lucide-react'],
});
const mod = await import('data:text/javascript;base64,' + Buffer.from(out.outputFiles[0].text).toString('base64'));
const nodes = mod.ABILITY_TREE_DATA;

const fmtStat = (s) => Object.entries(s).map(([k, v]) => `${k} ${v > 0 ? '+' : ''}${v}`).join(', ');
const groups = { OFFENSE: [], DEFENSE: [], UTILITY: [], CONST: [] };
for (const n of nodes) {
  if (n.id === 'root') continue;
  if (n.requiresBoss) groups.CONST.push(n); else groups[n.type].push(n);
}
const depthOf = (id) => { const m = id.match(/_(\d+)_|_node_(\d+)$/); return m ? Number(m[1] ?? m[2]) : 0; };

let md = `# LIGHT — Skill Tree (generated, do not edit)\n\nSeed \`0x${mod.TREE_SEED.toString(16).toUpperCase()}\`. ${nodes.length} nodes. Bounds x ${mod.TREE_BOUNDS.minX}..${mod.TREE_BOUNDS.maxX}, y ${mod.TREE_BOUNDS.minY}..${mod.TREE_BOUNDS.maxY}.\n\nRegenerate: \`npm run tree\` (in \`game/\`). Two consecutive runs must produce the same file.\n`;
for (const [arc, list] of Object.entries(groups)) {
  if (arc === 'CONST') continue;
  const majors = list.filter(n => n.isMajor);
  md += `\n## ${arc} arc — ${list.length} nodes (${majors.length} power nodes)\n\n| Depth | Id | Title | Cost | Effect |\n|---|---|---|---|---|\n`;
  for (const n of list.sort((a, b) => depthOf(a.id) - depthOf(b.id) || a.id.localeCompare(b.id)))
    md += `| ${depthOf(n.id)} | \`${n.id}\` | ${n.isMajor ? '**' + n.title + '**' : n.title} | ${n.cost} | ${fmtStat(n.statEffect)} |\n`;
}
md += `\n## Constellations — ${groups.CONST.length} nodes (revealed by boss kills)\n`;
const byBoss = {};
for (const n of groups.CONST) (byBoss[n.requiresBoss] ??= []).push(n);
for (const [boss, list] of Object.entries(byBoss)) {
  md += `\n### ${list[0].constellation} — requires \`${boss}\`\n\n| Id | Title | Cost | Effect | Lore |\n|---|---|---|---|---|\n`;
  for (const n of list) md += `| \`${n.id}\` | ${n.isMajor ? '**' + n.title + '**' : n.title} | ${n.cost} | ${fmtStat(n.statEffect)} | ${n.description} |\n`;
}
const total = nodes.reduce((s, n) => s + n.cost, 0);
md += `\n## Totals\n- Total matter to buy everything: **${total.toLocaleString()}**\n`;
mkdirSync(path.join(root, 'docs'), { recursive: true });
writeFileSync(path.join(root, 'docs', 'TREE.md'), md);
console.log(`docs/TREE.md: ${nodes.length} nodes, total cost ${total}`);
