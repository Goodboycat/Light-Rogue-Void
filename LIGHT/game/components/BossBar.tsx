// (2B) Boss HUD: name, HP bar with phase ticks at 66/33, phase label, enrage countdown.
// Fed by SurvivalGame every few frames from state.activeBoss (no per-frame React churn).
import React from 'react';
import { BOSS_PHASE_THRESHOLDS } from './game/Constants';

export interface BossBarInfo {
    name: string;
    color: string;
    hpPct: number;      // 0..1
    phase: number;      // 1..3
    shifting: boolean;  // invulnerable phase shift
    enraged: boolean;
    enrageIn: number;   // seconds, 0 when enraged
}

const PHASE_LABEL = ['', 'PHASE I', 'PHASE II', 'PHASE III'];

const BossBar: React.FC<{ info: BossBarInfo }> = ({ info }) => {
    const pct = Math.max(0, Math.min(1, info.hpPct));
    const barColor = info.enraged ? '#ef4444' : info.color;
    const mm = Math.floor(info.enrageIn / 60);
    const ss = Math.floor(info.enrageIn % 60).toString().padStart(2, '0');
    return (
        <section id="boss-bar" className="absolute left-1/2 -translate-x-1/2 top-9 w-[min(600px,92vw)] pointer-events-none select-none z-20">
            <div className="flex items-end justify-between px-1 mb-1">
                <span className="font-tech text-sm md:text-lg tracking-[0.2em] text-white drop-shadow-[0_0_6px_rgba(0,0,0,0.9)]">
                    {info.name}
                </span>
                <span className={`font-mono text-[10px] md:text-xs tracking-widest ${info.enraged ? 'text-red-400 animate-pulse' : 'text-slate-300'}`}>
                    {info.enraged ? 'ENRAGED' : `ENRAGE ${mm}:${ss}`}
                </span>
            </div>
            <div className={`relative h-4 md:h-5 bg-slate-950/90 border ${info.shifting ? 'border-white' : 'border-slate-700'} rounded-sm overflow-hidden`}>
                <div
                    className="absolute inset-y-0 left-0 transition-[width] duration-150 ease-linear"
                    style={{ width: `${pct * 100}%`, background: barColor, boxShadow: `0 0 12px ${barColor}` }}
                />
                {info.shifting && <div className="absolute inset-0 bg-white/60 animate-pulse" />}
                {BOSS_PHASE_THRESHOLDS.map(t => (
                    <div key={t} className="absolute inset-y-0 w-[2px] bg-white/80" style={{ left: `${t * 100}%` }} />
                ))}
                <span className="absolute inset-0 flex items-center justify-center font-tech text-[9px] md:text-[11px] tracking-[0.3em] text-white mix-blend-difference">
                    {info.shifting ? 'SHIFTING' : PHASE_LABEL[info.phase] ?? ''}
                </span>
            </div>
        </section>
    );
};

export default BossBar;
