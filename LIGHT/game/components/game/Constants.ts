
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
/** (4B) NO crowd cap — rule 9. Kept only as a *reference* density used by the director to scale pack size; never used to block a spawn. */
export const refDensity = (w: number): number => 40 + w * 3;
/** Seconds after a wave starts during which spawns ramp from 0 → full rate. */
export const WAVE_GRACE_SEC = 3;
export const WAVE_RAMP_SEC = 10;
/** (4B) No boss-add cap (rule 9). Packs just keep landing every BOSS_ADD_INTERVAL_SEC. */
/** Essence bonus for enemies that survived a wave change. */
export const CARRIED_REWARD_MULT = 1.1;
/** If nothing is alive and quota is unmet, force a spawn this often (frames). */
export const STARVE_SPAWN_FRAMES = 20;

// --- BALANCE CURVES (8B) --- everything the sim (`npm run sim`) tunes lives here. See docs/BALANCE.md.
/** Quadratic term of enemy HP: base + wave·hpScaling + wave²·ENEMY_HP_QUAD (makes 40+ hurt). */
export const ENEMY_HP_QUAD = 0.5;
/** Global enemy HP multiplier per chapter (index 0 = chapter 1). */
export const ENEMY_HP_CHAPTER_MULT = [1, 1, 1, 1, 1, 1];
export const enemyHpAt = (baseHp: number, hpScaling: number, wave: number): number =>
  Math.max(1, Math.round((baseHp + wave * hpScaling + wave * wave * ENEMY_HP_QUAD) * ENEMY_HP_CHAPTER_MULT[chapterIndexOf(wave) - 1]));
export const ENEMY_SPEED_PER_WAVE = 0.05;
export const enemySpeedAt = (baseSpeed: number, wave: number): number => baseSpeed + wave * ENEMY_SPEED_PER_WAVE;
/** Contact damage (player HP is small integers: 3 fresh). EXPLODE adds its burst in the same hit. */
export const ENEMY_CONTACT_DMG = 1;
export const ENEMY_EXPLODE_DMG = 3;
export const enemyContactDmg = (behavior: string): number => (behavior === 'EXPLODE' ? ENEMY_EXPLODE_DMG : ENEMY_CONTACT_DMG);
/** Essence per kill = def.essenceReward × (1 + wave·ESSENCE_PER_WAVE). */
export const ESSENCE_PER_WAVE = 0;
export const essenceRewardAt = (base: number, wave: number): number => base * (1 + wave * ESSENCE_PER_WAVE);
/** Matter banked per essence picked up (essence and matter are the same currency today). */
export const MATTER_PER_ESSENCE = 1;
/** Boss HP = def.baseHp × BOSS_HP_MULT[chapter-1]. */
export const BOSS_HP_MULT = [0.6, 1.4, 0.8, 1.5, 1.6, 2.5]; // (8B step 3) sim-tuned: god-mode TTK with the expected tree → 60–120 s (docs/BALANCE.md)
export const bossHpFor = (baseHp: number, wave: number): number => Math.round(baseHp * BOSS_HP_MULT[chapterIndexOf(wave) - 1]);
/** Special (x5 flavor) waves: enemy HP / essence multipliers while a flavor is active. */
export const SPECIAL_WAVE_HP_MULT = 1;
export const SPECIAL_WAVE_ESSENCE_MULT = 1;

