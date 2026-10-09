import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Phone, CreditCard, Calendar, Check, Loader, Shield, Gift, Coins, Scissors, ArrowRight, Info, UserRound, Mail } from 'lucide-react';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';
import { publicService } from '../services/publicService';
import { clearGoogleAuthIntent, shouldReturnToBookingAfterGoogle } from '../utils/googleAuthIntent';
import logo from '../../assets/logo_full.png';

// "yyyy-mm-dd" (what the DB and <input type="date"> use) <-> "dd/mm/aaaa" (what the user types).
const isoToDisplay = (iso) => {
  if (!iso) return '';
  const [y, m, d] = iso.split('-');
  if (!y || !m || !d) return '';
  return `${d}/${m}/${y}`;
};

// Formats digits-as-typed into "dd/mm/aaaa", inserting the slashes automatically instead of
// requiring the user to type them. Returns both the display string and, once all 8 digits
// are in, the ISO value to actually store — birth_date stays empty (it's optional) until the
// date is complete.
const formatBirthDateInput = (rawValue) => {
  const digits = rawValue.replace(/\D/g, '').slice(0, 8);
  let display = digits;
  if (digits.length > 4) display = `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
  else if (digits.length > 2) display = `${digits.slice(0, 2)}/${digits.slice(2)}`;

  let iso = '';
  if (digits.length === 8) {
    const day = digits.slice(0, 2);
    const month = digits.slice(2, 4);
    const year = digits.slice(4, 8);
    iso = `${year}-${month}-${day}`;
  }
  return { display, iso };
};

const BENEFITS = [
  { icon: Coins, title: 'Puntos', desc: 'En cada visita' },
  { icon: Gift, title: 'Premios', desc: 'Canjea al instante' },
  { icon: Scissors, title: 'Tu estilo', desc: 'Historial guardado' },
];

// Rank thresholds match the points catalog already used in Profile.jsx (100/200/300 unlock
// the free wash/beard/haircut prizes) — Básico/Bronce/Plata/Oro is the unified ladder used
// across the whole app and reuses numbers the rest of the app already treats as meaningful
// instead of inventing new ones just for this card.
const RANKS = [
  { min: 300, label: 'Oro' },
  { min: 200, label: 'Plata' },
  { min: 100, label: 'Bronce' },
  { min: 0, label: 'Básico' },
];
const getRank = (points) => RANKS.find(r => points >= r.min)?.label || 'Básico';

export default function CompleteRegistration() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [googleUser, setGoogleUser] = useState(null);
  const [switchingAccount, setSwitchingAccount] = useState(false);
  const [birthDateDisplay, setBirthDateDisplay] = useState('');

  // Real points from an existing (partial) client record, if any — someone can land here
  // with points already earned if they're missing only phone/id_card. Defaults to 0 for a
  // brand-new signup.
  const [clientPoints, setClientPoints] = useState(0);
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    id_card: '',
    birth_date: '',
  });

  useEffect(() => {
    const checkSession = async () => {
      try {
        const session = await publicService.getSession();
        if (!session?.user) {
          navigate('/login');
          return;
        }

        const user = session.user;
        setGoogleUser(user);

        // Check if client already completed registration with both phone AND id_card
        let existingClient = await publicService.getClientByUserId(user.id);
        if (!existingClient && user.email) {
          existingClient = await publicService.getClientByEmail(user.email);
        }

        if (existingClient && existingClient.phone && existingClient.id_card) {
          // Already fully registered, save session and redirect
          localStorage.setItem('panda_public_client', JSON.stringify(existingClient));
          localStorage.removeItem('panda_google_login_pending');
          if (shouldReturnToBookingAfterGoogle()) {
            clearGoogleAuthIntent();
            localStorage.removeItem('panda_login_return_to_booking');
            navigate('/agendar', { replace: true });
          } else {
            clearGoogleAuthIntent();
            localStorage.removeItem('panda_login_return_to_booking');
            navigate('/perfil', { replace: true });
          }
          return;
        }

        // Pre-fill form with Google data or existing partial client data
        const metadata = user.user_metadata || {};
        const googleBirthDate = metadata.birth_date || metadata.birthdate || metadata.birthday || '';

        const initialBirthDate = existingClient?.birth_date || googleBirthDate || '';
        setForm({
          name: existingClient?.name || metadata.full_name || metadata.name || '',
          email: existingClient?.email || user.email || '',
          phone: existingClient?.phone || '',
          id_card: existingClient?.id_card || '',
          birth_date: initialBirthDate,
        });
        setBirthDateDisplay(isoToDisplay(initialBirthDate));
        setClientPoints(existingClient?.points || 0);
      } catch (e) {
        console.error('Session check error:', e);
      } finally {
        setLoading(false);
      }
    };
    checkSession();
  }, [navigate]);

  // Signs out of the current Google session, then immediately re-triggers Google login
  // with the account picker forced — without forcing the picker, signInWithGoogle would
  // silently reuse whatever Google account the browser still remembers, defeating the
  // point of "switch account". The redirect back lands on '/', so this leaves the page.
  const handleSwitchAccount = async () => {
    setSwitchingAccount(true);
    try {
      await publicService.signOut();
      localStorage.removeItem('panda_public_client');
      localStorage.removeItem('panda_public_session');
      await publicService.signInWithGoogle({ forceAccountPicker: true });
    } catch (e) {
      console.error('Switch account error:', e);
      setSwitchingAccount(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Native `required` validation already stops the browser from submitting, but its
    // popup is easy to miss (it can render off-screen or just not draw attention), which
    // reads as "I click and nothing happens". This makes the same check produce a visible,
    // in-page error instead of relying solely on that native tooltip.
    if (!form.name.trim()) {
      setError('El nombre y apellido son obligatorios');
      document.getElementById('reg-name')?.focus();
      return;
    }
    if (!form.phone.trim()) {
      setError('El teléfono es obligatorio');
      document.getElementById('reg-phone')?.focus();
      return;
    }
    if (!form.id_card.trim()) {
      setError('La cédula es obligatoria');
      document.getElementById('reg-id-card')?.focus();
      return;
    }

    setSubmitting(true);
    try {
      const client = await publicService.completeGoogleRegistration({
        user_id: googleUser.id,
        name: form.name.trim(),
        email: form.email,
        phone: form.phone,
        id_card: form.id_card,
        birth_date: form.birth_date,
      });
      localStorage.setItem('panda_public_client', JSON.stringify(client));
      localStorage.setItem('panda_show_onboarding', 'true');
      localStorage.removeItem('panda_google_login_pending');

      if (shouldReturnToBookingAfterGoogle()) {
        clearGoogleAuthIntent();
        localStorage.removeItem('panda_login_return_to_booking');
        navigate('/agendar', { replace: true });
      } else {
        clearGoogleAuthIntent();
        localStorage.removeItem('panda_login_return_to_booking');
        // Same reliable pattern as email/booking signup (see Login.jsx and
        // BookAppointment.jsx): the onboarding flag is already persisted above,
        // and PublicLayout shows it when /perfil mounts. Using React Router's
        // navigate — instead of a manual window.location.replace — keeps this
        // flow identical to the others and avoids the OAuth-callback race that
        // used to strand the user on the landing page.
        navigate('/perfil', { replace: true });
      }
    } catch (e) {
      console.error('Registration error:', e);
      setError(e.message || 'Error al completar el registro');
    } finally {
      setSubmitting(false);
    }
  };

  const memberSinceRaw = new Date().toLocaleDateString('es-ES', { month: 'short', year: 'numeric' });
  const memberSince = memberSinceRaw.charAt(0).toUpperCase() + memberSinceRaw.slice(1).replace('.', '');
  const rank = getRank(clientPoints);
  const displayName = form.name.trim() || 'Tu nombre aquí';
  const initials = form.name.trim()
    ? form.name.trim().split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase()
    : '?';

  // 3D tilt for the membership card: rotation follows the cursor (spring-damped so it settles
  // smoothly instead of snapping), plus a specular highlight that tracks the same position —
  // together they read as light catching a physical card's surface rather than a flat image.
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

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#f4f5f3', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <Loader size={40} style={{ color: 'var(--champagne)', animation: 'spin 1s linear infinite', margin: '0 auto 16px' }} />
          <p style={{ color: 'var(--text-muted)' }}>Verificando sesión...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh', position: 'relative', overflow: 'hidden',
      background: '#f4f5f3',
      backgroundImage: 'linear-gradient(135deg,#f7f4ee 0%,#efe6d5 50%,#e8d4b0 100%)',
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      backgroundRepeat: 'no-repeat',
      backgroundAttachment: 'fixed',
    }}>
      {/* Dark overlay for depth and text readability */}
      <div style={{
        position: 'absolute', inset: 0, zIndex: 0,
        background: `none`,
      }} />

      {/* Minimal top bar: logo on one side, the single exit action on the other */}
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px clamp(20px, 5vw, 48px)', paddingTop: 'max(12px, env(safe-area-inset-top))' }}
      >
        <Link to="/" style={{ display: 'flex', alignItems: 'center', width: 'fit-content', textDecoration: 'none' }}>
          <img src={logo} alt="Dientes Sanos" style={{ height: 28, objectFit: 'contain', filter: 'brightness(1.15)' }} />
        </Link>
        <motion.button
          type="button"
          onClick={() => navigate('/')}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(217, 192, 143,0.10)';
            e.currentTarget.style.borderColor = 'rgba(217, 192, 143,0.35)';
            e.currentTarget.style.color = '#111111';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(217, 192, 143,0.06)';
            e.currentTarget.style.borderColor = 'rgba(217, 192, 143,0.25)';
            e.currentTarget.style.color = '#64748b';
          }}
          style={{
            background: 'rgba(217, 192, 143,0.06)', border: '1px solid rgba(217, 192, 143,0.25)',
            borderRadius: 999, padding: '10px 20px', fontSize: 13, fontWeight: 600,
            color: '#64748b', cursor: 'pointer',
            transition: 'all 0.2s ease',
          }}
        >
          Ahora no
        </motion.button>
      </motion.div>

      <div style={{ position: 'relative', zIndex: 1, padding: '4px clamp(16px, 5vw, 48px) 24px', display: 'flex', flexDirection: 'column', minHeight: 'calc(100vh - 64px)', justifyContent: 'center' }}>
        {/* ── Header + step tracker ── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1], delay: 0.15 }}
          style={{ textAlign: 'center', marginBottom: 26 }}
        >
          <p style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.22em', color: 'var(--champagne)', marginBottom: 6 }}>PASO FINAL</p>
          <h1 className="section-title" style={{ fontSize: '1.85rem', marginBottom: 5 }}>
            Ya eres parte de <span className="text-gold">Dientes Sanos.</span>
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: 13.5, marginBottom: 20 }}>
            Completa estos últimos datos y activa tu perfil.
          </p>
          <p style={{ color: '#94a3b8', fontSize: 11.5, margin: '-10px 0 20px' }}>
            La biometría no es obligatoria. Podrás activarla después si deseas usarla.
          </p>

          {/* 3-step tracker: this screen is always "Perfil" — Google is already done to get
              here, and Club Sonrisa (the welcome/rewards screen) comes right after submitting. */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0, maxWidth: 400, margin: '0 auto' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 7 }}>
              <div style={{
                width: 36, height: 36, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                border: '1.5px solid var(--champagne)', color: 'var(--champagne)',
              }}>
                <Check size={16} strokeWidth={3} />
              </div>
              <span style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.09em', color: '#94a3b8' }}>CUENTA DE GOOGLE</span>
            </div>
            <div style={{ flex: 1, height: 1.5, background: 'var(--champagne)', margin: '0 4px 20px' }} />
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 7 }}>
              <div style={{
                width: 36, height: 36, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: 'var(--gold-gradient)', color: '#ffffff', fontWeight: 900, fontSize: 14,
                boxShadow: '0 6px 18px rgba(17, 17, 17,0.3)',
              }}>
                2
              </div>
              <span style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.09em', color: '#111111' }}>PERFIL</span>
            </div>
            <div style={{ flex: 1, height: 1.5, background: 'rgba(217, 192, 143,0.15)', margin: '0 4px 20px' }} />
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 7 }}>
              <div style={{
                width: 36, height: 36, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                border: '1.5px solid rgba(217, 192, 143,0.3)', color: '#94a3b8', fontWeight: 800, fontSize: 14,
              }}>
                3
              </div>
              <span style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.09em', color: '#94a3b8' }}>CLUB SONRISA</span>
            </div>
          </div>
        </motion.div>

        {/* ── Two columns: form + live card preview ── */}
        <div style={{
          display: 'flex', flexWrap: 'wrap', alignItems: 'flex-start', justifyContent: 'center',
          gap: 'clamp(24px, 3vw, 40px)', maxWidth: 1180, margin: '0 auto',
        }}>
          {/* ── Left: the form ── */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1], delay: 0.25 }}
            className="glass-card"
            style={{ flex: '1 1 460px', maxWidth: 560, padding: 0, overflow: 'hidden' }}
          >
            <div style={{ padding: '22px 26px' }}>
              {/* Google identity summary. The editable name lives in the form below so
                  it is obvious that the imported display name can be corrected. */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 18 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
                  <div style={{
                    width: 44, height: 44, borderRadius: '50%', flexShrink: 0,
                    background: 'rgba(17, 17, 17,0.1)', border: '1.5px solid rgba(17, 17, 17,0.3)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 15, fontWeight: 800, color: 'var(--champagne)',
                  }}>
                    {initials}
                  </div>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ color: form.name.trim() ? '#0f172a' : '#64748b', fontSize: 15, fontWeight: 800 }}>
                      {form.name.trim() || 'Tu nombre'}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 1, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 12, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 160 }}>
                        {googleUser?.email}
                      </span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 10.5, color: '#34d399', fontWeight: 700, flexShrink: 0 }}>
                        <Check size={10} strokeWidth={3} /> Conectado con Google
                      </span>
                      <motion.button
                        type="button"
                        disabled={switchingAccount}
                        onClick={handleSwitchAccount}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        style={{
                          background: 'none', border: 'none', padding: 0, flexShrink: 0,
                          fontSize: 10.5, fontWeight: 700, color: 'var(--champagne)',
                          cursor: switchingAccount ? 'default' : 'pointer', opacity: switchingAccount ? 0.5 : 1,
                          textDecoration: 'underline', textUnderlineOffset: 2,
                        }}
                      >
                        {switchingAccount ? 'Abriendo Google…' : 'Cambiar cuenta'}
                      </motion.button>
                    </div>
                  </div>
                </div>
              </div>

              <div style={{ height: 1, background: 'rgba(217, 192, 143,0.15)', marginBottom: 20 }} />

              <form onSubmit={handleSubmit}>
                {error && (
                  <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: 'var(--radius-md)', padding: '12px 16px', marginBottom: 18, color: '#ef4444', fontSize: 13 }}>
                    {error}
                  </div>
                )}

                <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                  <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
                    <div style={{ flex: '1 1 220px' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 13, fontWeight: 700, color: '#0f172a', marginBottom: 8 }}>
                        Nombre y apellido <span style={{ color: '#ef4444' }}>*</span>
                      </label>
                      <div style={{ position: 'relative' }}>
                        <UserRound size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                        <input
                          id="reg-name"
                          type="text"
                          autoComplete="name"
                          value={form.name}
                          onChange={(e) => setForm({ ...form, name: e.target.value })}
                          className="input-field"
                          placeholder="Nombre y apellido"
                          style={{ paddingLeft: '40px' }}
                        />
                      </div>
                      <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                        Google lo completó por ti. Corrígelo si no es tu nombre real.
                      </p>
                    </div>

                    <div style={{ flex: '1 1 220px' }}>
                      <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#0f172a', marginBottom: 8 }}>
                        Correo de Google
                      </label>
                      <div style={{ position: 'relative' }}>
                        <Mail size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                        <input
                          type="email"
                          value={form.email}
                          readOnly
                          className="input-field"
                          style={{ paddingLeft: '40px', opacity: 0.72, cursor: 'not-allowed' }}
                          aria-label="Correo conectado con Google"
                        />
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
                    <div style={{ flex: '1 1 200px' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 13, fontWeight: 700, color: '#0f172a', marginBottom: 8 }}>
                        Teléfono <span style={{ color: '#ef4444' }}>*</span>
                      </label>
                      <div style={{ position: 'relative' }}>
                        <Phone size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                        <input
                          id="reg-phone"
                          type="tel"
                          value={form.phone}
                          onChange={(e) => setForm({ ...form, phone: e.target.value })}
                          className="input-field"
                          placeholder="+58 412-1234567"
                        />
                      </div>
                    </div>

                    <div style={{ flex: '1 1 200px' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 13, fontWeight: 700, color: '#0f172a', marginBottom: 8 }}>
                        Cédula <span style={{ color: '#ef4444' }}>*</span>
                      </label>
                      <div style={{ position: 'relative' }}>
                        <CreditCard size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                        <input
                          id="reg-id-card"
                          type="text"
                          value={form.id_card}
                          onChange={(e) => setForm({ ...form, id_card: e.target.value })}
                          className="input-field"
                          placeholder="V-12345678"
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#0f172a', marginBottom: 8 }}>
                      Fecha de nacimiento
                    </label>
                    <div style={{ position: 'relative' }}>
                      <Calendar size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                      <input
                        type="text"
                        inputMode="numeric"
                        value={birthDateDisplay}
                        onChange={(e) => {
                          const { display, iso } = formatBirthDateInput(e.target.value);
                          setBirthDateDisplay(display);
                          setForm({ ...form, birth_date: iso });
                        }}
                        className="input-field"
                        placeholder="dd/mm/aaaa"
                        maxLength={10}
                        style={{ paddingLeft: '40px' }}
                      />
                    </div>
                    <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>Opcional — para sorpresas y descuentos en tu cumpleaños</p>
                  </div>

                  <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', background: 'rgba(17, 17, 17,0.06)', border: '1px solid rgba(217, 192, 143,0.25)', borderRadius: 12, padding: '12px 14px' }}>
                    <Info size={15} style={{ color: 'var(--text-muted)', flexShrink: 0, marginTop: 1 }} />
                    <p style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.55 }}>
                      Podrás explorar la app sin completar estos datos. Los necesitaremos al momento de reservar tu cita.
                    </p>
                  </div>
                </div>

                <motion.button
                  type="submit"
                  className="btn-gold"
                  disabled={submitting}
                  whileHover={{ scale: 1.02, boxShadow: '0 8px 30px rgba(17, 17, 17,0.35)' }}
                  whileTap={{ scale: 0.98 }}
                  style={{ width: '100%', marginTop: 22, padding: '14px', fontSize: 15, borderRadius: 'var(--radius-pill)', opacity: submitting ? 0.6 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, cursor: submitting ? 'not-allowed' : 'pointer' }}
                >
                  {submitting ? 'Guardando...' : <>Activar mi perfil Dientes Sanos <ArrowRight size={17} /></>}
                </motion.button>
              </form>
            </div>
          </motion.div>

          {/* Connector arrow — purely decorative, only where there's room for it. */}
          <motion.div
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1], delay: 0.5 }}
            className="hidden xl:flex"
            style={{ alignSelf: 'center', paddingTop: 60 }}
          >
            <ArrowRight size={26} style={{ color: 'var(--champagne)' }} />
          </motion.div>

          {/* ── Right: live membership card preview (desktop only — the mobile layout
              already needs the vertical space for the form itself). ── */}
          <motion.div
            className="hidden lg:block"
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1], delay: 0.15 }}
            style={{ flex: '1 1 380px', maxWidth: 400 }}
          >
            <p style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--champagne)', textAlign: 'center', marginBottom: 4 }}>
              TU CLUB SONRISA
            </p>
            <h2 style={{ fontSize: 20, fontWeight: 800, color: '#111111', textAlign: 'center', marginBottom: 18 }}>
              Tu membresía empieza <span className="text-gold">hoy.</span>
            </h2>

            {/* The membership card itself. Structural elements (border, chip, avatar ring)
                are graphite/chrome — true to the logo's black & white identity — and gold is
                reserved for the two things actually worth highlighting: the member label and
                the points count. `perspective` on this wrapper is what makes the child's
                rotateX/rotateY read as real depth instead of a flat skew. */}
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

                {/* Subtle cursor-tracked glint — much softer/tighter than the earlier
                    attempt, so it reads as a refined shimmer rather than a bright spot
                    sitting in the middle of the card. */}
                <motion.div style={{ position: 'absolute', inset: 0, background: cardGlowBackground, pointerEvents: 'none' }} />
                {/* Thin, faint diagonal sheen — always present at a whisper, so the card
                    still looks like polished metal even before you hover it. */}
                <div style={{
                  position: 'absolute', inset: '-50%',
                  background: 'linear-gradient(115deg, transparent 47%, rgba(15,23,42,0.05) 50%, transparent 53%)',
                  pointerEvents: 'none',
                }} />

                <div style={{ position: 'relative', zIndex: 1, height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '20px 22px', transform: 'translateZ(30px)' }}>
                  {/* Top row: brand */}
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 900, letterSpacing: '0.06em', color: '#111111' }}>DIENTES SANOS</div>
                    <div style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: '0.2em', color: 'var(--champagne)' }}>MIEMBRO CLUB</div>
                  </div>

                  {/* Middle: avatar + name */}
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
                        fontSize: 15, fontWeight: 800, color: form.name.trim() ? '#0f172a' : '#64748b',
                        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 220,
                        transition: 'color 0.3s ease',
                      }}>
                        {displayName.toUpperCase()}
                      </div>
                      <div style={{ fontSize: 10.5, color: '#64748b', fontWeight: 600 }}>Miembro desde {memberSince}</div>
                    </div>
                  </div>

                  {/* Bottom row: tier + points — the one place gold is meant to pop. */}
                  <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
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

            {/* Benefits row — vertical layout (badge, then title, then description, all
                centered) gives each line of text the item's FULL width instead of sharing
                it with a side-by-side icon, which is what was forcing the wraps before.
                whiteSpace: nowrap + ellipsis is a safety net, not the primary fix — the
                shortened copy above is what actually keeps every line real (no visible …). */}
            <div style={{
              display: 'flex', marginTop: 18,
              background: 'linear-gradient(180deg, rgba(217, 192, 143,0.05) 0%, rgba(217, 192, 143,0.02) 100%)',
              border: '1px solid rgba(217, 192, 143,0.18)',
              borderRadius: 18, overflow: 'hidden',
            }}>
              {BENEFITS.map(({ icon: Icon, title, desc }, idx) => (
                <div
                  key={title}
                  style={{
                    flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', alignItems: 'center',
                    textAlign: 'center', padding: '20px 10px',
                    position: 'relative',
                  }}
                >
                  {idx > 0 && (
                    <div style={{
                      position: 'absolute', left: 0, top: '18%', bottom: '18%', width: 1,
                      background: 'linear-gradient(180deg, transparent, rgba(17, 17, 17,0.2), transparent)',
                    }} />
                  )}
                  <div style={{
                    width: 38, height: 38, borderRadius: '50%', marginBottom: 11,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: 'rgba(17, 17, 17,0.08)', border: '1px solid rgba(17, 17, 17,0.28)',
                    boxShadow: '0 0 14px -4px rgba(17, 17, 17,0.3)',
                  }}>
                    <Icon size={16} style={{ color: 'var(--champagne)' }} />
                  </div>
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
                </div>
              ))}
            </div>
          </motion.div>
        </div>

        {/* ── Trust bar ── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1], delay: 0.6 }}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 14,
            maxWidth: 480, margin: '30px auto 0', textAlign: 'center',
          }}
        >
          <div style={{
            width: 38, height: 38, borderRadius: '50%', flexShrink: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'rgba(17, 17, 17,0.1)', border: '1px solid rgba(17, 17, 17,0.3)',
            boxShadow: '0 0 16px -4px rgba(17, 17, 17,0.35)',
          }}>
            <Shield size={17} style={{ color: 'var(--champagne)' }} />
          </div>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.5 }}>
            Tus datos están 100% seguros con nosotros.
            <br />
            Solo los usamos para brindarte la mejor experiencia.
          </p>
        </motion.div>
      </div>
    </div>
  );
}
