// (8A step 3) Export / import panel shown inside Settings. Pure UI over hooks/useGameSave's
// exportCode / previewImport / applyImport. Export: copyable code + `.light` download.
// Import: paste or drop a file → validated (crc + version) → summary → CONFIRM OVERWRITE.
import React, { useRef, useState } from 'react';
import { Copy, Download, Upload, Check, AlertTriangle, FileText } from 'lucide-react';
import { DecodeResult, describeDecodeError, saveFileName, summarizeSave } from '../save/codec';
import type { SaveV2 } from '../save/schema';

interface Props {
    exportCode: () => string;
    previewImport: (text: string) => DecodeResult;
    applyImport: (r: DecodeResult) => boolean;
    /** current save, for the "you will lose" line */
    current: SaveV2;
}

const SaveTransfer: React.FC<Props> = ({ exportCode, previewImport, applyImport, current }) => {
    const [code, setCode] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);
    const [pasted, setPasted] = useState('');
    const [preview, setPreview] = useState<DecodeResult | null>(null);
    const [done, setDone] = useState(false);
    const [dragOver, setDragOver] = useState(false);
    const fileRef = useRef<HTMLInputElement>(null);

    const showCode = () => { setCode(exportCode()); setCopied(false); };

    const copy = async () => {
        const c = code ?? exportCode();
        setCode(c);
        try {
            await navigator.clipboard.writeText(c);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch {
            // clipboard API blocked (itch iframe without permission) → select the textarea so Ctrl+C works
            const ta = document.getElementById('save-export-code') as HTMLTextAreaElement | null;
            ta?.focus(); ta?.select();
        }
    };

    const download = () => {
        const c = code ?? exportCode();
        setCode(c);
        const blob = new Blob([c + '\n'], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = saveFileName(current);
        document.body.appendChild(a); a.click(); a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
    };

    const check = (text: string) => {
        setPasted(text);
        setDone(false);
        setPreview(text.trim() ? previewImport(text) : null);
    };

    const readFile = (f: File | undefined) => {
        if (!f) return;
        if (f.size > 2_000_000) { setPreview({ ok: false, error: 'bad_shape', detail: 'file too large' }); return; }
        const r = new FileReader();
        r.onload = () => check(String(r.result ?? ''));
        r.readAsText(f);
    };

    const confirm = () => {
        if (!preview || !preview.ok) return;
        if (applyImport(preview)) { setDone(true); setPasted(''); setPreview(null); }
    };

    return (
        <section id="save-transfer" className="space-y-4 pt-6 border-t border-slate-800">
            <label className="text-xs font-mono text-cyan-400 uppercase tracking-widest block mb-2">Save Transfer</label>
            <p className="text-[10px] text-slate-500 font-mono">
                Move your progress between browsers, itch.io and the phone app. Current: {summarizeSave(current)}.
            </p>

            {/* EXPORT */}
            <div className="grid grid-cols-3 gap-2">
                <button id="save-export-show" onClick={showCode} className="py-3 rounded-xl border border-slate-700 bg-slate-950 text-slate-300 hover:border-cyan-500 hover:text-cyan-300 font-tech text-xs tracking-widest flex items-center justify-center gap-2">
                    <FileText size={16} /> SHOW CODE
                </button>
                <button id="save-export-copy" onClick={copy} className="py-3 rounded-xl border border-slate-700 bg-slate-950 text-slate-300 hover:border-cyan-500 hover:text-cyan-300 font-tech text-xs tracking-widest flex items-center justify-center gap-2">
                    {copied ? <Check size={16} className="text-green-400" /> : <Copy size={16} />} {copied ? 'COPIED' : 'COPY CODE'}
                </button>
                <button id="save-export-download" onClick={download} className="py-3 rounded-xl border border-slate-700 bg-slate-950 text-slate-300 hover:border-cyan-500 hover:text-cyan-300 font-tech text-xs tracking-widest flex items-center justify-center gap-2">
                    <Download size={16} /> .LIGHT FILE
                </button>
            </div>
            {code && (
                <textarea
                    id="save-export-code"
                    readOnly
                    value={code}
                    onFocus={e => e.currentTarget.select()}
                    className="w-full h-20 bg-black/60 border border-slate-800 rounded-lg p-2 text-[10px] font-mono text-cyan-200 break-all resize-none"
                />
            )}

            {/* IMPORT */}
            <div
                id="save-import-drop"
                onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={e => { e.preventDefault(); setDragOver(false); readFile(e.dataTransfer.files?.[0]); }}
                className={`rounded-xl border p-3 space-y-2 transition-colors ${dragOver ? 'border-cyan-400 bg-cyan-950/30' : 'border-slate-800 bg-slate-950/60'}`}
            >
                <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono text-slate-400 uppercase tracking-widest">Import — paste a code or drop a .light file</span>
                    <button id="save-import-file" onClick={() => fileRef.current?.click()} className="text-[10px] font-mono text-cyan-400 hover:text-cyan-200 flex items-center gap-1">
                        <Upload size={12} /> choose file
                    </button>
                    <input ref={fileRef} type="file" accept=".light,.txt,.json,text/plain" className="hidden" onChange={e => readFile(e.target.files?.[0])} />
                </div>
                <textarea
                    id="save-import-code"
                    value={pasted}
                    onChange={e => check(e.target.value)}
                    placeholder="LIGHT1.…"
                    spellCheck={false}
                    className="w-full h-16 bg-black/60 border border-slate-800 rounded-lg p-2 text-[10px] font-mono text-slate-200 resize-none focus:border-cyan-500 outline-none"
                />
                {preview && preview.ok === false && (
                    <p className="text-[10px] font-mono text-red-400 flex items-center gap-2">
                        <AlertTriangle size={12} /> {describeDecodeError(preview.error, preview.detail)}
                    </p>
                )}
                {preview && preview.ok && (
                    <div className="space-y-2">
                        <p className="text-[10px] font-mono text-green-300">
                            Valid save (v{preview.rawVersion}{preview.report.from !== preview.report.to ? ` → migrated to v${preview.report.to}` : ''}): {summarizeSave(preview.save)}
                        </p>
                        {preview.report.droppedNodes > 0 && (
                            <p className="text-[10px] font-mono text-amber-300">
                                {preview.report.droppedNodes} legacy tree nodes will be refunded (+{preview.report.refunded} matter).
                            </p>
                        )}
                        <p className="text-[10px] font-mono text-amber-400 flex items-center gap-2">
                            <AlertTriangle size={12} /> This replaces your current progress ({summarizeSave(current)}). The replaced save is kept once in the backup slot.
                        </p>
                        <button id="save-import-confirm" onClick={confirm} className="w-full py-3 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-tech text-sm tracking-widest">
                            CONFIRM OVERWRITE &amp; IMPORT
                        </button>
                    </div>
                )}
                {done && (
                    <p className="text-[10px] font-mono text-green-400 flex items-center gap-2"><Check size={12} /> Imported. Progress replaced and saved.</p>
                )}
            </div>
        </section>
    );
};

export default SaveTransfer;
