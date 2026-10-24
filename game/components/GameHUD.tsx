
import React from 'react';
import { Atom } from 'lucide-react';

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
        </>
    );
};

export default GameHUD;
