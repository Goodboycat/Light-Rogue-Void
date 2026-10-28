// (6A) Audio manager — singleton Web-Audio engine. Ported from fixed-fork `components/game/audio.ts`
// (unlock on first gesture, cross-fade, ducking, voice cap) with track URLs / translate() stripped.
// Sounds are addressed by id (audio/sfxIds.ts). Priority per id: public/audio/manifest.json file > synth placeholder.
// Missing or failed files are silent-safe (fall back to synth). 6B wires the hooks into the game; 6A only builds this.
import { SFX_FAMILY, SFX_THROTTLE_MS, SFX_VOLUME, type AudioId, type MusicId, type SfxId } from './sfxIds';
import { idSeed, playSynth, startSynthMusic } from './synth';

export const MAX_VOICES = 24;
export const MIN_THROTTLE_MS = 40;
const MANIFEST_URL = 'audio/manifest.json';

export interface AudioSettings { masterVolume: number; musicVolume: number; sfxVolume: number; muted: boolean; }
export const DEFAULT_AUDIO_SETTINGS: AudioSettings = { masterVolume: 0.8, musicVolume: 0.6, sfxVolume: 0.8, muted: false };

export interface PlayOpts { vol?: number; pitchVar?: number; pos?: { x: number; y: number }; listener?: { x: number; y: number } }

interface Voice { id: SfxId; gain: GainNode; startedAt: number; endsAt: number; stop: () => void; vol: number }
interface MusicLayer { id: MusicId; gain: GainNode; stop: () => void }

class AudioManagerImpl {
  private ctx: AudioContext | null = null;
  private master!: GainNode; private musicBus!: GainNode; private sfxBus!: GainNode; private duckGain!: GainNode;
  private voices: Voice[] = [];
  private lastPlay = new Map<string, number>();
  private current: MusicLayer | null = null;
  private manifest: Partial<Record<AudioId, string>> = {};
  private buffers = new Map<AudioId, AudioBuffer | 'loading' | 'failed'>();
  private settings: AudioSettings = { ...DEFAULT_AUDIO_SETTINGS };
  private hidden = false;
  private unlockBound = false;
  /** Set by tests / `?debug=1` to list what played. */
  public log: string[] | null = null;

  /** Call once at app start: registers one-shot gesture listeners that create/resume the AudioContext. */
  init() {
    if (this.unlockBound || typeof window === 'undefined') return;
    this.unlockBound = true;
    const unlock = () => { this.ensureCtx(); this.ctx?.resume().catch(() => {}); };
    for (const ev of ['pointerdown', 'touchstart', 'keydown'] as const)
      window.addEventListener(ev, unlock, { once: true, passive: true });
    document.addEventListener('visibilitychange', () => {
      this.hidden = document.hidden;
      this.applyGains(0.25);
    });
    this.loadManifest();
  }

  get ready() { return !!this.ctx && this.ctx.state === 'running'; }
  get currentMusic(): MusicId | null { return this.current?.id ?? null; }

  private ensureCtx() {
    if (this.ctx) return this.ctx;
    const AC = (window.AudioContext || (window as any).webkitAudioContext) as typeof AudioContext | undefined;
    if (!AC) return null;
    const ctx = new AC();
    this.ctx = ctx;
    this.master = ctx.createGain(); this.duckGain = ctx.createGain();
    this.musicBus = ctx.createGain(); this.sfxBus = ctx.createGain();
    this.musicBus.connect(this.duckGain); this.duckGain.connect(this.master);
    this.sfxBus.connect(this.master); this.master.connect(ctx.destination);
    this.applyGains(0);
    return ctx;
  }

  /** Volumes / mute from settings (persisted by useGameSave). Safe before init. */
  setSettings(s: Partial<AudioSettings>) {
    this.settings = { ...this.settings, ...s };
    this.applyGains(0.05);
  }
  getSettings(): AudioSettings { return { ...this.settings }; }

