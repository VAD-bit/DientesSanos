import React, { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useModal } from '../context/ModalContext';
import { 
  Scissors, 
  Camera, 
  Sparkles,
  CheckCircle, 
  Clock, 
  User, 
  CameraOff,
  ChevronRight,
  ChevronDown,
  TrendingUp,
  Award,
  Zap,
  Coins,
  LogOut,
  Trash2,
  RefreshCw,
  Edit3,
  Droplets,
  Coffee,
  Beer,
  GlassWater,
  FileText,
  LayoutDashboard,
  ReceiptText
} from 'lucide-react';
import { dataService } from '../services/dataService';
import { SkeletonList } from './Skeleton';
import { useNotifs } from '../context/NotificationContext';
import PandaCamera from './PandaCamera';
import { Plus, ShoppingBag, Loader2, Users } from 'lucide-react';

import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { notificationService } from '../services/notificationService';
import { useDialog } from '../context/DialogContext';
import AnimatedModal from './AnimatedModal';
import StaffTransactionHistory from './StaffTransactionHistory';
import FieldLabel from './FieldLabel';
import OrderCatalogModal from './OrderCatalogModal';
import SellableInventoryModal from './SellableInventoryModal';

const renderBeverageIcon = (beverageName, size = 16, className = "text-[var(--champagne)]") => {
  if (!beverageName) return null;
  const name = beverageName.toLowerCase();
  if (name.includes('café') || name.includes('cafe')) return <Coffee size={size} className={className} />;
  if (name.includes('cerveza')) return <Beer size={size} className={className} />;
  if (name.includes('whiskey')) return <GlassWater size={size} className={className} />;
  return <GlassWater size={size} className={className} />;
};

// Group a barber's chair appointments by client so a client with several services
// shows as ONE order (multiple appointment rows) instead of a card per service.
const groupAppointmentsByClient = (list) => {
  const groups = [];
  (list || []).forEach(app => {
    let g = groups.find(x => x.client_id === app.client_id);
    if (!g) { g = { client_id: app.client_id, apps: [] }; groups.push(g); }
    g.apps.push(app);
  });
  const activeStatuses = new Set(['En Silla', 'En Lavado']);
  return groups.sort((a, b) => {
    const aActive = activeStatuses.has(a.apps[0]?.status) ? 0 : 1;
    const bActive = activeStatuses.has(b.apps[0]?.status) ? 0 : 1;
    if (aActive !== bActive) return aActive - bActive;

    const aDate = new Date(a.apps[0]?.scheduled_at || a.apps[0]?.appointment_date || a.apps[0]?.created_at || 0).getTime();
    const bDate = new Date(b.apps[0]?.scheduled_at || b.apps[0]?.appointment_date || b.apps[0]?.created_at || 0).getTime();
    return aDate - bDate;
  });
};

const formatAppointmentTime = (app) => {
  const value = app?.scheduled_at || app?.appointment_date || app?.created_at;
  if (!value) return 'Sin hora';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Sin hora';
  return date.toLocaleTimeString('es-VE', { hour: 'numeric', minute: '2-digit', hour12: true });
};

