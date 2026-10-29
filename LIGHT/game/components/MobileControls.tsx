// (7B) Touch controls — floating joysticks + dash / burst / pause buttons.
// Left half of the screen = movement stick, right half = aim stick (both appear where the thumb lands).
// Pointer events (no 300 ms delay, no synthetic mouse), per-pointer ids → multi-touch safe,
// dead zone 8 px, `touch-action: none`, safe-area insets, landscape keeps everything in the bottom corners.
import React, { useEffect, useRef, useState } from 'react';
import { InputHandler } from './game/Input';
import { Zap, Pause, Sun } from 'lucide-react';
import { TOUCH_DEAD_ZONE_PX, TOUCH_STICK_RADIUS_PX } from './game/Constants';

interface MobileControlsProps {
    input: InputHandler;
    onOpenMenu: () => void;
    burstReady?: boolean;    // (3B step 6)
    burstUnlocked?: boolean; // (3B step 6)
}

interface Stick { id: number; ox: number; oy: number; x: number; y: number }

const MobileControls: React.FC<MobileControlsProps> = ({ input, onOpenMenu, burstReady, burstUnlocked }) => {
    const [move, setMove] = useState<Stick | null>(null);
    const [aim, setAim] = useState<Stick | null>(null);
    const moveRef = useRef<Stick | null>(null);
    const aimRef = useRef<Stick | null>(null);
    const layerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const el = layerRef.current;
        if (!el) return;
        const apply = (s: Stick, which: 'move' | 'aim') => {
            const dx = s.x - s.ox, dy = s.y - s.oy;
            const dist = Math.hypot(dx, dy);
            let nx = 0, ny = 0;
            if (dist > TOUCH_DEAD_ZONE_PX) {
                // re-map so the first 8 px are dead and full deflection is still reached at the ring radius
                const f = Math.min(1, (dist - TOUCH_DEAD_ZONE_PX) / (TOUCH_STICK_RADIUS_PX - TOUCH_DEAD_ZONE_PX));
                nx = (dx / dist) * f; ny = (dy / dist) * f;
            }
            if (which === 'move') input.virtualMove = { x: nx, y: ny };
            else { input.virtualAim = { x: nx, y: ny }; input.virtualAimActive = true; }
        };
        const down = (e: PointerEvent) => {
            if (e.pointerType === 'mouse') return;                  // desktop keeps mouse aim
            if ((e.target as HTMLElement).closest('[data-touch-button]')) return; // buttons handle themselves
            const leftHalf = e.clientX < window.innerWidth / 2;
            const s: Stick = { id: e.pointerId, ox: e.clientX, oy: e.clientY, x: e.clientX, y: e.clientY };
            if (leftHalf && !moveRef.current) { moveRef.current = s; setMove(s); input.virtualMove = { x: 0, y: 0 }; }
            else if (!leftHalf && !aimRef.current) { aimRef.current = s; setAim(s); input.virtualAimActive = true; input.virtualAim = { x: 0, y: 0 }; }
            else return;
            el.setPointerCapture?.(e.pointerId);
            e.preventDefault();
        };
        const moveEv = (e: PointerEvent) => {
            const m = moveRef.current, a = aimRef.current;
            if (m && m.id === e.pointerId) {
                // floating stick: if the thumb runs past the ring, drag the origin along so direction stays responsive
                const dx = e.clientX - m.ox, dy = e.clientY - m.oy, d = Math.hypot(dx, dy);
                if (d > TOUCH_STICK_RADIUS_PX) { m.ox = e.clientX - (dx / d) * TOUCH_STICK_RADIUS_PX; m.oy = e.clientY - (dy / d) * TOUCH_STICK_RADIUS_PX; }
                m.x = e.clientX; m.y = e.clientY; apply(m, 'move'); setMove({ ...m });
            } else if (a && a.id === e.pointerId) {
                a.x = e.clientX; a.y = e.clientY; apply(a, 'aim'); setAim({ ...a });
            }
        };
        const up = (e: PointerEvent) => {
            if (moveRef.current?.id === e.pointerId) { moveRef.current = null; setMove(null); input.virtualMove = { x: 0, y: 0 }; }
            if (aimRef.current?.id === e.pointerId) { aimRef.current = null; setAim(null); input.virtualAim = { x: 0, y: 0 }; input.virtualAimActive = false; }
        };
        el.addEventListener('pointerdown', down, { passive: false });
        el.addEventListener('pointermove', moveEv);
        el.addEventListener('pointerup', up);
        el.addEventListener('pointercancel', up);
        el.addEventListener('lostpointercapture', up);
        return () => {
            el.removeEventListener('pointerdown', down); el.removeEventListener('pointermove', moveEv);
            el.removeEventListener('pointerup', up); el.removeEventListener('pointercancel', up); el.removeEventListener('lostpointercapture', up);
            input.virtualMove = { x: 0, y: 0 }; input.virtualAim = { x: 0, y: 0 }; input.virtualAimActive = false; input.virtualDash = false; input.virtualBurst = false;
        };
    }, [input]);

    // safe-area aware anchors: buttons live in the bottom-right corner column, pause top-right under the HUD row
    const right = 'calc(env(safe-area-inset-right, 0px) + 1.25rem)';
    const bottom = (rem: number) => `calc(env(safe-area-inset-bottom, 0px) + ${rem}rem)`;

    return (
        <div ref={layerRef} id="touch-layer" className="absolute inset-0 z-[50] select-none touch-none"
             style={{ touchAction: 'none', WebkitUserSelect: 'none', WebkitTouchCallout: 'none' } as React.CSSProperties}>
            {move && <StickView s={move} color="purple" />}
            {aim && <StickView s={aim} color="cyan" />}

            {/* Pause — top-right, under the HUD row (never over the joystick zones' usual thumb spots) */}
            <TouchButton id="touch-pause" style={{ top: 'calc(env(safe-area-inset-top, 0px) + 4.5rem)', right }}
                         onDown={onOpenMenu} className="w-11 h-11 border-slate-500/60 bg-slate-900/60">
                <Pause className="text-slate-200" size={20} />
            </TouchButton>

            {/* Dash — bottom-right column, above the aim thumb's natural rest */}
            <TouchButton id="touch-dash" style={{ bottom: bottom(11), right }}
                         onDown={() => { input.virtualDash = true; }} onUp={() => { input.virtualDash = false; }}
                         className="w-16 h-16 border-amber-500/50 bg-amber-900/20 active:bg-amber-500/40 shadow-[0_0_10px_rgba(245,158,11,0.2)]">
                <Zap className="text-amber-400" size={28} fill="currentColor" />
            </TouchButton>

            {/* (3B step 6) Light Burst — only when the tree node is owned; sits left of dash */}
            {burstUnlocked && (
                <TouchButton id="burst-button" style={{ bottom: bottom(11), right: `calc(${right} + 5rem)` }}
                             onDown={() => { input.virtualBurst = true; }} onUp={() => { input.virtualBurst = false; }}
                             className={`w-16 h-16 ${burstReady ? 'border-yellow-200 bg-yellow-300/30 shadow-[0_0_18px_rgba(253,230,138,0.6)] animate-pulse' : 'border-white/20 bg-white/5 opacity-50'}`}>
                    <Sun className={burstReady ? 'text-yellow-100' : 'text-white/40'} size={28} />
                </TouchButton>
            )}
        </div>
    );
};

