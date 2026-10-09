import React, { useMemo, useState } from 'react';
import { CircleDollarSign, Landmark, X } from 'lucide-react';

const ACCOUNTS = [
  { key: 'cash_usd', label: 'Efectivo ($)', currency: 'USD' },
  { key: 'zelle', label: 'Zelle', currency: 'USD' },
  { key: 'zinli', label: 'Zinli', currency: 'USD' },
  { key: 'binance', label: 'Binance / USDT', currency: 'USD' },
  { key: 'pago_movil', label: 'Pago Móvil', currency: 'BS', reference: true },
  { key: 'cash_bs', label: 'Efectivo (Bs)', currency: 'BS' },
  { key: 'punto_venta', label: 'Punto de venta', currency: 'BS', reference: true },
  { key: 'transferencia', label: 'Transferencia', currency: 'BS', reference: true }
];

const money = (value, currency) => currency === 'USD'
  ? `$${Number(value || 0).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  : `${Number(value || 0).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Bs`;

export default function ReceivablePaymentPanel({ transaction, rate, loading, onClose, onSubmit }) {
  const [accountKey, setAccountKey] = useState('cash_usd');
  const [reference, setReference] = useState('');
  const account = ACCOUNTS.find(item => item.key === accountKey) || ACCOUNTS[0];
  const metadata = transaction?.metadata || {};
  const amountUsd = Number(metadata.nominalTotalUsd || 0);
  const amountNative = account.currency === 'USD' ? amountUsd : amountUsd * Number(rate || 1);
  const canSubmit = amountUsd > 0 && (!account.reference || reference.trim()) && !loading;
  const clientName = metadata.clientName || 'Cliente';
  const serviceName = metadata.serviceName || 'Servicio';
  const originalBs = useMemo(
    () => amountUsd * Number(transaction?.exchange_rate || rate || 1),
    [amountUsd, rate, transaction?.exchange_rate]
  );

  return <section style={{ width: 'min(720px,100%)', maxHeight: '92vh', overflowY: 'auto', borderRadius: '26px', border: '1px solid rgba(255,159,10,.35)', background: 'var(--bg-secondary)', boxShadow: '0 28px 90px rgba(0,0,0,.7)', padding: '26px', boxSizing: 'border-box' }}>
    <header style={{ display: 'flex', justifyContent: 'space-between', gap: '16px', marginBottom: '21px' }}>
      <div style={{ display: 'flex', gap: '13px', alignItems: 'center' }}>
        <div style={{ width: 46, height: 46, borderRadius: 14, display: 'grid', placeItems: 'center', background: 'rgba(255,159,10,.12)', color: '#ffb340' }}><CircleDollarSign /></div>
        <div><h2 style={{ margin: 0, fontSize: 23, fontWeight: 900 }}>Registrar cobro</h2><p style={{ margin: '5px 0 0', color: 'var(--text-secondary)', fontSize: 13 }}>Confirma dónde ingresó el pago del cliente.</p></div>
      </div>
      <button type="button" onClick={onClose} aria-label="Cerrar" style={{ background: 'transparent', border: 0, color: '#aaa', cursor: 'pointer', alignSelf: 'flex-start' }}><X /></button>
    </header>

    <div style={{ padding: 16, borderRadius: 15, background: 'rgba(255,255,255,.035)', border: '1px solid rgba(255,255,255,.09)', marginBottom: 20 }}>
      <strong style={{ display: 'block', fontSize: 16 }}>{clientName}</strong>
      <span style={{ display: 'block', color: 'var(--text-secondary)', fontSize: 12, marginTop: 4 }}>{serviceName}</span>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'end', gap: 12, marginTop: 14 }}><span style={{ color: 'var(--text-muted)', fontSize: 11 }}>DEUDA REGISTRADA</span><div style={{ textAlign: 'right' }}><strong style={{ display: 'block', color: '#ffb340', fontSize: 20 }}>{money(amountUsd, 'USD')}</strong><small style={{ color: 'var(--text-muted)' }}>{money(originalBs, 'BS')} al generar</small></div></div>
    </div>

    <label style={{ display: 'block', color: 'var(--gold-primary)', fontSize: 12, fontWeight: 800, marginBottom: 10 }}>CUENTA QUE RECIBE EL PAGO</label>
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(145px,1fr))', gap: 9, marginBottom: 20 }}>
      {ACCOUNTS.map(item => { const active = item.key === accountKey; return <button key={item.key} type="button" onClick={() => { setAccountKey(item.key); setReference(''); }} style={{ textAlign: 'left', minHeight: 67, padding: 12, borderRadius: 12, cursor: 'pointer', color: 'white', background: active ? 'rgba(17, 17, 17,.12)' : 'rgba(255,255,255,.025)', border: active ? '1px solid var(--gold-primary)' : '1px solid rgba(255,255,255,.09)' }}><span style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12, fontWeight: 850 }}><Landmark size={14} />{item.label}</span></button>; })}
    </div>

    <div style={{ padding: 17, borderRadius: 15, background: 'rgba(255,255,255,.035)', border: '1px solid rgba(255,255,255,.08)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center' }}><span style={{ color: 'var(--text-secondary)', fontSize: 13 }}>Monto que ingresará</span><strong style={{ color: '#32d74b', fontSize: 21 }}>{money(amountNative, account.currency)}</strong></div>
      {account.currency === 'BS' && <small style={{ display: 'block', textAlign: 'right', color: 'var(--text-muted)', marginTop: 4 }}>Calculado con la tasa actual: {Number(rate || 0).toLocaleString('es-VE', { maximumFractionDigits: 2 })}</small>}
      {account.reference && <input value={reference} onChange={event => setReference(event.target.value)} placeholder="Referencia del pago" maxLength={40} style={{ width: '100%', boxSizing: 'border-box', marginTop: 14, borderRadius: 12, border: '1px solid rgba(255,255,255,.13)', background: 'var(--bg-secondary)', color: 'white', padding: '13px 14px', fontSize: 14, outline: 'none' }} />}
    </div>

    <footer style={{ display: 'flex', justifyContent: 'flex-end', gap: 11, marginTop: 22 }}><button type="button" disabled={!canSubmit} onClick={() => onSubmit({ account, reference: reference.trim(), amountUsd, amountNative })} className="btn-gold" style={{ padding: '13px 24px', borderRadius: 12, fontWeight: 900, opacity: canSubmit ? 1 : .45, cursor: canSubmit ? 'pointer' : 'not-allowed' }}>{loading ? 'Registrando…' : 'Confirmar pago'}</button></footer>
  </section>;
}
