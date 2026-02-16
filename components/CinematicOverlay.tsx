
import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CinematicLine } from '../data/cinematics';
import { FastForward } from 'lucide-react';

interface CinematicOverlayProps {
    script: CinematicLine[];
    onComplete: () => void;
    onVisualAction?: (action: string) => void;
}

const CinematicOverlay: React.FC<CinematicOverlayProps> = ({ script, onComplete, onVisualAction }) => {
    const [index, setIndex] = useState(0);
    const [displayedText, setDisplayedText] = useState('');

    useEffect(() => {
        if (index >= script.length) {
            onComplete();
            return;
        }

        const line = script[index];
        setDisplayedText('');
        
        if (line.visualAction && onVisualAction) {
            onVisualAction(line.visualAction);
        }

        let charIndex = 0;
        const typeInterval = setInterval(() => {
            charIndex++;
            setDisplayedText(line.text.slice(0, charIndex));
            if (charIndex >= line.text.length) clearInterval(typeInterval);
        }, 50);

        const nextTimer = setTimeout(() => {
            setIndex(i => i + 1);
        }, line.duration);

        return () => {
            clearInterval(typeInterval);
            clearTimeout(nextTimer);
        };
    }, [index, script, onComplete, onVisualAction]);

    if (index >= script.length) return null;

    const line = script[index];

    return (
        <div className="fixed inset-0 z-[200] flex flex-col items-center justify-center pointer-events-none cursor-none bg-black/20">
            {/* Cinematic Letterbox Bars */}
            <motion.div {...({ initial: { height: 0 }, animate: { height: '15vh' } } as any)} className="absolute top-0 left-0 w-full bg-black z-10" />
            <motion.div {...({ initial: { height: 0 }, animate: { height: '15vh' } } as any)} className="absolute bottom-0 left-0 w-full bg-black z-10" />

            {/* SKIP BUTTON */}
            <button 
                onClick={onComplete}
                className="absolute top-6 right-6 z-[220] flex items-center gap-2 px-3 py-1.5 bg-black/50 hover:bg-slate-800 border border-slate-700/50 hover:border-slate-500 rounded text-slate-500 hover:text-white transition-all font-tech text-[10px] tracking-widest pointer-events-auto cursor-pointer"
            >
                SKIP <FastForward size={10} />
            </button>

            <AnimatePresence mode="wait">
                <motion.div
                    key={index}
                    {...({
                        initial: { opacity: 0, y: 20 },
                        animate: { opacity: 1, y: 0 },
                        exit: { opacity: 0, y: -20 }
                    } as any)}
                    className="relative z-20 max-w-2xl text-center px-8 mt-24"
                >
                    <div className={`font-tech text-sm tracking-[0.3em] mb-4 uppercase ${line.speaker === 'DARKNESS' ? 'text-purple-900' : 'text-amber-500'}`}>
                        {line.speaker}
                    </div>
                    <div className={`font-serif text-3xl md:text-5xl leading-relaxed ${line.speaker === 'DARKNESS' ? 'text-slate-500' : 'text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.5)]'}`}>
                        "{displayedText}"
                    </div>
                </motion.div>
            </AnimatePresence>
        </div>
    );
};

export default CinematicOverlay;
