// (8A step 3) Save ↔ transfer code. Pure, no DOM — `npm run test:save` runs it in node.
// Code format:  "LIGHT1." + base64url( utf8( JSON(save) ) + crc32_be(4 bytes) )
//  - prefix lets a human (and the importer) recognise a LIGHT code; the digit is the *codec* version, not SAVE_VERSION
//  - crc32 (IEEE, same as zlib) over the JSON bytes catches truncation / typos / clipboard mangling
//  - the JSON keeps its own `version`, so an old code imports through migrateSave like an old localStorage blob
// The same bytes are what the downloadable `.light` file contains (as text), so a file is just a code in a file.
import type { SaveV2 } from './schema';
import { SAVE_VERSION } from './schema';
import { migrateSave, detectVersion, NodeExists, MigrationReport } from './migrate';

export const CODE_PREFIX = 'LIGHT1.';
export const FILE_EXT = '.light';

// ---------- crc32 ----------
let TABLE: Uint32Array | null = null;
const table = () => {
    if (TABLE) return TABLE;
    TABLE = new Uint32Array(256);
    for (let n = 0; n < 256; n++) {
        let c = n;
        for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1;
        TABLE[n] = c >>> 0;
    }
    return TABLE;
};
/** IEEE crc32 of a string (utf8) or byte array. `crc32('123456789') >>> 0 === 0xCBF43926`. */
export const crc32 = (input: string | Uint8Array): number => {
    const bytes = typeof input === 'string' ? utf8Encode(input) : input;
    const t = table();
    let c = 0xFFFFFFFF;
    for (let i = 0; i < bytes.length; i++) c = t[(c ^ bytes[i]) & 0xFF] ^ (c >>> 8);
    return (c ^ 0xFFFFFFFF) >>> 0;
};

// ---------- bytes ----------
const utf8Encode = (s: string): Uint8Array => new TextEncoder().encode(s);
const utf8Decode = (b: Uint8Array): string => new TextDecoder('utf-8', { fatal: true }).decode(b);

