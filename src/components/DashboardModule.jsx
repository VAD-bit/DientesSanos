import React, { useState, useEffect, useRef, lazy, Suspense } from 'react';
import { getRoleCategory } from '../utils/staffRoles';
import { createPortal } from 'react-dom';
import CheckoutPOS from './CheckoutPOS';
import NewClientModal from './NewClientModal';
import NewAppointmentModal from './NewAppointmentModal';
const ReceptionModule = lazy(() => import('./ReceptionModule'));
const PersonnelModule = lazy(() => import('./PersonnelModule'));
const InventoryModule = lazy(() => import('./InventoryModule'));
const InventoryAccessGate = lazy(() => import('./InventoryAccessGate'));
import { 
  TrendingUp, 
  Users, 
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  Plus,
  Rocket,
  Target,
  Edit3,
  User,
  Trophy, 
  Crown, 
  Medal, 
  ArrowRight,
  ShoppingBag,
  Scissors as ScissorsIcon,
  Circle,
  Gift,
  Cake,
  MessageCircle,
  Sparkles,
  X,
  Calendar,
  CheckCircle2,
  DollarSign,
  Bell,
  Store,
  ChevronDown,
  UserX,
  CreditCard,
  Wallet,
  Package
} from 'lucide-react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import { dataService } from '../services/dataService';
import { SkeletonList, SkeletonGrid } from './Skeleton';
import { useNotifs } from '../context/NotificationContext';
import { notificationService } from '../services/notificationService';
import { useScrollLock } from '../hooks/useScrollLock';
import { ModalShield } from '../context/ModalContext';
import AnimatedModal from './AnimatedModal';
import { useAuth } from '../context/AuthContext';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

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

