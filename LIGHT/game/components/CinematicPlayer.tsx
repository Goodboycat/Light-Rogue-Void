// (M0) CinematicPlayer — the film layer. A fixed, full-screen, OPAQUE canvas at z-[500] (MOVIE.md §1.2).
// Owns its DPR, resize and input. Tap / any key = skip (after scene.skipAfter). Renders `state = f(t)`.
// `debug` adds a scrub bar + shot list (used by the ?cinematic= route). `audio=false` mutes cues (menu loop
// behind the UI should not fire cues when the user has music off — AudioManager still gates on settings).
import React, { useEffect, useRef, useState } from 'react';
import { CinematicPlayer as Player, cinematicDpr } from '../cinematic/Engine';
import type { SceneDef, AudioSink } from '../cinematic/Engine';
import Audio from '../audio/AudioManager';

const sink: AudioSink = {
  sfx: (id, vol) => { Audio.play(id, { vol, pitchVar: 0 }); },
  music: (id) => { Audio.music(id, 1500); },
  duck: (amount, ms) => { Audio.duck(amount, ms); },
};

export interface CinematicProps {
  scene: SceneDef;
  onDone?: () => void;
  /** start time (s) — debug */
  startT?: number;
  /** force loop (debug) */
  loop?: boolean;
  /** show scrub bar + shot list */
  debug?: boolean;
  /** when false, cues are swallowed */
  audio?: boolean;
  /** z-index class; the menu loop sits under the menu UI (z-0), real cinematics at z-[500] */
  z?: number;
  /** when true the canvas ignores pointer events (menu background) */
  passive?: boolean;
  /** rendered on top of the canvas (debug HUD / children) */
  children?: React.ReactNode;
  /** called every frame with the player (debug HUD) */
  onFrame?: (p: Player) => void;
}

const CinematicPlayer: React.FC<CinematicProps> = ({ scene, onDone, startT = 0, loop, debug, audio = true, z = 500, passive = false, children, onFrame }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const playerRef = useRef<Player | null>(null);
  const [, bump] = useState(0);
  const onDoneRef = useRef(onDone); onDoneRef.current = onDone;
  const onFrameRef = useRef(onFrame); onFrameRef.current = onFrame;

  useEffect(() => {
    const cv = canvasRef.current; if (!cv) return;
    const ctx = cv.getContext('2d', { alpha: false })!;
    const def: SceneDef = loop !== undefined ? { ...scene, loop } : scene;
    const p = new Player(def, audio ? sink : null, startT);
    playerRef.current = p;
    p.onDone = () => onDoneRef.current?.();
    let W = 0, H = 0, dpr = 1;
    const resize = () => {
      dpr = cinematicDpr();
      W = Math.round(innerWidth * dpr); H = Math.round(innerHeight * dpr);
      if (cv.width !== W || cv.height !== H) { cv.width = W; cv.height = H; }
      cv.style.width = innerWidth + 'px'; cv.style.height = innerHeight + 'px';
    };
    resize(); addEventListener('resize', resize);
    let last = performance.now(); let raf = 0; let frames = 0, acc = 0;
    const tick = (now: number) => {
      raf = requestAnimationFrame(tick);
      const dt = Math.min(0.1, (now - last) / 1000); last = now;
      const t0 = performance.now();
      p.advance(dt);
      p.render(ctx, W, H, dpr);
      const ms = performance.now() - t0; acc += ms; frames++;
      if (frames >= 30) { (p as any).__ms = acc / frames; frames = 0; acc = 0; }
      if (debug) { // (M1) per-shot ms/frame for tools/cinebench.mjs → window.__cinePerf
        const w = window as any; const perf = (w.__cinePerf ??= { id: scene.id, shots: {} as Record<number, { acc: number; n: number; max: number }> });
        const sh = scene.shots.find(s => p.t >= s.from && p.t < s.to); if (sh) { const r = (perf.shots[sh.n] ??= { acc: 0, n: 0, max: 0 }); r.acc += ms; r.n++; if (ms > r.max) r.max = ms; }
      }
      onFrameRef.current?.(p);
      if (debug && (p.frame & 3) === 0) bump(n => n + 1);
    };
    raf = requestAnimationFrame(tick);
    const skip = (e: Event) => { if (passive) return; if (e.type === 'keydown' && (e as KeyboardEvent).key === 'Tab') return; p.skip(); };
    if (!passive) { addEventListener('pointerdown', skip); addEventListener('keydown', skip); }
    return () => {
      cancelAnimationFrame(raf); removeEventListener('resize', resize);
      removeEventListener('pointerdown', skip); removeEventListener('keydown', skip);
      playerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scene, startT, loop, audio, passive]);

  const p = playerRef.current;
  return (
    <div id={`cinematic-${scene.id}`} className="fixed inset-0 bg-black" style={{ zIndex: z, pointerEvents: passive ? 'none' : 'auto' }}>
      <canvas ref={canvasRef} className="block w-full h-full" />
      {children}
      {debug && p && (
        <div className="absolute left-0 right-0 bottom-0 p-3 text-[11px] font-mono text-amber-100/90 bg-black/60" style={{ pointerEvents: 'auto' }} onPointerDown={e => e.stopPropagation()}>
          <div className="flex items-center gap-3">
            <button className="px-2 py-0.5 border border-amber-300/40 rounded" onClick={() => { p.playing = !p.playing; }}>{p.playing ? 'pause' : 'play'}</button>
            <input type="range" min={0} max={p.duration} step={0.01} value={p.t} className="flex-1 accent-amber-300"
              onChange={e => { p.seek(parseFloat(e.target.value)); if (!p.playing) p.render(canvasRef.current!.getContext('2d')!, canvasRef.current!.width, canvasRef.current!.height, cinematicDpr()); }} />
            <span className="w-28 text-right">{p.t.toFixed(2)} / {p.duration.toFixed(1)} s</span>
            <span className="w-20 text-right">{((p as any).__ms ?? 0).toFixed(2)} ms</span>
          </div>
          <div className="mt-1 flex flex-wrap gap-x-4 gap-y-0.5 text-amber-100/60">
            {scene.shots.map(s => {
              const on = p.t >= s.from && p.t < s.to;
              return <span key={s.n} className={on ? 'text-amber-200' : ''}><button onClick={() => p.seek(s.from)}>#{s.n}</button> {s.from}–{s.to}s</span>;
            })}
          </div>
        </div>
      )}
    </div>
  );
};
export default CinematicPlayer;