// --- ACTION FEEL (4A) --- see components/game/Feel.ts
export const HIT_STOP_MAX_FRAMES = 4;      // longest freeze
export const HIT_STOP_MIN_INTERVAL = 10;   // frames between freezes
export const SHAKE_MAX_AMP = 12;           // px budget
export const SHAKE_DECAY = 0.82;           // per frame after hold
export const ENEMY_FLASH_FRAMES = 4;
export const FLOATER_POOL_SIZE = 120;
export const FLOATER_LIFE = 34;            // frames
export const FLOATER_GROUP_FRAMES = 6;     // hits on the same enemy within this window merge
export const FLOATER_MIN_PCT = 0.03;       // skip chip damage below 3 % max HP (unless ≥ 5 dmg)
export const FLOATER_CRIT_PCT = 0.25;      // ≥ 25 % max HP in one number = gold crit
export const STREAK_WINDOW_FRAMES = 90;    // 1.5 s between kills keeps the streak
export const STREAK_TIERS = [10, 25, 50];
export const STREAK_ESSENCE_PER_10 = 0.01; // +1 % essence per 10 streak
export const STREAK_ESSENCE_CAP = 0.20;    // cap +20 %
export const STREAK_BANNER_FRAMES = 110;
export const PLAYER_IFRAMES = 18;          // 0.3 s
export const HURT_VIGNETTE_FRAMES = 14;
export const RENDER_CULL_PAD = 64;        // (7B) px outside the viewport before an entity is skipped by the renderer (never affects simulation)
export const ENEMY_BATCH_MIN_VISIBLE = 120; // (7B) MEDIUM/HIGH: plain enemies draw as batched silhouettes once this many are on screen (LOW: always). LOD, not a cap.
export const LOW_HP_PCT = 0.25;            // heartbeat tint below this

// --- POOLS (4A/4B) --- see components/game/Pools.ts. These size the FREE LISTS only (how many dead
// objects we keep for reuse). They are NOT live-count caps — rule 9: no particle / projectile / entity caps.
export const PARTICLE_FREE_LIST = 4096;
export const PROJECTILE_FREE_LIST = 2048;
export const DROP_FREE_LIST = 1024;

// --- BOSS KIT (2B) --- see components/game/logic/enemies/BossKit.ts, docs/BOSSES.md
export const TELEGRAPH_POOL_SIZE = 24;
export const TELEGRAPH_FLASH_FRAMES = 8;      // white flash after a telegraph fires
export const TELEGRAPH_ALPHA_MIN = 0.15;      // fill alpha at warn start
export const TELEGRAPH_ALPHA_MAX = 0.45;      // fill alpha right before firing
export const BOSS_PHASE_THRESHOLDS = [0.66, 0.33]; // HP fractions where phase 2 / 3 start
export const BOSS_PHASE_SHIFT_FRAMES = 72;    // 1.2 s invulnerable + arena pulse
export const BOSS_ENRAGE_SEC = 150;           // boss alive this long → enrage
export const BOSS_ENRAGE_DMG_MULT = 2;
export const BOSS_ENRAGE_WARN_MULT = 0.7;     // telegraph warn frames × this when enraged
// (4B) no BOSS_PROJ_CAP — rule 9
export const BOSS_PROJ_LIFE = 360;
export const ARENA_RADIUS = 900;
export const VOID_BURN_DPS = 0.04;            // fraction of max HP per second outside the arena
export const VOID_BURN_TICK_FRAMES = 30;      // damage is applied in ticks (i-frames would eat per-frame dmg)
export const BOSS_ADD_INTERVAL_SEC = 12;
export const BOSS_ADD_PACK_MIN = 3;
export const BOSS_ADD_PACK_MAX = 5;
export const BOSS_ADD_WARN_FRAMES = 60;       // telegraph circle before a pack lands
export const BOSS_ARRIVAL_FRAMES = 120;       // 2 s "NOW ARRIVING" reveal
// (2C) persistent terrain hazards (BossHazards.ts)
export const HAZARD_WARN_FRAMES = 70;         // telegraph before a hazard lands
export const HAZARD_TICK_FRAMES = 20;         // damage tick while standing in one
export const HAZARD_CAP = 18;                 // hard cap of live hazards (bosses set their own max ≤ this)
export const FIREBALL_BREAKS_BOSS_PROJ = true; // player FIRE_BLAST destroys boss bullets it touches

// (2B+) BigFx — cinematic explosions (components/game/BigFx.ts)
export const BIGFX_MAX = 6;                   // live big explosions
export const BIGFX_SHAKE_MAX = 26;            // px, heavy shake budget (White Hole / boss death)

