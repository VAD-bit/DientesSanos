import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence, useMotionValue, useSpring, useTransform } from 'framer-motion';
import { 
  Star, Calendar, Scissors, Clock, Wallet, 
  ChevronRight, Gift, Crown, Droplets, MapPin,
  Heart, X, User, Plus, Zap, Lock, Diamond
} from 'lucide-react';
import { publicService } from '../services/publicService';
import PrizeWheel from '../components/PrizeWheel';
import ProfileHeader from '../components/ProfileHeader';
import VipCard3D from '../components/VipCard3D';
import QuickBookingModal from '../components/QuickBookingModal';
import pandaMark from '../../assets/panda_logo_black.png';

const getBarberVideo = () => null;

export default function Profile() {
  // --- 3D Card Hooks ---
  const cardRotateX = useMotionValue(0);
  const cardRotateY = useMotionValue(0);
  const springTiltX = useSpring(cardRotateX, { stiffness: 220, damping: 22 });
  const springTiltY = useSpring(cardRotateY, { stiffness: 220, damping: 22 });
  const glowX = useMotionValue(50);
  const glowY = useMotionValue(50);
  const cardGlowBackground = useTransform(
    [glowX, glowY],
    ([x, y]) => `radial-gradient(circle at ${x}% ${y}%, rgba(232,203,153,0.12) 0%, transparent 40%)`
  );
  const MAX_TILT_DEG = 9;
  const handleCardMouseMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width;
    const py = (e.clientY - rect.top) / rect.height;
    cardRotateY.set((px - 0.5) * MAX_TILT_DEG * 2);
    cardRotateX.set(-(py - 0.5) * MAX_TILT_DEG * 2);
    glowX.set(px * 100);
    glowY.set(py * 100);
  };
  const handleCardMouseLeave = () => {
    cardRotateX.set(0);
    cardRotateY.set(0);
    glowX.set(50);
    glowY.set(50);
  };
  // ----------------------

  const [client, setClient] = useState(() => JSON.parse(localStorage.getItem('panda_public_client') || 'null'));
  const [appointments, setAppointments] = useState([]);
  const [coupons, setCoupons] = useState([]);
  const [points, setPoints] = useState(0);
  const [allBarbers, setAllBarbers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [roulettePrizes, setRoulettePrizes] = useState([]);
  const currentYear = new Date().getFullYear();
  const [hasSpun, setHasSpun] = useState(false);
  const [favorites, setFavorites] = useState(() => {
    try { return JSON.parse(localStorage.getItem('favorite_barbers') || '[]'); } catch { return []; }
  });
  
  // Modals state
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [selectedPrize, setSelectedPrize] = useState(null);
  const [showQuickBook, setShowQuickBook] = useState(false);
  const [quickBookBarber, setQuickBookBarber] = useState(null);
  const [isRedeeming, setIsRedeeming] = useState(false);
  const [starTab, setStarTab] = useState('barbero');

  const navigate = useNavigate();

  const prizesRef = useRef(null);

  useEffect(() => {
    // Only auto-rotate if the screen is mobile sized
    if (window.innerWidth >= 1000) return;
    
    const container = prizesRef.current;
    if (!container) return;

    const scrollStep = 176; // width of card + gap

    const intervalId = setInterval(() => {
      if (container) {
        if (container.scrollLeft + container.clientWidth >= container.scrollWidth - 10) {
          container.scrollTo({ left: 0, behavior: 'smooth' });
        } else {
          container.scrollBy({ left: scrollStep, behavior: 'smooth' });
        }
      }
    }, 3000); // Rotate every 3 seconds

    return () => clearInterval(intervalId);
  }, [favorites]); // Use favorites as a dependency just to ensure it re-runs when layout settles

  useEffect(() => {
    const clientData = JSON.parse(localStorage.getItem('panda_public_client') || 'null');
    if (!clientData) { navigate('/login'); return; }
    setClient(clientData);
    // Use a year-stamped key so the spin resets automatically each birthday
    const year = new Date().getFullYear();
    setHasSpun(localStorage.getItem(`panda_bday_spun_${clientData.id}_${year}`) === 'true');
    loadData(clientData.id);

    const handleBookingCreated = () => {
      console.log("Nueva cita detectada, actualizando...");
      loadData(clientData.id);
    };
    window.addEventListener('panda_booking_created', handleBookingCreated);
    return () => window.removeEventListener('panda_booking_created', handleBookingCreated);
  }, [navigate]);

  const loadData = async (clientId) => {
    try {
      // Fetch real appointments
      const realAppts = await publicService.getClientAppointments(clientId);
      setAppointments(realAppts || []);
      
      const pts = await publicService.getClientPoints(clientId);
      setPoints(pts || 0);

      // Fetch coupons
      const cps = await publicService.getCoupons(clientId);
      setCoupons(cps || []);

      // Load roulette prizes from settings
      try {
        const prizes = await publicService.getRoulettePrizes();
        setRoulettePrizes(prizes || []);
      } catch { /* roulette prizes are optional */ }
      
      // Fetch real staff
      const realStaff = await publicService.getStaff();
      const activeBarbers = realStaff.filter(s => {
        if (!s.active) return false;
        const role = (s.role || '').toLowerCase();
        if (role.includes('admin') || role.includes('asistente') || role.includes('barista')) return false;
        return true;
      });
      setAllBarbers(activeBarbers);
      
      // null means the key was never written (true first-time visitor) — only then do
      // we seed defaults. An empty array means the user deliberately cleared their
      // favorites, and that choice must stick across reloads instead of being reseeded.
      const rawFavs = localStorage.getItem('favorite_barbers');
      if (rawFavs === null) {
        if (activeBarbers.length > 0) {
          const defaultFavs = activeBarbers.slice(0, 3).map(b => b.id);
          setFavorites(defaultFavs);
          localStorage.setItem('favorite_barbers', JSON.stringify(defaultFavs));
        } else {
          setFavorites([]);
        }
      } else {
        try {
          setFavorites(JSON.parse(rawFavs));
        } catch {
          setFavorites([]);
        }
      }
      // Removed mock client data override
    } catch (e) { console.error('Error loading profile data:', e); }
    finally { setLoading(false); }
  };

  const removeFavorite = (barberId) => {
    const updated = favorites.filter(id => id !== barberId);
    setFavorites(updated);
    localStorage.setItem('favorite_barbers', JSON.stringify(updated));
  };

  const handleReserveFav = (barber) => {
    setQuickBookBarber(barber);
    setShowQuickBook(true);
  };

  const prizes = [
    { name: 'Limpieza Gratis', points: 300, icon: Scissors, available: points >= 300 },
    { name: 'Blanqueamiento', points: 200, icon: Crown, available: points >= 200 },
    { name: 'Consulta Preferencial', points: 100, icon: Droplets, available: points >= 100 },
  ];

  const validAppointments = appointments.filter(a => {
    const status = (a.status || '').toLowerCase();
    return !status.includes('cancelad');
  });

  let completedAppointments = validAppointments.filter(a => a.status === 'Completado' || a.status === 'Pagado');
  


  // Sort completed appointments descending — used by the history modal
  const historyAppointments = [...completedAppointments].sort((a,b) => new Date(b.scheduled_at) - new Date(a.scheduled_at));

  const RANKS = [
    { min: 0, label: 'Básico' },
    { min: 100, label: 'Bronce' },
    { min: 200, label: 'Plata' },
    { min: 300, label: 'Oro' },
  ];
  
  const currentRankIndex = [...RANKS].reverse().findIndex(r => points >= r.min);
  const realCurrentIndex = currentRankIndex === -1 ? 0 : RANKS.length - 1 - currentRankIndex;
  const nextRank = realCurrentIndex < RANKS.length - 1 ? RANKS[realCurrentIndex + 1] : RANKS[RANKS.length - 1];
  
  const progressPercent = points >= 300 ? 100 : Math.min((points / nextRank.min) * 100, 100);

  const displayName = client?.name || 'Invitado VIP';
  const initials = displayName.trim().split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase() || 'VIP';
  const memberSinceStr = client?.created_at ? new Date(client.created_at).toLocaleDateString('es-ES', { month: 'short', year: 'numeric' }) : 'dic 2024';
  const memberSince = memberSinceStr.charAt(0).toUpperCase() + memberSinceStr.slice(1).replace('.', '');



  // Helper to calculate days ago
  const getDaysAgo = (dateStr) => {
    if (!dateStr) return '';
    const diffTime = Math.abs(new Date() - new Date(dateStr));
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return 'Hoy';
    if (diffDays === 1) return 'Hace 1 día';
    return `Hace ${diffDays} días`;
  };

  const handlePrizeClick = (prize) => {
    if (!prize.available) return;
    setSelectedPrize(prize);
  };

  const confirmPrizeRedemption = async () => {
    if (!selectedPrize || isRedeeming) return;
    setIsRedeeming(true);
    try {
      await publicService.redeemPrize(client.id, selectedPrize.points, selectedPrize.name);
      alert(`¡Felicidades! Has canjeado ${selectedPrize.name}. Hemos enviado los detalles a tu correo.`);
      loadData(client.id);
      setSelectedPrize(null);
    } catch (e) {
      alert("Hubo un error al canjear el premio. Inténtalo de nuevo.");
      console.error(e);
    } finally {
      setIsRedeeming(false);
    }
  };

  const favoriteBarbersData = allBarbers.filter(b => favorites.includes(b.id));

  // ── STAR LOGIC: based on most visits, not favorites ──
  const pastAppointments = appointments.filter(a => {
    const date = new Date(a.scheduled_at);
    return date < new Date() && (a.status === 'completed' || a.status === 'confirmed' || !a.status);
  });

  // Count visits per staff member
  const visitCounts = {};
  pastAppointments.forEach(a => {
    const sid = a.staff_id;
    if (sid) visitCounts[sid] = (visitCounts[sid] || 0) + 1;
  });

  // Match with allBarbers to get full data and separate by role
  const rankedProfessionals = allBarbers
    .filter(b => visitCounts[b.id])
    .sort((a, b) => (visitCounts[b.id] || 0) - (visitCounts[a.id] || 0));

  const starBarbers = rankedProfessionals.filter(b => {
    const role = (b.role || '').toLowerCase();
    return role.includes('barbero') || (!role.includes('tatuador') && !role.includes('tatu'));
  });
  const starTattooists = rankedProfessionals.filter(b => {
    const role = (b.role || '').toLowerCase();
    return role.includes('tatuador') || role.includes('tatu');
  });
  const hasBothTypes = starBarbers.length > 0 && starTattooists.length > 0;
  const activeStar = starTab === 'tatuador' ? starTattooists[0] : starBarbers[0];
  const activeStarOthers = starTab === 'tatuador' ? starTattooists.slice(1, 4) : starBarbers.slice(1, 4);
  const activeStarVisits = activeStar ? (visitCounts[activeStar.id] || 0) : 0;
  const hasAnyStar = starBarbers.length > 0 || starTattooists.length > 0;

  return (
    <div className="new-dashboard-container px-4 md:px-8 lg:px-10">
      {createPortal(
        <AnimatePresence>
          {/* Birthday Roulette — only shows on client's birthday and only once per year */}
          {(() => {
            if (!client?.birth_date) return null;
            const today = new Date();
            const [, bMonth, bDay] = client.birth_date.split('-');
            const isBirthday = today.getMonth() + 1 === parseInt(bMonth, 10) && today.getDate() === parseInt(bDay, 10);
            // Server-side backstop: localStorage alone can be cleared or bypassed on
            // another device, so also block if the client already has any coupon
            // generated this calendar year (the real source of truth in the DB).
            const hasCouponThisYear = coupons.some(c => c.generated_at && new Date(c.generated_at).getFullYear() === currentYear);
            if (!isBirthday || hasSpun || hasCouponThisYear) return null;
            const bdayKey = `panda_bday_spun_${client.id}_${currentYear}`;
            // Winning must NOT hide the wheel immediately — PrizeWheel shows a victory
            // ticket with the coupon code after a win, and this component re-renders
            // the moment `hasSpun` flips true, which would unmount that ticket before
            // the client ever sees it. So a win only persists to localStorage; only the
            // explicit close (X) button actually hides the modal.
            const markSpun = () => {
              localStorage.setItem(bdayKey, 'true');
            };
            const closeWheel = () => {
              setHasSpun(true);
              localStorage.setItem(bdayKey, 'true');
            };
            return (
            <motion.div 
              key="birthday-roulette"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="fixed inset-0 z-[9999] flex items-center justify-center p-4" 
              style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(16px)' }}
            >
              <motion.div 
                initial={{ scale: 0.9, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.9, opacity: 0, y: 20 }}
                transition={{ type: "spring", damping: 25, stiffness: 300 }}
                className="relative w-full max-w-[460px]"
              >
                <button
                  onClick={closeWheel}
                  className="fixed right-6 w-12 h-12 flex items-center justify-center rounded-full bg-white/10 border border-white/20 text-white hover:bg-white/20 transition-all z-50 backdrop-blur-md shadow-[0_0_15px_rgba(255,255,255,0.1)]"
                  style={{ top: 'calc(max(env(safe-area-inset-top, 0px), 24px))' }}
                >
                  <X size={24} />
                </button>
                <PrizeWheel
                  clientId={client.id}
                  externalPrizes={roulettePrizes}
                  onWin={markSpun}
                  onGenerateCoupon={async (prizeName) => {
                    const couponData = await publicService.generateCoupon(client.id, prizeName);
                    publicService.notifyRouletteWin(client.name, prizeName).catch(() => {});
                    return couponData;
                  }}
                />
              </motion.div>
            </motion.div>
            );
          })()}
        </AnimatePresence>,
        document.body
      )}


      {/* ── PAGE HEADER ── */}
      <div className="panda-club-header animate-fade-in-up">
        <div className="pch-left">
          <div className="pch-eyebrow">
            <Crown size={12} color="#000" />
            <span>Programa de Lealtad</span>
          </div>
          <h1 className="pch-title">Club Sonrisa</h1>
          <p className="pch-subtitle">Acumula puntos en cada visita y canjéalos por servicios exclusivos. Mientras más visites, mayor tu rango y mejores tus beneficios.</p>
        </div>
        <div className="pch-stats">
          <div className="pch-stat">
            <span className="pch-stat-val">{points}</span>
            <span className="pch-stat-lbl">Puntos</span>
          </div>
          <div className="pch-stat-divider" />
          <div className="pch-stat">
            <span className="pch-stat-val">{RANKS[realCurrentIndex].label}</span>
            <span className="pch-stat-lbl">Nivel actual</span>
          </div>
        </div>
      </div>

      {/* ── MAIN 2-COLUMN LAYOUT ── */}
      <div className="club-grid">

        {/* ── TARJETA VIP TITANIO ── */}

          {/* TARJETA VIP TITANIO (Now 3D Glassmorphism) */}
          <div className="titanium-card-wrapper animate-fade-in-up" style={{ animationDelay: '0ms' }}>
            <div style={{ perspective: 1200 }}>
              <motion.div
                onMouseMove={handleCardMouseMove}
                onMouseLeave={handleCardMouseLeave}
                style={{
                  position: 'relative', aspectRatio: '1.6 / 1', borderRadius: 20, overflow: 'hidden',
                  transformStyle: 'preserve-3d', width: '100%',
                  rotateX: springTiltX, rotateY: springTiltY,
                  background: 'var(--bg-secondary)',
                  border: '1px solid rgba(17,17,17,0.3)',
                  boxShadow: '0 24px 64px -14px rgba(0,0,0,0.10), 0 0 30px -10px rgba(17,17,17,0.15)',
                }}
              >
                <img
                  src={pandaMark}
                  alt=""
                  aria-hidden="true"
                  style={{
                    position: 'absolute', bottom: '-14%', right: '-6%', width: '54%',
                    filter: 'none', opacity: 0.20, pointerEvents: 'none', userSelect: 'none',
                  }}
                />
                <motion.div style={{ position: 'absolute', inset: 0, background: cardGlowBackground, pointerEvents: 'none' }} />
                <div style={{
                  position: 'absolute', inset: '-50%',
                  background: 'linear-gradient(115deg, transparent 47%, rgba(15,23,42,0.05) 50%, transparent 53%)',
                  pointerEvents: 'none',
                }} />

                <div style={{ position: 'relative', zIndex: 1, height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '24px 26px', transform: 'translateZ(30px)' }}>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 900, letterSpacing: '0.06em', color: '#111111' }}>DIENTES SANOS</div>
                    <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.2em', color: 'var(--champagne)' }}>CLUB MEMBER</div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                    <div style={{
                      width: 50, height: 50, borderRadius: '50%', flexShrink: 0,
                      background: 'rgba(17,17,17,0.10)', border: '1.5px solid rgba(217, 192, 143, 0.30)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 18, fontWeight: 800, color: '#111111',
                    }}>
                      {initials}
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{
                        fontSize: 16, fontWeight: 800, color: displayName ? '#0f172a' : '#94a3b8',
                        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 200,
                        transition: 'color 0.3s ease',
                      }}>
                        {displayName.toUpperCase()}
                      </div>
                      <div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600 }}>Miembro desde {memberSince}</div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
                    <span style={{
                      fontSize: 10, fontWeight: 800, letterSpacing: '0.12em', color: 'var(--champagne)',
                      background: 'rgba(17,17,17,0.1)', border: '1px solid rgba(17,17,17,0.25)',
                      borderRadius: 999, padding: '4px 12px',
                    }}>
                      {RANKS[realCurrentIndex].label.toUpperCase()}
                    </span>
                    <span style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
                      <span style={{ fontSize: 28, fontWeight: 900, color: '#111111' }}>{points}</span>
                      <span style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8' }}>PTS</span>
                    </span>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>

          {/* PROGRESO DE NIVEL */}
          <div className="dash-card vip-progress-v3 animate-fade-in-up" style={{ animationDelay: '80ms', padding: '24px' }}>
            <div className="vp3-header">
              <h3 className="vp3-title">Progreso de Nivel</h3>
              <span className="vp3-current">{RANKS[realCurrentIndex].label}</span>
            </div>
            <div className="vp3-track-container">
              <div className="vp3-track">
                <div className="vp3-fill" style={{ width: `${progressPercent}%` }}>
                  <div className="vp3-glow-dot"></div>
                </div>
              </div>
            </div>
            <div className="vp3-footer">
              <span className="vp3-pts-left">{nextRank.min - points > 0 ? `${nextRank.min - points} pts faltan` : 'Meta alcanzada'}</span>
              <span className="vp3-next-rank">Meta: {nextRank.label}</span>
            </div>

            {/* Rank ladder */}
            <div className="rank-ladder">
              {RANKS.map((r, i) => (
                <div key={i} className={`rank-rung ${i <= realCurrentIndex ? 'reached' : ''} ${i === realCurrentIndex ? 'current' : ''}`}>
                  <div className="rank-rung-dot" />
                  <span className="rank-rung-label">{r.label}</span>
                  <span className="rank-rung-pts">{r.min} pts</span>
                </div>
              ))}
            </div>
          </div>

        {/* ── BENEFICIOS ── */}
          <div className="dash-card animate-fade-in-up" style={{ animationDelay: '120ms', padding: '24px' }}>
            <div className="dash-header-flex" style={{ marginBottom: 20 }}>
              <h3 className="dash-section-title" style={{ fontSize: '18px', fontWeight: 800 }}>Tus Beneficios</h3>
            </div>

            <div className="prizes-list-desktop">
              {prizes.map((prize, i) => {
                const Icon = prize.icon;
                const isLocked = !prize.available;
                return (
                  <div
                    key={i}
                    onClick={() => !isLocked && handlePrizeClick(prize)}
                    className={`prize-desktop-row ${isLocked ? 'locked' : 'available'}`}
                  >
                    <div className={`prize-desktop-icon ${isLocked ? 'locked' : 'available'}`}>
                      <Icon size={22} strokeWidth={isLocked ? 1.5 : 2} />
                    </div>
                    <div className="prize-desktop-info">
                      <h4 className={`prize-desktop-name ${isLocked ? 'locked' : ''}`}>{prize.name}</h4>
                      <div className="prize-desktop-pts-bar">
                        <div className="prize-desktop-bar-bg">
                          <div className="prize-desktop-bar-fill" style={{ width: `${Math.min(100, (points / prize.points) * 100)}%` }} />
                        </div>
                        <span className="prize-desktop-pts-label">{prize.points} pts</span>
                      </div>
                    </div>
                    <div className="prize-desktop-action">
                      {isLocked ? (
                        <div className="prize-lock-pill">
                          <Lock size={10} />
                          <span>{prize.points - points} pts</span>
                        </div>
                      ) : (
                        <button className="prize-redeem-btn">Canjear</button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ── BÓVEDA VIP (Cupones) ── */}
          {/* touchAction: 'pan-y' works around an iOS Safari quirk where a
              backdrop-filter element (this card) containing nested rounded/
              overflow-hidden children (the coupon items below) can swallow
              vertical swipe gestures instead of letting them scroll the page. */}
          <div className="dash-card animate-fade-in-up" style={{ animationDelay: '140ms', padding: '24px', touchAction: 'pan-y' }}>
            <div className="dash-header-flex" style={{ marginBottom: 20 }}>
              <h3 className="dash-section-title flex items-center gap-2" style={{ fontSize: '18px', fontWeight: 800 }}>
                <Diamond size={18} className="text-[#111111]" />
                La Bóveda VIP
              </h3>
            </div>
            
            {(() => {
              let displayCoupons = coupons;

              
              return displayCoupons.length > 0 ? (
              <div className="flex flex-col gap-4">
                {displayCoupons.map((coupon, i) => {
                  const isUsed = coupon.status === 'USED';
                  return (
                  <div key={i} className="vip-coupon-item relative overflow-hidden rounded-xl border border-[#d9c08f]/15 bg-white p-5 shadow-[0_10px_30px_rgba(0,0,0,0.10)]" style={{ touchAction: 'pan-y', opacity: isUsed ? 0.5 : 1 }}>
                    <div className={`absolute top-0 right-0 h-full w-[4px] bg-gradient-to-b ${isUsed ? 'from-[#e2e8f0] to-[#f1f5f9]' : 'from-[#111111] to-[#8B5C1A]'}`}></div>
                    <div className="flex items-center justify-between mb-1">
                      <div className="text-[10px] uppercase font-black tracking-[3px] text-[#111111]">Beneficio Desbloqueado</div>
                      <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border ${isUsed ? 'text-[#94a3b8] border-[#e2e8f0] bg-[#f8fafc]' : 'text-emerald-400 border-emerald-500/25 bg-emerald-500/10'}`}>
                        {isUsed ? 'Usado' : 'Disponible'}
                      </span>
                    </div>
                    <div className={`font-bold text-lg mb-4 ${isUsed ? 'text-[#94a3b8] line-through' : 'text-[#0f172a]'}`}>{coupon.prize_name}</div>

                    <div className="bg-[#f7f7f5] rounded-lg p-3 border border-[#d9c08f]/15 flex flex-col items-center">
                      <div className="text-[9px] text-[#94a3b8] uppercase font-bold tracking-widest mb-1">Código Clasificado</div>
                      <div className="font-mono text-xl text-[#0f172a] font-black tracking-[4px]">{coupon.id.substring(0, 8).toUpperCase()}</div>
                    </div>
                  </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8 border border-dashed border-[#d9c08f]/15 rounded-xl bg-white">
                <Diamond size={24} className="mx-auto mb-3 text-[#cbd5e1]" />
                <p className="text-[#94a3b8] text-sm font-semibold">Tu Bóveda está vacía.</p>
                <p className="text-[#cbd5e1] text-xs mt-1">Acumula puntos y gira la ruleta VIP.</p>
              </div>
            );
            })()}
          </div>

      </div> {/* END CLUB GRID */}

      {/* ── MODALS ── */}
      {showHistoryModal && (
        <div className="dash-modal-overlay" onClick={() => setShowHistoryModal(false)}>
          <div className="dash-modal" onClick={e => e.stopPropagation()}>
            <div className="dash-modal-header">
              <h3>Historial de Citas</h3>
              <button className="close-btn" onClick={() => setShowHistoryModal(false)}><X size={20} /></button>
            </div>
            <div className="dash-modal-body">
              {historyAppointments.length > 0 ? (
                <div className="visits-list">
                  {historyAppointments.map((appt, i) => (
                    <div key={i} className="visit-row-item">
                      <div className="vr-date"><Calendar size={14} color="#94a3b8" /> {new Date(appt.scheduled_at).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })}</div>
                      <div className="vr-service">{appt.services?.name}</div>
                      <div className="vr-barber">{appt.staff?.name}</div>
                      <div className="vr-price">${appt.services?.price || 350}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <p style={{ color: '#64748b', textAlign: 'center', padding: '20px 0' }}>No tienes citas pasadas.</p>
              )}
            </div>
          </div>
        </div>
      )}

      {selectedPrize && (
        <div className="dash-modal-overlay" onClick={() => setSelectedPrize(null)}>
          <div className="dash-modal sm" onClick={e => e.stopPropagation()}>
            <div className="dash-modal-header">
              <h3>Canjear Premio</h3>
              <button className="close-btn" onClick={() => setSelectedPrize(null)}><X size={20} /></button>
            </div>
            <div className="dash-modal-body" style={{ textAlign: 'center', padding: '10px 0 20px' }}>
              <Gift size={48} color="var(--champagne)" style={{ marginBottom: 16 }} />
              <p style={{ fontSize: 16, color: '#0f172a', marginBottom: 8, fontWeight: 600 }}>¿Deseas canjear {selectedPrize.name}?</p>
              <p style={{ fontSize: 14, color: '#64748b', marginBottom: 24 }}>Se descontarán {selectedPrize.points} puntos de tu saldo.</p>
              <button 
                onClick={confirmPrizeRedemption} 
                disabled={isRedeeming}
                style={{ width: '100%', padding: '14px', background: '#e8d4b0', color: '#111111', border: 'none', borderRadius: '12px', fontSize: 15, fontWeight: 700, cursor: isRedeeming ? 'not-allowed' : 'pointer' }}
              >
                {isRedeeming ? 'Canjeando...' : 'Confirmar Canje'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* QUICK BOOKING MODAL */}
      {showQuickBook && (
        <QuickBookingModal 
          onClose={() => {
            setShowQuickBook(false);
            setQuickBookBarber(null);
          }}
          client={client}
          initialBarber={quickBookBarber}
        />
      )}



      <style>{`
        /* =========================================
           CLUB SONRISA 2-COLUMN GRID
           ========================================= */
        .club-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 20px;
        }
        /* Tablet (portrait & landscape both land here — even iPad Pro landscape
           is under 1200px, so without this step every tablet fell through to the
           single-column layout below and looked stretched/empty). Narrower left
           column than desktop since the content area itself is narrower here. */
        @media (min-width: 860px) {
          .club-grid {
            grid-template-columns: minmax(280px, 340px) 1fr;
            align-items: start;
            gap: 20px;
          }
          .club-grid > *:nth-child(1) { grid-area: 1 / 1 / 2 / 2; }
          .club-grid > *:nth-child(2) { grid-area: 2 / 1 / 3 / 2; }
          .club-grid > *:nth-child(3) { grid-area: 1 / 2 / 2 / 3; }
          .club-grid > *:nth-child(4) { grid-area: 2 / 2 / 3 / 3; }
        }
        @media (min-width: 1200px) {
          .club-grid {
            grid-template-columns: 420px 1fr;
            gap: 24px;
          }
        }

        /* Rank Ladder */
        .rank-ladder {
          display: flex;
          flex-direction: column;
          gap: 0;
          margin-top: 16px;
          padding-top: 16px;
          border-top: 1px solid rgba(217, 192, 143, 0.15);
        }
        .rank-rung {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 10px 0;
          border-bottom: 1px solid rgba(217, 192, 143, 0.15);
          position: relative;
        }
        .rank-rung-dot {
          width: 8px; height: 8px;
          border-radius: 50%;
          background: #e2e8f0;
          flex-shrink: 0;
        }
        .rank-rung.reached .rank-rung-dot {
          background: var(--gold-gradient);
          box-shadow: 0 0 8px rgba(17,17,17,0.4);
        }
        .rank-rung.current .rank-rung-dot {
          width: 10px; height: 10px;
          box-shadow: 0 0 12px rgba(17,17,17,0.7);
        }
        .rank-rung-label {
          font-size: 12px;
          font-weight: 700;
          color: #cbd5e1;
          flex: 1;
        }
        .rank-rung.reached .rank-rung-label { color: #475569; }
        .rank-rung.current .rank-rung-label { color: var(--champagne); font-weight: 800; }
        .rank-rung-pts {
          font-size: 11px;
          font-weight: 600;
          color: #cbd5e1;
        }
        .rank-rung.reached .rank-rung-pts { color: #94a3b8; }

        /* Desktop Prizes List */
        .prizes-list-desktop {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .prize-desktop-row {
          display: flex;
          align-items: center;
          gap: 14px;
          padding: 14px 16px;
          border-radius: 16px;
          border: 1px solid rgba(217, 192, 143, 0.15);
          background: #ffffff;
          transition: all 0.25s ease;
        }
        .prize-desktop-row.available {
          border-color: rgba(17,17,17,0.15);
          background: linear-gradient(135deg, #ffffff 0%, #f7f7f5 100%);
          cursor: pointer;
        }
        .prize-desktop-row.available:hover {
          border-color: rgba(17,17,17,0.35);
          transform: translateY(-1px);
          box-shadow: 0 8px 24px rgba(17,17,17,0.1);
        }
        .prize-desktop-row.locked { opacity: 0.65; }
        .prize-desktop-icon {
          width: 44px; height: 44px;
          border-radius: 12px;
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0;
        }
        .prize-desktop-icon.available {
          background: rgba(17,17,17,0.08);
          color: var(--champagne);
          border: 1px solid rgba(17,17,17,0.2);
        }
        .prize-desktop-icon.locked {
          background: #ffffff;
          color: #cbd5e1;
          border: 1px solid rgba(217, 192, 143, 0.15);
        }
        .prize-desktop-info {
          flex: 1;
          min-width: 0;
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .prize-desktop-name {
          font-size: 14px;
          font-weight: 700;
          color: #111111;
          margin: 0;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .prize-desktop-name.locked { color: #94a3b8; }
        .prize-desktop-pts-bar {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .prize-desktop-bar-bg {
          flex: 1;
          height: 3px;
          background: #f7f7f5;
          border-radius: 2px;
          overflow: hidden;
        }
        .prize-desktop-bar-fill {
          height: 100%;
          background: var(--gold-gradient);
          border-radius: 2px;
          transition: width 1s ease;
        }
        .prize-desktop-pts-label {
          font-size: 10px;
          font-weight: 700;
          color: #cbd5e1;
          white-space: nowrap;
        }
        .prize-desktop-action { flex-shrink: 0; }
        .prize-lock-pill {
          display: flex;
          align-items: center;
          gap: 4px;
          padding: 4px 10px;
          border-radius: 8px;
          background: #ffffff;
          border: 1px solid rgba(217, 192, 143, 0.15);
          font-size: 10px;
          font-weight: 700;
          color: #cbd5e1;
        }
        .prize-redeem-btn {
          padding: 8px 16px;
          border-radius: 10px;
          background: #e8d4b0;
          color: #111111;
          border: none;
          font-size: 11px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          cursor: pointer;
          transition: all 0.2s;
        }
        .prize-redeem-btn:hover { background: #d9c08f; transform: scale(1.03); }

        /* =========================================
           CLUB SONRISA PAGE HEADER
           ========================================= */
        .panda-club-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          gap: 24px;
          padding: 24px 0 16px;
          border-bottom: 1px solid rgba(217, 192, 143, 0.15);
          margin-bottom: 8px;
        }
        .pch-left {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .pch-eyebrow {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: var(--gold-gradient);
          padding: 4px 12px;
          border-radius: 999px;
          font-size: 10px;
          font-weight: 800;
          color: #ffffff;
          letter-spacing: 1px;
          text-transform: uppercase;
          width: fit-content;
          white-space: nowrap;
        }
        .pch-title {
          font-size: 36px;
          font-weight: 800;
          color: #111111;
          letter-spacing: -1px;
          margin: 0;
          line-height: 1;
        }
        .pch-subtitle {
          font-size: 13px;
          color: #94a3b8;
          font-weight: 500;
          max-width: 480px;
          line-height: 1.5;
          margin: 0;
        }
        .pch-stats {
          display: flex;
          align-items: center;
          gap: 24px;
          flex-shrink: 0;
          background: #ffffff;
          border: 1px solid rgba(217, 192, 143, 0.15);
          border-radius: 20px;
          padding: 16px 24px;
        }
        .pch-stat {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 3px;
        }
        .pch-stat-val {
          font-size: 22px;
          font-weight: 800;
          color: #0f172a;
          line-height: 1;
          letter-spacing: -0.5px;
        }
        .pch-stat-lbl {
          font-size: 10px;
          font-weight: 700;
          color: #94a3b8;
          text-transform: uppercase;
          letter-spacing: 1px;
        }
        .pch-stat-divider {
          width: 1px;
          height: 32px;
          background: #e2e8f0;
        }
        /* Stacks through tablet too — side-by-side only once there's genuinely
           enough room, otherwise the title/eyebrow column gets squeezed and
           wraps awkwardly (was only stacking below 640px, leaving every tablet
           width fighting for space). */
        @media (max-width: 900px) {
          .panda-club-header {
            flex-direction: column;
            align-items: flex-start;
          }
          .pch-stats { width: 100%; justify-content: space-around; }
        }
        @media (max-width: 640px) {
          .pch-title { font-size: 28px; }
        }

        /* =========================================
           CSS PARA EL NUEVO DASHBOARD PREMIUM (APPLE UX)
           ========================================= */
        
        .new-dashboard-container {
          display: flex;
          flex-direction: column;
          gap: 10px;
          padding-top: 24px;
          max-width: 1080px;
          margin: 0 auto;
          width: 100%;
        }

        .dashboard-two-column-layout {
          display: flex;
          flex-direction: column;
          gap: 24px;
          max-width: 1080px;
          margin: 0 auto;
        }

        @media (min-width: 1000px) {
          .dashboard-two-column-layout {
            display: flex;
            align-items: stretch;
          }
        }

        .dashboard-left-col {
          display: flex;
          flex-direction: column;
          gap: 24px;
        }

        .dashboard-right-col {
          display: flex;
          flex-direction: column;
          gap: 24px;
        }

        .dashboard-left-col > .dash-card:last-child,
        .dashboard-right-col > .dash-card:last-child {
          flex: 1;
        }

        /* ── CARDS GLOBALES (APPLE UX) ── */
        .dash-card {
          background: #ffffff;
          backdrop-filter: blur(24px);
          -webkit-backdrop-filter: blur(24px);
          border: 1px solid rgba(217, 192, 143, 0.15);
          border-radius: 16px;
          padding: 16px;
          display: flex;
          flex-direction: column;
          box-shadow: 0 8px 24px rgba(0,0,0,0.10);
          /* Every dash-card combines backdrop-filter with nested rounded/
             overflow-hidden children — the same iOS combination fixed on the
             VIP vault card specifically. Setting it here once covers every
             card built on this shared class instead of patching each one. */
          touch-action: pan-y;
          transition: transform 0.3s ease, border-color 0.3s ease;
        }
        .dash-card:hover {
          border-color: rgba(217, 192, 143, 0.30);
        }

        .dash-header-flex {
          display: flex;
          justify-content: space-between;
          align-items: baseline;
          margin-bottom: 12px;
        }

        .dash-section-title {
          font-size: 15px;
          font-weight: 700;
          color: #111111;
          letter-spacing: -0.2px;
          margin: 0;
          font-family: 'General Sans', -apple-system, sans-serif;
        }

        .dash-link {
          font-size: 12px;
          font-weight: 600;
          color: var(--champagne);
          cursor: pointer;
          transition: opacity 0.2s;
        }
        .dash-link:hover { opacity: 0.8; }

        }
        .stat-info {
          display: flex;
          flex-direction: column;
        }
        .stat-label { font-size: 13px; font-weight: 600; color: #64748b; margin-bottom: 8px; }
        .stat-value { font-size: 28px; font-weight: 700; color: #0f172a; line-height: 1; margin-bottom: 8px; letter-spacing: -0.5px; }
        .stat-value small { font-size: 14px; color: #64748b; font-weight: 500; margin-left: 4px; }
        .stat-desc { font-size: 12px; color: #94a3b8; }

        /* ── ROW 2: NEXT APPT APPLE COUNTDOWN CARD ── */
        .next-appt-card-v2 {
          padding: 0 !important;
          border-radius: 24px;
          overflow: hidden;
          border: 1px solid rgba(217, 192, 143, 0.15);
          cursor: pointer;
          position: relative;
          box-shadow: 0 10px 30px rgba(0,0,0,0.10);
          transition: transform 0.3s cubic-bezier(0.2, 0.8, 0.2, 1);
        }
        .next-appt-card-v2:hover {
          transform: translateY(-4px) scale(1.01);
          border-color: rgba(17,17,17,0.3);
        }

        .appt-hero-wrapper {
          position: relative;
          height: 240px;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          padding: 24px;
        }

        .appt-hero-bg {
          position: absolute;
          top: 0; left: 0;
          width: 100%; height: 100%;
          object-fit: cover;
          opacity: 0.4;
          filter: saturate(0.2) contrast(1.2) brightness(0.7);
          transition: all 0.5s ease;
        }
        .next-appt-card-v2:hover .appt-hero-bg {
          opacity: 0.6;
          filter: saturate(0.8) contrast(1.1) brightness(0.9);
          transform: scale(1.05);
        }

        .appt-hero-overlay {
          position: absolute;
          top: 0; left: 0;
          width: 100%; height: 100%;
          background: linear-gradient(180deg, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0.2) 40%, rgba(0,0,0,0.9) 100%);
          pointer-events: none;
        }

        /* Countdown Top */
        .appt-countdown-area {
          position: relative;
          z-index: 2;
          display: flex;
          flex-direction: column;
          align-items: center;
          background: rgba(0,0,0,0.4);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 16px;
          padding: 12px 24px;
          align-self: center;
        }
        .appt-countdown-label {
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 2px;
          color: rgba(255, 255, 255, 0.6);
          font-weight: 700;
          margin-bottom: 8px;
        }
        .appt-countdown-row {
          display: flex;
          gap: 16px;
        }
        .countdown-unit {
          display: flex;
          flex-direction: column;
          align-items: center;
          min-width: 40px;
        }
        .countdown-num {
          font-size: 28px;
          font-weight: 700;
          color: #ffffff;
          line-height: 1;
          text-shadow: 0 2px 10px rgba(0,0,0,0.5);
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
        }
        .countdown-txt {
          font-size: 10px;
          color: var(--champagne);
          text-transform: uppercase;
          font-weight: 700;
          letter-spacing: 1px;
          margin-top: 4px;
        }

        /* Bottom Date + Chips */
        .appt-hero-bottom {
          position: relative;
          z-index: 2;
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          width: 100%;
        }
        .appt-date-big {
          display: flex;
          flex-direction: column;
        }
        .appt-day-name {
          font-size: 13px;
          text-transform: uppercase;
          letter-spacing: 2px;
          color: var(--champagne);
          font-weight: 800;
          text-shadow: 0 2px 4px rgba(0,0,0,0.8);
        }
        .appt-day-num-row {
          display: flex;
          align-items: baseline;
          gap: 6px;
        }
        .appt-day-num {
          font-size: 42px;
          font-weight: 800;
          color: #ffffff;
          line-height: 1;
          letter-spacing: -1px;
          text-shadow: 0 2px 8px rgba(0,0,0,0.8);
        }
        .appt-month-name {
          font-size: 18px;
          text-transform: uppercase;
          color: rgba(255, 255, 255, 0.7);
          font-weight: 600;
        }

        .appt-chips {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          gap: 6px;
        }
        .appt-chip {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 6px 12px;
          background: rgba(255,255,255,0.1);
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
          border: 1px solid rgba(255,255,255,0.15);
          border-radius: 20px;
          font-size: 13px;
          font-weight: 600;
          color: #ffffff;
          white-space: nowrap;
        }
        .barber-chip {
          background: rgba(0,0,0,0.6);
          border-color: rgba(17,17,17,0.3);
          color: var(--champagne);
        }
        .chip-avatar {
          width: 18px;
          height: 18px;
          border-radius: 50%;
          object-fit: cover;
        }

        /* Status Badge */
        .appt-status-badge {
          position: absolute;
          top: 20px;
          right: 20px;
          z-index: 3;
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 6px 12px;
          background: rgba(0,0,0,0.5);
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
          border-radius: 20px;
          border: 1px solid rgba(255,255,255,0.1);
          font-size: 11px;
          font-weight: 800;
          color: #ffffff;
          letter-spacing: 1px;
          text-transform: uppercase;
        }
        .status-pulse {
          width: 8px; height: 8px;
          border-radius: 50%;
          background: #32D74B;
          box-shadow: 0 0 8px #32D74B;
          animation: pulseGreen 2s infinite;
        }
        @keyframes pulseGreen {
          0% { box-shadow: 0 0 0 0 rgba(50,215,75,0.4); }
          70% { box-shadow: 0 0 0 6px rgba(50,215,75,0); }
          100% { box-shadow: 0 0 0 0 rgba(50,215,75,0); }
        }
        
        @media (max-width: 600px) {
          .appt-hero-wrapper { height: auto; min-height: 220px; gap: 24px; }
          .appt-hero-bottom { flex-direction: column; align-items: flex-start; gap: 16px; }
          .appt-chips { align-items: flex-start; flex-direction: row; flex-wrap: wrap; }
          .appt-status-badge { top: auto; bottom: 20px; right: 20px; }
        }

        /* ── ROW 2: VIP RING (APPLE WATCH STYLE) ── */
        .vip-ring-card {
          padding: 24px !important;
        }
        .vip-ring-header {
          display: flex; align-items: center; gap: 8px; margin-bottom: 24px;
        }
        .vip-ring-body {
          display: flex; align-items: center; gap: 32px;
        }
        .ring-wrapper {
          position: relative; width: 100px; height: 100px; flex-shrink: 0;
        }
        .progress-ring-svg {
          width: 100%; height: 100%; transform: rotate(-90deg);
        }
        .ring-bg {
          fill: none; stroke: rgba(15,23,42,0.10); stroke-width: 6;
        }
        .ring-fill {
          fill: none; stroke-width: 6; stroke-linecap: round; transition: stroke-dashoffset 1s ease-out;
        }
        .ring-content {
          position: absolute; top: 0; left: 0; right: 0; bottom: 0;
          display: flex; flex-direction: column; align-items: center; justify-content: center;
        }
        .rc-pts { font-size: 24px; font-weight: 800; color: #0f172a; line-height: 1; }
        .rc-lbl { font-size: 10px; font-weight: 700; color: var(--champagne); letter-spacing: 1px; margin-top: 2px; }

        .vip-ring-info {
          flex: 1; display: flex; flex-direction: column; gap: 16px;
        }
        .vri-row { display: flex; flex-direction: column; gap: 4px; }
        .vri-lbl { font-size: 11px; font-weight: 600; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; }
        .vri-val { font-size: 20px; font-weight: 700; letter-spacing: -0.5px; }
        .vri-line { height: 1px; background: #e2e8f0; width: 100%; }
        
        @media (max-width: 500px) {
          .vip-ring-body { gap: 20px; }
          .ring-wrapper { width: 80px; height: 80px; }
          .vri-val { font-size: 16px; }
        }

        .vip-perks-row {
          display: flex;
          justify-content: space-between;
          border-top: 1px solid rgba(217, 192, 143, 0.15);
          padding-top: 24px;
        }
        .vip-perk-item {
          display: flex;
          align-items: center;
          gap: 12px;
          color: var(--champagne);
        }
        .vp-text {
          font-size: 11px;
          color: #64748b;
          line-height: 1.4;
        }
        .vp-text strong { color: #0f172a; font-weight: 500; }

        /* ── ROW 3: HISTORIAL APPLE UX ── */
        .history-card-v2 {
          padding: 24px !important;
          border: 1px solid rgba(217, 192, 143, 0.15);
          border-radius: 24px;
          display: flex;
          flex-direction: column;
          gap: 24px;
        }
        .history-header-v2 {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        
        .history-metrics-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 12px;
        }
        .metric-box {
          background: #ffffff;
          border: 1px solid rgba(217, 192, 143, 0.15);
          border-radius: 16px;
          padding: 16px;
          display: flex;
          align-items: flex-start;
          gap: 12px;
          transition: all 0.3s;
        }
        .metric-box:hover {
          background: #f7f7f5;
          border-color: rgba(17,17,17,0.2);
        }
        .metric-icon {
          width: 32px; height: 32px;
          border-radius: 50%;
          background: rgba(17,17,17,0.1);
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0;
        }
        .metric-data {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .m-val {
          font-size: 20px;
          font-weight: 700;
          color: #0f172a;
          line-height: 1;
        }
        .m-lbl {
          font-size: 11px;
          color: #64748b;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .visits-timeline-v2 {
          display: flex;
          flex-direction: column;
          position: relative;
          padding-left: 8px;
        }
        .visits-timeline-v2::before {
          content: '';
          position: absolute;
          top: 8px; bottom: 8px; left: 13px;
          width: 2px;
          background: linear-gradient(to bottom, rgba(217, 192, 143, 0.30) 0%, rgba(217, 192, 143, 0.05) 100%);
        }
        .timeline-item {
          display: flex;
          gap: 20px;
          position: relative;
          padding-bottom: 24px;
        }
        .timeline-item:last-child { padding-bottom: 0; }
        .tl-dot {
          width: 12px; height: 12px;
          border-radius: 50%;
          background: #ffffff;
          border: 2px solid var(--champagne);
          position: relative;
          z-index: 2;
          margin-top: 4px;
          box-shadow: 0 0 8px rgba(17,17,17,0.4);
        }
        .tl-content {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 6px;
          padding: 12px 16px;
          background: #ffffff;
          border: 1px solid rgba(217, 192, 143, 0.15);
          border-radius: 16px;
          transition: all 0.2s;
        }
        .timeline-item:hover .tl-content {
          background: #f7f7f5;
          border-color: rgba(217, 192, 143, 0.15);
          transform: translateX(4px);
        }
        .tl-top {
          display: flex; justify-content: space-between; align-items: center;
        }
        .tl-date {
          font-size: 11px; font-weight: 700; color: var(--champagne); text-transform: uppercase; letter-spacing: 1px;
        }
        .tl-price {
          font-size: 13px; font-weight: 600; color: #64748b;
        }
        .tl-bottom {
          display: flex; justify-content: space-between; align-items: center;
        }
        .tl-service {
          font-size: 14px; font-weight: 700; color: #111111;
        }
        .tl-barber {
          font-size: 12px; font-weight: 500; color: #94a3b8;
        }

        .history-empty-v2 {
          position: relative;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 40px 20px;
          text-align: center;
          background: #ffffff;
          border-radius: 20px;
          border: 1px dashed rgba(217, 192, 143, 0.3);
          overflow: hidden;
        }
        .empty-glow-bg {
          position: absolute;
          width: 200px; height: 200px;
          background: radial-gradient(circle, rgba(17,17,17,0.08) 0%, transparent 70%);
          top: 50%; left: 50%;
          transform: translate(-50%, -50%);
          pointer-events: none;
        }
        .empty-icon-wrapper {
          width: 64px; height: 64px;
          border-radius: 50%;
          background: #f7f7f5;
          border: 1px solid rgba(217, 192, 143, 0.15);
          display: flex; align-items: center; justify-content: center;
          margin-bottom: 16px;
          position: relative;
          z-index: 2;
          box-shadow: inset 0 2px 10px rgba(15,23,42,0.05);
        }
        .history-empty-v2 h4 {
          font-size: 16px; font-weight: 700; color: #111111; margin: 0 0 8px; z-index: 2;
        }
        .history-empty-v2 p {
          font-size: 13px; color: #94a3b8; margin: 0; line-height: 1.5; z-index: 2;
        }
        
        @media (max-width: 768px) {
          .history-metrics-grid { grid-template-columns: 1fr; }
        }

        .favorite-content { display: flex; flex-direction: column; gap: 24px; }
        .main-favorite { display: flex; gap: 20px; align-items: center; }
        .main-fav-img { width: 80px; height: 80px; border-radius: 24px; object-fit: cover; }
        .fav-name-row { display: flex; alignItems: center; gap: 10px; margin-bottom: 4px; }
        .fav-name-row h4 { margin: 0; font-size: 18px; font-weight: 600; color: #111111; letter-spacing: -0.2px; }
        .fav-role { font-size: 12px; color: #64748b; display: block; margin-bottom: 8px; }
        .fav-desc { font-size: 13px; color: #94a3b8; margin: 0; line-height: 1.5; }
        
        .other-favorites { display: flex; gap: -12px; margin-left: 12px; }
        .small-fav-img { width: 40px; height: 40px; border-radius: 12px; border: 2px solid #1a1a1a; object-fit: cover; margin-left: -12px; }
        .add-fav-btn { width: 40px; height: 40px; border-radius: 12px; background: #f7f7f5; display: flex; align-items: center; justify-content: center; color: #64748b; border: 1px dashed rgba(217, 192, 143, 0.3); margin-left: 8px; cursor: pointer; font-size: 20px; }

        .prizes-list-new { display: flex; flex-direction: column; gap: 14px; }
        .prize-row-new {
          display: flex;
          align-items: center;
          gap: 16px;
          padding: 10px 12px;
          background: #ffffff;
          border: 1px solid rgba(217, 192, 143, 0.15);
          border-radius: 12px;
          margin-bottom: 8px;
          cursor: pointer;
          transition: all 0.2s;
        }
        .prize-row-new:hover {
          background: #f7f7f5;
          border-color: rgba(217, 192, 143, 0.3);
          transform: translateY(-2px);
          box-shadow: 0 8px 24px rgba(0,0,0,0.2);
        }
        .prize-row-new.locked { 
          opacity: 0.5; 
          filter: grayscale(1); 
        }
        .prize-icon-bg {
          width: 48px; height: 48px; border-radius: 14px; 
          background: linear-gradient(135deg, rgba(17,17,17,0.15) 0%, rgba(17,17,17,0.05) 100%);
          border: 1px solid rgba(17,17,17,0.2);
          display: flex; align-items: center; justify-content: center; flex-shrink: 0;
          box-shadow: inset 0 0 10px rgba(15,23,42,0.04);
        }
        .prize-info-new { flex: 1; }
        .prize-info-new h4 { margin: 0 0 4px; font-size: 15px; font-weight: 700; color: #111111; letter-spacing: -0.2px; text-shadow: 0 2px 4px rgba(0,0,0,0.10); }
        .prize-info-new p { margin: 0; font-size: 13px; color: #94a3b8; font-weight: 500; }
        .prize-pts-req { 
          font-size: 16px; font-weight: 800; 
          background: linear-gradient(90deg, #fceabb 0%, #CB892B 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }
        .prize-row-new.locked .prize-pts-req {
           background: #94a3b8;
           -webkit-background-clip: text;
        }

        /* ── RESERVA RÁPIDA V2 (APPLE UX PILLS) ── */
        .quick-book-card-v2 {
          padding: 20px 24px !important;
          background: linear-gradient(180deg, rgba(17,17,17,0.06) 0%, rgba(17,17,17,0) 100%);
        }
        .quick-book-header-v2 {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .qb-icon {
          filter: drop-shadow(0 0 8px rgba(17,17,17,0.4));
        }
        .quick-book-desc-v2 {
          font-size: 13px;
          color: #94a3b8;
          margin: 6px 0 20px;
          font-weight: 500;
        }
        .quick-book-avatars-v2 {
          display: flex;
          gap: 12px;
          overflow-x: auto;
          padding-bottom: 8px;
          padding-top: 4px;
          touch-action: pan-x pan-y;
        }
        .quick-book-avatars-v2::-webkit-scrollbar { display: none; }
        
        .qb-item-v2 {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          width: 80px;
          height: 120px;
          border-radius: 40px;
          background: #ffffff;
          border: 1px solid rgba(217, 192, 143, 0.15);
          cursor: pointer;
          transition: all 0.3s cubic-bezier(0.2, 0.8, 0.2, 1);
          flex-shrink: 0;
          position: relative;
          overflow: hidden;
        }
        .qb-item-v2::before {
          content: ''; position: absolute; top: 0; left: 0; right: 0; bottom: 0;
          background: radial-gradient(circle at center 20%, rgba(17,17,17,0.1) 0%, transparent 70%);
          opacity: 0; transition: opacity 0.3s;
        }
        .qb-item-v2:hover {
          transform: translateY(-4px);
          border-color: rgba(17,17,17,0.2);
          background: #f7f7f5;
          box-shadow: 0 10px 20px rgba(0,0,0,0.2);
        }
        .qb-item-v2:hover::before { opacity: 1; }

        .qb-avatar-wrapper {
          position: relative;
          width: 52px; height: 52px;
          border-radius: 50%;
          margin-bottom: 8px;
          display: flex; align-items: center; justify-content: center;
          z-index: 2;
        }
        .qb-avatar-img {
          width: 100%; height: 100%;
          border-radius: 50%;
          object-fit: cover;
          position: relative;
          z-index: 2;
        }
        .qb-avatar-ring {
          position: absolute;
          top: -3px; left: -3px; right: -3px; bottom: -3px;
          border-radius: 50%;
          border: 1px solid rgba(217, 192, 143, 0.15);
          z-index: 1;
          transition: all 0.3s;
        }
        .qb-item-v2:hover .qb-avatar-ring {
          border-color: var(--champagne);
          box-shadow: 0 0 12px rgba(17,17,17,0.3);
          transform: scale(1.05);
        }

        .qb-name-v2 {
          font-size: 12px;
          font-weight: 700;
          color: #0f172a;
          margin-bottom: 2px;
          z-index: 2;
        }
        .qb-action-txt {
          font-size: 10px;
          font-weight: 700;
          color: var(--champagne);
          text-transform: uppercase;
          letter-spacing: 0.5px;
          opacity: 0;
          transform: translateY(4px);
          transition: all 0.3s;
          z-index: 2;
        }
        .qb-item-v2:hover .qb-action-txt {
          opacity: 1;
          transform: translateY(0);
        }

        .qb-add-icon {
          width: 52px; height: 52px;
          border-radius: 50%;
          background: #f7f7f5;
          display: flex; align-items: center; justify-content: center;
          z-index: 2;
        }
        .qb-more:hover .qb-add-icon {
          background: rgba(17,17,17,0.15);
        }
        .qb-more:hover .qb-avatar-ring {
          border-color: rgba(217, 192, 143, 0.3);
          box-shadow: none;
        }
        .qb-more .qb-action-txt {
          color: #64748b;
        }

        /* ── SPLIT PHOTO + VIDEO FAVORITE BARBER ── */
        .hero-fav-card {
          padding: 0 !important;
          overflow: hidden;
          border: none !important;
          background: #111 !important;
          position: relative;
          border-radius: 20px !important;
        }
        .hero-fav-header {
          position: absolute;
          top: 16px;
          left: 20px;
          right: 20px;
          z-index: 10;
        }
        .hero-fav-header .dash-section-title {
          text-shadow: 0 2px 8px rgba(0,0,0,0.8);
        }

        /* Star Tabs */
        .star-tabs {
          display: flex;
          gap: 4px;
          background: rgba(0,0,0,0.4);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          border-radius: 12px;
          padding: 3px;
          border: 1px solid rgba(255, 255, 255, 0.08);
        }
        .star-tab {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 6px 14px;
          border: none;
          border-radius: 10px;
          background: transparent;
          color: rgba(255, 255, 255, 0.5);
          font-size: 12px;
          font-weight: 700;
          letter-spacing: 0.3px;
          cursor: pointer;
          transition: all 0.3s ease;
          text-transform: uppercase;
        }
        .star-tab.active {
          background: rgba(255,255,255,0.12);
          color: var(--champagne);
          box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        }
        .star-tab:hover:not(.active) {
          color: rgba(255, 255, 255, 0.8);
        }

        .favorite-content-poster {
          height: 100%;
          display: flex;
          flex-direction: column;
        }

        /* Split Grid */
        .poster-split-layout {
          position: relative;
          display: grid;
          grid-template-columns: 1fr 1fr;
          min-height: 280px;
          flex: 1;
        }
        .split-photo-panel,
        .split-video-panel {
          position: relative;
          overflow: hidden;
        }
        .split-photo-panel {
          border-right: 1px solid rgba(255,255,255,0.06);
        }
        .split-panel-media {
          position: absolute;
          top: 0; left: 0;
          width: 100%;
          height: 100%;
          object-fit: cover;
          object-position: center 20%;
          z-index: 1;
          transition: transform 0.6s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .split-photo-panel:hover .split-panel-media,
        .split-video-panel:hover .split-panel-media {
          transform: scale(1.05);
        }
        .split-panel-overlay {
          position: absolute;
          top: 0; left: 0; right: 0; bottom: 0;
          background: linear-gradient(to bottom, rgba(0,0,0,0.3) 0%, rgba(0,0,0,0) 40%, rgba(0,0,0,0.5) 70%, #111 100%);
          z-index: 2;
          pointer-events: none;
        }

        /* Video Badge */
        .video-badge {
          position: absolute;
          top: 48px;
          right: 12px;
          z-index: 5;
          display: flex;
          align-items: center;
          gap: 6px;
          background: rgba(0,0,0,0.5);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          border: 1px solid rgba(255,255,255,0.1);
          padding: 5px 10px;
          border-radius: 20px;
          font-size: 10px;
          font-weight: 700;
          color: rgba(255, 255, 255, 0.8);
          letter-spacing: 1px;
          text-transform: uppercase;
        }
        .video-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #ff3b30;
          box-shadow: 0 0 6px #ff3b30;
          animation: blink-dot 1.5s infinite;
        }
        @keyframes blink-dot {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }

        /* Bottom Info Bar */
        .split-bottom-info {
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          z-index: 5;
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          padding: 20px;
          background: linear-gradient(to top, #111 0%, rgba(17,17,17,0.8) 60%, transparent 100%);
          transition: transform 0.4s ease;
        }
        .hero-fav-card:hover .split-bottom-info {
          transform: translateY(-2px);
        }
        .poster-info {
          position: relative;
          z-index: 3;
        }
        .poster-name-row {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 4px;
        }
        .poster-name-row h4 {
          margin: 0;
          font-size: 22px;
          font-weight: 800;
          color: #ffffff;
          letter-spacing: -0.3px;
          text-shadow: 0 4px 12px rgba(0,0,0,0.5);
        }
        .glow-star {
          filter: drop-shadow(0 0 8px rgba(17,17,17,0.6));
          animation: pulse-star 3s infinite alternate;
        }
        @keyframes pulse-star {
          0% { filter: drop-shadow(0 0 4px rgba(17,17,17,0.4)) scale(1); }
          100% { filter: drop-shadow(0 0 12px rgba(17,17,17,0.8)) scale(1.15); }
        }
        .poster-role {
          font-size: 11px;
          color: var(--champagne);
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.8px;
        }
        .poster-visits {
          display: block;
          font-size: 11px;
          color: rgba(255, 255, 255, 0.4);
          font-weight: 500;
          margin-top: 4px;
        }

        /* Avatar Stack */
        .poster-avatar-stack {
          display: flex;
          align-items: center;
          z-index: 4;
        }
        .stack-img {
          width: 34px;
          height: 34px;
          border-radius: 50%;
          border: 2px solid #111;
          object-fit: cover;
          margin-left: -10px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.4);
        }
        .stack-img:first-child {
          margin-left: 0;
        }
        .stack-add-btn {
          width: 34px;
          height: 34px;
          border-radius: 50%;
          background: rgba(255,255,255,0.1);
          backdrop-filter: blur(10px);
          -webkit-backdrop-filter: blur(10px);
          border: 1px solid rgba(255,255,255,0.15);
          display: flex;
          align-items: center;
          justify-content: center;
          color: #ffffff;
          margin-left: -10px;
          cursor: pointer;
          transition: all 0.2s;
          box-shadow: 0 4px 12px rgba(0,0,0,0.4);
        }
        .stack-add-btn:hover {
          background: rgba(255,255,255,0.2);
          transform: translateY(-2px);
          color: var(--champagne);
          border-color: var(--champagne);
        }

        /* ── MODALS ── */
        .dash-modal-overlay {
          position: fixed;
          top: 0; left: 0; right: 0; bottom: 0;
          background: rgba(0,0,0,0.6);
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 9999;
          padding: 20px;
        }
        .dash-modal {
          background: #ffffff;
          border: 1px solid rgba(217, 192, 143, 0.15);
          border-radius: 24px;
          width: 100%;
          max-width: 600px;
          max-height: 80vh;
          overflow-y: auto;
          box-shadow: 0 20px 40px rgba(0,0,0,0.10);
          display: flex;
          flex-direction: column;
        }
        .dash-modal.sm {
          max-width: 400px;
        }
        .dash-modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 24px;
          border-bottom: 1px solid rgba(217, 192, 143, 0.15);
        }
        .dash-modal-header h3 { margin: 0; font-size: 18px; color: #111111; }
        .close-btn { background: transparent; border: none; color: #64748b; cursor: pointer; transition: color 0.2s; padding: 0; display: flex; }
        .close-btn:hover { color: #0f172a; }
        .dash-modal-body {
          padding: 24px;
        }

        /* ── BUTTONS ── */
        .dash-btn {
          background: #e8d4b0;
          color: #111111;
          border: none;
          padding: 14px 28px;
          border-radius: 999px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: opacity 0.2s;
        }
        .dash-btn:hover { opacity: 0.9; }

        .empty-state-card {
          flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; color: #94a3b8; font-size: 14px; gap: 20px;
          padding: 40px 0;
        }

        /* =========================================
           TITANIUM VIP CARD (APPLE CARD STYLE)
           ========================================= */
        .titanium-card-wrapper {
          perspective: 1000px;
          margin-bottom: 24px;
        }
        .titanium-card {
          position: relative;
          width: 100%;
          height: 220px;
          border-radius: 20px;
          background: linear-gradient(135deg, #ffffff 0%, #f7f7f5 100%);
          border: 1px solid rgba(217, 192, 143, 0.15);
          box-shadow: 
            0 20px 40px rgba(0,0,0,0.10),
            inset 0 1px 1px rgba(255,255,255,0.2),
            inset 0 -1px 1px rgba(0,0,0,0.10);
          overflow: hidden;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          padding: 24px;
          transform-style: preserve-3d;
          transition: transform 0.6s cubic-bezier(0.2, 0.8, 0.2, 1);
        }
        .titanium-card:hover {
          transform: rotateX(5deg) rotateY(2deg) scale(1.02);
        }
        .tc-shimmer {
          position: absolute;
          top: -100%; left: -100%;
          width: 300%; height: 300%;
          background: linear-gradient(
            45deg,
            rgba(15, 23, 42, 0) 0%,
            rgba(15, 23, 42, 0.04) 45%,
            rgba(15, 23, 42, 0.10) 50%,
            rgba(15, 23, 42, 0.04) 55%,
            rgba(15, 23, 42, 0) 100%
          );
          transform: rotate(30deg);
          animation: shimmer 6s infinite linear;
          pointer-events: none;
        }
        @keyframes shimmer {
          0% { transform: translateY(-50%) translateX(-50%) rotate(30deg); }
          100% { transform: translateY(50%) translateX(50%) rotate(30deg); }
        }
        .tc-glare {
          position: absolute;
          inset: 0;
          background: radial-gradient(circle at 50% 0%, rgba(15, 23, 42, 0.08) 0%, transparent 60%);
          pointer-events: none;
        }
        .tc-content {
          position: relative;
          z-index: 2;
          display: flex;
          flex-direction: column;
          height: 100%;
          justify-content: space-between;
        }
        .tc-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .tc-brand {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .tc-logo {
          width: 24px; height: 24px;
          filter: brightness(0) opacity(0.7);
        }
        .tc-brand span {
          font-size: 14px; font-weight: 800; letter-spacing: 2px;
          color: #334155;
        }
        .tc-rank-badge {
          background: var(--gold-gradient);
          color: #ffffff;
          padding: 4px 10px;
          border-radius: 12px;
          font-size: 10px;
          font-weight: 800;
          display: flex; align-items: center; gap: 4px;
          text-transform: uppercase;
          letter-spacing: 1px;
          box-shadow: 0 4px 10px rgba(17,17,17,0.3);
        }
        .tc-middle {
          display: flex;
          align-items: center;
          gap: 16px;
          margin-top: auto;
          margin-bottom: 24px;
        }
        .tc-chip {
          width: 38px; height: 28px;
          background: linear-gradient(135deg, #111111 0%, #aa7c11 100%);
          border-radius: 4px;
          position: relative;
          overflow: hidden;
          box-shadow: inset 0 1px 2px rgba(255,255,255,0.5), 0 2px 4px rgba(0,0,0,0.2);
        }
        .tc-chip-line {
          position: absolute;
          background: rgba(0,0,0,0.2);
        }
        .tc-chip-line:nth-child(1) { top: 30%; left: 0; right: 0; height: 1px; }
        .tc-chip-line:nth-child(2) { top: 60%; left: 0; right: 0; height: 1px; }
        .tc-chip-line:nth-child(3) { top: 0; bottom: 0; left: 40%; width: 1px; }
        
        .tc-footer {
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
        }
        .tc-client-info {
          display: flex;
          flex-direction: column;
        }
        .tc-client-name {
          font-size: 18px;
          font-weight: 700;
          letter-spacing: 1.5px;
          color: #0f172a;
          text-shadow: 0 2px 4px rgba(0,0,0,0.10);
          text-transform: uppercase;
        }
        .tc-member-since {
          font-size: 10px;
          color: #94a3b8;
          text-transform: uppercase;
          letter-spacing: 1px;
          margin-top: 2px;
        }
        .tc-points {
          display: flex;
          align-items: baseline;
          gap: 4px;
        }
        .tc-pts-value {
          font-size: 28px;
          font-weight: 800;
          color: #0f172a;
          line-height: 1;
        }
        .tc-pts-label {
          font-size: 10px;
          font-weight: 700;
          color: var(--champagne);
          letter-spacing: 1px;
        }

        /* =========================================
           ULTRA MINIMALIST VIP PROGRESS V3
           ========================================= */
        .vip-progress-v3 {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        .vp3-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .vp3-title {
          font-size: 14px;
          font-weight: 700;
          color: #0f172a;
          margin: 0;
        }
        .vp3-current {
          font-size: 12px;
          font-weight: 800;
          color: var(--champagne);
          text-transform: uppercase;
          letter-spacing: 1px;
        }
        .vp3-track-container {
          padding: 10px 0;
        }
        .vp3-track {
          width: 100%;
          height: 6px;
          background: #f7f7f5;
          border-radius: 3px;
          position: relative;
          overflow: visible;
        }
        .vp3-fill {
          height: 100%;
          background: var(--gold-gradient);
          border-radius: 3px;
          position: relative;
          transition: width 1s cubic-bezier(0.4, 0, 0.2, 1);
          box-shadow: 0 0 10px rgba(17,17,17,0.5);
        }
        .vp3-glow-dot {
          position: absolute;
          right: -4px;
          top: 50%;
          transform: translateY(-50%);
          width: 12px;
          height: 12px;
          background: #fff;
          border-radius: 50%;
          box-shadow: 0 0 15px 5px rgba(17,17,17,0.8);
        }
        .vp3-footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 11px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .vp3-pts-left { color: #94a3b8; }
        .vp3-next-rank { color: #475569; }

        /* =========================================
           MOBILE-FIRST APPLE UX (OVERRIDES)
           ========================================= */
        @media (max-width: 999px) {
          /* Reorder Layout */
          .dashboard-left-col, .dashboard-right-col { display: contents; }
          .dashboard-two-column-layout { display: flex; flex-direction: column; }
          
          .vip-ring-card { order: 1; }
          .next-appt-card-v2 { order: 2; }
          .quick-book-card-v2 { order: 3; }
          .history-card-v2 { order: 4; }
          .prizes-card { order: 5; }

          /* Next Appt Card - COMPACT HORIZONTAL WALLET STYLE */
          .next-appt-card-v2 {
            border-radius: 28px;
            background: rgba(16, 16, 20, 0.6);
            backdrop-filter: blur(24px);
            -webkit-backdrop-filter: blur(24px);
            border: 1px solid rgba(255, 255, 255, 0.12);
            box-shadow: 0 16px 40px rgba(0,0,0,0.4);
            touch-action: pan-y;
          }
          .appt-hero-wrapper {
            height: auto;
            min-height: auto;
            padding: 20px;
            gap: 16px;
            display: flex;
            flex-direction: column;
          }
          .appt-hero-bg {
            opacity: 0.15;
            mask-image: none;
            -webkit-mask-image: none;
          }
          .appt-hero-overlay {
            background: linear-gradient(135deg, rgba(16,16,20,0.8) 0%, rgba(16,16,20,0.5) 100%);
          }
          .appt-countdown-area {
            align-self: stretch;
            flex-direction: row;
            justify-content: space-between;
            align-items: center;
            background: rgba(255, 255, 255, 0.05);
            backdrop-filter: blur(12px);
            -webkit-backdrop-filter: blur(12px);
            border-radius: 16px;
            border: 1px solid rgba(255,255,255,0.1);
            padding: 12px 16px;
            box-shadow: none;
          }
          .appt-countdown-row { gap: 12px; }
          .appt-countdown-label { font-size: 10px; margin-bottom: 0; color: rgba(255, 255, 255, 0.6); }
          .countdown-num { font-size: 24px; text-shadow: none; }
          .countdown-txt { font-size: 9px; margin-top: 0; margin-left: 4px; }
          .countdown-unit { flex-direction: row; align-items: baseline; min-width: auto; }
          
          .appt-hero-bottom {
            flex-direction: row;
            justify-content: space-between;
            align-items: center;
            gap: 16px;
            width: 100%;
          }
          .appt-day-num-row { align-items: center; gap: 4px; }
          .appt-day-num { font-size: 36px; }
          .appt-month-name { font-size: 12px; }
          
          .appt-chips {
            flex-direction: column;
            align-items: flex-end;
            gap: 6px;
          }
          .appt-chip {
            padding: 4px 8px;
            font-size: 10px;
            border-radius: 12px;
            background: rgba(255,255,255,0.1);
            border: 1px solid rgba(255,255,255,0.15);
          }
          .barber-chip { padding: 4px 10px; }
          
          .appt-status-badge {
            position: relative;
            top: auto; right: auto; bottom: auto;
            padding: 4px 10px;
            font-size: 10px;
            background: rgba(0,0,0,0.6);
            align-self: flex-start;
            order: -1;
            margin-bottom: 4px;
            border: 1px solid rgba(255,255,255,0.1);
          }

          /* History Card Bento Grid */
          .history-card-v2 {
            border-radius: 32px;
            background: #ffffff;
            backdrop-filter: blur(24px);
            -webkit-backdrop-filter: blur(24px);
            border: 1px solid rgba(217, 192, 143, 0.15);
            padding: 24px !important;
            touch-action: pan-y;
          }
          .history-metrics-grid {
            grid-template-columns: 1fr 1fr;
            gap: 12px;
          }
          .history-metrics-grid .metric-box:nth-child(3) {
            grid-column: span 2;
            flex-direction: row;
            align-items: center;
            justify-content: flex-start;
            gap: 16px;
          }
          .metric-box {
            border-radius: 20px;
            padding: 16px;
            background: #f7f7f5;
            box-shadow: inset 0 1px 0 rgba(15,23,42,0.05);
            flex-direction: column;
            align-items: flex-start;
            gap: 8px;
          }
          .metric-icon {
            width: 36px; height: 36px;
            border-radius: 12px;
            margin-bottom: 0;
          }
          .metric-icon svg { width: 18px; height: 18px; }
          .m-val { font-size: 24px; white-space: normal; word-break: break-word; line-height: 1; }
          .m-lbl { font-size: 11px; white-space: normal; line-height: 1.2; }
          
          /* SMART HIDE TIMELINE ON MOBILE */
          .visits-timeline-v2 {
            display: none !important;
          }

          /* Quick Book Mobile */
          .quick-book-card-v2 {
            border-radius: 32px;
            padding: 24px !important;
          }
          
          /* VIP Ring Compact */
          .vip-ring-card {
            border-radius: 32px;
            padding: 24px !important;
          }
          .vip-ring-body { gap: 16px; }
        }

        /* =========================================
           BENEFITS CAROUSEL (GLOBAL)
           ========================================= */
        .prizes-list-new {
          flex-direction: row;
          overflow-x: auto;
          flex-wrap: nowrap;
          gap: 16px;
          padding-bottom: 12px;
          touch-action: pan-x pan-y;
        }
        .prizes-list-new::-webkit-scrollbar { display: none; }
        .prize-row-new {
          flex-direction: column;
          align-items: flex-start;
          min-width: 180px;
          width: 180px;
          padding: 20px;
          border-radius: 24px;
          gap: 12px;
        }
        .prize-icon-bg {
          width: 44px; height: 44px;
          border-radius: 12px;
        }
        .prize-info-new h4 { font-size: 15px; white-space: normal; line-height: 1.2; }
        .prize-info-new p { display: none; }
        .prize-pts-req { font-size: 14px; margin-top: auto; }
      `}</style>
    </div>
  );
}
