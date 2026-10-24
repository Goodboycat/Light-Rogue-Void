import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PlayerStats, SideMission } from '../types';
import { t } from '../translate';
import { Key, Zap, Trophy, Sparkles, Flame } from 'lucide-react';
import { Settings } from '../types';

export interface HudToastItem {
    id: string;
    kind: 'AFFORD' | 'MATURITY' | 'ACHIEVEMENT' | 'COSMETIC' | 'QUEST';
    title: string;
    subtitle?: string;
    color?: string;
}

interface GameOverlayProps {
    settings?: Settings;
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
        progress?: number;
    };
    lightEnergy?: number;
    comboCount?: number;
    nodeType?: string;
    nodeId?: string;
    mission?: {
        type: string;
        target: number;
        current: number;
    } | null;
    specialMissionKeys?: number;
    sideMission?: SideMission;
    lastSparkAvailable?: boolean;
    intermissionTimer?: number;
    intermissionMaxTimer?: number;
    waveBannerText?: string;
    waveBannerTimer?: number;
    isPerfectWave?: boolean;
    onSkipIntermission?: () => void;
    showBeamHint?: boolean;
    nextGoalNode?: { title: string; cost: number; currentMatter: number } | null;
    activeToast?: HudToastItem | null;
    waveEssenceEarned?: number;
    isVoidRush?: boolean;
}

