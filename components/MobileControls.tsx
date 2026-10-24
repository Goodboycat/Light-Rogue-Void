import React, { useRef, useState } from 'react';
import { InputHandler } from './game/Input';
import { FastForward, Sun, Zap } from 'lucide-react';
import { useIsPC } from '../hooks/useIsPC';
import { Settings } from '../types';

interface MobileControlsProps {
    canPurchaseNode?: boolean;
    input: InputHandler;
    onOpenMenu: () => void;
    hasLightPurge?: boolean;
    lightEnergy?: number;
    settings?: Settings;
}

interface JoystickState {
    identifier: number | null;
    startX: number;
    startY: number;
    currentX: number;
    currentY: number;
    active: boolean;
}

const MobileControls: React.FC<MobileControlsProps> = ({
    input,
    onOpenMenu,
    canPurchaseNode,
    hasLightPurge = false,
    lightEnergy = 0,
    settings,
}) => {
    const isPC = useIsPC();

    // Automatically hide mobile touch controls on PC unless explicitly forced
    if (isPC) {
        return null;
    }

    const scale = Math.max(0.7, Math.min(1.4, (settings?.controlScale ?? 100) / 100));
    const opacity = Math.max(0.2, Math.min(1.0, (settings?.controlOpacity ?? 85) / 100));
    const leftHanded = !!settings?.leftHandedControls;
    const floatingJoystick = !!settings?.floatingJoystick;
    const doubleTapDash = settings?.doubleTapDash !== false;
    const layout = settings?.mobileControlLayout;

    const getCustomStyle = (
        key: 'move' | 'aim' | 'dash' | 'beam' | 'tree',
        defaultStyle: React.CSSProperties
    ): React.CSSProperties => {
        const custom = layout?.[key];
        if (custom && typeof custom.xPct === 'number' && typeof custom.yPct === 'number') {
            return {
                left: `${Math.max(4, Math.min(96, custom.xPct))}vw`,
                top: `${Math.max(4, Math.min(96, custom.yPct))}vh`,
                transform: `translate(-50%, -50%) scale(${scale})`,
                opacity,
            };
        }
        return {
            ...defaultStyle,
            transform: `${defaultStyle.transform ? defaultStyle.transform + ' ' : ''}scale(${scale})`,
            opacity,
        };
    };

    const moveSide = leftHanded ? 'right' : 'left';
    const actionSide = leftHanded ? 'left' : 'right';

    // Responsive clamp/vh positioning verified at both portrait 360x740 and landscape 740x360:
    // - Tree button: above move stick without colliding with top HUD
    // - Move stick: bottom corner
    // - Aim stick: opposite bottom corner
    // - DASH (72px) & BEAM (76px with charge ring): natural thumb arc above/inward of aim stick
    const treeDefaultStyle: React.CSSProperties = {
        bottom: 'clamp(158px, 37vh, 250px)',
        [moveSide]: 'clamp(14px, 4vw, 32px)',
    };

    const moveDefaultStyle: React.CSSProperties = {
        bottom: 'clamp(22px, 6.5vh, 68px)',
        [moveSide]: 'clamp(12px, 3.8vw, 32px)',
    };

    const aimDefaultStyle: React.CSSProperties = {
        bottom: 'clamp(18px, 5.5vh, 60px)',
        [actionSide]: 'clamp(12px, 3.8vw, 32px)',
    };

    // Thumb arc: DASH sits comfortably above outer edge, BEAM sits next to DASH along the arc
    const dashDefaultStyle: React.CSSProperties = {
        bottom: 'clamp(144px, 34vh, 232px)',
        [actionSide]: 'clamp(14px, 4vw, 32px)',
    };

    const beamDefaultStyle: React.CSSProperties = {
        bottom: 'clamp(124px, 29vh, 206px)',
        [actionSide]: 'clamp(96px, 24vw, 134px)',
    };

    return (
        <div
            className="absolute inset-0 pointer-events-none z-[50] select-none touch-none"
            onContextMenu={(e) => e.preventDefault()}
        >
            {/* Floating Move Joystick Zone (entire move-side half of viewport when floatingJoystick is ON) */}
            {floatingJoystick && (
                <FloatingMoveZone
                    side={moveSide}
                    scale={scale}
                    opacity={opacity}
                    doubleTapDash={doubleTapDash}
                    onUpdate={(x, y) => {
                        input.virtualMove = { x, y };
                    }}
                    onDoubleTapDash={() => {
                        input.virtualDash = true;
                        setTimeout(() => {
                            input.virtualDash = false;
                        }, 90);
                    }}
                />
            )}

            {/* Skill Tree Button */}
            <div
                className="absolute pointer-events-auto"
                style={getCustomStyle('tree', treeDefaultStyle)}
            >
                <button
                    type="button"
                    onClick={onOpenMenu}
                    className={`p-3.5 bg-slate-900/75 backdrop-blur-md border rounded-full text-white active:bg-slate-800 transition-colors shadow-lg group ${
                        canPurchaseNode
                            ? 'border-amber-400 shadow-[0_0_15px_rgba(251,191,36,0.35)]'
                            : 'border-slate-600'
                    }`}
                >
                    <Sun
                        size={26}
                        className={`transition-colors ${
                            canPurchaseNode
                                ? 'text-amber-300 animate-pulse'
                                : 'text-amber-400/60 group-hover:text-amber-400'
                        }`}
                    />
                </button>
            </div>

            {/* Fixed Move Joystick (when floatingJoystick is OFF) */}
            {!floatingJoystick && (
                <Joystick
                    style={getCustomStyle('move', moveDefaultStyle)}
                    doubleTapDash={doubleTapDash}
                    onDoubleTapDash={() => {
                        input.virtualDash = true;
                        setTimeout(() => {
                            input.virtualDash = false;
                        }, 90);
                    }}
                    onUpdate={(x, y) => {
                        input.virtualMove = { x, y };
                    }}
                />
            )}

            {/* Aim Joystick (Optional override for Auto-Aim) */}
            <Joystick
                style={getCustomStyle('aim', aimDefaultStyle)}
                isAimStick
                onUpdate={(x, y, active) => {
                    input.virtualAim = { x, y };
                    input.virtualAimActive = active;
                }}
            />

            {/* Large 72px DASH Button in Thumb Arc */}
            <DashButton
                style={getCustomStyle('dash', dashDefaultStyle)}
                onPress={(pressed) => {
                    input.virtualDash = pressed;
                }}
            />

            {/* BEAM Button next to DASH with Charge Ring */}
            <ShootButton
                style={getCustomStyle('beam', beamDefaultStyle)}
                lightEnergy={lightEnergy}
                onPress={(pressed) => {
                    input.virtualShoot = pressed;
                }}
            />
        </div>
    );
};

