const fs = require('fs');
const path = require('path');

const targetFile = path.join(__dirname, 'src', 'components', 'ReceptionModule.jsx');
let content = fs.readFileSync(targetFile, 'utf8');

// 1. Add coupon state and Ticket icon
content = content.replace(
  "import { \r\n  Users, \r\n  Search, \r\n  UserPlus",
  "import { \r\n  Users, \r\n  Search, \r\n  UserPlus, \r\n  Ticket"
);

content = content.replace(
  "const [selectedClient, setSelectedClient] = useState(null);",
  "const [selectedClient, setSelectedClient] = useState(null);\r\n  const [clientCoupons, setClientCoupons] = useState([]);\r\n  const [selectedCoupon, setSelectedCoupon] = useState(null);"
);

// 2. Fetch coupons when client changes
const useEffectTarget = "  useEffect(() => {\r\n    if (selectedClient) {\r\n      fetchFrequentBarber(selectedClient.id);";
const useEffectReplacement = `  useEffect(() => {
    if (selectedClient) {
      fetchFrequentBarber(selectedClient.id);
      dataService.getCoupons(selectedClient.id).then(coupons => {
        setClientCoupons((coupons || []).filter(c => c.status === 'UNUSED'));
      }).catch(console.error);
    } else {
      setClientCoupons([]);
      setSelectedCoupon(null);`;

content = content.replace(useEffectTarget, useEffectReplacement);

// 3. Clear selectedCoupon on client deselect or new client
content = content.replace(
  "setSelectedClient(null);",
  "setSelectedClient(null); setSelectedCoupon(null);"
);

// 4. Render the coupons right below the client details
const clientCardBottom = "                      <span style={{ opacity: 0.6, fontSize: '9px', fontWeight: '900', color: 'var(--text-muted)' }}>CÉDULA:</span> V-{selectedClient.id_card}\r\n                    </div>\r\n                  )}";

const couponSection = `                  )}
                  {clientCoupons.length > 0 && (
                    <div style={{ marginTop: '16px', background: 'rgba(255, 215, 0, 0.05)', border: '1px solid rgba(255, 215, 0, 0.2)', padding: '12px', borderRadius: '12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--gold-primary)', fontSize: '11px', fontWeight: '900', marginBottom: '8px' }}>
                        <Ticket size={14} /> CUPONES DISPONIBLES
                      </div>
                      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        {clientCoupons.map(coupon => (
                          <button
                            key={coupon.id}
                            onClick={() => {
                              setSelectedCoupon(selectedCoupon?.id === coupon.id ? null : coupon);
                            }}
                            style={{
                              background: selectedCoupon?.id === coupon.id ? 'var(--gold-primary)' : 'rgba(255,255,255,0.05)',
                              color: selectedCoupon?.id === coupon.id ? 'black' : 'white',
                              border: selectedCoupon?.id === coupon.id ? '1px solid var(--gold-primary)' : '1px solid rgba(255,255,255,0.1)',
                              padding: '6px 12px',
                              borderRadius: '8px',
                              fontSize: '11px',
                              fontWeight: '700',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px'
                            }}
                          >
                            {selectedCoupon?.id === coupon.id && <CheckCircle2 size={12} />}
                            {coupon.prize_name}
                          </button>
                        ))}
                      </div>
                      {selectedCoupon && (
                        <div style={{ marginTop: '8px', fontSize: '10px', color: 'var(--text-secondary)' }}>
                          * El cupón se enviará en la orden. Selecciona un barbero abajo.
                        </div>
                      )}
                    </div>
                  )}`;

content = content.replace(clientCardBottom, couponSection);

// 5. Send coupon info to database via handleConfirmTurn metadata
const handleConfirmTarget = "const appointmentMetadata = {\r\n            totalPrice,\r\n            totalCommission,";
const handleConfirmReplacement = `const appointmentMetadata = {
            totalPrice,
            totalCommission,
            coupon_id: selectedCoupon ? selectedCoupon.id : null,`;

content = content.replace(handleConfirmTarget, handleConfirmReplacement);

// 6. Reset selectedCoupon on successful dispatch
content = content.replace(
  "setSelectedExtras([]);",
  "setSelectedExtras([]); setSelectedCoupon(null);"
);

// Write back
fs.writeFileSync(targetFile, content);
console.log('Modified ReceptionModule.jsx. Lines:', content.split('\\n').length);
