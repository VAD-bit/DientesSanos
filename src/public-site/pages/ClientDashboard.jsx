import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { publicService } from '../services/publicService';
import { roleLabel } from '../../utils/staffRoles';
import { Calendar, Clock, Scissors, ChevronRight, Crown, User, Wallet, X, Sparkles, TrendingUp, ArrowUpRight, RotateCw, Settings, Check, Star, Loader2, Zap, Droplet, Gem, ThumbsUp, Smile, Frown, AlertCircle, MessageSquare } from 'lucide-react';
import pandaLogo from '../../assets/panda_logo_black.png';
import pandaIcon from '../../assets/panda_logo_nobg.png';

const getGreeting = () => {
  const h = new Date().getHours();
  if (h < 12) return 'Buenos días';
  if (h < 19) return 'Buenas tardes';
  return 'Buenas noches';
};

const cleanStaffName = (name) => {
  if (!name) return 'P';
  return name.replace(/\(demo\)/gi, '').trim();
};

const getRatingBadge = (val) => {
  if (val === 5) return { text: '¡Excelente!', icon: Gem, color: 'var(--champagne)' };
  if (val === 4) return { text: 'Muy bueno', icon: ThumbsUp, color: '#475569' };
  if (val === 3) return { text: 'Normal', icon: Smile, color: '#64748b' };
  if (val === 2) return { text: 'Regular', icon: Frown, color: '#64748b' };
  if (val === 1) return { text: 'Por mejorar', icon: AlertCircle, color: '#ff6b6b' };
  return null;
};

