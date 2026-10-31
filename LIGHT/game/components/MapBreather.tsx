// (7C) Breather overlay: shown after bosses 1–5 die. The run is frozen while this
// is up (SurvivalGame gates the loop on `breather`). CONTINUE → next chapter
// (ChapterCard as before), RETURN TO MENU → run ends, essence kept. Esc / Enter
// also continue. Treasure caches on the map can be opened here too.

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { CHAPTERS, chapterIndexOf } from './game/Constants';
import WorldMap, { isChapterUnlocked } from './WorldMap';
import MapReveal from './MapReveal'; // (7D)

interface Props {
  nextWave: number;
  maxWaveReached: number;
  defeatedBosses: string[];
  treasuresOpened: string[];
  onTreasure?: (id: string, matter: number) => void;
  onRevealSeen?: (bossId: string) => void; // (7D)
  revealed?: boolean; // (M4) the boss outro film already played the place reveal (its shot 3) → skip MapReveal
  reduceFlash?: boolean;
  onContinue: () => void;
  onMenu: () => void;
}

const MapBreather: React.FC<Props> = ({ nextWave, maxWaveReached, defeatedBosses, treasuresOpened, onTreasure, onRevealSeen, revealed, reduceFlash, onContinue, onMenu }) => {
  const nextIdx = chapterIndexOf(nextWave) - 1;
  const next = CHAPTERS[nextIdx];
  const cleared = CHAPTERS[Math.max(0, nextIdx - 1)];
  // (7D) the next place is new to this save → play the reveal cinematic first (MapReveal swallows keys while up)
  const [revealing, setRevealing] = useState(() => !revealed && !isChapterUnlocked(nextIdx, maxWaveReached));

  useEffect(() => {
    if (revealing) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'Escape' || e.code === 'Enter' || e.code === 'Space') { e.preventDefault(); e.stopPropagation(); onContinue(); }
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [onContinue, revealing]);

  return (
    <motion.section
      id="map-breather"
      {...({ initial: { opacity: 0 }, animate: { opacity: 1 }, transition: { duration: 0.6 } } as any)}
      className="absolute inset-0 z-40 flex flex-col items-center justify-center bg-black/85 backdrop-blur-sm p-3 md:p-6 text-center"
    >
      <header className="mb-2">
        <div className="font-mono text-[10px] tracking-[0.3em] uppercase" style={{ color: cleared.color }}>
          {cleared.name} · cleared
        </div>
        <h2 className="font-tech text-xl md:text-3xl text-white tracking-[0.2em] mt-1">STAR CHART</h2>
        <p className="text-slate-400 text-xs md:text-sm mt-1">
          Breathe. Next: <span style={{ color: next.color }}>{next.name}</span> — waves {nextWave}–{next.bossWave}, boss at {next.bossWave}.
          {defeatedBosses.length > 0 && <span className="text-amber-200/80"> A hidden path opened — tap the ◆ cache.</span>}
        </p>
      </header>
      <div className="w-full max-w-3xl flex-1 min-h-0 flex items-center justify-center">
        <div className="w-full max-h-full" style={{ aspectRatio: '1024 / 683' }}>
          {revealing ? (
            <MapReveal
              place={nextIdx}
              maxWaveReached={maxWaveReached}
              defeatedBosses={defeatedBosses}
              treasuresOpened={treasuresOpened}
              reduceFlash={reduceFlash}
              onDone={() => { onRevealSeen?.(CHAPTERS[nextIdx].bossId); setRevealing(false); }}
            />
          ) : (
          <WorldMap
            maxWaveReached={Math.max(maxWaveReached, nextWave)}
            defeatedBosses={defeatedBosses}
            current={nextIdx}
            treasuresOpened={treasuresOpened}
            onTreasure={onTreasure}
            reduceFlash={reduceFlash}
          />
          )}
        </div>
      </div>
      <footer className="mt-3 flex flex-wrap items-center justify-center gap-3" style={{ opacity: revealing ? 0.25 : 1, pointerEvents: revealing ? 'none' : 'auto', transition: 'opacity 0.4s' }}>
        <button
          onClick={onContinue}
          className="px-8 py-3 bg-white hover:bg-slate-200 text-black font-tech font-bold tracking-[0.25em] rounded-full shadow-[0_0_30px_rgba(255,255,255,0.3)] transition-all hover:scale-105 active:scale-95"
          style={{ boxShadow: `0 0 30px ${next.color}66` }}
        >
          CONTINUE
        </button>
        <button
          onClick={onMenu}
          data-sfx="back"
          className="px-6 py-3 border border-slate-600 hover:border-white text-slate-300 hover:text-white font-tech text-sm tracking-[0.2em] rounded-full transition-all"
        >
          RETURN TO MENU
        </button>
      </footer>
      <div className="text-[10px] text-slate-500 font-mono mt-2 tracking-widest">ESC / ENTER — CONTINUE · PROGRESS IS SAVED</div>
    </motion.section>
  );
};

export default MapBreather;
