
import React, { useEffect, useState, useMemo, useRef } from 'react';
import { motion, useMotionValue, animate } from 'framer-motion';
import { Target, BookOpen, ChevronLeft, ChevronRight, Zap, Settings, LogOut, Trophy, PlayCircle } from 'lucide-react';
import { GameState } from '../types';
import { ABILITY_TREE_DATA } from '../data';
import Connection from './Connection';
import SkillNode from './SkillNode';

interface EvolutionMatrixProps {
    gameState: GameState;
    onUnlock: (id: string) => void;
    onBatchUnlock: (ids: string[]) => void;
    onOpenBestiary: () => void;
    onOpenAchievements: () => void;
    onOpenSettings: () => void;
    onResume: () => void;
    onReturnToMenu: () => void;
}

const EvolutionMatrix: React.FC<EvolutionMatrixProps> = ({ 
    gameState, 
    onUnlock, 
    onBatchUnlock,
    onOpenBestiary, 
    onOpenAchievements,
    onOpenSettings,
    onResume,
    onReturnToMenu
}) => {
    const scale = useMotionValue(0.1); // Start small for Big Bang expansion
    const dragX = useMotionValue(0);
    const dragY = useMotionValue(0);
    const [isPinching, setIsPinching] = useState(false);
    
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
            const newScale = Math.min(Math.max(pinchRef.current.startScale * (dist / pinchRef.current.dist), 0.2), 4.0);
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
            return !isUnlocked && isRevealed && isAffordable;
        }).sort((a, b) => {
            if (a.cost !== b.cost) return a.cost - b.cost; // Cheapest first
            return a.id.localeCompare(b.id); // Stable sort by ID
        }); 
    }, [gameState.unlockedAbilityIds, gameState.matter]);

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
        const newScale = Math.min(Math.max(currentScale + (e.deltaY > 0 ? -0.1 : 0.1), 0.2), 4.0);
        
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
                    onClick={onOpenSettings}
                    className="flex items-center gap-2 px-4 py-3 bg-slate-800 hover:bg-slate-700 border border-slate-600 rounded-lg text-white transition-all font-tech text-xs tracking-wider shadow-lg"
                >
                    <Settings size={16} />
                    SETTINGS
                </button>
                <button 
                    onClick={onReturnToMenu}
                    className="flex items-center gap-2 px-4 py-3 bg-red-950/50 hover:bg-red-900 border border-red-900 hover:border-red-500 rounded-lg text-red-200 hover:text-white transition-all font-tech text-xs tracking-wider group shadow-lg"
                >
                    <LogOut size={16} className="group-hover:-translate-x-1 transition-transform" />
                    MAIN MENU
                </button>
            </div>

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
