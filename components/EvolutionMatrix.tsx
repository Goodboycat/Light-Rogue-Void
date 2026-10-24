import React, { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import { motion, useMotionValue, animate, AnimatePresence } from 'framer-motion';
import {
    BookOpen,
    ChevronLeft,
    ChevronRight,
    Zap,
    Settings,
    Trophy,
    PlayCircle,
    Compass,
    RotateCcw,
    Sparkles,
    HelpCircle,
} from 'lucide-react';
import { GameState, PlayerStats, AbilityType, AbilityNodeData } from '../types';
import { ABILITY_TREE_DATA } from '../data';
import SkillNode from './SkillNode';
import GuidebookModal from './GuidebookModal';
import FeedbackModal from './FeedbackModal';
import { t } from '../translate';

export const EVOLUTION_CONFIG = {
    FREE_RESPEC_PLAYTIME_SEC: 900, // 15 minutes
    PAID_RESPEC_COST_MATTER: 50,
    CULL_PADDING_PX: 320,
    OFFSCREEN_CANVAS_SIZE: 3200,
    OFFSCREEN_ORIGIN: 1600,
};

interface EvolutionMatrixProps {
    gameState: GameState;
    onUnlock: (id: string) => void;
    onBatchUnlock: (ids: string[]) => void;
    onRespec?: (feeMatter: number) => void;
    onOpenBestiary: () => void;
    onOpenAchievements: () => void;
    onOpenSettings: () => void;
    onResume: () => void;
    onReturnToMenu: () => void;
    playerStats?: PlayerStats | null;
    onClearHighlightNextNode?: () => void;
    focusNodeId?: string | null;
}

const EvolutionMatrix: React.FC<EvolutionMatrixProps> = ({
    gameState,
    onUnlock,
    onBatchUnlock,
    onRespec,
    onOpenBestiary,
    onOpenAchievements,
    onOpenSettings,
    onResume,
    onReturnToMenu,
    playerStats = null,
    onClearHighlightNextNode,
    focusNodeId = null,
}) => {
    const lang = gameState?.settings?.language || 'en';
    const [showGuide, setShowGuide] = useState(false);
    const [showFeedback, setShowFeedback] = useState(false);
    const scale = useMotionValue(0.8);
    const dragX = useMotionValue(0);
    const dragY = useMotionValue(0);
    const [isPinching, setIsPinching] = useState(false);
    const [floatingPopups, setFloatingPopups] = useState<Array<{ id: number; text: string; color: string }>>([]);

    // Viewport culling state (updated on pan/zoom end or throttled)
    const [viewBounds, setViewBounds] = useState({ cx: 0, cy: 0, s: 0.8 });
    const connectionsCanvasRef = useRef<HTMLCanvasElement | null>(null);

    const prevWholeStatsRef = useRef<{ hp: number; proj: number }>({
        hp: playerStats?.maxHealth || 3,
        proj: playerStats?.projectileCount || 0,
    });

    // Detect when a whole Max HP or Orbital unit lands and spawn a floating "+1 HP" / "+1 Orbital" popup
    useEffect(() => {
        if (!playerStats) return;
        const curHp = playerStats.maxHealth;
        const curProj = playerStats.projectileCount;
        if (curHp > prevWholeStatsRef.current.hp) {
            const diff = curHp - prevWholeStatsRef.current.hp;
            setFloatingPopups(prev => [
                ...prev,
                { id: Date.now() + Math.random(), text: `+${diff} MAX HP!`, color: '#34d399' },
            ]);
        }
        if (curProj > prevWholeStatsRef.current.proj) {
            const diff = curProj - prevWholeStatsRef.current.proj;
            setFloatingPopups(prev => [
                ...prev,
                { id: Date.now() + Math.random(), text: `+${diff} ORBITAL!`, color: '#fbbf24' },
            ]);
        }
        prevWholeStatsRef.current = { hp: curHp, proj: curProj };
    }, [playerStats?.maxHealth, playerStats?.projectileCount]);

    const syncViewBounds = useCallback(() => {
        setViewBounds({
            cx: dragX.get(),
            cy: dragY.get(),
            s: scale.get(),
        });
    }, [dragX, dragY, scale]);

    useEffect(() => {
        const unsubX = dragX.on('change', () => {
            // Lightweight check
            syncViewBounds();
        });
        const unsubS = scale.on('change', () => {
            syncViewBounds();
        });
        return () => {
            unsubX();
            unsubS();
        };
    }, [dragX, scale, syncViewBounds]);

    const pinchRef = useRef<{ dist: number; startScale: number; startDragX: number; startDragY: number } | null>(null);

    const handleTouchStart = (e: React.TouchEvent) => {
        if (e.touches.length === 2) {
            setIsPinching(true);
            const dist = Math.hypot(
                e.touches[0].clientX - e.touches[1].clientX,
                e.touches[0].clientY - e.touches[1].clientY
            );
            pinchRef.current = {
                dist,
                startScale: scale.get(),
                startDragX: dragX.get(),
                startDragY: dragY.get(),
            };
        }
    };

    const handleTouchMove = (e: React.TouchEvent) => {
        if (e.touches.length === 2 && pinchRef.current) {
            const dist = Math.hypot(
                e.touches[0].clientX - e.touches[1].clientX,
                e.touches[0].clientY - e.touches[1].clientY
            );
            const newScale = Math.min(Math.max(pinchRef.current.startScale * (dist / pinchRef.current.dist), 0.25), 3.0);
            scale.set(newScale);
            const ratio = newScale / pinchRef.current.startScale;
            dragX.set(pinchRef.current.startDragX * ratio);
            dragY.set(pinchRef.current.startDragY * ratio);
        }
    };

    const handleTouchEnd = (e: React.TouchEvent) => {
        if (e.touches.length < 2) {
            setIsPinching(false);
            pinchRef.current = null;
        }
    };

    // Revealed unpurchased nodes
    const revealedLockedNodes = useMemo(() => {
        const unlockedSet = new Set(gameState.unlockedAbilityIds);
        return ABILITY_TREE_DATA.filter(n => {
            if (unlockedSet.has(n.id)) return false;
            return n.parentIds.length === 0 || n.parentIds.some(pid => unlockedSet.has(pid));
        }).sort((a, b) => a.cost - b.cost || a.id.localeCompare(b.id));
    }, [gameState.unlockedAbilityIds]);

    const buyableNodes = useMemo(() => {
        return revealedLockedNodes.filter(n => gameState.matter >= n.cost);
    }, [revealedLockedNodes, gameState.matter]);

    // Determine player's dominant AbilityType arc for "Buy Next Recommended"
    const recommendedNode = useMemo<AbilityNodeData | null>(() => {
        if (revealedLockedNodes.length === 0) return null;
        const counts: Record<string, number> = {
            [AbilityType.OFFENSE]: 0,
            [AbilityType.DEFENSE]: 0,
            [AbilityType.UTILITY]: 0,
        };
        gameState.unlockedAbilityIds.forEach(id => {
            const n = ABILITY_TREE_DATA.find(x => x.id === id);
            if (n && counts[n.type] !== undefined) {
                counts[n.type] += n.isMajor ? 3 : 1;
            }
        });
        let preferredArc = AbilityType.OFFENSE;
        if (counts[AbilityType.DEFENSE] > counts[preferredArc]) preferredArc = AbilityType.DEFENSE;
        if (counts[AbilityType.UTILITY] > counts[preferredArc]) preferredArc = AbilityType.UTILITY;

        const arcAffordable = buyableNodes.filter(n => n.type === preferredArc);
        if (arcAffordable.length > 0) {
            return arcAffordable.find(n => n.isMajor) || arcAffordable[0];
        }
        if (buyableNodes.length > 0) {
            return buyableNodes.find(n => n.isMajor) || buyableNodes[0];
        }
        const arcRevealed = revealedLockedNodes.filter(n => n.type === preferredArc);
        return arcRevealed[0] || revealedLockedNodes[0] || null;
    }, [revealedLockedNodes, buyableNodes, gameState.unlockedAbilityIds]);

    const [buyableIndex, setBuyableIndex] = useState(0);

    useEffect(() => {
        if (buyableIndex >= buyableNodes.length && buyableNodes.length > 0) {
            setBuyableIndex(0);
        }
    }, [buyableNodes.length, buyableIndex]);

    // Center on focusNodeId if provided
    useEffect(() => {
        if (focusNodeId) {
            const target = ABILITY_TREE_DATA.find(n => n.id === focusNodeId);
            if (target) {
                const s = scale.get();
                animate(dragX, -target.position.x * s, { type: 'spring', stiffness: 200, damping: 25 });
                animate(dragY, -target.position.y * s, { type: 'spring', stiffness: 200, damping: 25 });
            }
        }
    }, [focusNodeId]);

    // Cache connections on a single Canvas2D layer instead of expensive SVG GaussianBlur filters
    useEffect(() => {
        const canvas = connectionsCanvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const size = EVOLUTION_CONFIG.OFFSCREEN_CANVAS_SIZE;
        const origin = EVOLUTION_CONFIG.OFFSCREEN_ORIGIN;
        ctx.clearRect(0, 0, size, size);
        ctx.lineCap = 'round';

        const unlockedSet = new Set(gameState.unlockedAbilityIds);

        // Pass 1: Locked visible connections
        ctx.strokeStyle = 'rgba(51, 65, 85, 0.65)';
        ctx.lineWidth = 3.5;
        ctx.beginPath();
        for (let i = 0; i < ABILITY_TREE_DATA.length; i++) {
            const node = ABILITY_TREE_DATA[i];
            const isNodeUnlocked = unlockedSet.has(node.id);
            if (isNodeUnlocked) continue;
            for (let j = 0; j < node.parentIds.length; j++) {
                const pid = node.parentIds[j];
                if (!unlockedSet.has(pid) && pid !== 'root') continue;
                const p = ABILITY_TREE_DATA.find(n => n.id === pid);
                if (!p) continue;
                ctx.moveTo(origin + p.position.x, origin + p.position.y);
                ctx.lineTo(origin + node.position.x, origin + node.position.y);
            }
        }
        ctx.stroke();

        // Pass 2: Unlocked connections by color
        const drawUnlockedByType = (type: AbilityType, color: string) => {
            ctx.strokeStyle = color;
            ctx.lineWidth = 4.5;
            ctx.beginPath();
            for (let i = 0; i < ABILITY_TREE_DATA.length; i++) {
                const node = ABILITY_TREE_DATA[i];
                if (node.type !== type || !unlockedSet.has(node.id)) continue;
                for (let j = 0; j < node.parentIds.length; j++) {
                    const p = ABILITY_TREE_DATA.find(n => n.id === node.parentIds[j]);
                    if (!p) continue;
                    ctx.moveTo(origin + p.position.x, origin + p.position.y);
                    ctx.lineTo(origin + node.position.x, origin + node.position.y);
                }
            }
            ctx.stroke();
        };

        drawUnlockedByType(AbilityType.OFFENSE, '#ef4444');
        drawUnlockedByType(AbilityType.DEFENSE, '#3b82f6');
        drawUnlockedByType(AbilityType.UTILITY, '#f59e0b');
        drawUnlockedByType(AbilityType.CORE, '#ffffff');
    }, [gameState.unlockedAbilityIds]);

    const centerNode = (index: number) => {
        if (buyableNodes.length === 0) return;
        const safeIndex = (index + buyableNodes.length) % buyableNodes.length;
        setBuyableIndex(safeIndex);
        const node = buyableNodes[safeIndex];
        dragX.stop();
        dragY.stop();
        const s = scale.get();
        animate(dragX, -node.position.x * s, { type: 'spring', stiffness: 200, damping: 25 });
        animate(dragY, -node.position.y * s, { type: 'spring', stiffness: 200, damping: 25 });
    };

    const handleNextBuyable = () => centerNode(buyableIndex + 1);
    const handlePrevBuyable = () => centerNode(buyableIndex - 1);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.code === 'ArrowRight') handleNextBuyable();
            if (e.code === 'ArrowLeft') handlePrevBuyable();
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [buyableIndex, buyableNodes]);

    const handleWheel = (e: React.WheelEvent) => {
        const currentScale = scale.get();
        const newScale = Math.min(Math.max(currentScale + (e.deltaY > 0 ? -0.1 : 0.1), 0.25), 3.0);
        const ratio = newScale / currentScale;
        scale.set(newScale);
        dragX.set(dragX.get() * ratio);
        dragY.set(dragY.get() * ratio);
    };

    // Respec availability & cost
    const totalUnlockedNodes = gameState.unlockedAbilityIds.filter(id => id !== 'root').length;
    const isFreeRespecWindow = (gameState.totalPlayTimeSec || 0) < EVOLUTION_CONFIG.FREE_RESPEC_PLAYTIME_SEC;
    const respecCost = isFreeRespecWindow ? 0 : EVOLUTION_CONFIG.PAID_RESPEC_COST_MATTER;
    const canAffordRespec = totalUnlockedNodes > 0 && gameState.matter >= respecCost;

    // Fractional stat progress bar data
    const hpRaw = playerStats?.maxHealthRaw ?? playerStats?.maxHealth ?? 3;
    const hpWhole = Math.floor(hpRaw + 1e-6);
    const hpFrac = Math.round((hpRaw - hpWhole) * 100) / 100;

    const projRaw = playerStats?.projectileCountRaw ?? playerStats?.projectileCount ?? 0;
    const projWhole = Math.floor(projRaw + 1e-6);
    const projFrac = Math.round((projRaw - projWhole) * 100) / 100;

    // Viewport culling calculation
    const visibleNodes = useMemo(() => {
        const vw = typeof window !== 'undefined' ? window.innerWidth : 1024;
        const vh = typeof window !== 'undefined' ? window.innerHeight : 768;
        const s = Math.max(0.2, viewBounds.s);
        const halfW = (vw / 2 + EVOLUTION_CONFIG.CULL_PADDING_PX) / s;
        const halfH = (vh / 2 + EVOLUTION_CONFIG.CULL_PADDING_PX) / s;
        const centerWorldX = -viewBounds.cx / s;
        const centerWorldY = -viewBounds.cy / s;

        const unlockedSet = new Set(gameState.unlockedAbilityIds);
        return ABILITY_TREE_DATA.filter(n => {
            const isRevealed = n.parentIds.length === 0 || n.parentIds.some(pid => unlockedSet.has(pid));
            const isUnlocked = unlockedSet.has(n.id);
            if (!isRevealed && !isUnlocked) return false;
            return (
                Math.abs(n.position.x - centerWorldX) <= halfW &&
                Math.abs(n.position.y - centerWorldY) <= halfH
            );
        });
    }, [viewBounds, gameState.unlockedAbilityIds]);

    const newAchievementsCount = (gameState.newAchievementIds || []).length;
    const newArchivesCount = (gameState.newArchiveEnemyIds || []).length;

    return (
        <motion.div
            {...({
                initial: { opacity: 0 },
                animate: { opacity: 1 },
                exit: { opacity: 0 },
            } as any)}
            className="absolute inset-0 z-50 bg-slate-950/95 overflow-hidden touch-none"
            onWheel={handleWheel}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
        >
            {/* Header + Fractional Pip Progress Strip */}
            <div className="absolute top-6 left-6 pointer-events-none z-10 flex flex-col gap-2">
                <div>
                    <h1 className="text-2xl sm:text-4xl font-tech font-bold text-white">
                        {t('CONSTELLATION OF VIRTUES', lang)}
                    </h1>
                    <p className="text-white/40 font-mono tracking-widest text-[10px] sm:text-xs uppercase">
                        {t('Ignite the divine spark within', lang)}
                    </p>
                </div>

                {/* Honest Fractional Stat Progress Readout */}
                {playerStats && (
                    <div className="flex flex-wrap items-center gap-2 bg-slate-900/85 border border-slate-800 px-3 py-1.5 rounded-xl text-[10px] font-mono">
                        <span className="text-emerald-300">
                            {t('Max HP', lang)} <strong>{hpWhole}</strong>
                            {hpFrac > 0 && <span className="text-slate-400"> +{hpFrac.toFixed(1)} → {hpWhole + 1}.0</span>}
                        </span>
                        <span className="text-slate-600">•</span>
                        <span className="text-amber-300">
                            {t('Orbitals', lang)} <strong>{projWhole}</strong>
                            {projFrac > 0 && <span className="text-slate-400"> +{projFrac.toFixed(2)} → {projWhole + 1}.0</span>}
                        </span>
                        <span className="text-slate-600">•</span>
                        <span className="text-cyan-300">
                            {t('Atk Spd', lang)} <strong>{Math.round((playerStats.attackSpeed || 1) * 100)}%</strong>
                        </span>
                    </div>
                )}
            </div>

            {/* Floating "+1 HP" / "+1 ORBITAL" Popups */}
            <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[80] pointer-events-none flex flex-col items-center gap-2">
                <AnimatePresence>
                    {floatingPopups.map(pop => (
                        <motion.div
                            key={pop.id}
                            {...({
                                initial: { opacity: 0, y: 15, scale: 0.8 },
                                animate: { opacity: 1, y: -20, scale: 1.1 },
                                exit: { opacity: 0, y: -40 },
                                transition: { duration: 0.9 },
                            } as any)}
                            onAnimationComplete={() => {
                                setFloatingPopups(prev => prev.filter(p => p.id !== pop.id));
                            }}
                            className="px-4 py-1.5 rounded-full bg-slate-900/95 border-2 font-tech font-bold text-sm tracking-widest shadow-xl"
                            style={{ borderColor: pop.color, color: pop.color }}
                        >
                            {pop.text}
                        </motion.div>
                    ))}
                </AnimatePresence>
            </div>

            {/* LEFT SIDE: ARCHIVES, ACHIEVEMENTS, GUIDEBOOK, RESPEC */}
            <div className="absolute top-36 left-6 z-50 flex flex-col gap-3 items-start pointer-events-auto">
                <MenuSideButton
                    onClick={onOpenAchievements}
                    icon={<Trophy size={18} />}
                    label="ACHIEVEMENTS"
                    color="text-amber-400"
                    lang={lang}
                    badgeCount={newAchievementsCount}
                />
                <MenuSideButton
                    onClick={onOpenBestiary}
                    icon={<BookOpen size={18} />}
                    label="ARCHIVES"
                    color="text-blue-400"
                    lang={lang}
                    badgeCount={newArchivesCount}
                />
                <MenuSideButton
                    onClick={() => setShowGuide(true)}
                    icon={<BookOpen size={18} />}
                    label="GUIDEBOOK"
                    color="text-cyan-400"
                    lang={lang}
                />
                {onRespec && totalUnlockedNodes > 0 && (
                    <button
                        type="button"
                        disabled={!canAffordRespec}
                        onClick={() => onRespec(respecCost)}
                        className={`flex items-center gap-2 px-3 py-2 rounded-xl border font-tech text-xs tracking-wider transition-all min-h-[44px] ${
                            canAffordRespec
                                ? 'bg-slate-900/90 hover:bg-slate-800 border-purple-500/50 text-purple-200 cursor-pointer shadow-lg'
                                : 'bg-slate-950/60 border-slate-800 text-slate-600 cursor-not-allowed opacity-60'
                        }`}
                        title="Refund 100% of spent Matter"
                    >
                        <RotateCcw size={15} className="text-purple-400" />
                        <span>
                            {isFreeRespecWindow
                                ? t('RESPEC (FREE)', lang)
                                : `${t('RESPEC', lang)} (${respecCost} M)`}
                        </span>
                    </button>
                )}
            </div>

            {showGuide && (
                <GuidebookModal
                    onClose={() => setShowGuide(false)}
                    gameState={gameState}
                    stats={playerStats}
                />
            )}

            <FeedbackModal
                isOpen={showFeedback}
                onClose={() => setShowFeedback(false)}
                wave={gameState.lastSavedWave || gameState.maxWaveReached || 1}
                performanceMode={gameState.settings?.performanceMode || 'HIGH'}
                lang={lang}
            />

            {/* TOP RIGHT CONTROLS */}
            <div className="absolute top-6 right-6 z-50 flex flex-wrap gap-2.5 justify-end pointer-events-auto">
                <button
                    type="button"
                    onClick={() => setShowFeedback(true)}
                    title={t('Feedback & Bug Report', lang)}
                    aria-label="Feedback & Bug Report"
                    className="flex items-center justify-center w-11 h-11 bg-slate-900/90 hover:bg-slate-800 border border-slate-700 hover:border-cyan-400 rounded-xl text-cyan-300 hover:text-white transition-colors font-tech text-sm font-bold shadow-lg cursor-pointer"
                >
                    <HelpCircle size={18} />
                </button>
                <button
                    onClick={onResume}
                    className="flex items-center gap-2 px-4 py-2.5 bg-white hover:bg-slate-200 border border-white rounded-xl text-slate-900 transition-all font-tech text-xs tracking-wider font-bold shadow-[0_0_15px_rgba(255,255,255,0.4)] min-h-[44px]"
                >
                    <PlayCircle size={16} fill="currentColor" />
                    {t('RESUME', lang)}
                </button>
                <button
                    onClick={onOpenSettings}
                    className="flex items-center gap-2 px-3.5 py-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-600 rounded-xl text-white transition-all font-tech text-xs tracking-wider shadow-lg min-h-[44px]"
                >
                    <Settings size={16} />
                    {t('SETTINGS', lang)}
                </button>
                <button
                    onClick={onReturnToMenu}
                    className="flex items-center gap-2 px-3.5 py-2.5 bg-cyan-950/60 hover:bg-cyan-900 border border-cyan-800 hover:border-cyan-500 rounded-xl text-cyan-200 hover:text-white transition-all font-tech text-xs tracking-wider shadow-lg min-h-[44px]"
                >
                    <Compass size={16} />
                    {t('UNIVERSE MAP', lang)}
                </button>
            </div>

            {/* Bottom Action Bar: Buy Next Recommended + Navigation + Buy All */}
            <div className="absolute bottom-20 left-1/2 -translate-x-1/2 flex flex-wrap items-center justify-center gap-3 z-50 pointer-events-auto bg-slate-900/90 p-3 rounded-2xl backdrop-blur-md border border-slate-700 shadow-2xl w-[94%] max-w-xl">
                {recommendedNode && (
                    <button
                        type="button"
                        onClick={() => {
                            if (gameState.matter >= recommendedNode.cost) {
                                if (onClearHighlightNextNode) onClearHighlightNextNode();
                                onUnlock(recommendedNode.id);
                            } else {
                                const s = scale.get();
                                animate(dragX, -recommendedNode.position.x * s, { type: 'spring', stiffness: 200, damping: 25 });
                                animate(dragY, -recommendedNode.position.y * s, { type: 'spring', stiffness: 200, damping: 25 });
                            }
                        }}
                        className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-tech font-bold text-xs tracking-wider transition-all min-h-[44px] cursor-pointer ${
                            gameState.matter >= recommendedNode.cost
                                ? 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 shadow-[0_0_20px_rgba(251,191,36,0.4)]'
                                : 'bg-slate-800 border border-amber-500/40 text-amber-300'
                        }`}
                    >
                        <Sparkles size={15} />
                        <span>
                            {gameState.matter >= recommendedNode.cost
                                ? `${t('BUY RECOMMENDED:', lang)} ${t(recommendedNode.title, lang)} (${recommendedNode.cost} M)`
                                : `${t('NEXT GOAL:', lang)} ${t(recommendedNode.title, lang)} (${Math.floor(gameState.matter)}/${recommendedNode.cost} M)`}
                        </span>
                    </button>
                )}

                {buyableNodes.length > 0 && (
                    <>
                        <div className="flex items-center gap-1.5">
                            <button
                                onClick={handlePrevBuyable}
                                className="p-2 bg-slate-800 hover:bg-purple-600 rounded-lg text-white transition-colors border border-slate-600 min-h-[40px] min-w-[40px] flex items-center justify-center"
                            >
                                <ChevronLeft size={18} />
                            </button>
                            <div className="text-xs font-mono text-slate-300 bg-black/50 px-2.5 py-1.5 rounded text-center border border-slate-800">
                                {buyableIndex + 1}/{buyableNodes.length} {t('AVAIL', lang)}
                            </div>
                            <button
                                onClick={handleNextBuyable}
                                className="p-2 bg-slate-800 hover:bg-purple-600 rounded-lg text-white transition-colors border border-slate-600 min-h-[40px] min-w-[40px] flex items-center justify-center"
                            >
                                <ChevronRight size={18} />
                            </button>
                        </div>

                        <button
                            onClick={() => onBatchUnlock(buyableNodes.map(n => n.id))}
                            className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 rounded-xl text-white font-tech font-bold text-xs tracking-wider shadow-lg transition-all active:scale-95 border border-emerald-400/50 min-h-[40px]"
                        >
                            <Zap size={15} fill="currentColor" />
                            {t('BUY ALL', lang)}
                        </button>
                    </>
                )}
            </div>

            {/* Draggable World Container */}
            <motion.div
                className={`absolute top-1/2 left-1/2 ${isPinching ? '' : 'cursor-grab active:cursor-grabbing'}`}
                style={{ x: dragX, y: dragY } as any}
                drag={!isPinching}
                dragMomentum={false}
            >
                <div className="absolute -inset-[2000px] bg-transparent" style={{ zIndex: 0 }} />

                <motion.div style={{ scale } as any} className="absolute top-0 left-0">
                    {/* Cached Offscreen-style Canvas2D for Connection Lines (zero SVG GaussianBlur lag on Mali-G52) */}
                    <canvas
                        ref={connectionsCanvasRef}
                        width={EVOLUTION_CONFIG.OFFSCREEN_CANVAS_SIZE}
                        height={EVOLUTION_CONFIG.OFFSCREEN_CANVAS_SIZE}
                        className="absolute pointer-events-none"
                        style={{
                            left: -EVOLUTION_CONFIG.OFFSCREEN_ORIGIN,
                            top: -EVOLUTION_CONFIG.OFFSCREEN_ORIGIN,
                            width: EVOLUTION_CONFIG.OFFSCREEN_CANVAS_SIZE,
                            height: EVOLUTION_CONFIG.OFFSCREEN_CANVAS_SIZE,
                            zIndex: 0,
                        }}
                    />

                    {/* Viewport-Culled Nodes */}
                    {visibleNodes.map(node => {
                        const currentLevel = gameState.unlockedAbilityIds.includes(node.id) ? 1 : 0;
                        const isRevealed =
                            node.parentIds.length === 0 ||
                            node.parentIds.some(pid => gameState.unlockedAbilityIds.includes(pid));
                        const isAffordable = currentLevel === 0 && gameState.matter >= node.cost;
                        const isRec = recommendedNode?.id === node.id;

                        return (
                            <SkillNode
                                lang={lang}
                                key={node.id}
                                data={node}
                                currentLevel={currentLevel}
                                isAffordable={isAffordable}
                                isRevealed={isRevealed}
                                onUnlock={id => {
                                    if (onClearHighlightNextNode) onClearHighlightNextNode();
                                    onUnlock(id);
                                }}
                                currentScale={scale}
                                isHighlighted={node.id === focusNodeId}
                                isRecommended={isRec}
                                playerStats={playerStats}
                            />
                        );
                    })}
                </motion.div>
            </motion.div>

            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 font-tech text-[10px] tracking-[0.4em] text-slate-400 pointer-events-none text-center">
                {t('DRAG TO PAN • PINCH TO ZOOM', lang)} • {t('ESC TO RESUME', lang)}
            </div>
        </motion.div>
    );
};

const MenuSideButton: React.FC<{
    onClick: () => void;
    icon: React.ReactNode;
    label: string;
    color: string;
    lang?: 'en' | 'es';
    badgeCount?: number;
}> = ({ onClick, icon, label, color, lang = 'en', badgeCount = 0 }) => (
    <motion.button
        onClick={onClick}
        {...({ whileHover: { x: 6 } } as any)}
        className="relative flex items-center gap-3 group p-1.5 pr-4 rounded-r-xl transition-all"
    >
        <div
            className={`relative p-2.5 bg-slate-900 border border-slate-700 rounded-xl group-hover:border-white/50 transition-colors shadow-lg ${color}`}
        >
            {icon}
            {badgeCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 px-1.5 py-0.5 rounded-full bg-amber-400 text-black font-tech font-bold text-[8px] tracking-wider uppercase shadow">
                    {t('NEW', lang)}
                </span>
            )}
        </div>
        <span className="font-tech text-xs text-slate-300 group-hover:text-white tracking-widest transition-colors bg-black/50 px-2 py-1 rounded">
            {t(label, lang)}
        </span>
    </motion.button>
);

export default EvolutionMatrix;
