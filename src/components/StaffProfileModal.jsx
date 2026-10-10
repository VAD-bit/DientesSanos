import React, { useState, useEffect } from 'react';
import { 
  X, 
  User, 
  Scissors, 
  ShoppingBag, 
  Clock, 
  Star, 
  Wrench, 
  Plus, 
  Trash2, 
  TrendingUp,
  Package,
  History,
  Minus,
  Zap,
  Droplets
} from 'lucide-react';
import { dataService } from '../services/dataService';
import { SkeletonGrid } from './Skeleton';
import { useNotifs } from '../context/NotificationContext';
import { useDialog } from '../context/DialogContext';
import { useAuth } from '../context/AuthContext';
import PandaSelect from './PandaSelect';
import { useScrollLock } from '../hooks/useScrollLock';
import AnimatedModal from './AnimatedModal';
import { createPortal } from 'react-dom';
import PersonalInventoryHistoryModal from './PersonalInventoryHistoryModal';
import { roleLabel } from '../utils/staffRoles';

const asArray = (value) => Array.isArray(value) ? value : [];

const StaffProfileModal = ({ isOpen, onClose, staffMember, inventory = [], onUpdate, isMobile }) => {
  const { user } = useAuth();
  const isAdmin = user?.role?.startsWith('Admin');
  
  const isMobileView = isMobile || (typeof window !== 'undefined' && window.innerWidth < 768);
  const { showToast } = useNotifs();
  const { confirm } = useDialog();
  const [activeTab, setActiveTab] = useState(() => {
    return localStorage.getItem('panda_staffProfileTab') || 'rendimiento';
  });
  
  useEffect(() => {
    localStorage.setItem('panda_staffProfileTab', activeTab);
  }, [activeTab]);

  const [loading, setLoading] = useState(true);

  useScrollLock(isOpen);
  
  const [reviews, setReviews] = useState([]);

  // Stats State
  const [stats, setStats] = useState({
    totalAppointments: 0,
    totalServiceComm: 0,
    totalProductComm: 0,
    totalTips: 0,
    topServices: [],
    avgDurationMin: 0
  });

  // Inventory State
  const [tools, setTools] = useState([]);
  const [showAddTool, setShowAddTool] = useState(false);
  const [isToolFormExiting, setIsToolFormExiting] = useState(false);
  const [newTool, setNewTool] = useState({
    name: '',
    brand: '',
    ownership: 'Propia',
    status: 'Operativa',
    inventory_id: '',
    item_type: 'Herramienta',
    quantity: 1
  });
  const handleCloseToolForm = () => {
    setIsToolFormExiting(true);
    setTimeout(() => {
      setShowAddTool(false);
      setIsToolFormExiting(false);
    }, 250);
  };
  const [showInventoryHistory, setShowInventoryHistory] = useState(false);
  const [adjustingToolId, setAdjustingToolId] = useState(null);

  const logPersonalInventoryMovement = async (tool, action, amount, type, productId = tool.inventory_id || null) => {
    try {
      await dataService.logInventoryMovement({
        product_id: productId,
        type,
        amount,
        reason: `[PERSONAL:${staffMember.id}] ${action}|${tool.name}`
      });
    } catch (error) {
      console.error('Error logging personal inventory movement:', error);
    }
  };

  useEffect(() => {
    if (isOpen && staffMember) {
      loadProfileData();
      setTools(asArray(staffMember.tools));
    }
  }, [isOpen, staffMember]);

  const loadProfileData = async () => {
    try {
      setLoading(true);
      const [profileStats, profileReviews] = await Promise.all([
        dataService.getStaffProfileStats(staffMember.id),
        dataService.getStaffReviews(staffMember.id).catch(() => [])
      ]);
      setStats(profileStats);
      setReviews(profileReviews);
    } catch (error) {
      console.error('Error loading stats:', error);
      showToast('Error cargando métricas del odontólogo', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleAddTool = async () => {
    const quantity = Math.max(1, Number.parseInt(newTool.quantity, 10) || 1);
    let adjustedInventoryItem = null;
    if (newTool.ownership === 'Propia') {
      if (!newTool.name.trim()) {
        showToast('Ingresa el nombre del artículo', 'warning');
        return;
      }
    } else {
      if (!newTool.inventory_id) {
        showToast('Selecciona un artículo del inventario', 'warning');
        return;
      }
    }

    try {
      setLoading(true);
      let toolToAdd = {
        ...newTool,
        quantity,
        id: Date.now().toString(),
        date_added: new Date().toISOString()
      };

      if (newTool.ownership === 'Asignada') {
        const invItem = inventory.find(i => i.id === newTool.inventory_id);
        if (invItem) {
          const availableStock = Number(invItem.stock || 0);
          if (availableStock < quantity) {
            showToast(`Solo hay ${availableStock} unidad(es) disponibles`, 'warning');
            return;
          }
          toolToAdd.name = invItem.name;
          toolToAdd.brand = invItem.brand || invItem.category || '';
          await dataService.updateStock(invItem.id, availableStock - quantity);
          adjustedInventoryItem = invItem;
        }
      }

      const updatedTools = [...tools, toolToAdd];
      await dataService.updateStaffTools(staffMember.id, updatedTools);
      setTools(updatedTools);
      await logPersonalInventoryMovement(
        toolToAdd,
        toolToAdd.ownership === 'Asignada' ? 'ASIGNACION' : 'REGISTRO',
        quantity,
        toolToAdd.ownership === 'Asignada' ? 'exit' : 'entry'
      );
      setNewTool({
        name: '',
        brand: '',
        ownership: 'Propia',
        status: 'Operativa',
        inventory_id: '',
        item_type: 'Herramienta',
        quantity: 1
      });
      setShowAddTool(false);
      showToast('Artículo registrado');
      if (onUpdate) {
        try {
          await onUpdate();
        } catch (refreshError) {
          console.error('Error refreshing staff data:', refreshError);
        }
      }
    } catch (error) {
      console.error('Error saving tool:', error);
      if (adjustedInventoryItem) {
        try {
          await dataService.updateStock(adjustedInventoryItem.id, Number(adjustedInventoryItem.stock || 0));
        } catch (rollbackError) {
          console.error('Error restoring inventory stock:', rollbackError);
        }
      }
      showToast('Error al guardar el artículo', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveTool = async (toolId) => {
    if (!await confirm('¿Seguro que deseas eliminar este artículo del inventario personal?')) return;
    try {
      setLoading(true);
      const toolToRemove = tools.find(t => t.id === toolId);
      
      if (toolToRemove?.inventory_id) {
        if (toolToRemove.quantity == null) {
          await dataService.updateInventoryItem(toolToRemove.inventory_id, { staff_id: null });
        } else {
          const invItem = inventory.find(item => item.id === toolToRemove.inventory_id);
          if (invItem) {
            await dataService.updateStock(
              invItem.id,
              Number(invItem.stock || 0) + Math.max(1, Number(toolToRemove.quantity) || 1)
            );
          }
        }
      }

      const updatedTools = tools.filter(t => t.id !== toolId);
      await dataService.updateStaffTools(staffMember.id, updatedTools);
      setTools(updatedTools);
      if (toolToRemove) {
        await logPersonalInventoryMovement(
          toolToRemove,
          toolToRemove.inventory_id ? 'DEVOLUCION' : 'RETIRO',
          Math.max(1, Number(toolToRemove.quantity) || 1),
          toolToRemove.inventory_id ? 'entry' : 'exit'
        );
      }
      showToast(toolToRemove?.inventory_id
        ? 'Artículo removido y devuelto al almacén general'
        : 'Artículo removido del perfil');
      if (onUpdate) {
        try {
          await onUpdate();
        } catch (refreshError) {
          console.error('Error refreshing staff data:', refreshError);
        }
      }
    } catch (error) {
      showToast('Error al eliminar', 'error');
    } finally {
      setLoading(false);
    }
  };

  const isToolInventoryItem = item => (
    item.inventory_type === 'tools'
    || ['herramienta', 'herramientas', 'accesorios', 'uso interno']
      .includes(String(item.category || '').toLowerCase())
  );
  const availableInventoryTools = asArray(inventory).filter(item => {
    const matchesType = newTool.item_type === 'Herramienta'
      ? isToolInventoryItem(item)
      : !isToolInventoryItem(item);
    return matchesType && Number(item.stock || 0) > 0 && !item.staff_id;
  });

  const handleAdjustPersonalProduct = async (toolId, amount) => {
    const tool = tools.find(item => item.id === toolId);
    if (!tool || (tool.item_type || 'Herramienta') !== 'Producto') return;

    const currentQuantity = Math.max(0, Number(tool.quantity) || 0);
    if (amount < 0 && currentQuantity === 0) {
      showToast('Este producto ya está agotado.', 'warning');
      return;
    }

    let adjustedInventoryItem = null;
    try {
      setAdjustingToolId(toolId);
      if (amount > 0 && tool.inventory_id) {
        const invItem = inventory.find(item => item.id === tool.inventory_id);
        if (!invItem || Number(invItem.stock || 0) < 1) {
          showToast('No quedan unidades disponibles en el almacén.', 'warning');
          return;
        }
        await dataService.updateStock(invItem.id, Number(invItem.stock) - 1);
        adjustedInventoryItem = invItem;
      }

      const nextQuantity = Math.max(0, currentQuantity + amount);
      const updatedTools = tools.map(item => item.id === toolId
        ? { ...item, quantity: nextQuantity, status: nextQuantity === 0 ? 'Agotado' : 'Disponible' }
        : item);
      await dataService.updateStaffTools(staffMember.id, updatedTools);
      setTools(updatedTools);
      await logPersonalInventoryMovement(
        tool,
        amount < 0 ? 'CONSUMO' : 'REPOSICION',
        1,
        amount < 0 || tool.inventory_id ? 'exit' : 'entry',
        amount > 0 ? tool.inventory_id || null : null
      );
      showToast(amount < 0 ? `Registrado: se gastó 1 ${tool.name}` : `Se repuso 1 ${tool.name}`);

      if (onUpdate) {
        try {
          await onUpdate();
        } catch (refreshError) {
          console.error('Error refreshing staff data:', refreshError);
        }
      }
    } catch (error) {
      console.error('Error adjusting personal inventory:', error);
      if (adjustedInventoryItem) {
        try {
          await dataService.updateStock(adjustedInventoryItem.id, Number(adjustedInventoryItem.stock || 0));
        } catch (rollbackError) {
          console.error('Error restoring inventory stock:', rollbackError);
        }
      }
      showToast('No se pudo actualizar la cantidad.', 'error');
    } finally {
      setAdjustingToolId(null);
    }
  };

  // Remove early return to allow AnimatedModal exit animations
  // if (!isOpen || !staffMember) return null;
  if (!staffMember) return null;

  return createPortal(
    <>
    <AnimatedModal isOpen={isOpen}>
      {(overlayClass, cardClass) => (
        <div className={overlayClass} style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.85)',
          backdropFilter: 'blur(10px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '20px',
          paddingTop: 'max(20px, env(safe-area-inset-top, 20px))'
        }}>
          <div className={`${cardClass}`} style={{
            width: '100%',
            maxWidth: '800px',
            maxHeight: isMobileView ? '95vh' : '90vh',
            borderRadius: isMobileView ? '24px' : '32px',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            position: 'relative',
            background: 'var(--bg-secondary)',
            border: '1px solid rgba(255,255,255,0.08)',
            boxShadow: '0 32px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(255, 255, 255,0.08)'
          }}>
        
        {/* Header Section */}
        <div style={{ 
          padding: isMobileView ? '24px 16px 16px' : '32px 32px 24px', 
          background: 'linear-gradient(90deg, rgba(255, 255, 255,0.06) 0%, transparent 60%)', 
          borderBottom: '1px solid rgba(255,255,255,0.06)' 
        }}>
          <button 
            onClick={onClose}
            style={{ 
              position: 'absolute', 
              top: isMobileView ? '16px' : '24px', 
              right: isMobileView ? '16px' : '24px', 
              background: 'rgba(255,255,255,0.06)', 
              border: '1px solid rgba(255,255,255,0.08)', 
              borderRadius: '50%', 
              width: '40px', 
              height: '40px', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              color: 'var(--text-muted)', 
              cursor: 'pointer', 
              zIndex: 10,
              transition: 'all 0.2s'
            }}
            onMouseOver={e => { e.currentTarget.style.background = 'rgba(255,69,58,0.15)'; e.currentTarget.style.color = '#ff453a'; }}
            onMouseOut={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.color = 'var(--text-muted)'; }}
          >
            <X size={20} />
          </button>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: isMobileView ? '16px' : '24px' }}>
            <div style={{ 
              width: isMobileView ? '70px' : '90px', 
              height: isMobileView ? '70px' : '90px', 
              borderRadius: isMobileView ? '16px' : '24px', 
              backgroundColor: 'rgba(255,255,255,0.05)', 
              overflow: 'hidden', 
              border: '2px solid var(--gold-primary)', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              flexShrink: 0 
            }}>
              {staffMember.image_url ? (
                <img src={staffMember.image_url} alt={staffMember.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <User size={40} color="var(--gold-primary)" opacity={0.5} />
              )}
            </div>
            <div>
              <h2 style={{ fontSize: isMobileView ? '22px' : '28px', fontWeight: '900', color: 'white', margin: 0 }}>{staffMember.name}</h2>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--gold-primary)', fontWeight: '700', fontSize: isMobileView ? '12px' : '14px', marginTop: '4px' }}>
                <Star size={14} fill="var(--gold-primary)" />
                {roleLabel(staffMember.role?.split('|')[0]) || 'Odontólogo'}
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: isMobileView ? '8px' : '16px', marginTop: isMobileView ? '20px' : '32px' }}>
            <button 
              onClick={() => setActiveTab('rendimiento')}
              className="panda-tab-btn"
              style={{ 
                padding: isMobileView ? '10px 8px' : '12px 24px', 
                borderRadius: '50px', 
                background: activeTab === 'rendimiento' ? 'var(--gold-primary)' : 'rgba(255,255,255,0.05)', 
                color: activeTab === 'rendimiento' ? 'black' : 'white', 
                fontWeight: '800', 
                border: 'none', 
                cursor: 'pointer', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                gap: '8px', 
                fontSize: isMobileView ? '11px' : '14px' 
              }}
            >
              <TrendingUp size={isMobileView ? 14 : 18} /> {isMobileView ? 'Rendimiento' : 'Rendimiento Histórico'}
            </button>
            <button 
              onClick={() => setActiveTab('inventario')}
              className="panda-tab-btn"
              style={{ 
                padding: isMobileView ? '10px 8px' : '12px 24px', 
                borderRadius: '50px', 
                background: activeTab === 'inventario' ? 'var(--gold-primary)' : 'rgba(255,255,255,0.05)', 
                color: activeTab === 'inventario' ? 'black' : 'white', 
                fontWeight: '800', 
                border: 'none', 
                cursor: 'pointer', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                gap: '8px', 
                fontSize: isMobileView ? '11px' : '14px' 
              }}
            >
              <Wrench size={isMobileView ? 14 : 18} /> {isMobileView ? 'Inventario' : 'Inventario Personal'}
            </button>
          </div>
        </div>

        {/* Content Section */}
        <div style={{ padding: isMobileView ? '20px 16px' : '32px', overflowY: 'auto', flex: 1 }}>
          {loading ? (
            <SkeletonGrid items={4} itemHeight={100} minWidth={180} />
          ) : activeTab === 'rendimiento' ? (
            <div className="animate-fade-in">
              {/* Top Stats Cards */}
              <div style={{ display: 'grid', gridTemplateColumns: isMobileView ? '1fr' : 'repeat(3, minmax(0, 1fr))', gap: isMobileView ? '12px' : '16px', marginBottom: isMobileView ? '20px' : '32px' }}>
                <div 
                  style={{ 
                    background: 'rgba(255,255,255,0.025)', 
                    padding: isMobileView ? '16px' : '24px', 
                    borderRadius: '20px', 
                    border: '1px solid rgba(255,255,255,0.06)', 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: isMobileView ? '12px' : '20px',
                    transition: 'all 0.2s'
                  }}
                  onMouseOver={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; }}
                  onMouseOut={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.025)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)'; }}
                >
                  <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(50,215,75,0.1)', color: '#32d74b', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Scissors size={24} />
                  </div>
                  <div>
                    <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: '900', letterSpacing: '1px', marginBottom: '4px' }}>COMISIONES SERVICIOS</div>
                    <div style={{ fontSize: '20px', fontWeight: '900', color: 'white' }}>${stats.totalServiceComm.toFixed(2)}</div>
                  </div>
                </div>
                <div 
                  style={{ 
                    background: 'rgba(255,255,255,0.025)', 
                    padding: isMobileView ? '16px' : '24px', 
                    borderRadius: '20px', 
                    border: '1px solid rgba(255,255,255,0.06)', 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: isMobileView ? '12px' : '20px',
                    transition: 'all 0.2s'
                  }}
                  onMouseOver={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; }}
                  onMouseOut={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.025)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)'; }}
                >
                  <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(10,132,255,0.1)', color: '#0a84ff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <ShoppingBag size={24} />
                  </div>
                  <div>
                    <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: '900', letterSpacing: '1px', marginBottom: '4px' }}>COMISIONES PRODUCTOS</div>
                    <div style={{ fontSize: '20px', fontWeight: '900', color: 'white' }}>${stats.totalProductComm.toFixed(2)}</div>
                  </div>
                </div>
                <div 
                  style={{ 
                    background: 'rgba(255, 255, 255,0.025)', 
                    padding: isMobileView ? '16px' : '24px', 
                    borderRadius: '20px', 
                    border: '1px solid rgba(255, 255, 255,0.12)', 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: isMobileView ? '12px' : '20px',
                    transition: 'all 0.2s'
                  }}
                  onMouseOver={e => { e.currentTarget.style.background = 'rgba(255, 255, 255,0.04)'; e.currentTarget.style.borderColor = 'rgba(255, 255, 255,0.25)'; }}
                  onMouseOut={e => { e.currentTarget.style.background = 'rgba(255, 255, 255,0.025)'; e.currentTarget.style.borderColor = 'rgba(255, 255, 255,0.12)'; }}
                >
                  <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(255, 255, 255,0.1)', color: 'var(--gold-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <TrendingUp size={24} />
                  </div>
                  <div>
                    <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: '900', letterSpacing: '1px', marginBottom: '4px' }}>TOTAL PROPINAS</div>
                    <div style={{ fontSize: '20px', fontWeight: '900', color: 'var(--gold-primary)' }}>${(stats.totalTips || 0).toFixed(2)}</div>
                  </div>
                </div>
              </div>

              {/* Bottom Row */}
              <div style={{ display: 'grid', gridTemplateColumns: isMobileView ? '1fr' : 'minmax(0, 1fr) minmax(0, 1fr)', gap: isMobileView ? '16px' : '24px' }}>
                {/* Time & Volume */}
                <div 
                  style={{ 
                    background: 'rgba(255, 255, 255,0.025)', 
                    padding: '24px', 
                    borderRadius: '20px', 
                    border: '1px solid rgba(255, 255, 255,0.12)',
                    transition: 'all 0.2s'
                  }}
                  onMouseOver={e => { e.currentTarget.style.background = 'rgba(255, 255, 255,0.04)'; e.currentTarget.style.borderColor = 'rgba(255, 255, 255,0.25)'; }}
                  onMouseOut={e => { e.currentTarget.style.background = 'rgba(255, 255, 255,0.025)'; e.currentTarget.style.borderColor = 'rgba(255, 255, 255,0.12)'; }}
                >
                  <h4 style={{ color: 'var(--gold-primary)', fontSize: '14px', fontWeight: '900', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Clock size={16} /> Volumen y Tiempos
                  </h4>
                  
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                    <span style={{ color: 'var(--text-secondary)', fontWeight: '600' }}>Servicios Totales</span>
                    <span style={{ color: 'white', fontWeight: '900', fontSize: '18px' }}>{stats.totalAppointments}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: 'var(--text-secondary)', fontWeight: '600' }}>Tiempo Promedio</span>
                    <span style={{ color: 'white', fontWeight: '900', fontSize: '18px' }}>{stats.avgDurationMin > 0 ? `${stats.avgDurationMin} min` : 'N/A'}</span>
                  </div>
                </div>

                {/* Top Services */}
                <div 
                  style={{ 
                    background: 'rgba(255,255,255,0.025)', 
                    padding: '24px', 
                    borderRadius: '20px', 
                    border: '1px solid rgba(255,255,255,0.06)',
                    transition: 'all 0.2s'
                  }}
                  onMouseOver={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; }}
                  onMouseOut={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.025)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)'; }}
                >
                  <h4 style={{ color: 'white', fontSize: '14px', fontWeight: '900', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <TrendingUp size={16} color="var(--gold-primary)" /> Servicios Más Realizados
                  </h4>
                  
                  {stats.topServices.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                      {stats.topServices.map((srv, idx) => (
                        <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ color: 'var(--text-secondary)', fontWeight: '600', fontSize: '14px' }}>{srv.name}</span>
                          <span style={{ background: 'rgba(255, 255, 255,0.1)', color: 'var(--gold-primary)', padding: '4px 12px', borderRadius: '50px', fontSize: '12px', fontWeight: '800' }}>{srv.count} veces</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div style={{ color: 'var(--text-muted)', fontSize: '13px', textAlign: 'center', marginTop: '20px' }}>No hay datos suficientes</div>
                  )}
                </div>
              </div>

              {/* Reviews Section */}
              <div 
                style={{ 
                  marginTop: isMobileView ? '16px' : '24px',
                  background: 'rgba(255,255,255,0.025)', 
                  padding: '24px', 
                  borderRadius: '20px', 
                  border: '1px solid rgba(255,255,255,0.06)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '16px'
                }}
              >
                <h4 style={{ color: 'white', fontSize: '14px', fontWeight: '900', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Star size={16} color="var(--gold-primary)" fill="var(--gold-primary)" /> Valoraciones y Reseñas de Clientes
                </h4>
                
                {reviews.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '300px', overflowY: 'auto', paddingRight: '4px' }}>
                    {reviews.map((rev) => {
                      const clientName = rev.clients?.name || 'Cliente';
                      const avgRev = (Number(rev.rapidez || 0) + Number(rev.limpieza || 0) + Number(rev.habilidad || 0)) / 3;
                      const dateFormatted = rev.created_at ? new Date(rev.created_at).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '';
                      return (
                        <div key={rev.id} style={{ padding: '14px', borderRadius: '16px', background: 'rgba(255,255,255,0.015)', border: '1px solid rgba(255,255,255,0.04)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <div>
                              <span style={{ fontWeight: '700', fontSize: '13px', color: 'white' }}>{clientName}</span>
                              <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginLeft: '8px' }}>{dateFormatted}</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'rgba(17, 17, 17, 0.1)', padding: '2px 8px', borderRadius: '6px', fontSize: '12px', fontWeight: '800', color: 'var(--champagne)' }}>
                              <span>{(avgRev || rev.rating || 5).toFixed(1)}</span>
                              <Star size={12} fill="currentColor" />
                            </div>
                          </div>
                          
                          {/* Sub ratings */}
                          <div style={{ display: 'flex', gap: '12px', fontSize: '11px', color: 'var(--text-muted)', fontWeight: '600' }}>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Zap size={10} color="#ffcc00" /> Rapidez: <span style={{ color: 'white' }}>{rev.rapidez || rev.rating || 5}</span></span>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Droplets size={10} color="#007aff" /> Limpieza: <span style={{ color: 'white' }}>{rev.limpieza || rev.rating || 5}</span></span>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Scissors size={10} color="#ff3b30" /> Habilidad: <span style={{ color: 'white' }}>{rev.habilidad || rev.rating || 5}</span></span>
                          </div>

                          {rev.comment && (
                            <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: 'rgba(255,255,255,0.7)', lineHeight: '1.4', fontStyle: 'italic' }}>
                              "{rev.comment}"
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div style={{ color: 'var(--text-muted)', fontSize: '13px', textAlign: 'center', padding: '20px 0' }}>No hay reseñas de clientes todavía</div>
                )}
              </div>
            </div>
          ) : (
            <div className="animate-fade-in">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <div>
                  <h3 style={{ fontSize: '18px', fontWeight: '900', color: 'white' }}>Equipamiento de {staffMember.name.split(' ')[0]}</h3>
                  <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginTop: '4px' }}>Control de herramientas asignadas o propias.</p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                <button
                  onClick={() => setShowInventoryHistory(true)}
                  style={{
                    background: 'rgba(255,255,255,0.06)',
                    color: 'white',
                    border: '1px solid rgba(255,255,255,0.1)',
                    padding: '10px 16px',
                    borderRadius: '50px',
                    fontWeight: '800',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '7px'
                  }}
                >
                  <History size={15} /> Historial
                </button>
                <button 
                  onClick={() => showAddTool ? handleCloseToolForm() : setShowAddTool(true)}
                  style={{ 
                    background: showAddTool ? 'rgba(255,255,255,0.06)' : 'var(--gold-primary)', 
                    color: showAddTool ? 'white' : 'black', 
                    border: showAddTool ? '1px solid rgba(255,255,255,0.08)' : 'none', 
                    padding: '10px 20px', 
                    borderRadius: '50px', 
                    fontWeight: '800', 
                    cursor: 'pointer', 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '8px',
                    transition: 'background 0.2s'
                  }}
                  onMouseOver={e => {
                    if (showAddTool) {
                      e.currentTarget.style.background = 'rgba(255,255,255,0.1)';
                    } else {
                      e.currentTarget.style.background = '#e5be44';
                    }
                  }}
                  onMouseOut={e => {
                    if (showAddTool) {
                      e.currentTarget.style.background = 'rgba(255,255,255,0.06)';
                    } else {
                      e.currentTarget.style.background = 'var(--gold-primary)';
                    }
                  }}
                >
                  {showAddTool ? 'Cancelar' : <><Plus size={16} /> Añadir Artículo</>}
                </button>
                </div>
              </div>

              {(showAddTool || isToolFormExiting) && (
                <div className={isToolFormExiting ? 'animate-slide-down-fade' : ''} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', padding: '20px', borderRadius: '16px', marginBottom: '24px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: isMobileView ? '1fr' : 'minmax(0, 1fr) minmax(0, 1fr)', gap: '16px', marginBottom: '16px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <PandaSelect
                        label="Tipo de artículo"
                        value={newTool.item_type}
                        onChange={(value) => setNewTool({
                          ...newTool,
                          item_type: value,
                          inventory_id: '',
                          status: value === 'Producto' ? 'Disponible' : 'Operativa'
                        })}
                        options={[
                          { value: 'Herramienta', label: 'Herramienta' },
                          { value: 'Producto', label: 'Producto / Consumible' }
                        ]}
                      />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <label style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: '800', letterSpacing: '1px' }}>CANTIDAD</label>
                      <input
                        type="number"
                        min="1"
                        max={newTool.ownership === 'Asignada'
                          ? availableInventoryTools.find(item => item.id === newTool.inventory_id)?.stock
                          : undefined}
                        className="form-input"
                        value={newTool.quantity}
                        onChange={event => setNewTool({ ...newTool, quantity: event.target.value })}
                        style={{ height: '44px', width: '100%' }}
                      />
                    </div>
                    
                    {newTool.ownership === 'Propia' ? (
                      <>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          <label style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: '800', letterSpacing: '1px' }}>NOMBRE</label>
                          <input className="form-input" placeholder={newTool.item_type === 'Producto' ? 'Ej. Laca profesional' : 'Ej. Máquina Clipper'} value={newTool.name} onChange={e => setNewTool({...newTool, name: e.target.value})} style={{ height: '44px', width: '100%' }} />
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          <label style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: '800', letterSpacing: '1px' }}>MARCA / DETALLES</label>
                          <input className="form-input" placeholder="Opcional" value={newTool.brand} onChange={e => setNewTool({...newTool, brand: e.target.value})} style={{ height: '44px', width: '100%' }} />
                        </div>
                      </>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', gridColumn: 'span 2' }}>
                        <PandaSelect 
                          label={`Seleccionar del almacén (${newTool.item_type.toLowerCase()}s)`}
                          value={newTool.inventory_id} 
                          onChange={(val) => setNewTool({...newTool, inventory_id: val})} 
                          options={[
                            { value: '', label: `-- Selecciona ${newTool.item_type === 'Producto' ? 'un producto' : 'una herramienta'} --` },
                            ...availableInventoryTools.map(item => ({ value: item.id, label: `${item.name} · Stock: ${item.stock}` }))
                          ]}
                        />
                      </div>
                    )}

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <PandaSelect 
                        label="Pertenencia"
                        value={newTool.ownership} 
                        onChange={(val) => setNewTool({...newTool, ownership: val, inventory_id: ''})}
                        disabled={!isAdmin}
                        options={[
                          { value: 'Propia', label: 'Propia del empleado' },
                          ...(isAdmin ? [{ value: 'Asignada', label: 'Asignada (Dientes Sanos)' }] : [])
                        ]}
                      />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <PandaSelect 
                        label="Estado"
                        value={newTool.status} 
                        onChange={(val) => setNewTool({...newTool, status: val})} 
                        options={newTool.item_type === 'Producto'
                          ? [
                              { value: 'Disponible', label: 'Disponible' },
                              { value: 'Por agotarse', label: 'Por agotarse' },
                              { value: 'Agotado', label: 'Agotado' }
                            ]
                          : [
                              { value: 'Operativa', label: 'Operativa' },
                              { value: 'En Mantenimiento', label: 'En Mantenimiento' },
                              { value: 'Dañada', label: 'Dañada' }
                            ]}
                      />
                    </div>
                  </div>
                  <button 
                    onClick={handleAddTool} 
                    style={{ 
                      width: '100%', 
                      background: 'white', 
                      color: 'black', 
                      border: 'none', 
                      borderRadius: '50px', 
                      height: '44px', 
                      fontWeight: '800', 
                      cursor: 'pointer', 
                      transition: 'all 0.2s' 
                    }}
                    onMouseOver={e => e.currentTarget.style.background = '#e5e5e5'}
                    onMouseOut={e => e.currentTarget.style.background = 'white'}
                  >
                    Guardar Artículo
                  </button>
                </div>
              )}

              {tools.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px', background: 'rgba(255,255,255,0.01)', borderRadius: '16px', border: '1px dashed rgba(255,255,255,0.1)' }}>
                  <Wrench size={40} color="var(--text-muted)" opacity={0.5} style={{ marginBottom: '16px' }} />
                  <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>No hay artículos registrados para este empleado.</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {tools.map(tool => {
                    const itemType = tool.item_type || 'Herramienta';
                    const resolvedStatus = tool.status || (itemType === 'Producto' ? 'Disponible' : 'Operativa');
                    const isHealthy = ['Operativa', 'Disponible'].includes(resolvedStatus);
                    return (
                    <div 
                      key={tool.id} 
                      style={{ 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        alignItems: 'center', 
                        background: 'rgba(255,255,255,0.025)', 
                        padding: isMobileView ? '12px 16px' : '16px 24px', 
                        borderRadius: '20px', 
                        border: '1px solid rgba(255,255,255,0.06)', 
                        flexWrap: 'wrap', 
                        gap: '12px',
                        transition: 'all 0.2s'
                      }}
                      onMouseOver={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; }}
                      onMouseOut={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.025)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)'; }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: isMobileView ? '12px' : '16px' }}>
                        <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: tool.ownership === 'Asignada' ? 'rgba(255, 255, 255,0.1)' : 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          {itemType === 'Producto'
                            ? <Package size={18} color={tool.ownership === 'Asignada' ? 'var(--gold-primary)' : 'white'} />
                            : <Wrench size={18} color={tool.ownership === 'Asignada' ? 'var(--gold-primary)' : 'white'} />}
                        </div>
                        <div>
                          <div style={{ fontWeight: '800', color: 'white', fontSize: '15px' }}>
                            {tool.name} <span style={{ color: 'var(--gold-primary)', fontSize: '12px' }}>× {tool.quantity || 1}</span>
                          </div>
                          <div style={{ color: 'var(--text-muted)', fontSize: '12px', fontWeight: '600' }}>
                            {itemType}{tool.brand ? ` · ${tool.brand}` : ''}
                          </div>
                        </div>
                      </div>
                      
                      <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
                        {itemType === 'Producto' && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <button
                              onClick={() => handleAdjustPersonalProduct(tool.id, -1)}
                              disabled={adjustingToolId === tool.id || Number(tool.quantity || 0) <= 0}
                              title="Registrar que se gastó una unidad"
                              style={{
                                height: '34px',
                                padding: '0 11px',
                                borderRadius: '10px',
                                border: '1px solid rgba(255,159,10,0.25)',
                                background: 'rgba(255,159,10,0.1)',
                                color: '#ffb340',
                                fontSize: '11px',
                                fontWeight: '900',
                                cursor: Number(tool.quantity || 0) > 0 ? 'pointer' : 'not-allowed',
                                opacity: Number(tool.quantity || 0) > 0 ? 1 : 0.45,
                                display: 'flex',
                                alignItems: 'center',
                                gap: '5px'
                              }}
                            >
                              <Minus size={12} /> Gasté 1
                            </button>
                            <button
                              onClick={() => handleAdjustPersonalProduct(tool.id, 1)}
                              disabled={adjustingToolId === tool.id}
                              title="Reponer una unidad"
                              style={{
                                width: '34px',
                                height: '34px',
                                borderRadius: '10px',
                                border: '1px solid rgba(48,209,88,0.22)',
                                background: 'rgba(48,209,88,0.1)',
                                color: '#30d158',
                                cursor: 'pointer',
                                display: 'grid',
                                placeItems: 'center'
                              }}
                            >
                              <Plus size={13} />
                            </button>
                          </div>
                        )}
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '6px' }}>
                          <span style={{ 
                            fontSize: '11px', 
                            fontWeight: '800', 
                            padding: '2px 10px', 
                            borderRadius: '50px', 
                            background: tool.ownership === 'Asignada' ? 'var(--gold-primary)' : 'rgba(255,255,255,0.08)', 
                            color: tool.ownership === 'Asignada' ? 'black' : 'white',
                            border: tool.ownership === 'Asignada' ? 'none' : '1px solid rgba(255,255,255,0.08)'
                          }}>
                            {tool.ownership}
                          </span>
                          <span style={{ 
                            fontSize: '11px', 
                            fontWeight: '800', 
                            padding: '2px 10px', 
                            borderRadius: '50px', 
                            background: isHealthy ? 'rgba(50,215,75,0.12)' : ['En Mantenimiento', 'Por agotarse'].includes(resolvedStatus) ? 'rgba(255,159,10,0.12)' : 'rgba(255,69,58,0.12)',
                            color: isHealthy ? '#32d74b' : ['En Mantenimiento', 'Por agotarse'].includes(resolvedStatus) ? '#ff9f0a' : '#ff453a',
                            border: `1px solid ${isHealthy ? 'rgba(50,215,75,0.15)' : ['En Mantenimiento', 'Por agotarse'].includes(resolvedStatus) ? 'rgba(255,159,10,0.15)' : 'rgba(255,69,58,0.15)'}`
                          }}>
                            {resolvedStatus}
                          </span>
                        </div>
                        <button 
                          onClick={() => handleRemoveTool(tool.id)} 
                          style={{ 
                            background: 'rgba(255,69,58,0.08)', 
                            border: '1px solid rgba(255,69,58,0.15)', 
                            padding: '8px 10px', 
                            borderRadius: '10px', 
                            cursor: 'pointer', 
                            color: '#ff453a',
                            transition: 'all 0.2s', 
                            display: 'flex', 
                            alignItems: 'center' 
                          }}
                          onMouseOver={e => e.currentTarget.style.background = 'rgba(255,69,58,0.18)'}
                          onMouseOut={e => e.currentTarget.style.background = 'rgba(255,69,58,0.08)'}
                          title="Eliminar"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
          </div>

        </div>
      </div>
      )}
    </AnimatedModal>
      <PersonalInventoryHistoryModal
        isOpen={showInventoryHistory}
        onClose={() => setShowInventoryHistory(false)}
        staffId={staffMember.id}
      />
    </>,
    document.body
  );
};

export default StaffProfileModal;