const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
export const base64urlEncode = (bytes: Uint8Array): string => {
    let out = '';
    for (let i = 0; i < bytes.length; i += 3) {
        const a = bytes[i], b = i + 1 < bytes.length ? bytes[i + 1] : 0, c = i + 2 < bytes.length ? bytes[i + 2] : 0;
        const n = (a << 16) | (b << 8) | c;
        out += B64[(n >>> 18) & 63] + B64[(n >>> 12) & 63];
        out += i + 1 < bytes.length ? B64[(n >>> 6) & 63] : '';
        out += i + 2 < bytes.length ? B64[n & 63] : '';
    }
    return out;
};
export const base64urlDecode = (s: string): Uint8Array | null => {
    const clean = s.replace(/[\s=]/g, '').replace(/\+/g, '-').replace(/\//g, '_');
    if (!/^[A-Za-z0-9_-]*$/.test(clean) || clean.length % 4 === 1) return null;
    const out = new Uint8Array(Math.floor(clean.length * 3 / 4));
    let o = 0, buf = 0, bits = 0;
    for (let i = 0; i < clean.length; i++) {
        buf = (buf << 6) | B64.indexOf(clean[i]); bits += 6;
        if (bits >= 8) { bits -= 8; out[o++] = (buf >>> bits) & 0xFF; }
    }
    return out.subarray(0, o);
};

// ---------- encode ----------
/** Save → transfer code. Deterministic for the same save (JSON key order is the schema order). */
export const encodeSave = (save: SaveV2): string => {
    const json = utf8Encode(JSON.stringify(save));
    const crc = crc32(json);
    const bytes = new Uint8Array(json.length + 4);
    bytes.set(json, 0);
    bytes[json.length] = (crc >>> 24) & 0xFF; bytes[json.length + 1] = (crc >>> 16) & 0xFF;
    bytes[json.length + 2] = (crc >>> 8) & 0xFF; bytes[json.length + 3] = crc & 0xFF;
    return CODE_PREFIX + base64urlEncode(bytes);
};

/** Suggested file name for the `.light` download: light-save-2026-10-29-w34.light */
export const saveFileName = (save: SaveV2, now = Date.now()): string => {
    const d = new Date(now);
    const pad = (n: number) => String(n).padStart(2, '0');
    return `light-save-${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}-w${save.maxWaveReached}${FILE_EXT}`;
};

// ---------- decode ----------
export type DecodeError = 'empty' | 'not_a_code' | 'bad_base64' | 'too_short' | 'crc_mismatch' | 'bad_json' | 'bad_shape' | 'future_version';
export type DecodeResult =
    | { ok: true; save: SaveV2; report: MigrationReport; codeVersion: number; rawVersion: number }
    | { ok: false; error: DecodeError; detail?: string };

/**
 * Code (or `.light` file text) → migrated SaveV2. Tolerates whitespace / line breaks / a missing prefix
 * (people paste half a code). Never throws. `allowFuture` lets a newer game's code through normalised.
 */
export const decodeSave = (input: string, nodeExists: NodeExists, allowFuture = false): DecodeResult => {
    const text = (input ?? '').trim();
    if (!text) return { ok: false, error: 'empty' };
    let codeVersion = 1;
    let body = text;
    const m = /^LIGHT(\d+)\./.exec(text);
    if (m) { codeVersion = Number(m[1]); body = text.slice(m[0].length); }
    else if (/^\s*\{/.test(text)) {
        // raw JSON pasted (e.g. someone opened the localStorage blob) — accept, no crc to check
        try {
            const parsed = JSON.parse(text);
            if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return { ok: false, error: 'bad_shape' };
            const rawVersion = detectVersion(parsed);
            if (rawVersion > SAVE_VERSION && !allowFuture) return { ok: false, error: 'future_version', detail: `v${rawVersion}` };
            const { save, report } = migrateSave(parsed, nodeExists);
            return { ok: true, save, report, codeVersion: 0, rawVersion };
        } catch (e) { return { ok: false, error: 'bad_json', detail: String((e as Error).message) }; }
    }
    const bytes = base64urlDecode(body);
    if (!bytes) return { ok: false, error: 'bad_base64' };
    if (bytes.length < 6) return { ok: false, error: 'too_short' };
    const json = bytes.subarray(0, bytes.length - 4);
    const want = ((bytes[bytes.length - 4] << 24) | (bytes[bytes.length - 3] << 16) | (bytes[bytes.length - 2] << 8) | bytes[bytes.length - 1]) >>> 0;
    const got = crc32(json);
    if (got !== want) return { ok: false, error: 'crc_mismatch', detail: `${got.toString(16)} ≠ ${want.toString(16)}` };
    let parsed: unknown;
    try { parsed = JSON.parse(utf8Decode(json)); } catch (e) { return { ok: false, error: 'bad_json', detail: String((e as Error).message) }; }
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return { ok: false, error: 'bad_shape' };
    const rawVersion = detectVersion(parsed);
    if (rawVersion > SAVE_VERSION && !allowFuture) return { ok: false, error: 'future_version', detail: `v${rawVersion}` };
    const { save, report } = migrateSave(parsed, nodeExists);
    return { ok: true, save, report, codeVersion, rawVersion };
};

/** Human text for the import dialog. */
export const describeDecodeError = (e: DecodeError, detail?: string): string => ({
    empty: 'Paste a code or drop a .light file first.',
    not_a_code: 'That is not a LIGHT transfer code.',
    bad_base64: 'The code has characters that do not belong — was it cut off or edited?',
    too_short: 'The code is too short to be a save.',
    crc_mismatch: 'Checksum failed — the code was altered or truncated. Copy it again from the source.',
    bad_json: 'The code decoded but is not a save' + (detail ? ` (${detail})` : '') + '.',
    bad_shape: 'The code decoded but is not a save.',
    future_version: `This save comes from a newer version of LIGHT${detail ? ` (${detail})` : ''}. Update the game first.`,
}[e]);

/** One-line summary of a decoded save for the "overwrite?" confirm. */
export const summarizeSave = (s: SaveV2): string => {
    const when = s.savedAt ? new Date(s.savedAt).toLocaleDateString() : 'unknown date';
    return `wave ${s.maxWaveReached} · ${s.matter} matter · ${s.unlockedAbilityIds.length - 1} nodes · ${s.defeatedBosses.length}/6 bosses · ${s.unlockedAchievementIds.length} achievements · saved ${when}`;
};
