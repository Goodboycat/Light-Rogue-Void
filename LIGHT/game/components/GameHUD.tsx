
import React from 'react';
import { Atom } from 'lucide-react';
import { IS_DEMO, DEMO_MAX_WAVE } from './game/Constants';

interface GameHUDProps {
    matter: number;
    touch?: boolean; // (7A) hide keyboard hints when touch controls are on
}

const GameHUD: React.FC<GameHUDProps> = ({ matter, touch = false }) => {
    return (
        <>
            <div id="hud-matter" className="fixed top-3 right-3 md:top-6 md:right-6 z-40 bg-black/35 backdrop-blur-sm border border-white/10 px-3 py-2 md:px-4 md:py-3 rounded-lg flex items-center gap-2 md:gap-3"
                 style={{ marginTop: 'env(safe-area-inset-top, 0px)', marginRight: 'env(safe-area-inset-right, 0px)' }}>
                <Atom className="text-purple-400 w-4 h-4 md:w-6 md:h-6 animate-spin" style={{ animationDuration: '8s' }} />
                <span className="text-lg md:text-2xl font-tech font-bold tabular-nums">{Math.floor(matter)}</span>
            </div>
            {!touch && (
                <div className="fixed bottom-6 left-6 z-40 text-[10px] md:text-xs text-white/30 font-tech tracking-widest hidden md:block">
                    ESC · CONSTELLATION
                </div>
            )}
            {IS_DEMO && (
                <div id="demo-badge" className="fixed top-2 left-1/2 -translate-x-1/2 z-40 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-400/40 text-amber-200 text-[10px] font-tech tracking-[0.3em]">
                    DEMO · WAVES 1–{DEMO_MAX_WAVE}
                </div>
            )}
        </>
    );
};

export default GameHUD;
