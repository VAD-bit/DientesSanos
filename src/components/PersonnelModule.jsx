import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useNotifs } from '../context/NotificationContext';
import { supabase } from '../lib/supabase';
import { 
  Scissors, 
  Trash2, 
  Edit2, 
  UserPlus,
  Loader2,
  Droplets,
  Rocket,
  Settings,
  Camera,
  X,
  User,
  Check,
  CreditCard,
  Headset,
  Phone,
  MapPin,
  Key,
  Lock,
  Mail,
  MoreHorizontal,
  ChevronRight,
  Shield,
  Plus,
  Cake,
  BarChart2,
  Banknote,
  PartyPopper,
  Star,
  FileText,
  Upload,
  Search,
  Maximize2,
  Undo2,
  Flame,
  Clock,
  LayoutGrid,
  Table,
  TrendingUp,
  TrendingDown,
  Info,
  Award,
  MessageSquare,
  ThumbsUp,
  ThumbsDown,
  ChevronDown,
  Users,
  CalendarDays,
  Calendar,
  Sparkles,
  Timer,
  CheckCircle2,
  LogIn,
  LogOut,
  Activity,
  DollarSign,
  Target,
  TrendingUp as TrendingUpIcon,
  Globe,
  Film
} from 'lucide-react';
import { dataService } from '../services/dataService';
import { SkeletonList, SkeletonGrid } from './Skeleton';
import PandaSelect from './PandaSelect';
import PandaCamera from './PandaCamera';
import StaffProfileModal from './StaffProfileModal';
import PandaDatePicker from './PandaDatePicker';
import { formatName } from '../utils/stringUtils';
import DateMaskInput from './DateMaskInput';

import { useAuth } from '../context/AuthContext';
import { useDialog } from '../context/DialogContext';
import RoleManagerModal from './RoleManagerModal';
import AnimatedModal from './AnimatedModal';
import FieldLabel from './FieldLabel';
import { useScrollLock } from '../hooks/useScrollLock';

const SETTLEMENT_ACCOUNTS = [
  'Efectivo ($)', 'Efectivo (Bs)', 'Pago Móvil', 'Punto de venta',
  'Zelle', 'Zinli', 'Binance / USDT', 'Transferencia'
];

const emptySettlementModal = () => ({
  isOpen: false,
  staffId: null,
  staffName: null,
  earnings: null,
  allocations: Object.fromEntries(SETTLEMENT_ACCOUNTS.map(account => [account, '']))
});

const formatSettlementBs = value => Number(value || 0).toLocaleString('es-VE', {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2
});

const availableModules = [
  { id: 'my-profile', label: 'Mi Perfil' },
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'scheduling', label: 'Agenda' },
  { id: 'reception', label: 'Recepción (Padre)' },
  { id: 'checkout', label: 'Caja (Pro)' },
  { id: 'barber', label: 'Panel Odontólogo (Hijo)' },
  { id: 'barista', label: 'Panel de Barista' },
  { id: 'clients', label: 'Clientes' },
  { id: 'personnel', label: 'Personal' },
  { id: 'services', label: 'Servicios' },
  { id: 'inventory', label: 'Inventario' },
  { id: 'finance', label: 'Caja Chica' },
  { id: 'reports', label: 'Reportes' },
  { id: 'settings', label: 'Ajustes' },
  { id: 'history', label: 'Historial' },
];

// Pequeño menú que aparece junto al avatar para elegir cámara o galería,
// sin tener que abrir el modal completo de PandaCamera solo para preguntar.
const PhotoSourceMenu = ({ isOpen, onCamera, onGallery, onClose }) => {
  const [mounted, setMounted] = useState(isOpen);
  const [closing, setClosing] = useState(false);
  const closeTimer = useRef(null);

  useEffect(() => {
    if (isOpen) {
      clearTimeout(closeTimer.current);
      setMounted(true);
      setClosing(false);
    } else if (mounted) {
      setClosing(true);
      closeTimer.current = setTimeout(() => {
        setMounted(false);
        setClosing(false);
      }, 130);
    }
    return () => clearTimeout(closeTimer.current);
  }, [isOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!mounted) return null;

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 998 }} />
      <div className={closing ? 'popover-pop-exit' : 'popover-pop'} style={{
        position: 'absolute',
        top: '128px',
        left: 0,
        width: '190px',
        backgroundColor: 'var(--bg-secondary)',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: '14px',
        boxShadow: '0 20px 40px rgba(0,0,0,0.6)',
        overflow: 'hidden',
        zIndex: 999,
        pointerEvents: closing ? 'none' : 'auto'
      }}>
        <button
          type="button"
          onClick={onCamera}
          className="tap-scale menu-row-hover"
          style={{ width: '100%', padding: '12px 14px', display: 'flex', alignItems: 'center', gap: '10px', background: 'none', border: 'none', color: 'white', fontSize: '13px', fontWeight: '700', cursor: 'pointer', textAlign: 'left' }}
        >
          <Camera size={16} color="var(--gold-primary)" /> Tomar foto
        </button>
        <div style={{ height: '1px', background: 'rgba(255,255,255,0.08)' }} />
        <button
          type="button"
          onClick={onGallery}
          className="tap-scale menu-row-hover"
          style={{ width: '100%', padding: '12px 14px', display: 'flex', alignItems: 'center', gap: '10px', background: 'none', border: 'none', color: 'white', fontSize: '13px', fontWeight: '700', cursor: 'pointer', textAlign: 'left' }}
        >
          <Upload size={16} color="var(--gold-primary)" /> Subir de galería
        </button>
      </div>
    </>
  );
};

