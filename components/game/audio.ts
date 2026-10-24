export const TRACKS = {
    ORIGIN_FIELDS: '/audio/origin-fields.mp3',
    WHISPERING_GROVE: '/audio/whispering-grove.mp3',
    CRYSTAL_DEPTHS: '/audio/crystal-depths.mp3',
    ABANDONED_MACHINERY: '/audio/abandoned-machinery.mp3',
    VOID_WASTES: '/audio/void-wastes.mp3',
    SEAM_OF_THE_VOID: '/audio/seam-of-the-void.mp3',
} as const;

export function getTrackForPlace(placeIdOrName?: string): string {
    if (!placeIdOrName) return TRACKS.ORIGIN_FIELDS;
    const key = placeIdOrName.toLowerCase().trim();

    if (key.includes('origin') || key === 'region_1' || key === 'map_1' || key === 'region_7' || key === 'mission_1' || key === 'treasure_1') {
        return TRACKS.ORIGIN_FIELDS;
    }
    if (key.includes('whisper') || key.includes('grove') || key === 'region_2' || key === 'map_2' || key.includes('forgotten vault') || key.includes('radiant bastion') || key === 'region_secret_1' || key === 'region_secret_3' || key === 'secret_1' || key === 'secret_3' || key === 'treasure_2') {
        return TRACKS.WHISPERING_GROVE;
    }
    if (key.includes('crystal') || key.includes('depth') || key === 'region_3' || key === 'map_3' || key.includes('echoing cavern') || key === 'region_8' || key === 'mission_2' || key === 'treasure_3') {
        return TRACKS.CRYSTAL_DEPTHS;
    }
    if (key.includes('abandon') || key.includes('machine') || key === 'region_4' || key === 'map_4' || key.includes('broken sanctuary') || key.includes('momentum') || key === 'region_9' || key === 'mission_3' || key === 'region_secret_4' || key === 'secret_4' || key === 'treasure_4') {
        return TRACKS.ABANDONED_MACHINERY;
    }
    if (key.includes('waste') || key === 'region_5' || key === 'map_5' || key.includes('rift') || key.includes('hidden garden') || key === 'region_10' || key === 'mission_4' || key === 'region_secret_2' || key === 'secret_2' || key === 'treasure_5') {
        return TRACKS.VOID_WASTES;
    }
    if (key.includes('seam') || key === 'region_6' || key === 'map_6') {
        return TRACKS.SEAM_OF_THE_VOID;
    }

    return TRACKS.ORIGIN_FIELDS;
}

export interface ActiveVoice {
    osc: OscillatorNode;
    gain: GainNode;
    startTime: number;
    baseVolume: number;
}

export class AudioEngine {
    private ctx: AudioContext | null = null;
    private masterGain: GainNode | null = null;
    private sfxGain: GainNode | null = null;
    private musicSource: MediaElementAudioSourceNode | null = null;
    private musicLowpass: BiquadFilterNode | null = null;
    private musicHighpass: BiquadFilterNode | null = null;
    private musicFilterGain: GainNode | null = null;
    private connectedAudioElements = new WeakSet<HTMLAudioElement>();

    private activeVoices: ActiveVoice[] = [];
    private readonly MAX_VOICES = 12;

    private masterVolume = 0.8;
    private musicVolume = 0.6;
    private sfxVolume = 1.0;

    private currentAudio: HTMLAudioElement | null = null;
    private currentTrackUrl: string = '';
    private pendingTrackUrl: string = '';
    private hasUserGestureOccurred = false;
    private isPlayingBgm = false;
    private wasPlayingBeforeHidden = false;
    private fadeInterval: any = null;

    private isLowHpState = false;
    private isBossLayerState = false;
    private isDialogueDucked = false;
    private heartbeatInterval: any = null;

