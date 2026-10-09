const fs = require('fs');
const path = require('path');

// 1. Add deleteCoupon and updateCoupon to dataService.js
const dataServicePath = path.join(__dirname, 'src', 'services', 'dataService.js');
let dsContent = fs.readFileSync(dataServicePath, 'utf8');

const targetMethod = `  async assignCoupon(couponId, clientId) {`;
const newMethods = `  async updateCoupon(couponId, newPrizeName) {
    const { data, error } = await supabase.from('coupons').update({ prize_name: newPrizeName }).eq('id', couponId).select().single();
    if (error) throw error;
    return data;
  },
  async deleteCoupon(couponId) {
    const { error } = await supabase.from('coupons').delete().eq('id', couponId);
    if (error) throw error;
    return true;
  },
  async assignCoupon(couponId, clientId) {`;

if (!dsContent.includes('deleteCoupon(couponId)')) {
  dsContent = dsContent.replace(targetMethod, newMethods);
  fs.writeFileSync(dataServicePath, dsContent);
}

// 2. Modify SettingsModule.jsx
const settingsPath = path.join(__dirname, 'src', 'components', 'SettingsModule.jsx');
let setContent = fs.readFileSync(settingsPath, 'utf8');

// Ensure Pencil is imported
if (!setContent.includes('Pencil')) {
  setContent = setContent.replace('Trash2,', 'Trash2, Pencil,');
}

// Add handleEdit and handleDelete functions
const addHandleTarget = `const handleAssignCoupon = async () => {`;
const addHandleReplacement = `const handleEditCoupon = async (coupon) => {
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
  };

  const handleDeleteCoupon = async (id) => {
    if (window.confirm("¿Seguro que deseas eliminar este cupón?")) {
      try {
        await dataService.deleteCoupon(id);
        showToast("Cupón eliminado", "success");
        loadCoupons();
      } catch (e) {
        showToast("Error al eliminar cupón", "error");
      }
    }
  };

  const handleAssignCoupon = async () => {`;

if (!setContent.includes('handleDeleteCoupon')) {
  setContent = setContent.replace(addHandleTarget, addHandleReplacement);
}

// Replace header "Estado" with "Acciones"
setContent = setContent.replace(
  `<th style={{ padding: isMobile ? '12px' : '16px 24px', fontSize: '11px', fontWeight: '900', color: 'var(--text-muted)', textTransform: 'uppercase', textAlign: 'right' }}>Estado</th>`,
  `<th style={{ padding: isMobile ? '12px' : '16px 24px', fontSize: '11px', fontWeight: '900', color: 'var(--text-muted)', textTransform: 'uppercase', textAlign: 'right' }}>Acciones</th>`
);

// Replace "DISPONIBLE" span with action buttons
const tdTarget = `<td style={{ padding: isMobile ? '12px' : '16px 24px', textAlign: 'right' }}>
                    {coupon.status === 'UNUSED' ? (
                      <span style={{ fontSize: '10px', fontWeight: '800', color: '#32d74b', backgroundColor: 'rgba(50, 215, 75, 0.1)', padding: '4px 8px', borderRadius: '6px', border: '1px solid rgba(50, 215, 75, 0.2)' }}>
                        DISPONIBLE
                      </span>
                    ) : (
                      <span style={{ fontSize: '10px', fontWeight: '800', color: 'var(--text-muted)', backgroundColor: 'rgba(255, 255, 255, 0.05)', padding: '4px 8px', borderRadius: '6px' }}>
                        USADO ({coupon.redeemed_at ? new Date(coupon.redeemed_at).toLocaleDateString() : ''})
                      </span>
                    )}
                  </td>`;

const tdReplacement = `<td style={{ padding: isMobile ? '12px' : '16px 24px', textAlign: 'right' }}>
                    {coupon.status === 'UNUSED' ? (
                      <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                        <button onClick={() => handleEditCoupon(coupon)} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', padding: '6px', borderRadius: '6px', color: 'white', cursor: 'pointer' }} title="Editar">
                          <Pencil size={14} />
                        </button>
                        <button onClick={() => handleDeleteCoupon(coupon.id)} style={{ background: 'rgba(255, 69, 58, 0.1)', border: '1px solid rgba(255, 69, 58, 0.2)', padding: '6px', borderRadius: '6px', color: '#ff453a', cursor: 'pointer' }} title="Eliminar">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ) : (
                      <span style={{ fontSize: '10px', fontWeight: '800', color: 'var(--text-muted)', backgroundColor: 'rgba(255, 255, 255, 0.05)', padding: '4px 8px', borderRadius: '6px' }}>
                        USADO ({coupon.redeemed_at ? new Date(coupon.redeemed_at).toLocaleDateString() : ''})
                      </span>
                    )}
                  </td>`;

setContent = setContent.replace(tdTarget, tdReplacement);

fs.writeFileSync(settingsPath, setContent);
console.log("Updated SettingsModule correctly.");
