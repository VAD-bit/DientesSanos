import React, { useState, useEffect } from 'react';
import { Search, Plus, Ticket, Users, Check, Trash2, Pencil, Loader2, Gift, MessageCircle, X } from 'lucide-react';
import { dataService } from '../services/dataService';
import { SkeletonList } from './Skeleton';
import { useNotifs } from '../context/NotificationContext';
import { useDialog } from '../context/DialogContext';
import PandaSelect from './PandaSelect';
import { formatName } from '../utils/stringUtils';
import AnimatedModal from './AnimatedModal';
import PandaDialog from './PandaDialog';
import PrizeWheel from '../public-site/components/PrizeWheel';

const PrizeRow = ({ prize, idx, onRemove, onUpdate }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [tempName, setTempName] = useState(prize.name?.replace('ROULETTE_PRIZE:', ''));

  const handleSave = async () => {
    if (tempName.trim() === '') return;
    setIsEditing(false);
    if (tempName !== prize.name?.replace('ROULETTE_PRIZE:', '')) {
      await onUpdate(prize.id, tempName);
    }
  };

  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', background: 'rgba(255,255,255,0.03)', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
        <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'rgba(255,215,0,0.1)', color: 'var(--gold-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '800', fontSize: '14px', flexShrink: 0 }}>
          {idx + 1}
        </div>
        {isEditing ? (
          <input 
            type="text" 
            value={tempName} 
            onChange={e => setTempName(e.target.value)} 
            onBlur={handleSave}
            onKeyDown={e => e.key === 'Enter' && handleSave()}
            autoFocus
            style={{ flex: 1, background: 'rgba(255,255,255,0.05)', border: '1px solid var(--gold-primary)', color: 'white', borderRadius: '8px', padding: '8px 12px', fontSize: '15px', outline: 'none' }}
          />
        ) : (
          <div 
            onClick={() => setIsEditing(true)} 
            style={{ flex: 1, padding: '8px 0', border: '1px solid transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
            title="Haz clic para editar"
          >
            <span style={{ fontSize: '15px', fontWeight: '600', color: 'white' }}>
              {prize.name?.replace('ROULETTE_PRIZE:', '')}
            </span>
            <span style={{ fontSize: '11px', fontWeight: '500', color: 'rgba(255,255,255,0.3)' }}>
              (Toca para editar)
            </span>
          </div>
        )}
      </div>
      <button onClick={() => onRemove(prize.id)} style={{ background: 'none', border: 'none', color: '#ff453a', cursor: 'pointer', padding: '8px', flexShrink: 0, marginLeft: '12px' }}>
        <Trash2 size={18} />
      </button>
    </div>
  );
};

const SettingsModule = ({ isMobile, clients, onRefresh }) => {
  const { showToast } = useNotifs();
  const { confirm } = useDialog();
  const [coupons, setCoupons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('coupons');
  const [roulettePrizes, setRoulettePrizes] = useState([]);
  const [newPrizeName, setNewPrizeName] = useState('');
  const [whatsappSettings, setWhatsappSettings] = useState({ followUp: '', birthday: '', thankYou: '', businessNumber: '' });
  const [savingWhatsapp, setSavingWhatsapp] = useState(false);
  
  const [showAddForm, setShowAddForm] = useState(false);
  const [isFormExiting, setIsFormExiting] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newCoupon, setNewCoupon] = useState({ type: 'gratis', value: '', prize_name: '' });
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [assignCouponId, setAssignCouponId] = useState(null);
  const [assignClientId, setAssignClientId] = useState('');
  const [assignSearch, setAssignSearch] = useState('');
  const [assigning, setAssigning] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editCouponId, setEditCouponId] = useState(null);
  const [editCouponData, setEditCouponData] = useState({ type: 'descuento', value: '', prize_name: '' });
  const [savingEdit, setSavingEdit] = useState(false);

  const handleCloseAddForm = () => {
    setIsFormExiting(true);
    setTimeout(() => {
      setShowAddForm(false);
      setIsFormExiting(false);
    }, 250);
  };

  const loadCoupons = async () => {
    try {
      setLoading(true);
      const data = await dataService.getCoupons();
      setCoupons(data || []);
      const prizes = await dataService.getRoulettePrizes();
      setRoulettePrizes(prizes || []);
      
      const settings = await dataService.getSystemSettings();
      setWhatsappSettings({
        followUp: settings.whatsapp_template_followup || '',
        birthday: settings.whatsapp_template_birthday || '',
        thankYou: settings.whatsapp_template_thank_you || 'Gracias por tu visita, es muy importante para nosotros tu fidelidad. ¡Espero que vuelvas pronto!',
        businessNumber: settings.whatsapp_business_number || ''
      });
    } catch (e) {
      console.error(e);
      showToast('Error al cargar datos', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCoupons();
  }, []);

  const handleCreateCoupon = async () => {
    const finalPrizeName = newCoupon.type === 'descuento' ? `${newCoupon.value}% Descuento` : `Premio: ${newCoupon.prize_name}`;
    
    if ((newCoupon.type === 'descuento' && !newCoupon.value) || (newCoupon.type === 'premio' && !newCoupon.prize_name)) {
      showToast('Completa todos los campos requeridos', 'warning');
      return;
    }
    try {
      setCreating(true);
      await dataService.generateCoupon(null, finalPrizeName); // client is null at creation
      showToast('Cupón creado exitosamente');
      setNewCoupon({ type: 'descuento', value: '', prize_name: '' });
      setShowAddForm(false);
      await loadCoupons();
    } catch (e) {
      console.error(e);
      showToast('Error al crear cupón', 'error');
    } finally {
      setCreating(false);
    }
  };

  
  const openEditModal = (coupon) => {
    setEditCouponId(coupon.id);
    let type = 'premio';
    let value = '';
    let prize_name = coupon.prize_name;

    if (coupon.prize_name.includes('% Descuento')) {
      type = 'descuento';
      value = coupon.prize_name.replace('% Descuento', '').trim();
    } else if (coupon.prize_name.startsWith('Premio: ')) {
      type = 'premio';
      prize_name = coupon.prize_name.replace('Premio: ', '').trim();
    }
    
    setEditCouponData({ type, value, prize_name });
    setShowEditModal(true);
  };

  const handleDeleteCoupon = async (id) => {
    const isConfirmed = await confirm("¿Seguro que deseas eliminar este cupón?", "Eliminar Cupón");
    if (isConfirmed) {
      try {
        await dataService.deleteCoupon(id);
        showToast("Cupón eliminado", "success");
        loadCoupons();
      } catch (e) {
        showToast("Error al eliminar cupón", "error");
      }
    }
  };

  const handleAssignCoupon = async () => {
    if (!assignCouponId || !assignClientId) {
      showToast('Selecciona un cliente para asignar el cupón', 'warning');
      return;
    }
    try {
      setAssigning(true);
      await dataService.assignCoupon(assignCouponId, assignClientId);
      showToast('Cupón asignado exitosamente', 'success');
      setShowAssignModal(false);
      setAssignCouponId(null);
      setAssignClientId('');
      await loadCoupons();
    } catch (e) {
      console.error(e);
      showToast('Error al asignar cupón', 'error');
    } finally {
      setAssigning(false);
    }
  };

  const handleAddPrize = async () => {
    if (!newPrizeName) return;
    try {
      setLoading(true);
      await dataService.addRoulettePrize(newPrizeName);
      setNewPrizeName('');
      await loadCoupons();
      showToast('Premio añadido a la ruleta');
    } catch(e) {
      console.error(e);
      showToast('Error al añadir premio', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePrize = async (id, newName) => {
    try {
      await dataService.updateRoulettePrize(id, newName);
      setRoulettePrizes(prev => prev.map(p => p.id === id ? { ...p, name: 'ROULETTE_PRIZE:' + newName } : p));
      showToast('Premio actualizado');
    } catch(e) {
      console.error(e);
      showToast('Error al actualizar premio', 'error');
    }
  };

  const handleRemovePrize = async (id) => {
    confirm('¿Eliminar este premio de la ruleta?', async () => {
      try {
        setLoading(true);
        await dataService.removeRoulettePrize(id);
        await loadCoupons();
        showToast('Premio eliminado');
      } catch(e) {
        console.error(e);
        showToast('Error al eliminar premio', 'error');
      } finally {
        setLoading(false);
      }
    });
  };

  const handleSaveWhatsapp = async () => {
    setSavingWhatsapp(true);
    try {
      await dataService.updateSystemSetting('whatsapp_template_followup', whatsappSettings.followUp);
      await dataService.updateSystemSetting('whatsapp_template_birthday', whatsappSettings.birthday);
      await dataService.updateSystemSetting('whatsapp_template_thank_you', whatsappSettings.thankYou);
      await dataService.updateSystemSetting('whatsapp_business_number', whatsappSettings.businessNumber);
      showToast('Configuración de WhatsApp guardada', 'success');
    } catch (e) {
      console.error(e);
      showToast('Error guardando configuración', 'error');
    } finally {
      setSavingWhatsapp(false);
    }
  };

  const filteredCoupons = coupons.filter(c => {
    const term = searchTerm.toLowerCase();
    const clientName = (c.clients?.name || '').toLowerCase();
    const prize = (c.prize_name || '').toLowerCase();
    return clientName.includes(term) || prize.includes(term) || c.id?.toLowerCase().includes(term);
  });

  return (
    <div className="settings-module animate-fade-in" style={{ maxWidth: '1200px', margin: '0 auto', paddingBottom: '60px' }}>
      <div style={{
        display: 'flex',
        flexDirection: isMobile ? 'column' : 'row',
        justifyContent: 'space-between',
        alignItems: isMobile ? 'flex-start' : 'center',
        gap: isMobile ? '20px' : '0',
        marginBottom: isMobile ? '24px' : '40px'
      }}>
        <div>
          <h2 style={{ fontSize: isMobile ? '26px' : '28px', fontWeight: '800', letterSpacing: '-0.5px', lineHeight: '1.2' }}>Ajustes y <span className="text-gold">Recompensas</span></h2>
          <p style={{ color: 'var(--text-secondary)', marginTop: '6px', fontSize: isMobile ? '13px' : '15px' }}>Gestión de cupones, regalos y parámetros del sistema.</p>
        </div>
        
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', width: isMobile ? '100%' : 'auto' }}>
          <button 
            className="settings-reward-tab"
            onClick={() => setActiveTab('coupons')}
            style={{ borderRadius: '12px', padding: '10px 16px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px', flex: isMobile ? '1' : 'auto', justifyContent: 'center', border: activeTab === 'coupons' ? '1px solid rgba(255,255,255,0.18)' : '1px solid transparent', background: activeTab === 'coupons' ? 'var(--gold-gradient)' : 'transparent', color: activeTab === 'coupons' ? '#090909' : 'var(--text-secondary)', boxShadow: activeTab === 'coupons' ? '0 6px 18px rgba(17, 17, 17,0.18)' : 'none', fontWeight: '750', cursor: 'pointer', transition: 'background 180ms ease, border-color 180ms ease, box-shadow 180ms ease, transform 150ms ease' }}
          >
            <Ticket size={16} /> Cupones Emitidos
          </button>
          <button 
            className="settings-reward-tab"
            onClick={() => setActiveTab('roulette')}
            style={{ borderRadius: '12px', padding: '10px 16px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px', flex: isMobile ? '1' : 'auto', justifyContent: 'center', border: activeTab === 'roulette' ? '1px solid rgba(255,255,255,0.18)' : '1px solid transparent', background: activeTab === 'roulette' ? 'var(--gold-gradient)' : 'transparent', color: activeTab === 'roulette' ? '#090909' : 'var(--text-secondary)', boxShadow: activeTab === 'roulette' ? '0 6px 18px rgba(17, 17, 17,0.18)' : 'none', fontWeight: '750', cursor: 'pointer', transition: 'background 180ms ease, border-color 180ms ease, box-shadow 180ms ease, transform 150ms ease' }}
          >
            <Gift size={16} /> Ruleta de Cumpleaños
          </button>
          <button 
            className="settings-reward-tab"
            onClick={() => setActiveTab('whatsapp')}
            style={{ borderRadius: '12px', padding: '10px 16px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px', flex: isMobile ? '1' : 'auto', justifyContent: 'center', border: activeTab === 'whatsapp' ? '1px solid rgba(255,255,255,0.18)' : '1px solid transparent', background: activeTab === 'whatsapp' ? 'var(--gold-gradient)' : 'transparent', color: activeTab === 'whatsapp' ? '#090909' : 'var(--text-secondary)', boxShadow: activeTab === 'whatsapp' ? '0 6px 18px rgba(17, 17, 17,0.18)' : 'none', fontWeight: '750', cursor: 'pointer', transition: 'background 180ms ease, border-color 180ms ease, box-shadow 180ms ease, transform 150ms ease' }}
          >
            <MessageCircle size={16} /> Bot WhatsApp
          </button>
        </div>
      </div>

      {activeTab === 'coupons' && (
        <>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '20px' }}>
            <button 
              className={showAddForm ? "hover-brightness" : "btn-gold"} 
              onClick={() => showAddForm ? handleCloseAddForm() : setShowAddForm(true)} 
              style={showAddForm ? { 
                height: '40px', padding: '0 20px', 
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontSize: '13px',
                background: 'rgba(255, 69, 58, 0.1)', border: '1px solid rgba(255, 69, 58, 0.3)', color: '#ff453a', borderRadius: '12px', cursor: 'pointer', transition: 'background 0.2s, color 0.2s', fontWeight: '850'
              } : {
                height: '40px', padding: '0 20px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontSize: '13px', fontWeight: '800'
              }}
            >
              {showAddForm ? <X size={16} /> : <Plus size={16} />}
              {showAddForm ? 'Cancelar' : 'Emitir Cupón'}
            </button>
          </div>

          {(showAddForm || isFormExiting) && (
        <div className={`glass-card ${isFormExiting ? 'animate-slide-down-fade' : 'animate-fade-in'}`} style={{ marginBottom: '40px', padding: '32px', borderRadius: '24px' }}>
          <h3 style={{ marginBottom: '24px', fontSize: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Ticket size={24} color="var(--gold-primary)" /> Emitir Cupón de Regalo
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '24px' }}>
            <PandaSelect
              label="Tipo de Cupón"
              value={newCoupon.type}
              onChange={(val) => setNewCoupon({...newCoupon, type: val})}
              options={[{ value: 'descuento', label: 'Descuento (%)' }, { value: 'premio', label: 'Premio / Regalo' }]}
            />
            
            {newCoupon.type === 'descuento' ? (
              <div className="form-group">
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', color: 'var(--text-secondary)' }}>Porcentaje de Descuento (%)</label>
                <input 
                  type="number"
                  className="form-input" 
                  placeholder="Ej. 15" 
                  value={newCoupon.value} 
                  onChange={(e) => setNewCoupon({...newCoupon, value: e.target.value})} 
                  style={{ width: '100%' }} 
                />
              </div>
            ) : (
              <div className="form-group">
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', color: 'var(--text-secondary)' }}>Descripción del Premio</label>
                <input 
                  className="form-input" 
                  placeholder="Ej. Limpieza Gratis, Blanqueamiento, Consulta..." 
                  value={newCoupon.prize_name} 
                  onChange={(e) => setNewCoupon({...newCoupon, prize_name: e.target.value})} 
                  style={{ width: '100%' }} 
                />
              </div>
            )}

            <div style={{ display: 'flex', alignItems: 'flex-end' }}>
              <button 
                className="btn-gold" 
                onClick={handleCreateCoupon} 
                disabled={creating || (newCoupon.type === 'descuento' && !newCoupon.value) || (newCoupon.type === 'premio' && !newCoupon.prize_name)} 
                style={{ width: '100%', height: '48px', borderRadius: '12px' }}
              >
                {creating ? <Loader2 className="animate-spin" /> : 'Emitir Cupón'}
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
          placeholder="Buscar por cliente, premio o ID del cupón..." 
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
        <SkeletonList rows={4} rowHeight={64} />
      ) : coupons.length === 0 ? (
        <div className="glass-card" style={{ textAlign: 'center', padding: '80px', borderStyle: 'dashed' }}>
          <Ticket size={48} color="var(--bg-tertiary)" style={{ marginBottom: '20px' }} />
          <p style={{ color: 'var(--text-muted)' }}>No hay cupones emitidos. Crea el primero arriba.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
          <div>
            <h4 style={{ color: 'white', fontSize: '18px', fontWeight: '700', marginBottom: '16px' }}>Plantillas de Cupones (Para Asignar)</h4>
            <div className="animate-slide-up" style={{ background: 'var(--bg-secondary)', padding: '0', borderRadius: '24px', overflow: 'hidden', border: '1px solid rgba(255, 255, 255, 0.15)' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', tableLayout: 'auto' }}>
                <thead>
                  <tr style={{ backgroundColor: 'rgba(255,255,255,0.02)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <th style={{ padding: isMobile ? '12px' : '16px 24px', fontSize: '11px', fontWeight: '900', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Código / Fecha</th>
                    <th style={{ padding: isMobile ? '12px' : '16px 24px', fontSize: '11px', fontWeight: '900', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Acción</th>
                    <th style={{ padding: isMobile ? '12px' : '16px 24px', fontSize: '11px', fontWeight: '900', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Premio</th>
                    <th style={{ padding: isMobile ? '12px' : '16px 24px', fontSize: '11px', fontWeight: '900', color: 'var(--text-muted)', textTransform: 'uppercase', textAlign: 'right' }}>Gestión</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCoupons.filter(c => !c.client_id).length === 0 ? (
                    <tr>
                      <td colSpan="4" style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
                        No hay plantillas que coincidan con la búsqueda.
                      </td>
                    </tr>
                  ) : filteredCoupons.filter(c => !c.client_id).map((coupon) => (
                    <tr key={coupon.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)', transition: 'background-color 0.2s' }} className="table-row-hover">
                      <td style={{ padding: isMobile ? '12px' : '16px 24px' }}>
                        <div style={{ fontWeight: '700', color: 'var(--gold-primary)', fontSize: isMobile ? '11px' : '13px', letterSpacing: '1px' }}>
                          {coupon.id?.substring(0, 8).toUpperCase()}
                        </div>
                      </td>
                      <td style={{ padding: isMobile ? '12px' : '16px 24px', fontSize: isMobile ? '12px' : '14px', color: 'white', fontWeight: '600' }}>
                        <button 
                          onClick={() => { setAssignCouponId(coupon.id); setShowAssignModal(true); }}
                          style={{ background: 'var(--gold-primary)', color: 'black', border: 'none', padding: '6px 12px', borderRadius: '4px', fontSize: '11px', fontWeight: '800', cursor: 'pointer' }}
                        >
                          Asignar Cupón
                        </button>
                      </td>
                      <td style={{ padding: isMobile ? '12px' : '16px 24px', fontSize: isMobile ? '12px' : '14px', color: 'var(--text-secondary)' }}>
                        {coupon.prize_name}
                      </td>
                      <td style={{ padding: isMobile ? '12px' : '16px 24px', textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                          <button onClick={() => openEditModal(coupon)} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', padding: '6px', borderRadius: '6px', color: 'white', cursor: 'pointer' }} title="Editar">
                            <Pencil size={14} />
                          </button>
                          <button onClick={() => handleDeleteCoupon(coupon.id)} style={{ background: 'rgba(255,69,58,0.1)', border: '1px solid rgba(255,69,58,0.2)', padding: '6px', borderRadius: '6px', color: '#ff453a', cursor: 'pointer' }} title="Eliminar">
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div>
            <h4 style={{ color: 'white', fontSize: '18px', fontWeight: '700', marginBottom: '16px' }}>Cupones Asignados a Pacientes</h4>
            <div className="animate-slide-up" style={{ background: 'var(--bg-secondary)', padding: '0', borderRadius: '24px', overflow: 'hidden', border: '1px solid rgba(255, 255, 255, 0.15)' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', tableLayout: 'auto' }}>
                <thead>
                  <tr style={{ backgroundColor: 'rgba(255,255,255,0.02)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <th style={{ padding: isMobile ? '12px' : '16px 24px', fontSize: '11px', fontWeight: '900', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Código / Fecha Asign.</th>
                    <th style={{ padding: isMobile ? '12px' : '16px 24px', fontSize: '11px', fontWeight: '900', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Cliente</th>
                    <th style={{ padding: isMobile ? '12px' : '16px 24px', fontSize: '11px', fontWeight: '900', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Premio</th>
                    <th style={{ padding: isMobile ? '12px' : '16px 24px', fontSize: '11px', fontWeight: '900', color: 'var(--text-muted)', textTransform: 'uppercase', textAlign: 'right' }}>Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCoupons.filter(c => c.client_id).length === 0 ? (
                    <tr>
                      <td colSpan="4" style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
                        No hay cupones asignados a clientes aún.
                      </td>
                    </tr>
                  ) : filteredCoupons.filter(c => c.client_id).map((coupon) => (
                    <tr key={coupon.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)', transition: 'background-color 0.2s' }} className="table-row-hover">
                      <td style={{ padding: isMobile ? '12px' : '16px 24px' }}>
                        <div style={{ fontWeight: '700', color: 'var(--gold-primary)', fontSize: isMobile ? '11px' : '13px', letterSpacing: '1px' }}>
                          {coupon.id?.substring(0, 8).toUpperCase()}
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                          {new Date(coupon.generated_at).toLocaleDateString()}
                        </div>
                      </td>
                      <td style={{ padding: isMobile ? '12px' : '16px 24px', fontSize: isMobile ? '12px' : '14px', color: 'white', fontWeight: '600' }}>
                        {coupon.clients?.name || 'Cliente Eliminado'}
                      </td>
                      <td style={{ padding: isMobile ? '12px' : '16px 24px', fontSize: isMobile ? '12px' : '14px', color: 'var(--text-secondary)' }}>
                        {coupon.prize_name}
                      </td>
                      <td style={{ padding: isMobile ? '12px' : '16px 24px', textAlign: 'right' }}>
                        {coupon.status === 'UNUSED' ? (
                          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', alignItems: 'center' }}>
                            <span style={{ fontSize: '11px', fontWeight: '800', color: 'var(--success-color)', background: 'rgba(0,255,0,0.1)', padding: '4px 8px', borderRadius: '4px' }}>DISPONIBLE</span>
                            <button onClick={() => handleDeleteCoupon(coupon.id)} style={{ background: 'rgba(255,69,58,0.1)', border: '1px solid rgba(255,69,58,0.2)', padding: '6px', borderRadius: '6px', color: '#ff453a', cursor: 'pointer' }} title="Revocar Cupón">
                              <Trash2 size={14} />
                            </button>
                          </div>
                        ) : (
                          <span style={{ fontSize: '10px', fontWeight: '800', color: 'var(--text-muted)', backgroundColor: 'rgba(255, 255, 255, 0.05)', padding: '4px 8px', borderRadius: '6px' }}>
                            USADO ({coupon.redeemed_at ? new Date(coupon.redeemed_at).toLocaleDateString() : ''})
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
        )}
      </>
      )}

      {activeTab === 'roulette' && (
        <div className="animate-fade-in" style={{ maxWidth: '1000px', margin: '0 auto' }}>
          <div className="glass-card" style={{ padding: '32px', borderRadius: '24px' }}>
            <h3 style={{ marginBottom: '16px', fontSize: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Gift size={24} color="var(--gold-primary)" /> Configurar Ruleta de Cumpleaños
            </h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '24px', lineHeight: '1.5' }}>
              Los premios listados aquí aparecerán en la ruleta del cliente el día de su cumpleaños. 
              Al girarla, ganarán uno de estos premios y se generará un cupón automáticamente.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '48px', alignItems: 'flex-start' }}>
              <div>
                <div style={{ display: 'flex', gap: '12px', marginBottom: '32px' }}>
                  <input 
                    className="form-input" 
                    placeholder="Ej. Limpieza Gratis, Blanqueamiento, 10% Descuento..." 
                    value={newPrizeName} 
                    onChange={(e) => setNewPrizeName(e.target.value)} 
                    style={{ flex: 1 }}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddPrize()}
                  />
                  <button className="btn-gold" onClick={handleAddPrize} disabled={!newPrizeName || loading} style={{ borderRadius: '12px', padding: '0 24px' }}>
                    <Plus size={20} /> Añadir
                  </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {roulettePrizes.length === 0 ? (
                    <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)', border: '1px dashed var(--border-color)', borderRadius: '16px' }}>
                      No hay premios configurados. Añade premios arriba.
                    </div>
                  ) : (
                    roulettePrizes.map((prize, idx) => (
                      <PrizeRow 
                        key={prize.id} 
                        prize={prize} 
                        idx={idx} 
                        onRemove={handleRemovePrize} 
                        onUpdate={handleUpdatePrize} 
                      />
                    ))
                  )}
                </div>
              </div>
              
              <div style={{ margin: '0 auto' }}>
                <div style={{ textAlign: 'center', marginBottom: '10px', color: 'var(--gold-primary)', fontWeight: '900', letterSpacing: '2px', textTransform: 'uppercase', fontSize: '14px' }}>Vista Previa en Vivo</div>
                <div>
                  <PrizeWheel clientId="preview" externalPrizes={roulettePrizes} />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'whatsapp' && (
        <div className="animate-fade-in" style={{ maxWidth: '800px', margin: '0 auto' }}>
          <div className="glass-card" style={{ padding: '32px', borderRadius: '24px' }}>
            <h3 style={{ marginBottom: '16px', fontSize: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <MessageCircle size={24} color="var(--gold-primary)" /> Configurar Mensajes de WhatsApp
            </h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '24px', lineHeight: '1.5' }}>
              Estos son los textos que el bot enviará automáticamente. Puedes usar la etiqueta <b>{`{{nombre}}`}</b> y el bot la reemplazará por el nombre del cliente.
            </p>

            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: 'white', marginBottom: '8px' }}>Número de WhatsApp de la Clínica</label>
              <p style={{ color: 'var(--text-muted)', fontSize: '12px', marginBottom: '8px' }}>
                Incluye el código del país sin el símbolo +. Ejemplo: 584129206984
              </p>
              <input 
                className="form-input" 
                type="tel"
                placeholder="584129206984"
                value={whatsappSettings.businessNumber} 
                onChange={(e) => setWhatsappSettings({...whatsappSettings, businessNumber: e.target.value})} 
                style={{ width: '100%' }}
              />
            </div>

            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: 'white', marginBottom: '8px' }}>Recordatorio de Recurrencia</label>
              <textarea 
                className="form-input" 
                rows={6}
                value={whatsappSettings.followUp} 
                onChange={(e) => setWhatsappSettings({...whatsappSettings, followUp: e.target.value})} 
                style={{ width: '100%', resize: 'vertical' }}
              />
            </div>

            <div style={{ marginBottom: '32px' }}>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: 'white', marginBottom: '8px' }}>Mensaje después del cobro</label>
              <textarea className="form-input" rows={6} value={whatsappSettings.thankYou} onChange={(e) => setWhatsappSettings({...whatsappSettings, thankYou: e.target.value})} style={{ width: '100%', resize: 'vertical' }} />
            </div>

            <div style={{ marginBottom: '32px' }}>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: 'white', marginBottom: '8px' }}>Felicitación de Cumpleaños</label>
              <textarea 
                className="form-input" 
                rows={6}
                value={whatsappSettings.birthday} 
                onChange={(e) => setWhatsappSettings({...whatsappSettings, birthday: e.target.value})} 
                style={{ width: '100%', resize: 'vertical' }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button 
                className="btn-gold" 
                onClick={handleSaveWhatsapp} 
                disabled={savingWhatsapp} 
                style={{ borderRadius: '12px', padding: '12px 32px' }}
              >
                {savingWhatsapp ? <Loader2 className="animate-spin" /> : 'Guardar Mensajes'}
              </button>
            </div>
          </div>
        </div>
      )}


      <PandaDialog 
        isOpen={showEditModal}
        title="Editar Cupón"
        message="Actualiza los detalles del cupón o premio."
        type="custom"
        onCancel={() => setShowEditModal(false)}
        customFooter={
          <div style={{ textAlign: 'left' }}>
            <div style={{ marginBottom: '16px' }}>
              <PandaSelect 
                label="Tipo"
                value={editCouponData.type}
                onChange={(val) => setEditCouponData({...editCouponData, type: val})}
                options={[
                  { value: 'descuento', label: 'Descuento (%)' },
                  { value: 'premio', label: 'Premio Especial' }
                ]}
              />
            </div>

            {editCouponData.type === 'descuento' ? (
              <div style={{ marginBottom: '24px' }}>
                <label style={{ display: 'block', fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '8px' }}>Porcentaje de Descuento</label>
                <div style={{ position: 'relative' }}>
                  <input 
                    type="number" 
                    className="form-input" 
                    placeholder="Ej. 10, 20, 50" 
                    value={editCouponData.value} 
                    onChange={(e) => setEditCouponData({...editCouponData, value: e.target.value})} 
                    style={{ width: '100%', paddingRight: '40px' }}
                  />
                  <span style={{ position: 'absolute', right: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }}>%</span>
                </div>
              </div>
            ) : (
              <div style={{ marginBottom: '24px' }}>
                <label style={{ display: 'block', fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '8px' }}>Nombre del Premio</label>
                <input 
                  type="text" 
                  className="form-input" 
                  placeholder="Ej. Limpieza Gratis" 
                  value={editCouponData.prize_name} 
                  onChange={(e) => setEditCouponData({...editCouponData, prize_name: e.target.value})} 
                  style={{ width: '100%' }}
                />
              </div>
            )}

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button 
                className="btn-gold" 
                onClick={async () => {
                  const finalPrizeName = editCouponData.type === 'descuento' 
                    ? `${editCouponData.value}% Descuento` 
                    : `Premio: ${editCouponData.prize_name}`;
                  
                  if ((editCouponData.type === 'descuento' && !editCouponData.value) || (editCouponData.type === 'premio' && !editCouponData.prize_name)) {
                    showToast('Completa todos los campos requeridos', 'warning');
                    return;
                  }
                  
                  setSavingEdit(true);
                  try {
                    await dataService.updateCoupon(editCouponId, finalPrizeName);
                    showToast("Cupón actualizado", "success");
                    setShowEditModal(false);
                    loadCoupons();
                  } catch (e) {
                    showToast("Error al actualizar cupón", "error");
                  } finally {
                    setSavingEdit(false);
                  }
                }}
                disabled={savingEdit}
                style={{ flex: 1.5, padding: '14px', borderRadius: '14px', fontWeight: '850', fontSize: '15px' }}
              >
                {savingEdit ? <Loader2 className="animate-spin" size={16} /> : 'Guardar Cambios'}
              </button>
            </div>
          </div>
        }
      />

      <PandaDialog
        isOpen={showAssignModal}
        title={<div style={{display: 'flex', alignItems: 'center', gap: '8px'}}><Users size={24} color="var(--gold-primary)"/> Asignar Cupón</div>}
        message="Busca y selecciona el cliente que recibirá este cupón."
        type="custom"
        onCancel={() => { setShowAssignModal(false); setAssignClientId(''); setAssignSearch(''); setAssignCouponId(null); }}
        customFooter={
          <div style={{ textAlign: 'left' }}>
            <div className="search-container" style={{ marginBottom: '16px' }}>
              <Search className="search-icon" size={18} />
              <input 
                type="text" 
                className="search-input" 
                placeholder="Buscar cliente por nombre, cédula o teléfono..." 
                value={assignSearch}
                onChange={e => setAssignSearch(e.target.value)}
                autoFocus
                style={{
                  width: '100%',
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '12px',
                  padding: '12px 12px 12px 40px',
                  color: 'white',
                  fontSize: '14px'
                }}
              />
            </div>
            
            <div style={{ 
              maxHeight: '200px', 
              overflowY: 'auto', 
              background: 'var(--bg-secondary)', 
              borderRadius: '12px',
              border: '1px solid rgba(255,255,255,0.05)',
              marginBottom: '20px'
            }}>
              {clients.filter(c => 
                (c.name || '').toLowerCase().includes(assignSearch.toLowerCase()) || 
                (c.id_card || '').includes(assignSearch) ||
                (c.phone || '').includes(assignSearch)
              ).map(c => (
                <div 
                  key={c.id} 
                  onClick={() => setAssignClientId(c.id)}
                  style={{
                    padding: '12px 16px',
                    borderBottom: '1px solid rgba(255,255,255,0.05)',
                    cursor: 'pointer',
                    background: assignClientId === c.id ? 'rgba(17, 17, 17, 0.15)' : 'transparent',
                    borderLeft: assignClientId === c.id ? '3px solid var(--gold-primary)' : '3px solid transparent',
                    transition: 'background 0.2s'
                  }}
                  onMouseEnter={e => {
                    if (assignClientId !== c.id) e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
                  }}
                  onMouseLeave={e => {
                    if (assignClientId !== c.id) e.currentTarget.style.background = 'transparent';
                  }}
                >
                  <div style={{ fontWeight: '600', color: assignClientId === c.id ? 'var(--gold-primary)' : 'white' }}>{c.name}</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>V-{c.id_card || 'S/C'} • {c.phone || 'S/T'}</div>
                </div>
              ))}
              {clients.filter(c => 
                (c.name || '').toLowerCase().includes(assignSearch.toLowerCase()) || 
                (c.id_card || '').includes(assignSearch) ||
                (c.phone || '').includes(assignSearch)
              ).length === 0 && (
                <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '13px' }}>
                  No se encontraron clientes
                </div>
              )}
            </div>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button 
                className="btn-gold" 
                onClick={handleAssignCoupon}
                disabled={assigning || !assignClientId}
                style={{ 
                  flex: 1.5,
                  padding: '14px', 
                  borderRadius: '14px', 
                  fontWeight: '850', 
                  fontSize: '15px'
                }}
              >
                {assigning ? <Loader2 className="animate-spin" size={16} /> : 'Asignar Cupón'}
              </button>
            </div>
          </div>
        }
      />
    </div>
  );
};

export default SettingsModule;