    constructor() {
        // Pre-bind public methods
        this.resume = this.resume.bind(this);
        this.playBgm = this.playBgm.bind(this);

        if (typeof window !== 'undefined') {
            const unlockGesture = () => {
                this.hasUserGestureOccurred = true;
                if (this.pendingTrackUrl && this.isPlayingBgm && !this.currentAudio) {
                    const urlToPlay = this.pendingTrackUrl;
                    this.pendingTrackUrl = '';
                    this.playBgm(urlToPlay);
                }
            };
            window.addEventListener('pointerdown', unlockGesture, { once: true, passive: true });
            window.addEventListener('touchstart', unlockGesture, { once: true, passive: true });
            window.addEventListener('keydown', unlockGesture, { once: true, passive: true });
        }

        if (typeof document !== 'undefined') {
            const handleBackgrounded = () => {
                this.wasPlayingBeforeHidden = this.isPlayingBgm;
                if (this.currentAudio && !this.currentAudio.paused) {
                    try {
                        this.currentAudio.pause();
                    } catch (e) {}
                }
                if (this.ctx && this.ctx.state === 'running') {
                    this.ctx.suspend().catch(() => {});
                }
            };

            document.addEventListener('visibilitychange', () => {
                if (document.hidden) {
                    handleBackgrounded();
                } else {
                    if (this.ctx && this.ctx.state === 'suspended') {
                        this.ctx.resume().catch(() => {});
                    }
                    if (this.wasPlayingBeforeHidden && this.currentAudio) {
                        this.fadeInCurrentBgm(450);
                    }
                }
            });

            if (typeof window !== 'undefined') {
                window.addEventListener('blur', handleBackgrounded);
                window.addEventListener('pagehide', handleBackgrounded);
            }
        }
    }

