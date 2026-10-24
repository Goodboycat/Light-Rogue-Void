import React from 'react';
import { Atom } from 'lucide-react';
import { t } from '../translate';

interface GameHUDProps {
    canPurchaseNode?: boolean;
    matter: number;
    lang?: 'en' | 'es';
    onOpenConstellation?: () => void;
}

const GameHUD: React.FC<GameHUDProps> = ({ matter, canPurchaseNode, lang = 'en', onOpenConstellation }) => {
    return (
        <>
            <div className="fixed top-8 right-8 z-40 bg-black/60 backdrop-blur-md border border-white/10 p-4 rounded-xl flex items-center gap-4">
                <Atom className="text-purple-400 w-6 h-6 animate-spin" style={{ animationDuration: '8s' }} />
                <span className="text-2xl font-tech font-bold tabular-nums">{Math.floor(matter)}</span>
            </div>
            <button
                type="button"
                onClick={onOpenConstellation}
                className={`fixed bottom-8 left-8 z-40 text-[10px] md:text-xs font-mono font-bold tracking-[0.2em] px-4 py-2.5 bg-slate-950/80 backdrop-blur-md border rounded-full flex items-center gap-2 transition-all pointer-events-auto cursor-pointer min-h-[44px] ${
                    canPurchaseNode
                        ? 'text-amber-300 border-amber-400 shadow-[0_0_20px_rgba(251,191,36,0.45)] animate-pulse scale-105'
                        : 'text-slate-400/90 border-white/10 shadow-[0_4px_12px_rgba(0,0,0,0.5)]'
                }`}
            >
                {t('PRESS ESC TO OPEN CONSTELLATION OF VIRTUES', lang)}
                {canPurchaseNode && <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping shadow-[0_0_8px_#fbbf24]" />}
            </button>
        </>
    );
};

export default GameHUD;
