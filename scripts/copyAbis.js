const fs = require('fs');
const path = require('path');

const sourceDir = path.join(__dirname, '../public');
const targetDir = path.join(__dirname, '../src/abis');

// Create abis directory if it doesn't exist
if (!fs.existsSync(targetDir)) {
  fs.mkdirSync(targetDir);
}

// Copy ABI files
fs.copyFileSync(
  path.join(sourceDir, 'xenBurnerAbi.json'),
  path.join(targetDir, 'xenBurnerAbi.json')
);

fs.copyFileSync(
  path.join(sourceDir, 'cbXenAbi.json'),
  path.join(targetDir, 'cbXenAbi.json')
); 