import React from 'react';
import { 
  Banknote, 
  Coins, 
  CreditCard, 
  Layers3, 
  Landmark, 
  Smartphone, 
  WalletCards, 
  X, 
  ArrowRight, 
  AlertCircle,
  CalendarDays
} from 'lucide-react';
import { VALE_METHOD_CONFIG, valeTotals } from '../utils/valeUtils';
import FieldLabel from './FieldLabel';

const ICON_METHODS = [
  { name: 'Efectivo ($)', key: 'cash_usd', currency: 'USD', icon: Banknote },
  { name: 'Zelle', key: 'zelle', currency: 'USD', icon: Landmark },
  { name: 'Zinli', key: 'zinli', currency: 'USD', icon: CreditCard },
  { name: 'Binance / USDT', key: 'binance', currency: 'USD', icon: Coins },
  { name: 'Pago Móvil', key: 'pago_movil', currency: 'Bs', icon: Smartphone },
  { name: 'Punto de venta', key: 'punto_venta', currency: 'Bs', icon: CreditCard },
  { name: 'Efectivo (Bs)', key: 'cash_bs', currency: 'Bs', icon: Banknote }
];

const VALE_METHODS = VALE_METHOD_CONFIG.map(method => ({ 
  ...method, 
  icon: ICON_METHODS.find(item => item.name === method.name)?.icon || Banknote 
}));

