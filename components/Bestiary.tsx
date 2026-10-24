
import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ENEMIES } from '../enemies';
import { BOSSES } from '../bosses';
import { drawEnemy } from './game/renderer/EnemyRenderer';
import { Enemy, EnemyDef } from './game/types';
import { X, Lock, HelpCircle } from 'lucide-react';

import { Settings } from '../types';
import { t } from '../translate';
interface BestiaryProps {
    settings?: Settings;
    seenEnemyIds?: string[];
    onClose: () => void;
    maxWave: number;
}

const EnemyPreview: React.FC<{ def: EnemyDef }> = ({ def }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        
        // Mock Enemy object for renderer
        const mockEnemy: Enemy = {
            x: 100, y: 100, vx: 0, vy: 0, // Position at center of 200x200 canvas
            size: def.size,
            color: def.color,
            def: def,
            hp: 100, maxHp: 100, speed: 0, projectileImmunity: 0,
            state: { timer: 0 }
        };

        let frame = 0;
        const anim = setInterval(() => {
            frame++;
            ctx.clearRect(0, 0, 200, 200);
            
            // Auto Scale logic
            // Default view is 200x200.
            // If enemy size is > 50, scale down.
            const scale = def.size > 50 ? 50 / def.size : 1.5;
            
            ctx.save();
            ctx.translate(100, 100); // Translate to center
            ctx.scale(scale, scale);
            ctx.translate(-100, -100); // Translate back relative to object pos
            
            drawEnemy(ctx, mockEnemy, frame);
            ctx.restore();
        }, 30); // 30fps preview

        return () => clearInterval(anim);
    }, [def]);

    return (
        <canvas 
            ref={canvasRef} 
            width={200} 
            height={200} 
            className="w-48 h-48 bg-slate-950/50 rounded-full border border-slate-700 shadow-inner" 
        />
    );
};

