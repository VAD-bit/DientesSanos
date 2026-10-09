const fs = require('fs');
const path = require('path');

const targetFile = path.join(__dirname, 'src', 'components', 'ClientModule.jsx');
let content = fs.readFileSync(targetFile, 'utf8');

// 1. Add RouletteModal component right before ClientDetail
const rouletteModalStr = `
const RouletteModal = ({ isOpen, onClose, onFinish, prizes }) => {
  const [spinning, setSpinning] = useState(false);
  const [result, setResult] = useState(null);
  const [rotation, setRotation] = useState(0);

  if (!isOpen) return null;

  const spin = () => {
    if (spinning || prizes.length === 0) return;
    setSpinning(true);
    setResult(null);
    
    // Calculate random prize
    const randomIndex = Math.floor(Math.random() * prizes.length);
    const selectedPrize = prizes[randomIndex];
    
    // Calculate rotation
    const sliceAngle = 360 / prizes.length;
    // We want the selected index to be at the top (0 degrees).
    // The prize's center angle is idx * sliceAngle.
    // So we need to rotate to 360 - (idx * sliceAngle) + 360 * 5 (spins)
    const extraSpins = 5;
    const targetAngle = (360 * extraSpins) + (360 - (randomIndex * sliceAngle)) + (sliceAngle / 2); // adding half slice to land in middle

    setRotation(prev => prev + targetAngle);

    setTimeout(() => {
      setSpinning(false);
      setResult(selectedPrize);
      setTimeout(() => {
        onFinish(selectedPrize);
      }, 1500);
    }, 5000); // 5 seconds spin
  };

  return createPortal(
    <div style={{ position: 'fixed', inset: 0, zIndex: 100000, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(5px)' }}>
      <div className="glass-card animate-scale-in" style={{ padding: '30px', textAlign: 'center', maxWidth: '400px', width: '90%', position: 'relative' }}>
        <button onClick={onClose} disabled={spinning} style={{ position: 'absolute', top: '15px', right: '15px', background: 'none', border: 'none', color: 'white', cursor: spinning ? 'not-allowed' : 'pointer' }}>
          <X size={24} />
        </button>
        
        <h2 style={{ color: 'var(--gold-primary)', marginBottom: '20px', fontSize: '24px', fontWeight: '800' }}>Ruleta de Cumpleaños 🎉</h2>
        
        <div style={{ position: 'relative', width: '250px', height: '250px', margin: '0 auto 30px auto' }}>
          {/* Pointer */}
          <div style={{ position: 'absolute', top: '-15px', left: '50%', transform: 'translateX(-50%)', width: '0', height: '0', borderLeft: '15px solid transparent', borderRight: '15px solid transparent', borderTop: '25px solid var(--gold-primary)', zIndex: 10 }} />
          
          {/* Wheel */}
          <div style={{ 
            width: '100%', height: '100%', borderRadius: '50%', border: '4px solid var(--gold-primary)', 
            position: 'relative', overflow: 'hidden', 
            transform: \`rotate(\${rotation}deg)\`, 
            transition: 'transform 5s cubic-bezier(0.2, 0.8, 0.2, 1)' 
          }}>
            {prizes.length === 0 ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'white' }}>Sin premios</div>
            ) : prizes.map((p, i) => {
              const angle = 360 / prizes.length;
              const skew = 90 - angle;
              const rotationAngle = i * angle;
              const color = i % 2 === 0 ? '#1c1c1e' : '#2c2c2e'; // Alternating colors
              const textColor = i % 2 === 0 ? 'var(--gold-primary)' : 'white';
              
              return (
                <div key={i} style={{ 
                  position: 'absolute', width: '50%', height: '50%', 
                  transformOrigin: '100% 100%', 
                  transform: \`rotate(\${rotationAngle}deg) skewY(-\${skew}deg)\`, 
                  backgroundColor: color, 
                  border: '1px solid rgba(255,215,0,0.2)' 
                }}>
                  <div style={{ 
                    position: 'absolute', left: '100%', top: '100%', 
                    transformOrigin: '0 0', 
                    transform: \`skewY(\${skew}deg) rotate(\${angle / 2}deg) translate(30px, -70px)\`, 
                    color: textColor, fontWeight: '800', fontSize: '10px', whiteSpace: 'nowrap', width: '100px', textAlign: 'center' 
                  }}>
                    {p.prize_name}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {result ? (
          <div className="animate-fade-in" style={{ fontSize: '18px', fontWeight: '800', color: '#32d74b' }}>
            ¡Ganaste: {result.prize_name}! 🎁
          </div>
        ) : (
          <button 
            className="btn-gold" 
            onClick={spin} 
            disabled={spinning || prizes.length === 0}
            style={{ width: '100%', padding: '15px', fontSize: '18px', borderRadius: '12px', fontWeight: '800' }}
          >
            {spinning ? 'Girando...' : 'GIRAR RULETA'}
          </button>
        )}
      </div>
    </div>,
    document.body
  );
};
`;

