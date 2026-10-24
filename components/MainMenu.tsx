import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Play,
    Settings,
    MessageSquare,
    X,
    Mail,
    BookOpen,
    Lock,
    Zap,
    Sparkles,
    Flame,
    RotateCcw,
    CheckCircle,
} from 'lucide-react';
import { IS_DEMO, DEMO_MAX_WAVE } from './game/Constants';
import GuidebookModal from './GuidebookModal';
import CosmeticsModal from './CosmeticsModal';
import { GameState, PlayerStats, Settings as SettingsType, DifficultyLevel } from '../types';
import { POWERS } from '../abilityConfig';
import { getDailyModifierForDate, DAILY_QUEST_POOL, getUtcDateString } from '../data/dailyVoid';
import { t } from '../translate';

interface MainMenuProps {
    onStart: () => void;
    onStartVoidRush?: () => void;
    onResetSave?: () => void;
    onOpenSettings: () => void;
    maxWaveReached: number;
    onAddMatter: (amount: number) => void;
    currentMatter: number;
    onUnlockAll: () => void;
    hasSeenIntro: boolean;
    gameState: GameState;
    playerStats?: PlayerStats | null;
    onUpdateSettings?: (settings: SettingsType) => void;
    onToggleDailyMod?: (enabled: boolean) => void;
    onEquipCosmetic?: (kind: 'skin' | 'trail', id: string) => void;
    onClearNewCosmetics?: () => void;
}