const StickView: React.FC<{ s: Stick; color: 'purple' | 'cyan' }> = ({ s, color }) => {
    const dx = s.x - s.ox, dy = s.y - s.oy, d = Math.hypot(dx, dy);
    const lim = Math.min(d, TOUCH_STICK_RADIUS_PX);
    const kx = d > 0 ? (dx / d) * lim : 0, ky = d > 0 ? (dy / d) * lim : 0;
    const ring = color === 'purple' ? 'border-purple-400/50 bg-purple-900/15' : 'border-cyan-400/50 bg-cyan-900/15';
    const knob = color === 'purple' ? 'bg-purple-500 shadow-[0_0_15px_rgba(168,85,247,0.5)]' : 'bg-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.5)]';
    const R = TOUCH_STICK_RADIUS_PX;
    return (
        <div className="absolute pointer-events-none" style={{ left: s.ox - R, top: s.oy - R, width: R * 2, height: R * 2 }}>
            <div className={`w-full h-full rounded-full border-2 ${ring}`} />
            <div className={`absolute w-12 h-12 rounded-full ${knob} will-change-transform`}
                 style={{ left: R - 24, top: R - 24, transform: `translate(${kx}px, ${ky}px)` }} />
        </div>
    );
};

const TouchButton: React.FC<{ id: string; style: React.CSSProperties; className: string; onDown: () => void; onUp?: () => void; children: React.ReactNode }> =
    ({ id, style, className, onDown, onUp, children }) => {
    const press = (e: React.PointerEvent) => { e.preventDefault(); e.stopPropagation(); (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId); onDown(); };
    const release = (e: React.PointerEvent) => { e.preventDefault(); e.stopPropagation(); onUp?.(); };
    return (
        <div id={id} data-touch-button data-sfx="none" className="absolute touch-none" style={style}
             onPointerDown={press} onPointerUp={release} onPointerCancel={release} onLostPointerCapture={release}
             onContextMenu={(e) => e.preventDefault()}>
            <div className={`rounded-full border-2 flex items-center justify-center backdrop-blur-sm transition-colors ${className}`}>{children}</div>
        </div>
    );
};

export default MobileControls;
