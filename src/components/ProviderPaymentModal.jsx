import React, { useState, useEffect, useMemo } from 'react';
import { 
  X, 
  Truck, 
  Banknote, 
  Landmark, 
  Smartphone, 
  Coins, 
  CreditCard, 
  Layers3, 
  AlertCircle, 
  CheckCircle2, 
  ArrowRight
} from 'lucide-react';
import AnimatedModal from './AnimatedModal';

const PAYMENT_ACCOUNTS = [
  { key: 'cash_usd', label: 'Efectivo ($)', usd: true, icon: Banknote },
  { key: 'zelle', label: 'Zelle', usd: true, icon: Landmark },
  { key: 'binance', label: 'Binance / USDT', usd: true, icon: Coins },
  { key: 'zinli', label: 'Zinli', usd: true, icon: Smartphone },
  { key: 'pago_movil', label: 'Pago Móvil', usd: false, icon: Smartphone },
  { key: 'cash_bs', label: 'Efectivo (Bs)', usd: false, icon: Banknote },
  { key: 'punto_venta', label: 'Punto de venta', usd: false, icon: CreditCard },
  { key: 'transferencia', label: 'Transferencia', usd: false, icon: Layers3 },
];

const formatMoney = (val, isUsd) => {
  const num = Number(val || 0);
  return isUsd
    ? `$${num.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    : `${num.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Bs`;
};

export default function ProviderPaymentModal({
  isOpen,
  onClose,
  onSubmit,
  loading = false,
  providerDebtBs = 0,
  providerDebtUsd = 0,
  accountBalances = {},
  rate = 1
}) {
  const [accountKey, setAccountKey] = useState('cash_usd');
  const [amount, setAmount] = useState('');

  // Reset when modal opens
  useEffect(() => {
    if (isOpen) {
      setAmount('');
      setAccountKey('cash_usd');
    }
  }, [isOpen]);

  const selectedAccount = useMemo(() => {
    return PAYMENT_ACCOUNTS.find(a => a.key === accountKey) || PAYMENT_ACCOUNTS[0];
  }, [accountKey]);

  const availableBalance = Math.max(0, Number(accountBalances?.[selectedAccount.key] || 0));
  const numericAmount = parseFloat(amount) || 0;

  // Amount in USD and BS
  const amountUsd = selectedAccount.usd ? numericAmount : (rate > 0 ? numericAmount / rate : 0);
  const amountBs = selectedAccount.usd ? numericAmount * rate : numericAmount;

  // Max payable amount for this account currency
  const maxDebtInCurrentCurrency = selectedAccount.usd 
    ? (providerDebtUsd || (rate > 0 ? providerDebtBs / rate : 0))
    : providerDebtBs;

  // Debt after payment
  const remainingDebtBs = Math.max(0, providerDebtBs - amountBs);
  const remainingDebtUsd = rate > 0 ? remainingDebtBs / rate : 0;
  const isFullyPaid = numericAmount > 0 && remainingDebtBs <= 0.01;

  // Validation
  const isZero = numericAmount <= 0;
  const isExceedingBalance = numericAmount > (availableBalance + 0.0001);
  const invalid = isZero || isExceedingBalance || loading;

  const handleQuickAdd = (delta) => {
    const current = parseFloat(amount) || 0;
    const next = Math.max(0, current + delta);
    setAmount(next.toFixed(2));
  };

  const handlePayFull = () => {
    if (maxDebtInCurrentCurrency > 0) {
      setAmount(maxDebtInCurrentCurrency.toFixed(2));
    }
  };

  const handleSubmit = (e) => {
    e?.preventDefault();
    if (invalid) return;
    onSubmit({
      account: selectedAccount,
      amount: numericAmount,
      amountUsd,
      amountBs
    });
  };

  return (
    <AnimatedModal isOpen={isOpen}>
      {(overlayClass, cardClass) => (
        <div 
          className={overlayClass.replace('global-modal-overlay', '')} 
          style={{ 
            position: 'fixed', 
            inset: 0, 
            zIndex: 3200, 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            padding: 'clamp(10px, 2.5vw, 24px)',
            paddingTop: 'max(10px, env(safe-area-inset-top, 10px))',
            boxSizing: 'border-box',
            background: 'var(--bg-secondary)',
            backdropFilter: 'blur(16px)' 
          }}
        >
          <div 
            className={cardClass.replace('global-modal-card', '')} 
            style={{ 
              width: 'min(940px, 96vw)', 
              maxHeight: 'min(92dvh, 760px)', 
              display: 'flex', 
              flexDirection: 'column', 
              background: 'var(--bg-secondary)', 
              border: '1px solid rgba(255, 159, 10, 0.28)', 
              borderRadius: '24px', 
              boxShadow: '0 28px 80px rgba(0,0,0,0.85)',
              overflow: 'hidden'
            }}
          >
            {/* Header */}
            <header style={{ 
              padding: 'clamp(14px, 2vw, 18px) clamp(16px, 2.5vw, 24px)', 
              borderBottom: '1px solid rgba(255, 255, 255, 0.07)', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'space-between',
              gap: '12px',
              flexShrink: 0
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ 
                  width: '42px', 
                  height: '42px', 
                  borderRadius: '13px', 
                  background: 'rgba(255, 159, 10, 0.12)', 
                  border: '1px solid rgba(255, 159, 10, 0.3)', 
                  display: 'grid', 
                  placeItems: 'center', 
                  color: '#ff9f0a',
                  flexShrink: 0 
                }}>
                  <Truck size={22} />
                </div>
                <div>
                  <h2 style={{ fontSize: 'clamp(17px, 2vw, 20px)', fontWeight: '950', margin: 0, color: '#fff', letterSpacing: '-0.3px' }}>
                    Pago a Proveedor
                  </h2>
                  <p style={{ margin: '2px 0 0', fontSize: '11.5px', color: 'var(--text-secondary)' }}>
                    Salda la reposición de productos vendidos descontando del saldo de tu cuenta.
                  </p>
                </div>
              </div>
              <button 
                type="button" 
                onClick={onClose} 
                aria-label="Cerrar modal"
                style={{ 
                  width: '36px', 
                  height: '36px', 
                  borderRadius: '10px', 
                  background: 'rgba(255, 255, 255, 0.05)', 
                  border: '1px solid rgba(255, 255, 255, 0.1)', 
                  color: '#ccc', 
                  display: 'grid', 
                  placeItems: 'center', 
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; e.currentTarget.style.color = '#fff'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.color = '#ccc'; }}
              >
                <X size={18} />
              </button>
            </header>

            {/* Modal Body - 2 Columns on Desktop */}
            <div 
              className="panda-scrollbar" 
              style={{ 
                flex: 1, 
                overflowY: 'auto', 
                padding: 'clamp(14px, 2.5vw, 22px)',
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(min(320px, 100%), 1fr))',
                gap: 'clamp(14px, 2vw, 22px)',
                alignItems: 'start'
              }}
            >
              {/* Left Column: Debt Info + Amount Input + Financial Impact */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                
                {/* Outstanding Debt Card */}
                <div style={{ 
                  background: 'linear-gradient(135deg, rgba(255, 159, 10, 0.12) 0%, rgba(17, 17, 17, 0.06) 100%)', 
                  border: '1px solid rgba(255, 159, 10, 0.3)', 
                  borderRadius: '16px', 
                  padding: '14px 16px',
                  boxShadow: '0 8px 24px rgba(255, 159, 10, 0.06)'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <span style={{ fontSize: '10.5px', fontWeight: '900', color: '#ff9f0a', textTransform: 'uppercase', letterSpacing: '0.6px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                      <AlertCircle size={13} color="#ff9f0a" /> Deuda Actual por Reposición
                    </span>
                    <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', fontWeight: '700' }}>
                      Tasa: {Number(rate || 1).toLocaleString('es-VE', { maximumFractionDigits: 2 })} Bs/$
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', flexWrap: 'wrap' }}>
                    <strong style={{ fontSize: '24px', fontWeight: '950', color: '#ff9f0a', letterSpacing: '-0.5px' }}>
                      {Number(providerDebtBs || 0).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Bs
                    </strong>
                    <span style={{ fontSize: '14px', color: 'rgba(255,255,255,0.7)', fontWeight: '800' }}>
                      ≈ ${Number(providerDebtUsd || 0).toFixed(2)} USD
                    </span>
                  </div>
                </div>

                {/* Amount Input Section */}
                <div style={{ 
                  background: 'rgba(255, 255, 255, 0.025)', 
                  border: '1px solid rgba(255, 255, 255, 0.08)', 
                  borderRadius: '16px', 
                  padding: '14px 16px' 
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <label style={{ fontSize: '11.5px', fontWeight: '900', color: 'var(--gold-primary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      Monto a pagar ({selectedAccount.usd ? 'USD $' : 'Bolívares Bs'})
                    </label>
                    <span style={{ fontSize: '11px', color: isExceedingBalance ? '#ff453a' : 'var(--text-muted)', fontWeight: isExceedingBalance ? '900' : '600' }}>
                      Disponible: {formatMoney(availableBalance, selectedAccount.usd)}
                    </span>
                  </div>

                  {/* Input Box */}
                  <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                    <span style={{ 
                      position: 'absolute', 
                      left: '14px', 
                      fontSize: '18px', 
                      fontWeight: '900', 
                      color: selectedAccount.usd ? 'var(--gold-primary)' : '#64d2ff' 
                    }}>
                      {selectedAccount.usd ? '$' : 'Bs'}
                    </span>
                    <input 
                      type="number"
                      inputMode="decimal"
                      step="0.01"
                      placeholder="0.00"
                      value={amount}
                      onChange={e => setAmount(e.target.value)}
                      style={{ 
                        width: '100%', 
                        boxSizing: 'border-box', 
                        padding: '12px 14px 12px 42px', 
                        borderRadius: '12px', 
                        background: 'var(--bg-secondary)', 
                        border: isExceedingBalance 
                          ? '1.5px solid #ff453a' 
                          : numericAmount > 0 
                            ? '1.5px solid rgba(17, 17, 17, 0.6)' 
                            : '1px solid rgba(255, 255, 255, 0.12)', 
                        color: '#fff', 
                        fontSize: '18px', 
                        fontWeight: '900', 
                        outline: 'none',
                        transition: 'border-color 0.2s ease'
                      }}
                    />
                  </div>

                  {/* Equivalent Preview */}
                  {numericAmount > 0 && (
                    <div style={{ marginTop: '7px', fontSize: '11.5px', color: 'rgba(255,255,255,0.6)', fontWeight: '600', display: 'flex', justifyContent: 'space-between' }}>
                      <span>Equivalente:</span>
                      <strong style={{ color: selectedAccount.usd ? '#64d2ff' : 'var(--gold-primary)' }}>
                        {selectedAccount.usd 
                          ? `≈ ${Number(amountBs).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Bs` 
                          : `≈ $${Number(amountUsd).toFixed(2)} USD`}
                      </strong>
                    </div>
                  )}

                  {/* Insufficient Funds Warning */}
                  {isExceedingBalance && (
                    <div style={{ marginTop: '8px', padding: '6px 10px', borderRadius: '8px', background: 'rgba(255, 69, 58, 0.12)', border: '1px solid rgba(255, 69, 58, 0.3)', color: '#ff6961', fontSize: '11px', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <AlertCircle size={13} /> Saldo insuficiente en {selectedAccount.label}.
                    </div>
                  )}

                  {/* Quick Preset Buttons */}
                  <div style={{ marginTop: '12px', display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {selectedAccount.usd ? (
                      <>
                        <button type="button" onClick={() => handleQuickAdd(5)} style={quickBtnStyle}>+$5</button>
                        <button type="button" onClick={() => handleQuickAdd(10)} style={quickBtnStyle}>+$10</button>
                        <button type="button" onClick={() => handleQuickAdd(20)} style={quickBtnStyle}>+$20</button>
                        <button type="button" onClick={() => handleQuickAdd(50)} style={quickBtnStyle}>+$50</button>
                      </>
                    ) : (
                      <>
                        <button type="button" onClick={() => handleQuickAdd(500)} style={quickBtnStyle}>+500 Bs</button>
                        <button type="button" onClick={() => handleQuickAdd(1000)} style={quickBtnStyle}>+1.000 Bs</button>
                        <button type="button" onClick={() => handleQuickAdd(2000)} style={quickBtnStyle}>+2.000 Bs</button>
                        <button type="button" onClick={() => handleQuickAdd(5000)} style={quickBtnStyle}>+5.000 Bs</button>
                      </>
                    )}
                    <button 
                      type="button" 
                      onClick={handlePayFull} 
                      style={{ 
                        ...quickBtnStyle, 
                        background: 'rgba(255, 159, 10, 0.15)', 
                        borderColor: 'rgba(255, 159, 10, 0.35)', 
                        color: '#ff9f0a',
                        fontWeight: '900'
                      }}
                    >
                      Saldar Todo ({formatMoney(maxDebtInCurrentCurrency, selectedAccount.usd)})
                    </button>
                  </div>
                </div>

                {/* Live Financial Impact Box */}
                <div style={{ 
                  padding: '12px 14px', 
                  borderRadius: '14px', 
                  background: 'var(--bg-secondary)', 
                  border: '1px solid rgba(255, 255, 255, 0.07)' 
                }}>
                  <div style={{ fontSize: '10px', fontWeight: '900', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: '8px' }}>
                    Impacto en la deuda
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) auto minmax(0, 1fr)', gap: '8px', alignItems: 'center', textAlign: 'center' }}>
                    <div style={{ background: 'rgba(255,255,255,0.03)', padding: '6px 8px', borderRadius: '8px' }}>
                      <span style={{ display: 'block', fontSize: '9.5px', color: 'var(--text-muted)' }}>Deuda actual</span>
                      <strong style={{ fontSize: '12.5px', color: '#ff9f0a' }}>
                        ${Number(providerDebtUsd || 0).toFixed(2)}
                      </strong>
                    </div>
                    <ArrowRight size={14} color="rgba(255,255,255,0.4)" />
                    <div style={{ background: isFullyPaid ? 'rgba(50, 215, 75, 0.12)' : 'rgba(255,255,255,0.03)', border: isFullyPaid ? '1px solid rgba(50, 215, 75, 0.3)' : 'none', padding: '6px 8px', borderRadius: '8px' }}>
                      <span style={{ display: 'block', fontSize: '9.5px', color: isFullyPaid ? '#32d74b' : 'var(--text-muted)' }}>
                        {isFullyPaid ? '¡Deuda saldada!' : 'Nueva deuda'}
                      </span>
                      <strong style={{ fontSize: '12.5px', color: isFullyPaid ? '#32d74b' : '#fff' }}>
                        ${remainingDebtUsd.toFixed(2)}
                      </strong>
                    </div>
                  </div>
                </div>

              </div>

              {/* Right Column: Origin Payment Account Selection Grid */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                  <label style={{ fontSize: '11.5px', fontWeight: '900', color: 'var(--gold-primary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Cuenta de Origen
                  </label>
                  <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                    Selecciona de dónde pagar
                  </span>
                </div>

                {/* 2x4 Payment Method Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '9px' }}>
                  {PAYMENT_ACCOUNTS.map(acc => {
                    const active = acc.key === accountKey;
                    const balance = Math.max(0, Number(accountBalances?.[acc.key] || 0));
                    const IconComp = acc.icon;
                    const isZeroBalance = balance <= 0;

                    return (
                      <button
                        key={acc.key}
                        type="button"
                        onClick={() => setAccountKey(acc.key)}
                        style={{
                          textAlign: 'left',
                          padding: '11px 12px',
                          borderRadius: '13px',
                          cursor: 'pointer',
                          background: active 
                            ? 'linear-gradient(135deg, rgba(17, 17, 17, 0.16) 0%, rgba(17, 17, 17, 0.05) 100%)' 
                            : 'rgba(255, 255, 255, 0.025)',
                          border: active 
                            ? '1.5px solid var(--gold-primary)' 
                            : '1px solid rgba(255, 255, 255, 0.08)',
                          boxShadow: active ? '0 4px 16px rgba(17, 17, 17, 0.15)' : 'none',
                          transition: 'all 0.15s ease',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '6px'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <span style={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: '7px', 
                            fontSize: '12px', 
                            fontWeight: '850',
                            color: active ? '#fff' : 'rgba(255,255,255,0.85)'
                          }}>
                            <IconComp size={15} color={active ? 'var(--gold-primary)' : 'rgba(255,255,255,0.6)'} />
                            {acc.label}
                          </span>
                          {active && (
                            <CheckCircle2 size={14} color="var(--gold-primary)" />
                          )}
                        </div>

                        {/* Balance pill */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '2px' }}>
                          <span style={{ 
                            fontSize: '10px', 
                            fontWeight: '800', 
                            color: isZeroBalance ? 'var(--text-muted)' : active ? 'var(--gold-primary)' : 'rgba(255,255,255,0.55)',
                            background: active ? 'rgba(17, 17, 17,0.1)' : 'rgba(255,255,255,0.03)',
                            padding: '2px 6px',
                            borderRadius: '6px'
                          }}>
                            Disp: {formatMoney(balance, acc.usd)}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Info Note */}
                <div style={{ 
                  marginTop: '6px', 
                  padding: '10px 12px', 
                  borderRadius: '12px', 
                  background: 'rgba(255, 255, 255, 0.02)', 
                  border: '1px solid rgba(255, 255, 255, 0.05)',
                  fontSize: '11px',
                  color: 'var(--text-secondary)',
                  lineHeight: '1.4'
                }}>
                  <strong style={{ color: 'rgba(255,255,255,0.85)' }}>Nota operativa:</strong> Este pago no se contabiliza como gasto operativo nuevo, ya que solo salda la deuda de reposición de inventario previamente vendido.
                </div>

              </div>
            </div>

            {/* Footer */}
            <footer style={{ 
              padding: '12px clamp(16px, 2.5vw, 24px)', 
              borderTop: '1px solid rgba(255, 255, 255, 0.07)', 
              display: 'flex', 
              justifyContent: 'flex-end', 
              alignItems: 'center',
              background: 'var(--bg-secondary)',
              flexShrink: 0
            }}>
              <button 
                type="button" 
                disabled={invalid} 
                onClick={handleSubmit} 
                className="btn-gold" 
                style={{ 
                  minWidth: '220px', 
                  padding: '12px 28px', 
                  borderRadius: '12px', 
                  fontWeight: '950', 
                  fontSize: '13.5px',
                  border: 'none',
                  cursor: invalid ? 'not-allowed' : 'pointer',
                  opacity: invalid ? 0.45 : 1,
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  boxShadow: invalid ? 'none' : '0 4px 16px rgba(17, 17, 17,0.25)',
                  transition: 'all 0.2s ease'
                }}
              >
                <Truck size={16} /> {loading ? 'Registrando pago…' : 'Registrar Pago a Proveedor'}
              </button>
            </footer>

          </div>
        </div>
      )}
    </AnimatedModal>
  );
}

const quickBtnStyle = {
  padding: '5px 9px',
  borderRadius: '8px',
  border: '1px solid rgba(255, 255, 255, 0.1)',
  background: 'rgba(255, 255, 255, 0.04)',
  color: 'rgba(255, 255, 255, 0.85)',
  fontSize: '11px',
  fontWeight: '800',
  cursor: 'pointer',
  transition: 'all 0.15s ease'
};
