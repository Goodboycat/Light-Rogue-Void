import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Trophy, Share2, Check, ArrowRight, Sparkles, BookOpen, Zap } from 'lucide-react';
import { t } from '../translate';
import { formatShareResult, copyShareResultToClipboard } from './game/bossVictory';

interface BossRewardModalProps {
    bossId: string;
    bossName: string;
    matterEarned: number;
    fightTimeSec: number;
    damageTaken: number;
    attempts: number;
    lang?: 'en' | 'es';
    onContinue: () => void;
}

const BossRewardModal: React.FC<BossRewardModalProps> = ({
    bossId,
    bossName,
    matterEarned,
    fightTimeSec,
    damageTaken,
    attempts,
    lang = 'en',
    onContinue
}) => {
    const [copied, setCopied] = useState(false);

    const handleShare = async () => {
        const text = formatShareResult(bossName, fightTimeSec, attempts, lang);
        const ok = await copyShareResultToClipboard(text);
        if (ok) {
            setCopied(true);
            setTimeout(() => setCopied(false), 2500);
        }
    };

    return (
        <div className="fixed inset-0 z-[150] bg-slate-950/90 backdrop-blur-xl flex items-center justify-center p-4 pointer-events-auto">
            <motion.div
                {...({
                    initial: { opacity: 0, scale: 0.85, y: 30 },
                    animate: { opacity: 1, scale: 1, y: 0 },
                    exit: { opacity: 0, scale: 0.85, y: -30 },
                    transition: { duration: 0.5, ease: "easeOut" }
                } as any)}
                className="w-full max-w-lg bg-gradient-to-b from-slate-900 via-slate-950 to-slate-900 border-2 border-amber-500/60 rounded-3xl p-6 md:p-8 shadow-[0_0_50px_rgba(245,158,11,0.25)] text-center relative overflow-hidden"
            >
                {/* Background Ambient Glow */}
                <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-96 h-96 bg-amber-500/10 blur-[100px] rounded-full pointer-events-none" />

                {/* TROPHY ICON */}
                <div className="flex justify-center mb-4">
                    <div className="p-4 bg-amber-950/60 border-2 border-amber-400 rounded-full shadow-[0_0_25px_rgba(245,158,11,0.5)]">
                        <Trophy size={36} className="text-amber-300 animate-bounce" />
                    </div>
                </div>

                {/* BANNER HEADER */}
                <h1 className="text-3xl md:text-5xl font-tech font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-yellow-200 to-amber-400 tracking-wider uppercase mb-1 drop-shadow-[0_0_20px_rgba(245,158,11,0.4)]">
                    {bossName} {t("DEFEATED", lang)}
                </h1>
                <p className="text-xs font-mono text-amber-200/70 tracking-widest uppercase mb-6">
                    {t("CELESTIAL ANOMALY NEUTRALIZED", lang)}
                </p>

                {/* PERMANENT GAINS CARD */}
                <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 mb-6 space-y-3 text-left">
                    <div className="text-[10px] font-mono text-slate-400 uppercase tracking-widest font-bold">
                        {t("PERMANENT GAINS", lang)}
                    </div>
                    
                    <div className="flex items-center justify-between bg-slate-950 p-3 rounded-xl border border-amber-500/20">
                        <div className="flex items-center gap-3">
                            <Sparkles size={18} className="text-amber-400" />
                            <span className="font-tech text-xs text-slate-200 font-bold uppercase">{t("Matter Harvested", lang)}</span>
                        </div>
                        <span className="font-mono text-emerald-400 font-bold text-sm">+{matterEarned}</span>
                    </div>

                    <div className="flex items-center justify-between bg-slate-950 p-3 rounded-xl border border-cyan-500/20">
                        <div className="flex items-center gap-3">
                            <BookOpen size={18} className="text-cyan-400" />
                            <span className="font-tech text-xs text-slate-200 font-bold uppercase">{t("Archives Trophy", lang)}</span>
                        </div>
                        <span className="font-mono text-cyan-300 font-bold text-xs uppercase">{t("UNLOCKED", lang)}</span>
                    </div>
                </div>

                {/* PERFORMANCE STATS */}
                <div className="grid grid-cols-3 gap-2 bg-slate-950 p-3.5 rounded-2xl border border-slate-800 mb-6 font-mono">
                    <div className="flex flex-col items-center">
                        <span className="text-[9px] text-slate-500 uppercase">{t("FIGHT TIME", lang)}</span>
                        <span className="text-base text-amber-300 font-bold">{fightTimeSec}s</span>
                    </div>
                    <div className="flex flex-col items-center border-x border-slate-800">
                        <span className="text-[9px] text-slate-500 uppercase">{t("DAMAGE TAKEN", lang)}</span>
                        <span className="text-base text-rose-400 font-bold">{damageTaken} HP</span>
                    </div>
                    <div className="flex flex-col items-center">
                        <span className="text-[9px] text-slate-500 uppercase">{t("ATTEMPTS", lang)}</span>
                        <span className="text-base text-purple-300 font-bold">#{attempts}</span>
                    </div>
                </div>

                {/* ACTION BUTTONS */}
                <div className="flex flex-col sm:flex-row gap-3">
                    {/* SHARE BUTTON */}
                    <button
                        onClick={handleShare}
                        className={`flex-1 py-3.5 px-4 rounded-2xl font-tech text-xs tracking-wider uppercase transition-all flex items-center justify-center gap-2 border font-bold cursor-pointer ${
                            copied
                                ? 'bg-emerald-600 border-emerald-400 text-white shadow-[0_0_15px_rgba(16,185,129,0.4)]'
                                : 'bg-slate-900 hover:bg-slate-800 border-slate-700 text-slate-200 hover:border-amber-400 hover:text-white'
                        }`}
                    >
                        {copied ? (
                            <>
                                <Check size={16} className="text-white animate-bounce" />
                                <span>{t("COPIED TO CLIPBOARD!", lang)}</span>
                            </>
                        ) : (
                            <>
                                <Share2 size={16} className="text-amber-400" />
                                <span>{t("SHARE RESULT", lang)}</span>
                            </>
                        )}
                    </button>

                    {/* CONTINUE BUTTON */}
                    <button
                        onClick={onContinue}
                        className="flex-1 py-3.5 px-4 bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 hover:from-amber-400 hover:to-yellow-300 text-slate-950 font-tech text-xs tracking-widest uppercase rounded-2xl shadow-[0_0_20px_rgba(245,158,11,0.4)] font-bold transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-98"
                    >
                        <span>{t("CONTINUE", lang)}</span>
                        <ArrowRight size={16} fill="currentColor" />
                    </button>
                </div>
            </motion.div>
        </div>
    );
};

export default BossRewardModal;
