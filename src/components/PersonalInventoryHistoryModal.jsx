import React, { useEffect, useState } from 'react';
import { History, Package, X } from 'lucide-react';
import { dataService } from '../services/dataService';
import { SkeletonList } from './Skeleton';
import AnimatedModal from './AnimatedModal';

const ACTION_LABELS = {
  REGISTRO: 'Artículo registrado',
  ASIGNACION: 'Asignado desde el almacén',
  CONSUMO: 'Gastó una unidad',
  REPOSICION: 'Repuso una unidad',
  DEVOLUCION: 'Devuelto al almacén',
  RETIRO: 'Retirado del perfil'
};

const parsePersonalMovement = (movement, staffId) => {
  const prefix = `[PERSONAL:${staffId}] `;
  if (!String(movement.reason || '').startsWith(prefix)) return null;
  const [action = '', itemName = 'Artículo'] = String(movement.reason).slice(prefix.length).split('|');
  return {
    ...movement,
    action: action.trim(),
    itemName: itemName.trim()
  };
};

const PersonalInventoryHistoryModal = ({ isOpen, onClose, staffId }) => {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen || !staffId) return;
    let active = true;
    setLoading(true);
    dataService.getInventoryMovements()
      .then(movements => {
        if (!active) return;
        setHistory(
          movements
            .map(movement => parsePersonalMovement(movement, staffId))
            .filter(Boolean)
        );
      })
      .catch(error => {
        console.error('Error loading personal inventory history:', error);
        if (active) setHistory([]);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [isOpen, staffId]);

  return (
    <AnimatedModal isOpen={isOpen}>
      {(overlayClass, cardClass) => (
    <div
      onClick={onClose}
      className={overlayClass}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100000,
        background: 'rgba(0,0,0,0.82)',
        backdropFilter: 'blur(10px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
        paddingTop: 'max(20px, env(safe-area-inset-top, 20px))'
      }}
    >
      <div
        onClick={event => event.stopPropagation()}
        className={`glass-card ${cardClass}`}
        style={{
          width: '100%',
          maxWidth: '560px',
          maxHeight: '78vh',
          overflow: 'hidden',
          borderRadius: '24px',
          border: '1px solid rgba(255,255,255,0.14)',
          background: 'var(--bg-secondary)'
        }}
      >
        <div style={{ padding: '22px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <History size={19} color="var(--gold-primary)" />
            <div>
              <h3 style={{ margin: 0, fontSize: '17px', color: 'white' }}>Historial del inventario</h3>
              <p style={{ margin: '3px 0 0', fontSize: '11px', color: 'var(--text-muted)' }}>Asignaciones, consumos y reposiciones</p>
            </div>
          </div>
          <button onClick={onClose} style={{ width: '34px', height: '34px', borderRadius: '50%', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.04)', color: 'white', cursor: 'pointer', display: 'grid', placeItems: 'center' }}>
            <X size={17} />
          </button>
        </div>

        <div style={{ padding: '16px', maxHeight: 'calc(78vh - 82px)', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '9px' }}>
          {loading ? (
            <SkeletonList rows={4} rowHeight={44} gap={9} />
          ) : history.length === 0 ? (
            <div style={{ padding: '42px 20px', textAlign: 'center', border: '1px dashed rgba(255,255,255,0.09)', borderRadius: '16px', color: 'var(--text-muted)', fontSize: '13px' }}>
              Todavía no hay movimientos registrados.
            </div>
          ) : history.map(movement => {
            const isConsumption = movement.action === 'CONSUMO' || movement.action === 'RETIRO';
            return (
              <div key={movement.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '13px 14px', borderRadius: '14px', background: 'rgba(255,255,255,0.035)', border: '1px solid rgba(255,255,255,0.06)' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '10px', display: 'grid', placeItems: 'center', background: isConsumption ? 'rgba(255,69,58,0.1)' : 'rgba(48,209,88,0.1)' }}>
                  <Package size={16} color={isConsumption ? '#ff6961' : '#30d158'} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ color: 'white', fontSize: '13px', fontWeight: '800', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{movement.itemName}</div>
                  <div style={{ color: 'var(--text-muted)', fontSize: '11px', marginTop: '3px' }}>{ACTION_LABELS[movement.action] || movement.action}</div>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{ color: isConsumption ? '#ff6961' : '#30d158', fontSize: '12px', fontWeight: '900' }}>
                    {isConsumption ? '−' : '+'}{Number(movement.amount || 0)}
                  </div>
                  <div style={{ color: 'var(--text-muted)', fontSize: '10px', marginTop: '4px' }}>
                    {movement.created_at ? new Date(movement.created_at).toLocaleString('es-VE', { dateStyle: 'short', timeStyle: 'short' }) : 'Sin fecha'}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
      )}
    </AnimatedModal>
  );
};

export default PersonalInventoryHistoryModal;
