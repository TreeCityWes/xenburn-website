const fs = require('fs');
const path = require('path');

const abiPath = path.join(__dirname, '../src/abis');
const publicPath = path.join(__dirname, '../public');

// Ensure directories exist
if (!fs.existsSync(abiPath)) {
  fs.mkdirSync(abiPath, { recursive: true });
}

// Copy only the ABIs we need
const abiFiles = ['xburnabi.json', 'cbXenAbi.json'];

abiFiles.forEach(file => {
  if (fs.existsSync(path.join(publicPath, file))) {
    fs.copyFileSync(
      path.join(publicPath, file),
      path.join(abiPath, file)
    );
  } else {
    console.error(`Warning: ${file} not found in public directory`);
  }
}); 