import React, { useState, useEffect, useRef } from 'react';
import logo from '../assets/logo_full.png';
import bgImageDesktop from '../assets/client_loading_bg.webp';
import bgImageMobile from '../assets/client_loading_bg_mobile.webp';

const clientTips = [
  "Consejo: Revisa tu Bóveda VIP para descubrir premios ocultos.",
  "Consejo: Acumula puntos en cada visita para subir de nivel.",
  "Consejo: Muestra tu tarjeta VIP digital al pagar en caja.",
  "Consejo: Agenda tus citas con anticipación desde tu perfil."
];

const LOADER_MIN_DURATION_MS = 1500;
const PROGRESS_INTERVAL_MS = 40;
const FADE_OUT_MS = 350;

const ClientLoader = ({ visible, onFinish }) => {
  const [showLoader, setShowLoader] = useState(visible);
  const [progress, setProgress] = useState(0);
  const [tipIndex, setTipIndex] = useState(0);
  const [isMounted, setIsMounted] = useState(false);
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth < 768;
    }
    return false;
  });
  const startTimeRef = useRef(null);

  // Check for mobile screen
  useEffect(() => {
    setIsMounted(true);
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Initialize showLoader and animate progress towards 99%
  useEffect(() => {
    if (visible) {
      setShowLoader(true);
      setProgress(0);
      setTipIndex(Math.floor(Math.random() * clientTips.length)); // Start with a random tip
      startTimeRef.current = Date.now();

      const prevBodyOverflow = document.body.style.overflow;
      const prevHtmlOverflow = document.documentElement.style.overflow;
      document.body.style.overflow = 'hidden';
      document.documentElement.style.overflow = 'hidden';

      const steps = LOADER_MIN_DURATION_MS / PROGRESS_INTERVAL_MS;
      let currentStep = 0;

      const progressInterval = setInterval(() => {
        currentStep++;
        setProgress(() => {
          const target = (currentStep / steps) * 100;
          return Math.min(target, 99);
        });
      }, PROGRESS_INTERVAL_MS);

      const tipInterval = setInterval(() => {
        setTipIndex(i => (i + 1) % clientTips.length);
      }, 4000); // Change tip every 4 seconds

      return () => {
        document.body.style.overflow = prevBodyOverflow || '';
        document.documentElement.style.overflow = prevHtmlOverflow || '';
        clearInterval(progressInterval);
        clearInterval(tipInterval);
      };
    }
  }, [visible]);

  // Handle minimum duration and unmount after fade-out transition
  useEffect(() => {
    if (!visible && showLoader) {
      const elapsed = Date.now() - (startTimeRef.current || 0);
      const remaining = Math.max(0, LOADER_MIN_DURATION_MS - elapsed);

      const finishTimeout = setTimeout(() => {
        setProgress(100);
        setTimeout(() => {
          setShowLoader(false);
          if (onFinish) onFinish();
        }, FADE_OUT_MS);
      }, remaining);

      return () => clearTimeout(finishTimeout);
    }
  }, [visible, showLoader, onFinish]);

  if (!showLoader) return null;

  return (
    <div 
      className="client-loader-container" 
      style={{ 
        opacity: visible ? 1 : 0, 
        pointerEvents: visible ? 'all' : 'none',
        position: 'fixed',
        inset: 0,
        zIndex: 99999,
        transition: `opacity ${visible ? 800 : FADE_OUT_MS}ms cubic-bezier(0.4, 0, 0.2, 1)`,
        display: 'flex',
        flexDirection: isMobile ? 'column' : 'row',
        alignItems: isMobile ? 'center' : 'center',
        justifyContent: isMobile ? 'flex-end' : 'flex-start',
        padding: isMobile ? '0 24px 12vh 24px' : '0 10vw',
        overflow: 'hidden',
        backgroundColor: '#f4f5f3'
      }}
    >
      {/* High-priority image element so the loader never paints the background
          progressively from black to the final photograph. */}
      <img
        src={isMobile ? bgImageMobile : bgImageDesktop}
        alt=""
        aria-hidden="true"
        fetchPriority="high"
        decoding="sync"
        draggable="false"
        style={{
        position: 'absolute',
        inset: -20, // Allow scaling without seeing edges
        width: 'calc(100% + 40px)',
        height: 'calc(100% + 40px)',
        objectFit: 'cover',
        objectPosition: isMobile ? 'center' : 'center right',
        zIndex: 0,
        transform: 'scale(1.05)',
        opacity: 1,
        transition: 'transform 8s ease-out',
        userSelect: 'none',
        pointerEvents: 'none'
      }} />

      {/* Dark gradient overlay for text readability */}
      <div style={{
        position: 'absolute',
        inset: 0,
        background: isMobile 
          ? 'linear-gradient(0deg, rgba(5,5,6,0.95) 0%, rgba(5,5,6,0.7) 45%, rgba(5,5,6,0) 85%)' // Bottom to top for mobile
          : 'linear-gradient(90deg, rgba(5,5,6,0.95) 0%, rgba(5,5,6,0.75) 45%, rgba(5,5,6,0) 80%)', // Left to right for desktop
        zIndex: 1
      }} />

      {/* Content Container */}
      <div style={{ 
        display: 'flex', 
        flexDirection: 'column', 
        alignItems: isMobile ? 'center' : 'flex-start', 
        maxWidth: '560px',
        width: '100%',
        gap: isMobile ? '24px' : '28px', 
        zIndex: 2,
        transform: (visible && isMounted) ? 'translateY(0)' : 'translateY(20px)',
        opacity: (visible && isMounted) ? 1 : 0,
        transition: 'transform 1s cubic-bezier(0.2, 0.8, 0.2, 1) 0.3s, opacity 1s cubic-bezier(0.2, 0.8, 0.2, 1) 0.3s'
      }}>
        
        {/* Logo */}
        <img 
          src={logo} 
          alt="Centro Odontológico Dientes Sanos" 
          style={{ 
            height: isMobile ? '100px' : '120px',
            objectFit: 'contain',
            marginBottom: isMobile ? '0' : '16px',
            filter: 'brightness(0) invert(1)'
          }} 
        />

        {/* Title */}
        <div style={{
          fontSize: isMobile ? '26px' : 'clamp(32px, 4vw, 48px)',
          fontWeight: '300',
          color: '#ffffff',
          lineHeight: '1.2',
          letterSpacing: '-0.5px',
          textAlign: isMobile ? 'center' : 'left'
        }}>
          Tu espacio está casi listo
        </div>

        {/* Subtitle */}
        <div style={{
          fontSize: isMobile ? '15px' : '16px',
          fontWeight: '400',
          color: 'rgba(255,255,255,0.5)',
          lineHeight: '1.4',
          textAlign: isMobile ? 'center' : 'left',
          marginTop: isMobile ? '-12px' : '-16px'
        }}>
          Estamos preparando tu acceso a Dientes Sanos.
        </div>
        
        <div style={{ width: '100%', marginTop: isMobile ? '12px' : '24px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {/* Progress Bar Container with Percentage */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', width: '100%' }}>
            
            <div style={{
              flex: 1,
              height: '8px',
              backgroundColor: 'rgba(255,255,255,0.1)',
              border: '1px solid rgba(255,255,255,0.2)',
              borderRadius: '999px',
              overflow: 'hidden',
              position: 'relative'
            }}>
              {/* White Progress Fill */}
              <div style={{
                height: '100%',
                backgroundColor: '#ffffff',
                width: `${progress}%`,
                transition: 'width 0.1s cubic-bezier(0.4, 0, 0.2, 1)',
                borderRadius: '999px'
              }} />
            </div>
            
            {/* Percentage Text */}
            <div style={{ 
              fontSize: isMobile ? '16px' : '18px', 
              color: 'rgba(255,255,255,0.9)', 
              fontWeight: '500',
              fontVariantNumeric: 'tabular-nums',
              width: '45px'
            }}>
              {Math.round(progress)}%
            </div>
          </div>
        </div>

        {/* Tips Section */}
        <div style={{ 
          marginTop: isMobile ? '16px' : '20px', 
          display: 'flex', 
          alignItems: 'center', 
          gap: '16px', 
          opacity: 0.7 
        }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'white', flexShrink: 0 }}>
            <circle cx="6" cy="6" r="3"></circle>
            <circle cx="6" cy="18" r="3"></circle>
            <line x1="20" y1="4" x2="8.12" y2="15.88"></line>
            <line x1="14.47" y1="14.48" x2="20" y2="20"></line>
            <line x1="8.12" y1="8.12" x2="12" y2="12"></line>
          </svg>
          <div style={{ width: '1px', height: '20px', backgroundColor: 'rgba(255,255,255,0.2)', flexShrink: 0 }} />
          <div style={{ 
            fontSize: isMobile ? '12px' : '14px', 
            color: 'white', 
            lineHeight: '1.4', 
            fontWeight: '400', 
            textAlign: 'left',
            transition: 'opacity 0.3s ease' 
          }}>
            {clientTips[tipIndex]}
          </div>
        </div>
      </div>


    </div>
  );
};

export default ClientLoader;
