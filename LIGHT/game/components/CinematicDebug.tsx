// (M0) `?cinematic=<id>` — plays any scene instantly on a black page with a scrub bar and the shot list.
// `&t=<s>` starts at a time, `&loop=1` loops, `&mute=1` swallows cues. Unknown id → list of ids.
import React, { useState } from 'react';
import CinematicPlayer from './CinematicPlayer';
import { SCENES, sceneIds } from '../cinematic/scenes';
import Audio from '../audio/AudioManager';
import { engineFlags } from '../cinematic/Engine';

const q = typeof location !== 'undefined' ? new URLSearchParams(location.search) : null;
export const CINEMATIC_DEBUG_ID: string | null = q?.get('cinematic') ?? null;

const CinematicDebug: React.FC = () => {
  const id = CINEMATIC_DEBUG_ID ?? '';
  const scene = SCENES[id];
  const [run, setRun] = useState(0);
  const [done, setDone] = useState(false);
  React.useEffect(() => { Audio.init(); }, []);
  if (!scene) {
    return (
      <div className="fixed inset-0 bg-black text-amber-100 font-mono p-8">
        <div className="text-lg mb-4">?cinematic=&lt;id&gt; — unknown id “{id}”. Scenes:</div>
        <ul className="space-y-1">{sceneIds().map(s => <li key={s}><a className="underline" href={`?cinematic=${s}`}>{s}</a> — {SCENES[s].duration}s, {SCENES[s].shots.length} shots</li>)}</ul>
        <div className="mt-6 text-amber-100/60">flags: &amp;t=&lt;s&gt; start time · &amp;loop=1 · &amp;mute=1</div>
      </div>
    );
  }
  const startT = parseFloat(q?.get('t') ?? '0') || 0;
  const loop = q?.get('loop') === '1' ? true : undefined;
  const mute = q?.get('mute') === '1';
  engineFlags.blur = q?.get('noblur') !== '1'; // (M1) perf isolation
  return (
    <>
      {!done && (
        <CinematicPlayer key={run} scene={scene} startT={startT} loop={loop} debug audio={!mute} onDone={() => setDone(true)}>
          <div className="absolute top-2 left-3 text-[11px] font-mono text-amber-100/70 pointer-events-none">
            {scene.id} · {scene.duration}s · {scene.shots.length} shots · tap/key = skip
          </div>
        </CinematicPlayer>
      )}
      {done && (
        <div className="fixed inset-0 bg-black text-amber-100 font-mono p-8 z-[600]">
          <div className="mb-4">{scene.id} — done.</div>
          <button className="px-3 py-1 border border-amber-300/50 rounded" onClick={() => { setDone(false); setRun(n => n + 1); }}>replay</button>
          <ol className="mt-6 space-y-1 text-amber-100/70 text-xs">{scene.shots.map(s => <li key={s.n}>#{s.n} {s.from}–{s.to}s — {s.what}</li>)}</ol>
        </div>
      )}
    </>
  );
};
export default CinematicDebug;
