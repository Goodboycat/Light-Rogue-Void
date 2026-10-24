const fs = require('fs');
let code = fs.readFileSync('data/mapNodes.ts', 'utf8');

code = code.replace(
  "id: 'secret_3', act: 1, row: 2, lane: 0, x: 50, y: 12,",
  "id: 'secret_3', act: 1, row: 1, lane: 2, x: 38, y: 88,"
);

fs.writeFileSync('data/mapNodes.ts', code);
