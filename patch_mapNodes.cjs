const fs = require('fs');
let code = fs.readFileSync('data/mapNodes.ts', 'utf8');

const newRegions = `
  { id: 'region_secret_5', name: 'Abyssal Forge', bgIndex: 12, loreText: 'A place where the void is hammered into strange forms.' },
  { id: 'region_secret_6', name: 'Crystal Resonance', bgIndex: 28, loreText: 'The crystals here vibrate with memories of lost worlds.' },
  { id: 'region_secret_7', name: 'Stellar Graveyard', bgIndex: 33, loreText: 'The husks of dead stars drift silently in this expanse.' },
  { id: 'region_secret_8', name: 'Ethereal Nexus', bgIndex: 18, loreText: 'Paths cross here that should never intersect.' },
`;

code = code.replace(
  "  { id: 'region_secret_4', name: 'Momentum Shrine', bgIndex: 22, loreText: 'A shrine to endless motion. Those who take a life here inherit its remaining momentum.' },",
  "  { id: 'region_secret_4', name: 'Momentum Shrine', bgIndex: 22, loreText: 'A shrine to endless motion. Those who take a life here inherit its remaining momentum.' }," + newRegions
);

code = code.replace(
  "connectsTo: ['map_4', 'mission_2', 'treasure_3']",
  "connectsTo: ['map_4', 'mission_2', 'treasure_3', 'secret_5', 'secret_6']"
);

code = code.replace(
  "connectsTo: ['map_5', 'mission_3', 'treasure_4']",
  "connectsTo: ['map_5', 'mission_3', 'treasure_4', 'secret_7', 'secret_8']"
);

const newSecrets = `
        {
            id: 'secret_5', act: 1, row: 2, lane: 0, x: 50, y: 88,
            type: 'SECRET', displayType: 'SECRET', waveRange: [0, 0], regionId: 'region_secret_5',
            connectsTo: ['map_4'], state: 'FOGGED', mission: { type: 'COLLECT_KEYS', targetCount: 15, rewardId: 'special_fireBlastCount' }
        },
        {
            id: 'secret_6', act: 1, row: 3, lane: 2, x: 55, y: 12,
            type: 'SECRET', displayType: 'SECRET', waveRange: [0, 0], regionId: 'region_secret_6',
            connectsTo: ['map_4'], state: 'FOGGED', mission: { type: 'DESTROY_MACHINES', targetCount: 5, rewardId: 'special_dashDamage' }
        },
        {
            id: 'secret_7', act: 1, row: 3, lane: 0, x: 65, y: 15,
            type: 'SECRET', displayType: 'SECRET', waveRange: [0, 0], regionId: 'region_secret_7',
            connectsTo: ['map_5'], state: 'FOGGED', mission: { type: 'CAPTURE_ZONE', targetCount: 300, rewardId: 'special_thunderBounce' }
        },
        {
            id: 'secret_8', act: 1, row: 4, lane: 2, x: 70, y: 85,
            type: 'SECRET', displayType: 'SECRET', waveRange: [0, 0], regionId: 'region_secret_8',
            connectsTo: ['map_5'], state: 'FOGGED', mission: { type: 'COLLECT_KEYS', targetCount: 10, rewardId: 'special_iceNovaSize' }
        },
`;

code = code.replace(
  "        // SECRETS",
  "        // SECRETS" + newSecrets
);

fs.writeFileSync('data/mapNodes.ts', code);
