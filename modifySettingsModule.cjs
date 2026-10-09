const fs = require('fs');
const path = require('path');

const targetFile = path.join(__dirname, 'src', 'components', 'SettingsModule.jsx');
let content = fs.readFileSync(targetFile, 'utf8');

// Update imports
content = content.replace(
  "import { Search, Plus, Ticket, Users, Check, Trash2, Loader2 } from 'lucide-react';",
  "import { Search, Plus, Ticket, Users, Check, Trash2, Loader2, Gift } from 'lucide-react';"
);

// Add state for tabs and roulette
content = content.replace(
  "const [searchTerm, setSearchTerm] = useState('');",
  "const [searchTerm, setSearchTerm] = useState('');\n  const [activeTab, setActiveTab] = useState('coupons');\n  const [roulettePrizes, setRoulettePrizes] = useState([]);\n  const [newPrizeName, setNewPrizeName] = useState('');"
);

// Load roulette prizes
const loadCouponsContent = `
  const loadCoupons = async () => {
    try {
      setLoading(true);
      const data = await dataService.getCoupons();
      setCoupons(data || []);
      const prizes = await dataService.getRoulettePrizes();
      setRoulettePrizes(prizes || []);
    } catch (e) {
      console.error(e);
      showToast('Error al cargar datos', 'error');
    } finally {
      setLoading(false);
    }
  };
`;

content = content.replace(
  /const loadCoupons = async \(\) => \{[\s\S]*?setLoading\(false\);\r?\n\s{4}\}\r?\n\s{2}\};/,
  loadCouponsContent.trim()
);

// Add roulette functions
const rouletteFunctions = `
  const handleAddPrize = async () => {
    if (!newPrizeName) return;
    try {
      setLoading(true);
      await dataService.addRoulettePrize(newPrizeName);
      setNewPrizeName('');
      await loadCoupons();
      showToast('Premio añadido a la ruleta');
    } catch(e) {
      console.error(e);
      showToast('Error al añadir premio', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleRemovePrize = async (id) => {
    confirm('¿Eliminar este premio de la ruleta?', async () => {
      try {
        setLoading(true);
        await dataService.removeRoulettePrize(id);
        await loadCoupons();
        showToast('Premio eliminado');
      } catch(e) {
        console.error(e);
        showToast('Error al eliminar premio', 'error');
      } finally {
        setLoading(false);
      }
    });
  };
`;

content = content.replace(
  "const filteredCoupons = coupons.filter(c => {",
  rouletteFunctions + "\n  const filteredCoupons = coupons.filter(c => {"
);

// Modify UI - Add Tabs
const titleSection = `        <div>
          <h2 style={{ fontSize: isMobile ? '26px' : '28px', fontWeight: '800', letterSpacing: '-0.5px', lineHeight: '1.2' }}>Ajustes y <span className="text-gold">Recompensas</span></h2>
          <p style={{ color: 'var(--text-secondary)', marginTop: '6px', fontSize: isMobile ? '13px' : '15px' }}>Gestión de cupones, regalos y parámetros del sistema.</p>
        </div>
        
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', width: isMobile ? '100%' : 'auto' }}>
          <button 
            className={\`btn-\${activeTab === 'coupons' ? 'gold' : 'secondary'}\`}
            onClick={() => setActiveTab('coupons')}
            style={{ borderRadius: '12px', padding: '10px 16px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px', flex: isMobile ? '1' : 'auto', justifyContent: 'center' }}
          >
            <Ticket size={16} /> Cupones Emitidos
          </button>
          <button 
            className={\`btn-\${activeTab === 'roulette' ? 'gold' : 'secondary'}\`}
            onClick={() => setActiveTab('roulette')}
            style={{ borderRadius: '12px', padding: '10px 16px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px', flex: isMobile ? '1' : 'auto', justifyContent: 'center' }}
          >
            <Gift size={16} /> Ruleta de Cumpleaños
          </button>
        </div>`;

content = content.replace(/<div>\s*<h2 style={{ fontSize: isMobile[\s\S]*?<\/button>\r?\n\s{6}<\/div>/, titleSection);

// Make coupons view conditional
content = content.replace(
  "{showAddForm && (",
  "{activeTab === 'coupons' ? (\n        <>\n          {/* Cupones Header */}\n          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '20px' }}>\n            <button \n              className=\"btn-gold\" \n              onClick={() => setShowAddForm(!showAddForm)} \n              style={{ borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 16px', fontSize: '13px' }}\n            >\n              {showAddForm ? 'Cancelar' : <><Plus size={16} /> Emitir Cupón</>}\n            </button>\n          </div>\n\n          {showAddForm && ("
);

// End coupons condition and start roulette condition
const tableEndTarget = `            </tbody>\n          </table>\n        </div>\n      )}`;
const tableEndReplacement = `            </tbody>
          </table>
        </div>
      )}
        </>
      ) : (
        <div className="animate-fade-in" style={{ maxWidth: '800px', margin: '0 auto' }}>
          <div className="glass-card" style={{ padding: '32px', borderRadius: '24px' }}>
            <h3 style={{ marginBottom: '16px', fontSize: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Gift size={24} color="var(--gold-primary)" /> Configurar Ruleta de Cumpleaños
            </h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '24px', lineHeight: '1.5' }}>
              Los premios listados aquí aparecerán en la ruleta del cliente el día de su cumpleaños. 
              Al girarla, ganarán uno de estos premios y se generará un cupón automáticamente.
            </p>

            <div style={{ display: 'flex', gap: '12px', marginBottom: '32px' }}>
              <input 
                className="form-input" 
                placeholder="Ej. Corte Gratis, Cejas Gratis, 10% Descuento..." 
                value={newPrizeName} 
                onChange={(e) => setNewPrizeName(e.target.value)} 
                style={{ flex: 1 }}
                onKeyDown={(e) => e.key === 'Enter' && handleAddPrize()}
              />
              <button className="btn-gold" onClick={handleAddPrize} disabled={!newPrizeName || loading} style={{ borderRadius: '12px', padding: '0 24px' }}>
                <Plus size={20} /> Añadir
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {roulettePrizes.length === 0 ? (
                <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)', border: '1px dashed var(--border-color)', borderRadius: '16px' }}>
                  No hay premios configurados. Añade premios arriba.
                </div>
              ) : (
                roulettePrizes.map((prize, idx) => (
                  <div key={prize.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', background: 'rgba(255,255,255,0.03)', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'rgba(255,215,0,0.1)', color: 'var(--gold-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '800', fontSize: '14px' }}>
                        {idx + 1}
                      </div>
                      <span style={{ fontSize: '15px', fontWeight: '600', color: 'white' }}>{prize.prize_name}</span>
                    </div>
                    <button onClick={() => handleRemovePrize(prize.id)} style={{ background: 'none', border: 'none', color: '#ff453a', cursor: 'pointer', padding: '8px' }}>
                      <Trash2 size={18} />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
`;

content = content.replace(tableEndTarget, tableEndReplacement);

fs.writeFileSync(targetFile, content);
console.log('Modified SettingsModule.jsx successfully');
