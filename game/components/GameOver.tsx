
import React, { useMemo, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { VOID_PHRASES } from '../data/phrases';
import { FastForward, Play, Home } from 'lucide-react';

interface GameOverProps {
  wave: number;
  maxWaveReached: number;
  maturityTitle: string;
  /** (2B) set when a boss killed the player: one-line hint, no HP mercy */
  deathBoss?: { name: string; hint?: string } | null;
  onRestart: (wave?: number) => void;
  onReturnToMenu: () => void;
}

const GameOver: React.FC<GameOverProps> = ({ wave, maxWaveReached, maturityTitle, deathBoss, onRestart, onReturnToMenu }) => {
  const phrase = useMemo(() => VOID_PHRASES[Math.floor(Math.random() * VOID_PHRASES.length)], []);
  const [showContent, setShowContent] = useState(false);
  const [selectedWave, setSelectedWave] = useState(1);

  useEffect(() => {
    const timer = setTimeout(() => setShowContent(true), 1200);
    // Initialize slider to max wave, or 1
    setSelectedWave(Math.floor(maxWaveReached));
    return () => clearTimeout(timer);
  }, [maxWaveReached]);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black overflow-hidden pointer-events-auto">
      {/* --- TV SHUTDOWN ANIMATION --- */}
      <AnimatePresence>
        {!showContent && (
          <motion.div 
            className="absolute inset-0 z-[110] bg-white pointer-events-none"
            {...({
                initial: { opacity: 0 },
                animate: { 
                    opacity: [0, 1, 1, 0],
                    scaleX: [1, 1.2, 1, 0],
                    scaleY: [1, 1.1, 0.005, 0],
                },
                transition: { 
                    duration: 1, 
                    times: [0, 0.2, 0.8, 1],
                    ease: "easeInOut"
                }
            } as any)}
          />
        )}
      </AnimatePresence>
      
      {/* Top Right Menu Button */}
      {showContent && (
          <motion.button
              {...({
                  initial: { opacity: 0 },
                  animate: { opacity: 1 }
              } as any)}
              onClick={onReturnToMenu}
              className="absolute top-8 right-8 z-[120] flex items-center gap-2 px-4 py-2 bg-slate-900 border border-slate-700 rounded text-slate-400 hover:text-white hover:border-slate-500 transition-all font-tech text-xs tracking-wider"
          >
              <Home size={14} />
              MAIN MENU
          </motion.button>
      )}

      {/* --- CONTENT --- */}
      <AnimatePresence>
        {showContent && (
          <motion.div 
            {...({
                initial: { opacity: 0, y: 20 },
                animate: { opacity: 1, y: 0 }
            } as any)}
            className="text-center px-6 max-w-2xl flex flex-col items-center relative z-20"
          >
            <motion.h1 
              className="text-7xl md:text-9xl font-tech text-red-600 mb-4 tracking-tighter drop-shadow-[0_0_30px_rgba(220,38,38,0.5)]"
              {...({
                  animate: { opacity: [1, 0.8, 1] },
                  transition: { duration: 0.1, repeat: Infinity }
              } as any)}
            >
              EXTINGUISHED
            </motion.h1>
            
            <div className="space-y-1 mb-8">
                <p className="text-slate-500 font-mono tracking-widest text-sm uppercase">Wave {wave} reached</p>
                <p className="text-amber-500 font-tech text-xl">{maturityTitle}</p>
                {deathBoss && (
                    <p className="text-red-400/90 font-mono text-xs md:text-sm tracking-wide pt-2 max-w-md mx-auto">
                        You fell to <span className="text-red-300 font-bold">{deathBoss.name}</span>
                        {deathBoss.hint ? <> — {deathBoss.hint}</> : null}
                    </p>
                )}
            </div>

            <motion.p 
              {...({
                  initial: { opacity: 0 },
                  animate: { opacity: 1 },
                  transition: { delay: 0.5, duration: 2 }
              } as any)}
              className="text-slate-300 italic text-xl md:text-2xl font-light mb-8 leading-relaxed"
            >
              "{phrase}"
            </motion.p>

            {maxWaveReached > 1 && (
                <div className="w-full max-w-md bg-slate-900/50 p-6 rounded-xl border border-slate-800 mb-8">
                    <label className="text-sm text-slate-400 font-tech mb-2 block uppercase tracking-widest">
                        Select Respawn Wave
                    </label>
                    <div className="flex items-center gap-4">
                        <span className="font-mono text-slate-500">1</span>
                        <input 
                            type="range" 
                            min="1" 
                            max={maxWaveReached} 
                            value={selectedWave} 
                            onChange={(e) => setSelectedWave(parseInt(e.target.value))}
                            className="flex-1 accent-purple-500 h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer"
                        />
                        <span className="font-mono text-purple-400 font-bold text-xl w-8">{selectedWave}</span>
                    </div>
                </div>
            )}

            <div className="flex flex-col md:flex-row gap-6">
                <motion.button 
                  {...({
                      whileHover: { scale: 1.05, backgroundColor: 'rgba(220,38,38,0.2)' },
                      whileTap: { scale: 0.95 }
                  } as any)}
                  onClick={() => onRestart(selectedWave)}
                  className="px-8 py-4 border-2 border-red-600 text-red-600 font-tech text-xl tracking-[0.2em] transition-all flex items-center gap-2 justify-center"
                >
                  <Play size={20} fill="currentColor" />
                  RE-IGNITE AT WAVE {selectedWave}
                </motion.button>
            </div>

            <p className="mt-8 text-[10px] text-slate-700 font-mono uppercase tracking-[0.5em]">
              The void is patient.
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Pure Black Void Background */}
      <div className="absolute inset-0 bg-black pointer-events-none" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(30,0,0,0.2)_0%,_rgba(0,0,0,1)_80%)] pointer-events-none" />
    </div>
  );
};

export default GameOver;
