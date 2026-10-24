import { SideMission } from '../types';

export function generateSideMissionForNode(mapId: string, wave: number): SideMission | undefined {
    // If wave is a boss wave or special mission node (wave >= 100 or mission/secret id), NO side mission!
    if ((wave > 0 && wave % 10 === 0) || wave >= 100 || mapId.startsWith('mission_') || mapId.startsWith('secret_') || mapId.startsWith('region_7') || mapId.startsWith('region_8') || mapId.startsWith('region_9') || mapId.startsWith('region_10') || mapId.startsWith('region_secret')) {
        return undefined;
    }

    // Clamp coordinates safely within sandbox boundary (-1400 to +1400)
    const clampCoord = (val: number) => Math.max(-1400, Math.min(1400, val));

    // First main node map_1 special intro side mission
    if (mapId === 'map_1') {
        const targetCount = 5;
        const collectTargets = [];
        for (let i = 0; i < targetCount; i++) {
            const angle = (Math.PI * 2 / targetCount) * i;
            const dist = 220 + (i * 35);
            collectTargets.push({
                id: `col_map1_${i}`,
                x: clampCoord(Math.cos(angle) * dist),
                y: clampCoord(Math.sin(angle) * dist),
                collected: false,
                color: '#38bdf8'
            });
        }
        return {
            type: 'COLLECT',
            variant: 'ESSENCE',
            title: 'Stellar Resonance',
            description: 'Gather 5 stellar essence motes nearby to synthesize a Vault Key.',
            target: targetCount,
            current: 0,
            started: false,
            completed: false,
            collectTargets
        };
    }

    // Determine numeric id from mapId or wave tier
    let numId = 1;
    const match = mapId ? mapId.match(/\d+/) : null;
    if (match) {
        numId = parseInt(match[0], 10);
    } else {
        numId = Math.floor(wave / 10) + 1;
    }

    // Unique seed combining map node and wave
    const seed = numId * 7 + Math.floor((wave - 1) / 10) * 3;

    // Type selection: rotate through COLLECT, CAPTURE, DESTROY across main map nodes
    const types: Array<'COLLECT' | 'CAPTURE' | 'DESTROY'> = ['COLLECT', 'CAPTURE', 'DESTROY'];
    const typeIndex = (seed - 1) % 3;
    const chosenType = types[typeIndex];

    // Variant selection based on seed
    const variantIndex = seed % 3;

    if (chosenType === 'CAPTURE') {
        if (variantIndex === 0) {
            // Variant 1: Single Sector
            const angle = (seed * 1.3) % (Math.PI * 2);
            const dist = 500 + (seed * 180) % 800; // 500 to 1300
            return {
                type: 'CAPTURE',
                variant: 'SINGLE',
                title: 'Sector Stabilization',
                description: 'Stand in the beacon zone to stabilize the localized void sector.',
                target: 300,
                current: 0,
                started: false,
                completed: false,
                captureZone: {
                    x: clampCoord(Math.cos(angle) * dist),
                    y: clampCoord(Math.sin(angle) * dist),
                    radius: 100,
                    captureTimeTotal: 300,
                    captureTimeCurrent: 0
                }
            };
        } else if (variantIndex === 1) {
            // Variant 2: Multi-Point Moving Sentry Zones
            const captureZones = [];
            const count = 3;
            for (let i = 0; i < count; i++) {
                const angle = (Math.PI * 2 / count) * i + seed * 0.5;
                const dist = 600 + (i * 350 + seed * 100) % 750; // 600 to 1350
                captureZones.push({
                    id: `cz_multi_${seed}_${i}`,
                    x: clampCoord(Math.cos(angle) * dist),
                    y: clampCoord(Math.sin(angle) * dist),
                    vx: Math.cos(angle + Math.PI / 2) * 1.2,
                    vy: Math.sin(angle + Math.PI / 2) * 1.2,
                    radius: 75,
                    progress: 0,
                    captured: false
                });
            }
            return {
                type: 'CAPTURE',
                variant: 'MULTI_MOVING',
                title: 'Triple Orbital Beacons',
                description: 'Capture 3 drifting orbital sentry zones scattered across space.',
                target: 3,
                current: 0,
                started: false,
                completed: false,
                captureZones
            };
        } else {
            // Variant 3: Timed Rift Capture
            const angle = (seed * 2.1) % (Math.PI * 2);
            const dist = 550 + (seed * 220) % 750; // 550 to 1300
            return {
                type: 'CAPTURE',
                variant: 'TIMED',
                title: 'Unstable Rift Capture',
                description: 'Secure the unstable rift beacon before the timer expires!',
                target: 240,
                current: 0,
                started: false,
                completed: false,
                timeLimit: 90,
                timeRemaining: 90,
                captureZone: {
                    x: clampCoord(Math.cos(angle) * dist),
                    y: clampCoord(Math.sin(angle) * dist),
                    radius: 90,
                    captureTimeTotal: 240,
                    captureTimeCurrent: 0
                }
            };
        }
    } else if (chosenType === 'COLLECT') {
        if (variantIndex === 0) {
            // Variant 1: Blue Essence Droplets (Dispersed across the ENTIRE sandbox)
            const targetCount = 8;
            const collectTargets = [];
            for (let i = 0; i < targetCount; i++) {
                const angle = (Math.PI * 2 / targetCount) * i + (seed * 0.8);
                const dist = 350 + ((i * 380 + seed * 130) % 1050); // 350 to 1400
                collectTargets.push({
                    id: `col_${seed}_${i}`,
                    x: clampCoord(Math.cos(angle) * dist),
                    y: clampCoord(Math.sin(angle) * dist),
                    collected: false,
                    color: '#22d3ee'
                });
            }
            return {
                type: 'COLLECT',
                variant: 'ESSENCE',
                title: 'Stellar Essence Harvest',
                description: 'Gather 8 blue stellar essence droplets scattered across the sandbox.',
                target: targetCount,
                current: 0,
                started: false,
                completed: false,
                collectTargets
            };
        } else if (variantIndex === 1) {
            // Variant 2: Timed Dark Essence Motes (Dispersed across the ENTIRE sandbox)
            const targetCount = 10;
            const collectTargets = [];
            for (let i = 0; i < targetCount; i++) {
                const angle = (Math.PI * 2 / targetCount) * i + (seed * 0.7);
                const dist = 400 + ((i * 320 + seed * 150) % 1000); // 400 to 1400
                collectTargets.push({
                    id: `col_timed_${seed}_${i}`,
                    x: clampCoord(Math.cos(angle) * dist),
                    y: clampCoord(Math.sin(angle) * dist),
                    collected: false,
                    color: '#e879f9'
                });
            }
            return {
                type: 'COLLECT',
                variant: 'TIMED_ESSENCE',
                title: 'Rapid Anomaly Containment',
                description: 'Collect 10 volatile dark essence motes across the sandbox in 2 minutes!',
                target: targetCount,
                current: 0,
                started: false,
                completed: false,
                timeLimit: 120,
                timeRemaining: 120,
                collectTargets
            };
        } else {
            // Variant 3: Drifting Starlight Orbs (Dispersed across the ENTIRE sandbox)
            const targetCount = 6;
            const collectTargets = [];
            for (let i = 0; i < targetCount; i++) {
                const angle = (Math.PI * 2 / targetCount) * i + seed;
                const dist = 450 + ((i * 360 + seed * 110) % 950);
                const speed = 1.0 + (i % 3) * 0.4;
                collectTargets.push({
                    id: `col_mov_${seed}_${i}`,
                    x: clampCoord(Math.cos(angle) * dist),
                    y: clampCoord(Math.sin(angle) * dist),
                    vx: Math.cos(angle + Math.PI / 2) * speed,
                    vy: Math.sin(angle + Math.PI / 2) * speed,
                    collected: false,
                    color: '#38bdf8'
                });
            }
            return {
                type: 'COLLECT',
                variant: 'MOVING_ESSENCE',
                title: 'Chasing Starlight',
                description: 'Intercept drifting starlight motes wandering through space.',
                target: targetCount,
                current: 0,
                started: false,
                completed: false,
                collectTargets
            };
        }
    } else {
        // DESTROY
        if (variantIndex === 0) {
            // Variant 1: Ancient Void Pylons
            const destroyTargets = [];
            for (let i = 0; i < 3; i++) {
                const angle = (Math.PI * 2 / 3) * i + seed * 0.9;
                const dist = 550 + (i * 350 + seed * 120) % 800; // 550 to 1350
                destroyTargets.push({
                    id: `pylon_${seed}_${i}`,
                    name: 'Void Pylon',
                    x: clampCoord(Math.cos(angle) * dist),
                    y: clampCoord(Math.sin(angle) * dist),
                    hp: 120,
                    maxHp: 120,
                    size: 26
                });
            }
            return {
                type: 'DESTROY',
                variant: 'PYLONS',
                title: 'Void Pylon Demolition',
                description: 'Shatter ancient void pylons channeling dark energy.',
                target: 3,
                current: 0,
                started: false,
                completed: false,
                destroyTargets
            };
        } else if (variantIndex === 1) {
            // Variant 2: Mobile Anomaly Crystals
            const destroyTargets = [];
            for (let i = 0; i < 4; i++) {
                const angle = (Math.PI * 2 / 4) * i + seed * 0.7;
                const dist = 500 + (i * 300 + seed * 140) % 850;
                const speed = 1.0 + (i % 2) * 0.5;
                destroyTargets.push({
                    id: `crystal_${seed}_${i}`,
                    name: 'Anomaly Crystal',
                    x: clampCoord(Math.cos(angle) * dist),
                    y: clampCoord(Math.sin(angle) * dist),
                    vx: Math.cos(angle + Math.PI / 3) * speed,
                    vy: Math.sin(angle + Math.PI / 3) * speed,
                    hp: 100,
                    maxHp: 100,
                    size: 22
                });
            }
            return {
                type: 'DESTROY',
                variant: 'MOVING_CRYSTALS',
                title: 'Mobile Crystal Purge',
                description: 'Hunt down and destroy mobile wandering anomaly crystals.',
                target: 4,
                current: 0,
                started: false,
                completed: false,
                destroyTargets
            };
        } else {
            // Variant 3: Overcharged Beacons (Timed)
            const destroyTargets = [];
            for (let i = 0; i < 3; i++) {
                const angle = (Math.PI * 2 / 3) * i + seed * 1.1;
                const dist = 600 + (i * 320 + seed * 150) % 750;
                destroyTargets.push({
                    id: `beacon_${seed}_${i}`,
                    name: 'Overcharged Beacon',
                    x: clampCoord(Math.cos(angle) * dist),
                    y: clampCoord(Math.sin(angle) * dist),
                    hp: 140,
                    maxHp: 140,
                    size: 28
                });
            }
            return {
                type: 'DESTROY',
                variant: 'TIMED_BEACONS',
                title: 'Disarm Overcharged Beacons',
                description: 'Destroy 3 overcharged beacons before they detonate!',
                target: 3,
                current: 0,
                started: false,
                completed: false,
                timeLimit: 90,
                timeRemaining: 90,
                destroyTargets
            };
        }
    }
}
