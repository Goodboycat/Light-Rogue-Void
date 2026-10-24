
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ENEMIES } from '../enemies';
import { BOSSES } from '../bosses';
import { X, HelpCircle, Lock } from 'lucide-react';
import { drawEnemy } from './game/renderer/EnemyRenderer';
import { Enemy, EnemyDef } from './game/types';

import { Settings } from '../types';
import { t } from '../translate';
import { BossTrophy } from './game/bossVictory';

interface ArchivesProps {
    settings?: Settings;
    seenEnemyIds?: string[];
    newArchiveEnemyIds?: string[];
    onClearNewArchives?: () => void;
    bossTrophies?: Record<string, BossTrophy>;
    onClose: () => void;
    maxWave: number;
}

const EnemyPreviewCanvas: React.FC<{ def: EnemyDef }> = ({ def }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        
        let frame = 0;
        let animId: number;

        const render = () => {
            frame++;
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            
            // Center
            const cx = canvas.width / 2;
            const cy = canvas.height / 2;
            
            // Mock Enemy
            const sbType = def.id === 'sb_hunter' ? 0 : def.id === 'sb_swarm' ? 1 : 2;
            const isSemiBoss = def.behavior === ('SEMI_BOSS' as any) || def.visualType === ('SEMI_BOSS' as any);
            const mockEnemy: Enemy = {
                x: cx, y: cy, vx: 0, vy: 0,
                hp: def.baseHp, maxHp: def.baseHp,
                def: def,
                speed: 0,
                size: def.size,
                color: def.color,
                state: { timer: frame, custom: { sbType } },
                projectileImmunity: 0,
                isBoss: def.baseHp > 2000 && !isSemiBoss,
                isSemiBoss: isSemiBoss
            };

            // Scale down huge bosses to fit
            // Canvas is 300x300, visual radius is size
            let scale = 1.0;
            // if size is > 80 (diameter 160), it starts filling frame nicely.
            // if size is small (e.g. 5), zoom in.
            if (def.size < 20) scale = 2.0;
            else if (def.size > 80) scale = 80 / def.size;

            ctx.save();
            ctx.translate(cx, cy);
            ctx.scale(scale, scale);
            ctx.translate(-cx, -cy);
            
            drawEnemy(ctx, mockEnemy, frame);
            
            ctx.restore();
            
            animId = requestAnimationFrame(render);
        };
        render();
        return () => cancelAnimationFrame(animId);
    }, [def]);

    return <canvas ref={canvasRef} width={300} height={300} className="w-full h-full object-contain" />;
};

