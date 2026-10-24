import React, { useState } from 'react';
import { HelpCircle, X, Copy, Check, ExternalLink, Send, Bug, Smile, Flame, Feather } from 'lucide-react';
import { CONFIG } from './game/Constants';
import { track, isTelemetryActive } from '../utils/telemetry';
import { PerformanceMode } from './game/Quality';
import { t } from '../translate';

export type FeedbackChoice = 'fun' | 'too_hard' | 'too_easy' | 'bug';

export interface FeedbackPayload {
    choice: FeedbackChoice;
    text: string;
    version: string;
    wave: number;
    boss: string | null;
    screenSize: string;
    performanceMode: PerformanceMode | string;
    averageFps: number;
    last5DamageSources: string[];
}

interface FeedbackModalProps {
    isOpen: boolean;
    onClose: () => void;
    wave: number;
    bossId?: string | null;
    performanceMode?: PerformanceMode | string;
    averageFps?: number;
    last5DamageSources?: string[];
    lang?: 'en' | 'es';
    autoOffered?: boolean;
}

export const FeedbackModal: React.FC<FeedbackModalProps> = ({
    isOpen,
    onClose,
    wave,
    bossId = null,
    performanceMode = 'HIGH',
    averageFps = 60,
    last5DamageSources = [],
    lang = 'en',
    autoOffered = false,
}) => {
    const [choice, setChoice] = useState<FeedbackChoice>('fun');
    const [text, setText] = useState('');
    const [submitted, setSubmitted] = useState(false);
    const [copied, setCopied] = useState(false);

    if (!isOpen) return null;

    const screenSize =
        typeof window !== 'undefined'
            ? `${window.innerWidth}x${window.innerHeight} (@${window.devicePixelRatio || 1}x)`
            : '0x0';

    const buildPayload = (): FeedbackPayload => ({
        choice,
        text: text.slice(0, 280).trim(),
        version: CONFIG.APP_VERSION,
        wave,
        boss: bossId || null,
        screenSize,
        performanceMode,
        averageFps: Math.round(averageFps),
        last5DamageSources: last5DamageSources.slice(-5),
    });

    const handleSend = () => {
        const payload = buildPayload();
        track('feedback', payload);
        setSubmitted(true);
    };

    const handleCopyReport = () => {
        const payload = buildPayload();
        const reportText = JSON.stringify(payload, null, 2);
        try {
            navigator.clipboard.writeText(reportText);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch {}
    };

    const choices: Array<{ id: FeedbackChoice; label: string; icon: React.ReactNode; color: string }> = [
        {
            id: 'fun',
            label: t('Fun!', lang),
            icon: <Smile size={16} />,
            color: 'border-emerald-500/60 bg-emerald-950/50 text-emerald-300',
        },
        {
            id: 'too_hard',
            label: t('Too Hard', lang),
            icon: <Flame size={16} />,
            color: 'border-rose-500/60 bg-rose-950/50 text-rose-300',
        },
        {
            id: 'too_easy',
            label: t('Too Easy', lang),
            icon: <Feather size={16} />,
            color: 'border-cyan-500/60 bg-cyan-950/50 text-cyan-300',
        },
        {
            id: 'bug',
            label: t('Bug Report', lang),
            icon: <Bug size={16} />,
            color: 'border-amber-500/60 bg-amber-950/50 text-amber-300',
        },
    ];

    return (
        <div
            onClick={(e) => {
                e.stopPropagation();
                onClose();
            }}
            className="fixed inset-0 z-[220] bg-black/80 flex items-center justify-center p-4 pointer-events-auto"
        >
            <div
                onClick={(e) => e.stopPropagation()}
                className="w-full max-w-md bg-slate-950 border border-slate-800 rounded-2xl p-5 shadow-2xl text-left space-y-4 relative"
            >
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                    <div className="flex items-center gap-2">
                        <HelpCircle size={18} className="text-cyan-400" />
                        <h3 className="font-tech font-bold text-sm sm:text-base tracking-wider uppercase text-white">
                            {autoOffered ? t('Quick Run Feedback?', lang) : t('Feedback & Bug Report', lang)}
                        </h3>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white cursor-pointer"
                    >
                        <X size={16} />
                    </button>
                </div>

                {/* 4 Choices */}
                <div className="grid grid-cols-2 gap-2">
                    {choices.map((item) => {
                        const selected = choice === item.id;
                        return (
                            <button
                                key={item.id}
                                type="button"
                                onClick={() => setChoice(item.id)}
                                className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border font-tech text-xs tracking-wider uppercase font-bold transition-colors cursor-pointer ${
                                    selected
                                        ? `${item.color} ring-2 ring-white/30`
                                        : 'border-slate-800 bg-slate-900/60 text-slate-400 hover:text-slate-200'
                                }`}
                            >
                                {item.icon}
                                <span>{item.label}</span>
                            </button>
                        );
                    })}
                </div>

                {/* Optional Text (max 280 chars) */}
                <div>
                    <div className="flex justify-between items-center text-[10px] font-mono text-slate-400 mb-1">
                        <span>{t('Optional notes (what felt off or broke?)', lang)}</span>
                        <span>{text.length}/280</span>
                    </div>
                    <textarea
                        value={text}
                        maxLength={280}
                        onChange={(e) => setText(e.target.value.slice(0, 280))}
                        placeholder={t('Share details, wave, or reproduction steps...', lang)}
                        rows={3}
                        className="w-full rounded-xl bg-slate-900 border border-slate-800 focus:border-cyan-500/60 outline-none p-2.5 text-xs text-slate-200 font-mono resize-none"
                    />
                </div>

                {/* Automatic Diagnostic Payload Preview */}
                <div className="bg-slate-900/80 border border-slate-800/90 rounded-xl p-2.5 text-[10px] font-mono text-slate-400 space-y-1">
                    <div className="flex justify-between">
                        <span>
                            v{CONFIG.APP_VERSION} • Wave {wave} {bossId ? `(${bossId})` : ''}
                        </span>
                        <span>
                            {performanceMode} • ~{Math.round(averageFps)} FPS • {screenSize}
                        </span>
                    </div>
                    <div className="truncate text-slate-500">
                        {t('Recent hits:', lang)}{' '}
                        {last5DamageSources.length > 0 ? last5DamageSources.slice(-5).join(', ') : 'None'}
                    </div>
                </div>

                {/* Actions: Send + Copy Report + itch.io comments link */}
                <div className="flex flex-col gap-2 pt-1">
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={handleSend}
                            disabled={submitted}
                            className={`flex-1 py-2.5 px-4 rounded-xl font-tech text-xs tracking-wider uppercase font-bold flex items-center justify-center gap-1.5 cursor-pointer min-h-[42px] ${
                                submitted
                                    ? 'bg-emerald-900/50 border border-emerald-500/50 text-emerald-300'
                                    : 'bg-cyan-500 hover:bg-cyan-400 text-slate-950'
                            }`}
                        >
                            {submitted ? <Check size={15} /> : <Send size={15} />}
                            {submitted
                                ? isTelemetryActive()
                                    ? t('FEEDBACK SENT', lang)
                                    : t('RECORDED (COPY BELOW)', lang)
                                : t('SEND FEEDBACK', lang)}
                        </button>

                        <button
                            type="button"
                            onClick={handleCopyReport}
                            className="py-2.5 px-3.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 font-mono text-xs flex items-center gap-1.5 cursor-pointer min-h-[42px]"
                        >
                            {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                            {copied ? t('COPIED', lang) : t('Copy report', lang)}
                        </button>
                    </div>

                    <a
                        href={CONFIG.ITCH_COMMENTS_URL}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full py-2 px-3 rounded-xl bg-slate-900/60 hover:bg-slate-900 border border-slate-800 text-cyan-400 hover:text-cyan-300 font-mono text-[11px] flex items-center justify-center gap-1.5 text-center"
                    >
                        <ExternalLink size={12} />
                        <span>{t('Open itch.io Comments Page', lang)}</span>
                    </a>
                </div>
            </div>
        </div>
    );
};

export default FeedbackModal;