  private applyGains(rampS: number) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const m = (this.settings.muted || this.hidden) ? 0 : this.settings.masterVolume;
    const set = (g: GainNode, v: number) => { g.gain.cancelScheduledValues(t); g.gain.setTargetAtTime(Math.max(0, v), t, Math.max(0.005, rampS / 3)); };
    set(this.master, m); set(this.musicBus, this.settings.musicVolume); set(this.sfxBus, this.settings.sfxVolume);
  }

  // ---------- files (manifest) ----------
  private async loadManifest() {
    try {
      const r = await fetch(new URL(MANIFEST_URL, document.baseURI).href);
      if (!r.ok) return;
      const j = await r.json();
      if (j && typeof j === 'object') this.manifest = j;
    } catch { /* no manifest: synth only */ }
  }
  private fileFor(id: AudioId): string | null {
    const f = this.manifest[id]; return f ? new URL('audio/' + f, document.baseURI).href : null;
  }
  /** Kick off a decode; returns the buffer only when already decoded (never blocks a play call). */
  private buffer(id: AudioId): AudioBuffer | null {
    const b = this.buffers.get(id);
    if (b instanceof AudioBuffer) return b;
    if (b) return null;
    const url = this.fileFor(id); if (!url || !this.ctx) return null;
    this.buffers.set(id, 'loading');
    fetch(url).then(r => r.ok ? r.arrayBuffer() : Promise.reject(r.status))
      .then(ab => this.ctx!.decodeAudioData(ab))
      .then(buf => this.buffers.set(id, buf))
      .catch(() => this.buffers.set(id, 'failed'));
    return null;
  }
  /** Pre-decode every file in the manifest (call after unlock, e.g. on the title screen). */
  preload() { if (!this.ctx) return; (Object.keys(this.manifest) as AudioId[]).forEach(id => this.buffer(id)); }

  // ---------- SFX ----------
  play(id: SfxId, opts: PlayOpts = {}): boolean {
    const ctx = this.ctx; if (!ctx || ctx.state !== 'running' || this.settings.muted) return false;
    const now = performance.now();
    const gap = Math.max(MIN_THROTTLE_MS, SFX_THROTTLE_MS[id] ?? MIN_THROTTLE_MS);
    const last = this.lastPlay.get(id) ?? -1e9;
    if (now - last < gap) return false;
    this.lastPlay.set(id, now);

    // positional attenuation (world units; 0 at > 1400 px) + mild pan not needed — keep it cheap
    let vol = (opts.vol ?? 1) * (SFX_VOLUME[id] ?? 0.6);
    if (opts.pos && opts.listener) {
      const d = Math.hypot(opts.pos.x - opts.listener.x, opts.pos.y - opts.listener.y);
      vol *= Math.max(0, 1 - d / 1400);
      if (vol < 0.02) return false;
    }
    this.pruneVoices(ctx.currentTime);
    if (this.voices.length >= MAX_VOICES) {
      // drop the quietest oldest voice
      let idx = 0;
      for (let i = 1; i < this.voices.length; i++) if (this.voices[i].vol < this.voices[idx].vol || (this.voices[i].vol === this.voices[idx].vol && this.voices[i].startedAt < this.voices[idx].startedAt)) idx = i;
      const v = this.voices.splice(idx, 1)[0]; v.stop(); v.gain.disconnect();
    }
    const g = ctx.createGain(); g.gain.value = vol; g.connect(this.sfxBus);
    const pitch = 1 + (opts.pitchVar ? (Math.random() * 2 - 1) * opts.pitchVar : 0);
    let stop: () => void; let dur: number;
    const buf = this.buffer(id);
    if (buf) {
      const s = ctx.createBufferSource(); s.buffer = buf; s.playbackRate.value = pitch; s.connect(g); s.start();
      dur = buf.duration / pitch; stop = () => { try { s.stop(); } catch { /* noop */ } };
    } else {
      const v = playSynth(ctx, g, SFX_FAMILY[id], idSeed(id), pitch);
      dur = v.duration; stop = v.stop;
    }
    this.voices.push({ id, gain: g, startedAt: ctx.currentTime, endsAt: ctx.currentTime + dur + 0.1, stop, vol });
    this.log?.push(id);
    return true;
  }
  private pruneVoices(t: number) {
    for (let i = this.voices.length - 1; i >= 0; i--) if (this.voices[i].endsAt <= t) { this.voices[i].gain.disconnect(); this.voices.splice(i, 1); }
  }
  get activeVoices() { if (this.ctx) this.pruneVoices(this.ctx.currentTime); return this.voices.length; }

  // ---------- music ----------
  /** Cross-fade to `id` (file loop if in manifest + decoded, else synth loop). `null` fades out. */
  music(id: MusicId | null, fadeMs = 1200) {
    const ctx = this.ctx; if (!ctx) return;
    if (this.current?.id === id) return;
    const t = ctx.currentTime; const fade = Math.max(0.05, fadeMs / 1000);
    if (this.current) {
      const old = this.current; this.current = null;
      old.gain.gain.cancelScheduledValues(t); old.gain.gain.setValueAtTime(old.gain.gain.value, t);
      old.gain.gain.linearRampToValueAtTime(0, t + fade);
      setTimeout(() => { old.stop(); old.gain.disconnect(); }, fadeMs + 100);
    }
    if (!id) return;
    const g = ctx.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(1, t + fade); g.connect(this.musicBus);
    const buf = this.buffer(id);
    let stop: () => void;
    if (buf) {
      const s = ctx.createBufferSource(); s.buffer = buf; s.loop = true; s.connect(g); s.start();
      stop = () => { try { s.stop(); } catch { /* noop */ } };
    } else {
      stop = startSynthMusic(ctx, g, id).stop;
    }
    this.current = { id, gain: g, stop };
    this.log?.push(id);
  }

  /** Duck music to `amount` (0–1 of normal) for `ms`, then recover over the same ramp. */
  duck(amount = 0.35, ms = 600) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime; const g = this.duckGain.gain;
    g.cancelScheduledValues(t); g.setValueAtTime(g.value, t);
    g.linearRampToValueAtTime(Math.max(0, Math.min(1, amount)), t + 0.05);
    g.setValueAtTime(amount, t + ms / 1000);
    g.linearRampToValueAtTime(1, t + ms / 1000 + 0.4);
  }

  /** Stop everything (run end / app unmount). */
  stopAll() {
    this.voices.forEach(v => { v.stop(); v.gain.disconnect(); }); this.voices = [];
    this.music(null, 200);
  }
}

export const Audio = new AudioManagerImpl();
if (typeof window !== 'undefined') (window as any).__AUDIO = Audio; // debug / 6B acceptance checks
export default Audio;
