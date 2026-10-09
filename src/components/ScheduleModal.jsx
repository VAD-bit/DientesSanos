import React, { useState, useEffect } from 'react';
import { 
  X, 
  Calendar as CalendarIcon, 
  Clock, 
  User, 
  ChevronRight,
  ChevronLeft,
  Check
} from 'lucide-react';
import { dataService } from '../services/dataService';
import AnimatedModal from './AnimatedModal';
import { SkeletonGrid } from './Skeleton';

const ScheduleModal = ({ isOpen, onClose, client, service, staff, onSchedule, defaultDate, excludeAppointmentId = null }) => {
  const [selectedDate, setSelectedDate] = useState(defaultDate || new Date());
  const [availableSlots, setAvailableSlots] = useState([]);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && staff) {
      loadAvailability();
    }
  }, [isOpen, selectedDate, staff, service, excludeAppointmentId]);

  const loadAvailability = async () => {
    try {
      setLoading(true);

      const allApps = await dataService.getAppointmentsByState(['Agendado', 'En Silla', 'En Lavado', 'Por Pagar', 'Completado']);
      const dailyApps = allApps.filter(a =>
        a.scheduled_at &&
        String(a.staff_id) === String(staff.id) &&
        String(a.id) !== String(excludeAppointmentId || '') &&
        new Date(a.scheduled_at).toDateString() === selectedDate.toDateString()
      );
      const targetDuration = Math.max(30, Number(service?.duration) || 60);

      const slots = [];
      const now = new Date();
      const isToday = selectedDate.toDateString() === now.toDateString();
      const currentHour = now.getHours();
      const currentMinutes = now.getMinutes();

      for (let hour = 0; hour < 24; hour++) {
        for (let min of [0, 30]) {
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
            isAvailable: !isOccupied,
            isOccupied
          });
        }
      }
      setAvailableSlots(slots);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSchedule = () => {
    if (!selectedSlot) return;
    
    const [hours, minutes] = selectedSlot.split(':');
    const scheduledAt = new Date(selectedDate);
    scheduledAt.setHours(parseInt(hours), parseInt(minutes), 0, 0);
    
    onSchedule(scheduledAt.toISOString());
    onClose();
  };

  return (
    <AnimatedModal isOpen={isOpen}>
      {(overlayClass, cardClass) => (
        <div className={overlayClass} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'var(--bg-secondary)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', zIndex: 99999, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px', paddingTop: 'max(20px, env(safe-area-inset-top, 20px))' }}>
          <style>
            {`
              .schedule-slot-btn::-webkit-scrollbar { width: 6px; }
              .schedule-slot-btn::-webkit-scrollbar-track { background: rgba(255,255,255,0.02); border-radius: 10px; }
              .schedule-slot-btn::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 10px; }
              .schedule-slot-btn::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.2); }
              @keyframes spin { 100% { transform: rotate(360deg); } }
            `}
          </style>
          <div className={`${cardClass.replace('global-modal-card', '')}`} style={{ maxWidth: '680px', width: '100%', borderRadius: '28px', border: '1px solid rgba(255,255,255,0.08)', background: 'var(--bg-secondary)', backdropFilter: 'blur(40px)', zIndex: 100000, position: 'relative', boxShadow: '0 30px 60px -12px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.04)', overflow: 'hidden', display: 'flex', flexDirection: 'column', maxHeight: '90vh' }}>
            
            {/* Header */}
            <div style={{ padding: '28px 32px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                {staff?.image_url ? (
                   <img src={staff.image_url} alt={staff.name} style={{ width: '48px', height: '48px', borderRadius: '16px', objectFit: 'cover', border: '2px solid rgba(255,255,255,0.1)' }} />
                ) : (
                   <div style={{ width: '48px', height: '48px', borderRadius: '16px', background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', fontWeight: 'bold', color: 'var(--gold-primary)', border: '1px solid rgba(255,255,255,0.1)' }}>
                     {staff?.name?.charAt(0) || <User size={24} />}
                   </div>
                )}
                <div>
                  <h2 style={{ fontSize: '22px', fontWeight: '950', letterSpacing: '-0.5px', margin: 0, color: 'white', fontFamily: 'Outfit, sans-serif' }}>
                    Agendar <span style={{ color: 'var(--gold-primary)' }}>Turno</span>
                  </h2>
                  <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '13px', margin: '4px 0 0 0', fontWeight: '500' }}>
                    {service?.name || 'Servicio'} con <span style={{ color: 'white', fontWeight: '700' }}>{staff?.name || 'Odontólogo'}</span>
                  </p>
                </div>
              </div>
              <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.6)', width: '36px', height: '36px', borderRadius: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }} onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; e.currentTarget.style.color = 'white'; }} onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.color = 'rgba(255,255,255,0.6)'; }}><X size={18} /></button>
            </div>

            {/* Scrollable Content */}
            <div className="custom-scrollbar" style={{ padding: '24px 32px', overflowY: 'auto', flex: 1 }}>
              
              {/* Date Selector */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', padding: '16px 20px', borderRadius: '20px' }}>
                <button onClick={() => {
                  const prev = new Date(selectedDate);
                  prev.setDate(selectedDate.getDate() - 1);
                  setSelectedDate(prev);
                }} style={{ background: 'rgba(255,255,255,0.05)', border: 'none', color: 'white', width: '36px', height: '36px', borderRadius: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }} onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'} onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}><ChevronLeft size={20} /></button>
                
                <div style={{ textAlign: 'center', flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <div style={{ fontSize: '11px', color: 'var(--gold-primary)', fontWeight: '800', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '4px' }}>Fecha de Cita</div>
                  <div style={{ fontWeight: '800', fontSize: '18px', color: 'white', textTransform: 'capitalize' }}>
                    {selectedDate.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}
                  </div>
                </div>

                <button onClick={() => {
                  const next = new Date(selectedDate);
                  next.setDate(selectedDate.getDate() + 1);
                  setSelectedDate(next);
                }} style={{ background: 'rgba(255,255,255,0.05)', border: 'none', color: 'white', width: '36px', height: '36px', borderRadius: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }} onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'} onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}><ChevronRight size={20} /></button>
              </div>

              {/* Slots Section */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                  <label style={{ fontSize: '11px', fontWeight: '800', color: 'rgba(255,255,255,0.4)', letterSpacing: '1px', textTransform: 'uppercase' }}>Horarios Disponibles</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Clock size={13} color="rgba(255,255,255,0.3)" />
                    <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.35)', fontWeight: '600' }}>Selecciona tu hora</span>
                  </div>
                </div>
                
                {loading ? (
                  <SkeletonGrid items={12} itemHeight={40} minWidth={80} />
                ) : availableSlots.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '40px 20px', background: 'rgba(255,255,255,0.02)', borderRadius: '20px', border: '1px dashed rgba(255,255,255,0.08)' }}>
                    <CalendarIcon size={32} color="rgba(255,255,255,0.2)" style={{ marginBottom: '12px' }} />
                    <div style={{ color: 'white', fontWeight: '800', fontSize: '15px', marginBottom: '6px' }}>No hay horarios disponibles</div>
                    <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '13px' }}>Selecciona otra fecha.</div>
                  </div>
                ) : (
                  <div className="schedule-slot-btn custom-scrollbar" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(90px, 1fr))', gap: '10px', maxHeight: '320px', overflowY: 'auto', paddingRight: '8px' }}>
                    {availableSlots.map(slot => {
                      const [h, m] = slot.time.split(':');
                      const hour = parseInt(h);
                      const ampm = hour >= 12 ? 'PM' : 'AM';
                      const h12 = hour % 12 || 12;
                      const time12 = `${h12}:${m} ${ampm}`;
                      const isSel = selectedSlot === slot.time;

                      return (
                        <button
                          key={slot.time}
                          disabled={!slot.isAvailable}
                          onClick={() => setSelectedSlot(slot.time)}
                          style={{
                            padding: '14px 0',
                            borderRadius: '14px',
                            fontSize: '13px',
                            fontWeight: '800',
                            cursor: slot.isAvailable ? 'pointer' : 'not-allowed',
                            background: isSel ? 'linear-gradient(135deg, var(--champagne-dark), var(--champagne-light))' : slot.isAvailable ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.015)',
                            border: isSel ? 'none' : slot.isAvailable ? '1px solid rgba(255,255,255,0.07)' : '1px solid rgba(255,255,255,0.03)',
                            color: isSel ? 'black' : slot.isAvailable ? 'rgba(255,255,255,0.75)' : 'rgba(255,255,255,0.15)',
                            transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                            textDecoration: !slot.isAvailable ? 'line-through' : 'none',
                            boxShadow: isSel ? '0 8px 20px rgba(17, 17, 17, 0.3)' : 'none',
                            transform: isSel ? 'scale(1.02)' : 'scale(1)',
                          }}
                          onMouseEnter={e => {
                            if(slot.isAvailable && !isSel) {
                              e.currentTarget.style.borderColor = 'rgba(17, 17, 17,0.4)';
                              e.currentTarget.style.background = 'rgba(255,255,255,0.06)';
                            }
                          }}
                          onMouseLeave={e => {
                            if(slot.isAvailable && !isSel) {
                              e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)';
                              e.currentTarget.style.background = 'rgba(255,255,255,0.03)';
                            }
                          }}
                        >
                          {time12}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Sticky Footer */}
            <div style={{ background: 'var(--bg-secondary)', backdropFilter: 'blur(20px)', borderTop: '1px solid rgba(255,255,255,0.06)', padding: '18px 32px', flexShrink: 0 }}>
              <button 
                onClick={handleSchedule}
                disabled={!selectedSlot}
                style={{ 
                  width: '100%', 
                  height: '56px', 
                  borderRadius: '18px', 
                  fontSize: '15px', 
                  fontWeight: '800',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '10px',
                  background: selectedSlot ? 'linear-gradient(135deg, var(--champagne-dark), var(--champagne-light))' : 'rgba(17, 17, 17,0.05)',
                  color: selectedSlot ? 'black' : 'rgba(17, 17, 17,0.3)',
                  border: 'none',
                  cursor: selectedSlot ? 'pointer' : 'not-allowed',
                  transition: 'all 0.25s',
                  boxShadow: selectedSlot ? '0 12px 24px rgba(17, 17, 17, 0.25)' : 'none',
                  transform: selectedSlot ? 'translateY(0)' : 'translateY(1px)'
                }}
                onMouseEnter={e => { if(selectedSlot) e.currentTarget.style.transform = 'translateY(-2px)'; }}
                onMouseLeave={e => { if(selectedSlot) e.currentTarget.style.transform = 'translateY(0)'; }}
              >
                {selectedSlot ? (
                  <>
                    <Check size={20} strokeWidth={3} color="black" /> Confirmar Cita a las {(() => {
                      const [h, m] = selectedSlot.split(':');
                      const hour = parseInt(h);
                      const ampm = hour >= 12 ? 'PM' : 'AM';
                      const h12 = hour % 12 || 12;
                      return `${h12}:${m} ${ampm}`;
                    })()}
                  </>
                ) : (
                  <>Selecciona un Horario</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </AnimatedModal>
  );
};

export default ScheduleModal;
