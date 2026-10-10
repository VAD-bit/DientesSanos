import React, { useState, useEffect, useMemo, useRef } from 'react';
import useDebounce from '../hooks/useDebounce';
import { createPortal } from 'react-dom';
import { useNotifs } from '../context/NotificationContext';
import { 
  Search,
  Gift,
  Ticket, 
  Plus, 
  User, 
  Phone, 
  Calendar, 
  Scissors, 
  Camera,
  Image as ImageIcon,
  ChevronRight,
  Filter,
  Columns as ColumnsIcon,
  Loader2,
  X,
  Trash2,
  Download,
  Check,
  LayoutGrid,
  Table as TableIcon,
  MessageCircle,
  Receipt
} from 'lucide-react';
import { dataService } from '../services/dataService';
import { SkeletonList } from './Skeleton';
import { supabase } from '../lib/supabase';
import PandaSelect from './PandaSelect';
import PandaCamera from './PandaCamera';
import PandaDatePicker from './PandaDatePicker';
import PandaDialog from './PandaDialog';
import AnimatedModal from './AnimatedModal';

import { formatName, normalizeForSearch } from '../utils/stringUtils';
import { useDialog } from '../context/DialogContext';
import { useScrollLock } from '../hooks/useScrollLock';
import { useAuth } from '../context/AuthContext';

// ── Masked birthday input: DD/MM/AAAA ──────────────────────────────────────
// `value` and `onChange` work with YYYY-MM-DD (DB format).
// Internally displays DD/MM/AAAA and auto-inserts slashes.
import { useState as _useState } from 'react';
const BirthdayInput = ({ value, onChange, style = {}, className = '' }) => {
  // Convert YYYY-MM-DD → DD/MM/AAAA for display
  const isoToDisplay = (iso) => {
    if (!iso) return '';
    const [y, m, d] = iso.split('-');
    if (y && m && d) return `${d}/${m}/${y}`;
    return '';
  };

  const [display, setDisplay] = _useState(() => isoToDisplay(value));

  const handleChange = (e) => {
    // Strip non-digits and limit to 8
    const digits = e.target.value.replace(/\D/g, '').slice(0, 8);
    // Build masked string
    let masked = digits;
    if (digits.length > 4) masked = `${digits.slice(0,2)}/${digits.slice(2,4)}/${digits.slice(4)}`;
    else if (digits.length > 2) masked = `${digits.slice(0,2)}/${digits.slice(2)}`;

    setDisplay(masked);

    // Only propagate to parent when we have a full date
    if (digits.length === 8) {
      const d = digits.slice(0, 2);
      const m = digits.slice(2, 4);
      const y = digits.slice(4, 8);
      onChange(`${y}-${m}-${d}`);
    }
  };

  return (
    <input
      type="text"
      inputMode="numeric"
      placeholder="DD/MM/AAAA"
      className={`form-input ${className}`}
      value={display}
      onChange={handleChange}
      maxLength={10}
      style={style}
    />
  );
};
// ────────────────────────────────────────────────────────────────────────────


// ── Demo data: shown only when the DB has no real clients ────────────────────
const DEMO_CLIENTS = [
  { id: 'demo-1', name: 'Carlos Mendoza', phone: '+58 412-555-1234', id_card: '28.123.456', birth_date: '1995-03-15', origin: 'Instagram', hair_type: 'Normal', scalp_type: 'Sano', total_visits: 12, created_at: '2025-01-10T10:00:00Z', status: 'Activo', points: 120 },
  { id: 'demo-2', name: 'Andrés Rivas', phone: '+58 414-777-8899', id_card: '29.876.543', birth_date: '1992-07-22', origin: 'Referido', hair_type: 'Graso', scalp_type: 'Sano', total_visits: 8, created_at: '2025-02-05T10:00:00Z', status: 'Activo', points: 80 },
  { id: 'demo-3', name: 'Luis Fernández', phone: '+58 424-333-4455', id_card: '30.555.111', birth_date: '1998-11-03', origin: 'Google', hair_type: 'Seco', scalp_type: 'Sensible', total_visits: 5, created_at: '2025-03-20T10:00:00Z', status: 'Activo', points: 50 },
  { id: 'demo-4', name: 'Marcos Pérez', phone: '+58 416-222-3344', id_card: '27.444.777', birth_date: '1990-05-18', origin: 'TikTok', hair_type: 'Mixto', scalp_type: 'Normal', total_visits: 15, created_at: '2024-11-15T10:00:00Z', status: 'Activo', points: 150 },
  { id: 'demo-5', name: 'Daniel Torres', phone: '+58 412-999-0011', id_card: '31.222.888', birth_date: '2000-01-30', origin: 'Presencial', hair_type: 'Normal', scalp_type: 'Caspa', total_visits: 3, created_at: '2025-06-01T10:00:00Z', status: 'Activo', points: 30 },
];
// ─────────────────────────────────────────────────────────────────────────────

