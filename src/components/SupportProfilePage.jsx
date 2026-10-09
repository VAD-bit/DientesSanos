import React, { useEffect, useMemo, useState } from 'react';
import {
  Shield,
  Smartphone,
  Tag,
  Wallet,
  History,
  Package,
  CalendarClock,
  TrendingUp,
} from 'lucide-react';
import { dataService } from '../services/dataService';
import { useNotifs } from '../context/NotificationContext';
import PasskeySettings from './PasskeySettings';
import { SkeletonGrid } from './Skeleton';

const asArray = (value) => (Array.isArray(value) ? value : []);
const fmtBs = (value) =>
  Number(value || 0).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtUsd = (value) => `$${Number(value || 0).toFixed(2)}`;

const monthStart = () => {
  const date = new Date();
  date.setDate(1);
  date.setHours(0, 0, 0, 0);
  return date;
};

const monthLabel = () =>
  new Date().toLocaleDateString('es-VE', { month: 'long', year: 'numeric' });

/**
 * Perfil para personal de apoyo (Editor, Marketing, etc.): no atiende clientes, así que
 * en vez del panel de "sillón" ve su salario mensual asignado, cuánto le han pagado este
 * mes, el historial de pagos y su consumo de productos.
 */
const SupportProfilePage = ({ staffMember, isMobile }) => {
  const { showToast } = useNotifs();
  const [settlement, setSettlement] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => {
    let mounted = true;
    if (!staffMember?.id) return undefined;
    setLoading(true);
    dataService
      .getStaffSettlement(staffMember.id)
      .then((data) => mounted && setSettlement(data))
      .catch((error) => {
        console.error('Error cargando perfil de apoyo:', error);
        if (mounted) showToast('No se pudo cargar tu historial de pagos', 'error');
      })
      .finally(() => mounted && setLoading(false));
    return () => {
      mounted = false;
    };
  }, [staffMember?.id]);

  const roleRaw = staffMember?.role || 'Personal de apoyo';
  const roleName = roleRaw.includes('|') ? roleRaw.split('|')[0] : roleRaw;
  const rate = Number(settlement?.rate || 0);
  const monthlySalaryUsd = Number(staffMember?.monthly_salary || 0);

  const history = asArray(settlement?.paymentHistory);

  const { paidMonthBs, paidMonthUsd, consumoMonthBs } = useMemo(() => {
    const start = monthStart();
    let paidBs = 0;
    let consumo = 0;
    history.forEach((item) => {
      const when = new Date(item.date);
      if (when < start) return;
      if (item.type === 'Pago' || item.type === 'Abono') paidBs += Number(item.amountBs || 0);
      if (item.type === 'Consumo') consumo += Number(item.amountBs || 0);
    });
    return {
      paidMonthBs: paidBs,
      paidMonthUsd: rate > 0 ? paidBs / rate : 0,
      consumoMonthBs: consumo,
    };
  }, [history, rate]);

  const salaryPct = monthlySalaryUsd > 0 ? Math.min(100, Math.round((paidMonthUsd / monthlySalaryUsd) * 100)) : 0;
  const pendingSalaryUsd = Math.max(0, monthlySalaryUsd - paidMonthUsd);
  const consumoTotalBs = Number(settlement?.consumptionsBs || 0);

  const initial = staffMember?.name ? staffMember.name.charAt(0).toUpperCase() : 'V';

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 18, maxWidth: 920, margin: '0 auto', width: '100%', padding: isMobile ? '4px 0 90px' : '8px 0 40px' }}>
      {/* Header */}
      <div className="glass-card" style={{ borderRadius: 24, padding: isMobile ? 20 : 26, border: '1px solid rgba(255,255,255,0.07)' }}>
        <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', alignItems: 'center', gap: isMobile ? 14 : 22, textAlign: isMobile ? 'center' : 'left' }}>
          <div style={{ position: 'relative', flexShrink: 0 }}>
            <div style={{ width: 84, height: 84, borderRadius: '50%', overflow: 'hidden', display: 'grid', placeItems: 'center', background: 'var(--bg-secondary)', border: '2px solid rgba(17, 17, 17,.4)' }}>
              {staffMember?.image_url ? (
                <img src={staffMember.image_url} alt={staffMember.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <span style={{ fontSize: 38, fontWeight: 950, color: 'white', fontFamily: 'Outfit, var(--font-sans), system-ui' }}>{initial}</span>
              )}
            </div>
            <span style={{ position: 'absolute', bottom: 4, right: 4, width: 16, height: 16, borderRadius: '50%', background: '#30d158', border: '3px solid #161616' }} />
          </div>
          <div style={{ flex: 1 }}>
            <h2 style={{ fontSize: isMobile ? 26 : 30, fontWeight: 950, color: 'white', letterSpacing: '-0.6px', margin: '0 0 8px', fontFamily: 'Outfit, var(--font-sans), system-ui' }}>{staffMember?.name}</h2>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: isMobile ? 'center' : 'flex-start', alignItems: 'center' }}>
              <span style={{ fontSize: 11, fontWeight: 900, color: '#121212', background: 'var(--gold-primary)', padding: '5px 12px', borderRadius: 20, textTransform: 'uppercase', letterSpacing: 1, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <Shield size={12} /> {roleName}
              </span>
              {staffMember?.id_card && (
                <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', fontWeight: 700, background: 'rgba(255,255,255,0.05)', padding: '4px 10px', borderRadius: 8, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  <Tag size={10} /> ID: {staffMember.id_card}
                </span>
              )}
              {staffMember?.phone && (
                <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', fontWeight: 700, background: 'rgba(255,255,255,0.05)', padding: '4px 10px', borderRadius: 8, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  <Smartphone size={10} /> {staffMember.phone}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Salario mensual */}
      {loading ? (
        <SkeletonGrid items={3} itemHeight={110} minWidth={200} />
      ) : (
        <>
          <div className="glass-card" style={{ padding: isMobile ? 20 : 24, borderRadius: 22, border: '1px solid rgba(17, 17, 17,.2)', background: 'linear-gradient(135deg, rgba(17, 17, 17,.1), rgba(255,255,255,.02))' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
              <div>
                <span style={{ color: 'var(--gold-primary)', fontSize: 11, fontWeight: 900, letterSpacing: 0.8, textTransform: 'uppercase' }}>Salario mensual asignado</span>
                <h3 style={{ margin: '6px 0 2px', fontSize: isMobile ? 30 : 36, color: 'white', fontFamily: 'Outfit, var(--font-sans), system-ui', fontWeight: 950 }}>{fmtUsd(monthlySalaryUsd)}</h3>
                <span style={{ color: 'var(--text-secondary)', fontSize: 12, textTransform: 'capitalize' }}>{monthLabel()}</span>
              </div>
              <div style={{ width: 46, height: 46, borderRadius: 14, background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
                <Wallet size={20} color="var(--gold-primary)" />
              </div>
            </div>

            {monthlySalaryUsd > 0 ? (
              <div style={{ marginTop: 18 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 6 }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Pagado este mes: <strong style={{ color: '#30d158' }}>{fmtUsd(paidMonthUsd)}</strong></span>
                  <span style={{ color: 'var(--text-secondary)' }}>Pendiente: <strong style={{ color: pendingSalaryUsd > 0.01 ? '#ff9f0a' : '#30d158' }}>{fmtUsd(pendingSalaryUsd)}</strong></span>
                </div>
                <div style={{ height: 10, borderRadius: 999, background: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
                  <div style={{ width: `${salaryPct}%`, height: '100%', borderRadius: 999, background: salaryPct >= 100 ? '#30d158' : 'var(--gold-gradient, linear-gradient(90deg,#111111,#e8cfa0))', transition: 'width .5s ease' }} />
                </div>
                <div style={{ marginTop: 6, fontSize: 11, color: 'var(--text-muted)' }}>{salaryPct}% del salario cubierto · {fmtBs(paidMonthBs)} Bs pagados este mes</div>
              </div>
            ) : (
              <div style={{ marginTop: 14, fontSize: 12, color: 'var(--text-muted)' }}>
                Aún no tienes un salario mensual asignado. El administrador puede configurarlo desde Finanzas.
              </div>
            )}
          </div>

          {/* KPIs rápidos */}
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(3, 1fr)', gap: 12 }}>
            <div className="glass-card" style={{ padding: 18, borderRadius: 18, textAlign: isMobile ? 'center' : 'left' }}>
              <div style={{ display: 'inline-flex', width: 40, height: 40, borderRadius: 12, background: 'rgba(48,209,88,.12)', alignItems: 'center', justifyContent: 'center', marginBottom: 10 }}>
                <TrendingUp size={18} color="#30d158" />
              </div>
              <div style={{ color: 'white', fontSize: 22, fontWeight: 900 }}>{fmtUsd(paidMonthUsd)}</div>
              <div style={{ color: 'var(--text-muted)', fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 4 }}>Pagado este mes</div>
            </div>
            <div className="glass-card" style={{ padding: 18, borderRadius: 18, textAlign: isMobile ? 'center' : 'left' }}>
              <div style={{ display: 'inline-flex', width: 40, height: 40, borderRadius: 12, background: 'rgba(255,159,10,.12)', alignItems: 'center', justifyContent: 'center', marginBottom: 10 }}>
                <Package size={18} color="#ff9f0a" />
              </div>
              <div style={{ color: 'white', fontSize: 22, fontWeight: 900 }}>{fmtBs(consumoMonthBs)} <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Bs</span></div>
              <div style={{ color: 'var(--text-muted)', fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 4 }}>Consumo este mes</div>
            </div>
            <div className="glass-card" style={{ padding: 18, borderRadius: 18, textAlign: isMobile ? 'center' : 'left', gridColumn: isMobile ? '1 / -1' : 'auto' }}>
              <div style={{ display: 'inline-flex', width: 40, height: 40, borderRadius: 12, background: 'rgba(17, 17, 17,.14)', alignItems: 'center', justifyContent: 'center', marginBottom: 10 }}>
                <CalendarClock size={18} color="var(--gold-primary)" />
              </div>
              <div style={{ color: 'white', fontSize: 22, fontWeight: 900 }}>{fmtBs(consumoTotalBs)} <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Bs</span></div>
              <div style={{ color: 'var(--text-muted)', fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 4 }}>Consumo acumulado</div>
            </div>
          </div>

          {/* Historial de pagos y consumo */}
          <div className="glass-card" style={{ padding: isMobile ? 18 : 20, borderRadius: 20, border: '1px solid rgba(255,255,255,.06)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
              <div>
                <span style={{ color: 'var(--gold-primary)', fontSize: 11, fontWeight: 900, letterSpacing: 0.8, textTransform: 'uppercase' }}>Historial</span>
                <h3 style={{ margin: '6px 0 3px', fontSize: isMobile ? 20 : 24, color: 'white' }}>Pagos y consumo</h3>
                <span style={{ color: 'var(--text-secondary)', fontSize: 12 }}>Cada pago de nómina, abono y producto consumido.</span>
              </div>
              <button type="button" onClick={() => setShowHistory((v) => !v)} className="btn-gold" style={{ padding: '11px 16px', borderRadius: 12, display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                <History size={16} /> {showHistory ? 'Ocultar' : 'Ver historial'}
              </button>
            </div>

            {showHistory && (
              <div className="animate-fade-in" style={{ marginTop: 16, paddingTop: 14, borderTop: '1px solid rgba(255,255,255,.08)', display: 'grid', gap: 8 }}>
                {history.length === 0 ? (
                  <div style={{ padding: 18, textAlign: 'center', color: 'var(--text-muted)', fontSize: 12 }}>Aún no hay pagos ni consumo registrados.</div>
                ) : (
                  history.map((item) => {
                    const isDebit = item.type === 'Consumo' || item.type === 'Adelanto';
                    return (
                      <div key={item.id} style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr auto' : '110px 1fr 140px auto', gap: 10, alignItems: 'center', padding: isMobile ? 12 : '11px 12px', borderRadius: 12, background: 'rgba(255,255,255,.035)' }}>
                        <div>
                          <span style={{ display: 'block', color: 'var(--text-muted)', fontSize: 11 }}>{new Date(item.date).toLocaleDateString('es-VE')}</span>
                          {isMobile && <span style={{ display: 'block', marginTop: 3, color: 'var(--text-secondary)', fontSize: 10 }}>{item.paymentMethod}</span>}
                        </div>
                        {isMobile ? (
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 5 }}>
                            <strong style={{ color: isDebit ? '#ff9f0a' : '#30d158', fontSize: 11 }}>{item.type}</strong>
                            {item.type === 'Consumo' && item.items?.length > 0 && (
                              <span style={{ maxWidth: 160, color: 'var(--text-secondary)', fontSize: 9, textAlign: 'right' }}>{item.items.map((p) => `${p.quantity}x ${p.name}`).join(', ')}</span>
                            )}
                            <strong style={{ color: isDebit ? '#ff9f0a' : 'white', fontSize: 14 }}>{isDebit ? '-' : '+'}{fmtBs(item.amountBs)} Bs</strong>
                          </div>
                        ) : (
                          <>
                            <div>
                              <strong style={{ display: 'block', color: isDebit ? '#ff9f0a' : '#30d158', fontSize: 12 }}>{item.type}</strong>
                              {item.type === 'Consumo' && item.items?.length > 0 && (
                                <span style={{ color: 'var(--text-secondary)', fontSize: 10 }}>{item.items.map((p) => `${p.quantity}x ${p.name}`).join(', ')}</span>
                              )}
                            </div>
                            <span style={{ color: 'var(--text-secondary)', fontSize: 11 }}>{item.paymentMethod}</span>
                            <strong style={{ textAlign: 'right', color: isDebit ? '#ff9f0a' : 'white' }}>{isDebit ? '-' : '+'}{fmtBs(item.amountBs)} Bs</strong>
                          </>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>
        </>
      )}

      {/* Seguridad / contraseña */}
      <PasskeySettings showToast={showToast} />
    </div>
  );
};

export default SupportProfilePage;
