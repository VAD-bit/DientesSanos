import React, { useEffect, useMemo, useState } from 'react';
import { X, Search, Plus, Minus, ShoppingBag } from 'lucide-react';
import { 
  GiCoffeeCup, GiBeerBottle, GiWaterBottle, GiChocolateBar, 
  GiChipsBag, GiSodaCan, GiSpray, GiBeard, GiComb, 
  GiOpenedFoodCan, GiPill, GiHairStrands, GiWaterDrop
} from 'react-icons/gi';
import { MdLocalDrink, MdSanitizer } from 'react-icons/md';
import AnimatedModal from './AnimatedModal';
import {
  filterSellableInventory,
  getInventorySalesLabel,
  INVENTORY_SALES_GROUPS,
  matchesInventorySalesGroup
} from '../utils/inventorySales';

const money = value => Number(value || 0).toLocaleString('es-VE', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2
});

const SellableInventoryModal = ({
  isOpen,
  items = [],
  rates,
  onClose,
  onSelect,
  onConfirm,
  loading = false,
  mode = 'single',
  initialSelection = [],
  title = 'Productos y Cortesías',
  subtitle = 'Selecciona un producto para agregarlo a la orden'
}) => {
  const [search, setSearch] = useState('');
  const [group, setGroup] = useState('all');
  const [quantities, setQuantities] = useState(() => Object.fromEntries(
    initialSelection.map(item => [item.id, Number(item.quantity || 1)])
  ));
  const rate = Number(rates?.usd || 0);

  useEffect(() => {
    if (!isOpen) return;
    setSearch('');
    setGroup('all');
    setQuantities(Object.fromEntries(
      initialSelection.map(item => [item.id, Number(item.quantity || 1)])
    ));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const sellableItems = useMemo(() => filterSellableInventory(items), [items]);
  const visibleItems = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return sellableItems.filter(item => (
      matchesInventorySalesGroup(item, group)
      && (!needle || String(item.name || '').toLowerCase().includes(needle))
    ));
  }, [sellableItems, group, search]);

  const selection = useMemo(() => sellableItems
    .map(item => ({ ...item, quantity: Number(quantities[item.id] || 0) }))
    .filter(item => item.quantity > 0), [sellableItems, quantities]);
  const totalUsd = selection.reduce((sum, item) => sum + Number(item.price || 0) * item.quantity, 0);

  const changeQuantity = (item, delta) => {
    if (Number(item.stock || 0) <= 0) return;
    setQuantities(current => {
      const next = Math.max(0, Math.min(Number(item.stock || 0), Number(current[item.id] || 0) + delta));
      return { ...current, [item.id]: next };
    });
  };

  return (
    <AnimatedModal isOpen={isOpen}>
      {(overlayClass, cardClass) => (
        <div className={`${overlayClass.replace('global-modal-overlay', '')} sellable-inventory-overlay`} style={{ position: 'fixed', inset: 0, zIndex: 22000, padding: 'clamp(10px, 2vw, 20px)', paddingTop: 'max(10px, env(safe-area-inset-top, 10px))', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,.78)', backdropFilter: 'blur(14px)' }}>
          <style>{`
            @media (max-width: 560px) {
              .sellable-inventory-card { max-height: 92dvh !important; }
              .sellable-inventory-grid { grid-template-columns: repeat(2, minmax(0, 1fr)) !important; gap: 8px !important; }
              .sellable-inventory-item { min-width: 0; border-radius: 14px !important; }
              .sellable-inventory-visual { aspect-ratio: 1.35 / 1 !important; }
              .sellable-inventory-content { padding: 8px 9px 7px !important; }
              .sellable-inventory-content h3 { font-size: 11px !important; line-height: 1.22 !important; overflow-wrap: anywhere; }
              .sellable-inventory-content strong { font-size: 15px !important; }
              .sellable-inventory-content > span { font-size: 7px !important; }
            }
          `}</style>
          <section className={`${cardClass.replace('global-modal-card', '')} sellable-inventory-card`} aria-modal="true" role="dialog" aria-label={title} style={{ width: 'min(780px, 100%)', height: 'auto', maxHeight: 'min(82dvh, 700px)', display: 'flex', flexDirection: 'column', overflow: 'hidden', borderRadius: '22px', border: '1px solid rgba(17, 17, 17,.25)', background: 'var(--bg-secondary)', boxShadow: '0 28px 72px rgba(0,0,0,.62)' }}>
            <header style={{ padding: 'clamp(16px, 2vw, 20px)', paddingBottom: '13px', borderBottom: '1px solid rgba(255,255,255,.07)', flexShrink: 0 }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px' }}>
                <div style={{ display: 'flex', gap: '13px', minWidth: 0 }}>
                  <div style={{ width: '38px', height: '38px', borderRadius: '12px', display: 'grid', placeItems: 'center', flexShrink: 0, color: 'var(--gold-primary)', background: 'rgba(17, 17, 17,.12)', border: '1px solid rgba(17, 17, 17,.25)' }}><ShoppingBag size={18} /></div>
                  <div style={{ minWidth: 0 }}>
                    <h2 style={{ margin: 0, color: '#fff', fontSize: 'clamp(19px, 2.5vw, 23px)', fontWeight: 950, letterSpacing: '-.45px' }}>{title}</h2>
                    <p style={{ margin: '3px 0 0', color: 'var(--text-secondary)', fontSize: '11px', lineHeight: 1.4 }}>{subtitle}</p>
                  </div>
                </div>
                <button type="button" onClick={onClose} aria-label="Cerrar catálogo" style={{ width: '40px', height: '40px', display: 'grid', placeItems: 'center', flexShrink: 0, borderRadius: '12px', border: '1px solid rgba(255,255,255,.1)', background: 'rgba(255,255,255,.05)', color: '#d8d8da', cursor: 'pointer' }}><X size={18} /></button>
              </div>

              <div style={{ marginTop: '13px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(240px, 100%), 1fr))', gap: '8px', alignItems: 'center' }}>
                <label style={{ position: 'relative' }}>
                  <Search size={17} style={{ position: 'absolute', left: '15px', top: '50%', transform: 'translateY(-50%)', color: 'var(--gold-primary)' }} />
                  <input value={search} onChange={event => setSearch(event.target.value)} placeholder="Buscar productos o bebidas..." style={{ width: '100%', height: '42px', boxSizing: 'border-box', padding: '0 13px 0 42px', borderRadius: '12px', border: '1px solid rgba(255,255,255,.09)', background: 'var(--bg-secondary)', color: '#fff', outline: 'none', fontSize: '13px' }} />
                </label>
                <div style={{ display: 'flex', gap: '7px', overflowX: 'auto', maxWidth: '100%' }}>
                  {Object.entries(INVENTORY_SALES_GROUPS).map(([value, label]) => (
                    <button key={value} type="button" onClick={() => setGroup(value)} style={{ minHeight: '38px', padding: '0 11px', borderRadius: '10px', whiteSpace: 'nowrap', cursor: 'pointer', fontSize: '10px', fontWeight: 900, color: group === value ? '#111' : '#d0d0d3', border: group === value ? '1px solid var(--gold-primary)' : '1px solid rgba(255,255,255,.09)', background: group === value ? 'var(--gold-primary)' : 'rgba(255,255,255,.04)' }}>{label}</button>
                  ))}
                </div>
              </div>
            </header>

            <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', WebkitOverflowScrolling: 'touch', padding: 'clamp(12px, 2vw, 18px)' }} className="panda-scrollbar">
              {visibleItems.length ? (
                <div className="sellable-inventory-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(180px, 100%), 1fr))', gap: '10px' }}>
                  {visibleItems.map(item => {
                    const stock = Number(item.stock || 0);
                    const quantity = Number(quantities[item.id] || 0);
                    const isCafe = String(item.inventory_type || '').toLowerCase() === 'cafe';
                    const out = stock <= 0;
                    const getProductIcon = (name, type) => {
                      const cleanName = (name || '').toLowerCase();
                      const isCafe = String(type || '').toLowerCase() === 'cafe';
                      
                      if (isCafe) {
                        if (cleanName.includes('cerveza') || cleanName.includes('polar') || cleanName.includes('zulia')) return GiBeerBottle;
                        if (cleanName.includes('agua') || cleanName.includes('water')) return GiWaterBottle;
                        if (cleanName.includes('refresco') || cleanName.includes('coca') || cleanName.includes('pepsi')) return GiSodaCan;
                        if (cleanName.includes('chocolate') || cleanName.includes('dulce')) return GiChocolateBar;
                        if (cleanName.includes('snack') || cleanName.includes('papas') || cleanName.includes('pepito')) return GiChipsBag;
                        if (cleanName.includes('cafe') || cleanName.includes('café') || cleanName.includes('capuchino')) return GiCoffeeCup;
                        return MdLocalDrink;
                      } else {
                        if (cleanName.includes('pomada') || cleanName.includes('cera') || cleanName.includes('gel')) return GiOpenedFoodCan;
                        if (cleanName.includes('minoxidil') || cleanName.includes('gotero')) return GiWaterDrop;
                        if (cleanName.includes('spray') || cleanName.includes('laca')) return GiSpray;
                        if (cleanName.includes('barba') || cleanName.includes('beard')) return GiBeard;
                        if (cleanName.includes('champu') || cleanName.includes('shampoo')) return GiHairStrands;
                        if (cleanName.includes('peine') || cleanName.includes('cepillo')) return GiComb;
                        if (cleanName.includes('crema') || cleanName.includes('locion')) return GiOpenedFoodCan;
                        if (cleanName.includes('pastilla') || cleanName.includes('vitamina')) return GiPill;
                        return MdSanitizer;
                      }
                    };
                    const ProductIcon = getProductIcon(item.name, item.inventory_type);
                    return (
                      <article key={item.id} className="pos-extra-card sellable-inventory-item" style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', borderRadius: '16px', border: `1px solid ${quantity ? 'rgba(17, 17, 17,.62)' : 'rgba(255,255,255,.08)'}`, background: quantity ? 'rgba(17, 17, 17,.08)' : 'rgba(255,255,255,.025)', opacity: out ? .55 : 1 }}>
                        <button type="button" disabled={out} onClick={() => mode === 'single' ? onSelect?.(item) : changeQuantity(item, 1)} style={{ padding: 0, border: 0, background: 'transparent', color: 'inherit', cursor: out ? 'not-allowed' : 'pointer', textAlign: 'left', flex: 1, display: 'flex', flexDirection: 'column' }}>
                          <div className="sellable-inventory-visual" style={{ width: '100%', aspectRatio: '4/3', position: 'relative', overflow: 'hidden', background: 'var(--bg-secondary)' }}>
                            {item.image_url ? <img src={item.image_url} alt={item.name} loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <div style={{ height: '100%', display: 'grid', placeItems: 'center', color: isCafe ? 'var(--gold-primary)' : '#54d37b' }}><ProductIcon size={35} /></div>}
                            <span style={{ position: 'absolute', top: '7px', right: '7px', padding: '3px 7px', borderRadius: '999px', color: '#fff', background: out ? '#8d2f2a' : 'rgba(31,143,71,.9)', fontSize: '8px', fontWeight: 950 }}>{out ? 'AGOTADO' : `${stock} DISP.`}</span>
                          </div>
                          <div className="sellable-inventory-content" style={{ padding: '9px 11px 7px', flex: 1 }}>
                            <span style={{ color: isCafe ? 'var(--gold-primary)' : '#54d37b', fontSize: '9px', fontWeight: 950, textTransform: 'uppercase', letterSpacing: '.55px' }}>{getInventorySalesLabel(item)}</span>
                            <h3 style={{ margin: '4px 0 6px', color: '#fff', fontSize: '13px', lineHeight: 1.2, fontWeight: 900, textTransform: 'capitalize' }}>{item.name}</h3>
                            <strong style={{ color: 'var(--gold-primary)', fontSize: '18px', lineHeight: 1 }}>${money(item.price)}</strong>
                            {rate > 0 && <span style={{ marginTop: '4px', display: 'block', color: 'rgba(255,255,255,0.5)', fontSize: '11.5px', fontWeight: 500 }}>≈ {money(Number(item.price || 0) * rate)} Bs</span>}
                          </div>
                        </button>
                        {mode === 'multiple' && (
                          <div style={{ margin: '4px 9px 9px', height: '36px', display: 'grid', gridTemplateColumns: '36px minmax(0, 1fr) 36px', alignItems: 'center', borderRadius: '10px', overflow: 'hidden', border: '1px solid rgba(255,255,255,.1)', background: 'var(--bg-secondary)' }}>
                            <button type="button" disabled={!quantity} onClick={() => changeQuantity(item, -1)} aria-label={`Quitar ${item.name}`} style={{ height: '100%', width: '100%', padding: 0, margin: 0, border: 0, background: quantity ? 'rgba(255,255,255,.08)' : 'rgba(255,255,255,.02)', color: quantity ? '#fff' : 'rgba(255,255,255,.25)', cursor: quantity ? 'pointer' : 'default', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s ease' }}><Minus size={15} /></button>
                            <strong style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: quantity ? 'var(--gold-primary)' : 'rgba(255,255,255,0.4)', fontSize: '14px', fontWeight: '900', userSelect: 'none' }}>{quantity}</strong>
                            <button type="button" disabled={out || quantity >= stock} onClick={() => changeQuantity(item, 1)} aria-label={`Agregar ${item.name}`} style={{ height: '100%', width: '100%', padding: 0, margin: 0, border: 0, background: quantity ? 'rgba(17, 17, 17,.18)' : 'rgba(255,255,255,.05)', color: quantity ? 'var(--gold-primary)' : 'rgba(255,255,255,0.6)', cursor: out || quantity >= stock ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s ease' }}><Plus size={15} /></button>
                          </div>
                        )}
                      </article>
                    );
                  })}
                </div>
              ) : <div style={{ minHeight: '260px', display: 'grid', placeItems: 'center', textAlign: 'center', color: 'var(--text-muted)' }}><div><ShoppingBag size={38} style={{ opacity: .35, marginBottom: '10px' }} /><p>Sin productos disponibles para esta búsqueda.</p></div></div>}
            </div>

            {mode === 'multiple' && (
              <footer style={{ flexShrink: 0, padding: '11px clamp(14px, 2vw, 18px)', display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '10px', borderTop: '1px solid rgba(255,255,255,.08)', background: 'var(--bg-secondary)' }}>
                <div><span style={{ display: 'block', color: 'var(--text-muted)', fontSize: '9px', fontWeight: 900, textTransform: 'uppercase' }}>{selection.reduce((sum, item) => sum + item.quantity, 0)} unidades</span><strong style={{ color: 'var(--gold-primary)', fontSize: '19px' }}>${money(totalUsd)}</strong>{rate > 0 && <small style={{ marginLeft: '7px', color: 'var(--text-secondary)', fontSize: '10px' }}>{money(totalUsd * rate)} Bs</small>}</div>
                <button type="button" disabled={!selection.length || loading} onClick={() => onConfirm?.(selection)} className="btn-gold" style={{ minHeight: '42px', flex: '1 1 190px', padding: '0 17px', borderRadius: '12px', opacity: !selection.length || loading ? .45 : 1 }}>{loading ? 'REGISTRANDO...' : 'REGISTRAR CONSUMO'}</button>
              </footer>
            )}
          </section>
        </div>
      )}
    </AnimatedModal>
  );
};

export default SellableInventoryModal;