const fmt = n => Number(n || 0).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function ValeAdvancePanel({ modal, setModal, balances, rate, activeVales, onSubmit, loading, isMobile }) {
  const mixed = modal.paymentMethod === 'Mixto';
  const selected = VALE_METHODS.find(item => item.name === modal.paymentMethod) || VALE_METHODS[0];
  const { distribution, amountBs } = valeTotals(modal, rate);
  const payrollBalanceBs = Number(modal.maxBalance) || 0;
  const resultingBalanceBs = payrollBalanceBs - amountBs;
  const nativeAvailable = Math.max(0, Number(balances?.[selected.key]) || 0);
  const accountExceeded = distribution.some(item => item.amount > Math.max(0, Number(balances?.[item.key]) || 0) + .001);
  const invalid = loading || amountBs <= 0 || accountExceeded;
  const currency = selected.currency;

  const close = () => setModal(prev => ({ ...prev, isOpen: false }));
  const setMethod = name => setModal({ ...modal, paymentMethod: name, amountBs: '', allocations: {} });

  return (
    <div style={{ 
      width: 'min(980px, 96vw)', 
      maxHeight: isMobile ? '100vh' : '92vh', 
      overflowY: 'auto', 
      padding: isMobile ? '20px 16px' : '26px 30px', 
      borderRadius: isMobile ? '0' : '26px', 
      border: '1px solid rgba(17, 17, 17,.3)', 
      background: 'var(--bg-secondary)', 
      boxShadow: '0 30px 100px rgba(0,0,0,0.85)',
      display: 'flex',
      flexDirection: 'column',
      gap: '18px',
      color: 'white'
    }}>
      {/* Header */}
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: isMobile ? '20px' : '23px', display: 'flex', gap: '10px', alignItems: 'center', fontWeight: '900', letterSpacing: '-0.3px' }}>
            <Banknote color="var(--gold-primary)" size={24} /> Registrar Vale / Adelanto
          </h2>
          <p style={{ margin: '4px 0 0', color: 'var(--text-secondary)', fontSize: '12px' }}>
            El monto se registrará como egreso y se descontará automáticamente en su próximo pago de nómina.
          </p>
        </div>
        <button 
          onClick={close} 
          aria-label="Cerrar" 
          style={{ width: '38px', height: '38px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.04)', color: 'var(--text-secondary)', cursor: 'pointer', display: 'grid', placeItems: 'center', flexShrink: 0, transition: 'all 0.15s ease' }}
          onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
          onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.04)'}
        >
          <X size={18} />
        </button>
      </header>

      {/* Main 2-Column Grid for Desktop */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: isMobile ? '1fr' : '1.05fr 0.95fr',
        gap: isMobile ? '18px' : '24px',
        alignItems: 'start'
      }}>
        {/* Columna Izquierda: Barbero + Monto + Nota */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Barbero Info Banner */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '12px 16px',
            borderRadius: '16px',
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.08)',
            gap: '12px',
            flexWrap: isMobile ? 'wrap' : 'nowrap'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
              <div style={{
                width: '44px',
                height: '44px',
                borderRadius: '14px',
                overflow: 'hidden',
                border: '1.5px solid rgba(17, 17, 17,0.35)',
                boxShadow: '0 0 12px rgba(17, 17, 17,0.15)',
                background: 'rgba(17, 17, 17,0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--gold-primary)',
                fontWeight: '900',
                fontSize: '18px',
                flexShrink: 0
              }}>
                {modal.staff?.image_url ? (
                  <img src={modal.staff.image_url} alt={modal.staff?.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <span>{modal.staff?.name?.charAt(0)?.toUpperCase() || 'P'}</span>
                )}
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontWeight: '850', fontSize: '15px', color: 'white', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {modal.staff?.name}
                </div>
                <div style={{ fontSize: '10.5px', color: 'var(--gold-primary)', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.4px', marginTop: '1px' }}>
                  {String(modal.staff?.role || 'Profesional').split('|')[0]}
                </div>
              </div>
            </div>

            <div style={{ textAlign: isMobile ? 'left' : 'right', borderTop: isMobile ? '1px solid rgba(255,255,255,0.06)' : 'none', paddingTop: isMobile ? '8px' : '0', width: isMobile ? '100%' : 'auto' }}>
              <span style={{ fontSize: '9.5px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: '800', letterSpacing: '0.5px', display: 'block' }}>
                Saldo actual
              </span>
              <div style={{ fontSize: '14px', fontWeight: '950', color: payrollBalanceBs < 0 ? '#ff453a' : '#32d74b', marginTop: '1px' }}>
                ${fmt(payrollBalanceBs / rate)} USD <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: '600' }}>({fmt(payrollBalanceBs)} Bs)</span>
              </div>
            </div>
          </div>

          {/* Monto del Vale Input */}
          {!mixed && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label style={{ fontSize: '11px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-secondary)' }}>
                Monto a entregar ({currency === 'USD' ? 'USD $' : 'Bolívares Bs.'}) *
              </label>
              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', fontSize: '20px', fontWeight: '900', color: 'var(--gold-primary)' }}>
                  {currency === 'USD' ? '$' : 'Bs'}
                </span>
                <input 
                  autoFocus
                  type="number"
                  min="0"
                  step="0.01"
                  value={modal.amountBs}
                  onChange={e => setModal({ ...modal, amountBs: e.target.value })}
                  placeholder="0.00"
                  style={{
                    width: '100%',
                    padding: currency === 'USD' ? '14px 16px 14px 40px' : '14px 16px 14px 48px',
                    borderRadius: '14px',
                    border: '1.5px solid rgba(17, 17, 17,0.4)',
                    background: 'var(--bg-secondary)',
                    color: 'white',
                    fontSize: '22px',
                    fontWeight: '900',
                    outline: 'none',
                    boxShadow: '0 4px 16px rgba(0,0,0,0.5)'
                  }}
                />
              </div>

              {/* Botones de Monto Rápido */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '2px', alignItems: 'center' }}>
                {(currency === 'USD' ? [5, 10, 20, 50] : [500, 1000, 2000, 5000]).map(v => (
                  <button 
                    key={v}
                    type="button"
                    onClick={() => setModal({ ...modal, amountBs: String(v) })}
                    style={{
                      padding: '7px 12px',
                      borderRadius: '10px',
                      background: 'rgba(255,255,255,0.04)',
                      border: '1px solid rgba(255,255,255,0.09)',
                      color: 'white',
                      fontSize: '11.5px',
                      fontWeight: '800',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.04)'}
                  >
                    +{currency === 'USD' ? `$${v}` : `${v} Bs`}
                  </button>
                ))}
                {payrollBalanceBs > 0 && (
                  <button 
                    type="button"
                    onClick={() => setModal({ ...modal, amountBs: String(currency === 'USD' ? (payrollBalanceBs / rate).toFixed(2) : payrollBalanceBs.toFixed(2)) })}
                    style={{
                      padding: '7px 12px',
                      borderRadius: '10px',
                      background: 'rgba(17, 17, 17,0.1)',
                      border: '1px solid rgba(17, 17, 17,0.3)',
                      color: 'var(--gold-primary)',
                      fontSize: '11.5px',
                      fontWeight: '850',
                      cursor: 'pointer',
                      marginLeft: isMobile ? '0' : 'auto'
                    }}
                  >
                    Todo el saldo (${fmt(payrollBalanceBs / rate)})
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Motivo / Nota */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <FieldLabel>Motivo / Nota (opcional)</FieldLabel>
            <textarea 
              maxLength={120} 
              value={modal.note || ''} 
              onChange={e => setModal({ ...modal, note: e.target.value })} 
              placeholder="Ej. Adelanto de quincena, gastos personales, etc." 
              style={{ 
                width: '100%', 
                minHeight: '64px', 
                padding: '10px 14px', 
                borderRadius: '12px', 
                border: '1px solid rgba(255,255,255,0.1)', 
                background: 'var(--bg-secondary)', 
                color: 'white', 
                fontFamily: 'inherit',
                fontSize: '12.5px',
                resize: 'vertical',
                outline: 'none'
              }}
            />
          </div>
        </div>

        {/* Columna Derecha: Métodos de Pago + Impacto Financiero */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Selector de Cuentas / Métodos */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontSize: '11px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-secondary)' }}>
              Cuenta de origen / Método de pago
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '8px' }}>
              {[...VALE_METHODS, { name: 'Mixto', icon: Layers3, key: 'mixto' }].map(method => {
                const active = method.name === modal.paymentMethod;
                const Icon = method.icon || Banknote;
                const available = method.key === 'mixto' ? null : Number(balances?.[method.key] || 0);

                return (
                  <button
                    key={method.name}
                    type="button"
                    onClick={() => setMethod(method.name)}
                    style={{
                      padding: '10px 12px',
                      borderRadius: '12px',
                      background: active ? 'rgba(17, 17, 17,0.12)' : 'rgba(255,255,255,0.03)',
                      border: active ? '1.5px solid var(--gold-primary)' : '1px solid rgba(255,255,255,0.08)',
                      color: active ? 'var(--gold-primary)' : 'white',
                      cursor: 'pointer',
                      textAlign: 'left',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      transition: 'all 0.15s ease',
                      boxShadow: active ? '0 0 14px rgba(17, 17, 17,0.15)' : 'none'
                    }}
                  >
                    <div style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '8px',
                      background: active ? 'rgba(17, 17, 17,0.2)' : 'rgba(255,255,255,0.05)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0
                    }}>
                      <Icon size={16} color={active ? 'var(--gold-primary)' : 'var(--text-secondary)'} />
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: '11.5px', fontWeight: '850', color: active ? 'var(--gold-primary)' : 'white', lineHeight: '1.2', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {method.name}
                      </div>
                      <div style={{ fontSize: '9.5px', color: active ? 'rgba(17, 17, 17,0.85)' : 'var(--text-muted)', marginTop: '2px', fontWeight: '600' }}>
                        {method.key === 'mixto' ? 'Dividir monto' : `Disp: ${method.currency === 'USD' ? '$' : ''}${fmt(available)}${method.currency === 'Bs' ? ' Bs' : ''}`}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Si es Mixto: distribución manual */}
          {mixed && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '12px', borderRadius: '14px', background: 'var(--bg-secondary)', border: '1px solid rgba(255,255,255,0.08)' }}>
              <span style={{ fontSize: '10.5px', fontWeight: '800', color: 'var(--gold-primary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Distribución por cuenta:
              </span>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '6px', maxHeight: '180px', overflowY: 'auto' }}>
                {VALE_METHODS.map(method => {
                  const available = Number(balances?.[method.key] || 0);
                  return (
                    <label key={method.name} style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 110px', alignItems: 'center', gap: '8px', padding: '6px 10px', borderRadius: '8px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', fontSize: '11px' }}>
                      <div style={{ minWidth: 0 }}>
                        <span style={{ fontWeight: '750', color: 'white', display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{method.name}</span>
                        <small style={{ color: 'var(--text-muted)', fontSize: '9px' }}>Disp: {method.currency === 'USD' ? '$' : ''}{fmt(available)}{method.currency === 'Bs' ? ' Bs' : ''}</small>
                      </div>
                      <div style={{ position: 'relative' }}>
                        <input 
                          type="number" 
                          min="0" 
                          step="0.01" 
                          value={modal.allocations?.[method.name] || ''} 
                          onChange={e => setModal({ ...modal, allocations: { ...(modal.allocations || {}), [method.name]: e.target.value } })} 
                          placeholder="0.00" 
                          style={{ width: '100%', padding: '6px 24px 6px 8px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.12)', background: 'var(--bg-secondary)', color: 'white', outline: 'none', fontSize: '12px', fontWeight: '800' }}
                        />
                        <b style={{ position: 'absolute', right: '6px', top: '50%', transform: 'translateY(-50%)', color: 'var(--gold-primary)', fontSize: '10px' }}>
                          {method.currency === 'USD' ? '$' : 'Bs'}
                        </b>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>
          )}

          {/* Impacto Financiero Visual (Antes ➔ Después) */}
          <div style={{
            padding: '14px 16px',
            borderRadius: '16px',
            background: 'var(--bg-secondary)',
            border: resultingBalanceBs < 0 ? '1px solid rgba(255,69,58,0.25)' : '1px solid rgba(255,255,255,0.08)',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '10px', fontWeight: '850', textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-secondary)' }}>
                Impacto en su próximo pago
              </span>
              <span style={{ fontSize: '10px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <CalendarDays size={12} color="var(--gold-primary)" /> {new Date().toLocaleDateString('es-VE', { day: '2-digit', month: 'short' })}
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'minmax(0, 1fr) auto minmax(0, 1fr) auto minmax(0, 1fr)', alignItems: 'center', gap: '8px' }}>
              {/* Saldo Actual */}
              <div style={{ background: 'rgba(255,255,255,0.03)', padding: '8px 10px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.05)' }}>
                <span style={{ fontSize: '9px', color: 'var(--text-muted)', fontWeight: '750', display: 'block', textTransform: 'uppercase' }}>Saldo actual</span>
                <strong style={{ fontSize: '13.5px', color: payrollBalanceBs < 0 ? '#ff453a' : 'white', display: 'block', marginTop: '1px' }}>
                  ${fmt(payrollBalanceBs / rate)}
                </strong>
              </div>

              {!isMobile && <span style={{ color: 'var(--text-muted)', fontSize: '16px', fontWeight: '900' }}>−</span>}

              {/* Monto del Vale */}
              <div style={{ background: 'rgba(255,69,58,0.06)', border: '1px solid rgba(255,69,58,0.2)', padding: '8px 10px', borderRadius: '10px' }}>
                <span style={{ fontSize: '9px', color: '#ff6961', fontWeight: '750', display: 'block', textTransform: 'uppercase' }}>Vale</span>
                <strong style={{ fontSize: '13.5px', color: '#ff453a', display: 'block', marginTop: '1px' }}>
                  -${fmt(amountBs / rate)}
                </strong>
              </div>

              {!isMobile && <ArrowRight size={14} color="var(--text-muted)" />}

              {/* Nuevo Saldo Resultante */}
              <div style={{ background: resultingBalanceBs < 0 ? 'rgba(255,69,58,0.08)' : 'rgba(50,215,75,0.08)', border: resultingBalanceBs < 0 ? '1px solid rgba(255,69,58,0.25)' : '1px solid rgba(50,215,75,0.25)', padding: '8px 10px', borderRadius: '10px' }}>
                <span style={{ fontSize: '9px', color: resultingBalanceBs < 0 ? '#ff6961' : '#32d74b', fontWeight: '750', display: 'block', textTransform: 'uppercase' }}>Nuevo saldo</span>
                <strong style={{ fontSize: '13.5px', color: resultingBalanceBs < 0 ? '#ff453a' : '#32d74b', display: 'block', marginTop: '1px' }}>
                  ${fmt(resultingBalanceBs / rate)}
                </strong>
              </div>
            </div>

            {resultingBalanceBs < 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#ff9f0a', fontSize: '10.5px', marginTop: '2px', background: 'rgba(255,159,10,0.06)', padding: '6px 10px', borderRadius: '8px', border: '1px solid rgba(255,159,10,0.2)' }}>
                <AlertCircle size={13} color="#ff9f0a" style={{ flexShrink: 0 }} />
                <span>El vale supera lo generado; quedará como saldo a recuperar en sus próximos servicios.</span>
              </div>
            )}
            {accountExceeded && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#ff453a', fontSize: '10.5px', background: 'rgba(255,69,58,0.08)', padding: '6px 10px', borderRadius: '8px', border: '1px solid rgba(255,69,58,0.25)' }}>
                <AlertCircle size={13} color="#ff453a" style={{ flexShrink: 0 }} />
                <span>El monto ingresado excede los fondos disponibles en la cuenta.</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Footer Actions */}
      <footer style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '12px', marginTop: '4px', paddingTop: '14px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
        <button 
          type="button"
          disabled={invalid} 
          onClick={onSubmit} 
          className="btn-gold" 
          style={{ 
            minWidth: '200px', 
            padding: '12px 28px', 
            borderRadius: '12px', 
            border: 'none',
            background: invalid ? 'rgba(255,255,255,0.05)' : 'var(--gold-primary)',
            color: invalid ? 'var(--text-muted)' : '#000',
            fontWeight: '950', 
            fontSize: '13.5px',
            cursor: invalid ? 'not-allowed' : 'pointer',
            opacity: invalid ? 0.5 : 1,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            boxShadow: invalid ? 'none' : '0 4px 16px rgba(17, 17, 17,0.25)',
            transition: 'all 0.2s ease'
          }}
        >
          <Banknote size={16} /> {loading ? 'Registrando…' : 'Registrar Vale'}
        </button>
      </footer>
    </div>
  );
}
