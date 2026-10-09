import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { 
  CalendarRange, 
  ChevronDown, 
  ChevronLeft, 
  ChevronRight, 
  Coins, 
  Droplets, 
  ReceiptText, 
  Scissors,
  User,
  CreditCard,
  Building2,
  Users,
  TrendingUp
} from 'lucide-react';
import { dataService } from '../services/dataService';
import { SkeletonList } from './Skeleton';
import {
  businessDateEnd,
  businessDateStart,
  getBusinessMonthStart,
  getBusinessWeekStart
} from '../utils/dateTime';

const MONTH_NAMES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
const DAY_NAMES = ['do','lu','ma','mi','ju','vi','sá'];

const toDateStr = (y, m, d) =>
  `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

const todayStr = () => {
  const t = new Date();
  return toDateStr(t.getFullYear(), t.getMonth(), t.getDate());
};

const DatePicker = ({ value, onChange, placeholder, min }) => {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0, width: 0 });
  const [view, setView] = useState(() => {
    if (value) { const [y, m] = value.split('-'); return new Date(+y, +m - 1, 1); }
    return new Date();
  });
  const btnRef = useRef(null);
  const dropRef = useRef(null);
  const [mounted, setMounted] = useState(false);
  const [closing, setClosing] = useState(false);
  const closeTimer = useRef(null);

  useEffect(() => {
    if (value) { const [y, m] = value.split('-'); setView(new Date(+y, +m - 1, 1)); }
  }, [value]);

  useEffect(() => {
    if (open) {
      clearTimeout(closeTimer.current);
      setMounted(true);
      setClosing(false);
    } else if (mounted) {
      setClosing(true);
      closeTimer.current = setTimeout(() => {
        setMounted(false);
        setClosing(false);
      }, 160);
    }
    return () => clearTimeout(closeTimer.current);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const updatePos = () => {
      if (!btnRef.current) return;
      const r = btnRef.current.getBoundingClientRect();
      const calWidth = 252;
      const left = Math.min(r.left, window.innerWidth - calWidth - 8);
      setPos({ top: r.bottom + 8, left: Math.max(8, left), width: r.width });
    };
    updatePos();
    const onOutside = (e) => {
      if (btnRef.current?.contains(e.target) || dropRef.current?.contains(e.target)) return;
      setOpen(false);
    };
    document.addEventListener('mousedown', onOutside);
    window.addEventListener('scroll', updatePos, true);
    return () => {
      document.removeEventListener('mousedown', onOutside);
      window.removeEventListener('scroll', updatePos, true);
    };
  }, [open]);

  const year = view.getFullYear();
  const month = view.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDay = new Date(year, month, 1).getDay();
  const today = todayStr();

  const formatDisplay = (v) => {
    if (!v) return placeholder || 'dd/mm/aaaa';
    const [y, m, d] = v.split('-');
    return `${d}/${m}/${y}`;
  };

  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const dropdown = mounted && createPortal(
    <div ref={dropRef} className="datepicker-dropdown" style={{
      position: 'fixed', top: pos.top, left: pos.left, zIndex: 99999,
      background: 'var(--bg-secondary)', border: '1px solid rgba(255,255,255,0.12)',
      borderRadius: '18px', padding: '16px', width: '252px',
      boxShadow: '0 24px 64px rgba(0,0,0,0.9)',
      pointerEvents: closing ? 'none' : 'auto',
      animation: closing ? 'scaleOut 0.15s ease-in forwards' : 'scaleIn 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
      transformOrigin: 'top left'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
        <button onClick={() => setView(new Date(year, month - 1, 1))} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '4px', display: 'flex', borderRadius: '8px' }}>
          <ChevronLeft size={18} />
        </button>
        <span style={{ fontWeight: '800', fontSize: '14px', color: 'white' }}>
          {MONTH_NAMES[month]} {year}
        </span>
        <button onClick={() => setView(new Date(year, month + 1, 1))} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '4px', display: 'flex', borderRadius: '8px' }}>
          <ChevronRight size={18} />
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', marginBottom: '6px' }}>
        {DAY_NAMES.map(d => (
          <div key={d} style={{ textAlign: 'center', fontSize: '10px', fontWeight: '800', color: 'var(--text-muted)', padding: '4px 0', textTransform: 'uppercase' }}>
            {d}
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', gap: '2px' }}>
        {cells.map((day, idx) => {
          if (!day) return <div key={`e${idx}`} />;
          const dateStr = toDateStr(year, month, day);
          const isSelected = value === dateStr;
          const isToday = dateStr === today;
          const disabled = min ? dateStr < min : false;
          return (
            <button
              key={day}
              disabled={disabled}
              onClick={() => { onChange(dateStr); setOpen(false); }}
              style={{
                padding: '7px 0', borderRadius: '8px', border: 'none',
                background: isSelected ? 'var(--gold-primary)' : isToday ? 'rgba(17, 17, 17,0.12)' : 'transparent',
                color: disabled ? 'rgba(255,255,255,0.15)' : isSelected ? '#080808' : isToday ? 'var(--gold-primary)' : 'white',
                fontSize: '12px', fontWeight: isSelected || isToday ? '900' : '600',
                cursor: disabled ? 'not-allowed' : 'pointer', textAlign: 'center',
                outline: isToday && !isSelected ? '1px solid rgba(17, 17, 17,0.4)' : 'none'
              }}
            >
              {day}
            </button>
          );
        })}
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '12px', paddingTop: '10px', borderTop: '1px solid rgba(255,255,255,0.07)' }}>
        <button onClick={() => { onChange(''); setOpen(false); }} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '12px', fontWeight: '700' }}>
          Borrar
        </button>
        <button onClick={() => { onChange(today); setOpen(false); setView(new Date()); }} style={{ background: 'none', border: 'none', color: 'var(--gold-primary)', cursor: 'pointer', fontSize: '12px', fontWeight: '800' }}>
          Hoy
        </button>
      </div>
    </div>,
    document.body
  );

  return (
    <div style={{ position: 'relative' }}>
      <button
        ref={btnRef}
        onClick={() => setOpen(o => !o)}
        style={{
          width: '100%', padding: '10px 14px', borderRadius: '10px', cursor: 'pointer',
          background: 'var(--bg-secondary)', border: `1px solid ${open ? 'var(--gold-primary)' : 'rgba(255,255,255,0.1)'}`,
          color: value ? 'white' : 'var(--text-muted)', fontSize: '13px', fontWeight: '700',
          textAlign: 'left', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px'
        }}
      >
        <span>{formatDisplay(value)}</span>
        <CalendarRange size={14} color="var(--gold-primary)" />
      </button>
      {dropdown}
    </div>
  );
};

const FILTERS = [
  { id: 'week', label: 'Semana' },
  { id: 'month', label: 'Mes' },
  { id: 'custom', label: 'Rango' },
  { id: 'all', label: 'Todo' }
];

const getStaffAmounts = (transaction, staffId) => {
  const member = (transaction.metadata?.staffInvolved || []).find(
    item => String(item.staffId || item.id) === String(staffId)
  );
  const isAssistantWash = transaction.metadata?.didWash && /asistente|lavado|operaciones/i.test(String(member?.role || ''));
  const commission = isAssistantWash
    ? Math.max(1, Number(transaction.metadata?.washCount || 1)) * Number(transaction.metadata?.washRate || 1) * (Number(transaction.metadata?.washAssistantSharePct || 60) / 100)
    : Number(member?.commissionEarned ?? member?.commission_earned ?? 0);
  const productCommission = Number(member?.productCommissionEarned ?? member?.product_commission ?? 0);
  const tips = Number(member?.tip ?? member?.tip_amount ?? 0);
  return {
    commission,
    productCommission,
    tips,
    earnings: commission + productCommission + tips
  };
};

const getQueryRange = (filter, customRange) => {
  if (filter === 'week') return { start: getBusinessWeekStart().toISOString(), end: null };
  if (filter === 'month') return { start: getBusinessMonthStart().toISOString(), end: null };
  if (filter === 'custom' && customRange.start && customRange.end) {
    return {
      start: businessDateStart(customRange.start).toISOString(),
      end: businessDateEnd(customRange.end).toISOString()
    };
  }
  return { start: null, end: null };
};

const MoneyRow = ({ label, usd, transactionRate, accent = false, strong = false }) => {
  const numUsd = Number(usd || 0);
  const numBs = Math.round(numUsd * transactionRate);
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '12px', marginBottom: '8px', paddingBottom: strong ? '8px' : 0, borderBottom: strong ? '1px dashed rgba(255,255,255,0.08)' : 'none' }}>
      <span style={{ color: accent ? '#32d74b' : 'var(--text-secondary)', fontSize: '12px', fontWeight: accent || strong ? '850' : '650' }}>{label}</span>
      <span style={{ textAlign: 'right', color: accent ? '#32d74b' : strong ? 'var(--gold-primary)' : '#fff', fontSize: strong ? '14px' : '12px', fontWeight: '900', whiteSpace: 'nowrap' }}>
        {numBs.toLocaleString('es-VE')} Bs.
        <small style={{ display: 'block', color: 'rgba(255,255,255,0.7)', fontSize: '10.5px', marginTop: '1px', fontWeight: '800' }}>
          ≈ ${numUsd.toFixed(2)} USD
        </small>
      </span>
    </div>
  );
};

const getPaymentMethod = metadata => {
  const cashUsd = Number(metadata.cash_usd ?? metadata.cashUsd ?? 0);
  const transferBs = Number(metadata.transfer_bs ?? metadata.transferBs ?? 0);
  const usdMethod = metadata.methodUsd || metadata.method_usd;
  const bsMethod = metadata.methodBs || metadata.method_bs;
  const methods = [];

  if (cashUsd > 0 && usdMethod && usdMethod !== 'N/A') methods.push(usdMethod);
  if (transferBs > 0 && bsMethod && bsMethod !== 'N/A') methods.push(bsMethod);
  if (methods.length === 0) {
    [metadata.paymentMethod, bsMethod, usdMethod]
      .filter(method => method && method !== 'N/A')
      .forEach(method => methods.push(method));
  }
  return [...new Set(methods)].join(' + ') || 'Método no registrado';
};

const getTransactionRate = (transaction, fallbackRate) => {
  const savedRate = Number(
    transaction.exchange_rate
      || transaction.metadata?.fixedRate
      || transaction.metadata?.bcvRate
      || transaction.metadata?.exchange_rate
  );
  return savedRate > 0 ? savedRate : fallbackRate;
};

const StaffTransactionHistory = ({ staffMember, rates, isMobile }) => {
  const [filter, setFilter] = useState('week');
  const [customRange, setCustomRange] = useState({ start: '', end: '' });
  const [transactions, setTransactions] = useState([]);
  const [selectedTransactionId, setSelectedTransactionId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const isAssistant = /asistente|lavado|operaciones/i.test(staffMember?.role || '');
  const customStart = customRange.start;
  const customEnd = customRange.end;

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!staffMember?.id) return;
      if (filter === 'custom' && (!customStart || !customEnd)) {
        setTransactions([]);
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        setError('');
        const range = getQueryRange(filter, { start: customStart, end: customEnd });
        const data = await dataService.getStaffTransactions(staffMember.id, range.start, range.end);
        if (!cancelled) setTransactions(data);
      } catch (loadError) {
        console.error('Error loading staff transaction history:', loadError);
        if (!cancelled) {
          setTransactions([]);
          setError('No se pudo cargar el historial.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [staffMember?.id, filter, customStart, customEnd]);

  const getDeduplicationKey = (t) => {
    if (!t) return '';
    const metadata = t.metadata || {};
    const appointment = t.appointments?.[0] || null;
    const desc = (t.description || '').toLowerCase();
    const descriptionClient = t.description?.match(/Cliente:\s*(.*?)(?:\s+-\s+(?:Servi|Servicio):|$)/i)?.[1];
    const clientName = (t.client?.name || appointment?.clients?.name || metadata.clientName || metadata.client_name || metadata.originalClientName || descriptionClient || 'Cliente').toLowerCase();
    const serviceName = (appointment?.services?.name || metadata.serviceName || metadata.service_name || 'Servicio').toLowerCase();
    
    const normClient = clientName.replace(/[^a-z0-9]/g, '');
    const amountVal = Number(t.amount || 0).toFixed(2);
    const dateDay = t.created_at ? new Date(t.created_at).toISOString().split('T')[0] : '';

    if (normClient && normClient !== 'sn' && normClient !== 'cliente') {
      return `client_${dateDay}_${normClient}_${amountVal}`;
    }

    let referenceNo = (metadata.paymentReferenceBs || metadata.payment_reference_bs || metadata.paymentReference || metadata.reference_number || metadata.reference || metadata.transfer_ref || metadata.transferRef || metadata.ref || '').trim();
    if (!referenceNo) {
      const match = desc.match(/ref[.:\s]*([0-9a-z]+)/i);
      if (match) referenceNo = match[1];
    }

    if (referenceNo.length > 1 && referenceNo !== '0' && referenceNo !== '0000') {
      return `ref_${dateDay}_${referenceNo}_${amountVal}`;
    }

    const rawAppIds = [
      metadata.appointment_id,
      ...(Array.isArray(metadata.appointmentIds) ? metadata.appointmentIds : (metadata.appointmentIds ? [metadata.appointmentIds] : []))
    ].filter(Boolean);

    if (rawAppIds.length > 0) {
      return `app_${rawAppIds.map(String).sort().join('_')}`;
    }

    const dateMinuteStr = t.created_at ? new Date(t.created_at).toISOString().substring(0, 16) : '';
    return `tx_${normClient}_${serviceName.replace(/[^a-z0-9]/g, '')}_${amountVal}_${dateMinuteStr}`;
  };

  const rows = useMemo(() => {
    const seenTxIds = new Set();
    const seenKeys = new Set();
    const unique = [];

    for (const transaction of transactions) {
      if (!transaction?.id || seenTxIds.has(transaction.id)) continue;
      const key = getDeduplicationKey(transaction);
      if (key && seenKeys.has(key)) continue;

      seenTxIds.add(transaction.id);
      if (key) seenKeys.add(key);

      unique.push({
        ...transaction,
        staffAmounts: getStaffAmounts(transaction, staffMember.id)
      });
    }
    return unique;
  }, [transactions, staffMember.id]);

  const rate = Number(rates?.usd || 550);

  const totals = useMemo(
    () => rows.reduce((summary, transaction) => ({
      earnings: summary.earnings + transaction.staffAmounts.earnings,
      earningsBs: summary.earningsBs + (transaction.staffAmounts.earnings * getTransactionRate(transaction, rate)),
      tips: summary.tips + transaction.staffAmounts.tips,
      tipsBs: summary.tipsBs + (transaction.staffAmounts.tips * getTransactionRate(transaction, rate))
    }), { earnings: 0, earningsBs: 0, tips: 0, tipsBs: 0 }),
    [rows, rate]
  );

  const formatUsd = value => Number(value || 0).toFixed(2);
  const formatBs = value => Math.round(Number(value || 0)).toLocaleString('es-VE');

  return (
    <section className={'animate-fade-in staff-history'} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <style>{`
        .staff-history-filter { display: flex; gap: 5px; padding: 3px; border-radius: 10px; background: rgba(0,0,0,.3); flex-wrap: wrap; }
        .staff-history-metrics { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
        .staff-history-date-group { display: flex; align-items: center; gap: 9px; margin: 6px 2px 1px; color: rgba(255,255,255,.7); font-size: 10px; font-weight: 900; letter-spacing: .7px; text-transform: uppercase; }
        .staff-history-date-group::after { content: ''; height: 1px; flex: 1; background: linear-gradient(90deg, rgba(17, 17, 17,.22), transparent); }
        @media (max-width: 720px) {
          .staff-history { gap: 10px !important; }
          .staff-history-head { padding: 14px !important; border-radius: 18px !important; }
          .staff-history-head-row { align-items: flex-start !important; gap: 10px !important; }
          .staff-history-title h3 { font-size: 16px !important; }
          .staff-history-title p { max-width: 220px; margin-top: 4px !important; font-size: 9px !important; line-height: 1.35; }
          .staff-history-filter { width: 100%; display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 3px; margin-top: 10px; }
          .staff-history-filter button { min-width: 0; padding: 7px 2px !important; font-size: 8px !important; }
          .staff-history-metrics { grid-template-columns: repeat(3, minmax(0, 1fr)) !important; gap: 0 !important; padding: 5px; border: 1px solid rgba(255,255,255,.065); border-radius: 16px; background: rgba(255,255,255,.022); }
          .staff-history-metric { min-height: 68px; padding: 8px 3px !important; border: 0 !important; border-radius: 11px !important; background: transparent !important; box-shadow: none !important; }
          .staff-history-metric + .staff-history-metric { border-left: 1px solid rgba(255,255,255,.065) !important; border-radius: 0 !important; }
          .staff-history-metric-label { min-height: 23px; justify-content: center; gap: 4px !important; text-align: center; font-size: 6.5px !important; line-height: 1.15; }
          .staff-history-metric-label svg { width: 13px; height: 13px; flex: 0 0 auto; }
          .staff-history-metric-value { margin-top: 4px !important; text-align: center; font-size: 14px !important; white-space: nowrap; }
          .staff-history-metric-ref { text-align: center; font-size: 8px !important; }
          .staff-history-list { padding: 11px !important; border-radius: 18px !important; }
          .staff-history-empty { min-height: 112px; padding: 18px 12px !important; }
          .staff-history-empty svg { display: block; margin: 0 auto 8px; color: var(--gold-primary); opacity: .7; }
          .staff-history-transaction { grid-template-columns: 48px minmax(0, 1fr) auto !important; gap: 9px !important; padding: 12px !important; }
          .staff-history-transaction-date .full-date { display: none !important; }
          .staff-history-transaction-date .time { margin: 0 !important; color: var(--gold-primary) !important; font-size: 9px !important; font-weight: 850; white-space: nowrap; }
          .staff-history-transaction-main { min-width: 0; }
          .staff-history-transaction-main .client { font-size: 12px !important; overflow-wrap: anywhere; }
          .staff-history-transaction-main .service { font-size: 10px !important; }
          .staff-history-transaction-main .method { font-size: 8px !important; }
          .staff-history-transaction-amount { text-align: right !important; }
          .staff-history-transaction-amount > div { justify-content: flex-end !important; }
          .staff-history-transaction-amount .amount { font-size: 12px !important; white-space: nowrap; }
          .staff-history-transaction-amount .reference { font-size: 8px !important; }
        }
      `}</style>
      <div className={'glass-card staff-history-head'} style={{ padding: isMobile ? '18px' : '24px', borderRadius: '24px' }}>
        <div className="staff-history-head-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
          <div className="staff-history-title">
            <div style={{ display: 'flex', alignItems: 'center', gap: '9px' }}>
              <ReceiptText size={19} color={'var(--gold-primary)'} />
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '900' }}>Mi historial</h3>
            </div>
            <p style={{ margin: '6px 0 0', color: 'var(--text-secondary)', fontSize: '12px' }}>
              Solo se muestran operaciones asociadas a {staffMember.name}.
            </p>
          </div>
          <div className="staff-history-filter">
            {FILTERS.map(option => (
              <button
                key={option.id}
                onClick={() => setFilter(option.id)}
                style={{
                  padding: '7px 12px',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontWeight: '850',
                  fontSize: '11px',
                  color: filter === option.id ? '#080808' : 'var(--text-secondary)',
                  background: filter === option.id ? 'var(--gold-primary)' : 'transparent'
                }}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        {filter === 'custom' && (
          <div style={{ display: 'flex', gap: '12px', marginTop: '18px', flexWrap: 'wrap' }}>
            <label style={{ flex: 1, minWidth: '150px', color: 'var(--text-secondary)', fontSize: '11px', fontWeight: '800' }}>
              DESDE
              <div style={{ marginTop: '6px' }}>
                <DatePicker
                  value={customRange.start}
                  onChange={v => setCustomRange(c => ({ ...c, start: v }))}
                  placeholder="dd/mm/aaaa"
                />
              </div>
            </label>
            <label style={{ flex: 1, minWidth: '150px', color: 'var(--text-secondary)', fontSize: '11px', fontWeight: '800' }}>
              HASTA
              <div style={{ marginTop: '6px' }}>
                <DatePicker
                  value={customRange.end}
                  onChange={v => setCustomRange(c => ({ ...c, end: v }))}
                  placeholder="dd/mm/aaaa"
                  min={customRange.start || undefined}
                />
              </div>
            </label>
          </div>
        )}
      </div>

      <div className="staff-history-metrics">
        {[
          { label: isAssistant ? 'Comisiones y propinas' : 'Ganancia personal', value: totals.earnings, valueBs: totals.earningsBs, icon: <Coins size={18} color={'#32d74b'} /> },
          { label: 'Propinas', value: totals.tips, valueBs: totals.tipsBs, icon: <Coins size={18} color={'#ff9f0a'} /> },
          { label: isAssistant ? 'Limpiezas registradas' : 'Servicios cobrados', count: rows.length, icon: isAssistant ? <Droplets size={18} color={'#007aff'} /> : <Scissors size={18} color={'var(--gold-primary)'} /> }
        ].map(card => (
          <div key={card.label} className={'glass-card staff-history-metric'} style={{ padding: '18px', borderRadius: '18px' }}>
            <div className="staff-history-metric-label" style={{ display: 'flex', gap: '8px', alignItems: 'center', color: 'var(--text-secondary)', fontSize: '11px', fontWeight: '850', textTransform: 'uppercase' }}>
              {card.icon} {card.label}
            </div>
            <div className="staff-history-metric-value" style={{ marginTop: '10px', fontSize: '23px', fontWeight: '950', color: 'white' }}>
              {card.count !== undefined ? card.count : `${formatBs(card.valueBs)} Bs.`}
            </div>
            {card.count === undefined && (
              <div className="staff-history-metric-ref" style={{ marginTop: '3px', color: 'rgba(255,255,255,0.7)', fontSize: '11px', fontWeight: '800' }}>
                ≈ ${formatUsd(card.value)} USD
              </div>
            )}
          </div>
        ))}
      </div>

      <div className={'glass-card staff-history-list'} style={{ padding: isMobile ? '16px' : '22px', borderRadius: '24px' }}>
        {loading ? (
          <SkeletonList rows={4} rowHeight={40} />
        ) : error ? (
          <div style={{ padding: '36px', textAlign: 'center', color: '#ff6b6b' }}>{error}</div>
        ) : filter === 'custom' && (!customRange.start || !customRange.end) ? (
          <div style={{ padding: '36px', textAlign: 'center', color: 'var(--text-muted)' }}>
            Selecciona las fechas del rango.
          </div>
        ) : rows.length === 0 ? (
          <div className="staff-history-empty" style={{ padding: '36px', textAlign: 'center', color: 'var(--text-muted)' }}>
            <ReceiptText size={25} />
            Sin movimientos en este periodo.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {rows.map((transaction, rowIndex) => {
              const metadata = transaction.metadata || {};
              const method = getPaymentMethod(metadata);
              const referenceNo = metadata.paymentReferenceBs || metadata.payment_reference_bs || metadata.paymentReference || metadata.reference_number || metadata.reference || metadata.transfer_ref || metadata.ref || '';
              const appointment = transaction.appointments?.[0] || null;
              const descriptionClient = transaction.description?.match(/Cliente:\s*(.*?)(?:\s+-\s+(?:Servi|Servicio):|$)/i)?.[1];
              const clientName = transaction.client?.name || appointment?.clients?.name || metadata.clientName || metadata.client_name || metadata.originalClientName || descriptionClient || 'Cliente no identificado';
              const serviceName = appointment?.services?.name || metadata.serviceName || metadata.service_name || (isAssistant ? 'Limpieza' : 'Servicio');
              const transactionRate = getTransactionRate(transaction, rate);
              const personalBs = transaction.staffAmounts.earnings * transactionRate;
              const cashUsd = Number(metadata.cash_usd ?? metadata.cashUsd ?? 0);
              const transferBs = Number(metadata.transfer_bs ?? metadata.transferBs ?? 0);
              const selected = selectedTransactionId === transaction.id;
              const appointmentExtras = transaction.appointments?.flatMap(item => item.appointment_extras || []) || [];
              const appointmentProducts = transaction.appointments?.flatMap(item => item.appointment_products || []) || [];
              const extras = appointmentExtras.length > 0 ? appointmentExtras : (metadata.extras || []);
              const products = appointmentProducts.length > 0 ? appointmentProducts : (metadata.products_sold || []);
              const clientCedula = transaction.client?.id_card || appointment?.clients?.id_card || metadata.clientCedula || 'No registrada';
              const clientPhone = transaction.client?.phone || appointment?.clients?.phone || 'No registrado';
              const transactionDay = new Date(transaction.created_at).toLocaleDateString('es-VE', { timeZone: 'America/Caracas', day: '2-digit', month: 'long', year: 'numeric' });
              const previousDay = rowIndex > 0
                ? new Date(rows[rowIndex - 1].created_at).toLocaleDateString('es-VE', { timeZone: 'America/Caracas', day: '2-digit', month: 'long', year: 'numeric' })
                : null;
              return (
                <React.Fragment key={transaction.id}>
                {transactionDay !== previousDay && <div className="staff-history-date-group">{transactionDay}</div>}
                <article
                  className="staff-history-transaction"
                  onClick={() => setSelectedTransactionId(selected ? null : transaction.id)}
                  onKeyDown={event => {
                    if (event.key === 'Enter' || event.key === ' ') setSelectedTransactionId(selected ? null : transaction.id);
                  }}
                  role={'button'}
                  tabIndex={0}
                  aria-expanded={selected}
                  style={{ 
                    display: 'grid', 
                    gridTemplateColumns: isMobile ? '1fr' : 'minmax(150px, 0.8fr) minmax(180px, 1.6fr) minmax(170px, 0.8fr)', 
                    gap: '12px', 
                    alignItems: 'center', 
                    padding: '15px', 
                    borderRadius: '16px', 
                    background: selected ? 'rgba(17, 17, 17,0.06)' : 'rgba(255,255,255,0.025)', 
                    border: selected ? '1px solid rgba(17, 17, 17,0.3)' : '1px solid rgba(255,255,255,0.05)', 
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <div className="staff-history-transaction-date">
                    <div className="full-date" style={{ display: 'flex', alignItems: 'center', gap: '7px', color: 'var(--gold-primary)', fontWeight: '850', fontSize: '12px' }}>
                      <CalendarRange size={14} />
                      {new Date(transaction.created_at).toLocaleDateString('es-VE', { timeZone: 'America/Caracas', day: '2-digit', month: 'short', year: 'numeric' })}
                    </div>
                    <div className="time" style={{ marginTop: '4px', color: 'var(--text-muted)', fontSize: '11px' }}>
                      {new Date(transaction.created_at).toLocaleTimeString('es-VE', { timeZone: 'America/Caracas', hour: '2-digit', minute: '2-digit', hour12: true })}
                    </div>
                  </div>
                  <div className="staff-history-transaction-main">
                    <div className="client" style={{ color: 'white', fontWeight: '900', fontSize: '14px' }}>{clientName}</div>
                    <div className="service" style={{ marginTop: '3px', color: 'var(--text-secondary)', fontSize: '12px' }}>{serviceName}</div>
                    <div className="method" style={{ marginTop: '4px', color: 'var(--text-muted)', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                      <span>{method}</span>
                      {referenceNo && (
                        <span style={{ backgroundColor: 'rgba(17, 17, 17,0.15)', color: 'var(--gold-primary)', padding: '2px 7px', borderRadius: '6px', fontWeight: '800', fontSize: '10px', border: '1px solid rgba(17, 17, 17,0.25)' }}>
                          Ref: #{referenceNo}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="staff-history-transaction-amount" style={{ textAlign: isMobile ? 'left' : 'right' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: isMobile ? 'space-between' : 'flex-end', gap: '10px' }}>
                      <div>
                        <div className="amount" style={{ color: '#32d74b', fontSize: '16px', fontWeight: '950' }}>+{Math.round(personalBs).toLocaleString('es-VE')} Bs.</div>
                        <div className="reference" style={{ color: 'rgba(255,255,255,0.7)', fontSize: '10.5px', marginTop: '2px', fontWeight: '800' }}>≈ +${formatUsd(transaction.staffAmounts.earnings)} USD</div>
                      </div>
                      <ChevronDown size={16} color={'var(--text-muted)'} style={{ transform: selected ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
                    </div>
                  </div>
                  {selected && (
                    <div 
                      className={'animate-history-expand'} 
                      onClick={event => event.stopPropagation()} 
                      style={{ 
                        gridColumn: '1 / -1', 
                        paddingTop: '16px', 
                        borderTop: '1px solid rgba(255,255,255,0.08)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '12px'
                      }}
                    >
                      {/* Hero: Ganancia Neta Destacada */}
                      <div style={{
                        padding: '12px 16px',
                        borderRadius: '14px',
                        background: 'linear-gradient(135deg, rgba(50, 215, 75, 0.1) 0%, rgba(50, 215, 75, 0.03) 100%)',
                        border: '1px solid rgba(50, 215, 75, 0.25)',
                        display: 'flex',
                        flexWrap: 'wrap',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '12px'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(50, 215, 75, 0.15)', display: 'grid', placeItems: 'center', color: '#32d74b', flexShrink: 0 }}>
                            <TrendingUp size={18} />
                          </div>
                          <div>
                            <span style={{ fontSize: '11px', color: '#32d74b', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '0.4px', display: 'block' }}>
                              Tu Ganancia Neta
                            </span>
                            <div style={{ display: 'flex', gap: '8px', marginTop: '3px', flexWrap: 'wrap', alignItems: 'center' }}>
                              {transaction.staffAmounts.commission > 0 && (
                                <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.85)', fontWeight: '750' }}>
                                  Servicio: ${formatUsd(transaction.staffAmounts.commission)}
                                </span>
                              )}
                              {transaction.staffAmounts.tips > 0 && (
                                <span style={{ fontSize: '11px', color: '#32d74b', fontWeight: '850' }}>
                                  · Propina: +${formatUsd(transaction.staffAmounts.tips)}
                                </span>
                              )}
                              {transaction.staffAmounts.productCommission > 0 && (
                                <span style={{ fontSize: '11px', color: 'var(--gold-primary)', fontWeight: '850' }}>
                                  · Comisión productos: +${formatUsd(transaction.staffAmounts.productCommission)}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div style={{ textAlign: isMobile ? 'left' : 'right' }}>
                          <div style={{ color: '#32d74b', fontSize: '18px', fontWeight: '950', letterSpacing: '-0.3px' }}>
                            +{Math.round(personalBs).toLocaleString('es-VE')} Bs.
                          </div>
                          <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: '11.5px', fontWeight: '800', marginTop: '1px' }}>
                            ≈ +${formatUsd(transaction.staffAmounts.earnings)} USD
                          </div>
                        </div>
                      </div>

                      {/* 2 Columnas: Cliente & Cita VS Cobro y Pago */}
                      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, minmax(0, 1fr))', gap: '12px' }}>
                        {/* Columna Izquierda: Cliente & Detalle del Servicio */}
                        <div style={{ padding: '15px', borderRadius: '15px', background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '9px' }}>
                            <User size={15} color="var(--gold-primary)" />
                            <span style={{ fontSize: '11px', fontWeight: '900', color: 'var(--gold-primary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                              Cliente y Servicio
                            </span>
                          </div>

                          <div>
                            <div style={{ fontSize: '14px', fontWeight: '900', color: '#fff' }}>{clientName}</div>
                            <div style={{ display: 'flex', gap: '10px', fontSize: '11px', color: 'var(--text-muted)', marginTop: '3px', flexWrap: 'wrap' }}>
                              {clientCedula !== 'No registrada' && <span>CI: {clientCedula}</span>}
                              {clientPhone !== 'No registrado' && <span>· Tel: {clientPhone}</span>}
                            </div>
                          </div>

                          <div style={{ background: 'var(--bg-secondary)', padding: '10px 12px', borderRadius: '11px', border: '1px solid rgba(255,255,255,0.04)', marginTop: '2px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span style={{ fontSize: '12.5px', fontWeight: '850', color: '#fff' }}>{serviceName}</span>
                            </div>
                            {extras.map((extra, idx) => (
                              <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                                <span>+ {extra.service_extras?.name || extra.name || 'Extra'}</span>
                                <span style={{ color: 'var(--gold-primary)', fontWeight: '800' }}>+${Number(extra.price || 0).toFixed(2)}</span>
                              </div>
                            ))}
                            {products.map((prod, idx) => (
                              <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                                <span>+ {prod.inventory?.name || prod.name || 'Producto'} x{prod.quantity || 1}</span>
                                <span style={{ color: 'var(--gold-primary)', fontWeight: '800' }}>+${(Number(prod.price || 0) * Number(prod.quantity || 1)).toFixed(2)}</span>
                              </div>
                            ))}
                          </div>

                          {appointment?.staff?.name && (
                            <div style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px', marginTop: 'auto' }}>
                              <Scissors size={12} color="var(--gold-primary)" /> Atendido por: <strong style={{ color: 'rgba(255,255,255,0.85)' }}>{appointment.staff.name}</strong>
                            </div>
                          )}
                        </div>

                        {/* Columna Derecha: Cobro y Pago */}
                        <div style={{ padding: '15px', borderRadius: '15px', background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '9px' }}>
                            <CreditCard size={15} color="#32d74b" />
                            <span style={{ fontSize: '11px', fontWeight: '900', color: '#32d74b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                              Cobro y Pago
                            </span>
                          </div>

                          <MoneyRow label="Total cobrado" usd={transaction.amount} transactionRate={transactionRate} strong />
                          
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px' }}>
                            <span style={{ color: 'var(--text-muted)' }}>Método de pago</span>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                              <span style={{ color: '#fff', fontWeight: '850' }}>{method}</span>
                              {referenceNo && (
                                <span style={{ background: 'rgba(17, 17, 17, 0.15)', color: 'var(--gold-primary)', padding: '1px 6px', borderRadius: '5px', fontWeight: '900', fontSize: '10px', border: '1px solid rgba(17, 17, 17, 0.3)' }}>
                                  Ref #{referenceNo}
                                </span>
                              )}
                            </div>
                          </div>

                          {cashUsd > 0 && <MoneyRow label={`Parte en ${metadata.methodUsd || metadata.method_usd || 'USD'}`} usd={cashUsd} transactionRate={transactionRate} />}
                          {transferBs > 0 && <MoneyRow label={`Parte en ${metadata.methodBs || metadata.method_bs || 'Bolívares'}`} usd={transferBs / transactionRate} transactionRate={transactionRate} />}

                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11.5px', marginTop: 'auto', paddingTop: '8px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                            <span style={{ color: 'var(--text-muted)' }}>Tasa de la operación:</span>
                            <span style={{ color: 'rgba(255,255,255,0.85)', fontWeight: '850' }}>{transactionRate.toLocaleString('es-VE')} Bs./USD</span>
                          </div>
                        </div>
                      </div>

                      {/* Distribución Transparente de la Transacción */}
                      {(metadata.staffInvolved && metadata.staffInvolved.length > 0) && (
                        <div style={{ padding: '14px 16px', borderRadius: '15px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                            <Users size={14} color="var(--gold-primary)" />
                            <span style={{ fontSize: '10.5px', fontWeight: '900', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                              Distribución de la Transacción
                            </span>
                          </div>

                          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(220px, 1fr))', gap: '8px' }}>
                            {metadata.staffInvolved.map((member, index) => {
                              const isAssistantWash = metadata.didWash && /asistente|lavado|operaciones/i.test(String(member.role || ''));
                              const serviceCommission = isAssistantWash
                                ? Math.max(1, Number(metadata.washCount || 1)) * Number(metadata.washRate || 1) * (Number(metadata.washAssistantSharePct || 60) / 100)
                                : Number(member.commissionEarned ?? member.commission_earned ?? 0);
                              const memberUsd = serviceCommission
                                + Number(member.productCommissionEarned ?? member.product_commission ?? 0)
                                + Number(member.tip ?? member.tip_amount ?? 0);
                              const memberBs = Math.round(memberUsd * transactionRate);

                              return (
                                <div key={member.staffId || member.id || index} style={{ padding: '10px 12px', borderRadius: '12px', background: 'var(--bg-secondary)', border: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                                  <div style={{ minWidth: 0 }}>
                                    <div style={{ fontSize: '11.5px', fontWeight: '850', color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                      {member.name || 'Personal'}
                                    </div>
                                    <div style={{ fontSize: '9.5px', color: 'var(--text-muted)' }}>
                                      {member.role?.split('|')[0] || 'Colaborador'}
                                    </div>
                                  </div>
                                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                                    <div style={{ fontSize: '12px', fontWeight: '900', color: 'var(--gold-primary)' }}>
                                      {memberBs.toLocaleString('es-VE')} Bs.
                                    </div>
                                    <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.65)', fontWeight: '800' }}>
                                      ≈ ${memberUsd.toFixed(2)} USD
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </article>
                </React.Fragment>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
};

export default StaffTransactionHistory;
