import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { 
  Users, 
  Search, 
  UserPlus, 
  Scissors, 
  Calendar, 
  Zap,
  CheckCircle2,
  Clock,
  ArrowRight,
  ShoppingBag,
  Rocket,
  X,
  Edit3,
  Receipt,
  Trash2,
  AlertTriangle,
  Sparkles,
  Check
} from 'lucide-react';
import { dataService } from '../services/dataService';
import { useNotifs } from '../context/NotificationContext';
import PandaSelect from './PandaSelect';
import PandaDatePicker from './PandaDatePicker';
import { normalizeForSearch } from '../utils/stringUtils';
import NewClientModal from './NewClientModal';
import ScheduleModal from './ScheduleModal';
import PandaDialog from './PandaDialog';
import { useAuth } from '../context/AuthContext';
import { useScrollLock } from '../hooks/useScrollLock';
import { filterSellableInventory, getInventorySalesLabel, INVENTORY_SALES_GROUPS, matchesInventorySalesGroup } from '../utils/inventorySales';
import { getStaffSearchText, isOperationalReceptionStaff } from '../utils/staffRoles';
import { supabase } from '../lib/supabase';
import OrderCatalogModal from './OrderCatalogModal';
import SellableInventoryModal from './SellableInventoryModal';

const getReceptionRoleGroup = (member) => {
  if (!isOperationalReceptionStaff(member)) return null;
  const role = getStaffSearchText(member);
  if (role.includes('asistente') || role.includes('lavado') || role.includes('barista') || role.includes('cafeter')) return 'assistants';
  if (role.includes('tatu')) return 'tattoo';
  if (role.includes('odontolog') || role.includes('barber') || role.includes('barbero') || role.includes('estilista') || role.includes('socio') || role.includes('lider')) return 'barbers';
  return null;
};

