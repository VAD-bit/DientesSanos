import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, ArrowRight, ArrowLeft, User, Coins, Gift, Bookmark, Phone, CreditCard, Check, Calendar, Star, Scissors, Loader2 } from 'lucide-react';
import { motion, useMotionValue, useSpring, useTransform, AnimatePresence } from 'framer-motion';
import { publicService } from '../services/publicService';
import { clearGoogleAuthIntent, GOOGLE_AUTH_DESTINATIONS, setGoogleAuthIntent } from '../utils/googleAuthIntent';
import { formatBirthDateInput } from '../../utils/dateTime';
import logo from '../../assets/logo_full.png';

const BENEFITS = [
  { icon: Coins, title: 'Acumula puntos', desc: 'en cada visita' },
  { icon: Gift, title: 'Gana premios', desc: 'exclusivos' },
  { icon: Bookmark, title: 'Guarda tu estilo', desc: 'y servicios favoritos' },
];

const RANKS = [
  { min: 300, label: 'Oro' },
  { min: 200, label: 'Plata' },
  { min: 100, label: 'Bronce' },
  { min: 0, label: 'Básico' },
];
const getRank = (points) => RANKS.find(r => points >= r.min)?.label || 'Básico';

export default function Login() {
  const [mode, setMode] = useState(() => {
    const saved = localStorage.getItem('panda_remember_me');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Check TTL (30 days)
        const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
        if (parsed.timestamp && Date.now() - parsed.timestamp > thirtyDaysMs) {
          localStorage.removeItem('panda_remember_me');
          return 'register';
        }
        return 'login';
      } catch {}
    }
    return 'register';
  });
  const [showPassword, setShowPassword] = useState(false);
  const [registerStep, setRegisterStep] = useState(1);
  const [loginForm, setLoginForm] = useState(() => {
    const saved = localStorage.getItem('panda_remember_me');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Check TTL (30 days)
        const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
        if (parsed.timestamp && Date.now() - parsed.timestamp > thirtyDaysMs) {
          localStorage.removeItem('panda_remember_me');
          return { identifier: '', password: '' };
        }
        return { identifier: parsed.identifier || '', password: parsed.password || '' };
      } catch {}
    }
    return { identifier: '', password: '' };
  });
  const [registerForm, setRegisterForm] = useState({ name: '', birth_date: '', birth_date_iso: '', phone: '', id_card: '', email: '', password: '' });
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  // birth_date stays "dd/mm/aaaa" for display in the input; birth_date_iso ("yyyy-mm-dd")
  // is what actually gets stored — the DB and every birthday check (roulette, admin
  // toast) compare against ISO, so saving the raw display string silently broke them.
  const handleBirthDateChange = (e) => {
    const { display, iso } = formatBirthDateInput(e.target.value);
    setRegisterForm({ ...registerForm, birth_date: display, birth_date_iso: iso });
  };
  const isStep1Valid = registerForm.name.trim() && registerForm.birth_date.length === 10 && registerForm.phone.trim() && registerForm.id_card.trim() && registerForm.email.trim();
  const [rememberMe, setRememberMe] = useState(() => Boolean(localStorage.getItem('panda_remember_me')));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showWelcome, setShowWelcome] = useState(false);
  const [welcomeData, setWelcomeData] = useState(null);
  const [screen, setScreen] = useState(() => {
    const w = window.innerWidth;
    return w < 480 ? 'xs' : w < 1200 ? 'sm' : 'lg';
  });
  const [isPortraitTablet, setIsPortraitTablet] = useState(() => {
    return window.innerWidth >= 768 && window.innerWidth < 1200 && window.innerHeight > window.innerWidth;
  });
  const [isBigTablet, setIsBigTablet] = useState(() => {
    return window.innerWidth >= 900 && window.innerWidth < 1200 && window.innerHeight > window.innerWidth;
  });
  const [isXL, setIsXL] = useState(() => window.innerWidth >= 1600);
  const isSmall = screen === 'xs' || screen === 'sm';
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const handleResize = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      setScreen(w < 480 ? 'xs' : w < 1200 ? 'sm' : 'lg');
      setIsPortraitTablet(w >= 768 && w < 1200 && h > w);
      setIsBigTablet(w >= 900 && w < 1200 && h > w);
      setIsXL(w >= 1600);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const result = await publicService.loginClient({ identifier: loginForm.identifier, password: loginForm.password });
      let client = null;
      if (loginForm.identifier.includes('@')) {
        client = await publicService.getClientByEmail(loginForm.identifier);
      } else {
        client = await publicService.getClientByPhone(loginForm.identifier);
      }
      if (client) {
        localStorage.setItem('panda_public_client', JSON.stringify(client));
      }
      localStorage.setItem('panda_public_session', JSON.stringify(result.session));

      if (rememberMe) {
        localStorage.setItem('panda_remember_me', JSON.stringify({ identifier: loginForm.identifier, password: loginForm.password, timestamp: Date.now() }));
      } else {
        localStorage.removeItem('panda_remember_me');
      }

      const shouldStartBooking = location.state?.startBooking
        || localStorage.getItem('panda_login_return_to_booking') === 'true';

      // Show welcome back modal
      setWelcomeData({
        name: client?.name?.split(' ')[0] || '',
        isReturning: true,
        shouldStartBooking,
      });
      setShowWelcome(true);
    } catch (e) {
      console.error('Login error:', e);
      setError(e.message || 'Credenciales incorrectas.');
    } finally {
      setLoading(false);
    }
  };

  const handleWelcomeClose = () => {
    setShowWelcome(false);
    const shouldStartBooking = welcomeData?.shouldStartBooking
      || location.state?.startBooking
      || localStorage.getItem('panda_login_return_to_booking') === 'true';

    if (shouldStartBooking) {
      localStorage.removeItem('panda_login_return_to_booking');
      const hasSavedBooking = Boolean(
        localStorage.getItem('panda_draft_booking') || localStorage.getItem('bookingState')
      );
      navigate('/agendar', {
        replace: true,
        state: hasSavedBooking ? {} : { startBooking: true }
      });
    } else {
      navigate('/perfil');
    }
  };

  const handleWelcomeBooking = () => {
    setShowWelcome(false);
    localStorage.removeItem('panda_login_return_to_booking');
    const hasSavedBooking = Boolean(
      localStorage.getItem('panda_draft_booking') || localStorage.getItem('bookingState')
    );
    navigate('/agendar', {
      replace: true,
      state: hasSavedBooking ? {} : { startBooking: true }
    });
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const result = await publicService.registerClient({ ...registerForm, birth_date: registerForm.birth_date_iso });
      localStorage.setItem('panda_public_client', JSON.stringify(result.client));

      // Store session if available
      if (result.session) {
        localStorage.setItem('panda_public_session', JSON.stringify(result.session));
      }

      // Same "first time in your profile" intro as Google/CompleteRegistration
      // signups — stays pending until the visitor actually reaches /perfil
      // (see the route-gated effect in PublicLayout.jsx).
      localStorage.setItem('panda_show_onboarding', 'true');

      const shouldResumeBooking =
        localStorage.getItem('panda_login_return_to_booking') === 'true'
        && Boolean(localStorage.getItem('panda_draft_booking'));

      if (shouldResumeBooking) {
        navigate('/agendar', { replace: true });
      } else {
        localStorage.removeItem('panda_login_return_to_booking');
        // A normal registration enters onboarding immediately. PublicLayout
        // displays it when /perfil mounts, then leaves the member in profile.
        navigate('/perfil', { replace: true });
      }
    } catch (e) {
      console.error('Register error:', e);
      setError(e.message || 'Error al registrar. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError('');
    setIsGoogleLoading(true);
    try {
      localStorage.setItem('panda_google_login_pending', 'true');
      if (location.state?.startBooking) {
        setGoogleAuthIntent(GOOGLE_AUTH_DESTINATIONS.BOOKING);
        localStorage.setItem('panda_login_return_to_booking', 'true');
      } else {
        setGoogleAuthIntent(GOOGLE_AUTH_DESTINATIONS.PROFILE);
        // Entering Google from the regular "Iniciar sesión" flow is not a
        // booking continuation. Clear any abandoned flag so it cannot hijack
        // this new registration after the missing profile data is completed.
        localStorage.removeItem('panda_login_return_to_booking');
      }
      await publicService.signInWithGoogle();
    } catch (e) {
      setIsGoogleLoading(false);
      clearGoogleAuthIntent();
      localStorage.removeItem('panda_google_login_pending');
      console.error('Google login error:', e);
      setError('Error al iniciar sesión con Google');
    }
  };

  const memberSinceRaw = new Date().toLocaleDateString('es-ES', { month: 'short', year: 'numeric' });
  const memberSince = memberSinceRaw.charAt(0).toUpperCase() + memberSinceRaw.slice(1).replace('.', '');
  const rank = getRank(0);
  const displayName = registerForm.name.trim() || 'Tu nombre aquí';
  const initials = registerForm.name.trim()
    ? registerForm.name.trim().split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase()
    : '?';

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

  const inputH = isBigTablet ? 58 : (isSmall ? 48 : undefined);

  return (
    <>
    <style>{`
      .whatsapp-float-btn { display: none !important; }
    `}</style>
    <div style={{
      minHeight: isSmall ? '100dvh' : '100vh', position: 'relative', overflow: 'hidden',
      background: '#f4f5f3',
      backgroundImage: 'linear-gradient(135deg,#f7f4ee 0%,#efe6d5 50%,#e8d4b0 100%)',
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      backgroundRepeat: 'no-repeat',
      backgroundAttachment: isSmall ? 'scroll' : 'fixed',
    }}>
      <div style={{
        position: 'absolute', inset: 0, zIndex: 0,
        background: `none`,
      }} />

      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        style={{ position: 'absolute', top: `calc(max(env(safe-area-inset-top, 0px), ${isSmall ? 8 : 12}px))`, left: isSmall ? 12 : 20, zIndex: 2 }}
      >
        <Link
          to="/"
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            background: 'rgba(255,255,255,0.85)', border: '1px solid rgba(217, 192, 143,0.25)',
            borderRadius: 999, padding: isSmall ? '8px 16px' : '8px 16px', fontSize: isSmall ? 12 : 12.5, fontWeight: 700,
            color: '#111111', textDecoration: 'none',
            transition: 'all 0.2s ease',
            backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
          }}
        >
          <ArrowLeft size={isSmall ? 14 : 14} /> Volver
        </Link>
      </motion.div>

      <div style={{
        position: 'relative', zIndex: 1,
        minHeight: isSmall ? '100dvh' : '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        padding: isSmall ? 'calc(max(env(safe-area-inset-top, 0px) + 20px, 60px)) 16px 40px' : 'clamp(10px, 2vw, 24px) clamp(16px, 5vw, 48px)',
      }}>
        <style>{`
          .auth-input:-webkit-autofill,
          .auth-input:-webkit-autofill:hover,
          .auth-input:-webkit-autofill:focus,
          .input-field:-webkit-autofill,
          .input-field:-webkit-autofill:hover,
          .input-field:-webkit-autofill:focus {
            -webkit-box-shadow: 0 0 0 1000px rgba(233,234,232,0.9) inset !important;
            -webkit-text-fill-color: var(--text-primary) !important;
            border: 1px solid rgba(17, 17, 17,0.15) !important;
            box-shadow: 0 0 0 1000px rgba(233,234,232,0.9) inset, 0 0 0 1px rgba(17, 17, 17,0.15) !important;
            caret-color: var(--text-primary) !important;
            color: var(--text-primary) !important;
            transition: background-color 5000s ease-in-out 0s;
          }
        `}</style>

        <div style={{
          display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center',
          gap: isSmall ? 16 : (isXL ? 40 : 'clamp(24px, 3vw, 32px)'),
          maxWidth: isSmall ? '100%' : (isXL ? (mode === 'login' ? 1480 : 1760) : (mode === 'login' ? 1060 : 1260)),
          width: '100%',
          flexDirection: isSmall ? 'column' : 'row',
        }}>

          {/* ── Left: branding panel (hidden on small, compact on mobile) ── */}
          {!isSmall && (
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1], delay: 0.1 }}
              style={{ flex: mode === 'login' ? (isXL ? '0 1 480px' : '0 1 420px') : (isXL ? '0 1 400px' : '0 1 340px'), textAlign: 'center', marginRight: mode === 'login' ? (isXL ? 64 : 40) : 0 }}
            >
              <img src={logo} alt="Dientes Sanos" style={{ height: isXL ? 58 : 48, objectFit: 'contain', filter: 'brightness(1.15)', margin: '0 auto 24px', display: 'block' }} />

              <motion.h1
                animate={{ y: [0, -4, 0] }}
                transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                style={{ fontSize: `clamp(1.4rem, 3vw, ${isXL ? '2.4rem' : '2rem'})`, fontWeight: 900, lineHeight: 1.15, marginBottom: 20, textAlign: 'center' }}
              >
                {mode === 'login' ? <>¡Qué bueno <span className="text-gold">verte!</span></> : <>Únete a la<br /><span className="text-gold">familia Dientes Sanos.</span></>}
              </motion.h1>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 20 }}>
                <div style={{ width: 44, height: 1, background: 'linear-gradient(90deg, transparent, var(--champagne))' }} />
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--champagne)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="6" cy="6" r="3" />
                  <circle cx="6" cy="18" r="3" />
                  <line x1="20" y1="4" x2="8.12" y2="15.88" />
                  <line x1="14.47" y1="14.48" x2="20" y2="20" />
                  <line x1="8.12" y1="8.12" x2="12" y2="12" />
                </svg>
                <div style={{ width: 44, height: 1, background: 'linear-gradient(90deg, var(--champagne), transparent)' }} />
              </div>

              <p style={{ color: 'var(--text-secondary)', fontSize: isXL ? 13 : 11.5, lineHeight: 1.6, marginBottom: 20, maxWidth: isXL ? 400 : 340, margin: '0 auto 20px' }}>
                {mode === 'login'
                  ? <>Inicia sesión para reservar, ganar puntos<br />y disfrutar todos los beneficios<br />de <span style={{ color: 'var(--champagne)', fontWeight: 700 }}>Club Sonrisa.</span></>
                  : <>Crea tu cuenta para reservar, ganar puntos<br />y disfrutar todos los beneficios<br />de <span style={{ color: 'var(--champagne)', fontWeight: 700 }}>Club Sonrisa.</span></>
                }
              </p>

              <div style={{
                display: 'flex', marginTop: 12,
                background: 'linear-gradient(180deg, rgba(217, 192, 143,0.05) 0%, rgba(217, 192, 143,0.02) 100%)',
                border: '1px solid rgba(217, 192, 143,0.18)',
                borderRadius: 18, overflow: 'hidden',
              }}>
                {BENEFITS.map(({ icon: Icon, title, desc }, idx) => (
                  <motion.div
                    key={title}
                    whileHover={{ y: -3, background: 'rgba(17, 17, 17,0.06)' }}
                    style={{
                      flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', alignItems: 'center',
                      textAlign: 'center', padding: '14px 8px',
                      position: 'relative', cursor: 'default', borderRadius: 12, transition: 'background 0.2s',
                    }}
                  >
                    {idx > 0 && (
                      <div style={{
                        position: 'absolute', left: 0, top: '18%', bottom: '18%', width: 1,
                        background: 'linear-gradient(180deg, transparent, rgba(17, 17, 17,0.2), transparent)',
                      }} />
                    )}
                    <motion.div
                      whileHover={{ scale: 1.15, boxShadow: '0 0 20px -4px rgba(17, 17, 17,0.5)' }}
                      style={{
                        width: 30, height: 30, borderRadius: '50%', marginBottom: 8,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        background: 'rgba(17, 17, 17,0.08)', border: '1px solid rgba(17, 17, 17,0.28)',
                        boxShadow: '0 0 14px -4px rgba(17, 17, 17,0.3)',
                      }}
                    >
                      <Icon size={16} style={{ color: 'var(--champagne)' }} />
                    </motion.div>
                    <div style={{
                      fontSize: 11.5, fontWeight: 800, letterSpacing: '0.02em', color: '#111111', marginBottom: 4,
                      whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100%',
                    }}>
                      {title}
                    </div>
                    <div style={{
                      fontSize: 10, color: 'var(--text-muted)', letterSpacing: '0.01em',
                      whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100%',
                    }}>
                      {desc}
                    </div>
                  </motion.div>
                ))}
              </div>

              <motion.button
                onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(''); setRegisterStep(1); }}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                style={{
                  marginTop: 18, padding: '10px 24px', borderRadius: 999,
                  border: '1px solid rgba(17, 17, 17,0.3)',
                  background: 'rgba(17, 17, 17,0.08)',
                  color: 'var(--champagne)', fontSize: 12.5, fontWeight: 700,
                  cursor: 'pointer', transition: 'all 0.2s ease',
                }}
              >
                {mode === 'login' ? '¿No tienes cuenta? Crear cuenta' : '¿Ya tienes cuenta? Iniciar sesión'}
              </motion.button>
            </motion.div>
          )}

          {/* ── Mobile compact branding (only on small screens) ── */}
          {isSmall && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              style={{ 
                textAlign: 'center', paddingBottom: isPortraitTablet ? 64 : 24, width: '100%',
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center'
              }}
            >
              <img src={logo} alt="Dientes Sanos" style={{ height: isPortraitTablet ? 60 : 42, objectFit: 'contain', filter: 'brightness(1.15)', margin: isPortraitTablet ? '0 auto 32px' : '0 auto 22px', display: 'block' }} />
              <motion.h1
                animate={{ y: [0, -4, 0], scale: [1, 1.02, 1] }}
                transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut' }}
                style={{ fontSize: isPortraitTablet ? '2.6rem' : '1.8rem', fontWeight: 900, lineHeight: 1.1, letterSpacing: '-0.02em' }}
              >
                {mode === 'login' ? <>¡Qué bueno <span className="text-gold">verte!</span></> : <>Únete a la<br /><span className="text-gold">familia Dientes Sanos.</span></>}
              </motion.h1>
            </motion.div>
          )}

          {/* ── Center: form card ── */}
          <motion.div
            key={mode === 'register' ? `register-${registerStep}` : mode}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            style={{ 
              width: '100%', maxWidth: isBigTablet ? 660 : (isSmall ? 440 : (isXL ? (mode === 'login' ? 500 : 470) : (mode === 'login' ? 440 : 420))),
              marginLeft: isSmall ? 0 : (mode === 'login' ? (isXL ? 84 : 60) : 0)
            }}
          >
            <div className="glass-card" style={{
              padding: isBigTablet ? '40px 40px 36px' : (isSmall ? '24px 20px 22px' : (isXL ? (mode === 'login' ? '36px 42px 32px' : '28px 34px 26px') : (mode === 'login' ? '24px 28px 20px' : '18px 20px 16px'))),
              borderRadius: isSmall ? (isBigTablet ? 24 : 16) : (isXL ? 28 : 20),
              background: 'var(--bg-secondary)',
              border: '1px solid rgba(17, 17, 17,0.15)',
              boxShadow: '0 32px 80px -20px rgba(0,0,0,0.10), 0 0 40px -15px rgba(17, 17, 17,0.08)',
            }}>
              {!isSmall && (
                <>
                  <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 6 }}>
                    <div style={{
                      width: 34, height: 34, borderRadius: '50%',
                      border: '1.5px solid rgba(17, 17, 17,0.3)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <User size={16} style={{ color: 'var(--champagne)' }} />
                    </div>
                  </div>

                  <motion.h2
                    animate={{ y: [0, -3, 0] }}
                    transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                    style={{ fontSize: isXL ? 20 : 17, fontWeight: 800, color: '#111111', textAlign: 'center', marginBottom: 2 }}
                  >
                    {mode === 'login' ? 'Iniciar sesión' : 'Crear cuenta'}
                  </motion.h2>
                  <p style={{ fontSize: isXL ? 13 : 11, color: 'var(--text-secondary)', textAlign: 'center', marginBottom: 16, lineHeight: 1.4 }}>
                    {mode === 'login'
                      ? <>Accede a tu cuenta y continúa disfrutando de <span style={{ color: 'var(--champagne)', fontWeight: 600 }}>Club Sonrisa.</span></>
                      : <>Regístrate para reservar, ganar puntos y disfrutar de <span style={{ color: 'var(--champagne)', fontWeight: 600 }}>Club Sonrisa.</span></>
                    }
                  </p>
                </>
              )}

              {isSmall && (
                <motion.h2
                  animate={{ y: [0, -3, 0] }}
                  transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                  style={{ fontSize: isBigTablet ? 26 : 17, fontWeight: 800, color: '#111111', textAlign: 'center', marginBottom: isBigTablet ? 24 : 16 }}
                >
                  {mode === 'login' ? 'Iniciar sesión' : 'Crear cuenta'}
                </motion.h2>
              )}

              {mode === 'login' ? (
                <form onSubmit={handleLoginSubmit}>
                  {error && (
                    <motion.div
                      initial={{ opacity: 0, y: -8 }}
                      animate={{ opacity: 1, y: 0 }}
                      style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: 12, padding: '12px 16px', marginBottom: 14, color: '#ef4444', fontSize: 13 }}
                    >
                      {error}
                    </motion.div>
                  )}

                  <div style={{ marginBottom: isSmall ? 18 : 16 }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: isBigTablet ? 15 : (isSmall ? 12 : 11), fontWeight: 500, color: '#0f172a', marginBottom: isBigTablet ? 10 : (isSmall ? 8 : 6) }}>
                      <User size={12} style={{ color: 'var(--champagne)' }} />
                      Teléfono o correo electrónico
                    </label>
                    <input
                      type="text"
                      value={loginForm.identifier}
                      onChange={(e) => setLoginForm({ ...loginForm, identifier: e.target.value })}
                      className="input-field auth-input"
                      placeholder="Ej: correo@ejemplo.com"
                      autoComplete="new-password"
                      required
                      style={{ width: '100%', boxSizing: 'border-box', height: inputH, fontSize: isBigTablet ? 18 : (isSmall ? 16 : undefined) }}
                    />
                  </div>

                  <div style={{ marginBottom: isSmall ? 18 : 16 }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: isBigTablet ? 15 : (isSmall ? 12 : 11), fontWeight: 500, color: '#0f172a', marginBottom: isBigTablet ? 10 : (isSmall ? 8 : 6) }}>
                      <Lock size={12} style={{ color: 'var(--champagne)' }} />
                      Contraseña
                    </label>
                    <div style={{ position: 'relative' }}>
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={loginForm.password}
                        onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                        className="input-field auth-input"
                        placeholder="••••••••"
                        autoComplete="new-password"
                        required
                        style={{ width: '100%', boxSizing: 'border-box', paddingRight: 44, height: inputH, fontSize: isBigTablet ? 18 : (isSmall ? 16 : undefined) }}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 0 }}
                      >
                        {showPassword ? <EyeOff size={isBigTablet ? 20 : 16} /> : <Eye size={isBigTablet ? 20 : 16} />}
                      </button>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: isSmall ? 20 : 18 }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: isSmall ? 13 : 12, color: 'var(--text-secondary)', cursor: 'pointer', userSelect: 'none' }}>
                      <div
                        onClick={() => {
                          const next = !rememberMe;
                          setRememberMe(next);
                          if (!next) localStorage.removeItem('panda_remember_me');
                        }}
                        style={{
                          width: 18, height: 18, borderRadius: 4, cursor: 'pointer',
                          border: rememberMe ? 'none' : '1.5px solid rgba(217, 192, 143,0.25)',
                          background: rememberMe ? 'var(--gold-gradient)' : 'transparent',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          transition: 'background 0.2s ease',
                        }}
                      >
                        {rememberMe && (
                          <svg width="11" height="9" viewBox="0 0 11 9" fill="none">
                            <path d="M1 4.5L4 7.5L10 1" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        )}
                      </div>
                      Recordarme
                    </label>
                    <Link to="/olvidar-contraseña" style={{ fontSize: isSmall ? 13 : 12, color: 'var(--champagne)', textDecoration: 'none', fontWeight: 600 }}>
                      ¿Olvidaste tu contraseña?
                    </Link>
                  </div>

                  <motion.button
                    type="submit"
                    disabled={loading}
                    whileHover={{ scale: 1.02, boxShadow: '0 8px 30px rgba(17, 17, 17,0.35)' }}
                    whileTap={{ scale: 0.98 }}
                    className="btn-gold"
                    style={{
                      width: '100%', padding: isBigTablet ? '18px' : (isSmall ? '14px' : (isXL ? '15px' : '12px')), fontSize: isBigTablet ? 17 : (isSmall ? 14 : (isXL ? 14 : 13)), fontWeight: 700,
                      borderRadius: 'var(--radius-pill)',
                      opacity: loading ? 0.6 : 1,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                      cursor: loading ? 'not-allowed' : 'pointer',
                      minHeight: isBigTablet ? 58 : (isSmall ? 48 : undefined),
                    }}
                  >
                    {loading ? (
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                        style={{ display: 'flex', alignItems: 'center' }}
                      >
                        <Loader2 size={18} />
                      </motion.div>
                    ) : (
                      <>Iniciar sesión <ArrowRight size={17} /></>
                    )}
                  </motion.button>
                </form>
              ) : (
                <form onSubmit={handleRegisterSubmit}>
                  {error && (
                    <motion.div
                      initial={{ opacity: 0, y: -8 }}
                      animate={{ opacity: 1, y: 0 }}
                      style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: 12, padding: '12px 16px', marginBottom: 14, color: '#ef4444', fontSize: 13 }}
                    >
                      {error}
                    </motion.div>
                  )}

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: isSmall ? 14 : 16 }}>
                    <div style={{
                      width: isBigTablet ? 36 : 28, height: isBigTablet ? 36 : 28, borderRadius: '50%',
                      background: registerStep >= 1 ? 'var(--gold-gradient)' : 'rgba(217, 192, 143,0.15)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: isBigTablet ? 15 : 12, fontWeight: 700, color: registerStep >= 1 ? '#ffffff' : '#64748b',
                      transition: 'all 0.3s ease',
                    }}>
                      {registerStep > 1 ? <Check size={14} /> : '1'}
                    </div>
                    <div style={{ width: 28, height: 2, borderRadius: 1, background: registerStep >= 2 ? 'var(--champagne)' : 'rgba(217, 192, 143,0.15)', transition: 'background 0.3s ease' }} />
                    <div style={{
                      width: isBigTablet ? 36 : 28, height: isBigTablet ? 36 : 28, borderRadius: '50%',
                      background: registerStep >= 2 ? 'var(--gold-gradient)' : 'rgba(217, 192, 143,0.15)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: isBigTablet ? 15 : 12, fontWeight: 700, color: registerStep >= 2 ? '#ffffff' : '#64748b',
                      transition: 'all 0.3s ease',
                    }}>
                      {'2'}
                    </div>
                  </div>

                  <AnimatePresence mode="wait">
                    {registerStep === 1 && (
                      <motion.div
                        key="step1"
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                        transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                      >
                        <div style={{ display: 'flex', flexDirection: 'column', gap: isSmall ? 10 : 8 }}>
                          <div style={{ display: 'flex', gap: isSmall ? 10 : 12, flexWrap: 'wrap' }}>
                            <div style={{ flex: '1 1 200px' }}>
                              <label style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: isBigTablet ? 15 : (isSmall ? 12 : 11), fontWeight: 500, color: '#0f172a', marginBottom: isBigTablet ? 8 : (isSmall ? 5 : 4) }}>
                                <User size={12} style={{ color: 'var(--champagne)' }} />
                                Nombre y apellido
                              </label>
                              <input
                                type="text"
                                value={registerForm.name}
                                onChange={(e) => setRegisterForm({ ...registerForm, name: e.target.value })}
                                className="input-field auth-input"
                                placeholder="Juan Pérez"
                                required
                                style={{ width: '100%', boxSizing: 'border-box', padding: isBigTablet ? '16px 18px 16px 46px' : (isSmall ? '10px 12px 10px 38px' : '7px 12px 7px 38px'), height: inputH, fontSize: isBigTablet ? 18 : (isSmall ? 16 : undefined) }}
                              />
                            </div>

                            <div style={{ flex: '1 1 180px' }}>
                              <label style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: isBigTablet ? 15 : (isSmall ? 12 : 11), fontWeight: 500, color: '#0f172a', marginBottom: isBigTablet ? 8 : (isSmall ? 5 : 4) }}>
                                <Calendar size={12} style={{ color: 'var(--champagne)' }} />
                                Fecha de nacimiento
                              </label>
                              <input
                                type="text"
                                value={registerForm.birth_date}
                                onChange={handleBirthDateChange}
                                className="input-field auth-input"
                                placeholder="dd/mm/aaaa"
                                required
                                maxLength={10}
                                style={{ width: '100%', boxSizing: 'border-box', padding: isBigTablet ? '16px 18px 16px 46px' : (isSmall ? '10px 12px 10px 38px' : '7px 12px 7px 38px'), height: inputH, fontSize: isBigTablet ? 18 : (isSmall ? 16 : undefined) }}
                              />
                            </div>
                          </div>

                          <div style={{ display: 'flex', gap: isSmall ? 10 : 12, flexWrap: 'wrap' }}>
                            <div style={{ flex: '1 1 180px' }}>
                              <label style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: isBigTablet ? 15 : (isSmall ? 12 : 11), fontWeight: 500, color: '#0f172a', marginBottom: isBigTablet ? 8 : (isSmall ? 5 : 4) }}>
                                <Phone size={12} style={{ color: 'var(--champagne)' }} />
                                Teléfono
                              </label>
                              <input
                                type="tel"
                                value={registerForm.phone}
                                onChange={(e) => setRegisterForm({ ...registerForm, phone: e.target.value })}
                                className="input-field auth-input"
                                placeholder="+58 412-1234567"
                                required
                                style={{ width: '100%', boxSizing: 'border-box', padding: isBigTablet ? '16px 18px 16px 46px' : (isSmall ? '10px 12px 10px 38px' : '7px 12px 7px 38px'), height: inputH, fontSize: isBigTablet ? 18 : (isSmall ? 16 : undefined) }}
                              />
                            </div>

                            <div style={{ flex: '1 1 180px' }}>
                              <label style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: isBigTablet ? 15 : (isSmall ? 12 : 11), fontWeight: 500, color: '#0f172a', marginBottom: isBigTablet ? 8 : (isSmall ? 5 : 4) }}>
                                <CreditCard size={12} style={{ color: 'var(--champagne)' }} />
                                Cédula
                              </label>
                              <input
                                type="text"
                                value={registerForm.id_card}
                                onChange={(e) => setRegisterForm({ ...registerForm, id_card: e.target.value })}
                                className="input-field auth-input"
                                placeholder="V-12345678"
                                required
                                style={{ width: '100%', boxSizing: 'border-box', padding: isBigTablet ? '16px 18px 16px 46px' : (isSmall ? '10px 12px 10px 38px' : '7px 12px 7px 38px'), height: inputH, fontSize: isBigTablet ? 18 : (isSmall ? 16 : undefined) }}
                              />
                            </div>
                          </div>

                          <div>
                            <label style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: isBigTablet ? 15 : (isSmall ? 12 : 11), fontWeight: 500, color: '#0f172a', marginBottom: isBigTablet ? 8 : (isSmall ? 5 : 4) }}>
                              <Mail size={12} style={{ color: 'var(--champagne)' }} />
                              Email
                            </label>
                            <input
                              type="email"
                              value={registerForm.email}
                              onChange={(e) => setRegisterForm({ ...registerForm, email: e.target.value })}
                              className="input-field auth-input"
                              placeholder="correo@ejemplo.com"
                              autoComplete="off"
                              required
                              style={{ width: '100%', boxSizing: 'border-box', padding: isBigTablet ? '16px 18px 16px 46px' : (isSmall ? '10px 12px 10px 38px' : '7px 12px 7px 38px'), height: inputH, fontSize: isBigTablet ? 18 : (isSmall ? 16 : undefined) }}
                            />
                          </div>
                        </div>

                        <motion.button
                          type="button"
                          disabled={!isStep1Valid}
                          onClick={() => setRegisterStep(2)}
                          whileHover={isStep1Valid ? { scale: 1.02, boxShadow: '0 8px 30px rgba(17, 17, 17,0.35)' } : {}}
                          whileTap={isStep1Valid ? { scale: 0.98 } : {}}
                          className="btn-gold"
                          style={{
                            width: '100%', padding: isBigTablet ? '18px' : (isSmall ? '14px' : '12px'), fontSize: isBigTablet ? 17 : (isSmall ? 14 : 13), fontWeight: 700,
                            borderRadius: 'var(--radius-pill)',
                            opacity: isStep1Valid ? 1 : 0.4,
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                            cursor: isStep1Valid ? 'pointer' : 'not-allowed',
                            marginTop: isSmall ? 12 : 10,
                            minHeight: isBigTablet ? 58 : (isSmall ? 48 : undefined),
                          }}
                        >
                          Continuar <ArrowRight size={17} />
                        </motion.button>
                      </motion.div>
                    )}
                    {registerStep === 2 && (
                      <motion.div
                        key="step2"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                      >
                        <div style={{ marginBottom: isSmall ? 14 : 16 }}>
                          <label style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: isBigTablet ? 15 : (isSmall ? 12 : 11), fontWeight: 500, color: '#0f172a', marginBottom: isBigTablet ? 8 : (isSmall ? 5 : 4) }}>
                            <Lock size={12} style={{ color: 'var(--champagne)' }} />
                            Contraseña
                          </label>
                          <div style={{ position: 'relative' }}>
                            <input
                              type={showPassword ? 'text' : 'password'}
                              value={registerForm.password}
                              onChange={(e) => setRegisterForm({ ...registerForm, password: e.target.value })}
                              className="input-field auth-input"
                              placeholder="••••••••"
                              autoComplete="new-password"
                              required
                              minLength={6}
                              style={{ width: '100%', boxSizing: 'border-box', paddingRight: 44, height: inputH, fontSize: isBigTablet ? 18 : (isSmall ? 16 : undefined) }}
                            />
                            <button
                              type="button"
                              onClick={() => setShowPassword(!showPassword)}
                              style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 0 }}
                            >
                              {showPassword ? <EyeOff size={isBigTablet ? 20 : 16} /> : <Eye size={isBigTablet ? 20 : 16} />}
                            </button>
                          </div>
                        </div>

                        <div style={{ display: 'flex', gap: 10 }}>
                          <motion.button
                            type="button"
                            onClick={() => setRegisterStep(1)}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            style={{
                              padding: isBigTablet ? '18px' : (isSmall ? '14px' : '12px'), fontSize: isBigTablet ? 17 : (isSmall ? 14 : 13), fontWeight: 600,
                              borderRadius: 'var(--radius-pill)',
                              border: '1px solid rgba(217, 192, 143,0.25)',
                              background: '#ffffff',
                              color: '#0f172a',
                              cursor: 'pointer',
                              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                              minHeight: isBigTablet ? 58 : (isSmall ? 48 : undefined),
                              flex: '0 0 auto',
                            }}
                          >
                            <ArrowLeft size={16} /> Atrás
                          </motion.button>

                            <motion.button
                              type="submit"
                              disabled={loading || !registerForm.password || registerForm.password.length < 6}
                              whileHover={registerForm.password.length >= 6 ? { scale: 1.02, boxShadow: '0 8px 30px rgba(17, 17, 17,0.35)' } : {}}
                              whileTap={registerForm.password.length >= 6 ? { scale: 0.98 } : {}}
                              className="btn-gold"
                              style={{
                                flex: 1, padding: isBigTablet ? '18px' : (isSmall ? '14px' : '12px'), fontSize: isBigTablet ? 17 : (isSmall ? 14 : 13), fontWeight: 700,
                                borderRadius: 'var(--radius-pill)',
                                opacity: loading || !registerForm.password || registerForm.password.length < 6 ? 0.6 : 1,
                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                                cursor: loading || !registerForm.password || registerForm.password.length < 6 ? 'not-allowed' : 'pointer',
                                minHeight: isBigTablet ? 58 : (isSmall ? 48 : undefined),
                              }}
                            >
                              {loading ? (
                                <Loader2 className="animate-spin" size={20} />
                              ) : (
                                <>Crear cuenta <ArrowRight size={17} /></>
                              )}
                            </motion.button>
                        </div>
                      </motion.div>
                    )}

                  </AnimatePresence>
                </form>
              )}


              <div style={{ display: 'flex', alignItems: 'center', gap: 14, margin: isSmall ? '20px 0' : '14px 0' }}>
                <div style={{ flex: 1, height: 1, background: 'rgba(217, 192, 143,0.15)' }} />
                <span style={{ color: '#64748b', fontSize: isSmall ? 12 : 11, fontWeight: 500 }}>
                  {mode === 'login' ? 'o continúa con' : 'o completa el formulario'}
                </span>
                <div style={{ flex: 1, height: 1, background: 'rgba(217, 192, 143,0.15)' }} />
              </div>

              <motion.button
                onClick={handleGoogleLogin}
                disabled={isGoogleLoading}
                whileHover={!isGoogleLoading ? { scale: 1.02, background: 'rgba(17, 17, 17,0.06)' } : {}}
                whileTap={!isGoogleLoading ? { scale: 0.98 } : {}}
                style={{
                  width: '100%', padding: isBigTablet ? '16px' : (isSmall ? '12px' : '10px'), borderRadius: isSmall ? 14 : 14,
                  border: '1px solid rgba(217, 192, 143,0.25)',
                  background: '#ffffff',
                  color: '#0f172a', fontSize: isBigTablet ? 15 : (isSmall ? 13 : 12), fontWeight: 600,
                  cursor: isGoogleLoading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                  transition: 'background 0.2s',
                  minHeight: isBigTablet ? 58 : (isSmall ? 48 : undefined),
                  opacity: isGoogleLoading ? 0.6 : 1,
                }}
              >
                {isGoogleLoading ? (
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                    style={{ display: 'flex', alignItems: 'center' }}
                  >
                    <Loader2 size={18} />
                  </motion.div>
                ) : (
                  <>
                    <svg width="18" height="18" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                    </svg>
                    Continuar con Google
                  </>
                )}
              </motion.button>

              {/* Desktop/tablet already gets this exact toggle as a pill button in the
                  left panel above (the `{!isSmall && (...)}` block containing the
                  "¿Ya tienes cuenta? Iniciar sesión" button) — rendering it again here
                  unconditionally meant desktop showed the same action twice while
                  phones (where the left panel is hidden) only ever saw this one. */}
              {isSmall && (
                <div style={{ display: 'flex', justifyContent: 'center', marginTop: isBigTablet ? 16 : 12 }}>
                  <button
                    onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(''); setRegisterStep(1); }}
                    className="transition-all duration-200 cursor-pointer rounded-full border border-[rgba(17, 17, 17,0.3)] bg-[rgba(17, 17, 17,0.08)] hover:bg-[rgba(17, 17, 17,0.18)] hover:border-[rgba(17, 17, 17,0.55)] active:bg-[rgba(17, 17, 17,0.22)]"
                    style={{ padding: isBigTablet ? '12px 22px' : '10px 18px', fontSize: isBigTablet ? 15 : 13 }}
                  >
                    <span style={{ color: '#0f172a', fontWeight: 500 }}>
                      {mode === 'login' ? '¿No tienes cuenta?' : '¿Ya tienes cuenta?'}{' '}
                    </span>
                    <span style={{ color: 'var(--champagne)', fontWeight: 700 }}>
                      {mode === 'login' ? 'Crear cuenta' : 'Iniciar sesión'}
                    </span>
                  </button>
                </div>
              )}

            </div>
          </motion.div>

          {/* ── Right: membership card (register mode only, hidden on small) ── */}
          {mode === 'register' && !isSmall && (
            <motion.div
              initial={{ opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 24 }}
              transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              style={{ flex: isXL ? '0 1 400px' : '0 1 340px', textAlign: 'center' }}
            >
              <motion.p
                animate={{ y: [0, -3, 0] }}
                transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                style={{ fontSize: isXL ? 12 : 11, fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--champagne)', textAlign: 'center', marginBottom: 8 }}
              >
                TU CLUB SONRISA
              </motion.p>
              <motion.h2
                animate={{ y: [0, -3, 0] }}
                transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut', delay: 0.15 }}
                style={{ fontSize: isXL ? 23 : 20, fontWeight: 800, color: '#111111', textAlign: 'center', marginBottom: 24 }}
              >
                Tu membresía empieza <span className="text-gold">hoy.</span>
              </motion.h2>

              <div style={{ perspective: 1200 }}>
                <motion.div
                  onMouseMove={handleCardMouseMove}
                  onMouseLeave={handleCardMouseLeave}
                  style={{
                    position: 'relative', aspectRatio: '1.6 / 1', borderRadius: 20, overflow: 'hidden',
                    transformStyle: 'preserve-3d',
                    rotateX: springTiltX, rotateY: springTiltY,
                    background: 'var(--bg-secondary)',
                    border: '1px solid rgba(17, 17, 17,0.3)',
                    boxShadow: '0 24px 64px -14px rgba(0,0,0,0.10), 0 0 30px -10px rgba(17, 17, 17,0.15)',
                  }}
                >
                  <motion.div style={{ position: 'absolute', inset: 0, background: cardGlowBackground, pointerEvents: 'none' }} />
                  <div style={{
                    position: 'absolute', inset: '-50%',
                    background: 'linear-gradient(115deg, transparent 47%, rgba(15,23,42,0.05) 50%, transparent 53%)',
                    pointerEvents: 'none',
                  }} />

                  <div style={{ position: 'relative', zIndex: 1, height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '20px 22px', transform: 'translateZ(30px)' }}>
                    <div style={{ textAlign: 'left' }}>
                      <div style={{ fontSize: 13, fontWeight: 900, letterSpacing: '0.06em', color: '#111111' }}>DIENTES SANOS</div>
                      <div style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: '0.2em', color: 'var(--champagne)' }}>MIEMBRO CLUB</div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{
                        width: 46, height: 46, borderRadius: '50%', flexShrink: 0,
                        background: 'rgba(17, 17, 17,0.10)', border: '1.5px solid rgba(217, 192, 143,0.30)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 16, fontWeight: 800, color: '#111111',
                      }}>
                        {initials}
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <div style={{
                          fontSize: 15, fontWeight: 800, color: registerForm.name.trim() ? '#0f172a' : '#64748b',
                          lineHeight: 1.2,
                          transition: 'color 0.3s ease',
                        }}>
                          {displayName.toUpperCase()}
                        </div>
                        <div style={{ fontSize: 10.5, color: '#64748b', fontWeight: 600 }}>Miembro desde {memberSince}</div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{
                        fontSize: 9.5, fontWeight: 800, letterSpacing: '0.12em', color: 'var(--champagne)',
                        background: 'rgba(17, 17, 17,0.1)', border: '1px solid rgba(17, 17, 17,0.25)',
                        borderRadius: 999, padding: '3px 9px',
                      }}>
                        {rank.toUpperCase()}
                      </span>
                      <span style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
                        <span style={{ fontSize: 24, fontWeight: 900, color: '#111111' }}>0</span>
                        <span style={{ fontSize: 10, fontWeight: 700, color: '#64748b' }}>PTS</span>
                      </span>
                    </div>
                  </div>
                </motion.div>
              </div>
            </motion.div>
          )}

        </div>
        

      </div>

      {/* Welcome Modal */}
      <AnimatePresence>
        {showWelcome && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            style={{
              position: 'fixed', inset: 0, zIndex: 100,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'var(--bg-secondary)', backdropFilter: 'blur(8px)',
              padding: 20,
            }}
            onClick={handleWelcomeClose}
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: -10 }}
              transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              onClick={(e) => e.stopPropagation()}
              style={{
                background: 'var(--bg-secondary)',
                border: '1px solid rgba(17, 17, 17,0.3)',
                borderRadius: 24, padding: '36px 32px 32px', maxWidth: 480, width: '100%',
                textAlign: 'center',
                boxShadow: '0 32px 80px -20px rgba(0,0,0,0.10), 0 0 60px -15px rgba(17, 17, 17,0.1)',
              }}
            >
              {/* Check icon with gold ring */}
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: 'spring', stiffness: 200, damping: 15 }}
                style={{
                  width: 80, height: 80, borderRadius: '50%', margin: '0 auto 24px',
                  background: 'transparent',
                  border: '3px solid var(--champagne)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: '0 0 30px -5px rgba(17, 17, 17,0.3)',
                }}
              >
                <Check size={36} style={{ color: 'var(--champagne)' }} strokeWidth={3} />
              </motion.div>

              <motion.h2
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                style={{ fontSize: 28, fontWeight: 900, color: '#111111', marginBottom: 6, fontFamily: 'General Sans' }}
              >
                {welcomeData?.isReturning
                  ? <>¡Bienvenido{welcomeData?.name ? ` de vuelta, ${welcomeData.name}` : ''}!</>
                  : <>¡Bienvenido{welcomeData?.name ? `, ${welcomeData.name}` : ''}!</>
                }
              </motion.h2>

              <motion.p
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.35 }}
                style={{ fontSize: 15, color: '#0f172a', marginBottom: 20, fontFamily: 'General Sans' }}
              >
                {welcomeData?.isReturning
                  ? <>Nos alegra verte de nuevo en <span style={{ color: 'var(--champagne)', fontWeight: 700 }}>Club Sonrisa.</span></>
                  : <>Es un honor tenerte en la familia <span style={{ color: 'var(--champagne)', fontWeight: 700 }}>Club Sonrisa.</span></>
                }
              </motion.p>

              {/* Divider with scissors */}
              <motion.div
                initial={{ opacity: 0, scaleX: 0 }}
                animate={{ opacity: 1, scaleX: 1 }}
                transition={{ delay: 0.4 }}
                style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}
              >
                <div style={{ flex: 1, height: 1, background: 'linear-gradient(90deg, transparent, rgba(17, 17, 17,0.3))' }} />
                <Scissors size={14} style={{ color: 'var(--champagne)' }} />
                <div style={{ flex: 1, height: 1, background: 'linear-gradient(90deg, rgba(17, 17, 17,0.3), transparent)' }} />
              </motion.div>

              <motion.p
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.45 }}
                style={{ fontSize: 14, color: '#64748b', lineHeight: 1.6, marginBottom: 24, fontFamily: 'General Sans' }}
              >
                {welcomeData?.isReturning
                  ? <>¿Qué te gustaría hacer hoy?</>
                  : <>Ya puedes reservar citas, acumular puntos<br />y disfrutar de <span style={{ color: 'var(--champagne)', fontWeight: 600 }}>beneficios exclusivos.</span></>
                }
              </motion.p>

              {/* Benefits row (only for new users) */}
              {!welcomeData?.isReturning && (
                <motion.div
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                  style={{
                    display: 'flex', gap: 0, marginBottom: 28,
                    background: 'rgba(17, 17, 17,0.06)',
                    border: '1px solid rgba(217, 192, 143,0.25)',
                    borderRadius: 16, overflow: 'hidden',
                  }}
                >
                  {[
                    { icon: Star, title: 'Acumula puntos', desc: 'en cada visita' },
                    { icon: Gift, title: 'Gana premios', desc: 'exclusivos' },
                    { icon: Scissors, title: 'Disfruta servicios', desc: 'preferenciales' },
                  ].map(({ icon: Icon, title, desc }, idx) => (
                    <div key={title} style={{
                      flex: 1, padding: '14px 8px', textAlign: 'center',
                      position: 'relative',
                    }}>
                      {idx > 0 && (
                        <div style={{
                          position: 'absolute', left: 0, top: '20%', bottom: '20%', width: 1,
                          background: 'linear-gradient(180deg, transparent, rgba(17, 17, 17,0.2), transparent)',
                        }} />
                      )}
                      <div style={{
                        width: 36, height: 36, borderRadius: '50%', margin: '0 auto 8px',
                        background: 'rgba(17, 17, 17,0.08)',
                        border: '1px solid rgba(17, 17, 17,0.25)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        <Icon size={16} style={{ color: 'var(--champagne)' }} />
                      </div>
                      <div style={{ fontSize: 11, fontWeight: 700, color: '#0f172a', marginBottom: 2, lineHeight: 1.3 }}>
                        {title}
                      </div>
                      <div style={{ fontSize: 10, color: '#64748b', lineHeight: 1.3 }}>
                        {desc}
                      </div>
                    </div>
                  ))}
                </motion.div>
              )}

              {/* Main button */}
              <motion.button
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.55 }}
                whileHover={{ scale: 1.02, boxShadow: '0 8px 30px rgba(17, 17, 17,0.35)' }}
                whileTap={{ scale: 0.98 }}
                onClick={handleWelcomeClose}
                className="btn-gold"
                style={{
                  width: '100%', padding: '16px 28px', fontSize: 15, fontWeight: 700,
                  borderRadius: 999,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                  minHeight: 52,
                }}
              >
                <User size={18} /> {welcomeData?.isReturning ? 'Ver mi perfil' : 'Explorar mi perfil'} <ArrowRight size={18} />
              </motion.button>

              {/* Secondary link */}
              <motion.button
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6 }}
                onClick={handleWelcomeBooking}
                style={{
                  marginTop: 14, padding: '10px 20px',
                  background: 'none', border: 'none',
                  color: '#64748b', fontSize: 13, fontWeight: 600,
                  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                  fontFamily: 'General Sans',
                }}
              >
                <Calendar size={14} /> Agendar una cita ahora
              </motion.button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
    </>
  );
}
