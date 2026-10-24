
import React from 'react';
import { Atom } from 'lucide-react';
import { IS_DEMO, DEMO_MAX_WAVE } from './game/Constants';

interface GameHUDProps {
    matter: number;
}

const GameHUD: React.FC<GameHUDProps> = ({ matter }) => {
    return (
        <>
            <div className="fixed top-8 right-8 z-40 bg-black/60 backdrop-blur-md border border-white/10 p-4 rounded-xl flex items-center gap-4">
                <Atom className="text-purple-400 w-6 h-6 animate-spin" style={{ animationDuration: '8s' }} />
                <span className="text-2xl font-tech font-bold tabular-nums">{Math.floor(matter)}</span>
            </div>
            <div className="fixed bottom-8 left-8 z-40 text-xs text-white/30 font-tech tracking-widest">
                PRESS ESC FOR CONSTELLATION
            </div>
            {IS_DEMO && (
                <div id="demo-badge" className="fixed top-2 left-1/2 -translate-x-1/2 z-40 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-400/40 text-amber-200 text-[10px] font-tech tracking-[0.3em]">
                    DEMO · WAVES 1–{DEMO_MAX_WAVE}
                </div>
            )}
        </>
    );
};

export default GameHUD;