interface FloatingMoveZoneProps {
    side: 'left' | 'right';
    scale: number;
    opacity: number;
    doubleTapDash: boolean;
    onUpdate: (x: number, y: number, active: boolean) => void;
    onDoubleTapDash?: () => void;
}

const FloatingMoveZone: React.FC<FloatingMoveZoneProps> = ({
    side,
    scale,
    opacity,
    doubleTapDash,
    onUpdate,
    onDoubleTapDash,
}) => {
    const [state, setState] = useState<JoystickState>({
        identifier: null,
        startX: 0,
        startY: 0,
        currentX: 0,
        currentY: 0,
        active: false,
    });
    const lastTapRef = useRef<number>(0);
    const radius = 50 * scale;

    const handleTouchStart = (e: React.TouchEvent) => {
        if (state.active) return;
        const touch = e.changedTouches[0];
        if (!touch) return;

        const now = performance.now();
        if (doubleTapDash && onDoubleTapDash && now - lastTapRef.current < 260) {
            onDoubleTapDash();
            lastTapRef.current = 0;
        } else {
            lastTapRef.current = now;
        }

        setState({
            identifier: touch.identifier,
            startX: touch.clientX,
            startY: touch.clientY,
            currentX: touch.clientX,
            currentY: touch.clientY,
            active: true,
        });
        onUpdate(0, 0, true);
    };

    const handleTouchMove = (e: React.TouchEvent) => {
        if (!state.active) return;
        const touches = Array.from(e.changedTouches) as React.Touch[];
        const touch = touches.find((t) => t.identifier === state.identifier);
        if (!touch) return;

        const dx = touch.clientX - state.startX;
        const dy = touch.clientY - state.startY;
        setState((p) => ({ ...p, currentX: touch.clientX, currentY: touch.clientY }));

        const dist = Math.sqrt(dx * dx + dy * dy);
        const force = Math.min(dist, radius) / radius;
        const angle = Math.atan2(dy, dx);

        if (dist > 5) {
            onUpdate(Math.cos(angle) * force, Math.sin(angle) * force, true);
        } else {
            onUpdate(0, 0, true);
        }
    };

    const handleTouchEnd = (e: React.TouchEvent) => {
        const touches = Array.from(e.changedTouches) as React.Touch[];
        const touch = touches.find((t) => t.identifier === state.identifier);
        if (!touch) return;

        setState((p) => ({
            ...p,
            active: false,
            identifier: null,
            currentX: p.startX,
            currentY: p.startY,
        }));
        onUpdate(0, 0, false);
    };

    const dx = state.currentX - state.startX;
    const dy = state.currentY - state.startY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const limit = Math.min(dist, radius);
    const angle = Math.atan2(dy, dx);
    const knobX = state.active ? Math.cos(angle) * limit : 0;
    const knobY = state.active ? Math.sin(angle) * limit : 0;

    return (
        <div
            className={`absolute top-16 bottom-0 ${side === 'left' ? 'left-0' : 'right-0'} w-1/2 pointer-events-auto touch-none`}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            onTouchCancel={handleTouchEnd}
        >
            {state.active && (
                <div
                    className="fixed pointer-events-none flex items-center justify-center"
                    style={{
                        left: state.startX,
                        top: state.startY,
                        width: 112 * scale,
                        height: 112 * scale,
                        transform: 'translate(-50%, -50%)',
                        opacity,
                    }}
                >
                    <div className="w-full h-full rounded-full border-2 border-purple-400/60 bg-purple-900/25 backdrop-blur-sm" />
                    <div
                        className="absolute w-11 h-11 rounded-full bg-purple-500 shadow-[0_0_15px_rgba(168,85,247,0.6)]"
                        style={{ transform: `translate(${knobX}px, ${knobY}px)` }}
                    />
                </div>
            )}
        </div>
    );
};