const MainMenu: React.FC<MainMenuProps> = ({
    onStart,
    onStartVoidRush,
    onResetSave,
    onOpenSettings,
    maxWaveReached,
    currentMatter,
    hasSeenIntro,
    gameState,
    playerStats = null,
    onUpdateSettings,
    onToggleDailyMod,
    onEquipCosmetic,
    onClearNewCosmetics,
}) => {
    const [showNote, setShowNote] = useState(false);
    const [showGuide, setShowGuide] = useState(false);
    const [showCosmetics, setShowCosmetics] = useState(false);
    const [showNewGameConfirm, setShowNewGameConfirm] = useState(false);

    const lang = gameState?.settings?.language || 'en';
    const isLowPerf = gameState?.settings?.performanceMode === 'LOW';

    const hasExistingSave = useMemo(() => {
        return (
            hasSeenIntro ||
            maxWaveReached > 1 ||
            (gameState?.unlockedAbilityIds?.length || 0) > 1 ||
            currentMatter > 0
        );
    }, [hasSeenIntro, maxWaveReached, gameState?.unlockedAbilityIds?.length, currentMatter]);

    // Determine primary power summary for CONTINUE button: e.g. "Wave 7 - Fire Blast Lv2 - 412 Matter"
    const continueSubtitle = useMemo(() => {
        const waveNum = gameState?.lastSavedWave || maxWaveReached || 1;
        let topPowerName = 'Spark Pulse';
        let topPowerLv = 1;
        if (playerStats) {
            for (const p of POWERS) {
                const lv = (playerStats as any)[p.propName] || 0;
                if (lv > topPowerLv || (topPowerName === 'Spark Pulse' && lv > 0)) {
                    topPowerName = p.name;
                    topPowerLv = lv;
                }
            }
        }
        return `${t('Wave', lang)} ${waveNum} • ${t(topPowerName, lang)} Lv.${topPowerLv} • ${Math.floor(currentMatter)} ${t('Matter', lang)}`;
    }, [gameState?.lastSavedWave, maxWaveReached, playerStats, currentMatter, lang]);

    const todayStr = getUtcDateString();
    const dailyMod = useMemo(() => getDailyModifierForDate(todayStr), [todayStr]);
    const isDailyActive = !!gameState?.dailyState?.activeDailyModEnabled;
    const isDailyCompleted = (gameState?.dailyState?.completedDailyDates || []).includes(todayStr);
    const streakDays = gameState?.dailyState?.streakDays || 1;
    const dailyQuests = gameState?.dailyState?.quests || [];
    const newCosmeticsCount = (gameState?.newCosmeticIds || []).length;

    // Fresh Save: 1-tap "TAP TO BEGIN" screen that unlocks audio and launches directly into the intro
    if (!hasExistingSave) {
        return (
            <div
                onClick={onStart}
                className="absolute inset-0 z-50 flex flex-col items-center justify-center h-full text-center p-6 overflow-hidden cursor-pointer select-none"
            >
                <div className="absolute top-6 right-6 z-[100]" onClick={e => e.stopPropagation()}>
                    <button
                        onClick={onOpenSettings}
                        className="p-3 bg-slate-900/90 hover:bg-slate-800 border border-slate-700 rounded-full text-slate-400 hover:text-white transition-all min-w-[48px] min-h-[48px] flex items-center justify-center"
                        title="Settings"
                    >
                        <Settings size={22} />
                    </button>
                </div>

                <motion.div
                    {...({
                        initial: { opacity: 0, scale: 0.92 },
                        animate: { opacity: 1, scale: 1 },
                        transition: { duration: 0.8 },
                    } as any)}
                    className="flex flex-col items-center max-w-md"
                >
                    <h1
                        className="text-7xl md:text-9xl font-tech font-bold text-white tracking-tighter mb-2"
                        style={isLowPerf ? undefined : { textShadow: '0 0 30px rgba(255,255,255,0.6)' }}
                    >
                        LIGHT
                    </h1>
                    <div className="flex items-center gap-4 opacity-60 mb-2">
                        <div className="h-px w-20 bg-purple-400" />
                        <span className="font-mono text-xs tracking-[0.5em] text-purple-200 uppercase">Rogue</span>
                        <div className="h-px w-20 bg-purple-400" />
                    </div>
                    <h1
                        className="text-6xl md:text-8xl font-tech font-bold text-black tracking-tighter mb-12"
                        style={{ WebkitTextStroke: '1px rgba(148, 163, 184, 0.5)' }}
                    >
                        VOID
                    </h1>

                    <motion.div
                        {...({
                            animate: { scale: [1, 1.05, 1] },
                            transition: { duration: 1.8, repeat: Infinity, ease: 'easeInOut' },
                        } as any)}
                        className="px-10 py-5 rounded-full bg-white text-black font-tech font-bold text-xl tracking-[0.25em] uppercase shadow-[0_0_35px_rgba(255,255,255,0.5)] flex items-center gap-3 min-h-[56px]"
                    >
                        <Play fill="currentColor" size={22} />
                        {t('TAP TO BEGIN', lang)}
                    </motion.div>
                    <p className="mt-4 text-xs font-mono text-slate-400 uppercase tracking-widest">
                        {t('Ignite your first spark in the endless dark', lang)}
                    </p>
                </motion.div>
            </div>
        );
    }

    return (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center h-full text-center p-4 overflow-y-auto">
            {/* --- TOP LEFT: DEV NOTE & STREAK --- */}
            <div className="absolute top-5 left-5 z-[100] flex items-center gap-2.5">
                <button
                    onClick={() => setShowNote(true)}
                    className="p-3 bg-slate-900/90 hover:bg-slate-800 border border-slate-700 hover:border-white rounded-full text-slate-400 hover:text-white transition-all min-w-[48px] min-h-[48px] flex items-center justify-center"
                    title="Developer Note"
                >
                    <MessageSquare size={20} />
                </button>
                <div className="px-3 py-1.5 rounded-full bg-amber-950/80 border border-amber-500/40 text-amber-300 font-tech text-xs tracking-wider uppercase flex items-center gap-1.5 shadow">
                    <Flame size={14} className="text-amber-400" />
                    <span>
                        {streakDays} {t('DAY STREAK', lang)}
                    </span>
                </div>
            </div>

            {/* --- TOP RIGHT: COSMETICS & SETTINGS --- */}
            <div className="absolute top-5 right-5 z-[100] flex items-center gap-2.5">
                <button
                    onClick={() => setShowCosmetics(true)}
                    className="relative px-3.5 py-2.5 bg-slate-900/90 hover:bg-slate-800 border border-amber-500/40 hover:border-amber-400 rounded-full text-amber-300 font-tech text-xs tracking-wider uppercase flex items-center gap-1.5 transition-all min-h-[48px] cursor-pointer"
                >
                    <Sparkles size={16} />
                    <span className="hidden sm:inline">{t('SKINS', lang)}</span>
                    {newCosmeticsCount > 0 && (
                        <span className="px-1.5 py-0.5 rounded-full bg-amber-400 text-black font-bold text-[9px]">
                            {t('NEW', lang)}
                        </span>
                    )}
                </button>
                <button
                    onClick={onOpenSettings}
                    className="p-3 bg-slate-900/90 hover:bg-slate-800 border border-slate-700 hover:border-white rounded-full text-slate-400 hover:text-white transition-all min-w-[48px] min-h-[48px] flex items-center justify-center"
                    title="System Settings"
                >
                    <Settings size={20} />
                </button>
            </div>

            {/* --- CENTER: TITLE --- */}
            <div className="mb-4 mt-10 relative z-10 flex flex-col items-center">
                <div className="relative mb-1">
                    <h1
                        className="text-5xl sm:text-7xl font-tech font-bold text-white tracking-tighter relative z-10"
                        style={isLowPerf ? undefined : { textShadow: '0 0 25px rgba(255,255,255,0.5)' }}
                    >
                        LIGHT
                    </h1>
                </div>
                <div className="flex items-center gap-3 opacity-60 mb-1">
                    <div className="h-px w-16 bg-purple-400" />
                    <span className="font-mono text-[10px] tracking-[0.5em] text-purple-200 uppercase">Rogue</span>
                    <div className="h-px w-16 bg-purple-400" />
                </div>
                <h1
                    className="text-4xl sm:text-6xl font-tech font-bold text-black tracking-tighter relative z-10"
                    style={{ WebkitTextStroke: '1px rgba(148, 163, 184, 0.5)' }}
                >
                    VOID
                </h1>
                {IS_DEMO && (
                    <div className="mt-2 bg-amber-500/10 border border-amber-500/50 text-amber-400 px-3 py-0.5 rounded font-mono text-[10px] tracking-widest uppercase">
                        Demo Version • Max Wave {DEMO_MAX_WAVE}
                    </div>
                )}
            </div>

            {/* --- CONTROLS & MODES SECTION --- */}
            <div className="relative z-10 flex flex-col items-center gap-2.5 w-full max-w-md">
                {/* PRIMARY CONTINUE BUTTON */}
                <button
                    onClick={onStart}
                    className="w-full px-6 py-4 bg-white hover:bg-slate-100 text-black rounded-2xl shadow-[0_0_25px_rgba(255,255,255,0.3)] transition-all flex flex-col items-center justify-center gap-0.5 active:scale-98 cursor-pointer min-h-[64px]"
                >
                    <div className="flex items-center gap-2 font-tech font-bold text-xl tracking-[0.2em] uppercase">
                        <Play fill="currentColor" size={20} />
                        {t('CONTINUE', lang)}
                    </div>
                    <div className="text-[11px] font-mono text-slate-700 font-bold tracking-wider">
                        {continueSubtitle}
                    </div>
                </button>

                {/* VOID RUSH (6-Minute Arcade Mode) */}
                {onStartVoidRush && (
                    <button
                        type="button"
                        onClick={onStartVoidRush}
                        className="w-full px-5 py-3 bg-gradient-to-r from-purple-950/90 via-indigo-950/90 to-slate-900/90 hover:from-purple-900 hover:to-indigo-900 border border-purple-400/50 rounded-2xl text-white transition-all flex items-center justify-between gap-3 cursor-pointer min-h-[54px] shadow-lg"
                    >
                        <div className="flex items-center gap-2.5 text-left">
                            <Zap size={20} className="text-amber-400 shrink-0" />
                            <div>
                                <div className="font-tech font-bold text-sm tracking-wider uppercase text-amber-300">
                                    {t('VOID RUSH (6 MIN ARCADE)', lang)}
                                </div>
                                <div className="text-[10px] font-mono text-slate-300">
                                    {t('Fast 20s waves • Boon every 30s • 25% Score → Matter', lang)}
                                </div>
                            </div>
                        </div>
                        {(gameState.voidRushBestScore || 0) > 0 && (
                            <div className="text-right font-mono text-[10px] text-purple-200 shrink-0">
                                <div>{t('BEST', lang)}</div>
                                <div className="font-bold text-amber-300">{gameState.voidRushBestScore}</div>
                            </div>
                        )}
                    </button>
                )}

                {/* DAILY VOID CHIP + SESSION QUESTS */}
                <div className="w-full bg-slate-950/85 border border-slate-800 rounded-2xl p-3 text-left space-y-2 shadow-lg">
                    <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                            <span
                                className="w-2.5 h-2.5 rounded-full shrink-0"
                                style={{ backgroundColor: dailyMod.color }}
                            />
                            <div className="truncate">
                                <span className="font-tech text-xs font-bold text-white uppercase tracking-wider">
                                    {t('DAILY VOID:', lang)} {t(dailyMod.name, lang)}
                                </span>
                                {isDailyCompleted && (
                                    <span className="ml-1.5 text-[9px] font-mono text-emerald-400 uppercase font-bold">
                                        ✓ {t('CLEARED', lang)}
                                    </span>
                                )}
                            </div>
                        </div>
                        {onToggleDailyMod && (
                            <button
                                type="button"
                                onClick={() => onToggleDailyMod(!isDailyActive)}
                                className={`px-3 py-1 rounded-lg font-tech text-[10px] font-bold uppercase tracking-wider border transition-all cursor-pointer min-h-[32px] shrink-0 ${
                                    isDailyActive
                                        ? 'bg-amber-500 text-black border-amber-300 shadow-[0_0_10px_rgba(251,191,36,0.4)]'
                                        : 'bg-slate-900 text-slate-400 border-slate-700 hover:text-white'
                                }`}
                            >
                                {isDailyActive ? t('ACTIVE', lang) : t('OFF', lang)}
                            </button>
                        )}
                    </div>
                    <p className="text-[10px] font-mono text-slate-400 leading-snug">
                        {t(dailyMod.description, lang)}
                    </p>

                    {/* 3 Daily Quests */}
                    {dailyQuests.length > 0 && (
                        <div className="pt-1.5 border-t border-slate-800/80 grid grid-cols-1 gap-1">
                            {dailyQuests.map(q => {
                                const def = DAILY_QUEST_POOL.find(d => d.id === q.id);
                                if (!def) return null;
                                return (
                                    <div
                                        key={q.id}
                                        className="flex items-center justify-between text-[10px] font-mono text-slate-300"
                                    >
                                        <span className="truncate flex items-center gap-1">
                                            {q.completed ? (
                                                <CheckCircle size={11} className="text-emerald-400 shrink-0" />
                                            ) : (
                                                <span className="text-slate-600">•</span>
                                            )}
                                            <span className={q.completed ? 'line-through text-slate-500' : ''}>
                                                {t(def.title, lang)}
                                            </span>
                                        </span>
                                        <span
                                            className={`shrink-0 ml-2 ${
                                                q.completed ? 'text-emerald-400 font-bold' : 'text-amber-300'
                                            }`}
                                        >
                                            {Math.min(q.current, q.target)}/{q.target} (+{q.rewardMatter}M)
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* DIFFICULTY PILLS */}
                <div className="grid grid-cols-3 gap-1.5 w-full bg-slate-950/80 p-1.5 rounded-xl border border-slate-800">
                    {[
                        { id: 'chill', label: 'Story (Chill)', color: 'cyan' },
                        { id: 'normal', label: 'Normal', color: 'purple' },
                        { id: 'brutal', label: 'Challenge', color: 'red' },
                    ].map(({ id, label, color }) => {
                        const currentDiff = gameState?.settings?.difficulty || 'normal';
                        const isSelected = currentDiff === id;
                        const hasUnlockedBrutal =
                            (gameState?.defeatedBosses && gameState.defeatedBosses.length > 0) ||
                            (gameState?.maxWaveReached && gameState.maxWaveReached >= 10);
                        const isLocked = id === 'brutal' && !hasUnlockedBrutal;

                        return (
                            <button
                                key={id}
                                type="button"
                                disabled={isLocked}
                                onClick={() => {
                                    if (!isLocked && onUpdateSettings) {
                                        onUpdateSettings({ ...gameState.settings, difficulty: id as DifficultyLevel });
                                    }
                                }}
                                className={`py-2 px-2 rounded-lg font-tech text-[11px] tracking-wider transition-all flex items-center justify-center gap-1 border min-h-[40px] ${
                                    isLocked
                                        ? 'opacity-40 bg-slate-900/40 border-slate-800 text-slate-600 cursor-not-allowed'
                                        : isSelected
                                        ? color === 'cyan'
                                            ? 'bg-cyan-950/80 border-cyan-400 text-cyan-200'
                                            : color === 'red'
                                            ? 'bg-red-950/80 border-red-500 text-red-200'
                                            : 'bg-purple-950/80 border-purple-400 text-purple-200'
                                        : 'bg-slate-900/60 border-transparent text-slate-400 hover:text-white'
                                }`}
                            >
                                {isLocked && <Lock size={11} className="text-slate-500" />}
                                <span className="font-bold uppercase">{t(label, lang)}</span>
                            </button>
                        );
                    })}
                </div>

                {/* SECONDARY BUTTONS: GUIDEBOOK & NEW GAME */}
                <div className="grid grid-cols-2 gap-2 w-full">
                    <button
                        onClick={() => setShowGuide(true)}
                        className="py-3 px-4 bg-slate-950/80 hover:bg-slate-900 text-cyan-400 font-tech font-bold text-xs tracking-wider rounded-xl border border-cyan-500/30 flex items-center justify-center gap-2 min-h-[48px] cursor-pointer"
                    >
                        <BookOpen size={15} />
                        {t('GUIDEBOOK', lang)}
                    </button>
                    <button
                        onClick={() => setShowNewGameConfirm(true)}
                        className="py-3 px-4 bg-slate-950/80 hover:bg-rose-950/50 text-slate-400 hover:text-rose-300 font-tech font-bold text-xs tracking-wider rounded-xl border border-slate-800 hover:border-rose-500/40 flex items-center justify-center gap-2 min-h-[48px] cursor-pointer"
                    >
                        <RotateCcw size={15} />
                        {t('NEW GAME', lang)}
                    </button>
                </div>
            </div>

            {/* FOOTER */}
            <div className="mt-4 text-slate-600 font-mono text-[10px] tracking-widest">
                {t('MAX WAVE RECORD:', lang)} <span className="text-white">{maxWaveReached}</span>
            </div>

            <div className="hidden sm:block absolute bottom-4 right-4 text-right">
                <div className="text-[10px] font-mono text-slate-700">{t('DEV: Goodboycat', lang)}</div>
                <a
                    href="mailto:goodboykitty2@gmail.com"
                    className="text-[10px] font-mono text-slate-800 hover:text-purple-400 transition-colors flex items-center gap-1 justify-end"
                >
                    <Mail size={10} />
                    goodboykitty2@gmail.com
                </a>
            </div>

            {/* --- NEW GAME CONFIRM MODAL --- */}
            <AnimatePresence>
                {showNewGameConfirm && (
                    <div className="fixed inset-0 z-[200] bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
                        <motion.div
                            {...({
                                initial: { opacity: 0, scale: 0.95 },
                                animate: { opacity: 1, scale: 1 },
                                exit: { opacity: 0, scale: 0.95 },
                            } as any)}
                            className="bg-slate-900 border border-rose-500/50 p-6 rounded-2xl max-w-sm w-full text-center space-y-4 shadow-2xl"
                        >
                            <h3 className="font-tech text-xl text-white font-bold uppercase">
                                {t('START NEW GAME?', lang)}
                            </h3>
                            <p className="text-xs text-slate-300 leading-relaxed">
                                {t(
                                    'This will reset your current save data and begin a fresh journey from Wave 1.',
                                    lang
                                )}
                            </p>
                            <div className="grid grid-cols-2 gap-3 pt-2">
                                <button
                                    onClick={() => setShowNewGameConfirm(false)}
                                    className="py-3 rounded-xl bg-slate-800 text-slate-200 font-tech text-xs uppercase font-bold min-h-[48px]"
                                >
                                    {t('Cancel', lang)}
                                </button>
                                <button
                                    onClick={() => {
                                        setShowNewGameConfirm(false);
                                        if (onResetSave) onResetSave();
                                    }}
                                    className="py-3 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-tech text-xs uppercase font-bold min-h-[48px]"
                                >
                                    {t('CONFIRM RESET', lang)}
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* --- NOTE POPUP --- */}
            <AnimatePresence>
                {showNote && (
                    <div className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
                        <motion.div
                            {...({
                                initial: { opacity: 0, scale: 0.95 },
                                animate: { opacity: 1, scale: 1 },
                                exit: { opacity: 0, scale: 0.95 },
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
                                {t('DEV NOTE', lang)}
                            </h2>

                            <div className="space-y-4 text-slate-300 font-light leading-relaxed text-sm md:text-base">
                                <p>
                                    {t("Hi, I'm ", lang)}
                                    <strong className="text-white">Goodboycat</strong>.
                                </p>
                                <p>
                                    {t('Thank you for playing ', lang)}
                                    <strong>Light Rogue Void</strong>
                                    {t('. This project is a passion project of mine.', lang)}
                                </p>
                                <p>
                                    {t(
                                        'If you have any feedback or just want to say hi, please feel free to reach out to me at:',
                                        lang
                                    )}
                                </p>
                                <p className="text-purple-400 font-mono text-xs">goodboykitty2@gmail.com</p>
                                <p className="pt-4 text-xs text-slate-500 border-t border-slate-800 italic">
                                    {t('"Be the spark that refuses to fade."', lang)}
                                </p>
                            </div>

                            <div className="mt-8 text-center">
                                <button
                                    onClick={() => setShowNote(false)}
                                    className="px-6 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg font-tech text-xs tracking-widest transition-colors border border-slate-600"
                                >
                                    {t('CLOSE TRANSMISSION', lang)}
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* --- GUIDEBOOK --- */}
            <AnimatePresence>
                {showGuide && (
                    <GuidebookModal
                        onClose={() => setShowGuide(false)}
                        gameState={gameState}
                        stats={playerStats}
                    />
                )}
            </AnimatePresence>

            {/* --- COSMETICS MODAL --- */}
            <AnimatePresence>
                {showCosmetics && (
                    <CosmeticsModal
                        lang={lang}
                        equippedSkin={gameState.equippedSkin || 'skin_default'}
                        equippedTrail={gameState.equippedTrail || 'trail_default'}
                        unlockedCosmetics={gameState.unlockedCosmetics || ['skin_default', 'trail_default']}
                        newCosmeticIds={gameState.newCosmeticIds || []}
                        onEquipSkin={id => onEquipCosmetic && onEquipCosmetic('skin', id)}
                        onEquipTrail={id => onEquipCosmetic && onEquipCosmetic('trail', id)}
                        onClearNewCosmetics={onClearNewCosmetics}
                        onClose={() => setShowCosmetics(false)}
                    />
                )}
            </AnimatePresence>
        </div>
    );
};

export default MainMenu;
