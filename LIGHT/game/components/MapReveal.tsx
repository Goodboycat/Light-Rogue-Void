// (7D) Place-reveal cinematic on the world map. Wraps <WorldMap> and drives its
// camera / revealFog / revealName props over REVEAL_MS: pan+zoom to the new place,
// fog dissolves from the centre out, name letter-spaces in, `landmark_reveal` +
// `music_sting_reveal`. Skippable (tap / any key) after SKIP_AFTER_MS. When done it
// eases the camera back to the whole map and calls `onDone` — the parent then
// renders the plain map (MapBreather / MainMenu) with the place unlocked for real.
// `reduceFlash` keeps the fog static (WorldMap) and removes the white bloom.

import React, { useEffect, useRef, useState } from 'react';
import WorldMap, { MAP_W, MAP_H, PLACE_POS } from './WorldMap';
import { CHAPTERS } from './game/Constants';
import { sfx } from '../audio/hooks';

export const REVEAL_MS = 2500;
const SKIP_AFTER_MS = 1000;
const OUTRO_MS = 700;

interface Props {
  /** 0-based index of the place being revealed. */
  place: number;
  maxWaveReached: number;
  defeatedBosses: string[];
  treasuresOpened?: string[];
  reduceFlash?: boolean;
  onDone: () => void;
}

const easeInOut = (t: number) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

const MapReveal: React.FC<Props> = ({ place, maxWaveReached, defeatedBosses, treasuresOpened = [], reduceFlash = false, onDone }) => {
  const [frame, setFrame] = useState({ cam: { x: MAP_W / 2, y: MAP_H / 2, zoom: 1 }, fog: 1, name: 0, bloom: 0, skippable: false });
  const startRef = useRef(performance.now());
  const phaseRef = useRef<'in' | 'out'>('in');
  const outStartRef = useRef(0);
  const doneRef = useRef(false);
  const onDoneRef = useRef(onDone); onDoneRef.current = onDone;

  const [px, py] = PLACE_POS[Math.max(0, Math.min(PLACE_POS.length - 1, place))];
  const ch = CHAPTERS[Math.max(0, Math.min(CHAPTERS.length - 1, place))];

  const skip = () => {
    if (phaseRef.current === 'out' || doneRef.current) return;
    if (performance.now() - startRef.current < SKIP_AFTER_MS) return;
    phaseRef.current = 'out'; outStartRef.current = performance.now();
  };

  useEffect(() => {
    sfx('landmark_reveal', 1, 0);
    const sting = window.setTimeout(() => sfx('music_sting_reveal', 1, 0), 600);
    let raf = 0;
    const tick = (now: number) => {
      if (phaseRef.current === 'in') {
        const t = clamp01((now - startRef.current) / REVEAL_MS);
        const camT = easeInOut(clamp01(t / 0.45));              // 0 – 45 %: pan + zoom in
        const fogT = clamp01((t - 0.3) / 0.45);                 // 30 – 75 %: fog burns away
        const nameT = clamp01((t - 0.55) / 0.4);                // 55 – 95 %: name letter-spaces in
        const bloom = reduceFlash ? 0 : Math.max(0, 1 - Math.abs(t - 0.5) / 0.18) * 0.55;
        const zoom = 1 + camT * 1.2;
        const cam = { x: MAP_W / 2 + (px - MAP_W / 2) * camT, y: MAP_H / 2 + (py - MAP_H / 2) * camT, zoom };
        setFrame({ cam, fog: 1 - easeInOut(fogT), name: nameT, bloom, skippable: now - startRef.current >= SKIP_AFTER_MS });
        if (t >= 1) { phaseRef.current = 'out'; outStartRef.current = now; }
      } else {
        const t = easeInOut(clamp01((now - outStartRef.current) / OUTRO_MS));
        const cam = { x: px + (MAP_W / 2 - px) * t, y: py + (MAP_H / 2 - py) * t, zoom: 2.2 + (1 - 2.2) * t };
        setFrame({ cam, fog: 0, name: 1, bloom: 0, skippable: false });
        if (t >= 1 && !doneRef.current) { doneRef.current = true; onDoneRef.current(); return; }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    const onKey = (e: KeyboardEvent) => { e.preventDefault(); e.stopPropagation(); skip(); };
    window.addEventListener('keydown', onKey, true);
    return () => { cancelAnimationFrame(raf); window.clearTimeout(sting); window.removeEventListener('keydown', onKey, true); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div id="map-reveal" className="relative w-full h-full" onPointerDown={skip}>
      <WorldMap
        maxWaveReached={maxWaveReached}
        defeatedBosses={defeatedBosses}
        current={-1}
        treasuresOpened={treasuresOpened}
        reduceFlash={reduceFlash}
        revealPlace={place}
        revealFog={frame.fog}
        revealName={frame.name}
        camera={frame.cam}
      />
      {frame.bloom > 0 && (
        <div className="absolute inset-0 pointer-events-none rounded-xl" style={{ background: `radial-gradient(circle at 50% 50%, ${ch.color} 0%, transparent 60%)`, opacity: frame.bloom, mixBlendMode: 'screen' }} />
      )}
      <div className="absolute left-0 right-0 bottom-2 text-center pointer-events-none">
        <div className="font-mono text-[10px] tracking-[0.35em] uppercase text-slate-300/80" style={{ opacity: Math.min(1, frame.name * 1.5) }}>
          new place discovered
        </div>
        {frame.skippable && <div className="font-mono text-[9px] tracking-widest text-slate-500 mt-1">TAP / ANY KEY — SKIP</div>}
      </div>
    </div>
  );
};

export default MapReveal;
