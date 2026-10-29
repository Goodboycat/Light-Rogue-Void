
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ENEMIES } from '../enemies';
import { BOSSES } from '../bosses';
import { X, HelpCircle, Lock } from 'lucide-react';
import { drawEnemy } from './game/renderer/EnemyRenderer';
import { Enemy, EnemyDef } from './game/types';
import { loreFor, LORE_KILLS } from '../data/lore';
import type { LifetimeStats } from '../save/schema'; // (8A step 4)
import { totalDiscoveries, fmtPlayTime } from '../save/stats';
import { CHAPTERS } from './game/Constants';

interface ArchivesProps {
    onClose: () => void;
    maxWave: number;
    /** (3B) lifetime kills per enemy id; lore unlocks at LORE_KILLS */
    killCounts?: Record<string, number>;
    /** (8A step 4) lifetime records — shown in the RECORDS tab */
    stats?: LifetimeStats;
}

// (8A step 4) Lifetime records panel.
const Stat: React.FC<{ label: string; value: React.ReactNode }> = ({ label, value }) => (
    <div className="bg-slate-950/60 border border-slate-800 rounded-lg px-3 py-2">
        <div className="text-[10px] font-mono text-slate-500 tracking-widest">{label}</div>
        <div className="text-lg font-tech font-bold text-white">{value}</div>
    </div>
);

