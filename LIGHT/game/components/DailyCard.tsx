// (9A) Daily Void card (menu): start today's seeded run, best + streak, share code, verify a pasted code,
// endless best, last-30-day history. Data lives in save/daily.ts (own localStorage key).
import React, { useMemo, useState } from 'react';
import { loadDaily, todayKey, makeShareCode, verifyShareCode } from '../save/daily';

const DailyCard: React.FC<{ onStartDaily: () => void }> = ({ onStartDaily }) => {
  const d = useMemo(loadDaily, []);
  const today = todayKey();
  const best = d.best[today] || 0;
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState('');
  const v = code.trim() ? verifyShareCode(code) : null;
  const myCode = best ? makeShareCode(today, best) : '';
  return (
    <section id="daily-void" className="w-full bg-slate-900/70 p-3 rounded-xl border border-indigo-500/40 backdrop-blur-sm font-tech text-xs text-slate-300">
      <div className="flex items-center justify-between gap-2">
        <div>
          <div className="text-indigo-300 tracking-[0.2em] uppercase text-[10px]">Daily Void · {today} (UTC)</div>
          <div className="text-[11px]">Best today: <b className="text-white">{best ? `wave ${best}` : '—'}</b> · Streak: <b className="text-white">{d.streak}</b>{d.endlessBest ? <> · Endless best: <b className="text-white">{d.endlessBest}</b></> : null}</div>
        </div>
        <button id="daily-start" onClick={onStartDaily} className="px-4 py-2 rounded-full bg-indigo-500 hover:bg-indigo-400 text-white font-bold tracking-widest">PLAY DAILY</button>
      </div>
      {myCode && <div className="mt-1 text-[10px]">Share: <code className="select-all text-amber-200">{myCode}</code></div>}
      <button onClick={() => setOpen(o => !o)} className="mt-1 text-[10px] text-slate-400 underline">{open ? 'hide' : 'verify a code · history'}</button>
      {open && (
        <div className="mt-2 space-y-2">
          <input id="share-verify" value={code} onChange={e => setCode(e.target.value)} placeholder="LIGHT-YYYYMMDD-wave-XXXX"
            className="w-full bg-black/50 border border-slate-600 rounded px-2 py-1 text-white" />
          {v && (v.ok ? <div className="text-emerald-300">Valid: wave {v.wave} on the {v.date} Daily Void.</div> : <div className="text-rose-300">{v.reason}</div>)}
          <div className="max-h-24 overflow-y-auto text-[10px] grid grid-cols-3 gap-x-2">
            {d.history.length ? d.history.map(h => <span key={h.date}>{h.date}: {h.wave}</span>) : <span>No daily runs yet.</span>}
          </div>
        </div>
      )}
    </section>
  );
};
export default DailyCard;