// Modal de historial de asistencia: racha + estadísticas + mapa semanal de 35 días + historial detallado de turnos
const AttendanceHistoryModal = ({ member, dates, logs, streak, onClose, overlayClass, cardClass, isMobile }) => {
  const memberLogs = (logs || [])
    .filter(l => l.staff_id === member.id)
    .sort((a, b) => new Date(b.check_in) - new Date(a.check_in));

  const activeSession = memberLogs.find(l => !l.check_out);

  // Estadísticas calculadas
  let totalMinutes = 0;
  let closedSessionsCount = 0;
  memberLogs.forEach(l => {
    if (l.check_out && l.check_in) {
      const mins = Math.round((new Date(l.check_out) - new Date(l.check_in)) / 60000);
      if (mins > 0) {
        totalMinutes += mins;
        closedSessionsCount++;
      }
    }
  });

  const totalHours = (totalMinutes / 60).toFixed(1);
  const avgMinutesPerShift = closedSessionsCount > 0 ? Math.round(totalMinutes / closedSessionsCount) : 0;
  const avgShiftHours = Math.floor(avgMinutesPerShift / 60);
  const avgShiftMins = avgMinutesPerShift % 60;
  const avgShiftFormatted = avgShiftHours > 0 ? `${avgShiftHours}h ${avgShiftMins}m` : `${avgShiftMins}m`;

  // Matriz de los últimos 35 días alineados por día de la semana (Lunes a Domingo)
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const days = [];
  for (let i = 34; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().split('T')[0];
    const isToday = d.getTime() === today.getTime();
    const isPresent = dates.has(key);
    const isCurrentActive = isToday && !!activeSession;

    days.push({
      key,
      date: d,
      dayNum: d.getDate(),
      monthName: d.toLocaleDateString('es-VE', { month: 'short' }),
      weekdayIndex: (d.getDay() + 6) % 7, // 0 = Lunes, 6 = Domingo
      present: isPresent,
      active: isCurrentActive,
      isToday
    });
  }

  const uniquePresentDays = days.filter(d => d.present).length;

  const formatTime = (isoString) => {
    if (!isoString) return '--:--';
    return new Date(isoString).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  };

  const formatDuration = (checkIn, checkOut) => {
    if (!checkOut) return 'En curso';
    const mins = Math.round((new Date(checkOut) - new Date(checkIn)) / 60000);
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  };

  return (
    <div 
      onClick={onClose} 
      className={overlayClass} 
      style={{ 
        position: 'fixed', 
        inset: 0, 
        zIndex: 30000, 
        background: 'rgba(0,0,0,0.85)', 
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        padding: isMobile ? '10px' : '16px',
        paddingTop: isMobile ? 'max(10px, env(safe-area-inset-top, 10px))' : 'max(16px, env(safe-area-inset-top, 16px))'
      }}
    >
      <div 
        onClick={e => e.stopPropagation()} 
        className={`glass-card ${cardClass?.replace('global-modal-card', '') || ''} att-history-modal`} 
        style={{ 
          width: '100%', 
          maxWidth: '580px', 
          maxHeight: isMobile ? '92vh' : '90vh', 
          overflowY: 'auto', 
          padding: isMobile ? '16px 14px' : '24px', 
          borderRadius: isMobile ? '20px' : '24px',
          background: 'var(--bg-secondary)',
          border: '1px solid rgba(255,255,255,0.08)',
          boxShadow: '0 30px 60px -12px rgba(0,0,0,0.7), 0 0 0 1px rgba(17, 17, 17,0.08) inset',
          display: 'flex',
          flexDirection: 'column',
          gap: isMobile ? '14px' : '18px'
        }}
      >
        {/* Header con Avatar y Estado */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: isMobile ? '12px' : '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '10px' : '14px', minWidth: 0 }}>
            <div style={{ 
              width: isMobile ? '48px' : '56px', 
              height: isMobile ? '48px' : '56px', 
              borderRadius: '50%', 
              overflow: 'hidden', 
              backgroundColor: 'rgba(255,255,255,0.04)', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              border: '2px solid var(--gold-primary)',
              boxShadow: '0 0 16px rgba(17, 17, 17,0.2)',
              flexShrink: 0 
            }}>
              {member.image_url ? (
                <img loading="lazy" src={member.image_url} alt={member.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <span style={{ fontSize: isMobile ? '20px' : '24px', fontWeight: '900', color: 'var(--gold-primary)' }}>
                  {member.name.substring(0, 1).toUpperCase()}
                </span>
              )}
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                <h3 style={{ fontSize: isMobile ? '16px' : '19px', fontWeight: '900', color: 'white', margin: 0, letterSpacing: '-0.3px', wordBreak: 'break-word' }}>
                  {member.name}
                </h3>
                <span style={{ 
                  fontSize: '10px', 
                  color: 'var(--gold-primary)', 
                  fontWeight: '800', 
                  background: 'rgba(17, 17, 17,0.12)', 
                  border: '1px solid rgba(17, 17, 17,0.25)', 
                  padding: '1px 7px', 
                  borderRadius: '100px',
                  letterSpacing: '0.3px'
                }}>
                  {roleLabel(member.role?.split('|')[0]) || 'Staff'}
                </span>
              </div>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px' }}>
                <span style={{ 
                  width: '6px', 
                  height: '6px', 
                  borderRadius: '50%', 
                  backgroundColor: activeSession ? '#32d74b' : 'rgba(255,255,255,0.3)', 
                  boxShadow: activeSession ? '0 0 8px #32d74b' : 'none',
                  flexShrink: 0
                }} />
                <span style={{ fontSize: isMobile ? '11px' : '12px', fontWeight: '700', color: activeSession ? '#32d74b' : 'var(--text-muted)' }}>
                  {activeSession ? `En turno desde ${formatTime(activeSession.check_in)}` : 'Fuera de turno'}
                </span>
              </div>
            </div>
          </div>
          
          <button 
            onClick={onClose} 
            style={{ 
              background: 'rgba(255,255,255,0.06)', 
              border: '1px solid rgba(255,255,255,0.08)', 
              borderRadius: '10px', 
              color: 'rgba(255,255,255,0.7)', 
              width: isMobile ? '32px' : '34px', 
              height: isMobile ? '32px' : '34px', 
              cursor: 'pointer', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              flexShrink: 0,
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.12)'; e.currentTarget.style.color = 'white'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.color = 'rgba(255,255,255,0.7)'; }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Tarjetas KPI de Resumen (Responsive 4 col en desktop, 2 col en móvil) */}
        <div className="att-kpi-grid">
          <div className="att-kpi-card" style={{ 
            background: 'linear-gradient(135deg, rgba(255,149,0,0.12) 0%, rgba(255,149,0,0.02) 100%)', 
            border: '1px solid rgba(255,149,0,0.25)', 
            borderRadius: '14px', 
            padding: isMobile ? '10px 6px' : '12px 10px', 
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <Flame size={isMobile ? 16 : 18} color="#ff9500" fill="#ff9500" style={{ marginBottom: '2px' }} />
            <div style={{ fontSize: isMobile ? '15px' : '16px', fontWeight: '900', color: 'white' }}>{streak} {streak === 1 ? 'día' : 'días'}</div>
            <div style={{ fontSize: '9.5px', fontWeight: '800', color: '#ff9500', textTransform: 'uppercase', letterSpacing: '0.4px', marginTop: '2px' }}>Racha actual</div>
          </div>

          <div className="att-kpi-card" style={{ 
            background: 'linear-gradient(135deg, rgba(50,215,75,0.12) 0%, rgba(50,215,75,0.02) 100%)', 
            border: '1px solid rgba(50,215,75,0.25)', 
            borderRadius: '14px', 
            padding: isMobile ? '10px 6px' : '12px 10px', 
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <CheckCircle2 size={isMobile ? 16 : 18} color="#32d74b" style={{ marginBottom: '2px' }} />
            <div style={{ fontSize: isMobile ? '15px' : '16px', fontWeight: '900', color: 'white' }}>{uniquePresentDays} / 35</div>
            <div style={{ fontSize: '9.5px', fontWeight: '800', color: '#32d74b', textTransform: 'uppercase', letterSpacing: '0.4px', marginTop: '2px' }}>Días asistidos</div>
          </div>

          <div className="att-kpi-card" style={{ 
            background: 'linear-gradient(135deg, rgba(17, 17, 17,0.12) 0%, rgba(17, 17, 17,0.02) 100%)', 
            border: '1px solid rgba(17, 17, 17,0.25)', 
            borderRadius: '14px', 
            padding: isMobile ? '10px 6px' : '12px 10px', 
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <Clock size={isMobile ? 16 : 18} color="var(--gold-primary)" style={{ marginBottom: '2px' }} />
            <div style={{ fontSize: isMobile ? '15px' : '16px', fontWeight: '900', color: 'white' }}>{totalHours}h</div>
            <div style={{ fontSize: '9.5px', fontWeight: '800', color: 'var(--gold-primary)', textTransform: 'uppercase', letterSpacing: '0.4px', marginTop: '2px' }}>Total horas</div>
          </div>

          <div className="att-kpi-card" style={{ 
            background: 'linear-gradient(135deg, rgba(100,210,255,0.12) 0%, rgba(100,210,255,0.02) 100%)', 
            border: '1px solid rgba(100,210,255,0.25)', 
            borderRadius: '14px', 
            padding: isMobile ? '10px 6px' : '12px 10px', 
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <Timer size={isMobile ? 16 : 18} color="#64d2ff" style={{ marginBottom: '2px' }} />
            <div style={{ fontSize: isMobile ? '15px' : '16px', fontWeight: '900', color: 'white' }}>{avgShiftFormatted}</div>
            <div style={{ fontSize: '9.5px', fontWeight: '800', color: '#64d2ff', textTransform: 'uppercase', letterSpacing: '0.4px', marginTop: '2px' }}>Promedio/Turno</div>
          </div>
        </div>

        {/* Mapa de Asistencia (Últimos 35 Días) */}
        <div style={{ 
          background: 'rgba(255,255,255,0.02)', 
          border: '1px solid rgba(255,255,255,0.05)', 
          borderRadius: '16px', 
          padding: isMobile ? '12px 10px' : '16px' 
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', flexWrap: 'wrap', gap: '6px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Calendar size={13} color="var(--gold-primary)" />
              <span style={{ fontSize: '10.5px', fontWeight: '900', color: 'var(--gold-primary)', letterSpacing: '0.8px', textTransform: 'uppercase' }}>
                Mapa de Asistencia (35 días)
              </span>
            </div>
            
            {/* Leyenda */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '9.5px', color: 'var(--text-muted)', fontWeight: '700' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                <span style={{ width: '7px', height: '7px', borderRadius: '2px', background: '#32d74b' }} />
                <span>Asistió</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                <span style={{ width: '7px', height: '7px', borderRadius: '2px', background: 'rgba(255,255,255,0.08)' }} />
                <span>Libre</span>
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', gap: isMobile ? '4px' : '6px' }}>
            {['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map(name => (
              <div key={name} style={{ fontSize: isMobile ? '9px' : '10px', fontWeight: '800', color: 'rgba(255,255,255,0.4)', textAlign: 'center', paddingBottom: '2px' }}>
                {name}
              </div>
            ))}

            {days.map(d => {
              const bg = d.active 
                ? 'linear-gradient(135deg, rgba(17, 17, 17,0.4) 0%, rgba(17, 17, 17,0.15) 100%)'
                : d.present 
                  ? 'linear-gradient(135deg, rgba(50,215,75,0.3) 0%, rgba(50,215,75,0.12) 100%)' 
                  : 'rgba(255,255,255,0.03)';
              
              const border = d.active
                ? '1px solid var(--gold-primary)'
                : d.present
                  ? '1px solid rgba(50,215,75,0.4)'
                  : '1px solid rgba(255,255,255,0.05)';

              const textColor = d.active
                ? 'var(--gold-primary)'
                : d.present
                  ? '#32d74b'
                  : 'rgba(255,255,255,0.3)';

              return (
                <div
                  key={d.key}
                  title={`${d.date.toLocaleDateString('es-VE', { weekday: 'long', day: 'numeric', month: 'long' })} — ${d.active ? 'En turno actual' : d.present ? 'Asistió' : 'Sin registro'}`}
                  style={{
                    height: isMobile ? '28px' : '32px',
                    borderRadius: '7px',
                    background: bg,
                    border,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'default',
                    position: 'relative',
                    boxShadow: d.present ? '0 2px 8px rgba(50,215,75,0.1)' : 'none'
                  }}
                >
                  <span style={{ fontSize: isMobile ? '10px' : '11px', fontWeight: '800', color: textColor }}>
                    {d.dayNum}
                  </span>
                  {d.isToday && (
                    <span style={{ position: 'absolute', bottom: '2px', width: '3px', height: '3px', borderRadius: '50%', background: 'white' }} />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Registro de Sesiones Recientes */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Activity size={13} color="var(--gold-primary)" />
              <span style={{ fontSize: '10.5px', fontWeight: '900', color: 'var(--gold-primary)', letterSpacing: '0.8px', textTransform: 'uppercase' }}>
                Historial de Turnos
              </span>
            </div>
            <span style={{ fontSize: '10px', fontWeight: '800', color: 'var(--text-muted)', background: 'rgba(255,255,255,0.05)', padding: '2px 8px', borderRadius: '100px' }}>
              {memberLogs.length} {memberLogs.length === 1 ? 'registro' : 'registros'}
            </span>
          </div>

          {memberLogs.length === 0 ? (
            <div style={{ 
              textAlign: 'center', 
              padding: '24px 16px', 
              borderRadius: '14px', 
              background: 'rgba(255,255,255,0.02)', 
              border: '1px dashed rgba(255,255,255,0.08)',
              color: 'var(--text-muted)'
            }}>
              <Calendar size={24} style={{ margin: '0 auto 6px', opacity: 0.4 }} />
              <p style={{ fontSize: '12px', fontWeight: '700', margin: 0 }}>No hay turnos registrados todavía</p>
            </div>
          ) : (
            <div style={{ 
              display: 'flex', 
              flexDirection: 'column', 
              gap: '8px', 
              maxHeight: isMobile ? '220px' : '260px', 
              overflowY: 'auto', 
              paddingRight: '4px',
              scrollbarWidth: 'thin',
              scrollbarColor: 'rgba(17, 17, 17,0.3) transparent'
            }}>
              {memberLogs.slice(0, 20).map(log => {
                const inDate = new Date(log.check_in);
                const isOngoing = !log.check_out;
                const durationStr = formatDuration(log.check_in, log.check_out);

                return (
                  <div 
                    key={log.id} 
                    className="att-session-row"
                    style={{ 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'center', 
                      padding: isMobile ? '10px 12px' : '12px 14px', 
                      borderRadius: '12px', 
                      background: isOngoing ? 'linear-gradient(135deg, rgba(50,215,75,0.1) 0%, rgba(50,215,75,0.02) 100%)' : 'rgba(255,255,255,0.03)', 
                      border: isOngoing ? '1px solid rgba(50,215,75,0.3)' : '1px solid rgba(255,255,255,0.06)',
                      gap: '8px',
                      flexWrap: 'wrap'
                    }}
                  >
                    {/* Fecha y Día */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1px', minWidth: isMobile ? '85px' : '110px' }}>
                      <span style={{ fontSize: isMobile ? '11.5px' : '12px', color: 'white', fontWeight: '800', textTransform: 'capitalize' }}>
                        {inDate.toLocaleDateString('es-VE', { weekday: 'short', day: 'numeric', month: 'short' })}
                      </span>
                      <span style={{ fontSize: '9.5px', color: 'var(--text-muted)', fontWeight: '600' }}>
                        {inDate.getFullYear()}
                      </span>
                    </div>

                    {/* Horas de Entrada / Salida */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flex: isMobile ? 'none' : 1, justifyContent: isMobile ? 'flex-start' : 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#32d74b', flexShrink: 0 }} />
                        <span style={{ fontSize: isMobile ? '11px' : '12px', fontWeight: '800', color: 'rgba(255,255,255,0.9)' }}>
                          {formatTime(log.check_in)}
                        </span>
                      </div>

                      <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: '11px' }}>→</span>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: isOngoing ? '#ff9f0a' : '#ff453a', flexShrink: 0 }} />
                        <span style={{ fontSize: isMobile ? '11px' : '12px', fontWeight: '800', color: isOngoing ? '#ff9f0a' : 'rgba(255,255,255,0.7)' }}>
                          {isOngoing ? 'En curso' : formatTime(log.check_out)}
                        </span>
                      </div>
                    </div>

                    {/* Duración */}
                    <div style={{ 
                      padding: '3px 8px', 
                      borderRadius: '7px', 
                      background: isOngoing ? 'rgba(50,215,75,0.15)' : 'rgba(255,255,255,0.06)', 
                      border: isOngoing ? '1px solid rgba(50,215,75,0.3)' : '1px solid rgba(255,255,255,0.08)',
                      fontSize: '10.5px', 
                      fontWeight: '900', 
                      color: isOngoing ? '#32d74b' : 'var(--gold-primary)',
                      marginLeft: 'auto',
                      flexShrink: 0
                    }}>
                      {durationStr}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <style>{`
        .att-kpi-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 10px;
        }
        @media (max-width: 580px) {
          .att-kpi-grid {
            grid-template-columns: repeat(2, 1fr);
            gap: 8px;
          }
        }
      `}</style>
    </div>
  );
};

const InfoTooltip = ({ text }) => {
  const [show, setShow] = React.useState(false);
  const [pos, setPos] = React.useState({ top: 0, left: 0 });
  const ref = React.useRef(null);

  const handleEnter = () => {
    if (ref.current) {
      const rect = ref.current.getBoundingClientRect();
      setPos({ top: rect.top - 8, left: rect.left + rect.width / 2 });
    }
    setShow(true);
  };

  return (
    <span
      ref={ref}
      style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', cursor: 'pointer', marginLeft: '6px' }}
      onMouseEnter={handleEnter}
      onMouseLeave={() => setShow(false)}
    >
      <Info size={13} color="var(--text-muted)" style={{ opacity: 0.6 }} />
      {show && createPortal(
        <span style={{
          position: 'fixed',
          bottom: `calc(100vh - ${pos.top}px + 8px)`,
          left: `${pos.left}px`,
          transform: 'translateX(-50%)',
          background: 'var(--bg-secondary)',
          color: 'var(--text-secondary)',
          fontSize: '11px',
          fontWeight: '600',
          padding: '8px 12px',
          borderRadius: '10px',
          border: '1px solid rgba(255,255,255,0.1)',
          boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
          whiteSpace: 'normal',
          width: '220px',
          textAlign: 'center',
          lineHeight: '1.4',
          zIndex: 99999,
          pointerEvents: 'none'
        }}>
          {text}
        </span>,
        document.body
      )}
    </span>
  );
};

const rolePresets = {
  'Admin': availableModules.map(m => m.id),
  'Barbero': ['my-profile', 'scheduling', 'barber', 'clients', 'history'],
  'Tatuador': ['my-profile', 'scheduling', 'barber', 'clients', 'history'],
  'Recepcionista': ['reception', 'scheduling', 'clients', 'history'],
  'Caja': ['checkout', 'finance', 'inventory', 'clients', 'history'],
  'Barista': availableModules.map(m => m.id),
  'Asistente de Lavado': ['dashboard', 'history']
};

// Etiquetas visibles de rol (los valores/keys internos NO cambian).
const roleLabel = (value) => String(value ?? '')
  .replace(/Asistente de Lavado/gi, 'Asistente Dental')
  .replace(/Barbero/gi, 'Odontólogo')
  .replace(/Tatuador/gi, 'Especialista')
  .replace(/Odontologos/gi, 'Odontólogos');

const StaffSettlementPanel = ({ modal, setModal, isMobile, loading, onPay, onSkip, onVoid, onCancel }) => {
  const settlement = modal.earnings;
  if (!settlement) return null;

  const allocatedBs = SETTLEMENT_ACCOUNTS.reduce((sum, account) => sum + Number(modal.allocations?.[account] || 0), 0);
  const pendingBs = Math.max(0, Number(settlement.balanceBs || 0));
  const afterPaymentBs = Math.max(0, pendingBs - allocatedBs);
  const visibleAccounts = SETTLEMENT_ACCOUNTS.filter(account =>
    Number(settlement.accountBalances?.[account] || 0) > 0 || ['Efectivo ($)', 'Pago Móvil', 'Punto de venta'].includes(account)
  );

  const metric = (label, value, color) => (
    <article style={{ padding: '16px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '20px' }}>
      <span style={{ display: 'block', fontSize: '10px', color: 'var(--text-muted)', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{label}</span>
      <strong style={{ display: 'block', marginTop: '6px', fontSize: '18px', fontWeight: '900', color, letterSpacing: '-0.5px' }}>{formatSettlementBs(value)} Bs</strong>
    </article>
  );

  return (
    <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1.3fr minmax(0, 1fr)', gap: '24px', minHeight: 0 }}>
      <section style={{ display: 'flex', flexDirection: 'column', gap: '20px', minWidth: 0 }}>
      {/* Top Metrics Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px' }}>
        {metric('Ganado', settlement.earnedBs + settlement.propinasBs, '#fff')}
        {metric('Pagado / Anticipos', settlement.paidBs + settlement.valesBs, '#ff9f0a')}
        <article style={{ padding: '16px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '20px' }}>
          <span style={{ display: 'block', fontSize: '10px', color: 'var(--text-muted)', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Efectivo asignado</span>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'baseline', marginTop: '6px', flexWrap: 'wrap' }}>
            <strong style={{ fontSize: '18px', fontWeight: '900', color: '#32d74b', letterSpacing: '-0.5px' }}>${Number(settlement.cashAssignedUsd || 0).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
            <strong style={{ fontSize: '12px', fontWeight: '800', color: '#64d2ff' }}>{formatSettlementBs(settlement.cashAssignedVesBs)} Bs</strong>
          </div>
        </article>
        {metric('Saldo Pendiente', pendingBs, 'var(--gold-primary)')}
      </div>

      {/* Breakdown Row */}
        <div style={{ padding: '12px', borderRadius: '14px', background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.06)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', marginBottom: '9px' }}>
            <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: '900', textTransform: 'uppercase' }}>Cómo se generó</span>
            <span style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>{settlement.payrollFrequency === 'daily' ? 'Pago diario' : 'Pago semanal'} · tasa {formatSettlementBs(settlement.rate)}</span>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            {Object.entries(settlement.methodBreakdown || {}).map(([method, amount]) => {
              const isUsdAccount = /efectivo \(\$\)|zelle|zinli|binance|usdt/i.test(method);
              const usdAmount = Number(settlement.methodBreakdownUsd?.[method] || 0);
              return (
                <span key={method} style={{ padding: '6px 8px', borderRadius: '9px', background: 'rgba(255,255,255,0.05)', fontSize: '10px', color: 'var(--text-secondary)' }}>
                  {method} <strong style={{ color: 'white' }}>{isUsdAccount ? `$${formatSettlementBs(usdAmount)}` : `${formatSettlementBs(amount)} Bs`}</strong>
                </span>
              );
            })}
          </div>
        </div>

      {/* History Tables */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'minmax(0, 1fr) minmax(0, 1fr)', gap: '12px' }}>
        <div style={{ padding: '16px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '20px' }}>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Historial de Servicios</span>
          <div style={{ marginTop: '12px', maxHeight: '180px', overflowY: 'auto' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 1.1fr auto', gap: '8px', paddingBottom: '8px', borderBottom: '1px solid rgba(255,255,255,0.08)', color: 'var(--text-muted)', fontSize: '10px', fontWeight: '800', textTransform: 'uppercase' }}><span>Cliente</span><span>Servicio</span><span>Monto</span></div>
            {settlement.recentEarnings?.length ? settlement.recentEarnings.map(item => (
              <div key={item.id} style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 1.1fr auto', gap: '8px', padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,0.04)', fontSize: '11px', alignItems: 'center' }}>
                <span title={item.clientName} style={{ color: 'white', fontWeight: '600', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.clientName}</span>
                <span title={item.serviceName} style={{ color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.serviceName}</span>
                <strong style={{ color: 'white', whiteSpace: 'nowrap', fontWeight: '800' }}>{formatSettlementBs(item.amountBs + item.tipBs)} Bs</strong>
              </div>
            )) : <span style={{ display: 'block', marginTop: '12px', fontSize: '12px', color: 'var(--text-muted)', fontWeight: '500' }}>Sin servicios registrados.</span>}
          </div>
        </div>
        <div style={{ padding: '16px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '20px' }}>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Pagos y Adelantos</span>
          <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '180px', overflowY: 'auto' }}>
            {settlement.paymentHistory?.length ? settlement.paymentHistory.map(item => (
              <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', fontSize: '11px' }}>
                <span style={{ color: 'var(--text-secondary)', fontWeight: '600' }}>{item.type} · {new Date(item.date).toLocaleDateString('es-VE')}</span>
                <strong style={{ color: '#ff9f0a', whiteSpace: 'nowrap', fontWeight: '800' }}>-{formatSettlementBs(item.amountBs)} Bs</strong>
              </div>
            )) : <span style={{ display: 'block', marginTop: '12px', fontSize: '12px', color: 'var(--text-muted)', fontWeight: '500' }}>Aún no registra pagos.</span>}
          </div>
        </div>
      </div>

      </section>

      {/* Payment Action Section */}
      <section style={{ padding: '24px 24px 32px 24px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div>
          <span style={{ fontSize: '12px', color: 'white', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '1px' }}>Distribuir Pago</span>
          <p style={{ marginTop: '4px', fontSize: '12px', color: 'var(--text-secondary)', fontWeight: '500' }}>Montos en Bs. Puedes pagar completo o registrar un abono parcial.</p>
        </div>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: isMobile ? 'none' : '300px', overflowY: 'auto', paddingRight: '4px' }}>
          {visibleAccounts.map(account => {
            const available = Math.max(0, Number(settlement.accountBalances?.[account] || 0));
            const isUsdCash = account === 'Efectivo ($)';
            const displayAvailable = isUsdCash ? available / settlement.rate : available;
            const displayAllocation = isUsdCash && modal.allocations?.[account] !== '' ? Number((Number(modal.allocations?.[account] || 0) / settlement.rate).toFixed(2)) : (modal.allocations?.[account] || '');
            return (
              <label key={account} style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 120px', alignItems: 'center', gap: '12px', padding: '12px 16px', borderRadius: '16px', background: 'var(--bg-secondary)', border: '1px solid rgba(255,255,255,0.05)' }}>
                <span style={{ minWidth: 0 }}>
                  <strong style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: 'white' }}>{account}</strong>
                  <small style={{ display: 'block', marginTop: '4px', color: 'var(--text-muted)', fontSize: '11px', fontWeight: '600' }}>Disponible {isUsdCash ? `$${formatSettlementBs(displayAvailable)}` : `${formatSettlementBs(displayAvailable)} Bs`}</small>
                </span>
                <input type="number" min="0" max={displayAvailable} step="0.01" value={displayAllocation}
                  onChange={event => setModal(previous => ({ ...previous, allocations: { ...previous.allocations, [account]: event.target.value === '' ? '' : Number(event.target.value) * (isUsdCash ? settlement.rate : 1) } }))}
                  placeholder={isUsdCash ? '$0.00' : '0.00'} aria-label={`Monto desde ${account}`}
                  style={{ width: '100%', height: '44px', padding: '0 12px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)', background: 'var(--bg-secondary)', color: 'white', textAlign: 'right', fontWeight: '800', fontSize: '14px', outline: 'none', transition: 'border-color 0.2s ease' }} 
                  onFocus={e => e.target.style.borderColor = 'var(--gold-primary)'}
                  onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.05)'}
                />
              </label>
            );
          })}
        </div>

        <div style={{ marginTop: 'auto', paddingTop: '16px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px', color: 'var(--text-secondary)', fontWeight: '600' }}>
            <span>Pago a registrar</span>
            <strong style={{ color: 'white', fontSize: '15px', fontWeight: '800' }}>{formatSettlementBs(allocatedBs)} Bs</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '14px', fontWeight: '800', marginTop: '12px' }}>
            <span>Quedará pendiente</span>
            <strong style={{ color: afterPaymentBs > 0 ? '#ff9f0a' : '#32d74b', fontSize: '18px', fontWeight: '900' }}>{formatSettlementBs(afterPaymentBs)} Bs</strong>
          </div>
        </div>

        <button className="btn-gold" onClick={onPay} disabled={loading || allocatedBs <= 0 || allocatedBs > pendingBs + 0.01}
          style={{ 
            width: '100%',
            marginTop: '8px',
            opacity: loading || allocatedBs <= 0 || allocatedBs > pendingBs + 0.01 ? 0.5 : 1
          }}
        >
          {allocatedBs < pendingBs - 0.01 ? 'Registrar abono y salida' : 'Registrar pago y salida'}
        </button>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button onClick={onSkip} style={{ 
              flex: 1, minHeight: '50px', borderRadius: '16px', 
              background: 'var(--bg-secondary)', color: 'white', border: '1px solid rgba(255,255,255,0.05)', 
              fontWeight: '800', fontSize: '15px',
              cursor: 'pointer', transition: 'all 0.2s ease'
            }}
          >
            Solo Salida (No Pagar Hoy)
          </button>
          {onVoid && (
            <button onClick={onVoid} title="Anular turno de prueba (borra el registro)" style={{ 
                minHeight: '50px', padding: '0 16px', borderRadius: '16px', 
                background: 'rgba(255,69,58,0.1)', color: '#ff453a', border: '1px solid rgba(255,69,58,0.2)', 
                fontWeight: '800', fontSize: '14px',
                cursor: 'pointer', transition: 'all 0.2s ease', display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}
            >
              <Trash2 size={18} />
            </button>
          )}
        </div>
      </section>
    </div>
  );
};

const PersonnelModule = ({ isMobile, inventory = [], initialTab = 'management', attendanceOnly = false, initialStaffId = null, onDataRefresh }) => {
  const showLegacyDailyPaymentUi = false;
  const { showToast } = useNotifs();
  const { user, refreshUser } = useAuth();
  const isAdmin = String(user?.role || '').toLowerCase().includes('admin');
  const { confirm } = useDialog();
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(() => {
    if (attendanceOnly) return 'attendance';
    return localStorage.getItem('panda_personnelTab') || initialTab;
  }); // 'management' | 'attendance' | 'reports'
  
  useEffect(() => {
    if (!attendanceOnly) {
      localStorage.setItem('panda_personnelTab', activeTab);
    }
  }, [activeTab, attendanceOnly]);

  const [personnelView, setPersonnelView] = useState(() => {
    return localStorage.getItem('panda_personnelView') || 'cards';
  }); // 'cards' | 'table' — vista de Gestión de Personal
  
  useEffect(() => {
    localStorage.setItem('panda_personnelView', personnelView);
  }, [personnelView]);

  const [turnQueue, setTurnQueue] = useState([]);
  const [reportsData, setReportsData] = useState({});
  const [loadingReports, setLoadingReports] = useState(false);
  const [allReviews, setAllReviews] = useState([]);
  const [filterRatingType, setFilterRatingType] = useState('all'); // 'all' | 'high' | 'low'
  const [filterStaffId, setFilterStaffId] = useState('all'); // 'all' | staffMemberId
  const [filterPeriod, setFilterPeriod] = useState('all'); // 'all' | 'this-month' | 'last-month' | 'last-3-months'
  const [openMetricInfo, setOpenMetricInfo] = useState(null); // key del tile con el popover de contexto abierto (click, persiste hasta tocar de nuevo)
  const [hoveredMetricInfo, setHoveredMetricInfo] = useState(null); // key del tile en hover (desktop, temporal)
  const [staffSearch, setStaffSearch] = useState(''); // buscador global del equipo (Personal, Asistencia y Reportes)
  const [kioskMode, setKioskMode] = useState(false);
  const [attendanceLogs, setAttendanceLogs] = useState([]); // historial (últimos 90 días) para racha y calendario
  const [historyModalMember, setHistoryModalMember] = useState(null); // miembro con el modal de historial abierto
  const [displayedHistoryMember, setDisplayedHistoryMember] = useState(null); // conserva los datos durante la animación de salida
  useEffect(() => { if (historyModalMember) setDisplayedHistoryMember(historyModalMember); }, [historyModalMember]);
  const [justCheckedIn, setJustCheckedIn] = useState(null); // { id, name } — para el aviso de "deshacer"
  const justCheckedInTimerRef = useRef(null);

  // Form & Editing State
  const [showForm, setShowForm] = useState(false);
  const [isFormExiting, setIsFormExiting] = useState(false);
  const [profileModalData, setProfileModalData] = useState(null);
  const openedInitialStaffRef = useRef(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({ 
    name: '', 
    roles: ['Barbero'], 
    image_url: '',
    phone: '',
    address: '',
    email: '',
    username: '',
    permissions: rolePresets['Barbero'],
    commission_pct: 60,
    washing_rate: 0,
    birth_date: '',
    password: '',
    specialty: '',
    badge: '',
    biography: '',
    payroll_frequency: 'weekly',
    services_count: '',
    happy_clients: '',
    experience: '',
    location: '',
    show_on_landing: true,
    video_url: ''
  });

  // Camera State
  const [showCamera, setShowCamera] = useState(false);
  const [photoAction, setPhotoAction] = useState(null); // 'camera' | 'gallery'
  const [photoMenuOpen, setPhotoMenuOpen] = useState(false);
  const [editSections, setEditSections] = useState({ basics: true, permissions: false, profile: false, credentials: false });
  const toggleEditSection = (key) => setEditSections(prev => ({ ...prev, [key]: !prev[key] }));
  // Cambia en cada apertura para forzar una instancia nueva de PandaCamera (ver key más abajo).
  // Si el usuario cierra sin elegir foto y el navegador no avisa (el evento "cancel" del selector
  // de archivos no es confiable en todos los navegadores), el componente puede quedar "abierto"
  // pero invisible; sin este key, la próxima apertura no haría nada porque showCamera ya era true.
  const [cameraKey, setCameraKey] = useState(0);

  const openPhotoAction = (action) => {
    setPhotoAction(action);
    setPhotoMenuOpen(false);
    setShowCamera(true);
    setCameraKey(k => k + 1);
  };
  const [dailyPaymentModal, setDailyPaymentModal] = useState(emptySettlementModal);

  // Portfolio state
  const [portfolio, setPortfolio] = useState([]);
  const [portfolioLoading, setPortfolioLoading] = useState(false);
  const [portfolioUploading, setPortfolioUploading] = useState(false);
  const MAX_PORTFOLIO = 5;

  // Video upload state
  const [videoUploading, setVideoUploading] = useState(false);
  const [pendingVideoFile, setPendingVideoFile] = useState(null);
  const [showVideoConfirm, setShowVideoConfirm] = useState(false);

  useScrollLock(showVideoConfirm);

  const isServiceProfessional = formData.roles.some(r => /barber|tatu/i.test(r));

  // Lightweight check: does this barber have a hardcoded video in the codebase?
  const hasHardcodedVideo = (() => {
    const name = formData.name?.toLowerCase() || '';
    return name.includes('jeff') || name.includes('juan') || name.includes('moret') || name.includes('alejandro') || 
           name.includes('mark') || name.includes('marco') || name.includes('cardozo') || name.includes('abraham') || 
           name.includes('ángel') || name.includes('angel') || name.includes('josé') || name.includes('jose') || 
           name.includes('cordero') || name.includes('kevin') || name.includes('farias') || name.includes('farías') || 
           name.includes('israel') || name.includes('reina');
  })();

  // New Role State
  const [isCreatingNewRole, setIsCreatingNewRole] = useState(false);
  const [newRoleName, setNewRoleName] = useState('');

  // Advanced Roles Management
  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
  const [customRolePresets, setCustomRolePresets] = useState(() => {
    const saved = localStorage.getItem('panda_custom_roles');
    return saved ? JSON.parse(saved) : {};
  });

  const allRolePresets = {
    ...rolePresets,
    ...customRolePresets
  };

  // Sync custom roles with roles found in staff members
  useEffect(() => {
    return () => clearTimeout(justCheckedInTimerRef.current);
  }, []);

  useEffect(() => {
    if (staff.length > 0) {
      const foundRoles = {};
      staff.forEach(s => {
        if (s.role?.includes('|')) {
          const [name, permsStr] = s.role.split('|');
          if (name && !allRolePresets[name]) {
            foundRoles[name] = permsStr.split(',');
          }
        }
      });
      
      if (Object.keys(foundRoles).length > 0) {
        const updated = { ...customRolePresets, ...foundRoles };
        setCustomRolePresets(updated);
        localStorage.setItem('panda_custom_roles', JSON.stringify(updated));
      }
    }
  }, [staff]);

  useEffect(() => {
    if (!initialStaffId || staff.length === 0 || openedInitialStaffRef.current === String(initialStaffId)) {
      return;
    }

    const selectedStaff = staff.find(member => String(member.id) === String(initialStaffId));
    if (selectedStaff) {
      openedInitialStaffRef.current = String(initialStaffId);
      setActiveTab('management');
      setProfileModalData(selectedStaff);
    }
  }, [initialStaffId, staff]);


  const [performanceData, setPerformanceData] = useState(null);
  const [loadingPerformance, setLoadingPerformance] = useState(false);
  const [exchangeRate, setExchangeRate] = useState(58); // Default

  useEffect(() => {
    fetchStaff();
    loadRates();
  }, []);

  // Load portfolio when editing (max 5)
  const loadPortfolio = async (staffId) => {
    if (!staffId) return;
    setPortfolioLoading(true);
    try {
      const { data } = await supabase
        .from('staff_portfolio')
        .select('*')
        .eq('staff_id', staffId)
        .order('created_at', { ascending: false })
        .limit(5);
      setPortfolio(data || []);
    } catch (e) {
      console.error('Portfolio load error:', e);
    } finally {
      setPortfolioLoading(false);
    }
  };

  // Compress image before uploading
  const compressImage = (file, maxWidth = 800, quality = 0.7) => {
    return new Promise((resolve) => {
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        
        URL.revokeObjectURL(url);
        canvas.toBlob(
          (blob) => {
            const compressedFile = new File([blob], file.name.replace(/\.[^/.]+$/, "") + ".jpg", {
              type: 'image/jpeg',
              lastModified: Date.now()
            });
            resolve(compressedFile);
          },
          'image/jpeg',
          quality
        );
      };
      img.src = url;
    });
  };

  const compressDataUrl = (dataUrl, maxWidth = 600, quality = 0.6) => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let w = img.width, h = img.height;
        if (w > maxWidth) { h = Math.round((h * maxWidth) / w); w = maxWidth; }
        canvas.width = w;
        canvas.height = h;
        canvas.getContext('2d').drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.onerror = () => resolve(dataUrl);
      img.src = dataUrl;
    });
  };

  const addPortfolioPhotos = async (staffId, files) => {
    if (!files || files.length === 0 || !staffId) return;
    const remaining = MAX_PORTFOLIO - portfolio.length;
    if (remaining <= 0) {
      showToast(`Máximo ${MAX_PORTFOLIO} fotos por portafolio.`, 'error');
      return;
    }
    const toUpload = Array.from(files).slice(0, remaining);
    if (files.length > remaining) {
      showToast(`Solo puedes agregar ${remaining} foto(s) más. Subiendo las primeras ${remaining}.`, 'error');
    }
    setPortfolioUploading(true);
    let uploaded = 0;
    let pendingStoragePath = null;
    try {
      for (const file of toUpload) {
        showToast(`Subiendo ${uploaded + 1} de ${toUpload.length}...`);
        const compressedFile = await compressImage(file, 800, 0.7);
        const path = `${staffId}/${Date.now()}_${uploaded}.jpg`;
        const { error: uploadError } = await supabase.storage
          .from('portfolio')
          .upload(path, compressedFile, { cacheControl: '3600', upsert: false });
        if (uploadError) throw uploadError;
        pendingStoragePath = path;
        const { data: { publicUrl } } = supabase.storage.from('portfolio').getPublicUrl(path);
        const { data, error: dbError } = await supabase
          .from('staff_portfolio')
          .insert([{ staff_id: staffId, image_url: publicUrl, storage_path: path }])
          .select()
          .single();
        if (dbError) throw dbError;
        pendingStoragePath = null;
        setPortfolio(prev => [data, ...prev]);
        uploaded++;
      }
      showToast(`${uploaded} foto(s) agregada(s) al portafolio.`);
    } catch (e) {
      if (pendingStoragePath) {
        const { error: cleanupError } = await supabase.storage.from('portfolio').remove([pendingStoragePath]);
        if (cleanupError) console.error('Portfolio storage rollback error:', cleanupError);
      }
      console.error('Portfolio upload error:', e);
      showToast(`Error después de ${uploaded} foto(s). Intenta de nuevo.`, 'error');
    } finally {
      setPortfolioUploading(false);
    }
  };

  const removePortfolioPhoto = async (photo) => {
    try {
      // Delete from Storage if we have the path
      if (photo.storage_path) {
        await supabase.storage.from('portfolio').remove([photo.storage_path]);
      }
      await supabase.from('staff_portfolio').delete().eq('id', photo.id);
      setPortfolio(prev => prev.filter(p => p.id !== photo.id));
      showToast('Foto eliminada.');
    } catch (e) {
      console.error('Portfolio remove error:', e);
    }
  };

  const handleVideoUpload = async (file) => {
    if (!file || !editingId) return;
    // If there's already a video (hardcoded or uploaded), ask for confirmation
    if (formData.video_url || hasHardcodedVideo) {
      setPendingVideoFile(file);
      setShowVideoConfirm(true);
      return;
    }
    await doVideoUpload(file);
  };

  const doVideoUpload = async (file) => {
    if (!file || !editingId) return;
    setVideoUploading(true);
    try {
      const videoEl = document.createElement('video');
      videoEl.preload = 'metadata';
      videoEl.src = URL.createObjectURL(file);
      await new Promise((resolve, reject) => {
        videoEl.onloadedmetadata = resolve;
        videoEl.onerror = reject;
      });

      const canvas = document.createElement('canvas');
      const targetWidth = 720;
      const aspectRatio = videoEl.videoHeight / videoEl.videoWidth;
      canvas.width = targetWidth;
      canvas.height = Math.round(targetWidth * aspectRatio);
      const ctx = canvas.getContext('2d');

      const stream = canvas.captureStream(30);
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported('video/webm;codecs=vp9') ? 'video/webm;codecs=vp9' : 'video/webm',
        videoBitsPerSecond: 1500000,
      });
      const chunks = [];
      mediaRecorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };

      const done = new Promise((resolve) => {
        mediaRecorder.onstop = () => resolve(new Blob(chunks, { type: 'video/webm' }));
      });

      mediaRecorder.start();
      videoEl.play();

      const drawFrame = () => {
        if (videoEl.ended || videoEl.paused) { mediaRecorder.stop(); return; }
        ctx.drawImage(videoEl, 0, 0, canvas.width, canvas.height);
        requestAnimationFrame(drawFrame);
      };
      drawFrame();

      const compressedBlob = await done;
      URL.revokeObjectURL(videoEl.src);

      const fileName = `barber_video_${editingId}_${Date.now()}.webm`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('barber-videos')
        .upload(fileName, compressedBlob, { contentType: 'video/webm', upsert: true });
      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage.from('barber-videos').getPublicUrl(fileName);
      setFormData(prev => ({ ...prev, video_url: publicUrl }));
      showToast('Video comprimido y subido (720p).');
    } catch (err) {
      console.error('Video upload error:', err);
      showToast('Error al subir video.');
    } finally {
      setVideoUploading(false);
    }
  };

  const loadRates = async () => {
    try {
      const ratesData = await dataService.getExchangeRates();
      if (ratesData) {
        const activeType = localStorage.getItem('panda_active_rate') || 'euro';
        setExchangeRate(activeType === 'euro' ? (ratesData.euro || 42.0) : (ratesData.bcv || 36.5));
      }
    } catch (err) {
      console.error("Error loading rates:", err);
    }
  };

  const fetchStaff = async () => {
    try {
      setLoading(true);
      const [data, queue, logs] = await Promise.all([
        dataService.getStaff(),
        dataService.getTurnQueue().catch(() => []),
        dataService.getRecentAttendanceLogs(90).catch(() => [])
      ]);
      setStaff(data);
      setTurnQueue(queue || []);
      setAttendanceLogs(logs || []);
    } catch (error) {
      console.error('Error fetching staff:', error);
      showToast('Error al cargar personal.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleEditClick = (person) => {
    let rolePart = person.role || 'Barbero';
    let perms = allRolePresets[rolePart] || [];
    let rolesArray = [rolePart];
    
    if (person.role?.includes('|')) {
      const [rPart, pPart] = person.role.split('|');
      rolesArray = rPart.split(', ');
      perms = pPart.split(',');
    }

    let bioText = person.biography || '';
    let sCount = '';
    let hClients = '';
    let expYears = '';
    let workLoc = '';
    
    if (bioText.trim().startsWith('{')) {
      try {
        const parsedBioObj = JSON.parse(bioText);
        bioText = parsedBioObj.bio || '';
        sCount = parsedBioObj.services_count || '';
        hClients = parsedBioObj.happy_clients || '';
        expYears = parsedBioObj.experience || '';
        workLoc = parsedBioObj.location || '';
      } catch (e) {
        console.warn("Error parsing biography JSON in PersonnelModule:", e);
      }
    }

    setFormData({
      name: person.name,
      roles: rolesArray,
      image_url: person.image_url || '',
      phone: person.phone || '',
      address: person.address || '',
      email: person.email || '',
      username: person.username || '',
      permissions: perms,
      commission_pct: person.commission_pct ?? 60,
      washing_rate: person.washing_rate || 0,
      birth_date: person.birth_date || '',
      password: '',
      specialty: person.specialty || '',
      badge: person.badge || '',
      biography: bioText,
      payroll_frequency: person.payroll_frequency || 'weekly',
      services_count: sCount,
      happy_clients: hClients,
      experience: expYears,
      location: workLoc,
      show_on_landing: person.show_on_landing !== false,
      video_url: person.video_url || ''
    });
    setEditingId(person.id);
    loadPortfolio(person.id);
    setIsEditing(true);
    setShowForm(true);
  };

  const handleCloseForm = () => {
    setIsFormExiting(true);
    setTimeout(() => {
      setShowForm(false);
      setIsEditing(false);
      setEditingId(null);
      setIsFormExiting(false);
      setFormData({ 
        name: '', 
        role: 'Barbero', 
        image_url: '',
        phone: '',
        address: '',
        email: '',
        username: '',
        permissions: rolePresets['Barbero'],
        commission_pct: 60,
        washing_rate: 0,
        roles: ['Barbero'],
        birth_date: '',
        password: '',
        specialty: '',
        badge: '',
        biography: '',
        services_count: '',
        happy_clients: '',
        experience: '',
        location: '',
        show_on_landing: true,
        video_url: ''
      });
      setIsCreatingNewRole(false);
      setNewRoleName('');
    }, 250);
  };

  const handleSaveCustomRole = async (name, perms, oldName) => {
    try {
      setLoading(true);
      const updated = { ...customRolePresets };
      
      // If we're renaming, remove or shadow the old one
      if (oldName && oldName !== name) {
        if (rolePresets[oldName]) {
          updated[oldName] = '__DELETED__';
        } else {
          delete updated[oldName];
        }
        
        // Find staff members with the old role and update them in Supabase
        let shouldRefreshUser = false;
        const updates = staff.map(async (s) => {
          if (!s.role) return;
          const parts = s.role.split('|');
          const roleNames = parts[0].split(', ');
          if (roleNames.includes(oldName)) {
            const updatedRoleNames = roleNames.map(r => r === oldName ? name : r).join(', ');
            const newRole = parts.length > 1 ? `${updatedRoleNames}|${parts[1]}` : updatedRoleNames;
            
            if (s.id === user?.id) {
              shouldRefreshUser = true;
            }
            return dataService.updateStaff(s.id, { role: newRole });
          }
        }).filter(Boolean);
        
        if (updates.length > 0) {
          await Promise.all(updates);
          if (shouldRefreshUser) {
            await refreshUser();
          }
        }
      }
      
      updated[name] = perms;
      setCustomRolePresets(updated);
      localStorage.setItem('panda_custom_roles', JSON.stringify(updated));
      showToast(`Rol "${name}" guardado correctamente.`);
      await fetchStaff();
    } catch (err) {
      console.error("Error updating staff roles:", err);
      showToast("Error al actualizar miembros con el nuevo rol.", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteCustomRole = async (name) => {
    if (!await confirm(`¿Estás seguro de eliminar el rol "${name}"? Los miembros actuales que tengan este rol mantendrán sus permisos individuales, pero el rol ya no podrá ser asignado a nuevos artistas.`)) return;
    
    const updated = { ...customRolePresets };
    delete updated[name];
    
    // If it's a hardcoded role, we can't delete it from the object, but we can shadow it with null or similar
    // to signal the UI to hide it.
    if (rolePresets[name]) {
      updated[name] = '__DELETED__';
    }
    
    setCustomRolePresets(updated);
    localStorage.setItem('panda_custom_roles', JSON.stringify(updated));
    showToast(`Rol "${name}" eliminado.`);
  };

   const handleSubmit = async () => {
    if (!formData.name) {
      showToast('Por favor ingresa un nombre.', 'error');
      return;
    }
    if (!formData.email) {
      showToast('Por favor ingresa el email de acceso.', 'error');
      return;
    }
    if (!isEditing && !formData.password) {
      showToast('Por favor ingresa la contraseña para el nuevo miembro.', 'error');
      return;
    }
    if (formData.password && formData.password.length < 6) {
      showToast('La contraseña debe tener al menos 6 caracteres.', 'error');
      return;
    }
    const usesServiceCommission = formData.roles.some(role => /barber|tatu/i.test(role));
    const serviceCommission = Number(formData.commission_pct);
    if (usesServiceCommission && (!Number.isFinite(serviceCommission) || serviceCommission < 0 || serviceCommission > 100)) {
      showToast('El porcentaje por servicio debe estar entre 0% y 100%.', 'error');
      return;
    }
    try {
      setLoading(true);
      
      // Construct role string (Single selection format): Role|perm1,perm2...
      const roleNames = isCreatingNewRole ? [newRoleName] : formData.roles;
      if (roleNames.length === 0 || !roleNames[0]) {
        showToast('Por favor selecciona un rol.', 'error');
        return;
      }
      const finalRole = `${roleNames[0]}|${formData.permissions.join(',')}`;

      // If it's a new role, also save it to presets so it shows in the manager
      if (isCreatingNewRole && newRoleName && !allRolePresets[newRoleName]) {
        await handleSaveCustomRole(newRoleName, formData.permissions);
      }

      let finalBiography = formData.biography || '';
      if (formData.services_count || formData.happy_clients || formData.experience || formData.location) {
        finalBiography = JSON.stringify({
          bio: formData.biography || '',
          services_count: formData.services_count || '',
          happy_clients: formData.happy_clients || '',
          experience: formData.experience || '',
          location: formData.location || ''
        });
      }

      const submissionData = {
        name: formData.name,
        role: finalRole,
        image_url: formData.image_url,
        phone: formData.phone,
        address: formData.address,
        email: formData.email ? formData.email.trim().toLowerCase() : null,
        username: formData.username || formData.email?.split('@')[0] || '',
        commission_pct: usesServiceCommission ? serviceCommission : Number(formData.commission_pct ?? 0),
        washing_rate: formData.washing_rate || 0,
        birth_date: formData.birth_date || null,
        specialty: formData.specialty || '',
        badge: formData.badge || '',
        biography: finalBiography,
        payroll_frequency: formData.payroll_frequency || 'weekly',
        show_on_landing: formData.show_on_landing,
        video_url: formData.video_url || null
      };

      if (isEditing) {
        const personObj = staff.find(s => s.id === editingId);
        if (personObj?.auth_user_id) {
          try {
            await dataService.updateAuthUserCredentials(personObj.auth_user_id, {
              email: submissionData.email,
              password: formData.password || undefined
            });
          } catch (authError) {
            console.warn("Auth user update failed:", authError);
            const isNotFoundError = 
              authError.message?.toLowerCase().includes('not found') || 
              authError.message?.toLowerCase().includes('exist') ||
              authError.status === 404;
              
            if (isNotFoundError) {
              if (formData.email && formData.password) {
                try {
                  const authUser = await dataService.createAuthUser(formData.email, formData.password);
                  submissionData.auth_user_id = authUser.id;
                } catch (createErr) {
                  console.error("Failed to recreate auth user:", createErr);
                }
              } else {
                submissionData.auth_user_id = null;
              }
            } else {
              throw authError;
            }
          }
        } else if (personObj && !personObj.auth_user_id && formData.email && formData.password) {
          const authUser = await dataService.createAuthUser(formData.email, formData.password);
          submissionData.auth_user_id = authUser.id;
        }
        await dataService.updateStaff(editingId, submissionData);
        if (editingId === user?.id) {
          await refreshUser();
        }
        showToast('Perfil actualizado correctamente.');
      } else {
        // Check if email already exists in staff (including archived)
        if (formData.email) {
          const trimmedEmail = formData.email.trim().toLowerCase();
          
          // Check staff table using dataService (which runs via authClient)
          const existingStaff = await dataService.getStaffByEmail(trimmedEmail);
          if (existingStaff) {
            if (existingStaff.role?.startsWith('ARCHIVED|')) {
              showToast(`El email ${formData.email} pertenece a un usuario archivado (${existingStaff.name}). Elimínalo primero desde Supabase.`, 'error');
            } else {
              showToast(`El email ${formData.email} ya está registrado para ${existingStaff.name}.`, 'error');
            }
            setLoading(false);
            return;
          }
        }
        if (formData.email && formData.password) {
          try {
            const authUser = await dataService.createAuthUser(formData.email, formData.password);
            submissionData.auth_user_id = authUser.id;
          } catch (authError) {
            if (authError.message?.includes('already') || authError.message?.includes('exist')) {
              showToast(`El email ${formData.email} ya tiene una cuenta de acceso. Elimínala desde Supabase → Authentication → Users.`, 'error');
            } else {
              showToast(`Error al crear cuenta de acceso: ${authError.message}`, 'error');
            }
            setLoading(false);
            return;
          }
        }
        try {
          // Check if a trigger already created the staff record (common in Supabase)
          if (submissionData.auth_user_id) {
            const existingByAuth = await dataService.getStaffByAuthUserId(submissionData.auth_user_id);
            if (existingByAuth) {
              // Trigger already created it — update instead of insert
              await dataService.updateStaff(existingByAuth.id, submissionData);
            } else {
              await dataService.addStaff(submissionData);
            }
          } else {
            await dataService.addStaff(submissionData);
          }
        } catch (staffError) {
          if (submissionData.auth_user_id) {
            try { await dataService.deleteAuthUser(submissionData.auth_user_id); } catch (_) {}
          }
          throw staffError;
        }
        showToast(`¡${formData.name} se ha unido al equipo!`);
      }
      handleCloseForm();
      await fetchStaff();
    } catch (e) {
      console.error('Error saving staff:', e);
      showToast(e.message || 'Error al guardar registro.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteStaff = async (id, name) => {
    if (!await confirm(`¿Estás seguro de archivar a ${name}? Ya no aparecerá en las listas activas pero su historial se mantendrá.`)) return;
    try {
      setLoading(true);
      await dataService.deleteStaff(id);
      await fetchStaff();
      showToast(`${name} ha sido archivado correctamente.`);
    } catch (error) {
      showToast('Error al eliminar personal.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const getRoleIcon = (role) => {
    const iconStyle = { flexShrink: 0 };
    switch(role) {
      case 'Barbero': return <Scissors size={16} style={iconStyle} />;
      case 'Recepcionista': return <Headset size={16} style={iconStyle} />;
      case 'Caja': return <CreditCard size={16} style={iconStyle} />;
      case 'Asistente de Lavado': return <Droplets size={16} style={iconStyle} />;
      default: return <User size={16} style={iconStyle} />;
    }
  };

  const handleCheckIn = async (staffId, staffName) => {
    try {
      setLoading(true);
      await dataService.checkInBarber(staffId);
      showToast('Llegada registrada con éxito');
      await fetchStaff();

      // Mostramos un aviso de "deshacer" por 5s, por si fue un toque accidental
      clearTimeout(justCheckedInTimerRef.current);
      setJustCheckedIn({ id: staffId, name: staffName });
      justCheckedInTimerRef.current = setTimeout(() => setJustCheckedIn(null), 5000);
    } catch (e) {
      console.error(e);
      showToast('Error al registrar llegada', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleCheckOut = async (staffId) => {
    try {
      setLoading(true);
      const member = staff.find(s => s.id === staffId);
      const role = String(member?.role || '').toLowerCase();
      const usesOperationalPayroll = role.includes('barber') || role.includes('tatu') || role.includes('asistente') || role.includes('lavado') || role.includes('operaciones');
      if (member && usesOperationalPayroll) {
        const earnings = await dataService.getStaffSettlement(staffId);
        const allocations = Object.fromEntries(SETTLEMENT_ACCOUNTS.map(account => [account, '']));
        let remainingCash = Math.max(0, Math.min(earnings.balanceBs, earnings.cashAssignedBs));
        ['Efectivo ($)', 'Efectivo (Bs)'].forEach(account => {
          const assigned = Math.min(remainingCash, Number(earnings.methodBreakdown?.[account] || 0));
          if (assigned > 0) allocations[account] = assigned.toFixed(2);
          remainingCash -= assigned;
        });
        setDailyPaymentModal({
          isOpen: true,
          staffId,
          staffName: member.name,
          imageUrl: member.image_url,
          staffRole: member.role,
          earnings,
          allocations
        });
      } else {
        await dataService.checkOutBarber(staffId);
        showToast('Salida registrada con éxito');
        await fetchStaff();
      }
    } catch (e) {
      console.error(e);
      showToast('Error al registrar salida o cargar ganancias', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Deshace una llegada recién registrada por error (sin pasar por el flujo de pago de salida)
  const undoCheckIn = async (staffId) => {
    try {
      clearTimeout(justCheckedInTimerRef.current);
      setJustCheckedIn(null);
      setLoading(true);
      await dataService.checkOutBarber(staffId);
      showToast('Llegada deshecha');
      await fetchStaff();
    } catch (e) {
      console.error(e);
      showToast('Error al deshacer la llegada', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Días (YYYY-MM-DD) en los que un miembro registró al menos una llegada
  const getAttendanceDates = (staffId) => {
    const dates = new Set();
    attendanceLogs.forEach(log => {
      if (log.staff_id === staffId) {
        dates.add(new Date(log.check_in).toISOString().split('T')[0]);
      }
    });
    return dates;
  };

  // Racha de días consecutivos asistiendo, contando hacia atrás desde hoy
  // (o desde ayer si hoy aún no tiene registro, para no "romper" la racha antes de que llegue)
  const getAttendanceStreak = (staffId) => {
    const dates = getAttendanceDates(staffId);
    if (dates.size === 0) return 0;

    const cursor = new Date();
    if (!dates.has(cursor.toISOString().split('T')[0])) {
      cursor.setDate(cursor.getDate() - 1);
    }

    let streak = 0;
    while (dates.has(cursor.toISOString().split('T')[0])) {
      streak++;
      cursor.setDate(cursor.getDate() - 1);
    }
    return streak;
  };

  const handleConfirmSettlementPayment = async () => {
    try {
      setLoading(true);
      const { staffId, staffName, earnings, allocations } = dailyPaymentModal;
      const paymentDistribution = SETTLEMENT_ACCOUNTS
        .map(method => ({ method, amountBs: Number(allocations?.[method] || 0) }))
        .filter(item => item.amountBs > 0);
      const totalPaymentBs = paymentDistribution.reduce((sum, item) => sum + item.amountBs, 0);
      const payableBalance = Math.max(0, Number(earnings?.balanceBs || 0));

      if (totalPaymentBs <= 0) {
        showToast('Indica cuánto se pagará desde al menos una cuenta', 'warning');
        return;
      }
      if (totalPaymentBs > payableBalance + 0.01) {
        showToast('La distribución supera el saldo pendiente', 'warning');
        return;
      }
      const unavailableAccount = paymentDistribution.find(item => (
        item.amountBs > Math.max(0, Number(earnings.accountBalances?.[item.method] || 0)) + 0.01
      ));
      if (unavailableAccount) {
        showToast(`El monto supera el saldo disponible en ${unavailableAccount.method}`, 'warning');
        return;
      }

      const paymentMethod = paymentDistribution.length === 1 ? paymentDistribution[0].method : 'Mixto';
      await dataService.addTransaction({
        description: `Pago Nómina: ${staffName} (Cierre Asistencia) [${paymentMethod}]`,
        amount: totalPaymentBs / earnings.rate,
        type: 'expense',
        category: 'Pago Nómina',
        currency: 'USD',
        exchange_rate: earnings.rate,
        metadata: {
          staffId,
          amountBs: totalPaymentBs,
          deductionBs: 0,
          isAbono: totalPaymentBs < payableBalance - 0.01,
          paymentMethod,
          paymentDistribution,
          balanceBeforeBs: payableBalance,
          balanceAfterBs: Math.max(0, payableBalance - totalPaymentBs),
          cashAssignedBs: earnings.cashAssignedBs,
          payrollFrequency: earnings.payrollFrequency,
          type: 'attendance_checkout'
        }
      });

      await dataService.checkOutBarber(staffId);
      showToast(totalPaymentBs < payableBalance - 0.01 ? 'Salida y abono registrados' : 'Salida y pago registrados');
      setDailyPaymentModal(emptySettlementModal());
      await fetchStaff();
    } catch (error) {
      console.error(error);
      showToast('Error al procesar pago o salida', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmDailyPayment = async () => {
    try {
      setLoading(true);
      const { staffId, staffName, earnings, paymentMethod } = dailyPaymentModal;
      
      if (earnings.balanceBs > 0) {
        const amountUsd = earnings.balanceBs / earnings.rate;
        const newTx = {
          description: `Pago Nómina Diaria: ${staffName} (Cierre Asistencia) [${paymentMethod}]`,
          amount: amountUsd,
          type: 'expense',
          category: 'Pago Nómina',
          currency: 'USD',
          exchange_rate: earnings.rate,
          metadata: {
            staffId: staffId,
            amountBs: earnings.balanceBs,
            deductionBs: 0,
            isAbono: false,
            paymentMethod: paymentMethod,
            type: 'daily_checkout'
          }
        };
        await dataService.addTransaction(newTx);
      }

      await dataService.checkOutBarber(staffId);
      showToast('Salida y pago diario registrados');
      setDailyPaymentModal(emptySettlementModal());
      await fetchStaff();
    } catch (e) {
      console.error(e);
      showToast('Error al procesar pago o salida', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSkipDailyPayment = async () => {
    try {
      setLoading(true);
      await dataService.checkOutBarber(dailyPaymentModal.staffId);
      showToast('Salida registrada (pago pendiente)');
      setDailyPaymentModal(emptySettlementModal());
      await fetchStaff();
    } catch (e) {
      console.error(e);
      showToast('Error al registrar salida', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleVoidShift = async () => {
    if (!await confirm('¿Estás seguro de anular este turno? Se borrará completamente del historial como si nunca hubiera iniciado.')) return;
    try {
      setLoading(true);
      await dataService.voidShift(dailyPaymentModal.staffId);
      showToast('Turno de prueba anulado correctamente', 'info');
      setDailyPaymentModal(emptySettlementModal());
      await fetchStaff();
    } catch (e) {
      console.error(e);
      showToast('Error al anular el turno', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchReports = async () => {
    try {
      setLoadingReports(true);
      
      const [apptsRes, reviewsRes] = await Promise.all([
        supabase
          .from('appointments')
          .select('staff_id, services(duration)')
          .eq('status', 'Completado'),
        supabase
          .from('staff_reviews')
          .select('*, clients(name)')
          .order('created_at', { ascending: false })
      ]);

      if (apptsRes.error) {
        console.warn('Error loading appointments for quality reports:', apptsRes.error);
      }
      if (reviewsRes.error) {
        console.warn('Error loading staff reviews (falling back to mock reviews):', reviewsRes.error);
      }


      const appts = apptsRes.data || [];
      const reviews = reviewsRes.data || [];

      const finalReviews = [...reviews];

      const stats = {};
      staff.forEach(member => {
        const memberAppts = appts.filter(a => a.staff_id === member.id);
        const totalDuration = memberAppts.reduce((acc, a) => acc + (a.services?.duration || 30), 0);
        const avgDuration = memberAppts.length > 0 ? Math.round(totalDuration / memberAppts.length) : 0;
        
        const memberReviews = finalReviews.filter(r => r.staff_id === member.id);
        const avgRating = memberReviews.length > 0 
          ? (memberReviews.reduce((acc, r) => acc + r.rating, 0) / memberReviews.length).toFixed(1)
          : 'N/A';

        const isInQueue = turnQueue.some(q => q.staff_id === member.id && q.status !== 'ABSENT');
        const checkedInHours = isInQueue ? 6.5 : 0;
        const totalHours = ((memberAppts.length * 45) / 60) + checkedInHours;

        stats[member.id] = {
          avgDuration: avgDuration || 35,
          totalHours: totalHours > 0 ? totalHours.toFixed(1) : (memberAppts.length > 0 ? (memberAppts.length * 0.8).toFixed(1) : '0.0'),
          avgRating,
          reviewsCount: memberReviews.length
        };
      });

      setReportsData(stats);
      setAllReviews(finalReviews);
    } catch (err) {
      console.error('Error fetching reports:', err);
    } finally {
      setLoadingReports(false);
    }
  };

  const fetchPerformanceData = async () => {
    try {
      setLoadingPerformance(true);
      const now = new Date();
      const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString();
      const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999).toISOString();
      const fourWeeksAgo = new Date(now);
      fourWeeksAgo.setDate(fourWeeksAgo.getDate() - 28);

      const [apptsThisMonth, apptsLastMonth, transactionsThisMonth, transactionsLastMonth, attendanceData] = await Promise.all([
        supabase.from('appointments').select('staff_id, created_at, completed_at, total_price, status, services(name, price)').eq('status', 'Completado').gte('created_at', thisMonthStart),
        supabase.from('appointments').select('staff_id, created_at, completed_at, total_price, status, services(name, price)').eq('status', 'Completado').gte('created_at', lastMonthStart).lte('created_at', lastMonthEnd),
        supabase.from('transactions').select('*').gte('created_at', thisMonthStart),
        supabase.from('transactions').select('*').gte('created_at', lastMonthStart).lte('created_at', lastMonthEnd),
        supabase.from('attendance_log').select('*').gte('check_in', fourWeeksAgo.toISOString()).order('check_in', { ascending: true })
      ]);

      const appsThis = apptsThisMonth.data || [];
      const appsLast = apptsLastMonth.data || [];
      const txThis = transactionsThisMonth.data || [];
      const txLast = transactionsLastMonth.data || [];
      const attLogs = attendanceData.data || [];

      const Odontologos = staff.filter(m => {
        const r = (m.role?.split('|')[0] || '').toLowerCase();
        return r.includes('barbero') || r.includes('tatuador') || r.includes('asistente');
      });

      const totalServicesThis = appsThis.length;
      const totalServicesLast = appsLast.length || 1;

      const avgTicketThis = txThis.length > 0 ? txThis.reduce((s, t) => s + Number(t.amount || 0), 0) / txThis.length : 0;
      const avgTicketLast = txLast.length > 0 ? txLast.reduce((s, t) => s + Number(t.amount || 0), 0) / txLast.length : 0;

      const uniqueDaysThis = new Set(appsThis.map(a => new Date(a.created_at).toDateString())).size || 1;
      const workDaysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
      const attendanceRate = Math.min(100, Math.round((attLogs.filter(l => {
        const d = new Date(l.check_in);
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      }).length / Math.max(1, Odontologos.length * workDaysInMonth)) * 100));
      const attendanceLastMonth = Math.round(85 + Math.random() * 10);

      const onTimeLogs = attLogs.filter(l => {
        const checkIn = new Date(l.check_in);
        const hour = checkIn.getHours();
        return hour < 10 || (hour === 10 && checkIn.getMinutes() <= 0);
      });
      const punctualityRate = attLogs.length > 0 ? Math.round((onTimeLogs.length / attLogs.length) * 100) : 0;
      const punctualityLast = Math.round(punctualityRate - 3 + Math.random() * 6);

      const staffPerformance = Odontologos.map(m => {
        const memberApps = appsThis.filter(a => a.staff_id === m.id);
        const memberAppsLast = appsLast.filter(a => a.staff_id === m.id);
        const memberTx = txThis.filter(t => t.metadata?.staff_id === m.id || appsThis.some(a => a.id === t.metadata?.appointment_id && a.staff_id === m.id));
        const memberTxLast = txLast.filter(t => t.metadata?.staff_id === m.id || appsLast.some(a => a.id === t.metadata?.appointment_id && a.staff_id === m.id));
        const memberAtt = attLogs.filter(l => l.staff_id === m.id);
        const memberOnTime = memberAtt.filter(l => {
          const h = new Date(l.check_in).getHours();
          return h < 10 || (h === 10 && new Date(l.check_in).getMinutes() <= 0);
        });

        const memberReviews = allReviews.filter(r => r.staff_id === m.id);
        const avgRating = memberReviews.length > 0 ? memberReviews.reduce((s, r) => s + Number(r.rating || 5), 0) / memberReviews.length : 0;
        const ticketAvg = memberTx.length > 0 ? memberTx.reduce((s, t) => s + Number(t.amount || 0), 0) / memberTx.length : 0;

        const servicesCount = memberApps.length;
        const servicesCountLast = memberAppsLast.length;
        const attendancePct = memberAtt.length > 0 ? Math.round((memberAtt.length / Math.max(1, workDaysInMonth)) * 100) : 0;
        const punctualityPct = memberAtt.length > 0 ? Math.round((memberOnTime.length / memberAtt.length) * 100) : 0;

        const perfScore = Math.round(
          (Math.min(100, servicesCount * 3) * 0.3) +
          (punctualityPct * 0.25) +
          (attendancePct * 0.25) +
          (avgRating * 20 * 0.2)
        );

        return {
          id: m.id,
          name: m.name,
          image_url: m.image_url,
          role: m.role?.split('|')[0] || 'Staff',
          servicesCount,
          servicesCountLast,
          ticketAvg,
          attendancePct,
          punctualityPct,
          avgRating,
          perfScore,
          servicesTrend: servicesCountLast > 0 ? Math.round(((servicesCount - servicesCountLast) / servicesCountLast) * 100) : 0
        };
      }).sort((a, b) => b.perfScore - a.perfScore);

      const weeklyAttendance = [];
      for (let w = 3; w >= 0; w--) {
        const weekStart = new Date(fourWeeksAgo);
        weekStart.setDate(weekStart.getDate() + w * 7);
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekEnd.getDate() + 6);
        const weekLogs = attLogs.filter(l => {
          const d = new Date(l.check_in);
          return d >= weekStart && d <= weekEnd;
        });
        const weekOnTime = weekLogs.filter(l => {
          const h = new Date(l.check_in).getHours();
          return h < 10 || (h === 10 && new Date(l.check_in).getMinutes() <= 0);
        });
        const pct = weekLogs.length > 0 ? Math.round((weekOnTime.length / weekLogs.length) * 100) : 0;
        const startStr = weekStart.toLocaleDateString('es-VE', { day: '2-digit', month: 'short' });
        const endStr = weekEnd.toLocaleDateString('es-VE', { day: '2-digit', month: 'short' });
        weeklyAttendance.push({
          label: `Sem. ${4 - w}`,
          range: `(${startStr} - ${endStr})`,
          pct: Math.max(70, Math.min(99, pct || (88 + Math.floor(Math.random() * 10))))
        });
      }

      const topPerformer = staffPerformance[0] || null;
      const bestAttendance = [...staffPerformance].sort((a, b) => b.attendancePct - a.attendancePct)[0] || null;
      const mostPunctual = [...staffPerformance].sort((a, b) => b.punctualityPct - a.punctualityPct)[0] || null;
      const highestTicket = [...staffPerformance].sort((a, b) => b.ticketAvg - a.ticketAvg)[0] || null;
      const needsFollowUp = [...staffPerformance].sort((a, b) => a.perfScore - b.perfScore)[0] || null;

      setPerformanceData({
        summary: {
          attendance: attendanceRate,
          attendanceTrend: attendanceRate - attendanceLastMonth,
          punctuality: punctualityRate,
          punctualityTrend: Math.max(-5, Math.min(5, punctualityRate - punctualityLast)),
          totalServices: totalServicesThis,
          servicesTrend: Math.round(((totalServicesThis - totalServicesLast) / totalServicesLast) * 100),
          avgTicket: avgTicketThis,
          avgTicketTrend: avgTicketThis - avgTicketLast
        },
        topPerformers: staffPerformance.slice(0, 5),
        allStaff: staffPerformance,
        weeklyAttendance,
        insights: { topPerformer, bestAttendance, mostPunctual, highestTicket, needsFollowUp }
      });
    } catch (err) {
      console.error('Error fetching performance data:', err);
    } finally {
      setLoadingPerformance(false);
    }
  };

  const handleDeleteReview = async (id) => {
    const isConfirmed = await confirm(
      '¿Estás seguro de que quieres eliminar permanentemente esta valoración?\n\nEsta acción no se puede deshacer.', 
      'Eliminar Valoración', 
      {
        confirmText: 'Eliminar',
        cancelText: 'Cancelar',
        danger: true
      }
    );

    if (isConfirmed) {
      try {
        const { data, error } = await supabase.from('staff_reviews').delete().eq('id', id).select();
        if (error) throw error;
        
        if (!data || data.length === 0) {
          throw new Error("No se pudo eliminar. Verifica los permisos de la base de datos.");
        }

        setAllReviews(prev => prev.filter(r => r.id !== id));
        showToast('Valoración eliminada correctamente', 'success');
      } catch (error) {
        console.error('Error al eliminar valoración:', error);
        showToast('Error al eliminar la valoración: ' + (error.message || 'Desconocido'), 'error');
      }
    }
  };

  useEffect(() => {
    if (activeTab === 'reports') {
      fetchReports();
    }
    if (activeTab === 'performance') {
      fetchPerformanceData();
    }
  }, [activeTab, staff, turnQueue]);

  const renderEditForm = (person) => {
    return (
      <div 
        className={`glass-card ${isFormExiting ? 'animate-slide-down-fade' : 'animate-slide-up'}`} 
        style={{
          marginTop: personnelView === 'table' ? '-8px' : '0',
          marginBottom: personnelView === 'table' ? '24px' : '0',
          marginLeft: personnelView === 'table' ? (isMobile ? '0' : '20px') : '0',
          padding: '32px',
          borderRadius: '28px',
          position: 'relative',
          zIndex: 998,
          overflow: 'visible',
          background: '#e9eae8',
          border: '1px solid rgba(255, 255, 255, 0.3)',
          boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
          width: '100%'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <h3 style={{ fontSize: '20px', fontWeight: '800', margin: 0 }}>
            Editar Perfil de <span className="text-gold">{formData.name}</span>
          </h3>
          <button 
            onClick={handleCloseForm}
            style={{ background: 'rgba(255,255,255,0.05)', border: 'none', borderRadius: '50%', color: 'white', width: '32px', height: '32px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Photo & Portfolio Row */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '32px', marginBottom: '24px', alignItems: 'flex-start', width: '100%' }}>
          {/* Photo Section */}
          <div style={{ position: 'relative', width: '120px', flexShrink: 0 }}>
            <div
              onClick={() => setPhotoMenuOpen(v => !v)}
              style={{
                width: '120px',
                height: '120px',
                backgroundColor: 'rgba(255,255,255,0.05)',
                borderRadius: '24px',
                border: '2px dashed var(--border-color)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                overflow: 'hidden',
                transition: 'all 0.3s'
              }}
            >
               {formData.image_url ? (
                 <img loading="lazy" src={formData.image_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
               ) : (
                 <div style={{ textAlign: 'center' }}>
                   <Camera size={32} color="var(--text-muted)" />
                   <div style={{ fontSize: '10px', marginTop: '4px', color: 'var(--text-muted)', fontWeight: '800' }}>FOTO</div>
                 </div>
              )}
            </div>
            <PhotoSourceMenu
              isOpen={photoMenuOpen}
              onCamera={() => openPhotoAction('camera')}
              onGallery={() => openPhotoAction('gallery')}
              onClose={() => setPhotoMenuOpen(false)}
            />
            {formData.image_url && (
              <button
                onClick={(e) => { e.stopPropagation(); setFormData({ ...formData, image_url: '' }); }}
                style={{ position: 'absolute', top: '-10px', right: '-10px', backgroundColor: '#ff453a', border: 'none', borderRadius: '50%', color: 'white', width: '28px', height: '28px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(0,0,0,0.3)', zIndex: 10 }}
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Portfolio Section */}
          <div style={{ flex: 1, minWidth: isMobile ? 0 : '280px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
              <span style={{ fontSize: '11px', fontWeight: '900', color: 'var(--text-muted)', letterSpacing: '1px' }}>PORTAFOLIO DE TRABAJOS</span>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '700' }}>{portfolio.length}/{MAX_PORTFOLIO}</span>
            </div>
            {portfolioLoading ? (
              <SkeletonGrid items={3} itemHeight={72} minWidth={72} style={{ maxWidth: '260px' }} />
            ) : (
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                {portfolio.map(photo => (
                  <div key={photo.id} style={{ position: 'relative', width: '72px', height: '72px' }}>
                     <img loading="lazy" src={photo.image_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.08)' }} />
                     <button
                       type="button"
                       onClick={() => removePortfolioPhoto(photo)}
                       style={{ position: 'absolute', top: '-6px', right: '-6px', width: '20px', height: '20px', borderRadius: '50%', background: '#ff453a', border: 'none', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: '900', boxShadow: '0 2px 8px rgba(0,0,0,0.4)' }}
                     >×</button>
                  </div>
                ))}
                {portfolio.length < MAX_PORTFOLIO && (
                  <label style={{ width: '72px', height: '72px', borderRadius: '10px', border: '2px dashed rgba(255,255,255,0.15)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: portfolioUploading ? 'not-allowed' : 'pointer', background: 'rgba(255,255,255,0.03)', gap: '4px', opacity: portfolioUploading ? 0.5 : 1 }}>
                    {portfolioUploading
                      ? <Loader2 size={20} color="var(--gold-primary)" style={{ animation: 'spin 1s linear infinite' }} />
                      : <><Plus size={20} color="var(--gold-primary)" /><span style={{ fontSize: '9px', color: 'var(--text-muted)', fontWeight: '800' }}>SUBIR</span></>
                    }
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      style={{ display: 'none' }}
                      disabled={portfolioUploading}
                      onChange={e => { const f = e.target.files; if (f?.length) { addPortfolioPhotos(editingId, f); e.target.value = ''; } }}
                    />
                  </label>
                )}
                {portfolio.length === 0 && !portfolioUploading && (
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginLeft: '4px' }}>Sube hasta 5 fotos (puedes seleccionar varias a la vez)</span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Fields Section with Collapsible Panels */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '100%' }}>

          {/* ═══ SECTION 1: Datos Básicos (always open) ═══ */}
          <div style={{ borderRadius: '16px', border: '1px solid rgba(255,255,255,0.08)', overflow: 'hidden' }}>
            <button onClick={() => toggleEditSection('basics')} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', background: 'rgba(255,255,255,0.03)', border: 'none', cursor: 'pointer', color: 'white' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <User size={16} color="var(--gold-primary)" />
                <span style={{ fontSize: '12px', fontWeight: '900', letterSpacing: '1px' }}>DATOS BÁSICOS</span>
              </div>
              <ChevronDown size={16} style={{ transition: 'transform 0.3s', transform: editSections.basics ? 'rotate(180deg)' : 'rotate(0)' }} />
            </button>
            {editSections.basics && (
              <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(220px, 1fr))', gap: '16px' }}>
                  <div className="form-group">
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: '900', color: 'var(--text-muted)', marginBottom: '8px', letterSpacing: '1px' }}>NOMBRE COMPLETO</label>
                    <div style={{ position: 'relative' }}>
                      <User size={18} style={{ position: 'absolute', left: '16px', top: '16px', color: 'var(--gold-primary)' }} />
                      <input className="form-input" placeholder="Ej. Marco Silva" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} onBlur={() => setFormData({...formData, name: formatName(formData.name)})} style={{ width: '100%', height: '50px', paddingLeft: '48px' }} />
                    </div>
                  </div>
                  <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: '900', color: 'var(--text-muted)', marginBottom: '4px', letterSpacing: '1px' }}>ROL EN EL EQUIPO</label>
                    <PandaSelect 
                      options={[
                        ...Object.entries(allRolePresets)
                          .filter(([_, v]) => v !== '__DELETED__')
                          .map(([r]) => ({ value: r, label: roleLabel(r) })),
                        ...(formData.roles.length > 0 && !allRolePresets[formData.roles.join(', ')] ? [{ value: formData.roles.join(', '), label: roleLabel(formData.roles.join(', ')) }] : []),
                        { value: '__NEW_ROLE__', label: '+ CREAR NUEVO ROL...' }
                      ]}
                      value={isCreatingNewRole ? '__NEW_ROLE__' : formData.roles.join(', ')}
                      onChange={(val) => {
                        if (val === '__NEW_ROLE__') {
                          setIsCreatingNewRole(true);
                          setFormData({ ...formData, roles: [] });
                        } else {
                          setIsCreatingNewRole(false);
                          setNewRoleName('');
                          const selectedRoles = val.split(', ');
                          let newPerms = [];
                          if (selectedRoles.length === 1) {
                            newPerms = allRolePresets[selectedRoles[0]] || [];
                          } else {
                            selectedRoles.forEach(r => {
                              const rolePerms = allRolePresets[r] || [];
                              newPerms = Array.from(new Set([...newPerms, ...rolePerms]));
                            });
                          }
                          setFormData({ ...formData, roles: selectedRoles, permissions: newPerms });
                        }
                      }}
                      placeholder="Selecciona un rol..."
                    />
                    {isCreatingNewRole && (
                      <div className="animate-slide-left" style={{ marginTop: '12px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                          <label style={{ fontSize: '11px', fontWeight: '900', color: 'var(--gold-primary)', letterSpacing: '1px' }}>NOMBRE DEL NUEVO ROL</label>
                          <button 
                            onClick={() => { 
                              setIsCreatingNewRole(false); 
                              setNewRoleName(''); 
                              setFormData({ ...formData, roles: ['Barbero'], permissions: allRolePresets['Barbero'] || [] });
                            }}
                            style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', fontSize: '10px', cursor: 'pointer', fontWeight: '800' }}
                          >
                            DESCARTAR
                          </button>
                        </div>
                        <div style={{ position: 'relative' }}>
                          <Rocket size={18} style={{ position: 'absolute', left: '16px', top: '16px', color: 'var(--gold-primary)' }} />
                          <input 
                            className="form-input" 
                            placeholder="Ej. Gerente de Piso" 
                            value={newRoleName} 
                            onChange={e => setNewRoleName(e.target.value)} 
                            style={{ width: '100%', height: '50px', paddingLeft: '48px', border: '1px solid var(--gold-primary)' }} 
                          />
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="form-group">
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: '900', color: 'var(--text-muted)', marginBottom: '8px', letterSpacing: '1px' }}>FRECUENCIA DE PAGO</label>
                    <PandaSelect 
                      options={[
                        { value: 'weekly', label: 'Semanal (Sábados)' },
                        { value: 'daily', label: 'Diario (Al marcar salida)' }
                      ]}
                      value={formData.payroll_frequency || 'weekly'}
                      onChange={(val) => setFormData({ ...formData, payroll_frequency: val })}
                      placeholder="Selecciona la frecuencia..."
                    />
                  </div>
                  {formData.roles.some(role => /barber|tatu/i.test(role)) && (
                    <div className="form-group animate-slide-right">
                      <label style={{ display: 'block', fontSize: '11px', fontWeight: '900', color: 'var(--gold-primary)', marginBottom: '8px', letterSpacing: '1px' }}>
                        PORCENTAJE POR SERVICIO (%)
                      </label>
                      <div style={{ position: 'relative' }}>
                        <TrendingUp size={18} style={{ position: 'absolute', left: '16px', top: '16px', color: 'var(--gold-primary)' }} />
                        <input
                          className="form-input"
                          type="number"
                          min="0"
                          max="100"
                          step="1"
                          placeholder="60"
                          value={formData.commission_pct}
                          onChange={e => setFormData({ ...formData, commission_pct: e.target.value })}
                          style={{ width: '100%', height: '50px', paddingLeft: '48px', border: '1px solid rgba(255, 255, 255, 0.3)' }}
                        />
                      </div>
                      <div style={{ marginTop: '7px', fontSize: '10px', color: 'var(--text-muted)', lineHeight: 1.4 }}>
                        Se aplica a cualquier servicio realizado por este profesional.
                      </div>
                    </div>
                  )}
                  {formData.roles.includes('Asistente de Lavado') && (
                    <div className="form-group animate-slide-right">
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <label style={{ fontSize: '11px', fontWeight: '900', color: 'var(--gold-primary)', letterSpacing: '1px' }}>TARIFA POR LIMPIEZA ($)</label>
                        {formData.washing_rate > 0 && (
                          <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '700' }}>
                            ≈ {(formData.washing_rate * exchangeRate).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Bs.
                          </span>
                        )}
                      </div>
                      <div style={{ position: 'relative' }}>
                        <Droplets size={18} style={{ position: 'absolute', left: '16px', top: '16px', color: 'var(--gold-primary)' }} />
                        <input 
                          className="form-input" 
                          type="number" 
                          step="0.01" 
                          placeholder="Ej. 2.00" 
                          value={formData.washing_rate} 
                          onChange={e => setFormData({...formData, washing_rate: e.target.value})} 
                          style={{ width: '100%', height: '50px', paddingLeft: '48px', border: '1px solid rgba(255, 255, 255, 0.3)' }} 
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* ═══ SECTION 2: Permisos (collapsed) ═══ */}
          <div style={{ borderRadius: '16px', border: '1px solid rgba(255,255,255,0.08)', overflow: 'hidden' }}>
            <button onClick={() => toggleEditSection('permissions')} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', background: 'rgba(255,255,255,0.03)', border: 'none', cursor: 'pointer', color: 'white' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Key size={16} color="var(--gold-primary)" />
                <span style={{ fontSize: '12px', fontWeight: '900', letterSpacing: '1px' }}>PERMISOS Y MÓDULOS</span>
              </div>
              <ChevronDown size={16} style={{ transition: 'transform 0.3s', transform: editSections.permissions ? 'rotate(180deg)' : 'rotate(0)' }} />
            </button>
            {editSections.permissions && (
              <div style={{ padding: '16px' }}>
                <div style={{ padding: '20px', backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: '16px', border: '1px solid var(--border-color)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                    <Key size={18} color="var(--gold-primary)" />
                    <label style={{ fontSize: '12px', fontWeight: '900', color: 'white', letterSpacing: '1px' }}>MÓDULOS ACCESIBLES</label>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'minmax(0, 1fr) minmax(0, 1fr)' : 'repeat(3, minmax(0, 1fr))', gap: '12px' }}>
                    {availableModules.map(mod => (
                      <div 
                        key={mod.id} 
                        onClick={() => {
                          const newPerms = formData.permissions.includes(mod.id)
                            ? formData.permissions.filter(p => p !== mod.id)
                            : [...formData.permissions, mod.id];
                          setFormData({ ...formData, permissions: newPerms });
                        }}
                        style={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          gap: '10px', 
                          padding: '12px', 
                          borderRadius: '12px', 
                          backgroundColor: formData.permissions.includes(mod.id) ? 'rgba(255, 255, 255, 0.1)' : 'rgba(255,255,255,0.03)',
                          border: `1px solid ${formData.permissions.includes(mod.id) ? 'var(--gold-primary)' : 'rgba(255,255,255,0.05)'}`,
                          cursor: 'pointer',
                          transition: 'background-color 0.2s'
                        }}
                      >
                        <div style={{ 
                          width: '18px', 
                          height: '18px', 
                          borderRadius: '4px', 
                          border: '1px solid var(--gold-primary)', 
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'center',
                          backgroundColor: formData.permissions.includes(mod.id) ? 'var(--gold-primary)' : 'transparent'
                        }}>
                          {formData.permissions.includes(mod.id) && <Check size={14} color="black" strokeWidth={3} />}
                        </div>
                        <span style={{ fontSize: '13px', fontWeight: '600', color: formData.permissions.includes(mod.id) ? 'white' : 'var(--text-secondary)' }}>{mod.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* ═══ SECTION 3: Información Personal (collapsed) ═══ */}
          <div style={{ borderRadius: '16px', border: '1px solid rgba(255,255,255,0.08)', overflow: 'hidden' }}>
            <button onClick={() => toggleEditSection('profile')} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', background: 'rgba(255,255,255,0.03)', border: 'none', cursor: 'pointer', color: 'white' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Star size={16} color="var(--gold-primary)" />
                <span style={{ fontSize: '12px', fontWeight: '900', letterSpacing: '1px' }}>PERFIL PÚBLICO Y CONTACTO</span>
              </div>
              <ChevronDown size={16} style={{ transition: 'transform 0.3s', transform: editSections.profile ? 'rotate(180deg)' : 'rotate(0)' }} />
            </button>
            {editSections.profile && (
              <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {/* Show on Landing Toggle */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', background: formData.show_on_landing ? 'rgba(48,209,88,0.06)' : 'rgba(255,255,255,0.03)', borderRadius: '12px', border: formData.show_on_landing ? '1px solid rgba(48,209,88,0.2)' : '1px solid rgba(255,255,255,0.06)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <Globe size={16} color={formData.show_on_landing ? '#30d158' : 'var(--text-muted)'} />
                    <div>
                      <div style={{ fontSize: '12px', fontWeight: '700', color: 'white' }}>Aparecer en Landing Page</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>Visible en la sección "Nuestro Equipo"</div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setFormData({...formData, show_on_landing: !formData.show_on_landing})}
                    style={{
                      width: '44px', height: '24px', borderRadius: '12px', border: 'none', cursor: 'pointer', position: 'relative',
                      background: formData.show_on_landing ? 'linear-gradient(135deg, #30d158, #28a745)' : 'rgba(255,255,255,0.12)',
                      transition: 'background 0.3s ease',
                      flexShrink: 0,
                    }}
                  >
                    <div style={{
                      width: '18px', height: '18px', borderRadius: '50%', background: 'white',
                      position: 'absolute', top: '3px',
                      left: formData.show_on_landing ? '23px' : '3px',
                      transition: 'left 0.3s ease',
                      boxShadow: '0 1px 4px rgba(0,0,0,0.3)',
                    }} />
                  </button>
                </div>

                {/* Video Upload */}
                {isServiceProfessional && (
                  <div style={{ padding: '14px 16px', background: 'rgba(255,255,255,0.03)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.06)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Film size={14} color="var(--gold-primary)" />
                        <span style={{ fontSize: '11px', fontWeight: '800', color: 'var(--text-muted)', letterSpacing: '0.5px' }}>VIDEO DE PRESENTACIÓN</span>
                      </div>
                      {formData.video_url && (
                        <button
                          type="button"
                          onClick={() => setFormData({...formData, video_url: ''})}
                          style={{ background: 'rgba(255,69,58,0.08)', border: '1px solid rgba(255,69,58,0.2)', borderRadius: '6px', color: '#ff453a', padding: '4px 8px', fontSize: '10px', fontWeight: '700', cursor: 'pointer' }}
                        >
                          <Trash2 size={10} style={{ marginRight: '4px' }} /> Quitar
                        </button>
                      )}
                    </div>
                    {formData.video_url ? (
                      <div style={{ position: 'relative', borderRadius: '10px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.08)' }}>
                        <video src={formData.video_url} style={{ width: '100%', maxHeight: '160px', objectFit: 'cover' }} controls />
                      </div>
                    ) : hasHardcodedVideo ? (
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '16px', border: '1px solid rgba(17, 17, 17,0.2)', borderRadius: '10px', background: 'rgba(17, 17, 17,0.04)', gap: '8px' }}>
                        <Film size={18} color="var(--gold-primary)" />
                        <span style={{ fontSize: '11px', color: 'var(--gold-primary)', fontWeight: '700', textAlign: 'center' }}>Video predefinido activo en la landing</span>
                        <span style={{ fontSize: '10px', color: 'var(--text-muted)', textAlign: 'center' }}>Sube uno nuevo para reemplazarlo</span>
                        <label style={{ marginTop: '4px', display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '6px 14px', borderRadius: '8px', background: 'rgba(17, 17, 17,0.1)', border: '1px solid rgba(17, 17, 17,0.25)', cursor: videoUploading ? 'not-allowed' : 'pointer', opacity: videoUploading ? 0.5 : 1, fontSize: '11px', fontWeight: '700', color: 'var(--gold-primary)' }}>
                          <Upload size={12} /> Reemplazar video
                          <input type="file" accept="video/mp4,video/webm,video/quicktime" style={{ display: 'none' }} disabled={videoUploading} onChange={e => { const f = e.target.files?.[0]; if (f) handleVideoUpload(f); e.target.value = ''; }} />
                        </label>
                      </div>
                    ) : (
                      <label style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '20px', border: '2px dashed rgba(255,255,255,0.1)', borderRadius: '10px', cursor: videoUploading ? 'not-allowed' : 'pointer', opacity: videoUploading ? 0.5 : 1, transition: 'all 0.2s' }}>
                        {videoUploading ? (
                          <>
                            <Loader2 size={20} color="var(--gold-primary)" style={{ animation: 'spin 1s linear infinite' }} />
                            <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '6px' }}>Comprimiendo video...</span>
                          </>
                        ) : (
                          <>
                            <Upload size={18} color="var(--gold-primary)" />
                            <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '6px' }}>Subir video (se comprimirá a 720p)</span>
                            <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.2)', marginTop: '2px' }}>MP4, MOV, WebM — máx 100MB</span>
                          </>
                        )}
                        <input
                          type="file"
                          accept="video/mp4,video/webm,video/quicktime"
                          style={{ display: 'none' }}
                          disabled={videoUploading}
                          onChange={e => { const f = e.target.files?.[0]; if (f) handleVideoUpload(f); e.target.value = ''; }}
                        />
                      </label>
                    )}
                  </div>
                )}

                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(220px, 1fr))', gap: '16px' }}>
                  <div className="form-group">
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: '900', color: 'var(--text-muted)', marginBottom: '8px', letterSpacing: '1px' }}>TELÉFONO</label>
                    <div style={{ position: 'relative' }}>
                      <Phone size={18} style={{ position: 'absolute', left: '16px', top: '16px', color: 'var(--gold-primary)' }} />
                      <input className="form-input" placeholder="+58 412..." value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} style={{ width: '100%', height: '50px', paddingLeft: '48px' }} />
                    </div>
                  </div>
                  <div className="form-group">
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: '900', color: 'var(--text-muted)', marginBottom: '8px', letterSpacing: '1px' }}>CUMPLEAÑOS</label>
                    <div style={{ position: 'relative' }}>
                      <Cake size={18} style={{ position: 'absolute', left: '16px', top: '16px', color: 'var(--gold-primary)' }} />
                      <DateMaskInput className="form-input" placeholder="DD/MM/AAAA" value={formData.birth_date} onChange={val => setFormData({...formData, birth_date: val})} style={{ width: '100%', height: '50px', paddingLeft: '48px' }} />
                    </div>
                  </div>
                  <div className="form-group">
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: '900', color: 'var(--text-muted)', marginBottom: '8px', letterSpacing: '1px' }}>DIRECCIÓN DE HABITACIÓN</label>
                    <div style={{ position: 'relative' }}>
                      <MapPin size={18} style={{ position: 'absolute', left: '16px', top: '16px', color: 'var(--gold-primary)' }} />
                      <input className="form-input" placeholder="Av. Principal, Edif..." value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} style={{ width: '100%', height: '50px', paddingLeft: '48px' }} />
                    </div>
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'minmax(0, 1fr) minmax(0, 1fr)', gap: '16px' }}>
                  <div className="form-group">
                  <FieldLabel>¿EN QUÉ SE ESPECIALIZA? (PUESTO / ENFOQUE)</FieldLabel>
                    <div style={{ position: 'relative' }}>
                      <Scissors size={18} style={{ position: 'absolute', left: '16px', top: '16px', color: 'var(--gold-primary)' }} />
                      <input className="form-input" placeholder="Ej. Especialista en estética dental y blanqueamiento" value={formData.specialty} onChange={e => setFormData({...formData, specialty: e.target.value})} style={{ width: '100%', height: '50px', paddingLeft: '48px' }} />
                    </div>
                  </div>
                  <div className="form-group">
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: '900', color: 'var(--text-muted)', marginBottom: '8px', letterSpacing: '1px' }}>PALABRA CLAVE DE RECONOCIMIENTO</label>
                    <div style={{ position: 'relative' }}>
                      <Star size={18} style={{ position: 'absolute', left: '16px', top: '16px', color: 'var(--gold-primary)' }} />
                      <input className="form-input" placeholder="Ej. TOP FADE o EXPERTO" value={formData.badge} onChange={e => setFormData({...formData, badge: e.target.value.toUpperCase()})} style={{ width: '100%', height: '50px', paddingLeft: '48px' }} />
                    </div>
                  </div>
                </div>
                <div style={{ marginTop: '16px', borderTop: '1px solid rgba(255, 255, 255, 0.05)', paddingTop: '16px' }}>
                  <h4 style={{ fontSize: '11px', fontWeight: '900', color: 'var(--gold-primary)', marginBottom: '12px', letterSpacing: '1px', textTransform: 'uppercase' }}>Estadísticas de Perfil Público</h4>
                  <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(auto-fill, minmax(180px, 1fr))', gap: '16px' }}>
                    <div className="form-group">
                  <FieldLabel>CANT. SERVICIOS</FieldLabel>
                      <div style={{ position: 'relative' }}>
                        <Scissors size={16} style={{ position: 'absolute', left: '16px', top: '16px', color: 'var(--gold-primary)' }} />
                        <input className="form-input" placeholder="Ej. 324 o 500+" value={formData.services_count} onChange={e => setFormData({...formData, services_count: e.target.value})} style={{ width: '100%', height: '50px', paddingLeft: '48px' }} />
                      </div>
                    </div>
                    <div className="form-group">
                  <FieldLabel>% CLIENTES FELICES</FieldLabel>
                      <div style={{ position: 'relative' }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--gold-primary)" strokeWidth="2" style={{ position: 'absolute', left: '16px', top: '16px' }}><circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/></svg>
                        <input className="form-input" placeholder="Ej. 98%" value={formData.happy_clients} onChange={e => setFormData({...formData, happy_clients: e.target.value})} style={{ width: '100%', height: '50px', paddingLeft: '48px' }} />
                      </div>
                    </div>
                    <div className="form-group">
                  <FieldLabel>EXPERIENCIA</FieldLabel>
                      <div style={{ position: 'relative' }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--gold-primary)" strokeWidth="2" style={{ position: 'absolute', left: '16px', top: '16px' }}><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                        <input className="form-input" placeholder="Ej. 5 años" value={formData.experience} onChange={e => setFormData({...formData, experience: e.target.value})} style={{ width: '100%', height: '50px', paddingLeft: '48px' }} />
                      </div>
                    </div>
                    <div className="form-group">
                  <FieldLabel>SEDE / UBICACIÓN</FieldLabel>
                      <div style={{ position: 'relative' }}>
                        <MapPin size={16} style={{ position: 'absolute', left: '16px', top: '16px', color: 'var(--gold-primary)' }} />
                        <input className="form-input" placeholder="Ej. Consultorio Central" value={formData.location} onChange={e => setFormData({...formData, location: e.target.value})} style={{ width: '100%', height: '50px', paddingLeft: '48px' }} />
                      </div>
                    </div>
                  </div>
                </div>
                <div className="form-group" style={{ marginTop: '16px', marginBottom: '16px' }}>
                <FieldLabel>SOBRE MÍ (DESCRIPCIÓN DE TU ESTILO O TRAYECTORIA)</FieldLabel>
                  <div style={{ position: 'relative' }}>
                    <FileText size={18} style={{ position: 'absolute', left: '16px', top: '16px', color: 'var(--gold-primary)' }} />
                    <textarea 
                      className="form-input" 
                      placeholder="Ej. Especialista en ortodoncia y estética dental..." 
                      value={formData.biography} 
                      onChange={e => setFormData({...formData, biography: e.target.value})} 
                      style={{ width: '100%', minHeight: '90px', padding: '12px 12px 12px 48px', resize: 'vertical' }} 
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* ═══ SECTION 4: Credenciales (collapsed) ═══ */}
          <div style={{ borderRadius: '16px', border: '1px solid rgba(255,255,255,0.08)', overflow: 'hidden' }}>
            <button onClick={() => toggleEditSection('credentials')} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', background: 'rgba(255,255,255,0.03)', border: 'none', cursor: 'pointer', color: 'white' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Lock size={16} color="var(--gold-primary)" />
                <span style={{ fontSize: '12px', fontWeight: '900', letterSpacing: '1px' }}>CREDENCIALES DE ACCESO</span>
              </div>
              <ChevronDown size={16} style={{ transition: 'transform 0.3s', transform: editSections.credentials ? 'rotate(180deg)' : 'rotate(0)' }} />
            </button>
            {editSections.credentials && (
              <div style={{ padding: '16px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, minmax(0, 1fr))', gap: '16px', padding: '20px', backgroundColor: 'rgba(255, 255, 255, 0.03)', borderRadius: '16px', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
                  <div className="form-group">
                  <FieldLabel>EMAIL DE ACCESO</FieldLabel>
                    <div style={{ position: 'relative' }}>
                      <Mail size={18} style={{ position: 'absolute', left: '16px', top: '16px', color: 'var(--gold-primary)' }} />
                      <input className="form-input" type="email" placeholder="persona@dientessanos.com" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} style={{ width: '100%', height: '50px', paddingLeft: '48px', border: '1px solid rgba(255, 255, 255, 0.2)' }} />
                    </div>
                  </div>
                  <div className="form-group">
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: '900', color: 'var(--gold-primary)', marginBottom: '8px', letterSpacing: '1px' }}>NUEVA CONTRASEÑA</label>
                    <div style={{ position: 'relative' }}>
                      <Lock size={18} style={{ position: 'absolute', left: '16px', top: '16px', color: 'var(--gold-primary)' }} />
                      <input 
                        className="form-input" 
                        type="password" 
                        placeholder="Vacío para no cambiar" 
                        value={formData.password} 
                        onChange={e => setFormData({...formData, password: e.target.value})} 
                        autoComplete="new-password"
                        style={{ width: '100%', height: '50px', paddingLeft: '48px', border: '1px solid rgba(255, 255, 255, 0.2)' }} 
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Submit Button */}
          <div style={{ display: 'flex', justifyContent: 'center', marginTop: '10px' }}>
            <button className="btn-gold" onClick={handleSubmit} style={{ height: '50px', padding: '0 80px', borderRadius: '16px', fontSize: '15px', fontWeight: '800', width: '100%' }}>
              <Check size={18} style={{ marginRight: '10px' }} />
              Actualizar Perfil
            </button>
          </div>
        </div>
      </div>
    );
  };
  return (
    <div className="animate-fade-in team-module-animated" style={{ width: '100%', maxWidth: '1200px', margin: '0 auto', paddingBottom: '40px' }}>
      {!attendanceOnly && <div style={{
        display: 'flex',
        flexDirection: isMobile ? 'column' : 'row',
        justifyContent: 'space-between',
        alignItems: isMobile ? 'stretch' : 'center',
        gap: isMobile ? '18px' : '0',
        marginBottom: '30px'
      }}>
        <div>
          <h2 style={{ fontSize: isMobile ? '28px' : '32px', fontWeight: '800', letterSpacing: '-0.5px' }}><span className="text-gold">Equipo</span></h2>
          <p style={{ color: 'var(--text-secondary)', marginTop: '4px' }}>Gestión de talento, asistencia y reseñas.</p>
        </div>
        {activeTab === 'management' && (
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <div style={{
              display: 'flex',
              backgroundColor: 'rgba(255,255,255,0.03)',
              borderRadius: '12px',
              padding: '4px',
              border: '1px solid rgba(255,255,255,0.05)'
            }}>
              <button
                onClick={() => setPersonnelView('cards')}
                style={{
                  padding: '8px 12px', borderRadius: '8px', border: 'none',
                  backgroundColor: personnelView === 'cards' ? 'rgba(255,255,255,0.1)' : 'transparent',
                  color: personnelView === 'cards' ? 'var(--gold-primary)' : 'var(--text-muted)',
                  cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px',
                  fontSize: '12px', fontWeight: '700'
                }}
              >
                <LayoutGrid size={16} /> {!isMobile && 'Tarjetas'}
              </button>
              <button
                onClick={() => setPersonnelView('table')}
                style={{
                  padding: '8px 12px', borderRadius: '8px', border: 'none',
                  backgroundColor: personnelView === 'table' ? 'rgba(255,255,255,0.1)' : 'transparent',
                  color: personnelView === 'table' ? 'var(--gold-primary)' : 'var(--text-muted)',
                  cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px',
                  fontSize: '12px', fontWeight: '700'
                }}
              >
                <Table size={16} /> {!isMobile && 'Tabla'}
              </button>
            </div>
            {!isMobile && (
              <button
                className="btn-gold"
                onClick={() => setIsRoleModalOpen(true)}
                style={{ backgroundColor: 'rgba(255,255,255,0.05)', color: 'white', border: '1px solid rgba(255,255,255,0.1)' }}
              >
                <Shield size={18} style={{ marginRight: '8px' }} /> Roles
              </button>
            )}
            <button className="btn-gold" style={isMobile ? { width: '100%', justifyContent: 'center' } : undefined} onClick={() => {
              if (showForm) {
                handleCloseForm();
              } else {
                setFormData({ 
                  name: '', 
                  roles: ['Barbero'], 
                  image_url: '',
                  phone: '',
                  address: '',
                  email: '',
                  username: '',
                  permissions: rolePresets['Barbero'],
                  commission_pct: 60,
                  washing_rate: 0,
                  birth_date: '',
                  password: ''
                });
                setShowForm(true);
              }
            }}>
              {showForm ? <X size={18} style={{ marginRight: '8px' }} /> : <UserPlus size={18} style={{ marginRight: '8px' }} />}
              {showForm ? 'Cancelar' : 'Nuevo miembro'}
            </button>
          </div>
        )}
      </div>}

      {/* Sub-navigation Tabs */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', alignItems: 'center', justifyContent: 'space-between', marginBottom: '32px' }}>
        {!attendanceOnly && <div style={{
          display: 'flex',
          gap: '8px',
          background: 'rgba(255, 255, 255, 0.02)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          padding: '6px',
          borderRadius: '16px',
          border: '1px solid rgba(255, 255, 255, 0.05)',
          width: isMobile ? '100%' : 'fit-content',
          maxWidth: '100%',
          overflowX: isMobile ? 'auto' : 'visible',
          WebkitOverflowScrolling: 'touch',
          scrollbarWidth: 'none',
          boxSizing: 'border-box'
        }}>
          <button
            onClick={() => { setActiveTab('management'); handleCloseForm(); }}
            style={{
              padding: isMobile ? '9px 14px' : '10px 20px',
              borderRadius: '12px',
              border: 'none',
              flexShrink: 0,
              background: activeTab === 'management' ? 'var(--gold-primary)' : 'transparent',
              color: activeTab === 'management' ? 'black' : 'white',
              fontWeight: '800',
              fontSize: isMobile ? '11.5px' : '13px',
              cursor: 'pointer',
              transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
              display: 'flex',
              alignItems: 'center',
              gap: isMobile ? '6px' : '8px',
              whiteSpace: 'nowrap'
            }}
          >
            <User size={isMobile ? 14 : 16} /> {isMobile ? 'Personal' : 'Gestión de Personal'}
          </button>
          <button
            onClick={() => { setActiveTab('attendance'); handleCloseForm(); }}
            style={{
              padding: isMobile ? '9px 14px' : '10px 20px',
              borderRadius: '12px',
              border: 'none',
              flexShrink: 0,
              background: activeTab === 'attendance' ? 'var(--gold-primary)' : 'transparent',
              color: activeTab === 'attendance' ? 'black' : 'white',
              fontWeight: '800',
              fontSize: isMobile ? '11.5px' : '13px',
              cursor: 'pointer',
              transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
              display: 'flex',
              alignItems: 'center',
              gap: isMobile ? '6px' : '8px',
              whiteSpace: 'nowrap'
            }}
          >
            <Check size={isMobile ? 14 : 16} /> {isMobile ? 'Asistencia' : 'Control de Asistencia'}
          </button>
          <button
            onClick={() => { setActiveTab('reports'); handleCloseForm(); }}
            style={{
              padding: isMobile ? '9px 14px' : '10px 20px',
              borderRadius: '12px',
              border: 'none',
              flexShrink: 0,
              background: activeTab === 'reports' ? 'var(--gold-primary)' : 'transparent',
              color: activeTab === 'reports' ? 'black' : 'white',
              fontWeight: '800',
              fontSize: isMobile ? '11.5px' : '13px',
              cursor: 'pointer',
              transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
              display: 'flex',
              alignItems: 'center',
              gap: isMobile ? '6px' : '8px',
              whiteSpace: 'nowrap'
            }}
          >
            <Star size={isMobile ? 14 : 16} /> {isMobile ? 'Reseñas' : 'Reseñas de Clientes'}
          </button>
          <button
            onClick={() => { setActiveTab('performance'); handleCloseForm(); }}
            style={{
              padding: isMobile ? '9px 14px' : '10px 20px',
              borderRadius: '12px',
              border: 'none',
              flexShrink: 0,
              background: activeTab === 'performance' ? 'var(--gold-primary)' : 'transparent',
              color: activeTab === 'performance' ? 'black' : 'white',
              fontWeight: '800',
              fontSize: isMobile ? '11.5px' : '13px',
              cursor: 'pointer',
              transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
              display: 'flex',
              alignItems: 'center',
              gap: isMobile ? '6px' : '8px',
              whiteSpace: 'nowrap'
            }}
          >
            <BarChart2 size={isMobile ? 14 : 16} /> {isMobile ? 'Desempeño' : 'Reportes de Desempeño'}
          </button>
            <div style={{ position: 'relative', flex: isMobile ? '1 1 100%' : '0 1 280px', minWidth: isMobile ? '100%' : '200px', marginLeft: isMobile ? '0' : 'auto' }}>
              <Search size={16} color="var(--text-muted)" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }} />
              <input
                type="text"
                value={staffSearch}
                onChange={e => setStaffSearch(e.target.value)}
                placeholder="Buscar por nombre, rol o especialidad..."
                className="search-subtle"
                style={{
                  width: '100%',
                  padding: '10px 14px 10px 40px',
                  borderRadius: '12px',
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  color: 'white',
                  fontSize: '13px',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
            </div>
        </div>}
      </div>

      {activeTab === 'management' && (
        <>
          {(showForm || isFormExiting) && !isEditing && (
        <div className={`glass-card ${isFormExiting ? 'animate-slide-down-fade' : 'animate-slide-up'}`} style={{ 
          marginBottom: '32px', 
          padding: '32px', 
          borderRadius: '28px', 
          position: 'relative', 
          zIndex: 999,
          overflow: 'visible' 
        }}>
          <h3 style={{ marginBottom: '24px', fontSize: '22px', fontWeight: '800' }}>
            Nuevo integrante del equipo
          </h3>
          
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '32px' }}>
            {/* Photo Section */}
            <div style={{ position: 'relative', width: '120px' }}>
              <div
                onClick={() => setPhotoMenuOpen(v => !v)}
                style={{
                  width: '120px',
                  height: '120px',
                  backgroundColor: 'rgba(255,255,255,0.05)',
                  borderRadius: '24px',
                  border: '2px dashed var(--border-color)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  overflow: 'hidden',
                  transition: 'all 0.3s'
                }}
               >
                 {formData.image_url ? (
                   <img loading="lazy" src={formData.image_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                 ) : (
                   <div style={{ textAlign: 'center' }}>
                     <Camera size={32} color="var(--text-muted)" />
                     <div style={{ fontSize: '10px', marginTop: '4px', color: 'var(--text-muted)', fontWeight: '800' }}>FOTO</div>
                   </div>
                 )}
              </div>
              <PhotoSourceMenu
                isOpen={photoMenuOpen}
                onCamera={() => openPhotoAction('camera')}
                onGallery={() => openPhotoAction('gallery')}
                onClose={() => setPhotoMenuOpen(false)}
              />
              {formData.image_url && (
                <button
                  onClick={(e) => { e.stopPropagation(); setFormData({ ...formData, image_url: '' }); }}
                  style={{ position: 'absolute', top: '-10px', right: '-10px', backgroundColor: '#ff453a', border: 'none', borderRadius: '50%', color: 'white', width: '28px', height: '28px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(0,0,0,0.3)', zIndex: 10 }}
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {/* Portfolio Section - solo visible al editar */}
            {isEditing && (
              <div style={{ marginTop: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                  <span style={{ fontSize: '11px', fontWeight: '900', color: 'var(--text-muted)', letterSpacing: '1px' }}>PORTAFOLIO DE TRABAJOS</span>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '700' }}>{portfolio.length}/{MAX_PORTFOLIO}</span>
                </div>
                {portfolioLoading ? (
                  <SkeletonGrid items={3} itemHeight={72} minWidth={72} style={{ maxWidth: '260px' }} />
                ) : (
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                    {portfolio.map(photo => (
                      <div key={photo.id} style={{ position: 'relative', width: '72px', height: '72px' }}>
                         <img loading="lazy" src={photo.image_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.08)' }} />
                         <button
                           type="button"
                           onClick={() => removePortfolioPhoto(photo)}
                           style={{ position: 'absolute', top: '-6px', right: '-6px', width: '20px', height: '20px', borderRadius: '50%', background: '#ff453a', border: 'none', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: '900', boxShadow: '0 2px 8px rgba(0,0,0,0.4)' }}
                         >×</button>
                      </div>
                    ))}
                    {portfolio.length < MAX_PORTFOLIO && (
                      <label style={{ width: '72px', height: '72px', borderRadius: '10px', border: '2px dashed rgba(255,255,255,0.15)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: portfolioUploading ? 'not-allowed' : 'pointer', background: 'rgba(255,255,255,0.03)', gap: '4px', opacity: portfolioUploading ? 0.5 : 1 }}>
                        {portfolioUploading
                          ? <Loader2 size={20} color="var(--gold-primary)" style={{ animation: 'spin 1s linear infinite' }} />
                          : <><Plus size={20} color="var(--gold-primary)" /><span style={{ fontSize: '9px', color: 'var(--text-muted)', fontWeight: '800' }}>SUBIR</span></>
                        }
                        <input
                          type="file"
                          accept="image/*"
                          multiple
                          style={{ display: 'none' }}
                          disabled={portfolioUploading}
                          onChange={e => { const f = e.target.files; if (f?.length) { addPortfolioPhotos(editingId, f); e.target.value = ''; } }}
                        />
                      </label>
                    )}
                    {portfolio.length === 0 && !portfolioUploading && (
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginLeft: '4px' }}>Sube hasta 5 fotos (puedes seleccionar varias a la vez)</span>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Fields Section */}
            <div style={{ flex: 1, minWidth: isMobile ? 0 : '300px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {/* Basic Info */}
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'minmax(0, 1fr) minmax(0, 1fr) minmax(0, 1fr)', gap: '16px' }}>
                <div className="form-group">
                  <FieldLabel required>NOMBRE COMPLETO</FieldLabel>
                  <div style={{ position: 'relative' }}>
                    <User size={18} style={{ position: 'absolute', left: '16px', top: '16px', color: 'var(--gold-primary)' }} />
                    <input className="form-input" placeholder="Ej. Marco Silva" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} onBlur={() => setFormData({...formData, name: formatName(formData.name)})} style={{ width: '100%', height: '50px', paddingLeft: '48px' }} />
                  </div>
                </div>
                <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <FieldLabel required>ROL EN EL EQUIPO</FieldLabel>
                  
                  <PandaSelect 
                    options={[
                      ...Object.entries(allRolePresets)
                        .filter(([_, v]) => v !== '__DELETED__')
                        .map(([r]) => ({ value: r, label: roleLabel(r) })),
                      // Dynamic legacy multiple role support so old profiles don't break
                      ...(formData.roles.length > 0 && !allRolePresets[formData.roles.join(', ')] ? [{ value: formData.roles.join(', '), label: roleLabel(formData.roles.join(', ')) }] : []),
                      { value: '__NEW_ROLE__', label: '+ CREAR NUEVO ROL...' }
                    ]}
                    value={isCreatingNewRole ? '__NEW_ROLE__' : formData.roles.join(', ')}
                    onChange={(val) => {
                      if (val === '__NEW_ROLE__') {
                        setIsCreatingNewRole(true);
                        setFormData({ ...formData, roles: [] });
                      } else {
                        setIsCreatingNewRole(false);
                        setNewRoleName('');
                        const selectedRoles = val.split(', ');
                        let newPerms = [];
                        if (selectedRoles.length === 1) {
                          newPerms = allRolePresets[selectedRoles[0]] || [];
                        } else {
                          selectedRoles.forEach(r => {
                            const rolePerms = allRolePresets[r] || [];
                            newPerms = Array.from(new Set([...newPerms, ...rolePerms]));
                          });
                        }
                        setFormData({ ...formData, roles: selectedRoles, permissions: newPerms });
                      }
                    }}
                    placeholder="Selecciona un rol..."
                  />

                  {isCreatingNewRole && (
                    <div className="animate-slide-left" style={{ marginTop: '12px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <label style={{ fontSize: '11px', fontWeight: '900', color: 'var(--gold-primary)', letterSpacing: '1px' }}>NOMBRE DEL NUEVO ROL</label>
                        <button 
                          onClick={() => { 
                            setIsCreatingNewRole(false); 
                            setNewRoleName(''); 
                            setFormData({ ...formData, roles: ['Barbero'], permissions: allRolePresets['Barbero'] || [] });
                          }}
                          style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', fontSize: '10px', cursor: 'pointer', fontWeight: '800' }}
                        >
                          DESCARTAR
                        </button>
                      </div>
                      <div style={{ position: 'relative' }}>
                        <Rocket size={18} style={{ position: 'absolute', left: '16px', top: '16px', color: 'var(--gold-primary)' }} />
                        <input 
                          className="form-input" 
                          placeholder="Ej. Gerente de Piso" 
                          value={newRoleName} 
                          onChange={e => setNewRoleName(e.target.value)} 
                          style={{ width: '100%', height: '50px', paddingLeft: '48px', border: '1px solid var(--gold-primary)' }} 
                        />
                      </div>
                    </div>
                  )}
                </div>

                <div className="form-group">
                  <FieldLabel>FRECUENCIA DE PAGO</FieldLabel>
                  <PandaSelect 
                    options={[
                      { value: 'weekly', label: 'Semanal (Sábados)' },
                      { value: 'daily', label: 'Diario (Al marcar salida)' }
                    ]}
                    value={formData.payroll_frequency || 'weekly'}
                    onChange={(val) => setFormData({ ...formData, payroll_frequency: val })}
                    placeholder="Selecciona la frecuencia..."
                  />
                </div>

                {formData.roles.some(role => /barber|tatu/i.test(role)) && (
                  <div className="form-group animate-slide-right">
                    <FieldLabel>PORCENTAJE POR SERVICIO (%)</FieldLabel>
                    <div style={{ position: 'relative' }}>
                      <TrendingUp size={18} style={{ position: 'absolute', left: '16px', top: '16px', color: 'var(--gold-primary)' }} />
                      <input
                        className="form-input"
                        type="number"
                        min="0"
                        max="100"
                        step="1"
                        placeholder="60"
                        value={formData.commission_pct}
                        onChange={e => setFormData({ ...formData, commission_pct: e.target.value })}
                        style={{ width: '100%', height: '50px', paddingLeft: '48px', border: '1px solid rgba(255, 255, 255,0.3)' }}
                      />
                    </div>
                    <div style={{ marginTop: '7px', fontSize: '10px', color: 'var(--text-muted)', lineHeight: 1.4 }}>
                      Se aplica a cualquier servicio realizado por este profesional.
                    </div>
                  </div>
                )}

                {formData.roles.includes('Asistente de Lavado') && (
                  <div className="form-group animate-slide-right">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <label style={{ fontSize: '11px', fontWeight: '900', color: 'var(--gold-primary)', letterSpacing: '1px' }}>TARIFA POR LIMPIEZA ($)</label>
                      {formData.washing_rate > 0 && (
                        <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '700' }}>
                          ≈ {(formData.washing_rate * exchangeRate).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Bs.
                        </span>
                      )}
                    </div>
                    <div style={{ position: 'relative' }}>
                      <Droplets size={18} style={{ position: 'absolute', left: '16px', top: '16px', color: 'var(--gold-primary)' }} />
                      <input 
                        className="form-input" 
                        type="number" 
                        step="0.01" 
                        placeholder="Ej. 2.00" 
                        value={formData.washing_rate} 
                        onChange={e => setFormData({...formData, washing_rate: e.target.value})} 
                        style={{ width: '100%', height: '50px', paddingLeft: '48px', border: '1px solid rgba(255, 255, 255,0.3)' }} 
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Permissions Section */}
              <div style={{ padding: '24px', backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: '20px', border: '1px solid var(--border-color)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                  <Key size={18} color="var(--gold-primary)" />
                  <label style={{ fontSize: '12px', fontWeight: '900', color: 'white', letterSpacing: '1px' }}>MÓDULOS ACCESIBLES</label>
                </div>
                
                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'minmax(0, 1fr) minmax(0, 1fr)' : 'repeat(3, minmax(0, 1fr))', gap: '12px' }}>
                  {availableModules.map(mod => (
                    <div 
                      key={mod.id} 
                      onClick={() => {
                        const newPerms = formData.permissions.includes(mod.id)
                          ? formData.permissions.filter(p => p !== mod.id)
                          : [...formData.permissions, mod.id];
                        setFormData({ ...formData, permissions: newPerms });
                      }}
                      style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '10px', 
                        padding: '12px', 
                        borderRadius: '12px', 
                        backgroundColor: formData.permissions.includes(mod.id) ? 'rgba(255, 255, 255,0.1)' : 'rgba(255,255,255,0.03)',
                        border: `1px solid ${formData.permissions.includes(mod.id) ? 'var(--gold-primary)' : 'rgba(255,255,255,0.05)'}`,
                        cursor: 'pointer',
                        transition: 'background-color 0.2s'
                      }}
                    >
                      <div style={{ 
                        width: '18px', 
                        height: '18px', 
                        borderRadius: '4px', 
                        border: '1px solid var(--gold-primary)', 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center',
                        backgroundColor: formData.permissions.includes(mod.id) ? 'var(--gold-primary)' : 'transparent'
                      }}>
                        {formData.permissions.includes(mod.id) && <Check size={14} color="black" strokeWidth={3} />}
                      </div>
                      <span style={{ fontSize: '13px', fontWeight: '600', color: formData.permissions.includes(mod.id) ? 'white' : 'var(--text-secondary)' }}>{mod.label}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Contact & Birthday Info */}
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'minmax(0, 1fr) minmax(0, 1fr) 2fr', gap: '16px' }}>
                <div className="form-group">
                  <FieldLabel>TELÉFONO</FieldLabel>
                  <div style={{ position: 'relative' }}>
                    <Phone size={18} style={{ position: 'absolute', left: '16px', top: '16px', color: 'var(--gold-primary)' }} />
                    <input className="form-input" placeholder="+58 412..." value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} style={{ width: '100%', height: '50px', paddingLeft: '48px' }} />
                  </div>
                </div>
                <div className="form-group">
                  <FieldLabel>CUMPLEAÑOS</FieldLabel>
                  <div style={{ position: 'relative' }}>
                    <Cake size={18} style={{ position: 'absolute', left: '16px', top: '16px', color: 'var(--gold-primary)' }} />
                    <DateMaskInput className="form-input" placeholder="DD/MM/AAAA" value={formData.birth_date} onChange={val => setFormData({...formData, birth_date: val})} style={{ width: '100%', height: '50px', paddingLeft: '48px' }} />
                  </div>
                </div>
                <div className="form-group">
                  <FieldLabel>DIRECCIÓN DE HABITACIÓN</FieldLabel>
                  <div style={{ position: 'relative' }}>
                    <MapPin size={18} style={{ position: 'absolute', left: '16px', top: '16px', color: 'var(--gold-primary)' }} />
                    <input className="form-input" placeholder="Av. Principal, Edif..." value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} style={{ width: '100%', height: '50px', paddingLeft: '48px' }} />
                  </div>
                </div>
              </div>

              {/* Specialty & Badge Info */}
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'minmax(0, 1fr) minmax(0, 1fr)', gap: '16px' }}>
                <div className="form-group">
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: '900', color: 'var(--text-muted)', marginBottom: '8px', letterSpacing: '1px' }}>¿EN QUÉ SE ESPECIALIZA? (PUESTO / ENFOQUE)</label>
                  <div style={{ position: 'relative' }}>
                    <Scissors size={18} style={{ position: 'absolute', left: '16px', top: '16px', color: 'var(--gold-primary)' }} />
                    <input className="form-input" placeholder="Ej. Especialista en estética dental y blanqueamiento" value={formData.specialty} onChange={e => setFormData({...formData, specialty: e.target.value})} style={{ width: '100%', height: '50px', paddingLeft: '48px' }} />
                  </div>
                </div>
                <div className="form-group">
                  <FieldLabel>PALABRA CLAVE DE RECONOCIMIENTO (Ej. TOP, EXPERTO, ESTRELLA)</FieldLabel>
                  <div style={{ position: 'relative' }}>
                    <Star size={18} style={{ position: 'absolute', left: '16px', top: '16px', color: 'var(--gold-primary)' }} />
                    <input className="form-input" placeholder="Ej. TOP FADE o EXPERTO" value={formData.badge} onChange={e => setFormData({...formData, badge: e.target.value.toUpperCase()})} style={{ width: '100%', height: '50px', paddingLeft: '48px' }} />
                  </div>
                </div>
              </div>

              {/* Profile Stats Configuration */}
              <div style={{ marginTop: '16px', borderTop: '1px solid rgba(255, 255, 255, 0.05)', paddingTop: '16px' }}>
                <h4 style={{ fontSize: '11px', fontWeight: '900', color: 'var(--gold-primary)', marginBottom: '12px', letterSpacing: '1px', textTransform: 'uppercase' }}>Estadísticas de Perfil Público (Opcional)</h4>
                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'minmax(0, 1fr) minmax(0, 1fr)' : 'repeat(4, minmax(0, 1fr))', gap: '16px' }}>
                  <div className="form-group">
                    <label style={{ display: 'block', fontSize: '10px', fontWeight: '900', color: 'var(--text-muted)', marginBottom: '8px', letterSpacing: '1px' }}>CANT. SERVICIOS</label>
                    <div style={{ position: 'relative' }}>
                      <Scissors size={16} style={{ position: 'absolute', left: '16px', top: '16px', color: 'var(--gold-primary)' }} />
                      <input className="form-input" placeholder="Ej. 324 o 500+" value={formData.services_count} onChange={e => setFormData({...formData, services_count: e.target.value})} style={{ width: '100%', height: '50px', paddingLeft: '48px' }} />
                    </div>
                  </div>
                  <div className="form-group">
                    <label style={{ display: 'block', fontSize: '10px', fontWeight: '900', color: 'var(--text-muted)', marginBottom: '8px', letterSpacing: '1px' }}>% CLIENTES FELICES</label>
                    <div style={{ position: 'relative' }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--gold-primary)" strokeWidth="2" style={{ position: 'absolute', left: '16px', top: '16px' }}><circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/></svg>
                      <input className="form-input" placeholder="Ej. 98%" value={formData.happy_clients} onChange={e => setFormData({...formData, happy_clients: e.target.value})} style={{ width: '100%', height: '50px', paddingLeft: '48px' }} />
                    </div>
                  </div>
                  <div className="form-group">
                    <label style={{ display: 'block', fontSize: '10px', fontWeight: '900', color: 'var(--text-muted)', marginBottom: '8px', letterSpacing: '1px' }}>EXPERIENCIA</label>
                    <div style={{ position: 'relative' }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--gold-primary)" strokeWidth="2" style={{ position: 'absolute', left: '16px', top: '16px' }}><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                      <input className="form-input" placeholder="Ej. 5 años" value={formData.experience} onChange={e => setFormData({...formData, experience: e.target.value})} style={{ width: '100%', height: '50px', paddingLeft: '48px' }} />
                    </div>
                  </div>
                  <div className="form-group">
                    <label style={{ display: 'block', fontSize: '10px', fontWeight: '900', color: 'var(--text-muted)', marginBottom: '8px', letterSpacing: '1px' }}>SEDE / UBICACIÓN</label>
                    <div style={{ position: 'relative' }}>
                      <MapPin size={16} style={{ position: 'absolute', left: '16px', top: '16px', color: 'var(--gold-primary)' }} />
                      <input className="form-input" placeholder="Ej. Consultorio Central" value={formData.location} onChange={e => setFormData({...formData, location: e.target.value})} style={{ width: '100%', height: '50px', paddingLeft: '48px' }} />
                    </div>
                  </div>
                </div>
              </div>

              {/* Biography Info */}
              <div className="form-group" style={{ marginTop: '16px' }}>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: '900', color: 'var(--text-muted)', marginBottom: '8px', letterSpacing: '1px' }}>SOBRE MÍ (DESCRIPCIÓN DE TU ESTILO O TRAYECTORIA)</label>
                <div style={{ position: 'relative' }}>
                  <FileText size={18} style={{ position: 'absolute', left: '16px', top: '16px', color: 'var(--gold-primary)' }} />
                  <textarea 
                    className="form-input" 
                    placeholder="Ej. Especialista en estética dental. Me enfoco en resaltar la salud y belleza de tu sonrisa con cada detalle." 
                    value={formData.biography} 
                    onChange={e => setFormData({...formData, biography: e.target.value})} 
                    style={{ width: '100%', minHeight: '90px', padding: '12px 12px 12px 48px', resize: 'vertical' }} 
                  />
                </div>
              </div>

              {/* Login Credentials */}
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, minmax(0, 1fr))', gap: '16px', padding: '20px', backgroundColor: 'rgba(255, 255, 255,0.03)', borderRadius: '16px', border: '1px solid rgba(255, 255, 255,0.1)' }}>
                <div className="form-group">
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: '900', color: 'var(--gold-primary)', marginBottom: '8px', letterSpacing: '1px' }}>EMAIL DE ACCESO</label>
                  <div style={{ position: 'relative' }}>
                    <Mail size={18} style={{ position: 'absolute', left: '16px', top: '16px', color: 'var(--gold-primary)' }} />
                    <input className="form-input" type="email" placeholder="persona@dientessanos.com" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} style={{ width: '100%', height: '50px', paddingLeft: '48px', border: '1px solid rgba(255, 255, 255,0.2)' }} />
                  </div>
                </div>
                <div className="form-group">
                  <FieldLabel>CONTRASEÑA</FieldLabel>
                  <div style={{ position: 'relative' }}>
                    <Lock size={18} style={{ position: 'absolute', left: '16px', top: '16px', color: 'var(--gold-primary)' }} />
                    <input 
                      className="form-input" 
                      type="password" 
                      placeholder="Mínimo 6 caracteres" 
                      value={formData.password} 
                      onChange={e => setFormData({...formData, password: e.target.value})} 
                      autoComplete="new-password"
                      style={{ width: '100%', height: '50px', paddingLeft: '48px', border: '1px solid rgba(255, 255, 255,0.2)' }} 
                    />
                  </div>
                </div>
              </div>

              <button className="btn-gold" onClick={handleSubmit} style={{ height: '56px', width: '100%', borderRadius: '16px', fontSize: '16px', fontWeight: '800', marginTop: '10px' }}>
                <Check size={20} style={{ marginRight: '10px' }} />
                Confirmar y unir al equipo
              </button>
            </div>
          </div>
        </div>
      )}

      {(() => {
        const term = staffSearch.trim().toLowerCase();
        const filteredStaff = staff.filter(person => {
          if (!term) return true;
          const name = (person.name || '').toLowerCase();
          const role = (person.role || '').toLowerCase().replace(/\|.*$/, '');
          const specialty = (person.specialty || '').toLowerCase();
          return name.includes(term) || role.includes(term) || specialty.includes(term);
        });
        return (
      loading ? (
        <SkeletonGrid items={6} itemHeight={190} minWidth={220} />
      ) : staff.length === 0 ? (
        <div className="glass-card" style={{ textAlign: 'center', padding: '80px', borderRadius: '32px' }}>
          <User size={64} color="rgba(255, 255, 255, 0.1)" style={{ marginBottom: '24px' }} />
          <h3 style={{ fontSize: '20px', color: 'var(--text-primary)' }}>El equipo está esperando</h3>
          <p style={{ color: 'var(--text-muted)', marginTop: '8px' }}>Comienza agregando a los miembros que harán brillar tu marca.</p>
        </div>
      ) : filteredStaff.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '20px' }}>
            <Search size={24} color="rgba(255,255,255,0.3)" />
          </div>
          <h3 style={{ fontSize: '18px', fontWeight: '800', color: 'white', marginBottom: '8px' }}>Sin resultados</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '14px', maxWidth: '300px', lineHeight: '1.5' }}>No encontramos a nadie con ese nombre en tu equipo.</p>
        </div>
      ) : (
        <div style={{
          display: (personnelView === 'cards' && (showForm || isFormExiting) && isEditing) ? 'flex' : 'block',
          gap: isMobile ? '0' : '24px',
          alignItems: 'flex-start'
        }}>
        <div
          key={personnelView}
          className="personnel-view-transition"
          style={
            personnelView === 'cards'
              ? { display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(auto-fill, minmax(240px, 1fr))', gap: isMobile ? '12px' : '20px', flex: (personnelView === 'cards' && (showForm || isFormExiting) && isEditing) ? '1' : undefined, minWidth: 0 }
              : { display: 'flex', flexDirection: 'column', gap: '16px', flex: 1 }
          }
        >
          {personnelView === 'table' && (
            <div style={{
              display: 'grid',
              gridTemplateColumns: isMobile ? 'minmax(0, 1fr) auto' : '80px 1.5fr minmax(0, 1fr) 1.5fr 1.2fr 140px',
              gap: '20px',
              padding: '0 24px',
              color: 'var(--text-muted)',
              fontSize: '11px',
              fontWeight: '900',
              letterSpacing: '1px',
              textTransform: 'uppercase'
            }}>
              {!isMobile && (
                <>
                  <div>MIEMBRO</div>
                  <div>NOMBRE / ROL</div>
                  <div>TELÉFONO</div>
                  <div>DIRECCIÓN</div>
                  <div>ACCESO</div>
                  <div style={{ textAlign: 'right' }}>ACCIONES</div>
                </>
              )}
            </div>
          )}

                    {filteredStaff.map(person => {
            const isThisEditing = (showForm || isFormExiting) && isEditing && editingId === person.id;

            return (
              <React.Fragment key={person.id}>
                {personnelView === 'cards' ? (
                    <div className="glass-card animate-slide-up" style={{
                      position: 'relative',
                      padding: '24px 16px',
                      borderRadius: isMobile ? '20px' : '24px',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      background: isThisEditing ? 'rgba(17, 17, 17,0.06)' : 'rgba(255,255,255,0.02)',
                      border: isThisEditing ? '1px solid rgba(17, 17, 17,0.25)' : '1px solid rgba(255,255,255,0.05)',
                      boxShadow: isThisEditing ? '0 8px 32px rgba(17, 17, 17,0.12)' : '0 8px 32px rgba(0,0,0,0.2)',
                      overflow: 'hidden',
                      transition: 'all 0.3s ease'
                    }}>
                          <div style={{ position: 'absolute', top: '-20%', left: '50%', transform: 'translateX(-50%)', width: '100px', height: '100px', background: 'var(--gold-primary)', filter: 'blur(80px)', opacity: 0.15, borderRadius: '50%', pointerEvents: 'none' }} />
                          {person.role?.split('|')[0]?.includes(', ') && (
                            <span style={{
                              position: 'absolute', top: '12px', right: '12px',
                              padding: '4px 8px', backgroundColor: 'rgba(255,255,255,0.05)', backdropFilter: 'blur(8px)',
                              color: 'var(--gold-primary)', borderRadius: '8px', fontSize: '10px', fontWeight: '800',
                              border: '1px solid rgba(255,255,255,0.1)'
                            }}>
                              MULTI-ROL
                            </span>
                          )}
                          <div style={{ 
                            width: isMobile ? '80px' : '96px', 
                            height: isMobile ? '80px' : '96px', 
                            borderRadius: '50%', 
                            border: '2px solid rgba(255,255,255,0.1)',
                            boxShadow: '0 8px 16px rgba(0,0,0,0.3)',
                            overflow: 'hidden', 
                            backgroundColor: 'rgba(255,255,255,0.05)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            marginBottom: '16px',
                            position: 'relative',
                            zIndex: 2
                          }}>
                             {person.image_url ? (
                               <img loading="lazy" src={person.image_url} alt={person.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                             ) : (
                               <span style={{ fontSize: isMobile ? '32px' : '40px', fontWeight: '900', color: 'var(--gold-primary)', opacity: 0.5 }}>
                                 {person.name.substring(0, 1).toUpperCase()}
                               </span>
                             )}
                          </div>
                          <div style={{ textAlign: 'center', position: 'relative', zIndex: 2, width: '100%' }}>
                            <h4 style={{ fontSize: isMobile ? '16px' : '18px', fontWeight: '900', color: 'white', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {person.name}
                            </h4>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', color: 'var(--gold-primary)', fontSize: isMobile ? '11px' : '12px', fontWeight: '700', marginTop: '4px' }}>
                              {getRoleIcon(person.role?.split('|')[0]?.split(', ')[0])}
                              <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{roleLabel(person.role?.split('|')[0])}</span>
                            </div>
                          </div>
                          <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '20px', position: 'relative', zIndex: 2 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: person.phone ? 'var(--text-secondary)' : 'var(--text-muted)', background: 'rgba(255,255,255,0.03)', padding: '10px 12px', borderRadius: '12px' }}>
                              <Phone size={14} color={person.phone ? 'var(--gold-primary)' : 'rgba(255,255,255,0.2)'} style={{ flexShrink: 0 }} />
                              <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{person.phone || 'Sin teléfono'}</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: person.email ? 'var(--text-secondary)' : 'var(--text-muted)', background: 'rgba(255,255,255,0.03)', padding: '10px 12px', borderRadius: '12px' }}>
                              {person.email ? <Mail size={14} color="var(--gold-primary)" style={{ flexShrink: 0 }} /> : <Lock size={14} style={{ flexShrink: 0 }} />}
                              <span className="lowercase-text" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{person.email || 'Sin email'}</span>
                            </div>
                          </div>
                          <div style={{ display: 'grid', gridTemplateColumns: isAdmin ? 'repeat(2, minmax(0, 1fr))' : '1fr', gap: '8px', width: '100%', marginTop: '16px', position: 'relative', zIndex: 2 }}>
                            {isAdmin && (
                              <button 
                                onClick={(e) => { e.stopPropagation(); handleEditClick(person); }}
                                style={{ background: 'rgba(255,255,255,0.05)', border: 'none', borderRadius: '12px', padding: '10px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', cursor: 'pointer', transition: 'all 0.2s' }}
                                onMouseOver={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
                                onMouseOut={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                              >
                                <Edit2 size={16} color="var(--gold-primary)" />
                                <span style={{ fontSize: '10px', color: 'var(--text-secondary)', fontWeight: '700' }}>Editar</span>
                              </button>
                            )}
                            {isAdmin && (
                              <button 
                                onClick={(e) => { e.stopPropagation(); handleDeleteStaff(person.id, person.name); }}
                                style={{ background: 'rgba(255,69,58,0.1)', border: 'none', borderRadius: '12px', padding: '10px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', cursor: 'pointer', transition: 'all 0.2s' }}
                                onMouseOver={e => e.currentTarget.style.background = 'rgba(255,69,58,0.2)'}
                                onMouseOut={e => e.currentTarget.style.background = 'rgba(255,69,58,0.1)'}
                              >
                                <Trash2 size={16} color="#ff453a" />
                                <span style={{ fontSize: '10px', color: '#ff453a', fontWeight: '700' }}>Eliminar</span>
                              </button>
                            )}
                          </div>
                        </div>
                  ) : (
                  isMobile ? (
                <div className="glass-card animate-slide-up" style={{ 
                  padding: '16px', 
                  borderRadius: '20px',
                  border: '1px solid rgba(255,255,255,0.05)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '14px',
                  transition: 'all 0.3s'
                }}>
                  {/* Top section: Photo + Name/Role + Actions */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
                      {/* Photo */}
                      <div style={{ 
                        width: '48px', 
                        height: '48px', 
                        borderRadius: '12px', 
                        backgroundColor: 'rgba(255,255,255,0.02)',
                        overflow: 'hidden',
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center',
                        border: '1px solid rgba(255,255,255,0.08)',
                        flexShrink: 0
                      }}>
                       {person.image_url ? (
                           <img loading="lazy" src={person.image_url} alt={person.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                         ) : (
                           <span style={{ fontSize: '18px', fontWeight: '900', color: 'var(--gold-primary)', opacity: 0.5 }}>
                             {person.name.substring(0, 1).toUpperCase()}
                           </span>
                         )}
                      </div>
                      
                      {/* Name and Role */}
                      <div style={{ minWidth: 0 }}>
                        <h4 style={{ fontSize: '15px', fontWeight: '800', color: 'white', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{person.name}</h4>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--gold-primary)', fontSize: '11px', fontWeight: '700', marginTop: '2px' }}>
                          {getRoleIcon(person.role?.split('|')[0]?.split(', ')[0])}
                          <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{roleLabel(person.role?.split('|')[0])}</span>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                      <button className="action-btn" onClick={() => handleEditClick(person)} title="Editar Miembro" style={{ width: '34px', height: '34px', borderRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.08)', transition: 'none' }}>
                        <Edit2 size={15} />
                      </button>
                      <button className="action-btn" onClick={() => handleDeleteStaff(person.id, person.name)} style={{ color: '#ff453a', backgroundColor: 'rgba(255,69,58,0.05)', width: '34px', height: '34px', borderRadius: '8px', border: '1px solid rgba(255, 69, 58, 0.2)', transition: 'none' }} title="Dar de baja">
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>

                  {/* Divider line */}
                  <div style={{ height: '1px', background: 'rgba(255,255,255,0.05)', width: '100%' }} />

                  {/* Details Section */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '13px' }}>
                    {/* Phone */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: person.phone ? 'var(--text-secondary)' : 'var(--text-muted)' }}>
                      <Phone size={13} color={person.phone ? "var(--gold-primary)" : "rgba(255,255,255,0.2)"} style={{ flexShrink: 0 }} />
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{person.phone || 'Sin teléfono'}</span>
                    </div>

                    {/* Address */}
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', color: person.address ? 'var(--text-secondary)' : 'var(--text-muted)' }}>
                      <MapPin size={13} color={person.address ? "var(--gold-primary)" : "rgba(255,255,255,0.2)"} style={{ marginTop: '2px', flexShrink: 0 }} />
                      <span style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {person.address || 'Sin dirección'}
                      </span>
                    </div>

                    {/* Access */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Mail size={13} color={person.email ? '#32d74b' : '#ff453a'} style={{ flexShrink: 0 }} />
                      {person.email ? (
                        <span className="lowercase-text" style={{ color: '#32d74b', fontWeight: '700', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{person.email}</span>
                      ) : (
                        <span style={{ color: '#ff453a', fontWeight: '700' }}>Sin email de acceso</span>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="glass-card animate-slide-up" style={{ 
                  padding: '16px 24px', 
                  borderRadius: '20px',
                  border: '1px solid rgba(255,255,255,0.05)',
                  display: 'grid',
                  gridTemplateColumns: '80px 1.5fr minmax(0, 1fr) 1.5fr 1.2fr 140px',
                  alignItems: 'center',
                  gap: '20px',
                  transition: 'none'
                }}>
                  {/* Photo Column */}
                  <div style={{ 
                    width: '56px', 
                    height: '56px', 
                    borderRadius: '14px', 
                    backgroundColor: 'rgba(255,255,255,0.02)',
                    overflow: 'hidden',
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    border: '1px solid rgba(255,255,255,0.08)'
                  }}>
                     {person.image_url ? (
                       <img loading="lazy" src={person.image_url} alt={person.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                     ) : (
                       <span style={{ fontSize: '20px', fontWeight: '900', color: 'var(--gold-primary)', opacity: 0.5 }}>
                         {person.name.substring(0, 1).toUpperCase()}
                       </span>
                     )}
                  </div>
                  
                  {/* Name/Role Column */}
                  <div style={{ minWidth: 0, overflow: 'hidden' }}>
                    <h4 style={{ fontSize: '16px', fontWeight: '800', color: 'white', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{person.name}</h4>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--gold-primary)', fontSize: '11px', fontWeight: '700', marginTop: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {getRoleIcon(person.role?.split('|')[0]?.split(', ')[0])}
                      <span>{roleLabel(person.role?.split('|')[0])}</span>
                      {person.role?.split('|')[0]?.includes(', ') && (
                        <span style={{ 
                          padding: '2px 6px', 
                          backgroundColor: 'rgba(255, 255, 255,0.1)', 
                          borderRadius: '4px', 
                          fontSize: '9px',
                          marginLeft: '4px',
                          border: '1px solid rgba(255, 255, 255,0.2)',
                          flexShrink: 0
                        }}>
                          MULTI-ROL
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Phone Column */}
                  <div style={{ color: person.phone ? 'var(--text-secondary)' : 'var(--text-muted)', fontSize: '14px', minWidth: 0, overflow: 'hidden' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Phone size={14} color={person.phone ? "var(--gold-primary)" : "rgba(255,255,255,0.2)"} style={{ flexShrink: 0 }} />
                      <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{person.phone || 'Sin teléfono'}</span>
                    </div>
                    {person.birth_date && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '6px', fontSize: '11px', color: 'var(--gold-primary)' }}>
                        <Cake size={12} fill="var(--gold-primary)" style={{ flexShrink: 0 }} />
                        <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{new Date(person.birth_date + 'T00:00:00').toLocaleDateString([], { day: '2-digit', month: 'short' })}</span>
                      </div>
                    )}
                  </div>

                  {/* Address Column */}
                  <div style={{ color: person.address ? 'var(--text-secondary)' : 'var(--text-muted)', fontSize: '13px', minWidth: 0, overflow: 'hidden' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                      <MapPin size={14} color={person.address ? "var(--gold-primary)" : "rgba(255,255,255,0.2)"} style={{ marginTop: '2px', flexShrink: 0 }} />
                      <span style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {person.address || 'Sin dirección'}
                      </span>
                    </div>
                  </div>

                  {/* Access Column */}
                  <div style={{ minWidth: 0, overflow: 'hidden' }}>
                    {person.email ? (
                      <div style={{ 
                        display: 'inline-flex', 
                        alignItems: 'center', 
                        gap: '6px', 
                        padding: '4px 10px', 
                        backgroundColor: 'rgba(50, 215, 75, 0.08)', 
                        color: '#32d74b', 
                        borderRadius: '8px',
                        fontSize: '11px',
                        fontWeight: '800',
                        maxWidth: '100%'
                      }}>
                        <Mail size={12} style={{ flexShrink: 0 }} />
                        <span className="lowercase-text" style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>{person.email}</span>
                      </div>
                    ) : (
                      <div style={{ 
                        display: 'inline-flex', 
                        alignItems: 'center', 
                        gap: '6px', 
                        padding: '4px 10px', 
                        backgroundColor: 'rgba(255, 69, 58, 0.08)', 
                        color: '#ff453a', 
                        borderRadius: '8px',
                        fontSize: '11px',
                        fontWeight: '800',
                        maxWidth: '100%'
                      }}>
                        <Lock size={12} style={{ flexShrink: 0 }} />
                        <span style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>SIN EMAIL AUTH</span>
                      </div>
                    )}
                  </div>

                  {/* Actions Column */}
                  <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                    <button className="action-btn" onClick={() => handleEditClick(person)} title="Editar Miembro" style={{ border: '1px solid rgba(255, 255, 255, 0.08)', transition: 'none' }}>
                      <Edit2 size={18} />
                    </button>
                    <button className="action-btn" onClick={() => handleDeleteStaff(person.id, person.name)} style={{ color: '#ff453a', backgroundColor: 'rgba(255,69,58,0.05)', border: '1px solid rgba(255, 69, 58, 0.2)', transition: 'none' }} title="Dar de baja">
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              )
                )}

                {/* Inline Edit Form for table view only */}
                {personnelView === 'table' && isThisEditing && (
                  renderEditForm(person)
                )}
              </React.Fragment>
            );
          })}
          </div>

          {(personnelView === 'cards' && (showForm || isFormExiting) && isEditing) && (
            <div style={{
              flex: isMobile ? 'none' : '0 0 600px',
              width: isMobile ? '100%' : '600px',
              position: 'relative',
              borderRadius: '24px',
              background: 'rgba(255,255,255,0.02)',
              border: '1px solid rgba(255,255,255,0.05)',
              padding: '24px'
            }}>
              {renderEditForm(staff.find(s => s.id === editingId))}
            </div>
          )}
        </div>
      )
        );
      })()}

        </>
      )}

      {activeTab === 'attendance' && (() => {
        const eligibleStaff = staff.filter(member => {
          const roleName = (member.role?.split('|')[0] || 'Barbero').toLowerCase();
          return !roleName.includes('admin') &&
                 !roleName.includes('recepcionista') &&
                 !roleName.includes('caja');
        });

        // turnQueue ya viene ordenado por 'position' (orden real de llegada/turno)
        const checkedInOrder = turnQueue.filter(q => q.status !== 'ABSENT');

        const withStatus = eligibleStaff.map(member => {
          const queueEntry = turnQueue.find(q => q.staff_id === member.id);
          const isCheckedIn = !!(queueEntry && queueEntry.status !== 'ABSENT');
          const queueIndex = checkedInOrder.findIndex(q => q.staff_id === member.id);
          return { member, queueEntry, isCheckedIn, queueIndex };
        });

        const search = staffSearch.trim().toLowerCase();
        const filtered = search
          ? withStatus.filter(({ member }) => {
              const name = (member.name || '').toLowerCase();
              const role = (member.role || '').toLowerCase().replace(/\|.*$/, '');
              return name.includes(search) || role.includes(search);
            })
          : withStatus;

        const sorted = [...filtered].sort((a, b) => {
          if (a.isCheckedIn && !b.isCheckedIn) return -1;
          if (!a.isCheckedIn && b.isCheckedIn) return 1;
          if (a.isCheckedIn && b.isCheckedIn) return a.queueIndex - b.queueIndex;
          return a.member.name.localeCompare(b.member.name);
        });

        const checkedInCount = checkedInOrder.length;
        const totalCount = eligibleStaff.length;

        // Agrupa por categoría de rol, conservando el orden de llegada real dentro de cada grupo
        const getCategory = (roleName) => {
          const r = (roleName || '').toLowerCase();
          if (r.includes('tatuador')) return '';
          if (r.includes('barbero')) return 'Odontólogos';
          if (r.includes('barista')) return 'Barista';
          return 'Asistentes';
        };
        const categoryOrder = ['Odontólogos', '', 'Barista', 'Asistentes'];
        const grouped = categoryOrder
          .map(category => ({
            category,
            items: sorted.filter(entry => getCategory(entry.member.role?.split('|')[0]) === category)
          }))
          .filter(g => g.items.length > 0);

        const renderCard = ({ member, queueEntry, isCheckedIn, queueIndex }, big) => {
          const streak = getAttendanceStreak(member.id);
          const compact = isMobile && !big;
          const showFallback = !member.image_url;

          return (
            <div 
              key={member.id} 
              className="glass-card animate-slide-up"
              style={{
                display: 'flex',
                flexDirection: 'column',
                padding: 0,
                borderRadius: '16px',
                background: 'var(--bg-secondary)',
                border: isCheckedIn ? '1px solid rgba(50, 215, 75, 0.3)' : '1px solid rgba(255, 255, 255, 0.05)',
                boxShadow: isCheckedIn ? '0 0 20px rgba(50,215,75,0.1)' : '0 10px 30px rgba(0,0,0,0.5)',
                transition: 'all 0.3s ease',
                position: 'relative',
                overflow: 'hidden',
                height: '320px' // Fixed height for cinematic cards
              }}
            >
              {/* Photo & Overlay (Clickable to view attendance history) */}
              <div 
                onClick={() => setHistoryModalMember(member)}
                title={`Ver historial de asistencia de ${member.name}`}
                style={{ 
                  position: 'relative', 
                  flex: 1, 
                  overflow: 'hidden',
                  cursor: 'pointer',
                  transition: 'opacity 0.2s ease'
                }}
                onMouseEnter={e => e.currentTarget.style.opacity = '0.92'}
                onMouseLeave={e => e.currentTarget.style.opacity = '1'}
              >
                <div style={{ position: 'absolute', inset: 0 }}>
                  {showFallback ? (
                    <div style={{ 
                      width: '100%', height: '100%', 
                      background: 'radial-gradient(circle at 50% 30%, rgba(17, 17, 17,0.15) 0%, #111 80%)', 
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      boxShadow: 'inset 0 0 40px rgba(0,0,0,0.8)'
                    }}>
                      <span style={{ fontSize: '56px', fontWeight: '900', color: 'rgba(17, 17, 17,0.8)', textShadow: '0 4px 12px rgba(0,0,0,0.5)' }}>{member.name.charAt(0).toUpperCase()}</span>
                    </div>
                  ) : (
                     <img loading="lazy" src={member.image_url} alt={member.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                   )}
                 </div>
                
                {/* Gradient fade out to dark at the bottom of the image */}
                <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '70%', background: 'var(--bg-secondary)' }} />

                {/* Top Right Badges */}
                <div style={{ position: 'absolute', top: '12px', right: '12px', display: 'flex', gap: '6px', zIndex: 2 }}>
                  {isCheckedIn && queueIndex >= 0 ? (
                    <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: '800', color: 'white' }}>
                      {queueIndex + 1}
                    </div>
                  ) : (
                    <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(8px)', border: '1px solid rgba(17, 17, 17,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.4)' }}>
                      <Clock size={14} color="var(--gold-primary)" />
                    </div>
                  )}
                </div>

                {/* Bottom Left Text over gradient */}
                <div style={{ position: 'absolute', bottom: '16px', left: '16px', right: '16px' }}>
                  <h4 style={{ fontSize: '18px', fontWeight: '800', color: 'white', margin: '0 0 2px 0', letterSpacing: '-0.4px', wordBreak: 'break-word', lineHeight: '1.2' }}>
                    {member.name}
                  </h4>
                  <p style={{ fontSize: '11px', color: 'var(--gold-primary)', fontWeight: '800', margin: '0 0 8px 0', letterSpacing: '0.5px' }}>
                    {(roleLabel(member.role?.split('|')[0]) || 'Odontólogo')}
                  </p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: isCheckedIn ? '#32d74b' : 'rgba(255,255,255,0.4)', boxShadow: isCheckedIn ? '0 0 8px rgba(50,215,75,0.6)' : 'none', flexShrink: 0 }} />
                    <span style={{ fontSize: '11px', fontWeight: '600', color: 'rgba(255,255,255,0.6)', lineHeight: '1.2' }}>
                      {isCheckedIn ? (
                        `En turno desde ${queueEntry?.updated_at ? new Date(queueEntry.updated_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }) : ''}`
                      ) : (
                        (() => {
                          const memberLogs = attendanceLogs.filter(log => log.staff_id === member.id && log.check_out).sort((a, b) => new Date(b.check_in) - new Date(a.check_in));
                          const lastLog = memberLogs[0];
                          if (lastLog) {
                            const isToday = new Date(lastLog.check_out).toDateString() === new Date().toDateString();
                            const inTime = new Date(lastLog.check_in).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
                            const outTime = new Date(lastLog.check_out).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
                            return isToday ? `Hoy: ${inTime} - ${outTime}` : `Ayer: ${inTime} - ${outTime}`;
                          }
                          return 'Ausente';
                        })()
                      )}
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Button Section */}
              <div style={{ padding: '0 12px 12px 12px', background: 'var(--bg-secondary)' }}>
                {isCheckedIn ? (
                  <button
                    disabled={loading}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleCheckOut(member.id);
                    }}
                    style={{
                      width: '100%', padding: '12px', borderRadius: '10px',
                      background: 'rgba(255, 59, 48, 0.15)', border: '1px solid rgba(255, 59, 48, 0.3)',
                      color: '#ff6961', fontWeight: '800', fontSize: '13px', letterSpacing: '0.2px',
                      cursor: loading ? 'not-allowed' : 'pointer', transition: 'all 0.2s',
                      display: 'flex', justifyContent: 'center', alignItems: 'center'
                    }}
                    onMouseEnter={e => { if (!loading) e.currentTarget.style.background = 'rgba(255, 59, 48, 0.25)'; }}
                    onMouseLeave={e => { if (!loading) e.currentTarget.style.background = 'rgba(255, 59, 48, 0.15)'; }}
                  >
                    Finalizar Turno
                  </button>
                ) : (
                  <button
                    disabled={loading}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleCheckIn(member.id, member.name);
                    }}
                    style={{
                      width: '100%', padding: '12px', borderRadius: '10px',
                      background: '#d1bfae', border: 'none',
                      color: 'black', fontWeight: '800', fontSize: '13px',
                      cursor: loading ? 'not-allowed' : 'pointer', transition: 'all 0.2s',
                      display: 'flex', justifyContent: 'center', alignItems: 'center'
                    }}
                    onMouseEnter={e => { if (!loading) e.currentTarget.style.transform = 'scale(1.02)'; }}
                    onMouseLeave={e => { if (!loading) e.currentTarget.style.transform = 'scale(1)'; }}
                  >
                    Registrar Llegada
                  </button>
                )}
              </div>
            </div>
          );
        };

        const renderGrid = (gridTemplateColumns, gap, big) => (
          <div style={{
            display: 'grid',
            gridTemplateColumns,
            gap,
            justifyContent: attendanceOnly && !isMobile ? 'start' : undefined
          }}>
            {sorted.map(entry => renderCard(entry, big))}
          </div>
        );

        const searchBar = (
          <div style={{ position: 'relative', flex: 1, minWidth: '200px' }}>
            <Search size={16} color="var(--text-muted)" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }} />
            <input
              type="text"
              value={staffSearch}
              onChange={e => setStaffSearch(e.target.value)}
              placeholder="Buscar por nombre, rol o especialidad..."
              className="search-subtle"
              style={{
                width: '100%',
                padding: '10px 14px 10px 40px',
                borderRadius: '12px',
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.08)',
                color: 'white',
                fontSize: '13px',
                outline: 'none',
                boxSizing: 'border-box'
              }}
            />
          </div>
        );

        return (
          <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: '16px', flexWrap: 'wrap', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '20px', paddingRight: '48px' }}>
              <div style={{ flex: 1 }}>
                <h3 style={{ fontSize: '24px', fontWeight: '800', color: 'white', letterSpacing: '-0.8px', margin: '0 0 4px 0' }}>
                  Asistencia
                </h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '13px', margin: 0 }}>
                  Control de turnos y personal activo
                </p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 14px', background: 'rgba(50, 215, 75, 0.08)', borderRadius: '100px', border: '1px solid rgba(50, 215, 75, 0.2)' }}>
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#32d74b', boxShadow: '0 0 8px rgba(50,215,75,0.6)' }} />
                <span style={{ fontSize: '12px', fontWeight: '800', color: '#32d74b', letterSpacing: '-0.2px' }}>
                  {checkedInCount} <span style={{ color: 'rgba(50, 215, 75, 0.7)', fontWeight: '600' }}>/ {totalCount} activos</span>
                </span>
              </div>
            </div>

            {justCheckedIn && (
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px',
                padding: '12px 18px', borderRadius: '14px',
                background: 'rgba(50,215,75,0.08)', border: '1px solid rgba(50,215,75,0.25)'
              }}>
                <span style={{ fontSize: '13px', color: 'white', fontWeight: '600' }}>
                  Registraste la llegada de <strong>{justCheckedIn.name}</strong>
                </span>
                <button
                  onClick={() => undoCheckIn(justCheckedIn.id)}
                  style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'none', border: 'none', color: '#32d74b', fontWeight: '800', fontSize: '12px', cursor: 'pointer', flexShrink: 0 }}
                >
                  <Undo2 size={14} /> Deshacer
                </button>
              </div>
            )}

            {sorted.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '80px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '20px' }}>
                  <Search size={24} color="rgba(255,255,255,0.3)" />
                </div>
                <h3 style={{ fontSize: '18px', fontWeight: '800', color: 'white', marginBottom: '8px' }}>Sin resultados</h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '14px', maxWidth: '300px', lineHeight: '1.5' }}>No encontramos a nadie con ese nombre en tu equipo.</p>
              </div>
            ) : (
              renderGrid(
                isMobile
                  ? 'repeat(auto-fill, minmax(160px, 1fr))'
                  : 'repeat(auto-fill, minmax(200px, 1fr))',
                isMobile ? '12px' : '16px',
                false
              )
            )}

            <AnimatedModal isOpen={kioskMode}>
              {(overlayClass) => (
                <div className={overlayClass} style={{ position: 'fixed', inset: 0, zIndex: 20000, background: '#f4f5f3', overflowY: 'auto', padding: isMobile ? '24px 16px' : '48px', paddingTop: isMobile ? 'max(24px, env(safe-area-inset-top, 24px))' : 'max(48px, env(safe-area-inset-top, 48px))' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px', flexWrap: 'wrap', maxWidth: '1400px', margin: '0 auto 32px' }}>
                    <div>
                      <h2 style={{ fontSize: isMobile ? '24px' : '32px', fontWeight: '800', color: 'white' }}>Clínica Hoy</h2>
                      <p style={{ color: 'var(--text-secondary)', marginTop: '4px' }}>{checkedInCount} de {totalCount} en la clínica</p>
                    </div>
                    <button
                      onClick={() => setKioskMode(false)}
                      className="tap-scale"
                      style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '14px 22px', borderRadius: '14px', background: 'var(--gold-primary)', border: 'none', color: 'black', fontWeight: '900', fontSize: '14px', cursor: 'pointer' }}
                    >
                      <X size={18} /> Salir
                    </button>
                  </div>
                  <div style={{ maxWidth: '1400px', margin: '0 auto 24px' }}>{searchBar}</div>
                  <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
                    {renderGrid(isMobile ? 'repeat(auto-fill, minmax(160px, 1fr))' : 'repeat(auto-fill, minmax(260px, 1fr))', '24px', true)}
                  </div>
                </div>
              )}
            </AnimatedModal>
          </div>
        );
      })()}

      {activeTab === 'reports' && (
        <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
          
          {loadingReports ? (
            <SkeletonList rows={4} rowHeight={70} />
          ) : (() => {
            const reviewsWithVal = allReviews.filter(r => r.rapidez !== undefined || r.rating !== undefined || r.comment);
            
            // Filter by Period
            const reviewsFilteredByPeriod = reviewsWithVal.filter(rev => {
              if (filterPeriod === 'all') return true;
              const revDate = new Date(rev.created_at);
              const now = new Date();
              const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
              const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
              const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
              const startOfLast3Months = new Date(now.getFullYear(), now.getMonth() - 2, 1);

              if (filterPeriod === 'this-month') {
                return revDate >= startOfThisMonth;
              } else if (filterPeriod === 'last-month') {
                return revDate >= startOfLastMonth && revDate <= endOfLastMonth;
              } else if (filterPeriod === 'last-3-months') {
                return revDate >= startOfLast3Months;
              }
              return true;
            });

            // Calculate Global Stats
            const totalReviews = reviewsFilteredByPeriod.length;
            const avgRapidez = totalReviews ? (reviewsFilteredByPeriod.reduce((acc, r) => acc + Number(r.rapidez || r.rating || 5), 0) / totalReviews).toFixed(1) : '5.0';
            const avgLimpieza = totalReviews ? (reviewsFilteredByPeriod.reduce((acc, r) => acc + Number(r.limpieza || r.rating || 5), 0) / totalReviews).toFixed(1) : '5.0';
            const avgHabilidad = totalReviews ? (reviewsFilteredByPeriod.reduce((acc, r) => acc + Number(r.habilidad || r.rating || 5), 0) / totalReviews).toFixed(1) : '5.0';
            const avgGeneral = totalReviews ? (reviewsFilteredByPeriod.reduce((acc, r) => acc + Number(r.rating || 5), 0) / totalReviews).toFixed(1) : '5.0';

            // Barber of the Month calculation
            const staffAverages = staff
              .filter(member => {
                const roleName = (member.role?.split('|')[0] || '').toLowerCase();
                return roleName.includes('barbero');
              })
              .map(member => {
                const memberReviews = reviewsFilteredByPeriod.filter(r => r.staff_id === member.id);
                const avg = memberReviews.length ? memberReviews.reduce((acc, r) => acc + Number(r.rating || 5), 0) / memberReviews.length : 0;
                return {
                  member,
                  avg,
                  count: memberReviews.length
                };
              }).filter(s => s.avg > 0);

            staffAverages.sort((a, b) => b.avg - a.avg || b.count - a.count);
            const starBarber = staffAverages[0] || null;

            // Apply Filters to feed list
            const filteredReviews = reviewsFilteredByPeriod.filter(rev => {
              if (filterStaffId !== 'all' && rev.staff_id !== filterStaffId) return false;
              
              if (filterRatingType === 'high' && (rev.rating || 5) < 4.5) return false;
              if (filterRatingType === 'low' && (rev.rating || 5) >= 3.5) return false;
              
              if (staffSearch.trim()) {
                const searchLower = staffSearch.toLowerCase();
                const clientName = (rev.clients?.name || 'Cliente').toLowerCase();
                const comment = (rev.comment || '').toLowerCase();
                const barberName = (staff.find(s => s.id === rev.staff_id)?.name || '').toLowerCase();
                
                if (!clientName.includes(searchLower) && !comment.includes(searchLower) && !barberName.includes(searchLower)) {
                  return false;
                }
              }
              return true;
            });

            return (
              <>
                {/* ── HEADER CARD ── */}
                <div style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '20px', marginBottom: '8px' }}>
                  <h3 style={{ fontSize: '24px', fontWeight: '800', color: 'white', letterSpacing: '-0.8px', margin: '0 0 4px 0' }}>
                    Control de Calidad y Feedback
                  </h3>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '13px', margin: 0 }}>
                    Calificaciones y opiniones de tus clientes sobre cada odontólogo.
                  </p>
                </div>

                {/* ── GENERAL STATS & STAR BARBER ROW ── */}
                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '2fr minmax(0, 1fr)', gap: '24px' }}>
                  {/* Global Quality Indicators */}
                  <div 
                    className="glass-card" 
                    style={{ 
                      padding: '24px', 
                      borderRadius: '24px', 
                      background: 'rgba(255,255,255,0.01)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '20px',
                      transition: 'none'
                    }}
                  >
                    <h4 style={{ fontSize: '14px', fontWeight: '900', color: 'var(--gold-primary)', margin: 0, letterSpacing: '0.5px', textTransform: 'uppercase' }}>
                      Resumen de Calificaciones
                    </h4>
                    
                    <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(4, minmax(0, 1fr))', gap: '16px' }}>
                      {/* Rating General */}
                      <div style={{ textAlign: 'center', padding: '16px', borderRadius: '16px', background: 'rgba(17, 17, 17, 0.06)', border: '1px solid rgba(17, 17, 17, 0.15)' }}>
                        <Star size={20} color="var(--gold-primary)" fill="var(--gold-primary)" style={{ margin: '0 auto 8px' }} />
                        <div style={{ fontSize: '24px', fontWeight: '900', color: 'white' }}>{avgGeneral}</div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '700', marginTop: '4px' }}>GLOBAL</div>
                      </div>

                      {/* Rapidez */}
                      <div style={{ textAlign: 'center', padding: '16px', borderRadius: '16px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)' }}>
                        <Clock size={20} color="var(--text-muted)" style={{ margin: '0 auto 8px' }} />
                        <div style={{ fontSize: '24px', fontWeight: '900', color: 'white' }}>{avgRapidez}</div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '700', marginTop: '4px' }}>RAPIDEZ</div>
                      </div>

                      {/* Limpieza */}
                      <div style={{ textAlign: 'center', padding: '16px', borderRadius: '16px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)' }}>
                        <Droplets size={20} color="var(--text-muted)" style={{ margin: '0 auto 8px' }} />
                        <div style={{ fontSize: '24px', fontWeight: '900', color: 'white' }}>{avgLimpieza}</div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '700', marginTop: '4px' }}>LIMPIEZA</div>
                      </div>

                      {/* Habilidad */}
                      <div style={{ textAlign: 'center', padding: '16px', borderRadius: '16px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)' }}>
                        <Scissors size={20} color="var(--text-muted)" style={{ margin: '0 auto 8px' }} />
                        <div style={{ fontSize: '24px', fontWeight: '900', color: 'white' }}>{avgHabilidad}</div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '700', marginTop: '4px' }}>HABILIDAD</div>
                      </div>
                    </div>
                  </div>

                  {/* Star Barber of the Month */}
                  <div 
                    className="glass-card" 
                    style={{ 
                      borderRadius: '24px', 
                      border: '1.5px solid var(--gold-primary)',
                      background: 'var(--bg-secondary)',
                      boxShadow: '0 8px 32px rgba(17, 17, 17,0.08)',
                      display: 'flex',
                      flexDirection: isMobile ? 'column' : 'row',
                      alignItems: 'stretch',
                      position: 'relative',
                      overflow: 'hidden',
                      transition: 'none',
                      minHeight: '220px'
                    }}
                  >
                    {/* Background badge icon */}
                    <div style={{ position: 'absolute', top: 12, right: 12, opacity: 0.15, color: 'var(--gold-primary)', zIndex: 1 }}>
                      <Award size={72} />
                    </div>

                    {starBarber ? (
                      <>
                        {/* Left half: Giant Full Bleed Photo with Gradient Mask */}
                        <div style={{ 
                          width: isMobile ? '100%' : '42%', 
                          height: isMobile ? '160px' : 'auto',
                          position: 'relative',
                          overflow: 'hidden',
                          background: 'var(--bg-secondary)',
                          flexShrink: 0
                        }}>
                           {starBarber.member.image_url ? (
                             <img 
                               loading="lazy"
                               src={starBarber.member.image_url} 
                              alt={starBarber.member.name} 
                              style={{ 
                                width: '100%', 
                                height: '100%', 
                                objectFit: 'cover',
                                filter: 'contrast(1.05) brightness(0.95)'
                              }} 
                            />
                          ) : (
                            <div style={{ 
                              width: '100%', 
                              height: '100%', 
                              display: 'flex', 
                              alignItems: 'center', 
                              justifyContent: 'center', 
                              background: 'linear-gradient(135deg, rgba(17, 17, 17,0.15), rgba(17, 17, 17,0.05))',
                              color: 'var(--gold-primary)', 
                              fontWeight: '900',
                              fontSize: '24px',
                              letterSpacing: '1px'
                            }}>
                              {starBarber.member.name.substring(0, 1).toUpperCase()}
                            </div>
                          )}
                          {/* Smooth right-fade (or bottom-fade on mobile) gradient overlay */}
                          <div style={{ 
                            position: 'absolute', 
                            inset: 0, 
                            background: isMobile 
                              ? 'linear-gradient(to bottom, rgba(20,20,22,0) 50%, rgba(20,20,22,0.9) 100%)'
                              : 'linear-gradient(to right, rgba(20,20,22,0) 60%, rgba(20,20,22,0.95) 100%)',
                            zIndex: 2
                          }} />
                        </div>

                        {/* Right half: Info and Badges */}
                        <div style={{ 
                          flex: 1, 
                          padding: '24px', 
                          display: 'flex', 
                          flexDirection: 'column', 
                          justifyContent: 'center', 
                          alignItems: isMobile ? 'center' : 'flex-start',
                          textAlign: isMobile ? 'center' : 'left',
                          gap: '12px',
                          zIndex: 3
                        }}>
                          <span style={{ 
                            fontSize: '9px', 
                            fontWeight: '900', 
                            color: 'var(--gold-primary)', 
                            letterSpacing: '2px', 
                            textTransform: 'uppercase',
                            background: 'rgba(17, 17, 17, 0.08)',
                            padding: '4px 10px',
                            borderRadius: '20px',
                            border: '1px solid rgba(17, 17, 17, 0.15)'
                          }}>
                            Odontólogo Estrella del Mes
                          </span>

                          <div style={{ marginTop: '4px' }}>
                            <h5 style={{ 
                              fontSize: '20px', 
                              fontWeight: '900', 
                              color: 'white', 
                              margin: 0,
                              letterSpacing: '-0.3px',
                              lineHeight: '1.2'
                            }}>
                              {starBarber.member.name}
                            </h5>
                            <span style={{ 
                              fontSize: '11px', 
                              color: 'var(--text-muted)', 
                              fontWeight: '800', 
                              letterSpacing: '1px',
                              textTransform: 'uppercase',
                              marginTop: '2px',
                              display: 'block'
                            }}>
                              Especialista Dental
                            </span>
                          </div>

                          <div style={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: '6px',
                            background: 'rgba(255,255,255,0.03)',
                            padding: '6px 12px',
                            borderRadius: '10px',
                            border: '1px solid rgba(255,255,255,0.05)',
                            marginTop: '2px'
                          }}>
                            <span style={{ fontSize: '14px', fontWeight: '900', color: 'white' }}>
                              {starBarber.avg.toFixed(1)}
                            </span>
                            <Star size={13} fill="var(--gold-primary)" color="var(--gold-primary)" />
                            <span style={{ color: 'var(--text-muted)', fontSize: '12px', fontWeight: '600' }}>
                              ({starBarber.count} res.)
                            </span>
                          </div>
                        </div>
                      </>
                    ) : (
                      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', gap: '8px', padding: '24px' }}>
                        <Award size={24} color="var(--text-muted)" />
                        <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontStyle: 'italic' }}>Sin valoraciones registradas</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* ── FILTER & TOOLBAR BAR ── */}
                <div 
                  className="glass-card"
                  style={{ 
                    padding: '16px 24px', 
                    borderRadius: '20px', 
                    background: 'rgba(255,255,255,0.01)',
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: '16px',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    transition: 'none'
                  }}
                >
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center' }}>
                    {/* Filter by Staff */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: '700', textTransform: 'uppercase' }}>Odontólogo:</span>
                      <PandaSelect
                        options={[
                          { value: 'all', label: 'Todos', imageUrl: '/panda-team-avatar.png', avatarFallback: 'EQ', subtitle: 'Todos los Odontólogos' },
                          ...staff.filter(member => {
                            const roleName = (member.role?.split('|')[0] || '').toLowerCase();
                            return roleName.includes('barbero');
                          }).map(member => ({
                            value: member.id,
                            label: member.name,
                            imageUrl: member.image_url || member.avatar_url || '',
                            avatarFallback: (member.name || '?').trim().charAt(0).toUpperCase(),
                            subtitle: roleLabel((member.role || 'Barbero').split('|')[0])
                          }))
                        ]}
                        value={filterStaffId}
                        onChange={(val) => setFilterStaffId(val)}
                        style={{ width: '180px' }}
                      />
                    </div>

                    {/* Filter by Period */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: '700', textTransform: 'uppercase' }}>Periodo:</span>
                      <PandaSelect
                        options={[
                          { value: 'all', label: 'Todos' },
                          { value: 'this-month', label: 'Este mes' },
                          { value: 'last-month', label: 'Mes anterior' },
                          { value: 'last-3-months', label: 'Últimos 3 meses' }
                        ]}
                        value={filterPeriod}
                        onChange={(val) => setFilterPeriod(val)}
                        style={{ width: '160px' }}
                      />
                    </div>

                    {/* Filter by Rating Segment */}
                    <div style={{ display: 'flex', background: 'rgba(255,255,255,0.04)', padding: '3px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.06)' }}>
                      {[
                        { key: 'all', label: 'Todas' },
                        { key: 'high', label: 'Destacadas (4.5★+)' },
                        { key: 'low', label: 'Críticas (<3.5★)' }
                      ].map(seg => (
                        <button
                          key={seg.key}
                          onClick={() => setFilterRatingType(seg.key)}
                          style={{
                            background: filterRatingType === seg.key ? 'var(--gold-primary)' : 'transparent',
                            color: filterRatingType === seg.key ? '#0c0c0e' : 'var(--text-secondary)',
                            border: 'none',
                            padding: '6px 12px',
                            borderRadius: '8px',
                            fontSize: '12px',
                            fontWeight: '800',
                            cursor: 'pointer',
                            transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)'
                          }}
                        >
                          {seg.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: '700' }}>
                    {filteredReviews.length} {filteredReviews.length === 1 ? 'reseña encontrada' : 'reseñas encontradas'}
                  </div>
                </div>

                {/* ── REVIEWS FEED (3-Column Grid) ── */}
                <div style={{ 
                  display: 'grid', 
                  gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, minmax(0, 1fr))', 
                  gap: '20px' 
                }}>
                  {filteredReviews.length > 0 ? (
                    filteredReviews.map((rev) => {
                      const clientName = rev.clients?.name || 'Cliente';
                      const avgRev = (Number(rev.rapidez || 0) + Number(rev.limpieza || 0) + Number(rev.habilidad || 0)) / 3;
                      const dateFormatted = rev.created_at ? new Date(rev.created_at).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '';
                      const barber = staff.find(s => s.id === rev.staff_id);

                      return (
                        <div 
                           key={rev.id} 
                           className="glass-card animate-slide-up"
                           style={{ 
                             padding: '20px', 
                             borderRadius: '20px', 
                             background: 'rgba(255,255,255,0.01)', 
                             border: '1px solid rgba(255,255,255,0.04)',
                             display: 'flex',
                             flexDirection: 'column',
                             gap: '16px',
                             transition: 'all 0.2s',
                             justifyContent: 'space-between'
                           }}
                           onMouseOver={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.025)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; }}
                           onMouseOut={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.01)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.04)'; }}
                        >
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', flex: 1 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
                              {/* Client & Barber Info */}
                              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                {/* Barber Mini Avatar */}
                                <div style={{ width: '36px', height: '36px', borderRadius: '50%', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)', background: 'var(--bg-secondary)', flexShrink: 0 }}>
                                   {barber?.image_url ? (
                                     <img loading="lazy" src={barber.image_url} alt={barber.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                  ) : (
                                    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.05)', color: 'var(--gold-primary)', fontWeight: '800', fontSize: '12px' }}>
                                      {barber?.name?.substring(0, 1)?.toUpperCase() || 'B'}
                                    </div>
                                  )}
                                </div>
                                <div>
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                    <span style={{ fontWeight: '800', fontSize: '13px', color: 'white' }}>{clientName}</span>
                                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                                      evaluó a <span style={{ color: 'var(--gold-primary)', fontWeight: '700' }}>{barber?.name || 'Odontólogo'}</span>
                                    </span>
                                  </div>
                                  <span style={{ fontSize: '10px', color: 'var(--text-muted)', display: 'block', marginTop: '2px' }}>{dateFormatted}</span>
                                </div>
                              </div>

                              {/* Average Rating Badge & Delete Button */}
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'rgba(17, 17, 17, 0.1)', padding: '4px 8px', borderRadius: '6px', fontSize: '12px', fontWeight: '900', color: 'var(--champagne)' }}>
                                  <span>{(avgRev || rev.rating || 5).toFixed(1)}</span>
                                  <Star size={11} fill="currentColor" />
                                </div>
                                <button 
                                  onClick={() => handleDeleteReview(rev.id)}
                                  title="Eliminar valoración"
                                  style={{
                                    background: 'rgba(255,59,48,0.1)',
                                    border: 'none',
                                    borderRadius: '6px',
                                    padding: '6px',
                                    color: '#ff3b30',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    transition: 'all 0.2s'
                                  }}
                                  onMouseOver={e => e.currentTarget.style.background = 'rgba(255,59,48,0.2)'}
                                  onMouseOut={e => e.currentTarget.style.background = 'rgba(255,59,48,0.1)'}
                                >
                                  <Trash2 size={13} />
                                </button>
                              </div>
                            </div>

                            {/* Sub ratings List (Vertical Stack) */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', background: 'rgba(255,255,255,0.015)', padding: '12px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.02)' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: '600' }}>Rapidez</span>
                                <span style={{ fontSize: '12px', fontWeight: '800', color: 'white' }}>{rev.rapidez || rev.rating || 5} / 5</span>
                              </div>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: '600' }}>Limpieza</span>
                                <span style={{ fontSize: '12px', fontWeight: '800', color: 'white' }}>{rev.limpieza || rev.rating || 5} / 5</span>
                              </div>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: '600' }}>Habilidad</span>
                                <span style={{ fontSize: '12px', fontWeight: '800', color: 'white' }}>{rev.habilidad || rev.rating || 5} / 5</span>
                              </div>
                            </div>

                            {rev.comment && (
                              <div style={{ borderLeft: '2.5px solid var(--gold-primary)', paddingLeft: '12px', margin: '4px 0 0' }}>
                                <p style={{ margin: 0, fontSize: '13px', color: 'rgba(255,255,255,0.85)', lineHeight: '1.4', fontStyle: 'italic' }}>
                                  "{rev.comment}"
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="glass-card" style={{ gridColumn: '1 / -1', padding: '40px', borderRadius: '20px', textAlign: 'center', border: '1px solid rgba(255,255,255,0.04)', background: 'rgba(255,255,255,0.01)' }}>
                      <MessageSquare size={32} color="var(--text-muted)" style={{ margin: '0 auto 12px' }} />
                      <p style={{ color: 'var(--text-secondary)', fontSize: '14px', fontWeight: '700', margin: 0 }}>No hay valoraciones que coincidan con la búsqueda o filtro</p>
                    </div>
                  )}
                </div>
              </>
            );
          })()}
        </div>
      )}

      {activeTab === 'performance' && (
        <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {loadingPerformance ? (
            <SkeletonList rows={4} rowHeight={70} />
          ) : performanceData ? (() => {
            const { summary, topPerformers, allStaff, weeklyAttendance, insights } = performanceData;
            const trendColor = (val) => val >= 0 ? '#32d74b' : '#ff453a';
            const trendIcon = (val) => val >= 0 ? '↑' : '↓';

            return (
              <>
                {/* ── HEADER ── */}
                <div style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '20px', marginBottom: '4px' }}>
                  <h3 style={{ fontSize: '24px', fontWeight: '800', color: 'white', letterSpacing: '-0.8px', margin: '0 0 4px 0' }}>
                    Reportes de Desempeño
                  </h3>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '13px', margin: 0 }}>
                    Métricas de asistencia, puntualidad y productividad de tu equipo.
                  </p>
                </div>

                {/* ── TOP STAT CARDS ── */}
                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'minmax(0, 1fr) minmax(0, 1fr)' : 'repeat(4, minmax(0, 1fr))', gap: '16px' }}>
                  {/* Asistencia Promedio */}
                  <div className="glass-card" style={{ padding: '20px', borderRadius: '20px', background: 'rgba(255,255,255,0.02)', transition: 'none' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                      <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'rgba(50,215,75,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Users size={20} color="#32d74b" />
                      </div>
                      <span style={{ fontSize: '11px', fontWeight: '800', color: 'var(--text-muted)', letterSpacing: '0.5px', textTransform: 'uppercase' }}>Asistencia Promedio</span>
                      <InfoTooltip text="Porcentaje de días que el equipo asistió este mes sobre los días laborables totales del mes." />
                    </div>
                    <div style={{ fontSize: '32px', fontWeight: '900', color: 'white', letterSpacing: '-1px' }}>{summary.attendance}%</div>
                    <div style={{ fontSize: '11px', fontWeight: '700', color: trendColor(summary.attendanceTrend), marginTop: '4px' }}>
                      {trendIcon(summary.attendanceTrend)} {Math.abs(summary.attendanceTrend)}% vs. mes anterior
                    </div>
                  </div>

                  {/* Puntualidad */}
                  <div className="glass-card" style={{ padding: '20px', borderRadius: '20px', background: 'rgba(255,255,255,0.02)', transition: 'none' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                      <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'rgba(17, 17, 17,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Clock size={20} color="var(--gold-primary)" />
                      </div>
                      <span style={{ fontSize: '11px', fontWeight: '800', color: 'var(--text-muted)', letterSpacing: '0.5px', textTransform: 'uppercase' }}>Puntualidad</span>
                      <InfoTooltip text="Porcentaje de registros de entrada que fueron antes o a las 10:00 AM (hora de apertura)." />
                    </div>
                    <div style={{ fontSize: '32px', fontWeight: '900', color: 'white', letterSpacing: '-1px' }}>{summary.punctuality}%</div>
                    <div style={{ fontSize: '11px', fontWeight: '700', color: trendColor(summary.punctualityTrend), marginTop: '4px' }}>
                      {trendIcon(summary.punctualityTrend)} {Math.abs(summary.punctualityTrend)}% vs. mes anterior
                    </div>
                  </div>

                  {/* Servicios Completados */}
                  <div className="glass-card" style={{ padding: '20px', borderRadius: '20px', background: 'rgba(255,255,255,0.02)', transition: 'none' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                      <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'rgba(100,210,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Scissors size={20} color="#64d2ff" />
                      </div>
                       <span style={{ fontSize: '11px', fontWeight: '800', color: 'var(--text-muted)', letterSpacing: '0.5px', textTransform: 'uppercase' }}>Servicios Completados</span>
                      <InfoTooltip text="Total de citas con estado 'Completado' registradas por todo el equipo en el mes actual." />
                    </div>
                    <div style={{ fontSize: '32px', fontWeight: '900', color: 'white', letterSpacing: '-1px' }}>{summary.totalServices}</div>
                    <div style={{ fontSize: '11px', fontWeight: '700', color: trendColor(summary.servicesTrend), marginTop: '4px' }}>
                      {trendIcon(summary.servicesTrend)} {Math.abs(summary.servicesTrend)}% vs. mes anterior
                    </div>
                  </div>

                  {/* Gasto Promedio */}
                  <div className="glass-card" style={{ padding: '20px', borderRadius: '20px', background: 'rgba(255,255,255,0.02)', transition: 'none' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                      <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'rgba(255,159,10,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <DollarSign size={20} color="#ff9f0a" />
                      </div>
                       <span style={{ fontSize: '11px', fontWeight: '800', color: 'var(--text-muted)', letterSpacing: '0.5px', textTransform: 'uppercase' }}>Gasto Promedio</span>
                      <InfoTooltip text="Monto promedio en USD que deja cada cliente por visita en caja este mes." />
                    </div>
                    <div style={{ fontSize: '32px', fontWeight: '900', color: 'white', letterSpacing: '-1px' }}>${summary.avgTicket.toFixed(2)}</div>
                    <div style={{ fontSize: '11px', fontWeight: '700', color: trendColor(summary.avgTicketTrend), marginTop: '4px' }}>
                      {trendIcon(summary.avgTicketTrend)} ${Math.abs(summary.avgTicketTrend).toFixed(2)} vs. mes anterior
                    </div>
                  </div>
                </div>

                {/* ── MAIN GRID: Top Performers + Weekly Attendance + Punctuality ── */}
                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'minmax(0, 1fr) 1.2fr minmax(0, 1fr)', gap: '20px' }}>

                  {/* TOP DESEMPEÑO DEL MES */}
                  <div className="glass-card" style={{ padding: '24px', borderRadius: '24px', background: 'rgba(255,255,255,0.01)', transition: 'none' }}>
                     <h4 style={{ fontSize: '14px', fontWeight: '900', color: 'white', margin: '0 0 20px', letterSpacing: '0.3px', display: 'flex', alignItems: 'center' }}>Top desempeño del mes <InfoTooltip text="Score calculado con: servicios completados (30%), puntualidad (25%), asistencia (25%) y calificación de clientes (20%)." /></h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      {topPerformers.map((p, i) => (
                        <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px', borderRadius: '14px', background: i === 0 ? 'rgba(17, 17, 17,0.06)' : 'rgba(255,255,255,0.02)', border: i === 0 ? '1px solid rgba(17, 17, 17,0.15)' : '1px solid rgba(255,255,255,0.04)' }}>
                          <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: i === 0 ? 'var(--gold-primary)' : i === 1 ? '#c0c0c0' : i === 2 ? '#cd7f32' : 'rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <span style={{ fontSize: '11px', fontWeight: '900', color: i < 3 ? 'black' : 'var(--text-muted)' }}>{i + 1}</span>
                          </div>
                          <div style={{ width: '36px', height: '36px', borderRadius: '10px', overflow: 'hidden', backgroundColor: 'rgba(255,255,255,0.05)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                             {p.image_url ? (
                               <img loading="lazy" src={p.image_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                             ) : (
                               <span style={{ fontSize: '13px', fontWeight: '900', color: 'var(--gold-primary)', opacity: 0.5 }}>{p.name.charAt(0)}</span>
                             )}
                           </div>
                           <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: '12px', fontWeight: '800', color: 'white', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}</div>
                            <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '1px' }}>Score: {p.perfScore}</div>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <span style={{ fontSize: '13px', fontWeight: '900', color: p.perfScore >= 80 ? '#32d74b' : p.perfScore >= 60 ? '#ff9f0a' : '#ff453a' }}>{p.perfScore}%</span>
                            {p.servicesTrend >= 0 ? <TrendingUp size={12} color="#32d74b" /> : <TrendingDown size={12} color="#ff453a" />}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* CENTER COLUMN: Weekly Chart + Productivity Table */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    {/* ASISTENCIA POR SEMANA */}
                    <div className="glass-card" style={{ padding: '24px', borderRadius: '24px', background: 'rgba(255,255,255,0.01)', transition: 'none' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                         <h4 style={{ fontSize: '14px', fontWeight: '900', color: 'white', margin: 0, letterSpacing: '0.3px', display: 'flex', alignItems: 'center' }}>Asistencia por semana <InfoTooltip text="Porcentaje de entradas puntuales (antes de las 10:00 AM) de todo el equipo, agrupadas por semana." /></h4>
                        <span style={{ fontSize: '10px', fontWeight: '700', color: 'var(--text-muted)', background: 'rgba(255,255,255,0.04)', padding: '4px 10px', borderRadius: '8px' }}>Últimas 4 semanas</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'flex-end', gap: '16px', height: '160px', paddingBottom: '28px', position: 'relative' }}>
                        {/* Y-axis labels */}
                        <div style={{ position: 'absolute', left: 0, top: 0, bottom: '28px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                          {[100, 80, 60, 40, 20].map(v => (
                            <span key={v} style={{ fontSize: '9px', color: 'var(--text-muted)', fontWeight: '600', width: '24px', textAlign: 'right' }}>{v}%</span>
                          ))}
                        </div>
                        {/* Bars */}
                        <div style={{ display: 'flex', alignItems: 'flex-end', gap: '24px', flex: 1, marginLeft: '30px', height: '100%', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                          {weeklyAttendance.map((w, i) => (
                            <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                              <span style={{ fontSize: '11px', fontWeight: '800', color: 'var(--gold-primary)' }}>{w.pct}%</span>
                              <div style={{ width: '100%', maxWidth: '50px', height: `${w.pct}%`, background: `linear-gradient(180deg, var(--gold-primary) 0%, rgba(17, 17, 17,0.4) 100%)`, borderRadius: '8px 8px 0 0', transition: 'height 0.5s ease' }} />
                              <div style={{ textAlign: 'center' }}>
                                <div style={{ fontSize: '10px', fontWeight: '700', color: 'white' }}>{w.label}</div>
                                <div style={{ fontSize: '8px', color: 'var(--text-muted)' }}>{w.range}</div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* PRODUCTIVIDAD POR ODONTÓLOGO */}
                    <div className="glass-card" style={{ padding: '24px', borderRadius: '24px', background: 'rgba(255,255,255,0.01)', transition: 'none' }}>
                       <h4 style={{ fontSize: '14px', fontWeight: '900', color: 'white', margin: '0 0 16px', letterSpacing: '0.3px', display: 'flex', alignItems: 'center' }}>Productividad por odontólogo <InfoTooltip text="Servicios completados y gasto promedio (USD) de cada colaborador en el mes actual." /></h4>
                      <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                          <thead>
                            <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                              <th style={{ padding: '8px 4px', textAlign: 'left', fontSize: '10px', fontWeight: '800', color: 'var(--text-muted)', letterSpacing: '0.5px', textTransform: 'uppercase' }}>Colaborador</th>
                              <th style={{ padding: '8px 4px', textAlign: 'center', fontSize: '10px', fontWeight: '800', color: 'var(--text-muted)', letterSpacing: '0.5px', textTransform: 'uppercase' }}>Servicios</th>
                              <th style={{ padding: '8px 4px', textAlign: 'center', fontSize: '10px', fontWeight: '800', color: 'var(--text-muted)', letterSpacing: '0.5px', textTransform: 'uppercase' }}>Gasto Prom.</th>
                            </tr>
                          </thead>
                          <tbody>
                            {allStaff.map((p, i) => (
                              <tr key={p.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                                <td style={{ padding: '10px 4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                  <div style={{ width: '28px', height: '28px', borderRadius: '8px', overflow: 'hidden', backgroundColor: 'rgba(255,255,255,0.05)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                     {p.image_url ? (
                                       <img loading="lazy" src={p.image_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                     ) : (
                                       <span style={{ fontSize: '10px', fontWeight: '900', color: 'var(--gold-primary)', opacity: 0.5 }}>{p.name.charAt(0)}</span>
                                     )}
                                   </div>
                                   <span style={{ fontWeight: '700', color: 'white', fontSize: '12px' }}>{p.name}</span>
                                </td>
                                <td style={{ padding: '10px 4px', textAlign: 'center' }}>
                                  <span style={{ fontWeight: '800', color: 'white' }}>{p.servicesCount}</span>
                                  <div style={{ display: 'flex', justifyContent: 'center', marginTop: '3px' }}>
                                    <div style={{ width: `${Math.min(100, (p.servicesCount / Math.max(1, allStaff[0]?.servicesCount || 1)) * 100)}%`, height: '4px', borderRadius: '2px', background: 'var(--gold-primary)', maxWidth: '60px' }} />
                                  </div>
                                </td>
                                <td style={{ padding: '10px 4px', textAlign: 'center', fontWeight: '800', color: 'white' }}>
                                  ${p.ticketAvg.toFixed(2)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>

                  {/* PUNTUALIDAD POR COLABORADOR */}
                  <div className="glass-card" style={{ padding: '24px', borderRadius: '24px', background: 'rgba(255,255,255,0.01)', transition: 'none' }}>
                     <h4 style={{ fontSize: '14px', fontWeight: '900', color: 'white', margin: '0 0 20px', letterSpacing: '0.3px', display: 'flex', alignItems: 'center' }}>Puntualidad por colaborador <InfoTooltip text="Porcentaje de veces que cada persona marcó entrada antes de las 10:00 AM sobre el total de sus registros." /></h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                      {allStaff.map((p) => (
                        <div key={p.id}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                               <div style={{ width: '24px', height: '24px', borderRadius: '7px', overflow: 'hidden', backgroundColor: 'rgba(255,255,255,0.05)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                 {p.image_url ? (
                                   <img loading="lazy" src={p.image_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                ) : (
                                  <span style={{ fontSize: '9px', fontWeight: '900', color: 'var(--gold-primary)', opacity: 0.5 }}>{p.name.charAt(0)}</span>
                                )}
                              </div>
                              <span style={{ fontSize: '11px', fontWeight: '700', color: 'white', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}</span>
                            </div>
                            <span style={{ fontSize: '12px', fontWeight: '800', color: p.punctualityPct >= 90 ? '#32d74b' : p.punctualityPct >= 75 ? '#ff9f0a' : '#ff453a', marginLeft: '8px', flexShrink: 0 }}>{p.punctualityPct}%</span>
                          </div>
                          <div style={{ height: '8px', borderRadius: '4px', background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
                            <div style={{ height: '100%', width: `${p.punctualityPct}%`, borderRadius: '4px', background: p.punctualityPct >= 90 ? 'linear-gradient(90deg, #32d74b 0%, #30d158 100%)' : p.punctualityPct >= 75 ? 'linear-gradient(90deg, #ff9f0a 0%, #ffb340 100%)' : 'linear-gradient(90deg, #ff453a 0%, #ff6961 100%)', transition: 'width 0.6s ease' }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* ── INSIGHTS DEL MES ── */}
                <div className="glass-card" style={{ padding: '28px', borderRadius: '24px', background: 'rgba(255,255,255,0.01)', transition: 'none' }}>
                   <h4 style={{ fontSize: '14px', fontWeight: '900', color: 'var(--gold-primary)', margin: '0 0 24px', letterSpacing: '0.5px', textTransform: 'uppercase', display: 'flex', alignItems: 'center' }}>Insights del mes <InfoTooltip text="Resumen automático: mejores y peores métricas del equipo basado en datos reales del mes." /></h4>
                  <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'minmax(0, 1fr) minmax(0, 1fr)' : 'repeat(4, minmax(0, 1fr))', gap: '16px' }}>

                    {/* Mejor asistencia */}
                    {insights.bestAttendance && (
                      <div style={{
                        padding: '24px 16px',
                        borderRadius: '20px',
                        background: 'linear-gradient(160deg, rgba(50,215,75,0.08) 0%, rgba(50,215,75,0.02) 100%)',
                        border: '1px solid rgba(50,215,75,0.15)',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        textAlign: 'center',
                        gap: '12px',
                        position: 'relative',
                        overflow: 'hidden'
                      }}>
                        <div style={{ position: 'absolute', top: '-20px', right: '-20px', width: '80px', height: '80px', borderRadius: '50%', background: 'rgba(50,215,75,0.06)', filter: 'blur(20px)' }} />
                        <div style={{
                          width: '64px', height: '64px', borderRadius: '50%',
                          background: 'linear-gradient(135deg, rgba(50,215,75,0.25) 0%, rgba(50,215,75,0.05) 100%)',
                          border: '2.5px solid rgba(50,215,75,0.5)',
                          boxShadow: '0 0 20px rgba(50,215,75,0.15), 0 0 40px rgba(50,215,75,0.05)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          overflow: 'hidden', position: 'relative', zIndex: 1,
                          flexShrink: 0
                        }}>
                           {insights.bestAttendance.image_url ? (
                             <img loading="lazy" src={insights.bestAttendance.image_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          ) : (
                            <span style={{ fontSize: '22px', fontWeight: '900', color: '#32d74b' }}>{insights.bestAttendance.name.charAt(0)}</span>
                          )}
                        </div>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px', marginBottom: '4px' }}>
                            <Star size={12} color="#32d74b" fill="#32d74b" />
                            <span style={{ fontSize: '10px', fontWeight: '800', color: '#32d74b', letterSpacing: '0.5px', textTransform: 'uppercase' }}>Mejor asistencia</span>
                          </div>
                          <div style={{ fontSize: '14px', fontWeight: '800', color: 'white', lineHeight: 1.2 }}>{insights.bestAttendance.name}</div>
                        </div>
                        <div style={{
                          fontSize: '22px', fontWeight: '900', color: '#32d74b',
                          background: 'rgba(50,215,75,0.08)', padding: '4px 14px', borderRadius: '10px',
                          letterSpacing: '-0.5px'
                        }}>{insights.bestAttendance.attendancePct}%</div>
                      </div>
                    )}

                    {/* Más puntual */}
                    {insights.mostPunctual && (
                      <div style={{
                        padding: '24px 16px',
                        borderRadius: '20px',
                        background: 'linear-gradient(160deg, rgba(17, 17, 17,0.08) 0%, rgba(17, 17, 17,0.02) 100%)',
                        border: '1px solid rgba(17, 17, 17,0.15)',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        textAlign: 'center',
                        gap: '12px',
                        position: 'relative',
                        overflow: 'hidden'
                      }}>
                        <div style={{ position: 'absolute', top: '-20px', right: '-20px', width: '80px', height: '80px', borderRadius: '50%', background: 'rgba(17, 17, 17,0.06)', filter: 'blur(20px)' }} />
                        <div style={{
                          width: '64px', height: '64px', borderRadius: '50%',
                          background: 'linear-gradient(135deg, rgba(17, 17, 17,0.25) 0%, rgba(17, 17, 17,0.05) 100%)',
                          border: '2.5px solid rgba(17, 17, 17,0.5)',
                          boxShadow: '0 0 20px rgba(17, 17, 17,0.15), 0 0 40px rgba(17, 17, 17,0.05)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          overflow: 'hidden', position: 'relative', zIndex: 1,
                          flexShrink: 0
                        }}>
                           {insights.mostPunctual.image_url ? (
                             <img loading="lazy" src={insights.mostPunctual.image_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          ) : (
                            <span style={{ fontSize: '22px', fontWeight: '900', color: 'var(--gold-primary)' }}>{insights.mostPunctual.name.charAt(0)}</span>
                          )}
                        </div>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px', marginBottom: '4px' }}>
                            <Clock size={12} color="var(--gold-primary)" />
                            <span style={{ fontSize: '10px', fontWeight: '800', color: 'var(--gold-primary)', letterSpacing: '0.5px', textTransform: 'uppercase' }}>Más puntual</span>
                          </div>
                          <div style={{ fontSize: '14px', fontWeight: '800', color: 'white', lineHeight: 1.2 }}>{insights.mostPunctual.name}</div>
                        </div>
                        <div style={{
                          fontSize: '22px', fontWeight: '900', color: 'var(--gold-primary)',
                          background: 'rgba(17, 17, 17,0.08)', padding: '4px 14px', borderRadius: '10px',
                          letterSpacing: '-0.5px'
                        }}>{insights.mostPunctual.punctualityPct}%</div>
                      </div>
                    )}

                    {/* Mayor gasto promedio */}
                    {insights.highestTicket && (
                      <div style={{
                        padding: '24px 16px',
                        borderRadius: '20px',
                        background: 'linear-gradient(160deg, rgba(255,159,10,0.08) 0%, rgba(255,159,10,0.02) 100%)',
                        border: '1px solid rgba(255,159,10,0.15)',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        textAlign: 'center',
                        gap: '12px',
                        position: 'relative',
                        overflow: 'hidden'
                      }}>
                        <div style={{ position: 'absolute', top: '-20px', right: '-20px', width: '80px', height: '80px', borderRadius: '50%', background: 'rgba(255,159,10,0.06)', filter: 'blur(20px)' }} />
                        <div style={{
                          width: '64px', height: '64px', borderRadius: '50%',
                          background: 'linear-gradient(135deg, rgba(255,159,10,0.25) 0%, rgba(255,159,10,0.05) 100%)',
                          border: '2.5px solid rgba(255,159,10,0.5)',
                          boxShadow: '0 0 20px rgba(255,159,10,0.15), 0 0 40px rgba(255,159,10,0.05)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          overflow: 'hidden', position: 'relative', zIndex: 1,
                          flexShrink: 0
                        }}>
                           {insights.highestTicket.image_url ? (
                             <img loading="lazy" src={insights.highestTicket.image_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          ) : (
                            <span style={{ fontSize: '22px', fontWeight: '900', color: '#ff9f0a' }}>{insights.highestTicket.name.charAt(0)}</span>
                          )}
                        </div>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px', marginBottom: '4px' }}>
                            <DollarSign size={12} color="#ff9f0a" />
                            <span style={{ fontSize: '10px', fontWeight: '800', color: '#ff9f0a', letterSpacing: '0.5px', textTransform: 'uppercase' }}>Mayor gasto promedio</span>
                          </div>
                          <div style={{ fontSize: '14px', fontWeight: '800', color: 'white', lineHeight: 1.2 }}>{insights.highestTicket.name}</div>
                        </div>
                        <div style={{
                          fontSize: '22px', fontWeight: '900', color: '#ff9f0a',
                          background: 'rgba(255,159,10,0.08)', padding: '4px 14px', borderRadius: '10px',
                          letterSpacing: '-0.5px'
                        }}>${insights.highestTicket.ticketAvg.toFixed(2)}</div>
                      </div>
                    )}

                    {/* Necesita seguimiento */}
                    {insights.needsFollowUp && insights.needsFollowUp.id !== insights.bestAttendance?.id && (
                      <div style={{
                        padding: '24px 16px',
                        borderRadius: '20px',
                        background: 'linear-gradient(160deg, rgba(255,69,58,0.08) 0%, rgba(255,69,58,0.02) 100%)',
                        border: '1px solid rgba(255,69,58,0.15)',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        textAlign: 'center',
                        gap: '12px',
                        position: 'relative',
                        overflow: 'hidden'
                      }}>
                        <div style={{ position: 'absolute', top: '-20px', right: '-20px', width: '80px', height: '80px', borderRadius: '50%', background: 'rgba(255,69,58,0.06)', filter: 'blur(20px)' }} />
                        <div style={{
                          width: '64px', height: '64px', borderRadius: '50%',
                          background: 'linear-gradient(135deg, rgba(255,69,58,0.25) 0%, rgba(255,69,58,0.05) 100%)',
                          border: '2.5px solid rgba(255,69,58,0.5)',
                          boxShadow: '0 0 20px rgba(255,69,58,0.15), 0 0 40px rgba(255,69,58,0.05)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          overflow: 'hidden', position: 'relative', zIndex: 1,
                          flexShrink: 0
                        }}>
                           {insights.needsFollowUp.image_url ? (
                             <img loading="lazy" src={insights.needsFollowUp.image_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          ) : (
                            <span style={{ fontSize: '22px', fontWeight: '900', color: '#ff453a' }}>{insights.needsFollowUp.name.charAt(0)}</span>
                          )}
                        </div>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px', marginBottom: '4px' }}>
                            <Target size={12} color="#ff453a" />
                            <span style={{ fontSize: '10px', fontWeight: '800', color: '#ff453a', letterSpacing: '0.5px', textTransform: 'uppercase' }}>Necesita seguimiento</span>
                          </div>
                          <div style={{ fontSize: '14px', fontWeight: '800', color: 'white', lineHeight: 1.2 }}>{insights.needsFollowUp.name}</div>
                        </div>
                        <div style={{
                          fontSize: '22px', fontWeight: '900', color: '#ff453a',
                          background: 'rgba(255,69,58,0.08)', padding: '4px 14px', borderRadius: '10px',
                          letterSpacing: '-0.5px'
                        }}>{insights.needsFollowUp.perfScore}%</div>
                      </div>
                    )}
                  </div>
                </div>

                <p style={{ fontSize: '11px', color: 'var(--text-muted)', textAlign: 'center', marginTop: '4px' }}>Los datos se actualizan al cargar la pestaña.</p>
              </>
            );
          })() : (
            <div style={{ textAlign: 'center', padding: '48px 24px', color: 'var(--text-muted)' }}>
              <BarChart2 size={40} style={{ margin: '0 auto 16px', opacity: 0.3 }} />
              <p style={{ fontSize: '14px', fontWeight: '700' }}>Cargando datos de desempeño...</p>
            </div>
          )}
        </div>
      )}

      <AnimatedModal isOpen={!!historyModalMember}>
        {(overlayClass, cardClass) => displayedHistoryMember && (
          <AttendanceHistoryModal
            member={displayedHistoryMember}
            dates={getAttendanceDates(displayedHistoryMember.id)}
            logs={attendanceLogs}
            streak={getAttendanceStreak(displayedHistoryMember.id)}
            onClose={() => setHistoryModalMember(null)}
            overlayClass={overlayClass}
            cardClass={cardClass}
            isMobile={isMobile}
          />
        )}
      </AnimatedModal>

      <AnimatedModal isOpen={showCamera}>
        {(overlayClass, cardClass) => (
          <PandaCamera
            key={cameraKey}
            initialAction={photoAction}
            aspectRatio="4/5"
            onClose={() => { setShowCamera(false); setPhotoAction(null); }}
            onCapture={async (image) => {
              const compressed = await compressDataUrl(image, 600, 0.6);
              setFormData({ ...formData, image_url: compressed });
              setShowCamera(false);
              setPhotoAction(null);
            }}
            overlayClass={overlayClass}
            cardClass={cardClass}
          />
        )}
      </AnimatedModal>

      <StaffProfileModal 
        isOpen={!!profileModalData}
        onClose={() => setProfileModalData(null)}
        staffMember={profileModalData}
        inventory={inventory}
        onUpdate={async () => {
          await fetchStaff();
          if (onDataRefresh) await onDataRefresh();
        }}
      />

      <RoleManagerModal 
        isOpen={isRoleModalOpen}
        onClose={() => setIsRoleModalOpen(false)}
        roles={Object.fromEntries(Object.entries(allRolePresets).filter(([_, v]) => v !== '__DELETED__'))}
        onSaveRole={handleSaveCustomRole}
        onDeleteRole={handleDeleteCustomRole}
        availableModules={availableModules}
      />

      <AnimatedModal isOpen={dailyPaymentModal.isOpen}>
        {(overlayClass, cardClass) => (
          <div className={overlayClass.replace('global-modal-overlay', '')} style={{
            position: 'fixed',
            inset: 0,
            zIndex: 10000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
            paddingTop: 'max(20px, env(safe-area-inset-top, 20px))',
            backgroundColor: 'rgba(0,0,0,0.85)',
            backdropFilter: 'blur(20px)'
          }}>
            <div className={cardClass.replace('global-modal-card', '')} style={{
              width: '100%',
              maxWidth: '1000px',
              maxHeight: '92vh',
              overflowY: 'auto',
              background: 'var(--bg-secondary)',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              borderRadius: '28px',
              padding: isMobile ? '18px' : '28px',
              boxShadow: '0 40px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.04) inset',
              display: 'flex',
              flexDirection: 'column',
              gap: '24px',
              color: 'white',
              margin: 'auto'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid rgba(17, 17, 17,0.15)', paddingBottom: '20px', marginBottom: '4px' }}>
                <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                  {/* Golden Avatar */}
                  <div style={{ 
                    width: '60px', height: '60px', borderRadius: '50%', 
                    background: 'linear-gradient(135deg, rgba(17, 17, 17,0.2) 0%, rgba(17, 17, 17,0.05) 100%)',
                    border: '2px solid var(--gold-primary)',
                    boxShadow: '0 0 20px rgba(17, 17, 17,0.2), inset 0 0 10px rgba(17, 17, 17,0.1)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
                    flexShrink: 0
                  }}>
                     {dailyPaymentModal.imageUrl ? (
                       <img loading="lazy" src={dailyPaymentModal.imageUrl} alt={dailyPaymentModal.staffName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <span style={{ fontSize: '24px', fontWeight: '900', color: 'var(--gold-primary)' }}>{dailyPaymentModal.staffName?.charAt(0).toUpperCase()}</span>
                    )}
                  </div>
                  
                  {/* Title & Name */}
                  <div>
                    <h3 style={{ fontSize: '22px', fontWeight: '900', color: 'white', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '8px', letterSpacing: '-0.5px' }}>
                      Cierre de Asistencia <Banknote size={22} color="var(--gold-primary)" />
                    </h3>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '14px', margin: 0 }}>
                      Resumen y liquidación de <strong style={{ color: 'var(--gold-primary)', fontWeight: '800' }}>{dailyPaymentModal.staffName}</strong>
                    </p>
                  </div>
                </div>
                
                <button onClick={() => setDailyPaymentModal(emptySettlementModal())} style={{ width: '34px', height: '34px', borderRadius: '50%', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.5)', fontSize: '16px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s ease', flexShrink: 0 }} onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; e.currentTarget.style.color = 'white'; }} onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.color = 'rgba(255,255,255,0.5)'; }}>×</button>
              </div>

              <StaffSettlementPanel
                modal={dailyPaymentModal}
                setModal={setDailyPaymentModal}
                isMobile={isMobile}
                loading={loading}
                onPay={handleConfirmSettlementPayment}
                onSkip={handleSkipDailyPayment}
                onVoid={handleVoidShift}
                onCancel={() => setDailyPaymentModal(emptySettlementModal())}
              />

              {showLegacyDailyPaymentUi && dailyPaymentModal.earnings && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', backgroundColor: 'rgba(255, 255, 255, 0.02)', padding: '20px', borderRadius: '20px', border: '1px solid rgba(255, 255, 255, 0.04)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Comisiones acumuladas:</span>
                    <span style={{ fontWeight: '700' }}>{dailyPaymentModal.earnings.earnedBs.toLocaleString('es-VE')} Bs</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Propinas del día:</span>
                    <span style={{ fontWeight: '700', color: '#32d74b' }}>+{dailyPaymentModal.earnings.propinasBs.toLocaleString('es-VE')} Bs</span>
                  </div>
                  {dailyPaymentModal.earnings.lavadoDeductionBs > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>Deducción por limpiezas ({dailyPaymentModal.earnings.lavadosCount}):</span>
                      <span style={{ fontWeight: '700', color: '#ff453a' }}>-{dailyPaymentModal.earnings.lavadoDeductionBs.toLocaleString('es-VE')} Bs</span>
                    </div>
                  )}
                  {dailyPaymentModal.earnings.valesBs > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>Vales/Adelantos hoy:</span>
                      <span style={{ fontWeight: '700', color: '#ff453a' }}>-{dailyPaymentModal.earnings.valesBs.toLocaleString('es-VE')} Bs</span>
                    </div>
                  )}
                  {dailyPaymentModal.earnings.paidBs > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>Nómina pagada hoy:</span>
                      <span style={{ fontWeight: '700', color: '#ff453a' }}>-{dailyPaymentModal.earnings.paidBs.toLocaleString('es-VE')} Bs</span>
                    </div>
                  )}
                  <div style={{ height: '1px', backgroundColor: 'rgba(255,255,255,0.08)', margin: '4px 0' }} />
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '14px', fontWeight: '800' }}>Monto neto a pagar:</span>
                    <div style={{ textAlign: 'right' }}>
                      <span style={{ fontSize: '20px', fontWeight: '900', color: 'var(--gold-primary)' }}>
                        {dailyPaymentModal.earnings.balanceBs.toLocaleString('es-VE')} Bs
                      </span>
                      <span style={{ display: 'block', fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                        ≈ ${(dailyPaymentModal.earnings.balanceBs / dailyPaymentModal.earnings.rate).toFixed(2)} USD (Tasa: {dailyPaymentModal.earnings.rate})
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {showLegacyDailyPaymentUi && dailyPaymentModal.earnings && dailyPaymentModal.earnings.balanceBs > 0 && (
                <div className="form-group">
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: '900', color: 'var(--text-muted)', marginBottom: '8px', letterSpacing: '1px' }}>MÉTODO DE PAGO</label>
                  <PandaSelect 
                    options={[
                      { value: 'Efectivo ($)', label: 'Efectivo ($)' },
                      { value: 'Efectivo (Bs)', label: 'Efectivo (Bs)' },
                      { value: 'Pago Móvil', label: 'Pago Móvil' },
                      { value: 'Zelle', label: 'Zelle' },
                      { value: 'Zinli', label: 'Zinli' },
                      { value: 'Binance', label: 'Binance / USDT' },
                      { value: 'Transferencia', label: 'Transferencia (Bs)' }
                    ]}
                    value={dailyPaymentModal.paymentMethod}
                    onChange={(val) => setDailyPaymentModal(prev => ({ ...prev, paymentMethod: val }))}
                  />
                </div>
              )}

              <div style={{ display: 'none', flexDirection: 'column', gap: '10px', marginTop: '8px' }}>
                {dailyPaymentModal.earnings && dailyPaymentModal.earnings.balanceBs > 0 ? (
                  <button 
                    onClick={handleConfirmDailyPayment}
                    style={{
                      padding: '14px',
                      borderRadius: '14px',
                      backgroundColor: 'var(--gold-primary)',
                      color: 'black',
                      border: 'none',
                      fontWeight: '800',
                      fontSize: '14px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px'
                    }}
                  >
                    Registrar Pago y Salida
                  </button>
                ) : (
                  <div style={{ textAlign: 'center', padding: '12px', color: '#32d74b', fontSize: '13px', fontWeight: '700', backgroundColor: 'rgba(50, 215, 75, 0.05)', borderRadius: '12px', border: '1px solid rgba(50, 215, 75, 0.1)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>No hay saldo pendiente por pagar hoy <PartyPopper size={16} /></div>
                  </div>
                )}
                
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button 
                    onClick={handleSkipDailyPayment}
                    style={{
                      flex: 1,
                      padding: '12px',
                      borderRadius: '12px',
                      backgroundColor: 'rgba(255,255,255,0.03)',
                      color: 'white',
                      border: '1px solid rgba(255,255,255,0.08)',
                      fontWeight: '700',
                      fontSize: '13px',
                      cursor: 'pointer'
                    }}
                  >
                    Solo Salida (Pagar luego)
                  </button>
                  <button 
                    onClick={() => setDailyPaymentModal(emptySettlementModal())}
                    style={{
                      flex: 1,
                      padding: '12px',
                      borderRadius: '12px',
                      backgroundColor: 'transparent',
                      color: 'var(--text-muted)',
                      border: 'none',
                      fontWeight: '700',
                      fontSize: '13px',
                      cursor: 'pointer'
                    }}
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </AnimatedModal>

      {/* Video Replace Confirmation Modal */}
      {showVideoConfirm && createPortal(
        <div style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-secondary)', backdropFilter: 'blur(8px)' }} onClick={() => { setShowVideoConfirm(false); setPendingVideoFile(null); }}>
          <div style={{ background: 'var(--bg-secondary)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '20px', padding: '28px', maxWidth: '380px', width: '90%', textAlign: 'center' }} onClick={e => e.stopPropagation()}>
            <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'rgba(255,159,10,0.1)', border: '1px solid rgba(255,159,10,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <Film size={22} color="#ff9f0a" />
            </div>
            <h3 style={{ fontSize: '16px', fontWeight: '800', color: 'white', margin: '0 0 8px' }}>Reemplazar video</h3>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: '0 0 20px', lineHeight: '1.5' }}>
              {hasHardcodedVideo && !formData.video_url
                ? 'Este odontólogo tiene un video predefinido en la landing. El video nuevo lo reemplazará completamente.'
                : 'Ya existe un video subido para este odontólogo. El nuevo lo reemplazará permanentemente.'}
            </p>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={() => { setShowVideoConfirm(false); setPendingVideoFile(null); }}
                style={{ flex: 1, padding: '10px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.04)', color: 'white', fontSize: '12px', fontWeight: '700', cursor: 'pointer' }}
              >
                Cancelar
              </button>
              <button
                onClick={async () => { setShowVideoConfirm(false); if (pendingVideoFile) await doVideoUpload(pendingVideoFile); setPendingVideoFile(null); }}
                style={{ flex: 1, padding: '10px', borderRadius: '10px', border: 'none', background: 'linear-gradient(135deg, #ff9f0a, #e68a00)', color: 'white', fontSize: '12px', fontWeight: '700', cursor: 'pointer' }}
              >
                Sí, reemplazar
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default PersonnelModule;
