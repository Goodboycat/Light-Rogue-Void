
import React, { useRef, useState } from 'react';
import { InputHandler } from './game/Input';
import { Zap, TreeDeciduous, Sun } from 'lucide-react';

interface MobileControlsProps {
    input: InputHandler;
    onOpenMenu: () => void;
    burstReady?: boolean;    // (3B step 6)
    burstUnlocked?: boolean; // (3B step 6)
}

interface JoystickState {
    identifier: number | null;
    startX: number;
    startY: number;
    currentX: number;
    currentY: number;
    active: boolean;
}

const MobileControls: React.FC<MobileControlsProps> = ({ input, onOpenMenu, burstReady, burstUnlocked }) => {
    // Layout updated to prevent blocking text and ensure better ergonomics
    
    return (
        <div className="absolute inset-0 pointer-events-none z-[50] select-none touch-none">
            {/* Skill Tree Button - Above Left Joystick */}
            <div className="absolute bottom-64 left-8 pointer-events-auto">
                <button
                    onClick={onOpenMenu}
                    className="p-4 bg-slate-900/60 backdrop-blur-md border border-slate-600 rounded-full text-white active:bg-slate-800 transition-colors shadow-lg group"
                >
                    <TreeDeciduous size={28} className="text-emerald-400 group-hover:text-emerald-300" />
                </button>
            </div>

            {/* Left Joystick - Movement (Raised to avoid overlap with bottom text) */}
            <Joystick 
                side="left" 
                onUpdate={(x, y) => {
                    input.virtualMove = { x, y };
                }} 
            />

            {/* Right Joystick - Aiming (Raised) */}
            <Joystick 
                side="right" 
                onUpdate={(x, y, active) => {
                    input.virtualAim = { x, y };
                    input.virtualAimActive = active;
                }} 
            />

            {/* Dash Button - Moved higher to avoid overlap with Joystick */}
            <DashButton 
                onPress={(pressed) => {
                    input.virtualDash = pressed;
                }} 
            />

            {/* (3B step 6) Light Burst button — only when the tree node is owned */}
            {burstUnlocked && (
                <div 
                    id="burst-button"
                    className="absolute bottom-64 right-28 pointer-events-auto"
                    onTouchStart={(e) => { e.preventDefault(); input.virtualBurst = true; }}
                    onTouchEnd={(e) => { e.preventDefault(); input.virtualBurst = false; }}
                >
                    <div className={`w-16 h-16 rounded-full border-2 flex items-center justify-center backdrop-blur-sm transition-colors
                        ${burstReady ? 'border-yellow-200 bg-yellow-300/30 shadow-[0_0_18px_rgba(253,230,138,0.6)] animate-pulse' : 'border-white/20 bg-white/5 opacity-50'}`}>
                        <Sun className={burstReady ? 'text-yellow-100' : 'text-white/40'} size={28} />
                    </div>
                </div>
            )}
        </div>
    );
};

interface JoystickProps {
    side: 'left' | 'right';
    onUpdate: (x: number, y: number, active: boolean) => void;
}

const Joystick: React.FC<JoystickProps> = ({ side, onUpdate }) => {
    const [state, setState] = useState<JoystickState>({
        identifier: null,
        startX: 0,
        startY: 0,
        currentX: 0,
        currentY: 0,
        active: false
    });

    const ref = useRef<HTMLDivElement>(null);
    const radius = 50;

    const handleTouchStart = (e: React.TouchEvent) => {
        if (state.active) return;
        const touch = e.changedTouches[0];
        
        // Get center of joystick container
        const rect = ref.current?.getBoundingClientRect();
        if (!rect) return;

        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;

        setState({
            identifier: touch.identifier,
            startX: centerX,
            startY: centerY,
            currentX: touch.clientX,
            currentY: touch.clientY,
            active: true
        });
        
        // Initial update might be 0,0 but active
        onUpdate(0, 0, true);
    };

    const handleTouchMove = (e: React.TouchEvent) => {
        if (!state.active) return;
        
        // Find our touch with explicit casting to handle unknown type inference
        const touches = Array.from(e.changedTouches) as React.Touch[];
        const touch = touches.find(t => t.identifier === state.identifier);
        
        if (!touch) return;

        const dx = touch.clientX - state.startX;
        const dy = touch.clientY - state.startY;
        
        setState(p => ({ ...p, currentX: touch.clientX, currentY: touch.clientY }));

        // Normalize
        const dist = Math.sqrt(dx*dx + dy*dy);
        const force = Math.min(dist, radius) / radius;
        const angle = Math.atan2(dy, dx);
        
        // If inside deadzone?
        if (dist > 5) {
            onUpdate(Math.cos(angle) * force, Math.sin(angle) * force, true);
        } else {
            onUpdate(0, 0, true);
        }
    };

    const handleTouchEnd = (e: React.TouchEvent) => {
        const touches = Array.from(e.changedTouches) as React.Touch[];
        const touch = touches.find(t => t.identifier === state.identifier);
        
        if (!touch) return;

        setState(p => ({ ...p, active: false, identifier: null, currentX: p.startX, currentY: p.startY }));
        onUpdate(0, 0, false);
    };

    // Visual calculations
    const dx = state.currentX - state.startX;
    const dy = state.currentY - state.startY;
    const dist = Math.sqrt(dx*dx + dy*dy);
    const limit = Math.min(dist, radius);
    const angle = Math.atan2(dy, dx);
    
    const knobX = state.active ? Math.cos(angle) * limit : 0;
    const knobY = state.active ? Math.sin(angle) * limit : 0;

    // Raised position (bottom-24) to allow text visibility below
    return (
        <div 
            ref={ref}
            className={`absolute bottom-24 ${side === 'left' ? 'left-8' : 'right-8'} w-32 h-32 pointer-events-auto flex items-center justify-center`}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            onTouchCancel={handleTouchEnd}
        >
            {/* Base */}
            <div className={`w-full h-full rounded-full border-2 ${state.active ? 'border-purple-400/50 bg-purple-900/20' : 'border-slate-600/30 bg-slate-900/20'} transition-colors backdrop-blur-sm`} />
            
            {/* Stick */}
            <div 
                className={`absolute w-12 h-12 rounded-full ${state.active ? 'bg-purple-500 shadow-[0_0_15px_rgba(168,85,247,0.5)]' : 'bg-slate-400/50'} transition-transform will-change-transform`}
                style={{ transform: `translate(${knobX}px, ${knobY}px)` }}
            />
        </div>
    );
};

const DashButton: React.FC<{ onPress: (pressed: boolean) => void }> = ({ onPress }) => {
    return (
        <div 
            className="absolute bottom-64 right-8 pointer-events-auto"
            onTouchStart={(e) => { e.preventDefault(); onPress(true); }}
            onTouchEnd={(e) => { e.preventDefault(); onPress(false); }}
        >
            <div className="w-16 h-16 rounded-full border-2 border-amber-500/50 bg-amber-900/20 active:bg-amber-500/40 flex items-center justify-center backdrop-blur-sm shadow-[0_0_10px_rgba(245,158,11,0.2)]">
                <Zap className="text-amber-400" size={28} fill="currentColor" />
            </div>
        </div>
    );
};

export default MobileControls;
