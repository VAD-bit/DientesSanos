const fs = require('fs');
const path = require('path');

const targetFile = path.join(__dirname, 'src', 'components', 'CheckoutPOS.jsx');
let content = fs.readFileSync(targetFile, 'utf8');

// Replace standard occurrences of \$ with €
// Specifically target labels and format strings, not template literals like ${var}
content = content.replace(/Ref: \$/g, 'Ref: €');
content = content.replace(/USD/g, 'EUR');
content = content.replace(/TASA MANUAL \(\$\)/g, 'TASA MANUAL (€)');
content = content.replace(/TODO EN \$/g, 'TODO EN €');
content = content.replace(/MÉTODO DE PAGO \(\$\)/g, 'MÉTODO DE PAGO (€)');
content = content.replace(/1\. PAGO EN DÓLARES \(\$\)/g, '1. PAGO EN EUROS (€)');
content = content.replace(/\$10% /g, '10% ');

// We need to be careful with template literals.
// `por un total de $${` -> `por un total de €${`
content = content.replace(/por un total de \$\$\{/g, 'por un total de €${');
content = content.replace(/un total mixto de \$\$\{/g, 'un total mixto de €${');

// Other specific matches like:
// >${item.price}
content = content.replace(/>\$\{item\.price\}/g, '>€${item.price}');
content = content.replace(/>\$\{extra\.price\}/g, '>€${extra.price}');
content = content.replace(/>\$\{service\.price\}/g, '>€${service.price}');

// >${s.washing_rate
content = content.replace(/>\$\{s\.washing_rate/g, '>€${s.washing_rate');

// ${washer.name} (\$${washer.washing_rate
content = content.replace(/\(\$\$\{washer\.washing_rate/g, '(€${washer.washing_rate');

// 'Bs' : '$'
content = content.replace(/'Bs' : '\$'/g, "'Bs' : '€'");

fs.writeFileSync(targetFile, content);
console.log('Currency replaced in CheckoutPOS.jsx');
