import React, { useEffect, useState } from 'react';

import { WATCHER_WHISPERS } from '../data/story';
import { motion, AnimatePresence } from 'framer-motion';
import { Home } from 'lucide-react';
import RunSummary, { RunSummaryData } from './RunSummary'; // (7A step 4)
import { sfx } from '../audio/hooks'; // (6B)
import { Audio } from '../audio/AudioManager';
import CinematicOverlay from './CinematicOverlay';
import { OUTRO_SCRIPT } from '../data/cinematics';
import { IS_DEMO } from './game/Constants';
import DemoCard from './DemoCard'; // (9B)
import CinematicPlayer from './CinematicPlayer'; // (M7) the endings are film scenes
import { getScene } from '../cinematic/scenes';
import { makeEndingLeave } from '../cinematic/scenes/ending_leave';
import type { SceneDef } from '../cinematic/Engine';

/**
 * (2D) Ending screen after Darkness falls.
 *  1. Outro cinematic over the "Seam of the Void" wash (violet tint, chromatic flicker, whisper lines).
 *  2. Choice: STAY → film `ending_stay` (36 s), onDone → onEndingSeen('stay') → App starts Endless at wave 61 (9A)
 *     or LEAVE → film `makeEndingLeave(stats)` (42 s, credits as typography inside the scene), onDone → menu. (M7)
 *  Both are earned endings; both set gameState.endingSeen via onEndingSeen.
 */
interface WinGameProps {
  onRestart: () => void;
  onReturnToMenu: () => void;
  /** Called once when the player makes the Stay/Leave choice. */
  onEndingSeen?: (choice: 'stay' | 'leave') => void;
  /** Run stats for the credits roll. */
  stats?: { kills: number; wave: number };
  /** (7A) run summary shown on the choice screen */
  summary?: RunSummaryData | null;
  onOpenTree?: () => void;
  /** (7D) the ending cinematic already played over the live arena — start at the choice. */
  skipOutro?: boolean;
}

type Stage = 'outro' | 'choice';

const WHISPERS = WATCHER_WHISPERS; // (3B step 7) single source in data/story.ts

