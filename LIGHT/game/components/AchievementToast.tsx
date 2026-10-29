// (8A step 5) Achievement unlock toast — stacks under the top HUD row, one card per id, auto-dismiss.
import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import * as Icons from 'lucide-react';
import { ACHIEVEMENT_BY_ID } from '../data/achievements';

export interface AchievementToastItem { key: number; id: string }

const TOAST_MS = 4500;

const AchievementToast: React.FC<{ items: AchievementToastItem[]; onDone: (key: number) => void }> = ({ items, onDone }) => {
    const first = items[0];
    useEffect(() => {
        if (!first) return;
        const t = setTimeout(() => onDone(first.key), TOAST_MS);
        return () => clearTimeout(t);
    }, [first?.key]);
    return (
        <div id="achievement-toasts" className="fixed left-1/2 -translate-x-1/2 z-[95] pointer-events-none flex flex-col items-center gap-2"
             style={{ top: 'calc(env(safe-area-inset-top, 0px) + 72px)' }}>
            <AnimatePresence>
                {items.slice(0, 3).map(it => {
                    const a = ACHIEVEMENT_BY_ID[it.id];
                    if (!a) return null;
                    const Icon = (Icons as any)[a.icon] || Icons.Award;
                    return (
                        <motion.div key={it.key}
                            {...({ initial: { y: -16, opacity: 0, scale: 0.95 }, animate: { y: 0, opacity: 1, scale: 1 }, exit: { y: -10, opacity: 0, scale: 0.95 } } as any)}
                            className="flex items-center gap-3 bg-slate-950/90 border border-yellow-400/50 rounded-lg px-4 py-2 shadow-[0_0_24px_rgba(250,204,21,0.25)]">
                            <div className="w-9 h-9 rounded-full bg-yellow-400/15 border border-yellow-400/50 flex items-center justify-center text-yellow-300">
                                <Icon size={18} />
                            </div>
                            <div>
                                <div className="text-[10px] font-mono tracking-[0.3em] text-yellow-400/80">ACHIEVEMENT</div>
                                <div className="text-sm font-tech font-bold text-white leading-tight">{a.title}</div>
                                <div className="text-[11px] text-slate-400">{a.description}{a.reward > 0 && <span className="text-yellow-300 ml-2">+{a.reward.toLocaleString()} matter</span>}</div>
                            </div>
                        </motion.div>
                    );
                })}
            </AnimatePresence>
        </div>
    );
};
export default AchievementToast;
