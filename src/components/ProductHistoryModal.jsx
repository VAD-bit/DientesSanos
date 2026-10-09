import React, { useState, useMemo } from 'react';
import { 
  X, 
  ShoppingBag, 
  TrendingUp, 
  Banknote, 
  Truck, 
  Search, 
  Calendar, 
  User, 
  Scissors, 
  AlertCircle,
  Package
} from 'lucide-react';
import AnimatedModal from './AnimatedModal';

const formatMoney = (val) => Number(val || 0).toLocaleString('es-VE', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2
});

const capitalize = (str) => {
  if (!str) return '';
  return str
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
};

export default function ProductHistoryModal({
  isOpen,
  onClose,
  history = [],
  totals = { sale: 0, margin: 0, cost: 0, saleUsd: 0, marginUsd: 0, costUsd: 0 },
  rate = 1
}) {
  const [search, setSearch] = useState('');
  const [filterCost, setFilterCost] = useState('all'); // 'all', 'with_cost', 'no_cost'

  const filteredHistory = useMemo(() => {
    const q = search.trim().toLowerCase();
    return history.filter(item => {
      // Search match
      const matchSearch = !q || 
        String(item.product || '').toLowerCase().includes(q) ||
        String(item.context || '').toLowerCase().includes(q) ||
        String(item.seller || '').toLowerCase().includes(q);

      // Cost filter match
      let matchCost = true;
      if (filterCost === 'with_cost') matchCost = item.hasCost;
      if (filterCost === 'no_cost') matchCost = !item.hasCost;

      return matchSearch && matchCost;
    });
  }, [history, search, filterCost]);

  return (
    <AnimatedModal isOpen={isOpen}>
      {(overlayClass, cardClass) => (
        <div 
          className={overlayClass.replace('global-modal-overlay', '')} 
          style={{ 
            position: 'fixed', 
            inset: 0, 
            zIndex: 3200, 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            padding: 'clamp(10px, 2.5vw, 24px)',
            paddingTop: 'max(10px, env(safe-area-inset-top, 10px))',
            boxSizing: 'border-box',
            background: 'var(--bg-secondary)',
            backdropFilter: 'blur(16px)' 
          }}
        >
          <div 
            className={cardClass.replace('global-modal-card', '')} 
            style={{ 
              width: 'min(980px, 96vw)', 
              maxHeight: 'min(90dvh, 780px)', 
              display: 'flex', 
              flexDirection: 'column', 
              background: 'var(--bg-secondary)', 
              border: '1px solid rgba(17, 17, 17, 0.28)', 
              borderRadius: '24px', 
              boxShadow: '0 28px 80px rgba(0,0,0,0.85)',
              overflow: 'hidden'
            }}
          >
            {/* Header */}
            <header style={{ 
              padding: 'clamp(14px, 2vw, 18px) clamp(16px, 2.5vw, 24px)', 
              borderBottom: '1px solid rgba(255, 255, 255, 0.07)', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'space-between',
              gap: '12px',
              flexShrink: 0
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ 
                  width: '42px', 
                  height: '42px', 
                  borderRadius: '13px', 
                  background: 'rgba(17, 17, 17, 0.12)', 
                  border: '1px solid rgba(17, 17, 17, 0.3)', 
                  display: 'grid', 
                  placeItems: 'center', 
                  color: 'var(--gold-primary)',
                  flexShrink: 0 
                }}>
                  <ShoppingBag size={22} />
                </div>
                <div>
                  <h2 style={{ fontSize: 'clamp(17px, 2vw, 20px)', fontWeight: '950', margin: 0, color: '#fff', letterSpacing: '-0.3px' }}>
                    Historial de Productos Vendidos
                  </h2>
                  <p style={{ margin: '2px 0 0', fontSize: '11.5px', color: 'var(--text-secondary)' }}>
                    Desglose de productos y bebidas vendidos, ganancia neta para la clínica y costo de reposición.
                  </p>
                </div>
              </div>
              <button 
                type="button" 
                onClick={onClose} 
                aria-label="Cerrar modal"
                style={{ 
                  width: '36px', 
                  height: '36px', 
                  borderRadius: '10px', 
                  background: 'rgba(255, 255, 255, 0.05)', 
                  border: '1px solid rgba(255, 255, 255, 0.1)', 
                  color: '#ccc', 
                  display: 'grid', 
                  placeItems: 'center', 
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; e.currentTarget.style.color = '#fff'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.color = '#ccc'; }}
              >
                <X size={18} />
              </button>
            </header>

            {/* Metric Summary Cards */}
            <div style={{ 
              padding: '16px clamp(16px, 2.5vw, 24px) 12px', 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
              gap: '12px',
              borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
              flexShrink: 0 
            }}>
              {/* Total Vendido */}
              <div style={{ 
                padding: '12px 14px', 
                borderRadius: '14px', 
                background: 'rgba(255, 255, 255, 0.025)', 
                border: '1px solid rgba(255, 255, 255, 0.07)',
                display: 'flex',
                flexDirection: 'column',
                gap: '4px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '10.5px', color: 'var(--text-muted)', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Total Vendido
                  </span>
                  <TrendingUp size={15} color="#32d74b" />
                </div>
                <div style={{ fontSize: '18px', fontWeight: '950', color: '#32d74b', letterSpacing: '-0.3px' }}>
                  {formatMoney(totals.sale)} Bs
                </div>
                <div style={{ fontSize: '11.5px', color: 'rgba(255, 255, 255, 0.6)', fontWeight: '750' }}>
                  ${totals.saleUsd.toFixed(2)} USD
                </div>
              </div>

              {/* Ganancia de la clínica */}
              <div style={{ 
                padding: '12px 14px', 
                borderRadius: '14px', 
                background: 'rgba(17, 17, 17, 0.05)', 
                border: '1px solid rgba(17, 17, 17, 0.18)',
                display: 'flex',
                flexDirection: 'column',
                gap: '4px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '10.5px', color: 'var(--gold-primary)', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Ganancia Neta de la clínica
                  </span>
                  <Banknote size={15} color="var(--gold-primary)" />
                </div>
                <div style={{ fontSize: '18px', fontWeight: '950', color: 'var(--gold-primary)', letterSpacing: '-0.3px' }}>
                  {formatMoney(totals.margin)} Bs
                </div>
                <div style={{ fontSize: '11.5px', color: 'rgba(255, 255, 255, 0.6)', fontWeight: '750' }}>
                  ${totals.marginUsd.toFixed(2)} USD
                </div>
              </div>

              {/* Costo / Deuda Proveedor */}
              <div style={{ 
                padding: '12px 14px', 
                borderRadius: '14px', 
                background: 'rgba(255, 159, 10, 0.05)', 
                border: '1px solid rgba(255, 159, 10, 0.18)',
                display: 'flex',
                flexDirection: 'column',
                gap: '4px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '10.5px', color: '#ff9f0a', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Costo (Deuda Proveedor)
                  </span>
                  <Truck size={15} color="#ff9f0a" />
                </div>
                <div style={{ fontSize: '18px', fontWeight: '950', color: '#ff9f0a', letterSpacing: '-0.3px' }}>
                  {formatMoney(totals.cost)} Bs
                </div>
                <div style={{ fontSize: '11.5px', color: 'rgba(255, 255, 255, 0.6)', fontWeight: '750' }}>
                  ${totals.costUsd.toFixed(2)} USD
                </div>
              </div>
            </div>

            {/* Filter & Search Bar */}
            <div style={{ 
              padding: '12px clamp(16px, 2.5vw, 24px)', 
              display: 'flex', 
              flexWrap: 'wrap', 
              alignItems: 'center', 
              justifyContent: 'space-between',
              gap: '10px',
              borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
              flexShrink: 0
            }}>
              {/* Search Box */}
              <div style={{ position: 'relative', flex: '1 1 240px', maxWidth: '380px' }}>
                <Search size={15} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--gold-primary)' }} />
                <input 
                  type="text" 
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Buscar producto, cliente u odontólogo..."
                  style={{ 
                    width: '100%', 
                    boxSizing: 'border-box', 
                    padding: '8px 12px 8px 36px', 
                    borderRadius: '10px', 
                    background: 'var(--bg-secondary)', 
                    border: '1px solid rgba(255, 255, 255, 0.1)', 
                    color: '#fff', 
                    fontSize: '12.5px', 
                    outline: 'none' 
                  }}
                />
              </div>

              {/* Filter Pills */}
              <div style={{ display: 'flex', gap: '6px', overflowX: 'auto' }}>
                <button 
                  type="button" 
                  onClick={() => setFilterCost('all')} 
                  style={getChipStyle(filterCost === 'all')}
                >
                  Todos ({history.length})
                </button>
                <button 
                  type="button" 
                  onClick={() => setFilterCost('with_cost')} 
                  style={getChipStyle(filterCost === 'with_cost')}
                >
                  Con deuda ({history.filter(h => h.hasCost).length})
                </button>
                <button 
                  type="button" 
                  onClick={() => setFilterCost('no_cost')} 
                  style={getChipStyle(filterCost === 'no_cost')}
                >
                  Sin costo ({history.filter(h => !h.hasCost).length})
                </button>
              </div>
            </div>

            {/* Table Content */}
            <div 
              className="panda-scrollbar" 
              style={{ 
                flex: 1, 
                overflowY: 'auto', 
                overflowX: 'auto',
                minHeight: '200px'
              }}
            >
              {filteredHistory.length === 0 ? (
                <div style={{ padding: '48px 24px', textAlign: 'center', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
                  <Package size={36} style={{ opacity: 0.35 }} />
                  <p style={{ margin: 0, fontSize: '13px', fontWeight: '600' }}>
                    {search || filterCost !== 'all' ? 'No hay productos que coincidan con la búsqueda.' : 'Aún no hay productos vendidos en este período.'}
                  </p>
                </div>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '700px', fontSize: '12px' }}>
                  <thead style={{ position: 'sticky', top: 0, zIndex: 10 }}>
                    <tr>
                      <th style={{ ...thBaseStyle, textAlign: 'left', padding: '11px 18px' }}>Producto</th>
                      <th style={{ ...thBaseStyle, textAlign: 'left', padding: '11px 14px' }}>Cliente / Servicio</th>
                      <th style={{ ...thBaseStyle, textAlign: 'right', padding: '11px 14px' }}>Venta</th>
                      <th style={{ ...thBaseStyle, textAlign: 'right', padding: '11px 14px' }}>Ganancia de la clínica</th>
                      <th style={{ ...thBaseStyle, textAlign: 'right', padding: '11px 18px' }}>Costo (Deuda)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredHistory.map((r, idx) => {
                      // Extract product name and quantity
                      const rawName = r.product?.replace(/ ×\d+$/, '') || 'Producto';
                      const qtyMatch = r.product?.match(/ ×(\d+)$/);
                      const qty = qtyMatch ? qtyMatch[1] : '1';
                      const formattedName = capitalize(rawName);

                      // Date formatting
                      const dateFormatted = new Date(r.date).toLocaleDateString('es-VE', { day: '2-digit', month: 'short' });

                      // Context split: Client · Service
                      const contextParts = (r.context || '').split(' · ');
                      const clientName = contextParts[0] || 'Cliente';
                      const serviceName = contextParts.slice(1).join(' · ');

                      return (
                        <tr 
                          key={r.id || idx} 
                          style={{ 
                            borderBottom: '1px solid rgba(255, 255, 255, 0.04)',
                            transition: 'background 0.15s ease'
                          }}
                          onMouseEnter={e => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.025)'}
                          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                        >
                          {/* Producto */}
                          <td style={{ padding: '12px 18px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span style={{ fontWeight: '900', color: '#fff', fontSize: '13px' }}>
                                {formattedName}
                              </span>
                              <span style={{ 
                                fontSize: '10.5px', 
                                fontWeight: '900', 
                                color: 'var(--gold-primary)', 
                                background: 'rgba(17, 17, 17, 0.12)', 
                                border: '1px solid rgba(17, 17, 17, 0.25)', 
                                padding: '1px 6px', 
                                borderRadius: '6px' 
                              }}>
                                ×{qty}
                              </span>
                            </div>
                            <div style={{ fontSize: '10.5px', color: 'var(--text-muted)', marginTop: '3px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                              <Calendar size={11} /> {dateFormatted} {r.seller ? `· ${r.seller}` : ''}
                            </div>
                          </td>

                          {/* Cliente / Servicio */}
                          <td style={{ padding: '12px 14px' }}>
                            <div style={{ fontWeight: '800', color: 'rgba(255, 255, 255, 0.9)', fontSize: '12.5px' }}>
                              {clientName}
                            </div>
                            {serviceName && (
                              <div style={{ fontSize: '10.5px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                                {serviceName}
                              </div>
                            )}
                          </td>

                          {/* Venta */}
                          <td style={{ padding: '12px 14px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                            <div style={{ color: '#32d74b', fontWeight: '900', fontSize: '13px' }}>
                              {formatMoney(r.saleBs)} Bs
                            </div>
                            <div style={{ fontSize: '10.5px', color: 'rgba(255, 255, 255, 0.55)', fontWeight: '700', marginTop: '1px' }}>
                              ${r.saleUsd.toFixed(2)}
                            </div>
                          </td>

                          {/* Ganancia de la clínica */}
                          <td style={{ padding: '12px 14px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                            <div style={{ color: 'var(--gold-primary)', fontWeight: '900', fontSize: '13px' }}>
                              {formatMoney(r.marginBs)} Bs
                            </div>
                            <div style={{ fontSize: '10.5px', color: 'rgba(255, 255, 255, 0.55)', fontWeight: '700', marginTop: '1px' }}>
                              ${r.marginUsd.toFixed(2)}
                            </div>
                          </td>

                          {/* Costo (Deuda) */}
                          <td style={{ padding: '12px 18px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                            {r.hasCost ? (
                              <>
                                <div style={{ color: '#ff9f0a', fontWeight: '900', fontSize: '13px' }}>
                                  {formatMoney(r.costBs)} Bs
                                </div>
                                <div style={{ fontSize: '10.5px', color: 'rgba(255, 255, 255, 0.55)', fontWeight: '700', marginTop: '1px' }}>
                                  ${r.costUsd.toFixed(2)}
                                </div>
                              </>
                            ) : (
                              <span style={{ 
                                fontSize: '10.5px', 
                                color: 'var(--text-muted)', 
                                fontWeight: '700',
                                background: 'rgba(255, 255, 255, 0.03)',
                                border: '1px solid rgba(255, 255, 255, 0.06)',
                                padding: '3px 8px',
                                borderRadius: '6px'
                              }}>
                                Sin costo
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>

            {/* Footer Note */}
            <footer style={{ 
              padding: '10px clamp(16px, 2.5vw, 24px)', 
              borderTop: '1px solid rgba(255, 255, 255, 0.06)', 
              background: 'var(--bg-secondary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px',
              flexShrink: 0
            }}>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <AlertCircle size={13} color="#ff9f0a" />
                El costo (deuda de reposición) solo aplica a productos con precio de compra configurado en Inventario.
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: '750', whiteSpace: 'nowrap' }}>
                {filteredHistory.length} {filteredHistory.length === 1 ? 'registro' : 'registros'}
              </div>
            </footer>

          </div>
        </div>
      )}
    </AnimatedModal>
  );
}

const thBaseStyle = {
  position: 'sticky',
  top: 0,
  zIndex: 10,
  background: 'var(--bg-secondary)',
  color: 'var(--text-muted)',
  textTransform: 'uppercase',
  fontSize: '10.5px',
  fontWeight: '900',
  letterSpacing: '0.6px',
  boxShadow: 'inset 0 -1px 0 rgba(255, 255, 255, 0.08), 0 2px 8px rgba(0,0,0,0.4)'
};

const getChipStyle = (active) => ({
  padding: '6px 12px',
  borderRadius: '8px',
  border: active ? '1px solid var(--gold-primary)' : '1px solid rgba(255, 255, 255, 0.08)',
  background: active ? 'rgba(17, 17, 17, 0.15)' : 'rgba(255, 255, 255, 0.03)',
  color: active ? 'var(--gold-primary)' : 'rgba(255, 255, 255, 0.7)',
  fontSize: '11px',
  fontWeight: '850',
  cursor: 'pointer',
  whiteSpace: 'nowrap',
  transition: 'all 0.15s ease'
});