const RecordsPanel: React.FC<{ stats: LifetimeStats }> = ({ stats }) => {
    const bosses = BOSSES.filter(b => !['hive_node', 'doppelganger'].includes(b.id));
    const feats = Object.keys(stats.feats);
    return (
        <div className="flex-1 p-6 md:p-10 overflow-y-auto custom-scrollbar">
            <h1 className="text-3xl font-tech font-bold text-white mb-1">RECORDS</h1>
            <p className="text-xs font-mono text-slate-500 mb-6">LIFETIME · {stats.runs} RUNS · {fmtPlayTime(stats.playTimeMs)} PLAYED</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-8">
                <Stat label="KILLS" value={stats.kills.toLocaleString()} />
                <Stat label="DEATHS" value={stats.deaths} />
                <Stat label="ESCAPES" value={stats.wins} />
                <Stat label="BEST STREAK" value={stats.bestStreak} />
                <Stat label="MATTER BANKED" value={stats.totalMatter.toLocaleString()} />
                <Stat label="ESSENCE" value={Math.floor(stats.totalEssence).toLocaleString()} />
                <Stat label="DISCOVERIES" value={totalDiscoveries(stats)} />
                <Stat label="BURSTS" value={stats.burstsFired} />
            </div>
            <h2 className="text-xs font-mono text-slate-400 tracking-widest mb-2">DISCOVERIES</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-8">
                <Stat label="RELICS" value={stats.discoveries.relics} />
                <Stat label="SHRINES" value={stats.discoveries.shrines} />
                <Stat label="LANDMARKS" value={stats.discoveries.landmarks} />
                <Stat label="EVENTS" value={stats.discoveries.events} />
            </div>
            <h2 className="text-xs font-mono text-slate-400 tracking-widest mb-2">BEST WAVE PER CHAPTER</h2>
            <div className="grid grid-cols-3 md:grid-cols-6 gap-2 mb-8">
                {CHAPTERS.map((ch, i) => (
                    <div key={ch.id} className="bg-slate-950/60 border border-slate-800 rounded-lg px-3 py-2" style={{ borderColor: stats.bestWaveByChapter[i] ? ch.color + '66' : undefined }}>
                        <div className="text-[10px] font-mono text-slate-500 truncate">{ch.id}. {ch.name}</div>
                        <div className="text-lg font-tech font-bold" style={{ color: stats.bestWaveByChapter[i] ? ch.color : '#475569' }}>{stats.bestWaveByChapter[i] || '—'}</div>
                    </div>
                ))}
            </div>
            <h2 className="text-xs font-mono text-slate-400 tracking-widest mb-2">BOSSES</h2>
            <table className="w-full text-xs font-mono mb-8">
                <thead><tr className="text-slate-500 text-left"><th className="py-1">BOSS</th><th>KILLED</th><th>KILLED YOU</th><th>FEATS</th></tr></thead>
                <tbody>
                    {bosses.map(b => {
                        const bf = feats.filter(f => f.startsWith(b.id + ':')).map(f => f.split(':')[1].toUpperCase());
                        return (
                            <tr key={b.id} className="border-t border-slate-800/60">
                                <td className="py-1.5 font-bold" style={{ color: b.glowColor }}>{b.name}</td>
                                <td className="text-white">{stats.bossKills[b.id] ?? 0}</td>
                                <td className="text-red-300">{stats.deathsByBoss[b.id] ?? 0}</td>
                                <td className="text-amber-300">{bf.length ? bf.join(' · ') : <span className="text-slate-600">—</span>}</td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
};

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
            const mockEnemy: Enemy = {
                x: cx, y: cy, vx: 0, vy: 0,
                hp: def.baseHp, maxHp: def.baseHp,
                def: def,
                speed: 0,
                size: def.size,
                color: def.color,
                state: { timer: frame },
                projectileImmunity: 0,
                isBoss: def.baseHp > 2000 // Simple heuristic 
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

const Archives: React.FC<ArchivesProps> = ({ onClose, maxWave, killCounts = {}, stats }) => {
    const [tab, setTab] = useState<'bestiary' | 'records'>('bestiary');
    const allEnemies = [...ENEMIES, ...BOSSES].sort((a,b) => a.minWave - b.minWave);
    
    // Filter unique enemies by ID
    const uniqueEnemies = Array.from(new Set(allEnemies.map(e => e.id)))
        .map(id => allEnemies.find(e => e.id === id)!);
    
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const selectedEnemy = uniqueEnemies.find(e => e.id === selectedId);
    
    // Auto-select first unlocked
    useEffect(() => {
        const first = uniqueEnemies.find(e => e.minWave <= maxWave);
        if (first) setSelectedId(first.id);
    }, []);

    const unlockedCount = uniqueEnemies.filter(e => e.minWave <= maxWave).length;

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
                        <h2 className="text-xl font-tech font-bold text-white tracking-widest">ARCHIVES</h2>
                        <p className="text-xs text-slate-500 font-mono mt-1">
                            DATA LOG: {unlockedCount}/{uniqueEnemies.length}
                        </p>
                        {stats && (
                            <div className="flex gap-1 mt-3">
                                {(['bestiary', 'records'] as const).map(t => (
                                    <button key={t} onClick={() => setTab(t)}
                                        className={`flex-1 text-[10px] font-mono tracking-widest py-1 rounded border ${tab === t ? 'border-purple-500/60 bg-purple-900/30 text-white' : 'border-slate-800 text-slate-500 hover:text-slate-300'}`}>
                                        {t.toUpperCase()}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                    <div className="flex-1 overflow-y-auto p-2 custom-scrollbar">
                        {uniqueEnemies.map(enemy => {
                            const isUnlocked = enemy.minWave <= maxWave;
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
                                    <div className="overflow-hidden">
                                        <div className={`text-xs font-bold font-tech truncate ${isUnlocked ? 'text-slate-200' : 'text-slate-600'}`}>
                                            {isUnlocked ? enemy.name : '???'}
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
                    {tab === 'records' && stats ? <RecordsPanel stats={stats} /> : (
                    <AnimatePresence mode="wait">
                        {selectedEnemy && selectedEnemy.minWave <= maxWave ? (
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

                                <h1 className="text-4xl font-tech font-bold text-white mb-2 text-center">{selectedEnemy.name}</h1>
                                <div className="flex gap-2 mb-8">
                                    <Badge label={selectedEnemy.behavior} />
                                    <Badge label={selectedEnemy.visualType} />
                                    <Badge label={`WAVE ${selectedEnemy.minWave}+`} color="text-purple-400 border-purple-900 bg-purple-900/10" />
                                </div>

                                <p className="text-slate-400 italic text-center max-w-lg mb-4 leading-relaxed">
                                    "{selectedEnemy.description}"
                                </p>

                                {/* (3B) FIELD NOTES — lore unlocks after LORE_KILLS kills */}
                                {(() => {
                                    const k = killCounts[selectedEnemy.id] ?? 0;
                                    const unlocked = k >= LORE_KILLS;
                                    return (
                                        <section id="archives-lore" className="w-full max-w-lg mb-10 text-center">
                                            <div className="text-[9px] font-mono tracking-[0.3em] text-slate-500 mb-1">
                                                FIELD NOTES · {Math.min(k, LORE_KILLS)}/{LORE_KILLS} KILLS
                                            </div>
                                            <p className="text-xs leading-relaxed px-2" style={{ color: unlocked ? '#cbd5e1' : '#475569', fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace' }}>
                                                {unlocked ? (loreFor(selectedEnemy.id) ?? '???') : '???'}
                                            </p>
                                        </section>
                                    );
                                })()}

                                {/* STATS GRID */}
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 w-full max-w-3xl">
                                    <StatBox label="HIT POINTS" value={selectedEnemy.baseHp} />
                                    <StatBox label="SPEED" value={selectedEnemy.baseSpeed} />
                                    <StatBox label="SIZE CLASS" value={selectedEnemy.size} />
                                    <StatBox label="REWARD" value={selectedEnemy.essenceReward} suffix=" M" />
                                </div>

                            </motion.div>
                        ) : (
                            <div className="flex-1 flex flex-col items-center justify-center text-slate-600">
                                <HelpCircle size={64} className="mb-4 opacity-20" />
                                <p className="font-tech tracking-widest text-sm">SELECT ENTITY FOR ANALYSIS</p>
                            </div>
                        )}
                    </AnimatePresence>)}
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
