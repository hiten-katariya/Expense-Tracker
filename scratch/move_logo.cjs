const fs = require('fs');
const path = require('path');

const projectRoot = path.resolve(__dirname, '..');
const sourceFile = path.join(projectRoot, 'dist', 'assets', 'Gemini_Generated_Image_aakqwaakqwaakqwa.png');

console.log('Source file path:', sourceFile);
if (!fs.existsSync(sourceFile)) {
  console.error('Source file does not exist!');
  process.exit(1);
}

// 1. Copy to public/logo.png
const publicDir = path.join(projectRoot, 'public');
if (!fs.existsSync(publicDir)) {
  console.log('Creating public directory...');
  fs.mkdirSync(publicDir, { recursive: true });
}
const destPublic = path.join(publicDir, 'logo.png');
fs.copyFileSync(sourceFile, destPublic);
console.log('Copied to:', destPublic);

// 2. Copy to src/assets/logo.png
const assetsDir = path.join(projectRoot, 'src', 'assets');
if (!fs.existsSync(assetsDir)) {
  console.log('Creating src/assets directory...');
  fs.mkdirSync(assetsDir, { recursive: true });
}
const destAssets = path.join(assetsDir, 'logo.png');
fs.copyFileSync(sourceFile, destAssets);
console.log('Copied to:', destAssets);

console.log('Logo file migration completed successfully!');
