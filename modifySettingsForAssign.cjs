const fs = require('fs');
const path = require('path');

const targetFile = path.join(__dirname, 'src', 'components', 'SettingsModule.jsx');
let content = fs.readFileSync(targetFile, 'utf8');

// 1. Add new state for assign modal
const stateTarget = "const [newCoupon, setNewCoupon] = useState({ client_id: '', type: 'descuento', value: '', prize_name: '' });";
const stateReplacement = `const [newCoupon, setNewCoupon] = useState({ type: 'descuento', value: '', prize_name: '' });
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [assignCouponId, setAssignCouponId] = useState(null);
  const [assignClientId, setAssignClientId] = useState('');
  const [assigning, setAssigning] = useState(false);`;
content = content.replace(stateTarget, stateReplacement);

// 2. Remove client_id check from creation
const createTarget = `const finalPrizeName = newCoupon.type === 'descuento' ? \`\${newCoupon.value}% Descuento\` : \`Premio: \${newCoupon.prize_name}\`;
    
    if (!newCoupon.client_id || (newCoupon.type === 'descuento' && !newCoupon.value) || (newCoupon.type === 'premio' && !newCoupon.prize_name)) {
      showToast('Completa todos los campos requeridos', 'warning');
      return;
    }
    try {
      setCreating(true);
      await dataService.generateCoupon(newCoupon.client_id, finalPrizeName);
      showToast('Cupón creado exitosamente');
      setNewCoupon({ client_id: '', type: 'descuento', value: '', prize_name: '' });`;

const createReplacement = `const finalPrizeName = newCoupon.type === 'descuento' ? \`\${newCoupon.value}% Descuento\` : \`Premio: \${newCoupon.prize_name}\`;
    
    if ((newCoupon.type === 'descuento' && !newCoupon.value) || (newCoupon.type === 'premio' && !newCoupon.prize_name)) {
      showToast('Completa todos los campos requeridos', 'warning');
      return;
    }
    try {
      setCreating(true);
      await dataService.generateCoupon(null, finalPrizeName); // client is null at creation
      showToast('Cupón creado exitosamente');
      setNewCoupon({ type: 'descuento', value: '', prize_name: '' });`;
content = content.replace(createTarget, createReplacement);

// 3. Add assign logic function
const addPrizeTarget = `const handleAddPrize = async () => {`;
const addPrizeReplacement = `const handleAssignCoupon = async () => {
    if (!assignCouponId || !assignClientId) {
      showToast('Selecciona un cliente para asignar el cupón', 'warning');
      return;
    }
    try {
      setAssigning(true);
      await dataService.assignCoupon(assignCouponId, assignClientId);
      showToast('Cupón asignado exitosamente', 'success');
      setShowAssignModal(false);
      setAssignCouponId(null);
      setAssignClientId('');
      await loadCoupons();
    } catch (e) {
      console.error(e);
      showToast('Error al asignar cupón', 'error');
    } finally {
      setAssigning(false);
    }
  };

  const handleAddPrize = async () => {`;
content = content.replace(addPrizeTarget, addPrizeReplacement);

// 4. Remove PandaSelect from creation form
// And fix disabled button condition
const formTarget = `<div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '24px' }}>
            <PandaSelect 
              label="Cliente (Destinatario)"
              value={newCoupon.client_id}
              onChange={(val) => setNewCoupon({...newCoupon, client_id: val})}
              options={clients.map(c => ({ value: c.id, label: \`\${c.name} (V-\${c.id_card || ''}) - \${c.phone || ''}\` }))}
              searchable={true}
              placeholder="Buscar cliente..."
            />
            
            <PandaSelect`;

const formReplacement = `<div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '24px' }}>
            <PandaSelect`;
content = content.replace(formTarget, formReplacement);

const disabledTarget = `disabled={creating || !newCoupon.client_id || (newCoupon.type === 'descuento' && !newCoupon.value) || (newCoupon.type === 'premio' && !newCoupon.prize_name)}`;
const disabledReplacement = `disabled={creating || (newCoupon.type === 'descuento' && !newCoupon.value) || (newCoupon.type === 'premio' && !newCoupon.prize_name)}`;
content = content.replace(disabledTarget, disabledReplacement);

// 5. Update Table to show "Asignar" if no client_id
// Look for how table renders client
const tdTarget = `<td style={{ padding: '16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <User size={16} color="var(--text-secondary)" />
                          </div>
                          <div>
                            <div style={{ fontWeight: '600' }}>
                              {clients.find(c => c.id === coupon.client_id)?.name || 'Cliente Eliminado'}
                            </div>
                            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                              ID: {coupon.id.substring(0,8).toUpperCase()}
                            </div>
                          </div>
                        </div>
                      </td>`;

const tdReplacement = `<td style={{ padding: '16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <User size={16} color="var(--text-secondary)" />
                          </div>
                          <div>
                            <div style={{ fontWeight: '600' }}>
                              {coupon.client_id ? (clients.find(c => c.id === coupon.client_id)?.name || 'Cliente Eliminado') : (
                                <button 
                                  onClick={() => { setAssignCouponId(coupon.id); setShowAssignModal(true); }}
                                  style={{ background: 'var(--gold-primary)', color: 'black', border: 'none', padding: '4px 12px', borderRadius: '4px', fontSize: '11px', fontWeight: '800', cursor: 'pointer' }}
                                >
                                  Asignar Cupón
                                </button>
                              )}
                            </div>
                            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                              ID: {coupon.id.substring(0,8).toUpperCase()}
                            </div>
                          </div>
                        </div>
                      </td>`;
content = content.replace(tdTarget, tdReplacement);

// 6. Add AssignModal
const modalTarget = `      {/* Modal Ruleta Add */}`;
const modalReplacement = `      {/* Modal Asignar Cupón */}
      {showAssignModal && (
        <div className="modal-overlay">
          <div className="modal-content animate-scale" style={{ maxWidth: '400px' }}>
            <h2 style={{ marginBottom: '24px', fontSize: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <User size={24} color="var(--gold-primary)" /> Asignar Cupón
            </h2>
            <div style={{ marginBottom: '24px' }}>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '16px' }}>Selecciona el cliente que recibirá este cupón. Puede buscar por nombre, cédula o teléfono.</p>
              <PandaSelect 
                label="Cliente (Destinatario)"
                value={assignClientId}
                onChange={(val) => setAssignClientId(val)}
                options={clients.map(c => ({ value: c.id, label: \`\${c.name} (V-\${c.id_card || ''}) - \${c.phone || ''}\` }))}
                searchable={true}
                placeholder="Buscar cliente..."
              />
            </div>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button 
                className="btn-outline" 
                onClick={() => { setShowAssignModal(false); setAssignClientId(''); setAssignCouponId(null); }}
              >
                Cancelar
              </button>
              <button 
                className="btn-gold" 
                onClick={handleAssignCoupon}
                disabled={assigning || !assignClientId}
              >
                {assigning ? <Loader2 className="animate-spin" /> : 'Confirmar Asignación'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Ruleta Add */}`;
content = content.replace(modalTarget, modalReplacement);

fs.writeFileSync(targetFile, content);
console.log('SettingsModule updated with Assign feature');
