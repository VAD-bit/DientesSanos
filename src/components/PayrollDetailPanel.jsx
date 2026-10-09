import React, { useState } from 'react';
import { Banknote, CalendarDays, ChevronDown, Clock3, Scissors, WalletCards, X } from 'lucide-react';

const fmt = value => Number(value || 0).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const txAmountBs = (transaction, rate) => Number(transaction.metadata?.amountBs || (Number(transaction.amount || 0) * Number(transaction.exchange_rate || rate)));

const PayrollDetailPanel = ({ detail, rate, periodStart, periodEnd, isMobile, onClose, onPay }) => {
  const [expandedServices, setExpandedServices] = useState(() => new Set());
  const staff = detail.staff;
  if (!staff) return null;
  const transactions = detail.transactions || [];
  const services = transactions.filter(transaction => transaction.type === 'income');
  const movements = transactions.filter(transaction => transaction.type === 'expense');
  const isAssistant = Boolean(staff.isAssistant) || /asistente|lavado|operaciones/i.test(String(staff.role || ''));
  const totalGeneratedBs = Number(staff.earnedBs || 0) + Number(staff.propinasBs || 0);
  const totalGeneratedUsd = Number(staff.earnedUsd || 0) + Number(staff.propinasUsd || 0);
  const paidAndAdvancesBs = Number(staff.paidBs || 0) + Number(staff.valesBs || 0) + Number(staff.consumptionsBs || 0);
  const paidAndAdvancesUsd = Number(staff.paidUsd || 0) + Number(staff.valesUsd || 0) + Number(staff.consumptionsUsd || 0);
  const pendingBs = Math.max(0, Number(staff.balanceBs || 0));
  const pendingUsd = Math.max(0, Number(staff.balanceUsd ?? (pendingBs / Number(rate || 1))));
  const usd = amountBs => Number(amountBs || 0) / Number(rate || 1);
  const dateLabel = date => new Date(date).toLocaleString('es-VE', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', hour12: true });
  const methodFor = transaction => {
    const metadata = transaction.metadata || {};
    if (metadata.mixed_payment) return `${metadata.method_usd || 'USD'} + ${metadata.method_bs || 'Bs'}`;
    return metadata.paymentMethod || metadata.method_bs || metadata.method_usd || 'No registrado';
  };
  const referenceFor = transaction => {
    const m = transaction.metadata || {};
    return m.paymentReferenceBs || m.payment_reference_bs || m.paymentReference || m.reference_number || m.reference || m.transfer_ref || m.transferRef || m.ref || '';
  };
  // Pago Móvil y Punto de venta llevan referencia; se muestra junto al método.
  const methodLabelFor = transaction => {
    const method = methodFor(transaction);
    const ref = referenceFor(transaction);
    return (/pago m[oó]vil|punto/i.test(method) && ref) ? `${method} · Ref. ${ref}` : method;
  };
  const stat = (icon, label, amountBs, note, exactUsd) => {
    const currentUsd = amountBs === null ? 0 : usd(amountBs);
    const originalUsd = exactUsd ?? currentUsd;
    const rateChanged = Math.abs(currentUsd - originalUsd) >= .01;
    return <article style={{ display: 'grid', gridTemplateColumns: isMobile ? '36px minmax(0, 1fr)' : '42px minmax(0, 1fr)', gap: isMobile ? '10px' : '12px', alignItems: 'center', padding: isMobile ? '11px' : '14px', borderRadius: '14px', background: 'rgba(255,255,255,.035)', border: '1px solid rgba(255,255,255,.075)', overflow: 'hidden', minWidth: 0 }}><div style={{ width: isMobile ? '36px' : '42px', height: isMobile ? '36px' : '42px', borderRadius: '12px', display: 'grid', placeItems: 'center', color: 'var(--gold-primary)', background: 'rgba(17, 17, 17,.1)', flexShrink: 0 }}>{icon}</div><div style={{ minWidth: 0 }}><span style={{ display: 'block', color: 'var(--text-secondary)', fontSize: isMobile ? '8px' : '9px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '.5px' }}>{label}</span><strong style={{ display: 'block', marginTop: '3px', fontSize: isMobile ? '15px' : '17px', color: label === 'Pendiente' ? 'var(--gold-primary)' : 'white', wordBreak: 'break-word' }}>{amountBs === null ? note : `${fmt(amountBs)} Bs`}</strong>{amountBs !== null && <><small style={{ display:'block', color: 'var(--gold-primary)', fontSize: isMobile ? '8px' : '9px' }}>${fmt(originalUsd)} USD al generar</small>{rateChanged&&<small style={{ display:'block', color:'var(--text-muted)', fontSize:'8px' }}>≈ ${fmt(currentUsd)} equivalente actual</small>}</>}{amountBs === null && <small style={{ color: 'var(--text-muted)', fontSize: '10px' }}>Este período</small>}</div></article>;
  };

  return <section role="dialog" aria-modal="true" aria-label={`Detalle de servicios de ${staff.name}`} style={{ width: isMobile ? '100vw' : 'min(1120px, 96vw)', maxHeight: isMobile ? '100vh' : '92vh', overflow: isMobile ? 'auto' : 'hidden', display: 'flex', flexDirection: 'column', borderRadius: isMobile ? '0' : '22px', padding: isMobile ? '16px' : '24px', color: 'white', background: 'var(--bg-secondary)', border: isMobile ? 'none' : '1px solid rgba(255,255,255,.14)', boxShadow: isMobile ? 'none' : '0 30px 90px rgba(0,0,0,.72)', WebkitOverflowScrolling: 'touch' }}>
    <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px', marginBottom: '16px' }}><h2 style={{ margin: 0, fontSize: isMobile ? '19px' : '23px', letterSpacing: '-.5px' }}>Detalle de servicios <span style={{ color: 'var(--text-muted)', fontWeight: 500 }}>·</span> <span style={{ color: 'var(--gold-primary)' }}>{staff.name}</span></h2><button onClick={onClose} aria-label="Cerrar detalle" style={{ width: '44px', height: '44px', borderRadius: '12px', border: 0, background: 'transparent', color: 'var(--text-secondary)', cursor: 'pointer', display: 'grid', placeItems: 'center' }}><X size={20}/></button></header>
    <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2,minmax(0,1fr))' : 'repeat(4,minmax(0,1fr))', gap: '8px', marginBottom: '14px' }}>
      {stat(<Banknote size={isMobile ? 17 : 20}/>, isAssistant ? 'Total ganado' : 'Generado por el profesional', totalGeneratedBs, null, totalGeneratedUsd)}
      {stat(<WalletCards size={isMobile ? 17 : 20}/>, 'Pagado / vales', paidAndAdvancesBs, null, paidAndAdvancesUsd)}
      {stat(<Clock3 size={isMobile ? 17 : 20}/>, 'Pendiente', pendingBs, null, pendingUsd)}
      {stat(<Scissors size={isMobile ? 17 : 20}/>, isAssistant ? 'Limpiezas' : 'Servicios', null, String(staff.servicesCount || services.length))}
    </div>
    {isAssistant && (() => {
      // Desglose de lavados por tipo: los incluidos (washCount) y cada extra de lavado
      // (Lavado express/premium…). Solo se muestra en el Detalle, no en la tarjeta.
      const washBreakdown = {};
      services.forEach(transaction => {
        const metadata = transaction.metadata || {};
        if (metadata.didWash && Number(metadata.washCount || 0) > 0) {
          washBreakdown['Limpieza incluida'] = (washBreakdown['Limpieza incluida'] || 0) + Number(metadata.washCount || 0);
        }
        (metadata.extras || []).forEach(extra => {
          const name = extra.service_extras?.name || extra.name || '';
          if (name.toLowerCase().includes('lavado')) washBreakdown[name] = (washBreakdown[name] || 0) + 1;
        });
      });
      const entries = Object.entries(washBreakdown).filter(([, n]) => n > 0).sort((a, b) => b[1] - a[1]);
      if (!entries.length) return null;
      return (
        <div style={{ marginBottom: '14px', padding: isMobile ? '10px' : '12px 14px', borderRadius: '14px', background: 'rgba(255,255,255,.025)', border: '1px solid rgba(255,255,255,.07)' }}>
          <div style={{ fontSize: '9px', color: 'var(--gold-primary)', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: '8px' }}>Limpiezas por tipo</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            {entries.map(([name, n]) => (
              <span key={name} style={{ padding: '6px 10px', borderRadius: '9px', background: 'rgba(0,191,255,.1)', border: '1px solid rgba(0,191,255,.2)', fontSize: '11px', color: 'var(--text-secondary)' }}>
                {name} <strong style={{ color: '#00bfff' }}>{n}</strong>
              </span>
            ))}
          </div>
        </div>
      );
    })()}
    <style>{`
      @media (min-width: 769px) {
        .payroll-detail-content > section:nth-child(1) { overflow: hidden; }
        .payroll-detail-content > section:nth-child(1) > div:first-child { flex: 0 0 auto; }
        .payroll-detail-content > section:nth-child(1) > div:last-child {
          flex: 1 1 auto; min-height: 0; max-height: none !important; overflow: auto !important;
        }
        .payroll-detail-content > section:nth-child(2) { overflow: hidden; }
        .payroll-detail-content > section:nth-child(2) > div:first-child {
          display: flex; flex: 1 1 auto; min-height: 0; flex-direction: column; overflow: hidden;
        }
        .payroll-detail-content > section:nth-child(2) > div:first-child > h3 { flex: 0 0 auto; }
        .payroll-detail-content > section:nth-child(2) > div:first-child > div {
          flex: 1 1 auto; min-height: 0; max-height: none !important; overflow: auto !important;
        }
        .payroll-detail-content > section:nth-child(2) > div:last-child { flex: 0 0 auto; }
      }
    `}</style>
    <div className="payroll-detail-content" style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1.05fr .95fr', gap: '10px', flex: isMobile ? 'none' : '1 1 auto', minHeight: 0, overflow: 'visible' }}>
      <section style={{ padding: isMobile ? '10px' : '14px', borderRadius: '16px', background: 'rgba(255,255,255,.025)', border: '1px solid rgba(255,255,255,.07)', display: 'flex', flexDirection: 'column' }}><div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}><h3 style={{ margin: 0, fontSize: isMobile ? '13px' : '15px' }}>Historial de servicios</h3><span style={{ padding: '4px 8px', borderRadius: '999px', background: 'rgba(255,255,255,.06)', color: 'var(--text-secondary)', fontSize: '9px', fontWeight: 800 }}>{services.length} servicios</span></div><div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>{services.length ? services.map(transaction => {
        const metadata = transaction.metadata || {};
        const involved = metadata.staffInvolved?.find(member => String(member.staffId) === String(staff.id)) || {};
        const transactionRate = Number(transaction.exchange_rate || rate || 1);
        const client = metadata.clientName || transaction.description?.match(/Cliente:\s*(.*?)\s*-\s*Servi:/i)?.[1] || 'Cliente';
        const service = metadata.serviceName || transaction.description?.match(/Servi:\s*(.*)$/i)?.[1] || 'Servicio';
        const transactionKey = String(transaction.id);
        const isExpanded = expandedServices.has(transactionKey);
        const toggleDetails = () => setExpandedServices(current => {
          const next = new Set(current);
          if (next.has(transactionKey)) next.delete(transactionKey);
          else next.add(transactionKey);
          return next;
        });
        if (isAssistant) {
          const assistantShare = Number(metadata.washAssistantSharePct || 60) / 100;
          // La comisión real de la asistente (incluye lavados incluidos + extras de lavado
          // como Lavado premium/express). Solo si no está guardada (datos viejos) se recalcula
          // desde el lavado incluido, que era la única fuente antes.
          let washUsd = Number(involved.commissionEarned || 0) + Number(involved.productCommissionEarned || 0);
          let washBs = Number(involved.commissionBs || 0) + Number(involved.productCommissionBs || 0);
          if (washUsd <= 0 && washBs <= 0 && metadata.didWash) {
            const washCount = Math.max(1, Number(metadata.washCount || 1));
            const washRate = Number(metadata.washRate || staff.washing_rate || 1);
            washUsd = washCount * washRate * assistantShare;
            washBs = washUsd * transactionRate;
          }
          if (washBs <= 0) washBs = washUsd * transactionRate;
          if (washUsd <= 0) washUsd = washBs / transactionRate;
          const assistantTipUsd = Number(involved.tip || 0);
          const assistantTipBs = Number(involved.tipBs || assistantTipUsd * transactionRate);
          // Valor bruto del lavado del que sale ese 60% (para el desglose)
          const washGrossUsd = assistantShare > 0 ? washUsd / assistantShare : washUsd;
          const washGrossBs = washGrossUsd * transactionRate;
          const washAreaUsd = Math.max(0, washGrossUsd - washUsd);
          const washAreaBs = washAreaUsd * transactionRate;
          return <article key={transaction.id} style={{padding:isMobile?'10px':'13px',borderRadius:'12px',background:'rgba(0,122,255,.055)',border:'1px solid rgba(0,122,255,.18)'}}>
            <div style={{display:'flex',justifyContent:'space-between',gap:'12px'}}><div style={{minWidth:0}}><strong style={{display:'block',fontSize:'12px',wordBreak:'break-word'}}>Limpieza · {client}</strong><span style={{display:'block',marginTop:'4px',color:'var(--text-secondary)',fontSize:'10px',wordBreak:'break-word'}}>{service}</span></div><div style={{textAlign:'right',flexShrink:0}}><strong style={{display:'block',color:'#64d2ff',fontSize:'13px'}}>+${fmt(washUsd)}</strong><small style={{color:'var(--text-secondary)',fontSize:'9px'}}>{fmt(washBs)} Bs</small></div></div>
            <button type="button" onClick={toggleDetails} aria-expanded={isExpanded} style={{width:'100%',display:'flex',justifyContent:'space-between',alignItems:'center',marginTop:'9px',padding:'8px 10px',borderRadius:'9px',border:'1px solid rgba(100,210,255,.15)',background:'rgba(0,122,255,.055)',color:'#9bdfff',fontSize:'9px',fontWeight:850,cursor:'pointer'}}><span>{isExpanded?'Ocultar desglose':'Ver desglose de la limpieza'}</span><ChevronDown size={13} style={{transform:isExpanded?'rotate(180deg)':'none',transition:'transform .2s'}}/></button>
            {isExpanded&&<div style={{display:'grid',gap:'5px',marginTop:'7px',padding:'9px',borderRadius:'9px',background:'var(--bg-secondary)',border:'1px solid rgba(255,255,255,.05)',fontSize:'9px'}}><div style={{display:'flex',justifyContent:'space-between'}}><span style={{color:'var(--text-secondary)'}}>Tarifa total de la limpieza</span><strong>${fmt(washGrossUsd)} · {fmt(washGrossBs)} Bs</strong></div><div style={{display:'flex',justifyContent:'space-between'}}><span style={{color:'var(--text-secondary)'}}>Asistente (60%)</span><strong style={{color:'#64d2ff'}}>${fmt(washUsd)} · {fmt(washBs)} Bs</strong></div><div style={{display:'flex',justifyContent:'space-between'}}><span style={{color:'var(--text-secondary)'}}>Fondo área de limpieza (40%)</span><strong>${fmt(washAreaUsd)} · {fmt(washAreaBs)} Bs</strong></div>{assistantTipUsd>0&&<div style={{display:'flex',justifyContent:'space-between',paddingTop:'5px',borderTop:'1px solid rgba(255,255,255,.07)'}}><span style={{color:'var(--text-secondary)'}}>Propina del cliente</span><strong style={{color:'#32d74b'}}>+${fmt(assistantTipUsd)} · {fmt(assistantTipBs)} Bs</strong></div>}</div>}
            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '6px', marginTop: '9px' }}><span style={{ padding: '4px 7px', borderRadius: '7px', background: 'rgba(0,122,255,.1)', color: '#8fd0ff', fontSize: '8px', fontWeight: 800 }}>{methodLabelFor(transaction)}</span><span style={{ marginLeft: 'auto', color: 'var(--text-muted)', fontSize: '8px' }}>{dateLabel(transaction.created_at)}</span></div>
          </article>;
        }
        const commissionPct = Number(involved.commissionPct || staff.commission_pct || 60);
        const commissionBs = Number(involved.commissionBs || 0);
        const commissionUsd = Number(involved.commissionEarned || commissionBs / transactionRate);
        const productCommissionBs = Number(involved.productCommissionBs || 0);
        const tipBs = Number(involved.tipBs || 0);
        const tipUsd = Number(involved.tip || tipBs / transactionRate);
        const distributableBs = commissionPct > 0 ? commissionBs / (commissionPct / 100) : 0;
        const distributableUsd = distributableBs / transactionRate;
        const washGrossUsd = metadata.didWash ? Math.max(1, Number(metadata.washCount || 1)) * Number(metadata.washRate || 1) : 0;
        const washBs = washGrossUsd * transactionRate;
        const serviceGrossBs = distributableBs + washBs;
        const serviceGrossUsd = serviceGrossBs / transactionRate;
        const shopBs = Math.max(0, distributableBs - commissionBs);
        const shopUsd = shopBs / transactionRate;
        const barberGeneratedBs = commissionBs + productCommissionBs + tipBs;
        const barberNetBs = barberGeneratedBs;
        const splitRow = (label, bs, usdValue, color = 'white') => <div style={{ display:'flex', justifyContent:'space-between', gap:'10px', fontSize:'9px', flexWrap: 'wrap' }}><span style={{color:'var(--text-secondary)'}}>{label}</span><strong style={{color,wordBreak:'break-word'}}>${fmt(usdValue)} · {fmt(bs)} Bs</strong></div>;
        return <article key={transaction.id} style={{ padding: isMobile ? '10px' : '12px', borderRadius: '12px', background: 'var(--bg-secondary)', border: '1px solid rgba(255,255,255,.055)' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) auto', gap: '10px' }}><div style={{ minWidth: 0 }}><strong style={{ display: 'block', fontSize: '12px', wordBreak: 'break-word' }}>{service}</strong><span style={{ display: 'block', marginTop: '3px', color: 'var(--text-secondary)', fontSize: '10px', wordBreak: 'break-word' }}>{client}</span></div><div style={{ textAlign: 'right', flexShrink: 0 }}><strong style={{ display: 'block', color: '#32d74b', fontSize: '12px' }}>+{fmt(barberGeneratedBs)} Bs</strong><small style={{ color: 'var(--gold-primary)', fontSize: '9px' }}>+${fmt(barberGeneratedBs / transactionRate)}</small></div></div>
          <button type="button" onClick={toggleDetails} aria-expanded={isExpanded} style={{width:'100%',display:'flex',justifyContent:'space-between',alignItems:'center',marginTop:'9px',padding:'8px 10px',borderRadius:'9px',border:'1px solid rgba(255,255,255,.075)',background:'rgba(255,255,255,.025)',color:'var(--text-secondary)',fontSize:'9px',fontWeight:850,cursor:'pointer'}}><span>{isExpanded?'Ocultar desglose':'Ver desglose'}</span><ChevronDown size={13} style={{transform:isExpanded?'rotate(180deg)':'none',transition:'transform .2s'}}/></button>
          {isExpanded&&<div style={{display:'grid',gap:'5px',marginTop:'7px',padding:'9px',borderRadius:'9px',background:'rgba(255,255,255,.025)',border:'1px solid rgba(255,255,255,.05)'}}>{splitRow('Servicio cobrado',serviceGrossBs,serviceGrossUsd,'var(--gold-primary)')}{metadata.didWash&&splitRow('Tarifa de limpieza',washBs,washGrossUsd,'#64d2ff')}{metadata.didWash&&splitRow('Base repartible del servicio',distributableBs,distributableUsd)}{splitRow(`Odontólogo (${commissionPct}%)`,commissionBs,commissionUsd,'#32d74b')}{splitRow(`Clínica del servicio (${Math.max(0,100-commissionPct)}%)`,shopBs,shopUsd)}{tipBs>0&&splitRow('Propina para el odontólogo',tipBs,tipUsd,'#32d74b')}{productCommissionBs>0&&splitRow('Comisión de productos',productCommissionBs,productCommissionBs/transactionRate,'#32d74b')}<div style={{borderTop:'1px solid rgba(255,255,255,.08)',paddingTop:'5px'}}>{splitRow('Neto del odontólogo',barberNetBs,barberNetBs/transactionRate,'var(--gold-primary)')}</div></div>}
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '6px', marginTop: '8px' }}><span style={{ padding: '4px 7px', borderRadius: '7px', background: 'rgba(50,215,75,.08)', color: '#8be39b', fontSize: '8px', fontWeight: 800 }}>{methodLabelFor(transaction)}</span>{metadata.didWash && <span style={{ padding: '4px 7px', borderRadius: '7px', background: 'rgba(0,122,255,.1)', color: '#64d2ff', fontSize: '8px', fontWeight: 800 }}>Limpieza</span>}<span style={{ marginLeft: 'auto', color: 'var(--text-muted)', fontSize: '8px' }}>{dateLabel(transaction.created_at)}</span></div>
        </article>;
      }) : <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '32px 8px', fontSize: '11px' }}>Aún no hay servicios en este período.</p>}</div></section>
      <section style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}><div style={{ padding: isMobile ? '10px' : '14px', borderRadius: '16px', background: 'rgba(255,255,255,.025)', border: '1px solid rgba(255,255,255,.07)' }}><h3 style={{ margin: '0 0 10px', fontSize: isMobile ? '13px' : '15px' }}>Pagos, vales y consumos</h3><div style={{ overflow: isMobile ? 'visible' : 'auto', maxHeight: isMobile ? 'none' : '300px' }}>{isMobile ? (movements.length ? movements.map(transaction => { const amountBs = txAmountBs(transaction, rate); const isVale = transaction.category === 'Vales Odontologos'; const isConsumption = transaction.category === 'Consumo Personal'; const itemNames = isConsumption ? (transaction.metadata?.items || []).map(item => `${item.name} x${item.quantity}`).join(', ') : ''; return <div key={transaction.id} style={{ padding: '10px', borderRadius: '10px', background: 'rgba(255,255,255,.025)', border: '1px solid rgba(255,255,255,.06)', marginBottom: '6px' }}><div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}><div style={{ minWidth: 0, flex: 1 }}><div style={{ fontSize: '9px', color: 'var(--text-secondary)', marginBottom: '3px' }}>{dateLabel(transaction.created_at)}</div><div style={{ fontSize: '10px', fontWeight: 700 }}>{isVale ? 'Vale / Adelanto' : isConsumption ? <><span style={{ color: '#ffad33' }}>Consumo</span>{itemNames && <small style={{ display: 'block', marginTop: '2px', color: 'var(--text-muted)', fontSize: '8px' }}>{itemNames}</small>}</> : transaction.metadata?.isAbono ? 'Abono' : 'Pago de nómina'}</div><div style={{ fontSize: '8px', color: 'var(--text-muted)', marginTop: '2px' }}>{isConsumption ? 'Inventario' : methodFor(transaction)}</div></div><div style={{ textAlign: 'right', flexShrink: 0 }}><strong style={{ fontSize: '11px', color: (isVale || isConsumption) ? '#ff6b61' : '#32d74b' }}>-{fmt(amountBs)} Bs</strong><div style={{ color: 'var(--text-muted)', fontSize: '8px' }}>-${fmt(Number(transaction.amount || usd(amountBs)))}</div></div></div></div>; }) : <p style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '10px' }}>Sin movimientos registrados.</p>) : <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '430px', fontSize: '9px' }}><thead><tr style={{ color: 'var(--text-muted)', textTransform: 'uppercase', borderBottom: '1px solid rgba(255,255,255,.08)' }}><th style={{ padding: '8px', textAlign: 'left' }}>Fecha</th><th style={{ padding: '8px', textAlign: 'left' }}>Concepto</th><th style={{ padding: '8px', textAlign: 'left' }}>Método</th><th style={{ padding: '8px', textAlign: 'right' }}>Monto</th></tr></thead><tbody>{movements.length ? movements.map(transaction => { const amountBs = txAmountBs(transaction, rate); const isVale = transaction.category === 'Vales Odontologos'; const isConsumption = transaction.category === 'Consumo Personal'; const itemNames = isConsumption ? (transaction.metadata?.items || []).map(item => `${item.name} x${item.quantity}`).join(', ') : ''; return <tr key={transaction.id} style={{ borderBottom: '1px solid rgba(255,255,255,.045)' }}><td style={{ padding: '9px 8px', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>{dateLabel(transaction.created_at)}</td><td style={{ padding: '9px 8px' }}>{isVale ? 'Vale / Adelanto' : isConsumption ? <><strong style={{ color: '#ffad33' }}>Consumo</strong>{itemNames && <small style={{ display: 'block', marginTop: '2px', color: 'var(--text-muted)', maxWidth: '180px' }}>{itemNames}</small>}</> : transaction.metadata?.isAbono ? 'Abono' : 'Pago de nómina'}</td><td style={{ padding: '9px 8px', color: 'var(--text-secondary)' }}>{isConsumption ? 'Inventario' : methodFor(transaction)}</td><td style={{ padding: '9px 8px', textAlign: 'right', color: (isVale || isConsumption) ? '#ff6b61' : '#32d74b', fontWeight: 800, whiteSpace: 'nowrap' }}>-{fmt(amountBs)} Bs<div style={{ color: 'var(--text-muted)', fontSize: '8px' }}>-${fmt(Number(transaction.amount || usd(amountBs)))}</div></td></tr>; }) : <tr><td colSpan="4" style={{ padding: '28px', textAlign: 'center', color: 'var(--text-muted)' }}>Sin movimientos registrados.</td></tr>}</tbody></table>}</div></div><div style={{ padding: isMobile ? '12px' : '16px', borderRadius: '16px', border: '1px solid rgba(17, 17, 17,.4)', background: 'rgba(17, 17, 17,.055)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: isMobile ? '10px' : '16px', flexWrap: isMobile ? 'wrap' : 'nowrap' }}><div style={{ minWidth: 0 }}><strong style={{ fontSize: isMobile ? '12px' : '14px' }}>Total a pagar este período</strong><span style={{ display: 'block', marginTop: '3px', color: 'var(--text-secondary)', fontSize: '10px' }}>Saldo oficial congelado en Bs</span></div><div style={{ textAlign: 'right', flexShrink: 0 }}><strong style={{ display: 'block', color: 'var(--gold-primary)', fontSize: isMobile ? '18px' : '22px' }}>{fmt(pendingBs)} Bs</strong><span style={{ display:'block', color: 'var(--gold-primary)', fontSize: '10px' }}>${fmt(pendingUsd)} USD al generar</span>{Math.abs(usd(pendingBs)-pendingUsd)>=.01&&<span style={{display:'block',color:'var(--text-muted)',fontSize:'9px'}}>≈ ${fmt(usd(pendingBs))} equivalente actual</span>}</div></div></section>
    </div>
    <footer style={{ flexShrink: 0, display: 'flex', flexDirection: isMobile ? 'column' : 'row', justifyContent: 'space-between', alignItems: isMobile ? 'stretch' : 'center', gap: '10px', marginTop: '14px', paddingTop: '12px', borderTop: '1px solid rgba(255,255,255,.1)' }}><span style={{ display: 'flex', alignItems: 'center', gap: '7px', color: 'var(--text-secondary)', fontSize: '10px' }}><CalendarDays size={15}/> Período: {new Date(periodStart).toLocaleDateString('es-VE')} – {new Date(periodEnd).toLocaleDateString('es-VE')}</span><div><button onClick={onPay} disabled={pendingBs <= 0} style={{ width: isMobile ? '100%' : 'auto', minHeight: '44px', padding: '0 24px', borderRadius: '11px', border: 0, background: 'var(--gold-primary)', color: '#090909', fontWeight: 900, cursor: pendingBs > 0 ? 'pointer' : 'not-allowed', opacity: pendingBs > 0 ? 1 : .45, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}><Banknote size={16}/> Registrar pago</button></div></footer>
  </section>;
};

export default PayrollDetailPanel;
