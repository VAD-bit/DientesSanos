import React, { lazy, Suspense, useState, useEffect, useRef } from 'react';
import Sidebar from './components/Sidebar';
import { 
  BarChart3, 
  UserCircle, 
  Users, 
  Scissors, 
  Star, 
  Package, 
  Wallet, 
  Settings,
  Calendar,
  X,
  History
} from 'lucide-react';
import { dataService } from './services/dataService';

// Mobile Components
import MobileLayout from './components/mobile/MobileLayout';
import ParticleBackground from './components/ParticleBackground';
import PandaLoader from './components/PandaLoader';
import Login from './components/Login';
import { useAuth } from './context/AuthContext';
import NotificationsDrawer from './components/NotificationsDrawer';
import { notificationService } from './services/notificationService';
import { pushService } from './services/pushService';
import { useDialog } from './context/DialogContext';
import { useScrollLock } from './hooks/useScrollLock';
import usePerformanceMode from './hooks/usePerformanceMode';
import { useModal, ModalShield } from './context/ModalContext';
import { whatsappService } from './services/whatsappService';
import { SkeletonGrid } from './components/Skeleton';
import { isSupportStaff } from './utils/staffRoles';

const safeLazy = (importFn) => lazy(async () => {
  try {
    return await importFn();
  } catch (error) {
    if (typeof window !== 'undefined') {
      const reloaded = sessionStorage.getItem('panda_chunk_reload');
      if (!reloaded) {
        sessionStorage.setItem('panda_chunk_reload', 'true');
        window.location.reload();
        return new Promise(() => {});
      }
    }
    throw error;
  }
});

const DashboardModule = safeLazy(() => import('./components/DashboardModule'));
const MobileDashboard = safeLazy(() => import('./components/mobile/MobileDashboard'));
const ClientModule = safeLazy(() => import('./components/ClientModule'));
const PersonnelModule = safeLazy(() => import('./components/PersonnelModule'));
const FinanceModule = safeLazy(() => import('./components/FinanceModule'));
const ServicesModule = safeLazy(() => import('./components/ServicesModule'));
const InventoryModule = safeLazy(() => import('./components/InventoryModule'));
const InventoryAccessGate = safeLazy(() => import('./components/InventoryAccessGate'));
const SaleServiceModal = safeLazy(() => import('./components/SaleServiceModal'));
const HistoryModule = safeLazy(() => import('./components/HistoryModule'));
const UserProfilePage = safeLazy(() => import('./components/UserProfilePage'));
const SupportProfilePage = safeLazy(() => import('./components/SupportProfilePage'));
const ReportsModule = safeLazy(() => import('./components/ReportsModule'));
const ReceptionModule = safeLazy(() => import('./components/ReceptionModule'));
const CheckoutPOS = safeLazy(() => import('./components/CheckoutPOS'));
const BarberPanel = safeLazy(() => import('./components/BarberPanel'));
const BaristaPanel = safeLazy(() => import('./components/BaristaPanel'));
const PanelsModule = safeLazy(() => import('./components/PanelsModule'));
const SchedulingModule = safeLazy(() => import('./components/SchedulingModule'));
const SettingsModule = safeLazy(() => import('./components/SettingsModule'));
const asArray = (val) => Array.isArray(val) ? val : [];

const ModuleFallback = () => (
  <div style={{ width: '100%', padding: '4px' }}>
    <div className="panda-skeleton" style={{ height: '30px', width: '220px', marginBottom: '28px', borderRadius: '10px' }} />
    <div style={{ display: 'flex', gap: '12px', marginBottom: '24px' }}>
      <div className="panda-skeleton" style={{ height: '48px', flex: 1, borderRadius: '14px' }} />
      <div className="panda-skeleton" style={{ height: '48px', width: '140px', borderRadius: '14px' }} />
    </div>
    <SkeletonGrid items={6} itemHeight={150} minWidth={220} />
  </div>
);

const ModuleReadySignal = ({ moduleKey, onReady }) => {
  useEffect(() => {
    onReady(moduleKey);
  }, [moduleKey, onReady]);

  return null;
};

function getLastSundayDateString() {
  const now = new Date();
  const day = now.getDay(); // 0 is Sunday, 1 is Monday, ...
  const lastSunday = new Date(now);
  if (day !== 0) {
    lastSunday.setDate(now.getDate() - day);
  }
  lastSunday.setHours(0, 0, 0, 0);
  const yyyy = lastSunday.getFullYear();
  const mm = String(lastSunday.getMonth() + 1).padStart(2, '0');
  const dd = String(lastSunday.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function getStartOfCurrentWeek() {
  const now = new Date();
  const day = now.getDay();
  const diff = now.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(now);
  monday.setDate(diff);
  monday.setHours(0, 0, 0, 0);
  return monday;
}

function getStartOfCurrentMonth() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1);
}

function isImportedHistoricalTransaction(transaction) {
  return transaction?.metadata?.importedHistorical === true;
}

  const CRITICAL_LOAD_TIMEOUT_MS = 700;
  const MODULE_READY_TIMEOUT_MS = 250;

