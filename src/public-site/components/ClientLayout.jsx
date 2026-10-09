import { Outlet, Navigate, useLocation, useNavigate, useOutlet } from 'react-router-dom';
import { Home, Calendar, User, Plus, Crown, LogOut, Compass } from 'lucide-react';
import { useState, useEffect, Suspense } from 'react';
import BottomNav from './BottomNav';
import Skeleton from './Skeleton';
import { publicService } from '../services/publicService';
import { AnimatePresence, motion } from 'framer-motion';
import logoFull from '../../assets/logo_full.png';
import pandaMenuLogo from '../../assets/panda_menu_logo.png';
import ClientLoader from '../../components/ClientLoader';

// Fallback mientras React descarga el chunk de una pestaña visitada por primera vez.
// Antes el Suspense vivia en PublicRouter, por encima de este layout: al suspenderse
// se desmontaba TODO (sidebar, bottom nav, fondo) dejando la pantalla en negro. Al
// tenerlo aqui, solo el contenido muestra este skeleton y el chrome del layout persiste.
const TabFallback = () => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: '4px 0' }}>
    <Skeleton className="w-full rounded-3xl" style={{ height: 160 }} />
    <Skeleton className="w-1/2 rounded-lg" style={{ height: 18, marginTop: 8 }} />
    <Skeleton className="w-full rounded-2xl" style={{ height: 90 }} />
    <Skeleton className="w-full rounded-2xl" style={{ height: 90 }} />
  </div>
);

