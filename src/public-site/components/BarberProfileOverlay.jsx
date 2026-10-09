import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Star, Scissors, User, Heart } from 'lucide-react';
import { publicService } from '../services/publicService';
import logo from '../../assets/panda_logo_nobg.png';
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

const getBarberVideo = () => null;

const BARBER_DETAILS = {
  'ángel serrano': { rating: '4.9', reviews_count: 512, specialties: ['Estética dental', 'Ortodoncia', 'Endodoncia', 'Odontopediatría'], testimonials: [{ client: 'Carlos M.', text: 'Excelente atención y mucha precisión en el tratamiento. 100% recomendado.', service: 'Limpieza dental' }, { client: 'Andrés V.', text: 'La experiencia completa es de otro nivel. Volveré sin duda.', service: 'Blanqueamiento' }] },
  'moret serrano': { rating: '4.8', reviews_count: 240, specialties: ['Ortodoncia', 'Estética dental', 'Endodoncia', 'Odontopediatría'], testimonials: [{ client: 'José P.', text: 'El tratamiento quedó impecable, muy detallista el equipo.', service: 'Ortodoncia' }, { client: 'Mateo L.', text: 'Los resultados hablan por sí solos. Muy recomendado.', service: 'Estética dental' }] },
  'abraham díaz': { rating: '4.9', reviews_count: 310, specialties: ['Endodoncia', 'Estética dental', 'Ortodoncia', 'Odontopediatría'], testimonials: [{ client: 'Javier M.', text: 'Gran profesional. Sabe exactamente lo que necesitas.', service: 'Endodoncia' }, { client: 'Felipe D.', text: 'Excelente servicio, una experiencia muy relajante.', service: 'Limpieza dental' }] },
  'alejandro ramírez': { rating: '4.7', reviews_count: 156, specialties: ['Odontopediatría', 'Estética dental', 'Ortodoncia', 'Endodoncia'], testimonials: [{ client: 'Lucas B.', text: 'El equipo es súper creativo con los planes de tratamiento. Son únicos.', service: 'Odontopediatría' }] },
  'jeff carrero': { rating: '4.8', reviews_count: 189, specialties: ['Estética dental', 'Ortodoncia', 'Endodoncia', 'Odontopediatría'], testimonials: [{ client: 'Marcos A.', text: 'Excelente especialista y el tratamiento quedó perfecto.', service: 'Blanqueamiento' }] },
  'juan herrera': { rating: '4.9', reviews_count: 324, specialties: ['Endodoncia', 'Estética dental', 'Ortodoncia', 'Odontopediatría'], testimonials: [{ client: 'Sebastián L.', text: 'Juan es sumamente meticuloso. La limpieza fue una maravilla.', service: 'Limpieza dental' }] },
  'marko cardozo': { rating: '4.9', reviews_count: 420, specialties: ['Ortodoncia', 'Estética dental', 'Endodoncia', 'Odontopediatría'], testimonials: [{ client: 'Fabián K.', text: 'Las sonrisas de Marko son de cirujano. Un trabajo minimalista impecable.', service: 'Ortodoncia' }] },
  'josé cordero': { rating: '4.9', reviews_count: 380, specialties: ['Endodoncia', 'Estética dental', 'Ortodoncia', 'Odontopediatría'], testimonials: [{ client: 'Julián G.', text: 'El resultado es increíble, cuidó cada detalle de mi tratamiento.', service: 'Endodoncia' }] },
  'kevin farías': { rating: '4.8', reviews_count: 215, specialties: ['Estética dental', 'Blanqueamiento', 'Ortodoncia', 'Odontopediatría'], testimonials: [{ client: 'Samuel D.', text: 'El blanqueamiento y la limpieza con Kevin son espectaculares.', service: 'Blanqueamiento' }] },
  'cesia zuleta': { rating: '4.9', reviews_count: 142, specialties: ['Prevención', 'Limpieza', 'Odontopediatría', 'Tratamientos'], testimonials: [{ client: 'Gabriel J.', text: 'La limpieza profesional durante la consulta es de otro planeta.', service: 'Limpieza dental' }] }
};