const WinGame: React.FC<WinGameProps> = ({ onRestart, onReturnToMenu, onEndingSeen, stats, summary, onOpenTree, skipOutro }) => {
  const [stage, setStage] = useState<Stage>(IS_DEMO || skipOutro ? 'choice' : 'outro');
  const [seamPhase, setSeamPhase] = useState<'wash' | 'tear' | 'bloom'>('wash');
  const [flicker, setFlicker] = useState(false);
  const [whisper, setWhisper] = useState<{ text: string; side: number; key: number } | null>(null);
  /** (M7) the ending film playing over everything; its onDone continues the choice */
  const [film, setFilm] = useState<{ scene: SceneDef; onDone: () => void } | null>(null);

  // Chromatic single-frame flicker every 4–8 s while in the seam.
  useEffect(() => {
    if (film) return;
    let t: any;
    const tick = () => {
      setFlicker(true);
      setTimeout(() => setFlicker(false), 70);
      t = setTimeout(tick, 4000 + Math.random() * 4000);
    };
    t = setTimeout(tick, 2500);
    return () => clearTimeout(t);
  }, [stage, film]);

  // Whisper lines crawling in from the edges during the outro.
  useEffect(() => {
    if (stage !== 'outro') return;
    let n = 0; let t: any;
    const tick = () => {
      setWhisper({ text: WHISPERS[n % WHISPERS.length], side: n % 4, key: n });
      n++;
      t = setTimeout(tick, 3500 + Math.random() * 2000);
    };
    t = setTimeout(tick, 1500);
    return () => clearTimeout(t);
  }, [stage]);

  const choose = (choice: 'stay' | 'leave') => {
    // (M7) both choices are films (MOVIE.md §3 M7); the 6B stingers now live on the scene timelines
    if (choice === 'stay') {
      const scene = getScene('ending_stay');
      const go = () => { onEndingSeen?.(choice); if (!onEndingSeen) onReturnToMenu(); }; // (9A) App starts Endless (wave 61) from onEndingSeen
      if (scene) setFilm({ scene, onDone: go }); else go();
      return;
    }
    onEndingSeen?.(choice);
    setFilm({ scene: makeEndingLeave({ kills: stats?.kills ?? 0, wave: stats?.wave ?? 60 }), onDone: onReturnToMenu });
  };

  const bloom = seamPhase === 'bloom';
  const bg = bloom
    ? 'bg-gradient-to-br from-white via-blue-50 to-amber-50'
    : 'bg-black';

  return (
    <div className={`fixed inset-0 z-[100] flex items-center justify-center overflow-hidden pointer-events-auto ${stage === 'outro' ? 'cursor-none' : ''}`}>
      {/* (M7) the ending film — own opaque layer above everything in WinGame */}
      {film && <CinematicPlayer scene={film.scene} onDone={film.onDone} />}
      {/* base */}
      <motion.div
        key={bg}
        {...({ initial: { opacity: 0 }, animate: { opacity: 1 }, transition: { duration: 2 } } as any)}
        className={`absolute inset-0 ${bg}`}
      />

      {/* SEAM OF THE VOID wash: violet tint below everything, torn open then blooming white */}
      {!bloom && (
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: seamPhase === 'tear'
              ? 'radial-gradient(ellipse at 50% 50%, rgba(233,213,255,0.55) 0%, rgba(76,29,149,0.55) 22%, rgba(10,0,20,0.95) 70%)'
              : 'radial-gradient(ellipse at 50% 60%, rgba(76,29,149,0.45) 0%, rgba(20,8,40,0.85) 55%, #000 100%)',
            transition: 'background 1.5s ease-in-out',
          }}
        />
      )}
      {/* seam line */}
      {stage === 'outro' && !bloom && (
        <motion.div
          className="absolute left-1/2 top-0 bottom-0 w-px pointer-events-none"
          style={{ background: 'linear-gradient(to bottom, transparent, #e9d5ff, transparent)', boxShadow: '0 0 40px 6px rgba(167,139,250,0.6)' }}
          {...({
            animate: { scaleX: seamPhase === 'tear' ? [1, 40, 60] : [1, 1.6, 1], opacity: seamPhase === 'tear' ? [1, 0.7, 0.35] : [0.6, 1, 0.6] },
            transition: seamPhase === 'tear' ? { duration: 2.4, ease: 'easeInOut' } : { duration: 3, repeat: Infinity },
          } as any)}
        />
      )}
      {/* chromatic flicker frame */}
      {flicker && (
        <div className="absolute inset-0 pointer-events-none mix-blend-screen"
             style={{ background: 'linear-gradient(90deg, rgba(255,0,80,0.25), transparent 30%, transparent 70%, rgba(0,200,255,0.25))' }} />
      )}
      {/* whisper lines */}
      <AnimatePresence>
        {whisper && stage === 'outro' && (
          <motion.div
            key={whisper.key}
            className="absolute font-serif italic text-violet-300/70 text-sm md:text-base tracking-[0.3em] pointer-events-none select-none"
            style={whisperStyle(whisper.side)}
            {...({
              initial: { opacity: 0, x: whisper.side === 1 ? 60 : whisper.side === 3 ? -60 : 0, y: whisper.side === 0 ? -40 : whisper.side === 2 ? 40 : 0 },
              animate: { opacity: [0, 0.8, 0.8, 0], x: 0, y: 0 },
              exit: { opacity: 0 },
              transition: { duration: 3.2 },
            } as any)}
          >
            {whisper.text}
          </motion.div>
        )}
      </AnimatePresence>

      {stage === 'outro' && (
        <CinematicOverlay
          script={OUTRO_SCRIPT}
          onVisualAction={(a: string) => {
            if (a === 'SEAM_TEAR') setSeamPhase('tear');
            if (a === 'SEAM_BLOOM') setSeamPhase('bloom');
          }}
          onComplete={() => { setSeamPhase('bloom'); setStage('choice'); }}
        />
      )}

      {stage === 'choice' && (
        <div className="cursor-auto">
          <motion.button
            {...({ initial: { opacity: 0 }, animate: { opacity: 1 }, transition: { delay: 0.5 } } as any)}
            onClick={onReturnToMenu}
            className="absolute top-8 right-8 z-[120] flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/50 border border-slate-300 rounded text-slate-600 hover:text-slate-900 transition-all font-tech text-xs tracking-wider"
          >
            <Home size={14} /> MAIN MENU
          </motion.button>

          <div className="relative z-10 text-center px-6">
            <motion.h1
              {...({ initial: { y: 50, opacity: 0 }, animate: { y: 0, opacity: 1 }, transition: { duration: 1 } } as any)}
              className="text-6xl md:text-9xl font-tech font-bold text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-purple-600 mb-6"
            >
              {IS_DEMO ? 'DEMO COMPLETE' : 'TRANSCENDENCE'}
            </motion.h1>

            <motion.p
              {...({ initial: { opacity: 0 }, animate: { opacity: 1 }, transition: { delay: 1, duration: 1 } } as any)}
              className="text-xl md:text-2xl text-slate-800 font-light tracking-[0.2em] mb-8"
            >
              {IS_DEMO
                ? 'Thank you for playing. Unlock the full void in the complete version.'
                : 'The void is quiet. Light decides where it goes.'}
            </motion.p>

            {IS_DEMO ? (
              <div className="flex flex-col items-center gap-6">
                <DemoCard variant="compact" className="w-[min(92vw,640px)] !bg-amber-500/20 !border-amber-600/60 [&_span]:!text-amber-900" />
                <ChoiceButton delay={1.5} onClick={onReturnToMenu} label="RETURN TO MENU" sub="" />
              </div>
            ) : (
              <div className="flex flex-col md:flex-row gap-6 md:gap-10 items-center justify-center">
                <ChoiceButton delay={1.5} onClick={() => choose('stay')} label="STAY" sub="Keep the void company. Endless." />
                <ChoiceButton delay={1.8} onClick={() => choose('leave')} label="LEAVE" sub="Let it be dark. It will remember." />
              </div>
            )}
            {summary && (
              <div className="mt-10 [&_#run-summary_span]:!text-slate-800 [&_#run-summary_.text-white\/40]:!text-slate-500 [&_#run-summary_button]:!text-slate-800 [&_#run-summary_button]:!border-slate-500 [&_#run-summary_button]:!bg-white/40">
                <RunSummary data={summary} hideRetry onTree={() => onOpenTree?.()} onRetryChapter={() => {}} onMenu={onReturnToMenu} />
              </div>
            )}
            {!IS_DEMO && (
              <motion.button
                {...({ initial: { opacity: 0 }, animate: { opacity: 0.6 }, transition: { delay: 2.6 } } as any)}
                onClick={onRestart}
                className="mt-10 text-slate-600 hover:text-slate-900 font-tech text-xs tracking-[0.3em] underline-offset-4 hover:underline"
              >
                NEW CYCLE
              </motion.button>
            )}
          </div>
        </div>
      )}


      {/* Floating motes (white in bloom/credits, violet in the seam) */}
      {Array.from({ length: 20 }).map((_, i) => (
        <motion.div
          key={i}
          className={`absolute rounded-full blur-sm pointer-events-none ${bloom ? 'bg-amber-400' : 'bg-violet-400/70'}`}
          {...({
            initial: { x: Math.random() * window.innerWidth, y: window.innerHeight + 100, scale: Math.random() * 2 },
            animate: { y: -100, opacity: [0, 1, 0] },
            transition: { duration: 5 + Math.random() * 5, repeat: Infinity, delay: Math.random() * 5 },
          } as any)}
          style={{ width: 4 + Math.random() * 10, height: 4 + Math.random() * 10 }}
        />
      ))}
    </div>
  );
};

