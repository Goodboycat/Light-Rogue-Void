import { useState, useEffect } from 'react';

export function isPCEnvironment(): boolean {
    if (typeof window === 'undefined') return false;

    // Check Mobile / Tablet User Agent
    const ua = navigator.userAgent || navigator.vendor || (window as any).opera || '';
    const isMobileUA = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobile|Tablet/i.test(ua);
    if (isMobileUA) return false;

    // Check touch points capability
    const hasTouch = 'ontouchstart' in window || (navigator.maxTouchPoints && navigator.maxTouchPoints > 0);
    if (!hasTouch) return true;

    // Check media queries for fine pointer (mouse/trackpad cursor)
    const isFinePointer = window.matchMedia && window.matchMedia('(pointer: fine)').matches;
    const isCoarsePointer = window.matchMedia && window.matchMedia('(pointer: coarse)').matches;

    if (isFinePointer && !isCoarsePointer) return true;

    // Desktop viewport width with fine or standard pointer
    if (window.innerWidth >= 1024 && !isCoarsePointer) return true;

    return false;
}

export function useIsPC(): boolean {
    const [isPC, setIsPC] = useState<boolean>(() => isPCEnvironment());

    useEffect(() => {
        const handleCheck = () => {
            setIsPC(isPCEnvironment());
        };

        const handleTouch = () => {
            const ua = navigator.userAgent || '';
            const isMobileUA = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobile|Tablet/i.test(ua);
            if (isMobileUA || window.innerWidth < 1024) {
                setIsPC(false);
            }
        };

        window.addEventListener('resize', handleCheck);
        window.addEventListener('touchstart', handleTouch, { passive: true });

        return () => {
            window.removeEventListener('resize', handleCheck);
            window.removeEventListener('touchstart', handleTouch);
        };
    }, []);

    return isPC;
}
