import { useState, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { 
  Calendar as CalendarIcon, 
  Clock, 
  User, 
  ChevronLeft, 
  ChevronRight, 
  Check, 
  Scissors, 
  Sparkles, 
  Coffee, 
  Compass,
  Phone, 
  CreditCard, 
  Mail, 
  Lock, 
  MapPin, 
  Eye, 
  EyeOff, 
  Info,
  Star,
  Award,
  Crown,
  ChevronDown,
  ArrowRight,
  PenTool,
  MessageSquare,
  Sunrise,
  Sun,
  Moon,
  GlassWater,
  Gamepad2,
  Heart,
  X,
  ArrowUp,
  Users,
  Activity,
  HeartPulse,
  Baby
} from 'lucide-react';
import { publicService } from '../services/publicService';
import { clearGoogleAuthIntent, GOOGLE_AUTH_DESTINATIONS, setGoogleAuthIntent } from '../utils/googleAuthIntent';
import { formatDuration } from '../../utils/formatDuration';
import { isBookableStaff, isBarberBookableStaff, isTattooBookableStaff, isTattooRole } from '../../utils/staffRoles';
import PandaLoader from '../../components/PandaLoader';
import PandaDatePicker from '../../components/PandaDatePicker';
import { motion, useScroll, useTransform, AnimatePresence } from 'framer-motion';
import HorizontalScrollGallery from '../components/HorizontalScrollGallery';
import { pushService } from '../../services/pushService';

// Import background images and logo
import logo from '../../assets/logo_full.png';
import pandaImg from '../../assets/panda_logo_nobg.png';
import bearBody from '../../assets/oso_saludando.webp';
import bearHand from '../../assets/mano_oso_saludando.webp';
import posterMobile from '../../assets/fondo_panda_telefoon.webp';
import goldChair from '../../assets/gold_chair.webp';
import maskPhoto1 from '../../assets/mural/DSC_7071.webp';
import maskPhoto2 from '../../assets/mural/DSC_7081.webp';
import maskPhoto3 from '../../assets/mural/DSC_7329.webp';
import maskPhoto4 from '../../assets/mural/DSC_7828.webp';
import maskPhoto5 from '../../assets/mural/DSC_7829.webp';
import heroSlide1 from '../../assets/hero1.webp';
import heroSlide2 from '../../assets/hero2.webp';
import heroSlide3 from '../../assets/hero3.webp';
import heroSlide4 from '../../assets/hero4.webp';

const DENTAL_CATEGORIES = ['Estética', 'Ortodoncia', 'Endodoncia', 'Odontopediatría'];

const LEGACY_CATEGORY_KEYS = {
  Kids: 'Odontopediatría',
  Corte: 'Estética',
  Barba: 'Estética',
  Tatuajes: 'Estética',
};

const toWizardCategoryKey = (key) => LEGACY_CATEGORY_KEYS[key] || key || null;

const openCategoryForService = (service) => {
  const category = service?.category || '';
  const nameLower = (service?.name || '').toLowerCase();
  if (DENTAL_CATEGORIES.includes(category)) return category;
  if (category === 'Barbería' || category === 'Servicios' || category === 'Tratamientos' || category === 'Tatuajes' || nameLower.includes('barba') || nameLower.includes('corte')) return 'Estética';
  return null;
};

const staffMatchesArtistFilter = (member, filter) => {
  if (!isBookableStaff(member)) return false;
  if (filter === 'Odontologos') return isBarberBookableStaff(member);
  if (filter === '') return isTattooBookableStaff(member);
  return true;
};

// Import Mural Media Assets
import mural1 from '../../assets/mural/DSC_7071.webp';
import mural2 from '../../assets/mural/DSC_7329.webp';
import mural3 from '../../assets/mural/barberia.webp';
import mural4 from '../../assets/mural/DSC_7081.webp';
import mural5 from '../../assets/mural/479889969.jpg';
import mural7 from '../../assets/mural/DSC_7828.webp';
import mural8 from '../../assets/mural/DSC_7829.webp';
import mural9 from '../../assets/mural/DSC_7837.webp';
import mural10 from '../../assets/mural/DSC_7927.webp';
import mural11 from '../../assets/mural/DSC_7935.webp';


// Neutral sand-gradient placeholder used wherever the old barbershop photos
// (storefront/portfolio) used to appear. Works as an <img src> anywhere.
const NEUTRAL_MEDIA = `data:image/svg+xml,${encodeURIComponent(
  "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 10 10' preserveAspectRatio='none'><defs><linearGradient id='g' x1='0' y1='0' x2='1' y2='1'><stop offset='0' stop-color='#f7f4ee'/><stop offset='.5' stop-color='#efe6d5'/><stop offset='1' stop-color='#e8d4b0'/></linearGradient></defs><rect width='10' height='10' fill='url(#g)'/></svg>"
)}`;

const mockPortfolio = [
  { id: 'ab1', image_url: NEUTRAL_MEDIA },
  { id: 'ab2', image_url: NEUTRAL_MEDIA },
  { id: 'ab3', image_url: NEUTRAL_MEDIA },
  { id: 'ab4', image_url: NEUTRAL_MEDIA },
  { id: 'ab5', image_url: NEUTRAL_MEDIA }
];

import BarberProfileView from '../components/BarberProfileView';

export const getBarberVideo = () => null;

const BARBER_DETAILS = {
  'ángel serrano': {
    rating: '4.9',
    reviews_count: 512,
    specialties: ['Estética dental', 'Blanqueamiento', 'Limpieza', 'Diseño de sonrisa'],
    testimonials: [
      { client: 'Carlos M.', text: 'Excelente atención y mucha precisión en el tratamiento. 100% recomendado.', service: 'Limpieza dental' },
      { client: 'Andrés V.', text: 'La experiencia completa es de otro nivel. Volveré sin duda.', service: 'Blanqueamiento' },
      { client: 'Diego R.', text: 'El ambiente y el servicio son espectaculares. Un gran profesional.', service: 'Diseño de sonrisa' }
    ]
  },
  'moret serrano': {
    rating: '4.8',
    reviews_count: 240,
    specialties: ['Ortodoncia', 'Alineadores', 'Control', 'Estética'],
    testimonials: [
      { client: 'José P.', text: 'Mi alineador quedó impecable, muy detallista en cada revisión.', service: 'Ortodoncia' },
      { client: 'Mateo L.', text: 'Los resultados hablan por sí solos. Muy recomendado.', service: 'Alineadores' },
      { client: 'Santi G.', text: 'Gran trato y un seguimiento espectacular.', service: 'Control ortodóncico' }
    ]
  },
  'abraham díaz': {
    rating: '4.9',
    reviews_count: 310,
    specialties: ['Endodoncia', 'Urgencias', 'Conservadora', 'Diagnóstico'],
    testimonials: [
      { client: 'Javier M.', text: 'Gran profesional. Sabe exactamente lo que necesitas.', service: 'Endodoncia' },
      { client: 'Felipe D.', text: 'Excelente servicio, una experiencia muy relajante.', service: 'Tratamiento de conducto' },
      { client: 'Carlos T.', text: 'El mejor cuidado que me han dado, sin molestias.', service: 'Conservadora' }
    ]
  },
  'alejandro ramírez': {
    rating: '4.7',
    reviews_count: 156,
    specialties: ['Estética', 'Resinas', 'Diseño', 'Color'],
    testimonials: [
      { client: 'Lucas B.', text: 'Súper creativo. El diseño de mi sonrisa es único.', service: 'Diseño de sonrisa' },
      { client: 'Rodrigo S.', text: 'Muy buen resultado y el servicio excelente.', service: 'Resinas estéticas' },
      { client: 'Tomas C.', text: 'Muy buena energía en la clínica y el tratamiento genial.', service: 'Estética dental' }
    ]
  },
  'jeff carrero': {
    rating: '4.8',
    reviews_count: 189,
    specialties: ['Estética', 'Blanqueamiento', 'Resinas', 'Diseño'],
    testimonials: [
      { client: 'Marcos A.', text: 'Excelente trabajo estético y el resultado quedó perfecto.', service: 'Blanqueamiento' },
      { client: 'Daniel V.', text: 'Muy profesional y atento a los detalles.', service: 'Resinas estéticas' },
      { client: 'Juan M.', text: 'Muy buena experiencia, la atención es increíble.', service: 'Limpieza dental' }
    ]
  },
  'juan herrera': {
    rating: '4.9',
    reviews_count: 324,
    specialties: ['Prevención', 'Periodoncia', 'Limpieza', 'Control', 'Asesoría'],
    testimonials: [
      { client: 'Sebastián L.', text: 'Sumamente meticuloso. La limpieza profunda fue una maravilla.', service: 'Limpieza dental' },
      { client: 'Héctor P.', text: 'Gran atención al detalle, el control y la revisión quedaron perfectos.', service: 'Control dental' },
      { client: 'Diego R.', text: 'Mis encías nunca se habían sentido tan bien. Gran profesional.', service: 'Periodoncia' }
    ]
  },
  'mark cardozo': {
    rating: '4.9',
    reviews_count: 420,
    specialties: ['Estética', 'Blanqueamiento', 'Diseño de sonrisa', 'Ortodoncia'],
    testimonials: [
      { client: 'Fabián K.', text: 'Su trabajo es de cirujano. Un resultado minimalista impecable.', service: 'Diseño de sonrisa' },
      { client: 'Matías S.', text: 'Es mi tercera sesión y como siempre, el trato y la precisión de 10.', service: 'Blanqueamiento' },
      { client: 'René P.', text: 'Muy higiénico y profesional, te asesora genial con el plan de tratamiento.', service: 'Estética dental' }
    ]
  },
  'marko cardozo': {
    rating: '4.9',
    reviews_count: 420,
    specialties: ['Estética', 'Blanqueamiento', 'Diseño de sonrisa', 'Ortodoncia'],
    testimonials: [
      { client: 'Fabián K.', text: 'Su trabajo es de cirujano. Un resultado minimalista impecable.', service: 'Diseño de sonrisa' },
      { client: 'Matías S.', text: 'Es mi tercera sesión y como siempre, el trato y la precisión de 10.', service: 'Blanqueamiento' },
      { client: 'René P.', text: 'Muy higiénico y profesional, te asesora genial con el plan de tratamiento.', service: 'Estética dental' }
    ]
  },
  'josé cordero': {
    rating: '4.9',
    reviews_count: 380,
    specialties: ['Estética', 'Resinas', 'Diseño', 'Blanqueamiento'],
    testimonials: [
      { client: 'Julián G.', text: 'Su trabajo estético es increíble, cuidó cada detalle de mi sonrisa.', service: 'Resinas estéticas' },
      { client: 'Franco M.', text: 'Excelente profesional, todo quedó perfecto y muy limpio el consultorio.', service: 'Blanqueamiento' },
      { client: 'Adrián L.', text: 'Muy buena vibra en la sesión y el acabado finísimo.', service: 'Diseño de sonrisa' }
    ]
  },
  'kevin farías': {
    rating: '4.8',
    reviews_count: 215,
    specialties: ['Prevención', 'Limpieza', 'Periodoncia', 'Control'],
    testimonials: [
      { client: 'Samuel D.', text: 'La limpieza y el cuidado de encías con Kevin son espectaculares.', service: 'Limpieza dental' },
      { client: 'Gustavo F.', text: 'Kevin es un experto explicando el tratamiento. Sabe qué conviene a tu boca.', service: 'Control dental' },
      { client: 'Bruno R.', text: 'Atención excelente, muy detallista con cada zona.', service: 'Periodoncia' }
    ]
  },
  'kevin farias': {
    rating: '4.8',
    reviews_count: 215,
    specialties: ['Prevención', 'Limpieza', 'Periodoncia', 'Control'],
    testimonials: [
      { client: 'Samuel D.', text: 'La limpieza y el cuidado de encías con Kevin son espectaculares.', service: 'Limpieza dental' },
      { client: 'Gustavo F.', text: 'Kevin es un experto explicando el tratamiento. Sabe qué conviene a tu boca.', service: 'Control dental' },
      { client: 'Bruno R.', text: 'Atención excelente, muy detallista con cada zona.', service: 'Periodoncia' }
    ]
  },
  'cesia zuleta': {
    rating: '4.9',
    reviews_count: 142,
    specialties: ['Higiene', 'Prevención', 'Urgencias', 'Tratamientos'],
    testimonials: [
      { client: 'Gabriel J.', text: 'La higiene y el cuidado durante la cita son de otro planeta.', service: 'Limpieza dental' },
      { client: 'Nico S.', text: 'Excelente atención y cuidado, muy profesional.', service: 'Prevención' },
      { client: 'Pedro V.', text: 'Muy buena técnica, la cita fue rapidita y sin molestias.', service: 'Higiene dental' }
    ]
  }
};

export const getBarberDetails = (barberName) => {
  const name = barberName?.toLowerCase() || '';
  for (const [key, val] of Object.entries(BARBER_DETAILS)) {
    if (name.includes(key) || key.includes(name)) {
      return val;
    }
  }
  return {
    rating: '4.8',
    reviews_count: 120,
    specialties: ['Estética', 'Prevención', 'Ortodoncia'],
    testimonials: [
      { client: 'Cliente Dientes Sanos', text: 'Excelente servicio, muy profesional y buena onda.', service: 'Limpieza dental' }
    ]
  };
};

const parseBarberBioObj = (barber) => {
  if (barber?.biography && barber.biography.trim().startsWith('{')) {
    try {
      return JSON.parse(barber.biography);
    } catch (e) {
      console.warn("Error parsing barber biography JSON", e);
    }
  }
  return null;
};

export const getNormalizedSpecialty = (barber) => {
  if (barber?.role?.includes('Tatuador')) return 'Especialista Dental';
  const sp = barber?.specialty?.trim().toUpperCase() || '';
  if (!sp || sp === 'BARBERO' || sp === 'BARBERO PROFESIONAL') {
    return 'Especialista Dental';
  }
  return barber.specialty.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(' ');
};

export const getBarberBiography = (barber) => {
  const name = barber?.name?.toLowerCase() || '';
  if (name.includes('kevin')) {
    return 'Especialista certificado en prevención y salud encías. Apasionado por la higiene meticulosa y por explicar cada paso para que tu boca se sienta cuidada.';
  }
  if (name.includes('ángel') || name.includes('angel')) {
    return 'Fundador de Dientes Sanos. Con años de experiencia, me especializo en odontología estética y el cuidado integral de la salud bucal de la más alta calidad.';
  }
  if (name.includes('moret')) {
    return 'Especialista en ortodoncia y alineadores. Apasionado por la precisión de cada control y por lograr sonrisas sanas y bien alineadas.';
  }
  if (name.includes('jeff')) {
    return 'Especialista en estética dental y blanqueamiento. Experto en transformar tu sonrisa cuidando el equilibrio natural de cada pieza dental.';
  }
  if (name.includes('juan')) {
    return 'Maestro en prevención y periodoncia. Me enfoco en brindar una experiencia relajante y un cuidado detallado para que tu sonrisa luzca sana y fuerte.';
  }
  if (name.includes('alejandro')) {
    return 'Especialista en resinas y tratamientos conservadores. Mi objetivo es que cada paciente recupere su sonrisa con un enfoque personalizado y detallado.';
  }
  if (name.includes('abraham')) {
    return 'Experto en endodoncia y tratamientos de conducto. Dedicado al 100% a la precisión milimétrica en cada procedimiento y a la total satisfacción de quienes confían en mis manos.';
  }
  if (name.includes('mark') || name.includes('marco')) {
    return 'Especialista en odontología estética. Combino diseño de sonrisa y blanqueamiento para lograr resultados naturales con máxima precisión e higiene.';
  }
  if (name.includes('josé') || name.includes('jose')) {
    return 'Especialista en estética dental y resinas. Mi pasión es devolver la confianza a tu sonrisa con el máximo detalle y cuidado técnico.';
  }
  if (name.includes('cesia')) {
    return 'Experta en higiene dental, prevención y urgencias. Comprometida con brindarte un momento de confort y tranquilidad antes y después de tu cita.';
  }

  // Fallbacks for database overrides
  const bioObj = parseBarberBioObj(barber);
  if (bioObj && bioObj.bio) {
    return bioObj.bio;
  }
  if (barber?.biography && !barber.biography.trim().startsWith('{') && barber.biography.trim().length > 10) {
    return barber.biography;
  }
  return 'Especialista en prevención, estética y cuidado integral. Enfocado en brindar una experiencia confiable a través de detalles que definen tu sonrisa.';
};

export const getBarberStats = (barber) => {
  const bioObj = parseBarberBioObj(barber);
  const name = barber?.name?.toLowerCase() || '';
  
  // Custom default values based on employee to look more realistic and unique
  let defServices = '324';
  let defHappy = '98%';
  let defExp = '5 años';
  let defLoc = barber?.location || 'Consultorio Central';
  
  if (name.includes('ángel') || name.includes('angel')) {
    defServices = '780+';
    defHappy = '99%';
    defExp = '8 años';
  } else if (name.includes('moret')) {
    defServices = '520+';
    defHappy = '98%';
    defExp = '4 años';
  } else if (name.includes('abraham')) {
    defServices = '310+';
    defHappy = '98.5%';
    defExp = '5 años';
  } else if (name.includes('alejandro')) {
    defServices = '280+';
    defHappy = '96%';
    defExp = '3 años';
  } else if (name.includes('jeff')) {
    defServices = '340+';
    defHappy = '97.5%';
    defExp = '4 años';
  } else if (name.includes('juan')) {
    defServices = '460+';
    defHappy = '98.8%';
    defExp = '6 años';
  } else if (name.includes('mark') || name.includes('marco')) {
    defServices = '220+';
    defHappy = '99.2%';
    defExp = '5 años';
  } else if (name.includes('josé') || name.includes('jose')) {
    defServices = '410+';
    defHappy = '98.6%';
    defExp = '7 años';
  } else if (name.includes('kevin')) {
    defServices = '290+';
    defHappy = '97.8%';
    defExp = '3 años';
  } else if (name.includes('cesia')) {
    defServices = '640+';
    defHappy = '99.5%';
    defExp = '2 años';
  }
  
  return {
    services_count: bioObj?.services_count || defServices,
    happy_clients: bioObj?.happy_clients || defHappy,
    experience: bioObj?.experience || defExp,
    location: bioObj?.location || defLoc
  };
};

// Reusable AnimatedSection component to perform fade-up on scroll reveal
function AnimatedSection({ children, className = "", delay = 0, from = "bottom" }) {
  const ref = useRef(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.unobserve(entry.target);
        }
      },
      { threshold: 0.08 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => { if (ref.current) observer.unobserve(ref.current); };
  }, []);

  const hiddenTransform = from === "left" ? "translateX(-32px)" : from === "right" ? "translateX(32px)" : "translateY(30px)";

  return (
    <div
      ref={ref}
      className={className}
      style={{
        transition: `opacity 650ms cubic-bezier(0.25,1,0.5,1) ${delay}ms, transform 650ms cubic-bezier(0.25,1,0.5,1) ${delay}ms`,
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? 'none' : hiddenTransform,
        willChange: 'opacity, transform',
      }}
    >
      {children}
    </div>
  );
}

// Mounts children only once the ref'd element is about to enter the viewport, instead of
// on a flat timer. Heavy <video> blocks used this via a single setTimeout(1500ms) flag before,
// which meant every gated video (several MB each) started downloading at once regardless of
// scroll position, starving the images/videos actually in view and making them pop in late.
function useLazyMount(rootMargin = '600px 0px') {
  const ref = useRef(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (ready) return;
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setReady(true);
          observer.disconnect();
        }
      },
      { rootMargin, threshold: 0 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [ready, rootMargin]);

  return [ref, ready];
}

// Instagram reel card: extracted so each card gets its own lazy-mount observer
// (can't call hooks per-item inside a plain .map callback in the parent).
function InstagramReelCard({ post, idx, onDoubleClick }) {
  const [ref, ready] = useLazyMount('600px 0px');
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, scale: 0.6, rotate: idx % 2 === 0 ? -6 : 6 }}
      whileInView={{ opacity: 1, scale: 1, rotate: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ duration: 0.8, delay: idx * 0.15, type: "spring", damping: 12, stiffness: 100 }}
      onDoubleClick={onDoubleClick}
      className="group relative aspect-[9/16] rounded-2xl overflow-hidden border border-[#d9c08f]/15 bg-white cursor-pointer select-none"
      title="Próximamente"
    >
      {post.video ? (
        ready && (
          <video
            autoPlay
            loop
            muted
            playsInline
            className="w-full h-full object-cover block transition-transform duration-500 md:group-hover:scale-105"
          >
            <source src={post.video} type="video/mp4" />
          </video>
        )
      ) : (
        <div className="w-full h-full transition-transform duration-500 md:group-hover:scale-105" style={{ background: 'linear-gradient(135deg,#f7f4ee 0%,#efe6d5 50%,#e8d4b0 100%)' }} />
      )}
      {/* Hover Overlay */}
      <div className="absolute inset-0 bg-black/50 opacity-0 md:group-hover:opacity-100 transition-opacity duration-300 flex flex-col items-center justify-center gap-1.5 text-white text-[10px] font-extrabold z-10 pointer-events-none">
        <span className="bg-[#111111] text-white py-1.5 px-3.5 rounded-lg uppercase tracking-wider scale-90 md:group-hover:scale-100 transition-transform duration-300">
          PRÓXIMAMENTE
        </span>
        <span className="text-[7.5px] text-[#d9c08f]/105 uppercase tracking-widest mt-1">Contenido pendiente</span>
      </div>
    </motion.div>
  );
}

// Helper to render beverage icons uniformly without using raw system emojis
const renderBeverageIcon = (beverageName, size = 16, className = "text-[var(--champagne)]") => {
  if (!beverageName) return null;
  const name = beverageName.toLowerCase();
  if (name.includes('café') || name.includes('cafe') || name.includes('espresso') || name.includes('expreso')) return <Coffee size={size} className={className} />;
  return <GlassWater size={size} className={className} />;
};

