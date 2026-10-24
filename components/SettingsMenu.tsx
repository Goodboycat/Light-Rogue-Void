
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Smartphone, MousePointer2, ToggleLeft, ToggleRight, Trash2, AlertTriangle, BookOpen, Sparkles, Check, Key, Lock, Shield, Zap, Move, RotateCcw, FastForward, Sun } from 'lucide-react';
import { Settings, GameState, PlayerStats, MobileControlLayout } from '../types';
import { t } from '../translate';
import GuidebookModal from './GuidebookModal';
import { useIsPC } from '../hooks/useIsPC';
import { setTelemetryOptOut } from '../utils/telemetry';

interface SettingsMenuProps {
    settings: Settings;
    onUpdateSettings: (newSettings: Settings) => void;
    onClose: () => void;
    onDeleteSave: () => void;
    /* PATCH: STEP-6/7 progressive-guidebook — context for progressive entries */
    gameState?: GameState;
    playerStats?: PlayerStats | null;
    onUnlockAllPlaces?: () => void;
}

const SettingsMenu: React.FC<SettingsMenuProps> = ({ settings, onUpdateSettings, onClose, onDeleteSave, gameState, playerStats = null, onUnlockAllPlaces }) => {
    const [confirmDelete, setConfirmDelete] = useState(false);
    const [showGuide, setShowGuide] = useState(false);
    const [showLayoutEditor, setShowLayoutEditor] = useState(false);
    const [unlockedFeedback, setUnlockedFeedback] = useState(false);
    const isPC = useIsPC();
    
    const lang = settings.language || 'en';

    const update = (key: keyof Settings, value: any) => {
        onUpdateSettings({ ...settings, [key]: value });
    };

    const handleUnlockAllClick = () => {
        if (onUnlockAllPlaces) {
            onUnlockAllPlaces();
            setUnlockedFeedback(true);
            setTimeout(() => {
                setUnlockedFeedback(false);
            }, 3000);
        }
    };

    const handleDeleteClick = () => {
        if (confirmDelete) {
            onDeleteSave();
        } else {
            setConfirmDelete(true);
        }
    };

    return (
        <div className="fixed inset-0 z-[80] bg-slate-950/90 backdrop-blur-xl flex items-center justify-center p-4">
            <motion.div 
                {...({
                    initial: { opacity: 0, scale: 0.95 },
                    animate: { opacity: 1, scale: 1 },
                    exit: { opacity: 0, scale: 0.95 }
                } as any)}
                className="w-full max-w-lg bg-slate-900 border border-slate-700 rounded-xl shadow-2xl overflow-hidden"
            >
                <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-950/50">
                    <h2 className="text-2xl font-tech font-bold text-white tracking-widest">{t('SYSTEM SETTINGS', lang)}</h2>
                    <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors">
                        <X size={24} />
                    </button>
                </div>

                <div className="p-8 space-y-8 max-h-[70vh] overflow-y-auto custom-scrollbar">
                    
                    {/* LANGUAGE SELECTOR */}
                    <div className="space-y-4 border-b border-slate-800/60 pb-6">
                        <label className="text-xs font-mono text-blue-400 uppercase tracking-widest block mb-2">{t('Language', lang)}</label>
                        <div className="grid grid-cols-2 gap-2 bg-slate-950 p-2 rounded-xl border border-slate-800">
                            {[
                                { key: 'en', code: 'EN', name: 'English' },
                                { key: 'es', code: 'ES', name: 'Español' }
                            ].map(({ key, code, name }) => (
                                <button
                                    key={key}
                                    type="button"
                                    onClick={() => {
                                        update('language', key);
                                        try {
                                            const w = window as any;
                                            if (typeof w.setLanguage === 'function') w.setLanguage(key);
                                            localStorage.setItem('lrv_lang', key);
                                        } catch (e) { /* no-op */ }
                                    }}
                                    className={`py-3 px-4 rounded-lg font-tech text-xs tracking-wider transition-all flex items-center justify-center gap-3 border ${
                                        (settings.language || 'en') === key
                                            ? 'bg-purple-900/40 border-purple-500 text-white shadow-[0_0_15px_rgba(168,85,247,0.3)]'
                                            : 'bg-slate-900/50 border-transparent text-slate-500 hover:text-slate-300 hover:border-slate-800'
                                    }`}
                                >
                                    <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                                        (settings.language || 'en') === key 
                                            ? 'bg-purple-500 text-white' 
                                            : 'bg-slate-800 text-slate-400'
                                    }`}>
                                        {code}
                                    </span>
                                    <span>{name}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* DIFFICULTY SELECTOR */}
                    <div className="space-y-4 border-b border-slate-800/60 pb-6">
                        <label className="text-xs font-mono text-amber-400 uppercase tracking-widest block mb-2">{t('DIFFICULTY', lang)}</label>
                        <div className="grid grid-cols-3 gap-2 bg-slate-950 p-2 rounded-xl border border-slate-800">
                            {[
                                { id: 'chill', label: 'Chill', desc: '0.7x HP • Max 1 Dmg/Hit • 0.8x Essence' },
                                { id: 'normal', label: 'Normal', desc: '1.0x HP • Standard Challenge' },
                                { id: 'brutal', label: 'Brutal', desc: '1.3x HP • 1.1x Proj Speed • 1.5x Essence' }
                            ].map(({ id, label, desc }) => {
                                const isSelected = (settings.difficulty || 'normal') === id;
                                const hasUnlockedBrutal = (gameState?.defeatedBosses && gameState.defeatedBosses.length > 0) || (gameState?.maxWaveReached && gameState.maxWaveReached >= 10);
                                const isLocked = id === 'brutal' && !hasUnlockedBrutal;
                                return (
                                    <button
                                        key={id}
                                        type="button"
                                        disabled={isLocked}
                                        onClick={() => {
                                            if (!isLocked) update('difficulty', id);
                                        }}
                                        className={`py-3 px-2 rounded-lg font-tech text-xs tracking-wider transition-all flex flex-col items-center justify-center gap-1 border ${
                                            isLocked
                                                ? 'opacity-40 bg-slate-900/30 border-slate-800 text-slate-600 cursor-not-allowed'
                                                : isSelected
                                                ? 'bg-amber-900/40 border-amber-500 text-white shadow-[0_0_15px_rgba(245,158,11,0.3)]'
                                                : 'bg-slate-900/50 border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-800'
                                        }`}
                                    >
                                        <div className="flex items-center gap-1 font-bold">
                                            {isLocked && <Lock size={12} className="text-slate-500" />}
                                            <span>{t(label, lang)}</span>
                                        </div>
                                        <span className="text-[9px] font-mono text-slate-500 text-center leading-tight">
                                            {isLocked ? t('Kill 1 Boss', lang) : t(desc, lang)}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                    <div className="space-y-4 border-b border-slate-800/60 pb-6">
                        <label className="text-xs font-mono text-cyan-400 uppercase tracking-widest block mb-2">{t("Game Guide", lang)}</label>
                        <button
                            onClick={() => setShowGuide(true)}
                            className="w-full flex items-center justify-between p-4 rounded-xl border border-cyan-500/30 bg-cyan-950/15 hover:bg-cyan-900/10 text-cyan-400 hover:border-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.1)] transition-all cursor-pointer"
                        >
                            <div className="flex items-center gap-4">
                                <BookOpen size={20} className="text-cyan-400 animate-pulse" />
                                <span className="font-tech text-sm tracking-wider uppercase font-bold text-left">{t("COSMIC GUIDEBOOK", lang)}</span>
                            </div>
                            <span className="font-mono text-xs text-cyan-400 bg-cyan-950/30 border border-cyan-800/50 px-2.5 py-1 rounded">{t("READ", lang)}</span>
                        </button>
                    </div>

                    {/* CONTROLS */}
                    <div className="space-y-4">
                        <label className="text-xs font-mono text-purple-400 uppercase tracking-widest block mb-2">{t("Control Interface", lang)}</label>
                        
                        <div className="space-y-3">
                            <ToggleRow 
                                label={isPC ? "Touch Buttons to move (Auto-hidden on PC)" : "Touch Buttons to move"}
                                icon={<Smartphone size={20} />}
                                active={settings.showTouchControls}
                                onToggle={() => update('showTouchControls', !settings.showTouchControls)}
                                lang={lang}
                            />
                            
                            <ToggleRow 
                                label={!isPC ? "Pointer Mouse moves player (Disabled on mobile)" : "Pointer Mouse moves player"}
                                icon={<MousePointer2 size={20} />}
                                active={isPC ? settings.mouseMovementEnabled : false}
                                onToggle={() => {
                                    if (isPC) update('mouseMovementEnabled', !settings.mouseMovementEnabled);
                                }}
                                lang={lang}
                            />

                            <ToggleRow 
                                label={t("Auto-aim starter pulse", lang)}
                                icon={<Sparkles size={20} />}
                                active={settings.autoAimStarterPulse !== false}
                                onToggle={() => update('autoAimStarterPulse', !(settings.autoAimStarterPulse !== false))}
                                lang={lang}
                            />

                            <ToggleRow 
                                label={t("Auto-aim abilities (One-Thumb Play when aim stick idle)", lang)}
                                icon={<Zap size={20} />}
                                active={settings.autoAimTouch !== undefined ? settings.autoAimTouch : !isPC}
                                onToggle={() => {
                                    const current = settings.autoAimTouch !== undefined ? settings.autoAimTouch : !isPC;
                                    update('autoAimTouch', !current);
                                }}
                                lang={lang}
                            />

                            <ToggleRow 
                                label={t("Floating Move Joystick (Appears where thumb lands)", lang)}
                                icon={<Smartphone size={20} />}
                                active={settings.floatingJoystick === true}
                                onToggle={() => update('floatingJoystick', !settings.floatingJoystick)}
                                lang={lang}
                            />

                            <ToggleRow 
                                label={t("Double-tap Move Stick to Dash", lang)}
                                icon={<FastForward size={20} />}
                                active={settings.doubleTapDash !== false}
                                onToggle={() => update('doubleTapDash', !(settings.doubleTapDash !== false))}
                                lang={lang}
                            />

                            <ToggleRow 
                                label={t("Left-Handed Controls Swap", lang)}
                                icon={<Smartphone size={20} />}
                                active={settings.leftHandedControls === true}
                                onToggle={() => update('leftHandedControls', !settings.leftHandedControls)}
                                lang={lang}
                            />

                            {/* Mobile Controls Size (70% - 140%), Opacity, & Drag Layout Editor */}
                            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-4">
                                <div>
                                    <div className="flex justify-between text-xs font-tech text-slate-300 mb-1.5">
                                        <span>{t('Touch Button Size', lang)}</span>
                                        <span className="font-mono text-purple-400">{settings.controlScale ?? 100}%</span>
                                    </div>
                                    <input
                                        type="range"
                                        min="70" max="140" step="5"
                                        value={settings.controlScale ?? 100}
                                        onChange={(e) => update('controlScale', parseInt(e.target.value, 10))}
                                        className="w-full accent-purple-500 h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer"
                                    />
                                </div>

                                <div>
                                    <div className="flex justify-between text-xs font-tech text-slate-300 mb-1.5">
                                        <span>{t('Touch Button Opacity', lang)}</span>
                                        <span className="font-mono text-purple-400">{settings.controlOpacity ?? 85}%</span>
                                    </div>
                                    <input
                                        type="range"
                                        min="25" max="100" step="5"
                                        value={settings.controlOpacity ?? 85}
                                        onChange={(e) => update('controlOpacity', parseInt(e.target.value, 10))}
                                        className="w-full accent-purple-500 h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer"
                                    />
                                </div>

                                <div className="flex gap-2 pt-1">
                                    <button
                                        type="button"
                                        onClick={() => setShowLayoutEditor(true)}
                                        className="flex-1 py-2.5 px-3 rounded-lg bg-purple-950/50 hover:bg-purple-900/60 border border-purple-500/40 text-purple-200 font-tech text-xs tracking-wider uppercase flex items-center justify-center gap-2 transition-all cursor-pointer"
                                    >
                                        <Move size={15} />
                                        <span>{t('EDIT BUTTON LAYOUT', lang)}</span>
                                    </button>
                                    {settings.mobileControlLayout && (
                                        <button
                                            type="button"
                                            onClick={() => update('mobileControlLayout', undefined)}
                                            className="py-2.5 px-3 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 font-mono text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                                            title={t('Reset Layout', lang)}
                                        >
                                            <RotateCcw size={14} />
                                            <span>{t('Reset', lang)}</span>
                                        </button>
                                    )}
                                </div>
                            </div>

                            <ToggleRow 
                                label={t("Fast waves", lang)}
                                icon={<Zap size={20} />}
                                active={settings.fastWaves === true}
                                onToggle={() => update('fastWaves', !settings.fastWaves)}
                                lang={lang}
                            />

                            <ToggleRow 
                                label={t("Threat arrows", lang)}
                                icon={<AlertTriangle size={20} />}
                                active={settings.threatArrows !== false}
                                onToggle={() => update('threatArrows', !(settings.threatArrows !== false))}
                                lang={lang}
                            />

                            {/* Adaptive Camera Zoom Slider */}
                            <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-2">
                                <div className="flex justify-between items-center text-xs font-tech text-slate-300">
                                    <span>{t('Camera Zoom', lang)}</span>
                                    <div className="flex items-center gap-2">
                                        <span className="font-mono text-cyan-400">
                                            {!settings.cameraZoom || settings.cameraZoom === 0
                                                ? t('AUTO (Adaptive)', lang)
                                                : `${Math.round(settings.cameraZoom * 100)}%`}
                                        </span>
                                        {!!settings.cameraZoom && settings.cameraZoom !== 0 && (
                                            <button
                                                type="button"
                                                onClick={() => update('cameraZoom', 0)}
                                                className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-cyan-300"
                                            >
                                                {t('Auto', lang)}
                                            </button>
                                        )}
                                    </div>
                                </div>
                                <input
                                    type="range"
                                    min="0.65" max="1.10" step="0.05"
                                    value={settings.cameraZoom && settings.cameraZoom > 0 ? settings.cameraZoom : 0.85}
                                    onChange={(e) => update('cameraZoom', parseFloat(e.target.value))}
                                    className="w-full accent-cyan-500 h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer"
                                />
                                <p className="text-[10px] text-slate-500 font-mono">
                                    {t('Auto scales out on short/narrow screens so at least 920×540 world units stay visible.', lang)}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* AUDIO SETTINGS */}
                    <div className="space-y-4">
                        <label className="text-xs font-mono text-cyan-400 uppercase tracking-widest block mb-2">{t("Audio", lang)}</label>
                        <div className="space-y-4 bg-slate-950 p-4 rounded-xl border border-slate-800">
                            <div>
                                <div className="flex justify-between text-xs font-tech text-slate-400 mb-2">
                                    <span>{t('Master Volume', lang)}</span>
                                    <span>{Math.round(settings.masterVolume * 100)}%</span>
                                </div>
                                <input 
                                    type="range" 
                                    min="0" max="1" step="0.05" 
                                    value={settings.masterVolume}
                                    onChange={(e) => update('masterVolume', parseFloat(e.target.value))}
                                    className="w-full accent-cyan-500 h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer"
                                />
                            </div>
                            <div>
                                <div className="flex justify-between text-xs font-tech text-slate-400 mb-2">
                                    <span>{t('Music Volume', lang)}</span>
                                    <span>{Math.round(settings.musicVolume * 100)}%</span>
                                </div>
                                <input 
                                    type="range" 
                                    min="0" max="1" step="0.05" 
                                    value={settings.musicVolume}
                                    onChange={(e) => update('musicVolume', parseFloat(e.target.value))}
                                    className="w-full accent-cyan-500 h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer"
                                />
                            </div>
                            <div>
                                <div className="flex justify-between text-xs font-tech text-slate-400 mb-2">
                                    <span>{t('SFX Volume', lang)}</span>
                                    <span>{Math.round(settings.sfxVolume * 100)}%</span>
                                </div>
                                <input 
                                    type="range" 
                                    min="0" max="1" step="0.05" 
                                    value={settings.sfxVolume}
                                    onChange={(e) => update('sfxVolume', parseFloat(e.target.value))}
                                    className="w-full accent-cyan-500 h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer"
                                />
                            </div>
                        </div>
                    </div>

                    {/* PERFORMANCE MODE */}
                    <div className="space-y-4">
                        <label className="text-xs font-mono text-emerald-400 uppercase tracking-widest block mb-2">{t("Performance & Visuals", lang)}</label>
                        <div className="grid grid-cols-3 gap-2">
                            {['LOW', 'MEDIUM', 'HIGH'].map((mode) => (
                                <button
                                    key={mode}
                                    onClick={() => update('performanceMode', mode)}
                                    className={`py-3 px-2 rounded-lg border font-tech text-xs tracking-wider transition-all
                                        ${settings.performanceMode === mode 
                                            ? 'bg-emerald-900/20 border-emerald-500 text-white shadow-[0_0_10px_rgba(16,185,129,0.3)]' 
                                            : 'bg-slate-950 border-slate-800 text-slate-500 hover:border-slate-600'}
                                    `}
                                >
                                    {t(mode, lang)}
                                </button>
                            ))}
                        </div>
                        <p className="text-[10px] text-slate-500 text-center">
                            {t("Adjusts background star density. Use LOW for older devices.", lang)}
                        </p>

                        {/* Background Dim Slider (0-60%) */}
                        <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-2">
                            <div className="flex justify-between text-xs font-tech text-slate-300">
                                <span>{t('Background Dim', lang)}</span>
                                <span className="font-mono text-emerald-400">{Math.round((settings.backgroundDim ?? 0.2) * 100)}%</span>
                            </div>
                            <input
                                type="range"
                                min="0" max="0.6" step="0.05"
                                value={settings.backgroundDim ?? 0.2}
                                onChange={(e) => update('backgroundDim', parseFloat(e.target.value))}
                                className="w-full accent-emerald-500 h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer"
                            />
                            <p className="text-[10px] text-slate-500 font-mono">
                                {t('Dims background art for bullet readability (+15% automatic dim during boss fights).', lang)}
                            </p>
                        </div>
                    </div>

                    {/* HAPTICS & ACCESSIBILITY */}
                    <div className="space-y-4 pt-4 border-t border-slate-800/80">
                        <label className="text-xs font-mono text-cyan-400 uppercase tracking-widest block mb-2">{t("Haptics & Accessibility", lang)}</label>

                        {/* Haptics: Off / Light / Full */}
                        <div className="space-y-2 bg-slate-950 p-3 rounded-xl border border-slate-800">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-tech text-slate-300 font-bold uppercase tracking-wider">{t("Haptics", lang)}</span>
                                <span className="text-[10px] font-mono text-cyan-400 font-bold px-2 py-0.5 rounded bg-cyan-950/40 border border-cyan-800/40">
                                    {t(settings.haptics || 'FULL', lang)}
                                </span>
                            </div>
                            <div className="grid grid-cols-3 gap-2">
                                {(['OFF', 'LIGHT', 'FULL'] as const).map((level) => (
                                    <button
                                        key={level}
                                        type="button"
                                        onClick={() => update('haptics', level)}
                                        className={`py-2 px-2 rounded-lg border font-tech text-xs tracking-wider transition-all
                                            ${(settings.haptics || 'FULL') === level
                                                ? 'bg-cyan-900/30 border-cyan-500 text-cyan-200 shadow-[0_0_10px_rgba(34,211,238,0.25)] font-bold'
                                                : 'bg-slate-900 border-slate-800 text-slate-500 hover:border-slate-700 hover:text-slate-300'}
                                        `}
                                    >
                                        {t(level, lang)}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Reduce Shake Slider (0-100%) */}
                        <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-2">
                            <div className="flex justify-between text-xs font-tech text-slate-300">
                                <span>{t('Reduce Shake', lang)}</span>
                                <span className="font-mono text-cyan-400">{Math.round((settings.reduceShake ?? 0) * 100)}%</span>
                            </div>
                            <input
                                type="range"
                                min="0" max="1" step="0.1"
                                value={settings.reduceShake ?? 0}
                                onChange={(e) => update('reduceShake', parseFloat(e.target.value))}
                                className="w-full accent-cyan-500 h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer"
                            />
                        </div>

                        <div className="space-y-2.5">
                            <ToggleRow
                                label="Reduce Flashes (Max 20% Alpha)"
                                icon={<Shield size={20} />}
                                active={settings.reduceFlashes === true}
                                onToggle={() => update('reduceFlashes', !settings.reduceFlashes)}
                                lang={lang}
                            />
                            <ToggleRow
                                label="Colorblind-Safe Enemy Bullets (Shape + Outline)"
                                icon={<Sparkles size={20} />}
                                active={settings.colorblindMode === true}
                                onToggle={() => update('colorblindMode', !settings.colorblindMode)}
                                lang={lang}
                            />
                            <ToggleRow
                                label="High-Contrast Enemy Bullets"
                                icon={<AlertTriangle size={20} />}
                                active={settings.highContrastBullets === true}
                                onToggle={() => update('highContrastBullets', !settings.highContrastBullets)}
                                lang={lang}
                            />
                            <ToggleRow
                                label="Player Center Hitbox Dot"
                                icon={<Smartphone size={20} />}
                                active={settings.showHitboxDot !== undefined ? settings.showHitboxDot : settings.showTouchControls}
                                onToggle={() => {
                                    const current = settings.showHitboxDot !== undefined ? settings.showHitboxDot : settings.showTouchControls;
                                    update('showHitboxDot', !current);
                                }}
                                lang={lang}
                            />
                        </div>
                    </div>

                    {/* TEXT SIZING ACCESSIBILITY */}
                    <div className="space-y-4 pt-4 border-t border-slate-800/80">
                        <label className="text-xs font-mono text-amber-400 uppercase tracking-widest block mb-2">{t("Text Size Settings", lang)}</label>
                        
                        {/* Dialogue Text Size */}
                        <div className="space-y-2 bg-slate-950 p-3 rounded-xl border border-slate-800">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-tech text-slate-300 font-bold uppercase tracking-wider">{t("Dialogue Text Size", lang)}</span>
                                <span className="text-[10px] font-mono text-amber-400 font-bold px-2 py-0.5 rounded bg-amber-950/40 border border-amber-800/40">
                                    {t(settings.dialogueTextSize || 'NORMAL', lang)}
                                </span>
                            </div>
                            <div className="grid grid-cols-3 gap-2">
                                {(['NORMAL', 'LARGE', 'HUGE'] as const).map((size) => (
                                    <button
                                        key={size}
                                        type="button"
                                        onClick={() => update('dialogueTextSize', size)}
                                        className={`py-2 px-2 rounded-lg border font-tech text-xs tracking-wider transition-all
                                            ${(settings.dialogueTextSize || 'NORMAL') === size 
                                                ? 'bg-amber-900/30 border-amber-500 text-amber-200 shadow-[0_0_10px_rgba(245,158,11,0.25)] font-bold' 
                                                : 'bg-slate-900 border-slate-800 text-slate-500 hover:border-slate-700 hover:text-slate-300'}
                                        `}
                                    >
                                        {t(size, lang)}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* General UI Text Size */}
                        <div className="space-y-2 bg-slate-950 p-3 rounded-xl border border-slate-800">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-tech text-slate-300 font-bold uppercase tracking-wider">{t("General UI Text Size", lang)}</span>
                                <span className="text-[10px] font-mono text-cyan-400 font-bold px-2 py-0.5 rounded bg-cyan-950/40 border border-cyan-800/40">
                                    {t(settings.uiTextSize || 'NORMAL', lang)}
                                </span>
                            </div>
                            <div className="grid grid-cols-3 gap-2">
                                {(['NORMAL', 'LARGE', 'HUGE'] as const).map((size) => (
                                    <button
                                        key={size}
                                        type="button"
                                        onClick={() => update('uiTextSize', size)}
                                        className={`py-2 px-2 rounded-lg border font-tech text-xs tracking-wider transition-all
                                            ${(settings.uiTextSize || 'NORMAL') === size 
                                                ? 'bg-cyan-900/30 border-cyan-500 text-cyan-200 shadow-[0_0_10px_rgba(34,211,238,0.25)] font-bold' 
                                                : 'bg-slate-900 border-slate-800 text-slate-500 hover:border-slate-700 hover:text-slate-300'}
                                        `}
                                    >
                                        {t(size, lang)}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* ADMIN / DEV TOOLS (TEMPORARY) */}
                    <div className="space-y-4 pt-6 border-t border-slate-800">
                        <div className="flex items-center justify-between">
                            <label className="text-xs font-mono text-amber-400 uppercase tracking-widest block">
                                {t("Admin Tools (Temporary)", lang)}
                            </label>
                            <span className="text-[9px] font-mono font-bold text-amber-400/80 bg-amber-950/60 border border-amber-800/60 px-2 py-0.5 rounded">
                                ADMIN
                            </span>
                        </div>
                        
                        <div className="space-y-2 bg-gradient-to-b from-amber-950/20 to-purple-950/20 p-4 rounded-xl border border-amber-500/30 shadow-[0_0_15px_rgba(245,158,11,0.08)]">
                            <button
                                type="button"
                                onClick={handleUnlockAllClick}
                                className={`w-full py-3.5 px-4 rounded-xl font-tech text-xs tracking-widest uppercase transition-all flex items-center justify-center gap-2.5 font-bold cursor-pointer border ${
                                    unlockedFeedback
                                        ? 'bg-emerald-600 border-emerald-400 text-white shadow-[0_0_20px_rgba(16,185,129,0.5)]'
                                        : 'bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 hover:from-amber-400 hover:to-yellow-300 border-amber-300 text-slate-950 shadow-[0_0_20px_rgba(245,158,11,0.3)] active:scale-98'
                                }`}
                            >
                                {unlockedFeedback ? (
                                    <>
                                        <Check size={16} className="text-white animate-bounce" />
                                        <span>{t("ALL PLACES UNLOCKED!", lang)}</span>
                                    </>
                                ) : (
                                    <>
                                        <Sparkles size={16} className="text-slate-950 fill-slate-950" />
                                        <span>{t("UNLOCK ALL PLACES (FINISHED GAME)", lang)}</span>
                                    </>
                                )}
                            </button>
                            <p className="text-[10px] text-amber-200/70 text-center font-mono leading-relaxed mt-2">
                                {t("Instantly unlocks all 6 sectors, all special missions, all secret vaults, all essence caches, and finished-game cosmic progress.", lang)}
                            </p>
                        </div>
                    </div>

                    {/* PRIVACY & TELEMETRY */}
                    <div className="space-y-4 pt-6 border-t border-slate-800">
                        <label className="text-xs font-mono text-cyan-400 uppercase tracking-widest block mb-2">{t("Privacy & Telemetry", lang)}</label>
                        <ToggleRow 
                            label={t("Share anonymous play data", lang)}
                            icon={<Sparkles size={20} />}
                            active={settings.shareTelemetry !== false}
                            onToggle={() => {
                                const nextVal = !(settings.shareTelemetry !== false);
                                update('shareTelemetry', nextVal);
                                setTelemetryOptOut(!nextVal);
                            }}
                            lang={lang}
                        />
                        <p className="text-[10px] text-slate-500 font-mono text-center">
                            {t("Anonymous data helps balance wave difficulty and track performance.", lang)}
                        </p>
                    </div>

                    {/* DATA MANAGEMENT */}
                    <div className="space-y-4 pt-6 border-t border-slate-800">
                        <label className="text-xs font-mono text-slate-400 uppercase tracking-widest block mb-2">{t("Data Management", lang)}</label>
                        <button
                            onClick={handleDeleteClick}
                            className={`w-full py-4 border rounded-xl font-tech text-sm tracking-widest transition-all flex items-center justify-center gap-3
                                ${confirmDelete 
                                    ? 'bg-red-600 border-red-500 text-white hover:bg-red-700 animate-pulse' 
                                    : 'bg-slate-950 border-red-900/50 text-red-500 hover:bg-red-950/30 hover:border-red-500 hover:text-red-400'
                                }
                            `}
                        >
                            {confirmDelete ? (
                                <>
                                    <AlertTriangle size={18} />
                                    {t("CONFIRM DELETION", lang)}
                                </>
                            ) : (
                                <>
                                    <Trash2 size={18} />
                                    {t("DELETE ALL SAVE DATA", lang)}
                                </>
                            )}
                        </button>
                        {confirmDelete && (
                            <p className="text-[10px] text-red-400 text-center font-mono">
                                {t("This action cannot be undone. The game will reload.", lang)}
                            </p>
                        )}
                    </div>

                </div>
            </motion.div>

            <AnimatePresence>
                {showGuide && gameState && (
                    <GuidebookModal
                        onClose={() => setShowGuide(false)}
                        gameState={gameState}
                        stats={playerStats}
                    />
                )}
                {showGuide && !gameState && (
                    /* Safety fallback: shouldn't happen post-patch, but keeps the modal callable even without full context. */
                    <div className="fixed inset-0 z-[110] bg-slate-950/95 flex items-center justify-center p-4">
                        <button onClick={() => setShowGuide(false)} className="px-4 py-2 bg-slate-800 text-white rounded">{t("Close", lang)}</button>
                    </div>
                )}
                {showLayoutEditor && (
                    <MobileLayoutEditorModal
                        settings={settings}
                        onSave={(newLayout, scale, opacity, leftHanded) => {
                            onUpdateSettings({
                                ...settings,
                                mobileControlLayout: newLayout,
                                controlScale: scale,
                                controlOpacity: opacity,
                                leftHandedControls: leftHanded
                            });
                            setShowLayoutEditor(false);
                        }}
                        onClose={() => setShowLayoutEditor(false)}
                        lang={lang}
                    />
                )}
            </AnimatePresence>
        </div>
    );
};

interface LayoutEditorProps {
    settings: Settings;
    onSave: (layout: MobileControlLayout | undefined, scale: number, opacity: number, leftHanded: boolean) => void;
    onClose: () => void;
    lang: 'en' | 'es';
}

const DEFAULT_POSITIONS = (leftHanded: boolean): Required<MobileControlLayout> => ({
    move: { xPct: leftHanded ? 82 : 18, yPct: 78 },
    aim: { xPct: leftHanded ? 18 : 82, yPct: 80 },
    dash: { xPct: leftHanded ? 14 : 86, yPct: 54 },
    beam: { xPct: leftHanded ? 30 : 70, yPct: 58 },
    tree: { xPct: leftHanded ? 86 : 14, yPct: 50 },
});

const MobileLayoutEditorModal: React.FC<LayoutEditorProps> = ({ settings, onSave, onClose, lang }) => {
    const [leftHanded, setLeftHanded] = useState<boolean>(!!settings.leftHandedControls);
    const [scale, setScale] = useState<number>(settings.controlScale ?? 100);
    const [opacity, setOpacity] = useState<number>(settings.controlOpacity ?? 85);
    const [layout, setLayout] = useState<Required<MobileControlLayout>>(() => {
        const defs = DEFAULT_POSITIONS(!!settings.leftHandedControls);
        return {
            move: settings.mobileControlLayout?.move || defs.move,
            aim: settings.mobileControlLayout?.aim || defs.aim,
            dash: settings.mobileControlLayout?.dash || defs.dash,
            beam: settings.mobileControlLayout?.beam || defs.beam,
            tree: settings.mobileControlLayout?.tree || defs.tree,
        };
    });
    const [draggingKey, setDraggingKey] = useState<keyof MobileControlLayout | null>(null);

    const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
        if (!draggingKey) return;
        const rect = e.currentTarget.getBoundingClientRect();
        const xPct = Math.max(6, Math.min(94, ((e.clientX - rect.left) / Math.max(1, rect.width)) * 100));
        const yPct = Math.max(12, Math.min(92, ((e.clientY - rect.top) / Math.max(1, rect.height)) * 100));
        setLayout((prev) => ({
            ...prev,
            [draggingKey]: { xPct: Math.round(xPct * 10) / 10, yPct: Math.round(yPct * 10) / 10 },
        }));
    };

    const handleSwapHandedness = () => {
        const nextLeft = !leftHanded;
        setLeftHanded(nextLeft);
        setLayout(DEFAULT_POSITIONS(nextLeft));
    };

    const handleReset = () => {
        setLayout(DEFAULT_POSITIONS(leftHanded));
        setScale(100);
        setOpacity(85);
    };

    const sFactor = scale / 100;
    const oFactor = opacity / 100;

    return (
        <div
            className="fixed inset-0 z-[130] bg-slate-950/95 backdrop-blur-md select-none touch-none overflow-hidden"
            onPointerMove={handlePointerMove}
            onPointerUp={() => setDraggingKey(null)}
            onPointerCancel={() => setDraggingKey(null)}
        >
            {/* Top Control Bar */}
            <div className="absolute top-3 left-1/2 -translate-x-1/2 z-20 w-[94vw] max-w-xl bg-slate-900/95 border border-purple-500/40 rounded-2xl p-3 shadow-2xl flex flex-col gap-2">
                <div className="flex items-center justify-between gap-2">
                    <span className="font-tech text-xs font-bold text-purple-300 tracking-wider uppercase">
                        {t('DRAG BUTTONS TO REPOSITION', lang)}
                    </span>
                    <div className="flex items-center gap-1.5">
                        <button
                            type="button"
                            onClick={handleSwapHandedness}
                            className={`px-2.5 py-1 rounded-lg font-mono text-[10px] border transition-all ${
                                leftHanded
                                    ? 'bg-purple-900/50 border-purple-400 text-white'
                                    : 'bg-slate-800 border-slate-700 text-slate-300'
                            }`}
                        >
                            {leftHanded ? t('LEFT-HANDED', lang) : t('RIGHT-HANDED', lang)}
                        </button>
                        <button
                            type="button"
                            onClick={handleReset}
                            className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 font-mono text-[10px]"
                        >
                            {t('Reset', lang)}
                        </button>
                        <button
                            type="button"
                            onClick={() => onSave(layout, scale, opacity, leftHanded)}
                            className="px-3 py-1 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-tech font-bold text-xs tracking-wider uppercase"
                        >
                            {t('SAVE', lang)}
                        </button>
                        <button
                            type="button"
                            onClick={onClose}
                            className="p-1 text-slate-400 hover:text-white"
                        >
                            <X size={18} />
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-3 text-[10px] font-mono text-slate-300">
                    <div className="flex items-center gap-2">
                        <span className="shrink-0">{t('Size', lang)} {scale}%</span>
                        <input
                            type="range"
                            min="70"
                            max="140"
                            step="5"
                            value={scale}
                            onChange={(e) => setScale(parseInt(e.target.value, 10))}
                            className="w-full accent-purple-500 h-1.5 bg-slate-800 rounded appearance-none"
                        />
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="shrink-0">{t('Opacity', lang)} {opacity}%</span>
                        <input
                            type="range"
                            min="25"
                            max="100"
                            step="5"
                            value={opacity}
                            onChange={(e) => setOpacity(parseInt(e.target.value, 10))}
                            className="w-full accent-purple-500 h-1.5 bg-slate-800 rounded appearance-none"
                        />
                    </div>
                </div>
            </div>

            {/* Draggable Items */}
            {(
                [
                    { key: 'move', label: 'MOVE', sizePx: 112, color: 'border-purple-400 bg-purple-900/30 text-purple-200' },
                    { key: 'aim', label: 'AIM', sizePx: 112, color: 'border-cyan-400 bg-cyan-900/30 text-cyan-200' },
                    { key: 'dash', label: 'DASH', sizePx: 72, color: 'border-amber-400 bg-amber-900/40 text-amber-200' },
                    { key: 'beam', label: 'BEAM', sizePx: 76, color: 'border-sky-400 bg-sky-900/40 text-sky-200' },
                    { key: 'tree', label: 'TREE', sizePx: 58, color: 'border-yellow-400 bg-slate-900/80 text-yellow-300' },
                ] as const
            ).map((item) => {
                const pos = layout[item.key];
                const isDragging = draggingKey === item.key;
                return (
                    <div
                        key={item.key}
                        onPointerDown={(e) => {
                            e.stopPropagation();
                            setDraggingKey(item.key);
                        }}
                        style={{
                            left: `${pos.xPct}vw`,
                            top: `${pos.yPct}vh`,
                            width: item.sizePx,
                            height: item.sizePx,
                            transform: `translate(-50%, -50%) scale(${sFactor})`,
                            opacity: oFactor,
                        }}
                        className={`absolute rounded-full border-2 flex flex-col items-center justify-center cursor-grab active:cursor-grabbing shadow-xl ${
                            item.color
                        } ${isDragging ? 'ring-4 ring-white/50 z-30' : 'z-10'}`}
                    >
                        {item.key === 'dash' && <FastForward size={24} />}
                        {item.key === 'beam' && <Zap size={24} />}
                        {item.key === 'tree' && <Sun size={22} />}
                        <span className="font-tech font-bold text-[10px] tracking-wider mt-0.5">{item.label}</span>
                    </div>
                );
            })}
        </div>
    );
};

const ToggleRow: React.FC<{ label: string, icon: React.ReactNode, active: boolean, onToggle: () => void, lang?: 'en' | 'es' }> = ({ label, icon, active, onToggle, lang = 'en' }) => (
    <button 
        onClick={onToggle}
        className={`w-full flex items-center justify-between p-4 rounded-xl border transition-all ${active ? 'bg-white/10 border-white text-white shadow-[0_0_15px_rgba(255,255,255,0.2)]' : 'bg-slate-950 border-slate-800 text-slate-500 hover:border-slate-700'}`}
    >
        <div className="flex items-center gap-4">
            <div className={`${active ? 'text-white' : 'text-slate-600'}`}>{icon}</div>
            <span className="font-tech text-sm tracking-wider uppercase">{t(label, lang)}</span>
        </div>
        <div className={`${active ? 'text-green-400' : 'text-slate-700'}`}>
            {active ? <ToggleRight size={28} /> : <ToggleLeft size={28} />}
        </div>
    </button>
);

export default SettingsMenu;
