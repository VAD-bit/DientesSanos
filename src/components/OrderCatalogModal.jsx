import React from 'react';
import { Check, Scissors, Zap, X } from 'lucide-react';
import { GiHairStrands, GiWaterDrop, GiShower, GiNoseFront, GiBeard, GiBottleVapors, GiTowel } from 'react-icons/gi';
import { VenetianMask } from 'lucide-react';
import { TbEar } from 'react-icons/tb';
import { MdFace3, MdWorkspacePremium } from 'react-icons/md';
import { FaChild } from 'react-icons/fa';
import { PenTool, Waves } from 'lucide-react';
import AnimatedModal from './AnimatedModal';

const money = value => Number(value || 0).toLocaleString('es-VE', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2
});

const getExtraIcon = (name) => {
  const n = (name || '').toLowerCase();
  if (n.includes('alisado') || n.includes('planchado') || n.includes('secado')) return GiHairStrands;
  if (n.includes('hidratación') || n.includes('hidratacion') || n.includes('capilar')) return GiWaterDrop;
  if (n.includes('profundo')) return Waves;
  if (n.includes('lavado') || n.includes('express') || n.includes('champu')) return GiShower;
  if (n.includes('mask') || n.includes('mascarilla') || n.includes('negra')) return VenetianMask;
  if (n.includes('nariz') || n.includes('naríz')) return GiNoseFront;
  if (n.includes('oido') || n.includes('oído') || n.includes('oreja')) return TbEar;
  if (n.includes('exfoliacion') || n.includes('exfoliación') || n.includes('facial') || n.includes('cutis') || n.includes('limpieza')) return GiTowel;
  if (n.includes('ceja')) return MdFace3;
  if (n.includes('barba') || n.includes('afeitado') || n.includes('perfilado') || n.includes('epilacion') || n.includes('epilación')) return GiBeard;
  return Zap;
};

const getServiceIcon = (name) => {
  const n = (name || '').toLowerCase();
  if (n.includes('niño') || n.includes('niña') || n.includes('kid')) return FaChild;
  if (n.includes('vip') || n.includes('premium')) return MdWorkspacePremium;
  if (n.includes('tatuaje') || n.includes('tattoo')) return PenTool;
  if (n.includes('barba') && n.includes('corte')) {
    return (props) => (
      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
        <Scissors {...props} />
        <GiBeard {...props} />
      </div>
    );
  }
  if (n.includes('barba') || n.includes('perfilado')) return GiBeard;
  if (n.includes('ceja')) return MdFace3;
  if (n.includes('color') || n.includes('tinte')) return GiBottleVapors;
  return Scissors;
};

