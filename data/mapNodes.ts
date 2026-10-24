import { getBossForWave } from '../bosses';

export type MissionType = 'SURVIVE' | 'DEFEAT_ENEMIES' | 'COLLECT_KEYS' | 'DESTROY_MACHINES' | 'CAPTURE_ZONE';

export interface MissionDef {
  type: MissionType;
  targetCount: number;
  timeLimit?: number;
  rewardId?: string;
}

export type NodeType = 'COMBAT' | 'ELITE' | 'BOSS' | 'SHRINE' | 'EVENT' | 'MYSTERY' | 'REST' | 'SECRET' | 'TREASURE';

export interface RunNode {
  id: string;
  act: 1 | 2 | 3;
  row: number;
  lane: number;
  x: number;
  y: number;
  type: NodeType;
  displayType: NodeType | 'UNKNOWN';
  waveRange: [number, number];
  regionId: string;
  connectsTo: string[];
  state: 'FOGGED' | 'VISIBLE' | 'CURRENT' | 'VISITED';
  mission?: MissionDef;
}

export const REGION_POOL = [
  { id: 'region_1', name: 'Origin Fields', bgIndex: 0, loreText: 'The place where Light appeared. A dim ember flickers in the endless dark, yearning to grow.' },
  { id: 'region_2', name: 'Whispering Grove', bgIndex: 5, loreText: 'Echoes of forgotten existence. The Void murmurs here, trying to lull the light back to sleep.' },
  { id: 'region_3', name: 'Crystal Depths', bgIndex: 12, loreText: 'Beautiful, but hides danger. A massive threshold woven from stellar dust and forgotten gravity.' },
  { id: 'region_4', name: 'Abandoned Machinery', bgIndex: 9, loreText: 'Lost technological wonders hum with ancient, dangerous energy.' },
  { id: 'region_5', name: 'Void Wastes', bgIndex: 18, loreText: 'The Darkness leaks here. Falling eternally through a beautiful, deadly silence.' },
  { id: 'region_6', name: 'Seam of the Void', bgIndex: 29, loreText: 'A tear in the cosmic fabric where terrifying entities cross over.' },
  { id: 'region_7', name: 'The Shattered Core', bgIndex: 33, loreText: 'The heart cracked by conflict. Time and space distort. Reality itself is your enemy here.' },
  { id: 'region_8', name: 'Echoing Cavern', bgIndex: 37, loreText: 'Your voice is not your own. The point of no return. The dark pulls with impossible strength.' },
  { id: 'region_9', name: 'Broken Sanctuary', bgIndex: 25, loreText: 'A ruined safe haven that failed to protect the light.' },
  { id: 'region_10', name: 'The Rift', bgIndex: 39, loreText: 'The final destination. Absolute darkness and blinding light crash together.' },
  { id: 'region_secret_1', name: 'Forgotten Vault', bgIndex: 15, loreText: 'A hidden cache of explosive potential. Rare anomalies gestate here.' },
  { id: 'region_secret_2', name: 'Hidden Garden', bgIndex: 35, loreText: 'A loop in time, holding secrets from a past that never was.' },
  { id: 'region_secret_3', name: 'Radiant Bastion', bgIndex: 20, loreText: 'A forgotten crucible where light was once weaponized. Its purging resonance still echoes.' },
  { id: 'region_secret_4', name: 'Momentum Shrine', bgIndex: 22, loreText: 'A shrine to endless motion. Those who take a life here inherit its remaining momentum.' },

  { id: 'region_treasure', name: 'Treasure', bgIndex: 8, loreText: 'A shimmering pocket of raw void-essence, waiting to be harvested by a nimble spark.' }
];

// Essence reward is half of the value given by the region's main boss.
// If boss gives 2k, then treasure gives 1k, if 10k then 5k, etc.
export function getTreasureEssenceReward(waveTier: number): number {
    const tier = Math.max(1, waveTier | 0);
    const bossWave = Math.ceil(tier / 10) * 10;
    try {
        const boss = getBossForWave(bossWave);
        if (boss && typeof boss.essenceReward === 'number') {
            return Math.floor(boss.essenceReward / 2);
        }
    } catch (e) {
        console.error("Error fetching boss for treasure reward calculation:", e);
    }
    return Math.max(15, 15 + Math.floor(tier * 2.5));
}

