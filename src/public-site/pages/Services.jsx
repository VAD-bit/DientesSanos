import { useState, useEffect, useRef } from 'react';
import { Clock, Star, ChevronRight, User, X } from 'lucide-react';
import { publicService } from '../services/publicService';
import QuickBookingModal from '../components/QuickBookingModal';
import BarberProfileOverlay from '../components/BarberProfileOverlay';
import Skeleton from '../components/Skeleton';
import { formatDuration } from '../../utils/formatDuration';

import hero1 from '../../assets/hero1.webp';
import hero3 from '../../assets/hero3.webp';
import hero4 from '../../assets/hero4.webp';
import experienciaCover from '../../assets/experiencia_panda_cover.webp';

const getBarberVideo = () => null;

export default function Services() {
  const [categories, setCategories] = useState([]);
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);

  // QuickBookingModal state
  const [showQuickBook, setShowQuickBook] = useState(false);
  const [quickBookBarber, setQuickBookBarber] = useState(null);
  const [selectedProfile, setSelectedProfile] = useState(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [servicesData, staffData] = await Promise.all([
          publicService.getServices(),
          publicService.getStaff()
        ]);
        
        // Group services (solo categorías dentales exactas)
        const DENTAL_CATEGORIES = ['Estética', 'Ortodoncia', 'Endodoncia', 'Odontopediatría'];
        const grouped = {};
        servicesData.forEach(service => {
          const raw = (service.category || '').toLowerCase();
          const cat = DENTAL_CATEGORIES.find(c => c.toLowerCase() === raw)
            || DENTAL_CATEGORIES.find(c => raw.includes(c.toLowerCase()));
          if (!cat) return;
          if (!grouped[cat]) grouped[cat] = { name: cat, services: [] };
          grouped[cat].services.push(service);
        });

        const finalCategories = Object.values(grouped).sort((a, b) => DENTAL_CATEGORIES.indexOf(a.name) - DENTAL_CATEGORIES.indexOf(b.name));
        setCategories(finalCategories);

        // Filter and sort staff
        const filteredStaff = staffData.filter(s => {
          if (s.active === false) return false;
          const roleLower = (s.role || '').toLowerCase();
          const nameLower = (s.name || '').toLowerCase();
          return !roleLower.includes('admin') && !roleLower.includes('recep') && !roleLower.includes('barista') && !roleLower.includes('asistente') && !nameLower.includes('admin');
        });
        setStaff(filteredStaff);

      } catch (e) {
        console.error('Error loading explore data:', e);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  // Auto-scroll ref
  const carouselRef = useRef(null);

  useEffect(() => {
    let intervalId;
    if (staff.length > 0) {
      intervalId = setInterval(() => {
        if (carouselRef.current) {
          const { scrollLeft, scrollWidth, clientWidth } = carouselRef.current;
          // If we reach the end, scroll back to the beginning
          if (scrollLeft + clientWidth >= scrollWidth - 10) {
            carouselRef.current.scrollTo({ left: 0, behavior: 'smooth' });
          } else {
            // Scroll by one card width (e.g. ~300px)
            carouselRef.current.scrollBy({ left: 300, behavior: 'smooth' });
          }
        }
      }, 3500); // Pass every 3.5 seconds
    }
    return () => clearInterval(intervalId);
  }, [staff]);
  const handleBookStaff = (barber) => {
    setQuickBookBarber(barber);
    setShowQuickBook(true);
  };

  const handleBookService = () => {
    setQuickBookBarber(null);
    setShowQuickBook(true);
  };

  const getServiceImage = (categoryName) => {
    const cat = categoryName.toLowerCase();
    if (cat.includes('ortodoncia')) return hero3;
    if (cat.includes('endodoncia')) return hero1;
    if (cat.includes('odontopediatría')) return experienciaCover;
    if (cat.includes('estética')) return hero4;
    return hero4;
  };

  return (
    <div className="min-h-screen bg-[#e9eae8] pb-6 font-sans selection:bg-[#111111]/30">
      <div className="w-full max-w-5xl 2xl:max-w-[1400px] mx-auto pt-6 px-4 md:px-8 lg:px-10 animate-fade-in-up">
        
        {/* Page Title (iOS native style) */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-[#111111] tracking-tight">Descubrir</h1>
        </div>

        {/* Featured Grid (App Store "Today" style but side-by-side) */}
        <div className="grid grid-cols-2 gap-4 sm:gap-6 mb-8">
          
          <div className="bg-white aspect-[4/3] sm:aspect-[3/2] rounded-[1.5rem] sm:rounded-[2rem] relative overflow-hidden flex flex-col justify-end p-4 sm:p-6 border border-[#d9c08f]/15 shadow-2xl group animate-fade-in-up" style={{ animationDelay: '80ms' }}>
            <div className="absolute inset-0 w-full h-full object-cover opacity-80 group-hover:scale-105 transition-transform duration-700" style={{ objectPosition: 'center 40%', background: 'linear-gradient(135deg,#f7f4ee 0%,#efe6d5 50%,#e8d4b0 100%)' }} aria-hidden="true"></div>
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent"></div>
            <div className="relative z-10 transform group-hover:-translate-y-1 transition-transform duration-500">
              <p className="text-[8px] sm:text-[10px] font-bold text-[#e8d4b0] uppercase tracking-wider mb-0.5 sm:mb-1 shadow-black drop-shadow-lg">NUEVA EXPERIENCIA</p>
              <h2 className="text-lg sm:text-2xl font-bold text-white leading-tight mb-1 sm:mb-2 shadow-black drop-shadow-lg">Tu mejor sonrisa empieza aquí</h2>
              <p className="text-[11px] sm:text-sm text-white/80 shadow-black drop-shadow-lg leading-snug">Reserva con especialistas.</p>
            </div>
          </div>
          
          <div className="bg-white aspect-[4/3] sm:aspect-[3/2] rounded-[1.5rem] sm:rounded-[2rem] relative overflow-hidden flex flex-col justify-end p-4 sm:p-6 border border-[#d9c08f]/15 shadow-2xl group animate-fade-in-up" style={{ animationDelay: '160ms' }}>
            <div className="absolute inset-0 w-full h-full object-cover opacity-50 grayscale group-hover:scale-105 transition-transform duration-700" style={{ background: 'linear-gradient(135deg,#f7f4ee 0%,#efe6d5 50%,#e8d4b0 100%)' }} aria-hidden="true"></div>
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent"></div>
            <div className="relative z-10 transform group-hover:-translate-y-1 transition-transform duration-500">
              <p className="text-[8px] sm:text-[10px] font-bold text-gray-300 uppercase tracking-wider mb-0.5 sm:mb-1 shadow-black drop-shadow-lg">CORTESÍA PREMIUM</p>
              <h2 className="text-lg sm:text-2xl font-bold text-white leading-tight mb-1 sm:mb-2 shadow-black drop-shadow-lg">Más que una consulta</h2>
              <p className="text-[11px] sm:text-sm text-white/80 shadow-black drop-shadow-lg leading-snug">Wi-Fi, café de cortesía y atención personalizada.</p>
            </div>
          </div>

        </div>

        {/* Staff Horizontal Scroll (iOS Contacts Style) */}
        <div className="mb-10 animate-fade-in-up" style={{ animationDelay: '240ms' }}>
          <div className="flex justify-between items-end mb-4">
            <h2 className="text-xl font-bold text-[#111111] tracking-tight">Nuestros Especialistas</h2>
          </div>
          <div className="flex overflow-x-auto snap-x snap-mandatory gap-4 pb-4 scrollbar-none -mx-4 md:-mx-8 lg:-mx-10 px-4 md:px-8 lg:px-10">
            {loading && staff.length === 0 && Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="shrink-0 w-[110px] flex flex-col items-center">
                <Skeleton className="w-20 h-20 rounded-full mb-3" />
                <Skeleton className="w-14 h-3 mb-1.5" />
                <Skeleton className="w-10 h-2.5" />
              </div>
            ))}
            {staff.map(member => (
              <div key={member.id} className="snap-start shrink-0 w-[110px] flex flex-col items-center cursor-pointer group" onClick={() => setSelectedProfile(member)}>
                
                {/* Contenedor relativo exterior que NO corta cosas */}
                <div className="relative mb-3">
                  {/* Contenedor que SÍ recorta la imagen en círculo */}
                  <div className="w-20 h-20 rounded-full bg-white border-2 border-transparent group-hover:border-[#111111] transition-all overflow-hidden shadow-lg">
                    {member.image_url ? (
                      <img src={member.image_url} alt={member.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-[#e9eae8]"><User size={28} className="text-[#111111]/40"/></div>
                    )}
                  </div>
                  {/* Badge absoluto fuera del overflow-hidden */}
                  <div className="absolute -bottom-1 -right-1 bg-white rounded-full p-[2px]">
                    <div className="flex items-center gap-0.5 bg-[#e8d4b0] rounded-full px-1.5 py-0.5 shadow-sm">
                      <Star size={8} className="fill-[#111111] text-[#111111]" />
                      <span className="text-[8px] font-bold text-[#111111]">4.9</span>
                    </div>
                  </div>
                </div>

                <h3 className="text-[13px] font-semibold text-[#0f172a] text-center leading-tight">{member.name.split(' ')[0]}</h3>
                <p className="text-[9px] text-[#64748b] text-center uppercase tracking-wider mt-1 font-medium">{(member.specialty || member.role || 'Profesional').split('|')[0]}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Catalog (iOS Settings List Style) */}
        <div className="">
          {loading && categories.length === 0 && Array.from({ length: 2 }).map((_, catIdx) => (
            <div key={catIdx} className="mb-8">
              <Skeleton className="w-32 h-4 mb-2 ml-4" />
              <div className="bg-white rounded-[1.25rem] overflow-hidden border border-[#d9c08f]/15 shadow-xl">
                {Array.from({ length: 3 }).map((_, rowIdx) => (
                  <div key={rowIdx} className="flex justify-between items-center p-4 pl-5">
                    <div className="flex-1">
                      <Skeleton className="w-32 h-3.5 mb-2" />
                      <Skeleton className="w-16 h-2.5" />
                    </div>
                    <Skeleton className="w-10 h-3.5" />
                  </div>
                ))}
              </div>
            </div>
          ))}
          {categories.map((cat, catIdx) => (
            <div key={cat.name} className="mb-8 animate-fade-in-up" style={{ animationDelay: `${320 + catIdx * 100}ms` }}>
              <h2 className="text-[17px] font-bold text-[#111111] tracking-tight mb-2 pl-4">{cat.name}</h2>
              
              <div className="bg-white rounded-[1.25rem] overflow-hidden border border-[#d9c08f]/15 shadow-xl">
                {cat.services.map((service, idx) => (
                  <div 
                    key={service.id}
                    className="group relative flex justify-between items-center p-4 pl-5 bg-white hover:bg-[#f7f7f5] transition-colors"
                  >
                    <div className="flex-1">
                      <h3 className="text-[15px] font-medium text-[#0f172a]">{service.name}</h3>
                      <div className="flex items-center gap-1.5 mt-0.5 opacity-60 group-hover:opacity-100 transition-opacity">
                        <Clock size={12} className="text-[#64748b]" />
                        <span className="text-[11px] text-[#64748b] font-medium">{formatDuration(service.duration)}</span>
                      </div>
                    </div>
                    <div className="flex items-center pr-2">
                      <span className="text-[15px] font-semibold text-[#111111]">${service.price}</span>
                    </div>
                    
                    {/* Inner border separator (native iOS style) */}
                    {idx !== cat.services.length - 1 && (
                      <div className="absolute bottom-0 right-0 left-5 h-[1px] bg-[#d9c08f]/10"></div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
        
        <div className="mt-10 mb-4 animate-fade-in-up" style={{ animationDelay: '520ms' }}>
          <button onClick={handleBookService} className="w-full py-4 rounded-2xl bg-[#e8d4b0] text-[#111111] font-bold text-[15px] hover:bg-[#d9c08f] hover:scale-[0.98] transition-all shadow-[0_4px_20px_rgba(232,212,176,0.35)]">
            Agendar una Cita
          </button>
        </div>

      </div>

      {/* OVERLAY DE PERFIL */}
      <BarberProfileOverlay 
        isOpen={!!selectedProfile} 
        onClose={() => setSelectedProfile(null)} 
        barber={selectedProfile}
        onBook={() => {
          setSelectedProfile(null);
          handleBookStaff(selectedProfile);
        }}
      />

      {/* MODAL DE RESERVA RAPIDA (Superpuesto en esta misma página) */}
      {showQuickBook && (
        <QuickBookingModal 
          onClose={() => setShowQuickBook(false)}
          initialBarber={quickBookBarber}
        />
      )}
    </div>
  );
}
