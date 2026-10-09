import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { 
  X, 
  Calendar as CalendarIcon, 
  Search, 
  Check, 
  Clock, 
  Package, 
  Plus, 
  Minus, 
  Trash2,
  ChevronLeft,
  ChevronRight,
  ArrowLeft,
  Loader2
} from 'lucide-react';
import { dataService } from '../services/dataService';
import { SkeletonGrid } from './Skeleton';
import { useNotifs } from '../context/NotificationContext';
import { ModalShield } from '../context/ModalContext';
import AnimatedModal from './AnimatedModal';
import PandaSelect from './PandaSelect';
import { useScrollLock } from '../hooks/useScrollLock';
import FieldLabel from './FieldLabel';
import { isBarberBookableStaff } from '../utils/staffRoles';

const NewAppointmentModal = ({ isOpen, onClose, onSuccess, rates }) => {
  const { showToast } = useNotifs();
  const activeRate = rates?.usd || rates?.euro || 841.84;

  const [step, setStep] = useState(1); // 1: Form details, 2: Select Date & Time Slot
  const [submitting, setSubmitting] = useState(false);
  const [loadingData, setLoadingData] = useState(false);
  
  const [clients, setClients] = useState([]);
  const [services, setServices] = useState([]);
  const [staff, setStaff] = useState([]);
  const [allExtras, setAllExtras] = useState([]);
  const [allProducts, setAllProducts] = useState([]);

  const [clientSearchTerm, setClientSearchTerm] = useState('');
  const [clientSearchResults, setClientSearchResults] = useState([]);
  const [selectedClient, setSelectedClient] = useState(null);

  const [newApp, setNewApp] = useState({
    clientId: '',
    serviceId: '',
    staffId: '',
    extras: [],
    products: []
  });

  // Time slot scheduling state
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [availableSlots, setAvailableSlots] = useState([]);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [loadingSlots, setLoadingSlots] = useState(false);

  useScrollLock(isOpen);

  useEffect(() => {
    if (isOpen) {
      setStep(1);
      setSelectedSlot(null);
      setSelectedDate(new Date());
      loadData();
    }
  }, [isOpen]);

  useEffect(() => {
    if (step === 2 && newApp.staffId) {
      loadAvailability();
    }
  }, [step, selectedDate, newApp.staffId, newApp.serviceId]);

  const loadData = async () => {
    try {
      setLoadingData(true);
      const [cl, sv, st, ex, pr] = await Promise.all([
        dataService.getClients(),
        dataService.getServices(),
        dataService.getStaff(),
        dataService.getExtras(),
        dataService.getInventory()
      ]);
      setClients(cl || []);
      setServices(sv || []);
      setStaff(st || []);

      // Filter out invalid/roulette extras
      const validExtras = (ex || []).filter(e => {
        if (!e.name) return false;
        const nameUpper = e.name.toUpperCase();
        return !nameUpper.includes('ROULETTE_PRIZE') && !nameUpper.includes('CORTE GRATIS');
      });
      setAllExtras(validExtras);
      setAllProducts(pr || []);
    } catch (err) {
      console.error('Error loading data for new appointment:', err);
    } finally {
      setLoadingData(false);
    }
  };

  const loadAvailability = async () => {
    try {
      setLoadingSlots(true);
      const allApps = await dataService.getAppointmentsByState(['Agendado', 'En Silla', 'En Lavado', 'Por Pagar', 'Completado']);
      const dailyApps = (allApps || []).filter(a => {
        if (!a.scheduled_at || String(a.staff_id) !== String(newApp.staffId)) return false;
        return new Date(a.scheduled_at).toDateString() === selectedDate.toDateString();
      });
      const selectedService = services.find(service => String(service.id) === String(newApp.serviceId));
      const targetDuration = Math.max(30, Number(selectedService?.duration) || 60);

      const slots = [];
      const now = new Date();
      const isToday = selectedDate.toDateString() === now.toDateString();
      const currentHour = now.getHours();
      const currentMinutes = now.getMinutes();

      for (let hour = 0; hour < 24; hour++) {
        for (let min of [0, 30]) {
          // Skip if past current time today
          if (isToday && (hour < currentHour || (hour === currentHour && min <= currentMinutes))) continue;

          const timeStr = `${hour.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}`;
          const candidateStart = new Date(selectedDate);
          candidateStart.setHours(hour, min, 0, 0);
          const candidateEnd = new Date(candidateStart.getTime() + targetDuration * 60000);
          const isOccupied = dailyApps.some(a => {
            const existingStart = new Date(a.scheduled_at);
            const existingDuration = Math.max(30, Number(a.services?.duration) || 60);
            const existingEnd = new Date(existingStart.getTime() + existingDuration * 60000);
            return candidateStart < existingEnd && candidateEnd > existingStart;
          });

          slots.push({
            time: timeStr,
            isAvailable: !isOccupied
          });
        }
      }
      setAvailableSlots(slots);
    } catch (err) {
      console.error('Error loading slots:', err);
    } finally {
      setLoadingSlots(false);
    }
  };

  const handleClientSearch = (term) => {
    setClientSearchTerm(term);
    if (!term || term.trim().length === 0) {
      setClientSearchResults([]);
      return;
    }
    const cleanTerm = term.toLowerCase().trim();
    const matches = clients.filter(c => 
      (c.name && c.name.toLowerCase().includes(cleanTerm)) ||
      (c.id_card && c.id_card.toString().includes(cleanTerm)) ||
      (c.phone && c.phone.includes(cleanTerm))
    );
    setClientSearchResults(matches.slice(0, 5));
  };

  const handleSelectClient = (c) => {
    setSelectedClient(c);
    setNewApp(prev => ({ ...prev, clientId: c.id }));
    setClientSearchTerm(c.name);
    setClientSearchResults([]);
  };

  const handleClearClient = () => {
    setSelectedClient(null);
    setNewApp(prev => ({ ...prev, clientId: '' }));
    setClientSearchTerm('');
    setClientSearchResults([]);
  };

  const serviceVal = services.find(s => s.id === newApp.serviceId);
  const selectedStaff = staff.find(s => s.id === newApp.staffId);
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

  const handleGoToStep2 = () => {
    if (!newApp.clientId || !newApp.serviceId || !newApp.staffId) {
      showToast("Selecciona cliente, servicio y odontólogo", "error");
      return;
    }
    if (!isBarberBookableStaff(staff.find(s => String(s.id) === String(newApp.staffId)))) {
      showToast("Ese miembro del equipo no puede recibir citas.", "error");
      return;
    }
    setStep(2);
  };

  const handleConfirmAppointment = async () => {
    if (!selectedSlot) {
      showToast("Selecciona un horario disponible", "error");
      return;
    }

    try {
      setSubmitting(true);
      const [hours, minutes] = selectedSlot.split(':');
      const scheduledAt = new Date(selectedDate);
      scheduledAt.setHours(parseInt(hours), parseInt(minutes), 0, 0);
      const isoTime = scheduledAt.toISOString();

      const created = await dataService.createAppointment({
        client_id: newApp.clientId,
        service_id: newApp.serviceId,
        staff_id: newApp.staffId,
        status: 'Agendado',
        total_price: serviceVal ? serviceVal.price : 0,
        scheduled_at: isoTime
      });

      const appointmentId = created.id;

      const extrasPromises = newApp.extras.map(exId => {
        const ex = allExtras.find(e => e.id === exId);
        return dataService.addExtraToAppointment(appointmentId, exId, ex ? ex.price : 0);
      });

      const productsPromises = newApp.products.map(p => {
        const pr = allProducts.find(prod => prod.id === p.id);
        return dataService.addProductToAppointment(appointmentId, p.id, p.quantity, pr ? pr.price : 0);
      });

      await Promise.all([...extrasPromises, ...productsPromises]);

      showToast("Cita agendada correctamente", "success");
      
      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      console.error('Error creating appointment:', err);
      showToast(err?.message || "Error al agendar la cita", "error");
    } finally {
      setSubmitting(false);
    }
  };

  return createPortal(
    <AnimatedModal isOpen={isOpen}>
      {(overlayClass, cardClass) => (
        <ModalShield active={true}>
          <div 
            className={overlayClass.replace('global-modal-overlay', '')} 
            style={{ 
              position: 'fixed', 
              top: 0, 
              left: 0, 
              right: 0, 
              bottom: 0, 
              backgroundColor: 'rgba(0,0,0,0.85)', 
              backdropFilter: 'blur(10px)', 
              zIndex: 10000, 
              display: 'flex', 
              justifyContent: 'center', 
              alignItems: 'center',
              padding: '20px',
              paddingTop: 'max(20px, env(safe-area-inset-top, 20px))'
            }}
          >
            <div 
              className={`glass-card ${cardClass.replace('global-modal-card', '')}`} 
              style={{ 
                maxWidth: 'min(900px, 90vw)', 
                width: '100%', 
                borderRadius: '24px', 
                border: '1px solid rgba(255,255,255,0.08)',
                background: 'var(--bg-secondary)',
                backdropFilter: 'blur(40px)',
                display: 'flex',
                flexDirection: 'column',
                position: 'relative',
                maxHeight: '90vh',
                overflow: 'hidden'
              }}
            >

              {/* STEP 1: FORM DETAILS */}
              {step === 1 && (
                <div style={{ display: 'flex', flexDirection: 'column', maxHeight: '85vh' }}>
                  {/* Header */}
                  <div style={{ padding: '24px 28px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <h2 style={{ fontSize: '22px', fontWeight: '800', margin: 0, color: 'white', letterSpacing: '-0.5px' }}>
                        Nueva <span style={{ color: 'var(--champagne)' }}>Cita</span>
                      </h2>
                      <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.5)', fontWeight: '500' }}>
                        Agenda un nuevo servicio
                      </span>
                    </div>
                    <button 
                      onClick={onClose}
                      style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: 'rgba(255,255,255,0.8)', cursor: 'pointer', width: '36px', height: '36px', borderRadius: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s', backdropFilter: 'blur(10px)' }}
                      onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.2)'; e.currentTarget.style.transform = 'scale(1.05)'; }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; e.currentTarget.style.transform = 'scale(1)'; }}
                    >
                      <X size={18} />
                    </button>
                  </div>

                  {/* Scrollable Content - 2 Column Grid */}
                  <div className="custom-scrollbar" style={{ padding: '20px 28px', overflowY: 'auto', flex: 1, display: 'grid', gridTemplateColumns: 'minmax(200px, 0.38fr) minmax(0, 1fr)', gap: '0 36px', alignItems: 'start' }}>
                    
                    {/* ── LEFT: Cliente + Barbero ── */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', paddingRight: '12px' }}>
                      {/* Cliente */}
                      <div>
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
                            <button onClick={() => { setClientSearchTerm(''); setClientSearchResults([]); setNewApp(prev => ({ ...prev, clientId: '' })); setSelectedClient(null); }} style={{ background: 'rgba(255,69,58,0.12)', color: '#ff453a', border: 'none', borderRadius: '10px', width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}>
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
                      </div>

                      {/* Barbero */}
                      <div>
                        <FieldLabel required>Odontólogo</FieldLabel>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, 60px)', gap: '12px', justifyItems: 'center' }}>
                          {staff.filter(isBarberBookableStaff).map(s => {
                            const isSel = newApp.staffId === s.id;
                            return (
                              <div key={s.id} onClick={() => setNewApp({...newApp, staffId: s.id})} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
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
                    </div>

                    {/* ── RIGHT: Servicio + Extras ── */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
                      {/* Servicio */}
                      <div>
                        <FieldLabel required>Servicio</FieldLabel>
                        <PandaSelect placeholder="Selecciona el servicio..." value={newApp.serviceId} onChange={(val) => setNewApp({...newApp, serviceId: val})} options={services.map(s => ({ label: `${s.name} ($${s.price})`, value: s.id }))} />
                      </div>

                      {/* Extras — Grid 2 columnas */}
                      <div>
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
                      </div>
                    </div>
                  </div>

                  {/* Sticky Footer */}
                  <div style={{ background: 'var(--bg-secondary)', backdropFilter: 'blur(20px)', borderTop: '1px solid rgba(255,255,255,0.06)', padding: '18px 28px', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '20px' }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', fontWeight: '700', letterSpacing: '0.5px', textTransform: 'uppercase' }}>Total Estimado</div>
                      <div style={{ fontSize: '28px', fontWeight: '800', color: 'white', lineHeight: '1.1' }}>${totalEstimated.toFixed(2)}</div>
                      <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)', marginTop: '2px' }}>
                        {newApp.serviceId && <span>Servicio: ${servicePrice.toFixed(2)}</span>}
                        {newApp.extras.length > 0 && <span> · Extras: +${extrasPrice.toFixed(2)}</span>}
                      </div>
                    </div>
                    <button type="button" onClick={handleGoToStep2} style={{ height: '52px', padding: '0 32px', borderRadius: '16px', background: 'linear-gradient(135deg, var(--champagne-dark), var(--champagne-light))', color: 'black', border: 'none', fontSize: '15px', fontWeight: '800', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', cursor: 'pointer', transition: 'all 0.25s', flexShrink: 0, whiteSpace: 'nowrap' }} onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.03)'} onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}>
                      Seleccionar Horario
                      <Clock size={16} />
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 2: SELECT DATE & TIME SLOT */}
              {step === 2 && (
                <div>
                  <header style={{ marginBottom: '24px' }}>
                    <button 
                      onClick={() => setStep(1)}
                      style={{ background: 'rgba(255,255,255,0.05)', border: 'none', color: 'var(--gold-primary)', padding: '6px 12px', borderRadius: '10px', display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: '800', cursor: 'pointer', marginBottom: '12px' }}
                    >
                      <ArrowLeft size={14} /> VOLVER AL FORMULARIO
                    </button>
                    <h2 style={{ fontSize: '22px', fontWeight: '900', color: 'white', marginBottom: '4px' }}>
                      Agendar <span className="text-gold">Turno</span>
                    </h2>
                    <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>
                      {serviceVal?.name} con <strong>{selectedStaff?.name}</strong>
                    </p>
                  </header>

                  {/* DATE NAVIGATOR */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', backgroundColor: 'var(--bg-secondary)', padding: '10px 16px', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <button 
                      onClick={() => {
                        const prev = new Date(selectedDate);
                        prev.setDate(selectedDate.getDate() - 1);
                        setSelectedDate(prev);
                        setSelectedSlot(null);
                      }} 
                      style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', padding: '4px' }}
                    >
                      <ChevronLeft size={20} />
                    </button>
                    
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontWeight: '800', fontSize: '14px', color: 'white' }}>
                        {selectedDate.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}
                      </div>
                    </div>

                    <button 
                      onClick={() => {
                        const next = new Date(selectedDate);
                        next.setDate(selectedDate.getDate() + 1);
                        setSelectedDate(next);
                        setSelectedSlot(null);
                      }} 
                      style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', padding: '4px' }}
                    >
                      <ChevronRight size={20} />
                    </button>
                  </div>

                  {/* SLOTS GRID */}
                  <div style={{ marginBottom: '24px' }}>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: '900', color: 'var(--gold-primary)', marginBottom: '12px', letterSpacing: '1px' }}>
                      HORARIOS DISPONIBLES
                    </label>
                    {loadingSlots ? (
                      <SkeletonGrid items={12} itemHeight={38} minWidth={80} />
                    ) : (
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat( auto-fill, minmax(80px, 1fr) )', gap: '8px', maxHeight: '240px', overflowY: 'auto', paddingRight: '4px' }} className="panda-scrollbar">
                        {availableSlots.map(slot => {
                          const [h, m] = slot.time.split(':');
                          const hour = parseInt(h);
                          const ampm = hour >= 12 ? 'PM' : 'AM';
                          const h12 = hour % 12 || 12;
                          const time12 = `${h12}:${m} ${ampm}`;
                          const isSelected = selectedSlot === slot.time;

                          return (
                            <button
                              key={slot.time}
                              disabled={!slot.isAvailable}
                              onClick={() => setSelectedSlot(slot.time)}
                              style={{
                                padding: '10px 0',
                                borderRadius: '10px',
                                fontSize: '11px',
                                fontWeight: '800',
                                cursor: slot.isAvailable ? 'pointer' : 'not-allowed',
                                backgroundColor: isSelected ? 'var(--gold-primary)' : slot.isAvailable ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.01)',
                                border: isSelected ? 'none' : '1px solid rgba(255,255,255,0.06)',
                                color: isSelected ? 'black' : slot.isAvailable ? 'white' : 'rgba(255,255,255,0.2)',
                                transition: 'background-color 0.2s, color 0.2s',
                                textDecoration: !slot.isAvailable ? 'line-through' : 'none'
                              }}
                            >
                              {time12}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* ACTION BUTTONS STEP 2 */}
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button 
                      type="button"
                      onClick={() => setStep(1)} 
                      style={{ 
                        flex: 0.8, 
                        background: 'none', 
                        border: '1px solid rgba(255,255,255,0.1)', 
                        color: 'rgba(255,255,255,0.8)', 
                        height: '44px',
                        borderRadius: '12px', 
                        fontSize: '13px',
                        fontWeight: '600', 
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                      }}
                      onMouseEnter={e => { e.currentTarget.style.color = '#fff'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)'; }}
                      onMouseLeave={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.8)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; }}
                    >
                      Volver
                    </button>
                    <button 
                      type="button"
                      disabled={!selectedSlot || submitting}
                      onClick={handleConfirmAppointment}
                      className="btn-gold" 
                      style={{ flex: 1.2, height: '44px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontSize: '13px', fontWeight: '600', opacity: selectedSlot ? 1 : 0.5 }}
                    >
                      {submitting ? (
                        <Loader2 className="animate-spin" size={15} />
                      ) : (
                        <>
                          <Check size={15} />
                          Confirmar
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </ModalShield>
      )}
    </AnimatedModal>,
    document.body
  );
};

export default NewAppointmentModal;
