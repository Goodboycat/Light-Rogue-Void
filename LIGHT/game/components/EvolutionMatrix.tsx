
import React, { useEffect, useState, useMemo, useRef } from 'react';
import { motion, useMotionValue, animate } from 'framer-motion';
import { Target, BookOpen, ChevronLeft, ChevronRight, Zap, Settings, LogOut, Trophy, PlayCircle, Search, X, RotateCcw, HelpCircle } from 'lucide-react';
import { AbilityNodeData, AbilityType, GameState } from '../types';
import { ABILITY_TREE_DATA, BOSS_DISPLAY_NAMES } from '../data';
import { RESPEC_TAX } from './game/Constants';
import Connection from './Connection';
import SkillNode from './SkillNode';

interface EvolutionMatrixProps {
    gameState: GameState;
    onUnlock: (id: string) => void;
    onBatchUnlock: (ids: string[]) => void;
    onRespec: () => void;
    onOpenBestiary: () => void;
    onOpenAchievements: () => void;
    onOpenSettings: () => void;
    onOpenGuide?: () => void; // (7A step 5)
    onResume: () => void;
    onReturnToMenu: () => void;
}

// (7A) tree UX
export const ZOOM_MIN = 0.5;
export const ZOOM_MAX = 2.5;
const NODE_BY_ID: Record<string, AbilityNodeData> = Object.fromEntries(ABILITY_TREE_DATA.map(n => [n.id, n]));
const ARC_LEGEND: { type: AbilityType; label: string; cls: string }[] = [
    { type: AbilityType.OFFENSE, label: 'OFFENSE', cls: 'bg-red-500' },
    { type: AbilityType.DEFENSE, label: 'DEFENSE', cls: 'bg-blue-500' },
    { type: AbilityType.UTILITY, label: 'UTILITY', cls: 'bg-amber-500' },
];
/** Cheapest set of locked nodes that must be bought to reach `targetId` (Dijkstra over parentIds, cost = node.cost).
 *  Returns the path from the first locked node after an unlocked ancestor down to the target, plus the total. */
export const cheapestPath = (targetId: string, unlocked: string[], defeated: string[]): { ids: string[]; total: number } | null => {
    const unl = new Set(unlocked);
    const target = NODE_BY_ID[targetId];
    if (!target || unl.has(targetId)) return null;
    const bossLocked = (n: AbilityNodeData) => !!n.requiresBoss && !defeated.includes(n.requiresBoss);
    if (bossLocked(target)) return null;
    // best[id] = cheapest total cost of locked nodes from an unlocked ancestor down to and including id
    const best: Record<string, number> = {}; const prev: Record<string, string | null> = {};
    const open: string[] = [];
    // seeds: every locked node with an unlocked parent (or a root)
    for (const n of ABILITY_TREE_DATA) {
        if (unl.has(n.id) || bossLocked(n)) continue;
        if (n.parentIds.length === 0 || n.parentIds.some(p => unl.has(p))) { best[n.id] = n.cost; prev[n.id] = null; open.push(n.id); }
    }
    const done = new Set<string>();
    while (open.length) {
        let bi = 0; for (let i = 1; i < open.length; i++) if (best[open[i]] < best[open[bi]]) bi = i;
        const id = open.splice(bi, 1)[0];
        if (done.has(id)) continue; done.add(id);
        if (id === targetId) break;
        for (const n of ABILITY_TREE_DATA) {
            if (!n.parentIds.includes(id) || unl.has(n.id) || bossLocked(n) || done.has(n.id)) continue;
            const c = best[id] + n.cost;
            if (best[n.id] === undefined || c < best[n.id]) { best[n.id] = c; prev[n.id] = id; open.push(n.id); }
        }
    }
    if (best[targetId] === undefined) return null;
    const ids: string[] = []; let cur: string | null = targetId;
    while (cur) { ids.unshift(cur); cur = prev[cur]; }
    return { ids, total: best[targetId] };
};