// Minimal beard glyph used in the popular-services grid (lucide has no beard icon)
const BeardIcon = ({ size = 26, className = "landing-service-icon" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M6 5c0 0-.6 7 1.2 10.5C8.7 18.4 10.2 20 12 20s3.3-1.6 4.8-4.5C18.6 12 18 5 18 5" />
    <path d="M8.5 5.5c0 1.8 1.4 3 3.5 3s3.5-1.2 3.5-3" />
  </svg>
);

// Pick an icon for a service based on its name/category to match the popular-services design
const getServiceIcon = (service) => {
  const n = (service?.name || '').toLowerCase();
  const c = (service?.category || '').toLowerCase();
  if (n.includes('premium') || c.includes('premium')) return <Crown size={26} className="landing-service-icon" />;
  const hasCorte = n.includes('corte');
  const hasBarba = n.includes('barba');
  if (hasCorte && hasBarba) {
    return (
      <span style={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Scissors size={20} className="landing-service-icon" />
        <BeardIcon size={20} />
      </span>
    );
  }
  if (hasBarba) return <BeardIcon size={26} />;
  if (n.includes('tatu')) return <PenTool size={26} className="landing-service-icon" />;
  return <Scissors size={26} className="landing-service-icon" />;
};

// Availability is now controlled solely by the manual "Abierta/Cerrada" toggle
// (system_settings.store_is_open), not by a weekly schedule — while open, clients
// can book any slot around the clock.
function generateTimeSlotsForDate() {
  const slots = [];
  for (let hour = 0; hour < 24; hour++) {
    for (let min = 0; min < 60; min += 30) {
      slots.push(`${String(hour).padStart(2, '0')}:${String(min).padStart(2, '0')}`);
    }
  }
  return slots;
}

// Convert "09:00" to "9:00 AM", "14:30" to "2:30 PM" etc
function formatTime12(time24) {
  if (!time24) return '';
  const [h, m] = time24.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const hour12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${hour12}:${String(m).padStart(2, '0')} ${period}`;
}

// Check if a time slot is in the past (for today)
function isTimePast(time24) {
  const now = new Date();
  const [h, m] = time24.split(':').map(Number);
  return h < now.getHours() || (h === now.getHours() && m <= now.getMinutes());
}

// Custom Barber Avatar component that falls back gracefully if image is missing or fails to load
function BarberAvatar({ url, name, className = "w-10 h-10 rounded-xl", iconSize = 16 }) {
  const [error, setError] = useState(!url);

  useEffect(() => {
    setError(!url);
  }, [url]);

  if (error) {
    return (
      <div className={`${className} flex items-center justify-center bg-[#f7f7f5] border border-[#d9c08f]/20 flex-shrink-0`}>
        <User size={iconSize} className="text-[#111111]" />
      </div>
    );
  }

  const isAbraham = name?.toLowerCase().includes('abraham');
  const positionClass = isAbraham ? '' : 'object-top';

  return (
    <img
      src={url}
      alt={name}
      onError={() => setError(true)}
      className={`${className} object-cover ${positionClass} border border-[#d9c08f]/20 flex-shrink-0`}
      style={isAbraham ? { objectPosition: 'center 18%' } : {}}
    />
  );
}


// Wizard step transitions. `custom` carries the direction (+1 forward, -1 back) so the
// outgoing step leaves toward the opposite side the incoming one arrives from.
const stepVariants = {
  enter: (dir) => ({ opacity: 0, x: dir * 28, filter: 'blur(4px)' }),
  center: { opacity: 1, x: 0, filter: 'blur(0px)' },
  exit: (dir) => ({ opacity: 0, x: dir * -28, filter: 'blur(4px)' }),
};

const STEP_ENTER_TRANSITION = { duration: 0.42, ease: [0.16, 1, 0.3, 1] };
const STEP_EXIT_TRANSITION = { duration: 0.2, ease: [0.4, 0, 1, 1] };

// Header copy crossfades in place; no horizontal travel so the layout stays put.
const stepHeaderVariants = {
  enter: { opacity: 0, y: 8 },
  center: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
};

const FadeInUp = ({ children, delay = 0, className = "", ...props }) => (
  <motion.div
    initial={{ opacity: 0, scale: 0.95 }}
    whileInView={{ opacity: 1, scale: 1 }}
    viewport={{ once: true, margin: "-100px" }}
    transition={{ duration: 0.8, delay: delay, ease: [0.21, 0.47, 0.32, 0.98] }}
    className={className}
    {...props}
  >
    {children}
  </motion.div>
);

export default function BookAppointment({ isEmbedded = false }) {
  // El interruptor manual del dashboard (system_settings.store_is_open) es el único
  // control de disponibilidad: abierto = se puede reservar cualquier hora, cerrado =
  // no se puede agendar en absoluto. Se relee cada 60 s para reflejar el cambio del dueño.
  const [storeIsOpen, setStoreIsOpen] = useState(true);

  useEffect(() => {
    let alive = true;
    const sync = async () => {
      try {
        const open = await publicService.getStoreOpen();
        if (alive) setStoreIsOpen(open);
      } catch { /* mantener último */ }
    };
    sync();
    const interval = setInterval(sync, 60000);
    return () => { alive = false; clearInterval(interval); };
  }, []);

  const storeStatus = storeIsOpen
    ? { isOpen: true, text: 'Abierto · Reservas disponibles' }
    : { isOpen: false, text: 'Cerrado temporalmente · No se puede agendar' };

  const navigate = useNavigate();
  const location = useLocation();
const videoRef = useRef(null);

  const reviewsCarouselRef = useRef(null);

  const [showWelcome, setShowWelcome] = useState(() => {
    if (location.state?.startBooking || location.pathname.includes('/perfil') || location.state?.exploreBarbers) return false;
    const saved = localStorage.getItem('bookingState');
    return saved ? JSON.parse(saved).showWelcome : true;
  });

  // Auto-scroll reviews carousel
  useEffect(() => {
    if (showWelcome) {
      const interval = setInterval(() => {
        const el = reviewsCarouselRef.current;
        if (el) {
          const { scrollLeft, scrollWidth, clientWidth } = el;
          const isEnd = Math.ceil(scrollLeft + clientWidth) >= scrollWidth - 10;
          if (isEnd) {
            el.scrollTo({ left: 0, behavior: 'smooth' });
          } else {
            // Step by the actual card width + gap (24px, gap-6) instead of a fixed guess —
            // a mismatched step drifts out of sync with the snap points every cycle, so no
            // card ever lands centered.
            const card = el.querySelector('[data-review-card]');
            const step = card ? card.offsetWidth + 24 : 330;
            el.scrollBy({ left: step, behavior: 'smooth' });
          }
        }
      }, 3500);
      return () => clearInterval(interval);
    }
  }, [showWelcome]);

  const [videoBlocked, setVideoBlocked] = useState(false);

  // Force video playback to bypass some mobile browser restrictions
  useEffect(() => {
    if (videoRef.current && showWelcome) {
      videoRef.current.defaultMuted = true;
      videoRef.current.muted = true;
      videoRef.current.play().catch(e => {
        console.log('Autoplay blocked by browser:', e);
        setVideoBlocked(true);
      });
    }
  }, [showWelcome]);

  const [isDesktop, setIsDesktop] = useState(window.innerWidth >= 1024);
  const [visibleCount, setVisibleCount] = useState(() => {
    if (window.innerWidth >= 1200) return 5;
    if (window.innerWidth >= 768) return 3;
    return 1;
  });
  const [isScrolled, setIsScrolled] = useState(false);
  const [showBackToTop, setShowBackToTop] = useState(false);
  const progressRingRef = useRef(null);
  const [showExperienceModal, setShowExperienceModal] = useState(false);
  const [artistFilter, setArtistFilter] = useState('todos');

  const [muralVideoRef] = useLazyMount('600px 0px');
  const [cafeVideoRef] = useLazyMount('600px 0px');
  const [kidsVideoRef] = useLazyMount('600px 0px');
  // Solo controla el fade de la FOTO del hero (texto y CTA aparecen aparte, de inmediato,
  // sin esperarla) — se activa cuando la imagen realmente termino de cargar, no con un
  // timer ciego, para que el fade se vea sincronizado con la llegada real de la foto.
  const [heroPhotoLoaded, setHeroPhotoLoaded] = useState(false);
  const [activeMuralIdx, setActiveMuralIdx] = useState(0);
  const [showFooterReveal, setShowFooterReveal] = useState(false);
  const [bentoEditMode, setBentoEditMode] = useState(false);
  const [selectedMuralItem, setSelectedMuralItem] = useState(null);
  const [cursorPos, setCursorPos] = useState({ x: 0, y: 0 });
  const [isHoveringMural, setIsHoveringMural] = useState(false);
  const [pandaOffset, setPandaOffset] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setPandaOffset(prev => prev + 1);
    }, 2500);
    return () => clearInterval(interval);
  }, []);
  const [bentoGridItems, setBentoGridItems] = useState([
    { id: 1, type: 'video', src: null, tag: 'Experiencia', title: 'Dientes Sanos', colSpan: 3, rowSpan: 6, posX: 50, posY: 50 },
    { id: 2, type: 'image', src: mural3, tag: 'Cuidado', title: 'Prevención', colSpan: 3, rowSpan: 4, posX: 38, posY: 26 },
    { id: 3, type: 'image', src: mural1, tag: 'Estética', title: 'Precisión', colSpan: 3, rowSpan: 4, posX: 50, posY: 50 },
    { id: 4, type: 'video', src: null, tag: 'Relax', title: 'Consulta', colSpan: 3, rowSpan: 6, posX: 50, posY: 50 },
    { id: 10, type: 'image', src: mural9, tag: 'Comunidad', title: 'La Experiencia', colSpan: 3, rowSpan: 5, posX: 35, posY: 11 },
    { id: 6, type: 'image', src: mural4, tag: 'Atención', title: 'Detalles', colSpan: 3, rowSpan: 5, posX: 50, posY: 18 },
    { id: 7, type: 'image', src: mural5, tag: 'Café', title: 'Disfruta', colSpan: 3, rowSpan: 6, posX: 50, posY: 52 },
    { id: 5, type: 'image', src: mural2, tag: 'Diseño', title: 'Tu Sonrisa', colSpan: 3, rowSpan: 6, posX: 50, posY: 67 },
    { id: 9, type: 'image', src: mural8, tag: 'Premium', title: 'Tu Momento', colSpan: 3, rowSpan: 3, posX: 50, posY: 88 },
    { id: 8, type: 'image', src: mural7, tag: 'Resultados', title: 'Antes y Después', colSpan: 3, rowSpan: 3, posX: 46, posY: 29 },
  ]);

  const [isTransitioning, setIsTransitioning] = useState(false);
  const [isReturning, setIsReturning] = useState(false);
  const [hasVisited, setHasVisited] = useState(() => {
    const saved = localStorage.getItem('bookingState');
    return saved ? JSON.parse(saved).hasVisited : false;
  });
  const [step, setStep] = useState(() => {
    if (location.state?.exploreBarbers) return 2;
    if (location.state?.startBooking) return 1;
    const saved = localStorage.getItem('bookingState');
    return saved ? JSON.parse(saved).step : 1;
  });
  // Direction of the wizard transition: +1 going forward, -1 going back. Derived during
  // render (not in an effect) so the animation for this step uses the right direction.
  const stepDirRef = useRef(step);
  const stepDirection = step >= stepDirRef.current ? 1 : -1;
  useEffect(() => { stepDirRef.current = step; }, [step]);
  const [stepKey, setStepKey] = useState(0);

  // Reseñas de Google (tabla `google_reviews`). Si está vacía, el badge del hero y la
  // sección #resenas quedan en espera — listos para conectar con las reseñas reales.
  const [googleReviews, setGoogleReviews] = useState([]);
  useEffect(() => {
    let alive = true;
    publicService.getGoogleReviews().then(r => { if (alive) setGoogleReviews(r); });
    return () => { alive = false; };
  }, []);
  const googleRating = googleReviews.length
    ? (googleReviews.reduce((s, r) => s + (Number(r.rating) || 5), 0) / googleReviews.length).toFixed(1)
    : null;

  const autoStartHandledRef = useRef(null);
  // Set by the draft-restore effect below when it repopulates the wizard from a
  // panda_draft_booking left before a login/registration redirect. Read by the
  // startBooking effect so it doesn't stomp the just-restored step back to 1.
  const draftRestoredRef = useRef(false);
  const autoResumeAttemptedRef = useRef(false);
  const [resumeBookingAfterAuth, setResumeBookingAfterAuth] = useState(false);
  const [services, setServices] = useState([]);
  const [barbers, setBarbers] = useState([]);
  const [barberStartIndex, setBarberStartIndex] = useState(0);
  const scrollContainerRef = useRef(null);
  const teamScrollRef = useRef(null);
  const timeSlotsRef = useRef(null);
  const bookingSummaryRef = useRef(null);
  const muralGridRef = useRef(null);

  const { scrollYProgress: muralScrollY } = useScroll({
    target: muralGridRef,
    container: scrollContainerRef,
    offset: ["start end", "end start"]
  });
  const yParallaxOdd = useTransform(muralScrollY, [0, 1], [30, -30]);
  const yParallaxEven = useTransform(muralScrollY, [0, 1], [-20, 20]);
  const muralOpacity = useTransform(muralScrollY, [0.6, 0.9], [1, 0]);
  const muralScale = useTransform(muralScrollY, [0.6, 0.9], [1, 0.95]);

  // --- Premium Parallax Footer Reveal ---
  const footerRef = useRef(null);
  const { scrollYProgress } = useScroll({
    target: footerRef,
    container: scrollContainerRef,
    offset: ["start end", "end end"]
  });
  // Empuja el footer hacia abajo al principio para crear el efecto "reveal" de subir
  const footerY = useTransform(scrollYProgress, [0, 1], [180, 0]);


  // Soporte de Swipe (deslizar con el dedo / arrastrar con el mouse) para el carrusel de equipo
  const touchStartX = useRef(null);
  const touchEndX = useRef(null);
  const mouseStartX = useRef(null);
  const isMouseDown = useRef(false);
  const minSwipeDistance = 50;

  const handleTouchStart = (e) => {
    touchStartX.current = e.touches[0].clientX;
    touchEndX.current = e.touches[0].clientX;
  };

  const handleTouchMove = (e) => {
    touchEndX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = () => {
    if (!touchStartX.current || !touchEndX.current) return;
    const distance = touchStartX.current - touchEndX.current;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;

    const filteredCount = barbers.filter(barber => staffMatchesArtistFilter(barber, artistFilter)).length;

    const maxIndex = Math.max(0, filteredCount - visibleCount);

    if (isLeftSwipe) {
      if (barberStartIndex < maxIndex) {
        pauseTeamCarousel();
        setBarberStartIndex(prev => Math.min(maxIndex, prev + 1));
      }
    } else if (isRightSwipe) {
      if (barberStartIndex > 0) {
        pauseTeamCarousel();
        setBarberStartIndex(prev => Math.max(0, prev - 1));
      }
    }
    
    touchStartX.current = null;
    touchEndX.current = null;
  };

  const handleMouseDown = (e) => {
    // Solo si no es un clic en un botón o elemento interactivo
    if (e.target.closest('button') || e.target.closest('a')) return;
    mouseStartX.current = e.clientX;
    isMouseDown.current = true;
  };

  const handleMouseMove = (e) => {
    if (!isMouseDown.current) return;
  };

  const handleMouseUp = (e) => {
    if (!isMouseDown.current || mouseStartX.current === null) return;
    const distance = mouseStartX.current - e.clientX;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;

    const filteredCount = barbers.filter(barber => staffMatchesArtistFilter(barber, artistFilter)).length;

    const maxIndex = Math.max(0, filteredCount - visibleCount);

    if (isLeftSwipe) {
      if (barberStartIndex < maxIndex) {
        pauseTeamCarousel();
        setBarberStartIndex(prev => Math.min(maxIndex, prev + 1));
      }
    } else if (isRightSwipe) {
      if (barberStartIndex > 0) {
        pauseTeamCarousel();
        setBarberStartIndex(prev => Math.max(0, prev - 1));
      }
    }

    isMouseDown.current = false;
    mouseStartX.current = null;
  };

  const handleMouseLeave = () => {
    isMouseDown.current = false;
    mouseStartX.current = null;
  };

  // Experience modal media is a static placeholder (no video), so there is no
  // autoplay workaround to run when it opens.

  const heroSlides = [heroSlide1, heroSlide2, heroSlide3, heroSlide4];
  const [currentSlide, setCurrentSlide] = useState(0);

  useEffect(() => {
    if (!showWelcome) return;
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % 4);
    }, 4000);
    return () => clearInterval(interval);
  }, [showWelcome]);

  // Autoplay for the Artists Carousel - pauses whenever the user interacts (arrows or tapping a card)
  const nextAutoAdvanceAtRef = useRef(0);
  const pauseTeamCarousel = () => {
    nextAutoAdvanceAtRef.current = Date.now() + 4500;
  };
  useEffect(() => {
    if (!showWelcome) return;

    const activeFilter = artistFilter;
    const filteredCount = barbers.filter(barber => staffMatchesArtistFilter(barber, activeFilter)).length;

    if (filteredCount <= visibleCount) {
      setBarberStartIndex(0);
      return;
    }

    nextAutoAdvanceAtRef.current = Date.now() + 4500;

    const interval = setInterval(() => {
      if (Date.now() < nextAutoAdvanceAtRef.current) return; // paused by recent user interaction
      nextAutoAdvanceAtRef.current = Date.now() + 4500;
      setBarberStartIndex(prev => {
        const maxIndex = filteredCount - visibleCount;
        if (prev >= maxIndex) {
          return 0; // Wrap around to the start
        }
        return prev + 1;
      });
    }, 500); // Poll every 500ms, but only advance every 4.5s of inactivity

    return () => clearInterval(interval);
  }, [barbers, artistFilter, showWelcome, visibleCount]);

  useEffect(() => {
    const handleResize = () => {
      setIsDesktop(window.innerWidth >= 1024);
      if (window.innerWidth >= 1200) {
        setVisibleCount(5);
      } else if (window.innerWidth >= 768) {
        setVisibleCount(3);
      } else {
        setVisibleCount(1);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const img = new Image();
    img.src = heroSlide1;
    img.onload = () => setHeroPhotoLoaded(true);
    // Red lenta o la imagen ya esta en cache y el evento no llega a tiempo: no dejar la
    // foto invisible para siempre.
    const fallbackTimer = setTimeout(() => setHeroPhotoLoaded(true), 1800);
    if (img.complete) setHeroPhotoLoaded(true);
    return () => clearTimeout(fallbackTimer);
  }, []);


  // Step 1 category thumbnails are static placeholders (no network images), so there is
  // nothing to preload while the user is on the welcome screen.

  // Hide layout header during active booking wizard flow
  useEffect(() => {
    if (!showWelcome) {
      document.body.classList.add('hide-public-header');
    } else {
      document.body.classList.remove('hide-public-header');
    }
    return () => {
      document.body.classList.remove('hide-public-header');
    };
  }, [showWelcome]);

  // Scroll reveal observer system
  useEffect(() => {
    if (!showWelcome) return;
    
    const observerOptions = {
      root: null,
      rootMargin: '0px 0px -8% 0px',
      threshold: 0.05
    };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-revealed');
          observer.unobserve(entry.target);
        }
      });
    }, observerOptions);

    const timer = setTimeout(() => {
      const elements = document.querySelectorAll('.reveal-item');
      elements.forEach(el => observer.observe(el));
    }, 100);

    return () => {
      clearTimeout(timer);
      const elements = document.querySelectorAll('.reveal-item');
      elements.forEach(el => observer.unobserve(el));
    };
  }, [showWelcome]);

  useEffect(() => {
    if (showWelcome) {
      document.body.classList.remove('in-booking-flow');
    } else {
      document.body.classList.add('in-booking-flow');
    }
    return () => {
      document.body.classList.remove('in-booking-flow');
    };
  }, [showWelcome]);

  useEffect(() => {
    if (isScrolled && showWelcome) {
      document.body.classList.add('is-scrolled');
    } else {
      document.body.classList.remove('is-scrolled');
    }
    return () => {
      document.body.classList.remove('is-scrolled');
    };
  }, [isScrolled, showWelcome]);

  useEffect(() => {
    if (!showWelcome) {
      setIsScrolled(false);
      setShowBackToTop(false);
      return;
    }

    let observer;
    const initObserver = () => {
      const sentinel = document.getElementById('hero-sentinel');
      if (!sentinel) return;

      observer = new IntersectionObserver((entries) => {
        const [entry] = entries;
        setIsScrolled(!entry.isIntersecting);
      }, {
        threshold: 0
      });

      observer.observe(sentinel);
    };

    const timer = setTimeout(initObserver, 100);

    return () => {
      clearTimeout(timer);
      if (observer) {
        observer.disconnect();
      }
    };
  }, [showWelcome]);

  // The landing scrolls inside .landing-scroll-container, not the window, so window
  // scroll listeners never fire here. Bound via onScroll on that container.
  //
  // scrollProgress used to be React state, re-set on every single scroll event. That
  // meant every scroll tick re-rendered this entire (huge) component tree, which on a
  // real phone saturates the main thread badly enough that taps — e.g. on the hamburger
  // button — get delayed or dropped. It only ever feeds one <circle>'s strokeDashoffset,
  // so it's written straight to the DOM via a ref instead, skipping React entirely.
  const handleLandingScroll = (e) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    setIsScrolled(scrollTop > 80);
    setShowBackToTop(scrollTop > 600);
    const max = scrollHeight - clientHeight;
    const progress = max > 0 ? Math.min(scrollTop / max, 1) : 0;
    if (progressRingRef.current) {
      progressRingRef.current.style.strokeDashoffset = 138.2 * (1 - progress);
    }
  };

  const scrollLandingToTop = () => {
    const scroller = document.querySelector('.landing-scroll-container') || scrollContainerRef.current;
    if (scroller) scroller.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleScrollTo = (id) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };
  
  // Selections
  const [selectedCategory, setSelectedCategory] = useState(() => {
    const saved = localStorage.getItem('bookingState');
    return saved ? toWizardCategoryKey(JSON.parse(saved).selectedCategory) : 'Estética';
  });
  const [openCategory, setOpenCategory] = useState(() => toWizardCategoryKey(location.state?.openCategory));
  const [selectedService, setSelectedService] = useState(() => {
    const saved = localStorage.getItem('bookingState');
    return saved ? JSON.parse(saved).selectedService : null;
  });
  const [selectedBarber, setSelectedBarber] = useState(() => {
    const saved = localStorage.getItem('bookingState');
    return saved ? JSON.parse(saved).selectedBarber : null;
  });
  const [showInlineEdit, setShowInlineEdit] = useState(false);
  const [isInlineEditOpen, setIsInlineEditOpen] = useState(false);
  const [inlineEditTab, setInlineEditTab] = useState('barber');
  
  const handleOpenInlineEdit = () => {
    setShowInlineEdit(true);
    setTimeout(() => {
      setIsInlineEditOpen(true);
    }, 20);
  };

  const handleCloseInlineEdit = () => {
    setIsInlineEditOpen(false);
    setTimeout(() => {
      setShowInlineEdit(false);
    }, 300);
  };
  const [expandedBarber, setExpandedBarber] = useState(() => {
    const saved = localStorage.getItem('bookingState');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return parsed.expandedBarber || null;
      } catch {
        return null;
      }
    }
    return null;
  });
  const [expandedBarberPortfolio, setExpandedBarberPortfolio] = useState([]);
  const [profileActivePeriod, setProfileActivePeriod] = useState('mañana');
  const landingReturnScrollRef = useRef(null);
  const shouldRestoreLandingScrollRef = useRef(false);

  const rememberLandingScrollPosition = () => {
    const container = document.querySelector('.landing-scroll-container') || scrollContainerRef.current;
    landingReturnScrollRef.current = container?.scrollTop ?? null;
  };

  // The landing is mounted again after closing a public staff profile. Restore
  // its position after the step-change scroll reset has finished, otherwise the
  // user is sent back to the hero instead of the team card they came from.
  useEffect(() => {
    if (!showWelcome || !shouldRestoreLandingScrollRef.current) return undefined;

    const restoreLandingPosition = () => {
      const container = document.querySelector('.landing-scroll-container') || scrollContainerRef.current;
      const teamSection = document.getElementById('equipo');
      if (!container || !teamSection) return;

      const savedTop = landingReturnScrollRef.current;
      if (Number.isFinite(savedTop)) {
        container.scrollTo({ top: savedTop, left: 0, behavior: 'auto' });
      } else {
        const containerRect = container.getBoundingClientRect();
        const teamRect = teamSection.getBoundingClientRect();
        container.scrollTo({
          top: container.scrollTop + teamRect.top - containerRect.top,
          left: 0,
          behavior: 'auto'
        });
      }
    };

    // The last pass runs after the existing step-change reset (60 ms) and after
    // the welcome layout has recovered its final dimensions.
    const timers = [0, 90, 220].map((delay, index, delays) => setTimeout(() => {
      restoreLandingPosition();
      if (index === delays.length - 1) {
        shouldRestoreLandingScrollRef.current = false;
        landingReturnScrollRef.current = null;
      }
    }, delay));

    return () => timers.forEach(clearTimeout);
  }, [showWelcome]);

  // Applies the barberId that arrived via Explorar's { exploreBarbers, barberId }
  // navigation state exactly once. Without exploreDeepLinkAppliedRef, this re-ran
  // on every expandedBarber change (it was in the dependency array) — including
  // the change fired by clicking a different barber in "También podrías reservar
  // con" inside the profile — and since location.state.barberId never updates
  // after the initial navigation, it kept finding a mismatch and snapping
  // expandedBarber straight back to the original barber, so switching looked
  // like it silently did nothing.
  const exploreDeepLinkAppliedRef = useRef(false);
  useEffect(() => {
    if (exploreDeepLinkAppliedRef.current) return;
    if (location.state?.exploreBarbers && location.state?.barberId && barbers.length > 0) {
      const barberToExpand = barbers.find(b => b.id === location.state.barberId);
      if (barberToExpand) {
        exploreDeepLinkAppliedRef.current = true;
        setExpandedBarber(barberToExpand);
      }
    }
  }, [location.state, barbers]);


  const loadExpandedPortfolio = async (barberId) => {
    if (!barberId) return;
    setPortfolioLoading(true);
    try {
      const data = await publicService.getStaffPortfolio(barberId);
      if (data && data.length > 0) {
        setExpandedBarberPortfolio(data.slice(0, 5));
      } else {
        setExpandedBarberPortfolio(mockPortfolio);
      }
    } catch (err) {
      console.error("Error loading expanded barber portfolio:", err);
      setExpandedBarberPortfolio(mockPortfolio);
    } finally {
      setPortfolioLoading(false);
    }
  };
  const [portfolioFilter, setPortfolioFilter] = useState('Todos');
  const filteredPortfolio = useMemo(() => {
    if (portfolioFilter === 'Todos') return expandedBarberPortfolio;
    return expandedBarberPortfolio.filter(photo => {
      const idNum = photo.id || 0;
      if (portfolioFilter === 'Cortes') return idNum % 3 === 0;
      if (portfolioFilter === 'Barba') return idNum % 3 === 1;
      if (portfolioFilter === 'Clásicos') return idNum % 4 === 0;
      if (portfolioFilter === 'Diseños') return idNum % 4 === 1;
      return true;
    });
  }, [expandedBarberPortfolio, portfolioFilter]);
  const [activeTeamCardId, setActiveTeamCardId] = useState(null);
  const isTouchDevice = useMemo(() => (
    typeof window !== 'undefined' && window.matchMedia('(hover: none), (pointer: coarse)').matches
  ), []);
  const [barberSearchQuery, setBarberSearchQuery] = useState('');
  const [profileSourceStep, setProfileSourceStep] = useState(1);
  const [portfolioLoading, setPortfolioLoading] = useState(false);
  const [activeLightboxImage, setActiveLightboxImage] = useState(null);
  const [toast, setToast] = useState(null);

  // Clear barber search when step or selected category changes
  useEffect(() => {
    setBarberSearchQuery('');
  }, [step, selectedCategory]);
  const [favorites, setFavorites] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('favorite_barbers') || '[]');
    } catch {
      return [];
    }
  });

  // Per-barber sidebar photo framing (object-position Y% and zoom), hand-tuned once in the browser
  // via the adjuster tool and baked in here as fixed values.
  const BARBER_PHOTO_ADJUSTMENTS = {
    'e626110d-f138-42aa-bf00-562165c6f6cc': { y: 10, zoom: 1 },
    '98f7a4a3-a654-4ed8-a0d3-8af409a89384': { y: 40, zoom: 1 },
    'ea21d6b0-b86c-4bed-97d4-3f3dc85c0d32': { y: 30, zoom: 1 },
    'd625e8c7-2054-4099-be6e-43cb24a365cb': { y: 20, zoom: 1 },
    '24bfdf6d-9560-43c2-b1d0-78ee74d9acfb': { y: 10, zoom: 1 },
    'efd17bae-d4d4-495f-9caf-227d94aa962e': { y: 10, zoom: 1 },
    '2e981a1a-c0b3-4e30-ab4c-766ea6d6805e': { y: 20, zoom: 1 }, // José Cordero (tatuador)
  };
  const getPhotoAdjustment = (barberId) => BARBER_PHOTO_ADJUSTMENTS[barberId] || { y: 0, zoom: 1 };
  const [barberOfMonth, setBarberOfMonth] = useState(null);
  const [topClients, setTopClients] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [topBarberPortfolio, setTopBarberPortfolio] = useState([
    { id: 'ab1', image_url: NEUTRAL_MEDIA },
    { id: 'ab2', image_url: NEUTRAL_MEDIA },
    { id: 'ab3', image_url: NEUTRAL_MEDIA },
    { id: 'ab4', image_url: NEUTRAL_MEDIA }
  ]);

  useEffect(() => {
    const topBarber = barberOfMonth || barbers.find(b => b.name.toLowerCase().includes('abraham')) || (barbers.length > 0 ? barbers[0] : null);
    if (topBarber?.id) {
      publicService.getStaffPortfolio(topBarber.id).then(data => {
        if (data && data.length > 0) {
          setTopBarberPortfolio(data);
        } else {
          setTopBarberPortfolio([
            { id: 'ab1', image_url: NEUTRAL_MEDIA },
            { id: 'ab2', image_url: NEUTRAL_MEDIA },
            { id: 'ab3', image_url: NEUTRAL_MEDIA },
            { id: 'ab4', image_url: NEUTRAL_MEDIA }
          ]);
        }
      }).catch(() => {
        setTopBarberPortfolio([
          { id: 'ab1', image_url: NEUTRAL_MEDIA },
          { id: 'ab2', image_url: NEUTRAL_MEDIA },
          { id: 'ab3', image_url: NEUTRAL_MEDIA },
          { id: 'ab4', image_url: NEUTRAL_MEDIA }
        ]);
      });
    }
  }, [barberOfMonth, barbers]);
  // One-time migration: the hero was recomposed (text left / bear right), so the
  // old bear & hand fine-tuning offsets no longer apply. Clear them once so the
  // new reference-matched defaults take effect. Video & gradient tuning is kept.
  if (typeof window !== 'undefined' && localStorage.getItem('hero_cfg_v') !== '10') {
    ['bear_scale', 'bear_x', 'bear_y', 'bear_rotate', 'hand_x', 'hand_y', 'hand_scale', 'hand_rotate', 'hero_height', 'hero_y_offset', 'hero_zoom', 'hero_gradient_stop'].forEach(k => localStorage.removeItem(k));
    localStorage.setItem('hero_cfg_v', '10');
  }

  const [heroHeight, setHeroHeight] = useState(() => Number(localStorage.getItem('hero_height') || 102));
  const [videoYOffset, setVideoYOffset] = useState(() => Number(localStorage.getItem('hero_y_offset') || 0));
  const [videoZoom, setVideoZoom] = useState(() => Number(localStorage.getItem('hero_zoom') || 1.02));
  const [gradientStop, setGradientStop] = useState(() => Number(localStorage.getItem('hero_gradient_stop') || 51));
  
  // Separate controls for the fallback photo (battery saving mode)
  const [posterHeight, setPosterHeight] = useState(() => Number(localStorage.getItem('poster_height') || 82));
  const [posterXOffset, setPosterXOffset] = useState(() => Number(localStorage.getItem('poster_x_offset') || 50));
  const [posterYOffset, setPosterYOffset] = useState(() => Number(localStorage.getItem('poster_y_offset') || 100));
  const [posterZoom, setPosterZoom] = useState(() => Number(localStorage.getItem('poster_zoom') || 1.03));
  const [showConfigurator, setShowConfigurator] = useState(false);
  const [configTab, setConfigTab] = useState('video'); // 'video' or 'bear'
  const [dBearCfg, setDBearCfg] = useState(() => ({
    scale: Number(localStorage.getItem('d_bear_scale') || 0.6),
    x: Number(localStorage.getItem('d_bear_x') || 10),
    y: Number(localStorage.getItem('d_bear_y') || -5),
    rotate: Number(localStorage.getItem('d_bear_rotate') || -7),
    handScale: Number(localStorage.getItem('d_hand_scale') || 0.3),
    handX: Number(localStorage.getItem('d_hand_x') || 30),
    handY: Number(localStorage.getItem('d_hand_y') || 20),
    handRotate: Number(localStorage.getItem('d_hand_rotate') || 21),
  }));

  const [mBearCfg, setMBearCfg] = useState(() => ({
    scale: Number(localStorage.getItem('bear_scale') || 1.1),
    x: Number(localStorage.getItem('bear_x') || -30),
    y: Number(localStorage.getItem('bear_y') || -2.5),
    rotate: Number(localStorage.getItem('bear_rotate') || -9),
    handScale: Number(localStorage.getItem('hand_scale') || 0.43),
    handX: Number(localStorage.getItem('hand_x') || 20),
    handY: Number(localStorage.getItem('hand_y') || 59),
    handRotate: Number(localStorage.getItem('hand_rotate') || 35),
  }));

  const activeBearCfg = isDesktop ? dBearCfg : mBearCfg;
  const updateBearCfg = (key, val, storageKey) => {
    if (isDesktop) {
      setDBearCfg(prev => ({ ...prev, [key]: val }));
      localStorage.setItem('d_' + storageKey, val);
    } else {
      setMBearCfg(prev => ({ ...prev, [key]: val }));
      localStorage.setItem(storageKey, val);
    }
  };



  const triggerToast = (type, text) => {
    setToast({ type, text });
    setTimeout(() => {
      setToast(null);
    }, 2500);
  };

  const handleShare = async (barber) => {
    if (!barber) return;
    const shareUrl = window.location.origin + window.location.pathname + '#/agendar?barber=' + barber.id;
    const shareData = {
      title: `Dientes Sanos - ${barber.name}`,
      text: `¡Mira el perfil de ${barber.name} en Dientes Sanos y reserva tu cita!`,
      url: shareUrl
    };
    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(shareUrl);
        triggerToast('success', 'Enlace copiado al portapapeles');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const toggleFavorite = (barberId) => {
    let updated;
    const isFav = favorites.includes(barberId);
    if (isFav) {
      updated = favorites.filter(id => id !== barberId);
      triggerToast('unfavorite', 'Removido de favoritos');
    } else {
      updated = [...favorites, barberId];
      triggerToast('favorite', 'Agregado a favoritos');
    }
    setFavorites(updated);
    localStorage.setItem('favorite_barbers', JSON.stringify(updated));
  };
  const [selectedDate, setSelectedDate] = useState(() => {
    const saved = localStorage.getItem('bookingState');
    return saved && JSON.parse(saved).selectedDate ? new Date(JSON.parse(saved).selectedDate) : null;
  });
  const [currentCalendarMonth, setCurrentCalendarMonth] = useState(() => {
    const saved = localStorage.getItem('bookingState');
    if (saved && JSON.parse(saved).selectedDate) {
      return new Date(JSON.parse(saved).selectedDate);
    }
    return new Date();
  });
  const [selectedTime, setSelectedTime] = useState(() => {
    const saved = localStorage.getItem('bookingState');
    return saved ? JSON.parse(saved).selectedTime : null;
  });
  const [selectedBeverage, setSelectedBeverage] = useState(() => {
    const saved = localStorage.getItem('bookingState');
    return saved ? JSON.parse(saved).selectedBeverage : '';
  });
  // Menú de bebidas de cortesía para la reserva (reemplaza las 4 bebidas fijas).
  const [cafeMenu, setCafeMenu] = useState([]);
  const [cafeTab, setCafeTab] = useState('cafe');
  useEffect(() => {
    let alive = true;
    publicService.getCafeMenu().then(items => { if (alive) setCafeMenu(items || []); });
    return () => { alive = false; };
  }, []);
  // Todos vienen con categoría "Bebidas" en la DB, así que se agrupan por nombre en 3
  // secciones (Café / Infusiones / Bebidas frías) para no mostrar 17 opciones de golpe.
  const cafeGroups = useMemo(() => {
    const groups = { cafe: [], infusion: [], fria: [] };
    (cafeMenu || []).forEach(item => {
      const n = (item.name || '').toLowerCase();
      if (n.includes('café') || n.includes('cafe') || n.includes('espresso') || n.includes('expreso') || n.includes('cappuccino') || n.includes('latte')) groups.cafe.push(item);
      else if (n.includes('té') || n.includes('infus') || n.includes('manzanilla') || n.includes('hierbabuena') || n.includes('chai')) groups.infusion.push(item);
      else groups.fria.push(item);
    });
    return groups;
  }, [cafeMenu]);
  const [notes, setNotes] = useState(() => {
    const saved = localStorage.getItem('bookingState');
    return saved ? JSON.parse(saved).notes || '' : '';
  });
  const [tattooIdea, setTattooIdea] = useState(() => {
    const saved = localStorage.getItem('bookingState');
    return saved ? JSON.parse(saved).tattooIdea || '' : '';
  });
  const [tattooSize, setTattooSize] = useState(() => {
    const saved = localStorage.getItem('bookingState');
    return saved ? JSON.parse(saved).tattooSize || '' : '';
  });
  const [tattooZone, setTattooZone] = useState(() => {
    const saved = localStorage.getItem('bookingState');
    return saved ? JSON.parse(saved).tattooZone || '' : '';
  });
  const [tattooStyle, setTattooStyle] = useState(() => {
    const saved = localStorage.getItem('bookingState');
    return saved ? JSON.parse(saved).tattooStyle || '' : '';
  });
  const [tattooTheme, setTattooTheme] = useState(() => {
    const saved = localStorage.getItem('bookingState');
    return saved ? JSON.parse(saved).tattooTheme || '' : '';
  });
  const [isOfLegalAge, setIsOfLegalAge] = useState(() => {
    const saved = localStorage.getItem('bookingState');
    return saved ? JSON.parse(saved).isOfLegalAge : null;
  });
  const [hasDesign, setHasDesign] = useState(() => {
    const saved = localStorage.getItem('bookingState');
    return saved ? JSON.parse(saved).hasDesign : null;
  });
  const [consentSigned, setConsentSigned] = useState(() => {
    const saved = localStorage.getItem('bookingState');
    return saved ? JSON.parse(saved).consentSigned || false : false;
  });
  const [imgErrors, setImgErrors] = useState({});
  
  // Auth state at step 6
  const [isLoggedIn, setIsLoggedIn] = useState(() =>
    Boolean(localStorage.getItem('panda_public_client'))
  );

  // PublicLayout no longer force-redirects to /completar-registro on every page load (that
  // used to hijack navigation anywhere on the site). Completing the profile is instead
  // enforced right here, at the one place it actually matters: entering the booking flow.
  // If there's an active Google session whose client record is missing phone/id_card, send
  // them to finish registration and flag it to bring them straight back into booking after.
  const googleProfileCheckRef = useRef(false);
  useEffect(() => {
    if (isLoggedIn || googleProfileCheckRef.current) return;
    googleProfileCheckRef.current = true;
    (async () => {
      try {
        const session = await publicService.getSession();
        const user = session?.user;
        if (!user) return;
        const isGoogleUser = user.app_metadata?.provider === 'google'
          || user.identities?.some(id => id.provider === 'google');
        if (!isGoogleUser) return;

        let client = await publicService.getClientByUserId(user.id);
        if (!client && user.email) client = await publicService.getClientByEmail(user.email);

        if (!client || !client.phone || !client.id_card) {
          localStorage.setItem('panda_login_return_to_booking', 'true');
          navigate('/completar-registro', { replace: true });
        }
      } catch (e) {
        console.error('Error checking Google profile before booking:', e);
      }
    })();
  }, [isLoggedIn, navigate]);
  const [loggedInClient, setLoggedInClient] = useState(null);
  const [authTab, setAuthTab] = useState('register'); // 'register' or 'login'
  const [showPassword, setShowPassword] = useState(false);
  const [authForm, setAuthForm] = useState({
    name: '',
    lastname: '',
    phone: '',
    id_card: '',
    email: '',
    password: '',
    birth_date: ''
  });
  const [loginForm, setLoginForm] = useState({
    identifier: '',
    password: ''
  });
  const [authError, setAuthError] = useState('');
  
  // General flow states
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  // Tells ClientLayout (when embedded inside the profile, /perfil/reservar)
  // to hide its sidebar/BottomNav so the confirmation card is the only
  // thing on screen — see the panda_hide_chrome listener there. A no-op
  // outside that context since nothing listens for the event elsewhere.
  useEffect(() => {
    if (!isEmbedded) return;
    window.dispatchEvent(new CustomEvent('panda_hide_chrome', { detail: success }));
    return () => window.dispatchEvent(new CustomEvent('panda_hide_chrome', { detail: false }));
  }, [success, isEmbedded]);

  const [occupiedSlots, setOccupiedSlots] = useState([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  
  const allTimeSlots = useMemo(() => generateTimeSlotsForDate(), []);
  
  // Persist booking progress to localStorage
  useEffect(() => {
    if (success) {
      localStorage.removeItem('bookingState');
      return;
    }
    const state = {
      showWelcome,
      hasVisited,
      step,
      selectedCategory,
      selectedService,
      selectedBarber,
      selectedDate: selectedDate?.toISOString() || null,
      selectedTime,
      selectedBeverage,
      notes,
      expandedBarber,
      tattooIdea,
      tattooSize,
      tattooZone,
      tattooStyle,
      tattooTheme,
      isOfLegalAge,
      hasDesign,
      consentSigned
    };
    localStorage.setItem('bookingState', JSON.stringify(state));
  }, [showWelcome, hasVisited, step, selectedCategory, selectedService, selectedBarber, selectedDate, selectedTime, selectedBeverage, notes, success, expandedBarber, tattooIdea, tattooSize, tattooZone, tattooStyle, tattooTheme, isOfLegalAge, hasDesign, consentSigned]);

  // Restore portfolio images if expandedBarber is loaded from localStorage on mount
  useEffect(() => {
    if (expandedBarber && expandedBarberPortfolio.length === 0) {
      loadExpandedPortfolio(expandedBarber.id);
    }
  }, [expandedBarber]);

  // Preselección por defecto para el perfil expandido de computadoras.
  // Solo la fecha (hoy) - nunca la hora: el cliente debe elegir su hora
  // explícitamente. Un default de hora aquí competía con el efecto que
  // limpia selectedTime al cambiar fecha/barbero/servicio, re-rellenando
  // en silencio una hora que no era la que el cliente había elegido.
  useEffect(() => {
    if (expandedBarber && !selectedDate) {
      setSelectedDate(new Date());
    }
  }, [expandedBarber, selectedDate]);

  useEffect(() => {
    if (expandedBarber && services.length > 0 && !selectedService) {
      const specialty = expandedBarber.specialty || '';
      const isTattoo = expandedBarber.role?.toLowerCase().includes('tatuador') || specialty.toLowerCase().includes('tatuador');
      const filtered = services.filter(s => {
        const cat = (s.category || '').toLowerCase();
        if (isTattoo) return cat === 'tatuajes';
        return cat === 'barbería' || cat === 'barba' || cat === 'servicios' || cat === 'tratamientos' || s.name.toLowerCase().includes('corte') || s.name.toLowerCase().includes('barba');
      });
      if (filtered.length > 0) {
        setSelectedService(filtered[0]);
      }
    }
  }, [expandedBarber, services, selectedService]);

  // Clear selectedBarber if the user changes the service category and the barber is incompatible
  useEffect(() => {
    if (selectedBarber && selectedService) {
      const isTattooBarber = isTattooRole(selectedBarber);
      const isTattooService = (selectedService.category || '').toLowerCase() === 'tatuajes';
      
      if (!isBookableStaff(selectedBarber)) {
        setSelectedBarber(null);
      } else if (isTattooService && !isTattooBarber) {
        setSelectedBarber(null);
      } else if (!isTattooService && isTattooBarber) {
        setSelectedBarber(null);
      }
    }
  }, [selectedService, selectedBarber]);


  // Scroll to top on step changes
  useEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo(0, 0);
      scrollContainerRef.current.scrollTop = 0;
    }
    window.scrollTo(0, 0);
    if (document.documentElement) document.documentElement.scrollTop = 0;
    if (document.body) document.body.scrollTop = 0;
    
    const timer = setTimeout(() => {
      if (scrollContainerRef.current) {
        scrollContainerRef.current.scrollTo(0, 0);
        scrollContainerRef.current.scrollTop = 0;
      }
      window.scrollTo(0, 0);
      if (document.documentElement) document.documentElement.scrollTop = 0;
      if (document.body) document.body.scrollTop = 0;
    }, 60);
    return () => clearTimeout(timer);
  }, [step]);


  // Ripple effect handler
  const createRipple = (e) => {
    const btn = e.currentTarget;
    const rect = btn.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height);
    const x = e.clientX - rect.left - size / 2;
    const y = e.clientY - rect.top - size / 2;
    const ripple = document.createElement('span');
    ripple.className = 'ripple';
    ripple.style.width = ripple.style.height = `${size}px`;
    ripple.style.left = `${x}px`;
    ripple.style.top = `${y}px`;
    btn.appendChild(ripple);
    setTimeout(() => ripple.remove(), 600);
  };

  const handleStartBooking = (initialOpenCategory = null) => {
    handleRestartBooking(null);
    setIsTransitioning(true);
    setHasVisited(true);
    setShowWelcome(false);
    window.scrollTo(0, 0);
    if (document.documentElement) document.documentElement.scrollTop = 0;
    if (document.body) document.body.scrollTop = 0;
    if (scrollContainerRef.current) scrollContainerRef.current.scrollTop = 0;
    
    if (initialOpenCategory) {
      setOpenCategory(initialOpenCategory);
    }

    setTimeout(() => {
      setIsTransitioning(false);
    }, 750);
  };

  useEffect(() => {
    const bookingRequestId = location.state?.bookingRequestId || 'default';
    if (
      !location.state?.startBooking
      || loading
      || autoStartHandledRef.current === bookingRequestId
    ) {
      return;
    }

    autoStartHandledRef.current = bookingRequestId;

    // A pending draft means the user just came back from a login/registration
    // redirect mid-booking (see handleGoogleLogin / the "guardar sesión" flow below) —
    // the draft-restore effect above already repopulated step/selections, so forcing
    // step 1 here would silently discard all of that progress.
    if (!draftRestoredRef.current) {
      localStorage.removeItem('bookingState');
      setStep(1);
      setShowWelcome(false);
    }
    setIsTransitioning(false);
    setHasVisited(true);

    window.scrollTo(0, 0);
    if (document.documentElement) document.documentElement.scrollTop = 0;
    if (document.body) document.body.scrollTop = 0;
    if (scrollContainerRef.current) scrollContainerRef.current.scrollTop = 0;

    navigate(location.pathname, { replace: true, state: {} });
  }, [location.state, location.pathname, loading, navigate]);

  const handleReturnToWelcome = (scrollToEquipo = false) => {
    setVideoBlocked(false);
    localStorage.removeItem('bookingState');
    setShowWelcome(true);
    setStep(1);
    setSelectedService(null);
    setSelectedBarber(null);
    setSelectedDate(null);
    setSelectedTime(null);
    setOpenCategory(null);
    setExpandedBarber(null);
    setActiveTeamCardId(null);

    if (scrollToEquipo) shouldRestoreLandingScrollRef.current = true;
  };

  const handleRestartBooking = (e) => {
    if (e) createRipple(e);
    localStorage.removeItem('panda_draft_booking');
    setStep(1);
    setSelectedCategory(null);
    setSelectedService(null);
    setSelectedBarber(null);
    setSelectedDate(null);
    setSelectedTime(null);
    setSelectedBeverage(null);
    setNotes('');
    setTattooIdea('');
    setTattooSize('');
    setTattooZone('');
    setTattooStyle([]);
    setTattooTheme('');
    setHasDesign(null);
    setConsentSigned(false);
    scrollToTop();
  };

  const nextBtnRef = useRef(null);
  const step3ContinueBtnRef = useRef(null);
  
  const getScrollContainer = () => {
    // When embedded in the profile, this component's own wrapper is intentionally
    // non-scrolling (overflow-visible) — the actual scroll happens on ClientLayout's
    // .main-content-area. Scrolling scrollContainerRef itself here would be a no-op.
    if (isEmbedded) {
      return scrollContainerRef.current?.closest('.main-content-area') || document.documentElement;
    }
    return scrollContainerRef.current || document.documentElement;
  };

  const doNativeScrollTo = (el, block = 'end') => {
    if (!el) return;
    const container = getScrollContainer();
    if (!container) return;

    const isDoc = container === document.documentElement;
    const cRect = isDoc ? { top: 0, bottom: window.innerHeight } : container.getBoundingClientRect();
    const eRect = el.getBoundingClientRect();
    const currentScroll = isDoc ? window.scrollY : container.scrollTop;

    // Embedded (profile) view has a floating bottom-nav dock overlapping the last
    // ~100px of the viewport that isn't part of layout flow — clear it with extra
    // buffer. The standalone landing has no such overlay, so a small buffer suffices.
    const bottomClearance = isEmbedded ? 110 : 32;

    let target = 0;
    if (block === 'start') {
      target = currentScroll + (eRect.top - cRect.top) - 20;
    } else {
      target = currentScroll + (eRect.bottom - cRect.bottom) + bottomClearance;
    }

    if (isDoc) {
      window.scrollTo({ top: target, behavior: 'smooth' });
    } else {
      container.scrollTo({ top: target, behavior: 'smooth' });
    }
  };

  const scrollToNextButton = () => {
    setTimeout(() => {
      doNativeScrollTo(nextBtnRef.current, 'end');
    }, 350);
  };
  const scrollToTimeSlots = () => {
    setTimeout(() => {
      doNativeScrollTo(timeSlotsRef.current, 'start');
    }, 350);
  };
  const scrollToBookingSummary = () => {
    setTimeout(() => {
      const el = step3ContinueBtnRef.current || bookingSummaryRef.current;
      doNativeScrollTo(el, 'end');
    }, 350);
  };
  const topRef = useRef(null);
  const scrollToTop = () => {
    if (topRef.current) {
      topRef.current.scrollIntoView({ behavior: 'auto', block: 'start' });
    } else {
      // Fallback
      window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
      document.documentElement.scrollTop = 0;
      const container = getScrollContainer();
      if (container) container.scrollTop = 0;
    }
  };
  
  // We call scrollToTop exactly when a new step begins its enter animation
  // to avoid it fighting with the exit animation of the previous step.

  // Check if client is logged in
  useEffect(() => {
    const clientData = localStorage.getItem('panda_public_client');
    if (clientData) {
      setIsLoggedIn(true);
      try {
        setLoggedInClient(JSON.parse(clientData));
      } catch (e) {
        console.error("Error parsing clientData", e);
      }
    }
  }, []);

  // Fetch services and staff
  useEffect(() => {
    const loadData = async () => {
      try {
        let [servicesData, staffData, topClientsData, topBarberData, reviewsData] = await Promise.all([
          publicService.getServices().catch((err) => {
            console.warn("Failed to fetch services:", err);
            return [];
          }),
          publicService.getStaff().catch((err) => {
            console.warn("Failed to fetch staff:", err);
            return [];
          }),
          publicService.getTopClientsOfMonth().catch(() => []),
          publicService.getBarberOfMonth().catch(() => null),
          publicService.getStaffReviews().catch(() => [])
        ]);

        setServices(servicesData);
        
        const filteredBarbers = staffData.filter(isBookableStaff);

        // ── ORDEN FIJO DEL EQUIPO (nunca cambia sin importar quién se agregue) ─────────
        // Grupo 1: Odontologos  → Ángel primero, Moret segundo, luego los demás por nombre
        // Grupo 2: 
        // Grupo 3: BARISTA
        // Grupo 4: ASISTENTE
        // ────────────────────────────────────────────────────────────────────────────────
        const sortedBarbers = [...filteredBarbers].sort((a, b) => {
          const getGroupRank = (barber) => {
            const role = (barber.role || '').toLowerCase();
            const spec = (barber.specialty || '').toLowerCase();
            const name = barber.name.toLowerCase();

            // Asistente (grupo 4) — va siempre al final
            const isAsistente = role.includes('asistente') ||
                                role.includes('lavado') ||
                                role.includes('lavarista') ||
                                spec.includes('lavado') ||
                                spec.includes('lavarista') ||
                                name.includes('cesia');
            if (isAsistente) return 4;

            // Barista (grupo 3) — va antes del asistente
            const isBarista = role.includes('barista') ||
                              role.includes('café') ||
                              role.includes('cafe') ||
                              spec.includes('barista') ||
                              spec.includes('café') ||
                              spec.includes('cafe') ||
                              name.includes('yarlin');
            if (isBarista) return 3;

            // Tatuador (grupo 2)
            const isTatuador = role.includes('tatu') ||
                               role.includes('ink') ||
                               role.includes('artista') ||
                               spec.includes('tatu') ||
                               spec.includes('ink') ||
                               spec.includes('artista');
            if (isTatuador) return 2;

            // Barbero (grupo 1) — va primero
            return 1;
          };

          const rankA = getGroupRank(a);
          const rankB = getGroupRank(b);

          if (rankA !== rankB) return rankA - rankB;

          // Dentro del grupo de Odontologos: Ángel primero, Moret segundo
          if (rankA === 1) {
            if (a.name === 'Ángel Serrano') return -1;
            if (b.name === 'Ángel Serrano') return 1;
            if (a.name === 'Moret Serrano') return -1;
            if (b.name === 'Moret Serrano') return 1;
          }

          return a.name.localeCompare(b.name);
        });
        setBarbers(sortedBarbers);
        setTopClients(topClientsData || []);
        
        // Dynamically calculate the Top Barber of the Month based on actual client reviews!
        let calculatedTopBarber = null;
        const rotatableBarbers = filteredBarbers.filter(b => {
          const role = (b.role || '').toLowerCase();
          const spec = (b.specialty || '').toLowerCase();
          const name = b.name.toLowerCase();
          const isAsistente = role.includes('asistente') || role.includes('lavado') || name.includes('cesia');
          const isBarista = role.includes('barista') || role.includes('cafe') || name.includes('yarlin');
          return !isAsistente && !isBarista;
        });

        if (reviewsData && reviewsData.length > 0) {
          const reviewsWithVal = reviewsData.filter(r => r.rating !== undefined || r.rapidez !== undefined);
          const now = new Date();
          const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
          const currentMonthReviews = reviewsWithVal.filter(r => new Date(r.created_at) >= startOfThisMonth);
          
          // Use current month if there's enough data, else fallback to all-time reviews
          const targetReviews = currentMonthReviews.length >= 3 ? currentMonthReviews : reviewsWithVal;

          const staffAverages = rotatableBarbers.map(barber => {
            const memberReviews = targetReviews.filter(r => r.staff_id === barber.id);
            const avg = memberReviews.length ? memberReviews.reduce((acc, r) => acc + Number(r.rating || 5), 0) / memberReviews.length : 0;
            return {
              barber,
              avg,
              count: memberReviews.length
            };
          }).filter(s => s.avg > 0);

          if (staffAverages.length > 0) {
            staffAverages.sort((a, b) => b.avg - a.avg || b.count - a.count);
            calculatedTopBarber = staffAverages[0].barber;
          }
        }

        if (calculatedTopBarber) {
          setBarberOfMonth(calculatedTopBarber);
        } else if (topBarberData) {
          setBarberOfMonth(topBarberData);
        } else if (rotatableBarbers.length > 0) {
          const randomIndex = Math.floor(Math.random() * rotatableBarbers.length);
          setBarberOfMonth(rotatableBarbers[randomIndex]);
        } else {
          setBarberOfMonth(null);
        }
        
        setReviews(reviewsData || []);


        // Restore draft booking (e.g. after Google OAuth redirect)
        const draft = localStorage.getItem('panda_draft_booking');
        if (draft) {
          try {
            const parsed = JSON.parse(draft);
            if (parsed.serviceId) {
              const matchedService = servicesData.find(s => s.id === parsed.serviceId);
              if (matchedService) {
                setSelectedService(matchedService);
                setOpenCategory(openCategoryForService(matchedService));
              }
            }
            if (parsed.barberId) {
              const matchedBarber = filteredBarbers.find(b => b.id === parsed.barberId);
              if (matchedBarber) setSelectedBarber(matchedBarber);
            }
            if (parsed.date) setSelectedDate(new Date(parsed.date));
            if (parsed.time) setSelectedTime(parsed.time);
            if (parsed.beverage) setSelectedBeverage(parsed.beverage);
            if (parsed.notes) setNotes(parsed.notes);
            if (parsed.category) setSelectedCategory(parsed.category);
            if (parsed.tattooData) {
              const t = parsed.tattooData;
              if (t.idea) setTattooIdea(t.idea);
              if (t.size) setTattooSize(t.size);
              if (t.zone) setTattooZone(t.zone);
              if (t.style) setTattooStyle(t.style);
              if (t.theme) setTattooTheme(t.theme);
              if (t.has_design !== undefined) setHasDesign(t.has_design);
              if (t.is_of_legal_age !== undefined) setIsOfLegalAge(t.is_of_legal_age);
              if (t.consent_signed !== undefined) setConsentSigned(t.consent_signed);
            }
            if (parsed.step) {
              setStep(parsed.step === 6 ? 5 : parsed.step);
              setShowWelcome(false);
              draftRestoredRef.current = true;
            }
            if (parsed.resumeAfterAuth === true) {
              setResumeBookingAfterAuth(true);
            }
          } catch (e) {
            console.error('Error restoring draft booking:', e);
          }
        }
        
        // ── PREFILL FROM "REPETIR" BUTTON ──
        // When the user clicks "Repetir" in their history, we receive prefillStaff
        // and prefillService IDs via React Router location.state. Match them to the
        // loaded data and jump straight to step 3 (date picker).
        if (location.state?.prefillStaff || location.state?.prefillService) {
          let prefillApplied = false;
          if (location.state.prefillService) {
            const matchedService = servicesData.find(s => s.id === location.state.prefillService);
            if (matchedService) {
              setSelectedService(matchedService);
              // Auto-open the right category accordion
              setOpenCategory(openCategoryForService(matchedService));
              prefillApplied = true;
            }
          }
          if (location.state.prefillStaff) {
            const matchedBarber = filteredBarbers.find(b => b.id === location.state.prefillStaff);
            if (matchedBarber) {
              setSelectedBarber(matchedBarber);
              prefillApplied = true;
            }
          }
          if (location.state.prefillBeverage) {
            setSelectedBeverage(location.state.prefillBeverage);
            prefillApplied = true;
          }
          if (prefillApplied) {
            // Skip welcome screen and both selection steps — go straight to date/time
            setShowWelcome(false);
            setStep(3);
          }
        }
        
        // Read barber from URL query or hash query parameters to auto-expand profile

        let barberIdFromUrl = null;
        if (window.location.search) {
          const urlParams = new URLSearchParams(window.location.search);
          barberIdFromUrl = urlParams.get('barber');
        }
        if (!barberIdFromUrl && window.location.hash) {
          const hash = window.location.hash;
          const queryIndex = hash.indexOf('?');
          if (queryIndex !== -1) {
            const queryString = hash.substring(queryIndex + 1);
            const urlParams = new URLSearchParams(queryString);
            barberIdFromUrl = urlParams.get('barber');
          }
        }
        if (barberIdFromUrl) {
          const matchedBarber = filteredBarbers.find(b => b.id === barberIdFromUrl);
          if (matchedBarber) {
            setProfileSourceStep(1);
            setStep(2);
            setExpandedBarber(matchedBarber);
            setShowWelcome(false);
            setPortfolioLoading(true);
            publicService.getStaffPortfolio(matchedBarber.id).then(data => {
              if (data && data.length > 0) {
                setExpandedBarberPortfolio(data.slice(0, 5));
              } else {
                setExpandedBarberPortfolio(mockPortfolio);
              }
              setPortfolioLoading(false);
            }).catch(() => {
              setExpandedBarberPortfolio(mockPortfolio);
              setPortfolioLoading(false);
            });
          }
        }
      } catch (e) {
        console.error('Error loading data:', e);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  // Fetch occupied slots when barber and date are selected
  useEffect(() => {
    if (!selectedBarber || !selectedDate) {
      setOccupiedSlots([]);
      return;
    }

    const fetchOccupied = async () => {
      setLoadingSlots(true);
      try {
        const dateStr = selectedDate.toISOString().split('T')[0];
        const occupied = await publicService.getOccupiedSlots(selectedBarber.id, dateStr, selectedService?.duration);
        setOccupiedSlots(occupied);
      } catch (e) {
        console.error('Error fetching occupied slots:', e);
        setOccupiedSlots([]);
      } finally {
        setLoadingSlots(false);
      }
    };
    fetchOccupied();
  }, [selectedBarber, selectedDate, selectedService]);

  const calendarDays = useMemo(() => {
    const year = currentCalendarMonth.getFullYear();
    const month = currentCalendarMonth.getMonth();
    
    // First day of current calendar month
    const firstDay = new Date(year, month, 1);
    // Last day of current calendar month
    const lastDay = new Date(year, month + 1, 0);
    const totalDays = lastDay.getDate();
    
    // Weekday of 1st day (Spanish: Mon=0, Tue=1, ..., Sun=6)
    const startDayIndex = (firstDay.getDay() + 6) % 7;
    
    const days = [];
    
    // Trailing days from previous month
    const prevMonthLastDay = new Date(year, month, 0);
    const prevMonthTotalDays = prevMonthLastDay.getDate();
    for (let i = startDayIndex - 1; i >= 0; i--) {
      const d = prevMonthTotalDays - i;
      const dateVal = new Date(year, month - 1, d);
      days.push({
        dayNumber: d,
        date: dateVal,
        isCurrentMonth: false,
        isSelectable: false,
        isToday: false,
        isSelected: false
      });
    }
    
    // Days of current month
    const today = new Date();
    today.setHours(0,0,0,0);
    
    for (let d = 1; d <= totalDays; d++) {
      const dateVal = new Date(year, month, d);
      const dateValCompare = new Date(year, month, d);
      dateValCompare.setHours(0,0,0,0);
      
      const isSelectable = dateValCompare >= today;
      const isToday = dateValCompare.getTime() === today.getTime();
      const isSelected = selectedDate && selectedDate.toDateString() === dateVal.toDateString();
      
      days.push({
        dayNumber: d,
        date: dateVal,
        isCurrentMonth: true,
        isSelectable,
        isToday,
        isSelected
      });
    }
    
    // Padding days from next month to complete the week
    const remaining = (7 - (days.length % 7)) % 7;
    for (let d = 1; d <= remaining; d++) {
      const dateVal = new Date(year, month + 1, d);
      days.push({
        dayNumber: d,
        date: dateVal,
        isCurrentMonth: false,
        isSelectable: false,
        isToday: false,
        isSelected: false
      });
    }
    
    return days;
  }, [currentCalendarMonth, selectedDate]);

  // Filter visible time slots. isClosed lives on the slot itself (not recomputed by
  // each consumer) so every place that renders a slot grid — including
  // BarberProfileView's own grid — stays in sync with the manual open/closed toggle.
  const visibleSlots = useMemo(() => {
    const isToday = selectedDate?.toDateString() === new Date().toDateString();
    return allTimeSlots.map(time => ({
      time,
      label: formatTime12(time),
      isPast: isToday && isTimePast(time),
      isOccupied: occupiedSlots.includes(time),
      isClosed: !storeIsOpen,
    }));
  }, [allTimeSlots, selectedDate, occupiedSlots, storeIsOpen]);

  // Filter services by category key
  const getServicesForCategory = (catKey) => {
    return services.filter(service => {
      const c = service.category || DENTAL_CATEGORIES[0];
      const cLower = c.toLowerCase();
      const nameLower = service.name.toLowerCase();

      if (catKey === 'Odontopediatría') {
        return cLower.includes('odontopediatr');
      }
      if (DENTAL_CATEGORIES.includes(catKey)) {
        if (catKey === 'Estética') {
          return cLower.includes('est') || cLower.includes('blanqueamiento') || cLower.includes('limpieza') || nameLower.includes('blanqueamiento');
        }
        if (catKey === 'Ortodoncia') return cLower.includes('ortodoncia') || nameLower.includes('ortodoncia') || nameLower.includes('alineador');
        if (catKey === 'Endodoncia') return cLower.includes('endodoncia') || nameLower.includes('endodoncia') || nameLower.includes('conducto');
        return c === catKey;
      }
      // Legacy keys (drafts saved by older sessions)
      if (catKey === 'Corte') return c === 'Barbería' || c === 'Servicios';
      if (catKey === 'Barba') return c === 'Tratamientos' || nameLower.includes('barba');
      if (catKey === 'Tatuajes') return c === 'Tatuajes';
      return false;
    });
  };

  // Reset selected time when date, barber, or service changes (but not on initial mount to preserve draft)
  const isInitialMount = useRef(true);
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    setSelectedTime(null);
  }, [selectedDate, selectedBarber, selectedService]);

  const steps = [
    { num: 1, label: 'Servicio' },
    { num: 2, label: 'Especialista' },
    { num: 3, label: 'Fecha y Hora' },
    { num: 4, label: 'Cortesía' },
    { num: 5, label: 'Cierre' },
  ];

  const canNext = () => {
    if (step === 1) return selectedService;
    if (step === 2) return selectedBarber;
    if (step === 3) return selectedDate && selectedTime;
    if (step === 4) {
      // La bebida de cortesía es OPCIONAL: se puede continuar sin elegir ninguna.
      const isTattoo = (selectedService?.category || '').toLowerCase().includes('tatuaj');
      if (isTattoo) {
        return tattooSize && tattooZone && tattooStyle && isOfLegalAge !== null && consentSigned;
      }
      return true;
    }
    return false;
  };

  // Save current progress & trigger Google Login redirect
  const handleGoogleLogin = () => {
    localStorage.setItem('panda_draft_booking', JSON.stringify({
      serviceId: selectedService?.id,
      barberId: selectedBarber?.id,
      date: selectedDate ? selectedDate.toISOString() : null,
      time: selectedTime,
      beverage: selectedBeverage,
      notes: notes,
      category: selectedCategory,
      tattooData: (selectedService?.category || '').toLowerCase().includes('tatuaj') ? {
        idea: tattooIdea,
        size: tattooSize,
        zone: tattooZone,
        style: tattooStyle,
        theme: tattooTheme,
        has_design: hasDesign,
        is_of_legal_age: isOfLegalAge,
        consent_signed: consentSigned
      } : null,
      step: 5,
      resumeAfterAuth: true
    }));
    // Tells PublicLayout's post-OAuth handler (and CompleteRegistration, for first-time
    // Google users) to send the visitor back into /agendar instead of /perfil once
    // sign-in finishes, so the draft saved above actually gets picked back up.
    setGoogleAuthIntent(GOOGLE_AUTH_DESTINATIONS.BOOKING);
    localStorage.setItem('panda_login_return_to_booking', 'true');
    publicService.signInWithGoogle().catch((error) => {
      clearGoogleAuthIntent();
      localStorage.removeItem('panda_login_return_to_booking');
      console.error('Google booking login error:', error);
      setAuthError('No se pudo iniciar sesión con Google. Inténtalo nuevamente.');
    });
  };

  // Unified final checkout handling
  const handleCheckout = async (e) => {
    if (e) e.preventDefault();
    setAuthError('');
    setSubmitting(true);
    
    if (!selectedTime || !selectedDate || !selectedBarber || !selectedService) {
      setAuthError('Por favor selecciona servicio, especialista y fecha antes de confirmar.');
      setSubmitting(false);
      return;
    }

    // Defense in depth: re-check the live toggle in case it closed mid-session
    // (slots are already disabled in the UI, but selectedTime could have been
    // chosen before the shop closed).
    let liveStoreOpen = storeIsOpen;
    try { liveStoreOpen = await publicService.getStoreOpen(); } catch { /* keep last known */ }
    if (!liveStoreOpen) {
      setStoreIsOpen(false);
      setAuthError('La clínica está cerrada por ahora — no se pueden agendar citas.');
      setSubmitting(false);
      return;
    }

    let activeClient = null;

    try {
      if (!isLoggedIn) {
        if (authTab === 'register') {
          // Validate required fields
          if (!authForm.name || !authForm.phone || !authForm.id_card || !authForm.birth_date || !authForm.password) {
            throw new Error('Por favor completa todos los campos obligatorios.');
          }
          // Combine first name & last name
          const fullName = `${authForm.name} ${authForm.lastname}`.trim();
          const regResult = await publicService.registerClient({
            name: fullName,
            phone: authForm.phone,
            id_card: authForm.id_card,
            email: authForm.email || null,
            password: authForm.password,
            birth_date: authForm.birth_date
          });
          activeClient = regResult.client;
          localStorage.setItem('panda_public_client', JSON.stringify(activeClient));
          setIsLoggedIn(true);
          // Same "first time in your profile" intro shown to Register.jsx/Google
          // signups — stays pending until they actually visit /perfil (see the
          // route-gated effect in PublicLayout.jsx), so it doesn't interrupt the
          // booking they're finishing right now.
          localStorage.setItem('panda_show_onboarding', 'true');
        } else {
          // Log in existing client
          if (!loginForm.identifier || !loginForm.password) {
            throw new Error('Por favor completa los campos de inicio de sesión.');
          }
          await publicService.loginClient({
            identifier: loginForm.identifier,
            password: loginForm.password
          });
          
          let client = null;
          const id = loginForm.identifier.trim();

          if (id.includes('@')) {
            // Try real email first, then odontosonrisa.app email
            client = await publicService.getClientByEmail(id);
          } else {
            // It's a phone number — try by phone
            client = await publicService.getClientByPhone(id);
            // If not found by phone, try with fake email format
            if (!client) {
              client = await publicService.getClientByEmail(`${id}@odontosonrisa.app`);
            }
          }
          
          if (!client) {
            throw new Error('Tu cuenta fue creada pero el perfil no se encontró. Contacta al negocio.');
          }
          
          activeClient = client;
          localStorage.setItem('panda_public_client', JSON.stringify(activeClient));
          setIsLoggedIn(true);
        }
      } else {
        activeClient = JSON.parse(localStorage.getItem('panda_public_client') || 'null');
      }

      if (!activeClient) {
        throw new Error('No hay una sesión activa de cliente.');
      }

      // Schedule appointment
      const scheduledAt = new Date(selectedDate);
      const [hours, minutes] = selectedTime.split(':');
      scheduledAt.setHours(parseInt(hours), parseInt(minutes), 0, 0);

      if (!isBookableStaff(selectedBarber)) {
        throw new Error('Este profesional no está disponible para agendar citas.');
      }

      const createdAppointment = await publicService.createAppointment({
        client_id: activeClient.id,
        service_id: selectedService.id,
        staff_id: selectedBarber.id,
        scheduled_at: scheduledAt.toISOString(),
        beverage_selection: selectedBeverage,
        notes: notes,
        tattoo_data: (selectedService?.category || '').toLowerCase().includes('tatuaj') ? {
          idea: tattooIdea,
          size: tattooSize,
          zone: tattooZone,
          style: tattooStyle,
          theme: tattooTheme,
          has_design: hasDesign,
          is_of_legal_age: isOfLegalAge,
          consent_signed: consentSigned
        } : null
      });
      if (selectedBeverage) {
        pushService.notify(
          { roles: ['Barista', 'Admin'] },
          'Nueva cortesía solicitada',
          `${activeClient.name || 'Cliente'} quiere ${selectedBeverage} para su cita`,
          { appointmentId: createdAppointment.id, beverage: selectedBeverage }
        );
      }
      localStorage.removeItem('panda_draft_booking');
      localStorage.removeItem('panda_login_return_to_booking');
      setSuccess(true);
    } catch (err) {
      console.error('Booking checkout error:', err);
      setAuthError(err.message || 'Error al agendar la cita. Intenta de nuevo.');
    } finally {
      setSubmitting(false);
    }
  };

  // Google OAuth leaves the browser and returns later. Once the saved draft and
  // authenticated client have both been restored, finish the exact reservation
  // the visitor had already confirmed. The draft is marked before submitting so
  // a refresh during the request cannot create the same appointment twice.
  useEffect(() => {
    if (
      !resumeBookingAfterAuth
      || autoResumeAttemptedRef.current
      || loading
      || submitting
      || success
      || !isLoggedIn
      || !selectedService
      || !selectedBarber
      || !selectedDate
      || !selectedTime
    ) {
      return;
    }

    autoResumeAttemptedRef.current = true;
    setResumeBookingAfterAuth(false);

    try {
      const rawDraft = localStorage.getItem('panda_draft_booking');
      if (rawDraft) {
        const draft = JSON.parse(rawDraft);
        localStorage.setItem('panda_draft_booking', JSON.stringify({
          ...draft,
          resumeAfterAuth: false
        }));
      }
    } catch (error) {
      console.error('Error marking resumed booking:', error);
    }

    handleCheckout();
    // handleCheckout intentionally runs once for the restored snapshot. The ref
    // above guards subsequent renders while it is submitting.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    resumeBookingAfterAuth,
    loading,
    submitting,
    success,
    isLoggedIn,
    selectedService,
    selectedBarber,
    selectedDate,
    selectedTime
  ]);

  const renderWelcomeContent = (sliceClass = "", skipAnimations = false) => {
    const fade = (n) => skipAnimations ? '' : `fade-up-${n}`;
    const isResting = sliceClass === "";

    const showPhoto = true;
    
    const heroContent = (
      <div className={`w-full flex flex-col lg:relative ${!isEmbedded ? 'lg:min-h-[100vh]' : ''} lg:justify-between items-stretch text-left bg-[#f4f5f3] pb-8 lg:pb-12 lg:pt-32 transition-all duration-500`} id="inicio">
        {/* Sentinel element to track scroll positioning */}
        <div id="hero-sentinel" className="absolute top-0 left-0 w-1 h-1 pointer-events-none opacity-0" />
        {/* Background Slideshow (Fades and Ken Burns Zoom) */}
        {showPhoto && (
          <div className={`relative w-full aspect-[4/3] sm:aspect-[16/9] lg:absolute lg:inset-0 lg:w-full lg:h-full lg:aspect-auto pointer-events-none z-0 overflow-hidden ${heroPhotoLoaded ? 'animate-hero-reveal opacity-100' : 'opacity-0'}`}>
            {heroSlides.map((_, index) => (
              <div 
                key={index}
                className={`absolute inset-0 hero-slide opacity-0 z-1 ${index === currentSlide ? 'hero-slide-active z-2' : ''}`}
                style={{
                  background: 'linear-gradient(135deg,#f7f4ee 0%,#efe6d5 50%,#e8d4b0 100%)',
                  maskImage: isDesktop 
                    ? `linear-gradient(to bottom, rgba(0, 0, 0, 1) 0%, rgba(0, 0, 0, 0.95) ${gradientStop}%, rgba(0, 0, 0, 0) ${gradientStop + 25}%)`
                    : `linear-gradient(to bottom, rgba(0, 0, 0, 1) 75%, rgba(0, 0, 0, 0) 100%)`,
                  WebkitMaskImage: isDesktop 
                    ? `linear-gradient(to bottom, rgba(0, 0, 0, 1) 0%, rgba(0, 0, 0, 0.95) ${gradientStop}%, rgba(0, 0, 0, 0) ${gradientStop + 25}%)`
                    : `linear-gradient(to bottom, rgba(0, 0, 0, 1) 75%, rgba(0, 0, 0, 0) 100%)`,
                }}
              />
            ))}
          </div>
        )}

        {/* ── Animated Ambient Spotlights (Auroras) ── */}
        {isDesktop && (
          <>
            <div className="absolute inset-0 pointer-events-none z-1 aurora-gold" />
            <div className="absolute inset-0 pointer-events-none z-1 aurora-bronze" />
          </>
        )}

        {/* ── HERO MINIMALISTA SIN FOTO DE MARCA ── */}

        {/* ── Left-side text legibility gradient ── */}
        {isDesktop && (
          <div className="absolute inset-0 pointer-events-none z-10" style={{
            background: 'var(--bg-secondary)',
          }} />
        )}

        {/* ── Bottom legibility gradient for buttons ── */}
        {isDesktop && (
          <div className="absolute inset-x-0 bottom-0 pointer-events-none z-10" style={{
            height: '40%',
            background: 'var(--bg-secondary)',
          }} />
        )}

        {/* ── Cinematic vignette ── */}
        {isDesktop && (
          <div className="absolute inset-0 pointer-events-none z-10" style={{
            background: 'var(--bg-secondary)',
          }} />
        )}

        {/* ── Grain/noise texture ── */}
        <div className="absolute inset-0 pointer-events-none z-15 hero-grain" />



        {/* Centered content container positioned vertically centered relative to full-screen photo backgrounds */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          className="w-full max-w-[1440px] mx-auto flex flex-col justify-center items-start gap-5 lg:gap-8 relative z-20 px-6 lg:px-12 text-left pt-6 lg:pt-0 lg:my-auto"
        >
          
          {/* Trust/Reputation Badge — promedio dinámico desde google_reviews (oculto sin datos) */}
          {googleReviews.length > 0 && (
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 w-full mb-2">
            <div className="flex items-center gap-2 bg-[#f7f7f5] border border-[#d9c08f]/20 px-3 py-1.5 rounded-full w-fit">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="14" height="14" className="shrink-0">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              <div className="flex items-center gap-1.5 shrink-0">
                <span className="text-[12px] font-black text-[#0f172a] leading-none mt-0.5">{googleRating}</span>
                <span className="text-[11px] text-[#FBBC05] font-black tracking-widest flex items-center leading-none">
                  ★ ★ ★ ★ ★
                </span>
              </div>
            </div>
          </div>
          )}

          {/* Hero Welcome content */}
          <div className="w-full flex flex-col gap-5 lg:gap-6" style={{ maxWidth: isDesktop ? '650px' : '100%' }}>
            <div>
              <span className="text-[10px] lg:text-[13px] font-black uppercase tracking-[0.35em] text-[#111111] block mb-1 animate-float-subtle">
                {isLoggedIn && loggedInClient?.name ? 'HOLA DE NUEVO' : 'BIENVENIDO A'}
              </span>
              <h1 className="text-[40px] sm:text-5xl lg:text-6xl font-black uppercase tracking-tight leading-[0.95] mb-1 font-sans text-[#0f172a]">CENTRO ODONTOLÓGICO</h1>
              <h1 className="text-[40px] sm:text-5xl lg:text-6xl font-black uppercase tracking-tight leading-[0.95] mb-2 font-sans text-[#111111]">DIENTES SANOS</h1>
            </div>

            <div className="flex flex-col gap-2.5">
              {isLoggedIn && loggedInClient?.name ? (
                <p className="text-[#0f172a] text-sm sm:text-xl lg:text-[22px] font-extrabold leading-snug font-sans tracking-wide">
                  {loggedInClient.name.split(' ')[0]}, <span className="whitespace-nowrap text-[#111111] animate-text-glow-breath">¿agendamos tu próxima cita?</span>
                </p>
              ) : (
                <p className="text-[#0f172a] text-sm sm:text-xl lg:text-[22px] font-extrabold leading-snug font-sans tracking-wide">
                  Tu sonrisa comienza con el <span className="whitespace-nowrap text-[#111111] animate-text-glow-breath">profesional correcto.</span>
                </p>
              )}
              <p className="text-[#64748b] text-sm sm:text-lg lg:text-[17px] leading-relaxed font-normal font-sans max-w-[580px] lg:max-w-[480px]">
                Odontología integral en un espacio creado para cuidar cada detalle de tu{'\u00A0'}sonrisa.
              </p>
            </div>
          </div>

          {/* Buttons drawer */}
          <div className="w-full flex flex-col items-start gap-3">
            <button
              onClick={(e) => { createRipple(e); handleStartBooking(); }}
              className="btn-gold w-full sm:w-auto py-4 px-8 rounded-xl font-extrabold text-[12px] lg:text-[13px] uppercase tracking-widest transition-all cursor-pointer flex items-center justify-center gap-2"
              style={{ borderRadius: '10px' }}
            >
              <CalendarIcon size={16} /> <span>{isLoggedIn && loggedInClient?.name ? 'Reservar de nuevo' : 'Reservar mi visita'}</span> <span>→</span>
            </button>
            {isLoggedIn && loggedInClient?.name && (
              <p className="text-[#94a3b8] text-[11px] font-medium -mt-1">Toma menos de 1 minuto, ya tenemos tus datos</p>
            )}

            <button
              onClick={() => {
                if (isLoggedIn || localStorage.getItem('panda_public_client')) {
                  navigate('/perfil');
                  return;
                }

                localStorage.setItem('panda_login_return_to_booking', 'true');
                navigate('/login', { state: { startBooking: true } });
              }}
              className="flex items-center gap-2 text-[11px] sm:text-[12px] font-bold transition-all duration-200 cursor-pointer rounded-full whitespace-nowrap border border-[rgba(17, 17, 17,0.3)] bg-[rgba(17, 17, 17,0.08)] hover:bg-[rgba(17, 17, 17,0.18)] hover:border-[rgba(17, 17, 17,0.55)]"
              style={{
                padding: '10px 16px',
                color: 'var(--champagne)',
              }}
            >
              <User size={13} />
              {isLoggedIn ? (
                <span>Ver mi perfil</span>
              ) : (
                <span className="text-[#475569] font-medium">¿Ya tienes cuenta? <span className="text-[#111111] font-bold">Inicia sesión</span></span>
              )}
            </button>
          </div>

          {/* Live Availability Indicator */}
          <div className="flex items-center gap-2 mt-2">
            <span className="relative flex h-2 w-2">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${storeStatus.isOpen ? 'bg-emerald-400' : 'bg-red-400'}`}></span>
              <span className={`relative inline-flex rounded-full h-2 w-2 ${storeStatus.isOpen ? 'bg-emerald-500' : 'bg-red-500'}`}></span>
            </span>
            <span className="text-[10px] lg:text-[11px] text-[#475569] tracking-wider font-semibold uppercase">
              {storeStatus.text}
            </span>
          </div>

        </motion.div>


        {/* Centered Scroll Indicator (Desktop Only) */}
        {isDesktop && (
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center justify-center w-10 h-10 rounded-full border border-[#d9c08f]/20 bg-white md:backdrop-blur-md backdrop-blur-sm text-[#0f172a] hover:border-[#111111] hover:text-[#111111] transition-all cursor-pointer z-20 animate-bounce">
            <ChevronDown size={18} />
          </div>
        )}

        {/* ── HERO CONFIGURATOR (hidden debug tool) ── */}
        {isResting && (
          <>
            {/* Toggle button — tiny, bottom-left corner */}
            <button
              onClick={() => setShowConfigurator(v => !v)}
              style={{
                position: 'absolute', bottom: 12, left: 12, zIndex: 50,
                width: 28, height: 28, borderRadius: '50%',
                background: 'rgba(255,255,255,0.85)', border: '1px solid rgba(0,0,0,0.12)',
                color: 'rgba(0,0,0,0.3)', fontSize: 14,
                display: 'none', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', backdropFilter: 'blur(6px)',
              }}
              title="Configurador"
            >⚙</button>

            {/* Configurator panel */}
            {showConfigurator && (
              <div style={{
                position: 'absolute', bottom: 48, left: 8, zIndex: 60,
                width: 220, background: 'var(--bg-secondary)',
                border: '1px solid rgba(0,0,0,0.1)', borderRadius: 16,
                padding: '14px 16px', backdropFilter: 'blur(20px)',
                boxShadow: '0 16px 40px rgba(0,0,0,0.08)',
              }}>
                {/* Tabs */}
                <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
                  {['bear', 'video', 'foto'].map(t => (
                    <button key={t} onClick={() => setConfigTab(t)} style={{
                      flex: 1, padding: '6px', fontSize: 10, borderRadius: 6,
                      fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em',
                      cursor: 'pointer', border: 'none',
                      background: configTab === t ? 'rgba(17, 17, 17,0.2)' : 'rgba(0,0,0,0.04)',
                      color: configTab === t ? '#111111' : 'rgba(0,0,0,0.4)',
                    }}>{t}</button>
                  ))}
                </div>

                {configTab === 'foto' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {[
                      { label: 'Altura foto %', val: posterHeight, set: setPosterHeight, min: 30, max: 120, step: 1, key: 'poster_height' },
                      { label: 'Posición X foto %', val: posterXOffset, set: setPosterXOffset, min: 0, max: 100, step: 1, key: 'poster_x_offset' },
                      { label: 'Posición Y foto %', val: posterYOffset, set: setPosterYOffset, min: 0, max: 100, step: 1, key: 'poster_y_offset' },
                      { label: 'Zoom foto', val: posterZoom, set: setPosterZoom, min: 0.8, max: 2.5, step: 0.01, key: 'poster_zoom' },
                    ].map(({ label, val, set, min, max, step, key }) => (
                      <div key={key}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                          <span style={{ fontSize: 9, color: 'rgba(0,0,0,0.55)', fontWeight: 700 }}>{label}</span>
                          <span style={{ fontSize: 9, color: '#111111', fontWeight: 800 }}>{val}</span>
                        </div>
                        <input type="range" min={min} max={max} step={step} value={val}
                          onChange={e => { 
                            const v = Number(e.target.value); 
                            set(v); 
                            localStorage.setItem(key, v.toString());
                          }} 
                          style={{ width: '100%', accentColor: '#111111' }} 
                        />
                      </div>
                    ))}
                  </div>
                )}

                {configTab === 'video' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {[
                      { label: 'Altura hero %', val: heroHeight, set: setHeroHeight, min: 30, max: 120, step: 1, key: 'hero_height' },
                      { label: 'Posición Y video %', val: videoYOffset, set: setVideoYOffset, min: 0, max: 100, step: 1, key: 'hero_y_offset' },
                      { label: 'Zoom video', val: videoZoom, set: setVideoZoom, min: 0.8, max: 1.6, step: 0.01, key: 'hero_zoom' },
                      { label: 'Degradado stop %', val: gradientStop, set: setGradientStop, min: 30, max: 100, step: 1, key: 'hero_gradient_stop' },
                    ].map(({ label, val, set, min, max, step, key }) => (
                      <div key={key}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                          <span style={{ fontSize: 9, color: 'rgba(0,0,0,0.55)', fontWeight: 700 }}>{label}</span>
                          <span style={{ fontSize: 9, color: '#111111', fontWeight: 800 }}>{val}</span>
                        </div>
                        <input type="range" min={min} max={max} step={step} value={val}
                          onChange={e => { 
                            const v = Number(e.target.value); 
                            set(v); 
                            const storageKey = (window.innerWidth > 768 && ['bear_scale', 'bear_x', 'bear_y', 'bear_rotate', 'hand_x', 'hand_y', 'hand_scale', 'hand_rotate'].includes(key)) ? `d_${key}` : key;
                            localStorage.setItem(storageKey, v); 
                          }}
                          style={{ width: '100%', accentColor: '#111111', height: 3 }}
                        />
                      </div>
                    ))}
                  </div>
                )}

                {configTab === 'bear' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {[
                      { label: 'Escala oso', val: activeBearCfg.scale, stateKey: 'scale', min: 0.3, max: 2.5, step: 0.01, storageKey: 'bear_scale' },
                      { label: 'Oso X (right %)', val: activeBearCfg.x, stateKey: 'x', min: -30, max: 80, step: 0.5, storageKey: 'bear_x' },
                      { label: 'Oso Y (bottom %)', val: activeBearCfg.y, stateKey: 'y', min: -20, max: 80, step: 0.5, storageKey: 'bear_y' },
                      { label: 'Rotación oso °', val: activeBearCfg.rotate, stateKey: 'rotate', min: -180, max: 180, step: 1, storageKey: 'bear_rotate' },
                      { label: 'Escala mano', val: activeBearCfg.handScale, stateKey: 'handScale', min: 0.1, max: 1.5, step: 0.01, storageKey: 'hand_scale' },
                      { label: 'Mano X (right %)', val: activeBearCfg.handX, stateKey: 'handX', min: -30, max: 80, step: 0.5, storageKey: 'hand_x' },
                      { label: 'Mano Y (bottom %)', val: activeBearCfg.handY, stateKey: 'handY', min: -20, max: 100, step: 0.5, storageKey: 'hand_y' },
                      { label: 'Rotación mano °', val: activeBearCfg.handRotate, stateKey: 'handRotate', min: -180, max: 180, step: 1, storageKey: 'hand_rotate' },
                    ].map(({ label, val, stateKey, min, max, step, storageKey }) => (
                      <div key={stateKey}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                          <span style={{ fontSize: 9, color: 'rgba(0,0,0,0.55)', fontWeight: 700 }}>{label}</span>
                          <span style={{ fontSize: 9, color: '#111111', fontWeight: 800 }}>{val}</span>
                        </div>
                        <input type="range" min={min} max={max} step={step} value={val}
                          onChange={e => { 
                            const v = Number(e.target.value); 
                            updateBearCfg(stateKey, v, storageKey);
                          }}
                          style={{ width: '100%', accentColor: '#111111', height: 3 }}
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    );

    if (isResting) {
      const marco = barbers.find(b => b.name.toLowerCase().includes('marco'));
      const topBarber = barberOfMonth || barbers.find(b => b.name.toLowerCase().includes('abraham')) || (barbers.length > 0 ? barbers[0] : null);
      const featuredReviews = topBarber ? reviews.filter(r => r.staff_id === topBarber.id) : [];
      const featuredAvg = featuredReviews.length
        ? (featuredReviews.reduce((acc, r) => acc + (r.rating || 0), 0) / featuredReviews.length).toFixed(1)
        : null;

      return (
        <div
          ref={scrollContainerRef}
          onScroll={handleLandingScroll}
          className="landing-scroll-container w-full"
          style={{ paddingBottom: '0px' }}
        >
            {heroContent}


          {/* Stats Bar */}
          <div className="w-full bg-[#e9eae8] border-y border-[rgba(17, 17, 17,0.1)] py-8 px-6 lg:px-16 relative z-20">
            <div className="max-w-[1440px] mx-auto grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8 md:gap-0 items-center justify-items-center">
              {/* Stat 1 */}
              <div className="flex items-center gap-5 w-full md:justify-center md:border-r md:border-[#d9c08f]/15 px-6 reveal-item delay-100 animate-float-subtle" style={{ animationDelay: '0ms' }}>
                <span className="text-[22px] font-bold text-[#d9c08f] bg-[#d9c08f]/15 px-3 py-1.5 rounded-full font-sans tracking-tight leading-none select-none">01</span>
                <div className="flex flex-col text-left">
                  <span className="text-xl lg:text-2xl font-extrabold text-[#111111] tracking-tight leading-tight" style={{ animationDelay: '0s' }}>TRAYECTORIA</span>
                  <span className="text-xs text-[#64748b] font-medium">Cuidando sonrisas desde 2018</span>
                </div>
              </div>
              {/* Stat 2 */}
              <div className="flex items-center gap-5 w-full md:justify-center md:border-r md:border-[#d9c08f]/15 px-6 reveal-item delay-200 animate-float-subtle" style={{ animationDelay: '300ms' }}>
                <span className="text-[22px] font-bold text-[#d9c08f] bg-[#d9c08f]/15 px-3 py-1.5 rounded-full font-sans tracking-tight leading-none select-none">02</span>
                <div className="flex flex-col text-left">
                  <span className="text-xl lg:text-2xl font-extrabold text-[#111111] tracking-tight leading-tight" style={{ animationDelay: '1.2s' }}>PRECISIÓN</span>
                  <span className="text-xs text-[#64748b] font-medium">Cada detalle trabajado con intención</span>
                </div>
              </div>
              {/* Stat 3 */}
              <div className="flex items-center gap-5 w-full md:justify-center md:border-r md:border-[#d9c08f]/15 px-6 reveal-item delay-300 animate-float-subtle" style={{ animationDelay: '600ms' }}>
                <span className="text-[22px] font-bold text-[#d9c08f] bg-[#d9c08f]/15 px-3 py-1.5 rounded-full font-sans tracking-tight leading-none select-none">03</span>
                <div className="flex flex-col text-left">
                  <span className="text-xl lg:text-2xl font-extrabold text-[#111111] tracking-tight leading-tight" style={{ animationDelay: '2.4s' }}>SALUD & DISEÑO</span>
                  <span className="text-xs text-[#64748b] font-medium">Especialistas en un solo lugar</span>
                </div>
              </div>
              {/* Stat 4 */}
              <div className="flex items-center gap-5 w-full md:justify-center px-6 reveal-item delay-400 animate-float-subtle" style={{ animationDelay: '900ms' }}>
                <span className="text-[22px] font-bold text-[#d9c08f] bg-[#d9c08f]/15 px-3 py-1.5 rounded-full font-sans tracking-tight leading-none select-none">04</span>
                <div className="flex flex-col text-left">
                  <span className="text-xl lg:text-2xl font-extrabold text-[#111111] tracking-tight leading-tight" style={{ animationDelay: '3.6s' }}>EXPERIENCIA DIENTES SANOS</span>
                  <span className="text-xs text-[#64748b] font-medium">Atención, tecnología y confianza en cada visita</span>
                </div>
              </div>
            </div>
          </div>

          {/* Vertical Flow Sections Container */}
          <div className="w-full max-w-[1440px] mx-auto px-6 lg:px-8 pt-16 pb-0 space-y-20 relative z-10">
            
            {/* SECTION: ELIGE TU SERVICIO */}
            <div id="servicios" className="w-full flex flex-col">
              <FadeInUp className="w-full text-center">
                <span className="text-[10px] font-bold uppercase tracking-[0.25em] text-[#111111] block mb-2">EXPERIENCIA EXCLUSIVA</span>
                <h2 className="text-3xl lg:text-4xl font-extrabold text-[#111111] tracking-tight uppercase font-sans mb-12 title-loop-pulse">
                  ELIGE TU <span className="text-[#d9c08f]">SERVICIO</span>
                </h2>
              </FadeInUp>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-[1440px] mx-auto">
              {/* Card 1: Estética */}
              <FadeInUp delay={0.1}

                  className="relative rounded-2xl overflow-hidden h-[420px] flex flex-col justify-end p-6 lg:p-8 text-left border border-[rgba(17, 17, 17,0.18)] group cursor-pointer reveal-item delay-100"
                  onClick={() => {
                    setArtistFilter('Odontologos');
                    setBarberStartIndex(0);
                    document.getElementById('equipo')?.scrollIntoView({ behavior: 'smooth' });
                  }}
                >
                  <div 
                    className="absolute inset-0 bg-cover bg-center transition-all duration-700 brightness-[0.6] md:group-hover:brightness-[0.88] md:group-hover:scale-110 z-0"
                    style={{ background: 'linear-gradient(135deg,#f7f4ee 0%,#efe6d5 50%,#e8d4b0 100%)' }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent z-1" />
                  
                  <div className="relative z-10 flex flex-col items-start gap-4">
                    <div className="w-12 h-12 rounded-full bg-[#111111] flex items-center justify-center shadow-[0_6px_20px_rgba(0,0,0,0.06)] transition-transform duration-300 md:group-hover:scale-110">
                      <Sparkles size={20} className="text-white" />
                    </div>
                    <div>
                      <h3 className="text-xl font-extrabold text-white mb-2 uppercase tracking-wide">ESTÉTICA</h3>
                      <p className="text-white/75 text-sm leading-relaxed mb-4">Blanqueamiento, limpieza profunda y diseño de sonrisa.</p>
                      <span className="text-white text-sm font-extrabold uppercase tracking-wider flex items-center gap-1 hover:underline cursor-pointer">
                        EXPLORAR SERVICIOS <span className="text-[14px]">→</span>
                      </span>
                    </div>
                  </div>
                </FadeInUp>

                {/* Card 2: Ortodoncia */}
                <FadeInUp delay={0.2}
                  className="relative rounded-2xl overflow-hidden h-[420px] flex flex-col justify-end p-6 lg:p-8 text-left border border-[rgba(17, 17, 17,0.18)] group cursor-pointer reveal-item delay-200"
                  onClick={() => {
                    setArtistFilter('');
                    setBarberStartIndex(0);
                    document.getElementById('equipo')?.scrollIntoView({ behavior: 'smooth' });
                  }}
                >
                  <div 
                    className="absolute inset-0 bg-cover bg-center transition-all duration-700 brightness-[0.6] md:group-hover:brightness-[0.88] md:group-hover:scale-110 z-0"
                    style={{ background: 'linear-gradient(135deg,#efe6d5 0%,#e8d4b0 50%,#d9c08f 100%)' }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent z-1" />
                  
                  <div className="relative z-10 flex flex-col items-start gap-4">
                    <div className="w-12 h-12 rounded-full bg-[#111111] flex items-center justify-center shadow-[0_6px_20px_rgba(0,0,0,0.06)] transition-transform duration-300 md:group-hover:scale-110">
                      <Activity size={20} className="text-white" />
                    </div>
                    <div>
                      <h3 className="text-xl font-extrabold text-white mb-2 uppercase tracking-wide">ORTODONCIA</h3>
                      <p className="text-white/75 text-sm leading-relaxed mb-4">Alinea tu sonrisa con opciones discretas y efectivas.</p>
                      <span className="text-white text-sm font-extrabold uppercase tracking-wider flex items-center gap-1 hover:underline cursor-pointer">
                        CONOCER ESPECIALISTAS <span className="text-[14px]">→</span>
                      </span>
                    </div>
                  </div>
                </FadeInUp>

                {/* Card 3: Odontopediatría */}
                <FadeInUp delay={0.3}
                  className="relative rounded-2xl overflow-hidden h-[420px] flex flex-col justify-end p-6 lg:p-8 text-left border border-[rgba(17, 17, 17,0.18)] group cursor-pointer reveal-item delay-300"
                  onClick={() => document.getElementById('pandakids')?.scrollIntoView({ behavior: 'smooth' })}
                >
                  <div 
                    className="absolute inset-0 bg-cover bg-center transition-all duration-700 brightness-[0.6] md:group-hover:brightness-[0.88] md:group-hover:scale-110 z-0"
                    style={{ background: 'linear-gradient(135deg,#f7f4ee 0%,#efe6d5 50%,#e8d4b0 100%)' }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent z-1" />
                  
                  <div className="relative z-10 flex flex-col items-start gap-4">
                    <div className="w-12 h-12 rounded-full bg-[#111111] flex items-center justify-center shadow-[0_6px_20px_rgba(0,0,0,0.06)] shadow-[#111111]/20 transition-transform duration-300 md:group-hover:scale-110">
                      <Heart size={20} className="text-white" fill="white" />
                    </div>
                    <div>
                      <h3 className="text-xl font-extrabold text-white mb-2 uppercase tracking-wide">ODONTOPEDIATRÍA</h3>
                      <p className="text-white/75 text-sm leading-relaxed mb-4">Cuidamos las sonrisas de los más pequeños. Paciencia y confianza garantizadas.</p>
                      <span className="text-white text-sm font-extrabold uppercase tracking-wider flex items-center gap-1 hover:underline cursor-pointer">
                        VER SERVICIOS INFANTILES <span className="text-[14px]">→</span>
                      </span>
                    </div>
                  </div>
                </FadeInUp>

                {/* Card 4: Experiencia Dientes Sanos */}
                <FadeInUp delay={0.4}
                  className="relative rounded-2xl overflow-hidden h-[420px] flex flex-col justify-end p-6 lg:p-8 text-left border border-[rgba(17, 17, 17,0.18)] group cursor-pointer reveal-item delay-400"
                  onClick={() => document.getElementById('experiencia-section')?.scrollIntoView({ behavior: 'smooth' })}
                >
                  <div 
                    className="absolute inset-0 bg-cover bg-center transition-all duration-700 brightness-[0.6] md:group-hover:brightness-[0.88] md:group-hover:scale-110 z-0"
                    style={{ background: 'linear-gradient(135deg,#efe6d5 0%,#e8d4b0 50%,#d9c08f 100%)' }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent z-1" />
                  
                  <div className="relative z-10 flex flex-col items-start gap-4">
                    <div className="w-12 h-12 rounded-full bg-[#111111] flex items-center justify-center shadow-[0_6px_20px_rgba(0,0,0,0.06)] transition-transform duration-300 md:group-hover:scale-110">
                      <Crown size={20} className="text-white" />
                    </div>
                    <div>
                      <h3 className="text-xl font-extrabold text-white mb-2 uppercase tracking-wide">EXPERIENCIA DIENTES SANOS</h3>
                      <p className="text-white/75 text-sm leading-relaxed mb-4">Ambiente confortable, tecnología moderna y trato cercano.</p>
                      <span className="text-white text-sm font-extrabold uppercase tracking-wider flex items-center gap-1 hover:underline cursor-pointer">
                        DESCUBRIR MÁS <span className="text-[14px]">→</span>
                      </span>
                    </div>
                  </div>
                </FadeInUp>
              </div>
            </div>


            {/* SECTION: NUESTROS ARTISTAS / EL EQUIPO */}
            <div id="equipo" className="w-full flex flex-col space-y-10 pt-16">
              <FadeInUp className="w-full text-center reveal-item">
                <h2 className="text-3xl lg:text-4xl font-extrabold text-[#111111] tracking-tight uppercase font-sans title-loop-pulse">
                  NUESTRO <span className="text-[#d9c08f]">EQUIPO</span>
                </h2>
              </FadeInUp>
                
              {/* Categorías de Equipo con estilo de Barbería Premium */}
              <FadeInUp delay={0.1} className="relative flex items-center p-1.5 bg-white border border-[#d9c08f]/20 rounded-full w-[310px] sm:w-[380px] md:w-[460px] mx-auto shadow-[0_10px_30px_rgba(0,0,0,0.06)] md:backdrop-blur-md backdrop-blur-sm">
                {/* Fondo deslizante con efecto de Barber Pole animado en dorado */}
                <div 
                  className="absolute top-[8%] h-[84%] w-[31%] rounded-full transition-all duration-300 ease-[cubic-bezier(0.25,1,0.5,1)] barber-pole-glow" 
                  style={{ 
                    left: artistFilter === 'todos' ? '1.5%' : artistFilter === 'Odontologos' ? '34.5%' : '67.5%' 
                  }} 
                />
                
                <button 
                  onClick={() => { setArtistFilter('todos'); setBarberStartIndex(0); }}
                  className={`relative w-1/3 py-3 rounded-full text-[11px] sm:text-sm uppercase tracking-widest font-black transition-all duration-300 z-10 flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 ${
                    artistFilter === 'todos' ? 'text-black font-extrabold' : 'text-[#64748b] hover:text-[#0f172a]'
                  }`}
                >
                  <Users size={15} className={artistFilter === 'todos' ? 'animate-pulse' : ''} />
                  <span>Todos</span>
                </button>
                
                <button 
                  onClick={() => { setArtistFilter('Odontologos'); setBarberStartIndex(0); }}
                  className={`relative w-1/3 py-3 rounded-full text-[11px] sm:text-sm uppercase tracking-widest font-black transition-all duration-300 z-10 flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 ${
                    artistFilter === 'Odontologos' ? 'text-black font-extrabold' : 'text-[#64748b] hover:text-[#0f172a]'
                  }`}
                >
                  <HeartPulse size={15} className={artistFilter === 'Odontologos' ? 'animate-spin-slow' : ''} />
                  <span>Odontólogos</span>
                </button>
                
                <button 
                  onClick={() => { setArtistFilter(''); setBarberStartIndex(0); }}
                  className={`relative w-1/3 py-3 rounded-full text-[11px] sm:text-sm uppercase tracking-widest font-black transition-all duration-300 z-10 flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 ${
                    artistFilter === '' ? 'text-black font-extrabold' : 'text-[#64748b] hover:text-[#0f172a]'
                  }`}
                >
                  <PenTool size={13} className={artistFilter === '' ? 'animate-bounce' : ''} />
                  <span></span>
                </button>
              </FadeInUp>

              {/* Slider Component */}
              <FadeInUp delay={0.2} className="relative w-full px-12 group/slider">
                {/* Nav buttons */}
                {(() => {
                  const filteredCount = barbers.filter(barber => staffMatchesArtistFilter(barber, artistFilter)).length;
                  const maxIndex = Math.max(0, filteredCount - visibleCount);
                  
                  return (
                    <>
                      <button
                        onClick={() => { pauseTeamCarousel(); setBarberStartIndex(prev => Math.max(0, prev - 1)); }}
                        disabled={barberStartIndex === 0}
                        className="absolute left-0 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white border border-[#d9c08f]/20 flex items-center justify-center text-[#64748b] hover:text-[#0f172a] hover:border-[#111111]/50 transition-all disabled:opacity-0 disabled:pointer-events-none z-10 cursor-pointer shadow-[0_6px_20px_rgba(0,0,0,0.06)]"
                      >
                        <ChevronLeft size={20} />
                      </button>

                      <button
                        onClick={() => { pauseTeamCarousel(); setBarberStartIndex(prev => Math.min(maxIndex, prev + 1)); }}
                        disabled={barberStartIndex >= maxIndex}
                        className="absolute right-0 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white border border-[#d9c08f]/20 flex items-center justify-center text-[#64748b] hover:text-[#0f172a] hover:border-[#111111]/50 transition-all disabled:opacity-0 disabled:pointer-events-none z-10 cursor-pointer shadow-[0_6px_20px_rgba(0,0,0,0.06)]"
                      >
                        <ChevronRight size={20} />
                      </button>
                    </>
                  );
                })()}
 
                 <div 
                   className="overflow-hidden w-full touch-pan-y cursor-grab active:cursor-grabbing select-none"
                   onTouchStart={handleTouchStart}
                   onTouchMove={handleTouchMove}
                   onTouchEnd={handleTouchEnd}
                   onMouseDown={handleMouseDown}
                   onMouseMove={handleMouseMove}
                   onMouseUp={handleMouseUp}
                   onMouseLeave={handleMouseLeave}
                 >
                   <div 
                     className="flex transition-transform duration-500 ease-in-out"
                     style={{ transform: `translateX(-${barberStartIndex * (100 / visibleCount)}%)` }}
                     key={artistFilter}
                   >
                     {barbers.length === 0 ? (
                      Array.from({ length: visibleCount }).map((_, idx) => (
                        <div key={`skeleton-${idx}`} className="shrink-0 px-3" style={{ width: `${100 / visibleCount}%` }}>
                          <div className="flex flex-col items-center text-center relative w-full animate-pulse">
                            <div className="w-full aspect-[4/5] rounded-2xl bg-[#f7f7f5] border border-[#d9c08f]/15 mb-4" />
                            <div className="h-5 w-32 bg-[#e9eae8] rounded mb-2" />
                            <div className="h-3.5 w-24 bg-[#111111]/10 rounded mb-2" />
                            <div className="h-3 w-40 bg-[#f7f7f5] rounded mb-4" />
                            <div className="h-9 w-28 bg-[#f7f7f5] border border-[#d9c08f]/20 rounded-full" />
                          </div>
                        </div>
                      ))
                    ) : (
                      barbers.filter(barber => staffMatchesArtistFilter(barber, artistFilter)).map((barber, idx) => {
                       const isAngel = barber.name === 'Ángel Serrano';
                       const isMarko = barber.name === 'Marko Cardozo';
                        const isAbraham = barber.name === 'Abraham Díaz';
                        const isAlejandro = barber.name === 'Alejandro Ramírez';
                        const isJose = barber.name === 'José Cordero';
                        
                        const displayName = barber.name;
                       const rawRole = (barber.role?.split('|')[0] || 'Especialista').trim();
                       const isRawRolePermissions = rawRole.includes(',') || rawRole.toLowerCase().includes('schedule');
                       
                       const isBarista = rawRole.toLowerCase().includes('barista');
                       const isAsistente = rawRole.toLowerCase().includes('lavado') || rawRole.toLowerCase().includes('asist') || rawRole.toLowerCase().includes('clean');
                       const isBookable = isBookableStaff(barber);
                       
                       const specialtyText = (barber.specialty || '').trim() 
                          ? barber.specialty.trim().toUpperCase() 
                          : (isAbraham ? 'MASTER DENTAL' : isAlejandro ? 'ODONTÓLOGO' : isAngel ? 'ODONTÓLOGO' : isJose ? 'ESTÉTICA' : isMarko ? 'ESTÉTICA' : (isBarista ? 'BARISTA' : isAsistente ? 'ASISTENTE CLÍNICO' : (isRawRolePermissions ? 'ASISTENTE' : rawRole.toUpperCase())));
                       const cleanTags = (barber.role?.split('|')[1] || '').trim();
                       const isRawPermissions = cleanTags.includes(',') || cleanTags.includes('barber') || cleanTags.includes('schedule') || !cleanTags;
                       const defaultTags = isBarista ? 'Café • Bebidas • Experiencia' : (isAsistente ? 'Higiene • Confort • Cuidado' : (specialtyText.includes('TATUA') || rawRole.toLowerCase().includes('tatu') ? 'Estética • Blanqueamiento • Sonrisa' : (specialtyText.includes('MANICUR') || specialtyText.includes('UÑA') ? 'Estética • Diseño • Sonrisa' : 'Prevención • Estética • Confort')));
                       const tagsText = !isRawPermissions 
                         ? cleanTags 
                         : (isAbraham ? 'Prevención • Estética • Control' : isAlejandro ? 'Ortodoncia • Estética • Control' : isAngel ? 'Endodoncia • Urgencias • Confort' : isJose ? 'Estética • Blanqueamiento' : isMarko ? 'Estética • Blanqueamiento' : defaultTags);
                       
                       return (
                         <div key={barber.id} className="shrink-0 px-3 animate-[premiumFadeUp_0.6s_cubic-bezier(0.16,1,0.3,1)_both]" style={{ width: `${100 / visibleCount}%`, animationDelay: `${idx * 60}ms` }}>
                           <div className="flex flex-col items-center text-center relative group transition-all duration-300">
                             <div 
                                onMouseEnter={(e) => {
                                  if (isBookable) {
                                    pauseTeamCarousel();
                                    const video = e.currentTarget.querySelector('video');
                                    if (video) { try { video.play(); } catch (err) {} }
                                  }
                                }}
                                onMouseLeave={(e) => {
                                  if (isBookable) {
                                    const video = e.currentTarget.querySelector('video');
                                    if (video) {
                                      try {
                                        video.pause();
                                        video.currentTime = 0;
                                      } catch (err) {}
                                    }
                                  }
                                }}
                                onClick={() => {
                                  if (!isBookable) return;
                                  const openProfile = () => {
                                    rememberLandingScrollPosition();
                                    setProfileSourceStep(1);
                                    setStep(2);
                                    setExpandedBarber(barber);
                                    setShowWelcome(false);
                                    loadExpandedPortfolio(barber.id);
                                    setActiveTeamCardId(null);
                                    scrollToTop();
                                  };
                                  if (isTouchDevice && activeTeamCardId !== barber.id) {
                                    // First tap on mobile: reveal video + "Ver Perfil" instead of navigating right away
                                    pauseTeamCarousel();
                                    setActiveTeamCardId(barber.id);
                                    return;
                                  }
                                  openProfile();
                                }}
                                className={`w-full aspect-[4/5] rounded-2xl overflow-hidden mb-4 relative bg-[#f7f7f5] border border-[#d9c08f]/15 shadow-[0_10px_30px_rgba(0,0,0,0.06)] ${
                                  isBookable ? 'cursor-pointer' : ''
                                }`}
                              >
                                <BarberAvatar url={barber.image_url} name={barber.name} className="w-full h-full object-cover transition-transform duration-700 md:group-hover:scale-105" iconSize={40} />

                                {/* Hover-to-Autoplay Presentation Video (desktop) / Tap-to-Reveal (mobile) */}
                                {isBookable && barber.video_url && (
                                  <video
                                    src={barber.video_url}
                                    loop
                                    muted
                                    playsInline
                                    preload="none"
                                    autoPlay={activeTeamCardId === barber.id}
                                    className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-500 z-[1] pointer-events-none group-hover:opacity-100 ${
                                      activeTeamCardId === barber.id ? 'opacity-100' : 'opacity-0'
                                    }`}
                                    style={{ objectPosition: 'center top' }}
                                  />
                                )}

                                {/* Sleek Apple style view profile overlay on hover (desktop) / first tap (mobile) */}
                                {isBookable && (
                                  <div className={`absolute inset-0 bg-black/40 backdrop-blur-[1px] transition-all duration-300 flex flex-col items-center justify-center gap-2 z-[2] group-hover:opacity-100 group-hover:pointer-events-auto ${
                                    activeTeamCardId === barber.id ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
                                  }`}>
                                    <div className="w-10 h-10 rounded-full bg-black/60 border border-white/30 flex items-center justify-center text-white shadow-[0_6px_20px_rgba(0,0,0,0.06)]">
                                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                                        <circle cx="12" cy="12" r="3"/>
                                      </svg>
                                    </div>
                                    <span className="text-[9px] font-black uppercase tracking-widest text-white">Ver Perfil</span>
                                  </div>
                                )}

                              </div>
                             <h4 className="text-xl lg:text-2xl font-extrabold text-[#0f172a] mb-1 tracking-tight">{displayName}</h4>
                             <span className="text-xs lg:text-sm font-black text-[#111111] tracking-widest uppercase mb-2">{specialtyText}</span>
                             <p className="text-sm lg:text-base text-[#475569] mb-4 truncate w-full tracking-wide">{tagsText}</p>
                             {isBookable ? (
                                <button 
                                  onClick={(e) => { e.stopPropagation(); setSelectedBarber(barber); handleStartBooking(); }}
                                  className="mt-4 px-8 py-2.5 rounded-full border text-xs lg:text-sm font-black uppercase tracking-widest transition-all duration-300 hover:scale-105 active:scale-95 cursor-pointer"
                                  style={{
                                    borderColor: 'rgba(17, 17, 17, 0.35)',
                                    background: 'rgba(17, 17, 17, 0.04)',
                                    color: '#111111',
                                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.06)'
                                  }}
                                  onMouseEnter={(e) => {
                                    e.currentTarget.style.background = '#111111';
                                    e.currentTarget.style.color = '#ffffff';
                                    e.currentTarget.style.borderColor = '#111111';
                                    e.currentTarget.style.boxShadow = '0 0 15px rgba(17, 17, 17, 0.4)';
                                  }}
                                  onMouseLeave={(e) => {
                                    e.currentTarget.style.background = 'rgba(17, 17, 17, 0.04)';
                                    e.currentTarget.style.color = '#111111';
                                    e.currentTarget.style.borderColor = 'rgba(17, 17, 17, 0.35)';
                                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.06)';
                                  }}
                                >
                                  Reservar Cita
                                </button>
                              ) : (
                                <div className="mt-4 px-8 py-2.5 rounded-full border border-[#d9c08f]/15 bg-white text-xs lg:text-sm font-black uppercase tracking-widest text-[#94a3b8] cursor-default select-none">
                                   Staff Dientes Sanos
                                </div>
                              )}
                           </div>
                         </div>
                       );
                    })
                    )}
                  </div>
                </div>
              </FadeInUp>
            </div>

            {/* SECTION: ODONTOPEDIATRÍA — Premium responsive grid layout */}
            <FadeInUp id="pandakids" className="w-full reveal-item scroll-mt-24 py-12">
              {/* CSS for micro-animations inside this section */}
              <style>{`
                .kids-feature-item:hover .icon-scissors svg {
                  animation: scissor-cut 0.5s ease-in-out infinite;
                }
                .kids-feature-item:hover .icon-sparkles svg {
                  animation: sparkle-spin 0.8s linear infinite;
                }
                .kids-feature-item:hover .icon-gamepad svg {
                  animation: gamepad-wiggle 0.4s ease-in-out infinite;
                }
                .kids-feature-item:hover .icon-heart svg {
                  animation: heart-pulse 0.6s ease-in-out infinite;
                }

                @keyframes scissor-cut {
                  0%, 100% { transform: rotate(0deg); }
                  50% { transform: rotate(-15deg); }
                }
                @keyframes sparkle-spin {
                  0% { transform: rotate(0deg) scale(1); }
                  50% { transform: rotate(180deg) scale(1.25); }
                  100% { transform: rotate(360deg) scale(1); }
                }
                @keyframes gamepad-wiggle {
                  0%, 100% { transform: rotate(0deg) translateY(0); }
                  25% { transform: rotate(-8deg) translateY(-2px); }
                  75% { transform: rotate(8deg) translateY(2px); }
                }
                @keyframes heart-pulse {
                  0%, 100% { transform: scale(1); }
                  50% { transform: scale(1.22); }
                }

                /* Mobile Mural Marquee Animations */
                @keyframes marqueeLeft {
                  0% { transform: translateX(0); }
                  100% { transform: translateX(-50%); }
                }
                @keyframes marqueeRight {
                  0% { transform: translateX(-50%); }
                  100% { transform: translateX(0); }
                }
                .marquee-strip-left {
                  animation: marqueeLeft 30s linear infinite;
                }
                .marquee-strip-right {
                  animation: marqueeRight 35s linear infinite;
                }
              `}</style>

              <div className="w-full grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-10 xl:gap-14">
                
                {/* COLUMN 1: Floating Video Player */}
                <div className="w-full md:col-span-1 lg:col-span-4 relative group flex-shrink-0">
                  {/* Premium Ambient glow behind the video */}
                  <div 
                    className="absolute -inset-4 bg-radial-gradient rounded-[2.5rem] blur-xl opacity-60 pointer-events-none z-0 group-hover:opacity-85 transition-opacity duration-700" 
                    style={{ backgroundImage: 'radial-gradient(circle, rgba(17, 17, 17, 0.22) 0%, transparent 70%)' }} 
                  />
                  
                  {/* Video container */}
                  <div ref={kidsVideoRef} className="w-full aspect-[3/4] lg:aspect-auto h-full relative rounded-[2rem] overflow-hidden border border-[#d9c08f]/15 shadow-2xl z-10" style={{ background: 'linear-gradient(135deg,#f7f4ee 0%,#efe6d5 50%,#e8d4b0 100%)' }}>
                    <div className="absolute inset-0 w-full h-full" style={{ background: 'linear-gradient(135deg,#f7f4ee 0%,#efe6d5 50%,#e8d4b0 100%)' }} />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent pointer-events-none" />
                    
                    {/* Floating badge inside video */}
                    <div className="absolute top-6 left-6 z-10 bg-black/60 md:backdrop-blur-md backdrop-blur-sm border border-white/10 py-1.5 px-3 rounded-lg flex items-center gap-1.5">
                      <Heart size={12} className="text-[#111111]" fill="#111111" />
                      <span className="text-[9px] font-extrabold text-white tracking-widest uppercase">ODONTOPEDIATRÍA</span>
                    </div>
                  </div>
                </div>

                {/* COLUMN 2: Copywriting & Vertical Features */}
                <div className="w-full md:col-span-1 lg:col-span-4 text-left flex flex-col justify-start py-2 gap-8 z-10">
                  <div className="space-y-4">
                    <span className="text-[10px] font-bold uppercase tracking-[0.25em] text-[#111111] block">SU PRIMERA SONRISA</span>
                    <h2 className="text-3xl lg:text-4xl font-extrabold text-[#111111] tracking-tight uppercase leading-tight font-sans title-loop-pulse">
                      SONRISAS QUE HACEN<br />
                      <span className="text-[#111111]">FELICES A LOS PEQUEÑOS</span>
                    </h2>
                    
                    {/* Minimalist, high-end indicators */}
                    <div className="flex items-center gap-3 text-[10px] sm:text-[11px] font-bold tracking-[0.2em] text-[#111111] uppercase pt-1">
                      <span>EDADES: 1 A 12 AÑOS</span>
                      <span className="text-[#cbd5e1] select-none">•</span>
                      <span>SALA INFANTIL</span>
                    </div>

                    <p className="text-[#475569] text-[15px] leading-relaxed pt-1">
                       En Dientes Sanos los niños son parte de nuestra familia. Nuestros odontólogos saben exactamente cómo crear una experiencia divertida, cómoda y especial para ellos.
                    </p>
                  </div>

                  {/* Feature List — Interactive hover styling */}
                  <div className="space-y-4 pt-1">
                    {[
                      { icon: <HeartPulse size={15} />, class: 'icon-scissors', title: 'Butaca dental infantil', desc: 'Asiento adaptado para que estén cómodos' },
                      { icon: <Sparkles size={15} />, class: 'icon-sparkles', title: 'Productos suaves', desc: 'Formulados para la boca de los niños' },
                      { icon: <Gamepad2 size={15} />, class: 'icon-gamepad', title: 'Ambiente divertido', desc: 'Una experiencia que les va a encantar' },
                      { icon: <Heart size={15} />, class: 'icon-heart', title: 'Odontólogos pacientes', desc: 'Con experiencia en atención a niños' },
                    ].map((feat, i) => (
                      <div key={i} className="flex gap-3 kids-feature-item group/feat cursor-pointer">
                        <div className={`w-8 h-8 rounded-lg bg-[#111111]/10 border border-[#111111]/15 flex items-center justify-center flex-shrink-0 text-[#111111] mt-0.5 transition-all duration-300 group-hover/feat:bg-[#111111] group-hover/feat:text-white ${feat.class}`}>
                          {feat.icon}
                        </div>
                        <div>
                          <h4 className="text-[#0f172a] text-[13.5px] font-bold leading-snug mb-0.5 group-hover/feat:text-[#111111] transition-colors duration-300">{feat.title}</h4>
                          <p className="text-[#64748b] text-[11.5px] lg:text-[12px] leading-relaxed">{feat.desc}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* COLUMN 3: Social Proof & CTA */}
                <div className="w-full md:col-span-2 lg:col-span-4 text-left flex flex-col justify-between py-2 space-y-6 md:border-t md:border-[#d9c08f]/15 md:pt-6 lg:border-t-0 lg:border-l lg:pt-2 lg:pl-10 xl:pl-14 md:max-w-2xl md:mx-auto lg:max-w-none z-10">
                  {/* Premium Floating Testimonial Card */}
                  <div className="bg-white border border-[#d9c08f]/15 rounded-2xl p-6 relative flex-1 flex flex-col justify-center space-y-4">
                    <span className="text-[3rem] text-[#111111]/15 font-serif absolute -top-2 -left-1 select-none pointer-events-none">“</span>
                    <p className="text-[#334155] text-[14px] leading-relaxed italic relative z-1">
                      Me gustó mucho la cita, el odontólogo fue muy paciente y amable, y lo trató súper bien. ¡Volveremos pronto sin duda!
                    </p>
                    <div className="border-t border-[#d9c08f]/15 pt-4 flex items-center gap-3">
                      {/* Avatar Initials Badge */}
                      <div className="w-8 h-8 rounded-full bg-[#111111]/15 border border-[#111111]/20 flex items-center justify-center flex-shrink-0">
                        <span className="text-[#111111] text-[10px] font-extrabold tracking-wider">PM</span>
                      </div>
                      <div className="text-left">
                        <p className="text-[#0f172a] text-[13px] font-bold">Papá de Mateo</p>
                        <div className="flex items-center gap-0.5 mt-0.5">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <Star key={i} size={11} className="text-[#111111]" fill="#111111" />
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* CTA Buttons stack */}
                  <div className="flex flex-col sm:flex-row lg:flex-col gap-3 w-full">
                    <button
                      onClick={() => handleStartBooking('Odontopediatría')}
                      className="btn-gold w-full sm:w-auto sm:flex-1 py-3.5 px-6 rounded-xl font-extrabold text-[12px] uppercase tracking-wider flex items-center justify-center gap-2 whitespace-nowrap"
                      style={{ borderRadius: '12px' }}
                    >
                      <Heart size={13} fill="black" /> RESERVAR PARA MI HIJO
                    </button>
                    <button
                      onClick={() => document.getElementById('equipo')?.scrollIntoView({ behavior: 'smooth' })}
                      className="btn-outline w-full sm:w-auto sm:flex-1 py-3.5 px-6 rounded-xl font-extrabold text-[12px] uppercase tracking-wider flex items-center justify-center gap-2"
                      style={{ borderRadius: '12px', borderColor: 'rgba(0,0,0,0.15)', color: '#0f172a' }}
                    >
                      VER EL EQUIPO
                    </button>
                  </div>
                </div>

              </div>
            </FadeInUp>

                    {/* SECTION: ESPECIALISTA DESTACADO DEL MES */}
            {topBarber && (
              <FadeInUp className="w-full text-left">
                <div className="w-full bg-white border border-[#d9c08f]/15 rounded-3xl overflow-hidden flex flex-col lg:flex-row items-stretch group hover:border-[rgba(17, 17, 17,0.12)] transition-all duration-500">
                  {/* Left Column: Full-Bleed Portrait */}
                  <div className="w-full lg:w-[38%] min-h-[420px] lg:min-h-auto relative bg-white flex-shrink-0">
                    <BarberAvatar url={topBarber.image_url} name={topBarber.name} className="absolute inset-0 w-full h-full object-cover" iconSize={60} />
                    <div className="absolute inset-0 bg-gradient-to-t lg:bg-gradient-to-r from-black/80 via-black/20 lg:via-transparent to-transparent lg:to-[#111115]/30 z-1" />
                    
                    {/* Floating badge */}
                    <div className="absolute top-6 left-6 z-10 bg-black/70 md:backdrop-blur-md backdrop-blur-sm border border-white/10 py-1.5 px-3 rounded-lg flex items-center gap-1.5">
                      <span className="text-[9px] font-extrabold text-[#111111] tracking-widest uppercase">ESPECIALISTA DEL MES</span>
                    </div>
                  </div>

                  {/* Right Column: Info & Portfolio Grid */}
                  <div className="flex-1 p-8 lg:p-12 text-left space-y-8 flex flex-col justify-center">
                    <div className="space-y-3">
                      <span className="text-[10px] font-bold uppercase tracking-[0.25em] text-[#111111] block">TALENTO DESTACADO</span>
                      <h3 className="text-3xl lg:text-4xl font-extrabold text-[#0f172a] tracking-tight uppercase font-sans">
                        {topBarber.name}
                      </h3>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-extrabold tracking-widest text-[#475569] uppercase">
                          ESPECIALISTA DENTAL
                        </span>
                        <span className="text-[#cbd5e1]">•</span>
                        <span className="text-[10px] font-extrabold tracking-widest text-[#111111] uppercase">
                          TOP DEL MES
                        </span>
                      </div>
                    </div>

                    {/* Biography Quote */}
                    <p className="text-[#334155] text-[15px] leading-relaxed italic border-l-2 border-[#111111]/30 pl-4">
                      "{topBarber.biography || 'Especializado en tratamientos estéticos y preventivos, con precisión y cuidado en cada detalle.'}"
                    </p>

                    {/* Bottom Stats Grid */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-[#111111]/10 flex items-center justify-center">
                          <Check size={14} className="text-[#111111]" />
                        </div>
                        <div className="flex flex-col text-left">
                          <span className="text-sm font-extrabold text-[#0f172a] leading-tight">+8 años</span>
                          <span className="text-[11px] lg:text-[12px] text-[#475569]">de experiencia</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-[#111111]/10 flex items-center justify-center">
                          <Star size={14} className="text-[#111111]" />
                        </div>
                        <div className="flex flex-col text-left">
                          <span className="text-sm font-extrabold text-[#0f172a] leading-tight">500+</span>
                          <span className="text-[11px] lg:text-[12px] text-[#475569]">pacientes felices</span>
                        </div>
                      </div>
                    </div>

                    {/* Portfolio/Trabajos Destacados Grid */}
                    <div className="space-y-3">
                      <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-[#111111]/70 block">CASOS DESTACADOS</span>
                      <div className="grid grid-cols-4 gap-3">
                        {topBarberPortfolio.slice(0, 4).map((img, idx) => (
                          <div key={img.id || idx} className="aspect-square bg-[#f7f7f5] border border-[#d9c08f]/20 rounded-xl overflow-hidden">
                            <img src={img.image_url} alt="Caso destacado" loading="lazy" decoding="async" className="w-full h-full object-cover md:hover:scale-105 transition-transform duration-300 cursor-pointer" />
                          </div>
                        ))}
                        {topBarberPortfolio.length < 4 && Array.from({ length: 4 - topBarberPortfolio.length }).map((_, idx) => (
                          <div key={`ph-${idx}`} className="aspect-square bg-white border border-[#d9c08f]/15 rounded-xl overflow-hidden flex items-center justify-center">
                            <Sparkles size={14} className="text-[#cbd5e1]" />
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-2">
                      <button
                        onClick={() => { setSelectedBarber(topBarber); handleStartBooking(); }}
                        className="btn-gold py-3 px-8 rounded-xl font-extrabold text-[12px] uppercase tracking-wider flex items-center justify-center gap-2 whitespace-nowrap"
                        style={{ borderRadius: '10px' }}
                      >
                        RESERVAR CITA <ArrowRight size={14} />
                      </button>
                      <button
                        onClick={() => {
                          rememberLandingScrollPosition();
                          setProfileSourceStep(1);
                          setStep(2);
                          setExpandedBarber(topBarber);
                          setShowWelcome(false);
                          loadExpandedPortfolio(topBarber.id);
                          scrollToTop();
                        }}
                        className="btn-outline py-3 px-8 rounded-xl font-extrabold text-[12px] uppercase tracking-wider flex items-center justify-center gap-2"
                        style={{ borderRadius: '10px', borderColor: 'rgba(0,0,0,0.12)', color: '#0f172a' }}
                      >
                        <User size={13} /> VER PERFIL
                      </button>
                    </div>
                  </div>
                </div>
              </FadeInUp>
            )}

            <div id="experiencia-section" className="w-full reveal-item scroll-mt-24 py-12 flex flex-col gap-8">
              
              {/* Header Title for the Mural — Mobile only */}
              <div className="text-center space-y-3 block md:hidden">
                <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-[#111111] tracking-tight uppercase font-sans title-loop-pulse">
                  EXPERIENCIA <span className="text-[#d9c08f]">DIENTES SANOS</span>
                </h2>
                <p className="text-[#64748b] text-[13px] sm:text-[14px] max-w-xl mx-auto leading-relaxed font-medium">
                  Cuidamos tu sonrisa en un entorno diseñado para que te sientas cómodo. Explora nuestro espacio y los momentos que hacen de cada visita una experiencia distinta.
                </p>
              </div>

              {/* Desktop Masonry vs Mobile 3D Interactive Card Stack */}
              <div className="w-full">
                
                {/* Mobile & Tablet: Cinematic Mural (Visible only below md) */}
                <div className="flex md:hidden flex-col gap-3 w-full">
                  
                  {/* === HERO: 2 Vertical Videos Side by Side === */}
                  <div className="flex gap-2 w-full">
                    {/* Video 1 — Experiencia principal */}
                    <div ref={muralVideoRef} className="flex-1 rounded-2xl overflow-hidden shadow-2xl border border-[#111111]/20 relative bg-white">
                      <div className="w-full aspect-[9/16]" style={{ background: 'linear-gradient(135deg,#f7f4ee 0%,#efe6d5 50%,#e8d4b0 100%)' }} />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
                    </div>
                    {/* Video 2 — Consultorio */}
                    <div ref={cafeVideoRef} className="flex-1 rounded-2xl overflow-hidden shadow-2xl border border-[#111111]/20 relative bg-white">
                      <div className="w-full aspect-[9/16]" style={{ background: 'linear-gradient(135deg,#f7f4ee 0%,#efe6d5 50%,#e8d4b0 100%)' }} />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
                    </div>
                  </div>

                  {/* === STRIP 1: Marquee scrolling LEFT — larger photos === */}
                  <div className="relative w-full overflow-hidden" style={{ maskImage: 'linear-gradient(to right, transparent 0%, black 8%, black 92%, transparent 100%)', WebkitMaskImage: 'linear-gradient(to right, transparent 0%, black 8%, black 92%, transparent 100%)' }}>
                    <div className="marquee-strip-left flex gap-2 w-max">
                      {/* Original set */}
                      {[mural1, mural2, mural3, mural4, mural5, mural7].map((src, i) => (
                        <div key={`s1-${i}`} className="flex-shrink-0 w-[170px] h-[170px] rounded-xl overflow-hidden shadow-[0_6px_20px_rgba(0,0,0,0.06)] border border-[#d9c08f]/15" style={{ transform: `rotate(${[-1.2, 0.8, -0.5, 1, -0.8, 0.6][i]}deg)` }}>
                          <div className="w-full h-full" style={{ background: 'linear-gradient(135deg,#f7f4ee 0%,#efe6d5 50%,#e8d4b0 100%)' }} />
                        </div>
                      ))}
                      {/* Duplicate set for seamless loop */}
                      {[mural1, mural2, mural3, mural4, mural5, mural7].map((src, i) => (
                        <div key={`s1d-${i}`} className="flex-shrink-0 w-[170px] h-[170px] rounded-xl overflow-hidden shadow-[0_6px_20px_rgba(0,0,0,0.06)] border border-[#d9c08f]/15" style={{ transform: `rotate(${[-1.2, 0.8, -0.5, 1, -0.8, 0.6][i]}deg)` }}>
                          <div className="w-full h-full" style={{ background: 'linear-gradient(135deg,#f7f4ee 0%,#efe6d5 50%,#e8d4b0 100%)' }} />
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* === STRIP 2: Marquee scrolling RIGHT — slightly smaller photos === */}
                  <div className="relative w-full overflow-hidden" style={{ maskImage: 'linear-gradient(to right, transparent 0%, black 8%, black 92%, transparent 100%)', WebkitMaskImage: 'linear-gradient(to right, transparent 0%, black 8%, black 92%, transparent 100%)' }}>
                    <div className="marquee-strip-right flex gap-2 w-max">
                      {/* Original set */}
                      {[mural8, mural9, mural10, mural11, mural1, mural3].map((src, i) => (
                        <div key={`s2-${i}`} className="flex-shrink-0 w-[145px] h-[145px] rounded-xl overflow-hidden shadow-[0_4px_16px_rgba(0,0,0,0.05)] border border-[#d9c08f]/15" style={{ transform: `rotate(${[0.7, -1, 0.5, -0.6, 1.1, -0.4][i]}deg)` }}>
                          <div className="w-full h-full" style={{ background: 'linear-gradient(135deg,#f7f4ee 0%,#efe6d5 50%,#e8d4b0 100%)' }} />
                        </div>
                      ))}
                      {/* Duplicate set for seamless loop */}
                      {[mural8, mural9, mural10, mural11, mural1, mural3].map((src, i) => (
                        <div key={`s2d-${i}`} className="flex-shrink-0 w-[145px] h-[145px] rounded-xl overflow-hidden shadow-[0_4px_16px_rgba(0,0,0,0.05)] border border-[#d9c08f]/15" style={{ transform: `rotate(${[0.7, -1, 0.5, -0.6, 1.1, -0.4][i]}deg)` }}>
                          <div className="w-full h-full" style={{ background: 'linear-gradient(135deg,#f7f4ee 0%,#efe6d5 50%,#e8d4b0 100%)' }} />
                        </div>
                      ))}
                    </div>
                  </div>

                </div>

                {/* Desktop: Premium Bento Grid */}
                <div className="hidden md:block">
                  {/* Header */}
                  <div className="text-center space-y-3 mb-10 relative group/header">
                    <button 
                      onClick={() => setBentoEditMode(!bentoEditMode)}
                      className="hidden absolute top-0 right-0 md:right-4 bg-[#111111]/10 hover:bg-[#111111]/20 text-[#111111] px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider border border-[#111111]/30 transition-colors z-20 opacity-0 group-hover/header:opacity-100"
                    >
                      {bentoEditMode ? 'Cerrar Editor' : 'Editar Mural'}
                    </button>
                    <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-[#111111] tracking-tight uppercase font-sans title-loop-pulse">
                      EXPERIENCIA <span className="text-[#d9c08f]">DIENTES SANOS</span>
                    </h2>
                    <p className="text-[#64748b] text-[13px] sm:text-[14px] max-w-xl mx-auto leading-relaxed font-medium">
                      Cuidamos tu sonrisa en un entorno diseñado para que te sientas cómodo. Explora nuestro espacio y los momentos que hacen de cada visita una experiencia distinta.
                    </p>
                  </div>

                  {/* Bento Grid Editor UI (Conditional) */}
                  {bentoEditMode && (
                    <div className="flex justify-between items-center mb-4 bg-white p-4 rounded-xl border border-[#111111]/50 backdrop-blur-sm">
                      <div>
                        <p className="text-[#111111] text-[11px] font-bold tracking-[0.2em] uppercase">Modo Edición Activo</p>
                        <p className="text-[#64748b] text-[10px] mt-1">Pasa el cursor sobre cada imagen para ajustar. Al terminar, haz clic en copiar.</p>
                      </div>
                      <button 
                        onClick={() => {
                          const conf = bentoGridItems.map(({id, colSpan, rowSpan, posX, posY}) => ({id, colSpan, rowSpan, posX, posY}));
                          navigator.clipboard.writeText(JSON.stringify(conf, null, 2));
                          alert('¡Configuración copiada al portapapeles! Pégala en el chat.');
                        }}
                        className="bg-[#111111] text-white px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-white hover:text-black transition-colors"
                      >
                        Copiar Config.
                      </button>
                    </div>
                  )}

                  {/* Overlays Cinemáticos (Lightbox y Cursor) movidos a un Portal para evitar problemas de transform/perspective del parent */}
                  {createPortal(
                    <>
                      {/* Lightbox Cinemático */}
                      <AnimatePresence>
                        {selectedMuralItem && (
                          <motion.div
                            initial={{ opacity: 0, backdropFilter: 'blur(0px)' }}
                            animate={{ opacity: 1, backdropFilter: 'blur(10px)' }}
                            exit={{ opacity: 0, backdropFilter: 'blur(0px)' }}
                            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-4 sm:p-10"
                            onClick={() => setSelectedMuralItem(null)}
                          >
                            <button 
                              onClick={(e) => { e.stopPropagation(); setSelectedMuralItem(null); }}
                              className="absolute top-6 right-6 md:top-10 md:right-10 bg-white/10 hover:bg-white/20 text-white p-3 rounded-full md:backdrop-blur-md backdrop-blur-sm transition-colors"
                            >
                              <X size={24} />
                            </button>
                            
                            <motion.div
                              initial={{ scale: 0.9, opacity: 0, y: 20 }}
                              animate={{ scale: 1, opacity: 1, y: 0 }}
                              exit={{ scale: 0.9, opacity: 0, y: 20 }}
                              transition={{ type: "spring", damping: 25, stiffness: 300 }}
                              className="relative max-w-5xl w-full max-h-[90vh] rounded-2xl overflow-hidden border border-white/10 shadow-2xl shadow-black"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <div 
                                className="w-full h-full min-h-[40vh] max-h-[90vh]" 
                                style={{ background: 'linear-gradient(135deg,#f7f4ee 0%,#efe6d5 50%,#e8d4b0 100%)' }} 
                              />
                              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-6 pointer-events-none">
                                <span className="text-[10px] font-bold text-[#111111] tracking-[0.3em] uppercase block mb-2">{selectedMuralItem.tag}</span>
                                <h3 className="text-2xl font-black text-white uppercase tracking-wider">{selectedMuralItem.title}</h3>
                              </div>
                            </motion.div>
                          </motion.div>
                        )}
                      </AnimatePresence>

                      {/* Custom Cursor Overlay */}
                      <AnimatePresence>
                        {isHoveringMural && !selectedMuralItem && !bentoEditMode && (
                          <motion.div
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.8 }}
                            transition={{ type: "spring", damping: 25, stiffness: 300 }}
                            className="fixed z-50 pointer-events-none w-[72px] h-[72px] rounded-full flex items-center justify-center border border-[#d9c08f]/30 bg-white md:backdrop-blur-md backdrop-blur-sm shadow-[0_10px_30px_rgba(0,0,0,0.06)]"
                            style={{
                              left: cursorPos.x,
                              top: cursorPos.y,
                              x: "-50%",
                              y: "-50%"
                            }}
                          >
                            <span className="text-[9px] font-semibold tracking-[0.2em] text-[#0f172a] uppercase drop-shadow-[0_4px_16px_rgba(0,0,0,0.05)] opacity-90">Ver</span>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </>,
                    document.body
                  )}

                  {/* Bento Grid — Videos vertical 9:16, photos proportional */}
                  <motion.div 
                    ref={muralGridRef}
                    className={`grid grid-cols-12 gap-3 auto-rows-[80px] ${!bentoEditMode ? 'cursor-none' : ''}`}
                    onMouseEnter={() => setIsHoveringMural(true)}
                    onMouseLeave={() => setIsHoveringMural(false)}
                    onMouseMove={(e) => setCursorPos({ x: e.clientX, y: e.clientY })}
                    style={{
                      opacity: muralOpacity,
                      scale: muralScale
                    }}
                  >
                    {bentoGridItems.map((item, idx) => (
                      <motion.div 
                        key={item.id} 
                        initial={{ opacity: 0, scale: 0.8 }}
                        whileInView={{ opacity: 1, scale: 1 }}
                        viewport={{ once: true, margin: "-50px" }}
                        transition={{ duration: 0.7, delay: idx * 0.03, ease: [0.21, 0.47, 0.32, 0.98] }}
                        onClick={() => !bentoEditMode && setSelectedMuralItem(item)}
                        className={`rounded-2xl overflow-hidden relative group border ${bentoEditMode ? 'border-[#111111] border-dashed ring-1 ring-[#111111]/30' : 'border-[#d9c08f]/15'} hover:border-[#111111]/30 transition-colors duration-500`}
                        style={{
                          gridColumn: `span ${item.colSpan} / span ${item.colSpan}`,
                          gridRow: `span ${item.rowSpan} / span ${item.rowSpan}`
                        }}
                      >
                        {item.type === 'video' ? (
                          <div
                            className="w-full h-full brightness-[0.7] group-hover:brightness-[0.9] transition-all duration-700"
                            style={{ background: 'linear-gradient(135deg,#f7f4ee 0%,#efe6d5 50%,#e8d4b0 100%)' }}
                          />
                        ) : (
                          <motion.div
                            style={{
                              background: 'linear-gradient(135deg,#f7f4ee 0%,#efe6d5 50%,#e8d4b0 100%)',
                              y: idx % 2 === 0 ? yParallaxEven : yParallaxOdd,
                              scale: 1.15
                            }}
                            whileHover={{ scale: 1.2 }}
                            transition={{ duration: 0.8, ease: "easeOut" }}
                            className="w-full h-full brightness-[0.7] group-hover:brightness-[0.9] transition-all duration-700"
                          />
                        )}
                        {/* Gradient & Text - Hidden by default, reveal on hover */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                        <div className="absolute bottom-4 left-4 z-10 pointer-events-none opacity-0 group-hover:opacity-100 transform translate-y-4 group-hover:translate-y-0 transition-all duration-500">
                          <span className="text-[9px] font-bold text-[#111111] tracking-[0.3em] uppercase block mb-1">{item.tag}</span>
                          <h4 className="text-base font-bold text-white uppercase tracking-wider transition-colors duration-300">{item.title}</h4>
                        </div>

                        {/* EDIT OVERLAY */}
                        {bentoEditMode && (
                          <div className="absolute inset-0 bg-black/90 flex flex-col items-center justify-center p-3 opacity-0 hover:opacity-100 transition-opacity z-20">
                            <div className="flex items-center gap-2 mb-3">
                              <div className="text-white/70 text-[9px] font-mono uppercase tracking-widest whitespace-nowrap">ID: {item.id}</div>
                              
                              <select 
                                className="bg-white/10 text-white text-[9px] font-mono uppercase rounded px-2 py-1 outline-none border border-white/20 hover:bg-white/20 cursor-pointer max-w-[120px]"
                                value=""
                                onChange={(e) => {
                                  const targetId = parseInt(e.target.value);
                                  if (!targetId) return;
                                  
                                  setBentoGridItems(prev => {
                                    const next = [...prev];
                                    const currentIdx = next.findIndex(p => p.id === item.id);
                                    const targetIdx = next.findIndex(p => p.id === targetId);
                                    
                                    if (currentIdx !== -1 && targetIdx !== -1) {
                                      // Intercambiar posiciones
                                      [next[currentIdx], next[targetIdx]] = [next[targetIdx], next[currentIdx]];
                                    }
                                    return next;
                                  });
                                }}
                                onClick={(e) => e.stopPropagation()}
                              >
                                <option value="" disabled className="bg-black text-white/70">Cambiar por...</option>
                                {bentoGridItems.map(otherItem => {
                                  if (otherItem.id === item.id) return null;
                                  return (
                                    <option key={otherItem.id} value={otherItem.id} className="bg-black text-white">
                                      ID {otherItem.id}
                                    </option>
                                  );
                                })}
                              </select>
                            </div>
                            
                            {/* Size Controls */}
                            <div className="flex gap-4 mb-4">
                              <div className="flex flex-col items-center gap-1.5">
                                <span className="text-[9px] text-[#111111] font-bold uppercase tracking-wider">Ancho (Col)</span>
                                <div className="flex bg-white/10 rounded-full overflow-hidden items-center">
                                  <button onClick={() => setBentoGridItems(prev => prev.map(p => p.id === item.id ? {...p, colSpan: Math.max(1, p.colSpan - 1)} : p))} className="px-3 py-1 hover:bg-white/20 text-white font-bold transition-colors">-</button>
                                  <span className="px-2 text-[11px] font-mono text-white min-w-[20px] text-center">{item.colSpan}</span>
                                  <button onClick={() => setBentoGridItems(prev => prev.map(p => p.id === item.id ? {...p, colSpan: Math.min(12, p.colSpan + 1)} : p))} className="px-3 py-1 hover:bg-white/20 text-white font-bold transition-colors">+</button>
                                </div>
                              </div>
                              <div className="flex flex-col items-center gap-1.5">
                                <span className="text-[9px] text-[#111111] font-bold uppercase tracking-wider">Alto (Row)</span>
                                <div className="flex bg-white/10 rounded-full overflow-hidden items-center">
                                  <button onClick={() => setBentoGridItems(prev => prev.map(p => p.id === item.id ? {...p, rowSpan: Math.max(1, p.rowSpan - 1)} : p))} className="px-3 py-1 hover:bg-white/20 text-white font-bold transition-colors">-</button>
                                  <span className="px-2 text-[11px] font-mono text-white min-w-[20px] text-center">{item.rowSpan}</span>
                                  <button onClick={() => setBentoGridItems(prev => prev.map(p => p.id === item.id ? {...p, rowSpan: Math.min(12, p.rowSpan + 1)} : p))} className="px-3 py-1 hover:bg-white/20 text-white font-bold transition-colors">+</button>
                                </div>
                              </div>
                            </div>

                            {/* Position Controls */}
                            <div className="w-full px-4 flex flex-col gap-3">
                              <div className="flex items-center gap-3">
                                <span className="text-[9px] text-white/70 font-bold uppercase w-8 text-right">Eje X</span>
                                <input type="range" min="0" max="100" value={item.posX} onChange={(e) => setBentoGridItems(prev => prev.map(p => p.id === item.id ? {...p, posX: parseInt(e.target.value)} : p))} className="w-full h-1 bg-white/20 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3.5 [&::-webkit-slider-thumb]:h-3.5 [&::-webkit-slider-thumb]:bg-[#111111] [&::-webkit-slider-thumb]:rounded-full hover:[&::-webkit-slider-thumb]:scale-125 transition-all" />
                                <span className="text-[9px] text-[#111111] font-mono w-6">{item.posX}%</span>
                              </div>
                              <div className="flex items-center gap-3">
                                <span className="text-[9px] text-white/70 font-bold uppercase w-8 text-right">Eje Y</span>
                                <input type="range" min="0" max="100" value={item.posY} onChange={(e) => setBentoGridItems(prev => prev.map(p => p.id === item.id ? {...p, posY: parseInt(e.target.value)} : p))} className="w-full h-1 bg-white/20 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3.5 [&::-webkit-slider-thumb]:h-3.5 [&::-webkit-slider-thumb]:bg-[#111111] [&::-webkit-slider-thumb]:rounded-full hover:[&::-webkit-slider-thumb]:scale-125 transition-all" />
                                <span className="text-[9px] text-[#111111] font-mono w-6">{item.posY}%</span>
                              </div>
                            </div>
                          </div>
                        )}
                      </motion.div>
                    ))}
                  </motion.div>
                </div>
              </div>
            </div>
            {/* SECTION: GOOGLE REVIEWS */}
            <FadeInUp className="w-full flex flex-col pt-10 pb-6 relative z-10 scroll-mt-24" id="resenas">
              {/* Cinematic background glow */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[150%] bg-gradient-to-r from-transparent via-[#111111]/10 to-transparent blur-[80px] rounded-full pointer-events-none -z-10" />
              
              <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-10 px-0">
                <div className="flex flex-col text-left">
                  <span className="text-[10px] font-bold uppercase tracking-[0.25em] text-[#111111] block mb-2">LO QUE DICEN DE NOSOTROS</span>
                  <h2 className="text-3xl lg:text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-white to-white/50 tracking-tight uppercase font-sans title-loop-pulse">
                    NUESTROS <span className="text-[#111111] drop-shadow-[0_0_15px_rgba(17, 17, 17,0.3)]">CLIENTES</span>
                  </h2>
                </div>
                {googleReviews.length > 0 && (
                <div className="flex items-center gap-3 mt-4 md:mt-0 bg-white border border-[#d9c08f]/15 shadow-[0_10px_30px_rgba(0,0,0,0.06)] rounded-full px-5 py-2.5 backdrop-blur-xl">
                  <div className="flex text-[#FABB05]">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <svg key={star} className="w-4 h-4 fill-current drop-shadow-[0_0_8px_rgba(250,187,5,0.4)]" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/></svg>
                    ))}
                  </div>
                  <span className="text-xs font-bold text-[#0f172a] uppercase tracking-wider">{googleReviews.length} Reseñas en Google</span>
                </div>
                )}
              </div>

              {/* Cinematic Wrapper */}
              <div 
                className="relative w-full"
                style={{
                  WebkitMaskImage: 'linear-gradient(to right, transparent, black 10%, black 90%, transparent)',
                  maskImage: 'linear-gradient(to right, transparent, black 10%, black 90%, transparent)'
                }}
              >
                {/* Carousel Container */}
                <div ref={reviewsCarouselRef} className="w-full overflow-x-auto flex gap-6 pb-12 pt-4 px-4 snap-x snap-mandatory hide-scrollbar" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                <style dangerouslySetInnerHTML={{__html: `
                  .hide-scrollbar::-webkit-scrollbar { display: none; }
                `}} />
                {/* REVIEWS DE GOOGLE — desde la tabla `google_reviews`, lista para las reseñas reales */}
                {/* TODO(reseñas): conectar la API de Google Places o insertar filas en google_reviews */}
                {googleReviews.length === 0 && (
                  <div className="min-w-full flex flex-col items-center justify-center gap-4 py-12 text-center">
                    <svg viewBox="0 0 48 48" className="w-9 h-9"><path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24c0,11.045,8.955,20,20,20c11.045,0,20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"/><path fill="#FF3D00" d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z"/><path fill="#4CAF50" d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.202,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z"/><path fill="#1976D2" d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571c0.001-0.001,0.002-0.001,0.003-0.002l6.19,5.238C36.971,39.205,44,34,44,24C44,22.659,43.862,21.35,43.611,20.083z"/></svg>
                    <p className="text-[#334155] text-[15px] font-medium max-w-md">Aquí aparecerán las reseñas reales de <strong>Centro Odontológico Dientes Sanos</strong> en Google.</p>
                    <p className="text-[#94a3b8] text-[12px] max-w-sm">Próximamente: sincronización con tu perfil de Google.</p>
                  </div>
                )}
                {googleReviews.map((review, idx) => (
                  <div key={idx} data-review-card className="relative overflow-hidden min-w-[300px] md:min-w-[350px] bg-white backdrop-blur-2xl border border-[#d9c08f]/15 shadow-[0_6px_24px_rgba(0,0,0,0.06)] p-7 rounded-[2rem] snap-center flex flex-col gap-5 md:hover:border-[#111111]/30 md:hover:bg-[#111]/80 md:hover:-translate-y-1.5 transition-all duration-500 group/card">
                    <div className="absolute inset-0 bg-gradient-to-br from-[#111111]/0 via-transparent to-[#111111]/0 md:group-hover/card:from-[#111111]/10 transition-all duration-500" />
                    <div className="relative z-10 flex flex-col gap-4 h-full">
                      <div className="flex justify-between items-start">
                        <div className="flex gap-4 items-center">
                          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#111111] to-[#8C7654] shadow-[0_0_15px_rgba(17, 17, 17,0.25)] flex items-center justify-center text-white font-extrabold text-xl">
                            {(review.author_name || 'R').charAt(0)}
                          </div>
                          <div className="flex flex-col">
                            <span className="text-[#0f172a] font-bold text-[15px]">{review.author_name}</span>
                            <span className="text-[#94a3b8] text-[10px] font-medium uppercase tracking-widest mt-0.5">{review.review_time || ''}</span>
                          </div>
                        </div>
                        <svg viewBox="0 0 48 48" className="w-6 h-6"><path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24c0,11.045,8.955,20,20,20c11.045,0,20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"/><path fill="#FF3D00" d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z"/><path fill="#4CAF50" d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.202,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z"/><path fill="#1976D2" d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571c0.001-0.001,0.002-0.001,0.003-0.002l6.19,5.238C36.971,39.205,44,34,44,24C44,22.659,43.862,21.35,43.611,20.083z"/></svg>
                      </div>
                      <div className="flex text-[#FABB05] gap-0.5">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <svg key={star} className={`w-4 h-4 ${star <= (review.rating || 5) ? 'fill-current drop-shadow-[0_0_5px_rgba(250,187,5,0.5)]' : 'fill-[#e9eae8]'}`} viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/></svg>
                        ))}
                      </div>
                      <p className="text-[#334155] text-[14px] leading-relaxed flex-1 font-light tracking-wide">
                        "{review.review_text}"
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </FadeInUp>

            {/* SECTION: ¿POR QUÉ ELEGIR DIENTES SANOS? & UBICACIÓN */}
            <FadeInUp className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-stretch" id="ubicacion">
              
              {/* Left Column: Why Choose Us (Redesigned as premium cards) */}
              <div className="lg:col-span-6 flex flex-col justify-center text-left">
                <span className="text-[10px] font-bold uppercase tracking-[0.25em] text-[#111111] block mb-2">¿POR QUÉ ELEGIR</span>
                <h2 className="text-3xl lg:text-4xl font-extrabold text-[#111111] tracking-tight uppercase font-sans mb-8 title-loop-pulse">
                  <span className="text-[#d9c08f]">DIENTES SANOS?</span>
                </h2>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {[
                    { icon: <User size={18} />, title: 'Profesionales', desc: 'Especialistas experimentados en salud y estética dental.' },
                    { icon: <Award size={18} />, title: 'Calidad Premium', desc: 'Usamos insumos y equipos de alta gama para el cuidado dental.' },
                    { icon: <CalendarIcon size={18} />, title: 'Reserva Fácil', desc: 'Agenda tu cita en segundos las 24 horas del día.' },
                    { icon: <Coffee size={18} />, title: 'Ambiente Único', desc: 'Un espacio cómodo con café de cortesía y sala de espera.' },
                  ].map((item, idx) => (
                    <div key={idx} className="p-5 rounded-2xl bg-white border border-[#d9c08f]/15 hover:border-[#111111]/20 hover:bg-[#f7f7f5] transition-all duration-300 flex flex-col gap-3 group">
                      <div className="w-9 h-9 rounded-lg bg-[#111111]/10 border border-[#111111]/25 flex items-center justify-center text-[#111111] transition-colors group-hover:bg-[#111111] group-hover:text-white">
                        {item.icon}
                      </div>
                      <div>
                        <h4 className="text-sm font-extrabold text-[#0f172a] mb-1 uppercase tracking-wider">{item.title}</h4>
                        <p className="text-[#475569] text-[12px] lg:text-[13px] leading-relaxed">{item.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Right Column: Locations (Redesigned address cards) */}
              <div className="lg:col-span-6 flex flex-col justify-center text-left">
                <span className="text-[10px] font-bold uppercase tracking-[0.25em] text-[#111111] block mb-2">NUESTRA SEDE</span>
                <h2 className="text-3xl lg:text-4xl font-extrabold text-[#111111] tracking-tight uppercase font-sans mb-8 title-loop-pulse">
                  NUESTRA <span className="text-[#d9c08f]">UBICACIÓN</span>
                </h2>

                <div className="bg-white border border-[#d9c08f]/15 rounded-3xl p-6 lg:p-8 flex flex-col justify-between h-full min-h-[350px] relative overflow-hidden group hover:border-[#111111]/20 transition-all duration-300">
                  {/* Subtle geometric overlay glow */}
                  <div className="absolute right-0 top-0 w-48 h-48 pointer-events-none" style={{
                    backgroundImage: 'radial-gradient(circle at 100% 0%, rgba(17, 17, 17,0.08) 0%, transparent 70%)'
                  }} />

                  <div className="space-y-6">
                    {/* Header Sede */}
                    <div className="flex items-center justify-between border-b border-[#d9c08f]/15 pb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-[#111111]/10 border border-[#111111]/20 flex items-center justify-center text-[#111111]">
                          <MapPin size={18} />
                        </div>
                        <div>
                          <h4 className="text-sm font-extrabold text-[#0f172a] uppercase tracking-wider">SEDE ÚNICA</h4>
                          <span className="text-[10px] text-[#111111] font-bold uppercase tracking-wider">Maracay, Venezuela</span>
                        </div>
                      </div>
                      <span className={`bg-[#f7f7f5] border px-2.5 py-1 rounded text-[10px] font-bold uppercase ${storeStatus.isOpen ? 'border-emerald-500/20 text-emerald-600' : 'border-red-500/20 text-red-400'}`}>
                        {storeStatus.isOpen ? 'ABIERTO' : 'CERRADO'}
                      </span>
                    </div>

                    {/* Address details */}
                    <div className="space-y-4">
                      <div className="flex items-start gap-3">
                        <MapPin size={16} className="text-[#111111] shrink-0 mt-0.5" />
                        <p className="text-[#334155] text-[13px] sm:text-[14px] leading-relaxed">
                          {/* TODO(contacto): pendiente dirección física del cliente */}
                          Por confirmar
                        </p>
                      </div>

                      <div className="grid grid-cols-1 pt-2">
                        <div className="flex items-start gap-3">
                          <Clock size={16} className={`shrink-0 mt-0.5 ${storeStatus.isOpen ? 'text-[#111111]' : 'text-[#cbd5e1]'}`} />
                          <div className="text-left">
                            <p className={`text-[13px] font-extrabold leading-tight ${storeStatus.isOpen ? 'text-[#334155]' : 'text-[#94a3b8]'}`}>
                              {storeStatus.isOpen ? 'Abierto ahora' : 'Cerrado temporalmente'}
                            </p>
                            <p className={`text-[11px] lg:text-[12px] mt-0.5 ${storeStatus.isOpen ? 'text-[#475569]' : 'text-[#94a3b8]'}`}>
                              {storeStatus.isOpen ? 'Reservas disponibles las 24 horas' : 'No se puede agendar por ahora'}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Actions area */}
                  <div className="relative z-10 border-t border-[#d9c08f]/15 pt-6 mt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        <Phone size={14} className="text-[#111111]" />
                        <a
                          href="#"
                          onClick={e => { e.preventDefault(); e.stopPropagation(); }}
                          className="text-[#334155] text-sm font-extrabold hover:text-[#111111] transition-colors"
                        >
                          {/* TODO(contacto): pendiente teléfono del cliente */}
                          Por confirmar
                        </a>
                      </div>
                      <a
                        href="#"
                        onClick={e => { e.preventDefault(); e.stopPropagation(); }}
                        className="flex items-center gap-1.5 text-[#475569] hover:text-[#111111] transition-colors cursor-pointer"
                        aria-label="Instagram"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
                          <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
                          <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
                        </svg>
                        {/* TODO(contacto): pendiente Instagram del cliente */}
                        <span className="text-[11px] font-bold">Por confirmar</span>
                      </a>
                    </div>

                    <button
                      onClick={e => { e.stopPropagation(); }}
                      className="btn-gold py-2.5 px-6 rounded-xl text-[11px] uppercase tracking-wider font-extrabold flex items-center gap-1.5 cursor-pointer"
                      style={{ borderRadius: '10px' }}
                    >
                      {/* TODO(contacto): pendiente enlace de Google Maps del cliente */}
                      <Compass size={13} /> VER EN GOOGLE MAPS
                    </button>
                  </div>
                </div>
              </div>
              </FadeInUp>

            {/* SECTION: INSTAGRAM FEED & CTA */}
            <FadeInUp className="w-full text-center space-y-8 pt-8 reveal-item">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-[0.25em] text-[#111111] block mb-2">SÍGUENOS EN REDES</span>
                <h2 className="text-3xl lg:text-4xl font-extrabold text-[#111111] tracking-tight uppercase font-sans mb-3 title-loop-pulse">INSTAGRAM <span className="text-[#d9c08f]">FEED</span></h2>
                <a 
                  href="#" 
                  onClick={e => e.preventDefault()}
                  className="text-[#64748b] hover:text-[#111111] text-sm font-bold transition-colors inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
                    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
                    <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
                  </svg>
                  {/* TODO(contacto): pendiente Instagram del cliente */}
                  Por confirmar
                </a>
              </div>

              {/* Grid of 4 Videos */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-[1200px] mx-auto">
                {[
                  { video: null, url: null, likes: '284', comments: '24' },
                  { video: null, url: null, likes: '342', comments: '31' },
                  { video: null, url: null, likes: '198', comments: '16' },
                  { video: null, url: null, likes: '412', comments: '39' }
                ].map((post, idx) => (
                  <InstagramReelCard
                    key={idx}
                    post={post}
                    idx={idx}
                    onDoubleClick={(e) => {
                      e.preventDefault();
                      if (!post.url) return;
                      window.open(post.url, '_blank', 'noopener,noreferrer');
                    }}
                  />
                ))}
              </div>

              {/* Follow Button */}
              <div className="pt-8">
                <a
                  href="#"
                  onClick={e => e.preventDefault()}
                  className="btn-gold py-3.5 px-8 rounded-xl text-[11px] uppercase tracking-wider font-extrabold flex items-center gap-2 inline-flex cursor-pointer"
                  style={{ borderRadius: '10px' }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
                    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
                    <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
                  </svg>
                  SEGUIR EN INSTAGRAM
                </a>
            </div>
            </FadeInUp>
          </div>

        {/* PARALLAX REVEAL FOOTER */}
        <div className="w-full bg-transparent relative z-10" ref={footerRef}>
          <motion.footer 
            className="w-full bg-transparent relative text-center pt-16 md:pt-24 pb-16 px-6 md:px-16 flex flex-col justify-between overflow-hidden min-h-[380px] md:min-h-[450px]" 
          >
              <div className="max-w-[1240px] mx-auto w-full hidden md:flex flex-row justify-between items-center gap-8 mb-10">
                {/* Left links */}
                <div className="flex flex-wrap justify-start gap-5 text-[10px] font-black tracking-[0.25em] text-[#94a3b8] uppercase">
                  <a href="#" onClick={(e) => e.preventDefault()} className="hover:text-[#111111] transition-colors no-underline">{/* TODO(contacto): pendiente Instagram del cliente */}Por confirmar</a>
                  <span className="text-[#cbd5e1] select-none">•</span>
                  <a href="#" onClick={(e) => e.preventDefault()} className="hover:text-[#111111] transition-colors no-underline">{/* TODO(contacto): pendiente WhatsApp del cliente */}WhatsApp</a>
                </div>

                {/* Logo Center */}
                <div className="w-12 h-12 flex items-center justify-center">
                  <div className="w-full h-full rounded-full flex items-center justify-center" style={{ background: 'linear-gradient(135deg,#f7f4ee 0%,#efe6d5 50%,#e8d4b0 100%)' }}>
                    <span className="text-[10px] font-black text-[#111111] tracking-[0.15em]">DS</span>
                  </div>
                </div>

                {/* Right links */}
                <div className="flex flex-wrap justify-end gap-5 text-[10px] font-black tracking-[0.25em] text-[#94a3b8] uppercase">
                  <span className="cursor-pointer hover:text-[#111111] transition-colors" onClick={() => document.getElementById('servicios')?.scrollIntoView({ behavior: 'smooth' })}>Servicios</span>
                  <span className="text-[#cbd5e1] select-none">•</span>
                  <span className="cursor-pointer hover:text-[#111111] transition-colors" onClick={() => document.getElementById('ubicacion')?.scrollIntoView({ behavior: 'smooth' })}>Ubicación</span>
                </div>
              </div>

              {/* Mobile Footer — Cosmos-style centered stacked layout */}
              <div className="flex md:hidden flex-col items-center gap-8 mb-16">
                {/* Logo */}
                <div className="w-14 h-14 flex items-center justify-center">
                  <div className="w-full h-full rounded-full flex items-center justify-center" style={{ background: 'linear-gradient(135deg,#f7f4ee 0%,#efe6d5 50%,#e8d4b0 100%)' }}>
                    <span className="text-[11px] font-black text-[#111111] tracking-[0.15em]">DS</span>
                  </div>
                </div>

                {/* Connect Section */}
                <div className="flex flex-col items-center gap-2.5">
                  <span className="text-[11px] font-black text-[#475569] uppercase tracking-[0.2em]">Conecta</span>
                  <a href="#" onClick={(e) => e.preventDefault()} className="text-[12px] text-[#94a3b8] hover:text-[#111111] transition-colors no-underline">{/* TODO(contacto): pendiente Instagram del cliente */}Por confirmar</a>
                  <a href="#" onClick={(e) => e.preventDefault()} className="text-[12px] text-[#94a3b8] hover:text-[#111111] transition-colors no-underline">{/* TODO(contacto): pendiente WhatsApp del cliente */}WhatsApp</a>
                </div>

                {/* More Section */}
                <div className="flex flex-col items-center gap-2.5">
                  <span className="text-[11px] font-black text-[#475569] uppercase tracking-[0.2em]">Más</span>
                  <span className="text-[12px] text-[#94a3b8] cursor-pointer hover:text-[#111111] transition-colors" onClick={() => document.getElementById('servicios')?.scrollIntoView({ behavior: 'smooth' })}>Servicios</span>
                  <span className="text-[12px] text-[#94a3b8] cursor-pointer hover:text-[#111111] transition-colors" onClick={() => document.getElementById('ubicacion')?.scrollIntoView({ behavior: 'smooth' })}>Ubicación</span>
                </div>
              </div>

              {/* Giant Background Outline Brand Text (Stretches across footer and cuts off) */}
              <div className="absolute bottom-0 left-0 w-full translate-y-[12%] pointer-events-none flex justify-center">
                <motion.h2 
                  initial={{ opacity: 0, scale: 0.85, y: 50, filter: 'blur(10px)' }}
                  whileInView={{ opacity: 1, scale: 1, y: 0, filter: 'blur(0px)' }}
                  transition={{ duration: 1.2, ease: "easeOut" }}
                  viewport={{ once: true, margin: "400px" }}
                  className="text-[23vw] md:text-[22vw] font-black text-center tracking-tighter leading-[0.8] select-none uppercase font-sans pointer-events-auto flex justify-center items-center flex-nowrap whitespace-nowrap"
                >
                  {['D', 'I', 'E', 'N', 'T', 'E', 'S'].map((letter, i) => (
                    <motion.span 
                      key={i}
                      initial={{ opacity: 0, y: 20 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.8, delay: i * 0.1, ease: "easeOut" }}
                      viewport={{ once: true, margin: "400px" }}
                      className="inline-block px-1 md:px-3 text-[#d9c08f]/10 cursor-default"
                    >
                      {letter}
                    </motion.span>
                  ))}
                </motion.h2>
              </div>


            </motion.footer>
          </div>
        </div>
      );
      }
    
    return (
      <div className={`slice-screen ${sliceClass}`}>
        {/* Background photo inside slice */}
        <div 
          className={`absolute top-0 left-0 w-full pointer-events-none z-0 animate-bg-zoom ${isTransitioning ? 'welcome-exit-bg' : ''}`}
          style={{
            height: '100%',
            background: 'linear-gradient(135deg,#f7f4ee 0%,#efe6d5 50%,#e8d4b0 100%)',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',
            filter: 'brightness(0.95) blur(10px)',
          }}
        />
        {heroContent}
      </div>
    );
  };

  // Base layout wrapper
  return (
    <div 
      className={`${isEmbedded ? 'w-full h-auto bg-transparent' : 'w-screen overflow-hidden bg-[#f4f5f3]'} flex items-center justify-center`}
      style={{
        height: isEmbedded ? 'auto' : '100dvh',
        minHeight: 'auto'
      }}
    >
      {!showWelcome && (
        <style>{`
          .whatsapp-float-btn {
            display: none !important;
          }
        `}</style>
      )}
      <div 
        ref={scrollContainerRef}
        onScroll={(e) => {
          if (isEmbedded) return;
          const scrollTop = e.currentTarget.scrollTop;
          setIsScrolled(scrollTop > 80);
          setShowBackToTop(scrollTop > 600);
        }}
        className={`relative w-full ${isEmbedded ? 'h-auto overflow-visible' : 'h-full overflow-x-hidden overflow-y-auto'} flex flex-col justify-between items-center bg-center`}
        style={{
          height: isEmbedded ? 'auto' : '100dvh',
          WebkitOverflowScrolling: 'touch',
          overscrollBehaviorY: isEmbedded ? 'auto' : 'contain',
          backgroundColor: isEmbedded ? 'transparent' : '#f4f5f3',
          backgroundImage: isEmbedded ? 'none' : `radial-gradient(rgba(0, 0, 0, 0.035) 1px, transparent 1px), 
                            radial-gradient(circle at 50% 0%, rgba(17, 17, 17, 0.12) 0%, transparent 65%), 
                            radial-gradient(circle at 0% 100%, rgba(139, 92, 26, 0.05) 0%, transparent 45%), 
                            radial-gradient(circle at 100% 100%, rgba(17, 17, 17, 0.03) 0%, transparent 45%), 
                            linear-gradient(to bottom, #f4f5f3 0%, #e9eae8 50%, #e9eae8 100%)`,
          backgroundSize: '32px 32px, 100% 100%, 100% 100%, 100% 100%, 100% 100%',
          scrollbarWidth: 'none'
        }}
      >
        {/* Ambient auroras for premium glowing background */}
        <div className={`aurora-container ${isTransitioning ? 'welcome-exit-aurora' : ''} ${isReturning ? 'welcome-return-aurora' : ''}`}>
          <div className="ambient-aurora-gold"></div>
          <div className="ambient-aurora-bronze"></div>
        </div>

        {/* ── WELCOME SCREEN ── */}
        {/* Render welcome screen while showWelcome is true, adding fade-out class during transitions */}
        {showWelcome && (
          <>
            <div className={`w-full h-full welcome-return-fade ${isTransitioning ? 'welcome-screen-exit-fade pointer-events-none' : ''}`}>
              {renderWelcomeContent("", hasVisited)}
            </div>
            {selectedService && !isTransitioning && (
              <button 
                onClick={() => setShowWelcome(false)}
                className="fixed bottom-6 right-6 z-[100] bg-[#111111] text-white font-extrabold px-6 py-3.5 rounded-full shadow-[0_10px_30px_rgba(0,0,0,0.06)] hover:scale-105 transition-all flex items-center gap-2 cursor-pointer text-xs tracking-widest uppercase border border-black/10 animate-pulse"
                style={{ boxShadow: '0 10px 25px -5px rgba(17, 17, 17,0.4), 0 8px 10px -6px rgba(17, 17, 17,0.4)' }}
              >
                <span>Volver a la reserva</span> <span className="text-[14px]">→</span>
              </button>
            )}
            <AnimatePresence>
              {showBackToTop && !isTransitioning && (
                <motion.button
                  initial={{ opacity: 0, scale: 0.6, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.6, y: 20 }}
                  transition={{ type: 'spring', damping: 18, stiffness: 260 }}
                  whileHover={{ scale: 1.08 }}
                  whileTap={{ scale: 0.92 }}
                  onClick={scrollLandingToTop}
                  // Sits above the "Volver a la reserva" pill when that one is on screen.
                  className={`back-to-top-btn fixed right-6 z-[100] ${selectedService && !isTransitioning ? 'bottom-24' : 'bottom-6'}`}
                  aria-label="Volver al inicio"
                  title="Volver al inicio"
                >
                  {/* Reading-progress ring */}
                  <svg className="back-to-top-ring" viewBox="0 0 48 48" aria-hidden="true">
                    <circle cx="24" cy="24" r="22" className="back-to-top-ring-track" />
                    <circle
                      ref={progressRingRef}
                      cx="24" cy="24" r="22"
                      className="back-to-top-ring-fill"
                      style={{ strokeDashoffset: 138.2 }}
                    />
                  </svg>
                  <ArrowUp size={18} strokeWidth={2.5} className="back-to-top-arrow" />
                </motion.button>
              )}
            </AnimatePresence>
          </>
        )}

        {/* On click: two slices with @keyframe exit animation (starts from full-screen, splits apart) */}
        {isTransitioning && (
          <div className="slice-container welcome-exit absolute inset-0 z-50">
            {renderWelcomeContent("slice-top-left")}
            {renderWelcomeContent("slice-bottom-right")}
            <svg className="absolute inset-0 w-full h-full pointer-events-none z-[40]">
              <line x1="100%" y1="0%" x2="0%" y2="100%" className="scissors-cut-line" />
            </svg>
            <div className="scissors-cutter-icon">
              <div className="scissors-blades origin-[28px_28px]">
                <Sparkles size={42} className="text-[#111111] drop-shadow-[0_0_15px_rgba(17, 17, 17,0.8)]" />
              </div>
            </div>
          </div>
        )}

        {/* On return: quiet fade transition overlay */}
        {isReturning && (
          <div className="quiet-fade-overlay" />
        )}

        {/* ── SUCCESS VIEW SCREEN ── */}
        {!showWelcome && success && (() => {
          const isTattoo = (selectedService?.category || '').toLowerCase().includes('tatuaj');
          const barberPhone = selectedBarber?.phone?.replace(/[^0-9]/g, '') || '';
          const dateStr = selectedDate?.toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' }) || '';
          const timeStr = formatTime12(selectedTime) || '';
          
          let whatsappMsg = `Hola! Quiero agendar una cita.\n\n`;
          whatsappMsg += `*Fecha:* ${dateStr}\n*Hora:* ${timeStr}\n*Servicio:* ${selectedService?.name}\n*Cortesía:* ${selectedBeverage}\n`;
          
          if (isTattoo && tattooSize) {
            whatsappMsg += `\n--- *Detalles del caso* ---\n`;
            if (tattooIdea) whatsappMsg += `*Caso:* ${tattooIdea}\n`;
            if (tattooSize) whatsappMsg += `*Intensidad:* ${tattooSize}\n`;
            if (tattooZone) whatsappMsg += `*Zona:* ${tattooZone}\n`;
            if (tattooStyle) whatsappMsg += `*Síntomas:* ${tattooStyle}\n`;
            if (tattooTheme) whatsappMsg += `*Detalles:* ${tattooTheme}\n`;
            if (hasDesign !== null) whatsappMsg += `*Valoración:* ${hasDesign ? 'Ya tengo presupuesto' : 'Necesito valoración'}\n`;
            if (isOfLegalAge !== null) whatsappMsg += `*Mayor de edad:* ${isOfLegalAge ? 'Si' : 'No (menor de edad)'}\n`;
          }
          
          if (notes) {
            whatsappMsg += `\n*Notas:* ${notes}\n`;
          }
          
          whatsappMsg += `\nGracias!`;
          
          const whatsappUrl = barberPhone 
            ? `https://wa.me/${barberPhone}?text=${encodeURIComponent(whatsappMsg)}`
            : null;

          return (
          <div className="w-full flex-1 flex items-center justify-center p-4">
            <div className="glass-card text-center py-10 px-8 max-w-md w-full border border-[var(--border-color)] relative overflow-hidden animate-page-fade-in">
              <div className="absolute -top-24 -left-24 w-48 h-48 rounded-full bg-[rgba(17, 17, 17,0.08)] blur-3xl"></div>
              <div className="absolute -bottom-24 -right-24 w-48 h-48 rounded-full bg-[rgba(17, 17, 17,0.05)] blur-3xl"></div>

              <div className="w-20 h-20 rounded-full bg-emerald-500/15 flex items-center justify-center mx-auto mb-6 border border-emerald-500/30">
                <Check size={40} className="text-emerald-600" />
              </div>
              <h2 className="text-3xl font-extrabold mb-3 text-[#111111] tracking-tight">¡Reserva Hecha!</h2>
              <p className="text-[var(--text-secondary)] mb-8 text-sm leading-relaxed">
                {isTattoo 
                  ? 'Tu reserva ha sido registrada. Ahora envía los detalles a tu especialista por WhatsApp.'
                  : 'Tu reserva ha sido registrada exitosamente. Hemos preparado todo para tu llegada.'}
              </p>

              <div className="bg-white rounded-xl p-5 border border-[#d9c08f]/15 text-left mb-8 space-y-3">
                <div className="flex justify-between items-center border-b border-[#d9c08f]/15 pb-2">
                  <span className="text-xs text-[#94a3b8] uppercase tracking-wider">Servicio</span>
                  <span className="text-sm font-bold text-[#0f172a]">{selectedService?.name}</span>
                </div>
                <div className="flex justify-between items-center border-b border-[#d9c08f]/15 pb-2">
                  <span className="text-xs text-[#94a3b8] uppercase tracking-wider">Especialista</span>
                  <span className="text-sm font-bold text-[var(--champagne)]">{selectedBarber?.name}</span>
                </div>
                <div className="flex justify-between items-center border-b border-[#d9c08f]/15 pb-2">
                  <span className="text-xs text-[#94a3b8] uppercase tracking-wider">Fecha & Hora</span>
                  <span className="text-sm font-bold text-[#0f172a]">
                    {selectedDate?.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })} a las {formatTime12(selectedTime)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-[#94a3b8] uppercase tracking-wider">Cortesía</span>
                  <span className="text-sm font-bold text-emerald-600">{selectedBeverage}</span>
                </div>
              </div>

              {isTattoo ? (
                <div className="space-y-3">
                  {whatsappUrl ? (
                    <a
                      href={whatsappUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center gap-3 w-full py-3.5 rounded-full font-bold uppercase tracking-wider text-sm bg-[#25D366] text-white hover:bg-[#20ba5a] transition-all shadow-[0_6px_20px_rgba(0,0,0,0.06)] cursor-pointer"
                    >
                      <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                      </svg>
                      Enviar por WhatsApp
                    </a>
                  ) : (
                    <div className="text-center py-3 px-4 rounded-xl bg-[#f7f7f5] border border-[#d9c08f]/20">
                      <p className="text-xs text-[#475569]">Tu especialista recibirá los datos de tu cita por nuestro sistema.</p>
                    </div>
                  )}
                  <button
                    onClick={() => navigate('/perfil')}
                    className="w-full py-3 rounded-full font-bold uppercase tracking-wider text-sm border border-[#d9c08f]/20 text-[#64748b] hover:text-[#0f172a] hover:border-[#d9c08f]/40 transition-all cursor-pointer"
                  >
                    Ir a mi Perfil
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => navigate('/perfil')}
                  className="btn-gold w-full py-3.5 rounded-full font-bold uppercase tracking-wider text-sm shadow-[var(--shadow-glow-gold)] cursor-pointer"
                >
                  Ir a mi Perfil
                </button>
              )}
            </div>
          </div>
          );
        })()}

        {/* ── INTERACTIVE WIZARD FLOW SCREEN (STEPS 1-6) ── */}
        {(!showWelcome || isTransitioning) && !success && (
          // Same max-w-7xl the expanded barber profile uses. No breakpoint prefix needed:
          // on phone/tablet viewports (< 1280px) the content is still bounded by w-full and
          // never actually reaches 1280px, so this only widens things on real desktops.
          // Below lg the `lg:grid` never applies, so this stays the original single-column
          // flex layout — phone/tablet markup and behavior are untouched.
          <div 
            className={`w-full mx-auto px-4 ${isEmbedded ? 'pb-4' : 'pb-28 md:pb-16'} relative z-10 ${step === 2 && expandedBarber ? 'max-w-7xl 2xl:max-w-[1600px] px-4 md:px-8 flex flex-col flex-1' : isEmbedded ? 'max-w-6xl flex flex-col flex-1 xl:grid xl:grid-cols-[1fr_380px] xl:gap-12 xl:items-start' : 'max-w-6xl flex flex-col flex-1 lg:grid lg:grid-cols-[1fr_380px] lg:gap-14 lg:items-start'}`}
            style={{ paddingTop: (step === 2 && expandedBarber) ? '0px' : 'calc(max(env(safe-area-inset-top, 0px), 32px))' }}
          >

            {/* Left column on desktop (booking flow). Below lg this is just the page body. */}
            <div className={`flex flex-col flex-1 min-w-0 ${step === 2 && expandedBarber ? 'contents' : ''}`}>
            
            {/* Invisible marker for auto-scrolling to top on step change */}
            <div ref={topRef} className="absolute top-0 left-0 w-full h-px opacity-0 pointer-events-none" />

            {/* Wizard Header: PASO X DE 6 with title/subtitle and back button */}
            {!(step === 2 && expandedBarber) && (
            <div className="mb-4 relative text-center">
              {/* Circular back button on the left — hidden on step 1 when embedded (nothing to go back to) */}
              {(!isEmbedded || step > 1) && (
              <div className="absolute left-0 top-0">
                <button 
                  onClick={() => { step > 1 ? setStep(step - 1) : handleReturnToWelcome(); scrollToTop(); }}
                  className="wizard-back-button"
                  type="button"
                >
                  <ChevronLeft size={18} />
                </button>
              </div>
              )}

              {/* Step indicator */}
              <div className="inline-block mt-2">
                <span className="text-[11px] sm:text-xs font-black tracking-[0.2em] text-[var(--champagne)] uppercase block mb-2.5">
                  PASO {step} DE 5
                </span>
                
                {/* Segmented Progress Bar */}
                <div className="flex gap-1 w-32 justify-center mx-auto mb-4">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div 
                      key={i} 
                      className={`h-0.5 rounded-full transition-all duration-300 ${
                        i === step 
                          ? 'w-6 bg-[var(--champagne)] shadow-[0_0_8px_rgba(17, 17, 17,0.6)]' 
                          : i < step 
                            ? 'w-3 bg-[var(--champagne-dark)] opacity-70' 
                            : 'w-3 bg-[#e9eae8]'
                      }`}
                    />
                  ))}
                </div>
              </div>

              {/* Title & Subtitle */}
              <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={step}
                variants={stepHeaderVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
                className="mt-2 space-y-1"
              >
                <h1 className="text-xl sm:text-2xl lg:text-3xl font-extrabold tracking-tight text-[#0f172a] leading-tight">
                  {step === 1 && "¿Qué servicio buscas hoy?"}
                  {step === 2 && <>Elige tu <span className="text-[var(--champagne)]">especialista</span></>}
                  {step === 3 && <>Elige tu <span className="text-[var(--champagne)]">fecha y hora</span></>}
                  {step === 4 && <>Personaliza tu <span className="text-[var(--champagne)]">Experiencia</span></>}
                  {step === 5 && <>Completa tu <span className="text-[var(--champagne)]">Reserva</span></>}
                </h1>
                <p className="text-[var(--text-secondary)] text-xs sm:text-sm font-medium max-w-sm mx-auto mt-2">
                  {step === 1 && "Elige la categoría que mejor se adapte a tu sonrisa."}
                  {step === 2 && "Cada especialista tiene su área. Escoge el que mejor va contigo."}
                  {step === 3 && "Selecciona el día y la hora que mejor se adapten a ti."}
                  {step === 4 && "Queremos que tu visita sea perfecta desde que llegas hasta que te vas."}
                  {step === 5 && "Ingresa tus datos para asegurar tu cita en 1 clic."}
                </p>
              </motion.div>
              </AnimatePresence>
            </div>
            )}

            {/* Content - No wrapper card */}
            <div className={`flex flex-col relative z-10 ${step === 1 ? '' : 'flex-1'}`}>
              <AnimatePresence mode="wait" custom={stepDirection} initial={false}>
              <motion.div
                key={step}
                custom={stepDirection}
                variants={stepVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ ...STEP_ENTER_TRANSITION, exit: STEP_EXIT_TRANSITION }}
                className={`transition-step-container w-full ${step === 2 && expandedBarber ? 'block' : step === 1 ? 'flex flex-col' : 'h-full flex flex-col justify-between flex-1'} pt-4`}
                onAnimationStart={() => { scrollToTop(); }}
              >
                
                {/* STEP 1: Categories & Services (Accordion) */}
                {step === 1 && (
                  // Fixed 2-column grid from lg up, always — an open card just grows taller
                  // within its own column (its row's height auto-expands to fit it; the
                  // sibling card next to it stays put, top-aligned via items-start). No
                  // col-span here: spanning the open card across both columns is what caused
                  // it to jump to a new row and leave a gap next to whichever card precedes
                  // it, since Grid can't fit a 2-col item in a row with only 1 free column.
                  <div className="space-y-3 w-full md:space-y-0 md:grid md:grid-cols-2 md:gap-4 md:items-start lg:grid-cols-1 xl:grid-cols-2">
                    {[
                      { key: 'Estética', label: 'Estética', sub: 'Blanqueamiento y limpieza', icon: <Sparkles size={22} strokeWidth={1.5} />, img: null },
                      { key: 'Ortodoncia', label: 'Ortodoncia', sub: 'Alinea tu sonrisa', icon: <Activity size={22} strokeWidth={1.5} />, img: null },
                      { key: 'Endodoncia', label: 'Endodoncia', sub: 'Salva tu diente natural', icon: <HeartPulse size={22} strokeWidth={1.5} />, img: null },
                      { key: 'Odontopediatría', label: 'Odontopediatría', sub: 'Sonrisas desde pequeños', icon: <Baby size={22} strokeWidth={1.5} />, img: null, isKids: true },
                    ].map((cat, catIndex) => {
                      const isOpen = openCategory === cat.key;
                      const catServices = cat.isKids
                        ? getServicesForCategory('Odontopediatría')
                        : getServicesForCategory(cat.key);
                      return (
                        <div
                          key={cat.key}
                          className={`rounded-2xl border overflow-hidden transition-all duration-300 accordion-category-card stagger-enter stagger-${catIndex + 1} ${
                            isOpen ? 'is-open' : ''
                          } ${cat.isKids ? 'border-[rgba(17, 17, 17,0.3)]' : ''}`}
                        >
                          {/* Header card — click to toggle */}
                          <button 
                            onClick={() => setOpenCategory(isOpen ? null : cat.key)}
                            className="accordion-category-header"
                            type="button"
                          >
                            <div className="category-image-wrapper">
                              {cat.img ? (
                                <img 
                                  src={cat.img} 
                                  alt={cat.label} 
                                  loading="eager"
                                  onLoad={(e) => e.currentTarget.classList.add('loaded')}
                                />
                              ) : (
                                <div
                                  className="w-full h-full"
                                  style={{ background: 'linear-gradient(135deg,#f7f4ee 0%,#efe6d5 50%,#e8d4b0 100%)' }}
                                />
                              )}
                              {cat.isKids && (
                                <div className="absolute inset-0 bg-gradient-to-br from-[#111111]/20 to-transparent" />
                              )}
                            </div>
                            <div className="accordion-category-header-content">
                              <div className={`category-icon-wrapper ${cat.isKids ? 'bg-[#111111]/20' : ''}`}>
                                {cat.icon}
                              </div>
                              <div className="category-title-wrapper">
                                <span className="category-title flex items-center gap-2">
                                  {cat.label}
                                </span>
                                <span className="category-subtitle">{cat.sub}</span>
                                <div className="category-underline"></div>
                              </div>
                            </div>
                            <ChevronDown size={18} className="accordion-chevron" />
                          </button>

                          {/* Expandable list of services */}
                          {isOpen && (
                            <div className="accordion-services-list">
                              {cat.isKids && (
                                <div className="px-4 py-2 bg-[#111111]/5 border-b border-[#111111]/10 flex items-center gap-2">
                                  <Heart size={11} className="text-[#111111]" fill="currentColor" />
                                  <span className="text-[10px] text-[#111111] font-bold uppercase tracking-wider">Servicios especiales para niños</span>
                                </div>
                              )}
                              {catServices.length === 0 ? (
                                <div className="text-center py-6 text-[#94a3b8] text-xs font-semibold">
                                  No hay servicios disponibles en esta categoría.
                                </div>
                              ) : (
                                catServices.map(service => {
                                  const isSelected = selectedService?.id === service.id;
                                  return (
                                    <button
                                      key={service.id}
                                      onClick={() => {
                                        setSelectedService(service);
                                        setSelectedCategory(cat.key);
                                        scrollToNextButton();
                                      }}
                                      type="button"
                                      className={`accordion-service-item ${isSelected ? 'is-selected' : ''}`}
                                    >
                                      <div className="service-left">
                                        <div className="service-check-wrapper">
                                          <Check size={12} strokeWidth={3} />
                                        </div>
                                        <div className="service-details">
                                          <span className="service-name">{service.name}</span>
                                          {service.duration && (
                                            <span className="service-duration">
                                              <Clock size={10} /> {formatDuration(service.duration)}
                                            </span>
                                          )}
                                        </div>
                                      </div>
                                      <div className="service-price">
                                        {(service.category || '').toLowerCase().includes('tatuaj') && <span style={{ fontSize: '11px', fontWeight: 700, marginRight: 4 }}>Desde</span>}
                                        ${service.price}
                                      </div>
                                    </button>
                                  );
                                })
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* STEP 2: Barbers */}
{/* STEP 2: Barbers */}
                {step === 2 && (
                  <div className="w-full">
                    <AnimatePresence mode="wait">
                      {expandedBarber ? (
                        <BarberProfileView 
                          key={`profile-${expandedBarber.id}`}
                        barber={expandedBarber}
                        barbers={barbers}
                        onClose={() => {
                          if (location.state?.exploreBarbers) {
                            // Navigate immediately — don't clear expandedBarber first
                            // or the Step 2 grid will flash behind.
                            navigate('/perfil/explorar', { replace: true });
                          } else {
                            setExpandedBarber(null);
                            setExpandedBarberPortfolio([]);
                            if (profileSourceStep === 1) {
                              handleReturnToWelcome(true);
                            } else {
                              setStep(2);
                            }
                            scrollToTop();
                          }
                        }}
                        onShare={() => handleShare(expandedBarber)}
                        favorites={favorites}
                        toggleFavorite={toggleFavorite}
                        portfolio={expandedBarberPortfolio}
                        portfolioLoading={portfolioLoading}
                        setActiveLightboxImage={setActiveLightboxImage}
                        
                        hideBooking={false}
                        services={services}
                        setSelectedBarber={setSelectedBarber}
                        setStep={setStep}
                        selectedService={selectedService}
                        setSelectedService={setSelectedService}
                        selectedDate={selectedDate}
                        setSelectedDate={setSelectedDate}
                        selectedTime={selectedTime}
                        setSelectedTime={setSelectedTime}
                        visibleSlots={visibleSlots}
                        profileActivePeriod={profileActivePeriod}
                        setProfileActivePeriod={setProfileActivePeriod}
                        formatDuration={formatDuration}
                        formatTime12={formatTime12}
                        BarberAvatar={BarberAvatar}
                        createRipple={createRipple}
                        onSelectBarber={(b) => {
                          setSelectedBarber(b);
                          setExpandedBarber(null);
                          setStep(step + 1);
                          scrollToTop();
                        }}
                        scrollToTimeSlots={scrollToTimeSlots}
                        scrollToTop={scrollToTop}
                        onSwitchBarber={(b) => {
                          setExpandedBarber(b);
                          setExpandedBarberPortfolio([]);
                          loadExpandedPortfolio(b.id);
                          scrollToTop();
                        }}
                      />
                    ) : !location.state?.exploreBarbers ? (
                      /* GRID CARDS WITH SEARCH FILTER */
                      <motion.div 
                        key="barber-list"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.3 }}
                        className="space-y-4"
                      >
                        {/* Premium Search Input */}
                        <div className="relative">
                          <span className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none text-[#94a3b8]">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                          </span>
                          <input
                            type="text"
                            value={barberSearchQuery}
                            onChange={(e) => setBarberSearchQuery(e.target.value)}
                            placeholder="Buscar especialista por nombre..."
                            className="w-full bg-white border border-[#d9c08f]/15 rounded-2xl py-3.5 pl-11 pr-10 text-xs font-semibold text-[#0f172a] placeholder-[#94a3b8] focus:outline-none focus:border-[var(--champagne)]/30 transition-all shadow-[0_6px_20px_rgba(0,0,0,0.06)]"
                          />
                          {barberSearchQuery && (
                            <button
                              onClick={() => setBarberSearchQuery('')}
                              className="absolute inset-y-0 right-0 flex items-center pr-4 text-[#94a3b8] hover:text-[#0f172a] transition-colors"
                            >
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                            </button>
                          )}
                        </div>

                        {(() => {
                          const filtered = barbers.filter(b => {
                            let roleMatches = true;
                            if (selectedCategory) {
                              roleMatches = selectedCategory === 'Tatuajes' ? isTattooBookableStaff(b) : isBarberBookableStaff(b);
                            }
                            
                            if (!isBookableStaff(b) || !roleMatches) return false;
                            if (!barberSearchQuery) return true;
                            
                            const query = barberSearchQuery.toLowerCase();
                            return b.name?.toLowerCase().includes(query) || 
                                   (b.specialty || '').toLowerCase().includes(query) || 
                                   (b.role || '').toLowerCase().includes(query);
                          });

                          if (filtered.length === 0) {
                            return (
                              <div className="flex flex-col items-center justify-center py-12 px-4 border border-dashed border-[#d9c08f]/15 bg-[#f7f7f5] rounded-2xl">
                                <span className="text-[#cbd5e1] mb-3">
                                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                                </span>
                                <p className="text-xs font-bold text-[#64748b] uppercase tracking-wider">No se encontraron resultados</p>
                                <p className="text-[10px] text-[#94a3b8] mt-1">Intenta con otro nombre o especialidad</p>
                              </div>
                            );
                          }

                          return (
                            <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                              {filtered.map((barber, bIdx) => {
                                const specialty = getNormalizedSpecialty(barber);
                                const badge = barber.badge || '';
                                const reviewsList = [324, 210, 189, 98, 142];
                                const reviews = reviewsList[bIdx % reviewsList.length];
                                const isSelected = selectedBarber?.id === barber.id;
                                return (
                                  <div
                                    key={barber.id}
                                    onClick={async () => {
                                      setProfileSourceStep(2);
                                      setExpandedBarber(barber);
                                      loadExpandedPortfolio(barber.id);
                                      scrollToTop();
                                    }}
                                    className={`relative rounded-2xl border overflow-hidden transition-all duration-300 cursor-pointer text-left bg-white hover:border-[#d9c08f]/30 active:scale-[0.98] collapsed-card-reveal flex flex-col ${
                                      isSelected 
                                        ? 'border-[var(--champagne)] shadow-[0_0_22px_rgba(17, 17, 17,0.18)] ring-1 ring-[var(--champagne)]' 
                                        : 'border-[#d9c08f]/20'
                                    }`}
                                  >
                                    <div className="relative h-44 overflow-hidden bg-white">
                                      {barber.image_url ? (
                                        <img src={barber.image_url} alt={barber.name} className="w-full h-full object-cover object-top" />
                                      ) : (
                                        <div className="w-full h-full flex flex-col items-center justify-center gap-2 bg-gradient-to-b from-[var(--champagne-dark)]/5 to-transparent">
                                          <div className="w-14 h-14 rounded-full bg-white border border-[#d9c08f]/15 flex items-center justify-center text-[var(--champagne)] shadow-inner">
                                            <User size={26} strokeWidth={1.5} />
                                          </div>
                                           <span className="text-[8px] text-[var(--champagne)]/40 font-bold uppercase tracking-widest">Dientes Sanos</span>
                                        </div>
                                      )}
                                      <div className="absolute inset-0 bg-gradient-to-t from-white via-transparent to-transparent"></div>
                                      
                                      {/* Selection mark */}
                                      {isSelected && (
                                        <div className="absolute bottom-2 right-2 w-7 h-7 rounded-full bg-[var(--champagne)] flex items-center justify-center shadow-[0_6px_20px_rgba(0,0,0,0.06)] border border-black/10 z-10 animate-scale-up">
                                          <Check size={14} className="text-black" strokeWidth={3} />
                                        </div>
                                      )}


                                      <div className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center z-10" onClick={(e) => { e.stopPropagation(); toggleFavorite(barber.id); }}>
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill={favorites.includes(barber.id) ? "#ff453a" : "none"} stroke={favorites.includes(barber.id) ? "#ff453a" : "white"} strokeWidth="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
                                      </div>
                                    </div>
                                    <div className="p-3 flex flex-col gap-1.5 flex-1 justify-between">
                                      <div>
                                        <h4 className="font-extrabold text-sm text-[#0f172a] leading-tight">{barber.name}</h4>
                                        <p className="text-[#94a3b8] text-[10px] font-medium mt-0.5">{specialty}</p>
                                      </div>
                                      <div className="flex flex-col gap-2 mt-2 pt-2 border-t border-[#d9c08f]/15">
                                        {/* Availability (mock removed) */}
                                        {/* Full-width ELEGIR button */}
                                        <button 
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setSelectedBarber(isSelected ? null : barber);
                                            if (!isSelected) scrollToNextButton();
                                          }}
                                          className={`w-full py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all duration-300 cursor-pointer haptic-bounce ${
                                            isSelected 
                                              ? 'bg-[var(--champagne)] text-black shadow-[0_4px_14px_rgba(17, 17, 17,0.35)] scale-[1.02]' 
                                              : 'bg-white text-[#475569] hover:bg-[#f7f7f5] hover:text-[#0f172a] border border-[#d9c08f]/20'
                                          }`}
                                        >
                                          {isSelected ? '✓ Elegido' : 'Elegir'}
                                        </button>
                                        {/* Tap hint — only when not selected */}
                                        {!isSelected && (
                                          <p className="text-center text-[8px] text-[#cbd5e1] font-medium tracking-wide -mt-0.5">
                                            Tócame para escoger
                                          </p>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          );
                        })()}
                      </motion.div>
                    ) : null}
                    </AnimatePresence>
                  </div>
                )}

                {/* STEP 3: Unified Date & Time Selection */}
                {step === 3 && (
                  <div className="space-y-6 w-full animate-fade-in py-2">
                    
                    {/* Calendar Card */}
                    <div className="bg-white md:backdrop-blur-md backdrop-blur-sm border border-[#d9c08f]/15 rounded-3xl p-5 shadow-[0_8px_24px_rgba(0,0,0,0.06)] space-y-4">
                      
                      {/* Calendar Header: Month, Year and Arrows */}
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-base font-extrabold text-[#0f172a]">
                          {(() => {
                            const monthName = currentCalendarMonth.toLocaleDateString('es-ES', { month: 'long' });
                            const capitalizedMonth = monthName.charAt(0).toUpperCase() + monthName.slice(1);
                            const year = currentCalendarMonth.getFullYear();
                            return `${capitalizedMonth} ${year}`;
                          })()}
                        </span>
                        
                        <div className="flex items-center gap-3">
                          {/* Prev Month Button */}
                          <button
                            type="button"
                            onClick={() => {
                              const today = new Date();
                              const isPrevDisabled = currentCalendarMonth.getFullYear() === today.getFullYear() && currentCalendarMonth.getMonth() === today.getMonth();
                              if (!isPrevDisabled) {
                                setCurrentCalendarMonth(new Date(currentCalendarMonth.getFullYear(), currentCalendarMonth.getMonth() - 1, 1));
                              }
                            }}
                            disabled={currentCalendarMonth.getFullYear() === new Date().getFullYear() && currentCalendarMonth.getMonth() === new Date().getMonth()}
                            className={`p-1.5 transition-colors cursor-pointer ${
                              currentCalendarMonth.getFullYear() === new Date().getFullYear() && currentCalendarMonth.getMonth() === new Date().getMonth()
                                ? 'text-[#cbd5e1] cursor-not-allowed'
                                : 'text-[#94a3b8] hover:text-[#0f172a]'
                            }`}
                          >
                            <ChevronLeft size={20} />
                          </button>
                          
                          {/* Next Month Button */}
                          <button
                            type="button"
                            onClick={() => {
                              setCurrentCalendarMonth(new Date(currentCalendarMonth.getFullYear(), currentCalendarMonth.getMonth() + 1, 1));
                            }}
                            className="w-8 h-8 rounded-full bg-[var(--champagne)] text-black flex items-center justify-center hover:bg-[#b8a283] transition-all active:scale-95 cursor-pointer shadow-[0_4px_16px_rgba(0,0,0,0.05)]"
                          >
                            <ChevronRight size={18} strokeWidth={2.5} />
                          </button>
                        </div>
                      </div>
                      
                      {/* Weekday abbreviations */}
                      <div className="grid grid-cols-7 gap-1 text-center">
                        {['LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB', 'DOM'].map(d => (
                          <span key={d} className="text-[10px] font-black text-[#94a3b8] tracking-wider">
                            {d}
                          </span>
                        ))}
                      </div>
                      
                      {/* Days Grid */}
                      <div className="grid grid-cols-7 gap-y-2 gap-x-1">
                        {calendarDays.map((dayObj, index) => {
                          const { dayNumber, date, isCurrentMonth, isSelectable, isToday, isSelected } = dayObj;
                          
                          return (
                            <button
                              key={index}
                              type="button"
                              disabled={!isSelectable}
                              onClick={() => {
                                if (isSelectable) {
                                  if (!selectedDate || selectedDate.toDateString() !== date.toDateString()) {
                                    setSelectedDate(date);
                                    setSelectedTime(null);
                                    scrollToTimeSlots();
                                  }
                                }
                              }}
                              className="relative py-1 cursor-pointer outline-none focus:outline-none"
                            >
                              <div
                                className={`w-9 h-9 rounded-full mx-auto flex items-center justify-center text-sm transition-all duration-200 ${
                                  isSelected
                                    ? 'bg-[var(--champagne)] text-black font-extrabold shadow-[0_0_12px_rgba(17, 17, 17,0.4)] scale-105'
                                    : isToday
                                      ? 'border border-[var(--champagne)]/40 text-[#0f172a] font-bold'
                                      : !isCurrentMonth
                                        ? 'text-[#cbd5e1] pointer-events-none'
                                        : isSelectable
                                          ? 'text-[#0f172a] hover:bg-[#f7f7f5]'
                                          : 'text-[#cbd5e1] pointer-events-none'
                                }`}
                              >
                                {dayNumber}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                      
                    </div>
                    
                    {/* Time Slots Block */}
                    <div className="space-y-4" ref={timeSlotsRef}>
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-bold uppercase tracking-widest text-[#475569]">
                          {selectedDate ? (
                            (() => {
                              const weekday = selectedDate.toLocaleDateString('es-ES', { weekday: 'long' });
                              const capitalizedWeekday = weekday.charAt(0).toUpperCase() + weekday.slice(1);
                              const day = selectedDate.getDate();
                              const monthName = selectedDate.toLocaleDateString('es-ES', { month: 'long' });
                              const capitalizedMonth = monthName.charAt(0).toUpperCase() + monthName.slice(1);
                              return `${capitalizedWeekday} ${day} de ${capitalizedMonth}`;
                            })()
                          ) : (
                            "Horarios Disponibles"
                          )}
                        </h4>
                        
                        {selectedDate && (
                          <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 font-bold border border-emerald-500/20">
                            Disponible
                          </span>
                        )}
                      </div>
                      
                      {!selectedDate ? (
                        <div className="text-center py-10 bg-[#f7f7f5] border border-[#d9c08f]/15 rounded-2xl text-[#94a3b8] text-xs">
                          Selecciona un día en el calendario para ver las horas disponibles.
                        </div>
                      ) : loadingSlots ? (
                        <div className="space-y-2.5">
                          <div className="grid grid-cols-4 gap-2.5">
                            {Array.from({ length: allTimeSlots.length || 16 }).map((_, i) => (
                              <div key={i} className="h-[46px] rounded-xl border border-[#d9c08f]/15 slot-skeleton" />
                            ))}
                          </div>
                        </div>
                      ) : (
                        <div className="animate-fade-in">
                          {!storeIsOpen && (
                            <div className="mb-4 relative overflow-hidden rounded-2xl border border-red-500/20 bg-gradient-to-br from-red-500/[0.09] via-red-500/[0.06] to-red-500/[0.03] px-4 py-3.5 flex items-center gap-3.5 shadow-[0_8px_30px_rgba(239,68,68,0.08)]">
                              <div className="shrink-0 w-10 h-10 rounded-full bg-red-500/10 border border-red-500/25 flex items-center justify-center">
                                <Lock size={17} className="text-red-400" />
                              </div>
                              <div className="text-left min-w-0">
                                 <p className="text-red-400 text-[11px] font-black uppercase tracking-wider leading-tight">Clínica cerrada</p>
                                <p className="text-red-300/70 text-[11px] font-medium mt-0.5 leading-snug">Las reservas están bloqueadas por ahora. Vuelve más tarde.</p>
                              </div>
                            </div>
                          )}
                          <div className="grid grid-cols-4 gap-2.5">
                            {visibleSlots.map(({ time, label, isPast, isOccupied, isClosed }) => {
                              const isSelected = selectedTime === time;
                              const isDisabled = isPast || isOccupied || isClosed;

                              return (
                                <button
                                  key={time}
                                  type="button"
                                  onClick={() => {
                                    if (!isDisabled) {
                                      setSelectedTime(time);
                                      scrollToBookingSummary();
                                    }
                                  }}
                                  disabled={isDisabled}
                                  className={`py-3 rounded-xl border text-center transition-all duration-200 cursor-pointer ${
                                    isClosed
                                      ? 'border-red-500/10 bg-red-500/[0.03] text-[#cbd5e1] cursor-not-allowed'
                                      : isOccupied
                                        ? 'border-red-500/20 bg-red-500/5 text-red-400/40 cursor-not-allowed opacity-50'
                                        : isPast
                                          ? 'border-[#d9c08f]/15 bg-transparent text-[#cbd5e1] cursor-not-allowed'
                                          : isSelected
                                            ? 'border-[var(--champagne)] bg-[rgba(17, 17, 17,0.12)] text-[var(--champagne)] font-bold scale-[1.02] shadow-[0_0_12px_rgba(17, 17, 17,0.2)]'
                                            : 'border-[#d9c08f]/15 bg-white hover:bg-[#f7f7f5] hover:border-[#d9c08f]/30 text-[#0f172a]'
                                  }`}
                                >
                                  <span className="text-xs font-bold block">{label}</span>
                                  {!isClosed && isOccupied && <span className="text-[7px] tracking-wider uppercase font-semibold text-red-500/60 mt-0.5 block">Ocupado</span>}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                    
                    {/* TU SELECCIÓN Card — solo en móvil/tablet, en desktop el sidebar ya muestra esto */}
                    {selectedDate && selectedTime && (
                      <div ref={bookingSummaryRef} className="relative rounded-3xl overflow-hidden animate-fade-in lg:hidden" style={{
                        background: 'linear-gradient(135deg, rgba(17, 17, 17,0.10) 0%, rgba(255,255,255,0.98) 50%, rgba(17, 17, 17,0.05) 100%)',
                        border: '1px solid rgba(17, 17, 17,0.25)',
                        boxShadow: '0 0 40px rgba(17, 17, 17,0.08), inset 0 1px 0 rgba(17, 17, 17,0.12)'
                      }}>
                        {/* Top shimmer line */}
                        <div className="absolute top-0 left-0 right-0 h-px" style={{background: 'linear-gradient(90deg, transparent, rgba(17, 17, 17,0.5), transparent)'}} />
                        
                        {/* Glow orb */}
                        <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full pointer-events-none" style={{background: 'radial-gradient(circle, rgba(17, 17, 17,0.12) 0%, transparent 70%)'}} />
                        <div className="absolute -bottom-6 -left-6 w-24 h-24 rounded-full pointer-events-none" style={{background: 'radial-gradient(circle, rgba(17, 17, 17,0.06) 0%, transparent 70%)'}} />

                        <div className="relative p-4">
                          {/* Header label */}
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-1.5">
                              <div className="w-1 h-3 rounded-full" style={{background: 'var(--champagne)'}} />
                              <span className="text-[9px] font-black tracking-[0.22em] uppercase" style={{color: 'var(--champagne)'}}>Tu Reserva</span>
                            </div>
                            <button
                              type="button"
                              onClick={() => { handleOpenInlineEdit(); setInlineEditTab('barber'); }}
                              className="flex items-center gap-1.5 px-2.5 py-1 rounded-full cursor-pointer transition-all duration-200 hover:scale-105 active:scale-95"
                              style={{
                                background: 'rgba(17, 17, 17,0.08)',
                                border: '1px solid rgba(17, 17, 17,0.2)',
                              }}
                            >
                              <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="rgba(17, 17, 17,0.9)" strokeWidth="2.5"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                              <span className="text-[9px] font-bold tracking-wider" style={{color: 'rgba(17, 17, 17,0.9)'}}>Editar</span>
                            </button>
                          </div>

                          {/* Main content row */}
                          <div className="flex items-center gap-3">
                            {/* Barber photo with gold ring */}
                            <div className="flex-shrink-0 relative">
                              <div className="w-14 h-14 rounded-2xl overflow-hidden" style={{
                                border: '1.5px solid rgba(17, 17, 17,0.35)',
                                boxShadow: '0 0 16px rgba(17, 17, 17,0.15)'
                              }}>
                                {selectedBarber?.image_url ? (
                                  <img src={selectedBarber.image_url} alt={selectedBarber.name} className="w-full h-full object-cover object-top" />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center" style={{background: 'rgba(17, 17, 17,0.05)'}}>
                                    <User size={22} strokeWidth={1.5} style={{color: 'rgba(17, 17, 17,0.6)'}} />
                                  </div>
                                )}
                              </div>
                              {/* Confirmed badge */}
                              <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center" style={{
                                background: 'linear-gradient(135deg, #e8d4b0, #a8936b)',
                                boxShadow: '0 2px 8px rgba(17, 17, 17,0.4)'
                              }}>
                                <Check size={10} className="text-black" strokeWidth={3} />
                              </div>
                            </div>

                            {/* Date & time info */}
                            <div className="flex-1 min-w-0">
                              {/* Date */}
                              <div className="text-[#0f172a] font-extrabold text-[14px] leading-tight tracking-tight">
                                {(() => {
                                  const weekday = selectedDate.toLocaleDateString('es-ES', { weekday: 'long' });
                                  const capitalizedWeekday = weekday.charAt(0).toUpperCase() + weekday.slice(1);
                                  const day = selectedDate.getDate();
                                  const monthName = selectedDate.toLocaleDateString('es-ES', { month: 'long' });
                                  const capitalizedMonth = monthName.charAt(0).toUpperCase() + monthName.slice(1);
                                  return `${capitalizedWeekday} ${day} de ${capitalizedMonth}`;
                                })()}
                              </div>
                              {/* Time chip */}
                              <div className="flex items-center gap-1.5 mt-1">
                                <div className="flex items-center gap-1 px-2 py-0.5 rounded-full" style={{
                                  background: 'rgba(17, 17, 17,0.1)',
                                  border: '1px solid rgba(17, 17, 17,0.2)'
                                }}>
                                  <Clock size={9} style={{color: 'var(--champagne)'}} />
                                  <span className="text-[10px] font-bold" style={{color: 'var(--champagne)'}}>{formatTime12(selectedTime)}</span>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Divider */}
                          <div className="mt-3 mb-3 h-px" style={{background: 'linear-gradient(90deg, rgba(17, 17, 17,0.15), rgba(17, 17, 17,0.04), transparent)'}} />

                          {/* Service & Artist chips row */}
                          <div className="flex items-center gap-2 flex-wrap">
                            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full" style={{background: 'rgba(0,0,0,0.04)', border: '1px solid rgba(0,0,0,0.07)'}}>
                              <Scissors size={9} className="text-[#94a3b8]" />
                              <span className="text-[9px] font-semibold text-[#64748b] truncate max-w-[100px]">{selectedService?.name}</span>
                            </div>
                            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full" style={{background: 'rgba(0,0,0,0.04)', border: '1px solid rgba(0,0,0,0.07)'}}>
                              <User size={9} className="text-[#94a3b8]" />
                              <span className="text-[9px] font-semibold text-[#64748b]">{selectedBarber?.name}</span>
                            </div>
                            {selectedService?.price && (
                              <div className="ml-auto flex items-center gap-1 px-2.5 py-1 rounded-full" style={{
                                background: 'rgba(17, 17, 17,0.06)',
                                border: '1px solid rgba(17, 17, 17,0.15)'
                              }}>
                                <span className="text-[10px] font-black" style={{color: 'rgba(17, 17, 17,0.8)'}}>
                                  ${selectedService.price}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                    

                    {/* Big Gold CONTINUAR Button — solo visible en móvil, en desktop usa el Siguiente del sidebar */}
                    <div className="pt-2 lg:hidden" ref={step3ContinueBtnRef} style={{ scrollMarginBottom: isEmbedded ? '120px' : '40px' }}>
                      <button
                        type="button"
                        onClick={(e) => {
                          createRipple(e);
                          if (selectedDate && selectedTime) {
                            setStep(4);
                            scrollToTop();
                          }
                        }}
                        disabled={!selectedDate || !selectedTime}
                        className={`w-full py-4 px-6 rounded-3xl font-extrabold text-sm uppercase tracking-widest flex items-center justify-center gap-2 transition-all duration-300 haptic-bounce ripple-container shadow-[0_4px_20px_rgba(17, 17, 17,0.15)] ${
                          selectedDate && selectedTime
                            ? 'btn-gold cursor-pointer text-black'
                            : 'bg-[#f7f7f5] border border-[#d9c08f]/15 text-[#94a3b8] cursor-not-allowed'
                        }`}
                      >
                        Continuar
                        <ChevronRight size={18} strokeWidth={2.5} />
                      </button>
                    </div>
                    
                  </div>
                )}

                {/* STEP 4: Beverage Concierge & Experience Customization */}
                {step === 4 && (() => {
                  const isTattoo = (selectedService?.category || '').toLowerCase().includes('tatuaj');
                  return (
                  <div className="space-y-10 w-full animate-fade-in py-2">
                    {/* 1. Beverage Section */}
                    <div className="space-y-4">
                      <div className="flex items-center gap-2 text-[#0f172a] text-left">
                        <Coffee size={18} className="text-[var(--champagne)]" />
                        <h3 className="text-xs lg:text-sm font-bold uppercase tracking-widest">Elige tu cortesía</h3>
                      </div>
                      <p className="text-[10px] text-[#94a3b8] -mt-1 text-left">
                        Cortesía de la casa · opcional — estará lista cuando llegues.
                      </p>
                      {cafeMenu.length === 0 ? (
                        <div className="grid grid-cols-2 lg:grid-cols-3 gap-2.5">
                          {[0, 1, 2, 3, 4, 5].map(i => (
                            <div key={i} className="animate-pulse h-[64px] rounded-xl bg-white border border-[#d9c08f]/15" />
                          ))}
                        </div>
                      ) : (
                      <>
                        {/* Secciones: Café / Infusiones / Bebidas frías */}
                        <div className="flex gap-2 mb-3">
                          {[{ k: 'cafe', label: 'Café' }, { k: 'infusion', label: 'Infusiones' }, { k: 'fria', label: 'Bebidas frías' }].map(t => (
                            <button
                              key={t.k}
                              type="button"
                              onClick={() => setCafeTab(t.k)}
                              disabled={cafeGroups[t.k].length === 0}
                              className={`flex-1 py-2 rounded-lg text-[10px] font-bold uppercase tracking-wide transition-all border ${
                                cafeTab === t.k
                                  ? 'border-[var(--champagne)] bg-[rgba(17, 17, 17,0.1)] text-[var(--champagne)]'
                                  : cafeGroups[t.k].length === 0
                                    ? 'border-[#d9c08f]/15 bg-[#f7f7f5] text-[#cbd5e1] cursor-not-allowed'
                                    : 'border-[#d9c08f]/15 bg-white text-[#64748b] hover:text-[#0f172a] hover:border-[#d9c08f]/30'
                              }`}
                            >
                              {t.label} <span className="opacity-50">({cafeGroups[t.k].length})</span>
                            </button>
                          ))}
                        </div>
                        <div className="grid grid-cols-2 lg:grid-cols-3 gap-2.5 max-h-[260px] overflow-y-auto panda-scrollbar pr-1">
                          {cafeGroups[cafeTab].map((item) => {
                            const isSelected = selectedBeverage === item.name;
                            return (
                              <button
                                key={item.id}
                                type="button"
                                onClick={() => { const next = isSelected ? '' : item.name; setSelectedBeverage(next); if (next) scrollToNextButton(); }}
                                className={`relative rounded-xl cursor-pointer transition-all duration-300 flex items-center gap-2.5 p-2.5 border text-left ${
                                  isSelected
                                    ? 'border-[var(--champagne)] bg-[rgba(17, 17, 17,0.06)] shadow-[0_4px_15px_rgba(17, 17, 17,0.12)]'
                                    : 'border-[#d9c08f]/15 bg-white hover:bg-[#d9c08f]/10 hover:border-[#d9c08f]/30'
                                }`}
                              >
                                <div className={`w-9 h-9 rounded-lg flex-shrink-0 flex items-center justify-center ${isSelected ? 'bg-[rgba(17, 17, 17,0.15)]' : 'bg-[#f7f7f5]'}`}>
                                  <Coffee size={16} className="text-[var(--champagne)]" />
                                </div>
                                <div className="min-w-0 flex-1">
                                  <span className={`block font-bold text-[11px] leading-tight truncate ${isSelected ? 'text-[var(--champagne)]' : 'text-[#334155]'}`}>
                                    {item.name}
                                  </span>
                                  <div className="flex items-center gap-1.5 mt-0.5">
                                    <span className="text-[9px] text-[#94a3b8] line-through">${Number(item.price || 0).toFixed(2)}</span>
                                    <span className="text-[9px] font-extrabold text-emerald-600">GRATIS</span>
                                  </div>
                                </div>
                                <div className={`w-4 h-4 rounded-full flex-shrink-0 flex items-center justify-center text-[9px] font-extrabold transition-all ${isSelected ? 'bg-[var(--champagne)] text-black' : 'bg-white text-transparent border border-[#d9c08f]/20'}`}>✓</div>
                              </button>
                            );
                          })}
                        </div>
                      </>
                      )}
                    </div>

                    {!isTattoo ? (
                    <div className="space-y-4">
                      <div className="flex items-center gap-2 text-[#0f172a] text-left">
                        <MessageSquare size={18} className="text-[var(--champagne)]" />
                        <h3 className="text-xs lg:text-sm font-bold uppercase tracking-widest">¿Algo que debamos saber?</h3>
                      </div>
                      <p className="text-[10px] text-[#94a3b8] -mt-1 text-left">
                        Cuéntanos cualquier detalle especial.
                      </p>
                      <div className="relative">
                        <textarea
                          value={notes}
                          onChange={(e) => setNotes(e.target.value.slice(0, 120))}
                          placeholder="Ej: Sensibilidad en alguna muela, alergias, hora preferida, etc."
                          className="w-full h-20 bg-white border border-[#d9c08f]/15 rounded-xl p-3 text-xs text-[#0f172a] placeholder-[#94a3b8] focus:outline-none focus:border-[var(--champagne)]/40 focus:bg-white transition-all resize-none pr-12 text-left"
                        />
                        <span className="absolute bottom-2.5 right-3 text-[9px] font-bold text-[#cbd5e1]">
                          {notes.length}/120
                        </span>
                      </div>
                    </div>
                    ) : (
                    <div className="space-y-6">
                      {/* Tattoos Form */}
                      <div className="space-y-4">
                        <div className="flex items-center gap-2 text-[#0f172a] text-left">
                          <PenTool size={18} className="text-[var(--champagne)]" />
                          <h3 className="text-xs lg:text-sm font-bold uppercase tracking-widest">Cuéntanos tu caso</h3>
                        </div>
                        <textarea
                          value={tattooIdea}
                          onChange={(e) => setTattooIdea(e.target.value)}
                          placeholder="Describe los síntomas o molestias que sientes..."
                          className="w-full h-20 bg-white border border-[#d9c08f]/15 rounded-xl p-3 text-xs text-[#0f172a] placeholder-[#94a3b8] focus:outline-none focus:border-[var(--champagne)]/40 focus:bg-white transition-all resize-none text-left"
                        />
                      </div>

                      {/* Intensidad */}
                      <div className="space-y-3">
                        <div className="flex items-center gap-2 text-[#0f172a] text-left">
                          <h3 className="text-xs lg:text-sm font-bold uppercase tracking-widest">Intensidad</h3>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {['Leve', 'Moderada', 'Fuerte', 'Muy fuerte', 'Constante'].map(size => (
                            <button
                              key={size}
                              type="button"
                              onClick={() => setTattooSize(size)}
                              className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all border ${
                                tattooSize === size
                                  ? 'bg-[var(--champagne)] text-black border-[var(--champagne)]'
                                  : 'bg-white text-[#334155] border-[#d9c08f]/20 hover:border-[#d9c08f]/50 hover:bg-[#d9c08f]/10'
                              }`}
                            >
                              {size}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Zona */}
                      <div className="space-y-3">
                        <div className="flex items-center gap-2 text-[#0f172a] text-left">
                          <h3 className="text-xs lg:text-sm font-bold uppercase tracking-widest">¿En qué zona sientes molestia?</h3>
                        </div>
                        <input
                          type="text"
                          value={tattooZone}
                          onChange={(e) => setTattooZone(e.target.value)}
                          placeholder="Ej: Muela superior, encía, mandíbula..."
                          className="w-full bg-white border border-[#d9c08f]/15 rounded-xl p-3 text-xs text-[#0f172a] placeholder-[#94a3b8] focus:outline-none focus:border-[var(--champagne)]/40 focus:bg-white transition-all text-left"
                        />
                      </div>

                      {/* Estilo */}
                      <div className="space-y-3">
                        <div className="flex items-center gap-2 text-[#0f172a] text-left">
                          <h3 className="text-xs lg:text-sm font-bold uppercase tracking-widest">Síntomas principales</h3>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {['Dolor', 'Sensibilidad', 'Hinchazón', 'Sangrado', 'Mal sabor', 'Movilidad', 'Fractura', 'Manchado'].map(style => (
                            <button
                              key={style}
                              type="button"
                              onClick={() => setTattooStyle(style)}
                              className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all border ${
                                tattooStyle === style
                                  ? 'bg-[var(--champagne)] text-black border-[var(--champagne)]'
                                  : 'bg-white text-[#334155] border-[#d9c08f]/20 hover:border-[#d9c08f]/50 hover:bg-[#d9c08f]/10'
                              }`}
                            >
                              {style}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Temática */}
                      <div className="space-y-3">
                        <div className="flex items-center gap-2 text-[#0f172a] text-left">
                          <h3 className="text-xs lg:text-sm font-bold uppercase tracking-widest">Detalles adicionales</h3>
                        </div>
                        <input
                          type="text"
                          value={tattooTheme}
                          onChange={(e) => setTattooTheme(e.target.value)}
                          placeholder="Ej: desde cuándo, qué lo empeora, tratamientos previos..."
                          className="w-full bg-white border border-[#d9c08f]/15 rounded-xl p-3 text-xs text-[#0f172a] placeholder-[#94a3b8] focus:outline-none focus:border-[var(--champagne)]/40 focus:bg-white transition-all text-left"
                        />
                      </div>

                      {/* Diseño */}
                      <div className="space-y-3">
                        <div className="flex items-center gap-2 text-[#0f172a] text-left">
                          <h3 className="text-xs lg:text-sm font-bold uppercase tracking-widest">¿Ya tienes un presupuesto previo?</h3>
                        </div>
                        <div className="flex gap-3">
                          <button
                            type="button"
                            onClick={() => setHasDesign(true)}
                            className={`flex-1 py-3 rounded-xl text-[11px] font-bold uppercase tracking-wider transition-all border ${
                              hasDesign === true
                                ? 'bg-[var(--champagne)] text-black border-[var(--champagne)]'
                                : 'bg-white text-[#334155] border-[#d9c08f]/20 hover:border-[#d9c08f]/50 hover:bg-[#d9c08f]/10'
                            }`}
                          >
                            Ya tengo presupuesto
                          </button>
                          <div className="flex-1 relative">
                            <button
                              type="button"
                              onClick={() => setHasDesign(false)}
                              className={`w-full py-3 rounded-xl text-[11px] font-bold uppercase tracking-wider transition-all border ${
                                hasDesign === false
                                  ? 'bg-[var(--champagne)] text-black border-[var(--champagne)]'
                                  : 'bg-white text-[#334155] border-[#d9c08f]/20 hover:border-[#d9c08f]/50 hover:bg-[#d9c08f]/10'
                              }`}
                            >
                              Necesito valoración
                            </button>
                            <span className="absolute -bottom-4 left-0 right-0 text-[9px] text-[#94a3b8] text-center">Costo a confirmar en la valoración</span>
                          </div>
                        </div>
                      </div>

                      {/* Edad y Consentimiento */}
                      <div className="space-y-3">
                        <div className="flex items-center gap-2 text-[#0f172a] text-left">
                          <h3 className="text-xs font-bold uppercase tracking-widest">¿Eres mayor de edad?</h3>
                        </div>
                        <div className="flex gap-3">
                          <button
                            type="button"
                            onClick={() => setIsOfLegalAge(true)}
                            className={`flex-1 py-3 rounded-xl text-[11px] font-bold uppercase tracking-wider transition-all border ${
                              isOfLegalAge === true
                                ? 'bg-[var(--champagne)] text-black border-[var(--champagne)]'
                                : 'bg-[#f7f7f5] text-[#64748b] border-[#d9c08f]/15 hover:border-[#d9c08f]/30'
                            }`}
                          >
                            Sí, soy mayor de edad
                          </button>
                          <button
                            type="button"
                            onClick={() => setIsOfLegalAge(false)}
                            className={`flex-1 py-3 rounded-xl text-[11px] font-bold uppercase tracking-wider transition-all border ${
                              isOfLegalAge === false
                                ? 'bg-[var(--champagne)] text-black border-[var(--champagne)]'
                                : 'bg-[#f7f7f5] text-[#64748b] border-[#d9c08f]/15 hover:border-[#d9c08f]/30'
                            }`}
                          >
                            No, soy menor de edad
                          </button>
                        </div>

                        {isOfLegalAge === true && (
                          <div className="mt-3 p-3 rounded-xl bg-white border border-[#d9c08f]/20 text-left">
                            <p className="text-[10px] text-[#64748b] mb-3">
                              Al continuar, aceptas un descargo de responsabilidad que se firmará digitalmente. Este documento quedará guardado en tu perfil.
                            </p>
                            <label className="flex items-start gap-2 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={consentSigned}
                                onChange={(e) => setConsentSigned(e.target.checked)}
                                className="mt-0.5 accent-[var(--champagne)]"
                              />
                              <span className="text-[10px] text-[#334155]">
                                Acepto el descargo de responsabilidad y confirmo que soy mayor de edad. Entiendo que el tratamiento implica riesgos y acepto los asociados.
                              </span>
                            </label>
                          </div>
                        )}

                        {isOfLegalAge === false && (
                          <div className="mt-3 p-3 rounded-xl bg-white border border-[#d9c08f]/20 text-left">
                            <p className="text-[10px] text-[#64748b] mb-3">
                              Se requiere consentimiento de un padre o tutor legal. Después de agendar la cita, se generará un documento de consentimiento que deberá ser firmado digitalmente por tu padre/tutor y quedará guardado en tu perfil.
                            </p>
                            <label className="flex items-start gap-2 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={consentSigned}
                                onChange={(e) => setConsentSigned(e.target.checked)}
                                className="mt-0.5 accent-[var(--champagne)]"
                              />
                              <span className="text-[10px] text-[#334155]">
                                Mi padre/tutor legal será notificado para firmar el consentimiento correspondiente.
                              </span>
                            </label>
                          </div>
                        )}
                      </div>

                      {/* Notas adicionales */}
                      <div className="space-y-4">
                        <div className="flex items-center gap-2 text-[#0f172a] text-left">
                          <MessageSquare size={18} className="text-[var(--champagne)]" />
                          <h3 className="text-xs font-bold uppercase tracking-widest">¿Algo más que debamos saber?</h3>
                        </div>
                        <div className="relative">
                          <textarea
                            value={notes}
                            onChange={(e) => setNotes(e.target.value.slice(0, 200))}
                            placeholder="Alergias, sensibilidades, referencias adicionales..."
                            className="w-full h-16 bg-white border border-[#d9c08f]/15 rounded-xl p-3 text-xs text-[#0f172a] placeholder-[#94a3b8] focus:outline-none focus:border-[var(--champagne)]/40 focus:bg-white transition-all resize-none pr-12 text-left"
                          />
                          <span className="absolute bottom-2.5 right-3 text-[9px] font-bold text-[#cbd5e1]">
                            {notes.length}/200
                          </span>
                        </div>
                      </div>
                    </div>
                    )}

                  </div>
                  );
                })()}

                {/* STEP 5: Confirmation & Cierre Mágico (Registration) */}
                {step === 5 && (
                  <div className="space-y-6 w-full animate-fade-in">
                    {/* PREMIUM BOOKING SUMMARY CARD (Mobile/Tablet Only) */}
                    <div className="relative rounded-3xl overflow-hidden shadow-[0_10px_30px_rgba(0,0,0,0.06)] animate-fade-in lg:hidden" style={{
                      border: '1px solid rgba(17, 17, 17,0.2)',
                      boxShadow: '0 8px 40px rgba(0,0,0,0.07), 0 0 0 1px rgba(17, 17, 17,0.08)'
                    }}>
                      {/* Premium Header: Barber Avatar + Details */}
                      <div className="relative p-5 bg-white border-b border-[#d9c08f]/15 flex items-center justify-between gap-4 overflow-hidden">
                        {/* Ambient glow in header */}
                        <div className="absolute top-0 left-0 w-32 h-32 rounded-full" style={{background: 'radial-gradient(circle, rgba(17, 17, 17,0.08) 0%, transparent 70%)'}} />
                        
                        <div className="flex items-center gap-4 relative z-10">
                          {/* Barber Portrait Avatar */}
                          <div className="w-20 h-20 rounded-2xl overflow-hidden border border-[#111111]/30 shadow-[0_6px_20px_rgba(0,0,0,0.06)] flex-shrink-0 bg-white">
                            {selectedBarber?.image_url ? (
                              <img src={selectedBarber.image_url} alt={selectedBarber.name} className="w-full h-full object-cover object-top" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center" style={{
                                background: 'var(--bg-secondary)'
                              }}>
                                <User size={24} className="text-[#111111]" />
                              </div>
                            )}
                          </div>
                          
                          <div>
                            <p className="text-[9px] font-black tracking-[0.2em] uppercase text-[#94a3b8] mb-1">Tu especialista</p>
                            <h3 className="text-lg font-black text-[#0f172a] leading-none">{selectedBarber?.name}</h3>
                          </div>
                        </div>

                        {/* Price */}
                        <div className="flex flex-col items-end relative z-10">
                          <span className="text-[8px] font-bold text-[#94a3b8] uppercase tracking-wider mb-0.5">Total</span>
                          <span className="text-2xl font-black leading-none" style={{
                            background: 'linear-gradient(135deg, #111111, #e8d5b7)',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent'
                          }}>${selectedService?.price}</span>
                        </div>
                      </div>

                      {/* Content section */}
                      <div className="p-4 space-y-2.5" style={{background: 'var(--bg-secondary)'}}>
                        
                        {/* Service chip — champagne */}
                        <div className="flex items-center gap-3 p-3 rounded-2xl" style={{
                          background: 'rgba(17, 17, 17,0.06)',
                          border: '1px solid rgba(17, 17, 17,0.14)'
                        }}>
                          <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0" style={{background: 'rgba(17, 17, 17,0.12)'}}>
                            <Scissors size={14} style={{color: '#111111'}} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-[8px] font-black uppercase tracking-widest" style={{color: 'rgba(17, 17, 17,0.55)'}}>Servicio</p>
                            <p className="text-sm font-extrabold text-[#0f172a] truncate">{selectedService?.name}</p>
                          </div>
                        </div>

                        {/* Date & Time chip — champagne slightly lighter */}
                        <div className="flex items-center gap-3 p-3 rounded-2xl" style={{
                          background: 'rgba(17, 17, 17,0.04)',
                          border: '1px solid rgba(17, 17, 17,0.10)'
                        }}>
                          <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0" style={{background: 'rgba(17, 17, 17,0.10)'}}>
                            <CalendarIcon size={14} style={{color: '#111111'}} />
                          </div>
                          <div className="flex-1">
                            <p className="text-[8px] font-black uppercase tracking-widest" style={{color: 'rgba(17, 17, 17,0.55)'}}>Fecha y Hora</p>
                            <p className="text-sm font-extrabold text-[#0f172a]">
                              {selectedDate?.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' })}
                              <span className="mx-1.5 text-[#cbd5e1]">·</span>
                              <span style={{color: '#111111'}}>{formatTime12(selectedTime)}</span>
                            </p>
                          </div>
                        </div>

                        {/* Beverage chip — champagne darkest */}
                        {selectedBeverage && (
                          <div className="flex items-center gap-3 p-3 rounded-2xl" style={{
                            background: 'rgba(17, 17, 17,0.06)',
                            border: '1px solid rgba(17, 17, 17,0.14)'
                          }}>
                            <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0" style={{background: 'rgba(17, 17, 17,0.10)'}}>
                              {renderBeverageIcon(selectedBeverage, 14, '')}
                            </div>
                            <div className="flex-1">
                              <p className="text-[8px] font-black uppercase tracking-widest" style={{color: 'rgba(17, 17, 17,0.55)'}}>Tu Cortesía</p>
                              <p className="text-sm font-extrabold text-[#0f172a]">{selectedBeverage}</p>
                            </div>
                            <span className="text-[9px] font-black px-2.5 py-1 rounded-full" style={{
                              background: 'rgba(17, 17, 17,0.1)',
                              color: 'rgba(17, 17, 17,0.85)',
                              border: '1px solid rgba(17, 17, 17,0.2)'
                            }}>Gratis</span>
                          </div>
                        )}

                        {/* Shimmer divider */}
                        <div className="h-px w-full" style={{background: 'linear-gradient(90deg, transparent, rgba(17, 17, 17,0.25), transparent)'}} />

                        {/* Confirmed indicator */}
                        <div className="flex items-center justify-center gap-2 py-0.5">
                          <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{background: '#111111'}} />
                          <span className="text-[10px] font-bold tracking-wider" style={{color: 'rgba(17, 17, 17,0.45)'}}>Todo listo para confirmar</span>
                        </div>
                      </div>
                    </div>

                    {/* Desktop Message for Logged In Users */}
                    {isLoggedIn && (
                      <div className="hidden lg:flex flex-col items-center justify-center p-8 rounded-3xl border border-[#d9c08f]/15 bg-white text-center animate-fade-in mt-4">
                        <div className="w-16 h-16 rounded-full bg-[var(--champagne)]/10 flex items-center justify-center mb-4">
                          <Check size={24} className="text-[var(--champagne)]" />
                        </div>
                         <h3 className="text-[#0f172a] font-bold text-lg mb-2">Todo listo, {loggedInClient?.name?.split(' ')[0] || 'paciente'}</h3>
                        <p className="text-[#94a3b8] text-sm max-w-[250px]">
                          Revisa los detalles en el panel derecho y haz clic en Confirmar Reserva para terminar.
                        </p>
                      </div>
                    )}

                    {!isLoggedIn && (
                      <div className="bg-white md:backdrop-blur-md backdrop-blur-sm border border-[#d9c08f]/15 rounded-3xl p-6 space-y-6 shadow-[0_10px_30px_rgba(0,0,0,0.06)]">
                        <div className="text-center space-y-1">
                          <h4 className="font-bold text-[#0f172a] text-lg tracking-tight">Cierre Mágico</h4>
                          <p className="text-xs text-[#94a3b8]">Agenda tu cita y crea tu perfil express en un paso.</p>
                        </div>

                        <button
                          type="button"
                          onClick={handleGoogleLogin}
                          className="w-full py-3.5 px-4 rounded-full border border-[#d9c08f]/20 bg-[#f7f7f5] hover:bg-[#d9c08f]/10 text-[#0f172a] font-bold text-xs flex items-center justify-center gap-2.5 transition-all duration-300 hover:scale-[1.01] hover:border-[#d9c08f]/40 active:scale-[0.99] cursor-pointer shadow-[0_4px_16px_rgba(0,0,0,0.05)]"
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24">
                            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
                            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                          </svg>
                          Conectar con Google
                        </button>

                        <div className="flex items-center gap-4 py-1">
                          <div className="h-px bg-[#e9eae8] flex-1"></div>
                          <span className="text-[9px] uppercase font-black tracking-widest text-[#94a3b8]">o completa tus datos</span>
                          <div className="h-px bg-[#e9eae8] flex-1"></div>
                        </div>

                        <div className="flex p-1 rounded-xl bg-white border border-[#d9c08f]/15">
                          <button
                            type="button"
                            onClick={() => { setAuthTab('register'); setAuthError(''); }}
                            className={`flex-1 py-2.5 rounded-lg text-xs font-black transition-all duration-300 cursor-pointer ${authTab === 'register' ? 'bg-[var(--champagne)] text-black shadow-[0_4px_16px_rgba(0,0,0,0.05)]' : 'text-[#94a3b8] hover:text-[#0f172a]'}`}
                          >
                            Registro Rápido
                          </button>
                          <button
                            type="button"
                            onClick={() => { setAuthTab('login'); setAuthError(''); }}
                            className={`flex-1 py-2.5 rounded-lg text-xs font-black transition-all duration-300 cursor-pointer ${authTab === 'login' ? 'bg-[var(--champagne)] text-black shadow-[0_4px_16px_rgba(0,0,0,0.05)]' : 'text-[#94a3b8] hover:text-[#0f172a]'}`}
                          >
                            Tengo Cuenta
                          </button>
                        </div>

                        {authError && (
                          <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-xs p-3 rounded-xl text-left">
                            {authError}
                          </div>
                        )}

                        {authTab === 'register' ? (
                          <form onSubmit={handleCheckout} className="space-y-4 text-left">
                            <div className="grid grid-cols-2 gap-3">
                              <div className="space-y-1">
                                <label className="text-[10px] font-extrabold text-[#64748b] uppercase tracking-widest">Nombre</label>
                                <input
                                  type="text"
                                  value={authForm.name}
                                  onChange={(e) => setAuthForm({ ...authForm, name: e.target.value })}
                                  className="w-full bg-white border border-[#d9c08f]/15 rounded-xl px-4 py-3 text-xs text-[#0f172a] focus:border-[var(--champagne)] focus:bg-white focus:shadow-[0_0_12px_rgba(17, 17, 17,0.1)] transition-all duration-200 outline-none"
                                  placeholder="Juan"
                                  required
                                />
                              </div>
                              <div className="space-y-1">
                                <label className="text-[10px] font-extrabold text-[#64748b] uppercase tracking-widest">Apellido</label>
                                <input
                                  type="text"
                                  value={authForm.lastname}
                                  onChange={(e) => setAuthForm({ ...authForm, lastname: e.target.value })}
                                  className="w-full bg-white border border-[#d9c08f]/15 rounded-xl px-4 py-3 text-xs text-[#0f172a] focus:border-[var(--champagne)] focus:bg-white focus:shadow-[0_0_12px_rgba(17, 17, 17,0.1)] transition-all duration-200 outline-none"
                                  placeholder="Pérez"
                                  required
                                />
                              </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                              <div className="space-y-1">
                                <label className="text-[10px] font-extrabold text-[#64748b] uppercase tracking-widest">Teléfono</label>
                                <input
                                  type="tel"
                                  value={authForm.phone}
                                  onChange={(e) => setAuthForm({ ...authForm, phone: e.target.value })}
                                  className="w-full bg-white border border-[#d9c08f]/15 rounded-xl px-4 py-3 text-xs text-[#0f172a] focus:border-[var(--champagne)] focus:bg-white focus:shadow-[0_0_12px_rgba(17, 17, 17,0.1)] transition-all duration-200 outline-none"
                                  placeholder="04121234567"
                                  required
                                />
                              </div>
                              <div className="space-y-1">
                                <label className="text-[10px] font-extrabold text-[#64748b] uppercase tracking-widest">Cédula</label>
                                <input
                                  type="text"
                                  value={authForm.id_card}
                                  onChange={(e) => setAuthForm({ ...authForm, id_card: e.target.value })}
                                  className="w-full bg-white border border-[#d9c08f]/15 rounded-xl px-4 py-3 text-xs text-[#0f172a] focus:border-[var(--champagne)] focus:bg-white focus:shadow-[0_0_12px_rgba(17, 17, 17,0.1)] transition-all duration-200 outline-none"
                                  placeholder="V-12345678"
                                  required
                                />
                              </div>
                            </div>

                            <div className="space-y-1">
                              <label className="text-[10px] font-extrabold text-[#64748b] uppercase tracking-widest">Email (Opcional)</label>
                              <input
                                type="email"
                                value={authForm.email}
                                onChange={(e) => setAuthForm({ ...authForm, email: e.target.value })}
                                className="w-full bg-white border border-[#d9c08f]/15 rounded-xl px-4 py-3 text-xs text-[#0f172a] focus:border-[var(--champagne)] focus:bg-white focus:shadow-[0_0_12px_rgba(17, 17, 17,0.1)] transition-all duration-200 outline-none"
                                placeholder="juan@ejemplo.com"
                                autoComplete="off"
                              />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                              <div className="space-y-1">
                                <label className="text-[10px] font-extrabold text-[#64748b] uppercase tracking-widest">Fecha de Nacimiento</label>
                                <input
                                  type="text"
                                  inputMode="numeric"
                                  value={authForm.birth_date || ''}
                                  onChange={(e) => {
                                    let val = e.target.value.replace(/\D/g, '').slice(0, 8);
                                    if (val.length > 2) val = val.slice(0, 2) + '/' + val.slice(2);
                                    if (val.length > 5) val = val.slice(0, 5) + '/' + val.slice(5);
                                    setAuthForm({ ...authForm, birth_date: val });
                                  }}
                                  placeholder="DD/MM/AAAA"
                                  className="w-full bg-white border border-[#d9c08f]/15 rounded-xl px-3 text-xs text-[#0f172a] focus:border-[var(--champagne)] focus:bg-white focus:shadow-[0_0_12px_rgba(17, 17, 17,0.1)] transition-all duration-200 outline-none"
                                  style={{ height: '40px' }}
                                />
                              </div>
                              <div className="space-y-1">
                                <label className="text-[10px] font-extrabold text-[#64748b] uppercase tracking-widest">Contraseña</label>
                                <div className="relative">
                                  <input
                                    type={showPassword ? 'text' : 'password'}
                                    value={authForm.password}
                                    onChange={(e) => setAuthForm({ ...authForm, password: e.target.value })}
                                    className="w-full bg-white border border-[#d9c08f]/15 rounded-xl pl-4 pr-10 py-3 text-xs text-[#0f172a] focus:border-[var(--champagne)] focus:bg-white focus:shadow-[0_0_12px_rgba(17, 17, 17,0.1)] transition-all duration-200 outline-none"
                                    placeholder="••••••••"
                                    autoComplete="new-password"
                                    required
                                  />
                                  <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer transition-colors duration-200"
                                    style={{ color: showPassword ? 'var(--champagne)' : 'rgba(0,0,0,0.45)' }}
                                  >
                                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                  </button>
                                </div>
                              </div>
                            </div>

                            <button
                              type="submit"
                              disabled={submitting}
                              className="btn-gold w-full py-4 mt-3 rounded-full font-bold uppercase tracking-wider text-xs shadow-[0_4px_16px_rgba(0,0,0,0.05)] cursor-pointer haptic-bounce"
                            >
                              {submitting ? 'Agendando...' : 'Crear Cuenta & Confirmar'}
                            </button>
                          </form>
                        ) : (
                          <form onSubmit={handleCheckout} className="space-y-4 text-left">
                            <div className="space-y-1">
                              <label className="text-[10px] font-extrabold text-[#64748b] uppercase tracking-widest">Email o Teléfono</label>
                              <input
                                type="text"
                                value={loginForm.identifier}
                                onChange={(e) => setLoginForm({ ...loginForm, identifier: e.target.value })}
                                className="w-full bg-white border border-[#d9c08f]/15 rounded-xl px-4 py-3 text-xs text-[#0f172a] focus:border-[var(--champagne)] focus:bg-white focus:shadow-[0_0_12px_rgba(17, 17, 17,0.1)] transition-all duration-200 outline-none"
                                placeholder="juan@ejemplo.com o 0412..."
                                required
                              />
                            </div>

                            <div className="space-y-1">
                              <label className="text-[10px] font-extrabold text-[#64748b] uppercase tracking-widest">Contraseña</label>
                              <div className="relative">
                                <input
                                  type={showPassword ? 'text' : 'password'}
                                  value={loginForm.password}
                                  onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                                  className="w-full bg-white border border-[#d9c08f]/15 rounded-xl pl-4 pr-10 py-3 text-xs text-[#0f172a] focus:border-[var(--champagne)] focus:bg-white focus:shadow-[0_0_12px_rgba(17, 17, 17,0.1)] transition-all duration-200 outline-none"
                                  placeholder="Contraseña"
                                  required
                                />
                                <button
                                  type="button"
                                  onClick={() => setShowPassword(!showPassword)}
                                  className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer transition-colors duration-200"
                                  style={{ color: showPassword ? 'var(--champagne)' : 'rgba(0,0,0,0.45)' }}
                                >
                                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                </button>
                              </div>
                            </div>

                            <button
                              type="submit"
                              disabled={submitting}
                              className="btn-gold w-full py-4 mt-3 rounded-full font-bold uppercase tracking-wider text-xs shadow-[0_4px_16px_rgba(0,0,0,0.05)] cursor-pointer haptic-bounce"
                            >
                              {submitting ? 'Verificando...' : 'Iniciar Sesión & Confirmar'}
                            </button>
                          </form>
                        )}
                      </div>
                    )}
                  </div>
                )}

              </motion.div>
              </AnimatePresence>
            </div>

            {/* Footer Navigation Buttons — hidden when barber profile is expanded or when in Step 3 (which has its own button) */}
            <div ref={nextBtnRef} className={`mt-8 sm:mt-20 pb-10 ${(step === 2 && expandedBarber) || step === 3 ? 'hidden' : ''} ${isEmbedded ? 'xl:hidden' : 'lg:hidden'}`} style={{ scrollMarginBottom: isEmbedded ? '120px' : '40px' }}>
              {step < 5 ? (
                <button
                  onClick={(e) => { 
                    createRipple(e); 
                    if (canNext()) { 
                      if (step === 1 && selectedBarber) {
                        setStep(3);
                      } else {
                        setStep(step + 1); 
                      }
                      scrollToTop(); 
                    } 
                  }}
                  disabled={!canNext()}
                  className={`w-full py-4 px-6 rounded-full font-bold text-sm uppercase tracking-wider flex items-center justify-center gap-2 transition-all haptic-bounce ripple-container ${
                    canNext() 
                      ? 'btn-gold shadow-[0_4px_16px_rgba(0,0,0,0.05)] cursor-pointer' 
                      : 'bg-[#f7f7f5] border border-[#d9c08f]/15 text-[#94a3b8] cursor-not-allowed'
                  }`}
                >
                  Siguiente <ChevronRight size={18} />
                </button>
              ) : isLoggedIn ? (
                <button
                  onClick={(e) => { createRipple(e); handleCheckout(); }}
                  disabled={submitting}
                  className="btn-gold w-full py-4 px-6 rounded-full font-bold uppercase tracking-wider text-sm shadow-[var(--shadow-glow-gold)] cursor-pointer haptic-bounce ripple-container"
                >
                  {submitting ? 'Agendando...' : 'Confirmar Reserva'}
                </button>
              ) : null}
            </div>

            </div>
            {/* Right column on desktop: live booking summary. Hidden below lg (still in the
                DOM but display:none — harmless) and skipped entirely for the expanded barber
                profile, which already has its own wide multi-column layout. */}
            {!(step === 2 && expandedBarber) && (() => {
              const barberLabel = 'Especialista';
              const timeline = [
                { key: 'service', label: 'Servicio', icon: Scissors, done: !!selectedService, value: selectedService?.name, activeAt: 1 },
                { key: 'barber', label: barberLabel, icon: User, done: !!selectedBarber, value: selectedBarber?.name, activeAt: 2 },
                { key: 'datetime', label: 'Fecha y hora', icon: CalendarIcon, done: !!(selectedDate && selectedTime), value: selectedDate && selectedTime ? `${selectedDate.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' })} · ${formatTime12(selectedTime)}` : null, activeAt: 3 },
                { key: 'beverage', label: 'Cortesía', icon: Coffee, done: !!selectedBeverage, value: selectedBeverage, activeAt: 4 },
                { key: 'confirm', label: 'Confirmación', icon: Check, done: step === 5 && success, value: null, activeAt: 5 },
              ];
              return (
              <aside className={`${isEmbedded ? 'hidden xl:block' : 'hidden lg:block'} sticky top-14 self-start`}>
                <div className="relative rounded-3xl overflow-hidden" style={{
                  border: '1px solid rgba(17, 17, 17,0.16)',
                  background: 'var(--bg-secondary)',
                  boxShadow: '0 12px 48px rgba(0,0,0,0.07), 0 0 0 1px rgba(17, 17, 17,0.06)'
                }}>
                  {/* Ambient glow orbs, same language as the rest of the site */}
                  <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(17, 17, 17,0.14) 0%, transparent 70%)' }} />
                  <div className="absolute bottom-24 -left-10 w-32 h-32 rounded-full pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(17, 17, 17,0.08) 0%, transparent 70%)' }} />

                  {/* Barber portrait hero */}
                  <div className="relative h-48 overflow-hidden">
                    <AnimatePresence mode="wait">
                      {selectedBarber ? (
                        <motion.div
                          key={selectedBarber.id || selectedBarber.name}
                          initial={{ opacity: 0, scale: 1.06 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0 }}
                          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                          className="absolute inset-0"
                        >
                          {selectedBarber.image_url ? (
                            <img
                              src={selectedBarber.image_url}
                              alt={selectedBarber.name}
                              className="w-full h-full object-cover"
                              style={{
                                objectPosition: `center ${getPhotoAdjustment(selectedBarber.id).y}%`,
                                transform: `scale(${getPhotoAdjustment(selectedBarber.id).zoom})`,
                                transformOrigin: 'center top',
                                transition: 'object-position 0.15s ease-out, transform 0.15s ease-out'
                              }}
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center" style={{ background: 'var(--bg-secondary)' }}>
                              <User size={40} style={{ color: 'rgba(17, 17, 17,0.4)' }} />
                            </div>
                          )}
                          <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, rgba(10,10,14,0) 30%, rgba(10,10,14,0.95) 100%)' }} />
                        </motion.div>
                      ) : (
                        <motion.div
                          key="empty-hero"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          className="absolute inset-0 flex flex-col items-center justify-center gap-2"
                          style={{ background: 'var(--bg-secondary)' }}
                        >
                          <Crown size={26} style={{ color: 'rgba(17, 17, 17,0.35)' }} />
                           <span className="text-[10px] font-bold tracking-widest uppercase" style={{ color: 'rgba(17, 17, 17,0.3)' }}>Centro Odontológico Dientes Sanos</span>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    <div className="relative z-10 h-full flex flex-col justify-between p-5">
                      <div className="flex items-center justify-between">
                        <span className="text-[9px] font-black tracking-[0.22em] uppercase px-2.5 py-1 rounded-full backdrop-blur-sm" style={{ background: 'var(--bg-secondary)', color: 'var(--champagne)', border: '1px solid rgba(17, 17, 17,0.25)' }}>
                          Paso {step} de 5
                        </span>
                        <div className="flex items-center gap-1.5">
                          {(step > 1 || selectedService) && (
                            <button
                              type="button"
                              onClick={handleRestartBooking}
                              className="flex items-center gap-1.5 px-2 py-1 rounded-full hover:bg-white/5 transition-all text-white/40 hover:text-white/80 cursor-pointer group"
                            >
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="group-hover:-rotate-180 transition-transform duration-500"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>
                              <span className="text-[9px] font-bold tracking-widest uppercase">Reiniciar</span>
                            </button>
                          )}
                        </div>
                      </div>
                      {selectedBarber && (
                        <div>
                          <p className="text-[9px] font-black tracking-widest uppercase mb-0.5" style={{ color: 'rgba(17, 17, 17,0.75)' }}>{barberLabel}</p>
                          <h3 className="text-xl font-black text-white leading-none drop-shadow-lg">{selectedBarber.name}</h3>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Vertical timeline of the 5 steps */}
                  <div className="relative px-5 pt-4 pb-2">
                    {timeline.map((item, idx) => {
                      const isCurrent = step === item.activeAt;
                      const Icon = item.icon;
                      return (
                        <div key={item.key} className="relative flex gap-3 pb-3 last:pb-0">
                          {idx < timeline.length - 1 && (
                            <div className="absolute left-[15px] top-8 bottom-0 w-px" style={{
                              background: item.done ? 'linear-gradient(180deg, rgba(17, 17, 17,0.4), rgba(17, 17, 17,0.1))' : 'rgba(0,0,0,0.07)'
                            }} />
                          )}
                          <div className="relative z-10 flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300" style={{
                            background: item.done ? 'linear-gradient(135deg, #e8d4b0, #a8936b)' : isCurrent ? 'rgba(17, 17, 17,0.12)' : 'rgba(0,0,0,0.04)',
                            border: isCurrent && !item.done ? '1px solid rgba(17, 17, 17,0.5)' : '1px solid transparent',
                            boxShadow: isCurrent ? '0 0 0 4px rgba(17, 17, 17,0.08)' : 'none'
                          }}>
                            {item.done ? (
                              <Check size={14} className="text-black" strokeWidth={3} />
                            ) : (
                              <Icon size={13} style={{ color: isCurrent ? 'var(--champagne)' : 'rgba(0,0,0,0.3)' }} />
                            )}
                          </div>
                          <div className="flex-1 min-w-0 pt-1">
                            <p className="text-[9px] font-black uppercase tracking-widest" style={{ color: item.done || isCurrent ? 'rgba(17, 17, 17,0.65)' : 'rgba(0,0,0,0.3)' }}>
                              {item.label}
                            </p>
                            <AnimatePresence mode="wait">
                              <motion.p
                                key={item.value || 'pending'}
                                initial={{ opacity: 0, y: -4 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.3 }}
                                className={`text-sm font-extrabold leading-snug truncate ${item.value ? 'text-[#0f172a]' : 'text-[#cbd5e1] font-medium'}`}
                              >
                                {item.value || (isCurrent ? 'Eligiendo ahora…' : 'Pendiente')}
                              </motion.p>
                            </AnimatePresence>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Notes, if any */}
                  {notes && notes.trim() && (
                    <div className="mx-5 mb-4 p-3 rounded-2xl" style={{ background: 'rgba(0,0,0,0.03)', border: '1px solid rgba(0,0,0,0.06)' }}>
                      <p className="text-[8px] font-black uppercase tracking-widest text-[#94a3b8] mb-1">Notas</p>
                      <p className="text-[11px] text-[#64748b] leading-relaxed line-clamp-3">{notes}</p>
                    </div>
                  )}

                  {/* Total + trust line */}
                  <div className="px-5 pb-4 pt-2" style={{ borderTop: '1px solid rgba(0,0,0,0.06)' }}>
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-[10px] font-bold text-[#94a3b8] uppercase tracking-wider">Total</span>
                      <span className="text-2xl font-black" style={{
                        background: selectedService?.price != null ? 'linear-gradient(135deg, #111111, #e8d5b7)' : 'none',
                        WebkitBackgroundClip: selectedService?.price != null ? 'text' : 'unset',
                        WebkitTextFillColor: selectedService?.price != null ? 'transparent' : 'unset',
                        color: selectedService?.price != null ? undefined : 'rgba(0,0,0,0.2)'
                      }}>
                        {selectedService?.price != null ? `$${selectedService.price}` : '—'}
                      </span>
                    </div>

                    {/* Siguiente / Confirmar button on desktop sidebar */}
                    <div className={`${(step === 2 && expandedBarber) ? 'hidden' : ''}`}>
                      {step < 5 ? (
                        <button
                          onClick={(e) => { 
                            createRipple(e); 
                            if (canNext()) { 
                              if (step === 1 && selectedBarber) {
                                setStep(3);
                              } else {
                                setStep(step + 1); 
                              }
                              scrollToTop(); 
                            } 
                          }}
                          disabled={!canNext()}
                          className={`w-full py-3.5 px-6 rounded-xl font-bold text-[13px] uppercase tracking-wider flex items-center justify-center gap-2 transition-all haptic-bounce ripple-container ${
                            canNext() 
                              ? 'bg-[var(--champagne)] text-black shadow-[0_4px_16px_rgba(0,0,0,0.05)] cursor-pointer hover:brightness-110' 
                              : 'bg-[#f7f7f5] border border-[#d9c08f]/15 text-[#94a3b8] cursor-not-allowed'
                          }`}
                        >
                          Siguiente <ChevronRight size={16} strokeWidth={3} />
                        </button>
                      ) : isLoggedIn ? (
                        <button
                          onClick={(e) => { createRipple(e); handleCheckout(); }}
                          disabled={submitting}
                          className="bg-[var(--champagne)] text-black w-full py-3.5 px-6 rounded-xl font-bold uppercase tracking-wider text-[13px] shadow-[var(--shadow-glow-gold)] cursor-pointer haptic-bounce ripple-container hover:brightness-110"
                        >
                          {submitting ? 'Agendando...' : 'Confirmar Reserva'}
                        </button>
                      ) : null}
                    </div>

                    <div className="flex items-center justify-center gap-1.5 text-center mt-2.5">
                      <span className="text-[10px] font-medium text-[#94a3b8]">Confirmación instantánea al finalizar</span>
                    </div>
                  </div>
                </div>
              </aside>
              );
            })()}
          </div>
        )}

      </div>

      {/* Lightbox Overlay for Recent Works */}
      {activeLightboxImage && (
        <div 
          className="fixed inset-0 bg-black/95 z-[99999] flex items-center justify-center p-4 transition-all duration-300 animate-fade-in"
          onClick={() => setActiveLightboxImage(null)}
        >
          <button 
            className="absolute right-6 w-12 h-12 bg-white/10 hover:bg-white/20 active:scale-95 transition-all rounded-full flex items-center justify-center text-white border border-white/10 cursor-pointer"
            style={{ top: 'calc(max(env(safe-area-inset-top, 0px), 24px))' }}
            onClick={() => setActiveLightboxImage(null)}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6L6 18M6 6l12 12"/></svg>
          </button>
          <div 
            className="relative max-w-full max-h-[85vh] aspect-[3/4] rounded-3xl overflow-hidden border border-[#d9c08f]/20 shadow-2xl animate-scale-in"
            onClick={(e) => e.stopPropagation()}
          >
            <img 
              src={activeLightboxImage} 
              alt="Recent Work" 
              className="w-full h-full object-cover" 
            />
          </div>
        </div>
      )}

      {/* INLINE EDIT MODAL */}
      {showInlineEdit && (
        <div 
          className={`fixed inset-0 z-[99999] flex items-end sm:items-center justify-center p-4 bg-black/80 md:backdrop-blur-md backdrop-blur-sm transition-all duration-300 ${
            isInlineEditOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
          }`} 
          style={{fontFamily: 'Outfit, sans-serif'}}
        >
          <div 
            className={`w-full max-w-md bg-[#e9eae8] border border-[#d9c08f]/20 rounded-t-3xl sm:rounded-3xl p-6 shadow-[0_10px_30px_rgba(0,0,0,0.06)] relative overflow-hidden transition-all duration-300 ${
              isInlineEditOpen ? 'translate-y-0 opacity-100 scale-100' : 'translate-y-12 opacity-0 scale-95'
            }`}
            style={{transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)'}}
          >
            <div className="absolute top-0 left-0 right-0 h-1 bg-[var(--champagne)]/20" />
            
            {/* Header */}
            <div className="flex justify-between items-center mb-5">
              <h3 className="text-xs font-black uppercase tracking-widest text-[#0f172a]">Editar Reserva</h3>
              <button 
                type="button" 
                onClick={handleCloseInlineEdit}
                className="text-[#94a3b8] hover:text-[#0f172a] text-[10px] font-bold px-3 py-1.5 rounded-full bg-[#f7f7f5] border border-[#d9c08f]/15 cursor-pointer"
              >
                Cerrar
              </button>
            </div>
            
            {/* Unified Inline Content */}
            <div className="space-y-5">
              
              {/* 1. Especialistas Section - Horizontal Scroll */}
              <div>
                <p className="text-[9px] font-black uppercase tracking-widest text-[#94a3b8] mb-2.5">Especialista</p>
                <div className="flex gap-2.5 overflow-x-auto pb-1.5 -mx-1 px-1 scrollbar-none">
                  {barbers.map((b) => {
                    const isSelected = selectedBarber?.id === b.id;
                    return (
                      <button
                        key={b.id}
                        type="button"
                        onClick={() => setSelectedBarber(b)}
                        className={`flex-shrink-0 flex flex-col items-center gap-1.5 p-2 rounded-xl border transition-all cursor-pointer w-20 text-center ${
                          isSelected
                            ? 'border-[var(--champagne)] bg-[rgba(17, 17, 17,0.08)]'
                            : 'border-[#d9c08f]/15 bg-white hover:bg-white'
                        }`}
                      >
                        <div className="relative">
                          <BarberAvatar url={b.image_url} name={b.name} />
                          {isSelected && (
                            <div className="absolute -bottom-1 -right-1 w-4.5 h-4.5 rounded-full bg-[var(--champagne)] text-black flex items-center justify-center text-[8px] font-black border border-[#e9eae8]">
                              ✓
                            </div>
                          )}
                        </div>
                        <span className="text-[10px] font-bold text-[#0f172a] truncate w-full">{b.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 2. Servicios Section - Two Column Grid */}
              <div>
                <p className="text-[9px] font-black uppercase tracking-widest text-[#94a3b8] mb-2.5">Servicio</p>
                <div className="max-h-60 overflow-y-auto grid grid-cols-2 gap-2 pr-1">
                  {services.map((s) => {
                    const isSelected = selectedService?.id === s.id;
                    return (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => setSelectedService(s)}
                        className={`w-full flex flex-col justify-between p-3 rounded-2xl border transition-all text-left cursor-pointer relative h-22 ${
                          isSelected
                            ? 'border-[var(--champagne)] bg-[rgba(17, 17, 17,0.06)] shadow-[0_0_12px_rgba(17, 17, 17,0.1)]'
                            : 'border-[#d9c08f]/15 bg-white hover:bg-white'
                        }`}
                      >
                        {/* Selection Check Circle */}
                        <div className={`absolute top-2.5 right-2.5 w-4.5 h-4.5 rounded-full flex items-center justify-center text-[8px] font-black transition-all duration-300 ${
                          isSelected 
                            ? 'bg-[var(--champagne)] text-black scale-100' 
                            : 'bg-white text-transparent border border-[#d9c08f]/20 scale-90'
                        }`}>
                          ✓
                        </div>

                        <div className="pr-4">
                          <p className="text-[11px] font-bold text-[#0f172a] leading-tight line-clamp-2">{s.name}</p>
                          <p className="text-[9px] text-[#94a3b8] mt-1">{formatDuration(s.duration)}</p>
                        </div>
                        
                        <div className="mt-1.5 flex items-center justify-between">
                          <span className="text-xs font-black text-[var(--champagne)]">${s.price}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

            </div>
            
            {/* Done Button */}
            <button
              type="button"
              onClick={handleCloseInlineEdit}
              className="w-full mt-5 py-3 rounded-xl font-bold text-xs uppercase tracking-wider bg-[var(--champagne)] text-black hover:bg-[#b8a283] transition-all cursor-pointer text-center"
            >
              Listo
            </button>
          </div>
        </div>
      )}

      {/* Toast Alert for Share & Favorites */}
      {toast && (
        <div className="fixed bottom-28 left-1/2 -translate-x-1/2 z-[999999] bg-white border border-[#d9c08f]/20 text-[#0f172a] px-4 py-2.5 rounded-full shadow-[0_4px_20px_rgba(0,0,0,0.06)] text-[11px] font-semibold flex items-center gap-3 backdrop-blur-xl animate-scale-in tracking-wide border-t border-[#d9c08f]/20">
          {toast.type === 'success' && (
            <svg className="text-[var(--champagne)] animate-pulse" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
          )}
          {toast.type === 'favorite' && (
            <svg className="text-red-500 animate-pulse" width="14" height="14" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
          )}
          {toast.type === 'unfavorite' && (
            <svg className="text-[#94a3b8]" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
          )}
          <span className="opacity-95 leading-none pr-1">{toast.text}</span>
        </div>
      )}

      {/* EXPERIENCE MODAL */}
      <div 
        className={`fixed inset-0 z-[999999] flex items-center justify-center p-4 transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] ${
          showExperienceModal 
            ? 'opacity-100 pointer-events-auto backdrop-blur-xl bg-black/70' 
            : 'opacity-0 pointer-events-none backdrop-blur-none bg-transparent'
        }`}
      >
        <div 
          className={`relative w-full max-w-xl bg-white border border-[#d9c08f]/20 rounded-3xl shadow-[0_4px_20px_rgba(0,0,0,0.05)] p-6 md:p-8 flex flex-col gap-6 transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] transform ${
            showExperienceModal 
              ? 'opacity-100 scale-100 translate-y-0' 
              : 'opacity-0 scale-95 translate-y-4'
          }`}
        >
          
          {/* Header */}
          <div className="flex items-center justify-between border-b border-[#d9c08f]/15 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-white border border-[#d9c08f]/20 flex items-center justify-center text-[#111111]">
                <Sparkles size={18} />
              </div>
              <div>
                <h3 className="text-lg md:text-xl font-black text-[#111111] tracking-tight uppercase">EXPERIENCIA DIENTES SANOS</h3>
                <p className="text-[#94a3b8] text-[10px] md:text-xs font-bold tracking-wider uppercase">Salud, tecnología y cercanía en cada visita</p>
              </div>
            </div>
            
            {/* Close Button - Apple Style Circular Dismiss */}
            <button 
              onClick={() => setShowExperienceModal(false)}
              className="text-[#94a3b8] hover:text-[#0f172a] transition-colors w-8 h-8 rounded-full bg-[#f7f7f5] border border-[#d9c08f]/20 flex items-center justify-center cursor-pointer"
            >
              <X size={14} />
            </button>
          </div>

          {/* Media banner inside modal */}
          <div className="w-full h-44 md:h-56 rounded-2xl overflow-hidden relative border border-[#d9c08f]/15" style={{ background: 'linear-gradient(135deg,#f7f4ee 0%,#efe6d5 50%,#e8d4b0 100%)' }} />

          {/* Description details */}
          <div className="space-y-4 text-[#475569] text-xs md:text-sm leading-relaxed">
            <p>
               En <strong className="text-[#111111] font-semibold">Dientes Sanos</strong> cuidamos tu salud bucal con tecnología moderna y trato cercano. Cada tratamiento se diseña para que salgas sonriendo y con total confianza.
            </p>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div className="p-4 rounded-2xl bg-white border border-[#d9c08f]/15 flex gap-3 items-start">
                <div className="p-2 rounded-xl bg-white text-[#111111] mt-0.5 border border-[#d9c08f]/15">
                  <Coffee size={15} />
                </div>
                <div className="space-y-1">
                  <h4 className="text-[#0f172a] font-extrabold text-[11px] uppercase tracking-wider">Café de cortesía</h4>
                  <p className="text-[#475569] text-[10px] leading-normal">Café, infusiones y bebidas frías de cortesía en cada visita.</p>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-white border border-[#d9c08f]/15 flex gap-3 items-start">
                <div className="p-2 rounded-xl bg-white text-[#111111] mt-0.5 border border-[#d9c08f]/15">
                  <Users size={15} />
                </div>
                <div className="space-y-1">
                  <h4 className="text-[#0f172a] font-extrabold text-[11px] uppercase tracking-wider">Sala de espera</h4>
                  <p className="text-[#475569] text-[10px] leading-normal">Un espacio cómodo para que esperes tranquilo mientras llega tu turno.</p>
                </div>
              </div>
            </div>
          </div>

          {/* CTA action inside modal */}
          <div className="flex justify-end gap-3 border-t border-[#d9c08f]/15 pt-4 mt-2">
            <button 
              onClick={() => {
                setShowExperienceModal(false);
                handleStartBooking();
              }}
              className="btn-gold px-5 py-2.5 rounded-full text-[10px] uppercase tracking-widest font-extrabold flex items-center gap-1 cursor-pointer"
            >
              Reservar visita <span className="text-[12px]">→</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
