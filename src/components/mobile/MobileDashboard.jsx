import React, { useState, useEffect, lazy, Suspense } from 'react';
import { createPortal } from 'react-dom';
import { 
  Zap,
  TrendingUp,
  Scissors,
  User,
  Package,
  DollarSign,
  Users,
  Trophy,
  Crown,
  Calendar,
  ArrowUpRight,
  Target,
  Edit3,
  Gift,
  Cake,
  Rocket,
  Bell,
  X,
  MessageCircle,
  Sparkles,
  PartyPopper
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { notificationService } from '../../services/notificationService';
import { useNotifs } from '../../context/NotificationContext';
import { useScrollLock } from '../../hooks/useScrollLock';
import { motion, AnimatePresence } from 'framer-motion';
import { SkeletonList } from '../Skeleton';

const CheckoutPOS = lazy(() => import('../CheckoutPOS'));
const ReceptionModule = lazy(() => import('../ReceptionModule'));

const QUOTES = [
  { text: "Cada cabeza es un mundo.", creator: "Refrán Popular" },
  { text: "La grandeza nace de pequeños comienzos.", creator: "Sir Francis Drake" },
  { text: "La disciplina es el puente entre metas y logros.", creator: "Jim Rohn" },
  { text: "El estilo es una forma de decir quién eres sin hablar.", creator: "Rachel Zoe" },
  { text: "Invierte en tu imagen, es tu carta de presentación.", creator: "Negocios" },
  { text: "Cuidar tu sonrisa puede cambiar tu vida.", creator: "Arte Dientes Sanos" },
  { text: "La calidad atrae, el detalle retiene.", creator: "Estrategia" },
  { text: "No busques clientes, busca fans.", creator: "Crecimiento" },
  { text: "La odontología es el arte de cuidar sonrisas.", creator: "Mística Dientes Sanos" },
  { text: "El éxito es la suma de pequeños esfuerzos diarios.", creator: "Robert Collier" },
  { text: "Domina tu oficio, luego rompe las reglas.", creator: "Maestros" },
  { text: "Cada cliente es una oportunidad de crear una obra maestra.", creator: "Visión" },
  { text: "El mejor marketing es un cliente satisfecho.", creator: "Marketing" },
  { text: "Sé tan bueno que no puedan ignorarte.", creator: "Steve Martin" },
  { text: "Tu única competencia es la persona en el espejo.", creator: "Superación" },
  { text: "El negocio de la belleza es el negocio de la felicidad.", creator: "Emprendimiento" }
];

const MobileDashboard = ({ onOpenSale, stats, chartData, dbData, onNavigate, onOpenNotifications }) => {
  const { user } = useAuth();
  const { showToast } = useNotifs();
  const [quoteIndex, setQuoteIndex] = useState(0);
  const [isEditingGoals, setIsEditingGoals] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  
  // Modals for chairs
  const [checkoutChairModal, setCheckoutChairModal] = useState(null);
  const [showReceptionPopup, setShowReceptionPopup] = useState(false);
  const [selectedChair, setSelectedChair] = useState(null);

  const [goals, setGoals] = useState({
    daily: parseFloat(localStorage.getItem('panda_daily_goal') || '500'),
    weekly: parseFloat(localStorage.getItem('panda_weekly_goal') || '3000'),
    monthly: parseFloat(localStorage.getItem('panda_monthly_goal') || '12000')
  });

  const [whatsappModalData, setWhatsappModalData] = useState(null);
  const [editedPhone, setEditedPhone] = useState('');
  const [editedMessage, setEditedMessage] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Estado de sillas en tiempo real (carrusel deslizable, como en PC). Se traen las citas
  // "En Silla" y se refrescan cada 15s; el tiempo transcurrido se recalcula cada 30s.
  const [chairApps, setChairApps] = useState([]);
  const [chairNow, setChairNow] = useState(() => new Date());
  useEffect(() => {
    let alive = true;
    const load = async () => {
      try { const apps = await dataService.getAppointmentsByState(['En Silla']); if (alive) setChairApps(apps || []); }
      catch { /* mantener último */ }
    };
    load();
    const poll = setInterval(load, 15000);
    const tick = setInterval(() => setChairNow(new Date()), 30000);
    return () => { alive = false; clearInterval(poll); clearInterval(tick); };
  }, []);

  const chairs = React.useMemo(() => {
    const active = (chairApps || []).filter(a => a.status === 'En Silla');
    const out = [];
    for (let i = 1; i <= 7; i++) {
      const app = active[i - 1];
      if (!app) { out.push({ id: String(i).padStart(2, '0'), occupied: false }); continue; }
      const startedAt = app.started_at || app.created_at;
      let elapsed = '';
      if (startedAt) {
        const secs = Math.max(0, Math.floor((chairNow.getTime() - new Date(startedAt).getTime()) / 1000));
        elapsed = secs < 3600 ? `${Math.floor(secs / 60)} min` : `${Math.floor(secs / 3600)}h ${Math.floor((secs % 3600) / 60)}m`;
      }
      out.push({
        id: String(i).padStart(2, '0'),
        occupied: true,
        barber: app.staff?.name || app.staff_name || 'Odontólogo',
        avatar: app.staff?.image_url,
        client: app.clients?.name || app.client_name || 'Cliente',
        service: app.services?.name || 'Servicio',
        price: `$${app.total_price || app.services?.price || 0}`,
        elapsed,
        appointmentId: app.id,
        appId: app.id
      });
    }
    return out;
  }, [chairApps, chairNow]);

  useScrollLock(whatsappModalData !== null || isEditingGoals || checkoutChairModal !== null || showReceptionPopup);

  useEffect(() => {
    setQuoteIndex(Math.floor(Math.random() * QUOTES.length));

    const updateUnread = () => {
      const history = notificationService.getHistory();
      const count = history.filter(n => !n.read).length;
      setUnreadCount(count);
    };

    updateUnread();
    window.addEventListener('panda_new_notification', updateUnread);
    return () => window.removeEventListener('panda_new_notification', updateUnread);
  }, []);

  const handleSaveGoals = (newGoals) => {
    localStorage.setItem('panda_daily_goal', newGoals.daily);
    localStorage.setItem('panda_weekly_goal', newGoals.weekly);
    localStorage.setItem('panda_monthly_goal', newGoals.monthly);
    setGoals(newGoals);
    setIsEditingGoals(false);
  };

  const handleWhatsAppCongratulate = (person) => {
    let template = localStorage.getItem('panda_default_bday_message');
    const isCorrupted = !template || 
      template.includes('\uFFFD') || 
      template.includes('ï¿½') ||
      /[\uD800-\uDBFF](?![\uDC00-\uDFFF])|([^\uD800-\uDBFF]|^)[\uDC00-\uDFFF]/.test(template);
    if (isCorrupted) {
      template = `¡Hola {name}! ${String.fromCodePoint(0x1F389)} Te deseamos un muy feliz cumpleaños de parte de todo el equipo de Dientes Sanos. ${String.fromCodePoint(0x1F488)} ¡Que tengas un día excelente!`;
      localStorage.setItem('panda_default_bday_message', template);
    }
    const whatsappMsg = template.replace('{name}', person.name);
    setEditedPhone(person.phone || '');
    setEditedMessage(whatsappMsg);
    setWhatsappModalData(person);
  };

  const handleSendWhatsApp = async (isDirect = true) => {
    if (!whatsappModalData) return;

    const isRealClient = !whatsappModalData.isStaff && 
      !String(whatsappModalData.id).startsWith('staff-') && 
      !String(whatsappModalData.id).startsWith('client-');

    if (isRealClient && editedPhone !== (whatsappModalData.phone || '')) {
      setIsSaving(true);
      try {
        await dataService.updateClient(whatsappModalData.id, { phone: editedPhone });
      } catch (err) {
        console.error("Error al actualizar teléfono de cliente:", err);
      } finally {
        setIsSaving(false);
      }
    }

    let url;
    if (isDirect && editedPhone) {
      url = `https://wa.me/${editedPhone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(editedMessage)}`;
    } else {
      url = `https://wa.me/?text=${encodeURIComponent(editedMessage)}`;
    }

    window.open(url, '_blank');
    setWhatsappModalData(null);
  };

  const isBarber = user?.role === 'Barbero' || user?.role?.includes('Barbero|');
  const isAssistant = user?.role?.includes('Asistente de Lavado');
  const isAdmin = user?.role === 'Admin' || user?.role?.includes('Admin|');

  const myStats = ((isBarber || isAssistant) && dbData?.staff) 
    ? (dbData.staff.find(s => s.id === user.id)?.stats || { income: 0, appointments: 0 }) 
    : (stats || { income: 0, weeklyIncome: 0, monthlyIncome: 0, appointments: 0 });

  // Calculate dynamic top performing staff
  const getTopBarber = () => {
    if (!dbData?.staff || dbData.staff.length === 0) return { name: "Marco Silva", count: 12 };
    const barbers = dbData.staff.filter(s => {
      const r = s.role?.toLowerCase() || '';
      return (r.includes('barbero') || r.includes('barber')) && !r.includes('admin');
    });
    if (barbers.length === 0) return { name: "Marco Silva", count: 12 };
    const sorted = [...barbers].sort((a, b) => (b.stats?.income || 0) - (a.stats?.income || 0));
    return {
      name: sorted[0]?.name || "Marco Silva",
      income: sorted[0]?.stats?.income || 0,
      count: sorted[0]?.stats?.appointments || 3
    };
  };

  const topBarber = getTopBarber();

  // Get all active barbers for team overview (monthly income podium)
  const teamOverview = (dbData?.staff || [])
    .filter(s => {
      const r = s.role?.toLowerCase() || '';
      return (r.includes('barbero') || r.includes('barber')) && !r.includes('archived') && !r.includes('admin');
    })
    .sort((a, b) => (b.stats?.monthlyIncome || 0) - (a.stats?.monthlyIncome || 0));

  // Top Clientes (Limitado a los 10 mejores para no saturar la vista móvil al expandir)
  const topClients = (dbData?.clients || [])
    .sort((a, b) => (b.total_spent || 0) - (a.total_spent || 0))
    .slice(0, 10);

  // SVG Chart Calculation (Custom Glowing Line Chart)
  const lineValues = chartData?.datasets?.[0]?.data || [240, 350, 200, 380, 480, 520, 600];
  const maxVal = Math.max(...lineValues) || 100;
  const chartHeight = 120;
  
  const points = lineValues.map((val, idx) => {
    const x = 20 + idx * 45;
    const y = 130 - (val / maxVal) * chartHeight;
    return { x, y, val };
  });

  const pathD = points.reduce((acc, p, i) => {
    if (i === 0) return `M ${p.x} ${p.y}`;
    const prev = points[i - 1];
    return `${acc} C ${(prev.x + p.x) / 2} ${prev.y}, ${(prev.x + p.x) / 2} ${p.y}, ${p.x} ${p.y}`;
  }, '');

  const fillD = points.length > 0
    ? `${pathD} L ${points[points.length - 1].x} 150 L ${points[0].x} 150 Z`
    : '';

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  // Birthday Stats
  const today = new Date();
  const todayMonth = today.getMonth() + 1;
  const todayDay = today.getDate();

  const todaysBirthdays = (dbData?.clients || []).filter(c => {
    if (!c.birth_date) return false;
    const parts = c.birth_date.split('-');
    const m = parseInt(parts[1], 10);
    const d = parseInt(parts[2], 10);
    return m === todayMonth && d === todayDay;
  });

  const upcomingBirthdays = (dbData?.clients || [])
    .filter(c => {
      if (!c.birth_date) return false;
      const parts = c.birth_date.split('-');
      const m = parseInt(parts[1], 10);
      const d = parseInt(parts[2], 10);
      
      const bday = new Date(today.getFullYear(), m - 1, d);
      if (bday < today && !(m === todayMonth && d === todayDay)) {
        bday.setFullYear(today.getFullYear() + 1);
      }
      
      const diffTime = bday - today;
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      c.daysToBday = diffDays;
      c.bdayDateStr = `${d} de ${bday.toLocaleDateString([], { month: 'long' })}`;
      
      return diffDays > 0 && diffDays <= 15;
    })
    .sort((a, b) => a.daysToBday - b.daysToBday)
    .slice(0, 3);

  return (
    <div className="mobile-dashboard animate-fade-in" style={{ fontFamily: "'Inter', sans-serif", overflowX: 'hidden', position: 'relative' }}>
      
      {/* Hello Greeting Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <div style={{ fontSize: '11px', color: 'var(--gold-primary)', fontWeight: '900', letterSpacing: '1.5px', textTransform: 'uppercase' }}>BIENVENIDO A CASA</div>
          <div style={{ fontSize: '28px', fontWeight: '950', letterSpacing: '-1px', marginTop: '4px', color: '#ffffff' }}>
            Panel de <span className="text-gold">Control</span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          {/* Notification Bell */}
          <button
            onClick={onOpenNotifications}
            style={{
              width: '42px',
              height: '42px',
              borderRadius: '50%',
              border: '1.5px solid rgba(255, 255, 255, 0.1)',
              background: 'rgba(255, 255, 255, 0.03)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: unreadCount > 0 ? 'var(--gold-primary)' : 'white',
              position: 'relative',
              cursor: 'pointer',
              outline: 'none',
              padding: 0
            }}
          >
            <Bell size={18} />
            {unreadCount > 0 && (
              <div style={{
                position: 'absolute',
                top: '0px',
                right: '0px',
                backgroundColor: '#ff4d4d',
                color: 'white',
                fontSize: '8px',
                fontWeight: '900',
                borderRadius: '50%',
                minWidth: '13px',
                height: '13px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '0 2px',
                border: '1.5px solid var(--bg-primary)'
              }}>
                {unreadCount}
              </div>
            )}
          </button>

          {/* Crown */}
          <div style={{
            width: '42px',
            height: '42px',
            borderRadius: '50%',
            border: '1.5px solid var(--gold-primary)',
            background: 'rgba(255, 255, 255,0.15)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--gold-primary)'
          }}>
            <Crown size={20} />
          </div>
        </div>
      </div>

      {/* Estado de sillas — carrusel deslizable con el dedo (igual que en PC) */}
      <div style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '13px', fontWeight: '950', color: 'white', letterSpacing: '0.3px' }}>ESTADO DE ESTACIONES</span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '8.5px', fontWeight: '800', color: '#22c55e', background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.25)', borderRadius: '999px', padding: '2px 7px' }}>
              <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#22c55e' }} /> En tiempo real
            </span>
          </div>
          <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.35)', fontWeight: '700' }}>Desliza →</span>
        </div>

        <div className="panda-scrollbar" style={{ display: 'flex', gap: '16px', overflowX: 'auto', scrollSnapType: 'x mandatory', WebkitOverflowScrolling: 'touch', padding: '10px 20px 20px', margin: '0 -20px' }}>
          {chairs.map((chair, index) => {
            const isOccupied = chair.occupied || chair.status === 'En servicio' || chair.status === 'Reservada';
            const isAvailable = chair.status === 'Disponible';
            
            return (
            <div
              key={chair.id}
              onClick={() => {
                if (isOccupied) {
                  setCheckoutChairModal(chair);
                } else if (isAvailable || !chair.occupied) {
                  setShowReceptionPopup(true);
                  setSelectedChair(chair);
                }
              }}
              style={{
                flex: '0 0 auto', width: '75vw', maxWidth: '320px', scrollSnapAlign: 'center',
                backgroundColor: 'var(--bg-secondary)',
                border: `1.5px solid ${chair.occupied ? '#ef4444' : '#22c55e'}`,
                borderRadius: '24px', padding: '20px 16px',
                display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
                minHeight: '260px', position: 'relative', overflow: 'visible',
                boxShadow: chair.occupied ? '0 12px 35px -10px rgba(239, 68, 68, 0.25)' : 'none',
                marginLeft: index === 0 ? '20px' : '0',
                marginRight: index === chairs.length - 1 ? '20px' : '0',
                cursor: 'pointer'
              }}
            >
              {/* Fila superior: avatar/ID + barbero + estado */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', zIndex: 2 }}>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  {chair.occupied ? (
                    chair.avatar ? (
                      <img src={chair.avatar} alt={chair.barber} style={{ width: '48px', height: '48px', borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--champagne)', boxShadow: '0 0 16px rgba(17, 17, 17,0.6)' }} />
                    ) : (
                      <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'rgba(255,255,255,0.1)', border: '2px solid var(--champagne)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', fontWeight: '900', color: 'var(--champagne)' }}>
                        {chair.barber ? chair.barber.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() : ''}
                      </div>
                    )
                  ) : (
                    <span style={{ fontSize: '24px', fontWeight: '900', color: 'rgba(255,255,255,0.15)' }}>{chair.id}</span>
                  )}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '6px', textAlign: 'right' }}>
                  <span style={{ fontSize: '15px', fontWeight: '900', color: 'white', lineHeight: '1.1' }}>{chair.occupied ? chair.barber : `Sillón ${chair.id}`}</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: chair.occupied ? 'rgba(239, 68, 68, 0.1)' : 'rgba(34, 197, 94, 0.1)', padding: '4px 8px', borderRadius: '8px' }}>
                    <div style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: chair.occupied ? '#ef4444' : '#22c55e', boxShadow: chair.occupied ? '0 0 8px #ef4444' : '0 0 8px #22c55e' }} />
                    <span style={{ fontSize: '10px', fontWeight: '900', color: chair.occupied ? '#ef4444' : '#22c55e', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{chair.occupied ? 'En tratamiento' : 'Disponible'}</span>
                  </div>
                </div>
              </div>

              {/* Silla */}
              <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', pointerEvents: 'none', zIndex: 1 }}>
                <img
                  src="/barber-chair.png"
                  alt="Sillón"
                  style={{
                    height: '180px', width: 'auto', objectFit: 'contain',
                    transform: chair.occupied ? 'scale(1.15)' : 'scale(1.0)',
                    filter: chair.occupied ? 'drop-shadow(0 20px 30px rgba(0,0,0,0.95)) brightness(1.1)' : 'brightness(0.2) grayscale(0.8)',
                    transition: 'all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)'
                  }}
                />
              </div>

              {/* Sub-widget inferior */}
              <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', zIndex: 2, marginTop: '120px' }}>
                {chair.occupied ? (
                  <div style={{ background: 'var(--bg-secondary)', borderRadius: '14px', padding: '12px 16px', border: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', gap: '12px', backdropFilter: 'blur(12px)', boxShadow: '0 8px 20px rgba(0,0,0,0.5)' }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '14px', fontWeight: '900', color: 'white', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginBottom: '4px' }}>{chair.client}</div>
                      <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.7)', fontWeight: '600', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{chair.service}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '14px', fontWeight: '900', color: 'var(--champagne)', marginBottom: '4px' }}>{chair.price}</div>
                      <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.7)', fontWeight: '800' }}>{chair.elapsed}</div>
                    </div>
                  </div>
                ) : (
                  <div style={{ textAlign: 'center', fontSize: '12px', fontWeight: '800', color: 'rgba(255,255,255,0.3)', letterSpacing: '1px', textTransform: 'uppercase', padding: '16px 0', background: 'var(--bg-secondary)', borderRadius: '14px', backdropFilter: 'blur(4px)' }}>Sillón libre</div>
                )}
              </div>
            </div>
            );
          })}
        </div>
      </div>

      {/* Bento Box Stats (Apple UX) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '12px', marginBottom: '28px', padding: '0 4px' }}>
        
        {/* Tarjeta Principal: Producción */}
        <div style={{ 
          gridColumn: 'span 2', 
          background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.08) 0%, rgba(17, 17, 17, 0.03) 100%)', 
          borderRadius: '24px', 
          padding: '24px', 
          position: 'relative',
          overflow: 'hidden',
          border: '1px solid rgba(255,255,255,0.06)',
          boxShadow: '0 20px 40px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.1)'
        }}>
          {/* Subtle Glow Background */}
          <div style={{ position: 'absolute', top: '-50%', right: '-20%', width: '150px', height: '150px', background: 'var(--gold-primary)', filter: 'blur(80px)', opacity: 0.15, borderRadius: '50%' }} />
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
            <div style={{ width: '28px', height: '28px', borderRadius: '8px', background: 'rgba(17, 17, 17, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <DollarSign size={16} color="var(--gold-primary)" strokeWidth={2.5} />
            </div>
            <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.6)', fontWeight: '800', letterSpacing: '0.5px' }}>PRODUCCIÓN TOTAL</span>
          </div>
          <div style={{ fontSize: '38px', fontWeight: '900', color: 'white', letterSpacing: '-1px', display: 'flex', alignItems: 'baseline', gap: '4px' }}>
            <span style={{ fontSize: '24px', color: 'var(--gold-primary)', opacity: 0.8 }}>$</span>
            {formatCurrency(myStats.income)}
          </div>
        </div>

        {/* Tarjeta Secundaria: Citas */}
        <div style={{ 
          background: 'var(--bg-secondary)', 
          backdropFilter: 'blur(10px)',
          borderRadius: '20px', 
          padding: '16px', 
          border: '1px solid rgba(255,255,255,0.04)',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Calendar size={14} color="rgba(255,255,255,0.5)" />
            <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', fontWeight: '700', letterSpacing: '0.3px' }}>{isAssistant ? 'LIMPIEZAS' : 'CITAS'}</span>
          </div>
          <div style={{ fontSize: '22px', fontWeight: '800', color: 'white' }}>
            {myStats.appointments}
          </div>
        </div>

        {/* Tarjeta Secundaria: Clientes */}
        <div style={{ 
          background: 'var(--bg-secondary)', 
          backdropFilter: 'blur(10px)',
          borderRadius: '20px', 
          padding: '16px', 
          border: '1px solid rgba(255,255,255,0.04)',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Users size={14} color="rgba(255,255,255,0.5)" />
            <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', fontWeight: '700', letterSpacing: '0.3px' }}>CLIENTES</span>
          </div>
          <div style={{ fontSize: '22px', fontWeight: '800', color: 'white' }}>
            {stats.clients}
          </div>
        </div>
      </div>

      {/* Admin Goals Meters Widget (Identical to PC Goals Module) */}
      {isAdmin && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '24px' }}>
          {[
            { id: 'daily', title: 'Misión Diaria', current: stats?.income || 0, goal: goals.daily, label: 'HOY' },
            { id: 'weekly', title: 'Meta Semanal', current: stats?.weeklyIncome || 0, goal: goals.weekly, label: 'SEMANA ACTUAL' },
            { id: 'monthly', title: 'Objetivo Mensual', current: stats?.monthlyIncome || 0, goal: goals.monthly, label: 'MES EN CURSO' }
          ].map((m, i) => (
            <div key={m.id} className="glass-card" style={{ padding: '18px', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.04)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Target size={14} color="var(--gold-primary)" />
                  <span style={{ fontWeight: '900', fontSize: '11px', letterSpacing: '0.5px', textTransform: 'uppercase', color: 'white' }}>{m.title}</span>
                </div>
                {i === 0 && (
                  <button 
                    onClick={() => setIsEditingGoals(true)}
                    style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '2px' }}
                  >
                    <Edit3 size={12} />
                  </button>
                )}
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '8px' }}>
                <div style={{ fontSize: '18px', fontWeight: '900', color: 'white' }}>
                  ${formatCurrency(m.current || 0)} <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '700' }}>/ ${formatCurrency(m.goal)}</span>
                </div>
                <div style={{ fontSize: '9px', fontWeight: '900', color: 'var(--gold-primary)', backgroundColor: 'rgba(255, 255, 255,0.1)', padding: '2px 6px', borderRadius: '4px' }}>
                  {Math.min(Math.round(((m.current || 0) / m.goal) * 100), 100)}%
                </div>
              </div>

              <div style={{ height: '6px', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: '3px', overflow: 'hidden' }}>
                <div style={{ 
                  width: `${Math.min(((m.current || 0) / m.goal) * 100, 100)}%`, 
                  height: '100%', 
                  background: 'var(--gold-gradient)', 
                  boxShadow: 'var(--gold-glow)',
                  transition: 'width 1s cubic-bezier(0.4, 0, 0.2, 1)' 
                }} />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Visual Podium Section for Top Barbers (Identical to Desktop) */}
      {isAdmin && teamOverview.length >= 2 && (
        <PodiumWidget 
          title="Top Odontólogos" 
          icon={<Trophy size={16} />}
          data={teamOverview}
          labelKey="name"
          scoreKey={(item) => `$${(item.stats?.monthlyIncome || 0).toFixed(0)}`}
          scoreLabel="MES EN CURSO"
        />
      )}

      {/* Visual Podium Section for Top Clients (Identical to Desktop) */}
      {isAdmin && topClients.length >= 2 && (
        <PodiumWidget 
          title="Top Clientes" 
          icon={<Users size={16} />}
          data={topClients}
          labelKey="name"
          scoreKey={(item) => `$${(item.total_spent || 0).toFixed(0)}`}
          scoreLabel="TOTAL CONSUMIDO"
          isClient={true}
          onNavigate={onNavigate}
        />
      )}

      {/* Fallback list if podium data is too fresh */}
      {isAdmin && teamOverview.length < 2 && (
        <div className="glass-card" style={{ padding: '20px', borderRadius: '24px', marginBottom: '24px', border: '1px solid rgba(255,255,255,0.04)' }}>
          <div style={{ fontWeight: '900', fontSize: '13px', color: '#ffffff', marginBottom: '16px', letterSpacing: '-0.3px', fontStyle: 'italic', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Trophy size={14} color="var(--gold-primary)" /> TOP Odontólogos (MES EN CURSO)
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {teamOverview.map((st, idx) => (
              <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '8px', borderBottom: idx !== teamOverview.length - 1 ? '1px solid rgba(255,255,255,0.03)' : 'none' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '11px', fontWeight: '950', color: 'var(--gold-primary)', width: '16px' }}>{idx+1}.</span>
                  <span style={{ fontSize: '13px', fontWeight: '800', color: '#ffffff' }}>{st.name}</span>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span style={{ fontSize: '13px', fontWeight: '900', color: 'var(--gold-primary)' }}>${formatCurrency(st.stats?.monthlyIncome || 0)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Birthdays Section (Apple UX Redesign) */}
      {isAdmin && (
        <div style={{ marginBottom: '24px' }}>
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px', paddingLeft: '8px' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '10px', background: 'rgba(17, 17, 17, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(17, 17, 17, 0.2)', boxShadow: '0 0 10px rgba(17, 17, 17, 0.1)' }}>
              <Cake size={16} color="var(--gold-primary)" />
            </div>
            <h3 style={{ fontSize: '16px', fontWeight: '900', color: '#ffffff', letterSpacing: '-0.3px', margin: 0 }}>Cumpleaños</h3>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Today's Birthdays - HERO CARDS */}
            {todaysBirthdays.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '10px', fontWeight: '900', color: '#30d158', letterSpacing: '1px', textTransform: 'uppercase', paddingLeft: '8px' }}>
                  <PartyPopper size={12} /> CUMPLEN HOY
                </div>
                {todaysBirthdays.map(c => (
                  <div 
                    key={c.id} 
                    style={{ 
                      position: 'relative',
                      overflow: 'hidden',
                      padding: '20px', 
                      background: 'linear-gradient(135deg, rgba(48,209,88,0.2) 0%, rgba(20,20,22,1) 100%)', 
                      border: '1px solid rgba(48,209,88,0.3)', 
                      borderRadius: '24px',
                      boxShadow: '0 10px 30px rgba(48,209,88,0.1)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px', zIndex: 1 }}>
                      <div style={{ width: '50px', height: '50px', borderRadius: '50%', background: 'linear-gradient(to bottom, #30d158, #249941)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', fontWeight: '900', color: 'white', boxShadow: '0 4px 10px rgba(48,209,88,0.3)' }}>
                        {c.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div 
                          style={{ fontWeight: '900', color: 'white', fontSize: '16px', cursor: 'pointer', letterSpacing: '-0.2px' }} 
                          onClick={() => onNavigate && onNavigate('clients', { clientId: c.id })}
                        >
                          {c.name.split(' ')[0]}
                        </div>
                        <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.6)', fontWeight: '600' }}>¡Felicítalo hoy!</div>
                      </div>
                    </div>
                    
                    <button 
                      onClick={() => handleWhatsAppCongratulate(c)}
                      style={{ 
                        zIndex: 1,
                        width: '44px',
                        height: '44px',
                        borderRadius: '50%', 
                        border: 'none', 
                        background: '#30d158', 
                        color: 'black', 
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        boxShadow: '0 4px 15px rgba(48,209,88,0.4)',
                        transition: 'transform 0.2s'
                      }}
                    >
                      <MessageCircle size={20} fill="black" />
                    </button>
                    
                    {/* Decorative Background Elements */}
                    <Cake size={100} color="rgba(48,209,88,0.05)" style={{ position: 'absolute', right: '-10px', top: '-10px', transform: 'rotate(15deg)' }} />
                  </div>
                ))}
              </div>
            )}

            {/* Upcoming Birthdays - COMPACT ELEGANT LIST */}
            {upcomingBirthdays.length > 0 && (
              <div>
                <div style={{ fontSize: '10px', fontWeight: '900', color: 'var(--text-muted)', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '12px', paddingLeft: '8px' }}>
                  PRÓXIMOS DÍAS
                </div>
                <div className="glass-card" style={{ padding: '16px', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.04)' }}>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    {upcomingBirthdays.map((c, idx) => (
                      <div 
                        key={c.id} 
                        style={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'space-between', 
                          padding: '12px 0', 
                          borderBottom: idx !== upcomingBirthdays.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
                          cursor: 'pointer' 
                        }} 
                        onClick={() => onNavigate && onNavigate('clients', { clientId: c.id })}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <div style={{ width: '36px', height: '36px', borderRadius: '12px', background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: '800', color: 'white', border: '1px solid rgba(255,255,255,0.05)' }}>
                            {c.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <span style={{ fontWeight: '800', color: 'white', fontSize: '14px', letterSpacing: '-0.2px' }}>{c.name.split(' ')[0]}</span>
                            <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '600' }}>{c.bdayDateStr}</div>
                          </div>
                        </div>
                        <div style={{ padding: '4px 10px', borderRadius: '10px', background: 'rgba(17, 17, 17,0.1)', border: '1px solid rgba(17, 17, 17,0.2)', color: 'var(--gold-primary)', fontSize: '10px', fontWeight: '800' }}>
                          en {c.daysToBday}d
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
            
            {todaysBirthdays.length === 0 && upcomingBirthdays.length === 0 && (
              <div className="glass-card" style={{ padding: '30px 20px', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.04)', textAlign: 'center' }}>
                <Cake size={32} color="rgba(255,255,255,0.1)" style={{ marginBottom: '12px' }} />
                <div style={{ fontSize: '13px', color: 'var(--text-muted)', fontWeight: '600' }}>
                  No hay cumpleaños cercanos
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Analytics Chart Section (Apple UX Redesign) */}
      <div className="glass-card" style={{ padding: '28px 24px', borderRadius: '32px', border: '1px solid rgba(255,255,255,0.06)', marginBottom: '32px', background: 'var(--bg-secondary)', boxShadow: '0 20px 40px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.08)' }}>
        <div style={{ display: 'flex', flexDirection: 'column', marginBottom: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '12px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>Tendencia de Ventas</span>
            <div style={{ fontSize: '10px', color: '#1d1d1f', fontWeight: '800', backgroundColor: 'var(--gold-primary)', padding: '4px 10px', borderRadius: '12px', letterSpacing: '0.5px' }}>DIARIA</div>
          </div>
          <div style={{ fontSize: '32px', fontWeight: '900', color: 'white', letterSpacing: '-1px' }}>
            ${formatCurrency(lineValues.reduce((a, b) => a + b, 0))}
          </div>
          <div style={{ fontSize: '13px', color: '#30d158', fontWeight: '700', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <TrendingUp size={14} /> +12% esta semana
          </div>
        </div>
        
        {/* Glow Line Chart in pure SVG + Framer Motion */}
        <div style={{ height: '180px', width: '100%', position: 'relative' }}>
          <svg width="100%" height="170" viewBox="0 0 320 170" style={{ overflow: 'visible' }}>
            {/* Grid Lines - subtle, only horizontal */}
            {[40, 80, 120].map((gY, gi) => (
              <line key={gi} x1="10" y1={gY} x2="310" y2={gY} stroke="rgba(255,255,255,0.04)" strokeWidth="1" strokeDasharray="4 4" />
            ))}

            <defs>
              <linearGradient id="mobileGoldGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--gold-primary)" stopOpacity="0.4" />
                <stop offset="100%" stopColor="var(--gold-primary)" stopOpacity="0.0" />
              </linearGradient>
              <linearGradient id="lineGrad" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#111111" />
                <stop offset="100%" stopColor="#FFF2CD" />
              </linearGradient>
              <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="6" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>
            </defs>

            {/* Glowing path area (animated) */}
            {fillD && (
              <motion.path 
                d={fillD} 
                fill="url(#mobileGoldGrad)" 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 1, delay: 0.5 }}
              />
            )}

            {/* Curved Path (animated draw) */}
            {pathD && (
              <motion.path 
                d={pathD} 
                fill="none" 
                stroke="url(#lineGrad)" 
                strokeWidth="4" 
                strokeLinecap="round" 
                strokeLinejoin="round"
                filter="url(#glow)"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 1.5, ease: "easeInOut" }}
              />
            )}

            {/* Points & Tags */}
            {points.map((p, i) => {
              const isLast = i === points.length - 1;
              // Si el punto está muy arriba, dibujamos la etiqueta abajo para que no se corte
              const labelYOffset = p.y < 35 ? 20 : -20;
              
              return (
                <g key={i}>
                  {/* Subtle dots for all points except last */}
                  {!isLast && (
                    <circle cx={p.x} cy={p.y} r="3" fill="var(--bg-primary)" stroke="rgba(255,255,255,0.3)" strokeWidth="1.5" />
                  )}
                  
                  {/* Elegant Pill Label for ALL points EXCEPT the last one */}
                  {!isLast && (
                    <motion.g 
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 1 + (i * 0.1), type: 'spring', damping: 15 }}
                      style={{ transformOrigin: `${p.x}px ${p.y}px` }}
                    >
                      <g transform={`translate(${p.x}, ${p.y + labelYOffset})`}>
                        <rect x="-18" y="-9" width="36" height="18" rx="9" fill="rgba(20,20,22,0.85)" stroke="rgba(255,255,255,0.15)" strokeWidth="1" style={{ filter: 'drop-shadow(0 4px 6px rgba(0,0,0,0.5))' }} />
                        <text x="0" y="3" fill="#ffffff" fontSize="9" fontWeight="800" textAnchor="middle" letterSpacing="0.2">
                          ${Number(p.val || 0).toFixed(0)}
                        </text>
                      </g>
                    </motion.g>
                  )}

                  {/* Glowing big dot for the LAST data point */}
                  {isLast && (
                    <motion.g 
                      initial={{ scale: 0, opacity: 0 }} 
                      animate={{ scale: 1, opacity: 1 }} 
                      transition={{ delay: 1.5, type: 'spring' }}
                      style={{ transformOrigin: `${p.x}px ${p.y}px` }}
                    >
                      <circle cx={p.x} cy={p.y} r="12" fill="var(--gold-primary)" opacity="0.2" />
                      <circle cx={p.x} cy={p.y} r="6" fill="#FFF2CD" stroke="var(--bg-primary)" strokeWidth="2" style={{ filter: 'drop-shadow(0 0 8px rgba(17, 17, 17,0.8))' }} />
                      
                      {/* Floating Apple-style label for last point */}
                      <g transform={`translate(${p.x}, ${p.y + (p.y < 35 ? 25 : -25)})`}>
                        <rect x="-24" y="-12" width="48" height="24" rx="12" fill="#ffffff" style={{ filter: 'drop-shadow(0 6px 12px rgba(0,0,0,0.5))' }} />
                        <text x="0" y="3.5" fill="#000000" fontSize="11" fontWeight="900" textAnchor="middle">
                          ${Number(p.val || 0).toFixed(0)}
                        </text>
                      </g>
                    </motion.g>
                  )}

                  {/* X Axis tick labels */}
                  {i < 7 && chartData?.labels?.[i] && (
                    <text x={p.x} y="165" fill={isLast ? "white" : "rgba(255,255,255,0.3)"} fontSize="10" fontWeight={isLast ? "800" : "600"} textAnchor="middle">
                      {chartData.labels[i]}
                    </text>
                  )}
                </g>
              );
            })}
          </svg>
        </div>
      </div>

      {/* Goal Edit Modal */}
      {createPortal(
        <AnimatePresence>
          {isEditingGoals && (
            <div style={{
              position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              zIndex: 99999, padding: '20px', paddingTop: 'max(20px, env(safe-area-inset-top, 20px))'
            }}>
              <motion.div
                initial={{ opacity: 0, backdropFilter: 'blur(0px)' }}
                animate={{ opacity: 1, backdropFilter: 'blur(16px)' }}
                exit={{ opacity: 0, backdropFilter: 'blur(0px)' }}
                onClick={() => setIsEditingGoals(false)}
                style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.7)' }}
              />
              <motion.div 
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                style={{ 
                  width: '100%', maxWidth: '360px', padding: '30px', 
                  borderRadius: '32px', position: 'relative',
                  background: 'var(--bg-secondary)',
                  boxShadow: '0 30px 60px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.1)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  backdropFilter: 'blur(25px)'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
                  <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(17, 17, 17, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(17, 17, 17,0.2)' }}>
                    <Target color="var(--gold-primary)" size={18} />
                  </div>
                  <h3 style={{ fontSize: '20px', fontWeight: '900', color: 'white', letterSpacing: '-0.5px', margin: 0 }}>Metas</h3>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '28px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '10px', fontWeight: '800', color: 'rgba(255,255,255,0.5)', marginBottom: '8px', letterSpacing: '1px' }}>META DIARIA ($)</label>
                    <input 
                      type="number" 
                      value={goals.daily} 
                      onChange={e => setGoals({...goals, daily: e.target.value})}
                      style={{ width: '100%', padding: '14px 16px', borderRadius: '14px', background: 'var(--bg-secondary)', border: '1px solid rgba(255,255,255,0.05)', color: 'white', fontSize: '16px', fontWeight: '700', outline: 'none', transition: 'border 0.2s', WebkitAppearance: 'none' }}
                      onFocus={(e) => e.target.style.border = '1px solid rgba(17, 17, 17,0.5)'}
                      onBlur={(e) => e.target.style.border = '1px solid rgba(255,255,255,0.05)'}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '10px', fontWeight: '800', color: 'rgba(255,255,255,0.5)', marginBottom: '8px', letterSpacing: '1px' }}>META SEMANAL ($)</label>
                    <input 
                      type="number" 
                      value={goals.weekly} 
                      onChange={e => setGoals({...goals, weekly: e.target.value})}
                      style={{ width: '100%', padding: '14px 16px', borderRadius: '14px', background: 'var(--bg-secondary)', border: '1px solid rgba(255,255,255,0.05)', color: 'white', fontSize: '16px', fontWeight: '700', outline: 'none', transition: 'border 0.2s', WebkitAppearance: 'none' }}
                      onFocus={(e) => e.target.style.border = '1px solid rgba(17, 17, 17,0.5)'}
                      onBlur={(e) => e.target.style.border = '1px solid rgba(255,255,255,0.05)'}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '10px', fontWeight: '800', color: 'rgba(255,255,255,0.5)', marginBottom: '8px', letterSpacing: '1px' }}>META MENSUAL ($)</label>
                    <input 
                      type="number" 
                      value={goals.monthly} 
                      onChange={e => setGoals({...goals, monthly: e.target.value})}
                      style={{ width: '100%', padding: '14px 16px', borderRadius: '14px', background: 'var(--bg-secondary)', border: '1px solid rgba(255,255,255,0.05)', color: 'white', fontSize: '16px', fontWeight: '700', outline: 'none', transition: 'border 0.2s', WebkitAppearance: 'none' }}
                      onFocus={(e) => e.target.style.border = '1px solid rgba(17, 17, 17,0.5)'}
                      onBlur={(e) => e.target.style.border = '1px solid rgba(255,255,255,0.05)'}
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '12px' }}>
                  <button onClick={() => handleSaveGoals(goals)} style={{ flex: 1, padding: '14px', borderRadius: '14px', background: 'var(--gold-primary)', border: 'none', color: 'black', fontWeight: '900', fontSize: '14px', cursor: 'pointer' }}>Guardar</button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>,
        document.body
      )}
      {/* WhatsApp Message Customization Modal Portal */}
      {createPortal(
        <AnimatePresence>
          {whatsappModalData && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 10000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px'
        }}>
          <motion.div
            key="backdrop-whatsapp-modal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(0, 0, 0, 0.75)', backdropFilter: 'blur(10px)' }}
          />
          <motion.div
            key="card-whatsapp-modal"
            className="glass-card"
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            style={{
            width: '100%',
            maxWidth: '380px',
            background: 'var(--bg-secondary)',
            border: '1px solid rgba(255, 255, 255, 0.25)',
            borderRadius: '24px',
            padding: '20px',
            boxShadow: '0 20px 50px rgba(0, 0, 0, 0.5), 0 0 30px rgba(255, 255, 255, 0.05)',
            position: 'relative'
          }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <MessageCircle size={18} color="var(--gold-primary)" />
                <h3 style={{ margin: 0, fontSize: '15px', fontWeight: '900', color: 'white' }}>
                  Felicitar a {whatsappModalData.name}
                </h3>
              </div>
              <button 
                onClick={() => setWhatsappModalData(null)}
                style={{
                  background: 'rgba(255,255,255,0.05)',
                  border: 'none',
                  borderRadius: '50%',
                  width: '28px',
                  height: '28px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  color: 'var(--text-muted)'
                }}
              >
                <X size={14} />
              </button>
            </div>

            {/* Description */}
            <p style={{ fontSize: '11px', color: 'var(--text-secondary)', lineHeight: '1.4', margin: '0 0 14px 0' }}>
              Personaliza el mensaje y el número. Al editar el teléfono, se guardará en la base de datos automáticamente.
            </p>

            {/* Phone Input */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '12px' }}>
              <label style={{ fontSize: '9px', color: 'var(--text-muted)', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Número de Teléfono
              </label>
              <input 
                type="text" 
                value={editedPhone} 
                onChange={(e) => setEditedPhone(e.target.value)}
                placeholder="Ej: +584121234567"
                style={{
                  padding: '8px 12px',
                  backgroundColor: 'rgba(255,255,255,0.02)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: '10px',
                  color: 'white',
                  fontSize: '13px',
                  fontWeight: '600',
                  outline: 'none',
                }}
              />
            </div>

            {/* Message Input */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '18px' }}>
              <label style={{ fontSize: '9px', color: 'var(--text-muted)', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Mensaje de Felicitación
              </label>
              <textarea 
                value={editedMessage} 
                onChange={(e) => setEditedMessage(e.target.value)}
                rows={5}
                style={{
                  padding: '8px 12px',
                  backgroundColor: 'rgba(255,255,255,0.02)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: '10px',
                  color: 'white',
                  fontSize: '13px',
                  fontWeight: '600',
                  outline: 'none',
                  resize: 'vertical',
                  minHeight: '110px',
                  lineHeight: '1.4'
                }}
              />
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <button 
                onClick={() => handleSendWhatsApp(true)}
                disabled={isSaving || !editedPhone}
                style={{
                  width: '100%',
                  padding: '10px',
                  borderRadius: '10px',
                  backgroundColor: editedPhone ? '#25d366' : 'rgba(255,255,255,0.05)',
                  color: editedPhone ? 'black' : 'var(--text-muted)',
                  fontWeight: '850',
                  fontSize: '12px',
                  border: 'none',
                  cursor: (isSaving || !editedPhone) ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  boxShadow: editedPhone ? '0 4px 12px rgba(37, 211, 102, 0.25)' : 'none',
                }}
              >
                <MessageCircle size={14} />
                {isSaving ? 'Guardando...' : 'Enviar al Número Registrado'}
              </button>

              <button 
                onClick={() => handleSendWhatsApp(false)}
                disabled={isSaving}
                style={{
                  width: '100%',
                  padding: '10px',
                  borderRadius: '10px',
                  backgroundColor: 'rgba(255, 255, 255, 0.05)',
                  color: 'white',
                  fontWeight: '700',
                  fontSize: '12px',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  cursor: isSaving ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                }}
              >
                Elegir Contacto Manualmente
              </button>

              <button 
                onClick={() => setWhatsappModalData(null)}
                disabled={isSaving}
                style={{
                  width: '100%',
                  padding: '10px',
                  borderRadius: '10px',
                  backgroundColor: 'transparent',
                  color: 'var(--text-muted)',
                  fontWeight: '600',
                  fontSize: '12px',
                  border: 'none',
                  cursor: isSaving ? 'not-allowed' : 'pointer',
                  textAlign: 'center'
                }}
              >
                Cancelar
              </button>
            </div>
          </motion.div>
        </div>
          )}
        </AnimatePresence>,
        document.body
      )}

      {/* POPUPS PARA SILLAS EN MÓVIL (APPLE BOTTOM SHEET UX) */}
      {createPortal(
        <AnimatePresence>
          {checkoutChairModal && (
            <div style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
              <motion.div 
                key="backdrop-checkout"
                initial={{ opacity: 0, backdropFilter: 'blur(0px)' }}
                animate={{ opacity: 1, backdropFilter: 'blur(16px)' }}
                exit={{ opacity: 0, backdropFilter: 'blur(0px)' }}
                onClick={() => setCheckoutChairModal(null)}
                style={{ position: 'absolute', inset: 0, backgroundColor: 'var(--bg-secondary)' }}
              />
              <motion.div 
                key="modal-checkout"
                initial={{ y: '100%' }}
                animate={{ y: '0%' }}
                exit={{ y: '100%' }}
                transition={{ type: 'spring', damping: 26, stiffness: 220 }}
                style={{ 
                  position: 'relative', 
                  height: '92vh', 
                  backgroundColor: 'var(--bg-secondary)', 
                  borderTopLeftRadius: '32px', 
                  borderTopRightRadius: '32px', 
                  boxShadow: '0 -10px 40px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.08)',
                  display: 'flex', 
                  flexDirection: 'column',
                  overflow: 'hidden'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'center', paddingTop: '12px', paddingBottom: '8px' }}>
                  <div style={{ width: '40px', height: '5px', backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: '10px' }} />
                </div>
                <div style={{ padding: '0 24px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <h3 style={{ margin: 0, fontSize: '20px', fontWeight: '900', color: 'white', letterSpacing: '-0.5px' }}>
                    Cobrar Sillón {checkoutChairModal.id}
                  </h3>
                  <button onClick={() => setCheckoutChairModal(null)} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', cursor: 'pointer' }}>
                    <X size={18} />
                  </button>
                </div>
                <div style={{ flex: 1, overflowY: 'auto', WebkitOverflowScrolling: 'touch' }}>
                  <Suspense fallback={<div style={{ padding: '24px' }}><SkeletonList rows={4} rowHeight={56} /></div>}>
                    <CheckoutPOS 
                      rates={{ bcv: 40, euro: 45 }} // Simplificado, idealmente usar props
                      isMobile={true} 
                      onNavigate={onNavigate}
                      preselectAppId={checkoutChairModal.appointmentId || checkoutChairModal.appId}
                      isModalView={true}
                      onClose={() => setCheckoutChairModal(null)}
                    />
                  </Suspense>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>,
        document.body
      )}

      {createPortal(
        <AnimatePresence>
          {showReceptionPopup && (
            <div style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
              <motion.div 
                key="backdrop-reception"
                initial={{ opacity: 0, backdropFilter: 'blur(0px)' }}
                animate={{ opacity: 1, backdropFilter: 'blur(16px)' }}
                exit={{ opacity: 0, backdropFilter: 'blur(0px)' }}
                onClick={() => setShowReceptionPopup(false)}
                style={{ position: 'absolute', inset: 0, backgroundColor: 'var(--bg-secondary)' }}
              />
              <motion.div 
                key="modal-reception"
                initial={{ y: '100%' }}
                animate={{ y: '0%' }}
                exit={{ y: '100%' }}
                transition={{ type: 'spring', damping: 26, stiffness: 220 }}
                style={{ 
                  position: 'relative', 
                  height: '92vh', 
                  backgroundColor: 'var(--bg-secondary)', 
                  borderTopLeftRadius: '32px', 
                  borderTopRightRadius: '32px', 
                  boxShadow: '0 -10px 40px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.08)',
                  display: 'flex', 
                  flexDirection: 'column',
                  overflow: 'hidden'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'center', paddingTop: '12px', paddingBottom: '8px' }}>
                  <div style={{ width: '40px', height: '5px', backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: '10px' }} />
                </div>
                <div style={{ padding: '0 24px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <h3 style={{ margin: 0, fontSize: '20px', fontWeight: '900', color: 'white', letterSpacing: '-0.5px' }}>
                    Recepción
                  </h3>
                  <button onClick={() => setShowReceptionPopup(false)} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', cursor: 'pointer' }}>
                    <X size={18} />
                  </button>
                </div>
                <div style={{ flex: 1, overflowY: 'auto', WebkitOverflowScrolling: 'touch', padding: '16px 20px 24px' }}>
                  <Suspense fallback={<div style={{ padding: '24px' }}><SkeletonList rows={4} rowHeight={56} /></div>}>
                    <ReceptionModule
                      isMobile={true}
                      onNavigate={onNavigate}
                      preselectChairId={selectedChair?.id}
                    />
                  </Suspense>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>,
        document.body
      )}

      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-15px) rotate(3deg); }
        }
        .mobile-dashboard::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </div>
  );
};

// Premium visual podium component cloned and scaled for Mobile Screens
const PodiumWidget = ({ title, icon, data, labelKey, scoreKey, scoreLabel, isClient, onNavigate }) => {
  const [expanded, setExpanded] = useState(false);
  const podiumOrder = [data[1], data[0], data[2]].filter(Boolean);
  const others = data.slice(3); // Odontologos del 4to lugar en adelante

  return (
    <div className="glass-card" style={{ padding: '20px', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.04)', marginBottom: '24px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '32px' }}>
        <div style={{ width: '32px', height: '32px', borderRadius: '8px', backgroundColor: 'rgba(255, 255, 255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {icon}
        </div>
        <h3 style={{ fontSize: '14px', fontWeight: '900', color: 'white' }}>{title.split(' ')[0]} <span className="text-gold">{title.split(' ')[1]}</span></h3>
      </div>

      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'center', gap: '8px', minHeight: '140px' }}>
        {podiumOrder.map((item, idx) => {
          const originalIdx = data.indexOf(item);
          const isFirst = originalIdx === 0;
          const isSecond = originalIdx === 1;
          const isThird = originalIdx === 2;

          return (
            <div key={item.id || idx} style={{ 
              flex: 1, 
              display: 'flex', 
              flexDirection: 'column', 
              alignItems: 'center'
            }}>
              <div style={{ position: 'relative', marginBottom: '8px' }}>
                <div style={{ 
                  width: isFirst ? '56px' : '44px', 
                  height: isFirst ? '56px' : '44px', 
                  borderRadius: '16px', 
                  backgroundColor: 'var(--bg-tertiary)',
                  border: isFirst ? '2.5px solid var(--gold-primary)' : '1.5px solid rgba(255,255,255,0.1)',
                  overflow: 'hidden',
                  boxShadow: isFirst ? 'var(--gold-glow)' : 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  {item.image_url ? (
                    <img src={item.image_url} alt={item[labelKey]} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <User size={isFirst ? 24 : 18} color="var(--gold-primary)" opacity={0.5} />
                  )}
                </div>
                {isFirst && <Crown size={16} color="var(--gold-primary)" fill="var(--gold-primary)" style={{ position: 'absolute', top: '-11px', left: '50%', transform: 'translateX(-50%)' }} />}
                <div style={{ 
                  position: 'absolute', 
                  bottom: '-6px', 
                  left: '50%', 
                  transform: 'translateX(-50%)',
                  width: '18px', 
                  height: '18px', 
                  borderRadius: '50%', 
                  backgroundColor: isFirst ? 'var(--gold-primary)' : isSecond ? '#C0C0C0' : '#CD7F32',
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  fontSize: '9px', 
                  fontWeight: '900', 
                  color: 'black'
                }}>
                  {originalIdx + 1}
                </div>
              </div>

              <div 
                style={{ textAlign: 'center', marginTop: '8px', cursor: isClient ? 'pointer' : 'default', width: '100%' }}
                onClick={() => isClient && onNavigate && onNavigate('clients', { clientId: item.id })}
              >
                <div style={{ 
                  fontWeight: '850', 
                  fontSize: isFirst ? '11px' : '10px', 
                  whiteSpace: 'nowrap', 
                  overflow: 'hidden', 
                  textOverflow: 'ellipsis',
                  color: isClient ? 'var(--gold-primary)' : 'white',
                  textDecoration: isClient ? 'underline' : 'none',
                  textUnderlineOffset: '2px',
                  maxWidth: '75px',
                  margin: '0 auto'
                }}>
                  {item[labelKey].split(' ')[0]}
                </div>
                <div style={{ color: 'var(--gold-primary)', fontWeight: '950', fontSize: '12px', marginTop: '2px' }}>{scoreKey(item)}</div>
                <div style={{ fontSize: '7px', fontWeight: '800', opacity: 0.4, letterSpacing: '0.3px', textTransform: 'uppercase' }}>{scoreLabel}</div>
                
                {/* Visual Podium Base */}
                <div style={{ 
                  width: '100%', 
                  height: isFirst ? '40px' : isSecond ? '25px' : '15px', 
                  background: 'linear-gradient(to top, rgba(255, 255, 255, 0.25), rgba(255, 255, 255, 0.08))',
                  borderRadius: '6px 6px 0 0',
                  marginTop: '8px',
                  border: '1px solid rgba(255, 255, 255, 0.25)',
                  borderBottom: 'none'
                }} />
              </div>
            </div>
          );
        })}
      </div>

      {others.length > 0 && (
        <div style={{ marginTop: '24px', paddingTop: '16px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
          <AnimatePresence>
            {expanded && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '16px', overflow: 'hidden' }}
              >
                {others.map((item, idx) => (
                  <div key={item.id || idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: 'rgba(255,255,255,0.03)', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.02)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <span style={{ fontSize: '12px', fontWeight: '900', color: 'rgba(255,255,255,0.3)', width: '16px' }}>{idx + 4}</span>
                      {item.image_url ? (
                        <img src={item.image_url} alt={item[labelKey]} style={{ width: '32px', height: '32px', borderRadius: '10px', objectFit: 'cover' }} />
                      ) : (
                        <div style={{ width: '32px', height: '32px', borderRadius: '10px', background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <User size={16} color="rgba(255,255,255,0.5)" />
                        </div>
                      )}
                      <span style={{ fontSize: '14px', fontWeight: '800', color: 'white' }}>{item[labelKey].split(' ')[0]}</span>
                    </div>
                    <span style={{ fontSize: '14px', fontWeight: '900', color: 'var(--gold-primary)' }}>{scoreKey(item)}</span>
                  </div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
          <button 
            onClick={() => setExpanded(!expanded)} 
            style={{ width: '100%', padding: '14px', borderRadius: '16px', background: 'rgba(255,255,255,0.05)', color: 'white', fontWeight: '800', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', transition: 'background 0.2s' }}
          >
            {expanded ? 'Ocultar ranking' : 'Ver ranking completo'}
            <motion.div animate={{ rotate: expanded ? 180 : 0 }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="6 9 12 15 18 9"></polyline></svg>
            </motion.div>
          </button>
        </div>
      )}
    </div>
  );
};

export default MobileDashboard;

