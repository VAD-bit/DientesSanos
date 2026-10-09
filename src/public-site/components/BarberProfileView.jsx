import React, { useRef, useEffect } from 'react';
import { ChevronLeft, Check, Star, Scissors, Calendar as CalendarIcon, User, Lock } from 'lucide-react';
import { getNormalizedSpecialty, getBarberBiography, getBarberDetails, getBarberStats, getBarberVideo } from '../pages/BookAppointment';
import logo from '../../assets/logo_full.png';
import { motion, AnimatePresence } from 'framer-motion';

const profileContainerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.1
    }
  },
  exit: {
    opacity: 0,
    y: 20,
    transition: { duration: 0.2 }
  }
};

const profileItemVariants = {
  hidden: { opacity: 0, y: 20, scale: 0.95 },
  show: { opacity: 1, y: 0, scale: 1, transition: { type: 'spring', stiffness: 300, damping: 24 } }
};

export default function BarberProfileView({
  barber,
  barbers = [],
  onClose,
  onShare,
  favorites = [],
  toggleFavorite,
  portfolio = [],
  portfolioLoading = false,
  setActiveLightboxImage,
  
  // Booking specific props (optional)
  isExploreMode = false,
  onExploreBook,
  services = [],
  setSelectedBarber,
  setStep,
  selectedService,
  setSelectedService,
  selectedDate,
  setSelectedDate,
  selectedTime,
  setSelectedTime,
  visibleSlots = [],
  profileActivePeriod,
  setProfileActivePeriod,
  formatDuration,
  formatTime12,
  BarberAvatar,
  createRipple,
  onSelectBarber,
  onSwitchBarber,
  scrollToTimeSlots,
  scrollToTop
}) {
  const expandedBarber = barber;
  const expandedBarberPortfolio = portfolio.slice(0, 5);
  const portfolioScrollRef = useRef(null);
  const portfolioPaused = useRef(false);

  useEffect(() => {
    if (expandedBarberPortfolio.length < 2) return;
    portfolioPaused.current = false;
    const id = setInterval(() => {
      if (portfolioPaused.current) return;
      const el = portfolioScrollRef.current;
      if (!el) return;
      const maxScroll = el.scrollWidth - el.clientWidth;
      if (maxScroll <= 0) return;
      if (el.scrollLeft >= maxScroll - 5) {
        el.scrollTo({ left: 0, behavior: 'smooth' });
      } else {
        const card = el.querySelector(':scope > div > div');
        if (card) el.scrollBy({ left: card.offsetWidth + 16, behavior: 'smooth' });
      }
    }, 3500);
    return () => clearInterval(id);
  }, [expandedBarberPortfolio.length]);

  return (
    <>
                      <motion.div variants={profileContainerVariants} initial="hidden" animate="show" exit="exit" className="w-full max-w-7xl mx-auto">
                        {(() => {
                          const bIdx = barbers.findIndex(b => b.id === expandedBarber.id);
                          const specialty = getNormalizedSpecialty(expandedBarber);
                          const badge = expandedBarber.badge || '';

                          return (
                            <div className="w-full flex flex-col">
                              {/* Barra Superior Premium de Escritorio (Mockup) */}
                              <motion.div variants={profileItemVariants} className="hidden md:flex items-center justify-between py-4 border-b border-[#d9c08f]/15 mb-6 w-full">
                                <button 
                                  onClick={onClose}
                                  className="flex items-center gap-1.5 text-[#64748b] hover:text-[#111111] transition-all text-sm font-medium cursor-pointer group"
                                >
                                  <ChevronLeft size={16} className="group-hover:-translate-x-0.5 transition-transform" />
                                  <span>Todos los profesionales</span>
                                </button>
                                
                                <div className="flex items-center justify-center">
                                  {/* Logo Centrado */}
                                  <img src={logo} alt="Centro Odontológico Dientes Sanos" className="h-10 object-contain opacity-90" />
                                </div>
                                
                                <div className="flex items-center gap-6">
                                  <button 
                                    onClick={onShare}
                                    className="flex items-center gap-2 text-[#64748b] hover:text-[#111111] transition-all text-sm font-medium cursor-pointer"
                                  >
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></svg>
                                    <span>Compartir</span>
                                  </button>
                                  
                                  <button 
                                    onClick={() => toggleFavorite(expandedBarber.id)}
                                    className="flex items-center gap-2 text-[#64748b] hover:text-[#111111] transition-all text-sm font-medium cursor-pointer"
                                  >
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill={favorites.includes(expandedBarber.id) ? "#ff453a" : "none"} stroke={favorites.includes(expandedBarber.id) ? "#ff453a" : "currentColor"} strokeWidth="2.5"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
                                    <span>{favorites.includes(expandedBarber.id) ? "Guardado" : "Guardar"}</span>
                                  </button>
                                </div>
                                </motion.div>
                                {/* ── MÓVIL: Immersive Cinematic Hero Video/Photo Header (Oculto en desktop) ── */}
                                <motion.div variants={profileItemVariants} className="relative h-[420px] -mx-4 -mt-8 mb-6 overflow-hidden rounded-b-[2rem] border border-[#d9c08f]/15 shadow-2xl bg-[#0a0a0d] profile-video-hero z-10 md:hidden">
                                  {/* Botón Volver Flotante en Móvil */}
                                  <button
                                    onClick={onClose}
                                    className="absolute left-6 z-[30] w-10 h-10 rounded-full bg-black/60 md:backdrop-blur-md backdrop-blur-sm border border-white/10 flex items-center justify-center text-white/80 hover:text-white cursor-pointer active:scale-95 transition-all md:hidden"
                                    style={{ top: 'calc(max(env(safe-area-inset-top, 0px), 24px))' }}
                                    aria-label="Volver"
                                    type="button"
                                  >
                                    <ChevronLeft size={20} />
                                  </button>

                                  {expandedBarber.video_url || getBarberVideo(expandedBarber.name) ? (
                                    <div className="w-full h-full relative profile-video-inner">
                                      {expandedBarber.image_url && (
                                        <img
                                          src={expandedBarber.image_url}
                                          alt={expandedBarber.name}
                                          className="profile-video-poster"
                                          style={{ 
                                            filter: 'brightness(0.85)',
                                            objectPosition: expandedBarber.name.toLowerCase().includes('moret') 
                                              ? 'center 15%' 
                                              : expandedBarber.name.toLowerCase().includes('kevin')
                                                ? 'center 28%'
                                                : 'center top'
                                          }}
                                        />
                                      )}
                                      <video
                                        key={expandedBarber.id}
                                        autoPlay
                                        loop
                                        muted
                                        playsInline
                                        preload="auto"
                                        poster={expandedBarber.image_url || undefined}
                                        className="w-full h-full object-cover profile-video-el"
                                        style={{ 
                                          filter: 'brightness(0.85)',
                                          objectPosition: expandedBarber.name.toLowerCase().includes('moret') 
                                            ? 'center 15%' 
                                            : expandedBarber.name.toLowerCase().includes('kevin')
                                              ? 'center 28%'
                                              : 'center top'
                                        }}
                                        onLoadedData={(e) => e.currentTarget.classList.add('loaded')}
                                      >
                                        <source src={expandedBarber.video_url || getBarberVideo(expandedBarber.name)} type={expandedBarber.video_url ? (expandedBarber.video_url.endsWith('.webm') ? 'video/webm' : 'video/mp4') : 'video/mp4'} />
                                      </video>
                                    </div>
                                  ) : expandedBarber.image_url ? (
                                    <img src={expandedBarber.image_url} alt={expandedBarber.name} className="w-full h-full object-cover object-top" />
                                  ) : (
                                    <div className="w-full h-full flex flex-col items-center justify-center gap-2 bg-gradient-to-b from-white/[0.04] to-transparent">
                                      <div className="w-16 h-16 rounded-2xl bg-white/[0.04] border border-white/10 flex items-center justify-center text-white/20">
                                        <User size={32} />
                                      </div>
                                      <span className="text-[10px] text-white/20 font-bold uppercase tracking-wider">Sin foto de perfil</span>
                                    </div>
                                  )}
                                  
                                  {/* Absolute overlay gradients for text contrast */}
                                  <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0e] via-[#0a0a0e]/30 to-transparent z-[2]"></div>
                                  <div className="absolute inset-0 bg-gradient-to-b from-[#0a0a0e]/50 via-transparent to-transparent z-[2]"></div>

                                  <div className="absolute bottom-6 left-6 right-6 z-20">
                                    {badge && (
                                      <span className="urban-tape mb-2.5 text-[9px]">
                                        {badge}
                                      </span>
                                    )}
                                    <div className="relative">
                                      <div className="urban-stencil-text select-none">DIENTES SANOS</div>
                                      <h3 className="font-black text-4xl text-white leading-none tracking-tighter uppercase mb-0.5 drop-shadow-[0_4px_12px_rgba(0,0,0,0.8)]">
                                        {expandedBarber.name}
                                      </h3>

                                    </div>
                                  </div>
                                </motion.div>

                                {/* ── MÓVIL: Creative Manifesto (Oculto en desktop) ── */}
                                <motion.div variants={profileItemVariants} className="relative urban-industrial-panel overflow-visible p-5 mb-6 profile-bio-enter md:hidden">
                                  <div className="absolute -top-3 left-4">
                                    <span className="urban-tape urban-tape-accent text-[9px]">
                                      MANIFESTO // {expandedBarber.name}
                                    </span>
                                  </div>
                                  <p className="text-[14px] text-[#334155] leading-relaxed italic font-medium relative z-10 pt-1">
                                    "{getBarberBiography(expandedBarber)}"
                                  </p>
                                </motion.div>

                                <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start w-full text-left">
                                {/* Left Column: Especialidades, Portafolio, Testimonios */}
                                <div className="md:col-span-8 space-y-8 w-full">
{/* ── ESCRITORIO: Vista Horizontal Unificada (Oculto en móvil) ── */}
                                {(() => {
                                  const details = getBarberDetails(expandedBarber.name);
                                  const ratings = details.rating;
                                  const reviews = details.reviews_count;
                                  
                                  return (
                                    <div className="hidden md:flex gap-6 items-start w-full mb-6">
                                      {/* Retrato de Video de Escritorio */}
                                      <div className="relative w-[250px] h-[340px] rounded-3xl overflow-hidden border border-[#d9c08f]/15 shadow-2xl bg-[#0a0a0d] flex-shrink-0 z-10">
                                        {expandedBarber.video_url || getBarberVideo(expandedBarber.name) ? (
                                          <div className="w-full h-full relative">
                                            {expandedBarber.image_url && (
                                              <img
                                                src={expandedBarber.image_url}
                                                alt={expandedBarber.name}
                                                className="profile-video-poster"
                                                style={{ 
                                                  filter: 'brightness(0.85)',
                                                  objectPosition: expandedBarber.name.toLowerCase().includes('moret') 
                                                    ? 'center 15%' 
                                                    : expandedBarber.name.toLowerCase().includes('kevin')
                                                      ? 'center 28%'
                                                      : 'center top'
                                                }}
                                              />
                                            )}
                                            <video
                                              key={`desc-${expandedBarber.id}`}
                                              autoPlay
                                              loop
                                              muted
                                              playsInline
                                              preload="auto"
                                              className="w-full h-full object-cover profile-video-el"
                                              style={{ 
                                                filter: 'brightness(0.85)',
                                                objectPosition: expandedBarber.name.toLowerCase().includes('moret') 
                                                  ? 'center 15%' 
                                                  : expandedBarber.name.toLowerCase().includes('kevin')
                                                    ? 'center 28%'
                                                    : 'center top'
                                              }}
                                              onLoadedData={(e) => e.currentTarget.classList.add('loaded')}
                                            >
                                              <source src={expandedBarber.video_url || getBarberVideo(expandedBarber.name)} type={expandedBarber.video_url ? (expandedBarber.video_url.endsWith('.webm') ? 'video/webm' : 'video/mp4') : 'video/mp4'} />
                                            </video>
                                          </div>
                                        ) : expandedBarber.image_url ? (
                                          <img src={expandedBarber.image_url} alt={expandedBarber.name} className="w-full h-full object-cover object-top" />
                                        ) : (
                                          <div className="w-full h-full flex flex-col items-center justify-center gap-2 bg-gradient-to-b from-white/[0.04] to-transparent">
                                            <div className="w-12 h-12 rounded-xl bg-white/[0.04] border border-white/10 flex items-center justify-center text-white/20">
                                              <User size={24} />
                                            </div>
                                            <span className="text-[8px] text-white/20 font-bold uppercase tracking-wider">Sin foto</span>
                                          </div>
                                        )}

                                        {/* Badges Flotantes abajo en foto de escritorio */}
                                        <div className="absolute bottom-3 left-3 right-3 flex flex-wrap gap-1.5 z-20">
                                          {/* Mock availability removed */}
                                          <div className="bg-black/60 md:backdrop-blur-md backdrop-blur-sm border border-white/10 px-2 py-0.5 rounded flex items-center gap-1">
                                            <span className="text-[7px] font-black text-white/60 uppercase tracking-widest">Consulta principal</span>
                                          </div>
                                        </div>
                                      </div>

                                      {/* Info y Datos del Profesional (Derecha del retrato en escritorio) */}
                                      <div className="flex flex-col flex-1 min-w-0 justify-between h-[340px] py-1">
                                        <div>
                                          <h3 className="font-black text-4xl text-[#111111] leading-none tracking-tight uppercase mb-1">
                                            {expandedBarber.name}
                                          </h3>
                                          <div className="text-[11px] font-black text-[#111111] tracking-widest uppercase mb-2">
                                            {specialty}
                                          </div>
                                          
                                          {/* Ratings removed */}
                                          
                                          {/* Biografía de Escritorio */}
                                          <p className="text-[12px] text-[#334155] leading-relaxed font-medium mb-4 max-w-xl">
                                            {getBarberBiography(expandedBarber)}
                                          </p>
                                        </div>

                                        {/* Barra de 4 Estadísticas Compactas (Estilo vertical de Foto 2) */}
                                        <div className="flex items-center justify-between border-t border-b border-[#d9c08f]/15 py-4 w-full">
                                          <div className="flex flex-col items-center text-center flex-1">
                                            <Scissors size={20} className="text-[#111111] mb-1.5" />
                                            <span className="text-xl font-black text-[#0f172a] leading-none mb-1">{details.reviews_count}+</span>
                                            <span className="text-[8px] text-[#64748b] font-black uppercase tracking-widest leading-tight">SERVICIOS<br/>REALIZADOS</span>
                                          </div>

                                          <div className="flex flex-col items-center text-center flex-1 border-l border-[#d9c08f]/15">
                                            <CalendarIcon size={20} className="text-[#111111] mb-1.5" />
                                            <span className="text-xl font-black text-[#0f172a] leading-none mb-1">5</span>
                                            <span className="text-[8px] text-[#64748b] font-black uppercase tracking-widest leading-tight">AÑOS<br/>DE EXPERIENCIA</span>
                                          </div>

                                          <div className="flex flex-col items-center text-center flex-1 border-l border-[#d9c08f]/15">
                                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-[#111111] mb-1.5"><path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"/></svg>
                                            <span className="text-xl font-black text-[#0f172a] leading-none mb-1">98%</span>
                                            <span className="text-[8px] text-[#64748b] font-black uppercase tracking-widest leading-tight">CLIENTES<br/>SATISFECHOS</span>
                                          </div>

                                          <div className="flex flex-col items-center text-center flex-1 border-l border-[#d9c08f]/15">
                                            <Star size={20} className="text-[#111111] mb-1.5" />
                                            <span className="text-xl font-black text-[#0f172a] leading-none mb-1">{ratings}</span>
                                            <span className="text-[8px] text-[#64748b] font-black uppercase tracking-widest leading-tight">VALORACIÓN<br/>PROMEDIO</span>
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })()}
                                                                  {/* ── ESCRITORIO: Especialidades (Oculto en móvil) ── */}
                                {(() => {
                                  const details = getBarberDetails(expandedBarber.name);
                                  return (
                                    <div className="hidden md:block w-full border-t border-[#d9c08f]/15 pt-4 mb-6">
                                      <h4 className="font-extrabold text-[9px] font-black uppercase tracking-widest text-[#64748b] mb-3">ESPECIALIDADES</h4>
                                      <div className="flex flex-wrap gap-2">
                                        {details.specialties.map(spec => (
                                          <span 
                                            key={spec} 
                                            className="px-4 py-1.5 rounded-full bg-white border border-[#d9c08f]/15 text-[#334155] text-[11px] font-bold uppercase tracking-wider hover:border-[#111111]/40 transition-all duration-300"
                                          >
                                            {spec}
                                          </span>
                                        ))}
                                      </div>
                                    </div>
                                  );
                                })()}
                              
                                  {/* Recent Works Immersive Carousel */}
                                  <motion.div variants={profileItemVariants} className="profile-gallery-enter w-full relative">
                                    <div className="flex items-center justify-between mb-4">
                                      <h4 className="font-extrabold text-sm text-[#111111] uppercase tracking-widest">TRABAJOS RECIENTES</h4>
                                      {!portfolioLoading && expandedBarberPortfolio.length > 0 && (
                                        <div className="bg-[#f7f7f5] backdrop-blur-md px-3 py-1 rounded-full border border-[#d9c08f]/15">
                                          <span className="text-[9px] font-bold text-[#334155] tracking-widest">{expandedBarberPortfolio.length} FOTOS</span>
                                        </div>
                                      )}
                                    </div>

                                    {portfolioLoading ? (
                                      <div className="flex gap-4 overflow-x-auto hide-scrollbar pb-6 -mx-4 px-4 snap-x snap-mandatory">
                                        {[1, 2, 3, 4].map(i => (
                                          <div key={i} className="w-[82%] sm:w-[280px] shrink-0 snap-center aspect-[4/5] rounded-[24px] bg-[#f7f7f5] animate-pulse" />
                                        ))}
                                      </div>
                                    ) : expandedBarberPortfolio.length === 0 ? (
                                      <div className="flex items-center justify-center h-32 rounded-3xl border border-[#d9c08f]/15 bg-white border-dashed">
                                        <p className="text-xs text-[#64748b] font-bold uppercase tracking-wider">// Sin trabajos recientes</p>
                                      </div>
                                    ) : (
                                      <div
                                        ref={portfolioScrollRef}
                                        className="flex gap-4 overflow-x-auto hide-scrollbar pb-8 -mx-4 px-4 snap-x snap-mandatory items-center"
                                        style={{ touchAction: 'pan-x pan-y' }}
                                        onMouseEnter={() => { portfolioPaused.current = true; }}
                                        onMouseLeave={() => { portfolioPaused.current = false; }}
                                        onTouchStart={() => { portfolioPaused.current = true; }}
                                        onTouchEnd={() => { setTimeout(() => { portfolioPaused.current = false; }, 3000); }}
                                      >
                                        {expandedBarberPortfolio.map(photo => (
                                          <div 
                                            key={photo.id} 
                                            onClick={() => setActiveLightboxImage(photo.image_url)}
                                            className="w-[85%] sm:w-[320px] shrink-0 snap-center aspect-[4/5] rounded-[24px] overflow-hidden bg-[#f4f5f3] border border-[#d9c08f]/15 cursor-pointer transition-transform duration-500 hover:scale-[1.02] active:scale-95 shadow-2xl relative group"
                                          >
                                            <img src={photo.image_url} alt="" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                                            <div className="absolute inset-0 bg-gradient-to-b from-black/0 via-black/0 to-black/40 opacity-50 group-hover:opacity-0 transition-opacity duration-500 pointer-events-none" />
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                  </motion.div>

                                  {/* Testimonials removed */}
                                </div>

                            {/* Right Column: Stats panel, Services menu, Booking CTA (sticky on desktop conditionally) */}
                            <div className="md:col-span-4 profile-sticky-sidebar space-y-6 w-full">
                              
                              {/* ── MÓVIL: Vista Clásica (Oculto en computadoras) ── */}
                              <div className="md:hidden space-y-6 w-full">
                                {/* Brutalist Asymmetric Stats Section */}
                                {(() => {
                                  const stats = getBarberStats(expandedBarber);
                                  return (
                                    <motion.div variants={profileItemVariants} className="grid grid-cols-2 gap-3 profile-stats-enter w-full">
                                      <div className="urban-industrial-panel p-3 flex flex-row items-center gap-3 h-[68px]">
                                        <div className="urban-stat-num text-3xl font-black leading-none">{stats.services_count}</div>
                                        <div className="flex flex-col min-w-0">
                                          <span className="text-[8px] text-[#64748b] font-black uppercase tracking-widest leading-none mb-0.5">// TRABAJOS</span>
                                          <span className="text-[10px] text-[#334155] font-bold uppercase tracking-wider leading-tight">Atenciones</span>
                                        </div>
                                      </div>

                                      <div className="urban-industrial-panel p-3 flex flex-row items-center gap-3 h-[68px] border-left-[#ffffff]">
                                        <div className="urban-stat-num urban-stat-accent text-3xl font-black leading-none">{stats.happy_clients}</div>
                                        <div className="flex flex-col min-w-0">
                                          <span className="text-[8px] text-[#64748b] font-black uppercase tracking-widest leading-none mb-0.5">// FEEDBACK</span>
                                          <span className="text-[10px] text-[#334155] font-bold uppercase tracking-wider leading-tight">Clientes</span>
                                        </div>
                                      </div>

                                      <div className="urban-industrial-panel p-3 flex flex-row items-center gap-2 h-[68px]">
                                        <div className="flex items-baseline gap-1">
                                          <span className="urban-stat-num text-3xl font-black leading-none">{stats.experience.split(' ')[0]}</span>
                                          <span className="text-xs font-bold text-[#334155] lowercase">años</span>
                                        </div>
                                        <div className="flex flex-col min-w-0">
                                          <span className="text-[8px] text-[#64748b] font-black uppercase tracking-widest leading-none mb-0.5">// PERFIL</span>
                                          <span className="text-[10px] text-[#334155] font-bold uppercase tracking-wider leading-tight">Experiencia</span>
                                        </div>
                                      </div>

                                      <div className="urban-industrial-panel p-3 flex flex-row items-center gap-3 h-[68px]">
                                        <div className="text-xs font-black text-[#0f172a] leading-none uppercase tracking-tight">{stats.location && stats.location.toLowerCase().includes('sede') ? 'Consultorio' : stats.location}</div>
                                        <div className="flex flex-col min-w-0">
                                          <span className="text-[8px] text-[#64748b] font-black uppercase tracking-widest leading-none mb-0.5">// UBICACIÓN</span>
                                          <span className="text-[10px] text-[#334155] font-bold uppercase tracking-wider leading-tight">Principal</span>
                                        </div>
                                      </div>
                                    </motion.div>
                                  );
                                })()}

                                {!isExploreMode && (
                                  <>
                                    {/* Brutalist Chalkboard Services Menu */}
                                <motion.div variants={profileItemVariants} className="mb-8">
                                  <div className="flex items-center justify-between mb-4">
                                    <h4 className="font-extrabold text-sm text-[#111111] uppercase tracking-widest">// MENÚ DE SERVICIOS</h4>
                                    <span className="text-[9px] text-[#64748b] font-bold tracking-wider uppercase">TARIFA PREMIUM</span>
                                  </div>
                                  <div className="flex flex-col bg-white border border-[#d9c08f]/15 rounded-2xl p-4 gap-1">
                                    {(() => {
                                      const isTattoo = expandedBarber.role?.toLowerCase().includes('tatuador') || specialty.toLowerCase().includes('tatuador');
                                      const DENTAL_CATEGORIES = ['estética', 'ortodoncia', 'endodoncia', 'odontopediatría'];
                                      const filtered = services.filter(s => {
                                        const cat = (s.category || '').toLowerCase();
                                        if (isTattoo) {
                                          return cat === 'tatuajes';
                                        }
                                        return DENTAL_CATEGORIES.some(c => cat === c || cat.includes(c));
                                      }).slice(0, 4);

                                      const itemsToRender = filtered.length > 0 ? filtered : [
                                        { name: 'Limpieza dental', price: 40, duration: 40, category: 'Estética' },
                                        { name: 'Blanqueamiento', price: 90, duration: 60, category: 'Estética' },
                                        { name: 'Aplicación de flúor', price: 25, duration: 30, category: 'Odontopediatría' },
                                        { name: 'Consulta de ortodoncia', price: 50, duration: 45, category: 'Ortodoncia' }
                                      ];

                                      return itemsToRender.map((s, i) => (
                                        <div key={s.id || i} className="urban-service-row flex items-center justify-between py-3 px-2">
                                          <div className="flex flex-col items-start gap-0.5">
                                            <span className="text-xs font-black text-[#0f172a] tracking-tight uppercase">{s.name}</span>
                                            <span className="text-[9px] text-[#64748b] font-bold uppercase tracking-wider">{s.duration} MINUTOS // TIEMPO EST.</span>
                                          </div>
                                          <div className="flex items-center gap-1">
                                            <span className="text-xs font-black text-[var(--champagne)]">${s.price}</span>
                                          </div>
                                        </div>
                                      ));
                                    })()}
                                  </div>
                                </motion.div>

                                {/* Floating / Sticky Booking CTA Area */}
                                <div className="sticky bottom-0 -mx-4 px-4 pt-4 pb-6 bg-[#e9eae8]/95 backdrop-blur-xl border-t border-[#d9c08f]/15 z-20">
                                  <button
                                    onClick={(e) => { 
                                      createRipple(e); 
                                      if (isExploreMode && onExploreBook) {
                                        onExploreBook();
                                      } else {
                                        setSelectedBarber && setSelectedBarber(expandedBarber); 
                                        setExpandedBarber && setExpandedBarber(null); 
                                        if (typeof step !== 'undefined' && setStep) setStep(step + 1); 
                                        scrollToTop && scrollToTop(); 
                                      }
                                    }}
                                    className="w-full relative overflow-hidden rounded-2xl haptic-bounce ripple-container group shadow-lg bg-[#e8d4b0] text-[#111111] hover:bg-[#d9c08f] transition-colors"
                                    style={{
                                      boxShadow: '0 8px 32px rgba(17, 17, 17,0.35), 0 2px 8px rgba(0,0,0,0.10), inset 0 1px 0 rgba(255,255,255,0.15)'
                                    }}
                                  >
                                    <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 bg-gradient-to-r from-transparent via-white/20 to-transparent pointer-events-none" />
                                    <div className="relative z-10 py-4 px-6 flex items-center justify-between">
                                      <div className="flex flex-col items-start">
                                        <span className="text-[#111111]/70 text-[9px] font-black uppercase tracking-[0.2em] leading-none mb-1">Reservar con</span>
                                        <span className="text-[#111111] font-black text-lg leading-none tracking-tight">{expandedBarber.name}</span>
                                      </div>
                                      <div className="flex items-center gap-2">
                                        <div className="w-9 h-9 rounded-full bg-white/50 flex items-center justify-center">
                                          <Check size={18} className="text-[#111111]" strokeWidth={3} />
                                        </div>
                                      </div>
                                    </div>
                                  </button>
                                </div>
                                  </>
                                )}
                                 
                                 {/* Render mobile floating CTA even in exploreMode, but close the block here */}
                                 {isExploreMode && (
                                   <div className="sticky bottom-0 -mx-4 px-4 pt-4 pb-6 bg-[#e9eae8]/95 backdrop-blur-xl border-t border-[#d9c08f]/15 z-20">
                                     <button
                                       onClick={(e) => { 
                                         createRipple(e); 
                                         if (onExploreBook) onExploreBook(); 
                                       }}
                                        className="w-full relative overflow-hidden rounded-2xl haptic-bounce ripple-container group shadow-lg bg-[#e8d4b0] text-[#111111] hover:bg-[#d9c08f] transition-colors"
                                        style={{
                                          boxShadow: '0 8px 32px rgba(17, 17, 17,0.35), 0 2px 8px rgba(0,0,0,0.10), inset 0 1px 0 rgba(255,255,255,0.15)'
                                        }}
                                     >
                                       <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 bg-gradient-to-r from-transparent via-white/20 to-transparent pointer-events-none" />
                                       <div className="relative z-10 py-4 px-6 flex items-center justify-between">
                                         <div className="flex flex-col items-start">
                                           <span className="text-[#111111]/70 text-[9px] font-black uppercase tracking-[0.2em] leading-none mb-1">Reservar con</span>
                                           <span className="text-[#111111] font-black text-lg leading-none tracking-tight">{expandedBarber.name}</span>
                                         </div>
                                         <div className="flex items-center gap-2">
                                           <div className="w-9 h-9 rounded-full bg-white/50 flex items-center justify-center">
                                             <Check size={18} className="text-[#111111]" strokeWidth={3} />
                                           </div>
                                         </div>
                                       </div>
                                     </button>
                                   </div>
                                 )}
                              </div>

                              <div className="hidden md:flex flex-col space-y-6 w-full bg-white border border-[#d9c08f]/15 rounded-3xl p-6 shadow-2xl h-fit md:col-span-4">
                                {/* ── ESCRITORIO: Ficha de Reserva Unificada en 1 Paso (Oculto en móvil) ── */}
                                <div>
                                  <h4 className="font-extrabold text-sm text-[#111111] uppercase tracking-widest leading-none mb-1">RESERVA TU CITA</h4>
                                  <span className="text-[8px] text-[#64748b] font-black uppercase tracking-widest">PROCESO DE RESERVA DIRECTO</span>
                                </div>

                                {/* 1. Selecciona Servicio */}
                                {!isExploreMode && (
                                  <>
                                <div className="space-y-3">
                                  <div className="flex items-center justify-between">
                                    <span className="text-[10px] text-[#64748b] font-black uppercase tracking-widest">1. Selecciona servicio</span>
                                  </div>
                                  <div className="flex flex-col gap-2">
                                    {(() => {
                                      const isTattoo = expandedBarber.role?.toLowerCase().includes('tatuador') || specialty.toLowerCase().includes('tatuador');
                                      const DENTAL_CATEGORIES = ['estética', 'ortodoncia', 'endodoncia', 'odontopediatría'];
                                      const filtered = services.filter(s => {
                                        const cat = (s.category || '').toLowerCase();
                                        if (isTattoo) return cat === 'tatuajes';
                                        return DENTAL_CATEGORIES.some(c => cat === c || cat.includes(c));
                                      }).slice(0, 4);

                                      const itemsToRender = filtered.length > 0 ? filtered : [
                                        { id: 'fs-1', name: 'Limpieza dental', price: 40, duration: 40, category: 'Estética' },
                                        { id: 'fs-2', name: 'Blanqueamiento', price: 90, duration: 60, category: 'Estética' },
                                        { id: 'fs-3', name: 'Aplicación de flúor', price: 25, duration: 30, category: 'Odontopediatría' },
                                        { id: 'fs-4', name: 'Consulta de ortodoncia', price: 50, duration: 45, category: 'Ortodoncia' }
                                      ];

                                      return itemsToRender.map(s => {
                                        const isSelected = selectedService?.name === s.name;
                                        return (
                                          <div 
                                            key={s.id || s.name} 
                                            onClick={() => setSelectedService(s)}
                                            className={`flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer select-none ${
                                              isSelected 
                                                ? 'bg-[#111111]/10 border-[#111111] text-[#0f172a]' 
                                                : 'bg-white border-[#d9c08f]/15 text-[#334155] hover:bg-[#f7f7f5] hover:border-[#d9c08f]/30 hover:text-[#0f172a]'
                                            }`}
                                          >
                                            <div className="flex items-center gap-2.5">
                                              <div className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${isSelected ? 'border-[#111111]' : 'border-[#d9c08f]/40'}`}>
                                                {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-[#111111]" />}
                                              </div>
                                              <span className="text-[11px] font-bold uppercase tracking-wider">{s.name}</span>
                                            </div>
                                            <div className="flex items-center gap-2 text-[10px] font-black">
                                              <span className="text-[#64748b]">{formatDuration(s.duration)}</span>
                                              <span className="text-[#111111] font-extrabold">${s.price}</span>
                                            </div>
                                          </div>
                                        );
                                      });
                                    })()}
                                  </div>
                                </div>

                                {/* 2. Selecciona Fecha */}
                                <div className="space-y-3">
                                  <span className="text-[10px] text-[#64748b] font-black uppercase tracking-widest block">2. Selecciona fecha</span>
                                  <div className="flex gap-2 overflow-x-auto pb-2 hide-scrollbar snap-x">
                                    {(() => {
                                      const getNextDays = () => {
                                        const days = [];
                                        const locale = 'es-ES';
                                        const now = new Date();
                                        for (let i = 0; i < 10; i++) {
                                          const d = new Date(now);
                                          d.setDate(now.getDate() + i);
                                          if (d.getDay() === 0) continue; // Exclude Sundays
                                          const dayNum = d.getDate();
                                          const dayName = d.toLocaleDateString(locale, { weekday: 'short' }).replace('.', '');
                                          const monthName = d.toLocaleDateString(locale, { month: 'short' }).replace('.', '');
                                          days.push({
                                            date: d,
                                            dayNum,
                                            dayName: dayName.charAt(0).toUpperCase() + dayName.slice(1, 3),
                                            monthName: monthName.toUpperCase(),
                                            isoString: d.toISOString().split('T')[0]
                                          });
                                        }
                                        return days;
                                      };

                                      return getNextDays().map(day => {
                                        const isSelected = selectedDate && selectedDate.toISOString().split('T')[0] === day.isoString;
                                        return (
                                          <button
                                            key={day.isoString}
                                            onClick={() => { setSelectedDate(day.date); setSelectedTime(null); scrollToTimeSlots(); }}
                                            className={`flex flex-col items-center justify-between p-2 rounded-xl border min-w-[58px] aspect-[4/5] transition-all cursor-pointer snap-start ${
                                              isSelected 
                                                ? 'bg-[#111111] border-[#111111] text-white font-black' 
                                                : 'bg-white border-[#d9c08f]/15 text-[#334155] hover:bg-[#f7f7f5] hover:border-[#d9c08f]/30 hover:text-[#0f172a]'
                                            }`}
                                          >
                                            <span className={`text-[7px] font-black uppercase tracking-widest leading-none ${isSelected ? 'text-white/60' : 'text-[#64748b]'}`}>{day.dayName}</span>
                                            <span className="text-xs font-black leading-none">{day.dayNum}</span>
                                            <span className={`text-[7px] font-black uppercase tracking-wider leading-none ${isSelected ? 'text-white/80' : 'text-[#64748b]'}`}>{day.monthName}</span>
                                          </button>
                                        );
                                      });
                                    })()}
                                  </div>
                                </div>

                                {/* 3. Selecciona Horario */}
                                 <div className="space-y-3">
                                   <div className="flex items-center justify-between">
                                     <span className="text-[10px] text-[#64748b] font-black uppercase tracking-widest block">3. Selecciona horario</span>
                                     {/* Selector de periodo (Mañana / Tarde / Noche) */}
                                     <div className="flex bg-[#f7f7f5] border border-[#d9c08f]/15 rounded-lg p-0.5 text-[8px] sm:text-[9px] font-bold">
                                       <button 
                                         type="button"
                                         onClick={() => setProfileActivePeriod('mañana')}
                                         className={`px-1.5 py-0.5 rounded-md transition-all cursor-pointer ${profileActivePeriod === 'mañana' ? 'bg-[#111111] text-white font-black' : 'text-[#64748b] hover:text-[#111111]'}`}
                                       >
                                         MAÑANA
                                       </button>
                                       <button 
                                         type="button"
                                         onClick={() => setProfileActivePeriod('tarde')}
                                         className={`px-1.5 py-0.5 rounded-md transition-all cursor-pointer ${profileActivePeriod === 'tarde' ? 'bg-[#111111] text-white font-black' : 'text-[#64748b] hover:text-[#111111]'}`}
                                       >
                                         TARDE
                                       </button>
                                       <button 
                                         type="button"
                                         onClick={() => setProfileActivePeriod('noche')}
                                         className={`px-1.5 py-0.5 rounded-md transition-all cursor-pointer ${profileActivePeriod === 'noche' ? 'bg-[#111111] text-white font-black' : 'text-[#64748b] hover:text-[#111111]'}`}
                                       >
                                         NOCHE
                                       </button>
                                     </div>
                                   </div>

                                   {visibleSlots.some(s => s.isClosed) && (
                                      <div className="relative overflow-hidden rounded-xl border border-red-500/20 bg-gradient-to-br from-red-500/[0.09] via-red-500/[0.04] to-transparent px-3 py-2.5 flex items-center gap-2.5 shadow-[0_8px_24px_rgba(239,68,68,0.08)]">
                                        <div className="shrink-0 w-7 h-7 rounded-full bg-red-500/10 border border-red-500/25 flex items-center justify-center">
                                          <Lock size={12} className="text-red-500" />
                                        </div>
                                        <div className="text-left min-w-0">
                                          <p className="text-red-600 text-[9px] font-black uppercase tracking-wider leading-tight">Clínica cerrada</p>
                                          <p className="text-red-500/80 text-[9px] font-medium mt-0.5 leading-snug">Reservas bloqueadas por ahora</p>
                                        </div>
                                      </div>
                                   )}

                                   {/* Grid de horarios correspondientes al período activo */}
                                   <div className="grid grid-cols-3 gap-2">
                                     {(() => {
                                       const periodSlots = visibleSlots.filter(({ time }) => {
                                         const hour = parseInt(time.split(':')[0], 10);
                                         // "Mañana" also covers the early-morning/madrugada hours (00:00-08:59)
                                         // now that booking isn't limited to a fixed daytime window.
                                         if (profileActivePeriod === 'mañana') return hour < 12;
                                         if (profileActivePeriod === 'tarde') return hour >= 12 && hour < 18;
                                         if (profileActivePeriod === 'noche') return hour >= 18;
                                         return false;
                                       });

                                       if (periodSlots.length === 0) {
                                         return (
                                            <div className="col-span-3 text-center text-[#64748b] text-[9px] py-4 uppercase font-bold tracking-wider">
                                             Sin turnos disponibles
                                           </div>
                                         );
                                       }

                                       return periodSlots.map(({ time, label, isPast, isOccupied, isClosed }) => {
                                         const isSelected = selectedTime === time;
                                         const isDisabled = isPast || isOccupied || isClosed;
                                         return (
                                           <button
                                             key={time}
                                             type="button"
                                             disabled={isDisabled}
                                             onClick={() => { if (!isDisabled) setSelectedTime(time); }}
                                             className={`py-2 px-1 rounded-xl border text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer text-center ${
                                                isClosed
                                                 ? 'border-red-500/10 bg-red-500/[0.03] text-[#64748b] cursor-not-allowed'
                                                 : isOccupied
                                                 ? 'border-red-500/20 bg-red-500/5 text-red-500/60 cursor-not-allowed opacity-40 line-through'
                                                 : isPast
                                                   ? 'border-[#d9c08f]/10 bg-transparent text-[#64748b] cursor-not-allowed line-through'
                                                   : isSelected
                                                     ? 'bg-[#111111] border-[#111111] text-white font-black scale-[1.02] shadow-[0_0_8px_rgba(17, 17, 17,0.3)]'
                                                     : 'bg-white border-[#d9c08f]/15 text-[#334155] hover:bg-[#f7f7f5] hover:border-[#d9c08f]/30 hover:text-[#0f172a]'
                                             }`}
                                           >
                                             {label.replace(' AM', '').replace(' PM', '')} <span className="text-[8px] opacity-60">{label.includes('AM') ? 'AM' : 'PM'}</span>
                                           </button>
                                         );
                                       });
                                     })()}
                                   </div>
                                 </div>

                                {/* Resumen del Cita de Escritorio */}
                                {selectedService && selectedDate && selectedTime && (
                                  <div className="bg-white border border-[#d9c08f]/15 rounded-2xl p-4 flex flex-col gap-3 mt-2">
                                    <span className="text-[10px] text-[#64748b] font-bold uppercase tracking-wider mb-1 block">RESUMEN DE TU CITA</span>
                                    <div className="flex items-center gap-3">
                                      <BarberAvatar url={expandedBarber.image_url} name={expandedBarber.name} className="w-10 h-10 rounded-xl" />
                                      <div className="flex flex-col min-w-0">
                                        <span className="text-xs font-bold text-[#0f172a] truncate leading-none mb-1">{expandedBarber.name}</span>
                                        <span className="text-[10px] text-[#334155] truncate leading-none mb-1">{selectedService.name} • {formatDuration(selectedService.duration)}</span>
                                        <span className="text-[9px] text-[#111111] font-bold leading-none">
                                          {selectedDate.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' })} a las {formatTime12(selectedTime)}
                                        </span>
                                      </div>
                                    </div>
                                    <div className="flex items-center justify-between border-t border-[#d9c08f]/15 pt-3 mt-1">
                                      <span className="text-[9px] font-black text-[#64748b] uppercase tracking-widest">TOTAL</span>
                                      <span className="text-sm font-black text-[#111111]">${selectedService.price}</span>
                                    </div>
                                  </div>
                                )}
                                  </>
                                )}

                                {/* Botón de Reserva Directa de Escritorio */}
                                <button
                                  onClick={(e) => {
                                    createRipple(e);
                                    if (isExploreMode && onExploreBook) {
                                      onExploreBook();
                                    } else {
                                      setSelectedBarber && setSelectedBarber(expandedBarber);
                                      if (typeof setStep !== 'undefined') setStep(4);
                                      setExpandedBarber && setExpandedBarber(null);
                                      scrollToTop && scrollToTop();
                                    }
                                  }}
                                  disabled={!isExploreMode && (!selectedService || !selectedDate || !selectedTime)}
                                  className="w-full relative overflow-hidden rounded-2xl py-3.5 px-6 font-black uppercase tracking-widest text-xs haptic-bounce ripple-container group shadow-lg cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-300 bg-[#e8d4b0] hover:bg-[#d9c08f] text-[#111111]"
                                  style={{
                                    boxShadow: (isExploreMode || (selectedService && selectedDate && selectedTime)) ? '0 8px 32px rgba(17, 17, 17,0.35), 0 2px 8px rgba(0,0,0,0.10), inset 0 1px 0 rgba(255,255,255,0.15)' : 'none'
                                  }}
                                >
                                  <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 bg-gradient-to-r from-transparent via-white/20 to-transparent pointer-events-none" />
                                  <span className="text-[#111111] font-black">RESERVAR CON {expandedBarber.name.split(' ')[0]}</span>
                                </button>

                                {/* Colaboradores recomendados ("También podrías reservar con") */}
                                <div className="border-t border-[#d9c08f]/15 pt-4 mt-2">
                                  <span className="text-[10px] text-[#64748b] font-bold uppercase tracking-wider block mb-3">TAMBIÉN PODRÍAS RESERVAR CON</span>
                                  <div className="flex items-center gap-3 overflow-x-auto pb-1.5 scrollbar-none w-full">
                                    {barbers
                                      .filter(b => {
                                        if (b.id === expandedBarber.id) return false;
                                        
                                        // Match specialist type (Tatuador vs Barbero)
                                        const expandedIsTatuador = (expandedBarber.role || '').toLowerCase().includes('tatu') || (expandedBarber.specialty || '').toLowerCase().includes('tatu');
                                        const bIsTatuador = (b.role || '').toLowerCase().includes('tatu') || (b.specialty || '').toLowerCase().includes('tatu');
                                        if (expandedIsTatuador !== bIsTatuador) return false;
                                        
                                        // Exclude assistants, admins, receptionists, baristas
                                        const r = (b.role || '').toLowerCase();
                                        const isAssistant = r.includes('lavado') || r.includes('asist') || r.includes('clean') || r.includes('barista') || r.includes('recep') || r.includes('admin') || b.name.toLowerCase().includes('admin');
                                        return !isAssistant;
                                      })
                                      .map(b => (
                                        <button
                                          key={b.id}
                                          onClick={() => {
                                            if (onSwitchBarber) onSwitchBarber(b);
                                          }}
                                          className="flex flex-col items-center gap-1.5 group cursor-pointer flex-shrink-0"
                                        >
                                          <div className="w-9 h-9 rounded-full overflow-hidden border border-[#d9c08f]/15 group-hover:border-[#111111] transition-all">
                                            {b.image_url ? (
                                              <img src={b.image_url} alt={b.name} className="w-full h-full object-cover object-top group-hover:scale-105 transition-transform" />
                                            ) : (
                                              <div className="w-full h-full flex items-center justify-center bg-[#f7f7f5]">
                                                <User size={14} className="text-[#64748b]" />
                                              </div>
                                            )}
                                          </div>
                                          <span className="text-[8px] font-bold text-[#64748b] group-hover:text-[#111111] transition-all uppercase tracking-wider truncate max-w-[70px]">{b.name.split(' ')[0]}</span>
                                        </button>
                                      ))}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                            </div>
                          );
                        })()}
                      </motion.div>
    </>
  );
}
