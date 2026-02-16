
import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PlayerStats } from '../types';

interface GameOverlayProps {
    playerStats: PlayerStats;
    currentHealth: number;
    currentShield: number;
    timeRemaining: number;
    wave: number;
    currentPhrase: string;
    darknessPhrase?: string;
    maturity: {
        title: string;
        color: string;
        level: number;
    };
}

const GameOverlay: React.FC<GameOverlayProps> = ({
    playerStats,
    currentHealth,
    currentShield,
    timeRemaining,
    wave,
    currentPhrase,
    darknessPhrase,
    maturity
}) => {
    return (
        <div className="absolute inset-0 pointer-events-none z-10">
            {/* Top Left: Health & Shield */}
            <div className="absolute top-8 left-8 flex flex-col gap-4">
                <div className="flex gap-2">
                    {Array.from({ length: playerStats.maxHealth }).map((_, i) => {
                        const isHealthFilled = i < currentHealth;
                        const isShielded = i < currentShield;
                        
                        return (
                            <div key={i} className="relative w-5 h-5 flex items-center justify-center">
                                {/* Base Health Pip */}
                                <div className={`absolute inset-0 rounded-full border-2 transition-all duration-500
                                    ${isHealthFilled 
                                        ? 'bg-white border-white shadow-white/50 shadow-lg' 
                                        : 'bg-slate-900 border-slate-700 opacity-20'
                                    }
                                `} />
                                
                                {/* Shield Overlay */}
                                <AnimatePresence>
                                    {isShielded && (
                                        <motion.div 
                                            {...({
                                                initial: { scale: 0, opacity: 0 },
                                                animate: { scale: 1.4, opacity: 1 },
                                                exit: { scale: 0, opacity: 0 }
                                            } as any)}
                                            className="absolute inset-0 rounded-full border-2 border-amber-400 shadow-[0_0_10px_rgba(251,191,36,0.8)] bg-amber-400/30"
                                        />
                                    )}
                                </AnimatePresence>
                            </div>
                        );
                    })}
                </div>
                <div className="font-tech text-[10px] tracking-[0.3em] text-white/40 uppercase">Light integrity cells</div>
            </div>

            {/* Top Center: Timer & Wave */}
            <div className="absolute top-8 left-1/2 -translate-x-1/2 text-center">
                <div className="text-4xl font-bold font-tech text-white tabular-nums drop-shadow-lg">{Math.ceil(timeRemaining)}</div>
                <div className="text-[10px] tracking-[0.4em] text-purple-500 font-tech">WAVE {wave}</div>
            </div>

            {/* Bottom Center: Phrases */}
            <div className="absolute bottom-16 left-0 w-full flex flex-col items-center gap-2">
                {/* Light Phrase */}
                <AnimatePresence mode="wait">
                    <motion.div
                        key={currentPhrase}
                        {...({
                            initial: { opacity: 0, y: 10 },
                            animate: { opacity: 1, y: 0 },
                            exit: { opacity: 0, y: -10 },
                            transition: { duration: 0.5 }
                        } as any)}
                        className="font-tech text-lg text-white/80 drop-shadow-[0_0_10px_rgba(255,255,255,0.5)] italic tracking-widest"
                    >
                        "{currentPhrase}"
                    </motion.div>
                </AnimatePresence>

                {/* Darkness Phrase */}
                {darknessPhrase && (
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={darknessPhrase}
                            {...({
                                initial: { opacity: 0 },
                                animate: { opacity: 0.6 },
                                exit: { opacity: 0 },
                                transition: { duration: 0.8 }
                            } as any)}
                            className="font-serif text-sm text-slate-500 italic tracking-widest uppercase"
                        >
                            {darknessPhrase}
                        </motion.div>
                    </AnimatePresence>
                )}
            </div>

            {/* Bottom Right: Maturity/Growth Status */}
            <div className="absolute bottom-8 right-8 text-right hidden md:block">
                <div className="font-tech text-xl drop-shadow-lg" style={{ color: maturity.color }}>{maturity.title}</div>
                <div className="text-[10px] text-white/30 uppercase tracking-[0.2em] font-tech">Maturity Rank {maturity.level}</div>
            </div>
        </div>
    );
};

export default GameOverlay;
