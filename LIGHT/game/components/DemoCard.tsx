// (9B) "Buy full" card shown only in `?demo=1`. Pure presentation; the URL lives in Constants.FULL_GAME_URL.
import React from 'react';
import { ExternalLink } from 'lucide-react';
import { IS_DEMO, DEMO_MAX_WAVE, DEMO_TREE_MAX_COST, FULL_GAME_URL } from './game/Constants';

interface DemoCardProps {
  /** 'menu' = full card with the feature list; 'compact' = one-line strip (tree, win screen). */
  variant?: 'menu' | 'compact';
  className?: string;
}

const FULL_FEATURES = [
  '6 chapters · 60 waves · 6 bosses',
  'The whole Skill Tree (no cost cap, all constellations)',
  'Endless mode + Daily Void',
  'Full story, ending and Archives',
];

const DemoCard: React.FC<DemoCardProps> = ({ variant = 'menu', className = '' }) => {
  if (!IS_DEMO) return null;
  const link = (
    <a
      id="buy-full-link"
      href={FULL_GAME_URL}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-2 px-4 py-2 rounded bg-amber-400 text-black font-tech text-xs tracking-[0.25em] uppercase hover:bg-amber-300 transition-colors"
    >
      Get the full game <ExternalLink size={14} />
    </a>
  );
  if (variant === 'compact') {
    return (
      <div id="demo-buy-full" className={`flex flex-wrap items-center justify-between gap-3 px-4 py-2 rounded-lg bg-amber-500/10 border border-amber-500/40 ${className}`}>
        <span className="text-amber-200 font-mono text-[11px] tracking-wider uppercase">
          Demo · waves 1–{DEMO_MAX_WAVE} · tree capped at {DEMO_TREE_MAX_COST} M
        </span>
        {link}
      </div>
    );
  }
  return (
    <section id="demo-buy-full" className={`w-full bg-amber-500/10 border border-amber-500/40 rounded-xl p-4 backdrop-blur-sm ${className}`}>
      <h3 className="text-amber-300 font-tech text-sm tracking-[0.3em] uppercase mb-2">This is the demo</h3>
      <p className="text-slate-300 text-xs mb-3">
        Chapters 1–2 (waves 1–{DEMO_MAX_WAVE}), two bosses, and the Skill Tree up to {DEMO_TREE_MAX_COST} M per node. The full version adds:
      </p>
      <ul className="text-slate-200 text-xs space-y-1 mb-4 list-disc list-inside">
        {FULL_FEATURES.map(f => <li key={f}>{f}</li>)}
      </ul>
      <div className="flex items-center justify-between gap-3 flex-wrap">
        {link}
        <span className="text-slate-500 text-[10px] font-mono">Your demo progress carries over (Settings → Save transfer).</span>
      </div>
    </section>
  );
};

export default DemoCard;
