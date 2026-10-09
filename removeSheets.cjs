const fs = require('fs');
const path = require('path');

// 1. App.jsx
const appFile = path.join(__dirname, 'src', 'App.jsx');
let appContent = fs.readFileSync(appFile, 'utf8');
appContent = appContent.replace(
  'El cierre semanal correspondiente al domingo ${sundayStr} se ha ejecutado y sincronizado automáticamente en Google Sheets.',
  'El cierre semanal correspondiente al domingo ${sundayStr} se ha ejecutado automáticamente.'
);
fs.writeFileSync(appFile, appContent);

// 2. dataService.js
const dataServiceFile = path.join(__dirname, 'src', 'services', 'dataService.js');
let dsContent = fs.readFileSync(dataServiceFile, 'utf8');

// Remove call to syncTransactionToSheets
dsContent = dsContent.replace(/\/\/ 5\. Sincronizar con Google Sheets\n\s*await this\.syncTransactionToSheets\(paymentRecord\);\n/g, '');

// Remove syncTransactionToSheets method
dsContent = dsContent.replace(/async syncTransactionToSheets\(paymentRecord\) \{[\s\S]*?console\.error\('Error al sincronizar con Google Sheets:', e\);\n\s*\}\n\s*\}/g, '');

// Remove syncValeToSheets method
dsContent = dsContent.replace(/async syncValeToSheets\(valePayload\) \{[\s\S]*?console\.error\("Error syncing vale to sheets:", e\);\n\s*\}/g, '');

// Remove executeWeeklySheetArchiving method
dsContent = dsContent.replace(/async executeWeeklySheetArchiving\(\) \{[\s\S]*?throw new Error\("Error al ejecutar cierre semanal"\);\n\s*\}\n\s*\}/g, '');

fs.writeFileSync(dataServiceFile, dsContent);

// 3. FinanceModule.jsx
const financeFile = path.join(__dirname, 'src', 'components', 'FinanceModule.jsx');
let financeContent = fs.readFileSync(financeFile, 'utf8');

// Remove syncValeToSheets call
financeContent = financeContent.replace(/\/\/ Sincronizar Vale con Google Sheets de forma dinámica\n\s*try \{[\s\S]*?console\.error\("Error al sincronizar vale a Sheets:", sheetErr\);\n\s*\}/g, '');

// Remove executeWeeklySheetArchiving handler and UI
financeContent = financeContent.replace(/const handleWeeklySheetArchiving = async \(\) => \{[\s\S]*?\}\n\s*catch \([\s\S]*?\}\n\s*\};\n/g, '');

// Remove the button from the UI
financeContent = financeContent.replace(/<button\n\s*className="btn-outline"\n\s*style=\{\{ borderColor: 'var\(--gold-primary\)', color: 'var\(--gold-primary\)' \}\}\n\s*onClick=\{handleWeeklySheetArchiving\}\n\s*>\n\s*<Archive size=\{16\} \/>\n\s*<span className="hidden sm:inline">Cierre Semanal \(Sheets\)<\/span>\n\s*<\/button>\n/g, '');

financeContent = financeContent.replace(/<button className="btn-outline" style=\{\{ borderColor: 'var\(--gold-primary\)', color: 'var\(--gold-primary\)', display: 'flex', alignItems: 'center', gap: '8px' \}\} onClick=\{handleWeeklySheetArchiving\}>\n\s*<Archive size=\{16\} \/>\n\s*<span className="hidden sm:inline">Cierre Semanal \(Sheets\)<\/span>\n\s*<\/button>\n/g, '');

// Remove Archive icon import from FinanceModule if not used elsewhere, but to be safe let's leave it or remove it if we know. Let's not risk regex failing.

fs.writeFileSync(financeFile, financeContent);

console.log("Successfully removed Google Sheets integration logic.");
