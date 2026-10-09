import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Settings, User, Award, Calendar as CalendarIcon, Scissors, Coffee, Gamepad2, Compass, ArrowUpRight, MapPin, X, ChevronLeft, Star, Heart } from 'lucide-react';
import { publicService } from '../services/publicService';
import { getNormalizedSpecialty, getBarberBiography, getBarberStats } from './BookAppointment';
import BarberProfileView from '../components/BarberProfileView';

const BENEFITS = [
  { icon: User, title: 'Profesionales', desc: 'Especialistas expertos en las últimas técnicas odontológicas.', accent: '#111111' },
  { icon: Award, title: 'Calidad Premium', desc: 'Tecnología y materiales de alta gama para tu salud bucal.', accent: '#A8C4B8' },
  { icon: CalendarIcon, title: 'Reserva Fácil', desc: 'Agenda tu cita en segundos, las 24 horas del día.', accent: '#B8A8C4' },
  { icon: Scissors, title: 'Tecnología Moderna', desc: 'Equipos de última generación en un espacio pensado para ti.', accent: '#C4B8A8' },
  { icon: Star, title: 'Atención VIP', desc: 'Servicio personalizado pensado en tu satisfacción.', accent: '#A8B8C4' },
];

export default function Explore() {
  const navigate = useNavigate();
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);

  const [profileBarber, setProfileBarber] = useState(null);
  const [profilePortfolio, setProfilePortfolio] = useState([]);
  const [profileLoading, setProfileLoading] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const staffList = await publicService.getStaff();
        const filtered = (staffList || []).filter(s => {
          if (!s.active) return false;
          if (s.show_on_landing === false) return false;
          const role = (s.role || '').toLowerCase();
          return role.includes('barbero') || role.includes('tatuador') || role.includes('estilista') || role.includes('barber') || role.includes('tatu');
        });
        setStaff(filtered);
      } catch (e) {
        console.error('Error loading staff for Explore tab:', e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);


  // A self-contained profile peek instead of sending the visitor into the
  // booking wizard's own "expanded barber" step — that view lives deep inside
  // BookAppointment's step machinery and pulled them into the reservation flow
  // just to look at a photo. This stays on Explorar; only the explicit
  // "Reservar" button below hands off to booking.
  const openBarberProfile = (member) => {
    navigate('/reservar', { state: { exploreBarbers: true, barberId: member.id } });
  };
  const closeBarberProfile = () => setProfileBarber(null);
  const reserveWithBarber = (staffId) => {
    localStorage.removeItem('bookingState');
    navigate('/perfil/reservar', { state: { startBooking: true, prefillStaff: staffId } });
  };

  return (
    <div className="explore-root">

      {/* HEADER */}
      <div className="explore-header animate-fade-in-up" style={{ animationDelay: '0ms' }}>
        <div className="tab-intro-container" style={{ marginBottom: 0 }}>
          <div className="tab-intro-eyebrow">
            <Compass size={12} color="#000" />
            <span>Descubre Dientes Sanos</span>
          </div>
          <h1 className="tab-intro-title">Explorar</h1>
          <p className="tab-intro-subtitle" style={{ maxWidth: '280px' }}>Conoce a nuestros Odontólogos, los beneficios del club y nuestra calidad premium.</p>
        </div>
      </div>

      {/* HERO BANNER */}
      <div className="explore-hero animate-fade-in-up" style={{ animationDelay: '60ms' }}>
        <div className="explore-hero-img" style={{ background: 'linear-gradient(135deg,#f7f4ee 0%,#efe6d5 50%,#e8d4b0 100%)' }} />
        <div className="explore-hero-overlay" />
        <div className="explore-hero-content">
          <span className="explore-hero-eyebrow">ODONTOLOGÍA INTEGRAL</span>
          <h2 className="explore-hero-title">Experiencia Dientes Sanos</h2>
          <div className="explore-hero-meta">
            <MapPin size={12} />
            {/* TODO(contacto): pendiente datos del cliente */}
            <span>Por confirmar</span>
          </div>
        </div>
      </div>

      {/* EQUIPO */}
      <div className="explore-section animate-fade-in-up" style={{ animationDelay: '120ms' }}>
        <div className="explore-section-head">
          <span className="explore-section-kicker">ESPECIALISTAS</span>
          <h3 className="explore-section-title">Nuestro Equipo</h3>
        </div>
        {loading ? (
          <div className="explore-team-row">
            {[0, 1, 2].map(i => <div key={i} className="explore-team-skeleton" />)}
          </div>
        ) : staff.length === 0 ? (
          <div className="explore-empty">
            <User size={28} className="text-[#111111]/30 mb-2" />
            <p>No se encontraron especialistas disponibles.</p>
          </div>
        ) : (
          <div className="explore-team-row">
            {staff.map((member) => {
              const roleLabel = (member.role || 'Especialista').split('|')[0];
              return (
                <div key={member.id} className="explore-team-card" onClick={() => openBarberProfile(member)}>
                  <div className="explore-team-photo">
                    {member.image_url ? (
                      <img src={member.image_url} alt={member.name} />
                    ) : (
                      <div className="explore-team-photo-fallback"><User size={28} className="text-[#111111]/50" /></div>
                    )}
                    <div className="explore-team-photo-overlay" />
                    <div className="explore-team-photo-info">
                      <span className="explore-team-name">{member.name}</span>
                      <span className="explore-team-role">{roleLabel}</span>
                    </div>
                    <div className="explore-team-cta"><ArrowUpRight size={13} /></div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* BENEFICIOS */}
      <div className="explore-section animate-fade-in-up" style={{ animationDelay: '180ms' }}>
        <div className="explore-section-head">
          <span className="explore-section-kicker">EL ESTÁNDAR DIENTES SANOS</span>
          <h3 className="explore-section-title">Por Qué Elegirnos</h3>
        </div>
        <div className="explore-benefits-snap">
          {BENEFITS.map((b, idx) => (
            <div key={idx} className="benefit-card" style={{ '--accent': b.accent }}>
              {/* Layered background for depth */}
              <div className="benefit-card-noise" />
              <div className="benefit-card-glow" />
              
              {/* Top row: number + icon */}
              <div className="benefit-card-top">
                <span className="benefit-card-number">0{idx + 1}</span>
                <div className="benefit-card-icon">
                  <b.icon size={20} strokeWidth={1.8} />
                </div>
              </div>
              
              {/* Text content */}
              <div className="benefit-card-body">
                <h4 className="benefit-card-title">{b.title}</h4>
                <p className="benefit-card-desc">{b.desc}</p>
              </div>
              
              {/* Accent line at bottom */}
              <div className="benefit-card-accent-line" />
            </div>
          ))}
        </div>
      </div>

      {/* EXPERIENCIA (IMMERSIVE POSTER) */}
      <div className="explore-section animate-fade-in-up" style={{ animationDelay: '240ms' }}>
        <div className="ep-poster">
          <div className="ep-poster-img" style={{ background: 'linear-gradient(135deg,#f7f4ee 0%,#efe6d5 50%,#e8d4b0 100%)' }} />
          <div className="ep-poster-overlay" />
          
          <div className="ep-poster-content">
            <div className="ep-poster-header">
              <span className="ep-poster-kicker">MÁS QUE UNA CONSULTA</span>
              <h3 className="ep-poster-title">Experiencia Dientes Sanos</h3>
              <p className="ep-poster-desc">
                Odontología integral en un entorno exclusivo, diseñado para tu comodidad y relax.
              </p>
            </div>
            
            <div className="ep-widgets">
              <button className="ep-widget">
                <div className="ep-widget-icon"><Coffee size={20} /></div>
                <div className="ep-widget-text">
                  <span className="ep-widget-title">Café de cortesía</span>
                  <span className="ep-widget-subtitle">Café de especialidad y bebidas premium</span>
                </div>
              </button>
              <button className="ep-widget">
                <div className="ep-widget-icon"><Gamepad2 size={20} /></div>
                <div className="ep-widget-text">
                  <span className="ep-widget-title">Espacio Retro Arcade</span>
                  <span className="ep-widget-subtitle">Consolas libres mientras esperas</span>
                </div>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ODONTOPEDÍA — CINEMATIC IMMERSIVE EXPERIENCE */}
      <div className="explore-section animate-fade-in-up" style={{ animationDelay: '300ms' }}>
        <div className="kids-cinema">
          {/* Cinematic Media Layer (barbería neutralizada: fondo arena) */}
          <div className="kids-cinema-video-wrap">
            <div
              className="kids-cinema-video"
              style={{ background: 'linear-gradient(135deg,#f7f4ee 0%,#efe6d5 50%,#e8d4b0 100%)' }}
            />
            {/* Multi-layer gradient for depth */}
            <div className="kids-cinema-vignette" />
            <div className="kids-cinema-gradient" />
          </div>
          
          {/* Content Layer — Centered, Breathing */}
          <div className="kids-cinema-content">

            {/* Hero Title — The Star */}
            <h2 className="kids-cinema-title">
              Odonto<br />pediatría<span className="kids-title-dot">.</span>
            </h2>

            {/* Emotional subtitle */}
            <p className="kids-cinema-subtitle">
              La primera consulta no se olvida.<br />
              <span className="kids-subtitle-secondary">Paciencia, cuidado y sonrisas para los más pequeños.</span>
            </p>
            
            {/* Feature Trio — Apple-style horizontal chips */}
            <div className="kids-cinema-features">
              <div className="kids-feature-chip" style={{ animationDelay: '0.6s' }}>
                <Gamepad2 size={15} />
                <span>Consolas</span>
              </div>
              <div className="kids-feature-chip" style={{ animationDelay: '0.75s' }}>
                <Heart size={15} />
                <span>Paciencia</span>
              </div>
              <div className="kids-feature-chip" style={{ animationDelay: '0.9s' }}>
                <Scissors size={15} />
                <span>Estilo</span>
              </div>
            </div>

            {/* CTA — Shimmer Button */}
            <button className="kids-cinema-cta" onClick={() => navigate('/perfil/reservar', { state: { startBooking: true, openCategory: 'Kids' } })}>
              <span className="kids-cta-text">Reservar para mi pequeño</span>
              <ArrowUpRight size={16} strokeWidth={2.5} />
              <div className="kids-cta-shimmer" />
            </button>
          </div>
        </div>
      </div>

      {/* BARBER PROFILE OVERLAY REMOVED. Navigation to /reservar handles this now. */}

      <style>{`
        .explore-root {
          width: 100%;
          max-width: 1080px;
          margin: 0 auto;
          padding: 32px 20px 40px;
          font-family: 'General Sans', sans-serif;
          display: flex;
          flex-direction: column;
          gap: 36px;
        }
        .explore-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 12px;
        }
        .explore-kicker {
          display: block;
          font-size: 10px; font-weight: 800; color: rgba(17, 17, 17,0.7);
          text-transform: uppercase; letter-spacing: 2px;
          margin-bottom: 4px;
        }
        .explore-title {
          font-size: 30px; font-weight: 900; color: #111111;
          letter-spacing: -0.8px; line-height: 1;
        }
        .explore-settings-btn {
          flex-shrink: 0;
          width: 42px; height: 42px;
          margin-top: 2px;
          border-radius: 13px;
          background: #ffffff;
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          border: 1px solid rgba(217, 192, 143,0.2);
          color: #64748b;
          display: flex; align-items: center; justify-content: center;
          cursor: pointer;
          transition: all 0.25s cubic-bezier(0.2,0.8,0.2,1);
          touch-action: pan-y;
        }
        .explore-settings-btn:hover {
          background: rgba(17, 17, 17,0.08);
          color: #111111;
          border-color: rgba(17, 17, 17,0.35);
          transform: rotate(45deg);
        }
        .explore-settings-btn:active { transform: rotate(45deg) scale(0.92); }

        /* HERO */
        .explore-hero {
          position: relative;
          border-radius: 28px;
          overflow: hidden;
          height: 220px;
          border: 1px solid rgba(217, 192, 143,0.15);
          box-shadow: 0 20px 50px rgba(0,0,0,0.10);
        }
        .explore-hero-img {
          position: absolute; inset: 0;
          width: 100%; height: 100%;
          object-fit: cover;
          object-position: top;
        }
        .explore-hero-overlay {
          position: absolute; inset: 0;
          background:
            linear-gradient(180deg, rgba(5,5,6,0.5) 0%, rgba(5,5,6,0.82) 55%, rgba(5,5,6,0.97) 100%),
            linear-gradient(90deg, rgba(5,5,6,0.45) 0%, transparent 55%);
        }
        .explore-hero-content {
          position: relative; z-index: 1;
          height: 100%;
          display: flex; flex-direction: column; justify-content: flex-end;
          padding: 22px;
        }
        .explore-hero-eyebrow {
          font-size: 10px; font-weight: 800; text-transform: uppercase;
          letter-spacing: 1.5px; color: #e8d4b0; margin-bottom: 6px;
        }
        .explore-hero-title {
          font-size: 24px; font-weight: 900; color: #fff; line-height: 1.08;
          letter-spacing: -0.5px;
          text-shadow: 0 4px 20px rgba(0,0,0,0.5);
        }
        .explore-hero-meta {
          display: flex; align-items: center; gap: 6px;
          margin-top: 12px;
          font-size: 11px; font-weight: 600; color: rgba(255,255,255,0.55);
        }

        /* SECTIONS */
        .explore-section {
          display: flex; flex-direction: column; gap: 16px;
        }
        .explore-section-head {
          display: flex; flex-direction: column; gap: 2px;
        }
        .explore-section-kicker {
          font-size: 10px; font-weight: 800; color: rgba(17, 17, 17,0.65);
          text-transform: uppercase; letter-spacing: 1.8px;
        }
        .explore-section-title {
          font-size: 19px; font-weight: 800; color: #111111;
          letter-spacing: -0.3px;
        }
        .explore-empty {
          display: flex; flex-direction: column; align-items: center; text-align: center;
          padding: 28px 0;
          color: #64748b;
          font-size: 13px; font-weight: 500;
        }

        /* TEAM ROW — story-style portrait cards */
        .explore-team-row {
          display: flex;
          gap: 12px;
          overflow-x: auto;
          padding: 4px 2px 10px;
          margin: -4px -2px -10px;
        }
        .explore-team-row::-webkit-scrollbar { display: none; }
        .explore-team-card {
          flex-shrink: 0;
          cursor: pointer;
        }
        .explore-team-photo {
          position: relative;
          width: 118px;
          aspect-ratio: 3 / 4;
          border-radius: 20px;
          overflow: hidden;
          background: #f0f1ef;
          border: 1px solid rgba(217, 192, 143,0.15);
          transition: border-color 0.25s, transform 0.25s cubic-bezier(0.2,0.8,0.2,1);
        }
        .explore-team-card:active .explore-team-photo {
          transform: scale(0.96);
          border-color: rgba(17, 17, 17,0.5);
        }
        .explore-team-photo img {
          position: absolute; inset: 0;
          width: 100%; height: 100%; object-fit: cover; object-position: top;
        }
        .explore-team-photo-fallback {
          position: absolute; inset: 0;
          display: flex; align-items: center; justify-content: center;
        }
        .explore-team-photo-overlay {
          position: absolute; inset: 0;
          background: linear-gradient(180deg, transparent 40%, rgba(5,5,6,0.92) 100%);
        }
        .explore-team-photo-info {
          position: absolute; bottom: 0; left: 0; right: 0;
          padding: 10px;
          display: flex; flex-direction: column; gap: 2px;
        }
        .explore-team-name {
          font-size: 11.5px; font-weight: 800; color: #fff;
          line-height: 1.2;
        }
        .explore-team-role {
          font-size: 8.5px; font-weight: 700; color: #e8d4b0;
          text-transform: uppercase; letter-spacing: 0.6px;
        }
        .explore-team-cta {
          position: absolute; top: 8px; right: 8px;
          width: 22px; height: 22px;
          border-radius: 50%;
          background: rgba(0,0,0,0.45);
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
          color: #fff;
          display: flex; align-items: center; justify-content: center;
        }
        .explore-team-skeleton {
          flex-shrink: 0;
          width: 118px;
          aspect-ratio: 3 / 4;
          border-radius: 20px;
          background: #f0f1ef;
          animation: exploreSkeletonPulse 1.4s ease-in-out infinite;
        }
        @keyframes exploreSkeletonPulse {
          0%,100% { opacity: 0.5; } 50% { opacity: 1; }
        }

        /* BENEFITS — asymmetric bento (first item featured) */
        /* SNAP CARDS (Apple-style horizontal scroll) */
        .explore-benefits-snap {
          display: flex;
          gap: 14px;
          overflow-x: auto;
          scroll-snap-type: x mandatory;
          padding: 8px 0 24px;
          margin: 0 -20px;
          padding-left: 20px;
          padding-right: 20px;
          -webkit-overflow-scrolling: touch;
        }
        .explore-benefits-snap::-webkit-scrollbar { display: none; }
        
        .benefit-card {
          position: relative;
          flex-shrink: 0;
          width: 78%;
          max-width: 300px;
          min-height: 200px;
          padding: 24px;
          border-radius: 24px;
          background: linear-gradient(165deg, #ffffff 0%, #f7f7f5 60%, #f0f1ef 100%);
          border: 1px solid rgba(217, 192, 143,0.15);
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          scroll-snap-align: center;
          overflow: hidden;
          transition: transform 0.4s cubic-bezier(0.16, 1, 0.3, 1), border-color 0.4s, box-shadow 0.4s;
          cursor: default;
          touch-action: pan-x pan-y;
          box-shadow: 0 20px 40px -12px rgba(0,0,0,0.08);
        }
        .benefit-card:hover {
          transform: translateY(-4px);
          border-color: color-mix(in srgb, var(--accent) 20%, transparent);
          box-shadow:
            0 24px 48px -12px rgba(0,0,0,0.10),
            0 0 0 1px color-mix(in srgb, var(--accent) 10%, transparent);
        }
        .benefit-card:active {
          transform: scale(0.97);
        }

        /* Subtle noise texture */
        .benefit-card-noise {
          position: absolute;
          inset: 0;
          border-radius: 24px;
          opacity: 0.03;
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E");
          pointer-events: none;
          z-index: 0;
        }

        /* Corner glow with accent color */
        .benefit-card-glow {
          position: absolute;
          top: -30px;
          right: -30px;
          width: 120px;
          height: 120px;
          border-radius: 50%;
          background: radial-gradient(circle, color-mix(in srgb, var(--accent) 15%, transparent) 0%, transparent 70%);
          z-index: 0;
          transition: all 0.5s ease;
          pointer-events: none;
        }
        .benefit-card:hover .benefit-card-glow {
          transform: scale(1.3);
          background: radial-gradient(circle, color-mix(in srgb, var(--accent) 25%, transparent) 0%, transparent 70%);
        }

        /* Top row */
        .benefit-card-top {
          position: relative;
          z-index: 1;
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 28px;
        }
        .benefit-card-number {
          font-size: 13px;
          font-weight: 700;
          color: var(--accent);
          opacity: 0.5;
          letter-spacing: 0.05em;
          font-variant-numeric: tabular-nums;
        }
        .benefit-card-icon {
          width: 44px;
          height: 44px;
          border-radius: 14px;
          background: linear-gradient(135deg, rgba(217, 192, 143,0.12), rgba(217, 192, 143,0.05));
          border: 1px solid rgba(217, 192, 143,0.2);
          color: var(--accent);
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 2px 8px rgba(0,0,0,0.06);
          transition: all 0.35s ease;
        }
        .benefit-card:hover .benefit-card-icon {
          background: linear-gradient(135deg, color-mix(in srgb, var(--accent) 12%, transparent), color-mix(in srgb, var(--accent) 5%, transparent));
          border-color: color-mix(in srgb, var(--accent) 25%, transparent);
          box-shadow: 0 4px 16px color-mix(in srgb, var(--accent) 15%, transparent), inset 0 1px 0 rgba(255,255,255,0.08);
        }

        /* Body */
        .benefit-card-body {
          position: relative;
          z-index: 1;
          flex: 1;
          display: flex;
          flex-direction: column;
          justify-content: flex-end;
        }
        .benefit-card-title {
          font-size: 18px;
          font-weight: 800;
          color: #0f172a;
          letter-spacing: -0.4px;
          margin-bottom: 6px;
          line-height: 1.2;
        }
        .benefit-card-desc {
          font-size: 13px;
          color: #64748b;
          line-height: 1.55;
          font-weight: 450;
        }

        /* Accent line at bottom */
        .benefit-card-accent-line {
          position: absolute;
          bottom: 0;
          left: 24px;
          right: 24px;
          height: 2px;
          background: linear-gradient(90deg, transparent, var(--accent), transparent);
          opacity: 0;
          transition: opacity 0.4s ease;
        }
        .benefit-card:hover .benefit-card-accent-line {
          opacity: 0.3;
        }

        /* EXPERIENCE (IMMERSIVE POSTER) */
        .ep-poster {
          position: relative;
          border-radius: 32px;
          overflow: hidden;
          min-height: 480px;
          border: 1px solid rgba(255,255,255,0.08);
          display: flex;
          flex-direction: column;
          box-shadow: 0 24px 60px rgba(0,0,0,0.5);
          background: #000;
        }
        .ep-poster-img {
          position: absolute; inset: 0;
          width: 100%; height: 100%; object-fit: cover;
          opacity: 0.85;
        }
        .ep-poster-overlay {
          position: absolute; inset: 0;
          background: linear-gradient(180deg, rgba(5,5,6,0.1) 0%, rgba(5,5,6,0.6) 40%, rgba(5,5,6,0.98) 100%);
        }
        .ep-poster-content {
          position: relative; z-index: 1;
          display: flex; flex-direction: column;
          justify-content: space-between;
          flex: 1;
          padding: 32px 24px 24px;
        }
        .ep-poster-header {
          display: flex; flex-direction: column; align-items: center; text-align: center;
        }
        .ep-poster-kicker {
          font-size: 10px; font-weight: 800; color: #111111; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 6px;
        }
        .ep-poster-title {
          font-size: 38px; font-weight: 900; color: #111111; letter-spacing: -1px; margin: 0 0 12px; line-height: 1.1;
          text-shadow: none;
        }
        .ep-poster-desc {
          font-size: 14px; color: #111111; line-height: 1.5; font-weight: 500; max-width: 320px;
          text-shadow: none;
        }
        .ep-widgets {
          display: flex; flex-direction: column; gap: 8px;
        }
        .ep-widget {
          width: 100%;
          padding: 16px;
          border-radius: 20px;
          background: rgba(255,255,255,0.9);
          backdrop-filter: blur(24px);
          -webkit-backdrop-filter: blur(24px);
          border: 1px solid rgba(217, 192, 143,0.2);
          display: flex; gap: 14px; align-items: center;
          text-align: left;
          transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
          cursor: pointer;
          outline: none;
        }
        .ep-widget:active {
          transform: scale(0.97);
          background: #f0f1ef;
        }
        .ep-widget-icon {
          flex-shrink: 0;
          width: 44px; height: 44px;
          border-radius: 12px;
          background: linear-gradient(135deg, rgba(17, 17, 17,0.2) 0%, rgba(17, 17, 17,0.05) 100%);
          color: #111111;
          display: flex; align-items: center; justify-content: center;
          border: 1px solid rgba(17, 17, 17,0.15);
        }
        .ep-widget-text {
          display: flex; flex-direction: column; gap: 2px;
        }
        .ep-widget-title {
          font-size: 14px; font-weight: 700; color: #0f172a; letter-spacing: -0.3px;
        }
        .ep-widget-subtitle {
          font-size: 12px; color: #64748b; line-height: 1.3; font-weight: 500;
        }

        @media (min-width: 640px) {
          .ep-widgets { flex-direction: row; }
          .ep-widget { flex: 1; }
        }

        /* BARBER PROFILE — full-screen takeover, same layout as the landing's
           expanded barber view (photo hero, manifesto panel, stats, portfolio). */
        .explore-profile-overlay {
          position: fixed; inset: 0;
          z-index: 200;
          background: #e9eae8;
          overflow-y: auto;
          animation: exploreOverlayIn 0.25s ease forwards;
        }
        @keyframes exploreOverlayIn {
          from { opacity: 0; transform: translateY(16px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .explore-profile-screen {
          max-width: 640px;
          margin: 0 auto;
          min-height: 100%;
        }
        .explore-profile-back {
          position: absolute; left: 16px; z-index: 30;
          top: calc(max(env(safe-area-inset-top, 0px), 16px));
          width: 40px; height: 40px;
          border-radius: 50%;
          background: rgba(255,255,255,0.9);
          backdrop-filter: blur(10px);
          -webkit-backdrop-filter: blur(10px);
          border: 1px solid rgba(217, 192, 143,0.25);
          color: #111111;
          display: flex; align-items: center; justify-content: center;
          cursor: pointer;
          touch-action: pan-y;
        }
        .explore-profile-hero {
          position: relative;
          height: 420px;
          overflow: hidden;
          background: #f0f1ef;
          border-bottom: 1px solid rgba(217, 192, 143,0.12);
        }
        .explore-profile-hero-img {
          position: absolute; inset: 0;
          width: 100%; height: 100%; object-fit: cover; object-position: top;
        }
        .explore-profile-hero-fallback {
          position: absolute; inset: 0;
          display: flex; align-items: center; justify-content: center;
          background: #f0f1ef;
        }
        .explore-profile-body {
          padding: 20px;
          display: flex; flex-direction: column; gap: 20px;
        }
        .explore-profile-reserve-btn {
          width: 100%;
          padding: 16px;
          border-radius: 16px;
          background: linear-gradient(135deg, #e8d4b0, #d9c08f);
          color: #111111;
          font-size: 12px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.8px;
          border: none;
          cursor: pointer;
          box-shadow: 0 10px 30px rgba(217, 192, 143,0.3);
          touch-action: pan-y;
        }
        .explore-profile-reserve-btn:active { transform: scale(0.98); }

        /* ═══════════════════════════════════════════════════
           ODONTOPEDÍA — CINEMATIC IMMERSIVE CARD
           ═══════════════════════════════════════════════════ */
        .kids-cinema {
          position: relative;
          border-radius: 28px;
          overflow: hidden;
          cursor: pointer;
          min-height: 520px;
          display: flex;
          align-items: center;
          justify-content: center;
          isolation: isolate;
        }
        @media (min-width: 768px) {
          .kids-cinema { min-height: 560px; }
        }

        /* ── Video Layer ── */
        .kids-cinema-video-wrap {
          position: absolute;
          inset: 0;
          z-index: 0;
        }
        .kids-cinema-video {
          width: 100%;
          height: 100%;
          object-fit: cover;
          object-position: center 30%;
          transform: scale(1.01);
          transition: transform 1.2s cubic-bezier(0.16, 1, 0.3, 1);
          will-change: transform;
        }
        .kids-cinema:hover .kids-cinema-video {
          transform: scale(1.08);
        }

        /* ── Gradient Layers (depth) ── */
        .kids-cinema-vignette {
          position: absolute;
          inset: 0;
          background: radial-gradient(ellipse 80% 70% at 50% 45%, transparent 0%, rgba(5,5,6,0.5) 100%);
          pointer-events: none;
        }
        .kids-cinema-gradient {
          position: absolute;
          inset: 0;
          background:
            linear-gradient(180deg, rgba(5,5,6,0.35) 0%, rgba(5,5,6,0.1) 30%, rgba(5,5,6,0.15) 55%, rgba(5,5,6,0.85) 85%, rgba(5,5,6,0.98) 100%),
            linear-gradient(0deg, rgba(17, 17, 17,0.04) 0%, transparent 40%);
          pointer-events: none;
          transition: opacity 0.6s ease;
        }
        .kids-cinema:hover .kids-cinema-gradient {
          opacity: 0.85;
        }

        /* ── Content Layer ── */
        .kids-cinema-content {
          position: relative;
          z-index: 2;
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          padding: 48px 24px 40px;
          width: 100%;
          gap: 0;
        }

        /* ── Floating Eyebrow ── */
        .kids-cinema-eyebrow {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 6px 16px;
          background: rgba(17, 17, 17,0.06);
          border: 1px solid rgba(17, 17, 17,0.18);
          border-radius: 100px;
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 0.2em;
          color: #111111;
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          margin-bottom: 20px;
          animation: kidsSlideUp 0.7s cubic-bezier(0.16,1,0.3,1) both;
          animation-delay: 0.1s;
        }
        .kids-eyebrow-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #111111;
          animation: kidsDotPulse 2.5s ease-in-out infinite;
        }

        /* ── Hero Title ── */
        .kids-cinema-title {
          font-size: clamp(52px, 14vw, 88px);
          font-weight: 900;
          line-height: 0.9;
          letter-spacing: -0.03em;
          color: #111111;
          margin: 0;
          text-shadow: none;
          animation: kidsSlideUp 0.8s cubic-bezier(0.16,1,0.3,1) both;
          animation-delay: 0.2s;
        }
        .kids-title-dot {
          color: #111111;
          text-shadow: none;
        }

        /* ── Subtitle ── */
        .kids-cinema-subtitle {
          font-size: 15px;
          line-height: 1.6;
          color: rgba(17, 17, 17,0.85);
          margin: 16px 0 0;
          max-width: 340px;
          font-weight: 500;
          animation: kidsSlideUp 0.8s cubic-bezier(0.16,1,0.3,1) both;
          animation-delay: 0.35s;
        }
        .kids-subtitle-secondary {
          color: rgba(17, 17, 17,0.7);
          font-size: 14px;
        }

        /* ── Feature Chips ── */
        .kids-cinema-features {
          display: flex;
          gap: 8px;
          margin-top: 24px;
          flex-wrap: wrap;
          justify-content: center;
        }
        .kids-feature-chip {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 7px 14px;
          background: rgba(17, 17, 17,0.06);
          border: 1px solid rgba(17, 17, 17,0.18);
          border-radius: 100px;
          font-size: 12px;
          font-weight: 600;
          color: rgba(17, 17, 17,0.85);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          transition: all 0.35s cubic-bezier(0.16,1,0.3,1);
          animation: kidsChipReveal 0.6s cubic-bezier(0.16,1,0.3,1) both;
        }
        .kids-feature-chip svg {
          color: #111111;
          flex-shrink: 0;
        }
        .kids-feature-chip:hover {
          background: rgba(17, 17, 17,0.1);
          border-color: rgba(17, 17, 17,0.3);
          transform: translateY(-2px);
        }

        /* ── CTA Button with Shimmer ── */
        .kids-cinema-cta {
          position: relative;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 14px 28px;
          margin-top: 28px;
          background: linear-gradient(135deg, #e8dcc8, #e8d4b0, #b8a485);
          background-size: 200% 200%;
          color: #0a0a0d;
          border: none;
          border-radius: 100px;
          font-size: 13px;
          font-weight: 800;
          letter-spacing: 0.02em;
          cursor: pointer;
          overflow: hidden;
          transition: all 0.4s cubic-bezier(0.16,1,0.3,1);
          box-shadow: 0 8px 32px rgba(17, 17, 17,0.25), inset 0 1px 0 rgba(255,255,255,0.3);
          animation: kidsSlideUp 0.8s cubic-bezier(0.16,1,0.3,1) both;
          animation-delay: 1s;
        }
        .kids-cinema-cta:hover {
          transform: translateY(-3px) scale(1.03);
          box-shadow: 0 12px 40px rgba(17, 17, 17,0.4), inset 0 1px 0 rgba(255,255,255,0.4);
        }
        .kids-cinema-cta:active {
          transform: translateY(-1px) scale(0.98);
        }
        .kids-cta-text {
          position: relative;
          z-index: 1;
        }
        .kids-cta-shimmer {
          position: absolute;
          top: 0;
          left: -100%;
          width: 60%;
          height: 100%;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.35), transparent);
          transform: skewX(-20deg);
          animation: kidsShimmer 3.5s ease-in-out infinite;
          animation-delay: 1.5s;
          pointer-events: none;
        }

        /* ── Keyframes ── */
        @keyframes kidsSlideUp {
          from { opacity: 0; transform: translateY(24px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes kidsChipReveal {
          from { opacity: 0; transform: translateY(12px) scale(0.9); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes kidsDotPulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50%      { opacity: 0.4; transform: scale(0.7); }
        }
        @keyframes kidsShimmer {
          0%   { left: -100%; }
          30%  { left: 150%; }
          100% { left: 150%; }
        }
      `}</style>
    </div>
  );
}
