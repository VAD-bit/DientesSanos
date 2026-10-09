import React, { useState, useEffect, useMemo } from 'react';
import { 
  X, 
  RefreshCcw, 
  ArrowRight, 
  ArrowLeftRight, 
  Banknote, 
  Landmark, 
  Coins, 
  Smartphone, 
  CreditCard, 
  Layers3, 
  CheckCircle2, 
  AlertCircle,
  TrendingUp,
  Percent
} from 'lucide-react';
import AnimatedModal from './AnimatedModal';

const CONVERSION_ACCOUNTS = [
  { key: 'cash_usd', label: 'Efectivo ($)', shortLabel: 'Efectivo $', usd: true, icon: Banknote, color: '#32d74b' },
  { key: 'zelle', label: 'Zelle', shortLabel: 'Zelle', usd: true, icon: Landmark, color: '#7356bf' },
  { key: 'binance', label: 'Binance', shortLabel: 'Binance', usd: true, icon: Coins, color: '#f3ba2f' },
  { key: 'zinli', label: 'Zinli', shortLabel: 'Zinli', usd: true, icon: Smartphone, color: '#68369b' },
  { key: 'pago_movil', label: 'Pago Móvil', shortLabel: 'Pago Móvil', usd: false, icon: Smartphone, color: '#2f80ed' },
  { key: 'cash_bs', label: 'Efectivo (Bs)', shortLabel: 'Efectivo Bs', usd: false, icon: Banknote, color: '#32d74b' },
  { key: 'punto_venta', label: 'Punto de venta', shortLabel: 'Punto de venta', usd: false, icon: CreditCard, color: '#56ccf2' },
  { key: 'transferencia', label: 'Transferencia', shortLabel: 'Transferencia', usd: false, icon: Layers3, color: '#bb6bd9' }
];

const formatMoney = (val) => Number(val || 0).toLocaleString('es-VE', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2
});