const getBarberDetails = (barberName) => {
  const name = barberName?.toLowerCase() || '';
  for (const [key, val] of Object.entries(BARBER_DETAILS)) {
    if (name.includes(key) || key.includes(name)) return val;
  }
  return { rating: '4.8', reviews_count: 120, specialties: ['Estética', 'Ortodoncia', 'Endodoncia'], testimonials: [{ client: 'Cliente', text: 'Excelente servicio.', service: 'Limpieza dental' }] };
};

const parseBarberBioObj = (barber) => {
  if (barber?.biography && barber.biography.trim().startsWith('{')) {
    try { return JSON.parse(barber.biography); } catch (e) { return null; }
  }
  return null;
};

const getBarberBiography = (barber) => {
  const name = barber?.name?.toLowerCase() || '';
  if (name.includes('kevin')) return 'Especialista certificado en estética dental y tratamientos de sonrisa. Apasionado por la simetría y por diseñar el plan de atención ideal para cada paciente.';
  if (name.includes('ángel') || name.includes('angel')) return 'Equipo fundador de Centro Odontológico Dientes Sanos. Con años de experiencia, me especializo en odontología integral y en el cuidado de la salud bucal de la más alta calidad.';
  if (name.includes('moret')) return 'Especialista en ortodoncia, tratamientos estéticos y soluciones personalizadas. Apasionado por la precisión clínica y los detalles que marcan la diferencia.';
  
  const bioObj = parseBarberBioObj(barber);
  if (bioObj && bioObj.bio) return bioObj.bio;
  if (barber?.biography && !barber.biography.trim().startsWith('{') && barber.biography.trim().length > 10) return barber.biography;
  
  return 'Especialista en odontología integral y atención personalizada. Enfocado en brindar una experiencia dental premium a través de la prevención y el cuidado de tu sonrisa.';
};

const getBarberStats = (barber) => {
  const bioObj = parseBarberBioObj(barber);
  const name = barber?.name?.toLowerCase() || '';
  
  let defServices = '324'; let defHappy = '98%'; let defExp = '5 años'; let defLoc = barber?.location || 'Consultorio';
  if (name.includes('ángel') || name.includes('angel')) { defServices = '780+'; defHappy = '99%'; defExp = '8 años'; }
  else if (name.includes('moret')) { defServices = '520+'; defHappy = '98%'; defExp = '4 años'; }
  else if (name.includes('abraham')) { defServices = '310+'; defHappy = '98.5%'; defExp = '5 años'; }
  else if (name.includes('alejandro')) { defServices = '280+'; defHappy = '96%'; defExp = '3 años'; }
  else if (name.includes('jeff')) { defServices = '340+'; defHappy = '97.5%'; defExp = '4 años'; }
  else if (name.includes('juan')) { defServices = '460+'; defHappy = '98.8%'; defExp = '6 años'; }
  else if (name.includes('mark') || name.includes('marco')) { defServices = '220+'; defHappy = '99.2%'; defExp = '5 años'; }
  else if (name.includes('josé') || name.includes('jose')) { defServices = '410+'; defHappy = '98.6%'; defExp = '7 años'; }
  else if (name.includes('kevin')) { defServices = '290+'; defHappy = '97.8%'; defExp = '3 años'; }
  else if (name.includes('cesia')) { defServices = '640+'; defHappy = '99.5%'; defExp = '2 años'; }
  
  return {
    services_count: bioObj?.services_count || defServices,
    happy_clients: bioObj?.happy_clients || defHappy,
    experience: bioObj?.experience || defExp,
    location: bioObj?.location || defLoc
  };
};

// SVG Icon Calendar
const CalendarIcon = ({ size, className }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className} strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line>
  </svg>
);

