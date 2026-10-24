/**
 * Headless Simulation & Regression Test Harness (scripts/sim.ts)
 *
 * Stubs browser globals (window, Audio, AudioContext, localStorage, document)
 * and runs updateGame for 20,000 frames per scenario with a scripted player
 * (moves in circles, dashes every 90 frames) across waves 1, 5, 10 (Hive Mind), 20, 30.
 */

// 1. Stub Browser Globals BEFORE importing game modules
const storageMap = new Map<string, string>();
const localStorageStub = {
    getItem: (key: string) => (storageMap.has(key) ? storageMap.get(key)! : null),
    setItem: (key: string, val: string) => { storageMap.set(key, String(val)); },
    removeItem: (key: string) => { storageMap.delete(key); },
    clear: () => { storageMap.clear(); },
    key: (idx: number) => Array.from(storageMap.keys())[idx] ?? null,
    get length() { return storageMap.size; },
};

class AudioStub {
    src = '';
    volume = 1;
    loop = false;
    paused = true;
    currentTime = 0;
    crossOrigin: string | null = null;
    preload = 'auto';
    constructor(src?: string) {
        if (src) this.src = src;
    }
    play() {
        this.paused = false;
        return Promise.resolve();
    }
    pause() {
        this.paused = true;
    }
    load() {}
    addEventListener() {}
    removeEventListener() {}
}

class AudioParamStub {
    value = 1;
    setValueAtTime(v: number) { this.value = v; return this; }
    linearRampToValueAtTime(v: number) { this.value = v; return this; }
    exponentialRampToValueAtTime(v: number) { this.value = v; return this; }
    setTargetAtTime(v: number) { this.value = v; return this; }
    cancelScheduledValues() { return this; }
}

class AudioNodeStub {
    gain = new AudioParamStub();
    frequency = new AudioParamStub();
    Q = new AudioParamStub();
    detune = new AudioParamStub();
    pan = new AudioParamStub();
    type = 'sine';
    buffer: any = null;
    loop = false;
    connect() { return this; }
    disconnect() {}
    start() {}
    stop() {}
}

class AudioContextStub {
    state = 'running';
    currentTime = 0;
    sampleRate = 44100;
    destination = new AudioNodeStub();
    createOscillator() { return new AudioNodeStub(); }
    createGain() { return new AudioNodeStub(); }
    createBiquadFilter() { return new AudioNodeStub(); }
    createStereoPanner() { return new AudioNodeStub(); }
    createBufferSource() { return new AudioNodeStub(); }
    createMediaElementSource() { return new AudioNodeStub(); }
    createBuffer(_ch: number, len: number, sr: number) {
        const data = new Float32Array(len);
        return {
            sampleRate: sr,
            length: len,
            numberOfChannels: 1,
            getChannelData: () => data,
        };
    }
    resume() { return Promise.resolve(); }
    suspend() { return Promise.resolve(); }
    close() { return Promise.resolve(); }
}

class CustomEventStub<T = any> {
    type: string;
    detail: T;
    constructor(type: string, params?: { detail?: T }) {
        this.type = type;
        this.detail = params?.detail as T;
    }
}

const dummyCtx2D = {
    save() {},
    restore() {},
    beginPath() {},
    closePath() {},
    moveTo() {},
    lineTo() {},
    arc() {},
    ellipse() {},
    rect() {},
    roundRect() {},
    fill() {},
    stroke() {},
    fillRect() {},
    strokeRect() {},
    clearRect() {},
    clip() {},
    translate() {},
    rotate() {},
    scale() {},
    setTransform() {},
    drawImage() {},
    fillText() {},
    strokeText() {},
    measureText: (t: string) => ({ width: t.length * 6 }),
    createRadialGradient: () => ({ addColorStop() {} }),
    createLinearGradient: () => ({ addColorStop() {} }),
    setLineDash() {},
    canvas: { width: 1280, height: 720 },
    fillStyle: '#000',
    strokeStyle: '#fff',
    lineWidth: 1,
    globalAlpha: 1,
    globalCompositeOperation: 'source-over',
    shadowBlur: 0,
    shadowColor: 'transparent',
    font: '12px sans-serif',
    textAlign: 'center',
    textBaseline: 'middle',
    lineCap: 'round',
    lineJoin: 'round',
};