const BarberPanel = ({ isMobile, rates, initialStaff = null }) => {
  const { user } = useAuth();
  const { showToast, triggerConfetti, triggerRocket } = useNotifs();
  const { confirm } = useDialog();
  const roleName = (user?.role || '').toLowerCase();
  const isServiceProfessional = !!user &&
    !roleName.includes('admin') &&
    !roleName.includes('recepcionista') &&
    !roleName.includes('caja') &&
    !roleName.includes('barista') &&
    !roleName.includes('cafeter');
  const [staff, setStaff] = useState(() => isServiceProfessional ? [user] : []);
  const [selectedBarber, setSelectedBarber] = useState(() => initialStaff || (isServiceProfessional ? user : null));
  const [myServices, setMyServices] = useState([]);
  const [completedToday, setCompletedToday] = useState([]);
  const [loading, setLoading] = useState(false);
  
  // New States for Extras/Products
  const [allExtras, setAllExtras] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [allServices, setAllServices] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [activeAppId, setActiveAppId] = useState(null);
  const [addMode, setAddMode] = useState(null); // 'extra' | 'product'
  const [addingItemId, setAddingItemId] = useState(null);
  const addActionRef = useRef(false);
  const { pushModal, popModal } = useModal();
  const [showCamera, setShowCamera] = useState(false);
  const [cameraTarget, setCameraTarget] = useState({ appId: null, type: 'Antes' });
  const [editingExtraPriceId, setEditingExtraPriceId] = useState(null);
  const [visibleCompletedCount, setVisibleCompletedCount] = useState(5);
  const [showWashModal, setShowWashModal] = useState(false);
  const [washAppId, setWashAppId] = useState(null);
  const [washGroupApps, setWashGroupApps] = useState([]);
  const [assistantQueue, setAssistantQueue] = useState([]);
  const [loadingAssistantQueue, setLoadingAssistantQueue] = useState(false);
  const [selectedCompletedApp, setSelectedCompletedApp] = useState(null);
  const [activeView, setActiveView] = useState('work');
  const [expandedMobileClientId, setExpandedMobileClientId] = useState(null);
  const [mobileAddMenuAppId, setMobileAddMenuAppId] = useState(null);


  const handleUpdateExtraPrice = async (extraId, newPrice) => {
    try {
      setLoading(true);
      await dataService.updateAppointmentExtraPrice(extraId, parseFloat(newPrice) || 0);
      showToast("Precio actualizado");
      await loadMyWork();
      await loadStats();
    } catch (e) {
      showToast("Error al actualizar precio", "error");
    } finally {
      setLoading(false);
      setEditingExtraPriceId(null);
    }
  };

  const [stats, setStats] = useState({ production: 0, services: 0, earnings: 0, tips: 0 });

  useEffect(() => {
    // A barber's authenticated profile is enough to load their chair. Avoid
    // waiting for the complete staff list before the first useful request.
    if (!isServiceProfessional) loadStaff();
    loadCatalog();
  }, []);

  useEffect(() => {
    if (initialStaff) setSelectedBarber(initialStaff);
  }, [initialStaff]);

  const loadCatalog = async () => {
    try {
      const [extras, items, services] = await Promise.all([
        dataService.getExtras(),
        dataService.getSellableInventory(),
        dataService.getServices()
      ]);
      setAllExtras(extras);
      setInventory(items);
      setAllServices(services);
    } catch (err) {
      console.error(err);
    }
  };

  // Auto-select if current user is a selectable staff member
  useEffect(() => {
    if (staff.length > 0 && user) {
      const roleName = (user.role || '').toLowerCase();
      const isSelectableRole = !roleName.includes('admin') && !roleName.includes('recepcionista') && !roleName.includes('caja');
      if (isSelectableRole) {
        const me = staff.find(s => s.id === user.id);
        if (me) {
          setSelectedBarber(me);
          setActiveView('work');
          window.dispatchEvent(new CustomEvent('panda_active_barber_changed', { detail: me }));
        }
      }
    }
  }, [staff, user]);

  // Sync modal state with global context to hide sidebar
  useEffect(() => {
    const isAnyModalOpen = !!selectedCompletedApp || showAddModal || showCamera || showWashModal;
    if (isAnyModalOpen) {
      pushModal();
      return () => popModal();
    }
  }, [selectedCompletedApp, showAddModal, showCamera, showWashModal, pushModal, popModal]);

  // Lazy-load base64 galleries only for the clients actually shown, then merge them
  // into the already-rendered cards. Keeps the initial fetch light on slow WiFi.
  const hydrateGalleries = useCallback(async (list, setter) => {
    try {
      const ids = [...new Set(list.map(s => s.client_id).filter(Boolean))];
      if (ids.length === 0) return;
      const galleries = await dataService.getClientGalleries(ids);
      setter(prev => prev.map(s =>
        galleries[s.client_id]
          ? { ...s, clients: { ...(s.clients || {}), work_gallery: galleries[s.client_id] } }
          : s
      ));
    } catch (err) {
      console.error('Error cargando galerías', err);
    }
  }, []);

  const loadMyWork = useCallback(async () => {
    if (!selectedBarber) return;
    try {
      setLoading(true);
      const isAssistant = selectedBarber.role?.toLowerCase().includes('asistente');
      const states = isAssistant ? ['En Silla', 'En Lavado'] : ['En Silla', 'Agendado', 'En Lavado'];
      // Light fetch (no base64 galleries); photos are hydrated below only for shown clients.
      const data = await dataService.getAppointmentsByState(states, null, { light: true });
      const list = isAssistant ? data : data.filter(s => String(s.staff_id) === String(selectedBarber.id));
      setMyServices(list);
      if (!isAssistant) hydrateGalleries(list, setMyServices);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [selectedBarber, hydrateGalleries]);

  const loadCompletedToday = useCallback(async () => {
    if (!selectedBarber) return;
    try {
      const now = new Date();
      const todayStartISO = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0).toISOString();
      const data = await dataService.getAppointmentsByState(['Completado', 'Por Pagar'], todayStartISO, { light: true, byCompletedAt: true });
      const getLocalDateString = (d) => {
        if (!d) return '';
        const dateObj = typeof d === 'string' || typeof d === 'number' ? new Date(d) : d;
        if (isNaN(dateObj.getTime())) return '';
        const year = dateObj.getFullYear();
        const month = String(dateObj.getMonth() + 1).padStart(2, '0');
        const day = String(dateObj.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      };
      const todayLocal = getLocalDateString(now);
      const isAssistant = selectedBarber.role?.toLowerCase().includes('asistente');
      const filtered = data.filter((s, index, self) => {
        // 1. Deduplicate by appointment ID
        if (self.findIndex(t => String(t.id) === String(s.id)) !== index) return false;

        // 2. Filter by local date
        const createdDate = getLocalDateString(s.completed_at || s.created_at || s.scheduled_at || s.appointment_date);
        const isToday = createdDate === todayLocal;
        if (!isToday) return false;
        
        // 3. Exclude empty 0-value records without services, extras or products
        const hasService = !!s.service_id || !!s.services?.name;
        const hasExtras = (s.appointment_extras?.length > 0);
        const hasProducts = (s.appointment_products?.length > 0);
        const totalVal = (Number(s.services?.price) || Number(s.total_price) || 0) + 
                         (s.appointment_extras?.reduce((sum, e) => sum + (Number(e.price) || 0), 0) || 0) + 
                         (s.appointment_products?.reduce((sum, p) => sum + ((Number(p.price) || 0) * (p.quantity || 1)), 0) || 0);

        if (!hasService && !hasExtras && !hasProducts && totalVal === 0) {
          return false;
        }

        // 4. Filter by staff member
        if (isAssistant) {
          return s.appointment_staff?.some(as => String(as.staff_id) === String(selectedBarber.id));
        } else {
          return String(s.staff_id) === String(selectedBarber.id);
        }
      });
      setCompletedToday(filtered);
      hydrateGalleries(filtered, setCompletedToday);
    } catch (err) {
      console.error(err);
    }
  }, [selectedBarber, hydrateGalleries]);

  useEffect(() => {
    if (selectedBarber) {
      loadMyWork();
      loadStats();
      loadCompletedToday();
      
      // Real-time listener for appointments and multi-staff assignments
      const subscription = supabase
        .channel(`barber-realtime-${selectedBarber.id}`)
        .on('postgres_changes', { 
          event: '*', 
          schema: 'odontosonrisa', 
          table: 'appointments' 
        }, (payload) => {
          const isAssistant = selectedBarber.role?.toLowerCase().includes('asistente');
          const isForMe = isAssistant || 
                          String(payload.new?.staff_id) === String(selectedBarber.id) || 
                          String(payload.old?.staff_id) === String(selectedBarber.id);
          
          if (isForMe || !payload.new?.staff_id) {
            if (payload.eventType === 'INSERT') {
              showToast("🚀 ¡Nueva cita asignada!");
              triggerRocket();
            } else if (payload.eventType === 'UPDATE' && payload.new.status === 'En Silla') {
              showToast("🚀 ¡Cliente listo en sillón!", "success");
              triggerRocket();
            } else if (payload.eventType === 'UPDATE' && payload.new.status === 'En Lavado') {
              showToast("💧 Cliente en profilaxis", "info");
            } else if (payload.eventType === 'UPDATE' && payload.new.status === 'Completado') {
              showToast("💰 ¡Cobro finalizado por Caja!", "success");
            } else {
              showToast("Actualizando sillón...", "info");
            }
          }
          
          dataService.clearApptsCache();
          setTimeout(() => {
            loadMyWork();
            loadStats();
            loadCompletedToday();
          }, 200);
        })
        .on('postgres_changes', {
          event: '*',
          schema: 'odontosonrisa',
          table: 'appointment_staff'
        }, () => {
          dataService.clearApptsCache();
          setTimeout(() => {
            loadMyWork();
            loadStats();
            loadCompletedToday();
          }, 200);
        })
        .subscribe();

      return () => {
        supabase.removeChannel(subscription);
      };
    } else {
      window.dispatchEvent(new CustomEvent('panda_active_barber_changed', { detail: null }));
    }
  }, [selectedBarber, loadMyWork, loadCompletedToday]);

  const loadStaff = async () => {
    try {
      const data = await dataService.getStaff();
      setStaff(data);
    } catch (err) {
      console.error(err);
    }
  };

  const loadStats = async () => {
    if (!selectedBarber) return;
    try {
      const isAssistant = selectedBarber.role?.toLowerCase().includes('asistente');
      if (isAssistant) {
        const now = new Date();
        const todayStartISO = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0).toISOString();
        const data = await dataService.getAppointmentsByState(['Completado', 'Por Pagar'], todayStartISO, { light: true, byCompletedAt: true });
        const getLocalDateString = (d) => {
          if (!d) return '';
          const dateObj = typeof d === 'string' || typeof d === 'number' ? new Date(d) : d;
          if (isNaN(dateObj.getTime())) return '';
          const year = dateObj.getFullYear();
          const month = String(dateObj.getMonth() + 1).padStart(2, '0');
          const day = String(dateObj.getDate()).padStart(2, '0');
          return `${year}-${month}-${day}`;
        };
        const todayLocal = getLocalDateString(now);
        let count = 0;
        let earned = 0;
        let tips = 0;
        data.forEach(s => {
          const createdDate = getLocalDateString(s.created_at || s.completed_at || s.appointment_date);
          if (createdDate === todayLocal) {
            const myRecord = s.appointment_staff?.find(as => String(as.staff_id) === String(selectedBarber.id));
            if (myRecord) {
              count++;
              earned += Number(myRecord.commission_earned || 0);
              tips += Number(myRecord.tip_amount || 0);
            }
          }
        });
        setStats({ production: earned, services: count, earnings: earned, tips: tips });
      } else {
        const data = await dataService.getBarberDailyStats(selectedBarber.id);
        setStats({ production: data.productionUsd, services: data.services, earnings: data.earningsUsd, tips: data.tipsUsd || 0 });
      }
    } catch (err) {
      console.error("Error loading stats:", err);
    }
  };

  const handleFinishService = async (serviceId) => {
    const app = myServices.find(s => s.id === serviceId);
    const hasSomething = !!app?.service_id || (app?.appointment_extras?.length > 0) || (app?.appointment_products?.length > 0);
    if (!hasSomething) {
      showToast("Carga un servicio primero", "warning");
      return;
    }
    try {
      setLoading(true);
      await dataService.updateAppointmentStatus(serviceId, 'Por Pagar');
      showToast("¡Servicio finalizado! Enviado a caja para cobro.");
      triggerConfetti();
      loadMyWork();
      loadStats();
      loadCompletedToday();
    } catch (err) {
      showToast("Error al finalizar servicio", "error");
    } finally {
      setLoading(false);
    }
  };

  const handlePullFromWash = async (serviceId) => {
    try {
      setLoading(true);
      await dataService.updateAppointmentStatus(serviceId, 'En Silla');
      showToast("¡Cliente recuperado a tu sillón!");
      loadMyWork();
      loadStats();
      loadCompletedToday();
    } catch (err) {
      showToast("Error al recuperar de profilaxis", "error");
    } finally {
      setLoading(false);
    }
  };

  const loadAssistantQueue = async () => {
    try {
      setLoadingAssistantQueue(true);
      const queue = await dataService.getTurnQueue();
      const assistants = queue.filter(q => 
        q.status !== 'ABSENT' && 
        (q.staff?.role?.toLowerCase().includes('asistente') || 
         q.staff?.role?.toLowerCase().includes('lavado') || 
         q.staff?.role?.toLowerCase().includes('operaciones'))
      );
      setAssistantQueue(assistants);
    } catch (e) {
      console.error("Error loading assistant queue:", e);
    } finally {
      setLoadingAssistantQueue(false);
    }
  };

  const handleSendToWash = async (serviceId) => {
    setWashAppId(serviceId);
    setShowWashModal(true);
    await loadAssistantQueue();
  };

  const confirmSendToWash = async (assistantId) => {
    try {
      setLoading(true);
      const app = myServices.find(s => s.id === washAppId);
      const clientName = app?.clients?.name || 'Cliente';

      if (assistantId) {
        await dataService.assignAssistantToAppointment(washAppId, assistantId);
      }

      const idsToWash = washGroupApps.length ? washGroupApps : [washAppId];
      await Promise.all(idsToWash.map(id => dataService.updateAppointmentStatus(id, 'En Lavado')));
      showToast("¡Cliente enviado a profilaxis!");
      triggerRocket();
      setShowWashModal(false);
      
      notificationService.broadcastNotification(
        supabase,
        '💧 Nuevo Cliente para Profilaxis',
        `Hey, toca una profilaxis con ${clientName}. (Enviado por: ${selectedBarber.name})`,
        assistantId ? { recipientId: assistantId } : { recipientRole: 'Asistente' }
      );

      loadMyWork();
      loadStats();
      loadCompletedToday();
    } catch (err) {
      showToast("Error al enviar a profilaxis", "error");
    } finally {
      setLoading(false);
    }
  };

  const skipAssistantTurn = async (assistantId) => {
    try {
      setLoading(true);
      await dataService.skipTurn(assistantId);
      showToast("Turno del asistente saltado");
      await loadAssistantQueue();
    } catch (err) {
      showToast("Error al saltar turno", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleReturnToBarber = async (serviceId) => {
    try {
      setLoading(true);
      const app = myServices.find(s => s.id === serviceId);
      const clientName = app?.clients?.name || 'Cliente';
      const barberId = app?.staff_id;
      const barberName = app?.staff?.name || 'Odontólogo';

      await dataService.updateAppointmentStatus(serviceId, 'En Silla');
      showToast("¡Cliente enviado de regreso al odontólogo!");
      
      // Notify barbers that client is ready
      notificationService.broadcastNotification(
        supabase,
        '💈 Cliente listo',
        `El cliente ${clientName} terminó su profilaxis y está listo para pasar a sillón.`,
        { recipientRole: 'Barbero' }
      );

      loadMyWork();
      loadStats();
      loadCompletedToday();
    } catch (err) {
      showToast("Error al procesar", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleAssistantSendToCheckout = async (serviceId) => {
    try {
      setLoading(true);
      const app = myServices.find(s => s.id === serviceId);
      const clientName = app?.clients?.name || 'Cliente';

      // Assign this assistant to the appointment
      await dataService.assignAssistantToAppointment(serviceId, selectedBarber.id);
      // Update status to 'Por Pagar' (sent to checkout)
      await dataService.updateAppointmentStatus(serviceId, 'Por Pagar');
      showToast("¡Profilaxis completada! Enviado a caja.");
      triggerConfetti();

      // Broadcast to Admin / Caja
      notificationService.broadcastNotification(
        supabase,
        '💳 Cliente enviado a Caja',
        `El cliente ${clientName} terminó su profilaxis y fue enviado a caja.`,
        { recipientRole: 'Admin' }
      );

      loadMyWork();
      loadStats();
      loadCompletedToday();
    } catch (err) {
      showToast("Error al procesar la profilaxis", "error");
    } finally {
      setLoading(false);
    }
  };

  const handlePhotoCaptured = async (image) => {
    if (!cameraTarget.appId) return;
    try {
      showToast("Sincronizando con la nube...", "info");
      const app = myServices.find(s => s.id === cameraTarget.appId);
      if (!app) return;

      // 1. Optimize Image (Small but pro)
      const img = new Image();
      img.src = image;
      await new Promise(r => img.onload = r);
      const canvas = document.createElement('canvas');
      const MAX_WIDTH = 800;
      let width = img.width;
      let height = img.height;
      if (width > MAX_WIDTH) {
        height = (MAX_WIDTH / width) * height;
        width = MAX_WIDTH;
      }
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, width, height);
      const optimizedImage = canvas.toDataURL('image/jpeg', 0.6);

      // 2. Update Client Gallery with metadata
      const photoObj = {
        url: optimizedImage,
        type: cameraTarget.type,
        date: new Date().toISOString(),
        service_id: app.id,
        service_name: app.services?.name || 'Servicio'
      };

      // 2. Fetch latest gallery from DB to avoid race conditions (overwriting)
      const { data: latestClient } = await supabase
        .from('clients')
        .select('work_gallery')
        .eq('id', app.client_id)
        .single();

      const currentGallery = Array.isArray(latestClient?.work_gallery) ? latestClient.work_gallery : [];
      const newGallery = [photoObj, ...currentGallery];
      await dataService.updateClient(app.client_id, { work_gallery: newGallery });
      
      // Update local state instantly for real-time feedback
      setMyServices(prev => prev.map(s => {
        if (s.client_id === app.client_id) {
          return {
            ...s,
            clients: {
              ...s.clients,
              work_gallery: newGallery
            }
          };
        }
        return s;
      }));
      setCompletedToday(prev => prev.map(s => {
        if (s.client_id === app.client_id) {
          return {
            ...s,
            clients: {
              ...s.clients,
              work_gallery: newGallery
            }
          };
        }
        return s;
      }));
      if (selectedCompletedApp && selectedCompletedApp.client_id === app.client_id) {
        setSelectedCompletedApp(prev => ({
          ...prev,
          clients: {
            ...prev.clients,
            work_gallery: newGallery
          }
        }));
      }

      showToast("¡Foto guardada con éxito!", "success");
      await loadMyWork();
    } catch (err) {
      console.error(err);
      showToast("Error al guardar foto", "error");
    } finally {
      setShowCamera(false);
    }
  };

  const handleDeletePhoto = async (appId, type) => {
    try {
      const app = myServices.find(s => s.id === appId);
      if (!app) return;

      if (!await confirm("¿Quieres borrar la foto de esta cita?")) return;

      showToast("Borrando foto...", "info");

      const { data: latestClient } = await supabase
        .from('clients')
        .select('work_gallery')
        .eq('id', app.client_id)
        .single();

      const currentGallery = Array.isArray(latestClient?.work_gallery) ? latestClient.work_gallery : [];
      const newGallery = currentGallery.filter(p => !(p.service_id === appId && p.type === type));

      await dataService.updateClient(app.client_id, { work_gallery: newGallery });
      
      // Update local state instantly for real-time feedback
      setMyServices(prev => prev.map(s => {
        if (s.client_id === app.client_id) {
          return {
            ...s,
            clients: {
              ...s.clients,
              work_gallery: newGallery
            }
          };
        }
        return s;
      }));
      setCompletedToday(prev => prev.map(s => {
        if (s.client_id === app.client_id) {
          return {
            ...s,
            clients: {
              ...s.clients,
              work_gallery: newGallery
            }
          };
        }
        return s;
      }));
      if (selectedCompletedApp && selectedCompletedApp.client_id === app.client_id) {
        setSelectedCompletedApp(prev => ({
          ...prev,
          clients: {
            ...prev.clients,
            work_gallery: newGallery
          }
        }));
      }
      showToast("Foto eliminada", "success");
      await loadMyWork();
    } catch (err) {
      console.error(err);
      showToast("Error al eliminar la foto", "error");
    }
  };

  const handleAddExtra = async (extra) => {
    if (addActionRef.current) return;
    addActionRef.current = true;
    setAddingItemId(extra.id);
    try {
      setLoading(true);
      await dataService.addExtraToAppointment(activeAppId, extra.id, extra.price);
      // Now that this chair has real content, remove any leftover $0 "sin servicio"
      // shell for the same client+barber so it can't show as a phantom duplicate.
      const app = myServices.find(s => s.id === activeAppId);
      if (app?.client_id) await dataService.pruneEmptyShells(app.client_id, app.staff_id).catch(() => {});
      showToast(`+ ${extra.name} añadido`);
      setShowAddModal(false);
      loadMyWork();
      loadStats();
    } catch (err) {
      showToast("Error al añadir extra", "error");
    } finally {
      setLoading(false);
      setAddingItemId(null);
      addActionRef.current = false;
    }
  };

  const handleAddProduct = async (product) => {
    if (addActionRef.current) return;
    addActionRef.current = true;
    setAddingItemId(product.id);
    try {
      setLoading(true);
      await dataService.addProductToAppointment(activeAppId, product.id, 1, product.price);
      // Same shell cleanup as when a service/extra is added (see handleAddExtra).
      const app = myServices.find(s => s.id === activeAppId);
      if (app?.client_id) await dataService.pruneEmptyShells(app.client_id, app.staff_id).catch(() => {});
      showToast(`+ ${product.name} añadido`);
      setShowAddModal(false);
      loadMyWork();
      loadStats();
    } catch (err) {
      showToast("Error al añadir producto", "error");
    } finally {
      setLoading(false);
      setAddingItemId(null);
      addActionRef.current = false;
    }
  };

  // Barber loads a base service onto the chair. If this card has an empty 'Sin servicio' shell,
  // update it with this service. If all existing appointments already have a service_id,
  // create an additional appointment (same client/barber) so the client can have several services.
  const handleSetService = async (service) => {
    if (addActionRef.current) return;
    addActionRef.current = true;
    setAddingItemId(service.id);
    try {
      setLoading(true);
      const app = myServices.find(s => s.id === activeAppId);
      if (!app) { setShowAddModal(false); return; }

      // Find all active appointments in myServices for this client
      const clientApps = myServices.filter(s => s.client_id === app.client_id);
      
      // Check if there is an empty shell appointment (no service_id yet)
      const emptyShell = clientApps.find(a => !a.service_id);

      if (emptyShell) {
        // Overwrite the empty shell with the chosen service
        await dataService.updateAppointment(emptyShell.id, { service_id: service.id, total_price: service.price });
      } else if (!app.service_id) {
        await dataService.updateAppointment(app.id, { service_id: service.id, total_price: service.price });
      } else {
        await dataService.createAppointment({
          client_id: app.client_id,
          staff_id: app.staff_id,
          service_id: service.id,
          status: app.status || 'En Silla',
          total_price: service.price
        }, { skipPush: true });
      }

      // Cleanup: remove any leftover empty $0 "sin servicio" shell for this client+barber.
      // Done against fresh DB state (not the possibly-stale myServices) so a shell that
      // this handler didn't see — e.g. it created a new appointment instead of reusing the
      // shell — still gets pruned and can't linger as a phantom duplicate chair.
      await dataService.pruneEmptyShells(app.client_id, app.staff_id).catch(() => {});

      showToast(`+ ${service.name} añadido`);
      setShowAddModal(false);
      loadMyWork();
      loadStats();
    } catch (err) {
      showToast("Error al añadir servicio", "error");
    } finally {
      setLoading(false);
      setAddingItemId(null);
      addActionRef.current = false;
    }
  };

  // Cancel the chair. If nothing has been loaded yet (no service/extra/product) the shell
  // is deleted outright; otherwise it's marked 'Cancelado' for history. Either way the
  // barber is freed in the queue.
  const handleCancelChair = async (app) => {
    const hasSomething = !!app.service_id || (app.appointment_extras?.length > 0) || (app.appointment_products?.length > 0);
    const message = hasSomething
      ? "¿Cancelar este servicio? Se marcará como cancelado."
      : "¿Quitar este cliente del sillón?";
    if (!await confirm(message)) return;
    try {
      setLoading(true);
      if (hasSomething) {
        await dataService.updateAppointment(app.id, { status: 'Cancelado' });
      } else {
        await dataService.deleteAppointment(app.id);
      }
      if (app.staff_id) {
        await dataService.updateQueueStatus(app.staff_id, 'AVAILABLE').catch(() => {});
      }
      showToast(hasSomething ? "Servicio cancelado" : "Cliente retirado del sillón");
      loadMyWork();
      loadStats();
      loadCompletedToday();
    } catch (err) {
      showToast("Error al cancelar", "error");
    } finally {
      setLoading(false);
    }
  };

  // ── Group-level actions (one client card = several service appointments) ──
  const groupHasContent = (group) =>
    group.apps.some(a => !!a.service_id || a.appointment_extras?.length > 0 || a.appointment_products?.length > 0);

  // Send the whole client order to checkout.
  const handleFinishGroup = async (group) => {
    if (!groupHasContent(group)) {
      showToast("Carga un servicio primero", "warning");
      return;
    }
    try {
      setLoading(true);
      await Promise.all(group.apps.map(a => dataService.updateAppointmentStatus(a.id, 'Por Pagar')));
      showToast("¡Servicio finalizado! Enviado a caja para cobro.");
      triggerConfetti();
      loadMyWork();
      loadStats();
      loadCompletedToday();
    } catch (err) {
      showToast("Error al finalizar servicio", "error");
    } finally {
      setLoading(false);
    }
  };

  // Cancel the whole client order. Empty shells are deleted; anything with content
  // is marked 'Cancelado'. The barber is freed in the queue.
  const handleCancelGroup = async (group) => {
    const hasContent = groupHasContent(group);
    const message = hasContent
      ? "¿Cancelar la orden de este cliente? Se marcará como cancelada."
      : "¿Quitar este cliente del sillón?";
    if (!await confirm(message)) return;
    try {
      setLoading(true);
      await Promise.all(group.apps.map(a => {
        const has = !!a.service_id || a.appointment_extras?.length > 0 || a.appointment_products?.length > 0;
        return has
          ? dataService.updateAppointment(a.id, { status: 'Cancelado' })
          : dataService.deleteAppointment(a.id);
      }));
      const staffId = group.apps[0]?.staff_id;
      if (staffId) await dataService.updateQueueStatus(staffId, 'AVAILABLE').catch(() => {});
      showToast(hasContent ? "Orden cancelada" : "Cliente retirado del sillón");
      loadMyWork();
      loadStats();
      loadCompletedToday();
    } catch (err) {
      showToast("Error al cancelar", "error");
    } finally {
      setLoading(false);
    }
  };

  const handlePullFromWashGroup = async (group) => {
    try {
      setLoading(true);
      await Promise.all(group.apps.map(a => dataService.updateAppointmentStatus(a.id, 'En Silla')));
      showToast("¡Cliente recuperado a tu sillón!");
      loadMyWork();
      loadStats();
      loadCompletedToday();
    } catch (err) {
      showToast("Error al recuperar de profilaxis", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleSendToWashGroup = async (group) => {
    setWashAppId(group.apps[0].id);
    setWashGroupApps(group.apps.map(a => a.id));
    setShowWashModal(true);
    await loadAssistantQueue();
  };

  // Remove a single service line from a client's order (the little red x). Services
  // with extras/products attached must have those removed first (they live on that row).
  const handleRemoveService = async (app, group) => {
    if (app.appointment_extras?.length > 0 || app.appointment_products?.length > 0) {
      showToast("Ese servicio tiene extras/productos; quítalos primero", "warning");
      return;
    }
    if (!await confirm(`¿Quitar "${app.services?.name || 'servicio'}"?`)) return;
    try {
      setLoading(true);
      if (group.apps.length > 1) {
        await dataService.deleteAppointment(app.id);
      } else {
        // Last line: keep the client in the chair as an empty shell
        await dataService.updateAppointment(app.id, { service_id: null, total_price: 0 });
      }
      showToast("Servicio quitado");
      loadMyWork();
      loadStats();
    } catch (err) {
      showToast("Error al quitar servicio", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteExtra = async (id) => {
    try {
      setLoading(true);
      await dataService.deleteAppointmentExtra(id);
      showToast("Extra eliminado");
      loadMyWork();
      loadStats();
    } catch (err) {
      showToast("Error al eliminar", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteProduct = async (id) => {
    try {
      setLoading(true);
      await dataService.deleteAppointmentProduct(id);
      showToast("Producto eliminado");
      loadMyWork();
      loadStats();
    } catch (err) {
      showToast("Error al eliminar", "error");
    } finally {
      setLoading(false);
    }
  };

  if (!selectedBarber) {
    return (
      <div className="animate-fade-in" style={{ padding: '40px 20px 100px 20px', textAlign: 'center' }}>
        <h2 style={{ fontSize: 'clamp(18px, 5.5vw, 28px)', fontWeight: '900', marginBottom: '10px', whiteSpace: 'nowrap' }}>Panel de <span className="text-gold">Odontólogos / Asistentes</span></h2>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '40px' }}>Selecciona tu perfil para comenzar tu turno.</p>
        
        <div className="animate-page-fade-in" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '20px', maxWidth: '600px', margin: '0 auto' }}>
          {staff
            .filter(s => {
              const roleName = (s.role?.split('|')[0] || '').toLowerCase();
              return !roleName.includes('admin') && 
                     !roleName.includes('recepcionista') && 
                     !roleName.includes('caja');
            })
            .map(s => {
              const displayRole = (s.role?.split('|')[0] || 'Odontólogo').trim();
              return (
              <button 
                key={s.id} 
                onClick={() => {
                  setSelectedBarber(s);
                  window.dispatchEvent(new CustomEvent('panda_active_barber_changed', { detail: s }));
                }}
                className="glass-card hover-item" 
                style={{ padding: '30px 10px', borderRadius: '24px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', cursor: 'pointer', width: '100%' }}
              >
                <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'var(--gold-gradient)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: 'var(--gold-glow)', marginBottom: '4px' }}>
                  {s.image_url ? (
                     <img loading="lazy" src={s.image_url} alt={s.name} style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
                  ) : (
                    <User size={32} color="black" />
                  )}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', width: '100%' }}>
                  <span style={{ fontWeight: '800', fontSize: '16px', color: 'white' }}>{s.name}</span>
                  <span style={{ 
                    fontSize: '9.5px', 
                    fontWeight: '700', 
                    color: 'var(--text-muted)', 
                    textTransform: 'uppercase', 
                    letterSpacing: '0px',
                    textAlign: 'center',
                    lineHeight: '1.2',
                    width: '100%',
                    textWrap: 'balance'
                  }}>{displayRole}</span>
                </div>
              </button>
            )})}
        </div>
      </div>
    );
  }

  const isAssistant = selectedBarber?.role?.toLowerCase().includes('asistente');
  const getGreeting = () => {
    const options = { timeZone: 'America/Caracas', hour: 'numeric', hour12: false };
    const hour = parseInt(new Date().toLocaleString('en-US', options), 10);
    if (hour >= 5 && hour < 12) return '¡Buenos días,';
    if (hour >= 12 && hour < 19) return '¡Buenas tardes,';
    return '¡Buenas noches,';
  };

  const activeChairCount = myServices.filter(app => app.status === 'En Silla' || app.status === 'En Lavado').length;
  const waitingChairCount = myServices.filter(app => app.status === 'Agendado').length;
  const groupedMyServices = groupAppointmentsByClient(myServices);
  const firstUpcomingIndex = groupedMyServices.findIndex(group => !['En Silla', 'En Lavado'].includes(group.apps[0]?.status));
  const chairState = activeChairCount > 0
    ? { label: isAssistant ? 'Estación activa' : 'Servicio en curso', color: isAssistant ? '#4aa3ff' : '#32d74b', glow: isAssistant ? 'rgba(74,163,255,.22)' : 'rgba(50,215,75,.22)' }
    : waitingChairCount > 0
      ? { label: `${waitingChairCount} ${waitingChairCount === 1 ? 'cliente esperando' : 'clientes esperando'}`, color: 'var(--gold-primary)', glow: 'rgba(17, 17, 17,.22)' }
      : { label: isAssistant ? 'Estación disponible' : 'Sillón disponible', color: '#a9a9ad', glow: 'rgba(255,255,255,.08)' };

  return (
    <div className="animate-fade-in barber-live-console" style={{ maxWidth: isMobile ? '550px' : '1380px', margin: '0 auto', paddingBottom: '100px' }}>
      <style>{`
        .barber-live-console { width: 100%; }
        .barber-command-header { padding: 18px 20px; border: 1px solid rgba(255,255,255,.065); border-radius: 22px; background: linear-gradient(135deg, rgba(24,24,26,.86), rgba(10,10,11,.88)); box-shadow: 0 18px 50px rgba(0,0,0,.24); }
        .barber-command-header > div:first-child { min-width: 0; flex: 1; }
        .barber-chair-status { display: inline-flex; align-items: center; gap: 8px; min-height: 30px; padding: 0 11px; margin-top: 10px; border-radius: 999px; border: 1px solid color-mix(in srgb, var(--chair-state-color) 35%, transparent); background: color-mix(in srgb, var(--chair-state-color) 10%, transparent); color: var(--chair-state-color); font-size: 10px; font-weight: 900; text-transform: uppercase; letter-spacing: .65px; }
        .barber-chair-status::before { content: ''; width: 7px; height: 7px; border-radius: 50%; background: currentColor; box-shadow: 0 0 12px currentColor; }
        .barber-view-tabs { position: relative; z-index: 15; }
        .barber-work-grid { display: grid !important; grid-template-columns: minmax(0, 1.55fr) minmax(360px, .85fr) !important; gap: 18px !important; align-items: start !important; }
        .barber-chair-column { grid-column: 1; grid-row: 1; min-width: 0; }
        .barber-side-column { grid-column: 2; grid-row: 1; min-width: 0; margin-top: 50px; display: flex; flex-direction: column; gap: 14px; align-self: start; }
        .barber-side-heading { display: flex; align-items: center; justify-content: space-between; color: rgba(255,255,255,.76); font-size: 11px; font-weight: 900; letter-spacing: .9px; text-transform: uppercase; }
        .barber-side-heading span { color: rgba(255,255,255,.35); font-size: 9px; letter-spacing: .35px; }
        .barber-stats-grid { display: grid !important; grid-template-columns: repeat(2, minmax(0, 1fr)) !important; grid-auto-rows: auto; gap: 10px !important; margin-top: 0; align-self: auto; }
        .barber-stat-card { min-height: 118px; padding: 16px 12px !important; border-radius: 18px !important; display: flex; flex-direction: column; justify-content: center; transition: transform 180ms ease, border-color 180ms ease, box-shadow 180ms ease; }
        .barber-stat-card:hover { transform: translateY(-2px); border-color: rgba(17, 17, 17,.2); box-shadow: 0 14px 28px rgba(0,0,0,.25); }
        .barber-completed-section { margin-top: 0 !important; padding: 16px; border-radius: 20px; border: 1px solid rgba(255,255,255,.055); background: rgba(255,255,255,.018); }
        .barber-appointment-card { padding: 22px !important; border-radius: 24px !important; }
        .barber-appointment-summary { padding-bottom: 18px; margin-bottom: 18px !important; border-bottom: 1px solid rgba(255,255,255,.065); }
        .barber-appointments-stack { display: flex; flex-direction: column; gap: 20px; }
        .barber-appointment-details { animation: barber-details-in 180ms ease-out both; }
        .barber-appointment-time { display: inline-flex; align-items: center; gap: 4px; color: rgba(255,255,255,.52); font-size: 10px; font-weight: 850; white-space: nowrap; }
        .barber-appointment-chevron { display: inline-flex; width: 28px; height: 28px; align-items: center; justify-content: center; border-radius: 50%; color: var(--gold-primary); background: rgba(17, 17, 17,.08); transition: transform 180ms ease; }
        .barber-appointment-chevron.is-open { transform: rotate(180deg); }
        .barber-appointment-card.is-collapsed { padding: 0 !important; border-radius: 18px !important; overflow: hidden; }
        .barber-appointment-card.is-collapsed .barber-appointment-summary { min-height: 106px; margin: 0 !important; padding: 15px 18px !important; border-bottom: 0; cursor: pointer; }
        .barber-appointment-card.is-collapsed .barber-appointment-summary > div:first-child { flex: 1; min-width: 0; padding-right: 14px; }
        .barber-appointment-card.is-collapsed .barber-appointment-summary h3 { width: 100%; max-width: none; margin-top: 7px !important; font-size: 18px !important; line-height: 1.18; white-space: normal; overflow-wrap: anywhere; }
        .barber-appointment-card.is-collapsed .barber-service-list { gap: 4px !important; margin-top: 7px !important; }
        .barber-appointment-card.is-collapsed .barber-service-list > div { padding: 3px 9px !important; }
        .barber-appointment-card.is-collapsed .barber-included-items { display: none !important; }
        .barber-appointment-card.is-collapsed .barber-appointment-total { flex: 0 0 auto; align-self: stretch; display: flex; flex-direction: column; align-items: flex-end; justify-content: space-between; }
        .barber-appointment-card.is-collapsed .barber-appointment-time { display: inline-flex; align-items: center; gap: 4px; color: rgba(255,255,255,.52); font-size: 10px; font-weight: 850; white-space: nowrap; }
        .barber-appointment-card.is-collapsed .barber-appointment-chevron { display: inline-flex; width: 28px; height: 28px; align-items: center; justify-content: center; border-radius: 50%; color: var(--gold-primary); background: rgba(17, 17, 17,.08); transition: transform 180ms ease; }
        .barber-appointment-card.is-collapsed .barber-appointment-chevron.is-open { transform: rotate(180deg); }
        .barber-queue-divider { display: none; }
        .barber-mobile-add-control { display: none; }
        @keyframes barber-details-in { from { opacity: 0; transform: translateY(-5px); } to { opacity: 1; transform: translateY(0); } }
        .barber-work-section-heading { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin: 0 0 10px; color: rgba(255,255,255,.82); font-size: 11px; font-weight: 900; letter-spacing: .55px; text-transform: uppercase; }
        .barber-work-section-heading > span { display: inline-flex; align-items: center; gap: 7px; }
        .barber-work-section-heading small { color: rgba(255,255,255,.34); font-size: 9px; font-weight: 750; letter-spacing: .2px; text-transform: none; }
        .barber-photo-grid { margin-bottom: 14px !important; }
        .barber-client-context { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; padding: 10px !important; }
        .barber-client-context-row { min-width: 0; min-height: 54px; padding: 9px 10px; border-radius: 12px; background: rgba(255,255,255,.025); }
        .barber-client-context-row:only-child { grid-column: 1 / -1; }
        .barber-add-actions { gap: 8px !important; margin-bottom: 16px !important; }
        .barber-add-actions button { min-height: 44px; padding: 0 12px !important; border-radius: 12px !important; }
        .barber-waiting-state { min-height: 58px; padding: 10px 14px; border-radius: 15px; border: 1px solid rgba(17, 17, 17,.14); background: rgba(17, 17, 17,.055); color: rgba(255,255,255,.78); display: flex; align-items: center; justify-content: center; gap: 10px; text-align: left; }
        .barber-waiting-state strong { display: block; color: #fff; font-size: 12px; }
        .barber-waiting-state span { display: block; margin-top: 2px; color: rgba(255,255,255,.42); font-size: 10px; }
        .barber-empty-chair { min-height: 310px; padding: 34px !important; display: flex; flex-direction: column; align-items: center; justify-content: center; background: radial-gradient(circle at 50% 45%, var(--chair-state-glow), transparent 38%), rgba(255,255,255,.018) !important; border-color: color-mix(in srgb, var(--chair-state-color) 28%, transparent) !important; }
        .barber-empty-actions { display: flex; gap: 9px; margin-top: 18px; }
        .barber-empty-action { min-height: 38px; padding: 0 14px; border-radius: 11px; border: 1px solid rgba(255,255,255,.1); background: rgba(255,255,255,.045); color: rgba(255,255,255,.78); font-size: 11px; font-weight: 850; cursor: pointer; display: inline-flex; align-items: center; gap: 7px; }
        .barber-empty-action.primary { color: #101010; border-color: var(--gold-primary); background: var(--gold-primary); }
        @media (max-width: 1120px) {
          .barber-live-console { max-width: 100% !important; }
          .barber-work-grid { grid-template-columns: 1fr !important; }
          .barber-chair-column { grid-column: 1; grid-row: auto; }
          .barber-side-column { grid-column: 1; grid-row: auto; display: flex; margin-top: 16px !important; }
          .barber-stats-grid { grid-template-columns: repeat(4, minmax(0, 1fr)) !important; grid-auto-rows: auto; margin-top: 0; }
          .barber-stat-card { min-height: 122px; }
          .barber-completed-section { margin-top: 16px !important; }
        }
        @media (max-width: 720px) {
          .barber-live-console { padding-bottom: 82px !important; }
          .barber-work-grid { gap: 10px !important; }
          .barber-side-column { grid-column: 1 !important; grid-row: 1 !important; margin: 0 0 6px !important; gap: 7px !important; }
          .barber-chair-column { grid-column: 1 !important; grid-row: 2 !important; }
          .barber-side-heading { padding: 0 2px; font-size: 9px; }
          .barber-side-heading span { font-size: 7px; }
          .barber-command-header { padding: 14px; border-radius: 18px; margin-bottom: 12px !important; }
          .barber-command-header > div:first-child > div:first-child { gap: 14px !important; }
          .barber-command-header > div:first-child > div:first-child > div:first-child { flex: 0 0 40px; }
          .barber-command-header h2 { min-width: 0; margin: 0 !important; font-size: 20px !important; line-height: 1.14; }
          .barber-command-header p { font-size: 12px !important; }
          .barber-command-header > div:last-child { gap: 7px !important; }
          .barber-command-header .barber-sync-button { width: 38px !important; height: 38px !important; padding: 0 !important; }
          .barber-command-header .barber-exit-button { min-height: 38px; padding: 0 11px !important; }
          .barber-view-tabs { position: sticky; top: 8px; width: 100% !important; margin-bottom: 16px !important; backdrop-filter: blur(18px); background: rgba(16,16,18,.84) !important; }
          .barber-view-tabs button { flex: 1; }
          .barber-empty-chair { min-height: 250px; padding: 24px 16px !important; }
          .barber-stats-grid { grid-template-columns: repeat(4, minmax(0, 1fr)) !important; grid-auto-rows: auto; gap: 0 !important; margin-top: 0; padding: 5px; border: 1px solid rgba(255,255,255,.065); border-radius: 16px; background: rgba(255,255,255,.025); }
          .barber-stat-card { min-height: 72px; padding: 8px 2px !important; border: 0 !important; border-radius: 11px !important; background: transparent !important; box-shadow: none !important; }
          .barber-stat-card + .barber-stat-card { border-left: 1px solid rgba(255,255,255,.065) !important; border-radius: 0 !important; }
          .barber-stat-card svg { width: 15px; height: 15px; margin-bottom: 5px !important; }
          .barber-stat-label { min-height: 18px; font-size: 7.25px !important; line-height: 1.2; letter-spacing: .15px; display: flex; align-items: center; justify-content: center; }
          .barber-stat-value-wrap { margin-top: 3px !important; }
          .barber-stat-value { font-size: 15px !important; line-height: 1.1; text-shadow: none !important; white-space: nowrap; }
          .barber-stat-conversion { display: none !important; }
          .barber-completed-section { display: none !important; }
          .barber-appointment-card { padding: 15px !important; border-radius: 20px !important; }
          .barber-appointments-stack { gap: 10px; padding-bottom: 12px; }
          .barber-appointment-card.is-collapsed { padding: 0 !important; border-radius: 17px !important; overflow: hidden; }
          .barber-appointment-card.is-collapsed .barber-appointment-summary { min-height: 108px; margin: 0 !important; padding: 13px 14px !important; border-bottom: 0; cursor: pointer; }
          .barber-appointment-card.is-collapsed .barber-appointment-summary > div:first-child { flex: 1; min-width: 0; padding-right: 9px; }
          .barber-appointment-card.is-collapsed .barber-appointment-summary h3 { width: 100%; max-width: none; margin-top: 7px !important; font-size: 16px !important; line-height: 1.18; white-space: normal; overflow: visible; text-overflow: clip; overflow-wrap: anywhere; }
          .barber-appointment-card.is-collapsed .barber-service-list { gap: 4px !important; margin-top: 7px !important; }
          .barber-appointment-card.is-collapsed .barber-service-list > div { width: 100% !important; padding: 3px 8px !important; }
          .barber-appointment-card.is-collapsed .barber-service-list span { max-width: none; overflow: visible; text-overflow: clip; white-space: normal; overflow-wrap: anywhere; font-size: 10px !important; }
          .barber-appointment-card.is-collapsed .barber-included-items { display: none !important; }
          .barber-appointment-card.is-collapsed .barber-appointment-total { flex: 0 0 auto; align-self: stretch; display: flex; flex-direction: column; align-items: flex-end; justify-content: space-between; }
          .barber-appointment-time { display: inline-flex; align-items: center; gap: 4px; color: rgba(255,255,255,.52); font-size: 9px; font-weight: 850; white-space: nowrap; }
          .barber-appointment-chevron { display: inline-flex; width: 26px; height: 26px; align-items: center; justify-content: center; border-radius: 50%; color: var(--gold-primary); background: rgba(17, 17, 17,.08); transition: transform 180ms ease; }
          .barber-appointment-chevron.is-open { transform: rotate(180deg); }
          .barber-queue-divider { display: flex; align-items: center; gap: 8px; margin: 8px 2px 1px; color: rgba(255,255,255,.72); font-size: 10px; font-weight: 900; letter-spacing: .75px; text-transform: uppercase; }
          .barber-queue-divider::after { content: ''; height: 1px; flex: 1; background: linear-gradient(90deg, rgba(17, 17, 17,.22), transparent); }
          .barber-queue-divider small { margin-left: auto; color: var(--gold-primary); font-size: 8px; letter-spacing: 0; }
          .barber-add-actions, .barber-work-section-heading.add-heading { display: none !important; }
          .barber-mobile-add-control { display: block; margin-bottom: 13px; }
          .barber-mobile-add-trigger { width: 100%; min-height: 42px; display: flex; align-items: center; justify-content: center; gap: 7px; border: 1px solid rgba(17, 17, 17,.22); border-radius: 12px; background: rgba(17, 17, 17,.07); color: var(--gold-primary); font-size: 11px; font-weight: 900; cursor: pointer; }
          .barber-mobile-add-menu { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 7px; margin-top: 7px; animation: barber-details-in 160ms ease-out both; }
          .barber-mobile-add-menu button { min-height: 40px; display: flex; align-items: center; justify-content: center; gap: 5px; border: 1px solid rgba(255,255,255,.1); border-radius: 11px; background: rgba(255,255,255,.035); color: rgba(255,255,255,.78); font-size: 9px; font-weight: 850; cursor: pointer; }
          .barber-service-state-actions { position: relative; padding-top: 10px; border-top: 1px solid rgba(255,255,255,.06); }
          .barber-waiting-state { min-height: 44px; padding: 9px 12px; justify-content: flex-start; }
          .barber-waiting-state span { display: none; }
          .barber-client-context { grid-template-columns: 1fr; }
          .barber-add-actions button { min-width: 0; font-size: 10px !important; }
        }
      `}</style>
      <header className="barber-command-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: isAssistant ? 'linear-gradient(135deg, #007aff, #00d2ff)' : 'var(--gold-gradient)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {selectedBarber.image_url ? (
                 <img loading="lazy" src={selectedBarber.image_url} alt={selectedBarber.name} style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
              ) : (
                isAssistant ? <Droplets size={20} color="white" /> : <Scissors size={20} color="black" />
              )}
            </div>
            <h2 style={{ fontSize: '24px', fontWeight: '900' }}>{getGreeting()} <span className="text-gold">{selectedBarber.name.split(' ')[0]}!</span></h2>
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginTop: '4px' }}>
            {isAssistant ? "Gestiona las estaciones de limpieza del día." : "Gestiona tus servicios activos y citas."}
          </p>
          <span className="barber-chair-status" style={{ '--chair-state-color': chairState.color }}>{chairState.label}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button className="barber-sync-button"
            onClick={() => { loadMyWork(); showToast("Sincronizado"); }}
            disabled={loading}
            style={{ background: 'rgba(255, 255, 255,0.1)', border: '1px solid rgba(255, 255, 255,0.2)', color: 'var(--gold-primary)', width: '40px', height: '40px', borderRadius: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            title="Sincronizar sillón"
          >
            <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
          </button>
          {String(selectedBarber?.id) !== String(user?.id) && (
            <button className="barber-exit-button"
              onClick={() => {
                setSelectedBarber(null);
                window.dispatchEvent(new CustomEvent('panda_active_barber_changed', { detail: null }));
              }}
              style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--text-secondary)', padding: '10px 16px', borderRadius: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '700', transition: 'all 0.2s' }}
              onMouseEnter={(e) => { e.currentTarget.style.color = '#ff4d4d'; e.currentTarget.style.borderColor = 'rgba(255,77,77,0.3)'; e.currentTarget.style.background = 'rgba(255,77,77,0.05)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-secondary)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; e.currentTarget.style.background = 'transparent'; }}
            >
              <LogOut size={16} /> Salir
            </button>
          )}
        </div>
      </header>

      <nav className="barber-view-tabs" style={{ display: 'flex', gap: '7px', padding: '4px', marginBottom: '18px', width: 'fit-content', maxWidth: '100%', borderRadius: '13px', background: 'rgba(255,255,255,0.035)', border: '1px solid rgba(255,255,255,0.06)' }}>
        {[
          { id: 'work', label: isAssistant ? 'Panel de limpiezas' : 'Mi sillón', icon: <LayoutDashboard size={15} /> },
          { id: 'history', label: 'Mi historial', icon: <ReceiptText size={15} /> }
        ].map(view => (
          <button
            key={view.id}
            onClick={() => setActiveView(view.id)}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '7px',
              padding: '9px 15px',
              borderRadius: '10px',
              border: 'none',
              cursor: 'pointer',
              fontSize: '12px',
              fontWeight: '850',
              color: activeView === view.id ? '#080808' : 'var(--text-secondary)',
              background: activeView === view.id ? 'var(--gold-primary)' : 'transparent'
            }}
          >
            {view.icon} {view.label}
          </button>
        ))}
      </nav>

      {activeView === 'work' ? (
        <div className="barber-work-grid" style={{ display: isMobile ? 'block' : 'grid', gridTemplateColumns: '3fr 2fr', gap: '32px', alignItems: 'start' }}>
          
          {/* LEFT COL: silla activa */}
          <div className="barber-chair-column">
        
        {/* Active Services List */}
        {isAssistant ? (
          <section>
            {/* 1. Clientes Listos para Lavar (En Lavado) */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
              <Droplets size={18} color="#007aff" fill="#007aff" />
              <span style={{ fontWeight: '800', fontSize: '14px', letterSpacing: '1px', textTransform: 'uppercase' }}>En Profilaxis</span>
              <span style={{ 
                marginLeft: 'auto', 
                fontSize: '12px', 
                fontWeight: '900', 
                color: 'white', 
                background: 'rgba(0,122,255,0.15)', 
                padding: '4px 12px', 
                borderRadius: '20px',
                border: '1px solid rgba(0,122,255,0.3)'
              }}>{myServices.filter(app => app.status === 'En Lavado').length}</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginBottom: '40px' }}>
              {myServices.filter(app => app.status === 'En Lavado').length === 0 ? (
                <div className="glass-card" style={{ 
                  textAlign: 'center', 
                  padding: '40px', 
                  borderRadius: '24px',
                  border: '2px dashed rgba(0, 122, 255, 0.4)',
                  background: 'radial-gradient(circle at center, rgba(0,122,255,0.08) 0%, transparent 70%)'
                }}>
                  <style>{`
                    @keyframes pulseBlue {
                      0%, 100% { transform: scale(1); filter: drop-shadow(0 0 5px rgba(0,122,255,0.4)); opacity: 0.8; }
                      50% { transform: scale(1.1); filter: drop-shadow(0 0 15px rgba(0,122,255,0.8)); opacity: 1; }
                    }
                  `}</style>
                  <div style={{ display: 'inline-flex', animation: 'pulseBlue 2s infinite' }}>
                    <Droplets size={44} color="#007aff" style={{ marginBottom: '16px' }} />
                  </div>
                  <p style={{ fontSize: '15px', color: '#007aff', fontWeight: '800', letterSpacing: '0.3px', textShadow: '0 0 10px rgba(0,122,255,0.3)' }}>
                    Estación impecable y lista...
                  </p>
                  <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '6px', fontWeight: '600' }}>
                    Esperando al próximo cliente.
                  </p>
                </div>
              ) : (
                myServices.filter(app => app.status === 'En Lavado').map(app => (
                  <div key={app.id} className="glass-card animate-slide-up" style={{ borderRadius: '28px', padding: '24px', border: '1px solid rgba(0, 122, 255, 0.25)', background: 'var(--bg-secondary)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                      <div>
                        <span style={{ fontSize: '10px', fontWeight: '900', color: '#007aff', textTransform: 'uppercase', letterSpacing: '1px' }}>Listo en Profilaxis</span>
                        <h3 style={{ fontSize: '20px', fontWeight: '900', marginTop: '4px' }}>{app.clients?.name}</h3>
                        <div style={{ color: 'var(--text-secondary)', fontSize: '14px', marginTop: '4px' }}>
                                                         Odontólogo: <span style={{ color: 'white', fontWeight: '700' }}>{app.staff?.name || 'Otro'}</span> · Servicio: <span style={{ color: 'var(--gold-primary)', fontWeight: '700' }}>{app.services?.name}</span>
                        </div>
                        {app.services?.included_items && app.services.included_items.length > 0 && (
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '8px' }}>
                            {app.services.included_items.map((item, idx) => (
                              <span key={idx} style={{ fontSize: '10px', fontWeight: '800', color: item.toLowerCase().includes('lavado') ? '#007aff' : 'var(--text-secondary)', background: item.toLowerCase().includes('lavado') ? 'rgba(0,122,255,0.1)' : 'rgba(255,255,255,0.05)', padding: '3px 8px', borderRadius: '20px', border: item.toLowerCase().includes('lavado') ? '1px solid rgba(0,122,255,0.2)' : '1px solid rgba(255,255,255,0.08)' }}>
                                {item.toLowerCase().includes('lavado') ? '💧' : '✦'} {item}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '18px', fontWeight: '900' }}>${app.services?.price}</div>
                      </div>
                    </div>

                    {/* Extras and Products List for Washer */}
                    {(app.appointment_extras?.length > 0 || app.appointment_products?.length > 0) && (
                      <div style={{ marginBottom: '20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {app.appointment_extras.map(ex => (
                          <div key={ex.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.03)', padding: '10px 14px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                            <div style={{ fontSize: '13px', fontWeight: '600' }}>{ex.service_extras?.name}</div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                              {editingExtraPriceId === ex.id ? (
                                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                                  <span style={{ position: 'absolute', left: '6px', fontSize: '10px', color: 'var(--gold-primary)', fontWeight: '800' }}>$</span>
                                  <input 
                                    type="number"
                                    autoFocus
                                    defaultValue={ex.price}
                                    onBlur={(e) => handleUpdateExtraPrice(ex.id, e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleUpdateExtraPrice(ex.id, e.target.value)}
                                    style={{ width: '60px', height: '24px', background: 'var(--bg-secondary)', border: '1px solid var(--gold-primary)', borderRadius: '4px', color: 'white', paddingLeft: '14px', fontSize: '12px', fontWeight: '800', textAlign: 'right' }}
                                  />
                                </div>
                              ) : (
                                <div 
                                  onClick={() => setEditingExtraPriceId(ex.id)}
                                  style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', padding: '2px 4px', borderRadius: '4px' }}
                                >
                                  <span style={{ color: 'var(--gold-primary)', fontWeight: '800' }}>+${ex.price}</span>
                                  <Edit3 size={10} color="var(--gold-primary)" style={{ opacity: 0.6 }} />
                                </div>
                              )}
                              <button 
                                onClick={() => handleDeleteExtra(ex.id)}
                                style={{ background: 'none', border: 'none', color: '#ff453a', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center' }}
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </div>
                        ))}
                        {app.appointment_products.map(pr => (
                          <div key={pr.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.03)', padding: '10px 14px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                            <div style={{ fontSize: '13px', fontWeight: '600' }}>{pr.inventory?.name} <span style={{ color: 'var(--text-muted)', fontSize: '11px' }}>x{pr.quantity}</span></div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                              <span style={{ color: 'var(--gold-primary)', fontWeight: '800' }}>+${pr.price * pr.quantity}</span>
                              <button 
                                onClick={() => handleDeleteProduct(pr.id)}
                                style={{ background: 'none', border: 'none', color: '#ff453a', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center' }}
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Add Extras/Products Buttons for Washer */}
                    <div style={{ display: 'flex', gap: '10px', marginBottom: '24px' }}>
                      <button 
                        onClick={() => { setActiveAppId(app.id); setAddMode('extra'); setShowAddModal(true); }}
                        style={{ flex: 1, padding: '12px', borderRadius: '12px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)', color: 'white', fontSize: '11px', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                      >
                        <Plus size={14} color="var(--gold-primary)" /> Extra
                      </button>
                      <button 
                        onClick={() => { setActiveAppId(app.id); setAddMode('product'); setShowAddModal(true); }}
                        style={{ flex: 1, padding: '12px', borderRadius: '12px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)', color: 'white', fontSize: '11px', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                      >
                        <ShoppingBag size={14} color="var(--gold-primary)" /> Producto
                      </button>
                    </div>

                    <div style={{ display: 'flex', gap: '12px' }}>
                      <button 
                        onClick={() => handleReturnToBarber(app.id)}
                        disabled={loading}
                        className="hover-item"
                        style={{ 
                          flex: 1, 
                          height: '48px', 
                          borderRadius: '14px', 
                          fontSize: '13px', 
                          fontWeight: '800',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '8px',
                          cursor: 'pointer',
                          background: 'rgba(255,255,255,0.05)',
                          border: '1px solid rgba(255,255,255,0.1)',
                          color: 'var(--text-secondary)'
                        }}
                      >
                        <RefreshCw size={16} /> REGRESAR A ODONTÓLOGO
                      </button>
                      <button 
                        onClick={() => handleAssistantSendToCheckout(app.id)}
                        disabled={loading}
                        className="hover-item"
                        style={{ 
                          flex: 1.2, 
                          height: '48px', 
                          borderRadius: '14px', 
                          fontSize: '13px', 
                          fontWeight: '900',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '8px',
                          cursor: 'pointer',
                          background: 'linear-gradient(135deg, #007aff, #00d2ff)',
                          border: 'none',
                          color: 'white',
                          boxShadow: '0 4px 15px rgba(0,122,255,0.3)'
                        }}
                      >
                        <CheckCircle size={16} /> COMPLETAR Y ENVIAR A CAJA
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>
        ) : (
          <section>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
              <Scissors 
                size={18} 
                color="var(--gold-primary)" 
                style={{ filter: 'drop-shadow(0 1px 3px rgba(255, 255, 255, 0.4))' }} 
              />
              <span style={{ fontWeight: '800', fontSize: '14px', letterSpacing: '1px', textTransform: 'uppercase' }}>
                {isMobile ? (activeChairCount > 0 ? 'En atención' : 'Próximas citas') : 'Tu Sillón Hoy'}
              </span>
              {!isMobile && myServices.length > 0 && (
                <span style={{ marginLeft: 'auto', color: 'var(--gold-primary)', fontSize: '10px', fontWeight: '850' }}>
                  {groupedMyServices.length} {groupedMyServices.length === 1 ? 'cita' : 'citas'}
                </span>
              )}
            </div>

            <div className="barber-appointments-stack">
              {myServices.length === 0 ? (
                <div className="glass-card barber-empty-chair" style={{ '--chair-state-color': chairState.color, '--chair-state-glow': chairState.glow, textAlign: 'center', padding: '60px', borderRadius: '24px', border: '2px dashed rgba(255, 255, 255,0.2)', background: 'rgba(255, 255, 255,0.02)' }}>
                  <style>{`
                    @keyframes chair-float-small {
                      0%, 100% { transform: translateY(0px) rotate(0deg); }
                      50% { transform: translateY(-10px) rotate(3deg); }
                    }
                    @keyframes shadow-scale-small {
                      0%, 100% { transform: translateX(-50%) scaleX(1); opacity: 0.7; }
                      50% { transform: translateX(-50%) scaleX(0.8) scaleY(0.9); opacity: 0.3; }
                    }
                  `}</style>
                  <div className="chair-entrance" style={{ position: 'relative', height: '110px', width: '80px', margin: '0 auto 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end' }}>
                    <div style={{ 
                      position: 'absolute', 
                      bottom: '-8px', 
                      left: '50%', 
                      transform: 'translateX(-50%)', 
                      width: '60px', 
                      height: '8px', 
                      background: 'radial-gradient(ellipse at center, rgba(255, 255, 255,0.4) 0%, transparent 70%)',
                      zIndex: 1,
                      animation: 'shadow-scale-small 6s infinite ease-in-out'
                    }} />
                     <img 
                       loading="lazy"
                       src="/barber-chair.png" 
                      alt="Sillón" 
                      style={{ 
                        width: '80px', 
                        height: 'auto',
                        objectFit: 'contain',
                        zIndex: 3,
                        filter: 'drop-shadow(0 5px 15px rgba(0,0,0,0.5)) drop-shadow(0 0 10px rgba(255, 255, 255, 0.4))',
                        animation: 'chair-float-small 6s infinite ease-in-out'
                      }} 
                    />
                  </div>
                  <p style={{ color: 'var(--text-secondary)', fontWeight: '600' }}>Buscando clientes... El sillón está libre.</p>
                  <div className="barber-empty-actions">
                    <button type="button" className="barber-empty-action primary" onClick={() => { loadMyWork(); showToast('Sillón sincronizado'); }}><RefreshCw size={14} /> Buscar clientes</button>
                    <button type="button" className="barber-empty-action" onClick={() => setActiveView('history')}><ReceiptText size={14} /> Ver historial</button>
                  </div>
                </div>
              ) : (
                groupedMyServices.map((group, groupIndex) => {
                  const app = group.apps[0];
                  const includesWashing = group.apps.some(a =>
                    a.services?.included_items?.some(i => i.toLowerCase().includes('lavado')) ||
                    a.appointment_extras?.some(e => e.service_extras?.name?.toLowerCase().includes('lavado'))
                  );
                  const groupKey = String(group.client_id ?? app.id);
                  const isLiveAppointment = app.status === 'En Silla' || app.status === 'En Lavado';
                  const isExpanded = expandedMobileClientId ? expandedMobileClientId === groupKey : isLiveAppointment;
                  return (
                    <React.Fragment key={groupKey}>
                    {isMobile && activeChairCount > 0 && groupIndex === firstUpcomingIndex && (
                      <div className="barber-queue-divider">
                        Próximas citas
                        <small>{groupedMyServices.length - firstUpcomingIndex}</small>
                      </div>
                    )}
                    <div className={`glass-card animate-slide-up barber-appointment-card ${isExpanded ? 'is-expanded' : 'is-collapsed'}`} style={{
                      borderRadius: '28px', 
                      padding: '24px', 
                      background: app.status === 'En Silla' ? 'linear-gradient(135deg, rgba(28,28,30,0.98), rgba(255, 255, 255,0.02))' : 'var(--bg-secondary)',
                      border: app.status === 'En Silla' ? '1px solid rgba(255, 255, 255,0.15)' : '1px solid rgba(255,255,255,0.05)',
                      boxShadow: '0 20px 45px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.05)'
                    }}>
                      <div
                        className="barber-appointment-summary"
                        role={!isLiveAppointment ? 'button' : undefined}
                        tabIndex={!isLiveAppointment ? 0 : undefined}
                        aria-expanded={!isLiveAppointment ? isExpanded : undefined}
                        onClick={(event) => {
                          if (isLiveAppointment || event.target.closest('button')) return;
                          const card = event.currentTarget.parentElement;
                          const willOpen = expandedMobileClientId !== groupKey;
                          setExpandedMobileClientId(willOpen ? groupKey : null);
                          if (willOpen) window.setTimeout(() => card?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 190);
                        }}
                        onKeyDown={(event) => {
                          if (isLiveAppointment || !['Enter', ' '].includes(event.key)) return;
                          event.preventDefault();
                          const card = event.currentTarget.parentElement;
                          const willOpen = expandedMobileClientId !== groupKey;
                          setExpandedMobileClientId(willOpen ? groupKey : null);
                          if (willOpen) window.setTimeout(() => card?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 190);
                        }}
                        style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}
                      >
                        <div>
                          <span style={{ 
                            fontSize: '9px', 
                            fontWeight: '900', 
                            color: app.status === 'En Lavado' ? '#007aff' : 'var(--gold-primary)', 
                            textTransform: 'uppercase', 
                            letterSpacing: '1.5px',
                            background: app.status === 'En Lavado' ? 'rgba(0,122,255,0.12)' : 'rgba(255, 255, 255,0.1)',
                            padding: '4px 10px',
                            borderRadius: '8px',
                            border: app.status === 'En Lavado' ? '1px solid rgba(0,122,255,0.2)' : '1px solid rgba(255, 255, 255,0.15)',
                            whiteSpace: 'nowrap',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px'
                          }}>
                            {app.status === 'En Silla' ? 'En sillón' : app.status === 'En Lavado' ? 'En profilaxis' : app.status} 
                            {app.status === 'En Lavado' ? '💧' : (
                               <img 
                                 loading="lazy"
                                 src="/barber-chair.png" 
                                alt="Sillón" 
                                style={{ 
                                  width: '16px', 
                                  height: '16px', 
                                  objectFit: 'contain',
                                  filter: 'drop-shadow(0 1px 2px rgba(255, 255, 255, 0.6))'
                                }} 
                              />
                            )}
                          </span>
                          <h3 style={{ fontSize: '24px', fontWeight: '900', marginTop: '10px', color: 'white', letterSpacing: '-0.3px' }}>{app.clients?.name}</h3>
                          <div className="barber-service-list" style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '10px' }}>
                            {group.apps.map(svc => (
                              <div key={svc.id} style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '8px',
                                width: 'fit-content',
                                maxWidth: '100%',
                                background: 'rgba(255, 255, 255,0.06)',
                                padding: '4px 8px 4px 12px',
                                borderRadius: '10px',
                                border: '1px solid rgba(255, 255, 255,0.12)'
                              }}>
                                <span style={{ color: svc.services?.name ? 'var(--gold-primary)' : 'var(--text-muted)', fontSize: '13px', fontWeight: '800' }}>
                                  {svc.services?.name || 'Sin servicio — usa "+ Servicio"'}
                                </span>
                                {svc.services?.price ? (
                                  <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '12px', fontWeight: '700' }}>${svc.services.price}</span>
                                ) : null}
                                {group.apps.length > 1 && (
                                  <button
                                    onClick={() => handleRemoveService(svc, group)}
                                    title="Quitar servicio"
                                    style={{ background: 'rgba(255,69,58,0.15)', border: '1px solid rgba(255,69,58,0.35)', color: '#ff453a', borderRadius: '50%', width: '44px', height: '44px', minWidth: '44px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', padding: 0, fontSize: '16px', fontWeight: '900', lineHeight: 1 }}
                                  >
                                    ×
                                  </button>
                                )}
                              </div>
                            ))}
                          </div>
                          
                          {app.services?.included_items && app.services.included_items.length > 0 && (
                            <div className="barber-included-items" style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '14px' }}>
                              {app.services.included_items.map((item, idx) => {
                                const isWashing = item.toLowerCase().includes('lavado');
                                return (
                                  <span 
                                    key={idx} 
                                    style={{ 
                                      fontSize: '10px', 
                                      fontWeight: '800', 
                                      color: isWashing ? '#007aff' : 'rgba(255,255,255,0.6)', 
                                      background: isWashing ? 'rgba(0,122,255,0.08)' : 'rgba(255,255,255,0.03)', 
                                      padding: '4px 10px', 
                                      borderRadius: '12px', 
                                      border: isWashing ? '1px solid rgba(0,122,255,0.2)' : '1px solid rgba(255,255,255,0.05)',
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '4px'
                                    }}
                                  >
                                    <span style={{ color: isWashing ? '#007aff' : 'var(--gold-primary)', fontSize: '8px' }}>
                                      {isWashing ? '💧' : '✦'}
                                    </span>
                                    {item}
                                  </span>
                                );
                              })}
                            </div>
                          )}
                        </div>
                        <div className="barber-appointment-total" style={{ textAlign: 'right' }}>
                          <span className="barber-appointment-time"><Clock size={11} /> {formatAppointmentTime(app)}</span>
                          <div style={{ fontSize: '22px', fontWeight: '900', color: 'white' }}>${group.apps.reduce((acc, a) => acc + Number(a.services?.price || 0), 0)}</div>
                          {!isLiveAppointment && (
                            <span className={`barber-appointment-chevron ${isExpanded ? 'is-open' : ''}`} aria-hidden="true">
                              <ChevronDown size={15} />
                            </span>
                          )}
                        </div>
                      </div>

                      {isExpanded && (
                      <div className="barber-appointment-details">
                      <div className="barber-work-section-heading">
                        <span><Camera size={14} color="var(--gold-primary)" /> Registro del trabajo</span>
                        <small>Antes y después</small>
                      </div>
                      <div className="barber-photo-grid" style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: '12px', marginBottom: '20px' }}>
                        {/* Polaroid Antes */}
                        <div 
                          onClick={() => { setCameraTarget({ appId: app.id, type: 'Antes' }); setShowCamera(true); }}
                          style={{ 
                            height: '120px', 
                            borderRadius: '20px', 
                            backgroundColor: 'var(--bg-secondary)', 
                            border: '1.5px dashed rgba(255, 255, 255,0.25)', 
                            display: 'flex', 
                            flexDirection: 'column', 
                            alignItems: 'center', 
                            justifyContent: 'center', 
                            gap: '8px', 
                            cursor: 'pointer', 
                            overflow: 'hidden', 
                            position: 'relative',
                            boxShadow: 'inset 0 4px 20px rgba(0,0,0,0.5)',
                            transition: 'all 0.3s ease'
                          }}
                        >
                          {app.clients?.work_gallery?.find(p => p.type === 'Antes' && p.service_id === app.id) ? (
                            <>
                               <img loading="lazy" src={app.clients.work_gallery.find(p => p.type === 'Antes' && p.service_id === app.id).url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                              <div style={{ position: 'absolute', top: '8px', left: '8px', background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)', padding: '4px 10px', borderRadius: '8px', fontSize: '9px', fontWeight: '900', color: 'var(--gold-primary)', border: '1px solid rgba(255, 255, 255,0.3)', letterSpacing: '0.5px' }}>ANTES</div>
                              <button 
                                onClick={(e) => { e.stopPropagation(); handleDeletePhoto(app.id, 'Antes'); }}
                                style={{ 
                                  position: 'absolute', 
                                  top: '8px', 
                                  right: '8px', 
                                  background: 'rgba(255, 69, 58, 0.25)', 
                                  backdropFilter: 'blur(8px)', 
                                  border: '1px solid rgba(255, 69, 58, 0.4)', 
                                  color: '#ff453a', 
                                  borderRadius: '50%', 
                                  width: '28px', 
                                  height: '28px', 
                                  display: 'flex', 
                                  alignItems: 'center', 
                                  justifyContent: 'center',
                                  cursor: 'pointer',
                                  boxShadow: '0 4px 10px rgba(0,0,0,0.3)'
                                }}
                              >
                                <Trash2 size={12} strokeWidth={2.5} />
                              </button>
                            </>
                          ) : (
                            <>
                              <div style={{ background: 'rgba(255, 255, 255,0.06)', padding: '10px', borderRadius: '50%', border: '1px solid rgba(255, 255, 255,0.15)' }}>
                                <Camera size={20} color="var(--gold-primary)" />
                              </div>
                              <span style={{ fontSize: '9px', fontWeight: '900', color: 'var(--text-muted)', letterSpacing: '1px' }}>FOTO ANTES</span>
                            </>
                          )}
                        </div>

                        {/* Polaroid Después */}
                        <div 
                          onClick={() => { setCameraTarget({ appId: app.id, type: 'Después' }); setShowCamera(true); }}
                          style={{ 
                            height: '120px', 
                            borderRadius: '20px', 
                            backgroundColor: 'var(--bg-secondary)', 
                            border: '1.5px dashed rgba(255, 255, 255,0.25)', 
                            display: 'flex', 
                            flexDirection: 'column', 
                            alignItems: 'center', 
                            justifyContent: 'center', 
                            gap: '8px', 
                            cursor: 'pointer', 
                            overflow: 'hidden', 
                            position: 'relative',
                            boxShadow: 'inset 0 4px 20px rgba(0,0,0,0.5)',
                            transition: 'all 0.3s ease'
                          }}
                        >
                          {app.clients?.work_gallery?.find(p => p.type === 'Después' && p.service_id === app.id) ? (
                            <>
                               <img loading="lazy" src={app.clients.work_gallery.find(p => p.type === 'Después' && p.service_id === app.id).url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                              <div style={{ position: 'absolute', top: '8px', left: '8px', background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)', padding: '4px 10px', borderRadius: '8px', fontSize: '9px', fontWeight: '900', color: '#32d74b', border: '1px solid rgba(50,215,75,0.3)', letterSpacing: '0.5px' }}>DESPUÉS</div>
                              <button 
                                onClick={(e) => { e.stopPropagation(); handleDeletePhoto(app.id, 'Después'); }}
                                style={{ 
                                  position: 'absolute', 
                                  top: '8px', 
                                  right: '8px', 
                                  background: 'rgba(255, 69, 58, 0.25)', 
                                  backdropFilter: 'blur(8px)', 
                                  border: '1px solid rgba(255, 69, 58, 0.4)', 
                                  color: '#ff453a', 
                                  borderRadius: '50%', 
                                  width: '28px', 
                                  height: '28px', 
                                  display: 'flex', 
                                  alignItems: 'center', 
                                  justifyContent: 'center',
                                  cursor: 'pointer',
                                  boxShadow: '0 4px 10px rgba(0,0,0,0.3)'
                                }}
                              >
                                <Trash2 size={12} strokeWidth={2.5} />
                              </button>
                            </>
                          ) : (
                            <>
                              <div style={{ background: 'rgba(255, 255, 255,0.06)', padding: '10px', borderRadius: '50%', border: '1px solid rgba(255, 255, 255,0.15)' }}>
                                <Camera size={20} color="var(--gold-primary)" />
                              </div>
                              <span style={{ fontSize: '9px', fontWeight: '900', color: 'var(--text-muted)', letterSpacing: '1px' }}>FOTO DESPUÉS</span>
                            </>
                          )}
                        </div>
                      </div>
                      {/* Beverage selection & Notes */}
                      {(app.beverage_selection || app.notes) && (
                        <div className="barber-client-context" style={{ 
                          background: 'rgba(255, 255, 255, 0.03)', 
                          borderRadius: '16px', 
                          padding: '12px 16px', 
                          marginBottom: '16px', 
                          border: '1px solid rgba(255, 255, 255, 0.06)' 
                        }}>
                          {app.beverage_selection && (
                            <div className="barber-client-context-row" style={{ display: 'flex', alignItems: 'center', gap: '9px', marginBottom: 0 }}>
                              <span style={{ display: 'grid', placeItems: 'center', width: '28px', height: '28px', borderRadius: '9px', color: '#54a8ff', background: 'rgba(0,122,255,.1)', flexShrink: 0 }}>
                                {renderBeverageIcon(app.beverage_selection, 15, '')}
                              </span>
                              <div>
                                <span style={{ fontSize: '9px', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', fontWeight: '800', display: 'block', lineHeight: '1.2' }}>Bebida Solicitada</span>
                                <span style={{ fontSize: '12px', color: 'white', fontWeight: '700' }}>{app.beverage_selection}</span>
                              </div>
                            </div>
                          )}
                          {app.notes && (
                            <div className="barber-client-context-row" style={{ display: 'flex', alignItems: 'flex-start', gap: '9px' }}>
                              <span style={{ display: 'grid', placeItems: 'center', width: '28px', height: '28px', borderRadius: '9px', color: 'var(--gold-primary)', background: 'rgba(17, 17, 17,.09)', flexShrink: 0 }}><FileText size={15} /></span>
                              <div>
                                <span style={{ fontSize: '9px', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', fontWeight: '800', display: 'block', lineHeight: '1.2' }}>Notas del Cliente</span>
                                <span style={{ fontSize: '12px', color: 'var(--gold-primary)', fontWeight: '700', wordBreak: 'break-word' }}>"{app.notes}"</span>
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Extras and Products List */}
                      {(app.appointment_extras?.length > 0 || app.appointment_products?.length > 0) && (
                        <div style={{ marginBottom: '20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          {app.appointment_extras.map(ex => (
                            <div key={ex.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.03)', padding: '10px 14px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                              <div style={{ fontSize: '13px', fontWeight: '600' }}>{ex.service_extras?.name}</div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                {editingExtraPriceId === ex.id ? (
                                  <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                                    <span style={{ position: 'absolute', left: '6px', fontSize: '10px', color: 'var(--gold-primary)', fontWeight: '800' }}>$</span>
                                    <input 
                                      type="number"
                                      autoFocus
                                      defaultValue={ex.price}
                                      onBlur={(e) => handleUpdateExtraPrice(ex.id, e.target.value)}
                                      onKeyDown={(e) => e.key === 'Enter' && handleUpdateExtraPrice(ex.id, e.target.value)}
                                      style={{ width: '60px', height: '24px', background: 'var(--bg-secondary)', border: '1px solid var(--gold-primary)', borderRadius: '4px', color: 'white', paddingLeft: '14px', fontSize: '12px', fontWeight: '800', textAlign: 'right' }}
                                    />
                                  </div>
                                ) : (
                                  <div 
                                    onClick={() => setEditingExtraPriceId(ex.id)}
                                    style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', padding: '2px 4px', borderRadius: '4px' }}
                                  >
                                    <span style={{ color: 'var(--gold-primary)', fontWeight: '800' }}>+${ex.price}</span>
                                    <Edit3 size={10} color="var(--gold-primary)" style={{ opacity: 0.6 }} />
                                  </div>
                                )}
                                <button 
                                  onClick={() => handleDeleteExtra(ex.id)}
                                  style={{ background: 'none', border: 'none', color: '#ff453a', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center' }}
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            </div>
                          ))}
                          {app.appointment_products.map(pr => (
                            <div key={pr.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.03)', padding: '10px 14px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                              <div style={{ fontSize: '13px', fontWeight: '600' }}>{pr.inventory?.name} <span style={{ color: 'var(--text-muted)', fontSize: '11px' }}>x{pr.quantity}</span></div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <span style={{ color: 'var(--gold-primary)', fontWeight: '800' }}>+${pr.price * pr.quantity}</span>
                                <button 
                                  onClick={() => handleDeleteProduct(pr.id)}
                                  style={{ background: 'none', border: 'none', color: '#ff453a', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center' }}
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Add Service / Extras / Products */}
                      <div className="barber-work-section-heading add-heading">
                        <span><Plus size={14} color="var(--gold-primary)" /> Añadir a la cita</span>
                        <small>Opcional</small>
                      </div>
                      <div className="barber-add-actions" style={{ display: 'flex', gap: '12px', marginBottom: '24px' }}>
                        <button
                          onClick={() => { setActiveAppId(app.id); setAddMode('service'); setShowAddModal(true); }}
                          style={{
                            flex: 1,
                            padding: '14px',
                            borderRadius: '16px',
                            background: 'rgba(255,255,255,0.02)',
                            border: '1px solid rgba(255, 255, 255,0.15)',
                            color: 'white',
                            fontSize: '12px',
                            fontWeight: '800',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '8px',
                            boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.05)',
                            transition: 'all 0.2s'
                          }}
                        >
                          <Scissors size={15} color="var(--gold-primary)" style={{ filter: 'drop-shadow(0 0 5px rgba(255, 255, 255,0.4))' }} /> Servicio
                        </button>
                        <button
                          onClick={() => { setActiveAppId(app.id); setAddMode('extra'); setShowAddModal(true); }}
                          style={{
                            flex: 1,
                            padding: '14px',
                            borderRadius: '16px',
                            background: 'rgba(255,255,255,0.02)',
                            border: '1px solid rgba(255, 255, 255,0.15)',
                            color: 'white',
                            fontSize: '12px',
                            fontWeight: '800',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '8px',
                            boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.05)',
                            transition: 'all 0.2s'
                          }}
                        >
                          <Plus size={16} color="var(--gold-primary)" style={{ filter: 'drop-shadow(0 0 5px rgba(255, 255, 255,0.4))' }} /> Extra
                        </button>
                        <button 
                          onClick={() => { setActiveAppId(app.id); setAddMode('product'); setShowAddModal(true); }}
                          style={{ 
                            flex: 1, 
                            padding: '14px', 
                            borderRadius: '16px', 
                            background: 'rgba(255,255,255,0.02)', 
                            border: '1px solid rgba(255, 255, 255,0.15)', 
                            color: 'white', 
                            fontSize: '12px', 
                            fontWeight: '800', 
                            cursor: 'pointer', 
                            display: 'flex', 
                            alignItems: 'center', 
                            justifyContent: 'center', 
                            gap: '8px',
                            boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.05)',
                            transition: 'all 0.2s'
                          }}
                        >
                          <ShoppingBag size={15} color="var(--gold-primary)" style={{ filter: 'drop-shadow(0 0 5px rgba(255, 255, 255,0.4))' }} /> Producto
                        </button>
                      </div>

                      <div className="barber-mobile-add-control">
                        <button
                          type="button"
                          className="barber-mobile-add-trigger"
                          onClick={() => setMobileAddMenuAppId(current => current === app.id ? null : app.id)}
                          aria-expanded={mobileAddMenuAppId === app.id}
                        >
                          <Plus size={15} /> Añadir a la cita <ChevronDown size={14} style={{ transform: mobileAddMenuAppId === app.id ? 'rotate(180deg)' : 'none', transition: 'transform 160ms ease' }} />
                        </button>
                        {mobileAddMenuAppId === app.id && (
                          <div className="barber-mobile-add-menu">
                            <button type="button" onClick={() => { setActiveAppId(app.id); setAddMode('service'); setShowAddModal(true); setMobileAddMenuAppId(null); }}><Scissors size={13} /> Servicio</button>
                            <button type="button" onClick={() => { setActiveAppId(app.id); setAddMode('extra'); setShowAddModal(true); setMobileAddMenuAppId(null); }}><Plus size={13} /> Extra</button>
                            <button type="button" onClick={() => { setActiveAppId(app.id); setAddMode('product'); setShowAddModal(true); setMobileAddMenuAppId(null); }}><ShoppingBag size={13} /> Producto</button>
                          </div>
                        )}
                      </div>

                      <div className="barber-service-state-actions">
                      {app.status === 'En Silla' ? (
                        <div style={{ display: 'flex', gap: '12px' }}>
                          <button 
                            onClick={() => handleSendToWashGroup(group)}
                            disabled={loading}
                            className="hover-item"
                            style={{ 
                              flex: 1.2, 
                              height: '56px', 
                              borderRadius: '16px', 
                              fontSize: '13px', 
                              fontWeight: '800',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '6px',
                              padding: '0 10px',
                              cursor: 'pointer',
                              background: includesWashing ? 'linear-gradient(135deg, #007aff, #00d2ff)' : 'rgba(0,122,255,0.15)',
                              border: includesWashing ? 'none' : '1px solid rgba(0,122,255,0.3)',
                              color: includesWashing ? 'white' : '#007aff',
                              boxShadow: includesWashing ? '0 4px 15px rgba(0,122,255,0.3)' : 'none',
                              transition: 'background 0.2s, color 0.2s, box-shadow 0.2s',
                              animation: includesWashing ? 'pulse-blue 2s infinite' : 'none'
                            }}
                          >
                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', justifyContent: 'center', width: 'fit-content', margin: '0 auto' }}>
                              <Droplets size={16} style={{ flexShrink: 0 }} />
                              <span style={{ whiteSpace: 'nowrap', lineHeight: '1.1' }}>ENVIAR A PROFILAXIS</span>
                            </div>
                          </button>
                          <button 
                            onClick={() => handleFinishGroup(group)}
                            disabled={loading}
                            className="btn-gold" 
                            style={{ 
                              flex: 1, 
                              height: '56px', 
                              borderRadius: '16px', 
                              fontSize: '14px', 
                              display: 'flex', 
                              alignItems: 'center', 
                              justifyContent: 'center', 
                              gap: '8px' 
                            }}
                          >
                            <CheckCircle size={18} /> A CAJA
                          </button>
                        </div>
                      ) : app.status === 'En Lavado' ? (
                        <div style={{ display: 'flex', gap: '12px' }}>
                          <button 
                            disabled
                            style={{ flex: 1.5, height: '56px', borderRadius: '16px', backgroundColor: 'rgba(0,122,255,0.1)', color: '#007aff', border: '1px solid rgba(0,122,255,0.2)', fontWeight: '800', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                          >
                            <Droplets size={18} className="animate-pulse" /> EN PROFILAXIS...
                          </button>
                          <button 
                            onClick={() => handlePullFromWashGroup(group)}
                            disabled={loading}
                            className="hover-item"
                            style={{ flex: 1, height: '56px', borderRadius: '16px', backgroundColor: 'rgba(255,255,255,0.05)', color: 'var(--text-secondary)', border: '1px solid rgba(255,255,255,0.15)', fontWeight: '800', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', cursor: 'pointer' }}
                          >
                            <RefreshCw size={16} /> VOLVER A SILLA
                          </button>
                        </div>
                      ) : (
                        <div className="barber-waiting-state">
                          <Clock size={18} color="var(--gold-primary)" />
                          <div>
                            <strong>Esperando al cliente</strong>
                            <span>La cita permanece agendada hasta que recepción la pase al sillón.</span>
                          </div>
                        </div>
                      )}
                      </div>

                      {app.status !== 'Completado' && app.status !== 'Por Pagar' && (
                        <button
                          onClick={() => handleCancelGroup(group)}
                          disabled={loading}
                          style={{ width: '100%', marginTop: '10px', background: 'transparent', border: 'none', color: 'var(--text-muted)', fontSize: '11px', fontWeight: '700', cursor: 'pointer', padding: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                        >
                          <Trash2 size={13} /> Cancelar
                        </button>
                      )}
                      </div>
                      )}
                    </div>
                    </React.Fragment>
                  );
                })
              )}
            </div>
          </section>
        )}
          </div>

        {/* Shared catalogs: exactly the same components used by Recepción and Caja. */}
        <OrderCatalogModal
          isOpen={showAddModal && addMode === 'service'}
          onClose={() => setShowAddModal(false)}
          type="service"
          items={allServices}
          selectedItems={[]}
          onToggle={handleSetService}
          rate={rates?.usd || 0}
        />

        <OrderCatalogModal
          isOpen={showAddModal && addMode === 'extra'}
          onClose={() => setShowAddModal(false)}
          type="extra"
          items={allExtras}
          selectedItems={[]}
          onToggle={handleAddExtra}
          rate={rates?.usd || 0}
        />

        <SellableInventoryModal
          isOpen={showAddModal && addMode === 'product'}
          onClose={() => setShowAddModal(false)}
          items={inventory}
          rates={rates}
          mode="single"
          loading={addingItemId !== null}
          title="Productos y Cortesías"
          subtitle="Selecciona un producto o bebida para agregarlo a la cuenta"
          onSelect={handleAddProduct}
        />

        <AnimatedModal isOpen={showCamera}>
          {(overlayClass, cardClass) => (
            <PandaCamera 
              onCapture={handlePhotoCaptured}
              onClose={() => setShowCamera(false)}
              overlayClass={overlayClass}
              cardClass={cardClass}
            />
          )}
        </AnimatedModal>

        {/* RIGHT COL: Stats y Trabajos del día */}
        <div className="barber-side-column" style={{ marginTop: isMobile ? '14px' : 0 }}>
        <div className="barber-side-heading">
          Resumen de hoy
          <span>Actualizado en tiempo real</span>
        </div>
        <section className="barber-stats-grid" style={{
          display: 'grid', 
          gridTemplateColumns: isMobile ? 'minmax(0, 1fr) minmax(0, 1fr)' : (isAssistant ? 'repeat(3, minmax(0, 1fr))' : 'repeat(4, minmax(0, 1fr))'), 
          gap: '16px' 
        }}>
          <div className="glass-card barber-stat-card" style={{ padding: '20px 16px', borderRadius: '24px', textAlign: 'center' }}>
            <TrendingUp size={24} color={isAssistant ? '#007aff' : "var(--gold-primary)"} style={{ margin: '0 auto 12px' }} />
            <div className="barber-stat-label" style={{ fontSize: '11px', fontWeight: '800', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
              {isAssistant ? "Comisiones Hoy" : "Producción Hoy"}
            </div>
            <div className="barber-stat-value-wrap" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: '8px' }}>
              <div className="barber-stat-value" style={{ fontSize: '26px', fontWeight: '900', color: isAssistant ? '#007aff' : 'var(--gold-primary)', textShadow: isAssistant ? '0 0 15px rgba(0,122,255,0.4)' : '0 0 15px rgba(255, 255, 255,0.4)' }}>${stats.production.toFixed(2)}</div>
              {rates?.usd > 0 && stats.production > 0 && (
                <div className="barber-stat-conversion" style={{ fontSize: '12px', color: isAssistant ? '#007aff' : 'var(--gold-primary)', fontWeight: '800', marginTop: '4px' }}>
                  {Math.round(stats.production * rates.usd).toLocaleString()} BS
                </div>
              )}
            </div>
          </div>

          {!isAssistant && (
            <div className="glass-card animate-scale-in barber-stat-card" style={{ padding: '20px 16px', borderRadius: '24px', textAlign: 'center', border: '1px solid rgba(50, 215, 75, 0.2)', background: 'var(--bg-secondary)' }}>
              <Award size={24} color="#32d74b" style={{ margin: '0 auto 12px' }} />
              <div className="barber-stat-label" style={{ fontSize: '11px', fontWeight: '800', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
                Ganancia Hoy
              </div>
              <div className="barber-stat-value-wrap" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: '8px' }}>
                <div className="barber-stat-value" style={{ fontSize: '26px', fontWeight: '900', color: '#32d74b', textShadow: '0 0 15px rgba(50,215,75,0.4)' }}>${stats.earnings.toFixed(2)}</div>
                {rates?.usd > 0 && stats.earnings > 0 && (
                  <div className="barber-stat-conversion" style={{ fontSize: '12px', color: '#32d74b', fontWeight: '800', marginTop: '4px' }}>
                    {Math.round(stats.earnings * rates.usd).toLocaleString()} BS
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="glass-card barber-stat-card" style={{ padding: '20px 16px', borderRadius: '24px', textAlign: 'center' }}>
            {isAssistant ? (
              <Droplets size={24} color="#007aff" style={{ margin: '0 auto 12px' }} />
            ) : (
              <Scissors size={24} color="var(--gold-primary)" style={{ margin: '0 auto 12px' }} />
            )}
            <div className="barber-stat-label" style={{ fontSize: '11px', fontWeight: '800', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
              {isAssistant ? "Limpiezas" : "Servicios"}
            </div>
            <div className="barber-stat-value barber-stat-value-wrap" style={{ fontSize: '26px', fontWeight: '900', marginTop: '8px', color: 'white' }}>{stats.services}</div>
          </div>

          <div className="glass-card animate-scale-in barber-stat-card" style={{ padding: '20px 16px', borderRadius: '24px', textAlign: 'center', border: '1px solid rgba(255, 159, 10, 0.2)', background: 'var(--bg-secondary)' }}>
            <Coins size={24} color="#ff9f0a" style={{ margin: '0 auto 12px', filter: 'drop-shadow(0 0 5px rgba(255, 159, 10, 0.4))' }} />
            <div className="barber-stat-label" style={{ fontSize: '11px', fontWeight: '800', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
              Propinas Hoy
            </div>
            <div className="barber-stat-value-wrap" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: '8px' }}>
              <div className="barber-stat-value" style={{ fontSize: '26px', fontWeight: '900', color: '#ff9f0a', textShadow: '0 0 15px rgba(255, 159, 10, 0.4)' }}>${stats.tips.toFixed(2)}</div>
              {rates?.usd > 0 && stats.tips > 0 && (
                <div className="barber-stat-conversion" style={{ fontSize: '12px', color: '#ff9f0a', fontWeight: '800', marginTop: '4px' }}>
                  {Math.round(stats.tips * rates.usd).toLocaleString()} BS
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Completed Today Section */}
        <section className="barber-completed-section" style={{ marginTop: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
            <CheckCircle size={18} color={isAssistant ? "#007aff" : "#32d74b"} />
            <span style={{ fontWeight: '800', fontSize: '14px', letterSpacing: '1px', textTransform: 'uppercase' }}>
              {isAssistant ? "Limpiezas Completadas Hoy" : "Trabajos Completados Hoy"}
            </span>
            <span style={{ 
              marginLeft: 'auto', 
              fontSize: '12px', 
              fontWeight: '900', 
              color: isAssistant ? '#007aff' : 'var(--gold-primary)', 
              background: isAssistant ? 'rgba(0,122,255,0.1)' : 'rgba(255, 255, 255,0.1)', 
              padding: '4px 12px', 
              borderRadius: '20px',
              border: isAssistant ? '1px solid rgba(0,122,255,0.2)' : '1px solid rgba(255, 255, 255,0.2)'
            }}>{completedToday.length}</span>
          </div>

          {completedToday.length === 0 ? (
            <div className="glass-card" style={{ textAlign: 'center', padding: '40px', borderRadius: '20px', opacity: 0.4 }}>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                {isAssistant ? "Aún no has realizado limpiezas hoy." : "Aún no has completado servicios hoy."}
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {(() => {
                const totalItems = completedToday;
                const visibleItems = totalItems.slice(0, visibleCompletedCount);
                
                return (
                  <>
                    {visibleItems.map(app => {
                const extrasTotal = app.appointment_extras?.reduce((sum, e) => sum + (Number(e.price) || 0), 0) || 0;
                // Los productos son 100% de la clínica: no cuentan en la producción del odontólogo.
                const totalUsd = (Number(app.services?.price) || 0) + extrasTotal;
                const completedTime = app.completed_at ? new Date(app.completed_at).toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit', hour12: true }) : '';
                const startedTime = app.started_at ? new Date(app.started_at).toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit', hour12: true }) : '';
                let durationMin = 0;
                if (app.started_at && app.completed_at) {
                  durationMin = Math.round((new Date(app.completed_at) - new Date(app.started_at)) / 60000);
                }

                // If assistant, show commission earned instead of total usd
                const myRecord = app.appointment_staff?.find(as => String(as.staff_id) === String(selectedBarber.id));
                const assistantWashShare = (Number(selectedBarber.washing_rate || 0) || 1) * 0.60;
                const displayVal = isAssistant && myRecord ? assistantWashShare : isAssistant ? 0 : totalUsd;

                return (
                  <div key={app.id} className="glass-card" onClick={() => setSelectedCompletedApp(app)} style={{ 
                    padding: '16px 20px', 
                    borderRadius: '20px',
                    border: isAssistant ? '1px solid rgba(0, 122, 255, 0.15)' : '1px solid rgba(50, 215, 75, 0.15)',
                    background: isAssistant ? 'linear-gradient(135deg, rgba(0,122,255,0.05), rgba(0,0,0,0.4))' : 'linear-gradient(135deg, rgba(50,215,75,0.05), rgba(0,0,0,0.4))',
                    cursor: 'pointer',
                    transition: 'transform 0.3s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.3s cubic-bezier(0.16, 1, 0.3, 1), border-color 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-3px)';
                    e.currentTarget.style.boxShadow = isAssistant ? '0 8px 25px rgba(0,122,255,0.15)' : '0 8px 25px rgba(50,215,75,0.15)';
                    e.currentTarget.style.borderColor = isAssistant ? 'rgba(0,122,255,0.4)' : 'rgba(50,215,75,0.4)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'none';
                    e.currentTarget.style.boxShadow = 'none';
                    e.currentTarget.style.borderColor = isAssistant ? 'rgba(0, 122, 255, 0.15)' : 'rgba(50, 215, 75, 0.15)';
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ 
                          width: '40px', height: '40px', borderRadius: '12px', 
                          background: isAssistant ? 'linear-gradient(135deg, rgba(0,122,255,0.2), rgba(0,122,255,0.05))' : 'linear-gradient(135deg, rgba(50,215,75,0.2), rgba(50,215,75,0.05))', 
                          border: isAssistant ? '1px solid rgba(0,122,255,0.3)' : '1px solid rgba(50,215,75,0.3)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          boxShadow: isAssistant ? 'inset 0 0 10px rgba(0,122,255,0.2)' : 'inset 0 0 10px rgba(50,215,75,0.2)'
                        }}>
                          {isAssistant ? <Droplets size={20} color="#007aff" style={{ filter: 'drop-shadow(0 0 5px rgba(0,122,255,0.5))' }} /> : <Scissors size={20} color="#32d74b" style={{ filter: 'drop-shadow(0 0 5px rgba(50,215,75,0.5))' }} />}
                        </div>
                        <div>
                          <div style={{ fontWeight: '900', fontSize: '16px', color: 'white', letterSpacing: '0.3px' }}>{app.clients?.name || 'Cliente'}</div>
                          <div style={{ fontSize: '13px', color: 'var(--gold-primary)', fontWeight: '800' }}>
                            {isAssistant ? `${app.services?.name} (${app.staff?.name || 'Odontólogo'})` : app.services?.name}
                          </div>
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '18px', fontWeight: '900', color: isAssistant ? '#007aff' : '#32d74b', textShadow: isAssistant ? '0 0 10px rgba(0,122,255,0.4)' : '0 0 10px rgba(50,215,75,0.4)' }}>
                          ${displayVal.toFixed(2)} {isAssistant && <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>(Comisión)</span>}
                        </div>
                        {rates?.usd > 0 && (
                          <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '800' }}>{(displayVal * rates.usd).toLocaleString('es-VE', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} Bs.</div>
                        )}
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginTop: '12px', paddingTop: '12px', borderTop: '1px dashed rgba(255, 255, 255,0.25)' }}>
                      {startedTime && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', width: '100%' }}>
                          <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: '800' }}>⏱ {startedTime} → {completedTime}</span>
                          <span style={{ marginLeft: 'auto', fontSize: '11px', fontWeight: '900', color: isAssistant ? '#007aff' : 'var(--gold-primary)', background: isAssistant ? 'rgba(0,122,255,0.1)' : 'rgba(255, 255, 255,0.1)', padding: '4px 10px', borderRadius: '12px', border: isAssistant ? '1px solid rgba(0,122,255,0.2)' : '1px solid rgba(255, 255, 255,0.2)' }}>
                            {durationMin > 0 ? `${durationMin} min` : 'Completado'}
                          </span>
                        </div>
                      )}
                      {!isAssistant && (app.appointment_extras?.length > 0 || app.appointment_products?.length > 0) && (
                        <span style={{ fontSize: '11px', color: 'var(--gold-primary)', fontWeight: '700', marginLeft: 'auto' }}>
                          +{(app.appointment_extras?.length || 0) + (app.appointment_products?.length || 0)} items
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
              {completedToday.length > visibleCompletedCount && (
                <button 
                  onClick={() => setVisibleCompletedCount(prev => prev + 5)}
                  style={{
                    background: isAssistant ? 'rgba(0,122,255,0.05)' : 'rgba(50,215,75,0.05)',
                    border: isAssistant ? '1px solid rgba(0,122,255,0.15)' : '1px solid rgba(50,215,75,0.15)',
                    color: isAssistant ? '#007aff' : '#32d74b',
                    padding: '12px',
                    borderRadius: '16px',
                    fontWeight: '800',
                    fontSize: '14px',
                    cursor: 'pointer',
                    marginTop: '10px',
                    transition: 'background 0.2s, box-shadow 0.2s, transform 0.2s',
                    boxShadow: 'none'
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.background = isAssistant ? 'rgba(0,122,255,0.15)' : 'rgba(50,215,75,0.15)';
                    e.target.style.border = isAssistant ? '1px solid rgba(0,122,255,0.4)' : '1px solid rgba(50,215,75,0.4)';
                    e.target.style.boxShadow = isAssistant ? '0 0 15px rgba(0,122,255,0.2)' : '0 0 15px rgba(50,215,75,0.2)';
                    e.target.style.transform = 'translateY(-2px)';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.background = isAssistant ? 'rgba(0,122,255,0.05)' : 'rgba(50,215,75,0.05)';
                    e.target.style.border = isAssistant ? '1px solid rgba(0,122,255,0.15)' : '1px solid rgba(50,215,75,0.15)';
                    e.target.style.boxShadow = 'none';
                    e.target.style.transform = 'translateY(0)';
                  }}
                >
                  Ver más antiguos ({completedToday.length - visibleCompletedCount})
                </button>
              )}
              </>
              );
              })()}
            </div>
          )}
        </section>
        </div>

      </div>
      ) : (
        <StaffTransactionHistory staffMember={selectedBarber} rates={rates} isMobile={isMobile} />
      )}

      {/* Detail Modal for Completed Service */}
      <AnimatedModal isOpen={!!selectedCompletedApp}>
        {(overlayClass, cardClass) => {
          const app = selectedCompletedApp;
          if (!app) return null;
          const extrasTotal = app.appointment_extras?.reduce((sum, e) => sum + (Number(e.price) || 0), 0) || 0;
          const productsTotal = app.appointment_products?.reduce((sum, p) => sum + ((Number(p.price) || 0) * (p.quantity || 1)), 0) || 0;
          const servicePrice = Number(app.services?.price) || 0;
          const totalUsd = servicePrice + extrasTotal + productsTotal;
          const totalBs = totalUsd * (rates?.usd || 550);
          const completedTime = app.completed_at ? new Date(app.completed_at).toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit', hour12: true }) : '—';
          const startedTime = app.started_at ? new Date(app.started_at).toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit', hour12: true }) : '—';
          let durationMin = 0;
          if (app.started_at && app.completed_at) {
            durationMin = Math.round((new Date(app.completed_at) - new Date(app.started_at)) / 60000);
          }
          const beforePhoto = app.clients?.work_gallery?.find(p => p.type === 'Antes' && p.service_id === app.id);
          const afterPhoto = app.clients?.work_gallery?.find(p => p.type === 'Después' && p.service_id === app.id);

          return (
            <div 
              className={overlayClass}
              onClick={() => setSelectedCompletedApp(null)}
              style={{ 
                position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, 
                backgroundColor: 'rgba(0,0,0,0.85)', 
                backdropFilter: 'blur(12px)', 
                zIndex: 99999, 
                display: 'flex', 
                justifyContent: 'center', 
                alignItems: 'center',
                padding: '20px',
                paddingTop: 'max(20px, env(safe-area-inset-top, 20px))'
              }}
            >
              <div 
                onClick={(e) => e.stopPropagation()}
                className={cardClass.replace('global-modal-card', '')}
                style={{ 
                  maxWidth: 'min(540px, 90vw)', 
                  width: '100%', 
                  maxHeight: '90vh',
                  overflowY: 'auto',
                  borderRadius: '24px', 
                  background: 'var(--bg-secondary)', 
                  border: isAssistant ? '1px solid rgba(0,122,255,0.15)' : '1px solid rgba(255,255,255,0.08)',
                  boxShadow: '0 30px 60px -12px rgba(0,0,0,0.5)'
                }}
              >
              {/* Header */}
              <div style={{ 
                padding: '24px 24px 20px', 
                borderBottom: '1px solid rgba(255,255,255,0.06)',
                background: isAssistant ? 'linear-gradient(135deg, rgba(0,122,255,0.08), transparent)' : 'linear-gradient(135deg, rgba(50,215,75,0.08), transparent)'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                      {isAssistant ? <Droplets size={16} color="#007aff" /> : <CheckCircle size={16} color="#32d74b" />}
                      <span style={{ fontSize: '10px', fontWeight: '900', color: isAssistant ? '#007aff' : '#32d74b', letterSpacing: '1.5px', textTransform: 'uppercase' }}>
                        {isAssistant ? "PROFILAXIS COMPLETADA" : "SERVICIO COMPLETADO"}
                      </span>
                    </div>
                    <h3 style={{ fontSize: '22px', fontWeight: '900', color: 'white', margin: 0 }}>{app.clients?.name || 'Cliente'}</h3>
                    <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px' }}>
                      {app.clients?.phone || ''}{app.clients?.id_card ? ` · C.I. ${app.clients.id_card}` : ''}
                    </p>
                  </div>
                  <button 
                    onClick={() => setSelectedCompletedApp(null)}
                    style={{ background: 'rgba(255,255,255,0.08)', border: 'none', color: 'white', width: '36px', height: '36px', borderRadius: '10px', cursor: 'pointer', fontSize: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  >
                    ✕
                  </button>
                </div>
              </div>

              {/* Content */}
              <div style={{ padding: '20px 24px' }}>

                {/* Service Info */}
                <div style={{ marginBottom: '20px' }}>
                  <div style={{ fontSize: '10px', fontWeight: '900', color: 'var(--gold-primary)', letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: '12px' }}>SERVICIO REALIZADO</div>
                  <div style={{ background: 'rgba(255, 255, 255,0.06)', border: '1px solid rgba(255, 255, 255,0.12)', borderRadius: '16px', padding: '16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div style={{ fontSize: '16px', fontWeight: '800', color: 'white' }}>{app.services?.name}</div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                          Odontólogo: {app.staff?.name || 'Otro'}
                        </div>
                        {app.services?.included_items && app.services.included_items.length > 0 && (
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '6px' }}>
                            {app.services.included_items.map((item, idx) => (
                              <span key={idx} style={{ fontSize: '9px', fontWeight: '800', color: item.toLowerCase().includes('lavado') ? '#007aff' : 'var(--text-muted)', background: item.toLowerCase().includes('lavado') ? 'rgba(0,122,255,0.1)' : 'rgba(255,255,255,0.04)', padding: '2px 6px', borderRadius: '12px', border: item.toLowerCase().includes('lavado') ? '1px solid rgba(0,122,255,0.15)' : '1px solid rgba(255,255,255,0.06)' }}>
                                {item.toLowerCase().includes('lavado') ? '💧' : '✦'} {item}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      <span style={{ fontSize: '18px', fontWeight: '900', color: 'var(--gold-primary)' }}>${servicePrice.toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                {/* Extras */}
                {app.appointment_extras?.length > 0 && (
                  <div style={{ marginBottom: '20px' }}>
                    <div style={{ fontSize: '10px', fontWeight: '900', color: 'var(--text-secondary)', letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: '10px' }}>EXTRAS AGREGADOS</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {app.appointment_extras.map(ex => (
                        <div key={ex.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.03)', padding: '12px 16px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                          <span style={{ fontSize: '13px', fontWeight: '700', color: 'white' }}>{ex.service_extras?.name}</span>
                          <span style={{ fontSize: '13px', fontWeight: '800', color: 'var(--gold-primary)' }}>+${Number(ex.price).toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Products */}
                {app.appointment_products?.length > 0 && (
                  <div style={{ marginBottom: '20px' }}>
                    <div style={{ fontSize: '10px', fontWeight: '900', color: 'var(--text-secondary)', letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: '10px' }}>PRODUCTOS VENDIDOS</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {app.appointment_products.map(pr => (
                        <div key={pr.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.03)', padding: '12px 16px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                          <div>
                            <span style={{ fontSize: '13px', fontWeight: '700', color: 'white' }}>{pr.inventory?.name}</span>
                            <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginLeft: '8px' }}>x{pr.quantity}</span>
                          </div>
                          <span style={{ fontSize: '13px', fontWeight: '800', color: 'var(--gold-primary)' }}>+${(Number(pr.price) * (pr.quantity || 1)).toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Photos Before/After */}
                {(beforePhoto || afterPhoto) && (
                  <div style={{ marginBottom: '20px' }}>
                    <div style={{ fontSize: '10px', fontWeight: '900', color: 'var(--text-secondary)', letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: '10px' }}>GALERÍA</div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: '12px' }}>
                      {beforePhoto && (
                        <div style={{ borderRadius: '14px', overflow: 'hidden', position: 'relative', aspectRatio: '1' }}>
                           <img loading="lazy" src={beforePhoto.url} alt="Antes" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          <div style={{ position: 'absolute', bottom: '8px', left: '8px', background: 'rgba(0,0,0,0.7)', padding: '4px 10px', borderRadius: '8px', fontSize: '10px', fontWeight: '800', color: 'white' }}>ANTES</div>
                        </div>
                      )}
                      {afterPhoto && (
                        <div style={{ borderRadius: '14px', overflow: 'hidden', position: 'relative', aspectRatio: '1' }}>
                           <img loading="lazy" src={afterPhoto.url} alt="Después" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          <div style={{ position: 'absolute', bottom: '8px', left: '8px', background: 'rgba(0,0,0,0.7)', padding: '4px 10px', borderRadius: '8px', fontSize: '10px', fontWeight: '800', color: '#32d74b' }}>DESPUÉS</div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Timing */}
                <div style={{ marginBottom: '20px' }}>
                  <div style={{ fontSize: '10px', fontWeight: '900', color: 'var(--text-secondary)', letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: '10px' }}>TIEMPOS</div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr) minmax(0, 1fr)', gap: '10px' }}>
                    <div style={{ background: 'rgba(255,255,255,0.03)', padding: '12px', borderRadius: '12px', textAlign: 'center' }}>
                      <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: '700', marginBottom: '4px' }}>INICIO</div>
                      <div style={{ fontSize: '14px', fontWeight: '800', color: 'white' }}>{startedTime}</div>
                    </div>
                    <div style={{ background: 'rgba(255,255,255,0.03)', padding: '12px', borderRadius: '12px', textAlign: 'center' }}>
                      <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: '700', marginBottom: '4px' }}>FIN</div>
                      <div style={{ fontSize: '14px', fontWeight: '800', color: 'white' }}>{completedTime}</div>
                    </div>
                    <div style={{ background: 'rgba(255, 255, 255,0.06)', padding: '12px', borderRadius: '12px', textAlign: 'center', border: '1px solid rgba(255, 255, 255,0.12)' }}>
                      <div style={{ fontSize: '10px', color: 'var(--gold-primary)', fontWeight: '700', marginBottom: '4px' }}>DURACIÓN</div>
                      <div style={{ fontSize: '14px', fontWeight: '900', color: 'var(--gold-primary)' }}>{durationMin > 0 ? `${durationMin} min` : '—'}</div>
                    </div>
                  </div>
                </div>

                {/* Total */}
                <div style={{ 
                  background: isAssistant ? 'linear-gradient(135deg, rgba(0,122,255,0.08), rgba(0,122,255,0.02))' : 'linear-gradient(135deg, rgba(50,215,75,0.08), rgba(50,215,75,0.02))', 
                  border: isAssistant ? '1px solid rgba(0,122,255,0.15)' : '1px solid rgba(50,215,75,0.15)', 
                  borderRadius: '16px', 
                  padding: '20px',
                  marginBottom: '8px'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: '700' }}>Servicio base</span>
                    <span style={{ fontSize: '13px', fontWeight: '800', color: 'white' }}>${servicePrice.toFixed(2)}</span>
                  </div>
                  {extrasTotal > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: '700' }}>Extras ({app.appointment_extras.length})</span>
                      <span style={{ fontSize: '13px', fontWeight: '800', color: 'white' }}>+${extrasTotal.toFixed(2)}</span>
                    </div>
                  )}
                  {productsTotal > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: '700' }}>Productos ({app.appointment_products.length})</span>
                      <span style={{ fontSize: '13px', fontWeight: '800', color: 'white' }}>+${productsTotal.toFixed(2)}</span>
                    </div>
                  )}
                  <div style={{ borderTop: isAssistant ? '1px solid rgba(0,122,255,0.15)' : '1px solid rgba(50,215,75,0.15)', paddingTop: '12px', marginTop: '4px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '14px', fontWeight: '900', color: isAssistant ? '#007aff' : '#32d74b' }}>TOTAL</span>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '22px', fontWeight: '950', color: isAssistant ? '#007aff' : '#32d74b' }}>${totalUsd.toFixed(2)}</div>
                      <div style={{ fontSize: '12px', fontWeight: '800', color: 'var(--text-muted)' }}>{totalBs.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Bs.</div>
                    </div>
                  </div>
                </div>

              </div>
            </div>
            </div>
          );
        }}
      </AnimatedModal>

      {/* Modal Enviar a Profilaxis con Cola de Asistentes */}
      <AnimatedModal isOpen={showWashModal}>
        {(overlayClass, cardClass) => (
          <div
            className={overlayClass.replace('global-modal-overlay', '')}
            onClick={() => setShowWashModal(false)}
            style={{ 
              position: 'fixed', 
              top: 0, 
              left: 0, 
              right: 0, 
              bottom: 0, 
              backgroundColor: 'rgba(0,0,0,0.85)', 
              backdropFilter: 'blur(10px)', 
              zIndex: 99999, 
              display: 'flex', 
              justifyContent: 'center',
              alignItems: 'center',
              padding: '20px',
              paddingTop: 'max(20px, env(safe-area-inset-top, 20px))'
            }}
          >
            <div
              className={`glass-card ${cardClass.replace('global-modal-card', '')}`}
              onClick={(e) => e.stopPropagation()}
              style={{ 
                padding: '20px', 
                color: 'white', 
                width: '100%', 
                maxWidth: '360px', 
                borderRadius: '24px', 
                maxHeight: '90vh', 
                overflowY: 'auto',
                boxSizing: 'border-box',
                border: '1.5px solid rgba(255, 255, 255, 0.25)'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h3 style={{ fontSize: '16px', fontWeight: '900', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Droplets size={18} color="#64d2ff" /> Enviar a profilaxis
                </h3>
                <button 
                  onClick={() => setShowWashModal(false)} 
                  style={{ background: 'none', border: 'none', color: 'white', fontSize: '20px', cursor: 'pointer', padding: '4px' }}
                >
                  &times;
                </button>
              </div>

              <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '16px', lineHeight: '1.4' }}>
                Selecciona el asistente dental:
              </p>

              {loadingAssistantQueue ? (
                <SkeletonList rows={3} rowHeight={44} />
              ) : assistantQueue.length === 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div style={{ padding: '20px', textAlign: 'center', color: 'rgba(255,255,255,0.4)', fontSize: '13px', border: '1px dashed rgba(255,255,255,0.1)', borderRadius: '16px' }}>
                    No hay asistentes dentales activos/disponibles hoy.
                  </div>
                  <button
                    onClick={() => confirmSendToWash(null)}
                    style={{
                      height: '48px',
                      borderRadius: '14px',
                      background: 'linear-gradient(135deg, #007aff, #00d2ff)',
                      color: 'white',
                      border: 'none',
                      fontSize: '13px',
                      fontWeight: '900',
                      cursor: 'pointer'
                    }}
                  >
                    Enviar a profilaxis sin Asignar
                  </button>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '280px', overflowY: 'auto', paddingRight: '4px' }}>
                  {assistantQueue.map((q, idx) => {
                    const isActuallyBusy = q.status === 'BUSY';
                    return (
                      <div 
                        key={q.id}
                        className="selection-modal-item"
                        style={{
                          padding: '10px 14px',
                          borderRadius: '16px',
                          border: '1px solid rgba(255,255,255,0.05)',
                          background: 'rgba(255,255,255,0.02)',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '12px',
                          width: '100%',
                          transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)'
                        }}
                      >
                        <div style={{ 
                          width: '36px', 
                          height: '36px', 
                          borderRadius: '10px', 
                          background: 'rgba(255,255,255,0.04)', 
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'center', 
                          flexShrink: 0,
                          fontWeight: '900',
                          color: 'var(--gold-primary)',
                          fontSize: '13px',
                          border: '1px solid rgba(255,255,255,0.1)'
                        }}>
                          #{idx + 1}
                        </div>
                        
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: '13px', fontWeight: '750', color: 'white', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{q.staff?.name}</div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginTop: '2px' }}>
                            <span style={{ display: 'inline-block', width: '5px', height: '5px', borderRadius: '50%', backgroundColor: !isActuallyBusy ? '#32d74b' : '#ff9500' }}></span>
                            <span style={{ fontSize: '10px', color: !isActuallyBusy ? '#32d74b' : '#ff9500', fontWeight: '700' }}>
                              {!isActuallyBusy ? 'Disponible' : 'Atendiendo'}
                            </span>
                          </div>
                        </div>

                        <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                          <button
                            onClick={() => skipAssistantTurn(q.staff_id)}
                            style={{
                              padding: '6px 10px',
                              borderRadius: '8px',
                              background: 'rgba(255, 69, 58, 0.1)',
                              border: '1px solid rgba(255, 69, 58, 0.15)',
                              color: '#ff453a',
                              fontSize: '10px',
                              fontWeight: '850',
                              cursor: 'pointer',
                              transition: 'all 0.2s'
                            }}
                          >
                            Saltar
                          </button>
                          <button
                            onClick={() => confirmSendToWash(q.staff_id)}
                            style={{
                              padding: '6px 12px',
                              borderRadius: '8px',
                              background: 'var(--gold-primary)',
                              border: 'none',
                              color: 'black',
                              fontSize: '10px',
                              fontWeight: '900',
                              cursor: 'pointer',
                              boxShadow: '0 3px 8px rgba(17, 17, 17, 0.2)',
                              transition: 'all 0.2s'
                            }}
                          >
                            Asignar
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </AnimatedModal>


      <style>{`
        .hover-item:hover {
          border-color: var(--gold-primary) !important;
          transform: translateY(-5px);
          box-shadow: 0 10px 30px rgba(0,0,0,0.5);
        }
        .selection-modal-item {
          transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1) !important;
        }
        .selection-modal-item:hover {
          transform: translateY(-2px) scale(1.008);
          background: rgba(255, 255, 255, 0.04) !important;
          border-color: rgba(255, 255, 255, 0.3) !important;
          box-shadow: 0 6px 20px rgba(0, 0, 0, 0.3);
        }
        @keyframes pulse-blue {
          0% {
            box-shadow: 0 0 0 0 rgba(0, 122, 255, 0.4);
            transform: scale(1);
          }
          70% {
            box-shadow: 0 0 0 10px rgba(0, 122, 255, 0);
            transform: scale(1.02);
          }
          100% {
            box-shadow: 0 0 0 0 rgba(0, 122, 255, 0);
            transform: scale(1);
          }
        }
      `}</style>
    </div>
  );
};

export default BarberPanel;