interface JoystickProps {
    style?: React.CSSProperties;
    isAimStick?: boolean;
    doubleTapDash?: boolean;
    onDoubleTapDash?: () => void;
    onUpdate: (x: number, y: number, active: boolean) => void;
}

const Joystick: React.FC<JoystickProps> = ({
    style,
    isAimStick = false,
    doubleTapDash = false,
    onDoubleTapDash,
    onUpdate,
}) => {
    const [state, setState] = useState<JoystickState>({
        identifier: null,
        startX: 0,
        startY: 0,
        currentX: 0,
        currentY: 0,
        active: false,
    });

    const ref = useRef<HTMLDivElement>(null);
    const lastTapRef = useRef<number>(0);
    const radius = 46;

    const handleTouchStart = (e: React.TouchEvent) => {
        if (state.active) return;
        const touch = e.changedTouches[0];
        if (!touch) return;

        const now = performance.now();
        if (doubleTapDash && onDoubleTapDash && now - lastTapRef.current < 260) {
            onDoubleTapDash();
            lastTapRef.current = 0;
        } else {
            lastTapRef.current = now;
        }

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
            active: true,
        });

        onUpdate(0, 0, true);
    };

    const handleTouchMove = (e: React.TouchEvent) => {
        if (!state.active) return;

        const touches = Array.from(e.changedTouches) as React.Touch[];
        const touch = touches.find((t) => t.identifier === state.identifier);

        if (!touch) return;

        const dx = touch.clientX - state.startX;
        const dy = touch.clientY - state.startY;

        setState((p) => ({ ...p, currentX: touch.clientX, currentY: touch.clientY }));

        const dist = Math.sqrt(dx * dx + dy * dy);
        const force = Math.min(dist, radius) / radius;
        const angle = Math.atan2(dy, dx);

        if (dist > 5) {
            onUpdate(Math.cos(angle) * force, Math.sin(angle) * force, true);
        } else {
            onUpdate(0, 0, true);
        }
    };

    const handleTouchEnd = (e: React.TouchEvent) => {
        const touches = Array.from(e.changedTouches) as React.Touch[];
        const touch = touches.find((t) => t.identifier === state.identifier);

        if (!touch) return;

        setState((p) => ({
            ...p,
            active: false,
            identifier: null,
            currentX: p.startX,
            currentY: p.startY,
        }));
        onUpdate(0, 0, false);
    };

    const dx = state.currentX - state.startX;
    const dy = state.currentY - state.startY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const limit = Math.min(dist, radius);
    const angle = Math.atan2(dy, dx);

    const knobX = state.active ? Math.cos(angle) * limit : 0;
    const knobY = state.active ? Math.sin(angle) * limit : 0;

    return (
        <div
            ref={ref}
            style={style}
            className="absolute w-28 h-28 pointer-events-auto flex items-center justify-center touch-none"
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            onTouchCancel={handleTouchEnd}
        >
            {/* Base */}
            <div
                className={`w-full h-full rounded-full border-2 ${
                    state.active
                        ? isAimStick
                            ? 'border-cyan-400/60 bg-cyan-900/20'
                            : 'border-purple-400/50 bg-purple-900/20'
                        : 'border-slate-600/30 bg-slate-900/20'
                } transition-colors backdrop-blur-sm`}
            />

            {/* Stick */}
            <div
                className={`absolute w-11 h-11 rounded-full ${
                    state.active
                        ? isAimStick
                            ? 'bg-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.5)]'
                            : 'bg-purple-500 shadow-[0_0_15px_rgba(168,85,247,0.5)]'
                        : 'bg-slate-400/50'
                } transition-transform will-change-transform`}
                style={{ transform: `translate(${knobX}px, ${knobY}px)` }}
            />
        </div>
    );
};