const ClientModule = ({ isMobile, clients, onRefresh, initialClientId }) => {

  const { showToast } = useNotifs();
  const { confirm } = useDialog();
  const { user } = useAuth();
  const roleName = String(user?.role || '').split('|')[0].toLowerCase();
  const isAssistant = roleName.includes('asistente') || roleName.includes('barista') || roleName.includes('recep') || roleName.includes('admin') || roleName.includes('caja');
  const isServiceProfessional = !isAssistant && (roleName.includes('barbero') || roleName.includes('odontolog') || roleName.includes('tatuador'));
  const canManageClientAdminActions = !isServiceProfessional;

  const [localClients, setLocalClients] = useState(clients || []);

  const handleCloseAddForm = () => {
    setIsFormExiting(true);
    setTimeout(() => {
      setShowAddForm(false);
      setIsFormExiting(false);
    }, 250);
  };

  useEffect(() => {
    setLocalClients(clients || []);
  }, [clients]);

  useEffect(() => {
    let isMounted = true;
    if (isServiceProfessional || (Array.isArray(clients) && clients.length > 0 && !clients[0]?.appointments)) {
      dataService.getClients().then(fullList => {
        if (isMounted && Array.isArray(fullList)) {
          setLocalClients(fullList);
        }
      }).catch(console.error);
    }
    return () => { isMounted = false; };
  }, [isServiceProfessional, user?.id]);

  const visibleClients = useMemo(() => {
    const clientList = Array.isArray(localClients) ? localClients : [];
    const realClients = (!isServiceProfessional || !user?.id)
      ? clientList
      : clientList.filter(client => (
          Array.isArray(client.appointments)
          && client.appointments.some(appointment => {
            const isMainStaff = String(appointment.staff_id) === String(user.id);
            const isInStaffList = Array.isArray(appointment.appointment_staff) && appointment.appointment_staff.some(as => String(as.staff_id) === String(user.id));
            return (isMainStaff || isInStaffList) && ['Completado', 'En Silla', 'Por Pagar'].includes(appointment.status);
          })
        ));
    // Show demo clients when DB is empty (non-professional users only)
    if (realClients.length === 0 && !isServiceProfessional) return DEMO_CLIENTS;
    return realClients;
  }, [localClients, isServiceProfessional, user?.id]);
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearch = useDebounce(searchTerm, 300);
  const [clientPage, setClientPage] = useState(1);
  const clientsPerPage = 10;
  const [selectedClient, setSelectedClient] = useState(null);
  const [showMessageModal, setShowMessageModal] = useState(false);

  useScrollLock(showMessageModal);

  const getInitialBdayMessage = () => {
    let msg = localStorage.getItem('panda_default_bday_message');
    const isCorrupted = !msg || 
      msg.includes('\uFFFD') || 
      msg.includes('ï¿½') ||
      /[\uD800-\uDBFF](?![\uDC00-\uDFFF])|([^\uD800-\uDBFF]|^)[\uDC00-\uDFFF]/.test(msg);
    if (isCorrupted) {
      msg = `¡Hola {name}! ${String.fromCodePoint(0x1F389)} Te deseamos un muy feliz cumpleaños de parte de todo el equipo de Dientes Sanos. ${String.fromCodePoint(0x1F488)} ¡Que tengas un día excelente!`;
      localStorage.setItem('panda_default_bday_message', msg);
    }
    return msg;
  };

  const [defaultBdayMessage, setDefaultBdayMessage] = useState(getInitialBdayMessage());

  useEffect(() => {
    if (initialClientId && visibleClients.length > 0) {
      const client = visibleClients.find(c => c.id == initialClientId);
      if (client) setSelectedClient(client);
    }
    // Fetch all coupons for the "Con Cupones" filter
    dataService.getCoupons().then(c => setAllCoupons(c || [])).catch(console.error);
  }, [initialClientId, visibleClients]);

  const [loading, setLoading] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [isFormExiting, setIsFormExiting] = useState(false);
  const [newClient, setNewClient] = useState({ 
    name: '', 
    phone: '', 
    id_card: '',
    birth_date: '',
    origin: '',
    hair_type: 'Normal', 
    scalp_type: 'Normal' 
  });
  const [viewMode, setViewMode] = useState('table');
  const [allCoupons, setAllCoupons] = useState([]);
  const effectiveCoupons = allCoupons;

  const filteredClients = useMemo(() => {
    let list = visibleClients;
    if (viewMode === 'coupons') {
      list = list.filter(c => effectiveCoupons.some(coupon => coupon.client_id === c.id && coupon.status === 'UNUSED'));
    }
    const term = normalizeForSearch(debouncedSearch);
    return list.filter(c => {
      const normalizedName = normalizeForSearch(c.name || '');
      const nameMatches = normalizedName.split(' ').some(w => w.startsWith(term));
      const idMatches = (c.id_card || '').toLowerCase().includes(term);
      const phoneMatches = (c.phone || '').includes(debouncedSearch);
      return nameMatches || idMatches || phoneMatches;
    });
  }, [visibleClients, debouncedSearch, viewMode, effectiveCoupons]);
  const totalClientPages = Math.max(1, Math.ceil(filteredClients.length / clientsPerPage));
  const paginatedClients = filteredClients.slice((clientPage - 1) * clientsPerPage, clientPage * clientsPerPage);
  useEffect(() => { setClientPage(1); }, [debouncedSearch, visibleClients.length, viewMode]);

  const [creating, setCreating] = useState(false);

  // Sync selected client when global list updates (Crucial for persistence visibility)
  useEffect(() => {
    if (selectedClient) {
      const updated = visibleClients.find(c => c.id === selectedClient.id);
      setSelectedClient(updated || null);
    }
  }, [visibleClients]);

  const handleDeleteClient = async (id, name) => {
    if (!await confirm(`¿Estás seguro de eliminar a ${name}? Esta acción no se puede deshacer.`)) return;
    try {
      setLoading(true);
      await dataService.deleteClient(id);
      if (selectedClient?.id === id) setSelectedClient(null);
      await onRefresh();
      showToast(`${name} ha sido eliminado.`);
    } catch (error) {
      console.error('Error deleting client:', error);
      showToast('Error al eliminar cliente.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleAddClient = async () => {
    if (!canManageClientAdminActions) {
      showToast('Tu perfil no tiene permiso para registrar clientes.', 'warning');
      return;
    }
    if (!newClient.name || !newClient.origin) {
      showToast('Completa el nombre y el origen del cliente.', 'error');
      return;
    }
    try {
      setCreating(true);
      await dataService.addClient(newClient);
      setNewClient({ 
        name: '', 
        phone: '', 
        id_card: '',
        birth_date: '',
        origin: '',
        hair_type: 'Normal', 
        scalp_type: 'Normal' 
      });
      setShowAddForm(false);
      await onRefresh();
      showToast('¡Ficha de cliente creada con éxito!');
    } catch (error) {
      console.error('Error addClient:', error);
      showToast('Error técnico al agregar cliente.', 'error');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="client-module animate-fade-in" style={{ maxWidth: '1200px', margin: '0 auto', paddingBottom: '60px' }}>
      {!selectedClient ? (
        <>
          <div style={{
            display: 'flex',
            flexDirection: isMobile ? 'column' : 'row',
            justifyContent: 'space-between',
            alignItems: isMobile ? 'flex-start' : 'center',
            gap: isMobile ? '20px' : '0',
            marginBottom: isMobile ? '24px' : '40px'
          }}>
            <div>
              <h2 style={{ fontSize: isMobile ? '26px' : '28px', fontWeight: '800', letterSpacing: '-0.5px', lineHeight: '1.2' }}>Archivo de <span className="text-gold">Clientes</span></h2>
              <p style={{ color: 'var(--text-secondary)', marginTop: '6px', fontSize: isMobile ? '13px' : '15px' }}>Fichas técnicas y galería de evolución.</p>
            </div>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap', width: isMobile ? '100%' : 'auto' }}>
              {/* View Toggles */}
              <div style={{ 
                display: 'flex', 
                backgroundColor: 'rgba(255,255,255,0.03)', 
                borderRadius: '12px', 
                padding: '4px',
                border: '1px solid rgba(255,255,255,0.05)',
                marginRight: isMobile ? '0' : '12px',
                flex: isMobile ? '1 1 100%' : 'none',
                justifyContent: 'space-between'
              }}>
                <button 
                  onClick={() => setViewMode('grid')}
                  style={{ 
                    padding: '8px 12px', 
                    borderRadius: '8px', 
                    border: 'none', 
                    backgroundColor: viewMode === 'grid' ? 'rgba(255, 255, 255,0.1)' : 'transparent',
                    color: viewMode === 'grid' ? 'var(--gold-primary)' : 'var(--text-muted)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontSize: '12px',
                    fontWeight: '700',
                    flex: isMobile ? 1 : 'none',
                    justifyContent: 'center'
                  }}
                >
                  <LayoutGrid size={16} /> Tarjetas
                </button>
                <button 
                  onClick={() => setViewMode('coupons')}
                  style={{ 
                    padding: '8px 12px', 
                    borderRadius: '8px', 
                    border: 'none', 
                    backgroundColor: viewMode === 'coupons' ? 'rgba(255, 215, 0, 0.1)' : 'transparent',
                    color: viewMode === 'coupons' ? 'var(--gold-primary)' : 'var(--text-muted)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontSize: '12px',
                    fontWeight: '700',
                    flex: isMobile ? 1 : 'none',
                    justifyContent: 'center'
                  }}
                >
                  <Ticket size={16} /> Premiados
                </button>
                <button 
                  onClick={() => setViewMode('table')}
                  style={{ 
                    padding: '8px 12px', 
                    borderRadius: '8px', 
                    border: 'none', 
                    backgroundColor: viewMode === 'table' ? 'rgba(255, 255, 255,0.1)' : 'transparent',
                    color: viewMode === 'table' ? 'var(--gold-primary)' : 'var(--text-muted)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontSize: '12px',
                    fontWeight: '700',
                    flex: isMobile ? 1 : 'none',
                    justifyContent: 'center'
                  }}
                >
                  <TableIcon size={16} /> Tabla
                </button>
              </div>

              {false && canManageClientAdminActions && <button
                className="btn-gold" 
                onClick={() => setShowMessageModal(true)} 
                style={{ 
                  borderRadius: '12px', 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '8px',
                  backgroundColor: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  color: 'white',
                  cursor: 'pointer',
                  flex: isMobile ? '1 1 45%' : 'none',
                  justifyContent: 'center',
                  fontSize: isMobile ? '13px' : '14px',
                  padding: isMobile ? '12px 8px' : '12px 16px',
                  whiteSpace: 'nowrap'
                }}
              >
                <MessageCircle size={18} /> {!isMobile && "Mensaje Cumpleaños"}
                {isMobile && "Cumpleaños"}
              </button>}

              {canManageClientAdminActions && <button 
                className={showAddForm ? "hover-brightness" : "btn-gold"} 
                onClick={() => showAddForm ? handleCloseAddForm() : setShowAddForm(true)} 
                style={showAddForm ? { 
                  height: '40px', padding: isMobile ? '10px 8px' : '0 20px', 
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', flex: isMobile ? '1 1 45%' : 'none', whiteSpace: 'nowrap', fontSize: '13px',
                  background: 'rgba(255, 69, 58, 0.1)', border: '1px solid rgba(255, 69, 58, 0.3)', color: '#ff453a', borderRadius: '12px', cursor: 'pointer', transition: 'background 0.2s, color 0.2s', fontWeight: '850'
                } : {
                  height: '40px', padding: isMobile ? '10px 8px' : '0 20px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', flex: isMobile ? '1 1 45%' : 'none', whiteSpace: 'nowrap', fontSize: '13px', fontWeight: '800'
                }}
              >
                {showAddForm ? <X size={16} /> : <Plus size={16} />}
                {showAddForm ? 'Cancelar' : 'Nuevo Cliente'}
              </button>}
            </div>
          </div>

          {canManageClientAdminActions && (showAddForm || isFormExiting) && (
            <div className={`glass-card ${isFormExiting ? 'animate-slide-down-fade' : 'animate-fade-in'}`} style={{ marginBottom: '40px', padding: '32px', borderRadius: '24px' }}>
              <h3 style={{ marginBottom: '24px', fontSize: '20px' }}>Alta de Cliente</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '24px' }}>
                <div className="form-group">
                  <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', color: 'var(--text-secondary)' }}>Nombre Completo</label>
                  <input className="form-input" placeholder="Ej. Juan Pérez" value={newClient.name} onChange={(e) => setNewClient({...newClient, name: formatName(e.target.value)})} style={{ width: '100%' }} />
                </div>
                <div className="form-group">
                  <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', color: 'var(--text-secondary)' }}>Cédula / ID</label>
                  <input className="form-input" placeholder="Ej. 28.123.456" value={newClient.id_card} onChange={(e) => setNewClient({...newClient, id_card: e.target.value})} style={{ width: '100%' }} />
                </div>
                <div className="form-group">
                  <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', color: 'var(--text-secondary)' }}>Teléfono</label>
                  <input className="form-input" placeholder="WhatsApp" value={newClient.phone} onChange={(e) => setNewClient({...newClient, phone: e.target.value})} style={{ width: '100%' }} />
                </div>
                <div className="form-group">
                  <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', color: 'var(--text-secondary)' }}>Cumpleaños</label>
                  <BirthdayInput value={newClient.birth_date} onChange={(v) => setNewClient({...newClient, birth_date: v})} style={{ width: '100%' }} />
                </div>
                <PandaSelect
                  label="Origen del Cliente"
                  value={newClient.origin}
                  onChange={(val) => setNewClient({ ...newClient, origin: val })}
                  placeholder="Seleccionar origen"
                  options={[
                    { label: 'Instagram', value: 'Instagram' },
                    { label: 'Referido por otra persona', value: 'Referido' },
                    { label: 'Google / Google Maps', value: 'Google' },
                    { label: 'TikTok', value: 'TikTok' },
                    { label: 'Facebook', value: 'Facebook' },
                    { label: 'Pasó por el local', value: 'Presencial' },
                    { label: 'Otro', value: 'Otro' }
                  ]}
                />
                <PandaSelect 
                  label="Tipo de Cabello"
                  value={newClient.hair_type}
                  onChange={(val) => setNewClient({...newClient, hair_type: val})}
                  options={[
                    { label: 'Normal', value: 'Normal' },
                    { label: 'Graso', value: 'Graso' },
                    { label: 'Seco', value: 'Seco' },
                    { label: 'Mixto', value: 'Mixto' }
                  ]}
                />
                <PandaSelect 
                  label="Cuero Cabelludo"
                  value={newClient.scalp_type}
                  onChange={(val) => setNewClient({...newClient, scalp_type: val})}
                  options={[
                    { label: 'Sano / Normal', value: 'Sano' },
                    { label: 'Sensible', value: 'Sensible' },
                    { label: 'Irritado', value: 'Irritado' },
                    { label: 'Caspa / Seborrea', value: 'Caspa' }
                  ]}
                />
                <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                  <button className="btn-gold" onClick={handleAddClient} disabled={creating} style={{ width: '100%', minHeight: '48px', padding: '8px 12px', borderRadius: '12px', fontSize: '13px', lineHeight: '1.2' }}>
                    {creating ? <Loader2 className="animate-spin" /> : 'Registrar Ficha Técnica'}
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className="focus-ring" style={{ 
            backgroundColor: 'var(--bg-tertiary)', 
            borderRadius: '16px', 
            padding: '4px 16px', 
            marginBottom: '32px', 
            display: 'flex', 
            alignItems: 'center', 
            gap: '12px',
            border: '1px solid var(--border-color)',
            transition: 'all 0.2s'
          }}>
            <Search size={20} color="var(--text-muted)" />
            <input 
              type="text" 
              placeholder="Buscar cliente..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                background: 'none',
                border: 'none',
                width: '100%',
                padding: '12px 0',
                fontSize: '16px',
                boxShadow: 'none'
              }}
            />
          </div>
          {loading ? (
            <SkeletonList rows={5} rowHeight={58} />
          ) : filteredClients.length === 0 ? (
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '100px 20px',
              background: 'radial-gradient(circle at 50% 0%, rgba(17, 17, 17, 0.05) 0%, transparent 60%)',
              border: '1px solid rgba(255, 255, 255, 0.02)',
              borderRadius: '24px',
              position: 'relative',
              overflow: 'hidden'
            }}>
              {/* Premium Background Elements */}
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '1px', background: 'linear-gradient(90deg, transparent, rgba(17, 17, 17, 0.3), transparent)' }} />
              
              <div style={{
                width: '80px',
                height: '80px',
                borderRadius: '50%',
                background: 'rgba(255, 255, 255, 0.02)',
                border: '1px solid rgba(255, 255, 255, 0.05)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '24px',
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2), inset 0 2px 0 rgba(255, 255, 255, 0.05)',
                backdropFilter: 'blur(10px)',
                position: 'relative'
              }}>
                <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: 'radial-gradient(circle at center, rgba(17, 17, 17, 0.15) 0%, transparent 70%)' }} />
                
                {viewMode === 'coupons' && visibleClients.length > 0 ? (
                  <Gift size={32} color="var(--gold-primary)" style={{ filter: 'drop-shadow(0 0 12px rgba(17, 17, 17, 0.4))' }} />
                ) : searchTerm ? (
                  <Search size={32} color="var(--gold-primary)" style={{ filter: 'drop-shadow(0 0 12px rgba(17, 17, 17, 0.4))' }} />
                ) : (
                  <User size={32} color="var(--gold-primary)" style={{ filter: 'drop-shadow(0 0 12px rgba(17, 17, 17, 0.4))' }} />
                )}
              </div>

              <h3 style={{ 
                fontSize: '20px', 
                fontWeight: '800', 
                color: 'white', 
                marginBottom: '12px',
                letterSpacing: '-0.5px'
              }}>
                {viewMode === 'coupons' && visibleClients.length > 0
                  ? 'Sin Premios Activos'
                  : searchTerm
                    ? 'Sin Resultados'
                    : 'Archivo Vacío'}
              </h3>
              
              <p style={{ 
                color: 'var(--text-secondary)', 
                fontSize: '15px', 
                maxWidth: '380px', 
                textAlign: 'center', 
                lineHeight: '1.5',
                fontWeight: '500'
              }}>
                {viewMode === 'coupons' && visibleClients.length > 0
                  ? 'Aún no hay clientes que hayan ganado o conserven cupones disponibles. Gira la ruleta en la caja para premiarlos.'
                  : searchTerm
                    ? `No encontramos ningún cliente que coincida con "${searchTerm}". Intenta con otro nombre o teléfono.`
                    : isServiceProfessional
                      ? 'Todavía no tienes clientes atendidos registrados en tu historial.'
                      : 'Aún no has registrado a ningún cliente. Comienza agregando su ficha técnica.'}
              </p>

              {!searchTerm && viewMode !== 'coupons' && visibleClients.length === 0 && !isServiceProfessional && (
                <button 
                  onClick={() => setShowAddForm(true)}
                  className="btn-gold"
                  style={{ marginTop: '32px', padding: '12px 24px', borderRadius: '14px', fontWeight: '800' }}
                >
                  <Plus size={18} style={{ marginRight: '8px' }} />
                  Nuevo Cliente
                </button>
              )}
            </div>
          ) : (viewMode === 'grid' || viewMode === 'coupons') ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '12px' }}>
              {paginatedClients.map(client => {
                const visits = client.total_visits || 0;
                // Loyalty tier: 0=new, 1=regular, 2=loyal, 3=vip
                const tier = visits === 0 ? 0 : visits < 5 ? 1 : visits < 15 ? 2 : 3;
                // All gold — just different intensities. No rainbow.
                const tierColors = [
                  { bg: 'rgba(17, 17, 17,0.04)', accent: 'rgba(17, 17, 17,0.25)', label: 'Nuevo',   strip: 'rgba(17, 17, 17,0.15)' },
                  { bg: 'rgba(17, 17, 17,0.07)', accent: 'rgba(17, 17, 17,0.50)', label: 'Regular', strip: 'rgba(17, 17, 17,0.30)' },
                  { bg: 'rgba(17, 17, 17,0.12)', accent: '#111111',                label: 'Fiel',    strip: '#111111' },
                  { bg: 'rgba(17, 17, 17,0.18)', accent: '#111111',                label: 'VIP',     strip: '#111111' },
                ];
                const tc = tierColors[tier];
                // Warm dark avatar gradients — all complement gold
                const avatarGradients = [
                  'linear-gradient(135deg,#1a1510,#0e0c09)',
                  'linear-gradient(135deg,#1c1408,#0e0c09)',
                  'linear-gradient(135deg,#1a1209,#110e07)',
                  'linear-gradient(135deg,#14100a,#1a1510)',
                  'linear-gradient(135deg,#1a1108,#0f0c08)',
                  'linear-gradient(135deg,#160f07,#1a1208)',
                ];
                const avatarGrad = avatarGradients[client.name?.charCodeAt(0) % avatarGradients.length] || avatarGradients[0];


                return (
                  <div
                    key={client.id}
                    onClick={() => setSelectedClient(client)}
                    style={{
                      cursor: 'pointer',
                      borderRadius: '20px',
                      background: 'var(--bg-secondary)',
                      border: '1px solid rgba(255,255,255,0.06)',
                      padding: '0',
                      overflow: 'hidden',
                      transition: 'transform 0.22s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.22s ease, border-color 0.22s ease',
                      position: 'relative',
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.transform = 'translateY(-4px)';
                      e.currentTarget.style.boxShadow = `0 20px 40px rgba(0,0,0,0.5), 0 0 0 1px ${tc.accent}40`;
                      e.currentTarget.style.borderColor = `${tc.accent}50`;
                      e.currentTarget.querySelector('.card-hover-btn').style.opacity = '1';
                      e.currentTarget.querySelector('.card-hover-btn').style.transform = 'translateY(0)';
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = 'none';
                      e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)';
                      e.currentTarget.querySelector('.card-hover-btn').style.opacity = '0';
                      e.currentTarget.querySelector('.card-hover-btn').style.transform = 'translateY(6px)';
                    }}
                  >
                    {/* Top colored accent strip */}
                    <div style={{ height: '3px', background: `linear-gradient(90deg, ${tc.strip}, transparent)` }} />

                    <div style={{ padding: '20px 20px 16px' }}>
                      {/* Header row: avatar + name + tier badge */}
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px', marginBottom: '16px' }}>
                        
                        {/* Premium Avatar */}
                        {client.photo_url ? (
                           <img
                            loading="lazy"
                            src={client.photo_url}
                            alt={client.name}
                            style={{
                              width: '52px', height: '52px', borderRadius: '16px',
                              objectFit: 'cover', flexShrink: 0,
                              border: `2px solid ${tc.accent}40`
                            }}
                          />
                        ) : (
                          <div style={{
                            width: '52px', height: '52px', borderRadius: '16px',
                            background: avatarGrad,
                            border: `2px solid ${tc.accent}30`,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '22px', fontWeight: '800', color: tc.accent, flexShrink: 0,
                            boxShadow: `0 4px 16px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.08)`
                          }}>
                            {client.name?.charAt(0).toUpperCase()}
                          </div>
                        )}

                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{
                            fontWeight: '800', fontSize: '16px', color: 'white',
                            lineHeight: '1.2', marginBottom: '4px'
                          }}>{client.name}</div>
                          <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.35)', fontWeight: '600' }}>
                            {client.id_card ? `V-${client.id_card}` : 'Sin cédula'}
                          </div>
                        </div>

                        {/* Tier badge */}
                        <span style={{
                          fontSize: '9px', fontWeight: '800', textTransform: 'uppercase',
                          letterSpacing: '0.5px', padding: '3px 8px', borderRadius: '100px',
                          background: tc.bg, color: tc.accent, flexShrink: 0,
                          border: `1px solid ${tc.accent}30`
                        }}>{tc.label}</span>
                      </div>

                      {/* Stats row */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '14px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <Phone size={11} color="rgba(255,255,255,0.3)" />
                          <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.55)', fontWeight: '600' }}>
                            {client.phone || '—'}
                          </span>
                        </div>
                        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'baseline', gap: '3px' }}>
                          <span style={{ fontSize: '20px', fontWeight: '800', color: tc.accent, lineHeight: 1 }}>{visits}</span>
                          <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)', fontWeight: '600' }}>visitas</span>
                        </div>
                      </div>

                      {/* Loyalty bar */}
                      <div style={{ height: '3px', borderRadius: '100px', background: 'rgba(255,255,255,0.05)', overflow: 'hidden', marginBottom: '14px' }}>
                        <div style={{
                          height: '100%',
                          width: `${Math.min((visits / 20) * 100, 100)}%`,
                          background: `linear-gradient(90deg, ${tc.accent}, ${tc.accent}80)`,
                          borderRadius: '100px',
                          transition: 'width 0.6s ease'
                        }} />
                      </div>

                      {/* Coupons (if coupon mode) */}
                      {viewMode === 'coupons' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          {effectiveCoupons.filter(coupon => coupon.client_id === client.id && coupon.status === 'UNUSED').map((coupon, i) => (
                            <div key={i} style={{
                              padding: '8px 12px', borderRadius: '10px',
                              background: 'rgba(17, 17, 17,0.08)', border: '1px solid rgba(17, 17, 17,0.2)',
                              display: 'flex', alignItems: 'center', gap: '8px'
                            }}>
                              <Gift size={12} color="var(--gold-primary)" />
                              <span style={{ fontSize: '12px', color: 'var(--gold-primary)', fontWeight: '700' }}>{coupon.prize_name}</span>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Hover reveal button */}
                      <div
                        className="card-hover-btn"
                        style={{
                          opacity: 0, transform: 'translateY(6px)',
                          transition: 'opacity 0.2s ease, transform 0.2s ease',
                          background: `linear-gradient(135deg, ${tc.accent}20, ${tc.accent}08)`,
                          border: `1px solid ${tc.accent}30`,
                          borderRadius: '10px', padding: '8px',
                          textAlign: 'center', fontSize: '12px',
                          fontWeight: '700', color: tc.accent,
                          pointerEvents: 'none'
                        }}
                      >
                        Ver Perfil Completo →
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

          ) : (
            <div className="animate-slide-up" style={{ background: 'var(--bg-secondary)', padding: '0', borderRadius: '24px', overflow: 'hidden', border: '1px solid rgba(255, 255, 255, 0.15)' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', tableLayout: 'auto' }}>
                <thead>
                  <tr style={{ backgroundColor: 'rgba(255,255,255,0.02)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <th style={{ padding: isMobile ? '12px 12px' : '16px 24px', fontSize: '11px', fontWeight: '900', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Cliente</th>
                    {!isMobile && <th style={{ padding: '16px 24px', fontSize: '11px', fontWeight: '900', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Cédula / ID</th>}
                    <th style={{ padding: isMobile ? '12px 12px' : '16px 24px', fontSize: '11px', fontWeight: '900', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Contacto</th>
                    {!isMobile && <th style={{ padding: '16px 24px', fontSize: '11px', fontWeight: '900', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Registrado</th>}
                    <th style={{ padding: isMobile ? '12px 12px' : '16px 24px', fontSize: '11px', fontWeight: '900', color: 'var(--text-muted)', textTransform: 'uppercase', textAlign: isMobile ? 'right' : 'left' }}>Visitas</th>
                    {!isMobile && <th style={{ padding: '16px 24px', fontSize: '11px', fontWeight: '900', color: 'var(--text-muted)', textTransform: 'uppercase', textAlign: 'right' }}></th>}
                  </tr>
                </thead>
                <tbody>
                  {paginatedClients.map((client) => (
                      <tr 
                        key={client.id} 
                        onClick={() => setSelectedClient(client)}
                        style={{ borderBottom: '1px solid rgba(255,255,255,0.03)', transition: 'background-color 0.2s', cursor: 'pointer' }} 
                        className="table-row-hover"
                      >
                        <td style={{ padding: isMobile ? '12px 12px' : '16px 24px' }}>
                          <div style={{ fontWeight: '700', color: 'white', fontSize: isMobile ? '13px' : '16px' }}>{client.name}</div>
                          {isMobile && client.id_card && <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>V-{client.id_card}</div>}
                        </td>
                        {!isMobile && (
                          <td style={{ padding: '16px 24px', fontSize: '14px', color: 'var(--text-secondary)', fontWeight: '700' }}>
                            V-{client.id_card || '00.000.000'}
                          </td>
                        )}
                        <td style={{ padding: isMobile ? '12px 12px' : '16px 24px', fontSize: isMobile ? '12px' : '14px', color: 'var(--text-secondary)' }}>
                          {client.phone}
                        </td>
                        {!isMobile && (
                          <td style={{ padding: '16px 24px', fontSize: '13px', color: 'var(--text-muted)' }}>
                            {client.created_at ? new Date(client.created_at).toLocaleDateString() : 'N/A'}
                          </td>
                        )}
                        <td style={{ padding: isMobile ? '12px 12px' : '16px 24px', textAlign: isMobile ? 'right' : 'left' }}>
                          <span style={{ fontSize: '11px', fontWeight: '700', color: 'var(--gold-primary)', backgroundColor: 'rgba(255, 255, 255,0.05)', padding: '4px 8px', borderRadius: '8px', whiteSpace: 'nowrap' }}>
                            {client.total_visits || 0} {!isMobile && "Visitas"}
                          </span>
                        </td>
                        {!isMobile && (
                          <td style={{ padding: '16px 24px', textAlign: 'right' }}>
                            <ChevronRight size={18} color="var(--text-muted)" />
                          </td>
                        )}
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          )}
          {filteredClients.length > clientsPerPage && (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 14, marginTop: 20 }}>
              <button type="button" className="btn-secondary" disabled={clientPage === 1} onClick={() => setClientPage(page => Math.max(1, page - 1))}>Anterior</button>
              <span style={{ color: 'var(--text-secondary)', fontSize: 13, fontWeight: 800 }}>Página {clientPage} de {totalClientPages}</span>
              <button type="button" className="btn-secondary" disabled={clientPage === totalClientPages} onClick={() => setClientPage(page => Math.min(totalClientPages, page + 1))}>Siguiente</button>
            </div>
          )}
        </>
      ) : (
        <ClientDetail 
          isMobile={isMobile}
          client={selectedClient} 
          onBack={() => {
            setSelectedClient(null);
          }} 
          onDelete={() => handleDeleteClient(selectedClient.id, selectedClient.name)}
          onUpdate={async (updates) => {
            try {
              const updated = await dataService.updateClient(selectedClient.id, updates);
              setSelectedClient(updated);
              await onRefresh();
              showToast('Datos actualizados');
              return updated;
            } catch (e) {
              showToast('Error al actualizar', 'error');
              return null;
            }
          }}
        />
      )}
      
      {/* Custom styled modal overlay to edit default birthday message */}
      {canManageClientAdminActions && createPortal(
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          backgroundColor: 'rgba(0, 0, 0, 0.75)',
          backdropFilter: showMessageModal ? 'blur(8px)' : 'blur(0px)',
          zIndex: 99999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px',
          paddingTop: 'max(20px, env(safe-area-inset-top, 20px))',
          opacity: showMessageModal ? 1 : 0,
          visibility: showMessageModal ? 'visible' : 'hidden',
          pointerEvents: showMessageModal ? 'auto' : 'none',
          transition: 'opacity 0.3s ease, backdrop-filter 0.3s ease, visibility 0.3s'
        }}>
          <div className="glass-card" style={{
            width: '100%',
            maxWidth: '460px',
            background: 'var(--bg-secondary)',
            border: '1px solid rgba(255, 255, 255, 0.25)',
            borderRadius: '24px',
            padding: '24px',
            boxShadow: '0 20px 50px rgba(0, 0, 0, 0.5), 0 0 30px rgba(255, 255, 255, 0.05)',
            position: 'relative',
            transform: showMessageModal ? 'scale(1) translateY(0)' : 'scale(0.9) translateY(20px)',
            transition: 'transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.3s ease',
            opacity: showMessageModal ? 1 : 0
          }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <MessageCircle size={20} color="var(--gold-primary)" />
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '900', color: 'white' }}>
                  Mensaje de Cumpleaños Predeterminado
                </h3>
              </div>
              <button 
                onClick={() => setShowMessageModal(false)}
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
                <X size={16} />
              </button>
            </div>

            {/* Description */}
            <p style={{ fontSize: '12.5px', color: 'var(--text-secondary)', lineHeight: '1.5', margin: '0 0 16px 0' }}>
              Define el mensaje que se cargará por defecto al enviar felicitaciones por WhatsApp desde el Dashboard.
            </p>

            <div style={{ 
              backgroundColor: 'rgba(255, 255, 255, 0.1)', 
              border: '1px solid rgba(255, 255, 255, 0.2)',
              borderRadius: '12px',
              padding: '12px',
              fontSize: '12px',
              color: 'var(--gold-primary)',
              marginBottom: '16px',
              lineHeight: '1.4'
            }}>
              <strong>💡 Consejo:</strong> Puedes incluir la palabra clave <code>{"{name}"}</code> en el texto y el sistema la reemplazará automáticamente con el nombre del cliente al enviar.
            </div>

            {/* Message Template Input */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '24px' }}>
              <textarea 
                value={defaultBdayMessage} 
                onChange={(e) => setDefaultBdayMessage(e.target.value)}
                rows={6}
                style={{
                  padding: '12px 14px',
                  backgroundColor: 'rgba(255,255,255,0.02)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: '12px',
                  color: 'white',
                  fontSize: '13px',
                  fontWeight: '600',
                  outline: 'none',
                  resize: 'vertical',
                  minHeight: '140px',
                  lineHeight: '1.5'
                }}
              />
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: '10px' }}>
              <button 
                onClick={() => {
                  localStorage.setItem('panda_default_bday_message', defaultBdayMessage);
                  setShowMessageModal(false);
                  showToast('Mensaje de cumpleaños guardado');
                }}
                style={{
                  flex: 1,
                  padding: '12px',
                  borderRadius: '12px',
                  backgroundColor: 'var(--gold-primary)',
                  color: 'black',
                  fontWeight: '850',
                  fontSize: '13px',
                  border: 'none',
                  cursor: 'pointer',
                  textAlign: 'center'
                }}
              >
                Guardar Cambios
              </button>
              
              <button 
                onClick={() => {
                  setDefaultBdayMessage(localStorage.getItem('panda_default_bday_message') || `¡Hola {name}! ${String.fromCodePoint(0x1F389)} Te deseamos un muy feliz cumpleaños de parte de todo el equipo de Dientes Sanos. ${String.fromCodePoint(0x1F488)} ¡Que tengas un día excelente!`);
                  setShowMessageModal(false);
                }}
                style={{
                  flex: 1,
                  padding: '12px',
                  borderRadius: '12px',
                  backgroundColor: 'rgba(255, 255, 255, 0.05)',
                  color: 'white',
                  fontWeight: '700',
                  fontSize: '13px',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  cursor: 'pointer',
                  textAlign: 'center'
                }}
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      <style>{`
        .list-item:hover {
          border-color: var(--gold-primary);
          transform: scale(1.01) translateY(-2px);
          background-color: var(--bg-tertiary) !important;
          box-shadow: 0 12px 24px rgba(0,0,0,0.3);
        }
      `}</style>
    </div>
  );
};


const RouletteModal = ({ isOpen, onClose, onFinish, prizes }) => {
  const [spinning, setSpinning] = useState(false);
  const [result, setResult] = useState(null);
  const [rotation, setRotation] = useState(0);

  const spin = () => {
    if (spinning || prizes.length === 0) return;
    setSpinning(true);
    setResult(null);
    
    // Calculate random prize
    const randomIndex = Math.floor(Math.random() * prizes.length);
    const selectedPrize = prizes[randomIndex];
    
    // Calculate rotation
    const sliceAngle = 360 / prizes.length;
    // We want the selected index to be at the top (0 degrees).
    // The prize's center angle is idx * sliceAngle.
    // So we need to rotate to 360 - (idx * sliceAngle) + 360 * 5 (spins)
    const extraSpins = 5;
    const targetAngle = (360 * extraSpins) + (360 - (randomIndex * sliceAngle)) + (sliceAngle / 2); // adding half slice to land in middle

    setRotation(prev => prev + targetAngle);

    setTimeout(() => {
      setSpinning(false);
      setResult(selectedPrize);
      setTimeout(() => {
        onFinish(selectedPrize);
      }, 1500);
    }, 5000); // 5 seconds spin
  };

  return (
    <AnimatedModal isOpen={isOpen}>
      {(overlayClass, cardClass) => (
    <div className={overlayClass} style={{ position: 'fixed', inset: 0, zIndex: 100000, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(5px)' }}>
      <div className={`glass-card ${cardClass.replace('global-modal-card', '')}`} style={{ padding: '30px', textAlign: 'center', maxWidth: '400px', width: '90%', position: 'relative', background: 'var(--bg-secondary)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '24px' }}>
        <button onClick={onClose} disabled={spinning} style={{ position: 'absolute', top: '15px', right: '15px', background: 'none', border: 'none', color: 'white', cursor: spinning ? 'not-allowed' : 'pointer' }}>
          <X size={24} />
        </button>
        
        <h2 style={{ color: 'var(--gold-primary)', marginBottom: '20px', fontSize: '24px', fontWeight: '800' }}>Ruleta de Cumpleaños 🎉</h2>
        
        <div style={{ position: 'relative', width: '250px', height: '250px', margin: '0 auto 30px auto' }}>
          {/* Pointer */}
          <div style={{ position: 'absolute', top: '-15px', left: '50%', transform: 'translateX(-50%)', width: '0', height: '0', borderLeft: '15px solid transparent', borderRight: '15px solid transparent', borderTop: '25px solid var(--gold-primary)', zIndex: 10 }} />
          
          {/* Wheel */}
          <div style={{ 
            width: '100%', height: '100%', borderRadius: '50%', border: '4px solid var(--gold-primary)', 
            position: 'relative', overflow: 'hidden', 
            transform: `rotate(${rotation}deg)`, 
            transition: 'transform 5s cubic-bezier(0.2, 0.8, 0.2, 1)' 
          }}>
            {prizes.length === 0 ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'white' }}>Sin premios</div>
            ) : prizes.map((p, i) => {
              const angle = 360 / prizes.length;
              const skew = 90 - angle;
              const rotationAngle = i * angle;
              const color = i % 2 === 0 ? '#1c1c1e' : '#2c2c2e'; // Alternating colors
              const textColor = i % 2 === 0 ? 'var(--gold-primary)' : 'white';
              
              return (
                <div key={i} style={{ 
                  position: 'absolute', width: '50%', height: '50%', 
                  transformOrigin: '100% 100%', 
                  transform: `rotate(${rotationAngle}deg) skewY(-${skew}deg)`, 
                  backgroundColor: color, 
                  border: '1px solid rgba(255,215,0,0.2)' 
                }}>
                  <div style={{ 
                    position: 'absolute', left: '100%', top: '100%', 
                    transformOrigin: '0 0', 
                    transform: `skewY(${skew}deg) rotate(${angle / 2}deg) translate(30px, -70px)`, 
                    color: textColor, fontWeight: '800', fontSize: '10px', whiteSpace: 'nowrap', width: '100px', textAlign: 'center' 
                  }}>
                    {p.prize_name}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {result ? (
          <div className="animate-fade-in" style={{ fontSize: '18px', fontWeight: '800', color: '#32d74b' }}>
            ¡Ganaste: {result.prize_name}! 🎁
          </div>
        ) : (
          <button 
            className="btn-gold" 
            onClick={spin} 
            disabled={spinning || prizes.length === 0}
            style={{ width: '100%', padding: '15px', fontSize: '18px', borderRadius: '12px', fontWeight: '800' }}
          >
            {spinning ? 'Girando...' : 'GIRAR RULETA'}
          </button>
        )}
      </div>
    </div>
      )}
    </AnimatedModal>
  );
};

const getTransactionServiceName = (transaction) => {
  const linkedServiceName = transaction?.service_name || transaction?.services?.name;
  if (linkedServiceName) return linkedServiceName;

  if (typeof transaction?.description === 'string' && transaction.description.trim()) {
    return transaction.description.split(' - ')[0].replace('Servicio: ', '').trim() || 'Servicio';
  }

  return 'Servicio';
};

const ClientDetail = ({ isMobile, client, onBack, onDelete, onUpdate }) => {
  const { showToast } = useNotifs();
  const { confirm } = useDialog();
  const [showCollage, setShowCollage] = useState(false);
  const [showAllHistory, setShowAllHistory] = useState(false);
  const [photoA, setPhotoA] = useState(null);
  const [photoB, setPhotoB] = useState(null);
  const [selectingFor, setSelectingFor] = useState(null); // 'A' or 'B'
  const [sliderPos, setSliderPos] = useState(50);
  const [history, setHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [gallery, setGallery] = useState(
    Array.isArray(client.work_gallery) ? client.work_gallery : []
  );
  const [selectedVisit, setSelectedVisit] = useState(null);
  const [pendingPhoto, setPendingPhoto] = useState(null);
  const [photoMeta, setPhotoMeta] = useState({ type: 'Normal', serviceId: null });

  const [clientCoupons, setClientCoupons] = useState([]);


  // work_gallery (base64 photos) is intentionally NOT part of the clients list query
  // anymore — it bloated every list load. Load this one client's gallery on demand when
  // the detail opens. If the caller already carries work_gallery, use it immediately.
  useEffect(() => {
    let alive = true;
    if (Array.isArray(client.work_gallery)) {
      setGallery(client.work_gallery);
      return;
    }
    dataService.getClientGalleries([client.id])
      .then(map => { if (alive) setGallery(Array.isArray(map?.[client.id]) ? map[client.id] : []); })
      .catch(() => { if (alive) setGallery([]); });
    return () => { alive = false; };
  }, [client.id, client.work_gallery]);

  const fileInputRef = useRef(null);
  const [editData, setEditData] = useState({ 
    name: client.name, 
    phone: client.phone,
    id_card: client.id_card,
    birth_date: client.birth_date || '',
    hair_type: client.hair_type,
    scalp_type: client.scalp_type,
    notes: client.notes || ''
  });

  const { user } = useAuth();
  const roleName = String(user?.role || '').split('|')[0].toLowerCase();
  const isAssistant = roleName.includes('asistente') || roleName.includes('barista') || roleName.includes('recep') || roleName.includes('admin') || roleName.includes('caja');
  const isServiceProfessional = !isAssistant && (roleName.includes('barbero') || roleName.includes('odontolog') || roleName.includes('tatuador'));

  useEffect(() => {
    const loadHistory = async () => {
      try {
        const [coupons, prizes] = await Promise.all([
          dataService.getCoupons(client.id),
          dataService.getRoulettePrizes()
        ]);
        setClientCoupons(coupons || []);
        setRoulettePrizes(prizes || []);
      } catch (err) { console.error('Error loading coupons/prizes:', err); }

      try {
        setLoadingHistory(true);
        const data = await dataService.getClientTransactions(client.id);
        const allHistory = Array.isArray(data) ? data : [];
        if (isServiceProfessional && user?.id) {
          const filteredHistory = allHistory.filter(h => {
            const isMainStaff = String(h.staff_id) === String(user.id);
            const isInStaffList = Array.isArray(h.appointment_staff) && h.appointment_staff.some(as => String(as.staff_id) === String(user.id));
            return isMainStaff || isInStaffList;
          });
          setHistory(filteredHistory);
        } else {
          setHistory(allHistory);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoadingHistory(false);
      }
    };
    loadHistory();
  }, [client.id, isServiceProfessional, user?.id]);


  const handleDownloadComparison = () => {
    if (!photoA || !photoB) return;
    
    const canvas = document.createElement('canvas');
    const imgA = new Image();
    const imgB = new Image();
    
    imgA.src = photoA;
    imgB.src = photoB;
    
    Promise.all([
      new Promise(res => imgA.onload = res),
      new Promise(res => imgB.onload = res)
    ]).then(() => {
      const width = 1200;
      const height = 800;
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      
      // Draw images side by side
      ctx.drawImage(imgA, 0, 0, width/2, height);
      ctx.drawImage(imgB, width/2, 0, width/2, height);
      
      // Add overlay labels
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.fillRect(20, height - 60, 100, 40);
      ctx.fillRect(width/2 + 20, height - 60, 120, 40);
      
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 20px Inter, sans-serif';
      ctx.fillText('ANTES', 35, height - 33);
      ctx.fillText('DESPUÉS', width/2 + 35, height - 33);
      
      // Add Branding
      ctx.fillStyle = 'white';
      ctx.font = '16px Inter, sans-serif';
      ctx.fillText('DIENTES SANOS', width - 200, 30);
      
      const link = document.createElement('a');
      link.download = `Comparativa_${client.name}.jpg`;
      link.href = canvas.toDataURL('image/jpeg', 0.9);
      link.click();
      showToast('Descargando comparativa...');
    });
  };

  const handlePhotoCaptured = async (image) => {
    try {
      // Small but pro optimization
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

      setPendingPhoto(optimizedImage);
      setShowCamera(false);
    } catch (e) {
      console.error(e);
      showToast('Error al procesar imagen', 'error');
    }
  };

  const confirmSavePhoto = async () => {
    try {
      showToast('Guardando en la nube...', 'info');
      
      const photoObj = {
        url: pendingPhoto,
        type: photoMeta.type,
        date: new Date().toISOString(),
        service_id: photoMeta.serviceId,
        service_name: photoMeta.serviceId ? history.find(h => h.id === photoMeta.serviceId)?.services?.name : 'Subida manual'
      };

      // Fetch latest gallery from DB to avoid overwriting barber's photos
      const { data: latestClient } = await supabase
        .from('clients')
        .select('work_gallery')
        .eq('id', client.id)
        .single();
      
      const currentLatestGallery = Array.isArray(latestClient?.work_gallery) ? latestClient.work_gallery : [];
      const newGallery = [photoObj, ...currentLatestGallery];
      
      const updatedClient = await onUpdate({ work_gallery: newGallery });
      if (updatedClient) {
        setGallery(newGallery);
        setPendingPhoto(null);
        setPhotoMeta({ type: 'Normal', serviceId: null });
        showToast('Foto guardada en galería', 'success');
      }
    } catch (e) {
      console.error(e);
      showToast('Error al sincronizar con la nube', 'error');
    }
  };

  const handlePhotoDelete = async (index) => {
    if (!await confirm('¿Deseas eliminar esta foto de la galería?')) return;
    try {
      const newGallery = gallery.filter((_, i) => i !== index);
      setGallery(newGallery);
      await onUpdate({ work_gallery: newGallery });
      showToast('Foto eliminada');
    } catch (e) {
      showToast('Error al eliminar foto', 'error');
    }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        handlePhotoCaptured(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="animate-fade-in" style={{ paddingBottom: '60px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <button onClick={onBack} style={{ color: 'var(--text-secondary)', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
          &larr; Volver al Listado
        </button>
        <button 
          onClick={onDelete}
          style={{ 
            color: '#ff453a', 
            background: 'rgba(255, 69, 58, 0.1)', 
            border: 'none', 
            padding: '8px 16px', 
            borderRadius: '8px', 
            cursor: 'pointer',
            fontSize: '13px',
            fontWeight: '600'
          }}
        >
          Eliminar Ficha
        </button>
      </div>
      
      {isMobile ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Mobile: Combined User Info + Ficha Técnica Card */}
          <div className="glass-card" style={{ padding: '20px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: '16px' }}>
              {/* User Info Column */}
              <div style={{ textAlign: 'center' }}>
                <div style={{ width: '70px', height: '70px', borderRadius: '50%', backgroundColor: 'var(--bg-tertiary)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 10px', border: '2px solid var(--border-color)' }}>
                  <User size={36} color="var(--gold-primary)" />
                </div>
                {isEditing ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <input className="form-input" value={editData.name} onChange={e => setEditData({...editData, name: formatName(e.target.value)})} placeholder="Nombre" style={{ width: '100%', fontSize: '12px', padding: '8px' }} />
                    <input className="form-input" value={editData.phone} onChange={e => setEditData({...editData, phone: e.target.value})} placeholder="Teléfono" style={{ width: '100%', fontSize: '12px', padding: '8px' }} />
                    <button className="btn-gold" onClick={() => { onUpdate(editData); setIsEditing(false); }} style={{ fontSize: '12px', padding: '8px' }}>Guardar</button>
                  </div>
                ) : (
                  <>
                    <h3 style={{ fontSize: '15px', marginBottom: '4px', fontWeight: '800' }}>{client.name}</h3>
                    <p style={{ color: 'var(--text-muted)', fontSize: '10px', marginBottom: '8px' }}>V-{client.id_card || '00.000.000'}</p>

                    <p style={{ color: 'var(--text-secondary)', marginBottom: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', fontSize: '11px' }}>
                      <Phone size={10} color="var(--gold-primary)" /> {client.phone}
                    </p>
                    <div style={{ backgroundColor: 'var(--bg-tertiary)', padding: '6px', borderRadius: '6px', fontSize: '11px' }}>
                      <span style={{ color: 'var(--gold-primary)', fontWeight: '700' }}>{history.length}</span> Visitas
                    </div>
                  </>
                )}
              </div>
              {/* Ficha Técnica Column */}
              <div>
                <h4 style={{ marginBottom: '10px', fontSize: '13px', fontWeight: '800' }}>Ficha Técnica Capilar</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <DetailItem label="Cabello" value={client.hair_type || 'Normal'} />
                  <DetailItem label="Cuero" value={client.scalp_type || 'Normal'} />
                  <DetailItem label="Cumple" value={client.birth_date ? new Date(client.birth_date + 'T00:00:00').toLocaleDateString([], {day: '2-digit', month: 'short'}) : 'N/A'} />
                  <DetailItem label="Registro" value={client.created_at ? new Date(client.created_at).toLocaleDateString() : 'N/A'} />
                </div>
                {!isEditing && (
                  <button 
                    onClick={() => setIsEditing(true)}
                    style={{ width: '100%', marginTop: '10px', background: 'none', border: '1px solid var(--gold-primary)', color: 'var(--gold-primary)', padding: '5px', borderRadius: '6px', cursor: 'pointer', fontSize: '11px', fontWeight: '700' }}
                  >
                    Editar
                  </button>
                )}
              </div>
            </div>
            {isEditing && (
              <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <input className="form-input" value={editData.id_card} onChange={e => setEditData({...editData, id_card: e.target.value})} placeholder="Cédula" style={{ width: '100%', fontSize: '12px', padding: '8px' }} />
                <BirthdayInput value={editData.birth_date} onChange={(v) => setEditData({...editData, birth_date: v})} style={{ width: '100%' }} />
                <PandaSelect 
                  label="Tipo de Cabello"
                  value={editData.hair_type}
                  onChange={(val) => setEditData({...editData, hair_type: val})}
                  options={[
                    { label: 'Normal', value: 'Normal' },
                    { label: 'Graso', value: 'Graso' },
                    { label: 'Seco', value: 'Seco' },
                    { label: 'Mixto', value: 'Mixto' }
                  ]}
                />
                <PandaSelect 
                  label="Cuero Cabelludo"
                  value={editData.scalp_type}
                  onChange={(val) => setEditData({...editData, scalp_type: val})}
                  options={[
                    { label: 'Sano', value: 'Sano' },
                    { label: 'Sensible', value: 'Sensible' },
                    { label: 'Irritado', value: 'Irritado' },
                    { label: 'Caspa', value: 'Caspa' }
                  ]}
                />
              </div>
            )}
          </div>

          <div className="glass-card" style={{ marginBottom: '24px' }}>
            <h4 style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Gift size={18} color="var(--gold-primary)" /> Premios y Cupones
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {clientCoupons.length === 0 ? (
                <div style={{ color: 'var(--text-muted)', fontSize: '13px' }}>No hay cupones ni premios disponibles.</div>
              ) : clientCoupons.map(c => (
                <div key={c.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.03)', padding: '12px', borderRadius: '10px', border: c.status === 'UNUSED' ? '1px solid rgba(50, 215, 75, 0.3)' : '1px solid rgba(255,255,255,0.05)' }}>
                  <div>
                    <div style={{ fontWeight: '800', color: 'white', fontSize: '13px' }}>{c.prize_name}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{new Date(c.generated_at).toLocaleDateString()}</div>
                  </div>
                  <div style={{ fontSize: '10px', fontWeight: '900', padding: '4px 8px', borderRadius: '6px', color: c.status === 'UNUSED' ? '#32d74b' : 'var(--text-muted)', backgroundColor: c.status === 'UNUSED' ? 'rgba(50,215,75,0.1)' : 'rgba(255,255,255,0.05)' }}>
                    {c.status === 'UNUSED' ? 'DISPONIBLE' : 'USADO'}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Mobile: History (last 5 + show more) */}
          <div className="glass-card">
            <h4 style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Calendar size={18} color="var(--gold-primary)" /> Historial de Servicios
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {loadingHistory ? (
                <SkeletonList rows={3} rowHeight={40} gap={8} />
              ) : history.length === 0 ? (
                <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>No hay historial registrado.</p>
              ) : (
                <>
                  {(showAllHistory ? history : history.slice(0, 5)).map(h => (
                    <HistoryItem 
                      key={h.id} 
                      date={new Date(h.created_at).toLocaleString('es-VE', { 
                        day: 'numeric', 
                        month: 'numeric', 
                        year: 'numeric', 
                        hour: '2-digit', 
                        minute: '2-digit', 
                        hour12: true 
                      })} 
                      service={getTransactionServiceName(h)}
                      price={h.amount} 
                      onClick={() => setSelectedVisit(h)}
                    />
                  ))}
                  {history.length > 5 && (
                    <button 
                      onClick={() => setShowAllHistory(!showAllHistory)}
                      style={{ 
                        width: '100%', 
                        padding: '12px', 
                        background: showAllHistory ? 'rgba(255,255,255,0.03)' : 'rgba(255, 255, 255,0.08)', 
                        border: '1px solid var(--gold-primary)', 
                        color: 'var(--gold-primary)', 
                        borderRadius: '10px', 
                        cursor: 'pointer',
                        fontWeight: '700',
                        fontSize: '13px',
                        marginTop: '4px'
                      }}
                    >
                      {showAllHistory ? '↑ Ver menos' : `↓ Ver más servicios (${history.length - 5})`}
                    </button>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Mobile: Gallery */}
          <div className="glass-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h4 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ImageIcon size={18} color="var(--gold-primary)" /> Galería de Trabajos
              </h4>
              <div style={{ display: 'flex', gap: '8px' }}>
                {showCollage && (photoA || photoB) && (
                  <button 
                    onClick={() => { setPhotoA(null); setPhotoB(null); }}
                    style={{ 
                      background: 'rgba(255, 69, 58, 0.15)', 
                      border: '1px solid #ff453a', 
                      color: '#ff453a',
                      padding: '6px 12px',
                      borderRadius: '6px',
                      fontSize: '12px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      cursor: 'pointer',
                      fontWeight: '800',
                      transition: 'all 0.2s'
                    }}
                    onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(255, 69, 58, 0.25)'}
                    onMouseLeave={e => e.currentTarget.style.backgroundColor = 'rgba(255, 69, 58, 0.15)'}
                  >
                    <Trash2 size={14} /> Descartar
                  </button>
                )}
                <button 
                  onClick={() => setShowCollage(!showCollage)}
                  style={{ 
                    background: showCollage ? 'var(--gold-primary)' : 'rgba(255, 255, 255,0.1)', 
                    border: '1px solid var(--gold-primary)', 
                    color: showCollage ? 'black' : 'var(--gold-primary)',
                    padding: '6px 12px',
                    borderRadius: '6px',
                    fontSize: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    cursor: 'pointer',
                    fontWeight: '800'
                  }}
                >
                  <ColumnsIcon size={14} /> {showCollage ? 'Ver Galería' : 'Crear Comparativa'}
                </button>
              </div>
            </div>

            {showCollage ? (
              <div className="animate-scale-in">
                <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: '12px', marginBottom: '16px' }}>
                  <div 
                    onClick={() => setSelectingFor('A')}
                    style={{ 
                      aspectRatio: '1/1', 
                      borderRadius: '16px', 
                      overflow: 'hidden', 
                      backgroundColor: 'rgba(255,255,255,0.02)',
                      border: selectingFor === 'A' ? '2px solid var(--gold-primary)' : '1px solid rgba(255,255,255,0.05)',
                      position: 'relative',
                      cursor: 'pointer'
                    }}
                  >
                    {photoA ? (
                      <img loading="lazy" src={photoA} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                        <ImageIcon size={32} color="rgba(255,255,255,0.05)" />
                        <span style={{ fontSize: '10px', fontWeight: '800', color: 'var(--text-muted)' }}>FOTO ANTES</span>
                      </div>
                    )}
                    <div style={{ position: 'absolute', bottom: '12px', left: '12px', backgroundColor: 'rgba(0,0,0,0.7)', padding: '4px 10px', borderRadius: '4px', fontSize: '10px', fontWeight: '900', color: 'var(--gold-primary)' }}>ANTES</div>
                  </div>

                  <div 
                    onClick={() => setSelectingFor('B')}
                    style={{ 
                      aspectRatio: '1/1', 
                      borderRadius: '16px', 
                      overflow: 'hidden', 
                      backgroundColor: 'rgba(255,255,255,0.02)',
                      border: selectingFor === 'B' ? '2px solid var(--gold-primary)' : '1px solid rgba(255,255,255,0.05)',
                      position: 'relative',
                      cursor: 'pointer'
                    }}
                  >
                    {photoB ? (
                      <img loading="lazy" src={photoB} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                        <ImageIcon size={32} color="rgba(255,255,255,0.05)" />
                        <span style={{ fontSize: '10px', fontWeight: '800', color: 'var(--text-muted)' }}>FOTO DESPUÉS</span>
                      </div>
                    )}
                    <div style={{ position: 'absolute', bottom: '12px', left: '12px', backgroundColor: 'rgba(0,0,0,0.7)', padding: '4px 10px', borderRadius: '4px', fontSize: '10px', fontWeight: '900', color: 'var(--gold-primary)' }}>DESPUÉS</div>
                  </div>
                </div>

                {photoA && photoB ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    <BeforeAfterSlider 
                      photoA={photoA} 
                      photoB={photoB} 
                      sliderPos={sliderPos} 
                      setSliderPos={setSliderPos} 
                    />
                    <button 
                      onClick={handleDownloadComparison}
                      className="btn-gold" 
                      style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}
                    >
                      <Download size={18} /> Descargar Comparativa
                    </button>
                  </div>
                ) : (
                  <div style={{ padding: '12px', borderRadius: '12px', backgroundColor: 'rgba(255,255,255,0.02)', textAlign: 'center', fontSize: '11px', color: 'var(--text-muted)', fontWeight: '600' }}>
                    Selecciona dos fotos para generar el collage
                  </div>
                )}

                <AnimatedModal isOpen={!!selectingFor}>
                  {(overlayClass, cardClass) => (
                    <div className={overlayClass} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(10px)', zIndex: 3000, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px', paddingTop: 'max(20px, env(safe-area-inset-top, 20px))' }}>
                      <div className={`glass-card ${cardClass.replace('global-modal-card', '')}`} style={{ maxWidth: '680px', width: '100%', padding: '24px', background: 'var(--bg-secondary)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '24px', boxShadow: '0 30px 60px -12px rgba(0,0,0,0.5)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px', alignItems: 'center' }}>
                          <h4 style={{ 
                            fontWeight: '900',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            color: 'var(--text-primary)'
                          }}>
                            <ImageIcon size={20} color="var(--gold-primary)" />
                            <span>Elegir Foto {selectingFor}</span>
                          </h4>
                          <button onClick={() => setSelectingFor(null)} style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', cursor: 'pointer', width: '32px', height: '32px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={18} /></button>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: '12px', maxHeight: '400px', overflowY: 'auto' }}>
                          {gallery.length === 0 ? (
                            <div style={{ gridColumn: '1 / -1', padding: '40px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
                              No hay fotos en la galería de este cliente aún. Toma o sube algunas fotos primero.
                            </div>
                          ) : (
                            gallery.map((img, i) => (
                              <div 
                                key={i} 
                                onClick={() => {
                                  if (selectingFor === 'A') setPhotoA(img.url);
                                  if (selectingFor === 'B') setPhotoB(img.url);
                                  setSelectingFor(null);
                                }}
                                style={{ 
                                  aspectRatio: '1/1', 
                                  borderRadius: '8px', 
                                  overflow: 'hidden', 
                                  cursor: 'pointer',
                                  border: (selectingFor === 'A' ? photoA === img.url : photoB === img.url) ? '3px solid var(--gold-primary)' : 'none'
                                }}
                              >
                                <img loading="lazy" src={img.url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </AnimatedModal>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: '12px' }}>
                {gallery.map((img, i) => (
                  <div key={i} style={{ aspectRatio: '1/1', backgroundColor: 'var(--bg-tertiary)', borderRadius: '12px', overflow: 'hidden', border: '1px solid var(--border-color)', position: 'relative' }} className="group">
                    <img loading="lazy" src={img.url || img} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    <div style={{ position: 'absolute', bottom: '0', left: '0', right: '0', background: 'var(--bg-secondary)', padding: '8px', fontSize: '9px', fontWeight: '800', color: 'var(--gold-primary)' }}>
                      {img.type || 'FOTO'}
                    </div>
                    <button 
                      onClick={(e) => { e.stopPropagation(); handlePhotoDelete(i); }}
                      style={{ 
                        position: 'absolute', top: '8px', right: '8px', 
                        backgroundColor: 'rgba(255, 69, 58, 0.8)', 
                        border: 'none', borderRadius: '8px', color: 'white', 
                        padding: '6px', cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        boxShadow: '0 4px 10px rgba(0,0,0,0.3)',
                        transition: '0.2s'
                      }}
                      onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#ff453a'}
                      onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'rgba(255, 69, 58, 0.8)'}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
                <div 
                  onClick={() => setShowCamera(true)}
                  style={{ aspectRatio: '1/1', backgroundColor: 'rgba(255, 255, 255,0.02)', borderRadius: '12px', border: '2px dashed var(--gold-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: '0.2s' }}
                  onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255,0.05)'}
                  onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255,0.02)'}
                >
                  <Camera size={24} color="var(--gold-primary)" />
                </div>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleFileSelect} 
                  accept="image/*" 
                  style={{ display: 'none' }} 
                />
              </div>
            )}
          </div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(min(340px, 40%), 1fr) minmax(0, 1fr)', gap: '28px', alignItems: 'start' }}>
        {/* ── LEFT SIDEBAR ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

          {/* HERO PROFILE CARD */}
          <div style={{
            background: 'var(--bg-secondary)',
            border: '1px solid rgba(17, 17, 17,0.12)',
            borderRadius: '28px',
            overflow: 'hidden',
            boxShadow: '0 24px 48px rgba(0,0,0,0.5)'
          }}>
            {/* Accent bar */}
            <div style={{ height: '3px', background: 'linear-gradient(90deg, transparent, #111111 40%, transparent)' }} />

            <div style={{ padding: '32px 28px 0' }}>
              {/* Avatar */}
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '20px' }}>
                <div style={{ position: 'relative' }}>
                  <div style={{
                    width: '80px', height: '80px', borderRadius: '50%',
                    background: 'var(--bg-secondary)',
                    border: '2px solid rgba(17, 17, 17,0.3)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    boxShadow: '0 0 0 6px rgba(17, 17, 17,0.06), 0 12px 24px rgba(0,0,0,0.4)'
                  }}>
                    <span style={{ fontSize: '26px', fontWeight: '900', color: '#111111', letterSpacing: '-1px' }}>
                      {(client.name || '?').split(' ').slice(0,2).map(w => w[0]).join('').toUpperCase()}
                    </span>
                  </div>
                </div>
                {/* Edit button top-right */}
                {!isEditing && (
                  <button onClick={() => setIsEditing(true)} style={{
                    background: 'rgba(17, 17, 17,0.08)', border: '1px solid rgba(17, 17, 17,0.2)',
                    color: '#111111', borderRadius: '12px', padding: '8px 16px',
                    fontSize: '11px', fontWeight: '800', letterSpacing: '1px',
                    cursor: 'pointer', transition: 'all 0.2s', textTransform: 'uppercase'
                  }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'rgba(17, 17, 17,0.16)'; e.currentTarget.style.borderColor = 'rgba(17, 17, 17,0.4)'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'rgba(17, 17, 17,0.08)'; e.currentTarget.style.borderColor = 'rgba(17, 17, 17,0.2)'; }}
                  >
                    Editar
                  </button>
                )}
              </div>

              {/* Name + ID */}
              {isEditing ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', paddingBottom: '24px' }}>
                  <input className="form-input" value={editData.name} onChange={e => setEditData({...editData, name: formatName(e.target.value)})} placeholder="Nombre" style={{ width: '100%' }} />
                  <input className="form-input" value={editData.id_card} onChange={e => setEditData({...editData, id_card: e.target.value})} placeholder="Cédula" style={{ width: '100%' }} />
                  <input className="form-input" value={editData.phone} onChange={e => setEditData({...editData, phone: e.target.value})} placeholder="Teléfono" style={{ width: '100%' }} />
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <label style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: '800', textTransform: 'uppercase' }}>Cumpleaños</label>
                    <BirthdayInput value={editData.birth_date} onChange={(v) => setEditData({...editData, birth_date: v})} style={{ width: '100%' }} />
                  </div>
                  <PandaSelect label="Tipo de Cabello" value={editData.hair_type} onChange={(val) => setEditData({...editData, hair_type: val})}
                    options={[{label:'Normal',value:'Normal'},{label:'Graso',value:'Graso'},{label:'Seco',value:'Seco'},{label:'Mixto',value:'Mixto'}]}
                    style={{ marginBottom: '4px' }}
                  />
                  <PandaSelect label="Cuero Cabelludo" value={editData.scalp_type} onChange={(val) => setEditData({...editData, scalp_type: val})}
                    options={[{label:'Sano',value:'Sano'},{label:'Sensible',value:'Sensible'},{label:'Irritado',value:'Irritado'},{label:'Caspa',value:'Caspa'}]}
                    style={{ marginBottom: '4px' }}
                  />
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <label style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: '800', textTransform: 'uppercase' }}>Notas y Preferencias</label>
                    <textarea 
                      className="form-input" 
                      value={editData.notes} 
                      onChange={e => setEditData({...editData, notes: e.target.value})} 
                      placeholder="Alergias, café preferido, etc..." 
                      style={{ width: '100%', minHeight: '60px', resize: 'vertical' }} 
                    />
                  </div>
                  <div style={{ display: 'flex', gap: '8px', paddingBottom: '8px', marginTop: '8px' }}>
                    <button className="btn-gold" style={{ flex: 1 }} onClick={() => { onUpdate(editData); setIsEditing(false); }}>Guardar</button>
                    <button onClick={() => setIsEditing(false)} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--text-muted)', borderRadius: '10px', padding: '8px 16px', cursor: 'pointer', fontSize: '13px' }}>Cancelar</button>
                  </div>
                </div>
              ) : (
                <>
                  <h2 style={{ fontSize: '22px', fontWeight: '900', margin: '0 0 4px', letterSpacing: '-0.3px' }}>{client.name}</h2>
                  <p style={{ color: 'var(--text-muted)', fontSize: '12px', fontWeight: '700', letterSpacing: '1px', margin: '0 0 20px', textTransform: 'uppercase' }}>V-{client.id_card || '—'}</p>

                  {/* Info rows */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '24px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{ width: '32px', height: '32px', borderRadius: '10px', background: 'rgba(17, 17, 17,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <Phone size={14} color="#111111" />
                      </div>
                      <span style={{ fontSize: '14px', color: 'var(--text-secondary)', fontWeight: '600' }}>{client.phone || '—'}</span>
                    </div>
                    {client.birth_date && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ width: '32px', height: '32px', borderRadius: '10px', background: 'rgba(17, 17, 17,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <Calendar size={14} color="#111111" />
                        </div>
                        <span style={{ fontSize: '14px', color: 'var(--text-secondary)', fontWeight: '600' }}>
                          {new Date(client.birth_date + 'T00:00:00').toLocaleDateString('es', {day:'2-digit', month:'long', year:'numeric'})}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Notes & Origin Row */}
                  {(client.notes || client.origin) && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
                      {client.origin && (
                        <div style={{ display: 'inline-flex', alignSelf: 'flex-start', alignItems: 'center', gap: '6px', background: 'rgba(255,255,255,0.05)', padding: '6px 12px', borderRadius: '100px', fontSize: '11px', color: 'var(--text-secondary)', fontWeight: '700' }}>
                          Cómo nos conoció: <span style={{ color: '#111111' }}>{client.origin}</span>
                        </div>
                      )}
                      {client.notes && (
                        <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', padding: '16px', borderRadius: '16px' }}>
                          <div style={{ fontSize: '10px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--text-muted)', marginBottom: '8px' }}>Notas y Preferencias</div>
                          <div style={{ fontSize: '13px', color: 'var(--text-primary)', lineHeight: '1.5' }}>{client.notes}</div>
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>

            {/* STATS ROW */}
            {!isEditing && (
              <div style={{
                display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)',
                borderTop: '1px solid rgba(255,255,255,0.05)'
              }}>
                <div style={{ padding: '20px 24px', borderRight: '1px solid rgba(255,255,255,0.05)' }}>
                  <div style={{ fontSize: '28px', fontWeight: '900', color: '#111111', lineHeight: 1 }}>{history.length}</div>
                  <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '1px', marginTop: '4px' }}>Visitas</div>
                </div>
                <div style={{ padding: '20px 24px' }}>
                  <div style={{ fontSize: '28px', fontWeight: '900', color: 'var(--text-primary)', lineHeight: 1 }}>
                    {client.created_at ? new Date(client.created_at).toLocaleDateString('es', {month:'short', year:'2-digit'}) : '—'}
                  </div>
                  <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '1px', marginTop: '4px' }}>Miembro desde</div>
                </div>
              </div>
            )}
          </div>

          {/* HAIR PROFILE CARD */}
          {!isEditing && (client.hair_type || client.scalp_type) && (
            <div style={{
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.07)',
              borderRadius: '20px',
              padding: '20px 22px'
            }}>
              <p style={{ fontSize: '10px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '2px', color: 'var(--text-muted)', margin: '0 0 14px' }}>Perfil Capilar</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {client.hair_type && (
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', gap: '6px',
                    background: 'rgba(17, 17, 17,0.1)', border: '1px solid rgba(17, 17, 17,0.2)',
                    color: '#111111', borderRadius: '100px', padding: '5px 14px',
                    fontSize: '12px', fontWeight: '700'
                  }}>
                    <Scissors size={11} /> Cabello {client.hair_type}
                  </span>
                )}
                {client.scalp_type && (
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', gap: '6px',
                    background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                    color: 'var(--text-secondary)', borderRadius: '100px', padding: '5px 14px',
                    fontSize: '12px', fontWeight: '700'
                  }}>
                    Cuero {client.scalp_type}
                  </span>
                )}
              </div>
            </div>
          )}

        </div>

        
        {/* Right Content: History & Gallery */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
          <div className="glass-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h4 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ImageIcon size={18} color="var(--gold-primary)" /> Galería de Trabajos
              </h4>
              <div style={{ display: 'flex', gap: '8px' }}>
                {showCollage && (photoA || photoB) && (
                  <button 
                    onClick={() => { setPhotoA(null); setPhotoB(null); }}
                    style={{ 
                      background: 'rgba(255, 69, 58, 0.15)', 
                      border: '1px solid #ff453a', 
                      color: '#ff453a',
                      padding: '6px 12px',
                      borderRadius: '6px',
                      fontSize: '12px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      cursor: 'pointer',
                      fontWeight: '800',
                      transition: 'all 0.2s'
                    }}
                    onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(255, 69, 58, 0.25)'}
                    onMouseLeave={e => e.currentTarget.style.backgroundColor = 'rgba(255, 69, 58, 0.15)'}
                  >
                    <Trash2 size={14} /> Descartar
                  </button>
                )}
                <button 
                  onClick={() => setShowCollage(!showCollage)}
                  style={{ 
                    background: showCollage ? 'var(--gold-primary)' : 'rgba(255, 255, 255,0.1)', 
                    border: '1px solid var(--gold-primary)', 
                    color: showCollage ? 'black' : 'var(--gold-primary)',
                    padding: '6px 12px',
                    borderRadius: '6px',
                    fontSize: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    cursor: 'pointer',
                    fontWeight: '800'
                  }}
                >
                  <ColumnsIcon size={14} /> {showCollage ? 'Ver Galería' : 'Crear Comparativa'}
                </button>
              </div>
            </div>

            {showCollage ? (
              <div className="animate-scale-in">
                <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: '12px', marginBottom: '16px' }}>
                  <div 
                    onClick={() => setSelectingFor('A')}
                    style={{ 
                      aspectRatio: '1/1', 
                      borderRadius: '16px', 
                      overflow: 'hidden', 
                      backgroundColor: 'rgba(255,255,255,0.02)',
                      border: selectingFor === 'A' ? '2px solid var(--gold-primary)' : '1px solid rgba(255,255,255,0.05)',
                      position: 'relative',
                      cursor: 'pointer'
                    }}
                  >
                    {photoA ? (
                      <img loading="lazy" src={photoA} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                        <ImageIcon size={32} color="rgba(255,255,255,0.05)" />
                        <span style={{ fontSize: '10px', fontWeight: '800', color: 'var(--text-muted)' }}>FOTO ANTES</span>
                      </div>
                    )}
                    <div style={{ position: 'absolute', bottom: '12px', left: '12px', backgroundColor: 'rgba(0,0,0,0.7)', padding: '4px 10px', borderRadius: '4px', fontSize: '10px', fontWeight: '900', color: 'var(--gold-primary)' }}>ANTES</div>
                  </div>

                  <div 
                    onClick={() => setSelectingFor('B')}
                    style={{ 
                      aspectRatio: '1/1', 
                      borderRadius: '16px', 
                      overflow: 'hidden', 
                      backgroundColor: 'rgba(255,255,255,0.02)',
                      border: selectingFor === 'B' ? '2px solid var(--gold-primary)' : '1px solid rgba(255,255,255,0.05)',
                      position: 'relative',
                      cursor: 'pointer'
                    }}
                  >
                    {photoB ? (
                      <img loading="lazy" src={photoB} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                        <ImageIcon size={32} color="rgba(255,255,255,0.05)" />
                        <span style={{ fontSize: '10px', fontWeight: '800', color: 'var(--text-muted)' }}>FOTO DESPUÉS</span>
                      </div>
                    )}
                    <div style={{ position: 'absolute', bottom: '12px', left: '12px', backgroundColor: 'rgba(0,0,0,0.7)', padding: '4px 10px', borderRadius: '4px', fontSize: '10px', fontWeight: '900', color: 'var(--gold-primary)' }}>DESPUÉS</div>
                  </div>
                </div>

                {photoA && photoB ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    <BeforeAfterSlider 
                      photoA={photoA} 
                      photoB={photoB} 
                      sliderPos={sliderPos} 
                      setSliderPos={setSliderPos} 
                    />
                    <button 
                      onClick={handleDownloadComparison}
                      className="btn-gold" 
                      style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}
                    >
                      <Download size={18} /> Descargar Comparativa
                    </button>
                  </div>
                ) : (
                  <div style={{ padding: '12px', borderRadius: '12px', backgroundColor: 'rgba(255,255,255,0.02)', textAlign: 'center', fontSize: '11px', color: 'var(--text-muted)', fontWeight: '600' }}>
                    Selecciona dos fotos para generar el collage
                  </div>
                )}

                <AnimatedModal isOpen={!!selectingFor}>
                  {(overlayClass, cardClass) => (
                    <div className={overlayClass} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(10px)', zIndex: 3000, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px', paddingTop: 'max(20px, env(safe-area-inset-top, 20px))' }}>
                      <div className={`glass-card ${cardClass.replace('global-modal-card', '')}`} style={{ maxWidth: '680px', width: '100%', padding: '24px', background: 'var(--bg-secondary)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '24px', boxShadow: '0 30px 60px -12px rgba(0,0,0,0.5)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px', alignItems: 'center' }}>
                          <h4 style={{ fontWeight: '900', color: 'var(--text-primary)' }}>Elegir Foto {selectingFor}</h4>
                          <button onClick={() => setSelectingFor(null)} style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', cursor: 'pointer', width: '32px', height: '32px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={18} /></button>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: '12px', maxHeight: '400px', overflowY: 'auto' }}>
                          {gallery.length === 0 ? (
                            <div style={{ gridColumn: '1 / -1', padding: '40px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
                              No hay fotos en la galería de este cliente aún. Toma o sube algunas fotos primero.
                            </div>
                          ) : (
                            gallery.map((img, i) => (
                              <div 
                                key={i} 
                                onClick={() => {
                                  if (selectingFor === 'A') setPhotoA(img.url);
                                  if (selectingFor === 'B') setPhotoB(img.url);
                                  setSelectingFor(null);
                                }}
                                style={{ 
                                  aspectRatio: '1/1', 
                                  borderRadius: '8px', 
                                  overflow: 'hidden', 
                                  cursor: 'pointer',
                                  border: (selectingFor === 'A' ? photoA === img.url : photoB === img.url) ? '3px solid var(--gold-primary)' : 'none'
                                }}
                              >
                                <img loading="lazy" src={img.url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </AnimatedModal>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: '12px' }}>
                {gallery.map((img, i) => (
                  <div key={i} style={{ aspectRatio: '1/1', backgroundColor: 'var(--bg-tertiary)', borderRadius: '12px', overflow: 'hidden', border: '1px solid var(--border-color)', position: 'relative' }} className="group">
                    <img loading="lazy" src={img.url || img} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    <div style={{ position: 'absolute', bottom: '0', left: '0', right: '0', background: 'var(--bg-secondary)', padding: '8px', fontSize: '9px', fontWeight: '800', color: 'var(--gold-primary)' }}>
                      {img.type || 'FOTO'}
                    </div>
                    <button 
                      onClick={(e) => { e.stopPropagation(); handlePhotoDelete(i); }}
                      style={{ 
                        position: 'absolute', top: '8px', right: '8px', 
                        backgroundColor: 'rgba(255, 69, 58, 0.8)', 
                        border: 'none', borderRadius: '8px', color: 'white', 
                        padding: '6px', cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        boxShadow: '0 4px 10px rgba(0,0,0,0.3)',
                        transition: '0.2s'
                      }}
                      onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#ff453a'}
                      onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'rgba(255, 69, 58, 0.8)'}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
                <div 
                  onClick={() => setShowCamera(true)}
                  style={{ aspectRatio: '1/1', backgroundColor: 'rgba(255, 255, 255,0.02)', borderRadius: '12px', border: '2px dashed var(--gold-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: '0.2s' }}
                  onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255,0.05)'}
                  onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255,0.02)'}
                >
                  <Camera size={24} color="var(--gold-primary)" />
                </div>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleFileSelect} 
                  accept="image/*" 
                  style={{ display: 'none' }} 
                />
              </div>
            )}
          </div>

          <div className="glass-card">
            <h4 style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Gift size={18} color="var(--gold-primary)" /> Cupones y Regalos
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {clientCoupons.length === 0 ? (
                <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>Este cliente no tiene cupones ni regalos.</p>
              ) : (
                clientCoupons.map(coupon => {
                  const isRedeemed = coupon.status === 'USED';
                  return (
                    <div 
                      key={coupon.id} 
                      style={{ 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        alignItems: 'center', 
                        padding: '12px 16px', 
                        background: isRedeemed ? 'rgba(255,255,255,0.02)' : 'rgba(255,215,0,0.05)', 
                        borderRadius: '12px', 
                        border: isRedeemed ? '1px solid rgba(255,255,255,0.05)' : '1px solid rgba(255,215,0,0.2)',
                        opacity: isRedeemed ? 0.5 : 1
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ 
                          width: '40px', 
                          height: '40px', 
                          borderRadius: '10px', 
                          background: isRedeemed ? 'rgba(255,255,255,0.05)' : 'var(--gold-primary)', 
                          color: isRedeemed ? 'white' : 'black', 
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'center' 
                        }}>
                          <Ticket size={20} />
                        </div>
                        <div>
                          <p style={{ fontWeight: '700', fontSize: '15px', color: isRedeemed ? 'var(--text-secondary)' : 'white' }}>
                            {coupon.prize_name}
                          </p>
                          <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                            {new Date(coupon.generated_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div style={{ fontSize: '10px', fontWeight: '800', color: isRedeemed ? 'var(--text-muted)' : 'var(--success-color)', background: isRedeemed ? 'rgba(255,255,255,0.05)' : 'rgba(0,255,0,0.1)', padding: '4px 8px', borderRadius: '4px' }}>
                        {isRedeemed ? 'REDIMIDO' : 'DISPONIBLE'}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div className="glass-card">
            <h4 style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Calendar size={18} color="var(--gold-primary)" /> {isMobile ? 'Historial de Servicios' : 'Historial de Visitas'}
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {loadingHistory ? (
                <SkeletonList rows={3} rowHeight={40} gap={8} />
              ) : history.length === 0 ? (
                <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>No hay historial registrado.</p>
              ) : (
                <>
                  {(showAllHistory ? history : history.slice(0, 5)).map(h => (
                    <HistoryItem 
                      key={h.id} 
                      date={h.created_at ? new Date(h.created_at).toLocaleString('es-VE', { 
                        day: 'numeric', 
                        month: 'numeric', 
                        year: 'numeric', 
                        hour: '2-digit', 
                        minute: '2-digit', 
                        hour12: true 
                      }) : 'Fecha no registrada'} 
                      service={getTransactionServiceName(h)}
                      price={h.amount} 
                      barber={h.barber_name}
                      products={h.payment_metadata?.products_sold}
                      extras={h.payment_metadata?.extras}
                      onClick={() => setSelectedVisit(h)}
                    />
                  ))}
                  {history.length > 5 && (
                    <button 
                      onClick={() => setShowAllHistory(!showAllHistory)}
                      style={{ 
                        width: '100%', 
                        padding: '12px', 
                        background: showAllHistory ? 'rgba(255,255,255,0.03)' : 'rgba(255, 255, 255,0.08)', 
                        border: '1px solid var(--gold-primary)', 
                        color: 'var(--gold-primary)', 
                        borderRadius: '10px', 
                        cursor: 'pointer',
                        fontWeight: '700',
                        fontSize: '13px',
                        marginTop: '4px'
                      }}
                    >
                      {showAllHistory ? '↑ Ver menos' : `↓ Ver más servicios (${history.length - 5})`}
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>
      )}

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

      <VisitDetailModal 
        isOpen={!!selectedVisit}
        visit={selectedVisit || {}} 
        onClose={() => setSelectedVisit(null)} 
        gallery={gallery}
      />

      <AnimatedModal isOpen={!!pendingPhoto}>
        {(overlayClass, cardClass) => (
          <div className={overlayClass} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(10px)', zIndex: 1000, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px', paddingTop: 'max(20px, env(safe-area-inset-top, 20px))' }}>
            <div className={`glass-card ${cardClass.replace('global-modal-card', '')}`} style={{ maxWidth: 'min(440px, 90vw)', width: '100%', borderRadius: '24px', padding: '24px', background: 'var(--bg-secondary)', border: '1px solid rgba(255,255,255,0.08)' }}>
              <h3 style={{ 
                marginBottom: '20px', 
                fontWeight: '900',
                display: 'flex',
                alignItems: 'center',
                gap: '10px'
              }}>
                <Camera size={22} color="var(--gold-primary)" />
                <span>Configurar <span className="text-gold">Foto</span></span>
              </h3>
              
              <div style={{ width: '100%', aspectRatio: '1/1', borderRadius: '16px', overflow: 'hidden', marginBottom: '20px' }}>
                <img loading="lazy" src={pendingPhoto} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <PandaSelect 
                  label="TIPO DE FOTO"
                  value={photoMeta.type}
                  onChange={(val) => setPhotoMeta({ ...photoMeta, type: val })}
                  options={[
                    { label: 'Normal / General', value: 'Normal' },
                    { label: 'Antes (Before)', value: 'Antes' },
                    { label: 'Después (After)', value: 'Después' }
                  ]}
                />

                <PandaSelect 
                  label="ASOCIAR A VISITA (OPCIONAL)"
                  value={photoMeta.serviceId}
                  onChange={(val) => setPhotoMeta({ ...photoMeta, serviceId: val })}
                  options={[
                    { label: 'Ninguna', value: null },
                    ...history.map(h => ({ 
                      label: `${h.created_at ? new Date(h.created_at).toLocaleDateString() : 'Sin fecha'} - ${getTransactionServiceName(h)}`,
                      value: h.id 
                    }))
                  ]}
                />

                <div style={{ display: 'flex', gap: '16px' }}>
                  <button onClick={confirmSavePhoto} className="btn-gold" style={{ flex: 1, height: '48px', borderRadius: '14px' }}>GUARDAR FOTO</button>
                </div>
              </div>
            </div>
          </div>
        )}
      </AnimatedModal>


    </div>
  );
};

const VisitDetailModal = ({ isOpen, visit, onClose, gallery = [] }) => {
  if (!visit || Object.keys(visit).length === 0) return null;

  const servicePhotos = gallery.filter(img => img.service_id === visit.id);
  const servicePriceBs = (visit.service_price || 0) * (visit.exchange_rate || 0);
  const totalBs = visit.payment_metadata?.transfer_bs || (visit.amount * (visit.exchange_rate || 0));

  return (
    <AnimatedModal isOpen={isOpen}>
      {(overlayClass, cardClass) => (
        <div className={overlayClass.replace('global-modal-overlay', '')} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)', zIndex: 1000, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px', paddingTop: 'max(20px, env(safe-area-inset-top, 20px))' }}>
          <div className={`glass-card ${cardClass.replace('global-modal-card', '')}`} style={{ maxWidth: '480px', width: '100%', borderRadius: '28px', padding: '32px', border: '1.5px solid rgba(255, 255, 255,0.3)', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h3 style={{ 
                fontSize: '20px', 
                fontWeight: '900',
                display: 'flex',
                alignItems: 'center',
                gap: '10px'
              }}>
                <Receipt size={22} color="var(--gold-primary)" />
                <span>Recibo de <span className="text-gold">Visita</span></span>
              </h3>
              <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer' }}><X size={24} /></button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {/* Header Info */}
              <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: '20px', paddingBottom: '20px', borderBottom: '1px dashed rgba(255,255,255,0.1)' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <span style={{ fontSize: '10px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>Fecha y Hora</span>
                  <span style={{ fontSize: '14px', fontWeight: '800', color: 'white' }}>
                    {visit.created_at ? new Date(visit.created_at).toLocaleString('es-VE', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true }) : 'Fecha no registrada'}
                  </span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <span style={{ fontSize: '10px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>Odontólogo</span>
                  <span style={{ fontSize: '14px', fontWeight: '800', color: 'white' }}>{visit.barber_name || 'No especificado'}</span>
                </div>
              </div>

              {/* Invoice Items */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <label style={{ fontSize: '10px', fontWeight: '800', color: 'var(--gold-primary)', letterSpacing: '1px', textTransform: 'uppercase' }}>Detalle de Cargos</label>
                
                {/* Main Service */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontWeight: '700', fontSize: '14px' }}>{visit.service_name}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Servicio Base</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontWeight: '700', fontSize: '14px' }}>${visit.service_price}</div>
                    <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{servicePriceBs.toLocaleString('es-VE', {minimumFractionDigits: 2, maximumFractionDigits: 2})} Bs.</div>
                  </div>
                </div>

                {/* Extras */}
                {visit.payment_metadata?.extras && visit.payment_metadata.extras.length > 0 && (
                  visit.payment_metadata.extras.map((ex, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.8)' }}>+ {ex.name}</div>
                      <div style={{ fontWeight: '600', fontSize: '13px' }}>${ex.price}</div>
                    </div>
                  ))
                )}

                {/* Products */}
                {visit.payment_metadata?.products_sold && visit.payment_metadata.products_sold.length > 0 && (
                  visit.payment_metadata.products_sold.map((p, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.8)' }}>{p.name} (x{p.quantity})</div>
                      <div style={{ fontWeight: '600', fontSize: '13px' }}>${(p.price * p.quantity).toFixed(2)}</div>
                    </div>
                  ))
                )}
              </div>

              {/* Totals Section */}
              <div style={{ marginTop: '10px', paddingTop: '16px', borderTop: '2px solid rgba(255, 255, 255,0.2)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                <div>
                  <label style={{ fontSize: '10px', fontWeight: '800', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>TOTAL A PAGAR</label>
                  <div style={{ fontSize: '32px', fontWeight: '900', color: 'var(--gold-primary)', lineHeight: '1' }}>${visit.amount}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '16px', fontWeight: '800', color: 'white' }}>{totalBs.toLocaleString('es-VE', {minimumFractionDigits: 2, maximumFractionDigits: 2})} Bs.</div>
                  <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: '700' }}>TASA: {visit.exchange_rate} Bs.</div>
                </div>
              </div>

              {/* Payment Method */}
              <div style={{ padding: '16px', backgroundColor: 'rgba(255, 255, 255,0.05)', borderRadius: '16px', border: '1px solid rgba(255, 255, 255,0.1)' }}>
                <label style={{ display: 'block', fontSize: '10px', fontWeight: '800', color: 'var(--gold-primary)', marginBottom: '12px', letterSpacing: '1px' }}>MÉTODO DE PAGO</label>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: '700', fontSize: '16px' }}>{visit.payment_method}</span>
                  <span style={{ fontSize: '11px', fontWeight: '900', color: '#34c759', backgroundColor: 'rgba(52,199,89,0.1)', padding: '4px 8px', borderRadius: '6px' }}>{visit.status?.toUpperCase() || 'PAGADO'}</span>
                </div>
                {visit.payment_metadata?.method_bs && visit.payment_metadata.method_bs !== visit.payment_method && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px' }}>
                    <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>M. Secundario</span>
                    <span style={{ fontWeight: '700', fontSize: '14px' }}>{visit.payment_metadata.method_bs}</span>
                  </div>
                )}
              </div>

              {/* Tattoo Details */}
              {visit.tattoo_data && (
                <div style={{ padding: '16px', backgroundColor: 'rgba(17, 17, 17, 0.05)', borderRadius: '16px', border: '1px solid rgba(17, 17, 17, 0.15)' }}>
                  <label style={{ display: 'block', fontSize: '10px', fontWeight: '800', color: 'var(--gold-primary)', marginBottom: '12px', letterSpacing: '1px' }}>DETALLES DEL PROCEDIMIENTO</label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: '12px' }}>
                    {visit.tattoo_data.size && (
                      <div>
                        <span style={{ fontSize: '9px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Tamaño</span>
                        <div style={{ fontSize: '13px', fontWeight: '700', color: 'white' }}>{visit.tattoo_data.size}</div>
                      </div>
                    )}
                    {visit.tattoo_data.zone && (
                      <div>
                        <span style={{ fontSize: '9px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Zona</span>
                        <div style={{ fontSize: '13px', fontWeight: '700', color: 'white' }}>{visit.tattoo_data.zone}</div>
                      </div>
                    )}
                    {visit.tattoo_data.style && (
                      <div>
                        <span style={{ fontSize: '9px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Estilo</span>
                        <div style={{ fontSize: '13px', fontWeight: '700', color: 'white' }}>{visit.tattoo_data.style}</div>
                      </div>
                    )}
                    {visit.tattoo_data.theme && (
                      <div>
                        <span style={{ fontSize: '9px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Temática</span>
                        <div style={{ fontSize: '13px', fontWeight: '700', color: 'white' }}>{visit.tattoo_data.theme}</div>
                      </div>
                    )}
                    {visit.tattoo_data.has_design !== null && (
                      <div>
                        <span style={{ fontSize: '9px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Diseño</span>
                        <div style={{ fontSize: '13px', fontWeight: '700', color: 'white' }}>{visit.tattoo_data.has_design ? 'Trae su propio diseño' : 'Diseño personalizado (+$10)'}</div>
                      </div>
                    )}
                  </div>
                  {visit.tattoo_data.idea && (
                    <div style={{ marginTop: '12px' }}>
                      <span style={{ fontSize: '9px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Idea del cliente</span>
                      <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.8)', marginTop: '4px', lineHeight: '1.5', fontStyle: 'italic' }}>"{visit.tattoo_data.idea}"</p>
                    </div>
                  )}

                  {/* Consent Status */}
                  <div style={{ marginTop: '16px', paddingTop: '12px', borderTop: '1px dashed rgba(17, 17, 17, 0.2)' }}>
                    <label style={{ display: 'block', fontSize: '9px', fontWeight: '800', color: 'var(--gold-primary)', marginBottom: '8px', letterSpacing: '1px' }}>CONSENTIMIENTO</label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{ 
                        width: '8px', height: '8px', borderRadius: '50%', 
                        backgroundColor: visit.tattoo_data.consent_signed ? '#34c759' : '#ff453a' 
                      }} />
                      <span style={{ fontSize: '12px', fontWeight: '700', color: visit.tattoo_data.consent_signed ? '#34c759' : '#ff453a' }}>
                        {visit.tattoo_data.consent_signed ? 'Consentimiento firmado' : 'Pendiente de consentimiento'}
                      </span>
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                      {visit.tattoo_data.is_of_legal_age ? 'Mayor de edad - Descargo de responsabilidad' : 'Menor de edad - Requiere consentimiento de padre/tutor'}
                    </div>
                  </div>
                </div>
              )}

              {/* Photos */}
              {servicePhotos.length > 0 && (
                <div style={{ marginTop: '10px' }}>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: '800', color: 'var(--text-muted)', marginBottom: '12px', textTransform: 'uppercase' }}>Fotos de esta visita</label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '10px' }}>
                    {servicePhotos.map((p, i) => (
                      <div key={i} style={{ aspectRatio: '1/1', borderRadius: '12px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 4px 12px rgba(0,0,0,0.3)' }}>
                        <img loading="lazy" src={p.url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <button onClick={onClose} className="btn-gold" style={{ width: '100%', marginTop: '32px', height: '52px', borderRadius: '16px', fontWeight: '900' }}>CERRAR RECIBO</button>
          </div>
        </div>
      )}
    </AnimatedModal>
  );
};

const DetailItem = ({ label, value }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px' }}>
    <span style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>{label}</span>
    <span style={{ fontWeight: '600', fontSize: '14px' }}>{value}</span>
  </div>
);

const HistoryItem = ({ date, service, price, barber, products, extras, onClick }) => (
  <div 
    onClick={onClick}
    style={{ 
      display: 'flex', 
      justifyContent: 'space-between', 
      alignItems: 'center', 
      padding: '16px', 
      backgroundColor: 'var(--bg-tertiary)', 
      borderRadius: '12px',
      cursor: 'pointer',
      transition: 'all 0.2s',
      border: '1px solid transparent'
    }}
    onMouseOver={(e) => { e.currentTarget.style.borderColor = 'var(--gold-primary)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
    onMouseOut={(e) => { e.currentTarget.style.borderColor = 'transparent'; e.currentTarget.style.transform = 'translateY(0)'; }}
  >
    <div style={{ flex: 1 }}>
      <div style={{ fontWeight: '700', fontSize: '15px', color: 'white' }}>{service}</div>
      <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '6px' }}>
        <span>{date}</span>
        {barber && (
          <>
            <span style={{ color: 'var(--border-color)' }}>•</span>
            <span style={{ color: 'var(--gold-primary)' }}>{barber}</span>
          </>
        )}
      </div>
      {(products?.length > 0 || extras?.length > 0) && (
        <div style={{ marginTop: '6px', display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
          {products?.map((p, i) => <span key={'p'+i} style={{ fontSize: '9px', padding: '2px 6px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', color: 'var(--text-secondary)', fontWeight: '600', textTransform: 'uppercase' }}>{p}</span>)}
          {extras?.map((e, i) => <span key={'e'+i} style={{ fontSize: '9px', padding: '2px 6px', background: 'rgba(17, 17, 17,0.1)', borderRadius: '4px', color: '#111111', fontWeight: '600', textTransform: 'uppercase' }}>{e}</span>)}
        </div>
      )}
    </div>
    <div style={{ textAlign: 'right', marginLeft: '12px' }}>
      <div style={{ fontWeight: '800', color: 'var(--gold-primary)', fontSize: '16px' }}>${price}</div>
      <div style={{ fontSize: '10px', color: 'var(--text-secondary)', fontWeight: '700' }}>VER DETALLE</div>
    </div>
  </div>
);

 export default ClientModule;

const BeforeAfterSlider = ({ photoA, photoB, sliderPos, setSliderPos }) => {
  const containerRef = useRef(null);

  const handleMove = (e) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = (e.clientX || e.touches?.[0]?.clientX) - rect.left;
    const pos = Math.max(0, Math.min(100, (x / rect.width) * 100));
    setSliderPos(pos);
  };

  return (
    <div 
      ref={containerRef}
      onMouseMove={handleMove}
      onTouchMove={handleMove}
      style={{ 
        position: 'relative', 
        width: '100%', 
        aspectRatio: '4/3', 
        borderRadius: '20px', 
        overflow: 'hidden', 
        cursor: 'ew-resize',
        backgroundColor: 'rgba(255,255,255,0.02)',
        border: '1px solid rgba(255,255,255,0.05)',
        boxShadow: '0 20px 40px rgba(0,0,0,0.4)'
      }}
    >
      {/* Photo B (After) - Background */}
      <img loading="lazy" src={photoB} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
      
      {/* Photo A (Before) - Foreground with Clip */}
      <div style={{ 
        position: 'absolute', 
        top: 0, 
        left: 0, 
        width: '100%', 
        height: '100%', 
        overflow: 'hidden',
        clipPath: `inset(0 ${100 - sliderPos}% 0 0)`
      }}>
        <img loading="lazy" src={photoA} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
      </div>

      {/* Slider Handle */}
      <div style={{ 
        position: 'absolute', 
        top: 0, 
        bottom: 0, 
        left: `${sliderPos}%`, 
        width: '2px', 
        backgroundColor: 'white',
        boxShadow: '0 0 10px rgba(0,0,0,0.5)',
        zIndex: 10
      }}>
        <div style={{ 
          position: 'absolute', 
          top: '50%', 
          left: '50%', 
          transform: 'translate(-50%, -50%)',
          width: '36px',
          height: '36px',
          borderRadius: '50%',
          backgroundColor: 'white',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 4px 15px rgba(0,0,0,0.5)',
          color: 'var(--gold-primary)'
        }}>
          <ColumnsIcon size={18} style={{ transform: 'rotate(90deg)' }} />
        </div>
      </div>

      {/* Labels */}
      <div style={{ position: 'absolute', top: '12px', left: '12px', backgroundColor: 'var(--bg-secondary)', padding: '4px 10px', borderRadius: '4px', fontSize: '10px', fontWeight: '900', color: 'white', pointerEvents: 'none' }}>ANTES</div>
      <div style={{ position: 'absolute', top: '12px', right: '12px', backgroundColor: 'rgba(255, 255, 255,0.8)', padding: '4px 10px', borderRadius: '4px', fontSize: '10px', fontWeight: '900', color: 'black', pointerEvents: 'none' }}>DESPUÉS</div>
    </div>
  );
};
