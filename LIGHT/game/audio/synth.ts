// (6A) Procedural Web-Audio placeholders — one recipe per SynthFamily so every SfxId makes *some* sound
// until the Ludo.ai file for that id lands in public/audio/. Also two music loops (title / action) for cross-fade tests.
// Rule 4: nothing here is a generated asset; it is code. Keep each recipe cheap (≤ 3 nodes).
import type { SynthFamily, MusicId } from './sfxIds';

/** Deterministic per-id seed so the same id always sounds the same (pitch offset / brightness). */
export const idSeed = (id: string) => {
  let h = 2166136261;
  for (let i = 0; i < id.length; i++) { h ^= id.charCodeAt(i); h = Math.imul(h, 16777619); }
  return ((h >>> 0) % 1000) / 1000; // 0..1
};

let noiseBuf: AudioBuffer | null = null;
const noise = (ctx: AudioContext) => {
  if (!noiseBuf || noiseBuf.sampleRate !== ctx.sampleRate) {
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  const s = ctx.createBufferSource(); s.buffer = noiseBuf; return s;
};

export interface SynthVoice { stop: () => void; duration: number; }

/**
 * Play a placeholder. `out` is the gain node the voice must connect to (AudioManager hands a per-voice gain).
 * `pitch` is a multiplier (1 = base). Returns duration in seconds so the manager can free the voice.
 */
export function playSynth(ctx: AudioContext, out: AudioNode, family: SynthFamily, seed: number, pitch = 1): SynthVoice {
  const t = ctx.currentTime;
  const nodes: AudioScheduledSourceNode[] = [];
  let dur = 0.2;
  const env = (g: GainNode, peak: number, a: number, d: number) => {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t + a + d);
  };
  const osc = (type: OscillatorType, f0: number, f1 = f0, d = 0.2) => {
    const o = ctx.createOscillator(); o.type = type;
    o.frequency.setValueAtTime(f0 * pitch, t);
    if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(Math.max(20, f1 * pitch), t + d);
    return o;
  };
  const g = ctx.createGain(); g.connect(out);

  switch (family) {
    case 'blip': { // short square/triangle tick — UI click, shot, story tick
      const o = osc(seed > 0.5 ? 'square' : 'triangle', 500 + seed * 700, 400 + seed * 500, 0.06);
      env(g, 0.35, 0.004, 0.07); o.connect(g); nodes.push(o); dur = 0.09; break;
    }
    case 'noise': { // filtered noise burst — hits, small deaths, shield break
      const n = noise(ctx); const f = ctx.createBiquadFilter();
      f.type = seed > 0.5 ? 'highpass' : 'bandpass'; f.frequency.value = 800 + seed * 2500; f.Q.value = 1;
      n.connect(f); f.connect(g); env(g, 0.5, 0.003, 0.12 + seed * 0.1); nodes.push(n); dur = 0.25; break;
    }
    case 'sweep_up': { // rising sine/saw — dash, charge, telegraph, wave start
      const o = osc('sawtooth', 180 + seed * 100, 900 + seed * 600, 0.3);
      const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.setValueAtTime(600, t); f.frequency.exponentialRampToValueAtTime(4000, t + 0.3);
      o.connect(f); f.connect(g); env(g, 0.3, 0.02, 0.32); nodes.push(o); dur = 0.36; break;
    }
    case 'sweep_down': { // falling tone — back, death, event end, meteor warn
      const o = osc('triangle', 700 + seed * 400, 90, 0.45);
      env(g, 0.35, 0.01, 0.45); o.connect(g); nodes.push(o); dur = 0.48; break;
    }
    case 'chord': { // 3-note major/minor pad hit — unlock, relic, phase, chapter card
      const root = 220 * Math.pow(2, Math.floor(seed * 12) / 12);
      const ratios = seed > 0.5 ? [1, 1.25, 1.5] : [1, 1.2, 1.5];
      ratios.forEach(r => { const o = osc('sine', root * r); o.connect(g); nodes.push(o); });
      env(g, 0.22, 0.03, 0.9); dur = 0.95; break;
    }
    case 'thud': { // low sine drop + click — hurts, big deaths, boss fire, meteor hit
      const o = osc('sine', 150 + seed * 60, 40, 0.25);
      const n = noise(ctx); const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 400;
      const ng = ctx.createGain(); env(ng, 0.35, 0.002, 0.05); n.connect(f); f.connect(ng); ng.connect(out);
      env(g, 0.7, 0.005, 0.28); o.connect(g); nodes.push(o, n); dur = 0.3; break;
    }
    case 'drone': { // 1.2 s detuned low hum — boss arrive/enrage, low HP, ambush
      const base = 55 + seed * 30;
      const o1 = osc('sawtooth', base); const o2 = osc('sawtooth', base * 1.01);
      const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 300 + seed * 200;
      o1.connect(f); o2.connect(f); f.connect(g); env(g, 0.3, 0.15, 1.1); nodes.push(o1, o2); dur = 1.3; break;
    }
    case 'bell': { // FM-ish bell — essence, shrine, streaks, golden mite
      const f0 = 660 + seed * 600;
      const o = osc('sine', f0); const m = osc('sine', f0 * 2.76); const mg = ctx.createGain(); mg.gain.value = f0 * 0.6;
      m.connect(mg); mg.connect(o.frequency); o.connect(g); env(g, 0.3, 0.003, 0.5); nodes.push(o, m); dur = 0.55; break;
    }
  }
  nodes.forEach(n => { n.start(t); n.stop(t + dur + 0.05); });
  return { duration: dur, stop: () => nodes.forEach(n => { try { n.stop(); } catch { /* already stopped */ } }) };
}

