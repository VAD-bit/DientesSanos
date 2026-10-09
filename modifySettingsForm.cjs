const fs = require('fs');
const path = require('path');

const targetFile = path.join(__dirname, 'src', 'components', 'SettingsModule.jsx');
let content = fs.readFileSync(targetFile, 'utf8');

// Update state
const stateTarget = "const [newCoupon, setNewCoupon] = useState({ client_id: '', prize_name: '' });";
const stateReplacement = "const [newCoupon, setNewCoupon] = useState({ client_id: '', type: 'descuento', value: '', prize_name: '' });";
content = content.replace(stateTarget, stateReplacement);

// Update handleCreateCoupon
const createTarget = `  const handleCreateCoupon = async () => {
    if (!newCoupon.client_id || !newCoupon.prize_name) {
      showToast('Selecciona cliente y escribe el premio', 'warning');
      return;
    }
    try {
      setCreating(true);
      await dataService.generateCoupon(newCoupon.client_id, newCoupon.prize_name);`;

const createReplacement = `  const handleCreateCoupon = async () => {
    const finalPrizeName = newCoupon.type === 'descuento' ? \`\${newCoupon.value}% Descuento\` : \`Premio: \${newCoupon.prize_name}\`;
    
    if (!newCoupon.client_id || (newCoupon.type === 'descuento' && !newCoupon.value) || (newCoupon.type === 'premio' && !newCoupon.prize_name)) {
      showToast('Completa todos los campos requeridos', 'warning');
      return;
    }
    try {
      setCreating(true);
      await dataService.generateCoupon(newCoupon.client_id, finalPrizeName);`;

content = content.replace(createTarget, createReplacement);

// Update the reset of state
content = content.replace(
  "setNewCoupon({ client_id: '', prize_name: '' });",
  "setNewCoupon({ client_id: '', type: 'descuento', value: '', prize_name: '' });"
);

// Update the select options
const selectTarget = "options={clients.map(c => ({ value: c.id, label: `${c.name} (V-${c.id_card || ''})` }))}";
const selectReplacement = "options={clients.map(c => ({ value: c.id, label: `${c.name} (V-${c.id_card || ''}) - ${c.phone || ''}` }))}";
content = content.replace(selectTarget, selectReplacement);

// Update the form fields
const formTarget = `<div className="form-group">
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', color: 'var(--text-secondary)' }}>Premio / Descuento</label>
              <input 
                className="form-input" 
                placeholder="Ej. Corte Gratis, 10% Descuento" 
                value={newCoupon.prize_name} 
                onChange={(e) => setNewCoupon({...newCoupon, prize_name: e.target.value})} 
                style={{ width: '100%' }} 
              />
            </div>`;

const formReplacement = `<PandaSelect
              label="Tipo de Cupón"
              value={newCoupon.type}
              onChange={(val) => setNewCoupon({...newCoupon, type: val})}
              options={[{ value: 'descuento', label: 'Descuento (%)' }, { value: 'premio', label: 'Premio / Regalo' }]}
            />
            
            {newCoupon.type === 'descuento' ? (
              <div className="form-group">
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', color: 'var(--text-secondary)' }}>Porcentaje de Descuento (%)</label>
                <input 
                  type="number"
                  className="form-input" 
                  placeholder="Ej. 15" 
                  value={newCoupon.value} 
                  onChange={(e) => setNewCoupon({...newCoupon, value: e.target.value})} 
                  style={{ width: '100%' }} 
                />
              </div>
            ) : (
              <div className="form-group">
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', color: 'var(--text-secondary)' }}>Descripción del Premio</label>
                <input 
                  className="form-input" 
                  placeholder="Ej. Corte Gratis, Cejas, Producto..." 
                  value={newCoupon.prize_name} 
                  onChange={(e) => setNewCoupon({...newCoupon, prize_name: e.target.value})} 
                  style={{ width: '100%' }} 
                />
              </div>
            )}`;

content = content.replace(formTarget, formReplacement);

// Fix disabled check
content = content.replace(
  "disabled={creating || !newCoupon.client_id || !newCoupon.prize_name}",
  "disabled={creating || !newCoupon.client_id || (newCoupon.type === 'descuento' && !newCoupon.value) || (newCoupon.type === 'premio' && !newCoupon.prize_name)}"
);

fs.writeFileSync(targetFile, content);
console.log('Modified SettingsModule coupon form successfully');
