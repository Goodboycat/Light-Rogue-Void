
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Compass } from 'lucide-react';
import CinematicOverlay from './CinematicOverlay';
import { OUTRO_SCRIPT } from '../data/cinematics';
import { IS_DEMO } from './game/Constants';

import { Settings } from '../types';
import { t } from '../translate';
interface WinGameProps {
  settings?: Settings;
  onRestart: () => void;
  onReturnToMenu: () => void;
}

const WinGame: React.FC<WinGameProps> = ({ onRestart, onReturnToMenu, settings }) => {
  const lang = settings?.language || 'en';
  const [showButtons, setShowButtons] = useState(false);

  // If Demo, show buttons immediately, skip outro cinematic
  React.useEffect(() => {
      if (IS_DEMO) {
          setShowButtons(true);
      }
  }, []);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-white overflow-hidden pointer-events-auto cursor-none">
      <motion.div 
        {...({
            initial: { opacity: 0 },
            animate: { opacity: 1 },
            transition: { duration: 2 }
        } as any)}
        className="absolute inset-0 bg-white"
      />
      
      {!showButtons && (
         <CinematicOverlay 
            script={OUTRO_SCRIPT} 
            onComplete={() => setShowButtons(true)} 
            isOutro={true}
            lang={lang}
         />
      )}

      {showButtons && (
        <>
            <div className="cursor-auto w-full max-w-4xl px-4 flex flex-col items-center justify-center"> {/* Re-enable cursor for buttons */}
                <div className="relative z-10 text-center px-6">
                    <motion.h1 
                    {...({
                        initial: { y: 50, opacity: 0 },
                        animate: { y: 0, opacity: 1 },
                        transition: { duration: 1.2, ease: "easeOut" }
                    } as any)}
                    className="text-6xl md:text-8xl font-tech font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-amber-600 via-yellow-600 to-amber-700 mb-8 drop-shadow-[0_2px_15px_rgba(217,119,6,0.15)] tracking-[0.1em]"
                    >
                    {t("TRANSCENDENCE", lang)}
                    </motion.h1>

                    <motion.p
                    {...({
                        initial: { opacity: 0 },
                        animate: { opacity: 1 },
                        transition: { delay: 1, duration: 1 }
                    } as any)}
                    className="text-xl md:text-3xl text-amber-800 font-medium tracking-[0.15em] mb-6 max-w-2xl mx-auto leading-relaxed"
                    >
                        {t("Light has reached transcendence.", lang)}
                    </motion.p>

                    <div className="flex justify-center items-center mb-12">
                        <span className={`px-4 py-1 rounded-full text-xs font-mono tracking-widest font-bold uppercase border shadow-sm ${
                            (settings?.difficulty || 'normal') === 'chill'
                                ? 'bg-cyan-950/80 border-cyan-500/50 text-cyan-300'
                                : (settings?.difficulty || 'normal') === 'brutal'
                                ? 'bg-red-950/80 border-red-500/50 text-red-300'
                                : 'bg-purple-950/80 border-purple-500/50 text-purple-300'
                        }`}>
                            {t("DIFFICULTY:", lang)} {t((settings?.difficulty || 'normal').toUpperCase(), lang)}
                        </span>
                    </div>

                    <div className="flex justify-center items-center w-full max-w-md mx-auto">
                        <motion.button 
                        {...({
                            initial: { scale: 0.9, opacity: 0 },
                            animate: { scale: 1, opacity: 1 },
                            transition: { delay: 1.5, type: "spring" },
                            whileHover: { scale: 1.05 },
                            whileTap: { scale: 0.98 }
                        } as any)}
                        onClick={onReturnToMenu}
                        className="px-12 py-4 border-2 border-amber-600 text-amber-800 hover:text-white font-tech text-lg tracking-[0.2em] bg-white hover:bg-amber-600 transition-all rounded shadow-md font-bold"
                        >
                        {t("MAIN MENU", lang)}
                        </motion.button>
                    </div>
                </div>
            </div>
        </>
      )}

      {/* Floating particles */}
      {Array.from({ length: 20 }).map((_, i) => (
        <motion.div
            key={i}
            className="absolute rounded-full bg-amber-400 blur-sm"
            {...({
                initial: { 
                    x: Math.random() * window.innerWidth, 
                    y: window.innerHeight + 100,
                    scale: Math.random() * 2 
                },
                animate: { 
                    y: -100,
                    opacity: [0, 1, 0]
                },
                transition: { 
                    duration: 5 + Math.random() * 5, 
                    repeat: Infinity, 
                    delay: Math.random() * 5 
                }
            } as any)}
            style={{ width: 4 + Math.random() * 10, height: 4 + Math.random() * 10 }}
        />
      ))}
    </div>
  );
};

export default WinGame;