const ChoiceButton: React.FC<{ delay: number; onClick: () => void; label: string; sub: string }> = ({ delay, onClick, label, sub }) => (
  <motion.button
    {...({
      initial: { scale: 0, opacity: 0 },
      animate: { scale: 1, opacity: 1 },
      transition: { delay, type: 'spring' },
      whileHover: { scale: 1.08 },
      whileTap: { scale: 0.96 },
    } as any)}
    onClick={onClick}
    className="min-w-[220px] px-10 py-4 border-2 border-slate-900 text-slate-900 font-tech tracking-[0.3em] hover:bg-slate-900 hover:text-white transition-all"
  >
    <div className="text-xl">{label}</div>
    {sub && <div className="text-[10px] tracking-[0.2em] opacity-70 mt-1 font-light">{sub}</div>}
  </motion.button>
);

function whisperStyle(side: number): React.CSSProperties {
  switch (side) {
    case 0: return { top: '8%', left: '50%', transform: 'translateX(-50%)' };
    case 1: return { right: '4%', top: '45%', writingMode: 'vertical-rl' as any };
    case 2: return { bottom: '8%', left: '50%', transform: 'translateX(-50%)' };
    default: return { left: '4%', top: '45%', writingMode: 'vertical-rl' as any, transform: 'rotate(180deg)' };
  }
}


export default WinGame;
