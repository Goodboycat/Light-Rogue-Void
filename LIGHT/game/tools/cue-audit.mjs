// (M9) Static audit of every scene's timeline cues: counts of sfx / stinger / duckHold / duck / music per scene file,
// plus every cin_ id used and the ids the kits inject. Regex-based (no TS import), so it reads what is literally
// written in `cues: [...]` — spread kit cues are credited to the kit row. Usage: node tools/cue-audit.mjs
import { readdirSync, readFileSync } from 'node:fs';
const dir = new URL('../cinematic/scenes/', import.meta.url);
const rows = [];
for (const f of readdirSync(dir).filter(f => f.endsWith('.ts') && f !== 'index.ts').sort()) {
  const s = readFileSync(new URL(f, dir), 'utf8');
  const m = s.match(/(?:cues: \(?\[|Cues = \([^)]*\): Cue\[\] => \[)([\s\S]*?)\n\s*\]/g) || [];
  const body = m.join('\n');
  const n = (re) => (body.match(re) || []).length;
  const cin = [...new Set((body.match(/'cin_[a-z_]+'/g) || []).map(x => x.slice(1, -1)))];
  rows.push({ scene: f.replace('.ts', ''), sfx: n(/\bsfx:/g), stinger: n(/\bstinger:/g), hold: n(/\bduckHold:/g), duck: n(/\bduck:/g), music: n(/\bmusic:/g), cin: cin.join(' ') });
}
const w = Math.max(...rows.map(r => r.scene.length));
console.log(`${'scene'.padEnd(w)} | sfx | sting | hold | duck | music | cin_ ids`);
for (const r of rows) console.log(`${r.scene.padEnd(w)} | ${String(r.sfx).padStart(3)} | ${String(r.stinger).padStart(5)} | ${String(r.hold).padStart(4)} | ${String(r.duck).padStart(4)} | ${String(r.music).padStart(5)} | ${r.cin}`);
