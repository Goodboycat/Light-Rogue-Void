// (M0) MAIN MENU — destroyed and rebuilt. The menu IS a film: `menu_loop` (cinematic/scenes/menu_loop.ts) renders the
// title, the spark, the ridge, the embers and the Eye on its own canvas (CinematicPlayer, passive, z-0). This file is
// only the THIN UI LAYER on top: start, star chart, daily, settings, guide, dev note, demo card. Same props as before.
// No framer-motion, no Tailwind cards with blur boxes; glass strips with hairlines in the film palette (amber on umber).
import React, { useState } from 'react';
import { Play, Settings, MessageSquare, X, Mail, BookOpen, Map as MapIcon } from 'lucide-react';
import { CHAPTERS, WAVES_PER_CHAPTER, IS_DEMO, DEMO_MAX_WAVE } from './game/Constants';
import WorldMap, { isChapterUnlocked } from './WorldMap'; // (7C)
import MapReveal from './MapReveal'; // (7D)
import CinematicPlayer from './CinematicPlayer';
import { menu_loop } from '../cinematic/scenes/menu_loop';
import DailyCard from './DailyCard';
import DemoCard from './DemoCard'; // (9B)

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
    onStartDaily?: () => void; // (9A)
    /** (M0) when true the film layer is not mounted (the title_seam is playing on top; avoids two full-screen canvases) */
    filmHidden?: boolean;
}

const ICON_BTN = 'p-3 rounded-full border border-amber-200/20 bg-black/40 text-amber-100/70 hover:text-amber-50 hover:border-amber-200/60 hover:bg-black/60 transition-colors backdrop-blur-[2px]';

