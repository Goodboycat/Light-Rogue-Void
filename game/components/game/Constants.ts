
export const WORLD_SIZE = 3500;

// --- PUBLISHING CONFIGURATION ---
// Demo mode is a runtime flag: open the game with `?demo=1`.
// (1A) It used to be a compile-time constant; now one build serves both.
export const IS_DEMO: boolean =
  typeof location !== 'undefined' && new URLSearchParams(location.search).has('demo');

export const DEMO_MAX_WAVE = 20;

/** `?debug=1` exposes `window.__LIGHT = { state, wave, time }` for smoke tests. */
export const DEBUG: boolean =
  typeof location !== 'undefined' && new URLSearchParams(location.search).has('debug');

// --- RUN STRUCTURE (1A) ---
// All wave / chapter numbers live here. No magic 60s or `% 10` elsewhere.
export const MAX_WAVE = 60;
export const WAVES_PER_CHAPTER = 10;
export const CHAPTER_COUNT = MAX_WAVE / WAVES_PER_CHAPTER; // 6

export interface ChapterDef {
  id: number;        // 1..6
  name: string;
  color: string;     // palette accent
  bossId: string;    // EnemyDef.id in bosses.ts
  bossWave: number;  // 10, 20, ...
}

export const CHAPTERS: ChapterDef[] = [
  { id: 1, name: 'Origin Fields',       color: '#fde68a', bossId: 'hive_mind',     bossWave: 10 },
  { id: 2, name: 'Whispering Grove',    color: '#2dd4bf', bossId: 'void_warden',   bossWave: 20 },
  { id: 3, name: 'Crystal Depths',      color: '#a78bfa', bossId: 'crimson_eclipse',  bossWave: 30 },
  { id: 4, name: 'Abandoned Machinery', color: '#fb923c', bossId: 'neutron_star',  bossWave: 40 },
  { id: 5, name: 'Void Wastes',         color: '#818cf8', bossId: 'entropy_titan',    bossWave: 50 },
  { id: 6, name: 'Seam of the Void',    color: '#f8fafc', bossId: 'darkness', bossWave: 60 },
];

/** True on 10, 20, ... MAX_WAVE (and every 10th wave in endless). */
export const isBossWave = (wave: number): boolean => wave > 0 && wave % WAVES_PER_CHAPTER === 0;

/** 1-based chapter index for a wave; clamps to the last chapter in endless. */
export const chapterIndexOf = (wave: number): number =>
  Math.min(CHAPTER_COUNT, Math.max(1, Math.ceil(wave / WAVES_PER_CHAPTER)));

export const chapterOf = (wave: number): ChapterDef => CHAPTERS[chapterIndexOf(wave) - 1];

/** Boss index (0-based into BOSSES) for a wave. */
export const bossIndexOf = (wave: number): number => chapterIndexOf(wave) - 1;

// --- WAVE FLOW (2A) ---
// Enemies are never wiped at wave end. A wave advances when the kill quota
// is met OR the timer runs out; survivors carry over (`enemy.carried`).
export const waveKillQuota = (w: number): number => Math.floor(8 + w * 1.5);
export const waveTimerSec = (w: number): number => 30 + Math.min(w, 30);
/** Crowd budget: max non-boss enemies alive at a given wave. */
export const maxAlive = (w: number): number => Math.min(300, 40 + w * 3);
/** Seconds after a wave starts during which spawns ramp from 0 → full rate. */
export const WAVE_GRACE_SEC = 3;
export const WAVE_RAMP_SEC = 10;
/** During a boss: cap for non-boss adds (2B refines composition). */
export const BOSS_ADD_CAP = 20;
/** Essence bonus for enemies that survived a wave change. */
export const CARRIED_REWARD_MULT = 1.1;
/** If nothing is alive and quota is unmet, force a spawn this often (frames). */
export const STARVE_SPAWN_FRAMES = 20;