content = content.replace(
  "const ClientDetail = ({ isMobile, client, onBack, onDelete, onUpdate }) => {",
  rouletteModalStr + "\nconst ClientDetail = ({ isMobile, client, onBack, onDelete, onUpdate }) => {"
);

// 2. Add states for ClientDetail
const statesStr = `
  const [clientCoupons, setClientCoupons] = useState([]);
  const [roulettePrizes, setRoulettePrizes] = useState([]);
  const [isRouletteOpen, setIsRouletteOpen] = useState(false);
`;

content = content.replace(
  "const [photoMeta, setPhotoMeta] = useState({ type: 'Normal', serviceId: null });",
  "const [photoMeta, setPhotoMeta] = useState({ type: 'Normal', serviceId: null });\n" + statesStr
);

// 3. Load coupons and prizes in ClientDetail
const loadHistoryTarget = "const loadHistory = async () => {";
const loadHistoryReplacement = `const loadHistory = async () => {
      try {
        const [coupons, prizes] = await Promise.all([
          dataService.getCoupons(client.id),
          dataService.getRoulettePrizes()
        ]);
        setClientCoupons(coupons || []);
        setRoulettePrizes(prizes || []);
      } catch (err) { console.error('Error loading coupons/prizes:', err); }
`;
content = content.replace(loadHistoryTarget, loadHistoryReplacement);

// 4. Roulette finish handler
const rouletteFinishTarget = "const handleDownloadComparison = () => {";
const rouletteFinishReplacement = `const handleRouletteFinish = async (prize) => {
    try {
      await dataService.generateCoupon(client.id, prize.prize_name);
      showToast(\`¡Cupón de \${prize.prize_name} generado exitosamente!\`);
      setTimeout(() => {
        setIsRouletteOpen(false);
        loadHistory(); // Reload to show the new coupon
      }, 2000);
    } catch(e) {
      console.error(e);
      showToast('Error al generar cupón', 'error');
    }
  };

  const handleDownloadComparison = () => {`;
content = content.replace(rouletteFinishTarget, rouletteFinishReplacement);

// 5. Birthday Logic & Banner UI
const birthdayLogic = `
  const today = new Date();
  let isBirthday = false;
  if (client.birth_date) {
    const bDate = new Date(client.birth_date);
    // Add timezone offset to prevent day shifting issues
    const localBDate = new Date(bDate.getTime() + bDate.getTimezoneOffset() * 60000);
    isBirthday = localBDate.getDate() === today.getDate() && localBDate.getMonth() === today.getMonth();
  }

  const hasReceivedBirthdayPrizeThisYear = clientCoupons.some(c => {
    if (!c.prize_name || !c.generated_at) return false;
    const generatedDate = new Date(c.generated_at);
    return generatedDate.getFullYear() === today.getFullYear() && 
           c.prize_name === 'PREMIO DE CUMPLEAÑOS (RULETA)'; // Not quite, we generate it with its actual prize name. 
           // Let's just check if they generated ANY coupon today to prevent multiple spins, or just check the last coupon date.
  });
  
  const canSpinRoulette = isBirthday && !clientCoupons.some(c => new Date(c.generated_at).toDateString() === today.toDateString());

  const BirthdayBanner = () => {
    if (!isBirthday) return null;
    return (
      <div className="glass-card animate-pulse" style={{ background: 'linear-gradient(45deg, rgba(255,215,0,0.1), rgba(255,105,180,0.1))', border: '1px solid var(--gold-primary)', padding: '20px', textAlign: 'center', marginBottom: '24px' }}>
        <h3 style={{ color: 'var(--gold-primary)', fontSize: '20px', fontWeight: '900', marginBottom: '10px' }}>¡Feliz Cumpleaños {client.name.split(' ')[0]}! 🎉🎂</h3>
        <p style={{ color: 'white', fontSize: '14px', marginBottom: '16px' }}>Es su día especial. Dale click abajo para que descubra su regalo.</p>
        {canSpinRoulette ? (
          <button onClick={() => setIsRouletteOpen(true)} className="btn-gold" style={{ padding: '12px 24px', borderRadius: '12px', fontWeight: '800', display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
            <Gift size={20} /> ¡Ver mi Premio!
          </button>
        ) : (
          <div style={{ color: '#32d74b', fontWeight: '800', fontSize: '14px' }}>¡Ya recibió su regalo de cumpleaños hoy!</div>
        )}
      </div>
    );
  };
`;

