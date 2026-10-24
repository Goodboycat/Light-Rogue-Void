const fs = require('fs');
let code = fs.readFileSync('data/mapNodes.ts', 'utf8');

code = code.replace(
  "id: 'secret_4', act: 1, row: 3, lane: 2, x: 65, y: 85,",
  "id: 'secret_4', act: 1, row: 4, lane: 2, x: 82, y: 85,"
);

code = code.replace(
  "connectsTo: ['map_4'], state: 'FOGGED', mission: { type: 'CAPTURE_ZONE', targetCount: 300, rewardId: 'special_dashOnKill' }",
  "connectsTo: ['map_6'], state: 'FOGGED', mission: { type: 'CAPTURE_ZONE', targetCount: 300, rewardId: 'special_dashOnKill' }"
);

fs.writeFileSync('data/mapNodes.ts', code);