export default function BarberProfileOverlay({ isOpen, barber, onClose, onBook }) {
  const [portfolio, setPortfolio] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Scroll to top on mount
    window.scrollTo({ top: 0, behavior: 'smooth' });
    
    // Load portfolio
    async function fetchPortfolio() {
      if (!barber) return;
      try {
        const data = await publicService.getStaffPortfolio(barber.id);
        setPortfolio(data || []);
      } catch (err) {
        console.error("Error fetching portfolio:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchPortfolio();
  }, [barber]);

  const specialty = barber?.specialty || (barber?.role?.includes('Tatuador') ? 'Especialista' : 'Especialista Dental');
  const details = getBarberDetails(barber?.name);
  const stats = getBarberStats(barber);

  return (
    <AnimatePresence>
      {isOpen && barber && (
        <motion.div 
          initial={{ opacity: 0 }} 
          animate={{ opacity: 1 }} 
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] bg-[#e9eae8] overflow-y-auto" style={{ scrollbarWidth: 'none' }}
        >
          <motion.div variants={profileContainerVariants} initial="hidden" animate="show" exit="exit" className="w-full max-w-7xl mx-auto min-h-screen flex flex-col p-4 pt-10 md:pt-4">
            
            {/* Desktop Header */}
            <motion.div variants={profileItemVariants} className="hidden md:flex items-center justify-between py-4 border-b border-[#d9c08f]/15 mb-6 w-full">
              <button onClick={onClose} className="flex items-center gap-1.5 text-[#64748b] hover:text-[#111111] transition-all text-sm font-medium cursor-pointer group">
                <ChevronLeft size={16} className="group-hover:-translate-x-0.5 transition-transform" />
                <span>Volver a Explorar</span>
              </button>
          <div className="flex items-center justify-center">
            <img src={logo} alt="Centro Odontológico Dientes Sanos" className="h-10 object-contain opacity-90" />
          </div>
          <div className="w-[150px]"></div> {/* Spacer */}
          </motion.div>

        {/* Mobile Video Hero */}
        <motion.div variants={profileItemVariants} className="relative h-[420px] -mx-4 -mt-10 mb-6 overflow-hidden rounded-b-[2rem] border border-[#d9c08f]/15 shadow-2xl bg-[#0a0a0d] profile-video-hero z-10 md:hidden">
          <button onClick={onClose} className="absolute top-6 left-6 z-[30] w-10 h-10 rounded-full bg-black/60 backdrop-blur-md border border-white/10 flex items-center justify-center text-white/80 hover:text-white cursor-pointer active:scale-95 transition-all">
            <ChevronLeft size={20} />
          </button>
          
          {barber.video_url || getBarberVideo(barber.name) ? (
            <div className="w-full h-full relative profile-video-inner">
              <video autoPlay loop muted playsInline className="w-full h-full object-cover profile-video-el" style={{ filter: 'brightness(0.85)', objectPosition: 'center top' }}>
                <source src={barber.video_url || getBarberVideo(barber.name)} type={barber.video_url ? (barber.video_url.endsWith('.webm') ? 'video/webm' : 'video/mp4') : 'video/mp4'} />
              </video>
            </div>
          ) : barber.image_url ? (
            <img src={barber.image_url} alt={barber.name} className="w-full h-full object-cover object-top" style={{ filter: 'brightness(0.85)' }} />
          ) : (
            <div className="w-full h-full" style={{ background: 'linear-gradient(135deg,#f7f4ee 0%,#efe6d5 50%,#e8d4b0 100%)' }} />
          )}

          <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0e] via-[#0a0a0e]/30 to-transparent z-[2]"></div>
          
          <div className="absolute bottom-6 left-6 right-6 z-20">
            <div className="relative">
              <div className="urban-stencil-text select-none text-white/10 text-5xl font-black absolute -top-8 -left-2 tracking-tighter">DIENTES SANOS</div>
              <h3 className="font-black text-4xl text-white leading-none tracking-tighter uppercase mb-0.5 drop-shadow-[0_4px_12px_rgba(0,0,0,0.8)]">
                {barber.name}
              </h3>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-[10px] font-black text-white tracking-widest uppercase bg-black/50 px-2 py-0.5 rounded backdrop-blur-sm border border-white/10">
                  {specialty}
                </span>

              </div>
            </div>
          </div>
          </motion.div>

        {/* Mobile Biography */}
        <motion.div variants={profileItemVariants} className="relative urban-industrial-panel bg-white border border-[#d9c08f]/15 rounded-2xl p-5 mb-6 md:hidden">
          <div className="absolute -top-3 left-4 bg-[#e9eae8] px-2">
            <span className="text-[9px] font-black text-[#334155] tracking-widest uppercase">MANIFESTO // {barber.name}</span>
          </div>
          <p className="text-[14px] text-[#334155] leading-relaxed italic font-medium relative z-10 pt-1">
            "{getBarberBiography(barber)}"
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start w-full text-left">
          {/* Left Column (Desktop portrait, Portfolio, Reviews) */}
          <div className="md:col-span-8 space-y-8 w-full">
            
            {/* Desktop Horizontal View */}
            <div className="hidden md:flex gap-6 items-start w-full mb-6">
              <div className="relative w-[250px] h-[340px] rounded-3xl overflow-hidden border border-[#d9c08f]/15 shadow-2xl bg-[#0a0a0d] flex-shrink-0 z-10">
                {barber.video_url || getBarberVideo(barber.name) ? (
                  <video autoPlay loop muted playsInline className="w-full h-full object-cover" style={{ filter: 'brightness(0.85)', objectPosition: 'center top' }}>
                    <source src={barber.video_url || getBarberVideo(barber.name)} type={barber.video_url ? (barber.video_url.endsWith('.webm') ? 'video/webm' : 'video/mp4') : 'video/mp4'} />
                  </video>
                ) : barber.image_url ? (
                  <img src={barber.image_url} alt={barber.name} className="w-full h-full object-cover object-top" style={{ filter: 'brightness(0.85)' }} />
                ) : (
                  <div className="w-full h-full" style={{ background: 'linear-gradient(135deg,#f7f4ee 0%,#efe6d5 50%,#e8d4b0 100%)' }} />
                )}
                <div className="absolute bottom-3 left-3 flex gap-1.5 z-20">
                  <div className="bg-black/60 backdrop-blur-md border border-white/10 px-2 py-0.5 rounded flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                    <span className="text-[7px] font-black text-emerald-400 uppercase tracking-widest">Disponible hoy</span>
                  </div>
                </div>
              </div>

              <div className="flex flex-col flex-1 min-w-0 justify-between h-[340px] py-1">
                <div>
                  <h3 className="font-black text-4xl text-[#111111] leading-none tracking-tight uppercase mb-1">{barber.name}</h3>
                  <div className="text-[11px] font-black text-[#111111] tracking-widest uppercase mb-2">{specialty}</div>
                  
                  <div className="flex items-center gap-1.5 mb-3">
                    <div className="flex gap-0.5">
                      {[1, 2, 3, 4, 5].map(star => <Star key={star} size={11} className="text-amber-400 fill-amber-400" />)}
                    </div>
                    <span className="text-[10px] text-[#334155] font-bold">{details.rating}</span>
                    <span className="text-[10px] text-[#64748b]">({details.reviews_count} reseñas verificadas)</span>
                  </div>
                  
                  <p className="text-[12px] text-[#334155] leading-relaxed font-medium mb-4 max-w-xl">
                    {getBarberBiography(barber)}
                  </p>
                </div>

                <div className="flex items-center justify-between border-t border-b border-[#d9c08f]/15 py-4 w-full">
                  <div className="flex flex-col items-center text-center flex-1">
                    <Scissors size={20} className="text-[#111111] mb-1.5" />
                    <span className="text-xl font-black text-[#0f172a] leading-none mb-1">{details.reviews_count}+</span>
                    <span className="text-[8px] text-[#64748b] font-black uppercase tracking-widest leading-tight">SERVICIOS<br/>REALIZADOS</span>
                  </div>
                  <div className="flex flex-col items-center text-center flex-1 border-l border-[#d9c08f]/15">
                    <CalendarIcon size={20} className="text-[#111111] mb-1.5" />
                    <span className="text-xl font-black text-[#0f172a] leading-none mb-1">{stats.experience.split(' ')[0]}</span>
                    <span className="text-[8px] text-[#64748b] font-black uppercase tracking-widest leading-tight">AÑOS<br/>DE EXPERIENCIA</span>
                  </div>
                  <div className="flex flex-col items-center text-center flex-1 border-l border-[#d9c08f]/15">
                    <Star size={20} className="text-[#111111] mb-1.5" />
                    <span className="text-xl font-black text-[#0f172a] leading-none mb-1">{details.rating}</span>
                    <span className="text-[8px] text-[#64748b] font-black uppercase tracking-widest leading-tight">VALORACIÓN<br/>PROMEDIO</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Specialties */}
            <div className="w-full border-t border-[#d9c08f]/15 pt-4 mb-6 md:block">
              <h4 className="font-extrabold text-[9px] font-black uppercase tracking-widest text-[#64748b] mb-3">ESPECIALIDADES</h4>
              <div className="flex flex-wrap gap-2">
                {details.specialties.map(spec => (
                  <span key={spec} className="px-4 py-1.5 rounded-full bg-white border border-[#d9c08f]/15 text-[#334155] text-[11px] font-bold uppercase tracking-wider">
                    {spec}
                  </span>
                ))}
              </div>
            </div>

            {/* Portfolio */}
            <motion.div variants={profileItemVariants} className="w-full relative">
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-extrabold text-sm text-[#111111] uppercase tracking-widest">TRABAJOS RECIENTES</h4>
                {!loading && portfolio.length > 0 && (
                  <div className="bg-[#f7f7f5] backdrop-blur-md px-3 py-1 rounded-full border border-[#d9c08f]/15">
                    <span className="text-[9px] font-bold text-[#334155] tracking-widest">{portfolio.slice(0, 5).length} FOTOS</span>
                  </div>
                )}
              </div>

              {loading ? (
                <div className="flex gap-4 overflow-x-auto hide-scrollbar pb-6 -mx-4 px-4 snap-x snap-mandatory">
                  {[1, 2, 3, 4].map(i => <div key={i} className="w-[82%] sm:w-[280px] shrink-0 snap-center aspect-[4/5] rounded-[24px] bg-[#f7f7f5] animate-pulse" />)}
                </div>
              ) : portfolio.length === 0 ? (
                <div className="flex items-center justify-center h-32 rounded-3xl border border-[#d9c08f]/15 bg-white border-dashed">
                  <p className="text-xs text-[#64748b] font-bold uppercase tracking-wider">// Sin trabajos recientes</p>
                </div>
              ) : (
                <div className="flex gap-4 overflow-x-auto hide-scrollbar pb-8 -mx-4 px-4 snap-x snap-mandatory items-center" style={{ touchAction: 'pan-x pan-y' }}>
                  {portfolio.slice(0, 5).map(photo => (
                    <div key={photo.id} className="w-[85%] sm:w-[320px] shrink-0 snap-center aspect-[4/5] rounded-[24px] overflow-hidden bg-[#f4f5f3] border border-[#d9c08f]/15 shadow-2xl relative group">
                      <img src={photo.image_url} alt="" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                      <div className="absolute inset-0 bg-gradient-to-b from-black/0 via-black/0 to-black/40 opacity-50 pointer-events-none" />
                    </div>
                  ))}
                </div>
              )}
            </motion.div>

            {/* Reviews */}
            <div className="w-full border-t border-[#d9c08f]/15 pt-6">
              <h4 className="font-extrabold text-xs text-[#111111] uppercase tracking-widest mb-4">LO QUE DICEN SUS CLIENTES</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {details.testimonials.map((test, index) => (
                  <div key={index} className="bg-white border border-[#d9c08f]/15 rounded-2xl p-4">
                    <div className="flex gap-0.5 mb-2">
                      {[1, 2, 3, 4, 5].map(s => <Star key={s} size={9} className="text-amber-400 fill-amber-400" />)}
                    </div>
                    <p className="text-[11px] text-[#334155] leading-relaxed font-medium mb-3 min-h-[48px]">"{test.text}"</p>
                    <div className="flex items-center gap-2 border-t border-[#d9c08f]/15 pt-2.5">
                      <div className="w-6 h-6 rounded-full bg-[#f7f7f5] border border-[#d9c08f]/15 flex items-center justify-center text-[10px] font-black text-[#111111] uppercase flex-shrink-0">
                        {test.client.charAt(0)}
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="text-[10px] font-bold text-[#0f172a] truncate leading-none mb-0.5">{test.client}</span>
                        <span className="text-[8px] text-[#64748b] uppercase tracking-wider truncate leading-none">{test.service}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column (Mobile stats & CTA) */}
          <div className="md:col-span-4 space-y-6 w-full pb-10">
            
            {/* Mobile Stats */}
            <motion.div variants={profileItemVariants} className="md:hidden grid grid-cols-2 gap-3 w-full">
              <div className="bg-white border border-[#d9c08f]/15 rounded-xl p-3 flex flex-row items-center gap-3 h-[68px]">
                <div className="text-3xl font-black leading-none text-[#0f172a]">{stats.services_count}</div>
                <div className="flex flex-col min-w-0">
                  <span className="text-[8px] text-[#64748b] font-black uppercase tracking-widest leading-none mb-0.5">// TRABAJOS</span>
                  <span className="text-[10px] text-[#334155] font-bold uppercase tracking-wider leading-tight">Atenciones</span>
                </div>
              </div>
              <div className="bg-white border border-[#111111]/20 rounded-xl p-3 flex flex-row items-center gap-3 h-[68px]">
                <div className="text-3xl font-black leading-none text-[#111111]">{stats.happy_clients}</div>
                <div className="flex flex-col min-w-0">
                  <span className="text-[8px] text-[#111111]/60 font-black uppercase tracking-widest leading-none mb-0.5">// FEEDBACK</span>
                  <span className="text-[10px] text-[#334155] font-bold uppercase tracking-wider leading-tight">Clientes</span>
                </div>
              </div>
              <div className="bg-white border border-[#d9c08f]/15 rounded-xl p-3 flex flex-row items-center gap-2 h-[68px]">
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-black leading-none text-[#0f172a]">{stats.experience.split(' ')[0]}</span>
                  <span className="text-xs font-bold text-[#334155] lowercase">años</span>
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-[8px] text-[#64748b] font-black uppercase tracking-widest leading-none mb-0.5">// PERFIL</span>
                  <span className="text-[10px] text-[#334155] font-bold uppercase tracking-wider leading-tight">Experiencia</span>
                </div>
              </div>
              <div className="bg-white border border-[#d9c08f]/15 rounded-xl p-3 flex flex-row items-center gap-3 h-[68px]">
                <div className="text-xs font-black text-[#0f172a] leading-none uppercase tracking-tight">{stats.location && stats.location.toLowerCase().includes('sede') ? 'Consultorio' : stats.location}</div>
                <div className="flex flex-col min-w-0">
                  <span className="text-[8px] text-[#64748b] font-black uppercase tracking-widest leading-none mb-0.5">// UBICACIÓN</span>
                  <span className="text-[10px] text-[#334155] font-bold uppercase tracking-wider leading-tight">Principal</span>
                </div>
              </div>
            </motion.div>

            {/* CTA Appears inline on mobile and desktop */}
            <div className="sticky bottom-0 -mx-4 px-4 pt-4 pb-6 bg-[#e9eae8]/95 backdrop-blur-xl border-t border-[#d9c08f]/15 z-20">
              <button
                onClick={() => onBook(barber)}
                className="w-full relative overflow-hidden rounded-2xl py-4 px-6 haptic-bounce group shadow-lg bg-[#e8d4b0] text-[#111111] hover:bg-[#d9c08f] transition-colors"
              >
                <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 bg-gradient-to-r from-transparent via-white/20 to-transparent pointer-events-none" />
                <div className="relative z-10 flex items-center justify-between">
                  <div className="flex flex-col items-start">
                    <span className="text-[#111111]/70 text-[9px] font-black uppercase tracking-[0.2em] leading-none mb-1">Reservar con</span>
                    <span className="text-[#111111] font-black text-lg leading-none tracking-tight">{barber.name}</span>
                  </div>
                  <div className="w-9 h-9 rounded-full bg-white/50 flex items-center justify-center">
                    <ChevronRight size={18} className="text-[#111111]" strokeWidth={3} />
                  </div>
                </div>
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  )}
</AnimatePresence>
  );
}
