import React, { useState, useEffect, useMemo } from 'react';
import useDebounce from '../hooks/useDebounce';
import FieldLabel from './FieldLabel';
import { 
  Calendar as CalendarIcon, 
  Clock, 
  Scissors, 
  Plus, 
  ChevronLeft, 
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Sunrise,
  Sun,
  Moon,
  CheckCircle2,
  AlertCircle,
  Trash2,
  XCircle,
  Pencil,
  Filter,
  List,
  Search,
  Sparkles,
  DollarSign,
  Check,
  X,
  Minus,
  Package,
  Coffee,
  Beer,
  Martini,
  GlassWater,
  StickyNote
} from 'lucide-react';
import { dataService } from '../services/dataService';
import { filterSellableInventory, getInventorySalesLabel } from '../utils/inventorySales';
import { useNotifs } from '../context/NotificationContext';
import PandaDatePicker from './PandaDatePicker';
import { normalizeForSearch } from '../utils/stringUtils';
import PandaSelect from './PandaSelect';
import PandaDialog from './PandaDialog';
import ScheduleModal from './ScheduleModal';
import { useAuth } from '../context/AuthContext';
import { ModalShield } from '../context/ModalContext';
import AnimatedModal from './AnimatedModal';
import { isBarberBookableStaff, roleLabel } from '../utils/staffRoles';

const DEFAULT_DAY_TIMELINE_START = 8;
const DEFAULT_DAY_TIMELINE_END = 24;
const DAY_TIMELINE_HOUR_HEIGHT = 68;
const AGENDA_VIEW_OPTIONS = [
  { value: 'day', label: 'Día' },
  { value: 'week', label: 'Semana' },
  { value: 'fortnight', label: '2 semanas' },
  { value: 'month', label: 'Mes' }
];

