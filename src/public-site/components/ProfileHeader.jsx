import { useState, useRef } from 'react';
import { Phone, Mail, Crown } from 'lucide-react';
import pandaLogo from '../../assets/panda_logo_nobg.png';

export default function ProfileHeader({ client, points, isTopClient, className = '' }) {
  const handleMouseLeave = () => {
    setTiltStyle({ transform: 'rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)' });
    setGlareStyle({ opacity: 0 });
  };

  const RANKS = [
    { min: 300, label: 'Oro' },
    { min: 200, label: 'Plata' },
    { min: 100, label: 'Bronce' },
    { min: 0, label: 'Básico' },
  ];
  const getRank = (points) => RANKS.find(r => points >= r.min)?.label || 'Básico';
  const rank = getRank(points);
  
  const initials = client?.name?.trim()
    ? client.name.trim().split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase()
    : 'AR';
  
  const clientId = client?.id_card ? `PB-${client.id_card}` : 'PB-0005687';

  return (
    <div className={`new-dashboard-header ${className}`}>
      
      {/* ── IZQUIERDA: Info de Usuario ── */}
      <div className="header-left">
        <div className="header-avatar">
          {client?.image_url ? (
            <img src={client.image_url} alt={client?.name} />
          ) : (
            <span>{initials}</span>
          )}
        </div>
        
        <div className="header-user-info">
          <h1 className="header-name">{client?.name || 'Cliente'}</h1>
          
          <div className="header-badges">
            <span className="badge-rank">{rank.toUpperCase()}</span>
            {isTopClient && (
              <span className="badge-member">
                <Crown size={12} color="var(--champagne)" /> MIEMBRO CLUB
              </span>
            )}
          </div>
          
          <div className="header-contact">
            {/* TODO(contacto): pendiente datos del cliente */}
            <span className="contact-item"><Phone size={14} /> {client?.phone || 'Por confirmar'}</span>
            <span className="contact-item"><Mail size={14} /> {client?.email || 'Por confirmar'}</span>
          </div>
        </div>


      </div>

      <style>{`
        /* =========================================
           CSS PARA ENCABEZADO NUEVO DASHBOARD
           ========================================= */

        .new-dashboard-header {
          display: flex;
          flex-direction: column;
          gap: 24px;
          margin-bottom: 32px;
        }
        @media (min-width: 1000px) {
          .new-dashboard-header {
            flex-direction: row;
            justify-content: space-between;
            align-items: stretch;
          }
        }
        
        .new-dashboard-header.desktop-only { display: none; }
        @media (min-width: 900px) {
          .new-dashboard-header.desktop-only { display: flex; }
          .new-dashboard-header.mobile-only { display: none !important; }
        }

        /* -- Lado Izquierdo -- */
        .header-left {
          display: flex;
          align-items: center;
          gap: 16px;
          flex: 1;
          min-width: 0;
        }

        .header-avatar {
          width: 60px;
          height: 60px;
          border-radius: 50%;
          background: var(--gold-gradient);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          box-shadow: 0 4px 15px rgba(17,17,17,0.15);
        }
        .header-avatar img {
          width: 100%;
          height: 100%;
          border-radius: 50%;
          object-fit: cover;
        }
        .header-avatar span {
          font-size: 20px;
          font-weight: 800;
          color: #000;
          font-family: 'General Sans';
        }

        .header-user-info {
          display: flex;
          flex-direction: column;
          gap: 6px;
          min-width: 0;
        }

        .header-name {
          font-size: 20px;
          font-weight: 800;
          color: white;
          margin: 0;
          font-family: 'General Sans';
          letter-spacing: -0.5px;
          white-space: normal;
          word-break: break-word;
          line-height: 1.1;
        }

        .header-badges {
          display: flex;
          align-items: center;
          gap: 10px;
          flex-wrap: wrap;
        }
        .badge-rank {
          background: var(--gold-gradient);
          color: #000;
          font-size: 10px;
          font-weight: 800;
          padding: 4px 8px;
          border-radius: 4px;
          letter-spacing: 0.5px;
        }
        .badge-member {
          display: flex;
          align-items: center;
          gap: 4px;
          color: white;
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.5px;
        }

        .header-contact {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          gap: 6px;
          margin-top: 4px;
        }
        
        .contact-item {
          display: flex;
          align-items: center;
          gap: 6px;
          color: rgba(255,255,255,0.6);
          font-size: 12px;
          font-weight: 500;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          max-width: 100%;
        }

        @media (min-width: 768px) {
          .header-left { gap: 32px; }
          .header-avatar { width: 120px; height: 120px; }
          .header-avatar span { font-size: 40px; }
          .header-user-info { gap: 12px; }
          .header-name { font-size: 32px; letter-spacing: -1px; }
          .header-badges { gap: 14px; }
          .badge-rank { font-size: 11px; padding: 4px 10px; }
          .badge-member { font-size: 11px; }
          .header-contact { flex-direction: row; align-items: center; gap: 12px; }
          .contact-item { font-size: 13px; gap: 8px; }
        }
      `}</style>
    </div>
  );
}