export function generateRunPath(seed?: number): RunNode[] {
    const nodes: RunNode[] = [
        // MAIN PROGRESSION
        {
            id: 'map_1', act: 1, row: 0, lane: 1, x: 15, y: 50,
            type: 'COMBAT', displayType: 'COMBAT', waveRange: [1, 10], regionId: 'region_1',
            connectsTo: ['map_2', 'mission_1', 'treasure_1'], state: 'CURRENT', mission: { type: 'SURVIVE', targetCount: 60 }
        },
        {
            id: 'map_2', act: 1, row: 1, lane: 1, x: 30, y: 50,
            type: 'ELITE', displayType: 'ELITE', waveRange: [11, 20], regionId: 'region_2',
            connectsTo: ['map_3', 'secret_1', 'secret_3', 'treasure_2'], state: 'FOGGED', mission: { type: 'SURVIVE', targetCount: 80 }
        },
        {
            id: 'map_3', act: 1, row: 2, lane: 1, x: 45, y: 50,
            type: 'BOSS', displayType: 'BOSS', waveRange: [21, 30], regionId: 'region_3',
            connectsTo: ['map_4', 'mission_2', 'treasure_3'], state: 'FOGGED', mission: { type: 'SURVIVE', targetCount: 100 }
        },
        {
            id: 'map_4', act: 1, row: 3, lane: 1, x: 60, y: 50,
            type: 'ELITE', displayType: 'ELITE', waveRange: [31, 40], regionId: 'region_4',
            connectsTo: ['map_5', 'mission_3', 'secret_4', 'treasure_4'], state: 'FOGGED', mission: { type: 'SURVIVE', targetCount: 120 }
        },
        {
            id: 'map_5', act: 1, row: 4, lane: 1, x: 75, y: 50,
            type: 'BOSS', displayType: 'BOSS', waveRange: [41, 50], regionId: 'region_5',
            connectsTo: ['map_6', 'mission_4', 'secret_2', 'treasure_5'], state: 'FOGGED', mission: { type: 'SURVIVE', targetCount: 150 }
        },
        {
            id: 'map_6', act: 1, row: 5, lane: 1, x: 90, y: 50,
            type: 'BOSS', displayType: 'BOSS', waveRange: [51, 60], regionId: 'region_6',
            connectsTo: [], state: 'FOGGED', mission: { type: 'SURVIVE', targetCount: 200 }
        },
        
        // SPECIAL MISSIONS (1 WAVE)
        {
            id: 'mission_1', act: 1, row: 0, lane: 0, x: 22, y: 25,
            type: 'EVENT', displayType: 'EVENT', waveRange: [101, 101], regionId: 'region_7',
            connectsTo: ['map_2'], state: 'FOGGED', mission: { type: 'COLLECT_KEYS', targetCount: 8, rewardId: 'special_dashDamage' }
        },
        {
            id: 'mission_2', act: 1, row: 2, lane: 2, x: 52, y: 75,
            type: 'EVENT', displayType: 'EVENT', waveRange: [102, 102], regionId: 'region_8',
            connectsTo: ['map_4'], state: 'FOGGED', mission: { type: 'CAPTURE_ZONE', targetCount: 300, rewardId: 'special_fireBlastCount' }
        },
        {
            id: 'mission_3', act: 1, row: 3, lane: 0, x: 68, y: 25,
            type: 'EVENT', displayType: 'EVENT', waveRange: [103, 103], regionId: 'region_9',
            connectsTo: ['map_5'], state: 'FOGGED', mission: { type: 'DESTROY_MACHINES', targetCount: 3, rewardId: 'special_thunderBounce' }
        },
        {
            id: 'mission_4', act: 1, row: 4, lane: 2, x: 82, y: 75,
            type: 'EVENT', displayType: 'EVENT', waveRange: [104, 104], regionId: 'region_10',
            connectsTo: ['map_6'], state: 'FOGGED', mission: { type: 'COLLECT_KEYS', targetCount: 12, rewardId: 'special_iceNovaSize' }
        },
        
        // SECRETS
        {
            id: 'secret_1', act: 1, row: 1, lane: 0, x: 38, y: 15,
            type: 'SECRET', displayType: 'SECRET', waveRange: [201, 201], regionId: 'region_secret_1',
            connectsTo: ['map_3'], state: 'FOGGED', mission: { type: 'CAPTURE_ZONE', targetCount: 300, rewardId: 'special_orbitalSpeed' }
        },
        {
            id: 'secret_3', act: 1, row: 1, lane: 2, x: 38, y: 85,
            type: 'SECRET', displayType: 'SECRET', waveRange: [203, 203], regionId: 'region_secret_3',
            connectsTo: ['map_3'], state: 'FOGGED', mission: { type: 'COLLECT_KEYS', targetCount: 10, rewardId: 'special_lightPurge' }
        },
        {
            id: 'secret_2', act: 1, row: 4, lane: 0, x: 82, y: 15,
            type: 'SECRET', displayType: 'SECRET', waveRange: [202, 202], regionId: 'region_secret_2',
            connectsTo: ['map_6'], state: 'FOGGED', mission: { type: 'DESTROY_MACHINES', targetCount: 4, rewardId: 'special_singularityPull' }
        },
        {
            id: 'secret_4', act: 1, row: 3, lane: 2, x: 67, y: 82,
            type: 'SECRET', displayType: 'SECRET', waveRange: [204, 204], regionId: 'region_secret_4',
            connectsTo: ['map_5'], state: 'FOGGED', mission: { type: 'CAPTURE_ZONE', targetCount: 300, rewardId: 'special_dashOnKill' }
        },

        // TREASURE / MINIGAME NODES (essence caches sprinkled along the path).
        // Optional branches off the main progression — no combat, just a quick minigame that
        // rewards essence scaled to that section’s wave tier.
        {
            id: 'treasure_1', act: 1, row: 0, lane: 2, x: 22, y: 72,
            type: 'TREASURE', displayType: 'TREASURE', waveRange: [5, 5], regionId: 'region_treasure',
            connectsTo: [], state: 'FOGGED'
        },
        {
            id: 'treasure_2', act: 1, row: 1, lane: 2, x: 37, y: 78,
            type: 'TREASURE', displayType: 'TREASURE', waveRange: [15, 15], regionId: 'region_treasure',
            connectsTo: [], state: 'FOGGED'
        },
        {
            id: 'treasure_3', act: 1, row: 2, lane: 0, x: 44, y: 30,
            type: 'TREASURE', displayType: 'TREASURE', waveRange: [25, 25], regionId: 'region_treasure',
            connectsTo: [], state: 'FOGGED'
        },
        {
            id: 'treasure_4', act: 1, row: 3, lane: 2, x: 60, y: 72,
            type: 'TREASURE', displayType: 'TREASURE', waveRange: [35, 35], regionId: 'region_treasure',
            connectsTo: [], state: 'FOGGED'
        },
        {
            id: 'treasure_5', act: 1, row: 4, lane: 0, x: 76, y: 30,
            type: 'TREASURE', displayType: 'TREASURE', waveRange: [45, 45], regionId: 'region_treasure',
            connectsTo: [], state: 'FOGGED'
        }
    ];

    // Scatter the nodes slightly using a deterministic seed/hash of their indices
    // to break up rigid grid alignments and make them feel like an organic constellation.
    return nodes.map((node, index) => {
        // Deterministic pseudo-random offsets
        const seedX = Math.sin(index * 45.67 + 12.34) * 4.6;
        const seedY = Math.cos(index * 78.91 + 56.78) * 4.6;
        
        const isStart = node.id === 'map_1';
        const finalX = Math.max(8, Math.min(92, node.x + (isStart ? seedX * 0.2 : seedX)));
        const finalY = Math.max(8, Math.min(92, node.y + (isStart ? seedY * 0.2 : seedY)));
        
        return {
            ...node,
            x: Number(finalX.toFixed(2)),
            y: Number(finalY.toFixed(2))
        };
    });
}
