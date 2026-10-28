import React from 'react';
import { motion } from 'framer-motion';
import { Network, RotateCw, Home } from 'lucide-react';
import { ENEMIES } from '../enemies';
import { BOSSES } from '../bosses';
import { chapterIndexOf, chapterOf, WAVES_PER_CHAPTER } from './game/Constants';

/** (7A) Everything the end-of-run screens show. Built once by SurvivalGame.buildRunSummary(). */
export interface RunSummaryData {
    wave: number;
    kills: number;
    eliteKills: number;
    bossKills: number;
    essence: number;        // raw essence picked up this run
    matter: number;         // matter actually banked this run (sessionMatter)
    relics: number;
    shrines: number;
    landmarks: number;
    bestStreak: number;
    burstsFired: number;
    timeMs: number;
    /** enemy ids first seen this run (bestiary "NEW") */
    newEnemyIds: string[];
}

const fmtTime = (ms: number) => {
    const s = Math.max(0, Math.floor(ms / 1000));
    const m = Math.floor(s / 60);
    return `${m}:${(s % 60).toString().padStart(2, '0')}`;
};

const enemyName = (id: string): string =>
    ENEMIES.find(e => e.id === id)?.name ?? BOSSES.find(b => b.id === id)?.name ?? id;

interface RunSummaryProps {
    data: RunSummaryData;
    accent?: string;            // tailwind text colour for numbers
    onTree: () => void;
    onRetryChapter: (firstWave: number) => void;
    onMenu: () => void;
    /** hide the retry button (victory screen already has its own flow) */
    hideRetry?: boolean;
}

const Stat: React.FC<{ label: string; value: string | number; accent?: string }> = ({ label, value, accent = 'text-white' }) => (
    <div className="flex flex-col items-center px-2 py-1.5 rounded-md bg-white/[0.03] border border-white/5 min-w-[72px]">
        <span className={`font-tech text-lg md:text-xl tabular-nums leading-none ${accent}`}>{value}</span>
        <span className="font-mono text-[8px] md:text-[9px] tracking-[0.2em] text-white/40 uppercase mt-1">{label}</span>
    </div>
);

const RunSummary: React.FC<RunSummaryProps> = ({ data, accent = 'text-white', onTree, onRetryChapter, onMenu, hideRetry }) => {
    const ch = chapterIndexOf(data.wave);
    const firstWave = (ch - 1) * WAVES_PER_CHAPTER + 1;
    const chapter = chapterOf(data.wave);
    const discoveries = data.relics + data.shrines + data.landmarks;
    return (
        <motion.section
            id="run-summary"
            {...({ initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 }, transition: { delay: 0.3 } } as any)}
            className="w-full max-w-xl mx-auto text-left"
        >
            <div className="grid grid-cols-4 gap-1.5 md:gap-2">
                <Stat label="waves" value={data.wave} accent={accent} />
                <Stat label="kills" value={data.kills.toLocaleString()} accent={accent} />
                <Stat label="elites" value={data.eliteKills} accent="text-amber-300" />
                <Stat label="bosses" value={data.bossKills} accent="text-red-300" />
                <Stat label="essence" value={Math.floor(data.essence).toLocaleString()} accent="text-cyan-300" />
                <Stat label="→ matter" value={`+${Math.floor(data.matter).toLocaleString()}`} accent="text-purple-300" />
                <Stat label="found" value={discoveries} accent="text-emerald-300" />
                <Stat label="streak" value={data.bestStreak} accent="text-yellow-300" />
            </div>
            <div className="flex justify-between font-mono text-[9px] md:text-[10px] text-white/35 tracking-widest uppercase mt-2 px-1">
                <span>{fmtTime(data.timeMs)} survived</span>
                <span>{data.relics} relics · {data.shrines} shrines · {data.landmarks} landmarks{data.burstsFired ? ` · ${data.burstsFired} bursts` : ''}</span>
            </div>
            {data.newEnemyIds.length > 0 && (
                <div id="summary-new-bestiary" className="mt-3 px-1">
                    <div className="font-tech text-[9px] tracking-[0.3em] text-blue-300/80 uppercase mb-1">New in the archives</div>
                    <div className="flex flex-wrap gap-1">
                        {data.newEnemyIds.slice(0, 12).map(id => (
                            <span key={id} className="px-2 py-0.5 rounded bg-blue-500/10 border border-blue-400/30 text-blue-200 font-mono text-[10px]">{enemyName(id)}</span>
                        ))}
                        {data.newEnemyIds.length > 12 && <span className="text-white/30 font-mono text-[10px]">+{data.newEnemyIds.length - 12}</span>}
                    </div>
                </div>
            )}
            <div className="flex flex-wrap justify-center gap-2 md:gap-3 mt-5">
                <button onClick={onTree}
                    className="flex items-center gap-2 px-4 py-3 rounded-lg bg-amber-500/15 border border-amber-400/50 text-amber-200 hover:bg-amber-500/30 font-tech text-xs tracking-[0.2em]">
                    <Network size={14} /> TREE
                </button>
                {!hideRetry && (
                    <button onClick={() => onRetryChapter(firstWave)}
                        className="flex items-center gap-2 px-4 py-3 rounded-lg bg-white/5 border border-white/30 text-white hover:bg-white/15 font-tech text-xs tracking-[0.2em]">
                        <RotateCw size={14} /> RETRY {chapter.name.toUpperCase()}
                    </button>
                )}
                <button data-sfx="back" onClick={onMenu}
                    className="flex items-center gap-2 px-4 py-3 rounded-lg bg-slate-900 border border-slate-700 text-slate-300 hover:text-white hover:border-slate-500 font-tech text-xs tracking-[0.2em]">
                    <Home size={14} /> MENU
                </button>
            </div>
        </motion.section>
    );
};

export default RunSummary;
