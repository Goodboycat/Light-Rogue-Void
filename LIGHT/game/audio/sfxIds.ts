// (6A) Every sound id in the game. Real files drop into public/audio/<id>.ogg (see docs/AUDIO_LUDO.md);
// until then synth.ts makes a placeholder for each. Add ids here first, then a prompt in docs/AUDIO_LUDO.md.

export const SFX_IDS = [
  // UI
  'ui_click', 'ui_back', 'ui_unlock', 'ui_error',
  // player
  'player_shot', 'player_dash', 'player_hurt', 'player_low_hp', 'player_death',
  'burst_charge', 'burst_fire',
  // pickups / discovery
  'pickup_essence', 'pickup_relic', 'shrine_touch', 'landmark_reveal',
  // enemies
  'enemy_hit', 'enemy_die_small', 'enemy_die_big', 'elite_die', 'affix_shield_break',
  // waves / streaks
  'wave_start', 'wave_special', 'streak_10', 'streak_25', 'streak_50',
  // bosses
  'boss_arrive', 'boss_telegraph', 'boss_fire', 'boss_phase', 'boss_enrage', 'boss_die', 'arena_burn',
  // world events
  'event_start', 'event_end', 'meteor_warn', 'meteor_hit', 'ambush_ring', 'golden_mite',
  // story
  'chapter_card', 'story_line', 'ending_leave', 'ending_stay',
  // (7D) world map place reveal
  'music_sting_reveal',
  // (M5) cinematic — the Darkness Interrupts (M9 owns the batch; synth families until files exist)
  'cin_whisper', 'cin_cut', 'cin_silence_drop', 'cin_tendril',
] as const;
export type SfxId = typeof SFX_IDS[number];

export const MUSIC_IDS = [
  'music_title', 'music_ch1', 'music_ch2', 'music_ch3', 'music_ch4', 'music_ch5', 'music_ch6',
  'music_boss', 'music_ending',
] as const;
export type MusicId = typeof MUSIC_IDS[number];

export type AudioId = SfxId | MusicId;

/** Synth family per SFX id — drives synth.ts placeholders; also the "mood" column in docs/AUDIO_LUDO.md. */
export type SynthFamily = 'blip' | 'noise' | 'sweep_up' | 'sweep_down' | 'chord' | 'thud' | 'drone' | 'bell';

export const SFX_FAMILY: Record<SfxId, SynthFamily> = {
  ui_click: 'blip', ui_back: 'sweep_down', ui_unlock: 'chord', ui_error: 'thud',
  player_shot: 'blip', player_dash: 'sweep_up', player_hurt: 'thud', player_low_hp: 'drone', player_death: 'sweep_down',
  burst_charge: 'sweep_up', burst_fire: 'chord',
  pickup_essence: 'bell', pickup_relic: 'chord', shrine_touch: 'bell', landmark_reveal: 'chord',
  enemy_hit: 'noise', enemy_die_small: 'noise', enemy_die_big: 'thud', elite_die: 'thud', affix_shield_break: 'noise',
  wave_start: 'sweep_up', wave_special: 'chord', streak_10: 'bell', streak_25: 'bell', streak_50: 'chord',
  boss_arrive: 'drone', boss_telegraph: 'sweep_up', boss_fire: 'thud', boss_phase: 'chord', boss_enrage: 'drone',
  boss_die: 'thud', arena_burn: 'noise',
  event_start: 'chord', event_end: 'sweep_down', meteor_warn: 'sweep_down', meteor_hit: 'thud',
  ambush_ring: 'drone', golden_mite: 'bell',
  chapter_card: 'chord', story_line: 'blip', ending_leave: 'chord', ending_stay: 'bell',
  music_sting_reveal: 'chord',
  cin_whisper: 'drone', cin_cut: 'noise', cin_silence_drop: 'sweep_up', cin_tendril: 'sweep_down',
};

/** Default per-id throttle (ms) — spammy ids get a longer gap. AudioManager enforces ≥ 40 ms for all. */
export const SFX_THROTTLE_MS: Partial<Record<SfxId, number>> = {
  player_shot: 60, enemy_hit: 50, enemy_die_small: 70, pickup_essence: 45, boss_fire: 80, arena_burn: 250,
  player_low_hp: 900, boss_telegraph: 120, story_line: 30,
};

/** Default volume per id (0–1, before sfx/master gains). */
export const SFX_VOLUME: Partial<Record<SfxId, number>> = {
  player_shot: 0.35, enemy_hit: 0.3, pickup_essence: 0.4, enemy_die_small: 0.45, story_line: 0.25,
  boss_arrive: 0.9, boss_die: 1, boss_enrage: 0.9, player_death: 0.9, ending_leave: 0.8, ending_stay: 0.8,
  music_sting_reveal: 0.9,
  cin_whisper: 0.5, cin_cut: 0.7, cin_silence_drop: 0.6, cin_tendril: 0.5,
};
