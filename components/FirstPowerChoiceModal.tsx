import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Flame, Snowflake, Zap, Check, Sparkles } from 'lucide-react';
import { t } from '../translate';

interface FirstPowerChoiceModalProps {
    lang?: 'en' | 'es';
    onSelectPower: (targetNodeId: string) => void;
}

interface PowerCardData {
    id: string;
    nodeId: string;
    title: string;
    abilityName: string;
    tag: string;
    tagLabel: string;
    description: string;
    color: string;
    glowColor: string;
    icon: React.ReactNode;
    type: 'FIRE' | 'FROST' | 'STORM';
}

const PreviewCanvas: React.FC<{ type: 'FIRE' | 'FROST' | 'STORM' }> = ({ type }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let anim: number;
        let frame = 0;

        const render = () => {
            frame++;
            const w = canvas.width;
            const h = canvas.height;
            const cx = w / 2;
            const cy = h / 2;

            ctx.clearRect(0, 0, w, h);

            // Dark background glow
            ctx.fillStyle = 'rgba(15, 23, 42, 0.6)';
            ctx.fillRect(0, 0, w, h);

            if (type === 'FIRE') {
                // Fire Blast: Expanding orange projectiles fanning out
                const loopFrame = frame % 90; // 1.5s loop
                const progress = loopFrame / 90;
                
                // Player core
                ctx.fillStyle = '#fff';
                ctx.beginPath();
                ctx.arc(cx, cy, 6, 0, Math.PI * 2);
                ctx.fill();

                // Projectiles
                const count = 3;
                for (let i = 0; i < count; i++) {
                    const angle = -Math.PI / 2 + (i - 1) * 0.35;
                    const dist = progress * (w * 0.42);
                    const px = cx + Math.cos(angle) * dist;
                    const py = cy + Math.sin(angle) * dist;
                    const alpha = Math.max(0, 1 - progress);

                    ctx.fillStyle = `rgba(249, 115, 22, ${alpha})`;
                    ctx.beginPath();
                    ctx.arc(px, py, 5 + progress * 3, 0, Math.PI * 2);
                    ctx.fill();

                    ctx.strokeStyle = `rgba(251, 146, 60, ${alpha * 0.8})`;
                    ctx.lineWidth = 2;
                    ctx.beginPath();
                    ctx.arc(px, py, 9 + progress * 3, 0, Math.PI * 2);
                    ctx.stroke();
                }
            } else if (type === 'FROST') {
                // Ice Nova: Expanding cyan ring
                const loopFrame = frame % 90;
                const progress = loopFrame / 90;
                const radius = progress * (w * 0.42);
                const alpha = Math.max(0, 1 - progress);

                // Player core
                ctx.fillStyle = '#fff';
                ctx.beginPath();
                ctx.arc(cx, cy, 6, 0, Math.PI * 2);
                ctx.fill();

                // Expanding ring
                ctx.strokeStyle = `rgba(56, 189, 248, ${alpha})`;
                ctx.lineWidth = 3;
                ctx.beginPath();
                ctx.arc(cx, cy, radius, 0, Math.PI * 2);
                ctx.stroke();

                ctx.fillStyle = `rgba(56, 189, 248, ${alpha * 0.15})`;
                ctx.fill();

                // Slowed dots
                for (let a = 0; a < Math.PI * 2; a += Math.PI / 3) {
                    const ex = cx + Math.cos(a) * 35;
                    const ey = cy + Math.sin(a) * 35;
                    ctx.fillStyle = progress > 0.3 ? `rgba(147, 197, 253, ${alpha})` : 'rgba(239, 68, 68, 0.8)';
                    ctx.beginPath();
                    ctx.arc(ex, ey, 3.5, 0, Math.PI * 2);
                    ctx.fill();
                }
            } else if (type === 'STORM') {
                // Thunder Chain: Bouncing lightning bolts
                const loopFrame = frame % 70;
                const progress = loopFrame / 70;

                // Player core
                ctx.fillStyle = '#fff';
                ctx.beginPath();
                ctx.arc(cx, cy, 6, 0, Math.PI * 2);
                ctx.fill();

                // Target points
                const targets = [
                    { x: cx + 30, y: cy - 25 },
                    { x: cx + 45, y: cy + 20 },
                    { x: cx - 35, y: cy - 15 }
                ];

                if (progress < 0.7) {
                    ctx.strokeStyle = '#fbbf24';
                    ctx.lineWidth = 2.5;

                    let prevX = cx;
                    let prevY = cy;

                    targets.forEach(t => {
                        ctx.beginPath();
                        ctx.moveTo(prevX, prevY);
                        const midX = (prevX + t.x) / 2 + (Math.random() - 0.5) * 8;
                        const midY = (prevY + t.y) / 2 + (Math.random() - 0.5) * 8;
                        ctx.lineTo(midX, midY);
                        ctx.lineTo(t.x, t.y);
                        ctx.stroke();

                        ctx.fillStyle = '#fef08a';
                        ctx.beginPath();
                        ctx.arc(t.x, t.y, 4, 0, Math.PI * 2);
                        ctx.fill();

                        prevX = t.x;
                        prevY = t.y;
                    });
                }
            }

            anim = requestAnimationFrame(render);
        };

        render();

        return () => cancelAnimationFrame(anim);
    }, [type]);

    return (
        <canvas 
            ref={canvasRef} 
            width={120} 
            height={90} 
            className="w-full h-24 rounded-lg bg-slate-950/80 border border-slate-800 object-cover"
        />
    );
};

