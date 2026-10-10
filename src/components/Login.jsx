import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  Mail, Lock, Loader2, Rocket, Eye, EyeOff,
  Calendar, Users, BarChart2, DollarSign, ShieldCheck,
  Sliders, Copy, Check, X, Monitor, Tablet as TabletIcon, Phone
} from 'lucide-react';
import logo from '../assets/logo.png';
import PasskeyLoginButton from './PasskeyLoginButton';

const features = [
  { icon: Calendar, title: 'Citas', desc: 'Gestiona tus reservas\ncon facilidad' },
  { icon: Users, title: 'Clientes', desc: 'Crea relaciones\nmás fuertes' },
  { icon: DollarSign, title: 'Finanzas', desc: 'Controla tus ingresos\nen tiempo real' },
  { icon: BarChart2, title: 'Reportes', desc: 'Monitorea tu rendimiento\ny crecimiento' }
];

// Configuración dinámica de textos de marca para personalizar por cliente fácilmente
const BRAND_CONFIG = {
  headingFirstPart: 'EL CONTROL ABSOLUTO',
  headingSecondPart: 'ESTUDIO',
  description: 'Optimiza tu tiempo, simplifica tu administración y ofrece una experiencia inolvidable a cada cliente.'
};

export default function Login() {
  const { login, finishPasskeyLogin, loading } = useAuth();
  const [email, setEmail]             = useState('');
  const [password, setPassword]       = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError]             = useState('');
  const [isExiting, setIsExiting]     = useState(false);
  const [tilt, setTilt]               = useState({ x: 0, y: 0 });

  const handleMouseMove = (e) => {
    const card = e.currentTarget;
    const box = card.getBoundingClientRect();
    const x = e.clientX - box.left - box.width / 2;
    const y = e.clientY - box.top - box.height / 2;
    const rotateX = -(y / (box.height / 2)) * 6; // Máximo 6 grados de rotación
    const rotateY = (x / (box.width / 2)) * 6;
    setTilt({ x: rotateX, y: rotateY });
  };

  const handleMouseLeave = () => {
    setTilt({ x: 0, y: 0 });
  };
  
  // ── ESTADOS DE CALIBRACIÓN DE FONDO INTERACTIVOS (CON PERSISTENCIA LOCALSTORAGE) ──
  
  // Helper para obtener valores numéricos de localStorage
  const getLocalNum = (key, fallback) => {
    const val = localStorage.getItem(key);
    return val !== null ? Number(val) : fallback;
  };

  // Helper para obtener strings de localStorage
  const getLocalStr = (key, fallback) => {
    const val = localStorage.getItem(key);
    return val !== null ? val : fallback;
  };

  // 1. Escritorio / Laptop
  const [bgZoomMode, setBgZoomMode] = useState(() => getLocalStr('bgZoomMode', 'cover'));
  const [bgZoom, setBgZoom]         = useState(() => getLocalNum('bgZoom', 122));
  const [bgX, setBgX]               = useState(() => getLocalNum('bgX', 56));
  const [bgY, setBgY]               = useState(() => getLocalNum('bgY', 100));
  const [bgDarkness, setBgDarkness] = useState(() => getLocalNum('bgDarkness', 51));
  const [photoWidth, setPhotoWidth] = useState(() => getLocalNum('photoWidth', 59));
  const [gradientStart, setGradientStart] = useState(() => getLocalNum('gradientStart', 49));

  // 2. Tablet (iPad)
  const [tabBgZoomMode, setTabBgZoomMode] = useState(() => getLocalStr('tabBgZoomMode', 'cover'));
  const [tabBgZoom, setTabBgZoom]         = useState(() => getLocalNum('tabBgZoom', 100));
  const [tabBgX, setTabBgX]               = useState(() => getLocalNum('tabBgX', 64));
  const [tabBgY, setTabBgY]               = useState(() => getLocalNum('tabBgY', 97));

  // 3. Teléfono / Móvil (Inicializado con los valores calibrados por el usuario en el screenshot)
  const [mobBgZoomMode, setMobBgZoomMode] = useState(() => getLocalStr('mobBgZoomMode', 'manual')); 
  const [mobBgZoom, setMobBgZoom]         = useState(104);
  const [mobBgX, setMobBgX]               = useState(0);
  const [mobBgY, setMobBgY]               = useState(100);
  const [mobileSplit, setMobileSplit]     = useState(34);
  const [rememberMe, setRememberMe]       = useState(false);

  // 4. Espaciados e Interlineados de Pantalla Móvil (Actualizado con screenshot)
  const [mobLogoSize, setMobLogoSize]         = useState(() => getLocalNum('mobLogoSize', 118));
  const [mobLogoGap, setMobLogoGap]           = useState(() => getLocalNum('mobLogoGap', 26));
  const [mobTitleGap, setMobTitleGap]         = useState(() => getLocalNum('mobTitleGap', 7));
  const [mobHeaderPadding, setMobHeaderPadding] = useState(() => getLocalNum('mobHeaderPadding', 28));
  const [mobCardPadding, setMobCardPadding]   = useState(() => getLocalNum('mobCardPadding', 33));
  const [mobFieldsGap, setMobFieldsGap]       = useState(() => getLocalNum('mobFieldsGap', 27));
  const [mobBottomGap, setMobBottomGap]       = useState(() => getLocalNum('mobBottomGap', 25));
  const [mobBottomPaddingTop, setMobBottomPaddingTop] = useState(() => getLocalNum('mobBottomPaddingTop', 20));

  // Nuevas separaciones específicas debajo de la tarjeta
  const [mobCardFeaturesGap, setMobCardFeaturesGap]   = useState(() => getLocalNum('mobCardFeaturesGap', 22));
  const [mobFeaturesSecureGap, setMobFeaturesSecureGap] = useState(() => getLocalNum('mobFeaturesSecureGap', 25));

  // Guardar en localStorage cuando cambie cualquier valor
  useEffect(() => {
    localStorage.setItem('bgZoomMode', bgZoomMode);
    localStorage.setItem('bgZoom', bgZoom);
    localStorage.setItem('bgX', bgX);
    localStorage.setItem('bgY', bgY);
    localStorage.setItem('bgDarkness', bgDarkness);
    localStorage.setItem('photoWidth', photoWidth);
    localStorage.setItem('gradientStart', gradientStart);

    localStorage.setItem('tabBgZoomMode', tabBgZoomMode);
    localStorage.setItem('tabBgZoom', tabBgZoom);
    localStorage.setItem('tabBgX', tabBgX);
    localStorage.setItem('tabBgY', tabBgY);

    localStorage.setItem('mobBgZoomMode', mobBgZoomMode);
    localStorage.setItem('mobBgZoom', mobBgZoom);
    localStorage.setItem('mobBgX', mobBgX);
    localStorage.setItem('mobBgY', mobBgY);
    localStorage.setItem('mobileSplit', mobileSplit);

    localStorage.setItem('mobLogoSize', mobLogoSize);
    localStorage.setItem('mobLogoGap', mobLogoGap);
    localStorage.setItem('mobTitleGap', mobTitleGap);
    localStorage.setItem('mobHeaderPadding', mobHeaderPadding);
    localStorage.setItem('mobCardPadding', mobCardPadding);
    localStorage.setItem('mobFieldsGap', mobFieldsGap);
    localStorage.setItem('mobBottomGap', mobBottomGap);
    localStorage.setItem('mobBottomPaddingTop', mobBottomPaddingTop);

    localStorage.setItem('mobCardFeaturesGap', mobCardFeaturesGap);
    localStorage.setItem('mobFeaturesSecureGap', mobFeaturesSecureGap);
  }, [
    bgZoomMode, bgZoom, bgX, bgY, bgDarkness, photoWidth, gradientStart,
    tabBgZoomMode, tabBgZoom, tabBgX, tabBgY,
    mobBgZoomMode, mobBgZoom, mobBgX, mobBgY, mobileSplit,
    mobLogoSize, mobLogoGap, mobTitleGap, mobHeaderPadding,
    mobCardPadding, mobFieldsGap, mobBottomGap, mobBottomPaddingTop,
    mobCardFeaturesGap, mobFeaturesSecureGap
  ]);

  // Panel de control flotante
  const [showCalibrator, setShowCalibrator] = useState(false);
  const [copied, setCopied]                 = useState(false);
  const [windowWidth, setWindowWidth]       = useState(window.innerWidth);

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const getActiveDevice = () => {
    const isPortrait = window.innerHeight > window.innerWidth;
    if (windowWidth <= 768 || isPortrait) return 'mobile';
    if (windowWidth <= 1024) return 'tablet';
    return 'desktop';
  };

  const [isMobileDevice, setIsMobileDevice] = useState(false);
  useEffect(() => {
    const checkMobile = () => {
      const isPortrait = window.innerHeight > window.innerWidth;
      setIsMobileDevice(window.innerWidth <= 768 || isPortrait);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const activeDevice = getActiveDevice();

  const handleCopyConfig = () => {
    const configCode = `// Reemplaza estas variables al inicio de Login.jsx para fijar tu diseño:
const bgZoom = ${bgZoomMode === 'cover' ? "'cover'" : bgZoom};
const bgX = ${bgX};
const bgY = ${bgY};
const bgDarkness = ${bgDarkness};
const photoWidth = ${photoWidth};
const gradientStart = ${gradientStart};

const tabBgZoom = ${tabBgZoomMode === 'cover' ? "'cover'" : tabBgZoom};
const tabBgX = ${tabBgX};
const tabBgY = ${tabBgY};

const mobBgZoom = ${mobBgZoomMode === 'cover' ? "'cover'" : mobBgZoom};
const mobBgX = ${mobBgX};
const mobBgY = ${mobBgY};
const mobileSplit = ${mobileSplit};

const mobLogoSize = ${mobLogoSize};
const mobLogoGap = ${mobLogoGap};
const mobTitleGap = ${mobTitleGap};
const mobHeaderPadding = ${mobHeaderPadding};
const mobCardPadding = ${mobCardPadding};
const mobFieldsGap = ${mobFieldsGap};
const mobBottomGap = ${mobBottomGap};
const mobBottomPaddingTop = ${mobBottomPaddingTop};
const mobCardFeaturesGap = ${mobCardFeaturesGap};
const mobFeaturesSecureGap = ${mobFeaturesSecureGap};`;

    navigator.clipboard.writeText(configCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsExiting(true); // Activa la animación de salida
    const result = await login(email.trim(), password);
    if (!result.success) {
      setIsExiting(false); // Revierte la animación de salida si falla
      setError(result.message);
    }
  };

  // Atajo solo para desarrollo: doble clic en el logo entra directo con la cuenta de administrador
  const handleLogoDoubleClick = async () => {
    if (!import.meta.env.DEV) return;
    const devEmail = 'administrador@dientessanos.com';
    const devPassword = 'DientesSanos2026!';
    setEmail(devEmail);
    setPassword(devPassword);
    setError('');
    setIsExiting(true);
    const result = await login(devEmail, devPassword);
    if (!result.success) {
      setIsExiting(false);
      setError(result.message);
    }
  };

  return (
    <div className="l-root">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        
        .whatsapp-float-btn { display: none !important; }
        .desktop-only-label {
          display: block;
        }
        .mobile-only-label {
          display: none;
        }
        .l-card-mobile-header {
          display: none;
        }
        .mob-only-copyright {
          display: none;
        }

        .l-main-section {
          display: flex;
          width: 100%;
          justify-content: space-between;
          align-items: center;
          flex: 1;
          gap: 40px;
          margin-bottom: 20px;
        }
        @media (max-width: 768px), (orientation: portrait) {
          .l-main-section {
            flex-direction: column !important;
            justify-content: center !important;
            gap: 20px !important;
            margin-bottom: 0 !important;
            width: 100% !important;
          }
        }
/* ── ROOT ── */
        .l-root {
          position: relative;
          width: 100vw;
          height: 100vh;
          height: 100dvh;
          overflow: hidden;
          font-family: 'Inter', sans-serif;
          display: flex;
          align-items: center;
          justify-content: center;
          background-color: #f4f5f3;
          padding: 24px;
          padding-top: calc(24px + env(safe-area-inset-top, 0px));
        }

        /* ── CONTENEDOR CON BORDE DORADO (MARCO) ── */
        .l-frame {
          position: relative;
          width: 100%;
          height: 100%;
          border-radius: 28px;
          border: 1.5px solid var(--border-color);
          overflow: hidden;
          display: flex;
          align-items: stretch;
          box-shadow: 0 24px 60px rgba(0, 0, 0, 0.8);
        }

        /* ── BACKGROUND LAYERS ── */
        .l-bg {
          position: absolute;
          top: 0;
          bottom: 0;
          left: 0;
          transition: opacity 0.4s;
          filter: brightness(0.70) contrast(1.05); /* Hace la foto y sus alrededores más oscuros y cinematográficos */
          background-repeat: no-repeat;
        }
        .l-bg-desktop {
          background: linear-gradient(135deg,#f7f4ee 0%,#efe6d5 50%,#e8d4b0 100%);
          width: var(--photo-width, 53%);
          opacity: 1;
          background-size: var(--bg-zoom, cover);
          background-position: var(--bg-x, 50%) var(--bg-y, 50%);
        }
        .l-bg-mobile-container {
          position: absolute;
          top: calc(-1 * env(safe-area-inset-top, 0px));
          left: 0;
          width: 100%;
          height: calc(var(--mobile-split, 45%) + env(safe-area-inset-top, 0px));
          overflow: hidden;
          opacity: 0;
          pointer-events: none;
          z-index: 1;
          -webkit-mask-image: linear-gradient(to bottom, rgba(0, 0, 0, 1) 0%, rgba(0, 0, 0, 0.95) 50%, rgba(0, 0, 0, 0) 100%);
          mask-image: linear-gradient(to bottom, rgba(0, 0, 0, 1) 0%, rgba(0, 0, 0, 0.95) 50%, rgba(0, 0, 0, 0) 100%);
        }
        .l-bg-mobile-img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          filter: brightness(0.70) contrast(1.05);
          transform: scale(var(--mob-bg-zoom-factor, 1));
          transform-origin: var(--mob-bg-x, 50%) var(--mob-bg-y, 50%);
        }
        /* dark overlay - oscurece el lado izquierdo y se difumina a negro puro hacia el lado derecho */
        .l-overlay {
          position: absolute;
          inset: 0;
          background: linear-gradient(
            to right,
            var(--bg-darkness-start, rgba(0,0,0,0.15)) 0%,
            var(--bg-darkness-start, rgba(0,0,0,0.15)) var(--gradient-start, 45%),
            #0a0a0c var(--photo-width, 53%),
            #0a0a0c 100%
          );
        }

        /* ── LAYOUT ── */
        .l-inner {
          position: relative;
          z-index: 2;
          width: 100%;
          max-width: 1380px;
          margin: 0 auto;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          height: 100%;
          max-height: 100%;
          padding: clamp(14px, 2.8vh, 30px) 40px;
          box-sizing: border-box;
          overflow: visible;
        }

        /* ── LEFT SIDE ── */
        .l-left {
          flex: 1;
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: flex-start; /* Alineado a la izquierda */
          height: 100%;
          max-width: 600px;
          gap: clamp(12px, 4vh, 36px);
          padding-left: 0; /* Let inner container handle the outer padding */
          min-height: 0;
        }
        .l-tagline {
          display: flex;
          flex-direction: column;
          align-items: flex-start; /* Elementos alineados a la izquierda */
          justify-content: center;
          width: 100%;
          max-width: 580px;
        }
        .l-logo {
          width: clamp(120px, min(14vw, 20vh), 195px); /* Más imponente e identificable, comprime en pantallas bajas */
          margin: 0 0 clamp(10px, 3vh, 32px) -28px; /* Alinear logo a la izquierda ajustado al tamaño */
          display: block;
          filter: drop-shadow(0 8px 16px rgba(0,0,0,0.95)) drop-shadow(0 2px 4px rgba(0,0,0,0.85));
        }
        .l-heading {
          font-size: clamp(22px, min(3.2vw, 5.5vh), 42px);
          font-weight: 800;
          line-height: 1.15;
          color: #fff;
          letter-spacing: -0.5px;
          margin-bottom: clamp(8px, 2.5vh, 20px);
          text-align: left; /* Título alineado a la izquierda */
          width: 100%;
        }
        .l-heading span { color: inherit; }
        .l-desc {
          font-size: clamp(11px, 1.8vh, 13.5px);
          color: rgba(255, 255, 255, 0.85); /* Mucho más contraste y luminosidad */
          font-weight: 500; /* Añade cuerpo al texto */
          line-height: 1.6;
          max-width: 440px; /* Ancho exacto e ideal */
          text-align: left; /* Subtítulo alineado a la izquierda */
          margin-left: 0; /* Resetear margen */
          text-shadow: 0 2px 8px rgba(0, 0, 0, 0.8); /* Sombra para despegarlo del fondo */
        }
        .l-features {
          display: flex;
          align-items: stretch;
          margin-top: 15px;
          width: 100%;
          max-width: 500px;
        }
        .l-feat {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: flex-start; /* Alineado a la izquierda */
          gap: 12px;
          border-right: 1px solid rgba(255, 255, 255, 0.08); /* Línea divisoria fina entre items */
          padding: 0 16px 0 0; /* Borde y espaciado alineado */
        }
        .l-feat:last-child {
          border-right: none; /* Quitar borde al último elemento */
        }
        .l-feat-icon {
          display: flex;
          align-items: center;
          justify-content: flex-start;
          color: var(--champagne);
          filter: drop-shadow(0 2px 6px rgba(0, 0, 0, 0.85)); /* Añade sombra al icono dorado */
        }
        .l-feat-label {
          font-size: 10.5px; /* Ligeramente más grande */
          font-weight: 800;
          text-align: left; /* Alineado a la izquierda */
          color: rgba(255, 255, 255, 0.9); /* Más contraste e iluminación */
          letter-spacing: 0.6px;
          line-height: 1.5;
          white-space: pre-line;
          text-shadow: 0 2px 6px rgba(0, 0, 0, 0.95); /* Sombra para despegar el texto del mármol */
        }

        /* ── RIGHT CARD ── */
        .l-card {
          flex-shrink: 1;
          min-height: 0;
          width: 420px;
          background: linear-gradient(180deg, var(--bg-secondary) 0%, var(--bg-primary) 100%);
          border: 1px solid var(--border-color);
          border-radius: 24px;
          padding: clamp(28px, 5.5vh, 52px) 40px clamp(24px, 4.5vh, 44px) 40px;
          box-shadow: 0 50px 100px rgba(0, 0, 0, 0.95), inset 0 1px 0px rgba(255,255,255,0.10);
          display: flex;
          flex-direction: column;
          gap: clamp(10px, 1.8vh, 16px);
        }
        .l-card-title {
          font-size: clamp(20px, 2.8vh, 26px);
          font-weight: 800;
          color: #fff;
          text-align: center;
          margin-top: clamp(2px, 0.8vh, 6px);
          margin-bottom: clamp(2px, 0.8vh, 6px);
          letter-spacing: 0.5px;
        }
        .l-card-title span { color: var(--champagne); text-shadow: 0 0 10px rgba(17, 17, 17, 0.35); }
        .l-card-sub {
          font-size: clamp(13px, 1.8vh, 15px);
          color: rgba(255,255,255,0.45);
          text-align: center;
          margin-bottom: clamp(14px, 3.2vh, 28px);
        }

        /* ── INPUTS ── */
        .l-field {
          position: relative;
          margin-bottom: 24px; /* Mayor espacio vertical */
        }
        .l-field-label {
          position: absolute;
          top: 10px;
          left: 54px;
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 1px;
          color: #8c8c8c;
          text-transform: uppercase;
          pointer-events: none;
          z-index: 1;
        }
        .l-field-icon {
          position: absolute;
          left: 18px;
          top: 50%;
          transform: translateY(-50%);
          color: #8c8c8c; /* Dorado a juego con la etiqueta */
          display: flex;
          z-index: 1;
          opacity: 0.8;
        }
        .l-input {
          width: 100%;
          padding: 28px 46px 12px 54px;
          background: #1a1a1e; /* Negro/gris mate plano de la referencia */
          border: 1px solid #2e2e35; /* Borde gris sutil */
          border-radius: 12px; /* Redondeado igual al botón */
          color: #fff;
          font-size: 14px;
          font-family: 'Inter', sans-serif;
          outline: none;
          color-scheme: dark; /* Forzar al navegador a renderizar esquinas/sombras en modo oscuro */
          transition: border-color 0.25s ease, box-shadow 0.25s ease;
        }
        .l-input::placeholder { color: rgba(255,255,255,0.22); }
        
        /* Evitar que el autocompletado de Chrome pinte los inputs de blanco/azul */
        .l-input:-webkit-autofill,
        .l-input:-webkit-autofill:hover, 
        .l-input:-webkit-autofill:focus, 
        .l-input:-webkit-autofill:active {
          -webkit-box-shadow: 0 0 0 1000px #1a1a1e inset !important;
          -webkit-text-fill-color: #ffffff !important;
          transition: background-color 5000s ease-in-out 0s;
        }

        .l-input:focus {
          border-color: rgba(255, 255, 255,0.8); /* Iluminar borde dorado */
          box-shadow: 0 0 0 3px rgba(255, 255, 255,0.15);
        }
        .l-eye-btn {
          position: absolute;
          right: 18px;
          top: 50%;
          transform: translateY(-50%);
          background: none;
          border: none;
          color: #ffffff; /* Dorado en la referencia */
          cursor: pointer;
          display: flex;
          align-items: center;
          padding: 0;
          z-index: 1;
        }

        .l-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 24px;
          font-size: 13px;
          width: 100%;
        }
        .l-remember {
          display: flex;
          align-items: center;
          gap: 8px;
          color: rgba(255, 255, 255, 0.6);
          cursor: pointer;
          font-weight: 500;
        }
        .l-remember input {
          accent-color: #ffffff;
          width: 16px;
          height: 16px;
          cursor: pointer;
        }
        .l-forgot {
          color: #ffffff;
          text-decoration: none;
          font-weight: 600;
          transition: color 0.2s;
        }
        .l-forgot:hover {
          color: #b5b5b5;
          text-decoration: underline;
        }

        /* ── ERROR ── */
        .l-error {
          color: #ff453a;
          font-size: 13px;
          font-weight: 600;
          background: rgba(255,69,58,0.08);
          border: 1px solid rgba(255,69,58,0.20);
          border-radius: 10px;
          padding: 10px 14px;
          margin-bottom: 16px;
        }

        /* ── BUTTON ── */
        .l-btn {
          width: 100%;
          height: 56px;
          background: var(--gold-gradient);
          border: none;
          border-radius: 12px; /* Redondeado exacto de 12px */
          color: #000; /* Texto negro */
          font-size: 14.5px;
          font-weight: 800; /* Negrita */
          letter-spacing: 1.5px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          transition: transform 0.2s, box-shadow 0.2s;
          box-shadow: 0 8px 20px rgba(255, 255, 255,0.15); /* Resplandor dorado suave */
        }
        .l-btn:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 10px 24px rgba(255, 255, 255,0.25);
        }
        .l-btn:disabled { opacity: 0.6; cursor: not-allowed; }

        /* ── SECURITY NOTE ── */
        .l-secure {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          margin-top: 24px;
          font-size: 12px;
          color: rgba(255,255,255,0.40);
        }
        .l-secure span { color: #ffffff; font-weight: 600; }

        /* ── SPIN ── */
        @keyframes l-spin { to { transform: rotate(360deg); } }
        .l-spin { animation: l-spin 1s linear infinite; }

        /* ── PREMIUM ANIMATIONS & SHADOWS ── */
        @keyframes l-pulse-glow {
          0% { opacity: 0.55; transform: scale(0.9) translateY(-50%); }
          100% { opacity: 0.95; transform: scale(1.1) translateY(-50%); }
        }
        .l-glow-orb {
          position: absolute;
          width: 650px;
          height: 650px;
          background: radial-gradient(circle, rgba(17, 17, 17, 0.08) 0%, rgba(17, 17, 17, 0) 70%);
          right: -150px;
          top: 50%;
          transform: translateY(-50%);
          pointer-events: none;
          z-index: 1;
          animation: l-pulse-glow 6s ease-in-out infinite alternate;
        }

        @keyframes l-shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
        .l-shimmer-text {
          background: var(--gold-gradient);
          background-size: 200% auto;
          color: transparent !important;
          -webkit-background-clip: text !important;
          background-clip: text !important;
          animation: l-shimmer 4s linear infinite;
        }

        .l-btn-shimmer {
          position: relative;
          overflow: hidden;
        }
        .l-btn-shimmer::after {
          content: '';
          position: absolute;
          top: -50%;
          left: -60%;
          width: 30%;
          height: 200%;
          background: rgba(255, 255, 255, 0.35);
          transform: rotate(30deg);
          animation: l-btn-glow 4.5s ease-in-out infinite;
        }
        @keyframes l-btn-glow {
          0% { left: -60%; }
          30% { left: 160%; }
          100% { left: 160%; }
        }

        @keyframes l-fade-in-right {
          from { opacity: 0; transform: translateY(20px) scale(0.98); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes l-slide-in-left {
          from { opacity: 0; transform: translateX(-50px); }
          to { opacity: 1; transform: translateX(0); }
        }
        @keyframes l-slide-in-up {
          from { opacity: 0; transform: translateY(30px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        /* Animaciones de salida */
        @keyframes l-slide-out-left {
          from { opacity: 1; transform: translateX(0); }
          to { opacity: 0; transform: translateX(-50px); }
        }
        @keyframes l-fade-out-right {
          from { opacity: 1; transform: translateY(0) scale(1); }
          to { opacity: 0; transform: translateY(20px) scale(0.98); }
        }
        @keyframes l-slide-out-down {
          from { opacity: 1; transform: translateY(0); }
          to { opacity: 0; transform: translateY(30px); }
        }

        .l-animate-left {
          animation: l-slide-in-left 1.2s cubic-bezier(0.16, 1, 0.3, 1) forwards;
          transition: all 0.6s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .l-animate-right {
          animation: l-fade-in-right 1.2s cubic-bezier(0.16, 1, 0.3, 1) forwards;
          position: relative;
          z-index: 2; /* Sit on top of the glow orb */
          transition: all 0.6s cubic-bezier(0.16, 1, 0.3, 1);
        }

        /* Clases de salida aplicadas dinámicamente */
        .l-exit-left {
          animation: l-slide-out-left 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards !important;
        }
        .l-exit-right {
          animation: l-fade-out-right 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards !important;
        }
        .l-exit-down {
          animation: l-slide-out-down 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards !important;
        }

        /* Hover interactions on features */
        .l-feat {
          transition: transform 0.35s cubic-bezier(0.16, 1, 0.3, 1), filter 0.3s ease;
          cursor: pointer;
        }
        .l-feat:hover {
          transform: translateY(-5px);
          filter: brightness(1.25);
        }
        .l-feat:hover .l-feat-icon {
          filter: drop-shadow(0 2px 10px rgba(17, 17, 17, 0.75));
        }

        /* Focus feedback on inputs */
        .l-field-icon {
          transition: transform 0.25s ease, color 0.25s ease;
        }
        .l-field {
          position: relative;
          margin-bottom: 24px;
        }
        .l-field:focus-within .l-field-icon {
          color: #ffffff;
          transform: translateY(-50%) scale(1.15);
        }

        /* ── MOBILE / TABLET PORTRAIT APILADO ── */
        @media (max-width: 768px), (orientation: portrait) {
          .l-root {
            padding: 0 !important;
            padding-top: 0 !important;
          }
          .l-frame {
            border: none !important;
            border-radius: 0 !important;
            box-shadow: none !important;
            overflow: visible !important;
          }
          .l-bg-desktop { opacity: 0; pointer-events: none; }
          .l-bg-mobile-container { 
            opacity: 1 !important; 
            pointer-events: auto !important; 
            top: calc(-1 * env(safe-area-inset-top, 0px)) !important;
            height: calc(var(--mobile-split, 52%) + env(safe-area-inset-top, 0px)) !important; 
            -webkit-mask-image: linear-gradient(to bottom, rgba(0, 0, 0, 1) 0%, rgba(0, 0, 0, 0.8) 50%, rgba(0, 0, 0, 0) 100%) !important;
            mask-image: linear-gradient(to bottom, rgba(0, 0, 0, 1) 0%, rgba(0, 0, 0, 0.8) 50%, rgba(0, 0, 0, 0) 100%) !important;
          }
          .l-bg-mobile-img {
            object-position: center var(--mob-bg-y, 100%) !important;
            transform: scale(var(--mob-bg-zoom-factor, 1)) !important;
            transform-origin: var(--mob-bg-x, 50%) var(--mob-bg-y, 50%) !important;
          }
          @media (min-width: 480px) {
            .l-bg-mobile-container {
              height: 48% !important; /* Más alto en tablets/pantallas grandes para evitar recortar */
            }
            .l-bg-mobile-img {
              object-position: 75% 25% !important; /* Centra la silla sin cortarle la cabecera */
            }
            .l-overlay {
              background: linear-gradient(
                to bottom,
                rgba(0,0,0,0.15) 0%,
                rgba(0,0,0,0.40) 33%,
                #0a0a0c 48%,
                #0a0a0c 100%
              ) !important;
            }
          }
          /* Si es tablet (entre 769px y 1024px), usar las variables del tablet */
          @media (min-width: 769px) {
            .l-bg-mobile-img {
              transform: scale(var(--tab-bg-zoom-factor, 1)) !important;
              transform-origin: var(--tab-bg-x, 50%) var(--tab-bg-y, 50%) !important;
            }
          }
          .l-overlay {
            background: linear-gradient(
              to bottom,
              rgba(0,0,0,0.15) 0%,
              rgba(0,0,0,0.40) calc(var(--mobile-split, 45%) - 15%),
              #0a0a0c var(--mobile-split, 45%),
              #0a0a0c 100%
            ) !important;
          }

          .l-inner {
            flex-direction: column;
            align-items: center;
            justify-content: flex-start;
            padding: 10px 16px !important;
            gap: 0;
            overflow: hidden !important;
            height: 100vh;
            box-sizing: border-box;
          }

          .l-left {
            display: none !important;
          }
          
          
          .l-mob-header {
            display: flex !important;
            flex-direction: column;
            align-items: center;
            text-align: center;
            margin-bottom: 8px !important;
            margin-top: 10px !important;
          }
          .desktop-only-label {
            display: none !important;
          }
          .mobile-only-label {
            display: block !important;
          }
          .l-card-mobile-header {
            display: none !important;
          }
          .mob-only-copyright {
            display: block !important;
          }

          .l-logo-mob {
            width: 125px !important;
            margin-bottom: 8px !important;
            filter: drop-shadow(0 0 25px rgba(0,0,0,1)) drop-shadow(0 0 30px rgba(17, 17, 17, 0.35)) drop-shadow(0 2px 4px rgba(0,0,0,0.9));
          }
          .l-mob-title {
            font-size: 20px !important;
            font-weight: 900;
            color: #fff;
            text-align: center;
            margin-bottom: 4px !important;
            letter-spacing: 0.5px;
            text-transform: uppercase;
          }
          .l-mob-title span {
            color: var(--champagne);
            text-shadow: 0 0 10px rgba(17, 17, 17, 0.35);
          }
          .l-mob-sub {
            font-size: 11.5px !important;
            color: rgba(255,255,255,0.60);
            text-align: center;
          }
          .l-card-title, .l-card-sub {
            display: none !important;
          }

          .l-mob-bottom {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center !important;
            flex: 1;
            width: 100%;
            box-sizing: border-box;
            gap: 10px !important;
            padding-top: 0 !important;
            padding-bottom: 10px !important;
            min-height: 0 !important;
          }

          .l-card {
            width: 100% !important;
            max-width: 360px !important;
            background: linear-gradient(180deg, var(--bg-secondary) 0%, var(--bg-primary) 100%) !important;
            border: 1px solid var(--border-color) !important;
            border-radius: 20px !important;
            padding: 20px 20px !important;
            box-shadow: 0 30px 60px rgba(0, 0, 0, 0.6), inset 0 1px 0px rgba(255,255,255,0.05) !important;
            box-sizing: border-box !important;
            gap: 12px !important;
          }

          .l-mob-bottom .l-field {
            margin-bottom: 12px !important;
          }

          .l-input {
            font-size: 14px !important;
          }
          .l-mob-bottom .l-row {
            margin-bottom: 12px !important;
          }

          .l-mob-features {
            display: flex !important;
            gap: 0;
            width: 100%;
            max-width: 360px !important;
            padding: 12px 8px !important;
            background: rgba(15, 15, 17, 0.8);
            border: 1px solid var(--border-color) !important;
            border-radius: 14px !important;
            margin-top: 8px !important;
            margin-bottom: 0 !important;
            margin-left: 0;
            margin-right: 0;
          }
          .l-mob-features .l-feat {
            flex: 1;
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 6px;
            border-right: 1px solid rgba(255, 255, 255, 0.08);
            padding: 0 4px;
          }
          .l-mob-features .l-feat:last-child {
            border-right: none;
          }
          .l-mob-features .l-feat-icon {
            justify-content: center;
          }
          .l-mob-features .l-feat-label {
            text-align: center;
            font-size: 9px;
            font-weight: 800;
            letter-spacing: 0.4px;
            line-height: 1.4;
          }

          .l-mob-secure {
            display: flex !important;
            align-items: center;
            justify-content: center;
            gap: 6px;
            font-size: 11px !important;
            color: rgba(255,255,255,0.50);
            width: 100%;
            max-width: 360px !important;
            margin-top: 8px !important;
            margin-bottom: 0 !important;
            margin-left: 0;
            margin-right: 0;
          }
          .l-mob-secure span {
            color: #ffffff;
            font-weight: 600;
          }
          .l-card .l-secure {
            display: none !important;
          }

          /* Escalar componentes si es una pantalla portrait más ancha (ej: iPad de 768px o Pixel Tablet de 800px) */
          @media (min-width: 600px) {
            .l-card {
              max-width: 510px;
              padding: calc(var(--mob-card-padding, 33px) * 1.25) 36px;
            }
            .l-mob-header {
              max-width: 530px;
            }
            .l-logo-mob {
              width: calc(var(--mob-logo-size, 118px) * 1.3) !important;
            }
            .l-mob-title {
              font-size: 30px;
            }
            .l-mob-sub {
              font-size: 15.5px;
            }
            .l-input {
              font-size: 15.5px;
              padding: 30px 48px 12px 56px;
            }
            .l-field-label {
              font-size: 10px;
              left: 56px;
            }
            .l-field-icon {
              left: 20px;
            }
            .l-btn {
              font-size: 15.5px;
              padding: 18px 24px;
            }
            .l-mob-features {
              max-width: 530px;
              padding: 26px 14px;
            }
            .l-mob-features .l-feat-label {
              font-size: 10.5px;
            }
            .l-mob-secure {
              font-size: 13.5px;
              max-width: 530px;
            }
          }
        }

        /* ── TABLET HORIZONTAL (769px a 1024px) ── */
        @media (min-width: 769px) and (max-width: 1024px) and (orientation: landscape) {
          .l-bg-desktop {
            background-size: var(--tab-bg-zoom, cover) !important;
            background-position: var(--tab-bg-x, 56%) var(--tab-bg-y, 100%) !important;
          }
          .l-inner {
            padding: 40px 32px;
            gap: 24px;
          }
          .l-left {
            gap: 24px;
            max-width: 400px;
          }
          .l-logo {
            width: 180px;
            margin-bottom: 20px;
          }
          .l-heading {
            font-size: clamp(26px, 2.5vw, 32px);
            margin-bottom: 12px;
          }
          .l-desc {
            font-size: 12.5px;
            max-width: 360px;
          }
          .l-card {
            padding: 36px 24px;
            width: 380px;
          }
          .l-features {
            margin-top: 10px;
          }
          .l-feat {
            padding: 0 10px 0 0;
            gap: 8px;
          }
          .l-feat-label {
            font-size: 9.5px;
          }
        }

        /* ── PANTALLAS GRANDES (Full HD 1920x1080 en adelante) ── */
        /* Todos los valores verticales usan clamp() con vh para que se ajusten
           siempre a la altura disponible y jamás requieran scroll interno. */
        @media (min-width: 1600px) {
          .l-inner {
            max-width: 1680px;
          }
          .l-card {
            width: 520px;
            padding: clamp(24px, 6vh, 64px) 52px clamp(20px, 5.5vh, 56px) 52px;
            gap: clamp(10px, 2.2vh, 22px);
            border-radius: 28px;
          }
          .l-card-title {
            font-size: clamp(18px, 2.8vh, 30px);
          }
          .l-card-sub {
            font-size: clamp(12px, 2vh, 16.5px);
            margin-bottom: clamp(16px, 4vh, 36px);
          }
          .panda-field-group label {
            font-size: clamp(12px, 1.6vh, 15px);
          }
          .panda-input-field {
            font-size: clamp(14px, 2vh, 17px);
            padding: clamp(12px, 2.2vh, 19px) 52px clamp(12px, 2.2vh, 19px) 22px;
            border-radius: 12px;
          }
          .panda-input-wrapper svg {
            width: clamp(16px, 2vh, 19px);
            height: clamp(16px, 2vh, 19px);
          }
          .panda-submit-btn {
            height: clamp(46px, 7.5vh, 60px);
            font-size: clamp(13px, 2vh, 17px);
            border-radius: 14px;
          }
          form {
            gap: clamp(10px, 2vh, 20px) !important;
          }
        }
        .l-mob-header { display: none; }
        .l-mob-secure { display: none; }
        .l-mob-features { display: none; }
        .l-mob-bottom { display: contents; }

        /* ── CONFIGURADOR FLOTANTE (CALIBRATOR PANEL) ── */
        .l-cal-btn {
          position: fixed;
          bottom: 16px;
          left: 16px;
          width: 38px;
          height: 38px;
          border-radius: 50%;
          background: rgba(21, 21, 24, 0.9);
          border: 1px solid rgba(255, 255, 255, 0.4);
          color: #ffffff;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          z-index: 10000;
          box-shadow: 0 4px 12px rgba(0,0,0,0.5);
          transition: transform 0.2s, background 0.2s;
        }
        .l-cal-btn:hover {
          transform: scale(1.05);
          background: #1a1a1e;
        }
        .l-cal-panel {
          position: fixed;
          bottom: 64px;
          left: 16px;
          width: 300px;
          background: rgba(15, 15, 17, 0.95);
          backdrop-filter: blur(10px);
          -webkit-backdrop-filter: blur(10px);
          border: 1px solid rgba(255, 255, 255, 0.25);
          border-radius: 16px;
          padding: 20px;
          z-index: 10000;
          color: #fff;
          box-shadow: 0 10px 30px rgba(0,0,0,0.8);
          font-family: 'Inter', sans-serif;
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        .l-cal-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          border-bottom: 1px solid rgba(255,255,255,0.08);
          padding-bottom: 10px;
        }
        .l-cal-header h3 {
          font-size: 13px;
          font-weight: 800;
          color: #ffffff;
          letter-spacing: 0.5px;
          text-transform: uppercase;
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .l-cal-close {
          background: none;
          border: none;
          color: rgba(255,255,255,0.4);
          cursor: pointer;
          padding: 0;
          display: flex;
        }
        .l-cal-device {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 11px;
          font-weight: 700;
          background: rgba(255, 255, 255, 0.1);
          color: #ffffff;
          padding: 4px 8px;
          border-radius: 6px;
          align-self: flex-start;
          text-transform: uppercase;
        }
        .l-cal-section {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .l-cal-row {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .l-cal-label-row {
          display: flex;
          justify-content: space-between;
          font-size: 10px;
          font-weight: 800;
          color: rgba(255,255,255,0.6);
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .l-cal-label-row span.val {
          color: #ffffff;
        }
        .l-cal-slider {
          width: 100%;
          height: 4px;
          border-radius: 2px;
          background: rgba(255,255,255,0.1);
          outline: none;
          cursor: pointer;
          accent-color: #ffffff;
        }
        .l-cal-toggle {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 11px;
          font-weight: 600;
          color: rgba(255,255,255,0.8);
          cursor: pointer;
          margin-top: 4px;
        }
        .l-cal-toggle input {
          accent-color: #ffffff;
          cursor: pointer;
        }
        .l-cal-btn-copy {
          width: 100%;
          height: 38px;
          background: linear-gradient(to right, #eeeeee 0%, #b5b5b5 100%);
          border: none;
          border-radius: 8px;
          color: #000;
          font-size: 11.5px;
          font-weight: 800;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          margin-top: 4px;
          transition: transform 0.15s;
        }
        .l-cal-btn-copy:active {
          transform: scale(0.98);
        }
      `}</style>

      {/* ── MARCO CONTENEDOR DORADO ── */}
      <div className="l-frame" style={{
        '--bg-zoom': bgZoomMode === 'cover' ? 'cover' : `${bgZoom}%`,
        '--bg-x': `${bgX}%`,
        '--bg-y': `${bgY}%`,
        '--bg-darkness-start': `rgba(0,0,0,${(bgDarkness - 30) / 100})`,
        '--bg-darkness-mid': `rgba(0,0,0,${bgDarkness / 100})`,
        '--photo-width': `${photoWidth}%`,
        '--gradient-start': `${gradientStart}%`,
        '--mobile-split': `${mobileSplit}%`,
        '--mobile-split-vh': `${mobileSplit}vh`,
        '--mob-bg-zoom': mobBgZoomMode === 'cover' ? 'cover' : `${mobBgZoom}%`,
        '--mob-bg-x': `${mobBgX}%`,
        '--mob-bg-y': `${mobBgY}%`,
        '--tab-bg-zoom': tabBgZoomMode === 'cover' ? 'cover' : `${tabBgZoom}%`,
        '--tab-bg-x': `${tabBgX}%`,
        '--tab-bg-y': `${tabBgY}%`,
        '--mob-bg-zoom-factor': mobBgZoomMode === 'cover' ? 1.0 : mobBgZoom / 100,
        '--tab-bg-zoom-factor': tabBgZoomMode === 'cover' ? 1.0 : tabBgZoom / 100,
        '--mob-logo-size': `${mobLogoSize}px`,
        '--mob-logo-gap': `${mobLogoGap}px`,
        '--mob-title-gap': `${mobTitleGap}px`,
        '--mob-header-padding': `${mobHeaderPadding}px`,
        '--mob-card-padding': `${mobCardPadding}px`,
        '--mob-fields-gap': `${mobFieldsGap}px`,
        '--mob-bottom-gap': `${mobBottomGap}px`,
        '--mob-bottom-padding-top': `${mobBottomPaddingTop}px`,
        '--mob-card-features-gap': `${mobCardFeaturesGap}px`,
        '--mob-features-secure-gap': `${mobFeaturesSecureGap}px`
      }}>
        {/* ── BACKGROUNDS ── */}
        <div className="l-bg l-bg-desktop" />
        <div className="l-bg-mobile-container">
           <div className="l-bg-mobile-img" style={{ background: 'linear-gradient(135deg,#f7f4ee 0%,#efe6d5 50%,#e8d4b0 100%)' }} />
        </div>
        <div className="l-overlay" />
        <div className="l-glow-orb" />

        {/* ── CONTENT ── */}
        <div className="l-inner">
          
          <div className="l-main-section">

          {/* ── LEFT ── */}
          <div className={`l-left l-animate-left ${isExiting ? 'l-exit-left' : ''}`}>
            <div className="l-tagline">
               <img loading="lazy" src={logo} alt="Centro Odontológico Dientes Sanos" className="l-logo" onDoubleClick={handleLogoDoubleClick} style={{
                filter: 'drop-shadow(0 12px 24px rgba(0, 0, 0, 0.95)) drop-shadow(0 0 30px rgba(17, 17, 17, 0.35))',
                animation: 'l-fade-in-right 1.2s cubic-bezier(0.16, 1, 0.3, 1) forwards',
                cursor: import.meta.env.DEV ? 'pointer' : 'default'
              }} />
              <h1 className="l-heading">
                {BRAND_CONFIG.headingFirstPart}<br />
                DE TU <span className="l-shimmer-text">{BRAND_CONFIG.headingSecondPart}</span>
              </h1>
              <p className="l-desc">
                {BRAND_CONFIG.description}
              </p>
            </div>


          </div>

          {/* ── MOBILE HEADER (Only shown on mobile) ── */}
          <div className="l-mob-header">
             <img loading="lazy" src={logo} alt="Centro Odontológico Dientes Sanos" className="l-logo-mob" onDoubleClick={handleLogoDoubleClick} />
            <h2 className="l-mob-title">¡BIENVENIDO A <span>DIENTES SANOS!</span></h2>
            <p className="l-mob-sub">Ingresa tus credenciales para continuar</p>
          </div>

          {/* ── MOBILE BOTTOM WRAPPER ── */}
          <div className="l-mob-bottom">
            {/* ── RIGHT CARD ── */}
            <div 
              className={`l-card l-animate-right ${isExiting ? 'l-exit-right' : ''}`}
              onMouseMove={handleMouseMove}
              onMouseLeave={handleMouseLeave}
              style={{
                transform: `perspective(1000px) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)`,
                transition: isExiting ? 'all 0.5s ease' : 'transform 0.1s ease, box-shadow 0.3s ease, border-color 0.3s ease'
              }}
            >
              {/* Mobile Card Header */}
              <div className="l-card-mobile-header">
                 <img loading="lazy" src={logo} alt="Centro Odontológico Dientes Sanos" style={{ width: '130px', marginBottom: '24px', objectFit: 'contain', display: 'block', marginLeft: 'auto', marginRight: 'auto', filter: 'drop-shadow(0 8px 16px rgba(0,0,0,0.95)) drop-shadow(0 0 25px rgba(17, 17, 17, 0.3))' }} />
                <h2 style={{ fontSize: '24px', fontWeight: '600', color: '#fff', marginBottom: '6px' }}>¡Bienvenido de nuevo!</h2>
                <p style={{ fontSize: '13.5px', color: 'rgba(255,255,255,0.4)', marginBottom: '8px' }}>Inicia sesión para acceder al CRM de tu clínica</p>
              </div>

              <p className="l-card-title">¡BIENVENIDO A <span>DIENTES SANOS!</span></p>
              <p className="l-card-sub">Ingresa tus credenciales para continuar</p>

              
              <style>{`
                /* Estilos de input y animaciones de focus Apple-like */
                .panda-field-group {
                  display: flex;
                  flex-direction: column;
                  gap: clamp(4px, 0.8vh, 6px);
                  position: relative;
                }
                .panda-field-group label {
                  font-size: 13px;
                  color: #9a9a9f;
                  font-weight: 550;
                  text-align: left;
                  transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
                  letter-spacing: 0.3px;
                }
                .panda-field-group:focus-within label {
                  color: var(--champagne-light) !important;
                  text-shadow: 0 0 12px rgba(17, 17, 17, 0.4);
                }
                .panda-input-wrapper {
                  position: relative;
                  width: 100%;
                }
                .panda-input-field {
                  width: 100%;
                  padding: clamp(10px, 1.6vh, 14px) 44px clamp(10px, 1.6vh, 14px) 16px;
                  background: #111112;
                  border: 1px solid var(--border-color);
                  border-radius: 10px;
                  color: #ffffff;
                  font-size: clamp(13px, 1.7vh, 14.5px);
                  outline: none;
                  box-sizing: border-box;
                  transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
                }
                .panda-input-field:hover {
                  border-color: rgba(255, 255, 255, 0.12);
                  background: #151516;
                }
                .panda-input-field:focus {
                  border-color: var(--champagne) !important;
                  background: #181819 !important;
                  box-shadow: 0 0 0 3px rgba(17, 17, 17, 0.15), 0 10px 20px rgba(0,0,0,0.5) !important;
                  transform: translateY(-1px);
                }
                .panda-input-field:-webkit-autofill,
                .panda-input-field:-webkit-autofill:hover, 
                .panda-input-field:-webkit-autofill:focus, 
                .panda-input-field:-webkit-autofill:active {
                  -webkit-box-shadow: 0 0 0 1000px #111112 inset !important;
                  -webkit-text-fill-color: #ffffff !important;
                  border: 1px solid rgba(255, 255, 255, 0.06) !important;
                  transition: background-color 5000s ease-in-out 0s;
                }
                .panda-input-wrapper svg {
                  transition: all 0.3s ease;
                }
                .panda-input-wrapper:focus-within > svg {
                  color: var(--champagne) !important;
                  stroke: var(--champagne) !important;
                  transform: translateY(-50%) scale(1.15) !important;
                  filter: drop-shadow(0 0 6px rgba(17, 17, 17, 0.5)) !important;
                }
                .panda-input-wrapper:focus-within button svg {
                  color: var(--champagne) !important;
                  stroke: var(--champagne) !important;
                  transform: scale(1.15) !important;
                  filter: drop-shadow(0 0 6px rgba(17, 17, 17, 0.5)) !important;
                }
                .panda-eye-btn,
                .panda-eye-btn:hover,
                .panda-eye-btn:focus {
                  transform: translateY(-50%) !important;
                }
                .panda-eye-btn:active {
                  transform: translateY(-50%) scale(0.97) !important;
                }
                .panda-custom-checkbox {
                  appearance: none !important;
                  -webkit-appearance: none !important;
                  width: 18px !important;
                  height: 18px !important;
                  border: 1px solid rgba(255,255,255,0.25) !important;
                  border-radius: 4px !important;
                  background: transparent !important;
                  padding: 0 !important;
                  margin: 0 !important;
                  cursor: pointer;
                  position: relative;
                  transition: all 0.2s ease;
                  flex-shrink: 0;
                }
                .panda-custom-checkbox:hover {
                  border-color: rgba(255,255,255,0.45) !important;
                  background: rgba(255,255,255,0.02) !important;
                }
                .panda-custom-checkbox:checked {
                  background-color: #ffffff !important;
                  border-color: #ffffff !important;
                }
                .panda-custom-checkbox:checked::after {
                  content: '';
                  position: absolute;
                  left: 5px;
                  top: 1px;
                  width: 5px;
                  height: 9px;
                  border: solid #131313;
                  border-width: 0 2px 2px 0;
                  transform: rotate(45deg);
                }
                .panda-link-text {
                  background: none;
                  border: none;
                  color: #8a8a8a;
                  font-size: 13px;
                  cursor: pointer;
                  padding: 0;
                  transition: color 0.2s ease;
                  display: flex;
                  align-items: center;
                  gap: 8px;
                }
                .panda-link-text:hover {
                  color: #ffffff;
                }
                .panda-submit-btn {
                  width: 100%;
                  height: clamp(42px, 6.5vh, 48px);
                  border-radius: 12px;
                  border: none;
                  cursor: pointer;
                  font-size: clamp(12.5px, 1.7vh, 14px);
                  font-weight: 700;
                  letter-spacing: 1.2px;
                  text-transform: none !important;
                  color: #0c0c0d;
                  background: var(--gold-gradient);
                  box-shadow: 0 6px 20px rgba(0,0,0,0.4);
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  position: relative;
                  overflow: hidden;
                  transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
                }
                .panda-submit-btn::after {
                  content: '';
                  position: absolute;
                  top: -50%;
                  left: -60%;
                  width: 30%;
                  height: 200%;
                  background: rgba(255, 255, 255, 0.35);
                  transform: rotate(30deg);
                  animation: l-btn-glow 4.5s ease-in-out infinite;
                }
                @keyframes l-btn-glow {
                  0% { left: -60%; }
                  30% { left: 160%; }
                  100% { left: 160%; }
                }
                 .panda-submit-btn:hover:not(:disabled) {
                  transform: translateY(-2px);
                  box-shadow: 0 10px 25px rgba(17, 17, 17, 0.3);
                  filter: brightness(1.05);
                }
                .panda-submit-btn:hover:not(:disabled) .panda-btn-arrow {
                  transform: translateX(4px);
                }
                .panda-btn-arrow {
                  display: inline-block;
                  transition: transform 0.2s ease;
                  margin-left: 8px;
                  font-weight: bold;
                }
                .panda-submit-btn:active:not(:disabled) {
                  transform: translateY(0);
                }
              `}</style>

              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'clamp(8px, 1.6vh, 14px)' }}>
                <div className="panda-field-group">
                  <label className="desktop-only-label">Correo electrónico</label>
                  <label className="mobile-only-label">Correo electrónico</label>
                  <div className="panda-input-wrapper">
                    <input
                      type="email"
                      placeholder="Ingresa tu correo"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      required
                      autoComplete="off"
                      className="panda-input-field"
                    />
                    <Mail size={16} style={{
                      position: 'absolute',
                      right: '16px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      color: 'rgba(255,255,255,0.25)',
                      pointerEvents: 'none'
                    }} />
                  </div>
                </div>

                <div className="panda-field-group">
                  <label className="desktop-only-label">Contraseña</label>
                  <label className="mobile-only-label">Contraseña</label>
                  <div className="panda-input-wrapper">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Ingresa tu contraseña"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      required
                      autoComplete="new-password"
                      className="panda-input-field"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(v => !v)}
                      className="panda-eye-btn"
                      style={{
                        position: 'absolute',
                        right: '12px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        padding: '6px',
                        display: 'flex',
                        alignItems: 'center'
                      }}
                      tabIndex={-1}
                    >
                      {showPassword
                        ? <EyeOff size={16} color="rgba(255,255,255,0.25)" />
                        : <Eye    size={16} color="rgba(255,255,255,0.25)" />
                      }
                    </button>
                  </div>
                </div>


                {error && <div className="l-error" style={{ margin: '4px 0 0 0' }}>{error}</div>}

                <button type="submit" disabled={loading} className="panda-submit-btn">
                  {loading ? <Loader2 size={18} className="l-spin" /> : <>INICIAR SESIÓN <span className="panda-btn-arrow">→</span></>}
                </button>

                <style>{`
                  .panda-passkey-btn {
                    width: 100%; min-height: 44px; border-radius: 12px;
                    border: 1px solid rgba(17, 17, 17,.38); color: #ead9bb;
                    background: rgba(17, 17, 17,.07); display: flex; align-items: center;
                    justify-content: center; gap: 9px; font-size: 12px; font-weight: 800;
                    letter-spacing: .45px; cursor: pointer; transition: .2s ease;
                  }
                  .panda-passkey-btn:hover:not(:disabled) { background: rgba(17, 17, 17,.14); border-color: #111111; }
                  .panda-passkey-btn:disabled { opacity: .55; cursor: wait; }
                `}</style>
                <PasskeyLoginButton
                  onError={setError}
                  onSuccess={async () => {
                    const result = await finishPasskeyLogin();
                    if (!result.success) setError(result.message);
                  }}
                />

                {isMobileDevice && (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', fontSize: '11px', color: 'rgba(255, 255, 255, 0.35)', marginTop: '16px', width: '100%' }}>
                    <div style={{ flex: 1, height: '1px', background: 'rgba(255, 255, 255, 0.08)' }}></div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap' }}>
                      <ShieldCheck size={14} color="rgba(255, 255, 255, 0.35)" />
                      <span>Acceso seguro a tu negocio</span>
                    </div>
                    <div style={{ flex: 1, height: '1px', background: 'rgba(255, 255, 255, 0.08)' }}></div>
                  </div>
                )}
              </form>
            </div>

            {/* ── MOBILE: features below card ── */}
            <div className="l-mob-features">
              {features.map(({ icon: Icon, title, desc }) => (
                <div key={title} className="l-feat" style={{ flex: 1 }}>
                  <div className="l-feat-icon">
                    <Icon size={18} />
                  </div>
                  <span className="l-feat-label">{title}</span>
                </div>
              ))}
            </div>



          </div>
          </div>

          {/* ── BOTTOM FEATURES BAR (FOTO 1) ── */}
          <style>{`
            .panda-bottom-features-bar {
              display: flex;
              align-items: center;
              width: 100%;
              background: rgba(10, 10, 11, 0.40);
              backdrop-filter: blur(25px);
              -webkit-backdrop-filter: blur(25px);
              border: 1px solid var(--border-color);
              border-radius: 18px;
              padding: clamp(10px, 2vh, 20px) 40px;
              box-sizing: border-box;
              margin-top: clamp(8px, 1.6vh, 15px);
              flex-shrink: 0;
              box-shadow: 0 20px 40px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.05);
              animation: l-slide-in-up 1.2s cubic-bezier(0.16, 1, 0.3, 1) 0.2s both;
              transition: all 0.6s cubic-bezier(0.16, 1, 0.3, 1);
            }
            .panda-feat-item {
              flex: 1;
              display: flex;
              align-items: center;
              gap: 16px;
              padding: 0 24px;
              transition: transform 0.3s ease;
              cursor: pointer;
            }
            .panda-feat-item:hover {
              transform: translateY(-2px);
            }
            .panda-feat-icon-wrapper {
              display: flex;
              align-items: center;
              justify-content: center;
              color: var(--champagne);
              background: rgba(17, 17, 17, 0.05);
              border-radius: 10px;
              width: clamp(32px, 4.5vh, 44px);
              height: clamp(32px, 4.5vh, 44px);
              border: 1px solid rgba(17, 17, 17, 0.2);
              flex-shrink: 0;
              transition: all 0.3s ease;
            }
            .panda-feat-item:hover .panda-feat-icon-wrapper {
              background: rgba(17, 17, 17, 0.15);
              border-color: var(--champagne);
              color: var(--champagne-light);
              box-shadow: 0 0 12px rgba(17, 17, 17, 0.3);
            }
            .panda-feat-text {
              display: flex;
              flex-direction: column;
              gap: 3px;
            }
            .panda-feat-title {
              font-size: clamp(12.5px, 1.6vh, 15px);
              font-weight: 700;
              color: #ffffff;
              margin: 0;
              text-align: left;
            }
            .panda-feat-desc {
              font-size: clamp(11px, 1.3vh, 13px);
              color: rgba(255, 255, 255, 0.45);
              margin: 0;
              text-align: left;
              line-height: 1.3;
              white-space: pre-line;
            }
            .panda-divider {
              width: 1px;
              height: clamp(28px, 4vh, 40px);
              background: rgba(255, 255, 255, 0.08);
            }
            
            @media (max-width: 768px), (orientation: portrait) {
              .panda-bottom-features-bar {
                display: none !important;
              }
            }
            /* Ventanas de escritorio con muy poca altura: se prioriza la tarjeta de login
               y se oculta la franja decorativa para garantizar que nunca haya scroll */
            @media (min-width: 769px) and (max-height: 560px) and (orientation: landscape) {
              .panda-bottom-features-bar {
                display: none !important;
              }
            }

          `}</style>

          <div className={`panda-bottom-features-bar ${isExiting ? 'l-exit-down' : ''}`}>
            {features.map(({ icon: Icon, title, desc }, idx) => {
              let displayTitle = title;
              let displayDesc = desc;

              return (
                <React.Fragment key={title || idx}>
                  {idx > 0 && <div className="panda-divider" />}
                  <div className="panda-feat-item">
                    <div className="panda-feat-icon-wrapper">
                      <Icon size={22} />
                    </div>
                    <div className="panda-feat-text">
                      <h3 className="panda-feat-title">{displayTitle}</h3>
                      <p className="panda-feat-desc">{displayDesc}</p>
                    </div>
                  </div>
                </React.Fragment>
              );
            })}
          </div>

          <div style={{ textAlign: 'center', fontSize: '10.5px', color: 'rgba(255,255,255,0.35)', marginTop: '14px', marginBottom: '8px' }} className="mob-only-copyright">
            © {new Date().getFullYear()} Centro Odontológico Dientes Sanos. Todos los derechos reservados.
          </div>

        </div>

      </div>
    </div>
  );
}
