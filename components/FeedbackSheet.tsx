import React, { useState } from 'react';
import { HelpCircle, Copy, Check, ExternalLink, X, Send } from 'lucide-react';
import { track } from '../utils/telemetry';
import { CONFIG } from './game/Constants';

export type FeedbackChoice = 'fun' | 'too_hard' | 'too_easy' | 'bug';

export interface FeedbackAutoPayload {
    version: string;
    wave: number;
    boss: string;
    screenSize: string;
    performanceMode: string;
    averageFps: number;
    last5DamageSources: string[];
}

interface FeedbackSheetProps {
    isOpen: boolean;
    onClose: () => void;
    payload: FeedbackAutoPayload;
    promptTitle?: string;
}

const CHOICES: { id: FeedbackChoice; label: string; badge: string }[] = [
    { id: 'fun', label: 'Fun / Great Feel', badge: '✨' },
    { id: 'too_hard', label: 'Too Hard / Spiky', badge: '🔥' },
    { id: 'too_easy', label: 'Too Easy / Slow', badge: '🌱' },
    { id: 'bug', label: 'Bug / Performance', badge: '🐛' },
];

export const FeedbackSheet: React.FC<FeedbackSheetProps> = ({
    isOpen,
    onClose,
    payload,
    promptTitle,
}) => {
    const [choice, setChoice] = useState<FeedbackChoice>('fun');
    const [note, setNote] = useState('');
    const [submitted, setSubmitted] = useState(false);
    const [copied, setCopied] = useState(false);

    if (!isOpen) return null;

    const fullReport = {
        choice,
        text: note.trim().slice(0, 280),
        ...payload,
        timestamp: new Date().toISOString(),
    };

    const handleSend = () => {
        track('feedback', fullReport);
        setSubmitted(true);
    };

    const handleCopy = async () => {
        const textReport = JSON.stringify(fullReport, null, 2);
        try {
            if (navigator.clipboard && navigator.clipboard.writeText) {
                await navigator.clipboard.writeText(textReport);
                setCopied(true);
                setTimeout(() => setCopied(false), 2500);
            }
        } catch {
            // Fallback copy via textarea
            try {
                const ta = document.createElement('textarea');
                ta.value = textReport;
                document.body.appendChild(ta);
                ta.select();
                document.execCommand('copy');
                document.body.removeChild(ta);
                setCopied(true);
                setTimeout(() => setCopied(false), 2500);
            } catch {
                // Ignore
            }
        }
    };

    return (
        <div
            className="fixed inset-0 z-[150] flex items-center justify-center bg-slate-950/85 p-4"
            onClick={(e) => e.stopPropagation()}
        >
            <div className="relative w-full max-w-md rounded-2xl border border-cyan-500/40 bg-slate-900 p-5 text-slate-100 shadow-2xl">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                    <div className="flex items-center gap-2">
                        <HelpCircle className="h-5 w-5 text-cyan-400" />
                        <h3 className="font-['Orbitron'] text-sm font-bold tracking-wider text-cyan-300 uppercase">
                            {promptTitle || 'Run Feedback & Bug Report'}
                        </h3>
                    </div>
                    <button
                        onClick={onClose}
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
                        aria-label="Close feedback sheet"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>

                {/* 4 Choices */}
                <div className="mt-4 grid grid-cols-2 gap-2">
                    {CHOICES.map((c) => {
                        const active = choice === c.id;
                        return (
                            <button
                                key={c.id}
                                type="button"
                                onClick={() => setChoice(c.id)}
                                className={`flex items-center gap-2 rounded-xl border px-3 py-2.5 text-left text-xs font-bold transition-colors ${
                                    active
                                        ? 'border-cyan-400 bg-cyan-950/70 text-cyan-200'
                                        : 'border-slate-800 bg-slate-950/60 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                                }`}
                            >
                                <span>{c.badge}</span>
                                <span>{c.label}</span>
                            </button>
                        );
                    })}
                </div>

                {/* Optional Text (max 280 chars) */}
                <div className="mt-3">
                    <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1">
                        <span>Optional details</span>
                        <span>{note.length}/280</span>
                    </div>
                    <textarea
                        value={note}
                        onChange={(e) => setNote(e.target.value.slice(0, 280))}
                        maxLength={280}
                        rows={3}
                        placeholder="What felt off or awesome? Any reproduction steps?"
                        className="w-full rounded-xl border border-slate-800 bg-slate-950/90 p-2.5 text-xs text-slate-100 placeholder-slate-500 focus:border-cyan-500 focus:outline-none"
                    />
                </div>

                {/* Automatic Diagnostic Payload Preview */}
                <div className="mt-3 rounded-xl border border-slate-800/90 bg-slate-950/70 p-2.5 text-[11px] font-mono text-slate-400 space-y-1">
                    <div className="flex justify-between">
                        <span>v{payload.version} • Wave {payload.wave}</span>
                        <span>{payload.performanceMode} • {payload.averageFps} FPS</span>
                    </div>
                    <div className="flex justify-between">
                        <span>Boss: {payload.boss || 'None'}</span>
                        <span>Screen: {payload.screenSize}</span>
                    </div>
                    <div className="truncate text-slate-500">
                        Hits: {payload.last5DamageSources.length > 0 ? payload.last5DamageSources.join(', ') : 'None'}
                    </div>
                </div>

                {/* Primary & Fallback Actions */}
                <div className="mt-4 flex flex-col gap-2">
                    <div className="flex gap-2">
                        <button
                            type="button"
                            onClick={handleSend}
                            disabled={submitted}
                            className={`flex-1 flex items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-bold uppercase tracking-wider transition-colors ${
                                submitted
                                    ? 'bg-emerald-600/30 border border-emerald-500/50 text-emerald-200'
                                    : 'bg-cyan-500 text-slate-950 hover:bg-cyan-400'
                            }`}
                        >
                            <Send className="h-3.5 w-3.5" />
                            {submitted ? 'Feedback Logged!' : 'Send Feedback'}
                        </button>

                        <button
                            type="button"
                            onClick={handleCopy}
                            className="flex items-center justify-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800 px-3 py-2.5 text-xs font-bold text-slate-200 hover:bg-slate-700 transition-colors"
                            title="Copy diagnostic report to clipboard"
                        >
                            {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                            <span>{copied ? 'Copied' : 'Copy Report'}</span>
                        </button>
                    </div>

                    <div className="flex items-center justify-between pt-1 text-[11px] text-slate-400">
                        <span>Playing offline or on itch.io?</span>
                        <a
                            href={CONFIG.ITCH_COMMENTS_URL}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-cyan-400 hover:text-cyan-300 underline"
                        >
                            <span>itch.io comments page</span>
                            <ExternalLink className="h-3 w-3" />
                        </a>
                    </div>
                </div>
            </div>
        </div>
    );
};
