// (M6) DeathSummary — the thin UI layer over the `run_summary` film (MOVIE.md §3 M6: "the summary is a scene, not a card;
// buttons are a thin UI layer"). Replaces GameOver.tsx (kept on disk, unimported). The film carries every number; this
// component only places buttons: TREE sits directly under the scene's glowing arrow (design (0, 300), parallax 0 →
// screen-locked), RE-IGNITE / RETRY CHAPTER / MENU below it, the respawn-wave picker when maxWaveReached > 1.
// CinematicPlayer runs `passive` (no tap-to-skip on a loop; pointer events only on the buttons).
import React, { useEffect, useMemo, useState } from 'react';
import { Play, Home, Sparkles, RotateCcw } from 'lucide-react';
import CinematicPlayer from './CinematicPlayer';
import { makeRunSummary, type SummaryData } from '../cinematic/scenes/run_summary';
import type { RunSummaryData } from './RunSummary';
import { chapterIndexOf, chapterOf, WAVES_PER_CHAPTER } from './game/Constants';

interface DeathSummaryProps {
  summary: RunSummaryData;
  maxWaveReached: number;
  /** skill-tree nodes affordable with the matter now in the bank (App computes it; SUGGESTIONS §5) */
  affordable: number;
  deathBoss?: { name: string; hint?: string } | null;
  onRestart: (wave?: number) => void;
  onRetryChapter: (firstWave: number) => void;
  onOpenTree?: () => void;
  onReturnToMenu: () => void;
}

/** design-space (1920×1080 cover fit) → CSS px: the same mapping Engine.render uses, so TREE lands under the arrow */
const useDesignScale = () => {
  const [s, setS] = useState(() => ({ S: 1, W: 1920, H: 1080 }));
  useEffect(() => {
    const f = () => { const W = innerWidth, H = innerHeight; setS({ S: Math.max(W / 1920, H / 1080), W, H }); };
    f(); addEventListener('resize', f); return () => removeEventListener('resize', f);
  }, []);
  return s;
};

const DeathSummary: React.FC<DeathSummaryProps> = ({ summary, maxWaveReached, affordable, deathBoss, onRestart, onRetryChapter, onOpenTree, onReturnToMenu }) => {
  const scene = useMemo(() => {
    const d: SummaryData = {
      wave: summary.wave, kills: summary.kills, eliteKills: summary.eliteKills, bossKills: summary.bossKills,
      matter: summary.matter, essence: summary.essence, bestStreak: summary.bestStreak, timeMs: summary.timeMs,
      relics: summary.relics, shrines: summary.shrines, landmarks: summary.landmarks,
      affordable, newEnemies: summary.newEnemyIds.length,
      chapter: chapterOf(summary.wave)?.name ?? 'THE VOID', deathBoss: deathBoss?.name ?? null,
    };
    return makeRunSummary(d);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const { S, H } = useDesignScale();
  const firstWave = (chapterIndexOf(summary.wave) - 1) * WAVES_PER_CHAPTER + 1;
  // (BUGS #4) maxWaveReached can arrive undefined/NaN on a fresh save → button read "RE-IGNITE AT WAVE ?"; clamp to a finite integer ≥ 1
  const maxW = Number.isFinite(maxWaveReached) && maxWaveReached >= 1 ? Math.floor(maxWaveReached) : Math.max(1, Math.floor(summary.wave || 1));
  const [selectedWave, setSelectedWave] = useState(maxW);
  // buttons unmount-safe: appear after the matter line (shot 3) so the typography lands first
  const [show, setShow] = useState(false);
  useEffect(() => { const t = setTimeout(() => setShow(true), 3800); return () => clearTimeout(t); }, []);
  // the arrow's tip sits at design y≈300 (+bob 9); the TREE button's top goes at design 330
  const treeTop = Math.round(H / 2 + 330 * S);

  return (
    <CinematicPlayer scene={scene} loop passive z={500}>
      <div id="death-summary-ui" className={`absolute inset-0 transition-opacity duration-700 ${show ? 'opacity-100' : 'opacity-0 pointer-events-none'}`} style={{ pointerEvents: 'none' }}>
        <button onClick={onReturnToMenu} style={{ pointerEvents: 'auto' }}
          className="absolute top-6 right-6 flex items-center gap-2 px-4 py-2 border border-amber-200/20 rounded text-amber-100/60 hover:text-amber-50 hover:border-amber-200/50 transition-all font-tech text-xs tracking-wider bg-black/30">
          <Home size={14} /> MENU
        </button>
        {deathBoss?.hint && (
          <p className="absolute left-1/2 -translate-x-1/2 text-center text-amber-100/50 font-mono text-[11px] md:text-xs tracking-wide max-w-md px-4" style={{ top: Math.round(H / 2 + 228 * S) }}>
            {deathBoss.hint}
          </p>
        )}
        <div className="absolute left-1/2 -translate-x-1/2 flex flex-col items-center gap-3 w-[min(92vw,560px)]" style={{ top: treeTop, pointerEvents: 'auto' }}>
          <button onClick={() => onOpenTree?.()}
            className="px-8 py-3 border-2 border-amber-300 text-amber-100 font-tech text-lg md:text-xl tracking-[0.25em] bg-amber-400/10 hover:bg-amber-400/25 transition-all flex items-center gap-2 shadow-[0_0_40px_rgba(251,191,36,0.35)]">
            <Sparkles size={18} /> TREE
          </button>
          {maxW > 1 && (
            <div className="w-full flex items-center gap-3 px-2">
              <span className="font-mono text-amber-100/40 text-xs">1</span>
              <input type="range" min={1} max={maxW} value={selectedWave} onChange={e => setSelectedWave(Math.max(1, parseInt(e.target.value) || 1))}
                className="flex-1 accent-amber-400 h-1.5 bg-amber-100/10 rounded-lg appearance-none cursor-pointer" />
              <span className="font-mono text-amber-300 font-bold text-base w-8 text-right">{selectedWave}</span>
            </div>
          )}
          <div className="flex flex-col md:flex-row gap-3 items-center">
            <button onClick={() => onRestart(selectedWave)}
              className="px-6 py-2.5 border border-amber-200/40 text-amber-100/90 font-tech text-sm md:text-base tracking-[0.2em] hover:bg-amber-200/10 hover:border-amber-200/70 transition-all flex items-center gap-2">
              <Play size={16} fill="currentColor" /> RE-IGNITE AT WAVE {selectedWave}
            </button>
            {firstWave !== selectedWave && (
              <button onClick={() => onRetryChapter(firstWave)}
                className="px-6 py-2.5 border border-amber-200/20 text-amber-100/60 font-tech text-sm tracking-[0.2em] hover:text-amber-50 hover:border-amber-200/50 transition-all flex items-center gap-2">
                <RotateCcw size={14} /> RETRY CHAPTER (WAVE {firstWave})
              </button>
            )}
          </div>
        </div>
      </div>
    </CinematicPlayer>
  );
};

export default DeathSummary;
