
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { X, Smartphone, MousePointer2, ToggleLeft, ToggleRight, Trash2, AlertTriangle } from 'lucide-react';
import { Settings } from '../types';

interface SettingsMenuProps {
    settings: Settings;
    onUpdateSettings: (newSettings: Settings) => void;
    onClose: () => void;
    onDeleteSave: () => void;
}

const SettingsMenu: React.FC<SettingsMenuProps> = ({ settings, onUpdateSettings, onClose, onDeleteSave }) => {
    const [confirmDelete, setConfirmDelete] = useState(false);
    
    const update = (key: keyof Settings, value: any) => {
        onUpdateSettings({ ...settings, [key]: value });
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
                    <h2 className="text-2xl font-tech font-bold text-white tracking-widest">SYSTEM SETTINGS</h2>
                    <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors">
                        <X size={24} />
                    </button>
                </div>

                <div className="p-8 space-y-8 max-h-[70vh] overflow-y-auto custom-scrollbar">
                    
                    {/* CONTROLS */}
                    <div className="space-y-4">
                        <label className="text-xs font-mono text-purple-400 uppercase tracking-widest block mb-2">Control Interface</label>
                        
                        <div className="space-y-3">
                            <ToggleRow 
                                label="Touch Buttons to move"
                                icon={<Smartphone size={20} />}
                                active={settings.showTouchControls}
                                onToggle={() => update('showTouchControls', !settings.showTouchControls)}
                            />
                            
                            <ToggleRow 
                                label="Pointer Mouse moves player"
                                icon={<MousePointer2 size={20} />}
                                active={settings.mouseMovementEnabled}
                                onToggle={() => update('mouseMovementEnabled', !settings.mouseMovementEnabled)}
                            />
                        </div>
                    </div>

                    {/* PERFORMANCE MODE */}
                    <div className="space-y-4">
                        <label className="text-xs font-mono text-emerald-400 uppercase tracking-widest block mb-2">Performance & Visuals</label>
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
                                    {mode}
                                </button>
                            ))}
                        </div>
                        <p className="text-[10px] text-slate-500 text-center">
                            Adjusts background star density. Use LOW for older devices.
                        </p>
                    </div>

                    {/* DANGER ZONE */}
                    <div className="space-y-4 pt-6 border-t border-slate-800">
                        <label className="text-xs font-mono text-red-500 uppercase tracking-widest block mb-2">Danger Zone</label>
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
                                    CONFIRM DELETION
                                </>
                            ) : (
                                <>
                                    <Trash2 size={18} />
                                    DELETE ALL SAVE DATA
                                </>
                            )}
                        </button>
                        {confirmDelete && (
                            <p className="text-[10px] text-red-400 text-center font-mono">
                                This action cannot be undone. The game will reload.
                            </p>
                        )}
                    </div>

                </div>
            </motion.div>
        </div>
    );
};

const ToggleRow: React.FC<{ label: string, icon: React.ReactNode, active: boolean, onToggle: () => void }> = ({ label, icon, active, onToggle }) => (
    <button 
        onClick={onToggle}
        className={`w-full flex items-center justify-between p-4 rounded-xl border transition-all ${active ? 'bg-white/10 border-white text-white shadow-[0_0_15px_rgba(255,255,255,0.2)]' : 'bg-slate-950 border-slate-800 text-slate-500 hover:border-slate-700'}`}
    >
        <div className="flex items-center gap-4">
            <div className={`${active ? 'text-white' : 'text-slate-600'}`}>{icon}</div>
            <span className="font-tech text-sm tracking-wider uppercase">{label}</span>
        </div>
        <div className={`${active ? 'text-green-400' : 'text-slate-700'}`}>
            {active ? <ToggleRight size={28} /> : <ToggleLeft size={28} />}
        </div>
    </button>
);

export default SettingsMenu;