const DashButton: React.FC<{ onPress: (pressed: boolean) => void; style?: React.CSSProperties }> = ({
    onPress,
    style,
}) => {
    return (
        <div
            style={style}
            className="absolute pointer-events-auto touch-none"
            onTouchStart={(e) => {
                e.preventDefault();
                onPress(true);
            }}
            onTouchEnd={(e) => {
                e.preventDefault();
                onPress(false);
            }}
            onTouchCancel={(e) => {
                e.preventDefault();
                onPress(false);
            }}
        >
            {/* Large 72px (w-[72px] h-[72px]) Dash Button in the thumb arc */}
            <div className="w-[72px] h-[72px] rounded-full border-2 border-amber-500/60 bg-amber-900/25 active:bg-amber-500/45 flex flex-col items-center justify-center backdrop-blur-sm shadow-[0_0_14px_rgba(245,158,11,0.28)]">
                <FastForward className="text-amber-400" size={30} fill="currentColor" />
                <span className="text-[8px] font-tech font-bold text-amber-300/90 tracking-widest mt-0.5">
                    DASH
                </span>
            </div>
        </div>
    );
};

const ShootButton: React.FC<{
    onPress: (pressed: boolean) => void;
    lightEnergy?: number;
    style?: React.CSSProperties;
}> = ({ onPress, lightEnergy = 0, style }) => {
    const isReady = lightEnergy >= 100;
    const pct = Math.min(100, Math.max(0, lightEnergy));

    // SVG charge ring math (r = 34, circumference = 2 * PI * 34 = ~213.6)
    const radius = 34;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference - (pct / 100) * circumference;

    return (
        <div
            style={style}
            className="absolute pointer-events-auto touch-none"
            onTouchStart={(e) => {
                e.preventDefault();
                if (isReady && navigator.vibrate) {
                    try {
                        navigator.vibrate(40);
                    } catch (err) {}
                }
                onPress(true);
            }}
            onTouchEnd={(e) => {
                e.preventDefault();
                onPress(false);
            }}
            onTouchCancel={(e) => {
                e.preventDefault();
                onPress(false);
            }}
        >
            <div
                className={`relative w-[76px] h-[76px] rounded-full transition-all flex flex-col items-center justify-center backdrop-blur-md ${
                    isReady
                        ? 'border-2 border-cyan-300 bg-cyan-500/50 shadow-[0_0_25px_rgba(56,189,248,0.8)] animate-pulse'
                        : 'border border-cyan-500/30 bg-slate-950/60'
                }`}
            >
                {/* SVG Charge Ring */}
                <svg className="absolute inset-0 w-full h-full -rotate-90 pointer-events-none" viewBox="0 0 76 76">
                    <circle
                        cx="38"
                        cy="38"
                        r={radius}
                        fill="none"
                        stroke="rgba(15, 23, 42, 0.6)"
                        strokeWidth="4"
                    />
                    <circle
                        cx="38"
                        cy="38"
                        r={radius}
                        fill="none"
                        stroke={isReady ? '#38bdf8' : '#0284c7'}
                        strokeWidth="5"
                        strokeDasharray={circumference}
                        strokeDashoffset={strokeDashoffset}
                        strokeLinecap="round"
                        className="transition-all duration-150 ease-out"
                    />
                </svg>

                <Zap
                    className={
                        isReady
                            ? 'text-cyan-200 drop-shadow-[0_0_10px_rgba(56,189,248,1)] scale-110 transition-transform'
                            : 'text-cyan-400/80'
                    }
                    size={28}
                    fill="currentColor"
                />
                <span className="text-[8px] font-tech font-bold text-cyan-200/90 tracking-wider mt-0.5">
                    {isReady ? 'READY' : `${Math.floor(pct)}%`}
                </span>
            </div>
        </div>
    );
};

export default MobileControls;
