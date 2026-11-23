import { useState, useRef, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, ArrowRight, ChevronLeft } from 'lucide-react';
import logo from '../../assets/logo_full.png';

const slides = [
  { id: 1 },
  { id: 2 },
  { id: 3 },
];

const SLIDE_BG = 'linear-gradient(135deg,#f7f4ee 0%,#efe6d5 50%,#e8d4b0 100%)';

function useBreakpoint() {
  const [bp, setBp] = useState(() => {
    if (typeof window === 'undefined') return 'mobile';
    if (window.innerWidth >= 1200) return 'desktop';
    if (window.innerWidth > window.innerHeight) return 'desktop';
    if (window.innerWidth >= 700) return 'tablet';
    return 'mobile';
  });
  useEffect(() => {
    const check = () => {
      if (window.innerWidth >= 1200) setBp('desktop');
      else if (window.innerWidth > window.innerHeight) setBp('desktop');
      else if (window.innerWidth >= 700) setBp('tablet');
      else setBp('mobile');
    };
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);
  return bp;
}

function usePhoneSize() {
  const [size, setSize] = useState(() => {
    if (typeof window === 'undefined') return 'md';
    const w = window.innerWidth;
    const h = window.innerHeight;
    if (w <= 375) return 'sm';
    if (w >= 430 || h >= 900) return 'lg';
    return 'md';
  });
  useEffect(() => {
    const check = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      if (w <= 375) setSize('sm');
      else if (w >= 430 || h >= 900) setSize('lg');
      else setSize('md');
    };
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);
  return size;
}

/* ─── Stagger text: each word animates in separately ─── */
function StaggerText({ text = '', style, delay = 0, direction = 1 }) {
  const words = (text || '').split(' ');
  return (
    <span style={{ display: 'inline' }}>
      {words.map((word, i) => (
        <motion.span
          key={`${word}-${i}`}
          initial={{ opacity: 0, y: direction > 0 ? 30 : -20, filter: 'blur(6px)' }}
          animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
          transition={{
            type: 'spring', stiffness: 200, damping: 22,
            delay: delay + i * 0.09,
          }}
          style={{ ...style, display: 'inline-block', whiteSpace: 'pre' }}
        >
          {word}
          {i < words.length - 1 ? ' ' : ''}
        </motion.span>
      ))}
    </span>
  );
}

/* ─── Animated counter: number flips in ─── */
function AnimatedCounter({ current, total, style }) {
  return (
    <div style={{ ...style, display: 'flex', alignItems: 'center', gap: 4 }}>
      <div style={{ position: 'relative', height: '1.2em', width: '1.8em', overflow: 'hidden' }}>
        <AnimatePresence mode="popLayout">
          <motion.span
            key={current}
            initial={{ y: '100%', opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: '-100%', opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            {String(current + 1).padStart(2, '0')}
          </motion.span>
        </AnimatePresence>
      </div>
      <span style={{ opacity: 0.4, margin: '0 2px' }}>/</span>
      <span>{String(total).padStart(2, '0')}</span>
    </div>
  );
}

/* ─── Floating particles: subtle dust motes ─── */
function FloatingParticles({ count = 20, mobile = false }) {
  const particles = useMemo(() => {
    return Array.from({ length: count }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: mobile ? Math.random() * 4 + 2 : Math.random() * 3 + 1,
      duration: Math.random() * 8 + 6,
      delay: Math.random() * 4,
      opacity: mobile ? Math.random() * 0.4 + 0.15 : Math.random() * 0.3 + 0.05,
    }));
  }, [count, mobile]);

  return (
    <div style={{ position: 'absolute', inset: 0, zIndex: 8, pointerEvents: 'none', overflow: 'hidden' }}>
      {particles.map((p) => (
        <motion.div
          key={p.id}
          animate={{
            y: [0, -30, -60, -30, 0],
            x: [0, 10, -5, 15, 0],
            opacity: [p.opacity, p.opacity * 1.5, p.opacity, p.opacity * 0.5, p.opacity],
          }}
          transition={{
            duration: p.duration,
            repeat: Infinity,
            delay: p.delay,
            ease: 'easeInOut',
          }}
          style={{
            position: 'absolute',
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: p.size,
            height: p.size,
            borderRadius: '50%',
            background: 'rgba(17, 17, 17, 0.16)',
            filter: `blur(${p.size > 2 ? 1 : 0}px)`,
          }}
        />
      ))}
    </div>
  );
}

/* ─── Vignette overlay ─── */
function Vignette({ intensity = 0.6 }) {
  return (
    <div style={{
      position: 'absolute', inset: 0, zIndex: 6, pointerEvents: 'none',
      background: `radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,${intensity}) 100%)`,
    }} />
  );
}

export default function Onboarding({ onComplete }) {
  const [current, setCurrent] = useState(0);
  const [direction, setDirection] = useState(1);
  const [isExiting, setIsExiting] = useState(false);
  const touchStart = useRef(null);
  const touchDelta = useRef(0);
  const isAnimating = useRef(false);
  const breakpoint = useBreakpoint();
  const isDesktop = breakpoint === 'desktop';
  const isTablet = breakpoint === 'tablet';
  const phoneSize = usePhoneSize();
  const isSmallDesktop = isDesktop && typeof window !== 'undefined' && window.innerWidth < 1200;
  const isPhoneLandscape = isDesktop && typeof window !== 'undefined' && window.innerHeight < 500;
  const isLargeMonitor = isDesktop && typeof window !== 'undefined' && window.innerWidth >= 1600;
  const isMidTablet = isTablet && typeof window !== 'undefined' && window.innerWidth >= 800;
  const isIPadPro = isTablet && typeof window !== 'undefined' && window.innerWidth >= 1024;
  const isLargeTablet = isTablet && typeof window !== 'undefined' && window.innerWidth >= 1100;

  const userName = useMemo(() => {
    try {
      const client = JSON.parse(localStorage.getItem('panda_public_client'));
      return client?.name?.split(' ')[0] || '';
    } catch { return ''; }
  }, []);

  const isLast = current === slides.length - 1;
  const progress = ((current + 1) / slides.length) * 100;

  const slideTexts = [
    {
      titleLine1: userName ? `Hola, ${userName}` : 'Dientes',
      titleLine2: userName ? '¡Comenzamos!' : 'Sanos',
      subtitle: userName ? 'Reserva, acumula y disfruta.' : 'El estilo que mereces, a un toque.',
    },
    { titleLine1: 'Reserva al', titleLine2: 'Instante', subtitle: 'Agenda tu cita en segundos.' },
    { titleLine1: 'Beneficios', titleLine2: 'Exclusivos', subtitle: 'Puntos, premios y privilegios Club Sonrisa.' },
  ];

  const goTo = (idx) => {
    if (isAnimating.current || idx === current) return;
    setDirection(idx > current ? 1 : -1);
    setCurrent(idx);
  };

  const next = () => {
    if (isLast) {
      setIsExiting(true);
      setTimeout(() => onComplete(), 500);
    } else {
      goTo(current + 1);
    }
  };

  const handleTouchStart = (e) => {
    touchStart.current = e.touches[0].clientX;
    touchDelta.current = 0;
  };

  const handleTouchMove = (e) => {
    if (!touchStart.current) return;
    touchDelta.current = e.touches[0].clientX - touchStart.current;
  };

  const handleTouchEnd = () => {
    if (Math.abs(touchDelta.current) > 50) {
      if (touchDelta.current < 0 && !isLast) {
        next();
      } else if (touchDelta.current > 0 && current > 0) {
        goTo(current - 1);
      }
    }
    touchStart.current = null;
    touchDelta.current = 0;
  };

  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') next();
      else if ((e.key === 'ArrowLeft' || e.key === 'ArrowUp') && current > 0) goTo(current - 1);
      else if (e.key === 'Enter') next();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [current, isLast]);

  const contentSpring = { type: 'spring', stiffness: 280, damping: 28 };
  const slideSpring = { type: 'spring', stiffness: 260, damping: 30 };

  const imageVariants = {
    enter: (dir) => ({ x: dir > 0 ? '30%' : '-30%', opacity: 0.6 }),
    center: { x: 0, opacity: 1 },
    exit: (dir) => ({ x: dir > 0 ? '-30%' : '30%', opacity: 0.6 }),
  };

  /* ─── DESKTOP ─── */
  if (isDesktop) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: isExiting ? 0 : 1, scale: isExiting ? 0.95 : 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: isExiting ? 0.5 : 0.5, ease: [0.76, 0, 0.24, 1] }}
        style={{
          position: 'fixed', inset: 0, zIndex: 200,
          background: '#f4f5f3',
          overflow: 'hidden',
          userSelect: 'none',
          WebkitUserSelect: 'none',
        }}
        onKeyDown={(e) => {
          if (e.key === 'ArrowRight' || e.key === 'ArrowDown') next();
          else if ((e.key === 'ArrowLeft' || e.key === 'ArrowUp') && current > 0) goTo(current - 1);
          else if (e.key === 'Enter') next();
        }}
      >
        {/* Progress bar */}
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, zIndex: 30,
          height: 3, background: 'rgba(255,255,255,0.06)',
        }}>
          <motion.div
            animate={{ width: `${progress}%` }}
            transition={contentSpring}
            style={{
              height: '100%',
              background: 'var(--gold-gradient)',
              borderRadius: '0 2px 2px 0',
              boxShadow: '0 0 12px rgba(17, 17, 17,0.4)',
            }}
          />
        </div>

        {/* Full-screen image */}
        <AnimatePresence initial={false} custom={direction} mode="popLayout">
          <motion.div
            key={current}
            custom={direction}
            variants={imageVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={slideSpring}
            onAnimationStart={() => { isAnimating.current = true; }}
            onAnimationComplete={() => { isAnimating.current = false; }}
            style={{ position: 'absolute', inset: 0 }}
          >
            <motion.div
              draggable={false}
              initial={{ scale: 1.12 }}
              animate={{ scale: 1 }}
              transition={{ duration: 8, ease: 'easeOut' }}
              style={{
                width: '100%', height: '100%',
                background: SLIDE_BG,
              }}
            />
          </motion.div>
        </AnimatePresence>

        {/* Effects layers */}
        <Vignette intensity={0.55} />
        <FloatingParticles count={18} />

        {/* Logo */}
        <div style={{
          position: 'absolute', top: isPhoneLandscape ? 24 : isLargeMonitor ? 70 : isSmallDesktop ? 40 : 56, left: isPhoneLandscape ? 24 : isLargeMonitor ? 100 : isSmallDesktop ? 50 : 80, zIndex: 15,
        }}>
          <motion.img
            src={logo}
            alt="Dientes Sanos"
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...contentSpring, delay: 0.15 }}
            style={{
              height: isPhoneLandscape ? 28 : isLargeMonitor ? 64 : isSmallDesktop ? 42 : 52,
              objectFit: 'contain',
              filter: 'brightness(1.3)',
            }}
          />
        </div>

        {/* Content — bottom left */}
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 10,
          padding: isPhoneLandscape ? '0 30px 32px' : isLargeMonitor ? '0 120px 100px' : isSmallDesktop ? '0 50px 60px' : '0 80px 80px',
          display: 'flex', flexDirection: 'column', alignItems: 'flex-start',
        }}>
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={current}
              initial={{ opacity: 0, x: direction > 0 ? 40 : -40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: direction > 0 ? -40 : 40 }}
              transition={contentSpring}
            >
              {/* Counter */}
              <AnimatedCounter
                current={current}
                total={slides.length}
                style={{
                  fontSize: isPhoneLandscape ? 9 : isLargeMonitor ? 15 : isSmallDesktop ? 11 : 12, fontWeight: 600,
                  color: 'var(--champagne)',
                  fontFamily: 'General Sans, sans-serif',
                  letterSpacing: '0.15em',
                  textTransform: 'uppercase',
                  marginBottom: isPhoneLandscape ? 10 : isLargeMonitor ? 28 : isSmallDesktop ? 16 : 20,
                  opacity: 0.7,
                }}
              />

              {/* Title with stagger */}
              <h1 style={{
                fontSize: isPhoneLandscape ? 36 : isLargeMonitor ? 88 : isSmallDesktop ? 52 : 68,
                fontWeight: 900, color: '#111111',
                fontFamily: 'General Sans, sans-serif',
                lineHeight: 1.0, marginBottom: isPhoneLandscape ? 10 : isLargeMonitor ? 28 : isSmallDesktop ? 16 : 20,
                letterSpacing: '-0.04em',
              }}>
                <StaggerText text={slideTexts[current].titleLine1} direction={direction} />
                <br />
                <StaggerText
                  text={slideTexts[current].titleLine2}
                  direction={direction}
                  delay={0.15}
                  style={{ color: 'var(--champagne)' }}
                />
              </h1>

              {/* Subtitle with stagger */}
              <div style={{
                fontSize: isPhoneLandscape ? 12 : isLargeMonitor ? 22 : isSmallDesktop ? 15 : 17,
                color: '#111111',
                fontFamily: 'General Sans, sans-serif',
                lineHeight: 1.7, fontWeight: 300,
                maxWidth: isPhoneLandscape ? 260 : isLargeMonitor ? 520 : isSmallDesktop ? 340 : 400,
                letterSpacing: '0.01em',
              }}>
                <StaggerText text={slideTexts[current].subtitle} direction={direction} delay={0.3} />
              </div>
            </motion.div>
          </AnimatePresence>

          {/* Buttons */}
          <div style={{ marginTop: isPhoneLandscape ? 20 : isLargeMonitor ? 68 : isSmallDesktop ? 40 : 52, display: 'flex', gap: 12, alignItems: 'center' }}>
            {current > 0 && (
              <motion.button
                onClick={() => goTo(current - 1)}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.96 }}
                style={{
                  padding: isPhoneLandscape ? '9px 14px' : isLargeMonitor ? '18px 28px' : isSmallDesktop ? '13px 20px' : '15px 24px',
                  borderRadius: 999,
                  border: '1px solid rgba(17, 17, 17,0.3)',
                  background: 'transparent',
                  color: 'var(--champagne)',
                  fontSize: isPhoneLandscape ? 11 : isLargeMonitor ? 17 : isSmallDesktop ? 13 : 14, fontWeight: 600,
                  fontFamily: 'General Sans, sans-serif',
                  cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  letterSpacing: '0.05em',
                  textTransform: 'uppercase',
                }}
              >
                <ChevronLeft size={16} strokeWidth={2.5} /> Atrás
              </motion.button>
            )}
            <motion.button
              onClick={next}
              whileHover={{ scale: 1.03, boxShadow: '0 8px 30px rgba(17, 17, 17,0.35)' }}
              whileTap={{ scale: 0.96 }}
              style={{
                width: 'fit-content',
                padding: isPhoneLandscape ? '9px 22px' : isLargeMonitor ? '18px 44px' : isSmallDesktop ? '13px 32px' : '15px 38px',
                borderRadius: 999,
                border: 'none',
                background: 'var(--gold-gradient)',
                color: '#ffffff',
                fontSize: isPhoneLandscape ? 11 : isLargeMonitor ? 18 : isSmallDesktop ? 13 : 14, fontWeight: 800,
                fontFamily: 'General Sans, sans-serif',
                cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                letterSpacing: '0.05em',
                textTransform: 'uppercase',
                position: 'relative', overflow: 'hidden',
              }}
            >
              <div style={{
                position: 'absolute', inset: 0,
                background: 'linear-gradient(110deg, transparent 30%, rgba(255,255,255,0.2) 50%, transparent 70%)',
                transform: 'translateX(-100%)',
                animation: 'onboardingShine 3s ease-in-out infinite',
              }} />
              <span style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', gap: 8 }}>
                {isLast ? (
                  <>Empezar <ArrowRight size={16} strokeWidth={2.5} /></>
                ) : (
                  <>Siguiente <ChevronRight size={16} strokeWidth={2.5} /></>
                )}
              </span>
            </motion.button>
          </div>
        </div>

        <style>{`
          @keyframes onboardingShine {
            0%, 100% { transform: translateX(-100%); }
            40% { transform: translateX(100%); }
          }
        `}</style>
      </motion.div>
    );
  }

  /* ─── MOBILE/TABLET ─── */
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: isExiting ? 0 : 1, scale: isExiting ? 0.95 : 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: isExiting ? 0.5 : 0.5, ease: [0.76, 0, 0.24, 1] }}
      style={{
        position: 'fixed', inset: 0, zIndex: 200,
        background: '#f4f5f3',
        overflow: 'hidden',
        userSelect: 'none',
        WebkitUserSelect: 'none',
      }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Progress bar */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, zIndex: 30,
        height: 3, background: 'rgba(255,255,255,0.06)',
      }}>
        <motion.div
          animate={{ width: `${progress}%` }}
          transition={contentSpring}
          style={{
            height: '100%',
            background: 'var(--gold-gradient)',
            borderRadius: '0 2px 2px 0',
            boxShadow: '0 0 12px rgba(17, 17, 17,0.4)',
          }}
        />
      </div>

      {/* Logo */}
      <div style={{
        position: 'absolute', top: isLargeTablet ? 80 : isMidTablet ? 70 : isTablet ? 70 : phoneSize === 'lg' ? 60 : phoneSize === 'md' ? 50 : 42, left: isLargeTablet ? 50 : isMidTablet ? 44 : isTablet ? 40 : phoneSize === 'lg' ? 28 : 20, right: 0, zIndex: 15,
        display: 'flex', justifyContent: 'flex-start',
      }}>
        <motion.img
          src={logo}
          alt="Dientes Sanos"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...contentSpring, delay: 0.15 }}
          style={{
            height: isLargeTablet ? 72 : isMidTablet ? 56 : isTablet ? 48 : phoneSize === 'lg' ? 40 : phoneSize === 'md' ? 36 : 30,
            objectFit: 'contain',
            filter: 'brightness(1.3)',
          }}
        />
      </div>

      {/* Full Screen Image */}
      <AnimatePresence initial={false} custom={direction} mode="popLayout">
        <motion.div
          key={current}
          custom={direction}
          variants={imageVariants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={slideSpring}
          onAnimationStart={() => { isAnimating.current = true; }}
          onAnimationComplete={() => { isAnimating.current = false; }}
          style={{ position: 'absolute', inset: 0 }}
        >
          <motion.div
            draggable={false}
            initial={{ scale: 1.12 }}
            animate={{ scale: 1 }}
            transition={{ duration: 8, ease: 'easeOut' }}
            style={{
              width: '100%', height: '100%',
              background: SLIDE_BG,
            }}
          />
        </motion.div>
      </AnimatePresence>

      {/* Effects layers */}
      <Vignette intensity={isTablet ? 0.5 : 0.65} />
      <FloatingParticles count={isTablet ? 14 : 12} mobile={true} />

      {/* Content — bottom */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 10,
        paddingBottom: isLargeTablet ? 140 : isMidTablet ? 115 : isTablet ? 100 : phoneSize === 'lg' ? 90 : phoneSize === 'md' ? 75 : 60,
      }}>
        {/* Background gradient for text readability */}
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0, height: '65%',
          background: 'var(--bg-secondary)',
          pointerEvents: 'none',
        }} />

        <div style={{
          position: 'relative', zIndex: 1,
          padding: isLargeTablet ? '0 70px' : isMidTablet ? '0 60px' : isTablet ? '0 50px' : phoneSize === 'lg' ? '0 36px' : phoneSize === 'md' ? '0 28px' : '0 20px',
        }}>
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={current}
              initial={{ opacity: 0, x: direction > 0 ? 30 : -30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: direction > 0 ? -30 : 30 }}
              transition={contentSpring}
              style={{ marginBottom: current === 0 ? (isLargeTablet ? 84 : isMidTablet ? 76 : isTablet ? 70 : phoneSize === 'lg' ? 60 : phoneSize === 'md' ? 50 : 45) : 0 }}
            >
              {/* Counter */}
              <AnimatedCounter
                current={current}
                total={slides.length}
                style={{
                  fontSize: isLargeTablet ? 22 : isMidTablet ? 18 : isTablet ? 16 : phoneSize === 'lg' ? 14 : phoneSize === 'md' ? 13 : 13, fontWeight: 600,
                  color: 'var(--champagne)',
                  fontFamily: 'General Sans, sans-serif',
                  letterSpacing: '0.15em',
                  textTransform: 'uppercase',
                  marginBottom: isLargeTablet ? 34 : isMidTablet ? 30 : isTablet ? 28 : phoneSize === 'lg' ? 22 : phoneSize === 'md' ? 18 : 20,
                  opacity: 0.8,
                }}
              />

              {/* Title with stagger */}
              <h1 style={{
                fontSize: isLargeTablet ? 112 : isIPadPro ? 84 : isMidTablet ? 74 : isTablet ? 62 : phoneSize === 'lg' ? 48 : phoneSize === 'md' ? 42 : 40,
                fontWeight: 900, color: '#111111',
                fontFamily: 'General Sans, sans-serif',
                lineHeight: 1.0, marginBottom: isLargeTablet ? 28 : isMidTablet ? 24 : isTablet ? 22 : phoneSize === 'lg' ? 18 : phoneSize === 'md' ? 16 : 14,
                letterSpacing: '-0.03em',
              }}>
                <StaggerText text={slideTexts[current].titleLine1} direction={direction} />
                <br />
                <StaggerText
                  text={slideTexts[current].titleLine2}
                  direction={direction}
                  delay={0.12}
                  style={{ color: 'var(--champagne)' }}
                />
              </h1>

              {/* Subtitle with stagger */}
              <div style={{
                fontSize: isLargeTablet ? 30 : isMidTablet ? 23 : isTablet ? 20 : phoneSize === 'lg' ? 17 : phoneSize === 'md' ? 16 : 14,
                color: '#64748b',
                fontFamily: 'General Sans, sans-serif',
                lineHeight: 1.6, fontWeight: 300,
                letterSpacing: '0.01em',
                maxWidth: isLargeTablet ? 650 : isMidTablet ? 520 : isTablet ? 480 : phoneSize === 'lg' ? 380 : phoneSize === 'md' ? 340 : 300,
                marginBottom: isLargeTablet ? 60 : isMidTablet ? 48 : isTablet ? 44 : phoneSize === 'lg' ? 36 : phoneSize === 'md' ? 30 : 26,
              }}>
                <StaggerText text={slideTexts[current].subtitle} direction={direction} delay={0.25} />
              </div>
            </motion.div>
          </AnimatePresence>

          {/* Buttons */}
          <div style={{
            display: 'flex', flexDirection: 'column', gap: 10,
            width: '100%', alignItems: 'center',
          }}>
            <motion.button
              onClick={next}
              whileHover={{ scale: 1.03, boxShadow: '0 6px 24px rgba(17, 17, 17,0.35)' }}
              whileTap={{ scale: 0.96 }}
              style={{
                width: '100%',
                padding: isLargeTablet ? '24px 0' : isMidTablet ? '21px 0' : isTablet ? '20px 0' : phoneSize === 'lg' ? '18px 0' : phoneSize === 'md' ? '17px 0' : '16px 0',
                borderRadius: 999,
                border: 'none',
                background: 'var(--gold-gradient)',
                color: '#ffffff',
                fontSize: isLargeTablet ? 26 : isMidTablet ? 21 : isTablet ? 19 : phoneSize === 'lg' ? 17 : phoneSize === 'md' ? 16 : 15, fontWeight: 800,
                fontFamily: 'General Sans, sans-serif',
                cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                letterSpacing: '0.05em',
                textTransform: 'uppercase',
                position: 'relative', overflow: 'hidden',
              }}
            >
              <div style={{
                position: 'absolute', inset: 0,
                background: 'linear-gradient(110deg, transparent 30%, rgba(255,255,255,0.2) 50%, transparent 70%)',
                transform: 'translateX(-100%)',
                animation: 'onboardingShine 3s ease-in-out infinite',
              }} />
              <span style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', gap: 8 }}>
                {isLast ? (
                  <>Empezar <ArrowRight size={16} strokeWidth={2.5} /></>
                ) : (
                  <>Siguiente <ChevronRight size={16} strokeWidth={2.5} /></>
                )}
              </span>
            </motion.button>
            {current > 0 && (
              <motion.button
                onClick={() => goTo(current - 1)}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                whileTap={{ scale: 0.96 }}
                style={{
                  width: '100%',
                  padding: isLargeTablet ? '20px 0' : isMidTablet ? '18px 0' : isTablet ? '16px 0' : phoneSize === 'lg' ? '15px 0' : phoneSize === 'md' ? '14px 0' : '12px 0',
                  borderRadius: 999,
                  border: '1px solid rgba(17, 17, 17,0.3)',
                  background: 'transparent',
                  color: 'var(--champagne)',
                  fontSize: isLargeTablet ? 19 : isMidTablet ? 18 : isTablet ? 17 : phoneSize === 'lg' ? 16 : phoneSize === 'md' ? 15 : 14, fontWeight: 600,
                  fontFamily: 'General Sans, sans-serif',
                  cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  letterSpacing: '0.05em',
                  textTransform: 'uppercase',
                }}
              >
                <ChevronLeft size={16} strokeWidth={2.5} /> Atrás
              </motion.button>
            )}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes onboardingShine {
          0%, 100% { transform: translateX(-100%); }
          40% { transform: translateX(100%); }
        }
      `}</style>
    </motion.div>
  );
}