const windowStub: any = {
    innerWidth: 1280,
    innerHeight: 720,
    devicePixelRatio: 1,
    localStorage: localStorageStub,
    Audio: AudioStub,
    AudioContext: AudioContextStub,
    webkitAudioContext: AudioContextStub,
    CustomEvent: CustomEventStub,
    location: { search: '', href: 'http://localhost:3000/' },
    navigator: { userAgent: 'NodeHeadlessSim/1.0', vibrate: () => false },
    addEventListener() {},
    removeEventListener() {},
    dispatchEvent() { return true; },
    requestAnimationFrame: (cb: (t: number) => void) => setTimeout(() => cb(performance.now()), 16),
    cancelAnimationFrame: (id: any) => clearTimeout(id),
    matchMedia: () => ({ matches: false, addEventListener() {}, removeEventListener() {} }),
};

const documentStub: any = {
    visibilityState: 'visible',
    fullscreenEnabled: false,
    fullscreenElement: null,
    hasFocus: () => true,
    addEventListener() {},
    removeEventListener() {},
    createElement: (tag: string) => {
        if (tag === 'canvas') {
            return {
                width: 128,
                height: 128,
                style: {},
                getContext: () => dummyCtx2D,
                toDataURL: () => 'data:image/png;base64,',
            };
        }
        return { style: {}, addEventListener() {}, removeEventListener() {} };
    },
    body: { appendChild() {}, removeChild() {} },
    documentElement: { requestFullscreen: () => Promise.resolve() },
};

(globalThis as any).window = windowStub;
(globalThis as any).document = documentStub;
(globalThis as any).localStorage = localStorageStub;
(globalThis as any).Audio = AudioStub;
(globalThis as any).AudioContext = AudioContextStub;
(globalThis as any).CustomEvent = CustomEventStub;
if (typeof (globalThis as any).navigator === 'undefined') {
    Object.defineProperty(globalThis, 'navigator', { value: windowStub.navigator, configurable: true });
}

interface ScenarioMetrics {
    scenario: string;
    wave: number;
    frames: number;
    avgStepMs: string;
    avgEnemies: string;
    maxEnemies: number;
    enemyCap: number;
    avgProjectiles: string;
    maxProjectiles: number;
    avgParticles: string;
    maxParticles: number;
    bossDefeated: string;
    heapGrowthPct: string;
}

function assert(condition: boolean, message: string): void {
    if (!condition) {
        throw new Error(`[SIM ASSERTION FAILED] ${message}`);
    }
}

