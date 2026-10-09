import { Home, Calendar, Crown, User, Plus, Compass } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence, useScroll, useMotionValueEvent } from 'framer-motion';
import { useState, useRef } from 'react';

const publicNavItems = [
  { id: 'inicio', label: 'Inicio', icon: Home, path: '/', exact: true },
  { id: 'citas', label: 'Citas', icon: Calendar, path: '/agendar' }, 
  { id: 'club', label: 'Club', icon: Crown, path: '/login' },
  { id: 'perfil', label: 'Perfil', icon: User, path: '/login' },
];

const authNavItems = [
  { id: 'inicio', label: 'Inicio', icon: Home, path: '/perfil', exact: true }, 
  { id: 'citas', label: 'Citas', icon: Calendar, path: '/perfil/citas' },
  { id: 'reservar', label: 'Reservar', icon: Plus, path: '/perfil/reservar', isSpecial: true }, 
  { id: 'club', label: 'Club', icon: Crown, path: '/perfil/club' },
  { id: 'explorar', label: 'Explorar', icon: Compass, path: '/perfil/explorar' },
];

export default function BottomNav() {
  const navigate = useNavigate();
  const location = useLocation();
  const isLoggedIn = !!localStorage.getItem('panda_public_client');
  const navItems = isLoggedIn ? authNavItems : publicNavItems;
  const [hidden, setHidden] = useState(false);
  const { scrollY } = useScroll();
  const lastScrollY = useRef(0);

  useMotionValueEvent(scrollY, "change", (latest) => {
    const previous = lastScrollY.current;
    if (latest > previous && latest > 100) {
      setHidden(true); // Scrolling down, hide
    } else {
      setHidden(false); // Scrolling up, show
    }
    lastScrollY.current = latest;
  });

  const isActive = (item) => {
    if (item.exact) return location.pathname === item.path;
    return location.pathname.startsWith(item.path);
  };

  return (
    <motion.div 
      className="bottom-nav-wrapper"
      variants={{
        visible: { y: 0, opacity: 1 },
        hidden: { y: 150, opacity: 0 }
      }}
      initial="hidden"
      animate={hidden ? "hidden" : "visible"}
      transition={{ type: "spring", stiffness: 350, damping: 30 }}
    >
      <div className="bottom-nav-dock">
        {navItems.map((item) => {
          const active = isActive(item);
          const Icon = item.icon;

          if (item.isSpecial) {
            return (
              <button
                key={item.id}
                onClick={() => navigate(item.path)}
                className={`nav-dock-item special ${active ? 'active' : ''}`}
              >
                {active && (
                  <motion.div
                    layoutId="dock-indicator"
                    className="dock-active-bg special-bg"
                    initial={false}
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  />
                )}
                <span className="dock-icon-wrapper relative z-10">
                  <Icon size={24} strokeWidth={2.5} className={active ? 'text-[#1a1a1a]' : 'text-[#1a1a1a]'} />
                </span>
                <AnimatePresence mode="popLayout">
                  {active && (
                    <motion.span
                      key="label"
                      initial={{ opacity: 0, width: 0, marginLeft: 0 }}
                      animate={{ opacity: 1, width: 'auto', marginLeft: 6 }}
                      exit={{ opacity: 0, width: 0, marginLeft: 0 }}
                      transition={{ type: "spring", stiffness: 400, damping: 30 }}
                      className="dock-label special-label relative z-10"
                    >
                      {item.label}
                    </motion.span>
                  )}
                </AnimatePresence>
                {!active && (
                  <div className="special-orb-glow" />
                )}
              </button>
            );
          }

          return (
            <button
              key={item.id}
              onClick={() => navigate(item.path)}
              className={`nav-dock-item ${active ? 'active' : ''}`}
            >
              {active && (
                <motion.div
                  layoutId="dock-indicator"
                  className="dock-active-bg"
                  initial={false}
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                />
              )}
              <span className="dock-icon-wrapper relative z-10">
                <Icon size={24} strokeWidth={active ? 2.5 : 2} className={active ? 'text-[#111111]' : 'text-[#94a3b8]'} />
              </span>
              <AnimatePresence mode="popLayout">
                {active && (
                  <motion.span
                    key="label"
                    initial={{ opacity: 0, width: 0, marginLeft: 0 }}
                    animate={{ opacity: 1, width: 'auto', marginLeft: 6 }}
                    exit={{ opacity: 0, width: 0, marginLeft: 0 }}
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                    className="dock-label relative z-10"
                  >
                    {item.label}
                  </motion.span>
                )}
              </AnimatePresence>
            </button>
          );
        })}
      </div>

      <style>{`
        .bottom-nav-wrapper {
          position: fixed;
          bottom: calc(env(safe-area-inset-bottom) + 20px);
          left: 0;
          right: 0;
          display: flex;
          justify-content: center;
          pointer-events: none;
          z-index: 100;
        }

        .bottom-nav-dock {
          pointer-events: auto;
          display: flex;
          align-items: center;
          gap: 10px;
          background: rgba(255, 255, 255, 0.92);
          backdrop-filter: blur(40px) saturate(200%);
          -webkit-backdrop-filter: blur(40px) saturate(200%);
          border: 1px solid rgba(217, 192, 143, 0.2);
          border-radius: 40px;
          padding: 10px;
          box-shadow: 0 10px 40px rgba(0, 0, 0, 0.10), inset 0 1px 1px rgba(255, 255, 255, 0.6);
        }

        .nav-dock-item {
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 30px;
          border: none;
          background: transparent;
          cursor: pointer;
          height: 52px;
          padding: 0 18px;
          overflow: hidden;
          transition: transform 0.15s cubic-bezier(0.2, 0.8, 0.2, 1);
          outline: none;
          -webkit-tap-highlight-color: transparent;
        }

        .nav-dock-item:active {
          transform: scale(0.92);
        }

        .nav-dock-item.special {
          padding: 0 18px;
        }
        .nav-dock-item.special:not(.active) {
          background: linear-gradient(135deg, #e5d9c5, #111111);
          width: 52px;
          border-radius: 50%;
          padding: 0;
          box-shadow: 0 4px 15px rgba(17, 17, 17, 0.3);
        }

        .dock-active-bg {
          position: absolute;
          inset: 0;
          background: rgba(217, 192, 143, 0.15);
          border-radius: 30px;
          z-index: 0;
        }

        .dock-active-bg.special-bg {
          background: linear-gradient(135deg, #e5d9c5, #111111);
          box-shadow: 0 4px 20px rgba(17, 17, 17, 0.4);
        }

        .dock-label {
          font-family: 'General Sans', sans-serif;
          font-size: 15px;
          font-weight: 800;
          color: #111111;
          letter-spacing: 0.5px;
          white-space: nowrap;
        }

        .dock-label.special-label {
          color: #1a1a1a;
        }

        .special-orb-glow {
          position: absolute;
          inset: 0;
          border-radius: 50%;
          box-shadow: inset 0 2px 5px rgba(255, 255, 255, 0.6);
          pointer-events: none;
        }

        @media (min-width: 768px) {
          .bottom-nav-wrapper { display: none !important; }
        }
      `}</style>
    </motion.div>
  );
}