const toLocalDateKey = date => {
  const value = new Date(date);
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`;
};

const buildDayTimelineLayout = (apps, startHour, endHour) => {
  const rangeStart = startHour * 60;
  const rangeEnd = endHour * 60;
  const items = apps
    .map(app => {
      const date = new Date(app.scheduled_at || app.created_at);
      if (Number.isNaN(date.getTime())) return null;
      const startMinute = date.getHours() * 60 + date.getMinutes();
      const duration = Math.max(30, Number(app.services?.duration) || 60);
      return {
        app,
        date,
        startMinute: Math.max(rangeStart, startMinute),
        endMinute: Math.min(rangeEnd, startMinute + duration),
        duration
      };
    })
    .filter(item => item && item.endMinute > rangeStart && item.startMinute < rangeEnd)
    .sort((a, b) => a.startMinute - b.startMinute || a.endMinute - b.endMinute);

  const clusters = [];
  items.forEach(item => {
    const current = clusters[clusters.length - 1];
    if (!current || item.startMinute <= current.endMinute) {
      clusters.push({ endMinute: item.endMinute, items: [item] });
    } else {
      current.items.push(item);
      current.endMinute = Math.max(current.endMinute, item.endMinute);
    }
  });

  return clusters.flatMap(cluster => {
    const columnEnds = [];
    cluster.items.forEach(item => {
      let column = columnEnds.findIndex(endMinute => endMinute <= item.startMinute);
      if (column === -1) column = columnEnds.length;
      columnEnds[column] = item.endMinute;
      item.column = column;
    });
    const columnCount = Math.max(1, columnEnds.length);
    return cluster.items.map(item => ({ ...item, columnCount }));
  });
};

const SchedulingModule = ({ isMobile, rates, openAddModal, onCloseAddModal }) => {
  const { user } = useAuth();
  const { showToast } = useNotifs();
  const [appointments, setAppointments] = useState([]);
  const [allAppointments, setAllAppointments] = useState([]);
  const [staff, setStaff] = useState([]);
  const [clients, setClients] = useState([]);
  const [services, setServices] = useState([]);
  const [allExtras, setAllExtras] = useState([]);
  const [allProducts, setAllProducts] = useState([]);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);

  useEffect(() => {
    if (openAddModal) {
      setShowAddModal(true);
    }
  }, [openAddModal]);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [scheduleModalOrigin, setScheduleModalOrigin] = useState(null);
  const [dialog, setDialog] = useState({ isOpen: false, appointmentId: null });
  const [editingApp, setEditingApp] = useState(null);
  const [filterType, setFilterType] = useState('day'); // 'day', 'week', 'fortnight', 'month'
  const [statusFilter, setStatusFilter] = useState('all');
  const [teamMemberFilter, setTeamMemberFilter] = useState('all');
  const [mobileFocusedStaffId, setMobileFocusedStaffId] = useState(null);
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearch = useDebounce(searchTerm, 300);
  const [clientSearchTerm, setClientSearchTerm] = useState('');
  const [clientSearchResults, setClientSearchResults] = useState([]);
  const [selectedAppDetail, setSelectedAppDetail] = useState(null);
  const [activeDetail, setActiveDetail] = useState(null);

  useEffect(() => {
    if (selectedAppDetail) {
      setActiveDetail(selectedAppDetail);
    }
  }, [selectedAppDetail]);

  const [showFullCalendar, setShowFullCalendar] = useState(false);
  const [isCalendarExiting, setIsCalendarExiting] = useState(false);

  const handleCloseCalendar = () => {
    setIsCalendarExiting(true);
    setTimeout(() => {
      setShowFullCalendar(false);
      setIsCalendarExiting(false);
    }, 250);
  };

  const [newApp, setNewApp] = useState({
    clientId: '',
    serviceId: '',
    staffId: '',
    time: '10:00',
    extras: [],
    products: []
  });

  useEffect(() => {
    loadBaseData();
    loadAllAppointments(); // For calendar dots
  }, []);

  useEffect(() => {
    loadFilteredAppointments();
  }, [selectedDate, filterType]);

  const loadBaseData = async () => {
    try {
      const [st, cl, sv, ex, pr] = await Promise.all([
        dataService.getStaff(),
        dataService.getClients(),
        dataService.getServices(),
        dataService.getExtras(),
        dataService.getSellableInventory()
      ]);
      setStaff(st);
      setClients(cl);
      setServices(sv);
      setAllExtras(ex.filter(e => e.name !== 'SYSTEM_CONFIG_RATES'));
      setAllProducts(filterSellableInventory(pr));
    } catch (err) {
      console.error(err);
    }
  };

  const isGhostAppointment = (a) => {
    const serviceBase = Number(a.services?.price !== undefined && a.services?.price !== null ? a.services.price : (a.total_price || 0));
    const extras = a.appointment_extras?.reduce((sum, e) => sum + Number(e.price || 0), 0) || 0;
    const products = a.appointment_products?.reduce((sum, p) => sum + (Number(p.price || 0) * (p.quantity || 1)), 0) || 0;
    const tips = a.appointment_staff?.reduce((sum, s) => sum + Number(s.tip_amount || 0), 0) || 0;
    const totalVal = serviceBase + extras + products + tips;

    const hasService = Boolean(a.services?.name);
    const hasExtras = Boolean(a.appointment_extras?.length);
    const hasProducts = Boolean(a.appointment_products?.length);
    const hasTips = Boolean(a.appointment_staff?.some(s => Number(s.tip_amount) > 0));

    return !hasService && !hasExtras && !hasProducts && !hasTips && totalVal === 0;
  };

  const ALL_STATES = ['Agendado', 'En Silla', 'En Lavado', 'Por Pagar', 'Completado', 'Cancelada'];

  const loadAllAppointments = async () => {
    try {
      // Calendar dots only need a reasonable window around "today", not the
      // barbershop's entire history — keeps this cheap on every mount.
      const rangeStart = new Date();
      rangeStart.setDate(rangeStart.getDate() - 60);
      rangeStart.setHours(0, 0, 0, 0);
      const rangeEnd = new Date();
      rangeEnd.setDate(rangeEnd.getDate() + 90);
      rangeEnd.setHours(23, 59, 59, 999);

      let data = await dataService.getAppointmentsInRange(rangeStart.toISOString(), rangeEnd.toISOString());
      data = data.filter(a => !isGhostAppointment(a));

      const userRole = (user?.role || '').split('|')[0].toLowerCase();
      const isServiceProfessional = userRole.includes('barber') || userRole.includes('tatu');
      if (isServiceProfessional) {
        data = data.filter(a => String(a.staff_id) === String(user.id));
      }

      setAllAppointments(data);
    } catch (err) {
      console.error('Fallo al cargar los puntos del calendario:', err);
    }
  };

  const loadFilteredAppointments = async () => {
    try {
      setLoading(true);

      // Compute the visible window first so the query only fetches what this
      // view actually renders, instead of the entire appointment history.
      const start = new Date(selectedDate);
      start.setHours(0, 0, 0, 0);

      let end = new Date(start);
      if (filterType === 'day') {
        end.setDate(start.getDate() + 1);
      } else if (filterType === 'week') {
        const day = start.getDay();
        const diff = start.getDate() - day + (day === 0 ? -6 : 1);
        start.setDate(diff);
        end = new Date(start);
        end.setDate(start.getDate() + 7);
      } else if (filterType === 'fortnight') {
        const day = start.getDay();
        const diff = start.getDate() - day + (day === 0 ? -6 : 1);
        start.setDate(diff);
        end = new Date(start);
        end.setDate(start.getDate() + 14);
      } else if (filterType === 'month') {
        start.setDate(1);
        end = new Date(start.getFullYear(), start.getMonth() + 1, 0);
        end.setHours(23, 59, 59, 999);
      }

      let data = await dataService.getAppointmentsInRangeFull(start.toISOString(), end.toISOString(), ALL_STATES);
      data = data.filter(a => !isGhostAppointment(a));

      const userRole = (user?.role || '').split('|')[0].toLowerCase();
      const isServiceProfessional = userRole.includes('barber') || userRole.includes('tatu');
      if (isServiceProfessional) {
        data = data.filter(a => String(a.staff_id) === String(user.id));
      }

      setAppointments(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleEditAppointment = (app) => {
    setEditingApp(app);
    const clientName = clients.find(c => c.id === app.client_id)?.name || '';
    setClientSearchTerm(clientName);
    setClientSearchResults([]);
    setNewApp({
      clientId: app.client_id,
      serviceId: app.service_id,
      staffId: app.staff_id,
      time: new Date(app.scheduled_at || app.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }),
      extras: app.appointment_extras?.map(e => e.service_extras?.id) || [],
      products: app.appointment_products?.map(p => ({ id: p.inventory?.id, quantity: p.quantity })) || []
    });
    setShowAddModal(true);
  };

  const handleRescheduleAppointment = (app) => {
    setEditingApp(app);
    const clientName = clients.find(c => c.id === app.client_id)?.name || '';
    setClientSearchTerm(clientName);
    setClientSearchResults([]);
    setNewApp({
      clientId: app.client_id,
      serviceId: app.service_id,
      staffId: app.staff_id,
      time: new Date(app.scheduled_at || app.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }),
      extras: app.appointment_extras?.map(e => e.service_extras?.id) || [],
      products: app.appointment_products?.map(p => ({ id: p.inventory?.id, quantity: p.quantity })) || []
    });
    setScheduleModalOrigin('reschedule');
    setShowScheduleModal(true);
  };

  const handleClientSearch = (val) => {
    setClientSearchTerm(val);
    setNewApp(prev => ({ ...prev, clientId: '' }));
    if (val.length >= 1) {
      const term = normalizeForSearch(val);
      const results = clients.filter(c => {
        const normalizedName = normalizeForSearch(c.name || '');
        const nameMatches = normalizedName.split(' ').some(w => w.startsWith(term));
        const idMatches = (c.id_card || '').toLowerCase().includes(term);
        return nameMatches || idMatches;
      });
      setClientSearchResults(results.slice(0, 5));
    } else {
      setClientSearchResults([]);
    }
  };

  const handleSelectClient = (client) => {
    setNewApp(prev => ({ ...prev, clientId: client.id }));
    setClientSearchTerm(client.name);
    setClientSearchResults([]);
  };

  const handleTimeSelected = async (isoTime) => {
    try {
      const service = services.find(s => s.id === newApp.serviceId);
      if (!isBarberBookableStaff(staff.find(s => String(s.id) === String(newApp.staffId)))) {
        showToast("Ese miembro del equipo no puede recibir citas.", "error");
        return;
      }
      
      let appointmentId = editingApp?.id;

      if (editingApp) {
        await dataService.updateAppointment(editingApp.id, {
          client_id: newApp.clientId,
          service_id: newApp.serviceId,
          staff_id: newApp.staffId,
          total_price: service.price,
          scheduled_at: isoTime
        });
        
        // Limpiar extras y productos anteriores para re-insertar
        await Promise.all([
          dataService.supabase.from('appointment_extras').delete().eq('appointment_id', editingApp.id),
          dataService.supabase.from('appointment_products').delete().eq('appointment_id', editingApp.id)
        ]);
        
        showToast("Cita actualizada");
      } else {
        const created = await dataService.createAppointment({
          client_id: newApp.clientId,
          service_id: newApp.serviceId,
          staff_id: newApp.staffId,
          status: 'Agendado',
          total_price: service.price,
          scheduled_at: isoTime
        });
        appointmentId = created.id;
        showToast("Cita agendada correctamente");
      }

      // Insertar extras y productos
      const extrasPromises = newApp.extras.map(exId => {
        const ex = allExtras.find(e => e.id === exId);
        return dataService.addExtraToAppointment(appointmentId, exId, ex.price);
      });

      const productsPromises = newApp.products.map(p => {
        const prod = allProducts.find(pr => pr.id === p.id);
        return dataService.addProductToAppointment(appointmentId, p.id, p.quantity, prod.price);
      });

      await Promise.all([...extrasPromises, ...productsPromises]);

      setShowAddModal(false);
      setShowScheduleModal(false);
      setEditingApp(null);
      loadFilteredAppointments();
      loadAllAppointments();
    } catch (err) {
      showToast(err?.message || "Error al procesar cita", "error");
    }
  };

  const handleManageAppointment = (id) => {
    setDialog({ isOpen: true, appointmentId: id });
  };

  const processAction = async (action) => {
    try {
      if (action === 'cancel') {
        await dataService.updateAppointmentStatus(dialog.appointmentId, 'Cancelada');
        showToast("Cita marcada como cancelada");
      } else if (action === 'delete') {
        await dataService.deleteAppointment(dialog.appointmentId);
        showToast("Cita eliminada permanentemente");
      }
      setDialog({ isOpen: false, appointmentId: null });
      loadFilteredAppointments();
      loadAllAppointments();
    } catch (err) {
      showToast("Error al procesar acción", "error");
    }
  };

  const formatDateLabel = (date) => {
    if (filterType === 'day') return date.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });
    if (filterType === 'month') return date.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
    
    const start = new Date(date);
    if (filterType === 'week' || filterType === 'fortnight') {
      const day = start.getDay();
      const diff = start.getDate() - day + (day === 0 ? -6 : 1);
      start.setDate(diff);
    }
    
    const end = new Date(start);
    if (filterType === 'week') end.setDate(start.getDate() + 6);
    else if (filterType === 'fortnight') end.setDate(start.getDate() + 13);
    
    return `${start.getDate()} ${start.toLocaleDateString('es-ES', { month: 'short' })} - ${end.getDate()} ${end.toLocaleDateString('es-ES', { month: 'short' })}`;
  };

  const getStatusColor = (status) => {
    const colors = {
      'Agendado': { text: 'var(--gold-primary)', bg: 'rgba(255, 255, 255,0.1)', border: 'rgba(255, 255, 255,0.25)', dot: 'var(--gold-primary)' },
      'En Silla': { text: '#0a84ff', bg: 'rgba(10,132,255,0.1)', border: 'rgba(10,132,255,0.25)', dot: '#0a84ff' },
      'En Lavado': { text: '#64d2ff', bg: 'rgba(100,210,255,0.1)', border: 'rgba(100,210,255,0.25)', dot: '#64d2ff' },
      'Por Pagar': { text: '#bf5af2', bg: 'rgba(191,90,242,0.1)', border: 'rgba(191,90,242,0.25)', dot: '#bf5af2' },
      'Completado': { text: '#30d158', bg: 'rgba(48,209,88,0.15)', border: 'rgba(48,209,88,0.35)', dot: '#30d158' },
      'Cancelada': { text: '#ff453a', bg: 'rgba(255,69,58,0.1)', border: 'rgba(255,69,58,0.25)', dot: '#ff453a' }
    };
    return colors[status] || { text: 'white', bg: 'rgba(255,255,255,0.1)', border: 'rgba(255,255,255,0.15)', dot: 'white' };
  };

  const getStatusText = (status) => {
    if (status === 'En Silla') return 'En sillón';
    if (status === 'En Lavado') return 'En profilaxis';
    return status;
  };

  const currentRoleName = (user?.role || '').split('|')[0].toLowerCase();
  const isProfessionalAgenda = currentRoleName.includes('barber') || currentRoleName.includes('tatu');
  const professionalStaff = useMemo(() => staff
    .filter(member => {
      const role = (member.role || '').split('|')[0].toLowerCase();
      return (role.includes('barber') || role.includes('tatu')) && !role.includes('admin');
    })
    .sort((a, b) => (a.name || '').localeCompare(b.name || '', 'es')),
  [staff]);

  useEffect(() => {
    if (!professionalStaff.length) {
      setMobileFocusedStaffId(null);
      return;
    }

    if (teamMemberFilter !== 'all') {
      setMobileFocusedStaffId(teamMemberFilter);
      return;
    }

    const currentStillExists = professionalStaff.some(member => String(member.id) === String(mobileFocusedStaffId));
    if (!currentStillExists) {
      const firstMemberWithAppointments = professionalStaff.find(member =>
        appointments.some(app => String(app.staff_id) === String(member.id))
      );
      setMobileFocusedStaffId(firstMemberWithAppointments?.id || professionalStaff[0].id);
    }
  }, [professionalStaff, teamMemberFilter, mobileFocusedStaffId, appointments]);

  const teamScopedAppointments = useMemo(() => {
    if (isProfessionalAgenda || teamMemberFilter === 'all') return appointments;
    return appointments.filter(app => String(app.staff_id) === String(teamMemberFilter));
  }, [appointments, isProfessionalAgenda, teamMemberFilter]);

  const filteredApps = useMemo(() => {
    const filtered = teamScopedAppointments.filter(app => {
      if (statusFilter === 'pending' && ['Completado', 'Cancelada'].includes(app.status)) return false;
      if (statusFilter === 'completed' && app.status !== 'Completado') return false;
      if (!debouncedSearch) return true;
      const term = debouncedSearch.toLowerCase();
      return (
        (app.clients?.name || '').toLowerCase().includes(term) ||
        (app.clients?.id_card || '').toLowerCase().includes(term) ||
        (app.clients?.phone || '').toLowerCase().includes(term)
      );
    });
    return filtered.sort((a, b) => new Date(a.scheduled_at || a.created_at) - new Date(b.scheduled_at || b.created_at));
  }, [teamScopedAppointments, debouncedSearch, statusFilter]);

  const totalEstimate = useMemo(
    () => filteredApps.reduce((acc, app) => app.status !== 'Cancelada' ? acc + (Number(app.total_price) || 0) : acc, 0),
    [filteredApps]
  );

  const completedAppointmentsCount = useMemo(
    () => teamScopedAppointments.filter(app => app.status === 'Completado').length,
    [teamScopedAppointments]
  );
  const pendingAppointmentsCount = useMemo(
    () => teamScopedAppointments.filter(app => !['Completado', 'Cancelada'].includes(app.status)).length,
    [teamScopedAppointments]
  );

  const { morningApps, afternoonApps, eveningApps } = useMemo(() => {
    const morning = [], afternoon = [], evening = [];
    filteredApps.forEach(app => {
      const hours = new Date(app.scheduled_at || app.created_at).getHours();
      if (hours < 12) morning.push(app);
      else if (hours < 19) afternoon.push(app);
      else evening.push(app);
    });
    return { morningApps: morning, afternoonApps: afternoon, eveningApps: evening };
  }, [filteredApps]);

  const dayTimelineRange = useMemo(() => {
    let startHour = DEFAULT_DAY_TIMELINE_START;
    let endHour = DEFAULT_DAY_TIMELINE_END;

    appointments.forEach(app => {
      const date = new Date(app.scheduled_at || app.created_at);
      if (Number.isNaN(date.getTime())) return;
      const appointmentStart = date.getHours() + (date.getMinutes() / 60);
      const durationHours = Math.max(30, Number(app.services?.duration) || 60) / 60;
      startHour = Math.min(startHour, Math.floor(appointmentStart));
      endHour = Math.max(endHour, Math.ceil(Math.min(24, appointmentStart + durationHours)));
    });

    return {
      startHour: Math.max(0, startHour),
      endHour: Math.min(24, endHour)
    };
  }, [appointments]);

  const dayTimelineItems = useMemo(
    () => buildDayTimelineLayout(filteredApps, dayTimelineRange.startHour, dayTimelineRange.endHour),
    [filteredApps, dayTimelineRange]
  );
  const visibleResourceStaff = useMemo(() => {
    if (isProfessionalAgenda) return [];
    if (teamMemberFilter !== 'all') {
      return professionalStaff.filter(member => String(member.id) === String(teamMemberFilter));
    }
    return professionalStaff;
  }, [isProfessionalAgenda, professionalStaff, teamMemberFilter]);
  const resourceTimelineItems = useMemo(() => {
    const byStaff = {};
    visibleResourceStaff.forEach(member => {
      byStaff[String(member.id)] = buildDayTimelineLayout(
        filteredApps.filter(app => String(app.staff_id) === String(member.id)),
        dayTimelineRange.startHour,
        dayTimelineRange.endHour
      );
    });
    return byStaff;
  }, [visibleResourceStaff, filteredApps, dayTimelineRange]);
  const mobileFocusedStaff = useMemo(() => {
    if (!professionalStaff.length) return null;
    return professionalStaff.find(member => String(member.id) === String(mobileFocusedStaffId)) || professionalStaff[0];
  }, [professionalStaff, mobileFocusedStaffId]);
  const mobileFocusedTimelineItems = useMemo(() => {
    if (!mobileFocusedStaff) return [];
    return buildDayTimelineLayout(
      filteredApps.filter(app => String(app.staff_id) === String(mobileFocusedStaff.id)),
      dayTimelineRange.startHour,
      dayTimelineRange.endHour
    );
  }, [mobileFocusedStaff, filteredApps, dayTimelineRange]);
  const mobileFocusedStats = useMemo(() => {
    if (!mobileFocusedStaff) return { total: 0, completed: 0, estimate: 0 };
    const memberAppointments = appointments.filter(app => String(app.staff_id) === String(mobileFocusedStaff.id));
    return {
      total: memberAppointments.length,
      completed: memberAppointments.filter(app => app.status === 'Completado').length,
      estimate: memberAppointments.reduce(
        (sum, app) => app.status === 'Cancelada' ? sum : sum + (Number(app.total_price) || 0),
        0
      )
    };
  }, [mobileFocusedStaff, appointments]);
  const timelineHours = useMemo(
    () => Array.from(
      { length: dayTimelineRange.endHour - dayTimelineRange.startHour + 1 },
      (_, index) => dayTimelineRange.startHour + index
    ),
    [dayTimelineRange]
  );

  const periodCalendarDays = useMemo(() => {
    if (filterType === 'day') return [];

    let rangeStart = new Date(selectedDate);
    rangeStart.setHours(0, 0, 0, 0);
    let dayCount = filterType === 'fortnight' ? 14 : 7;
    const visibleMonth = selectedDate.getMonth();

    if (filterType === 'week' || filterType === 'fortnight') {
      const weekday = rangeStart.getDay();
      rangeStart.setDate(rangeStart.getDate() - (weekday === 0 ? 6 : weekday - 1));
    } else if (filterType === 'month') {
      rangeStart = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1);
      const weekday = rangeStart.getDay();
      rangeStart.setDate(rangeStart.getDate() - (weekday === 0 ? 6 : weekday - 1));
      const lastOfMonth = new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0);
      const rangeEnd = new Date(lastOfMonth);
      rangeEnd.setDate(rangeEnd.getDate() + (rangeEnd.getDay() === 0 ? 0 : 7 - rangeEnd.getDay()));
      dayCount = Math.round((rangeEnd - rangeStart) / 86400000) + 1;
    }

    const appointmentsByDate = filteredApps.reduce((groups, appointment) => {
      const key = toLocalDateKey(appointment.scheduled_at || appointment.created_at);
      if (!groups[key]) groups[key] = [];
      groups[key].push(appointment);
      return groups;
    }, {});

    return Array.from({ length: dayCount }, (_, index) => {
      const date = new Date(rangeStart);
      date.setDate(rangeStart.getDate() + index);
      const key = toLocalDateKey(date);
      return {
        key,
        date,
        appointments: appointmentsByDate[key] || [],
        isToday: key === toLocalDateKey(new Date()),
        isOutsideMonth: filterType === 'month' && date.getMonth() !== visibleMonth
      };
    });
  }, [filterType, selectedDate, filteredApps]);

  const getWeekDays = (date) => {
    const week = [];
    for (let i = -3; i <= 3; i++) {
      const d = new Date(date);
      d.setDate(date.getDate() + i);
      week.push(d);
    }
    return week;
  };

  const currentMoment = new Date();
  const currentMinute = currentMoment.getHours() * 60 + currentMoment.getMinutes();
  const selectedDateIsToday = selectedDate.toDateString() === currentMoment.toDateString();
  const showCurrentTimeLine = selectedDateIsToday && currentMinute >= dayTimelineRange.startHour * 60 && currentMinute <= dayTimelineRange.endHour * 60;
  const currentTimeLineTop = ((currentMinute - dayTimelineRange.startHour * 60) / 60) * DAY_TIMELINE_HOUR_HEIGHT;

  const moveSelectedDate = direction => {
    const nextDate = new Date(selectedDate);
    if (filterType === 'day') nextDate.setDate(nextDate.getDate() + direction);
    else if (filterType === 'week') nextDate.setDate(nextDate.getDate() + (7 * direction));
    else if (filterType === 'fortnight') nextDate.setDate(nextDate.getDate() + (14 * direction));
    else if (filterType === 'month') nextDate.setMonth(nextDate.getMonth() + direction);
    setSelectedDate(nextDate);
  };

  return (
    <div className="animate-fade-in" style={{ paddingBottom: '100px', overflowX: 'hidden', maxWidth: '100%' }}>
      
      {/* Styles Injection for Premium Aesthetics */}
      <style>{`
        .scheduling-grid-container {
          display: grid;
          grid-template-columns: 320px 1fr;
          gap: 24px;
          align-items: start;
          max-width: 100%;
          box-sizing: border-box;
        }
        .scheduling-grid-container > * {
          min-width: 0;
        }
        @media (max-width: 1150px) {
          .scheduling-grid-container {
            grid-template-columns: 1fr;
          }
        }
        .scheduling-metrics-banner {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 12px;
          margin-bottom: 20px;
          background: rgba(255, 255, 255, 0.02);
          padding: 12px;
          border-radius: 16px;
          border: 1px solid rgba(255, 255, 255, 0.05);
          animation: schedulingCardFadeIn 0.5s cubic-bezier(0.16, 1, 0.3, 1) both;
          animation-delay: 50ms;
        }
        @media (max-width: 600px) {
          .scheduling-metrics-banner {
            grid-template-columns: 1fr;
          }
        }
        @media (max-width: 1150px) {
          .premium-row-card {
            gap: 12px !important;
            padding: 12px 14px !important;
          }
        }
        @media (max-width: 768px) {
          .premium-row-card {
            gap: 8px !important;
            padding: 10px 12px !important;
          }
        }

        .scheduling-aside {
          position: sticky;
          top: 20px;
          display: flex;
          flex-direction: column;
          gap: 20px;
          z-index: 10;
        }
        @media (max-width: 1150px) {
          .scheduling-aside {
            position: relative;
            top: 0;
            z-index: 1;
          }
        }

        .premium-calendar-aside {
          background: rgba(18, 18, 18, 0.4);
          backdrop-filter: blur(20px);
          border: 1px solid rgba(255, 255, 255, 0.04);
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.4);
          border-radius: 28px;
          padding: 24px;
          max-width: 340px;
          width: 100%;
          margin: 0 auto;
        }
        .premium-filter-segment-list {
          display: flex;
          flex-direction: column;
          gap: 6px;
          background-color: rgba(0, 0, 0, 0.25);
          padding: 6px;
          border-radius: 20px;
          border: 1px solid rgba(255, 255, 255, 0.03);
        }
        .premium-filter-btn {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px 18px;
          border-radius: 16px;
          border: none;
          background: transparent;
          color: rgba(255, 255, 255, 0.6);
          font-weight: 700;
          font-size: 13px;
          cursor: pointer;
          transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
          text-align: left;
        }
        .premium-filter-btn:hover {
          color: white;
          background: rgba(255, 255, 255, 0.02);
        }
        .premium-filter-btn.active {
          background: var(--gold-primary);
          color: #121212;
          box-shadow: 0 4px 15px rgba(255, 255, 255, 0.25);
        }
        .premium-search-box {
          background: rgba(18, 18, 18, 0.4);
          backdrop-filter: blur(15px);
          border: 1px solid rgba(255, 255, 255, 0.05);
          padding: 14px 22px;
          margin-bottom: 24px;
          border-radius: 20px;
          display: flex;
          align-items: center;
          gap: 14px;
          transition: all 0.3s ease;
          animation: schedulingCardFadeIn 0.5s cubic-bezier(0.16, 1, 0.3, 1) both;
        }
        .premium-search-box:focus-within {
          border-color: rgba(255, 255, 255, 0.4);
          box-shadow: 0 0 20px rgba(255, 255, 255, 0.15), inset 0 0 10px rgba(0,0,0,0.5);
        }
        .premium-search-input {
          flex: 1;
          background: none;
          border: none;
          color: white;
          font-size: 14px;
          font-weight: 700;
          outline: none;
        }
        .premium-search-input::placeholder {
          color: rgba(255, 255, 255, 0.35);
        }
        .appointment-list-wrapper {
          background: rgba(18, 18, 18, 0.2);
          border: 1px solid rgba(255, 255, 255, 0.04);
          border-radius: 28px;
          overflow: hidden;
          box-shadow: 0 15px 35px rgba(0, 0, 0, 0.3);
        }
        @keyframes schedulingCardFadeIn {
          from {
            opacity: 0;
            transform: translateY(12px) scale(0.995);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
        .premium-row-card {
          padding: 16px 24px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.03);
          display: flex;
          align-items: center;
          gap: 16px;
          cursor: pointer;
          transition: all 0.25s ease, border-color 0.2s, background-color 0.2s, transform 0.25s cubic-bezier(0.16, 1, 0.3, 1);
          background-color: transparent;
          animation: schedulingCardFadeIn 0.45s cubic-bezier(0.16, 1, 0.3, 1) both;
        }
        .mobile-row-card {
          animation: schedulingCardFadeIn 0.45s cubic-bezier(0.16, 1, 0.3, 1) both;
        }
        .scheduling-group-card {
          animation: schedulingCardFadeIn 0.5s cubic-bezier(0.16, 1, 0.3, 1) both;
        }
        .premium-row-card:hover {
          background-color: rgba(255, 255, 255, 0.02);
          border-color: rgba(255, 255, 255, 0.12);
          transform: scale(1.002);
        }
        .avatar-gradient-circle {
          width: 36px;
          height: 36px;
          min-width: 36px;
          border-radius: 50%;
          background: linear-gradient(135deg, rgba(255, 255, 255, 0.25) 0%, rgba(255, 255, 255, 0.05) 100%);
          border: 1.5px solid rgba(255, 255, 255, 0.4);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 13px;
          color: var(--gold-primary);
          font-weight: 900;
          line-height: 1;
          box-shadow: 0 4px 12px rgba(0,0,0,0.3), 0 0 8px rgba(255, 255, 255,0.15);
          flex-shrink: 0;
        }
        .status-glow-badge {
          font-size: 10px;
          font-weight: 850;
          padding: 4px 12px;
          border-radius: 20px;
          text-transform: uppercase;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          letter-spacing: 0.5px;
          box-shadow: 0 4px 10px rgba(0, 0, 0, 0.1);
        }
        .action-icon-btn {
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid rgba(255, 255, 255, 0.05);
          color: rgba(255, 255, 255, 0.3);
          cursor: pointer;
          padding: 8px;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s ease;
        }
        .premium-row-card:hover .action-icon-btn {
          color: rgba(255, 255, 255, 0.6);
        }
        .action-icon-btn.edit:hover {
          color: var(--gold-primary);
          border-color: rgba(255, 255, 255, 0.3);
          background: rgba(255, 255, 255, 0.08);
          box-shadow: 0 4px 10px rgba(255, 255, 255, 0.1);
        }
        .action-icon-btn.delete:hover {
          color: #ff453a;
          border-color: rgba(255, 69, 58, 0.3);
          background: rgba(255, 69, 58, 0.08);
          box-shadow: 0 4px 10px rgba(255, 69, 58, 0.1);
        }
        .blinking-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          display: inline-block;
          animation: statusGlow 1.8s ease-in-out infinite;
        }
        @keyframes statusGlow {
          0% { opacity: 0.4; transform: scale(0.9); }
          50% { opacity: 1; transform: scale(1.1); }
          100% { opacity: 0.4; transform: scale(0.9); }
        }
        .price-highlight-tag {
          font-family: 'Outfit', var(--font-sans), system-ui;
          font-weight: 950;
          font-size: 15px;
          color: #30d158;
          text-shadow: 0 0 10px rgba(48, 209, 88, 0.15);
        }
        .date-navigator-card {
          padding: 16px 24px;
          margin-bottom: 20px;
          border-radius: 24px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          border: 1px solid rgba(255, 255, 255, 0.04);
          background: rgba(18, 18, 18, 0.3);
          box-sizing: border-box;
          width: 100%;
          overflow: hidden;
        }
        @media (max-width: 600px) {
          .date-navigator-card {
            gap: 10px;
            padding: 10px 12px;
            border-radius: 18px;
            margin-bottom: 12px;
            box-sizing: border-box;
            width: 100%;
            max-width: 100%;
          }
          .date-navigator-main {
            gap: 10px !important;
            min-width: 0;
          }
          .date-navigator-main h2 {
            font-size: 14px !important;
            line-height: 1.2;
          }
          .date-navigator-actions {
            flex-shrink: 0;
          }
          .date-navigator-actions button {
            width: 34px !important;
            height: 34px !important;
            border-radius: 10px !important;
          }
        }
        .scheduling-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 30px;
          gap: 16px;
          max-width: 100%;
          box-sizing: border-box;
        }
        .scheduling-header-actions {
          display: flex;
          align-items: center;
          justify-content: flex-end;
          gap: 10px;
          min-width: 0;
        }
        .agenda-create-button {
          display: inline-flex;
          min-width: 138px;
          flex-shrink: 0;
          align-items: center;
          justify-content: center;
          gap: 7px;
          white-space: nowrap;
        }
        .desktop-header-search {
          position: relative;
          width: clamp(220px, 18vw, 300px);
          flex-shrink: 1;
        }
        .desktop-header-search input {
          width: 100%;
          height: 46px;
          box-sizing: border-box;
          padding: 0 38px 0 40px;
          border: 1px solid rgba(255,255,255,0.065);
          border-radius: 15px;
          outline: none;
          background: rgba(255,255,255,0.022);
          color: white;
          font-size: 12px;
          font-weight: 650;
          transition: border-color 0.2s ease, background 0.2s ease, box-shadow 0.2s ease;
        }
        .desktop-header-search input:focus {
          border-color: rgba(17, 17, 17,0.26);
          background: rgba(255,255,255,0.04);
          box-shadow: 0 0 0 3px rgba(17, 17, 17,0.055);
        }
        .desktop-header-search input::-webkit-search-cancel-button {
          appearance: none;
        }
        .desktop-header-search > svg {
          position: absolute;
          top: 50%;
          left: 14px;
          color: rgba(255,255,255,0.36);
          pointer-events: none;
          transform: translateY(-50%);
        }
        .desktop-header-search-clear {
          position: absolute;
          top: 50%;
          right: 8px;
          display: grid;
          place-items: center;
          width: 27px;
          height: 27px;
          padding: 0;
          border: 0;
          border-radius: 8px;
          background: rgba(255,255,255,0.045);
          color: rgba(255,255,255,0.52);
          cursor: pointer;
          transform: translateY(-50%);
        }
        .desktop-header-date-nav {
          display: flex;
          align-items: center;
          gap: 8px;
          min-height: 50px;
          padding: 5px 6px 5px 9px;
          border: 1px solid rgba(255,255,255,0.065);
          border-radius: 17px;
          background: rgba(255,255,255,0.022);
          box-shadow: 0 12px 30px rgba(0,0,0,0.16);
        }
        .desktop-header-date-label {
          display: flex;
          align-items: center;
          gap: 9px;
          min-width: 210px;
          padding: 0 8px;
          color: white;
          font-size: 14px;
          font-weight: 900;
          text-transform: capitalize;
          white-space: nowrap;
        }
        .desktop-header-date-icon {
          display: grid;
          place-items: center;
          width: 32px;
          height: 32px;
          flex-shrink: 0;
          border-radius: 10px;
          background: var(--gold-primary);
          color: #111;
        }
        .desktop-header-nav-button {
          display: grid;
          place-items: center;
          width: 36px;
          height: 36px;
          flex-shrink: 0;
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 11px;
          background: rgba(255,255,255,0.04);
          color: white;
          cursor: pointer;
        }
        .agenda-view-select-panda {
          width: 112px !important;
          flex-shrink: 0;
          margin: 0 !important;
        }
        .agenda-status-select-panda {
          width: 132px !important;
          flex-shrink: 0;
          margin: 0 !important;
        }
        .desktop-team-select-panda {
          width: 188px !important;
          flex-shrink: 0;
          margin: 0 !important;
        }
        .agenda-status-premium-dropdown {
          min-width: 164px !important;
          padding: 5px !important;
          border-radius: 13px !important;
          border-color: rgba(17, 17, 17,0.15) !important;
          box-shadow: 0 14px 34px rgba(0,0,0,0.62), 0 0 0 1px rgba(255,255,255,0.025) !important;
        }
        .agenda-status-premium-dropdown .panda-option {
          min-height: 34px;
          box-sizing: border-box;
          padding: 8px 11px !important;
          border-radius: 8px !important;
          color: rgba(255,255,255,0.72) !important;
          font-size: 12px !important;
          font-weight: 720 !important;
          line-height: 18px;
          white-space: nowrap;
          margin-bottom: 1px !important;
        }
        .agenda-status-premium-dropdown .panda-option.selected {
          background: rgba(17, 17, 17,0.12) !important;
          color: var(--gold-primary) !important;
        }
        .agenda-status-premium-dropdown .panda-option:hover {
          background: rgba(255,255,255,0.055) !important;
          color: white !important;
          transform: translateX(2px) !important;
        }
        .agenda-view-premium-dropdown {
          min-width: 138px !important;
          padding: 5px !important;
          border-radius: 13px !important;
          border-color: rgba(17, 17, 17,0.15) !important;
          box-shadow: 0 14px 34px rgba(0,0,0,0.62), 0 0 0 1px rgba(255,255,255,0.025) !important;
        }
        .agenda-view-premium-dropdown .panda-option {
          white-space: nowrap;
          min-height: 34px;
          box-sizing: border-box;
          padding: 8px 11px !important;
          border-radius: 8px !important;
          color: rgba(255,255,255,0.72) !important;
          font-size: 12px !important;
          font-weight: 720 !important;
          line-height: 18px;
          margin-bottom: 1px !important;
        }
        .agenda-view-premium-dropdown .panda-option.selected {
          background: rgba(17, 17, 17,0.12) !important;
          color: var(--gold-primary) !important;
        }
        .agenda-view-premium-dropdown .panda-option:hover {
          background: rgba(255,255,255,0.055) !important;
          color: white !important;
          transform: translateX(2px) !important;
        }
        @media (min-width: 601px) {
          .mobile-date-navigator-card {
            display: none;
          }
        }
        @media (max-width: 1100px) {
          .desktop-header-search {
            display: none;
          }
          .desktop-team-select-panda {
            display: none;
          }
          .agenda-status-select-panda {
            display: none;
          }
          .desktop-header-date-label {
            min-width: 170px;
            font-size: 13px;
          }
        }
        @media (min-width: 601px) and (max-width: 1100px) {
          .scheduling-header {
            display: grid;
            grid-template-columns: minmax(0, 1fr) auto;
            align-items: start;
            column-gap: 14px;
            row-gap: 12px;
            margin-bottom: 20px;
          }
          .scheduling-header-title {
            min-width: 0;
            grid-column: 1;
            grid-row: 1;
          }
          .scheduling-header-title h1 {
            white-space: nowrap;
          }
          .scheduling-header-actions {
            display: contents;
          }
          .agenda-create-button {
            grid-column: 2;
            grid-row: 1;
            align-self: start;
          }
          .desktop-header-date-nav {
            width: 100%;
            min-width: 0;
            grid-column: 1 / -1;
            grid-row: 2;
            box-sizing: border-box;
            gap: 4px;
            padding-right: 5px;
            padding-left: 7px;
          }
          .desktop-header-date-label {
            min-width: 0;
            flex: 1;
            gap: 7px;
            padding: 0 4px;
            overflow: hidden;
            font-size: 12px;
          }
          .desktop-header-date-label > span:last-child {
            overflow: hidden;
            text-overflow: ellipsis;
          }
          .desktop-header-date-icon {
            width: 29px;
            height: 29px;
            border-radius: 9px;
          }
          .desktop-header-nav-button {
            width: 32px;
            height: 32px;
            border-radius: 9px;
          }
          .agenda-view-select-panda {
            width: 92px !important;
          }
        }
        @media (min-width: 1101px) and (max-width: 1450px) {
          .desktop-header-search {
            width: 170px;
          }
          .desktop-header-date-label {
            min-width: 145px;
          }
          .agenda-status-select-panda {
            width: 118px !important;
          }
          .desktop-header-date-nav {
            gap: 5px;
          }
        }
        @media (min-width: 1101px) {
          .scheduling-header {
            align-items: stretch;
            flex-direction: column;
            gap: 17px;
            margin-bottom: 24px;
          }
          .scheduling-header-actions {
            width: 100%;
            flex-wrap: wrap;
            justify-content: flex-start;
          }
          .desktop-header-search {
            width: auto;
            min-width: 200px;
            max-width: 300px;
            flex: 1 1 220px;
          }
          .desktop-header-date-nav {
            margin-left: auto;
          }
        }
        @media (min-width: 1101px) and (max-width: 1320px) {
          .desktop-header-search {
            max-width: none;
          }
          .desktop-header-date-nav {
            min-width: min(100%, 430px);
            flex: 1 1 430px;
            margin-left: 0;
          }
          .desktop-header-date-label {
            min-width: 0;
            flex: 1;
          }
        }
        @media (max-width: 600px) {
          .scheduling-header {
            flex-direction: row;
            align-items: flex-start;
            margin-bottom: 18px;
          }
          .desktop-header-date-nav {
            display: none;
          }
          .mobile-date-navigator-card {
            flex-direction: column;
            align-items: stretch;
          }
          .mobile-date-navigator-card .date-navigator-actions {
            justify-content: space-between;
            width: 100%;
          }
          .mobile-date-navigator-card .agenda-view-select-panda {
            flex: 1;
            width: auto !important;
          }
          .scheduling-header h1 {
            font-size: 26px !important;
          }
          .scheduling-header p {
            display: none;
          }
          .agenda-create-button {
            min-width: 124px;
            padding-right: 12px !important;
            padding-left: 12px !important;
            font-size: 12px;
          }
          .mobile-date-navigator-card .date-navigator-actions .show-on-tablet,
          .mobile-date-navigator-card .agenda-view-select-panda {
            display: none !important;
          }
          .premium-search-box {
            box-sizing: border-box;
            width: 100%;
            max-width: 100%;
          }
          .weekly-ribbon {
            box-sizing: border-box;
            width: 100%;
            max-width: 100%;
          }
          .premium-filter-tabs {
            box-sizing: border-box;
            width: 100%;
            max-width: 100%;
          }
          .scheduling-group-card {
            box-sizing: border-box;
            width: 100%;
            max-width: 100%;
          }
          .scheduling-metrics-banner {
            box-sizing: border-box;
            max-width: 100%;
          }
        }

        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .animate-spin {
          animation: spin 0.9s linear infinite;
          display: block;
        }
        @media (min-width: 1151px) {
          .show-on-tablet {
            display: none !important;
          }
        }
        @media (max-width: 1150px) {
          .hide-on-tablet {
            display: none !important;
          }
        }

        .premium-filter-tabs {
          display: flex;
          gap: 6px;
          background: rgba(0, 0, 0, 0.25);
          padding: 4px;
          border-radius: 14px;
          border: 1px solid rgba(255, 255, 255, 0.03);
          margin-bottom: 20px;
          overflow-x: auto;
          scrollbar-width: none;
          box-sizing: border-box;
          width: 100%;
        }
        .premium-filter-tabs::-webkit-scrollbar {
          display: none;
        }
        @media (max-width: 600px) {
          .premium-filter-tabs {
            display: grid;
            grid-template-columns: repeat(3, minmax(0, 1fr));
            overflow-x: visible;
            margin-bottom: 12px;
            padding: 4px;
            border-radius: 13px;
          }
          .premium-filter-tabs:not(.show-advanced) .mobile-secondary-filter { display: none; }
          .premium-filter-tabs.show-advanced .mobile-primary-filter { display: none; }
          .premium-filter-tabs.show-advanced { grid-template-columns: repeat(3, minmax(0, 1fr)); }
          .premium-tab-btn {
            flex: unset !important;
            width: 100%;
            font-size: 11px !important;
            padding: 9px 8px !important;
            gap: 5px !important;
          }
        }
        .premium-tab-btn {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 8px 12px;
          border-radius: 10px;
          border: none;
          background: transparent;
          color: rgba(255, 255, 255, 0.6);
          font-weight: 700;
          font-size: 12px;
          cursor: pointer;
          white-space: nowrap;
          transition: all 0.2s ease;
        }
        .premium-tab-btn:hover {
          color: white;
        }
        .premium-tab-btn.active {
          background: var(--gold-primary);
          color: #121212;
          font-weight: 800;
          box-shadow: 0 2px 8px rgba(255, 255, 255, 0.2);
        }

        .weekly-ribbon {
          display: flex;
          justify-content: space-between;
          background: rgba(18, 18, 18, 0.3);
          border: 1px solid rgba(255, 255, 255, 0.04);
          padding: 12px;
          border-radius: 20px;
          margin-bottom: 20px;
          gap: 8px;
          overflow-x: auto;
          scrollbar-width: none;
        }
        .weekly-ribbon::-webkit-scrollbar {
          display: none;
        }
        .ribbon-day-btn {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 8px 4px;
          border-radius: 12px;
          border: none;
          background: transparent;
          color: rgba(255, 255, 255, 0.6);
          cursor: pointer;
          transition: all 0.2s ease;
          min-width: 36px;
        }
        .ribbon-day-btn:hover {
          color: white;
          background: rgba(255, 255, 255, 0.04);
        }
        .ribbon-day-btn.active {
          background: var(--gold-primary);
          color: #121212;
          font-weight: 800;
          box-shadow: 0 4px 12px rgba(255, 255, 255, 0.25);
        }
        .ribbon-day-btn.today {
          border: 1px solid rgba(255, 255, 255, 0.45) !important;
          background: rgba(255, 255, 255, 0.08);
          color: var(--gold-primary);
        }
        .ribbon-day-btn.today.active {
          border: none !important;
          background: var(--gold-primary);
          color: #121212;
        }
        .ribbon-day-name {
          font-size: 9px;
          font-weight: 900;
          text-transform: uppercase;
          margin-bottom: 4px;
          letter-spacing: 0.5px;
        }
        .ribbon-day-num {
          font-size: 14px;
          font-weight: 800;
        }
        .ribbon-dot {
          width: 4px;
          height: 4px;
          border-radius: 50%;
          margin-top: 4px;
        }
        .mobile-more-filter,
        .mobile-empty-actions {
          display: none;
        }
        .desktop-agenda-metrics,
        .agenda-show-more {
          display: none !important;
        }
        .mobile-day-summary {
          display: flex;
          align-items: center;
          justify-content: flex-start;
          gap: 14px;
          margin: 0 0 16px;
          color: rgba(255,255,255,0.52);
          font-size: 11px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.4px;
        }
        .mobile-day-summary strong {
          color: white;
          font-size: 14px;
        }
        .mobile-day-summary-divider {
          width: 1px;
          height: 24px;
          background: rgba(255,255,255,0.08);
        }
        .mobile-status-filters {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 7px;
          width: min(100%, 440px);
          margin: 0 0 18px;
        }
        .mobile-status-filter {
          min-height: 38px;
          padding: 8px 10px;
          border-radius: 12px;
          border: 1px solid rgba(255,255,255,0.07);
          background: rgba(255,255,255,0.025);
          color: rgba(255,255,255,0.56);
          font-size: 11px;
          font-weight: 800;
          cursor: pointer;
        }
        .mobile-status-filter strong {
          margin-left: 4px;
          color: rgba(255,255,255,0.85);
        }
        .mobile-status-filter.active {
          color: #121212;
          background: var(--gold-primary);
          border-color: transparent;
        }
        .mobile-status-filter.active strong {
          color: #121212;
        }
        .agenda-groups-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
          gap: 16px;
          align-items: start;
        }
        .mobile-timeline-list {
          gap: 10px !important;
        }
        .mobile-timeline-item {
          display: grid;
          grid-template-columns: 56px 14px minmax(0, 1fr);
          gap: 9px;
          align-items: stretch;
          cursor: pointer;
        }
        .mobile-timeline-time {
          padding-top: 15px;
          text-align: right;
          color: white;
          font-size: 12px;
          font-weight: 900;
          line-height: 1.05;
        }
        .mobile-timeline-time small {
          display: block;
          margin-top: 4px;
          color: rgba(255,255,255,0.36);
          font-size: 8px;
          font-weight: 800;
        }
        .mobile-timeline-rail {
          position: relative;
        }
        .mobile-timeline-rail::before {
          content: '';
          position: absolute;
          left: 50%;
          top: 0;
          bottom: -10px;
          width: 1px;
          background: rgba(17, 17, 17,0.17);
        }
        .mobile-timeline-dot {
          position: absolute;
          z-index: 1;
          left: 50%;
          top: 19px;
          width: 8px;
          height: 8px;
          border: 2px solid #09090b;
          border-radius: 50%;
          box-shadow: 0 0 0 2px rgba(17, 17, 17,0.18);
          transform: translateX(-50%);
        }
        .mobile-appointment-card {
          min-width: 0;
          padding: 13px 14px;
          border: 1px solid rgba(255,255,255,0.07);
          border-radius: 16px;
          background: linear-gradient(145deg, rgba(255,255,255,0.035), rgba(255,255,255,0.018));
          transition: border-color 0.2s ease, transform 0.2s ease, background 0.2s ease;
        }
        .mobile-timeline-item:hover .mobile-appointment-card {
          border-color: rgba(17, 17, 17,0.24);
          background: rgba(17, 17, 17,0.045);
          transform: translateY(-1px);
        }
        .mobile-appointment-top,
        .mobile-appointment-bottom {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
        }
        .mobile-appointment-client {
          min-width: 0;
          overflow: hidden;
          color: white;
          font-size: 13px;
          font-weight: 900;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .mobile-appointment-service {
          margin: 6px 0 10px;
          overflow: hidden;
          color: rgba(255,255,255,0.52);
          font-size: 11px;
          font-weight: 650;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .mobile-appointment-professional {
          display: flex;
          align-items: center;
          gap: 6px;
          min-width: 0;
          color: rgba(255,255,255,0.46);
          font-size: 10px;
          font-weight: 750;
        }
        .mobile-appointment-professional img,
        .mobile-appointment-professional-avatar {
          width: 20px;
          height: 20px;
          border-radius: 50%;
          object-fit: cover;
        }
        .mobile-appointment-price {
          flex-shrink: 0;
          color: var(--gold-primary);
          font-size: 11px;
          font-weight: 900;
          text-align: right;
        }
        .mobile-appointment-price small {
          display: block;
          margin-top: 2px;
          color: rgba(255,255,255,0.36);
          font-size: 8px;
        }
        @media (max-width: 600px) {
          .mobile-more-filter {
            display: flex;
          }
          .weekly-ribbon {
            padding: 6px;
            gap: 2px;
            border-radius: 16px;
            margin-bottom: 10px;
          }
          .agenda-groups-grid {
            display: block;
          }
          .ribbon-day-btn {
            min-width: 38px;
            padding: 7px 3px;
            border-radius: 11px;
          }
          .mobile-day-summary {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 8px;
            margin: 0 2px 14px;
            color: rgba(255,255,255,0.52);
            font-size: 10px;
            font-weight: 800;
            text-transform: uppercase;
            letter-spacing: 0.35px;
          }
          .mobile-day-summary strong {
            color: white;
            font-size: 12px;
          }
          .mobile-day-summary-divider {
            width: 1px;
            height: 22px;
            background: rgba(255,255,255,0.08);
          }
          .mobile-status-filters {
            display: grid;
            grid-template-columns: repeat(3, minmax(0, 1fr));
            gap: 6px;
            margin: 0 0 14px;
          }
          .mobile-status-filter {
            min-height: 36px;
            padding: 7px 6px;
            border-radius: 11px;
            border: 1px solid rgba(255,255,255,0.06);
            background: rgba(255,255,255,0.025);
            color: rgba(255,255,255,0.52);
            font-size: 10px;
            font-weight: 800;
            cursor: pointer;
          }
          .mobile-status-filter strong {
            margin-left: 3px;
            color: rgba(255,255,255,0.82);
          }
          .mobile-status-filter.active {
            color: #121212;
            background: var(--gold-primary);
            border-color: transparent;
          }
          .mobile-status-filter.active strong {
            color: #121212;
          }
          .agenda-search-shell {
            margin-bottom: 18px !important;
          }
          .agenda-search-shell input {
            height: 46px !important;
            padding-left: 44px !important;
            font-size: 13px !important;
            border-radius: 16px !important;
          }
          .agenda-search-shell svg {
            left: 15px !important;
          }
          .scheduling-empty-state {
            min-height: 245px;
            justify-content: center;
            padding: 28px 18px !important;
            border: 1px dashed rgba(17, 17, 17,0.16);
            border-radius: 22px;
            background: linear-gradient(180deg, rgba(17, 17, 17,0.035), rgba(255,255,255,0.012));
          }
          .scheduling-empty-icon {
            width: 58px !important;
            height: 58px !important;
            margin-bottom: 16px !important;
            border-radius: 17px !important;
          }
          .mobile-empty-actions {
            display: flex;
            gap: 8px;
            width: 100%;
            max-width: 300px;
            margin-top: 20px;
          }
          .mobile-empty-actions button {
            flex: 1;
            min-height: 42px;
            border-radius: 13px;
            font-size: 11px;
            font-weight: 850;
            cursor: pointer;
          }
          .desktop-agenda-metrics {
            display: none !important;
          }
          .appointment-list-wrapper {
            padding-bottom: 92px;
          }
          .scheduling-group-card {
            padding: 0 !important;
            margin-bottom: 20px !important;
            border: none !important;
            border-radius: 0 !important;
            background: transparent !important;
            box-shadow: none !important;
          }
          .agenda-group-header {
            padding: 5px 2px 10px !important;
            border: none !important;
            border-radius: 0 !important;
            background: transparent !important;
            box-shadow: none !important;
            cursor: default !important;
          }
          .agenda-group-heading {
            gap: 8px !important;
          }
          .agenda-group-icon {
            padding: 0 !important;
            background: transparent !important;
          }
          .agenda-group-title {
            font-size: 11px !important;
            letter-spacing: 0.7px !important;
            text-transform: uppercase;
            color: rgba(255,255,255,0.72) !important;
          }
          .agenda-group-count {
            padding: 2px 6px !important;
            font-size: 9px !important;
          }
          .agenda-group-staff,
          .agenda-group-collapse,
          .agenda-group-share,
          .agenda-show-more {
            display: none !important;
          }
          .mobile-timeline-list {
            gap: 8px !important;
            margin-top: 0 !important;
          }
          .mobile-timeline-item {
            display: grid;
            grid-template-columns: 47px 12px minmax(0, 1fr);
            gap: 7px;
            align-items: stretch;
            cursor: pointer;
          }
          .mobile-timeline-time {
            padding-top: 14px;
            text-align: right;
            color: white;
            font-size: 11px;
            font-weight: 900;
            line-height: 1.05;
          }
          .mobile-timeline-time small {
            display: block;
            margin-top: 3px;
            color: rgba(255,255,255,0.34);
            font-size: 8px;
            font-weight: 800;
          }
          .mobile-timeline-rail {
            position: relative;
          }
          .mobile-timeline-rail::before {
            content: '';
            position: absolute;
            left: 50%;
            top: 0;
            bottom: -8px;
            width: 1px;
            background: rgba(17, 17, 17,0.17);
          }
          .mobile-timeline-dot {
            position: absolute;
            z-index: 1;
            left: 50%;
            top: 18px;
            width: 7px;
            height: 7px;
            border: 2px solid #09090b;
            border-radius: 50%;
            background: var(--gold-primary);
            box-shadow: 0 0 0 2px rgba(17, 17, 17,0.18);
            transform: translateX(-50%);
          }
          .mobile-appointment-card {
            min-width: 0;
            padding: 11px 12px;
            border: 1px solid rgba(255,255,255,0.065);
            border-radius: 15px;
            background: rgba(255,255,255,0.025);
          }
          .mobile-appointment-top,
          .mobile-appointment-bottom {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 8px;
          }
          .mobile-appointment-client {
            min-width: 0;
            overflow: hidden;
            color: white;
            font-size: 12px;
            font-weight: 900;
            text-overflow: ellipsis;
            white-space: nowrap;
          }
          .mobile-appointment-service {
            margin: 5px 0 8px;
            overflow: hidden;
            color: rgba(255,255,255,0.5);
            font-size: 10px;
            font-weight: 650;
            text-overflow: ellipsis;
            white-space: nowrap;
          }
          .mobile-appointment-professional {
            display: flex;
            align-items: center;
            gap: 5px;
            min-width: 0;
            color: rgba(255,255,255,0.42);
            font-size: 9px;
            font-weight: 750;
          }
          .mobile-appointment-professional img,
          .mobile-appointment-professional-avatar {
            width: 18px;
            height: 18px;
            border-radius: 50%;
            object-fit: cover;
          }
          .mobile-appointment-price {
            flex-shrink: 0;
            color: var(--gold-primary);
            font-size: 10px;
            font-weight: 900;
            text-align: right;
          }
          .mobile-appointment-price small {
            display: block;
            margin-top: 2px;
            color: rgba(255,255,255,0.35);
            font-size: 8px;
          }
        }

        /* Compact CRM summary shared across desktop, tablet and mobile */
        .mobile-day-summary {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 0;
          width: 100%;
          margin: 0 0 16px;
          padding: 10px;
          border: 1px solid rgba(17, 17, 17,0.13);
          border-radius: 18px;
          background:
            radial-gradient(circle at 8% 0%, rgba(17, 17, 17,0.09), transparent 30%),
            linear-gradient(145deg, rgba(255,255,255,0.032), rgba(255,255,255,0.014));
          box-shadow: 0 12px 30px rgba(0,0,0,0.16);
          box-sizing: border-box;
          text-transform: none;
        }
        .agenda-summary-metric {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 11px;
          min-width: 0;
          padding: 5px 16px;
          border-right: 1px solid rgba(255,255,255,0.065);
        }
        .agenda-summary-metric:last-child {
          border-right: none;
        }
        .agenda-summary-icon {
          display: grid;
          place-items: center;
          width: 32px;
          height: 32px;
          flex-shrink: 0;
          border-radius: 10px;
          background: rgba(17, 17, 17,0.1);
          color: var(--gold-primary);
          box-shadow: inset 0 0 0 1px rgba(17, 17, 17,0.12);
        }
        .agenda-summary-copy {
          display: flex;
          min-width: 0;
          flex-direction: column;
          gap: 2px;
        }
        .agenda-summary-copy small {
          overflow: hidden;
          color: rgba(255,255,255,0.43);
          font-size: 9px;
          font-weight: 800;
          letter-spacing: 0.55px;
          line-height: 1;
          text-overflow: ellipsis;
          text-transform: uppercase;
          white-space: nowrap;
        }
        .mobile-day-summary .agenda-summary-copy strong {
          color: white;
          font-family: 'Outfit', var(--font-sans), system-ui;
          font-size: 18px;
          font-weight: 950;
          letter-spacing: -0.35px;
          line-height: 1.05;
        }
        .agenda-summary-metric--completed .agenda-summary-icon,
        .agenda-summary-metric--completed strong {
          color: #30d158 !important;
        }
        .agenda-summary-metric--completed .agenda-summary-icon {
          background: rgba(48,209,88,0.09);
          box-shadow: inset 0 0 0 1px rgba(48,209,88,0.13);
        }
        .agenda-summary-metric--estimate .agenda-summary-icon,
        .agenda-summary-metric--estimate strong {
          color: #ffd89b !important;
        }
        .agenda-summary-metric--estimate .agenda-summary-icon {
          background: rgba(255,216,155,0.09);
          box-shadow: inset 0 0 0 1px rgba(255,216,155,0.13);
        }
        @media (max-width: 600px) {
          .mobile-day-summary--admin {
            display: none;
          }
          .mobile-day-summary {
            padding: 8px 4px;
            border-radius: 16px;
          }
          .agenda-summary-metric {
            flex-direction: column;
            gap: 5px;
            padding: 5px 3px;
            text-align: center;
          }
          .agenda-summary-icon {
            width: 27px;
            height: 27px;
            border-radius: 9px;
          }
          .agenda-summary-copy {
            align-items: center;
          }
          .agenda-summary-copy small {
            max-width: 76px;
            font-size: 7px;
            letter-spacing: 0.35px;
          }
          .mobile-day-summary .agenda-summary-copy strong {
            font-size: 15px;
          }
        }

        /* Search shares the toolbar with status filters on wide screens */
        .agenda-list-tools {
          width: 100%;
          margin-bottom: 22px;
        }
        .agenda-list-tools .agenda-search-shell {
          width: 100%;
          margin-bottom: 0 !important;
        }
        .mobile-agenda-controls {
          display: none;
        }
        .admin-team-toolbar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 18px;
          margin-bottom: 18px;
          padding: 12px 14px 12px 18px;
          border: 1px solid rgba(255,255,255,0.06);
          border-radius: 17px;
          background: linear-gradient(110deg, rgba(17, 17, 17,0.055), rgba(255,255,255,0.014));
          box-sizing: border-box;
        }
        .admin-team-toolbar-copy {
          display: flex;
          min-width: 0;
          flex-direction: column;
          gap: 3px;
        }
        .admin-team-toolbar-copy strong {
          color: white;
          font-family: 'Outfit', var(--font-sans), system-ui;
          font-size: 14px;
          font-weight: 900;
        }
        .admin-team-toolbar-copy span {
          color: rgba(255,255,255,0.42);
          font-size: 10px;
          font-weight: 650;
        }
        .agenda-team-select-panda {
          width: 210px !important;
          flex-shrink: 0;
          margin: 0 !important;
        }
        @media (max-width: 600px) {
          .admin-team-toolbar {
            display: none;
          }
          .agenda-list-tools {
            display: none;
          }
          .mobile-agenda-controls {
            display: grid;
            grid-template-columns: minmax(0, 1fr) minmax(104px, 0.72fr) 42px;
            gap: 7px;
            width: 100%;
            margin-bottom: 16px;
          }
          .mobile-agenda-controls.is-professional {
            grid-template-columns: minmax(0, 1fr) 42px;
          }
          .mobile-agenda-team-select,
          .mobile-agenda-status-select {
            width: 100% !important;
            min-width: 0;
            margin: 0 !important;
          }
          .mobile-agenda-search-toggle {
            display: grid;
            width: 42px;
            height: 42px;
            padding: 0;
            place-items: center;
            border: 1px solid rgba(255,255,255,0.07);
            border-radius: 12px;
            background: rgba(255,255,255,0.03);
            color: rgba(255,255,255,0.62);
          }
          .mobile-agenda-search-toggle.is-active {
            border-color: rgba(17, 17, 17,0.3);
            background: rgba(17, 17, 17,0.1);
            color: var(--gold-primary);
          }
          .mobile-agenda-search-shell {
            position: relative;
            display: none;
            min-width: 0;
            grid-column: 1 / -1;
          }
          .mobile-agenda-search-shell.is-open {
            display: block;
            animation: fadeIn 160ms ease-out;
          }
          .mobile-agenda-search-shell > svg {
            position: absolute;
            top: 50%;
            left: 14px;
            z-index: 1;
            color: rgba(255,255,255,0.38);
            pointer-events: none;
            transform: translateY(-50%);
          }
          .mobile-agenda-search-shell input {
            width: 100%;
            height: 43px;
            box-sizing: border-box;
            padding: 0 40px 0 40px;
            border: 1px solid rgba(255,255,255,0.075);
            border-radius: 13px;
            outline: none;
            background: rgba(255,255,255,0.03);
            color: white;
            font-size: 12px;
            font-weight: 650;
          }
          .mobile-agenda-search-clear {
            position: absolute;
            top: 50%;
            right: 7px;
            display: grid;
            width: 28px;
            height: 28px;
            padding: 0;
            place-items: center;
            border: 0;
            border-radius: 8px;
            background: rgba(255,255,255,0.05);
            color: rgba(255,255,255,0.6);
            transform: translateY(-50%);
          }
        }
        @media (min-width: 1101px) {
          .admin-team-toolbar {
            display: none;
          }
        }
        @media (min-width: 901px) {
          .agenda-list-tools {
            display: grid;
            grid-template-columns: minmax(300px, 380px) minmax(300px, 410px);
            align-items: center;
            justify-content: space-between;
            gap: 14px;
          }
          .agenda-list-tools .mobile-status-filters {
            width: 100%;
            max-width: 380px;
            margin: 0;
            padding: 3px;
            gap: 2px;
            border: 1px solid rgba(255,255,255,0.055);
            border-radius: 13px;
            background: rgba(255,255,255,0.018);
            box-sizing: border-box;
          }
          .agenda-list-tools .mobile-status-filter {
            min-height: 38px;
            padding: 6px 8px;
            border-color: transparent;
            border-radius: 10px;
            background: transparent;
            font-size: 10px;
          }
          .agenda-list-tools .mobile-status-filter.active {
            color: var(--gold-primary);
            border-color: rgba(17, 17, 17,0.12);
            background: rgba(17, 17, 17,0.1);
            box-shadow: inset 0 0 0 1px rgba(17, 17, 17,0.025);
          }
          .agenda-list-tools .mobile-status-filter.active strong {
            color: var(--gold-primary);
          }
          .agenda-list-tools .agenda-search-shell input {
            height: 42px !important;
            padding-left: 46px !important;
            border-radius: 14px !important;
            border-color: rgba(255,255,255,0.055) !important;
            background: rgba(255,255,255,0.025) !important;
            font-size: 13px !important;
            box-shadow: inset 0 1px 3px rgba(0,0,0,0.18) !important;
          }
          .agenda-list-tools .agenda-search-shell svg {
            left: 16px !important;
          }
          .agenda-list-tools--search-only .agenda-search-shell {
            grid-column: 2;
          }
        }
        @media (min-width: 601px) and (max-width: 900px) {
          .agenda-list-tools .mobile-status-filters {
            width: 100%;
            max-width: none;
            margin-bottom: 10px;
          }
          .agenda-list-tools .agenda-search-shell input {
            height: 48px !important;
            border-radius: 16px !important;
            font-size: 14px !important;
          }
        }
        @media (min-width: 1101px) {
          .agenda-list-tools {
            display: none;
          }
        }
        .period-calendar {
          overflow: hidden;
          border: 1px solid rgba(255,255,255,0.065);
          border-radius: 22px;
          background: rgba(255,255,255,0.012);
          box-shadow: 0 18px 45px rgba(0,0,0,0.16);
        }
        .period-calendar-weekdays {
          display: grid;
          grid-template-columns: repeat(7, minmax(0, 1fr));
          border-bottom: 1px solid rgba(255,255,255,0.06);
          background: rgba(255,255,255,0.018);
        }
        .period-calendar-weekdays span {
          padding: 12px 8px;
          color: rgba(255,255,255,0.4);
          font-size: 9px;
          font-weight: 850;
          letter-spacing: 0.7px;
          text-align: center;
          text-transform: uppercase;
        }
        .period-calendar-grid {
          display: grid;
          grid-template-columns: repeat(7, minmax(0, 1fr));
        }
        .period-day-card {
          min-width: 0;
          min-height: 218px;
          padding: 10px;
          overflow: hidden;
          border-right: 1px solid rgba(255,255,255,0.052);
          border-bottom: 1px solid rgba(255,255,255,0.052);
          background: rgba(255,255,255,0.008);
          box-sizing: border-box;
        }
        .period-calendar--month .period-day-card {
          min-height: 126px;
          padding: 8px;
        }
        .period-day-card:nth-child(7n) {
          border-right: none;
        }
        .period-day-card.is-outside-month {
          background: rgba(0,0,0,0.14);
          opacity: 0.42;
        }
        .period-day-heading {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 6px;
          width: 100%;
          margin-bottom: 9px;
          padding: 0;
          border: 0;
          background: transparent;
          color: rgba(255,255,255,0.72);
          text-align: left;
          cursor: pointer;
        }
        .period-day-heading strong {
          overflow: hidden;
          font-size: 11px;
          font-weight: 850;
          text-overflow: ellipsis;
          text-transform: capitalize;
          white-space: nowrap;
        }
        .period-day-number {
          display: grid;
          place-items: center;
          width: 27px;
          height: 27px;
          flex-shrink: 0;
          border-radius: 9px;
          color: white;
          font-size: 11px;
          font-weight: 900;
        }
        .period-day-card.is-today .period-day-number {
          background: var(--gold-primary);
          color: #111;
          box-shadow: 0 5px 14px rgba(17, 17, 17,0.2);
        }
        .period-day-count {
          color: rgba(255,255,255,0.32);
          font-size: 8px;
          font-weight: 800;
          white-space: nowrap;
        }
        .period-day-events {
          display: flex;
          flex-direction: column;
          gap: 5px;
        }
        .period-event {
          width: 100%;
          max-width: 100%;
          min-width: 0;
          padding: 7px 8px;
          overflow: hidden;
          border: 1px solid rgba(255,255,255,0.055);
          border-left: 2px solid var(--event-color, var(--gold-primary));
          border-radius: 9px;
          background: rgba(255,255,255,0.022);
          color: white;
          cursor: pointer;
          text-align: left;
          box-sizing: border-box;
          transition: border-color 0.18s ease, background 0.18s ease, transform 0.18s ease;
        }
        .period-event:hover {
          border-color: rgba(17, 17, 17,0.2);
          background: rgba(17, 17, 17,0.05);
          transform: translateY(-1px);
        }
        .period-event-time {
          display: block;
          margin-bottom: 3px;
          color: var(--gold-primary);
          font-size: 8px;
          font-weight: 850;
          white-space: nowrap;
        }
        .period-event-client {
          display: block;
          overflow: hidden;
          font-size: 10px;
          font-weight: 850;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .period-calendar--month .period-event {
          padding: 5px 6px;
          border-radius: 7px;
        }
        .period-calendar--month .period-event-time {
          display: block;
          margin: 0 0 3px;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .period-calendar--month .period-event-client {
          display: block;
          width: 100%;
          max-width: 100%;
          font-size: 9px;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .period-calendar--week .period-calendar-weekdays,
        .period-calendar--fortnight .period-calendar-weekdays {
          display: none;
        }
        .period-calendar--week .period-calendar-grid,
        .period-calendar--fortnight .period-calendar-grid {
          display: block;
        }
        .period-calendar--week .period-day-card,
        .period-calendar--fortnight .period-day-card {
          display: grid;
          grid-template-columns: 145px minmax(0, 1fr);
          gap: 16px;
          min-height: 78px;
          padding: 14px;
          border-right: none;
          background: rgba(255,255,255,0.006);
        }
        .period-calendar--week .period-day-card:last-child,
        .period-calendar--fortnight .period-day-card:last-child {
          border-bottom: none;
        }
        .period-calendar--week .period-day-heading,
        .period-calendar--fortnight .period-day-heading {
          display: grid;
          grid-template-columns: 1fr auto;
          align-content: start;
          align-items: center;
          gap: 5px 8px;
          margin: 0;
          padding: 4px 8px 4px 2px;
        }
        .period-calendar--week .period-day-count,
        .period-calendar--fortnight .period-day-count {
          grid-column: 1 / -1;
        }
        .period-calendar--week .period-day-events,
        .period-calendar--fortnight .period-day-events {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 8px;
        }
        .period-calendar--week .period-event,
        .period-calendar--fortnight .period-event {
          min-height: 82px;
          padding: 10px 11px;
        }
        .period-calendar--week .period-event-client,
        .period-calendar--fortnight .period-event-client {
          overflow: visible;
          font-size: 12px;
          line-height: 1.25;
          text-overflow: clip;
          white-space: normal;
        }
        .period-event-service {
          display: block;
          margin-top: 5px;
          overflow: hidden;
          color: rgba(255,255,255,0.48);
          font-size: 9px;
          font-weight: 650;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .period-event-meta {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
          margin-top: 7px;
          color: rgba(255,255,255,0.34);
          font-size: 8px;
          font-weight: 750;
        }
        .period-event-meta strong {
          flex-shrink: 0;
          color: var(--gold-primary);
          font-size: 9px;
        }
        .period-calendar--month .period-event-service,
        .period-calendar--month .period-event-meta {
          display: none;
        }
        .period-day-more {
          padding: 3px 4px;
          color: rgba(17, 17, 17,0.7);
          font-size: 8px;
          font-weight: 800;
        }
        .period-day-empty {
          padding: 10px 2px;
          color: rgba(255,255,255,0.18);
          font-size: 9px;
          font-weight: 700;
        }
        @media (max-width: 1150px) {
          .period-calendar {
            overflow: visible;
            border: none;
            background: transparent;
            box-shadow: none;
          }
          .period-calendar-weekdays {
            display: none;
          }
          .period-calendar-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 10px;
          }
          .period-day-card,
          .period-calendar--month .period-day-card {
            min-height: 112px;
            padding: 12px;
            border: 1px solid rgba(255,255,255,0.06) !important;
            border-radius: 16px;
            background: rgba(255,255,255,0.018);
          }
          .period-day-card.is-outside-month {
            display: none;
          }
          .period-event,
          .period-calendar--month .period-event {
            padding: 8px 9px;
          }
          .period-calendar--month .period-event-time,
          .period-calendar--month .period-event-client {
            display: block;
          }
          .period-calendar--month .period-event-time {
            margin: 0 0 3px;
          }
          .period-calendar--week .period-day-card,
          .period-calendar--fortnight .period-day-card {
            display: block;
          }
          .period-calendar--week .period-day-heading,
          .period-calendar--fortnight .period-day-heading {
            display: flex;
            margin-bottom: 10px;
            padding: 0;
          }
          .period-calendar--week .period-day-events,
          .period-calendar--fortnight .period-day-events {
            grid-template-columns: 1fr;
          }
        }
        @media (max-width: 700px) {
          .period-calendar-grid {
            grid-template-columns: 1fr;
          }
          .period-day-card,
          .period-calendar--month .period-day-card {
            min-height: auto;
          }
          .period-day-card:not(.has-appointments) {
            display: none;
          }
        }
        .agenda-group-header {
          padding: 6px 4px 12px !important;
          border: none !important;
          border-radius: 0 !important;
          background: transparent !important;
          box-shadow: none !important;
        }
        .desktop-day-calendar {
          overflow: hidden;
          border: none;
          border-radius: 22px;
          background: rgba(255,255,255,0.012);
          box-shadow: 0 18px 45px rgba(0,0,0,0.18);
        }
        .desktop-day-calendar-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          min-height: 48px;
          padding: 0 18px 0 88px;
          border-bottom: 1px solid rgba(255,255,255,0.055);
          color: rgba(255,255,255,0.46);
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 0.7px;
          text-transform: uppercase;
        }
        .desktop-day-calendar-header strong {
          color: rgba(255,255,255,0.78);
          font-size: 11px;
        }
        .desktop-day-time-grid {
          position: relative;
          min-width: 0;
        }
        .desktop-day-hour-line {
          position: absolute;
          right: 0;
          left: 0;
          height: 1px;
          background: rgba(255,255,255,0.052);
        }
        .desktop-day-hour-label {
          position: absolute;
          top: -7px;
          left: 10px;
          width: 66px;
          color: rgba(255,255,255,0.38);
          font-size: 10px;
          font-weight: 750;
          text-align: right;
          white-space: nowrap;
          word-break: keep-all;
        }
        .desktop-day-hour-line:first-child .desktop-day-hour-label {
          top: 8px;
        }
        .desktop-day-hour-line::after {
          content: '';
          position: absolute;
          right: 0;
          left: 86px;
          border-top: 1px dashed rgba(255,255,255,0.018);
        }
        .desktop-day-events-layer {
          position: absolute;
          inset: 0 12px 0 88px;
          pointer-events: none;
        }
        .desktop-calendar-event {
          position: absolute;
          z-index: 2;
          min-height: 46px;
          overflow: hidden;
          padding: 9px 11px;
          border: 1px solid rgba(17, 17, 17,0.4);
          border-left: 3px solid var(--gold-primary);
          border-radius: 12px;
          background: linear-gradient(145deg, rgba(35,32,29,0.98), rgba(20,20,22,0.98));
          box-shadow: 0 8px 22px rgba(0,0,0,0.24);
          color: white;
          cursor: pointer;
          pointer-events: auto;
          box-sizing: border-box;
          transition: transform 0.18s ease, border-color 0.18s ease, box-shadow 0.18s ease;
        }
        .desktop-calendar-event:hover {
          z-index: 4;
          border-color: rgba(17, 17, 17,0.44);
          box-shadow: 0 12px 28px rgba(0,0,0,0.34), 0 0 0 1px rgba(17, 17, 17,0.08);
          transform: translateY(-1px);
        }
        .desktop-calendar-event-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
        }
        .desktop-calendar-event-time {
          color: var(--gold-primary);
          font-size: 10px;
          font-weight: 900;
          white-space: nowrap;
        }
        .desktop-calendar-event-client {
          flex: 1;
          min-width: 0;
          overflow: hidden;
          font-size: 12px;
          font-weight: 900;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .desktop-calendar-event-service {
          margin-top: 5px;
          overflow: hidden;
          color: rgba(255,255,255,0.54);
          font-size: 10px;
          font-weight: 650;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .desktop-calendar-event-footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
          margin-top: 7px;
          color: rgba(255,255,255,0.4);
          font-size: 9px;
          font-weight: 750;
        }
        .desktop-calendar-event-footer strong {
          color: #ffd89b;
          font-size: 10px;
        }
        .desktop-calendar-now-line {
          position: absolute;
          z-index: 3;
          right: 0;
          left: 65px;
          height: 1px;
          background: #ff453a;
          pointer-events: none;
        }
        .desktop-calendar-now-line::before {
          content: '';
          position: absolute;
          top: -4px;
          left: 0;
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #ff453a;
          box-shadow: 0 0 10px rgba(255,69,58,0.55);
        }
        .admin-resource-calendar {
          overflow: hidden;
          border: none;
          border-radius: 22px;
          background: rgba(255,255,255,0.012);
          box-shadow: 0 18px 45px rgba(0,0,0,0.2);
        }
        .admin-resource-scroll {
          overflow-x: auto;
          overflow-y: hidden;
          scrollbar-color: rgba(17, 17, 17,0.28) transparent;
          scrollbar-width: thin;
        }
        .admin-resource-grid {
          display: grid;
          min-width: max(100%, calc(76px + (var(--resource-count) * 250px)));
          grid-template-columns: 76px repeat(var(--resource-count), minmax(250px, 1fr));
        }
        .admin-resource-corner,
        .admin-resource-person {
          position: sticky;
          top: 0;
          z-index: 8;
          min-height: 66px;
          border-bottom: 1px solid rgba(255,255,255,0.065);
          background: rgba(17,17,19,0.98);
          box-sizing: border-box;
        }
        .admin-resource-corner {
          left: 0;
          z-index: 10;
          display: grid;
          place-items: center;
          color: rgba(255,255,255,0.48);
          background: #111113;
          box-shadow: 8px 0 18px rgba(0,0,0,0.34);
          font-size: 9px;
          font-weight: 850;
          letter-spacing: 0.5px;
          text-transform: uppercase;
        }
        .admin-resource-person {
          display: flex;
          align-items: center;
          gap: 10px;
          min-width: 0;
          padding: 10px 14px;
          border-left: 1px solid rgba(255,255,255,0.05);
        }
        .admin-resource-avatar {
          display: grid;
          width: 36px;
          height: 36px;
          flex-shrink: 0;
          overflow: hidden;
          place-items: center;
          border: 1px solid rgba(17, 17, 17,0.25);
          border-radius: 12px;
          background: rgba(17, 17, 17,0.1);
          color: var(--gold-primary);
          font-size: 12px;
          font-weight: 900;
        }
        .admin-resource-avatar img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        .admin-resource-person-copy {
          display: flex;
          min-width: 0;
          flex: 1;
          flex-direction: column;
          gap: 2px;
        }
        .admin-resource-person-copy strong {
          overflow: hidden;
          color: white;
          font-size: 12px;
          font-weight: 900;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .admin-resource-person-copy span {
          overflow: hidden;
          color: rgba(255,255,255,0.38);
          font-size: 9px;
          font-weight: 750;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .admin-resource-count {
          display: grid;
          min-width: 24px;
          height: 24px;
          padding: 0 6px;
          place-items: center;
          border-radius: 8px;
          background: rgba(17, 17, 17,0.1);
          color: var(--gold-primary);
          font-size: 9px;
          font-weight: 900;
          box-sizing: border-box;
        }
        .admin-resource-time-rail,
        .admin-resource-column {
          position: relative;
          height: var(--resource-height);
          box-sizing: border-box;
        }
        .admin-resource-time-rail {
          position: sticky;
          left: 0;
          z-index: 6;
          background: rgba(13,13,15,0.985);
        }
        .admin-resource-column {
          border-left: 1px solid rgba(255,255,255,0.05);
          background: rgba(255,255,255,0.004);
        }
        .admin-resource-hour-line {
          position: absolute;
          right: 0;
          left: 0;
          height: 1px;
          background: rgba(255,255,255,0.052);
        }
        .admin-resource-time-rail .admin-resource-hour-line span {
          position: absolute;
          top: -7px;
          right: 10px;
          color: rgba(255,255,255,0.36);
          font-size: 9px;
          font-weight: 750;
          white-space: nowrap;
        }
        .admin-resource-time-rail .admin-resource-hour-line:first-child span {
          top: 8px;
        }
        .admin-resource-column .admin-resource-hour-line {
          background: rgba(255,255,255,0.04);
        }
        .admin-resource-event {
          position: absolute;
          z-index: 3;
          min-height: 46px;
          overflow: hidden;
          padding: 8px 9px;
          border: 1px solid rgba(17, 17, 17,0.4);
          border-left: 3px solid var(--event-color);
          border-radius: 11px;
          background: linear-gradient(145deg, rgba(34,32,30,0.99), rgba(19,19,21,0.99));
          box-shadow: 0 7px 18px rgba(0,0,0,0.25);
          color: white;
          cursor: pointer;
          box-sizing: border-box;
        }
        .admin-resource-event:hover {
          z-index: 5;
          border-color: rgba(17, 17, 17,0.42);
          box-shadow: 0 12px 26px rgba(0,0,0,0.36);
        }
        .admin-resource-event-main {
          display: flex;
          align-items: baseline;
          gap: 7px;
          min-width: 0;
        }
        .admin-resource-event time {
          flex-shrink: 0;
          color: var(--gold-primary);
          font-size: 9px;
          font-weight: 900;
          white-space: nowrap;
        }
        .admin-resource-event strong {
          overflow: hidden;
          min-width: 0;
          font-size: 11px;
          font-weight: 900;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .admin-resource-event-service {
          display: block;
          margin-top: 4px;
          overflow: hidden;
          color: rgba(255,255,255,0.52);
          font-size: 9px;
          font-weight: 650;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .admin-resource-event-footer {
          display: flex;
          justify-content: space-between;
          gap: 8px;
          margin-top: 5px;
          color: rgba(255,255,255,0.37);
          font-size: 8px;
          font-weight: 750;
        }
        .admin-resource-event-footer b {
          color: #ffd89b;
        }
        .admin-resource-now-line {
          position: absolute;
          z-index: 4;
          right: 0;
          left: 0;
          height: 1px;
          background: #ff453a;
          pointer-events: none;
        }
        .admin-resource-empty {
          position: absolute;
          top: 24px;
          right: 12px;
          left: 12px;
          padding: 9px;
          border: 1px dashed rgba(255,255,255,0.055);
          border-radius: 10px;
          color: rgba(255,255,255,0.25);
          font-size: 9px;
          font-weight: 700;
          text-align: center;
        }
        .admin-resource-mobile {
          display: none;
        }
        .mobile-resource-staff-strip {
          display: flex;
          width: 100%;
          box-sizing: border-box;
          gap: 8px;
          margin: 0 0 12px;
          padding: 4px 6px 10px;
          overflow-x: auto;
          overscroll-behavior-x: contain;
          scroll-padding-inline: 6px;
          scrollbar-width: none;
          scroll-snap-type: x proximity;
        }
        .mobile-resource-staff-strip::-webkit-scrollbar {
          display: none;
        }
        .mobile-resource-staff-button {
          display: flex;
          min-width: 142px;
          align-items: center;
          gap: 9px;
          padding: 8px 10px;
          border: 1px solid rgba(255,255,255,0.075);
          border-radius: 15px;
          background: rgba(255,255,255,0.025);
          color: white;
          scroll-snap-align: start;
          text-align: left;
          transition: border-color 160ms ease, background 160ms ease, transform 160ms ease;
        }
        .mobile-resource-staff-button.is-active {
          border-color: rgba(17, 17, 17,0.48);
          background: linear-gradient(135deg, rgba(17, 17, 17,0.16), rgba(17, 17, 17,0.045));
          box-shadow: 0 8px 22px rgba(0,0,0,0.25);
        }
        .mobile-resource-staff-button:active {
          transform: scale(0.98);
        }
        .mobile-resource-staff-button .admin-resource-avatar {
          width: 34px;
          height: 34px;
          border-radius: 11px;
        }
        .mobile-resource-staff-button-copy {
          display: flex;
          min-width: 0;
          flex: 1;
          flex-direction: column;
          gap: 2px;
        }
        .mobile-resource-staff-button-copy strong,
        .mobile-resource-staff-button-copy span {
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .mobile-resource-staff-button-copy strong {
          font-size: 11px;
          font-weight: 900;
        }
        .mobile-resource-staff-button-copy span {
          color: rgba(255,255,255,0.42);
          font-size: 8px;
          font-weight: 750;
        }
        .mobile-resource-summary {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          margin-bottom: 10px;
          padding: 0 2px;
        }
        .mobile-resource-summary strong {
          color: rgba(255,255,255,0.82);
          font-size: 11px;
          font-weight: 900;
        }
        .mobile-resource-summary span {
          color: rgba(255,255,255,0.42);
          font-size: 8px;
          font-weight: 750;
          white-space: nowrap;
        }
        .mobile-resource-summary span b {
          color: var(--gold-primary);
          font-weight: 900;
        }
        .mobile-resource-calendar-shell {
          overflow: hidden;
          border: 1px solid rgba(255,255,255,0.065);
          border-radius: 20px;
          background: rgba(255,255,255,0.01);
          box-shadow: 0 16px 38px rgba(0,0,0,0.24);
        }
        .mobile-resource-calendar-header {
          display: flex;
          min-height: 48px;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          padding: 0 14px 0 68px;
          border-bottom: 1px solid rgba(255,255,255,0.06);
          background: rgba(18,18,20,0.96);
        }
        .mobile-resource-calendar-header strong {
          color: rgba(255,255,255,0.78);
          font-size: 10px;
          font-weight: 900;
          letter-spacing: 0.35px;
          text-transform: uppercase;
        }
        .mobile-resource-calendar-header span {
          color: rgba(255,255,255,0.38);
          font-size: 8px;
          font-weight: 800;
          white-space: nowrap;
        }
        .mobile-resource-timeline {
          position: relative;
          display: grid;
          grid-template-columns: 68px minmax(0, 1fr);
        }
        .mobile-resource-timeline .admin-resource-time-rail {
          z-index: 2;
          box-shadow: 8px 0 18px rgba(0,0,0,0.18);
        }
        .mobile-resource-timeline .admin-resource-column {
          min-width: 0;
        }
        .mobile-resource-timeline .admin-resource-event {
          padding: 8px 10px;
        }
        .mobile-resource-timeline .admin-resource-event strong {
          font-size: 10px;
        }
        @media (min-width: 701px) and (max-width: 1180px) {
          .admin-resource-grid {
            min-width: calc(70px + (var(--resource-count) * 270px));
            grid-template-columns: 70px repeat(var(--resource-count), 270px);
          }
        }
        @media (max-width: 700px) {
          .admin-resource-desktop-tablet {
            display: none;
          }
          .admin-resource-desktop-tablet.admin-resource-all-team {
            display: block;
          }
          .admin-resource-all-team .admin-resource-scroll {
            -webkit-overflow-scrolling: touch;
            overscroll-behavior-x: contain;
            overflow-anchor: none;
            scroll-behavior: auto;
            scroll-snap-type: none;
          }
          .admin-resource-all-team .admin-resource-grid {
            min-width: calc(66px + (var(--resource-count) * 230px));
            grid-template-columns: 66px repeat(var(--resource-count), 230px);
          }
          .admin-resource-all-team .admin-resource-corner,
          .admin-resource-all-team .admin-resource-person {
            min-height: 60px;
          }
          .admin-resource-all-team .admin-resource-person {
            padding: 9px 11px;
          }
          .admin-resource-all-team .admin-resource-avatar {
            width: 32px;
            height: 32px;
            border-radius: 10px;
          }
          .admin-resource-all-team + .admin-resource-mobile {
            display: none;
          }
          .admin-resource-mobile {
            display: block;
          }
        }
        @media (max-width: 900px) {
          .desktop-day-calendar-header {
            padding-left: 82px;
          }
          .desktop-day-events-layer {
            right: 8px;
            left: 82px;
          }
          .desktop-day-hour-label {
            left: 6px;
          }
        }
      `}</style>

      <header className="scheduling-header">
        <div className="scheduling-header-title">
          <h1 style={{ fontSize: '32px', fontWeight: '950', letterSpacing: '-0.8px', fontFamily: 'Outfit, var(--font-sans), system-ui' }}>Agenda</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Gestión inteligente de citas y disponibilidad.</p>
        </div>
        <div className="scheduling-header-actions">
          <div className="desktop-header-search">
            <Search size={17} />
            <input
              type="search"
              aria-label="Buscar citas"
              placeholder="Buscar cliente, cédula o teléfono…"
              value={searchTerm}
              onChange={event => setSearchTerm(event.target.value)}
            />
            {searchTerm && (
              <button
                type="button"
                className="desktop-header-search-clear"
                aria-label="Limpiar búsqueda"
                onClick={() => setSearchTerm('')}
              >
                <X size={13} />
              </button>
            )}
          </div>
          {!isProfessionalAgenda && (
            <PandaSelect
              className="desktop-team-select-panda"
              value={teamMemberFilter}
              onChange={setTeamMemberFilter}
              options={[
                {
                  value: 'all',
                  label: 'Todo el equipo',
                  imageUrl: '/panda-team-avatar.png',
                  avatarFallback: 'EQ',
                  subtitle: `${professionalStaff.length} profesionales`
                },
                ...professionalStaff.map(member => ({
                  value: String(member.id),
                  label: member.name || 'Sin nombre',
                  imageUrl: member.image_url || '',
                  avatarFallback: (member.name || '?').trim().charAt(0).toUpperCase(),
                  subtitle: (member.role || 'Profesional').split('|')[0]
                }))
              ]}
              triggerStyle={{ height: '46px', boxSizing: 'border-box', padding: '0 10px 0 11px', border: '1px solid rgba(255,255,255,0.065)', borderRadius: '15px', background: 'rgba(255,255,255,0.022)', boxShadow: 'none', fontSize: '11px', fontWeight: 800, color: 'rgba(255,255,255,0.78)' }}
              dropdownClassName="agenda-view-premium-dropdown"
              menuStyle={{ background: 'var(--bg-secondary)', border: '1px solid rgba(17, 17, 17,0.22)', borderRadius: '14px', padding: '6px', boxShadow: '0 18px 48px rgba(0,0,0,0.7)' }}
            />
          )}
          <PandaSelect
            className="agenda-status-select-panda"
            value={statusFilter}
            onChange={setStatusFilter}
            options={[
              { value: 'all', label: `Todas · ${teamScopedAppointments.length}` },
              { value: 'pending', label: `Pendientes · ${pendingAppointmentsCount}` },
              { value: 'completed', label: `Listas · ${completedAppointmentsCount}` }
            ]}
            triggerStyle={{ height: '46px', boxSizing: 'border-box', padding: '0 10px 0 12px', border: '1px solid rgba(255,255,255,0.065)', borderRadius: '15px', background: 'rgba(255,255,255,0.022)', boxShadow: 'none', fontSize: '11px', fontWeight: 800, color: 'rgba(255,255,255,0.78)' }}
            dropdownClassName="agenda-status-premium-dropdown"
            menuStyle={{ background: 'var(--bg-secondary)', border: '1px solid rgba(17, 17, 17,0.18)', borderRadius: '13px', padding: '5px', boxShadow: '0 14px 34px rgba(0,0,0,0.62)' }}
          />
          <div className="desktop-header-date-nav">
            <div className="desktop-header-date-label">
              <span className="desktop-header-date-icon"><CalendarIcon size={15} /></span>
              <span>{formatDateLabel(selectedDate)}</span>
            </div>
            <button
              type="button"
              className="desktop-header-nav-button show-on-tablet"
              aria-label="Abrir calendario"
              onClick={() => showFullCalendar ? handleCloseCalendar() : setShowFullCalendar(true)}
            >
              <CalendarIcon size={16} />
            </button>
            <button type="button" className="desktop-header-nav-button" aria-label="Periodo anterior" onClick={() => moveSelectedDate(-1)}>
              <ChevronLeft size={17} />
            </button>
            <button type="button" className="desktop-header-nav-button" aria-label="Periodo siguiente" onClick={() => moveSelectedDate(1)}>
              <ChevronRight size={17} />
            </button>
            <PandaSelect
              className="agenda-view-select-panda"
              value={filterType}
              onChange={setFilterType}
              options={AGENDA_VIEW_OPTIONS}
              triggerStyle={{ height: '34px', boxSizing: 'border-box', padding: '0 9px 0 11px', border: '1px solid rgba(17, 17, 17,0.2)', borderRadius: '10px', background: 'rgba(255,255,255,0.025)', boxShadow: 'none', fontSize: '11px', fontWeight: 820, color: 'rgba(255,255,255,0.82)' }}
              dropdownClassName="agenda-view-premium-dropdown"
              menuStyle={{ background: 'var(--bg-secondary)', border: '1px solid rgba(17, 17, 17,0.22)', borderRadius: '14px', padding: '6px', boxShadow: '0 18px 48px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.025)' }}
            />
          </div>
          {!(user?.role === 'Barbero' || user?.role?.startsWith('Barbero|') || user?.role === 'Tatuador' || user?.role?.startsWith('Tatuador|')) && (
            <button className="btn-gold agenda-create-button" style={{ boxShadow: '0 5px 15px rgba(255, 255, 255, 0.25)' }} onClick={() => {
                setEditingApp(null);
                setNewApp({ clientId: '', serviceId: '', staffId: '', time: '10:00', extras: [], products: [] });
                setClientSearchTerm('');
                setClientSearchResults([]);
                setShowAddModal(true);
              }}>
              <Plus size={18} /> Agendar Cita
            </button>
          )}
        </div>
      </header>

      <div className="scheduling-grid-container" style={{ gridTemplateColumns: isMobile ? '1fr' : undefined }}>
        {/* Left Side: Mini Calendar */}
        <aside className="scheduling-aside hide-on-tablet animate-slide-up animate-stagger-1" style={{ position: 'sticky', top: '20px' }}>
          
          <MiniCalendar 
            selectedDate={selectedDate} 
            onDateSelect={(d) => {
              setSelectedDate(d);
              setFilterType('day');
            }} 
            allAppointments={allAppointments}
          />

        </aside>

        {/* Right Side: Appointments List */}
        <main className="animate-slide-up animate-stagger-2" style={{ minWidth: 0, maxWidth: '100%', boxSizing: 'border-box' }}>
          <div className="date-navigator-card mobile-date-navigator-card">
            <div className="date-navigator-main" style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
              <button
                type="button"
                aria-label="Abrir calendario mensual"
                onClick={() => showFullCalendar ? handleCloseCalendar() : setShowFullCalendar(true)}
                style={{ background: 'var(--gold-primary)', width: '36px', height: '36px', flexShrink: 0, padding: 0, border: 0, borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'black', boxShadow: '0 4px 10px rgba(255, 255, 255, 0.3)', cursor: 'pointer' }}
              >
                <CalendarIcon size={16} />
              </button>
              <h2 style={{ fontSize: '18px', fontWeight: '900', textTransform: 'capitalize', color: 'white', fontFamily: 'Outfit, var(--font-sans), system-ui' }}>{formatDateLabel(selectedDate)}</h2>
            </div>
            <div className="date-navigator-actions" style={{ display: 'flex', gap: '8px' }}>
              <button 
                onClick={() => showFullCalendar ? handleCloseCalendar() : setShowFullCalendar(true)}
                className="show-on-tablet" 
                style={{ 
                  background: showFullCalendar ? 'var(--gold-primary)' : 'rgba(255,255,255,0.05)', 
                  border: '1px solid rgba(255,255,255,0.08)', 
                  borderRadius: '12px', 
                  width: '38px', 
                  height: '38px', 
                  color: showFullCalendar ? 'black' : 'white', 
                  cursor: 'pointer', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  transition: 'all 0.2s',
                  marginRight: '4px'
                }}
              >
                <CalendarIcon size={18} />
              </button>
              
              <button onClick={() => moveSelectedDate(-1)} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', width: '38px', height: '38px', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }} onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(255, 255, 255,0.3)'} onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'}><ChevronLeft size={18} /></button>
              
              <button onClick={() => moveSelectedDate(1)} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', width: '38px', height: '38px', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }} onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(255, 255, 255,0.3)'} onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'}><ChevronRight size={18} /></button>
              <PandaSelect
                className="agenda-view-select-panda"
                value={filterType}
                onChange={setFilterType}
                options={AGENDA_VIEW_OPTIONS}
                triggerStyle={{ height: '34px', boxSizing: 'border-box', padding: '0 9px 0 11px', border: '1px solid rgba(17, 17, 17,0.2)', borderRadius: '10px', background: 'rgba(255,255,255,0.025)', boxShadow: 'none', fontSize: '11px', fontWeight: 820, color: 'rgba(255,255,255,0.82)' }}
                dropdownClassName="agenda-view-premium-dropdown"
                menuStyle={{ background: 'var(--bg-secondary)', border: '1px solid rgba(17, 17, 17,0.22)', borderRadius: '14px', padding: '6px', boxShadow: '0 18px 48px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.025)' }}
              />
            </div>
          </div>

          {/* Collapsible Monthly Calendar for Tablets/Mobiles */}
          {(showFullCalendar || isCalendarExiting) && (
            <div className={isCalendarExiting ? 'animate-scale-out' : 'animate-scale-in'} style={{ marginBottom: '20px' }}>
              <MiniCalendar 
                selectedDate={selectedDate} 
                onDateSelect={(d) => {
                  setSelectedDate(d);
                  setFilterType('day');
                  handleCloseCalendar();
                }} 
                allAppointments={allAppointments}
              />
            </div>
          )}

          {/* Weekly Day Ribbon for Tablets/Mobiles (Only in Day mode) */}
          {filterType === 'day' && (
            <div className="weekly-ribbon show-on-tablet">
              {getWeekDays(selectedDate).map((date, idx) => {
                const isSelected = selectedDate.toDateString() === date.toDateString();
                const isToday = new Date().toDateString() === date.toDateString();
                const dateStr = date.toISOString().split('T')[0];
                const hasApps = allAppointments.some(a => (a.scheduled_at || a.created_at)?.startsWith(dateStr));
                const dayNamesShort = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
                
                return (
                  <button
                    key={date.toISOString()}
                    onClick={() => {
                      setSelectedDate(date);
                      setFilterType('day');
                    }}
                    className={`ribbon-day-btn ${isSelected ? 'active' : ''} ${isToday ? 'today' : ''}`}
                  >
                    <span className="ribbon-day-name">{isToday ? 'Hoy' : dayNamesShort[date.getDay()]}</span>
                    <span className="ribbon-day-num">{date.getDate()}</span>
                    {hasApps && (
                      <span 
                        className="ribbon-dot" 
                        style={{ 
                          backgroundColor: isSelected ? '#121212' : (isToday ? 'var(--gold-primary)' : 'var(--gold-primary)'),
                          boxShadow: isSelected ? 'none' : '0 0 4px var(--gold-primary)'
                        }} 
                      />
                    )}
                  </button>
                );
              })}
            </div>
          )}

          {filterType === 'day' && (
            <div className={`mobile-day-summary${!isProfessionalAgenda ? ' mobile-day-summary--admin' : ''}`}>
              <div className="agenda-summary-metric agenda-summary-metric--appointments">
                <span className="agenda-summary-icon"><CalendarIcon size={15} /></span>
                <span className="agenda-summary-copy">
                  <small>Citas del día</small>
                  <strong>{teamScopedAppointments.length}</strong>
                </span>
              </div>
              <div className="agenda-summary-metric agenda-summary-metric--completed">
                <span className="agenda-summary-icon"><CheckCircle2 size={15} /></span>
                <span className="agenda-summary-copy">
                  <small>Completadas</small>
                  <strong>{completedAppointmentsCount}</strong>
                </span>
              </div>
              <div className="agenda-summary-metric agenda-summary-metric--estimate">
                <span className="agenda-summary-icon"><DollarSign size={15} /></span>
                <span className="agenda-summary-copy">
                  <small>Estimado</small>
                  <strong>${totalEstimate.toFixed(2)}</strong>
                </span>
              </div>
            </div>
          )}

          {!isProfessionalAgenda && (
            <div className="admin-team-toolbar">
              <div className="admin-team-toolbar-copy">
                <strong>{filterType === 'day' ? 'Agenda del equipo' : 'Profesional visible'}</strong>
                <span>
                  {teamMemberFilter === 'all'
                    ? `${professionalStaff.length} profesionales · todas las citas en conjunto`
                    : 'Mostrando únicamente la agenda seleccionada'}
                </span>
              </div>
              <PandaSelect
                className="agenda-team-select-panda"
                value={teamMemberFilter}
                onChange={setTeamMemberFilter}
                options={[
                  {
                    value: 'all',
                    label: 'Todo el equipo',
                    imageUrl: '/panda-team-avatar.png',
                    avatarFallback: 'EQ',
                    subtitle: `${professionalStaff.length} profesionales`
                  },
                  ...professionalStaff.map(member => ({
                    value: String(member.id),
                    label: member.name || 'Sin nombre',
                    imageUrl: member.image_url || '',
                    avatarFallback: (member.name || '?').trim().charAt(0).toUpperCase(),
                    subtitle: (member.role || 'Profesional').split('|')[0]
                  }))
                ]}
                triggerStyle={{ height: '42px', boxSizing: 'border-box', padding: '0 10px 0 13px', border: '1px solid rgba(17, 17, 17,0.16)', borderRadius: '12px', background: 'rgba(255,255,255,0.035)', boxShadow: 'none', fontSize: '11px', fontWeight: 820, color: 'rgba(255,255,255,0.82)' }}
                dropdownClassName="agenda-view-premium-dropdown"
                menuStyle={{ background: 'var(--bg-secondary)', border: '1px solid rgba(17, 17, 17,0.22)', borderRadius: '14px', padding: '6px', boxShadow: '0 18px 48px rgba(0,0,0,0.7)' }}
              />
            </div>
          )}

          <div className={`mobile-agenda-controls${isProfessionalAgenda ? ' is-professional' : ''}`}>
            {!isProfessionalAgenda && (
              <PandaSelect
                className="mobile-agenda-team-select"
                value={teamMemberFilter}
                onChange={setTeamMemberFilter}
                options={[
                  {
                    value: 'all',
                    label: 'Todo el equipo',
                    imageUrl: '/panda-team-avatar.png',
                    avatarFallback: 'EQ',
                    subtitle: `${professionalStaff.length} profesionales`
                  },
                  ...professionalStaff.map(member => ({
                    value: String(member.id),
                    label: member.name || 'Sin nombre',
                    imageUrl: member.image_url || '',
                    avatarFallback: (member.name || '?').trim().charAt(0).toUpperCase(),
                    subtitle: (member.role || 'Profesional').split('|')[0]
                  }))
                ]}
                triggerStyle={{ height: '42px', boxSizing: 'border-box', padding: '0 8px 0 10px', border: '1px solid rgba(17, 17, 17,0.14)', borderRadius: '12px', background: 'rgba(255,255,255,0.03)', boxShadow: 'none', fontSize: '10px', fontWeight: 820, color: 'rgba(255,255,255,0.8)' }}
                dropdownClassName="agenda-view-premium-dropdown"
                menuStyle={{ background: 'var(--bg-secondary)', border: '1px solid rgba(17, 17, 17,0.22)', borderRadius: '14px', padding: '6px', boxShadow: '0 18px 48px rgba(0,0,0,0.7)' }}
              />
            )}
            <PandaSelect
              className="mobile-agenda-status-select"
              value={statusFilter}
              onChange={setStatusFilter}
              options={[
                { value: 'all', label: `Todas · ${teamScopedAppointments.length}` },
                { value: 'pending', label: `Pendientes · ${pendingAppointmentsCount}` },
                { value: 'completed', label: `Listas · ${completedAppointmentsCount}` }
              ]}
              triggerStyle={{ height: '42px', boxSizing: 'border-box', padding: '0 8px 0 10px', border: '1px solid rgba(255,255,255,0.065)', borderRadius: '12px', background: 'rgba(255,255,255,0.025)', boxShadow: 'none', fontSize: '10px', fontWeight: 800, color: 'rgba(255,255,255,0.76)' }}
              dropdownClassName="agenda-status-premium-dropdown"
              menuStyle={{ background: 'var(--bg-secondary)', border: '1px solid rgba(17, 17, 17,0.18)', borderRadius: '13px', padding: '5px', boxShadow: '0 14px 34px rgba(0,0,0,0.62)' }}
            />
            <button
              type="button"
              className={`mobile-agenda-search-toggle${isMobileSearchOpen || searchTerm ? ' is-active' : ''}`}
              aria-label={isMobileSearchOpen || searchTerm ? 'Ocultar búsqueda' : 'Buscar citas'}
              aria-expanded={Boolean(isMobileSearchOpen || searchTerm)}
              onClick={() => setIsMobileSearchOpen(current => !current)}
            >
              <Search size={17} />
            </button>
            <div className={`mobile-agenda-search-shell${isMobileSearchOpen || searchTerm ? ' is-open' : ''}`}>
              <Search size={16} />
              <input
                type="search"
                aria-label="Buscar citas"
                placeholder="Buscar cliente, cédula o teléfono…"
                value={searchTerm}
                onChange={event => setSearchTerm(event.target.value)}
              />
              {(searchTerm || isMobileSearchOpen) && (
                <button
                  type="button"
                  className="mobile-agenda-search-clear"
                  aria-label={searchTerm ? 'Limpiar búsqueda' : 'Cerrar búsqueda'}
                  onClick={() => {
                    setSearchTerm('');
                    setIsMobileSearchOpen(false);
                  }}
                >
                  <X size={14} />
                </button>
              )}
            </div>
          </div>

          <div className={`agenda-list-tools ${filterType === 'day' && teamScopedAppointments.length > 0 ? '' : 'agenda-list-tools--search-only'}`}>
          {filterType === 'day' && teamScopedAppointments.length > 0 && (
            <div className="mobile-status-filters" aria-label="Filtrar citas por estado">
              {[
                { id: 'all', label: 'Todas', count: teamScopedAppointments.length },
                { id: 'pending', label: 'Pendientes', count: pendingAppointmentsCount },
                { id: 'completed', label: 'Listas', count: completedAppointmentsCount }
              ].map(option => (
                <button
                  key={option.id}
                  type="button"
                  className={`mobile-status-filter ${statusFilter === option.id ? 'active' : ''}`}
                  onClick={() => setStatusFilter(option.id)}
                >
                  {option.label} <strong>{option.count}</strong>
                </button>
              ))}
            </div>
          )}

          {/* Spotlight Style Search Box */}
          <div className="agenda-search-shell" style={{ position: 'relative', marginBottom: '32px' }}>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <Search style={{ position: 'absolute', left: '20px', pointerEvents: 'none' }} size={22} color="rgba(255,255,255,0.4)" />
              <input 
                type="text" 
                placeholder="Buscar por nombre, cédula o teléfono..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0 48px 0 56px',
                  height: '64px',
                  fontSize: '17px',
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: '24px',
                  color: 'white',
                  outline: 'none',
                  fontWeight: '600',
                  boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.2), 0 8px 24px rgba(0,0,0,0.1)',
                  transition: 'all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
                }}
                onFocus={e => { e.target.style.background = 'rgba(255,255,255,0.08)'; e.target.style.borderColor = 'rgba(17, 17, 17, 0.3)'; e.target.style.boxShadow = 'inset 0 2px 4px rgba(0,0,0,0.2), 0 12px 32px rgba(17, 17, 17, 0.15)'; }}
                onBlur={e => { e.target.style.background = 'rgba(255,255,255,0.04)'; e.target.style.borderColor = 'rgba(255,255,255,0.08)'; e.target.style.boxShadow = 'inset 0 2px 4px rgba(0,0,0,0.2), 0 8px 24px rgba(0,0,0,0.1)'; }}
              />
              {searchTerm && (
                <button 
                  onClick={() => setSearchTerm('')}
                  style={{ position: 'absolute', right: '16px', background: 'rgba(255,69,58,0.15)', border: 'none', borderRadius: '16px', width: '32px', height: '32px', color: '#ff453a', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,69,58,0.25)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,69,58,0.15)'}
                >
                  <X size={16} />
                </button>
              )}
            </div>
          </div>
          </div>

          <div className="appointment-list-wrapper" style={{ background: 'transparent', border: 'none', boxShadow: 'none' }}>
            {loading ? (
              <div>
                <div className="desktop-agenda-metrics" style={{ marginBottom: '24px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
                  {[0, 1, 2].map(i => (
                    <div key={i} className="panda-skeleton" style={{ height: '84px' }} />
                  ))}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div className="panda-skeleton" style={{ height: '18px', width: '160px', marginBottom: '4px' }} />
                  {[0, 1, 2].map(i => (
                    <div key={i} className="panda-skeleton" style={{ height: '76px' }} />
                  ))}
                </div>
              </div>
            ) : filteredApps.length === 0 && ((isMobile && filterType === 'day' && isProfessionalAgenda) || statusFilter !== 'all' || searchTerm) ? (
              <div key={selectedDate.toDateString()} className="panda-day-transition scheduling-empty-state" style={{ padding: '60px 40px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <div className="scheduling-empty-icon" style={{
                  width: '84px',
                  height: '84px',
                  marginBottom: '24px',
                  borderRadius: '20px',
                  background: 'linear-gradient(135deg, rgba(17, 17, 17, 0.18), rgba(17, 17, 17, 0.03))',
                  border: '1px solid rgba(17, 17, 17, 0.22)',
                  boxShadow: '0 12px 32px rgba(0,0,0,0.25)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--gold-primary)'
                }}>
                  {searchTerm ? <Search size={34} /> : statusFilter !== 'all' ? <Filter size={34} /> : <CalendarIcon size={34} />}
                </div>
                <div style={{ color: 'white', fontSize: '17px', fontWeight: '900', fontFamily: 'Outfit, sans-serif', marginBottom: '8px' }}>
                  {searchTerm
                    ? 'Sin resultados para tu búsqueda'
                    : statusFilter === 'completed'
                      ? 'Aún no hay citas completadas'
                      : statusFilter === 'pending'
                        ? 'No hay citas pendientes'
                        : (isProfessionalAgenda ? 'Tu día está disponible' : 'Aún no hay citas agendadas')}
                </div>
                <div style={{ color: 'var(--text-muted)', fontSize: '13px', fontWeight: '600', maxWidth: '320px', lineHeight: '1.5' }}>
                  {searchTerm
                    ? `No encontramos citas que coincidan con "${searchTerm}". Prueba con otro nombre, cédula o teléfono.`
                    : statusFilter !== 'all'
                      ? 'Selecciona “Todas” para volver a ver la agenda completa de esta fecha.'
                    : (isProfessionalAgenda
                      ? 'No tienes citas para esta fecha. Puedes revisar los próximos días o actualizar la agenda.'
                      : 'Este día está libre. Crea una nueva cita y aparecerá aquí en tu agenda.')}
                </div>
                {!searchTerm && statusFilter === 'all' && isProfessionalAgenda && (
                  <div className="mobile-empty-actions">
                    <button
                      type="button"
                      onClick={() => {
                        const nextDate = new Date(selectedDate);
                        nextDate.setDate(nextDate.getDate() + 1);
                        setSelectedDate(nextDate);
                      }}
                      style={{ background: 'var(--gold-primary)', color: '#121212', border: 'none' }}
                    >
                      Próximo día
                    </button>
                    <button
                      type="button"
                      onClick={loadFilteredAppointments}
                      style={{ background: 'rgba(255,255,255,0.05)', color: 'white', border: '1px solid rgba(255,255,255,0.1)' }}
                    >
                      Actualizar
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div key={selectedDate.toDateString()} className="panda-day-transition" style={{ display: 'flex', flexDirection: 'column', minHeight: '100%' }}>
                  {!isMobile && filterType === 'day' && isProfessionalAgenda && (
                    <section className="desktop-day-calendar" aria-label="Agenda horaria del día">
                      <header className="desktop-day-calendar-header">
                        <strong>Horario del día</strong>
                        <span>
                          {new Date(2000, 0, 1, dayTimelineRange.startHour).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true })}
                          {' — '}
                          {new Date(2000, 0, 1, dayTimelineRange.endHour).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true })}
                        </span>
                      </header>
                      <div
                        className="desktop-day-time-grid"
                        style={{ height: `${((dayTimelineRange.endHour - dayTimelineRange.startHour) * DAY_TIMELINE_HOUR_HEIGHT) + 28}px` }}
                      >
                        {timelineHours.map(hour => (
                          <div
                            key={hour}
                            className="desktop-day-hour-line"
                            style={{ top: `${(hour - dayTimelineRange.startHour) * DAY_TIMELINE_HOUR_HEIGHT}px` }}
                          >
                            <span className="desktop-day-hour-label">
                              {new Date(2000, 0, 1, hour).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })}
                            </span>
                          </div>
                        ))}

                        {showCurrentTimeLine && (
                          <span className="desktop-calendar-now-line" style={{ top: `${currentTimeLineTop}px` }} />
                        )}

                        <div className="desktop-day-events-layer">
                          {dayTimelineItems.map(item => {
                            const statusStyle = getStatusColor(item.app.status);
                            const top = ((item.startMinute - dayTimelineRange.startHour * 60) / 60) * DAY_TIMELINE_HOUR_HEIGHT;
                            const height = Math.max(46, ((item.endMinute - item.startMinute) / 60) * DAY_TIMELINE_HOUR_HEIGHT - 5);
                            const columnWidth = 100 / item.columnCount;
                            return (
                              <article
                                key={item.app.id}
                                className="desktop-calendar-event"
                                onClick={() => setSelectedAppDetail(item.app)}
                                style={{
                                  top: `${top}px`,
                                  height: `${height}px`,
                                  left: `calc(${item.column * columnWidth}% + 4px)`,
                                  width: `calc(${columnWidth}% - 8px)`,
                                  borderLeftColor: statusStyle.dot
                                }}
                              >
                                <div className="desktop-calendar-event-top">
                                  <time className="desktop-calendar-event-time">
                                    {item.date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })}
                                  </time>
                                  <strong className="desktop-calendar-event-client">{item.app.clients?.name || 'Cliente sin nombre'}</strong>
                                  <span className="status-glow-badge" style={{
                                    flexShrink: 0,
                                    padding: '2px 6px',
                                    borderRadius: '6px',
                                    backgroundColor: statusStyle.bg,
                                    color: statusStyle.text,
                                    border: `1px solid ${statusStyle.border}`,
                                    fontSize: '7px',
                                    fontWeight: 850
                                  }}>
                                    {getStatusText(item.app.status)}
                                  </span>
                                </div>
                                <div className="desktop-calendar-event-service">
                                  {item.app.services?.name || 'Sin servicio'} · {item.duration} min
                                  {item.app.beverage_selection && ` · ${item.app.beverage_selection}`}
                                </div>
                                {height >= 64 && (
                                  <footer className="desktop-calendar-event-footer">
                                    <span>{item.app.staff?.name || 'Sin asignar'}</span>
                                    <strong>
                                      {rates?.usd > 0
                                        ? `${Math.round(Number(item.app.total_price || 0) * rates.usd).toLocaleString('es-VE')} Bs.`
                                        : `$${Number(item.app.total_price || 0).toFixed(2)}`}
                                    </strong>
                                  </footer>
                                )}
                              </article>
                            );
                          })}
                        </div>
                      </div>
                    </section>
                  )}

                  {filterType === 'day' && !isProfessionalAgenda && visibleResourceStaff.length > 0 && (
                    <section className={`admin-resource-calendar admin-resource-desktop-tablet${teamMemberFilter === 'all' ? ' admin-resource-all-team' : ''}`} aria-label="Agenda diaria de todo el equipo">
                      <div className="admin-resource-scroll">
                        <div
                          className="admin-resource-grid"
                          style={{
                            '--resource-count': visibleResourceStaff.length,
                            '--resource-height': `${((dayTimelineRange.endHour - dayTimelineRange.startHour) * DAY_TIMELINE_HOUR_HEIGHT) + 28}px`
                          }}
                        >
                          <div className="admin-resource-corner">Hora</div>
                          {visibleResourceStaff.map(member => {
                            const memberAppointments = resourceTimelineItems[String(member.id)] || [];
                            const memberRole = roleLabel(member.role) || 'Profesional';
                            return (
                              <header key={`header-${member.id}`} className="admin-resource-person">
                                <span className="admin-resource-avatar">
                                  {member.image_url
                                    ? <img src={member.image_url} alt={member.name || 'Profesional'} />
                                    : (member.name || '?').trim().charAt(0).toUpperCase()}
                                </span>
                                <span className="admin-resource-person-copy">
                                  <strong>{member.name || 'Sin nombre'}</strong>
                                  <span>{memberRole}</span>
                                </span>
                                <span className="admin-resource-count">{memberAppointments.length}</span>
                              </header>
                            );
                          })}

                          <div className="admin-resource-time-rail">
                            {timelineHours.map(hour => (
                              <div
                                key={`rail-${hour}`}
                                className="admin-resource-hour-line"
                                style={{ top: `${(hour - dayTimelineRange.startHour) * DAY_TIMELINE_HOUR_HEIGHT}px` }}
                              >
                                <span>{new Date(2000, 0, 1, hour).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true })}</span>
                              </div>
                            ))}
                          </div>

                          {visibleResourceStaff.map(member => {
                            const memberItems = resourceTimelineItems[String(member.id)] || [];
                            return (
                              <div key={`column-${member.id}`} className="admin-resource-column">
                                {timelineHours.map(hour => (
                                  <span
                                    key={`${member.id}-${hour}`}
                                    className="admin-resource-hour-line"
                                    style={{ top: `${(hour - dayTimelineRange.startHour) * DAY_TIMELINE_HOUR_HEIGHT}px` }}
                                  />
                                ))}
                                {showCurrentTimeLine && (
                                  <span className="admin-resource-now-line" style={{ top: `${currentTimeLineTop}px` }} />
                                )}
                                {memberItems.length === 0 && <span className="admin-resource-empty">Disponible durante el día</span>}
                                {memberItems.map(item => {
                                  const statusStyle = getStatusColor(item.app.status);
                                  const top = ((item.startMinute - dayTimelineRange.startHour * 60) / 60) * DAY_TIMELINE_HOUR_HEIGHT;
                                  const height = Math.max(46, ((item.endMinute - item.startMinute) / 60) * DAY_TIMELINE_HOUR_HEIGHT - 5);
                                  const columnWidth = 100 / item.columnCount;
                                  return (
                                    <article
                                      key={item.app.id}
                                      className="admin-resource-event"
                                      onClick={() => setSelectedAppDetail(item.app)}
                                      style={{
                                        '--event-color': statusStyle.dot,
                                        top: `${top}px`,
                                        height: `${height}px`,
                                        left: `calc(${item.column * columnWidth}% + 5px)`,
                                        width: `calc(${columnWidth}% - 10px)`
                                      }}
                                    >
                                      <div className="admin-resource-event-main">
                                        <time>{item.date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true })}</time>
                                        <strong>{item.app.clients?.name || 'Cliente sin nombre'}</strong>
                                      </div>
                                      <span className="admin-resource-event-service">
                                        {item.app.services?.name || 'Sin servicio'} · {item.duration} min
                                        {item.app.beverage_selection && ` · ${item.app.beverage_selection}`}
                                      </span>
                                      {height >= 64 && (
                                        <footer className="admin-resource-event-footer">
                                          <span>{getStatusText(item.app.status)}</span>
                                          <b>
                                            {rates?.usd > 0
                                              ? `${Math.round(Number(item.app.total_price || 0) * rates.usd).toLocaleString('es-VE')} Bs.`
                                              : `$${Number(item.app.total_price || 0).toFixed(2)}`}
                                          </b>
                                        </footer>
                                      )}
                                    </article>
                                  );
                                })}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </section>
                  )}

                  {filterType === 'day' && !isProfessionalAgenda && !searchTerm && mobileFocusedStaff && (
                    <section className="admin-resource-mobile" aria-label={`Agenda diaria de ${mobileFocusedStaff.name || 'profesional'}`}>
                      {visibleResourceStaff.length > 1 && (
                        <nav className="mobile-resource-staff-strip" aria-label="Seleccionar profesional">
                          {visibleResourceStaff.map(member => {
                            const isActive = String(member.id) === String(mobileFocusedStaff.id);
                            const appointmentCount = resourceTimelineItems[String(member.id)]?.length || 0;
                            return (
                              <button
                                key={`mobile-staff-${member.id}`}
                                type="button"
                                className={`mobile-resource-staff-button${isActive ? ' is-active' : ''}`}
                                aria-pressed={isActive}
                                onClick={() => setMobileFocusedStaffId(member.id)}
                              >
                                <span className="admin-resource-avatar">
                                  {member.image_url
                                    ? <img src={member.image_url} alt="" />
                                    : (member.name || '?').trim().charAt(0).toUpperCase()}
                                </span>
                                <span className="mobile-resource-staff-button-copy">
                                  <strong>{member.name || 'Sin nombre'}</strong>
                                  <span>{appointmentCount} {appointmentCount === 1 ? 'cita' : 'citas'}</span>
                                </span>
                              </button>
                            );
                          })}
                        </nav>
                      )}

                      <div className="mobile-resource-summary">
                        <strong>{mobileFocusedStaff.name || 'Profesional'}</strong>
                        <span aria-label={`${mobileFocusedStats.total} citas, ${mobileFocusedStats.completed} completadas y ${mobileFocusedStats.estimate.toFixed(2)} dólares estimados`}>
                          <b>{mobileFocusedStats.total}</b> citas&nbsp; · &nbsp;
                          <b>{mobileFocusedStats.completed}</b> listas&nbsp; · &nbsp;
                          <b>${mobileFocusedStats.estimate.toFixed(0)}</b>
                        </span>
                      </div>

                      <div className="mobile-resource-calendar-shell">
                        <header className="mobile-resource-calendar-header">
                          <strong>Horario del día</strong>
                          <span>
                            {new Date(2000, 0, 1, dayTimelineRange.startHour).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true })}
                            {' — '}
                            {new Date(2000, 0, 1, dayTimelineRange.endHour).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true })}
                          </span>
                        </header>
                        <div
                          className="mobile-resource-timeline"
                          style={{ '--resource-height': `${((dayTimelineRange.endHour - dayTimelineRange.startHour) * DAY_TIMELINE_HOUR_HEIGHT) + 28}px` }}
                        >
                          <div className="admin-resource-time-rail">
                            {timelineHours.map(hour => (
                              <div
                                key={`mobile-rail-${hour}`}
                                className="admin-resource-hour-line"
                                style={{ top: `${(hour - dayTimelineRange.startHour) * DAY_TIMELINE_HOUR_HEIGHT}px` }}
                              >
                                <span>{new Date(2000, 0, 1, hour).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true })}</span>
                              </div>
                            ))}
                          </div>

                          <div className="admin-resource-column">
                            {timelineHours.map(hour => (
                              <span
                                key={`mobile-column-${hour}`}
                                className="admin-resource-hour-line"
                                style={{ top: `${(hour - dayTimelineRange.startHour) * DAY_TIMELINE_HOUR_HEIGHT}px` }}
                              />
                            ))}
                            {showCurrentTimeLine && (
                              <span className="admin-resource-now-line" style={{ top: `${currentTimeLineTop}px` }} />
                            )}
                            {mobileFocusedTimelineItems.length === 0 && (
                              <span className="admin-resource-empty">Disponible durante el día</span>
                            )}
                            {mobileFocusedTimelineItems.map(item => {
                              const statusStyle = getStatusColor(item.app.status);
                              const top = ((item.startMinute - dayTimelineRange.startHour * 60) / 60) * DAY_TIMELINE_HOUR_HEIGHT;
                              const height = Math.max(48, ((item.endMinute - item.startMinute) / 60) * DAY_TIMELINE_HOUR_HEIGHT - 5);
                              const columnWidth = 100 / item.columnCount;
                              return (
                                <article
                                  key={`mobile-${item.app.id}`}
                                  className="admin-resource-event"
                                  onClick={() => setSelectedAppDetail(item.app)}
                                  style={{
                                    '--event-color': statusStyle.dot,
                                    top: `${top}px`,
                                    height: `${height}px`,
                                    left: `calc(${item.column * columnWidth}% + 5px)`,
                                    width: `calc(${columnWidth}% - 10px)`
                                  }}
                                >
                                  <div className="admin-resource-event-main">
                                    <time>{item.date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true })}</time>
                                    <strong>{item.app.clients?.name || 'Cliente sin nombre'}</strong>
                                  </div>
                                  <span className="admin-resource-event-service">
                                    {item.app.services?.name || 'Sin servicio'} · {item.duration} min
                                    {item.app.beverage_selection && ` · ${item.app.beverage_selection}`}
                                  </span>
                                  {height >= 64 && (
                                    <footer className="admin-resource-event-footer">
                                      <span>{getStatusText(item.app.status)}</span>
                                      <b>
                                        {rates?.usd > 0
                                          ? `${Math.round(Number(item.app.total_price || 0) * rates.usd).toLocaleString('es-VE')} Bs.`
                                          : `$${Number(item.app.total_price || 0).toFixed(2)}`}
                                      </b>
                                    </footer>
                                  )}
                                </article>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    </section>
                  )}

                  {filterType !== 'day' && (
                    <section className={`period-calendar period-calendar--${filterType}`} aria-label={`Vista de ${filterType}`}>
                      <div className="period-calendar-weekdays" aria-hidden="true">
                        {['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'].map(day => <span key={day}>{day}</span>)}
                      </div>
                      <div className="period-calendar-grid">
                        {periodCalendarDays.map(day => {
                          const visibleAppointments = filterType === 'month' ? day.appointments.slice(0, 3) : day.appointments;
                          return (
                            <article
                              key={day.key}
                              className={`period-day-card ${day.isToday ? 'is-today' : ''} ${day.isOutsideMonth ? 'is-outside-month' : ''} ${day.appointments.length ? 'has-appointments' : ''}`}
                            >
                              <button
                                type="button"
                                className="period-day-heading"
                                onClick={() => {
                                  setSelectedDate(day.date);
                                  setFilterType('day');
                                }}
                                aria-label={`Ver agenda del ${day.date.toLocaleDateString('es-ES')}`}
                              >
                                <strong>
                                  {day.date.toLocaleDateString('es-ES', {
                                    weekday: filterType === 'month' ? undefined : 'short',
                                    month: filterType === 'month' ? 'short' : undefined
                                  })}
                                </strong>
                                <span className="period-day-number">{day.date.getDate()}</span>
                                <span className="period-day-count">{day.appointments.length ? `${day.appointments.length} ${day.appointments.length === 1 ? 'cita' : 'citas'}` : 'Sin citas'}</span>
                              </button>
                              <div className="period-day-events">
                                {visibleAppointments.map(appointment => {
                                  const appointmentDate = new Date(appointment.scheduled_at || appointment.created_at);
                                  const statusStyle = getStatusColor(appointment.status);
                                  return (
                                    <button
                                      type="button"
                                      key={appointment.id}
                                      className="period-event"
                                      style={{ '--event-color': statusStyle.dot }}
                                      onClick={() => setSelectedAppDetail(appointment)}
                                    >
                                      <time className="period-event-time">
                                        {appointmentDate.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true })}
                                      </time>
                                      <span className="period-event-client">{appointment.clients?.name || 'Cliente sin nombre'}</span>
                                      <span className="period-event-service">
                                        {appointment.services?.name || 'Sin servicio'}
                                        {appointment.beverage_selection && ` · ${appointment.beverage_selection}`}
                                        {appointment.notes && ' · Con nota'}
                                      </span>
                                      <span className="period-event-meta">
                                        <span>{getStatusText(appointment.status)} · {appointment.staff?.name || 'Sin asignar'}</span>
                                        <strong>
                                          {rates?.usd > 0
                                            ? `${Math.round(Number(appointment.total_price || 0) * rates.usd).toLocaleString('es-VE')} Bs.`
                                            : `$${Number(appointment.total_price || 0).toFixed(2)}`}
                                        </strong>
                                      </span>
                                    </button>
                                  );
                                })}
                                {day.appointments.length > visibleAppointments.length && (
                                  <span className="period-day-more">+{day.appointments.length - visibleAppointments.length} más</span>
                                )}
                                {!day.appointments.length && filterType !== 'month' && <span className="period-day-empty">Sin citas programadas</span>}
                              </div>
                            </article>
                          );
                        })}
                      </div>
                    </section>
                  )}

                  {/* Scrollable Group List */}
                  {filterType === 'day' && (
                  <div className="agenda-groups-grid" style={{ position: 'relative', paddingRight: '4px', display: (!isProfessionalAgenda && !searchTerm) || (!isMobile && filterType === 'day') ? 'none' : undefined }}>
                  {[
                    { key: 'morning', title: 'En la mañana', apps: morningApps, icon: <Sunrise size={16} />, color: 'var(--gold-primary)' },
                    { key: 'afternoon', title: 'En la tarde', apps: afternoonApps, icon: <Sun size={16} />, color: '#f39c12' },
                    { key: 'evening', title: 'En la noche', apps: eveningApps, icon: <Moon size={16} />, color: '#9b59b6' }
                  ].map((group, groupIdx) => {
                    if (group.apps.length === 0) return null;
                    const groupShare = filteredApps.length > 0 ? group.apps.length / filteredApps.length : 0;
                    return (
                      <div key={group.key} className="scheduling-group-card" style={{ 
                        background: 'var(--bg-secondary)',
                        border: '1px solid rgba(255, 255, 255, 0.04)',
                        borderRadius: '24px',
                        padding: '16px',
                        animationDelay: `${120 + groupIdx * 80}ms`,
                        marginBottom: '16px',
                        boxShadow: '0 10px 30px rgba(0, 0, 0, 0.25)'
                      }}>
                        {/* Group Header */}
                        <div
                          className="agenda-group-header"
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            cursor: 'default',
                            userSelect: 'none',
                            padding: '12px 20px',
                            background: 'rgba(255, 255, 255, 0.03)',
                            borderRadius: '16px',
                            border: '1px solid rgba(255, 255, 255, 0.05)',
                            transition: 'all 0.2s',
                            boxShadow: 'inset 0 1px 2px rgba(255, 255, 255, 0.02)'
                          }}
                        >
                          <div className="agenda-group-heading" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div className="agenda-group-icon" style={{ color: group.color, display: 'flex', alignItems: 'center', background: 'rgba(255,255,255,0.05)', padding: '8px', borderRadius: '10px' }}>
                              {group.icon}
                            </div>
                            <span className="agenda-group-title" style={{ fontWeight: '800', fontSize: '15px', color: '#fff', fontFamily: 'Outfit, var(--font-sans), system-ui', letterSpacing: '0.5px' }}>
                              {group.title}
                            </span>
                            <span className="agenda-group-count" style={{
                              fontSize: '10px',
                              background: 'rgba(255, 255, 255, 0.06)',
                              padding: '2px 8px',
                              borderRadius: '20px',
                              color: 'var(--text-muted)',
                              fontWeight: '750'
                            }}>
                              {group.apps.length} {group.apps.length === 1 ? 'cita' : 'citas'}
                            </span>
                          </div>
                  </div>

                        {/* Share of today's appointments held by this time block */}
                        <div className="agenda-group-share" style={{ height: '3px', borderRadius: '2px', background: 'rgba(255,255,255,0.05)', marginTop: '8px', overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${Math.max(groupShare * 100, 4)}%`, borderRadius: '2px', background: group.color, opacity: 0.6, transition: 'width 0.4s ease' }} />
                        </div>

                        {/* Group Cards List */}
                        <div className="mobile-timeline-list" style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '14px' }}>
                            {group.apps.map((app, idx) => {
                              const statusStyle = getStatusColor(app.status);
                              const appointmentDate = new Date(app.scheduled_at || app.created_at);
return (
                                    <div
                                      key={app.id}
                                      onClick={() => setSelectedAppDetail(app)}
                                      className="mobile-timeline-item"
                                      style={{ animationDelay: `${idx * 40}ms` }}
                                    >
                                      <div className="mobile-timeline-time">
                                        {`${String((appointmentDate.getHours() % 12) || 12).padStart(2, '0')}:${String(appointmentDate.getMinutes()).padStart(2, '0')}`}
                                        <small>{appointmentDate.getHours() < 12 ? 'AM' : 'PM'}</small>
                                      </div>
                                      <div className="mobile-timeline-rail">
                                        <span className="mobile-timeline-dot" style={{ background: statusStyle.dot }} />
                                      </div>
                                      <article className="mobile-appointment-card">
                                        <div className="mobile-appointment-top">
                                          <span className="mobile-appointment-client">{app.clients?.name || 'Cliente sin nombre'}</span>
                                          <span className="status-glow-badge" style={{
                                            flexShrink: 0,
                                            padding: '3px 6px',
                                            borderRadius: '6px',
                                            backgroundColor: statusStyle.bg,
                                            color: statusStyle.text,
                                            border: `1px solid ${statusStyle.border}`,
                                            fontSize: '8px',
                                            fontWeight: '850'
                                          }}>
                                            {getStatusText(app.status)}
                                          </span>
                                        </div>
                                        <div className="mobile-appointment-service">
                                          {app.services?.name || 'Sin servicio'}
                                          {filterType !== 'day' && ` · ${appointmentDate.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}`}
                                          {app.beverage_selection && ` · ${app.beverage_selection}`}
                                          {app.notes && ' · Con nota'}
                                        </div>
                                        <div className="mobile-appointment-bottom">
                                          <span className="mobile-appointment-professional">
                                            {app.staff?.image_url ? (
                                              <img loading="lazy" src={app.staff.image_url} alt={app.staff.name || 'Profesional'} />
                                            ) : (
                                              <span className="mobile-appointment-professional-avatar avatar-gradient-circle">
                                                {app.staff?.name?.charAt(0) || 'P'}
                                              </span>
                                            )}
                                            {app.staff?.name || 'Sin asignar'}
                                          </span>
                                          <span className="mobile-appointment-price">
                                            {rates?.usd > 0 ? `${Math.round(Number(app.total_price || 0) * rates.usd).toLocaleString('es-VE')} Bs.` : `$${Number(app.total_price || 0).toFixed(2)}`}
                                            {rates?.usd > 0 && <small>Ref. ${Number(app.total_price || 0).toFixed(2)}</small>}
                                          </span>
                                        </div>
                                      </article>
                                    </div>
                              );
                            })}
                        </div>
                      </div>
                    );
                  })}
                </div>
                  )}
              </div>
            )}
          </div>
        </main>
      </div>

      <PandaDialog 
        isOpen={dialog.isOpen} 
        type="confirm"
        title="Gestionar Cita" 
        message="¿Qué deseas hacer con esta cita?" 
        onCancel={() => setDialog({ isOpen: false, appointmentId: null })}
        customFooter={
          <div style={{ display: 'flex', gap: '12px', width: '100%', marginTop: '20px' }}>
            <button onClick={() => processAction('cancel')} style={{ flex: 1, padding: '14px', borderRadius: '14px', border: '1px solid #ff453a', background: 'rgba(255,69,58,0.1)', color: '#ff453a', fontWeight: '800', cursor: 'pointer' }}>MARCAR CANCELADA</button>
            <button onClick={() => processAction('delete')} style={{ flex: 1, padding: '14px', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)', color: 'white', fontWeight: '800', cursor: 'pointer' }}>BORRAR PERMANENTE</button>
          </div>
        }
      />

      <ScheduleModal 
        isOpen={showScheduleModal} onClose={() => { setShowScheduleModal(false); if (scheduleModalOrigin === 'addModal') { setShowAddModal(true); } setScheduleModalOrigin(null); }} onSchedule={handleTimeSelected} defaultDate={selectedDate}
        excludeAppointmentId={editingApp?.id || null}
        client={clients.find(c => c.id === newApp.clientId)} service={services.find(s => s.id === newApp.serviceId)} staff={staff.find(s => s.id === newApp.staffId)}
      />

      <AnimatedModal isOpen={showAddModal}>
        {(overlayClass, cardClass) => {
          const selectedClient = clients.find(c => c.id === newApp.clientId);
          const serviceVal = services.find(s => s.id === newApp.serviceId);
          const servicePrice = serviceVal ? parseFloat(serviceVal.price || 0) : 0;
          const extrasPrice = newApp.extras.reduce((acc, exId) => {
            const ex = allExtras.find(e => e.id === exId);
            return acc + (ex ? parseFloat(ex.price || 0) : 0);
          }, 0);
          const productsPrice = newApp.products.reduce((acc, p) => {
            const pr = allProducts.find(prod => prod.id === p.id);
            return acc + (pr ? parseFloat(pr.price || 0) * p.quantity : 0);
          }, 0);
          const totalEstimated = servicePrice + extrasPrice + productsPrice;

          return (
            <div className={overlayClass} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'var(--bg-secondary)', zIndex: 9999, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px', paddingTop: 'max(20px, env(safe-area-inset-top, 20px))', backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)' }}>
              <div className={cardClass.replace('global-modal-card', '')} style={{ maxWidth: 'min(900px, 90vw)', width: '100%', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.08)', maxHeight: '92vh', padding: '0px', boxShadow: '0 30px 60px -12px rgba(0,0,0,0.5)', background: 'var(--bg-secondary)', backdropFilter: 'blur(40px)', WebkitBackdropFilter: 'blur(40px)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                
                {/* Header - VisionOS Style */}
                <div style={{ padding: '20px 28px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
                  <div>
                    <h3 style={{ fontSize: '24px', fontWeight: '800', margin: 0, fontFamily: 'Outfit, sans-serif', color: 'white', letterSpacing: '-0.5px' }}>
                      {editingApp ? 'Editar Cita' : 'Nueva Cita'}
                    </h3>
                    <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.5)', fontWeight: '500' }}>
                      {editingApp ? 'Actualiza los detalles' : 'Agenda un nuevo servicio'}
                    </span>
                  </div>
                  <button 
                    onClick={() => { setShowAddModal(false); if (onCloseAddModal) onCloseAddModal(); }} 
                    style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: 'rgba(255,255,255,0.8)', cursor: 'pointer', width: '36px', height: '36px', borderRadius: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s', backdropFilter: 'blur(10px)' }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.2)'; e.currentTarget.style.transform = 'scale(1.05)'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; e.currentTarget.style.transform = 'scale(1)'; }}
                  >
                    <X size={18} />
                  </button>
                </div>

                {/* Scrollable Content */}
                <div className="custom-scrollbar" style={{ padding: '20px 28px', overflowY: 'auto', flex: 1, display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'minmax(260px, 0.38fr) minmax(0, 1fr)', gap: '0 36px', alignItems: 'start' }}>
                  
                  {/* ── COLUMNA IZQUIERDA: Cliente + Barbero ── */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', paddingRight: isMobile ? 0 : '12px' }}>
                    {/* Cliente */}
                      <FieldLabel required>Cliente</FieldLabel>
                      {selectedClient ? (
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', padding: '14px 16px', borderRadius: '16px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div style={{ width: '40px', height: '40px', borderRadius: '20px', background: 'linear-gradient(135deg, #3a3a40, #222)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', fontWeight: '800', color: 'white', flexShrink: 0 }}>
                              {selectedClient.name.charAt(0)}
                            </div>
                            <div style={{ minWidth: 0 }}>
                              <div style={{ fontWeight: '700', color: 'white', fontSize: '14px', letterSpacing: '-0.3px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{selectedClient.name}</div>
                              <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', marginTop: '1px' }}>V-{selectedClient.id_card}</div>
                            </div>
                          </div>
                          <button onClick={() => { setClientSearchTerm(''); setClientSearchResults([]); setNewApp(prev => ({ ...prev, clientId: '' })); }} style={{ background: 'rgba(255,69,58,0.12)', color: '#ff453a', border: 'none', borderRadius: '10px', width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}>
                            <X size={14} />
                          </button>
                        </div>
                      ) : (
                        <div style={{ position: 'relative' }}>
                          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                            <Search style={{ position: 'absolute', left: '14px', pointerEvents: 'none' }} size={18} color="rgba(255,255,255,0.35)" />
                            <input type="text" placeholder="Cédula o nombre..." value={clientSearchTerm} onChange={(e) => handleClientSearch(e.target.value)} style={{ width: '100%', padding: '0 14px 0 42px', height: '46px', fontSize: '14px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '14px', color: 'white', outline: 'none', fontWeight: '500', transition: 'all 0.2s' }} onFocus={e => { e.target.style.borderColor = 'rgba(17, 17, 17,0.4)'; e.target.style.background = 'rgba(255,255,255,0.08)'; }} onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,0.08)'; e.target.style.background = 'rgba(255,255,255,0.05)'; }} />
                          </div>
                          {!selectedClient && clientSearchResults.length > 0 && (
                            <div className="animate-scale-in" style={{ position: 'absolute', top: 'calc(100% + 6px)', left: 0, right: 0, background: 'var(--bg-secondary)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '14px', overflow: 'hidden', zIndex: 200, backdropFilter: 'blur(30px)', boxShadow: '0 16px 40px rgba(0,0,0,0.5)', maxHeight: '200px', overflowY: 'auto' }}>
                              {clientSearchResults.map(c => (
                                <div key={c.id} onClick={() => handleSelectClient(c)} style={{ padding: '12px 16px', cursor: 'pointer', borderBottom: '1px solid rgba(255,255,255,0.04)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }} onMouseOver={e => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.06)'} onMouseOut={e => e.currentTarget.style.backgroundColor = 'transparent'}>
                                  <div>
                                    <div style={{ fontWeight: '700', fontSize: '13px', color: 'white' }}>{c.name}</div>
                                    {c.phone && <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)' }}>{c.phone}</div>}
                                  </div>
                                  <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', fontWeight: '600' }}>V-{c.id_card}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}

                    {/* Barbero */}
                      <FieldLabel required>Odontólogo</FieldLabel>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, 60px)', gap: '12px', justifyItems: 'center' }}>
                        {staff.filter(isBarberBookableStaff).map(s => {
                          const isSel = newApp.staffId === s.id;
                          const locked = user?.role === 'Barbero' || user?.role?.startsWith('Barbero|');
                          return (
                            <div key={s.id} onClick={() => { if (!locked) setNewApp({...newApp, staffId: s.id}); }} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', cursor: locked ? 'not-allowed' : 'pointer', opacity: locked && !isSel ? 0.3 : 1 }}>
                              <div style={{ width: '52px', height: '52px', borderRadius: '26px', padding: '2px', background: isSel ? 'linear-gradient(135deg, var(--champagne-dark), var(--champagne-light))' : 'rgba(255,255,255,0.08)', transition: 'all 0.25s', transform: isSel ? 'scale(1.08)' : 'scale(1)' }}>
                                <div style={{ width: '100%', height: '100%', borderRadius: '50%', overflow: 'hidden', background: 'var(--bg-secondary)', border: '2px solid rgba(26,26,30,0.95)' }}>
                                  {s.image_url ? <img loading="lazy" src={s.image_url} alt={s.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', fontSize: '18px', fontWeight: '800', color: 'white', background: 'linear-gradient(135deg, #444, #222)' }}>{s.name.charAt(0)}</span>}
                                </div>
                              </div>
                              <span style={{ fontSize: '11px', color: isSel ? 'white' : 'rgba(255,255,255,0.45)', fontWeight: isSel ? '700' : '500' }}>{s.name.split(' ')[0]}</span>
                            </div>
                          );
                        })}
                      </div>
                  </div>

                  {/* ── COLUMNA DERECHA: Servicio + Extras + Productos ── */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
                    {/* Servicio */}
                      <FieldLabel required>Servicio</FieldLabel>
                      <PandaSelect placeholder="Selecciona el servicio..." value={newApp.serviceId} onChange={(val) => setNewApp({...newApp, serviceId: val})} options={services.map(s => ({ label: `${s.name} ($${s.price})`, value: s.id }))} />

                    {/* Extras — Grid 2 columnas */}
                      <FieldLabel>Extras</FieldLabel>
                      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: '8px' }}>
                        {allExtras.filter(ex => ex.name && !ex.name.toUpperCase().includes('ROULETTE_PRIZE') && !ex.name.toUpperCase().includes('CORTE GRATIS')).map(ex => {
                          const isSel = newApp.extras.includes(ex.id);
                          return (
                            <button key={ex.id} onClick={() => setNewApp({ ...newApp, extras: isSel ? newApp.extras.filter(id => id !== ex.id) : [...newApp.extras, ex.id] })} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', padding: '12px 10px', background: isSel ? 'linear-gradient(135deg, var(--champagne-dark), var(--champagne-light))' : 'rgba(255,255,255,0.03)', color: isSel ? 'black' : 'var(--gold-primary)', border: isSel ? 'none' : '1px solid rgba(17, 17, 17,0.15)', borderRadius: '12px', fontSize: '12px', fontWeight: '700', cursor: 'pointer', transition: 'all 0.2s', textAlign: 'center' }}>
                              {isSel && <Check size={13} strokeWidth={3} color="black" />}
                              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', lineHeight: 1.2 }}>
                                <span>{ex.name}</span>
                                <span style={{ fontSize: '10px', color: isSel ? 'rgba(0,0,0,0.45)' : 'rgba(255,255,255,0.35)', fontWeight: '800' }}>+${ex.price}</span>
                              </div>
                            </button>
                          );
                        })}
                      </div>

                    {/* Productos */}
                    <div>
                      <FieldLabel>Productos</FieldLabel>
                      <PandaSelect placeholder="Añadir producto..." onChange={(val) => { if (!newApp.products.find(p => p.id === val)) setNewApp({ ...newApp, products: [...newApp.products, { id: val, quantity: 1 }] }); }} options={allProducts.filter(p => Number(p.stock || 0) > 0).map(p => ({ label: `${getInventorySalesLabel(p)} · ${p.name} ($${p.price})`, value: p.id }))} />
                      {newApp.products.length > 0 && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '10px' }}>
                          {newApp.products.map(p => {
                            const product = allProducts.find(pr => pr.id === p.id);
                            if (!product) return null;
                            return (
                              <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.03)', padding: '10px 12px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.06)' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                                  <Package size={14} color="rgba(255,255,255,0.5)" />
                                  <div style={{ minWidth: 0 }}>
                                    <div style={{ fontSize: '13px', fontWeight: '600', color: 'white', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{product.name}</div>
                                    <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)' }}>${product.price} c/u</div>
                                  </div>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'var(--bg-secondary)', borderRadius: '8px', padding: '2px' }}>
                                    <button onClick={() => { const q = p.quantity - 1; q <= 0 ? setNewApp({ ...newApp, products: newApp.products.filter(i => i.id !== p.id) }) : setNewApp({ ...newApp, products: newApp.products.map(i => i.id === p.id ? { ...i, quantity: q } : i) }); }} style={{ width: '24px', height: '24px', borderRadius: '6px', border: 'none', background: 'rgba(17, 17, 17,0.1)', color: 'var(--gold-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}><Minus size={10} /></button>
                                    <span style={{ fontWeight: '800', fontSize: '12px', minWidth: '16px', textAlign: 'center', color: 'white' }}>{p.quantity}</span>
                                    <button onClick={() => { if (p.quantity < Number(product.stock || 0)) setNewApp({ ...newApp, products: newApp.products.map(i => i.id === p.id ? { ...i, quantity: p.quantity + 1 } : i) }); }} disabled={p.quantity >= Number(product.stock || 0)} style={{ width: '24px', height: '24px', borderRadius: '6px', border: 'none', background: p.quantity >= Number(product.stock || 0) ? 'rgba(17, 17, 17,0.03)' : 'rgba(17, 17, 17,0.1)', color: p.quantity >= Number(product.stock || 0) ? 'rgba(17, 17, 17,0.2)' : 'var(--gold-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: p.quantity >= Number(product.stock || 0) ? 'not-allowed' : 'pointer' }}><Plus size={10} /></button>
                                  </div>
                                  <button onClick={() => setNewApp({ ...newApp, products: newApp.products.filter(i => i.id !== p.id) })} style={{ color: 'rgba(255,69,58,0.7)', background: 'rgba(255,69,58,0.08)', borderRadius: '6px', border: 'none', cursor: 'pointer', width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Trash2 size={12} /></button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Sticky Footer */}
                <div style={{ background: 'var(--bg-secondary)', backdropFilter: 'blur(20px)', borderTop: '1px solid rgba(255,255,255,0.06)', padding: '18px 28px', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '20px' }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', fontWeight: '700', letterSpacing: '0.5px', textTransform: 'uppercase' }}>Total Estimado</div>
                    <div style={{ fontSize: '28px', fontWeight: '800', color: 'white', fontFamily: 'Outfit, sans-serif', lineHeight: '1.1' }}>${totalEstimated.toFixed(2)}</div>
                    <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)', marginTop: '2px' }}>
                      {newApp.serviceId && <span>Servicio: ${servicePrice.toFixed(2)}</span>}
                      {newApp.extras.length > 0 && <span> · Extras: +${extrasPrice.toFixed(2)}</span>}
                      {newApp.products.length > 0 && <span> · Prod: +${productsPrice.toFixed(2)}</span>}
                    </div>
                  </div>
                    <button onClick={() => {
                      if (!newApp.clientId || !newApp.serviceId || !newApp.staffId) {
                        showToast("Selecciona cliente, servicio y odontólogo", "error");
                        return;
                      }
                      if (!isBarberBookableStaff(staff.find(s => String(s.id) === String(newApp.staffId)))) {
                        showToast("Ese miembro del equipo no puede recibir citas.", "error");
                        return;
                      }
                      setShowAddModal(false);
                      setTimeout(() => {
                        setScheduleModalOrigin('addModal');
                        setShowScheduleModal(true);
                      }, 300);
                    }} style={{ height: '52px', padding: '0 32px', borderRadius: '16px', background: 'linear-gradient(135deg, var(--champagne-dark), var(--champagne-light))', color: 'black', border: 'none', fontSize: '15px', fontWeight: '800', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', cursor: 'pointer', transition: 'all 0.25s', flexShrink: 0, whiteSpace: 'nowrap' }} onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.03)'} onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}>
                    {editingApp ? 'Confirmar' : 'Seleccionar Horario'}
                    <Clock size={16} />
                  </button>
                </div>

              </div>
            </div>
          );
        }}
      </AnimatedModal>


      {/* Appointment Detail Modal */}
      <AnimatedModal isOpen={!!selectedAppDetail}>
        {(overlayClass, cardClass) => {
          if (!activeDetail) return null;
          const statusStyle = getStatusColor(activeDetail.status);
          const initials = activeDetail.clients?.name ? activeDetail.clients.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() : 'W';
          return (
            <div className={`${overlayClass} modal-centered-overlay`} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'var(--bg-secondary)', backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)', zIndex: 9999, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px', paddingTop: 'max(20px, env(safe-area-inset-top, 20px))' }}>
              <div className={`glass-card modal-popup-centered ${cardClass.replace('global-modal-card', '')}`} style={{ maxWidth: 'min(720px, 90vw)', width: '100%', borderRadius: '24px', background: 'var(--bg-secondary)', border: '1px solid rgba(255,255,255,0.08)', padding: '36px', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 30px 60px -12px rgba(0,0,0,0.5)' }}>
                
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '28px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div style={{ 
                      width: '52px', 
                      height: '52px', 
                      borderRadius: '50%', 
                      background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.25) 0%, rgba(255, 255, 255, 0.05) 100%)', 
                      border: '1.5px solid rgba(255, 255, 255, 0.4)',
                      boxShadow: '0 4px 15px rgba(255, 255, 255, 0.15)',
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center', 
                      flexShrink: 0,
                      fontSize: '18px',
                      fontWeight: '900',
                      color: 'var(--gold-primary)',
                      fontFamily: 'Outfit, sans-serif'
                    }}>
                      {initials}
                    </div>
                    <div>
                      <h3 style={{ fontSize: '20px', fontWeight: '950', color: 'white', margin: 0, fontFamily: 'Outfit, sans-serif', letterSpacing: '-0.3px' }}>
                        {activeDetail.clients?.name}
                      </h3>
                      <span className="status-glow-badge" style={{ 
                        marginTop: '6px',
                        display: 'inline-flex',
                        backgroundColor: statusStyle.bg,
                        color: statusStyle.text,
                        border: `1px solid ${statusStyle.border}`
                      }}>
                        <span className="blinking-dot" style={{ backgroundColor: statusStyle.dot }} />
                        {getStatusText(activeDetail.status)}
                      </span>
                    </div>
                  </div>
                  <button 
                    onClick={() => setSelectedAppDetail(null)} 
                    style={{ background: 'rgba(255,255,255,0.05)', border: 'none', color: 'rgba(255,255,255,0.6)', fontSize: '20px', cursor: 'pointer', width: '32px', height: '32px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,69,58,0.15)'; e.currentTarget.style.color = '#ff453a'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.color = 'rgba(255,255,255,0.6)'; }}
                  >
                    &times;
                  </button>
                </div>

                <div style={{ marginBottom: '24px', paddingBottom: '16px', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <p style={{ fontSize: '11px', color: 'var(--text-muted)', margin: 0, fontWeight: '700' }}>
                    Cédula: <span style={{ color: 'white' }}>V-{activeDetail.clients?.id_card || 'S/C'}</span> • Celular: <span style={{ color: 'white' }}>{activeDetail.clients?.phone || 'S/N'}</span>
                  </p>
                </div>

                {/* Date and Time block */}
                <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: '12px', marginBottom: '24px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', background: 'rgba(255,255,255,0.02)', padding: '12px', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.04)', alignItems: 'center' }}>
                    <Clock size={16} color="var(--gold-primary)" style={{ marginBottom: '2px' }} />
                    <span style={{ fontSize: '9px', fontWeight: '900', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.8px' }}>Hora</span>
                    <span style={{ fontSize: '13px', fontWeight: '900', color: 'white', fontFamily: 'Outfit, sans-serif' }}>
                      {new Date(activeDetail.scheduled_at || activeDetail.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })}
                    </span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', background: 'rgba(255,255,255,0.02)', padding: '12px', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.04)', alignItems: 'center', textAlign: 'center' }}>
                    <CalendarIcon size={16} color="var(--gold-primary)" style={{ marginBottom: '2px' }} />
                    <span style={{ fontSize: '9px', fontWeight: '900', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.8px' }}>Fecha</span>
                    <span style={{ fontSize: '13px', fontWeight: '900', color: 'white', whiteSpace: 'nowrap', fontFamily: 'Outfit, sans-serif' }}>
                      {new Date(activeDetail.scheduled_at || activeDetail.created_at).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </span>
                  </div>
                </div>

                {/* Service & Price */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '18px', marginBottom: '24px' }}>
                  {/* Primary Service */}
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                      <span style={{ width: '4px', height: '4px', borderRadius: '50%', backgroundColor: 'var(--gold-primary)' }} />
                      <label style={{ fontSize: '10px', fontWeight: '900', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.8px' }}>Servicio Principal</label>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.02)', padding: '12px 16px', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.04)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                        <div style={{ background: 'rgba(255, 255, 255,0.1)', color: 'var(--gold-primary)', borderRadius: '10px', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <Scissors size={15} />
                        </div>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontWeight: '850', color: 'white', fontSize: '13px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {activeDetail.services?.name || 'Venta directa sin servicio'}
                          </div>
                          <p style={{ fontSize: '10px', color: 'var(--text-muted)', margin: '2px 0 0 0' }}>
                            Atendido por: <strong style={{ color: 'rgba(255,255,255,0.85)' }}>{activeDetail.staff?.name || 'Caja'}</strong>
                          </p>
                        </div>
                      </div>
                      <span style={{ fontWeight: '950', color: 'var(--gold-primary)', fontSize: '14px', fontFamily: 'Outfit, sans-serif' }}>
                        ${activeDetail.services?.price || 0}
                      </span>
                    </div>
                  </div>

                  {/* Extras (if any) */}
                  {activeDetail.appointment_extras && activeDetail.appointment_extras.length > 0 && (
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                        <span style={{ width: '4px', height: '4px', borderRadius: '50%', backgroundColor: 'var(--gold-primary)' }} />
                        <label style={{ fontSize: '10px', fontWeight: '900', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.8px' }}>Servicios Extras</label>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {activeDetail.appointment_extras.map(e => (
                          <div key={e.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.01)', padding: '10px 16px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.03)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: 'rgba(255,255,255,0.85)', fontWeight: '600' }}>
                              <Sparkles size={12} color="var(--gold-primary)" style={{ opacity: 0.7 }} />
                              <span>{e.service_extras?.name}</span>
                            </div>
                            <span style={{ fontSize: '12px', fontWeight: '800', color: 'var(--gold-primary)', fontFamily: 'Outfit, sans-serif' }}>+${e.price}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Products (if any) */}
                  {activeDetail.appointment_products && activeDetail.appointment_products.length > 0 && (
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                        <span style={{ width: '4px', height: '4px', borderRadius: '50%', backgroundColor: 'var(--gold-primary)' }} />
                        <label style={{ fontSize: '10px', fontWeight: '900', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.8px' }}>Productos Vendidos</label>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {activeDetail.appointment_products.map(p => (
                          <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.01)', padding: '10px 16px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.03)' }}>
                            <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.85)', fontWeight: '600' }}>• {p.quantity}x {p.inventory?.name}</span>
                            <span style={{ fontSize: '12px', fontWeight: '800', color: 'var(--gold-primary)', fontFamily: 'Outfit, sans-serif' }}>+${(p.price * p.quantity).toFixed(2)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Personnel Involved (appointment_staff records) */}
                  {activeDetail.appointment_staff && activeDetail.appointment_staff.length > 0 && (
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                        <span style={{ width: '4px', height: '4px', borderRadius: '50%', backgroundColor: 'var(--gold-primary)' }} />
                        <label style={{ fontSize: '10px', fontWeight: '900', color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase', letterSpacing: '0.8px' }}>Comisiones & Propinas</label>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {activeDetail.appointment_staff.map(as => {
                          const hasServComm = as.commission_earned > 0;
                          const hasProdComm = as.product_commission > 0;
                          const hasTip = as.tip_amount > 0;
                          const cleanRole = as.staff?.role?.split('|')[0] || '';
                          
                          return (
                            <div key={as.id} style={{ padding: '12px', background: 'rgba(255,255,255,0.02)', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.03)', display: 'flex', alignItems: 'center', gap: '12px' }}>
                              <div className="avatar-gradient-circle" style={{ width: '32px', height: '32px', minWidth: '32px', fontSize: '12px', margin: 0, overflow: 'hidden' }}>
                                {as.staff?.image_url ? (
                                   <img loading="lazy" src={as.staff.image_url} alt={as.staff.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                ) : (
                                  as.staff?.name?.charAt(0).toUpperCase()
                                )}
                              </div>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', marginBottom: '4px' }}>
                                  <span style={{ fontWeight: '800', color: 'white', fontSize: '13px' }}>{as.staff?.name}</span>
                                  <span style={{ fontSize: '9px', color: 'rgba(255,255,255,0.7)', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.3px' }}>{cleanRole}</span>
                                </div>
                                <div style={{ display: 'flex', gap: '10px', fontSize: '11px', flexWrap: 'wrap' }}>
                                  {hasServComm && <span style={{ color: 'rgba(255,255,255,0.85)', fontWeight: '600' }}>Serv: <strong style={{ color: 'var(--gold-primary)' }}>${Number(as.commission_earned).toFixed(2)}</strong></span>}
                                  {hasProdComm && <span style={{ color: 'rgba(255,255,255,0.85)', fontWeight: '600' }}>Prod: <strong style={{ color: 'var(--gold-primary)' }}>${Number(as.product_commission).toFixed(2)}</strong></span>}
                                  {hasTip && <span style={{ color: 'rgba(255,255,255,0.85)', fontWeight: '600' }}>Propina: <strong style={{ color: '#30d158' }}>${Number(as.tip_amount).toFixed(2)}</strong></span>}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
                {/* Beverage & Notes */}
                {(activeDetail.beverage_selection || activeDetail.notes) && (
                  <div style={{ 
                    background: 'rgba(255,255,255,0.02)', 
                    padding: '16px', 
                    borderRadius: '14px', 
                    border: '1px solid rgba(255,255,255,0.04)', 
                    marginBottom: '24px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px'
                  }}>
                    {activeDetail.beverage_selection && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span>
                          {activeDetail.beverage_selection.includes('Café') ? <Coffee size={14} color="#111111" /> :
                           activeDetail.beverage_selection.includes('Cerveza') ? <Beer size={14} color="#ffcc00" /> :
                           activeDetail.beverage_selection.includes('Whiskey') ? <Martini size={14} color="#ff9f0a" /> : <GlassWater size={14} color="#007aff" />}
                        </span>
                        <div>
                          <span style={{ fontSize: '9px', fontWeight: '900', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.8px', display: 'block' }}>Bebida Solicitada</span>
                          <span style={{ fontSize: '13px', fontWeight: '800', color: 'white' }}>{activeDetail.beverage_selection}</span>
                        </div>
                      </div>
                    )}
                    {activeDetail.notes && (
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                        <span style={{ fontSize: '10px', marginTop: '1px' }}><StickyNote size={12} color="var(--text-muted)" /></span>
                        <div>
                          <span style={{ fontSize: '9px', fontWeight: '900', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.8px', display: 'block' }}>Notas Especiales</span>
                          <span style={{ fontSize: '13px', fontWeight: '800', color: 'var(--gold-primary)', fontStyle: 'italic', wordBreak: 'break-word' }}>"{activeDetail.notes}"</span>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Total Block */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'linear-gradient(135deg, rgba(255, 255, 255,0.12) 0%, rgba(255, 255, 255,0.02) 100%)', padding: '20px', borderRadius: '18px', border: '1px solid rgba(255, 255, 255,0.25)', boxShadow: '0 8px 32px rgba(255, 255, 255,0.06)' }}>
                  <div>
                    <span style={{ fontSize: '10px', fontWeight: '900', color: 'var(--gold-primary)', textTransform: 'uppercase', display: 'block', marginBottom: '2px', letterSpacing: '0.5px' }}>Total de la Cita</span>
                    <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Ref: ${Number(activeDetail.total_price).toFixed(2)} USD</span>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span style={{ fontSize: '22px', fontWeight: '950', color: 'var(--gold-primary)', textShadow: '0 0 15px rgba(255, 255, 255,0.35)', fontFamily: 'Outfit, sans-serif' }}>
                      {rates?.usd > 0 ? `${Math.round(activeDetail.total_price * rates.usd).toLocaleString('es-VE')} Bs.` : `${Number(activeDetail.total_price).toFixed(2)} USD`}
                    </span>
                  </div>
                </div>

              </div>
            </div>
          );
        }}
      </AnimatedModal>
    </div>
  );
};

const MiniCalendar = ({ selectedDate, onDateSelect, allAppointments }) => {
  const [currentMonth, setCurrentMonth] = useState(new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1));
  const daysInMonth = (month, year) => new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = (month, year) => new Date(year, month, 1).getDay();
  
  const monthNames = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
  const days = [];
  const totalDays = daysInMonth(currentMonth.getMonth(), currentMonth.getFullYear());
  const startDay = firstDayOfMonth(currentMonth.getMonth(), currentMonth.getFullYear());
  
  for (let i = 0; i < startDay; i++) days.push(null);
  for (let i = 1; i <= totalDays; i++) days.push(new Date(currentMonth.getFullYear(), currentMonth.getMonth(), i));
  
  return (
    <div className="glass-card" style={{ maxWidth: '340px', width: '100%', margin: '0 auto', padding: '24px', borderRadius: '24px', border: '1px solid rgba(255, 255, 255, 0.04)', boxShadow: '0 20px 40px rgba(0, 0, 0, 0.4)' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <button onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1))} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.6)', cursor: 'pointer', display: 'flex', alignItems: 'center', transition: 'color 0.2s' }} onMouseEnter={e => e.currentTarget.style.color = 'white'} onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.6)'}><ChevronLeft size={16} /></button>
        <span style={{ fontSize: '13px', fontWeight: '900', textTransform: 'uppercase', color: 'white', fontFamily: 'Outfit, var(--font-sans), system-ui', letterSpacing: '0.5px' }}>{monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}</span>
        <button onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1))} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.6)', cursor: 'pointer', display: 'flex', alignItems: 'center', transition: 'color 0.2s' }} onMouseEnter={e => e.currentTarget.style.color = 'white'} onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.6)'}><ChevronRight size={16} /></button>
      </header>
      
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', gap: '4px', textAlign: 'center' }}>
        {["D", "L", "M", "M", "J", "V", "S"].map((d, idx) => <div key={idx} style={{ fontSize: '9px', fontWeight: '900', color: 'var(--gold-primary)', opacity: 0.6, marginBottom: '8px' }}>{d}</div>)}
        {days.map((date, idx) => {
          if (!date) return <div key={`empty-${idx}`} />;
          const isSelected = selectedDate.toDateString() === date.toDateString();
          const isToday = new Date().toDateString() === date.toDateString();
          const dateStr = date.toISOString().split('T')[0];
          const dayAppCount = allAppointments.filter(a => (a.scheduled_at || a.created_at)?.startsWith(dateStr)).length;
          const hasApps = dayAppCount > 0;
          const isWeekend = date.getDay() === 0 || date.getDay() === 6;

          return (
            <button
              key={date.toISOString()} onClick={() => onDateSelect(date)}
              style={{
                width: '36px',
                height: '36px',
                margin: '4px auto',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '12px',
                border: isToday && !isSelected ? '1.5px solid var(--gold-primary)' : 'none',
                cursor: 'pointer',
                fontSize: '12px',
                fontWeight: isSelected ? '900' : (isToday ? '800' : '600'),
                background: isSelected ? 'var(--gold-primary)' : (isToday ? 'rgba(17, 17, 17, 0.1)' : 'none'),
                color: isSelected ? '#121212' : (isToday ? 'var(--gold-primary)' : (isWeekend ? 'rgba(255, 255, 255, 0.4)' : 'white')),
                transition: 'background 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275), color 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                position: 'relative'
              }}
              onMouseEnter={(e) => {
                if (!isSelected) {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.04)';
                  e.currentTarget.style.transform = 'scale(1.1)';
                }
              }}
              onMouseLeave={(e) => {
                if (!isSelected) {
                  e.currentTarget.style.background = isToday ? 'rgba(17, 17, 17, 0.1)' : 'none';
                  e.currentTarget.style.transform = 'scale(1)';
                }
              }}
            >
              {date.getDate()}
              {hasApps && (
                dayAppCount > 1 ? (
                  <div style={{
                    minWidth: '15px',
                    height: '15px',
                    padding: '0 3px',
                    borderRadius: '8px',
                    background: isSelected ? '#121212' : 'var(--gold-primary)',
                    color: isSelected ? 'var(--gold-primary)' : '#121212',
                    fontSize: '9px',
                    fontWeight: '900',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    position: 'absolute',
                    top: '-4px',
                    right: '-4px',
                    boxShadow: isSelected ? 'none' : '0 0 6px rgba(17, 17, 17, 0.6)',
                    border: isSelected ? '1px solid var(--gold-primary)' : 'none'
                  }}>
                    {dayAppCount}
                  </div>
                ) : (
                  <div style={{
                    width: '4px',
                    height: '4px',
                    borderRadius: '50%',
                    backgroundColor: isSelected ? '#121212' : 'var(--gold-primary)',
                    position: 'absolute',
                    bottom: '4px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    boxShadow: isSelected ? 'none' : '0 0 5px var(--gold-primary)'
                  }} />
                )
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default SchedulingModule;