const Archives: React.FC<ArchivesProps> = ({
    onClose,
    maxWave,
    settings,
    seenEnemyIds,
    newArchiveEnemyIds = [],
    onClearNewArchives,
    bossTrophies = {},
}) => {
    const lang = settings?.language || 'en';
    const allEnemies = [...ENEMIES, ...BOSSES].sort((a,b) => a.minWave - b.minWave);

    useEffect(() => {
        return () => {
            if (onClearNewArchives) onClearNewArchives();
        };
    }, [onClearNewArchives]);
    
    // Filter unique enemies by ID
    const uniqueEnemies = Array.from(new Set(allEnemies.map(e => e.id)))
        .map(id => allEnemies.find(e => e.id === id)!);
    
    const isEnemyUnlocked = (enemy: EnemyDef) => {
        if (seenEnemyIds && seenEnemyIds.includes(enemy.id)) return true;
        return enemy.minWave > 0 && enemy.minWave <= maxWave;
    };

    const [selectedId, setSelectedId] = useState<string | null>(null);
    const selectedEnemy = uniqueEnemies.find(e => e.id === selectedId);
    
    // Auto-select first unlocked
    useEffect(() => {
        const first = uniqueEnemies.find(isEnemyUnlocked);
        if (first) setSelectedId(first.id);
    }, [maxWave, seenEnemyIds]);

    const unlockedCount = uniqueEnemies.filter(isEnemyUnlocked).length;

    return (
        <div className="fixed inset-0 z-[70] bg-slate-950/95 backdrop-blur-xl flex items-center justify-center p-4 md:p-8">
            <div className="w-full max-w-6xl h-[85vh] bg-slate-900 border border-slate-800 rounded-2xl flex overflow-hidden shadow-2xl relative">
                
                <button 
                    onClick={onClose}
                    className="absolute top-4 right-4 z-20 p-2 hover:bg-slate-800 rounded-full text-slate-500 hover:text-white transition-colors"
                >
                    <X size={24} />
                </button>

                {/* LEFT: LIST */}
                <div className="w-1/3 md:w-1/4 border-r border-slate-800 flex flex-col bg-slate-950/50">
                    <div className="p-6 border-b border-slate-800">
                        <h2 className="text-xl font-tech font-bold text-white tracking-widest">{t('ARCHIVES', lang)}</h2>
                        <p className="text-xs text-slate-500 font-mono mt-1">
                            DATA LOG: {unlockedCount}/{uniqueEnemies.length}
                        </p>
                    </div>
                    <div className="flex-1 overflow-y-auto p-2 custom-scrollbar">
                        {uniqueEnemies.map(enemy => {
                            const isUnlocked = isEnemyUnlocked(enemy);
                            return (
                                <button
                                    key={enemy.id}
                                    onClick={() => { if(isUnlocked) { setSelectedId(enemy.id); } }}
                                    disabled={!isUnlocked}
                                    className={`
                                        w-full text-left p-3 rounded-lg mb-1 flex items-center gap-3 transition-all
                                        ${selectedId === enemy.id ? 'bg-purple-900/20 border border-purple-500/50' : 'hover:bg-slate-900 border border-transparent'}
                                        ${!isUnlocked && 'opacity-50 cursor-not-allowed'}
                                    `}
                                >
                                    <div 
                                        className="w-8 h-8 rounded flex items-center justify-center shrink-0"
                                        style={{ backgroundColor: isUnlocked ? enemy.color : '#1e293b' }}
                                    >
                                        {!isUnlocked && <Lock size={12} className="text-slate-500" />}
                                    </div>
                                    <div className="overflow-hidden flex-1">
                                        <div className="flex items-center justify-between gap-1">
                                            <div className={`text-xs font-bold font-tech truncate ${isUnlocked ? 'text-slate-200' : 'text-slate-600'}`}>
                                                {isUnlocked ? enemy.name : '???'}
                                            </div>
                                            {isUnlocked && newArchiveEnemyIds.includes(enemy.id) && (
                                                <span className="px-1.5 py-0.5 rounded bg-amber-400 text-black font-tech font-bold text-[8px] uppercase shrink-0">
                                                    {t('NEW', lang)}
                                                </span>
                                            )}
                                        </div>
                                        <div className="text-[10px] text-slate-500 font-mono">
                                            CLASS: {isUnlocked ? enemy.visualType : 'UNKNOWN'}
                                        </div>
                                    </div>
                                </button>
                            )
                        })}
                    </div>
                </div>

                {/* RIGHT: DETAILS */}
                <div className="flex-1 relative flex flex-col">
                    <AnimatePresence mode="wait">
                        {selectedEnemy && isEnemyUnlocked(selectedEnemy) ? (
                            <motion.div 
                                key={selectedEnemy.id}
                                {...({
                                    initial: { opacity: 0, y: 10 },
                                    animate: { opacity: 1, y: 0 },
                                    exit: { opacity: 0, y: -10 }
                                } as any)}
                                className="flex-1 p-8 md:p-12 overflow-y-auto flex flex-col items-center"
                            >
                                {/* PREVIEW CIRCLE (NOW CANVAS) */}
                                <div className="relative mb-8 group w-64 h-64 flex items-center justify-center">
                                    <div className="absolute inset-0 bg-purple-500/10 blur-3xl rounded-full" />
                                    <div 
                                        className="w-full h-full rounded-full border border-slate-700/50 flex items-center justify-center relative z-10 bg-slate-950/50 shadow-2xl overflow-hidden"
                                        style={{ borderColor: selectedEnemy.glowColor }}
                                    >
                                        <EnemyPreviewCanvas def={selectedEnemy} />
                                    </div>
                                    <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 bg-slate-950 px-3 py-1 rounded text-[10px] font-mono border border-slate-800 text-slate-400">
                                        LIVE RENDERING
                                    </div>
                                </div>

                                <h1 className="text-4xl font-tech font-bold text-white mb-2 text-center">{t(selectedEnemy.name, lang)}</h1>
                                <div className="flex gap-2 mb-8">
                                    <Badge label={selectedEnemy.behavior} />
                                    <Badge label={selectedEnemy.visualType} />
                                    <Badge label={`WAVE ${selectedEnemy.minWave}+`} color="text-purple-400 border-purple-900 bg-purple-900/10" />
                                </div>

                                <p className="text-slate-400 italic text-center max-w-lg mb-12 leading-relaxed">
                                    "{t(selectedEnemy.description, lang)}"
                                </p>

                                {/* STATS GRID */}
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 w-full max-w-3xl">
                                    <StatBox label={t("HIT POINTS", lang)} value={selectedEnemy.baseHp} />
                                    <StatBox label={t("SPEED", lang)} value={selectedEnemy.baseSpeed} />
                                    <StatBox label={t("SIZE CLASS", lang)} value={selectedEnemy.size} />
                                    <StatBox label={t("REWARD", lang)} value={selectedEnemy.essenceReward} suffix=" M" />
                                </div>

                                {/* BOSS TROPHY CARD */}
                                {bossTrophies[selectedEnemy.id] && (
                                    <div className="mt-8 w-full max-w-3xl bg-gradient-to-r from-amber-950/40 via-slate-900/80 to-purple-950/40 border border-amber-500/40 p-5 rounded-2xl shadow-[0_0_25px_rgba(245,158,11,0.15)] text-center">
                                        <div className="text-xs font-tech font-bold text-amber-300 uppercase tracking-widest mb-3 flex items-center justify-center gap-2">
                                            <span>🏆</span>
                                            <span>{t("BOSS TROPHY RECORD", lang)}</span>
                                        </div>
                                        <div className="grid grid-cols-3 gap-3 font-mono text-xs">
                                            <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800">
                                                <div className="text-[9px] text-slate-500 uppercase">{t("FIGHT TIME", lang)}</div>
                                                <div className="text-amber-300 font-bold text-sm">{bossTrophies[selectedEnemy.id].fightTimeSec}s</div>
                                            </div>
                                            <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800">
                                                <div className="text-[9px] text-slate-500 uppercase">{t("DAMAGE TAKEN", lang)}</div>
                                                <div className="text-rose-400 font-bold text-sm">{bossTrophies[selectedEnemy.id].damageTaken} HP</div>
                                            </div>
                                            <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800">
                                                <div className="text-[9px] text-slate-500 uppercase">{t("ATTEMPTS", lang)}</div>
                                                <div className="text-purple-300 font-bold text-sm">#{bossTrophies[selectedEnemy.id].attempts}</div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                            </motion.div>
                        ) : (
                            <div className="flex-1 flex flex-col items-center justify-center text-slate-600">
                                <HelpCircle size={64} className="mb-4 opacity-20" />
                                <p className="font-tech tracking-widest text-sm">{t('SELECT ENTITY FOR ANALYSIS', lang)}</p>
                            </div>
                        )}
                    </AnimatePresence>
                </div>
            </div>
        </div>
    );
};

const Badge = ({ label, color = "text-slate-300 border-slate-700 bg-slate-800" }: { label: string, color?: string }) => (
    <span className={`px-3 py-1 rounded text-[10px] font-bold border uppercase tracking-wider ${color}`}>
        {label}
    </span>
);

const StatBox = ({ label, value, suffix = '' }: { label: string, value: number, suffix?: string }) => (
    <div className="bg-slate-950/50 p-4 rounded-lg border border-slate-800 text-center">
        <div className="text-[10px] text-slate-500 font-mono mb-1">{label}</div>
        <div className="text-xl font-bold font-tech text-white">{value}{suffix}</div>
    </div>
);

export default Archives;
