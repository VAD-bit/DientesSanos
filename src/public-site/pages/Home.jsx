import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Scissors, Star, Clock, ChevronRight, Sparkles, Users } from 'lucide-react';
import { publicService } from '../services/publicService';
import { formatDuration } from '../../utils/formatDuration';
import { roleLabel } from '../../utils/staffRoles';

export default function Home() {
  const [services, setServices] = useState([]);
  const [barbers, setBarbers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  
  const [reviews, setReviews] = useState([]);
  const [googleAvg, setGoogleAvg] = useState(null);
  const [selectedBarberForReview, setSelectedBarberForReview] = useState(null);
  const [newRating, setNewRating] = useState(5);
  const [newComment, setNewComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);

  useEffect(() => {
    const client = localStorage.getItem('panda_public_client');
    setIsLoggedIn(!!client);

    const loadData = async () => {
      try {
        const [servicesData, staffData, reviewsData, googleData] = await Promise.all([
          publicService.getServices().catch(() => []),
          publicService.getStaff().catch(() => []),
          publicService.getStaffReviews().catch(() => []),
          publicService.getGoogleReviews().catch(() => [])
        ]);
        setServices(servicesData.slice(0, 4));
        setBarbers(staffData.filter(s => {
          if (s.show_on_landing === false) return false;
          const r = (s.role || '').toLowerCase();
          return r.includes('barber') || r.includes('barba') || r.includes('artista') || r.includes('odontolog') || r.includes('tatu');
        }).slice(0, 3));
        setReviews(reviewsData || []);
        if (googleData.length) {
          setGoogleAvg(googleData.reduce((s, r) => s + (Number(r.rating) || 5), 0) / googleData.length);
        }
      } catch (e) {
        console.error('Error loading data:', e);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  const reloadReviews = async () => {
    try {
      const data = await publicService.getStaffReviews();
      setReviews(data || []);
    } catch (e) {
      console.error(e);
    }
  };

  const handleReviewSubmit = async (e) => {
    e.preventDefault();
    if (!selectedBarberForReview) return;
    try {
      setSubmittingReview(true);
      await publicService.submitStaffReview(selectedBarberForReview.id, newRating, newComment);
      alert('¡Gracias! Tu reseña ha sido registrada de forma anónima.');
      setSelectedBarberForReview(null);
      setNewRating(5);
      setNewComment('');
      await reloadReviews();
    } catch (err) {
      console.error(err);
      alert('Error al enviar la reseña.');
    } finally {
      setSubmittingReview(false);
    }
  };

  return (
    <div>
      {/* Hero */}
      <section style={{
        minHeight: '85vh',
        display: 'flex',
        alignItems: 'center',
        position: 'relative',
        overflow: 'hidden',
        padding: '80px 16px',
      }}>
        <div style={{
          position: 'absolute',
          inset: 0,
          background: 'radial-gradient(ellipse 80% 50% at 50% -20%, rgba(17, 17, 17,0.08) 0%, transparent 60%)',
        }} />
        <div style={{
          position: 'absolute',
          top: '10%',
          right: '5%',
          width: 400,
          height: 400,
          background: 'radial-gradient(circle, rgba(17, 17, 17,0.06) 0%, transparent 70%)',
          borderRadius: '50%',
          filter: 'blur(60px)',
        }} />

        <div style={{ maxWidth: 1200, margin: '0 auto', display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: 60, alignItems: 'center', position: 'relative', width: '100%' }}>
          <div>
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              background: 'rgba(17, 17, 17, 0.08)',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-pill)',
              padding: '8px 16px',
              marginBottom: 24,
            }}>
              <Sparkles size={14} style={{ color: 'var(--champagne)' }} />
              <span style={{ color: 'var(--champagne)', fontSize: 13, fontWeight: 600 }}>Odontología integral y humana</span>
            </div>

            <h1 style={{ fontSize: 'clamp(3rem, 6vw, 5rem)', fontWeight: 900, lineHeight: 1.05, letterSpacing: -2, marginBottom: 24 }}>
              Tu Sonrisa,<br />
              <span className="text-gold">Nuestra Pasión</span>
            </h1>

            <p style={{ color: 'var(--text-secondary)', fontSize: 18, lineHeight: 1.6, maxWidth: 440, marginBottom: 32 }}>
              Prevención, estética y bienestar dental. Reserva tu cita en segundos.
            </p>

            <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginBottom: 48 }}>
              <Link to={isLoggedIn ? '/agendar' : '/login'} className="btn-gold" style={{ padding: '14px 28px', fontSize: 15, borderRadius: 'var(--radius-pill)' }}>
                {isLoggedIn ? 'Agendar Cita' : 'Iniciar Sesión para Agendar'} <ChevronRight size={18} style={{ marginLeft: 4 }} />
              </Link>
              <a href="#servicios" className="btn-outline" style={{ padding: '14px 28px', fontSize: 15, borderRadius: 'var(--radius-pill)' }}>
                Ver Servicios
              </a>
            </div>

            <div style={{ display: 'flex', gap: 40 }}>
              <div>
                <div className="text-gold" style={{ fontSize: 32, fontWeight: 900 }}>2,500+</div>
                <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>Clientes Felices</div>
              </div>
              <div>
                <div className="text-gold" style={{ fontSize: 32, fontWeight: 900 }}>{googleAvg ? googleAvg.toFixed(1) : '—'}</div>
                <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>Calificación Google</div>
              </div>
              <div>
                <div className="text-gold" style={{ fontSize: 32, fontWeight: 900 }}>6+</div>
                <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>Odontólogos expertos</div>
              </div>
            </div>
          </div>

          {/* Hero Visual */}
          <div style={{ display: 'flex', justifyContent: 'center', position: 'relative' }}>
            <div style={{
              width: 350,
              height: 350,
              borderRadius: '50%',
              background: 'rgba(17, 17, 17, 0.05)',
              border: '1px solid var(--border-color)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              position: 'relative',
            }}>
              <Scissors size={100} style={{ color: 'var(--champagne)', opacity: 0.3 }} />
              <div style={{
                position: 'absolute',
                top: 0,
                right: -20,
                background: 'var(--gold-gradient)',
                color: '#ffffff',
                padding: '8px 16px',
                borderRadius: 'var(--radius-pill)',
                fontSize: 13,
                fontWeight: 800,
                animation: 'pulse-gold 2s ease-in-out infinite',
              }}>
                ¡10% OFF cumpleañeros!
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Services */}
      <section id="servicios" style={{ padding: '80px 16px', background: 'var(--bg-secondary)' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', textAlign: 'center' }}>
          <h2 className="section-title">
            Nuestros <span className="text-gold">Servicios</span>
          </h2>
          <p className="section-subtitle" style={{ marginBottom: 48 }}>
            Ofrecemos los mejores servicios para que siempre lucas increíble
          </p>

          {loading ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16 }}>
              {[0, 1, 2].map(i => (
                <div key={i} className="animate-pulse glass-card" style={{ height: '160px', background: '#f0f1ef' }} />
              ))}
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16 }}>
              {services.map((service) => (
                <div key={service.id} className="glass-card" style={{ textAlign: 'center', padding: '32px 20px' }}>
                  <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'center' }}><Scissors size={40} color="var(--gold-primary)" /></div>
                  <h3 style={{ fontWeight: 700, marginBottom: 8, fontSize: 16 }}>{service.name}</h3>
                  <div className="text-gold" style={{ fontSize: 28, fontWeight: 900, marginBottom: 4 }}>
                    {(service.category || '').toLowerCase().includes('tatuaj') && <span style={{ fontSize: 16, fontWeight: 700, marginRight: 4 }}>Desde</span>}
                    ${service.price}
                  </div>
                  {service.duration && <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>{formatDuration(service.duration)}</div>}
                </div>
              ))}
            </div>
          )}

          <div style={{ marginTop: 32 }}>
            <Link to="/servicios" style={{ color: 'var(--champagne)', fontWeight: 700, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 15 }}>
              Ver todos los servicios <ChevronRight size={16} />
            </Link>
          </div>
        </div>
      </section>

      {/* Barbers */}
      <section style={{ padding: '80px 16px' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', textAlign: 'center' }}>
          <h2 className="section-title">
            Nuestros <span className="text-gold">Odontólogos</span>
          </h2>
          <p className="section-subtitle" style={{ marginBottom: 48 }}>
            Elige tu odontólogo favorito para tu próxima cita
          </p>

          {loading ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
              {[0, 1, 2].map(i => (
                <div key={i} className="animate-pulse glass-card" style={{ height: '220px', background: '#f0f1ef' }} />
              ))}
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
              {barbers.map((barber) => {
                const barberReviews = reviews.filter(r => r.staff_id === barber.id);
                const avgRating = barberReviews.length > 0
                  ? (barberReviews.reduce((acc, r) => acc + r.rating, 0) / barberReviews.length).toFixed(1)
                  : null;

                return (
                  <div key={barber.id} className="glass-card" style={{ textAlign: 'center', padding: '32px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'space-between', minHeight: '320px' }}>
                    <div>
                      <div style={{
                        width: 80,
                        height: 80,
                        borderRadius: '50%',
                        background: 'var(--gold-gradient)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        margin: '0 auto 16px',
                        overflow: 'hidden',
                      }}>
                        {barber.image_url ? (
                          <img src={barber.image_url} alt={barber.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                          <Users size={32} color="#ffffff" />
                        )}
                      </div>
                      <h3 style={{ fontWeight: 700, fontSize: 18, marginBottom: 4 }}>{barber.name}</h3>
                      <p style={{ color: 'var(--champagne)', fontSize: 14, margin: 0 }}>{roleLabel(barber.role?.split('|')[0])}</p>
                      
                      {avgRating && (
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: 8, color: 'var(--gold-primary)', fontSize: 13, fontWeight: '700' }}>
                          <Star size={14} fill="var(--gold-primary)" color="var(--gold-primary)" />
                          <span>{avgRating} ({barberReviews.length} {barberReviews.length === 1 ? 'reseña' : 'reseñas'})</span>
                        </div>
                      )}
                    </div>

                    <button
                      onClick={() => setSelectedBarberForReview(barber)}
                      style={{
                        marginTop: 16,
                        background: '#ffffff',
                        border: '1px solid rgba(217, 192, 143, 0.25)',
                        color: '#111111',
                        padding: '8px 16px',
                        borderRadius: '20px',
                        fontSize: 12,
                        fontWeight: '700',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6
                      }}
                      onMouseEnter={e => { e.currentTarget.style.background = '#e8d4b0'; e.currentTarget.style.color = '#111111'; }}
                      onMouseLeave={e => { e.currentTarget.style.background = '#ffffff'; e.currentTarget.style.color = '#111111'; }}
                    >
                      <Star size={12} /> Dejar Reseña
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* CTA */}
      <section style={{
        padding: '80px 16px',
        background: 'var(--gold-gradient)',
        textAlign: 'center',
      }}>
        <div style={{ maxWidth: 700, margin: '0 auto' }}>
          <h2 style={{ fontSize: 'clamp(2rem, 4vw, 3rem)', fontWeight: 900, color: '#ffffff', marginBottom: 16, letterSpacing: -1 }}>
            ¿Listo para tu mejor sonrisa?
          </h2>
          <p style={{ color: 'rgba(255,255,255,0.85)', fontSize: 18, marginBottom: 32 }}>
            Reserva ahora y obtén un 10% de descuento en tu primera cita
          </p>
          <Link
            to={isLoggedIn ? '/agendar' : '/login'}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              background: '#ffffff',
              color: '#111111',
              padding: '14px 32px',
              borderRadius: 'var(--radius-pill)',
              fontWeight: 800,
              fontSize: 16,
              textDecoration: 'none',
              transition: 'transform 0.2s',
            }}
          >
            Reservar Mi Cita <ChevronRight size={20} />
          </Link>
        </div>
      </section>
      {/* Modal de Reseñas */}
      {selectedBarberForReview && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.8)',
          backdropFilter: 'blur(10px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 99999,
          padding: 16
        }}>
          <div className="glass-card" style={{
            width: '100%',
            maxWidth: 450,
            padding: 32,
            borderRadius: 24,
            position: 'relative'
          }}>
            <button 
              onClick={() => setSelectedBarberForReview(null)}
              style={{
                position: 'absolute',
                top: 20,
                right: 20,
                background: '#f0f1ef',
                border: 'none',
                borderRadius: '50%',
                color: '#111111',
                width: 32,
                height: 32,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              ✕
            </button>

            <h3 style={{ fontSize: 20, fontWeight: 900, marginBottom: 8 }}>Dejar Reseña Anónima</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 24 }}>
              Tu opinión ayuda a mejorar nuestro servicio. Reseña para: <strong style={{ color: '#111111' }}>{selectedBarberForReview.name}</strong>.
            </p>

            <form onSubmit={handleReviewSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              {/* Star Rating Select */}
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 900, color: 'var(--text-muted)', marginBottom: 8, letterSpacing: 1 }}>VALORACIÓN</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setNewRating(star)}
                      style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        padding: 0
                      }}
                    >
                      <Star 
                        size={28} 
                        fill={star <= newRating ? 'var(--gold-primary)' : 'none'} 
                        color={star <= newRating ? 'var(--gold-primary)' : 'rgba(17,17,17,0.25)'} 
                      />
                    </button>
                  ))}
                </div>
              </div>

              {/* Comment Input */}
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 900, color: 'var(--text-muted)', marginBottom: 8, letterSpacing: 1 }}>COMENTARIO (OPCIONAL)</label>
                <textarea
                  placeholder="Escribe tu opinión de forma anónima..."
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  style={{
                    width: '100%',
                    height: 100,
                    borderRadius: 12,
                    background: '#ffffff',
                    border: '1px solid rgba(217, 192, 143, 0.25)',
                    color: '#0f172a',
                    padding: 12,
                    fontSize: 14,
                    outline: 'none',
                    resize: 'none'
                  }}
                />
              </div>

              <button
                type="submit"
                disabled={submittingReview}
                className="btn-gold"
                style={{
                  width: '100%',
                  height: 48,
                  borderRadius: 12,
                  fontWeight: 900,
                  fontSize: 15,
                  cursor: 'pointer'
                }}
              >
                {submittingReview ? 'Enviando...' : 'Enviar Reseña'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
