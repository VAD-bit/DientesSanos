const fs = require('fs');
const path = require('path');

const emojiRegex = /[\u{1F300}-\u{1F6FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F900}-\u{1F9FF}\u{1F1E6}-\u{1F1FF}]/u;

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(file));
    } else if (file.endsWith('.jsx') || file.endsWith('.js')) {
      const content = fs.readFileSync(file, 'utf8');
      if (emojiRegex.test(content)) {
        const lines = content.split('\n');
        lines.forEach((line, i) => {
          if (emojiRegex.test(line)) {
            console.log(`${file}:${i+1}: ${line.trim()}`);
          }
        });
      }
    }
  });
  return results;
}

walk('src');