const Bestiary: React.FC<BestiaryProps> = ({ onClose, maxWave, settings, seenEnemyIds }) => {
    const lang = settings?.language || 'en';
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const allEnemies = [...ENEMIES, ...BOSSES].sort((a,b) => a.minWave - b.minWave);
    const selectedEnemy = selectedId ? allEnemies.find(e => e.id === selectedId) || null : null;
    
    const isEnemyUnlocked = (enemy: EnemyDef) => {
        if (seenEnemyIds && seenEnemyIds.includes(enemy.id)) return true;
        return enemy.minWave > 0 && enemy.minWave <= maxWave;
    };

    // Filter to ensure we have unique entries
    const uniqueEnemies = Array.from(new Set(allEnemies.map(e => e.id)))
        .map(id => allEnemies.find(e => e.id === id)!);
    
    const unlockedCount = uniqueEnemies.filter(isEnemyUnlocked).length;

    // Auto-select first unlocked enemy if nothing selected
    useEffect(() => {
        if (!selectedId && unlockedCount > 0) {
             const first = uniqueEnemies.find(isEnemyUnlocked);
             if(first) setSelectedId(first.id);
        }
    }, [maxWave, seenEnemyIds]);

    return (
        <div className="fixed inset-0 z-[60] bg-slate-950/95 backdrop-blur-xl flex items-center justify-center p-8">
            <div className="w-full max-w-6xl h-full flex flex-col md:flex-row gap-8 relative">
                
                {/* Global Close Button */}
                <button 
                    onClick={onClose} 
                    className="absolute -top-4 -right-4 md:top-0 md:right-0 z-10 p-2 bg-red-500/20 hover:bg-red-500 text-red-400 hover:text-white rounded-full transition-colors"
                    title="Close Archives"
                >
                    <X size={24} />
                </button>

                {/* --- LIST --- */}
                <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
                    <h1 className="text-4xl font-tech font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500 mb-6 sticky top-0 bg-slate-950/90 py-4 z-10 border-b border-white/10 flex items-center justify-between">
                        <span>{t('ARCHIVES', lang)}</span>
                        <span className="text-sm text-slate-500 font-mono">{unlockedCount} / {uniqueEnemies.length} {t('DISCOVERED', lang)}</span>
                    </h1>
                    
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                        {uniqueEnemies.map(enemy => {
                            const isSeen = isEnemyUnlocked(enemy);
                            return (
                                <motion.button
                                    key={enemy.id}
                                    onClick={() => isSeen ? setSelectedId(enemy.id) : null}
                                    disabled={!isSeen}
                                    {...({
                                        whileHover: isSeen ? { scale: 1.05 } : {},
                                        whileTap: isSeen ? { scale: 0.95 } : {}
                                    } as any)}
                                    className={`
                                        flex flex-col items-center p-3 rounded-lg border transition-all relative overflow-hidden h-28
                                        ${isSeen 
                                            ? (selectedId === enemy.id ? 'bg-slate-800 border-purple-500 shadow-[0_0_15px_rgba(168,85,247,0.3)]' : 'bg-slate-900 border-slate-700 hover:border-slate-500 hover:bg-slate-800')
                                            : 'bg-slate-950 border-slate-800 opacity-60 cursor-not-allowed'
                                        }
                                    `}
                                >
                                    {isSeen ? (
                                        <>
                                            <div className="flex-1 flex items-center justify-center w-full">
                                                <div className="w-8 h-8 rounded-full shadow-[0_0_10px_currentColor]" style={{ backgroundColor: enemy.color, color: enemy.glowColor }} />
                                            </div>
                                            <div className="w-full">
                                                <div className="text-xs text-center font-tech truncate w-full text-slate-300">
                                                    {t(enemy.name, lang)}
                                                </div>
                                                <div className="text-[10px] text-slate-500 text-center">{t('Wave', lang)} {enemy.minWave}+</div>
                                            </div>
                                        </>
                                    ) : (
                                        <>
                                            <div className="flex-1 flex items-center justify-center text-slate-800">
                                                <Lock size={24} />
                                            </div>
                                            <div className="w-full">
                                                <div className="text-xs text-center font-tech w-full text-slate-700 tracking-widest">
                                                    UNKNOWN
                                                </div>
                                                <div className="text-[10px] text-slate-800 text-center">{t('WAVE', lang)} {enemy.minWave}</div>
                                            </div>
                                        </>
                                    )}
                                </motion.button>
                            );
                        })}
                    </div>
                </div>

                {/* --- DETAILS PANEL --- */}
                <div className="w-full md:w-96 bg-slate-900 border border-slate-700 rounded-xl p-6 flex flex-col relative overflow-hidden min-h-[500px]">
                    <AnimatePresence mode="wait">
                        {selectedEnemy ? (
                            <motion.div
                                key={selectedEnemy.id}
                                {...({
                                    initial: { opacity: 0, x: 20 },
                                    animate: { opacity: 1, x: 0 },
                                    exit: { opacity: 0, x: -20 }
                                } as any)}
                                className="flex flex-col h-full items-center"
                            >
                                {/* Detail Close Button */}
                                <button 
                                    onClick={() => setSelectedId(null)}
                                    className="absolute top-4 right-4 text-slate-500 hover:text-white transition-colors z-20"
                                >
                                    <X size={20} />
                                </button>

                                <div className="mb-6 relative w-full flex justify-center">
                                    <div className="absolute inset-0 bg-gradient-to-b from-purple-500/10 to-transparent blur-xl pointer-events-none" />
                                    <EnemyPreview def={selectedEnemy} />
                                </div>

                                <h2 className="text-2xl font-tech font-bold text-white mb-2 text-center">{t(selectedEnemy.name, lang)}</h2>
                                <div className="flex gap-2 mb-6 justify-center">
                                    <span className={`px-2 py-0.5 text-[10px] font-bold rounded bg-slate-800 text-slate-300 border border-slate-600`}>
                                        {selectedEnemy.behavior}
                                    </span>
                                    <span className={`px-2 py-0.5 text-[10px] font-bold rounded bg-slate-800 text-slate-300 border border-slate-600`}>
                                        {selectedEnemy.visualType}
                                    </span>
                                </div>

                                <p className="text-slate-400 italic text-sm mb-8 text-center px-4">
                                    "{t(selectedEnemy.description, lang)}"
                                </p>

                                <div className="space-y-4 w-full mt-auto bg-slate-950/50 p-4 rounded-lg">
                                    <StatRow label={t('Base Health', lang)} value={selectedEnemy.baseHp} max={1000} color="bg-red-500" />
                                    <StatRow label={t('Speed', lang)} value={selectedEnemy.baseSpeed} max={8} color="bg-blue-500" />
                                    <StatRow label={t('Size', lang)} value={selectedEnemy.size} max={100} color="bg-amber-500" />
                                    <StatRow label={t('Essence Value', lang)} value={selectedEnemy.essenceReward} max={200} color="bg-purple-500" />
                                </div>

                                <div className="mt-4 text-[10px] text-slate-600 font-mono w-full text-center">
                                    UNIT_ID: {selectedEnemy.id.toUpperCase()}
                                </div>

                            </motion.div>
                        ) : (
                            <div className="flex flex-col items-center justify-center h-full text-slate-600 font-tech gap-4 opacity-50">
                                <HelpCircle size={64} className="text-slate-800" />
                                <span className="text-center px-8">{t('SELECT AN IDENTIFIED SIGNAL TO ANALYZE', lang)}</span>
                            </div>
                        )}
                    </AnimatePresence>
                </div>
            </div>
        </div>
    );
};

const StatRow: React.FC<{ label: string, value: number, max: number, color: string }> = ({ label, value, max, color }) => (
    <div>
        <div className="flex justify-between text-xs text-slate-400 mb-1">
            <span>{label}</span>
            <span>{value}</span>
        </div>
        <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
            <motion.div 
                {...({
                    initial: { width: 0 },
                    animate: { width: `${Math.min(100, (value/max)*100)}%` }
                } as any)}
                className={`h-full ${color}`}
            />
        </div>
    </div>
);

export default Bestiary;