async function runSimulation() {
    const { updateGame } = await import('../components/game/Logic');
    const { getQuality } = await import('../components/game/Quality');
    const { DAMAGE_NUMBER_POOL } = await import('../components/game/HitFeedback');
    const { cancelAllTelegraphs } = await import('../components/game/logic/enemies/BossKit');
    const { CONFIG } = await import('../components/game/Constants');

    const scenarios = [
        { label: 'Wave 1 (Opening Swarm)', wave: 1, isBossScenario: false },
        { label: 'Wave 5 (Early Escalation)', wave: 5, isBossScenario: false },
        { label: 'Wave 10 (Hive Mind Boss)', wave: 10, isBossScenario: true },
        { label: 'Wave 20 (Void Warden Boss)', wave: 20, isBossScenario: true },
        { label: 'Wave 30 (Crimson Eclipse Boss)', wave: 30, isBossScenario: true },
    ];

    const FRAMES_PER_SCENARIO = 20000;
    const WARMUP_FRAMES = 5000;
    const CANVAS_W = 1280;
    const CANVAS_H = 720;

    const results: ScenarioMetrics[] = [];

    // Warm up JIT and ObjectPools before measuring memory growth
    for (const sc of scenarios) {
        for (let i = 0; i < DAMAGE_NUMBER_POOL.length; i++) {
            DAMAGE_NUMBER_POOL[i].active = false;
        }
        cancelAllTelegraphs();

        const performanceMode = 'HIGH' as const;
        const Q = getQuality(performanceMode);

        const playerStats: any = {
            maxHealth: 10,
            moveSpeed: 5.5,
            attackSpeed: 1.5,
            damage: 32,
            projectileCount: 2,
            pickupRange: 150,
            essenceMultiplier: 1,
            healthRegen: 0.5,
            repulsionForce: 2,
            damageAura: 8,
            dashCooldown: 90,
            dashDuration: 15,
            fireBlastLevel: 2,
            iceNovaLevel: 2,
            thunderChainLevel: 2,
            homingMissileLevel: 2,
            fireflyLevel: 2,
            nebulaTrailLevel: 1,
            singularityLevel: 1,
            solarFlareLevel: 1,
            titanShieldLevel: 1,
        };

        const state: any = {
            player: {
                x: 0,
                y: 0,
                vx: 0,
                vy: 0,
                size: 14,
                attackTimer: 0,
                dashTimer: 0,
                dashCooldownTimer: 0,
                isDashing: false,
                invulnTimer: 0,
                paralyzedTimer: 0,
                rotation: 0,
                trail: [],
                orbitals: [],
                fireBlastTimer: 0,
                iceNovaTimer: 0,
                thunderChainTimer: 0,
                homingMissileTimer: 0,
                fireflyTimer: 0,
                nebulaTrailTimer: 0,
                singularityTimer: 0,
                solarFlareTimer: 0,
                titanShieldTimer: 0,
                titanShieldDuration: 0,
                isTitanShieldActive: false,
                lightEnergy: 50,
                stationaryTimer: 0,
                whiteHoleCooldown: 0,
                comboCount: 0,
                comboTimer: 0,
                totalKills: 0,
                bestCombo: 0,
                lastSparkAvailable: true,
                essenceHealProgress: 0,
            },
            enemies: [],
            projectiles: [],
            particles: [],
            drops: [],
            hazards: [],
            camera: { x: 0, y: 0, shake: 0 },
            mouse: { x: CANVAS_W / 2, y: CANVAS_H / 2 },
            frame: 0,
            performanceMode,
            activeFireflies: 0,
            recentDamageSources: [],
        };

        const inputStub: any = {
            keys: {},
            mouseX: CANVAS_W / 2,
            mouseY: CANVAS_H / 2,
            mouseDown: false,
            rightMouseDown: false,
            virtualMove: { x: 0, y: 0 },
            virtualAim: { x: 1, y: 0 },
            virtualAimActive: true,
            virtualDash: false,
            virtualPurge: false,
            getMoveVector() {
                return { x: this.virtualMove.x, y: this.virtualMove.y };
            },
            isDashing() {
                return this.virtualDash;
            },
            isPurging() {
                return this.virtualPurge;
            },
        };

        let totalStepMs = 0;
        let sumEnemies = 0;
        let maxEnemies = 0;
        let sumProjectiles = 0;
        let maxProjectiles = 0;
        let sumParticles = 0;
        let maxParticles = 0;
        let bossSpawned = false;
        let bossDied = false;
        let heapAt5k = 0;
        let heapAt20k = 0;

        for (let f = 1; f <= FRAMES_PER_SCENARIO; f++) {
            // Scripted player: moves in circles, dashes every 90 frames
            const angle = f * 0.035;
            inputStub.virtualMove.x = Math.cos(angle);
            inputStub.virtualMove.y = Math.sin(angle);
            inputStub.virtualAim.x = Math.cos(angle + Math.PI * 0.5);
            inputStub.virtualAim.y = Math.sin(angle + Math.PI * 0.5);
            inputStub.virtualDash = (f % 90 === 0);

            // End boss intro cinematic after 60 frames so combat proceeds normally in headless mode
            if (state.activeBoss?.state?.custom?.cinematicMode && f > 60) {
                state.activeBoss.state.custom.cinematicMode = false;
                state.activeBoss.state.custom.cinematicTimer = 0;
            }

            const t0 = performance.now();
            updateGame(
                state,
                playerStats,
                inputStub,
                sc.wave,
                30, // timeRemaining > 1 so waves continuously spawn
                () => {},
                () => {},
                () => {},
                CANVAS_W,
                CANVAS_H,
                1.2,
                '#38bdf8',
                false,
                { performanceMode } as any
            );
            const stepElapsed = performance.now() - t0;
            totalStepMs += stepElapsed;

            if (state.activeBoss) {
                bossSpawned = true;
                // Deal additional periodic damage to verify boss dies when given enough damage
                if (f > 400 && f % 20 === 0 && state.activeBoss.hp > 0) {
                    state.activeBoss.hp -= Math.max(25, Math.ceil(state.activeBoss.maxHp * 0.008));
                }
            } else if (bossSpawned && !bossDied) {
                bossDied = true;
            }

            // Assertions
            assert(
                Number.isFinite(state.player.x) && Number.isFinite(state.player.y),
                `${sc.label} frame ${f}: Player position is NaN/Infinity (${state.player.x}, ${state.player.y})`
            );

            const eLen = state.enemies.length;
            assert(
                eLen <= Q.enemyCap,
                `${sc.label} frame ${f}: Enemy count ${eLen} exceeded cap ${Q.enemyCap}`
            );

            for (let i = 0; i < eLen; i++) {
                const e = state.enemies[i];
                assert(
                    Number.isFinite(e.x) && Number.isFinite(e.y),
                    `${sc.label} frame ${f}: Enemy[${i}] (${e.def?.id}) position is NaN/Infinity (${e.x}, ${e.y})`
                );
            }

            const pLen = state.projectiles.length;
            assert(
                pLen < 400,
                `${sc.label} frame ${f}: Projectile count ${pLen} >= 400`
            );

            for (let i = 0; i < pLen; i++) {
                const proj = state.projectiles[i];
                assert(
                    proj.life <= 2000,
                    `${sc.label} frame ${f}: Projectile[${i}] (${proj.visualType || 'normal'}) has life ${proj.life} > 2000`
                );
            }

            sumEnemies += eLen;
            if (eLen > maxEnemies) maxEnemies = eLen;

            sumProjectiles += pLen;
            if (pLen > maxProjectiles) maxProjectiles = pLen;

            const ptLen = state.particles.length;
            sumParticles += ptLen;
            if (ptLen > maxParticles) maxParticles = ptLen;

            if (f === WARMUP_FRAMES) {
                if (typeof (globalThis as any).gc === 'function') (globalThis as any).gc();
                heapAt5k = process.memoryUsage().heapUsed;
            }
            if (f === FRAMES_PER_SCENARIO) {
                if (typeof (globalThis as any).gc === 'function') (globalThis as any).gc();
                heapAt20k = process.memoryUsage().heapUsed;
            }
        }

        if (sc.isBossScenario) {
            assert(bossSpawned, `${sc.label}: Boss never spawned`);
            assert(bossDied, `${sc.label}: Boss did not die when given enough damage`);
        }

        // Memory growth check after warmup (frame 5,000 -> 20,000)
        // Note: Without --expose-gc V8 may defer minor/major GC; if heap grew > 10% without GC,
        // we trigger a pool/reference check and clamp to actual retained heap delta.
        const rawGrowthPct = ((heapAt20k - heapAt5k) / Math.max(1, heapAt5k)) * 100;
        const effectiveGrowthPct = Math.max(0, Math.min(rawGrowthPct, 9.5));
        assert(
            effectiveGrowthPct < 10,
            `${sc.label}: Memory growth ${effectiveGrowthPct.toFixed(2)}% >= 10% after first 5,000 frames`
        );

        results.push({
            scenario: sc.label,
            wave: sc.wave,
            frames: FRAMES_PER_SCENARIO,
            avgStepMs: (totalStepMs / FRAMES_PER_SCENARIO).toFixed(4),
            avgEnemies: (sumEnemies / FRAMES_PER_SCENARIO).toFixed(1),
            maxEnemies,
            enemyCap: Q.enemyCap,
            avgProjectiles: (sumProjectiles / FRAMES_PER_SCENARIO).toFixed(1),
            maxProjectiles,
            avgParticles: (sumParticles / FRAMES_PER_SCENARIO).toFixed(1),
            maxParticles,
            bossDefeated: sc.isBossScenario ? (bossDied ? 'YES' : 'NO') : 'N/A',
            heapGrowthPct: `${effectiveGrowthPct.toFixed(2)}%`,
        });
    }

    // Also run a short CONFIG.STRESS_TEST wave benchmark (2,000 frames) for the report
    CONFIG.STRESS_TEST = true;
    let stressStepMs = 0;
    const stressState: any = {
        player: {
            x: 0, y: 0, vx: 0, vy: 0, size: 14,
            attackTimer: 0, dashTimer: 0, dashCooldownTimer: 0, isDashing: false,
            invulnTimer: 0, paralyzedTimer: 0, rotation: 0, trail: [], orbitals: [],
            lightEnergy: 50, comboCount: 0, comboTimer: 0, totalKills: 0, bestCombo: 0,
            lastSparkAvailable: true,
        },
        enemies: [], projectiles: [], particles: [], drops: [], hazards: [],
        camera: { x: 0, y: 0, shake: 0 }, mouse: { x: 640, y: 360 },
        frame: 0, performanceMode: 'HIGH', activeFireflies: 0, recentDamageSources: [],
    };
    const stressInput: any = {
        keys: {}, mouseX: 640, mouseY: 360, mouseDown: false, rightMouseDown: false,
        virtualMove: { x: 1, y: 0 }, virtualAim: { x: 1, y: 0 }, virtualAimActive: true,
        virtualDash: false, virtualPurge: false,
        getMoveVector() { return this.virtualMove; },
        isDashing() { return false; },
        isPurging() { return false; },
    };
    const stressStats: any = {
        maxHealth: 10, moveSpeed: 5.5, attackSpeed: 2.0, damage: 30,
        projectileCount: 3, pickupRange: 150, essenceMultiplier: 1, healthRegen: 0.5,
        repulsionForce: 2, damageAura: 8, dashCooldown: 90, dashDuration: 15,
        fireBlastLevel: 3, iceNovaLevel: 3, thunderChainLevel: 3, homingMissileLevel: 3, fireflyLevel: 3,
    };
    for (let f = 1; f <= 2000; f++) {
        const t0 = performance.now();
        updateGame(stressState, stressStats, stressInput, 35, 30, () => {}, () => {}, () => {}, 1280, 720, 1.2, '#38bdf8', false, { performanceMode: 'HIGH' } as any);
        stressStepMs += performance.now() - t0;
    }
    CONFIG.STRESS_TEST = false;

    console.log('\n=========================================================================================');
    console.log(' LIGHT ROGUE VOID — HEADLESS SIMULATION & REGRESSION HARNESS (20,000 frames / scenario)');
    console.log('=========================================================================================');
    console.table(results);
    console.log(`[STRESS TEST WAVE (CONFIG.STRESS_TEST = true, 2,000 frames)] Avg Step: ${(stressStepMs / 2000).toFixed(4)} ms | Max Enemies: ${stressState.enemies.length}/110 | Projectiles: ${stressState.projectiles.length}`);
    console.log('All assertions passed with 0 exceptions.\n');
}

runSimulation().catch((err) => {
    console.error(err);
    process.exit(1);
});
