const fs = require('fs');
const path = require('path');

const targetFile = path.join(__dirname, 'src', 'components', 'CheckoutPOS.jsx');
let content = fs.readFileSync(targetFile, 'utf8');

// 1. Fix Currency
content = content.replace(/Ref: \$/g, 'Ref: €');
content = content.replace(/USD/g, 'EUR');
content = content.replace(/TASA MANUAL \(\$\)/g, 'TASA MANUAL (€)');
content = content.replace(/TODO EN \$/g, 'TODO EN €');
content = content.replace(/MÉTODO DE PAGO \(\$\)/g, 'MÉTODO DE PAGO (€)');
content = content.replace(/1\. PAGO EN DÓLARES \(\$\)/g, '1. PAGO EN EUROS (€)');
content = content.replace(/\$10% /g, '10% ');

content = content.replace(/por un total de \$\$\{/g, 'por un total de €${');
content = content.replace(/un total mixto de \$\$\{/g, 'un total mixto de €${');

content = content.replace(/>\$\{item\.price\}/g, '>€${item.price}');
content = content.replace(/>\$\{extra\.price\}/g, '>€${extra.price}');
content = content.replace(/>\$\{service\.price\}/g, '>€${service.price}');
content = content.replace(/>\$\{s\.washing_rate/g, '>€${s.washing_rate');
content = content.replace(/\(\$\$\{washer\.washing_rate/g, '(€${washer.washing_rate');

content = content.replace(/'Bs' : '\$'/g, "'Bs' : '€'");

// 2. Fix Layout
// Find the exact blocks
const reminderStartStr = "                {/* WhatsApp Reminder Section */}";
const reminderEndStr = "                {/* Coupon Section */}";
const couponEndStr = "                                  <span style={{ fontSize: isMobile ? '13px' : '16px', fontWeight: '900' }}>TOTAL A PAGAR</span>";

const reminderStartIndex = content.indexOf(reminderStartStr);
const reminderEndIndex = content.indexOf(reminderEndStr);
const couponEndIndex = content.indexOf(couponEndStr);

if (reminderStartIndex !== -1 && reminderEndIndex !== -1 && couponEndIndex !== -1) {
  const reminderBlock = content.substring(reminderStartIndex, reminderEndIndex);
  const couponBlock = content.substring(reminderEndIndex, couponEndIndex);
  
  // The line before the reminder block is:
  // <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginTop: '12px' }}>
  // We want to put reminderBlock and couponBlock BEFORE this div.
  
  const targetDivRegex = /<div style=\{\{\s*display:\s*'flex',\s*justifyContent:\s*'space-between',\s*alignItems:\s*'baseline',\s*marginTop:\s*'12px'\s*\}\}>\s*$/m;
  const match = content.substring(0, reminderStartIndex).match(targetDivRegex);
  
  if (match) {
    // Remove the blocks from their current position
    content = content.substring(0, reminderStartIndex) + content.substring(couponEndIndex);
    
    // Insert them before the target div
    const divIndex = match.index;
    content = content.substring(0, divIndex) + 
              reminderBlock + "\n" +
              couponBlock + "\n" +
              content.substring(divIndex);
              
    console.log("Layout fixed successfully.");
  } else {
    console.log("Could not find the target div to move blocks before.");
  }
} else {
  console.log("Could not find reminder or coupon blocks.");
}

fs.writeFileSync(targetFile, content);
console.log('Done.');
