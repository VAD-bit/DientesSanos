const fs = require('fs');
const path = require('path');

function fixTemplateLiterals(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let originalContent = content;
  
  // Fix broken template literals from previous regex
  content = content.replace(/ €\{/g, ' ${');
  content = content.replace(/€\{/g, '${');
  content = content.replace(/\(€\{/g, '(${');
  
  if (content !== originalContent) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('Fixed template literals in ' + filePath);
  }
}

function processDirectory(directory) {
  const files = fs.readdirSync(directory);
  for (const file of files) {
    const fullPath = path.join(directory, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      processDirectory(fullPath);
    } else if (fullPath.endsWith('.jsx') || fullPath.endsWith('.js') || fullPath.endsWith('.css')) {
      fixTemplateLiterals(fullPath);
    }
  }
}

processDirectory('src');
console.log('Done.');
