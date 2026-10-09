const fs = require('fs');
const path = require('path');

const targetFile = path.join(__dirname, 'src', 'components', 'CheckoutPOS.jsx');
let content = fs.readFileSync(targetFile, 'utf8');

// 1. Remove ceroLavado state
content = content.replace(
  /const \[ceroLavado, setCeroLavado\] = useState\(false\);/g,
  ''
);

// Remove setCeroLavado(false); in useEffect
content = content.replace(
  /setCeroLavado\(false\);\n\s*/g,
  ''
);

// Replace washDiscount logic
content = content.replace(
  /const washDiscount = ceroLavado \? \(washCount \* \(washRate \|\| 1\)\) : 0;/g,
  'const washDiscount = 0;'
);

// Replace didWash
content = content.replace(
  /const didWash = ceroLavado \? false : \(washCount > 0\);/g,
  'const didWash = washCount > 0;'
);

content = content.replace(
  /didWash: ceroLavado \? false : washCount > 0,/g,
  'didWash: washCount > 0,'
);

content = content.replace(
  /washCount: ceroLavado \? 0 : washCount,/g,
  'washCount: washCount,'
);

content = content.replace(
  /didWash: ceroLavado \? false : \(includesWashing \|\| \(washCount > 0\)\),/g,
  'didWash: includesWashing || (washCount > 0),'
);

content = content.replace(
  /const finalWashCount = ceroLavado \? 0 : washCount;/g,
  'const finalWashCount = washCount;'
);

// Remove the ceroLavado checkbox UI
content = content.replace(
  /\{\s*washCount > 0 && \(\s*<div style=\{\{ display: 'flex'[^>]+>[\s\S]*?Cero Lavado \(Omitir lavado\/comisión\)[\s\S]*?<\/div>\s*\)\}/g,
  ''
);

// 2. Add clientCoupons and reminder states
content = content.replace(
  /const \[scheduleReminder, setScheduleReminder\] = useState\(true\);/g,
  `const [scheduleReminder, setScheduleReminder] = useState(true);
  const [reminderPreset, setReminderPreset] = useState('14_days');
  const [reminderDate, setReminderDate] = useState(null);
  const [clientCoupons, setClientCoupons] = useState([]);`
);

// Imports update for PandaDatePicker and Calendar
if (!content.includes('PandaDatePicker')) {
  content = content.replace(
    /import PandaDialog from '.\/PandaDialog';/g,
    `import PandaDialog from './PandaDialog';\nimport PandaDatePicker from './PandaDatePicker';\nimport { Calendar } from 'lucide-react';`
  );
}

// Fetch coupons in useEffect
content = content.replace(
  /setCouponDiscount\(0\);\n\s*\}, \[selectedApp\]\);/g,
  `setCouponDiscount(0);
    const fetchCoupons = async () => {
      const cId = selectedApp?.client_id;
      if (cId) {
        try {
          const fetched = await dataService.getCoupons(cId);
          setClientCoupons(fetched.filter(c => c.status === 'UNUSED'));
        } catch(e) {
          console.error('Error fetching coupons', e);
        }
      } else {
        setClientCoupons([]);
      }
    };
    fetchCoupons();
  }, [selectedApp]);`
);

// Fetch coupons when selectedClient changes too, since direct sales could use coupons?
content = content.replace(
  /const handleSelectDirectSaleClient = \(client\) => \{([\s\S]*?)\};/g,
  `const handleSelectDirectSaleClient = (client) => {$1
    dataService.getCoupons(client.id).then(fetched => {
      setClientCoupons(fetched.filter(c => c.status === 'UNUSED'));
    }).catch(console.error);
  };`
);

