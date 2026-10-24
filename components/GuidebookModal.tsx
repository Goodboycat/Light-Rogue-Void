/* PATCH: STEP-6 progressive-guidebook — Modal rewritten to derive discovered
 * entries from GameState + PlayerStats instead of a hard-coded manual. Entries
 * lock/unlock automatically as the player uses each mechanic. */
import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    X, BookOpen, Compass, Shield, Zap, Sparkles, Cpu, Crosshair,
    RotateCcw, Flame, Snowflake, Target, Wind, CircleDot, FastForward,
    Sun, CircleDashed, Swords, CircleOff, Waves, Gem, Pause, Skull, Lock, MapPin
} from 'lucide-react';
import { GameState, PlayerStats } from '../types';
import { t } from '../translate';
import { GUIDE_ENTRIES, GuideEntry, GuideEntryContext, computeDiscovered, GuideCategory } from '../data/guidebookEntries';

interface GuidebookModalProps {
    onClose: () => void;
    gameState: GameState;
    stats?: PlayerStats | null;
}

const ICON_MAP: Record<string, React.ComponentType<any>> = {
    Compass, Shield, Zap, Sparkles, Cpu, Crosshair, RotateCcw, Flame, Snowflake,
    Target, Wind, CircleDot, FastForward, Sun, CircleDashed, Swords, CircleOff,
    Waves, Gem, Pause, Skull, BookOpen, MapPin,
};

const renderIcon = (key: string, size = 16, className?: string) => {
    const C = ICON_MAP[key] || Sparkles;
    return <C size={size} className={className} />;
};

