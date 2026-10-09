const fs = require('fs');
const path = require('path');

function replaceCurrencyInFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let originalContent = content;
  
  // Replacements for currency $:
  content = content.replace(/\$(\d)/g, '€$1');
  content = content.replace(/\$</g, '€<');
  content = content.replace(/\(\$\)/g, '(€)');
  content = content.replace(/PRECIO \(\$\)/gi, 'PRECIO (€)');
  content = content.replace(/ \$/g, ' €');
  content = content.replace(/>\$</g, '>€<');
  content = content.replace(/\}\$/g, '}€');
  content = content.replace(/\$ \}/g, '€ }');
  
  if (content !== originalContent) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('Updated ' + filePath);
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
      replaceCurrencyInFile(fullPath);
    }
  }
}

processDirectory('src');
console.log('Done.');
