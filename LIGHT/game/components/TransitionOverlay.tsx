
import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface TransitionOverlayProps {
    isVisible: boolean;
    duration?: number;
}

const TransitionOverlay: React.FC<TransitionOverlayProps> = ({ isVisible, duration = 1.0 }) => {
    return (
        <AnimatePresence>
            {isVisible && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: duration, ease: "easeInOut" }}
                    className="fixed inset-0 z-[9999] bg-black pointer-events-none"
                />
            )}
        </AnimatePresence>
    );
};

export default TransitionOverlay;
