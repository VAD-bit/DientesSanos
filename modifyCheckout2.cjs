const fs = require('fs');
const path = require('path');

const targetFile = path.join(__dirname, 'src', 'components', 'CheckoutPOS.jsx');
let content = fs.readFileSync(targetFile, 'utf8');

// =====================
// 1. Add imports
// =====================
// Add whatsappService import after notificationService
content = content.replace(
  "import { notificationService } from '../services/notificationService';\r\nimport PandaDialog from './PandaDialog';",
  "import { notificationService } from '../services/notificationService';\r\nimport { whatsappService } from '../services/whatsappService';\r\nimport PandaDatePicker from './PandaDatePicker';\r\nimport PandaDialog from './PandaDialog';"
);

// =====================
// 2. Add states after activeAppForBarberChange
// =====================
content = content.replace(
  "  const [activeAppForBarberChange, setActiveAppForBarberChange] = useState(null);\r\n\r\n  // Modal State",
  `  const [activeAppForBarberChange, setActiveAppForBarberChange] = useState(null);

  // Coupon & Reminder States
  const [couponCode, setCouponCode] = useState('');
  const [activeCoupon, setActiveCoupon] = useState(null);
  const [couponDiscount, setCouponDiscount] = useState(0);
  const [clientCoupons, setClientCoupons] = useState([]);
  const [scheduleReminder, setScheduleReminder] = useState(true);
  const [reminderPreset, setReminderPreset] = useState('14_days');
  const [reminderDate, setReminderDate] = useState(null);

  // Modal State`
);

// =====================
// 3. Add coupon fetch useEffect after setLinkedApps useEffect
// =====================
const linkedAppsEffect = "  useEffect(() => {\r\n    setLinkedApps([]);\r\n  }, [selectedApp]);";
const couponEffect = `\r\n\r\n  // Reset coupon state & fetch client coupons when appointment changes
  useEffect(() => {
    setCouponCode('');
    setActiveCoupon(null);
    setCouponDiscount(0);
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
  }, [selectedApp]);`;

content = content.replace(linkedAppsEffect, linkedAppsEffect + couponEffect);

// =====================
// 4. Fix totalUsd to include couponDiscount
// =====================
// The original may have: totalUsd = servicePrice + productsTotal + extrasTotal + totalTips
// We add - couponDiscount
content = content.replace(
  /const totalUsd = Math\.max\(0, servicePrice \+ productsTotal \+ extrasTotal \+ totalTips\);/,
  'const totalUsd = Math.max(0, servicePrice + productsTotal + extrasTotal + totalTips - couponDiscount);'
);

// Or if it doesn't have couponDiscount at all:
content = content.replace(
  /const totalUsd = servicePrice \+ productsTotal \+ extrasTotal \+ totalTips;/,
  'const totalUsd = Math.max(0, servicePrice + productsTotal + extrasTotal + totalTips - couponDiscount);'
);

// =====================
// 5. Add coupon redemption in handleProcessCheckout (before final reset)
// =====================
const triggerRocketLine = "      triggerRocket();\r\n      showToast(\"¡Venta completada con éxito!\", \"success\");";
const couponRedemption = `
      // Redeem coupon if active
      if (activeCoupon?.id) {
        try { await dataService.redeemCoupon(activeCoupon.id); } catch(e) { console.error('Error redeeming coupon', e); }
      }
      // Schedule WhatsApp reminder
      if (scheduleReminder && selectedApp) {
        try {
          let followUpDate = null;
          if (reminderPreset === 'custom' && reminderDate) {
            followUpDate = reminderDate;
          } else if (reminderPreset === '1_week') {
            const d = new Date(); d.setDate(d.getDate() + 7); followUpDate = d.toISOString();
          } else if (reminderPreset === '1_month') {
            const d = new Date(); d.setMonth(d.getMonth() + 1); followUpDate = d.toISOString();
          } else {
            const d = new Date(); d.setDate(d.getDate() + 14); followUpDate = d.toISOString();
          }
          if (typeof whatsappService.scheduleFollowUpReminder === 'function') {
            await whatsappService.scheduleFollowUpReminder(selectedApp.client_id, selectedApp.id, followUpDate);
          }
        } catch(e) { console.error('Error scheduling reminder', e); }
      }
`;
content = content.replace(triggerRocketLine, couponRedemption + "\r\n      " + triggerRocketLine);

// =====================
// 6. Add Recordatorio UI (replace section before payment buttons)
// Find "const handleManualSale" not ideal, let's find the right render spot
// =====================
// The render area -- find where the total is shown (TOTAL A PAGAR) and add the reminder section above payment buttons

// Find: "const [scheduleReminder, setScheduleReminder] = useState(true);" -- it doesn't exist, we add our UI in the render
// The checkout section render - look for payment mode buttons section

// Find coupon section in render - in this old version it may not exist
// We'll add it after the tips section and before the total

