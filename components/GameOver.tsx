import React, { useMemo, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { VOID_PHRASES } from '../data/phrases';
import { Play, Compass, Copy, Check, Sparkles, Clock, Skull, Flame, Award, HelpCircle } from 'lucide-react';
import { RunNode } from '../data/mapNodes';
import { ABILITY_TREE_DATA } from '../data';
import { Settings, AbilityNodeData } from '../types';
import { DamageSource, RunStats } from './game/types';
import { t } from '../translate';
import { BOSS_RETRY_CONFIG, BOSS_NAMES, BOSS_HINTS, getBossHintKey } from './game/bossRetry';
import FeedbackModal from './FeedbackModal';

export const DEATH_SCREEN_CONFIG = {
    NORMAL_SHUTDOWN_MS: 1200,
    SHORT_SHUTDOWN_MS: 500,
    BOSS_SHUTDOWN_MS: 150,
    DEATHS_FOR_SHORT_ANIM: 3,
};

let sessionDeathCount = 0;
let feedbackOfferedSession = false;

// 20 one-line contextual survival tips indexed by enemy/hazard/projectile keywords
export const DEATH_CAUSE_TIPS: Array<{ match: string[]; en: string; es: string }> = [
    { match: ['missile', 'homing', 'spirit'], en: 'Dash through homing missiles or shoot them down before impact.', es: 'Impúlsate a través de los misiles guiados o dispárales antes del impacto.' },
    { match: ['sniper', 'solar ray', 'mirage', 'gamma', 'railgun'], en: 'Watch for the thin red aim laser and dash perpendicular right before it fires.', es: 'Observa el láser rojo de puntería e impúlsate en perpendicular justo antes del disparo.' },
    { match: ['hive', 'larva', 'swarm', 'mite'], en: 'Keep moving in wide arcs so swarms cannot surround your spark.', es: 'Muévete en arcos amplios para que los enjambres no rodeen tu chispa.' },
    { match: ['crab', 'construct', 'iron', 'monolith', 'tank'], en: 'Heavy tanks are slow—kite them while your ranged powers wear them down.', es: 'Los tanques pesados son lentos: mantén la distancia mientras tus poderes los desgastan.' },
    { match: ['phase', 'shade', 'assassin', 'valkyrie', 'wraith'], en: 'Save your Dash for when stealthy dashers lunge toward you.', es: 'Guarda tu Impulso para cuando los enemigos veloces se abalancen sobre ti.' },
    { match: ['weaver', 'vortex', 'gravity', 'singularity', 'magnetar'], en: 'Dash outward when pulled by gravity wells to break free of their orbit.', es: 'Impúlsate hacia afuera cuando te atraigan los pozos gravitatorios.' },
    { match: ['kamikaze', 'pulsar', 'plasma storm', 'explode'], en: 'Trigger volatile enemies from afar or dash away the moment they pulse.', es: 'Detona a los enemigos explosivos desde lejos o aléjate cuando empiecen a brillar.' },
    { match: ['spiral', 'ring', 'turret', 'guardian', 'tesla'], en: 'Slip between projectile rings at medium distance where gaps are widest.', es: 'Cruza entre los anillos de proyectiles a media distancia, donde los huecos son más amplios.' },
    { match: ['comet', 'trail', 'firefly', 'solar wisp', 'lava'], en: 'Avoid crossing burning wakes left behind by trail enemies.', es: 'Evita cruzar las estelas ardientes que dejan los enemigos veloces.' },
    { match: ['healer', 'mender', 'nanite', 'pylon'], en: 'Eliminate green healing drones and pylons first so tough foes cannot recover.', es: 'Elimina primero a los drones y pilones curativos verdes.' },
    { match: ['spawner', 'mother', 'brood', 'chaos engine', 'necromancer'], en: 'Focus down spawner enemies quickly before their minions flood the arena.', es: 'Concentra el fuego en los engendradores antes de que inunden la arena.' },
    { match: ['warden', 'toxic', 'gas', 'poison', 'acid'], en: 'Stay out of toxic nebula clouds and lure the boss into open space.', es: 'Mantente fuera de las nubes tóxicas y atrae al jefe a campo abierto.' },
    { match: ['eclipse', 'death ray', 'laser', 'barrier'], en: 'Move with the rotating solar beams and use your Purging Beam [E] to stun bosses.', es: 'Muévete con los rayos solares giratorios y usa tu Rayo Purificador [E] para aturdir.' },
    { match: ['neutron', 'black hole', 'horizon'], en: 'Keep your distance from collapsing stars and save Dash for gravity surges.', es: 'Mantén distancia de las estrellas colapsantes y guarda el Impulso para tirones gravitatorios.' },
    { match: ['titan', 'smash', 'shockwave'], en: 'Watch the ground telegraph rings and step outside before the impact lands.', es: 'Observa los anillos de aviso en el suelo y sal del área antes del impacto.' },
    { match: ['darkness', 'void', 'omen', 'avatar'], en: 'Unleash your full Light Energy bar [E] to paralyze bosses for 5s and deal x1.5 damage!', es: '¡Desata tu barra de Energía de Luz [E] para paralizar jefes por 5s y hacer x1.5 de daño!' },
    { match: ['dart', 'anomaly'], en: 'Watch the red edge arrows to spot off-screen chaos darts early.', es: 'Observa las flechas rojas del borde para detectar dardos fuera de pantalla.' },
    { match: ['fracture', 'split'], en: 'Be ready for Fracture crystals to split into two smaller shards upon defeat.', es: 'Prepárate cuando los cristales Fractura se dividan en dos al morir.' },
    { match: ['nullifier'], en: 'Keep Nullifiers at bay—their touch drains your harvested Essence.', es: 'Mantén a raya a los Nulificadores; su toque drena tu Esencia.' },
    { match: ['default'], en: 'Spend Matter in the Constellation of Virtues to permanently strengthen your Spark.', es: 'Gasta Materia en la Constelación de Virtudes para fortalecer tu Chispa permanentemente.' },
];

export function getContextualTip(causeLabel: string | undefined, lang: 'en' | 'es'): string {
    const lower = (causeLabel || '').toLowerCase();
    if (lower) {
        for (const item of DEATH_CAUSE_TIPS) {
            if (item.match.some(k => lower.includes(k))) {
                return lang === 'es' ? item.es : item.en;
            }
        }
    }
    const fallback = DEATH_CAUSE_TIPS[DEATH_CAUSE_TIPS.length - 1];
    return lang === 'es' ? fallback.es : fallback.en;
}

interface GameOverProps {
    settings?: Settings;
    wave: number;
    maxWaveReached: number;
    maturityTitle: string;
    onRestart: (wave?: number, options?: { isBossRetry?: boolean }) => void;
    onRetryBoss?: () => void;
    onReturnToMenu: () => void;
    onOpenEvolutionMatrix?: (focusNodeId?: string) => void;
    currentMapId?: string;
    currentRunPath?: RunNode[];
    deathCause?: DamageSource;
    runStats?: RunStats;
    bestBossProgress?: Record<string, number>;
    bossFailedAttempts?: number;
    currentMatter?: number;
    unlockedAbilityIds?: string[];
    recentDamageSources?: string[];
    averageFps?: number;
}

const GameOver: React.FC<GameOverProps> = ({
    wave,
    maxWaveReached,
    maturityTitle,
    onRestart,
    onRetryBoss,
    onReturnToMenu,
    onOpenEvolutionMatrix,
    currentMapId,
    currentRunPath,
    settings,
    deathCause,
    runStats,
    bestBossProgress = {},
    bossFailedAttempts = 0,
    currentMatter = 0,
    unlockedAbilityIds = ['root'],
    recentDamageSources = [],
    averageFps = 60,
}) => {
    const lang = settings?.language || 'en';
    const phrase = useMemo(() => VOID_PHRASES[Math.floor(Math.random() * VOID_PHRASES.length)], []);
    const [showContent, setShowContent] = useState(false);
    const [selectedWave, setSelectedWave] = useState(1);
    const [copied, setCopied] = useState(false);
    const [showFeedback, setShowFeedback] = useState(false);
    const [autoOfferedFeedback, setAutoOfferedFeedback] = useState(false);

    const waveRange = useMemo(() => {
        const node = (currentRunPath || []).find(n => n.id === currentMapId);
        if (!node) {
            return { min: 1, max: Math.max(1, maxWaveReached) };
        }
        if (node.type === 'EVENT' || node.type === 'SECRET' || node.waveRange[0] >= 100) {
            return { min: node.waveRange[0], max: node.waveRange[0] };
        }
        const min = node.waveRange[0];
        const max = Math.max(min, Math.min(node.waveRange[1], maxWaveReached));
        return { min, max };
    }, [currentMapId, currentRunPath, maxWaveReached]);

    const isSpecial = useMemo(() => {
        const node = (currentRunPath || []).find(n => n.id === currentMapId);
        return node ? (node.type === 'EVENT' || node.type === 'SECRET' || node.waveRange[0] >= 100) : false;
    }, [currentMapId, currentRunPath]);

    // Determine next cheapest revealed node for the Next-Unlock Bar
    const nextGoalNode = useMemo<AbilityNodeData | null>(() => {
        const unlockedSet = new Set(unlockedAbilityIds);
        const candidates = ABILITY_TREE_DATA.filter(
            n => !unlockedSet.has(n.id) && (n.parentIds.length === 0 || n.parentIds.some(pid => unlockedSet.has(pid)))
        ).sort((a, b) => a.cost - b.cost);
        return candidates[0] || null;
    }, [unlockedAbilityIds]);

    // Top 3 powers by damage dealt
    const topPowers = useMemo(() => {
        const map = runStats?.damageByPower || {};
        return Object.entries(map)
            .filter(([, dmg]) => dmg > 0)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 3);
    }, [runStats?.damageByPower]);

    // Near-miss line calculation
    const nearMissText = useMemo(() => {
        if (runStats?.bossId) {
            const bName = BOSS_NAMES[runStats.bossId]?.[lang === 'es' ? 'es' : 'en'] || runStats.bossId;
            const pct = runStats.bossHpPct ?? 100;
            return `${bName}: ${pct}% ${t('left', lang)}`;
        }
        if (wave >= maxWaveReached && wave > 1) {
            return t('NEW BEST!', lang);
        }
        const diff = maxWaveReached - wave;
        if (diff === 1) {
            return t('1 wave from your best!', lang);
        }
        if (diff === 2) {
            return t('2 waves from your best!', lang);
        }
        return null;
    }, [runStats?.bossId, runStats?.bossHpPct, wave, maxWaveReached, lang]);

    const animDurationSec = useMemo(() => {
        sessionDeathCount++;
        if (runStats?.bossId) return DEATH_SCREEN_CONFIG.BOSS_SHUTDOWN_MS / 1000;
        if (sessionDeathCount >= DEATH_SCREEN_CONFIG.DEATHS_FOR_SHORT_ANIM) {
            return DEATH_SCREEN_CONFIG.SHORT_SHUTDOWN_MS / 1000;
        }
        return DEATH_SCREEN_CONFIG.NORMAL_SHUTDOWN_MS / 1000;
    }, [runStats?.bossId]);

    useEffect(() => {
        const timer = setTimeout(() => {
            setShowContent(true);
            if (sessionDeathCount === 2 && !feedbackOfferedSession) {
                feedbackOfferedSession = true;
                setAutoOfferedFeedback(true);
                setShowFeedback(true);
            }
        }, animDurationSec * 1000);
        setSelectedWave(waveRange.max);
        return () => clearTimeout(timer);
    }, [waveRange.max, animDurationSec]);

    const formatTime = (frames: number) => {
        const totalSec = Math.max(1, Math.round(frames / 60));
        const m = Math.floor(totalSec / 60);
        const s = totalSec % 60;
        return `${m}:${s < 10 ? '0' : ''}${s}`;
    };

    const handleCopyResult = () => {
        const timeStr = formatTime(runStats?.runFrames || 0);
        const topStr = topPowers.map(([name, dmg]) => `${name} (${Math.round(dmg)})`).join(', ') || 'Spark Pulse';
        const modeLabel = runStats?.isVoidRush ? 'Void Rush' : `Wave ${wave}`;
        const summary = `Light Rogue Void — ${modeLabel} | ${t(maturityTitle, lang)} | Time: ${timeStr} | Kills: ${runStats?.kills || 0} | Best Combo: ${runStats?.bestCombo || 0}x | Essence: +${Math.round(runStats?.essenceEarned || 0)}${runStats?.voidRushScore ? ` | Score: ${runStats.voidRushScore}` : ''} | Top Powers: ${topStr}`;
        try {
            navigator.clipboard.writeText(summary);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch {}
    };

    const effectiveCause = deathCause || runStats?.deathCause;
    const tipText = getContextualTip(effectiveCause?.label || effectiveCause?.id, lang);

    return (
        <div
            onClick={() => {
                if (!showContent) setShowContent(true);
            }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black overflow-y-auto pointer-events-auto p-4"
        >
            {/* --- TV SHUTDOWN ANIMATION (Tap anywhere skips) --- */}
            <AnimatePresence>
                {!showContent && (
                    <motion.div
                        className="absolute inset-0 z-[110] bg-white pointer-events-none"
                        {...({
                            initial: { opacity: 0 },
                            animate: {
                                opacity: [0, 1, 1, 0],
                                scaleX: [1, 1.2, 1, 0],
                                scaleY: [1, 1.1, 0.005, 0],
                            },
                            transition: {
                                duration: animDurationSec,
                                times: [0, 0.2, 0.8, 1],
                                ease: 'easeInOut',
                            },
                        } as any)}
                    />
                )}
            </AnimatePresence>

            {/* --- CONTENT --- */}
            <AnimatePresence>
                {showContent && (
                    <motion.div
                        {...({
                            initial: { opacity: 0, y: 16 },
                            animate: { opacity: 1, y: 0 },
                        } as any)}
                        className="text-center w-full max-w-xl flex flex-col items-center relative z-20 my-auto py-3"
                    >
                        <motion.h1
                            className="text-4xl sm:text-6xl font-tech text-red-600 mb-1 tracking-tighter drop-shadow-[0_0_25px_rgba(220,38,38,0.5)] font-bold"
                            {...({
                                animate: { opacity: [1, 0.85, 1] },
                                transition: { duration: 1.5, repeat: Infinity },
                            } as any)}
                        >
                            {runStats?.isVoidRush ? t('VOID RUSH COMPLETE', lang) : t('EXTINGUISHED', lang)}
                        </motion.h1>

                        {/* Near-miss / New Best badge */}
                        <div className="flex flex-wrap items-center justify-center gap-2 mb-3">
                            <span className="text-slate-400 font-mono tracking-widest text-xs uppercase">
                                {isSpecial
                                    ? t('COSMIC RESONANCE COLLAPSED', lang)
                                    : `${t('Wave {wave} reached', lang).replace('{wave}', String(wave))} • ${t(maturityTitle, lang)}`}
                            </span>
                            {nearMissText && (
                                <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 border border-amber-400/60 text-amber-300 font-tech font-bold text-xs tracking-wider uppercase shadow-[0_0_12px_rgba(251,191,36,0.3)]">
                                    {nearMissText}
                                </span>
                            )}
                        </div>

                        {/* 1. RUN SUMMARY CARD */}
                        <div className="w-full bg-slate-950/90 border border-slate-800 rounded-2xl p-4 mb-3 shadow-xl text-left space-y-3">
                            <div className="grid grid-cols-4 gap-2 text-center border-b border-slate-800/80 pb-3">
                                <div className="bg-slate-900/60 rounded-xl p-2 border border-slate-800/60">
                                    <div className="text-[9px] font-mono text-slate-400 uppercase flex items-center justify-center gap-1">
                                        <Clock size={10} className="text-cyan-400" /> {t('TIME', lang)}
                                    </div>
                                    <div className="font-tech text-sm sm:text-base text-white font-bold mt-0.5">
                                        {formatTime(runStats?.runFrames || 0)}
                                    </div>
                                </div>
                                <div className="bg-slate-900/60 rounded-xl p-2 border border-slate-800/60">
                                    <div className="text-[9px] font-mono text-slate-400 uppercase flex items-center justify-center gap-1">
                                        <Skull size={10} className="text-rose-400" /> {t('KILLS', lang)}
                                    </div>
                                    <div className="font-tech text-sm sm:text-base text-white font-bold mt-0.5">
                                        {runStats?.kills || 0}
                                    </div>
                                </div>
                                <div className="bg-slate-900/60 rounded-xl p-2 border border-slate-800/60">
                                    <div className="text-[9px] font-mono text-slate-400 uppercase flex items-center justify-center gap-1">
                                        <Flame size={10} className="text-amber-400" /> {t('COMBO', lang)}
                                    </div>
                                    <div className="font-tech text-sm sm:text-base text-amber-300 font-bold mt-0.5">
                                        {runStats?.bestCombo || 0}x
                                    </div>
                                </div>
                                <div className="bg-slate-900/60 rounded-xl p-2 border border-slate-800/60">
                                    <div className="text-[9px] font-mono text-slate-400 uppercase flex items-center justify-center gap-1">
                                        <Sparkles size={10} className="text-purple-400" /> {t('MATTER', lang)}
                                    </div>
                                    <div className="font-tech text-sm sm:text-base text-emerald-400 font-bold mt-0.5">
                                        +{Math.round((runStats?.essenceEarned || 0) + (runStats?.voidRushMatterReward || 0))}
                                    </div>
                                </div>
                            </div>

                            {/* Void Rush Score Banner if applicable */}
                            {runStats?.isVoidRush && (
                                <div className="flex items-center justify-between bg-purple-950/40 border border-purple-500/40 rounded-xl px-3 py-2">
                                    <span className="text-xs font-tech text-purple-200 uppercase tracking-wider">
                                        {t('VOID RUSH SCORE', lang)}
                                    </span>
                                    <span className="font-tech text-lg font-bold text-amber-300">
                                        {runStats.voidRushScore || 0} ({t('Bonus Matter:', lang)} +{runStats.voidRushMatterReward || 0})
                                    </span>
                                </div>
                            )}

                            {/* Top 3 Powers & Killed By */}
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                                <div className="flex flex-wrap items-center gap-1.5">
                                    <span className="text-[10px] font-mono uppercase text-slate-400">
                                        {t('Top Powers:', lang)}
                                    </span>
                                    {topPowers.length > 0 ? (
                                        topPowers.map(([name, dmg]) => (
                                            <span
                                                key={name}
                                                className="px-2 py-0.5 rounded bg-slate-900 border border-slate-700 text-cyan-300 font-mono text-[10px]"
                                            >
                                                {t(name, lang)} ({Math.round(dmg)})
                                            </span>
                                        ))
                                    ) : (
                                        <span className="text-slate-500 font-mono text-[10px]">Spark Pulse</span>
                                    )}
                                </div>

                                {effectiveCause && (
                                    <div className="text-[11px] font-mono text-rose-400 shrink-0">
                                        {t('Killed by:', lang)}{' '}
                                        <span className="text-rose-200 font-bold">{t(effectiveCause.label, lang)}</span>
                                    </div>
                                )}
                            </div>

                            {/* Contextual 1-Line Tip + Copy Result */}
                            <div className="flex items-center justify-between gap-2 bg-slate-900/90 border border-slate-800 rounded-xl px-3 py-2">
                                <div className="flex items-center gap-2 text-xs text-amber-200/90">
                                    <HelpCircle size={14} className="text-amber-400 shrink-0" />
                                    <span className="leading-snug">{tipText}</span>
                                </div>
                                <button
                                    type="button"
                                    onClick={handleCopyResult}
                                    className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-200 font-mono text-[10px] flex items-center gap-1 shrink-0 cursor-pointer min-h-[36px]"
                                >
                                    {copied ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                                    {copied ? t('COPIED', lang) : t('COPY RESULT', lang)}
                                </button>
                            </div>
                        </div>

                        {/* 3. NEXT-UNLOCK PROGRESS BAR */}
                        {nextGoalNode && (
                            <div className="w-full bg-slate-950/90 border border-purple-500/30 rounded-2xl p-3.5 mb-3 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-lg">
                                <div className="flex-1 w-full text-left">
                                    <div className="flex justify-between items-center text-xs font-mono mb-1">
                                        <span className="text-purple-300 font-bold uppercase">
                                            {t('Next Unlock:', lang)} {t(nextGoalNode.title, lang)}{' '}
                                            <span className="text-slate-400">({nextGoalNode.statBoostDisplay})</span>
                                        </span>
                                        <span
                                            className={`font-bold ${
                                                currentMatter >= nextGoalNode.cost ? 'text-emerald-400' : 'text-amber-300'
                                            }`}
                                        >
                                            {Math.floor(currentMatter)} / {nextGoalNode.cost} {t('Matter', lang)}
                                        </span>
                                    </div>
                                    <div className="w-full h-2 bg-slate-900 rounded-full overflow-hidden border border-slate-800">
                                        <div
                                            className={`h-full transition-all duration-500 ${
                                                currentMatter >= nextGoalNode.cost
                                                    ? 'bg-gradient-to-r from-emerald-500 to-cyan-400'
                                                    : 'bg-gradient-to-r from-purple-500 to-amber-400'
                                            }`}
                                            style={{
                                                width: `${Math.min(100, Math.round((currentMatter / Math.max(1, nextGoalNode.cost)) * 100))}%`,
                                            }}
                                        />
                                    </div>
                                </div>
                                {onOpenEvolutionMatrix && (
                                    <button
                                        type="button"
                                        onClick={() => onOpenEvolutionMatrix(nextGoalNode.id)}
                                        className="px-4 py-2.5 rounded-xl bg-purple-900/60 hover:bg-purple-800 border border-purple-400/60 text-purple-100 font-tech text-xs tracking-wider uppercase font-bold shrink-0 cursor-pointer min-h-[48px] flex items-center gap-1.5"
                                    >
                                        <Sparkles size={14} className="text-amber-300" />
                                        {t('OPEN STAR CHART', lang)}
                                    </button>
                                )}
                            </div>
                        )}

                        {/* Respawn wave slider when not in boss or Void Rush */}
                        {!runStats?.bossId && !runStats?.isVoidRush && waveRange.max > waveRange.min && (
                            <div className="w-full bg-slate-900/60 px-4 py-2.5 rounded-xl border border-slate-800 mb-3 flex items-center justify-between gap-4">
                                <label className="text-xs text-slate-400 font-tech uppercase tracking-widest shrink-0">
                                    {t('Respawn Wave:', lang)}
                                </label>
                                <div className="flex items-center gap-3 flex-1">
                                    <span className="font-mono text-xs text-slate-500">{waveRange.min}</span>
                                    <input
                                        type="range"
                                        min={waveRange.min}
                                        max={waveRange.max}
                                        value={selectedWave}
                                        onChange={e => setSelectedWave(parseInt(e.target.value))}
                                        className="flex-1 accent-purple-500 h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer"
                                    />
                                    <span className="font-mono text-purple-400 font-bold text-base w-6">{selectedWave}</span>
                                </div>
                            </div>
                        )}

                        {/* 5. THUMB-ZONE ACTION BUTTONS: RETRY (Largest), SPEND MATTER, MENU */}
                        <div className="flex flex-col gap-2.5 w-full">
                            {runStats?.bossId ? (
                                <motion.button
                                    {...({
                                        whileHover: { scale: 1.02 },
                                        whileTap: { scale: 0.97 },
                                    } as any)}
                                    onClick={() => {
                                        if (onRetryBoss) onRetryBoss();
                                        else onRestart(wave, { isBossRetry: true });
                                    }}
                                    className="w-full py-4 px-8 bg-gradient-to-r from-red-600 via-rose-500 to-amber-600 hover:from-red-500 hover:to-amber-500 text-white font-tech text-xl tracking-[0.2em] transition-all flex items-center justify-center gap-3 uppercase font-bold rounded-2xl shadow-[0_0_25px_rgba(225,29,72,0.4)] border-2 border-rose-400 cursor-pointer min-h-[56px]"
                                >
                                    <Play size={22} fill="currentColor" />
                                    {t('RETRY BOSS', lang)}
                                </motion.button>
                            ) : (
                                <motion.button
                                    {...({
                                        whileHover: { scale: 1.02 },
                                        whileTap: { scale: 0.97 },
                                    } as any)}
                                    onClick={() => onRestart(selectedWave)}
                                    className="w-full py-4 px-8 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-tech text-xl tracking-[0.2em] transition-all flex items-center justify-center gap-3 uppercase font-bold rounded-2xl shadow-[0_0_25px_rgba(220,38,38,0.4)] border-2 border-red-400 cursor-pointer min-h-[56px]"
                                >
                                    <Play size={22} fill="currentColor" />
                                    {runStats?.isVoidRush
                                        ? t('RETRY VOID RUSH', lang)
                                        : isSpecial
                                        ? t('RE-ATTEMPT STABILIZATION', lang)
                                        : `${t('RETRY WAVE', lang)} ${selectedWave}`}
                                </motion.button>
                            )}

                            <div className="grid grid-cols-2 gap-2.5 w-full">
                                {onOpenEvolutionMatrix && (
                                    <button
                                        type="button"
                                        onClick={() => onOpenEvolutionMatrix(nextGoalNode?.id)}
                                        className="py-3 px-4 bg-slate-900 hover:bg-slate-800 border border-amber-500/40 text-amber-300 font-tech text-xs sm:text-sm tracking-wider uppercase font-bold rounded-xl flex items-center justify-center gap-2 cursor-pointer min-h-[48px]"
                                    >
                                        <Award size={16} />
                                        {t('SPEND MATTER', lang)} ({Math.floor(currentMatter)})
                                    </button>
                                )}
                                <button
                                    type="button"
                                    onClick={onReturnToMenu}
                                    className={`${
                                        onOpenEvolutionMatrix ? '' : 'col-span-2'
                                    } py-3 px-4 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 hover:text-white font-tech text-xs sm:text-sm tracking-wider uppercase font-bold rounded-xl flex items-center justify-center gap-2 cursor-pointer min-h-[48px]`}
                                >
                                    <Compass size={16} className="text-cyan-400" />
                                    {t('UNIVERSE MAP', lang)}
                                </button>
                            </div>
                        </div>

                        <p className="mt-3 text-[11px] text-slate-500 italic">"{t(phrase, lang)}"</p>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Small "?" Feedback Button in Top Right of GameOver screen */}
            {showContent && (
                <button
                    type="button"
                    onClick={(e) => {
                        e.stopPropagation();
                        setAutoOfferedFeedback(false);
                        setShowFeedback(true);
                    }}
                    title={t('Feedback & Bug Report', lang)}
                    aria-label="Feedback & Bug Report"
                    className="fixed top-5 right-5 z-[130] w-10 h-10 rounded-full bg-slate-900/90 hover:bg-slate-800 border border-slate-700 hover:border-cyan-400 text-cyan-300 hover:text-white flex items-center justify-center shadow-lg cursor-pointer"
                >
                    <HelpCircle size={18} />
                </button>
            )}

            <FeedbackModal
                isOpen={showFeedback}
                onClose={() => setShowFeedback(false)}
                wave={wave}
                bossId={runStats?.bossId || null}
                performanceMode={settings?.performanceMode || 'HIGH'}
                averageFps={averageFps}
                last5DamageSources={
                    recentDamageSources.length > 0
                        ? recentDamageSources
                        : effectiveCause
                        ? [effectiveCause.label]
                        : []
                }
                lang={lang}
                autoOffered={autoOfferedFeedback}
            />

            {/* Pure Black Void Background */}
            <div className="absolute inset-0 bg-black pointer-events-none" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(30,0,0,0.2)_0%,_rgba(0,0,0,1)_80%)] pointer-events-none" />
        </div>
    );
};

export default GameOver;
