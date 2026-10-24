import React, { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { X, Lock, Check, Sparkles, Flame } from 'lucide-react';
import { COSMETICS_DATA, CosmeticItem } from '../data/cosmetics';
import { getGlowSprite } from './game/renderer/GlowSprites';
import { t } from '../translate';

interface CosmeticsModalProps {
    lang?: 'en' | 'es';
    equippedSkin: string;
    equippedTrail: string;
    unlockedCosmetics: string[];
    newCosmeticIds?: string[];
    onEquipSkin: (id: string) => void;
    onEquipTrail: (id: string) => void;
    onClearNewCosmetics?: () => void;
    onClose: () => void;
}

const CosmeticsModal: React.FC<CosmeticsModalProps> = ({
    lang = 'en',
    equippedSkin,
    equippedTrail,
    unlockedCosmetics,
    newCosmeticIds = [],
    onEquipSkin,
    onEquipTrail,
    onClearNewCosmetics,
    onClose,
}) => {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);

    const skins = COSMETICS_DATA.filter(c => c.kind === 'skin');
    const trails = COSMETICS_DATA.filter(c => c.kind === 'trail');

    const activeSkinObj = skins.find(s => s.id === equippedSkin) || skins[0];
    const activeTrailObj = trails.find(tr => tr.id === equippedTrail) || trails[0];

    useEffect(() => {
        return () => {
            if (onClearNewCosmetics) onClearNewCosmetics();
        };
    }, [onClearNewCosmetics]);

    // Live rotating spark + trail preview on canvas (uses cached GlowSprites, zero per-frame gradients)
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let animId: number;
        let frame = 0;
        const trailHistory: { x: number; y: number }[] = [];
        for (let i = 0; i < 16; i++) {
            trailHistory.push({ x: 90, y: 55 });
        }

        const render = () => {
            frame++;
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            const cx = canvas.width / 2;
            const cy = canvas.height / 2;
            const orbitR = 28;
            const angle = frame * 0.06;
            const px = cx + Math.cos(angle) * orbitR;
            const py = cy + Math.sin(angle * 2) * (orbitR * 0.45);

            // Shift trail history without allocating new arrays
            for (let i = trailHistory.length - 1; i > 0; i--) {
                trailHistory[i].x = trailHistory[i - 1].x;
                trailHistory[i].y = trailHistory[i - 1].y;
            }
            trailHistory[0].x = px;
            trailHistory[0].y = py;

            // Draw trail motes
            const trailSprite = getGlowSprite(activeTrailObj.glowColor, 64);
            for (let i = trailHistory.length - 1; i >= 1; i--) {
                const ratio = 1 - i / trailHistory.length;
                const size = 22 * ratio;
                ctx.globalAlpha = ratio * 0.65;
                ctx.drawImage(
                    trailSprite,
                    trailHistory[i].x - size / 2,
                    trailHistory[i].y - size / 2,
                    size,
                    size
                );
            }

            // Draw spark outer glow
            ctx.globalAlpha = 1;
            const glowSprite = getGlowSprite(activeSkinObj.glowColor, 128);
            ctx.drawImage(glowSprite, px - 26, py - 26, 52, 52);

            // Outer ring
            ctx.strokeStyle = activeSkinObj.ringColor;
            ctx.lineWidth = 1.5;
            ctx.globalAlpha = 0.7;
            ctx.beginPath();
            ctx.arc(px, py, 16 + Math.sin(frame * 0.1) * 2, 0, Math.PI * 2);
            ctx.stroke();

            // Inner core
            ctx.globalAlpha = 1;
            ctx.fillStyle = activeSkinObj.coreColor;
            ctx.beginPath();
            ctx.arc(px, py, 7, 0, Math.PI * 2);
            ctx.fill();

            animId = requestAnimationFrame(render);
        };

        animId = requestAnimationFrame(render);
        return () => cancelAnimationFrame(animId);
    }, [activeSkinObj, activeTrailObj]);

    const renderCard = (item: CosmeticItem) => {
        const isUnlocked = unlockedCosmetics.includes(item.id) || item.id === 'skin_default' || item.id === 'trail_default';
        const isEquipped = (item.kind === 'skin' && equippedSkin === item.id) || (item.kind === 'trail' && equippedTrail === item.id);
        const isNew = newCosmeticIds.includes(item.id);

        return (
            <button
                key={item.id}
                type="button"
                disabled={!isUnlocked}
                onClick={() => {
                    if (!isUnlocked) return;
                    if (item.kind === 'skin') onEquipSkin(item.id);
                    else onEquipTrail(item.id);
                }}
                className={`relative p-3.5 rounded-xl border text-left transition-all flex items-center gap-3 min-h-[64px] ${
                    isEquipped
                        ? 'bg-amber-950/40 border-amber-400 shadow-[0_0_15px_rgba(251,191,36,0.25)]'
                        : isUnlocked
                        ? 'bg-slate-900/80 border-slate-700 hover:border-slate-500 cursor-pointer'
                        : 'bg-slate-950/60 border-slate-800/80 opacity-55 cursor-not-allowed'
                }`}
            >
                {isNew && (
                    <span className="absolute -top-2 -right-2 px-2 py-0.5 rounded-full bg-amber-400 text-black font-tech font-bold text-[9px] tracking-widest uppercase shadow">
                        {t('NEW', lang)}
                    </span>
                )}

                <div
                    className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 border"
                    style={{
                        backgroundColor: isUnlocked ? `${item.glowColor}22` : '#0f172a',
                        borderColor: isUnlocked ? item.ringColor : '#334155',
                        boxShadow: isUnlocked ? `0 0 12px ${item.glowColor}55` : 'none',
                    }}
                >
                    {isUnlocked ? (
                        <div
                            className="w-4 h-4 rounded-full"
                            style={{ backgroundColor: item.coreColor, boxShadow: `0 0 8px ${item.glowColor}` }}
                        />
                    ) : (
                        <Lock size={15} className="text-slate-500" />
                    )}
                </div>

                <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                        <span className="font-tech font-bold text-xs text-white truncate">
                            {t(item.name, lang)}
                        </span>
                        {isEquipped && (
                            <span className="text-[9px] font-mono uppercase tracking-wider text-amber-300 flex items-center gap-0.5 shrink-0">
                                <Check size={11} /> {t('EQUIPPED', lang)}
                            </span>
                        )}
                    </div>
                    <p className="text-[10px] text-slate-400 truncate mt-0.5">
                        {isUnlocked ? t(item.description, lang) : `${t('Unlock:', lang)} ${t(item.unlockHint, lang)}`}
                    </p>
                </div>
            </button>
        );
    };

    return (
        <div className="fixed inset-0 z-[150] bg-black/85 backdrop-blur-md flex items-center justify-center p-4 pointer-events-auto">
            <motion.div
                {...({
                    initial: { opacity: 0, scale: 0.95 },
                    animate: { opacity: 1, scale: 1 },
                    exit: { opacity: 0, scale: 0.95 },
                } as any)}
                className="bg-slate-950 border border-slate-700 rounded-2xl max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden shadow-2xl"
            >
                {/* Header */}
                <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-slate-900/60">
                    <div className="flex items-center gap-2.5">
                        <Sparkles className="text-amber-400" size={20} />
                        <div>
                            <h2 className="font-tech text-lg sm:text-xl text-white font-bold tracking-wider uppercase">
                                {t('SPARK COSMETICS', lang)}
                            </h2>
                            <p className="text-[10px] font-mono text-slate-400 uppercase tracking-widest">
                                {t('Visual customization • Zero gameplay advantage', lang)}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-full bg-slate-800/80 text-slate-400 hover:text-white transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Live Rotating Spark Preview */}
                <div className="bg-black/80 border-b border-slate-800/80 py-3 px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <canvas
                            ref={canvasRef}
                            width={180}
                            height={96}
                            className="rounded-xl border border-slate-800 bg-slate-950"
                        />
                        <div className="text-left space-y-1">
                            <div className="text-[10px] font-mono uppercase tracking-widest text-slate-400">
                                {t('ACTIVE RESONANCE', lang)}
                            </div>
                            <div className="font-tech text-sm text-amber-300 font-bold">
                                {t(activeSkinObj.name, lang)}
                            </div>
                            <div className="font-mono text-xs text-cyan-300">
                                + {t(activeTrailObj.name, lang)}
                            </div>
                        </div>
                    </div>
                    <div className="text-[11px] font-mono text-slate-400">
                        {t('Unlocked:', lang)}{' '}
                        <span className="text-white font-bold">
                            {unlockedCosmetics.length} / {COSMETICS_DATA.length}
                        </span>
                    </div>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-5 custom-scrollbar">
                    <div>
                        <h3 className="font-tech text-xs tracking-[0.2em] uppercase text-amber-400 mb-2.5 flex items-center gap-1.5">
                            <Sparkles size={14} /> {t('SPARK SKINS (6)', lang)}
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                            {skins.map(renderCard)}
                        </div>
                    </div>

                    <div>
                        <h3 className="font-tech text-xs tracking-[0.2em] uppercase text-cyan-400 mb-2.5 flex items-center gap-1.5">
                            <Flame size={14} /> {t('LUMINOUS TRAILS (6)', lang)}
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                            {trails.map(renderCard)}
                        </div>
                    </div>
                </div>
            </motion.div>
        </div>
    );
};

export default CosmeticsModal;