const EvolutionMatrix: React.FC<EvolutionMatrixProps> = ({ 
    gameState, 
    onUnlock, 
    onBatchUnlock,
    onRespec,
    onOpenBestiary, 
    onOpenAchievements,
    onOpenSettings,
    onOpenGuide,
    onResume,
    onReturnToMenu
}) => {
    // (1B) Constellation nodes stay locked until their boss is in defeatedBosses.
    const bossLocked = (n: AbilityNodeData) => !!n.requiresBoss && !(gameState.defeatedBosses || []).includes(n.requiresBoss);
    const lockLabelFor = (n: AbilityNodeData) => `Defeat ${BOSS_DISPLAY_NAMES[n.requiresBoss!] || n.requiresBoss} to reveal ${n.constellation || 'this constellation'}.`;

    const scale = useMotionValue(0.1); // Start small for Big Bang expansion
    const dragX = useMotionValue(0);
    const dragY = useMotionValue(0);
    const [isPinching, setIsPinching] = useState(false);
    // (7A) search + path preview
    const [query, setQuery] = useState('');
    const [respecOpen, setRespecOpen] = useState(false); // (7A) confirm dialog
    const [abandonOpen, setAbandonOpen] = useState(false); // (7A step 6) abandon-run confirm
    const respecInfo = useMemo(() => {
        const ids = gameState.unlockedAbilityIds.filter(id => id !== 'spark');
        const spent = ids.reduce((s, id) => s + (NODE_BY_ID[id]?.cost ?? 0), 0);
        return { count: ids.length, spent, refund: Math.floor(spent * (1 - RESPEC_TAX)) };
    }, [gameState.unlockedAbilityIds]);
    const [previewId, setPreviewId] = useState<string | null>(null);
    const matchIds = useMemo(() => {
        const q = query.trim().toLowerCase();
        if (q.length < 2) return null;
        return new Set(ABILITY_TREE_DATA.filter(n => !bossLocked(n) && (n.title.toLowerCase().includes(q) || (n.description || '').toLowerCase().includes(q))).map(n => n.id));
    }, [query, gameState.defeatedBosses]);
    const preview = useMemo(() => previewId ? cheapestPath(previewId, gameState.unlockedAbilityIds, gameState.defeatedBosses || []) : null, [previewId, gameState.unlockedAbilityIds, gameState.defeatedBosses]);
    const pathSet = useMemo(() => new Set(preview?.ids ?? []), [preview]);
    const focusNode = (n: AbilityNodeData, targetScale?: number) => {
        dragX.stop(); dragY.stop();
        const s2 = targetScale ?? scale.get();
        if (targetScale) animate(scale, targetScale, { duration: 0.4 });
        animate(dragX, -n.position.x * s2, { type: 'spring', stiffness: 200, damping: 25 });
        animate(dragY, -n.position.y * s2, { type: 'spring', stiffness: 200, damping: 25 });
    };
    /** Fit one arc (or a boss constellation) into view: centre on its nodes' bbox. */
    const fitGroup = (pick: (n: AbilityNodeData) => boolean) => {
        const nodes = ABILITY_TREE_DATA.filter(pick); if (!nodes.length) return;
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        for (const n of nodes) { minX = Math.min(minX, n.position.x); maxX = Math.max(maxX, n.position.x); minY = Math.min(minY, n.position.y); maxY = Math.max(maxY, n.position.y); }
        const w = Math.max(200, maxX - minX + 200), h = Math.max(200, maxY - minY + 200);
        const s2 = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, Math.min(window.innerWidth / w, window.innerHeight / h) * 0.85));
        const cx = (minX + maxX) / 2, cy = (minY + maxY) / 2;
        dragX.stop(); dragY.stop();
        animate(scale, s2, { duration: 0.4 });
        animate(dragX, -cx * s2, { type: 'spring', stiffness: 200, damping: 25 });
        animate(dragY, -cy * s2, { type: 'spring', stiffness: 200, damping: 25 });
    };
    
    // Initial Expansion Effect
    useEffect(() => {
        animate(scale, 0.8, { 
            type: "spring", 
            stiffness: 80, 
            damping: 15, 
            duration: 1.2
        });
    }, []);
    
    // Pinch Zoom Logic
    const pinchRef = useRef<{ dist: number, startScale: number, startDragX: number, startDragY: number } | null>(null);

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
                startDragY: dragY.get()
            };
        }
    };

    const handleTouchMove = (e: React.TouchEvent) => {
        if (e.touches.length === 2 && pinchRef.current) {
            const dist = Math.hypot(
                e.touches[0].clientX - e.touches[1].clientX,
                e.touches[0].clientY - e.touches[1].clientY
            );
            const newScale = Math.min(Math.max(pinchRef.current.startScale * (dist / pinchRef.current.dist), ZOOM_MIN), ZOOM_MAX);
            scale.set(newScale);
            
            // Adjust position to maintain center relative to zoom
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

    // Identify Buyable Nodes - Sorted Deterministically
    const buyableNodes = useMemo(() => {
        return ABILITY_TREE_DATA.filter(n => {
            const isUnlocked = gameState.unlockedAbilityIds.includes(n.id);
            const isRevealed = n.parentIds.length === 0 || n.parentIds.some(pid => gameState.unlockedAbilityIds.includes(pid));
            const isAffordable = gameState.matter >= n.cost;
            return !isUnlocked && isRevealed && isAffordable && !bossLocked(n);
        }).sort((a, b) => {
            if (a.cost !== b.cost) return a.cost - b.cost; // Cheapest first
            return a.id.localeCompare(b.id); // Stable sort by ID
        }); 
    }, [gameState.unlockedAbilityIds, gameState.matter, gameState.defeatedBosses]);

    const [buyableIndex, setBuyableIndex] = useState(0);

    // Reset index if out of bounds (e.g. after buying a node)
    useEffect(() => {
        if (buyableIndex >= buyableNodes.length && buyableNodes.length > 0) {
            setBuyableIndex(0);
        }
    }, [buyableNodes.length, buyableIndex]);

    const centerNode = (index: number) => {
        if (buyableNodes.length === 0) return;
        const safeIndex = (index + buyableNodes.length) % buyableNodes.length;
        setBuyableIndex(safeIndex);
        const node = buyableNodes[safeIndex];
        
        // Stop momentum to prevent conflict
        dragX.stop();
        dragY.stop();

        // Animate to perfectly centered position taking scale into account
        const s = scale.get();
        animate(dragX, -node.position.x * s, { type: "spring", stiffness: 200, damping: 25 });
        animate(dragY, -node.position.y * s, { type: "spring", stiffness: 200, damping: 25 });
    };

    const handleNextBuyable = () => { centerNode(buyableIndex + 1); };
    const handlePrevBuyable = () => { centerNode(buyableIndex - 1); };

    // Keyboard Navigation
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
        const newScale = Math.min(Math.max(currentScale + (e.deltaY > 0 ? -0.1 : 0.1), ZOOM_MIN), ZOOM_MAX);
        
        // Adjust position to maintain center relative to zoom
        const ratio = newScale / currentScale;
        
        scale.set(newScale);
        dragX.set(dragX.get() * ratio);
        dragY.set(dragY.get() * ratio);
    };

    const handleRecenter = () => {
        dragX.stop();
        dragY.stop();
        animate(dragX, 0, { type: "spring", stiffness: 150, damping: 20 });
        animate(dragY, 0, { type: "spring", stiffness: 150, damping: 20 });
        animate(scale, 0.8, { duration: 0.5 });
    };

    return (
        <motion.div 
            {...({
                initial: { opacity: 0 },
                animate: { opacity: 1 },
                exit: { opacity: 0 }
            } as any)}
            className="absolute inset-0 z-50 bg-slate-950/90 backdrop-blur-xl overflow-hidden touch-none" 
            onWheel={handleWheel}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
        >
            <div className="absolute top-8 left-8 pointer-events-none z-10">
                <motion.h1 
                    className="text-4xl font-tech font-bold"
                    animate={{ color: ["#ffffff", "#fbbf24", "#ffffff"] }}
                    transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                >
                    CONSTELLATION OF VIRTUES
                </motion.h1>
                <p className="text-white/30 font-mono tracking-widest text-xs uppercase mt-2">Ignite the divine spark within</p>
            </div>
            {/* (7A) search + arc legend + fit buttons */}
            <div id="tree-tools" className="absolute top-32 right-8 z-50 flex flex-col items-end gap-2 pointer-events-auto max-w-[260px]">
                <div className="flex items-center gap-2 bg-slate-900/80 border border-slate-700 rounded-lg px-2 py-1 backdrop-blur-md w-full">
                    <Search size={14} className="text-slate-400 shrink-0" />
                    <input id="tree-search" value={query} onChange={e => setQuery(e.target.value)} placeholder="search nodes…"
                        className="bg-transparent outline-none text-xs font-mono text-white placeholder:text-slate-500 w-full" />
                    {query && <button data-sfx="back" onClick={() => setQuery('')} className="text-slate-400 hover:text-white"><X size={14} /></button>}
                </div>
                {matchIds && (
                    <div className="text-[10px] font-mono text-yellow-300/90 bg-black/50 px-2 py-1 rounded border border-yellow-500/20 w-full text-right">
                        {matchIds.size} match{matchIds.size === 1 ? '' : 'es'}
                        {matchIds.size > 0 && <button onClick={() => { const n = NODE_BY_ID[[...matchIds][0]]; focusNode(n, 1.2); setPreviewId(n.id); }} className="ml-2 underline hover:text-white">go to first</button>}
                    </div>
                )}
                <div className="flex flex-wrap gap-1 justify-end">
                    {ARC_LEGEND.map(a => (
                        <button key={a.type} onClick={() => fitGroup(n => n.type === a.type && !n.requiresBoss)} title={`Fit ${a.label} arc`}
                            className="flex items-center gap-1 px-2 py-1 rounded bg-slate-900/80 border border-slate-700 hover:border-white/50 text-[9px] font-tech tracking-wider text-slate-300 hover:text-white">
                            <span className={`w-2 h-2 rounded-full ${a.cls}`} />{a.label}
                        </button>
                    ))}
                    <button onClick={() => fitGroup(() => true)} title="Fit whole tree"
                        className="px-2 py-1 rounded bg-slate-900/80 border border-slate-700 hover:border-white/50 text-[9px] font-tech tracking-wider text-slate-300 hover:text-white">ALL</button>
                </div>
                <div className="text-[9px] font-mono text-slate-500 text-right">● unlocked · ◌ affordable (green) · dashed = not yet reachable · ✦ constellation (boss)</div>
            </div>
            {preview && previewId && (
                <div id="path-preview" className="absolute bottom-48 left-1/2 -translate-x-1/2 z-50 pointer-events-none bg-slate-900/90 border border-cyan-500/40 rounded-xl px-4 py-2 text-center backdrop-blur-md shadow-xl">
                    <div className="font-tech text-xs text-cyan-200 tracking-wider">{NODE_BY_ID[previewId].title}</div>
                    <div className="font-mono text-[10px] text-slate-300 mt-0.5">
                        path: <span className="text-white">{preview.ids.length}</span> node{preview.ids.length === 1 ? '' : 's'} · total <span className={gameState.matter >= preview.total ? 'text-emerald-400' : 'text-red-400'}>{preview.total} M</span> · you have {gameState.matter} M
                    </div>
                </div>
            )}

            {/* LEFT SIDE: ARCHIVES & AWARDS */}
            <div className="absolute top-32 left-8 z-50 flex flex-col gap-4 items-start pointer-events-auto">
                <MenuSideButton 
                    onClick={onOpenAchievements} 
                    icon={<Trophy size={20} />} 
                    label="ACHIEVEMENTS" 
                    color="text-amber-400"
                />
                <MenuSideButton 
                    onClick={onOpenBestiary} 
                    icon={<BookOpen size={20} />} 
                    label="ARCHIVES" 
                    color="text-blue-400"
                />
                {onOpenGuide && (
                    <MenuSideButton 
                        onClick={onOpenGuide} 
                        icon={<HelpCircle size={20} />} 
                        label="GUIDEBOOK" 
                        color="text-cyan-400"
                    />
                )}
            </div>

            {/* TOP RIGHT CONTROLS */}
            <div className="absolute top-8 right-8 z-50 flex flex-wrap gap-3 justify-end pointer-events-auto">
                <button 
                    onClick={onResume}
                    className="flex items-center gap-2 px-4 py-3 bg-white hover:bg-slate-200 border border-white rounded-lg text-slate-900 transition-all font-tech text-xs tracking-wider shadow-[0_0_15px_rgba(255,255,255,0.4)]"
                >
                    <PlayCircle size={16} fill="currentColor" />
                    RESUME
                </button>
                <div className="w-px h-10 bg-slate-700 mx-2" />
                <button 
                    id="respec-button"
                    onClick={() => setRespecOpen(true)}
                    disabled={respecInfo.count === 0}
                    title={`Refund all nodes (−${Math.round(RESPEC_TAX * 100)} % tax)`}
                    className="flex items-center gap-2 px-4 py-3 bg-slate-800 hover:bg-amber-900/60 border border-slate-600 hover:border-amber-400 rounded-lg text-white transition-all font-tech text-xs tracking-wider shadow-lg disabled:opacity-40 disabled:hover:bg-slate-800 disabled:hover:border-slate-600"
                >
                    <RotateCcw size={16} />
                    RESPEC
                </button>
                <button 
                    onClick={onOpenSettings}
                    className="flex items-center gap-2 px-4 py-3 bg-slate-800 hover:bg-slate-700 border border-slate-600 rounded-lg text-white transition-all font-tech text-xs tracking-wider shadow-lg"
                >
                    <Settings size={16} />
                    SETTINGS
                </button>
                <button 
                    id="abandon-button"
                    onClick={() => setAbandonOpen(true)}
                    className="flex items-center gap-2 px-4 py-3 bg-red-950/50 hover:bg-red-900 border border-red-900 hover:border-red-500 rounded-lg text-red-200 hover:text-white transition-all font-tech text-xs tracking-wider group shadow-lg"
                >
                    <LogOut size={16} className="group-hover:-translate-x-1 transition-transform" />
                    ABANDON RUN
                </button>
            </div>

            {/* (7A step 6) Abandon run confirm dialog */}
            {abandonOpen && (
                <div id="abandon-dialog" className="absolute inset-0 z-[60] flex items-center justify-center bg-black/70 backdrop-blur-sm pointer-events-auto p-4" onClick={() => setAbandonOpen(false)}>
                    <div className="w-full max-w-sm bg-slate-900 border border-red-500/40 rounded-2xl p-6 shadow-[0_0_40px_rgba(239,68,68,0.15)]" onClick={e => e.stopPropagation()}>
                        <h2 className="font-tech text-xl text-red-300 tracking-widest mb-3">ABANDON THE RUN?</h2>
                        <p className="text-slate-300 text-sm font-mono leading-relaxed">
                            The run ends here. Essence already collected is kept as matter; the wave progress of this run is lost.
                        </p>
                        <div className="flex gap-3 mt-6">
                            <button data-sfx="back" onClick={() => setAbandonOpen(false)}
                                className="flex-1 px-4 py-3 bg-slate-800 hover:bg-slate-700 border border-slate-600 rounded-lg text-white font-tech text-xs tracking-wider">KEEP FIGHTING</button>
                            <button onClick={() => { setAbandonOpen(false); onReturnToMenu(); }}
                                className="flex-1 px-4 py-3 bg-red-700 hover:bg-red-600 border border-red-400/60 rounded-lg text-white font-tech font-bold text-xs tracking-wider">ABANDON</button>
                        </div>
                    </div>
                </div>
            )}

            {/* (7A) Respec confirm dialog */}
            {respecOpen && (
                <div id="respec-dialog" className="absolute inset-0 z-[60] flex items-center justify-center bg-black/70 backdrop-blur-sm pointer-events-auto p-4" onClick={() => setRespecOpen(false)}>
                    <div className="w-full max-w-sm bg-slate-900 border border-amber-500/40 rounded-2xl p-6 shadow-[0_0_40px_rgba(251,191,36,0.15)]" onClick={e => e.stopPropagation()}>
                        <h2 className="font-tech text-xl text-amber-300 tracking-widest mb-3">REDRAW THE CONSTELLATION</h2>
                        <p className="text-slate-300 text-sm font-mono leading-relaxed">
                            Refund <span className="text-white">{respecInfo.count}</span> nodes worth <span className="text-white">{respecInfo.spent}</span> matter.
                            The void keeps <span className="text-amber-300">{Math.round(RESPEC_TAX * 100)} %</span> — you receive
                            <span className="text-emerald-300 font-bold"> +{respecInfo.refund} </span>matter. Only the Spark stays lit.
                        </p>
                        <div className="flex gap-3 mt-6">
                            <button data-sfx="back" onClick={() => setRespecOpen(false)}
                                className="flex-1 px-4 py-3 bg-slate-800 hover:bg-slate-700 border border-slate-600 rounded-lg text-white font-tech text-xs tracking-wider">CANCEL</button>
                            <button onClick={() => { setRespecOpen(false); onRespec(); setPreviewId(null); }}
                                className="flex-1 px-4 py-3 bg-amber-600 hover:bg-amber-500 border border-amber-400/60 rounded-lg text-white font-tech font-bold text-xs tracking-wider">REFUND ALL</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Navigation Arrows for Buyable Nodes */}
            {buyableNodes.length > 0 && (
                <div className="absolute bottom-32 left-1/2 -translate-x-1/2 flex items-center gap-4 z-50 pointer-events-auto bg-slate-900/80 p-3 rounded-2xl backdrop-blur-md border border-slate-700 shadow-xl">
                    <div className="flex items-center gap-2">
                        <button 
                            onClick={handlePrevBuyable}
                            className="p-2 bg-slate-800 hover:bg-purple-600 rounded-lg text-white transition-colors border border-slate-600 hover:border-purple-400 active:scale-95"
                            title="Previous Node"
                        >
                            <ChevronLeft size={20} />
                        </button>
                        <div className="text-xs font-mono text-slate-300 bg-black/50 px-3 py-2 rounded min-w-[100px] text-center border border-slate-800">
                            {buyableIndex + 1} / {buyableNodes.length} AVAIL
                        </div>
                        <button 
                            onClick={handleNextBuyable}
                            className="p-2 bg-slate-800 hover:bg-purple-600 rounded-lg text-white transition-colors border border-slate-600 hover:border-purple-400 active:scale-95"
                            title="Next Node"
                        >
                            <ChevronRight size={20} />
                        </button>
                    </div>

                    <div className="w-px h-8 bg-slate-700 mx-2" />
                    
                    <button 
                        onClick={() => onBatchUnlock(buyableNodes.map(n => n.id))}
                        className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 rounded-lg text-white font-tech font-bold text-xs tracking-wider shadow-lg shadow-emerald-900/20 hover:shadow-emerald-500/30 transition-all active:scale-95 border border-emerald-400/50"
                        title="Purchase All"
                    >
                        <Zap size={16} fill="currentColor" />
                        BUY ALL
                    </button>
                </div>
            )}

            {/* Draggable World Container */}
            <motion.div 
                className={`absolute top-1/2 left-1/2 ${isPinching ? '' : 'cursor-grab active:cursor-grabbing'}`}
                style={{ x: dragX, y: dragY, scale } as any}
                drag={!isPinching} // Disable drag while pinching
                dragMomentum={false} 
            >
                {/* Massive Hit Area */}
                <div 
                    className="absolute -top-[100000px] -left-[100000px] w-[200000px] h-[200000px] bg-transparent" 
                    style={{ zIndex: 0 }} 
                />

                {/* Connections - Force 1x1 dimensions with visible overflow to avoid 0x0 clipping */}
                <svg className="absolute top-0 left-0 overflow-visible pointer-events-none" style={{ width: 1, height: 1, zIndex: 0 }}>
                    {ABILITY_TREE_DATA.map(node => node.parentIds.map(pid => {
                        const p = ABILITY_TREE_DATA.find(n => n.id === pid);
                        const isParentUnlocked = gameState.unlockedAbilityIds.includes(pid);
                        const isNodeUnlocked = gameState.unlockedAbilityIds.includes(node.id);
                        if (p && node.requiresBoss) {
                            // (1B) faint constellation line, always visible, brighter once unlocked
                            return (
                                <line key={pid+node.id} x1={p.position.x} y1={p.position.y} x2={node.position.x} y2={node.position.y}
                                    stroke={isNodeUnlocked ? '#e2e8f0' : '#475569'} strokeWidth={isNodeUnlocked ? 3 : 1.5}
                                    strokeDasharray={isNodeUnlocked ? undefined : '6 10'} opacity={isNodeUnlocked ? 0.9 : 0.35} strokeLinecap="round" />
                            );
                        }
                        return p && (
                            <Connection 
                                key={pid+node.id} 
                                start={p.position} 
                                end={node.position} 
                                isUnlocked={isNodeUnlocked} 
                                isVisible={isParentUnlocked || p.parentIds.length === 0} 
                            />
                        );
                    }))}
                </svg>

                {/* Nodes */}
                {ABILITY_TREE_DATA.map(node => {
                    const isUnlocked = gameState.unlockedAbilityIds.includes(node.id);
                    const isRevealed = node.parentIds.length === 0 || node.parentIds.some(pid => gameState.unlockedAbilityIds.includes(pid));
                    const isAffordable = gameState.matter >= node.cost;
                    return (
                        <SkillNode 
                            key={node.id} 
                            data={node} 
                            isUnlocked={isUnlocked} 
                            isAffordable={isAffordable} 
                            isRevealed={isRevealed} 
                            onUnlock={onUnlock}
                            currentScale={scale}
                            isBossLocked={bossLocked(node)}
                            lockLabel={bossLocked(node) ? lockLabelFor(node) : undefined}
                            isGhost={!isRevealed && !isUnlocked && (pathSet.has(node.id) || (!!matchIds && matchIds.has(node.id)))}
                            highlight={previewId === node.id ? 'target' : pathSet.has(node.id) ? 'path' : matchIds && matchIds.has(node.id) ? 'match' : null}
                            isDimmed={!!matchIds && !matchIds.has(node.id) && !pathSet.has(node.id)}
                            onPreview={setPreviewId}
                        />
                    );
                })}
            </motion.div>
            
            <div className="absolute bottom-12 left-1/2 -translate-x-1/2 font-tech text-xs tracking-[0.5em] text-white/30 pointer-events-none text-center">
                DRAG TO PAN • PINCH TO ZOOM<br/>ESC TO RESUME
            </div>
            
            <div className="absolute bottom-12 right-12 z-50 pointer-events-auto group">
                <button 
                    onClick={handleRecenter}
                    className="p-4 bg-slate-800/80 hover:bg-slate-700 border border-slate-600 rounded-full text-white/80 hover:text-white transition-all shadow-lg backdrop-blur-sm relative"
                >
                    <Target className="w-6 h-6 group-hover:rotate-45 transition-transform duration-300" />
                </button>
                <div className="absolute bottom-full right-0 mb-3 px-4 py-2 bg-slate-900 text-white text-[10px] font-tech tracking-widest rounded border border-slate-700 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none shadow-xl transform translate-y-2 group-hover:translate-y-0 duration-200">
                    RETURN TO CENTER
                </div>
            </div>
        </motion.div>
    );
};

const MenuSideButton: React.FC<{ onClick: () => void, icon: React.ReactNode, label: string, color: string }> = ({ onClick, icon, label, color }) => (
    <motion.button 
        onClick={onClick}
        {...({ whileHover: { x: 10 } } as any)}
        className="flex items-center gap-4 group p-2 pr-6 rounded-r-xl transition-all"
    >
        <div className={`p-3 bg-slate-900 border border-slate-700 rounded-xl group-hover:border-white/50 transition-colors shadow-lg ${color}`}>
            {icon}
        </div>
        <span className="font-tech text-sm text-slate-400 group-hover:text-white tracking-widest transition-colors shadow-black drop-shadow-md bg-black/40 px-2 py-1 rounded">
            {label}
        </span>
    </motion.button>
);

export default EvolutionMatrix;
