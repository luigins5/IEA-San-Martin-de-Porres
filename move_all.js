const fs = require('fs');
const path = require('path');

const srcDir = './IEA-San-Martin-de-Porres-main';
const destDir = './';

const files = fs.readdirSync(srcDir);
for (const file of files) {
  const srcPath = path.join(srcDir, file);
  const destPath = path.join(destDir, file);
  if (fs.existsSync(destPath)) {
    fs.rmSync(destPath, { recursive: true, force: true });
  }
  fs.renameSync(srcPath, destPath);
}
fs.rmSync(srcDir, { recursive: true, force: true });
console.log("Moved successfully.");