    private initCtx() {
        if (!this.ctx && typeof window !== 'undefined') {
            const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
            if (AudioCtx) {
                this.ctx = new AudioCtx();
                this.masterGain = this.ctx.createGain();
                this.sfxGain = this.ctx.createGain();
                this.musicLowpass = this.ctx.createBiquadFilter();
                this.musicHighpass = this.ctx.createBiquadFilter();
                this.musicFilterGain = this.ctx.createGain();

                this.musicLowpass.type = 'lowpass';
                this.musicLowpass.frequency.setValueAtTime(20000, this.ctx.currentTime);
                this.musicHighpass.type = 'highpass';
                this.musicHighpass.frequency.setValueAtTime(20, this.ctx.currentTime);
                this.musicFilterGain.gain.setValueAtTime(1.0, this.ctx.currentTime);

                this.masterGain.gain.setValueAtTime(this.masterVolume, this.ctx.currentTime);
                this.sfxGain.gain.setValueAtTime(this.sfxVolume, this.ctx.currentTime);

                this.musicHighpass.connect(this.musicLowpass);
                this.musicLowpass.connect(this.musicFilterGain);
                this.musicFilterGain.connect(this.masterGain);

                this.sfxGain.connect(this.masterGain);
                this.masterGain.connect(this.ctx.destination);
            }
        }
        if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume().catch(() => {});
        }
    }

    private attachAudioElementToFilterChain(audioEl: HTMLAudioElement) {
        if (!this.ctx || !this.musicHighpass || this.connectedAudioElements.has(audioEl)) return;
        try {
            const src = this.ctx.createMediaElementSource(audioEl);
            src.connect(this.musicHighpass);
            this.musicSource = src;
            this.connectedAudioElements.add(audioEl);
        } catch (e) {
            // Fallback to direct element volume if MediaElementSource fails
        }
    }

    private computeEffectiveMusicVolume(): number {
        let vol = this.masterVolume * this.musicVolume;
        if (this.isDialogueDucked) {
            vol *= 0.4; // Duck music 60% during dialogue
        }
        if (this.isBossLayerState && !this.isDialogueDucked) {
            vol = Math.min(1.0, vol * 1.18); // Boss layer gain boost
        }
        return Math.max(0, Math.min(1, vol));
    }

    private syncMusicElementVolume() {
        if (!this.currentAudio) return;
        this.currentAudio.volume = this.computeEffectiveMusicVolume();
    }

    private fadeInCurrentBgm(durationMs = 450) {
        if (!this.currentAudio) return;
        if (this.fadeInterval) clearInterval(this.fadeInterval);

        const targetVol = this.computeEffectiveMusicVolume();
        this.currentAudio.volume = 0;
        this.currentAudio.play().catch(() => {});

        const steps = 15;
        const stepMs = Math.max(16, Math.floor(durationMs / steps));
        let curStep = 0;
        this.fadeInterval = setInterval(() => {
            curStep++;
            if (!this.currentAudio) {
                clearInterval(this.fadeInterval);
                return;
            }
            const progress = Math.min(1, curStep / steps);
            this.currentAudio.volume = targetVol * progress;
            if (progress >= 1) {
                clearInterval(this.fadeInterval);
                this.fadeInterval = null;
            }
        }, stepMs);
    }

    /**
     * Random pitch variation +-4% for organic SFX feel.
     */
    private jitterPitch(freq: number): number {
        return freq * (0.96 + Math.random() * 0.08);
    }

    /**
     * Allocates a voice within the 12-simultaneous-voice limit.
     * Drops the oldest quietest voice if at capacity.
     */
    private allocateVoice(baseVolume: number, durationSec: number): { osc: OscillatorNode; gain: GainNode; now: number } | null {
        this.initCtx();
        if (!this.ctx || !this.sfxGain || this.sfxVolume <= 0 || this.masterVolume <= 0) return null;

        const now = this.ctx.currentTime;

        // Prune finished voices
        for (let i = this.activeVoices.length - 1; i >= 0; i--) {
            if (now >= this.activeVoices[i].startTime) {
                this.activeVoices.splice(i, 1);
            }
        }

        // Enforce 12 simultaneous voices cap: drop the oldest quietest
        if (this.activeVoices.length >= this.MAX_VOICES) {
            let dropIdx = 0;
            let lowestScore = Infinity;
            for (let i = 0; i < this.activeVoices.length; i++) {
                const v = this.activeVoices[i];
                const remaining = Math.max(0, v.startTime - now);
                const score = v.baseVolume * 2 + remaining;
                if (score < lowestScore) {
                    lowestScore = score;
                    dropIdx = i;
                }
            }
            const dropped = this.activeVoices.splice(dropIdx, 1)[0];
            if (dropped) {
                try {
                    dropped.osc.stop();
                    dropped.osc.disconnect();
                    dropped.gain.disconnect();
                } catch (e) {}
            }
        }

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.connect(gain);
        gain.connect(this.sfxGain);

        this.activeVoices.push({
            osc,
            gain,
            startTime: now + durationSec,
            baseVolume,
        });

        return { osc, gain, now };
    }

    init() {
        this.initCtx();
    }

    resume() {
        this.initCtx();
        if (this.currentAudio && this.isPlayingBgm && this.currentAudio.paused) {
            this.currentAudio.play().catch(() => {});
        }
    }

    setVolumes(master: number, music: number, sfx: number) {
        this.masterVolume = Math.max(0, Math.min(1, master));
        this.musicVolume = Math.max(0, Math.min(1, music));
        this.sfxVolume = Math.max(0, Math.min(1, sfx));

        if (this.ctx && this.masterGain && this.sfxGain) {
            const now = this.ctx.currentTime;
            this.masterGain.gain.setValueAtTime(this.masterVolume, now);
            this.sfxGain.gain.setValueAtTime(this.sfxVolume, now);
        }

        this.syncMusicElementVolume();
    }

    /**
     * Low-HP state (1 HP): lowpass music to ~900 Hz and pulse a synthesized heartbeat.
     */
    setLowHpState(isLowHp: boolean) {
        if (this.isLowHpState === isLowHp) return;
        this.isLowHpState = isLowHp;
        this.initCtx();

        if (this.ctx && this.musicLowpass) {
            const now = this.ctx.currentTime;
            this.musicLowpass.frequency.setTargetAtTime(isLowHp ? 900 : 20000, now, 0.12);
        }

        if (isLowHp) {
            this.playHeartbeatPulse();
            if (!this.heartbeatInterval) {
                this.heartbeatInterval = setInterval(() => {
                    if (!this.isLowHpState || !this.isPlayingBgm) return;
                    this.playHeartbeatPulse();
                }, 850);
            }
        } else if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval);
            this.heartbeatInterval = null;
        }
    }

    private playHeartbeatPulse() {
        const v1 = this.allocateVoice(0.28, 0.11);
        if (v1 && this.ctx) {
            v1.osc.type = 'sine';
            v1.osc.frequency.setValueAtTime(65, v1.now);
            v1.osc.frequency.exponentialRampToValueAtTime(38, v1.now + 0.1);
            v1.gain.gain.setValueAtTime(0.28, v1.now);
            v1.gain.gain.exponentialRampToValueAtTime(0.001, v1.now + 0.11);
            v1.osc.start(v1.now);
            v1.osc.stop(v1.now + 0.11);
        }
        const v2 = this.allocateVoice(0.22, 0.28);
        if (v2 && this.ctx) {
            const start2 = v2.now + 0.14;
            v2.osc.type = 'sine';
            v2.osc.frequency.setValueAtTime(55, start2);
            v2.osc.frequency.exponentialRampToValueAtTime(34, start2 + 0.12);
            v2.gain.gain.setValueAtTime(0.001, v2.now);
            v2.gain.gain.setValueAtTime(0.22, start2);
            v2.gain.gain.exponentialRampToValueAtTime(0.001, start2 + 0.12);
            v2.osc.start(start2);
            v2.osc.stop(start2 + 0.13);
        }
    }

    /**
     * Boss layer: intensify existing music (gain boost + highpass sweep) without adding tracks.
     */
    setBossLayer(isBossActive: boolean) {
        if (this.isBossLayerState === isBossActive) return;
        this.isBossLayerState = isBossActive;
        this.initCtx();

        if (this.ctx && this.musicHighpass && this.musicFilterGain) {
            const now = this.ctx.currentTime;
            if (isBossActive) {
                this.musicHighpass.frequency.setValueAtTime(240, now);
                this.musicHighpass.frequency.exponentialRampToValueAtTime(55, now + 0.6);
                this.musicFilterGain.gain.setTargetAtTime(1.2, now, 0.15);
            } else {
                this.musicHighpass.frequency.setTargetAtTime(20, now, 0.15);
                this.musicFilterGain.gain.setTargetAtTime(1.0, now, 0.15);
            }
        }
        this.syncMusicElementVolume();
    }

    /**
     * Duck music by 60% (to 40% volume) during dialogue / cinematics.
     */
    setDialogueDucking(isDucked: boolean) {
        if (this.isDialogueDucked === isDucked) return;
        this.isDialogueDucked = isDucked;
        if (this.ctx && this.musicFilterGain) {
            const now = this.ctx.currentTime;
            const target = isDucked ? 0.4 : (this.isBossLayerState ? 1.2 : 1.0);
            this.musicFilterGain.gain.setTargetAtTime(target, now, 0.12);
        }
        this.syncMusicElementVolume();
    }

    playBgm(trackUrl?: string) {
        const targetUrl = trackUrl || this.currentTrackUrl || TRACKS.ORIGIN_FIELDS;
        this.isPlayingBgm = true;

        // Defer music download and playback until after the first user gesture
        if (!this.hasUserGestureOccurred) {
            this.pendingTrackUrl = targetUrl;
            this.currentTrackUrl = targetUrl;
            return;
        }

        this.initCtx();

        const effectiveVolume = this.computeEffectiveMusicVolume();

        // If same track is already playing
        if (this.currentAudio && this.currentTrackUrl === targetUrl) {
            this.currentAudio.volume = effectiveVolume;
            if (this.currentAudio.paused) {
                this.currentAudio.play().catch(() => {});
            }
            return;
        }

        // Switching track: gracefully stop previous and start new track
        if (this.currentAudio) {
            const prevAudio = this.currentAudio;
            try {
                prevAudio.pause();
                prevAudio.src = '';
            } catch (e) {
                // ignore
            }
            this.currentAudio = null;
        }

        this.currentTrackUrl = targetUrl;
        const newAudio = new Audio(targetUrl);
        newAudio.preload = 'auto';
        newAudio.loop = true;
        newAudio.volume = effectiveVolume;
        this.currentAudio = newAudio;
        this.attachAudioElementToFilterChain(newAudio);

        newAudio.play().catch(err => {
            console.debug('BGM play deferred pending user gesture:', err);
        });
    }

    /**
     * Preloads the next likely region's audio metadata during idle time without blocking the main thread.
     */
    preloadPlaceSoundtrackIdle(placeIdOrName?: string) {
        if (!this.hasUserGestureOccurred) return;
        const nextUrl = getTrackForPlace(placeIdOrName);
        if (!nextUrl || nextUrl === this.currentTrackUrl) return;

        const scheduleIdle =
            typeof window !== 'undefined' && 'requestIdleCallback' in window
                ? (window as any).requestIdleCallback
                : (cb: () => void) => setTimeout(cb, 600);

        scheduleIdle(() => {
            try {
                const preloadAudio = new Audio();
                preloadAudio.preload = 'metadata';
                preloadAudio.src = nextUrl;
            } catch {}
        });
    }

    stopBgm() {
        this.isPlayingBgm = false;
        this.setLowHpState(false);
        if (this.currentAudio) {
            try {
                this.currentAudio.pause();
            } catch (e) {}
        }
    }

    pauseBgm() {
        this.isPlayingBgm = false;
        if (this.currentAudio) {
            try {
                this.currentAudio.pause();
            } catch (e) {}
        }
    }

    resumeBgm() {
        this.initCtx();
        this.isPlayingBgm = true;
        if (this.currentAudio) {
            this.fadeInCurrentBgm(350);
        } else if (this.currentTrackUrl) {
            this.playBgm(this.currentTrackUrl);
        }
    }

    playPlaceSoundtrack(placeIdOrName?: string) {
        const track = getTrackForPlace(placeIdOrName);
        this.playBgm(track);
    }

    getCurrentTrackUrl(): string {
        return this.currentTrackUrl;
    }

    // --- SFX SYNTHESIS (Zero-latency Web Audio with 12-voice polyphony cap & +-4% pitch variation) ---

    playShoot() {
        try {
            const v = this.allocateVoice(0.18, 0.08);
            if (!v) return;
            v.osc.type = 'triangle';
            v.osc.frequency.setValueAtTime(this.jitterPitch(540), v.now);
            v.osc.frequency.exponentialRampToValueAtTime(this.jitterPitch(140), v.now + 0.08);

            v.gain.gain.setValueAtTime(0.18, v.now);
            v.gain.gain.exponentialRampToValueAtTime(0.001, v.now + 0.08);

            v.osc.start(v.now);
            v.osc.stop(v.now + 0.08);
        } catch (e) {}
    }

    playHit() {
        try {
            const v = this.allocateVoice(0.22, 0.06);
            if (!v) return;
            v.osc.type = 'sine';
            v.osc.frequency.setValueAtTime(this.jitterPitch(160), v.now);
            v.osc.frequency.exponentialRampToValueAtTime(this.jitterPitch(40), v.now + 0.06);

            v.gain.gain.setValueAtTime(0.22, v.now);
            v.gain.gain.exponentialRampToValueAtTime(0.001, v.now + 0.06);

            v.osc.start(v.now);
            v.osc.stop(v.now + 0.06);
        } catch (e) {}
    }

    /**
     * Kill SFX pitch ladder with combo (+2% per step, cap 1.8x) plus +-4% organic variation.
     */
    playKill(comboCount = 1) {
        try {
            const v = this.allocateVoice(0.24, 0.09);
            if (!v) return;
            const ladderMult = Math.min(1.8, 1.0 + Math.max(0, comboCount - 1) * 0.02);
            const startFreq = this.jitterPitch(280 * ladderMult);
            const endFreq = this.jitterPitch(520 * ladderMult);

            v.osc.type = 'triangle';
            v.osc.frequency.setValueAtTime(startFreq, v.now);
            v.osc.frequency.exponentialRampToValueAtTime(endFreq, v.now + 0.09);

            v.gain.gain.setValueAtTime(0.24, v.now);
            v.gain.gain.exponentialRampToValueAtTime(0.001, v.now + 0.09);

            v.osc.start(v.now);
            v.osc.stop(v.now + 0.09);
        } catch (e) {}
    }

    playCollect(pitchFactor = 1.0) {
        try {
            const v = this.allocateVoice(0.18, 0.07);
            if (!v) return;
            const clampedPitch = Math.min(2.5, Math.max(0.7, pitchFactor));
            const baseFreq = this.jitterPitch(980 * clampedPitch);
            const endFreq = this.jitterPitch(1580 * clampedPitch);

            v.osc.type = 'sine';
            v.osc.frequency.setValueAtTime(baseFreq, v.now);
            v.osc.frequency.exponentialRampToValueAtTime(endFreq, v.now + 0.07);

            v.gain.gain.setValueAtTime(0.18, v.now);
            v.gain.gain.exponentialRampToValueAtTime(0.001, v.now + 0.07);

            v.osc.start(v.now);
            v.osc.stop(v.now + 0.07);
        } catch (e) {}
    }

    playOrbSpawn() {
        try {
            const v = this.allocateVoice(0.2, 0.15);
            if (!v) return;
            v.osc.type = 'sine';
            v.osc.frequency.setValueAtTime(this.jitterPitch(650), v.now);
            v.osc.frequency.exponentialRampToValueAtTime(this.jitterPitch(1200), v.now + 0.15);

            v.gain.gain.setValueAtTime(0.2, v.now);
            v.gain.gain.exponentialRampToValueAtTime(0.001, v.now + 0.15);

            v.osc.start(v.now);
            v.osc.stop(v.now + 0.15);
        } catch (e) {}
    }

    private playStingerNotes(notes: number[], spacingSec: number, noteDurSec: number, type: OscillatorType = 'triangle', vol = 0.2) {
        try {
            for (let idx = 0; idx < notes.length; idx++) {
                const totalDur = idx * spacingSec + noteDurSec;
                const v = this.allocateVoice(vol, totalDur);
                if (!v) continue;
                const noteStart = v.now + idx * spacingSec;
                v.osc.type = type;
                v.osc.frequency.setValueAtTime(this.jitterPitch(notes[idx]), noteStart);
                v.gain.gain.setValueAtTime(0.0001, v.now);
                v.gain.gain.setValueAtTime(vol, noteStart);
                v.gain.gain.exponentialRampToValueAtTime(0.001, noteStart + noteDurSec);
                v.osc.start(noteStart);
                v.osc.stop(noteStart + noteDurSec);
            }
        } catch (e) {}
    }

    /** Stinger: Level-Up */
    playLevelUp() {
        this.playStingerNotes([523.25, 659.25, 783.99, 1046.50], 0.07, 0.25, 'triangle', 0.2);
    }

    /** Stinger: Wave Clear Arpeggio */
    playWaveClearStinger() {
        this.playStingerNotes([440.0, 554.37, 659.25, 880.0, 1108.73], 0.06, 0.24, 'triangle', 0.22);
    }

    /** Stinger: Boon Pick */
    playBoonPickStinger() {
        this.playStingerNotes([587.33, 880.0, 1174.66], 0.055, 0.22, 'sine', 0.22);
    }

    /** Stinger: Boss Phase Shift */
    playPhaseShiftStinger() {
        this.playStingerNotes([392.0, 311.13, 261.63, 523.25], 0.08, 0.28, 'sawtooth', 0.18);
    }

    /** Stinger: Purging Beam Ready */
    playBeamReadyStinger() {
        this.playStingerNotes([783.99, 1046.50, 1567.98], 0.05, 0.20, 'sine', 0.22);
    }

    /** Stinger: Achievement Unlocked */
    playAchievementStinger() {
        this.playStingerNotes([523.25, 659.25, 783.99, 987.77, 1318.51], 0.065, 0.28, 'triangle', 0.22);
    }

    playEpicWin() {
        try {
            const chords = [
                { time: 0.0, freqs: [523.25, 659.25, 783.99] },
                { time: 0.2, freqs: [587.33, 739.99, 880.00] },
                { time: 0.4, freqs: [659.25, 830.61, 987.77] },
                { time: 0.65, freqs: [783.99, 987.77, 1318.51] }
            ];
            for (let c = 0; c < chords.length; c++) {
                const chord = chords[c];
                for (let f = 0; f < chord.freqs.length; f++) {
                    const dur = 0.45;
                    const v = this.allocateVoice(0.15, chord.time + dur);
                    if (!v) continue;
                    const start = v.now + chord.time;
                    v.osc.type = 'triangle';
                    v.osc.frequency.setValueAtTime(this.jitterPitch(chord.freqs[f]), start);
                    v.gain.gain.setValueAtTime(0.0001, v.now);
                    v.gain.gain.setValueAtTime(0.15, start);
                    v.gain.gain.exponentialRampToValueAtTime(0.001, start + dur);
                    v.osc.start(start);
                    v.osc.stop(start + dur);
                }
            }
        } catch (e) {}
    }
}

export const audio = new AudioEngine();