export default function ClientLayout() {
  const [client, setClient] = useState(() => {
    try { return JSON.parse(localStorage.getItem('panda_public_client') || 'null'); } 
    catch { return null; }
  });
  const [points, setPoints] = useState(0);
  const [isTopClient, setIsTopClient] = useState(false);
  const [dataLoaded, setDataLoaded] = useState(false);
  const [showLoader, setShowLoader] = useState(true);
  // Lets a routed page (e.g. the booking success screen) ask the layout to
  // hide its own chrome — the desktop sidebar and BottomNav — so a
  // confirmation card can sit alone, centered, with nothing else on screen.
  // ClientLayout has no direct visibility into that page's local state
  // (it only renders it via <Outlet/>), so pages signal this with a plain
  // DOM event instead of threading state through the router.
  const [hideChrome, setHideChrome] = useState(false);

  const location = useLocation();
  const currentOutlet = useOutlet();
  const navigate = useNavigate();

  useEffect(() => {
    const handler = (e) => setHideChrome(!!e.detail);
    window.addEventListener('panda_hide_chrome', handler);
    return () => window.removeEventListener('panda_hide_chrome', handler);
  }, []);

  // Don't let chrome stay hidden if the visitor navigates away from
  // whatever page hid it without it announcing the reset itself.
  useEffect(() => {
    setHideChrome(false);
  }, [location.pathname]);

  useEffect(() => {
    if (window.matchMedia('(max-width: 767px)').matches) {
      window.scrollTo(0, 0);
    }
  }, [location.pathname]);

  useEffect(() => {
    if (!client) {
      setDataLoaded(true);
      return;
    }
    const loadData = async () => {
      try {
        const [pts, topClients] = await Promise.all([
          publicService.getClientPoints(client.id),
          publicService.getTopClientsOfMonth().catch(() => [])
        ]);
        setPoints(pts || 0);
        setIsTopClient((topClients || []).some(c => c.id === client.id));
      } catch (e) {
        console.error('Error in layout:', e);
      } finally {
        setDataLoaded(true);
      }
    };
    loadData();
  }, [client?.id]);

  if (!client) {
    return <Navigate to="/login" replace />;
  }

  const authNavItems = [
    { id: 'inicio', label: 'Inicio', icon: Home, path: '/perfil' },
    { id: 'citas', label: 'Citas', icon: Calendar, path: '/perfil/citas' },
    { id: 'club', label: 'Club Sonrisa', icon: Crown, path: '/perfil/club' },
    { id: 'explorar', label: 'Explorar', icon: Compass, path: '/perfil/explorar' },
  ];

  const isActive = (path) => {
    if (path === '/perfil') return location.pathname === '/perfil';
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  return (
    <>
      <style>{`.whatsapp-float-btn { display: none !important; }`}</style>
      {showLoader && (
        <ClientLoader 
          visible={!dataLoaded} 
          onFinish={() => setShowLoader(false)} 
        />
      )}
      
      {dataLoaded && (
        <motion.div 
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="client-layout-container" 
      style={{ 
        minHeight: '100vh', 
        display: 'flex',
        position: 'relative'
      }}
    >
      <style>{`
        .whatsapp-float-btn { display: none !important; }
        @media (max-width: 767px) {
          .desktop-sidebar-wrapper { display: none !important; }
        }
      `}</style>
      {/* Full-viewport fixed aurora background — covers sidebar + content uniformly */}
      <div style={{
        position: 'fixed',
        inset: 0,
        zIndex: 0,
        backgroundColor: '#f4f5f3',
        backgroundImage: `radial-gradient(rgba(17,17,17, 0.10) 1px, transparent 1px), 
                          radial-gradient(circle at 50% 0%, rgba(17,17,17, 0.12) 0%, transparent 65%), 
                          radial-gradient(circle at 0% 100%, rgba(139, 92, 26, 0.05) 0%, transparent 45%), 
                          radial-gradient(circle at 100% 100%, rgba(17,17,17, 0.03) 0%, transparent 45%), 
                          linear-gradient(to bottom, #f4f5f3 0%, #e9eae8 100%)`,
        backgroundSize: '32px 32px, 100% 100%, 100% 100%, 100% 100%, 100% 100%',
        backgroundPosition: 'center center, center top, bottom left, bottom right, center center',
        backgroundRepeat: 'repeat, no-repeat, no-repeat, no-repeat, no-repeat',
        pointerEvents: 'none'
      }} />
      
      <style>{`
        @media (max-width: 767px) {
          .desktop-sidebar-wrapper { display: none !important; }
        }
      `}</style>
      {!hideChrome && (
      <div className="desktop-sidebar-wrapper">
        <div className="desktop-sidebar-inner" style={{
          position: 'relative', 
          zIndex: 1,
          background: 'var(--bg-secondary)',
          backdropFilter: 'blur(40px) saturate(200%)',
          WebkitBackdropFilter: 'blur(40px) saturate(200%)',
          borderRadius: '32px',
          border: '1px solid rgba(217, 192, 143, 0.15)',
          boxShadow: '0 30px 60px rgba(0, 0, 0, 0.10), inset 0 1px 2px rgba(255, 255, 255, 0.8)',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden'
        }}>
          {/* Subtle noise texture overlay */}
          <div style={{ position: 'absolute', inset: 0, opacity: 0.2, mixBlendMode: 'overlay', pointerEvents: 'none', backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=%220 0 200 200%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22noiseFilter%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.65%22 numOctaves=%223%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23noiseFilter)%22/%3E%3C/svg%3E")' }}></div>

          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 50, position: 'relative', zIndex: 2 }}>
            <img src={pandaMenuLogo} alt="Dientes Sanos" style={{ width: 180, filter: 'drop-shadow(0px 4px 10px rgba(0,0,0,0.15))' }} />
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: 1, position: 'relative', zIndex: 2 }}>
            <div style={{ fontSize: 10, fontWeight: 800, color: '#94a3b8', letterSpacing: '1.5px', marginBottom: 8, paddingLeft: 12 }}>MENÚ PRINCIPAL</div>
            {authNavItems.map(item => {
              const active = isActive(item.path);
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => navigate(item.path)}
                  style={{
                    position: 'relative',
                    display: 'flex', alignItems: 'center', gap: 16, padding: '12px 16px',
                    background: 'transparent',
                    borderRadius: '16px', border: 'none', cursor: 'pointer',
                    color: active ? '#111111' : '#64748b',
                    fontSize: 14, fontWeight: active ? 700 : 600, fontFamily: 'General Sans',
                    textAlign: 'left', textTransform: 'capitalize',
                    outline: 'none',
                    transition: 'color 0.3s ease'
                  }}
                  onMouseEnter={(e) => {
                    if(!active) e.currentTarget.style.color = '#0f172a';
                  }}
                  onMouseLeave={(e) => {
                    if(!active) e.currentTarget.style.color = '#64748b';
                  }}
                >
                  {active && (
                    <motion.div
                      layoutId="desktop-indicator"
                      style={{
                        position: 'absolute',
                        inset: 0,
                        background: 'rgba(217, 192, 143, 0.12)',
                        borderRadius: '16px',
                        border: '1px solid rgba(217, 192, 143, 0.20)',
                        zIndex: 0
                      }}
                      transition={{ type: "spring", stiffness: 400, damping: 30 }}
                    />
                  )}
                  <div style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Icon size={20} strokeWidth={active ? 2.5 : 2} style={{ filter: active ? 'drop-shadow(0 0 8px rgba(17,17,17,0.4))' : 'none', transition: 'all 0.3s ease' }} />
                  </div>
                  <span style={{ position: 'relative', zIndex: 1 }}>{item.label}</span>
                </button>
              );
            })}
          </div>

          <div style={{ position: 'relative', zIndex: 2, display: 'flex', flexDirection: 'column', gap: 16 }}>
            <motion.button 
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => navigate('/perfil/reservar')}
              style={{
                position: 'relative',
                background: 'linear-gradient(135deg, #e8d4b0, #d9c08f)',
                color: '#111111',
                border: 'none',
                padding: '16px',
                borderRadius: '16px',
                fontSize: '14px',
                fontWeight: 800,
                cursor: 'pointer',
                fontFamily: 'General Sans',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                boxShadow: '0 10px 30px rgba(17,17,17,0.25)',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                overflow: 'hidden'
              }}
            >
              <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(255,255,255,0.2) 0%, transparent 100%)' }}></div>
              <Plus size={18} strokeWidth={3} style={{ position: 'relative', zIndex: 1 }} />
              <span style={{ position: 'relative', zIndex: 1 }}>Agendar Cita</span>
            </motion.button>

            <button
              onClick={async () => {
                try {
                  await publicService.signOut();
                } catch (e) {
                  console.error('Logout error:', e);
                }
                localStorage.removeItem('panda_public_client');
                localStorage.removeItem('panda_public_session');
                localStorage.removeItem('bookingState');
                localStorage.removeItem('panda_draft_booking');
                navigate('/', { replace: true });
              }}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '12px',
                background: 'transparent', border: '1px solid rgba(217, 192, 143, 0.2)',
                borderRadius: '16px', color: '#94a3b8',
                cursor: 'pointer', fontFamily: 'General Sans', fontSize: 13, fontWeight: 600,
                transition: 'all 0.2s', letterSpacing: '0.5px'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = '#ef4444';
                e.currentTarget.style.background = 'rgba(239, 68, 68, 0.05)';
                e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.2)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = '#94a3b8';
                e.currentTarget.style.background = 'transparent';
                e.currentTarget.style.borderColor = 'rgba(217, 192, 143, 0.2)';
              }}
            >
              <LogOut size={16} strokeWidth={2} /> Salir
            </button>

            <div className="sidebar-vip-badge" style={{
              background: 'var(--bg-secondary)',
              border: '1px solid rgba(17,17,17,0.15)',
              borderRadius: '16px',
              padding: '16px',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '12px',
              position: 'relative',
              overflow: 'hidden'
            }}>
              <div style={{ position: 'absolute', top: 0, right: 0, width: '100px', height: '100px', background: 'radial-gradient(circle at top right, rgba(17,17,17,0.1) 0%, transparent 70%)', pointerEvents: 'none' }}></div>
              <div style={{ 
                background: 'rgba(17,17,17,0.1)', 
                borderRadius: '10px', 
                padding: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <Crown size={16} color="var(--champagne)" />
              </div>
              <div style={{ flex: 1, position: 'relative', zIndex: 1 }}>
                <div style={{ fontSize: 12, fontWeight: 800, color: '#111111', marginBottom: 2 }}>DIENTES SANOS VIP</div>
                <div style={{ fontSize: 11, color: '#64748b', lineHeight: 1.4, fontWeight: 500 }}>Gracias por ser parte de la bóveda.</div>
              </div>
            </div>
          </div>
        </div>
      </div>
      )}

      {/* ── MAIN CONTENT AREA ── */}
      <div className="main-content-area" style={{ flex: 1, display: 'flex', flexDirection: 'column', position: 'relative', zIndex: 1, paddingTop: 'calc(max(env(safe-area-inset-top, 0px), 12px))' }}>

        <div style={{ flex: 1 }} className="outlet-wrapper">
          {/* El Suspense va POR FUERA del motion.div con key por ruta: si quedara
              dentro (como estaba antes), el <Suspense> suspendiendose a mitad del
              mount de ese motion.div deja rota la animacion de framer-motion -el
              componente nunca llega a disparar animate() tras resolverse la carga-
              y el contenido se queda congelado en su estado initial (opacity: 0),
              es decir: pantalla en negro que ya no reacciona a nada. */}
          <Suspense fallback={<TabFallback />}>
            <AnimatePresence mode="wait">
              <motion.div
                key={location.pathname}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
              >
                {currentOutlet}
              </motion.div>
            </AnimatePresence>
          </Suspense>
        </div>
      </div>

      {!hideChrome && <BottomNav />}

      <style>{`
        .client-layout-container {
          flex-direction: column;
          min-height: 100dvh;
          width: 100%;
          max-width: 100%;
          display: flex;
        }
        .main-content-area {
          flex: 1;
          min-height: 0;
          max-width: 100%;
          background-color: #f4f5f3;
          background-image: 
            radial-gradient(rgba(17,17,17,0.10) 1px, transparent 1px),
            radial-gradient(circle at 50% 0%, rgba(17,17,17,0.12) 0%, transparent 65%),
            radial-gradient(circle at 0% 100%, rgba(139,92,26,0.05) 0%, transparent 45%),
            radial-gradient(circle at 100% 100%, rgba(17,17,17,0.03) 0%, transparent 45%),
            linear-gradient(to bottom, #f4f5f3 0%, #e9eae8 100%);
          background-size: 32px 32px, 100% 100%, 100% 100%, 100% 100%, 100% 100%;
          /* Keep this background unfixed. On desktop this panel owns the scroll;
             on mobile the document does. A fixed background in either path forces
             iOS/WebKit to repaint it on every frame and makes scrolling catch. */
        }
        .outlet-wrapper {
          /* 90px clears BottomNav's dock (60px tall dock + 20px gap off the viewport
             edge, plus a little breathing room) — env(safe-area-inset-bottom) was
             missing here, so on phones with a taller home-indicator inset the dock
             sat further up than this padding accounted for, leaving content (e.g.
             the booking wizard's "Siguiente" button) to peek out from under it. */
          padding-bottom: calc(90px + env(safe-area-inset-bottom, 0px));
        }
        @media (min-width: 768px) {
          .client-layout-container {
            flex-direction: row;
            height: 100dvh;
            overflow: hidden;
          }
          .main-content-area {
            height: 100dvh;
            overflow-y: auto;
            overflow-x: hidden;
          }
          .desktop-sidebar-wrapper {
            padding: 16px 0 16px 16px;
            display: flex;
            flex-direction: column;
          }
          .desktop-sidebar-inner {
            width: 220px;
            padding: 32px 16px;
          }
          .outlet-wrapper {
            padding: 0 16px 16px 16px;
          }
        }
        @media (min-width: 1024px) {
          .desktop-sidebar-wrapper {
            padding: 24px 0 24px 24px;
          }
          .desktop-sidebar-inner {
            width: 280px;
            padding: 40px 24px;
          }
          .desktop-header-wrapper {
            padding: 16px 40px 0 40px;
          }
          .outlet-wrapper {
            padding: 0 40px 40px 40px;
          }
        }
        @media (max-width: 1024px), (max-height: 800px) {
          .sidebar-vip-badge { display: none !important; }
        }
      `}</style>
        </motion.div>
      )}
    </>
  );
}
