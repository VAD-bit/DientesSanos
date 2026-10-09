export const VALE_METHOD_CONFIG = [
  { name: 'Efectivo ($)', key: 'cash_usd', currency: 'USD' }, { name: 'Zelle', key: 'zelle', currency: 'USD' },
  { name: 'Zinli', key: 'zinli', currency: 'USD' }, { name: 'Binance / USDT', key: 'binance', currency: 'USD' },
  { name: 'Pago Móvil', key: 'pago_movil', currency: 'Bs' }, { name: 'Punto de venta', key: 'punto_venta', currency: 'Bs' },
  { name: 'Efectivo (Bs)', key: 'cash_bs', currency: 'Bs' }
];
export const valeTotals = (modal, rate) => {
  if (modal.paymentMethod === 'Mixto') {
    const distribution = VALE_METHOD_CONFIG.map(method => ({ ...method, amount: Math.max(0, Number(modal.allocations?.[method.name]) || 0) })).filter(item => item.amount > 0);
    return { distribution, amountBs: distribution.reduce((sum, item) => sum + item.amount * (item.currency === 'USD' ? rate : 1), 0) };
  }
  const method = VALE_METHOD_CONFIG.find(item => item.name === modal.paymentMethod) || VALE_METHOD_CONFIG[0];
  const amount = Math.max(0, Number(modal.amountBs) || 0);
  return { distribution: [{ ...method, amount }], amountBs: amount * (method.currency === 'USD' ? rate : 1) };
};
