
import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Atom } from 'lucide-react';

interface ResourceHUDProps {
  matter: number;
  rate: number;
  onManualGather: () => void;
}

const ResourceHUD: React.FC<ResourceHUDProps> = ({ matter, rate, onManualGather }) => {
  return (
    <div className="fixed top-0 left-0 w-full p-6 flex justify-between items-start pointer-events-none z-50">
      
      {/* Resources Panel */}
      <div className="flex flex-col gap-2 pointer-events-auto">
        <motion.div 
            className="bg-slate-900/80 backdrop-blur border border-slate-700 p-4 rounded-xl shadow-2xl min-w-[200px]"
            {...({
                initial: { y: -50, opacity: 0 },
                animate: { y: 0, opacity: 1 }
            } as any)}
        >
            <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-purple-900/50 rounded-lg">
                    <Atom className="w-6 h-6 text-purple-400" />
                </div>
                <div>
                    <h2 className="text-xs text-slate-400 font-tech tracking-widest uppercase">Dark Matter</h2>
                    <div className="text-2xl font-bold font-mono text-white">
                        {Math.floor(matter).toLocaleString()}
                    </div>
                </div>
            </div>
            <div className="text-sm font-mono text-green-400 flex justify-between">
                <span>Rate:</span>
                <span>+{rate}/s</span>
            </div>
        </motion.div>

        {/* Manual Gather Button */}
        <motion.button
            {...({
                whileHover: { scale: 1.05 },
                whileTap: { scale: 0.95 }
            } as any)}
            onClick={() => { onManualGather(); }}
            className="mt-4 bg-white hover:bg-slate-200 text-black font-bold py-3 px-6 rounded-xl shadow-[0_0_15px_rgba(255,255,255,0.5)] border border-white transition-all font-tech uppercase tracking-wider flex items-center justify-center gap-2"
        >
            Feed the Void
        </motion.button>
      </div>

      {/* Game Title */}
      <div className="text-right hidden md:block">
        <h1 className="text-4xl font-bold text-white font-tech tracking-tighter shadow-black drop-shadow-lg">
            LIGHT <span className="text-purple-500">ROGUE VOID</span>
        </h1>
        <p className="text-slate-400 text-sm tracking-widest uppercase">Entropy has no patience</p>
      </div>
    </div>
  );
};

export default ResourceHUD;
