import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useState, useEffect, useRef, Suspense } from 'react';
import { Menu, X, Scissors, Phone, MapPin, Calendar, User, ChevronRight, Check, ArrowRight, Star, Gift } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { publicService } from '../services/publicService';
import { CLINIC } from '../config/clinic';
import { clearGoogleAuthIntent, shouldReturnToBookingAfterGoogle } from '../utils/googleAuthIntent';
import logo from '../../assets/panda_menu_logo.png';
import PandaLoader from '../../components/PandaLoader';
import Onboarding from './Onboarding';
import Skeleton from './Skeleton';

// Fallback mientras React descarga el chunk de una ruta visitada por primera vez.
// Ver nota equivalente en ClientLayout: el Suspense vive aqui (no en PublicRouter)
// para que el chrome de este layout no se desmonte y la pantalla no se ponga negra.
const RouteFallback = () => (
  <div style={{ maxWidth: 720, margin: '0 auto', padding: '24px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
    <Skeleton className="w-1/2 rounded-lg" style={{ height: 22 }} />
    <Skeleton className="w-full rounded-2xl" style={{ height: 180 }} />
    <Skeleton className="w-full rounded-xl" style={{ height: 70 }} />
    <Skeleton className="w-full rounded-xl" style={{ height: 70 }} />
  </div>
);

export default function PublicLayout() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [clickedId, setClickedId] = useState(null);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const googleCallbackHandledRef = useRef(false);

  const isGoogleCallback = typeof window !== 'undefined' && (
    window.location.hash.includes('access_token=') ||
    window.location.search.includes('code=') ||
    (localStorage.getItem('panda_google_login_pending') === 'true' && !localStorage.getItem('panda_public_client'))
  );
  const [isAuthResolving, setIsAuthResolving] = useState(isGoogleCallback);

  // Clean up stale panda_google_login_pending if it's been there too long (5 minutes)
  // or if user is already logged in
  useEffect(() => {
    const pending = localStorage.getItem('panda_google_login_pending');
    const alreadyLoggedIn = localStorage.getItem('panda_public_client');
    if (pending === 'true') {
      if (alreadyLoggedIn) {
        // User is already logged in, just clean up the flag
        localStorage.removeItem('panda_google_login_pending');
        setIsAuthResolving(false);
      } else {
        const timer = setTimeout(() => {
          localStorage.removeItem('panda_google_login_pending');
          setIsAuthResolving(false);
        }, 5 * 60 * 1000); // 5 minutes timeout
        return () => clearTimeout(timer);
      }
    }
  }, []);

  // Show onboarding the first time a new user actually lands on /perfil — not the
  // moment registration finishes. Registration can complete mid-booking (e.g. Google
  // sign-in from step 5), and that flow redirects back to /agendar to let the visitor
  // finish the reservation they were already in the middle of; showing the profile
  // intro on top of that would interrupt the one thing they were trying to do. The
  // flag just stays pending in localStorage until they do visit /perfil.
  useEffect(() => {
    const shouldShow = location.state?.showOnboarding === true
      || localStorage.getItem('panda_show_onboarding') === 'true';
    if (shouldShow && location.pathname === '/perfil') {
      setShowOnboarding(true);
    }
  }, [location.pathname, location.state]);

  useEffect(() => {
    const handleScroll = (e) => {
      const scrollTop = e.target?.scrollTop ?? window.scrollY;
      if (scrollTop > 30) {
        setIsScrolled(true);
      } else {
        setIsScrolled(false);
      }
    };
    // Use capture phase (true) to intercept scroll events from scrollable divs inside child pages
    window.addEventListener('scroll', handleScroll, true);
    return () => window.removeEventListener('scroll', handleScroll, true);
  }, []);

  useEffect(() => {
    const client = localStorage.getItem('panda_public_client');
    setIsLoggedIn(!!client);
    
    // Auto-redirect logged-in users away from the public landing page to their profile
    if (client && location.pathname === '/') {
      navigate('/perfil', { replace: true });
    }
  }, [location.pathname, navigate]);

  // Lock body scroll when mobile menu is open to prevent background flickering/scrolling
  useEffect(() => {
    if (menuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [menuOpen]);

  useEffect(() => {
    // `isExplicitLogin` distinguishes "the user just finished signing in with Google" (the
    // SIGNED_IN event, fired right after the OAuth redirect) from "the app booted and found
    // a session Supabase already had persisted" (INITIAL_SESSION, and the getSession() call
    // below — this fires on every single page load/refresh while a Google session exists).
    // Only the former should force-navigate to /completar-registro: doing it on every load
    // hijacked ALL navigation on the site (clicking any nav link, even the logo) back to
    // that screen for as long as the profile stayed incomplete, with no way out. Now, on a
    // routine reload with an incomplete profile, the visitor is simply not marked as a full
    // client (isLoggedIn stays false) and can browse normally; completing the profile is
    // enforced at the point that actually requires it — entering the booking flow (see the
    // guard in BookAppointment.jsx).
    const completeGoogleLogin = async (session, isExplicitLogin) => {
      if (!session?.user) {
        localStorage.removeItem('panda_google_login_pending');
        setIsAuthResolving(false);
        return;
      }

      const isGoogleUser = session.user.app_metadata?.provider === 'google'
        || session.user.identities?.some(id => id.provider === 'google');

      if (!isGoogleUser && localStorage.getItem('panda_google_login_pending') !== 'true') {
        setIsAuthResolving(false);
        return;
      }

      if (googleCallbackHandledRef.current) return;
      googleCallbackHandledRef.current = true;

      if (localStorage.getItem('panda_public_client')) {
        setIsAuthResolving(false);
        return;
      }

      if (isExplicitLogin) setIsAuthResolving(true);

      try {
        localStorage.removeItem('panda_google_login_pending');

        let client = await publicService.getClientByUserId(session.user.id);
        if (!client && session.user.email) {
          client = await publicService.getClientByEmail(session.user.email);
        }

        // If client record doesn't exist OR is missing phone/id_card -> Complete Registration,
        // but only redirect there automatically when this is a fresh login. On a routine
        // reload, leave the visitor wherever they already are.
        if (!client || !client.phone || !client.id_card) {
          if (isExplicitLogin) {
            navigate('/completar-registro', { replace: true });
          }
          return;
        }

        localStorage.setItem('panda_public_client', JSON.stringify(client));
        localStorage.setItem('panda_public_session', JSON.stringify(session));
        setIsLoggedIn(true);

        if (isExplicitLogin) {
          if (shouldReturnToBookingAfterGoogle()) {
            clearGoogleAuthIntent();
            localStorage.removeItem('panda_login_return_to_booking');
            navigate('/agendar', { replace: true });
          } else {
            clearGoogleAuthIntent();
            localStorage.removeItem('panda_login_return_to_booking');
            navigate('/perfil', { replace: true });
          }
        }
      } catch (e) {
        googleCallbackHandledRef.current = false;
        console.error('Error fetching client after Google login:', e);
      } finally {
        setIsAuthResolving(false);
      }
    };

    const { data: authListener } = publicService.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION') {
        completeGoogleLogin(session, event === 'SIGNED_IN');
      }
    });

    publicService.getSession()
      .then(session => completeGoogleLogin(session, false))
      .catch(error => {
        console.error('Error restoring Google session:', error);
        setIsAuthResolving(false);
      });

    return () => {
      authListener?.subscription?.unsubscribe();
    };
  }, [navigate]);

  const mobileNavLinks = [
    { id: 'inicio', label: 'Inicio' },
    { id: 'servicios', label: 'Servicios' },
    { id: 'equipo', label: 'Equipo' },
    { id: 'experiencia-section', label: 'Experiencia' },
    { id: 'resenas', label: 'Reseñas' },
    { id: 'ubicacion', label: 'Ubicación' }
  ];

  const isActive = (path) => location.pathname === path;

  // Navbar links target sections that only exist on the landing ('/'). From any other route
  // (e.g. /completar-registro, /perfil) document.getElementById(id) finds nothing and used to
  // silently do nothing — clicking "Inicio"/"Servicios"/etc. looked completely dead and left
  // the user stranded with no way out of that page. Now: navigate home first, then scroll
  // once the landing has actually rendered.
  const goToSection = (id) => {
    if (location.pathname === '/') {
      document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }
    navigate('/');
    let attempts = 0;
    const tryScroll = () => {
      const el = document.getElementById(id);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      } else if (++attempts < 30) {
        requestAnimationFrame(tryScroll);
      }
    };
    requestAnimationFrame(tryScroll);
  };

  // Kept for the mobile menu call sites below; same landing-aware behavior as goToSection.
  const handleScrollTo = (id) => goToSection(id);

  // Focused onboarding step, not a browsable page — the full site nav here would just be
  // distracting chrome competing with the one thing the user needs to do. The page itself
  // provides its own way out ("Volver al inicio" / cerrar sesión).
  // Also hide on /perfil (and sub-routes) — the profile is an authenticated view that
  // should not show the landing nav. Hide on /reservar and /agendar too — BookAppointment
  // has its own navigation and showing the landing nav causes a flash.
  const hideNav = ['/completar-registro', '/login', '/registro', '/olvidar-contraseña', '/restablecer-contraseña', '/reset-password', '/perfil', '/reservar', '/agendar'].some(p => decodeURIComponent(location.pathname).startsWith(p));

  // Skip auth loading screen if onboarding is showing or just finished
  // Also show loader (prevent flash) if we are on the landing page and have a session, because we will redirect to /perfil
  const isPendingPwaRedirect = typeof window !== 'undefined' && location.pathname === '/' && !!localStorage.getItem('panda_public_client');
  if ((isAuthResolving || isPendingPwaRedirect) && !showOnboarding) {
    return (
      <div style={{
        minHeight: '100dvh',
        background: '#f4f5f3',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20
      }}>
        <PandaLoader visible={true} />
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column' }}>
      {/* Onboarding Overlay */}
      <AnimatePresence>
        {showOnboarding && (
          <Onboarding onComplete={() => {
            localStorage.removeItem('panda_show_onboarding');
            localStorage.setItem('panda_onboarding_seen', 'true');
            setIsAuthResolving(false);
            setShowOnboarding(false);
          }} />
        )}
      </AnimatePresence>

      {/* Desktop Header */}
      {!hideNav && <header
        className={`hidden lg:flex fixed top-0 w-full z-50 transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] ${
          isScrolled 
            ? 'bg-[rgba(255,255,255,0.92)] backdrop-blur-xl border-b border-[rgba(217,192,143,0.15)] shadow-[0_4px_30px_rgba(0,0,0,0.06)]' 
            : 'bg-[rgba(233,234,232,0.85)] backdrop-blur-md border-b border-transparent'
        }`}
        style={{
          paddingTop: isScrolled ? 'calc(max(env(safe-area-inset-top, 0px), 12px))' : 'calc(max(env(safe-area-inset-top, 0px), 24px))',
          paddingBottom: isScrolled ? '12px' : '24px'
        }}
      >
        <div className="w-full max-w-[1200px] mx-auto px-6 flex items-center justify-between">
          {/* Logo */}
          {/* Link (client-side nav), not a plain <a href="/">: a full page reload here
              re-runs the Google-session auth guard below, which sees the session is still
              active and the profile is still incomplete, and immediately bounces back to
              /completar-registro — so the logo looked like it did nothing. */}
          <Link to="/" className="flex items-center no-underline">
            <img src={logo} alt="Dientes Sanos" className="h-[48px] object-contain" style={{ filter: 'brightness(1.15)' }} />
          </Link>
          
           {/* Navigation Links */}
          <div className="flex items-center gap-8 nav-links-desktop">
            <a
              href="#inicio"
              onClick={(e) => { e.preventDefault(); goToSection('inicio'); }}
              className="text-[#111111] hover:text-[#8a7355] transition-colors text-xs uppercase font-extrabold tracking-widest no-underline"
            >
              Inicio
            </a>
            <a
              href="#servicios"
              onClick={(e) => { e.preventDefault(); goToSection('servicios'); }}
              className="text-[#111111] hover:text-[#8a7355] transition-colors text-xs uppercase font-extrabold tracking-widest no-underline"
            >
              Servicios
            </a>
            <a
              href="#equipo"
              onClick={(e) => { e.preventDefault(); goToSection('equipo'); }}
              className="text-[#111111] hover:text-[#8a7355] transition-colors text-xs uppercase font-extrabold tracking-widest no-underline"
            >
              Equipo
            </a>
            <a
              href="#experiencia-section"
              onClick={(e) => { e.preventDefault(); goToSection('experiencia-section'); }}
              className="text-[#111111] hover:text-[#8a7355] transition-colors text-xs uppercase font-extrabold tracking-widest no-underline"
            >
              Experiencia
            </a>
            <a
              href="#resenas"
              onClick={(e) => { e.preventDefault(); goToSection('resenas'); }}
              className="text-[#111111] hover:text-[#8a7355] transition-colors text-xs uppercase font-extrabold tracking-widest no-underline"
            >
              Reseñas
            </a>
            <a
              href="#ubicacion"
              onClick={(e) => { e.preventDefault(); goToSection('ubicacion'); }}
              className="text-[#111111] hover:text-[#8a7355] transition-colors text-xs uppercase font-extrabold tracking-widest no-underline"
            >
              Ubicación
            </a>
          </div>
 
          {/* Action Buttons */}
          <div className="flex items-center gap-4 header-actions-desktop">
            {isLoggedIn ? (
              <>
                <Link to="/perfil" className="btn-outline flex items-center gap-2" style={{ padding: '8px 20px', fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', tracking: '0.15em', borderRadius: '100px' }}>
                  <User size={13} /> Mi Perfil
                </Link>
                <Link
                  to="/agendar"
                  state={{ startBooking: true, bookingRequestId: Date.now() }}
                  className="btn-gold flex items-center gap-2"
                  style={{ padding: '8px 20px', fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', tracking: '0.15em', borderRadius: '100px' }}
                >
                  <Calendar size={13} /> Reservar
                </Link>
              </>
            ) : (
              <>
                <Link to="/login" className="btn-outline flex items-center gap-2" style={{ padding: '8px 20px', fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', tracking: '0.15em', borderRadius: '100px' }}>
                  <User size={13} /> Iniciar Sesión
                </Link>
                <Link to="/registro" className="btn-gold flex items-center gap-2" style={{ padding: '8px 20px', fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', tracking: '0.15em', borderRadius: '100px' }}>
                  <Calendar size={13} /> Reservar mi visita
                </Link>
              </>
            )}
          </div>
        </div>
      </header>}

      {/* Navbar - Glassmorphic Mobile Header Bar (Mobile Only) */}
      {!hideNav && <nav
        className={`fixed top-0 left-0 w-full z-50 flex items-center justify-between px-6 lg:hidden transition-colors duration-300 ${
          isScrolled
            ? 'bg-[rgba(255,255,255,0.96)] border-b border-[rgba(217,192,143,0.15)] shadow-[0_4px_25px_rgba(0,0,0,0.06)]'
            : 'bg-[rgba(233,234,232,0.85)] border-b border-transparent'
        }`}
        style={{
          paddingTop: 'calc(max(env(safe-area-inset-top, 0px), 16px))',
          paddingBottom: '16px'
        }}
      >
        {/* Clickable Logo */}
        <Link to="/" onClick={() => setMenuOpen(false)} className="flex items-center">
          <img src={logo} alt="Dientes Sanos" className="h-[38px] object-contain filter brightness-110" />
        </Link>

        {/* Menu Toggle Button */}
        <button
          onClick={() => {
            setMenuOpen(!menuOpen);
            setClickedId(null);
          }}
          className="relative z-[60] flex items-center justify-center p-2 text-[#111111] transition-all active:scale-90"
        >
          <motion.div
            initial={false}
            animate={{ rotate: menuOpen ? 90 : 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
          >
            {menuOpen ? <X size={24} strokeWidth={1.5} /> : <Menu size={24} strokeWidth={1.5} />}
          </motion.div>
        </button>

        {/* Menu Dropdown - Apple Premium UX (Framer Motion) */}
        <AnimatePresence>
          {menuOpen && (
            <motion.div
              initial={{ opacity: 0, scale: 1.05 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.4, ease: [0.32, 0, 0.67, 0] } }}
              transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
              className="fixed inset-0 z-50 flex flex-col pt-[80px]"
              style={{
                backgroundColor: '#f4f5f3',
                backgroundImage: 'radial-gradient(circle at top right, rgba(17, 17, 17,0.08) 0%, transparent 60%)',
                height: '100dvh'
              }}
            >
              <div className="flex-1 px-8 pt-12 overflow-y-auto pb-32">
                {/* Parent group to handle dimming of non-hovered items */}
                <div className="flex flex-col gap-2 group/menu">
                  {mobileNavLinks.map((link, index) => (
                    <motion.a
                      key={link.id}
                      href={`#${link.id}`}
                      initial={{ opacity: 0, y: 30 }}
                      animate={
                        clickedId === link.id
                          ? { scale: 0.95, backgroundColor: 'rgba(217, 192, 143, 0.12)', opacity: 1, y: 0 }
                          : { scale: 1, backgroundColor: 'rgba(217, 192, 143, 0)', opacity: 1, y: 0 }
                      }
                      exit={{ opacity: 0, x: -40, transition: { duration: 0.3, ease: 'easeIn', delay: index * 0.03 } }}
                      whileTap={{ scale: 0.95, backgroundColor: 'rgba(217, 192, 143, 0.12)' }}
                      transition={{
                        default: { type: 'spring', stiffness: 300, damping: 25, delay: clickedId ? 0 : index * 0.06 + 0.08 },
                        opacity: { duration: 0.25, ease: 'easeOut', delay: clickedId ? 0 : index * 0.06 + 0.08 },
                        backgroundColor: { duration: 0.2, ease: 'easeOut' }
                      }}
                      onClick={(e) => {
                        e.preventDefault();
                        setClickedId(link.id);
                        setTimeout(() => setMenuOpen(false), 200);
                        setTimeout(() => handleScrollTo(link.id), 400);
                      }}
                      className="group flex items-center gap-6 px-6 py-4 rounded-2xl text-[#111111] cursor-pointer"
                    >
                      {/* Numbering */}
                      <span className="text-[#8a7355] text-sm font-bold tracking-widest">
                        {String(index + 1).padStart(2, '0')}
                      </span>
                      {/* Main Text */}
                      <span className="text-4xl sm:text-5xl font-black uppercase tracking-tighter">
                        {link.label}
                      </span>
                    </motion.a>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>}

      {/* Main Content — hidden while onboarding is active */}
      {!showOnboarding && (
        <main style={{ flex: 1 }}>
          <Suspense fallback={<RouteFallback />}>
            <Outlet />
          </Suspense>
        </main>
      )}

      {/* ── Floating WhatsApp Button ── */}
      {!showOnboarding && !menuOpen && location.pathname === '/' && (
        <a
          href={CLINIC.whatsappUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="whatsapp-float-btn fixed bottom-6 left-6 md:left-8 z-[9999] bg-[#f4f5f3] border border-[#111111]/30 text-[#111111] p-3 md:p-4 rounded-full shadow-[0_4px_20px_rgba(17, 17, 17,0.15)] hover:border-[#111111] hover:bg-[#111111]/10 hover:scale-110 active:scale-95 transition-all duration-300 flex items-center justify-center group"
          aria-label="Contactar por WhatsApp"
        >
          <svg viewBox="0 0 24 24" width="28" height="28" fill="currentColor">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"/>
          </svg>
          <span className="absolute left-full ml-4 bg-white/95 text-[#111111] text-[11px] font-bold py-2 px-3 rounded-xl border border-[#d9c08f]/30 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none whitespace-nowrap shadow-lg">
            ¡Háblanos por WhatsApp!
          </span>
        </a>
      )}

    </div>
  );
}
