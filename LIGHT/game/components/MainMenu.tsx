
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Settings, MessageSquare, X, Mail, BookOpen } from 'lucide-react';
import { CHAPTERS, WAVES_PER_CHAPTER, IS_DEMO, DEMO_MAX_WAVE } from './game/Constants';
import WorldMap, { isChapterUnlocked } from './WorldMap'; // (7C)
import MapReveal from './MapReveal'; // (7D)

interface MainMenuProps {
    onStart: (wave: number) => void;
    onOpenSettings: () => void;
    onOpenGuide?: () => void; // (7A step 5)
    maxWaveReached: number;
    onAddMatter: (amount: number) => void;
    currentMatter: number;
    onUnlockAll: () => void;
    hasSeenIntro: boolean;
    // (7C) world map
    defeatedBosses?: string[];
    treasuresOpened?: string[];
    onTreasure?: (id: string, matter: number) => void;
    reduceFlash?: boolean;
    // (7D) place-reveal cinematic once per newly unlocked place (gameState.mapRevealsSeen)
    revealsSeen?: string[];
    onRevealSeen?: (id: string) => void;
}

const MainMenu: React.FC<MainMenuProps> = ({ 
    onStart, 
    onOpenSettings, 
    onOpenGuide,
    maxWaveReached,
    // Props kept for interface compatibility but unused in UI now
    onAddMatter,
    onUnlockAll,
    hasSeenIntro,
    defeatedBosses = [],
    treasuresOpened = [],
    onTreasure,
    reduceFlash = false,
    revealsSeen,
    onRevealSeen,
}) => {
    const [showNote, setShowNote] = useState(false);
    // (7D) first unlocked place not yet revealed in the menu (place 0 never needs a reveal; the in-run
    // MapBreather already revealed it when `revealsSeen` carries the id). Legacy saves (undefined) see none.
    const [revealPlace, setRevealPlace] = useState<number>(() => {
        if (!revealsSeen) return -1;
        for (let i = 1; i < CHAPTERS.length; i++) if (isChapterUnlocked(i, maxWaveReached) && !revealsSeen.includes(CHAPTERS[i].bossId)) return i;
        return -1;
    });
    // (3B) chapter time-skip: a chapter is unlocked once you've reached its first wave.
    const [chapterIdx, setChapterIdx] = useState(0);
    const chapterFirstWave = (i: number) => i * WAVES_PER_CHAPTER + 1;
    const chapterUnlocked = (i: number) => isChapterUnlocked(i, maxWaveReached);
    const startWave = chapterFirstWave(chapterIdx);
    
    const handleStart = () => {
        onStart(startWave);
    };

    return (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center min-h-screen text-center p-4 overflow-hidden">
            
            {/* --- TOP LEFT: DEV NOTE --- */}
            <div className="absolute top-6 left-6 z-[100]">
                <button 
                    onClick={() => setShowNote(true)}
                    className="p-3 bg-slate-900/90 hover:bg-slate-800 border-2 border-slate-700 hover:border-white rounded-full text-slate-400 hover:text-white transition-all shadow-[0_0_15px_rgba(0,0,0,0.5)] hover:shadow-[0_0_20px_rgba(255,255,255,0.4)] group"
                    title="Developer Note"
                >
                    <MessageSquare size={24} className="group-hover:scale-110 transition-transform duration-300" />
                </button>
            </div>

            {/* --- TOP RIGHT: GUIDEBOOK + SETTINGS --- */}
            <div className="absolute top-6 right-6 z-[100] flex gap-3">
                {onOpenGuide && (
                    <button 
                        id="guidebook-button"
                        onClick={onOpenGuide}
                        className="p-3 bg-slate-900/90 hover:bg-slate-800 border-2 border-slate-700 hover:border-cyan-400 rounded-full text-slate-400 hover:text-white transition-all shadow-[0_0_15px_rgba(0,0,0,0.5)]"
                        title="Guidebook"
                    >
                        <BookOpen size={24} />
                    </button>
                )}
                <button 
                    onClick={onOpenSettings}
                    className="p-3 bg-slate-900/90 hover:bg-slate-800 border-2 border-slate-700 hover:border-white rounded-full text-slate-400 hover:text-white transition-all shadow-[0_0_15px_rgba(0,0,0,0.5)] hover:shadow-[0_0_20px_rgba(255,255,255,0.4)] group"
                    title="System Settings"
                >
                    <Settings size={24} className="group-hover:rotate-90 transition-transform duration-500" />
                </button>
            </div>

            {/* --- CENTER: TITLE --- */}
            <motion.div 
                {...({
                    initial: { opacity: 0, scale: 0.9 },
                    animate: { opacity: 1, scale: 1 },
                    transition: { duration: 1.5, ease: "easeOut" }
                } as any)}
                className="mb-12 relative z-10 flex flex-col items-center"
            >
                {/* LIGHT SYMBOLISM */}
                <div className="relative group mb-4">
                    <motion.h1 
                        className="text-7xl md:text-9xl font-tech font-bold text-white tracking-tighter relative z-10"
                        style={{ textShadow: "0 0 30px rgba(255,255,255,0.6)" }}
                        {...({
                            animate: { 
                                textShadow: [
                                    "0 0 30px rgba(255,255,255,0.6)", 
                                    "0 0 80px rgba(255,255,255,0.9)", 
                                    "0 0 30px rgba(255,255,255,0.6)"
                                ] 
                            },
                            transition: { duration: 3, repeat: Infinity, ease: "easeInOut" }
                        } as any)}
                    >
                        LIGHT
                    </motion.h1>
                    <div className="absolute inset-0 bg-white/30 blur-[60px] rounded-full opacity-60 animate-pulse" />
                </div>
                
                {/* VS / CONNECTOR */}
                <div className="flex items-center gap-4 opacity-50 mb-4">
                    <div className="h-px w-24 bg-gradient-to-r from-transparent to-purple-400" />
                    <span className="font-mono text-xs tracking-[0.5em] text-purple-200 uppercase">Rogue</span>
                    <div className="h-px w-24 bg-gradient-to-l from-transparent to-purple-400" />
                </div>

                {/* VOID SYMBOLISM */}
                <div className="relative">
                     <motion.h1 
                        className="text-6xl md:text-9xl font-tech font-bold text-black tracking-tighter relative z-10"
                        style={{ 
                            WebkitTextStroke: '1px rgba(148, 163, 184, 0.5)', 
                        }}
                    >
                        VOID
                    </motion.h1>
                </div>

                {IS_DEMO && (
                    <motion.div 
                        {...({
                            initial: { opacity: 0, y: -20 },
                            animate: { opacity: 1, y: 0 }
                        } as any)}
                        className="mt-4 bg-amber-500/10 border border-amber-500/50 text-amber-400 px-4 py-1 rounded font-mono text-xs tracking-widest uppercase"
                    >
                        Demo Version • Max Wave {DEMO_MAX_WAVE}
                    </motion.div>
                )}
            </motion.div>

            {/* --- CONTROLS SECTION --- */}
            <motion.div 
                {...({
                    initial: { opacity: 0, y: 30 },
                    animate: { opacity: 1, y: 0 },
                    transition: { delay: 0.5 }
                } as any)}
                className="relative z-10 mt-4 flex flex-col items-center gap-4 w-full max-w-md md:max-w-2xl"
            >
                {/* (7C) WORLD MAP — chapter select (replaces the 3B cards) */}
                {maxWaveReached > 1 && (
                    <section id="chapter-select" className="w-full bg-slate-900/70 p-2 rounded-xl border border-slate-700 backdrop-blur-sm shadow-xl">
                        <label className="text-[10px] text-slate-400 font-tech mb-1 block uppercase tracking-[0.2em] text-center">
                            Star Chart — pick a place · 10 waves each, boss at the 10th
                        </label>
                        <div className="w-full" style={{ aspectRatio: '1024 / 683' }}>
                            {revealPlace >= 0 ? (
                            <MapReveal
                                place={revealPlace}
                                maxWaveReached={chapterFirstWave(revealPlace) - 1}
                                defeatedBosses={defeatedBosses}
                                treasuresOpened={treasuresOpened}
                                reduceFlash={reduceFlash}
                                onDone={() => { onRevealSeen?.(CHAPTERS[revealPlace].bossId); setRevealPlace(-1); }}
                            />
                            ) : (
                            <WorldMap
                                maxWaveReached={maxWaveReached}
                                defeatedBosses={defeatedBosses}
                                current={chapterIdx}
                                onSelect={(i) => { if (chapterUnlocked(i)) setChapterIdx(i); }}
                                treasuresOpened={treasuresOpened}
                                onTreasure={onTreasure}
                                reduceFlash={reduceFlash}
                            />
                            )}
                        </div>
                        <div className="mt-1 font-mono text-[10px]" style={{ color: CHAPTERS[chapterIdx].color }}>
                            {String(CHAPTERS[chapterIdx].id).padStart(2, '0')} · {CHAPTERS[chapterIdx].name.toUpperCase()} · WAVES {startWave}–{CHAPTERS[chapterIdx].bossWave}
                        </div>
                    </section>
                )}

                <div className="relative w-full">
                    {/* START BUTTON */}
                    <button 
                        onClick={handleStart}
                        className="w-full px-12 py-5 bg-white hover:bg-slate-200 text-black font-tech font-bold text-xl tracking-[0.25em] rounded-full shadow-[0_0_30px_rgba(255,255,255,0.3)] hover:shadow-[0_0_50px_rgba(255,255,255,0.6)] transition-all flex items-center justify-center gap-4 group hover:scale-105 active:scale-95"
                    >
                        <Play fill="currentColor" size={24} />
                        INITIALIZE
                    </button>

                    {/* WASD INSTRUCTION (Side) */}
                    <motion.div 
                        {...({
                            initial: { opacity: 0, x: -10 },
                            animate: { opacity: 1, x: 0 },
                            transition: { delay: 1 }
                        } as any)}
                        className="hidden md:flex absolute left-full top-1/2 -translate-y-1/2 ml-6 flex-col items-start pointer-events-none"
                    >
                        <div className="flex gap-1 mb-2">
                            {['W', 'A', 'S', 'D'].map(key => (
                                <div key={key} className="w-6 h-6 border border-slate-600 rounded flex items-center justify-center text-[10px] font-mono text-slate-400 bg-slate-900/50">
                                    {key}
                                </div>
                            ))}
                        </div>
                        <div className="text-[9px] text-slate-500 font-mono tracking-widest uppercase w-full text-center">
                            TO MOVE
                        </div>
                    </motion.div>
                </div>
            </motion.div>
            
            <div className="mt-8 text-slate-600 font-mono text-[10px] tracking-widest">
                MAX WAVE RECORD: <span className="text-white">{maxWaveReached}</span>
            </div>
            
            {/* FOOTER */}
            <div className="absolute bottom-4 right-4 text-right">
                <div className="text-[10px] font-mono text-slate-700">DEV: Goodboycat</div>
                <a 
                    href="mailto:goodboykitty2@gmail.com" 
                    className="text-[10px] font-mono text-slate-800 hover:text-purple-400 transition-colors block mt-1 flex items-center gap-1 justify-end"
                >
                    <Mail size={10} />
                    goodboykitty2@gmail.com
                </a>
            </div>

            {/* --- NOTE POPUP --- */}
            <AnimatePresence>
                {showNote && (
                    <div className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
                        <motion.div
                            {...({
                                initial: { opacity: 0, scale: 0.95 },
                                animate: { opacity: 1, scale: 1 },
                                exit: { opacity: 0, scale: 0.95 }
                            } as any)}
                            className="bg-slate-900 border border-slate-700 p-8 rounded-2xl max-w-md w-full relative shadow-2xl"
                        >
                            <button 
                                onClick={() => setShowNote(false)}
                                className="absolute top-4 right-4 text-slate-500 hover:text-white transition-colors"
                            >
                                <X size={24} />
                            </button>

                            <h2 className="text-2xl font-tech text-white mb-4 tracking-wider flex items-center gap-3">
                                <MessageSquare className="text-purple-400" />
                                DEV NOTE
                            </h2>
                            
                            <div className="space-y-4 text-slate-300 font-light leading-relaxed text-sm md:text-base">
                                <p>
                                    Hi, I'm <strong className="text-white">Goodboycat</strong>.
                                </p>
                                <p>
                                    Thank you for playing <strong>Light Rogue Void</strong>. This project is a passion project of mine.
                                </p>
                                <p>
                                    If you have any feedback or just want to say hi, please feel free to reach out to me at:
                                </p>
                                <p className="text-purple-400 font-mono text-xs">
                                    goodboykitty2@gmail.com
                                </p>
                                <p className="pt-4 text-xs text-slate-500 border-t border-slate-800 italic">
                                    "Be the spark that refuses to fade."
                                </p>
                            </div>

                            <div className="mt-8 text-center">
                                <button
                                    onClick={() => setShowNote(false)}
                                    className="px-6 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg font-tech text-xs tracking-widest transition-colors border border-slate-600"
                                >
                                    CLOSE TRANSMISSION
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default MainMenu;
