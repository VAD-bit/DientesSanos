const fs = require('fs');
const path = require('path');

const settingsPath = path.join(__dirname, 'src', 'components', 'SettingsModule.jsx');
let settingsContent = fs.readFileSync(settingsPath, 'utf8');

const tableRowTarget = `{coupon.clients?.name || 'Cliente Eliminado'}`;
const tableRowReplacement = `{coupon.client_id ? (coupon.clients?.name || 'Cliente Eliminado') : (
                                <button 
                                  onClick={() => { setAssignCouponId(coupon.id); setShowAssignModal(true); }}
                                  style={{ background: 'var(--gold-primary)', color: 'black', border: 'none', padding: '6px 12px', borderRadius: '4px', fontSize: '11px', fontWeight: '800', cursor: 'pointer' }}
                                >
                                  Asignar Cupón
                                </button>
                              )}`;

if (settingsContent.includes(tableRowTarget)) {
  settingsContent = settingsContent.replace(tableRowTarget, tableRowReplacement);
  fs.writeFileSync(settingsPath, settingsContent);
  console.log("Fixed SettingsModule.jsx table");
} else {
  console.log("Still not found!");
}