const OrderCatalogModal = ({
  isOpen,
  onClose,
  type = 'service',
  items = [],
  selectedItems = [],
  onToggle,
  rate = 0
}) => {
  const isService = type === 'service';
  const title = isService ? 'Catálogo de Servicios' : 'Servicios Extras';
  const subtitle = `${items.length} ${isService ? 'servicios' : 'extras'} disponibles`;
  const HeaderIcon = isService ? Scissors : Zap;
  const getIcon = isService ? getServiceIcon : getExtraIcon;

  return (
    <AnimatedModal isOpen={isOpen}>
      {(overlayClass, cardClass) => (
        <div className={`${overlayClass.replace('global-modal-overlay', '')} order-catalog-overlay`} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.88)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', zIndex: 22000, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px', paddingTop: 'max(20px, env(safe-area-inset-top, 20px))' }}>
          <style>{`
            @media (max-width: 560px) {
              .order-catalog-overlay { padding: 10px !important; padding-top: max(10px, env(safe-area-inset-top, 10px)) !important; }
              .order-catalog-card { max-width: 100% !important; max-height: 92dvh !important; border-radius: 22px !important; }
              .order-catalog-header { padding: 16px 14px 12px !important; }
              .order-catalog-grid { grid-template-columns: repeat(2, minmax(0, 1fr)) !important; gap: 8px !important; padding: 10px !important; }
              .order-catalog-item { height: 178px !important; border-radius: 14px !important; }
              .order-catalog-visual { height: 88px !important; flex: 0 0 88px; }
              .order-catalog-content { padding: 8px 9px 9px !important; justify-content: flex-start !important; }
              .order-catalog-content h3 { font-size: 11px !important; line-height: 1.22 !important; margin: 3px 0 5px !important; overflow-wrap: anywhere; }
              .order-catalog-content strong { font-size: 15px !important; }
              .order-catalog-content > span { font-size: 7px !important; }
            }
          `}</style>
          <div className={`${cardClass.replace('global-modal-card', '')} order-catalog-card`} style={{ maxWidth: 'min(820px, 90vw)', width: '100%', maxHeight: '90vh', display: 'flex', flexDirection: 'column', borderRadius: '28px', border: '1px solid rgba(17, 17, 17,.28)', overflow: 'hidden', background: 'var(--bg-secondary)', boxShadow: '0 40px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.04) inset' }}>
            <div className="order-catalog-header" style={{ padding: '28px 28px 20px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'linear-gradient(135deg, rgba(255, 255, 255,0.2), rgba(255, 255, 255,0.05))', border: '1px solid rgba(255, 255, 255,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <HeaderIcon size={20} color="var(--gold-primary)" />
                  </div>
                  <div>
                    <h2 style={{ fontWeight: '900', fontSize: '20px', color: 'white', marginBottom: '2px' }}>{title}</h2>
                    <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{subtitle}</p>
                  </div>
                </div>
                <button onClick={onClose} style={{ width: '44px', height: '44px', borderRadius: '50%', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.5)', fontSize: '18px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={18} /></button>
              </div>
            </div>
            <div className="panda-scrollbar order-catalog-grid" style={{ padding: '16px 20px 24px', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(180px, 100%), 1fr))', gap: '10px', overflowY: 'auto', flex: 1, minHeight: 0, alignContent: 'start' }}>
              {items.map((item) => {
                const isSelected = selectedItems.some(entry => entry.id === item.id);
                const ItemIcon = getIcon(item.name);
                return (
                  <article key={item.id} className="order-catalog-item" style={{ display: 'flex', flexDirection: 'column', height: '230px', overflow: 'hidden', borderRadius: '16px', border: `1px solid ${isSelected ? 'var(--gold-primary)' : 'rgba(255,255,255,.08)'}`, background: isSelected ? 'rgba(17, 17, 17, 0.05)' : 'rgba(255,255,255,.025)', transition: 'all 0.2s' }}>
                    <button type="button" onClick={() => onToggle?.(item)} style={{ padding: 0, border: 0, background: 'transparent', color: 'inherit', cursor: 'pointer', textAlign: 'left', display: 'flex', flexDirection: 'column', height: '100%', outline: 'none' }}>
                      <div className="order-catalog-visual" style={{ height: '140px', width: '100%', position: 'relative', overflow: 'hidden', background: 'var(--bg-secondary)' }}>
                        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--gold-primary)' }}>
                          <ItemIcon size={32} strokeWidth={1.5} />
                        </div>
                        {isSelected && (
                          <div style={{ position: 'absolute', top: '10px', right: '10px', background: 'var(--gold-primary)', color: 'black', borderRadius: '50%', width: '22px', height: '22px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                          </div>
                        )}
                      </div>
                      <div className="order-catalog-content" style={{ flex: 1, padding: '12px 14px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                        <span style={{ color: 'var(--gold-primary)', fontSize: '9px', fontWeight: 950, textTransform: 'uppercase', letterSpacing: '.55px' }}>{isService ? 'Servicio Base' : 'Servicio Extra'}</span>
                        <h3 style={{ margin: '4px 0 6px', color: '#fff', fontSize: '13px', lineHeight: 1.2, fontWeight: 900, textTransform: 'capitalize', display: 'block' }}>{item.name || (isService ? 'Servicio' : 'Extra')}</h3>
                        <strong style={{ color: 'var(--gold-primary)', fontSize: '18px', lineHeight: 1, display: 'block' }}>${item.price || 0}</strong>
                        {Number(rate) > 0 && <span style={{ marginTop: '4px', display: 'block', color: 'rgba(255,255,255,0.5)', fontSize: '11.5px', fontWeight: 500 }}>≈ {Math.round((Number(item.price || 0) * Number(rate))).toLocaleString('es-VE')} Bs</span>}
                      </div>
                    </button>
                  </article>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </AnimatedModal>
  );
};

export default OrderCatalogModal;
