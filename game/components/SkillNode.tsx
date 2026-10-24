
import React, { useMemo } from 'react';
import { motion, useTransform, useMotionValue } from 'framer-motion';
import * as Icons from 'lucide-react';
import { AbilityNodeData, AbilityType } from '../types';

interface SkillNodeProps {
  data: AbilityNodeData;
  isUnlocked: boolean;
  isAffordable: boolean;
  isRevealed: boolean;
  onUnlock: (id: string) => void;
  currentScale: any; // Using any to avoid MotionValue import issues
  /** (1B) Constellation node whose boss is not yet defeated: dim star + lock. */
  isBossLocked?: boolean;
  lockLabel?: string;
}

const SkillNode: React.FC<SkillNodeProps> = ({
  data,
  isUnlocked,
  isAffordable,
  isRevealed,
  onUnlock,
  currentScale,
  isBossLocked = false,
  lockLabel
}) => {
  // Dynamic Icon Loading
  const IconComponent = (Icons as any)[data.icon] || Icons.Circle;
  
  // Dynamic sizing based on data.isMajor
  const isMajor = data.isMajor;
  
  // Major nodes are much larger, Minor nodes are smaller to act as "stars"
  const sizeClass = isMajor ? 'w-24 h-24' : 'w-8 h-8';
  const iconSize = isMajor ? 'w-12 h-12' : 'w-4 h-4';

  // Inverse scale for UI elements that should stay constant size
  const safeScale = currentScale || useMotionValue(1);
  const inverseScale = useTransform(safeScale, (s: number) => Math.max(0.5, 1 / Math.max(0.1, s)));

  const handleClick = () => {
    if (isUnlocked || isBossLocked) return;
    if (isRevealed && isAffordable) {
      onUnlock(data.id);
    } 
  };

  const getColors = () => {
    if (isBossLocked) return 'bg-slate-950/60 border-slate-700/40 opacity-60 cursor-not-allowed';
    if (isUnlocked) {
      // Changed CORE to white/bright style
      if (data.type === AbilityType.CORE) return 'bg-white border-white shadow-[0_0_30px_rgba(255,255,255,0.9)]';
      if (data.type === AbilityType.OFFENSE) return 'bg-red-950 border-red-500 shadow-[0_0_15px_rgba(239,68,68,0.5)]';
      if (data.type === AbilityType.DEFENSE) return 'bg-blue-950 border-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.5)]';
      return 'bg-amber-950 border-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.5)]';
    }
    if (isRevealed) {
        if(isAffordable) return 'bg-slate-900 border-emerald-500/50 shadow-[0_0_10px_rgba(16,185,129,0.3)] cursor-pointer hover:bg-slate-800 hover:border-emerald-400';
        return 'bg-slate-950 border-slate-800 cursor-not-allowed opacity-50';
    }
    return 'bg-slate-950 border-slate-900 opacity-0';
  };

  const getIconColor = () => {
      if (isUnlocked) {
          // If it's the Core node (which is now white), make the icon black so it's visible
          if (data.type === AbilityType.CORE) return 'text-black';
          return 'text-white';
      }
      if (isRevealed && isAffordable) return 'text-emerald-400';
      return 'text-slate-700';
  };

  if (!isRevealed && !isUnlocked && !isBossLocked) return null;

  return (
    <motion.div
      className="absolute flex flex-col items-center justify-center group"
      style={{
        left: data.position.x,
        top: data.position.y,
        x: '-50%',
        y: '-50%',
        zIndex: isMajor ? 30 : 20
      } as any}
      {...({
        initial: { scale: 0 },
        animate: { scale: 1 },
        transition: { type: "spring", bounce: 0, duration: 0.5 }
      } as any)}
    >
      {/* Tooltip with Inverse Scale */}
      <motion.div 
        className="absolute bottom-full mb-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-50 origin-bottom"
        style={{ scale: inverseScale } as any}
      >
        <div className="bg-black/95 border border-slate-700 p-3 rounded-lg w-56 backdrop-blur-sm shadow-xl relative z-50">
            <h3 className={`text-sm font-tech font-bold mb-1 ${isUnlocked ? 'text-white' : 'text-slate-400'}`}>
                {data.title}
            </h3>
            <p className="text-[10px] text-slate-400 leading-tight mb-2">
              {isBossLocked ? (lockLabel || 'Locked') : data.description}
            </p>
            <div className="flex justify-between items-center text-[10px] font-mono border-t border-slate-800 pt-1">
                <span className="text-cyan-400">{data.statBoostDisplay}</span>
                {!isUnlocked && <span className={isAffordable ? 'text-green-400' : 'text-red-500'}>{data.cost} M</span>}
            </div>
        </div>
      </motion.div>

      {isBossLocked && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-40">
          <Icons.Lock className={`${isMajor ? 'w-6 h-6' : 'w-3 h-3'} text-slate-500`} />
        </div>
      )}

      {/* Ripple Effect for Affordable Nodes */}
      {isRevealed && !isUnlocked && isAffordable && !isBossLocked && (
        <motion.div
            className={`absolute inset-0 rounded-full border-2 border-emerald-500/30`}
            style={{ width: '140%', height: '140%', left: '-20%', top: '-20%' }}
            {...({
                animate: { scale: [1, 1.3], opacity: [0.5, 0] },
                transition: { repeat: Infinity, duration: 1.5, ease: "easeOut" }
            } as any)}
        />
      )}

      {/* Main Node Node */}
      <motion.button
        onClick={handleClick}
        {...({
            whileHover: { scale: 1.15 },
            whileTap: { scale: 0.95 },
            animate: isRevealed && !isUnlocked && isAffordable && !isBossLocked ? { 
                scale: [1, 1.05, 1],
                boxShadow: [
                    "0 0 10px rgba(16,185,129,0.2)", 
                    "0 0 20px rgba(16,185,129,0.5)", 
                    "0 0 10px rgba(16,185,129,0.2)"
                ] 
            } : {},
            transition: { 
                scale: { repeat: Infinity, duration: 2, ease: "easeInOut" },
                boxShadow: { repeat: Infinity, duration: 2, ease: "easeInOut" }
            }
        } as any)}
        className={`
          relative ${sizeClass} rounded-full border-2 flex items-center justify-center
          transition-colors duration-300 overflow-hidden
          ${getColors()}
        `}
      >
        {/* Unlock Flash */}
        {isUnlocked && (
            <motion.div 
                className="absolute inset-0 bg-white"
                {...({
                    initial: { opacity: 0.8, scale: 0 },
                    animate: { opacity: 0, scale: 2 },
                    transition: { duration: 0.6, ease: "easeOut" }
                } as any)}
            />
        )}

        <IconComponent 
            className={`
                relative z-10 ${iconSize} transition-all duration-300
                ${getIconColor()}
            `} 
            strokeWidth={isMajor ? 2.5 : 1.5}
        />
      </motion.button>
      
      {/* Label only for Major nodes to reduce clutter */}
      {isMajor && (
        <motion.div className={`mt-2 text-[10px] font-tech tracking-wider uppercase font-bold text-center w-32 truncate
          ${isUnlocked ? 'text-white opacity-90' : 'text-slate-700 opacity-60'}
        `}
        style={{ scale: inverseScale } as any}
        >
          {data.title}
        </motion.div>
      )}

    </motion.div>
  );
};

export default SkillNode;