const MainMenu: React.FC<MainMenuProps> = ({
    onStart, onOpenSettings, onOpenGuide, maxWaveReached,
    defeatedBosses = [], treasuresOpened = [], onTreasure, onStartDaily, reduceFlash = false, revealsSeen, onRevealSeen,
    filmHidden = false,
}) => {
    const [showNote, setShowNote] = useState(false);
    const [showChart, setShowChart] = useState(false);
    // (7D) first unlocked place not yet revealed in the menu (place 0 never needs a reveal). Legacy saves see none.
    const [revealPlace, setRevealPlace] = useState<number>(() => {
        if (!revealsSeen) return -1;
        for (let i = 1; i < CHAPTERS.length; i++) if (isChapterUnlocked(i, maxWaveReached) && !revealsSeen.includes(CHAPTERS[i].bossId)) return i;
        return -1;
    });
    const [chapterIdx, setChapterIdx] = useState(0);
    const chapterFirstWave = (i: number) => i * WAVES_PER_CHAPTER + 1;
    const chapterUnlocked = (i: number) => isChapterUnlocked(i, maxWaveReached);
    const startWave = chapterFirstWave(chapterIdx);
    const ch = CHAPTERS[chapterIdx];
    const hasChart = maxWaveReached > 1;
    const chartOpen = hasChart && (showChart || revealPlace >= 0);

    return (
        <div id="main-menu" className="absolute inset-0 overflow-hidden select-none">
            {/* THE FILM — menu_loop behind everything, passive (no skip), cues on (AudioManager gates on settings) */}
            {!filmHidden && <CinematicPlayer scene={menu_loop} passive z={0} />}

            {/* THIN UI LAYER */}
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-end text-center px-4 pb-[max(1.25rem,env(safe-area-inset-bottom))]">

                {/* top-left: dev note */}
                <div className="absolute top-[max(1.25rem,env(safe-area-inset-top))] left-[max(1.25rem,env(safe-area-inset-left))]">
                    <button onClick={() => setShowNote(true)} className={ICON_BTN} title="Developer Note" id="devnote-button">
                        <MessageSquare size={20} />
                    </button>
                </div>
                {/* top-right: guide + settings */}
                <div className="absolute top-[max(1.25rem,env(safe-area-inset-top))] right-[max(1.25rem,env(safe-area-inset-right))] flex gap-2">
                    {onOpenGuide && <button id="guidebook-button" onClick={onOpenGuide} className={ICON_BTN} title="Guidebook"><BookOpen size={20} /></button>}
                    <button id="settings-button" onClick={onOpenSettings} className={ICON_BTN} title="System Settings"><Settings size={20} /></button>
                </div>

                {IS_DEMO && (
                    <div className="absolute top-[max(1.25rem,env(safe-area-inset-top))] left-1/2 -translate-x-1/2 border border-amber-400/40 text-amber-300 bg-black/40 px-3 py-1 rounded font-mono text-[10px] tracking-[0.3em] uppercase">
                        Demo · Max wave {DEMO_MAX_WAVE}
                    </div>
                )}

                {/* bottom stack: chart (collapsible) · daily · demo · START */}
                <div className="w-full max-w-md md:max-w-xl flex flex-col items-center gap-3">
                    {chartOpen && (
                        <section id="chapter-select" className="w-full rounded-lg border border-amber-200/15 bg-[#0b0704]/80 p-2 backdrop-blur-[2px] shadow-[0_0_40px_rgba(0,0,0,0.6)]">
                            <div className="flex items-center justify-between px-1 mb-1">
                                <span className="text-[10px] text-amber-100/50 font-tech uppercase tracking-[0.25em]">Star chart · 10 waves a place · boss at the 10th</span>
                                {revealPlace < 0 && <button onClick={() => setShowChart(false)} className="text-amber-100/50 hover:text-amber-50" title="Close chart"><X size={14} /></button>}
                            </div>
                            <div className="w-full" style={{ aspectRatio: '1024 / 683' }}>
                                {revealPlace >= 0 ? (
                                    <MapReveal place={revealPlace} maxWaveReached={chapterFirstWave(revealPlace) - 1} defeatedBosses={defeatedBosses}
                                        treasuresOpened={treasuresOpened} reduceFlash={reduceFlash}
                                        onDone={() => { onRevealSeen?.(CHAPTERS[revealPlace].bossId); setRevealPlace(-1); setShowChart(true); }} />
                                ) : (
                                    <WorldMap maxWaveReached={maxWaveReached} defeatedBosses={defeatedBosses} current={chapterIdx}
                                        onSelect={(i) => { if (chapterUnlocked(i)) setChapterIdx(i); }}
                                        treasuresOpened={treasuresOpened} onTreasure={onTreasure} reduceFlash={reduceFlash} />
                                )}
                            </div>
                        </section>
                    )}

                    {onStartDaily && hasChart && <DailyCard onStartDaily={onStartDaily} />}{/* (9A) */}
                    {IS_DEMO && <DemoCard variant="menu" />}{/* (9B) */}

                    {/* START row */}
                    <div className="w-full flex items-stretch gap-2">
                        {hasChart && (
                            <button id="chart-toggle" onClick={() => setShowChart(v => !v)} title="Star chart — pick a place"
                                className={`px-4 rounded-full border transition-colors flex items-center gap-2 font-tech text-[11px] tracking-[0.2em] ${chartOpen ? 'border-amber-300/70 text-amber-200 bg-amber-300/10' : 'border-amber-200/25 text-amber-100/70 bg-black/40 hover:border-amber-200/60'}`}>
                                <MapIcon size={16} /><span className="hidden sm:inline">CHART</span>
                            </button>
                        )}
                        <button id="start-button" onClick={() => onStart(startWave)}
                            className="flex-1 px-10 py-4 rounded-full bg-[#fde68a] hover:bg-[#fff1b8] text-[#1a0e06] font-tech font-bold text-lg tracking-[0.3em] shadow-[0_0_40px_rgba(251,191,36,0.35)] hover:shadow-[0_0_70px_rgba(251,191,36,0.6)] transition-all flex items-center justify-center gap-3 active:scale-[0.98]">
                            <Play fill="currentColor" size={20} />
                            {hasChart ? 'STAY LIT' : 'BEGIN'}
                        </button>
                    </div>
                    <div className="font-mono text-[10px] tracking-[0.25em] uppercase" style={{ color: ch.color }}>
                        {String(ch.id).padStart(2, '0')} · {ch.name} · waves {startWave}–{ch.bossWave}
                        <span className="text-amber-100/35"> · record {maxWaveReached}</span>
                    </div>
                </div>

                {/* footer */}
                <div className="absolute bottom-[max(0.75rem,env(safe-area-inset-bottom))] right-[max(1rem,env(safe-area-inset-right))] text-right hidden md:block">
                    <div className="text-[10px] font-mono text-amber-100/25">BEATO FORGE · GOODBOYCAT</div>
                    <a href="mailto:goodboykitty2@gmail.com" className="text-[10px] font-mono text-amber-100/20 hover:text-amber-200 transition-colors mt-0.5 flex items-center gap-1 justify-end">
                        <Mail size={10} /> goodboykitty2@gmail.com
                    </a>
                </div>
                <div className="absolute bottom-[max(0.75rem,env(safe-area-inset-bottom))] left-[max(1rem,env(safe-area-inset-left))] text-left hidden md:block text-[10px] font-mono text-amber-100/25 tracking-widest">
                    WASD / STICK · SPACE DASH · E BURST
                </div>
            </div>

            {/* dev note popup */}
            {showNote && (
                <div className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setShowNote(false)}>
                    <div className="bg-[#0b0704] border border-amber-200/20 p-8 rounded-xl max-w-md w-full relative shadow-2xl" onClick={e => e.stopPropagation()}>
                        <button onClick={() => setShowNote(false)} className="absolute top-4 right-4 text-amber-100/40 hover:text-amber-50 transition-colors"><X size={22} /></button>
                        <h2 className="text-xl font-tech text-amber-100 mb-4 tracking-[0.2em] flex items-center gap-3"><MessageSquare className="text-amber-300" size={20} />DEV NOTE</h2>
                        <div className="space-y-3 text-amber-50/80 font-light leading-relaxed text-sm">
                            <p>Hi, I'm <strong className="text-amber-100">Goodboycat</strong>.</p>
                            <p>Thank you for playing <strong>Light Rogue Void</strong>. This is a passion project.</p>
                            <p>Feedback or just a hello: <span className="text-amber-300 font-mono text-xs">goodboykitty2@gmail.com</span></p>
                            <p className="pt-3 text-xs text-amber-100/40 border-t border-amber-200/10 italic">"Be the spark that refuses to fade."</p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MainMenu;
