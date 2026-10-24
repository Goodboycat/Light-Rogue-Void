
import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CinematicLine } from '../data/cinematics';
import { FastForward } from 'lucide-react';
import { t } from '../translate';

interface CinematicOverlayProps {
    script: CinematicLine[];
    onComplete: () => void;
    onVisualAction?: (action: string) => void;
    isOutro?: boolean;
    lang?: 'en' | 'es';
    dialogueTextSize?: 'NORMAL' | 'LARGE' | 'HUGE';
}

const CinematicOverlay: React.FC<CinematicOverlayProps> = ({ script, onComplete, onVisualAction, isOutro = false, lang = 'en', dialogueTextSize = 'NORMAL' }) => {
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
            const translated = t(line.text, lang);
            setDisplayedText(translated.slice(0, charIndex));
            if (charIndex >= translated.length) clearInterval(typeInterval);
            
        }, 30);

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
        <div className={`fixed inset-0 z-[200] flex flex-col items-center justify-center pointer-events-none cursor-none ${isOutro ? 'bg-white' : 'bg-black/20'}`}>
            {/* Cinematic Letterbox Bars */}
            {!isOutro && (
                <>
                    <motion.div {...({ initial: { height: 0 }, animate: { height: '15vh' } } as any)} className="absolute top-0 left-0 w-full bg-black z-10" />
                    <motion.div {...({ initial: { height: 0 }, animate: { height: '15vh' } } as any)} className="absolute bottom-0 left-0 w-full bg-black z-10" />
                </>
            )}

            {/* SKIP BUTTON */}
            <button 
                onClick={onComplete}
                className={`absolute top-6 right-6 z-[220] flex items-center gap-2 px-3 py-1.5 rounded transition-all font-tech text-[10px] tracking-widest pointer-events-auto cursor-pointer ${
                    isOutro 
                        ? 'bg-amber-50 hover:bg-amber-100 border border-amber-200/60 text-amber-800 hover:text-amber-950 hover:border-amber-400' 
                        : 'bg-black/50 hover:bg-slate-800 border border-slate-700/50 hover:border-slate-500 text-slate-500 hover:text-white'
                }`}
            > {t('SKIP', lang)} <FastForward size={10} />
            </button>

            <AnimatePresence mode="wait">
                <motion.div
                    key={index}
                    {...({
                        initial: { opacity: 0, y: 20 },
                        animate: { opacity: 1, y: 0 },
                        exit: { opacity: 0, y: -20 }
                    } as any)}
                    className="relative z-20 max-w-3xl text-center px-8 mt-24"
                >
                    <div className={`font-tech tracking-[0.4em] mb-4 uppercase ${
                        dialogueTextSize === 'HUGE' ? 'text-lg md:text-xl mb-6' : dialogueTextSize === 'LARGE' ? 'text-base md:text-lg' : 'text-sm'
                    } ${
                        isOutro 
                            ? 'text-amber-600 font-extrabold' 
                            : (line.speaker === 'DARKNESS' ? 'text-purple-900' : 'text-amber-500')
                    }`}>
                        {t(line.speaker, lang)}
                    </div>
                    <div className={`font-serif leading-relaxed font-extrabold ${
                        dialogueTextSize === 'HUGE' 
                            ? 'text-4xl sm:text-6xl md:text-7xl' 
                            : dialogueTextSize === 'LARGE' 
                                ? 'text-3xl sm:text-5xl md:text-6xl' 
                                : 'text-2xl sm:text-4xl md:text-5xl'
                    } ${
                        isOutro 
                            ? 'text-transparent bg-clip-text bg-gradient-to-r from-amber-600 via-yellow-500 to-amber-700 drop-shadow-[0_2px_12px_rgba(245,158,11,0.25)]' 
                            : (line.speaker === 'DARKNESS' ? 'text-slate-500' : 'text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.5)]')
                    }`}>
                        "{displayedText}"
                    </div>
                </motion.div>
            </AnimatePresence>
        </div>
    );
};

export default CinematicOverlay;
