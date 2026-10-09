const fs = require('fs');
const path = require('path');

const targetFile = path.join(__dirname, 'src', 'components', 'ReceptionModule.jsx');
let content = fs.readFileSync(targetFile, 'utf8');

// 1. Add states
const statesTarget = "const [searchMode, setSearchMode] = useState('phone');";
const statesReplacement = "const [searchMode, setSearchMode] = useState('phone');\n  const [clientCoupons, setClientCoupons] = useState([]);\n  const [selectedCoupon, setSelectedCoupon] = useState(null);";

content = content.replace(statesTarget, statesReplacement);

// 2. Fetch coupons on selectedClient change
const effectTarget = `  useEffect(() => {
    if (selectedClient) {
      fetchFrequentBarber(selectedClient.id);
    } else {
      setFrequentBarber(null);
    }
  }, [selectedClient]);`;

const effectReplacement = `  useEffect(() => {
    if (selectedClient) {
      fetchFrequentBarber(selectedClient.id);
      dataService.getCoupons().then(coupons => {
        setClientCoupons((coupons || []).filter(c => c.client_id === selectedClient.id && c.status === 'UNUSED'));
      }).catch(console.error);
    } else {
      setFrequentBarber(null);
      setClientCoupons([]);
      setSelectedCoupon(null);
    }
  }, [selectedClient]);`;

content = content.replace(effectTarget, effectReplacement);

// 3. Attach selectedCoupon to metadata
const metadataTarget = "metadata: {},";
const metadataReplacement = "metadata: {\n          coupon_id: selectedCoupon ? selectedCoupon.id : null\n        },";
content = content.replace(metadataTarget, metadataReplacement);

// 4. Inject UI
const uiTarget = `                  <button onClick={() => setSelectedClient(null)} style={{ background: 'none', border: 'none', color: '#ff453a', fontWeight: '800', cursor: 'pointer', transition: 'color 0.2s' }} onMouseEnter={e => e.currentTarget.style.color = '#ff6b64'} onMouseLeave={e => e.currentTarget.style.color = '#ff453a'}>Cambiar</button>
                </div>`;

const uiReplacement = `                  <button onClick={() => setSelectedClient(null)} style={{ background: 'none', border: 'none', color: '#ff453a', fontWeight: '800', cursor: 'pointer', transition: 'color 0.2s' }} onMouseEnter={e => e.currentTarget.style.color = '#ff6b64'} onMouseLeave={e => e.currentTarget.style.color = '#ff453a'}>Cambiar</button>
                </div>
                
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
                          {selectedCoupon?.id === coupon.id && <Check size={12} />}
                          {coupon.prize_name}
                        </button>
                      ))}
                    </div>
                    {selectedCoupon && (
                      <div style={{ marginTop: '8px', fontSize: '10px', color: 'var(--text-secondary)' }}>
                        * El cupón se enviará en la orden. Asegúrate de seleccionar un barbero abajo.
                      </div>
                    )}
                  </div>
                )}`;

content = content.replace(uiTarget, uiReplacement);

// 5. Add Ticket, Check to imports if missing
if (!content.includes('Ticket')) {
  content = content.replace("import { \n  Search", "import { \n  Search,\n  Ticket,\n  Check");
}

fs.writeFileSync(targetFile, content);
console.log('Modified ReceptionModule successfully');