// 3. Update the Recordatorio WhatsApp UI
const oldReminderUI = /\{selectedApp && \(\s*<div style=\{\{ display: 'flex'[^>]+>[\s\S]*?Recordatorio WhatsApp \(14 días\)[\s\S]*?<\/div>\s*\)\}/g;
const newReminderUI = `{selectedApp && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '8px', padding: '12px', background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '12px', marginBottom: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '12px', fontWeight: '800', color: 'var(--text-secondary)' }}>Recordatorio para su siguiente corte</span>
                      <input 
                        type="checkbox" 
                        checked={scheduleReminder} 
                        onChange={(e) => setScheduleReminder(e.target.checked)}
                        style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                      />
                    </div>
                    {scheduleReminder && (
                      <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '8px' }}>
                        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                          {[
                            { value: '1_week', label: '1 Semana' },
                            { value: '14_days', label: '14 Días' },
                            { value: '1_month', label: '1 Mes' },
                            { value: 'custom', label: 'Personalizado' }
                          ].map(opt => (
                            <button
                              key={opt.value}
                              onClick={() => setReminderPreset(opt.value)}
                              style={{
                                flex: 1,
                                padding: '6px 10px',
                                borderRadius: '8px',
                                border: '1px solid',
                                borderColor: reminderPreset === opt.value ? 'var(--gold-primary)' : 'rgba(255,255,255,0.1)',
                                background: reminderPreset === opt.value ? 'rgba(255,255,255,0.1)' : 'transparent',
                                color: reminderPreset === opt.value ? 'var(--gold-primary)' : 'var(--text-muted)',
                                fontSize: '11px',
                                fontWeight: '800',
                                cursor: 'pointer',
                                transition: 'all 0.2s'
                              }}
                            >
                              {opt.label}
                            </button>
                          ))}
                        </div>
                        {reminderPreset === 'custom' && (
                          <div style={{ marginTop: '4px' }}>
                            <PandaDatePicker 
                              value={reminderDate}
                              onChange={setReminderDate}
                              placeholder="Seleccionar fecha"
                            />
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}`;
content = content.replace(oldReminderUI, newReminderUI);


// 4. Update Coupons UI
const oldCouponsUI = /\{!activeCoupon \? \([\s\S]*?VALIDAR\s*<\/button>\s*<\/div>\s*\)\s*:\s*\(/g;
const newCouponsUI = `{!activeCoupon ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {clientCoupons.length > 0 ? (
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                            {clientCoupons.map(c => (
                              <button 
                                key={c.id}
                                onClick={() => {
                                  setActiveCoupon(c);
                                  showToast(\`Cupón válido: \${c.prize_name}\`, "success");
                                  if (c.prize_name?.includes('10%')) {
                                    setCouponDiscount(servicePrice * 0.1);
                                  } else if (c.prize_name?.toLowerCase().includes('corte')) {
                                    const corteApp = totalAppsInCheckout.find(a => a.services?.name?.toLowerCase().includes('corte'));
                                    const discountVal = corteApp ? (corteApp.total_price || corteApp.services?.price || 0) : 0;
                                    setCouponDiscount(discountVal);
                                  } else if (c.prize_name?.toLowerCase().includes('lavado')) {
                                    const washDiscountVal = washCount * (washRate || 1);
                                    setCouponDiscount(washDiscountVal);
                                  } else {
                                    setCouponDiscount(5);
                                  }
                                }}
                                style={{
                                  flex: '1 1 calc(50% - 4px)',
                                  padding: '8px',
                                  background: 'rgba(255, 215, 0, 0.1)',
                                  border: '1px solid var(--gold-primary)',
                                  borderRadius: '8px',
                                  color: 'var(--gold-primary)',
                                  fontSize: '11px',
                                  fontWeight: '800',
                                  cursor: 'pointer',
                                  display: 'flex',
                                  flexDirection: 'column',
                                  alignItems: 'flex-start',
                                  gap: '4px'
                                }}
                              >
                                <span>🎁 {c.prize_name}</span>
                                <span style={{ fontSize: '9px', color: 'var(--text-muted)' }}>Click para canjear</span>
                              </button>
                            ))}
                          </div>
                        ) : (
                          <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontStyle: 'italic', padding: '8px 0' }}>
                            No hay cupones disponibles para este cliente.
                          </div>
                        )}
                        <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                          <input 
                            type="text" 
                            placeholder="O ingresa código manual..."
                            value={couponCode}
                            onChange={(e) => setCouponCode(e.target.value)}
                            style={{ flex: 1, height: '36px', fontSize: '12px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '8px', color: 'white', paddingLeft: '8px' }}
                          />
                          <button 
                            onClick={async () => {
                              if (!couponCode) return;
                              try {
                                setLoading(true);
                                const coupons = await dataService.getCoupons();
                                const code = couponCode.trim().toUpperCase();
                                const found = coupons.find(c => c.id?.substring(0, 8).toUpperCase() === code || c.id === couponCode.trim());
                                
                                if (!found) {
                                  showToast("Cupón no encontrado", "error");
                                  return;
                                }
                                if (found.status === 'USED') {
                                  showToast("El cupón ya ha sido utilizado", "warning");
                                  return;
                                }
                                
                                setActiveCoupon(found);
                                showToast(\`Cupón válido: \${found.prize_name}\`, "success");
                                
                                if (found.prize_name?.includes('10%')) {
                                  setCouponDiscount(servicePrice * 0.1);
                                } else if (found.prize_name?.toLowerCase().includes('corte')) {
                                  const corteApp = totalAppsInCheckout.find(a => a.services?.name?.toLowerCase().includes('corte'));
                                  const discountVal = corteApp ? (corteApp.total_price || corteApp.services?.price || 0) : 0;
                                  setCouponDiscount(discountVal);
                                } else if (found.prize_name?.toLowerCase().includes('lavado')) {
                                  const washDiscountVal = washCount * (washRate || 1);
                                  setCouponDiscount(washDiscountVal);
                                } else {
                                  setCouponDiscount(5);
                                }
                              } catch (err) {
                                console.error(err);
                                showToast("Error al validar cupón", "error");
                              } finally {
                                setLoading(false);
                              }
                            }}
                            className="btn-gold" 
                            style={{ height: '36px', padding: '0 12px', borderRadius: '8px', fontSize: '11px' }}
                          >
                            VALIDAR
                          </button>
                        </div>
                      </div>
                    ) : (`;

content = content.replace(oldCouponsUI, newCouponsUI);

// Fix the whatsapp reminder payload in handleProcessCheckout
const scheduleReminderRegex = /if \(scheduleReminder && selectedApp\) \{[\s\S]*?await whatsappService\.scheduleFollowUpReminder\(selectedApp\.client_id, selectedApp\.id\);[\s\S]*?\}/;

const newScheduleReminderBlock = `if (scheduleReminder && selectedApp) {
            let followUpDate = null;
            if (reminderPreset === 'custom' && reminderDate) {
              followUpDate = reminderDate;
            } else if (reminderPreset === '1_week') {
              const d = new Date();
              d.setDate(d.getDate() + 7);
              followUpDate = d.toISOString();
            } else if (reminderPreset === '1_month') {
              const d = new Date();
              d.setMonth(d.getMonth() + 1);
              followUpDate = d.toISOString();
            } else { // default to 14 days
              const d = new Date();
              d.setDate(d.getDate() + 14);
              followUpDate = d.toISOString();
            }
            await whatsappService.scheduleFollowUpReminder(selectedApp.client_id, selectedApp.id, followUpDate);
          }`;

content = content.replace(scheduleReminderRegex, newScheduleReminderBlock);

// Write back
fs.writeFileSync(targetFile, content);
console.log('Done modifying CheckoutPOS.jsx');
