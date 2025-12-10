const fs = require('fs');
const path = require('path');

const distDir = path.resolve(__dirname, '..', 'app', 'react', 'dist');
const targetDir = path.resolve(__dirname, '..', 'app');

function copyRecursive(src, dest) {
  if (!fs.existsSync(src)) return;
  const stat = fs.statSync(src);
  if (stat.isDirectory()) {
    if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
    for (const entry of fs.readdirSync(src)) {
      copyRecursive(path.join(src, entry), path.join(dest, entry));
    }
  } else {
    fs.copyFileSync(src, dest);
  }
}

if (!fs.existsSync(distDir)) {
  console.error('React dist not found at', distDir);
  process.exit(1);
}

console.log('Copying', distDir, '->', targetDir);
copyRecursive(distDir, targetDir);
console.log('Done.');