/**
 * Looping music placeholder: a slow 4-chord pad (title/ending) or a pulsing bass + arpeggio (chapters/boss).
 * Returns a node graph connected to `out`; call `stop()` to tear down. Tempo/root derive from the id.
 */
export function startSynthMusic(ctx: AudioContext, out: AudioNode, id: MusicId): { stop: () => void } {
  const seed = idSeed(id);
  const calm = id === 'music_title' || id === 'music_ending';
  const root = 55 * Math.pow(2, Math.floor(seed * 7) / 12);
  const bpm = calm ? 60 : id === 'music_boss' ? 140 : 96 + Math.floor(seed * 24);
  const beat = 60 / bpm;
  const nodes: AudioScheduledSourceNode[] = [];
  const bus = ctx.createGain(); bus.gain.value = calm ? 0.18 : 0.14; bus.connect(out);
  const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = calm ? 900 : 1800; lp.connect(bus);
  const t0 = ctx.currentTime + 0.05;
  const progression = seed > 0.5 ? [1, 1.5, 1.335, 1.189] : [1, 1.189, 1.5, 1.335]; // I V IV iii-ish ratios
  // pad: 2 detuned saws per chord tone, chord changes every 4 beats via frequency automation (loops 64 beats)
  const barLen = beat * 4; const loopLen = barLen * progression.length;
  for (let v = 0; v < 2; v++) {
    const o = ctx.createOscillator(); o.type = calm ? 'triangle' : 'sawtooth';
    const f = o.frequency; f.setValueAtTime(root * 2 * progression[0] * (v ? 1.004 : 1), t0);
    for (let rep = 0; rep < 16; rep++) progression.forEach((r, i) => f.setValueAtTime(root * 2 * r * (v ? 1.004 : 1), t0 + rep * loopLen + i * barLen));
    o.connect(lp); nodes.push(o);
  }
  if (!calm) { // bass pulse on every beat + 16th arpeggio, scheduled for ~17 min (16 loops) then silent — long enough for a run
    const bass = ctx.createOscillator(); bass.type = 'square'; const bg = ctx.createGain(); bg.gain.value = 0;
    bass.connect(bg); bg.connect(lp); nodes.push(bass);
    const arp = ctx.createOscillator(); arp.type = 'triangle'; const ag = ctx.createGain(); ag.gain.value = 0;
    arp.connect(ag); ag.connect(lp); nodes.push(arp);
    const steps = [1, 1.5, 2, 1.5, 1.25, 2, 1.5, 1.25];
    for (let rep = 0; rep < 16; rep++) progression.forEach((r, i) => {
      const bar = t0 + rep * loopLen + i * barLen;
      bass.frequency.setValueAtTime(root * r, bar);
      for (let b = 0; b < 4; b++) { bg.gain.setValueAtTime(0.5, bar + b * beat); bg.gain.setTargetAtTime(0, bar + b * beat + 0.02, 0.08); }
      for (let s = 0; s < 8; s++) {
        const ts = bar + s * (barLen / 8);
        arp.frequency.setValueAtTime(root * 4 * r * steps[(s + i) % 8], ts);
        ag.gain.setValueAtTime(0.25, ts); ag.gain.setTargetAtTime(0, ts + 0.01, 0.05);
      }
    });
  }
  nodes.forEach(n => n.start(t0));
  return { stop: () => { nodes.forEach(n => { try { n.stop(); } catch { /* noop */ } }); bus.disconnect(); } };
}
