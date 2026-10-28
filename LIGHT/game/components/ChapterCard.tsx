/**
 * (3B step 5) Chapter title card. Shows "CHAPTER n · NAME" with a palette wash for
 * CHAPTER_CARD_MS when `seq` changes. Purely presentational — never pauses the game.
 * The StarBackground tint switch happens in App via SurvivalGame.onChapterChange.
 */
import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChapterDef, CHAPTER_CARD_MS } from './game/Constants';

interface Props {
    chapter: ChapterDef | null;
    /** Changes whenever the card should show again (chapter index + run key). */
    seq: number;
}

const ChapterCard: React.FC<Props> = ({ chapter, seq }) => {
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        if (!chapter) return;
        setVisible(true);
        const t = window.setTimeout(() => setVisible(false), CHAPTER_CARD_MS);
        return () => window.clearTimeout(t);
    }, [chapter, seq]);

    return (
        <AnimatePresence>
            {visible && chapter && (
                <motion.section
                    id="chapter-card"
                    key={`chapter-card-${seq}`}
                    className="fixed inset-0 z-[55] pointer-events-none flex items-center justify-center"
                    {...({
                        initial: { opacity: 0 },
                        animate: { opacity: 1 },
                        exit: { opacity: 0, transition: { duration: 0.6 } },
                        transition: { duration: 0.4 },
                    } as any)}
                >
                    {/* palette wash */}
                    <div
                        className="absolute inset-0"
                        style={{
                            background: `radial-gradient(ellipse at center, ${chapter.color}33 0%, ${chapter.color}0d 45%, transparent 75%)`,
                        }}
                    />
                    <motion.div
                        className="relative text-center px-6"
                        {...({
                            initial: { y: 14, letterSpacing: '0.6em' },
                            animate: { y: 0, letterSpacing: '0.35em' },
                            transition: { duration: 1.2, ease: 'easeOut' },
                        } as any)}
                    >
                        <div
                            className="font-tech text-[10px] md:text-xs uppercase mb-2"
                            style={{ color: chapter.color, opacity: 0.8, letterSpacing: '0.4em' }}
                        >
                            Chapter {chapter.id}
                        </div>
                        <h2
                            className="font-tech uppercase text-2xl md:text-4xl text-white"
                            style={{ textShadow: `0 0 24px ${chapter.color}, 0 0 60px ${chapter.color}66` }}
                        >
                            {chapter.name}
                        </h2>
                        <div
                            className="mx-auto mt-3 h-px w-32 md:w-48"
                            style={{ background: `linear-gradient(90deg, transparent, ${chapter.color}, transparent)` }}
                        />
                    </motion.div>
                </motion.section>
            )}
        </AnimatePresence>
    );
};

export default ChapterCard;
