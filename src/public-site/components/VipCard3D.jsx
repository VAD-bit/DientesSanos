import { useState, useRef } from 'react';
import pandaLogo from '../../assets/panda_logo_nobg.png';

export default function VipCard3D({ client, points, rank }) {
  const [tiltStyle, setTiltStyle] = useState({});
  const [glareStyle, setGlareStyle] = useState({ opacity: 0 });
  const cardRef = useRef(null);

  const handleMouseMove = (e) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // Calculate rotation (-15 to 15 degrees)
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const rotateX = ((y - centerY) / centerY) * -15;
    const rotateY = ((x - centerX) / centerX) * 15;

    // Calculate glare position
    const glareX = (x / rect.width) * 100;
    const glareY = (y / rect.height) * 100;

    setTiltStyle({
      transform: `rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.02, 1.02, 1.02)`
    });
    setGlareStyle({
      opacity: 1,
      background: `radial-gradient(circle at ${glareX}% ${glareY}%, rgba(255,255,255,0.15) 0%, transparent 60%)`
    });
  };

  const handleMouseLeave = () => {
    setTiltStyle({ transform: 'rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)' });
    setGlareStyle({ opacity: 0 });
  };

  const initials = client?.name?.trim()
    ? client.name.trim().split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase()
    : 'AR';

  return (
    <>
      <div 
        className="profile-vip-card-3d"
        ref={cardRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        style={tiltStyle}
      >
        <div className="vip-glare" style={glareStyle}></div>
        <div className="vip-card-gradient-overlay"></div>
        <img src={pandaLogo} alt="Dientes Sanos" className="vip-panda-watermark" />
        
        <div className="vip-header">
          <div className="vip-brand">
            <strong>DIENTES SANOS</strong>
            <span>CLUB MEMBER</span>
          </div>
        </div>
        
        <div className="vip-middle">
          <div className="vip-mini-avatar">
            {client?.image_url ? (
              <img src={client.image_url} alt="profile" />
            ) : (
              <span>{initials}</span>
            )}
          </div>
          <div className="vip-user-info-text">
            <div className="vip-user-name">{client?.name || 'Cliente'}</div>
            <div className="vip-member-since">Miembro desde Ago 2026</div>
          </div>
        </div>

        <div className="vip-footer">
          <div className="vip-rank-pill">{rank.toUpperCase()}</div>
          <div className="vip-points-big">
            <span className="number">{points}</span>
            <span className="label">PTS</span>
          </div>
        </div>
      </div>

      <style>{`
        .profile-vip-card-3d {
          position: relative;
          background: linear-gradient(135deg, #232326 0%, #0a0a0b 55%, #e9eae8 100%);
          border: 1px solid rgba(17,17,17,0.3);
          border-radius: 16px;
          padding: 24px;
          overflow: hidden;
          box-shadow: 0 16px 32px -14px rgba(0,0,0,0.75), 0 0 20px -10px rgba(17,17,17,0.15);
          transform-style: preserve-3d;
          transition: transform 0.1s ease-out;
          will-change: transform;
          cursor: pointer;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          width: 100%;
          aspect-ratio: 1.6 / 1;
        }

        .vip-card-gradient-overlay {
          position: absolute;
          inset: -50%;
          background: linear-gradient(115deg, transparent 47%, rgba(255,255,255,0.05) 50%, transparent 53%);
          pointer-events: none;
          z-index: 1;
        }

        .vip-glare {
          position: absolute;
          top: 0; left: 0; right: 0; bottom: 0;
          pointer-events: none;
          transition: opacity 0.2s;
          mix-blend-mode: overlay;
          z-index: 10;
        }

        .vip-panda-watermark {
          position: absolute;
          right: -6%;
          bottom: -14%;
          width: 54%;
          height: auto;
          opacity: 0.08;
          pointer-events: none;
          z-index: 0;
          user-select: none;
          filter: invert(1);
        }

        .vip-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          position: relative;
          z-index: 2;
        }
        
        .vip-brand {
          display: flex;
          flex-direction: column;
        }
        .vip-brand strong {
          color: white;
          font-size: 14px;
          font-weight: 900;
          letter-spacing: 0.06em;
        }
        .vip-brand span {
          color: var(--champagne);
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.2em;
          margin-top: 2px;
        }

        .vip-middle {
          display: flex;
          align-items: center;
          gap: 16px;
          position: relative;
          z-index: 2;
        }
        .vip-mini-avatar {
          width: 56px;
          height: 56px;
          border-radius: 50%;
          background: rgba(255,255,255,0.06);
          border: 1.5px solid rgba(255,255,255,0.25);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .vip-mini-avatar img {
          width: 100%;
          height: 100%;
          border-radius: 50%;
          object-fit: cover;
        }
        .vip-mini-avatar span {
          color: white;
          font-weight: 800;
          font-size: 18px;
        }
        .vip-user-info-text {
          display: flex;
          flex-direction: column;
        }
        .vip-user-name {
          color: white;
          font-size: 18px;
          font-weight: 800;
          line-height: 1.2;
          text-transform: uppercase;
        }
        .vip-member-since {
          font-size: 12px;
          color: rgba(255,255,255,0.35);
          font-weight: 600;
          margin-top: 4px;
        }

        .vip-footer {
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          position: relative;
          z-index: 2;
        }

        .vip-rank-pill {
          background: rgba(17,17,17,0.1);
          border: 1px solid rgba(17,17,17,0.25);
          color: var(--champagne);
          padding: 6px 14px;
          border-radius: 20px;
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 0.12em;
        }

        .vip-points-big {
          display: flex;
          align-items: baseline;
          gap: 6px;
        }
        .vip-points-big .number {
          color: white;
          font-size: 32px;
          font-weight: 900;
          line-height: 1;
        }
        .vip-points-big .label {
          color: rgba(255,255,255,0.4);
          font-size: 12px;
          font-weight: 700;
        }
      `}</style>
    </>
  );
}