const clientDetailRenderTarget = "return (\r\n    <div className=\"client-detail animate-slide-up\">";
const clientDetailRenderTargetAlt = "return (\n    <div className=\"client-detail animate-slide-up\">";

content = content.replace(clientDetailRenderTarget, birthdayLogic + "\n  return (\n    <div className=\"client-detail animate-slide-up\">");
if (content.indexOf(birthdayLogic) === -1) {
  content = content.replace(clientDetailRenderTargetAlt, birthdayLogic + "\n  return (\n    <div className=\"client-detail animate-slide-up\">");
}

// 6. Inject Birthday Banner and Coupons UI into Mobile View
const mobileInjectTarget = "{/* Mobile: History (last 5 + show more) */}";
const mobileInjectReplacement = `<BirthdayBanner />
          
          <div className="glass-card" style={{ marginBottom: '24px' }}>
            <h4 style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Gift size={18} color="var(--gold-primary)" /> Premios y Cupones
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {clientCoupons.length === 0 ? (
                <div style={{ color: 'var(--text-muted)', fontSize: '13px' }}>No hay cupones ni premios disponibles.</div>
              ) : clientCoupons.map(c => (
                <div key={c.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.03)', padding: '12px', borderRadius: '10px', border: c.status === 'UNUSED' ? '1px solid rgba(50, 215, 75, 0.3)' : '1px solid rgba(255,255,255,0.05)' }}>
                  <div>
                    <div style={{ fontWeight: '800', color: 'white', fontSize: '13px' }}>{c.prize_name}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{new Date(c.generated_at).toLocaleDateString()}</div>
                  </div>
                  <div style={{ fontSize: '10px', fontWeight: '900', padding: '4px 8px', borderRadius: '6px', color: c.status === 'UNUSED' ? '#32d74b' : 'var(--text-muted)', backgroundColor: c.status === 'UNUSED' ? 'rgba(50,215,75,0.1)' : 'rgba(255,255,255,0.05)' }}>
                    {c.status === 'UNUSED' ? 'DISPONIBLE' : 'USADO'}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Mobile: History (last 5 + show more) */}`;

content = content.replace(mobileInjectTarget, mobileInjectReplacement);

// 7. Inject Birthday Banner and Coupons UI into Desktop View
const desktopInjectTarget = "{/* Desktop: History (last 10 + show more) */}";
const desktopInjectReplacement = `<BirthdayBanner />
            <div className="glass-card" style={{ marginBottom: '24px' }}>
              <h4 style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Gift size={18} color="var(--gold-primary)" /> Premios y Cupones
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {clientCoupons.length === 0 ? (
                  <div style={{ color: 'var(--text-muted)', fontSize: '13px' }}>No hay cupones ni premios disponibles.</div>
                ) : clientCoupons.map(c => (
                  <div key={c.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.03)', padding: '12px', borderRadius: '10px', border: c.status === 'UNUSED' ? '1px solid rgba(50, 215, 75, 0.3)' : '1px solid rgba(255,255,255,0.05)' }}>
                    <div>
                      <div style={{ fontWeight: '800', color: 'white', fontSize: '13px' }}>{c.prize_name}</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{new Date(c.generated_at).toLocaleDateString()}</div>
                    </div>
                    <div style={{ fontSize: '10px', fontWeight: '900', padding: '4px 8px', borderRadius: '6px', color: c.status === 'UNUSED' ? '#32d74b' : 'var(--text-muted)', backgroundColor: c.status === 'UNUSED' ? 'rgba(50,215,75,0.1)' : 'rgba(255,255,255,0.05)' }}>
                      {c.status === 'UNUSED' ? 'DISPONIBLE' : 'USADO'}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            {/* Desktop: History (last 10 + show more) */}`;

content = content.replace(desktopInjectTarget, desktopInjectReplacement);

// 8. Add RouletteModal to render block (before the last closing div of client-detail)
const modalInjectTarget = "{selectedVisit && (\r\n        <VisitDetailModal";
const modalInjectTargetAlt = "{selectedVisit && (\n        <VisitDetailModal";

const modalInjectReplacement = `<RouletteModal isOpen={isRouletteOpen} onClose={() => setIsRouletteOpen(false)} onFinish={handleRouletteFinish} prizes={roulettePrizes} />
      
      {selectedVisit && (
        <VisitDetailModal`;

content = content.replace(modalInjectTarget, modalInjectReplacement);
if (content.indexOf(modalInjectReplacement) === -1) {
  content = content.replace(modalInjectTargetAlt, modalInjectReplacement);
}

fs.writeFileSync(targetFile, content);
console.log('Modified ClientDetail successfully');