export const FirstPowerChoiceModal: React.FC<FirstPowerChoiceModalProps> = ({
    lang = 'en',
    onSelectPower
}) => {
    const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
    const [isConfirming, setIsConfirming] = useState(false);

    const cards: PowerCardData[] = [
        {
            id: 'fire',
            nodeId: 'fire_blast_node_2',
            title: 'FIRE',
            abilityName: 'Fire Blast',
            tag: 'Aim',
            tagLabel: t('Aim', lang),
            description: t('Fires expanding bursts of searing flame toward enemies.', lang),
            color: 'from-orange-500/20 to-red-950/40 border-orange-500/50 text-orange-400',
            glowColor: 'shadow-[0_0_25px_rgba(249,115,22,0.35)] hover:border-orange-400',
            icon: <Flame size={28} className="text-orange-400 animate-pulse" />,
            type: 'FIRE'
        },
        {
            id: 'frost',
            nodeId: 'ice_nova_node_2',
            title: 'FROST',
            abilityName: 'Ice Nova',
            tag: 'Control',
            tagLabel: t('Control', lang),
            description: t('Emits freezing shockwaves that slow and damage nearby foes.', lang),
            color: 'from-cyan-500/20 to-blue-950/40 border-cyan-500/50 text-cyan-300',
            glowColor: 'shadow-[0_0_25px_rgba(56,189,248,0.35)] hover:border-cyan-400',
            icon: <Snowflake size={28} className="text-cyan-300 animate-pulse" />,
            type: 'FROST'
        },
        {
            id: 'storm',
            nodeId: 'thunder_chain_node_2',
            title: 'STORM',
            abilityName: 'Thunder Chain',
            tag: 'Auto',
            tagLabel: t('Auto', lang),
            description: t('Unleashes bouncing lightning bolts across multiple targets.', lang),
            color: 'from-amber-500/20 to-yellow-950/40 border-amber-500/50 text-amber-300',
            glowColor: 'shadow-[0_0_25px_rgba(251,191,36,0.35)] hover:border-amber-400',
            icon: <Zap size={28} className="text-amber-300 animate-pulse" />,
            type: 'STORM'
        }
    ];

    const handleCardClick = (card: PowerCardData) => {
        if (isConfirming) return; // Prevent double taps

        setSelectedNodeId(card.nodeId);
        setIsConfirming(true);

        // 400ms confirm animation before granting nodes
        setTimeout(() => {
            onSelectPower(card.nodeId);
        }, 400);
    };

    return (
        <div className="fixed inset-0 z-[120] bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4">
            <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                className="w-full max-w-3xl bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl p-6 sm:p-8 flex flex-col items-center text-center gap-6"
            >
                {/* Header */}
                <div className="flex flex-col items-center gap-2">
                    <div className="flex items-center gap-2 text-amber-400 font-mono text-xs uppercase tracking-[0.3em] font-bold">
                        <Sparkles size={16} className="animate-spin" style={{ animationDuration: '6s' }} />
                        <span>{t('COSMIC ASCENSION', lang)}</span>
                    </div>
                    <h2 className="text-2xl sm:text-3xl font-tech font-extrabold text-white tracking-widest uppercase drop-shadow-[0_0_15px_rgba(255,255,255,0.4)]">
                        {t('CHOOSE YOUR FIRST POWER', lang)}
                    </h2>
                    <p className="text-xs sm:text-sm text-slate-400 max-w-md font-sans">
                        {t('Wave 1 completed. Select your starting virtue to unlock its path for free.', lang)}
                    </p>
                </div>

                {/* 3 Large Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full mt-2">
                    {cards.map(card => {
                        const isSelected = selectedNodeId === card.nodeId;

                        return (
                            <motion.button
                                key={card.id}
                                type="button"
                                disabled={isConfirming}
                                onClick={() => handleCardClick(card)}
                                whileHover={{ scale: isConfirming ? 1 : 1.03 }}
                                whileTap={{ scale: isConfirming ? 1 : 0.97 }}
                                className={`relative min-w-[112px] min-h-[152px] bg-gradient-to-b ${card.color} border rounded-xl p-4 flex flex-col items-center text-left transition-all duration-300 cursor-pointer overflow-hidden ${card.glowColor} ${
                                    isSelected ? 'scale-105 border-white shadow-[0_0_30px_rgba(255,255,255,0.8)] ring-2 ring-white' : ''
                                }`}
                            >
                                {/* Top Header */}
                                <div className="w-full flex items-center justify-between mb-3">
                                    <div className="p-2 bg-slate-950/60 rounded-lg border border-slate-800">
                                        {card.icon}
                                    </div>
                                    <span className="text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded bg-slate-950/80 border border-slate-700 text-slate-300">
                                        {card.tagLabel}
                                    </span>
                                </div>

                                {/* Title & Ability Name */}
                                <div className="w-full mb-2">
                                    <span className="text-[10px] font-mono font-bold tracking-widest text-slate-400 block uppercase">
                                        {card.title}
                                    </span>
                                    <h3 className="text-base font-tech font-bold text-white tracking-wider">
                                        {card.abilityName}
                                    </h3>
                                </div>

                                {/* 2s Looping Preview */}
                                <div className="w-full my-2">
                                    <PreviewCanvas type={card.type} />
                                </div>

                                {/* Plain Description */}
                                <p className="text-[11px] text-slate-300 leading-relaxed font-sans mt-1">
                                    {card.description}
                                </p>

                                {/* Confirmation check overlay */}
                                {isSelected && (
                                    <motion.div
                                        initial={{ opacity: 0, scale: 0.5 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center"
                                    >
                                        <div className="flex flex-col items-center gap-2 text-emerald-400">
                                            <Check size={36} className="animate-bounce" />
                                            <span className="font-tech text-xs tracking-widest uppercase font-bold text-white">
                                                {t('POWER UNLOCKED!', lang)}
                                            </span>
                                        </div>
                                    </motion.div>
                                )}
                            </motion.button>
                        );
                    })}
                </div>
            </motion.div>
        </div>
    );
};

export default FirstPowerChoiceModal;