// Find tips section end - look for "// Dynamic Tips Section" marker or just find "TOTAL A PAGAR"
const totalSection = '                  <span style={{ fontSize: isMobile ? \'13px\' : \'16px\', fontWeight: \'900\' }}>TOTAL A PAGAR</span>';

const newCheckoutSections = `
                {/* WhatsApp Reminder Section */}
                {selectedApp && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '8px', padding: '12px', background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '12px', marginBottom: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '12px', fontWeight: '800', color: 'var(--text-secondary)' }}>📱 Recordatorio para su siguiente corte</span>
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
                                transition: 'all 0.2s',
                                whiteSpace: 'nowrap'
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
                              placeholder="Seleccionar fecha del recordatorio"
                            />
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Coupon Section */}
                {selectedApp && (
                  <div style={{ padding: '12px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', marginBottom: '12px' }}>
                    <div style={{ fontSize: '11px', fontWeight: '900', color: 'var(--gold-primary)', marginBottom: '8px', letterSpacing: '0.5px' }}>🎁 CANJEAR CUPÓN DE REGALO</div>
                    
                    {!activeCoupon ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {clientCoupons.length > 0 ? (
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                            {clientCoupons.map(c => (
                              <button 
                                key={c.id}
                                onClick={() => {
                                  setActiveCoupon(c);
                                  showToast(\`Cupón válido: \${c.prize_name}\`, "success");
                                  const sPrice = totalAppsInCheckout.reduce((acc, app) => acc + (app.total_price !== undefined && app.total_price !== null && Number(app.total_price) > 0 ? Number(app.total_price) : (app.services?.price || 0)), 0);
                                  const wRate = allStaff.find(s => s.id === selectedWasherId) ? Number(allStaff.find(s => s.id === selectedWasherId).washing_rate || 0) : 0;
                                  if (c.prize_name?.includes('10%')) {
                                    setCouponDiscount(sPrice * 0.1);
                                  } else if (c.prize_name?.toLowerCase().includes('corte')) {
                                    const corteApp = totalAppsInCheckout.find(a => a.services?.name?.toLowerCase().includes('corte'));
                                    setCouponDiscount(corteApp ? (corteApp.total_price || corteApp.services?.price || 0) : 0);
                                  } else if (c.prize_name?.toLowerCase().includes('lavado')) {
                                    setCouponDiscount(washCount * (wRate || 1));
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
                                  gap: '4px',
                                  textAlign: 'left'
                                }}
                              >
                                <span>{c.prize_name}</span>
                                <span style={{ fontSize: '9px', color: 'var(--text-muted)' }}>Click para canjear</span>
                              </button>
                            ))}
                          </div>
                        ) : (
                          <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontStyle: 'italic', padding: '4px 0' }}>
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
                                if (!found) { showToast("Cupón no encontrado", "error"); return; }
                                if (found.status === 'USED') { showToast("El cupón ya ha sido utilizado", "warning"); return; }
                                setActiveCoupon(found);
                                showToast(\`Cupón válido: \${found.prize_name}\`, "success");
                                const sPrice = totalAppsInCheckout.reduce((acc, app) => acc + (app.total_price !== undefined && app.total_price !== null && Number(app.total_price) > 0 ? Number(app.total_price) : (app.services?.price || 0)), 0);
                                const wRate = allStaff.find(s => s.id === selectedWasherId) ? Number(allStaff.find(s => s.id === selectedWasherId).washing_rate || 0) : 0;
                                if (found.prize_name?.includes('10%')) {
                                  setCouponDiscount(sPrice * 0.1);
                                } else if (found.prize_name?.toLowerCase().includes('corte')) {
                                  const corteApp = totalAppsInCheckout.find(a => a.services?.name?.toLowerCase().includes('corte'));
                                  setCouponDiscount(corteApp ? (corteApp.total_price || corteApp.services?.price || 0) : 0);
                                } else if (found.prize_name?.toLowerCase().includes('lavado')) {
                                  setCouponDiscount(washCount * (wRate || 1));
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
                    ) : (
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(50, 215, 75, 0.1)', border: '1px solid rgba(50, 215, 75, 0.3)', padding: '8px 12px', borderRadius: '8px' }}>
                        <div>
                          <div style={{ fontSize: '12px', fontWeight: '800', color: '#32d74b' }}>{activeCoupon.prize_name} ✓ Aplicado</div>
                          <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Descuento: -{couponDiscount.toFixed(2)} €</div>
                        </div>
                        <button 
                          onClick={() => { setActiveCoupon(null); setCouponDiscount(0); setCouponCode(''); }}
                          style={{ background: 'none', border: 'none', color: '#ff453a', fontWeight: '950', fontSize: '16px', cursor: 'pointer' }}
                        >
                          &times;
                        </button>
                      </div>
                    )}
                  </div>
                )}

                `;

content = content.replace(totalSection, newCheckoutSections + totalSection);

// Write back
fs.writeFileSync(targetFile, content);
console.log('Done. Lines in file:', content.split('\n').length);