const GuidebookModal: React.FC<GuidebookModalProps> = ({ onClose, gameState, stats = null }) => {
    const lang = gameState?.settings?.language || 'en';
    const [activeTab, setActiveTab] = useState<GuideCategory>('directives');

    const ctx: GuideEntryContext = useMemo(() => ({
        gameState,
        stats,
        maxWaveReached: gameState.maxWaveReached || 1,
        discoveredIds: gameState.discoveredGuideEntries || [],
        hasVisitedStarChart: (gameState.visitedNodeIds?.length ?? 0) > 0,
        hasClearedTreasure: (gameState.treasureNodesCompleted ?? 0) > 0,
        hasReachedEvolutionMatrix: (gameState.unlockedAbilityIds?.length ?? 0) > 1,
    }), [gameState, stats]);

    const discovered = useMemo(() => computeDiscovered(ctx), [ctx]);

    const grouped = useMemo(() => {
        const g: Record<GuideCategory, GuideEntry[]> = { directives: [], evolution: [], lore: [], places: [] };
        for (const e of GUIDE_ENTRIES) g[e.category].push(e);
        return g;
    }, []);

    const totalDiscovered = discovered.size;
    const totalEntries = GUIDE_ENTRIES.length;
    const pct = Math.round((totalDiscovered / totalEntries) * 100);

    const tabs = [
        { id: 'directives' as const, label: t('DIRECTIVES', lang), icon: <Compass size={16} /> },
        { id: 'evolution'  as const, label: t('EVOLUTION', lang),  icon: <Cpu size={16} /> },
        { id: 'lore'       as const, label: t('COSMIC LORE', lang), icon: <BookOpen size={16} /> },
        { id: 'places'     as const, label: t('PLACES & EVENTS', lang), icon: <MapPin size={16} /> },
    ];

    const tabDiscoveredCount = (tab: GuideCategory) =>
        grouped[tab].filter(e => discovered.has(e.id)).length;

    return (
        <div className="fixed inset-0 z-[110] bg-slate-950/95 backdrop-blur-md flex items-center justify-center p-4">
            <motion.div
                {...({
                    initial: { opacity: 0, scale: 0.95 },
                    animate: { opacity: 1, scale: 1 },
                    exit: { opacity: 0, scale: 0.95 },
                    transition: { duration: 0.3 }
                } as any)}
                className="w-full max-w-2xl bg-slate-900 border border-slate-700 rounded-2xl shadow-[0_0_50px_rgba(255,255,255,0.1)] overflow-hidden flex flex-col h-[80vh]"
            >
                {/* HEADER */}
                <div className="p-6 border-b border-slate-800 bg-slate-950/40 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <BookOpen className="text-cyan-400 w-6 h-6 animate-pulse" />
                        <div>
                            <h2 className="text-xl font-tech font-extrabold text-white tracking-[0.2em]">{t('COSMIC MANUAL', lang)}</h2>
                            <p className="text-[10px] text-slate-500 font-mono uppercase tracking-widest mt-0.5">
                                {totalDiscovered} / {totalEntries} {t('entries recovered', lang)} · {pct}%
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1.5 hover:bg-slate-800 text-slate-500 hover:text-white rounded-lg transition-colors"
                        title={t("Close Manual", lang)}
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* PROGRESS BAR */}
                <div className="h-1 bg-slate-800/60 relative overflow-hidden">
                    <motion.div
                        className="h-full bg-gradient-to-r from-cyan-500 via-cyan-300 to-white shadow-[0_0_12px_rgba(34,211,238,0.9)]"
                        {...({
                            initial: { width: 0 },
                            animate: { width: `${pct}%` },
                            transition: { duration: 0.6, ease: 'easeOut' }
                        } as any)}
                    />
                </div>

                {/* TABS */}
                <div className="flex border-b border-slate-800/80 bg-slate-950/20 px-4">
                    {tabs.map((tab) => {
                        const isActive = activeTab === tab.id;
                        const count = tabDiscoveredCount(tab.id);
                        const total = grouped[tab.id].length;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`flex items-center gap-2 px-6 py-4 font-tech text-xs tracking-wider transition-all border-b-2 font-bold relative
                                    ${isActive
                                        ? 'border-cyan-400 text-cyan-400 bg-cyan-950/10'
                                        : 'border-transparent text-slate-500 hover:text-slate-300'
                                    }
                                `}
                            >
                                {tab.icon}
                                {tab.label}
                                <span className="ml-1 text-[10px] font-mono opacity-80">
                                    {count}/{total}
                                </span>
                                {isActive && (
                                    <motion.div
                                        layoutId="activeTabGlow"
                                        className="absolute bottom-[-2px] left-0 right-0 h-[2px] bg-cyan-400 shadow-[0_0_12px_rgba(34,211,238,1)]"
                                    />
                                )}
                            </button>
                        );
                    })}
                </div>

                {/* CONTENT AREA */}
                <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-3 custom-scrollbar text-slate-300 font-sans leading-relaxed text-sm">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={activeTab}
                            {...({
                                initial: { opacity: 0, y: 8 },
                                animate: { opacity: 1, y: 0 },
                                exit: { opacity: 0, y: -8 },
                                transition: { duration: 0.2 }
                            } as any)}
                            className="space-y-3"
                        >
                            {grouped[activeTab].map((entry) => {
                                const isOpen = discovered.has(entry.id);
                                return (
                                    <div
                                        key={entry.id}
                                        className={`rounded-xl border p-4 transition-all ${
                                            isOpen
                                                ? 'bg-slate-950/60 border-cyan-800/60 shadow-[0_0_18px_rgba(34,211,238,0.08)]'
                                                : 'bg-slate-950/30 border-slate-800/60'
                                        }`}
                                    >
                                        <div className="flex items-start gap-4">
                                            <div className={`shrink-0 w-10 h-10 rounded-lg flex items-center justify-center border ${
                                                isOpen
                                                    ? 'border-cyan-500/40 bg-cyan-950/30 text-cyan-300'
                                                    : 'border-slate-700 bg-slate-900/50 text-slate-600'
                                            }`}>
                                                {isOpen
                                                    ? renderIcon(entry.icon, 18)
                                                    : <Lock size={16} />
                                                }
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <div className={`font-tech font-bold text-xs tracking-wider uppercase ${
                                                        isOpen ? 'text-white' : 'text-slate-500'
                                                    }`}>
                                                        {isOpen ? t(entry.title, lang) : '??? ' + t(entry.title, lang).replace(/\S/g, '·')}
                                                    </div>
                                                    <span className={`text-[9px] font-mono uppercase tracking-widest px-1.5 py-0.5 rounded ${
                                                        isOpen
                                                            ? 'text-cyan-300 bg-cyan-950/40 border border-cyan-800/50'
                                                            : 'text-slate-600 bg-slate-900/50 border border-slate-800/60'
                                                    }`}>
                                                        {isOpen ? t('Recovered', lang) : t('Locked', lang)}
                                                    </span>
                                                </div>
                                                <p className={`mt-2 text-xs leading-relaxed ${
                                                    isOpen ? 'text-slate-300' : 'text-slate-500 italic'
                                                }`}>
                                                    {isOpen ? t(entry.body, lang) : t(entry.lockedHint, lang)}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </motion.div>
                    </AnimatePresence>
                </div>

                {/* FOOTER HINT */}
                <div className="px-6 py-3 border-t border-slate-800/60 bg-slate-950/40 text-[10px] font-mono text-slate-500 uppercase tracking-widest flex items-center justify-between">
                    <span>{t("Entries reveal as mechanics are used.", lang)}</span>
                    <span className="text-cyan-500/70">{totalDiscovered}/{totalEntries}</span>
                </div>
            </motion.div>
        </div>
    );
};

export default GuidebookModal;
