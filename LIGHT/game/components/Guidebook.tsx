// (7A step 5) Read-only help, opened from the main menu and the pause menu (Evolution Matrix).
// Derived from the save — no new persisted fields. Ported in spirit from the fork's GuidebookModal
// (tabs + locked rows); text and data are LIGHT's own.
import React, { useMemo, useState } from 'react';
import { X, BookOpen, Gamepad2, Waves, Skull, Compass, Lock } from 'lucide-react';
import { GameState } from '../types';
import { buildGuidebook, GuideTab } from '../data/guidebook';

interface GuidebookProps {
    gameState: GameState;
    onClose: () => void;
}

const TABS: { id: GuideTab; label: string; icon: React.ReactNode }[] = [
    { id: 'controls',    label: 'CONTROLS',    icon: <Gamepad2 size={14} /> },
    { id: 'waves',       label: 'WAVES',       icon: <Waves size={14} /> },
    { id: 'bosses',      label: 'BOSSES',      icon: <Skull size={14} /> },
    { id: 'discoveries', label: 'DISCOVERIES', icon: <Compass size={14} /> },
];

const Guidebook: React.FC<GuidebookProps> = ({ gameState, onClose }) => {
    const [tab, setTab] = useState<GuideTab>('controls');
    const book = useMemo(() => buildGuidebook(gameState), [gameState]);
    const entries = book[tab];
    const seenCount = (t: GuideTab) => book[t].filter(e => e.seen).length;

    return (
        <div id="guidebook" className="fixed inset-0 z-[120] bg-slate-950/95 backdrop-blur-md flex items-center justify-center p-3 sm:p-6">
            <section className="w-full max-w-2xl bg-slate-900 border border-slate-700 rounded-2xl shadow-[0_0_50px_rgba(255,255,255,0.08)] overflow-hidden flex flex-col h-[85vh] sm:h-[80vh]">
                <header className="p-4 sm:p-6 border-b border-slate-800 bg-slate-950/40 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <BookOpen className="text-cyan-400 w-6 h-6" />
                        <div>
                            <h2 className="text-lg sm:text-xl font-tech font-extrabold text-white tracking-[0.2em]">GUIDEBOOK</h2>
                            <p className="text-[10px] text-slate-500 font-mono uppercase tracking-widest mt-0.5">
                                Field manual · what you have seen so far
                            </p>
                        </div>
                    </div>
                    <button data-sfx="back" onClick={onClose} className="p-2 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg transition-colors" title="Close">
                        <X size={20} />
                    </button>
                </header>

                <nav className="flex border-b border-slate-800/80 bg-slate-950/20 px-2 overflow-x-auto">
                    {TABS.map(t => {
                        const active = tab === t.id;
                        return (
                            <button
                                key={t.id}
                                onClick={() => setTab(t.id)}
                                className={`flex items-center gap-2 px-3 sm:px-4 py-3 font-tech text-[10px] sm:text-xs tracking-wider border-b-2 transition-colors whitespace-nowrap ${
                                    active ? 'border-cyan-400 text-white' : 'border-transparent text-slate-500 hover:text-slate-300'
                                }`}
                            >
                                {t.icon}
                                {t.label}
                                <span className="text-slate-600 font-mono">{seenCount(t.id)}/{book[t.id].length}</span>
                            </button>
                        );
                    })}
                </nav>

                <ul className="flex-1 overflow-y-auto p-3 sm:p-5 space-y-2">
                    {entries.map(e => (
                        <li key={e.id} className={`rounded-lg border p-3 sm:p-4 ${e.seen ? 'border-slate-700 bg-slate-800/40' : 'border-slate-800 bg-slate-900/40 opacity-60'}`}>
                            <h3 className="font-tech text-xs sm:text-sm tracking-wider text-white flex items-center gap-2">
                                {!e.seen && <Lock size={12} className="text-slate-500" />}
                                {e.seen ? e.title : '???'}
                            </h3>
                            <p className="text-[11px] sm:text-sm text-slate-300 mt-1 leading-relaxed font-mono">
                                {e.seen ? e.body : 'Not yet encountered.'}
                            </p>
                        </li>
                    ))}
                </ul>
            </section>
        </div>
    );
};

export default Guidebook;