const ReceptionModule = ({ isMobile, rates }) => {
  const { showToast, triggerConfetti, triggerRocket } = useNotifs();
  const [clients, setClients] = useState([]);
  const [services, setServices] = useState([]);
  const [staff, setStaff] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClient, setSelectedClient] = useState(null);
  const [loading, setLoading] = useState(false);
  const [selectedServices, setSelectedServices] = useState([]);
  const [allExtras, setAllExtras] = useState([]);
  const [selectedExtras, setSelectedExtras] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [idSearch, setIdSearch] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  
  // Modals
  const [isNewClientModalOpen, setIsNewClientModalOpen] = useState(false);
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [isServiceModalOpen, setIsServiceModalOpen] = useState(false);
  const [isExtraModalOpen, setIsExtraModalOpen] = useState(false);
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  
  const [activeAppointments, setActiveAppointments] = useState([]);
  const [upcomingAppointments, setUpcomingAppointments] = useState([]);
  const [exchangeRate, setExchangeRate] = useState(58); // Default
  const [dialog, setDialog] = useState({ isOpen: false, type: 'confirm', title: '', message: '', onConfirm: null });
  
  const [formData, setFormData] = useState({
    serviceId: '',
    staffId: '',
    status: 'En Silla' // Default flow: receive and sit
  });

  const [recommendationInfo, setRecommendationInfo] = useState(null);
  const selectedClientRef = useRef(selectedClient);

  useEffect(() => {
    selectedClientRef.current = selectedClient;
  }, [selectedClient]);

  useEffect(() => {
    if (rates?.usd || rates?.euro) {
      setExchangeRate(rates.usd || rates.euro);
    }
  }, [rates]);

  const selectRecommendedBarber = (client, currentStaffList, activeAppts, shouldPreselect = true) => {
    if (!client) {
      setRecommendationInfo(null);
      return;
    }

    const freqBarberId = client.frequent_barber_id;
    const freqStaff = currentStaffList.find(s => s.id === freqBarberId);

    if (freqStaff) {
      const isBusy = activeAppts.some(a => a.staff_id === freqBarberId);
      setRecommendationInfo({
        type: 'frequent',
        staffId: freqBarberId,
        name: freqStaff.name,
        isBusy
      });
      if (shouldPreselect) {
        setFormData(prev => ({ ...prev, staffId: freqBarberId }));
      }
    } else {
      // Fallback to FIFO: first available (non-busy) barber in the queue
      const firstAvailable = currentStaffList.find(s => !activeAppts.some(a => a.staff_id === s.id));
      if (firstAvailable) {
        setRecommendationInfo({
          type: 'fifo',
          staffId: firstAvailable.id,
          name: firstAvailable.name,
          isBusy: false
        });
        if (shouldPreselect) {
          setFormData(prev => ({ ...prev, staffId: firstAvailable.id }));
        }
      } else {
        // Fallback to first in queue if all are busy
        const firstInQueue = currentStaffList[0];
        if (firstInQueue) {
          setRecommendationInfo({
            type: 'fifo',
            staffId: firstInQueue.id,
            name: firstInQueue.name,
            isBusy: true
          });
          if (shouldPreselect) {
            setFormData(prev => ({ ...prev, staffId: firstInQueue.id }));
          }
        } else {
          setRecommendationInfo(null);
        }
      }
    }
  };

  const handleSkipTurn = async (staffId) => {
    try {
      setLoading(true);
      await dataService.skipTurn(staffId);
      showToast("Turno pasado al final de la fila");
      await loadData();
    } catch (e) {
      console.error(e);
      showToast("Error al pasar turno", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();

    // Real-time listener for appointments, staff changes, and turn queue updates
    const channel = supabase
      .channel('reception-realtime')
      .on('postgres_changes', {
        event: '*',
        schema: 'odontosonrisa',
        table: 'appointments'
      }, () => {
        loadData();
      })
      .on('postgres_changes', {
        event: '*',
        schema: 'odontosonrisa',
        table: 'turn_queue'
      }, () => {
        loadData();
      })
      .subscribe();

    // Auto-refresh every minute to update countdowns
    const interval = setInterval(loadData, 60000);
    return () => {
      clearInterval(interval);
      supabase.removeChannel(channel);
    };
  }, []);

  const loadData = async () => {
    try {
      const [c, s, st, active, ext, inv, allApps, ratesData, queueData] = await Promise.all([
        dataService.getClients(),
        dataService.getServices(),
        dataService.getStaff(),
        dataService.getAppointmentsByState(['En Silla']),
        dataService.getExtras(),
        dataService.getSellableInventory(),
        dataService.getAppointmentsByState(['Agendado']),
        dataService.getExchangeRates(),
        dataService.getTurnQueue().catch(() => [])
      ]);
      setClients(c);
      setServices(s);

      const queue = queueData || [];
      const checkedInStaffIds = queue
        .filter(q => q.status !== 'ABSENT')
        .map(q => q.staff_id);

      const filteredStaff = st.filter(member => (
        isOperationalReceptionStaff(member) &&
        getReceptionRoleGroup(member) &&
        checkedInStaffIds.includes(member.id)
      ));

      // Sort by position in queue (arrival order)
      filteredStaff.sort((a, b) => {
        const entryA = queue.find(q => q.staff_id === a.id);
        const entryB = queue.find(q => q.staff_id === b.id);
        return (entryA?.position || 0) - (entryB?.position || 0);
      });

      setStaff(filteredStaff);
      setActiveAppointments(active);
      setAllExtras(ext || []);
      setInventory(filterSellableInventory(inv));
      
      // Compare using local calendar-day components, not toISOString() (UTC) -
      // Venezuela is UTC-4, so any appointment scheduled after ~8pm local time
      // lands on the "next day" in UTC and would never match "today" if both
      // sides were compared as UTC date strings.
      const getLocalDateStr = (d) => {
        if (!d) return '';
        const dateObj = new Date(d);
        if (isNaN(dateObj.getTime())) return '';
        const year = dateObj.getFullYear();
        const month = String(dateObj.getMonth() + 1).padStart(2, '0');
        const day = String(dateObj.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      };
      const todayLocal = getLocalDateStr(new Date());
      setUpcomingAppointments(allApps.filter(a => getLocalDateStr(a.scheduled_at) === todayLocal || getLocalDateStr(a.created_at) === todayLocal));

      const activeRate = rates?.usd || rates?.euro || (ratesData ? (ratesData.euro || ratesData.bcv) : 841.84);
      setExchangeRate(activeRate);

      if (selectedClientRef.current) {
        selectRecommendedBarber(
          selectedClientRef.current,
          filteredStaff.filter(member => getReceptionRoleGroup(member) === 'barbers'),
          active,
          false
        );
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleStartAppointment = async (id) => {
    try {
      setLoading(true);
      await dataService.updateAppointmentStatus(id, 'En Silla');
      showToast("¡Servicio iniciado! El cliente ya está en sillón.");
      triggerRocket();
      loadData();
    } catch (error) {
      showToast("Error al iniciar servicio", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleIdSearch = () => {
    if (searchResults.length === 1) {
      handleSelectClient(searchResults[0]);
    } else {
      const exact = clients.find(c => c.id_card === idSearch || c.name.toLowerCase() === idSearch.toLowerCase());
      if (exact) {
        handleSelectClient(exact);
      } else if (searchResults.length > 1) {
        showToast("Múltiples coincidencias. Selecciona uno de la lista.", "info");
      } else {
        showToast("Cliente no encontrado. Proceda a registrarlo.", "warning");
      }
    }
  };

  const handleSelectClient = (client) => {
    setSelectedClient(client);
    setIdSearch('');
    setSearchResults([]);
    showToast(`Cliente identificado: ${client.name}`);
    selectRecommendedBarber(
      client,
      staff.filter(member => getReceptionRoleGroup(member) === 'barbers'),
      activeAppointments,
      true
    );
  };

  const handleSearchInput = (val) => {
    setIdSearch(val);
    if (val.length >= 1) {
      const term = normalizeForSearch(val);
      const results = clients.filter(c => {
        const normalizedName = normalizeForSearch(c.name || '');
        const nameMatches = normalizedName.split(' ').some(w => w.startsWith(term));
        const idMatches = (c.id_card || '').toLowerCase().includes(term);
        return nameMatches || idMatches;
      });
      setSearchResults(results.slice(0, 5));
    } else {
      setSearchResults([]);
    }
  };

  const toggleService = (serviceId) => {
    const exists = selectedServices.find(s => s.id === serviceId);
    if (exists) {
      setSelectedServices(selectedServices.filter(s => s.id !== serviceId));
      return;
    }
    
    const service = services.find(s => s.id === serviceId);
    if (service) {
      setSelectedServices([...selectedServices, service]);
    }
  };

  const handleCreateClient = () => {
    setIsNewClientModalOpen(true);
  };

  const handleNewClientSuccess = (newClient) => {
    setClients([...clients, newClient]);
    setSelectedClient(newClient);
  };

  const handleScheduleClick = () => {
    if (!selectedClient || (selectedServices.length === 0 && selectedExtras.length === 0) || !formData.staffId) {
      showToast("Selecciona cliente, servicio/extra y odontólogo/asistente primero", "warning");
      return;
    }
    setIsScheduleModalOpen(true);
  };
  
  const toggleExtra = (extra) => {
    const exists = selectedExtras.find(e => e.id === extra.id);
    if (exists) {
      setSelectedExtras(selectedExtras.filter(e => e.id !== extra.id));
    } else {
      // Add with default price as initial customPrice
      setSelectedExtras([...selectedExtras, { ...extra, customPrice: extra.price }]);
    }
  };

  const updateExtraPrice = (id, newPrice) => {
    setSelectedExtras(selectedExtras.map(e => 
      e.id === id ? { ...e, customPrice: parseFloat(newPrice) || 0 } : e
    ));
  };

  const [editingExtraPriceId, setEditingExtraPriceId] = useState(null);
  
  const toggleProduct = (product) => {
    const exists = selectedProducts.find(p => p.id === product.id);
    if (exists) {
      setSelectedProducts(selectedProducts.filter(p => p.id !== product.id));
    } else {
      if (Number(product.stock || 0) <= 0) {
        showToast(`${product.name} no tiene stock disponible`, 'error');
        return;
      }
      setSelectedProducts([...selectedProducts, { ...product, quantity: 1 }]);
    }
  };

  const applyProductSelection = (selection) => {
    setSelectedProducts(selection.map(product => ({ ...product, quantity: Number(product.quantity || 1) })));
    setIsProductModalOpen(false);
  };

  const isSubmittingRef = useRef(false);

  // Send the selected client straight to a barber's chair WITHOUT a service.
  // The barber loads the service(s) from their own panel afterwards. Creates a
  // "shell" appointment (service_id null) so the client shows up in the barber's chair.
  const handleSendToChair = async (staffId) => {
    if (isSubmittingRef.current || loading) return;
    if (!selectedClient) {
      showToast("Selecciona un cliente primero", "warning");
      return;
    }
    const selectedStaff = staff.find(member => String(member.id) === String(staffId));
    if (!isOperationalReceptionStaff(selectedStaff) || !getReceptionRoleGroup(selectedStaff)) {
      showToast("Ese miembro del equipo no puede recibir clientes.", "error");
      return;
    }
    try {
      isSubmittingRef.current = true;
      setLoading(true);
      const createdAppointment = await dataService.createAppointment({
        client_id: selectedClient.id,
        staff_id: staffId,
        service_id: null,
        status: 'En Silla',
        total_price: 0
      });
      setActiveAppointments(current => [{
        ...createdAppointment,
        clients: selectedClient,
        staff: selectedStaff || null,
        services: null,
        appointment_extras: [],
        appointment_products: []
      }, ...current.filter(app => String(app.id) !== String(createdAppointment.id))]);
      showToast(`${selectedClient.name.split(' ')[0]} enviado a sillón. El odontólogo cargará el servicio.`);
      triggerRocket();
      // Reset selection
      setSelectedClient(null);
      setSelectedServices([]);
      setSelectedExtras([]);
      setSelectedProducts([]);
      setFormData({ serviceId: '', staffId: '', status: 'En Silla' });
      loadData();
    } catch (error) {
      showToast("Error al enviar a sillón", "error");
      console.error(error);
    } finally {
      isSubmittingRef.current = false;
      setLoading(false);
    }
  };

  const handleSubmit = async (statusOverride, scheduledAt = null) => {
    if (isSubmittingRef.current || loading) return;
    const isProductOnly = selectedServices.length === 0 && selectedExtras.length === 0 && selectedProducts.length > 0;
    
    if (!selectedClient) {
      showToast("Selecciona un cliente primero", "error");
      return;
    }

    if (selectedServices.length === 0 && selectedExtras.length === 0 && selectedProducts.length === 0) {
      showToast("Agrega al menos un servicio, extra o producto", "error");
      return;
    }

    const hasStaffRequired = selectedServices.length > 0 || selectedExtras.length > 0;
    if (hasStaffRequired && !formData.staffId) {
      showToast("Selecciona un odontólogo o asistente", "error");
      return;
    }
    if (hasStaffRequired) {
      const selectedStaff = staff.find(member => String(member.id) === String(formData.staffId));
      if (!isOperationalReceptionStaff(selectedStaff) || !getReceptionRoleGroup(selectedStaff)) {
        showToast("Ese miembro del equipo no puede recibir clientes.", "error");
        return;
      }
    }

    try {
      isSubmittingRef.current = true;
      setLoading(true);
      
      // We process multiple services as individual appointments/lines for now 
      // but linked to the same event. In a complex DB we'd have a Transaction table.
      let appointments = [];
      
      // Generate a shared group_id so multi-service orders can be reliably
      // identified and deleted as a single unit later.
      const orderGroupId = crypto.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
      
      if (isProductOnly) {
        // Create a shell appointment for the products to live in
        const { data: directSale, error: dsError } = await supabase
          .from('appointments')
          .insert([{
            client_id: selectedClient.id,
            status: 'Por Pagar',
            total_price: Number(selectedProducts.reduce((acc, p) => acc + (p.price * p.quantity), 0).toFixed(2)),
            metadata: { group_id: orderGroupId }
          }])
          .select()
          .single();
        
        if (dsError) throw dsError;
        appointments = [directSale];
      } else {
        if (selectedServices.length > 0) {
          const promises = selectedServices.map(service => 
            dataService.createAppointment({
              client_id: selectedClient.id,
              service_id: service.id,
              staff_id: formData.staffId,
              status: statusOverride || formData.status,
              total_price: service.price,
              scheduled_at: scheduledAt,
              metadata: { group_id: orderGroupId }
            })
          );
          appointments = await Promise.all(promises);
        } else {
          // Only extras (no main services)
          const extrasTotal = Number(selectedExtras.reduce((sum, e) => sum + Number((e.customPrice ?? e.price) || 0), 0).toFixed(2));
          const shellApp = await dataService.createAppointment({
            client_id: selectedClient.id,
            service_id: null,
            staff_id: formData.staffId,
            status: statusOverride || formData.status,
            total_price: extrasTotal,
            scheduled_at: scheduledAt,
            metadata: { group_id: orderGroupId }
          });
          appointments = [shellApp];
        }
      }
      
      // If there are extras/products, link them to the first appointment
      if (appointments.length > 0) {
        const mainAppId = appointments[0].id;
        
        const extraPromises = selectedExtras.map(extra => 
          dataService.addExtraToAppointment(mainAppId, extra.id, extra.customPrice ?? extra.price)
        );
        
        const productPromises = selectedProducts.map(prod => 
          dataService.addProductToAppointment(mainAppId, prod.id, prod.quantity, prod.price)
        );
        
        await Promise.all([...extraPromises, ...productPromises]);
      }

      showToast(isProductOnly ? "Venta enviada a caja" : (scheduledAt ? `¡Cita agendada para las ${new Date(scheduledAt).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit', hour12: true})}!` : `¡Orden enviada! ${selectedServices.length} servicios en cola.`));
      if (!statusOverride || statusOverride === 'En Silla') triggerRocket();

      const targetStatus = statusOverride || formData.status;
      if (targetStatus === 'En Silla' && appointments.length > 0) {
        const selectedStaff = staff.find(member => String(member.id) === String(formData.staffId));
        const optimisticAppointments = appointments.map(appointment => ({
          ...appointment,
          clients: selectedClient,
          staff: selectedStaff || null,
          services: services.find(service => String(service.id) === String(appointment.service_id)) || null,
          appointment_extras: [],
          appointment_products: []
        }));
        setActiveAppointments(current => [
          ...optimisticAppointments,
          ...current.filter(existing => !optimisticAppointments.some(created => String(created.id) === String(existing.id)))
        ]);
      }
      
      // Reset
      setSelectedClient(null);
      setSelectedServices([]);
      setSelectedExtras([]);
      setSelectedProducts([]);
      setFormData({ serviceId: '', staffId: '', status: 'En Silla' });
      setIsScheduleModalOpen(false);
      loadData();
     } catch (error) {
      showToast("Error al procesar orden", "error");
      console.error(error);
    } finally {
      isSubmittingRef.current = false;
      setLoading(false);
    }
  };

  const handleDeleteClick = (appointment) => {
    // 1. Try reliable group_id matching first (orders created with the new flow)
    const groupId = appointment.metadata?.group_id;
    let orderAppointments = groupId
      ? upcomingAppointments.filter(candidate => candidate.metadata?.group_id === groupId)
      : [];

    // 2. Fallback to heuristic for legacy orders without group_id
    if (orderAppointments.length <= 1) {
      const sourceCreatedAt = new Date(appointment.created_at || 0).getTime();
      orderAppointments = upcomingAppointments.filter(candidate => {
        if (String(candidate.client_id) !== String(appointment.client_id)) return false;
        if (String(candidate.staff_id || '') !== String(appointment.staff_id || '')) return false;
        if (candidate.status !== appointment.status) return false;

        const sameScheduledTime = appointment.scheduled_at
          && candidate.scheduled_at
          && new Date(candidate.scheduled_at).getTime() === new Date(appointment.scheduled_at).getTime();
        const createdTogether = Number.isFinite(sourceCreatedAt)
          && Math.abs(new Date(candidate.created_at || 0).getTime() - sourceCreatedAt) <= 15000;
        return sameScheduledTime || createdTogether;
      });
    }
    const appointmentsToDelete = orderAppointments.length > 0 ? orderAppointments : [appointment];

    setDialog({
      isOpen: true,
      type: 'confirm',
      title: appointmentsToDelete.length > 1 ? 'Eliminar orden completa' : 'Eliminar cita',
      message: appointmentsToDelete.length > 1
        ? `Esta orden contiene ${appointmentsToDelete.length} servicios. Se eliminarán todos juntos. ¿Deseas continuar?`
        : '¿Estás seguro de que deseas eliminar esta cita permanentemente? Esta acción no se puede deshacer.',
      onConfirm: async () => {
        try {
          setLoading(true);
          const idsToDelete = appointmentsToDelete.map(item => item.id);
          setUpcomingAppointments(current => current.filter(item => !idsToDelete.includes(item.id)));
          await Promise.all(idsToDelete.map(id => dataService.deleteAppointment(id)));
          showToast(appointmentsToDelete.length > 1 ? "Orden completa eliminada" : "Cita eliminada permanentemente");
          setDialog({ isOpen: false, type: 'confirm', title: '', message: '', onConfirm: null });
          loadData();
        } catch (error) {
          showToast("Error al eliminar la cita", "error");
          console.error(error);
        } finally {
          setLoading(false);
        }
      }
    });
  };

  const staffGroups = [
    { id: 'barbers', label: 'Odontólogos DISPONIBLES' },
    { id: 'assistants', label: 'ASISTENTES DISPONIBLES' },
    { id: 'tattoo', label: ' DISPONIBLES' }
  ].map(group => ({
    ...group,
    members: staff.filter(member => getReceptionRoleGroup(member) === group.id)
  }));

  const orderItemCount = selectedServices.length
    + selectedExtras.length
    + selectedProducts.reduce((sum, product) => sum + Number(product.quantity || 1), 0);
  const orderTotalUsd = selectedServices.reduce((sum, service) => sum + Number(service.price || 0), 0)
    + selectedExtras.reduce((sum, extra) => sum + Number(extra.customPrice ?? extra.price ?? 0), 0)
    + selectedProducts.reduce((sum, product) => sum + Number(product.price || 0) * Number(product.quantity || 1), 0);
  const formatBs = value => Number(value || 0).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const formatUsd = value => Number(value || 0).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <div className="animate-fade-in" style={{ 
      maxWidth: '1400px', 
      margin: '0 auto', 
      paddingBottom: '100px',
      position: 'relative',
      '--text-muted': '#a1a1a6',
      '--text-secondary': '#d1d1d6'
    }}>
      {/* Background Orbs (desktop only — on mobile they can bleed past the narrow viewport) */}
      {!isMobile && (
        <>
          <div className="r-orb r-orb-1" />
          <div className="r-orb r-orb-2" />
        </>
      )}
      {!isMobile && (
        <header style={{ marginBottom: '40px', textAlign: 'left', paddingRight: '48px' }}>
          <h1 style={{ fontSize: '32px', fontWeight: '900' }}>Recepción</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Módulo de atención y agendamiento rápido.</p>
        </header>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1.2fr minmax(0, 1fr)', gap: isMobile ? '20px' : '32px' }}>
        
        {/* Step 1: Client Selection */}
        <section>
          <div className="glass-card animate-slide-up animate-stagger-1" style={{ marginBottom: '24px', borderRadius: '24px', position: 'relative', zIndex: searchResults.length > 0 ? 9999 : 1 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Users size={20} color="var(--gold-primary)" />
                <span style={{ fontWeight: '800', fontSize: '14px', letterSpacing: '1px', textTransform: 'uppercase' }}>1. Cliente</span>
              </div>
              <button 
                onClick={handleCreateClient}
                style={{ background: 'rgba(255, 255, 255,0.1)', border: 'none', color: 'var(--gold-primary)', padding: '6px 12px', borderRadius: '10px', fontSize: '12px', fontWeight: '800', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <UserPlus size={14} /> Nuevo
              </button>
            </div>

            {selectedClient ? (
              <div className="animate-scale-in" style={{ padding: '20px', backgroundColor: 'rgba(255, 255, 255, 0.02)', borderRadius: '16px', border: '1px solid rgba(255, 255, 255, 0.15)', color: '#ffffff' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontWeight: '800', fontSize: '18px', color: '#ffffff' }}>{selectedClient.name}</div>
                    <div style={{ 
                      display: 'inline-flex', 
                      alignItems: 'center', 
                      gap: '4px', 
                      marginTop: '6px',
                      padding: '3px 8px', 
                      borderRadius: '6px', 
                      backgroundColor: 'rgba(255, 255, 255, 0.08)', 
                      border: '1px solid rgba(255, 255, 255, 0.15)',
                      fontSize: '11px', 
                      fontWeight: '800', 
                      color: 'var(--gold-primary)',
                      letterSpacing: '0.5px'
                    }}>
                      <span style={{ opacity: 0.6, fontSize: '9px', fontWeight: '900', color: 'var(--text-muted)' }}>CÉDULA:</span> V-{selectedClient.id_card}
                    </div>
                  </div>
                  <button onClick={() => { setSelectedClient(null); setRecommendationInfo(null); setFormData(prev => ({ ...prev, staffId: '' })); }} style={{ background: 'none', border: 'none', color: '#ff453a', fontWeight: '800', cursor: 'pointer', transition: 'color 0.2s' }} onMouseEnter={e => e.currentTarget.style.color = '#ff6b64'} onMouseLeave={e => e.currentTarget.style.color = '#ff453a'}>Cambiar</button>
                </div>
              </div>
            ) : (
              <div style={{ position: 'relative' }}>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <Search style={{ position: 'absolute', left: '16px' }} size={18} color="var(--text-muted)" />
                  <input 
                    type="text" 
                    placeholder="Escribe nombre o cédula..." 
                    value={idSearch}
                    onChange={(e) => handleSearchInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleIdSearch()}
                    style={{ 
                      width: '100%', 
                      paddingLeft: '48px', 
                      paddingRight: '54px', 
                      height: '52px',
                      borderRadius: '16px',
                      background: 'rgba(255, 255, 255, 0.03)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      color: 'white',
                      fontSize: '14px',
                      outline: 'none',
                      transition: 'all 0.3s ease'
                    }}
                  />
                  <button 
                    onClick={handleIdSearch} 
                    className="btn-gold" 
                    style={{ 
                      position: 'absolute',
                      right: '6px',
                      width: '40px', 
                      height: '40px', 
                      padding: 0, 
                      borderRadius: '12px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    <ArrowRight size={18} />
                  </button>
                </div>
                
                {/* Search Results Dropdown */}
                {searchResults.length > 0 && (
                  <div className="animate-scale-in" style={{ 
                    position: 'absolute', top: '100%', left: 0, right: 0, 
                    marginTop: '8px', background: 'var(--bg-secondary)', 
                    border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', 
                    overflow: 'hidden', zIndex: 10, backdropFilter: 'blur(10px)',
                    boxShadow: '0 10px 40px rgba(0,0,0,0.5)'
                  }}>
                    {searchResults.map(c => (
                      <div 
                        key={c.id} 
                        onClick={() => handleSelectClient(c)}
                        style={{ padding: '12px 16px', cursor: 'pointer', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                        onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255,0.1)'}
                        onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                      >
                        <span style={{ fontWeight: '700', fontSize: '14px', color: 'white' }}>{c.name}</span>
                        <span style={{ fontSize: '12px', color: 'var(--gold-primary)', fontWeight: '700' }}>V-{c.id_card}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="glass-card animate-slide-up animate-stagger-2" style={{ borderRadius: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '24px' }}>
              <Receipt size={20} color="var(--gold-primary)" />
              <span style={{ fontWeight: '800', fontSize: '14px', letterSpacing: '1px', textTransform: 'uppercase' }}>2. Detalle de la Orden</span>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '12px', marginBottom: '24px' }}>
              <button 
                onClick={() => setIsServiceModalOpen(true)}
                className="action-add-btn btn-service reception-animate-item"
                style={{ animationDelay: '0ms' }}
              >
                <Scissors size={18} /> <span style={{ textAlign: 'center' }}>+ SERVICIO</span>
              </button>
              <button
                onClick={() => setIsExtraModalOpen(true)}
                className="action-add-btn btn-extra reception-animate-item"
                style={{ animationDelay: '40ms' }}
              >
                <Rocket size={18} /> <span style={{ textAlign: 'center' }}>+ EXTRA</span>
              </button>
              <button
                onClick={() => setIsProductModalOpen(true)}
                className="action-add-btn btn-product reception-animate-item"
                style={{ animationDelay: '80ms' }}
              >
                <ShoppingBag size={18} /> <span style={{ textAlign: 'center' }}>+ PRODUCTO</span>
              </button>
            </div>

            {(selectedServices.length > 0 || selectedExtras.length > 0 || selectedProducts.length > 0) && (
              <div className="reception-order-sheet" style={{ background: 'var(--bg-secondary)', padding: '14px', borderRadius: '20px', marginBottom: '24px', border: '1px solid rgba(17, 17, 17,.18)', boxShadow: '0 18px 48px rgba(0,0,0,.22)' }}>
                <div style={{ marginBottom: '11px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
                  <div>
                    <span style={{ display: 'block', color: 'var(--gold-primary)', fontSize: '9px', fontWeight: 950, letterSpacing: '1px', textTransform: 'uppercase' }}>Orden en preparación</span>
                    <strong style={{ display: 'block', marginTop: '2px', color: '#fff', fontSize: '14px' }}>{orderItemCount} {orderItemCount === 1 ? 'artículo' : 'artículos'}</strong>
                  </div>
                  <span style={{ padding: '5px 9px', borderRadius: '999px', color: '#cfcfd2', background: 'rgba(255,255,255,.055)', border: '1px solid rgba(255,255,255,.08)', fontSize: '9px', fontWeight: 850 }}>LISTA PARA ASIGNAR</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
                  {selectedServices.map(s => (
                    <div key={s.id} className="reception-order-row" style={{ minHeight: '62px', padding: '9px 9px 9px 10px', display: 'grid', gridTemplateColumns: '38px minmax(0,1fr) auto 36px', alignItems: 'center', gap: '10px', borderRadius: '14px', background: 'rgba(255,255,255,.035)', border: '1px solid rgba(255,255,255,.065)' }}>
                      <span style={{ width: '38px', height: '38px', display: 'grid', placeItems: 'center', borderRadius: '11px', color: 'var(--gold-primary)', background: 'rgba(17, 17, 17,.11)', border: '1px solid rgba(17, 17, 17,.2)' }}><Scissors size={17} /></span>
                      <div style={{ minWidth: 0 }}><span style={{ display: 'block', color: 'var(--gold-primary)', fontSize: '8px', fontWeight: 950, letterSpacing: '.7px' }}>SERVICIO</span><strong style={{ display: 'block', marginTop: '2px', color: '#fff', fontSize: '13px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.name}</strong></div>
                      <div style={{ textAlign: 'right' }}>
                        <strong style={{ display: 'block', color: '#fff', fontSize: '12px' }}>{formatBs(Number(s.price) * exchangeRate)} Bs</strong>
                        <small style={{ color: 'var(--text-muted)', fontSize: '9px' }}>${formatUsd(s.price)}</small>
                      </div>
                      <button type="button" aria-label={`Quitar servicio ${s.name}`} onClick={() => toggleService(s.id)} className="reception-remove-item"><Trash2 size={15} /></button>
                    </div>
                  ))}
                  {selectedExtras.map(e => (
                    <div key={e.id} className="reception-order-row" style={{ minHeight: '62px', padding: '9px 9px 9px 10px', display: 'grid', gridTemplateColumns: '38px minmax(0,1fr) auto 36px', alignItems: 'center', gap: '10px', borderRadius: '14px', background: 'rgba(255,159,10,.035)', border: '1px solid rgba(255,159,10,.12)' }}>
                      <span style={{ width: '38px', height: '38px', display: 'grid', placeItems: 'center', borderRadius: '11px', color: '#ff9f0a', background: 'rgba(255,159,10,.09)', border: '1px solid rgba(255,159,10,.18)' }}><Rocket size={17} /></span>
                      <div style={{ minWidth: 0 }}><span style={{ display: 'block', color: '#ffad33', fontSize: '8px', fontWeight: 950, letterSpacing: '.7px' }}>EXTRA</span><strong style={{ display: 'block', marginTop: '2px', color: '#fff', fontSize: '13px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.name}</strong></div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
                        {editingExtraPriceId === e.id ? (
                          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                            <span style={{ position: 'absolute', left: '7px', fontSize: '10px', color: '#ffad33', fontWeight: '800' }}>$</span>
                            <input 
                              type="number"
                              autoFocus
                              value={e.customPrice}
                              onChange={(val) => updateExtraPrice(e.id, val.target.value)}
                              onBlur={() => setEditingExtraPriceId(null)}
                              onKeyDown={(key) => key.key === 'Enter' && setEditingExtraPriceId(null)}
                              style={{ width: '74px', height: '34px', background: 'var(--bg-secondary)', border: '1px solid #ff9f0a', borderRadius: '9px', color: 'white', padding: '0 7px 0 17px', fontSize: '12px', fontWeight: '800', textAlign: 'right' }}
                            />
                          </div>
                        ) : (
                          <button type="button"
                            onClick={() => setEditingExtraPriceId(e.id)}
                            aria-label={`Editar precio de ${e.name}`}
                            style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', padding: '3px 6px', border: 0, borderRadius: '8px', color: 'inherit', background: 'transparent' }}
                          >
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                              <strong style={{ color: '#fff', fontSize: '12px' }}>{formatBs(Number(e.customPrice ?? e.price) * exchangeRate)} Bs</strong>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <span style={{ color: 'var(--text-muted)', fontSize: '9px' }}>${formatUsd(e.customPrice ?? e.price)}</span>
                                <Edit3 size={8} color="var(--text-muted)" />
                              </div>
                            </div>
                          </button>
                        )}
                      </div>
                      <button type="button" aria-label={`Quitar extra ${e.name}`} onClick={() => toggleExtra(e)} className="reception-remove-item"><Trash2 size={15} /></button>
                    </div>
                  ))}
                  {selectedProducts.map(p => (
                    <div key={p.id} className="reception-order-row" style={{ minHeight: '66px', padding: '9px 9px 9px 10px', display: 'grid', gridTemplateColumns: '42px minmax(0,1fr) auto 36px', alignItems: 'center', gap: '10px', borderRadius: '14px', background: String(p.inventory_type).toLowerCase() === 'cafe' ? 'rgba(255,159,10,.035)' : 'rgba(48,209,88,.035)', border: `1px solid ${String(p.inventory_type).toLowerCase() === 'cafe' ? 'rgba(255,159,10,.13)' : 'rgba(48,209,88,.13)'}` }}>
                      <span style={{ width: '42px', height: '42px', display: 'grid', placeItems: 'center', overflow: 'hidden', borderRadius: '12px', color: String(p.inventory_type).toLowerCase() === 'cafe' ? '#ff9f0a' : '#30d158', background: 'rgba(255,255,255,.045)', border: '1px solid rgba(255,255,255,.09)' }}>{p.image_url ? <img src={p.image_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <ShoppingBag size={18} />}</span>
                      <div style={{ minWidth: 0 }}><span style={{ display: 'block', color: String(p.inventory_type).toLowerCase() === 'cafe' ? '#ffad33' : '#54d37b', fontSize: '8px', fontWeight: 950, letterSpacing: '.65px' }}>{getInventorySalesLabel(p).toUpperCase()} {Number(p.quantity || 1) > 1 ? `· ×${p.quantity}` : ''}</span><strong style={{ display: 'block', marginTop: '2px', color: '#fff', fontSize: '13px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</strong></div>
                      <div style={{ textAlign: 'right' }}>
                        <strong style={{ display: 'block', color: '#fff', fontSize: '12px' }}>{formatBs(Number(p.price) * Number(p.quantity || 1) * exchangeRate)} Bs</strong>
                        <small style={{ color: 'var(--text-muted)', fontSize: '9px' }}>${formatUsd(Number(p.price) * Number(p.quantity || 1))}</small>
                      </div>
                      <button type="button" aria-label={`Quitar producto ${p.name}`} onClick={() => toggleProduct(p)} className="reception-remove-item"><Trash2 size={15} /></button>
                    </div>
                  ))}
                </div>
                <div style={{ marginTop: '12px', padding: '13px 4px 2px', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: '14px', borderTop: '1px solid rgba(255,255,255,.09)' }}>
                  <div><span style={{ display: 'block', color: 'var(--text-muted)', fontSize: '8px', fontWeight: 900, letterSpacing: '.8px' }}>TOTAL DE LA ORDEN</span><small style={{ color: 'var(--text-secondary)', fontSize: '10px' }}>Incluye servicios y consumos</small></div>
                  <div style={{ textAlign: 'right' }}><strong style={{ display: 'block', color: 'var(--gold-primary)', fontSize: '19px', letterSpacing: '-.35px' }}>{formatBs(orderTotalUsd * exchangeRate)} Bs</strong><small style={{ color: 'var(--text-muted)', fontSize: '10px' }}>REF. ${formatUsd(orderTotalUsd)}</small></div>
                </div>
              </div>
            )}

            <div>
              {recommendationInfo && (
                <div 
                  className="animate-fade-in" 
                  style={{ 
                    padding: '14px 18px', 
                    borderRadius: '16px', 
                    background: recommendationInfo.isBusy 
                      ? 'rgba(255, 159, 10, 0.08)' 
                      : 'rgba(50, 215, 75, 0.08)',
                    border: recommendationInfo.isBusy
                      ? '1px solid rgba(255, 159, 10, 0.3)'
                      : '1px solid rgba(50, 215, 75, 0.3)',
                    marginBottom: '16px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '6px'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ fontSize: '14px', marginBottom: '2px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {recommendationInfo.isBusy ? <AlertTriangle size={14} color="#ff9f0a" /> : <Sparkles size={14} color="var(--gold-primary)" />}
                    </div>
                    <span style={{ fontSize: '10px', fontWeight: '800', color: recommendationInfo.isBusy ? '#ff9f0a' : '#32d74b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      {recommendationInfo.type === 'frequent' 
                        ? 'Recomendación (Cliente Recurrente)' 
                        : 'Recomendación (Siguiente en Fila)'}
                    </span>
                  </div>
                  <p style={{ margin: 0, fontSize: '12px', color: 'white', fontWeight: '750', lineHeight: '1.4' }}>
                    {recommendationInfo.type === 'frequent' ? (
                      recommendationInfo.isBusy ? (
                        <span>
                          Su odontólogo frecuente <strong>{recommendationInfo.name}</strong> está ocupado. Puedes <strong>agendar para después</strong> si el cliente desea esperar, o seleccionar a otro de la fila.
                        </span>
                      ) : (
                        <span>
                          Se ha sugerido automáticamente a su odontólogo frecuente <strong>{recommendationInfo.name}</strong>.
                        </span>
                      )
                    ) : (
                      <span>
                        Se sugiere el odontólogo que sigue en la fila por orden de llegada: <strong>{recommendationInfo.name}</strong>.
                      </span>
                    )}
                  </p>
                </div>
              )}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
                {staffGroups.map(group => (
                  <div key={group.id}>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: '800', color: 'var(--text-muted)', marginBottom: '12px' }}>{group.label}</label>
                    {group.members.length === 0 ? (
                      <div style={{ padding: '14px 16px', borderRadius: '14px', border: '1px dashed rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.3)', fontSize: '11px' }}>
                        No hay personal disponible en este grupo
                      </div>
                    ) : (
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))', gap: '12px' }}>
                {group.members.map((s, idx) => {
                  const active = activeAppointments.find(a => a.staff_id === s.id);
                  const isBusy = !!active;
                  let timeLeft = 0;
                  
                  if (isBusy && active.started_at) {
                    const startTime = new Date(active.started_at);
                    const duration = active.services?.duration || 30;
                    const endTime = new Date(startTime.getTime() + duration * 60000);
                    timeLeft = Math.max(0, Math.ceil((endTime - new Date()) / 60000));
                  }

                  return (
                    <div 
                      key={s.id}
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '6px',
                        alignItems: 'stretch'
                      }}
                    >
                      <button
                        onClick={() => {
                          if (formData.staffId === s.id) {
                            setFormData({...formData, staffId: ''});
                          } else {
                            setFormData({...formData, staffId: s.id});
                          }
                        }}
                        className="reception-animate-item"
                        style={{
                          width: '100%',
                          padding: '16px 8px',
                          borderRadius: '20px',
                          border: formData.staffId === s.id ? '2px solid var(--gold-primary)' : isBusy ? '1px solid rgba(255,69,58,0.3)' : '1px solid var(--border-color)',
                          backgroundColor: formData.staffId === s.id ? 'rgba(255, 255, 255,0.1)' : isBusy ? 'rgba(255,69,58,0.05)' : 'rgba(255,255,255,0.02)',
                          color: formData.staffId === s.id ? 'var(--gold-primary)' : 'white',
                          cursor: 'pointer',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          gap: '6px',
                          transition: 'background-color 0.3s, color 0.3s',
                          position: 'relative',
                          overflow: 'hidden',
                          animationDelay: `${120 + idx * 50}ms`
                        }}
                      >
                        {/* Queue Position Badge */}
                        <div style={{ 
                          position: 'absolute', 
                          top: 0, 
                          left: 0, 
                          backgroundColor: 'rgba(255,255,255,0.1)', 
                          color: 'var(--gold-primary)', 
                          fontSize: '9px', 
                          padding: '2px 6px', 
                          fontWeight: '900',
                          borderBottomRightRadius: '8px'
                        }}>
                          {idx + 1}º
                        </div>

                        {isBusy && (
                          <div style={{ 
                            position: 'absolute', 
                            top: 0, 
                            right: 0, 
                            backgroundColor: '#ff453a', 
                            color: 'white', 
                            fontSize: '8px', 
                            padding: '2px 6px', 
                            fontWeight: '900',
                            borderBottomLeftRadius: '8px'
                          }}>
                            OCUPADO
                          </div>
                        )}
                        
                        <div className={`staff-avatar-wrapper ${isBusy ? 'status-busy' : 'status-available'}`} style={{
                          backgroundColor: isBusy ? 'rgba(255,69,58,0.1)' : 'rgba(255,255,255,0.05)', 
                          color: isBusy ? '#ff453a' : 'inherit',
                          overflow: 'hidden'
                        }}>
                          {s.image_url ? (
                            <img src={s.image_url} alt={s.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          ) : (
                            <Users size={18} />
                          )}
                        </div>
                        
                        <div style={{ textAlign: 'center' }}>
                          <div style={{ fontSize: '11px', fontWeight: '800' }}>{s.name.split(' ')[0]}</div>
                          {isBusy ? (
                            <div style={{ fontSize: '9px', color: '#ff453a', fontWeight: '700', marginTop: '2px' }}>
                              {timeLeft > 0 ? `Libre: ${timeLeft}m` : 'Por terminar'}
                            </div>
                          ) : (
                            <div style={{ fontSize: '9px', color: '#32d74b', fontWeight: '700', marginTop: '2px' }}>Disponible</div>
                          )}
                        </div>
                      </button>

                      {selectedClient && (
                        <button
                          onClick={(e) => { e.stopPropagation(); handleSendToChair(s.id); }}
                          style={{
                            padding: '5px 6px',
                            borderRadius: '8px',
                            backgroundColor: 'rgba(50,215,75,0.12)',
                            border: '1px solid rgba(50,215,75,0.35)',
                            color: '#32d74b',
                            fontSize: '9px',
                            fontWeight: '900',
                            cursor: 'pointer',
                            textAlign: 'center',
                            transition: 'all 0.2s'
                          }}
                          onMouseEnter={(ev) => ev.currentTarget.style.backgroundColor = 'rgba(50,215,75,0.2)'}
                          onMouseLeave={(ev) => ev.currentTarget.style.backgroundColor = 'rgba(50,215,75,0.12)'}
                        >
                           Enviar a sillón
                        </button>
                      )}

                      {!isBusy && (
                        <button
                          onClick={(e) => { e.stopPropagation(); handleSkipTurn(s.id); }}
                          style={{
                            padding: '4px 6px',
                            borderRadius: '8px',
                            backgroundColor: 'rgba(255,255,255,0.04)',
                            border: '1px solid rgba(255,255,255,0.08)',
                            color: 'var(--text-secondary)',
                            fontSize: '9px',
                            fontWeight: '800',
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            textAlign: 'center'
                          }}
                          onMouseEnter={(ev) => ev.currentTarget.style.backgroundColor = 'rgba(255,159,10,0.1)'}
                          onMouseLeave={(ev) => ev.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.04)'}
                        >
                          Pasar Turno
                        </button>
                      )}
                    </div>
                  );
                })}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Upcoming Appointments List */}
            <div style={{ marginTop: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                <Calendar size={16} color="var(--gold-primary)" />
                <span style={{ fontWeight: '800', fontSize: '11px', letterSpacing: '1px', textTransform: 'uppercase', color: 'var(--gold-primary)' }}>Próximas Citas (Agenda Hoy)</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {upcomingAppointments.length === 0 ? (
                  <div style={{ padding: '20px', textAlign: 'center', color: 'rgba(255,255,255,0.4)', fontSize: '12px', border: '1px dashed rgba(255,255,255,0.1)', borderRadius: '16px' }}>No hay más citas para hoy</div>
                ) : (
                  upcomingAppointments.map((app, idx) => (
                    <div 
                      key={app.id} 
                      className="upcoming-appointment-card reception-animate-item"
                      style={{ 
                        padding: '16px 20px', 
                        borderRadius: '20px', 
                        background: 'rgba(255,255,255,0.02)',
                        border: '1px solid rgba(255,255,255,0.05)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
                        animationDelay: `${idx * 50}ms`
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                        <div style={{
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          padding: '6px 12px',
                          borderRadius: '12px',
                          background: 'rgba(255, 255, 255, 0.08)',
                          border: '1px solid rgba(255, 255, 255, 0.25)',
                          minWidth: '92px'
                        }}>
                          <span style={{ fontSize: '11px', fontWeight: '900', color: 'var(--gold-primary)', whiteSpace: 'nowrap' }}>
                            {(() => {
                              const d = new Date(app.scheduled_at || app.created_at);
                              let h = d.getHours();
                              const m = String(d.getMinutes()).padStart(2, '0');
                              const ampm = h >= 12 ? 'PM' : 'AM';
                              h = h % 12;
                              h = h ? h : 12;
                              return `${String(h).padStart(2, '0')}:${m} ${ampm}`;
                            })()}
                          </span>
                        </div>
                        <div>
                          <div style={{ fontWeight: '800', fontSize: '14px', color: 'white' }}>{app.clients?.name}</div>
                          <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <span style={{ width: '4px', height: '4px', borderRadius: '50%', backgroundColor: 'rgba(255,255,255,0.3)' }} />
                            <span>Atendido por: <strong>{app.staff?.name}</strong></span>
                          </div>
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <button 
                          onClick={() => handleDeleteClick(app)}
                          style={{
                            width: '38px',
                            height: '38px',
                            borderRadius: '12px',
                            background: 'rgba(255, 69, 58, 0.05)',
                            border: '1px solid rgba(255, 69, 58, 0.15)',
                            color: '#ff453a',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: 'all 0.2s'
                          }}
                          onMouseEnter={e => {
                            e.currentTarget.style.background = 'rgba(255, 69, 58, 0.12)';
                            e.currentTarget.style.borderColor = 'rgba(255, 69, 58, 0.4)';
                          }}
                          onMouseLeave={e => {
                            e.currentTarget.style.background = 'rgba(255, 69, 58, 0.05)';
                            e.currentTarget.style.borderColor = 'rgba(255, 69, 58, 0.15)';
                          }}
                          title="Eliminar cita"
                        >
                          <Trash2 size={16} />
                        </button>
                        <button 
                          onClick={() => handleStartAppointment(app.id)}
                          className="btn-premium-start"
                          style={{ 
                            padding: '10px 16px', 
                            borderRadius: '12px', 
                            background: 'var(--gold-primary)', 
                            color: 'black', 
                            border: 'none', 
                            fontSize: '11px', 
                            fontWeight: '900', 
                            cursor: 'pointer', 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: '6px',
                            transition: 'all 0.25s'
                          }}
                        >
                          <Clock size={13} /> INICIAR
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </section>

        {/* Action Panel */}
        <section className="animate-slide-up animate-stagger-3" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div className="glass-card" style={{ borderRadius: '24px', background: 'var(--bg-secondary)', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center', padding: '40px 30px' }}>
            {!selectedClient ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }} className="animate-fade-in">
                <div className="premium-badge">
                  <Clock size={10} style={{ marginRight: '2px' }} /> Módulo de Espera
                </div>
                <div className="radar-container">
                  <div className="radar-circle" />
                  <div className="radar-glow" />
                  <Search size={28} color="var(--gold-primary)" style={{ position: 'relative', zIndex: 2 }} />
                </div>
                <h3 style={{ color: 'white', fontWeight: '800', fontSize: '18px' }}>Escaneando Clientes</h3>
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '8px', maxWidth: '280px', lineHeight: '1.5' }}>
                  Ingresa la cédula o nombre en el buscador para cargar la ficha y comenzar la atención.
                </p>
              </div>
            ) : selectedServices.length === 0 && selectedProducts.length === 0 && selectedExtras.length === 0 ? (
              <>
                <Scissors size={48} color="rgba(255, 255, 255,0.2)" style={{ marginBottom: '20px' }} />
                <h3 style={{ color: 'var(--text-secondary)' }}>Añade productos o servicios</h3>
                <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '8px' }}>Selecciona lo que el cliente desea adquirir.</p>
              </>
            ) : (
              <div className="animate-slide-up" style={{ width: '100%' }}>
                <CheckCircle2 size={56} color="var(--gold-primary)" style={{ marginBottom: '24px' }} />
                <h3 style={{ fontSize: '24px', marginBottom: '8px' }}>Todo Listo</h3>
                <p style={{ color: 'var(--text-secondary)', marginBottom: '24px', fontSize: '14px' }}>
                  Confirmación para <span style={{ color: 'white', fontWeight: '800' }}>{selectedClient.name}</span>
                </p>

                {/* Detailed Summary for Confirmation */}
                <div style={{ backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: '20px', padding: '20px', marginBottom: '32px', textAlign: 'left', border: '1px solid rgba(255,255,255,0.05)' }}>
                  <div style={{ fontSize: '10px', fontWeight: '900', color: 'var(--gold-primary)', letterSpacing: '1px', marginBottom: '12px', textTransform: 'uppercase' }}>Resumen de Atención</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {selectedServices.map(s => (
                      <div key={s.id}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <Scissors size={14} color="var(--gold-primary)" />
                          <span style={{ fontSize: '13px', fontWeight: '700' }}>{s.name}</span>
                        </div>
                        {s.included_items && s.included_items.length > 0 && (
                          <div style={{ 
                            display: 'flex', 
                            flexDirection: 'column', 
                            gap: '4px', 
                            marginLeft: '24px', 
                            marginTop: '6px',
                            padding: '8px 12px',
                            backgroundColor: 'rgba(255, 255, 255, 0.02)',
                            borderRadius: '10px',
                            border: '1px solid rgba(255, 255, 255, 0.04)'
                          }}>
                            <div style={{ fontSize: '9px', fontWeight: '900', color: 'var(--gold-primary)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '2px' }}>Incluye:</div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '6px' }}>
                              {s.included_items.map((item, idx) => (
                                <div key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: '6px', fontSize: '11px', color: 'var(--text-secondary)', lineHeight: '1.3' }}>
                                  <span style={{ color: 'var(--gold-primary)', display: 'flex' }}><Check size={12} strokeWidth={3} /></span>
                                  <span>{item}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                    {selectedExtras.map(e => (
                      <div key={e.id} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <Rocket size={14} color="var(--gold-primary)" />
                        <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{e.name} (Extra)</span>
                      </div>
                    ))}
                    {selectedProducts.map(p => (
                      <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <ShoppingBag size={14} color="#32d74b" />
                        <span style={{ fontSize: '13px', color: '#32d74b' }}>{p.name}</span>
                      </div>
                    ))}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '6px', paddingTop: '10px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                      <Users size={14} color="var(--text-muted)" />
                      <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Asignado: <span style={{ color: 'white', fontWeight: '700' }}>{staff.find(s => s.id === formData.staffId)?.name || 'No seleccionado'}</span></span>
                    </div>
                  </div>
                </div>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '100%' }}>
                  {(selectedServices.length > 0 || selectedExtras.length > 0) ? (
                    <>
                      <button 
                        disabled={loading || (formData.staffId && activeAppointments.some(a => a.staff_id === formData.staffId))}
                        onClick={() => handleSubmit('En Silla')}
                        className="btn-gold" 
                        style={{ 
                          height: '60px', 
                          borderRadius: '18px', 
                          fontSize: '16px',
                          opacity: (formData.staffId && activeAppointments.some(a => a.staff_id === formData.staffId)) ? 0.5 : 1,
                          cursor: (formData.staffId && activeAppointments.some(a => a.staff_id === formData.staffId)) ? 'not-allowed' : 'pointer'
                        }}
                      >
                        <Zap size={20} fill="currentColor" /> 
                         {activeAppointments.some(a => a.staff_id === formData.staffId) ? 'PERSONAL OCUPADO' : 'INICIAR AHORA'}
                      </button>
                      
                      {activeAppointments.some(a => a.staff_id === formData.staffId) && (
                        <p style={{ fontSize: '11px', color: '#ff453a', fontWeight: '700', marginTop: '-4px' }}>
                          Usa "Agendar para después" para poner al cliente en cola.
                        </p>
                      )}

                      <button 
                        disabled={loading}
                        onClick={handleScheduleClick}
                        style={{ background: 'none', border: '1px solid var(--border-color)', color: 'white', height: '56px', borderRadius: '18px', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}
                      >
                        <Calendar size={18} /> AGENDAR PARA DESPUÉS
                      </button>
                    </>
                  ) : (
                    <button 
                      disabled={loading}
                      onClick={() => handleSubmit('Por Pagar')}
                      className="btn-gold" 
                      style={{ height: '60px', borderRadius: '18px', fontSize: '16px', backgroundColor: '#32d74b', color: 'black', border: 'none' }}
                    >
                      <ShoppingBag size={20} /> ENVIAR A CAJA (PRODUCTOS)
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </section>
      </div>

      <NewClientModal 
        isOpen={isNewClientModalOpen} 
        onClose={() => setIsNewClientModalOpen(false)}
        onSuccess={handleNewClientSuccess}
      />

      <ScheduleModal
        isOpen={isScheduleModalOpen}
        onClose={() => setIsScheduleModalOpen(false)}
        client={selectedClient}
        staff={staff.find(s => s.id === formData.staffId)}
        service={selectedServices[0]}
        onSchedule={(date) => handleSubmit('Agendado', date)}
      />

      <PandaDialog 
        isOpen={dialog.isOpen}
        title={dialog.title}
        message={dialog.message}
        type={dialog.type}
        onConfirm={dialog.onConfirm}
        onCancel={() => setDialog({ ...dialog, isOpen: false })}
        confirmText="Confirmar"
        cancelText="Cancelar"
      />

      {/* Shared catalogs: same interaction language as Caja */}
      <OrderCatalogModal
        isOpen={isServiceModalOpen}
        onClose={() => setIsServiceModalOpen(false)}
        type="service"
        items={services}
        selectedItems={selectedServices}
        onToggle={(service) => toggleService(service.id)}
        rate={exchangeRate}
      />

      <OrderCatalogModal
        isOpen={isExtraModalOpen}
        onClose={() => setIsExtraModalOpen(false)}
        type="extra"
        items={allExtras}
        selectedItems={selectedExtras}
        onToggle={toggleExtra}
        rate={exchangeRate}
      />

      <SellableInventoryModal
        isOpen={isProductModalOpen}
        onClose={() => setIsProductModalOpen(false)}
        items={inventory}
        rates={{ usd: exchangeRate }}
        mode="multiple"
        initialSelection={selectedProducts}
        title="Productos y Cortesías"
        subtitle="Selecciona productos o bebidas para agregarlos a la orden"
        onConfirm={applyProductSelection}
      />

      <style>{`
        .hover-item:hover {
          background-color: rgba(255, 255, 255,0.1) !important;
          transform: translateX(5px);
        }

        /* Backlight Glowing Orbs */
        .r-orb {
          position: absolute;
          border-radius: 50%;
          filter: blur(140px);
          opacity: 0.06;
          z-index: 0;
          pointer-events: none;
          animation: r-orb-float 22s infinite ease-in-out;
        }
        .r-orb-1 {
          width: 500px;
          height: 500px;
          background: radial-gradient(circle, var(--gold-primary) 0%, transparent 70%);
          top: -10%;
          right: 5%;
          animation-duration: 26s;
        }
        .r-orb-2 {
          width: 450px;
          height: 450px;
          background: radial-gradient(circle, #8a6d1c 0%, transparent 70%);
          bottom: 5%;
          left: 5%;
          animation-duration: 30s;
          animation-delay: -7s;
        }
        @keyframes r-orb-float {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(40px, -50px) scale(1.1); }
        }

        /* Frosted Actions Buttons (+ Servicio, + Extra, + Producto) */
        .action-add-btn {
          background: rgba(255, 255, 255, 0.02) !important;
          border: 1px dashed rgba(255, 255, 255, 0.1) !important;
          padding: 18px 12px !important;
          border-radius: 20px !important;
          font-weight: 850 !important;
          font-size: 11px !important;
          cursor: pointer;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
          transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1) !important;
          box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
        }
        
        .action-add-btn.btn-service,
        .action-add-btn.btn-extra,
        .action-add-btn.btn-product {
          color: var(--gold-primary) !important;
          border-color: rgba(17, 17, 17, 0.25) !important;
        }
        .action-add-btn.btn-service:hover,
        .action-add-btn.btn-extra:hover,
        .action-add-btn.btn-product:hover {
          background: rgba(17, 17, 17, 0.06) !important;
          border-color: rgba(17, 17, 17, 0.6) !important;
          border-style: solid !important;
          box-shadow: 0 8px 30px rgba(17, 17, 17, 0.15), 0 0 12px rgba(17, 17, 17, 0.05);
          transform: translateY(-3px) scale(1.02);
        }

        /* Avatar Rings for Staff */
        .staff-avatar-wrapper {
          position: relative;
          width: 44px;
          height: 44px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.3s ease;
        }
        .staff-avatar-wrapper::after {
          content: '';
          position: absolute;
          inset: -3px;
          border-radius: 50%;
          border: 2px solid transparent;
          transition: all 0.3s ease;
        }
        .staff-avatar-wrapper.status-available::after {
          border-color: rgba(50, 215, 75, 0.3);
          animation: ring-pulse 3s infinite ease-in-out;
        }
        .staff-avatar-wrapper.status-busy::after {
          border-color: rgba(255, 69, 58, 0.35);
        }
        @keyframes ring-pulse {
          0%, 100% { transform: scale(1); opacity: 0.8; }
          50% { transform: scale(1.08); opacity: 0.3; }
        }

        /* Radar Scanning Effect */
        .radar-container {
          position: relative;
          width: 80px;
          height: 80px;
          margin-bottom: 24px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .radar-circle {
          position: absolute;
          width: 100%;
          height: 100%;
          border-radius: 50%;
          border: 1px solid rgba(255, 255, 255, 0.15);
          background: radial-gradient(circle, rgba(255, 255, 255, 0.05) 0%, transparent 70%);
        }
        .radar-glow {
          position: absolute;
          width: 100%;
          height: 100%;
          border-radius: 50%;
          border: 2.5px solid var(--gold-primary);
          animation: radar-sweep 2.5s infinite linear;
          box-shadow: 0 0 15px rgba(255, 255, 255, 0.2);
        }
        @keyframes radar-sweep {
          0% { transform: scale(0.5); opacity: 1; }
          100% { transform: scale(1.5); opacity: 0; }
        }
        .premium-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 6px 14px;
          border-radius: 99px;
          background: rgba(255, 255, 255, 0.1);
          border: 1px solid rgba(255, 255, 255, 0.2);
          color: var(--gold-primary);
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 1.5px;
          text-transform: uppercase;
          margin-bottom: 16px;
        }

        /* Selection Modal Premium Items */
        .selection-modal-item {
          transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1) !important;
        }
        .selection-modal-item:hover {
          transform: translateY(-2px) scale(1.008);
          background: rgba(255, 255, 255, 0.04) !important;
          border-color: rgba(255, 255, 255, 0.3) !important;
          box-shadow: 0 6px 20px rgba(0, 0, 0, 0.3);
        }
        .selection-modal-item.is-selected:hover {
          background: rgba(255, 255, 255, 0.1) !important;
          border-color: var(--gold-primary) !important;
          box-shadow: 0 6px 20px rgba(255, 255, 255, 0.15);
        }
        .btn-premium-modal-ready {
          background: var(--gold-primary) !important;
          color: black !important;
          font-weight: 900 !important;
          letter-spacing: 1.5px !important;
          border: none !important;
          cursor: pointer;
          transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1) !important;
          box-shadow: 0 4px 15px rgba(255, 255, 255, 0.2);
        }
        .btn-premium-modal-ready:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 25px rgba(255, 255, 255, 0.4);
          filter: brightness(1.1);
        }

        /* Upcoming Appointments List Glow Up */
        .upcoming-appointment-card {
          transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1) !important;
        }
        .upcoming-appointment-card:hover {
          transform: translateY(-2px);
          background: rgba(255, 255, 255, 0.04) !important;
          border-color: rgba(255, 255, 255, 0.25) !important;
          box-shadow: 0 8px 30px rgba(0, 0, 0, 0.3);
        }
        .btn-premium-start {
          transition: all 0.25s ease !important;
          box-shadow: 0 4px 12px rgba(255, 255, 255, 0.2);
        }
        .btn-premium-start:hover {
          transform: scale(1.04);
          box-shadow: 0 6px 18px rgba(255, 255, 255, 0.4);
          filter: brightness(1.1);
        }

        @keyframes receptionCardFadeIn {
          from {
            opacity: 0;
            transform: translateY(12px) scale(0.995);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        .reception-animate-item {
          animation: receptionCardFadeIn 0.5s cubic-bezier(0.16, 1, 0.3, 1) both;
        }
        .reception-remove-item {
          width: 36px;
          height: 36px;
          display: grid;
          place-items: center;
          border-radius: 10px;
          border: 1px solid rgba(255, 69, 58, .16);
          background: rgba(255, 69, 58, .055);
          color: #ff6961;
          cursor: pointer;
          transition: background .18s ease, border-color .18s ease, transform .18s ease;
        }
        .reception-remove-item:hover {
          background: rgba(255, 69, 58, .13);
          border-color: rgba(255, 69, 58, .32);
          transform: scale(1.04);
        }
        @media (max-width: 520px) {
          .reception-order-sheet { padding: 11px !important; border-radius: 17px !important; }
          .reception-order-row {
            grid-template-columns: 36px minmax(0, 1fr) auto 34px !important;
            gap: 7px !important;
            padding-left: 8px !important;
          }
          .reception-remove-item { width: 34px; height: 34px; }
        }
      `}</style>
    </div>
  );
};

const SelectionModal = ({ isOpen, onClose, title, icon, items, selectedItems, onToggle, exchangeRate = 58, type }) => {
  useScrollLock(isOpen);
  const [productGroup, setProductGroup] = useState('all');

  useEffect(() => {
    if (!isOpen) setProductGroup('all');
  }, [isOpen]);

  if (!isOpen) return null;

  const visibleItems = type === 'product'
    ? items.filter(item => matchesInventorySalesGroup(item, productGroup))
    : items;

  return createPortal(
    <div style={{
      position: 'fixed', 
      inset: 0, 
      backgroundColor: 'rgba(0,0,0,0.85)', 
      backdropFilter: isOpen ? 'blur(10px)' : 'blur(0px)', 
      zIndex: 99999, 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center',
      padding: '20px',
      paddingTop: 'max(20px, env(safe-area-inset-top, 20px))',
      opacity: isOpen ? 1 : 0,
      visibility: isOpen ? 'visible' : 'hidden',
      pointerEvents: isOpen ? 'auto' : 'none',
      transition: 'opacity 0.3s ease, backdrop-filter 0.3s ease, visibility 0.3s'
    }}>
      <div className="glass-card" style={{ 
        width: '100%', 
        maxWidth: '650px', 
        maxHeight: '90vh', 
        display: 'flex', 
        flexDirection: 'column', 
        borderRadius: '32px', 
        border: '1px solid rgba(255, 255, 255,0.2)', 
        padding: '32px',
        transform: isOpen ? 'scale(1) translateY(0)' : 'scale(0.95) translateY(15px)',
        transition: 'transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.3s ease',
        opacity: isOpen ? 1 : 0
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {icon}
            <h3 style={{ fontSize: '20px', fontWeight: '800' }}>{title}</h3>
          </div>
          <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.05)', border: 'none', borderRadius: '50%', width: '36px', height: '36px', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <X size={20} />
          </button>
        </div>

        {type === 'product' && (
          <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '16px' }}>
            {Object.entries(INVENTORY_SALES_GROUPS).map(([value, label]) => (
              <button key={value} type="button" onClick={() => setProductGroup(value)} style={{ padding: '9px 13px', borderRadius: '12px', border: productGroup === value ? '1px solid var(--gold-primary)' : '1px solid rgba(255,255,255,0.08)', background: productGroup === value ? 'rgba(17, 17, 17,0.16)' : 'rgba(255,255,255,0.03)', color: productGroup === value ? 'var(--gold-primary)' : 'rgba(255,255,255,0.7)', fontSize: '12px', fontWeight: '800', whiteSpace: 'nowrap', cursor: 'pointer' }}>{label}</button>
            ))}
          </div>
        )}

        <div style={{ overflowY: 'auto', flex: 1, paddingLeft: '8px', paddingRight: '12px', margin: '0 -8px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: '6px 4px' }}>
            {visibleItems.map(item => {
              const isSelected = selectedItems.find(si => si.id === item.id);
              const isOutOfStock = type === 'product' && Number(item.stock || 0) <= 0;
              return (
                <button 
                  key={item.id}
                  onClick={() => !isOutOfStock && onToggle(item)}
                  disabled={isOutOfStock}
                  className={`selection-modal-item ${isSelected ? 'is-selected' : ''}`}
                  style={{
                    padding: '16px 20px',
                    borderRadius: '20px',
                    border: isSelected ? '1px solid var(--gold-primary)' : '1px solid rgba(255,255,255,0.05)',
                    background: isSelected ? 'rgba(255, 255, 255,0.06)' : 'rgba(255,255,255,0.02)',
                    textAlign: 'left',
                    cursor: isOutOfStock ? 'not-allowed' : 'pointer',
                    opacity: isOutOfStock ? 0.5 : 1,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '16px',
                    width: '100%',
                    boxShadow: isSelected ? '0 0 15px rgba(255, 255, 255,0.08)' : 'none'
                  }}
                >
                  <div style={{ 
                    width: '46px', 
                    height: '46px', 
                    borderRadius: '12px', 
                    background: isSelected ? 'var(--gold-primary)' : 'rgba(255,255,255,0.04)', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    flexShrink: 0,
                    transition: 'all 0.3s ease'
                  }}>
                    {item.image_url ? (
                      <img src={item.image_url} alt={item.name} style={{ width: '100%', height: '100%', borderRadius: '12px', objectFit: 'cover' }} />
                    ) : (
                      type === 'service' ? (
                        <Scissors size={20} color={isSelected ? 'black' : 'var(--gold-primary)'} />
                      ) : type === 'extra' ? (
                        <Rocket size={20} color={isSelected ? 'black' : '#ff9f0a'} />
                      ) : (
                        <ShoppingBag size={20} color={isSelected ? 'black' : '#30d158'} />
                      )
                    )}
                  </div>
                  
                  <div style={{ flex: 1, minWidth: 0 }}>
                    {type === 'product' && <div style={{ color: String(item.inventory_type).toLowerCase() === 'cafe' ? '#ff9f0a' : '#30d158', fontWeight: '850', fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: '4px' }}>{getInventorySalesLabel(item)} · {isOutOfStock ? 'Agotado' : `Stock: ${item.stock}`}</div>}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ fontSize: '14px', fontWeight: '750', color: isSelected ? 'var(--gold-primary)' : 'white', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.name}</div>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', marginLeft: '10px' }}>
                        <div style={{ fontSize: '15px', fontWeight: '900', color: 'var(--gold-primary)' }}>{(item.price * exchangeRate).toLocaleString('es-VE', {minimumFractionDigits: 2, maximumFractionDigits: 2})} Bs.</div>
                        <div style={{ fontSize: '11px', color: isSelected ? 'rgba(255,255,255,0.8)' : 'rgba(255,255,255,0.55)', fontWeight: '700' }}>Ref: ${item.price}</div>
                      </div>
                    </div>
                    {item.included_items && item.included_items.length > 0 && (
                      <div style={{ 
                        display: 'flex', 
                        flexWrap: 'wrap', 
                        gap: '6px 8px', 
                        marginTop: '10px' 
                      }}>
                        {item.included_items.map((inc, i) => (
                          <span key={i} style={{ 
                            fontSize: '9.5px', 
                            fontWeight: '700',
                            color: isSelected ? 'var(--gold-primary)' : 'rgba(255,255,255,0.5)',
                            backgroundColor: isSelected ? 'rgba(255, 255, 255,0.1)' : 'rgba(255,255,255,0.04)',
                            padding: '4px 10px',
                            borderRadius: '8px',
                            border: isSelected ? '1px solid rgba(255, 255, 255,0.25)' : '1px solid rgba(255,255,255,0.05)',
                            whiteSpace: 'nowrap',
                            letterSpacing: '0.3px'
                          }}>
                            {inc}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {isSelected && (
                    <div style={{ width: '22px', height: '22px', borderRadius: '50%', backgroundColor: 'var(--gold-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <CheckCircle2 size={15} color="black" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        <button 
          onClick={onClose}
          className="btn-premium-modal-ready"
          style={{ marginTop: '24px', height: '56px', borderRadius: '18px' }}
        >
          LISTO
        </button>
      </div>
    </div>,
    document.body
  );
};

export default ReceptionModule;
