import React, {  useState, useEffect , useMemo } from 'react';
import useDebounce from '../hooks/useDebounce';
import { createPortal } from 'react-dom';
import { useScrollLock } from '../hooks/useScrollLock';
import { useNotifs } from '../context/NotificationContext';
import { 
  Plus, 
  Minus, 
  Search, 
  Download, 
  ArrowUpCircle, 
  ArrowDownCircle, 
  Filter, 
  Wallet, 
  Calendar, 
  ChevronRight, 
  Trash2, 
  Edit2, 
  Eye, 
  WalletCards, 
  List, 
  X, 
  ShoppingBag, 
  RefreshCcw, 
  Scissors, 
  Droplets,
  Banknote,
  Landmark,
  Smartphone,
  Coins,
  Send,
  CreditCard,
  Receipt,
  Camera,
  CheckCircle2,
  Clock,
  Gift,
  ArrowDownRight,
  TrendingUp,
  TrendingDown,
  AlertCircle
} from 'lucide-react';

import { dataService } from '../services/dataService';
import { supabase } from '../lib/supabase';
import PandaDialog from './PandaDialog';
import PandaDatePicker from './PandaDatePicker';
import PandaSelect from './PandaSelect';
import AnimatedModal from './AnimatedModal';
import PayrollSettlementPanel from './PayrollSettlementPanel';
import PayrollDetailPanel from './PayrollDetailPanel';
import ValeAdvancePanel from './ValeAdvancePanel';
import ManualFinanceTransactionPanel from './ManualFinanceTransactionPanel';
import ReceivablePaymentPanel from './ReceivablePaymentPanel';
import ProviderPaymentModal from './ProviderPaymentModal';
import ProductHistoryModal from './ProductHistoryModal';
import AccountConversionModal from './AccountConversionModal';
import SellableInventoryModal from './SellableInventoryModal';
import { valeTotals } from '../utils/valeUtils';
import FieldLabel from './FieldLabel';

const SETTLEMENT_ACCOUNTS = [
  'Efectivo ($)', 'Efectivo (Bs)', 'Pago Móvil', 'Punto de venta',
  'Zelle', 'Zinli', 'Binance / USDT', 'Transferencia'
];
const emptyAllocations = () => Object.fromEntries(SETTLEMENT_ACCOUNTS.map(account => [account, '']));

// Etiquetas visibles de rol (los valores/keys internos NO cambian).
const roleLabel = (value) => String(value ?? '')
  .replace(/Asistente de Lavado/gi, 'Asistente Dental')
  .replace(/Barbero/gi, 'Odontólogo')
  .replace(/Tatuador/gi, 'Especialista')
  .replace(/Odontologos/gi, 'Odontólogos');
const hasPayrollValue = member => Number(member?.commissionBs || 0) > 0 || Number(member?.commissionEarned || 0) > 0 || Number(member?.productCommissionBs || 0) > 0 || Number(member?.productCommissionEarned || 0) > 0 || Number(member?.tipBs || 0) > 0 || Number(member?.tip || 0) > 0;

// Normaliza el nombre del método de pago a una de las cuentas conocidas de la barbería.
// Mismo criterio que dataService.getStaffSettlement, para que el desglose sea consistente.
const normalizePaymentMethod = rawMethod => {
  const method = String(rawMethod || '').toLowerCase();
  if (method.includes('zelle')) return 'Zelle';
  if (method.includes('binance') || method.includes('usdt')) return 'Binance / USDT';
  if (method.includes('zinli')) return 'Zinli';
  if (method.includes('pago') || method.includes('móvil') || method.includes('movil')) return 'Pago Móvil';
  if (method.includes('punto')) return 'Punto de venta';
  if (method.includes('efectivo') && (method.includes('bs') || method.includes('ves'))) return 'Efectivo (Bs)';
  if (method.includes('efectivo') || method.includes('$')) return 'Efectivo ($)';
  return 'Transferencia';
};

const getStartOfWeek = () => {
  const now = new Date();
  const day = now.getDay(); // 0 is Sunday, 1 is Monday, etc.
  const diff = now.getDate() - day + (day === 0 ? 6 : 1); // adjust when day is sunday
  const monday = new Date(now.setDate(diff));
  monday.setHours(0, 0, 0, 0);
  return monday;
};

const getEndOfDay = (date) => {
  const end = new Date(date);
  end.setHours(23, 59, 59, 999);
  return end;
};

const parseLocalDate = (value) => {
  if (!value) return null;
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day);
};

const getDateRangeForFilter = (filter, customStart = '', customEnd = '') => {
  const today = new Date();
  const startOfToday = new Date(today);
  startOfToday.setHours(0, 0, 0, 0);
  const endOfToday = getEndOfDay(today);

  if (filter === 'today') return { start: startOfToday, end: endOfToday };

  if (filter === 'yesterday') {
    const yesterday = new Date(startOfToday);
    yesterday.setDate(yesterday.getDate() - 1);
    return { start: yesterday, end: getEndOfDay(yesterday) };
  }

  if (filter === 'this_week') {
    return { start: getStartOfWeek(), end: endOfToday };
  }

  if (filter === 'last_week') {
    const startOfThisWeek = getStartOfWeek();
    const start = new Date(startOfThisWeek);
    start.setDate(start.getDate() - 7);
    const end = new Date(startOfThisWeek);
    end.setMilliseconds(-1);
    return { start, end };
  }

  if (filter === 'this_month') {
    return { start: new Date(today.getFullYear(), today.getMonth(), 1), end: endOfToday };
  }

  if (filter === 'last_month') {
    const start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const end = new Date(today.getFullYear(), today.getMonth(), 0, 23, 59, 59, 999);
    return { start, end };
  }

  if (filter === 'custom') {
    const start = parseLocalDate(customStart);
    const endBase = parseLocalDate(customEnd);
    return {
      start: start ? new Date(start.setHours(0, 0, 0, 0)) : null,
      end: endBase ? getEndOfDay(endBase) : null
    };
  }

  return { start: null, end: null };
};