const GameOverlay: React.FC<GameOverlayProps> = ({
    playerStats,
    currentHealth,
    currentShield,
    timeRemaining,
    wave,
    currentPhrase,
    darknessPhrase,
    maturity,
    lightEnergy = 0,
    comboCount = 0,
    nodeType,
    nodeId,
    mission,
    specialMissionKeys = 0,
    sideMission,
    settings,
    lastSparkAvailable = true,
    intermissionTimer = 0,
    intermissionMaxTimer = 150,
    waveBannerText = '',
    waveBannerTimer = 0,
    isPerfectWave = false,
    onSkipIntermission,
    showBeamHint = false,
    nextGoalNode = null,
    activeToast = null,
    waveEssenceEarned = 0,
    isVoidRush = false
}) => {
    const lang = settings?.language || 'en';
    const uiTextSize = settings?.uiTextSize || 'NORMAL';
    const isLowPerf = settings?.performanceMode === 'LOW';

    return (
        <div
            className="absolute inset-0 pointer-events-none z-10"
            style={{ contain: 'layout paint' }}
        >
            {/* Top Left: Health & Shield */}
            <div
                className="absolute top-8 left-8 flex flex-col gap-2"
                style={{ contain: 'layout paint' }}
            >
                <div className="flex items-center gap-2">
                    {Array.from({ length: playerStats.maxHealth }).map((_, i) => {
                        const isHealthFilled = i < currentHealth;
                        const isShielded = i < currentShield;
                        
                        return (
                            <div key={i} className="relative w-5 h-5 flex items-center justify-center">
                                {/* Base Health Pip */}
                                <div className={`absolute inset-0 rounded-full border-2 ${
                                    isLowPerf ? '' : 'transition-opacity duration-300'
                                } ${
                                    isHealthFilled 
                                        ? 'bg-white border-white shadow-white/50 shadow-lg' 
                                        : 'bg-slate-900 border-slate-700 opacity-20'
                                }`} />
                                
                                {/* Shield Overlay (Static in LOW mode, animated otherwise) */}
                                {isLowPerf ? (
                                    isShielded && (
                                        <div
                                            className="absolute inset-0 rounded-full border-2 border-amber-400 bg-amber-400/30"
                                            style={{ transform: 'scale(1.35)' }}
                                        />
                                    )
                                ) : (
                                    <AnimatePresence>
                                        {isShielded && (
                                            <motion.div 
                                                {...({
                                                    initial: { scale: 0, opacity: 0 },
                                                    animate: { scale: 1.4, opacity: 1 },
                                                    exit: { scale: 0, opacity: 0 }
                                                } as any)}
                                                className="absolute inset-0 rounded-full border-2 border-amber-400 shadow-[0_0_10px_rgba(251,191,36,0.8)] bg-amber-400/30"
                                                style={{ willChange: 'transform' }}
                                            />
                                        )}
                                    </AnimatePresence>
                                )}
                            </div>
                        );
                    })}

                    {/* Last Spark Icon */}
                    <div className="ml-1 flex items-center justify-center" title="Last Spark (Lethal Hit Protection)">
                        <Zap className={`w-4 h-4 ${
                            lastSparkAvailable
                                ? `text-amber-300 fill-amber-300/40 ${isLowPerf ? '' : 'drop-shadow-[0_0_8px_rgba(251,191,36,0.8)] animate-pulse'}`
                                : 'text-slate-600 opacity-30'
                        }`} />
                    </div>
                </div>
                <div className={`font-tech tracking-[0.3em] text-white/40 uppercase ${
                    uiTextSize === 'HUGE' ? 'text-xs' : uiTextSize === 'LARGE' ? 'text-[11px]' : 'text-[10px]'
                }`}>{t('Light integrity cells', lang)}</div>

                {/* Thin Maturity Progress Bar under HP pips */}
                <div className="flex flex-col gap-0.5 w-36">
                    <div className="flex justify-between items-center text-[9px] font-mono">
                        <span className="truncate font-bold" style={{ color: maturity.color }}>
                            {t(maturity.title, lang)}
                        </span>
                        <span className="text-slate-400">Lv.{maturity.level + 1}</span>
                    </div>
                    <div className="w-full h-1 bg-slate-900/90 rounded-full overflow-hidden border border-white/10">
                        <div
                            className="h-full"
                            style={{
                                width: `${Math.min(100, Math.max(4, Math.round((maturity.progress || 0) * 100)))}%`,
                                backgroundColor: maturity.color,
                            }}
                        />
                    </div>
                </div>
                
                {/* Special Vault Keys */}
                {specialMissionKeys > 0 && (
                    <div className="flex items-center gap-1.5 mt-1 bg-yellow-500/10 border border-yellow-500/25 px-2 py-1 rounded-md text-yellow-400 max-w-fit">
                        <Key size={12} className="text-yellow-400" />
                        <span className={`font-tech font-bold tracking-[0.2em] uppercase ${
                            uiTextSize === 'HUGE' ? 'text-xs' : uiTextSize === 'LARGE' ? 'text-[10px]' : 'text-[9px]'
                        }`}>
                            Vault Key Held ({specialMissionKeys})
                        </span>
                    </div>
                )}

                {/* Side Mission Overlay */}
                {sideMission && !sideMission.completed && !sideMission.failed && !(wave > 0 && wave % 10 === 0) && (
                    <div className="flex flex-col gap-1.5 mt-2 bg-slate-950/90 border border-cyan-500/30 p-3 rounded-xl max-w-xs shadow-lg pointer-events-auto">
                        <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-1.5">
                                <div className={`w-2 h-2 rounded-full ${sideMission.started ? 'bg-cyan-400' : 'bg-amber-400'}`} />
                                <span className={`font-tech font-extrabold text-cyan-300 tracking-wider uppercase ${
                                    uiTextSize === 'HUGE' ? 'text-xs' : uiTextSize === 'LARGE' ? 'text-[11px]' : 'text-[10px]'
                                }`}>
                                    {sideMission.title ? t(sideMission.title, lang) : (sideMission.started ? t('Side Mission Active', lang) : t('Side Mission Available', lang))}
                                </span>
                            </div>
                            {sideMission.timeRemaining !== undefined && (
                                <div className={`px-2 py-0.5 rounded font-tech font-bold tabular-nums border ${
                                    uiTextSize === 'HUGE' ? 'text-xs' : 'text-[10px]'
                                } ${
                                    sideMission.timeRemaining <= 20 
                                        ? 'bg-rose-950/80 border-rose-500 text-rose-300' 
                                        : 'bg-amber-950/60 border-amber-500/50 text-amber-300'
                                }`}>
                                    ⏱️ {Math.floor(sideMission.timeRemaining / 60)}:{('0' + (sideMission.timeRemaining % 60)).slice(-2)}
                                </div>
                            )}
                        </div>

                        {sideMission.description && (
                            <div className={`font-sans text-slate-300 leading-snug ${
                                uiTextSize === 'HUGE' ? 'text-xs' : uiTextSize === 'LARGE' ? 'text-[11px]' : 'text-[10px]'
                            }`}>
                                {t(sideMission.description, lang)}
                            </div>
                        )}

                        <div className={`font-bold font-sans text-cyan-200 mt-0.5 ${
                            uiTextSize === 'HUGE' ? 'text-sm' : uiTextSize === 'LARGE' ? 'text-xs' : 'text-[11px]'
                        }`}>
                            {sideMission.type === 'COLLECT' ? (
                                `${t('Collected:', lang)} ${sideMission.current} / ${sideMission.target}`
                            ) : sideMission.type === 'CAPTURE' ? (
                                sideMission.captureZones ? (
                                    `${t('Beacons Secured:', lang)} ${sideMission.current} / ${sideMission.target}`
                                ) : (
                                    `${t('Securing Sector:', lang)} ${Math.floor((sideMission.current / sideMission.target) * 100)}%`
                                )
                            ) : (
                                `${t('Targets Destroyed:', lang)} ${sideMission.current} / ${sideMission.target}`
                            )}
                        </div>

                        {/* Mini progress bar */}
                        <div className="w-full bg-slate-900 h-1.5 rounded-full overflow-hidden border border-slate-800">
                            <div 
                                className="bg-gradient-to-r from-cyan-500 to-fuchsia-500 h-full"
                                style={{ 
                                    width: `${Math.min(100, (sideMission.current / Math.max(1, sideMission.target)) * 100)}%` 
                                }}
                            />
                        </div>

                        {!sideMission.started && (
                            <div className="text-[9px] text-amber-300/80 italic font-sans font-medium">
                                (Approach objective to begin)
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Top Center: Timer & Wave or Mission Progress */}
            <div
                className="absolute top-8 left-1/2 -translate-x-1/2 text-center pointer-events-none min-w-[320px]"
                style={{ contain: 'layout paint' }}
            >
                {mission && mission.type !== 'SURVIVE' ? (
                    <div className="flex flex-col items-center gap-1">
                        <div className="text-3xl font-extrabold font-tech text-cyan-400 tabular-nums">
                            {mission.current} <span className="text-white/30 text-lg">/</span> {mission.target}
                        </div>
                        <div className="text-[10px] tracking-[0.25em] text-white/90 font-tech font-bold uppercase">
                            {mission.type === 'DEFEAT_ENEMIES' ? 'DEFEAT VOID MINIONS' :
                             mission.type === 'COLLECT_KEYS' ? 'SECURE STELLAR FRAGMENTS' :
                             mission.type === 'CAPTURE_ZONE' ? 'STABILIZE ZONE BEACON' :
                             'SHATTER ANCIENT CORES'}
                        </div>
                        <div className={`text-[9px] tracking-[0.35em] font-tech font-bold uppercase mt-1.5 px-3 py-0.5 rounded-full border ${
                            nodeType === 'SECRET' 
                                ? 'text-fuchsia-400 border-fuchsia-500/35 bg-fuchsia-950/40' 
                                : 'text-amber-400 border-amber-500/35 bg-amber-950/40'
                        }`}>
                            {nodeType === 'SECRET' ? 'SECRET VAULT' : 'SPECIAL MISSION'}
                        </div>
                    </div>
                ) : (
                    <>
                        <div className="text-4xl font-bold font-tech text-white tabular-nums">{Math.ceil(timeRemaining)}</div>
                        <div className="text-[10px] tracking-[0.4em] text-purple-500 font-tech">
                            {isVoidRush
                                ? `${t('VOID RUSH', lang)} • ${t('WAVE', lang)} ${wave}`
                                : wave >= 100 || nodeType === 'EVENT' || nodeType === 'SECRET'
                                ? t('STABILIZATION RIFT', lang)
                                : `${t('WAVE', lang)} ${wave}`}
                        </div>

                        {/* HUD Chip under the timer: Next Goal with progress ring */}
                        {nextGoalNode && (
                            <div className="mt-1.5 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-950/85 border border-slate-800/90">
                                <svg className="w-3.5 h-3.5 -rotate-90 shrink-0" viewBox="0 0 20 20">
                                    <circle cx="10" cy="10" r="8" stroke="#1e293b" strokeWidth="2.5" fill="none" />
                                    <circle
                                        cx="10"
                                        cy="10"
                                        r="8"
                                        stroke={nextGoalNode.currentMatter >= nextGoalNode.cost ? '#34d399' : '#a855f7'}
                                        strokeWidth="2.5"
                                        fill="none"
                                        strokeDasharray={50.26}
                                        strokeDashoffset={
                                            50.26 *
                                            (1 - Math.min(1, Math.max(0, nextGoalNode.currentMatter / Math.max(1, nextGoalNode.cost))))
                                        }
                                    />
                                </svg>
                                <span className="text-[10px] font-mono text-slate-300 tracking-wider">
                                    {t('Next:', lang)}{' '}
                                    <strong className="text-white">{t(nextGoalNode.title, lang)}</strong>{' '}
                                    <span
                                        className={
                                            nextGoalNode.currentMatter >= nextGoalNode.cost
                                                ? 'text-emerald-400 font-bold'
                                                : 'text-purple-300'
                                        }
                                    >
                                        {Math.floor(nextGoalNode.currentMatter)}/{nextGoalNode.cost}
                                    </span>
                                </span>
                            </div>
                        )}

                        {/* Non-blocking Toast below timer */}
                        {isLowPerf ? (
                            activeToast && (
                                <div className="mt-2 inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-slate-950/95 border border-amber-400/50">
                                    {activeToast.kind === 'ACHIEVEMENT' ? (
                                        <Trophy size={14} className="text-amber-400 shrink-0" />
                                    ) : activeToast.kind === 'MATURITY' ? (
                                        <Flame size={14} className="text-amber-300 shrink-0" />
                                    ) : (
                                        <Sparkles size={14} className="text-emerald-400 shrink-0" />
                                    )}
                                    <div className="text-left">
                                        <div
                                            className="font-tech text-[11px] font-bold tracking-wider uppercase"
                                            style={{ color: activeToast.color || '#fde68a' }}
                                        >
                                            {activeToast.title}
                                        </div>
                                        {activeToast.subtitle && (
                                            <div className="font-mono text-[9px] text-slate-300">
                                                {activeToast.subtitle}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )
                        ) : (
                            <AnimatePresence mode="wait">
                                {activeToast && (
                                    <motion.div
                                        key={activeToast.id}
                                        {...({
                                            initial: { opacity: 0, y: -8, scale: 0.95 },
                                            animate: { opacity: 1, y: 0, scale: 1 },
                                            exit: { opacity: 0, y: -8, scale: 0.95 },
                                            transition: { duration: 0.2 },
                                        } as any)}
                                        style={{ willChange: 'transform' }}
                                        className="mt-2 inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-slate-950/95 border border-amber-400/50 shadow-[0_0_20px_rgba(251,191,36,0.25)]"
                                    >
                                        {activeToast.kind === 'ACHIEVEMENT' ? (
                                            <Trophy size={14} className="text-amber-400 shrink-0" />
                                        ) : activeToast.kind === 'MATURITY' ? (
                                            <Flame size={14} className="text-amber-300 shrink-0" />
                                        ) : (
                                            <Sparkles size={14} className="text-emerald-400 shrink-0" />
                                        )}
                                        <div className="text-left">
                                            <div
                                                className="font-tech text-[11px] font-bold tracking-wider uppercase"
                                                style={{ color: activeToast.color || '#fde68a' }}
                                            >
                                                {activeToast.title}
                                            </div>
                                            {activeToast.subtitle && (
                                                <div className="font-mono text-[9px] text-slate-300">
                                                    {activeToast.subtitle}
                                                </div>
                                            )}
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        )}
                    </>
                )}
            </div>

            {/* Bottom Center: Phrases and Light Energy */}
            <div
                className="absolute bottom-16 left-0 w-full flex flex-col items-center gap-4"
                style={{ contain: 'layout paint' }}
            >
                {/* Light Energy Charge Bar */}
                <div className="flex flex-col items-center gap-1.5">
                    {showBeamHint && lightEnergy >= 100 && (
                        <div className="px-3 py-1 rounded-full bg-cyan-950/90 border border-cyan-400 text-cyan-200 font-tech font-bold text-[10px] tracking-widest uppercase">
                            {t("READY - save it for the boss", lang)}
                        </div>
                    )}
                    <div className={`w-56 bg-slate-950/85 border rounded-full h-3 p-[2px] flex items-center pointer-events-auto ${
                        lightEnergy >= 100 ? 'border-cyan-400' : 'border-slate-800'
                    }`}>
                        <div 
                            className={`h-full rounded-full relative flex items-center justify-center overflow-hidden ${
                                lightEnergy >= 100 
                                    ? 'bg-cyan-400' 
                                    : 'bg-gradient-to-r from-blue-600 to-cyan-500'
                            }`}
                            style={{ width: `${Math.min(100, Math.max(0, lightEnergy))}%` }}
                        >
                            {lightEnergy >= 100 && (
                                <span className="text-[8px] text-slate-950 font-tech font-bold uppercase tracking-widest whitespace-nowrap">
                                    [F] / [RIGHT CLICK] READY
                                </span>
                            )}
                        </div>
                    </div>
                    {lightEnergy < 100 && (
                        <span className="text-[8px] text-slate-500 uppercase tracking-widest font-tech">
                            {t("Light Energy:", lang)} {Math.floor(lightEnergy)}%
                        </span>
                    )}
                </div>

                {/* Darkness Phrase */}
                {darknessPhrase && (
                    isLowPerf ? (
                        <div className="font-serif text-sm text-slate-500 italic tracking-widest uppercase opacity-60">
                            {t(darknessPhrase, lang)}
                        </div>
                    ) : (
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={t(darknessPhrase, lang)}
                                {...({
                                    initial: { opacity: 0 },
                                    animate: { opacity: 0.6 },
                                    exit: { opacity: 0 },
                                    transition: { duration: 0.8 }
                                } as any)}
                                className="font-serif text-sm text-slate-500 italic tracking-widest uppercase"
                            >
                                {t(darknessPhrase, lang)}
                            </motion.div>
                        </AnimatePresence>
                    )
                )}
            </div>

            {/* WAVE CLEAR & PERFECT WAVE BANNER */}
            {waveBannerTimer > 0 && waveBannerText && (
                <div className="fixed top-24 left-1/2 -translate-x-1/2 z-30 pointer-events-none flex flex-col items-center">
                    <div className={`px-8 py-3 rounded-2xl border shadow-2xl flex items-center justify-center gap-3 ${
                        isPerfectWave 
                            ? 'bg-amber-950/95 border-amber-400 text-amber-200' 
                            : 'bg-slate-900/95 border-cyan-400 text-cyan-200'
                    }`}>
                        <Zap size={24} className={isPerfectWave ? 'text-amber-400' : 'text-cyan-400'} />
                        <span className="font-tech text-xl font-black tracking-widest uppercase">
                            {t(waveBannerText, lang)}
                        </span>
                    </div>
                </div>
            )}

            {/* INTERMISSION COUNTDOWN & INSTANT GO SKIP BUTTON */}
            {intermissionTimer > 0 && (
                <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-30 pointer-events-auto flex items-center gap-4 bg-slate-900/95 border border-cyan-500/40 px-6 py-3 rounded-2xl shadow-xl">
                    <div className="flex flex-col text-left">
                        <span className="text-[10px] font-mono text-cyan-400 tracking-wider uppercase font-bold">
                            {t('NEXT WAVE IN', lang)}
                        </span>
                        <div className="flex items-center gap-2">
                            <span className="font-tech text-lg font-black text-white tabular-nums">
                                {Math.max(1, Math.ceil(intermissionTimer / 60))}s
                            </span>
                            {waveEssenceEarned > 0 && (
                                <span className="px-2 py-0.5 rounded-full bg-purple-950/90 border border-purple-400/50 text-purple-200 font-mono font-bold text-[10px]">
                                    +{Math.round(waveEssenceEarned)} {t('Matter this wave', lang)}
                                </span>
                            )}
                        </div>
                    </div>

                    <button
                        type="button"
                        onClick={() => {
                            if (onSkipIntermission) onSkipIntermission();
                        }}
                        className="min-h-[48px] min-w-[72px] px-5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-tech font-black text-lg tracking-widest uppercase rounded-xl active:scale-95 flex items-center justify-center cursor-pointer"
                    >
                        {t('GO!', lang)}
                    </button>
                </div>
            )}

            {/* Bottom Right: Maturity/Growth Status */}
            <div className="absolute bottom-8 right-8 text-right hidden md:block" style={{ contain: 'layout paint' }}>
                <div className="font-tech text-xl" style={{ color: maturity.color }}>{t(maturity.title, lang)}</div>
                <div className="text-[10px] text-white/30 uppercase tracking-[0.2em] font-tech">{t('Maturity Rank', lang)} {maturity.level}</div>
            </div>
        </div>
    );
};

export default GameOverlay;
