import React, { useEffect, useMemo, useState } from 'react';
import { User, ArrowLeft, Scissors, Coffee, Droplets, PenTool, Megaphone } from 'lucide-react';
import { dataService } from '../services/dataService';
import { isSupportStaff } from '../utils/staffRoles';
import BarberPanel from './BarberPanel';
import BaristaPanel from './BaristaPanel';
import SupportProfilePage from './SupportProfilePage';

const RECENTS_KEY = 'panda_recent_panels';
const MAX_RECENTS = 4;

const roleOf = staff => String(staff?.role || '').split('|')[0].toLowerCase();

const ROLE_META = {
  barista: { label: 'Barista', color: '#d99a5b', Icon: Coffee, filter: 'barista' },
  asistente: { label: 'Asistente dental', color: '#6fb8e0', Icon: Droplets, filter: 'asistente' },
  tatuador: { label: 'Especialista', color: '#b98ce0', Icon: PenTool, filter: 'tatuador' },
  support: { label: 'Personal de apoyo', color: '#e0a36f', Icon: Megaphone, filter: 'apoyo' },
  default: { label: 'Odontólogo', color: 'var(--gold-primary)', Icon: Scissors, filter: 'barbero' }
};

const metaFor = member => {
  const role = roleOf(member);
  if (role.includes('barista') || role.includes('cafeter')) return ROLE_META.barista;
  if (role.includes('asistente') || role.includes('lavado')) return ROLE_META.asistente;
  if (role.includes('tatuad')) return ROLE_META.tatuador;
  if (isSupportStaff(member)) return { ...ROLE_META.support, label: String(member.role || '').split('|')[0] || 'Personal de apoyo' };
  return { ...ROLE_META.default, label: String(member.role || 'Odontólogo').split('|')[0] };
};

const initials = name => String(name || '')
  .split(' ')
  .filter(Boolean)
  .slice(0, 2)
  .map(w => w[0])
  .join('')
  .toUpperCase();

const greeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return 'Buenos días';
  if (hour < 19) return 'Buenas tardes';
  return 'Buenas noches';
};

const readRecents = () => {
  try {
    return JSON.parse(localStorage.getItem(RECENTS_KEY) || '[]');
  } catch {
    return [];
  }
};

const pushRecent = id => {
  try {
    const current = readRecents().filter(existingId => existingId !== id);
    current.unshift(id);
    localStorage.setItem(RECENTS_KEY, JSON.stringify(current.slice(0, MAX_RECENTS)));
  } catch {
    // localStorage unavailable — recents are a nice-to-have, safe to skip
  }
};

