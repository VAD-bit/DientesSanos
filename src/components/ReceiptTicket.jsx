import React from 'react';
import pandaLogo from '../assets/panda_logo_black.png';

const ReceiptTicket = ({ transaction }) => {
  if (!transaction) return null;

  const {
    orderNumber, currency = 'usd', rate = 1,
    client, staff, items, subtotal, discount, total,
    paymentMethodLabel, reference, generated_at, preview
  } = transaction;

  // Formatea un monto (en USD) según la moneda del recibo: $ si se pagó en dólares,
  // Bs si en bolívares, ambas si el pago fue mixto.
  const fmtMoney = (usd) => {
    const n = Number(usd) || 0;
    const usdStr = `$${n.toFixed(2)}`;
    const bsStr = `${(n * Number(rate || 1)).toLocaleString('es-VE', { minimumFractionDigits: 0, maximumFractionDigits: 2 })} Bs`;
    if (currency === 'bs') return bsStr;
    if (currency === 'both') return `${usdStr} / ${bsStr}`;
    return usdStr;
  };

  const fecha = new Date(generated_at || Date.now()).toLocaleString('es-VE', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true
  });

  return (
    <div className="receipt-ticket" style={preview ? { display: 'block', margin: '0 auto', borderRadius: '4px' } : undefined}>
      {preview && <p style={{ textAlign: 'center', fontWeight: 'bold', fontSize: '11px', letterSpacing: '2px', margin: '0 0 8px', color: '#b00' }}>— VISTA PREVIA —</p>}
      {/* HEADER */}
      <div className="receipt-header">
        <img src={pandaLogo} alt="Dientes Sanos" className="receipt-logo" />
        {orderNumber != null && (
          <p className="receipt-order">Orden #{String(orderNumber).padStart(4, '0')}</p>
        )}
        <h2 className="receipt-title">DIENTES SANOS</h2>
        <div className="receipt-divider">================================</div>
      </div>

      {/* INFO */}
      <div className="receipt-info">
        <p><strong>Fecha:</strong> {fecha}</p>
        {client?.name && <p><strong>Cliente:</strong> {client.name}</p>}
        {staff?.name && <p><strong>Atendido por:</strong> {staff.name}</p>}
        <div className="receipt-divider">--------------------------------</div>
      </div>

      {/* ITEMS */}
      <div className="receipt-items">
        {items && items.map((item, index) => (
          <div className="receipt-row" key={index}>
            <span>{item.quantity || 1}x {item.name}</span>
            <span>{fmtMoney((Number(item.price) || 0) * (Number(item.quantity) || 1))}</span>
          </div>
        ))}
        <div className="receipt-divider">--------------------------------</div>
      </div>

      {/* TOTALS */}
      <div className="receipt-totals">
        <div className="receipt-row">
          <span>Sub total:</span>
          <span>{fmtMoney(subtotal || 0)}</span>
        </div>
        <div className="receipt-row">
          <span>Descuento:</span>
          <span>{fmtMoney(discount || 0)}</span>
        </div>
        <div className="receipt-row receipt-grand-total">
          <span>Total:</span>
          <span>{fmtMoney(total || 0)}</span>
        </div>
        <div className="receipt-divider">--------------------------------</div>
      </div>

      {/* PAYMENT */}
      <div className="receipt-payments">
        {paymentMethodLabel && <p><strong>Método de pago:</strong> {paymentMethodLabel}</p>}
        {reference && <p><strong>Ref:</strong> {reference}</p>}
      </div>

      {/* FOOTER */}
      <div className="receipt-footer">
        <div className="receipt-divider">================================</div>
        <p className="receipt-thanks">Gracias por tu visita te espero pronto que Dios te lleve con bien 🙏🏻</p>
        {/* TODO(contacto): pendiente datos del cliente */}
        <p className="receipt-contact"><a href="#">Por confirmar</a></p>
      </div>
    </div>
  );
};

export default ReceiptTicket;
