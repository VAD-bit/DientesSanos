import React from 'react';

const SETTLEMENT_ACCOUNTS = [
  'Efectivo ($)', 'Efectivo (Bs)', 'Pago Móvil', 'Punto de venta',
  'Zelle', 'Zinli', 'Binance / USDT', 'Transferencia'
];

const formatBs = value => Number(value || 0).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const PayrollSettlementPanel = ({ modal, setModal, isMobile, loading, onPay, onCancel }) => {
  const settlement = modal.earnings;
  if (!settlement) return null;
  const allocatedBs = SETTLEMENT_ACCOUNTS.reduce((sum, account) => sum + Number(modal.allocations?.[account] || 0), 0);
  const pendingBs = Math.max(0, Number(settlement.balanceBs || 0));
  const remainingBs = Math.max(0, pendingBs - allocatedBs);
  const accounts = SETTLEMENT_ACCOUNTS.filter(account => Number(settlement.accountBalances?.[account] || 0) > 0 || ['Efectivo ($)', 'Efectivo (Bs)', 'Pago Móvil', 'Punto de venta'].includes(account));
  const metric = (label, value, color) => <article style={{ padding: '12px', borderRadius: '14px', background: 'rgba(255,255,255,.035)', border: '1px solid rgba(255,255,255,.07)' }}><span style={{ display: 'block', fontSize: '9px', color: 'var(--text-muted)', fontWeight: 900, textTransform: 'uppercase' }}>{label}</span><strong style={{ display: 'block', marginTop: '5px', fontSize: '16px', color }}>{formatBs(value)} Bs</strong></article>;

  return <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1.08fr .92fr', gap: '16px' }}>
    <section style={{ display: 'flex', flexDirection: 'column', gap: '12px', minWidth: 0 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,minmax(0,1fr))', gap: '8px' }}>
        {metric('Ganado', settlement.earnedBs + settlement.propinasBs, '#fff')}
        {metric('Pagado / anticipos', settlement.paidBs + settlement.valesBs, '#ff9f0a')}
        <article style={{ padding: '12px', borderRadius: '14px', background: 'rgba(255,255,255,.035)', border: '1px solid rgba(255,255,255,.07)' }}>
          <span style={{ display: 'block', fontSize: '9px', color: 'var(--text-muted)', fontWeight: 900, textTransform: 'uppercase' }}>Efectivo asignado</span>
          <strong style={{ display: 'block', marginTop: '5px', fontSize: '16px', color: '#32d74b' }}>${Number(settlement.cashAssignedUsd || 0).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
          {Number(settlement.cashAssignedVesBs || 0) > 0 && <span style={{ display: 'block', marginTop: '2px', fontSize: '11px', color: '#64d2ff' }}>+ {formatBs(settlement.cashAssignedVesBs)} Bs en efectivo</span>}
        </article>
        {metric('Saldo pendiente', pendingBs, 'var(--gold-primary)')}
      </div>
      <div style={{ padding: '12px', borderRadius: '14px', background: 'rgba(255,255,255,.025)', border: '1px solid rgba(255,255,255,.06)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', marginBottom: '9px' }}><span style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 900, textTransform: 'uppercase' }}>Cómo se generó</span><span style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>{settlement.payrollFrequency === 'daily' ? 'Pago diario' : 'Pago semanal'} · tasa {formatBs(settlement.rate)}</span></div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>{Object.entries(settlement.methodBreakdown || {}).map(([method, amount]) => {
          // Cuentas en dólares: mostrar el USD original (no Bs/tasa-de-hoy).
          const isUsdAccount = /efectivo \(\$\)|zelle|zinli|binance|usdt/i.test(method);
          const usdAmount = Number(settlement.methodBreakdownUsd?.[method] || 0);
          return <span key={method} style={{ padding: '6px 8px', borderRadius: '9px', background: 'rgba(255,255,255,.05)', fontSize: '10px', color: 'var(--text-secondary)' }}>{method} <strong style={{ color: 'white' }}>{isUsdAccount ? `$${formatBs(usdAmount)}` : `${formatBs(amount)} Bs`}</strong></span>;
        })}</div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1.35fr .65fr', gap: '8px' }}>
        <div style={{ padding: '12px', borderRadius: '14px', background: 'rgba(255,255,255,.025)', border: '1px solid rgba(255,255,255,.06)' }}>
          <span style={{ fontSize: '9px', color: 'var(--text-muted)', fontWeight: 900, textTransform: 'uppercase' }}>Historial de servicios</span>
          <div style={{ marginTop: '8px', maxHeight: '180px', overflowY: 'auto' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 1.1fr auto', gap: '7px', paddingBottom: '6px', borderBottom: '1px solid rgba(255,255,255,.07)', color: 'var(--text-muted)', fontSize: '8px', fontWeight: 900, textTransform: 'uppercase' }}><span>Cliente</span><span>Servicio</span><span>Monto</span></div>
            {settlement.recentEarnings?.length ? settlement.recentEarnings.map(item => <div key={item.id} style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 1.1fr auto', gap: '7px', padding: '7px 0', borderBottom: '1px solid rgba(255,255,255,.045)', fontSize: '9px' }}><span title={item.clientName} style={{ color: 'white', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.clientName}</span><span title={item.serviceName} style={{ color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.serviceName}</span><strong style={{ whiteSpace: 'nowrap' }}>{formatBs(item.amountBs + item.tipBs)} Bs</strong></div>) : <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Sin servicios registrados.</span>}
          </div>
        </div>
        <div style={{ padding: '12px', borderRadius: '14px', background: 'rgba(255,255,255,.025)', border: '1px solid rgba(255,255,255,.06)' }}><span style={{ fontSize: '9px', color: 'var(--text-muted)', fontWeight: 900, textTransform: 'uppercase' }}>Pagos y adelantos</span><div style={{ marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '7px', maxHeight: '180px', overflowY: 'auto' }}>{settlement.paymentHistory?.length ? settlement.paymentHistory.map(item => <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', gap: '6px', fontSize: '9px' }}><span style={{ color: 'var(--text-secondary)' }}>{item.type} · {new Date(item.date).toLocaleDateString('es-VE')}</span><strong style={{ color: '#ff9f0a', whiteSpace: 'nowrap' }}>-{formatBs(item.amountBs)} Bs</strong></div>) : <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Aún no registra pagos.</span>}</div></div>
      </div>
    </section>
    <section style={{ padding: '14px', borderRadius: '16px', background: 'rgba(17, 17, 17,.035)', border: '1px solid rgba(17, 17, 17,.15)', display: 'flex', flexDirection: 'column', gap: '10px' }}>
      <div><span style={{ fontSize: '10px', color: 'var(--gold-primary)', fontWeight: 900, textTransform: 'uppercase' }}>Distribuir pago</span><p style={{ marginTop: '4px', fontSize: '10px', color: 'var(--text-muted)' }}>Indica cuánto saldrá de cada cuenta.</p></div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '7px', maxHeight: isMobile ? 'none' : '295px', overflowY: 'auto' }}>{accounts.map(account => { const available = Math.max(0, Number(settlement.accountBalances?.[account] || 0)); const isUsdCash = account === 'Efectivo ($)'; const displayAvailable = isUsdCash ? available / settlement.rate : available; const displayAllocation = isUsdCash && modal.allocations?.[account] !== '' ? Number((Number(modal.allocations?.[account] || 0) / settlement.rate).toFixed(2)) : (modal.allocations?.[account] || ''); return <label key={account} style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 112px', alignItems: 'center', gap: '8px', padding: '8px 10px', borderRadius: '11px', background: 'var(--bg-secondary)', border: '1px solid rgba(255,255,255,.055)' }}><span><strong style={{ display: 'block', fontSize: '11px' }}>{account}</strong><small style={{ color: 'var(--text-muted)', fontSize: '9px' }}>Disponible {isUsdCash ? `$${formatBs(displayAvailable)}` : `${formatBs(displayAvailable)} Bs`}</small></span><input type="number" min="0" max={displayAvailable} step="0.01" value={displayAllocation} onChange={event => setModal(previous => ({ ...previous, allocations: { ...previous.allocations, [account]: event.target.value === '' ? '' : Number(event.target.value) * (isUsdCash ? settlement.rate : 1) } }))} placeholder={isUsdCash ? '$0' : '0'} style={{ width: '100%', height: '36px', padding: '0 9px', borderRadius: '9px', border: '1px solid rgba(255,255,255,.12)', background: 'rgba(255,255,255,.055)', color: 'white', textAlign: 'right', fontWeight: 800 }} /></label>; })}</div>
      <div style={{ padding: '11px 12px', borderRadius: '12px', background: 'var(--bg-secondary)', border: '1px solid rgba(255,255,255,.07)' }}><div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-secondary)' }}><span>Pago a registrar</span><strong style={{ color: 'white' }}>{formatBs(allocatedBs)} Bs</strong></div><div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px', fontSize: '12px' }}><strong>Quedará pendiente</strong><strong style={{ color: remainingBs > 0 ? '#ff9f0a' : '#32d74b' }}>{formatBs(remainingBs)} Bs</strong></div></div>
      <button onClick={onPay} disabled={loading || allocatedBs <= 0 || allocatedBs > pendingBs + .01} style={{ minHeight: '44px', borderRadius: '12px', border: 0, background: 'var(--gold-primary)', color: '#090909', fontWeight: 900, cursor: 'pointer', opacity: loading || allocatedBs <= 0 || allocatedBs > pendingBs + .01 ? .45 : 1 }}>{allocatedBs < pendingBs - .01 ? 'Registrar abono' : 'Registrar pago total'}</button>
      
    </section>
  </div>;
};

export default PayrollSettlementPanel;