const DashboardModule = ({ 
  isMobile, 
  isTablet,
  isCollapsed,
  onOpenSale, 
  onOpenSchedule,
  stats,
  chartData,
  monthlyChartData,
  dbData,
  handleSeedData, 
  rates, 
  activeRateType,
  onToggleRateType,
  onNavigate,
  onRefresh,
  onOpenNotifications
}) => {
  const { user } = useAuth();
  const [quoteIndex, setQuoteIndex] = useState(0);
  const { showToast } = useNotifs();
  const [unreadCount, setUnreadCount] = useState(0);
  const [incomePeriod, setIncomePeriod] = useState('week');
  const [showIncomePeriodMenu, setShowIncomePeriodMenu] = useState(false);
  const [isIncomeMenuExiting, setIsIncomeMenuExiting] = useState(false);
  const handleCloseIncomeMenu = () => {
    if (!showIncomePeriodMenu && !isIncomeMenuExiting) return;
    setIsIncomeMenuExiting(true);
    setTimeout(() => {
      setShowIncomePeriodMenu(false);
      setIsIncomeMenuExiting(false);
    }, 150);
  };
  const incomePeriodMenuRef = useRef(null);
  const [globalSearch, setGlobalSearch] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [activeSearchIndex, setActiveSearchIndex] = useState(-1);
  const searchContainerRef = useRef(null);
  const [searchDropdownMounted, setSearchDropdownMounted] = useState(false);
  const [searchDropdownClosing, setSearchDropdownClosing] = useState(false);
  const searchDropdownCloseTimer = useRef(null);

  useEffect(() => {
    const updateUnread = () => {
      const history = notificationService.getHistory();
      const count = history.filter(n => !n.read).length;
      setUnreadCount(count);
    };

    updateUnread();
    window.addEventListener('panda_new_notification', updateUnread);
    return () => {
      window.removeEventListener('panda_new_notification', updateUnread);
    };
  }, []);

  useEffect(() => {
    const handleOutsideSearch = event => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target)) {
        setIsSearchOpen(false);
        setActiveSearchIndex(-1);
      }
    };

    document.addEventListener('mousedown', handleOutsideSearch);
    return () => document.removeEventListener('mousedown', handleOutsideSearch);
  }, []);

  useEffect(() => {
    const handleOutsideIncomePeriod = event => {
      if (incomePeriodMenuRef.current && !incomePeriodMenuRef.current.contains(event.target)) {
        handleCloseIncomeMenu();
      }
    };

    document.addEventListener('mousedown', handleOutsideIncomePeriod);
    return () => document.removeEventListener('mousedown', handleOutsideIncomePeriod);
  }, []);

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('de-DE', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getShortName = (fullName) => fullName ? fullName.split(' ')[0] : '';
  const staffList = dbData?.staff || [];
  const sortedStaff = [...staffList]
    .filter(s => {
      const role = String(s.role || '').toLowerCase();
      const name = String(s.name || '').toLowerCase();
      const isBarber = role.includes('barber') && !role.includes('tatuad');
      const isNonBarberRole = role.includes('admin') || role.includes('caja') || role.includes('recep') || role.includes('asistent') || role.includes('archived');
      const isNonBarberName = name.includes('admin') || name.includes('caja') || name.includes('yarilin');
      return isBarber && !isNonBarberRole && !isNonBarberName;
    })
    .sort((a, b) => (b.stats?.monthlyIncome || 0) - (a.stats?.monthlyIncome || 0));

  const firstPlace = sortedStaff[0] || { name: 'Sin datos', stats: { monthlyIncome: 0 }, image_url: '' };
  const secondPlace = sortedStaff[1] || { name: 'Sin datos', stats: { monthlyIncome: 0 }, image_url: '' };
  const thirdPlace = sortedStaff[2] || { name: 'Sin datos', stats: { monthlyIncome: 0 }, image_url: '' };
  const [realtimeAppointments, setRealtimeAppointments] = useState([]);
  const [attendanceQueue, setAttendanceQueue] = useState([]);

  const normalizeSearchValue = value => String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();

  const searchTerm = normalizeSearchValue(globalSearch);
  const showSearchDropdown = isSearchOpen && searchTerm.length >= 2;

  // Keep the search dropdown mounted briefly after close so the exit animation can play
  useEffect(() => {
    if (showSearchDropdown) {
      clearTimeout(searchDropdownCloseTimer.current);
      setSearchDropdownMounted(true);
      setSearchDropdownClosing(false);
    } else if (searchDropdownMounted) {
      setSearchDropdownClosing(true);
      searchDropdownCloseTimer.current = setTimeout(() => {
        setSearchDropdownMounted(false);
        setSearchDropdownClosing(false);
      }, 140);
    }
    return () => clearTimeout(searchDropdownCloseTimer.current);
  }, [showSearchDropdown]); // eslint-disable-line react-hooks/exhaustive-deps
  const searchableAppointments = [
    ...(dbData?.todayAppointments || []),
    ...(dbData?.appointments || [])
  ].filter((appointment, index, appointments) =>
    appointments.findIndex(item => String(item.id) === String(appointment.id)) === index
  );

  const globalSearchResults = searchTerm.length < 2
    ? []
    : [
        ...(dbData?.clients || [])
          .filter(client => normalizeSearchValue([
            client.name,
            client.phone,
            client.id_card
          ].filter(Boolean).join(' ')).includes(searchTerm))
          .map(client => ({
            id: `client-${client.id}`,
            type: 'client',
            title: client.name || 'Cliente',
            subtitle: [client.phone, client.id_card].filter(Boolean).join(' · ') || 'Ficha de cliente',
            data: client
          })),
        ...searchableAppointments
          .filter(appointment => normalizeSearchValue([
            appointment.clients?.name,
            appointment.services?.name,
            appointment.staff?.name,
            appointment.status
          ].filter(Boolean).join(' ')).includes(searchTerm))
          .map(appointment => ({
            id: `appointment-${appointment.id}`,
            type: 'appointment',
            title: appointment.clients?.name || 'Cita',
            subtitle: [
              appointment.services?.name || 'Servicio',
              appointment.staff?.name,
              appointment.status
            ].filter(Boolean).join(' · '),
            data: appointment
          })),
        ...staffList
          .filter(member => normalizeSearchValue([
            member.name,
            member.role,
            member.phone,
            member.id_card
          ].filter(Boolean).join(' ')).includes(searchTerm))
          .map(member => ({
            id: `staff-${member.id}`,
            type: 'staff',
            title: member.name || 'Personal',
            subtitle: member.role || 'Miembro del equipo',
            data: member
          }))
      ].slice(0, 8);

  const selectGlobalSearchResult = result => {
    if (!result) return;

    if (result.type === 'client') {
      onNavigate?.('clients', { clientId: result.data.id });
    } else if (result.type === 'appointment') {
      onNavigate?.('scheduling', { appointmentId: result.data.id });
    } else {
      onNavigate?.('personnel', { staffId: result.data.id });
    }

    setGlobalSearch('');
    setIsSearchOpen(false);
    setActiveSearchIndex(-1);
  };

  const handleGlobalSearchKeyDown = event => {
    if (event.key === 'Escape') {
      setIsSearchOpen(false);
      setActiveSearchIndex(-1);
      event.currentTarget.blur();
      return;
    }

    if (globalSearchResults.length === 0) return;

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setIsSearchOpen(true);
      setActiveSearchIndex(index => (index + 1) % globalSearchResults.length);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setIsSearchOpen(true);
      setActiveSearchIndex(index =>
        index <= 0 ? globalSearchResults.length - 1 : index - 1
      );
    } else if (event.key === 'Enter') {
      event.preventDefault();
      selectGlobalSearchResult(globalSearchResults[activeSearchIndex >= 0 ? activeSearchIndex : 0]);
    }
  };

  // --- Real Database Metrics Calculations ---
  const getLocalDateKey = (d = new Date()) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };
  const todayStr = getLocalDateKey();

  const citasHoyCount = stats?.appointments ?? dbData?.todayAppointments?.length ?? 0;
  const facturadoHoyAmount = stats?.income || 0;
  const clientesNuevosCount = stats?.newClientsToday ??
    (dbData?.clients || []).filter(client => {
      if (client.created_at && getLocalDateKey(new Date(client.created_at)) === todayStr) return true;
      const validApps = Array.isArray(client.appointments)
        ? client.appointments.filter(a => ['Completado', 'En Silla', 'Por Pagar'].includes(a.status))
        : [];
      if (validApps.length === 1) {
        const appDate = validApps[0].completed_at || validApps[0].scheduled_at || validApps[0].created_at;
        if (appDate && getLocalDateKey(new Date(appDate)) === todayStr) return true;
      }
      return false;
    }).length;

  // Hero KPI count-up animation (Facturado Hoy) — Apple-style emphasis on the metric that matters most
  const [animatedFacturado, setAnimatedFacturado] = useState(0);
  useEffect(() => {
    const start = animatedFacturado;
    const end = facturadoHoyAmount;
    if (start === end) return;
    const duration = 750;
    const startTime = performance.now();
    let raf;
    const tick = (now) => {
      const progress = Math.min((now - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setAnimatedFacturado(start + (end - start) * eased);
      if (progress < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [facturadoHoyAmount]);

  const occupiedChairsCount = (realtimeAppointments || []).filter(a => a.status === 'En Silla').length;
  const totalChairs = 7;
  const ocupacionPercent = Math.round((occupiedChairsCount / totalChairs) * 100);

  const activeBarbers = staffList.filter(member => {
    const role = String(member.role || '').toLowerCase();
    return member.active !== false
      && !role.includes('archived')
      && (role.includes('barbero') || role.includes('barber') || role.includes('odontolog'));
  });
  const checkedInBarberIds = new Set(
    attendanceQueue
      .filter(entry => entry.status !== 'ABSENT')
      .map(entry => String(entry.staff_id))
  );
  const barbersPendingArrival = activeBarbers.filter(
    member => !checkedInBarberIds.has(String(member.id))
  );
  const pendingBarbersCount = barbersPendingArrival.length;

  const realUpcomingAppointments = (dbData?.todayAppointments || [])
    .filter(a => a.status === 'Agendado')
    .sort((a, b) => new Date(a.scheduled_at || 0) - new Date(b.scheduled_at || 0))
    .map(a => {
      let timeFormatted = 'Ahora';
      if (a.scheduled_at) {
        const d = new Date(a.scheduled_at);
        const h = d.getHours();
        const m = d.getMinutes().toString().padStart(2, '0');
        const ampm = h >= 12 ? 'PM' : 'AM';
        const h12 = h % 12 || 12;
        timeFormatted = `${h12}:${m} ${ampm}`;
      }
      return {
        id: a.id,
        time: timeFormatted,
        name: a.clients?.name || 'Cliente',
        service: a.services?.name || 'Servicio',
        barber: a.staff?.name || 'Odontólogo',
        avatar: a.staff?.image_url,
        status: a.status,
        beverage: a.beverage_selection || ''
      };
    });

  const weeklyIncomeAmount = stats?.weeklyIncome || stats?.income || 0;

  const serviceCounts = {};
  (dbData?.appointments || []).forEach(a => {
    const sName = a.services?.name;
    if (sName) serviceCounts[sName] = (serviceCounts[sName] || 0) + 1;
  });
  const sortedServices = Object.entries(serviceCounts)
    .map(([name, val]) => ({ name, val }))
    .sort((a, b) => b.val - a.val);

  const finalTopServices = sortedServices.length > 0
    ? sortedServices.slice(0, 5)
    : (dbData?.services || []).slice(0, 5).map(s => ({ name: s.name, val: 0 }));

  const realTotalClients = dbData?.clients?.length || 0;
  const originCounts = {};
  (dbData?.clients || []).forEach(c => {
    const origin = String(c.origin || c.source || c.referral_source || 'Sin registrar').trim();
    originCounts[origin] = (originCounts[origin] || 0) + 1;
  });
  const originColors = ['var(--champagne)', 'rgba(255,255,255,0.6)', 'rgba(255,255,255,0.2)'];
  const originPercentages = Object.entries(originCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3)
    .map(([label, count], index) => {
      const pct = realTotalClients ? Math.round((count / realTotalClients) * 100) : 0;
      return { label, val: `${pct}%`, color: originColors[index], pct };
    });
  let originGradientOffset = 0;
  const originGradient = originPercentages.length
    ? `conic-gradient(${originPercentages.map(origin => {
        const start = originGradientOffset;
        originGradientOffset += origin.pct;
        return `${origin.color} ${start}% ${originGradientOffset}%`;
      }).join(', ')})`
    : 'conic-gradient(rgba(255,255,255,0.04) 0 100%)';

  const currentMonthAmountReal = stats?.monthlyIncome || 0;

  const [isEditingGoals, setIsEditingGoals] = useState(false);
  const [monthlyGoal, setMonthlyGoal] = useState(() => {
    const val = parseFloat(localStorage.getItem('panda_monthly_goal') || '35000');
    return val < 1000 ? val * 1000 : val;
  });
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const [selectedChair, setSelectedChair] = useState(null);
  const [checkoutChairModal, setCheckoutChairModal] = useState(null);

  const chairsScrollRef = React.useRef(null);
  const isDraggingChairsRef = React.useRef(false);
  const startXChairsRef = React.useRef(0);
  const scrollLeftChairsRef = React.useRef(0);

  const handleChairsMouseDown = (e) => {
    isDraggingChairsRef.current = true;
    startXChairsRef.current = e.pageX - (chairsScrollRef.current?.offsetLeft || 0);
    scrollLeftChairsRef.current = chairsScrollRef.current?.scrollLeft || 0;
  };

  const handleChairsMouseLeaveOrUp = () => {
    isDraggingChairsRef.current = false;
  };

  const handleChairsMouseMove = (e) => {
    if (!isDraggingChairsRef.current || !chairsScrollRef.current) return;
    e.preventDefault();
    const x = e.pageX - chairsScrollRef.current.offsetLeft;
    const walk = (x - startXChairsRef.current) * 1.5;
    chairsScrollRef.current.scrollLeft = scrollLeftChairsRef.current - walk;
  };
  const [modalPaymentMethod, setModalPaymentMethod] = useState('Efectivo');
  const [isProcessingCheckout, setIsProcessingCheckout] = useState(false);
  const [showNewClientModal, setShowNewClientModal] = useState(false);
  const [showCheckoutPopup, setShowCheckoutPopup] = useState(false);
  const [showAttendancePopup, setShowAttendancePopup] = useState(false);
  const [showReceptionPopup, setShowReceptionPopup] = useState(false);
  const [showInventoryPopup, setShowInventoryPopup] = useState(false);
  const [showSchedulePopup, setShowSchedulePopup] = useState(false);

  // Interruptor manual Abierto/Cerrado de la barbería (system_settings.store_is_open).
  // Abierto => el portal público toma reservas 24 h; Cerrado => nadie puede agendar y los
  // horarios salen bloqueados. Sin valor => se asume Abierto.
  const [storeOpen, setStoreOpen] = useState(true);
  const [storeToggling, setStoreToggling] = useState(false);
  // Búsqueda colapsable: por defecto solo se ve el ícono de lupa; al hacer click se
  // expande a la barra y se enfoca.
  const [searchExpanded, setSearchExpanded] = useState(false);
  useEffect(() => {
    if (searchExpanded) searchContainerRef.current?.querySelector('input')?.focus();
  }, [searchExpanded]);

  useEffect(() => {
    let alive = true;
    dataService.getSystemSettings()
      .then(settings => {
        if (!alive) return;
        const raw = settings?.store_is_open;
        setStoreOpen(raw === undefined || raw === null ? true : String(raw) !== 'false');
      })
      .catch(() => {});
    return () => { alive = false; };
  }, []);

  const toggleStoreOpen = async () => {
    if (storeToggling) return;
    const next = !storeOpen;
    setStoreToggling(true);
    setStoreOpen(next); // optimista
    try {
      await dataService.updateSystemSetting('store_is_open', next ? 'true' : 'false');
      showToast(next ? 'Clínica ABIERTA — reservas 24 h activas' : 'Clínica CERRADA — reservas bloqueadas', next ? 'success' : 'info');
    } catch {
      setStoreOpen(!next); // revertir si falla
      showToast('No se pudo cambiar el estado de la clínica', 'error');
    } finally {
      setStoreToggling(false);
    }
  };

  useEffect(() => {
    const fetchChairData = async () => {
      try {
        const [activeApps, queue] = await Promise.all([
          dataService.getAppointmentsByState(['En Silla', 'Agendado']),
          dataService.getTurnQueue().catch(() => [])
        ]);
        setRealtimeAppointments(activeApps || []);
        setAttendanceQueue(queue || []);
      } catch (e) {
        console.error("Error fetching realtime chair data:", e);
      }
    };
    fetchChairData();
    const interval = setInterval(fetchChairData, 1500000);
    return () => clearInterval(interval);
  }, []);

  const handleQuickCheckout = async () => {
    if (!checkoutChairModal) return;
    try {
      setIsProcessingCheckout(true);
      const chair = checkoutChairModal;
      
      await dataService.processFinalPayment({
        appointmentId: chair.appointmentId,
        appointmentIds: [chair.appointmentId],
        paymentMethod: modalPaymentMethod,
        totalAmountUsd: chair.rawPrice || 0,
        staffInvolved: chair.appointment?.staff_id ? [{ staffId: chair.appointment.staff_id, role: 'barber', amountUsd: chair.rawPrice || 0 }] : []
      });

      showToast(`¡Cobro de ${chair.price} registrado con éxito! Sillón liberado.`);
      setCheckoutChairModal(null);
      
      const activeApps = await dataService.getAppointmentsByState(['En Silla', 'Agendado']);
      setRealtimeAppointments(activeApps || []);
      if (onRefresh) onRefresh();
    } catch (err) {
      console.error("Error processing quick checkout:", err);
      showToast("Error al procesar el cobro", "error");
    } finally {
      setIsProcessingCheckout(false);
    }
  };

  const formatElapsedTime = React.useCallback((startedAt) => {
    if (!startedAt) return '00:00 min';
    const start = new Date(startedAt);
    const now = currentTime;
    const diffMs = Math.max(0, now.getTime() - start.getTime());
    const totalSecs = Math.floor(diffMs / 1000);

    if (totalSecs < 3600) {
      const mins = Math.floor(totalSecs / 60);
      const secs = String(totalSecs % 60).padStart(2, '0');
      return `${mins}:${secs} min`;
    } else {
      const hrs = Math.floor(totalSecs / 3600);
      const mins = Math.floor((totalSecs % 3600) / 60);
      return `${hrs}h ${mins}m`;
    }
  }, [currentTime]);

  const allChairsData = React.useMemo(() => {
    const activeInChair = realtimeAppointments.filter(a => a.status === 'En Silla');
    const result = [];

    for (let i = 1; i <= 7; i++) {
      const chairId = String(i).padStart(2, '0');
      const activeApp = activeInChair[i - 1];

      if (activeApp) {
        const elapsedStr = formatElapsedTime(activeApp.started_at || activeApp.created_at);

        const priceVal = activeApp.total_price || activeApp.services?.price || 0;
        const priceStr = `$${priceVal}`;

        const barber = activeApp.staff || {};
        const barberName = barber.name || activeApp.staff_name || `Odontólogo`;

        result.push({
          id: chairId,
          appointmentId: activeApp.id,
          type: barberName,
          barberAvatar: barber.image_url,
          name: activeApp.clients?.name || activeApp.client_name || 'Cliente',
          service: activeApp.services?.name || 'Servicio',
          price: priceStr,
          rawPrice: priceVal,
          elapsed: elapsedStr,
          status: 'En servicio',
          glowClass: 'chair-halo-en-servicio',
          statusColor: '#ef4444',
          isOccupied: true,
          appointment: activeApp
        });
      } else {
        result.push({
          id: chairId,
          type: `Sillón ${chairId}`,
          status: 'Disponible',
          glowClass: 'chair-halo-disponible',
          statusColor: '#22c55e',
          info: 'Disponible',
          isOccupied: false
        });
      }
    }
    return result;
  }, [realtimeAppointments, formatElapsedTime]);

  const monthlyProgressReal = Math.round((currentMonthAmountReal / (monthlyGoal || 1)) * 100);
  const percentChange = (current, previous) => {
    const currentValue = Number(current || 0);
    const previousValue = Number(previous || 0);
    if (previousValue === 0) return currentValue === 0 ? 0 : null;
    return Math.round(((currentValue - previousValue) / Math.abs(previousValue)) * 100);
  };
  const renderComparison = (current, previous, label) => {
    const change = percentChange(current, previous);
    if (change === null) {
      return <><span style={{ fontSize: '7px' }}>●</span> Sin base <span style={{ color: 'rgba(255,255,255,0.3)', fontWeight: '500' }}>{label}</span></>;
    }
    const isUp = change > 0;
    const isDown = change < 0;
    return (
      <>
        <span style={{ fontSize: '7px' }}>{isUp ? '▲' : isDown ? '▼' : '●'}</span>
        {Math.abs(change)}%
        <span style={{ color: 'rgba(255,255,255,0.3)', fontWeight: '500' }}>{label}</span>
      </>
    );
  };

  const formattedTime = currentTime.toLocaleTimeString('es-ES', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  }).toLowerCase();

  const weekdayName = currentTime.toLocaleDateString('es-ES', { weekday: 'long' });
  const capitalizedWeekday = weekdayName.charAt(0).toUpperCase() + weekdayName.slice(1);

  const monthNames = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];

  const formattedDate = capitalizedWeekday + ', ' + currentTime.getDate() + ' de ' + monthNames[currentTime.getMonth()].toLowerCase() + ' de ' + currentTime.getFullYear();
  
  const currentMonthName = `${monthNames[currentTime.getMonth()]} ${currentTime.getFullYear()}`;
  const currentDateVal = currentTime.getDate();

  const firstDayIndex = (new Date(currentTime.getFullYear(), currentTime.getMonth(), 1).getDay() + 6) % 7;
  const totalDays = new Date(currentTime.getFullYear(), currentTime.getMonth() + 1, 0).getDate();
  const prevMonthTotalDays = new Date(currentTime.getFullYear(), currentTime.getMonth(), 0).getDate();

  const daysGrid = [];
  for (let i = firstDayIndex - 1; i >= 0; i--) {
    daysGrid.push({ day: prevMonthTotalDays - i, isCurrentMonth: false });
  }
  for (let i = 1; i <= totalDays; i++) {
    daysGrid.push({ day: i, isCurrentMonth: true });
  }
  const gridLength = daysGrid.length > 35 ? 42 : 35;
  const suffixDays = gridLength - daysGrid.length;
  for (let i = 1; i <= suffixDays; i++) {
    daysGrid.push({ day: i, isCurrentMonth: false });
  }

  // Week revenues line chart — premium champagne glow style
  const weeklyChartData = {
    labels: ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'],
    datasets: [
      {
        data: chartData?.datasets?.[0]?.data || [0, 0, 0, 0, 0, 0, 0],
        borderColor: '#111111',
        borderWidth: 2.5,
        pointBackgroundColor: '#111111',
        pointBorderColor: '#e9eae8',
        pointBorderWidth: 2,
        pointRadius: 4,
        pointHoverRadius: 7,
        pointHoverBackgroundColor: '#111111',
        tension: 0.45,
        fill: true,
        backgroundColor: (context) => {
          const chart = context.chart;
          const { ctx, chartArea } = chart;
          if (!chartArea) return null;
          const gradient = ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
          gradient.addColorStop(0, 'rgba(17, 17, 17, 0.18)');
          gradient.addColorStop(0.6, 'rgba(17, 17, 17, 0.04)');
          gradient.addColorStop(1, 'rgba(17, 17, 17, 0.0)');
          return gradient;
        },
      }
    ]
  };

  // Month revenues line chart — same premium styling, daily granularity
  const monthlyLineChartData = {
    labels: monthlyChartData?.labels || [],
    datasets: [
      {
        data: monthlyChartData?.datasets?.[0]?.data || [],
        borderColor: '#111111',
        borderWidth: 2.5,
        pointBackgroundColor: '#111111',
        pointBorderColor: '#e9eae8',
        pointBorderWidth: 2,
        pointRadius: 0,
        pointHoverRadius: 6,
        pointHoverBackgroundColor: '#111111',
        tension: 0.35,
        fill: true,
        backgroundColor: (context) => {
          const chart = context.chart;
          const { ctx, chartArea } = chart;
          if (!chartArea) return null;
          const gradient = ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
          gradient.addColorStop(0, 'rgba(17, 17, 17, 0.18)');
          gradient.addColorStop(0.6, 'rgba(17, 17, 17, 0.04)');
          gradient.addColorStop(1, 'rgba(17, 17, 17, 0.0)');
          return gradient;
        },
      }
    ]
  };

  const incomePeriodOptions = [
    { id: 'week', label: 'Esta semana' },
    { id: 'month', label: 'Este mes' }
  ];
  const activeIncomePeriodLabel = incomePeriodOptions.find(opt => opt.id === incomePeriod)?.label || 'Esta semana';
  const activeChartData = incomePeriod === 'month' ? monthlyLineChartData : weeklyChartData;
  const activeIncomeAmount = incomePeriod === 'month' ? (stats?.monthlyIncome || 0) : weeklyIncomeAmount;
  const activeIncomePrevious = incomePeriod === 'month' ? stats?.previousMonthIncome : stats?.previousWeekIncome;
  const activeIncomeCompareLabel = incomePeriod === 'month' ? 'vs mes anterior' : 'vs semana anterior';

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: 'var(--bg-secondary)',
        titleColor: '#f8f8f8',
        bodyColor: '#111111',
        borderColor: 'rgba(17, 17, 17,0.15)',
        borderWidth: 1,
        padding: 10,
        cornerRadius: 10,
        displayColors: false,
        callbacks: {
          label: (context) => {
            const val = Number(context.parsed.y ?? context.raw ?? 0);
            return `$${val.toFixed(2)}`;
          }
        }
      }
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { color: 'rgba(255,255,255,0.4)', font: { size: 9, weight: '600', family: 'Outfit' }, maxTicksLimit: 7, autoSkip: true }
      },
      y: {
        grid: { color: 'rgba(255,255,255,0.025)', drawBorder: false },
        ticks: {
          color: 'rgba(255,255,255,0.35)',
          font: { size: 8, weight: '500', family: 'Outfit' },
          callback: (value) => `$${Number(value).toFixed(2)}`
        }
      }
    }
  };

  // Sillones representados en el estado local editable.

  return (
    <div style={{ 
      paddingBottom: '0px', 
      display: 'flex', 
      flexDirection: 'column',
      position: 'relative',
      overflowX: 'hidden',
      overflowY: (isMobile || isTablet) ? 'auto' : 'hidden',
      flex: (isMobile || isTablet) ? 'none' : 1,
      height: '100%',
      minHeight: 0,
      backgroundColor: 'transparent',
    }}>
      {!isMobile && (
        <style>{`
          html, body, #root, .app-container, .main-content {
            overflow: hidden !important;
            height: 100vh !important;
            max-height: 100vh !important;
            min-height: 100vh !important;
            touch-action: none !important;
          }
        `}</style>
      )}
      {/* Ambient glowing background orbs — deep & cinematic */}
      <div className="l-dashboard-orb l-orb-1" />
      <div className="l-dashboard-orb l-orb-2" />
      <div className="l-dashboard-orb l-orb-3" />

      {/* Premium Dashboard Header (Mockup Style) */}
      {!isMobile && (
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '4px 8px 20px 8px',
          backgroundColor: 'transparent',
          zIndex: 2,
          flexShrink: 0
        }}>
          {/* Welcome Greeting */}
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <h1 style={{
              fontSize: '21px',
              fontWeight: '700',
              color: 'white',
              letterSpacing: '-0.3px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              margin: 0
            }}>
              ¡Buenos días, Dientes Sanos!
              <span className="wave-hand-span" style={{ display: 'inline-flex', alignItems: 'center', opacity: 0.85 }}>
                <svg
                  width="19"
                  height="19"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="var(--champagne)"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  style={{
                    marginLeft: '6px',
                    transformOrigin: '70% 70%',
                    animation: 'wave-animation 2.5s infinite'
                  }}
                >
                  <path d="M18 11V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v5" />
                  <path d="M14 10V4a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v8" />
                  <path d="M10 10.5V5.5a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v8" />
                  <path d="M6 11.5V9a1.5 1.5 0 0 0-1.5-1.5v0A1.5 1.5 0 0 0 3 9v7.5A6.5 6.5 0 0 0 9.5 23h3.75A5.75 5.75 0 0 0 19 17.25V11" />
                </svg>
              </span>
            </h1>
            <span style={{ fontSize: '12.5px', color: 'rgba(255,255,255,0.4)', fontWeight: '500', marginTop: '3px' }}>
              {formattedTime} &middot; {formattedDate}
            </span>
          </div>

          {/* Toggle Abierto/Cerrado, Búsqueda, Tasas & + Nueva cita */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {/* Interruptor Abierto/Cerrado (movido aquí desde el saludo) */}
            <button
              onClick={toggleStoreOpen}
              disabled={storeToggling}
              title={storeOpen ? 'Clínica abierta (reservas 24 h) — click para cerrar' : 'Clínica cerrada — click para abrir'}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '6px', flexShrink: 0,
                height: '40px', padding: '0 14px', borderRadius: '12px', whiteSpace: 'nowrap', boxSizing: 'border-box',
                cursor: storeToggling ? 'wait' : 'pointer',
                fontSize: '13px', fontWeight: '600',
                transition: 'all 0.2s ease',
                border: '1px solid rgba(255,255,255,0.06)',
                background: 'rgba(255,255,255,0.03)',
                color: 'rgba(255,255,255,0.85)',
                opacity: storeToggling ? 0.6 : 1,
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.color = '#fff'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; e.currentTarget.style.color = 'rgba(255,255,255,0.85)'; }}
            >
              <span style={{ display: 'inline-flex', width: '6px', height: '6px', borderRadius: '999px', background: storeOpen ? '#34C759' : '#FF3B30' }} />
              {storeOpen ? 'Abierta' : 'Cerrada'}
            </button>

            {/* Lupa colapsada — se muestra solo cuando la barra está cerrada */}
            {!searchExpanded && (
              <button
                type="button"
                onClick={() => setSearchExpanded(true)}
                title="Buscar citas, clientes, Odontólogos…"
                style={{ width: '40px', height: '40px', flexShrink: 0, borderRadius: '12px', display: 'grid', placeItems: 'center', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.6)', cursor: 'pointer', transition: 'all 0.2s ease' }}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.07)'; e.currentTarget.style.color = 'var(--champagne)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.color = 'rgba(255,255,255,0.6)'; }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
              </button>
            )}

            {/* Search Input Bar — oculta hasta expandir con la lupa */}
            <div ref={searchContainerRef} style={{
              position: 'relative',
              width: isMobile ? '100%' : '260px',
              zIndex: 120,
              display: searchExpanded ? 'block' : 'none'
            }}>
              <input 
                type="text" 
                placeholder="Buscar citas, clientes, Odontólogos..." 
                value={globalSearch}
                onChange={(event) => {
                  setGlobalSearch(event.target.value);
                  setIsSearchOpen(true);
                  setActiveSearchIndex(-1);
                }}
                onKeyDown={handleGlobalSearchKeyDown}
                style={{
                  width: '100%',
                  height: '40px',
                  boxSizing: 'border-box',
                  padding: '0 12px 0 36px',
                  borderRadius: '12px',
                  backgroundColor: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.06)',
                  color: 'white',
                  fontSize: '13px',
                  outline: 'none',
                  transition: 'all 0.2s ease'
                }}
                onFocus={(e) => {
                  setIsSearchOpen(true);
                  e.target.style.backgroundColor = 'rgba(255,255,255,0.07)';
                  e.target.style.borderColor = 'rgba(17, 17, 17, 0.3)';
                }}
                onBlur={(e) => {
                  e.target.style.backgroundColor = 'rgba(255,255,255,0.04)';
                  e.target.style.borderColor = 'rgba(255,255,255,0.06)';
                  // Si la barra queda vacía al perder el foco, vuelve al ícono de lupa.
                  // 150 ms de gracia para que un click en un resultado alcance a dispararse.
                  setTimeout(() => {
                    if (!searchContainerRef.current?.querySelector('input')?.value) setSearchExpanded(false);
                  }, 150);
                }}
              />
              <svg 
                style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', opacity: 0.4 }}
                width="14" 
                height="14" 
                viewBox="0 0 24 24" 
                fill="none" 
                stroke="white" 
                strokeWidth="2.5" 
                strokeLinecap="round" 
                strokeLinejoin="round"
              >
                <circle cx="11" cy="11" r="8"></circle>
                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
              </svg>
              {searchDropdownMounted && (
                <div
                  role="listbox"
                  style={{
                    position: 'absolute',
                    top: 'calc(100% + 8px)',
                    left: 0,
                    right: 0,
                    padding: '6px',
                    borderRadius: '12px',
                    background: 'var(--bg-secondary)',
                    border: '1px solid rgba(17, 17, 17, 0.2)',
                    boxShadow: '0 18px 45px rgba(0,0,0,0.55)',
                    maxHeight: '340px',
                    overflowY: 'auto',
                    pointerEvents: searchDropdownClosing ? 'none' : 'auto',
                    animation: searchDropdownClosing ? 'scaleOut 0.13s ease-in forwards' : 'scaleIn 0.15s cubic-bezier(0.16, 1, 0.3, 1)',
                    transformOrigin: 'top center'
                  }}
                >
                  {globalSearchResults.length > 0 ? globalSearchResults.map((result, index) => {
                    const ResultIcon = result.type === 'client'
                      ? User
                      : result.type === 'appointment'
                        ? Calendar
                        : ScissorsIcon;
                    const typeLabel = result.type === 'client'
                      ? 'Cliente'
                      : result.type === 'appointment'
                        ? 'Cita'
                        : 'Equipo';
                    const isActive = index === activeSearchIndex;

                    return (
                      <button
                        key={result.id}
                        type="button"
                        role="option"
                        aria-selected={isActive}
                        onMouseEnter={() => setActiveSearchIndex(index)}
                        onClick={() => selectGlobalSearchResult(result)}
                        style={{
                          width: '100%',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '10px',
                          padding: '9px 10px',
                          border: 'none',
                          borderRadius: '9px',
                          background: isActive ? 'rgba(17, 17, 17, 0.12)' : 'transparent',
                          color: 'white',
                          cursor: 'pointer',
                          textAlign: 'left'
                        }}
                      >
                        <span style={{
                          width: '30px',
                          height: '30px',
                          flexShrink: 0,
                          display: 'grid',
                          placeItems: 'center',
                          borderRadius: '8px',
                          color: 'var(--champagne)',
                          background: 'rgba(17, 17, 17, 0.09)',
                          border: '1px solid rgba(17, 17, 17, 0.14)'
                        }}>
                          <ResultIcon size={15} />
                        </span>
                        <span style={{ minWidth: 0, flex: 1 }}>
                          <span style={{
                            display: 'block',
                            fontSize: '12px',
                            fontWeight: 750,
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis'
                          }}>
                            {result.title}
                          </span>
                          <span style={{
                            display: 'block',
                            marginTop: '2px',
                            fontSize: '10px',
                            color: 'rgba(255,255,255,0.46)',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis'
                          }}>
                            {result.subtitle}
                          </span>
                        </span>
                        <span style={{
                          flexShrink: 0,
                          fontSize: '8px',
                          fontWeight: 800,
                          letterSpacing: '0.5px',
                          textTransform: 'uppercase',
                          color: 'rgba(17, 17, 17, 0.7)'
                        }}>
                          {typeLabel}
                        </span>
                      </button>
                    );
                  }) : (
                    <div style={{
                      padding: '18px 12px',
                      textAlign: 'center',
                      fontSize: '11px',
                      color: 'rgba(255,255,255,0.45)'
                    }}>
                      No se encontraron coincidencias
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Divider between utility zone and rates+alerts zone */}
            {rates && <div style={{ width: '1px', height: '24px', background: 'rgba(255,255,255,0.08)', flexShrink: 0 }} />}

            {/* Rate Toggle Card — segmented control with soft dividers instead of boxed chips */}
            {rates && (
              <div style={{
                height: '40px',
                boxSizing: 'border-box',
                padding: '0 2px',
                display: 'flex',
                alignItems: 'center',
                borderRadius: '12px',
                border: '1px solid rgba(255,255,255,0.06)',
                backgroundColor: 'rgba(255, 255, 255, 0.02)'
              }}>
                {/* BCV Button */}
                <button
                  onClick={() => onToggleRateType('bcv')}
                  style={{
                    height: '32px',
                    padding: '0 12px',
                    borderRadius: '9px',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '1px',
                    transition: 'background 0.3s ease',
                    background: activeRateType === 'bcv' ? 'rgba(34, 197, 94, 0.1)' : 'transparent',
                    border: 'none',
                    boxShadow: 'none'
                  }}
                >
                  <span style={{
                    fontSize: '8px',
                    fontWeight: '800',
                    color: activeRateType === 'bcv' ? '#22c55e' : 'rgba(255,255,255,0.5)',
                    letterSpacing: '0.5px'
                  }}>
                    BCV
                  </span>
                  <span style={{
                    fontSize: '12px',
                    fontWeight: '800',
                    color: activeRateType === 'bcv' ? '#22c55e' : 'white'
                  }}>
                    {rates.bcv > 0 ? rates.bcv.toFixed(2) : '—'}
                  </span>
                </button>

                <div style={{ width: '1px', height: '20px', background: 'rgba(255,255,255,0.06)' }} />

                {/* EURO Button */}
                <button
                  onClick={() => onToggleRateType('euro')}
                  style={{
                    height: '32px',
                    padding: '0 12px',
                    borderRadius: '9px',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '1px',
                    transition: 'background 0.3s ease',
                    background: activeRateType === 'euro' ? 'rgba(34, 197, 94, 0.1)' : 'transparent',
                    border: 'none',
                    boxShadow: 'none'
                  }}
                >
                  <span style={{
                    fontSize: '8px',
                    fontWeight: '800',
                    color: activeRateType === 'euro' ? '#22c55e' : 'rgba(255,255,255,0.5)',
                    letterSpacing: '0.5px'
                  }}>
                    EURO
                  </span>
                  <span style={{
                    fontSize: '12px',
                    fontWeight: '800',
                    color: activeRateType === 'euro' ? '#22c55e' : 'white'
                  }}>
                    {rates.euro > 0 ? rates.euro.toFixed(2) : '—'}
                  </span>
                </button>

                <div style={{ width: '1px', height: '20px', background: 'rgba(255,255,255,0.06)' }} />

                {/* Gap indicator */}
                <div style={{
                  height: '32px',
                  padding: '0 10px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '1px'
                }}>
                  <span style={{ fontSize: '7px', fontWeight: '800', color: 'rgba(255,255,255,0.5)' }}>BRECHA</span>
                  <span style={{
                    fontSize: '10px',
                    fontWeight: '950',
                    color: rates.gap > 10 ? '#ef4444' : '#22c55e'
                  }}>
                    {rates.gap > 0 ? rates.gap.toFixed(1) : '0'}%
                  </span>
                </div>
              </div>
            )}

            {/* Notification Bell */}
            <button
              onClick={onOpenNotifications}
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '12px',
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.06)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                position: 'relative',
                color: 'rgba(255,255,255,0.75)',
                flexShrink: 0,
                transition: 'all 0.2s',
              }}
              onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.07)'; e.currentTarget.style.color = 'var(--champagne)'; }}
              onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.04)'; e.currentTarget.style.color = 'rgba(255,255,255,0.75)'; }}
            >
              <Bell size={17} />
              {unreadCount > 0 && (
                <div style={{
                  position: 'absolute',
                  top: '6px',
                  right: '6px',
                  backgroundColor: 'var(--champagne)',
                  width: '7px',
                  height: '7px',
                  borderRadius: '50%',
                  border: '1.5px solid #121212'
                }} />
              )}
            </button>

            {/* + Nueva cita gold button */}
            {getRoleCategory(user?.role || '') !== 'odontologo' && (
            <button
              onClick={() => setShowSchedulePopup(true)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '10px 20px',
                borderRadius: '100px',
                background: 'var(--gold-gradient)',
                border: 'none',
                color: '#000000',
                fontWeight: '750',
                fontSize: '13px',
                cursor: 'pointer',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                boxShadow: '0 4px 12px rgba(255, 255, 255, 0.08)',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.transform = 'translateY(-1px)';
                e.currentTarget.style.boxShadow = '0 6px 18px rgba(255, 255, 255, 0.15)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(255, 255, 255, 0.08)';
              }}
            >
              <Plus size={16} strokeWidth={2.5} />
              Nueva cita
            </button>
            )}
          </div>
        </div>
      )}

      <div style={{
        display: 'flex',
        flexDirection: (isMobile || isTablet) ? 'column' : 'row',
        gap: '12px',
        flex: 1,
        height: '100%',
        minHeight: 0,
        padding: '0 4px',
        overflow: 'hidden'
      }}>

        {/* Left Column: Metrics & Main Dashboard Content */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
          flex: (isMobile || isTablet) ? '1 1 auto' : '3.4 1 0%',
          height: '100%',
          minWidth: 0,
          minHeight: 0,
          overflow: 'hidden'
        }}>
          
          {/* Top KPI Cards Row */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: isMobile ? '1fr' : 'repeat(4, minmax(0, 1fr))',
            gap: '8px',
            flexShrink: 0
          }}>
            {/* KPI Card 1: Citas Hoy */}
            <div className="glass-card" style={{ padding: '8px 10px', borderRadius: '12px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', height: '76px', backgroundColor: 'var(--bg-secondary)', border: '1px solid rgba(255,255,255,0.04)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', opacity: 0.7 }}>
                <span style={{ fontSize: '9px', fontWeight: '800', color: 'rgba(255,255,255,0.7)', letterSpacing: '0.5px' }}>CITAS HOY</span>
                <Calendar size={13} color="rgba(255,255,255,0.6)" />
              </div>
              <div style={{ fontSize: '18px', fontWeight: '900', color: 'white', margin: '1px 0' }}>
                {citasHoyCount}
              </div>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', fontSize: '9px', color: '#111111', fontWeight: '700' }}>
                {renderComparison(citasHoyCount, stats?.yesterdayAppointments, 'vs ayer')}
              </div>
            </div>

            {/* KPI Card 2: Facturado Hoy */}
            <div className="glass-card" style={{ padding: '8px 10px', borderRadius: '12px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', height: '76px', backgroundColor: 'var(--bg-secondary)', border: '1px solid rgba(255,255,255,0.04)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', opacity: 0.7 }}>
                <span style={{ fontSize: '9px', fontWeight: '800', color: 'rgba(255,255,255,0.7)', letterSpacing: '0.5px' }}>FACTURADO HOY</span>
                <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.6)', fontWeight: '800' }}>$</span>
              </div>
              <div style={{ fontSize: '18px', fontWeight: '900', color: 'white', margin: '1px 0' }}>
                ${formatCurrency(facturadoHoyAmount)}
              </div>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', fontSize: '9px', color: '#111111', fontWeight: '700' }}>
                {renderComparison(facturadoHoyAmount, stats?.yesterdayIncome, 'vs ayer')}
              </div>
            </div>

            {/* KPI Card 3: Clientes Nuevos */}
            <div className="glass-card" style={{ padding: '8px 10px', borderRadius: '12px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', height: '76px', backgroundColor: 'var(--bg-secondary)', border: '1px solid rgba(255,255,255,0.04)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', opacity: 0.7 }}>
                <span style={{ fontSize: '9px', fontWeight: '800', color: 'rgba(255,255,255,0.7)', letterSpacing: '0.5px' }}>CLIENTES NUEVOS</span>
                <Users size={13} color="rgba(255,255,255,0.6)" />
              </div>
              <div style={{ fontSize: '18px', fontWeight: '900', color: 'white', margin: '1px 0' }}>
                {clientesNuevosCount}
              </div>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', fontSize: '9px', color: '#111111', fontWeight: '700' }}>
                {renderComparison(clientesNuevosCount, stats?.newClientsYesterday, 'vs ayer')}
              </div>
            </div>

            {/* KPI Card 4: Staff pending arrival */}
            <div className="glass-card" style={{ padding: '8px 10px', borderRadius: '12px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', height: '76px', backgroundColor: 'var(--bg-secondary)', border: '1px solid rgba(255,255,255,0.04)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', opacity: 0.7 }}>
                <span style={{ fontSize: '9px', fontWeight: '800', color: 'rgba(255,255,255,0.7)', letterSpacing: '0.5px' }}>POR LLEGAR</span>
                <UserX size={13} color="rgba(255,255,255,0.6)" />
              </div>
              <div
                style={{ fontSize: '18px', fontWeight: '900', color: 'white', margin: '1px 0' }}
                title={barbersPendingArrival.length > 0 ? barbersPendingArrival.map(member => member.name).join(', ') : 'Todos los Odontólogos activos están presentes'}
              >
                {pendingBarbersCount}
              </div>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', fontSize: '9px', color: '#111111', fontWeight: '700' }}>
                <span style={{ fontSize: '7px' }}>●</span>
                {pendingBarbersCount === 0
                  ? 'Todos presentes'
                  : `${activeBarbers.length - pendingBarbersCount} de ${activeBarbers.length} presentes`}
              </div>
            </div>
          </div>

          {/* "Estado de los sillones" Real-time panel */}
          <div className="glass-card" style={{ 
            padding: '8px 12px', 
            borderRadius: '16px', 
            border: '1px solid rgba(255, 255, 255, 0.05)', 
            backgroundColor: 'var(--bg-secondary)',
            display: 'flex',
            flexDirection: 'column',
            flex: '1.2 1 0%',
            minHeight: 0,
            overflow: 'hidden'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', flexShrink: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h3 style={{ fontSize: '13px', fontWeight: '800', color: 'white', margin: 0, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Estado de sillones</h3>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', backgroundColor: 'rgba(255,255,255,0.03)', padding: '2px 8px', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <div style={{ width: '4px', height: '4px', borderRadius: '50%', backgroundColor: 'var(--champagne)' }} />
                  <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.5)', fontWeight: '600' }}>En tiempo real</span>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', fontWeight: '600' }}>Desliza ➔</span>
              </div>
            </div>

            <div 
              ref={chairsScrollRef}
              onMouseDown={handleChairsMouseDown}
              onMouseLeave={handleChairsMouseLeaveOrUp}
              onMouseUp={handleChairsMouseLeaveOrUp}
              onMouseMove={handleChairsMouseMove}
              className="panda-scrollbar"
              style={{
                display: 'flex',
                gap: '14px',
                flex: 1,
                minHeight: 0,
                alignItems: isMobile ? 'stretch' : 'center',
                overflowX: 'auto',
                overflowY: 'hidden',
                paddingBottom: '8px',
                WebkitOverflowScrolling: 'touch',
                scrollSnapType: 'x mandatory',
                scrollBehavior: 'smooth',
                cursor: 'grab'
              }}
            >
              {allChairsData.map((chair) => {
                 const isOccupied = chair.status === 'En servicio' || chair.status === 'Reservada';
                 const isCleaning = chair.status === 'Limpieza';
                 const isAvailable = chair.status === 'Disponible';

                return (
                  <div 
                    key={chair.id} 
                    onClick={() => {
                      if (chair.isOccupied) {
                        setCheckoutChairModal(chair);
                      } else if (chair.status === 'Disponible') {
                        setShowReceptionPopup(true);
                      } else {
                        setSelectedChair(chair);
                      }
                    }}
                    role={isAvailable ? 'button' : undefined}
                    tabIndex={isAvailable ? 0 : undefined}
                    onKeyDown={(event) => {
                      if (isAvailable && (event.key === 'Enter' || event.key === ' ')) {
                        event.preventDefault();
                        setShowReceptionPopup(true);
                      }
                    }}
                    title={isAvailable ? 'Abrir Recepción' : undefined}
                    style={{
                      flex: '0 0 auto',
                      width: isMobile ? '65vw' : '175px',
                      maxWidth: '200px',
                      scrollSnapAlign: 'start',
                      backgroundColor: 'var(--bg-secondary)',
                      border: `1.5px solid ${chair.statusColor || 'rgba(255,255,255,0.04)'}`,
                      borderRadius: '16px',
                      padding: '12px 14px',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      minHeight: '170px',
                      height: isMobile ? '100%' : '210px',
                      flexShrink: 0,
                      transition: 'background-color 0.3s ease, box-shadow 0.3s ease',
                      position: 'relative',
                      overflow: 'hidden',
                      cursor: 'pointer'
                    }}>
                    {/* Ring glow backdrop */}
                    <div className={`chair-halo ${chair.glowClass}`} />
                    
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', zIndex: 2, height: '40px', flexShrink: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center' }}>
                        {isOccupied ? (
                          chair.barberAvatar ? (
                            <img 
                              loading="lazy"
                              src={chair.barberAvatar} 
                              alt={chair.type} 
                              style={{ 
                                width: '40px', 
                                height: '40px', 
                                borderRadius: '50%', 
                                objectFit: 'cover',
                                border: '2px solid var(--champagne)',
                                boxShadow: '0 0 12px rgba(17, 17, 17, 0.6)',
                                transform: 'translate(-4px, -4px)'
                              }} 
                            />
                          ) : (
                            <div style={{
                              width: '40px',
                              height: '40px',
                              borderRadius: '50%',
                              backgroundColor: 'rgba(255, 255, 255, 0.1)',
                              border: '2px solid var(--champagne)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '12px',
                              fontWeight: '900',
                              color: 'var(--champagne)',
                              boxShadow: '0 0 12px rgba(17, 17, 17, 0.6)',
                              transform: 'translate(-4px, -4px)'
                            }}>
                              {chair.type ? chair.type.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() : ''}
                            </div>
                          )
                        ) : (
                          <span style={{ fontSize: '16px', fontWeight: '900', color: 'rgba(255,255,255,0.2)' }}>{chair.id}</span>
                        )}
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '2px', textAlign: 'right' }}>
                        <span style={{ fontSize: '10px', fontWeight: '900', color: 'white', letterSpacing: '0.3px', lineHeight: '1' }}>{chair.type}</span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <div style={{ width: '4px', height: '4px', borderRadius: '50%', backgroundColor: chair.statusColor }} />
                          <span style={{ fontSize: '8px', fontWeight: '800', color: chair.statusColor }}>{chair.status === 'En servicio' ? 'En tratamiento' : chair.status}</span>
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flex: 1, minHeight: 0, position: 'relative', zIndex: 2, margin: '4px 0' }}>
                       <img 
                        loading="lazy"
                        src="/barber-chair.png" 
                        alt="Sillón" 
                        style={{ 
                          maxHeight: '100%', 
                          maxWidth: '100%',
                          transform: isOccupied ? 'scale(1.38) translateY(2px)' : 'scale(1.35)',
                          transition: 'transform 0.3s ease',
                          objectFit: 'contain',
                          filter: isAvailable ? 'brightness(0.3) grayscale(0.5)' : isCleaning ? 'brightness(0.5) drop-shadow(0 8px 16px rgba(0,0,0,0.65))' : 'drop-shadow(0 8px 16px rgba(0,0,0,0.65))',
                          zIndex: 2
                        }} 
                      />
                    </div>

                    <div style={{ zIndex: 2, marginTop: 'auto', height: '36px', display: 'flex', flexDirection: 'column', justifyContent: 'center', flexShrink: 0 }}>
                      {/* Sub-widget based on status */}
                      {isOccupied && (
                        <div style={{ 
                          backgroundColor: 'var(--bg-secondary)', 
                          borderRadius: '8px', 
                          padding: '4px 8px',
                          border: '1px solid rgba(255,255,255,0.03)',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          height: '100%',
                          boxSizing: 'border-box'
                        }}>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: '10px', fontWeight: '800', color: 'white', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{chair.name}</div>
                            <div style={{ fontSize: '8.5px', color: 'rgba(255,255,255,0.75)', fontWeight: '600', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{chair.service}</div>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: '10px', fontWeight: '900', color: 'var(--champagne)' }}>{chair.price}</div>
                            <div style={{ fontSize: '8px', color: 'rgba(255,255,255,0.75)', fontWeight: '600' }}>{chair.elapsed}</div>
                          </div>
                        </div>
                      )}

                      {isCleaning && (
                        <div style={{ 
                          backgroundColor: 'var(--bg-secondary)', 
                          borderRadius: '8px', 
                          padding: '4px 6px',
                          border: '1px solid rgba(255,255,255,0.03)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '6px',
                          height: '100%',
                          boxSizing: 'border-box'
                        }}>
                          <Clock size={11} color="var(--champagne)" />
                          <span style={{ fontSize: '9px', color: 'rgba(255,255,255,0.6)', fontWeight: '600' }}>Disponible en 10 min</span>
                        </div>
                      )}

                      {isAvailable && (
                        <div style={{ 
                          backgroundColor: 'var(--bg-secondary)', 
                          borderRadius: '8px', 
                          padding: '4px 6px',
                          border: '1px solid rgba(255,255,255,0.03)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: '6px',
                          height: '100%',
                          boxSizing: 'border-box'
                        }}>
                          <span style={{ fontSize: '9px', color: 'rgba(255,255,255,0.5)', fontWeight: '600' }}>{chair.info}</span>
                          <button 
                            onClick={(event) => {
                              event.stopPropagation();
                              setShowReceptionPopup(true);
                            }}
                            aria-label="Abrir Recepción"
                            title="Abrir Recepción"
                            style={{
                              width: '16px',
                              height: '16px',
                              borderRadius: '4px',
                              backgroundColor: 'rgba(255,255,255,0.06)',
                              border: '1px solid rgba(255,255,255,0.1)',
                              color: 'white',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              cursor: 'pointer',
                              fontSize: '11px',
                              fontWeight: '800'
                            }}
                          >
                            +
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Bottom Row: Top Odontólogos (Podium + List) and Top Services */}
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: isMobile ? '1fr' : '2.1fr 0.9fr', 
            gap: '8px',
            flex: '0 1 auto',
            minHeight: 0
          }}>
            {/* 1. Top Odontólogos Card */}
            <div className="glass-card" style={{ padding: '8px 10px', borderRadius: '16px', backgroundColor: 'var(--bg-secondary)', border: '1px solid rgba(255,255,255,0.05)', display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
              {/* Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px', flexShrink: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Crown size={14} color="var(--champagne)" fill="var(--champagne)" />
                  <span style={{ fontSize: '10px', fontWeight: '800', color: 'white', letterSpacing: '0.5px', textTransform: 'uppercase' }}>Top Odontólogos</span>
                </div>
                <span style={{ fontSize: '8.5px', fontWeight: '700', color: 'var(--champagne)', backgroundColor: 'rgba(17, 17, 17, 0.1)', padding: '2px 8px', borderRadius: '100px', border: '1px solid rgba(17, 17, 17, 0.2)' }}>
                  MES EN CURSO
                </span>
              </div>

              {/* 🏆 ALL BARBERS PODIUMS SIDE-BY-SIDE STAGE */}
              <div style={{ 
                flex: 1, 
                minHeight: 0, 
                display: 'flex', 
                justifyContent: sortedStaff.length <= 4 ? 'space-around' : 'flex-start',
                alignItems: 'flex-end', 
                padding: '16px 8px 6px 8px', 
                overflowX: 'auto',
                gap: '10px'
              }} className="panda-scrollbar">
                {sortedStaff.length === 0 ? (
                  <div style={{ width: '100%', textAlign: 'center', color: 'rgba(255,255,255,0.4)', fontSize: '11px', padding: '20px' }}>
                    No hay Odontólogos registrados
                  </div>
                ) : (
                  sortedStaff.map((barber, rankIndex) => {
                    const rank = rankIndex + 1;
                    const isTop1 = rank === 1;
                    const isTop2 = rank === 2;
                    const isTop3 = rank === 3;

                    // Styling based on rank
                    const borderColor = isTop1 ? 'var(--champagne)' : isTop2 ? '#a1a1aa' : isTop3 ? '#b45309' : 'rgba(255,255,255,0.2)';
                    const rankBg = isTop1 ? 'var(--champagne)' : isTop2 ? '#a1a1aa' : isTop3 ? '#b45309' : 'rgba(255,255,255,0.15)';
                    const textColor = isTop1 ? '#000' : isTop2 ? '#000' : isTop3 ? '#fff' : '#fff';

                    // Compact podium heights to fit cleanly
                    const blockHeight = isTop1 ? '42px' : isTop2 ? '30px' : isTop3 ? '22px' : rank === 4 ? '16px' : rank === 5 ? '12px' : rank === 6 ? '10px' : '8px';
                    const avatarSize = isTop1 ? '40px' : isTop2 ? '34px' : isTop3 ? '32px' : '28px';
                    const elevateY = '0px';

                    const bgGradient = isTop1
                      ? 'linear-gradient(to bottom, rgba(17, 17, 17, 0.4), rgba(17, 17, 17, 0.05))'
                      : isTop2
                      ? 'linear-gradient(to bottom, rgba(161, 161, 170, 0.28), rgba(161, 161, 170, 0.03))'
                      : isTop3
                      ? 'linear-gradient(to bottom, rgba(180, 83, 9, 0.28), rgba(180, 83, 9, 0.03))'
                      : 'linear-gradient(to bottom, rgba(255, 255, 255, 0.08), rgba(255, 255, 255, 0.02))';

                    return (
                      <div
                        key={barber.id || rankIndex}
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          flex: '1 1 0%',
                          minWidth: '65px',
                          transform: `translateY(${elevateY})`,
                          transition: 'all 0.3s ease'
                        }}
                      >
                        {/* Avatar Frame with Border & Floating Crown if #1 */}
                        <div style={{ position: 'relative', marginBottom: '6px' }}>
                          {isTop1 && (
                            <div style={{ position: 'absolute', top: '-13px', left: '50%', transform: 'translateX(-50%)', zIndex: 2 }}>
                              <Crown size={14} color="var(--champagne)" fill="var(--champagne)" />
                            </div>
                          )}
                          <div style={{
                            width: avatarSize,
                            height: avatarSize,
                            borderRadius: '12px',
                            border: isTop1 ? '2.5px solid var(--champagne)' : `2px solid ${borderColor}`,
                            boxShadow: isTop1 ? '0 0 16px rgba(17, 17, 17, 0.65)' : '0 2px 6px rgba(0,0,0,0.3)',
                            padding: '2px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            backgroundColor: isTop1 ? 'rgba(17, 17, 17, 0.1)' : 'rgba(0,0,0,0.3)'
                          }}>
                            {barber.image_url ? (
                               <img loading="lazy" src={barber.image_url} alt={barber.name} style={{ width: '100%', height: '100%', borderRadius: '8px', objectFit: 'cover' }} />
                            ) : (
                              <span style={{ fontSize: isTop1 ? '15px' : '12px', fontWeight: '900', color: borderColor }}>
                                {barber.name ? barber.name.charAt(0).toUpperCase() : 'B'}
                              </span>
                            )}
                          </div>
                          {/* Rank Badge */}
                          <div style={{
                            position: 'absolute',
                            bottom: '-6px',
                            left: '50%',
                            transform: 'translateX(-50%)',
                            width: '15px',
                            height: '15px',
                            borderRadius: '50%',
                            backgroundColor: rankBg,
                            color: textColor,
                            fontSize: '8.5px',
                            fontWeight: '950',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            boxShadow: '0 2px 4px rgba(0,0,0,0.6)'
                          }}>
                            {rank}
                          </div>
                        </div>

                        {/* Info */}
                        <span style={{ fontSize: isTop1 ? '11.5px' : '10.5px', fontWeight: '900', color: 'white', marginTop: '4px', textAlign: 'center', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', width: '100%' }}>
                          {getShortName(barber.name)}
                        </span>
                        <span style={{ fontSize: isTop1 ? '11px' : '9.5px', fontWeight: '900', color: isTop1 ? 'var(--champagne)' : 'rgba(255,255,255,0.85)', marginTop: '1px' }}>
                          ${formatCurrency(barber.stats?.monthlyIncome || 0)}
                        </span>

                        {/* Podium Block */}
                        <div style={{
                          width: '80%',
                          maxWidth: '44px',
                          height: blockHeight,
                          background: bgGradient,
                          borderTop: `1.5px solid ${borderColor}`,
                          borderLeft: `1.5px solid ${borderColor}`,
                          borderRight: `1.5px solid ${borderColor}`,
                          borderBottom: 'none',
                          borderRadius: '6px 6px 0 0',
                          marginTop: '6px'
                        }} />
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* 2. Servicios más vendidos */}
            <div className="glass-card" style={{ padding: '10px 12px', borderRadius: '16px', backgroundColor: 'var(--bg-secondary)', border: '1px solid rgba(255,255,255,0.05)', display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
              <div style={{ flexShrink: 0, marginBottom: '8px' }}>
                <h4 style={{ fontSize: '10px', fontWeight: '800', color: 'white', margin: 0, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Servicios más vendidos</h4>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: 1, overflowY: 'auto' }}>
                {finalTopServices.slice(0, 4).map((service, idx) => (
                  <div key={service.id || idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '5px 8px', borderRadius: '8px', backgroundColor: 'rgba(255,255,255,0.02)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '10px', fontWeight: '900', color: 'var(--champagne)' }}>{idx + 1}</span>
                      <span style={{ fontSize: '11px', fontWeight: '700', color: 'white' }}>{service.name}</span>
                    </div>
                    <span style={{ fontSize: '11px', fontWeight: '800', color: 'rgba(255,255,255,0.9)' }}>{service.val}</span>
                  </div>
                ))}
              </div>

              <button
                onClick={() => onNavigate && onNavigate('services')}
                style={{
                  marginTop: '8px',
                  width: '100%',
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.06)',
                  borderRadius: '8px',
                  padding: '6px 0',
                  color: 'white',
                  fontSize: '10px',
                  fontWeight: '700',
                  cursor: 'pointer',
                  textAlign: 'center',
                  transition: 'background 0.2s',
                  flexShrink: 0
                }}
                onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.06)'}
                onMouseLeave={e => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.03)'}
              >
                Ver todos los servicios
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Appointments & Schedule Widget */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
          flex: (isMobile || isTablet) ? '1 1 auto' : '1.1 1 0%',
          height: '100%',
          minWidth: 0,
          minHeight: 0,
          overflow: 'hidden'
        }}>
          {/* Card 1: Próximas citas */}
          <div className="glass-card" style={{ 
            padding: '12px 14px', 
            borderRadius: '16px', 
            backgroundColor: 'var(--bg-secondary)', 
            border: '1px solid rgba(255,255,255,0.05)', 
            display: 'flex', 
            flexDirection: 'column', 
            flex: '1.2 1 0%', 
            minHeight: 0,
            overflow: 'hidden'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', flexShrink: 0 }}>
              <h3 style={{ fontSize: '11.5px', fontWeight: '800', color: 'white', margin: 0, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Próximas citas</h3>
              <span style={{ fontSize: '9px', color: 'rgba(255,255,255,0.75)', fontWeight: '700', cursor: 'pointer', textDecoration: 'underline' }} onClick={() => onNavigate && onNavigate('scheduling')}>Ver calendario</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', overflowY: 'auto', flex: 1 }} className="panda-scrollbar">
              {realUpcomingAppointments.length === 0 ? (
                <div style={{ padding: '16px', textAlign: 'center', color: 'rgba(255,255,255,0.4)', fontSize: '11px' }}>
                  No hay citas próximas agendadas para hoy
                </div>
              ) : (
                realUpcomingAppointments.map((item) => (
                  <div key={item.id} style={{
                    display: 'flex', alignItems: 'center', gap: '10px',
                    padding: '7px 6px', borderRadius: '10px',
                    transition: 'background 0.15s ease'
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    {/* Time */}
                    <span style={{
                      fontSize: '9px', fontWeight: '800', color: 'rgba(255,255,255,0.45)',
                      background: 'rgba(255,255,255,0.05)', borderRadius: '6px',
                      padding: '3px 6px', flexShrink: 0, whiteSpace: 'nowrap', minWidth: '56px', textAlign: 'center'
                    }}>{item.time}</span>

                    {/* Avatar */}
                    <div style={{
                      width: '28px', height: '28px', borderRadius: '50%', flexShrink: 0,
                      backgroundColor: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '10px', fontWeight: '800', color: 'var(--champagne)', overflow: 'hidden'
                    }}>
                      {item.avatar
                        ? <img loading="lazy" src={item.avatar} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        : item.name.charAt(0).toUpperCase()
                      }
                    </div>

                    {/* Text block: 2 lines */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      {/* Line 1: full name */}
                      <div style={{
                        fontSize: '11px', fontWeight: '700', color: 'white',
                        lineHeight: '1.3', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'
                      }}>{item.name}</div>
                      {/* Line 2: service · barber + beverage chip */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px', flexWrap: 'wrap' }}>
                        <span style={{
                          fontSize: '9px', color: 'rgba(255,255,255,0.38)', lineHeight: '1.3',
                          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '180px'
                        }}>{item.service} · {item.barber}</span>
                        {item.beverage && (
                          <span style={{
                            fontSize: '10px', fontWeight: '800', color: '#111111',
                            background: 'rgba(17, 17, 17,0.1)', border: '1px solid rgba(17, 17, 17,0.2)',
                            borderRadius: '6px', padding: '3px 8px', whiteSpace: 'nowrap', flexShrink: 0,
                            textTransform: 'capitalize'
                          }}>☕ {item.beverage}</span>
                        )}
                      </div>
                    </div>

                    {/* Status dot */}
                    <div style={{
                      width: '6px', height: '6px', borderRadius: '50%', flexShrink: 0,
                      backgroundColor: item.status === 'En Silla' ? '#30d158' : 'var(--champagne)'
                    }} />
                  </div>
                ))
              )}
            </div>

          </div>

          {/* Card 2: Acciones Rápidas */}
          <div className="glass-card" style={{ 
            padding: '10px 12px', 
            borderRadius: '16px', 
            backgroundColor: 'var(--bg-secondary)', 
            border: '1px solid rgba(255,255,255,0.05)', 
            display: 'flex', 
            flexDirection: 'column', 
            flexShrink: 0
          }}>
            <h3 style={{ fontSize: '10px', fontWeight: '800', color: 'white', margin: '0 0 8px 0', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Acciones rápidas</h3>
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, minmax(0, 1fr))' : 'repeat(4, minmax(0, 1fr))', gap: '8px' }}>
              {[
                { label: 'Inventario', action: () => setShowInventoryPopup(true), icon: Package },
                { label: 'Cliente', action: () => setShowNewClientModal(true), icon: User },
                { label: 'Asistencia', action: () => setShowAttendancePopup(true), icon: CheckCircle2 },
                { label: 'Caja', action: () => setShowCheckoutPopup(true), icon: CreditCard }
              ].map((act, idx) => {
                const ActIcon = act.icon;
                return (
                  <button 
                    key={idx}
                    onClick={act.action}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '4px',
                      padding: '8px 4px',
                      borderRadius: '8px',
                      backgroundColor: 'rgba(255,255,255,0.02)',
                      border: '1px solid rgba(255,255,255,0.04)',
                      color: 'rgba(255,255,255,0.8)',
                      cursor: 'pointer',
                      transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.backgroundColor = 'rgba(17, 17, 17, 0.08)';
                      e.currentTarget.style.borderColor = 'rgba(17, 17, 17, 0.3)';
                      e.currentTarget.style.color = 'var(--champagne)';
                      e.currentTarget.style.transform = 'translateY(-1.5px)';
                      e.currentTarget.style.boxShadow = '0 4px 10px rgba(17, 17, 17, 0.1)';
                      const icon = e.currentTarget.querySelector('svg');
                      if (icon) icon.style.color = 'var(--champagne)';
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.02)';
                      e.currentTarget.style.borderColor = 'rgba(255,255,255,0.04)';
                      e.currentTarget.style.color = 'rgba(255,255,255,0.8)';
                      e.currentTarget.style.transform = 'none';
                      e.currentTarget.style.boxShadow = 'none';
                      const icon = e.currentTarget.querySelector('svg');
                      if (icon) icon.style.color = 'rgba(255,255,255,0.6)';
                    }}
                  >
                    <ActIcon size={13} color="rgba(255,255,255,0.6)" style={{ transition: 'color 0.25s' }} />
                    <span style={{ fontSize: '9px', fontWeight: '700' }}>{act.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Card 3: Gráfica de Ingresos */}
          <div className="glass-card" style={{
            padding: '12px 14px',
            borderRadius: '16px',
            backgroundColor: 'var(--bg-secondary)',
            border: '1px solid rgba(255,255,255,0.05)',
            display: 'flex',
            flexDirection: 'column',
            flexShrink: 0,
            height: '210px',
            position: 'relative'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2px', flexShrink: 0 }}>
              <span style={{ fontSize: '10px', fontWeight: '800', color: 'white', letterSpacing: '0.5px', textTransform: 'uppercase' }}>Ingresos</span>
              <div ref={incomePeriodMenuRef} style={{ position: 'relative' }}>
                <button
                  type="button"
                   onClick={() => showIncomePeriodMenu ? handleCloseIncomeMenu() : setShowIncomePeriodMenu(true)}
                  style={{
                    fontSize: '8.5px',
                    fontWeight: '700',
                    color: 'rgba(255,255,255,0.75)',
                    cursor: 'pointer',
                    background: 'transparent',
                    border: 'none',
                    padding: '2px 4px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '3px'
                  }}
                >
                  {activeIncomePeriodLabel} ▾
                </button>
                {(showIncomePeriodMenu || isIncomeMenuExiting) && (
                  <div className={isIncomeMenuExiting ? 'animate-bg-fade-out' : 'animate-bg-fade-in'} style={{
                    position: 'absolute',
                    top: '100%',
                    right: 0,
                    marginTop: '4px',
                    backgroundColor: 'var(--bg-secondary)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: '8px',
                    overflow: 'hidden',
                    zIndex: 10,
                    boxShadow: '0 8px 20px rgba(0,0,0,0.4)',
                    minWidth: '110px'
                  }}>
                    {incomePeriodOptions.map(opt => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => { setIncomePeriod(opt.id); handleCloseIncomeMenu(); }}
                        style={{
                          display: 'block',
                          width: '100%',
                          textAlign: 'left',
                          padding: '7px 10px',
                          fontSize: '10px',
                          fontWeight: '700',
                          color: opt.id === incomePeriod ? 'var(--champagne)' : 'rgba(255,255,255,0.8)',
                          backgroundColor: opt.id === incomePeriod ? 'rgba(17, 17, 17, 0.1)' : 'transparent',
                          border: 'none',
                          cursor: 'pointer'
                        }}
                        onMouseEnter={e => { if (opt.id !== incomePeriod) e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.05)'; }}
                        onMouseLeave={e => { if (opt.id !== incomePeriod) e.currentTarget.style.backgroundColor = 'transparent'; }}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div style={{ flexShrink: 0, marginBottom: '6px' }}>
              <div style={{ fontSize: '18px', fontWeight: '900', color: 'white' }}>
                ${formatCurrency(activeIncomeAmount)}
              </div>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', fontSize: '9px', color: '#111111', fontWeight: '700', marginTop: '2px' }}>
                {renderComparison(activeIncomeAmount, activeIncomePrevious, activeIncomeCompareLabel)}
              </div>
            </div>
            <div style={{ flex: 1, minHeight: 0, position: 'relative' }}>
              <Line
                data={activeChartData}
                options={chartOptions}
              />
            </div>
          </div>

          {/* Card 4: Meta Mensual */}
          <div 
            onClick={() => setIsEditingGoals(true)}
            className="glass-card" 
            style={{ 
              padding: '8px 12px', 
              borderRadius: '16px', 
              backgroundColor: 'var(--bg-secondary)', 
              border: '1px solid rgba(255,255,255,0.05)', 
              display: 'flex', 
              flexDirection: 'column', 
              flexShrink: 0,
              cursor: 'pointer'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '9.5px', color: 'rgba(255,255,255,0.75)', fontWeight: '700', marginBottom: '4px' }}>
              <span>META MENSUAL</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '3px', color: 'var(--champagne)' }}>
                <span style={{ fontSize: '9px', fontWeight: '700' }}>Editar meta</span>
                <Edit3 size={10} />
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '6px' }}>
              <span style={{ fontSize: '13px', fontWeight: '900', color: 'white' }}>
                ${formatCurrency(currentMonthAmountReal)} <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)', fontWeight: '600' }}>/ ${formatCurrency(monthlyGoal)}</span>
              </span>
              <span style={{ fontSize: '10.5px', fontWeight: '900', color: 'var(--champagne)' }}>
                {monthlyProgressReal}%
              </span>
            </div>
            <div style={{ height: '5px', backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: '2.5px', overflow: 'hidden', marginBottom: '6px' }}>
              <div style={{ width: `${Math.min(100, monthlyProgressReal)}%`, height: '100%', background: 'linear-gradient(to right, #111111, #e5d4bc)', borderRadius: '2.5px' }} />
            </div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', fontSize: '9px', color: '#111111', fontWeight: '700' }}>
              {renderComparison(currentMonthAmountReal, stats?.previousMonthIncome, 'vs mes anterior')}
            </div>
          </div>

        </div>

      </div>

      {/* Edit Chair Modal */}
      <AnimatedModal isOpen={!!selectedChair}>
        {(overlayClass, cardClass) => (
          selectedChair && (
            <div className={`${overlayClass} global-modal-overlay`} style={{
              position: 'fixed',
              inset: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.85)',
              backdropFilter: 'blur(10px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 9999,
              padding: '16px',
              paddingTop: 'max(16px, env(safe-area-inset-top, 16px))'
            }}>
              <div className={`${cardClass.replace('global-modal-card', '')} glass-card modal-small`} style={{
              width: '100%',
              maxWidth: 'min(480px, 90vw)',
              background: 'var(--bg-secondary)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: '24px',
              padding: '20px',
              display: 'flex',
              flexDirection: 'column',
              gap: '14px',
              boxShadow: '0 30px 60px -12px rgba(0,0,0,0.5)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ fontSize: '15px', fontWeight: '800', color: 'white', margin: 0 }}>EDITAR SILLA {selectedChair.id}</h3>
                <button 
                  onClick={(e) => { e.stopPropagation(); setSelectedChair(null); }} 
                  style={{ background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.75)', cursor: 'pointer' }}
                >
                  <X size={18} />
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '10px', fontWeight: '800', color: 'rgba(255,255,255,0.75)' }}>ODONTÓLOGO</label>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <div style={{ position: 'absolute', left: '12px', color: 'rgba(255,255,255,0.5)', display: 'flex', alignItems: 'center' }}>
                    <Crown size={15} color="var(--champagne)" />
                  </div>
                  <input 
                    type="text" 
                    value={selectedChair.type || ''} 
                    onChange={(e) => setSelectedChair({ ...selectedChair, type: e.target.value })}
                    placeholder="Ej. Luis Gómez"
                    className="premium-modal-input"
                    style={{
                      width: '100%',
                      backgroundColor: 'rgba(255,255,255,0.02)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: '12px',
                      padding: '12px 12px 12px 36px',
                      color: 'white',
                      outline: 'none',
                      fontSize: '13px',
                      transition: 'all 0.25s ease',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label style={{ fontSize: '10px', fontWeight: '800', color: 'rgba(255,255,255,0.75)' }}>ESTADO</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: '10px' }}>
                  {[
                    { val: 'Disponible', label: 'Disponible', color: '#22c55e', bg: 'rgba(34, 197, 94, 0.15)', glow: 'rgba(34, 197, 94, 0.4)' },
                    { val: 'En servicio', label: 'En tratamiento', color: '#ef4444', bg: 'rgba(239, 68, 68, 0.15)', glow: 'rgba(239, 68, 68, 0.4)' },
                    { val: 'Limpieza', label: 'Limpieza', color: '#eab308', bg: 'rgba(234, 179, 8, 0.15)', glow: 'rgba(234, 179, 8, 0.4)' },
                    { val: 'Reservada', label: 'Reservada', color: '#f97316', bg: 'rgba(249, 115, 22, 0.15)', glow: 'rgba(249, 115, 22, 0.4)' }
                  ].map(opt => {
                    const isSelected = selectedChair.status === opt.val;
                    return (
                      <button
                        key={opt.val}
                        type="button"
                        onClick={() => {
                          let glow = 'chair-halo-disponible';
                          let sCol = '#22c55e';
                          if (opt.val === 'En servicio') {
                            glow = 'chair-halo-en-servicio';
                            sCol = '#ef4444';
                          } else if (opt.val === 'Limpieza') {
                            glow = 'chair-halo-limpieza';
                            sCol = '#eab308';
                          } else if (opt.val === 'Reservada') {
                            glow = 'chair-halo-reservada';
                            sCol = '#f97316';
                          }
                          setSelectedChair({
                            ...selectedChair,
                            status: opt.val,
                            glowClass: glow,
                            statusColor: sCol
                          });
                        }}
                        style={{
                          padding: '12px 10px',
                          borderRadius: '12px',
                          border: isSelected ? `2px solid ${opt.color}` : '1px solid rgba(255,255,255,0.08)',
                          background: isSelected ? opt.bg : 'rgba(255,255,255,0.03)',
                          color: isSelected ? 'white' : 'rgba(255,255,255,0.6)',
                          fontWeight: '800',
                          fontSize: '11px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '6px',
                          transition: 'background 0.2s ease, color 0.2s ease, transform 0.2s ease, box-shadow 0.2s ease',
                          transform: isSelected ? 'scale(1.02)' : 'scale(1)',
                          boxShadow: isSelected ? `0 0 15px ${opt.glow}` : 'none'
                        }}
                      >
                        <div style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: opt.color, boxShadow: `0 0 6px ${opt.color}` }} />
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {(selectedChair.status === 'En servicio' || selectedChair.status === 'Reservada') && (
                <>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={{ fontSize: '10px', fontWeight: '800', color: 'rgba(255,255,255,0.75)' }}>CLIENTE</label>
                    <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                      <div style={{ position: 'absolute', left: '12px', color: 'rgba(255,255,255,0.5)', display: 'flex', alignItems: 'center' }}>
                        <User size={15} color="var(--champagne)" />
                      </div>
                      <input 
                        type="text" 
                        value={selectedChair.name || ''} 
                        onChange={(e) => setSelectedChair({ ...selectedChair, name: e.target.value })}
                        placeholder="Ej. Juan Pérez"
                        className="premium-modal-input"
                        style={{
                          width: '100%',
                          backgroundColor: 'rgba(255,255,255,0.02)',
                          border: '1px solid rgba(255,255,255,0.1)',
                          borderRadius: '12px',
                          padding: '12px 12px 12px 36px',
                          color: 'white',
                          outline: 'none',
                          fontSize: '13px',
                          transition: 'all 0.25s ease',
                          boxSizing: 'border-box'
                        }}
                      />
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={{ fontSize: '10px', fontWeight: '800', color: 'rgba(255,255,255,0.75)' }}>SERVICIO</label>
                    <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                      <div style={{ position: 'absolute', left: '12px', color: 'rgba(255,255,255,0.5)', display: 'flex', alignItems: 'center' }}>
                        <ScissorsIcon size={15} color="var(--champagne)" />
                      </div>
                      <input 
                        type="text" 
                        value={selectedChair.service || ''} 
                        onChange={(e) => setSelectedChair({ ...selectedChair, service: e.target.value })}
                        placeholder="Ej. Limpieza + Blanqueamiento"
                        className="premium-modal-input"
                        style={{
                          width: '100%',
                          backgroundColor: 'rgba(255,255,255,0.02)',
                          border: '1px solid rgba(255,255,255,0.1)',
                          borderRadius: '12px',
                          padding: '12px 12px 12px 36px',
                          color: 'white',
                          outline: 'none',
                          fontSize: '13px',
                          transition: 'all 0.25s ease',
                          boxSizing: 'border-box'
                        }}
                      />
                    </div>
                  </div>

                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'minmax(0, 1fr) minmax(0, 1fr)', gap: '10px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <label style={{ fontSize: '10px', fontWeight: '800', color: 'rgba(255,255,255,0.75)' }}>HORA INICIO</label>
                      <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                        <div style={{ position: 'absolute', left: '12px', color: 'rgba(255,255,255,0.5)', display: 'flex', alignItems: 'center' }}>
                          <Clock size={15} color="var(--champagne)" />
                        </div>
                        <input 
                          type="text" 
                          value={selectedChair.time || ''} 
                          onChange={(e) => setSelectedChair({ ...selectedChair, time: e.target.value })}
                          placeholder="Ej. 09:30 AM"
                          className="premium-modal-input"
                          style={{
                            width: '100%',
                            backgroundColor: 'rgba(255,255,255,0.02)',
                            border: '1px solid rgba(255,255,255,0.1)',
                            borderRadius: '12px',
                            padding: '12px 12px 12px 36px',
                            color: 'white',
                            outline: 'none',
                            fontSize: '13px',
                            transition: 'all 0.25s ease',
                            boxSizing: 'border-box'
                          }}
                        />
                      </div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <label style={{ fontSize: '10px', fontWeight: '800', color: 'rgba(255,255,255,0.75)' }}>DURACIÓN</label>
                      <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                        <div style={{ position: 'absolute', left: '12px', color: 'rgba(255,255,255,0.5)', display: 'flex', alignItems: 'center' }}>
                          <Clock size={15} color="var(--champagne)" />
                        </div>
                        <input 
                          type="text" 
                          value={selectedChair.duration || ''} 
                          onChange={(e) => setSelectedChair({ ...selectedChair, duration: e.target.value })}
                          placeholder="Ej. 30 min"
                          className="premium-modal-input"
                          style={{
                            width: '100%',
                            backgroundColor: 'rgba(255,255,255,0.02)',
                            border: '1px solid rgba(255,255,255,0.1)',
                            borderRadius: '12px',
                            padding: '12px 12px 12px 36px',
                            color: 'white',
                            outline: 'none',
                            fontSize: '13px',
                            transition: 'all 0.25s ease',
                            boxSizing: 'border-box'
                          }}
                        />
                      </div>
                    </div>
                  </div>
                </>
              )}

              {(selectedChair.status === 'Limpieza' || selectedChair.status === 'Disponible') && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '10px', fontWeight: '800', color: 'rgba(255,255,255,0.75)' }}>INFORMACIÓN DE ESTADO</label>
                  <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                    <div style={{ position: 'absolute', left: '12px', color: 'rgba(255,255,255,0.5)', display: 'flex', alignItems: 'center' }}>
                      <Sparkles size={15} color="var(--champagne)" />
                    </div>
                    <input 
                      type="text" 
                      value={selectedChair.info || ''} 
                      onChange={(e) => setSelectedChair({ ...selectedChair, info: e.target.value })}
                      placeholder={selectedChair.status === 'Limpieza' ? 'Ej. Disponible en 10 min' : 'Ej. Próximo: 11:00 AM'}
                      className="premium-modal-input"
                      style={{
                        width: '100%',
                        backgroundColor: 'rgba(255,255,255,0.02)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: '12px',
                        padding: '12px 12px 12px 36px',
                        color: 'white',
                        outline: 'none',
                        fontSize: '13px',
                        transition: 'all 0.25s ease',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
                <button 
                  onClick={(e) => { e.stopPropagation(); setSelectedChair(null); }}
                  style={{
                    flex: 1,
                    padding: '10px',
                    borderRadius: '8px',
                    backgroundColor: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    color: 'white',
                    fontWeight: '700',
                    cursor: 'pointer'
                  }}
                >
                  Cancelar
                </button>
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedChair(null);
                    showToast('El estado de los sillones se actualiza desde Recepción.');
                  }}
                  className="premium-btn-gold"
                  style={{
                    flex: 1,
                    padding: '10px',
                    borderRadius: '8px',
                    fontWeight: '800',
                    cursor: 'pointer'
                  }}
                >
                  Guardar
                </button>
              </div>
              </div>
            </div>
          )
        )}
      </AnimatedModal>

      {/* Edit Goals Modal */}
      <AnimatedModal isOpen={isEditingGoals}>
        {(overlayClass, cardClass) => (
          isEditingGoals && (
            <div className={`${overlayClass} global-modal-overlay`} style={{
              position: 'fixed',
              inset: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.85)',
              backdropFilter: 'blur(10px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 9999,
              padding: '16px',
              paddingTop: 'max(16px, env(safe-area-inset-top, 16px))'
            }}>
              <div className={`${cardClass.replace('global-modal-card', '')} glass-card modal-small`} style={{
              width: '100%',
              maxWidth: 'min(420px, 90vw)',
              background: 'var(--bg-secondary)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: '24px',
              padding: '20px',
              display: 'flex',
              flexDirection: 'column',
              gap: '14px',
              boxShadow: '0 30px 60px -12px rgba(0,0,0,0.5)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ fontSize: '15px', fontWeight: '800', color: 'white', margin: 0 }}>EDITAR META MENSUAL</h3>
                <button 
                  onClick={(e) => { e.stopPropagation(); setIsEditingGoals(false); }} 
                  style={{ background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.75)', cursor: 'pointer' }}
                >
                  <X size={18} />
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '10px', fontWeight: '800', color: 'rgba(255,255,255,0.75)' }}>FACTURACIÓN ACTUAL (USD)</label>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <div style={{ position: 'absolute', left: '12px', color: 'rgba(255,255,255,0.5)', display: 'flex', alignItems: 'center' }}>
                    <DollarSign size={15} color="var(--champagne)" />
                  </div>
                  <input 
                    type="number" 
                    step="1"
                    value={currentMonthAmountReal}
                    readOnly
                    className="premium-modal-input"
                    style={{
                      width: '100%',
                      backgroundColor: 'rgba(255,255,255,0.02)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: '12px',
                      padding: '12px 12px 12px 36px',
                      color: 'white',
                      outline: 'none',
                      fontSize: '13px',
                      transition: 'all 0.25s ease',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '10px', fontWeight: '800', color: 'rgba(255,255,255,0.75)' }}>META DEL MES (USD)</label>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <div style={{ position: 'absolute', left: '12px', color: 'rgba(255,255,255,0.5)', display: 'flex', alignItems: 'center' }}>
                    <Target size={15} color="var(--champagne)" />
                  </div>
                  <input 
                    type="number" 
                    step="1"
                    value={monthlyGoal} 
                    onChange={(e) => setMonthlyGoal(parseFloat(e.target.value) || 1)}
                    placeholder="Ej. 35000"
                    className="premium-modal-input"
                    style={{
                      width: '100%',
                      backgroundColor: 'rgba(255,255,255,0.02)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: '12px',
                      padding: '12px 12px 12px 36px',
                      color: 'white',
                      outline: 'none',
                      fontSize: '13px',
                      transition: 'all 0.25s ease',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
                <button 
                  onClick={(e) => { e.stopPropagation(); setIsEditingGoals(false); }}
                  style={{
                    flex: 1,
                    padding: '10px',
                    borderRadius: '8px',
                    backgroundColor: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    color: 'white',
                    fontWeight: '700',
                    cursor: 'pointer'
                  }}
                >
                  Cancelar
                </button>
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    localStorage.setItem('panda_monthly_goal', monthlyGoal.toString());
                    setIsEditingGoals(false);
                    showToast('Meta mensual actualizada correctamente.');
                  }}
                  className="premium-btn-gold"
                  style={{
                    flex: 1,
                    padding: '10px',
                    borderRadius: '8px',
                    fontWeight: '800',
                    cursor: 'pointer'
                  }}
                >
                  Guardar
                </button>
              </div>
              </div>
            </div>
          )
        )}
      </AnimatedModal>

      {/* Modal Resumen de Cobro Emergente desde Sillón */}
      <AnimatedModal isOpen={!!checkoutChairModal}>
        {(overlayClass, cardClass) => (
          checkoutChairModal && (
            <div className={`${overlayClass} modal-centered-overlay`}>
              <div className={`${cardClass.replace('global-modal-card', '')} modal-popup-centered`} style={{ maxWidth: '680px', width: '100%', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.08)', background: 'var(--bg-secondary)', boxShadow: '0 30px 60px -12px rgba(0,0,0,0.5)' }}>
                <button 
                  onClick={() => setCheckoutChairModal(null)}
                  style={{
                    position: 'absolute',
                    top: '20px',
                    right: '20px',
                    backgroundColor: 'var(--bg-secondary)',
                    border: '1px solid rgba(255,255,255,0.2)',
                    borderRadius: '50%',
                    width: '32px',
                    height: '32px',
                    color: 'white',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 99
                  }}
                  title="Cerrar"
                >
                  <X size={18} />
                </button>

                <CheckoutPOS 
                  rates={rates} 
                  isMobile={isMobile} 
                  onNavigate={onNavigate}
                  preselectAppId={checkoutChairModal.appointmentId}
                  isModalView={true}
                  onClose={() => {
                    setCheckoutChairModal(null);
                    const fetchChairData = async () => {
                      try {
                        const activeApps = await dataService.getAppointmentsByState(['En Silla', 'Agendado']);
                        setRealtimeAppointments(activeApps || []);
                      } catch (e) { console.error(e); }
                    };
                    fetchChairData();
                    if (onRefresh) onRefresh();
                  }}
                />
              </div>
            </div>
          )
        )}
      </AnimatedModal>

      {/* Modal: Nuevo Cliente */}
      <NewClientModal 
        isOpen={showNewClientModal}
        onClose={() => setShowNewClientModal(false)}
        onSuccess={(newClient) => {
          setShowNewClientModal(false);
          if (onRefresh) onRefresh();
        }}
      />

      {/* Modal: Control de Asistencia */}
      <AnimatedModal isOpen={showAttendancePopup}>
        {(overlayClass, cardClass) => (
            <div className={overlayClass} style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', justifyContent: 'center', alignItems: 'center', background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)', paddingTop: 'env(safe-area-inset-top, 0px)' }}>
              <div className={`${cardClass.replace('global-modal-card', '')} glass-card`} style={{ transition: 'none', maxWidth: '1200px', width: 'calc(100% - 40px)', height: '90vh', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.1)', background: 'var(--bg-secondary)', backdropFilter: 'blur(40px)', boxShadow: '0 30px 60px -12px rgba(0,0,0,0.5)', display: 'flex', flexDirection: 'column', overflow: 'auto' }}>
              <button
                onClick={() => {
                  setShowAttendancePopup(false);
                  const refreshAttendance = async () => {
                    const queue = await dataService.getTurnQueue().catch(() => []);
                    setAttendanceQueue(queue || []);
                  };
                  refreshAttendance();
                  if (onRefresh) onRefresh();
                }}
                style={{
                  position: 'absolute',
                  top: '20px',
                  right: '20px',
                  backgroundColor: 'var(--bg-secondary)',
                  border: '1px solid rgba(255,255,255,0.2)',
                  borderRadius: '50%',
                  width: '32px',
                  height: '32px',
                  color: 'white',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  zIndex: 99
                }}
                title="Cerrar"
                aria-label="Cerrar control de asistencia"
              >
                <X size={18} />
              </button>
              <Suspense fallback={<div style={{ padding: '32px' }}><SkeletonList rows={4} rowHeight={60} /></div>}>
                <PersonnelModule
                  isMobile={isMobile}
                  inventory={dbData?.inventory || []}
                  initialTab="attendance"
                  attendanceOnly
                />
              </Suspense>
            </div>
          </div>
        )}
      </AnimatedModal>

      {/* Modal: Cobro POS Popup */}
      <AnimatedModal isOpen={showCheckoutPopup}>
        {(overlayClass, cardClass) => (
          <div className={overlayClass} style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', justifyContent: 'center', alignItems: 'center', background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)', paddingTop: 'env(safe-area-inset-top, 0px)' }}>
            <div className={`${cardClass.replace('global-modal-card', '')} glass-card`} style={{ transition: 'none', maxWidth: '1200px', width: 'calc(100% - 40px)', height: '90vh', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.1)', background: 'var(--bg-secondary)', backdropFilter: 'blur(40px)', boxShadow: '0 30px 60px -12px rgba(0,0,0,0.5)', display: 'flex', flexDirection: 'column', overflow: 'auto' }}>
              <button
                onClick={() => setShowCheckoutPopup(false)}
                style={{
                  position: 'absolute',
                  top: '20px',
                  right: '20px',
                  backgroundColor: 'var(--bg-secondary)',
                  border: '1px solid rgba(255,255,255,0.2)',
                  borderRadius: '50%',
                  width: '32px',
                  height: '32px',
                  color: 'white',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  zIndex: 99
                }}
                title="Cerrar"
              >
                <X size={18} />
              </button>
              <CheckoutPOS
                rates={rates}
                isMobile={isMobile}
                onNavigate={onNavigate}
                isModalView={false}
                onClose={() => {
                  setShowCheckoutPopup(false);
                  if (onRefresh) onRefresh();
                }}
              />
            </div>
          </div>
        )}
      </AnimatedModal>

      {/* Modal: Recepción Popup */}
      <AnimatedModal isOpen={showReceptionPopup}>
        {(overlayClass, cardClass) => (
          showReceptionPopup && (
            <div className={overlayClass} style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', justifyContent: 'center', alignItems: 'center', background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)', paddingTop: 'env(safe-area-inset-top, 0px)' }}>
              <div className={`${cardClass.replace('global-modal-card', '')} glass-card`} style={{ transition: 'none', maxWidth: '1200px', width: 'calc(100% - 40px)', height: '90vh', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.1)', background: 'var(--bg-secondary)', backdropFilter: 'blur(40px)', boxShadow: '0 30px 60px -12px rgba(0,0,0,0.5)', display: 'flex', flexDirection: 'column', overflow: 'auto' }}>
                <button 
                  onClick={() => setShowReceptionPopup(false)}
                  style={{
                    position: 'absolute',
                    top: '20px',
                    right: '20px',
                    backgroundColor: 'var(--bg-secondary)',
                    border: '1px solid rgba(255,255,255,0.2)',
                    borderRadius: '50%',
                    width: '32px',
                    height: '32px',
                    color: 'white',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 99
                  }}
                  title="Cerrar"
                >
                  <X size={18} />
                </button>
                <Suspense fallback={<div style={{ padding: '40px' }}><SkeletonList rows={4} rowHeight={70} /></div>}>
                  <ReceptionModule isMobile={isMobile} rates={rates} />
                </Suspense>
              </div>
            </div>
          )
        )}
      </AnimatedModal>

      {/* Modal: Inventario Popup */}
      <AnimatedModal isOpen={showInventoryPopup}>
        {(overlayClass, cardClass) => (
          <div className={overlayClass} style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', justifyContent: 'center', alignItems: 'center', background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)', paddingTop: 'env(safe-area-inset-top, 0px)' }}>
              <div className={`${cardClass.replace('global-modal-card', '')} glass-card`} style={{ transition: 'none', maxWidth: '1200px', width: 'calc(100% - 40px)', height: '90vh', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.1)', background: 'var(--bg-secondary)', backdropFilter: 'blur(40px)', boxShadow: '0 30px 60px -12px rgba(0,0,0,0.5)', display: 'flex', flexDirection: 'column', overflow: 'auto' }}>
              <button
                onClick={() => setShowInventoryPopup(false)}
                style={{
                  position: 'absolute',
                  top: '20px',
                  right: '20px',
                  backgroundColor: 'var(--bg-secondary)',
                  border: '1px solid rgba(255,255,255,0.2)',
                  borderRadius: '50%',
                  width: '32px',
                  height: '32px',
                  color: 'white',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  zIndex: 99
                }}
                title="Cerrar"
                aria-label="Cerrar inventario"
              >
                <X size={18} />
              </button>
              <Suspense fallback={<div style={{ padding: '40px' }}><SkeletonGrid items={6} itemHeight={140} minWidth={200} /></div>}>
                <InventoryAccessGate>
                  <InventoryModule isMobile={isMobile} rates={rates} />
                </InventoryAccessGate>
              </Suspense>
            </div>
          </div>
        )}
      </AnimatedModal>

      {/* Modal: Nueva Cita Popup */}
      <NewAppointmentModal 
        isOpen={showSchedulePopup}
        onClose={() => setShowSchedulePopup(false)}
        rates={rates}
        onSuccess={() => {
          setShowSchedulePopup(false);
          if (onRefresh) onRefresh();
        }}
      />

      <style>{`
        /* ── AMBIENT CINEMATIC ORBS ── */
        .l-dashboard-orb {
          position: absolute;
          border-radius: 50%;
          filter: blur(130px);
          z-index: 0;
          pointer-events: none;
          animation: orb-float 22s infinite ease-in-out;
        }
        .l-orb-1 {
          width: 600px;
          height: 600px;
          background: radial-gradient(circle, rgba(17, 17, 17,0.55) 0%, rgba(180,140,90,0.2) 40%, transparent 70%);
          opacity: 0.07;
          top: -15%;
          right: -12%;
          animation-duration: 28s;
        }
        .l-orb-2 {
          width: 700px;
          height: 700px;
          background: radial-gradient(circle, rgba(120,80,180,0.5) 0%, rgba(80,40,140,0.2) 40%, transparent 70%);
          opacity: 0.05;
          bottom: -25%;
          left: -18%;
          animation-duration: 36s;
          animation-delay: -8s;
        }
        .l-orb-3 {
          width: 400px;
          height: 400px;
          background: radial-gradient(circle, rgba(17, 17, 17,0.4) 0%, transparent 70%);
          opacity: 0.04;
          top: 40%;
          left: 45%;
          animation-duration: 20s;
          animation-delay: -14s;
        }
        @keyframes orb-float {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(50px, -70px) scale(1.12); }
          66% { transform: translate(-40px, 55px) scale(0.92); }
        }

        @keyframes wave-animation {
          0% { transform: rotate( 0.0deg) }
          10% { transform: rotate(14.0deg) }
          20% { transform: rotate(-8.0deg) }
          30% { transform: rotate(14.0deg) }
          40% { transform: rotate(-4.0deg) }
          50% { transform: rotate(10.0deg) }
          60% { transform: rotate( 0.0deg) }
          100% { transform: rotate( 0.0deg) }
        }

        /* ── PREMIUM GLASS CARD HOVER ── */
        .glass-card {
          transition: border-color 0.35s ease, 
                      box-shadow 0.35s ease !important;
        }
        .glass-card:hover {
          border-color: rgba(17, 17, 17, 0.15) !important;
          box-shadow: 0 16px 40px rgba(0, 0, 0, 0.7), 0 0 20px rgba(17, 17, 17,0.04) !important;
        }
      `}</style>
    </div>
  );
};

export default DashboardModule;
