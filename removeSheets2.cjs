const fs = require('fs');
const path = require('path');

const dataServiceFile = path.join(__dirname, 'src', 'services', 'dataService.js');
let dsContent = fs.readFileSync(dataServiceFile, 'utf8');

// 1. Remove syncTransactionToSheets call
dsContent = dsContent.replace(/\/\/ 5\. Sincronizar con Google Sheets\s*await this\.syncTransactionToSheets\(paymentRecord\);/g, '');

// 2. We can just empty the bodies of these functions instead of removing them, 
// to ensure we don't break syntax if regex is tricky.
dsContent = dsContent.replace(/async syncTransactionToSheets\(paymentRecord\) \{[\s\S]*?\n  \}\n\n  async syncValeToSheets/g, 'async syncTransactionToSheets(paymentRecord) {}\n\n  async syncValeToSheets');
dsContent = dsContent.replace(/async syncValeToSheets\(valePayload\) \{[\s\S]*?\n  \}\n\n  async getFinances/g, 'async syncValeToSheets(valePayload) {}\n\n  async getFinances');

dsContent = dsContent.replace(/async executeWeeklySheetArchiving\(\) \{[\s\S]*?\n  \}\n\n  \/\/ ===============================/g, 'async executeWeeklySheetArchiving() {}\n\n  // ===============================');

fs.writeFileSync(dataServiceFile, dsContent);

const financeFile = path.join(__dirname, 'src', 'components', 'FinanceModule.jsx');
let financeContent = fs.readFileSync(financeFile, 'utf8');

financeContent = financeContent.replace(/\/\/ Sincronizar Vale con Google Sheets de forma dinámica[\s\S]*?console\.error\("Error al sincronizar vale a Sheets:", sheetErr\);\n\s*\}/g, '');

financeContent = financeContent.replace(/<button onClick=\{handleWeeklySheetArchiving\} className="btn-outline" style=\{\{ display: 'flex', alignItems: 'center', gap: '8px', borderColor: 'var\(--gold-primary\)', color: 'var\(--gold-primary\)' \}\}>\n\s*<Archive size=\{16\} \/>\n\s*<span className="hidden sm:inline">Cierre Semanal \(Sheets\)<\/span>\n\s*<\/button>/g, '');
financeContent = financeContent.replace(/<button\s*onClick=\{handleWeeklySheetArchiving\}[\s\S]*?Cierre Semanal \(Sheets\)<\/span>\s*<\/button>/g, '');

fs.writeFileSync(financeFile, financeContent);
