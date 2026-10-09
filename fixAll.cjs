const fs = require('fs');
const path = require('path');

// 1. Fix dataService.js
const dataServicePath = path.join(__dirname, 'src', 'services', 'dataService.js');
let dataServiceContent = fs.readFileSync(dataServicePath, 'utf8');

if (!dataServiceContent.includes('getRoulettePrizes')) {
  const target = "async getCoupons(clientId = null) {";
  const replacement = `async getRoulettePrizes() {
    try {
      const { data, error } = await supabase.from('service_extras').select('*');
      if (error) return [];
      return data.filter(d => d.name && d.name.startsWith('ROULETTE_PRIZE:'));
    } catch { return []; }
  },
  async addRoulettePrize(prizeName) {
    const { data, error } = await supabase.from('service_extras').insert([{ name: 'ROULETTE_PRIZE:' + prizeName, price: 0 }]).select();
    if (error) throw error;
    return data;
  },
  async removeRoulettePrize(id) {
    const { error } = await supabase.from('service_extras').delete().eq('id', id);
    if (error) throw error;
    return true;
  },

  async getCoupons(clientId = null) {`;
  
  dataServiceContent = dataServiceContent.replace(target, replacement);
  fs.writeFileSync(dataServicePath, dataServiceContent);
  console.log("Fixed dataService.js");
}

// 2. Fix SettingsModule.jsx table client column
const settingsPath = path.join(__dirname, 'src', 'components', 'SettingsModule.jsx');
let settingsContent = fs.readFileSync(settingsPath, 'utf8');

const tableRowTarget = `{clients.find(c => c.id === coupon.client_id)?.name || 'Cliente Eliminado'}`;
const tableRowReplacement = `{coupon.client_id ? (clients.find(c => c.id === coupon.client_id)?.name || 'Cliente Eliminado') : (
                                <button 
                                  onClick={() => { setAssignCouponId(coupon.id); setShowAssignModal(true); }}
                                  style={{ background: 'var(--gold-primary)', color: 'black', border: 'none', padding: '6px 12px', borderRadius: '4px', fontSize: '11px', fontWeight: '800', cursor: 'pointer' }}
                                >
                                  Asignar
                                </button>
                              )}`;

if (settingsContent.includes(tableRowTarget)) {
  settingsContent = settingsContent.replace(tableRowTarget, tableRowReplacement);
  fs.writeFileSync(settingsPath, settingsContent);
  console.log("Fixed SettingsModule.jsx table");
} else {
  console.log("Could not find tableRowTarget in SettingsModule.jsx");
}
