import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Zap, Heart, Wind, FastForward, Compass, Gem, Flame,
    Shield, Snowflake, Sparkles, Sun, Clock, Crown, Activity, RefreshCw, Ban
} from 'lucide-react';
import { Boon, BOON_CONFIG, RARITY_STYLES, BoonTag } from '../data/boons';
import { t } from '../translate';
import { audio } from './game/audio';

interface BoonDraftProps {
    offeredBoons: Boon[];
    onPick: (boon: Boon) => void;
    onReroll: () => void;
    onBanish: (boonId: string) => void;
    freeRerollsRemaining: number;
    banishesRemaining: number;
    currentEssence: number;
    fastWaves?: boolean;
    lang?: 'en' | 'es';
    uiTextSize?: 'NORMAL' | 'LARGE' | 'HUGE';
}

const TAG_COLORS: Record<BoonTag, string> = {
    FIRE: 'bg-orange-950/90 text-orange-300 border-orange-500/40',
    ICE: 'bg-sky-950/90 text-sky-300 border-sky-400/40',
    STORM: 'bg-indigo-950/90 text-indigo-300 border-indigo-400/40',
    DASH: 'bg-emerald-950/90 text-emerald-300 border-emerald-400/40',
    DEFENSE: 'bg-amber-950/90 text-amber-300 border-amber-400/40',
    ECONOMY: 'bg-fuchsia-950/90 text-fuchsia-300 border-fuchsia-400/40'
};

function renderBoonIcon(iconName: string, className: string) {
    switch (iconName) {
        case 'Heart': return <Heart className={className} />;
        case 'Wind': return <Wind className={className} />;
        case 'FastForward': return <FastForward className={className} />;
        case 'Compass': return <Compass className={className} />;
        case 'Gem': return <Gem className={className} />;
        case 'Flame': return <Flame className={className} />;
        case 'Shield': return <Shield className={className} />;
        case 'Snowflake': return <Snowflake className={className} />;
        case 'Sparkles': return <Sparkles className={className} />;
        case 'Sun': return <Sun className={className} />;
        case 'Clock': return <Clock className={className} />;
        case 'Crown': return <Crown className={className} />;
        case 'Activity': return <Activity className={className} />;
        default: return <Zap className={className} />;
    }
}