function App() {
  const { user, loading: authLoading, refreshUser } = useAuth();
  const { alert, confirm } = useDialog();
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState(() => localStorage.getItem('panda_active_tab') || 'dashboard');
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [isTablet, setIsTablet] = useState(window.innerWidth >= 768 && window.innerWidth < 1024);
  const [isCollapsed, setIsCollapsed] = useState(window.innerWidth >= 768 && window.innerWidth < 1024);
  const [refreshKey, setRefreshKey] = useState(0);
  const [isAppLoading, setIsAppLoading] = useState(true);
  const [readyModuleTab, setReadyModuleTab] = useState(null);
  const [hasCompletedStartup, setHasCompletedStartup] = useState(false);
  const initializedUserRef = useRef(null);
  const [isTabLoading, setIsTabLoading] = useState(false);
  const [tabParams, setTabParams] = useState({});
  const [isReceptionModalOpen, setIsReceptionModalOpen] = useState(false);
  const { isModalOpen } = useModal();
  const { reduceMotion, isLowEnd } = usePerformanceMode();

  useScrollLock(isReceptionModalOpen);

  useEffect(() => {
    if (isAppLoading || hasCompletedStartup) return undefined;

    if (readyModuleTab === activeTab) {
      setHasCompletedStartup(true);
      return undefined;
    }

    // A slow or failed lazy module must never leave the complete interface at
    // opacity 0 forever. Reveal the shell and let Suspense show its fallback
    // while that module finishes loading or reports its own error.
    const fallbackTimer = window.setTimeout(() => {
      console.warn('Active module readiness timed out; revealing the application shell.');
      setHasCompletedStartup(true);
    }, MODULE_READY_TIMEOUT_MS);

    return () => window.clearTimeout(fallbackTimer);
  }, [activeTab, hasCompletedStartup, isAppLoading, readyModuleTab]);

  // Multi-currency State

  const [currency, setCurrency] = useState('USD');
  const [rates, setRates] = useState({ bcv: 0, euro: 0, updated_at: null });
  
  // Active Rate Toggle (EURO or BCV) - persisted
  const [activeRateType, setActiveRateType] = useState(() => {
    return localStorage.getItem('panda_active_rate') || 'euro';
  });

  // Calculate Exchange Gap
  const exchangeGap = rates.bcv > 0 ? ((rates.euro - rates.bcv) / rates.bcv) * 100 : 0;

  // Effective Rates Logic - Use selected rate for all Bs calculations
  const effectiveRates = { 
    usd: activeRateType === 'euro' ? rates.bcv : rates.euro, 
    bcv: rates.bcv,
    euro: rates.euro,
    gap: exchangeGap,
    activeType: activeRateType,
    updated_at: rates.updated_at 
  };

  const handleRefresh = () => setRefreshKey(prev => prev + 1);

  // Auto-Sync EURO and BCV Rates on Mount + every 10 min
  useEffect(() => {
    const syncRates = async () => {
      const ratesData = await dataService.getExchangeRates();
      if (ratesData) {
        setRates({
          bcv: ratesData.bcv ? Number(Number(ratesData.bcv).toFixed(2)) : 0,
          euro: ratesData.euro ? Number(Number(ratesData.euro).toFixed(2)) : 0,
          updated_at: ratesData.updated_at
        });
      }
    };
    syncRates();
    const interval = setInterval(syncRates, 10 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  // Set the operational home based on the staff role.
  useEffect(() => {
    if (!user) return;
    const currentTab = localStorage.getItem('panda_active_tab');
    if (currentTab === 'my-profile') return;
    const roleName = (user.role || '').toLowerCase();
    if (roleName.includes('barber') || roleName.includes('tatu')) {
      setActiveTab('barista');
      return;
    }
    // Personal de apoyo (Editor, Marketing…): no atiende clientes, así que su pantalla
    // principal es su perfil (salario, pagos, consumo), no el panel de silla.
    if (isSupportStaff({ role: user.role })) {
      setActiveTab('my-profile');
      localStorage.setItem('panda_active_tab', 'my-profile');
      return;
    }
    const isServiceProf = (roleName.includes('barber') || roleName.includes('tatu')) && !roleName.includes('admin');
    if (isServiceProf) {
      const professionalTabs = new Set(['barber', 'scheduling', 'clients', 'my-profile', 'history']);
      const nextTab = professionalTabs.has(currentTab) ? currentTab : 'barber';
      setActiveTab(previousTab => previousTab === nextTab ? previousTab : nextTab);
      if (currentTab !== nextTab) {
        localStorage.setItem('panda_active_tab', nextTab);
      }
    }
  }, [user]);

  // Real-time Broadcast Notifications Subscription
  useEffect(() => {
    if (!user) return;

    const channel = dataService.supabase.channel('panda-notifications')
      .on('broadcast', { event: 'crm-notification' }, ({ payload }) => {
        const userRole = user?.role || '';
        const roleName = userRole.split('|')[0];
        
        let shouldShow = false;

        // 1. Admins see all notifications
        if (roleName === 'Admin') {
          shouldShow = true;
        } 
        // 2. Filter by recipient ID or role
        else if (payload.recipientId && String(payload.recipientId) === String(user.id)) {
          shouldShow = true;
        } else if (payload.recipientRole === 'Barbero' && (roleName === 'Barbero' || userRole.startsWith('Barbero|'))) {
          shouldShow = true;
        } else if (payload.recipientRole === 'Asistente' && roleName.includes('Asistente')) {
          shouldShow = true;
        } else if (payload.recipientRole === 'Barista' && roleName.toLowerCase().includes('barista')) {
          shouldShow = true;
        }

        if (shouldShow) {
          notificationService.sendNotification(payload.title, payload.body);
        }
      })
      .subscribe();

    return () => {
      dataService.supabase.removeChannel(channel);
    };
  }, [user]);

  // Subscribe this staff device to Web Push (PWA notifications) on login.
  useEffect(() => {
    if (!user) return;
    pushService.subscribe(user);
  }, [user]);

  // Persist active rate type
  const handleSetActiveRateType = (type) => {
    setActiveRateType(type);
    localStorage.setItem('panda_active_rate', type);
  };

  // Prevent body scroll entirely when on dashboard in desktop mode
  useEffect(() => {
    if (activeTab === 'dashboard' && !isMobile) {
      document.body.style.overflowY = 'auto';
      document.documentElement.style.overflowY = 'auto';
      document.body.style.height = 'auto';
      document.documentElement.style.height = 'auto';
    } else {
      document.body.style.overflowY = 'hidden';
      document.documentElement.style.overflowY = 'hidden';
      document.body.style.height = '100vh';
      document.documentElement.style.height = '100vh';
    }
    return () => {
      document.body.style.overflowY = 'auto';
      document.documentElement.style.overflowY = 'auto';
      document.body.style.height = 'auto';
      document.documentElement.style.height = 'auto';
    };
  }, [activeTab, isMobile]);

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSaleModalOpen, setIsSaleModalOpen] = useState(false);
  
  // Global Data State
  const [stats, setStats] = useState({ income: 0, clients: 0, expenses: 0, appointments: 0 });
  const [dbData, setDbData] = useState({ clients: [], services: [], staff: [], extras: [], inventory: [] });
  const [chartData, setChartData] = useState({
    labels: ['Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab', 'Dom'],
    datasets: [{
      label: 'Ventas ($)',
      data: [0, 0, 0, 0, 0, 0, 0],
      borderColor: '#ffffff',
      backgroundColor: 'rgba(255, 255, 255, 0.1)',
      fill: true,
      tension: 0.4
    }]
  });
  const [monthlyChartData, setMonthlyChartData] = useState({
    labels: [],
    datasets: [{
      label: 'Ventas ($)',
      data: [],
      borderColor: '#ffffff',
      backgroundColor: 'rgba(255, 255, 255, 0.1)',
      fill: true,
      tension: 0.4
    }]
  });

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
    { id: 'my-profile', label: 'Mi Perfil', icon: UserCircle },
    { id: 'reception', label: 'Recepción (Padre)', icon: UserCircle },
    { id: 'clients', label: 'Clientes', icon: Users },
    { id: 'personnel', label: 'Equipo', icon: Scissors },
    { id: 'services', label: 'Servicios', icon: Star },
    { id: 'inventory', label: 'Inventario', icon: Package, roles: ['Admin', 'Caja'] },
    { id: 'finance', label: 'Finanzas', icon: Wallet, roles: ['Admin', 'Caja'] },
    { id: 'reports', label: 'Reportes', icon: BarChart3, roles: ['Admin'] },
    { id: 'history', label: 'Historial', icon: History, roles: ['Admin', 'Barbero', 'Recepcionista', 'Caja', 'Asistente'] },
  ];

  useEffect(() => {
    if (!user) return;

    const handleResize = () => {
      const width = window.innerWidth;
      setIsMobile(width < 768);
      setIsTablet(width >= 768 && width < 1024);
      if (width < 1024 && width >= 768) {
        setIsCollapsed(true);
      } else if (width >= 1024) {
        setIsCollapsed(false);
      }
    };
    const handleNavigation = (e) => {
      handleTabChange(e.detail);
    };
    handleResize(); // Sincroniza de inmediato con el ancho real, por si cambió desde el montaje inicial
    window.addEventListener('resize', handleResize);
    window.addEventListener('panda_navigate', handleNavigation);
    
    // One-time cleanup of corrupted default birthday templates in localStorage
    if (!localStorage.getItem('panda_bday_cleaned_v6')) {
      localStorage.removeItem('panda_default_bday_message');
      localStorage.setItem('panda_bday_cleaned_v6', 'true');
    }

    // Fast-Path Load Sequence
    // Phase 1: Load only what's needed to show the UI (fast)
    // Phase 2: Load heavy data silently in background
    const initApp = async () => {
      const roleName = (user?.role || '').split('|')[0].toLowerCase();
      const isServiceProfessionalOnly = (roleName.includes('barber') || roleName.includes('tatu')) &&
                                       !roleName.includes('admin') &&
                                       !roleName.includes('recepcionista') &&
                                       !roleName.includes('caja');

      // Barbers already have everything required to enter their own panel in
      // the authenticated profile. Do not hold their UI behind global CRM
      // lists that are only needed by administrative modules. BarberPanel
      // owns its operational/catalog requests, so starting those global loads
      // here would duplicate traffic and compete with the chair data.
      if (isServiceProfessionalOnly) {
        setIsAppLoading(false);
        return;
      }

      try {
        const criticalLoadOutcome = await Promise.race([
          fetchCriticalData().then(() => 'loaded'),
          new Promise(resolve => {
            window.setTimeout(() => resolve('timeout'), CRITICAL_LOAD_TIMEOUT_MS);
          })
        ]);

        if (criticalLoadOutcome === 'timeout') {
          console.warn('Critical app data timed out; opening the interface with available data.');
        }
      } catch (error) {
        console.error('Initial app load failed:', error);
      } finally {
        setIsAppLoading(false); // Dismiss loader immediately after critical data
      }
      // Phase 2: heavy data loads in background, no spinner
      try {
        await fetchSecondaryData();
      } catch (e) {
        console.warn('Secondary data load failed:', e);
      }
    };

    const initializationKey = user?.id || user?.auth_user_id || user?.email || 'authenticated-user';
    if (initializedUserRef.current !== initializationKey) {
      initializedUserRef.current = initializationKey;
      initApp();
    }
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('panda_navigate', handleNavigation);
    };
  }, [user]);

  const checkBirthdaysAndNotify = (clients) => {
    try {
      const today = new Date();
      const todayMonth = today.getMonth() + 1;
      const todayDay = today.getDate();
      const todayStr = today.toISOString().split('T')[0];

      const lastNotifiedDate = localStorage.getItem('panda_birthday_notified_date');
      if (lastNotifiedDate === todayStr) return;

      const birthdayClients = clients.filter(c => {
        if (!c.birth_date) return false;
        const parts = c.birth_date.split('-');
        const m = parseInt(parts[1], 10);
        const d = parseInt(parts[2], 10);
        return m === todayMonth && d === todayDay;
      });

      if (birthdayClients.length > 0) {
        const names = birthdayClients.map(c => c.name).join(', ');
        notificationService.sendNotification(
          '🎉 ¡Cumpleaños de Clientes hoy! 🎂',
          `Hoy cumplen años: ${names}. ¡Recuerda felicitarlos o enviarles una promoción especial!`
        );
        whatsappService.sendBirthdayReminders().catch(console.error);
      }
      localStorage.setItem('panda_birthday_notified_date', todayStr);
    } catch (e) {
      console.error('Error en checkBirthdaysAndNotify:', e);
    }
  };

  const checkGoalsAndNotify = (computedStats) => {
    try {
      const dailyGoal = parseFloat(localStorage.getItem('panda_daily_goal') || '500');
      const weeklyGoal = parseFloat(localStorage.getItem('panda_weekly_goal') || '3000');
      const monthlyGoal = parseFloat(localStorage.getItem('panda_monthly_goal') || '12000');

      const todayStr = new Date().toISOString().split('T')[0];
      const lastSundayStr = getLastSundayDateString();
      const currentMonthStr = todayStr.substring(0, 7);

      // 1. Daily Goal
      if (computedStats.income >= dailyGoal) {
        const lastNotifiedDaily = localStorage.getItem('panda_goal_notified_daily');
        if (lastNotifiedDaily !== todayStr) {
          notificationService.sendNotification(
            '🎯 ¡Meta Diaria Alcanzada! 🎉',
            `¡Espectacular! Se ha alcanzado la meta diaria de $${dailyGoal} USD (Total hoy: $${computedStats.income.toFixed(2)} USD).`
          );
          localStorage.setItem('panda_goal_notified_daily', todayStr);
        }
      }

      // 2. Weekly Goal
      if (computedStats.weeklyIncome >= weeklyGoal) {
        const lastNotifiedWeekly = localStorage.getItem('panda_goal_notified_weekly');
        if (lastNotifiedWeekly !== lastSundayStr) {
          notificationService.sendNotification(
            '🏆 ¡Meta Semanal Alcanzada! 🌟',
            `¡Increíble trabajo equipo! Se alcanzó la meta semanal de $${weeklyGoal} USD (Total semanal: $${computedStats.weeklyIncome.toFixed(2)} USD).`
          );
          localStorage.setItem('panda_goal_notified_weekly', lastSundayStr);
        }
      }

      // 3. Monthly Goal
      if (computedStats.monthlyIncome >= monthlyGoal) {
        const lastNotifiedMonthly = localStorage.getItem('panda_goal_notified_monthly');
        if (lastNotifiedMonthly !== currentMonthStr) {
          notificationService.sendNotification(
            '👑 ¡Objetivo Mensual Completado! 🚀',
            `¡Histórico! Se ha completado el objetivo mensual de $${monthlyGoal} USD (Total mensual: $${computedStats.monthlyIncome.toFixed(2)} USD).`
          );
          localStorage.setItem('panda_goal_notified_monthly', currentMonthStr);
        }
      }
    } catch (e) {
      console.error('Error en checkGoalsAndNotify:', e);
    }
  };

  // Phase 1: Ultra-fast — only 3 simple queries with NO joins!
  async function fetchCriticalData() {
    try {
      const [c, s, st] = await Promise.all([
        dataService.getClientsLite(),
        dataService.getServices(),
        dataService.getStaffLite()
      ]);
      setDbData(prev => ({
        ...prev,
        clients: c,
        services: s,
        staff: st,
        extras: [],
        inventory: []
      }));
      checkBirthdaysAndNotify(c);
    } catch (error) { console.error('Error in critical data fetch:', error); }
  }

  // Phase 2: Heavy data — runs silently after loader is gone
  async function fetchSecondaryData() {
    try {
      const roleName = (user?.role || '').split('|')[0].toLowerCase();
      const isServiceProfessionalOnly = (roleName.includes('barber') || roleName.includes('tatu')) && 
                                       !roleName.includes('admin') && 
                                       !roleName.includes('recepcionista') && 
                                       !roleName.includes('caja');
      
      // Service professionals don't need heavy admin transactions, inventory, or full financials
      if (isServiceProfessionalOnly) {
        const ext = await dataService.getExtras();
        setDbData(prev => ({
          ...prev,
          extras: ext
        }));
        return;
      }

      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const tomorrowStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
      const yesterdayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
      const currentWeekStart = getStartOfCurrentWeek();
      const previousWeekStart = new Date(currentWeekStart);
      previousWeekStart.setDate(previousWeekStart.getDate() - 7);
      const currentMonthStart = getStartOfCurrentMonth();
      const previousMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const dashboardStartISO = previousMonthStart.toISOString();

      const [t, ext, retailInventory, toolsInventory, apps, recentApps, fullClients] = await Promise.all([
        dataService.getTransactions(dashboardStartISO),
        dataService.getExtras(),
        dataService.getSellableInventory(),
        dataService.getInventory('tools'),
        dataService.getAppointmentsByState(['Completado'], dashboardStartISO),
        dataService.getAppointmentsInRange(yesterdayStart.toISOString(), tomorrowStart.toISOString()),
        dataService.getClients() // Full client data with visit counts
      ]);
      const inv = [...asArray(retailInventory), ...asArray(toolsInventory)];

      const st = await dataService.getStaff();
      const operationalTransactions = t.filter(tr => !isImportedHistoricalTransaction(tr));
      const inRange = (value, start, end) => {
        if (!value) return false;
        const timestamp = new Date(value).getTime();
        return timestamp >= start.getTime() && timestamp < end.getTime();
      };
      const getAppointmentOperationalDate = app => app.scheduled_at || app.created_at;
      const todayApps = recentApps.filter(app =>
        inRange(getAppointmentOperationalDate(app), todayStart, tomorrowStart)
      );
      const yesterdayApps = recentApps.filter(app =>
        inRange(getAppointmentOperationalDate(app), yesterdayStart, todayStart)
      );
      const getTransactionAppointmentIds = transaction => {
        const ids = [
          transaction.metadata?.appointment_id,
          ...(Array.isArray(transaction.metadata?.appointment_ids)
            ? transaction.metadata.appointment_ids
            : [])
        ];
        return ids.filter(Boolean).map(String);
      };
      const completedAppointmentsById = new Map(apps.map(appointment => [String(appointment.id), appointment]));
      const collectedProductionForStaff = (staffId, start, end) => operationalTransactions.reduce((total, transaction) => {
        if (transaction.type !== 'income' || Number(transaction.amount || 0) <= 0 || !inRange(transaction.created_at, start, end)) {
          return total;
        }

        const linkedAppointments = getTransactionAppointmentIds(transaction)
          .map(id => completedAppointmentsById.get(id))
          .filter(Boolean);
        if (linkedAppointments.length > 0) {
          return total + linkedAppointments
            .filter(appointment => String(appointment.staff_id) === String(staffId))
            .reduce((sum, appointment) => sum + Number(appointment.total_price || appointment.services?.price || 0), 0);
        }

        const staffWasInvolved = transaction.metadata?.staffInvolved?.some(member =>
          String(member.staffId) === String(staffId)
        );
        return staffWasInvolved ? total + Number(transaction.amount || 0) : total;
      }, 0);
      const countOperationalAppointments = (rangeApps, rangeTransactions) => {
        const appointmentIds = new Set(rangeApps.map(app => String(app.id)));

        rangeTransactions
          .filter(transaction => transaction.type === 'income')
          .flatMap(getTransactionAppointmentIds)
          .forEach(id => appointmentIds.add(id));

        return appointmentIds.size;
      };
      
      const staffWithStats = st.map(barber => {
        // Historical Appts logic (services and extras)
        const barberApps = apps.filter(a => a.staff_id === barber.id);
        const todayDate = new Date().toISOString().split('T')[0];
        const todayCount = barberApps.filter(a => a.created_at?.startsWith(todayDate) || a.scheduled_at?.startsWith(todayDate)).length;
        const monthlyCollectedProduction = collectedProductionForStaff(barber.id, currentMonthStart, tomorrowStart);
        const todayCollectedProduction = collectedProductionForStaff(barber.id, todayStart, tomorrowStart);

        return { 
          ...barber, 
          stats: { 
            ...barber.stats, 
            monthlyIncome: monthlyCollectedProduction,
            income: todayCollectedProduction,
            appointments: todayCount 
          } 
        };
      });

      setDbData(prev => ({ 
        ...prev,
        clients: fullClients, // Now with real visit counts
        staff: staffWithStats, 
        extras: ext || [], 
        inventory: inv,
        appointments: apps.filter(app =>
          inRange(app.completed_at || app.scheduled_at || app.created_at, currentMonthStart, tomorrowStart)
        ),
        todayAppointments: todayApps
      }));
      const incomeInRange = (start, end) => operationalTransactions
        .filter(tr => tr.type === 'income' && inRange(tr.created_at, start, end))
        .reduce((acc, tr) => acc + Number(tr.amount || 0), 0);
      const clientsCreatedInRange = (start, end) => fullClients.filter(client => {
        if (!client) return false;
        if (client.created_at && inRange(client.created_at, start, end)) {
          return true;
        }
        const validApps = Array.isArray(client.appointments) 
          ? client.appointments.filter(a => ['Completado', 'En Silla', 'Por Pagar'].includes(a.status))
          : [];
        if (validApps.length === 1) {
          const firstApp = validApps[0];
          const appDate = firstApp.completed_at || firstApp.scheduled_at || firstApp.created_at;
          if (appDate && inRange(appDate, start, end)) {
            return true;
          }
        }
        return false;
      }).length;
      const todayTransactions = operationalTransactions.filter(trans => inRange(trans.created_at, todayStart, tomorrowStart));
      const yesterdayTransactions = operationalTransactions.filter(trans => inRange(trans.created_at, yesterdayStart, todayStart));
      const todayAppointmentCount = countOperationalAppointments(todayApps, todayTransactions);
      const yesterdayAppointmentCount = countOperationalAppointments(yesterdayApps, yesterdayTransactions);
      const computedStats = {
        income: incomeInRange(todayStart, tomorrowStart),
        yesterdayIncome: incomeInRange(yesterdayStart, todayStart),
        weeklyIncome: incomeInRange(currentWeekStart, tomorrowStart),
        previousWeekIncome: incomeInRange(previousWeekStart, currentWeekStart),
        monthlyIncome: incomeInRange(currentMonthStart, tomorrowStart),
        previousMonthIncome: incomeInRange(previousMonthStart, currentMonthStart),
        expenses: todayTransactions.filter(tr => tr.type === 'expense').reduce((acc, tr) => acc + Number(tr.amount), 0),
        clients: fullClients.length,
        appointments: todayAppointmentCount,
        yesterdayAppointments: yesterdayAppointmentCount,
        newClientsToday: clientsCreatedInRange(todayStart, tomorrowStart),
        newClientsYesterday: clientsCreatedInRange(yesterdayStart, todayStart),
        clientsThisWeek: clientsCreatedInRange(currentWeekStart, tomorrowStart),
        clientsPreviousWeek: clientsCreatedInRange(previousWeekStart, currentWeekStart),
        noShowsToday: todayApps.filter(app => ['Cancelado', 'No Asistió', 'No asistió'].includes(app.status)).length,
        noShowsYesterday: yesterdayApps.filter(app => ['Cancelado', 'No Asistió', 'No asistió'].includes(app.status)).length
      };
      setStats(computedStats);

      const weekDays = [...Array(7)].map((_, index) => {
        const start = new Date(currentWeekStart);
        start.setDate(start.getDate() + index);
        const end = new Date(start);
        end.setDate(end.getDate() + 1);
        return { start, end };
      });
      setChartData({
        labels: ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'],
        datasets: [{
          label: 'Ventas ($)',
          data: weekDays.map(({ start, end }) => incomeInRange(start, end)),
          borderColor: '#111111',
          backgroundColor: 'rgba(17, 17, 17, 0.12)',
          fill: true,
          tension: 0.4
        }]
      });

      const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
      const monthDays = [...Array(daysInMonth)].map((_, index) => {
        const start = new Date(currentMonthStart);
        start.setDate(start.getDate() + index);
        const end = new Date(start);
        end.setDate(end.getDate() + 1);
        return { start, end };
      });
      setMonthlyChartData({
        labels: monthDays.map(({ start }) => String(start.getDate())),
        datasets: [{
          label: 'Ventas ($)',
          data: monthDays.map(({ start, end }) => incomeInRange(start, end)),
          borderColor: '#111111',
          backgroundColor: 'rgba(17, 17, 17, 0.12)',
          fill: true,
          tension: 0.4
        }]
      });

      // Check goals
      checkGoalsAndNotify(computedStats);
    } catch (error) { console.error('Error fetching secondary data:', error); }
  }

  async function fetchInitialData() {
    await fetchCriticalData();
    await fetchSecondaryData();
  }

  const handleTabChange = (tabId, params = {}) => {
    // Permission check for non-admins
    const userRole = user?.role || '';
    const roleName = userRole.split('|')[0];
    if (roleName === 'Asistente de Lavado' && !['settings', 'finance', 'reports', 'personnel'].includes(tabId)) {
      return;
    }

    if (tabId === 'my-profile') {
      setTabParams(params);
      setActiveTab('my-profile');
      localStorage.setItem('panda_active_tab', 'my-profile');
      if (isMobile) setIsSidebarOpen(false);
      return;
    }
    setTabParams(params);
    if (tabId === activeTab) return;
    setActiveTab(tabId);
    localStorage.setItem('panda_active_tab', tabId);
    if (isMobile) setIsSidebarOpen(false);
  };

  const handleCaptureFullPage = async () => {
    try {
      // Small delay to let UI settle (no full reload)
      await new Promise(r => setTimeout(r, 1000));
      const { default: html2canvas } = await import('html2canvas');
      const element = document.body;
      const canvas = await html2canvas(element, {
        useCORS: true,
        allowTaint: true,
        backgroundColor: 'var(--bg-secondary)',
        logging: false,
        scrollX: 0,
        scrollY: 0,
        windowWidth: document.documentElement.offsetWidth,
        windowHeight: document.documentElement.scrollHeight,
        height: document.documentElement.scrollHeight,
      });
      const link = document.createElement('a');
      link.download = `panda-barber-crm-${activeTab}-${Date.now()}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (e) {
      console.error('Error capturing screenshot:', e);
      await alert('Error al generar la captura de pantalla: ' + e.message);
    } finally {
      // ensure loading flag is cleared if it was set elsewhere
    }
  };

  const handleSeedData = async () => {
    if (!await confirm('¿Quieres cargar datos de prueba para ver el CRM funcionando?')) return;
    try {
      await dataService.addStaff({ name: 'Marco Silva', role: 'Barbero Principal', commission_pct: 60 });
      await dataService.addService({ name: 'Blanqueamiento Premium', price: 80, category: 'Estética' });
      await dataService.addClient({ name: 'Carlos Demo', phone: '555-0123', hair_type: 'Normal' });
      await alert('Datos de demo cargados!');
      fetchInitialData();
    } catch (error) { console.error('Error seeding:', error); }
  };

  const [openScheduleAddModal, setOpenScheduleAddModal] = useState(false);

  const handleOpenScheduleAppt = () => {
    setOpenScheduleAddModal(true);
    handleTabChange('scheduling');
  };

  const renderContent = () => {
    // Shared content logic (Desktop and mobile modules call the same components but with different props/layouts)
    switch (activeTab) {
      case 'dashboard':
        return isMobile ? (
          <MobileDashboard 
            onOpenSale={() => setIsReceptionModalOpen(true)} 
            onOpenSchedule={handleOpenScheduleAppt}
            stats={stats} 
            chartData={chartData} 
            dbData={dbData} 
            rates={effectiveRates} 
            onNavigate={handleTabChange}
            onOpenNotifications={() => setIsNotificationsOpen(true)}
          />
        ) : (
          <DashboardModule 
            isMobile={isMobile}
            isTablet={isTablet}
            isCollapsed={isCollapsed}
            onOpenSale={() => setIsReceptionModalOpen(true)} 
            onOpenSchedule={handleOpenScheduleAppt}
            stats={stats}
            chartData={chartData}
            monthlyChartData={monthlyChartData}
            dbData={dbData}
            handleSeedData={handleSeedData}
            rates={effectiveRates}
            activeRateType={activeRateType}
            onToggleRateType={handleSetActiveRateType}
            onNavigate={handleTabChange}
            onRefresh={fetchInitialData}
            onOpenNotifications={() => setIsNotificationsOpen(true)}
          />
        );
      case 'reception': return <div className="p-container"><ReceptionModule isMobile={isMobile} /></div>;
      case 'checkout': return <div className="p-container"><CheckoutPOS isMobile={isMobile} rates={effectiveRates} onOpenSale={() => setIsSaleModalOpen(true)} onNavigate={handleTabChange} /></div>;
      case 'barber': return <div className="p-container"><BarberPanel isMobile={isMobile} rates={effectiveRates} /></div>;
      case 'barista': return <div className="p-container"><BaristaPanel isMobile={isMobile} /></div>;
      case 'panels': return <div className="p-container"><PanelsModule isMobile={isMobile} rates={effectiveRates} /></div>;
      case 'scheduling': return <div className="p-container" style={{ height: 'auto', minHeight: '100%' }}><SchedulingModule isMobile={isMobile} rates={effectiveRates} openAddModal={openScheduleAddModal} onCloseAddModal={() => setOpenScheduleAddModal(false)} /></div>;
      case 'services': return <div className="p-container"><ServicesModule isMobile={isMobile} currency={currency} rates={effectiveRates} /></div>;
      case 'inventory': return <div className="p-container"><InventoryAccessGate><InventoryModule isMobile={isMobile} currency={currency} rates={effectiveRates} /></InventoryAccessGate></div>;
      case 'finance': return <div className="p-container"><FinanceModule isMobile={isMobile} currency={currency} rates={effectiveRates} staff={dbData.staff} /></div>;
      case 'reports': return <div className="p-container"><ReportsModule isMobile={isMobile} rates={effectiveRates} staff={dbData.staff} /></div>;
      case 'clients': return <div className="p-container"><ClientModule isMobile={isMobile} clients={dbData.clients} onRefresh={fetchInitialData} initialClientId={tabParams.clientId} /></div>;
      case 'personnel': return <div className="p-container"><PersonnelModule isMobile={isMobile} inventory={dbData.inventory || []} initialStaffId={tabParams.staffId} onDataRefresh={fetchSecondaryData} /></div>;
      case 'history': return <div className="p-container"><HistoryModule isMobile={isMobile} rates={effectiveRates} onNavigate={handleTabChange} /></div>;
      case 'settings': return <div className="p-container"><SettingsModule isMobile={isMobile} clients={dbData.clients} onRefresh={fetchInitialData} /></div>;
      case 'my-profile': {
        const profileStaff = dbData.staff.find(s => String(s.id) === String(user?.id) || String(s.auth_user_id) === String(user?.auth_user_id) || (s.email && s.email.toLowerCase() === String(user?.email || '').toLowerCase())) || user;
        // Personal de apoyo ve una ficha simplificada (salario, pagos, consumo) en vez del
        // perfil de barbero con metas, comisiones, portafolio y silla.
        if (isSupportStaff(profileStaff)) {
          return (
            <div className="p-container">
              <SupportProfilePage isMobile={isMobile} staffMember={profileStaff} />
            </div>
          );
        }
        return (
          <div className="p-container">
            <UserProfilePage
              isMobile={isMobile}
              staffMember={profileStaff}
              inventory={dbData.inventory || []}
              onUpdate={async () => {
                await fetchInitialData();
                if (refreshUser) await refreshUser();
              }}
            />
          </div>
        );
      }
      default: return <div className="p-container" style={{ height: '100%', width: '100%', display: 'flex', flexDirection: 'column' }}><DashboardModule isMobile={isMobile} currency={currency} rates={effectiveRates} activeRateType={activeRateType} onToggleRateType={handleSetActiveRateType} onNavigate={handleTabChange} /></div>;
    }
  };

  if (!user) {
    return <Login />;
  }

  if (isMobile) {
    return (
      <MobileLayout activeTab={activeTab} setActiveTab={handleTabChange} onOpenSale={() => setIsSaleModalOpen(true)}>
        <PandaLoader visible={!hasCompletedStartup} />
        <div key={activeTab} className={!hasCompletedStartup ? "opacity-0" : "animate-page-fade-in"} style={{ minHeight: '100%' }}>
          <Suspense fallback={hasCompletedStartup ? <ModuleFallback /> : null}>
            {renderContent()}
            <ModuleReadySignal moduleKey={activeTab} onReady={setReadyModuleTab} />
          </Suspense>
        </div>
        {isSaleModalOpen && (
          <Suspense fallback={null}>
            <SaleServiceModal 
              isOpen={isSaleModalOpen} 
              onClose={() => setIsSaleModalOpen(false)} 
              clients={dbData.clients}
              services={dbData.services}
              staff={dbData.staff}
              extras={dbData.extras || []}
              inventory={dbData.inventory || []}
              onRefresh={fetchInitialData}
              rates={rates}
              currency={currency}
            />
          </Suspense>
        )}
        <NotificationsDrawer 
          isOpen={isNotificationsOpen} 
          onClose={() => setIsNotificationsOpen(false)} 
        />
      </MobileLayout>
    );
  }

  return (
    <div className="app-container no-scrollbar" style={{ 
      display: 'flex', 
      minHeight: '100vh', 
      height: activeTab === 'dashboard' && !isMobile ? '100vh' : 'auto',
      overflowY: activeTab === 'dashboard' && !isMobile ? 'hidden' : 'visible',
      backgroundColor: 'transparent', 
      position: 'relative', 
      overflowX: 'hidden' 
    }}>
      <PandaLoader visible={!hasCompletedStartup} />
      <Sidebar 
        activeTab={activeTab} 
        setActiveTab={(id) => handleTabChange(id, {})} 
        rates={effectiveRates} 
        isCollapsed={isCollapsed}
        setIsCollapsed={setIsCollapsed}
        activeRateType={activeRateType}
        onToggleRateType={handleSetActiveRateType}
      />
      <main className="main-content no-scrollbar" style={{ 
        display: 'flex',
        flexDirection: 'column',
        flex: 1, 
        marginLeft: isMobile ? '0' : (isCollapsed ? '80px' : '260px'),
        padding: activeTab === 'dashboard' ? '12px 20px 0 20px' : 'var(--spacing-xl)', 
        paddingBottom: activeTab === 'dashboard' ? '12px' : '80px',
        height: '100vh',
        boxSizing: 'border-box',
        overflowY: activeTab === 'dashboard' ? 'hidden' : 'auto',
        overflowX: 'hidden',
        backgroundColor: 'transparent',
        transition: 'margin-left 0.3s ease'
      }}>
        <div key={activeTab} className={!hasCompletedStartup ? "opacity-0" : "animate-page-fade-in"} style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
          <Suspense fallback={hasCompletedStartup ? <ModuleFallback /> : null}>
            {renderContent()}
            <ModuleReadySignal moduleKey={activeTab} onReady={setReadyModuleTab} />
          </Suspense>
        </div>
      </main>

      {/* Reception Modal (Floating Workspace) */}
      <ModalShield active={isReceptionModalOpen}>
        <div className="global-modal-overlay" style={{ 
          position: 'fixed', 
          inset: 0, 
          zIndex: 3000, 
          backgroundColor: 'rgba(0,0,0,0.9)', 
          backdropFilter: isLowEnd ? 'none' : (isReceptionModalOpen ? 'blur(20px)' : 'blur(0px)'), 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center', 
          padding: isMobile ? '0' : '20px',
          opacity: isReceptionModalOpen ? 1 : 0,
          visibility: isReceptionModalOpen ? 'visible' : 'hidden',
          pointerEvents: isReceptionModalOpen ? 'auto' : 'none',
          transition: 'opacity 0.35s ease, backdrop-filter 0.35s ease, visibility 0.35s'
        }}>
          <div className="glass-card global-modal-card" style={{ 
            width: '100%', 
            maxWidth: '1400px', 
            height: isMobile ? '100%' : '90vh', 
            overflowY: isModalOpen ? 'hidden' : 'auto', 
            borderRadius: isMobile ? '0' : '32px', 
            border: '1px solid rgba(255, 255, 255,0.3)', 
            position: 'relative', 
            background: 'var(--bg-primary)',
            transform: isReceptionModalOpen ? 'scale(1) translateY(0)' : 'scale(0.96) translateY(20px)',
            transition: 'transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.35s ease',
            opacity: isReceptionModalOpen ? 1 : 0
          }}>
            <button 
              onClick={() => setIsReceptionModalOpen(false)}
              style={{ position: 'absolute', right: '20px', top: 'max(20px, env(safe-area-inset-top, 20px))', zIndex: 3001, background: 'rgba(255,255,255,0.05)', border: 'none', borderRadius: '50%', width: '40px', height: '40px', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              <X size={20} />
            </button>
            {isReceptionModalOpen && (
              <div style={{ padding: isMobile ? '20px' : '40px', paddingTop: isMobile ? 'max(20px, env(safe-area-inset-top, 20px))' : '40px' }}>
                <Suspense fallback={<ModuleFallback />}>
                  <ReceptionModule isMobile={isMobile} rates={effectiveRates} />
                </Suspense>
              </div>
            )}
          </div>
        </div>
      </ModalShield>

      {isSaleModalOpen && (
        <Suspense fallback={null}>
          <SaleServiceModal 
            isOpen={isSaleModalOpen} 
            onClose={() => setIsSaleModalOpen(false)} 
            clients={dbData.clients}
            services={dbData.services}
            staff={dbData.staff}
            extras={dbData.extras || []}
            inventory={dbData.inventory || []}
            onRefresh={fetchInitialData}
            rates={rates}
            currency={currency}
          />
        </Suspense>
      )}
      <NotificationsDrawer 
        isOpen={isNotificationsOpen} 
        onClose={() => setIsNotificationsOpen(false)} 
      />
    </div>
  );
}

export default App;
