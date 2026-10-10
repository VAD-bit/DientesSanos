import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Beer, BellRing, Check, CheckCircle2, Clock3, Coffee, GlassWater, RefreshCw, UserRound } from 'lucide-react';
import { dataService } from '../services/dataService';
import { notificationService } from '../services/notificationService';
import { formatName, formatProductName, formatServiceName } from '../utils/stringUtils';
import { SkeletonList } from './Skeleton';

const beverageIcon = (name, size = 22) => {
  const value = String(name || '').toLowerCase();
  if (value.includes('caf')) return <Coffee size={size} />;
  if (value.includes('cerveza')) return <Beer size={size} />;
  return <GlassWater size={size} />;
};

const formatTime = value => value
  ? new Date(value).toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit', hour12: true })
  : 'Sin hora';

const todayKey = () => `panda_barista_served_${new Date().toISOString().slice(0, 10)}`;

const loadServed = () => {
  try {
    return new Set(JSON.parse(localStorage.getItem(todayKey()) || '[]'));
  } catch {
    return new Set();
  }
};

export default function BaristaPanel({ isMobile }) {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [servedIds, setServedIds] = useState(loadServed);
  const [freshIds, setFreshIds] = useState(new Set());
  const knownRequests = useRef(new Set());
  const initialized = useRef(false);
  const freshTimers = useRef({});

  const loadRequests = useCallback(async ({ notifyNew = false } = {}) => {
    try {
      const today = await dataService.getTodayAppointments();
      const requests = (today || [])
        .filter(app => app.beverage_selection && !['Cancelado', 'No Asistió'].includes(app.status))
        .sort((a, b) => new Date(a.scheduled_at || a.created_at) - new Date(b.scheduled_at || b.created_at));

      if (initialized.current) {
        const arrivals = requests.filter(app => !knownRequests.current.has(String(app.id)));
        if (arrivals.length) {
          setFreshIds(current => {
            const next = new Set(current);
            arrivals.forEach(app => next.add(String(app.id)));
            return next;
          });
          arrivals.forEach(app => {
            clearTimeout(freshTimers.current[app.id]);
            freshTimers.current[app.id] = setTimeout(() => {
              setFreshIds(current => {
                const next = new Set(current);
                next.delete(String(app.id));
                return next;
              });
            }, 5000);
          });
          if (notifyNew) {
            arrivals.forEach(app => {
              notificationService.sendNotification('Nueva bebida solicitada', `${formatName(app.clients?.name) || 'Cliente'} quiere ${formatProductName(app.beverage_selection) || app.beverage_selection}`);
            });
          }
        }
      }
      knownRequests.current = new Set(requests.map(app => String(app.id)));
      initialized.current = true;
      setAppointments(requests);
    } catch (error) {
      console.error('Error loading barista requests:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const initialLoad = window.setTimeout(() => loadRequests(), 0);
    const channel = dataService.supabase
      .channel('panda-barista-requests')
      .on('postgres_changes', { event: '*', schema: 'odontosonrisa', table: 'appointments' }, () => loadRequests({ notifyNew: true }))
      .subscribe();
    const timers = freshTimers.current;
    return () => {
      window.clearTimeout(initialLoad);
      dataService.supabase.removeChannel(channel);
      Object.values(timers).forEach(clearTimeout);
    };
  }, [loadRequests]);

  const toggleServed = useCallback((id) => {
    setServedIds(current => {
      const next = new Set(current);
      if (next.has(String(id))) next.delete(String(id));
      else next.add(String(id));
      try { localStorage.setItem(todayKey(), JSON.stringify([...next])); } catch { /* storage unavailable */ }
      return next;
    });
  }, []);

  const pending = useMemo(() => appointments.filter(app => ['Agendado', 'Confirmado', 'En Espera', 'En Silla'].includes(app.status)), [appointments]);
  const active = pending.filter(app => app.status === 'En Silla');
  const upcoming = pending.filter(app => app.status !== 'En Silla');
  const sortByServed = list => [...list].sort((a, b) => Number(servedIds.has(String(a.id))) - Number(servedIds.has(String(b.id))));

  const renderCard = (app) => {
    const urgent = app.status === 'En Silla';
    const served = servedIds.has(String(app.id));
    const fresh = freshIds.has(String(app.id));
    return (
      <article
        key={app.id}
        className={fresh ? 'barista-card-fresh' : ''}
        style={{
          display: 'grid',
          gridTemplateColumns: 'auto minmax(0, 1fr) auto',
          gap: '13px',
          alignItems: 'center',
          padding: '14px',
          borderRadius: '16px',
          border: `1px solid ${served ? 'rgba(255,255,255,.08)' : urgent ? 'rgba(48,209,88,.35)' : 'rgba(17, 17, 17,.16)'}`,
          background: served ? 'rgba(255,255,255,.015)' : urgent ? 'rgba(48,209,88,.06)' : 'rgba(255,255,255,.025)',
          opacity: served ? 0.5 : 1,
          transition: 'opacity 0.25s ease, border-color 0.25s ease, background 0.25s ease'
        }}
      >
        <div style={{ width: '46px', height: '46px', borderRadius: '14px', display: 'grid', placeItems: 'center', color: served ? 'var(--text-muted)' : urgent ? '#30d158' : 'var(--gold-primary)', background: served ? 'rgba(255,255,255,.05)' : urgent ? 'rgba(48,209,88,.12)' : 'rgba(17, 17, 17,.1)' }}>
          {beverageIcon(app.beverage_selection)}
        </div>
        <div style={{ minWidth: 0 }}>
          <strong style={{ display: 'block', color: 'white', fontSize: '14px', textDecoration: served ? 'line-through' : 'none' }}>{formatProductName(app.beverage_selection) || app.beverage_selection}</strong>
          <span style={{ display: 'flex', alignItems: 'center', gap: '5px', marginTop: '4px', color: 'var(--text-secondary)', fontSize: '12px' }}>
            <UserRound size={13} /> {formatName(app.clients?.name) || 'Cliente'} • {formatServiceName(app.services?.name) || app.services?.name || 'Servicio'}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ textAlign: 'right' }}>
            <strong style={{ display: 'block', color: urgent && !served ? '#30d158' : 'white', fontSize: '12px' }}>{formatTime(app.scheduled_at)}</strong>
            <span style={{ display: 'inline-block', marginTop: '5px', padding: '4px 7px', borderRadius: '999px', color: served ? 'var(--text-muted)' : urgent ? '#30d158' : 'var(--gold-primary)', background: served ? 'rgba(255,255,255,.06)' : urgent ? 'rgba(48,209,88,.1)' : 'rgba(17, 17, 17,.1)', fontSize: '8px', fontWeight: 900 }}>
              {served ? 'SERVIDO' : urgent ? 'PREPARAR AHORA' : app.status?.toUpperCase()}
            </span>
          </div>
          <button
            type="button"
            onClick={() => toggleServed(app.id)}
            aria-label={served ? 'Marcar como pendiente' : 'Marcar como servido'}
            style={{
              width: '34px',
              height: '34px',
              flexShrink: 0,
              borderRadius: '10px',
              display: 'grid',
              placeItems: 'center',
              cursor: 'pointer',
              border: served ? '1px solid rgba(48,209,88,.5)' : '1px solid rgba(255,255,255,.14)',
              background: served ? 'rgba(48,209,88,.18)' : 'rgba(255,255,255,.04)',
              color: served ? '#30d158' : 'var(--text-muted)',
              transition: 'all 0.2s ease'
            }}
          >
            <Check size={16} />
          </button>
        </div>
      </article>
    );
  };

  return <section style={{ width: '100%', maxWidth: '1180px', margin: '0 auto', paddingBottom: isMobile ? '100px' : '30px' }}>    <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px', marginBottom: '22px' }}>
      <div><div style={{ display: 'flex', alignItems: 'center', gap: '9px', color: 'var(--gold-primary)', fontSize: '11px', fontWeight: 900, letterSpacing: '1px' }}><Coffee size={17} /> CAFÉ DE CORTESÍA</div><h1 style={{ margin: '7px 0 4px', fontSize: isMobile ? '28px' : '36px', lineHeight: 1 }}>Panel de Barista</h1><p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '13px' }}>Solicitudes de bebidas de los clientes de hoy.</p></div>
      <button type="button" onClick={() => loadRequests()} aria-label="Actualizar solicitudes" style={{ width: '44px', height: '44px', borderRadius: '13px', display: 'grid', placeItems: 'center', color: 'white', background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.1)', cursor: 'pointer' }}><RefreshCw size={18} className={loading ? 'animate-spin' : ''} /></button>
    </header>
    <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'minmax(0, 1fr) minmax(0, 1fr)' : 'repeat(3, minmax(0, 1fr))', gap: '12px', marginBottom: '20px' }}>
      {[{ label: 'Solicitudes de hoy', value: appointments.length, icon: <BellRing size={19} />, color: '#111111' }, { label: 'Pendientes', value: pending.length - servedIds.size, icon: <Clock3 size={19} />, color: '#ff9f0a' }, { label: 'Pacientes en sillón', value: active.length, icon: <CheckCircle2 size={19} />, color: '#30d158' }].map(({ label, value, icon, color }, index) => <article key={label} className="glass-card" style={{ padding: isMobile ? '15px' : '20px', borderRadius: '18px', gridColumn: isMobile && index === 2 ? '1 / -1' : 'auto' }}><span style={{ color }}>{icon}</span><strong style={{ display: 'block', marginTop: '9px', fontSize: '25px', color }}>{Math.max(0, value)}</strong><span style={{ color: 'var(--text-muted)', fontSize: '11px', fontWeight: 800 }}>{label}</span></article>)}
    </div>
    {loading ? <div className="glass-card" style={{ borderRadius: '22px', padding: isMobile ? '14px' : '22px' }}><SkeletonList rows={3} rowHeight={64} /></div> : appointments.length === 0 ? <div className="glass-card" style={{ borderRadius: '22px', padding: isMobile ? '14px' : '22px' }}><div style={{ padding: '48px 16px', textAlign: 'center', color: 'var(--text-muted)' }}><Coffee size={32} style={{ margin: '0 auto 12px' }} /><strong style={{ display: 'block', color: 'white', marginBottom: '5px' }}>No hay bebidas solicitadas hoy</strong>Las nuevas reservas aparecerán aquí automáticamente.</div></div> : <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
      {active.length > 0 && <div className="glass-card" style={{ borderRadius: '22px', padding: isMobile ? '14px' : '22px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '15px' }}>
          <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#30d158', boxShadow: '0 0 8px #30d158' }} />
          <h2 style={{ margin: 0, fontSize: '13px', fontWeight: 900, letterSpacing: '0.6px', color: '#30d158' }}>AHORA · EN SILLA</h2>
        </div>
        <div style={{ display: 'grid', gap: '10px' }}>{sortByServed(active).map(renderCard)}</div>
      </div>}
      {upcoming.length > 0 && <div className="glass-card" style={{ borderRadius: '22px', padding: isMobile ? '14px' : '22px' }}>
        <h2 style={{ margin: '0 0 15px', fontSize: '13px', fontWeight: 900, letterSpacing: '0.6px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Próximas</h2>
        <div style={{ display: 'grid', gap: '10px' }}>{sortByServed(upcoming).map(renderCard)}</div>
      </div>}
    </div>}
    <style>{`
      @keyframes baristaFreshPulse {
        0% { box-shadow: 0 0 0 0 rgba(17, 17, 17,.55); }
        70% { box-shadow: 0 0 0 14px rgba(17, 17, 17,0); }
        100% { box-shadow: 0 0 0 0 rgba(17, 17, 17,0); }
      }
      .barista-card-fresh {
        animation: baristaFreshPulse 1.4s ease-out 2;
      }
    `}</style>
  </section>;
}
