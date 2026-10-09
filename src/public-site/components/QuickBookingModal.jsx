import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Calendar as CalendarIcon, Clock, Sparkles, Scissors, User, Search, CheckCircle, Coffee, MessageSquare, Beer, Martini, GlassWater, Lock } from 'lucide-react';
import { publicService } from '../services/publicService';
import PandaDatePicker from '../../components/PandaDatePicker';
import { formatDuration } from '../../utils/formatDuration';
import { isBookableStaff, isBarberBookableStaff, isTattooBookableStaff } from '../../utils/staffRoles';

export default function QuickBookingModal({ onClose, client, initialBarber = null }) {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(true);
  const [services, setServices] = useState([]);
  const [staff, setStaff] = useState([]);
  const [occupiedSlots, setOccupiedSlots] = useState([]);
  
  // Media query state
  const [isDesktop, setIsDesktop] = useState(window.innerWidth >= 768);

  // Selections
  const [selectedService, setSelectedService] = useState(null);
  const [selectedBarber, setSelectedBarber] = useState(initialBarber);
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedTime, setSelectedTime] = useState(null);
  const [selectedBeverage, setSelectedBeverage] = useState(null);
  const [notes, setNotes] = useState('');
  const [imgErrors, setImgErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isClosing, setIsClosing] = useState(false);

  // Plays the closing animation before actually unmounting — calling onClose()
  // directly would remove the component instantly since the parent renders it
  // via a plain `{show && <QuickBookingModal />}` (no AnimatePresence).
  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      onClose();
    }, 600);
  };

  // Confetti effect when reaching step 4
  useEffect(() => {
    if (step === 4) {
      import('canvas-confetti').then((confetti) => {
        confetti.default({
          particleCount: 150,
          spread: 80,
          origin: { y: 0.6 },
          colors: ['#e8d4b0', '#111111', '#ffffff'],
          zIndex: 999999
        });
      });
    }
  }, [step]);

  // Disable body scroll when modal is open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
      document.documentElement.style.overflow = '';
    };
  }, []);

  useEffect(() => {
    const handleResize = () => setIsDesktop(window.innerWidth >= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // El único control de disponibilidad es el interruptor manual del dashboard
  // (system_settings.store_is_open): abierto = cualquier hora del día disponible,
  // cerrado = no se puede agendar ningún turno.
  const [storeIsOpen, setStoreIsOpen] = useState(true);

  useEffect(() => {
    async function loadInitialData() {
      try {
        const [svcs, stf, open] = await Promise.all([
          publicService.getServices(),
          publicService.getStaff(),
          publicService.getStoreOpen()
        ]);
        setServices(svcs.filter(s => s.active));
        setStaff(stf.filter(isBookableStaff));
        setStoreIsOpen(open);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadInitialData();
  }, []);

  useEffect(() => {
    if (selectedBarber && selectedDate) {
      publicService.getOccupiedSlots(selectedBarber.id, selectedDate, selectedService?.duration)
        .then(setOccupiedSlots)
        .catch(err => console.error(err));
    }
  }, [selectedBarber, selectedDate, selectedService]);

  const handleNext = () => setStep(s => s + 1);
  const handleBack = () => setStep(s => s - 1);

  const getAvailableHours = () => {
    if (!selectedDate || !storeIsOpen) return [];

    const slots = [];
    const now = new Date();
    const isToday = selectedDate === now.toISOString().split('T')[0];
    const currentHour = now.getHours();
    const currentMinutes = now.getMinutes();

    for (let h = 0; h < 24; h++) {
      for (let m of [0, 30]) {
        if (isToday && (h < currentHour || (h === currentHour && m <= currentMinutes))) continue;
        slots.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
      }
    }
    return slots.filter(s => !occupiedSlots.includes(s));
  };

  const handleConfirm = async () => {
    if (!selectedService || !selectedBarber || !selectedDate || !selectedTime) return;
    if (!storeIsOpen) {
      alert('La clínica está cerrada por ahora — no se pueden agendar citas.');
      return;
    }
    setIsSubmitting(true);
    try {
      const scheduled_at = `${selectedDate}T${selectedTime}:00`;
      await publicService.createAppointment({
        client_id: client.id,
        service_id: selectedService.id,
        staff_id: selectedBarber.id,
        scheduled_at,
        beverage: selectedBeverage,
        notes: notes
      });
      setStep(5); 
    } catch (err) {
      console.error(err);
      alert('Hubo un error al agendar tu cita.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const containerVariants = {
    hidden: { opacity: 0, x: 20 },
    show: {
      opacity: 1, x: 0,
      transition: { staggerChildren: 0.06, delayChildren: 0.1 }
    },
    exit: { opacity: 0, x: -20, transition: { duration: 0.2 } }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 15, scale: 0.95 },
    show: { opacity: 1, y: 0, scale: 1, transition: { type: 'spring', damping: 20, stiffness: 300 } }
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: isClosing ? 0 : 1 }}
      transition={{ duration: 0.6 }}
      style={{
        position: 'fixed', inset: 0, zIndex: 99999, display: 'flex',
        alignItems: isDesktop ? 'stretch' : 'flex-end', 
        justifyContent: isDesktop ? 'flex-end' : 'center',
        background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)',
        padding: 0
      }} 
      onClick={handleClose}
    >
      
      <motion.div 
        initial={isDesktop ? { x: '100%' } : { y: '100%' }}
        animate={isClosing ? { scale: 0.1, x: '100%', y: '-100%', opacity: 0, rotateY: 90 } : (isDesktop ? { x: 0 } : { y: 0 })}
        exit={isDesktop ? { x: '100%' } : { y: '100%' }}
        transition={isClosing ? { duration: 0.6, ease: [0.32, 0.72, 0, 1] } : { type: 'spring', damping: 25, stiffness: 200 }}
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%', 
          maxWidth: isDesktop ? 450 : 500, 
          height: isDesktop ? '100vh' : '85vh',
          background: 'var(--bg-secondary)',
          borderTopLeftRadius: 24, 
          borderTopRightRadius: isDesktop ? 0 : 24,
          borderBottomLeftRadius: isDesktop ? 24 : 0,
          border: '1px solid rgba(17,17,17,0.2)', 
          borderBottom: 'none',
          borderRight: isDesktop ? 'none' : undefined,
          borderTop: isDesktop ? 'none' : '1px solid rgba(17,17,17,0.2)',
          display: 'flex', flexDirection: 'column', overflow: 'hidden'
        }}
      >
        {/* Header */}
        {step < 4 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 24px', borderBottom: '1px solid rgba(217, 192, 143, 0.15)' }}>
            <h3 style={{ margin: 0, color: '#0f172a', fontSize: 18, fontWeight: 800, fontFamily: 'General Sans' }}>Nueva Cita</h3>
            <button onClick={handleClose} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer' }}><X size={20} /></button>
          </div>
        )}

        {/* Content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
          {loading ? (
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '100%' }}
            >
              <div style={{ position: 'relative', width: 64, height: 64, marginBottom: 24 }}>
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 1.2, ease: "linear" }}
                  style={{
                    position: 'absolute', inset: 0,
                    border: '3px solid transparent',
                    borderTopColor: 'var(--champagne)',
                    borderRightColor: 'var(--champagne)',
                    borderRadius: '50%',
                    boxShadow: '0 0 15px rgba(17,17,17,0.3)',
                  }}
                />
                <motion.div
                  animate={{ rotate: -360 }}
                  transition={{ repeat: Infinity, duration: 1.8, ease: "linear" }}
                  style={{
                    position: 'absolute', inset: 10,
                    border: '3px solid transparent',
                    borderBottomColor: 'rgba(17,17,17,0.35)',
                    borderLeftColor: 'rgba(17,17,17,0.35)',
                    borderRadius: '50%',
                  }}
                />
                <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Scissors size={20} color="#111111" strokeWidth={2.5} />
                </div>
              </div>
              <motion.div 
                animate={{ opacity: [0.4, 1, 0.4] }}
                transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
                style={{ color: 'var(--champagne)', fontSize: 11, letterSpacing: '3px', fontWeight: 800, textTransform: 'uppercase' }}
              >
                Sincronizando...
              </motion.div>
            </motion.div>
          ) : (
            <AnimatePresence mode="wait">
              {step === 1 && (() => {
                const isTattooArtist = initialBarber ? (initialBarber.role || '').toLowerCase().includes('tatuador') : null;
                const barberServices = services.filter(s => !(s.category || '').toLowerCase().includes('tatuaje'));
                const tattooServices = services.filter(s => (s.category || '').toLowerCase().includes('tatuaje'));

                return (
                  <motion.div key="step1" variants={containerVariants} initial="hidden" animate="show" exit="exit">
                    <motion.h4 variants={itemVariants} style={{ color: 'var(--champagne)', fontSize: 14, fontWeight: 700, marginBottom: 16 }}>1. Elige un Servicio</motion.h4>
                    
                    {(isTattooArtist === null || isTattooArtist === false) && barberServices.length > 0 && (
                      <motion.div variants={itemVariants} style={{ marginBottom: 24 }}>
                        <h5 style={{ color: '#0f172a', fontSize: 13, marginBottom: 12 }}>Estética</h5>
                        <div style={{ display: 'grid', gap: 12 }}>
                          {barberServices.map(s => (
                            <motion.button 
                              variants={itemVariants}
                              whileHover={{ scale: 1.02 }}
                              whileTap={{ scale: 0.98 }}
                              key={s.id} 
                              onClick={() => setSelectedService(s)}
                              style={{
                                background: selectedService?.id === s.id ? 'rgba(17,17,17,0.1)' : '#f7f7f5',
                                border: `1px solid ${selectedService?.id === s.id ? 'var(--champagne)' : 'rgba(217, 192, 143, 0.15)'}`,
                                padding: 16, borderRadius: 12, textAlign: 'left', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer'
                              }}
                            >
                              <div>
                                <p style={{ color: '#0f172a', fontWeight: 700, margin: '0 0 4px', fontSize: 15 }}>{s.name}</p>
                                <p style={{ color: '#64748b', fontSize: 12, margin: 0 }}>{formatDuration(s.duration)}</p>
                              </div>
                              <span style={{ color: 'var(--champagne)', fontWeight: 800 }}>${s.price}</span>
                            </motion.button>
                          ))}
                        </div>
                      </motion.div>
                    )}

                    {(isTattooArtist === null || isTattooArtist === true) && tattooServices.length > 0 && (
                      <motion.div variants={itemVariants}>
                        <h5 style={{ color: '#0f172a', fontSize: 13, marginBottom: 12 }}>Ortodoncia</h5>
                        <div style={{ display: 'grid', gap: 12 }}>
                          {tattooServices.map(s => (
                            <motion.button 
                              variants={itemVariants}
                              whileHover={{ scale: 1.02 }}
                              whileTap={{ scale: 0.98 }}
                              key={s.id} 
                              onClick={() => setSelectedService(s)}
                              style={{
                                background: selectedService?.id === s.id ? 'rgba(17,17,17,0.1)' : '#f7f7f5',
                                border: `1px solid ${selectedService?.id === s.id ? 'var(--champagne)' : 'rgba(217, 192, 143, 0.15)'}`,
                                padding: 16, borderRadius: 12, textAlign: 'left', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer'
                              }}
                            >
                              <div>
                                <p style={{ color: '#0f172a', fontWeight: 700, margin: '0 0 4px', fontSize: 15 }}>{s.name}</p>
                                <p style={{ color: '#64748b', fontSize: 12, margin: 0 }}>{formatDuration(s.duration)}</p>
                              </div>
                              <span style={{ color: 'var(--champagne)', fontWeight: 800 }}>${s.price}</span>
                            </motion.button>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </motion.div>
                );
              })()}

              {step === 2 && (() => {
                const isTattoo = (selectedService?.category || '').toLowerCase().includes('tatuaje');
                const filteredStaff = staff
                  .filter(s => isTattoo ? isTattooBookableStaff(s) : isBarberBookableStaff(s))
                  .filter(s => s.name.toLowerCase().includes(searchQuery.toLowerCase()));

                return (
                  <motion.div key="step2" variants={containerVariants} initial="hidden" animate="show" exit="exit">
                    <motion.h4 variants={itemVariants} style={{ color: 'var(--champagne)', fontSize: 14, fontWeight: 700, marginBottom: 16 }}>
                      2. Elige tu Especialista
                    </motion.h4>
                    
                    {/* Search Bar */}
                    <motion.div variants={itemVariants} style={{ position: 'relative', marginBottom: 16 }}>
                      <Search size={16} color="#94a3b8" style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)' }} />
                      <input 
                        type="text" 
                        placeholder="Buscar por nombre..." 
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        style={{
                          width: '100%',
                          background: '#f7f7f5',
                          border: '1px solid rgba(217, 192, 143, 0.2)',
                          borderRadius: 12,
                          padding: '12px 16px 12px 40px',
                          color: '#0f172a',
                          fontSize: 14,
                          outline: 'none',
                          fontFamily: 'inherit'
                        }}
                      />
                    </motion.div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 12 }}>
                      {filteredStaff.map(s => (
                        <motion.button 
                          variants={itemVariants}
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          key={s.id} 
                          onClick={() => setSelectedBarber(s)}
                          style={{
                            background: selectedBarber?.id === s.id ? 'rgba(17,17,17,0.1)' : '#f7f7f5',
                            border: `1px solid ${selectedBarber?.id === s.id ? 'var(--champagne)' : 'rgba(217, 192, 143, 0.15)'}`,
                            padding: 16, borderRadius: 12, textAlign: 'center', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10
                          }}
                        >
                          <div style={{ width: 60, height: 60, borderRadius: '50%', background: 'rgba(217, 192, 143, 0.12)', overflow: 'hidden' }}>
                            {s.image_url ? (
                              <img src={s.image_url} alt={s.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            ) : (
                              <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--champagne)' }}><User size={24} /></div>
                            )}
                          </div>
                          <div>
                            <p style={{ color: '#0f172a', fontWeight: 700, margin: '0 0 2px', fontSize: 13 }}>{s.name}</p>
                            <p style={{ color: '#64748b', fontSize: 11, margin: 0 }}>{(s.role || '').split('|')[0]}</p>
                          </div>
                        </motion.button>
                      ))}
                    </div>
                  </motion.div>
                );
              })()}

              {step === 3 && (
                <motion.div key="step3" variants={containerVariants} initial="hidden" animate="show" exit="exit">
                  <motion.h4 variants={itemVariants} style={{ color: 'var(--champagne)', fontSize: 14, fontWeight: 700, marginBottom: 16 }}>3. Fecha y Hora</motion.h4>
                  
                  {(() => {
                    const days = [];
                    const today = new Date();
                    for (let i = 0; i < 14; i++) {
                      const d = new Date(today);
                      d.setDate(today.getDate() + i);
                      days.push(d);
                    }
                    
                    const dayNames = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
                    const monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

                    return (
                      <div style={{ 
                        overflowX: 'auto', paddingBottom: 16, marginBottom: 12,
                        scrollbarWidth: 'none', msOverflowStyle: 'none'
                      }}>
                        <style>{`.hide-scroll::-webkit-scrollbar { display: none; }`}</style>
                        <motion.div variants={itemVariants} className="hide-scroll" style={{ display: 'flex', gap: 12 }}>
                          {days.map(d => {
                            const yyyy = d.getFullYear();
                            const mm = String(d.getMonth() + 1).padStart(2, '0');
                            const dd = String(d.getDate()).padStart(2, '0');
                            const isoStr = `${yyyy}-${mm}-${dd}`;
                            const isSelected = selectedDate === isoStr;
                            
                            return (
                              <motion.button 
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                key={isoStr}
                                onClick={() => setSelectedDate(isoStr)}
                                style={{
                                  flexShrink: 0,
                                  width: 64, height: 86,
                                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                                  borderRadius: 16, cursor: 'pointer',
                                  background: isSelected ? '#e8d4b0' : '#f7f7f5',
                                  color: isSelected ? '#111111' : '#0f172a',
                                  transition: 'background 0.2s ease, box-shadow 0.2s ease',
                                  border: isSelected ? 'none' : '1px solid rgba(217, 192, 143, 0.15)',
                                  boxShadow: isSelected ? '0 4px 15px rgba(232,212,176,0.35)' : 'none'
                                }}
                              >
                                <span style={{ fontSize: 11, fontWeight: 700, opacity: isSelected ? 0.7 : 0.5, marginBottom: 4, textTransform: 'uppercase' }}>
                                  {dayNames[d.getDay()]}
                                </span>
                                <span style={{ fontSize: 22, fontWeight: 800, marginBottom: 2 }}>
                                  {d.getDate()}
                                </span>
                                <span style={{ fontSize: 10, fontWeight: 700, opacity: isSelected ? 0.7 : 0.5, textTransform: 'uppercase' }}>
                                  {monthNames[d.getMonth()]}
                                </span>
                              </motion.button>
                            );
                          })}
                        </motion.div>
                      </div>
                    );
                  })()}

                  {selectedDate && (() => {
                    const availableSlots = getAvailableHours();
                    if (!storeIsOpen) {
                      return (
                        <div style={{
                          position: 'relative', overflow: 'hidden', borderRadius: 16,
                          border: '1px solid rgba(239,68,68,0.2)',
                          background: 'linear-gradient(135deg, rgba(239,68,68,0.10), rgba(239,68,68,0.03))',
                          boxShadow: '0 8px 24px rgba(239,68,68,0.08)',
                          padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12
                        }}>
                          <div style={{ flexShrink: 0, width: 36, height: 36, borderRadius: '50%', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Lock size={16} color="#f87171" />
                          </div>
                          <div style={{ textAlign: 'left', minWidth: 0 }}>
                            <p style={{ color: '#f87171', fontSize: 11, fontWeight: 900, textTransform: 'uppercase', letterSpacing: 0.5, margin: 0, lineHeight: 1.2 }}>Clínica cerrada</p>
                            <p style={{ color: 'rgba(248,113,113,0.7)', fontSize: 11, fontWeight: 500, margin: '2px 0 0 0', lineHeight: 1.3 }}>Las reservas están bloqueadas por ahora. Vuelve más tarde.</p>
                          </div>
                        </div>
                      );
                    }
                    if (availableSlots.length === 0) {
                      return (
                        <div style={{ textAlign: 'center', color: '#64748b', padding: 20 }}>
                          No hay turnos disponibles.
                        </div>
                      );
                    }

                    const format12Hour = (time24) => {
                      const [h, m] = time24.split(':').map(Number);
                      const ampm = h >= 12 ? 'PM' : 'AM';
                      const h12 = h % 12 || 12;
                      return `${h12}:${m === 0 ? '00' : m} ${ampm}`;
                    };

                    const morning = availableSlots.filter(t => parseInt(t.split(':')[0]) < 12);
                    const afternoon = availableSlots.filter(t => { const h = parseInt(t.split(':')[0]); return h >= 12 && h < 17; });
                    const evening = availableSlots.filter(t => parseInt(t.split(':')[0]) >= 17);

                    const renderSlotGrid = (title, slots) => {
                      if (slots.length === 0) return null;
                      return (
                        <motion.div variants={itemVariants} style={{ marginBottom: 20 }}>
                          <h5 style={{ color: '#0f172a', fontSize: 13, marginBottom: 12 }}>{title}</h5>
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 8 }}>
                            {slots.map(time => (
                              <motion.button 
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                key={time}
                                onClick={() => setSelectedTime(time)}
                                style={{
                                  background: selectedTime === time ? '#e8d4b0' : '#f7f7f5',
                                  color: selectedTime === time ? '#111111' : '#0f172a',
                                  border: '1px solid rgba(217, 192, 143, 0.15)', padding: '10px 0', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer'
                                }}
                              >
                                {format12Hour(time)}
                              </motion.button>
                            ))}
                          </div>
                        </motion.div>
                      );
                    };

                    return (
                      <div>
                        {renderSlotGrid('Mañana', morning)}
                        {renderSlotGrid('Tarde', afternoon)}
                        {renderSlotGrid('Noche', evening)}
                      </div>
                    );
                  })()}
                </motion.div>
              )}

              {step === 4 && (
                <motion.div key="step4" variants={containerVariants} initial="hidden" animate="show" exit="exit" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                  <motion.h4 variants={itemVariants} style={{ color: 'var(--champagne)', fontSize: 14, fontWeight: 700 }}>4. Personaliza tu Experiencia</motion.h4>
                  
                  <motion.div variants={itemVariants} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Coffee size={18} color="var(--champagne)" />
                      <h5 style={{ color: '#0f172a', fontSize: 12, margin: 0, textTransform: 'uppercase', letterSpacing: 1 }}>¿Qué te gustaría tomar?</h5>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 12 }}>
                      {[
                        { id: 'Cerveza Fría', label: 'Cerveza Fría', img: '/cerveza.webp', fallbackIcon: <Beer size={32} color="var(--champagne)" /> },
                        { id: 'Café Premium', label: 'Café Premium', img: '/cafe.webp', fallbackIcon: <Coffee size={32} color="var(--champagne)" /> },
                        { id: 'Whiskey Premium', label: 'Whiskey Premium', img: '/whiskey.webp', fallbackIcon: <Martini size={32} color="var(--champagne)" /> },
                        { id: 'Agua Natural', label: 'Agua Natural', img: '/agua.webp', fallbackIcon: <GlassWater size={32} color="var(--champagne)" /> }
                      ].map(bev => {
                        const isSelected = selectedBeverage === bev.id;
                        return (
                          <button
                            key={bev.id}
                            onClick={() => setSelectedBeverage(bev.id)}
                            style={{
                              position: 'relative', overflow: 'hidden', borderRadius: 12, border: `1px solid ${isSelected ? 'var(--champagne)' : 'rgba(217, 192, 143, 0.2)'}`,
                              background: isSelected ? 'rgba(17,17,17,0.1)' : '#f7f7f5', height: 100, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', cursor: 'pointer', padding: 8
                            }}
                          >
                            <div style={{ position: 'absolute', top: 4, right: 4, width: 16, height: 16, borderRadius: '50%', background: isSelected ? 'var(--champagne)' : 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ffffff', fontSize: 10, fontWeight: 800 }}>
                              {isSelected && '✓'}
                            </div>
                            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 0 }}>
                              {!imgErrors[bev.id] ? (
                                <img src={bev.img} alt={bev.label} onError={() => setImgErrors(prev => ({ ...prev, [bev.id]: true }))} style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.8 }} />
                              ) : (
                                <span style={{ fontSize: 30 }}>{bev.fallbackIcon}</span>
                              )}
                              <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, #111, transparent)' }} />
                            </div>
                            <span style={{ position: 'relative', zIndex: 1, color: isSelected ? 'var(--champagne)' : 'white', fontSize: 10, fontWeight: 800, textTransform: 'uppercase', textAlign: 'center', width: '100%' }}>{bev.label}</span>
                          </button>
                        )
                      })}
                    </div>
                  </motion.div>

                  {!(selectedService?.category || '').toLowerCase().includes('tatuaje') && (
                    <motion.div variants={itemVariants} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <MessageSquare size={18} color="var(--champagne)" />
                        <h5 style={{ color: '#0f172a', fontSize: 12, margin: 0, textTransform: 'uppercase', letterSpacing: 1 }}>¿Algo que debamos saber?</h5>
                      </div>
                      <textarea
                        value={notes}
                        onChange={e => setNotes(e.target.value)}
                        placeholder="Ej: Sensibilidad en la muela inferior, alergia a algún medicamento..."
                        style={{
                          width: '100%', padding: 16, background: '#f7f7f5', border: '1px solid rgba(217, 192, 143, 0.2)',
                          borderRadius: 12, color: '#0f172a', fontSize: 13, minHeight: 80, resize: 'none', fontFamily: 'inherit'
                        }}
                      />
                    </motion.div>
                  )}
                </motion.div>
              )}

              {step === 5 && (() => {
                const format12Hour = (time24) => {
                  const [h, m] = time24.split(':').map(Number);
                  const ampm = h >= 12 ? 'PM' : 'AM';
                  const h12 = h % 12 || 12;
                  return `${h12}:${m === 0 ? '00' : m} ${ampm}`;
                };

                const formatDateText = (isoDate) => {
                  if (!isoDate) return '';
                  const [y, m, d] = isoDate.split('-');
                  const monthNames = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
                  return `${parseInt(d, 10)} ${monthNames[parseInt(m, 10) - 1]} ${y}`;
                };

                return (
                  <motion.div 
                    key="step4" 
                    initial={{ opacity: 0, y: 50, scale: 0.9 }} 
                    animate={{ opacity: 1, y: 0, scale: 1 }} 
                    transition={{ type: 'spring', damping: 25, stiffness: 120 }}
                    style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', padding: '10px 0' }}
                  >
                    <motion.div
                      initial={{ scale: 0, rotate: -180 }}
                      animate={{ scale: 1, rotate: 0 }}
                      transition={{ type: 'spring', damping: 15, stiffness: 100, delay: 0.3 }}
                      style={{
                        width: 70, height: 70, borderRadius: '50%', background: '#e8d4b0',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 10px 30px rgba(232,212,176,0.35)',
                        marginBottom: -35, zIndex: 10, position: 'relative'
                      }}
                    >
                      <CheckCircle size={35} color="#111111" strokeWidth={2.5} />
                    </motion.div>
                    
                    {/* TICKET CONTAINER */}
                    <div style={{
                      width: '100%',
                      background: '#ffffff',
                      border: '1px solid rgba(217, 192, 143, 0.15)',
                      borderRadius: 24,
                      position: 'relative',
                      overflow: 'hidden',
                      boxShadow: '0 20px 40px rgba(0,0,0,0.10), inset 0 1px 1px rgba(255,255,255,0.8)',
                      backdropFilter: 'blur(20px)',
                      WebkitBackdropFilter: 'blur(20px)'
                    }}>
                      
                      {/* Ticket Top: Barber Info */}
                      <div style={{
                        padding: '50px 24px 30px',
                        position: 'relative',
                        background: 'linear-gradient(180deg, rgba(17,17,17,0.05) 0%, transparent 100%)'
                      }}>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                          <div style={{ 
                            width: 80, height: 80, borderRadius: '50%', overflow: 'hidden', 
                            border: '2px solid rgba(17,17,17,0.3)', marginBottom: 16,
                            boxShadow: '0 10px 20px rgba(0,0,0,0.10)'
                          }}>
                            {selectedBarber?.image_url ? (
                              <img src={selectedBarber.image_url} alt={selectedBarber.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            ) : (
                              <div style={{ width: '100%', height: '100%', background: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--champagne)' }}><User size={30} /></div>
                            )}
                          </div>
                          <h3 style={{ color: '#0f172a', margin: '0 0 4px', fontSize: 22, fontWeight: 800 }}>{selectedBarber?.name}</h3>
                          <span style={{ 
                            background: 'rgba(17,17,17,0.1)', color: 'var(--champagne)', 
                            padding: '4px 12px', borderRadius: 20, fontSize: 11, fontWeight: 700, letterSpacing: '1px'
                          }}>ESPECIALISTA DIENTES SANOS</span>
                        </div>
                      </div>

                      {/* Ticket Divider (Perforation) */}
                      <div style={{ position: 'relative', height: 0, width: '100%' }}>
                        {/* Left Cutout */}
                        <div style={{
                          position: 'absolute', top: -15, left: -15, width: 30, height: 30,
                          borderRadius: '50%', background: '#ffffff', borderRight: '1px solid rgba(217, 192, 143, 0.15)'
                        }} />
                        {/* Right Cutout */}
                        <div style={{
                          position: 'absolute', top: -15, right: -15, width: 30, height: 30,
                          borderRadius: '50%', background: '#ffffff', borderLeft: '1px solid rgba(217, 192, 143, 0.15)'
                        }} />
                        {/* Dashed Line */}
                        <div style={{
                          position: 'absolute', top: 0, left: 20, right: 20,
                          borderTop: '2px dashed rgba(217, 192, 143, 0.35)'
                        }} />
                      </div>

                      {/* Ticket Bottom: Details */}
                      <div style={{ padding: '30px 24px 24px', position: 'relative' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: 20, marginBottom: 24 }}>
                          <div>
                            <p style={{ color: '#64748b', fontSize: 11, fontWeight: 600, margin: '0 0 6px', textTransform: 'uppercase' }}>Fecha</p>
                            <p style={{ color: '#0f172a', fontSize: 15, fontWeight: 700, margin: 0 }}>{formatDateText(selectedDate)}</p>
                          </div>
                          <div>
                            <p style={{ color: '#64748b', fontSize: 11, fontWeight: 600, margin: '0 0 6px', textTransform: 'uppercase' }}>Hora</p>
                            <p style={{ color: '#0f172a', fontSize: 15, fontWeight: 700, margin: 0 }}>{format12Hour(selectedTime)}</p>
                          </div>
                        </div>
                        <div style={{ marginBottom: 24 }}>
                          <p style={{ color: '#64748b', fontSize: 11, fontWeight: 600, margin: '0 0 6px', textTransform: 'uppercase' }}>Servicio</p>
                          <p style={{ color: '#0f172a', fontSize: 15, fontWeight: 700, margin: 0 }}>{selectedService?.name}</p>
                        </div>
                        
                        {/* Fake Barcode */}
                        <div style={{ 
                          height: 40, width: '100%', 
                          background: `repeating-linear-gradient(90deg, rgba(15,23,42,0.8), rgba(15,23,42,0.8) 3px, transparent 3px, transparent 6px, rgba(15,23,42,0.8) 6px, rgba(15,23,42,0.8) 8px, transparent 8px, transparent 12px, rgba(15,23,42,0.8) 12px, rgba(15,23,42,0.8) 15px, transparent 15px, transparent 18px)`,
                          opacity: 0.5, borderRadius: 4
                        }} />
                        <p style={{ textAlign: 'center', margin: '8px 0 0', fontSize: 10, letterSpacing: '4px', color: '#94a3b8' }}>
                          {selectedDate.replace(/-/g, '')}{selectedTime.replace(':', '')}VIP
                        </p>
                      </div>
                    </div>
                  </motion.div>
                );
              })()}
            </AnimatePresence>
          )}
        </div>

        {/* Footer Actions */}
        {step < 5 && (
          <div style={{ padding: 24, borderTop: '1px solid rgba(217, 192, 143, 0.15)', display: 'flex', gap: 12 }}>
            {step > 1 && (
              <button onClick={handleBack} style={{
                flex: 1, padding: '14px 0', borderRadius: 12, background: '#f7f7f5',
                color: '#475569', border: 'none', fontWeight: 700, cursor: 'pointer'
              }}>Atrás</button>
            )}
            
            {step < 4 ? (
              <button 
                onClick={handleNext} 
                disabled={(step === 1 && !selectedService) || (step === 2 && !selectedBarber) || (step === 3 && !selectedTime)}
                style={{
                  flex: 2, padding: '14px 0', borderRadius: 12, background: '#e8d4b0',
                  color: '#111111', border: 'none', fontWeight: 800, cursor: 'pointer', opacity: ((step === 1 && !selectedService) || (step === 2 && !selectedBarber) || (step === 3 && !selectedTime)) ? 0.5 : 1
                }}
              >Siguiente</button>
            ) : (
              <button 
                onClick={handleConfirm} 
                disabled={isSubmitting}
                style={{
                  flex: 2, padding: '14px 0', borderRadius: 12, background: '#e8d4b0',
                  color: '#111111', border: 'none', fontWeight: 800, cursor: 'pointer', opacity: isSubmitting ? 0.5 : 1
                }}
              >{isSubmitting ? 'Confirmando...' : 'Confirmar Cita'}</button>
            )}
          </div>
        )}
        
        {step === 5 && (
          <div style={{ padding: 24 }}>
            <button 
              onClick={() => {
                setIsClosing(true);
                setTimeout(() => {
                  onClose();
                  window.dispatchEvent(new Event('panda_booking_created'));
                }, 600);
              }} 
              style={{
                width: '100%', padding: '16px 0', borderRadius: 12, background: '#e8d4b0',
                color: '#111111', border: 'none', fontWeight: 800, cursor: 'pointer', fontSize: 16
              }}
            >
              Listo
            </button>
          </div>
        )}

      </motion.div>
    </motion.div>
  );
}
