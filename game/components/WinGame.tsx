
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Home } from 'lucide-react';
import CinematicOverlay from './CinematicOverlay';
import { OUTRO_SCRIPT } from '../data/cinematics';
import { IS_DEMO } from './game/Constants';

interface WinGameProps {
  onRestart: () => void;
  onReturnToMenu: () => void;
}

const WinGame: React.FC<WinGameProps> = ({ onRestart, onReturnToMenu }) => {
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
        className="absolute inset-0 bg-gradient-to-br from-white via-blue-50 to-amber-50"
      />
      
      {!showButtons && (
         <CinematicOverlay 
            script={OUTRO_SCRIPT} 
            onComplete={() => setShowButtons(true)} 
         />
      )}

      {showButtons && (
        <>
            <div className="cursor-auto"> {/* Re-enable cursor for buttons */}
                {/* Menu Button */}
                <motion.button
                    {...({
                        initial: { opacity: 0 },
                        animate: { opacity: 1 },
                        transition: { delay: 0.5 }
                    } as any)}
                    onClick={onReturnToMenu}
                    className="absolute top-8 right-8 z-[120] flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/50 border border-slate-300 rounded text-slate-600 hover:text-slate-900 transition-all font-tech text-xs tracking-wider"
                >
                    <Home size={14} />
                    MAIN MENU
                </motion.button>

                <div className="relative z-10 text-center px-6">
                    <motion.h1 
                    {...({
                        initial: { y: 50, opacity: 0 },
                        animate: { y: 0, opacity: 1 },
                        transition: { duration: 1 }
                    } as any)}
                    className="text-7xl md:text-9xl font-tech font-bold text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-purple-600 mb-8"
                    >
                    {IS_DEMO ? "DEMO COMPLETE" : "TRANSCENDENCE"}
                    </motion.h1>

                    <motion.p
                    {...({
                        initial: { opacity: 0 },
                        animate: { opacity: 1 },
                        transition: { delay: 1, duration: 1 }
                    } as any)}
                    className="text-2xl text-slate-800 font-light tracking-[0.2em] mb-12"
                    >
                        {IS_DEMO 
                            ? "Thank you for playing. Unlock the full void in the complete version."
                            : "The cycle is broken. You have become the light."
                        }
                    </motion.p>

                    <motion.button 
                    {...({
                        initial: { scale: 0, opacity: 0 },
                        animate: { scale: 1, opacity: 1 },
                        transition: { delay: 1.5, type: "spring" },
                        whileHover: { scale: 1.1 }
                    } as any)}
                    onClick={IS_DEMO ? onReturnToMenu : onRestart}
                    className="px-12 py-4 border-2 border-slate-900 text-slate-900 font-tech text-xl tracking-[0.3em] hover:bg-slate-900 hover:text-white transition-all"
                    >
                    {IS_DEMO ? "RETURN TO MENU" : "NEW CYCLE"}
                    </motion.button>
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