export default function AccountConversionModal({
  isOpen,
  onClose,
  onSubmit,
  loading = false,
  balances = {},
  defaultRate = 550
}) {
  const [fromAccount, setFromAccount] = useState('pago_movil');
  const [toAccount, setToAccount] = useState('cash_usd');
  const [fromAmount, setFromAmount] = useState('');
  const [toAmount, setToAmount] = useState('');
  const [rate, setRate] = useState(String(defaultRate));
  const [isManualTo, setIsManualTo] = useState(false);

  // Sync default rate when opened
  useEffect(() => {
    if (isOpen) {
      setRate(String(defaultRate || 550));
      setFromAmount('');
      setToAmount('');
      setIsManualTo(false);
    }
  }, [isOpen, defaultRate]);

  const fromInfo = useMemo(() => CONVERSION_ACCOUNTS.find(a => a.key === fromAccount) || CONVERSION_ACCOUNTS[4], [fromAccount]);
  const toInfo = useMemo(() => CONVERSION_ACCOUNTS.find(a => a.key === toAccount) || CONVERSION_ACCOUNTS[0], [toAccount]);

  const fromAvail = Math.max(0, Number(balances?.[fromAccount] || 0));
  const toCurrentBal = Math.max(0, Number(balances?.[toAccount] || 0));

  const sameCurrency = fromInfo.usd === toInfo.usd;
  const numRate = Number(rate) > 0 ? Number(rate) : Number(defaultRate || 1);
  const numFromAmt = Number(fromAmount) || 0;

  // Auto calculate suggested toAmount
  const suggestedToAmount = useMemo(() => {
    if (numFromAmt <= 0) return 0;
    if (sameCurrency) return numFromAmt;
    if (fromInfo.usd && !toInfo.usd) {
      // USD -> Bs
      return numFromAmt * numRate;
    }
    if (!fromInfo.usd && toInfo.usd) {
      // Bs -> USD
      return numFromAmt / numRate;
    }
    return numFromAmt;
  }, [numFromAmt, sameCurrency, fromInfo.usd, toInfo.usd, numRate]);

  // Keep toAmount in sync unless manually edited
  const effectiveToAmount = isManualTo ? (Number(toAmount) || 0) : suggestedToAmount;

  // Validation
  const hasInsufficientFunds = numFromAmt > fromAvail + 0.0001;
  const isSameAccount = fromAccount === toAccount;
  const canSubmit = numFromAmt > 0 && effectiveToAmount > 0 && !hasInsufficientFunds && !isSameAccount && !loading;

  const handleFromAmountChange = (val) => {
    setFromAmount(val);
    if (!isManualTo) {
      setToAmount('');
    }
  };

  const handleSetPercent = (pct) => {
    const calculated = (fromAvail * (pct / 100)).toFixed(2);
    setFromAmount(calculated);
    if (!isManualTo) {
      setToAmount('');
    }
  };

  const handleSwap = () => {
    setFromAccount(toAccount);
    setToAccount(fromAccount);
    setFromAmount('');
    setToAmount('');
    setIsManualTo(false);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!canSubmit) return;

    onSubmit({
      fromAccount: fromInfo.key,
      toAccount: toInfo.key,
      fromAmount: numFromAmt,
      toAmount: effectiveToAmount,
      rate: numRate,
      sameCurrency
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
              maxHeight: 'min(92dvh, 800px)', 
              display: 'flex', 
              flexDirection: 'column', 
              background: 'var(--bg-secondary)', 
              border: '1px solid rgba(48, 209, 88, 0.28)', 
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
                  background: 'rgba(48, 209, 88, 0.12)', 
                  border: '1px solid rgba(48, 209, 88, 0.3)', 
                  display: 'grid', 
                  placeItems: 'center', 
                  color: '#32d74b',
                  flexShrink: 0 
                }}>
                  <RefreshCcw size={22} />
                </div>
                <div>
                  <h2 style={{ fontSize: 'clamp(17px, 2vw, 20px)', fontWeight: '950', margin: 0, color: '#fff', letterSpacing: '-0.3px' }}>
                    {sameCurrency ? 'Transferencia entre Cuentas' : 'Conversión de Divisa'}
                  </h2>
                  <p style={{ margin: '2px 0 0', fontSize: '11.5px', color: 'var(--text-secondary)' }}>
                    {sameCurrency 
                      ? 'Reubica saldo entre cuentas de la misma moneda (1:1 sin tasa).' 
                      : 'Cambio de divisa (Bs ↔ USD) con tasa de cambio. No afecta la ganancia total.'}
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

            {/* Content Area - 2 Columns on Desktop */}
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
              <div 
                className="panda-scrollbar" 
                style={{ 
                  flex: 1, 
                  overflowY: 'auto', 
                  padding: 'clamp(14px, 2vw, 22px) clamp(16px, 2.5vw, 24px)',
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
                  gap: '20px',
                  alignItems: 'start'
                }}
              >
                {/* LEFT COLUMN: ORIGIN ACCOUNT */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#ff453a' }} />
                      <span style={{ fontSize: '11px', fontWeight: '900', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.6px' }}>
                        Origen · Cuenta de Salida
                      </span>
                    </div>
                    <span style={{ fontSize: '11px', color: hasInsufficientFunds ? '#ff453a' : 'var(--text-muted)', fontWeight: '800' }}>
                      Disp: {formatMoney(fromAvail)} {fromInfo.usd ? '$' : 'Bs'}
                    </span>
                  </div>

                  {/* Account Grid Selector */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '8px' }}>
                    {CONVERSION_ACCOUNTS.map(acc => {
                      const Icon = acc.icon;
                      const isSelected = acc.key === fromAccount;
                      const bal = Number(balances?.[acc.key] || 0);

                      return (
                        <button
                          key={`from-${acc.key}`}
                          type="button"
                          onClick={() => {
                            setFromAccount(acc.key);
                            if (acc.key === toAccount) {
                              // switch destination to another account
                              const alternate = CONVERSION_ACCOUNTS.find(a => a.key !== acc.key);
                              if (alternate) setToAccount(alternate.key);
                            }
                          }}
                          style={{
                            padding: '10px 12px',
                            borderRadius: '12px',
                            border: isSelected ? '1.5px solid #ff453a' : '1px solid rgba(255, 255, 255, 0.08)',
                            background: isSelected ? 'rgba(255, 69, 58, 0.12)' : 'rgba(255, 255, 255, 0.02)',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'flex-start',
                            gap: '4px',
                            cursor: 'pointer',
                            textAlign: 'left',
                            transition: 'all 0.15s ease'
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', width: '100%' }}>
                            <Icon size={14} color={isSelected ? '#ff453a' : acc.color} />
                            <span style={{ fontSize: '11.5px', fontWeight: '900', color: isSelected ? '#fff' : 'rgba(255,255,255,0.85)', flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {acc.shortLabel}
                            </span>
                          </div>
                          <span style={{ fontSize: '10.5px', color: bal > 0 ? 'rgba(255,255,255,0.6)' : 'var(--text-muted)', fontWeight: '750' }}>
                            {formatMoney(bal)} {acc.usd ? '$' : 'Bs'}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Amount Input */}
                  <div style={{ marginTop: '4px' }}>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: '800', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                      Monto a Transferir / Sacar ({fromInfo.usd ? '$ USD' : 'Bolívares Bs'})
                    </label>
                    <div style={{ position: 'relative' }}>
                      <input
                        type="number"
                        inputMode="decimal"
                        step="any"
                        placeholder="0.00"
                        value={fromAmount}
                        onChange={e => handleFromAmountChange(e.target.value)}
                        style={{
                          width: '100%',
                          boxSizing: 'border-box',
                          padding: '12px 50px 12px 14px',
                          borderRadius: '14px',
                          background: 'var(--bg-secondary)',
                          border: hasInsufficientFunds 
                            ? '1.5px solid #ff453a' 
                            : '1.5px solid rgba(255, 255, 255, 0.12)',
                          color: '#fff',
                          fontSize: '18px',
                          fontWeight: '900',
                          outline: 'none'
                        }}
                      />
                      <span style={{
                        position: 'absolute',
                        right: '14px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        fontSize: '13px',
                        fontWeight: '900',
                        color: fromInfo.usd ? '#32d74b' : 'var(--gold-primary)'
                      }}>
                        {fromInfo.usd ? '$' : 'Bs'}
                      </span>
                    </div>

                    {/* Quick percentage buttons */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: '6px', marginTop: '8px' }}>
                      {[25, 50, 75, 100].map(pct => (
                        <button
                          key={pct}
                          type="button"
                          disabled={fromAvail <= 0}
                          onClick={() => handleSetPercent(pct)}
                          style={{
                            padding: '6px 0',
                            borderRadius: '8px',
                            background: 'rgba(255, 255, 255, 0.04)',
                            border: '1px solid rgba(255, 255, 255, 0.08)',
                            color: 'rgba(255, 255, 255, 0.8)',
                            fontSize: '11px',
                            fontWeight: '850',
                            cursor: fromAvail > 0 ? 'pointer' : 'not-allowed',
                            opacity: fromAvail > 0 ? 1 : 0.4
                          }}
                        >
                          {pct === 100 ? 'Todo' : `${pct}%`}
                        </button>
                      ))}
                    </div>

                    {hasInsufficientFunds && (
                      <div style={{ fontSize: '11px', color: '#ff453a', fontWeight: '800', marginTop: '6px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <AlertCircle size={13} />
                        Saldo insuficiente en {fromInfo.label} (disponible {formatMoney(fromAvail)} {fromInfo.usd ? '$' : 'Bs'}).
                      </div>
                    )}
                  </div>
                </div>

                {/* RIGHT COLUMN: DESTINATION ACCOUNT & EXCHANGE RATE */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#32d74b' }} />
                      <span style={{ fontSize: '11px', fontWeight: '900', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.6px' }}>
                        Destino · Cuenta de Entrada
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={handleSwap}
                      title="Invertir origen y destino"
                      style={{
                        padding: '3px 8px',
                        borderRadius: '6px',
                        background: 'rgba(255, 255, 255, 0.05)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        color: 'var(--gold-primary)',
                        fontSize: '10.5px',
                        fontWeight: '800',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        cursor: 'pointer'
                      }}
                    >
                      <ArrowLeftRight size={11} /> Invertir
                    </button>
                  </div>

                  {/* Destination Account Grid Selector */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '8px' }}>
                    {CONVERSION_ACCOUNTS.map(acc => {
                      const Icon = acc.icon;
                      const isSelected = acc.key === toAccount;
                      const isOrigin = acc.key === fromAccount;
                      const bal = Number(balances?.[acc.key] || 0);

                      return (
                        <button
                          key={`to-${acc.key}`}
                          type="button"
                          disabled={isOrigin}
                          onClick={() => {
                            setToAccount(acc.key);
                            setIsManualTo(false);
                          }}
                          style={{
                            padding: '10px 12px',
                            borderRadius: '12px',
                            border: isSelected ? '1.5px solid #32d74b' : '1px solid rgba(255, 255, 255, 0.08)',
                            background: isSelected ? 'rgba(48, 209, 88, 0.12)' : 'rgba(255, 255, 255, 0.02)',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'flex-start',
                            gap: '4px',
                            cursor: isOrigin ? 'not-allowed' : 'pointer',
                            opacity: isOrigin ? 0.35 : 1,
                            textAlign: 'left',
                            transition: 'all 0.15s ease'
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', width: '100%' }}>
                            <Icon size={14} color={isSelected ? '#32d74b' : acc.color} />
                            <span style={{ fontSize: '11.5px', fontWeight: '900', color: isSelected ? '#fff' : 'rgba(255,255,255,0.85)', flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {acc.shortLabel}
                            </span>
                          </div>
                          <span style={{ fontSize: '10.5px', color: bal > 0 ? 'rgba(255,255,255,0.6)' : 'var(--text-muted)', fontWeight: '750' }}>
                            {formatMoney(bal)} {acc.usd ? '$' : 'Bs'}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Exchange Rate Box (if currencies differ) */}
                  {!sameCurrency ? (
                    <div style={{ 
                      padding: '10px 14px', 
                      borderRadius: '14px', 
                      background: 'rgba(17, 17, 17, 0.06)', 
                      border: '1px solid rgba(17, 17, 17, 0.2)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '10px'
                    }}>
                      <div>
                        <span style={{ fontSize: '10.5px', fontWeight: '900', color: 'var(--gold-primary)', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                          Tasa de Cambio (Bs / $)
                        </span>
                        <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '1px' }}>
                          Oficial: {Number(defaultRate || 1).toFixed(2)} Bs
                        </div>
                      </div>
                      <div style={{ width: '120px' }}>
                        <input
                          type="number"
                          inputMode="decimal"
                          step="any"
                          value={rate}
                          onChange={e => {
                            setRate(e.target.value);
                            setIsManualTo(false);
                          }}
                          style={{
                            width: '100%',
                            boxSizing: 'border-box',
                            padding: '6px 10px',
                            borderRadius: '8px',
                            background: 'var(--bg-secondary)',
                            border: '1px solid rgba(17, 17, 17, 0.35)',
                            color: 'var(--gold-primary)',
                            fontSize: '13px',
                            fontWeight: '900',
                            textAlign: 'right',
                            outline: 'none'
                          }}
                        />
                      </div>
                    </div>
                  ) : (
                    <div style={{ 
                      padding: '10px 14px', 
                      borderRadius: '14px', 
                      background: 'rgba(255, 255, 255, 0.03)', 
                      border: '1px solid rgba(255, 255, 255, 0.08)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}>
                      <CheckCircle2 size={16} color="#32d74b" />
                      <span style={{ fontSize: '11.5px', color: 'rgba(255, 255, 255, 0.85)', fontWeight: '800' }}>
                        Transferencia 1:1 directa (misma divisa).
                      </span>
                    </div>
                  )}

                  {/* Destination Amount Input */}
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                      <label style={{ fontSize: '11px', fontWeight: '800', color: 'var(--text-secondary)' }}>
                        Monto a Recibir ({toInfo.usd ? '$ USD' : 'Bolívares Bs'})
                      </label>
                      {isManualTo && (
                        <button
                          type="button"
                          onClick={() => {
                            setIsManualTo(false);
                            setToAmount('');
                          }}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: 'var(--gold-primary)',
                            fontSize: '10px',
                            fontWeight: '850',
                            cursor: 'pointer',
                            padding: 0
                          }}
                        >
                          Restablecer sugerido
                        </button>
                      )}
                    </div>
                    <div style={{ position: 'relative' }}>
                      <input
                        type="number"
                        inputMode="decimal"
                        step="any"
                        placeholder="0.00"
                        value={isManualTo ? toAmount : (suggestedToAmount > 0 ? suggestedToAmount.toFixed(2) : '')}
                        onChange={e => {
                          setIsManualTo(true);
                          setToAmount(e.target.value);
                        }}
                        style={{
                          width: '100%',
                          boxSizing: 'border-box',
                          padding: '12px 50px 12px 14px',
                          borderRadius: '14px',
                          background: 'var(--bg-secondary)',
                          border: '1.5px solid rgba(48, 209, 88, 0.35)',
                          color: '#32d74b',
                          fontSize: '18px',
                          fontWeight: '900',
                          outline: 'none'
                        }}
                      />
                      <span style={{
                        position: 'absolute',
                        right: '14px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        fontSize: '13px',
                        fontWeight: '900',
                        color: toInfo.usd ? '#32d74b' : 'var(--gold-primary)'
                      }}>
                        {toInfo.usd ? '$' : 'Bs'}
                      </span>
                    </div>

                    {/* Summary Impact Pill */}
                    <div style={{ 
                      marginTop: '8px', 
                      padding: '8px 12px', 
                      borderRadius: '10px', 
                      background: 'rgba(255, 255, 255, 0.025)', 
                      border: '1px solid rgba(255, 255, 255, 0.06)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      fontSize: '11px'
                    }}>
                      <span style={{ color: 'var(--text-muted)' }}>Nuevo saldo {toInfo.shortLabel}:</span>
                      <span style={{ fontWeight: '900', color: '#fff' }}>
                        {formatMoney(toCurrentBal + effectiveToAmount)} {toInfo.usd ? '$' : 'Bs'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Clean Footer - Only 1 primary CTA button, no duplicate cancel */}
              <footer style={{ 
                padding: '14px clamp(16px, 2.5vw, 24px)', 
                borderTop: '1px solid rgba(255, 255, 255, 0.07)', 
                background: 'var(--bg-secondary)',
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'flex-end',
                flexShrink: 0
              }}>
                <button
                  type="submit"
                  disabled={!canSubmit}
                  className="btn-gold"
                  style={{
                    width: '100%',
                    padding: '13px 24px',
                    borderRadius: '14px',
                    fontWeight: '950',
                    fontSize: '14px',
                    letterSpacing: '0.3px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '10px',
                    cursor: canSubmit ? 'pointer' : 'not-allowed',
                    opacity: canSubmit ? 1 : 0.45,
                    boxShadow: canSubmit ? '0 4px 20px rgba(17, 17, 17, 0.25)' : 'none',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <RefreshCcw size={17} />
                  {loading ? 'Procesando...' : (sameCurrency ? 'Registrar Transferencia' : 'Registrar Conversión')}
                </button>
              </footer>
            </form>
          </div>
        </div>
      )}
    </AnimatedModal>
  );
}