const EditTransactionContent = ({ transaction: t, rates, staff = [], onSave, onCancel, isMobile }) => {
  const meta = t.metadata || {};
  const barberOptions = (staff || []).filter(s => { const r = (s.role || '').split('|')[0].toLowerCase(); return r.includes('barber') || r.includes('tatu'); });
  const assistantOptions = (staff || []).filter(s => { const r = (s.role || '').toLowerCase(); return r.includes('asist') || r.includes('lavado'); });
  // Checkout guarda el nombre genérico "Servicio" con precio 0 cuando la cita se cobró
  // sin el catálogo de servicios cargado (ver CheckoutPOS.jsx app.services?.name || 'Servicio').
  // Ese valor no es un servicio real: si lo dejamos, el dropdown parece tener algo seleccionado.
  const normalizeServiceName = (name, price) => (name === 'Servicio' && !price ? '' : (name || ''));
  // Una transacción puede venir de varias citas enlazadas (pago grupal), cada una con su
  // propio servicio y barbero — igual que se ve en "Resumen de Cobro" al cobrar.
  const [services, setServices] = useState(() => (
    Array.isArray(meta.appointments) && meta.appointments.length > 0
      ? meta.appointments.map(a => ({
          appointmentId: a.id || null,
          staffId: a.staff_id || '',
          serviceName: normalizeServiceName(a.serviceName, Number(a.servicePrice || 0)),
          servicePrice: Number(a.servicePrice || 0)
        }))
      : [{
          appointmentId: (meta.appointment_ids && meta.appointment_ids[0]) || meta.appointment_id || null,
          staffId: meta.barberId || '',
          serviceName: normalizeServiceName(meta.serviceName, Number(meta.servicePrice || 0)),
          servicePrice: Number(meta.servicePrice || 0)
        }]
  ));
  const updateService = (idx, patch) => setServices(prev => prev.map((s, i) => i === idx ? { ...s, ...patch } : s));
  const [washerId, setWasherId] = useState(() => {
    if (meta.washerId) return meta.washerId;
    const w = (meta.staffInvolved || []).find(s => { const r = (s.role || '').toLowerCase(); return r.includes('asist') || r.includes('lavado'); });
    if (w?.staffId) return w.staffId;
    // Si hay una sola asistente en el sistema, preseleccionarla (para extras de lavado)
    return assistantOptions.length === 1 ? assistantOptions[0].id : '';
  });
  const [manualAmountBs, setManualAmountBs] = useState('');
  const [didWash, setDidWash] = useState(meta.didWash || false);
  const [washCount, setWashCount] = useState(Number(meta.washCount || 0));
  const [washRate, setWashRate] = useState(Number(meta.washRate || 1));
  const [paymentMethod, setPaymentMethod] = useState(meta.paymentMethod || meta.method_bs || meta.method_usd || '');
  const [paymentRef, setPaymentRef] = useState(meta.payment_reference_bs || meta.paymentReferenceBs || meta.paymentReference || '');
  const [extras, setExtras] = useState(meta.extras || []);
  const [products, setProducts] = useState(meta.products_sold || []);
  // Propina: se puede agregar/editar aquí (ej. si se olvidó al cobrar). Va a un barbero.
  const oldTipTotal = (meta.staffInvolved || []).reduce((s, x) => s + Number(x.tip || 0), 0);
  const [propina, setPropina] = useState(oldTipTotal ? String(oldTipTotal) : '');
  const [propinaStaffId, setPropinaStaffId] = useState(() => {
    const tipped = (meta.staffInvolved || []).find(x => Number(x.tip || 0) > 0);
    if (tipped?.staffId) return tipped.staffId;
    return (Array.isArray(meta.appointments) && meta.appointments[0]?.staff_id) || meta.barberId || (barberOptions[0]?.id) || '';
  });
  const isWashExtraName = (name) => (name || '').toLowerCase().includes('lavado');
  const washExtras = (extras || []).filter(ex => isWashExtraName(ex.service_extras?.name || ex.name));
  const hasWashExtra = washExtras.length > 0;
  const washExtrasTotal = washExtras.reduce((s, ex) => s + (Number(ex.price) || 0), 0);
  const [servicesList, setServicesList] = useState([]);
  const [extrasList, setExtrasList] = useState([]);
  const [productsList, setProductsList] = useState([]);
  const [newExtraName, setNewExtraName] = useState('');
  const [newExtraPrice, setNewExtraPrice] = useState('');
  const [newProductQty, setNewProductQty] = useState('1');
  const rate = Number(t.exchange_rate || rates?.usd || 550);

  useEffect(() => {
    (async () => {
      try {
        const [svcs, exts, prods] = await Promise.all([
          dataService.getServices().catch(() => []),
          dataService.getExtras().catch(() => []),
          dataService.getSellableInventory().catch(() => [])
        ]);
        setServicesList(svcs);
        setExtrasList(exts);
        setProductsList(prods);
      } catch {}
    })();
  }, []);

  const sumExtrasUsd = (arr) => (arr || []).reduce((s, e) => s + (Number(e.price) || 0), 0);
  const sumProductsUsd = (arr) => (arr || []).reduce((s, p) => s + (Number(p.price) || 0) * (Number(p.quantity) || 1), 0);

  const oldServicesTotalUsd = (Array.isArray(meta.appointments) && meta.appointments.length > 0
    ? meta.appointments.reduce((s, a) => s + Number(a.servicePrice || 0), 0)
    : Number(meta.servicePrice || 0));

  const calcTotal = () => {
    if (manualAmountBs !== '' && !isNaN(Number(manualAmountBs))) return Number(manualAmountBs);
    const oldEditableUsd = oldServicesTotalUsd + sumExtrasUsd(meta.extras) + sumProductsUsd(meta.products_sold);
    const newServicesTotalUsd = services.reduce((s, r) => s + (Number(r.servicePrice) || 0), 0);
    const newEditableUsd = newServicesTotalUsd + sumExtrasUsd(extras) + sumProductsUsd(products);
    // La propina se reemplaza (quitamos la vieja del total y sumamos la nueva).
    const newAmountUsd = Math.max(0, Number(t.amount || 0) - oldEditableUsd - oldTipTotal + newEditableUsd + (Number(propina) || 0));
    return newAmountUsd * rate;
  };

  const handleSave = () => {
    const washerObj = assistantOptions.find(a => String(a.id) === String(washerId));
    const resolvedServices = services.map(r => {
      const barberObj = barberOptions.find(b => String(b.id) === String(r.staffId));
      const svcMatch = servicesList.find(s => s.name === r.serviceName);
      return {
        appointmentId: r.appointmentId,
        staffId: r.staffId || '',
        staffName: barberObj?.name || '',
        serviceName: r.serviceName,
        serviceId: svcMatch?.id || null,
        servicePrice: Number(r.servicePrice) || 0
      };
    });
    const primary = resolvedServices[0] || {};
    const updates = {
      didWash, washCount: didWash ? washCount : 0, washRate,
      // La asistente se pasa si hay lavados incluidos O extras de lavado, para que la
      // comisión de esos extras se le acredite a ella (no al barbero).
      washerId: (didWash || hasWashExtra) ? (washerId || '') : '',
      washerName: (didWash || hasWashExtra) ? (washerObj?.name || '') : '',
      services: resolvedServices,
      barberId: primary.staffId || '', barberName: primary.staffName || '',
      serviceName: resolvedServices.map(s => s.serviceName).filter(Boolean).join(' + '),
      serviceId: primary.serviceId || null,
      servicePrice: resolvedServices.reduce((s, r) => s + r.servicePrice, 0),
      manualAmountBs: manualAmountBs !== '' && !isNaN(Number(manualAmountBs)) ? Number(manualAmountBs) : null,
      extras, products_sold: products, paymentMethod,
      propina: Number(propina) || 0, propinaStaffId: propinaStaffId || '',
      payment_reference_bs: paymentRef, paymentReferenceBs: paymentRef, _recalculate: true
    };
    onSave(t.id, updates);
  };

  const addServiceAsExtra = (svc) => setExtras(prev => [...prev, { name: svc.name, price: Number(svc.price || 0), service_extras: { name: svc.name } }]);
  const addCustomExtra = () => { if (!newExtraName || !newExtraPrice) return; setExtras(prev => [...prev, { name: newExtraName, price: Number(newExtraPrice), service_extras: { name: newExtraName } }]); setNewExtraName(''); setNewExtraPrice(''); };
  const removeExtra = (idx) => setExtras(prev => prev.filter((_, i) => i !== idx));
  const addProduct = (prod) => { const qty = Number(newProductQty || 1); const idx = products.findIndex(p => p.id === prod.id); if (idx >= 0) { const u = [...products]; u[idx] = { ...u[idx], quantity: (u[idx].quantity || 1) + qty }; setProducts(u); } else { setProducts(prev => [...prev, { id: prod.id, name: prod.name, price: Number(prod.sale_price || prod.price || 0), quantity: qty }]); } setNewProductQty('1'); };
  const removeProduct = (idx) => setProducts(prev => prev.filter((_, i) => i !== idx));

  const sectionBox = { padding: isMobile ? '14px' : '18px', borderRadius: '16px', background: 'rgba(255,255,255,.025)', border: '1px solid rgba(255,255,255,.07)' };
  const sectionLabel = { fontSize: '10px', fontWeight: '900', color: 'var(--gold-primary)', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' };
  const inputStyle = { width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1px solid rgba(255,255,255,.1)', background: 'rgba(255,255,255,.05)', color: 'white', fontSize: '13px', outline: 'none' };
  const selectStyle = { ...inputStyle, appearance: 'none' };
  const removeBtn = { width: '32px', height: '32px', borderRadius: '8px', border: 'none', background: 'rgba(255,69,58,.1)', color: '#ff453a', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', flexShrink: 0 };

  return (
    <div className="finance-edit-transaction" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>

      {/* HEADER: Cliente + Servicio + Monto */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px' }}>
        <div>
          <div style={{ fontSize: '14px', fontWeight: '800', color: 'white' }}>{meta.clientName || 'Cliente'}</div>
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>• {services.map(s => s.serviceName).filter(Boolean).join(' + ') || 'Servicio'}</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '22px', fontWeight: '950', color: 'var(--gold-primary)' }}>{calcTotal().toLocaleString('es-VE', { minimumFractionDigits: 2 })} Bs</div>
          <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>${(calcTotal() / rate).toFixed(2)} USD</div>
        </div>
      </div>

      <div className="finance-edit-layout">
        <div className="finance-edit-column">
      {/* SERVICIO + BARBERO (una fila por cada cita/servicio enlazado en la transacción) */}
      <div style={sectionBox}>
        <div style={sectionLabel}><Scissors size={15} /> Servicio y Odontólogo{services.length > 1 ? ` (${services.length})` : ''}</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {services.map((row, idx) => (
            <div key={row.appointmentId ?? idx} style={idx > 0 ? { paddingTop: '14px', borderTop: '1px solid rgba(255,255,255,.06)', display: 'flex', flexDirection: 'column', gap: '10px' } : { display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1.5fr minmax(0, 1fr)', gap: '10px' }}>
                <div>
                  <label style={{ fontSize: '9px', color: 'var(--text-muted)', fontWeight: '800', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>Servicio</label>
                  {servicesList.length > 0 ? (
                    <PandaSelect
                      value={servicesList.some(s => s.name === row.serviceName) ? row.serviceName : '__custom__'}
                      onChange={v => {
                        if (v === '__custom__') return;
                        const svc = servicesList.find(s => s.name === v);
                        updateService(idx, { serviceName: v, servicePrice: svc ? Number(svc.price || 0) : row.servicePrice });
                      }}
                      options={[
                        ...(!servicesList.some(s => s.name === row.serviceName) ? [{ value: '__custom__', label: row.serviceName || 'Personalizado', icon: <Scissors size={14} />, subtitle: 'Servicio registrado anteriormente' }] : []),
                        ...servicesList.filter(s => s.active !== false).map(svc => ({
                          value: svc.name,
                          label: svc.name,
                          icon: <Scissors size={14} />,
                          subtitle: `$${Number(svc.price || 0).toFixed(2)}`
                        }))
                      ]}
                      triggerStyle={{ minHeight: '44px', background: 'rgba(255,255,255,.05)', borderRadius: '10px' }}
                      menuStyle={{ background: 'var(--bg-secondary)', border: '1px solid rgba(17, 17, 17,.22)', boxShadow: '0 18px 48px rgba(0,0,0,.75)' }}
                    />
                  ) : <input placeholder="Nombre del servicio" value={row.serviceName} onChange={e => updateService(idx, { serviceName: e.target.value })} style={inputStyle} />}
                </div>
                <div>
                  <label style={{ fontSize: '9px', color: 'var(--text-muted)', fontWeight: '800', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>Precio ($)</label>
                  <input type="number" min="0" step="0.5" value={row.servicePrice} onChange={e => updateService(idx, { servicePrice: Number(e.target.value) })} style={inputStyle} />
                </div>
              </div>
              <div>
                <label style={{ fontSize: '9px', color: 'var(--text-muted)', fontWeight: '800', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>Odontólogo</label>
                <PandaSelect
                  value={row.staffId}
                  onChange={val => updateService(idx, { staffId: val })}
                  options={[
                    { value: '', label: 'Sin asignar', avatarFallback: '—' },
                    ...barberOptions.map(b => ({
                      value: b.id,
                      label: b.name,
                      imageUrl: b.image_url || b.avatar_url || '',
                      avatarFallback: (b.name || '?').trim().charAt(0).toUpperCase(),
                      subtitle: `${roleLabel((b.role || 'Barbero').split('|')[0])}${b.commission_pct != null ? ` · ${b.commission_pct}%` : ''}`
                    }))
                  ]}
                  triggerStyle={{ minHeight: '44px' }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* LIMPIEZAS */}
      <div style={sectionBox}>
        <div style={sectionLabel}><Droplets size={15} /> Limpiezas</div>
        <div style={{ display: 'flex', gap: '8px', marginBottom: didWash ? '12px' : '0' }}>
          <button onClick={() => { setDidWash(false); setWashCount(0); }} style={{ flex: 1, padding: '12px', borderRadius: '12px', border: !didWash ? '2px solid var(--gold-primary)' : '1px solid rgba(255,255,255,.1)', background: !didWash ? 'rgba(17, 17, 17,.12)' : 'transparent', color: !didWash ? 'var(--gold-primary)' : 'var(--text-secondary)', fontWeight: '800', fontSize: '13px', cursor: 'pointer', transition: '0.2s' }}>0 limpiezas</button>
          <button onClick={() => { setDidWash(true); if (washCount === 0) setWashCount(1); }} style={{ flex: 1, padding: '12px', borderRadius: '12px', border: didWash ? '2px solid var(--gold-primary)' : '1px solid rgba(255,255,255,.1)', background: didWash ? 'rgba(17, 17, 17,.12)' : 'transparent', color: didWash ? 'var(--gold-primary)' : 'var(--text-secondary)', fontWeight: '800', fontSize: '13px', cursor: 'pointer', transition: '0.2s' }}>{washCount || 1} limpieza{washCount !== 1 ? 's' : ''}</button>
        </div>
        {didWash && (
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: '10px', marginBottom: '10px' }}>
            <div>
              <label style={{ fontSize: '9px', color: 'var(--text-muted)', fontWeight: '800', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>Cantidad</label>
              <div style={{ display: 'flex', gap: '6px' }}>
                {[1, 2, 3].map(n => (
                  <button key={n} onClick={() => setWashCount(n)} style={{ flex: 1, padding: '10px', borderRadius: '10px', border: washCount === n ? '2px solid var(--gold-primary)' : '1px solid rgba(255,255,255,.1)', background: washCount === n ? 'rgba(17, 17, 17,.12)' : 'transparent', color: washCount === n ? 'var(--gold-primary)' : 'var(--text-secondary)', fontWeight: '800', fontSize: '13px', cursor: 'pointer' }}>{n}</button>
                ))}
              </div>
            </div>
            <div>
              <label style={{ fontSize: '9px', color: 'var(--text-muted)', fontWeight: '800', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>Tarifa ($/limpieza)</label>
              <input type="number" min="0" step="0.5" value={washRate} onChange={e => setWashRate(Number(e.target.value))} style={inputStyle} />
            </div>
          </div>
        )}
        {/* El selector de asistente aparece si hay lavados incluidos O extras de lavado.
            La comisión (60%) cubre ambos: los lavados de la tarifa + los extras de lavado. */}
        {(didWash || hasWashExtra) && (
          <div>
            <label style={{ fontSize: '9px', color: 'var(--text-muted)', fontWeight: '800', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>
              Asistente dental (60% = ${(((didWash ? washCount * washRate : 0) + washExtrasTotal) * 0.6).toFixed(2)})
            </label>
            <PandaSelect
              value={washerId}
              onChange={setWasherId}
              options={[
                { value: '', label: 'Sin asignar', avatarFallback: '—' },
                ...assistantOptions.map(a => ({ value: a.id, label: a.name, imageUrl: a.image_url || a.avatar_url || '', avatarFallback: (a.name || '?').trim().charAt(0).toUpperCase(), subtitle: (a.role || 'Asistente').split('|')[0] }))
              ]}
              triggerStyle={{ minHeight: '44px' }}
            />
            {hasWashExtra && (
              <div style={{ fontSize: '10px', color: 'var(--text-secondary)', marginTop: '6px' }}>
                Incluye {washExtras.length} extra{washExtras.length !== 1 ? 's' : ''} de limpieza (${washExtrasTotal.toFixed(2)}).
              </div>
            )}
          </div>
        )}
      </div>

      {/* PROPINA */}
      <div style={sectionBox}>
        <div style={sectionLabel}>💵 Propina</div>
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'minmax(0, 1fr) 1.4fr', gap: '10px' }}>
          <div>
            <label style={{ fontSize: '9px', color: 'var(--text-muted)', fontWeight: '800', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>Monto ($)</label>
            <input type="number" min="0" step="0.5" placeholder="0" value={propina} onChange={e => setPropina(e.target.value)} style={inputStyle} />
          </div>
          <div>
            <label style={{ fontSize: '9px', color: 'var(--text-muted)', fontWeight: '800', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>Para (odontólogo)</label>
            <select value={propinaStaffId} onChange={e => setPropinaStaffId(e.target.value)} style={selectStyle}>
              <option value="">Sin asignar</option>
              {barberOptions.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </div>
        </div>
        {Number(propina) > 0 && <div style={{ fontSize: '10px', color: '#32d74b', marginTop: '6px' }}>+{(Number(propina) * rate).toLocaleString('es-VE', { maximumFractionDigits: 2 })} Bs de propina — va completa al odontólogo.</div>}
      </div>

      {/* MÉTODO DE PAGO */}
      <div style={sectionBox}>
        <div style={sectionLabel}><WalletCards size={15} /> Método de Pago</div>
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'minmax(0, 1fr) minmax(0, 1fr)', gap: '10px' }}>
          <div>
            <label style={{ fontSize: '9px', color: 'var(--text-muted)', fontWeight: '800', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>Método</label>
            <PandaSelect
              value={paymentMethod}
              onChange={setPaymentMethod}
              options={[
                { value: '', label: 'Seleccionar...', icon: <WalletCards size={14} /> },
                { value: 'Efectivo ($)', label: 'Efectivo ($)', icon: <Wallet size={14} />, subtitle: 'Dólares en efectivo' },
                { value: 'Efectivo (Bs)', label: 'Efectivo (Bs)', icon: <Wallet size={14} />, subtitle: 'Bolívares en efectivo' },
                { value: 'Pago Móvil', label: 'Pago Móvil', icon: <WalletCards size={14} /> },
                { value: 'Zelle', label: 'Zelle', icon: <WalletCards size={14} /> },
                { value: 'Binance', label: 'Binance / USDT', icon: <WalletCards size={14} /> },
                { value: 'Punto de Venta', label: 'Punto de Venta', icon: <WalletCards size={14} /> },
                { value: 'Fiado / Por', label: 'Fiado / Por cobrar', icon: <WalletCards size={14} /> }
              ]}
              triggerStyle={{ minHeight: '44px', background: 'rgba(255,255,255,.05)', borderRadius: '10px' }}
              menuStyle={{ background: 'var(--bg-secondary)', border: '1px solid rgba(17, 17, 17,.22)', boxShadow: '0 18px 48px rgba(0,0,0,.75)' }}
            />
          </div>
          <div>
            <label style={{ fontSize: '9px', color: 'var(--text-muted)', fontWeight: '800', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>Referencia</label>
            <input placeholder="Nº de referencia" value={paymentRef} onChange={e => setPaymentRef(e.target.value)} style={inputStyle} />
          </div>
        </div>
        <div style={{ marginTop: '10px' }}>
          <label style={{ fontSize: '9px', color: 'var(--text-muted)', fontWeight: '800', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>Monto total cobrado (Bs) — opcional</label>
          <input type="number" min="0" placeholder={`Auto: ${calcTotal().toLocaleString('es-VE', { maximumFractionDigits: 2 })}`} value={manualAmountBs} onChange={e => setManualAmountBs(e.target.value)} style={inputStyle} />
        </div>
      </div>

        </div>
        <div className="finance-edit-column">

      {/* EXTRAS */}
      <div style={sectionBox}>
        <div style={sectionLabel}><Plus size={15} /> Extras / Servicios adicionales</div>
        {extras.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '10px' }}>
            {extras.map((ex, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 10px', borderRadius: '10px', background: 'rgba(255,255,255,.03)', border: '1px solid rgba(255,255,255,.06)' }}>
                <span style={{ fontSize: '12px', fontWeight: '600' }}>{ex.service_extras?.name || ex.name}</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '12px', color: 'var(--gold-primary)', fontWeight: '800' }}>${Number(ex.price || 0).toFixed(2)}</span>
                  <button onClick={() => removeExtra(i)} style={removeBtn} aria-label="Eliminar extra"><X size={14} /></button>
                </div>
              </div>
            ))}
          </div>
        )}
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'minmax(0, 1fr) auto', gap: '8px', marginBottom: extrasList.length > 0 ? '10px' : '0' }}>
          <input placeholder="Nombre del extra" value={newExtraName} onChange={e => setNewExtraName(e.target.value)} style={{ ...inputStyle, flex: 1 }} />
          <div style={{ display: 'flex', gap: '6px' }}>
            <input placeholder="$ Precio" type="number" min="0" step="0.5" value={newExtraPrice} onChange={e => setNewExtraPrice(e.target.value)} style={{ ...inputStyle, width: '100px' }} />
            <button onClick={addCustomExtra} style={{ padding: '8px 14px', borderRadius: '10px', border: '1px solid rgba(17, 17, 17,.3)', background: 'rgba(17, 17, 17,.08)', color: 'var(--gold-primary)', fontSize: '13px', fontWeight: '800', cursor: 'pointer', display: 'grid', placeItems: 'center' }} aria-label="Agregar extra"><Plus size={15} /></button>
          </div>
        </div>
        {extrasList.length > 0 && (
          <div className="finance-edit-option-grid" style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, minmax(0, 1fr))', gap: '6px' }}>
            {extrasList.map(ex => (
              <button key={ex.id} onClick={() => addServiceAsExtra(ex)} style={{ display: 'flex', minWidth: 0, justifyContent: 'space-between', alignItems: 'center', gap: '8px', padding: '8px 10px', borderRadius: '9px', border: '1px solid rgba(255,255,255,.06)', background: 'rgba(255,255,255,.02)', color: 'white', fontSize: '11px', cursor: 'pointer', textAlign: 'left' }}>
                <span style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: '600' }}>{ex.name}</span>
                <span style={{ flexShrink: 0, color: 'var(--gold-primary)', fontWeight: '800' }}>${Number(ex.price || 0).toFixed(2)}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* PRODUCTOS */}
      <div style={sectionBox}>
        <div style={sectionLabel}><ShoppingBag size={15} /> Productos vendidos</div>
        {products.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '10px' }}>
            {products.map((p, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 10px', borderRadius: '10px', background: 'rgba(255,255,255,.03)', border: '1px solid rgba(255,255,255,.06)' }}>
                <span style={{ fontSize: '12px', fontWeight: '600' }}>{p.name} x{p.quantity}</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '12px', color: 'var(--gold-primary)', fontWeight: '800' }}>${(Number(p.price || 0) * Number(p.quantity || 1)).toFixed(2)}</span>
                  <button onClick={() => removeProduct(i)} style={removeBtn} aria-label="Eliminar producto"><X size={14} /></button>
                </div>
              </div>
            ))}
          </div>
        )}
        {productsList.length > 0 && (
          <>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '8px', alignItems: 'flex-end' }}>
              <div style={{ width: '60px' }}>
                <label style={{ fontSize: '9px', color: 'var(--text-muted)', fontWeight: '800' }}>CANT</label>
                <input type="number" min="1" value={newProductQty} onChange={e => setNewProductQty(e.target.value)} style={{ ...inputStyle, padding: '8px' }} />
              </div>
            </div>
            <div className="finance-edit-option-grid" style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, minmax(0, 1fr))', gap: '6px' }}>
              {productsList.filter(p => p.is_for_sale !== false).map(prod => (
                <button key={prod.id} onClick={() => addProduct(prod)} style={{ display: 'flex', minWidth: 0, justifyContent: 'space-between', alignItems: 'center', gap: '8px', padding: '8px 10px', borderRadius: '9px', border: '1px solid rgba(255,255,255,.06)', background: 'rgba(255,255,255,.02)', color: 'white', fontSize: '11px', cursor: 'pointer', textAlign: 'left' }}>
                  <span style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: '600' }}>{prod.name}</span>
                  <div style={{ display: 'flex', flexShrink: 0, alignItems: 'center', gap: '8px' }}>
                    <span style={{ color: 'var(--text-muted)', fontSize: '9px' }}>Stock: {prod.stock}</span>
                    <span style={{ color: 'var(--gold-primary)', fontWeight: '800' }}>${Number(prod.sale_price || prod.price || 0).toFixed(2)}</span>
                  </div>
                </button>
              ))}
            </div>
          </>
        )}
      </div>

        </div>
      </div>

      {/* FOOTER */}
      <div className="finance-edit-footer" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '14px', borderTop: '1px solid rgba(255,255,255,.08)' }}>
        <div>
          <div style={{ fontSize: '9px', color: 'var(--text-muted)', fontWeight: '800', textTransform: 'uppercase' }}>Total recalculado</div>
          <div style={{ fontSize: '20px', fontWeight: '950', color: 'var(--gold-primary)' }}>${(calcTotal() / rate).toFixed(2)} USD</div>
          <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{calcTotal().toLocaleString('es-VE', { minimumFractionDigits: 2 })} Bs</div>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button onClick={onCancel} style={{ padding: '12px 20px', borderRadius: '12px', border: '1px solid rgba(255,255,255,.1)', background: 'rgba(255,255,255,.03)', color: 'white', fontWeight: '700', cursor: 'pointer', fontSize: '13px' }}>Cancelar</button>
          <button onClick={handleSave} className="btn-gold" style={{ padding: '12px 28px', borderRadius: '12px', fontWeight: '900', fontSize: '13px' }}>Guardar</button>
        </div>
      </div>
    </div>
  );
};

// Editor para EGRESOS (vales/adelantos, consumos, pagos de nómina, gastos manuales).
// A diferencia del editor de servicios, aquí se edita: a quién se le pagó, el monto (Bs),
// el método de pago, la referencia y la nota — no servicios/comisiones.
const EditExpenseContent = ({ transaction: t, rates, staff = [], onSave, onCancel, isMobile }) => {
  const meta = t.metadata || {};
  const rate = Number(t.exchange_rate || rates?.usd || 550);
  const initialAmountBs = Number(meta.amountBs || (Number(t.amount || 0) * rate));
  const [amountBs, setAmountBs] = useState(initialAmountBs ? String(initialAmountBs) : '');
  const [staffId, setStaffId] = useState(meta.staffId || '');
  const [paymentMethod, setPaymentMethod] = useState(meta.paymentMethod || '');
  const [paymentRef, setPaymentRef] = useState(meta.paymentReference || meta.reference || '');
  const [note, setNote] = useState(meta.note || '');
  const [description, setDescription] = useState(t.description || '');

  const staffOptions = (staff || []).filter(s => s.active !== false && !String(s.role || '').startsWith('ARCHIVED|'));
  // Estas categorías representan movimientos ligados a una persona (se puede reasignar).
  const staffLinkedCategories = ['Vales Odontologos', 'Consumo Personal', 'Pago Nómina'];
  const hasStaff = !!meta.staffId || staffLinkedCategories.includes(t.category);
  const categoryLabel = ({
    'Vales Odontologos': 'Vale / Adelanto',
    'Consumo Personal': 'Consumo personal',
    'Pago Nómina': 'Pago de nómina'
  })[t.category] || t.category || 'Egreso';

  const amountUsd = Number(amountBs || 0) / rate;

  const sectionBox = { padding: isMobile ? '14px' : '18px', borderRadius: '16px', background: 'rgba(255,255,255,.025)', border: '1px solid rgba(255,255,255,.07)' };
  const sectionLabel = { fontSize: '10px', fontWeight: '900', color: '#ff9f0a', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' };
  const label = { fontSize: '9px', color: 'var(--text-muted)', fontWeight: '800', textTransform: 'uppercase', display: 'block', marginBottom: '4px' };
  const inputStyle = { width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1px solid rgba(255,255,255,.1)', background: 'rgba(255,255,255,.05)', color: 'white', fontSize: '13px', outline: 'none', boxSizing: 'border-box' };
  const selectStyle = { ...inputStyle, appearance: 'none' };

  const handleSave = () => {
    const staffObj = staffOptions.find(s => String(s.id) === String(staffId));
    onSave(t.id, {
      _expense: true,
      amountBs: Number(amountBs) || 0,
      staffId: hasStaff ? (staffId || '') : (meta.staffId || ''),
      staffName: staffObj?.name || '',
      paymentMethod,
      paymentReference: paymentRef,
      note,
      description
    });
  };

  return (
    <div className="finance-edit-expense" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      {/* HEADER */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px' }}>
        <div>
          <div style={{ fontSize: '11px', fontWeight: '900', color: '#ff9f0a', textTransform: 'uppercase', letterSpacing: '.5px' }}>{categoryLabel}</div>
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>Egreso · edita a quién, cuánto y por dónde salió</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '22px', fontWeight: '950', color: '#ff453a' }}>-{(Number(amountBs) || 0).toLocaleString('es-VE', { minimumFractionDigits: 2 })} Bs</div>
          <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>-${amountUsd.toFixed(2)} USD</div>
        </div>
      </div>

      {/* DESTINATARIO + MONTO */}
      <div style={sectionBox}>
        <div style={sectionLabel}><ArrowDownCircle size={15} /> {hasStaff ? 'Pago a personal' : 'Detalle del egreso'}</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {hasStaff && (
            <div>
              <label style={label}>¿A quién se le pagó?</label>
              <PandaSelect
                value={staffId}
                onChange={setStaffId}
                options={[
                  { value: '', label: 'Sin asignar', avatarFallback: '—' },
                  ...staffOptions.map(s => ({ value: s.id, label: s.name, imageUrl: s.image_url || s.avatar_url || '', avatarFallback: (s.name || '?').trim().charAt(0).toUpperCase(), subtitle: (s.role || 'Profesional').split('|')[0] }))
                ]}
                triggerStyle={{ minHeight: '44px' }}
              />
            </div>
          )}
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'minmax(0, 1fr) minmax(0, 1fr)', gap: '10px' }}>
            <div>
              <label style={label}>Monto (Bs)</label>
              <input type="number" min="0" step="0.01" value={amountBs} onChange={e => setAmountBs(e.target.value)} style={inputStyle} />
            </div>
            <div>
              <label style={label}>Equivalente (USD)</label>
              <input value={`$${amountUsd.toFixed(2)}`} disabled style={{ ...inputStyle, opacity: 0.6 }} />
            </div>
          </div>
        </div>
      </div>

      {/* MÉTODO DE PAGO */}
      <div style={sectionBox}>
        <div style={sectionLabel}><WalletCards size={15} /> Método de pago</div>
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'minmax(0, 1fr) minmax(0, 1fr)', gap: '10px' }}>
          <div>
            <label style={label}>Cuenta / Método</label>
            <PandaSelect
              value={paymentMethod}
              onChange={setPaymentMethod}
              options={[
                { value: '', label: 'Seleccionar...', icon: <WalletCards size={14} /> },
                ...SETTLEMENT_ACCOUNTS.map(acc => ({ value: acc, label: acc, icon: acc.includes('Efectivo') ? <Wallet size={14} /> : <WalletCards size={14} /> }))
              ]}
              triggerStyle={{ minHeight: '44px', background: 'rgba(255,255,255,.05)', borderRadius: '10px' }}
              menuStyle={{ background: 'var(--bg-secondary)', border: '1px solid rgba(17, 17, 17,.22)', boxShadow: '0 18px 48px rgba(0,0,0,.75)' }}
            />
          </div>
          <div>
            <label style={label}>Referencia (opcional)</label>
            <input placeholder="Nº de referencia" value={paymentRef} onChange={e => setPaymentRef(e.target.value)} style={inputStyle} />
          </div>
        </div>
      </div>

      {/* NOTA / DESCRIPCIÓN */}
      <div style={sectionBox}>
        <div style={sectionLabel}><List size={15} /> Nota</div>
        {!hasStaff && (
          <div style={{ marginBottom: '10px' }}>
            <label style={label}>Descripción</label>
            <input value={description} onChange={e => setDescription(e.target.value)} style={inputStyle} />
          </div>
        )}
        <div>
          <label style={label}>Nota interna (opcional)</label>
          <input placeholder="Ej. adelanto quincena, motivo…" value={note} onChange={e => setNote(e.target.value)} style={inputStyle} />
        </div>
      </div>

      {/* FOOTER */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', paddingTop: '4px' }}>
        <button onClick={onCancel} style={{ padding: '12px 20px', borderRadius: '12px', border: '1px solid rgba(255,255,255,.1)', background: 'rgba(255,255,255,.03)', color: 'white', fontWeight: '700', cursor: 'pointer', fontSize: '13px' }}>Cancelar</button>
        <button onClick={handleSave} className="btn-gold" style={{ padding: '12px 28px', borderRadius: '12px', fontWeight: '900', fontSize: '13px' }}>Guardar</button>
      </div>
    </div>
  );
};

const FinanceModule = ({ isMobile, currency, rates, staff = [] }) => {
  const { showToast } = useNotifs();
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [activeTab, setActiveTab] = useState(() => localStorage.getItem('panda_financeTab') || 'transactions');
  useEffect(() => {
    localStorage.setItem('panda_financeTab', activeTab);
  }, [activeTab]);

  // Transaction Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearch = useDebounce(searchQuery, 300);
  const [filterService, setFilterService] = useState('all');
  const [filterType, setFilterType] = useState('all'); // 'all', 'income', 'expense'
  const [filterBarber, setFilterBarber] = useState('all'); // 'all' or staff ID
  const [filterDate, setFilterDate] = useState('all'); // 'all', 'today', 'this_week', 'this_month', 'custom'
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const [isFilterExiting, setIsFilterExiting] = useState(false);

  const handleCloseFilterPanel = () => {
    setIsFilterExiting(true);
    setTimeout(() => {
      setShowFilterPanel(false);
      setIsFilterExiting(false);
    }, 250);
  };

  // Cash Closing Filter States
  const [cashCloseDate, setCashCloseDate] = useState('today');
  const [cashCloseStartDate, setCashCloseStartDate] = useState('');
  const [cashCloseEndDate, setCashCloseEndDate] = useState('');
  
  // Nómina: cuenta corriente acumulada (sin filtro de fecha; ver payrollDateRange).
  const [payrollCardsFilter, setPayrollCardsFilter] = useState('all'); // 'all', 'movement'
  
  // Custom Dialog State
  const [dialog, setDialog] = useState({
    isOpen: false,
    type: 'prompt',
    title: '',
    message: '',
    placeholder: '',
    onConfirm: null,
    step: 1, // To handle sequential prompts (desc -> amount)
    tempData: {}
  });

  const [editTx, setEditTx] = useState({ isOpen: false, transaction: null });

  const closeEditTransactionModal = () => {
    // Conserva el contenido montado mientras AnimatedModal reproduce la salida.
    setEditTx(previous => ({ ...previous, isOpen: false }));
  };

  useEffect(() => {
    if (editTx.isOpen || !editTx.transaction) return undefined;

    const unmountTimer = window.setTimeout(() => {
      setEditTx(previous => (
        previous.isOpen ? previous : { isOpen: false, transaction: null }
      ));
    }, 240);

    return () => window.clearTimeout(unmountTimer);
  }, [editTx.isOpen, editTx.transaction]);

  // Id del staff cuyo cierre de nómina se está cargando (para feedback y evitar reclicks).
  const [settlementLoadingId, setSettlementLoadingId] = useState(null);

  // Business Logic States (from Excel 2)
  const [fixedCosts, setFixedCosts] = useState(() => {
    const saved = localStorage.getItem('panda_fixed_costs');
    const defaults = { 
      rent: 522, 
      services: 300, 
      payroll: 60, 
      software: 45, 
      marketing: 60, 
      tax: 200, 
      workstations: 3, 
      avgServiceTime: 45, 
      extraCosts: [],
      hiddenCosts: [],
      customLabels: {
        rent: 'Alquiler ($)',
        services: 'Servicios ($)',
        payroll: 'Nómina Fija ($)',
        software: 'Software ($)',
        marketing: 'Marketing ($)',
        tax: 'Impuestos ($)',
        workstations: 'Sillas Activas',
        avgServiceTime: 'Tiempo Prom. (min)'
      }
    };
    if (!saved) return defaults;
    const parsed = JSON.parse(saved);
    return { ...defaults, ...parsed, customLabels: { ...defaults.customLabels, ...parsed.customLabels } };
  });
  const [isEditingCosts, setIsEditingCosts] = useState(false);
  const [isCostsLocked, setIsCostsLocked] = useState(true);
  const [selectedTxId, setSelectedTxId] = useState(null);

  // Payroll / Nómina States
  const [assistantConfig, setAssistantConfig] = useState(() => {
    const saved = localStorage.getItem('panda_assistant_config');
    const defaults = {
      weeklyVacaUsd: 20,
      splits: {}
    };
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Migrate old config if necessary
        if (parsed.baseSalaryUsd && !parsed.weeklyVacaUsd) {
          const weeklyTotal = parsed.baseSalaryUsd / 4;
          const newSplits = {};
          Object.entries(parsed.splits || {}).forEach(([id, pct]) => {
            newSplits[id] = Number((weeklyTotal * (pct / 100)).toFixed(2));
          });
          return {
            weeklyVacaUsd: weeklyTotal,
            splits: newSplits
          };
        }
        return { ...defaults, ...parsed, splits: { ...defaults.splits, ...parsed.splits } };
      } catch (e) {
        console.error("Error parsing assistant config", e);
      }
    }
    return defaults;
  });
  const [isConfiguringPayroll, setIsConfiguringPayroll] = useState(false);
  const [payrollModal, setPayrollModal] = useState({ 
    isOpen: false, 
    staff: null, 
    earnedBs: 0, 
    deductionBs: 0, 
    paymentAmountBs: 0,
    isAbono: false,
    file: null,
    paymentMethod: 'Efectivo ($)',
    earnings: null,
    allocations: emptyAllocations()
  });
  const [payrollDetail, setPayrollDetail] = useState({ isOpen: false, staff: null, transactions: [] });
  const [valeModal, setValeModal] = useState({ isOpen: false, staff: null, amountBs: '', paymentMethod: 'Efectivo ($)', note: '', allocations: {} });
  const [salaryModal, setSalaryModal] = useState({ isOpen: false, staff: null, amountBs: '', paymentMethod: 'Efectivo ($)', note: '' });
  const [salaryConfigModal, setSalaryConfigModal] = useState({ isOpen: false, staff: null, amountUsd: '' });
  // Override local del salario mensual recién guardado (el prop `staff` no se recarga solo).
  const [salaryOverrides, setSalaryOverrides] = useState({});
  const [consumptionModal, setConsumptionModal] = useState({ isOpen: false, staff: null, items: [] });
  const [sellableInventory, setSellableInventory] = useState([]);
  const [manualTransaction, setManualTransaction] = useState({ isOpen: false, type: 'income' });
  const [conversionModal, setConversionModal] = useState({ isOpen: false, fromAccount: 'pago_movil', fromAmount: '', toAccount: 'cash_usd', rate: '', toAmount: '' });
  const [providerModal, setProviderModal] = useState({ isOpen: false, account: 'cash_usd', amount: '' });
  const [productHistoryModal, setProductHistoryModal] = useState({ isOpen: false });
  const [receivablePayment, setReceivablePayment] = useState({ isOpen: false, transaction: null });

  useScrollLock(
    isEditingCosts || 
    isConfiguringPayroll || 
    payrollModal.isOpen || 
    payrollDetail.isOpen || 
    valeModal.isOpen ||
    salaryModal.isOpen ||
    salaryConfigModal.isOpen ||
    consumptionModal.isOpen ||
    manualTransaction.isOpen ||
    receivablePayment.isOpen ||
    dialog.isOpen
  );

  const openStaffConsumption = async staffMember => {
    if (!sellableInventory || sellableInventory.length === 0) {
      try {
        const items = await dataService.getSellableInventory();
        if (Array.isArray(items)) setSellableInventory(items);
      } catch (err) {
        console.error('Error cargando inventario:', err);
      }
    }
    setConsumptionModal({ isOpen: true, staff: staffMember, items: [] });
  };

  const handleRegisterConsumption = async items => {
    try {
      setLoading(true);
      const staffName = consumptionModal.staff?.name || 'personal';
      const result = await dataService.registerStaffConsumption(consumptionModal.staff.id, items, Number(rates?.usd || 0));
      setConsumptionModal(prev => ({ ...prev, isOpen: false }));
      await fetchTransactions();
      showToast(`Consumo de ${Number(result?.amountBs || 0).toLocaleString('es-VE')} Bs registrado para ${staffName}.`, 'success');
    } catch (error) {
      console.error(error);
      showToast(error?.message || 'No se pudo registrar el consumo.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleCollectReceivable = async ({ account, reference }) => {
    try {
      setLoading(true);
      await dataService.collectReceivable(receivablePayment.transaction, {
        account,
        reference,
        rate: Number(rates?.usd || 1)
      });
      setReceivablePayment({ isOpen: false, transaction: null });
      await fetchTransactions();
      showToast('Pago recibido y cuenta cerrada correctamente.', 'success');
    } catch (error) {
      console.error(error);
      showToast(error?.message || 'No se pudo registrar el cobro.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterVale = async () => {
    const rate = rates?.usd || 550;
    const { amountBs, distribution } = valeTotals(valeModal, rate);
    if (amountBs <= 0) {
      showToast("Ingresa un monto válido para el vale", "warning");
      return;
    }
    
    const unavailableAccount = distribution.find(item => item.amount > Math.max(0, Number(accountBalances?.[item.key]) || 0) + .001);
    if (unavailableAccount) {
      showToast(`El monto supera el saldo disponible en ${unavailableAccount.name}`, "warning");
      return;
    }

    try {
      setLoading(true);
      const amountUsd = amountBs / rate;
      const chosenMethod = valeModal.paymentMethod || 'Efectivo ($)';
      
      const newTx = {
        description: `ADELANTO VALE - Odontólogo: ${valeModal.staff.name} (${chosenMethod})`,
        amount: amountUsd,
        type: 'expense',
        category: 'Vales Odontologos',
        currency: 'USD',
        exchange_rate: rates?.usd || 550,
        metadata: {
          staffId: valeModal.staff.id,
          amountBs: amountBs,
          isVale: true,
          paymentMethod: chosenMethod,
          paymentDistribution: distribution.map(item => ({ method: item.name, amount: item.amount, amountBs: item.amount * (item.currency === 'USD' ? rate : 1), currency: item.currency })),
          note: valeModal.note?.trim() || ''
        }
      };
      
      await dataService.addTransaction(newTx);


      const staffName = valeModal.staff?.name || 'personal';
      showToast(`Vale de ${amountBs} Bs registrado con éxito para ${staffName} en ${chosenMethod}`, 'success');
      setValeModal(prev => ({ ...prev, isOpen: false }));
      fetchTransactions();
    } catch (err) {
      console.error(err);
      showToast("Error al registrar vale", "error");
    } finally {
      setLoading(false);
    }
  };

  // Pago de sueldo para personal de apoyo (editor, marketing…): no acumula saldo, solo se
  // registra cuánto se le pagó. Crea un egreso 'Pago Nómina' que descuenta de la cuenta
  // elegida y aparece en el Historial de Pagos de Nómina.
  const handleRegisterSalary = async () => {
    const rate = rates?.usd || 550;
    const amountBs = Number(String(salaryModal.amountBs).replace(',', '.')) || 0;
    if (amountBs <= 0) {
      showToast('Ingresa un monto válido para el pago', 'warning');
      return;
    }
    try {
      setLoading(true);
      const amountUsd = amountBs / rate;
      const chosenMethod = salaryModal.paymentMethod || 'Efectivo ($)';
      const newTx = {
        description: `PAGO NÓMINA - ${salaryModal.staff.name} (${chosenMethod})`,
        amount: amountUsd,
        type: 'expense',
        category: 'Pago Nómina',
        currency: 'USD',
        exchange_rate: rate,
        metadata: {
          staffId: salaryModal.staff.id,
          amountBs,
          paymentMethod: chosenMethod,
          isFixedSalary: true,
          note: salaryModal.note?.trim() || '',
          type: 'finance_payroll'
        }
      };
      await dataService.addTransaction(newTx);
      showToast(`Pago de ${formatCurrency(amountBs, '')} Bs registrado para ${salaryModal.staff.name}`, 'success');
      setSalaryModal({ isOpen: false, staff: null, amountBs: '', paymentMethod: 'Efectivo ($)', note: '' });
      fetchTransactions();
    } catch (err) {
      console.error(err);
      showToast('Error al registrar el pago', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Configurar el salario mensual del personal de apoyo (se guarda en staff.monthly_salary).
  const handleSaveSalaryConfig = async () => {
    const amountUsd = Number(String(salaryConfigModal.amountUsd).replace(',', '.')) || 0;
    if (amountUsd < 0) {
      showToast('Ingresa un monto válido', 'warning');
      return;
    }
    try {
      setLoading(true);
      await dataService.updateStaff(salaryConfigModal.staff.id, { monthly_salary: amountUsd });
      setSalaryOverrides(prev => ({ ...prev, [salaryConfigModal.staff.id]: amountUsd }));
      showToast(`Salario mensual de ${salaryConfigModal.staff.name}: $${formatCurrency(amountUsd, '')}`, 'success');
      setSalaryConfigModal({ isOpen: false, staff: null, amountUsd: '' });
    } catch (err) {
      console.error(err);
      showToast('Error al guardar el salario', 'error');
    } finally {
      setLoading(false);
    }
  };

  const eligibleBarbers = staff.filter(s => {
    const role = s.role?.toLowerCase() || '';
    return (role.includes('barbero') || role.includes('barber')) && !role.includes('archived') && !role.includes('admin');
  });

  const handleWeeklyTotalChange = (val) => {
    const numVal = Number(val) || 0;
    const count = eligibleBarbers.length || 1;
    const equalShare = Number((numVal / count).toFixed(2));
    
    const newSplits = {};
    eligibleBarbers.forEach(s => {
      newSplits[s.id] = equalShare;
    });
    
    setAssistantConfig({
      weeklyVacaUsd: numVal,
      splits: newSplits
    });
  };

  const handleBarberSplitChange = (staffId, val) => {
    const numVal = Number(val) || 0;
    const newSplits = {
      ...(assistantConfig?.splits || {}),
      [staffId]: numVal
    };
    
    const newTotal = Number(Object.values(newSplits).reduce((sum, v) => sum + (v || 0), 0).toFixed(2));
    
    setAssistantConfig({
      weeklyVacaUsd: newTotal,
      splits: newSplits
    });
  };

  useEffect(() => {
    fetchTransactions();
    // Cargar inventario al inicio: la deuda al proveedor (costo de productos vendidos)
    // lo necesita. Antes solo se cargaba al abrir "Consumo", así que la deuda salía en 0.
    dataService.getSellableInventory().then(setSellableInventory).catch(() => {});
  }, []);

  const handleSaveAssistantConfig = (e) => {
    e.preventDefault();
    localStorage.setItem('panda_assistant_config', JSON.stringify(assistantConfig));
    setIsConfiguringPayroll(false);
    showToast('Configuración de Asistente guardada', 'success');
  };

  const openPayrollSettlement = async (staffMember, isAbono = false) => {
    if (settlementLoadingId) return; // evita apilar cargas si se hace clic varias veces
    try {
      setSettlementLoadingId(staffMember.id);
      const earnings = await dataService.getStaffSettlement(staffMember.id);
      const target = isAbono ? Math.round(earnings.balanceBs / 2) : Math.max(0, earnings.balanceBs);
      let remaining = target;
      const allocations = emptyAllocations();
      SETTLEMENT_ACCOUNTS.forEach(account => {
        const available = Math.max(0, Number(earnings.accountBalances?.[account] || 0));
        const amount = Math.min(remaining, available);
        if (amount > 0) allocations[account] = Number(amount.toFixed(2));
        remaining -= amount;
      });
      setPayrollModal({ isOpen: true, staff: staffMember, earnedBs: earnings.balanceBs, deductionBs: 0, paymentAmountBs: target, isAbono, file: null, paymentMethod: 'Distribuido', earnings, allocations });
    } catch (error) {
      console.error(error);
      showToast('No se pudo cargar el cierre de nómina', 'error');
    } finally {
      setSettlementLoadingId(null);
    }
  };

  const handleProcessPayroll = async () => {
    try {
      setLoading(true);
      const paymentDistribution = SETTLEMENT_ACCOUNTS.map(method => ({ method, amountBs: Number(payrollModal.allocations?.[method] || 0) })).filter(item => item.amountBs > 0);
      const finalAmountBs = paymentDistribution.reduce((sum, item) => sum + item.amountBs, 0);
      const pendingBs = Number(payrollModal.earnings?.balanceBs || payrollModal.earnedBs || 0);
      if (finalAmountBs <= 0 || finalAmountBs > pendingBs + 0.01) {
        showToast('Revisa la distribución del pago', 'warning');
        return;
      }
      if (paymentDistribution.some(item => item.amountBs > Number(payrollModal.earnings?.accountBalances?.[item.method] || 0) + 0.01)) {
        showToast('Uno de los montos supera el saldo disponible de la cuenta', 'warning');
        return;
      }
      const amountUsd = finalAmountBs / (rates?.usd || 550); 
      const isPartial = finalAmountBs < pendingBs - 0.01;
      const chosenMethod = paymentDistribution.length === 1 ? paymentDistribution[0].method : 'Pago distribuido';
      
      const newTx = {
        description: `Pago Nómina: ${payrollModal.staff.name}${isPartial ? ' (Abono)' : ''} [${chosenMethod}]`,
        amount: amountUsd,
        type: 'expense',
        category: 'Pago Nómina',
        currency: 'USD',
        exchange_rate: rates?.usd || 550,
        metadata: {
          staffId: payrollModal.staff.id,
          amountBs: finalAmountBs,
          deductionBs: 0,
          isAbono: isPartial,
          voucherImage: payrollModal.file,
          paymentMethod: chosenMethod,
          paymentDistribution,
          balanceBeforeBs: pendingBs,
          balanceAfterBs: Math.max(0, pendingBs - finalAmountBs),
          cashAssignedUsd: payrollModal.earnings?.cashAssignedUsd || 0,
          cashAssignedVesBs: payrollModal.earnings?.cashAssignedVesBs || 0,
          type: 'finance_payroll'
        }
      };
      
      await dataService.addTransaction(newTx);
      showToast(isPartial ? 'Abono de nómina registrado' : 'Pago total de nómina registrado', 'success');
      setPayrollModal(prev => ({ ...prev, isOpen: false }));
      fetchTransactions();
    } catch(err) {
      console.error(err);
      showToast('Error al pagar', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTransaction = async (transaction) => {
    setDialog({
      isOpen: true,
      type: 'confirm',
      title: 'Eliminar transacción',
      message: `¿Eliminar permanentemente esta transacción de ${transaction.metadata?.clientName || 'este cliente'}? Esto también eliminará la cita asociada. Esta acción no se puede deshacer.`,
      confirmText: 'Eliminar',
      onConfirm: async () => {
        try {
          await dataService.deleteTransaction(transaction.id, transaction.metadata || {});
          setDialog(prev => ({ ...prev, isOpen: false }));
          showToast('Transacción eliminada correctamente', 'success');
          fetchTransactions();
        } catch (err) {
          console.error('Error deleting transaction:', err);
          showToast('Error al eliminar la transacción', 'error');
        }
      }
    });
  };

  const handleSaveEditTransaction = async (transactionId, updates) => {
    try {
      const tx = transactions.find(t => t.id === transactionId);
      if (!tx) throw new Error('Transaction not found');

      const oldMeta = tx.metadata || {};
      const meta = { ...oldMeta, ...updates };
      const rate = Number(tx.exchange_rate || rates?.usd || 550);

      let newAmount = Number(tx.amount || 0);
      let appointmentPatches = [];
      // Comisión de servicio por cita, para reconstruir appointment_staff con el mapeo
      // correcto (cada barbero bajo su propia cita), igual que hace el checkout.
      let perAppServiceComm = [];
      let editAppIds = [];

      if (updates._recalculate) {
        // El monto (amount) está en USD. El lavado NO es un cargo (es reparto de comisión):
        // totalUsd = servicios + productos + extras + propinas − cupón. Se preservan las
        // "propinas/descuentos" (todo lo que no editamos) por diferencia.
        const sumExtrasUsd = (arr) => (arr || []).reduce((s, e) => s + (Number(e.price) || 0), 0);
        const sumProductsUsd = (arr) => (arr || []).reduce((s, p) => s + (Number(p.price) || 0) * (Number(p.quantity) || 1), 0);

        // Una transacción puede tener varias citas enlazadas (pago grupal), cada una con su
        // propio servicio y barbero. oldServices/newServices son listas paralelas por índice.
        const oldServices = (Array.isArray(oldMeta.appointments) && oldMeta.appointments.length > 0)
          ? oldMeta.appointments.map(a => ({ appointmentId: a.id || null, staffId: a.staff_id || '', servicePrice: Number(a.servicePrice || 0) }))
          : [{ appointmentId: (oldMeta.appointment_ids && oldMeta.appointment_ids[0]) || oldMeta.appointment_id || null, staffId: oldMeta.barberId || '', servicePrice: Number(oldMeta.servicePrice || 0) }];
        const newServices = Array.isArray(updates.services) && updates.services.length > 0 ? updates.services : oldServices;

        const oldServicesTotal = oldServices.reduce((s, r) => s + r.servicePrice, 0);
        // La propina se maneja explícitamente: se saca del "otro" (para no doble contar) y
        // se vuelve a sumar la editada. Así se puede agregar/editar la propina desde aquí.
        const oldTipTotal = (oldMeta.staffInvolved || []).reduce((s, x) => s + Number(x.tip || 0), 0);
        const newPropina = Number(updates.propina) || 0;
        const otherUsd = Math.max(0, Number(tx.amount || 0) - oldServicesTotal - sumExtrasUsd(oldMeta.extras) - sumProductsUsd(oldMeta.products_sold) - oldTipTotal);
        const newServicesTotal = newServices.reduce((s, r) => s + (Number(r.servicePrice) || 0), 0);
        const newExtras = sumExtrasUsd(meta.extras);
        const newProducts = sumProductsUsd(meta.products_sold);

        if (updates.manualAmountBs != null && !isNaN(Number(updates.manualAmountBs))) {
          newAmount = Number(updates.manualAmountBs) / rate; // override manual en Bs → USD
        } else {
          newAmount = Math.max(0, newServicesTotal + newExtras + newProducts + otherUsd + newPropina);
        }

        // ---- Recálculo de comisiones (staffInvolved) DESDE CERO (idempotente) ----
        // Recomputamos la comisión de SERVICIO + LAVADO + EXTRAS de cero, y PRESERVAMOS
        // productCommission y propinas (viven en campos aparte, no editables aquí). Hacerlo
        // desde cero (no por delta) evita doble conteo al editar la misma tx dos veces y
        // permite re-rutear correctamente. Regla clave: los extras de LAVADO son de la
        // asistente al 60% (como los lavados incluidos), NO del barbero. Ver checkout.
        const WASH_SHARE = 0.6;
        const pctOf = (id) => { const s = (staff || []).find(x => String(x.id) === String(id)); return s?.commission_pct != null ? Number(s.commission_pct) : 60; };
        const nameOf = (id) => { const s = (staff || []).find(x => String(x.id) === String(id)); return s?.name || ''; };
        const isAssistantRole = (role) => { const r = (role || '').toLowerCase(); return r.includes('asist') || r.includes('lavado'); };
        const isWashExtra = (ex) => (ex?.service_extras?.name || ex?.name || '').toLowerCase().includes('lavado');
        const assistants = (staff || []).filter(s => isAssistantRole(s.role) && s.active !== false);
        const soleAssistantId = assistants.length === 1 ? assistants[0].id : '';

        const newWashCount = meta.didWash ? Number(meta.washCount || 0) : 0;
        const newWashRate = Number(meta.washRate || 0);
        // El lavado incluido se resta de la base del primer servicio (concepto global de la cita).
        const newWashDeduct = newWashCount * newWashRate;

        // Preservamos SOLO productos; commission y propina se reconstruyen (propina abajo).
        const inv = (oldMeta.staffInvolved || []).map(s => ({ ...s, commissionEarned: 0, commissionBs: 0, tip: 0, tipBs: 0 }));
        const touch = (id) => {
          if (!id) return null;
          let e = inv.find(x => String(x.staffId) === String(id));
          if (!e) { e = { staffId: id, name: nameOf(id), role: '', commissionEarned: 0, commissionBs: 0, productCommissionEarned: 0, productCommissionBs: 0, tip: 0, tipBs: 0 }; inv.push(e); }
          return e;
        };
        const applyComm = (entry) => { if (entry) entry.commissionBs = Number(entry.commissionEarned || 0) * rate; };

        // 1) Comisión de servicio por cita (base neta − lavado en la 1ª) × % del barbero
        for (let i = 0; i < newServices.length; i++) {
          const row = newServices[i];
          const base = Math.max(0, (Number(row.servicePrice) || 0) - (i === 0 ? newWashDeduct : 0));
          const comm = base * (pctOf(row.staffId) / 100);
          if (row.staffId && comm > 0) {
            const e = touch(row.staffId);
            if (e) { e.commissionEarned = Number(e.commissionEarned || 0) + comm; applyComm(e); }
            if (row.appointmentId) perAppServiceComm.push({ appointmentId: row.appointmentId, staffId: row.staffId, comm });
          }
        }

        // 2) Lavado incluido → asistente al 60%
        const newWasherId = meta.didWash ? (updates.washerId || soleAssistantId || '') : '';
        if (newWasherId && newWashDeduct > 0) {
          const e = touch(newWasherId);
          if (e) { e.commissionEarned = Number(e.commissionEarned || 0) + newWashDeduct * WASH_SHARE; applyComm(e); if (!e.role) e.role = 'Asistente de lavado'; }
        }

        // 3) Extras: los de LAVADO → asistente al 60%; los demás → barbero primario a su %
        const primaryBarberId = (newServices[0] && newServices[0].staffId) || '';
        const fallbackAssistantId = updates.washerId || newWasherId || soleAssistantId || (oldMeta.staffInvolved || []).find(s => isAssistantRole(s.role))?.staffId || '';
        (meta.extras || []).forEach(ex => {
          const price = Number(ex.price) || 0;
          if (price <= 0) return;
          if (isWashExtra(ex)) {
            if (!fallbackAssistantId) return;
            const e = touch(fallbackAssistantId);
            if (e) { e.commissionEarned = Number(e.commissionEarned || 0) + price * WASH_SHARE; applyComm(e); if (!e.role) e.role = 'Asistente de lavado'; }
          } else if (primaryBarberId) {
            const e = touch(primaryBarberId);
            if (e) { e.commissionEarned = Number(e.commissionEarned || 0) + price * (pctOf(primaryBarberId) / 100); applyComm(e); }
          }
        });

        // Propina editada → al barbero elegido (completa, 100% para él).
        if (newPropina > 0 && updates.propinaStaffId) {
          const e = touch(updates.propinaStaffId);
          if (e) { e.tip = newPropina; e.tipBs = newPropina * rate; }
        }

        // Quitar entradas que quedaron completamente en cero (revisando USD y Bs)
        meta.staffInvolved = inv.filter(s => ['commissionEarned', 'commissionBs', 'productCommissionEarned', 'productCommissionBs', 'tip', 'tipBs'].some(k => Number(s[k] || 0) > 0.001));

        // Campos de servicio en el metadata + patch de las citas subyacentes
        meta.serviceName = newServices.map(r => r.serviceName).filter(Boolean).join(' + ') || oldMeta.serviceName;
        meta.appointments = newServices.map((r, i) => ({
          ...((oldMeta.appointments && oldMeta.appointments[i]) || {}),
          id: r.appointmentId || (oldMeta.appointments && oldMeta.appointments[i]?.id) || null,
          staff_id: r.staffId || '',
          staffName: nameOf(r.staffId) || (oldMeta.appointments && oldMeta.appointments[i]?.staffName) || '',
          serviceName: r.serviceName,
          servicePrice: Number(r.servicePrice) || 0
        }));

        appointmentPatches = newServices
          .map(r => r.appointmentId
            ? { id: r.appointmentId, staff_id: r.staffId || null, total_price: Number(r.servicePrice) || 0, ...(r.serviceId ? { service_id: r.serviceId } : {}) }
            : null)
          .filter(Boolean);

        // Todas las citas involucradas (nuevas + las que ya tenía la transacción), para
        // limpiar appointment_staff en todas antes de reconstruir el desglose por-cita.
        editAppIds = Array.from(new Set([
          ...newServices.map(r => r.appointmentId),
          ...(oldMeta.appointments || []).map(a => a.id),
          ...(oldMeta.appointment_ids || []),
          oldMeta.appointment_id
        ].filter(Boolean).map(String)));
      }

      if (updates._removeExtraIndex !== undefined) {
        const extras = [...(meta.extras || [])];
        extras.splice(updates._removeExtraIndex, 1);
        meta.extras = extras;
        delete updates._removeExtraIndex;
      }

      if (updates._removeProductIndex !== undefined) {
        const prods = [...(meta.products_sold || [])];
        prods.splice(updates._removeProductIndex, 1);
        meta.products_sold = prods;
        delete updates._removeProductIndex;
      }

      // Quitar claves transitorias que no deben persistir en el metadata
      ['_recalculate', '_services', 'services', 'manualAmountBs', 'serviceId', '_removeExtraIndex', '_removeProductIndex', 'propina', 'propinaStaffId'].forEach(k => delete meta[k]);

      await dataService.updateTransaction(transactionId, meta, newAmount);

      // Actualizar las citas subyacentes (barbero / servicio / precio) para que el panel del
      // barbero refleje la edición. No es crítico: si falla, la transacción ya quedó guardada.
      for (const { id, ...patch } of appointmentPatches) {
        try {
          await dataService.updateAppointment(id, patch);
        } catch (e) {
          console.warn('No se pudo actualizar la cita asociada:', e);
        }
      }

      // Reconstruir appointment_staff por-cita: cada barbero queda bajo la cita que él
      // hizo (usando perAppServiceComm), para que su panel muestre solo SU comisión —
      // igual que ahora hace el checkout. Los conceptos que no son de servicio (extras,
      // lavado, productos, propinas) se atan a una cita que la persona posea, o a la
      // principal si no posee ninguna (caso de la asistente de lavado).
      if (editAppIds.length && meta.staffInvolved) {
        try {
          await supabase.from('appointment_staff').delete().in('appointment_id', editAppIds);

          const primaryEditAppId = (meta.appointments && meta.appointments[0]?.id) || editAppIds[0] || null;
          const ownedAppId = (staffId) => (meta.appointments || []).find(a => String(a.staff_id) === String(staffId))?.id || primaryEditAppId;

          const rowMap = {};
          const getRow = (appointmentId, staffId) => {
            if (!appointmentId || !staffId) return null;
            const k = `${appointmentId}|${staffId}`;
            if (!rowMap[k]) rowMap[k] = { appointment_id: appointmentId, staff_id: staffId, commission_earned: 0, product_commission: 0, tip_amount: 0 };
            return rowMap[k];
          };

          // Comisión de servicio por cita
          perAppServiceComm.forEach(({ appointmentId, staffId, comm }) => {
            const r = getRow(appointmentId, staffId);
            if (r) r.commission_earned += comm;
          });

          // Por persona: lo que no es servicio (extras/lavado = commissionEarned − servicio
          // ya contado) + comisión de productos + propinas, atado a su cita (o la principal).
          (meta.staffInvolved || []).forEach(s => {
            const summedService = perAppServiceComm
              .filter(x => String(x.staffId) === String(s.staffId))
              .reduce((a, x) => a + x.comm, 0);
            const remainderComm = Math.max(0, Number(s.commissionEarned || 0) - summedService);
            const r = getRow(ownedAppId(s.staffId), s.staffId);
            if (r) {
              r.commission_earned += remainderComm;
              r.product_commission += Number(s.productCommissionEarned || 0);
              r.tip_amount += Number(s.tip || 0);
            }
          });

          const staffRecords = Object.values(rowMap).filter(r =>
            r.commission_earned > 0.001 || r.product_commission > 0.001 || r.tip_amount > 0.001
          );
          if (staffRecords.length > 0) {
            await supabase.from('appointment_staff').insert(staffRecords);
          }
        } catch (e) {
          console.warn('No se pudo sincronizar appointment_staff:', e);
        }
      }

      showToast('Transacción actualizada', 'success');
      closeEditTransactionModal();
      fetchTransactions();
    } catch (err) {
      console.error('Error updating transaction:', err);
      showToast('Error al actualizar la transacción', 'error');
    }
  };

  // Guardar edición de un EGRESO (vale, consumo, pago de nómina, gasto manual).
  const handleSaveEditExpense = async (transactionId, updates) => {
    try {
      const tx = transactions.find(t => t.id === transactionId);
      if (!tx) throw new Error('Transaction not found');
      const rate = Number(tx.exchange_rate || rates?.usd || 550);
      const amountBs = Number(updates.amountBs) || 0;
      const amountUsd = rate > 0 ? amountBs / rate : 0;

      const meta = {
        ...(tx.metadata || {}),
        amountBs,
        staffId: updates.staffId || (tx.metadata?.staffId || ''),
        paymentMethod: updates.paymentMethod || '',
        paymentReference: updates.paymentReference || '',
        note: updates.note || ''
      };
      // Si el egreso tenía un reparto por método (paymentDistribution) y cambió el monto o
      // método, ese reparto viejo deja de ser válido: lo colapsamos al método elegido.
      if (Array.isArray(meta.paymentDistribution)) {
        meta.paymentDistribution = [{ method: updates.paymentMethod || 'Efectivo ($)', amount: amountUsd, amountBs, currency: 'BS' }];
      }

      // Reconstruir la descripción para vales/nómina para que refleje persona + método.
      let description = updates.description || tx.description || '';
      const staffName = updates.staffName || (staff.find(s => String(s.id) === String(meta.staffId))?.name) || 'Personal';
      if (tx.category === 'Vales Odontologos') {
        description = `ADELANTO VALE - Odontólogo: ${staffName} (${updates.paymentMethod || 'Efectivo ($)'})`;
      } else if (tx.category === 'Pago Nómina') {
        description = `PAGO NÓMINA - ${staffName} (${updates.paymentMethod || 'Efectivo ($)'})`;
      } else if (tx.category === 'Consumo Personal') {
        description = `CONSUMO PERSONAL - ${staffName}`;
      }

      await dataService.updateTransaction(transactionId, meta, amountUsd, description);

      showToast('Egreso actualizado', 'success');
      closeEditTransactionModal();
      fetchTransactions();
    } catch (err) {
      console.error('Error updating expense:', err);
      showToast('Error al actualizar el egreso', 'error');
    }
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Compress slightly by drawing to canvas
      const reader = new FileReader();
      reader.onloadend = () => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 800;
          const scaleSize = MAX_WIDTH / img.width;
          canvas.width = MAX_WIDTH;
          canvas.height = img.height * scaleSize;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          const compressedBase64 = canvas.toDataURL('image/jpeg', 0.6);
          setPayrollModal(prev => ({ ...prev, file: compressedBase64 }));
        };
        img.src = reader.result;
      };
      reader.readAsDataURL(file);
    }
  };

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      const data = await dataService.getTransactions();
      setTransactions(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleManualTransaction = (type) => {
    setManualTransaction({ isOpen: true, type });
  };

  const handleExport = () => {
    try {
      const headers = ['ID', 'Fecha', 'Descripción', 'Tipo', 'Monto', 'Categoría'];
      const rows = filteredTransactions.map(t => [
        t.id, 
        new Date(t.created_at).toLocaleString('es-VE', { hour12: true }), 
        t.description, 
        t.type, 
        t.amount, 
        t.category
      ]);
      
      let csvContent = "data:text/csv;charset=utf-8," 
        + headers.join(",") + "\n"
        + rows.map(e => e.join(",")).join("\n");
        
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `finanzas_dientes_sanos_${new Date().toLocaleDateString()}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      showToast('Reporte exportado con éxito.');
    } catch (e) {
      showToast('Error al exportar reporte.', 'error');
    }
  };

  const handleImportHistory = () => {
    showToast("Función de importación de Excel en preparación...", "info");
    // This will trigger a script in the future to read the provided Excel files
  };

  const parseTxExcel = (t) => {
    const meta = t.metadata || {};
    const desc = t.description || "";
    
    let clientName = meta.clientName || desc.split(' - Cliente: ')[1]?.split(' - ')[0] || "S/N";
    let serviceName = meta.serviceName || desc.split(' - Servi: ')[1] || (t.category === 'Ventas Panda' || t.category === 'Ventas Pro' ? "Servicio" : t.description);
    let barbero = meta.staffInvolved?.find(s => s.role?.includes('Barbero'))?.name ||
                  meta.pendingStaffInvolved?.find(s => s.role?.includes('Barbero'))?.name ||
                  meta.serviceStaff?.find(s => s.role?.includes('Barbero'))?.name ||
                  meta.serviceStaff?.[0]?.name ||
                  meta.staffInvolved?.[0]?.name ||
                  "N/A";
    
    const isPendingReceivable = t.category === 'Cuentas por Cobrar' && meta.receivableStatus !== 'paid';
    let paymentMethod = isPendingReceivable ? 'Fiado / Por cobrar' : (meta.paymentMethod || "Efectivo ($)");
    if (!meta.paymentMethod && !isPendingReceivable) {
      const transferAmount = Number(meta.transfer_bs || meta.transferBs || 0);
      const isMixed = meta.mixed_payment || meta.isMixed;
      const usdMethod = meta.method_usd || 'Efectivo';
      const bsMethod = meta.method_bs || 'Pago Móvil / Transferencia';
      
      if (transferAmount > 0) {
        paymentMethod = isMixed ? `Mixto (${usdMethod} + ${bsMethod})` : bsMethod;
      } else if (isMixed) {
        paymentMethod = "Mixto ($ + Bs)";
      } else if (meta.method_usd) {
        paymentMethod = meta.method_usd;
      }
    }
    const paymentReference = meta.paymentReferenceBs || meta.payment_reference_bs || meta.paymentReference || meta.reference_number || meta.reference || meta.transfer_ref || meta.transferRef || meta.ref || '';
    
    // Lavado: check if any staff member is involved with washing logic or if it's in meta
    let didWash = meta.didWash ? 'Si' : 'No';
    if (didWash === 'No' && meta.staffInvolved?.some(s => s.role?.includes('Asistente de Lavado'))) {
      didWash = 'Si';
    }

    return { clientName, serviceName, barbero, paymentMethod, paymentReference, didWash };
  };

  const formatCurrency = (amount, currencySymbol = '$') => {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  const isHistoricalImport = (transaction) => transaction?.metadata?.importedHistorical === true;

  const getDeduplicationKey = (t) => {
    if (!t) return '';
    const meta = t.metadata || {};
    const desc = (t.description || '').toLowerCase();
    const { clientName, barbero, paymentReference } = parseTxExcel(t);

    const normClient = (clientName || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    const amountVal = Number(t.amount || 0).toFixed(2);
    const dateDay = t.created_at ? new Date(t.created_at).toISOString().split('T')[0] : '';

    // 1. If client name is known (e.g. "Daniel García"), deduplicate ALL entries for this client on this day with this amount
    if (normClient && normClient !== 'sn' && normClient !== 'cliente') {
      return `client_${dateDay}_${normClient}_${amountVal}`;
    }

    // 2. Reference extraction from metadata or description
    let ref = String(paymentReference || '').trim();
    if (!ref) {
      const match = desc.match(/ref[.:\s]*([0-9a-z]+)/i);
      if (match) ref = match[1];
    }

    if (ref && ref.length > 1 && ref !== '0' && ref !== '0000') {
      return `ref_${dateDay}_${ref}_${amountVal}`;
    }

    // 3. Appointment IDs
    const rawAppIds = [
      meta.appointment_id,
      ...(Array.isArray(meta.appointmentIds) ? meta.appointmentIds : (meta.appointmentIds ? [meta.appointmentIds] : []))
    ].filter(Boolean);

    if (rawAppIds.length > 0) {
      return `app_${rawAppIds.map(String).sort().join('_')}`;
    }

    const dateMinuteStr = t.created_at ? new Date(t.created_at).toISOString().substring(0, 16) : '';
    return `tx_${normClient}_${barbero.toLowerCase().replace(/[^a-z0-9]/g, '')}_${amountVal}_${dateMinuteStr}`;
  };

  const operationalTransactions = useMemo(
    () => {
      const seenIds = new Set();
      const seenKeys = new Set();
      return transactions.filter(t => {
        if (!t?.id || seenIds.has(t.id)) return false;
        const key = getDeduplicationKey(t);
        if (key && seenKeys.has(key)) return false;
        seenIds.add(t.id);
        if (key) seenKeys.add(key);
        return !isHistoricalImport(t);
      });
    },
    [transactions]
  );

  // 'Conversión' es una transferencia interna entre cuentas (Bs↔USD), no un gasto ni un
  // ingreso: no debe afectar facturado ni la ganancia, solo mover el saldo entre cuentas.
  const isCashExpense = transaction => transaction.type === 'expense' && transaction.category !== 'Consumo Personal' && transaction.category !== 'Conversión' && transaction.category !== 'Pago Proveedor';
  const { totalIncome, totalExpense, balance, receivableTransactions, totalReceivableUsd, totalReceivableBs } = useMemo(() => {
    const totalIncome = operationalTransactions.reduce((acc, t) => (t.type === 'income' && t.category !== 'Conversión') ? acc + t.amount : acc, 0);
    const totalExpense = operationalTransactions.reduce((acc, t) => isCashExpense(t) ? acc + t.amount : acc, 0);
    const balance = totalIncome - totalExpense;
    const receivableTransactions = operationalTransactions.filter(transaction =>
      transaction.category === 'Cuentas por Cobrar' && transaction.metadata?.receivableStatus !== 'paid'
    );
    const totalReceivableUsd = receivableTransactions.reduce((sum, transaction) => sum + Number(transaction.metadata?.nominalTotalUsd || 0), 0);
    const totalReceivableBs = receivableTransactions.reduce((sum, transaction) => sum + (Number(transaction.metadata?.nominalTotalUsd || 0) * Number(transaction.exchange_rate || rates?.usd || 1)), 0);
    return { totalIncome, totalExpense, balance, receivableTransactions, totalReceivableUsd, totalReceivableBs };
  }, [operationalTransactions]);

  const accountBalances = useMemo(() => {
    const balances = {
      cash_usd: 0,
      zelle: 0,
      binance: 0,
      zinli: 0,
      pago_movil: 0,
      cash_bs: 0,
      punto_venta: 0,
      transferencia: 0
    };

    operationalTransactions.forEach(t => {
      const isIncome = t.type === 'income';
      const isExpense = isCashExpense(t);
      const meta = t.metadata || {};

      // Conversión: saca dinero de una cuenta y lo mete en otra (Bs↔USD). No es ingreso
      // ni gasto — solo reubica el saldo entre cuentas.
      if (meta.conversion) {
        if (meta.fromAccount && balances[meta.fromAccount] !== undefined) balances[meta.fromAccount] -= Number(meta.fromAmount || 0);
        if (meta.toAccount && balances[meta.toAccount] !== undefined) balances[meta.toAccount] += Number(meta.toAmount || 0);
        return;
      }

      // Pago al proveedor: sale dinero de la cuenta elegida (reduce el saldo) pero NO es
      // gasto operativo — solo salda la deuda de costo ya contabilizada en el margen.
      if (t.category === 'Pago Proveedor') {
        if (meta.providerAccount && balances[meta.providerAccount] !== undefined) balances[meta.providerAccount] -= Number(meta.providerAmount || 0);
        return;
      }

      if (isIncome) {
        if (meta.mixed_payment) {
          const usdMethod = (meta.method_usd || 'Efectivo').toLowerCase();
          const bsMethod = (meta.method_bs || 'Pago Móvil').toLowerCase();
          const usdVal = Number(meta.cash_usd || 0);
          const bsVal = Number(meta.transfer_bs || 0);

          if (usdMethod.includes('zelle')) balances.zelle += usdVal;
          else if (usdMethod.includes('binance') || usdMethod.includes('usdt')) balances.binance += usdVal;
          else if (usdMethod.includes('zinli')) balances.zinli += usdVal;
          else balances.cash_usd += usdVal;

          if (bsMethod.includes('pago') || bsMethod.includes('móvil') || bsMethod.includes('movil')) balances.pago_movil += bsVal;
          else if (bsMethod.includes('efectivo')) balances.cash_bs += bsVal;
          else if (bsMethod.includes('punto')) balances.punto_venta += bsVal;
          else balances.transferencia += bsVal;
        } else {
          const bsValStored = Number(meta.transfer_bs || meta.transferBs || 0);
          if (bsValStored <= 0) {
            const usdMethod = (meta.method_usd || 'Efectivo').toLowerCase();
            const usdVal = Number(t.amount || 0);

            if (usdMethod.includes('zelle')) balances.zelle += usdVal;
            else if (usdMethod.includes('binance') || usdMethod.includes('usdt')) balances.binance += usdVal;
            else if (usdMethod.includes('zinli')) balances.zinli += usdVal;
            else balances.cash_usd += usdVal;
          } else {
            const bsMethod = (meta.method_bs || 'Pago Móvil').toLowerCase();
            const bsVal = bsValStored;

            if (bsMethod.includes('pago') || bsMethod.includes('móvil') || bsMethod.includes('movil')) balances.pago_movil += bsVal;
            else if (bsMethod.includes('efectivo')) balances.cash_bs += bsVal;
            else if (bsMethod.includes('punto')) balances.punto_venta += bsVal;
            else balances.transferencia += bsVal;
          }
        }
      } else if (isExpense) {
        const method = (meta.paymentMethod || 'Efectivo ($)').toLowerCase();
        const usdVal = Number(t.amount || 0);
        const rate = Number(t.exchange_rate || rates?.usd || 550);
        const bsVal = Number(meta.amountBs || usdVal * rate);

        if (Array.isArray(meta.paymentDistribution) && meta.paymentDistribution.length > 0) {
          meta.paymentDistribution.forEach(part => {
            const partMethod = String(part.method || '').toLowerCase();
            const nativeAmount = Number(part.amount || 0);
            if (partMethod.includes('zelle')) balances.zelle -= nativeAmount;
            else if (partMethod.includes('binance') || partMethod.includes('usdt')) balances.binance -= nativeAmount;
            else if (partMethod.includes('zinli')) balances.zinli -= nativeAmount;
            else if (partMethod.includes('efectivo ($)') || partMethod.includes('$')) balances.cash_usd -= nativeAmount;
            else if (partMethod.includes('pago') || partMethod.includes('móvil') || partMethod.includes('movil')) balances.pago_movil -= nativeAmount;
            else if (partMethod.includes('efectivo (bs)')) balances.cash_bs -= nativeAmount;
            else if (partMethod.includes('punto')) balances.punto_venta -= nativeAmount;
          });
        } else if (method.includes('zelle')) balances.zelle -= usdVal;
        else if (method.includes('binance') || method.includes('usdt')) balances.binance -= usdVal;
        else if (method.includes('zinli')) balances.zinli -= usdVal;
        else if (method.includes('efectivo ($)') || method === 'efectivo' || method.includes('$')) balances.cash_usd -= usdVal;
        else if (method.includes('pago') || method.includes('móvil') || method.includes('movil')) balances.pago_movil -= bsVal;
        else if (method.includes('efectivo (bs)') || method.includes('efectivo (ves)')) balances.cash_bs -= bsVal;
        else if (method.includes('punto')) balances.punto_venta -= bsVal;
        else balances.transferencia -= bsVal;
      }
    });

    return balances;
  }, [operationalTransactions, rates]);

  const handleSubmitManualTransaction = async ({ description, account, amount }) => {
    const rate = Number(rates?.usd || 550);
    const isUsd = account.currency === 'USD';
    const amountUsd = isUsd ? amount : amount / rate;
    const currentBalance = Math.max(0, Number(accountBalances?.[account.key]) || 0);

    if (manualTransaction.type === 'expense' && amount > currentBalance + 0.0001) {
      showToast(`Saldo insuficiente en ${account.label}. Disponible: ${currentBalance.toLocaleString('es-VE', { maximumFractionDigits: 2 })} ${isUsd ? '$' : 'Bs'}`, 'error');
      return;
    }

    const metadata = manualTransaction.type === 'income'
      ? isUsd
        ? { paymentMethod: account.label, method_usd: account.label, cash_usd: amount, manual: true }
        : { paymentMethod: account.label, method_bs: account.label, transfer_bs: amount, amountBs: amount, manual: true }
      : { paymentMethod: account.label, amountBs: isUsd ? amount * rate : amount, manual: true };

    try {
      setLoading(true);
      await dataService.addTransaction({
        description,
        amount: amountUsd,
        type: manualTransaction.type,
        category: manualTransaction.type === 'income' ? 'Ingreso Manual' : 'Gasto Manual',
        currency: 'USD',
        exchange_rate: rate,
        metadata
      });
      await fetchTransactions();
      setManualTransaction(previous => ({ ...previous, isOpen: false }));
      showToast(`${manualTransaction.type === 'income' ? 'Ingreso' : 'Gasto'} registrado correctamente.`);
    } catch (error) {
      console.error(error);
      showToast('Error al registrar la transacción.', 'error');
      setLoading(false);
    }
  };

  // Cuentas disponibles para conversión de divisa (key = clave en accountBalances).
  const CONVERSION_ACCOUNTS = [
    { key: 'cash_usd', label: 'Efectivo ($)', usd: true },
    { key: 'zelle', label: 'Zelle', usd: true },
    { key: 'binance', label: 'Binance / USDT', usd: true },
    { key: 'zinli', label: 'Zinli', usd: true },
    { key: 'pago_movil', label: 'Pago Móvil', usd: false },
    { key: 'cash_bs', label: 'Efectivo (Bs)', usd: false },
    { key: 'punto_venta', label: 'Punto de venta', usd: false },
    { key: 'transferencia', label: 'Transferencia', usd: false },
  ];
  const convAccount = (key) => CONVERSION_ACCOUNTS.find(a => a.key === key);
  // toAmount sugerido a partir de fromAmount + tasa (el usuario puede ajustarlo).
  // Si ambas cuentas son de la MISMA moneda (ej. Punto Bs → Pago Móvil Bs) es una
  // transferencia 1:1, sin tasa. Solo Bs↔USD usa la tasa.
  const conversionSuggestedTo = () => {
    const from = convAccount(conversionModal.fromAccount);
    const to = convAccount(conversionModal.toAccount);
    const rate = Number(conversionModal.rate) || Number(rates?.usd || 550);
    const fromAmt = Number(conversionModal.fromAmount) || 0;
    if (!from || !to || fromAmt <= 0) return 0;
    if (from.usd === to.usd) return fromAmt; // misma moneda → 1:1
    const baseUsd = from.usd ? fromAmt : fromAmt / rate;
    return to.usd ? baseUsd : baseUsd * rate;
  };

  const handleRegisterConversion = async (payload) => {
    const fromKey = payload?.fromAccount || conversionModal.fromAccount;
    const toKey = payload?.toAccount || conversionModal.toAccount;
    const from = convAccount(fromKey);
    const to = convAccount(toKey);
    const rate = Number(payload?.rate ?? conversionModal.rate) || Number(rates?.usd || 550);
    const fromAmount = Number(payload?.fromAmount ?? conversionModal.fromAmount) || 0;
    const toAmount = Number(payload?.toAmount ?? conversionModal.toAmount) || conversionSuggestedTo();
    if (!from || !to) return;
    if (from.key === to.key) { showToast('Elige cuentas distintas.', 'warning'); return; }
    if (fromAmount <= 0 || toAmount <= 0) { showToast('Ingresa los montos.', 'warning'); return; }
    const available = Math.max(0, Number(accountBalances?.[from.key]) || 0);
    if (fromAmount > available + 0.0001) {
      showToast(`Saldo insuficiente en ${from.label}. Disponible: ${available.toLocaleString('es-VE', { maximumFractionDigits: 2 })} ${from.usd ? '$' : 'Bs'}`, 'error');
      return;
    }
    const sameCurrency = from.usd === to.usd;      // misma moneda → transferencia 1:1
    const label = sameCurrency ? 'Transferencia' : 'Conversión';
    const baseUsd = from.usd ? fromAmount : fromAmount / rate;
    try {
      setLoading(true);
      await dataService.addTransaction({
        description: `${label}: ${from.label} → ${to.label}`,
        amount: baseUsd,
        type: 'expense',
        category: 'Conversión',
        currency: 'USD',
        exchange_rate: rate,
        metadata: {
          conversion: true, transfer: sameCurrency,
          fromAccount: from.key, fromAmount, fromLabel: from.label,
          toAccount: to.key, toAmount, toLabel: to.label,
          rate, manual: true
        }
      });
      await fetchTransactions();
      setConversionModal(prev => ({ ...prev, isOpen: false, fromAmount: '', toAmount: '', rate: '' }));
      showToast(`${label} registrada exitosamente.`, 'success');
    } catch (error) {
      console.error(error);
      showToast('Error al registrar el movimiento.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterProviderPayment = async (payload) => {
    const acc = payload?.account || convAccount(providerModal.account);
    const amount = Number(payload?.amount ?? providerModal.amount) || 0;
    const rate = Number(rates?.usd || 550);
    if (!acc) return;
    if (amount <= 0) { showToast('Ingresa el monto a pagar.', 'warning'); return; }
    const available = Math.max(0, Number(accountBalances?.[acc.key]) || 0);
    if (amount > available + 0.0001) {
      showToast(`Saldo insuficiente en ${acc.label}. Disponible: ${available.toLocaleString('es-VE', { maximumFractionDigits: 2 })} ${acc.usd ? '$' : 'Bs'}`, 'error');
      return;
    }
    const amountUsd = payload?.amountUsd ?? (acc.usd ? amount : (rate > 0 ? amount / rate : 0));
    const amountBs = payload?.amountBs ?? (acc.usd ? amount * rate : amount);
    try {
      setLoading(true);
      await dataService.addTransaction({
        description: `Pago a proveedor (${acc.label})`,
        amount: amountUsd,
        type: 'expense',
        category: 'Pago Proveedor',
        currency: 'USD',
        exchange_rate: rate,
        metadata: { providerPayment: true, providerAccount: acc.key, providerAmount: amount, amountBs, paymentMethod: acc.label, manual: true }
      });
      await fetchTransactions();
      setProviderModal(p => ({ ...p, isOpen: false, amount: '' }));
      showToast('Pago a proveedor registrado.', 'success');
    } catch (e) {
      console.error(e);
      showToast('Error al registrar el pago.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const todayOperationalTransactions = useMemo(() => {
    const today = new Date();
    return operationalTransactions.filter(t => new Date(t.created_at).toDateString() === today.toDateString());
  }, [operationalTransactions]);

  const effectiveServiceCommissionUsd = (transaction, involvedMember) => {
    const currentMember = staff.find(item => String(item.id) === String(involvedMember.staffId));
    const role = String(currentMember?.role || involvedMember.role || '').toLowerCase();
    const isAssistantWash = transaction.metadata?.didWash && (role.includes('asistente') || role.includes('lavado') || role.includes('operaciones'));
    if (!isAssistantWash) return Number(involvedMember.commissionEarned || 0);

    const assistantsInTransaction = (transaction.metadata?.staffInvolved || []).filter(member => {
      const catalogMember = staff.find(item => String(item.id) === String(member.staffId));
      return /asistente|lavado|operaciones/i.test(String(catalogMember?.role || member.role || ''));
    }).length || 1;
    const washCount = Math.max(1, Number(transaction.metadata?.washCount || 1));
    const washRate = Number(transaction.metadata?.washRate || currentMember?.washing_rate || 1);
    const assistantShare = Number(transaction.metadata?.washAssistantSharePct || 60) / 100;
    return (washCount * washRate * assistantShare) / assistantsInTransaction;
  };

  const todayIncome = todayOperationalTransactions.reduce((acc, t) => t.type === 'income' ? acc + (t.amount || 0) : acc, 0);
  const todayExpense = todayOperationalTransactions.reduce((acc, t) => isCashExpense(t) ? acc + (t.amount || 0) : acc, 0);

  const cashCloseDateRange = useMemo(
    () => getDateRangeForFilter(cashCloseDate, cashCloseStartDate, cashCloseEndDate),
    [cashCloseDate, cashCloseStartDate, cashCloseEndDate]
  );

  const cashCloseTransactions = useMemo(() => operationalTransactions.filter(t => {
    const txDate = new Date(t.created_at);
    if (cashCloseDateRange.start && txDate < cashCloseDateRange.start) return false;
    if (cashCloseDateRange.end && txDate > cashCloseDateRange.end) return false;
    return true;
  }), [operationalTransactions, cashCloseDateRange]);

  const cashCloseStats = useMemo(() => {
    const cashCloseIncome = cashCloseTransactions.reduce((acc, t) => t.type === 'income' ? acc + (t.amount || 0) : acc, 0);
    const cashCloseExpense = cashCloseTransactions.reduce((acc, t) => isCashExpense(t) ? acc + (t.amount || 0) : acc, 0);
    const cashCloseCashUsd = cashCloseTransactions.reduce((acc, t) => (
      acc + Number(t.metadata?.cash_usd || t.metadata?.cashUsd || 0)
    ), 0);
    const cashClosePagoMovilBs = cashCloseTransactions.reduce((acc, t) => {
      const method = (t.metadata?.method_bs || '').toLowerCase();
      return method.includes('pago') || method.includes('móvil') || method.includes('movil')
        ? acc + Number(t.metadata?.transfer_bs || t.metadata?.transferBs || 0)
        : acc;
    }, 0);
    const cashClosePuntoVentaBs = cashCloseTransactions.reduce((acc, t) => {
      const method = (t.metadata?.method_bs || '').toLowerCase();
      return method.includes('punto')
        ? acc + Number(t.metadata?.transfer_bs || t.metadata?.transferBs || 0)
        : acc;
    }, 0);
    const cashCloseCashBs = cashCloseTransactions.reduce((acc, t) => {
      const method = (t.metadata?.method_bs || '').toLowerCase();
      return method.includes('efectivo')
        ? acc + Number(t.metadata?.transfer_bs || t.metadata?.transferBs || 0)
        : acc;
    }, 0);
    const cashCloseCommissionDebtUsd = cashCloseTransactions.reduce((acc, t) => {
      if (t.type !== 'income') return acc;
      return acc + (t.metadata?.staffInvolved?.reduce((sum, member) => sum + effectiveServiceCommissionUsd(t, member), 0) || 0);
    }, 0);
    const cashCloseNetRealUsd = cashCloseIncome - cashCloseExpense;
    return { cashCloseIncome, cashCloseExpense, cashCloseCashUsd, cashClosePagoMovilBs, cashClosePuntoVentaBs, cashCloseCashBs, cashCloseCommissionDebtUsd, cashCloseNetRealUsd };
  }, [cashCloseTransactions]);

  const { cashCloseIncome, cashCloseExpense, cashCloseCashUsd, cashClosePagoMovilBs, cashClosePuntoVentaBs, cashCloseCashBs, cashCloseCommissionDebtUsd, cashCloseNetRealUsd } = cashCloseStats;

  // Analysis Logic (Excel Replication)
  const analysisData = useMemo(() => {
    const barberStats = {};
    const paymentStats = {};
    const serviceStats = {};

    operationalTransactions.forEach(t => {
      if (t.type !== 'income') return;

      const meta = t.metadata || {};
      const staffInvolved = meta.staffInvolved || [];
      const bsAmount = t.amount * (t.exchange_rate || 1);

      // 1. Payment Methods
      const method = meta.method_usd || meta.method_bs || 'Otro';
      paymentStats[method] = (paymentStats[method] || 0) + t.amount;

      // 2. Barber Stats (Based on staffInvolved)
      staffInvolved.forEach(s => {
        const sId = s.staffId;
        if (!barberStats[sId]) {
          barberStats[sId] = { id: sId, services: 0, incomeBs: 0, lavados: 0 };
        }
        
        if (meta.appointment_id) {
          barberStats[sId].services += 1;
          barberStats[sId].incomeBs += bsAmount;
        }
      });

      // 3. Service Stats
      if (meta.appointment_id) {
        const serviceName = t.description.split(' - ')[1]?.replace('Servi: ', '') || 'Varios';
        serviceStats[serviceName] = (serviceStats[serviceName] || 0) + 1;
      }
    });

    return { barberStats, paymentStats, serviceStats };
  }, [operationalTransactions]);

  const { totalFixedCosts, netProfit, breakEven, avgTicket } = useMemo(() => {
    const totalFixedCosts = Object.entries(fixedCosts).reduce((acc, [key, val]) => {
      if (['workstations', 'avgServiceTime', 'extraCosts', 'customLabels', 'hiddenCosts'].includes(key)) return acc;
      return acc + Number(val || 0);
    }, 0) + (fixedCosts.extraCosts?.reduce((acc, c) => acc + Number(c.value || 0), 0) || 0);
    const netProfit = balance - totalFixedCosts;
    const breakEven = totalFixedCosts / 0.4;
    const avgTicket = totalIncome / (Object.values(analysisData.barberStats).reduce((acc, b) => acc + b.services, 0) || 1);
    return { totalFixedCosts, netProfit, breakEven, avgTicket };
  }, [fixedCosts, balance, totalIncome, analysisData]);

  const filteredTransactions = useMemo(() => {
    const seenTxIds = new Set();
    const seenKeys = new Set();

    return transactions.filter(t => {
      if (!t?.id || seenTxIds.has(t.id)) return false;

      const key = getDeduplicationKey(t);
      if (key && seenKeys.has(key)) return false;

      seenTxIds.add(t.id);
      if (key) seenKeys.add(key);

      // 1. Filter by Type
      if (filterType !== 'all' && t.type !== filterType) return false;
      
      // Parse transaction details
      const { clientName, serviceName } = parseTxExcel(t);
      
      // 2. Filter by Service
      if (filterService !== 'all' && serviceName.toLowerCase() !== filterService.toLowerCase()) return false;

      // 3. Filter by Search Query (Client Name / Description)
      if (debouncedSearch.trim() !== '') {
        const q = debouncedSearch.toLowerCase();
        const matchClient = clientName.toLowerCase().includes(q);
        const matchDesc = (t.description || '').toLowerCase().includes(q);
        if (!matchClient && !matchDesc) return false;
      }
      
      // 4. Filter by Barber
      if (filterBarber !== 'all') {
        const isAssociated = t.metadata?.staffInvolved?.some(s => String(s.staffId) === String(filterBarber));
        if (!isAssociated) return false;
      }
      
      // 5. Filter by Date
      if (filterDate !== 'all') {
        const txDate = new Date(t.created_at);
        const { start, end } = getDateRangeForFilter(filterDate, startDate, endDate);
        if (start && txDate < start) return false;
        if (end && txDate > end) return false;
      }
      
      return true;
    });
  }, [transactions, filterType, filterService, debouncedSearch, filterBarber, filterDate, startDate, endDate]);

  const uniqueServices = useMemo(() => (
    Array.from(new Set(transactions.map(t => parseTxExcel(t).serviceName).filter(Boolean)))
  ), [transactions]);

  // Nómina = CUENTA CORRIENTE acumulada: siempre muestra el saldo y los contadores desde
  // el inicio hasta HOY (los pagos son irregulares —al día, el sábado, etc.—, así que una
  // ventana semanal era contraproducente). El análisis por semana vive en Rentabilidad.
  const payrollDateRange = useMemo(() => ({
    dateFilterStart: new Date(0),        // desde el inicio de los tiempos
    dateFilterEnd: new Date()            // hasta ahora
  }), []);

  const { dateFilterStart, dateFilterEnd } = payrollDateRange;

  const weeklyTransactions = useMemo(() => operationalTransactions.filter(t => {
    const d = new Date(t.created_at);
    return d >= dateFilterStart && d <= dateFilterEnd;
  }), [operationalTransactions, dateFilterStart, dateFilterEnd]);

  const processedPayroll = useMemo(() => staff.map(st => {
    const staffCreatedAt = new Date(st.created_at || '2026-01-01T00:00:00.000Z');
    // CORTE DE NÓMINA: cada pago COMPLETO (no abono) archiva lo anterior. El saldo y los
    // contadores mostrados se reinician a 0 desde el último pago completo y acumulan de nuevo.
    // (El saldo "Por Pagar" da igual porque lo pre-corte se cancela, pero así se resetea la vista.)
    const lastSettlement = operationalTransactions.reduce((latest, t) => {
      if (t.type === 'expense' && t.category === 'Pago Nómina' && String(t.metadata?.staffId) === String(st.id) && !t.metadata?.isAbono) {
        const d = new Date(t.created_at);
        if (d > latest) return d;
      }
      return latest;
    }, new Date(0));
    const cutoff = lastSettlement > staffCreatedAt ? lastSettlement : new Date(staffCreatedAt.getTime() - 1);
    const ledgerTransactions = operationalTransactions.filter(t => {
      const d = new Date(t.created_at);
      return d > cutoff && d <= dateFilterEnd;
    });
    const serviceTransactions = ledgerTransactions.filter(t => t.type === 'income' && t.metadata?.staffInvolved?.some(x => String(x.staffId) === String(st.id) && hasPayrollValue(x)));
    const weeklyServiceTransactions = weeklyTransactions.filter(t => {
      if (new Date(t.created_at) <= cutoff) return false;
      const listedAsServiceStaff = t.metadata?.serviceStaff?.some(x => String(x.staffId) === String(st.id));
      const paidParticipant = t.metadata?.staffInvolved?.some(x => String(x.staffId) === String(st.id) && hasPayrollValue(x));
      return listedAsServiceStaff || paidParticipant;
    });
    const valesTransactions = ledgerTransactions.filter(t => t.type === 'expense' && t.category === 'Vales Odontologos' && String(t.metadata?.staffId) === String(st.id));
    const consumptionTransactions = ledgerTransactions.filter(t => t.type === 'expense' && t.category === 'Consumo Personal' && String(t.metadata?.staffId) === String(st.id));
    const exchangeChargeTransactions = ledgerTransactions.filter(t => t.category === 'Intercambio Barbero' && String(t.metadata?.exchangeStaffId) === String(st.id));
    const paymentTransactions = ledgerTransactions.filter(t => t.type === 'expense' && t.category === 'Pago Nómina' && String(t.metadata?.staffId) === String(st.id));
    const staffTransactions = [...serviceTransactions, ...exchangeChargeTransactions, ...valesTransactions, ...consumptionTransactions, ...paymentTransactions].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    
    const servicesCount = weeklyServiceTransactions.length;
    const roleLower = st.role?.toLowerCase() || '';
    const isAssistant = roleLower.includes('asistente') || roleLower.includes('lavado') || roleLower.includes('operaciones');
    const isBarista = roleLower.includes('barista');
    const isBarber = !isAssistant && (roleLower.includes('barbero') || roleLower.includes('barber') || roleLower.includes('tatu') || roleLower.includes('socio') || roleLower.includes('estilista') || roleLower.includes('lider'));
    // Personal de apoyo (editor, marketing, etc.): sueldo fijo. No acumula comisiones —
    // solo toma vales y se le registran pagos manualmente.
    const isSupportStaff = !isBarber && !isAssistant && !isBarista && !roleLower.startsWith('admin');
    
    // Comisión guardada de la persona en la tx. Para la asistente incluye lavados incluidos
    // + extras de lavado (guardado en commissionBs por checkout/edición). Solo si viene en 0
    // por datos viejos se recalcula desde el lavado incluido (única fuente antes).
    const assistantWashFallbackBs = (t, s) => {
      const washCount = Math.max(1, Number(t.metadata?.washCount || 1));
      const washRate = Number(t.metadata?.washRate || st.washing_rate || 1);
      const assistantShare = Number(t.metadata?.washAssistantSharePct || 60) / 100;
      return (washCount * washRate * assistantShare * Number(t.exchange_rate || rates?.usd || 1)) + Number(s.productCommissionBs || 0);
    };
    const earnedBs = serviceTransactions.reduce((sum, t) => {
      const s = t.metadata?.staffInvolved?.find(x => String(x.staffId) === String(st.id));
      if (!s) return sum;
      const storedBs = Number(s.commissionBs || 0) + Number(s.productCommissionBs || 0);
      if (isAssistant && storedBs <= 0 && t.metadata?.didWash) return sum + assistantWashFallbackBs(t, s);
      return sum + storedBs;
    }, 0);
    const earnedUsd = serviceTransactions.reduce((sum, t) => {
      const s = t.metadata?.staffInvolved?.find(x => String(x.staffId) === String(st.id));
      if (!s) return sum;
      const storedUsd = Number(s.commissionEarned || 0) + Number(s.productCommissionEarned || 0);
      if (isAssistant && storedUsd <= 0 && t.metadata?.didWash) {
        const washCount = Math.max(1, Number(t.metadata?.washCount || 1));
        const washRate = Number(t.metadata?.washRate || st.washing_rate || 1);
        const assistantShare = Number(t.metadata?.washAssistantSharePct || 60) / 100;
        return sum + (washCount * washRate * assistantShare) + Number(s.productCommissionEarned || 0);
      }
      return sum + storedUsd;
    }, 0);

    const propinasBs = serviceTransactions.reduce((sum, t) => {
      const s = t.metadata?.staffInvolved?.find(x => String(x.staffId) === String(st.id));
      return sum + (s ? (s.tipBs || 0) : 0);
    }, 0);
    const propinasUsd = serviceTransactions.reduce((sum, t) => {
      const s = t.metadata?.staffInvolved?.find(x => String(x.staffId) === String(st.id));
      return sum + (s ? Number(s.tip || 0) : 0);
    }, 0);

    const valesBs = valesTransactions.reduce((sum, t) => sum + (t.metadata?.amountBs || 0), 0);
    const valesUsd = valesTransactions.reduce((sum, t) => sum + Number(t.amount || 0), 0);
    const consumptionsBs = consumptionTransactions.reduce((sum, t) => sum + Number(t.metadata?.amountBs || (Number(t.amount || 0) * Number(t.exchange_rate || rates?.usd || 1))), 0);
    const consumptionsUsd = consumptionTransactions.reduce((sum, t) => sum + Number(t.amount || 0), 0);
    const exchangeChargesBs = exchangeChargeTransactions.reduce((sum, t) => sum + Number(t.metadata?.exchangeChargeBs || 0), 0);
    const exchangeChargesUsd = exchangeChargeTransactions.reduce((sum, t) => sum + Number(t.metadata?.exchangeChargeUsd || 0), 0);
    
    const paidBs = paymentTransactions.reduce((sum, t) => sum + (t.metadata?.amountBs || 0) + (t.metadata?.deductionBs || 0), 0);
    const paidUsd = paymentTransactions.reduce((sum, t) => sum + Number(t.amount || 0), 0);

    // Sueldo del personal de apoyo: cuánto se le ha pagado en el mes CALENDARIO actual
    // (independiente del filtro de período), para comparar contra su salario mensual.
    const monthStart = new Date(); monthStart.setDate(1); monthStart.setHours(0, 0, 0, 0);
    const salaryPaidMonthTx = (operationalTransactions || []).filter(t => t.type === 'expense' && t.category === 'Pago Nómina' && String(t.metadata?.staffId) === String(st.id) && new Date(t.created_at) >= monthStart);
    const salaryPaidMonthBs = salaryPaidMonthTx.reduce((s, t) => s + Number(t.metadata?.amountBs || (Number(t.amount || 0) * Number(t.exchange_rate || rates?.usd || 550))), 0);
    const salaryPaidMonthUsd = salaryPaidMonthTx.reduce((s, t) => s + Number(t.amount || 0), 0);
    const monthlySalaryUsd = Number(salaryOverrides[st.id] ?? st.monthly_salary ?? 0);

    let grossIncomeBs = 0;
    let lavadosCount = 0;
    let lavadoDeductionBs = 0;
    let weeklyAssistanceUsd = 0;
    let weeklyAssistanceBs = 0;
    let netIncomeBs = 0;
    
    if (isBarber) {
      grossIncomeBs = serviceTransactions.reduce((sum, t) => sum + ((t.amount || 0) * (t.exchange_rate || rates?.usd || 550)), 0);
      lavadosCount = serviceTransactions.filter(t => t.metadata?.didWash).length;
      weeklyAssistanceUsd = assistantConfig?.splits?.[st.id] || 0;
      weeklyAssistanceBs = weeklyAssistanceUsd * (rates?.usd || 550);
      netIncomeBs = earnedBs - weeklyAssistanceBs;
    } else if (isAssistant) {
      // Cuenta lavados reales de la asistente: los incluidos (washCount) MÁS los extras
      // de lavado (Lavado express/premium), que no activan didWash pero sí son lavados.
      lavadosCount = serviceTransactions.reduce((sum, t) => {
        const m = t.metadata || {};
        const included = m.didWash ? Number(m.washCount || 0) : 0;
        const extraWashes = (m.extras || []).filter(ex => (ex.service_extras?.name || ex.name || '').toLowerCase().includes('lavado')).length;
        return sum + included + extraWashes;
      }, 0);
      const totalBarberAssistanceUsd = Object.values(assistantConfig?.splits || {}).reduce((sum, val) => sum + (Number(val) || 0), 0);
      weeklyAssistanceUsd = totalBarberAssistanceUsd;
      weeklyAssistanceBs = totalBarberAssistanceUsd * (rates?.usd || 550);
      netIncomeBs = earnedBs + weeklyAssistanceBs;
    } else {
      netIncomeBs = earnedBs;
    }
    
    const balanceBs = netIncomeBs + propinasBs - valesBs - consumptionsBs - exchangeChargesBs - paidBs;
    const netIncomeUsd = isBarber ? earnedUsd - weeklyAssistanceUsd : isAssistant ? earnedUsd + weeklyAssistanceUsd : earnedUsd;
    const balanceUsd = netIncomeUsd + propinasUsd - valesUsd - consumptionsUsd - exchangeChargesUsd - paidUsd;

    // Desglose por método de pago (NETO): cuánto dinero LE CORRESPONDE a esta persona en
    // cada cuenta (Efectivo, Pago Móvil, Zelle…). Suma su comisión + propina de cada venta
    // según la cuenta por la que pagó el cliente (pagos mixtos se reparten proporcional), y
    // RESTA lo que ya se le pagó/adelantó por cada cuenta (vales, consumos, nómina). Así el
    // total del desglose refleja el "Por Pagar" repartido por cuenta.
    const methodBreakdown = {};
    // Mismo desglose pero en USD ORIGINAL (por la tasa de cada tx). Las cuentas en dólares
    // (Efectivo $, Zelle, Binance…) son dinero fijo en USD: no debe cambiar con la tasa.
    const methodBreakdownUsd = {};
    const addToMethod = (method, amountBs, txRate) => {
      if (!Number.isFinite(amountBs) || amountBs === 0) return;
      const key = normalizePaymentMethod(method);
      methodBreakdown[key] = (methodBreakdown[key] || 0) + amountBs;
      const r = Number(txRate) || Number(rates?.usd) || 550;
      methodBreakdownUsd[key] = (methodBreakdownUsd[key] || 0) + (amountBs / r);
    };
    // (+) Ingresos: comisión + propina de esta persona, por la cuenta de cada venta
    serviceTransactions.forEach(t => {
      const s = t.metadata?.staffInvolved?.find(x => String(x.staffId) === String(st.id));
      if (!s) return;
      const txRate = Number(t.exchange_rate || rates?.usd || 550);
      let shareBs = Number(s.commissionBs || 0) + Number(s.productCommissionBs || 0);
      if (isAssistant && shareBs <= 0 && t.metadata?.didWash) shareBs = assistantWashFallbackBs(t, s);
      shareBs += Number(s.tipBs || 0); // la propina también le corresponde
      if (shareBs <= 0) return;
      const m = t.metadata || {};
      const saleBs = Number(t.amount || 0) * txRate;
      const usdBs = Number(m.cash_usd || m.cashUsd || 0) * txRate;
      const bs = Number(m.transfer_bs || m.transferBs || 0);
      if ((m.mixed_payment || (usdBs > 0 && bs > 0)) && saleBs > 0) {
        addToMethod(m.method_usd || 'Efectivo ($)', shareBs * (usdBs / saleBs), txRate);
        addToMethod(m.method_bs || 'Pago Móvil', shareBs * (bs / saleBs), txRate);
      } else if (bs > 0) {
        addToMethod(m.method_bs || 'Pago Móvil', shareBs, txRate);
      } else {
        addToMethod(m.method_usd || 'Efectivo ($)', shareBs, txRate);
      }
    });
    // (−) Egresos ya pagados/adelantados a esta persona, por la cuenta de cada egreso.
    // Si el egreso tiene reparto por método (paymentDistribution), se resta por cada uno.
    [...valesTransactions, ...consumptionTransactions, ...paymentTransactions].forEach(t => {
      const m = t.metadata || {};
      const txRate = Number(t.exchange_rate || rates?.usd || 550);
      const dist = Array.isArray(m.paymentDistribution) ? m.paymentDistribution : null;
      if (dist && dist.length) {
        dist.forEach(item => addToMethod(item.method, -Number(item.amountBs || (Number(item.amount || 0) * txRate)), txRate));
      } else {
        addToMethod(m.paymentMethod || 'Efectivo ($)', -Number(m.amountBs || (Number(t.amount || 0) * txRate)), txRate);
      }
    });
    // Quitar cuentas que quedaron en ~0 tras netear
    Object.keys(methodBreakdown).forEach(k => { if (Math.abs(methodBreakdown[k]) < 0.005) { delete methodBreakdown[k]; delete methodBreakdownUsd[k]; } });

    return {
      ...st,
      isBarber,
      isAssistant,
      isBarista,
      isSupportStaff,
      monthlySalaryUsd,
      salaryPaidMonthBs,
      salaryPaidMonthUsd,
      servicesCount,
      lavadosCount,
      grossIncomeBs,
      lavadoDeductionBs,
      weeklyAssistanceUsd,
      weeklyAssistanceBs,
      earnedBs,
      earnedUsd,
      propinasBs,
      propinasUsd,
      valesBs,
      valesUsd,
      consumptionsBs,
      consumptionsUsd,
      exchangeChargesBs,
      exchangeChargesUsd,
      netIncomeBs,
      netIncomeUsd,
      balanceUsd,
      paidBs,
      paidUsd,
      balanceBs,
      methodBreakdown,
      methodBreakdownUsd,
      staffTransactions
    };
  }), [staff, weeklyTransactions, operationalTransactions, dateFilterStart, dateFilterEnd, rates, assistantConfig, salaryOverrides])
    .filter(s => (s.isBarber || s.isAssistant || s.isBarista || s.isSupportStaff) && s.active !== false && !String(s.role || '').startsWith('ARCHIVED|'));

  const isAdminStaff = (st) => String(st?.role || '').split('|')[0].trim().toLowerCase() === 'admin';

  // Helpers reutilizables sobre un conjunto de transacciones.
  const productCostBsOf = (txs) => (txs || []).filter(t => t.type === 'income').reduce((sum, t) => {
    const rate = Number(t.exchange_rate || rates?.usd || 550);
    const prods = t.metadata?.products || t.metadata?.products_sold || [];
    const costUsd = prods.reduce((s, p) => {
      const inv = (sellableInventory || []).find(i => String(i.id) === String(p.id));
      const cost = Number(inv?.cost_price ?? inv?.purchase_price ?? 0);
      return s + cost * Number(p.quantity || 1);
    }, 0);
    return sum + costUsd * rate;
  }, 0);
  const washesCountOf = (txs) => (txs || []).filter(t => t.type === 'income').reduce((sum, t) => {
    const m = t.metadata || {};
    const included = m.didWash ? Number(m.washCount || 0) : 0;
    const extraWashes = (m.extras || []).filter(ex => (ex.service_extras?.name || ex.name || '').toLowerCase().includes('lavado')).length;
    return sum + included + extraWashes;
  }, 0);
  const productsCountOf = (txs) => (txs || []).filter(t => t.type === 'income').reduce((sum, t) => {
    const prods = t.metadata?.products || t.metadata?.products_sold || [];
    return sum + prods.reduce((s, p) => s + Number(p.quantity || 1), 0);
  }, 0);
  // Ganancia de Panda por lavados: el asistente cobra su % (washAssistantSharePct) del lavado
  // y Panda se queda con el resto. Se deriva de lo que se le pagó al asistente en cada venta:
  // si le tocó 'x' con un share del 60%, el lavado valía x/0.6 y Panda retuvo el 40% = x·(0.4/0.6).
  const lavadosProfitBsOf = (txs) => (txs || []).filter(t => t.type === 'income').reduce((sum, t) => {
    const share = Math.min(0.95, Math.max(0.05, Number(t.metadata?.washAssistantSharePct || 60) / 100));
    const assistantCommBs = (t.metadata?.staffInvolved || [])
      .filter(m => /asistente|lavado|operaciones/i.test(String(m.role || '')))
      .reduce((s, m) => s + Number(m.commissionBs || 0), 0);
    return sum + assistantCommBs * (1 - share) / share;
  }, 0);

  // ===== CAJA DE PANDA (estado ACUMULADO, NO por período) =====
  // Panda es la caja de la barbería: refleja el estado ACTUAL (cuánto ha ganado en total,
  // dónde está el dinero, cuánto debe). Por eso NO se filtra por período — si no, cada
  // semana nueva "reiniciaría" los números y no cuadrarían. El análisis por semana vive en
  // la pestaña Rentabilidad. Ganancia = ventas − lo que se llevan los Odontologos − costo de
  // productos. El monto de cada venta ya incluye propinas/extras/productos.
  const pandaIncomeTx = (operationalTransactions || []).filter(t => t.type === 'income');
  const pandaGrossIncomeBs = pandaIncomeTx.reduce((sum, t) => sum + Number(t.amount || 0) * Number(t.exchange_rate || rates?.usd || 550), 0);
  const pandaStaffTakeBs = pandaIncomeTx.reduce((sum, t) => {
    const involved = t.metadata?.staffInvolved || [];
    return sum + involved.reduce((s, m) => s + Number(m.commissionBs || 0) + Number(m.productCommissionBs || 0) + Number(m.tipBs || 0), 0);
  }, 0);
  const pandaProductCostBs = productCostBsOf(operationalTransactions);
  const pandaProfitBs = Math.max(0, pandaGrossIncomeBs - pandaStaffTakeBs - pandaProductCostBs);
  const pandaProfitUsd = pandaProfitBs / (rates?.usd || 550);
  const pandaServicesCount = pandaIncomeTx.length;
  const pandaWashesCount = washesCountOf(operationalTransactions);
  const pandaProductsCount = productsCountOf(operationalTransactions);

  // Deuda al proveedor = costo acumulado de productos − pagos ya hechos al proveedor.
  const providerPaymentsBs = (operationalTransactions || [])
    .filter(t => t.category === 'Pago Proveedor')
    .reduce((s, t) => s + Number(t.metadata?.amountBs || (Number(t.amount || 0) * Number(t.exchange_rate || rates?.usd || 550))), 0);
  const providerDebtBs = Math.max(0, pandaProductCostBs - providerPaymentsBs);
  const providerDebtUsd = providerDebtBs / (rates?.usd || 550);

  // Historial de productos (bebidas) vendidos: en qué servicio, comisión ganada y costo
  // (deuda al proveedor) de cada uno. Una fila por producto por venta, del más reciente.
  const productSalesHistory = useMemo(() => {
    const rows = [];
    (operationalTransactions || []).filter(t => t.type === 'income').forEach(t => {
      const m = t.metadata || {};
      const rate = Number(t.exchange_rate || rates?.usd || 550);
      const prods = m.products || m.products_sold || [];
      prods.forEach(p => {
        const inv = (sellableInventory || []).find(i => String(i.id) === String(p.id));
        const qty = Number(p.quantity || 1);
        const priceUsd = Number(p.price ?? inv?.sale_price ?? inv?.price ?? 0);
        const costUsd = Number(inv?.cost_price ?? inv?.purchase_price ?? 0);
        const saleUsd = priceUsd * qty;
        const costTotalUsd = costUsd * qty;
        // Los productos son 100% de Panda: su ganancia = venta − costo (sin comisión al staff).
        const marginUsd = saleUsd - costTotalUsd;
        rows.push({
          id: `${t.id}-${p.id}`,
          date: t.created_at,
          product: `${p.name || inv?.name || 'Producto'} ×${qty}`,
          context: `${m.clientName || 'Cliente'} · ${m.serviceName || 'Servicio'}`,
          seller: p.sellerName || '',
          saleBs: saleUsd * rate, marginBs: marginUsd * rate, costBs: costTotalUsd * rate,
          saleUsd, marginUsd, costUsd: costTotalUsd,
          hasCost: costUsd > 0
        });
      });
    });
    return rows.sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [operationalTransactions, sellableInventory, rates]);
  const productHistoryTotals = productSalesHistory.reduce((acc, r) => ({
    sale: acc.sale + r.saleBs, margin: acc.margin + r.marginBs, cost: acc.cost + r.costBs,
    saleUsd: acc.saleUsd + r.saleUsd, marginUsd: acc.marginUsd + r.marginUsd, costUsd: acc.costUsd + r.costUsd
  }), { sale: 0, margin: 0, cost: 0, saleUsd: 0, marginUsd: 0, costUsd: 0 });

  // Desglose de la Ganancia de Panda por origen. Los tres suman EXACTO el total (pandaProfitBs):
  // productos = margen (venta − costo, 100% Panda); lavados = lo que retiene del lavado tras
  // pagar al asistente; servicios = el resto (corte/barba/extras menos la comisión del barbero).
  const pandaProductProfitBs = productHistoryTotals.margin;
  const pandaLavadosProfitBs = lavadosProfitBsOf(operationalTransactions);
  const pandaServiciosProfitBs = pandaProfitBs - pandaProductProfitBs - pandaLavadosProfitBs;
  const pandaProfitRate = rates?.usd || 550;

  // Historial de caja: TODOS los movimientos (ventas con su comisión generada, vales,
  // consumos, pagos de nómina, gastos, conversiones, pagos a proveedor), del más reciente.
  const cajaMovements = useMemo(() => {
    const nameOfStaff = (id) => (staff.find(s => String(s.id) === String(id))?.name) || 'Personal';
    const isUsdMethod = (name) => /efectivo \(\$\)|zelle|zinli|binance|usdt/i.test(String(name || ''));
    return (operationalTransactions || []).map(t => {
      const m = t.metadata || {};
      const rate = Number(t.exchange_rate || rates?.usd || 550);
      const amountBs = m.amountBs != null ? Number(m.amountBs) : Number(t.amount || 0) * rate;
      const amountUsd = rate > 0 ? amountBs / rate : Number(t.amount || 0);
      const method = m.paymentMethod || m.method_bs || m.method_usd || '';
      // Moneda nativa del movimiento: $ si la cuenta es en dólares y no es pago mixto.
      const isUsd = !m.mixed_payment && !m.conversion && isUsdMethod(method);
      let concept, kind, staffTakeBs = 0;
      if (t.type === 'income') {
        kind = 'income';
        concept = `${m.clientName || 'Cliente'} · ${m.serviceName || 'Servicio'}`;
        staffTakeBs = (m.staffInvolved || []).reduce((s, x) => s + Number(x.commissionBs || 0) + Number(x.productCommissionBs || 0) + Number(x.tipBs || 0), 0);
      } else if (m.conversion) {
        kind = 'conversion'; concept = `${m.transfer ? 'Transferencia' : 'Conversión'}: ${m.fromLabel || ''} → ${m.toLabel || ''}`;
      } else if (t.category === 'Pago Proveedor') {
        kind = 'provider'; concept = `Pago a proveedor${m.paymentMethod ? ` (${m.paymentMethod})` : ''}`;
      } else if (t.category === 'Vales Odontologos') {
        kind = 'vale'; concept = `Vale / Adelanto · ${nameOfStaff(m.staffId)}`;
      } else if (t.category === 'Consumo Personal') {
        kind = 'consumo'; concept = `Consumo · ${nameOfStaff(m.staffId)}`;
      } else if (t.category === 'Pago Nómina') {
        kind = 'nomina'; concept = `Pago nómina · ${nameOfStaff(m.staffId)}`;
      } else {
        kind = 'expense'; concept = t.description || 'Gasto';
      }
      return { id: t.id, date: t.created_at, type: t.type, kind, concept, amountBs, amountUsd, isUsd, staffTakeBs, method };
    }).sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [operationalTransactions, staff, rates]);

  // Nómina: solo empleados. Panda (Admin) ya NO aparece aquí — vive en el tab "Barbería".
  const payrollStaff = useMemo(() => processedPayroll.filter(st => !isAdminStaff(st)), [processedPayroll]);
  const payrollWithMovement = useMemo(() => payrollStaff.filter(st => [
    st.servicesCount,
    st.lavadosCount,
    st.grossIncomeBs,
    st.netIncomeBs,
    st.earnedBs,
    st.propinasBs,
    st.valesBs,
    st.consumptionsBs,
    st.exchangeChargesBs,
    st.paidBs,
    st.balanceBs
  ].some(value => Math.abs(Number(value || 0)) > 0.005)), [payrollStaff]);

  const visiblePayroll = payrollCardsFilter === 'movement' ? payrollWithMovement : payrollStaff;

  const payrollHistory = useMemo(() => {
    return operationalTransactions
      .filter(t => t.category === 'Pago Nómina')
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  }, [operationalTransactions]);

  const handleSaveCosts = (e) => {
    e.preventDefault();
    const normalizedCosts = {
      ...fixedCosts,
      rent: Number(fixedCosts.rent || 0),
      services: Number(fixedCosts.services || 0),
      payroll: Number(fixedCosts.payroll || 0),
      software: Number(fixedCosts.software || 0),
      marketing: Number(fixedCosts.marketing || 0),
      tax: Number(fixedCosts.tax || 0),
      workstations: Number(fixedCosts.workstations || 0),
      avgServiceTime: Number(fixedCosts.avgServiceTime || 0),
      extraCosts: (fixedCosts.extraCosts || []).map(cost => ({ ...cost, value: Number(cost.value || 0) }))
    };
    setFixedCosts(normalizedCosts);
    localStorage.setItem('panda_fixed_costs', JSON.stringify(normalizedCosts));
    setIsEditingCosts(false);
    setIsCostsLocked(true);
    showToast("Estructura de costos actualizada.");
  };

  return (
    <div className="finance-module animate-fade-in" style={{ maxWidth: '1200px', margin: '0 auto', paddingBottom: isMobile ? '120px' : '80px' }}>
      {/* Header Section */}
      <div style={{
        display: 'flex',
        flexDirection: isMobile ? 'column' : 'row',
        justifyContent: 'space-between',
        alignItems: isMobile ? 'flex-start' : 'center',
        gap: isMobile ? '20px' : '0',
        marginBottom: '40px'
      }}>
        <div>
          <h2 style={{ fontSize: isMobile ? '28px' : '32px', fontWeight: '800', letterSpacing: '-0.5px' }}>
            Finanzas
          </h2>
          <p style={{ color: 'var(--text-secondary)', marginTop: '4px' }}>Control de flujo y conciliación.</p>
        </div>
        <div style={{ 
          display: 'flex', 
          gap: '12px', 
          width: isMobile ? '100%' : 'auto',
          flexDirection: isMobile ? 'row' : 'row' // Keep side-by-side if refined enough
        }}>
          <button className="btn-gold" onClick={() => handleManualTransaction('income')} style={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            gap: '8px', 
            borderRadius: '12px',
            height: '44px',
            flex: 1,
            fontSize: '14px',
            fontWeight: '600'
          }}>
            <Plus size={16} /> Ingreso
          </button>
          <button onClick={() => handleManualTransaction('expense')} style={{ 
            background: 'linear-gradient(145deg, rgba(255, 69, 58, 0.15) 0%, rgba(255, 69, 58, 0.05) 100%)', 
            border: '1px solid rgba(255, 69, 58, 0.3)', 
            color: '#ff6961',
            height: '44px',
            padding: '0 16px',
            borderRadius: '12px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            fontWeight: '700',
            fontSize: '14px',
            flex: 1,
            transition: 'all 0.2s',
            boxShadow: '0 4px 12px rgba(255, 69, 58, 0.1)'
          }}>
            <Minus size={16} /> Gasto
          </button>
        </div>
      </div>

      {/* Tab Selector */}
      <div style={{ 
        display: 'flex', 
        gap: isMobile ? '8px' : '20px', 
        marginBottom: '32px', 
        borderBottom: '1px solid var(--border-color)',
        width: '100%'
      }}>
        <button 
          onClick={() => setActiveTab('transactions')}
          style={{ 
            padding: isMobile ? '12px 4px' : '12px 20px', 
            background: 'none', 
            border: 'none', 
            color: activeTab === 'transactions' ? 'var(--gold-primary)' : 'var(--text-secondary)',
            fontWeight: '800',
            fontSize: isMobile ? '12px' : '14px',
            cursor: 'pointer',
            flex: isMobile ? 1 : 'none',
            textAlign: 'center',
            borderBottom: activeTab === 'transactions' ? '2px solid var(--gold-primary)' : '2px solid transparent',
            transition: 'color 0.2s'
          }}
        >
          {isMobile ? 'MOVIMIENTOS' : 'TRANSACCIONES'}
        </button>
        <button 
          onClick={() => setActiveTab('payroll')}
          style={{ 
            padding: isMobile ? '12px 4px' : '12px 20px', 
            background: 'none', 
            border: 'none', 
            color: activeTab === 'payroll' ? 'var(--gold-primary)' : 'var(--text-secondary)',
            fontWeight: '800',
            fontSize: isMobile ? '12px' : '14px',
            cursor: 'pointer',
            flex: isMobile ? 1 : 'none',
            textAlign: 'center',
            borderBottom: activeTab === 'payroll' ? '2px solid var(--gold-primary)' : '2px solid transparent',
            transition: 'color 0.2s'
          }}
        >
          {isMobile ? 'NÓMINA' : 'NÓMINA Y PAGOS'}
        </button>
        <button 
          onClick={() => setActiveTab('analysis')}
          style={{ 
            padding: isMobile ? '12px 4px' : '12px 20px', 
            background: 'none', 
            border: 'none', 
            color: activeTab === 'analysis' ? 'var(--gold-primary)' : 'var(--text-secondary)',
            fontWeight: '800',
            fontSize: isMobile ? '12px' : '14px',
            cursor: 'pointer',
            flex: isMobile ? 1 : 'none',
            textAlign: 'center',
            borderBottom: activeTab === 'analysis' ? '2px solid var(--gold-primary)' : '2px solid transparent',
            transition: 'color 0.2s'
          }}
        >
          {isMobile ? 'ANÁLISIS' : 'RENTABILIDAD Y OCUPACIÓN'}
        </button>
        <button
          onClick={() => setActiveTab('receivables')}
          style={{
            padding: isMobile ? '12px 4px' : '12px 20px', background: 'none', border: 'none',
            color: activeTab === 'receivables' ? '#ff9f0a' : 'var(--text-secondary)', fontWeight: '800',
            fontSize: isMobile ? '12px' : '14px', cursor: 'pointer', flex: isMobile ? 1 : 'none', textAlign: 'center',
            borderBottom: activeTab === 'receivables' ? '2px solid #ff9f0a' : '2px solid transparent', transition: 'color 0.2s'
          }}
        >
          {isMobile ? 'POR COBRAR' : `CUENTAS POR COBRAR${receivableTransactions.length ? ` (${receivableTransactions.length})` : ''}`}
        </button>
        <button
          onClick={() => setActiveTab('barberia')}
          style={{
            padding: isMobile ? '12px 4px' : '12px 20px', background: 'none', border: 'none',
            color: activeTab === 'barberia' ? '#32d74b' : 'var(--text-secondary)', fontWeight: '800',
            fontSize: isMobile ? '12px' : '14px', cursor: 'pointer', flex: isMobile ? 1 : 'none', textAlign: 'center',
            borderBottom: activeTab === 'barberia' ? '2px solid #32d74b' : '2px solid transparent', transition: 'color 0.2s'
          }}
        >
          {isMobile ? 'CLÍNICA' : 'CLÍNICA (DIENTES SANOS)'}
        </button>
      </div>

      {activeTab === 'transactions' && (
        <>
        {/* Stats Cards Grid */}
        <section style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, minmax(0, 1fr))',
          gap: '20px',
          marginBottom: '40px'
        }}>
        <div className="glass-card" style={{ 
          textAlign: 'center', 
          padding: isMobile ? '24px' : '32px',
          border: '1px solid rgba(255, 255, 255, 0.2)',
          borderRadius: '24px',
          background: 'var(--bg-secondary)',
          boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.5)'
        }}>
          <div>
            <div style={{ fontSize: isMobile ? '12px' : '13px', color: 'var(--text-secondary)', marginBottom: '8px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '1px' }}>Saldo Actual</div>
            <div style={{ fontSize: isMobile ? '38px' : '48px', fontWeight: '950', color: 'var(--gold-primary)', letterSpacing: '-1px' }}>
              ${formatCurrency(balance, '')}
            </div>
          </div>
        </div>
        
        <div className="glass-card" style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '20px', 
          padding: '24px',
          borderRadius: '24px' 
        }}>
          <div style={{ 
            width: '56px', 
            height: '56px', 
            backgroundColor: 'rgba(50, 215, 75, 0.1)', 
            borderRadius: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <ArrowUpCircle size={28} color="#32d74b" />
          </div>
          <div>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: '600' }}>INGRESOS (HOY)</div>
            <div style={{ fontSize: '24px', fontWeight: '800' }}>${formatCurrency(todayIncome, '')}</div>
          </div>
        </div>

        <div className="glass-card" style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '20px', 
          padding: '24px',
          borderRadius: '24px' 
        }}>
          <div style={{ 
            width: '56px', 
            height: '56px', 
            backgroundColor: 'rgba(255, 69, 58, 0.1)', 
            borderRadius: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <ArrowDownCircle size={28} color="#ff453a" />
          </div>
          <div>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: '600' }}>EGRESOS (HOY)</div>
            <div style={{ fontSize: '24px', fontWeight: '800' }}>${formatCurrency(todayExpense, '')}</div>
          </div>
        </div>
      </section>

      {/* Balances de Cuentas / Billeteras */}
      <section className="glass-card animate-slide-up" style={{
        marginBottom: '40px',
        padding: '24px',
        borderRadius: '24px',
        border: '1.5px solid rgba(255, 255, 255, 0.08)'
      }}>
        <h3 style={{ fontSize: '18px', fontWeight: '800', marginBottom: '16px', color: 'white', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Wallet size={20} color="var(--gold-primary)" /> Balances de Cuentas / Billeteras
        </h3>
        <div style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '16px'
        }}>
          <div style={{ padding: '16px', backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.04)' }}>
            <div style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Banknote size={14} color="var(--gold-primary)" /> EFECTIVO (USD)
            </div>
            <div style={{ fontSize: '20px', fontWeight: '900', color: 'white', marginTop: '6px' }}>${formatCurrency(accountBalances.cash_usd, '')}</div>
          </div>
          <div style={{ padding: '16px', backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.04)' }}>
            <div style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Landmark size={14} color="#64d2ff" /> ZELLE (USD)
            </div>
            <div style={{ fontSize: '20px', fontWeight: '900', color: 'white', marginTop: '6px' }}>${formatCurrency(accountBalances.zelle, '')}</div>
          </div>
          <div style={{ padding: '16px', backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.04)' }}>
            <div style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Smartphone size={14} color="#a78bfa" /> ZINLI (USD)
            </div>
            <div style={{ fontSize: '20px', fontWeight: '900', color: 'white', marginTop: '6px' }}>${formatCurrency(accountBalances.zinli, '')}</div>
          </div>
          <div style={{ padding: '16px', backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.04)' }}>
            <div style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Coins size={14} color="#f59e0b" /> BINANCE / USDT
            </div>
            <div style={{ fontSize: '20px', fontWeight: '900', color: 'white', marginTop: '6px' }}>${formatCurrency(accountBalances.binance, '')}</div>
          </div>

          <div style={{ padding: '16px', backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.04)' }}>
            <div style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Send size={14} color="#32d74b" /> PAGO MÓVIL (BS)
            </div>
            <div className="finance-money" style={{ fontSize: '20px', fontWeight: '900', color: 'var(--gold-primary)', marginTop: '6px' }}>{accountBalances.pago_movil.toLocaleString('es-VE')} Bs</div>
            <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>≈ ${(accountBalances.pago_movil / (rates?.usd || 550)).toFixed(2)} USD</span>
          </div>
          <div style={{ padding: '16px', backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.04)' }}>
            <div style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Banknote size={14} color="#32d74b" /> EFECTIVO (BS)
            </div>
            <div className="finance-money" style={{ fontSize: '20px', fontWeight: '900', color: 'var(--gold-primary)', marginTop: '6px' }}>{accountBalances.cash_bs.toLocaleString('es-VE')} Bs</div>
            <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>≈ ${(accountBalances.cash_bs / (rates?.usd || 550)).toFixed(2)} USD</span>
          </div>
          <div style={{ padding: '16px', backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.04)' }}>
            <div style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <CreditCard size={14} color="#60a5fa" /> PUNTO DE VENTA (BS)
            </div>
            <div className="finance-money" style={{ fontSize: '20px', fontWeight: '900', color: 'var(--gold-primary)', marginTop: '6px' }}>{accountBalances.punto_venta.toLocaleString('es-VE')} Bs</div>
            <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>≈ ${(accountBalances.punto_venta / (rates?.usd || 550)).toFixed(2)} USD</span>
          </div>
          <button type="button" onClick={() => setActiveTab('receivables')} style={{ padding: '16px', textAlign: 'left', backgroundColor: 'rgba(255,159,10,.07)', borderRadius: '16px', border: '1px solid rgba(255,159,10,.22)', cursor: 'pointer', color: 'inherit' }}>
            <div style={{ fontSize: '11px', color: '#ffb340', fontWeight: '900', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Receipt size={14} color="#ffb340" /> CUENTAS POR COBRAR
            </div>
            <div className="finance-money" style={{ fontSize: '20px', fontWeight: '900', color: '#ffb340', marginTop: '6px' }}>{totalReceivableBs.toLocaleString('es-VE', { maximumFractionDigits: 2 })} Bs</div>
            <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>${totalReceivableUsd.toFixed(2)} USD pendientes · no disponible</span>
          </button>
          {accountBalances.transferencia !== 0 && (
          <div style={{ padding: '16px', backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.04)' }}>
            <div style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Landmark size={14} color="var(--text-secondary)" /> TRANSFERENCIAS HISTÓRICAS (BS)
            </div>
            <div className="finance-money" style={{ fontSize: '20px', fontWeight: '900', color: 'var(--gold-primary)', marginTop: '6px' }}>{accountBalances.transferencia.toLocaleString('es-VE')} Bs</div>
            <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>≈ ${(accountBalances.transferencia / (rates?.usd || 550)).toFixed(2)} USD</span>
          </div>
          )}
        </div>
      </section>

          {/* Cash Closing / Autoconciliación */}
      <section className="glass-card animate-slide-up" style={{ 
        marginBottom: '40px', 
        padding: '32px', 
        borderRadius: '28px',
        background: 'var(--bg-secondary)',
        border: '1px solid rgba(255, 255, 255,0.1)'
      }}>
        <div style={{ display: 'flex', alignItems: isMobile ? 'flex-start' : 'center', justifyContent: 'space-between', gap: '16px', marginBottom: '24px', flexDirection: isMobile ? 'column' : 'row' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '12px', backgroundColor: 'var(--gold-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Wallet size={20} color="black" />
            </div>
            <h3 style={{ fontSize: '20px', fontWeight: '900' }}>Cierre de Caja</h3>
          </div>
          <div style={{ width: isMobile ? '100%' : '260px' }}>
            <PandaSelect
              label="Rango de Cierre"
              value={cashCloseDate}
              onChange={setCashCloseDate}
              options={[
                { value: 'today', label: 'Hoy' },
                { value: 'yesterday', label: 'Ayer' },
                { value: 'this_week', label: 'Esta Semana' },
                { value: 'last_week', label: 'Semana Pasada' },
                { value: 'this_month', label: 'Este Mes' },
                { value: 'last_month', label: 'Mes Pasado' },
                { value: 'custom', label: 'Rango Personalizado' }
              ]}
            />
          </div>
        </div>

        {cashCloseDate === 'custom' && (
          <div className="animate-fade-in" style={{
            display: 'flex',
            gap: '16px',
            alignItems: 'center',
            padding: '16px',
            backgroundColor: 'var(--bg-secondary)',
            borderRadius: '16px',
            flexWrap: 'wrap',
            border: '1px solid rgba(255,255,255,0.05)',
            marginBottom: '20px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: isMobile ? '1 1 100%' : '1' }}>
              <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: '700' }}>Desde:</span>
              <PandaDatePicker
                value={cashCloseStartDate}
                onChange={(e) => setCashCloseStartDate(e.target.value)}
              />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: isMobile ? '1 1 100%' : '1' }}>
              <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: '700' }}>Hasta:</span>
              <PandaDatePicker
                value={cashCloseEndDate}
                onChange={(e) => setCashCloseEndDate(e.target.value)}
              />
            </div>
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(190px, 1fr))', gap: '20px' }}>
          <div style={{ padding: '20px', backgroundColor: 'var(--bg-secondary)', borderRadius: '20px' }}>
            <div style={{ fontSize: '10px', fontWeight: '900', color: 'var(--text-muted)', marginBottom: '4px' }}>EFECTIVO ($)</div>
            <div className="finance-money" style={{ fontSize: '20px', fontWeight: '900', color: '#32d74b' }}>
              {formatCurrency(cashCloseCashUsd * (rates?.usd || 550), '')} <span style={{fontSize: '12px'}}>BS</span>
            </div>
            <div style={{ fontSize: '11px', color: 'white', marginTop: '4px' }}>
              REF: ${formatCurrency(cashCloseCashUsd, '')}
            </div>
          </div>
          <div style={{ padding: '20px', backgroundColor: 'var(--bg-secondary)', borderRadius: '20px' }}>
            <div style={{ fontSize: '10px', fontWeight: '900', color: 'var(--text-muted)', marginBottom: '4px' }}>PAGO MÓVIL (BS)</div>
            <div className="finance-money" style={{ fontSize: '20px', fontWeight: '900', color: 'var(--gold-primary)' }}>
              {formatCurrency(cashClosePagoMovilBs, '')} <span style={{fontSize: '12px'}}>BS</span>
            </div>
            <div style={{ fontSize: '11px', color: 'white', marginTop: '4px' }}>
              REF: ${formatCurrency(cashClosePagoMovilBs / (rates?.usd || 550), '')}
            </div>
          </div>
          <div style={{ padding: '20px', backgroundColor: 'var(--bg-secondary)', borderRadius: '20px' }}>
            <div style={{ fontSize: '10px', fontWeight: '900', color: 'var(--text-muted)', marginBottom: '4px' }}>PUNTO DE VENTA (BS)</div>
            <div className="finance-money" style={{ fontSize: '20px', fontWeight: '900', color: 'var(--gold-primary)' }}>
              {formatCurrency(cashClosePuntoVentaBs, '')} <span style={{fontSize: '12px'}}>BS</span>
            </div>
            <div style={{ fontSize: '11px', color: 'white', marginTop: '4px' }}>
              REF: ${formatCurrency(cashClosePuntoVentaBs / (rates?.usd || 550), '')}
            </div>
          </div>
          <div style={{ padding: '20px', backgroundColor: 'var(--bg-secondary)', borderRadius: '20px' }}>
            <div style={{ fontSize: '10px', fontWeight: '900', color: 'var(--text-muted)', marginBottom: '4px' }}>EFECTIVO (BS)</div>
            <div className="finance-money" style={{ fontSize: '20px', fontWeight: '900', color: 'var(--gold-primary)' }}>
              {formatCurrency(cashCloseCashBs, '')} <span style={{fontSize: '12px'}}>BS</span>
            </div>
            <div style={{ fontSize: '11px', color: 'white', marginTop: '4px' }}>
              REF: ${formatCurrency(cashCloseCashBs / (rates?.usd || 550), '')}
            </div>
          </div>
          <div style={{ padding: '20px', backgroundColor: 'rgba(255,69,58,0.05)', borderRadius: '20px' }}>
            <div style={{ fontSize: '10px', fontWeight: '900', color: 'var(--text-muted)', marginBottom: '4px' }}>COMISIONES DEUDA</div>
            <div className="finance-money" style={{ fontSize: '20px', fontWeight: '900', color: '#ff453a' }}>
              {formatCurrency(cashCloseCommissionDebtUsd * (rates?.usd || 550), '')} <span style={{fontSize: '12px'}}>BS</span>
            </div>
            <div style={{ fontSize: '11px', color: 'white', marginTop: '4px' }}>
              REF: ${formatCurrency(cashCloseCommissionDebtUsd, '')}
            </div>
          </div>
          <div style={{ padding: '20px', backgroundColor: 'rgba(255, 255, 255,0.1)', borderRadius: '20px', border: '1px solid var(--gold-primary)' }}>
            <div style={{ fontSize: '10px', fontWeight: '900', color: 'black', backgroundColor: 'var(--gold-primary)', display: 'inline-block', padding: '2px 6px', borderRadius: '4px', marginBottom: '4px' }}>NETO REAL</div>
            <div className="finance-money" style={{ fontSize: '24px', fontWeight: '950', color: 'white' }}>
              {formatCurrency(cashCloseNetRealUsd * (rates?.usd || 550), '')} <span style={{fontSize: '12px'}}>BS</span>
            </div>
            <div style={{ fontSize: '12px', color: 'white', marginTop: '4px' }}>
              REF: ${formatCurrency(cashCloseNetRealUsd, '')}
            </div>
          </div>
        </div>
      </section>

      {/* Transactions Section */}
      <div className="glass-card" style={{ padding: isMobile ? '20px' : '32px', borderRadius: '28px' }}>
        <div style={{ 
          display: 'flex', 
          flexDirection: isMobile ? 'column' : 'row',
          justifyContent: 'space-between', 
          gap: isMobile ? '16px' : '0',
          marginBottom: '32px',
          alignItems: isMobile ? 'flex-start' : 'center'
        }}>
          <h3 style={{ fontSize: '20px', fontWeight: '700' }}>Historial de Transacciones</h3>
          <div style={{ display: 'flex', gap: '8px', width: isMobile ? '100%' : 'auto' }}>
            <button onClick={handleExport} style={{ 
              flex: 1,
              background: 'var(--bg-tertiary)', 
              border: '1px solid var(--border-color)', 
              color: 'var(--text-secondary)', 
              padding: isMobile ? '10px 12px' : '10px 16px', 
              borderRadius: '12px', 
              display: 'flex', 
              gap: '8px', 
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '13px',
              whiteSpace: 'nowrap',
              minWidth: 0
            }}>
              <Download size={16} /> Exportar
            </button>
            <button onClick={() => showFilterPanel ? handleCloseFilterPanel() : setShowFilterPanel(true)} style={{ 
              flex: 1,
              background: showFilterPanel ? 'var(--gold-primary)' : 'var(--bg-tertiary)', 
              border: '1px solid var(--border-color)', 
              color: showFilterPanel ? 'black' : 'var(--text-secondary)', 
              padding: isMobile ? '10px 12px' : '10px 16px', 
              borderRadius: '12px', 
              display: 'flex', 
              gap: '8px', 
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '13px',
              cursor: 'pointer',
              fontWeight: showFilterPanel ? '850' : '600',
              whiteSpace: 'nowrap',
              minWidth: 0
            }}>
              <Filter size={16} /> {showFilterPanel ? 'Ocultar Filtros' : 'Filtros'}
            </button>
          </div>
        </div>

        {/* HIGH-END TRANSACTIONS FILTER PANEL */}
        {(showFilterPanel || isFilterExiting) && (() => {
          return (
            <div className={`glass-card ${isFilterExiting ? 'animate-slide-down-fade' : 'animate-fade-in'}`} style={{
              padding: '20px',
              borderRadius: '20px',
              marginBottom: '24px',
              backgroundColor: 'rgba(255, 255, 255, 0.01)',
              border: '1px solid rgba(255, 255, 255, 0.05)',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px'
            }}>
              <div style={{
                display: 'grid',
                gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(180px, 1fr))',
                gap: '16px'
              }}>
                {/* Search Input (Cliente) */}
                <div>
                  <label style={{ fontSize: '11px', fontWeight: '800', color: 'var(--text-secondary)', textTransform: 'uppercase', display: 'block', marginBottom: '8px' }}>Buscar por Cliente</label>
                  <div style={{ position: 'relative' }}>
                    <input 
                      type="text" 
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Ej. Luis, Juan..."
                      style={{
                        width: '100%',
                        padding: '10px 12px 10px 36px',
                        borderRadius: '10px',
                        backgroundColor: 'var(--bg-secondary)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        color: 'white',
                        fontSize: '13px',
                        outline: 'none'
                      }}
                    />
                    <Search size={14} style={{ position: 'absolute', left: '12px', top: '13px', color: 'var(--text-muted)' }} />
                  </div>
                </div>

                {/* Service Filter */}
                {/* Service Filter */}
                <div style={{ flex: 1, minWidth: '150px' }}>
                  <PandaSelect 
                    label="Servicio"
                    value={filterService}
                    onChange={setFilterService}
                    options={[
                      { value: 'all', label: 'Todos los Servicios' },
                      ...uniqueServices.map(s => ({ value: s, label: s }))
                    ]}
                  />
                </div>

                {/* Type Select */}
                <div style={{ flex: 1, minWidth: '150px' }}>
                  <PandaSelect 
                    label="Tipo de Movimiento"
                    value={filterType}
                    onChange={setFilterType}
                    options={[
                      { value: 'all', label: 'Todos los Movimientos' },
                      { value: 'income', label: 'Ingresos (+)' },
                      { value: 'expense', label: 'Egresos (-)' }
                    ]}
                  />
                </div>

                {/* Barber Select */}
                <div style={{ flex: 1, minWidth: '150px' }}>
                  <PandaSelect 
                    label="Odontólogo Asignado"
                    value={filterBarber}
                    onChange={setFilterBarber}
                    options={[
                      { value: 'all', label: 'Cualquier Odontólogo', imageUrl: '/panda-team-avatar.png', avatarFallback: 'EQ', subtitle: 'Todo el equipo' },
                      ...staff.filter(s => {
                        const role = s.role?.toLowerCase() || '';
                        return role.includes('barber') || role.includes('estilista') || role.includes('socio') || role.includes('lider');
                      }).map(s => ({
                        value: s.id,
                        label: s.name,
                        imageUrl: s.image_url || s.avatar_url || '',
                        avatarFallback: (s.name || '?').trim().charAt(0).toUpperCase(),
                        subtitle: (s.role || 'Profesional').split('|')[0]
                      }))
                    ]}
                  />
                </div>

                {/* Date Select */}
                <div style={{ flex: 1, minWidth: '150px' }}>
                  <PandaSelect 
                    label="Fecha"
                    value={filterDate}
                    onChange={setFilterDate}
                    options={[
                      { value: 'all', label: 'Todo el Historial' },
                      { value: 'today', label: 'Hoy' },
                      { value: 'yesterday', label: 'Ayer' },
                      { value: 'this_week', label: 'Esta Semana' },
                      { value: 'last_week', label: 'Semana Pasada' },
                      { value: 'this_month', label: 'Este Mes' },
                      { value: 'last_month', label: 'Mes Pasado' },
                      { value: 'custom', label: 'Rango Personalizado' }
                    ]}
                  />
                </div>
              </div>

              {/* Custom Date Range Picker */}
              {filterDate === 'custom' && (
                <div className="animate-fade-in" style={{
                  display: 'flex',
                  gap: '16px',
                  alignItems: 'center',
                  padding: '16px',
                  backgroundColor: 'var(--bg-secondary)',
                  borderRadius: '12px',
                  flexWrap: 'wrap',
                  border: '1px solid rgba(255,255,255,0.05)'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: '700' }}>Desde:</span>
                    <PandaDatePicker 
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                    />
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: '700' }}>Hasta:</span>
                    <PandaDatePicker 
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                    />
                  </div>
                </div>
              )}
            </div>
          );
        })()}

        {isMobile ? (
          /* Mobile Card List */
          <div className="panda-scrollbar" style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '65vh', overflowY: 'auto', paddingRight: '8px' }}>
            {filteredTransactions.length === 0 ? (
              <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>No hay transacciones registradas que coincidan.</div>
            ) : filteredTransactions.map((t, idx) => {
              const { paymentMethod, paymentReference } = parseTxExcel(t);
              const txDate = new Date(t.created_at);
              const currentTxDateStr = txDate.toLocaleDateString();
              const prevTxDateStr = idx > 0 ? new Date(filteredTransactions[idx-1].created_at).toLocaleDateString() : null;
              const showDateHeader = currentTxDateStr !== prevTxDateStr;
              
              let dateLabel = currentTxDateStr;
              if (showDateHeader) {
                const today = new Date();
                const yesterday = new Date();
                yesterday.setDate(yesterday.getDate() - 1);
                if (txDate.toDateString() === today.toDateString()) dateLabel = 'Hoy';
                else if (txDate.toDateString() === yesterday.toDateString()) dateLabel = 'Ayer';
                else dateLabel = txDate.toLocaleDateString('es-VE', { weekday: 'long', day: 'numeric', month: 'short' });
              }

              let titleText = t.description;
              let subtitleText = t.category;
              let isParsed = false;
              
              if (t.description.includes('VENTA FINAL -')) {
                const descParts = t.description.split(' - ');
                const clientPart = descParts.find(p => p.toLowerCase().includes('cliente:'));
                const servicePart = descParts.find(p => p.toLowerCase().includes('servi:'));
                
                if (servicePart) {
                  titleText = servicePart.split(': ')[1] || servicePart;
                }
                if (clientPart) {
                  subtitleText = clientPart.split(': ')[1] || clientPart;
                  isParsed = true;
                }
              } else if (t.category === 'Cierre Semanal') {
                titleText = 'Cierre Semanal';
                subtitleText = t.description;
              }

              return (
                <React.Fragment key={t.id}>
                  {showDateHeader && (
                    <div style={{ padding: '8px 4px 0px 4px', color: 'var(--gold-primary)', fontWeight: '900', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '1px', marginTop: idx === 0 ? '0' : '16px' }}>
                      {dateLabel}
                    </div>
                  )}
                  <div style={{ 
                    backgroundColor: 'rgba(255,255,255,0.02)', 
                    padding: '16px', 
                    borderRadius: '20px',
                    border: '1px solid var(--border-color)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: '12px'
                  }}>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flex: 1, minWidth: 0 }}>
                  <div style={{ 
                    width: '42px', 
                    height: '42px', 
                    flexShrink: 0,
                    backgroundColor: t.type === 'income' ? 'rgba(50, 215, 75, 0.1)' : 'rgba(255, 69, 58, 0.1)',
                    borderRadius: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: t.type === 'income' ? '1px solid rgba(50, 215, 75, 0.2)' : '1px solid rgba(255, 69, 58, 0.2)'
                  }}>
                    {t.type === 'income' ? <Plus size={20} color="#32d74b" /> : <Minus size={20} color="#ff453a" />}
                  </div>
                  <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    <div style={{ fontSize: '14px', fontWeight: '800', color: 'white', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {titleText}
                    </div>
                    <div style={{ fontSize: '12px', color: isParsed ? 'var(--gold-primary)' : 'var(--text-muted)', fontWeight: isParsed ? '800' : '600', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {isParsed ? subtitleText : t.category}
                    </div>
                    <div style={{ fontSize: '10px', color: 'var(--text-secondary)', fontWeight: '600', marginTop: '2px' }}>
                      {new Date(t.created_at).toLocaleString('es-VE', { hour: '2-digit', minute: '2-digit', hour12: true })}
                    </div>
                  </div>
                </div>
                <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', flexShrink: 0 }}>
                  <div className="finance-money" style={{ 
                    fontSize: '15px', 
                    fontWeight: '900', 
                    color: t.type === 'income' ? '#32d74b' : '#ff453a',
                    whiteSpace: 'nowrap',
                    letterSpacing: '-0.5px'
                  }}>
                    {t.type === 'income' ? '+' : '-'}{formatCurrency(t.amount * (t.exchange_rate || rates?.usd || 550), '')} Bs
                  </div>
                  <div style={{ fontSize: '11px', color: 'white', marginTop: '2px', fontWeight: '800', whiteSpace: 'nowrap' }}>
                    ${t.amount.toFixed(2)} USD
                  </div>
                  <div style={{ fontSize: '9px', color: 'var(--text-muted)', marginTop: '4px', letterSpacing: '0.2px', background: 'rgba(255,255,255,0.05)', padding: '3px 6px', borderRadius: '4px', fontWeight: '700', maxWidth: '150px', textAlign: 'right' }}>
                    {paymentMethod}{paymentReference ? ` · Ref. ${paymentReference}` : ''}
                  </div>
                  <div style={{ display: 'flex', gap: '6px', marginTop: '8px' }}>
                    <button onClick={(e) => { e.stopPropagation(); setEditTx({ isOpen: true, transaction: t }); }} style={{ width: '30px', height: '30px', borderRadius: '8px', border: '1px solid rgba(17, 17, 17,.25)', background: 'rgba(17, 17, 17,.08)', color: 'var(--gold-primary)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Edit2 size={13} />
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); handleDeleteTransaction(t); }} style={{ width: '30px', height: '30px', borderRadius: '8px', border: '1px solid rgba(255,69,58,.25)', background: 'rgba(255,69,58,.08)', color: '#ff453a', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              </div>
            </React.Fragment>
            );
          })}
          </div>
        ) : (
          /* Desktop Table - EXCEL STYLE */
          <div className="panda-scrollbar" style={{ overflowX: 'auto', overflowY: 'auto', maxHeight: '500px', paddingRight: '8px' }}>
            <table className="finance-transactions-table" style={{ width: '100%', minWidth: '1090px', tableLayout: 'fixed', borderCollapse: 'separate', borderSpacing: '0 8px', textAlign: 'left' }}>
              <colgroup>
                <col style={{ width: '72px' }} />
                <col style={{ width: '112px' }} />
                <col style={{ width: '165px' }} />
                <col style={{ width: '145px' }} />
                <col style={{ width: '170px' }} />
                <col style={{ width: '150px' }} />
                <col style={{ width: '78px' }} />
                <col style={{ width: '198px' }} />
              </colgroup>
              <thead style={{ position: 'sticky', top: 0, zIndex: 10, backgroundColor: 'var(--bg-secondary)' }}>
                <tr style={{ color: 'var(--text-muted)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: '900' }}>
                  <th style={{ padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}></th>
                  <th style={{ padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>FECHA</th>
                  <th style={{ padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>CLIENTE</th>
                  <th style={{ padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>ODONTÓLOGO</th>
                  <th style={{ padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>SERVICIO</th>
                  <th style={{ padding: '12px 16px', whiteSpace: 'nowrap', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>MÉTODO DE PAGO</th>
                  <th style={{ padding: '12px 16px', textAlign: 'center', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>LIMPIEZA</th>
                  <th style={{ padding: '12px 16px', textAlign: 'right', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>MONTO</th>
                </tr>
              </thead>
              <tbody>
                {filteredTransactions.length === 0 ? (
                  <tr>
                    <td colSpan="7" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>No hay transacciones registradas que coincidan.</td>
                  </tr>
                ) : filteredTransactions.map((t, idx) => {
                  const { clientName, serviceName, barbero, paymentMethod, paymentReference, didWash } = parseTxExcel(t);
                  const isExpanded = selectedTxId === t.id;
                  const isPendingReceivable = t.category === 'Cuentas por Cobrar' && t.metadata?.receivableStatus !== 'paid';
                  const displayAmountUsd = isPendingReceivable ? Number(t.metadata?.nominalTotalUsd || 0) : Number(t.amount || 0);
                  
                  const txDate = new Date(t.created_at);
                  const currentTxDateStr = txDate.toLocaleDateString();
                  const prevTxDateStr = idx > 0 ? new Date(filteredTransactions[idx-1].created_at).toLocaleDateString() : null;
                  const showDateHeader = currentTxDateStr !== prevTxDateStr;
                  
                  let dateLabel = currentTxDateStr;
                  if (showDateHeader) {
                    const today = new Date();
                    const yesterday = new Date();
                    yesterday.setDate(yesterday.getDate() - 1);
                    if (txDate.toDateString() === today.toDateString()) dateLabel = 'Hoy';
                    else if (txDate.toDateString() === yesterday.toDateString()) dateLabel = 'Ayer';
                    else dateLabel = txDate.toLocaleDateString('es-VE', { weekday: 'long', day: 'numeric', month: 'short' });
                  }

                  return (
                    <React.Fragment key={t.id}>
                      {showDateHeader && (
                        <tr>
                          <td colSpan="8" style={{ padding: idx === 0 ? '8px 0 8px 16px' : '24px 0 8px 16px', color: 'var(--gold-primary)', fontWeight: '900', fontSize: '12px', letterSpacing: '1px', textTransform: 'uppercase' }}>
                            {dateLabel}
                          </td>
                        </tr>
                      )}
                      <tr 
                        onClick={() => setSelectedTxId(isExpanded ? null : t.id)}
                        className="table-row-hover" 
                        style={{ 
                          backgroundColor: isExpanded ? 'rgba(255, 255, 255,0.05)' : 'rgba(255,255,255,0.02)',
                          fontSize: '13px',
                          cursor: 'pointer',
                          transition: 'background-color 0.2s',
                          borderLeft: isExpanded ? '4px solid var(--gold-primary)' : '4px solid transparent'
                        }}
                      >
                        <td style={{ padding: '16px', borderRadius: '16px 0 0 16px', width: '56px' }}>
                          <div style={{ 
                            width: '40px', 
                            height: '40px', 
                            backgroundColor: t.type === 'income' ? 'rgba(50, 215, 75, 0.1)' : 'rgba(255, 69, 58, 0.1)',
                            borderRadius: '12px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            border: t.type === 'income' ? '1px solid rgba(50, 215, 75, 0.2)' : '1px solid rgba(255, 69, 58, 0.2)'
                          }}>
                            {t.type === 'income' ? <ArrowUpCircle size={20} color="#32d74b" /> : <ArrowDownCircle size={20} color="#ff453a" />}
                          </div>
                        </td>
                        <td style={{ padding: '16px' }}>
                          <div style={{ fontWeight: '700' }}>{new Date(t.created_at).toLocaleDateString()}</div>
                          <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{new Date(t.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })}</div>
                        </td>
                        <td style={{ padding: '16px', fontWeight: '800', color: 'white' }}>{clientName.toUpperCase()}</td>
                        <td style={{ padding: '16px', fontWeight: '700', color: 'var(--text-secondary)' }}>{barbero}</td>
                        <td style={{ padding: '16px' }}>
                          <span style={{ color: 'var(--gold-primary)', fontWeight: '800' }}>{serviceName}</span>
                        </td>
                        <td style={{ padding: '16px' }}>
                          <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '700' }}>{paymentMethod}</span>
                          {paymentReference && (
                            <div style={{ marginTop: '4px', fontSize: '10px', color: 'var(--gold-primary)', fontWeight: '800' }}>
                              Ref. {paymentReference}
                            </div>
                          )}
                        </td>
                        <td style={{ padding: '16px', textAlign: 'center' }}>
                          <span style={{ 
                            padding: '4px 10px', 
                            borderRadius: '6px', 
                            backgroundColor: didWash === 'Si' ? 'rgba(50, 215, 75, 0.1)' : 'rgba(255,255,255,0.05)',
                            color: didWash === 'Si' ? '#32d74b' : 'var(--text-muted)',
                            fontWeight: '900',
                            fontSize: '11px'
                          }}>
                            {didWash}
                          </span>
                        </td>
                        <td style={{ padding: '16px 14px', textAlign: 'right', borderRadius: '0 12px 12px 0' }}>
                          <div style={{ display: 'flex', flexWrap: 'nowrap', alignItems: 'center', justifyContent: 'flex-end', gap: '8px' }}>
                            <div style={{ minWidth: '108px', flexShrink: 0 }}>
                              <div style={{ 
                                fontWeight: '950', 
                                color: isPendingReceivable ? '#ffb340' : (t.type === 'income' ? '#32d74b' : '#ff453a'),
                                fontSize: '15px',
                                whiteSpace: 'nowrap',
                                fontVariantNumeric: 'tabular-nums'
                              }}>
                                {isPendingReceivable ? '' : (t.type === 'income' ? '+' : '-')}{formatCurrency(displayAmountUsd * (t.exchange_rate || rates?.usd || 550), '')} BS
                              </div>
                              {!t.metadata?.isHistorical && (
                                <div style={{ fontSize: '11px', color: 'white' }}>
                                  {isPendingReceivable ? 'POR COBRAR' : 'REF'}: ${formatCurrency(displayAmountUsd, '')}
                                </div>
                              )}
                            </div>
                            <button onClick={(e) => { e.stopPropagation(); setEditTx({ isOpen: true, transaction: t }); }} style={{ width: '34px', height: '34px', borderRadius: '10px', border: '1px solid rgba(17, 17, 17,.25)', background: 'rgba(17, 17, 17,.06)', color: 'var(--gold-primary)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: '0.2s' }} onMouseEnter={e => { e.currentTarget.style.background = 'rgba(17, 17, 17,.18)'; e.currentTarget.style.borderColor = 'rgba(17, 17, 17,.5)'; }} onMouseLeave={e => { e.currentTarget.style.background = 'rgba(17, 17, 17,.06)'; e.currentTarget.style.borderColor = 'rgba(17, 17, 17,.25)'; }}>
                              <Edit2 size={15} />
                            </button>
                            <button onClick={(e) => { e.stopPropagation(); handleDeleteTransaction(t); }} style={{ width: '34px', height: '34px', borderRadius: '10px', border: '1px solid rgba(255,69,58,.25)', background: 'rgba(255,69,58,.06)', color: '#ff453a', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: '0.2s' }} onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,69,58,.18)'; e.currentTarget.style.borderColor = 'rgba(255,69,58,.5)'; }} onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,69,58,.06)'; e.currentTarget.style.borderColor = 'rgba(255,69,58,.25)'; }}>
                              <Trash2 size={15} />
                            </button>
                          </div>
                        </td>
                      </tr>
                      
                      {isExpanded && (
                        <tr>
                          <td colSpan="8" style={{ padding: '0 0 16px 0' }}>
                            <div className="glass-card animate-slide-down" style={{ 
                              margin: '0 16px', 
                              padding: '24px', 
                              borderRadius: '0 0 20px 20px',
                              background: 'linear-gradient(180deg, rgba(255, 255, 255,0.05), transparent)',
                              border: '1px solid rgba(255, 255, 255,0.1)',
                              borderTop: 'none'
                            }}>
                              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'minmax(0, 1fr) minmax(0, 1fr) 1.2fr', gap: '32px' }}>
                                {/* Detalles del Cliente */}
                                <div>
                                  <div style={{ fontSize: '10px', fontWeight: '900', color: 'var(--gold-primary)', marginBottom: '16px', textTransform: 'uppercase' }}>Detalles del Cliente</div>
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                                      <span style={{ fontSize: '10px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Nombre</span>
                                      <span style={{ fontSize: '14px', fontWeight: '700', color: 'white' }}>{clientName}</span>
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                                      <span style={{ fontSize: '10px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Cédula</span>
                                      <span style={{ fontSize: '14px', fontWeight: '700', color: 'white' }}>{t.metadata?.clientCedula || 'No registrada'}</span>
                                    </div>
                                  </div>
                                </div>

                                {/* Servicio y Extras */}
                                <div>
                                  <div style={{ fontSize: '10px', fontWeight: '900', color: 'var(--gold-primary)', marginBottom: '16px', textTransform: 'uppercase' }}>Servicio y Extras</div>
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                                      <span style={{ fontSize: '10px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Servicio Base</span>
                                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <span style={{ fontSize: '14px', fontWeight: '700', color: 'white' }}>{serviceName}</span>
                                        {serviceName !== 'N/A' && t.type === 'income' && (
                                          <div style={{ textAlign: 'right' }}>
                                            <span style={{ fontSize: '14px', fontWeight: '800', color: 'var(--gold-primary)' }}>
                                              {formatCurrency(Math.max(0, (displayAmountUsd - (t.metadata?.tips_total || 0) - (t.metadata?.extras?.reduce((acc, ex) => acc + (ex.price || 0), 0) || 0) - (t.metadata?.products_sold?.reduce((acc, pr) => acc + (pr.price || 0), 0) || 0))) * (t.exchange_rate || rates?.usd || 550), '')} BS
                                            </span>
                                            <div style={{ fontSize: '10px', color: 'white' }}>
                                              REF: ${formatCurrency(Math.max(0, displayAmountUsd - (t.metadata?.tips_total || 0) - (t.metadata?.extras?.reduce((acc, ex) => acc + (ex.price || 0), 0) || 0) - (t.metadata?.products_sold?.reduce((acc, pr) => acc + (pr.price || 0), 0) || 0)), '')}
                                            </div>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                    <div>
                                      <span style={{ fontSize: '10px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '8px', display: 'block' }}>Extras / Productos</span>
                                      {t.metadata?.extras?.map((ex, i) => (
                                        <div key={`ex-${i}`} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '4px' }}>
                                          <span>{ex.name || ex.service_extras?.name}</span>
                                          <div style={{ textAlign: 'right' }}>
                                            <span style={{ fontWeight: '700', color: 'var(--gold-primary)' }}>+{formatCurrency(ex.price * (t.exchange_rate || rates?.usd || 550), '')} BS</span>
                                            <div style={{ fontSize: '10px', color: 'white' }}>REF: ${formatCurrency(ex.price, '')}</div>
                                          </div>
                                        </div>
                                      ))}
                                      {t.metadata?.products_sold?.map((pr, i) => (
                                        <div key={`pr-${i}`} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '4px' }}>
                                          <span>{pr.name || pr.inventory?.name} ({pr.quantity}u)</span>
                                          <div style={{ textAlign: 'right' }}>
                                            <span style={{ fontWeight: '700', color: 'var(--gold-primary)' }}>+{formatCurrency(pr.price * (t.exchange_rate || rates?.usd || 550), '')} BS</span>
                                            <div style={{ fontSize: '10px', color: 'white' }}>REF: ${formatCurrency(pr.price, '')}</div>
                                          </div>
                                        </div>
                                      ))}
                                      {(!t.metadata?.extras?.length && !t.metadata?.products_sold?.length) && <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Ninguno</div>}
                                    </div>
                                    {t.metadata?.tips_total > 0 && (
                                      <div style={{ borderTop: '1px dashed rgba(255,255,255,0.1)', paddingTop: '12px' }}>
                                        <span style={{ fontSize: '10px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '8px', display: 'block' }}>Propinas Recibidas</span>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                                          <span>Total Propinas</span>
                                          <div style={{ textAlign: 'right' }}>
                                            <span style={{ fontWeight: '700', color: 'var(--gold-primary)' }}>+{formatCurrency(t.metadata.tips_total * (t.exchange_rate || rates?.usd || 550), '')} BS</span>
                                            <div style={{ fontSize: '10px', color: 'white' }}>REF: ${formatCurrency(t.metadata.tips_total, '')}</div>
                                          </div>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                </div>

                                {/* Liquidación */}
                                <div>
                                  <div style={{ fontSize: '10px', fontWeight: '900', color: 'var(--gold-primary)', marginBottom: '16px', textTransform: 'uppercase' }}>Liquidación y Ganancias</div>
                                  <div className="glass-card" style={{ padding: '20px', borderRadius: '16px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255, 255, 255,0.1)', marginBottom: '24px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                                      <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Venta Bruta (Serv + Ext + Prod)</span>
                                      <div style={{ textAlign: 'right' }}>
                                        <span style={{ fontSize: '14px', fontWeight: '800', color: 'white' }}>{formatCurrency((displayAmountUsd - (t.metadata?.tips_total || 0)) * (t.exchange_rate || rates?.usd || 550), '')} BS</span>
                                        <div style={{ fontSize: '10px', color: 'white' }}>REF: ${formatCurrency(displayAmountUsd - (t.metadata?.tips_total || 0), '')}</div>
                                      </div>
                                    </div>
                                    {t.metadata?.tips_total > 0 && (
                                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', borderBottom: '1px dashed rgba(255,255,255,0.1)', paddingBottom: '12px' }}>
                                        <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Propinas Totales</span>
                                        <div style={{ textAlign: 'right' }}>
                                          <span style={{ fontSize: '14px', fontWeight: '800', color: 'var(--gold-primary)' }}>+{formatCurrency(t.metadata.tips_total * (t.exchange_rate || rates?.usd || 550), '')} BS</span>
                                          <div style={{ fontSize: '10px', color: 'white' }}>REF: ${formatCurrency(t.metadata.tips_total, '')}</div>
                                        </div>
                                      </div>
                                    )}
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                                      <span style={{ fontSize: '14px', color: 'white', fontWeight: '900' }}>{isPendingReceivable ? 'TOTAL POR COBRAR' : 'TOTAL COBRADO'}</span>
                                      <div style={{ textAlign: 'right' }}>
                                        <span style={{ fontSize: '18px', fontWeight: '900', color: isPendingReceivable ? '#ffb340' : 'var(--gold-primary)' }}>{formatCurrency(displayAmountUsd * (t.exchange_rate || rates?.usd || 550), '')} BS</span>
                                        <div style={{ fontSize: '12px', color: 'white' }}>REF: ${formatCurrency(displayAmountUsd, '')}</div>
                                      </div>
                                    </div>

                                    {/* Información de pago */}
                                    {isPendingReceivable && <div style={{ backgroundColor: 'rgba(255,159,10,.08)', color: '#ffcc80', padding: '12px', borderRadius: '12px', marginBottom: '16px', border: '1px solid rgba(255,159,10,.2)', fontSize: '12px', fontWeight: 800 }}>Fiado pendiente: todavía no ha ingresado dinero a ninguna cuenta.</div>}
                                    {!isPendingReceivable && <div style={{ backgroundColor: 'var(--bg-secondary)', padding: '12px', borderRadius: '12px', marginBottom: '16px' }}>
                                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                                        <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Efectivo USD:</span>
                                        <span style={{ fontSize: '11px', fontWeight: '800' }}>${formatCurrency(t.metadata?.cash_usd || t.metadata?.cashUsd || (t.type === 'income' && !(t.metadata?.transfer_bs || t.metadata?.transferBs) ? t.amount : 0), '')}</span>
                                      </div>
                                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                        <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{t.metadata?.method_bs || 'Pago Móvil'} (Bs):</span>
                                        <span style={{ fontSize: '11px', fontWeight: '800' }}>{formatCurrency(t.metadata?.transfer_bs || t.metadata?.transferBs || 0, '')} BS</span>
                                      </div>
                                      {(t.metadata?.payment_reference_bs || t.metadata?.paymentReferenceBs) && (
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px', paddingTop: '6px', borderTop: '1px dashed rgba(255,255,255,0.08)' }}>
                                          <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Referencia:</span>
                                          <span style={{ fontSize: '11px', fontWeight: '900', color: 'var(--gold-primary)' }}>{t.metadata?.payment_reference_bs || t.metadata?.paymentReferenceBs}</span>
                                        </div>
                                      )}
                                    </div>}

                                    <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '16px' }}>
                                      <span style={{ fontSize: '10px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '12px', display: 'block' }}>Desglose de Personal</span>
                                      {(isPendingReceivable ? t.metadata?.pendingStaffInvolved : t.metadata?.staffInvolved)?.length > 0 ? (isPendingReceivable ? t.metadata.pendingStaffInvolved : t.metadata.staffInvolved).map((s, idx) => (
                                        <div key={idx} style={{ marginBottom: '8px', padding: '10px', borderRadius: '12px', background: 'rgba(255,255,255,0.03)' }}>
                                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <div>
                                              <span style={{ fontSize: '13px', fontWeight: '700', color: 'white', display: 'block' }}>{s.name}</span>
                                              <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{s.role?.split('|')[0] || 'Personal'}</span>
                                            </div>
                                            <div style={{ textAlign: 'right' }}>
                                              <div style={{ fontSize: '13px', fontWeight: '900', color: 'var(--gold-primary)' }}>+{formatCurrency((s.commissionEarned || 0) * (t.exchange_rate || rates?.usd || 550), '')} BS Comisión</div>
                                              <div style={{ fontSize: '10px', color: 'white' }}>REF: ${formatCurrency(s.commissionEarned || 0, '')}</div>
                                              {s.tip > 0 && <div style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: '600', marginTop: '4px' }}>+{formatCurrency(s.tip * (t.exchange_rate || rates?.usd || 550), '')} BS Propina (REF: <span style={{color: 'white'}}>${formatCurrency(s.tip, '')}</span>)</div>}
                                            </div>
                                          </div>
                                        </div>
                                      )) : (
                                        <div style={{ fontSize: '12px', color: 'var(--text-muted)', textAlign: 'center' }}>Operación manual / No vinculada a personal.</div>
                                      )}
                                    </div>

                                    {/* GANANCIA DE LA CLÍNICA */}
                                    <div style={{ marginTop: '16px', padding: '16px', borderRadius: '12px', background: 'rgba(255, 255, 255,0.1)', border: '1px solid rgba(255, 255, 255,0.2)' }}>
                                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                        <span style={{ fontSize: '14px', fontWeight: '900', color: 'var(--gold-primary)' }}>{isPendingReceivable ? 'Ganancia de la clínica pendiente' : 'Ganancia de la clínica'}</span>
                                        <div style={{ textAlign: 'right' }}>
                                          <span style={{ fontSize: '16px', fontWeight: '950', color: '#32d74b' }}>
                                            {formatCurrency(((displayAmountUsd - (t.metadata?.tips_total || 0)) - ((isPendingReceivable ? t.metadata?.pendingStaffInvolved : t.metadata?.staffInvolved)?.reduce((acc, s) => acc + (s.commissionEarned || 0), 0) || 0)) * (t.exchange_rate || rates?.usd || 550), '')} BS
                                          </span>
                                          <div style={{ fontSize: '12px', color: 'white', fontWeight: '700' }}>
                                            REF: ${formatCurrency((displayAmountUsd - (t.metadata?.tips_total || 0)) - ((isPendingReceivable ? t.metadata?.pendingStaffInvolved : t.metadata?.staffInvolved)?.reduce((acc, s) => acc + (s.commissionEarned || 0), 0) || 0), '')}
                                          </div>
                                        </div>
                                      </div>
                                      <div style={{ fontSize: '12px', color: 'white', display: 'flex', flexDirection: 'column', gap: '4px', borderTop: '1px dashed rgba(255, 255, 255,0.2)', paddingTop: '12px', marginTop: '12px' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                          <span>Venta Bruta:</span>
                                          <span>{formatCurrency((displayAmountUsd - (t.metadata?.tips_total || 0)) * (t.exchange_rate || rates?.usd || 550), '')} BS</span>
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', color: '#ff453a' }}>
                                          <span>- Comisiones {isPendingReceivable ? 'Pendientes' : 'Pagadas'}:</span>
                                          <span>{formatCurrency(((isPendingReceivable ? t.metadata?.pendingStaffInvolved : t.metadata?.staffInvolved)?.reduce((acc, s) => acc + (s.commissionEarned || 0), 0) || 0) * (t.exchange_rate || rates?.usd || 550), '')} BS</span>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
      </>
      )}


      {activeTab === 'receivables' && (
        <section style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, minmax(0, 1fr))', gap: '14px' }}>
            <div className="glass-card" style={{ padding: '22px', borderRadius: '20px' }}><div style={{ color: 'var(--text-muted)', fontSize: '11px', fontWeight: 800 }}>TOTAL PENDIENTE</div><div style={{ color: '#ff9f0a', fontSize: '28px', fontWeight: 950, marginTop: '7px' }}>{formatCurrency(totalReceivableBs, '')} Bs</div><div style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>REF: ${formatCurrency(totalReceivableUsd, '')}</div></div>
            <div className="glass-card" style={{ padding: '22px', borderRadius: '20px' }}><div style={{ color: 'var(--text-muted)', fontSize: '11px', fontWeight: 800 }}>CLIENTES / CUENTAS</div><div style={{ color: 'white', fontSize: '28px', fontWeight: 950, marginTop: '7px' }}>{receivableTransactions.length}</div><div style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>Pendientes de cobro</div></div>
          </div>
          <div className="glass-card" style={{ padding: isMobile ? '15px' : '22px', borderRadius: '22px' }}>
            <h3 style={{ margin: '0 0 16px', fontSize: '18px' }}>Cuentas por cobrar</h3>
            {receivableTransactions.length === 0 ? <div style={{ padding: '40px 10px', textAlign: 'center', color: 'var(--text-muted)' }}>No hay cuentas pendientes.</div> : <div style={{ display: 'grid', gap: '9px' }}>
              {receivableTransactions.map(transaction => {
                const meta = transaction.metadata || {};
                const usd = Number(meta.nominalTotalUsd || 0);
                const bs = usd * Number(transaction.exchange_rate || rates?.usd || 1);
                // Barbero(s) que atendió: de serviceStaff, o de las citas, o el barbero principal.
                const barber = Array.from(new Set([
                  ...(meta.serviceStaff || []).map(s => s.name),
                  ...(meta.appointments || []).map(a => a.barberName || a.staffName)
                ].filter(Boolean))).join(', ') || meta.barberName || '';
                return <article key={transaction.id} style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1.2fr 1.3fr .9fr auto', gap: '12px', alignItems: 'center', padding: '14px 16px', borderRadius: '14px', background: 'rgba(255,255,255,.025)', border: '1px solid rgba(255,159,10,.18)' }}>
                  <div><strong style={{ display: 'block' }}>{meta.clientName || 'Cliente'}</strong><small style={{ color: 'var(--text-muted)' }}>{new Date(transaction.created_at).toLocaleDateString('es-VE')}</small></div>
                  <div style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>{meta.serviceName || 'Servicio'}{barber && <span style={{ display: 'block', color: 'var(--gold-primary)', fontSize: '11px', fontWeight: 700, marginTop: '2px' }}>✂ {barber}</span>}</div>
                  <div><strong style={{ color: '#ff9f0a' }}>{formatCurrency(bs, '')} Bs</strong><small style={{ display: 'block', color: 'var(--text-muted)' }}>${formatCurrency(usd, '')}</small></div>
                  <div style={{ justifySelf: isMobile ? 'stretch' : 'end', display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}><span style={{ padding: '6px 9px', borderRadius: '999px', background: 'rgba(255,159,10,.12)', color: '#ffb340', fontSize: '9px', fontWeight: 900 }}>PENDIENTE</span><button type="button" onClick={() => setReceivablePayment({ isOpen: true, transaction })} className="btn-gold" style={{ borderRadius: 10, padding: '9px 13px', fontSize: 11, fontWeight: 900, cursor: 'pointer' }}>Registrar pago</button></div>
                </article>;
              })}
            </div>}
          </div>
        </section>
      )}

      {activeTab === 'payroll' && (
          <div className="animate-fade-in">
             <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', justifyContent: 'space-between', alignItems: isMobile ? 'stretch' : 'center', gap: '20px', marginBottom: '24px' }}>
              <div>
                <h3 style={{ fontSize: '14px', fontWeight: '800', color: 'var(--text-secondary)', letterSpacing: '1px', margin: 0 }}>NÓMINA · CUENTA CORRIENTE</h3>
                <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: '6px 0 0' }}>Saldo acumulado hasta hoy: total ganado − total pagado. El análisis por semana está en Rentabilidad.</p>
              </div>
            </div>

            {/* Filtro de tarjetas de nómina (Panda se movió al tab "Barbería") */}
            <div style={{ display: 'flex', justifyContent: isMobile ? 'stretch' : 'flex-end', marginBottom: '24px' }}>
              <div style={{ display: 'inline-flex', width: isMobile ? '100%' : 'auto', padding: '4px', borderRadius: '14px', background: 'var(--bg-secondary)', border: '1px solid rgba(255,255,255,.08)', gap: '4px' }}>
                {[
                  { value: 'all', label: `Todos (${payrollStaff.length})` },
                  { value: 'movement', label: `Con movimiento (${payrollWithMovement.length})` }
                ].map(option => {
                  const active = payrollCardsFilter === option.value;
                  return <button key={option.value} type="button" onClick={() => setPayrollCardsFilter(option.value)} style={{ flex: isMobile ? 1 : 'none', padding: isMobile ? '10px 12px' : '9px 14px', borderRadius: '10px', border: active ? '1px solid rgba(17, 17, 17,.5)' : '1px solid transparent', background: active ? 'var(--gold-primary)' : 'transparent', color: active ? '#0b0b0c' : 'var(--text-secondary)', fontSize: '11px', fontWeight: 900, whiteSpace: 'nowrap', cursor: 'pointer', transition: 'background .2s ease, color .2s ease' }}>{option.label}</button>;
                })}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px' }}>
              {visiblePayroll.length === 0 ? (
                <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>{payrollCardsFilter === 'movement' ? 'No hay personal con movimientos en este período.' : 'No hay personal disponible.'}</div>
              ) : visiblePayroll.map(st => {
                const balanceUsd = st.balanceBs / (rates?.usd || 550);
                const hasPendingPayment = st.balanceBs > 0.01;
                const hasNegativeBalance = st.balanceBs < -0.01;
                const totalDeductionsBs = (st.valesBs || 0) + (st.consumptionsBs || 0) + (st.exchangeChargesBs || 0) + (st.paidBs || 0);

                return (
                <div key={st.id} className="glass-card animate-fade-in" style={{ 
                  padding: '22px', 
                  borderRadius: '24px',
                  background: 'var(--bg-secondary)',
                  border: st.isAssistant ? '1px solid rgba(0, 191, 255, 0.25)' : (hasPendingPayment ? '1px solid rgba(17, 17, 17,0.22)' : '1px solid rgba(255,255,255,0.08)'),
                  boxShadow: hasPendingPayment ? '0 16px 36px -10px rgba(0,0,0,0.7), 0 0 24px -6px rgba(17, 17, 17,0.1)' : '0 14px 30px -10px rgba(0,0,0,0.6)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '14px',
                  position: 'relative'
                }}>
                  {/* Header: Avatar, Info, Status Badge */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
                      <div style={{ 
                        width: '46px', 
                        height: '46px', 
                        borderRadius: '14px', 
                        overflow: 'hidden',
                        background: st.isAssistant ? 'rgba(0,191,255,0.1)' : 'rgba(255, 255, 255,0.06)', 
                        border: st.isAssistant ? '1.5px solid rgba(0,191,255,0.35)' : '1.5px solid rgba(17, 17, 17,0.3)',
                        boxShadow: st.isAssistant ? '0 0 12px rgba(0,191,255,0.15)' : '0 0 12px rgba(17, 17, 17,0.15)',
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center', 
                        color: st.isAssistant ? '#00bfff' : 'var(--gold-primary)', 
                        fontWeight: '900', 
                        fontSize: '18px',
                        flexShrink: 0
                      }}>
                        {st.image_url ? (
                          <img 
                            loading="lazy" 
                            src={st.image_url} 
                            alt={st.name} 
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                          />
                        ) : (
                          <span>{st.name.charAt(0).toUpperCase()}</span>
                        )}
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontWeight: '800', fontSize: '16px', color: 'white', letterSpacing: '-0.3px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{st.name}</div>
                        <div style={{ fontSize: '10.5px', color: st.isAssistant ? '#00bfff' : 'var(--gold-primary)', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.4px', marginTop: '1px' }}>
                          {st.role?.split('|')[0] || 'Miembro'}
                        </div>
                      </div>
                    </div>

                    {/* Status Pill */}
                    <div style={{ flexShrink: 0 }}>
                      {st.isSupportStaff ? (
                        (st.monthlySalaryUsd - st.salaryPaidMonthUsd) > 0.01 ? (
                          <span style={{ fontSize: '10px', fontWeight: '900', color: '#ff9f0a', background: 'rgba(255,159,10,0.12)', border: '1px solid rgba(255,159,10,0.28)', padding: '4px 8px', borderRadius: '100px', whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            <Clock size={11} color="#ff9f0a" /> Pendiente: ${formatCurrency(st.monthlySalaryUsd - st.salaryPaidMonthUsd, '')}
                          </span>
                        ) : (
                          <span style={{ fontSize: '10px', fontWeight: '900', color: '#32d74b', background: 'rgba(50,215,75,0.12)', border: '1px solid rgba(50,215,75,0.25)', padding: '4px 8px', borderRadius: '100px', whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            <CheckCircle2 size={11} color="#32d74b" /> Cubierto
                          </span>
                        )
                      ) : (
                        hasPendingPayment ? (
                          <span style={{ fontSize: '10px', fontWeight: '900', color: 'var(--gold-primary)', background: 'rgba(17, 17, 17,0.12)', border: '1px solid rgba(17, 17, 17,0.3)', padding: '4px 8px', borderRadius: '100px', whiteSpace: 'nowrap', boxShadow: '0 0 10px rgba(17, 17, 17,0.1)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            <Banknote size={11} color="var(--gold-primary)" /> ${formatCurrency(balanceUsd, '')} USD
                          </span>
                        ) : hasNegativeBalance ? (
                          <span style={{ fontSize: '10px', fontWeight: '900', color: '#ff453a', background: 'rgba(255,69,58,0.12)', border: '1px solid rgba(255,69,58,0.28)', padding: '4px 8px', borderRadius: '100px', whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            <AlertCircle size={11} color="#ff453a" /> Vale: -${formatCurrency(Math.abs(balanceUsd), '')} USD
                          </span>
                        ) : (
                          <span style={{ fontSize: '10px', fontWeight: '900', color: '#32d74b', background: 'rgba(50,215,75,0.1)', border: '1px solid rgba(50,215,75,0.2)', padding: '4px 8px', borderRadius: '100px', whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            <CheckCircle2 size={11} color="#32d74b" /> Al día
                          </span>
                        )
                      )}
                    </div>
                  </div>

                  {/* Mini Activity Badges */}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', alignItems: 'center' }}>
                    {st.isBarber ? (
                      <>
                        <span style={{ fontSize: '10.5px', fontWeight: '750', color: 'rgba(255,255,255,0.85)', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', padding: '3px 7px', borderRadius: '7px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          <Scissors size={11} color="var(--gold-primary)" /> {st.servicesCount} {st.servicesCount === 1 ? 'servicio' : 'servicios'}
                        </span>
                        <span style={{ fontSize: '10.5px', fontWeight: '750', color: 'rgba(255,255,255,0.85)', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', padding: '3px 7px', borderRadius: '7px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          <Droplets size={11} color="#64d2ff" /> {st.lavadosCount} {st.lavadosCount === 1 ? 'limpieza' : 'limpiezas'}
                        </span>
                        {st.propinasBs > 0 && (
                          <span title="Propinas recibidas" style={{ fontSize: '10.5px', fontWeight: '800', color: '#32d74b', background: 'rgba(50,215,75,0.08)', border: '1px solid rgba(50,215,75,0.2)', padding: '3px 7px', borderRadius: '7px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            <Gift size={11} color="#32d74b" /> Propina: +{formatCurrency(st.propinasBs, '')} Bs
                          </span>
                        )}
                      </>
                    ) : st.isAssistant ? (
                      <>
                        <span style={{ fontSize: '10.5px', fontWeight: '750', color: 'rgba(255,255,255,0.85)', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', padding: '3px 7px', borderRadius: '7px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          <Droplets size={11} color="#00bfff" /> {st.lavadosCount} limpiezas
                        </span>
                        <span style={{ fontSize: '10.5px', fontWeight: '800', color: '#00bfff', background: 'rgba(0,191,255,0.08)', border: '1px solid rgba(0,191,255,0.2)', padding: '3px 7px', borderRadius: '7px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          <Calendar size={11} color="#00bfff" /> Asistencia: {formatCurrency(st.weeklyAssistanceBs, '')} Bs
                        </span>
                      </>
                    ) : (
                      st.isSupportStaff && (
                        <>
                          <span style={{ fontSize: '10.5px', fontWeight: '750', color: 'rgba(255,255,255,0.85)', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', padding: '3px 7px', borderRadius: '7px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            <WalletCards size={11} color="var(--gold-primary)" /> Salario: ${st.monthlySalaryUsd > 0 ? formatCurrency(st.monthlySalaryUsd, '') : '0'} USD/mes
                          </span>
                          <span style={{ fontSize: '10.5px', fontWeight: '800', color: '#32d74b', background: 'rgba(50,215,75,0.08)', border: '1px solid rgba(50,215,75,0.2)', padding: '3px 7px', borderRadius: '7px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            <CheckCircle2 size={11} color="#32d74b" /> Pagado: ${formatCurrency(st.salaryPaidMonthUsd, '')} USD
                          </span>
                        </>
                      )
                    )}
                  </div>

                  {/* Panel Hero Financiero (Saldo Destacado) */}
                  <div style={{ 
                    background: hasPendingPayment 
                      ? 'linear-gradient(135deg, rgba(17, 17, 17,0.08) 0%, rgba(17, 17, 17,0.02) 100%)' 
                      : (hasNegativeBalance ? 'linear-gradient(135deg, rgba(255,69,58,0.08) 0%, rgba(255,69,58,0.02) 100%)' : 'rgba(255,255,255,0.02)'),
                    border: hasPendingPayment 
                      ? '1px solid rgba(17, 17, 17,0.22)' 
                      : (hasNegativeBalance ? '1px solid rgba(255,69,58,0.22)' : '1px solid rgba(255,255,255,0.05)'),
                    borderRadius: '18px', 
                    padding: '16px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '8px' }}>
                      <div>
                        <span style={{ 
                          fontSize: '10px', 
                          fontWeight: '900', 
                          color: hasNegativeBalance ? '#ff6961' : (hasPendingPayment ? 'var(--gold-primary)' : 'var(--text-muted)'),
                          textTransform: 'uppercase',
                          letterSpacing: '0.6px',
                          display: 'block'
                        }}>
                          {st.isSupportStaff ? 'Pendiente del mes' : (hasNegativeBalance ? 'Saldo por recuperar' : 'Por Pagar (Saldo Neto)')}
                        </span>
                        <div style={{ 
                          fontSize: '22px', 
                          fontWeight: '950', 
                          color: hasNegativeBalance ? '#ff453a' : (hasPendingPayment ? '#32d74b' : 'white'),
                          letterSpacing: '-0.5px',
                          marginTop: '2px',
                          lineHeight: '1.2'
                        }}>
                          {st.isSupportStaff 
                            ? `$${formatCurrency(Math.max(0, st.monthlySalaryUsd - st.salaryPaidMonthUsd), '')} USD`
                            : `${formatCurrency(st.balanceBs, '')} Bs.`}
                        </div>
                      </div>

                      {!st.isSupportStaff && (
                        <div style={{ 
                          padding: '4px 9px', 
                          borderRadius: '8px', 
                          background: hasPendingPayment ? 'rgba(17, 17, 17,0.12)' : 'rgba(255,255,255,0.05)', 
                          border: hasPendingPayment ? '1px solid rgba(17, 17, 17,0.25)' : '1px solid rgba(255,255,255,0.08)',
                          fontSize: '12px', 
                          fontWeight: '850', 
                          color: hasPendingPayment ? 'var(--gold-primary)' : 'var(--text-secondary)'
                        }}>
                          ≈ ${formatCurrency(balanceUsd, '')} USD
                        </div>
                      )}
                    </div>

                    {/* Resumen Comparativo: Generado vs Vales */}
                    {!st.isSupportStaff && (
                      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: '8px', paddingTop: '10px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                        <div style={{ background: 'rgba(255,255,255,0.02)', padding: '8px 10px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.03)' }}>
                          <span style={{ fontSize: '9.5px', color: 'var(--text-muted)', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <TrendingUp size={11} color="#32d74b" /> Generado neto
                          </span>
                          <span style={{ fontSize: '12px', fontWeight: '850', color: 'white' }}>
                            {formatCurrency(st.netIncomeBs + (st.propinasBs || 0), '')} Bs
                          </span>
                        </div>
                        <div style={{ background: 'rgba(255,255,255,0.02)', padding: '8px 10px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.03)' }}>
                          <span style={{ fontSize: '9.5px', color: 'var(--text-muted)', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <TrendingDown size={11} color="#ff6961" /> Vales / Pagos
                          </span>
                          <span style={{ fontSize: '12px', fontWeight: '850', color: '#ff6961' }}>
                            -{formatCurrency(totalDeductionsBs, '')} Bs
                          </span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Desglose por Método */}
                  {Object.keys(st.methodBreakdown || {}).length > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <span style={{ fontSize: '9.5px', color: 'var(--text-muted)', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '0.6px' }}>
                        Desglose de Pago
                      </span>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                        {Object.entries(st.methodBreakdown).sort((a, b) => b[1] - a[1]).map(([method, amountBs]) => {
                          const isUsdAccount = /efectivo \(\$\)|zelle|zinli|binance|usdt/i.test(method);
                          const usdAmount = Number(st.methodBreakdownUsd?.[method] || 0);
                          const isPagoMovil = /pago m[oó]vil/i.test(method);
                          const isPunto = /punto/i.test(method);
                          const isZelle = /zelle/i.test(method);

                          return (
                            <div key={method} style={{ 
                              display: 'inline-flex', 
                              alignItems: 'center', 
                              gap: '5px', 
                              padding: '4px 8px', 
                              borderRadius: '8px', 
                              background: 'rgba(255,255,255,0.03)', 
                              border: '1px solid rgba(255,255,255,0.06)',
                              fontSize: '11px'
                            }}>
                              {isPagoMovil ? <Send size={11} color="#32d74b" /> :
                               isPunto ? <CreditCard size={11} color="#60a5fa" /> :
                               isZelle ? <Landmark size={11} color="#64d2ff" /> :
                               <Banknote size={11} color="var(--gold-primary)" />}
                              <span style={{ color: 'var(--text-secondary)', fontWeight: '600' }}>{method.split(' ')[0]}:</span>
                              <span style={{ fontWeight: '850', color: isUsdAccount ? 'var(--gold-primary)' : '#32d74b' }}>
                                {isUsdAccount ? `$${formatCurrency(usdAmount, '')}` : `${formatCurrency(amountBs, '')} Bs`}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '8px', marginTop: 'auto' }}>
                    <button 
                      onClick={() => setPayrollDetail({ isOpen: true, staff: st, transactions: st.staffTransactions })}
                      style={{ minWidth: 0, padding: '10px 6px', borderRadius: '12px', background: 'rgba(255,255,255,0.05)', color: 'white', border: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px', cursor: 'pointer', transition: 'all 0.2s ease' }}
                      onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                    >
                      <Eye size={14} color="var(--text-secondary)" /> <span style={{fontSize: '11px', fontWeight: '800'}}>Detalle</span>
                    </button>

                    {st.isSupportStaff && (
                      <button
                        onClick={() => setSalaryConfigModal({ isOpen: true, staff: st, amountUsd: st.monthlySalaryUsd > 0 ? String(st.monthlySalaryUsd) : '' })}
                        style={{ minWidth: 0, padding: '10px 6px', borderRadius: '12px', background: 'rgba(17, 17, 17,.09)', color: 'var(--gold-primary)', border: '1px solid rgba(17, 17, 17,.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px', cursor: 'pointer', transition: 'all 0.2s ease' }}
                        onMouseEnter={e => e.currentTarget.style.background = 'rgba(17, 17, 17,.18)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'rgba(17, 17, 17,.09)'}
                      >
                        <WalletCards size={14} /> <span style={{ fontSize: '11px', fontWeight: '850' }}>Salario</span>
                      </button>
                    )}
                    <button
                      onClick={() => openStaffConsumption(st)}
                      style={{ minWidth: 0, padding: '10px 6px', borderRadius: '12px', background: 'rgba(255,159,10,.09)', color: '#ffb340', border: '1px solid rgba(255,159,10,.22)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px', cursor: 'pointer', transition: 'all 0.2s ease' }}
                      onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,159,10,.18)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,159,10,.09)'}
                    >
                      <ShoppingBag size={14} /> <span style={{ fontSize: '11px', fontWeight: '850' }}>Consumo</span>
                    </button>

                    {(st.isBarber || st.isAssistant || st.isBarista || st.isSupportStaff) && (
                      <button
                        onClick={() => {
                          setValeModal({
                            isOpen: true,
                            staff: st,
                            amountBs: '',
                            paymentMethod: 'Efectivo ($)',
                            note: '',
                            allocations: {},
                            maxBalance: st.balanceBs
                          });
                        }}
                        style={{ minWidth: 0, padding: '10px 6px', borderRadius: '12px', background: 'rgba(255, 69, 58, 0.09)', color: '#ff6961', border: '1px solid rgba(255, 69, 58, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px', cursor: 'pointer', transition: 'all 0.2s ease' }}
                        onMouseEnter={e => e.currentTarget.style.background = 'rgba(255, 69, 58, 0.18)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'rgba(255, 69, 58, 0.09)'}
                      >
                        <Minus size={14} /> <span style={{fontSize: '11px', fontWeight: '800'}}>Vale</span>
                      </button>
                    )}

                    {st.isSupportStaff ? (
                      <button
                        onClick={() => setSalaryModal({ isOpen: true, staff: st, amountBs: '', paymentMethod: 'Efectivo ($)', note: '' })}
                        style={{ gridColumn: '1 / -1', width: '100%', padding: '12px', borderRadius: '14px', background: 'var(--gold-primary)', color: '#000', fontWeight: '950', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', boxShadow: '0 4px 14px rgba(17, 17, 17,0.25)', transition: 'all 0.2s ease' }}
                        onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.01)'}
                        onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
                      >
                        <WalletCards size={16} /> Registrar Pago de Salario
                      </button>
                    ) : (
                      <button
                        onClick={() => openPayrollSettlement(st, false)}
                        disabled={st.balanceBs <= 0 || settlementLoadingId != null}
                        style={{ 
                          gridColumn: '1 / -1', 
                          width: '100%', 
                          padding: '12px', 
                          borderRadius: '14px', 
                          background: st.balanceBs > 0 ? 'var(--gold-primary)' : 'rgba(255,255,255,0.04)', 
                          color: st.balanceBs > 0 ? '#000' : 'var(--text-muted)', 
                          fontWeight: '950', 
                          border: st.balanceBs > 0 ? 'none' : '1px solid rgba(255,255,255,0.06)', 
                          cursor: (st.balanceBs > 0 && settlementLoadingId == null) ? 'pointer' : 'not-allowed', 
                          opacity: (settlementLoadingId != null && settlementLoadingId !== st.id) ? 0.5 : 1, 
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'center', 
                          gap: '8px',
                          boxShadow: st.balanceBs > 0 ? '0 4px 16px rgba(17, 17, 17,0.25)' : 'none',
                          transition: 'all 0.2s ease'
                        }}
                        onMouseEnter={e => { if (st.balanceBs > 0 && !settlementLoadingId) e.currentTarget.style.transform = 'scale(1.01)'; }}
                        onMouseLeave={e => { if (st.balanceBs > 0 && !settlementLoadingId) e.currentTarget.style.transform = 'scale(1)'; }}
                      >
                        {settlementLoadingId === st.id ? (
                          'Cargando…'
                        ) : st.balanceBs > 0 ? (
                          <>
                            <Banknote size={16} color="black" /> Realizar Pago (${formatCurrency(balanceUsd, '')} USD)
                          </>
                        ) : (
                          <>
                            <CheckCircle2 size={16} color="var(--text-muted)" /> Al día (Sin saldo pendiente)
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>
                );
              })}
            </div>

            {/* Historial de Nómina */}
            <div className="glass-card animate-slide-up" style={{ marginTop: '40px', padding: '24px', borderRadius: '24px', border: '1.5px solid rgba(255, 255, 255, 0.08)' }}>
              <h3 style={{ fontSize: '18px', fontWeight: '800', marginBottom: '16px', color: 'white', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <WalletCards size={20} color="var(--gold-primary)" /> Historial de Pagos de Nómina
              </h3>
              
              {payrollHistory.length === 0 ? (
                <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)' }}>No hay pagos registrados.</div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: isMobile ? '0' : '600px' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)', color: 'var(--text-secondary)', fontSize: '12px' }}>
                        <th style={{ padding: '12px 16px' }}>FECHA</th>
                        <th style={{ padding: '12px 16px' }}>COLABORADOR</th>
                        <th style={{ padding: '12px 16px' }}>DESCRIPCIÓN</th>
                        <th style={{ padding: '12px 16px' }}>MÉTODO</th>
                        <th style={{ padding: '12px 16px', textAlign: 'right' }}>MONTO (VES)</th>
                        <th style={{ padding: '12px 16px', textAlign: 'right' }}>MONTO (USD)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {payrollHistory.map(tx => {
                        const date = new Date(tx.created_at).toLocaleDateString('es-VE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true });
                        const staffId = tx.metadata?.staffId;
                        const staffMember = staff.find(s => s.id === staffId);
                        const staffName = staffMember ? staffMember.name : (tx.description.split(':')?.[1]?.split('(')?.[0]?.trim() || 'Colaborador');
                        const method = tx.metadata?.paymentMethod || 'Efectivo';
                        const amountBs = tx.metadata?.amountBs || (tx.amount * (tx.exchange_rate || rates?.usd || 550));
                        
                        return (
                          <tr key={tx.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', fontSize: '13px', color: 'white' }}>
                            <td style={{ padding: '12px 16px', color: 'var(--text-secondary)' }}>{date}</td>
                            <td style={{ padding: '12px 16px', fontWeight: '700' }}>{staffName}</td>
                            <td style={{ padding: '12px 16px', color: 'var(--text-secondary)' }}>{tx.description}</td>
                            <td style={{ padding: '12px 16px' }}>
                              <span style={{ backgroundColor: 'rgba(255,255,255,0.05)', padding: '4px 8px', borderRadius: '8px', fontSize: '11px', fontWeight: '800' }}>
                                {method}
                              </span>
                            </td>
                            <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: '700', color: '#ff453a' }}>
                              -{amountBs.toLocaleString('es-VE')} Bs
                            </td>
                            <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: '800', color: '#ff453a' }}>
                              -${formatCurrency(tx.amount, '')}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
      )}

      {activeTab === 'barberia' && (
        <div className="animate-fade-in">
          {/* Header — la caja (estado acumulado), sin filtro de período */}
          <div style={{ marginBottom: '20px' }}>
            <h3 style={{ fontSize: '14px', fontWeight: '800', color: '#32d74b', letterSpacing: '1px', margin: 0 }}>CLÍNICA · CAJA DE DIENTES SANOS</h3>
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: '6px 0 0' }}>Estado acumulado de la clínica: ganancia total, dónde está el dinero y deuda al proveedor. (El análisis por semana está en la pestaña Rentabilidad.)</p>
          </div>

          {/* Ganancia + métricas (acumulado) */}
          <div className="glass-card" style={{ background: 'linear-gradient(135deg, rgba(48,209,88,0.12), rgba(255,255,255,0.02))', border: '1px solid rgba(48,209,88,0.25)', borderRadius: '24px', padding: isMobile ? '20px' : '28px', marginBottom: '20px' }}>
            <div style={{ fontSize: '11px', fontWeight: '900', color: '#32d74b', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '6px' }}>Ganancia de la clínica (total)</div>
            <div style={{ fontSize: isMobile ? '30px' : '38px', fontWeight: '950', color: '#32d74b', lineHeight: 1 }}>{formatCurrency(pandaProfitBs, '')} Bs</div>
            <div style={{ fontSize: '14px', color: 'rgba(255,255,255,0.88)', fontWeight: '850', marginTop: '5px' }}>
              ≈ ${formatCurrency(pandaProfitUsd, '')} <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.55)', fontWeight: '700' }}>USD</span>
            </div>

            {/* Desglose de la ganancia por origen (suma = total de arriba) */}
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, minmax(0, 1fr))', gap: '10px', marginTop: '18px' }}>
              {[
                { label: 'Por servicios', bs: pandaServiciosProfitBs },
                { label: 'Por limpiezas', bs: pandaLavadosProfitBs },
                { label: 'Por productos', bs: pandaProductProfitBs },
              ].map(m => (
                <div key={m.label} style={{ padding: '14px', borderRadius: '14px', background: 'rgba(48,209,88,.07)', border: '1px solid rgba(48,209,88,.18)' }}>
                  <div style={{ fontSize: '10px', color: '#32d74b', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '.4px' }}>{m.label}</div>
                  <div style={{ fontSize: '18px', fontWeight: 900, color: 'white', marginTop: '5px' }}>{formatCurrency(Math.max(0, m.bs), '')} Bs</div>
                  <div style={{ fontSize: '12.5px', color: 'rgba(255,255,255,0.85)', fontWeight: '850', marginTop: '3px' }}>
                    ≈ ${formatCurrency(Math.max(0, m.bs) / pandaProfitRate, '')} <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.55)', fontWeight: '700' }}>USD</span>
                  </div>
                </div>
              ))}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, minmax(0, 1fr))' : 'repeat(4, minmax(0, 1fr))', gap: '10px', marginTop: '12px' }}>
              {[
                { label: 'Ingreso Bruto', value: `${formatCurrency(pandaGrossIncomeBs, '')} Bs` },
                { label: 'Servicios', value: pandaServicesCount },
                { label: 'Limpiezas', value: pandaWashesCount },
                { label: 'Productos', value: pandaProductsCount },
              ].map(m => (
                <div key={m.label} style={{ padding: '12px', borderRadius: '14px', background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.07)' }}>
                  <div style={{ fontSize: '9px', color: 'var(--text-muted)', fontWeight: 900, textTransform: 'uppercase' }}>{m.label}</div>
                  <div style={{ fontSize: '16px', fontWeight: 850, color: 'white', marginTop: '4px' }}>{m.value}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Deuda al proveedor (acumulada) + acciones */}
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'minmax(0, 1fr) minmax(0, 1fr)', gap: '20px', marginBottom: '20px' }}>
            <div className="glass-card" style={{ borderRadius: '20px', padding: '20px', border: '1px solid rgba(255,159,10,0.25)', background: 'rgba(255,159,10,0.05)' }}>
              <div style={{ fontSize: '11px', fontWeight: '900', color: '#ff9f0a', textTransform: 'uppercase', letterSpacing: '.5px' }}>Deuda al Proveedor (acumulada)</div>
              <div style={{ fontSize: '26px', fontWeight: '950', color: providerDebtBs > 0.01 ? '#ff9f0a' : '#32d74b', marginTop: '6px' }}>{formatCurrency(providerDebtBs, '')} Bs</div>
              <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.85)', fontWeight: '850', marginTop: '3px' }}>
                ≈ ${formatCurrency(providerDebtUsd, '')} <span style={{ fontSize: '10.5px', color: 'rgba(255,255,255,0.55)', fontWeight: '700' }}>USD</span>
              </div>
              <button onClick={() => setProviderModal(p => ({ ...p, isOpen: true }))} disabled={providerDebtBs <= 0.01} style={{ marginTop: '14px', width: '100%', padding: '12px', borderRadius: '12px', fontWeight: '900', fontSize: '13px', cursor: providerDebtBs > 0.01 ? 'pointer' : 'not-allowed', background: providerDebtBs > 0.01 ? 'rgba(255,159,10,0.15)' : 'rgba(255,255,255,0.05)', color: providerDebtBs > 0.01 ? '#ff9f0a' : 'var(--text-muted)', border: '1px solid rgba(255,159,10,0.3)' }}>{providerDebtBs > 0.01 ? 'Registrar pago a proveedor' : 'Sin deuda pendiente'}</button>
              <button onClick={() => setProductHistoryModal({ isOpen: true })} style={{ marginTop: '8px', width: '100%', padding: '10px', borderRadius: '12px', fontWeight: '850', fontSize: '12px', cursor: 'pointer', background: 'rgba(255,255,255,0.05)', color: 'var(--text-secondary)', border: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}><ShoppingBag size={14} /> Ver historial de productos</button>
            </div>
            <div className="glass-card" style={{ borderRadius: '20px', padding: '20px', border: '1px solid rgba(255,255,255,0.08)', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ fontSize: '11px', fontWeight: '900', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '.5px' }}>Acciones de la clínica</div>
              <button onClick={() => setConversionModal({ isOpen: true, fromAccount: 'pago_movil', fromAmount: '', toAccount: 'cash_usd', rate: '', toAmount: '' })} style={{ padding: '12px', borderRadius: '12px', background: 'rgba(48,209,88,.1)', color: '#32d74b', border: '1px solid rgba(48,209,88,.28)', fontWeight: '850', fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}><RefreshCcw size={15} /> Conversión / Transferencia</button>
              <button onClick={() => handleManualTransaction('expense')} style={{ padding: '12px', borderRadius: '12px', background: 'rgba(255,69,58,.1)', color: '#ff6961', border: '1px solid rgba(255,69,58,.22)', fontWeight: '850', fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}><Minus size={15} /> Registrar gasto</button>
            </div>
          </div>

          {/* Saldos por cuenta */}
          <div className="glass-card" style={{ borderRadius: '20px', padding: '20px', border: '1px solid rgba(255,255,255,0.08)' }}>
            <div style={{ fontSize: '11px', fontWeight: '900', color: 'var(--gold-primary)', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: '12px' }}>Saldos por cuenta</div>
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, minmax(0, 1fr))' : 'repeat(4, minmax(0, 1fr))', gap: '10px' }}>
              {CONVERSION_ACCOUNTS.map(acc => {
                const bal = Number(accountBalances?.[acc.key] || 0);
                return (
                  <div key={acc.key} style={{ padding: '12px', borderRadius: '14px', background: 'rgba(255,255,255,.03)', border: '1px solid rgba(255,255,255,.06)' }}>
                    <div style={{ fontSize: '9px', color: 'var(--text-muted)', fontWeight: 900, textTransform: 'uppercase' }}>{acc.label}</div>
                    <div style={{ fontSize: '15px', fontWeight: 850, color: bal > 0 ? 'white' : 'var(--text-muted)', marginTop: '4px', whiteSpace: 'nowrap' }}>{acc.usd ? '$' : ''}{formatCurrency(bal, '')}{acc.usd ? '' : ' Bs'}</div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Historial de Caja: todos los movimientos */}
          <div className="glass-card" style={{ borderRadius: '20px', padding: '20px', border: '1px solid rgba(255,255,255,0.08)', marginTop: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <div style={{ fontSize: '11px', fontWeight: '900', color: 'var(--gold-primary)', textTransform: 'uppercase', letterSpacing: '.5px' }}>Historial de Caja</div>
              <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 800 }}>{cajaMovements.length} movimientos</span>
            </div>
            {cajaMovements.length === 0 ? (
              <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '12px' }}>Sin movimientos registrados.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '460px', overflowY: 'auto' }}>
                {cajaMovements.map(mv => {
                  const isIncome = mv.type === 'income';
                  const isConv = mv.kind === 'conversion';
                  const color = isConv ? '#64d2ff' : (isIncome ? '#32d74b' : '#ff6961');
                  const sign = isConv ? '↔' : (isIncome ? '+' : '−');
                  return (
                    <div key={mv.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px', padding: '10px 12px', borderRadius: '12px', background: 'rgba(255,255,255,.025)', border: '1px solid rgba(255,255,255,.06)' }}>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: '12px', fontWeight: '700', color: 'white', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{mv.concept}</div>
                        <div style={{ fontSize: '9px', color: 'var(--text-muted)', marginTop: '3px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                          <span>{new Date(mv.date).toLocaleString('es-VE', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', hour12: true })}</span>
                          {mv.method && <span style={{ color: 'var(--text-secondary)' }}>· {mv.method}</span>}
                          {isIncome && mv.staffTakeBs > 0 && <span style={{ color: '#ffb340' }}>· Comisión: {formatCurrency(mv.staffTakeBs, '')} Bs</span>}
                        </div>
                      </div>
                      <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        <div style={{ fontSize: '13px', fontWeight: '900', color, whiteSpace: 'nowrap' }}>{sign}{mv.isUsd ? `$${mv.amountUsd.toFixed(2)}` : `${formatCurrency(mv.amountBs, '')} Bs`}</div>
                        <div style={{ fontSize: '9px', color: 'var(--text-muted)', fontWeight: 600, whiteSpace: 'nowrap' }}>{mv.isUsd ? `${formatCurrency(mv.amountBs, '')} Bs` : `$${mv.amountUsd.toFixed(2)}`}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'analysis' && (() => {
        // Ejecución de Fórmulas Financieras (Basadas en el Excel de Rentabilidad)
        const ingresosTotales = operationalTransactions.filter(t => t.type === 'income').reduce((acc, t) => acc + (t.amount || 0), 0);
        const egresosOdontologos = operationalTransactions.filter(t => t.type === 'income').reduce((acc, t) => {
          return acc + (t.metadata?.staffInvolved?.reduce((sum, member) => sum + effectiveServiceCommissionUsd(t, member), 0) || 0);
        }, 0);
        
        const profitBruto = ingresosTotales - egresosOdontologos;
        const costosVariables = totalExpense; // Usamos los gastos registrados como variables
        const utilidadNetaCalculada = profitBruto - totalFixedCosts - costosVariables;
        const rentabilidadReal = ingresosTotales > 0 ? (utilidadNetaCalculada / ingresosTotales) * 100 : 0;
        
        const serviciosTotales = Object.values(analysisData.barberStats).reduce((acc, b) => acc + b.services, 0) || 0;
        const ticketProm = serviciosTotales > 0 ? ingresosTotales / serviciosTotales : 0;
        
        // Ocupación
        const sillas = Number(fixedCosts.workstations || 3);
        const capacidadMensual = sillas * 6 * 4 * 13; // 6 dias, 4 semanas, 13 servicios por silla
        const ocupacionPct = capacidadMensual > 0 ? (serviciosTotales / capacidadMensual) * 100 : 0;
        
        // Punto de Equilibrio
        const margenContribucion = ingresosTotales - costosVariables - egresosOdontologos;
        const margenPct = ingresosTotales > 0 ? margenContribucion / ingresosTotales : 0;
        const ptoEquilibrio = margenPct > 0 ? totalFixedCosts / margenPct : 0;

        return (
          <div className="animate-fade-in">
            <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', justifyContent: 'space-between', alignItems: isMobile ? 'flex-start' : 'center', gap: isMobile ? '16px' : '0', marginBottom: '32px' }}>
              <h3 style={{ fontSize: '14px', fontWeight: '800', color: 'var(--text-secondary)', letterSpacing: '1px' }}>DASHBOARD DE RENTABILIDAD Y OCUPACIÓN</h3>
              <button onClick={() => setIsEditingCosts(true)} className="btn-gold" style={{ padding: '8px 16px', fontSize: '12px', borderRadius: '10px', width: isMobile ? '100%' : 'auto' }}>
                Configurar Costos Fijos
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'minmax(0, 1fr) minmax(0, 1fr)' : 'repeat(4, minmax(0, 1fr))', gap: isMobile ? '12px' : '20px', marginBottom: '32px' }}>
              <div className="glass-card" style={{ padding: isMobile ? '16px' : '24px', borderRadius: isMobile ? '16px' : '24px', textAlign: 'center' }}>
                <div style={{ fontSize: isMobile ? '9px' : '10px', fontWeight: '800', color: 'var(--text-secondary)', marginBottom: '8px' }}>UTILIDAD NETA</div>
                <div style={{ fontSize: isMobile ? '18px' : '24px', fontWeight: '900', color: utilidadNetaCalculada >= 0 ? '#32d74b' : '#ff453a' }}>
                  ${formatCurrency(utilidadNetaCalculada)}
                </div>
              </div>
              <div className="glass-card" style={{ padding: isMobile ? '16px' : '24px', borderRadius: isMobile ? '16px' : '24px', textAlign: 'center' }}>
                <div style={{ fontSize: isMobile ? '9px' : '10px', fontWeight: '800', color: 'var(--text-secondary)', marginBottom: '8px' }}>RENTABILIDAD</div>
                <div style={{ fontSize: isMobile ? '18px' : '24px', fontWeight: '900', color: rentabilidadReal >= 0 ? 'var(--gold-primary)' : '#ff453a' }}>
                  {rentabilidadReal.toFixed(1)}%
                </div>
              </div>
              <div className="glass-card" style={{ padding: isMobile ? '16px' : '24px', borderRadius: isMobile ? '16px' : '24px', textAlign: 'center' }}>
                <div style={{ fontSize: isMobile ? '9px' : '10px', fontWeight: '800', color: 'var(--text-secondary)', marginBottom: '8px' }}>PTO. DE EQUILIBRIO</div>
                <div style={{ fontSize: isMobile ? '18px' : '24px', fontWeight: '900' }}>
                  ${formatCurrency(ptoEquilibrio)}
                </div>
                <div style={{ fontSize: isMobile ? '8px' : '10px', color: 'var(--text-muted)' }}>Facturación Necesaria</div>
              </div>
              <div className="glass-card" style={{ padding: isMobile ? '16px' : '24px', borderRadius: isMobile ? '16px' : '24px', textAlign: 'center' }}>
                <div style={{ fontSize: isMobile ? '9px' : '10px', fontWeight: '800', color: 'var(--text-secondary)', marginBottom: '8px' }}>TICKET PROMEDIO</div>
                <div style={{ fontSize: isMobile ? '18px' : '24px', fontWeight: '900' }}>
                  ${formatCurrency(ticketProm)}
                </div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '2fr minmax(0, 1fr)', gap: '24px', marginBottom: '32px' }}>
              {/* Estructura de Gastos e Ingresos */}
              <div className="glass-card" style={{ padding: '24px', borderRadius: '24px' }}>
                <h3 style={{ fontSize: '18px', fontWeight: '900', marginBottom: '20px' }}>Estructura de Gastos Mensuales</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                     <span style={{ fontSize: '14px', color: 'white', fontWeight: '700' }}>Ingresos Brutos (Facturación)</span>
                     <span style={{ fontWeight: '800', color: '#32d74b' }}>${formatCurrency(ingresosTotales)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                     <span style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>Egresos Totales a Odontologos</span>
                     <span style={{ fontWeight: '700', color: '#ff453a' }}>-${formatCurrency(egresosOdontologos)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                      <span style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>Costos Fijos Operativos</span>
                      <span style={{ fontWeight: '700', color: '#ff453a' }}>-${formatCurrency(totalFixedCosts)}</span>
                   </div>
                   
                   {/* Grilla de Desglose de Costos (2 columnas para ahorrar espacio) */}
                   <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: '4px 20px', padding: '12px 16px', background: 'rgba(255,255,255,0.02)', borderRadius: '16px', margin: '8px 0' }}>
                     {[
                       { key: 'rent', defaultLabel: 'Alquiler' },
                       { key: 'services', defaultLabel: 'Servicios' },
                       { key: 'payroll', defaultLabel: 'Nómina Fija' },
                       { key: 'software', defaultLabel: 'Software' },
                       { key: 'marketing', defaultLabel: 'Marketing' },
                       { key: 'tax', defaultLabel: 'Impuestos' }
                     ].filter(c => !fixedCosts.hiddenCosts?.includes(c.key)).map(c => (
                       <div key={c.key} style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0' }}>
                          <span style={{ fontSize: '11px', color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>↳ {fixedCosts.customLabels?.[c.key] || c.defaultLabel}</span>
                          <span style={{ fontSize: '11px', fontWeight: '600', color: 'var(--text-secondary)', marginLeft: '8px' }}>-${formatCurrency(fixedCosts[c.key] || 0)}</span>
                       </div>
                     ))}

                     {fixedCosts.extraCosts?.map((c, i) => (
                       <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0' }}>
                          <span style={{ fontSize: '11px', color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>↳ {c.label || 'Sin nombre'}</span>
                          <span style={{ fontSize: '11px', fontWeight: '600', color: 'var(--text-secondary)', marginLeft: '8px' }}>-${formatCurrency(c.value)}</span>
                       </div>
                     ))}
                   </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                     <span style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>Costos Variables (Caja Chica)</span>
                     <span style={{ fontWeight: '700', color: '#ff453a' }}>-${formatCurrency(costosVariables)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', fontWeight: '900', marginTop: '10px', fontSize: '18px' }}>
                     <span style={{ color: 'var(--gold-primary)' }}>Utilidad Neta</span>
                     <span style={{ color: utilidadNetaCalculada >= 0 ? '#32d74b' : '#ff453a' }}>${formatCurrency(utilidadNetaCalculada)}</span>
                  </div>
                </div>
              </div>

              {/* Occupancy Logic */}
              <div className="glass-card" style={{ padding: '24px', borderRadius: '24px' }}>
                <h3 style={{ fontSize: '16px', fontWeight: '900', marginBottom: '20px' }}>Capacidad y Ocupación</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Estaciones activas</span>
                    <span style={{ fontWeight: '700' }}>{sillas}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Servicios Realizados</span>
                    <span style={{ fontWeight: '700' }}>{serviciosTotales}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Capacidad Máxima Mensual</span>
                    <span style={{ fontWeight: '700' }}>{capacidadMensual}</span>
                  </div>
                  {/* Proyección de Ocupación */}
                  <div style={{ marginTop: '10px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <span style={{ fontSize: '11px', fontWeight: '800' }}>NIVEL DE OCUPACIÓN REAL</span>
                      <span style={{ fontSize: '11px', fontWeight: '800', color: 'var(--gold-primary)' }}>{ocupacionPct.toFixed(1)}%</span>
                    </div>
                    <div style={{ height: '8px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', overflow: 'hidden' }}>
                      <div style={{ width: `${Math.min(ocupacionPct, 100)}%`, height: '100%', background: 'var(--gold-gradient)' }}></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Rendimiento por Barbero */}
            <div className="glass-card" style={{ padding: '24px', borderRadius: '24px', marginBottom: '32px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: '900', marginBottom: '20px' }}>Rendimiento por Odontólogo (Bs)</h3>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ color: 'var(--text-muted)', fontSize: '11px', textTransform: 'uppercase', borderBottom: '1px solid var(--border-color)' }}>
                      <th style={{ padding: '12px', textAlign: 'left' }}>Odontólogo</th>
                      <th style={{ padding: '12px', textAlign: 'center' }}>Servicios</th>
                      <th style={{ padding: '12px', textAlign: 'right' }}>Total Creado (Bs)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.values(analysisData.barberStats).filter(b => b.services > 0 || b.incomeBs > 0).map(b => (
                      <tr key={b.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                        <td style={{ padding: '12px', fontWeight: '700' }}>
                          {staff.find(s => String(s.id) === String(b.id))?.name || (
                            <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontStyle: 'italic', opacity: 0.7 }}>
                              Eliminado ({String(b.id).substring(0, 5)})
                            </span>
                          )}
                        </td>
                        <td style={{ padding: '12px', textAlign: 'center' }}>{b.services}</td>
                        <td style={{ padding: '12px', textAlign: 'right', color: 'var(--gold-primary)', fontWeight: '800' }}>
                          {formatCurrency(b.incomeBs, '')} Bs
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        );
      })()}


          {/* Costs Config Modal */}
          <AnimatedModal isOpen={isEditingCosts}>
            {(overlayClass, cardClass) => (
              <div className={`${overlayClass} modal-centered-overlay`} onClick={(e) => e.stopPropagation()} onTouchStart={(e) => e.stopPropagation()} style={{ position: 'fixed', inset: 0, backgroundColor: 'var(--bg-secondary)', backdropFilter: 'blur(16px)', zIndex: 3000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: isMobile ? '8px' : '20px', paddingTop: isMobile ? 'max(8px, env(safe-area-inset-top, 8px))' : 'max(20px, env(safe-area-inset-top, 20px))', boxSizing: 'border-box' }}>
              <div className={`${cardClass.replace('global-modal-card', '')} modal-popup-fullmodule fixed-costs-modal`} style={{ maxWidth: 'min(880px, 90vw)', width: '100%', borderRadius: isMobile ? '20px' : '24px', padding: isMobile ? '16px' : '26px', maxHeight: isMobile ? '94dvh' : '90vh', overflowY: 'auto', background: 'var(--bg-secondary)', border: '1px solid rgba(255,255,255,0.08)', boxShadow: '0 30px 60px -12px rgba(0,0,0,0.5)', boxSizing: 'border-box' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px', marginBottom: '18px' }}>
                  <div><h3 style={{ fontSize: isMobile ? '20px' : '23px', fontWeight: '900', margin: 0 }}>Costos fijos <span className="text-gold">mensuales</span></h3><p style={{ margin: '5px 0 0', color: 'var(--text-secondary)', fontSize: '12px' }}>Configura los gastos usados en rentabilidad y punto de equilibrio.</p></div>
                  <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}><button
                    type="button" 
                    onClick={() => setIsCostsLocked(!isCostsLocked)}
                    style={{ 
                      background: isCostsLocked ? 'rgba(255, 255, 255,0.1)' : 'var(--gold-primary)', 
                      color: isCostsLocked ? 'var(--gold-primary)' : 'black', 
                      border: 'none', 
                      width: '40px', 
                      height: '40px', 
                      borderRadius: '12px', 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center', 
                      cursor: 'pointer', 
                      transition: 'all 0.3s ease',
                      boxShadow: !isCostsLocked ? '0 0 15px rgba(255, 255, 255,0.3)' : 'none'
                    }}
                    title={isCostsLocked ? "Desbloquear para editar" : "Bloquear edición"}
                  >
                    <Edit2 size={18} />
                  </button><button type="button" aria-label="Cerrar" onClick={() => { setIsEditingCosts(false); setIsCostsLocked(true); }} style={{ width: '40px', height: '40px', borderRadius: '12px', border: '1px solid rgba(255,255,255,.1)', background: 'rgba(255,255,255,.05)', color: '#aaa', display: 'grid', placeItems: 'center', cursor: 'pointer' }}><X size={19}/></button></div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', padding: '12px 14px', borderRadius: '13px', marginBottom: '15px', background: isCostsLocked ? 'rgba(255,255,255,.035)' : 'rgba(17, 17, 17,.09)', border: `1px solid ${isCostsLocked ? 'rgba(255,255,255,.08)' : 'rgba(17, 17, 17,.28)'}` }}><span style={{ color: isCostsLocked ? 'var(--text-secondary)' : 'var(--gold-primary)', fontSize: '12px', fontWeight: 800 }}>{isCostsLocked ? 'Valores protegidos. Pulsa el lápiz para editar.' : 'Edición activa. Revisa los valores antes de guardar.'}</span><strong style={{ color: 'white', fontSize: '14px', whiteSpace: 'nowrap' }}>Total: ${formatCurrency(totalFixedCosts)}</strong></div>
                <form onSubmit={handleSaveCosts} style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'minmax(0, 1fr) minmax(0, 1fr)', gap: isMobile ? '10px' : '12px' }}>
                  {[
                    { key: 'rent', defaultLabel: 'Alquiler ($)', removable: true },
                    { key: 'services', defaultLabel: 'Servicios ($)', removable: true },
                    { key: 'payroll', defaultLabel: 'Nómina Fija ($)', removable: true },
                    { key: 'software', defaultLabel: 'Software ($)', removable: true },
                    { key: 'marketing', defaultLabel: 'Marketing ($)', removable: true },
                    { key: 'tax', defaultLabel: 'Impuestos ($)', removable: true },
                    { key: 'workstations', defaultLabel: 'Sillas Activas' },
                    { key: 'avgServiceTime', defaultLabel: 'Tiempo Prom. (min)' },
                  ].filter(field => !field.removable || !fixedCosts.hiddenCosts?.includes(field.key)).map(field => (
                    <div key={field.key} style={{ display: 'grid', gridTemplateColumns: field.removable ? 'minmax(0,1.45fr) minmax(84px,.8fr) 38px' : 'minmax(0,1.45fr) minmax(92px,.8fr)', gap: '9px', alignItems: 'end', padding: isMobile ? '10px' : '12px', borderRadius: '15px', background: 'rgba(255,255,255,.025)', border: '1px solid rgba(255,255,255,.075)' }}>
                      <div style={{ flex: 2 }}>
                        <label style={{ fontSize: '10px', fontWeight: '800', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>Nombre</label>
                        <input 
                          type="text" 
                          disabled={isCostsLocked}
                          value={fixedCosts.customLabels?.[field.key] || field.defaultLabel} 
                          onChange={(e) => setFixedCosts({ 
                            ...fixedCosts, 
                            customLabels: { ...fixedCosts.customLabels, [field.key]: e.target.value } 
                          })}
                          style={{ width: '100%', height: '44px', background: 'rgba(255,255,255,0.05)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)', color: 'white', padding: '0 12px', opacity: isCostsLocked ? 0.6 : 1, cursor: isCostsLocked ? 'not-allowed' : 'text', transition: 'all 0.3s' }}
                        />
                      </div>
                      <div style={{ flex: 1.5 }}>
                        <label style={{ fontSize: '10px', fontWeight: '800', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>{field.key === 'workstations' || field.key === 'avgServiceTime' ? 'Valor' : 'Monto ($)'}</label>
                        <input 
                          type="number" 
                          disabled={isCostsLocked}
                          value={fixedCosts[field.key]} 
                          onChange={(e) => setFixedCosts({ ...fixedCosts, [field.key]: e.target.value === '' ? '' : Number(e.target.value) })}
                          style={{ width: '100%', height: '44px', background: 'rgba(255,255,255,0.05)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)', color: 'white', padding: '0 12px', opacity: isCostsLocked ? 0.6 : 1, cursor: isCostsLocked ? 'not-allowed' : 'text', transition: 'all 0.3s' }}
                        />
                      </div>
                      {field.removable && <button type="button" aria-label={`Quitar ${field.defaultLabel}`} title="Quitar costo" disabled={isCostsLocked} onClick={() => setFixedCosts({ ...fixedCosts, [field.key]: 0, hiddenCosts: [...new Set([...(fixedCosts.hiddenCosts || []), field.key])] })} style={{ width: '38px', height: '44px', borderRadius: '10px', border: '1px solid rgba(255,69,58,.2)', background: 'rgba(255,69,58,.08)', color: '#ff5b55', display: 'grid', placeItems: 'center', cursor: isCostsLocked ? 'not-allowed' : 'pointer', opacity: isCostsLocked ? .35 : 1 }}><Trash2 size={15}/></button>}
                    </div>
                  ))}

                  {fixedCosts.hiddenCosts?.length > 0 && <button type="button" disabled={isCostsLocked} onClick={() => setFixedCosts({ ...fixedCosts, hiddenCosts: [] })} style={{ gridColumn: isMobile ? 'span 1' : 'span 2', padding: '10px 12px', borderRadius: '11px', border: '1px solid rgba(255,255,255,.1)', background: 'rgba(255,255,255,.035)', color: 'var(--text-secondary)', fontSize: '11px', fontWeight: 800, cursor: isCostsLocked ? 'not-allowed' : 'pointer', opacity: isCostsLocked ? .4 : 1 }}>Restaurar costos eliminados ({fixedCosts.hiddenCosts.length})</button>}

                  <div style={{ gridColumn: isMobile ? 'span 1' : 'span 2', height: '1px', background: 'rgba(255,255,255,0.07)', margin: '5px 0' }} />

                  {fixedCosts.extraCosts?.map((cost, idx) => (
                    <div key={idx} style={{ gridColumn: isMobile ? 'span 1' : 'span 2', display: 'grid', gridTemplateColumns: isMobile ? 'minmax(0,1fr) 94px 42px' : 'minmax(0,2fr) minmax(140px,1fr) 44px', gap: '10px', alignItems: 'end', padding: '11px', borderRadius: '15px', background: 'rgba(255,255,255,.025)', border: '1px solid rgba(255,255,255,.075)' }}>
                      <div style={{ flex: 2 }}>
                        <label style={{ fontSize: '10px', fontWeight: '800', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>Nombre del Gasto Extra</label>
                        <input 
                          type="text" 
                          placeholder="Ej. Internet"
                          value={cost.label} 
                          disabled={isCostsLocked}
                          onChange={(e) => {
                            const newExtras = [...fixedCosts.extraCosts];
                            newExtras[idx].label = e.target.value;
                            setFixedCosts({ ...fixedCosts, extraCosts: newExtras });
                          }}
                          style={{ width: '100%', height: '44px', background: 'rgba(255,255,255,0.05)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)', color: 'white', padding: '0 12px', opacity: isCostsLocked ? 0.6 : 1, cursor: isCostsLocked ? 'not-allowed' : 'text', transition: 'all 0.3s' }}
                        />
                      </div>
                      <div style={{ flex: 1 }}>
                        <label style={{ fontSize: '10px', fontWeight: '800', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>Monto ($)</label>
                        <input 
                          type="number" 
                          value={cost.value} 
                          disabled={isCostsLocked}
                          onChange={(e) => {
                            const newExtras = [...fixedCosts.extraCosts];
                            newExtras[idx].value = e.target.value === '' ? '' : Number(e.target.value);
                            setFixedCosts({ ...fixedCosts, extraCosts: newExtras });
                          }}
                          style={{ width: '100%', height: '44px', background: 'rgba(255,255,255,0.05)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)', color: 'white', padding: '0 12px', opacity: isCostsLocked ? 0.6 : 1, cursor: isCostsLocked ? 'not-allowed' : 'text', transition: 'all 0.3s' }}
                        />
                      </div>
                      <button 
                        type="button" 
                        disabled={isCostsLocked}
                        onClick={() => {
                          const newExtras = fixedCosts.extraCosts.filter((_, i) => i !== idx);
                          setFixedCosts({ ...fixedCosts, extraCosts: newExtras });
                        }}
                        style={{ background: 'rgba(255,69,58,0.1)', border: 'none', color: '#ff453a', borderRadius: '10px', width: '44px', height: '44px', cursor: isCostsLocked ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: isCostsLocked ? 0.4 : 1, transition: 'all 0.3s' }}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}

                  <button 
                    type="button" 
                    disabled={isCostsLocked}
                    onClick={() => {
                      setFixedCosts({ 
                        ...fixedCosts, 
                        extraCosts: [...(fixedCosts.extraCosts || []), { label: '', value: 0 }] 
                      });
                    }}
                    style={{ gridColumn: isMobile ? 'span 1' : 'span 2', background: 'rgba(255,255,255,.04)', border: '1px dashed rgba(17, 17, 17,.45)', color: 'var(--gold-primary)', padding: '13px', borderRadius: '12px', cursor: isCostsLocked ? 'not-allowed' : 'pointer', fontWeight: '800', fontSize: '12px', marginTop: '4px', opacity: isCostsLocked ? 0.45 : 1, transition: 'all 0.3s' }}
                  >
                    + AGREGAR COSTO ADICIONAL
                  </button>
                  <div style={{ gridColumn: isMobile ? 'span 1' : 'span 2', display: 'flex', marginTop: '10px' }}>
                    <button type="submit" disabled={isCostsLocked} className="btn-gold" style={{ flex: 1, padding: '14px', borderRadius: '12px', fontWeight: '800', opacity: isCostsLocked ? 0.5 : 1, cursor: isCostsLocked ? 'not-allowed' : 'pointer' }}>Guardar Cambios</button>
                  </div>
                </form>
              </div>
            </div>
            )}
          </AnimatedModal>
          
          {/* Assistant Config Modal */}
          <AnimatedModal isOpen={isConfiguringPayroll}>
            {(overlayClass, cardClass) => (
            <div className={overlayClass} onClick={(e) => e.stopPropagation()} onTouchStart={(e) => e.stopPropagation()} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'var(--bg-secondary)', backdropFilter: 'blur(20px)', zIndex: 3000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', paddingTop: 'max(20px, env(safe-area-inset-top, 20px))' }}>
              <div className={`glass-card ${cardClass.replace('global-modal-card', '')}`} style={{ maxWidth: '500px', width: '100%', borderRadius: '24px', padding: '32px', maxHeight: '90vh', overflowY: 'auto', background: 'var(--bg-secondary)', border: '1px solid rgba(255,255,255,0.08)', boxShadow: '0 30px 60px -12px rgba(0,0,0,0.5)' }}>
                <h3 style={{ fontSize: '20px', fontWeight: '900', marginBottom: '24px' }}>Configuración <span className="text-gold">Sueldo Asistente</span></h3>
                <form onSubmit={handleSaveAssistantConfig} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  <div>
                    <label style={{ fontSize: '12px', fontWeight: '800', color: 'var(--text-secondary)', display: 'block', marginBottom: '8px' }}>Monto Semanal del Salario (USD)</label>
                    <input 
                      type="number" 
                      step="any"
                      value={assistantConfig.weeklyVacaUsd || ''} 
                      onChange={(e) => handleWeeklyTotalChange(e.target.value)} 
                      style={{ width: '100%', padding: '14px', borderRadius: '12px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', fontSize: '16px' }} 
                    />
                  </div>
                  <div>
                    <h4 style={{ fontSize: '14px', fontWeight: '800', color: 'var(--text-secondary)', marginBottom: '12px', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '8px' }}>Aporte Semanal por Odontólogo (USD)</h4>
                    {eligibleBarbers.map(s => (
                      <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                        <div>
                          <span style={{ fontSize: '14px', fontWeight: '600' }}>{s.name}</span>
                          <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginLeft: '8px' }}>
                            ({s.role?.split('|')[0] || 'Miembro'})
                          </span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ color: 'var(--text-muted)' }}>$</span>
                          <input 
                            type="number" 
                            step="any"
                            value={assistantConfig?.splits?.[s.id] || 0} 
                            onChange={(e) => handleBarberSplitChange(s.id, e.target.value)} 
                            style={{ width: '100px', padding: '8px', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', textAlign: 'center' }} 
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                  <div style={{ display: 'flex', marginTop: '24px' }}>
                    <button type="submit" className="btn-gold" style={{ flex: 1, padding: '14px', borderRadius: '12px', fontWeight: '800' }}>Guardar</button>
                  </div>
                </form>
              </div>
            </div>
            )}
          </AnimatedModal>

          {/* Payroll Payment Modal */}
          <AnimatedModal isOpen={payrollModal.isOpen}>
            {(overlayClass, cardClass) => (
            <div className={overlayClass} onClick={(e) => e.stopPropagation()} onTouchStart={(e) => e.stopPropagation()} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'var(--bg-secondary)', backdropFilter: 'blur(20px)', zIndex: 3000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', paddingTop: 'max(20px, env(safe-area-inset-top, 20px))' }}>
              <div className={`glass-card ${cardClass.replace('global-modal-card', '')}`} style={{ maxWidth: 'min(920px, 90vw)', maxHeight: '92vh', overflowY: 'auto', width: '100%', borderRadius: '24px', padding: isMobile ? '18px' : '24px', position: 'relative', background: 'var(--bg-secondary)', border: '1px solid rgba(255,255,255,0.08)', boxShadow: '0 30px 60px -12px rgba(0,0,0,0.5)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px', marginBottom: '20px' }}>
                  <div style={{ minWidth: 0, textAlign: 'left' }}>
                    <h3 style={{ fontSize: '20px', fontWeight: '900', margin: 0 }}>
                      {payrollModal.isAbono ? 'Abono a' : 'Pago a'} <span className="text-gold">{payrollModal.staff?.name}</span>
                    </h3>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '13px', margin: '6px 0 0' }}>
                      Revisa el historial y distribuye el pago entre las cuentas disponibles.
                    </p>
                  </div>
                  <button
                    onClick={() => setPayrollModal({...payrollModal, isOpen: false})}
                    style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
                  >
                    <X size={20} />
                  </button>
                </div>

                <PayrollSettlementPanel
                  modal={payrollModal}
                  setModal={setPayrollModal}
                  isMobile={isMobile}
                  loading={loading}
                  onPay={handleProcessPayroll}
                  onCancel={() => setPayrollModal(previous => ({ ...previous, isOpen: false }))}
                />
                
                <div style={{ display: 'none', flexDirection: 'column', gap: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.02)', padding: '16px', borderRadius: '12px' }}>
                    <span style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>Por Cobrar:</span>
                    <span style={{ fontSize: '18px', fontWeight: '900' }}>{formatCurrency(payrollModal.earnedBs, '')} Bs</span>
                  </div>

                  {payrollModal.isAbono && (
                    <div>
                      <label style={{ fontSize: '12px', fontWeight: '800', color: 'var(--gold-primary)', display: 'block', marginBottom: '8px' }}>Monto a Abonar (Bs)</label>
                      <input 
                        type="number" 
                        value={payrollModal.paymentAmountBs} 
                        onChange={(e) => setPayrollModal({...payrollModal, paymentAmountBs: Number(e.target.value)})} 
                        style={{ width: '100%', padding: '14px', borderRadius: '12px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--gold-primary)', color: 'white', fontSize: '18px', fontWeight: '900' }} 
                      />
                    </div>
                  )}

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', borderTop: '1px dashed rgba(255,255,255,0.1)' }}>
                    <span style={{ fontSize: '16px', fontWeight: '900', color: 'var(--gold-primary)' }}>Total a Transferir:</span>
                    <span style={{ fontSize: '24px', fontWeight: '900', color: '#32d74b' }}>
                      {formatCurrency(payrollModal.paymentAmountBs || 0, '')} Bs
                    </span>
                  </div>

                  <div>
                    <PandaSelect 
                      label="Método de Pago"
                      value={payrollModal.paymentMethod} 
                      onChange={(val) => setPayrollModal({...payrollModal, paymentMethod: val})} 
                      options={[
                        { value: 'Efectivo ($)', label: 'Efectivo ($)' },
                        { value: 'Zelle', label: 'Zelle' },
                        { value: 'Pago Móvil', label: 'Pago Móvil' },
                        { value: 'Efectivo (Bs)', label: 'Efectivo (Bs)' },
                        { value: 'Binance', label: 'Binance' },
                        { value: 'Zinli', label: 'Zinli' }
                      ]}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: '12px', fontWeight: '800', color: 'var(--text-secondary)', display: 'block', marginBottom: '8px' }}>Comprobante de Pago (Foto / Capture)</label>
                    <div style={{ position: 'relative', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: payrollModal.file ? '12px' : '24px 16px', background: payrollModal.file ? 'rgba(50,215,75,0.05)' : 'rgba(255, 255, 255,0.05)', border: payrollModal.file ? '1px dashed rgba(50,215,75,0.3)' : '1px dashed rgba(255, 255, 255,0.3)', borderRadius: '16px', cursor: 'pointer', transition: 'background 0.3s' }}>
                      <input type="file" accept="image/*" onChange={handleFileUpload} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer', zIndex: 10 }} />
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                        {payrollModal.file ? <CheckCircle2 size={24} color="#32d74b" /> : <Camera size={24} color="var(--gold-primary)" />}
                        <span style={{ color: payrollModal.file ? '#32d74b' : 'var(--gold-primary)', fontWeight: '800', fontSize: '12px' }}>
                          {payrollModal.file ? '¡Comprobante cargado! (Toca para cambiar)' : 'Toca para subir comprobante'}
                        </span>
                      </div>
                    </div>
                    {payrollModal.file && (
                      <div style={{ marginTop: '12px', height: '140px', borderRadius: '16px', overflow: 'hidden', backgroundImage: `url(${payrollModal.file})`, backgroundSize: 'cover', backgroundPosition: 'center', border: '2px solid rgba(50,215,75,0.3)' }}></div>
                    )}
                  </div>

                  <div style={{ display: 'flex', marginTop: '32px' }}>
                    <button onClick={handleProcessPayroll} className="btn-gold" style={{ flex: 1, padding: '14px', borderRadius: '12px', fontWeight: '800' }}>Confirmar {payrollModal.isAbono ? 'Abono' : 'Pago'}</button>
                  </div>
                </div>
              </div>
            </div>
            )}
          </AnimatedModal>

          {/* Ingreso / gasto manual */}
          <AnimatedModal isOpen={manualTransaction.isOpen}>
            {(overlayClass, cardClass) => (
              <div className={overlayClass.replace('global-modal-overlay', '')} style={{ position: 'fixed', inset: 0, zIndex: 3100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: isMobile ? '8px' : '20px', paddingTop: isMobile ? 'max(8px, env(safe-area-inset-top, 8px))' : 'max(20px, env(safe-area-inset-top, 20px))', boxSizing: 'border-box', background: 'var(--bg-secondary)', backdropFilter: 'blur(16px)' }}>
                <div className={cardClass.replace('global-modal-card', '')} style={{ width: '100%', maxWidth: 'min(760px, 90vw)', margin: 'auto', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', maxHeight: '92vh', overflowY: 'auto' }}>
                  <ManualFinanceTransactionPanel
                    type={manualTransaction.type}
                    balances={accountBalances}
                    rate={Number(rates?.usd || 550)}
                    loading={loading}
                    onClose={() => setManualTransaction(previous => ({ ...previous, isOpen: false }))}
                    onSubmit={handleSubmitManualTransaction}
                  />
                </div>
              </div>
            )}
          </AnimatedModal>

          {/* Conversión de divisa / Transferencia entre cuentas (Admin / Barbería) */}
          <AccountConversionModal
            isOpen={conversionModal.isOpen}
            onClose={() => setConversionModal(p => ({ ...p, isOpen: false }))}
            onSubmit={handleRegisterConversion}
            loading={loading}
            balances={accountBalances}
            defaultRate={Number(rates?.usd || 550)}
          />

          {/* Pago a proveedor (salda la deuda de costo de productos) */}
          <ProviderPaymentModal 
            isOpen={providerModal.isOpen}
            onClose={() => setProviderModal(p => ({ ...p, isOpen: false }))}
            onSubmit={handleRegisterProviderPayment}
            loading={loading}
            providerDebtBs={providerDebtBs}
            providerDebtUsd={providerDebtUsd}
            accountBalances={accountBalances}
            rate={Number(rates?.usd || 1)}
          />

          {/* Historial de productos vendidos (bebidas) */}
          <ProductHistoryModal 
            isOpen={productHistoryModal.isOpen}
            onClose={() => setProductHistoryModal({ isOpen: false })}
            history={productSalesHistory}
            totals={productHistoryTotals}
            rate={Number(rates?.usd || 1)}
          />

          {/* Cobro de cuenta pendiente */}
          <AnimatedModal isOpen={receivablePayment.isOpen}>
            {(overlayClass, cardClass) => (
              <div className={overlayClass.replace('global-modal-overlay', '')} style={{ position: 'fixed', inset: 0, zIndex: 3150, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: isMobile ? '8px' : '20px', paddingTop: isMobile ? 'max(8px, env(safe-area-inset-top, 8px))' : 'max(20px, env(safe-area-inset-top, 20px))', boxSizing: 'border-box', background: 'var(--bg-secondary)', backdropFilter: 'blur(16px)' }}>
                <div className={cardClass.replace('global-modal-card', '')} style={{ width: '100%', maxWidth: 'min(720px, 90vw)', margin: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {receivablePayment.transaction && <ReceivablePaymentPanel
                    key={receivablePayment.transaction.id}
                    transaction={receivablePayment.transaction}
                    rate={Number(rates?.usd || 1)}
                    loading={loading}
                    onClose={() => setReceivablePayment({ isOpen: false, transaction: null })}
                    onSubmit={handleCollectReceivable}
                  />}
                </div>
              </div>
            )}
          </AnimatedModal>

          {/* Registrar Consumo Modal */}
          <SellableInventoryModal
            isOpen={consumptionModal.isOpen}
            items={sellableInventory}
            rates={rates}
            mode="multiple"
            title={`Consumo de ${consumptionModal.staff?.name || 'personal'}`}
            subtitle="Selecciona productos o bebidas. El total se descontará de su saldo de nómina, aunque quede negativo."
            loading={loading}
            onClose={() => setConsumptionModal(prev => ({ ...prev, isOpen: false }))}
            onConfirm={handleRegisterConsumption}
          />

          <AnimatedModal isOpen={valeModal.isOpen}>
            {(overlayClass, cardClass) => (
              <div className={overlayClass} onClick={(e) => e.stopPropagation()} onTouchStart={(e) => e.stopPropagation()} style={{ position: 'fixed', inset: 0, background: 'var(--bg-secondary)', backdropFilter: 'blur(16px)', zIndex: 3001, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: isMobile ? '8px' : '20px', paddingTop: isMobile ? 'max(8px, env(safe-area-inset-top, 8px))' : 'max(20px, env(safe-area-inset-top, 20px))' }}>
                <div className={cardClass.replace('global-modal-card', '')} style={{ width: '100%', display: 'flex', justifyContent: 'center', maxWidth: '1020px', borderRadius: '24px', border: 'none', background: 'transparent' }}>
                  <ValeAdvancePanel modal={valeModal} setModal={setValeModal} balances={accountBalances} rate={rates?.usd || 550} activeVales={transactions.filter(t => t.category === 'Vales Odontologos' && t.metadata?.staffId === valeModal.staff?.id).length} onSubmit={handleRegisterVale} loading={loading} isMobile={isMobile}/>
                </div>
              </div>
            )}
          </AnimatedModal>

          {/* Registrar Pago de Sueldo (personal de apoyo: editor, marketing…) */}
          <AnimatedModal isOpen={salaryModal.isOpen}>
            {(overlayClass, cardClass) => (
              <div className={overlayClass.replace('global-modal-overlay', '')} onClick={(e) => e.stopPropagation()} onTouchStart={(e) => e.stopPropagation()} style={{ position: 'fixed', inset: 0, zIndex: 3200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: isMobile ? '12px' : '20px', paddingTop: isMobile ? 'max(12px, env(safe-area-inset-top, 12px))' : 'max(20px, env(safe-area-inset-top, 20px))', boxSizing: 'border-box', background: 'var(--bg-secondary)', backdropFilter: 'blur(16px)' }}>
                <div className={cardClass.replace('global-modal-card', '')} style={{ width: '100%', maxWidth: '420px', maxHeight: '92vh', overflowY: 'auto', background: 'var(--bg-secondary)', border: '1.5px solid rgba(255,255,255,0.12)', borderRadius: '24px', padding: '24px', boxShadow: '0 25px 60px rgba(0,0,0,0.9)' }}>
                  <h3 style={{ fontSize: '20px', fontWeight: '900', marginBottom: '8px' }}>
                    Registrar <span className="text-gold">Pago</span>
                  </h3>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '24px' }}>
                    Ingresa cuánto se le pagó en Bolívares (Bs) a <span style={{ fontWeight: '800', color: 'white' }}>{salaryModal.staff?.name}</span>. Se registra como pago de nómina y sale de la cuenta elegida.
                  </p>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div>
                      <label style={{ fontSize: '12px', fontWeight: '800', color: 'var(--gold-primary)', display: 'block', marginBottom: '8px' }}>Monto Pagado (Bs)</label>
                      <input
                        type="number"
                        value={salaryModal.amountBs}
                        onChange={(e) => setSalaryModal({ ...salaryModal, amountBs: e.target.value })}
                        placeholder="Ej. 5000, 10000..."
                        style={{ width: '100%', padding: '14px', borderRadius: '12px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--gold-primary)', color: 'white', fontSize: '18px', fontWeight: '900', outline: 'none' }}
                      />
                      {Number(salaryModal.amountBs) > 0 && (
                        <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '6px' }}>REF: ${formatCurrency(Number(salaryModal.amountBs) / (rates?.usd || 550), '')}</div>
                      )}
                    </div>

                    <PandaSelect
                      label="Método / Cuenta"
                      value={salaryModal.paymentMethod}
                      onChange={(val) => setSalaryModal({ ...salaryModal, paymentMethod: val })}
                      options={[
                        { value: 'Efectivo ($)', label: 'Efectivo ($)' },
                        { value: 'Zelle', label: 'Zelle' },
                        { value: 'Pago Móvil', label: 'Pago Móvil' },
                        { value: 'Efectivo (Bs)', label: 'Efectivo (Bs)' },
                        { value: 'Binance', label: 'Binance' },
                        { value: 'Zinli', label: 'Zinli' }
                      ]}
                    />

                    <div>
                      <label style={{ fontSize: '12px', fontWeight: '800', color: 'var(--gold-primary)', display: 'block', marginBottom: '8px' }}>Nota (opcional)</label>
                      <input
                        type="text"
                        value={salaryModal.note}
                        onChange={(e) => setSalaryModal({ ...salaryModal, note: e.target.value })}
                        placeholder="Ej. Quincena, edición de video…"
                        style={{ width: '100%', padding: '12px', borderRadius: '12px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', fontSize: '14px', outline: 'none' }}
                      />
                    </div>

                    <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
                      <button
                        onClick={() => setSalaryModal({ isOpen: false, staff: null, amountBs: '', paymentMethod: 'Efectivo ($)', note: '' })}
                        style={{ flex: 1, padding: '14px', borderRadius: '12px', background: 'rgba(255,255,255,0.05)', border: 'none', color: 'white', fontWeight: '700', cursor: 'pointer' }}
                      >
                        Cancelar
                      </button>
                      <button
                        onClick={handleRegisterSalary}
                        disabled={loading || !(Number(salaryModal.amountBs) > 0)}
                        style={{ flex: 2, padding: '14px', borderRadius: '12px', background: 'var(--gold-primary)', border: 'none', color: '#000', fontWeight: '950', cursor: (loading || !(Number(salaryModal.amountBs) > 0)) ? 'not-allowed' : 'pointer', opacity: (loading || !(Number(salaryModal.amountBs) > 0)) ? 0.6 : 1 }}
                      >
                        {loading ? 'Registrando…' : 'Registrar Pago'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </AnimatedModal>

          {/* Configurar Salario Mensual (personal de apoyo) */}
          <AnimatedModal isOpen={salaryConfigModal.isOpen}>
            {(overlayClass, cardClass) => (
              <div className={overlayClass.replace('global-modal-overlay', '')} onClick={(e) => e.stopPropagation()} onTouchStart={(e) => e.stopPropagation()} style={{ position: 'fixed', inset: 0, zIndex: 3200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: isMobile ? '12px' : '20px', paddingTop: isMobile ? 'max(12px, env(safe-area-inset-top, 12px))' : 'max(20px, env(safe-area-inset-top, 20px))', boxSizing: 'border-box', background: 'var(--bg-secondary)', backdropFilter: 'blur(16px)' }}>
                <div className={cardClass.replace('global-modal-card', '')} style={{ width: '100%', maxWidth: '420px', maxHeight: '92vh', overflowY: 'auto', background: 'var(--bg-secondary)', border: '1.5px solid rgba(255,255,255,0.12)', borderRadius: '24px', padding: '24px', boxShadow: '0 25px 60px rgba(0,0,0,0.9)' }}>
                  <h3 style={{ fontSize: '20px', fontWeight: '900', marginBottom: '8px' }}>
                    Salario <span className="text-gold">Mensual</span>
                  </h3>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '24px' }}>
                    Define el salario mensual de <span style={{ fontWeight: '800', color: 'white' }}>{salaryConfigModal.staff?.name}</span> en dólares ($). Sirve de referencia para ver cuánto se le ha pagado y cuánto queda pendiente en el mes.
                  </p>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div>
                      <label style={{ fontSize: '12px', fontWeight: '800', color: 'var(--gold-primary)', display: 'block', marginBottom: '8px' }}>Salario mensual ($)</label>
                      <input
                        type="number"
                        value={salaryConfigModal.amountUsd}
                        onChange={(e) => setSalaryConfigModal({ ...salaryConfigModal, amountUsd: e.target.value })}
                        placeholder="Ej. 150, 200..."
                        style={{ width: '100%', padding: '14px', borderRadius: '12px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--gold-primary)', color: 'white', fontSize: '18px', fontWeight: '900', outline: 'none' }}
                      />
                      {Number(salaryConfigModal.amountUsd) > 0 && (
                        <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '6px' }}>REF: {formatCurrency(Number(salaryConfigModal.amountUsd) * (rates?.usd || 550), '')} Bs</div>
                      )}
                    </div>

                    <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
                      <button
                        onClick={() => setSalaryConfigModal({ isOpen: false, staff: null, amountUsd: '' })}
                        style={{ flex: 1, padding: '14px', borderRadius: '12px', background: 'rgba(255,255,255,0.05)', border: 'none', color: 'white', fontWeight: '700', cursor: 'pointer' }}
                      >
                        Cancelar
                      </button>
                      <button
                        onClick={handleSaveSalaryConfig}
                        disabled={loading}
                        style={{ flex: 2, padding: '14px', borderRadius: '12px', background: 'var(--gold-primary)', border: 'none', color: '#000', fontWeight: '950', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.6 : 1 }}
                      >
                        {loading ? 'Guardando…' : 'Guardar Salario'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </AnimatedModal>

          <AnimatedModal isOpen={false}>
            {(overlayClass, cardClass) => (
            <div className={overlayClass} onClick={(e) => e.stopPropagation()} onTouchStart={(e) => e.stopPropagation()} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'var(--bg-secondary)', backdropFilter: 'blur(20px)', zIndex: 3000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', paddingTop: 'max(20px, env(safe-area-inset-top, 20px))' }}>
              <div className={`glass-card ${cardClass.replace('global-modal-card', '')}`} style={{ maxWidth: '400px', width: '100%', borderRadius: '24px', padding: '32px', background: 'var(--bg-secondary)', border: '1px solid rgba(255,255,255,0.08)', boxShadow: '0 30px 60px -12px rgba(0,0,0,0.5)' }}>
                <h3 style={{ fontSize: '20px', fontWeight: '900', marginBottom: '8px' }}>
                  Registrar <span className="text-gold">Vale / Adelanto</span>
                </h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '24px' }}>
                  Ingresa el monto del adelanto en Bolívares (Bs) para <span style={{ fontWeight: '800', color: 'white' }}>{valeModal.staff?.name}</span>. Este monto se descontará automáticamente de su pago semanal.
                  <br /><br />
                  <span style={{ fontSize: '14px', fontWeight: '800', color: 'var(--gold-primary)' }}>Saldo Disponible: {formatCurrency(valeModal.maxBalance || 0, '')} Bs.</span>
                </p>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div>
                    <label style={{ fontSize: '12px', fontWeight: '800', color: 'var(--gold-primary)', display: 'block', marginBottom: '8px' }}>Monto del Vale (Bs)</label>
                    <input 
                      type="number" 
                      value={valeModal.amountBs} 
                      onChange={(e) => setValeModal({...valeModal, amountBs: e.target.value})} 
                      placeholder="Ej. 500, 1000..."
                      style={{ 
                        width: '100%', 
                        padding: '14px', 
                        borderRadius: '12px', 
                        background: 'rgba(255,255,255,0.05)', 
                        border: '1px solid var(--gold-primary)', 
                        color: 'white', 
                        fontSize: '18px', 
                        fontWeight: '900',
                        outline: 'none'
                      }} 
                    />
                  </div>

                  <div>
                    <PandaSelect 
                      label="Método de Pago"
                      value={valeModal.paymentMethod} 
                      onChange={(val) => setValeModal({...valeModal, paymentMethod: val})} 
                      options={[
                        { value: 'Efectivo ($)', label: 'Efectivo ($)' },
                        { value: 'Zelle', label: 'Zelle' },
                        { value: 'Pago Móvil', label: 'Pago Móvil' },
                        { value: 'Efectivo (Bs)', label: 'Efectivo (Bs)' },
                        { value: 'Binance', label: 'Binance' },
                        { value: 'Zinli', label: 'Zinli' }
                      ]}
                    />
                  </div>

                  <div style={{ display: 'flex', gap: '12px', marginTop: '20px' }}>
                    <button 
                      onClick={() => setValeModal({ isOpen: false, staff: null, amountBs: '', paymentMethod: 'Efectivo ($)' })}
                      style={{ flex: 1, padding: '14px', borderRadius: '12px', background: 'rgba(255,255,255,0.05)', border: 'none', color: 'white', fontWeight: '700', cursor: 'pointer' }}
                    >
                      Cancelar
                    </button>
                    <button 
                      onClick={handleRegisterVale} 
                      className="btn-gold" 
                      style={{ flex: 1, padding: '14px', borderRadius: '12px', fontWeight: '800', cursor: 'pointer' }}
                    >
                      Registrar Vale
                    </button>
                  </div>
                </div>
              </div>
            </div>
            )}
          </AnimatedModal>

          {/* Payroll Detail Modal */}
          <AnimatedModal isOpen={payrollDetail.isOpen}>
            {(overlayClass, cardClass) => (
            <div className={overlayClass.replace('global-modal-overlay', '')} onClick={(e) => e.stopPropagation()} onTouchStart={(e) => e.stopPropagation()} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'var(--bg-secondary)', backdropFilter: 'blur(20px)', zIndex: 3000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: isMobile ? '8px' : '20px', paddingTop: isMobile ? 'max(8px, env(safe-area-inset-top, 8px))' : 'max(20px, env(safe-area-inset-top, 20px))' }}>
              <PayrollDetailPanel
                detail={payrollDetail}
                rate={rates?.usd || 550}
                periodStart={dateFilterStart}
                periodEnd={dateFilterEnd}
                isMobile={isMobile}
                onClose={() => setPayrollDetail({ isOpen: false, staff: null, transactions: [] })}
                onPay={() => {
                  const selectedStaff = payrollDetail.staff;
                  setPayrollDetail({ isOpen: false, staff: null, transactions: [] });
                  openPayrollSettlement(selectedStaff, false);
                }}
              />
              {false && <div className={`glass-card ${cardClass}`} style={{ maxWidth: '600px', width: '100%', borderRadius: '32px', padding: '32px', maxHeight: '80vh', overflowY: 'auto' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                  <h3 style={{ fontSize: '20px', fontWeight: '900' }}>Detalle de Servicios: <span className="text-gold">{payrollDetail.staff?.name}</span></h3>
                  <button onClick={() => setPayrollDetail({ isOpen: false, staff: null, transactions: [] })} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>✕</button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {payrollDetail.transactions.length === 0 ? (
                    <p style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)' }}>No hay transacciones registradas.</p>
                  ) : (
                    payrollDetail.transactions.map((t, idx) => {
                                // CASO 1: VALE / ADELANTO (Gasto - En Rojo)
                      if (t.type === 'expense' && t.category === 'Vales Odontologos') {
                        const amountBs = t.metadata?.amountBs || t.amount * (rates?.usd || 550);
                        const amountUsd = t.amount;
                        const reason = t.description
                      .replace(`ADELANTO VALE - Odontólogo: ${payrollDetail.staff?.name}`, '')
                      .replace(`ADELANTO VALE - Barbero: ${payrollDetail.staff?.name}`, '')
                      .replace(' - ', '').trim();
                        
                        return (
                          <div key={idx} style={{ background: 'rgba(255, 69, 58, 0.04)', padding: '20px', borderRadius: '20px', borderLeft: '4px solid #ff453a', border: '1px solid rgba(255, 69, 58, 0.12)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                              <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <span style={{ fontWeight: '900', fontSize: '15px', color: '#ff453a', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                  <ArrowDownRight size={16} color="#ff453a" /> VALE / ADELANTO
                                </span>
                                {reason && reason !== 'Vale de efectivo' && (
                                  <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: '600', marginTop: '2px' }}>{reason}</span>
                                )}
                              </div>
                              <div style={{ textAlign: 'right' }}>
                                <div style={{ color: '#ff453a', fontWeight: '950', fontSize: '16px' }}>-{formatCurrency(amountBs, '')} Bs</div>
                                <div style={{ color: 'var(--text-muted)', fontSize: '11px', fontWeight: '800' }}>-${formatCurrency(amountUsd, '')} USD</div>
                              </div>
                            </div>
                            
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '10px', marginTop: '12px' }}>
                              <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <Clock size={12} style={{ opacity: 0.5 }} />
                                {t.created_at ? new Date(t.created_at).toLocaleString('es-VE', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit', hour12: true }) : 'S/F'}
                              </span>
                              <span style={{ fontSize: '10px', color: 'var(--text-muted)', letterSpacing: '1px' }}>ID: {t.id.slice(0,8)}</span>
                            </div>
                          </div>
                        );
                      }

                      // CASO 2: SERVICIO / VENTA (Ingresos)
                      const descParts = t.description.split(' - ');
                      const clientFromDesc = descParts.find(s => s.toLowerCase().includes('cliente:'))?.split(': ')[1];
                      const serviceFromDesc = descParts.find(s => s.toLowerCase().includes('servi:'))?.split(': ')[1];

                      const clientName = t.metadata?.clientName || clientFromDesc || 'S/N';
                      const serviceName = t.metadata?.serviceName || serviceFromDesc || (t.category === 'Ventas Panda' ? 'Servicio' : t.description);
                      
                      const stInvolved = t.metadata?.staffInvolved?.find(s => String(s.staffId) === String(payrollDetail.staff.id));
                      const commBs = stInvolved?.commissionBs || 0;
                      const commUsd = stInvolved?.commissionEarned || 0;
                      const prodCommBs = stInvolved?.productCommissionBs || 0;
                      const prodCommUsd = stInvolved?.productCommissionEarned || 0;
                      const tipBs = stInvolved?.tipBs || 0;
                      const tipUsd = stInvolved?.tip || 0;
                      const commissionPct = Number(stInvolved?.commissionPct || payrollDetail.staff?.commission_pct || 60);
                      const grossServiceUsd = commissionPct > 0 ? commUsd / (commissionPct / 100) : 0;
                      const grossServiceBs = commissionPct > 0 ? commBs / (commissionPct / 100) : 0;
                      
                      const totalEarningsBs = commBs + prodCommBs;
                      const totalEarningsUsd = commUsd + prodCommUsd;

                      // Identificación inteligente del método de pago real basada en montos reales
                      let methodText = 'Efectivo';
                      const cashUsdAmount = Number(t.metadata?.cash_usd) || 0;
                      const transferBsAmount = Number(t.metadata?.transfer_bs) || 0;

                      if (t.metadata?.mixed_payment || (cashUsdAmount > 0 && transferBsAmount > 0)) {
                        const usdPart = t.metadata?.method_usd || 'Efectivo';
                        const bsPart = t.metadata?.method_bs || 'Pago Móvil';
                        methodText = `Mixto (${usdPart} + ${bsPart})`;
                      } else if (transferBsAmount > 0 && cashUsdAmount === 0) {
                        methodText = t.metadata?.method_bs || 'Pago Móvil';
                      } else if (cashUsdAmount > 0 && transferBsAmount === 0) {
                        methodText = t.metadata?.method_usd || 'Efectivo';
                      } else {
                        const mUsd = t.metadata?.method_usd;
                        const mBs = t.metadata?.method_bs;
                        if (mUsd && mUsd !== 'N/A' && mUsd !== 'No aplica') {
                          methodText = mUsd;
                        } else if (mBs && mBs !== 'N/A' && mBs !== 'No aplica') {
                          methodText = mBs;
                        } else {
                          methodText = t.description.split(' - ')[2] || 'Efectivo';
                        }
                      }

                      return (
                        <div key={idx} style={{ 
                          background: 'linear-gradient(145deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.01) 100%)', 
                          padding: '24px', 
                          borderRadius: '24px', 
                          border: '1px solid rgba(255,255,255,0.05)',
                          position: 'relative',
                          overflow: 'hidden',
                          marginBottom: '16px'
                        }}>
                          {/* Accent line */}
                          <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '4px', background: t.metadata?.didWash ? 'linear-gradient(to bottom, #007aff, #00c6ff)' : 'rgba(255,255,255,0.15)' }}></div>

                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', paddingLeft: '8px' }}>
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                              <span style={{ fontWeight: '900', fontSize: '18px', color: 'white', letterSpacing: '-0.5px' }}>{serviceName}</span>
                              <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: '600', marginTop: '6px' }}>
                                <span style={{ color: 'var(--gold-primary)', fontWeight: '800' }}>{clientName}</span> <span style={{opacity: 0.5, margin: '0 4px'}}>•</span> Base del servicio ({commissionPct}%): <span style={{ color: 'white', fontWeight: '800' }}>${grossServiceUsd.toFixed(2)} USD</span> <span style={{opacity: 0.6, whiteSpace: 'nowrap'}}>({grossServiceBs.toFixed(2)} Bs)</span>
                              </span>
                            </div>
                            <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', justifyContent: 'center' }}>
                              <div style={{ color: '#32d74b', fontWeight: '900', fontSize: '20px', letterSpacing: '-0.5px', whiteSpace: 'nowrap' }}>+{formatCurrency(totalEarningsBs, '')} Bs</div>
                              <div style={{ color: '#32d74b', opacity: 0.9, fontSize: '12px', fontWeight: '800', background: 'rgba(50, 215, 75, 0.15)', padding: '2px 8px', borderRadius: '12px', marginTop: '4px', whiteSpace: 'nowrap' }}>+${formatCurrency(totalEarningsUsd, '')} USD</div>
                            </div>
                          </div>
                          
                          {/* Desglose de ganancias reales del barbero */}
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', margin: '16px 0', padding: '16px', background: 'var(--bg-secondary)', borderRadius: '16px', fontSize: '12px', border: '1px solid rgba(255,255,255,0.03)', boxShadow: 'inset 0 4px 12px rgba(0,0,0,0.2)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span style={{ color: 'var(--text-secondary)', fontWeight: '600' }}>Comisión Servicio:</span>
                              <span style={{ color: 'white', fontWeight: '800', fontFamily: 'monospace', fontSize: '13px' }}>${commUsd.toFixed(2)} USD <span style={{opacity: 0.5, whiteSpace: 'nowrap'}}>({commBs.toFixed(2)} Bs)</span></span>
                            </div>
                            {prodCommUsd > 0 && (
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ color: 'var(--text-secondary)', fontWeight: '600' }}>Comisión Productos:</span>
                                <span style={{ color: 'white', fontWeight: '800', fontFamily: 'monospace', fontSize: '13px' }}>${prodCommUsd.toFixed(2)} USD <span style={{opacity: 0.5, whiteSpace: 'nowrap'}}>({prodCommBs.toFixed(2)} Bs)</span></span>
                              </div>
                            )}
                            {tipUsd > 0 && (
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#32d74b', marginTop: '4px', paddingTop: '8px', borderTop: '1px solid rgba(50,215,75,0.2)' }}>
                                <span style={{ fontWeight: '800', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                  <Gift size={14} color="#32d74b" /> Propina:
                                </span>
                                <span style={{ fontWeight: '800', fontFamily: 'monospace', fontSize: '13px' }}>+${tipUsd.toFixed(2)} USD <span style={{opacity: 0.7, whiteSpace: 'nowrap'}}>(+{tipBs.toFixed(2)} Bs)</span></span>
                              </div>
                            )}
                          </div>

                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '16px', paddingLeft: '8px' }}>
                            <span style={{ fontSize: '11px', background: 'rgba(255,255,255,0.08)', color: 'white', padding: '6px 12px', borderRadius: '8px', fontWeight: '700', border: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', gap: '6px', letterSpacing: '0.5px' }}>
                              <CreditCard size={13} style={{ opacity: 0.6 }} /> {methodText.toUpperCase()}
                            </span>
                            {t.metadata?.didWash && (
                              <span style={{ fontSize: '11px', background: 'linear-gradient(45deg, rgba(0,122,255,0.15), rgba(0,198,255,0.15))', color: '#64d2ff', padding: '6px 12px', borderRadius: '8px', fontWeight: '800', border: '1px solid rgba(0,122,255,0.3)', display: 'flex', alignItems: 'center', gap: '6px', letterSpacing: '0.5px' }}>
                                <Droplets size={13} color="#64d2ff" /> LIMPIEZA
                              </span>
                            )}
                          </div>

                          {(t.metadata?.extras?.length > 0 || t.metadata?.products_sold?.length > 0) && (
                            <div style={{ padding: '16px', background: 'rgba(255, 255, 255, 0.05)', borderRadius: '16px', marginBottom: '16px', border: '1px dashed rgba(255, 255, 255, 0.2)' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                                <ShoppingBag size={14} color="var(--gold-primary)" />
                                <div style={{ fontSize: '11px', color: 'var(--gold-primary)', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '1px' }}>Detalle de Venta</div>
                              </div>
                              {t.metadata?.extras?.map((ex, eidx) => (
                                <div key={eidx} style={{ fontSize: '12px', color: 'white', display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                                  <span style={{ color: 'var(--text-secondary)', fontWeight: '600' }}>• {ex.service_extras?.name || 'Extra'} <span style={{opacity:0.5, fontSize:'10px'}}>(Extra)</span></span>
                                  <span style={{ color: 'var(--gold-primary)', fontWeight: '800', fontFamily: 'monospace' }}>+${ex.price.toFixed(2)}</span>
                                </div>
                              ))}
                              {t.metadata?.products_sold?.map((p, pidx) => (
                                <div key={pidx} style={{ fontSize: '12px', color: 'white', display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                                  <span style={{ color: 'var(--text-secondary)', fontWeight: '600' }}>• {p.name} <span style={{color: 'var(--gold-primary)', opacity: 0.8}}>(x{p.quantity})</span></span>
                                  <span style={{ color: 'var(--gold-primary)', fontWeight: '800', fontFamily: 'monospace' }}>+${(p.price * p.quantity).toFixed(2)}</span>
                                </div>
                              ))}
                            </div>
                          )}

                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px dashed rgba(255,255,255,0.1)', paddingTop: '16px', paddingLeft: '8px' }}>
                            <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <Clock size={13} style={{ opacity: 0.5 }} /> {t.created_at ? new Date(t.created_at).toLocaleString('es-VE', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', hour12: true }) : 'S/F'}
                            </span>
                            <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'monospace', background: 'rgba(255,255,255,0.05)', padding: '4px 8px', borderRadius: '6px', fontWeight: '600' }}>ID: {t.id.slice(0,8)}</span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                <button onClick={() => setPayrollDetail({ isOpen: false, staff: null, transactions: [] })} className="btn-gold" style={{ width: '100%', marginTop: '24px', padding: '14px', borderRadius: '12px', fontWeight: '800' }}>Cerrar</button>
              </div>}
            </div>
            )}
          </AnimatedModal>
        

      {editTx.transaction && (
        <AnimatedModal isOpen={editTx.isOpen}>
          {(overlayClass, cardClass) => (
            <div className={overlayClass} onClick={closeEditTransactionModal}>
              <div className={`${cardClass.replace('global-modal-card', '')} finance-edit-modal-card`} onClick={e => e.stopPropagation()} style={{ maxWidth: editTx.transaction.type === 'expense' ? 'min(760px, 94vw)' : 'min(1120px, 94vw)', width: '94vw', height: editTx.transaction.type === 'expense' ? 'min(720px, 90vh)' : 'min(820px, 90vh)', maxHeight: '90vh', overflow: 'hidden', padding: isMobile ? '16px' : '24px', borderRadius: '24px', background: 'var(--bg-secondary)', border: '1px solid rgba(255,255,255,0.08)', boxShadow: '0 30px 60px -12px rgba(0,0,0,0.5)', display: 'flex', flexDirection: 'column' }}>
                <div className="finance-edit-modal-heading" style={{ display: 'flex', alignItems: 'center', marginBottom: '18px', flexShrink: 0 }}>
                  <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '900' }}>{editTx.transaction.type === 'expense' ? 'Editar egreso' : 'Editar transacción'}</h3>
                </div>
                {editTx.transaction.type === 'expense' ? (
                  <EditExpenseContent transaction={editTx.transaction} rates={rates} staff={staff} onSave={handleSaveEditExpense} onCancel={closeEditTransactionModal} isMobile={isMobile} />
                ) : (
                  <EditTransactionContent transaction={editTx.transaction} rates={rates} staff={staff} onSave={handleSaveEditTransaction} onCancel={closeEditTransactionModal} isMobile={isMobile} />
                )}
              </div>
            </div>
          )}
        </AnimatedModal>
      )}

      <PandaDialog 
        isOpen={dialog.isOpen}
        title={dialog.title}
        message={dialog.message}
        type={dialog.type}
        placeholder={dialog.placeholder}
        onConfirm={dialog.onConfirm}
        onCancel={() => setDialog({ ...dialog, isOpen: false })}
      />

      <style>{`
        .table-row-hover:hover {
          background-color: rgba(255,255,255,0.02);
        }
        .finance-edit-modal-card .finance-edit-transaction,
        .finance-edit-modal-card .finance-edit-expense {
          flex: 1;
          min-height: 0;
        }
        .finance-edit-modal-card .finance-edit-transaction {
          overflow: hidden;
        }
        .finance-edit-modal-card .finance-edit-layout {
          display: grid;
          min-height: 0;
          flex: 1;
          grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
          align-items: start;
          gap: 14px;
          overflow-y: auto;
          padding: 2px 7px 8px 2px;
          scrollbar-color: rgba(17, 17, 17,.25) transparent;
          scrollbar-width: thin;
        }
        .finance-edit-modal-card .finance-edit-column {
          display: flex;
          min-width: 0;
          flex-direction: column;
          gap: 14px;
        }
        .finance-edit-modal-card .finance-edit-footer {
          flex-shrink: 0;
          margin-top: 0;
          background: linear-gradient(180deg, rgba(20,20,22,.2), rgba(20,20,22,.96) 28%);
        }
        .finance-edit-modal-card .finance-edit-expense {
          overflow-y: auto;
          padding-right: 7px;
          scrollbar-color: rgba(17, 17, 17,.25) transparent;
          scrollbar-width: thin;
        }
        @media (max-width: 760px) {
          .finance-edit-modal-card .finance-edit-layout {
            grid-template-columns: 1fr;
          }
          .finance-edit-modal-card .finance-edit-footer {
            align-items: flex-end !important;
            gap: 12px;
          }
          .finance-edit-modal-card .finance-edit-footer > div:last-child {
            flex-direction: column-reverse;
          }
        }
      `}</style>
    </div>
  );
};

export default FinanceModule;
