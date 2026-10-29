
import React from 'react';
import { motion } from 'framer-motion';
import { X, Lock, CheckCircle } from 'lucide-react';
import { ACHIEVEMENTS } from '../data/achievements';
import * as Icons from 'lucide-react';

interface AchievementListProps {
    unlockedIds: string[];
    onClose: () => void;
}

const AchievementList: React.FC<AchievementListProps> = ({ unlockedIds, onClose }) => {
    const unlockedCount = unlockedIds.length;
    const total = ACHIEVEMENTS.length;
    const progress = (unlockedCount / total) * 100;

    return (
        <div className="fixed inset-0 z-[60] bg-slate-950/95 backdrop-blur-xl flex items-center justify-center p-4 md:p-12">
            <motion.div 
                {...({
                    initial: { opacity: 0, scale: 0.95 },
                    animate: { opacity: 1, scale: 1 },
                    exit: { opacity: 0, scale: 0.95 }
                } as any)}
                className="w-full max-w-5xl bg-slate-900 border border-slate-700 rounded-xl flex flex-col h-full max-h-full overflow-hidden shadow-2xl"
            >
                {/* HEADER */}
                <div className="p-6 border-b border-slate-800 flex items-center justify-between bg-slate-900/50">
                    <div>
                        <h2 className="text-2xl font-tech text-white mb-1">ACHIEVEMENTS</h2>
                        <div className="flex items-center gap-4">
                            <div className="w-64 h-2 bg-slate-800 rounded-full overflow-hidden">
                                <div className="h-full bg-yellow-500" style={{ width: `${progress}%` }} />
                            </div>
                            <span className="text-xs font-mono text-yellow-500">{unlockedCount} / {total}</span>
                        </div>
                    </div>
                    <button 
                        onClick={onClose}
                        className="p-2 hover:bg-slate-800 rounded-full text-slate-400 hover:text-white transition-colors"
                    >
                        <X size={24} />
                    </button>
                </div>

                {/* LIST */}
                <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {ACHIEVEMENTS.map(ach => {
                            const isUnlocked = unlockedIds.includes(ach.id);
                            // Dynamic Icon
                            const IconComp = (Icons as any)[ach.icon] || Icons.Award;

                            return (
                                <div 
                                    key={ach.id}
                                    className={`
                                        relative p-4 rounded-lg border flex items-center gap-4 transition-all
                                        ${isUnlocked 
                                            ? 'bg-purple-900/10 border-purple-500/30' 
                                            : 'bg-slate-950/50 border-slate-800 opacity-60'
                                        }
                                    `}
                                >
                                    <div className={`
                                        w-12 h-12 rounded-full flex items-center justify-center shrink-0
                                        ${isUnlocked ? 'bg-purple-500 text-white shadow-[0_0_10px_rgba(168,85,247,0.4)]' : 'bg-slate-800 text-slate-600'}
                                    `}>
                                        {isUnlocked ? <IconComp size={20} /> : <Lock size={20} />}
                                    </div>

                                    <div>
                                        <h3 className={`font-tech text-sm font-bold ${isUnlocked ? 'text-white' : 'text-slate-500'}`}>
                                            {ach.title}
                                        </h3>
                                        <p className="text-xs text-slate-400 leading-tight">
                                            {ach.description}
                                        </p>
                                        <p className="text-[10px] font-mono text-yellow-500/80 mt-0.5">+{ach.reward.toLocaleString()} MATTER</p>
                                    </div>

                                    {isUnlocked && (
                                        <div className="absolute top-2 right-2 text-purple-400">
                                            <CheckCircle size={14} />
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            </motion.div>
        </div>
    );
};

export default AchievementList;
