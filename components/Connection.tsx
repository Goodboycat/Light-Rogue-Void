
import React from 'react';
import { motion } from 'framer-motion';
import { Position } from '../types';

interface ConnectionProps {
  start: Position;
  end: Position;
  isUnlocked: boolean;
  isVisible: boolean;
}

const Connection: React.FC<ConnectionProps> = ({ start, end, isUnlocked, isVisible }) => {
  if (!isVisible) return null;

  return (
    <g>
      {/* Base Line - Appears when revealed (The "Before Effect") */}
      {/* We use a brighter slate color (slate-700) to ensure visibility against the dark void */}
      <line
        x1={start.x}
        y1={start.y}
        x2={end.x}
        y2={end.y}
        stroke="#334155" 
        strokeWidth="4"
        strokeLinecap="round"
        opacity="1"
      />
      
      {/* Unlocked State - Draws on top with a static glow */}
      {isUnlocked && (
        <line
            x1={start.x}
            y1={start.y}
            x2={end.x}
            y2={end.y}
            stroke="#ffffff" 
            strokeWidth="4"
            strokeLinecap="round"
            style={{ filter: 'drop-shadow(0 0 6px rgba(255,255,255,0.8))' } as any}
        />
      )}
    </g>
  );
};

// Memoize to prevent re-rendering hundreds of static lines when other state changes
export default React.memo(Connection);
