const fs = require('fs');
const path = require('path');

const dataServiceFile = path.join(__dirname, 'src', 'services', 'dataService.js');
let dataServiceContent = fs.readFileSync(dataServiceFile, 'utf8');

dataServiceContent = dataServiceContent.replace(
`  async assignCoupon(couponId, clientId) {
    const { data, error } = await supabase
      .from('coupons')
      .update({ client_id: clientId })
      .eq('id', couponId)
      .select()
      .single();
    if (error) throw error;
    return data;
  },`,
`  async assignCoupon(couponId, clientId) {
    const { data: original, error: origError } = await supabase.from('coupons').select('*').eq('id', couponId).single();
    if (origError) throw origError;

    const { data, error } = await supabase
      .from('coupons')
      .insert([{ client_id: clientId, prize_name: original.prize_name, status: 'UNUSED' }])
      .select()
      .single();
    if (error) throw error;
    return data;
  },`
);
fs.writeFileSync(dataServiceFile, dataServiceContent, 'utf8');

const settingsFile = path.join(__dirname, 'src', 'components', 'SettingsModule.jsx');
let settingsContent = fs.readFileSync(settingsFile, 'utf8');

settingsContent = settingsContent.replace(
`      ) : coupons.length === 0 ? (
        <div className="glass-card" style={{ textAlign: 'center', padding: '80px', borderStyle: 'dashed' }}>
          <Ticket size={48} color="var(--bg-tertiary)" style={{ marginBottom: '20px' }} />
          <p style={{ color: 'var(--text-muted)' }}>No hay cupones emitidos. Crea el primero arriba.</p>
        </div>
      ) : (
        <div className="animate-slide-up" style={{ background: 'rgba(28, 28, 30, 0.95)', padding: '0', borderRadius: '24px', overflow: 'hidden', border: '1px solid rgba(255, 255, 255, 0.15)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', tableLayout: 'auto' }}>
            <thead>
              <tr style={{ backgroundColor: 'rgba(255,255,255,0.02)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <th style={{ padding: isMobile ? '12px' : '16px 24px', fontSize: '11px', fontWeight: '900', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Código / Fecha</th>
                <th style={{ padding: isMobile ? '12px' : '16px 24px', fontSize: '11px', fontWeight: '900', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Cliente</th>
                <th style={{ padding: isMobile ? '12px' : '16px 24px', fontSize: '11px', fontWeight: '900', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Premio</th>
                <th style={{ padding: isMobile ? '12px' : '16px 24px', fontSize: '11px', fontWeight: '900', color: 'var(--text-muted)', textTransform: 'uppercase', textAlign: 'right' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filteredCoupons.map((coupon) => (
                <tr key={coupon.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)', transition: 'background-color 0.2s' }} className="table-row-hover">
                  <td style={{ padding: isMobile ? '12px' : '16px 24px' }}>
                    <div style={{ fontWeight: '700', color: 'var(--gold-primary)', fontSize: isMobile ? '11px' : '13px', letterSpacing: '1px' }}>
                      {coupon.id?.substring(0, 8).toUpperCase()}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                      {new Date(coupon.generated_at).toLocaleDateString()}
                    </div>
                  </td>
                  <td style={{ padding: isMobile ? '12px' : '16px 24px', fontSize: isMobile ? '12px' : '14px', color: 'white', fontWeight: '600' }}>
                    {coupon.client_id ? (coupon.clients?.name || 'Cliente Eliminado') : (
                                <button 
                                  onClick={() => { setAssignCouponId(coupon.id); setShowAssignModal(true); }}
                                  style={{ background: 'var(--gold-primary)', color: 'black', border: 'none', padding: '6px 12px', borderRadius: '4px', fontSize: '11px', fontWeight: '800', cursor: 'pointer' }}
                                >
                                  Asignar Cupón
                                </button>
                              )}
                  </td>
                  <td style={{ padding: isMobile ? '12px' : '16px 24px', fontSize: isMobile ? '12px' : '14px', color: 'var(--text-secondary)' }}>
                    {coupon.prize_name}
                  </td>
                  <td style={{ padding: isMobile ? '12px' : '16px 24px', textAlign: 'right' }}>
                    {coupon.status === 'UNUSED' ? (
                      <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                        <button onClick={() => openEditModal(coupon)} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', padding: '6px', borderRadius: '6px', color: 'white', cursor: 'pointer' }} title="Editar">
                          <Pencil size={14} />
                        </button>
                        <button onClick={() => handleDeleteCoupon(coupon.id)} style={{ background: 'rgba(255,69,58,0.1)', border: '1px solid rgba(255,69,58,0.2)', padding: '6px', borderRadius: '6px', color: '#ff453a', cursor: 'pointer' }} title="Eliminar">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ) : (
                      <span style={{ fontSize: '11px', fontWeight: '800', color: 'var(--text-muted)', background: 'rgba(255,255,255,0.05)', padding: '4px 8px', borderRadius: '4px' }}>REDIMIDO</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}`,
`      ) : coupons.length === 0 ? (
        <div className="glass-card" style={{ textAlign: 'center', padding: '80px', borderStyle: 'dashed' }}>
          <Ticket size={48} color="var(--bg-tertiary)" style={{ marginBottom: '20px' }} />
          <p style={{ color: 'var(--text-muted)' }}>No hay cupones emitidos. Crea el primero arriba.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
          {/* PLANTILLAS DE CUPONES */}
          <div>
            <h4 style={{ color: 'white', fontSize: '18px', fontWeight: '700', marginBottom: '16px' }}>Plantillas de Cupones (Para Asignar)</h4>
            <div className="animate-slide-up" style={{ background: 'rgba(28, 28, 30, 0.95)', padding: '0', borderRadius: '24px', overflow: 'hidden', border: '1px solid rgba(255, 255, 255, 0.15)' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', tableLayout: 'auto' }}>
                <thead>
                  <tr style={{ backgroundColor: 'rgba(255,255,255,0.02)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <th style={{ padding: isMobile ? '12px' : '16px 24px', fontSize: '11px', fontWeight: '900', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Código Original</th>
                    <th style={{ padding: isMobile ? '12px' : '16px 24px', fontSize: '11px', fontWeight: '900', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Acción Principal</th>
                    <th style={{ padding: isMobile ? '12px' : '16px 24px', fontSize: '11px', fontWeight: '900', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Premio</th>
                    <th style={{ padding: isMobile ? '12px' : '16px 24px', fontSize: '11px', fontWeight: '900', color: 'var(--text-muted)', textTransform: 'uppercase', textAlign: 'right' }}>Gestión</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCoupons.filter(c => !c.client_id).length === 0 ? (
                    <tr>
                      <td colSpan="4" style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
                        No hay plantillas que coincidan con la búsqueda.
                      </td>
                    </tr>
                  ) : filteredCoupons.filter(c => !c.client_id).map((coupon) => (
                    <tr key={coupon.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)', transition: 'background-color 0.2s' }} className="table-row-hover">
                      <td style={{ padding: isMobile ? '12px' : '16px 24px' }}>
                        <div style={{ fontWeight: '700', color: 'var(--gold-primary)', fontSize: isMobile ? '11px' : '13px', letterSpacing: '1px' }}>
                          {coupon.id?.substring(0, 8).toUpperCase()}
                        </div>
                      </td>
                      <td style={{ padding: isMobile ? '12px' : '16px 24px', fontSize: isMobile ? '12px' : '14px', color: 'white', fontWeight: '600' }}>
                        <button 
                          onClick={() => { setAssignCouponId(coupon.id); setShowAssignModal(true); }}
                          style={{ background: 'var(--gold-primary)', color: 'black', border: 'none', padding: '6px 12px', borderRadius: '4px', fontSize: '11px', fontWeight: '800', cursor: 'pointer' }}
                        >
                          Asignar Cupón
                        </button>
                      </td>
                      <td style={{ padding: isMobile ? '12px' : '16px 24px', fontSize: isMobile ? '12px' : '14px', color: 'var(--text-secondary)' }}>
                        {coupon.prize_name}
                      </td>
                      <td style={{ padding: isMobile ? '12px' : '16px 24px', textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                          <button onClick={() => openEditModal(coupon)} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', padding: '6px', borderRadius: '6px', color: 'white', cursor: 'pointer' }} title="Editar">
                            <Pencil size={14} />
                          </button>
                          <button onClick={() => handleDeleteCoupon(coupon.id)} style={{ background: 'rgba(255,69,58,0.1)', border: '1px solid rgba(255,69,58,0.2)', padding: '6px', borderRadius: '6px', color: '#ff453a', cursor: 'pointer' }} title="Eliminar">
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* CUPONES ASIGNADOS */}
          <div>
            <h4 style={{ color: 'white', fontSize: '18px', fontWeight: '700', marginBottom: '16px' }}>Cupones Asignados a Clientes</h4>
            <div className="animate-slide-up" style={{ background: 'rgba(28, 28, 30, 0.95)', padding: '0', borderRadius: '24px', overflow: 'hidden', border: '1px solid rgba(255, 255, 255, 0.15)' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', tableLayout: 'auto' }}>
                <thead>
                  <tr style={{ backgroundColor: 'rgba(255,255,255,0.02)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <th style={{ padding: isMobile ? '12px' : '16px 24px', fontSize: '11px', fontWeight: '900', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Código / Fecha Asign.</th>
                    <th style={{ padding: isMobile ? '12px' : '16px 24px', fontSize: '11px', fontWeight: '900', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Cliente</th>
                    <th style={{ padding: isMobile ? '12px' : '16px 24px', fontSize: '11px', fontWeight: '900', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Premio</th>
                    <th style={{ padding: isMobile ? '12px' : '16px 24px', fontSize: '11px', fontWeight: '900', color: 'var(--text-muted)', textTransform: 'uppercase', textAlign: 'right' }}>Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCoupons.filter(c => c.client_id).length === 0 ? (
                    <tr>
                      <td colSpan="4" style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
                        No hay cupones asignados a clientes aún.
                      </td>
                    </tr>
                  ) : filteredCoupons.filter(c => c.client_id).map((coupon) => (
                    <tr key={coupon.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)', transition: 'background-color 0.2s' }} className="table-row-hover">
                      <td style={{ padding: isMobile ? '12px' : '16px 24px' }}>
                        <div style={{ fontWeight: '700', color: 'var(--gold-primary)', fontSize: isMobile ? '11px' : '13px', letterSpacing: '1px' }}>
                          {coupon.id?.substring(0, 8).toUpperCase()}
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                          {new Date(coupon.generated_at).toLocaleDateString()}
                        </div>
                      </td>
                      <td style={{ padding: isMobile ? '12px' : '16px 24px', fontSize: isMobile ? '12px' : '14px', color: 'white', fontWeight: '600' }}>
                        {coupon.clients?.name || 'Cliente Eliminado'}
                      </td>
                      <td style={{ padding: isMobile ? '12px' : '16px 24px', fontSize: isMobile ? '12px' : '14px', color: 'var(--text-secondary)' }}>
                        {coupon.prize_name}
                      </td>
                      <td style={{ padding: isMobile ? '12px' : '16px 24px', textAlign: 'right' }}>
                        {coupon.status === 'UNUSED' ? (
                          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', alignItems: 'center' }}>
                            <span style={{ fontSize: '11px', fontWeight: '800', color: 'var(--success-color)', background: 'rgba(0,255,0,0.1)', padding: '4px 8px', borderRadius: '4px' }}>DISPONIBLE</span>
                            <button onClick={() => handleDeleteCoupon(coupon.id)} style={{ background: 'rgba(255,69,58,0.1)', border: '1px solid rgba(255,69,58,0.2)', padding: '6px', borderRadius: '6px', color: '#ff453a', cursor: 'pointer' }} title="Revocar Cupón">
                              <Trash2 size={14} />
                            </button>
                          </div>
                        ) : (
                          <span style={{ fontSize: '11px', fontWeight: '800', color: 'var(--text-muted)', background: 'rgba(255,255,255,0.05)', padding: '4px 8px', borderRadius: '4px' }}>REDIMIDO</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}`
);

fs.writeFileSync(settingsFile, settingsContent, 'utf8');
console.log("Changes applied to both files.");