export default function PanelsModule({ isMobile, rates }) {
  const [staff, setStaff] = useState([]);
  const [selected, setSelected] = useState(null);
  const [filter, setFilter] = useState('all');
  const [recentIds, setRecentIds] = useState(readRecents);

  useEffect(() => {
    let mounted = true;
    dataService.getStaff().then(rows => mounted && setStaff((rows || []).filter(s => {
      const role = roleOf(s);
      return !role.includes('admin') && !role.includes('recepcion') && !role.includes('caja');
    }))).catch(error => console.error('Error cargando paneles:', error));
    return () => { mounted = false; };
  }, []);

  const openPanel = member => {
    pushRecent(member.id);
    setRecentIds(readRecents());
    setSelected(member);
  };

  const availableFilters = useMemo(() => {
    const present = new Set(staff.map(member => metaFor(member).filter));
    return [
      { key: 'all', label: 'Todos' },
      present.has('barbero') && { key: 'barbero', label: 'Odontólogos' },
      present.has('asistente') && { key: 'asistente', label: 'Limpiezas' },
      present.has('tatuador') && { key: 'tatuador', label: 'Especialista' },
      present.has('barista') && { key: 'barista', label: 'Café de cortesía' },
      present.has('apoyo') && { key: 'apoyo', label: 'Apoyo' }
    ].filter(Boolean);
  }, [staff]);

  const visibleStaff = filter === 'all' ? staff : staff.filter(member => metaFor(member).filter === filter);

  const recentStaff = recentIds
    .map(id => staff.find(member => member.id === id))
    .filter(Boolean);

  if (selected) {
    const role = roleOf(selected);
    const isBarista = role.includes('barista') || role.includes('cafeter');
    const isSupport = isSupportStaff(selected);
    return (
      <section style={{ width: '100%' }}>
        <button type="button" onClick={() => setSelected(null)} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, marginBottom: 18, padding: '10px 14px', borderRadius: 12, border: '1px solid var(--border-color)', background: 'rgba(255,255,255,.04)', color: 'white', cursor: 'pointer', fontWeight: 800 }}>
          <ArrowLeft size={17} /> Volver a Paneles
        </button>
        {isSupport
          ? <SupportProfilePage key={selected.id} isMobile={isMobile} staffMember={selected} />
          : isBarista
            ? <BaristaPanel isMobile={isMobile} />
            : <BarberPanel key={selected.id} isMobile={isMobile} rates={rates} initialStaff={selected} />}
      </section>
    );
  }

  return (
    <section className="animate-fade-in panels-module" style={{ padding: isMobile ? '20px 16px 100px' : '30px 20px 100px' }}>
      <div style={{ maxWidth: 1080, margin: '0 auto' }}>
        <div className="panels-topbar" style={{ marginBottom: 24 }}>
          <p style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--gold-primary)', margin: '0 0 8px' }}>Paneles de trabajo</p>
          <h1 style={{ fontSize: 'clamp(22px, 5vw, 34px)', fontWeight: 800, letterSpacing: '-0.02em', margin: '0 0 6px' }}>{greeting()}. ¿A quién abrimos?</h1>
          <p style={{ fontSize: 14, color: 'var(--text-secondary)', margin: 0, maxWidth: '46ch' }}>Selecciona a alguien del equipo para abrir su panel de trabajo.</p>
        </div>

        {availableFilters.length > 1 && (
          <div className="panels-filters" style={{ display: 'flex', gap: 6, padding: 5, background: 'rgba(255,255,255,.03)', border: '1px solid var(--border-color)', borderRadius: 14, width: 'fit-content', marginBottom: 24, overflowX: 'auto', maxWidth: '100%' }}>
            {availableFilters.map(item => (
              <button
                key={item.key}
                type="button"
                onClick={() => setFilter(item.key)}
                style={{
                  border: 'none',
                  fontWeight: 700,
                  fontSize: 13,
                  padding: '9px 16px',
                  borderRadius: 10,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  background: filter === item.key ? 'var(--gold-gradient)' : 'transparent',
                  color: filter === item.key ? '#17140d' : 'var(--text-secondary)',
                  transition: 'background 0.25s cubic-bezier(0.4,0,0.2,1), color 0.25s'
                }}
              >
                {item.label}
              </button>
            ))}
          </div>
        )}

        {recentStaff.length > 0 && (
          <div style={{ marginBottom: 26 }}>
            <h2 style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)', margin: '0 0 12px' }}>Abierto hace un momento</h2>
            <div style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 4 }}>
              {recentStaff.map(member => {
                const meta = metaFor(member);
                return (
                  <button
                    key={member.id}
                    type="button"
                    onClick={() => openPanel(member)}
                    className="panel-recent-chip"
                    style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 10, padding: '8px 16px 8px 8px', background: 'rgba(255,255,255,.03)', border: '1px solid var(--border-color)', borderRadius: 999, cursor: 'pointer' }}
                  >
                    <span style={{ width: 30, height: 30, borderRadius: '50%', display: 'grid', placeItems: 'center', fontSize: 12, fontWeight: 800, color: '#17140d', background: meta.color, overflow: 'hidden', flexShrink: 0 }}>
                      {member.image_url ? <img src={member.image_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : initials(member.name)}
                    </span>
                    <span style={{ fontSize: 13, fontWeight: 700, color: 'white', whiteSpace: 'nowrap' }}>{member.name}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <div className="panels-grid">
          {visibleStaff.length === 0 ? (
            <div style={{ gridColumn: '1 / -1', padding: '48px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
              <User size={28} style={{ opacity: 0.3, marginBottom: 10 }} />
              <div>No hay personal en esta categoría.</div>
            </div>
          ) : visibleStaff.map((member, index) => {
            const meta = metaFor(member);
            const RoleIcon = meta.Icon;
            return (
              <button
                key={member.id}
                type="button"
                onClick={() => openPanel(member)}
                className="panel-tile"
                style={{ '--role-color': meta.color, animationDelay: `${index * 0.045}s` }}
                aria-label={`Abrir panel de ${member.name}`}
              >
                <span className="panel-tile-portrait">
                  {member.image_url
                    ? <img src={member.image_url} alt="" />
                    : <span className="panel-tile-initials">{initials(member.name)}</span>}
                </span>
                <span className="panel-tile-plate">
                  <strong>{member.name}</strong>
                  <span className="panel-role-pill"><RoleIcon size={11} /> {meta.label}</span>
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <style>{`
        .panels-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(190px, 1fr));
          gap: 18px;
        }
        @media (max-width: 640px) {
          .panels-grid { grid-template-columns: repeat(3, 1fr); gap: 10px; }
          .panel-tile { border-radius: 16px; aspect-ratio: 1 / 1.2; }
          .panel-tile-initials { font-size: 26px; }
          .panel-tile-plate { padding: 8px 8px 9px; gap: 2px; }
          .panel-tile-plate strong { font-size: 11px; line-height: 1.2; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
          .panel-role-pill { font-size: 8px; gap: 3px; }
          .panel-role-pill svg { width: 9px; height: 9px; }
        }
        @media (max-width: 380px) {
          .panels-grid { grid-template-columns: repeat(2, 1fr); gap: 10px; }
        }
        .panel-tile {
          position: relative;
          aspect-ratio: 3 / 4;
          border-radius: 22px;
          border: 1px solid var(--border-color);
          background: linear-gradient(155deg, #232327 0%, #131315 100%);
          overflow: hidden;
          cursor: pointer;
          padding: 0;
          transform: translateY(14px);
          opacity: 0;
          animation: panelTileRise 0.55s cubic-bezier(0.16,1,0.3,1) forwards;
          transition: transform 0.4s cubic-bezier(0.16,1,0.3,1), border-color 0.3s, box-shadow 0.4s;
          box-shadow: 0 10px 24px rgba(0,0,0,0.35);
        }
        .panel-tile:hover, .panel-tile:focus-visible {
          transform: translateY(-6px) scale(1.015);
          border-color: var(--role-color);
          box-shadow: 0 22px 44px rgba(0,0,0,0.5), 0 0 0 1px var(--role-color) inset;
        }
        .panel-tile:focus-visible { outline: 2px solid var(--gold-primary); outline-offset: 3px; }
        .panel-tile-portrait {
          position: absolute;
          inset: 0;
          display: grid;
          place-items: center;
          background:
            radial-gradient(120% 90% at 50% 0%, color-mix(in srgb, var(--role-color) 30%, transparent) 0%, transparent 62%),
            linear-gradient(155deg, #232327 0%, #131315 100%);
        }
        .panel-tile-portrait img { width: 100%; height: 100%; object-fit: cover; }
        .panel-tile-initials {
          font-size: 44px;
          font-weight: 800;
          letter-spacing: -0.02em;
          color: color-mix(in srgb, var(--role-color) 82%, white 18%);
          opacity: 0.9;
          transition: transform 0.4s cubic-bezier(0.16,1,0.3,1);
        }
        .panel-tile:hover .panel-tile-initials { transform: scale(1.06); }
        .panel-tile-plate {
          position: absolute;
          left: 0; right: 0; bottom: 0;
          padding: 16px 14px 14px;
          text-align: left;
          display: flex;
          flex-direction: column;
          gap: 5px;
          background: linear-gradient(to top, rgba(6,6,7,0.92) 10%, rgba(6,6,7,0.55) 60%, transparent 100%);
        }
        .panel-tile-plate strong { font-size: 15px; font-weight: 700; color: white; letter-spacing: -0.01em; }
        .panel-role-pill { display: inline-flex; align-items: center; gap: 5px; font-size: 10px; font-weight: 700; letter-spacing: 0.05em; text-transform: uppercase; color: var(--role-color); }
        .panel-recent-chip { transition: border-color 0.2s, transform 0.2s; }
        .panel-recent-chip:hover { border-color: var(--gold-primary); transform: translateY(-1px); }
        @keyframes panelTileRise { to { transform: translateY(0); opacity: 1; } }
        @media (prefers-reduced-motion: reduce) {
          .panel-tile { animation: none; opacity: 1; transform: none; }
          .panel-tile, .panel-tile-initials, .panel-recent-chip { transition: none; }
        }
      `}</style>
    </section>
  );
}