// --- ENEMY VARIETY (4B) --- see data/affixes.ts, logic/Director.ts, components/game/waveFlavors.ts, docs/ENEMIES.md
export const AFFIX_BASE_CHANCE = 0.05;        // elite chance at wave 0
export const AFFIX_PER_WAVE = 0.004;          // +0.4 % per wave
export const AFFIX_CHANCE_CAP = 0.30;
export const AFFIX_DOUBLE_WAVE = 30;          // from this wave an elite may roll a second affix (25 %)
export const PACK_MIN = 3;                    // director pack size
export const PACK_MAX = 8;
export const PACK_WARN_FRAMES = 36;           // 0.6 s spawn telegraph before a pack lands
export const PACK_INTERVAL_SEC = 7;           // seconds between packs (scaled down by wave, floor 3.5)
export const PACK_SPAWN_DIST = 760;           // packs land this far from the player (just off screen)
export const ENEMY_SHOT_WARN_FRAMES = 24;     // 0.4 s glow before a SNIPER / SHOOT_* enemy fires
// (4B) no ENEMY_PROJ_CAP — rule 9; enemy shots are pooled (acquireProjectile) and batch-drawn instead

// --- DISCOVERY (3A) --- see data/world.ts, logic/WorldLogic.ts, renderer/WorldRenderer.ts, docs/WORLD.md
export const WORLD_POINT_MARGIN = 220;        // px from the world edge a point may be placed
export const WORLD_MIN_SPAWN_DIST = 600;      // px from the run spawn (0,0)
export const WORLD_MIN_POINT_DIST = 500;      // px between any two points
export const WORLD_TOUCH_RADIUS = 70;         // walk inside this → the point triggers
export const WORLD_GLOW_RANGE = 900;          // undiscovered points pulse when the player is this close
export const WORLD_ARROW_CHAPTERS = 2;        // off-screen arrow hint only in chapters 1–2
export const WORLD_CARD_FRAMES = 240;         // 4 s lore card / toast
export const WORLD_FOG_GRID = 20;             // minimap cells per side
export const WORLD_RELIC_GUARDS = 8;          // elites guarding a relic alcove
export const WORLD_GUARD_WARN_FRAMES = 48;    // 0.8 s telegraph before guards land
export const WORLD_EVENT_RING = 320;          // ambush ring radius around the event point
export const WORLD_SPARK_RADIUS = 180;        // Lost Spark: stay this close to kindle it
export const WORLD_SPARK_KINDLE_SEC = 8;      // seconds inside the radius needed
export const WORLD_STAR_SHARD_EVERY = 30;     // frames between Collapsing Star shards
export const WORLD_STAR_SHARD_R = 70;         // shard impact radius
export const WORLD_STAR_SHARD_DMG = 0.12;     // fraction of max HP per shard hit

// --- STORY (3B) ---
export const STORY_CAPTION_CPS = 30;          // typewriter chars per second
export const STORY_CAPTION_HOLD_MS = 4000;    // hold after the line is fully typed
export const CHAPTER_CARD_MS = 2000;          // chapter title card wash on chapter entry

// (3B step 6) LIGHT BURST — tree-unlocked manual ability. Numbers are 8B's to tune.
export const BURST_RADIUS = 440;              // px
export const BURST_DMG_PER_WAVE = 8;          // damage = 8 × wave (× level bonus)
export const BURST_STUN_FRAMES = 60;          // 1 s (non-boss only)
export const BURST_FILL_PER_KILL = 0.01;      // 1 % per kill
export const BURST_FILL_PER_ESSENCE = 0.0005; // per raw essence point picked up (≈ 0.5 % per 10 essence)
export const BURST_LEVEL_DMG_MULT = 0.35;     // +35 % damage per level above 1
export const BURST_LEVEL_FILL_MULT = 0.25;    // +25 % fill speed per level above 1
export const BURST_KNOCKBACK = 14;

// (7A) Respec: refund every unlocked node except `spark`, minus this tax.
export const RESPEC_TAX = 0.2;

// (7B) touch controls — floating sticks
export const TOUCH_DEAD_ZONE_PX = 8;      // thumb must move this far before the stick registers
export const TOUCH_STICK_RADIUS_PX = 56;  // full deflection ring radius (CSS px)
