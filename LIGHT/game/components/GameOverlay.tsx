
import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PlayerStats } from '../types';
import { relicById } from '../data/world'; // (3A) relic HUD icons

interface GameOverlayProps {
    playerStats: PlayerStats;
    currentHealth: number;
    currentShield: number;
    relics?: string[]; // (3A) relic ids held this run
    timeRemaining: number;
    wave: number;
    waveKills?: number;
    waveQuota?: number;
    currentPhrase: string;
    darknessPhrase?: string;
    touch?: boolean;      // (7A) touch controls on → keep the bottom strip clear of the joysticks
    bossActive?: boolean; // (7A) boss bar occupies the top-centre row
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
    relics = [],
    timeRemaining,
    wave,
    waveKills = 0,
    waveQuota = 0,
    currentPhrase,
    darknessPhrase,
    touch = false,
    bossActive = false,
    maturity
}) => {
    return (
        <div id="run-hud" className="absolute pointer-events-none z-10"
             style={{ top: 'env(safe-area-inset-top, 0px)', left: 'env(safe-area-inset-left, 0px)', right: 'env(safe-area-inset-right, 0px)', bottom: 'env(safe-area-inset-bottom, 0px)' }}>
            {/* Top Left: Health & Shield (7A: low-contrast plate, compact on phones) */}
            <div id="hud-vitals" className="absolute top-3 left-3 md:top-6 md:left-6 flex flex-col gap-2 md:gap-3 rounded-lg bg-black/35 backdrop-blur-sm border border-white/10 px-3 py-2 max-w-[46vw]">
                <div className="flex gap-1.5 md:gap-2 flex-wrap max-w-[240px]">
                    {Array.from({ length: playerStats.maxHealth }).map((_, i) => {
                        const isHealthFilled = i < currentHealth;
                        const isShielded = i < currentShield;
                        
                        return (
                            <div key={i} className="relative w-4 h-4 md:w-5 md:h-5 flex items-center justify-center">
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
                {/* (3A) Relics held this run — small glyph chips, hover/long-press shows the effect */}
                {relics.length > 0 && (
                    <div id="relic-hud" className="flex gap-1.5 flex-wrap max-w-[260px]">
                        {relics.map(id => {
                            const r = relicById(id); if (!r) return null;
                            return (
                                <motion.div key={id} title={`${r.name} — ${r.desc}`}
                                    {...({ initial: { scale: 0, opacity: 0 }, animate: { scale: 1, opacity: 1 } } as any)}
                                    className="w-6 h-6 md:w-7 md:h-7 rounded-md border flex items-center justify-center font-mono text-xs md:text-sm font-bold select-none"
                                    style={{ color: r.color, borderColor: r.color + '88', background: r.color + '1a', boxShadow: `0 0 10px ${r.color}55` }}>
                                    {r.glyph}
                                </motion.div>
                            );
                        })}
                    </div>
                )}
                <div className="font-tech text-[9px] md:text-[10px] tracking-[0.3em] text-white/40 uppercase hidden md:block">Light integrity cells</div>
            </div>

            {/* Top Center: Timer & Wave (7A: plate; shrinks when the boss bar owns the row) */}
            <div id="hud-wave" className={`absolute left-1/2 -translate-x-1/2 text-center rounded-lg bg-black/35 backdrop-blur-sm border border-white/10 px-4 py-1.5 transition-all ${bossActive ? 'top-2 scale-75 md:scale-90 origin-top' : 'top-3 md:top-6'}`}>
                <div className="text-2xl md:text-4xl font-bold font-tech text-white tabular-nums drop-shadow-lg leading-none">{Math.ceil(timeRemaining)}</div>
                <div className="text-[10px] tracking-[0.4em] text-purple-400 font-tech mt-1">WAVE {wave}</div>
                <div id="wave-kills" className="text-[10px] tracking-[0.2em] text-white/50 font-tech tabular-nums">
                    {Math.min(waveKills, waveQuota)}/{waveQuota} <span className="text-white/25">KILLS</span>
                </div>
            </div>

            {/* Bottom Center: Phrases (7A: with touch controls the joysticks own 96–224 px, so sit in the free bottom strip) */}
            <div id="hud-phrases" className={`absolute left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 md:gap-2 text-center ${touch ? 'bottom-3 max-w-[56vw]' : 'bottom-16 max-w-[80vw]'}`}>
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
                        className={`font-tech ${touch ? 'text-xs' : 'text-sm md:text-lg'} text-white/80 drop-shadow-[0_0_10px_rgba(255,255,255,0.5)] italic tracking-widest`}
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
                            className={`font-serif ${touch ? 'text-[10px]' : 'text-xs md:text-sm'} text-slate-500 italic tracking-widest uppercase`}
                        >
                            {darknessPhrase}
                        </motion.div>
                    </AnimatePresence>
                )}
            </div>

            {/* Bottom Right: Maturity/Growth Status */}
            <div id="hud-maturity" className={`absolute bottom-6 right-6 text-right ${touch ? 'hidden' : 'hidden md:block'}`}>
                <div className="font-tech text-xl drop-shadow-lg" style={{ color: maturity.color }}>{maturity.title}</div>
                <div className="text-[10px] text-white/30 uppercase tracking-[0.2em] font-tech">Maturity Rank {maturity.level}</div>
            </div>
        </div>
    );
};

export default GameOverlay;
