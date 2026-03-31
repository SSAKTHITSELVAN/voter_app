const fs = require('fs');
const path = require('path');

const walk = (dir, ext = '.tsx', fileList = []) => {
  fs.readdirSync(dir).forEach(file => {
    const filePath = path.join(dir, file);
    if (fs.statSync(filePath).isDirectory()) {
      walk(filePath, ext, fileList);
    } else if (file.endsWith(ext)) {
      fileList.push(filePath);
    }
  });
  return fileList;
};

const extractStrings = (file) => {
  const content = fs.readFileSync(file, 'utf8');
  const matches = [...content.matchAll(/>([^<>{}\n]+)</g)];
  return matches.map(m => m[1].trim()).filter(Boolean);
};

const appDir = path.resolve(__dirname, '../app');
const componentsDir = path.resolve(__dirname, '../components');
const files = [...walk(appDir), ...walk(componentsDir)];

const allStrings = new Set();
files.forEach(file => {
  extractStrings(file).forEach(str => allStrings.add(str));
});

console.log('Extracted strings:', Array.from(allStrings));
