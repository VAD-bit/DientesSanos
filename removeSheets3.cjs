const fs = require('fs');
const path = require('path');

const financeFile = path.join(__dirname, 'src', 'components', 'FinanceModule.jsx');
let financeContent = fs.readFileSync(financeFile, 'utf8');

// 1. Remove `handleWeeklyCloseExecute`
financeContent = financeContent.replace(/const handleWeeklyCloseExecute = async \(\) => \{[\s\S]*?\}\n\s*\}\n\s*};\n/g, '');

// 2. Remove the modal component render
financeContent = financeContent.replace(/\{\/\* Modal Cierre Semanal \(Google Sheets\) \*\/\}[\s\S]*?<\/AnimatedModal>\n/g, '');

// 3. Remove the button that triggers it
financeContent = financeContent.replace(/<button\n\s*className="btn-outline"\n\s*style=\{\{ borderColor: 'var\(--gold-primary\)', color: 'var\(--gold-primary\)' \}\}\n\s*onClick=\{\(\) => setWeeklyCloseModal\(\{ isOpen: true, loading: false, success: false, error: null \}\)\}\n\s*>\n\s*<Archive size=\{16\} \/>\n\s*<span className="hidden sm:inline">Cierre Semanal \(Sheets\)<\/span>\n\s*<\/button>\n/g, '');
financeContent = financeContent.replace(/<button className="btn-outline" style=\{\{ borderColor: 'var\(--gold-primary\)', color: 'var\(--gold-primary\)', display: 'flex', alignItems: 'center', gap: '8px' \}\} onClick=\{\(\) => setWeeklyCloseModal\(\{ isOpen: true, loading: false, success: false, error: null \}\)\}>\n\s*<Archive size=\{16\} \/>\n\s*<span className="hidden sm:inline">Cierre Semanal \(Sheets\)<\/span>\n\s*<\/button>\n/g, '');

fs.writeFileSync(financeFile, financeContent);

console.log("Successfully removed weekly sheets logic.");
