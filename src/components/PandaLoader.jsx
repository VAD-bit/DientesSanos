import React, { useState, useEffect, useRef } from 'react';
import logo from '../assets/panda_logo_nobg.png';
import bgImageDesktop from '../assets/admin_loading_bg.webp';
import bgImageMobile from '../assets/admin_loading_bg_mobile.webp';

const loadingTexts = [
  "Cargando tu experiencia...",
  "Preparando tu consultorio...",
  "Calibrando la unidad dental...",
  "Preparando la profilaxis perfecta...",
  "Calculando la sonrisa ideal...",
  "Encendiendo las luces de la estación..."
];

const pandaTips = [
  "Consejo: Actualiza tu catálogo.",
  "Consejo: Revisa los cumpleaños de hoy.",
  "Consejo: Prepara la sala para el próximo paciente.",
  "Consejo: Confirma las citas del día.",
  "Consejo: Mantén ordenada tu estación de trabajo."
];

const LOADER_MIN_DURATION_MS = 1200;
const PROGRESS_INTERVAL_MS = 40;
const FADE_OUT_MS = 350;

const PandaLoader = ({ visible, onFinish }) => {
  const [showLoader, setShowLoader] = useState(visible);
  const [isExiting, setIsExiting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [textIndex, setTextIndex] = useState(0);
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
      setIsExiting(false);
      setProgress(0);
      setTextIndex(0);
      setTipIndex(Math.floor(Math.random() * pandaTips.length)); // Start with a random tip
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

      const textInterval = setInterval(() => {
        setTextIndex(i => (i + 1) % loadingTexts.length);
      }, 1400);

      const tipInterval = setInterval(() => {
        setTipIndex(i => (i + 1) % pandaTips.length);
      }, 3000); // Change tip every 3 seconds

      return () => {
        document.body.style.overflow = prevBodyOverflow || '';
        document.documentElement.style.overflow = prevHtmlOverflow || '';
        clearInterval(progressInterval);
        clearInterval(textInterval);
        clearInterval(tipInterval);
      };
    }
  }, [visible]);

  // Handle minimum duration and unmount after fade-out transition
  useEffect(() => {
    if (!visible && showLoader) {
      const elapsed = Date.now() - (startTimeRef.current || 0);
      const remaining = Math.max(0, LOADER_MIN_DURATION_MS - elapsed);
      let fadeTimeout;

      const finishLoading = () => {
        setProgress(100);
        setIsExiting(true);
        fadeTimeout = setTimeout(() => {
          setShowLoader(false);
          if (onFinish) onFinish();
        }, FADE_OUT_MS);
      };

      let remainingTimeout;
      if (remaining > 0) {
        remainingTimeout = setTimeout(finishLoading, remaining);
      } else {
        finishLoading();
      }

      return () => {
        clearTimeout(remainingTimeout);
        clearTimeout(fadeTimeout);
      };
    }
  }, [visible, showLoader]);

  if (!showLoader) return null;

  return (
    <div 
      className="panda-loader-container" 
      style={{ 
        opacity: isExiting ? 0 : 1, 
        pointerEvents: isExiting ? 'none' : 'all',
        position: 'fixed',
        inset: 0,
        zIndex: 99999,
        transition: `opacity ${isExiting ? FADE_OUT_MS : 800}ms cubic-bezier(0.4, 0, 0.2, 1)`,
        display: 'flex',
        flexDirection: isMobile ? 'column' : 'row',
        alignItems: isMobile ? 'center' : 'center',
        justifyContent: isMobile ? 'flex-end' : 'flex-start',
        padding: isMobile ? '0 20px 10vh 20px' : '0 clamp(40px, 10vw, 160px)',
        overflow: 'hidden',
        backgroundColor: '#f4f5f3'
      }}
    >
      {/* High-priority image element: unlike a CSS background, the browser can
          discover and decode it immediately without a dark-to-photo fade. */}
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
        objectPosition: isMobile ? 'center top' : 'right center',
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
          ? 'linear-gradient(0deg, rgba(5,5,6,0.9) 0%, rgba(5,5,6,0.6) 40%, rgba(5,5,6,0) 80%)' // Bottom to top for mobile, reduced opacity
          : 'linear-gradient(90deg, rgba(5,5,6,0.85) 0%, rgba(5,5,6,0.4) 45%, rgba(5,5,6,0) 80%)', // Left to right for desktop, reduced opacity
        zIndex: 1
      }} />

      {/* Content Container */}
      <div style={{ 
        display: 'flex', 
        flexDirection: 'column', 
        alignItems: isMobile ? 'center' : 'flex-start', 
        maxWidth: '500px',
        width: '100%',
        gap: isMobile ? '20px' : '24px', 
        zIndex: 2,
        transform: (!isExiting && isMounted) ? 'translateY(0)' : 'translateY(20px)',
        opacity: (!isExiting && isMounted) ? 1 : 0,
        transition: 'transform 1s cubic-bezier(0.2, 0.8, 0.2, 1) 0.3s, opacity 1s cubic-bezier(0.2, 0.8, 0.2, 1) 0.3s'
      }}>
        
        {/* Logo */}
        <img 
          src={logo} 
          alt="Dientes Sanos" 
          style={{ 
            height: isMobile ? '90px' : '110px',
            objectFit: 'contain',
            marginBottom: isMobile ? '0' : '16px',
            filter: 'brightness(0) invert(1)'
          }} 
        />

        {/* Title */}
        <div style={{
          fontSize: isMobile ? '28px' : 'clamp(28px, 4vw, 42px)',
          fontWeight: '300',
          color: '#ffffff',
          lineHeight: '1.2',
          letterSpacing: '-0.5px',
          textAlign: isMobile ? 'center' : 'left'
        }}>
          Entrando a<br/>
          Dientes Sanos
        </div>
        
        <div style={{ width: '100%', marginTop: isMobile ? '12px' : '32px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {/* Progress Bar Container with Percentage */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', width: '100%' }}>
            
            <div style={{
              flex: 1,
              height: '6px',
              backgroundColor: 'rgba(255,255,255,0.1)',
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
              fontSize: isMobile ? '18px' : '16px', 
              color: 'rgba(255,255,255,0.8)', 
              fontWeight: '400',
              fontVariantNumeric: 'tabular-nums',
              width: '45px'
            }}>
              {Math.round(progress)}%
            </div>
          </div>

          {/* Dynamic Text */}
          <div style={{ 
            fontSize: isMobile ? '15px' : '14px', 
            color: 'rgba(255,255,255,0.5)', 
            fontWeight: '400', 
            letterSpacing: '0.5px',
            minHeight: '20px',
            transition: 'opacity 0.3s ease',
            whiteSpace: 'nowrap',
            textAlign: isMobile ? 'center' : 'left'
          }}>
            {loadingTexts[textIndex]}
          </div>
        </div>

        {/* Mobile Tips Section */}
        {isMobile && (
          <div style={{ 
            marginTop: '30px', 
            display: 'flex', 
            alignItems: 'center', 
            gap: '16px', 
            opacity: 0.6 
          }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'white', flexShrink: 0 }}>
              <circle cx="6" cy="6" r="3"></circle>
              <circle cx="6" cy="18" r="3"></circle>
              <line x1="20" y1="4" x2="8.12" y2="15.88"></line>
              <line x1="14.47" y1="14.48" x2="20" y2="20"></line>
              <line x1="8.12" y1="8.12" x2="12" y2="12"></line>
            </svg>
            <div style={{ width: '1px', height: '24px', backgroundColor: 'rgba(255,255,255,0.2)', flexShrink: 0 }} />
            <div style={{ 
              fontSize: '13px', 
              color: 'white', 
              lineHeight: '1.4', 
              fontWeight: '400', 
              textAlign: 'left',
              transition: 'opacity 0.3s ease',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              width: '100%'
            }}>
              {pandaTips[tipIndex]}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PandaLoader;
