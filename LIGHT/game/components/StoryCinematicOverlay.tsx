/**
 * (7D) Storyline cinematic overlay — letterbox bars, the lines (StoryCaption with the
 * shorter cinematic hold) and a "skip" hint. The camera / fx live in
 * components/game/logic/Cinematic.ts and run inside SurvivalGame's loop; this component
 * is purely presentational and never touches the sim.
 *
 * Input: one press (click / tap / any key) skips once CINEMATIC_SKIP_AFTER_MS have
 * passed — `onSkip` is called and the loop ends the cinematic on its next frame.
 */
import React, { useEffect, useState } from 'react';
import StoryCaption from './StoryCaption';
import { StoryLine } from '../data/story';
import { CINEMATIC_LINE_HOLD_MS, CINEMATIC_SKIP_AFTER_MS } from './game/logic/Cinematic';

interface Props {
    id: string;
    lines: StoryLine[];
    /** Pre-boss push-ins: no bars, no skip hint, lines are the normal caption (SurvivalGame handles it). */
    noFreeze?: boolean;
    raised?: boolean;
    onSkip: () => void;
}

const StoryCinematicOverlay: React.FC<Props> = ({ id, lines, noFreeze, raised, onSkip }) => {
    const [skippable, setSkippable] = useState(false);

    useEffect(() => {
        setSkippable(false);
        const t = window.setTimeout(() => setSkippable(true), CINEMATIC_SKIP_AFTER_MS);
        return () => window.clearTimeout(t);
    }, [id]);

    useEffect(() => {
        if (noFreeze) return;
        const key = (e: KeyboardEvent) => { if (!e.repeat) { e.stopPropagation(); onSkip(); } };
        const press = () => onSkip();
        window.addEventListener('keydown', key, true);
        window.addEventListener('pointerdown', press, true);
        return () => { window.removeEventListener('keydown', key, true); window.removeEventListener('pointerdown', press, true); };
    }, [noFreeze, onSkip]);

    if (noFreeze) return null;

    return (
        <section id="story-cinematic" className="absolute inset-0 pointer-events-none select-none" style={{ zIndex: 40 }}>
            {/* letterbox bars */}
            <div className="absolute left-0 right-0 top-0 bg-black" style={{ height: '9vh', animation: 'cine-bar-in 600ms ease-out both' }} />
            <div className="absolute left-0 right-0 bottom-0 bg-black" style={{ height: '9vh', animation: 'cine-bar-in 600ms ease-out both' }} />
            <StoryCaption lines={lines} seq={0} raised={raised} holdMs={CINEMATIC_LINE_HOLD_MS} />
            <div
                className="absolute right-4 text-[10px] tracking-[0.3em] text-slate-300 transition-opacity duration-500"
                style={{ bottom: 'calc(9vh + 8px)', opacity: skippable ? 0.6 : 0 }}
            >
                PRESS ANY KEY · SKIP
            </div>
            <style>{`@keyframes cine-bar-in { from { transform: scaleY(0); } to { transform: scaleY(1); } }`}</style>
        </section>
    );
};

export default StoryCinematicOverlay;
