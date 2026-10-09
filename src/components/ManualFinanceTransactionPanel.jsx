import React, { useMemo, useState } from 'react';
import { ArrowDownCircle, ArrowUpCircle, Landmark, X } from 'lucide-react';
import FieldLabel from './FieldLabel';

const MANUAL_ACCOUNTS = [
  { key: 'cash_usd', label: 'Efectivo ($)', currency: 'USD' },
  { key: 'zelle', label: 'Zelle', currency: 'USD' },
  { key: 'zinli', label: 'Zinli', currency: 'USD' },
  { key: 'binance', label: 'Binance / USDT', currency: 'USD' },
  { key: 'pago_movil', label: 'Pago Móvil', currency: 'BS' },
  { key: 'cash_bs', label: 'Efectivo (Bs)', currency: 'BS' },
  { key: 'punto_venta', label: 'Punto de venta', currency: 'BS' },
  { key: 'transferencia', label: 'Transferencia', currency: 'BS' }
];

const money = (value, currency) => currency === 'USD'
  ? `$${Number(value || 0).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  : `${Number(value || 0).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Bs`;

export default function ManualFinanceTransactionPanel({ type, balances, rate, loading, onClose, onSubmit }) {
  const [description, setDescription] = useState('');
  const [accountKey, setAccountKey] = useState('cash_usd');
  const [amount, setAmount] = useState('');
  const account = MANUAL_ACCOUNTS.find(item => item.key === accountKey) || MANUAL_ACCOUNTS[0];
  const value = Number(String(amount).replace(',', '.')) || 0;
  const available = Math.max(0, Number(balances?.[accountKey]) || 0);
  const isExpense = type === 'expense';
  const exceeds = isExpense && value > available + 0.0001;
  const canSubmit = description.trim() && value > 0 && !exceeds && !loading;
  const equivalent = useMemo(() => account.currency === 'USD' ? value * rate : value / rate, [account.currency, rate, value]);

  return <section style={{ width: 'min(760px,100%)', maxHeight: '92vh', overflowY: 'auto', borderRadius: '28px', border: `1px solid ${isExpense ? 'rgba(255,69,58,.35)' : 'rgba(17, 17, 17,.4)'}`, background: 'var(--bg-secondary)', boxShadow: '0 28px 90px rgba(0,0,0,.65)', padding: '28px' }}>
    <header style={{ display: 'flex', justifyContent: 'space-between', gap: '16px', marginBottom: '24px' }}>
      <div style={{ display: 'flex', gap: '14px', alignItems: 'center' }}>
        <div style={{ width: '48px', height: '48px', borderRadius: '15px', display: 'grid', placeItems: 'center', background: isExpense ? 'rgba(255,69,58,.12)' : 'rgba(17, 17, 17,.12)', color: isExpense ? '#ff5b55' : 'var(--gold-primary)' }}>{isExpense ? <ArrowDownCircle /> : <ArrowUpCircle />}</div>
        <div><h2 style={{ margin: 0, fontSize: '24px', fontWeight: 900 }}>Registrar {isExpense ? 'gasto' : 'ingreso'}</h2><p style={{ margin: '5px 0 0', color: 'var(--text-secondary)', fontSize: '13px' }}>{isExpense ? 'Indica de cuál cuenta saldrá el dinero.' : 'Indica a cuál cuenta ingresará el dinero.'}</p></div>
      </div>
      <button type="button" onClick={onClose} aria-label="Cerrar" style={{ background: 'transparent', border: 0, color: '#aaa', cursor: 'pointer', alignSelf: 'flex-start' }}><X /></button>
    </header>

    <FieldLabel required>DESCRIPCIÓN</FieldLabel>
    <input value={description} onChange={event => setDescription(event.target.value)} placeholder={isExpense ? 'Ej. Compra de productos de limpieza' : 'Ej. Aporte de caja'} maxLength={160} style={{ width: '100%', boxSizing: 'border-box', borderRadius: '13px', border: '1px solid rgba(255,255,255,.12)', background: 'var(--bg-secondary)', color: 'white', padding: '14px 16px', fontSize: '15px', outline: 'none', marginBottom: '22px' }} />

    <FieldLabel required>{isExpense ? 'MÉTODO DE PAGO' : 'CUENTA DE DESTINO'}</FieldLabel>
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(155px,1fr))', gap: '10px', marginBottom: '22px' }}>
      {MANUAL_ACCOUNTS.map(item => { const active = item.key === accountKey; return <button key={item.key} type="button" onClick={() => { setAccountKey(item.key); setAmount(''); }} style={{ textAlign: 'left', padding: '13px', borderRadius: '13px', cursor: 'pointer', color: 'white', background: active ? 'rgba(17, 17, 17,.12)' : 'rgba(255,255,255,.025)', border: active ? '1px solid var(--gold-primary)' : '1px solid rgba(255,255,255,.09)' }}><span style={{ display: 'flex', alignItems: 'center', gap: '7px', fontSize: '12px', fontWeight: 850 }}><Landmark size={14} />{item.label}</span><span style={{ display: 'block', marginTop: '7px', color: active ? 'var(--gold-primary)' : 'var(--text-muted)', fontSize: '11px' }}>Disponible: {money(balances?.[item.key], item.currency)}</span></button>; })}
    </div>

    <div style={{ padding: '18px', borderRadius: '16px', background: 'rgba(255,255,255,.035)', border: '1px solid rgba(255,255,255,.08)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', marginBottom: '10px' }}><FieldLabel required>Monto en {account.currency === 'USD' ? '$' : 'Bs'}</FieldLabel><span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>Disponible: <strong style={{ color: exceeds ? '#ff5b55' : '#32d74b' }}>{money(available, account.currency)}</strong></span></div>
      <div style={{ position: 'relative' }}><input type="number" min="0" step="0.01" value={amount} onChange={event => setAmount(event.target.value)} placeholder="0,00" style={{ width: '100%', boxSizing: 'border-box', borderRadius: '13px', border: `1px solid ${exceeds ? '#ff453a' : 'rgba(255,255,255,.14)'}`, background: 'var(--bg-secondary)', color: 'white', padding: '15px 55px 15px 16px', fontSize: '22px', fontWeight: 850, outline: 'none' }} /><span style={{ position: 'absolute', right: '16px', top: '17px', fontWeight: 800, color: 'var(--gold-primary)' }}>{account.currency === 'USD' ? '$' : 'Bs'}</span></div>
      <div style={{ marginTop: '8px', color: exceeds ? '#ff5b55' : 'var(--text-muted)', fontSize: '12px' }}>{exceeds ? 'El gasto supera el saldo disponible de esta cuenta.' : value > 0 ? `Equivale a ${account.currency === 'USD' ? money(equivalent, 'BS') : money(equivalent, 'USD')} a la tasa actual.` : 'Ingresa un monto mayor a cero.'}</div>
    </div>

    <footer style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px' }}><button type="button" disabled={!canSubmit} onClick={() => onSubmit({ description: description.trim(), account, amount: value })} className="btn-gold" style={{ padding: '14px 25px', borderRadius: '12px', fontWeight: 900, opacity: canSubmit ? 1 : .45, cursor: canSubmit ? 'pointer' : 'not-allowed' }}>Registrar {isExpense ? 'gasto' : 'ingreso'}</button></footer>
  </section>;
}
