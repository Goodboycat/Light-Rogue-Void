/**
 * (3B) Non-pausing story caption. Sits at the bottom of the run, above the touch controls.
 * Typewriter at STORY_CAPTION_CPS, then holds STORY_CAPTION_HOLD_MS, then the next line.
 * Voice colours: LIGHT gold, DARKNESS violet, WATCHER grey-white monospace italic.
 * Never pauses the game — purely presentational. Pass a new `lines` array to start a new sequence.
 */
import React, { useEffect, useRef, useState } from 'react';
import { StoryLine, STORY_VOICE_COLOR } from '../data/story';
import { STORY_CAPTION_CPS, STORY_CAPTION_HOLD_MS } from './game/Constants';

interface Props {
    lines: StoryLine[] | null;
    /** Changes whenever a new sequence should start (e.g. the wave number). */
    seq: number;
    /** Raise the caption when the touch controls are visible. */
    raised?: boolean;
}

const VOICE_LABEL: Record<StoryLine['voice'], string> = {
    LIGHT: 'LIGHT',
    DARKNESS: 'DARKNESS',
    WATCHER: '???',
};

const StoryCaption: React.FC<Props> = ({ lines, seq, raised }) => {
    const [idx, setIdx] = useState(0);
    const [shown, setShown] = useState(0);
    const [visible, setVisible] = useState(false);
    const timer = useRef<number | null>(null);

    // Restart on a new sequence
    useEffect(() => {
        setIdx(0);
        setShown(0);
        setVisible(!!lines && lines.length > 0);
    }, [lines, seq]);

    // Typewriter + hold + advance
    useEffect(() => {
        if (!visible || !lines || idx >= lines.length) { setVisible(false); return; }
        const line = lines[idx];
        if (shown < line.text.length) {
            timer.current = window.setTimeout(() => setShown(s => s + 1), 1000 / STORY_CAPTION_CPS);
        } else {
            timer.current = window.setTimeout(() => {
                if (idx + 1 < lines.length) { setIdx(idx + 1); setShown(0); }
                else setVisible(false);
            }, STORY_CAPTION_HOLD_MS);
        }
        return () => { if (timer.current) window.clearTimeout(timer.current); };
    }, [visible, lines, idx, shown]);

    if (!visible || !lines || idx >= lines.length) return null;
    const line = lines[idx];
    const color = STORY_VOICE_COLOR[line.voice];
    const isWatcher = line.voice === 'WATCHER';

    return (
        <aside
            id="story-caption"
            className={`absolute left-0 right-0 flex justify-center pointer-events-none select-none px-4 ${raised ? 'bottom-36 md:bottom-16' : 'bottom-12'}`}
            style={{ zIndex: 30 }}
        >
            <div
                className="max-w-xl w-full text-center rounded-md px-4 py-2"
                style={{
                    background: 'rgba(0,0,0,0.45)',
                    borderLeft: `3px solid ${color}`,
                    borderRight: `3px solid ${color}`,
                    backdropFilter: 'blur(2px)',
                }}
            >
                <div
                    className="text-[10px] tracking-[0.3em] mb-1 opacity-80"
                    style={{ color, fontFamily: isWatcher ? 'ui-monospace, monospace' : undefined }}
                >
                    {VOICE_LABEL[line.voice]}
                </div>
                <p
                    className={`text-sm md:text-base leading-snug ${isWatcher ? 'italic' : ''}`}
                    style={{
                        color: isWatcher ? '#e2e8f0' : '#f8fafc',
                        fontFamily: isWatcher ? 'ui-monospace, SFMono-Regular, Menlo, monospace' : undefined,
                        textShadow: `0 0 12px ${color}55`,
                        minHeight: '1.4em',
                    }}
                >
                    {line.text.slice(0, shown)}
                    <span style={{ opacity: shown < line.text.length ? 0.7 : 0 }}>▌</span>
                </p>
            </div>
        </aside>
    );
};

export default StoryCaption;