function StarRatingRow({ label, icon: Icon, value, onChange }) {
  const badge = getRatingBadge(value);
  const BadgeIcon = badge?.icon;
  
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, padding: '8px 0' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Icon size={14} color="var(--champagne)" style={{ opacity: 0.8 }} />
          <span style={{ fontSize: 13, fontWeight: 700, color: '#334155' }}>{label}</span>
        </div>
        <AnimatePresence mode="wait">
          {badge && (
            <motion.span
              key={badge.text}
              initial={{ opacity: 0, x: 10, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: -10, scale: 0.9 }}
              transition={{ type: 'spring', stiffness: 300, damping: 20 }}
              style={{
                fontSize: 10,
                fontWeight: 800,
                color: badge.color,
                background: '#ffffff',
                padding: '3px 8px',
                borderRadius: '8px',
                border: '1px solid rgba(217, 192, 143, 0.2)',
                display: 'flex',
                alignItems: 'center',
                gap: 4
              }}
            >
              {BadgeIcon && <BadgeIcon size={11} />}
              <span>{badge.text}</span>
            </motion.span>
          )}
        </AnimatePresence>
      </div>
      <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-start' }}>
        {[1, 2, 3, 4, 5].map(star => {
          const isActive = star <= value;
          return (
            <motion.button 
              key={star} 
              type="button"
              onClick={() => onChange(star)} 
              whileHover={{ scale: 1.2 }}
              whileTap={{ scale: 0.85 }}
              style={{ background: 'none', border: 'none', padding: 4, cursor: 'pointer' }}
            >
              <Star
                size={24}
                fill={isActive ? 'var(--champagne)' : 'none'}
                stroke={isActive ? 'var(--champagne)' : '#cbd5e1'}
                style={{ 
                  transition: 'stroke 0.2s, fill 0.2s', 
                  filter: isActive ? 'drop-shadow(0 0 8px rgba(17,17,17,0.5))' : 'none' 
                }}
              />
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}



export default function ClientDashboard() {
  const navigate = useNavigate();
  const [client, setClient] = useState(() => {
    try { return JSON.parse(localStorage.getItem('panda_public_client') || 'null'); }
    catch { return null; }
  });

  const [nextAppointment, setNextAppointment] = useState(null);
  const [historyAppointments, setHistoryAppointments] = useState([]);

  const [favoriteStaff, setFavoriteStaff] = useState([]);
  const [allStaff, setAllStaff] = useState([]);
  const [showFavoritesModal, setShowFavoritesModal] = useState(false);
  const [isClosingFavorites, setIsClosingFavorites] = useState(false);
  const [points, setPoints] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showApptModal, setShowApptModal] = useState(false);
  const [isClosingModal, setIsClosingModal] = useState(false);

  // Rating States
  const [pendingRating, setPendingRating] = useState(null);
  const [ratingModal, setRatingModal] = useState(null);
  const [ratings, setRatings] = useState({ rapidez: 0, limpieza: 0, habilidad: 0 });
  const [ratingComment, setRatingComment] = useState('');
  const [ratingSaving, setRatingSaving] = useState(false);
  const [showCommentInput, setShowCommentInput] = useState(false);
  const [ratingSubmitted, setRatingSubmitted] = useState(false);
  const [isClosingRating, setIsClosingRating] = useState(false);

  const closeRatingModal = () => {
    setIsClosingRating(true);
    setTimeout(() => {
      setRatingModal(null);
      setIsClosingRating(false);
    }, 300); // Wait for exit animation
  };

  const handleCloseModal = () => {
    setIsClosingModal(true);
    setTimeout(() => {
      setShowApptModal(false);
      setIsClosingModal(false);
    }, 400); // Wait for exit animation
  };

  const handleCloseFavorites = () => {
    setShowFavoritesModal(false);
  };

  useEffect(() => {
    if (!client) { navigate('/login'); return; }
    const load = async () => {


      try {
        setLoading(true);
        const pts = await publicService.getClientPoints(client.id);
        setPoints(pts || 0);
        const userAppts = await publicService.getClientAppointments(client.id);
        const valid = userAppts.filter(a => !(a.status || '').toLowerCase().includes('cancelad'));
        const completed = valid.filter(a => a.status === 'Completado' || a.status === 'Pagado');
        const now = new Date();
        // A client already checked in (walk-in "En Silla"/"En Lavado"/"Por Pagar")
        // has no scheduled_at and is happening right now - show that before any
        // future booking, since it's more relevant than a countdown to later.
        const liveStatuses = ['En Silla', 'En Lavado', 'Por Pagar'];
        const live = valid.filter(a => liveStatuses.includes(a.status));
        const upcoming = valid.filter(a => a.scheduled_at && new Date(a.scheduled_at) > now && (a.status === 'Agendado' || a.status === 'Confirmado'));
        if (live.length > 0) {
          live.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
          setNextAppointment(live[0]);
        } else if (upcoming.length > 0) {
          upcoming.sort((a, b) => new Date(a.scheduled_at) - new Date(b.scheduled_at));
          setNextAppointment(upcoming[0]);
        }
        const staffList = await publicService.getStaff();
        setAllStaff(staffList);

        const hist = completed.sort((a, b) => new Date(b.scheduled_at) - new Date(a.scheduled_at));
        setHistoryAppointments(hist);



        if (hist.length > 0) {
          const mostRecent = hist[0];
          if (mostRecent.staff_id) {
            try {
              const reviewed = await publicService.hasClientReviewed(mostRecent.id);
              if (!reviewed) {
                setPendingRating(mostRecent);
                const isDismissed = sessionStorage.getItem(`dismissed_rating_${mostRecent.id}`) === 'true';
                if (!isDismissed) {
                  setRatingModal(mostRecent);
                }
              }
            } catch (err) {
              console.error('Error checking review status:', err);
            }
          }
        }

        try {
          const favIds = JSON.parse(localStorage.getItem('favorite_barbers') || '[]');
          if (favIds.length > 0) {
            setFavoriteStaff(staffList.filter(s => favIds.includes(s.id)));
          }
        } catch (err) {}
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    };
    load();
  }, [client?.id]);

  const removeFavorite = (e, staffId) => {
    e.stopPropagation();
    try {
      const favIds = JSON.parse(localStorage.getItem('favorite_barbers') || '[]');
      const newFavs = favIds.filter(id => id !== staffId);
      localStorage.setItem('favorite_barbers', JSON.stringify(newFavs));
      setFavoriteStaff(prev => prev.filter(s => s.id !== staffId));
    } catch (err) {}
  };

  const toggleFavorite = (staff) => {
    try {
      const favIds = JSON.parse(localStorage.getItem('favorite_barbers') || '[]');
      let newFavs;
      if (favIds.includes(staff.id)) {
        newFavs = favIds.filter(id => id !== staff.id);
        setFavoriteStaff(prev => prev.filter(s => s.id !== staff.id));
      } else {
        newFavs = [...favIds, staff.id];
        setFavoriteStaff(prev => [...prev, staff]);
      }
      localStorage.setItem('favorite_barbers', JSON.stringify(newFavs));
    } catch (err) {}
  };

  const submitRating = async () => {
    if (!ratingModal || ratings.rapidez === 0 || ratings.limpieza === 0 || ratings.habilidad === 0) return;
    setRatingSaving(true);
    try {
      await publicService.submitStaffReview({
        staff_id: ratingModal.staff_id,
        client_id: client?.id,
        appointment_id: ratingModal.id,
        rapidez: ratings.rapidez,
        limpieza: ratings.limpieza,
        habilidad: ratings.habilidad,
        comment: ratingComment || null
      });


      // Set to submitted to trigger success screen
      setRatingSubmitted(true);
      
      // Smoothly dismiss after showing the thank-you screen for 2.5s
      setTimeout(() => {
        // 1. Close modal first (starts exit transition showing success screen)
        setPendingRating(null);
        setIsClosingRating(true);
        setTimeout(() => {
          setRatingModal(null);
          setIsClosingRating(false);
          setRatingSubmitted(false);
          setRatings({ rapidez: 0, limpieza: 0, habilidad: 0 });
          setRatingComment('');
          setShowCommentInput(false);
        }, 300);
      }, 2500);

    } catch (e) {
      console.error('Error submitting rating:', e);
    } finally {
      setRatingSaving(false);
    }
  };

  // Removed loading block so UI renders immediately and updates fluidly when data arrives
  const firstName = client?.name?.split(' ')[0] || 'Cliente';
  const totalVisits = historyAppointments.length;
  // Guard against corrupted total_price values (e.g. a Bs price entered where
  // a USD price was expected in checkout, producing near-zero fractions) by
  // falling back to the linked service's real price when total_price looks
  // implausibly small for a paid service.
  const getVisitPrice = (a) => {
    const stored = Number(a.total_price || 0);
    const servicePrice = Number(a.services?.price || 0);
    if (stored > 0 && stored < 1 && servicePrice >= 1) return servicePrice;
    return stored || servicePrice;
  };
  const totalSpent = historyAppointments.reduce((s, a) => s + getVisitPrice(a), 0);
  const lastAppt = historyAppointments[0];

  // Walk-in visits ("En Silla") never had a scheduled_at set — fall back to
  // when the visit was actually completed/created instead of showing epoch.
  const getApptDate = (a) => {
    const raw = a?.scheduled_at || a?.completed_at || a?.created_at;
    if (!raw) return null;
    const d = new Date(raw);
    return isNaN(d.getTime()) ? null : d;
  };

  const displayAppt = nextAppointment;

  return (
    <div className="db-root animate-fade-in-up" style={{ animationDelay: '0ms' }}>

      {/* ── GREETING HERO ── */}
      <div className="db-hero">
        <div className="db-hero-left">
          <span className="db-greeting-sub">{getGreeting()},</span>
          <h1 className="db-greeting-name">{firstName}</h1>
        </div>
        <div className="flex items-center gap-4">
          <button className="db-settings-btn" onClick={() => navigate('/perfil/ajustes')} aria-label="Ajustes de cuenta">
            <Settings size={20} />
          </button>
          <div className="db-hero-avatar">
            <img src={pandaLogo} alt="Dientes Sanos" />
          </div>
        </div>
      </div>

      {/* ── HERO BANNER (PENDING RATING) ── */}
      {pendingRating && !ratingModal && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          style={{
            margin: '0 0 20px 0',
            padding: '16px 20px',
            borderRadius: '24px',
            background: 'linear-gradient(135deg, rgba(17,17,17, 0.15) 0%, rgba(17,17,17, 0.05) 100%)',
            border: '1px solid rgba(17,17,17, 0.25)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 16,
            cursor: 'pointer',
            boxShadow: '0 4px 24px rgba(0,0,0,0.10)',
          }}
          onClick={() => setRatingModal(pendingRating)}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{
              width: 40, height: 40, borderRadius: '50%',
              background: 'rgba(17,17,17, 0.2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'var(--champagne)', flexShrink: 0
            }}>
              <Star size={20} fill="var(--champagne)" />
            </div>
            <div style={{ textAlign: 'left' }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#0f172a', marginBottom: 2 }}>
                Califica tu servicio con {pendingRating.staff?.name || 'tu odontólogo'}
              </div>
              <div style={{ fontSize: 12, color: '#475569' }}>
                Cuéntanos cómo estuvo tu experiencia para ayudarnos a mejorar.
              </div>
            </div>
          </div>
          <ChevronRight size={18} color="#64748b" />
        </motion.div>
      )}

      {/* ── MAIN GRID ── */}
      <div className="db-grid">

        {/* LEFT: Appointment card + Book button */}
        <div className="db-col-left">

          {/* APPOINTMENT CARD */}
          {displayAppt ? (() => {
            const isLive = ['En Silla', 'En Lavado', 'Por Pagar'].includes(displayAppt.status);
            const d = displayAppt.scheduled_at ? new Date(displayAppt.scheduled_at) : null;
            const ms = d ? d - new Date() : 0;
            const days = Math.floor(ms / 86400000);
            const hours = Math.floor((ms % 86400000) / 3600000);
            const mins = Math.floor((ms % 3600000) / 60000);
            return (
              <div className="appt-card has-appt">
                <img
                  src={displayAppt.staff?.image_url || 'https://images.unsplash.com/photo-1599566150163-29194dcaad36?w=800&q=80'}
                  alt="" className="appt-bg-img"
                />
                <div className="appt-bg-overlay" />
                <div className="appt-content">
                  <div className="appt-badge-row">
                    {isLive ? (
                      <span className="appt-confirmed-badge"><Check size={10} strokeWidth={4} /> EN CURSO</span>
                    ) : displayAppt.status?.toLowerCase() === 'agendado' ? (
                      <span className="appt-pending-badge"><Clock size={10} strokeWidth={4} /> AGENDADA</span>
                    ) : (
                      <span className="appt-confirmed-badge"><Check size={10} strokeWidth={4} /> CONFIRMADA</span>
                    )}
                    <span className="appt-step-label">{isLive ? 'Te están atendiendo' : 'Próxima cita'}</span>
                  </div>
                  {!isLive && d && (
                    <div className="appt-countdown">
                      {days > 0 && <div className="countdown-block"><span className="cb-num">{days}</span><span className="cb-lbl">{days === 1 ? 'día' : 'días'}</span></div>}
                      <div className="countdown-block"><span className="cb-num">{days > 0 ? hours : Math.max(0, Math.floor(ms / 3600000))}</span><span className="cb-lbl">hrs</span></div>
                      {days === 0 && <div className="countdown-block"><span className="cb-num">{Math.max(0, mins)}</span><span className="cb-lbl">min</span></div>}
                    </div>
                  )}
                  <div className="appt-details-row">
                    {d ? (
                      <div className="appt-date-block">
                        <span className="appt-weekday">{d.toLocaleDateString('es', { weekday: 'long' })}</span>
                        <div className="appt-daynum-row">
                          <span className="appt-daynum">{d.getDate()}</span>
                          <span className="appt-month">{d.toLocaleDateString('es', { month: 'short' })}</span>
                        </div>
                      </div>
                    ) : (
                      <div className="appt-date-block">
                        <span className="appt-weekday">ahora</span>
                      </div>
                    )}
                    <div className="appt-info-pills">
                      {d && <div className="appt-pill"><Clock size={12} />{d.toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit', hour12: true })}</div>}
                      {displayAppt.services?.name && <div className="appt-pill"><Scissors size={12} />{displayAppt.services.name}</div>}
                      <div className="appt-pill barber-pill">
                        <img src={`https://ui-avatars.com/api/?name=${encodeURIComponent(displayAppt.staff?.name || 'P')}&background=2a2a2a&color=CBB79A`} alt="" className="pill-avatar" />
                        {displayAppt.staff?.name?.split(' ')[0]}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })() : (
            /* EMPTY STATE — branded & premium */
            <div 
              className="appt-card empty-appt" 
              onClick={() => {
                localStorage.removeItem('bookingState');
                navigate('/perfil/reservar', { state: { startBooking: true } });
              }}
            >
              <div className="appt-bg-img" style={{ background: 'linear-gradient(135deg,#f7f4ee 0%,#efe6d5 50%,#e8d4b0 100%)' }} />
              <div className="appt-bg-overlay" />

              {/* Atmospheric background orbs */}
              <div className="ea-orb ea-orb1" />
              <div className="ea-orb ea-orb2" />
              <div className="ea-orb ea-orb3" />

              {/* Rotating gold border */}
              <div className="ea-border-ring" />

              <div className="ea-content">
                {/* Brand mark */}
                <div className="ea-logo-ring">
                  <img src={pandaLogo} alt="Dientes Sanos" className="ea-logo-img" />
                </div>

                <div className="ea-text">
                  <h3 className="ea-title">Tu sillón te espera</h3>
                  <p className="ea-subtitle">Reserva en segundos. Vive la Experiencia Dientes Sanos.</p>
                </div>

                <div className="ea-cta">
                  Reservar ahora
                  <ArrowUpRight size={14} />
                </div>
              </div>
            </div>
          )}

          {/* FAVORITES */}
          <div className="mt-8 flex flex-col gap-4">
            <h3 className="text-[#111111] font-extrabold text-xs tracking-widest uppercase flex items-center gap-2 mb-1">
              <Crown size={14} className="text-[#111111]" /> Tus Favoritos
            </h3>
            <div className="flex gap-4 overflow-x-auto hide-scrollbar py-2 px-1" style={{ touchAction: 'pan-x pan-y' }}>
              {favoriteStaff.map(staff => (
                <div key={staff.id} className="flex flex-col items-center gap-2 cursor-pointer group relative" onClick={() => {
                  localStorage.removeItem('bookingState');
                  navigate('/perfil/reservar', { state: { startBooking: true, prefillStaff: staff.id } });
                }}>
                  <div className="w-[72px] h-[72px] rounded-full overflow-hidden border border-[#d9c08f]/15 group-hover:border-[#111111] group-hover:scale-105 transition-all relative">
                    <img src={staff.image_url || 'https://images.unsplash.com/photo-1599566150163-29194dcaad36?w=200&q=80'} alt={staff.name} className="w-full h-full object-cover object-top" />
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center transition-all">
                      <Scissors size={16} className="text-[#111111] mb-1" />
                      <span className="text-[8px] font-black tracking-widest text-[#111111] uppercase">Reservar</span>
                    </div>
                  </div>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      removeFavorite(e, staff.id);
                    }}
                    className="absolute -top-2 -right-2 w-8 h-8 bg-white border border-[#d9c08f]/15 rounded-full flex items-center justify-center text-[#64748b] hover:text-red-500 hover:border-red-500 hover:scale-110 transition-all opacity-100 lg:opacity-0 lg:group-hover:opacity-100 z-10 shadow-lg"
                    title="Quitar de favoritos"
                  >
                    <X size={16} strokeWidth={2.5} />
                  </button>
                  <span className="text-[10px] text-[#0f172a] font-bold tracking-wider uppercase">{staff.name.split(' ')[0]}</span>
                </div>
              ))}
              
              {/* ADD FAVORITE BUTTON */}
              <div className="flex flex-col items-center gap-2 cursor-pointer group" onClick={() => setShowFavoritesModal(true)}>
                <div className="w-[72px] h-[72px] rounded-full border border-dashed border-[#d9c08f]/30 group-hover:border-[#111111] flex items-center justify-center transition-all bg-[#f7f7f5] group-hover:bg-[#111111]/10">
                  <span className="text-[#94a3b8] group-hover:text-[#111111] text-2xl font-light mb-1">+</span>
                </div>
                <span className="text-[10px] text-[#64748b] group-hover:text-[#111111] font-bold tracking-wider uppercase">Agregar</span>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT: Club + Stats + History */}
        <div className="db-col-right">

          {/* CLUB SONRISA VIP CARD */}
          <div className="club-card" onClick={() => navigate('/perfil/club')}>
            <div className="club-bg-shine" />
            <div className="club-content">
              <div className="club-left">
                <div className="club-crown-wrap">
                  <Crown size={20} color="#111111" />
                </div>
                <div>
                  <div className="club-title">Club Sonrisa VIP</div>
                  <div className="club-pts">{points} <span>puntos</span></div>
                </div>
              </div>
              <ChevronRight size={18} color="rgba(0,0,0,0.5)" />
            </div>
          </div>

          {/* STATS ROW */}
          <div className="stats-row">
            <div className="stat-card">
              <div className="stat-icon-wrap"><TrendingUp size={15} color="var(--champagne)" /></div>
              <span className="stat-val">{totalVisits}</span>
              <span className="stat-lbl">Visitas</span>
            </div>
            <div className="stat-card">
              <div className="stat-icon-wrap"><Wallet size={15} color="var(--champagne)" /></div>
              <span className="stat-val">${totalSpent.toLocaleString()}</span>
              <span className="stat-lbl">Invertido</span>
            </div>
            <div className="stat-card">
              <div className="stat-icon-wrap"><Calendar size={15} color="var(--champagne)" /></div>
              <span className="stat-val" style={{ fontSize: lastAppt ? 14 : 20 }}>
                {lastAppt && getApptDate(lastAppt) ? getApptDate(lastAppt).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' }) : '—'}
              </span>
              <span className="stat-lbl">Última cita</span>
            </div>
          </div>

          {/* VISIT HISTORY */}
          <div className="history-card">
            <div className="hc-header">
              <span className="hc-title">Últimas visitas</span>
              <span className="hc-link" onClick={() => navigate('/perfil/citas')}>Ver todo →</span>
            </div>

            <div className="hc-list">
              {historyAppointments.slice(0, 3).map((a, i) => (
                <div key={i} className="hc-item">
                  <div className="hci-avatar">
                    <img src={a.staff?.image_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(a.staff?.name || 'P')}&background=d9c08f&color=111111&size=64`} alt="" style={{ objectFit: 'cover' }} />
                  </div>
                  <div className="hci-info">
                    <div className="hci-service">{a.services?.name}</div>
                    <div className="hci-meta">
                      {getApptDate(a) ? getApptDate(a).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Fecha no disponible'}
                      &nbsp;·&nbsp;
                      con {a.staff?.name?.split(' ')[0]}
                    </div>
                  </div>
                  <div className="hci-action" style={{ marginLeft: 'auto' }}>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate('/perfil/reservar', { 
                          state: { 
                            prefillStaff: a.staff_id, 
                            prefillService: a.service_id,
                            prefillBeverage: a.beverage
                          } 
                        });
                      }}
                      className="hci-repeat-btn"
                    >
                      <RotateCw size={12} />
                      <span>Repetir</span>
                    </button>
                  </div>
                </div>
              ))}
              {historyAppointments.length === 0 && (
                <div className="hc-empty">
                  <Calendar size={20} color="#94a3b8" />
                  <span>Aún no hay visitas registradas</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* APPT DETAIL MODAL - APPLE WALLET TICKET STYLE */}
      {showApptModal && displayAppt && (
        <div className={`db-modal-overlay ${isClosingModal ? 'closing' : ''}`} onClick={handleCloseModal}>
          <div className={`db-modal-ticket ${isClosingModal ? 'closing' : ''}`} onClick={e => e.stopPropagation()}>
            
            {/* TICKET HEADER */}
            <div className="ticket-header">
              <div className="ticket-header-content">
                <div className="ticket-brand">
                  <img src={pandaLogo} alt="Dientes Sanos" className="ticket-logo" />
                  <span>DIENTES SANOS</span>
                </div>
                <button className="ticket-close" onClick={handleCloseModal}><X size={16} /></button>
              </div>
              <h3 className="ticket-title">Reserva Confirmada</h3>
              <div className="ticket-status-pill">
                <span className="pulse-dot"></span>
                Vigente
              </div>
            </div>

            {/* TICKET BODY */}
            <div className="ticket-body">
              {/* SERVICE HERO */}
              <div className="ticket-service-hero">
                <div className="tsh-icon"><Scissors size={24} color="var(--champagne)" /></div>
                <h2 className="tsh-name">{displayAppt.services?.name}</h2>
              </div>

              {/* BARBER INFO */}
              <div className="ticket-barber-row">
                <div className="tbr-avatar">
                  <img src={displayAppt.staff?.image_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(displayAppt.staff?.name || 'P')}&background=d9c08f&color=111111`} alt={displayAppt.staff?.name} />
                </div>
                <div className="tbr-info">
                  <span className="tbr-label">Especialista</span>
                  <span className="tbr-name">{displayAppt.staff?.name}</span>
                </div>
              </div>

              {/* DATE & TIME GRID */}
              <div className="ticket-datetime-grid">
                <div className="tdg-box">
                  <span className="tdg-label">Fecha</span>
                  <span className="tdg-val">{displayAppt.scheduled_at ? new Date(displayAppt.scheduled_at).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Hoy'}</span>
                </div>
                <div className="tdg-box">
                  <span className="tdg-label">Hora</span>
                  <span className="tdg-val">{displayAppt.scheduled_at ? new Date(displayAppt.scheduled_at).toLocaleTimeString('es-ES', { hour: 'numeric', minute: '2-digit', hour12: true }).toUpperCase() : 'Ahora'}</span>
                </div>
              </div>
            </div>

            {/* TICKET FOOTER */}
            <div className="ticket-footer">
              <div className="tf-barcode">
                {/* Fake Barcode lines */}
                <div className="bar"></div><div className="bar w2"></div><div className="bar w3"></div><div className="bar"></div><div className="bar w2"></div>
                <div className="bar"></div><div className="bar w3"></div><div className="bar"></div><div className="bar w2"></div><div className="bar"></div>
              </div>
            </div>
            
            {/* TICKET CUTOUTS */}
            <div className="ticket-cutout left"></div>
            <div className="ticket-cutout right"></div>
          </div>
        </div>
      )}

      {/* ── AUTOMATIC RATING POP-UP MODAL ── */}
      {typeof document !== 'undefined' && createPortal(
        <>
          {ratingModal && (
            <div
              className={`db-modal-overlay ${isClosingRating ? 'closing' : ''}`}
              style={{
                zIndex: 999999,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 16,
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: 'rgba(0,0,0,0.7)',
                backdropFilter: 'blur(20px)',
                WebkitBackdropFilter: 'blur(20px)'
              }}
              onClick={() => {
                sessionStorage.setItem('dismissed_rating_' + ratingModal.id, 'true');
                closeRatingModal();
              }}
            >
              <style>{`
                @keyframes premiumGoldShine {
                  0% { background-position: -200% center; }
                  100% { background-position: 200% center; }
                }
                .btn-premium-gold {
                  background: linear-gradient(90deg, #e8d4b0 0%, #f0e5cf 25%, #faf5ec 50%, #f0e5cf 75%, #e8d4b0 100%) !important;
                  background-size: 200% auto !important;
                  animation: premiumGoldShine 6s linear infinite !important;
                  color: #111111 !important;
                  box-shadow: 0 4px 20px rgba(232,212,176, 0.30) !important;
                  transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1) !important;
                }
                .btn-premium-gold:hover:not(:disabled) {
                  transform: translateY(-2px) scale(1.02) !important;
                  box-shadow: 0 8px 30px rgba(232,212,176, 0.35) !important;
                }
                .btn-premium-gold:active:not(:disabled) {
                  transform: translateY(0) scale(0.98) !important;
                }
                @media (min-width: 900px) {
                  .db-modal-overlay { padding: 48px !important; }
                  .db-modal-ticket { max-width: 380px !important; max-height: 88vh !important; overflow-y: auto !important; }
                }
              `}</style>

              <div
                className={`db-modal-ticket ${isClosingRating ? 'closing' : ''}`}
                style={{
                  maxWidth: 400,
                  width: '100%', 
                  background: 'var(--bg-secondary)',
                  border: '1.5px solid rgba(17,17,17, 0.25)',
                  borderRadius: '32px',
                  padding: '24px 20px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 20,
                  boxShadow: '0 30px 100px rgba(0,0,0,0.10), inset 0 1px 0 rgba(255,255,255,0.8)',
                  overflow: 'hidden',
                  position: 'relative'
                }}
                onClick={e => e.stopPropagation()}
              >
                  {!ratingSubmitted ? (
                    <div
                      style={{ display: 'flex', flexDirection: 'column', gap: 20 }}
                    >
                      {/* Header */}
                      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, fontWeight: 800, color: 'var(--champagne)', letterSpacing: 2 }}>
                          <Star size={14} fill="var(--champagne)" />
                          <span>VALORACIÓN</span>
                        </div>
                      </div>

                      {/* Title / Info */}
                      <div style={{ textAlign: 'center', padding: '10px 0' }}>
                        <div style={{ position: 'relative', width: 74, height: 74, margin: '0 auto 16px' }}>
                          {/* Pulsating ring */}
                          <motion.div
                            animate={{ scale: [1, 1.1, 1], opacity: [0.3, 0.6, 0.3] }}
                            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                            style={{
                              position: 'absolute',
                              top: -3, left: -3, right: -3, bottom: -3,
                              borderRadius: '50%',
                              border: '2px solid var(--champagne)',
                              filter: 'drop-shadow(0 0 8px rgba(17,17,17,0.5))',
                              pointerEvents: 'none'
                            }}
                          />
                          <div style={{
                            width: '100%', height: '100%', borderRadius: '50%', overflow: 'hidden',
                            border: '2px solid rgba(217, 192, 143, 0.2)',
                            background: 'var(--bg-secondary)'
                          }}>
                            <img 
                              src={ratingModal.staff?.image_url || ("https://ui-avatars.com/api/?name=" + encodeURIComponent(cleanStaffName(ratingModal.staff?.name)) + "&background=d9c08f&color=111111")} 
                              alt={ratingModal.staff?.name}
                              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            />
                          </div>
                        </div>
                        <h2 style={{ fontSize: 22, fontWeight: 800, color: '#0f172a', margin: '0 0 6px', letterSpacing: '-0.5px' }}>¿Qué tal estuvo tu cita?</h2>
                        <p style={{ fontSize: 13, color: '#64748b', margin: 0 }}>
                          Califica tu experiencia con <span style={{ color: 'var(--champagne)', fontWeight: 700 }}>{cleanStaffName(ratingModal.staff?.name)}</span>
                        </p>
                      </div>

                      {/* Star Rating sliders */}
                      <div style={{ background: '#f7f7f5', padding: '16px 16px', borderRadius: 24, border: '1px solid rgba(217, 192, 143, 0.15)', display: 'flex', flexDirection: 'column', gap: 8 }}>
                        <StarRatingRow label="Rapidez" icon={Zap} value={ratings.rapidez} onChange={v => setRatings({ ...ratings, rapidez: v })} />
                        <StarRatingRow label="Limpieza" icon={Droplet} value={ratings.limpieza} onChange={v => setRatings({ ...ratings, limpieza: v })} />
                        <StarRatingRow label="Habilidad" icon={Scissors} value={ratings.habilidad} onChange={v => setRatings({ ...ratings, habilidad: v })} />
                      </div>

                      {/* Comment Section (iMessage/Apple style) */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        <AnimatePresence initial={false}>
                          {!showCommentInput && !ratingComment ? (
                            <motion.button
                              type="button"
                              initial={{ opacity: 0, y: 5 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -5 }}
                              onClick={() => setShowCommentInput(true)}
                              style={{
                                background: '#ffffff',
                                border: '1px dashed rgba(17,17,17,0.3)',
                                borderRadius: '16px',
                                padding: '12px',
                                color: '#64748b',
                                fontSize: 13,
                                fontWeight: 600,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: 8,
                                width: '100%'
                              }}
                            >
                              <MessageSquare size={14} color="var(--champagne)" style={{ opacity: 0.8 }} />
                              <span>Escribir un comentario...</span>
                            </motion.button>
                          ) : (
                            <motion.div
                              initial={{ opacity: 0, height: 0, scale: 0.95 }}
                              animate={{ opacity: 1, height: 'auto', scale: 1 }}
                              exit={{ opacity: 0, height: 0, scale: 0.95 }}
                              transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                              style={{ display: 'flex', flexDirection: 'column', gap: 6, overflow: 'hidden' }}
                            >
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <label style={{ fontSize: 12, fontWeight: 700, color: '#64748b', textAlign: 'left' }}>Tu comentario</label>
                                <button 
                                  type="button" 
                                  onClick={() => { setShowCommentInput(false); setRatingComment(''); }}
                                  style={{ background: 'none', border: 'none', color: '#ff6b6b', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}
                                >
                                  Quitar
                                </button>
                              </div>
                              <textarea
                                value={ratingComment}
                                onChange={e => setRatingComment(e.target.value)}
                                placeholder="Escribe aquí tu experiencia..."
                                maxLength={200}
                                autoFocus
                                style={{
                                  width: '100%',
                                  background: '#f7f7f5',
                                  border: '1px solid rgba(217, 192, 143, 0.2)',
                                  borderRadius: 16,
                                  padding: '12px 14px',
                                  color: '#0f172a',
                                  fontSize: 13,
                                  minHeight: 70,
                                  maxHeight: 120,
                                  resize: 'none',
                                  outline: 'none',
                                  boxSizing: 'border-box'
                                }}
                              />
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>

                      {/* Actions */}
                      <div style={{ display: 'flex', gap: 12, marginTop: 4 }}>
                        <button
                          type="button"
                          onClick={() => {
                            sessionStorage.setItem('dismissed_rating_' + ratingModal.id, 'true');
                            closeRatingModal();
                          }}
                          style={{
                            flex: 1,
                            padding: '14px',
                            borderRadius: 'var(--radius-pill)',
                            border: '1px solid rgba(217, 192, 143, 0.25)',
                            background: '#ffffff',
                            color: '#475569',
                            fontWeight: 700,
                            fontSize: 13,
                            cursor: 'pointer',
                            transition: 'all 0.2s'
                          }}
                        >
                          Hacerlo más tarde
                        </button>
                        <button
                          type="button"
                          onClick={submitRating}
                          disabled={ratingSaving || ratings.rapidez === 0 || ratings.limpieza === 0 || ratings.habilidad === 0}
                          className={!(ratings.rapidez === 0 || ratings.limpieza === 0 || ratings.habilidad === 0) ? "btn-premium-gold" : "btn-gold"}
                          style={{
                            flex: 1.2,
                            padding: '14px',
                            borderRadius: 'var(--radius-pill)',
                            fontWeight: 700,
                            fontSize: 13,
                            opacity: (ratings.rapidez === 0 || ratings.limpieza === 0 || ratings.habilidad === 0) ? 0.3 : (ratingSaving ? 0.7 : 1),
                            cursor: (ratingSaving || ratings.rapidez === 0 || ratings.limpieza === 0 || ratings.habilidad === 0) ? 'not-allowed' : 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 6,
                            border: 'none'
                          }}
                        >
                          {ratingSaving ? <Loader2 className="animate-spin" size={16} /> : <Check size={16} />}
                          {ratingSaving ? 'Enviando...' : 'Calificar'}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '40px 10px',
                        textAlign: 'center',
                        gap: 16
                      }}
                    >
                      {/* Animated Golden Checkmark Circle */}
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: 'spring', stiffness: 200, delay: 0.1 }}
                        style={{
                          width: 80, height: 80,
                          borderRadius: '50%',
                          background: 'rgba(17,17,17, 0.1)',
                          border: '2.5px solid var(--champagne)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: 'var(--champagne)',
                          boxShadow: '0 0 25px rgba(17,17,17, 0.3)'
                        }}
                      >
                        <motion.div
                          initial={{ rotate: -45, scale: 0 }}
                          animate={{ rotate: 0, scale: 1 }}
                          transition={{ type: 'spring', stiffness: 150, delay: 0.3 }}
                        >
                          <Check size={40} strokeWidth={3} />
                        </motion.div>
                      </motion.div>

                      <h2 style={{ fontSize: 24, fontWeight: 800, color: '#0f172a', margin: '10px 0 4px', letterSpacing: '-0.5px' }}>
                        ¡Muchas gracias!
                      </h2>
                      <p style={{ fontSize: 13, color: '#64748b', lineHeight: 1.5, maxWidth: 280, margin: 0 }}>
                        Tu opinión nos ayuda a mantener el nivel de la Experiencia Dientes Sanos.
                      </p>
                    </div>
                  )}
              </div>
            </div>
          )}
        </>,
        document.body
      )}

      {/* ── FAVORITES MODAL ── */}
      {typeof document !== 'undefined' && createPortal(
        <AnimatePresence>
        {showFavoritesModal && (
          <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/90 backdrop-blur-md" 
              onClick={handleCloseFavorites} 
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} transition={{ type: "spring", duration: 0.5, bounce: 0 }}
              className="relative w-full max-w-lg bg-white border border-[#d9c08f]/15 rounded-[32px] p-6 md:p-8 shadow-2xl flex flex-col max-h-[85vh] overflow-hidden"
            >
              <button onClick={handleCloseFavorites} className="absolute top-4 right-4 md:top-6 md:right-6 w-10 h-10 flex items-center justify-center rounded-full bg-[#f7f7f5] border border-[#d9c08f]/15 text-[#0f172a] hover:bg-[#e2e8f0] transition-all z-10 shadow-lg">
                <X size={20} />
              </button>
              <div className="mb-6 pr-10 shrink-0">
                <h2 className="text-xl md:text-2xl font-black uppercase text-[#111111] tracking-widest mb-2 flex items-center gap-3">
                <Crown size={28} className="text-[#111111]" />
                TU EQUIPO IDEAL
              </h2>
              <p className="text-[#64748b] text-sm leading-relaxed font-medium">¿Quiénes son los artistas que mejor entienden tu estilo? Selecciona a tus protagonistas para acceder a ellos con un solo toque.</p>
            </div>
            
            <div className="flex-1 overflow-y-auto hide-scrollbar grid grid-cols-2 md:grid-cols-3 gap-4 p-2 pb-6">
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="relative rounded-3xl overflow-hidden h-56 bg-[#f7f7f5] animate-pulse border border-[#d9c08f]/15 flex flex-col justify-end p-5">
                    <div className="w-3/4 h-4 bg-[#e2e8f0] rounded mb-2" />
                    <div className="w-1/2 h-3 bg-[#e2e8f0] rounded" />
                  </div>
                ))
              ) : (
                (() => {
                  const filteredStaff = allStaff.filter(staff => {
                    const role = (staff.role || '').toLowerCase();
                    return role.includes('barbero') || role.includes('tatuador') || role.includes('estilista');
                  });
                  
                  if (filteredStaff.length === 0) {
                    return (
                      <div className="col-span-2 py-12 flex flex-col items-center justify-center text-center">
                        <User size={40} className="text-[#cbd5e1] mb-4" />
                        <p className="text-[#64748b] text-sm font-medium">No se encontraron artistas disponibles.</p>
                      </div>
                    );
                  }

                  return filteredStaff.map(staff => {
                const isFav = favoriteStaff.some(s => s.id === staff.id);
                const memberRole = roleLabel(staff.role) || 'Especialista';
                return (
                  <div key={staff.id} className={`relative rounded-3xl overflow-hidden cursor-pointer group transition-all duration-300 ${isFav ? 'ring-2 ring-[#111111] shadow-[0_0_20px_rgba(17,17,17,0.15)] scale-[1.02]' : 'ring-1 ring-[#d9c08f]/15 hover:ring-[#d9c08f]/40'} h-56`} onClick={() => toggleFavorite(staff)}>
                    
                    {staff.image_url ? (
                      <img src={staff.image_url} alt={staff.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                    ) : (
                      <div className="w-full h-full bg-[#f7f7f5] flex items-center justify-center group-hover:scale-110 transition-transform duration-700">
                        <User size={64} className="text-[#cbd5e1]" />
                      </div>
                    )}
                    
                    {/* Overlay Gradient */}
                    <div className="absolute inset-0 bg-gradient-to-t from-[#0c0c11] via-[#0c0c11]/50 to-transparent pointer-events-none opacity-90" />
                    
                    {/* Content */}
                    <div className="absolute bottom-0 left-0 right-0 p-5 pointer-events-none">
                      <span className="block text-white font-black text-[15px] leading-tight drop-shadow-md mb-1">{staff.name}</span>
                      <span className={`text-[9px] uppercase tracking-widest font-black inline-block ${isFav ? 'text-[#111111]' : 'text-white/50'}`}>{memberRole}</span>
                    </div>

                    {/* Favorite Toggle Button */}
                    <button className={`absolute top-4 right-4 w-9 h-9 rounded-full backdrop-blur-md flex items-center justify-center transition-all duration-300 ${isFav ? 'bg-[#ff453a]/20 border border-[#ff453a]/50 scale-110' : 'bg-black/40 border border-white/20 group-hover:bg-black/60'}`}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill={isFav ? "#ff453a" : "none"} stroke={isFav ? "#ff453a" : "white"} strokeWidth="2.5" className="transition-all"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
                    </button>
                  </div>
                );
              });
            })()
          )}
            </div>
          </motion.div>
        </div>
      )}
      </AnimatePresence>, document.body)}

      <style>{`
        /* ── ROOT ── */
        .db-root {
          width: 100%;
          max-width: 1080px;
          margin: 0 auto;
          padding: 32px 20px 100px;
          font-family: 'General Sans', sans-serif;
        }

        /* ── HERO GREETING ── */
        .db-hero {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          margin-bottom: 36px;
        }
        .db-greeting-sub {
          display: block;
          font-size: 13px;
          font-weight: 500;
          color: #64748b;
          letter-spacing: 0.3px;
          margin-bottom: 4px;
        }
        .db-greeting-name {
          font-size: 36px;
          font-weight: 900;
          color: #0f172a;
          letter-spacing: -1.5px;
          line-height: 1;
          background: linear-gradient(135deg, #0f172a 40%, rgba(17,17,17,0.9) 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          margin: 0;
        }
        .db-hero-avatar {
          width: 52px; height: 52px;
          border-radius: 50%;
          background: linear-gradient(135deg, #111111 0%, #e8d4b0 100%);
          display: flex; align-items: center; justify-content: center;
          padding: 10px;
          box-shadow: 0 0 0 3px rgba(17,17,17,0.2), 0 8px 24px rgba(0,0,0,0.10);
        }
        .db-hero-avatar img { width: 100%; object-fit: contain; }

        /* ── GRID ── */
        .db-grid {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }
        @media (min-width: 960px) {
          .db-grid {
            display: grid;
            grid-template-columns: 1.35fr 1fr;
            gap: 24px;
            align-items: start;
          }
        }
        .db-col-left, .db-col-right {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        /* ── APPOINTMENT CARD BASE ── */
        .appt-card {
          position: relative;
          border-radius: 28px;
          overflow: hidden;
          cursor: default;
          transition: transform 0.4s cubic-bezier(0.2,0.8,0.2,1), box-shadow 0.4s ease;
          /* Without this, iOS has to decide whether a touch here means "scroll the
             page" or "hover/tap this card" before committing to either — with the
             hover transform + transition below, that ambiguity can eat the first
             swipe, so the card appears to shift in place while the page underneath
             doesn't move until you swipe again. Still relevant for .empty-appt,
             which is clickable. */
          touch-action: pan-y;
        }
        /* Only the empty-state card (no upcoming appointment) is clickable — it
           opens the booking flow. The has-appt card below is informational only. */
        .appt-card:hover:not(.has-appt) {
          transform: translateY(-6px) scale(1.01);
        }

        /* WITH APPOINTMENT */
        .has-appt {
          height: 280px;
          box-shadow: 0 20px 60px rgba(0,0,0,0.10);
          border: 1px solid rgba(17,17,17,0.15);
        }
        .appt-bg-img {
          position: absolute; inset: 0;
          width: 100%; height: 100%;
          object-fit: cover; object-position: center 20%;
          opacity: 0.45;
          filter: saturate(0.3) brightness(0.6);
          transition: all 0.6s ease;
        }
        .appt-bg-overlay {
          position: absolute; inset: 0;
          background: linear-gradient(160deg, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.1) 50%, rgba(0,0,0,0.95) 100%);
        }
        .appt-content {
          position: relative; z-index: 2;
          height: 100%;
          display: flex; flex-direction: column;
          justify-content: space-between;
          padding: 20px 22px;
        }
        .appt-badge-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .db-hero {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 24px;
        }
        .db-settings-btn {
          flex-shrink: 0;
          width: 44px; height: 44px;
          border-radius: 14px;
          background: #ffffff;
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          border: 1px solid rgba(217, 192, 143, 0.15);
          color: #64748b;
          display: flex; align-items: center; justify-content: center;
          cursor: pointer;
          transition: all 0.25s cubic-bezier(0.2,0.8,0.2,1);
          touch-action: pan-y;
        }
        .db-settings-btn:hover {
          background: rgba(17,17,17,0.08);
          color: #111111;
          border-color: rgba(17,17,17,0.35);
          transform: rotate(45deg);
        }
        .db-settings-btn:active { transform: rotate(45deg) scale(0.92); }
        .appt-confirmed-badge {
          display: inline-flex; align-items: center; gap: 6px;
          padding: 4px 10px;
          border-radius: 6px;
          background: rgba(16, 185, 129, 0.08);
          border: 1px solid rgba(16, 185, 129, 0.2);
          color: #34d399;
          font-size: 9px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 1.5px;
          backdrop-filter: blur(12px);
        }
        .appt-pending-badge {
          display: inline-flex; align-items: center; gap: 6px;
          padding: 4px 10px;
          border-radius: 6px;
          background: rgba(245, 158, 11, 0.08);
          border: 1px solid rgba(245, 158, 11, 0.2);
          color: #fbbf24;
          font-size: 9px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 1.5px;
          backdrop-filter: blur(12px);
        }

        .appt-step-label {
          font-size: 10px; font-weight: 700;
          color: rgba(255,255,255,0.4);
          text-transform: uppercase; letter-spacing: 1.5px;
        }

        /* COUNTDOWN */
        .appt-countdown {
          display: flex;
          gap: 6px;
          align-self: center;
        }
        .countdown-block {
          display: flex; flex-direction: column; align-items: center;
          background: rgba(0,0,0,0.55);
          backdrop-filter: blur(10px);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 14px;
          padding: 10px 16px;
          min-width: 52px;
        }
        .cb-num {
          font-size: 26px; font-weight: 800;
          color: #fff;
          line-height: 1;
          letter-spacing: -1px;
        }
        .cb-lbl {
          font-size: 9px; font-weight: 700;
          color: var(--champagne);
          text-transform: uppercase; letter-spacing: 1px;
          margin-top: 4px;
        }

        /* DETAILS ROW */
        .appt-details-row {
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
        }
        .appt-date-block { display: flex; flex-direction: column; }
        .appt-weekday {
          font-size: 11px; font-weight: 800;
          color: var(--champagne);
          text-transform: uppercase; letter-spacing: 2px;
        }
        .appt-daynum-row { display: flex; align-items: baseline; gap: 5px; }
        .appt-daynum { font-size: 46px; font-weight: 900; color: #fff; line-height: 1; letter-spacing: -2px; }
        .appt-month { font-size: 16px; font-weight: 700; color: rgba(255,255,255,0.6); text-transform: uppercase; }

        .appt-info-pills {
          display: flex; flex-direction: column;
          align-items: flex-end; gap: 5px;
        }
        .appt-pill {
          display: flex; align-items: center; gap: 6px;
          padding: 5px 11px;
          background: rgba(255,255,255,0.08);
          backdrop-filter: blur(8px);
          border: 1px solid rgba(255,255,255,0.12);
          border-radius: 99px;
          font-size: 12px; font-weight: 600; color: #fff;
        }
        .barber-pill { background: rgba(0,0,0,0.7); border-color: rgba(17,17,17,0.4); color: var(--champagne); }
        .pill-avatar { width: 16px; height: 16px; border-radius: 50%; object-fit: cover; }

        /* ── EMPTY APPOINTMENT CARD ── */
        .empty-appt {
          cursor: pointer;
          height: 260px;
          background: #0a0a0c;
          border: 1px solid rgba(217, 192, 143, 0.15);
          box-shadow: 0 20px 60px rgba(0,0,0,0.10);
          display: flex; align-items: center; justify-content: center;
        }
        .empty-appt:hover { box-shadow: 0 30px 80px rgba(0,0,0,0.12), 0 0 0 1px rgba(17,17,17,0.25); }

        /* background orbs */
        .ea-orb {
          position: absolute; border-radius: 50%;
          pointer-events: none; filter: blur(40px);
        }
        .ea-orb1 {
          width: 200px; height: 200px;
          background: radial-gradient(circle, rgba(17,17,17,0.1) 0%, transparent 70%);
          top: -40px; left: 50%; transform: translateX(-50%);
        }
        .ea-orb2 {
          width: 120px; height: 120px;
          background: radial-gradient(circle, rgba(139,92,26,0.12) 0%, transparent 70%);
          bottom: -20px; right: 30px;
        }
        .ea-orb3 {
          width: 80px; height: 80px;
          background: radial-gradient(circle, rgba(17,17,17,0.06) 0%, transparent 70%);
          bottom: 40px; left: 40px;
        }

        /* spinning ring */
        .ea-border-ring {
          position: absolute; inset: -1px;
          border-radius: 28px;
          background: conic-gradient(
            from 0deg,
            transparent 0deg,
            rgba(17,17,17,0.6) 60deg,
            transparent 120deg
          );
          animation: ringRotate 4s linear infinite;
          -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
          -webkit-mask-composite: xor;
          mask-composite: exclude;
          padding: 1px;
          opacity: 0.6;
        }
        @keyframes ringRotate {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        .ea-content {
          position: relative; z-index: 2;
          display: flex; flex-direction: column;
          align-items: center; text-align: center;
          gap: 16px; padding: 0 24px;
        }

        .ea-logo-ring {
          width: 72px; height: 72px;
          border-radius: 50%;
          background: linear-gradient(135deg, #1a1a1c 0%, #111113 100%);
          border: 1.5px solid rgba(17,17,17,0.25);
          display: flex; align-items: center; justify-content: center;
          padding: 16px;
          box-shadow: 0 8px 32px rgba(0,0,0,0.10), 0 0 0 4px rgba(17,17,17,0.06);
        }
        .ea-logo-img { width: 100%; object-fit: contain; filter: invert(1) brightness(0.8); }

        .ea-title {
          font-size: 20px; font-weight: 900;
          color: #fff; margin: 0;
          letter-spacing: -0.5px;
        }
        .ea-subtitle {
          font-size: 13px;
          color: rgba(255,255,255,0.6);
          margin: 0; line-height: 1.5;
        }

        .ea-cta {
          display: flex; align-items: center; gap: 7px;
          padding: 12px 24px;
          background: #e8d4b0;
          border-radius: 99px;
          font-size: 13px; font-weight: 800;
          color: #111111;
          letter-spacing: 0.3px;
          box-shadow: 0 8px 24px rgba(232,212,176, 0.30), 0 0 0 1px rgba(232,212,176, 0.35);
          transition: all 0.3s;
        }
        .empty-appt:hover .ea-cta {
          box-shadow: 0 12px 32px rgba(232,212,176, 0.35), 0 0 0 1px rgba(232,212,176, 0.5);
          transform: scale(1.04);
        }

        /* ── BOOK BUTTON ── */
        .db-book-btn {
          position: relative;
          overflow: hidden;
          width: 100%;
          padding: 19px 24px;
          border-radius: 20px;
          border: none;
          background: linear-gradient(135deg, #e8d4b0 0%, #f0e5cf 50%, #d9c08f 100%);
          background-size: 200% 100%;
          color: #111111;
          font-size: 15px; font-weight: 900;
          letter-spacing: 1px; text-transform: uppercase;
          cursor: pointer;
          display: flex; align-items: center; justify-content: center; gap: 10px;
          box-shadow: 0 8px 32px rgba(232,212,176, 0.25), 0 2px 8px rgba(0,0,0,0.10);
          transition: all 0.4s ease;
          animation: btnGoldShift 4s ease-in-out infinite;
        }
        .db-book-btn:hover {
          transform: translateY(-3px);
          box-shadow: 0 16px 48px rgba(232,212,176, 0.35), 0 4px 16px rgba(0,0,0,0.12);
          background: linear-gradient(135deg, #d9c08f 0%, #f0e5cf 50%, #e8d4b0 100%);
        }
        .db-book-btn:active { transform: scale(0.98); }
        @keyframes btnGoldShift {
          0%,100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
        .db-book-shimmer {
          position: absolute; top: 0; left: -100%;
          width: 60%; height: 100%;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.25), transparent);
          animation: shimmerSlide 3s ease-in-out infinite;
          pointer-events: none;
        }
        @keyframes shimmerSlide {
          0% { left: -60%; }
          50%,100% { left: 110%; }
        }

        /* ── CLUB SONRISA CARD ── */
        .club-card {
          position: relative;
          overflow: hidden;
          border-radius: 20px;
          background: linear-gradient(135deg, #ffffff 0%, #f7f7f5 100%);
          background-size: 200% 200%;
          padding: 18px 20px;
          cursor: pointer;
          border: 1px solid rgba(217, 192, 143, 0.15);
          box-shadow: 0 10px 40px rgba(0,0,0,0.10);
          transition: all 0.4s ease;
          touch-action: pan-y;
          animation: clubShimmer 5s ease-in-out infinite;
        }
        .club-card:hover { transform: translateY(-3px); box-shadow: 0 20px 60px rgba(0,0,0,0.12); }
        @keyframes clubShimmer {
          0%,100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
        .club-bg-shine {
          position: absolute; top: -50%; right: -20%;
          width: 200px; height: 200px;
          background: radial-gradient(circle, rgba(217, 192, 143, 0.18) 0%, transparent 60%);
          pointer-events: none;
        }
        .club-content {
          position: relative; z-index: 1;
          display: flex; align-items: center;
          justify-content: space-between;
        }
        .club-left { display: flex; align-items: center; gap: 14px; }
        .club-crown-wrap {
          width: 40px; height: 40px;
          border-radius: 12px;
          background: rgba(217, 192, 143, 0.10);
          display: flex; align-items: center; justify-content: center;
        }
        .club-title { font-size: 14px; font-weight: 900; color: #111111; letter-spacing: 0.3px; }
        .club-pts { font-size: 22px; font-weight: 900; color: #334155; line-height: 1.1; }
        .club-pts span { font-size: 13px; font-weight: 600; }

        /* ── STATS ROW ── */
        .stats-row {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 10px;
        }
        .stat-card {
          background: #ffffff;
          border: 1px solid rgba(217, 192, 143, 0.15);
          border-radius: 18px;
          padding: 16px 12px;
          display: flex; flex-direction: column;
          align-items: flex-start; gap: 6px;
          transition: all 0.3s;
        }
        .stat-card:hover {
          background: #f7f7f5;
          border-color: rgba(17,17,17,0.2);
          transform: translateY(-2px);
        }
        .stat-icon-wrap {
          width: 28px; height: 28px; border-radius: 8px;
          background: rgba(17,17,17,0.1);
          display: flex; align-items: center; justify-content: center;
          margin-bottom: 4px;
        }
        .stat-val { font-size: 18px; font-weight: 800; color: #0f172a; line-height: 1; }
        .stat-lbl { font-size: 10px; font-weight: 600; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; }

        /* ── HISTORY CARD ── */
        .history-card {
          background: #ffffff;
          border: 1px solid rgba(217, 192, 143, 0.15);
          border-radius: 22px;
          padding: 20px;
          display: flex; flex-direction: column; gap: 16px;
        }
        .hc-header { display: flex; justify-content: space-between; align-items: center; }
        .hc-title { font-size: 14px; font-weight: 800; color: #111111; }
        .hc-link { font-size: 12px; font-weight: 600; color: var(--champagne); cursor: pointer; transition: opacity 0.2s; }
        .hc-link:hover { opacity: 0.7; }

        .hc-list { display: flex; flex-direction: column; gap: 2px; }
        .hc-item {
          display: flex; align-items: center; gap: 12px;
          padding: 12px 10px;
          border-radius: 14px;
          transition: background 0.2s;
          cursor: default;
        }
        .hc-item:hover { background: #f7f7f5; }
        .hci-avatar {
          width: 38px; height: 38px; flex-shrink: 0;
          border-radius: 12px; overflow: hidden;
          border: 1px solid rgba(217, 192, 143, 0.15);
        }
        .hci-avatar img { width: 100%; height: 100%; object-fit: cover; }
        .hci-info { flex: 1; min-width: 0; }
        .hci-service { font-size: 13px; font-weight: 700; color: #0f172a; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .hci-meta { font-size: 11px; color: #64748b; margin-top: 2px; }
        
        .hci-repeat-btn {
          display: flex; align-items: center; justify-content: center; gap: 4px;
          background: rgba(17,17,17, 0.1);
          color: var(--champagne);
          border: 1px solid rgba(17,17,17, 0.2);
          padding: 6px 14px;
          border-radius: 20px;
          font-size: 10px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          cursor: pointer;
          transition: all 0.2s ease;
          flex-shrink: 0;
        }
        .hci-repeat-btn:hover {
          background: rgba(17,17,17, 0.2);
          border-color: rgba(17,17,17, 0.4);
          transform: scale(1.02);
        }

        .hc-empty {
          display: flex; flex-direction: column; align-items: center;
          gap: 10px; padding: 24px 0;
          color: #94a3b8;
          font-size: 13px; font-weight: 500;
        }

        /* ── APPLE WALLET TICKET MODAL ── */
        .db-modal-overlay {
          position: fixed; inset: 0;
          background: rgba(0,0,0,0.6);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          display: flex; align-items: center; justify-content: center;
          z-index: 9999; padding: 20px;
          animation: overlayFadeIn 0.3s ease forwards;
        }
        .db-modal-overlay.closing {
          animation: overlayFadeOut 0.3s ease forwards;
        }
        @keyframes overlayFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes overlayFadeOut {
          from { opacity: 1; }
          to { opacity: 0; }
        }

        .fav-overlay-in {
          animation: overlayFadeIn 0.3s ease forwards;
        }
        .fav-overlay-out {
          animation: overlayFadeOut 0.3s ease forwards;
        }
        .fav-modal-in {
          animation: favZoomIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        .fav-modal-out {
          animation: favZoomOut 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        @keyframes favZoomIn {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
        @keyframes favZoomOut {
          from { opacity: 1; transform: scale(1); }
          to { opacity: 0; transform: scale(0.95); }
        }

        .db-modal-ticket {
          position: relative;
          width: 100%; max-width: 360px;
          background: linear-gradient(180deg, #ffffff 0%, #f7f7f5 100%);
          border-radius: 28px;
          box-shadow: 0 40px 100px rgba(0,0,0,0.10), inset 0 1px 1px rgba(255,255,255,0.8);
          display: flex; flex-direction: column;
          animation: ticketSlideUp 0.4s cubic-bezier(0.2, 0.8, 0.2, 1) forwards;
          overflow: hidden;
        }
        .db-modal-ticket.closing {
          animation: ticketSlideDown 0.3s cubic-bezier(0.8, 0, 0.8, 1) forwards;
        }
        @keyframes ticketSlideUp {
          from { transform: translateY(60px) scale(0.95); opacity: 0; }
          to { transform: translateY(0) scale(1); opacity: 1; }
        }
        @keyframes ticketSlideDown {
          from { transform: translateY(0) scale(1); opacity: 1; }
          to { transform: translateY(40px) scale(0.95); opacity: 0; }
        }

        /* CUTOUTS */
        .ticket-cutout {
          position: absolute;
          width: 30px; height: 30px;
          background: transparent;
          border-radius: 50%;
          box-shadow: 0 0 0 9999px rgba(0,0,0,0.6);
          top: 60%;
          z-index: 10;
          pointer-events: none;
          display: none; /* Only use if you want the ticket punch effect, using simple border for now */
        }

        .ticket-header {
          padding: 24px 24px 20px;
          background: linear-gradient(135deg, rgba(17,17,17,0.15) 0%, transparent 100%);
          border-bottom: 1px dashed rgba(217, 192, 143, 0.25);
          display: flex; flex-direction: column; gap: 16px;
        }
        .ticket-header-content {
          display: flex; justify-content: space-between; align-items: center;
        }
        .ticket-brand {
          display: flex; align-items: center; gap: 8px;
          font-size: 11px; font-weight: 800; color: var(--champagne);
          letter-spacing: 2px;
        }
        .ticket-logo { width: 18px; height: 18px; filter: none; opacity: 0.8; }
        .ticket-close {
          width: 28px; height: 28px; border-radius: 50%;
          background: #f7f7f5;
          border: none; display: flex; align-items: center; justify-content: center;
          color: #0f172a; cursor: pointer; transition: background 0.2s;
        }
        .ticket-close:hover { background: #e2e8f0; }
        .ticket-title { font-size: 22px; font-weight: 900; color: #0f172a; margin: 0; letter-spacing: -0.5px; }
        .ticket-status-pill {
          display: inline-flex; align-items: center; gap: 6px; align-self: flex-start;
          padding: 6px 12px; background: rgba(50,215,75,0.1);
          border-radius: 99px; border: 1px solid rgba(50,215,75,0.2);
          font-size: 11px; font-weight: 800; color: #32D74B; text-transform: uppercase; letter-spacing: 1px;
        }
        .pulse-dot { width: 6px; height: 6px; background: #32D74B; border-radius: 50%; box-shadow: 0 0 8px #32D74B; }

        .ticket-body {
          padding: 24px;
          display: flex; flex-direction: column; gap: 24px;
        }
        .ticket-service-hero {
          display: flex; flex-direction: column; align-items: center; gap: 12px;
          text-align: center;
        }
        .tsh-icon {
          width: 56px; height: 56px; border-radius: 16px;
          background: rgba(17,17,17,0.1);
          border: 1px solid rgba(17,17,17,0.2);
          display: flex; align-items: center; justify-content: center;
          box-shadow: inset 0 2px 10px rgba(255,255,255,0.05);
        }
        .tsh-name { font-size: 20px; font-weight: 800; color: #0f172a; margin: 0; }

        .ticket-barber-row {
          display: flex; align-items: center; gap: 16px;
          padding: 16px; background: #f7f7f5;
          border-radius: 16px; border: 1px solid rgba(217, 192, 143, 0.15);
        }
        .tbr-avatar {
          width: 44px; height: 44px; border-radius: 12px; overflow: hidden;
        }
        .tbr-avatar img { width: 100%; height: 100%; object-fit: cover; }
        .tbr-info { display: flex; flex-direction: column; gap: 2px; }
        .tbr-label { font-size: 11px; font-weight: 600; color: #64748b; text-transform: uppercase; letter-spacing: 1px; }
        .tbr-name { font-size: 16px; font-weight: 700; color: #0f172a; }

        .ticket-datetime-grid {
          display: grid; grid-template-columns: 1fr 1fr; gap: 12px;
        }
        .tdg-box {
          background: #f7f7f5;
          border: 1px solid rgba(217, 192, 143, 0.15);
          padding: 16px; border-radius: 16px;
          display: flex; flex-direction: column; gap: 4px;
        }
        .tdg-label { font-size: 10px; font-weight: 700; color: var(--champagne); text-transform: uppercase; letter-spacing: 1px; }
        .tdg-val { font-size: 15px; font-weight: 700; color: #0f172a; }

        .ticket-footer {
          padding: 24px;
          background: #f7f7f5;
          border-top: 1px dashed rgba(217, 192, 143, 0.25);
          display: flex; flex-direction: column; gap: 20px;
        }
        .tf-barcode {
          display: flex; justify-content: center; gap: 4px; height: 30px; opacity: 0.4;
        }
        .bar { width: 3px; background: #0f172a; border-radius: 2px; }
        .bar.w2 { width: 6px; }
        .bar.w3 { width: 9px; }

        .ticket-cancel-btn {
          width: 100%; padding: 16px;
          border-radius: 16px; border: none;
          background: rgba(255,60,60,0.1);
          color: #ff4444; font-size: 14px; font-weight: 800;
          cursor: pointer; transition: background 0.2s;
        }
        .ticket-cancel-btn:hover { background: rgba(255,60,60,0.15); }

        /* ── RESPONSIVE ── */
        @media (max-width: 480px) {
          .db-root { padding: 24px 16px 100px; }
          .db-greeting-name { font-size: 28px; }
          .has-appt { height: 240px; }
          .appt-daynum { font-size: 36px; }
          .stats-row { grid-template-columns: repeat(3, 1fr); }
        }
      `}</style>
    </div>
  );
}
