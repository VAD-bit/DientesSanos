const fs = require('fs');
const path = require('path');

const targetFile = path.join(__dirname, 'src', 'components', 'SettingsModule.jsx');
let content = fs.readFileSync(targetFile, 'utf8');

// 1. Change handleDeleteCoupon to use await confirm
content = content.replace(
  `if (window.confirm("¿Seguro que deseas eliminar este cupón?")) {`,
  `const isConfirmed = await confirm("¿Seguro que deseas eliminar este cupón?", "Eliminar Cupón");\n    if (isConfirmed) {`
);

// 2. Add Edit Modal State
const stateTarget = `const [assigning, setAssigning] = useState(false);`;
const stateReplacement = `const [assigning, setAssigning] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editCouponId, setEditCouponId] = useState(null);
  const [editCouponText, setEditCouponText] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);`;

content = content.replace(stateTarget, stateReplacement);

// 3. Update handleEditCoupon function
const handleEditTarget = `const handleEditCoupon = async (coupon) => {
    const newName = window.prompt("Editar descripción del cupón/descuento (ej. 10% Descuento, Premio: Corte Gratis):", coupon.prize_name);
    if (newName && newName !== coupon.prize_name) {
      try {
        await dataService.updateCoupon(coupon.id, newName);
        showToast("Cupón actualizado", "success");
        loadCoupons();
      } catch (e) {
        showToast("Error al actualizar cupón", "error");
      }
    }
  };`;

const handleEditReplacement = `const openEditModal = (coupon) => {
    setEditCouponId(coupon.id);
    setEditCouponText(coupon.prize_name);
    setShowEditModal(true);
  };

  const handleEditCoupon = async () => {
    if (!editCouponText.trim()) {
      showToast("La descripción no puede estar vacía", "warning");
      return;
    }
    setSavingEdit(true);
    try {
      await dataService.updateCoupon(editCouponId, editCouponText);
      showToast("Cupón actualizado", "success");
      setShowEditModal(false);
      loadCoupons();
    } catch (e) {
      showToast("Error al actualizar cupón", "error");
    } finally {
      setSavingEdit(false);
    }
  };`;

content = content.replace(handleEditTarget, handleEditReplacement);

// 4. Update the onClick in the table to use openEditModal
content = content.replace(
  `onClick={() => handleEditCoupon(coupon)}`,
  `onClick={() => openEditModal(coupon)}`
);

// 5. Add the Edit Modal Markup
const modalTarget = `{/* Modal Asignar Cupón */}`;
const modalReplacement = `{/* Modal Editar Cupón */}
      {showEditModal && (
        <div className="modal-overlay">
          <div className="modal-content animate-scale" style={{ maxWidth: '400px' }}>
            <h2 style={{ marginBottom: '24px', fontSize: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Pencil size={24} color="var(--gold-primary)" /> Editar Cupón
            </h2>
            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', color: 'var(--text-secondary)' }}>
                Descripción del cupón/premio
              </label>
              <input
                type="text"
                value={editCouponText}
                onChange={(e) => setEditCouponText(e.target.value)}
                style={{
                  width: '100%',
                  background: 'rgba(0,0,0,0.2)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '8px',
                  padding: '12px 16px',
                  color: 'white',
                  fontSize: '14px',
                  outline: 'none'
                }}
                autoFocus
              />
            </div>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button 
                className="btn-outline" 
                onClick={() => setShowEditModal(false)}
              >
                Cancelar
              </button>
              <button 
                className="btn-gold" 
                onClick={handleEditCoupon}
                disabled={savingEdit || !editCouponText.trim()}
              >
                {savingEdit ? <Loader2 className="animate-spin" size={16} /> : 'Guardar Cambios'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Asignar Cupón */}`;

content = content.replace(modalTarget, modalReplacement);

fs.writeFileSync(targetFile, content);
console.log("Replaced native prompts with custom modals.");
