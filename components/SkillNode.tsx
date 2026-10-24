import React, { useMemo } from 'react';
import { motion, useTransform, useMotionValue } from 'framer-motion';
import * as Icons from 'lucide-react';
import { AbilityNodeData, AbilityType, PlayerStats } from '../types';
import { POWERS } from '../abilityConfig';
import { t } from '../translate';

interface SkillNodeProps {
    lang?: 'en' | 'es';
    data: AbilityNodeData;
    currentLevel: number;
    isAffordable: boolean;
    isRevealed: boolean;
    onUnlock: (id: string) => void;
    currentScale: any;
    isHighlighted?: boolean;
    isRecommended?: boolean;
    playerStats?: PlayerStats | null;
}

const SkillNode: React.FC<SkillNodeProps> = ({
    data,
    currentLevel,
    lang = 'en',
    isAffordable,
    isRevealed,
    onUnlock,
    currentScale,
    isHighlighted = false,
    isRecommended = false,
    playerStats = null,
}) => {
    const IconComponent = (Icons as any)[data.icon] || Icons.Circle;
    const isMajor = data.isMajor;
    const maxLevel = 1;
    const isUnlocked = currentLevel > 0;
    const isMaxed = currentLevel >= maxLevel;
    const currentCost = data.cost;

    const sizeClass = isMajor ? 'w-24 h-24' : 'w-8 h-8';
    const iconSize = isMajor ? 'w-12 h-12' : 'w-4 h-4';

    const safeScale = currentScale || useMotionValue(1);
    const inverseScale = useTransform(safeScale, (s: number) => Math.max(0.5, 1 / Math.max(0.1, s)));

    // Compute fractional progress or before/after power preview
    const previewInfo = useMemo(() => {
        if (!playerStats || !data.statEffect) return null;

        // 1. Check if this node upgrades a major Power
        for (const p of POWERS) {
            const delta = (data.statEffect as any)[p.propName];
            if (typeof delta === 'number' && delta > 0) {
                const curLv = (playerStats as any)[p.propName] || 0;
                const nextLv = curLv + delta;
                const curDmg = curLv === 0 ? 0 : p.damageBase + (curLv - 1) * p.damageScaling;
                const nextDmg = p.damageBase + (nextLv - 1) * p.damageScaling;
                const curCd = curLv === 0 ? p.cooldownBase : Math.max(15, p.cooldownBase - (curLv - 1) * p.cooldownScaling);
                const nextCd = Math.max(15, p.cooldownBase - (nextLv - 1) * p.cooldownScaling);

                return {
                    kind: 'power' as const,
                    curLv,
                    nextLv,
                    curDmg,
                    nextDmg,
                    curCdSec: (curCd / 60).toFixed(2),
                    nextCdSec: (nextCd / 60).toFixed(2),
                };
            }
        }

        // 2. Check fractional Max HP
        if (typeof data.statEffect.maxHealth === 'number' && data.statEffect.maxHealth > 0) {
            const raw = playerStats.maxHealthRaw ?? playerStats.maxHealth;
            const whole = Math.floor(raw + 1e-6);
            const frac = Math.round((raw - whole) * 100) / 100;
            const afterRaw = Math.round((raw + data.statEffect.maxHealth) * 100) / 100;
            return {
                kind: 'fraction' as const,
                label: `${t('Max HP', lang)} ${whole} +${frac.toFixed(1)} → ${afterRaw.toFixed(1)} (${t('next pip at', lang)} ${whole + 1}.0)`,
                pct: Math.min(100, Math.round(frac * 100)),
            };
        }

        // 3. Check fractional Projectile/Orbital Count
        if (typeof data.statEffect.projectileCount === 'number' && data.statEffect.projectileCount > 0) {
            const raw = playerStats.projectileCountRaw ?? playerStats.projectileCount;
            const whole = Math.floor(raw + 1e-6);
            const frac = Math.round((raw - whole) * 100) / 100;
            const afterRaw = Math.round((raw + data.statEffect.projectileCount) * 100) / 100;
            return {
                kind: 'fraction' as const,
                label: `${t('Orbitals', lang)} ${whole} +${frac.toFixed(2)} → ${afterRaw.toFixed(2)} (${t('next at', lang)} ${whole + 1}.0)`,
                pct: Math.min(100, Math.round(frac * 100)),
            };
        }

        return null;
    }, [playerStats, data.statEffect, lang]);

    const handleClick = () => {
        if (isMaxed) return;
        if (isRevealed && isAffordable) {
            onUnlock(data.id);
        }
    };

    const getColors = () => {
        if (isUnlocked) {
            if (data.type === AbilityType.CORE) return 'bg-white border-white shadow-[0_0_30px_rgba(255,255,255,0.9)]';
            if (data.type === AbilityType.OFFENSE) return 'bg-red-950 border-red-500 shadow-[0_0_15px_rgba(239,68,68,0.5)]';
            if (data.type === AbilityType.DEFENSE) return 'bg-blue-950 border-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.5)]';
            return 'bg-amber-950 border-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.5)]';
        }
        if (isRevealed) {
            if (isAffordable)
                return 'bg-slate-900 border-emerald-500/60 shadow-[0_0_12px_rgba(16,185,129,0.4)] cursor-pointer hover:bg-slate-800 hover:border-emerald-400';
            return 'bg-slate-950 border-slate-800 cursor-not-allowed opacity-55';
        }
        return 'bg-slate-950 border-slate-900 opacity-0';
    };

    const getIconColor = () => {
        if (isUnlocked) {
            if (data.type === AbilityType.CORE) return 'text-black';
            return 'text-white';
        }
        if (isRevealed && isAffordable) return 'text-emerald-400';
        return 'text-slate-700';
    };

    if (!isRevealed && !isUnlocked) return null;

    return (
        <motion.div
            className="absolute flex flex-col items-center justify-center group"
            style={{
                left: data.position.x,
                top: data.position.y,
                x: '-50%',
                y: '-50%',
                zIndex: isMajor ? 30 : 20,
            } as any}
        >
            {/* Tooltip with Inverse Scale & Before/After Preview */}
            <motion.div
                className="absolute bottom-full mb-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-50 origin-bottom"
                style={{ scale: inverseScale } as any}
            >
                <div className="bg-black/95 border border-slate-700 p-3 rounded-xl w-64 backdrop-blur-sm shadow-2xl relative z-50 text-left">
                    <div className="flex items-center justify-between gap-2 mb-1">
                        <h3 className={`text-sm font-tech font-bold ${isUnlocked ? 'text-white' : 'text-slate-200'}`}>
                            {t(data.title, lang)}
                        </h3>
                        {isRecommended && !isUnlocked && (
                            <span className="px-1.5 py-0.5 rounded bg-amber-500/20 border border-amber-400/60 text-amber-300 font-mono text-[8px] uppercase font-bold">
                                ★ {t('REC', lang)}
                            </span>
                        )}
                    </div>
                    <p className="text-[10px] text-slate-400 leading-tight mb-2">{t(data.description, lang)}</p>

                    {/* Before / After Power Preview */}
                    {previewInfo?.kind === 'power' && !isUnlocked && (
                        <div className="bg-slate-900/90 border border-slate-800 rounded-lg p-2 mb-2 space-y-1 font-mono text-[9px]">
                            <div className="flex justify-between text-cyan-300">
                                <span>{t('Level:', lang)}</span>
                                <span>
                                    Lv.{previewInfo.curLv} → <strong>Lv.{previewInfo.nextLv}</strong>
                                </span>
                            </div>
                            {previewInfo.nextDmg > 0 && (
                                <div className="flex justify-between text-amber-300">
                                    <span>{t('Damage:', lang)}</span>
                                    <span>
                                        {previewInfo.curDmg} → <strong>{previewInfo.nextDmg}</strong>
                                    </span>
                                </div>
                            )}
                            {Number(previewInfo.nextCdSec) > 0 && (
                                <div className="flex justify-between text-emerald-300">
                                    <span>{t('Cooldown:', lang)}</span>
                                    <span>
                                        {previewInfo.curCdSec}s → <strong>{previewInfo.nextCdSec}s</strong>
                                    </span>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Fractional Pip Progress Preview */}
                    {previewInfo?.kind === 'fraction' && !isUnlocked && (
                        <div className="bg-slate-900/90 border border-slate-800 rounded-lg p-2 mb-2 space-y-1">
                            <div className="text-[9px] font-mono text-amber-200">{previewInfo.label}</div>
                            <div className="w-full h-1.5 bg-slate-950 rounded-full overflow-hidden">
                                <div className="h-full bg-amber-400" style={{ width: `${previewInfo.pct}%` }} />
                            </div>
                        </div>
                    )}

                    <div className="flex justify-between items-center text-[10px] font-mono border-t border-slate-800 pt-1">
                        <span className="text-cyan-400">{data.statBoostDisplay}</span>
                        <span className={isUnlocked ? 'text-emerald-400 font-bold' : 'text-slate-400'}>
                            {isUnlocked ? t('UNLOCKED', lang) : t('LOCKED', lang)}
                        </span>
                    </div>
                    {!isMaxed && (
                        <div className="flex justify-between items-center text-[10px] font-mono mt-1 border-t border-slate-800/50 pt-1">
                            <span className="text-slate-500">{t('Cost:', lang)}</span>
                            <span className={isAffordable ? 'text-green-400 font-bold' : 'text-red-500'}>
                                {currentCost} M
                            </span>
                        </div>
                    )}
                </div>
            </motion.div>

            {/* Recommended or Highlighted Ring */}
            {(isHighlighted || isRecommended) && !isUnlocked && (
                <motion.div
                    className="absolute -inset-3 rounded-full border-2 border-amber-400 animate-pulse shadow-[0_0_20px_#fbbf24] pointer-events-none z-40"
                    animate={{ scale: [1, 1.15, 1] }}
                    transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' }}
                />
            )}

            {/* Affordable Glow Layer */}
            {isRevealed && !isMaxed && isAffordable && (
                <div
                    className="absolute inset-0 rounded-full pointer-events-none animate-pulse"
                    style={{ boxShadow: '0 0 18px rgba(16,185,129,0.55)' }}
                />
            )}

            {/* Main Node Button */}
            <button
                type="button"
                onClick={handleClick}
                className={`relative ${sizeClass} rounded-full border-2 flex items-center justify-center transition-transform duration-200 active:scale-95 overflow-hidden ${getColors()}`}
            >
                <IconComponent
                    className={`relative z-10 ${iconSize} transition-colors duration-200 ${getIconColor()}`}
                    strokeWidth={isMajor ? 2.5 : 1.5}
                />
            </button>

            {isMajor && (
                <motion.div
                    className={`mt-2 text-[10px] font-tech tracking-wider uppercase font-bold text-center w-32 truncate ${
                        isUnlocked ? 'text-white opacity-90' : 'text-slate-500 opacity-75'
                    }`}
                    style={{ scale: inverseScale } as any}
                >
                    {t(data.title, lang)}
                </motion.div>
            )}
        </motion.div>
    );
};

export default SkillNode;