const BoonDraft: React.FC<BoonDraftProps> = ({
    offeredBoons,
    onPick,
    onReroll,
    onBanish,
    freeRerollsRemaining,
    banishesRemaining,
    currentEssence,
    fastWaves = false,
    lang = 'en',
    uiTextSize = 'NORMAL'
}) => {
    const [autoPickProgress, setAutoPickProgress] = useState(0);
    const titleSizeClass = uiTextSize === 'HUGE' ? 'text-lg sm:text-xl' : uiTextSize === 'LARGE' ? 'text-base sm:text-lg' : 'text-base sm:text-lg';
    const descSizeClass = uiTextSize === 'HUGE' ? 'text-sm sm:text-base' : uiTextSize === 'LARGE' ? 'text-xs sm:text-sm' : 'text-xs sm:text-sm';

    // With "Fast waves" on, an 8 s ring auto-picks the left card
    useEffect(() => {
        if (!fastWaves || offeredBoons.length === 0) {
            setAutoPickProgress(0);
            return;
        }
        const start = performance.now();
        const totalMs = (BOON_CONFIG.fastWaveAutoPickFrames / 60) * 1000;
        const interval = window.setInterval(() => {
            const elapsed = performance.now() - start;
            const pct = Math.min(1, elapsed / totalMs);
            setAutoPickProgress(pct);
            if (pct >= 1) {
                window.clearInterval(interval);
                audio.playBoonPickStinger();
                onPick(offeredBoons[0]);
            }
        }, 50);
        return () => window.clearInterval(interval);
    }, [fastWaves, offeredBoons, onPick]);

    if (!offeredBoons || offeredBoons.length === 0) return null;

    const canAffordReroll = freeRerollsRemaining > 0 || currentEssence >= BOON_CONFIG.rerollCostEssence;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[140] bg-slate-950/88 backdrop-blur-md flex flex-col items-center justify-center p-4 select-none overflow-y-auto"
            >
                <div className="max-w-4xl w-full flex flex-col items-center gap-4 my-auto">
                    {/* Header */}
                    <div className="text-center space-y-1">
                        <div className="text-[10px] font-mono uppercase tracking-[0.35em] text-cyan-400 font-bold">
                            {t('ASTRAL CONVERGENCE', lang)}
                        </div>
                        <h2 className="text-2xl sm:text-3xl font-tech font-black text-white tracking-widest uppercase">
                            {t('CHOOSE A CELESTIAL BOON', lang)}
                        </h2>
                    </div>

                    {/* 3 Big Boon Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 w-full">
                        {offeredBoons.map((boon, idx) => {
                            const style = RARITY_STYLES[boon.rarity];
                            const isLeftCard = idx === 0;
                            return (
                                <motion.div
                                    key={boon.id}
                                    initial={{ opacity: 0, y: 20, scale: 0.95 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    transition={{ delay: idx * 0.08 }}
                                    className={`relative rounded-2xl border-2 ${style.border} bg-gradient-to-b ${style.bg} ${style.glow} p-4 flex flex-col justify-between gap-3 transition-transform hover:scale-[1.02]`}
                                >
                                    {/* Top Row: Rarity Badge & Fast-Wave 8s Auto-Pick Ring on Left Card */}
                                    <div className="flex items-center justify-between gap-2">
                                        <span className={`text-[9px] font-mono uppercase tracking-widest px-2.5 py-0.5 rounded-full border font-bold ${style.badge}`}>
                                            {t(boon.rarity.toUpperCase(), lang)}
                                        </span>

                                        {fastWaves && isLeftCard && (
                                            <div className="flex items-center gap-1.5 text-[10px] font-mono text-cyan-300" title="Auto-pick timer">
                                                <svg className="w-5 h-5 -rotate-90" viewBox="0 0 24 24">
                                                    <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" fill="none" className="opacity-20" />
                                                    <circle
                                                        cx="12"
                                                        cy="12"
                                                        r="9"
                                                        stroke="currentColor"
                                                        strokeWidth="2.5"
                                                        fill="none"
                                                        strokeDasharray={56.5}
                                                        strokeDashoffset={56.5 * (1 - autoPickProgress)}
                                                    />
                                                </svg>
                                                <span>{Math.max(1, Math.ceil((1 - autoPickProgress) * 8))}s</span>
                                            </div>
                                        )}
                                    </div>

                                    {/* Center Icon & Name & Description */}
                                    <button
                                        type="button"
                                        onClick={() => {
                                            audio.playBoonPickStinger();
                                            onPick(boon);
                                        }}
                                        className="flex-1 flex flex-col items-center text-center gap-2.5 py-2 cursor-pointer focus:outline-none min-h-[140px] justify-center"
                                    >
                                        <div className={`w-12 h-12 rounded-2xl border ${style.border} bg-slate-950/80 flex items-center justify-center ${style.text}`}>
                                            {renderBoonIcon(boon.icon, 'w-6 h-6')}
                                        </div>

                                        <div className={`font-tech font-extrabold ${titleSizeClass} tracking-wider uppercase ${style.text}`}>
                                            {t(boon.name, lang)}
                                        </div>

                                        <p className={`${descSizeClass} text-slate-200 font-sans leading-relaxed px-1`}>
                                            {boon.desc(lang)}
                                        </p>
                                    </button>

                                    {/* Tag Chips & Banish Action */}
                                    <div className="flex flex-col gap-2 pt-2 border-t border-slate-800/80">
                                        <div className="flex flex-wrap items-center justify-center gap-1.5">
                                            {boon.tags.map(tag => (
                                                <span
                                                    key={tag}
                                                    className={`text-[9px] font-mono uppercase tracking-widest px-2 py-0.5 rounded border font-bold ${TAG_COLORS[tag]}`}
                                                >
                                                    {t(tag, lang)}
                                                </span>
                                            ))}
                                        </div>

                                        <div className="flex items-center gap-2 mt-1">
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    audio.playBoonPickStinger();
                                                    onPick(boon);
                                                }}
                                                className="flex-1 min-h-[48px] rounded-xl bg-white hover:bg-slate-100 text-slate-950 font-tech font-black text-xs uppercase tracking-widest transition-all active:scale-95 cursor-pointer shadow-md"
                                            >
                                                {t('SELECT', lang)}
                                            </button>

                                            {banishesRemaining > 0 && offeredBoons.length > 1 && (
                                                <button
                                                    type="button"
                                                    onClick={() => onBanish(boon.id)}
                                                    title={t('Banish Boon', lang)}
                                                    className="min-h-[48px] min-w-[48px] px-2.5 rounded-xl bg-rose-950/60 hover:bg-rose-900/80 border border-rose-500/40 text-rose-300 flex items-center justify-center transition-all active:scale-95 cursor-pointer"
                                                >
                                                    <Ban className="w-4 h-4" />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </motion.div>
                            );
                        })}
                    </div>

                    {/* Footer Controls: Reroll & Banish Info */}
                    <div className="flex flex-wrap items-center justify-center gap-4 pt-1">
                        <button
                            type="button"
                            disabled={!canAffordReroll}
                            onClick={onReroll}
                            className={`min-h-[48px] px-6 rounded-xl font-tech font-bold text-xs uppercase tracking-widest flex items-center gap-2 border transition-all cursor-pointer ${
                                canAffordReroll
                                    ? 'bg-slate-900 hover:bg-slate-800 border-cyan-500/50 text-cyan-300 shadow-[0_0_15px_rgba(34,211,238,0.2)] active:scale-95'
                                    : 'bg-slate-950 border-slate-800 text-slate-600 opacity-50 cursor-not-allowed'
                            }`}
                        >
                            <RefreshCw className="w-4 h-4" />
                            {freeRerollsRemaining > 0
                                ? `${t('REROLL (FREE)', lang)}`
                                : `${t('REROLL', lang)} (${BOON_CONFIG.rerollCostEssence} ✦)`}
                        </button>

                        <div className="text-xs font-mono text-slate-400 flex items-center gap-3">
                            <span>{t('Banishes Left:', lang)} <strong className="text-rose-400">{banishesRemaining}</strong></span>
                            <span>•</span>
                            <span>{t('Essence:', lang)} <strong className="text-amber-300">{currentEssence} ✦</strong></span>
                        </div>
                    </div>
                </div>
            </motion.div>
        </AnimatePresence>
    );
};

export default BoonDraft;
